import { ItemView, MarkdownView, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import { CalloutEntry, parseCallouts } from "./callout-index";

export const CALLOUT_VIEW_TYPE = "insert-callout-list";

export class CalloutListView extends ItemView {
	private timer: number | undefined;
	private target: MarkdownView | null = null;
	private source = "";
	private path: string | null = null;

	constructor(leaf: WorkspaceLeaf, private icons: Record<string, string>) {
		super(leaf);
	}

	getViewType(): string { return CALLOUT_VIEW_TYPE; }
	getDisplayText(): string { return "Callouts"; }
	getIcon(): string { return "list-collapse"; }

	async onOpen(): Promise<void> {
		this.contentEl.addClass("insert-callout-list");
		const workspace = this.app.workspace;
		this.registerEvent(workspace.on("active-leaf-change", () => this.refresh()));
		this.registerEvent(workspace.on("file-open", () => this.refresh()));
		this.registerEvent(workspace.on("layout-change", () => this.refresh()));
		this.registerEvent(workspace.on("editor-change", (_editor, info) => {
			if (info.file === this.target?.file) this.scheduleRefresh();
		}));
		this.registerEvent(this.app.vault.on("modify", (file) => {
			if (file === this.target?.file) this.scheduleRefresh();
		}));
		this.registerEvent(this.app.vault.on("rename", () => this.refresh()));
		this.register(() => window.clearTimeout(this.timer));
		this.refresh(true);
	}

	async onClose(): Promise<void> {
		window.clearTimeout(this.timer);
	}

	private scheduleRefresh(): void {
		window.clearTimeout(this.timer);
		this.timer = window.setTimeout(() => this.refresh(), 150);
	}

	private refresh(force = false): void {
		const workspace = this.app.workspace;
		const view = workspace.getActiveViewOfType(MarkdownView) ?? workspace.getMostRecentLeaf()?.view;
		const target = view instanceof MarkdownView && view.file &&
			workspace.getLeavesOfType("markdown").includes(view.leaf) ? view : null;
		const source = target?.getViewData() ?? "";
		const path = target?.file?.path ?? null;
		if (!force && target === this.target && source === this.source && path === this.path) return;
		this.target = target;
		this.source = source;
		this.path = path;
		this.contentEl.empty();
		if (!target || !path) {
			this.contentEl.createDiv({ cls: "insert-callout-empty", text: "Open a Markdown note to see its callouts." });
			return;
		}
		this.contentEl.createDiv({ cls: "insert-callout-file", text: target.file!.basename, title: path });
		const entries = parseCallouts(source);
		if (!entries.length) {
			this.contentEl.createDiv({ cls: "insert-callout-empty", text: "No callouts in this note." });
			return;
		}
		const list = this.contentEl.createEl("ul", { cls: "insert-callout-items", attr: { "aria-label": "Callouts" } });
		for (const entry of entries) {
			const item = list.createEl("li");
			const button = item.createEl("button", {
				cls: "insert-callout-item",
				attr: { type: "button" },
				title: `${entry.type} · Line ${entry.line + 1}`,
			});
			button.style.setProperty("--callout-depth", String(entry.depth));
			const icon = button.createSpan({ cls: "insert-callout-item-icon", attr: { "aria-hidden": "true" } });
			setIcon(icon, this.icons[entry.type] ?? "lucide-pencil");
			button.createSpan({ cls: "insert-callout-item-title", text: entry.title || entry.type });
			button.addEventListener("click", () => this.navigate(target, path, source, entry));
		}
	}

	private navigate(target: MarkdownView, path: string, source: string, entry: CalloutEntry): void {
		if (target.file?.path !== path || target.getViewData() !== source ||
			!this.app.workspace.getLeavesOfType("markdown").includes(target.leaf)) {
			this.refresh(true);
			new Notice("Callout list updated. Select the callout again.");
			return;
		}
		this.app.workspace.setActiveLeaf(target.leaf, { focus: true });
		// Obsidian handles line navigation in both source and reading modes.
		target.leaf.setEphemeralState({ line: entry.line, focus: true });
		if (target.getMode() === "source") {
			const pos = { line: entry.line, ch: 0 };
			target.editor.setCursor(pos);
			target.editor.scrollIntoView({ from: pos, to: pos }, true);
			target.editor.focus();
		} else {
			// Line navigation mounts the preview section; wait for its rendering.
			const win = target.containerEl.win;
			win.requestAnimationFrame(() => win.requestAnimationFrame(() => {
				if (target.file?.path !== path || target.getMode() !== "preview") return;
				const el = target.previewMode.containerEl.querySelector<HTMLElement>(
					`[data-insert-callout-line="${entry.line}"]`
				);
				if (!el) return;
				let parent: HTMLElement | null = el;
				while (parent && parent !== target.previewMode.containerEl) {
					if (parent.matches(".callout.is-collapsed")) {
						parent.querySelector<HTMLElement>(":scope > .callout-title")?.click();
					}
					parent = parent.parentElement;
				}
				el.scrollIntoView({ block: "center" });
			}));
		}
	}
}
