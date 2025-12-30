/**
 * ui.js
 * UI関連のA-Frameコンポーネントとロジック
 * 仮想キーボード、ボタン、トグル、入力フィールド、スライダー、スクロールなど
 */

/* global AFRAME */

// UI状態管理
window.uiState = {
  selectedRoom: 'room1',
  debugMode: false,
  connected: false,
  keyboardVisible: false,
  currentInputField: null,  // 現在編集中のフィールド
  
  // 入力値
  idValue: 'your-app-id',
  passkeyValue: 'your-secret-key',
  
  // 接続情報
  connectionId: 'none',
  resolution: '1920x1080',
  fps: '30',
  
  // 操作設定
  videoPositionX: 0.0,
  videoPositionY: 0.0,
  videoPositionZ: 0.0,
  joystickDeadzone: 0.2,
  
  // スクロール
  scrollOffset: 0,
  scrollStep: 0.2
};

/**
 * A-Frameコンポーネント: scroll-container
 * スクロール可能なコンテナ
 */
AFRAME.registerComponent('scroll-container', {
  init: function() {
    this.scrollOffset = 0;
    console.log('[SCROLL CONTAINER] Initialized');
  },
  
  scroll: function(direction) {
    const step = window.uiState.scrollStep;
    
    if (direction === 'up') {
      this.scrollOffset = Math.min(this.scrollOffset + step, 1.5);
    } else if (direction === 'down') {
      this.scrollOffset = Math.max(this.scrollOffset - step, 0);
    }
    
    // コンテンツをスクロール
    const currentPos = this.el.getAttribute('position');
    this.el.setAttribute('position', {
      x: currentPos.x,
      y: this.scrollOffset,
      z: currentPos.z
    });
    
    window.uiState.scrollOffset = this.scrollOffset;
    console.log('[SCROLL] Offset:', this.scrollOffset.toFixed(2));
  }
});

/**
 * A-Frameコンポーネント: ui-scroll
 * スクロールボタン
 */
AFRAME.registerComponent('ui-scroll', {
  schema: {
    direction: { type: 'string', default: 'up' }
  },
  
  init: function() {
    this.originalColor = this.el.getAttribute('color');
    this.hoverColor = '#888888';
    this.isHovered = false;
    
    // レイキャストのホバーイベント
    this.el.addEventListener('raycaster-intersected', () => {
      if (!this.isHovered) {
        this.isHovered = true;
        this.el.setAttribute('color', this.hoverColor);
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
    
    console.log('[UI SCROLL] Initialized:', this.data.direction);
  },
  
  handleClick: function() {
    const scrollContainer = document.getElementById('scrollableContent');
    if (scrollContainer && scrollContainer.components['scroll-container']) {
      scrollContainer.components['scroll-container'].scroll(this.data.direction);
    }
  }
});

/**
 * A-Frameコンポーネント: ui-slider
 * スライダー機能
 */
AFRAME.registerComponent('ui-slider', {
  schema: {
    min: { type: 'number', default: 0 },
    max: { type: 'number', default: 1 },
    value: { type: 'number', default: 0 },
    axis: { type: 'string', default: 'x' }  // x, y, z, deadzone
  },
  
  init: function() {
    this.isDragging = false;
    this.sliderWidth = 1.2;  // スライダーの幅
    this.originalColor = this.el.getAttribute('color');
    this.hoverColor = '#42A5F5';
    this.isHovered = false;
    
    // 初期位置を設定
    this.updatePosition(this.data.value);
    
    // レイキャストのホバーイベント
    this.el.addEventListener('raycaster-intersected', () => {
      if (!this.isHovered) {
        this.isHovered = true;
        this.el.setAttribute('color', this.hoverColor);
      }
    });
    
    this.el.addEventListener('raycaster-intersected-cleared', () => {
      if (this.isHovered) {
        this.isHovered = false;
        this.el.setAttribute('color', this.originalColor);
      }
    });
    
    // クリックイベント（今回は簡易実装、値の増減のみ）
    this.el.addEventListener('click', () => {
      this.handleClick();
    });
    
    console.log('[UI SLIDER] Initialized:', this.data.axis, 'value:', this.data.value);
  },
  
  handleClick: function() {
    // クリックで値を0.5増やす（最大値で折り返し）
    let newValue = this.data.value + 0.5;
    if (newValue > this.data.max) {
      newValue = this.data.min;
    }
    
    this.data.value = newValue;
    this.updatePosition(newValue);
    this.updateState(newValue);
    
    console.log(`[UI SLIDER] ${this.data.axis} clicked, new value:`, newValue.toFixed(1));
  },
  
  updatePosition: function(value) {
    // 値をスライダー位置に変換
    const range = this.data.max - this.data.min;
    const normalizedValue = (value - this.data.min) / range;  // 0-1
    const offset = (normalizedValue - 0.5) * this.sliderWidth;  // -0.6 to 0.6
    
    const currentPos = this.el.getAttribute('position');
    this.el.setAttribute('position', {
      x: 0.2 + offset,  // 中心位置 + オフセット
      y: currentPos.y,
      z: currentPos.z
    });
  },
  
  updateState: function(value) {
    const axis = this.data.axis;
    const roundedValue = Math.round(value * 10) / 10;
    
    // グローバル状態を更新
    if (axis === 'x') {
      window.uiState.videoPositionX = roundedValue;
      const textEl = document.getElementById('videoXValue');
      if (textEl) textEl.setAttribute('value', roundedValue.toFixed(1));
    } else if (axis === 'y') {
      window.uiState.videoPositionY = roundedValue;
      const textEl = document.getElementById('videoYValue');
      if (textEl) textEl.setAttribute('value', roundedValue.toFixed(1));
    } else if (axis === 'z') {
      window.uiState.videoPositionZ = roundedValue;
      const textEl = document.getElementById('videoZValue');
      if (textEl) textEl.setAttribute('value', roundedValue.toFixed(1));
    } else if (axis === 'deadzone') {
      window.uiState.joystickDeadzone = roundedValue;
      const textEl = document.getElementById('deadzoneValue');
      if (textEl) textEl.setAttribute('value', roundedValue.toFixed(1));
    }
  }
});

/**
 * A-Frameコンポーネント: ui-input
 * 入力フィールド機能（複数フィールド対応）
 */
AFRAME.registerComponent('ui-input', {
  schema: {
    field: { type: 'string', default: 'default' }  // id, passkey など
  },
  
  init: function() {
    this.originalColor = this.el.getAttribute('color');
    this.hoverColor = '#E3F2FD';
    this.isHovered = false;
    
    // レイキャストのホバーイベント
    this.el.addEventListener('raycaster-intersected', () => {
      if (!this.isHovered) {
        this.isHovered = true;
        this.el.setAttribute('color', this.hoverColor);
        console.log('[UI INPUT] Hover:', this.data.field);
      }
    });
    
    this.el.addEventListener('raycaster-intersected-cleared', () => {
      if (this.isHovered) {
        this.isHovered = false;
        this.el.setAttribute('color', this.originalColor);
        console.log('[UI INPUT] Hover cleared:', this.data.field);
      }
    });
    
    // クリックイベント
    this.el.addEventListener('click', () => {
      this.handleClick();
    });
    
    console.log('[UI INPUT] Initialized:', this.data.field);
  },
  
  handleClick: function() {
    const field = this.data.field;
    console.log(`[UI INPUT] ${field} clicked`);
    
    // 現在のフィールドを設定
    window.uiState.currentInputField = field;
    
    // キーボードを表示
    if (window.showKeyboard) {
      window.showKeyboard(field);
    }
  }
});

/**
 * A-Frameコンポーネント: ui-key
 * 仮想キーボードのキー機能
 */
AFRAME.registerComponent('ui-key', {
  schema: {
    key: { type: 'string', default: '' }
  },
  
  init: function() {
    this.originalColor = this.el.getAttribute('color');
    this.hoverColor = '#777777';
    this.isHovered = false;
    
    // レイキャストのホバーイベント
    this.el.addEventListener('raycaster-intersected', () => {
      if (!this.isHovered) {
        this.isHovered = true;
        this.el.setAttribute('color', this.hoverColor);
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
    
    console.log('[UI KEY] Initialized:', this.data.key);
  },
  
  handleClick: function() {
    const key = this.data.key;
    console.log(`[UI KEY] ${key} clicked`);
    
    if (window.handleKeyPress) {
      window.handleKeyPress(key);
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
    this.hoverColor = '#66BB6A';
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
        console.log('[UI BUTTON] Hover cleared:', this.el.id);
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
    
    // キーボードが表示されている場合は閉じる
    if (window.uiState.keyboardVisible) {
      window.hideKeyboard();
    }
    
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
      if (this.isHovered) {
        this.isHovered = false;
        console.log('[UI TOGGLE] Hover cleared');
      }
    });
    
    // クリックイベント
    this.el.addEventListener('click', () => {
      this.toggle();
    });
    
    console.log('[UI TOGGLE] Initialized');
  },
  
  toggle: function() {
    this.isOn = !this.isOn;
    
    // キーボードが表示されている場合は閉じる
    if (window.uiState.keyboardVisible) {
      window.hideKeyboard();
    }
    
    // ハンドル位置を変更
    if (this.handle) {
      const newX = this.isOn ? 0.3 : 0.1;
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
 * グローバル関数: キーボード表示
 * Raycasterのターゲットをキーのみに制限
 */
window.showKeyboard = function(field) {
  const keyboard = document.getElementById('virtualKeyboard');
  const rightController = document.getElementById('rightOculus');
  
  if (keyboard) {
    keyboard.setAttribute('visible', true);
    window.uiState.keyboardVisible = true;
    console.log('[KEYBOARD] Keyboard shown for field:', field);
  }
  
  // Raycasterのターゲットをキーのみに制限
  if (rightController && rightController.components.raycaster) {
    rightController.setAttribute('raycaster', 'objects', '.ui-key');
    console.log('[KEYBOARD] Raycaster limited to keys only');
  }
};

/**
 * グローバル関数: キーボード非表示
 * Raycasterのターゲットを元に戻す
 */
window.hideKeyboard = function() {
  const keyboard = document.getElementById('virtualKeyboard');
  const rightController = document.getElementById('rightOculus');
  
  if (keyboard) {
    keyboard.setAttribute('visible', false);
    window.uiState.keyboardVisible = false;
    window.uiState.currentInputField = null;
    console.log('[KEYBOARD] Keyboard hidden');
  }
  
  // Raycasterのターゲットを元に戻す
  if (rightController && rightController.components.raycaster) {
    rightController.setAttribute('raycaster', 'objects', '.ui-button, .ui-toggle, .ui-input, .ui-scroll');
    console.log('[KEYBOARD] Raycaster restored to normal UI elements');
  }
};

/**
 * グローバル関数: キー入力処理
 */
window.handleKeyPress = function(key) {
  const currentField = window.uiState.currentInputField;
  
  if (!currentField) {
    console.warn('[KEYBOARD] No input field selected');
    return;
  }
  
  // フィールドに応じた処理
  let currentValue = '';
  let textElementId = '';
  
  if (currentField === 'id') {
    currentValue = window.uiState.idValue;
    textElementId = 'idInputText';
  } else if (currentField === 'passkey') {
    currentValue = window.uiState.passkeyValue;
    textElementId = 'passkeyInputText';
  }
  
  // キー入力処理
  if (key === 'Backspace') {
    if (currentValue.length > 0) {
      currentValue = currentValue.slice(0, -1);
    }
  } else if (key === 'Enter') {
    console.log('[KEYBOARD] Input confirmed:', currentField, currentValue);
    window.hideKeyboard();
    return;
  } else if (key === 'Space') {
    currentValue += ' ';
  } else {
    currentValue += key;
  }
  
  // 状態を更新
  if (currentField === 'id') {
    window.uiState.idValue = currentValue;
  } else if (currentField === 'passkey') {
    window.uiState.passkeyValue = currentValue;
  }
  
  // 表示を更新
  const textEl = document.getElementById(textElementId);
  if (textEl) {
    textEl.setAttribute('value', currentValue);
  }
  
  console.log('[KEYBOARD] Current input:', currentField, currentValue);
};

// グローバルに公開
window.uiState = window.uiState;
window.showKeyboard = window.showKeyboard;
window.hideKeyboard = window.hideKeyboard;
window.handleKeyPress = window.handleKeyPress;

console.log('[UI] UI components and functions loaded');
