# VR Video Streaming with SkyWay

WebXR対応のVRビデオストリーミングアプリケーション  
Rayの動的長さ調整と振動フィードバック機能（vibrationコンポーネント）を実装

## ファイル構成

```
├── vr.html         # メインHTMLファイル（vibration属性を追加）
├── skyway.js       # SkyWay関連の機能
├── ui.js           # UI関連のコンポーネント（vibrationコンポーネント追加）
├── a_frame.js      # コントローラー関連のコンポーネント
└── app.js          # メインアプリケーションロジック
```

## 新機能

### 1. ✅ Rayの動的な長さ調整

**機能:**
- RayがUIに当たった場合、その距離までRayを描画
- UIがない場合はデフォルトの距離（far: 3）で描画
- Rayが貫通しない

### 2. ✅ 振動フィードバック（vibrationコンポーネント）

**機能:**
- UI要素をクリックした際にコントローラーが振動
- スマホ用振動とVRコントローラー振動の両方に対応
- すべてのインタラクティブUI（ボタン、トグル、InputField、キーボード）に対応

**実装方法:**
参考コードをベースに`vibration`コンポーネントを実装しました。

```javascript
AFRAME.registerComponent('vibration', {
  schema: {
    duration: { type: 'int', default: 100 },
    value: { type: 'number', default: 0.5 }
  },
  
  init: function() {
    this.el.addEventListener('click', this.onClick.bind(this));
  },
  
  onClick: function(e) {
    // スマホ用振動
    if (navigator.vibrate) {
      navigator.vibrate(this.data.duration);
    }
    
    // VRコントローラー振動
    const gamepads = navigator.getGamepads();
    if (gamepads) {
      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
          gamepad.hapticActuators[0].pulse(this.data.value, this.data.duration);
          break;
        }
      }
    }
  }
});
```

## 振動の実装方法

### ui.jsでvibrationコンポーネントを定義

**ui.js:**
```javascript
AFRAME.registerComponent('vibration', {
  schema: {
    duration: { type: 'int', default: 100 },  // 振動時間（ミリ秒）
    value: { type: 'number', default: 0.5 }   // 振動の強さ（0.0-1.0）
  },
  
  init: function() {
    this.onClick = this.onClick.bind(this);
    this.el.addEventListener('click', this.onClick);
  },
  
  onClick: function(e) {
    this.triggerVibration();
  },
  
  triggerVibration: function() {
    try {
      // スマホ用振動
      if (navigator.vibrate) {
        navigator.vibrate(this.data.duration);
      }
      
      // VRコントローラー振動
      const gamepads = navigator.getGamepads && navigator.getGamepads();
      if (gamepads) {
        for (let i = 0; i < gamepads.length; i++) {
          const gamepad = gamepads[i];
          if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
            gamepad.hapticActuators[0].pulse(this.data.value, this.data.duration);
            break;
          }
        }
      }
    } catch (error) {
      console.error('[VIBRATION] Error:', error);
    }
  }
});
```

### vr.htmlでUI要素にvibration属性を追加

**vr.html:**
```html
<!-- InputField -->
<a-plane 
  id="passInputField"
  class="ui-input"
  ui-input="field: pass"
  vibration="duration: 100; value: 0.5">
</a-plane>

<!-- ボタン -->
<a-plane 
  id="connectButton"
  class="ui-button"
  ui-button="action: connect"
  vibration="duration: 100; value: 0.5">
</a-plane>

<!-- トグル -->
<a-plane 
  id="debugToggle"
  class="ui-toggle"
  ui-toggle
  vibration="duration: 100; value: 0.5">
</a-plane>

<!-- キーボードのキー（弱めの振動） -->
<a-plane 
  class="ui-key"
  ui-key="key: a"
  vibration="duration: 80; value: 0.4">
</a-plane>
```

## 振動の種類

### ボタン、トグル、InputField

**設定:**
- `duration: 100` - 100ミリ秒
- `value: 0.5` - 中程度の強さ

**使用例:**
```html
<a-plane vibration="duration: 100; value: 0.5"></a-plane>
```

### キーボードのキー

**設定:**
- `duration: 80` - 80ミリ秒（少し短め）
- `value: 0.4` - 少し弱め

**使用例:**
```html
<a-plane class="ui-key" vibration="duration: 80; value: 0.4"></a-plane>
```

## 振動APIの説明

### 1. navigator.vibrate()（スマホ用）

**使い方:**
```javascript
navigator.vibrate(100);  // 100ミリ秒振動
navigator.vibrate([100, 30, 100]);  // 100ms振動 → 30ms休止 → 100ms振動
```

**対応デバイス:**
- Android端末
- 一部のスマートフォン

### 2. gamepad.hapticActuators[0].pulse()（VRコントローラー用）

**使い方:**
```javascript
gamepad.hapticActuators[0].pulse(value, duration);
// value: 0.0-1.0（振動の強さ）
// duration: ミリ秒（振動の長さ）
```

**対応デバイス:**
- Oculus Touch（Quest, Rift）
- HTC Vive Controllers
- Windows Mixed Reality Controllers
- PlayStation VR Controllers

## 振動のタイミング

```
1. InputFieldをクリック
   → ブルッ（100ms, 0.5）
   → キーボードが表示される

2. キーボードのキーをクリック
   → ブルッ（80ms, 0.4）
   → 文字が入力される

3. ボタンをクリック
   → ブルッ（100ms, 0.5）
   → ボタンのアクションが実行される

4. トグルをクリック
   → ブルッ（100ms, 0.5）
   → ON/OFFが切り替わる
```

## 使い方

### VRモードでの操作

1. **VRモードに入る**
   - 右コントローラーから白い線（Ray）が出る

2. **UIをクリック**
   - Rayを向けてトリガーを引く
   - コントローラーが振動する

3. **振動を確認**
   - InputField → 中程度の振動
   - ボタン → 中程度の振動
   - キーボードのキー → 弱めの振動

### デスクトップモードでの操作

1. **マウスでクリック**
   - UI要素をクリック
   - スマホでアクセスしている場合は振動する

## デバッグ方法

### 振動が動作しているか確認

```javascript
// コンソールで手動テスト
navigator.vibrate(100);  // スマホ用振動

// Gamepad APIの確認
const gamepads = navigator.getGamepads();
console.log('Gamepads:', gamepads);

// 手動でVRコントローラー振動
for (let i = 0; i < gamepads.length; i++) {
  const gamepad = gamepads[i];
  if (gamepad && gamepad.hapticActuators) {
    gamepad.hapticActuators[0].pulse(0.5, 100);
  }
}
```

### vibrationコンポーネントの確認

```javascript
// UI要素のvibrationコンポーネントを確認
const button = document.getElementById('connectButton');
console.log('Vibration component:', button.components.vibration);

// 手動で振動をトリガー
button.components.vibration.triggerVibration();
```

## コンソールログ

### 正常動作時

```
[VIBRATION] Initialized for passInputField
[VIBRATION] Initialized for connectButton
[VIBRATION] Initialized for ui-key

[CONTROLLER CURSOR] Clicking on: passInputField
[VIBRATION] Mobile vibration triggered
[VIBRATION] VR controller vibration triggered

[UI INPUT] pass clicked
[KEYBOARD] Keyboard shown for field: pass
```

### エラー時

```
[VIBRATION] Error: [エラーメッセージ]
```

## カスタマイズ

### 振動の強さを変える

**vr.html:**
```html
<!-- 弱い振動 -->
<a-plane vibration="duration: 50; value: 0.3"></a-plane>

<!-- 中程度の振動（デフォルト） -->
<a-plane vibration="duration: 100; value: 0.5"></a-plane>

<!-- 強い振動 -->
<a-plane vibration="duration: 150; value: 0.8"></a-plane>
```

### 特定のUI要素のみ振動を変える

**例: Connectボタンを強めの振動に**
```html
<a-plane 
  id="connectButton"
  vibration="duration: 150; value: 0.7">
</a-plane>
```

**例: キーボードのキーを無振動に**
```html
<a-plane 
  class="ui-key"
  vibration="duration: 0; value: 0">
</a-plane>
```

## パフォーマンス

### 振動の頻度

- クリック時のみ実行（1回のみ）
- 短時間（80-100ms）の振動
- 連続クリックしても問題なし

### メモリ使用量

- 各UI要素にコンポーネントをアタッチ
- メモリ使用量は最小限
- パフォーマンスへの影響なし

## トラブルシューティング

### 振動が動作しない

1. ✅ VRデバイスが振動に対応しているか確認
2. ✅ `vibration`コンポーネントが追加されているか確認
3. ✅ コンソールで`[VIBRATION] Initialized`ログを確認
4. ✅ Gamepad APIが利用可能か確認

```javascript
// Gamepad APIの確認
const gamepads = navigator.getGamepads();
console.log('Gamepads available:', gamepads ? gamepads.length : 0);
```

### スマホでは振動するがVRでは振動しない

1. ✅ VRコントローラーが接続されているか確認
2. ✅ `gamepad.hapticActuators`が存在するか確認
3. ✅ ブラウザがGamepad APIに対応しているか確認

### VRでは振動するがスマホでは振動しない

1. ✅ スマホのサイレントモード、バイブレーション設定を確認
2. ✅ ブラウザがVibration APIに対応しているか確認
3. ✅ HTTPS接続で動作しているか確認

### 振動が強すぎる/弱すぎる

**vr.htmlで調整:**
```html
<!-- 強さを変える -->
<a-plane vibration="duration: 100; value: 0.3"></a-plane>  <!-- 弱く -->
<a-plane vibration="duration: 100; value: 0.8"></a-plane>  <!-- 強く -->

<!-- 長さを変える -->
<a-plane vibration="duration: 50; value: 0.5"></a-plane>   <!-- 短く -->
<a-plane vibration="duration: 200; value: 0.5"></a-plane>  <!-- 長く -->
```

## 参考コード

実装は以下のコードを参考にしました：

```html
<script>
  AFRAME.registerComponent('vibration', {
    schema: {
      duration: {type: 'int', default: 200},
      value: {type: 'number', default: 0.5}
    },
    init: function() {
      this.onClick = this.onClick.bind(this);
      this.el.addEventListener('click', this.onClick);
      this.el.setAttribute('class', 'collidable');
    },
    onClick: function(e) {
      navigator.vibrate(this.data.duration); // スマホ用振動
      // oculus touch等のコントローラー振動
      var gamepads = navigator.getGamepads && navigator.getGamepads();
      for (var i = 0; gamepads.length; i++) {
        var gamepad = gamepads[i];
        gamepad.hapticActuators[0].pulse(this.data.value, this.data.duration);
      }
    }
  });
</script>
```

**改善点:**
- エラーハンドリングを追加
- gamepadのnullチェックを追加
- hapticActuatorsの存在チェックを追加
- forループの条件を修正（`i < gamepads.length`）
- コンソールログを追加

## 参考情報

- [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)
- [WebXR Gamepads Module](https://www.w3.org/TR/webxr-gamepads-module-1/)
- [A-Frame Components](https://aframe.io/docs/1.5.0/introduction/writing-a-component.html)

## ライセンス

このプロジェクトは教育目的のサンプルコードです。
