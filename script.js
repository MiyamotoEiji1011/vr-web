/* global skyway_room, AFRAME */

const {
  nowInSec,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
} = skyway_room;

// ------------------------------
// UUID (jti) helper
// ------------------------------
function createJti() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ------------------------------
// Token (※本番はサーバで生成推奨)
// ------------------------------
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

  // VR
  toggleVr: document.getElementById("toggle-vr"),
  uiRoot: document.getElementById("ui-root"),
  vrRoot: document.getElementById("vr-root"),
  exitVr: document.getElementById("exit-vr"),
  vrHud: document.getElementById("vr-hud"),
  vrAssets: document.getElementById("vr-assets"),
  vrScreens: document.getElementById("vr-screens"),
  vrScene: document.getElementById("vr-scene"),

    // VR sliders
  vrX: document.getElementById("vr-x"),
  vrY: document.getElementById("vr-y"),
  vrZ: document.getElementById("vr-z"),
  vrPitch: document.getElementById("vr-pitch"),
  vrXv: document.getElementById("vr-xv"),
  vrYv: document.getElementById("vr-yv"),
  vrZv: document.getElementById("vr-zv"),
  vrPv: document.getElementById("vr-pv"),
};

function currentMode() {
  return el.modeRadios.find((r) => r.checked)?.value ?? "both";
}

function setConnState(state) {
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

  updatePublishControls();
  el.muteAv.disabled = !joined;
}

function updatePublishControls() {
  const mode = currentMode();
  const publishEnabled = mode === "both" || mode === "publish";

  el.pubVideo.disabled = !publishEnabled || el.join.disabled;
  el.pubAudio.disabled = !publishEnabled || el.join.disabled;

  el.pubHint.textContent = publishEnabled
    ? "※ Join前に映像/音声のPublish有無を選べます"
    : "※ モードが Subscribeのみ のため無効です";

  el.localNote.textContent = publishEnabled
    ? "Publishが有効なときだけ表示"
    : "Subscribeのみなので Local は使いません";

  el.localOverlay.textContent = publishEnabled ? "Local Preview" : "Local (disabled)";
  el.localVideo.style.opacity = publishEnabled ? "1" : "0.25";
}

el.modeRadios.forEach((r) => r.addEventListener("change", updatePublishControls));
updatePublishControls();

// ------------------------------
// VR: video screen management
// ------------------------------
const vrState = {
  enabled: false,
  // publication.id -> { videoElId, entityId }
  videoMap: new Map(),
};

// VRの画面配置（横に並べる。増えたら2段）
function layoutVrScreens() {
  const items = [...vrState.videoMap.values()];
  const perRow = 2;
  const spacingX = 1.8;
  const spacingY = 1.1;

  items.forEach((item, idx) => {
    const row = Math.floor(idx / perRow);
    const col = idx % perRow;

    const x = (col - 0.5) * spacingX; // -0.9, +0.9
    const y = 0.7 - row * spacingY;   // 少し下に積む
    const z = 0;

    const ent = document.getElementById(item.entityId);
    if (!ent) return;
    ent.setAttribute("position", `${x} ${y} ${z}`);
  });
}

// SkyWayのリモートvideo要素をVR空間に貼る
function addOrUpdateVideoToVR(publicationId, videoEl) {
  if (!videoEl) return;

  // A-Frameの a-video は <a-assets> 内の video#id を参照するのが安定
  const assetId = `vr-video-${publicationId}`;
  let assetVideo = document.getElementById(assetId);

  if (!assetVideo) {
    assetVideo = document.createElement("video");
    assetVideo.id = assetId;
    assetVideo.setAttribute("playsinline", "");
    assetVideo.setAttribute("webkit-playsinline", "");
    assetVideo.crossOrigin = "anonymous"; // CDNsなど経由でも安全側に
    assetVideo.autoplay = true;
    assetVideo.muted = false; // リモート音声を使いたい場合
    assetVideo.loop = true;

    // SkyWayの stream.attach(videoEl) した video から “同じ再生ソース” はコピーできないので、
    // ここでは「VRは同じ videoEl をそのまま使う」戦略にする：
    // ただし a-video は selector で video 要素を参照できるので、assetVideoに“中身を移す”のではなく、
    // videoEl 自体を assets に移動させる方が確実。
    //
    // → なので videoEl を assets に移動し、id を付けて a-video に貼る。
  }

  // すでにVR管理しているなら何もしない
  if (vrState.videoMap.has(publicationId)) return;

  // 2D表示用に作った videoEl を assets に移動（VRのテクスチャ元にする）
  // NOTE: 2D側でも同じ video を見たい場合は clone ではなく “同じ要素” を使う必要があるため、
  // ここでは 2Dカード側から video を外して VRへ移す（2Dはサムネだけ/またはVR中心運用）。
  // 2DとVR両方に出したい場合は「2Dは canvas に描画」など別案が必要。
  videoEl.id = assetId;
  videoEl.setAttribute("playsinline", "");
  videoEl.setAttribute("webkit-playsinline", "");

  // assetsへ移動
  el.vrAssets.appendChild(videoEl);

  // a-video entity 作成
  const entityId = `vr-screen-${publicationId}`;
  const screen = document.createElement("a-video");
  screen.setAttribute("id", entityId);
  screen.setAttribute("src", `#${assetId}`);
  screen.setAttribute("width", "1.6");
  screen.setAttribute("height", "0.9");
  screen.setAttribute("rotation", "0 0 0");

  // 縁取り（見やすく）
  const frame = document.createElement("a-plane");
  frame.setAttribute("width", "1.66");
  frame.setAttribute("height", "0.96");
  frame.setAttribute("position", "0 0 -0.01");
  frame.setAttribute("color", "#0f172a");
  frame.setAttribute("material", "opacity: 0.85");

  const group = document.createElement("a-entity");
  group.appendChild(frame);
  group.appendChild(screen);

  el.vrScreens.appendChild(group);

  vrState.videoMap.set(publicationId, { videoElId: assetId, entityId });
  layoutVrScreens();
}

function removeVideoFromVR(publicationId) {
  const info = vrState.videoMap.get(publicationId);
  if (!info) return;

  // entity削除
  const ent = document.getElementById(info.entityId);
  ent?.parentElement?.remove(); // groupごと消す

  // assets内のvideo削除
  const v = document.getElementById(info.videoElId);
  v?.remove();

  vrState.videoMap.delete(publicationId);
  layoutVrScreens();
}

// VR UI toggle
function setVrEnabled(on) {
  vrState.enabled = on;
  if (on) {
    el.vrRoot.classList.remove("vr-hidden");
    el.uiRoot.classList.add("ui-hidden");
  } else {
    el.vrRoot.classList.add("vr-hidden");
    el.uiRoot.classList.remove("ui-hidden");
  }
}

el.toggleVr.onclick = () => setVrEnabled(true);
el.exitVr.onclick = () => {
  // A-FrameのVRセッションがアクティブな場合は終了させる
  if (el.vrScene.is("vr-mode")) {
    el.vrScene.exitVR();
  }
  setVrEnabled(false);
};

function applyVrHudOffset() {
  // vr-root が見えていない場合は何もしない
  if (el.vrRoot.classList.contains("vr-hidden")) {
    return;
  }

  // a-entity#vr-screens は a-camera の子。position/rotation を変えると「目の前HUD」が変わる。
  const x = parseFloat(el.vrX.value);
  const y = parseFloat(el.vrY.value);
  const z = parseFloat(el.vrZ.value);
  const pitch = parseFloat(el.vrPitch.value);

  el.vrXv.textContent = x.toFixed(2).replace(/\.00$/, "");
  el.vrYv.textContent = y.toFixed(2).replace(/\.00$/, "");
  el.vrZv.textContent = z.toFixed(1);
  el.vrPv.textContent = pitch.toFixed(0);

  // zは「前方」なので A-Frame ではマイナス方向
  el.vrScreens.setAttribute("position", `${x} ${y} ${-z}`);
  el.vrScreens.setAttribute("rotation", `${pitch} 0 0`);
}

// A-FrameのVRモード出入りを監視してUI状態を更新
el.vrScene.addEventListener("enter-vr", () => {
  console.log("Entered VR mode");
  // VR HUDはVR内では不要なので非表示にする（CSSでも対応）
  el.vrHud.style.display = "none";
});
el.vrScene.addEventListener("exit-vr", () => {
  console.log("Exited VR mode");
  setVrEnabled(false);
});


// ------------------------------
// SkyWay session state
// ------------------------------
let context = null;
let room = null;
let me = null;

let localAudio = null;
let localVideoStream = null;

let isMuted = false;
const subscribed = new Set();

// ------------------------------
// Helpers (2D UI)
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
      mediaEl.setAttribute("playsinline", "");
      mediaEl.setAttribute("webkit-playsinline", "");
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

    // VRへ追加：videoだけ貼る（音声だけはVR空間に貼っても意味が薄いので2Dのみ）
    if (stream.track.kind === "video") {
      addOrUpdateVideoToVR(publication.id, mediaEl);
    }

    // ボタン側も更新
    const btn = document.getElementById(`subscribe-button-${publication.id}`);
    if (btn) btn.textContent = `✅ ${publication.publisher.id} / ${publication.contentType}`;
  } catch (e) {
    console.error("subscribe failed:", e);
    alert("Subscribeに失敗しました。コンソールを確認してください。");
  }
}

function attachLocalPreview(videoStream) {
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
      // type: "p2p" を明示してもOK
    });

    me = await room.join();
    el.myId.textContent = me.id;
    setConnState("connected");

    // publish
    if (publishEnabled) {
      if (el.pubAudio.checked && el.pubVideo.checked) {
        const av = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
        localAudio = av.audio;
        localVideoStream = av.video;
      } else if (el.pubAudio.checked) {
        localAudio = await SkyWayStreamFactory.createMicrophoneAudioStream();
      } else if (el.pubVideo.checked) {
        localVideoStream = await SkyWayStreamFactory.createCameraVideoStream();
      }

      if (el.pubVideo.checked) attachLocalPreview(localVideoStream);

      if (el.pubAudio.checked && localAudio) {
        await me.publish(localAudio, { type: "p2p" });
      }
      if (el.pubVideo.checked && localVideoStream) {
        await me.publish(localVideoStream, { type: "p2p" });
      }
    } else {
      el.localVideo.pause();
      el.localVideo.removeAttribute("src");
      el.localVideo.load();
    }

    // subscribe
    const handlePublication = (publication) => {
      if (!subscribeEnabled) return;
      ensureSubscribeButton(publication, me.id);
      if (el.autoSubscribe.checked) subscribePublication(publication);
    };

    room.publications.forEach(handlePublication);
    room.onStreamPublished.add((e) => handlePublication(e.publication));

    room.onStreamUnpublished.add((e) => {
      const pubId = e.publication.id;
      document.getElementById(`subscribe-button-${pubId}`)?.remove();
      document.getElementById(`media-${pubId}`)?.closest(".remote-card")?.remove();
      subscribed.delete(pubId);

      // VRからも除去
      removeVideoFromVR(pubId);
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
        isMuted = false;

        el.myId.textContent = "-";
        setConnState("disconnected");
        setUiJoined(false);
        clearRemoteUi();

        // VRもリセット
        [...vrState.videoMap.keys()].forEach(removeVideoFromVR);

        el.localVideo.pause();
        el.localVideo.removeAttribute("src");
        el.localVideo.load();
        el.muteAv.textContent = "映像/音声 OFF";
      }
    };

    // Mute toggle（publishしているものだけ）
    el.muteAv.onclick = () => {
      if (!me) return;
      isMuted = !isMuted;

      if (localAudio?.track) localAudio.track.enabled = !isMuted;
      if (localVideoStream?.track) localVideoStream.track.enabled = !isMuted;

      el.muteAv.textContent = isMuted ? "映像/音声 ON" : "映像/音声 OFF";
    };

    el.clearRemote.onclick = () => {
      el.remoteArea.replaceChildren();
    };
  } catch (e) {
    console.error(e);
    alert("Joinに失敗しました。コンソールを確認してください。");

    setConnState("disconnected");
    setUiJoined(false);
    context = null;
    room = null;
    me = null;
  }
};

["input", "change"].forEach((evt) => {
  el.vrX.addEventListener(evt, applyVrHudOffset);
  el.vrY.addEventListener(evt, applyVrHudOffset);
  el.vrZ.addEventListener(evt, applyVrHudOffset);
  el.vrPitch.addEventListener(evt, applyVrHudOffset);
});
applyVrHudOffset();


// init
setConnState("disconnected");
setUiJoined(false);
el.clearRemote.onclick = () => el.remoteArea.replaceChildren();
setVrEnabled(false);
