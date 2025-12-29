/**
 * a_frame.js
 * A-Frameカスタムコンポーネントとコントローラー管理
 * モード切り替え機能を含む（Oculus Touchのみ対応）
 */

/* global AFRAME, THREE */

// 表示する仕様値（固定）
const VR_DISPLAY_CONFIG = {
  FRAME_W: 1080,
  FRAME_H: 720,
  FPS: 30
};

// グローバルなコントローラー状態管理
window.controllerStates = {
  left: {
    trigger: 0,
    grip: 0,
    buttonX: 0,
    buttonY: 0,
    thumbstick: { x: 0, y: 0 },
    detected: false
  },
  right: {
    trigger: 0,
    grip: 0,
    buttonA: 0,
    buttonB: 0,
    thumbstick: { x: 0, y: 0 },
    detected: false
  }
};

// モード切り替え状態管理（エッジ検出用）
const modeToggleState = {
  xButtonPressed: false,  // Xボタンの現在の状態
  xKeyPressed: false      // Xキーの現在の状態
};

/**
 * A-Frameコンポーネント: rotation-reader
 * HMDの回転を取得してHUDに表示
 */
AFRAME.registerComponent('rotation-reader', {
  init: function() {
    this.euler = new THREE.Euler(0, 0, 0, "YXZ");
    this.lastUpdate = 0;
    this.hudTextEl = document.getElementById("hudText");
  },
  
  tick: function(time) {
    // 100msごとに更新
    if (time - this.lastUpdate < 100) return;
    this.lastUpdate = time;

    if (!this.hudTextEl) return;

    // VR/非VR両方で動作：object3Dから回転を取得
    const rotation = this.el.object3D.rotation;
    
    // Eulerからラジアンを度に変換
    const x = THREE.MathUtils.radToDeg(rotation.x);
    const y = THREE.MathUtils.radToDeg(rotation.y);
    const z = THREE.MathUtils.radToDeg(rotation.z);

    // HUD更新
    this.hudTextEl.setAttribute(
      "value",
      `Frame\n- ${VR_DISPLAY_CONFIG.FRAME_W}*${VR_DISPLAY_CONFIG.FRAME_H}\n- ${VR_DISPLAY_CONFIG.FPS}fps\n\nHMD rotation (deg)\n- x: ${this.format3(x)}\n- y: ${this.format3(y)}\n- z: ${this.format3(z)}`
    );
  },

  format3: function(n) {
    return (Math.round(n * 1000) / 1000).toFixed(3);
  }
});

/**
 * A-Frameコンポーネント: controller-listener
 * コントローラーのボタンとジョイスティック入力を監視（Oculus Touchのみ）
 * モード切り替え機能を含む
 */
AFRAME.registerComponent('controller-listener', {
  schema: {
    hand: { type: 'string', default: 'left' }
  },

  init: function() {
    const hand = this.data.hand;
    const state = window.controllerStates[hand];

    // コントローラーが接続されたらdetectedをtrueに
    this.el.addEventListener('controllerconnected', () => {
      state.detected = true;
      console.log(`[CONTROLLER] Oculus Touch ${hand} controller connected`);
    });

    this.el.addEventListener('controllerdisconnected', () => {
      state.detected = false;
      console.log(`[CONTROLLER] Oculus Touch ${hand} controller disconnected`);
    });

    // Oculus Touch イベント
    this.setupOculusEvents(state, hand);
  },

  /**
   * Oculus Touchのイベントをセットアップ
   */
  setupOculusEvents: function(state, hand) {
    // Trigger
    this.el.addEventListener('triggerdown', () => { state.trigger = 1; });
    this.el.addEventListener('triggerup', () => { state.trigger = 0; });

    // Grip
    this.el.addEventListener('gripdown', () => { state.grip = 1; });
    this.el.addEventListener('gripup', () => { state.grip = 0; });

    if (hand === 'left') {
      // 左コントローラー: X, Y ボタン
      
      // Xボタン（モード切り替え）
      this.el.addEventListener('xbuttondown', () => {
        state.buttonX = 1;
        // エッジ検出：前回がfalseで今回trueならトグル
        if (!modeToggleState.xButtonPressed) {
          modeToggleState.xButtonPressed = true;
          this.handleModeToggle();
        }
      });
      this.el.addEventListener('xbuttonup', () => {
        state.buttonX = 0;
        modeToggleState.xButtonPressed = false;
      });

      // Yボタン
      this.el.addEventListener('ybuttondown', () => { state.buttonY = 1; });
      this.el.addEventListener('ybuttonup', () => { state.buttonY = 0; });

    } else {
      // 右コントローラー: A, B ボタン
      
      // Aボタン
      this.el.addEventListener('abuttondown', () => { state.buttonA = 1; });
      this.el.addEventListener('abuttonup', () => { state.buttonA = 0; });

      // Bボタン
      this.el.addEventListener('bbuttondown', () => { state.buttonB = 1; });
      this.el.addEventListener('bbuttonup', () => { state.buttonB = 0; });
    }

    // Thumbstick
    this.el.addEventListener('thumbstickmoved', (evt) => {
      state.thumbstick.x = evt.detail.x;
      state.thumbstick.y = evt.detail.y;
    });
  },

  /**
   * モード切り替えハンドラー
   */
  handleModeToggle: function() {
    if (window.appToggleMode) {
      window.appToggleMode();
    } else {
      console.warn('[MODE TOGGLE] appToggleMode function not available');
    }
  }
});

/**
 * A-Frameコンポーネント: controller-monitor
 * コントローラーの状態を監視してHUDに表示
 */
AFRAME.registerComponent('controller-monitor', {
  init: function() {
    this.lastUpdate = 0;
    this.controllerInfoEl = document.getElementById("controllerInfo");
  },
  
  tick: function(time) {
    // 100msごとに更新
    if (time - this.lastUpdate < 100) return;
    this.lastUpdate = time;

    if (!this.controllerInfoEl) return;

    const leftState = window.controllerStates.left;
    const rightState = window.controllerStates.right;

    const display = this.formatControllerDisplay(rightState, leftState);
    this.controllerInfoEl.setAttribute("value", display);
  },

  /**
   * コントローラー情報をフォーマット
   */
  formatControllerDisplay: function(rightState, leftState) {
    let text = "Controllers\n\n";

    // Right Controller
    text += "Right\n";
    if (rightState.detected) {
      text += `Trigger:${rightState.trigger} Grip:${rightState.grip} `;
      text += `A:${rightState.buttonA} B:${rightState.buttonB}\n`;
      text += `Joy: (x:${rightState.thumbstick.x.toFixed(2)}, y:${rightState.thumbstick.y.toFixed(2)})\n`;
    } else {
      text += "Not detected\n\n";
    }

    text += "\n";

    // Left Controller
    text += "Left\n";
    if (leftState.detected) {
      text += `Trigger:${leftState.trigger} Grip:${leftState.grip} `;
      text += `X:${leftState.buttonX} Y:${leftState.buttonY}\n`;
      text += `Joy: (x:${leftState.thumbstick.x.toFixed(2)}, y:${leftState.thumbstick.y.toFixed(2)})`;
    } else {
      text += "Not detected";
    }

    return text;
  }
});

/**
 * A-Frameコンポーネント: mode-display
 * 現在のモードを表示
 */
AFRAME.registerComponent('mode-display', {
  init: function() {
    this.lastUpdate = 0;
    this.modeTextEl = document.getElementById("modeText");
  },
  
  tick: function(time) {
    // 100msごとに更新
    if (time - this.lastUpdate < 100) return;
    this.lastUpdate = time;

    if (!this.modeTextEl) return;

    // 現在のモードを取得
    const currentMode = window.appGetCurrentMode ? window.appGetCurrentMode() : 'unknown';
    const modeDisplay = currentMode.toUpperCase();

    // モードテキストを更新
    this.modeTextEl.setAttribute("value", `MODE: ${modeDisplay}`);
  }
});

/**
 * キーボードのXキーでモード切り替え
 */
function setupKeyboardModeToggle() {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'x' || event.key === 'X') {
      // エッジ検出：前回がfalseで今回trueならトグル
      if (!modeToggleState.xKeyPressed) {
        modeToggleState.xKeyPressed = true;
        
        if (window.appToggleMode) {
          window.appToggleMode();
        } else {
          console.warn('[MODE TOGGLE] appToggleMode function not available');
        }
      }
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.key === 'x' || event.key === 'X') {
      modeToggleState.xKeyPressed = false;
    }
  });
  
  console.log('[KEYBOARD] Mode toggle key (X) registered');
}

/**
 * A-Frameコンポーネントの初期化
 * カメラにcontroller-monitorとmode-displayをアタッチ
 */
function initializeAFrameComponents() {
  const camera = document.getElementById('camera');
  if (camera) {
    camera.setAttribute('controller-monitor', '');
    camera.setAttribute('mode-display', '');
  }
  
  // キーボードのモード切り替えを設定
  setupKeyboardModeToggle();
  
  console.log('[A-FRAME] Components initialized');
}

// DOMロード完了後にコンポーネントを初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAFrameComponents);
} else {
  initializeAFrameComponents();
}

// グローバルに公開
window.VR_DISPLAY_CONFIG = VR_DISPLAY_CONFIG;
window.initializeAFrameComponents = initializeAFrameComponents;
