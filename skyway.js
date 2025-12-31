/**
 * skyway.js
 * SkyWay接続・切断機能
 */

/* global skyway_room */

// SkyWay SDKの取得
const {
  nowInSec,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
} = skyway_room;

// SkyWay接続状態
window.skywayState = {
  context: null,
  room: null,
  me: null,
  localVideoStream: null,
  connected: false,
  
  // デフォルトの認証情報
  defaultAppId: '441577ac-312a-4ffb-aad5-e540d3876971',
  defaultSecret: 'Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=',
  
  // 実際に使用する認証情報（UIから更新される）
  currentAppId: '441577ac-312a-4ffb-aad5-e540d3876971',
  currentSecret: 'Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=',
  
  // 接続情報
  userId: 'none',
  resolution: 'none',
  fps: 'none'
};

/**
 * UUID (jti) helper
 */
function createJti() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * SkyWayトークンを生成
 */
function createToken(appId, secret) {
  const token = new SkyWayAuthToken({
    jti: createJti(),
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
 * SkyWayに接続
 */
window.connectSkyWay = async function(roomNumber, appId, secret) {
  try {
    console.log('[SKYWAY] Connecting...');
    console.log('[SKYWAY] Room:', roomNumber);
    console.log('[SKYWAY] AppId:', appId);
    
    // UIの認証情報を保存
    window.skywayState.currentAppId = appId;
    window.skywayState.currentSecret = secret;
    
    // トークン生成
    const token = createToken(appId, secret);
    
    // コンテキスト作成
    window.skywayState.context = await SkyWayContext.Create(token);
    console.log('[SKYWAY] Context created');
    
    // ルーム名を生成（例: room1, room2, ...）
    const roomName = `room${roomNumber}`;
    
    // ルームを検索または作成
    window.skywayState.room = await SkyWayRoom.FindOrCreate(window.skywayState.context, {
      name: roomName,
    });
    console.log('[SKYWAY] Room found/created:', roomName);
    
    // ルームに参加
    window.skywayState.me = await window.skywayState.room.join();
    console.log('[SKYWAY] Joined room, my ID:', window.skywayState.me.id);
    
    // 接続状態を更新
    window.skywayState.connected = true;
    window.skywayState.userId = window.skywayState.me.id;
    
    // カメラストリームを作成してpublish
    try {
      window.skywayState.localVideoStream = await SkyWayStreamFactory.createCameraVideoStream();
      console.log('[SKYWAY] Camera stream created');
      
      // 映像情報を取得
      const track = window.skywayState.localVideoStream.track;
      if (track && track.getSettings) {
        const settings = track.getSettings();
        window.skywayState.resolution = `${settings.width}x${settings.height}`;
        window.skywayState.fps = settings.frameRate ? settings.frameRate.toString() : '30';
        console.log('[SKYWAY] Video settings:', settings);
      }
      
      // publish
      await window.skywayState.me.publish(window.skywayState.localVideoStream, { type: "p2p" });
      console.log('[SKYWAY] Video stream published');
      
      // VRのスクリーンに映像を表示
      attachVideoToScreen(window.skywayState.localVideoStream);
      
    } catch (videoError) {
      console.error('[SKYWAY] Camera stream failed:', videoError);
      // カメラが失敗しても接続は継続
      window.skywayState.resolution = 'none';
      window.skywayState.fps = 'none';
    }
    
    // リモートストリームの購読設定
    setupSubscription();
    
    // UIを更新
    updateUIAfterConnect();
    
    return {
      success: true,
      userId: window.skywayState.userId,
      resolution: window.skywayState.resolution,
      fps: window.skywayState.fps
    };
    
  } catch (error) {
    console.error('[SKYWAY] Connection failed:', error);
    
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
  } finally {
    // 状態をリセット
    window.skywayState.context = null;
    window.skywayState.room = null;
    window.skywayState.me = null;
    window.skywayState.localVideoStream = null;
    window.skywayState.connected = false;
    window.skywayState.userId = 'none';
    window.skywayState.resolution = 'none';
    window.skywayState.fps = 'none';
    
    console.log('[SKYWAY] Disconnected');
    
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
  
  if (!screen || !remoteVideo || !videoStream) return;
  
  try {
    // ビデオ要素に接続
    videoStream.attach(remoteVideo);
    
    // スクリーンにビデオテクスチャを設定
    screen.setAttribute('material', 'src', '#remoteVideo');
    
    console.log('[SKYWAY] Video attached to screen');
  } catch (error) {
    console.error('[SKYWAY] Failed to attach video:', error);
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
}

/**
 * リモートストリームの購読設定
 */
function setupSubscription() {
  if (!window.skywayState.room || !window.skywayState.me) return;
  
  const room = window.skywayState.room;
  const me = window.skywayState.me;
  
  // 既存のpublicationを購読
  room.publications.forEach((publication) => {
    if (publication.publisher.id !== me.id) {
      subscribeToPublication(publication);
    }
  });
  
  // 新しいpublicationを自動購読
  room.onStreamPublished.add((e) => {
    if (e.publication.publisher.id !== me.id) {
      subscribeToPublication(e.publication);
    }
  });
  
  // unpublishイベント
  room.onStreamUnpublished.add((e) => {
    console.log('[SKYWAY] Stream unpublished:', e.publication.id);
  });
  
  console.log('[SKYWAY] Subscription setup complete');
}

/**
 * publicationを購読
 */
async function subscribeToPublication(publication) {
  try {
    console.log('[SKYWAY] Subscribing to:', publication.id, publication.contentType);
    
    const { stream } = await window.skywayState.me.subscribe(publication.id);
    
    // ビデオストリームの場合、スクリーンに表示
    if (stream.track.kind === 'video') {
      attachVideoToScreen(stream);
      
      // 映像情報を更新
      const track = stream.track;
      if (track && track.getSettings) {
        const settings = track.getSettings();
        window.skywayState.resolution = `${settings.width}x${settings.height}`;
        window.skywayState.fps = settings.frameRate ? settings.frameRate.toString() : '30';
        
        // UIを更新
        if (window.updateDisplayInfo) {
          window.updateDisplayInfo(
            window.skywayState.userId,
            window.skywayState.resolution,
            window.skywayState.fps
          );
        }
      }
    }
    
    console.log('[SKYWAY] Subscribed successfully');
  } catch (error) {
    console.error('[SKYWAY] Subscribe failed:', error);
  }
}

/**
 * 接続後のUI更新
 */
function updateUIAfterConnect() {
  if (window.updateDisplayInfo) {
    window.updateDisplayInfo(
      window.skywayState.userId,
      window.skywayState.resolution,
      window.skywayState.fps
    );
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
    window.updateDisplayInfo('none', 'none', 'none');
  }
  
  if (window.uiState) {
    window.uiState.connected = false;
  }
}

// グローバルに公開
window.skywayState = window.skywayState;
window.connectSkyWay = window.connectSkyWay;
window.disconnectSkyWay = window.disconnectSkyWay;

console.log('[SKYWAY] Module loaded');
