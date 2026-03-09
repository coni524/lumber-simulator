# 2x4cad 機能仕様書

## 1. 製品概要

2x4材（SPF材）を使った構造物の3D設計ツール。ブラウザ上で動作し、木材の配置・回転・スナップ・グループ化を行い、JSON形式で保存/読込できる。

## 2. 機能一覧

| 機能 | 説明 |
|------|------|
| カタログ閲覧 | SPF 1x系・2x系・角材・板材から木材を選択して配置 |
| 3Dビューポート | Three.jsによるリアルタイム3D表示、軌道カメラ |
| 選択 | 単体クリック / Shift+クリック複数選択 / グループ一括選択 |
| 移動 | XZ平面ドラッグ / Shift+ドラッグで垂直(Y)移動 |
| 回転 | 右クリックドラッグで面軸回転(15°スナップ) / 回転モードでY軸回転 |
| プロパティ編集 | 名前・タイプ・長さ・色・位置・回転の直接入力 |
| スナップ | グリッド10mm、面間50mm閾値の自動吸着 |
| 衝突検出 | 2mmマージンのAABB衝突判定、赤ハイライト表示 |
| グループ化 | 最大10グループ、Ctrl+G / Ctrl+Shift+G |
| 寸法表示 | 全体寸法(X/Y/Z)の3Dオーバーレイ |
| コピー/ペースト | Ctrl+C/V、単体・複数対応 |
| 複製 | Ctrl+D、100mmオフセット配置 |
| JSON保存/読込 | バージョン2フォーマット、モーダルUIで操作 |
| 接地面表示 | 床面接触面をピンク半透明でハイライト（毎フレーム更新） |

## 3. データモデル

### Part（木材パーツ）
```
{
  id: number           // 自動採番 (state.partCounter)
  name: string         // 例: "2x4 #3"
  lumberId: string     // LUMBER_CATALOGのid (例: '2x4')
  length: number       // mm, X軸方向
  width: number        // mm, Z軸方向 (LumberDefより)
  height: number       // mm, Y軸方向 (LumberDefより)
  color: string        // 16進カラー文字列
  x, y, z: number      // ワールド座標 (mm)
  rx, ry, rz: number   // 回転 (度)
  mesh: THREE.Mesh     // Three.jsメッシュ参照 (保存時は除外)
}
```

### Group（グループ）
```
{
  id: number           // 自動採番 (state.groupCounter)
  name: string         // 例: "グループ #1"
  partIds: number[]    // 所属するPartのid配列
}
```

### LumberDef（木材定義）
```
{
  id: string           // 一意識別子 (例: '2x4')
  name: string         // 表示名 (例: '2x4')
  width: number        // mm, Z方向の厚み
  height: number       // mm, Y方向の高さ
  defaultLength: number // mm, デフォルトの長さ
  color: string        // デフォルトカラー
}
```

### 保存フォーマット (JSON v2)
```json
{
  "version": 2,
  "name": "Lumber Project",
  "created": "ISO 8601文字列",
  "parts": [{
    "id": 1,
    "name": "2x4 #1",
    "lumberId": "2x4",
    "length": 1820,
    "color": "#c4956a",
    "position": { "x": 0, "y": 44.5, "z": 0 },
    "rotation": { "x": 0, "y": 0, "z": 0 }
  }],
  "groups": [{
    "id": 1,
    "name": "グループ #1",
    "partIds": [1, 2, 3]
  }]
}
```

## 4. 座標系

- **右手座標系**: X=右、Y=上、Z=手前
- **床面**: Y=0
- **単位**: mm
- **木材の延伸方向**: X軸（`BoxGeometry(length, height, width)`）
- **デフォルト配置**: 床面に接地（`y = height / 2`）

## 5. 操作モデル

### モード制
| モード | キー | 動作 |
|--------|------|------|
| select | V | クリック選択、ドラッグ移動 |
| move | G | ドラッグで移動 |
| rotate | R | ドラッグでY軸回転(15°スナップ) |

### キーボードショートカット
| キー | 動作 |
|------|------|
| V | 選択モード |
| G | 移動モード |
| R | 回転モード |
| Delete / Backspace | 選択パーツ削除 |
| Ctrl+D / Cmd+D | 複製 |
| Ctrl+C / Cmd+C | コピー |
| Ctrl+V / Cmd+V | ペースト |
| Ctrl+G / Cmd+G | グループ化 |
| Ctrl+Shift+G / Cmd+Shift+G | グループ解除 |
| W/A/S/D (長押し) | カメラ平行移動 |
| Space (長押し) | カメラ上昇 |
| Shift+Space (長押し) | カメラ下降 |

### マウス操作
| 操作 | 対象 | 動作 |
|------|------|------|
| 左クリック | パーツ | 選択（グループ全体を選択） |
| 左クリック | 空白 | 選択解除 |
| Shift+クリック | パーツ | 複数選択のトグル |
| 左ドラッグ | パーツ | XZ平面移動 |
| Shift+ドラッグ | パーツ | Y軸移動（垂直） |
| Cmd+ドラッグ (Mac) / Ctrl+ドラッグ (Win) | パーツ | 長さ伸縮（端面スナップ対応） |
| 右ドラッグ | パーツ | 面軸回転（15°スナップ） |
| 左ドラッグ | 空白 | 軌道カメラ回転 |
| 中ドラッグ / 右ドラッグ(空白) | - | カメラパン |
| ホイール | - | ズーム (200–15000mm) |

### 面軸回転マッピング
- 端面（X法線）→ Z軸回転
- 天面/底面（Y法線）→ X軸回転
- 側面（Z法線）→ Y軸回転

## 6. UIレイアウト

3パネル構成（flexbox）:

```
┌───────────┬──────────────────────┬────────────┐
│ #catalog  │ #viewport            │#properties │
│ 220px     │ flex:1               │ 280px      │
│           │                      │            │
│ カタログ   │ ツールバー(左上)      │ プロパティ   │
│ リスト     │ 3Dキャンバス          │ エディタ    │
│           │ ステータスバー(下部)   │ パーツ一覧  │
└───────────┴──────────────────────┴────────────┘
```

### プロパティパネルの状態
- **未選択時**: `#no-selection` — 説明テキスト表示
- **単体選択時**: `#prop-editor` — 全プロパティフィールド表示
- **複数選択時**: `#multi-selection` — 選択数、グループ/削除/複製ボタン

## 7. スナップシステム

### グリッドスナップ
- 間隔: 10mm (`GRID_SNAP`)
- 移動時に全座標を10mm単位に丸め

### 面間スナップ
- 閾値: 50mm (`SNAP_THRESHOLD`)
- 6面ペアの重なり判定（SAT射影テスト）
- 反平行面（dot < -0.95）→ 接触スナップ
- 平行面（dot > 0.95）→ 面一スナップ
- 軸方向ごとに最大1スナップ適用

### 衝突検出
- マージン: 2mm (`COLLISION_MARGIN`)
- AABB（軸整列バウンディングボックス）判定
- 衝突時: エッジ赤ハイライト表示

## 8. 技術制約

- ビルドツールなし（Vanilla ES modules）
- Three.js r128（CDN importmap）
- `import * as THREE from 'three'` のみ。`three/examples/...` は使用不可
- ES modulesのため `file://` では動作しない（HTTPサーバ必須）
- 全UIテキストは日本語
- import文のパスには `.js` 拡張子が必須

## 9. Three.jsシーン設定

- **カメラ**: PerspectiveCamera(fov=50, near=1, far=50000)
- **レンダラ**: WebGLRenderer(antialias), PCFSoftShadowMap
- **照明**: AmbientLight(0.65) + DirectionalLight(0.7, 影あり) + HemisphereLight(0.4)
- **床**: PlaneGeometry(8000x8000), ダイヤモンドグリッドテクスチャ
- **グリッド**: GridHelper(4000, 40分割)
- **軌道カメラ**: 球面座標(theta, phi, distance)、ターゲット(0,300,0)

## 10. 定数

| 定数名 | 値 | 説明 |
|--------|-----|------|
| GRID_SNAP | 10 | グリッドスナップ間隔 (mm) |
| SNAP_THRESHOLD | 50 | 面間スナップ検出距離 (mm) |
| COLLISION_MARGIN | 2 | 衝突判定マージン (mm) |
| MAX_GROUPS | 10 | 最大グループ数 |
