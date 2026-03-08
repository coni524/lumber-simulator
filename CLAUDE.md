# 2x4cad — 2x4材 3D CADツール

2x4材（SPF材）を使った構造物を3Dで設計するブラウザベースのCADツール。

## 技術スタック

- **Vanilla JS** (ES6 modules) — ビルドツールなし
- **Three.js r128** — CDN経由、`index.html`の`<script type="importmap">`で提供
- **import制約**: bare specifier `'three'` のみ使用可能。`three/examples/...` は**使用不可**（CDN importmapに含まれないため）
- ローカル実行には `python3 -m http.server 8000` 等のHTTPサーバが必要（ES modulesはfile://で動作しない）

## ファイル構成とモジュール依存

```
index.html          ← エントリ、importmap、UIレイアウト
css/style.css       ← 全スタイル（ダークテーマ）
js/
  app.js            ← 初期化チェーン、アニメーションループ
  state.js          ← グローバル状態シングルトン（全モジュールが直接import・mutate）
  lumber.js         ← LUMBER_CATALOG定義、findLumberDef()
  scene.js          ← Three.jsセットアップ、カメラ、callback injection
  parts.js          ← Part/Group CRUD、メッシュ管理、スナップ
  interaction.js    ← ドラッグ/回転/選択ロジック
  ui.js             ← DOM構築（カタログ、プロパティ、ツールバー、キーボード）
  io.js             ← JSON保存/読込、モーダル
  dimensions.js     ← 寸法表示（3Dスプライト+ライン）
  textures.js       ← 手続き的テクスチャ生成（木目、床）
docs/SPEC.md        ← 機能仕様書
```

**依存の流れ**: `app.js` → 各モジュール。`state.js`と`lumber.js`はリーフモジュール。

## 重要なパターン

### State管理
`state.js`がエクスポートする`state`オブジェクトを全モジュールが直接import・mutateする。リアクティブシステムなし。

### 循環依存回避 — Callback Injection
`scene.js`と`interaction.js`は相互に参照が必要だが、循環importを避けるため:
1. `scene.js`がスタブ関数変数を宣言し、`setSceneCallbacks()`をexport
2. `interaction.js`の`initInteraction()`内で`setSceneCallbacks()`を呼び具体関数を注入
3. `app.js`が`initInteraction()` → `initOrbitControls()`の順で呼ぶことで、イベントハンドラ実行時にはコールバックが設定済み

### 座標系
- 右手系: X=右、Y=上、Z=手前、床面Y=0
- 木材はX軸方向に延伸: `BoxGeometry(length, height, width)`
- 単位はすべて**mm**
- 回転は度(degrees)で格納、Three.js適用時にラジアン変換

### 木材追加方法
`js/lumber.js`の`LUMBER_CATALOG`配列に`{ id, name, width, height, defaultLength, color }`エントリを追加。idは全カテゴリ内で一意であること。

### 新モジュール追加手順
1. `js/新モジュール.js`を作成（`import * as THREE from 'three'`、`import { state } from './state.js'`）
2. `init関数()`をexportし、必要なstate拡張を`js/state.js`に追加
3. `js/app.js`でimportし、初期化チェーンの適切な位置でinit関数を呼ぶ
4. scene.jsとの循環依存が発生する場合はcallback injection patternを使用

## UI言語

すべて**日本語**で表示する。

## 仕様書

詳細な機能仕様は [docs/SPEC.md](docs/SPEC.md) を参照。
