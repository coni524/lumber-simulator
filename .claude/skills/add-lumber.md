---
name: add-lumber
description: LUMBER_CATALOGに新しい木材タイプを追加する
user_invocable: true
---

# /add-lumber — 木材タイプ追加

ユーザーが指定する木材タイプを `js/lumber.js` の `LUMBER_CATALOG` に追加する。

## 手順

1. ユーザーに以下を確認:
   - 木材の名称（例: "2x12"）
   - カテゴリ（SPF材(1x) / SPF材(2x) / 角材 / 板材 / 新規カテゴリ）
   - 断面寸法 width(mm) × height(mm)（下記リファレンス参照）
   - デフォルト長さ (mm)
   - カラー（省略時はカテゴリ内の既存色を踏襲）

2. `js/lumber.js` を読み、`LUMBER_CATALOG` の該当カテゴリにエントリを追加:
   ```js
   { id: '<一意のID>', name: '<表示名>', width: <mm>, height: <mm>, defaultLength: <mm>, color: '<hex>' }
   ```

3. **IDの一意性を確認**: 全カテゴリの全itemsのidと重複しないこと。

4. 追加後にファイルを保存。PostEditFileフックがID一意性を自動検証する。

## SPF材 実寸法リファレンス（公称→実寸 mm）

| 公称 | 実寸 width | 実寸 height |
|------|-----------|------------|
| 1x2  | 19 | 38 |
| 1x3  | 19 | 63 |
| 1x4  | 19 | 89 |
| 1x6  | 19 | 140 |
| 1x8  | 19 | 184 |
| 1x10 | 19 | 235 |
| 1x12 | 19 | 286 |
| 2x2  | 38 | 38 |
| 2x3  | 38 | 63 |
| 2x4  | 38 | 89 |
| 2x6  | 38 | 140 |
| 2x8  | 38 | 184 |
| 2x10 | 38 | 235 |
| 2x12 | 38 | 286 |
| 4x4  | 89 | 89 |

※ width = Z方向（奥行き/厚み）、height = Y方向（高さ）

## 修正対象ファイル
- `js/lumber.js` — LUMBER_CATALOGへのエントリ追加のみ
