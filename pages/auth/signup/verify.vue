<template>
	<SignupVerify />
</template>

<script setup lang="ts">
import SignupVerify from '~/components/signup/SignupVerify.vue';

// The link the signup email points to (<public_url>/auth/signup/verify?token=...).
definePageMeta({ layout: 'auth' });
</script>
