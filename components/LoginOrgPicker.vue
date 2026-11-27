<template>
	<!-- Second sign-in step for users of several organizations: pick the one to work in. -->
	<form
		class="flex w-full flex-col gap-6 rounded-2xl border border-app-border bg-app-surface p-6 shadow-xs sm:p-8"
		novalidate
		@submit.prevent="submit"
	>
		<div>
			<span
				class="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-app-blue-bg text-app-blue"
				aria-hidden="true"
			>
				<Building2 class="h-6 w-6" />
			</span>
			<h1 class="text-2xl font-bold tracking-tight text-app-text">
				Choose an organization
			</h1>
			<p class="mt-1.5 text-sm text-app-text-3">
				Your account belongs to {{ organizations.length }} organizations. You can switch later from the menu.
			</p>
		</div>

		<fieldset class="flex max-h-[min(50dvh,360px)] flex-col gap-2 overflow-y-auto">
			<legend class="sr-only">
				Organization
			</legend>
			<label
				v-for="org in organizations"
				:key="org.id"
				:class="[
					'flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 transition-colors',
					picked === org.id ? 'border-app-accent bg-app-accent/10' : 'border-app-border-strong hover:bg-app-hover',
				]"
			>
				<input
					v-model="picked"
					type="radio"
					name="organization"
					:value="org.id"
					class="h-4 w-4 shrink-0 accent-[rgb(var(--app-accent))]"
				>
				<span class="min-w-0">
					<span class="block truncate text-sm font-medium text-app-text">{{ org.name }}</span>
					<span
						v-if="org.name !== org.id"
						class="block truncate font-mono text-xs text-app-text-3"
					>{{ org.id }}</span>
				</span>
			</label>
		</fieldset>

		<div
			v-if="errors.length > 0"
			class="flex items-start gap-2.5 rounded-[10px] border border-app-border bg-app-danger-bg p-3 text-sm text-app-danger"
			role="alert"
		>
			<CircleAlert
				class="mt-px h-[18px] w-[18px] shrink-0"
				aria-hidden="true"
			/>
			<span class="block first-letter:uppercase">{{ errors[0] }}</span>
		</div>

		<div class="flex flex-col gap-3">
			<button
				type="submit"
				:disabled="loading || !picked"
				class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-app-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-app-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-60"
			>
				<LoaderCircle
					v-if="loading"
					class="h-4 w-4 animate-spin"
					aria-hidden="true"
				/>
				Continue
			</button>
			<button
				type="button"
				class="inline-flex h-11 w-full items-center justify-center rounded-[10px] text-sm font-medium text-app-text-2 hover:bg-app-hover hover:text-app-text"
				@click="emit('cancel')"
			>
				Back to sign in
			</button>
		</div>
	</form>
</template>

<script setup lang="ts">
import { Building2, CircleAlert, LoaderCircle } from 'lucide-vue-next';
import type { OrgRef } from '~/utils/membership';

const props = defineProps<{
	organizations: OrgRef[];
	loading?: boolean;
	errors: string[];
}>();
const emit = defineEmits<{
	(e: 'pick', id: string): void;
	(e: 'cancel'): void;
}>();

const picked = ref<string>(props.organizations[0]?.id ?? '');
const submit = () => {
	if (picked.value) emit('pick', picked.value);
};
</script>
