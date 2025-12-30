/**
 * ui.js
 * UI関連のA-Frameコンポーネントとロジック
 * 仮想キーボード、ボタン、トグル、入力フィールド
 */

/* global AFRAME */

// UI状態管理
window.uiState = {
  roomNumber: 1,  // 1-9
  debugMode: false,
  connected: false,
  keyboardVisible: false,
  currentInputField: null,  // 現在編集中のフィールド
  
  // 入力値
  passValue: '',
  idValue: '*************',
  secretValue: '*************',
  
  // 表示情報
  userid: '*************',
  resolution: '1080x720',
  fps: '30'
};

/**
 * A-Frameコンポーネント: ui-input
 * 入力フィールド機能（複数フィールド対応）
 */
AFRAME.registerComponent('ui-input', {
  schema: {
    field: { type: 'string', default: 'default' }  // pass, id, secret など
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
 * シンプルなボタン機能（action属性で動作を指定）
 */
AFRAME.registerComponent('ui-button', {
  schema: {
    action: { type: 'string', default: '' }  // connect, disconnect, roomUp, roomDown
  },
  
  init: function() {
    this.originalColor = this.el.getAttribute('color');
    
    // アクションの種類に応じてホバー色を設定
    const action = this.data.action;
    if (action === 'connect') {
      this.hoverColor = '#2ECC71';  // 緑系
    } else if (action === 'disconnect') {
      this.hoverColor = '#EC7063';  // 赤系
    } else if (action === 'roomUp' || action === 'roomDown') {
      this.hoverColor = '#85C1E9';  // 青系
    } else {
      this.hoverColor = '#5DADE2';  // デフォルト
    }
    
    this.isHovered = false;
    
    // レイキャストのホバーイベント
    this.el.addEventListener('raycaster-intersected', () => {
      if (!this.isHovered) {
        this.isHovered = true;
        this.el.setAttribute('color', this.hoverColor);
        console.log('[UI BUTTON] Hover:', this.data.action);
      }
    });
    
    this.el.addEventListener('raycaster-intersected-cleared', () => {
      if (this.isHovered) {
        this.isHovered = false;
        this.el.setAttribute('color', this.originalColor);
        console.log('[UI BUTTON] Hover cleared:', this.data.action);
      }
    });
    
    // クリックイベント
    this.el.addEventListener('click', () => {
      this.handleClick();
    });
    
    console.log('[UI BUTTON] Initialized:', this.data.action);
  },
  
  handleClick: function() {
    const action = this.data.action;
    console.log(`[UI BUTTON] ${action} clicked`);
    
    // キーボードが表示されている場合は閉じる
    if (window.uiState.keyboardVisible) {
      window.hideKeyboard();
    }
    
    // アクションに応じた処理
    if (action === 'connect') {
      console.log('[UI] Connect button clicked');
      window.uiState.connected = true;
      // TODO: 実際の接続処理
    } else if (action === 'disconnect') {
      console.log('[UI] Disconnect button clicked');
      window.uiState.connected = false;
      // TODO: 実際の切断処理
    } else if (action === 'roomUp') {
      this.changeRoom(1);
    } else if (action === 'roomDown') {
      this.changeRoom(-1);
    }
  },
  
  changeRoom: function(delta) {
    // Room番号を変更（1-9の範囲）
    let newRoom = window.uiState.roomNumber + delta;
    
    // 範囲チェック
    if (newRoom < 1) newRoom = 9;
    if (newRoom > 9) newRoom = 1;
    
    window.uiState.roomNumber = newRoom;
    
    // 表示を更新
    const textEl = document.getElementById('roomNumberText');
    if (textEl) {
      textEl.setAttribute('value', newRoom.toString());
    }
    
    console.log('[UI] Room number changed to:', newRoom);
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
      const newX = this.isOn ? 0.36 : 0.14;
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
  
  if (currentField === 'pass') {
    currentValue = window.uiState.passValue;
    textElementId = 'passInputText';
  } else if (currentField === 'id') {
    currentValue = window.uiState.idValue;
    textElementId = 'idInputText';
  } else if (currentField === 'secret') {
    currentValue = window.uiState.secretValue;
    textElementId = 'secretInputText';
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
  if (currentField === 'pass') {
    window.uiState.passValue = currentValue;
  } else if (currentField === 'id') {
    window.uiState.idValue = currentValue;
  } else if (currentField === 'secret') {
    window.uiState.secretValue = currentValue;
  }
  
  // 表示を更新
  const textEl = document.getElementById(textElementId);
  if (textEl) {
    textEl.setAttribute('value', currentValue);
  }
  
  console.log('[KEYBOARD] Current input:', currentField, currentValue);
};

/**
 * グローバル関数: 表示情報を更新
 */
window.updateDisplayInfo = function(userid, resolution, fps) {
  // 状態を更新
  if (userid !== undefined) {
    window.uiState.userid = userid;
    const el = document.getElementById('useridText');
    if (el) el.setAttribute('value', userid);
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
  
  console.log('[UI] Display info updated:', window.uiState.userid, window.uiState.resolution, window.uiState.fps);
};

// グローバルに公開
window.uiState = window.uiState;
window.showKeyboard = window.showKeyboard;
window.hideKeyboard = window.hideKeyboard;
window.handleKeyPress = window.handleKeyPress;
window.updateDisplayInfo = window.updateDisplayInfo;

console.log('[UI] UI components and functions loaded');
