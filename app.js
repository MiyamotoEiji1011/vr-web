/**
 * app.js
 * アプリケーションのメインエントリーポイント
 * モード管理とDebugMode制御
 */

/**
 * アプリケーション状態管理
 */
const appState = {
  currentMode: 'settings', // 初期モードを'settings'に変更
  modes: {
    SETTINGS: 'settings',
    CONTROL: 'control'
  }
};

/**
 * モードを切り替える
 */
function toggleMode() {
  const previousMode = appState.currentMode;
  
  if (appState.currentMode === appState.modes.CONTROL) {
    appState.currentMode = appState.modes.SETTINGS;
  } else {
    appState.currentMode = appState.modes.CONTROL;
  }
  
  console.log(`[MODE TOGGLE] ${previousMode} → ${appState.currentMode}`);
  console.log(`[CURRENT MODE] ${appState.currentMode.toUpperCase()}`);
  
  // DebugModeに応じてHUD表示を更新
  updateHudVisibility();
}

/**
 * 現在のモードを取得
 */
function getCurrentMode() {
  return appState.currentMode;
}

/**
 * モードが設定モードかどうか
 */
function isSettingsMode() {
  return appState.currentMode === appState.modes.SETTINGS;
}

/**
 * モードが操作モードかどうか
 */
function isControlMode() {
  return appState.currentMode === appState.modes.CONTROL;
}

/**
 * DebugModeに応じてHUD表示を制御
 */
function updateHudVisibility() {
  // 操作モードでのみDebugModeの設定を適用
  if (isControlMode()) {
    const debugMode = window.uiState ? window.uiState.debugMode : false;
    
    // HUD要素を取得
    const hudText = document.getElementById('hudText');
    const controllerInfo = document.getElementById('controllerInfo');
    const modeText = document.getElementById('modeText');
    
    // DebugModeに応じて表示/非表示
    if (debugMode) {
      // ON: すべて表示
      if (hudText) hudText.setAttribute('visible', true);
      if (controllerInfo) controllerInfo.setAttribute('visible', true);
      if (modeText) modeText.setAttribute('visible', true);
      console.log('[DEBUG MODE] HUD visible');
    } else {
      // OFF: すべて非表示
      if (hudText) hudText.setAttribute('visible', false);
      if (controllerInfo) controllerInfo.setAttribute('visible', false);
      if (modeText) modeText.setAttribute('visible', false);
      console.log('[DEBUG MODE] HUD hidden');
    }
  }
}

/**
 * アプリケーションの初期化
 */
function initializeApplication() {
  console.log('[APP START] Application starting...');
  console.log(`[INITIAL MODE] ${appState.currentMode.toUpperCase()}`);
  
  // 初期のHUD表示を設定
  updateHudVisibility();
}

/**
 * エラーハンドリング
 */
window.addEventListener('error', (event) => {
  console.error('[WINDOW ERROR] Application error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[PROMISE ERROR] Unhandled promise rejection:', event.reason);
});

// アプリケーションの初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  initializeApplication();
}

// グローバルに公開（デバッグ用）
window.app = {
  state: appState,
  toggleMode,
  getCurrentMode,
  isSettingsMode,
  isControlMode,
  updateHudVisibility
};

// モード管理関数をグローバルに公開（a_frame.jsから使用）
window.appToggleMode = toggleMode;
window.appGetCurrentMode = getCurrentMode;
window.appUpdateHudVisibility = updateHudVisibility;
