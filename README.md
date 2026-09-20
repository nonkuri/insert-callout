# Insert Callout

An Obsidian plugin that quickly inserts [callouts](https://help.obsidian.md/callouts) in two ways: a type-selection dialog command, and autocomplete that pops up when you type `[!` in a quote block. In both, the suggestions are ordered by most recently used. A remove command strips callouts and their quote markers. A sidebar list shows the current note's callouts and lets you jump to them.

[日本語の説明はこちら](#insert-callout-日本語)

## Features

- Run the **Insert** command (shown as *Insert Callout: Insert*) to open a suggestion dialog
  for the callout type
  - Filter by typing (e.g. `wa` → warning), pick with ↑/↓ + Enter or a mouse click
  - **Recently used types appear at the top** of the list, so pressing Enter reuses the last one
- **Autocomplete in quote blocks**: typing `[!` right after `>` pops up the same suggestion list
  - Keep typing to narrow down the candidates (e.g. `[!wa` → warning)
  - Selecting a candidate inserts the complete callout heading (e.g. `[!warning] `)
  - Candidates are ordered by most recently used
- **No selection**: the cursor line is turned into a callout and the cursor is placed in the body
- **With selection**: the selected lines become the body of the callout
- Run the **Remove** command (shown as *Insert Callout: Remove*) to undo it: the heading line
  is removed and the quote
  markers are stripped as well (see [Removing a callout](#removing-a-callout))
- Run **Open callout list** to show the current note's callouts in the right sidebar
  and click an entry to jump to it (see [Callout list](#callout-list))

The inserted callout is the simple form (type only, no fold marker):

```markdown
> [!note]
> body text
```

## Callout list

Run **Insert Callout: Open callout list** from the command palette, or click the
**Open callout list** ribbon icon, to open a **Callouts** tab in the right sidebar.
It lists callouts in the current note in document order, with their type icons and
titles (or the type name when no title is supplied). Nested quotes are indented.
Click an entry, or focus it with Tab and press Enter, to jump to its location.
The list follows note changes and updates shortly after editing. It excludes fenced
code examples, indented code, frontmatter, and comments. Custom callout types are included.
The tab can be moved or closed like other Obsidian sidebar tabs; the command reopens it.
The list covers the current note, not the entire vault. If the note changes before a
click is processed, the list refreshes and asks you to select the entry again.

## Removing a callout

Run the **Remove** command with the cursor anywhere inside a callout:

- The `> [!type]` heading line is deleted, and **one level of quote markers is stripped**
  from the rest of the block — so a plain callout becomes plain text, quoting included
- If the heading has a title (`> [!note] Title`), the title is kept as the first body line
- Nested quotes lose one level only (`> > text` → `> text`)
- It also works on a plain quote block with no callout heading, which simply unquotes it
- The whole quote block around the cursor is processed, even if only part of it is selected

```markdown
> [!note]        →   body text
> body text
```

## Settings

- **Callout types**: edit the types shown in the dialog and their order, one type per line.
  Custom callout names are also allowed.
- **Don't insert the closing bracket** (default: on): when autocompleting, an existing `]`
  right after the cursor is not duplicated. Keep this on if Obsidian auto-pairs `[` with `]`.
- **Reset to defaults**: restores the 13 built-in Obsidian types
  (note, abstract, info, todo, tip, success, question, warning, failure, danger, bug, example, quote).

## Installation (manual)

Requires Obsidian 1.13.0 or later. Copy the following files into `.obsidian/plugins/insert-callout/` in your vault,
then enable the plugin under Settings → Community plugins:

- `main.js`
- `manifest.json`
- `styles.css`

When updating manually, replace all three files with the assets from the same
[release](https://github.com/nonkuri/insert-callout/releases), then reload the plugin
(disable and enable it) or restart Obsidian.

## Development

```bash
npm install
npm run build   # type check + build main.js
npm test        # callout list regression tests
npm run dev     # watch build
```

## License

[MIT](LICENSE)

---

# Insert Callout (日本語)

Obsidian に Callout を素早く挿入するプラグイン。種類選択ダイアログを開くコマンドと、
引用ブロック内で `[!` と入力すると表示されるオートコンプリートの2つの方法があり、
どちらも候補は最近使った順に並ぶ。引用ごと Callout を解除するコマンドと、
現在のノートの Callout を一覧表示してその位置へ移動できるサイドバーもある。

## 機能

- コマンド **Insert**(表示は *Insert Callout: Insert*)を実行すると、Callout の種類を選ぶダイアログが開く
  - 文字入力で絞り込み(例: `wa` → warning)、↑↓ + Enter またはクリックで決定
  - **最近使った種類がリスト先頭**に表示され、Enter だけで再利用できる
- **引用ブロック内のオートコンプリート**: `>` の直後に `[!` と入力すると候補リストが表示される
  - 続けて入力すると候補が絞り込まれる(例: `[!wa` → warning)
  - 候補を選択すると完全な Callout 見出しが挿入される(例: `[!warning] `)
  - 候補は最近使った順に並ぶ
- **選択範囲がない場合**: カーソル行を Callout に変換し、カーソルを本文位置にセット
- **選択範囲がある場合**: 選択した行(複数行可)を Callout の本文に変換
- コマンド **Remove**(表示は *Insert Callout: Remove*)で解除できる。見出し行を削除し、引用マーカーも剥がす
  (詳細は [Callout の解除](#callout-の解除))
- コマンド **Open callout list** で右サイドバーに現在のノートの Callout を一覧表示し、
  クリックでその位置へ移動できる(詳細は [Callout 一覧](#callout-一覧))

挿入されるのは種類のみのシンプルな形式(折りたたみ記号なし):

```markdown
> [!note]
> 本文
```

## Callout 一覧

コマンドパレットの **Insert Callout: Open callout list**、またはリボンの
**Open callout list** アイコンで、右サイドバーに **Callouts** タブを開ける。
現在のノートの Callout を出現順に、種類のアイコンとタイトルで表示する。
タイトルがない場合は種類名を表示し、入れ子の引用はインデントする。
項目をクリックするか、Tab で選択して Enter を押すと、その位置へ移動する。
ノートを切り替えると一覧も切り替わり、編集内容は少し待つと自動反映される。
コードブロック・インデントされたコード・フロントマター・コメントは対象外。
カスタム Callout も表示できる。タブは通常のサイドバーと同様に移動・閉じることができ、
閉じた後はコマンドから再表示できる。
一覧の対象は現在のノートで、Vault 全体ではない。編集直後などに古い一覧をクリックした場合は、
一覧を更新して再選択を案内する。

## Callout の解除

Callout 内にカーソルを置いてコマンド **Remove** を実行する。

- `> [!type]` の見出し行を削除し、残りの行から**引用マーカーを1段分だけ剥がす**。
  通常の Callout なら引用状態ごと解除され、ただのテキストに戻る
- タイトル付き(`> [!note] タイトル`)の場合、タイトルは本文の1行目として残す
- ネストした引用は1段だけ浅くなる(`> > 本文` → `> 本文`)
- Callout 見出しのない普通の引用ブロックにも使え、その場合は単なる引用解除になる
- 一部だけ選択していても、カーソル周辺の引用ブロック全体が対象になる

```markdown
> [!note]        →   本文
> 本文
```

## 設定

- **Callout types**: ダイアログに表示する種類と順序を、1行1種類のテキストで編集。
  カスタム Callout 名も追加可能。
- **Don't insert the closing bracket**(デフォルト: オン): オートコンプリートで挿入するとき、
  カーソル直後に既にある `]` を重複させない。Obsidian が `[` の入力時に `]` を
  自動補完する環境ではオンのままにする。
- **Reset to defaults**: Obsidian 組み込みの13種類
  (note, abstract, info, todo, tip, success, question, warning, failure, danger, bug, example, quote)にリセット。

## インストール(手動)

Obsidian 1.13.0 以降が必要。Vault の `.obsidian/plugins/insert-callout/` に以下の3ファイルを置き、
Obsidian の設定 → コミュニティプラグイン で有効化する。

- `main.js`
- `manifest.json`
- `styles.css`

手動更新時は、同じ[リリース](https://github.com/nonkuri/insert-callout/releases)の
3ファイルすべてを置き換え、プラグインをオフ→オンにするか Obsidian を再起動する。

## 開発

```bash
npm install
npm run build   # 型チェック + main.js 生成
npm test        # Callout 一覧の回帰テスト
npm run dev     # watch ビルド
```

※ Google Drive 上のフォルダでは `npm install` が失敗することがあるため、
その場合はローカルディスクにコピーしてビルドし、`main.js` を戻す。
