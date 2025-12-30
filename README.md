# VR Video Streaming with SkyWay

WebXR対応のVRビデオストリーミングアプリケーション  
シンプルで使いやすい3パネルレイアウト

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
        VR空間の配置（上から見た図）
        
           ┌────────┐
           │ 正面   │
           │ パネル │
           └────────┘
              0,0,0
               ↑
               
  ┌────┐     👤      ┌────┐
  │左  │    カメラ    │右  │
  │パネル│            │パネル│
  └────┘            └────┘
-2,0,1              2,0,1
rotation:           rotation:
0,45,0              0,-45,0


         キーボード
         （下部中央）
          0,-1.3,0.5
```

## パネル詳細

### 左パネル

**色:** グレー（#7F8C8D）透明度70%  
**サイズ:** 1.5m × 2.0m  
**回転:** 45度（右向き）

**内容:**
```
Pass [____________]
Room [1]  [↑][↓]
DebugMode (     )
─────────────────
[   Connect    ]
[  Disconnect  ]
```

**機能:**
- **Pass**: InputField（キーボードで入力）
- **Room**: 番号表示 + ↑↓ボタン（1-9を切り替え）
- **DebugMode**: トグルスイッチ（ON/OFF）
- **Connect**: 接続ボタン
- **Disconnect**: 切断ボタン

### 正面パネル（中央）

**色:** グレー（#7F8C8D）透明度70%  
**サイズ:** 2.0m × 2.0m  
**回転:** なし

**内容:**
```
ID     [*************]
SECRET [*************]
─────────────────────
USERID    *************
Resolution: 1080x720
FPS:        30
```

**機能:**
- **ID**: InputField（キーボードで入力）
- **SECRET**: InputField（キーボードで入力）
- **USERID**: テキスト表示（開発用プレースホルダー）
- **Resolution**: テキスト表示（開発用プレースホルダー）
- **FPS**: テキスト表示（開発用プレースホルダー）

### 右パネル

**色:** グレー（#7F8C8D）透明度70%  
**サイズ:** 1.5m × 2.0m  
**回転:** -45度（左向き）

**内容:**
- 現在は空のパネル

### キーボード（下部中央）

**色:** ダークグレー（#1C1C1C）透明度95%  
**サイズ:** 2.0m × 1.3m  
**位置:** 下部中央

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

### 左パネルの操作

#### 1. Pass入力

- 「Pass」の右側のフィールドをクリック
- キーボードが表示される
- 文字を入力
- Enterで確定

#### 2. Room番号変更

- **↑ボタン**: Room番号を1増やす（9の次は1）
- **↓ボタン**: Room番号を1減らす（1の前は9）
- 中央に現在の番号が表示される

#### 3. DebugMode切り替え

- トグルスイッチをクリック
- ON/OFFが切り替わる

#### 4. 接続操作

- **Connect**: 接続処理を実行
- **Disconnect**: 切断処理を実行

### 正面パネルの操作

#### 1. ID入力

- 「ID」の右側のフィールドをクリック
- キーボードが表示される
- 文字を入力
- Enterで確定

#### 2. SECRET入力

- 「SECRET」の右側のフィールドをクリック
- キーボードが表示される
- 文字を入力
- Enterで確定

#### 3. 情報確認

- **USERID**: ユーザーIDを表示（実装後）
- **Resolution**: 映像の解像度を表示
- **FPS**: フレームレートを表示

## グローバル状態

```javascript
window.uiState = {
  // 左パネル
  roomNumber: 1,
  debugMode: false,
  connected: false,
  passValue: '',
  
  // 正面パネル
  idValue: '*************',
  secretValue: '*************',
  
  // 表示情報
  userid: '*************',
  resolution: '1080x720',
  fps: '30',
  
  // キーボード
  keyboardVisible: false,
  currentInputField: null
};

// 状態を確認
console.log(window.uiState);
```

## グローバル関数

### updateDisplayInfo

表示情報を更新する関数：

```javascript
// 全ての情報を更新
window.updateDisplayInfo('user123', '1920x1080', '60');

// 個別に更新
window.updateDisplayInfo('user123', undefined, undefined);  // USERIDのみ
window.updateDisplayInfo(undefined, '3840x2160', undefined);  // Resolutionのみ
window.updateDisplayInfo(undefined, undefined, '60');  // FPSのみ
```

**使用例:**
```javascript
// SkyWay接続成功時
window.updateDisplayInfo('connection-12345', '1920x1080', '30');

// 映像情報変更時
window.updateDisplayInfo(undefined, '3840x2160', '60');
```

## UI操作フロー

### Pass入力の流れ

```
1. Passフィールドをクリック
   ↓
2. キーボードが下部に表示
   ↓
3. 文字を入力
   ↓
4. Enterで確定
   ↓
5. キーボードが閉じる
   ↓
6. uiState.passValue に保存
```

### Room番号変更の流れ

```
1. ↑または↓ボタンをクリック
   ↓
2. 番号が1増減
   ↓
3. 範囲チェック（1-9）
   ↓
4. 画面の番号表示を更新
   ↓
5. uiState.roomNumber に保存
```

## デザイン仕様

### カラーパレット

| 要素 | 色 | 備考 |
|------|------|------|
| パネル背景 | #7F8C8D (opacity: 0.7) | 少し透明のグレー |
| テキスト | #FFFFFF | 見やすい白 |
| InputField | #FFFFFF | 白背景 |
| InputFieldテキスト | #000000 | 黒文字 |
| 区切り線 | #FFFFFF | 白 |
| Connectボタン | #27AE60 | 緑 |
| Disconnectボタン | #E74C3C | 赤 |
| ↑↓ボタン | #5DADE2 | 青 |
| Toggleボタン（OFF） | #95A5A6 | グレー |
| Toggleボタン（ON） | #3498DB | 青 |

### パネル位置

| パネル | 位置 | 回転 |
|--------|------|------|
| 左パネル | (-2, 0, 1) | (0, 45, 0) |
| 正面パネル | (0, 0, 0) | なし |
| 右パネル | (2, 0, 1) | (0, -45, 0) |
| キーボード | (0, -1.3, 0.5) | なし |

## コンソールログ

### 通常操作

```
[UI INPUT] pass clicked
[KEYBOARD] Keyboard shown for field: pass

[UI KEY] a clicked
[KEYBOARD] Current input: pass a

[UI KEY] Enter clicked
[KEYBOARD] Input confirmed: pass abc
[KEYBOARD] Keyboard hidden

[UI BUTTON] roomUp clicked
[UI] Room number changed to: 2

[UI BUTTON] roomDown clicked
[UI] Room number changed to: 1

[UI BUTTON] connect clicked
[UI] Connect button clicked

[UI TOGGLE] Debug mode: ON
```

### 情報更新

```
[UI] Display info updated: user123 1920x1080 60
```

## デバッグ方法

### パネル位置確認

```javascript
// 各パネルの位置を確認
const leftPanel = document.getElementById('leftPanel');
console.log(leftPanel.getAttribute('position'));  // {x: -2, y: 0, z: 1}

const centerPanel = document.getElementById('centerPanel');
console.log(centerPanel.getAttribute('position'));  // {x: 0, y: 0, z: 0}

const rightPanel = document.getElementById('rightPanel');
console.log(rightPanel.getAttribute('position'));  // {x: 2, y: 0, z: 1}
```

### 状態確認

```javascript
// 全体の状態
console.log(window.uiState);

// 個別の値
console.log(window.uiState.roomNumber);   // 1
console.log(window.uiState.passValue);    // ''
console.log(window.uiState.idValue);      // '*************'
```

### Room番号変更テスト

```javascript
// Room番号を手動で変更
window.uiState.roomNumber = 5;

// 表示を更新
const textEl = document.getElementById('roomNumberText');
textEl.setAttribute('value', '5');
```

### 表示情報更新テスト

```javascript
// 表示情報を手動で更新
window.updateDisplayInfo('test-user-123', '3840x2160', '60');

// 正面パネルを確認
// → USERID: test-user-123
// → Resolution: 3840x2160
// → FPS: 60
```

## 実装メモ

### UIのみ実装

以下の機能は**UIのみ実装**されており、実際の動作は未実装：

- ✅ Pass/ID/SECRET入力 - 入力できるが、実際の処理には未使用
- ✅ Room番号選択 - 番号を変更できるが、実際の接続には未使用
- ✅ USERID/解像度/FPS表示 - プレースホルダー表示のみ
- ✅ Connect/Disconnectボタン - UIのみ、実際の接続処理は未実装

### 今後の実装

実際の機能を実装する際の参考：

```javascript
// SkyWay接続時にPass、ID、SECRETを使用
const pass = window.uiState.passValue;
const id = window.uiState.idValue;
const secret = window.uiState.secretValue;
const room = `room${window.uiState.roomNumber}`;

// 接続成功時に表示情報を更新
window.updateDisplayInfo('user-abc-123', '1920x1080', '30');

// 映像情報が変わった時
window.updateDisplayInfo(undefined, '3840x2160', '60');
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

### Room番号が変わらない

1. ✅ ↑↓ボタンに`ui-button`コンポーネントが設定されているか確認
2. ✅ `action`属性が正しく設定されているか確認（`roomUp`、`roomDown`）
3. ✅ コンソールで`[UI] Room number changed to`ログを確認

## 参考情報

- [A-Frame公式ドキュメント](https://aframe.io/docs/)
- [A-Frame Components](https://aframe.io/docs/1.5.0/introduction/writing-a-component.html)

## ライセンス

このプロジェクトは教育目的のサンプルコードです。
