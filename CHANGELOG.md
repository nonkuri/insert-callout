# Changelog

## 1.4.0

- Add a **Callouts** sidebar for the current note, opened with **Insert Callout: Open callout list** or its ribbon icon.
- Show callout type icons and titles in document order, with indentation for nested quotes and support for custom types.
- Jump to a callout by clicking an entry or using Tab and Enter, in editing and reading modes.
- Refresh the list when switching notes or editing, and guard against navigation using stale source positions.
- Exclude fenced code examples, indented code, frontmatter, and comments from the list.
- Add 14 regression tests and run them before release builds.

Requires Obsidian **1.13.0** or later. For manual updates, replace `main.js`, `manifest.json`, and `styles.css`, then reload the plugin.

### 日本語

- 現在のノートの Callout を右サイドバーに一覧表示する機能を追加。
  **Insert Callout: Open callout list** コマンド、またはリボンアイコンから開ける。
- 種類のアイコンとタイトルを出現順に表示。入れ子表示とカスタム種類に対応。
- クリックまたは Tab＋Enter で該当位置へ移動。編集・閲覧モードに対応。
- ノートの切り替えや編集に自動追従し、古い行番号への誤移動を防止。
- コードブロック・インデントされたコード・フロントマター・コメントを一覧から除外。
- 14件の回帰テストを追加し、リリースビルド前にも実行。

必要な Obsidian のバージョンは **1.13.0** 以降。手動更新では `main.js`、`manifest.json`、`styles.css` を置き換えてプラグインを再読み込みする。
