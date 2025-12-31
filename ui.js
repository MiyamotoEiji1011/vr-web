/**
 * ui.js
 * UI関連のA-Frameコンポーネントとロジック
 * 仮想キーボード、ボタン、トグル、入力フィールド、ログ表示
 */

/* global AFRAME */

// ログ管理
window.uiLogs = [];
const MAX_LOG_LINES = 15;

/**
 * ログを追加
 */
window.addLog = function(message) {
  const timestamp = new Date().toLocaleTimeString('ja-JP');
  const logEntry = `[${timestamp}] ${message}`;
  
  window.uiLogs.push(logEntry);
  
  // 最大行数を超えたら古いログを削除
  if (window.uiLogs.length > MAX_LOG_LINES) {
    window.uiLogs.shift();
  }
  
  // ログテキストを更新
  updateLogDisplay();
};

/**
 * ログ表示を更新
 */
function updateLogDisplay() {
  const logText = document.getElementById('logText');
  if (logText) {
    const displayText = 'SYSTEM LOG\n\n' + window.uiLogs.join('\n');
    logText.setAttribute('value', displayText);
  }
}

/**
 * ログをクリア
 */
window.clearLogs = function() {
  window.uiLogs = [];
  updateLogDisplay();
};

// UI状態管理
window.uiState = {
  roomNumber: 1,  // 1-9
  debugMode: false,
  connected: false,
  keyboardVisible: false,
  currentInputField: null,  // 現在編集中のフィールド
  
  // 入力値
  passValue: '',
  idValue: '441577ac-312a-4ffb-aad5-e540d3876971',      // デフォルトAppId
  secretValue: 'Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=',  // デフォルトSecret
  
  // 表示情報
  userid: 'none',
  resolution: 'none',
  fps: 'none'
};

/**
 * UIの初期化
 * デフォルト値をUIに反映
 */
function initializeUI() {
  // ID/SECRETのデフォルト値を表示
  const idInputText = document.getElementById('idInputText');
  const secretInputText = document.getElementById('secretInputText');
  
  if (idInputText) {
    idInputText.setAttribute('value', window.uiState.idValue);
  }
  if (secretInputText) {
    secretInputText.setAttribute('value', window.uiState.secretValue);
  }
  
  window.addLog('UI initialized');
  console.log('[UI] Initialized with default values');
}

// DOMロード後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}

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
        
        // toggleConnectionの場合、接続状態に応じてホバー色を変更
        let currentHoverColor = this.hoverColor;
        if (action === 'toggleConnection') {
          if (window.uiState && window.uiState.connected) {
            // 接続中: 赤系のホバー色
            currentHoverColor = '#EC7063';
          } else {
            // 未接続: 緑系のホバー色
            currentHoverColor = '#2ECC71';
          }
        }
        
        this.el.setAttribute('color', currentHoverColor);
        console.log('[UI BUTTON] Hover:', this.data.action);
      }
    });
    
    this.el.addEventListener('raycaster-intersected-cleared', () => {
      if (this.isHovered) {
        this.isHovered = false;
        
        // toggleConnectionの場合、接続状態に応じて元の色を取得
        let originalColor = this.originalColor;
        if (action === 'toggleConnection') {
          const button = document.getElementById('connectionButton');
          if (button) {
            originalColor = button.getAttribute('color');
          }
        }
        
        this.el.setAttribute('color', originalColor);
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
    if (action === 'toggleConnection') {
      this.handleToggleConnection();
    } else if (action === 'connect') {
      this.handleConnect();
    } else if (action === 'disconnect') {
      this.handleDisconnect();
    } else if (action === 'roomUp') {
      this.changeRoom(1);
    } else if (action === 'roomDown') {
      this.changeRoom(-1);
    }
  },
  
  /**
   * 接続/切断を切り替え
   */
  handleToggleConnection: async function() {
    if (window.uiState.connected) {
      // 接続中の場合は切断
      await this.handleDisconnect();
    } else {
      // 未接続の場合は接続
      await this.handleConnect();
    }
  },
  
  /**
   * SkyWay接続処理
   */
  handleConnect: async function() {
    console.log('[UI] Connect button clicked');
    window.addLog('Connecting...');
    
    // すでに接続中の場合は何もしない
    if (window.uiState.connected) {
      console.log('[UI] Already connected');
      window.addLog('Already connected');
      return;
    }
    
    // 接続パラメータを取得
    const roomNumber = window.uiState.roomNumber;
    const appId = window.uiState.idValue;
    const secret = window.uiState.secretValue;
    
    console.log('[UI] Connecting with params:', { roomNumber, appId });
    window.addLog(`Room: room${roomNumber}`);
    
    // SkyWayに接続
    if (window.connectSkyWay) {
      const result = await window.connectSkyWay(roomNumber, appId, secret);
      
      if (result.success) {
        console.log('[UI] Connected successfully');
        window.addLog('Connected!');
        window.addLog(`UserID: ${result.userId.substring(0, 8)}...`);
        
        window.uiState.connected = true;
        window.uiState.userid = result.userId;
        window.uiState.resolution = result.resolution;
        window.uiState.fps = result.fps;
        
        // ボタンを更新
        updateConnectionButton(true);
      } else {
        console.error('[UI] Connection failed:', result.error);
        window.addLog('ERROR: ' + result.error);
        alert('SkyWay接続に失敗しました: ' + result.error);
      }
    } else {
      console.error('[UI] connectSkyWay function not available');
      window.addLog('ERROR: connectSkyWay not available');
      alert('SkyWay接続機能が利用できません');
    }
  },
  
  /**
   * SkyWay切断処理
   */
  handleDisconnect: async function() {
    console.log('[UI] Disconnect button clicked');
    window.addLog('Disconnecting...');
    
    // 接続していない場合は何もしない
    if (!window.uiState.connected) {
      console.log('[UI] Not connected');
      window.addLog('Not connected');
      return;
    }
    
    // SkyWayから切断
    if (window.disconnectSkyWay) {
      await window.disconnectSkyWay();
      console.log('[UI] Disconnected successfully');
      window.addLog('Disconnected');
      
      window.uiState.connected = false;
      window.uiState.userid = 'none';
      window.uiState.resolution = 'none';
      window.uiState.fps = 'none';
      
      // ボタンを更新
      updateConnectionButton(false);
    } else {
      console.error('[UI] disconnectSkyWay function not available');
      window.addLog('ERROR: disconnectSkyWay not available');
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
    
    window.addLog(`Room changed to: ${newRoom}`);
    console.log('[UI] Room number changed to:', newRoom);
  }
});

/**
 * 接続ボタンの表示を更新
 */
function updateConnectionButton(connected) {
  const button = document.getElementById('connectionButton');
  const text = document.getElementById('connectionButtonText');
  
  if (connected) {
    // 接続中: 赤色の"Disconnect"
    if (button) button.setAttribute('color', '#E74C3C');
    if (text) text.setAttribute('value', 'Disconnect');
  } else {
    // 未接続: 緑色の"Connect"
    if (button) button.setAttribute('color', '#27AE60');
    if (text) text.setAttribute('value', 'Connect');
  }
}

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
    
    // HUD表示を更新
    if (window.appUpdateHudVisibility) {
      window.appUpdateHudVisibility();
    }
    
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
  }
  
  if (resolution !== undefined) {
    window.uiState.resolution = resolution;
  }
  
  if (fps !== undefined) {
    window.uiState.fps = fps;
  }
  
  // 統合テキストを更新
  const displayInfoText = document.getElementById('displayInfoText');
  if (displayInfoText) {
    const text = `USERID: ${window.uiState.userid}\nResolution: ${window.uiState.resolution}\nFPS: ${window.uiState.fps}`;
    displayInfoText.setAttribute('value', text);
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
