<template>
	<!-- A read-only install command: line numbers, long lines wrapped, selectable for copying. -->
	<div class="my-0 max-h-[220px] min-h-[42px] overflow-auto bg-[#0F151D]">
		<CodeEditor
			:model-value="code ?? ''"
			class="op-install-editor"
			:language="language"
			aria-label="Installation command"
			readonly
			line-wrapping
		/>
	</div>
</template>

<script setup lang="ts">
import CodeEditor from '~/components/CodeEditor.vue';

defineProps<{
	code?: string;
	/** 'bash', 'powershell', ...: highlighted when set. */
	language?: string;
}>();
</script>

<style>
.op-code.op-install-editor {
	--op-code-font-size: 12.5px;
	--op-code-line-height: 1.6;
	--op-code-padding: 16px 8px;
	--op-code-gutter-width: 32px;
	--op-code-gutter-padding: 0 10px 0 4px;
}
</style>
