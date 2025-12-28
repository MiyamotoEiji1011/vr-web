/* global skyway_room */

const {
  nowInSec,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
} = skyway_room;

// uuidV4 が無い環境でも動くようにブラウザ標準でUUID生成
function createJti() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // フォールバック（最低限）
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const token = new SkyWayAuthToken({
  jti: createJti(),
  iat: nowInSec(),
  exp: nowInSec() + 60 * 60 * 24,
  version: 3,
  scope: {
    appId: "441577ac-312a-4ffb-aad5-e540d3876971",
    rooms: [
      {
        name: "*",
        methods: ["create", "close", "updateMetadata"],
        member: {
          name: "*",
          methods: ["publish", "subscribe", "updateMetadata"],
        },
      },
    ],
  },
}).encode("Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=");

// ------------------------------
// DOM
// ------------------------------
const el = {
  connPill: document.getElementById("conn-pill"),
  myId: document.getElementById("my-id"),

  roomName: document.getElementById("room-name"),
  join: document.getElementById("join"),
  leave: document.getElementById("leave"),

  modeRadios: [...document.querySelectorAll('input[name="mode"]')],
  pubVideo: document.getElementById("pub-video"),
  pubAudio: document.getElementById("pub-audio"),
  pubHint: document.getElementById("pub-hint"),

  localVideo: document.getElementById("local-video"),
  localOverlay: document.getElementById("local-overlay"),
  localNote: document.getElementById("local-note"),
  muteAv: document.getElementById("mute-av"),

  autoSubscribe: document.getElementById("auto-subscribe"),
  clearRemote: document.getElementById("clear-remote"),

  buttonArea: document.getElementById("button-area"),
  remoteArea: document.getElementById("remote-media-area"),
};

function currentMode() {
  return el.modeRadios.find((r) => r.checked)?.value ?? "both";
}

function setConnState(state) {
  // state: "disconnected" | "connecting" | "connected"
  el.connPill.classList.remove("pill--off", "pill--mid", "pill--on");
  if (state === "disconnected") {
    el.connPill.textContent = "未接続";
    el.connPill.classList.add("pill--off");
  } else if (state === "connecting") {
    el.connPill.textContent = "接続中";
    el.connPill.classList.add("pill--mid");
  } else {
    el.connPill.textContent = "接続中";
    el.connPill.classList.add("pill--on");
  }
}

function setUiJoined(joined) {
  el.join.disabled = joined;
  el.leave.disabled = !joined;

  el.roomName.disabled = joined;
  el.modeRadios.forEach((r) => (r.disabled = joined));

  // publish設定はモードにより制御
  updatePublishControls();

  el.muteAv.disabled = !joined;
}

function updatePublishControls() {
  const mode = currentMode();
  const publishEnabled = mode === "both" || mode === "publish";

  el.pubVideo.disabled = !publishEnabled || el.join.disabled; // join後は固定
  el.pubAudio.disabled = !publishEnabled || el.join.disabled;

  el.pubHint.textContent = publishEnabled
    ? "※ Join前に映像/音声のPublish有無を選べます"
    : "※ モードが Subscribeのみ のため無効です";

  // local previewの説明
  el.localNote.textContent = publishEnabled
    ? "Publishが有効なときだけ表示"
    : "Subscribeのみなので Local は使いません";

  // local videoの見た目
  el.localOverlay.textContent = publishEnabled ? "Local Preview" : "Local (disabled)";
  el.localVideo.style.opacity = publishEnabled ? "1" : "0.25";
}

el.modeRadios.forEach((r) => r.addEventListener("change", updatePublishControls));
updatePublishControls();

// ------------------------------
// SkyWay session state
// ------------------------------
let context = null;
let room = null;
let me = null;

let localAudio = null;
let localVideoStream = null;

let publishedAudio = null;
let publishedVideo = null;

let isMuted = false;

// すでにsubscribe済みのpublication id
const subscribed = new Set();

// ------------------------------
// Helpers
// ------------------------------
function clearRemoteUi() {
  el.buttonArea.replaceChildren();
  el.remoteArea.replaceChildren();
  subscribed.clear();
}

function makeRemoteCard(titleText) {
  const card = document.createElement("div");
  card.className = "remote-card";

  const title = document.createElement("div");
  title.className = "remote-title";
  title.textContent = titleText;

  const mediaWrap = document.createElement("div");
  mediaWrap.className = "remote-media";

  card.appendChild(title);
  card.appendChild(mediaWrap);

  return { card, mediaWrap };
}

function ensureSubscribeButton(publication, meId) {
  // 自分のpublicationは無視
  if (publication.publisher?.id === meId) return;

  const id = `subscribe-button-${publication.id}`;
  if (document.getElementById(id)) return;

  const btn = document.createElement("button");
  btn.className = "btn small";
  btn.id = id;

  const label = `${publication.publisher.id} / ${publication.contentType}`;
  btn.textContent = subscribed.has(publication.id) ? `✅ ${label}` : `Subscribe: ${label}`;

  btn.onclick = async () => {
    await subscribePublication(publication);
    btn.textContent = `✅ ${label}`;
  };

  el.buttonArea.appendChild(btn);
}

async function subscribePublication(publication) {
  if (!me) return;
  if (subscribed.has(publication.id)) return;
  if (publication.publisher?.id === me.id) return;

  try {
    const { stream } = await me.subscribe(publication.id);
    subscribed.add(publication.id);

    const titleText = `${publication.publisher.id} / ${stream.track.kind}`;
    const { card, mediaWrap } = makeRemoteCard(titleText);

    let mediaEl;
    if (stream.track.kind === "video") {
      mediaEl = document.createElement("video");
      mediaEl.playsInline = true;
      mediaEl.autoplay = true;
      mediaEl.controls = true;
    } else if (stream.track.kind === "audio") {
      mediaEl = document.createElement("audio");
      mediaEl.autoplay = true;
      mediaEl.controls = true;
    } else {
      return;
    }

    mediaEl.id = `media-${publication.id}`;
    stream.attach(mediaEl);
    mediaWrap.appendChild(mediaEl);

    el.remoteArea.appendChild(card);

    // ボタン側も更新
    const btn = document.getElementById(`subscribe-button-${publication.id}`);
    if (btn) btn.textContent = `✅ ${publication.publisher.id} / ${publication.contentType}`;
  } catch (e) {
    console.error("subscribe failed:", e);
    alert("Subscribeに失敗しました。コンソールを確認してください。");
  }
}

function attachLocalPreview(videoStream) {
  // local preview用（video publishしない場合は何もしない）
  if (!videoStream) return;
  videoStream.attach(el.localVideo);
  el.localVideo.play().catch(() => {});
}

// ------------------------------
// Join / Leave
// ------------------------------
el.join.onclick = async () => {
  const roomName = el.roomName.value.trim();
  if (!roomName) return;

  const mode = currentMode();
  const publishEnabled = mode === "both" || mode === "publish";
  const subscribeEnabled = mode === "both" || mode === "subscribe";

  // publishがONなのに、映像/音声が両方OFFは意味が薄いので弾く
  if (publishEnabled && !el.pubVideo.checked && !el.pubAudio.checked) {
    alert("Publishのみ/両方 を選んだ場合、映像か音声どちらかはONにしてください。");
    return;
  }

  try {
    setConnState("connecting");
    setUiJoined(true);

    context = await SkyWayContext.Create(token);

    room = await SkyWayRoom.FindOrCreate(context, {
      name: roomName,
      // type を明示したいならここで type: "p2p"
    });

    me = await room.join();
    el.myId.textContent = me.id;
    setConnState("connected");

    // --- publish 側 ---
    if (publishEnabled) {
      // 必要なものだけ取得
      if (el.pubAudio.checked && el.pubVideo.checked) {
        const av = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
        localAudio = av.audio;
        localVideoStream = av.video;
      } else if (el.pubAudio.checked) {
        localAudio = await SkyWayStreamFactory.createMicrophoneAudioStream();
      } else if (el.pubVideo.checked) {
        localVideoStream = await SkyWayStreamFactory.createCameraVideoStream();
      }

      // local preview は映像を使う場合だけ
      if (el.pubVideo.checked) {
        attachLocalPreview(localVideoStream);
      }

      // publish
      if (el.pubAudio.checked && localAudio) {
        publishedAudio = await me.publish(localAudio, { type: "p2p" });
      }
      if (el.pubVideo.checked && localVideoStream) {
        publishedVideo = await me.publish(localVideoStream, { type: "p2p" });
      }
    } else {
      // publishしないモードでは local preview を明確に無効化
      el.localVideo.pause();
      el.localVideo.removeAttribute("src");
      el.localVideo.load();
    }

    // --- subscribe 側 ---
    const handlePublication = (publication) => {
      if (!subscribeEnabled) return;

      ensureSubscribeButton(publication, me.id);

      // 自動subscribeがONなら即subscribe
      if (el.autoSubscribe.checked) {
        subscribePublication(publication);
      }
    };

    // 既存publications
    room.publications.forEach(handlePublication);

    // 新規publish検知
    room.onStreamPublished.add((e) => handlePublication(e.publication));

    // unpublish検知
    room.onStreamUnpublished.add((e) => {
      const pubId = e.publication.id;
      document.getElementById(`subscribe-button-${pubId}`)?.remove();
      document.getElementById(`media-${pubId}`)?.closest(".remote-card")?.remove();
      subscribed.delete(pubId);
    });

    // Leave
    el.leave.onclick = async () => {
      try {
        await me?.leave();
        await room?.dispose();
      } finally {
        context = null;
        room = null;
        me = null;

        localAudio = null;
        localVideoStream = null;
        publishedAudio = null;
        publishedVideo = null;
        isMuted = false;

        el.myId.textContent = "-";
        setConnState("disconnected");
        setUiJoined(false);
        clearRemoteUi();

        // local UI reset
        el.localVideo.pause();
        el.localVideo.removeAttribute("src");
        el.localVideo.load();
        el.muteAv.textContent = "映像/音声 OFF";
      }
    };

    // Mute toggle（publishしているものだけ）
    el.muteAv.onclick = async () => {
      if (!me) return;

      isMuted = !isMuted;

      // track を止める（簡易）
      if (localAudio?.track) localAudio.track.enabled = !isMuted;
      if (localVideoStream?.track) localVideoStream.track.enabled = !isMuted;

      el.muteAv.textContent = isMuted ? "映像/音声 ON" : "映像/音声 OFF";
    };

    // remote clear
    el.clearRemote.onclick = () => {
      el.remoteArea.replaceChildren();
    };
  } catch (e) {
    console.error(e);
    alert("Joinに失敗しました。コンソールを確認してください。");

    // 失敗時のUI復旧
    setConnState("disconnected");
    setUiJoined(false);
    context = null;
    room = null;
    me = null;
  }
};

// 初期状態
setConnState("disconnected");
setUiJoined(false);
el.clearRemote.onclick = () => {
  el.remoteArea.replaceChildren();
};
