<template>
	<div class="flex flex-col gap-4">
		<template v-if="props.readonly">
			<p
				v-if="!draft.code"
				class="text-sm text-app-text-3"
			>
				Not implemented for {{ label }}.
			</p>
			<template v-else>
				<pre
					class="max-h-[300px] min-h-[120px] overflow-auto rounded-xl border border-app-border bg-[#0F151D] p-3.5 font-mono text-[13px] leading-[22px] text-[#E6EBF2]"
					tabindex="0"
					:aria-label="`${label} code (read-only)`"
				>{{ draft.code }}</pre>
				<p class="text-xs text-app-text-3">
					Runs as {{ draft.kind }}<template v-if="draft.interpreter && draft.interpreter !== 'default'">
						with {{ draft.interpreter }}
					</template><template v-if="draft.isSudo">
						, with sudo
					</template>; timeout {{ draft.timeoutSec }}s<template v-if="draft.cwd">
						; in {{ draft.cwd }}
					</template>.
				</p>
			</template>
		</template>
		<template v-else>
			<RunEditor
				v-model:code="draft.code"
				v-model:kind="draft.kind"
				:detected-kind="detectedKind"
				compact
				@insert="emit('insert')"
			/>
			<p
				v-if="!draft.code"
				class="text-xs text-app-text-3"
			>
				Leave this tab empty if the entry doesn’t apply to {{ label }}.
			</p>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<OpField
					label="Working directory"
					:for-id="`${uid}-cwd`"
				>
					<OpInput
						:id="`${uid}-cwd`"
						v-model="draft.cwd"
						mono
					/>
				</OpField>
				<CustomThemedSelect
					:id="`${uid}-interpreter`"
					v-model="draft.interpreter"
					label="Interpreter"
					placeholder="Select…"
					:options="interpreterOptionsWith(draft.interpreter)"
				/>
			</div>
			<div class="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
				<OpField
					label="Timeout (seconds)"
					:for-id="`${uid}-timeout`"
				>
					<OpInput
						:id="`${uid}-timeout`"
						v-model="draft.timeoutSec"
						type="number"
						min="1"
					/>
				</OpField>
				<OpCheckbox
					v-model="draft.isSudo"
					class="sm:pb-1.5"
				>
					Use sudo <span class="text-app-text-3">(Unix only)</span>
				</OpCheckbox>
			</div>
			<div v-if="draft.code">
				<AppButton
					variant="ghost"
					size="sm"
					@click="emit('remove')"
				>
					<Trash2
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Remove this OS
				</AppButton>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpCheckbox from '~/components/operate/OpCheckbox.vue';
import RunEditor from '~/components/run/RunEditor.vue';
import type { OsDraft } from '~/components/library/entryDraft';
import { interpreterOptionsWith, normalizeInterpreter } from '~/utils/interpreter';
import { detectRunKind } from '~/utils/runKind';

const props = defineProps<{
	/** The OS name shown to people (Linux, Windows, macOS). */
	label: string;
	readonly?: boolean;
}>();

const emit = defineEmits<{
	(e: 'insert' | 'remove'): void;
}>();

const draft = defineModel<OsDraft>({ required: true });
const uid = useId();

const detectedKind = computed(() => detectRunKind(draft.value.code, normalizeInterpreter(draft.value.interpreter)));
</script>
