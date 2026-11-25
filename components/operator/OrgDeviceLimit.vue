<template>
	<!-- "12 / 50" with a small meter; amber from 90 %, red at the limit. -->
	<span class="inline-flex items-center gap-2">
		<span :class="['font-medium', tone === 'full' ? 'text-app-danger' : tone === 'near' ? 'text-app-warn' : 'text-app-text']">
			{{ deviceLimitLabel(org.device_count, org.device_limit) }}
		</span>
		<span
			v-if="use !== null"
			class="h-1.5 w-12 overflow-hidden rounded-full bg-app-muted"
			role="meter"
			:aria-valuenow="org.device_count"
			aria-valuemin="0"
			:aria-valuemax="org.device_limit ?? undefined"
			:aria-label="`${org.device_count} of ${org.device_limit} devices`"
		>
			<span
				:class="['block h-full rounded-full', tone === 'full' ? 'bg-app-danger' : tone === 'near' ? 'bg-app-warn' : 'bg-app-accent']"
				:style="{ width: `${Math.min(100, Math.max(4, use * 100))}%` }"
			/>
		</span>
		<span
			v-if="tone === 'full'"
			class="sr-only"
		>(at the limit)</span>
	</span>
</template>

<script setup lang="ts">
import type { Organization } from '~/repository/modules/operator';
import { deviceLimitLabel, deviceLimitUse } from '~/utils/usage';

const props = defineProps<{ org: Pick<Organization, 'device_count' | 'device_limit'> }>();
const use = computed(() => deviceLimitUse(props.org.device_count, props.org.device_limit));
const tone = computed(() => (use.value === null ? 'none' : use.value >= 1 ? 'full' : use.value >= 0.9 ? 'near' : 'ok'));
</script>
