// Minimal type declarations for the parts of prismjs this app uses.
// prismjs ships no types, and `prismjs/components/prism-core` isn't covered
// by @types/prismjs either, so declare just what the editors call.
declare module 'prismjs' {
	export type Grammar = Record<string, unknown>;

	interface Prism {
		languages: Record<string, Grammar>;
		highlightAll(async?: boolean): void;
	}

	const prism: Prism;
	export default prism;
}

declare module 'prismjs/components/prism-core' {
	import type { Grammar } from 'prismjs';

	export function highlight(text: string, grammar: Grammar | undefined, language?: string): string;
}

declare module 'prismjs/components/prism-vim';
