<template>
	<!--
		Code editor (Prism) with line numbers. Always dark, in both themes; the parent
		decides the height. Supports v-model (and the legacy `code` prop).
	-->
	<prism-editor
		v-model="codeEdit"
		class="op-code-editor"
		:highlight="highlighter"
		:aria-label="ariaLabel"
		:placeholder="placeholder"
		line-numbers
		@update:model-value="onInput"
	/>
</template>

<script setup lang="ts">
import { PrismEditor } from 'vue-prism-editor';
import { highlight } from 'prismjs/components/prism-core';
import prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

const props = defineProps({
	modelValue: {
		type: String,
		default: undefined,
	},
	code: {
		type: String,
		default: undefined,
	},
	ariaLabel: {
		type: String,
		default: 'Code editor',
	},
	placeholder: {
		type: String,
		default: '',
	},
});
const emit = defineEmits(['update:modelValue']);

const codeEdit = ref(props.modelValue ?? props.code ?? '');
watch(() => props.modelValue, (value) => {
	if (value !== undefined && value !== codeEdit.value) codeEdit.value = value;
});
watch(() => props.code, (value) => {
	if (value !== undefined && value !== codeEdit.value) codeEdit.value = value;
});

const onInput = (value: string) => {
	emit('update:modelValue', value);
};

const highlighter = (code: string) => {
	return highlight(code, prism.languages.text);
};
</script>

<style>
.op-code-editor {
	min-height: 100%;
	padding: 14px 16px 14px 0;
	background: #0F151D;
	color: rgb(230, 235, 242);
	font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	font-size: 13px;
	line-height: 22px;
}

.op-code-editor .prism-editor__line-numbers {
	min-width: 42px;
	padding: 0 12px 0 14px;
	color: #5D6878;
	text-align: right;
	user-select: none;
	line-height: 22px;
}

.op-code-editor .prism-editor__line-number {
	line-height: 22px;
}

.op-code-editor .prism-editor__textarea,
.op-code-editor .prism-editor__editor {
	white-space: pre;
	line-height: 22px;
}

.op-code-editor .prism-editor__container {
	overflow-x: auto;
}

.op-code-editor .prism-editor__textarea:focus {
	outline: none;
}

.op-code-editor .prism-editor__textarea::placeholder {
	color: #6B7685;
}

.prism-editor-wrapper {
	overflow: visible;
}
</style>
