/**
 * skyway.js
 * SkyWay接続・切断機能（VRはSubscribeのみ）
 */

/* global skyway_room */

// SkyWay SDKの取得
const {
  nowInSec,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  uuidV4,
} = skyway_room;

// SkyWay接続状態
window.skywayState = {
  context: null,
  room: null,
  me: null,
  connected: false,
  
  // デフォルトの認証情報
  defaultAppId: '441577ac-312a-4ffb-aad5-e540d3876971',
  defaultSecret: 'Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=',
  
  // 実際に使用する認証情報（UIから更新される）
  currentAppId: '441577ac-312a-4ffb-aad5-e540d3876971',
  currentSecret: 'Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=',
  
  // 接続情報
  userId: 'none',
  
  // subscription管理
  subscriptions: new Set()
};

/**
 * SkyWayトークンを生成
 */
function createToken(appId, secret) {
  const token = new SkyWayAuthToken({
    jti: uuidV4(),
    iat: nowInSec(),
    exp: nowInSec() + 60 * 60 * 24,
    version: 3,
    scope: {
      appId: appId,
      rooms: [
        {
          name: "*",
          methods: ["create", "close", "updateMetadata"],
          member: {
            name: "*",
            methods: ["publish", "subscribe", "updateMetadata"],
          },
        },
      ],
    },
  }).encode(secret);
  
  return token;
}

/**
 * SkyWayに接続（VRはSubscribeのみ）
 */
window.connectSkyWay = async function(roomNumber, appId, secret) {
  try {
    console.log('[SKYWAY] Connecting...');
    window.addLog('SkyWay connecting...');
    
    // UIの認証情報を保存
    window.skywayState.currentAppId = appId;
    window.skywayState.currentSecret = secret;
    
    // トークン生成
    const token = createToken(appId, secret);
    
    // コンテキスト作成
    window.skywayState.context = await SkyWayContext.Create(token);
    console.log('[SKYWAY] Context created');
    window.addLog('Context created');
    
    // ルーム名を生成（例: room1, room2, ...）
    const roomName = `room${roomNumber}`;
    
    // ルームを検索または作成（p2pタイプ）
    window.skywayState.room = await SkyWayRoom.FindOrCreate(window.skywayState.context, {
      type: 'p2p',
      name: roomName,
    });
    console.log('[SKYWAY] Room found/created:', roomName);
    window.addLog(`Room: ${roomName}`);
    
    // ルームに参加
    window.skywayState.me = await window.skywayState.room.join();
    console.log('[SKYWAY] Joined room, my ID:', window.skywayState.me.id);
    window.addLog(`UserID: ${window.skywayState.me.id.substring(0, 8)}...`);
    
    // 接続状態を更新
    window.skywayState.connected = true;
    window.skywayState.userId = window.skywayState.me.id;
    
    // VRはpublishしない（subscribeのみ）
    console.log('[SKYWAY] VR mode: Subscribe only (no publish)');
    window.addLog('VR mode: Subscribe only');
    
    // 既存のpublicationをsubscribe
    setupSubscription();
    
    // UIを更新
    updateUIAfterConnect();
    
    return {
      success: true,
      userId: window.skywayState.userId
    };
    
  } catch (error) {
    console.error('[SKYWAY] Connection failed:', error);
    window.addLog('ERROR: ' + error.message);
    
    // エラー時はクリーンアップ
    await disconnectSkyWay();
    
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * SkyWayから切断
 */
window.disconnectSkyWay = async function() {
  try {
    console.log('[SKYWAY] Disconnecting...');
    window.addLog('Disconnecting...');
    
    // ルームから退出
    if (window.skywayState.me) {
      await window.skywayState.me.leave();
      console.log('[SKYWAY] Left room');
    }
    
    // ルームを破棄
    if (window.skywayState.room) {
      await window.skywayState.room.dispose();
      console.log('[SKYWAY] Room disposed');
    }
    
    // スクリーンから映像を削除
    removeVideoFromScreen();
    
  } catch (error) {
    console.error('[SKYWAY] Disconnect error:', error);
    window.addLog('Disconnect error: ' + error.message);
  } finally {
    // 状態をリセット
    window.skywayState.context = null;
    window.skywayState.room = null;
    window.skywayState.me = null;
    window.skywayState.connected = false;
    window.skywayState.userId = 'none';
    window.skywayState.subscriptions.clear();
    
    console.log('[SKYWAY] Disconnected');
    window.addLog('Disconnected');
    
    // UIを更新
    updateUIAfterDisconnect();
  }
};

/**
 * VRのスクリーンに映像を表示
 */
function attachVideoToScreen(videoStream) {
  const screen = document.getElementById('screen');
  const remoteVideo = document.getElementById('remoteVideo');
  
  if (!screen || !remoteVideo || !videoStream) {
    console.error('[SKYWAY] Missing elements:', { screen: !!screen, remoteVideo: !!remoteVideo, videoStream: !!videoStream });
    return;
  }
  
  try {
    // ビデオ要素に接続
    videoStream.attach(remoteVideo);
    
    // 再生を試みる
    remoteVideo.play().then(() => {
      console.log('[SKYWAY] Video playback started');
      window.addLog('Video playing');
    }).catch((error) => {
      console.warn('[SKYWAY] Video play failed:', error);
    });
    
    // スクリーンにビデオテクスチャを設定（opacity: 1.0で明るく表示）
    screen.setAttribute('material', {
      src: '#remoteVideo',
      opacity: 1.0,
      transparent: false
    });
    
    console.log('[SKYWAY] Video attached to screen');
    window.addLog('Video attached to screen');
  } catch (error) {
    console.error('[SKYWAY] Failed to attach video:', error);
    window.addLog('ERROR: Failed to attach video');
  }
}

/**
 * VRのスクリーンから映像を削除
 */
function removeVideoFromScreen() {
  const screen = document.getElementById('screen');
  const remoteVideo = document.getElementById('remoteVideo');
  
  if (remoteVideo) {
    remoteVideo.pause();
    remoteVideo.removeAttribute('src');
    remoteVideo.load();
  }
  
  if (screen) {
    screen.setAttribute('material', 'color', '#111');
  }
  
  console.log('[SKYWAY] Video removed from screen');
  window.addLog('Video removed');
}

/**
 * リモートストリームの購読設定
 */
function setupSubscription() {
  if (!window.skywayState.room || !window.skywayState.me) return;
  
  const room = window.skywayState.room;
  const me = window.skywayState.me;
  
  console.log('[SKYWAY] Setting up subscriptions...');
  window.addLog('Setting up subscriptions...');
  
  // 既存のpublicationをsubscribe（配列の最後のみ）
  const publications = Array.from(room.publications);
  console.log(`[SKYWAY] Found ${publications.length} existing publications`);
  window.addLog(`Found ${publications.length} publications`);
  
  if (publications.length > 0) {
    // 配列の最後のpublicationのみsubscribe
    const lastPublication = publications[publications.length - 1];
    
    if (lastPublication.publisher.id !== me.id) {
      subscribeToPublication(lastPublication);
    }
  }
  
  // 新しいpublicationを自動購読（最後のもののみ）
  room.onStreamPublished.add((e) => {
    console.log('[SKYWAY] New stream published:', e.publication.id);
    window.addLog('New stream published');
    
    if (e.publication.publisher.id !== me.id) {
      // 既存のsubscriptionをクリア
      window.skywayState.subscriptions.clear();
      
      // 新しいpublicationをsubscribe
      subscribeToPublication(e.publication);
    }
  });
  
  // unpublishイベント
  room.onStreamUnpublished.add((e) => {
    console.log('[SKYWAY] Stream unpublished:', e.publication.id);
    window.addLog('Stream unpublished');
    
    // subscriptionから削除
    window.skywayState.subscriptions.delete(e.publication.id);
    
    // 映像を削除
    removeVideoFromScreen();
  });
  
  console.log('[SKYWAY] Subscription setup complete');
  window.addLog('Subscription setup complete');
}

/**
 * publicationを購読
 */
async function subscribeToPublication(publication) {
  try {
    // ビデオのpublicationのみ処理
    if (publication.contentType !== 'video') {
      console.log('[SKYWAY] Skipping non-video publication:', publication.contentType);
      return;
    }
    
    console.log('[SKYWAY] Subscribing to:', publication.id, publication.contentType);
    window.addLog('Subscribing to video...');
    
    const { stream } = await window.skywayState.me.subscribe(publication.id);
    
    // subscriptionを記録
    window.skywayState.subscriptions.add(publication.id);
    
    // ビデオストリームの場合、スクリーンに表示
    if (stream.track.kind === 'video') {
      console.log('[SKYWAY] Video stream received');
      
      // スクリーンに表示
      attachVideoToScreen(stream);
      
      // UIを更新
      if (window.updateDisplayInfo) {
        window.updateDisplayInfo(window.skywayState.userId);
      }
    }
    
    console.log('[SKYWAY] Subscribed successfully');
    window.addLog('Subscribed successfully');
  } catch (error) {
    console.error('[SKYWAY] Subscribe failed:', error);
    window.addLog('ERROR: Subscribe failed');
  }
}

/**
 * 接続後のUI更新
 */
function updateUIAfterConnect() {
  if (window.updateDisplayInfo) {
    window.updateDisplayInfo(window.skywayState.userId);
  }
  
  if (window.uiState) {
    window.uiState.connected = true;
  }
}

/**
 * 切断後のUI更新
 */
function updateUIAfterDisconnect() {
  if (window.updateDisplayInfo) {
    window.updateDisplayInfo('none');
  }
  
  if (window.uiState) {
    window.uiState.connected = false;
  }
}

// グローバルに公開
window.skywayState = window.skywayState;
window.connectSkyWay = window.connectSkyWay;
window.disconnectSkyWay = window.disconnectSkyWay;

console.log('[SKYWAY] Module loaded (VR Subscribe-only mode)');
window.addLog('SkyWay module loaded');
