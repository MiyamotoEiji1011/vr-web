# VR Video Streaming with SkyWay

WebXR対応のVRビデオストリーミングアプリケーション  
使いやすい3パネルレイアウト、スクロール不要のシンプルなUI

## ファイル構成

```
├── vr.html         # メインHTMLファイル
├── skyway.js       # SkyWay関連の機能
├── ui.js           # UI関連のコンポーネント
├── a_frame.js      # コントローラー関連のコンポーネント
└── app.js          # メインアプリケーションロジック
```

## UI配置（設定モード）

### 3パネルレイアウト

```
        VR空間の配置（正面から見た図）
        
┌────────────┐  ┌────────────┐  ┌────────────┐
│  SKYWAY    │  │    INFO    │  │   GUIDE    │
│            │  │            │  │            │
│ ID         │  │ Connection │  │ Controls:  │
│ PassKey    │  │ ID: none   │  │            │
│ Room       │  │            │  │ X Button   │
│            │  │ Video      │  │ - Switch   │
│ [Connect]  │  │ 1920x1080  │  │           │
│ [Disconnect]│  │ 30 fps    │  │ Trigger   │
│            │  │            │  │ - Click UI │
│            │  │ Debug: OFF │  │            │
└────────────┘  └────────────┘  └────────────┘
     左側            中央             右側
  position:       position:       position:
  -2, 0.3, 0      0, 0.3, 0       2, 0.3, 0


            ┌──────────────────┐
            │    KEYBOARD      │
            │ (表示時のみ)      │
            └──────────────────┘
                 下部中央
               position:
               0, -0.8, 0
```

### パネルの詳細

#### 1. 左パネル: SkyWay設定

**色:** ダークブルー（#2C3E50）  
**サイズ:** 1.8m × 1.4m

**内容:**
- **ID**: InputField（キーボードで編集可能）
- **PassKey**: InputField（キーボードで編集可能）
- **Room**: 3つのボタン（room1/room2/room3）
- **Connect/Disconnect**: 接続操作ボタン

#### 2. 中央パネル: 接続・映像情報

**色:** ダークグレー（#34495E）  
**サイズ:** 1.8m × 1.4m

**内容:**
- **Connection ID**: 接続ID（デフォルト: "none"）
- **Video Stream情報**:
  - Resolution: 解像度（例: 1920x1080）
  - FPS: フレームレート（例: 30）
- **Debug Mode**: ON/OFFトグル

#### 3. 右パネル: 使い方ガイド

**色:** ティール（#16A085）  
**サイズ:** 1.8m × 1.4m

**内容:**
- **コントロール説明**:
  - X Button (Left) - モード切り替え
  - Trigger (Right) - UIクリック
- **モード説明**:
  - Settings - 設定画面
  - Control - 映像視聴

#### 4. 下部: 仮想キーボード（表示時のみ）

**色:** ダークグレー（#1C1C1C）  
**サイズ:** 2.0m × 1.3m

**内容:**
- 数字キー（0-9）
- アルファベット（a-z）
- 記号（@ . - _）
- 機能キー（Space, Backspace, Enter）

## 使い方

### 基本操作

1. **VRモードに入る**
   - VRヘッドセットを装着
   - 正面に3つのパネルが表示される

2. **モード切り替え**
   - 左コントローラーの**Xボタン**を押す
   - Settings ↔ Control が切り替わる

3. **UIクリック**
   - 右コントローラーを向ける
   - 🔴 赤い線（Ray）が前方に表示される
   - トリガーを引く

### SkyWay設定

1. **IDを入力**
   - 左パネルの「ID」フィールドをクリック
   - 下部にキーボードが表示される
   - 文字を入力
   - Enterで確定

2. **PassKeyを入力**
   - 左パネルの「PassKey」フィールドをクリック
   - キーボードで文字を入力
   - Enterで確定

3. **Roomを選択**
   - 左パネルの「1」「2」「3」ボタンをクリック
   - 選択されたボタンが明るくなる

4. **接続**
   - 左パネルの「Connect」ボタンをクリック
   - 接続処理が実行される

### 情報確認

1. **接続ID確認**
   - 中央パネルの「Connection ID」を見る
   - 接続中は実際のIDが表示される

2. **映像情報確認**
   - 中央パネルの「Video Stream」セクションを見る
   - 解像度とFPSが表示される

3. **デバッグモード切り替え**
   - 中央パネルの「Debug Mode」トグルをクリック
   - ON/OFFが切り替わる

### 操作ガイド確認

- 右パネルの「GUIDE」を見る
- コントロール方法が記載されている

## カラーテーマ

各パネルは視認性を高めるため、異なる色で区別：

| パネル | 色 | 用途 |
|--------|------|------|
| SkyWay | ダークブルー (#2C3E50) | 設定入力 |
| Info | ダークグレー (#34495E) | 情報表示 |
| Guide | ティール (#16A085) | 操作説明 |
| Keyboard | ダークグレー (#1C1C1C) | 文字入力 |

## グローバル状態

```javascript
window.uiState = {
  // SkyWay設定
  idValue: 'app-id',
  passkeyValue: 'secret-key',
  selectedRoom: 'room1',
  
  // 接続情報
  connectionId: 'none',
  resolution: '1920x1080',
  fps: '30',
  connected: false,
  
  // その他
  debugMode: false,
  keyboardVisible: false,
  currentInputField: null
};

// 状態を確認
console.log(window.uiState);
```

## グローバル関数

### updateConnectionInfo

接続情報を更新する関数：

```javascript
// 全ての情報を更新
window.updateConnectionInfo('abc123', '1920x1080', '30');

// 個別に更新
window.updateConnectionInfo('abc123', undefined, undefined);  // IDのみ
window.updateConnectionInfo(undefined, '3840x2160', undefined);  // 解像度のみ
window.updateConnectionInfo(undefined, undefined, '60');  // FPSのみ
```

**使用例:**
```javascript
// SkyWay接続成功時
window.updateConnectionInfo('connection-12345', '1920x1080', '30');

// 映像情報変更時
window.updateConnectionInfo(undefined, '3840x2160', '60');
```

## UI設計の特徴

### ✅ スクロール不要

- すべての設定項目を1画面に配置
- スクロールボタン不要
- 視線移動だけで全体を把握可能

### ✅ 論理的な配置

- **左**: 入力・設定（SkyWay）
- **中央**: 情報表示（接続・映像）
- **右**: ヘルプ・ガイド

### ✅ 視認性の高いデザイン

- 各パネルを異なる色で区別
- 大きめのボタンとテキスト
- VR空間での読みやすさを重視

### ✅ 操作の流れ

1. 左パネルで設定入力
2. 左パネルで接続
3. 中央パネルで状態確認
4. 右パネルで操作方法確認

## デバッグ方法

### パネル位置確認

```javascript
// 各パネルの位置を確認
const skywayPanel = document.getElementById('skywayPanel');
console.log(skywayPanel.getAttribute('position'));  // {x: -2, y: 0.3, z: 0}

const infoPanel = document.getElementById('infoPanel');
console.log(infoPanel.getAttribute('position'));  // {x: 0, y: 0.3, z: 0}

const guidePanel = document.getElementById('guidePanel');
console.log(guidePanel.getAttribute('position'));  // {x: 2, y: 0.3, z: 0}
```

### 状態確認

```javascript
// 全体の状態
console.log(window.uiState);

// 個別の値
console.log(window.uiState.idValue);        // 'app-id'
console.log(window.uiState.passkeyValue);   // 'secret-key'
console.log(window.uiState.connectionId);   // 'none'
```

### 接続情報更新テスト

```javascript
// 接続情報を手動で更新
window.updateConnectionInfo('test-connection-123', '3840x2160', '60');

// 中央パネルを確認
// → Connection ID: test-connection-123
// → Resolution: 3840x2160
// → FPS: 60
```

## コンソールログ

### 通常操作

```
[UI INPUT] id clicked
[KEYBOARD] Keyboard shown for field: id

[UI KEY] a clicked
[KEYBOARD] Current input: id a

[UI KEY] Enter clicked
[KEYBOARD] Input confirmed: id abc
[KEYBOARD] Keyboard hidden

[UI BUTTON] room1Button clicked
[UI] Selected room: room1

[UI BUTTON] connectButton clicked
[UI] Connect button clicked
```

### 情報更新

```
[UI] Connection info updated: abc123 1920x1080 30
```

## 実装メモ

### UIのみ実装

以下の機能は**UIのみ実装**されており、実際の動作は未実装：

- ✅ ID/PassKey入力 - 入力できるが、SkyWay接続には未使用
- ✅ Connection ID表示 - 手動更新が必要
- ✅ 映像情報表示 - 手動更新が必要
- ✅ Connect/Disconnectボタン - UIのみ、実際の接続処理は未実装

### 今後の実装

実際の機能を実装する際は、`window.updateConnectionInfo()`を使用：

```javascript
// SkyWay接続成功時
const connectionId = 'connection-abc123';
const resolution = '1920x1080';
const fps = '30';
window.updateConnectionInfo(connectionId, resolution, fps);

// 映像情報が変わった時
window.updateConnectionInfo(undefined, '3840x2160', '60');

// 切断時
window.updateConnectionInfo('none', undefined, undefined);
```

## トラブルシューティング

### パネルが見えない

1. ✅ 設定モードになっているか確認（Xボタンで切り替え）
2. ✅ カメラの位置を確認
3. ✅ コンソールで`[MODE MANAGER] Settings UI displayed`ログを確認

### キーボードが表示されない

1. ✅ InputFieldをクリックしたか確認
2. ✅ コンソールで`[KEYBOARD] Keyboard shown`ログを確認
3. ✅ `virtualKeyboard`のvisibleを確認

### ボタンが反応しない

1. ✅ Rayが正しく前方に出ているか確認
2. ✅ ボタンに`.ui-button`クラスが設定されているか確認
3. ✅ コンソールで`[UI BUTTON] clicked`ログを確認

## 参考情報

- [A-Frame公式ドキュメント](https://aframe.io/docs/)
- [A-Frame Components](https://aframe.io/docs/1.5.0/introduction/writing-a-component.html)

## ライセンス

このプロジェクトは教育目的のサンプルコードです。
