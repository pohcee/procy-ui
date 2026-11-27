<template>
	<!--
		Shared shell for every Settings page: "Settings" page header, the settings
		sub-navigation (vertical on md+, scrolling tabs on phones) and the content column.
		Usage:
			<SettingsLayout heading="Users" description="…">
				<template #actions><AppButton>Add user</AppButton></template>
				…content…
			</SettingsLayout>
	-->
	<NewPageWrapper>
		<AppPage
			title="Settings"
			description="Your profile and preferences, plus server-wide administration."
		>
			<div class="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
				<NewSettingsSidebar />
				<div class="flex min-w-0 flex-1 flex-col gap-4">
					<div
						v-if="heading || $slots.actions"
						class="flex flex-wrap items-center justify-between gap-3"
					>
						<div class="min-w-0">
							<h2 class="text-lg font-semibold text-app-text">
								{{ heading }}
							</h2>
							<p
								v-if="description"
								class="mt-0.5 text-[13px] text-app-text-3"
							>
								{{ description }}
							</p>
						</div>
						<div
							v-if="$slots.actions"
							class="flex flex-wrap items-center gap-2"
						>
							<slot name="actions" />
						</div>
					</div>
					<slot />
				</div>
			</div>
		</AppPage>
	</NewPageWrapper>
</template>

<script setup lang="ts">
defineProps<{
	heading?: string;
	description?: string;
}>();
</script>

<style>
@reference "~/assets/css/tailwind.css";

/*
 * Form + table primitives shared by the settings pages and their dialogs
 * (dialogs are teleported to <body>, so these are intentionally global).
 */
.st-ctl {
	@apply h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 text-sm text-app-text placeholder:text-app-text-4;
	@apply focus:border-app-accent focus:outline-hidden focus:ring-2 focus:ring-app-accent/25;
	@apply disabled:cursor-not-allowed disabled:opacity-60 read-only:text-app-text-3;
}
textarea.st-ctl {
	@apply h-auto py-2.5 font-mono text-[13px] leading-relaxed;
}
select.st-ctl {
	@apply cursor-pointer appearance-none bg-no-repeat pr-9;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238E99A8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
	background-position: right 12px center;
}
.st-ctl.st-invalid {
	@apply border-app-danger focus:border-app-danger focus:ring-app-danger/25;
}
.st-field {
	@apply flex min-w-0 flex-col gap-1.5;
}
.st-label {
	@apply text-[13px] font-medium text-app-text-2;
}
.st-help {
	@apply text-xs text-app-text-3;
}
.st-error {
	@apply text-xs font-medium text-app-danger;
}
.st-check {
	@apply h-[18px] w-[18px] shrink-0 cursor-pointer accent-app-accent;
}
.st-grid2 {
	@apply grid grid-cols-1 gap-4 sm:grid-cols-2;
}
.st-group-title {
	@apply text-[13px] font-semibold uppercase tracking-[0.06em] text-app-text-3;
}
.st-table {
	@apply w-full border-collapse text-left text-sm;
}
.st-table th {
	@apply whitespace-nowrap border-b border-app-border bg-app-surface-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3;
}
.st-table td {
	@apply border-b border-app-border-subtle px-4 py-3 align-middle text-app-text;
}
.st-table tbody tr:last-child td {
	@apply border-b-0;
}
.st-table tbody tr:hover td {
	@apply bg-app-hover;
}
.st-chip {
	@apply inline-flex items-center rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2;
}
</style>
