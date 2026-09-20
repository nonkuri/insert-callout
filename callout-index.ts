export interface CalloutEntry {
	type: string;
	title: string;
	line: number;
	depth: number;
}

/** Read source positions, including nested quotes, without indexing code examples. */
export function parseCallouts(source: string): CalloutEntry[] {
	const entries: CalloutEntry[] = [];
	let fence: { marker: string; length: number; depth: number } | null = null;
	let commentEnd: string | null = null;
	let frontmatter = false;

	for (const [line, raw] of source.split(/\r?\n/).entries()) {
		if (line === 0 && raw.replace(/^\uFEFF/, "").trim() === "---") {
			frontmatter = true;
			continue;
		}
		if (frontmatter) {
			if (/^(---|\.\.\.)\s*$/.test(raw)) frontmatter = false;
			continue;
		}

		let text = raw;
		let depth = 0;
		let quote: RegExpMatchArray | null;
		while ((quote = text.match(/^ {0,3}>[ \t]?/))) {
			text = text.slice(quote[0].length);
			depth++;
		}

		if (fence) {
			// A quoted fence ends when its quote container ends. A root fence
			// still contains lines that merely look like Markdown quotes.
			if (depth < fence.depth) {
				fence = null;
			} else {
				const close = text.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
				if (depth === fence.depth && close && close[1][0] === fence.marker &&
					close[1].length >= fence.length) fence = null;
				continue;
			}
		}

		// Comment markers in a fence's info string are literal text.
		const openingFence = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
		if (!commentEnd && openingFence &&
			!(openingFence[1][0] === "`" && openingFence[2].includes("`"))) {
			fence = { marker: openingFence[1][0], length: openingFence[1].length, depth };
			continue;
		}

		// Strip Obsidian and HTML comments before looking for a heading.
		let visible = "";
		while (text) {
			if (commentEnd) {
				const end = text.indexOf(commentEnd);
				if (end < 0) break;
				text = text.slice(end + commentEnd.length);
				commentEnd = null;
			} else {
				const start = /%%|<!--/.exec(text);
				if (!start) { visible += text; break; }
				visible += text.slice(0, start.index);
				commentEnd = start[0] === "%%" ? "%%" : "-->";
				text = text.slice(start.index + start[0].length);
			}
		}
		const heading = visible.match(/^ {0,3}\[!([^\]\s]+)\][+-]?(?:[ \t]*(.*))$/);
		if (depth > 0 && heading) {
			entries.push({
				type: heading[1].toLowerCase(),
				title: heading[2].trim(),
				line,
				depth: depth - 1,
			});
		}
	}
	return entries;
}
