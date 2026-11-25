<template>
	<!-- Pending invitations into other organizations (hidden when there are none, and on servers without them). -->
	<NuxtLink
		v-if="count > 0"
		to="/invitations"
		:aria-current="active ? 'page' : undefined"
		:class="[
			'mb-2 flex h-11 items-center gap-2.5 rounded-lg border border-[#2A3442] px-2.5 text-[13px] font-medium transition-colors',
			active ? 'bg-app-nav-active text-white' : 'text-[#C9D1DC] hover:bg-app-nav-hover hover:text-white',
		]"
		@click="emit('navigate')"
	>
		<MailPlus
			class="h-4 w-4 shrink-0 text-[#8C96A5]"
			aria-hidden="true"
		/>
		<span class="min-w-0 flex-1 truncate">{{ count === 1 ? 'Invitation' : 'Invitations' }}</span>
		<span
			class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-app-accent px-1.5 text-[11px] font-semibold text-white"
			:aria-label="`${count} pending`"
		>{{ count }}</span>
	</NuxtLink>
</template>

<script setup lang="ts">
import { MailPlus } from 'lucide-vue-next';

const emit = defineEmits<{ (e: 'navigate'): void }>();
const { count } = useInvitations();
const route = useRoute();
const active = computed(() => route.path.toLowerCase().replace(/\/+$/, '') === '/invitations');
</script>
