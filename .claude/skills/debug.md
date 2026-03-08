---
name: debug
description: サブシステム別のデバッグ支援
user_invocable: true
---

# /debug — デバッグ支援

ユーザーが報告する問題に対し、サブシステム別にデバッグを行う。

## サブシステム別ガイド

### レンダリング問題
- メッシュが表示されない → `state.parts`にパーツが存在するか、`mesh.visible`がtrueか確認
- 色がおかしい → `mesh.material`のcolorと`part.color`の同期を確認
- 影が出ない → `mesh.castShadow`/`receiveShadow`の設定確認
- テクスチャが表示されない → `textures.js`のcanvas生成を確認

### インタラクション問題
- クリックしても選択されない → `state.currentMode`を確認、raycasterのhit対象確認
- ドラッグが効かない → `state.isDragging`の状態、`dragPlane`の法線確認
- 回転がおかしい → 度/ラジアン変換の確認（`part.rx`等は度で格納）
- Shift+ドラッグで垂直移動しない → `keysPressed['ShiftLeft']`の状態確認

### データ整合性
- パーツデータとメッシュが非同期 → `syncMeshToPart()`が呼ばれているか確認
- 削除後にゴーストが残る → `scene.remove(mesh)`と`state.parts`からの除去の両方を確認
- グループ操作後に状態がおかしい → `state.groups`と各partのid対応を確認

### 衝突検出
- 誤判定 → `COLLISION_MARGIN`(2mm)の影響、回転パーツのAABB拡大を確認
- 衝突チェックが遅い → O(n²)のため大量パーツ時に注意

### UI問題
- プロパティパネルが更新されない → `updatePropertyPanel()`の呼び出し確認
- カタログが空 → `buildCatalog()`が呼ばれているか確認
- ボタンが反応しない → `window.functionName`の登録確認（onclick属性用）

### 入出力
- 読込後にパーツが表示されない → JSONバージョン確認（v1→v2変換ロジック）
- 保存データが壊れている → `mesh`プロパティの除外確認

## よくある問題パターン

| 問題 | 原因 | 対処 |
|------|------|------|
| メッシュとデータの不一致 | `syncMeshToPart()`呼び忘れ | 位置/回転変更後に必ず呼ぶ |
| 衝突の誤判定 | 回転パーツのAABBが拡大 | 回転時のBBox再計算を確認 |
| 選択状態の破損 | `selectedPart`と`selectedParts`の不整合 | `clearSelection()`で一旦リセット |
| Three.js r128制約 | `three/examples`のimport | bare `'three'` のみ使用可能 |
| import解決エラー | `.js`拡張子の欠落 | 全相対importに`.js`を付与 |

## DevToolsでのstate確認

ブラウザコンソールで以下を実行:
```js
// state.jsをES moduleとしてimport（DevTools Consoleでは直接アクセス不可）
// 代替: app.jsでデバッグ用にwindowに公開する
// js/app.js に一時的に追加:
import { state } from './state.js';
window._state = state;

// その後コンソールで:
_state.parts              // 全パーツ
_state.selectedPart       // 選択中のパーツ
_state.selectedParts      // 複数選択
_state.groups             // グループ
_state.currentMode        // 現在のモード
_state.partSnapEnabled    // スナップの有効/無効
```

## デバッグ手順

1. ユーザーから問題の症状を聞く
2. 上記のサブシステムのうち該当するものを特定
3. 関連するソースファイルを読んで問題箇所を特定
4. 修正を提案・実施
