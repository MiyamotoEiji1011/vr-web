const ROOM_NAME = "room"; // 固定
const APP_ID = "441577ac-312a-4ffb-aad5-e540d3876971";
const SECRET = "Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=";
/* global skyway_room, THREE, AFRAME */

const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom } = skyway_room;

const remoteVideoEl = document.getElementById("remoteVideo");
const screenEl = document.getElementById("screen");
const hudTextEl = document.getElementById("hudText");
const controllerInfoEl = document.getElementById("controllerInfo");

// 表示したい仕様値（固定）
const FRAME_W = 1080;
const FRAME_H = 720;
const FPS = 30;

// ------------------------------
// グローバルなコントローラー状態管理
// ------------------------------
window.controllerStates = {
  left: {
    trigger: 0,
    grip: 0,
    buttonA: 0, // X button for left Oculus
    buttonB: 0, // Y button for left Oculus
    menu: 0,    // Vive menu button
    thumbstick: { x: 0, y: 0 },
    trackpad: { x: 0, y: 0 }, // Vive trackpad
    detected: false,
    type: null // 'oculus' or 'vive'
  },
  right: {
    trigger: 0,
    grip: 0,
    buttonA: 0, // A button for right Oculus
    buttonB: 0, // B button for right Oculus
    menu: 0,    // Vive menu button
    thumbstick: { x: 0, y: 0 },
    trackpad: { x: 0, y: 0 }, // Vive trackpad
    detected: false,
    type: null // 'oculus' or 'vive'
  }
};

// ------------------------------
// A-Frame カスタムコンポーネント: rotation-reader
// ------------------------------
AFRAME.registerComponent('rotation-reader', {
  init: function() {
    this.euler = new THREE.Euler(0, 0, 0, "YXZ");
    this.lastUpdate = 0;
  },
  
  tick: function(time) {
    // 100msごとに更新
    if (time - this.lastUpdate < 100) return;
    this.lastUpdate = time;

    // VR/非VR両方で動作：object3Dから回転を取得
    const rotation = this.el.object3D.rotation;
    
    // Eulerからラジアンを度に変換
    const x = THREE.MathUtils.radToDeg(rotation.x);
    const y = THREE.MathUtils.radToDeg(rotation.y);
    const z = THREE.MathUtils.radToDeg(rotation.z);

    // HUD更新
    hudTextEl.setAttribute(
      "value",
      `Frame\n- ${FRAME_W}*${FRAME_H}\n- ${FPS}fps\n\nHMD rotation (deg)\n- x: ${this.format3(x)}\n- y: ${this.format3(y)}\n- z: ${this.format3(z)}`
    );
  },

  format3: function(n) {
    return (Math.round(n * 1000) / 1000).toFixed(3);
  }
});

// ------------------------------
// A-Frame カスタムコンポーネント: controller-listener
// ------------------------------
AFRAME.registerComponent('controller-listener', {
  schema: {
    hand: { type: 'string', default: 'left' },
    type: { type: 'string', default: 'oculus' } // 'oculus' or 'vive'
  },

  init: function() {
    const hand = this.data.hand;
    const type = this.data.type;
    const state = window.controllerStates[hand];

    // コントローラーが接続されたらdetectedをtrueに
    this.el.addEventListener('controllerconnected', () => {
      state.detected = true;
      state.type = type;
    });

    this.el.addEventListener('controllerdisconnected', () => {
      state.detected = false;
    });

    // Oculus Touch イベント
    if (type === 'oculus') {
      // Trigger
      this.el.addEventListener('triggerdown', () => { state.trigger = 1; });
      this.el.addEventListener('triggerup', () => { state.trigger = 0; });

      // Grip
      this.el.addEventListener('gripdown', () => { state.grip = 1; });
      this.el.addEventListener('gripup', () => { state.grip = 0; });

      // A/X button
      this.el.addEventListener('abuttondown', () => { state.buttonA = 1; });
      this.el.addEventListener('abuttonup', () => { state.buttonA = 0; });
      this.el.addEventListener('xbuttondown', () => { state.buttonA = 1; });
      this.el.addEventListener('xbuttonup', () => { state.buttonA = 0; });

      // B/Y button
      this.el.addEventListener('bbuttondown', () => { state.buttonB = 1; });
      this.el.addEventListener('bbuttonup', () => { state.buttonB = 0; });
      this.el.addEventListener('ybuttondown', () => { state.buttonB = 1; });
      this.el.addEventListener('ybuttonup', () => { state.buttonB = 0; });

      // Thumbstick
      this.el.addEventListener('thumbstickmoved', (evt) => {
        state.thumbstick.x = evt.detail.x;
        state.thumbstick.y = evt.detail.y;
      });
    }

    // Vive コントローラー イベント
    if (type === 'vive') {
      // Trigger
      this.el.addEventListener('triggerdown', () => { state.trigger = 1; });
      this.el.addEventListener('triggerup', () => { state.trigger = 0; });

      // Grip
      this.el.addEventListener('gripdown', () => { state.grip = 1; });
      this.el.addEventListener('gripup', () => { state.grip = 0; });

      // Menu button
      this.el.addEventListener('menudown', () => { state.menu = 1; });
      this.el.addEventListener('menuup', () => { state.menu = 0; });

      // Trackpad
      this.el.addEventListener('trackpaddown', () => { state.buttonA = 1; });
      this.el.addEventListener('trackpadup', () => { state.buttonA = 0; });
      
      this.el.addEventListener('trackpadmoved', (evt) => {
        state.trackpad.x = evt.detail.x;
        state.trackpad.y = evt.detail.y;
      });
    }
  }
});

// ------------------------------
// A-Frame カスタムコンポーネント: controller-monitor
// ------------------------------
AFRAME.registerComponent('controller-monitor', {
  init: function() {
    this.lastUpdate = 0;
  },
  
  tick: function(time) {
    // 100msごとに更新
    if (time - this.lastUpdate < 100) return;
    this.lastUpdate = time;

    const leftState = window.controllerStates.left;
    const rightState = window.controllerStates.right;

    const display = this.formatControllerDisplay(rightState, leftState);
    if (controllerInfoEl) {
      controllerInfoEl.setAttribute("value", display);
    }
  },

  formatControllerDisplay: function(rightState, leftState) {
    let text = "Controllers\n\n";

    // Right Controller
    text += "Right\n";
    if (rightState.detected) {
      const type = rightState.type || 'unknown';
      
      if (type === 'oculus') {
        text += `Trigger:${rightState.trigger} Grip:${rightState.grip} `;
        text += `A:${rightState.buttonA} B:${rightState.buttonB}\n`;
        text += `Joy: (x:${rightState.thumbstick.x.toFixed(2)}, y:${rightState.thumbstick.y.toFixed(2)})\n`;
      } else if (type === 'vive') {
        text += `Trigger:${rightState.trigger} Grip:${rightState.grip} `;
        text += `Menu:${rightState.menu} Pad:${rightState.buttonA}\n`;
        text += `Trackpad: (x:${rightState.trackpad.x.toFixed(2)}, y:${rightState.trackpad.y.toFixed(2)})\n`;
      }
    } else {
      text += "Not detected\n\n";
    }

    text += "\n";

    // Left Controller
    text += "Left\n";
    if (leftState.detected) {
      const type = leftState.type || 'unknown';
      
      if (type === 'oculus') {
        text += `Trigger:${leftState.trigger} Grip:${leftState.grip} `;
        text += `X:${leftState.buttonA} Y:${leftState.buttonB}\n`;
        text += `Joy: (x:${leftState.thumbstick.x.toFixed(2)}, y:${leftState.thumbstick.y.toFixed(2)})`;
      } else if (type === 'vive') {
        text += `Trigger:${leftState.trigger} Grip:${leftState.grip} `;
        text += `Menu:${leftState.menu} Pad:${leftState.buttonA}\n`;
        text += `Trackpad: (x:${leftState.trackpad.x.toFixed(2)}, y:${leftState.trackpad.y.toFixed(2)})`;
      }
    } else {
      text += "Not detected";
    }

    return text;
  }
});

// カメラにコントローラーモニターを追加
window.addEventListener('load', () => {
  const camera = document.getElementById('camera');
  if (camera) {
    camera.setAttribute('controller-monitor', '');
  }
});

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
// Main
// ------------------------------
async function start() {
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