# VR Video Streaming with SkyWay

WebXR対応のVRビデオストリーミングアプリケーション  
VR側はSubscribeのみ、マウス操作対応、ログ表示機能付き

## 最新の修正内容

### ✅ 解像度・FPS機能の完全削除

**理由:**
SkyWayでは解像度やFPSを正確に取得できないため、これらの機能をすべて削除しました。

**削除した内容:**

1. **UI表示から削除**
   - 正面パネルの「Resolution」「FPS」表示を削除
   - 「USERID」のみの表示に変更

2. **操作モードのHUDから削除**
   - Frame（解像度・FPS）表示を削除
   - HMD回転情報のみ表示

3. **状態管理から削除**
   - `uiState.resolution`
   - `uiState.fps`
   - `skywayState.resolution`
   - `skywayState.fps`
   - `VR_DISPLAY_CONFIG`（a_frame.js）

4. **ログから削除**
   - 解像度取得のログ
   - FPS取得のログ
   - 関連するコンソールログ

5. **関数から削除**
   - `updateDisplayInfo()`のresolution, fpsパラメータ
   - `connectSkyWay()`の返り値からresolution, fps
   - 解像度・FPS取得処理全般

## ファイル構成

```
├── vr.html         # メインHTMLファイル（マウスカーソル対応）
├── skyway.js       # SkyWay接続・切断機能（解像度・FPS機能削除）
├── ui.js           # UI関連のコンポーネント（解像度・FPS機能削除）
├── a_frame.js      # コントローラー関連のコンポーネント
└── app.js          # アプリケーション統合・DebugMode制御
```

## 主な機能

### マウス操作対応
```html
<a-scene cursor="rayOrigin: mouse">
```
- PCでマウスクリックでUI操作可能
- VRコントローラーとマウス両方で操作可能

### 右パネル - ログ表示
- システムログ（最新25件）
- タイムスタンプ付き
- 緑色のテキスト（#00FF00）
- 0.2スケール、30文字折り返し

### 正面パネル - USERID表示のみ
**表示:**
```
USERID: abc123xyz
```

**更新タイミング:**
- 接続時: SkyWayから取得したユーザーID
- 切断時: "none"

### 操作モードHUD（DebugMode ON時）
**表示:**
```
HMD rotation (deg)
- x: 12.345
- y: -34.567
- z: 0.123
```

**内容:**
- HMD（ヘッドセット）の回転情報のみ
- 解像度・FPS表示は削除済み
- DebugMode OFFで非表示

### Connect/Disconnectボタンの統合
- 未接続時: 緑色「Connect」
- 接続中: 赤色「Disconnect」
- ホバー色も状態に応じて変化

### VR Subscribe-only モード
- publishなし（subscribeのみ）
- 複数publishがある場合、配列の最後のみ表示
- 新しいpublicationを自動購読

## 接続フロー（簡略化）

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
9. USERIDを更新
```

## 削除された機能

### 削除前（旧バージョン）
```javascript
// 状態管理
window.uiState = {
  userid: 'none',
  resolution: 'none',  // 削除
  fps: 'none'          // 削除
};

// 設定モードUI表示
USERID: abc123xyz
Resolution: 1920x1080  // 削除
FPS: 30                // 削除

// 操作モードHUD表示
Frame
- 1080*720            // 削除
- 30fps               // 削除

HMD rotation (deg)
- x: 12.345
- y: -34.567
- z: 0.123

// 関数
window.updateDisplayInfo(userid, resolution, fps);  // 削除
```

### 削除後（現バージョン）
```javascript
// 状態管理
window.uiState = {
  userid: 'none'
};

// 設定モードUI表示
USERID: abc123xyz

// 操作モードHUD表示
HMD rotation (deg)
- x: 12.345
- y: -34.567
- z: 0.123

// 関数
window.updateDisplayInfo(userid);
```

## ログ出力例

### 接続時

```
SYSTEM LOG

[14:23:45] UI initialized
[14:24:10] Connecting...
[14:24:11] Room: room1
[14:24:12] SkyWay connecting...
[14:24:13] Context created
[14:24:14] Room: room1
[14:24:15] UserID: abc123xy...
[14:24:16] VR mode: Subscribe only
[14:24:17] Setting up subscriptions...
[14:24:18] Found 1 publications
[14:24:19] Subscribing to video...
[14:24:20] Video stream received
[14:24:21] Video attached to screen
[14:24:22] Subscribed successfully
```

### 切断時

```
[14:30:00] Disconnecting...
[14:30:01] Left room
[14:30:02] Room disposed
[14:30:03] Video removed
[14:30:04] Disconnected
```

## グローバル状態

### window.uiState（簡略化）

```javascript
window.uiState = {
  roomNumber: 1,           // 接続するルーム番号（1-9）
  debugMode: false,        // DebugMode状態
  connected: false,        // 接続状態
  
  idValue: '441577ac...',  // SkyWay AppId
  secretValue: 'Bk9LR...',  // SkyWay Secret
  
  userid: 'none'           // 接続時のユーザーID（解像度・FPS削除）
};
```

### window.skywayState（簡略化）

```javascript
window.skywayState = {
  context: null,           // SkyWayContext
  room: null,              // SkyWayRoom
  me: null,                // Member
  connected: false,        // 接続状態
  
  userId: 'none',          // ユーザーID（解像度・FPS削除）
  
  subscriptions: new Set() // subscription管理
};
```

## グローバル関数（変更点）

### updateDisplayInfo（変更）

**変更前:**
```javascript
window.updateDisplayInfo(userid, resolution, fps);
```

**変更後:**
```javascript
window.updateDisplayInfo(userid);
```

### connectSkyWay（変更）

**変更前:**
```javascript
return {
  success: true,
  userId: '...',
  resolution: '1920x1080',
  fps: '30'
};
```

**変更後:**
```javascript
return {
  success: true,
  userId: '...'
};
```

## 使い方

### PCでの操作

1. ブラウザでvr.htmlを開く
2. マウスでUIをクリック
3. Room番号を選択
4. Connectボタンをクリック
5. 右パネルでログを確認
6. 正面パネルでUSERIDを確認

### VRでの操作

1. VRモードに入る
2. 設定モードでパラメータを設定
3. Connectボタンをクリック（緑色）
4. ボタンが赤色「Disconnect」に変わる
5. 操作モードに切り替え（Xボタン）
6. VRスクリーンに映像が表示される

## デバッグ方法

### 接続状態の確認

```javascript
// UI状態
console.log('Connected:', window.uiState.connected);
console.log('UserID:', window.uiState.userid);

// SkyWay状態
console.log('SkyWay Connected:', window.skywayState.connected);
console.log('SkyWay UserID:', window.skywayState.userId);
```

### USERID表示の確認

```javascript
// 表示テキスト確認
const displayInfo = document.getElementById('displayInfoText');
console.log('Display text:', displayInfo.getAttribute('value'));
// 出力例: "USERID: abc123xyz"
```

### ログの確認

**VR内:**
- 右パネルを見る
- リアルタイムでログが更新される

**PC:**
- ブラウザの開発者ツール（F12）
- Consoleタブでログを確認

## トラブルシューティング

### USERIDが「none」のまま

**原因:**
- 接続が完了していない
- updateDisplayInfo()が呼ばれていない

**確認:**
```javascript
console.log('Connected:', window.uiState.connected);
console.log('UserID:', window.skywayState.userId);
```

**解決:**
- 右パネルのログで接続状態を確認
- 「UserID: ...」のログが表示されているか確認

### 映像が暗い

**確認:**
```javascript
const screen = document.getElementById('screen');
console.log('Material:', screen.getAttribute('material'));
```

**解決:**
- opacity: 1.0が設定されているか確認
- transparent: falseが設定されているか確認

### ボタンが切り替わらない

**確認:**
```javascript
const button = document.getElementById('connectionButton');
console.log('Button color:', button.getAttribute('color'));
console.log('Connected:', window.uiState.connected);
```

**解決:**
- updateConnectionButton()が呼ばれているか確認
- 接続状態が正しく更新されているか確認

## 変更履歴

### v2.0（最新）
- **削除:** 解像度・FPS機能を完全に削除
  - 設定モードUI（正面パネル）から削除
  - 操作モードHUDから削除
  - VR_DISPLAY_CONFIG削除
- **変更:** USERID表示のみに変更
- **変更:** HUD表示をHMD回転のみに変更
- **簡略化:** updateDisplayInfo(userid)に変更
- **簡略化:** connectSkyWay()の返り値からresolution, fps削除

### v1.0
- 初回リリース
- 解像度・FPS表示機能あり

## 技術仕様

### UI表示

| 項目 | 表示内容 | 更新タイミング |
|------|---------|--------------|
| USERID | ユーザーID | 接続時/切断時 |

### ボタンの色

| 状態 | 通常色 | ホバー色 |
|------|--------|----------|
| 未接続 | #27AE60（緑） | #2ECC71（明るい緑） |
| 接続中 | #E74C3C（赤） | #EC7063（明るい赤） |

### ログ表示設定

```javascript
MAX_LOG_LINES = 25;  // 最大25行
wrap-count="30"      // 30文字で折り返し
scale="0.2 0.2 0"    // 0.2倍のスケール
```

## 参考情報

- [SkyWay公式ドキュメント](https://skyway.ntt.com/ja/docs/)
- [A-Frame公式ドキュメント](https://aframe.io/docs/)

## ライセンス

このプロジェクトは教育目的のサンプルコードです。
