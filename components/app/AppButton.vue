<template>
	<!--
		Button in the OpenRPort2 style. Renders a NuxtLink when `to` is set.
		variant: primary (accent fill) | secondary (outlined) | ghost | danger (red text)
		size: md (44px, default) | sm (36px)
	-->
	<component
		:is="to ? NuxtLinkComp : 'button'"
		:to="to"
		:type="to ? undefined : type"
		:disabled="to ? undefined : disabled"
		:class="classes"
	>
		<slot />
	</component>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
	size?: 'md' | 'sm';
	type?: 'button' | 'submit' | 'reset';
	to?: string;
	disabled?: boolean;
}>(), {
	variant: 'primary',
	size: 'md',
	type: 'button',
	to: undefined,
	disabled: false,
});

const NuxtLinkComp = resolveComponent('NuxtLink');

const classes = computed(() => [
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-colors',
	'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent',
	'disabled:cursor-not-allowed disabled:opacity-50',
	props.size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-11 px-4 text-sm',
	{
		primary: 'bg-app-accent font-semibold text-white hover:bg-app-accent-hover',
		secondary: 'border border-app-border-strong bg-app-surface text-app-text hover:bg-app-hover',
		ghost: 'text-app-text-2 hover:bg-app-hover hover:text-app-text',
		danger: 'text-app-danger hover:bg-app-danger-bg',
	}[props.variant],
]);
</script>
