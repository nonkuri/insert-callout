import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function loadModule(name, dependencies = {}, globals = {}) {
	const code = ts.transpileModule(readFileSync(new URL(`../${name}.ts`, import.meta.url), "utf8"), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2018 },
	}).outputText;
	const exports = {};
	runInNewContext(code, { exports, require: name => dependencies[name], ...globals });
	return exports;
}

class Element {
	children = [];
	style = { setProperty() {} };
	win = { requestAnimationFrame: fn => fn() };
	constructor(tag, options = {}) { this.tag = tag; this.options = options; }
	addClass() {}
	empty() { this.children = []; }
	createEl(tag, options) { const child = new Element(tag, options); this.children.push(child); return child; }
	createDiv(options) { return this.createEl("div", options); }
	createSpan(options) { return this.createEl("span", options); }
	addEventListener(event, fn) { this[event] = fn; }
	buttons() { return this.children.flatMap(child => child.tag === "button" ? [child] : child.buttons()); }
}

function fixture() {
	const listeners = {};
	const notices = [];
	const timers = new Map();
	let timerId = 0;
	class MarkdownView {
		constructor(path, source) {
			this.file = { path, basename: path.replace(/\.md$/, "") };
			this.source = source;
			this.containerEl = new Element("div");
			this.leaf = { view: this, setEphemeralState: state => { this.destination = state.line; } };
			this.editor = {
				setCursor: pos => { this.cursor = pos.line; },
				scrollIntoView: () => { this.scrolled = true; }, focus() {},
			};
		}
		getMode() { return this.mode ?? "source"; }
		getViewData() { return this.source; }
	}
	const a = new MarkdownView("A.md", "# A\n> [!note] First\n\n> > [!tip] Nested");
	const b = new MarkdownView("B.md", "> [!warning] Second");
	const workspace = {
		active: a, recent: a, leaves: [a.leaf, b.leaf],
		on(event, fn) { listeners[event] = fn; return {}; },
		getActiveViewOfType() { return this.active instanceof MarkdownView ? this.active : null; },
		getMostRecentLeaf() { return this.recent?.leaf; },
		getLeavesOfType() { return this.leaves; },
		setActiveLeaf(leaf) { this.active = leaf.view; this.recent = leaf.view; },
	};
	const app = { workspace, vault: { on: () => ({}) } };
	class ItemView {
		app = app;
		contentEl = new Element("div");
		registerEvent() {}
		register() {}
	}
	const { CalloutListView } = loadModule("callout-view", {
		obsidian: { ItemView, MarkdownView, Notice: class { constructor(message) { notices.push(message); } }, setIcon() {} },
		"./callout-index": loadModule("callout-index"),
	}, { window: {
		setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
		clearTimeout(id) { timers.delete(id); },
	} });
	const view = new CalloutListView({}, {});
	return { view, workspace, a, b, listeners, notices, timers };
}

test("sidebar keeps the current note and clicking navigates to its source line", async () => {
	const f = fixture();
	await f.view.onOpen();
	assert.equal(f.view.contentEl.buttons().length, 2);
	f.workspace.active = f.view;
	f.listeners["active-leaf-change"]();
	f.view.contentEl.buttons()[1].click();
	assert.equal(f.a.destination, 3);
	assert.equal(f.a.cursor, 3);
	assert.equal(f.a.scrolled, true);
	assert.equal(f.workspace.active, f.a);
});

test("switching notes and opening a non-Markdown view refreshes the list", async () => {
	const f = fixture();
	await f.view.onOpen();
	f.workspace.active = f.workspace.recent = f.b;
	f.listeners["active-leaf-change"]();
	assert.equal(f.view.contentEl.buttons().length, 1);
	f.view.contentEl.buttons()[0].click();
	assert.equal(f.b.destination, 0);
	f.workspace.active = f.workspace.recent = { leaf: { view: {} } };
	f.listeners["active-leaf-change"]();
	assert.equal(f.view.contentEl.buttons().length, 0);
});

test("unsaved edits update the list; stale buttons never jump to obsolete positions", async () => {
	const f = fixture();
	await f.view.onOpen();
	const oldButton = f.view.contentEl.buttons()[0];
	f.a.source = "\n\n> [!note] Moved";
	f.listeners["editor-change"](f.a.editor, f.a);
	oldButton.click();
	assert.equal(f.a.destination, undefined);
	assert.equal(f.notices.length, 1);
	for (const callback of f.timers.values()) callback();
	assert.equal(f.view.contentEl.buttons().length, 1);
	f.view.contentEl.buttons()[0].click();
	assert.equal(f.a.destination, 2);
	await f.view.onClose();
	assert.equal(f.timers.size, 0);
});

test("closing the source pane clears the list and rejects retained buttons", async () => {
	const f = fixture();
	await f.view.onOpen();
	const button = f.view.contentEl.buttons()[0];
	f.workspace.leaves = [];
	f.listeners["layout-change"]();
	assert.equal(f.view.contentEl.buttons().length, 0);
	button.click();
	assert.equal(f.a.destination, undefined);
});

test("reading mode expands collapsed callouts and their ancestors before scrolling", async () => {
	const f = fixture();
	let expanded = 0;
	let scrolled = false;
	const container = {};
	const parent = { parentElement: container, matches: () => true, querySelector: () => ({ click: () => expanded++ }) };
	const child = { parentElement: parent, matches: () => true, querySelector: () => ({ click: () => expanded++ }), scrollIntoView: () => { scrolled = true; } };
	container.querySelector = () => child;
	f.a.previewMode = { containerEl: container };
	f.a.mode = "preview";
	await f.view.onOpen();
	f.view.contentEl.buttons()[1].click();
	assert.equal(f.a.destination, 3);
	assert.equal(expanded, 2);
	assert.equal(scrolled, true);
	assert.equal(f.a.mode, "preview");
});
