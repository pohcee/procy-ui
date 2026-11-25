<template>
	<SignupVerify />
</template>

<script setup lang="ts">
import SignupVerify from '~/components/signup/SignupVerify.vue';

// Same as /auth/signup/verify (the path the emails use).
definePageMeta({ layout: 'auth' });
</script>
