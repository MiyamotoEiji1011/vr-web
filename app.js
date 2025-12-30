/**
 * app.js
 * アプリケーションのメインエントリーポイント
 * SkyWayとA-Frameの統合、モード管理
 */

/* global SkyWayManager, attachVideoTextureToPlane */

// DOM要素の取得
const elements = {
  remoteVideo: document.getElementById("remoteVideo"),
  screen: document.getElementById("screen")
};

// SkyWayマネージャーのインスタンス
let skyway = null;

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
 * アプリケーションの初期化と起動
 */
async function startApplication() {
  try {
    console.log('[APP START] Application starting...');
    console.log(`[INITIAL MODE] ${appState.currentMode.toUpperCase()}`);
    
    // SkyWayマネージャーの初期化
    skyway = new SkyWayManager();
    
    console.log('[SKYWAY] Initializing SkyWay...');
    await skyway.initialize();
    
    console.log('[SKYWAY] Joining room...');
    await skyway.joinRoom();
    
    console.log('[SKYWAY] Connected to SkyWay room');

    // ビデオ要素の自動再生対策
    elements.remoteVideo.muted = true;
    elements.remoteVideo.play().catch(() => {});

    // Publicationの処理
    skyway.handlePublications(async (publication) => {
      await handleVideoPublication(publication);
    });

  } catch (error) {
    console.error('[APP ERROR] Failed to start application:', error);
    alert('アプリケーションの起動に失敗しました。コンソールを確認してください。');
  }
}

/**
 * ビデオPublicationの処理
 */
async function handleVideoPublication(publication) {
  if (publication.contentType !== "video") return;
  if (elements.remoteVideo.srcObject) return; // 既に1本接続済み

  try {
    await skyway.subscribeVideo(
      publication,
      elements.remoteVideo,
      () => {
        // ビデオがロードされた後にテクスチャをアタッチ
        attachVideoTextureToPlane(elements.remoteVideo, elements.screen);
        elements.remoteVideo.play().catch(() => {});
        console.log('[VIDEO] Video texture attached to plane');
      }
    );
  } catch (error) {
    console.error('[VIDEO ERROR] Failed to subscribe video:', error);
  }
}

/**
 * アプリケーションのクリーンアップ
 */
async function cleanup() {
  console.log('[APP CLEANUP] Cleaning up...');
  
  if (skyway) {
    await skyway.cleanup();
    skyway = null;
  }
  
  // ビデオのクリーンアップ
  if (elements.remoteVideo) {
    elements.remoteVideo.pause();
    elements.remoteVideo.removeAttribute("src");
    elements.remoteVideo.load();
  }
  
  console.log('[APP CLEANUP] Cleanup completed');
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

/**
 * ページアンロード時のクリーンアップ
 */
window.addEventListener('beforeunload', () => {
  cleanup();
});

// アプリケーションの起動
startApplication().catch(console.error);

// グローバルに公開（デバッグ用）
window.app = {
  skyway,
  elements,
  state: appState,
  toggleMode,
  getCurrentMode,
  isSettingsMode,
  isControlMode,
  restart: startApplication,
  cleanup
};

// モード管理関数をグローバルに公開（a_frame.jsから使用）
window.appToggleMode = toggleMode;
window.appGetCurrentMode = getCurrentMode;
