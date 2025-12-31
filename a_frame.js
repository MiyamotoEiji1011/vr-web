/**
 * a_frame.js
 * A-Frameカスタムコンポーネントとコントローラー管理
 * モード切り替え機能、VRコントローラー管理を含む（Oculus Touchのみ対応）
 * Rayの動的な長さ調整機能を含む
 */

/* global AFRAME, THREE */

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
 * A-Frameコンポーネント: dynamic-ray
 * Rayの長さを動的に変更（UIに当たった場合、その距離まで）
 */
AFRAME.registerComponent('dynamic-ray', {
  init: function() {
    this.raycasterEl = this.el;
    this.lineEl = this.el.querySelector('#rayLine');
    this.defaultFar = 3;  // デフォルトの距離
    this.currentDistance = this.defaultFar;
    
    // raycasterコンポーネントの取得を待つ
    this.el.addEventListener('componentinitialized', (evt) => {
      if (evt.detail.name === 'raycaster') {
        this.raycaster = this.el.components.raycaster;
        console.log('[DYNAMIC RAY] Raycaster initialized');
      }
    });
    
    // raycaster-intersectionイベントをリッスン
    this.el.addEventListener('raycaster-intersection', (evt) => {
      const intersections = evt.detail.intersections;
      if (intersections && intersections.length > 0) {
        // 最も近い交差点の距離を取得
        const closestIntersection = intersections[0];
        this.currentDistance = closestIntersection.distance;
        this.updateRayLength(this.currentDistance);
        // console.log('[DYNAMIC RAY] Hit UI at distance:', this.currentDistance.toFixed(3));
      }
    });
    
    // raycaster-intersection-clearedイベントをリッスン
    this.el.addEventListener('raycaster-intersection-cleared', () => {
      // UIがない場合はデフォルトの距離に戻す
      this.currentDistance = this.defaultFar;
      this.updateRayLength(this.defaultFar);
      // console.log('[DYNAMIC RAY] No UI hit, using default distance');
    });
    
    console.log('[DYNAMIC RAY] Initialized');
  },
  
  updateRayLength: function(distance) {
    if (!this.lineEl) return;
    
    // direction: 0 -1 -1 を正規化した方向ベクトル
    const direction = new THREE.Vector3(0, -1, -1).normalize();
    
    // 距離に応じたエンドポイントを計算
    const end = direction.multiplyScalar(distance);
    
    // lineのendプロパティを更新
    this.lineEl.setAttribute('line', {
      start: { x: 0, y: 0, z: 0 },
      end: { x: end.x, y: end.y, z: end.z },
      color: 'white',
      opacity: 1.0
    });
  }
});

/**
 * A-Frameコンポーネント: controller-cursor
 * コントローラーのトリガーでレイキャスト上のオブジェクトをクリック
 * 振動フィードバックはui.jsのvibrationコンポーネントで処理
 */
AFRAME.registerComponent('controller-cursor', {
  init: function() {
    this.hoveredEl = null;
    this.triggerPressed = false;
    
    // レイキャスターのイベントをリッスン
    this.el.addEventListener('raycaster-intersection', (evt) => {
      // 複数の交差がある場合、最も近いものを取得
      if (evt.detail.els && evt.detail.els.length > 0) {
        this.hoveredEl = evt.detail.els[0];
        console.log('[CONTROLLER CURSOR] Hovering:', this.hoveredEl.id || this.hoveredEl.className);
      }
    });
    
    this.el.addEventListener('raycaster-intersection-cleared', (evt) => {
      console.log('[CONTROLLER CURSOR] Hover cleared');
      this.hoveredEl = null;
    });
    
    // トリガーボタンのイベントをリッスン
    this.el.addEventListener('triggerdown', () => {
      if (!this.triggerPressed) {
        this.triggerPressed = true;
        this.onClick();
      }
    });
    
    this.el.addEventListener('triggerup', () => {
      this.triggerPressed = false;
    });
    
    console.log('[CONTROLLER CURSOR] Initialized for', this.el.id);
  },
  
  onClick: function() {
    if (this.hoveredEl) {
      console.log('[CONTROLLER CURSOR] Clicking on:', this.hoveredEl.id || this.hoveredEl.className);
      
      // clickイベントを発火（振動はvibrationコンポーネントで処理される）
      this.hoveredEl.emit('click');
    } else {
      console.log('[CONTROLLER CURSOR] No element hovered');
    }
  }
});

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

    // HUD更新（HMD回転のみ表示）
    this.hudTextEl.setAttribute(
      "value",
      `HMD rotation (deg)\n- x: ${this.format3(x)}\n- y: ${this.format3(y)}\n- z: ${this.format3(z)}`
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
    // Trigger - controller-cursorで使用されるため、ここでは状態更新のみ
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
    // キーボードが表示されている場合は閉じる
    if (window.uiState && window.uiState.keyboardVisible) {
      window.hideKeyboard();
    }
    
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
 * A-Frameコンポーネント: mode-manager
 * モードに応じてUIとコントローラーモデルの表示を切り替え
 */
AFRAME.registerComponent('mode-manager', {
  init: function() {
    this.lastUpdate = 0;
    this.currentDisplayMode = null;
    
    // UI要素の取得
    this.controlModeUI = document.getElementById("controlModeUI");
    this.settingsModeUI = document.getElementById("settingsModeUI");
    
    // 初期位置マーカーの取得
    this.initialPositionMarker = document.getElementById("initialPositionMarker");
    
    // コントローラー要素の取得
    this.leftController = document.getElementById("leftOculus");
    this.rightController = document.getElementById("rightOculus");
    
    console.log('[MODE MANAGER] Initialized');
  },
  
  tick: function(time) {
    // 100msごとに更新
    if (time - this.lastUpdate < 100) return;
    this.lastUpdate = time;

    // 現在のモードを取得
    const currentMode = window.appGetCurrentMode ? window.appGetCurrentMode() : 'settings';
    
    // モードが変更された場合のみ更新
    if (this.currentDisplayMode !== currentMode) {
      this.currentDisplayMode = currentMode;
      this.updateDisplay(currentMode);
    }
  },
  
  /**
   * モードに応じて表示を更新
   */
  updateDisplay: function(mode) {
    console.log(`[MODE MANAGER] Switching display to ${mode} mode`);
    
    // キーボードが表示されている場合は閉じる
    if (window.uiState && window.uiState.keyboardVisible && window.hideKeyboard) {
      window.hideKeyboard();
    }
    
    if (mode === 'settings') {
      // 設定モード
      this.showSettingsMode();
    } else {
      // 操作モード
      this.showControlMode();
    }
  },
  
  /**
   * 設定モード表示
   */
  showSettingsMode: function() {
    // 設定UIを表示
    if (this.settingsModeUI) {
      this.settingsModeUI.setAttribute('visible', true);
    }
    
    // 操作UIを非表示
    if (this.controlModeUI) {
      this.controlModeUI.setAttribute('visible', false);
    }
    
    // 初期位置マーカーを非表示
    if (this.initialPositionMarker) {
      this.initialPositionMarker.setAttribute('visible', false);
    }
    
    // コントローラーモデルを表示
    this.showControllerModels();
    
    console.log('[MODE MANAGER] Settings UI displayed, controller models shown, marker hidden');
  },
  
  /**
   * 操作モード表示
   */
  showControlMode: function() {
    // 設定UIを非表示
    if (this.settingsModeUI) {
      this.settingsModeUI.setAttribute('visible', false);
    }
    
    // 操作UIを表示
    if (this.controlModeUI) {
      this.controlModeUI.setAttribute('visible', true);
    }
    
    // 初期位置マーカーを表示
    if (this.initialPositionMarker) {
      this.initialPositionMarker.setAttribute('visible', true);
    }
    
    // コントローラーモデルを非表示
    this.hideControllerModels();
    
    console.log('[MODE MANAGER] Control UI displayed, controller models hidden, marker visible');
  },
  
  /**
   * コントローラーモデルを表示
   */
  showControllerModels: function() {
    if (this.leftController) {
      this.leftController.setAttribute('oculus-touch-controls', 'model', true);
    }
    if (this.rightController) {
      this.rightController.setAttribute('oculus-touch-controls', 'model', true);
    }
  },
  
  /**
   * コントローラーモデルを非表示
   */
  hideControllerModels: function() {
    if (this.leftController) {
      this.leftController.setAttribute('oculus-touch-controls', 'model', false);
    }
    if (this.rightController) {
      this.rightController.setAttribute('oculus-touch-controls', 'model', false);
    }
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
 */
function initializeAFrameComponents() {
  const camera = document.getElementById('camera');
  if (camera) {
    camera.setAttribute('controller-monitor', '');
    camera.setAttribute('mode-display', '');
    camera.setAttribute('mode-manager', '');
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
