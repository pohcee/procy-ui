<template>
	<Modal
		v-model="isOpen"
		title="Add Client Access"
		ok-text="Add Client Access"
		cancel-text="Cancel"
		:show-cancel="true"
		@close="close"
		@ok="save"
	>
		<div class="flex flex-col gap-5">
			<div class="flex flex-col gap-1.5">
				<label
					for="add-client-id"
					class="text-[13px] font-medium text-app-text-2"
				>ID</label>
				<input
					id="add-client-id"
					v-model="client.id"
					:class="['h-11 w-full rounded-[10px] border bg-app-surface px-3 font-mono text-[13px] text-app-text focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30', errors.id ? 'border-app-danger' : 'border-app-border-strong']"
					type="text"
					autocomplete="off"
					:aria-invalid="!!errors.id"
					:aria-describedby="errors.id ? 'add-client-id-error' : 'add-client-id-hint'"
				>
				<p
					v-if="errors.id"
					id="add-client-id-error"
					class="text-[13px] text-app-danger"
				>
					{{ errors.id }}
				</p>
				<p
					id="add-client-id-hint"
					class="text-xs text-app-text-3"
				>
					Use meaningful names as ID to organize your clients better or <button
						type="button"
						class="font-medium text-app-link underline hover:no-underline"
						@click="generateRandomID"
					>
						generate a random ID
					</button> instead.
				</p>
			</div>
			<div class="flex flex-col gap-1.5">
				<div class="flex items-baseline justify-between">
					<label
						for="add-client-password"
						class="text-[13px] font-medium text-app-text-2"
					>Password</label>
					<span
						class="text-xs text-app-text-3"
						aria-live="polite"
					>{{ client.password.length }} characters</span>
				</div>
				<input
					id="add-client-password"
					v-model="client.password"
					:class="['h-11 w-full rounded-[10px] border bg-app-surface px-3 font-mono text-[13px] text-app-text focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30', errors.password ? 'border-app-danger' : 'border-app-border-strong']"
					type="text"
					autocomplete="off"
					:aria-invalid="!!errors.password"
					:aria-describedby="errors.password ? 'add-client-password-error' : undefined"
				>
				<p
					v-if="errors.password"
					id="add-client-password-error"
					class="text-[13px] text-app-danger"
				>
					{{ errors.password }}
				</p>
			</div>
			<div
				class="flex flex-col gap-2 rounded-lg bg-app-blue-bg px-4 py-3 text-[13px] text-app-blue"
				role="note"
			>
				<p class="flex items-start gap-3">
					<Info
						class="mt-0.5 h-4 w-4 flex-none"
						aria-hidden="true"
					/>
					The password must be at least 12 characters long. Only alphanumeric and the following special characters _ + - . : are allowed.
				</p>
				<p class="flex items-start gap-3">
					<Info
						class="mt-0.5 h-4 w-4 flex-none"
						aria-hidden="true"
					/>
					The ID and the password are case-sensitive.
				</p>
			</div>
		</div>
	</Modal>
</template>

<script setup lang="ts">
import { Info } from 'lucide-vue-next';
import Modal from '~/components/Modal.vue';
import { randomID, randomSanitizedPassword } from '~/lib/utils';

const { $api } = useNuxtApp();
const isOpen = ref(false);

const client = ref({
	id: '',
	password: randomSanitizedPassword(15),
});

const errors = reactive({
	id: '',
	password: '',
});

const emit = defineEmits(['close', 'save']);
const generateRandomID = () => {
	client.value.id = randomID(10);
	validateId();
};
const open = () => {
	isOpen.value = true;
};

const save = async () => {
	validateId();
	validatePassword();

	if (!errors.id && !errors.password) {
		if (await showClientAccess(client.value)) {
			emit('save', client.value);
		}
	}
};

const showClientAccess = async (data: { id: string }) => {
	try {
		const response = await $api.clientAuth.show(data.id);
		if (response?.id) {
			errors.id = 'ID already exist.';
			return false;
		}
		return true;
	}
	catch {
		return true;
	}
};
const close = () => {
	emit('close');
	isOpen.value = false;
};

const validateId = () => {
	if (!client.value.id.trim()) {
		errors.id = 'The ID is required';
	}
	else {
		errors.id = '';
	}
};
const validatePassword = () => {
	if (!client.value.password) {
		errors.password = 'Password is invalid';
	}
	else if (client.value.password.length < 12) {
		errors.password = 'Password must be at least 12 characters long';
	}
	else if (!/^[a-zA-Z0-9_+\-.:]+$/.test(client.value.password)) {
		errors.password = 'Password can only contain alphanumeric characters and the special characters: _ + - . :';
	}
	else {
		errors.password = '';
	}
};
defineExpose({ open, close });
</script>
