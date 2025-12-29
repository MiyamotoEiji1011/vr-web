/* global skyway_room, THREE */

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
  vrScreens: document.getElementById("vr-screens"),

  // VR sliders
  vrX: document.getElementById("vr-x"),
  vrY: document.getElementById("vr-y"),
  vrZ: document.getElementById("vr-z"),
  vrPitch: document.getElementById("vr-pitch"),
  vrXv: document.getElementById("vr-xv"),
  vrYv: document.getElementById("vr-yv"),
  vrZv: document.getElementById("vr-zv"),
  vrPv: document.getElementById("vr-pv"),

  // VR Debug (HTML側に追加してある前提)
  vrDebugToggle: document.getElementById("vr-debug-toggle"),
  vrDebugAnchor: document.getElementById("vr-debug-anchor"),
  vrDebugText: document.getElementById("vr-debug-text"),

  // media hub
  mediaHub: document.getElementById("media-hub"),

  // Quality controls（HTML側に追加してある前提）
  videoRes: document.getElementById("video-res"),
  videoFps: document.getElementById("video-fps"),
  videoHq: document.getElementById("video-hq"),
};

// --- media-hub が無ければ自動生成（落ちないようにする） ---
if (!el.mediaHub) {
  const hub = document.createElement("div");
  hub.id = "media-hub";
  hub.className = "media-hub";
  document.body.appendChild(hub);
  el.mediaHub = hub;
}

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

  // 映像ONのときだけ画質UIを使える
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
// VR: HUD offset sliders (screens + debug anchor)
// ------------------------------
function applyVrHudOffset() {
  const x = parseFloat(el.vrX.value);
  const y = parseFloat(el.vrY.value);
  const z = parseFloat(el.vrZ.value);
  const pitch = parseFloat(el.vrPitch.value);

  el.vrXv.textContent = x.toFixed(2).replace(/\.00$/, "");
  el.vrYv.textContent = y.toFixed(2).replace(/\.00$/, "");
  el.vrZv.textContent = z.toFixed(1);
  el.vrPv.textContent = pitch.toFixed(0);

  // 前方は -Z
  if (el.vrScreens) {
    el.vrScreens.setAttribute("position", `${x} ${y} ${-z}`);
    el.vrScreens.setAttribute("rotation", `${pitch} 0 0`);
  }

  // Debugは映像HUDと同じ距離/ピッチで、Yだけ上へ（被らない）
  if (el.vrDebugAnchor) {
    const debugY = y + 0.75; // 好みで調整
    el.vrDebugAnchor.setAttribute("position", `${x} ${debugY} ${-z}`);
    el.vrDebugAnchor.setAttribute("rotation", `${pitch} 0 0`);
  }
}

["input", "change"].forEach((evt) => {
  el.vrX?.addEventListener(evt, applyVrHudOffset);
  el.vrY?.addEventListener(evt, applyVrHudOffset);
  el.vrZ?.addEventListener(evt, applyVrHudOffset);
  el.vrPitch?.addEventListener(evt, applyVrHudOffset);
});
applyVrHudOffset();

// ------------------------------
// VR Debug: ON/OFF & loop
// ------------------------------
let vrDebugEnabled = false;

function setVrDebugEnabled(on) {
  vrDebugEnabled = on;
  if (el.vrDebugAnchor) el.vrDebugAnchor.setAttribute("visible", on);
  if (el.vrDebugText) {
    el.vrDebugText.setAttribute(
      "text",
      `value: ${on ? "Debug ON" : "Debug OFF"}; color: #E5E7EB; width: 2.2; wrapCount: 40; baseline: top; align: left;`
    );
  }
}

el.vrDebugToggle?.addEventListener("change", (e) => {
  setVrDebugEnabled(Boolean(e.target.checked));
});
setVrDebugEnabled(false);

// 数学ユーティリティ
function radToDeg(r) {
  return (r * 180) / Math.PI;
}

// Quaternion -> Euler(Yaw/Pitch/Roll)
function quatToYPR(q) {
  // A-Frameは内部でTHREEを持つ
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return {
    yaw: radToDeg(e.y),
    pitch: radToDeg(e.x),
    roll: radToDeg(e.z),
  };
}

function formatAxes(axes) {
  if (!axes || !axes.length) return "-";
  return axes.map((v, i) => `a${i}:${Number(v).toFixed(2)}`).join(" ");
}

function formatButtons(buttons) {
  if (!buttons || !buttons.length) return "-";
  // 主要だけ抜粋（環境で意味は変わるので “押されたか/値” を見る用途）
  const pick = [0, 1, 2, 3, 4, 5, 6, 7];
  return pick
    .filter((i) => buttons[i])
    .map((i) => `b${i}:${buttons[i].pressed ? "1" : "0"}(${Number(buttons[i].value).toFixed(2)})`)
    .join(" ");
}

function getGamepadByHand(hand /* "left"|"right" */) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    if (gp.hand === hand) return gp; // Quest Browser等
    const id = (gp.id || "").toLowerCase();
    if (hand === "left" && id.includes("left")) return gp;
    if (hand === "right" && id.includes("right")) return gp;
  }
  return null;
}

function updateVrDebugText() {
  if (!vrDebugEnabled) return;
  if (!el.vrDebugText) return;

  // HMD姿勢：A-Frame camera の object3D
  const camObj = document.getElementById("vr-camera")?.object3D;
  const pos = camObj?.position;
  const quat = camObj?.quaternion;

  const ypr = quat ? quatToYPR(quat) : { yaw: 0, pitch: 0, roll: 0 };

  // Controller: Gamepad
  const left = getGamepadByHand("left");
  const right = getGamepadByHand("right");

  const rightStick = right?.axes
    ? `stickR: x=${Number(right.axes[2] ?? 0).toFixed(2)} y=${Number(right.axes[3] ?? 0).toFixed(2)}`
    : "stickR:-";

  const lines = [
    `[HMD]`,
    `pos: x=${pos ? pos.x.toFixed(2) : "-"} y=${pos ? pos.y.toFixed(2) : "-"} z=${pos ? pos.z.toFixed(2) : "-"}`,
    `ypr: yaw=${ypr.yaw.toFixed(1)} pitch=${ypr.pitch.toFixed(1)} roll=${ypr.roll.toFixed(1)}`,
    ``,
    `[LEFT] ${left ? left.id : "no gamepad"}`,
    `axes: ${formatAxes(left?.axes)}`,
    `btn : ${formatButtons(left?.buttons)}`,
    ``,
    `[RIGHT] ${right ? right.id : "no gamepad"}`,
    `axes: ${formatAxes(right?.axes)}`,
    rightStick,
    `btn : ${formatButtons(right?.buttons)}`,
  ];

  el.vrDebugText.setAttribute(
    "text",
    `value: ${lines.join("\\n")}; color: #E5E7EB; width: 2.2; wrapCount: 40; baseline: top; align: left;`
  );
}

// ------------------------------
// VR: screen management
// ------------------------------
const vrState = {
  enabled: false,
  // publication.id -> { videoElId, groupId }
  videoMap: new Map(),
};

function setVrEnabled(on) {
  vrState.enabled = on;
  if (on) {
    el.vrRoot?.classList.remove("vr-hidden");
    el.uiRoot?.classList.add("ui-hidden");
  } else {
    el.vrRoot?.classList.add("vr-hidden");
    el.uiRoot?.classList.remove("ui-hidden");
  }
}

el.toggleVr?.addEventListener("click", () => setVrEnabled(!vrState.enabled));
el.exitVr?.addEventListener("click", () => setVrEnabled(false));

function layoutVrScreens() {
  const items = [...vrState.videoMap.values()];
  const perRow = 2;
  const spacingX = 1.8;
  const spacingY = 1.1;

  items.forEach((item, idx) => {
    const row = Math.floor(idx / perRow);
    const col = idx % perRow;

    const x = (col - 0.5) * spacingX;
    const y = 0.2 - row * spacingY;
    const z = 0;

    const group = document.getElementById(item.groupId);
    if (!group) return;
    group.setAttribute("position", `${x} ${y} ${z}`);
  });
}

// ★重要：2Dで作ったvideoを「移動」しない。VR用videoを別で作って srcObject を共有。
function addOrUpdateVideoToVR(publicationId, mediaEl2D) {
  if (!mediaEl2D) return;
  if (!el.mediaHub) return;
  if (!el.vrScreens) return;
  if (vrState.videoMap.has(publicationId)) return;

  const assetId = `vr-video-${publicationId}`;

  const vrVideo = document.createElement("video");
  vrVideo.id = assetId;
  vrVideo.setAttribute("playsinline", "");
  vrVideo.setAttribute("webkit-playsinline", "");
  vrVideo.autoplay = true;

  // autoplayブロック回避：VRテクスチャ用は muted で確実に回す（映像だけ）
  vrVideo.muted = true;

  // 2D videoが持っている MediaStream を共有
  vrVideo.srcObject = mediaEl2D.srcObject;

  // display:none ではなく「画面外」に置いて生かす
  el.mediaHub.appendChild(vrVideo);

  // VRのスクリーンを作成（HUD: vr-screensの子）
  const groupId = `vr-group-${publicationId}`;

  const group = document.createElement("a-entity");
  group.setAttribute("id", groupId);

  const frame = document.createElement("a-plane");
  frame.setAttribute("width", "1.66");
  frame.setAttribute("height", "0.96");
  frame.setAttribute("position", "0 0 -0.01");
  frame.setAttribute("color", "#0f172a");
  frame.setAttribute("material", "opacity: 0.85");

  const screen = document.createElement("a-video");
  screen.setAttribute("src", `#${assetId}`);
  screen.setAttribute("width", "1.6");
  screen.setAttribute("height", "0.9");

  group.appendChild(frame);
  group.appendChild(screen);

  el.vrScreens.appendChild(group);

  vrState.videoMap.set(publicationId, { videoElId: assetId, groupId });
  layoutVrScreens();

  // 再生開始（ユーザー操作直後なら通りやすい）
  vrVideo.play().catch(() => {});
}

function removeVideoFromVR(publicationId) {
  const info = vrState.videoMap.get(publicationId);
  if (!info) return;

  document.getElementById(info.groupId)?.remove();
  document.getElementById(info.videoElId)?.remove();

  vrState.videoMap.delete(publicationId);
  layoutVrScreens();
}

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
  el.buttonArea?.replaceChildren();
  el.remoteArea?.replaceChildren();
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

  el.buttonArea?.appendChild(btn);
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
    el.remoteArea?.appendChild(card);

    // 再生開始（保険）
    if (stream.track.kind === "video") {
      mediaEl.play().catch(() => {});
      try {
        addOrUpdateVideoToVR(publication.id, mediaEl);
      } catch (e) {
        console.warn("VR attach failed (non-fatal):", e);
      }
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

  try {
    await track.applyConstraints(constraints);
  } catch (e) {
    console.warn("applyConstraints failed (preferred). fallback to loose constraints:", e);
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
      } else {
        // 映像OFFならプレビュー停止
        el.localVideo.pause();
        el.localVideo.removeAttribute("src");
        el.localVideo.load();
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

        // VRリセット
        [...vrState.videoMap.keys()].forEach(removeVideoFromVR);
        if (el.mediaHub) el.mediaHub.replaceChildren();

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

// ------------------------------
// VR Debug loop (requestAnimationFrame)
// ------------------------------
function vrDebugLoop() {
  // VR画面を開いているときだけ更新（軽量だけど一応）
  if (vrState.enabled) updateVrDebugText();
  requestAnimationFrame(vrDebugLoop);
}
requestAnimationFrame(vrDebugLoop);

// init
setConnState("disconnected");
setUiJoined(false);
el.clearRemote.onclick = () => el.remoteArea.replaceChildren();
setVrEnabled(false);
applyVrHudOffset();
