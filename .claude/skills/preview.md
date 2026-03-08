---
name: preview
description: ローカルプレビューサーバを起動する
user_invocable: true
---

# /preview — ローカルプレビューサーバ起動

ES modulesは `file://` プロトコルでは動作しないため、HTTPサーバでローカルプレビューを起動する。

## 手順

1. プロジェクトルートで以下を実行:
   ```bash
   python3 -m http.server 8000
   ```

2. ブラウザで http://localhost:8000 を開く

3. サーバを停止するには Ctrl+C

## 注意事項
- ポート8000が使用中の場合は別のポートを指定: `python3 -m http.server 8080`
- 変更の反映にはブラウザのリロード（Cmd+R / Ctrl+R）が必要（ホットリロードなし）
- キャッシュが残る場合はハードリロード（Cmd+Shift+R / Ctrl+Shift+R）を使用
