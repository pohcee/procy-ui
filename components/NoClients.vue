<template>
	<div class="flex flex-col gap-4">
		<section class="flex flex-col items-center rounded-xl border border-app-border bg-app-surface px-4 py-12 text-center">
			<img
				src="/img/procy-raccoon.svg"
				alt=""
				width="108"
				height="124"
				class="block h-[124px] w-[108px]"
			>
			<h2 class="mt-4 text-[15px] font-semibold text-app-text">
				No clients available
			</h2>
			<p class="mt-1.5 max-w-sm text-[13px] text-app-text-3">
				Quite bleak here. Start by adding a client to your Procy server.
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
import { Plus } from 'lucide-vue-next';
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
