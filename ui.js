/**
 * ui.js
 * UI関連のA-Frameコンポーネントとロジック
 * 仮想キーボード、ボタン、トグル、入力フィールド
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
  idValue: 'app-id',
  passkeyValue: 'secret-key',
  
  // 接続情報
  connectionId: 'none',
  resolution: '1920x1080',
  fps: '30'
};

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
    this.hoverColor = '#666666';
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
    
    // ボタンの種類に応じてホバー色を設定
    const id = this.el.id;
    if (id.startsWith('room')) {
      this.hoverColor = '#2ECC71';  // 緑系
    } else if (id === 'connectButton') {
      this.hoverColor = '#5DADE2';  // 青系
    } else if (id === 'disconnectButton') {
      this.hoverColor = '#EC7063';  // 赤系
    } else {
      this.hoverColor = '#5DADE2';  // デフォルト
    }
    
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
      // TODO: 実際の接続処理
    } else if (id === 'disconnectButton') {
      console.log('[UI] Disconnect button clicked');
      window.uiState.connected = false;
      // TODO: 実際の切断処理
    }
  },
  
  highlightSelected: function() {
    // すべてのroomボタンを元の色に戻す
    ['room1Button', 'room2Button', 'room3Button'].forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn && btn.id !== this.el.id) {
        btn.setAttribute('color', '#27AE60');
      }
    });
    
    // 選択されたボタンを明るくする
    this.originalColor = '#2ECC71';
    this.el.setAttribute('color', '#2ECC71');
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
      const newX = this.isOn ? 0.51 : 0.29;
      this.handle.setAttribute('position', `${newX} 0 0.01`);
    }
    
    // 背景色を変更
    const newColor = this.isOn ? '#3498DB' : '#95A5A6';
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
    rightController.setAttribute('raycaster', 'objects', '.ui-button, .ui-toggle, .ui-input');
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

/**
 * グローバル関数: 接続情報を更新
 */
window.updateConnectionInfo = function(connectionId, resolution, fps) {
  // 状態を更新
  if (connectionId !== undefined) {
    window.uiState.connectionId = connectionId;
    const el = document.getElementById('connectionIdText');
    if (el) el.setAttribute('value', connectionId);
  }
  
  if (resolution !== undefined) {
    window.uiState.resolution = resolution;
    const el = document.getElementById('resolutionText');
    if (el) el.setAttribute('value', resolution);
  }
  
  if (fps !== undefined) {
    window.uiState.fps = fps;
    const el = document.getElementById('fpsText');
    if (el) el.setAttribute('value', fps);
  }
  
  console.log('[UI] Connection info updated:', window.uiState.connectionId, window.uiState.resolution, window.uiState.fps);
};

// グローバルに公開
window.uiState = window.uiState;
window.showKeyboard = window.showKeyboard;
window.hideKeyboard = window.hideKeyboard;
window.handleKeyPress = window.handleKeyPress;
window.updateConnectionInfo = window.updateConnectionInfo;

console.log('[UI] UI components and functions loaded');
