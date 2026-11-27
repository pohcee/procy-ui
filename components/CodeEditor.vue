<template>
	<!--
		A CodeMirror 6 editor. CodeMirror is loaded on first use (lib/codeEditor.ts is its own chunk);
		until then the text shows in a <pre> styled the same way. Colours, font size, line height and
		padding come from --op-code-* custom properties on this element (see the defaults below), so each
		use styles it from CSS. The root grows with its content; give it a min-height to make it taller.
	-->
	<div class="op-code">
		<div
			ref="host"
			class="op-code__host"
		/>
		<pre
			v-if="!ready"
			class="op-code__fallback"
			:class="{ 'op-code__fallback--wrap': lineWrapping }"
			aria-hidden="true"
		>{{ modelValue }}</pre>
	</div>
</template>

<script setup lang="ts">
import type { CodeEditorHandle } from '~/lib/codeEditor';
import { resolveCodeLanguage } from '~/utils/codeEditor';

const props = withDefaults(defineProps<{
	modelValue?: string;
	/** Language or interpreter name to highlight ('bash', 'powershell', 'python3', ...); plain text otherwise. */
	language?: string;
	readonly?: boolean;
	lineNumbers?: boolean;
	/** Wrap long lines instead of scrolling sideways. */
	lineWrapping?: boolean;
	placeholder?: string;
	ariaLabel?: string;
}>(), {
	modelValue: '',
	language: undefined,
	readonly: false,
	lineNumbers: true,
	lineWrapping: false,
	placeholder: '',
	ariaLabel: 'Code editor',
});

const emit = defineEmits<{
	(e: 'update:modelValue', value: string): void;
}>();

const host = ref<HTMLElement | null>(null);
const ready = ref(false);
let editor: CodeEditorHandle | null = null;
let unmounted = false;

onMounted(async () => {
	const { createCodeEditor } = await import('~/lib/codeEditor');
	if (unmounted || !host.value) return;
	editor = createCodeEditor({
		parent: host.value,
		doc: props.modelValue,
		readonly: props.readonly,
		lineNumbers: props.lineNumbers,
		lineWrapping: props.lineWrapping,
		placeholder: props.placeholder,
		ariaLabel: props.ariaLabel,
		language: resolveCodeLanguage(props.language),
		onChange: value => emit('update:modelValue', value),
	});
	ready.value = true;
});

onBeforeUnmount(() => {
	unmounted = true;
	editor?.destroy();
	editor = null;
});

watch(() => props.modelValue, value => editor?.setDoc(value));
watch(() => props.readonly, value => editor?.setReadonly(value));
watch(() => props.language, value => editor?.setLanguage(resolveCodeLanguage(value)));
watch(() => props.placeholder, value => editor?.setPlaceholder(value));
watch(() => props.ariaLabel, value => editor?.setAriaLabel(value));

defineExpose({ focus: () => editor?.focus() });
</script>

<style>
.op-code {
	/* Always dark, in both themes (the frames around the editors are dark too). */
	--op-code-bg: #0F151D;
	--op-code-text: #E6EBF2;
	--op-code-gutter: #5D6878;
	--op-code-placeholder: #6B7685;
	--op-code-cursor: #E6EBF2;
	--op-code-selection: rgb(96 165 250 / 0.3);
	--op-code-font-size: 13px;
	--op-code-line-height: 22px;
	--op-code-padding: 14px 16px 14px 0;
	--op-code-gutter-width: 42px;
	--op-code-gutter-padding: 0 12px 0 14px;

	display: grid;
	background: var(--op-code-bg);
	color: var(--op-code-text);
}

/* Host and fallback share the one grid cell; the host stretches to the root's height. */
.op-code__host,
.op-code__fallback {
	grid-area: 1 / 1;
	min-width: 0;
}

.op-code__fallback {
	margin: 0;
	padding: var(--op-code-padding);
	padding-left: calc(var(--op-code-gutter-width) + 4px);
	font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	font-size: var(--op-code-font-size);
	line-height: var(--op-code-line-height);
	white-space: pre;
	overflow: hidden;
}

.op-code__fallback--wrap {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
