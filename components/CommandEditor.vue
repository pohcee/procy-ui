<template>
	<!--
		Code editor (CodeMirror) with line numbers. Always dark, in both themes; the parent
		decides the height. Supports v-model (and the legacy `code` prop).
	-->
	<CodeEditor
		v-model="codeEdit"
		class="op-command-editor"
		:aria-label="ariaLabel"
		:placeholder="placeholder"
		@update:model-value="onInput"
	/>
</template>

<script setup lang="ts">
import CodeEditor from '~/components/CodeEditor.vue';

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
</script>

<style>
.op-command-editor {
	min-height: 100%;
}
</style>
