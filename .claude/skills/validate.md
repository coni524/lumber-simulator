---
name: validate
description: コードの整合性チェックを実行する
user_invocable: true
---

# /validate — コード整合性チェック

プロジェクト全体の整合性を検証する。

## チェック項目

### 1. Import整合性
- 全 `js/*.js` ファイルの相対importに `.js` 拡張子が付いているか
- `three/examples` の誤使用がないか（bare `'three'` のみ許可）
- importしているモジュールファイルが実際に存在するか

### 2. LUMBER_CATALOG ID一意性
- `js/lumber.js` の全カテゴリの全itemsで `id` が重複していないか

### 3. Export/Import対応
- 各モジュールがexportしている関数/変数が、import先で正しく参照されているか
- `app.js` の初期化チェーンで呼ばれている関数が各モジュールからexportされているか

### 4. HTML要素ID/onclick整合性
- `index.html` の `onclick` 属性で参照される関数が `window` に公開されているか
- JSから `document.getElementById()` で参照されるIDが `index.html` に存在するか

### 5. コアファイル存在確認
以下のファイルが全て存在するか:
- `index.html`
- `css/style.css`
- `js/app.js`, `js/state.js`, `js/lumber.js`, `js/scene.js`
- `js/parts.js`, `js/interaction.js`, `js/ui.js`, `js/io.js`
- `js/dimensions.js`, `js/textures.js`

### 6. Three.jsリソースdispose漏れ
- `scene.remove()` を呼ぶ箇所で `geometry.dispose()` と `material.dispose()` も呼ばれているか
- 特に `removePart()` と一括削除系の処理を確認

## 実行方法

上記チェック項目を順番に確認し、問題があれば報告・修正する。
全JSファイルを読み、`index.html` も確認して整合性を検証する。
