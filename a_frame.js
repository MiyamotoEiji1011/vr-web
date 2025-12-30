/**
 * a_frame.js
 * A-Frameカスタムコンポーネントとコントローラー管理
 * モード切り替え機能、VRコントローラーでのUI操作を含む（Oculus Touchのみ対応）
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

// UI状態管理
window.uiState = {
  selectedRoom: 'room1',
  debugMode: false,
  connected: false
};

// モード切り替え状態管理（エッジ検出用）
const modeToggleState = {
  xButtonPressed: false,  // Xボタンの現在の状態
  xKeyPressed: false      // Xキーの現在の状態
};

/**
 * A-Frameコンポーネント: controller-cursor
 * コントローラーのトリガーでレイキャスト上のオブジェクトをクリック
 */
AFRAME.registerComponent('controller-cursor', {
  init: function() {
    this.raycaster = this.el.components.raycaster;
    this.triggerPressed = false;
    
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
    if (!this.raycaster) return;
    
    // レイキャスターの交差情報を取得
    const intersections = this.raycaster.intersections;
    
    if (intersections && intersections.length > 0) {
      const intersection = intersections[0];
      const targetEl = intersection.object.el;
      
      if (targetEl) {
        console.log('[CONTROLLER CURSOR] Clicking on:', targetEl.id || targetEl.className);
        
        // clickイベントを発火
        targetEl.emit('click');
        
        // マウスイベントも発火（互換性のため）
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        targetEl.dispatchEvent(clickEvent);
      }
    }
  }
});

/**
 * A-Frameコンポーネント: ui-button
 * シンプルなボタン機能
 */
AFRAME.registerComponent('ui-button', {
  init: function() {
    this.originalColor = this.el.getAttribute('color');
    this.hoverColor = '#66BB6A'; // ホバー時の色
    this.isHovered = false;
    
    // レイキャストのホバーイベント
    this.el.addEventListener('raycaster-intersected', () => {
      if (!this.isHovered) {
        this.isHovered = true;
        this.el.setAttribute('color', this.hoverColor);
        console.log('[UI BUTTON] Hover:', this.el.id);
      }
    });
    
    this.el.addEventListener('raycaster-intersected-cleared', () => {
      if (this.isHovered) {
        this.isHovered = false;
        this.el.setAttribute('color', this.originalColor);
      }
    });
    
    // クリックイベント
    this.el.addEventListener('click', () => {
      this.handleClick();
    });
    
    console.log('[UI BUTTON] Initialized:', this.el.id);
  },
  
  handleClick: function() {
    const id = this.el.id;
    console.log(`[UI BUTTON] ${id} clicked`);
    
    // ボタンIDに応じた処理
    if (id.startsWith('room')) {
      const roomName = id.replace('Button', '');
      window.uiState.selectedRoom = roomName;
      console.log(`[UI] Selected room: ${roomName}`);
      
      // 視覚的フィードバック：選択されたボタンを明るくする
      this.highlightSelected();
    } else if (id === 'connectButton') {
      console.log('[UI] Connect button clicked');
      window.uiState.connected = true;
    } else if (id === 'disconnectButton') {
      console.log('[UI] Disconnect button clicked');
      window.uiState.connected = false;
    }
  },
  
  highlightSelected: function() {
    // すべてのroomボタンを元の色に戻す
    ['room1Button', 'room2Button', 'room3Button'].forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn && btn.id !== this.el.id) {
        btn.setAttribute('color', '#4CAF50');
      }
    });
    
    // 選択されたボタンを明るくする
    this.originalColor = '#66BB6A';
    this.el.setAttribute('color', '#66BB6A');
  }
});

/**
 * A-Frameコンポーネント: ui-toggle
 * シンプルなトグル機能
 */
AFRAME.registerComponent('ui-toggle', {
  init: function() {
    this.isOn = false;
    this.handle = document.getElementById('debugToggleHandle');
    this.isHovered = false;
    
    // レイキャストのホバーイベント
    this.el.addEventListener('raycaster-intersected', () => {
      if (!this.isHovered) {
        this.isHovered = true;
        console.log('[UI TOGGLE] Hover');
      }
    });
    
    this.el.addEventListener('raycaster-intersected-cleared', () => {
      this.isHovered = false;
    });
    
    // クリックイベント
    this.el.addEventListener('click', () => {
      this.toggle();
    });
    
    console.log('[UI TOGGLE] Initialized');
  },
  
  toggle: function() {
    this.isOn = !this.isOn;
    
    // ハンドル位置を変更
    if (this.handle) {
      const newX = this.isOn ? 0.1 : -0.1;
      this.handle.setAttribute('position', `${newX} 0 0.01`);
    }
    
    // 背景色を変更
    const newColor = this.isOn ? '#2196F3' : '#CCCCCC';
    this.el.setAttribute('color', newColor);
    
    // 状態を更新
    window.uiState.debugMode = this.isOn;
    
    console.log(`[UI TOGGLE] Debug mode: ${this.isOn ? 'ON' : 'OFF'}`);
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
    
    // コントローラーモデルを表示
    this.showControllerModels();
    
    console.log('[MODE MANAGER] Settings UI displayed, controller models shown');
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
    
    // コントローラーモデルを非表示
    this.hideControllerModels();
    
    console.log('[MODE MANAGER] Control UI displayed, controller models hidden');
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
