---
name: add-module
description: 新しいES6モジュールを作成しapp.jsの初期化チェーンに統合する
user_invocable: true
---

# /add-module — 新機能モジュールのスキャフォールド

新しいES6モジュールを `js/` に作成し、既存の初期化チェーンに統合する。

## 手順

1. ユーザーに以下を確認:
   - モジュール名（ファイル名）
   - 機能の概要
   - state.jsへの追加が必要なプロパティ
   - scene.jsとの連携が必要か（循環依存の可能性）

2. `js/<モジュール名>.js` を以下のテンプレートで作成:
   ```js
   import * as THREE from 'three';
   import { state } from './state.js';

   // 必要に応じて他モジュールをimport
   // import { someFunc } from './parts.js';

   export function init<ModuleName>() {
     // 初期化処理
   }
   ```

3. **state.jsの拡張**: 必要なプロパティを `state` オブジェクトに追加:
   ```js
   // js/state.js の state オブジェクトに追加
   newProperty: defaultValue,
   ```

4. **app.jsへの統合**: importを追加し、初期化チェーンの適切な位置で呼び出す:
   ```js
   import { initNewModule } from './newModule.js';
   // 初期化チェーン内の適切な位置で:
   initNewModule();
   ```
   初期化順序の制約:
   - `initThree()` → `initInteraction()` → `initOrbitControls()` の順序は変更不可
   - UI関連は `initOrbitControls()` の後
   - 新モジュールは通常 `initIO()` の前に追加

5. **UIが必要な場合**: `index.html` と `css/style.css` も修正。

6. **循環依存が発生する場合**: Callback Injection Patternを使用:
   ```js
   // 新モジュール.js
   let callbackFn = () => {};
   export function setNewModuleCallbacks({ callback }) {
     callbackFn = callback;
   }

   // 呼び出し側.js — initで注入
   import { setNewModuleCallbacks } from './newModule.js';
   setNewModuleCallbacks({ callback: actualFunction });
   ```

## 重要な規約
- import文のパスには `.js` 拡張子を必ず付ける
- Three.jsは `import * as THREE from 'three'` のみ（`three/examples` は不可）
- UI文言はすべて日本語
- window直接公開が必要な関数は `window.funcName = funcName` で登録

## 修正対象ファイル
- `js/<新モジュール>.js` — 新規作成
- `js/state.js` — 状態プロパティ追加
- `js/app.js` — import追加、初期化チェーンに追加
- `index.html` — UI要素が必要な場合
- `css/style.css` — スタイルが必要な場合
