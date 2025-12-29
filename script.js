/* global skyway_room */

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

  // Quality controls
  videoRes: document.getElementById("video-res"),
  videoFps: document.getElementById("video-fps"),
  videoHq: document.getElementById("video-hq"),
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

  if (el.videoRes) el.videoRes.disabled = !publishEnabled || el.join.disabled || !el.pubVideo.checked;
  if (el.videoFps) el.videoFps.disabled = !publishEnabled || el.join.disabled || !el.pubVideo.checked;
  if (el.videoHq) el.videoHq.disabled = !publishEnabled || el.join.disabled || !el.pubVideo.checked;

  el.pubHint.textContent = publishEnabled
    ? "※ Join前に映像/音声のPublish有無を選べます（映像ONなら画質も選べます）"
    : "※ モードが Subscribeのみ のため無効です";

  el.localNote.textContent = publishEnabled
    ? "Publishが有効なときだけ表示"
    : "Subscribeのみなので Local は使いません";

  el.localOverlay.textContent = publishEnabled ? "Local Preview" : "Local (disabled)";
  el.localVideo.style.opacity = publishEnabled ? "1" : "0.25";
}

el.modeRadios.forEach((r) => r.addEventListener("change", updatePublishControls));
el.pubVideo?.addEventListener("change", updatePublishControls);
updatePublishControls();

// ------------------------------
// State
// ------------------------------
let context = null;
let room = null;
let me = null;

let localAudio = null;
let localVideoStream = null;
let isMuted = false;

const subscribed = new Set();

// ------------------------------
// Remote UI
// ------------------------------
function clearRemoteUi() {
  el.buttonArea.replaceChildren();
  el.remoteArea.replaceChildren();
  subscribed.clear();
}

function ensureSubscribeButton(publication, myId) {
  if (publication.publisher.id === myId) return;

  const id = publication.id;
  if (document.getElementById(`subscribe-button-${id}`)) return;

  const btn = document.createElement("button");
  btn.id = `subscribe-button-${id}`;
  btn.className = "btn small";
  btn.textContent = `⬇️ ${publication.publisher.id} / ${publication.contentType}`;
  btn.onclick = () => subscribePublication(publication);

  el.buttonArea.appendChild(btn);
}

async function subscribePublication(publication) {
  if (subscribed.has(publication.id)) return;
  if (!me) return;

  try {
    subscribed.add(publication.id);

    const { stream } = await me.subscribe(publication.id);

    const card = document.createElement("div");
    card.className = "remote-card";

    const title = document.createElement("div");
    title.className = "remote-title";
    title.textContent = `${publication.publisher.id} / ${publication.contentType}`;
    card.appendChild(title);

    const mediaWrap = document.createElement("div");
    mediaWrap.className = "remote-media";

    let mediaEl;
    if (stream.track.kind === "video") {
      mediaEl = document.createElement("video");
      mediaEl.muted = false;
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
    card.appendChild(mediaWrap);

    // 再生開始（保険）
    if (stream.track.kind === "video") {
      mediaEl.play().catch(() => {});
    }

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
// Publish quality (resolution / fps)
// ------------------------------
function resToSize(key) {
  switch (key) {
    case "qvga":
      return { w: 320, h: 240 };
    case "vga":
      return { w: 640, h: 480 };
    case "hd":
      return { w: 1280, h: 720 };
    case "fhd":
      return { w: 1920, h: 1080 };
    default:
      return { w: 1280, h: 720 };
  }
}

function buildVideoConstraints() {
  const resKey = el.videoRes?.value ?? "hd";
  const fps = parseInt(el.videoFps?.value ?? "30", 10) || 30;
  const preferHigh = Boolean(el.videoHq?.checked);

  const { w, h } = resToSize(resKey);

  // preferHigh: 厳しめ（ideal強め）
  // not preferHigh: ゆるめ（minも緩く）
  if (preferHigh) {
    return {
      width: { ideal: w },
      height: { ideal: h },
      frameRate: { ideal: fps },
    };
  }

  return {
    width: { ideal: w, min: 160 },
    height: { ideal: h, min: 120 },
    frameRate: { ideal: fps, min: 10 },
  };
}

async function applyVideoQualityToLocalStream() {
  const track = localVideoStream?.track;
  if (!track || typeof track.applyConstraints !== "function") return;

  const constraints = buildVideoConstraints();

  // まずは希望のconstraintsで試す
  try {
    await track.applyConstraints(constraints);
  } catch (e) {
    console.warn("applyConstraints failed (preferred). fallback to loose constraints:", e);

    // フォールバック（かなり緩い）
    try {
      await track.applyConstraints({
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 },
      });
    } catch (e2) {
      console.warn("applyConstraints fallback failed. continue with default:", e2);
    }
  }

  // 実際に適用された設定をログ
  try {
    const s = track.getSettings?.();
    if (s) console.log("[video settings]", s);
  } catch (_) {}
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
    });

    me = await room.join();
    el.myId.textContent = me.id;
    setConnState("connected");

    // publish
    if (publishEnabled) {
      localAudio = null;
      localVideoStream = null;

      if (el.pubAudio.checked && el.pubVideo.checked) {
        const av = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
        localAudio = av.audio;
        localVideoStream = av.video;
      } else if (el.pubAudio.checked) {
        localAudio = await SkyWayStreamFactory.createMicrophoneAudioStream();
      } else if (el.pubVideo.checked) {
        localVideoStream = await SkyWayStreamFactory.createCameraVideoStream();
      }

      // ★映像ONならここで画質を適用（publish前）
      if (el.pubVideo.checked && localVideoStream) {
        await applyVideoQualityToLocalStream();
        attachLocalPreview(localVideoStream);
      }

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

// init
setConnState("disconnected");
setUiJoined(false);
el.clearRemote.onclick = () => el.remoteArea.replaceChildren();