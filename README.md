# VR Video Streaming with SkyWay

WebXR対応のVRビデオストリーミングアプリケーション  
Rayの動的長さ調整機能を実装

## ファイル構成

```
├── vr.html         # メインHTMLファイル
├── skyway.js       # SkyWay関連の機能
├── ui.js           # UI関連のコンポーネント
├── a_frame.js      # コントローラー関連のコンポーネント
└── app.js          # メインアプリケーションロジック
```

## 新機能

### ✅ Rayの動的な長さ調整

**機能:**
- RayがUIに当たった場合、その距離までRayを描画
- UIがない場合はデフォルトの距離（far: 3）で描画
- Rayが貫通しない

**実装:**
```javascript
// dynamic-rayコンポーネント
AFRAME.registerComponent('dynamic-ray', {
  init: function() {
    // raycaster-intersectionイベントをリッスン
    this.el.addEventListener('raycaster-intersection', (evt) => {
      const intersections = evt.detail.intersections;
      if (intersections && intersections.length > 0) {
        const closestIntersection = intersections[0];
        this.currentDistance = closestIntersection.distance;
        this.updateRayLength(this.currentDistance);
      }
    });
  }
});
```

**動作:**
```
Rayの長さ調整:

UIなし:
Controller ──────────────────────> (far: 3)

UIあり:
Controller ─────────> [UI]  ✓ UIまでの距離で止まる
                      ↑
                  distance: 1.5
```

## UI配置

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

## 技術詳細

### Rayの長さ調整の仕組み

#### vr.html
```html
<a-entity id="rightOculus" 
          raycaster="objects: .ui-button, .ui-toggle, .ui-input; 
                     origin: 0 0 0; 
                     direction: 0 -1 -1; 
                     far: 3; 
                     showLine: false"
          controller-cursor
          dynamic-ray>
  <!-- 手動で制御するRayライン -->
  <a-entity id="rayLine"
            line="start: 0 0 0; end: 0 -3 -3; color: white; opacity: 1.0">
  </a-entity>
</a-entity>
```

**重要なポイント:**
- `showLine: false` - A-Frameのデフォルトのline表示を無効化
- `dynamic-ray` - 手動でlineの長さを制御するコンポーネント
- `#rayLine` - 手動で制御するlineエンティティ

#### a_frame.js
```javascript
updateRayLength: function(distance) {
  // direction: 0 -1 -1 を正規化した方向ベクトル
  const direction = new THREE.Vector3(0, -1, -1).normalize();
  
  // 距離に応じたエンドポイントを計算
  const end = direction.multiplyScalar(distance);
  
  // lineのendプロパティを更新
  this.lineEl.setAttribute('line', {
    start: { x: 0, y: 0, z: 0 },
    end: { x: end.x, y: end.y, z: end.z },
    color: 'white',
    opacity: 1.0
  });
}
```

**計算の流れ:**
1. raycasterの方向ベクトル `(0, -1, -1)` を正規化
2. 交差点の距離を取得
3. 方向ベクトル × 距離 = エンドポイント
4. lineのendプロパティを更新

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

### Rayの動作確認

1. **VRモードに入る**
   - 右コントローラーから白い線（Ray）が出る

2. **UIを向ける**
   - UIに向けるとRayがUIまでの距離で止まる
   - UIがない方向を向くとデフォルトの距離（far: 3）まで伸びる

3. **観察ポイント**
   - Rayの長さがUIまでの距離で動的に変わることを確認
   - Rayが貫通しないことを確認

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

## デバッグ方法

### Rayの長さ確認

```javascript
// dynamic-rayコンポーネントの状態確認
const rightController = document.getElementById('rightOculus');
const dynamicRay = rightController.components['dynamic-ray'];

console.log('Current distance:', dynamicRay.currentDistance);
console.log('Default far:', dynamicRay.defaultFar);
```

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

## コンソールログ

### 正常動作時

```
[DYNAMIC RAY] Initialized
[DYNAMIC RAY] Raycaster initialized

[CONTROLLER CURSOR] Hovering: passInputField
[CONTROLLER CURSOR] Clicking on: passInputField

[UI INPUT] pass clicked
[KEYBOARD] Keyboard shown for field: pass

[UI KEY] a clicked
[KEYBOARD] Current input: pass a
```

## トラブルシューティング

### Rayの長さが変わらない

1. ✅ `dynamic-ray`コンポーネントが追加されているか確認
2. ✅ `showLine: false`になっているか確認
3. ✅ `#rayLine`エンティティが存在するか確認
4. ✅ コンソールで`[DYNAMIC RAY] Initialized`ログを確認

### Rayが表示されない

1. ✅ `#rayLine`の`line`属性が正しく設定されているか確認
2. ✅ `color: white`と`opacity: 1.0`が設定されているか確認
3. ✅ raycasterの`direction`が正しいか確認（0 -1 -1）

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
- [A-Frame Raycaster](https://aframe.io/docs/1.5.0/components/raycaster.html)
- [A-Frame Line](https://aframe.io/docs/1.5.0/components/line.html)
- [A-Frame Components](https://aframe.io/docs/1.5.0/introduction/writing-a-component.html)

## ライセンス

このプロジェクトは教育目的のサンプルコードです。
