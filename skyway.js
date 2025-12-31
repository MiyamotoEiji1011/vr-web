/**
 * skyway.js
 * SkyWay接続・切断機能（VRはSubscribeのみ）
 * VR操作データのDataStream送信機能を含む
 */

/* global skyway_room, THREE */

// SkyWay SDKの取得
const {
  nowInSec,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
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
  subscriptions: new Set(),
  
  // DataStream関連
  dataStream: null,
  dataStreamInterval: null,
  statusSendingActive: false
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
    
    // DataStreamを作成してpublish
    console.log('[SKYWAY] Creating DataStream...');
    window.skywayState.dataStream = await SkyWayStreamFactory.createDataStream();
    await window.skywayState.me.publish(window.skywayState.dataStream);
    console.log('[SKYWAY] DataStream published');
    window.addLog('DataStream published');
    
    // 既存のpublicationをsubscribe
    setupSubscription();
    
    // VRステータス送信を開始
    startStatusSending();
    
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
    
    // VRステータス送信を停止
    stopStatusSending();
    
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
    window.skywayState.dataStream = null;
    window.skywayState.dataStreamInterval = null;
    window.skywayState.statusSendingActive = false;
    
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
    
    // スクリーンにビデオテクスチャを設定
    screen.setAttribute('material', {
      shader: 'flat',
      src: '#remoteVideo',
      opacity: 1.0,
      transparent: false,
      color: '#FFFFFF'  // 白色で映像の色を保持
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
    // materialを初期状態にリセット（srcを削除し、shaderをflatに戻す）
    screen.setAttribute('material', {
      shader: 'flat',
      src: '',
      opacity: 1.0,
      transparent: false
    });
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
  
  // 既存のpublicationからvideo typeのみをフィルタリング
  const allPublications = Array.from(room.publications);
  const videoPublications = allPublications.filter(pub => pub.contentType === 'video');
  
  console.log(`[SKYWAY] Found ${allPublications.length} total publications, ${videoPublications.length} video publications`);
  window.addLog(`Found ${videoPublications.length} video publications`);
  
  if (videoPublications.length > 0) {
    // ビデオpublicationの最後のものをsubscribe
    const lastVideoPublication = videoPublications[videoPublications.length - 1];
    
    if (lastVideoPublication.publisher.id !== me.id) {
      console.log('[SKYWAY] Subscribing to existing video publication:', lastVideoPublication.id);
      subscribeToPublication(lastVideoPublication);
    }
  }
  
  // 新しいpublicationを自動購読（ビデオのみ）
  room.onStreamPublished.add((e) => {
    console.log('[SKYWAY] New stream published:', e.publication.id, e.publication.contentType);
    
    // ビデオ以外は無視
    if (e.publication.contentType !== 'video') {
      console.log('[SKYWAY] Skipping non-video publication');
      return;
    }
    
    window.addLog('New video published');
    
    if (e.publication.publisher.id !== me.id) {
      // 既存のsubscriptionをクリア
      window.skywayState.subscriptions.clear();
      
      // 新しいビデオpublicationをsubscribe
      subscribeToPublication(e.publication);
    }
  });
  
  // unpublishイベント
  room.onStreamUnpublished.add((e) => {
    console.log('[SKYWAY] Stream unpublished:', e.publication.id, e.publication.contentType);
    window.addLog('Stream unpublished');
    
    // ビデオpublicationの場合のみ映像を削除
    if (e.publication.contentType === 'video') {
      // subscriptionから削除
      window.skywayState.subscriptions.delete(e.publication.id);
      
      // 映像を削除
      removeVideoFromScreen();
      window.addLog('Video removed from screen');
    }
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

/**
 * VRステータスを収集
 */
function collectVRStatus() {
  // カメラの回転を取得
  const camera = document.getElementById('camera');
  let cameraX = 0;
  let cameraY = 0;
  
  if (camera && camera.object3D && typeof THREE !== 'undefined') {
    // ラジアンから度に変換
    cameraX = THREE.MathUtils.radToDeg(camera.object3D.rotation.x);
    cameraY = THREE.MathUtils.radToDeg(camera.object3D.rotation.y);
  }
  
  // コントローラーの状態を取得
  const controllers = window.controllerStates || {
    left: {
      trigger: 0, grip: 0, buttonX: 0, buttonY: 0,
      thumbstick: { x: 0, y: 0 }
    },
    right: {
      trigger: 0, grip: 0, buttonA: 0, buttonB: 0,
      thumbstick: { x: 0, y: 0 }
    }
  };
  
  // モード状態を取得（設定モード: 0, 操作モード: 1）
  const currentMode = window.appGetCurrentMode ? window.appGetCurrentMode() : 'settings';
  const active = (currentMode === 'control') ? 1 : 0;
  
  // データ構造を作成
  const status = {
    version: "1.0",
    active: active,
    "X-Camera": parseFloat(cameraX.toFixed(3)),
    "Y-Camera": parseFloat(cameraY.toFixed(3)),
    "R_X-Joystick": parseFloat(controllers.right.thumbstick.x.toFixed(3)),
    "R_Y-Joystick": parseFloat(controllers.right.thumbstick.y.toFixed(3)),
    "R_A-Button": controllers.right.buttonA || 0,
    "R_B-Button": controllers.right.buttonB || 0,
    "R_T-Button": parseFloat((controllers.right.trigger || 0).toFixed(3)),
    "R_G-Button": parseFloat((controllers.right.grip || 0).toFixed(3)),
    "L_X-Joystick": parseFloat(controllers.left.thumbstick.x.toFixed(3)),
    "L_Y-Joystick": parseFloat(controllers.left.thumbstick.y.toFixed(3)),
    "L_X-Button": controllers.left.buttonX || 0,
    "L_Y-Button": controllers.left.buttonY || 0,
    "L_T-Button": parseFloat((controllers.left.trigger || 0).toFixed(3)),
    "L_G-Button": parseFloat((controllers.left.grip || 0).toFixed(3))
  };
  
  return status;
}

/**
 * VRステータスを送信
 */
function sendVRStatus() {
  if (!window.skywayState.connected || !window.skywayState.dataStream) {
    return;
  }
  
  try {
    const status = collectVRStatus();
    const jsonData = JSON.stringify(status);
    window.skywayState.dataStream.write(jsonData);
  } catch (error) {
    console.error('[SKYWAY] Failed to send VR status:', error);
  }
}

/**
 * VRステータス送信を開始
 */
function startStatusSending() {
  if (window.skywayState.statusSendingActive) {
    return;
  }
  
  console.log('[SKYWAY] Starting VR status sending...');
  window.addLog('VR status sending started');
  
  window.skywayState.statusSendingActive = true;
  
  // 100msごとに送信（10Hz）
  window.skywayState.dataStreamInterval = setInterval(() => {
    sendVRStatus();
  }, 100);
}

/**
 * VRステータス送信を停止
 */
function stopStatusSending() {
  if (!window.skywayState.statusSendingActive) {
    return;
  }
  
  console.log('[SKYWAY] Stopping VR status sending...');
  window.addLog('VR status sending stopped');
  
  window.skywayState.statusSendingActive = false;
  
  if (window.skywayState.dataStreamInterval) {
    clearInterval(window.skywayState.dataStreamInterval);
    window.skywayState.dataStreamInterval = null;
  }
}

// グローバルに公開
window.skywayState = window.skywayState;
window.connectSkyWay = window.connectSkyWay;
window.disconnectSkyWay = window.disconnectSkyWay;

console.log('[SKYWAY] Module loaded (DataStream + VR Status sending)');
window.addLog('SkyWay module loaded');
