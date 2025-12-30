# VR Video Streaming with SkyWay

WebXR対応のVRビデオストリーミングアプリケーション  
Rayの動的長さ調整と振動フィードバック機能を実装

## ファイル構成

```
├── vr.html         # メインHTMLファイル
├── skyway.js       # SkyWay関連の機能
├── ui.js           # UI関連のコンポーネント
├── a_frame.js      # コントローラー関連のコンポーネント（新機能追加）
└── app.js          # メインアプリケーションロジック
```

## 新機能

### 1. ✅ Rayの動的な長さ調整

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

### 2. ✅ コントローラーの振動フィードバック

**機能:**
- UIをトリガーでクリックした際にコントローラーが振動
- ボタン、トグル、InputField、キーボードのキーなど、すべてのインタラクティブUIに対応

**実装方法:**
```javascript
// controller-cursorコンポーネント
triggerHapticFeedback: function() {
  // 方法1: Oculus Touch Controlsのpulseメソッド
  const oculusTouchControls = this.el.components['oculus-touch-controls'];
  if (oculusTouchControls && oculusTouchControls.controller) {
    oculusTouchControls.controller.pulse(0.5, 100);
    return;
  }
  
  // 方法2: Gamepad APIを直接使用
  const gamepads = navigator.getGamepads();
  for (let gamepad of gamepads) {
    if (gamepad && gamepad.hand === 'right' && gamepad.vibrationActuator) {
      gamepad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: 100,
        weakMagnitude: 0.5,
        strongMagnitude: 0.5
      });
    }
  }
}
```

**振動のタイミング:**
```
1. InputFieldをクリック
   → ブルッ（振動）
   → キーボードが表示される

2. キーボードのキーをクリック
   → ブルッ（振動）
   → 文字が入力される

3. ボタンをクリック
   → ブルッ（振動）
   → ボタンのアクションが実行される

4. トグルをクリック
   → ブルッ（振動）
   → ON/OFFが切り替わる
```

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

### 振動フィードバックの仕組み

#### 2つの実装方法

**方法1: Oculus Touch Controlsのpulseメソッド**
```javascript
oculusTouchControls.controller.pulse(intensity, duration);
```
- `intensity`: 0.0-1.0（振動の強さ）
- `duration`: ミリ秒（振動の長さ）

**方法2: Gamepad API**
```javascript
gamepad.vibrationActuator.playEffect('dual-rumble', {
  startDelay: 0,
  duration: 100,
  weakMagnitude: 0.5,
  strongMagnitude: 0.5
});
```
- `weakMagnitude`: 0.0-1.0（弱い振動の強さ）
- `strongMagnitude`: 0.0-1.0（強い振動の強さ）

#### 実装の優先順位

1. **優先**: Oculus Touch Controlsのpulse()
   - A-Frameコンポーネントで簡単にアクセス可能
   - VRコントローラー専用の実装

2. **フォールバック**: Gamepad API
   - ブラウザの標準API
   - より汎用的だが、すべてのブラウザで対応していない可能性

## 使い方

### Rayの動作確認

1. **VRモードに入る**
   - 右コントローラーから白い線（Ray）が出る

2. **UIを向ける**
   - UIに向けるとRayがUIまでの距離で止まる
   - UIがない方向を向くとデフォルトの距離（far: 3）まで伸びる

3. **観察ポイント**
   - Rayの長さがUIまでの距離で動的に変わることを確認
   - Rayが貫通しないことを確認

### 振動フィードバックの確認

1. **UIをクリック**
   - 右コントローラーのトリガーを引く
   - コントローラーが振動する

2. **確認方法**
   - InputFieldをクリック → 振動
   - キーボードのキーをクリック → 振動
   - ボタンをクリック → 振動
   - トグルをクリック → 振動

3. **コンソールログ**
   ```
   [HAPTIC] Vibration triggered via Oculus Touch Controls
   ```
   または
   ```
   [HAPTIC] Vibration triggered via Gamepad API
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

### 振動フィードバックのテスト

```javascript
// 手動で振動をトリガー
const rightController = document.getElementById('rightOculus');
const controllerCursor = rightController.components['controller-cursor'];

controllerCursor.triggerHapticFeedback();
```

### コントローラーの確認

```javascript
// Oculus Touch Controlsの確認
const oculusTouchControls = rightController.components['oculus-touch-controls'];
console.log('Controller:', oculusTouchControls.controller);

// Gamepad APIの確認
const gamepads = navigator.getGamepads();
console.log('Gamepads:', gamepads);
```

## コンソールログ

### 正常動作時

```
[DYNAMIC RAY] Initialized
[DYNAMIC RAY] Raycaster initialized

[CONTROLLER CURSOR] Hovering: passInputField
[CONTROLLER CURSOR] Clicking on: passInputField
[HAPTIC] Vibration triggered via Oculus Touch Controls

[UI INPUT] pass clicked
[KEYBOARD] Keyboard shown for field: pass

[CONTROLLER CURSOR] Hovering: ui-key
[CONTROLLER CURSOR] Clicking on: ui-key
[HAPTIC] Vibration triggered via Oculus Touch Controls

[UI KEY] a clicked
[KEYBOARD] Current input: pass a
```

### エラー時

```
[HAPTIC] No vibration method available
```
→ Oculus Touch ControlsもGamepad APIも利用できない場合

```
[HAPTIC] Error triggering vibration: [エラーメッセージ]
```
→ 振動実行中にエラーが発生

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

### 振動が動作しない

1. ✅ VRデバイスが振動に対応しているか確認
2. ✅ コンソールで`[HAPTIC]`ログを確認
3. ✅ Oculus Touch Controlsが正しく初期化されているか確認
4. ✅ Gamepad APIが利用可能か確認

### 振動が強すぎる/弱すぎる

**強さを調整:**
```javascript
// a_frame.jsのtriggerHapticFeedback()内
// 方法1: pulse
oculusTouchControls.controller.pulse(0.3, 100);  // 0.5 → 0.3（弱く）
oculusTouchControls.controller.pulse(0.8, 100);  // 0.5 → 0.8（強く）

// 方法2: Gamepad API
gamepad.vibrationActuator.playEffect('dual-rumble', {
  weakMagnitude: 0.3,    // 0.5 → 0.3（弱く）
  strongMagnitude: 0.3   // 0.5 → 0.3（弱く）
});
```

**長さを調整:**
```javascript
// 方法1: pulse
oculusTouchControls.controller.pulse(0.5, 50);   // 100ms → 50ms（短く）
oculusTouchControls.controller.pulse(0.5, 200);  // 100ms → 200ms（長く）

// 方法2: Gamepad API
gamepad.vibrationActuator.playEffect('dual-rumble', {
  duration: 50,   // 100ms → 50ms（短く）
  // ...
});
```

## パフォーマンス

### Rayの長さ更新頻度

- `raycaster-intersection`イベントは毎フレーム発火する可能性がある
- lineの更新は軽量な処理
- パフォーマンスへの影響は最小限

### 振動フィードバックの頻度

- クリック時のみ実行（1回のみ）
- 短時間（100ms）の振動
- 連続クリックしても問題なし

## 参考情報

- [A-Frame Raycaster](https://aframe.io/docs/1.5.0/components/raycaster.html)
- [A-Frame Line](https://aframe.io/docs/1.5.0/components/line.html)
- [WebXR Gamepads Module](https://www.w3.org/TR/webxr-gamepads-module-1/)
- [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)

## ライセンス

このプロジェクトは教育目的のサンプルコードです。
