export interface DiffLine {
	kind: 'same' | 'add' | 'del';
	text: string;
}

/**
 * Line diff of `a` -> `b` (LCS). Common leading and trailing lines are
 * trimmed first, so only the changed middle costs O(n*m).
 */
export const lineDiff = (a: string, b: string): DiffLine[] => {
	const x = a === '' ? [] : a.split('\n');
	const y = b === '' ? [] : b.split('\n');
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
	const w = m + 1;
	const lcs = new Uint32Array((n + 1) * w);
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			lcs[i * w + j] = x[start + i] === y[start + j]
				? lcs[(i + 1) * w + j + 1] + 1
				: Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
		}
	}
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (x[start + i] === y[start + j]) {
			out.push({ kind: 'same', text: x[start + i] });
			i++;
			j++;
		}
		else if (lcs[(i + 1) * w + j] >= lcs[i * w + j + 1]) {
			out.push({ kind: 'del', text: x[start + i++] });
		}
		else {
			out.push({ kind: 'add', text: y[start + j++] });
		}
	}
	while (i < n) out.push({ kind: 'del', text: x[start + i++] });
	while (j < m) out.push({ kind: 'add', text: y[start + j++] });
	for (const text of x.slice(endX)) out.push({ kind: 'same', text });
	return out;
};
