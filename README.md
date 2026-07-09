# Insert Callout

An Obsidian plugin that quickly inserts [callouts](https://help.obsidian.md/callouts) via a type-selection dialog.

[日本語の説明はこちら](#insert-callout-日本語)

## Features

- Run the **Insert callout** command to open a suggestion dialog for the callout type
  - Filter by typing (e.g. `wa` → warning), pick with ↑/↓ + Enter or a mouse click
  - **Recently used types appear at the top** of the list, so pressing Enter reuses the last one
- **Autocomplete in quote blocks**: typing `[!` right after `>` pops up the same suggestion list
  - Keep typing to narrow down the candidates (e.g. `[!wa` → warning)
  - Selecting a candidate inserts the complete callout heading (e.g. `[!warning] `)
  - Candidates are ordered by most recently used
- **No selection**: the cursor line is turned into a callout and the cursor is placed in the body
- **With selection**: the selected lines become the body of the callout

The inserted callout is the simple form (type only, no fold marker):

```markdown
> [!note]
> body text
```

## Settings

- **Callout types**: edit the types shown in the dialog and their order, one type per line.
  Custom callout names are also allowed.
- **Don't insert the closing `]`** (default: on): when autocompleting, an existing `]` right
  after the cursor is not duplicated. Keep this on if Obsidian auto-pairs `[` with `]`.
- **Reset to defaults**: restores the 13 built-in Obsidian types
  (note, abstract, info, todo, tip, success, question, warning, failure, danger, bug, example, quote).

## Installation (manual)

Copy the following files into `.obsidian/plugins/insert-callout/` in your vault,
then enable the plugin under Settings → Community plugins:

- `main.js`
- `manifest.json`
- `styles.css`

## Development

```bash
npm install
npm run build   # type check + build main.js
npm run dev     # watch build
```

## License

[MIT](LICENSE)

---

# Insert Callout (日本語)

Obsidian に Callout を素早く挿入するプラグイン。

## 機能

- コマンド **Insert callout** を実行すると、Callout の種類を選ぶダイアログが開く
  - 文字入力で絞り込み(例: `wa` → warning)、↑↓ + Enter またはクリックで決定
  - **最近使った種類がリスト先頭**に表示され、Enter だけで再利用できる
- **引用ブロック内のオートコンプリート**: `>` の直後に `[!` と入力すると候補リストが表示される
  - 続けて入力すると候補が絞り込まれる(例: `[!wa` → warning)
  - 候補を選択すると完全な Callout 見出しが挿入される(例: `[!warning] `)
  - 候補は最近使った順に並ぶ
- **選択範囲がない場合**: カーソル行を Callout に変換し、カーソルを本文位置にセット
- **選択範囲がある場合**: 選択した行(複数行可)を Callout の本文に変換

挿入されるのは種類のみのシンプルな形式(折りたたみ記号なし):

```markdown
> [!note]
> 本文
```

## 設定

- **Callout の種類**: ダイアログに表示する種類と順序を、1行1種類のテキストで編集。
  カスタム Callout 名も追加可能。
- **終わりの "]" を挿入しない**(デフォルト: オン): オートコンプリートで挿入するとき、
  カーソル直後に既にある `]` を重複させない。Obsidian が `[` の入力時に `]` を
  自動補完する環境ではオンのままにする。
- **デフォルトに戻す**: Obsidian 組み込みの13種類
  (note, abstract, info, todo, tip, success, question, warning, failure, danger, bug, example, quote)にリセット。

## インストール(手動)

Vault の `.obsidian/plugins/insert-callout/` に以下の3ファイルを置き、
Obsidian の設定 → コミュニティプラグイン で有効化する。

- `main.js`
- `manifest.json`
- `styles.css`

## 開発

```bash
npm install
npm run build   # 型チェック + main.js 生成
npm run dev     # watch ビルド
```

※ Google Drive 上のフォルダでは `npm install` が失敗することがあるため、
その場合はローカルディスクにコピーしてビルドし、`main.js` を戻す。
