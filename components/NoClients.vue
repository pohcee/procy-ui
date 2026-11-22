<template>
	<div class="flex flex-col gap-4">
		<section class="flex flex-col items-center rounded-xl border border-app-border bg-app-surface px-4 py-12 text-center">
			<span
				class="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-app-muted text-app-text-3"
				aria-hidden="true"
			>
				<MonitorX class="h-7 w-7" />
			</span>
			<h2 class="mt-4 text-[15px] font-semibold text-app-text">
				No clients available
			</h2>
			<p class="mt-1.5 max-w-sm text-[13px] text-app-text-3">
				Quite bleak here. Start by adding a client to your OpenRPort2 server.
			</p>
			<AppButton
				class="mt-5"
				@click="openAddClientModal"
			>
				<Plus
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Add Client Access
			</AppButton>
		</section>
		<AddClientModal
			ref="addClientModal"
			@save="handleCreateClientAccess"
		/>
	</div>
</template>

<script setup lang="ts">
import { MonitorX, Plus } from 'lucide-vue-next';
import AddClientModal from '~/components/clients/AddClientModal.vue';

const { createClientAccess } = useClientAccess();

const addClientModal = ref<InstanceType<typeof AddClientModal> | null>(null);

const openAddClientModal = () => {
	addClientModal.value?.open();
};

const handleCreateClientAccess = async (data: { id: string; password: string }) => {
	await createClientAccess(data);
	addClientModal.value?.close();
};
</script>
