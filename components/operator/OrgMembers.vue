<template>
	<!-- The members of one organization, for platform operators: groups there, and how many organizations each is in. -->
	<AppCard
		flush
		title="Members"
		:description="members?.length ? `${formatCount(members.length)} ${members.length === 1 ? 'login' : 'logins'}; an account in several organizations has the same password and 2FA in each.` : undefined"
	>
		<OpEmpty
			v-if="members === null || error || !members.length"
			:icon="UsersIcon"
			:loading="members === null && !error"
			:title="error ? 'Couldn’t load the members' : members === null ? 'Loading members…' : 'No members yet'"
			:description="error || (members?.length === 0 ? 'Add an administrator to let someone sign in.' : undefined)"
		/>
		<template v-else>
			<table class="hidden w-full border-collapse md:table">
				<thead>
					<tr class="bg-app-surface-2">
						<th
							scope="col"
							class="whitespace-nowrap border-b border-app-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4"
						>
							Login
						</th>
						<th
							scope="col"
							class="whitespace-nowrap border-b border-app-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4"
						>
							Groups
						</th>
						<th
							scope="col"
							class="w-48 whitespace-nowrap border-b border-app-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4"
						>
							Organizations
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="m in members"
						:key="m.username"
						class="hover:bg-app-hover [&:last-child>td]:border-b-0"
					>
						<td class="border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px] font-medium text-app-text">
							{{ m.username }}
						</td>
						<td class="border-b border-app-border-subtle px-3 py-3">
							<div class="flex flex-wrap gap-1.5">
								<span
									v-for="g in m.groups"
									:key="g"
									class="inline-flex items-center rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
								>{{ g }}</span>
								<span
									v-if="!m.groups.length"
									class="text-app-text-4"
								>—</span>
							</div>
						</td>
						<td class="border-b border-app-border-subtle px-3 py-3">
							<span
								v-if="m.organizations > 1"
								class="inline-flex items-center rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
							>{{ m.organizations }} organizations</span>
							<span
								v-else
								class="text-[13px] text-app-text-3"
							>Only this one</span>
						</td>
					</tr>
				</tbody>
			</table>
			<ul class="divide-y divide-app-border-subtle md:hidden">
				<li
					v-for="m in members"
					:key="m.username"
					class="px-4 py-3"
				>
					<p class="truncate text-[15px] font-medium text-app-text">
						{{ m.username }}
					</p>
					<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
						<span
							v-for="g in m.groups"
							:key="g"
							class="inline-flex items-center rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
						>{{ g }}</span>
						<span class="text-[13px] text-app-text-3">
							{{ m.organizations > 1 ? `· ${m.organizations} organizations` : '· only this one' }}
						</span>
					</div>
				</li>
			</ul>
		</template>
	</AppCard>
</template>

<script setup lang="ts">
import { Users as UsersIcon } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import type { OrgMember } from '~/utils/membership';
import { formatCount } from '~/utils/usage';

const props = defineProps<{ id: string }>();
const { $api } = useNuxtApp();

/** null: loading. */
const members = ref<OrgMember[] | null>(null);
const error = ref<string | null>(null);

let seq = 0;
watch(() => props.id, async (id) => {
	const mine = ++seq;
	members.value = null;
	error.value = null;
	try {
		const list = await $api.operator.members(id);
		if (mine === seq) members.value = list;
	}
	catch (e) {
		if (mine === seq) error.value = httpStatusOf(e) === 404 ? 'This server lists no members (no membership API).' : apiErrorMessage(e);
	}
}, { immediate: true });
</script>
