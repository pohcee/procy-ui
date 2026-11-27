<template>
	<div class="flex flex-col gap-3">
		<section
			class="overflow-hidden rounded-xl border border-app-border"
			aria-label="Linux installation command"
		>
			<div class="flex items-center justify-between gap-2 border-b border-app-border bg-app-surface-2 px-3 py-1.5">
				<span class="text-[13px] font-semibold text-app-text">Linux</span>
				<AppButton
					variant="ghost"
					size="sm"
					@click="copyCode(linuxCode, 'copy-linux')"
				>
					<Copy
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Copy
				</AppButton>
			</div>
			<InstallEditor
				:code="linuxCode"
				language="bash"
				:disabled="disabled"
			/>
		</section>
		<section
			class="overflow-hidden rounded-xl border border-app-border"
			aria-label="Windows installation command"
		>
			<div class="flex items-center justify-between gap-2 border-b border-app-border bg-app-surface-2 px-3 py-1.5">
				<span class="text-[13px] font-semibold text-app-text">Windows</span>
				<AppButton
					variant="ghost"
					size="sm"
					@click="copyCode(windowsCode, 'copy-windows')"
				>
					<Copy
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Copy
				</AppButton>
			</div>
			<InstallEditor
				:code="windowsCode"
			/>
		</section>
	</div>
</template>

<script setup lang="ts">
import { Copy } from 'lucide-vue-next';
import { useClipboard } from '@vueuse/core';
import InstallEditor from '~/components/clients/InstallEditor.vue';

interface Props {
	linuxCode: string;
	windowsCode: string;
	disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
	disabled: false,
});

const emit = defineEmits<{
	'copy-linux': [code: string];
	'copy-windows': [code: string];
}>();

const { copy } = useClipboard({ legacy: true });
const snackbar = useSnackbar();

const copyCode = async (code: string, event: 'copy-linux' | 'copy-windows') => {
	await copy(code);
	snackbar.add({ type: 'success', text: 'Command copied to clipboard' });
	if (event === 'copy-linux') emit('copy-linux', code);
	else emit('copy-windows', code);
};
</script>
