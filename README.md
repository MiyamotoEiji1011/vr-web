# VR Video Streaming with SkyWay

WebXR対応のVRビデオストリーミングアプリケーション  
VR側はSubscribeのみ、マウス操作対応、ログ表示機能付き

## 最新の修正内容

### ✅ 1. 解像度・FPS取得の改善

**問題:**
接続時に解像度を正しく取得できていなかった

**解決:**
- `remoteVideo.videoWidth`と`remoteVideo.videoHeight`を使用
- `loadedmetadata`イベントで実際の解像度を取得
- `track.getSettings()`でFPSを取得
- 両方の方法を併用して確実に取得

**実装:**
```javascript
remoteVideo.addEventListener('loadedmetadata', () => {
  const width = remoteVideo.videoWidth;
  const height = remoteVideo.videoHeight;
  window.skywayState.resolution = `${width}x${height}`;
});

const settings = track.getSettings();
window.skywayState.fps = Math.round(settings.frameRate).toString();
```

### ✅ 2. 接続ボタンのホバー色切り替え

**問題:**
Disconnectボタンに切り替わった後、ホバー時に緑色に戻る

**解決:**
- ホバー処理で接続状態を確認
- 未接続時: 緑系のホバー色（#2ECC71）
- 接続中: 赤系のホバー色（#EC7063）
- ホバー解除時も現在の接続状態に応じた色に戻す

**実装:**
```javascript
// ホバー時
if (window.uiState.connected) {
  currentHoverColor = '#EC7063';  // 赤系
} else {
  currentHoverColor = '#2ECC71';  // 緑系
}
```

### ✅ 3. USERID/解像度/FPS表示の統合

**変更前:**
```
USERID: **********
Resolution: 1920x1080
FPS: 30
```

**変更後:**
```
USERID: **********
Resolution: 1920x1080
FPS: 30
```
（1つのテキスト要素に統合）

**実装:**
```javascript
const text = `USERID: ${userid}\nResolution: ${resolution}\nFPS: ${fps}`;
displayInfoText.setAttribute('value', text);
```

### ✅ 4. 映像の明るさ改善

**問題:**
受信映像が暗く表示される

**原因:**
- materialのopacityが設定されていない、またはtransparentが有効
- shaderの設定が影響している可能性

**解決:**
- `material`に明示的に`opacity: 1.0`と`transparent: false`を設定
- flatシェーダーを使用して軽量化

**実装:**
```javascript
screen.setAttribute('material', {
  src: '#remoteVideo',
  opacity: 1.0,
  transparent: false
});
```

## ファイル構成

```
├── vr.html         # メインHTMLファイル（マウスカーソル対応）
├── skyway.js       # SkyWay接続・切断機能（解像度取得改善）
├── ui.js           # UI関連のコンポーネント（ホバー色切り替え、統合表示）
├── a_frame.js      # コントローラー関連のコンポーネント
└── app.js          # アプリケーション統合・DebugMode制御
```

## 主な機能

### マウス操作対応
```html
<a-scene cursor="rayOrigin: mouse">
```

### 右パネル - ログ表示
- システムログ（最新15件）
- タイムスタンプ付き
- 緑色のテキスト

### Connect/Disconnectボタンの統合
- 未接続時: 緑色「Connect」
- 接続中: 赤色「Disconnect」
- ホバー色も状態に応じて変化

### VR Subscribe-only モード
- publishなし（subscribeのみ）
- 複数publishがある場合、配列の最後のみ表示
- 新しいpublicationを自動購読

## 解像度・FPS取得の詳細

### 取得方法

**方法1: video要素から取得（優先）**
```javascript
remoteVideo.addEventListener('loadedmetadata', () => {
  const width = remoteVideo.videoWidth;
  const height = remoteVideo.videoHeight;
  resolution = `${width}x${height}`;
});
```

**方法2: trackから取得（バックアップ）**
```javascript
const settings = track.getSettings();
resolution = `${settings.width}x${settings.height}`;
fps = Math.round(settings.frameRate).toString();
```

### ログ出力例

```
SYSTEM LOG

[14:23:45] UI initialized
[14:24:10] Connecting...
[14:24:11] Room: room1
[14:24:12] Context created
[14:24:13] UserID: abc123xy...
[14:24:14] Found 1 publications
[14:24:15] Subscribing to video...
[14:24:16] Video stream received
[14:24:17] Video resolution: 1920x1080
[14:24:18] Video FPS: 30
[14:24:19] Video attached to screen
```

## 使い方

### PCでの操作

1. ブラウザでvr.htmlを開く
2. マウスでUIをクリック
3. Room番号を選択
4. Connectボタンをクリック
5. 右パネルでログを確認
6. 正面パネルでUSERID/解像度/FPSを確認

### VRでの操作

1. VRモードに入る
2. 設定モードでパラメータを設定
3. Connectボタンをクリック（緑色）
4. ボタンが赤色「Disconnect」に変わる
5. 操作モードに切り替え（Xボタン）
6. VRスクリーンに映像が表示される

## トラブルシューティング

### 解像度・FPSが「none」のまま

**原因:**
- ビデオのメタデータが読み込まれていない
- trackの設定が取得できていない

**確認:**
```javascript
const video = document.getElementById('remoteVideo');
console.log('Video width:', video.videoWidth);
console.log('Video height:', video.videoHeight);

const track = stream.track;
const settings = track.getSettings();
console.log('Settings:', settings);
```

**解決:**
- loadedmetadataイベントが発火するまで待つ
- 両方の取得方法を併用（実装済み）

### 映像が暗い

**原因:**
- materialのopacityが0に近い
- transparentがtrueになっている
- 環境光が不足

**確認:**
```javascript
const screen = document.getElementById('screen');
console.log('Material:', screen.getAttribute('material'));
```

**解決:**
- opacity: 1.0を明示的に設定（実装済み）
- transparent: falseを設定（実装済み）

### ホバー色が正しくない

**原因:**
- 接続状態の確認タイミングが間違っている
- 元の色の取得方法が間違っている

**確認:**
```javascript
console.log('Connected:', window.uiState.connected);
const button = document.getElementById('connectionButton');
console.log('Button color:', button.getAttribute('color'));
```

**解決:**
- ホバー時に動的に接続状態を確認（実装済み）
- ホバー解除時に現在の色を取得（実装済み）

## デバッグ方法

### 映像表示の確認

```javascript
const video = document.getElementById('remoteVideo');
console.log('Video ready state:', video.readyState);
console.log('Video width:', video.videoWidth);
console.log('Video height:', video.videoHeight);
console.log('Video paused:', video.paused);
```

### 解像度・FPS確認

```javascript
console.log('Resolution:', window.skywayState.resolution);
console.log('FPS:', window.skywayState.fps);

// 表示テキスト確認
const displayInfo = document.getElementById('displayInfoText');
console.log('Display text:', displayInfo.getAttribute('value'));
```

### ボタン状態確認

```javascript
const button = document.getElementById('connectionButton');
console.log('Button color:', button.getAttribute('color'));

const text = document.getElementById('connectionButtonText');
console.log('Button text:', text.getAttribute('value'));

console.log('Connected:', window.uiState.connected);
```

## グローバル関数

### ログ関連
```javascript
window.addLog(message);
window.clearLogs();
```

### SkyWay関連
```javascript
const result = await window.connectSkyWay(roomNumber, appId, secret);
await window.disconnectSkyWay();
```

### UI関連
```javascript
window.updateDisplayInfo(userid, resolution, fps);
window.appUpdateHudVisibility();
```

## 技術仕様

### 解像度・FPS取得

| 方法 | タイミング | 信頼性 | 優先度 |
|------|-----------|--------|--------|
| video.videoWidth/Height | loadedmetadata | 高 | 1 |
| track.getSettings() | subscribe直後 | 中 | 2 |

### ボタンの色

| 状態 | 通常色 | ホバー色 |
|------|--------|----------|
| 未接続 | #27AE60（緑） | #2ECC71（明るい緑） |
| 接続中 | #E74C3C（赤） | #EC7063（明るい赤） |

### 映像表示の設定

```javascript
{
  src: '#remoteVideo',
  opacity: 1.0,
  transparent: false,
  shader: 'flat'
}
```

## 参考情報

- [SkyWay公式ドキュメント](https://skyway.ntt.com/ja/docs/)
- [A-Frame公式ドキュメント](https://aframe.io/docs/)
- [HTMLVideoElement API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement)
- [MediaStreamTrack.getSettings()](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getSettings)

## ライセンス

このプロジェクトは教育目的のサンプルコードです。
