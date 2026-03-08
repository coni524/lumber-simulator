---
name: ui-extend
description: UI要素の追加・変更（ボタン、パネル、入力フィールド等）
user_invocable: true
---

# /ui-extend — UI要素の追加・変更

既存のデザインシステムに沿ってUI要素を追加・変更する。

## デザインシステム

### カラーパレット
| 変数的用途 | 色 | 用途 |
|-----------|-----|------|
| bg-app | `#1a1a2e` | アプリ背景、入力背景 |
| bg-panel | `#16213e` | パネル背景 |
| border / active | `#0f3460` | ボーダー、ヘッダー背景、アクティブ状態 |
| accent | `#e94560` | アクセント（ヘッダー文字、ホバー、アクティブボタン） |
| text-primary | `#e0e0e0` | 主テキスト |
| text-secondary | `#888` | ラベル、ヒント |

### フォント
`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- ラベル・寸法: 11px
- ボタン・入力: 12px
- カタログ項目: 13px
- パネル見出し: 14px

### コンポーネントパターン

**ツールバーボタン追加**:
```html
<!-- index.html: #toolbar内に追加 -->
<button class="tb-btn" onclick="newFunction()" title="説明テキスト">
  アイコン ラベル
</button>
```
```css
/* 既存の .tb-btn スタイルが適用される */
```

**プロパティフィールド追加**:
```html
<!-- index.html: #prop-editor内に追加 -->
<div class="prop-group">
  <label>ラベル名</label>
  <input type="number" id="prop-new-field" step="1">
</div>
```
```js
// js/ui.js: bindPropertyInputs()内でイベントリスナーを追加
document.getElementById('prop-new-field').addEventListener('change', (e) => {
  // 値の反映処理
});
```

**サイドパネルセクション追加**:
```html
<!-- index.html: #properties内に追加 -->
<div id="new-section" style="display:none;">
  <h3>セクション名</h3>
  <!-- 内容 -->
</div>
```
```css
#properties h3 {
  /* 既存スタイル: padding:10px 16px, font-size:12px, color:#e94560 */
}
```

**キーボードショートカット追加**:
```js
// js/ui.js: initKeyboard()内のkeydownハンドラに追加
// 入力フィールドフォーカス時はスキップされる（既存ガード済み）
case 'KeyN':
  newFunction();
  break;
```

**モーダルダイアログ追加**:
```js
// js/io.js のパターンに従う
// showModal(title, content) / closeModal() を使用
```

### 日本語用語リスト
| 英語 | 日本語 |
|------|--------|
| Select | 選択 |
| Move | 移動 |
| Rotate | 回転 |
| Delete | 削除 |
| Duplicate | 複製 |
| Copy | コピー |
| Paste | 貼り付け |
| Group | グループ化 |
| Ungroup | グループ解除 |
| Save | 保存 |
| Load / Open | 開く |
| Snap | スナップ |
| Dimensions | 寸法 |
| Properties | プロパティ |
| Catalog | カタログ |
| Length | 長さ |
| Width | 幅 |
| Height | 高さ |
| Position | 位置 |
| Rotation | 回転 |
| Name | 名前 |
| Type | タイプ |
| Color | 色 |
| Parts List | パーツ一覧 |

## 修正対象ファイル
- `index.html` — HTML要素追加
- `css/style.css` — スタイル追加
- `js/ui.js` — イベントバインディング、DOM操作
- `js/state.js` — UI状態の追加が必要な場合
