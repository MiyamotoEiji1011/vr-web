const ROOM_NAME = "room"; // 固定
const APP_ID = "441577ac-312a-4ffb-aad5-e540d3876971";
const SECRET = "Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=";
/* global skyway_room, THREE */

const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom } = skyway_room;


const remoteVideoEl = document.getElementById("remoteVideo");
const screenEl = document.getElementById("screen");
const hudTextEl = document.getElementById("hudText");
const cameraEl = document.getElementById("camera");

// 表示したい仕様値（固定）
const FRAME_W = 1080;
const FRAME_H = 720;
const FPS = 30;

// ------------------------------
// SkyWay Token
// ------------------------------
function createJti() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function createToken() {
  return new SkyWayAuthToken({
    jti: createJti(),
    iat: nowInSec(),
    exp: nowInSec() + 60 * 60,
    version: 3,
    scope: {
      appId: APP_ID,
      rooms: [
        {
          name: ROOM_NAME,
          methods: ["create", "close", "updateMetadata"],
          member: { name: "*", methods: ["subscribe"] },
        },
      ],
    },
  }).encode(SECRET);
}

// ------------------------------
// Video texture attach
// ------------------------------
function attachVideoTextureToPlane(videoEl, planeEl) {
  const mesh = planeEl.getObject3D("mesh");
  if (!mesh) {
    planeEl.addEventListener(
      "object3dset",
      () => attachVideoTextureToPlane(videoEl, planeEl),
      { once: true }
    );
    return;
  }

  const texture = new THREE.VideoTexture(videoEl);
  texture.needsUpdate = true;

  mesh.material.map = texture;
  mesh.material.color.set(0xffffff);
  mesh.material.needsUpdate = true;
}

// ------------------------------
// HUD update (camera rotation)
// ------------------------------
function format3(n) {
  return (Math.round(n * 1000) / 1000).toFixed(3);
}

let lastHudUpdate = 0;
function startHudLoop() {
  const q = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, "YXZ"); // VRカメラっぽい順序

  const tick = (t) => {
    // HUD更新は軽くしたいので 10fps くらいで十分
    if (t - lastHudUpdate > 100) {
      lastHudUpdate = t;

      // カメラのワールド回転を取得 → Euler（角度）へ
      cameraEl.object3D.getWorldQuaternion(q);
      euler.setFromQuaternion(q);

      // ラジアン→度
      const x = THREE.MathUtils.radToDeg(euler.x);
      const y = THREE.MathUtils.radToDeg(euler.y);
      const z = THREE.MathUtils.radToDeg(euler.z);

      hudTextEl.setAttribute(
        "value",
        `Frame\n- ${FRAME_W}*${FRAME_H}\n- ${FPS}fps\n\ncamera (deg)\n- x: ${format3(x)}\n- y: ${format3(y)}\n- z: ${format3(z)}`
      );
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

// ------------------------------
// Main
// ------------------------------
async function start() {
  // 先にHUD開始（映像来る前でも表示）
  startHudLoop();

  // 自動再生対策
  remoteVideoEl.muted = true;
  remoteVideoEl.play().catch(() => {});

  const token = createToken();
  const context = await SkyWayContext.Create(token);

  const room = await SkyWayRoom.FindOrCreate(context, { name: ROOM_NAME });
  const me = await room.join();

  const subscribeIfVideo = async (pub) => {
    if (pub.contentType !== "video") return;
    if (remoteVideoEl.srcObject) return; // 1本だけ

    const { stream } = await me.subscribe(pub.id);
    stream.attach(remoteVideoEl);

    const onReady = () => {
      attachVideoTextureToPlane(remoteVideoEl, screenEl);
      remoteVideoEl.play().catch(() => {});
      remoteVideoEl.removeEventListener("loadeddata", onReady);
    };
    remoteVideoEl.addEventListener("loadeddata", onReady);
  };

  room.publications.forEach((p) => subscribeIfVideo(p).catch(console.error));
  room.onStreamPublished.add((e) => {
    subscribeIfVideo(e.publication).catch(console.error);
  });
}

start().catch(console.error);
