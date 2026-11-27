/**
 * CodeMirror 6 setup for components/CodeEditor.vue. Imported dynamically, so CodeMirror lands in its
 * own chunk, loaded the first time an editor is shown.
 *
 * The theme reads CSS custom properties (--op-code-*) that the editor's host element sets, so each
 * use can restyle it from CSS (and change with a theme class) without reconfiguring the editor.
 */
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
	EditorView,
	drawSelection,
	keymap,
	lineNumbers as lineNumbersGutter,
	placeholder as placeholderText,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from '@codemirror/commands';
import { HighlightStyle, StreamLanguage, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { INDENT_UNIT, softTabSpec, type CodeLanguage } from '~/utils/codeEditor';

export interface CodeEditorOptions {
	parent: HTMLElement;
	doc: string;
	readonly: boolean;
	lineNumbers: boolean;
	lineWrapping: boolean;
	placeholder: string;
	ariaLabel: string;
	language: CodeLanguage | null;
	onChange: (doc: string) => void;
}

export interface CodeEditorHandle {
	setDoc(doc: string): void;
	setReadonly(readonly: boolean): void;
	setLanguage(language: CodeLanguage | null): void;
	setPlaceholder(text: string): void;
	setAriaLabel(label: string): void;
	focus(): void;
	destroy(): void;
}

const v = (name: string) => `var(--op-code-${name})`;

const theme = EditorView.theme({
	'&': {
		backgroundColor: v('bg'),
		color: v('text'),
		fontSize: v('font-size'),
		height: '100%',
	},
	'&.cm-focused': { outline: 'none' },
	'.cm-scroller': {
		fontFamily: '\'JetBrains Mono\', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
		lineHeight: v('line-height'),
		padding: v('padding'),
		boxSizing: 'border-box',
	},
	'.cm-content': { padding: '0', caretColor: v('cursor') },
	'.cm-line': { padding: '0' },
	'.cm-cursor, .cm-dropCursor': { borderLeftColor: v('cursor') },
	'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
		backgroundColor: v('selection'),
	},
	'.cm-gutters': {
		backgroundColor: 'transparent',
		color: v('gutter'),
		border: 'none',
	},
	'.cm-lineNumbers .cm-gutterElement': {
		minWidth: v('gutter-width'),
		padding: v('gutter-padding'),
		boxSizing: 'border-box',
	},
	'.cm-placeholder': { color: v('placeholder') },
}, { dark: true });

// Colours of the Prism "Tomorrow" theme the app used before.
const highlight = HighlightStyle.define([
	{ tag: [t.comment, t.meta], color: '#999999' },
	{ tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.modifier], color: '#cc99cd' },
	{ tag: [t.string, t.special(t.string), t.regexp, t.variableName, t.special(t.variableName)], color: '#7ec699' },
	{ tag: [t.number, t.bool, t.atom, t.function(t.variableName)], color: '#f08d49' },
	{ tag: [t.className, t.typeName, t.constant(t.variableName), t.propertyName], color: '#f8c555' },
	{ tag: [t.operator, t.url, t.escape], color: '#67cdcc' },
	{ tag: t.standard(t.variableName), color: '#cc99cd' },
	{ tag: [t.attributeName, t.tagName], color: '#e2777a' },
]);

const loadLanguage = async (language: CodeLanguage): Promise<Extension> => {
	switch (language) {
		case 'shell':
			return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/shell')).shell);
		case 'powershell':
			return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/powershell')).powerShell);
		case 'python':
			return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/python')).python);
	}
};

// Mod-Enter would insert a blank line; callers use it to submit (RunEditor), so leave it to them.
const editorKeymap = [
	{ key: 'Tab', run: (view: EditorView) => {
		const spec = softTabSpec(view.state);
		if (!spec) return indentMore(view);
		view.dispatch(view.state.update(spec, { scrollIntoView: true, userEvent: 'input' }));
		return true;
	}, shift: indentLess },
	...defaultKeymap.filter(binding => binding.key !== 'Mod-Enter'),
	...historyKeymap,
];

const readonlyExtensions = (readonly: boolean): Extension => readonly ? EditorState.readOnly.of(true) : [];
const placeholderExtension = (text: string): Extension => text ? placeholderText(text) : [];
const ariaExtension = (label: string): Extension => EditorView.contentAttributes.of({ 'aria-label': label });

export const createCodeEditor = (options: CodeEditorOptions): CodeEditorHandle => {
	const readonlyConf = new Compartment();
	const languageConf = new Compartment();
	const placeholderConf = new Compartment();
	const ariaConf = new Compartment();
	let languageRequest = 0;

	const view = new EditorView({
		parent: options.parent,
		state: EditorState.create({
			doc: options.doc,
			extensions: [
				options.lineNumbers ? lineNumbersGutter() : [],
				options.lineWrapping ? EditorView.lineWrapping : [],
				history(),
				drawSelection(),
				EditorState.tabSize.of(2),
				indentUnit.of(INDENT_UNIT),
				keymap.of(editorKeymap),
				syntaxHighlighting(highlight),
				theme,
				readonlyConf.of(readonlyExtensions(options.readonly)),
				languageConf.of([]),
				placeholderConf.of(placeholderExtension(options.placeholder)),
				ariaConf.of(ariaExtension(options.ariaLabel)),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) options.onChange(update.state.doc.toString());
				}),
			],
		}),
	});

	const handle: CodeEditorHandle = {
		setDoc(doc) {
			if (doc === view.state.doc.toString()) return;
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } });
		},
		setReadonly(readonly) {
			view.dispatch({ effects: readonlyConf.reconfigure(readonlyExtensions(readonly)) });
		},
		setLanguage(language) {
			const request = ++languageRequest;
			if (!language) {
				view.dispatch({ effects: languageConf.reconfigure([]) });
				return;
			}
			loadLanguage(language).then((extension) => {
				// Ignore a load that a later call (or destroy) has superseded.
				if (request === languageRequest) view.dispatch({ effects: languageConf.reconfigure(extension) });
			}).catch(() => { /* stay plain text if the mode chunk fails to load */ });
		},
		setPlaceholder(text) {
			view.dispatch({ effects: placeholderConf.reconfigure(placeholderExtension(text)) });
		},
		setAriaLabel(label) {
			view.dispatch({ effects: ariaConf.reconfigure(ariaExtension(label)) });
		},
		focus() {
			view.focus();
		},
		destroy() {
			languageRequest++;
			view.destroy();
		},
	};
	handle.setLanguage(options.language);
	return handle;
};
