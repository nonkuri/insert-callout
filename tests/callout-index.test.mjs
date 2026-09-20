import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../callout-index.ts", import.meta.url), "utf8"), {
	compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2018 },
}).outputText;
const { parseCallouts } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("preserves line positions, titles, custom types, folding and quote depth", () => {
	assert.deepEqual(parseCallouts("# Note\r\n> [!NOTE]\r\n> body\r\n> > [!custom-kind]- Nested title\r\n\r\n> [!tip]+ Title"), [
		{ type: "note", title: "", line: 1, depth: 0 },
		{ type: "custom-kind", title: "Nested title", line: 3, depth: 1 },
		{ type: "tip", title: "Title", line: 5, depth: 0 },
	]);
});

test("ignores root fenced code, including quote-looking fence markers", () => {
	const source = ["````markdown", "> [!note] Example", "> ````", "```", "> [!warning] Example", "````", "> [!tip] Real"].join("\n");
	assert.deepEqual(parseCallouts(source).map(e => e.title), ["Real"]);
});

test("ignores quoted fenced code and detects following nested callouts", () => {
	const source = ["> [!note] Parent", "> ~~~md", "> > [!tip] Example", "> ~~~", "> > [!tip] Child"].join("\n");
	assert.deepEqual(parseCallouts(source).map(e => e.title), ["Parent", "Child"]);
});

test("a quoted fence ends with its container even without a closing fence", () => {
	assert.deepEqual(parseCallouts("> ```\n> [!note] Example\n\n> [!tip] Real").map(e => e.title), ["Real"]);
});

test("excludes YAML, indented code, unquoted markers and ordinary quotes", () => {
	const source = ["---", "example: |", "  > [!note] YAML", "---", "    > [!note] Code", "\t> [!note] Code", "[!note] Text", "> text [!note]", "> [!tip] Real"].join("\n");
	assert.deepEqual(parseCallouts(source).map(e => e.title), ["Real"]);
});

test("excludes Obsidian and HTML comments", () => {
	const source = ["%%", "> [!note] Hidden", "%%", "<!--", "> [!tip] Hidden", "-->", "> [!note] Visible %% secret %% title"].join("\n");
	assert.deepEqual(parseCallouts(source).map(e => e.title), ["Visible  title"]);
});

test("comment markers inside fenced code do not hide subsequent callouts", () => {
	assert.equal(parseCallouts("``` %%\n<!--\n```\n> [!note] Visible")[0].title, "Visible");
});

test("duplicate titles retain independent destinations", () => {
	assert.deepEqual(parseCallouts("> [!note] Same\n\n> [!note] Same").map(e => e.line), [0, 2]);
});

test("empty documents and unterminated code yield no entries", () => {
	assert.deepEqual(parseCallouts(""), []);
	assert.deepEqual(parseCallouts("```\n> [!note] Example"), []);
});
