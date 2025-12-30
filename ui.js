/**
 * ui.js
 * UI関連のA-Frameコンポーネントとロジック
 * 仮想キーボード、ボタン、トグル、入力フィールドなど
 */

/* global AFRAME */

// UI状態管理
window.uiState = {
  selectedRoom: 'room1',
  debugMode: false,
  connected: false,
  keyboardVisible: false,
  inputValue: ''
};

/**
 * A-Frameコンポーネント: ui-input
 * 入力フィールド機能
 */
AFRAME.registerComponent('ui-input', {
  init: function() {
    this.originalColor = this.el.getAttribute('color');
    this.hoverColor = '#E3F2FD'; // ホバー時の色
    this.isHovered = false;
    
    // レイキャストのホバーイベント
    this.el.addEventListener('raycaster-intersected', () => {
      if (!this.isHovered) {
        this.isHovered = true;
        this.el.setAttribute('color', this.hoverColor);
        console.log('[UI INPUT] Hover:', this.el.id);
      }
    });
    
    this.el.addEventListener('raycaster-intersected-cleared', () => {
      if (this.isHovered) {
        this.isHovered = false;
        this.el.setAttribute('color', this.originalColor);
        console.log('[UI INPUT] Hover cleared:', this.el.id);
      }
    });
    
    // クリックイベント
    this.el.addEventListener('click', () => {
      this.handleClick();
    });
    
    console.log('[UI INPUT] Initialized:', this.el.id);
  },
  
  handleClick: function() {
    const id = this.el.id;
    console.log(`[UI INPUT] ${id} clicked`);
    
    // キーボードを表示し、raycasterをキーのみに制限
    if (window.showKeyboard) {
      window.showKeyboard();
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
    this.hoverColor = '#777777'; // ホバー時の色
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
 * グローバル関数: キーボード表示
 * Raycasterのターゲットをキーのみに制限
 */
window.showKeyboard = function() {
  const keyboard = document.getElementById('virtualKeyboard');
  const rightController = document.getElementById('rightOculus');
  
  if (keyboard) {
    keyboard.setAttribute('visible', true);
    window.uiState.keyboardVisible = true;
    console.log('[KEYBOARD] Keyboard shown');
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
  const inputText = document.getElementById('passInputText');
  
  if (key === 'Backspace') {
    // 最後の文字を削除
    if (window.uiState.inputValue.length > 0) {
      window.uiState.inputValue = window.uiState.inputValue.slice(0, -1);
    }
  } else if (key === 'Enter') {
    // 入力確定、キーボードを閉じる
    console.log('[KEYBOARD] Input confirmed:', window.uiState.inputValue);
    window.hideKeyboard();
    return;
  } else if (key === 'Space') {
    // スペース追加
    window.uiState.inputValue += ' ';
  } else {
    // 文字追加
    window.uiState.inputValue += key;
  }
  
  // 表示を更新
  if (inputText) {
    inputText.setAttribute('value', window.uiState.inputValue);
  }
  
  console.log('[KEYBOARD] Current input:', window.uiState.inputValue);
};

// グローバルに公開
window.uiState = window.uiState;
window.showKeyboard = window.showKeyboard;
window.hideKeyboard = window.hideKeyboard;
window.handleKeyPress = window.handleKeyPress;

console.log('[UI] UI components and functions loaded');
