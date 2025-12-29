// DOM要素の取得
const elements = {
  remoteVideo: document.getElementById("remoteVideo"),
  screen: document.getElementById("screen")
};

// SkyWayマネージャーのインスタンス
let skyway = null;

/**
 * アプリケーションの初期化と起動
 */
async function startApplication() {
  try {
    // SkyWayマネージャーの初期化
    skyway = new SkyWayManager();
    
    console.log("Initializing SkyWay...");
    await skyway.initialize();
    
    console.log("Joining room...");
    await skyway.joinRoom();
    
    console.log("Connected to SkyWay room");

    // ビデオ要素の自動再生対策
    elements.remoteVideo.muted = true;
    elements.remoteVideo.play().catch(() => {});

    // Publicationの処理
    skyway.handlePublications(async (publication) => {
      await handleVideoPublication(publication);
    });

  } catch (error) {
    console.error("Failed to start application:", error);
    alert("アプリケーションの起動に失敗しました。コンソールを確認してください。");
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
        console.log("Video texture attached to plane");
      }
    );
  } catch (error) {
    console.error("Failed to subscribe video:", error);
  }
}

/**
 * アプリケーションのクリーンアップ
 */
async function cleanup() {
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
}

/**
 * エラーハンドリング
 */
window.addEventListener('error', (event) => {
  console.error("Application error:", event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("Unhandled promise rejection:", event.reason);
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
  restart: startApplication,
  cleanup
};
