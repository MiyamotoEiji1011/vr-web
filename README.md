# VR Video Streaming with SkyWay

WebXR対応のVRビデオストリーミングアプリケーション  
VR側はSubscribeのみ、マウス操作対応、ログ表示機能付き

## ファイル構成

```
├── vr.html         # メインHTMLファイル（マウスカーソル対応）
├── skyway.js       # SkyWay接続・切断機能（VRはSubscribeのみ）
├── ui.js           # UI関連のコンポーネント（ログ表示機能追加）
├── a_frame.js      # コントローラー関連のコンポーネント
└── app.js          # アプリケーション統合・DebugMode制御
```

## 新機能

### ✅ マウス操作対応

**実装:**
```html
<a-scene cursor="rayOrigin: mouse">
```

- PCでマウスクリックでUI操作可能
- VRコントローラーとマウス両方で操作可能

### ✅ SECRETの可視化

- SECRETフィールドの内容が表示される
- デフォルト値: `Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=`
- キーボードで編集可能

### ✅ 右パネル - ログ表示

**表示内容:**
- システムログ（最新15件）
- タイムスタンプ付き
- 接続/切断イベント
- エラーメッセージ
- 緑色のテキスト（#00FF00）

**ログの例:**
```
SYSTEM LOG

[14:23:45] UI initialized
[14:24:10] Connecting...
[14:24:11] Room: room1
[14:24:12] Context created
[14:24:13] UserID: abc123xy...
[14:24:14] Found 1 publications
[14:24:15] Subscribing to video...
[14:24:16] Resolution: 1920x1080
[14:24:17] FPS: 30
[14:24:18] Video attached to screen
```

### ✅ Connect/Disconnectボタンの統合

**未接続時:**
- 緑色（#27AE60）
- テキスト: "Connect"

**接続中:**
- 赤色（#E74C3C）
- テキスト: "Disconnect"

**動作:**
- ボタン1つで接続/切断を切り替え
- 状態に応じて自動的に色とテキストが変わる

### ✅ VR Subscribe-only モード

**仕様:**
- VR側はpublishしない（subscribeのみ）
- カメラストリームは作成しない
- リモートの映像のみを受信して表示

**Subscription動作:**
1. Room入室時に既存のpublicationをチェック
2. 複数のpublicationがある場合、**配列の最後のもののみsubscribe**
3. 新しいpublicationが追加されたら、**既存のsubscriptionをクリア**して新しいものをsubscribe
4. ビデオのpublicationのみ処理（audioは無視）

**対応シナリオ:**
- ✅ VRがroom1に入室後、あとから映像がpublishされる場合
  - `room.onStreamPublished.add()` でイベントを監視
  - 新しいpublicationを自動的にsubscribe
- ✅ Publishが複数いた場合
  - 配列の最後の映像のみを表示
  - `publications[publications.length - 1]`

## 技術実装

### skyway.js の主な変更

```javascript
// VRはpublishしない
console.log('[SKYWAY] VR mode: Subscribe only (no publish)');

// 既存のpublicationから最後のもののみsubscribe
const publications = Array.from(room.publications);
if (publications.length > 0) {
  const lastPublication = publications[publications.length - 1];
  subscribeToPublication(lastPublication);
}

// 新しいpublicationが追加されたら切り替え
room.onStreamPublished.add((e) => {
  // 既存のsubscriptionをクリア
  window.skywayState.subscriptions.clear();
  
  // 新しいpublicationをsubscribe
  subscribeToPublication(e.publication);
});
```

### ui.js の主な変更

**ログ機能:**
```javascript
// ログを追加
window.addLog('Connecting...');

// ログをクリア
window.clearLogs();

// ログ表示を更新
updateLogDisplay();
```

**ボタン切り替え:**
```javascript
// 接続中: 赤色の"Disconnect"
updateConnectionButton(true);

// 未接続: 緑色の"Connect"
updateConnectionButton(false);
```

## 使い方

### PCでの操作

1. **ブラウザでvr.htmlを開く**
2. **マウスでUIをクリック**
   - Room番号を選択
   - （オプション）ID/SECRETを変更
3. **Connectボタンをクリック**
   - ボタンが赤色の"Disconnect"に変わる
   - 右パネルにログが表示される
4. **右パネルでログを確認**
   - 接続状態
   - エラーメッセージ
   - 映像情報

### VRでの操作

1. **VRモードに入る**
2. **設定モードでパラメータを設定**
   - Room番号を選択
   - （オプション）ID/SECRETを変更
3. **Connectボタンをクリック**
   - 右パネルでログを確認
4. **操作モードに切り替え（Xボタン）**
   - VRスクリーンに映像が表示される
5. **DebugModeをONにする**
   - HUD情報が表示される

## 接続フロー（VR Subscribe-only）

```
1. Connectボタンクリック
   ↓
2. SkyWayトークン生成
   ↓
3. コンテキスト作成
   ↓
4. ルーム参加（p2pタイプ）
   ↓
5. 既存のpublicationをチェック
   ├─ あり → 配列の最後をsubscribe
   └─ なし → 待機
   ↓
6. 新しいpublicationを監視
   ↓
7. ビデオストリームを受信
   ↓
8. VRスクリーンに表示
   ↓
9. 映像情報を更新（解像度、FPS）
```

## ログメッセージ一覧

### 接続時

```
UI initialized
Connecting...
Room: room1
SkyWay connecting...
Context created
Room: room1
UserID: abc123xy...
VR mode: Subscribe only
Setting up subscriptions...
Found 1 publications
Subscribing to video...
Video stream received
Resolution: 1920x1080
FPS: 30
Video attached to screen
Subscribed successfully
```

### 切断時

```
Disconnecting...
Left room
Room disposed
Video removed
Disconnected
```

### エラー時

```
ERROR: Connection failed
ERROR: Subscribe failed
ERROR: Failed to attach video
```

## デバッグ方法

### ログの確認

**VR内:**
- 右パネルを見る
- リアルタイムでログが更新される

**PC:**
- ブラウザの開発者ツール（F12）
- Consoleタブでログを確認

### 手動でログを追加

```javascript
window.addLog('Custom log message');
```

### ログをクリア

```javascript
window.clearLogs();
```

### 接続状態の確認

```javascript
console.log('Connected:', window.uiState.connected);
console.log('UserID:', window.skywayState.userId);
console.log('Subscriptions:', window.skywayState.subscriptions);
```

### 映像表示の確認

```javascript
const remoteVideo = document.getElementById('remoteVideo');
console.log('Video src:', remoteVideo.src);
console.log('Video ready state:', remoteVideo.readyState);
console.log('Video playing:', !remoteVideo.paused);
```

## トラブルシューティング

### 映像が表示されない

1. ✅ 右パネルのログを確認
   - "Subscribing to video..." が表示されているか
   - "Video attached to screen" が表示されているか
2. ✅ Publish側が映像を送信しているか確認
3. ✅ Room番号が一致しているか確認
4. ✅ ビデオ要素の状態を確認
   ```javascript
   const video = document.getElementById('remoteVideo');
   console.log(video.readyState); // 4なら再生可能
   ```

### 複数のPublishがある場合

- VRは自動的に**配列の最後の映像のみ表示**
- 新しいpublicationが追加されたら自動的に切り替わる
- ログで確認:
  ```
  Found 3 publications
  Subscribing to video... (最後のもののみ)
  ```

### ボタンが切り替わらない

1. ✅ `updateConnectionButton()`が呼ばれているか確認
2. ✅ `window.uiState.connected`の値を確認
3. ✅ ボタンのIDが正しいか確認
   - `connectionButton`
   - `connectionButtonText`

### ログが表示されない

1. ✅ 右パネルの`logText`要素が存在するか確認
2. ✅ `window.addLog()`が呼ばれているか確認
3. ✅ `window.uiLogs`配列を確認
   ```javascript
   console.log(window.uiLogs);
   ```

## グローバル関数

### ログ関連

```javascript
// ログを追加
window.addLog(message);

// ログをクリア
window.clearLogs();
```

### SkyWay関連

```javascript
// 接続
const result = await window.connectSkyWay(roomNumber, appId, secret);

// 切断
await window.disconnectSkyWay();
```

### UI関連

```javascript
// 表示情報を更新
window.updateDisplayInfo(userid, resolution, fps);

// HUD表示を更新
window.appUpdateHudVisibility();
```

## 参考情報

- [SkyWay公式ドキュメント](https://skyway.ntt.com/ja/docs/)
- [A-Frame公式ドキュメント](https://aframe.io/docs/)
- [A-Frame GUI](https://rdub80.github.io/aframe-gui/)

## ライセンス

このプロジェクトは教育目的のサンプルコードです。
