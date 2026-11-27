import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EditorSelection, EditorState } from '@codemirror/state';
import { resolveCodeLanguage, softTabSpec } from '../utils/codeEditor.ts';

describe('resolveCodeLanguage', () => {
	it('maps shells, interpreters and paths', () => {
		assert.equal(resolveCodeLanguage('bash'), 'shell');
		assert.equal(resolveCodeLanguage('/bin/sh'), 'shell');
		assert.equal(resolveCodeLanguage('/usr/bin/zsh'), 'shell');
		assert.equal(resolveCodeLanguage('PowerShell'), 'powershell');
		assert.equal(resolveCodeLanguage('pwsh.exe'), 'powershell');
		assert.equal(resolveCodeLanguage('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'), 'powershell');
		assert.equal(resolveCodeLanguage('python3'), 'python');
		assert.equal(resolveCodeLanguage('/usr/bin/python3.12'), 'python');
	});

	it('is plain text for anything else', () => {
		assert.equal(resolveCodeLanguage(undefined), null);
		assert.equal(resolveCodeLanguage(''), null);
		assert.equal(resolveCodeLanguage('cmd'), null);
		assert.equal(resolveCodeLanguage('tacoscript'), null);
		assert.equal(resolveCodeLanguage('plain'), null);
	});
});

describe('softTabSpec', () => {
	const apply = (doc: string, selection: EditorSelection) => {
		const state = EditorState.create({ doc, selection, extensions: EditorState.allowMultipleSelections.of(true) });
		const spec = softTabSpec(state);
		return spec ? state.update(spec).state : null;
	};

	it('inserts two spaces at the cursor, mid-line too', () => {
		const next = apply('echo hi', EditorSelection.single(4))!;
		assert.equal(next.doc.toString(), 'echo   hi');
		assert.equal(next.selection.main.head, 6);
	});

	it('inserts at every cursor', () => {
		const next = apply('a\nb', EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(2)]))!;
		assert.equal(next.doc.toString(), '  a\n  b');
	});

	it('leaves selections to line indentation', () => {
		assert.equal(apply('a\nb', EditorSelection.single(0, 3)), null);
	});
});
