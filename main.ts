import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	Notice,
	Plugin,
	PluginSettingTab,
	SettingDefinitionItem,
	SuggestModal,
	TFile,
	setIcon,
} from "obsidian";

interface InsertCalloutSettings {
	calloutTypes: string[];
	recentTypes: string[];
	skipClosingBracket: boolean;
}

// Obsidian 公式ドキュメントに記載されている組み込み Callout の種類
const DEFAULT_CALLOUT_TYPES = [
	"note",
	"abstract",
	"info",
	"todo",
	"tip",
	"success",
	"question",
	"warning",
	"failure",
	"danger",
	"bug",
	"example",
	"quote",
];

// Obsidian が各 Callout に割り当てている Lucide アイコン
const CALLOUT_ICONS: Record<string, string> = {
	note: "lucide-pencil",
	abstract: "lucide-clipboard-list",
	info: "lucide-info",
	todo: "lucide-check-circle-2",
	tip: "lucide-flame",
	success: "lucide-check",
	question: "lucide-help-circle",
	warning: "lucide-alert-triangle",
	failure: "lucide-x",
	danger: "lucide-zap",
	bug: "lucide-bug",
	example: "lucide-list",
	quote: "lucide-quote",
};

const DEFAULT_SETTINGS: InsertCalloutSettings = {
	calloutTypes: [...DEFAULT_CALLOUT_TYPES],
	recentTypes: [],
	skipClosingBracket: true,
};

// 引用ブロックの行かどうか(先頭の空白は許容)
function isQuoteLine(line: string): boolean {
	return /^\s*>/.test(line);
}

// 引用マーカーを1段分だけ取り除く(">" と直後の空白1つ)
function stripOneQuoteLevel(line: string): string {
	const match = line.match(/^(\s*)>[ \t]?(.*)$/);
	return match ? match[1] + match[2] : line;
}

// 引用マーカーを剥がした後の行が Callout 見出しかどうか
// 例: "[!note]" / "[!note]+ タイトル"
const CALLOUT_HEADING = /^\[!([^\]]+)\]([+-]?)[ \t]*(.*)$/;

function renderCalloutSuggestion(type: string, el: HTMLElement): void {
	el.addClass("insert-callout-suggestion");
	const iconEl = el.createSpan({ cls: "insert-callout-suggestion-icon" });
	setIcon(iconEl, CALLOUT_ICONS[type] ?? "lucide-pencil");
	el.createSpan({ text: type });
}

class CalloutSuggestModal extends SuggestModal<string> {
	constructor(
		app: App,
		private types: string[],
		private onChoose: (type: string) => void
	) {
		super(app);
		this.setPlaceholder("Select a callout type…");
	}

	getSuggestions(query: string): string[] {
		const q = query.trim().toLowerCase();
		return this.types.filter((t) => t.toLowerCase().includes(q));
	}

	renderSuggestion(type: string, el: HTMLElement): void {
		renderCalloutSuggestion(type, el);
	}

	onChooseSuggestion(type: string): void {
		this.onChoose(type);
	}
}

// 引用ブロック内で "[!" と入力したときに Callout 種類を補完する
class CalloutEditorSuggest extends EditorSuggest<string> {
	constructor(private plugin: InsertCalloutPlugin) {
		super(plugin.app);
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		_file: TFile | null
	): EditorSuggestTriggerInfo | null {
		const beforeCursor = editor.getLine(cursor.line).slice(0, cursor.ch);
		// 引用マーカー(ネスト可)の直後の "[!" + 入力途中の種類名にのみ反応する
		const match = beforeCursor.match(/^(\s*(?:>\s*)+)\[!([^\][\s]*)$/);
		if (!match) {
			return null;
		}
		return {
			start: { line: cursor.line, ch: match[1].length },
			end: cursor,
			query: match[2],
		};
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		const q = context.query.toLowerCase();
		return this.plugin
			.getOrderedTypes()
			.filter((t) => t.toLowerCase().includes(q));
	}

	renderSuggestion(type: string, el: HTMLElement): void {
		renderCalloutSuggestion(type, el);
	}

	selectSuggestion(type: string): void {
		const context = this.context;
		if (!context) {
			return;
		}
		const { editor, start } = context;
		let end = context.end;
		// Obsidian の括弧自動ペアで入力済みの "]" が直後にある場合は
		// それも置換対象に含め、"]" が重複しないようにする
		if (
			this.plugin.settings.skipClosingBracket &&
			editor.getLine(end.line).charAt(end.ch) === "]"
		) {
			end = { line: end.line, ch: end.ch + 1 };
		}
		const heading = `[!${type}] `;
		editor.replaceRange(heading, start, end);
		editor.setCursor({
			line: start.line,
			ch: start.ch + heading.length,
		});
		this.plugin.markUsed(type);
	}
}

export default class InsertCalloutPlugin extends Plugin {
	settings: InsertCalloutSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "insert",
			name: "Insert",
			editorCallback: (editor) => this.chooseAndInsert(editor),
		});

		this.addCommand({
			id: "remove",
			name: "Remove",
			editorCallback: (editor) => this.removeCallout(editor),
		});

		this.registerEditorSuggest(new CalloutEditorSuggest(this));

		this.addSettingTab(new InsertCalloutSettingTab(this.app, this));
	}

	// 最近使った種類を先頭に、残りは設定順で返す
	getOrderedTypes(): string[] {
		const types = this.settings.calloutTypes;
		const recent = this.settings.recentTypes.filter((t) =>
			types.includes(t)
		);
		return [...recent, ...types.filter((t) => !recent.includes(t))];
	}

	markUsed(type: string) {
		const recent = this.settings.recentTypes.filter((t) => t !== type);
		recent.unshift(type);
		this.settings.recentTypes = recent.slice(0, 20);
		void this.saveSettings();
	}

	chooseAndInsert(editor: Editor) {
		new CalloutSuggestModal(this.app, this.getOrderedTypes(), (type) => {
			this.markUsed(type);
			this.insertCallout(editor, type);
		}).open();
	}

	insertCallout(editor: Editor, type: string) {
		let startLine: number;
		let endLine: number;

		if (editor.somethingSelected()) {
			const from = editor.getCursor("from");
			const to = editor.getCursor("to");
			startLine = from.line;
			endLine = to.line;
			// 行頭までの選択(行全体をドラッグ選択した場合など)は
			// その行を含めない
			if (endLine > startLine && to.ch === 0) {
				endLine--;
			}
		} else {
			startLine = endLine = editor.getCursor().line;
		}

		const bodyLines: string[] = [];
		for (let i = startLine; i <= endLine; i++) {
			bodyLines.push("> " + editor.getLine(i));
		}

		const callout = `> [!${type}]\n` + bodyLines.join("\n");
		editor.replaceRange(
			callout,
			{ line: startLine, ch: 0 },
			{ line: endLine, ch: editor.getLine(endLine).length }
		);

		// カーソルを本文末尾(本文が空なら "> " の直後)にセット
		const cursorLine = endLine + 1;
		editor.setCursor({
			line: cursorLine,
			ch: editor.getLine(cursorLine).length,
		});
		editor.focus();
	}

	// Callout 見出しを削除し、引用マーカーを1段分だけ剥がす
	// (1段だけの引用なら引用状態そのものが解除される)
	removeCallout(editor: Editor) {
		const cursor = editor.getCursor();
		const from = editor.getCursor("from");
		const to = editor.getCursor("to");
		let startLine = from.line;
		let endLine = to.line;
		// 行頭までの選択(行全体をドラッグ選択した場合など)は
		// その行を含めない
		if (endLine > startLine && to.ch === 0) {
			endLine--;
		}

		// 選択範囲の端が引用行でない場合は、内側の引用行まで詰める
		while (startLine <= endLine && !isQuoteLine(editor.getLine(startLine))) {
			startLine++;
		}
		while (endLine >= startLine && !isQuoteLine(editor.getLine(endLine))) {
			endLine--;
		}
		if (startLine > endLine) {
			new Notice("No quote or callout found");
			return;
		}

		// 引用ブロック全体(空行または非引用行までが1ブロック)に広げる
		while (startLine > 0 && isQuoteLine(editor.getLine(startLine - 1))) {
			startLine--;
		}
		while (
			endLine < editor.lastLine() &&
			isQuoteLine(editor.getLine(endLine + 1))
		) {
			endLine++;
		}

		const lines: string[] = [];
		for (let i = startLine; i <= endLine; i++) {
			lines.push(stripOneQuoteLevel(editor.getLine(i)));
		}

		// 先頭が Callout 見出しなら削除する
		// ただしタイトル付き("[!note] タイトル")ならタイトルは本文として残す
		let removedHeadingLine = false;
		const heading = lines[0].match(CALLOUT_HEADING);
		if (heading) {
			const title = heading[3].trim();
			if (title) {
				lines[0] = title;
			} else {
				lines.shift();
				removedHeadingLine = true;
			}
		}

		// 置換前に、カーソル行から取り除かれる引用マーカーの長さを控えておく
		const cursorLineText = editor.getLine(cursor.line);
		const removedPrefix =
			cursor.line >= startLine && cursor.line <= endLine
				? cursorLineText.length -
					stripOneQuoteLevel(cursorLineText).length
				: 0;

		editor.replaceRange(
			lines.join("\n"),
			{ line: startLine, ch: 0 },
			{ line: endLine, ch: editor.getLine(endLine).length }
		);

		// カーソルをおおよそ元の位置に戻す
		let targetLine = cursor.line - (removedHeadingLine ? 1 : 0);
		if (targetLine < startLine) {
			targetLine = startLine;
		}
		const lastRemainingLine = startLine + Math.max(lines.length - 1, 0);
		if (targetLine > lastRemainingLine) {
			targetLine = lastRemainingLine;
		}
		const targetText = editor.getLine(targetLine);
		editor.setCursor({
			line: targetLine,
			ch: Math.max(
				0,
				Math.min(cursor.ch - removedPrefix, targetText.length)
			),
		});
		editor.focus();
	}

	async loadSettings() {
		const data = (await this.loadData()) as
			| (Partial<InsertCalloutSettings> & { lastUsed?: string })
			| null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		if (
			!Array.isArray(this.settings.calloutTypes) ||
			this.settings.calloutTypes.length === 0
		) {
			this.settings.calloutTypes = [...DEFAULT_CALLOUT_TYPES];
		}
		if (!Array.isArray(this.settings.recentTypes)) {
			this.settings.recentTypes = [];
		}
		// 旧バージョンの lastUsed 設定を最近使用リストに引き継ぐ
		if (
			this.settings.recentTypes.length === 0 &&
			typeof data?.lastUsed === "string"
		) {
			this.settings.recentTypes = [data.lastUsed];
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// 種類リストは string[] で保存しているが UI では複数行テキストとして扱うため、
// 宣言的設定 API には専用のキーを割り当てる
const CALLOUT_TYPES_KEY = "calloutTypesText";

// テキストエリアの内容を種類リストに変換する(空なら組み込みの13種類に戻す)
function parseCalloutTypes(value: string): string[] {
	const types = value
		.split("\n")
		.map((s) => s.trim().toLowerCase())
		.filter((s) => s.length > 0);
	return types.length > 0 ? types : [...DEFAULT_CALLOUT_TYPES];
}

class InsertCalloutSettingTab extends PluginSettingTab {
	plugin: InsertCalloutPlugin;

	constructor(app: App, plugin: InsertCalloutPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Callout types",
				desc:
					"Types shown in the dialog, one per line, in the order " +
					"you want them. Custom callout names are allowed.",
				control: {
					type: "textarea",
					key: CALLOUT_TYPES_KEY,
					rows: 13,
				},
			},
			{
				name: "Don't insert the closing bracket",
				desc:
					'When autocompleting, don\'t duplicate a "]" that is ' +
					"already right after the cursor. Keep this on if " +
					'Obsidian auto-pairs "[" with "]".',
				control: { type: "toggle", key: "skipClosingBracket" },
			},
			{
				name: "Reset to defaults",
				desc:
					"Restore the 13 built-in Obsidian callout types and " +
					"their order.",
				render: (setting) => {
					setting.addButton((button) => {
						button.setButtonText("Reset").onClick(async () => {
							this.plugin.settings.calloutTypes = [
								...DEFAULT_CALLOUT_TYPES,
							];
							await this.plugin.saveSettings();
							this.update();
						});
					});
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		if (key === CALLOUT_TYPES_KEY) {
			return this.plugin.settings.calloutTypes.join("\n");
		}
		if (key === "skipClosingBracket") {
			return this.plugin.settings.skipClosingBracket;
		}
		return undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === CALLOUT_TYPES_KEY) {
			this.plugin.settings.calloutTypes = parseCalloutTypes(
				String(value)
			);
		} else if (key === "skipClosingBracket") {
			this.plugin.settings.skipClosingBracket = Boolean(value);
		} else {
			return;
		}
		await this.plugin.saveSettings();
	}
}
