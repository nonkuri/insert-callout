import {
	App,
	Editor,
	Plugin,
	PluginSettingTab,
	Setting,
	SuggestModal,
	setIcon,
} from "obsidian";

interface InsertCalloutSettings {
	calloutTypes: string[];
	lastUsed: string;
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
	lastUsed: "note",
};

class CalloutSuggestModal extends SuggestModal<string> {
	constructor(
		app: App,
		private types: string[],
		private onChoose: (type: string) => void
	) {
		super(app);
		this.setPlaceholder("Callout の種類を選択…");
	}

	getSuggestions(query: string): string[] {
		const q = query.trim().toLowerCase();
		return this.types.filter((t) => t.toLowerCase().includes(q));
	}

	renderSuggestion(type: string, el: HTMLElement): void {
		el.addClass("insert-callout-suggestion");
		const iconEl = el.createSpan({ cls: "insert-callout-suggestion-icon" });
		setIcon(iconEl, CALLOUT_ICONS[type] ?? "lucide-pencil");
		el.createSpan({ text: type });
	}

	onChooseSuggestion(type: string): void {
		this.onChoose(type);
	}
}

export default class InsertCalloutPlugin extends Plugin {
	settings: InsertCalloutSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "insert-callout",
			name: "Insert callout",
			editorCallback: (editor) => this.chooseAndInsert(editor),
		});

		this.addSettingTab(new InsertCalloutSettingTab(this.app, this));
	}

	chooseAndInsert(editor: Editor) {
		// 最後に使った種類をリスト先頭に置き、初期ハイライトさせる
		const types = [...this.settings.calloutTypes];
		const lastIndex = types.indexOf(this.settings.lastUsed);
		if (lastIndex > 0) {
			types.splice(lastIndex, 1);
			types.unshift(this.settings.lastUsed);
		}

		new CalloutSuggestModal(this.app, types, (type) => {
			this.settings.lastUsed = type;
			void this.saveSettings();
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		if (
			!Array.isArray(this.settings.calloutTypes) ||
			this.settings.calloutTypes.length === 0
		) {
			this.settings.calloutTypes = [...DEFAULT_CALLOUT_TYPES];
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class InsertCalloutSettingTab extends PluginSettingTab {
	plugin: InsertCalloutPlugin;

	constructor(app: App, plugin: InsertCalloutPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Callout の種類")
			.setDesc(
				"ダイアログに表示する Callout の種類を1行に1つずつ、表示したい順に記述します。" +
					"カスタム Callout 名も追加できます。"
			)
			.addTextArea((text) => {
				text.inputEl.rows = 13;
				text.setValue(this.plugin.settings.calloutTypes.join("\n"));
				text.onChange(async (value) => {
					const types = value
						.split("\n")
						.map((s) => s.trim().toLowerCase())
						.filter((s) => s.length > 0);
					this.plugin.settings.calloutTypes =
						types.length > 0 ? types : [...DEFAULT_CALLOUT_TYPES];
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("デフォルトに戻す")
			.setDesc("Callout の種類と順序を Obsidian 組み込みの13種類に戻します。")
			.addButton((button) => {
				button.setButtonText("リセット").onClick(async () => {
					this.plugin.settings.calloutTypes = [...DEFAULT_CALLOUT_TYPES];
					await this.plugin.saveSettings();
					this.display();
				});
			});
	}
}
