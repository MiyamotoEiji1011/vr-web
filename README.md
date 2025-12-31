# VR Video Streaming with SkyWay

WebXR対応のVRビデオストリーミングアプリケーション  
VR側はDataStreamでVR操作データを送信、マウス操作対応、ログ表示機能付き

## 最新の修正内容

### ✅ VR操作ステータスのDataStream送信機能

**新機能:**
SkyWayのDataStreamを使用してVRの操作ステータスをリアルタイムで送信します。

**送信データ構造:**
```json
{
  "version": "1.0",
  "active": 0,  // 0: 設定モード, 1: 操作モード
  "X-Camera": 12.345,
  "Y-Camera": -34.567,
  "R_X-Joystick": 0.123,
  "R_Y-Joystick": -0.456,
  "R_A-Button": 0,
  "R_B-Button": 1,
  "R_T-Button": 0.789,
  "R_G-Button": 0.234,
  "L_X-Joystick": -0.123,
  "L_Y-Joystick": 0.456,
  "L_X-Button": 1,
  "L_Y-Button": 0,
  "L_T-Button": 0.567,
  "L_G-Button": 0.890
}
```

**送信仕様:**
- 送信頻度: 100ms (10Hz)
- 設定モード時: `active: 0` で送信継続
- 操作モード時: `active: 1` で送信
- 接続中のみ送信
- 切断時に自動停止

**実装:**
1. `SkyWayStreamFactory.createDataStream()` でDataStream作成
2. 接続時に自動publish
3. `collectVRStatus()` でカメラ・コントローラー情報収集
4. `sendVRStatus()` でJSON形式で送信
5. 100msごとに自動送信

### ✅ スクリーン色変更問題の修正

**問題:**
接続を切り、再接続した際にスクリーンの色が変わる

**原因:**
- 切断時: `material.color = '#111'` を設定
- 再接続時: `material.src` のみ設定
- `color` が残ったまま `src` と混ざって表示

**解決:**
- 再接続時に `color: '#FFFFFF'` で白色にリセット
- 映像が正しい色で表示される

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

### VR DataStream送信モード
- **ビデオ**: Subscribe専用（映像受信のみ）
- **DataStream**: Publish専用（VR操作データ送信）
- 送信頻度: 100ms (10Hz)
- 送信内容: カメラ回転、コントローラー状態、モード状態
- 設定モード時も送信継続（`active: 0`）

### VR操作データ送信
**送信データ:**
- バージョン情報
- アクティブ状態（設定/操作モード）
- カメラ回転（X, Y）
- 右コントローラー（ジョイスティック、ボタンA/B、トリガー、グリップ）
- 左コントローラー（ジョイスティック、ボタンX/Y、トリガー、グリップ）

**自動制御:**
- 接続時: DataStream作成 → Publish → 送信開始
- 切断時: 送信停止 → DataStream解放
- 複数publishがある場合、配列の最後のみ表示
- 新しいpublicationを自動購読

## 接続フロー

```
1. Connectボタンクリック
   ↓
2. SkyWayトークン生成
   ↓
3. コンテキスト作成
   ↓
4. ルーム参加（p2pタイプ）
   ↓
5. DataStream作成
   ↓
6. DataStreamをpublish
   ↓
7. VR操作データ送信開始（100ms間隔）
   ↓
8. 既存のビデオpublicationをチェック
   ├─ あり → 配列の最後をsubscribe
   └─ なし → 待機
   ↓
9. 新しいビデオpublicationを監視
   ↓
10. ビデオストリームを受信
   ↓
11. VRスクリーンに表示
   ↓
12. USERIDを更新
```

## 切断フロー

```
1. Disconnectボタンクリック
   ↓
2. VR操作データ送信停止
   ↓
3. ルームから退出
   ↓
4. ルームを破棄
   ↓
5. スクリーンから映像を削除
   ↓
6. 状態リセット
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
[14:24:16] DataStream published
[14:24:17] VR status sending started
[14:24:18] Setting up subscriptions...
[14:24:19] Found 1 publications
[14:24:20] Subscribing to video...
[14:24:21] Video stream received
[14:24:22] Video attached to screen
[14:24:23] Subscribed successfully
```

### 切断時

```
[14:30:00] Disconnecting...
[14:30:01] Left room
[14:30:02] Room disposed
[14:30:03] VR status sending stopped
[14:30:04] Video removed
[14:30:05] Disconnected
```
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

### v3.0（最新）
- **追加:** VR操作ステータスのDataStream送信機能
  - SkyWayStreamFactory.createDataStream()を使用
  - カメラ回転、コントローラー状態を100ms間隔で送信
  - 設定モード・操作モードの両方で送信
  - active値でモード状態を識別
- **修正:** スクリーン色変更問題
  - 再接続時にcolor属性を白色にリセット
  - 映像が正しい色で表示されるように修正

### v2.0
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
