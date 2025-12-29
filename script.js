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

  // VR
  toggleVr: document.getElementById("toggle-vr"),
  uiRoot: document.getElementById("ui-root"),
  vrRoot: document.getElementById("vr-root"),
  exitVr: document.getElementById("exit-vr"),
  vrScreens: document.getElementById("vr-screens"),
  vrDebug: document.getElementById("vr-debug"),

  // VR sliders
  vrX: document.getElementById("vr-x"),
  vrY: document.getElementById("vr-y"),
  vrZ: document.getElementById("vr-z"),
  vrPitch: document.getElementById("vr-pitch"),
  vrXv: document.getElementById("vr-xv"),
  vrYv: document.getElementById("vr-yv"),
  vrZv: document.getElementById("vr-zv"),
  vrPv: document.getElementById("vr-pv"),

  // media hub
  mediaHub: document.getElementById("media-hub"),

  // Quality controls
  videoRes: document.getElementById("video-res"),
  videoFps: document.getElementById("video-fps"),
  videoHq: document.getElementById("video-hq"),

  // Debug panel elements
  debugPanel: document.getElementById("vr-debug-panel"),
  debugHeadsetPos: document.getElementById("debug-headset-pos"),
  debugHeadsetRot: document.getElementById("debug-headset-rot"),
  debugLeftButtons: document.getElementById("debug-left-buttons"),
  debugLeftAxes: document.getElementById("debug-left-axes"),
  debugRightButtons: document.getElementById("debug-right-buttons"),
  debugRightAxes: document.getElementById("debug-right-axes"),
  debugStreamTitle: document.getElementById("debug-stream-title"),
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
  
  // VRデバッグモードもJoin後は変更不可
  if (el.vrDebug) el.vrDebug.disabled = joined;

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
// VR: HUD offset sliders
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
  el.vrScreens.setAttribute("position", `${x} ${y} ${-z}`);
  el.vrScreens.setAttribute("rotation", `${pitch} 0 0`);
}

["input", "change"].forEach((evt) => {
  el.vrX.addEventListener(evt, applyVrHudOffset);
  el.vrY.addEventListener(evt, applyVrHudOffset);
  el.vrZ.addEventListener(evt, applyVrHudOffset);
  el.vrPitch.addEventListener(evt, applyVrHudOffset);
});
applyVrHudOffset();

// ------------------------------
// VR DEBUG: State and update
// ------------------------------
const debugState = {
  enabled: false,
  animationId: null,
  streamInfo: new Map(), // publicationId -> info
  // Controller button states for edge detection
  prevLeftTrigger: false,
  prevRightTrigger: false,
  prevLeftGrip: false,
  prevRightGrip: false,
};

function updateDebugPanel() {
  if (!vrState.enabled) return;
  
  try {
    const scene = document.querySelector('#vr-scene');
    if (!scene || !scene.renderer) {
      debugState.animationId = requestAnimationFrame(updateDebugPanel);
      return;
    }

    const renderer = scene.renderer;
    const xrSession = renderer.xr?.getSession?.();
    
    if (!xrSession) {
      debugState.animationId = requestAnimationFrame(updateDebugPanel);
      return;
    }

    // Get controller input (always monitored for navigation)
    const inputSources = xrSession.inputSources;
    let leftController = null;
    let rightController = null;

    for (const source of inputSources) {
      if (source.handedness === 'left') leftController = source;
      if (source.handedness === 'right') rightController = source;
    }

    // Controller-based navigation (always active)
    if (leftController && leftController.gamepad) {
      const gp = leftController.gamepad;
      const leftTrigger = gp.buttons[0]?.pressed || false;
      if (leftTrigger && !debugState.prevLeftTrigger) {
        switchToPrevStream();
      }
      debugState.prevLeftTrigger = leftTrigger;
    } else {
      debugState.prevLeftTrigger = false;
    }

    if (rightController && rightController.gamepad) {
      const gp = rightController.gamepad;
      const rightTrigger = gp.buttons[0]?.pressed || false;
      if (rightTrigger && !debugState.prevRightTrigger) {
        switchToNextStream();
      }
      debugState.prevRightTrigger = rightTrigger;
    } else {
      debugState.prevRightTrigger = false;
    }

    // Debug info display (only if debug mode enabled)
    if (debugState.enabled) {
      // Get camera position and rotation
      const camera = document.querySelector('#vr-camera');
      if (camera) {
        const pos = camera.object3D.position;
        const rot = camera.object3D.rotation;
        
        if (el.debugHeadsetPos) {
          el.debugHeadsetPos.setAttribute('value', 
            `Pos: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`
          );
        }
        
        if (el.debugHeadsetRot) {
          const rotDeg = {
            x: (rot.x * 180 / Math.PI).toFixed(1),
            y: (rot.y * 180 / Math.PI).toFixed(1),
            z: (rot.z * 180 / Math.PI).toFixed(1)
          };
          el.debugHeadsetRot.setAttribute('value', 
            `Rot: ${rotDeg.x}, ${rotDeg.y}, ${rotDeg.z}`
          );
        }
      }

      // Update left controller debug info
      if (leftController && leftController.gamepad) {
        const gp = leftController.gamepad;
        
        const buttonStates = gp.buttons.map((btn, i) => {
          if (btn.pressed) return `${i}:P`;
          if (btn.touched) return `${i}:T`;
          if (btn.value > 0.1) return `${i}:${btn.value.toFixed(2)}`;
          return null;
        }).filter(Boolean).join(' ');
        
        if (el.debugLeftButtons) {
          el.debugLeftButtons.setAttribute('value', 
            `Btns: ${buttonStates || 'None'}`
          );
        }
        
        const axesStr = gp.axes.map((v, i) => `[${i}]:${v.toFixed(2)}`).join(' ');
        if (el.debugLeftAxes) {
          el.debugLeftAxes.setAttribute('value', 
            `Axes: ${axesStr || 'None'}`
          );
        }
      } else {
        if (el.debugLeftButtons) el.debugLeftButtons.setAttribute('value', 'Btns: N/A');
        if (el.debugLeftAxes) el.debugLeftAxes.setAttribute('value', 'Axes: N/A');
      }

      // Update right controller debug info
      if (rightController && rightController.gamepad) {
        const gp = rightController.gamepad;
        
        const buttonStates = gp.buttons.map((btn, i) => {
          if (btn.pressed) return `${i}:P`;
          if (btn.touched) return `${i}:T`;
          if (btn.value > 0.1) return `${i}:${btn.value.toFixed(2)}`;
          return null;
        }).filter(Boolean).join(' ');
        
        if (el.debugRightButtons) {
          el.debugRightButtons.setAttribute('value', 
            `Btns: ${buttonStates || 'None'}`
          );
        }
        
        const axesStr = gp.axes.map((v, i) => `[${i}]:${v.toFixed(2)}`).join(' ');
        if (el.debugRightAxes) {
          el.debugRightAxes.setAttribute('value', 
            `Axes: ${axesStr || 'None'}`
          );
        }
      } else {
        if (el.debugRightButtons) el.debugRightButtons.setAttribute('value', 'Btns: N/A');
        if (el.debugRightAxes) el.debugRightAxes.setAttribute('value', 'Axes: N/A');
      }

      // Update stream info
      updateDebugStreamInfo();
    }

  } catch (e) {
    console.warn('Debug panel update error:', e);
  }
  
  debugState.animationId = requestAnimationFrame(updateDebugPanel);
}

function updateDebugStreamInfo() {
  if (!el.debugStreamTitle) return;
  
  let streamText = '[STREAMS]';
  let yOffset = -0.70;
  
  // Remove old stream debug text elements
  const oldTexts = document.querySelectorAll('[id^="debug-stream-"]');
  oldTexts.forEach(t => {
    if (t.id !== 'debug-stream-title') t.remove();
  });
  
  debugState.streamInfo.forEach((info, pubId) => {
    const streamTextEl = document.createElement('a-text');
    streamTextEl.id = `debug-stream-${pubId}`;
    streamTextEl.setAttribute('value', info.text);
    streamTextEl.setAttribute('align', 'left');
    streamTextEl.setAttribute('width', '0.6');
    streamTextEl.setAttribute('color', '#9ca3af');
    streamTextEl.setAttribute('position', `-0.35 ${yOffset} 0`);
    streamTextEl.setAttribute('font', 'https://cdn.aframe.io/fonts/Roboto-msdf.json');
    
    el.debugPanel.appendChild(streamTextEl);
    yOffset -= 0.08;
  });
  
  if (debugState.streamInfo.size === 0) {
    const noStreamEl = document.createElement('a-text');
    noStreamEl.id = 'debug-stream-none';
    noStreamEl.setAttribute('value', 'No active streams');
    noStreamEl.setAttribute('align', 'left');
    noStreamEl.setAttribute('width', '0.6');
    noStreamEl.setAttribute('color', '#6b7280');
    noStreamEl.setAttribute('position', `-0.35 ${yOffset} 0`);
    noStreamEl.setAttribute('font', 'https://cdn.aframe.io/fonts/Roboto-msdf.json');
    el.debugPanel.appendChild(noStreamEl);
  }
}

function startDebugUpdate() {
  if (vrState.enabled && !debugState.animationId) {
    debugState.animationId = requestAnimationFrame(updateDebugPanel);
  }
}

function stopDebugUpdate() {
  if (debugState.animationId) {
    cancelAnimationFrame(debugState.animationId);
    debugState.animationId = null;
  }
}

function setDebugEnabled(enabled) {
  debugState.enabled = enabled;
  
  if (el.debugPanel) {
    el.debugPanel.setAttribute('visible', enabled ? 'true' : 'false');
  }
}

// ------------------------------
// VR: screen management (Single stream display with switching)
// ------------------------------
const vrState = {
  enabled: false,
  // Array of { publicationId, videoElId, groupId, publisherId, kind }
  streams: [],
  currentStreamIndex: 0,
};

function setVrEnabled(on) {
  vrState.enabled = on;
  if (on) {
    el.vrRoot.classList.remove("vr-hidden");
    el.uiRoot.classList.add("ui-hidden");
    
    // Enable debug panel if checkbox is checked
    if (el.vrDebug?.checked) {
      setDebugEnabled(true);
    }
    
    // Always start controller monitoring for navigation
    startDebugUpdate();
  } else {
    el.vrRoot.classList.add("vr-hidden");
    el.uiRoot.classList.remove("ui-hidden");
    
    // Disable debug when exiting VR
    setDebugEnabled(false);
    
    // Stop controller monitoring
    stopDebugUpdate();
  }
}

el.toggleVr.onclick = () => setVrEnabled(!vrState.enabled);
el.exitVr.onclick = () => setVrEnabled(false);

// VR Stream Navigation
function updateVrStreamDisplay() {
  if (!el.vrScreens) return;
  
  // Hide all streams
  vrState.streams.forEach(stream => {
    const group = document.getElementById(stream.groupId);
    if (group) {
      group.setAttribute('visible', 'false');
    }
  });
  
  // Show current stream
  if (vrState.streams.length > 0) {
    const currentStream = vrState.streams[vrState.currentStreamIndex];
    if (currentStream) {
      const group = document.getElementById(currentStream.groupId);
      if (group) {
        group.setAttribute('visible', 'true');
        // Center position
        group.setAttribute('position', '0 0.2 0');
      }
    }
  }
  
  updateVrStreamInfo();
}

function updateVrStreamInfo() {
  const streamControls = document.getElementById('vr-stream-controls');
  const counterEl = document.getElementById('vr-stream-counter');
  const nameEl = document.getElementById('vr-stream-name');
  
  if (!streamControls) return;
  
  if (vrState.streams.length === 0) {
    streamControls.setAttribute('visible', 'false');
    return;
  }
  
  streamControls.setAttribute('visible', 'true');
  
  if (counterEl) {
    const current = vrState.currentStreamIndex + 1;
    const total = vrState.streams.length;
    counterEl.setAttribute('value', `${current} / ${total}`);
  }
  
  if (nameEl && vrState.streams[vrState.currentStreamIndex]) {
    const stream = vrState.streams[vrState.currentStreamIndex];
    const shortId = stream.publicationId.substring(0, 8);
    const displayName = `${stream.publisherId} (${shortId})`;
    nameEl.setAttribute('value', displayName);
  }
}

function switchToPrevStream() {
  if (vrState.streams.length === 0) return;
  vrState.currentStreamIndex = (vrState.currentStreamIndex - 1 + vrState.streams.length) % vrState.streams.length;
  updateVrStreamDisplay();
  console.log('Switched to stream:', vrState.currentStreamIndex);
}

function switchToNextStream() {
  if (vrState.streams.length === 0) return;
  vrState.currentStreamIndex = (vrState.currentStreamIndex + 1) % vrState.streams.length;
  updateVrStreamDisplay();
  console.log('Switched to stream:', vrState.currentStreamIndex);
}

// Setup click events for VR navigation buttons
function setupVrNavButtons() {
  const prevBtn = document.querySelector('#vr-prev-btn .clickable');
  const nextBtn = document.querySelector('#vr-next-btn .clickable');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', switchToPrevStream);
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', switchToNextStream);
  }
  
  console.log('VR navigation buttons setup complete');
}

// ★重要:2Dで作ったvideoを「移動」しない。VR用videoを別で作って srcObject を共有。
// ★重要：2Dで作ったvideoを「移動」しない。VR用videoを別で作って映像トラックだけ渡す。
function addOrUpdateVideoToVR(publicationId, mediaEl2D) {
  if (!mediaEl2D) return;
  if (vrState.videoMap.has(publicationId)) return;

  if (!el.vrScreens) {
    console.warn("[VR] #vr-screens not found");
    return;
  }
  if (!el.mediaHub) {
    console.warn("[VR] #media-hub not found");
    return;
  }

  const src = mediaEl2D.srcObject;
  if (!src || typeof src.getVideoTracks !== "function") {
    console.warn("[VR] mediaEl2D.srcObject is missing / not a MediaStream");
    return;
  }

  // ---- 映像トラックだけを抜く（ここが効く）----
  const videoTracks = src.getVideoTracks();
  if (!videoTracks.length) {
    console.warn("[VR] No video tracks in srcObject");
    return;
  }
  const videoOnlyStream = new MediaStream(videoTracks);

  const assetId = `vr-video-${publicationId}`;

  const vrVideo = document.createElement("video");
  vrVideo.id = assetId;
  vrVideo.setAttribute("playsinline", "");
  vrVideo.setAttribute("webkit-playsinline", "");
  vrVideo.setAttribute("muted", "");   // 属性としても付ける
  vrVideo.muted = true;               // プロパティもtrue
  vrVideo.autoplay = true;
  vrVideo.loop = true;

  // display:none だとA-Frame側で更新止まることがあるので「画面外」に置く前提
  el.mediaHub.appendChild(vrVideo);

  // MediaStreamをセット（映像だけ）
  vrVideo.srcObject = videoOnlyStream;

  // ---- 再生を明示的に開始する（Questで特に重要）----
  const tryPlay = () => {
    const p = vrVideo.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };
  if (vrVideo.readyState >= 1) {
    tryPlay();
  } else {
    vrVideo.addEventListener("loadedmetadata", tryPlay, { once: true });
  }

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
}


function removeVideoFromVR(publicationId) {
  const streamIndex = vrState.streams.findIndex(s => s.publicationId === publicationId);
  if (streamIndex === -1) return;

  const stream = vrState.streams[streamIndex];
  
  const vrVideoEl = document.getElementById(stream.videoElId);
  vrVideoEl?.remove();

  const groupEl = document.getElementById(stream.groupId);
  groupEl?.remove();

  vrState.streams.splice(streamIndex, 1);
  
  // Adjust current index if needed
  if (vrState.streams.length === 0) {
    vrState.currentStreamIndex = 0;
  } else if (vrState.currentStreamIndex >= vrState.streams.length) {
    vrState.currentStreamIndex = vrState.streams.length - 1;
  } else if (streamIndex <= vrState.currentStreamIndex && vrState.currentStreamIndex > 0) {
    vrState.currentStreamIndex--;
  }
  
  updateVrStreamDisplay();
  
  // Remove from debug info
  debugState.streamInfo.delete(publicationId);
  if (debugState.enabled) {
    updateDebugStreamInfo();
  }
  
  console.log('Removed stream from VR:', publicationId, 'Remaining:', vrState.streams.length);
}

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

function makeRemoteCard(title) {
  const card = document.createElement("div");
  card.className = "remote-card";

  const titleEl = document.createElement("div");
  titleEl.className = "remote-title";
  titleEl.textContent = title;
  card.appendChild(titleEl);

  const mediaWrap = document.createElement("div");
  mediaWrap.className = "remote-media";
  card.appendChild(mediaWrap);

  return { card, mediaWrap };
}

function clearRemoteUi() {
  el.remoteArea.replaceChildren();
  el.buttonArea.replaceChildren();
  subscribed.clear();
}

function ensureSubscribeButton(publication, myId) {
  if (publication.publisher.id === myId) return;
  if (document.getElementById(`subscribe-button-${publication.id}`)) return;

  const btn = document.createElement("button");
  btn.id = `subscribe-button-${publication.id}`;
  btn.className = "btn small";
  btn.textContent = `${publication.publisher.id} / ${publication.contentType}`;

  btn.onclick = () => subscribePublication(publication);
  el.buttonArea.appendChild(btn);
}

async function subscribePublication(publication) {
  if (!me) return;
  if (subscribed.has(publication.id)) return;

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

    // 再生開始（保険）
    if (stream.track.kind === "video") {
      mediaEl.play().catch(() => {});
      try {
        addOrUpdateVideoToVR(publication.id, mediaEl, publication.publisher.id);
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
  // UIが無い場合の保険
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
        [...vrState.streams.map(s => s.publicationId)].forEach(removeVideoFromVR);
        if (el.mediaHub) el.mediaHub.replaceChildren();

        el.localVideo.pause();
        el.localVideo.removeAttribute("src");
        el.localVideo.load();
        el.muteAv.textContent = "映像/音声 OFF";
        
        // Clear debug info
        debugState.streamInfo.clear();
        if (debugState.enabled) {
          updateDebugStreamInfo();
        }
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
setVrEnabled(false);

// Setup VR navigation after A-Frame is loaded
window.addEventListener('load', () => {
  const scene = document.querySelector('#vr-scene');
  if (scene) {
    scene.addEventListener('loaded', () => {
      setupVrNavButtons();
    });
  }
});
