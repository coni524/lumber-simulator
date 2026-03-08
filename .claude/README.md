# .claude/ ディレクトリ

Claude Code（Anthropic CLI）用の設定ファイル群。開発時の自動チェックとよく使う作業のスキル（スラッシュコマンド）を提供する。

## ファイル構成

```
.claude/
├── README.md              ← このファイル
├── settings.json          ← hooks設定
├── hooks/                 ← フックスクリプト
│   ├── check-lumber-ids.sh    PostToolUse: lumber ID一意性チェック
│   ├── check-imports.sh       PostToolUse: JS import規約チェック
│   └── pre-commit-check.sh   PreToolUse:  コミット前のコアファイル存在確認
└── skills/                ← スラッシュコマンド
    ├── add-lumber.md          /add-lumber:  木材タイプ追加
    ├── add-module.md          /add-module:  新モジュールのスキャフォールド
    ├── ui-extend.md           /ui-extend:   UI要素の追加・変更
    ├── debug.md               /debug:       デバッグ支援
    ├── preview.md             /preview:     ローカルプレビューサーバ起動
    ├── validate.md            /validate:    コード整合性チェック
    └── spec.md                /spec:        仕様書(docs/SPEC.md)の更新
```

## Hooks（自動チェック）

`settings.json` で定義。Claude Codeがファイル編集やコマンド実行を行う際に自動で発火する。

### PostToolUse（Edit/Write後）

| スクリプト | 対象 | チェック内容 |
|-----------|------|-------------|
| `check-lumber-ids.sh` | `js/lumber.js` | LUMBER_CATALOGの全IDが一意であること |
| `check-imports.sh` | `js/*.js` | 相対importに`.js`拡張子があること、`three/examples`を使っていないこと |

### PreToolUse（Bash実行前）

| スクリプト | 対象 | チェック内容 |
|-----------|------|-------------|
| `pre-commit-check.sh` | `git commit` | 12個のコアファイルが全て存在すること |

フックが問題を検出するとexit code 2を返し、Claudeにエラーメッセージが表示される。

## Skills（スラッシュコマンド）

Claude Codeのプロンプトで `/コマンド名` と入力すると、対応するスキルが実行される。

| コマンド | 用途 |
|---------|------|
| `/add-lumber` | `js/lumber.js` のLUMBER_CATALOGに新しい木材タイプを追加 |
| `/add-module` | 新ES6モジュールを `js/` に作成し、app.jsの初期化チェーンに統合 |
| `/ui-extend` | デザインシステムに沿ったUI要素の追加・変更 |
| `/debug` | サブシステム別のデバッグガイドに基づく問題調査 |
| `/preview` | `python3 -m http.server 8000` でローカルプレビュー起動 |
| `/validate` | import整合性・ID一意性・export対応などの全体チェック |
| `/spec` | 機能変更後に `docs/SPEC.md` を最新状態に更新 |
