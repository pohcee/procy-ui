<template>
	<!--
		The code editor used wherever code runs on devices (Execute, device "Run" tab, schedules):
		a bar with the "Run as" choice (Auto picks command or script from the code) and
		"Insert from library", the editor, and an optional footer.
	-->
	<section
		aria-label="Code to run"
		class="overflow-hidden rounded-xl border border-app-border bg-[#0F151D]"
		@keydown.ctrl.enter.prevent="emit('submit')"
		@keydown.meta.enter.prevent="emit('submit')"
	>
		<div class="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#222B37] px-3.5 py-2">
			<div class="flex min-w-0 flex-1 items-center gap-1.5">
				<slot name="leading" />
				<label
					:for="`${uid}-kind`"
					class="sr-only"
				>Run as</label>
				<select
					:id="`${uid}-kind`"
					v-model="kindChoice"
					class="h-8 shrink-0 cursor-pointer rounded-md border border-[#2E3947] bg-[#131B25] py-0 pl-2 pr-7 font-mono text-xs text-[#C2CAD6] focus:border-[#3A4656] focus:outline-hidden"
					title="How this runs on the device"
				>
					<option value="auto">
						Auto · {{ detectedKind }}
					</option>
					<option value="command">
						Command
					</option>
					<option value="script">
						Script
					</option>
				</select>
			</div>
			<button
				type="button"
				class="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-[#9DC1FF] hover:bg-[#18202A] hover:text-[#C3D9FF]"
				@click="emit('insert')"
			>
				<FolderOpen
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Insert from library
			</button>
		</div>
		<div :class="['overflow-auto', compact ? 'max-h-[300px] min-h-[180px]' : 'max-h-[60vh] min-h-[200px] sm:min-h-[260px]']">
			<CommandEditor
				v-model="code"
				:class="compact ? 'min-h-[180px]' : 'min-h-[200px] sm:min-h-[260px]'"
				aria-label="Command or script"
			/>
		</div>
		<slot name="footer" />
	</section>
</template>

<script setup lang="ts">
import { FolderOpen } from 'lucide-vue-next';
import CommandEditor from '~/components/CommandEditor.vue';
import type { RunKind } from '~/utils/runKind';

defineProps<{
	/** What "Auto" resolves to for the current code and interpreter. */
	detectedKind: RunKind;
	/** Smaller editor, for dialogs. */
	compact?: boolean;
}>();

const emit = defineEmits<{
	(e: 'insert' | 'submit'): void;
}>();

const code = defineModel<string>('code', { required: true });
const kindChoice = defineModel<'auto' | RunKind>('kind', { required: true });

const uid = useId();
</script>
