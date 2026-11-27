export interface DiffLine {
	kind: 'same' | 'add' | 'del';
	text: string;
}

/**
 * Line diff of `a` -> `b` (LCS). Common leading and trailing lines are
 * trimmed first, so only the changed middle costs O(n*m).
 */
/** Above this many cells (changed middle, rows x columns) the LCS table is skipped. */
export const LINE_DIFF_MAX_CELLS = 25_000_000;

const splitLines = (s: string) => (s === '' ? [] : s.split(/\r?\n/));

export const lineDiff = (a: string, b: string): DiffLine[] => lineDiffInfo(a, b).lines;

/** Like `lineDiff`; `tooLarge` is set when the changed middle was too big for LCS and is shown as all removed then all added. */
export const lineDiffInfo = (a: string, b: string): { lines: DiffLine[]; tooLarge: boolean } => {
	const x = splitLines(a);
	const y = splitLines(b);
	let start = 0;
	while (start < x.length && start < y.length && x[start] === y[start]) start++;
	let endX = x.length;
	let endY = y.length;
	while (endX > start && endY > start && x[endX - 1] === y[endY - 1]) {
		endX--;
		endY--;
	}
	const out: DiffLine[] = x.slice(0, start).map(text => ({ kind: 'same', text }));
	const n = endX - start;
	const m = endY - start;
	// lcs[i][j]: LCS length of x[start+i..] and y[start+j..]
	if (n * m > LINE_DIFF_MAX_CELLS) {
		out.push(...x.slice(start, endX).map((text): DiffLine => ({ kind: 'del', text })));
		out.push(...y.slice(start, endY).map((text): DiffLine => ({ kind: 'add', text })));
		out.push(...x.slice(endX).map((text): DiffLine => ({ kind: 'same', text })));
		return { lines: out, tooLarge: true };
	}
	// Indexes below stay inside x, y and lcs by construction (i < n, j < m), hence the non-null assertions.
	const w = m + 1;
	const lcs = new Uint32Array((n + 1) * w);
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			lcs[i * w + j] = x[start + i] === y[start + j]
				? lcs[(i + 1) * w + j + 1]! + 1
				: Math.max(lcs[(i + 1) * w + j]!, lcs[i * w + j + 1]!);
		}
	}
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (x[start + i] === y[start + j]) {
			out.push({ kind: 'same', text: x[start + i]! });
			i++;
			j++;
		}
		else if (lcs[(i + 1) * w + j]! >= lcs[i * w + j + 1]!) {
			out.push({ kind: 'del', text: x[start + i++]! });
		}
		else {
			out.push({ kind: 'add', text: y[start + j++]! });
		}
	}
	while (i < n) out.push({ kind: 'del', text: x[start + i++]! });
	while (j < m) out.push({ kind: 'add', text: y[start + j++]! });
	for (const text of x.slice(endX)) out.push({ kind: 'same', text });
	return { lines: out, tooLarge: false };
};
