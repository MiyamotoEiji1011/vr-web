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
// A-Frame カスタムコンポーネント: controller-monitor
// ------------------------------
AFRAME.registerComponent('controller-monitor', {
  init: function() {
    this.lastUpdate = 0;
    // コントローラーエンティティを取得
    this.leftControllers = [
      document.getElementById('leftVive'),
      document.getElementById('leftOculus')
    ];
    this.rightControllers = [
      document.getElementById('rightVive'),
      document.getElementById('rightOculus')
    ];
  },
  
  tick: function(time) {
    // 100msごとに更新
    if (time - this.lastUpdate < 100) return;
    this.lastUpdate = time;

    const leftInfo = this.getControllerInfo(this.leftControllers);
    const rightInfo = this.getControllerInfo(this.rightControllers);

    const display = this.formatControllerDisplay(rightInfo, leftInfo);
    if (controllerInfoEl) {
      controllerInfoEl.setAttribute("value", display);
    }
  },

  getControllerInfo: function(controllers) {
    for (let controller of controllers) {
      if (!controller) continue;
      
      // コントローラーのGamepadオブジェクトを取得
      const trackedControls = controller.components['tracked-controls'];
      if (!trackedControls) continue;
      
      const gamepad = trackedControls.controller;
      if (!gamepad) continue;

      // ボタンとAxesの情報を取得
      const buttons = [];
      if (gamepad.buttons) {
        for (let i = 0; i < gamepad.buttons.length; i++) {
          buttons.push({
            index: i,
            pressed: gamepad.buttons[i].pressed ? 1 : 0,
            value: gamepad.buttons[i].value.toFixed(2)
          });
        }
      }

      const axes = {
        x: gamepad.axes && gamepad.axes[0] ? gamepad.axes[0].toFixed(2) : "0.00",
        y: gamepad.axes && gamepad.axes[1] ? gamepad.axes[1].toFixed(2) : "0.00"
      };

      return { buttons, axes, found: true };
    }
    
    return { buttons: [], axes: { x: "0.00", y: "0.00" }, found: false };
  },

  formatControllerDisplay: function(rightInfo, leftInfo) {
    let text = "Controllers\n\n";

    // Right Controller
    text += "Right\n";
    if (rightInfo.found) {
      text += "Buttons: ";
      if (rightInfo.buttons.length > 0) {
        text += rightInfo.buttons.map(b => `B${b.index}:${b.pressed}`).join(" ");
      } else {
        text += "None";
      }
      text += `\nJoy: (x:${rightInfo.axes.x}, y:${rightInfo.axes.y})\n`;
    } else {
      text += "Not detected\n";
    }

    text += "\n";

    // Left Controller
    text += "Left\n";
    if (leftInfo.found) {
      text += "Buttons: ";
      if (leftInfo.buttons.length > 0) {
        text += leftInfo.buttons.map(b => `B${b.index}:${b.pressed}`).join(" ");
      } else {
        text += "None";
      }
      text += `\nJoy: (x:${leftInfo.axes.x}, y:${leftInfo.axes.y})`;
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