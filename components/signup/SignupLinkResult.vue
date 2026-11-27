<template>
	<!-- Result card of a link from a signup email (verify, cancel a deletion): working, done, or refused. -->
	<div class="flex w-full flex-col gap-6 rounded-2xl border border-app-border bg-app-surface p-6 shadow-xs sm:p-8">
		<div
			v-if="state === 'working'"
			class="flex items-center justify-center gap-2 py-10 text-sm text-app-text-3"
			role="status"
		>
			<LoaderCircle
				class="h-4 w-4 animate-spin"
				aria-hidden="true"
			/>
			{{ workingText }}
		</div>
		<template v-else>
			<div>
				<span
					:class="[
						'mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl',
						state === 'error' ? 'bg-app-danger-bg text-app-danger' : state === 'waiting' ? 'bg-app-warn-bg text-app-warn' : 'bg-app-ok-bg text-app-ok',
					]"
					aria-hidden="true"
				>
					<CircleAlert
						v-if="state === 'error'"
						class="h-6 w-6"
					/>
					<Hourglass
						v-else-if="state === 'waiting'"
						class="h-6 w-6"
					/>
					<CircleCheck
						v-else
						class="h-6 w-6"
					/>
				</span>
				<h1 class="text-2xl font-bold tracking-tight text-app-text">
					{{ title }}
				</h1>
				<p
					class="mt-1.5 text-sm text-app-text-3"
					:role="state === 'error' ? 'alert' : undefined"
				>
					<slot />
				</p>
			</div>
			<div class="flex flex-col gap-3">
				<slot name="actions" />
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { CircleAlert, CircleCheck, Hourglass, LoaderCircle } from 'lucide-vue-next';

defineProps<{
	state: 'working' | 'done' | 'waiting' | 'error';
	title: string;
	workingText: string;
}>();
</script>
