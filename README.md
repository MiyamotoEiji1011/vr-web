# VR Video Streaming with SkyWay

WebXR対応のVRビデオストリーミングアプリケーション  
UIとSkyWayシステムを完全統合

## ファイル構成

```
├── vr.html         # メインHTMLファイル
├── skyway.js       # SkyWay接続・切断機能
├── ui.js           # UI関連のコンポーネント
├── a_frame.js      # コントローラー関連のコンポーネント
└── app.js          # アプリケーション統合・DebugMode制御
```

## 実装した機能

### ✅ 左パネル UI

#### Pass入力フィールド
- 現状何も紐づけていない（将来の拡張用）

#### Room番号選択
- **機能**: SkyWayの接続ルーム名を選択
- **範囲**: 1-9
- **ルーム名**: Room番号が1なら"room1"、2なら"room2"...
- **UI**: ↑↓ボタンで番号を切り替え

**例:**
```
Room番号: 1 → 接続ルーム名: "room1"
Room番号: 2 → 接続ルーム名: "room2"
Room番号: 9 → 接続ルーム名: "room9"
```

#### DebugMode トグル
- **True**: 操作モードでHUDテキスト（HUD、コントローラー情報、モード表示）を表示
- **False**: 操作モードでHUDテキストを非表示

#### Connect / Disconnect ボタン
- **Connect**: SkyWayルームに接続
  - UIに入力されたID、SECRETを使用
  - 選択されたRoom番号のルームに接続
  - 接続成功時、USERID/解像度/FPSを更新
- **Disconnect**: SkyWayルームから切断
  - すべての情報を"none"に戻す

### ✅ 正面パネル UI

#### ID / SECRET 入力フィールド
- **デフォルト値**: SkyWayの認証情報を設定
  - ID: `441577ac-312a-4ffb-aad5-e540d3876971`
  - SECRET: `Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=`
- **変更可能**: キーボードで編集して別のSkyWayプロジェクトに接続可能
- **使用タイミング**: Connectボタンクリック時にUIの値を使用

#### USERID 表示
- **未接続時**: "none"
- **接続時**: SkyWayから取得したユーザーIDを表示
- **切断時**: "none"に戻す

#### 解像度・FPS 表示
- **未接続時**: "none"
- **接続時**: カメラストリームの設定値を表示
  - 解像度: 例 "1920x1080"
  - FPS: 例 "30"
- **切断時**: "none"に戻す

## 技術詳細

### SkyWay接続フロー

```
1. Connectボタンをクリック
   ↓
2. UIから情報を取得
   - roomNumber: window.uiState.roomNumber (1-9)
   - appId: window.uiState.idValue
   - secret: window.uiState.secretValue
   ↓
3. SkyWayトークン生成
   - createToken(appId, secret)
   ↓
4. SkyWayコンテキスト作成
   - SkyWayContext.Create(token)
   ↓
5. ルーム検索/作成
   - SkyWayRoom.FindOrCreate(context, { name: `room${roomNumber}` })
   ↓
6. ルームに参加
   - room.join()
   - me.id でユーザーIDを取得
   ↓
7. カメラストリーム作成
   - SkyWayStreamFactory.createCameraVideoStream()
   - track.getSettings()で解像度/FPSを取得
   ↓
8. publish
   - me.publish(localVideoStream)
   ↓
9. UIを更新
   - userid, resolution, fpsを表示
   - VRスクリーンに映像を表示
```

### SkyWay切断フロー

```
1. Disconnectボタンをクリック
   ↓
2. ルームから退出
   - me.leave()
   ↓
3. ルームを破棄
   - room.dispose()
   ↓
4. VRスクリーンから映像を削除
   - remoteVideo.pause()
   - screen.material.color = '#111'
   ↓
5. 状態をリセット
   - connected = false
   - userId = 'none'
   - resolution = 'none'
   - fps = 'none'
   ↓
6. UIを更新
   - すべての表示を"none"に戻す
```

### DebugMode制御フロー

```
1. DebugModeトグルをクリック
   ↓
2. isOnを反転
   ↓
3. window.uiState.debugMode を更新
   ↓
4. window.appUpdateHudVisibility()を呼び出し
   ↓
5. 操作モード&&DebugMode==Trueの場合
   - hudText.visible = true
   - controllerInfo.visible = true
   - modeText.visible = true
   ↓
6. 操作モード&&DebugMode==Falseの場合
   - hudText.visible = false
   - controllerInfo.visible = false
   - modeText.visible = false
```

## 使い方

### 基本的な接続フロー

1. **VRモードに入る**
   - 設定モードのパネルが表示される

2. **Room番号を選択**
   - ↑↓ボタンで1-9の番号を選択

3. **（オプション）ID/SECRETを変更**
   - デフォルトのままでOK
   - 別のSkyWayプロジェクトに接続する場合は変更

4. **Connectボタンをクリック**
   - SkyWayルームに接続
   - USERID、解像度、FPSが表示される

5. **操作モードに切り替え**
   - 左コントローラーのXボタンを押す
   - VRスクリーンに映像が表示される

6. **（オプション）DebugModeを切り替え**
   - 設定モードに戻る（Xボタン）
   - DebugModeトグルをクリック
   - 操作モードに切り替えるとHUDの表示/非表示が変わる

7. **切断する**
   - 設定モードに戻る（Xボタン）
   - Disconnectボタンをクリック

### Room番号の使い方

**シナリオ1: 同じルームで通信**
```
デバイスA: Room番号 1 → "room1"に接続
デバイスB: Room番号 1 → "room1"に接続
→ 同じルームで映像を共有
```

**シナリオ2: 別々のルームで通信**
```
デバイスA: Room番号 1 → "room1"に接続
デバイスB: Room番号 2 → "room2"に接続
→ 別々のルームで独立した通信
```

### DebugModeの使い方

**DebugMode ON:**
```
操作モードで:
- HUD（解像度、FPS、回転情報）が表示される
- コントローラー情報が表示される
- モード表示が表示される
```

**DebugMode OFF:**
```
操作モードで:
- すべてのテキストが非表示
- 映像のみが表示される
- 没入感が向上
```

## グローバル状態

### window.uiState

```javascript
window.uiState = {
  roomNumber: 1,           // 接続するルーム番号（1-9）
  debugMode: false,        // DebugMode状態
  connected: false,        // 接続状態
  
  idValue: '441577ac...',  // SkyWay AppId
  secretValue: 'Bk9LR...',  // SkyWay Secret
  
  userid: 'none',          // 接続時のユーザーID
  resolution: 'none',      // 映像の解像度
  fps: 'none'              // 映像のFPS
};
```

### window.skywayState

```javascript
window.skywayState = {
  context: null,           // SkyWayContext
  room: null,              // SkyWayRoom
  me: null,                // Member
  localVideoStream: null,  // ローカル映像ストリーム
  connected: false,        // 接続状態
  
  defaultAppId: '441577ac...',
  defaultSecret: 'Bk9LR...',
  currentAppId: '441577ac...',
  currentSecret: 'Bk9LR...',
  
  userId: 'none',
  resolution: 'none',
  fps: 'none'
};
```

## グローバル関数

### connectSkyWay(roomNumber, appId, secret)

SkyWayルームに接続

```javascript
const result = await window.connectSkyWay(1, 'app-id', 'secret-key');

if (result.success) {
  console.log('接続成功:', result.userId);
} else {
  console.error('接続失敗:', result.error);
}
```

### disconnectSkyWay()

SkyWayルームから切断

```javascript
await window.disconnectSkyWay();
console.log('切断完了');
```

### updateDisplayInfo(userid, resolution, fps)

表示情報を更新

```javascript
window.updateDisplayInfo('user123', '1920x1080', '30');
```

### appUpdateHudVisibility()

DebugModeに応じてHUD表示を更新

```javascript
window.appUpdateHudVisibility();
```

## デバッグ方法

### 接続状態の確認

```javascript
// UI状態
console.log('Connected:', window.uiState.connected);
console.log('Room:', window.uiState.roomNumber);
console.log('UserID:', window.uiState.userid);

// SkyWay状態
console.log('SkyWay Connected:', window.skywayState.connected);
console.log('SkyWay UserID:', window.skywayState.userId);
console.log('SkyWay Room:', window.skywayState.room);
```

### 手動接続テスト

```javascript
// 手動でSkyWayに接続
const result = await window.connectSkyWay(
  1,  // room1
  '441577ac-312a-4ffb-aad5-e540d3876971',
  'Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE='
);

console.log(result);
```

### DebugModeテスト

```javascript
// DebugModeを切り替え
window.uiState.debugMode = true;
window.appUpdateHudVisibility();

// 確認
const hudText = document.getElementById('hudText');
console.log('HUD visible:', hudText.getAttribute('visible'));
```

## コンソールログ

### 接続時

```
[SKYWAY] Connecting...
[SKYWAY] Room: 1
[SKYWAY] AppId: 441577ac-312a-4ffb-aad5-e540d3876971
[SKYWAY] Context created
[SKYWAY] Room found/created: room1
[SKYWAY] Joined room, my ID: abc123xyz
[SKYWAY] Camera stream created
[SKYWAY] Video settings: {width: 1920, height: 1080, frameRate: 30}
[SKYWAY] Video stream published
[SKYWAY] Video attached to screen
[SKYWAY] Subscription setup complete
[UI] Connected successfully
```

### 切断時

```
[SKYWAY] Disconnecting...
[SKYWAY] Left room
[SKYWAY] Room disposed
[SKYWAY] Video removed from screen
[SKYWAY] Disconnected
```

### DebugMode切り替え時

```
[UI TOGGLE] Debug mode: ON
[DEBUG MODE] HUD visible

[UI TOGGLE] Debug mode: OFF
[DEBUG MODE] HUD hidden
```

## トラブルシューティング

### 接続できない

1. ✅ ID/SECRETが正しいか確認
2. ✅ Room番号が1-9の範囲内か確認
3. ✅ コンソールでエラーメッセージを確認
4. ✅ SkyWayダッシュボードでプロジェクトが有効か確認

### 映像が表示されない

1. ✅ カメラの権限が許可されているか確認
2. ✅ 操作モードに切り替えているか確認
3. ✅ コンソールで`[SKYWAY] Video attached to screen`ログを確認

### DebugModeが動作しない

1. ✅ 操作モードに切り替えているか確認（設定モードでは効果なし）
2. ✅ トグルがONになっているか確認
3. ✅ コンソールで`[DEBUG MODE]`ログを確認

### USERIDが"none"のまま

1. ✅ 接続が成功しているか確認
2. ✅ コンソールで`[SKYWAY] Joined room, my ID:`ログを確認
3. ✅ `window.uiState.userid`の値を確認

## 参考情報

- [SkyWay公式ドキュメント](https://skyway.ntt.com/ja/docs/)
- [SkyWay SDK (Room API)](https://github.com/skyway/js-sdk)
- [A-Frame公式ドキュメント](https://aframe.io/docs/)

## ライセンス

このプロジェクトは教育目的のサンプルコードです。
