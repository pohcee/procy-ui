import type { ServerCapabilities } from '~/types';

export type Capability = keyof ServerCapabilities;

/**
 * Features the connected server offers, from GET /api/v1/status → capabilities.
 * Components hide entry points for features that are not offered. Servers that don't
 * report capabilities offer everything, so nothing is hidden for them.
 */
export const useCapabilities = () => {
	const statusStore = useStatusStore();
	statusStore.ensureStatus();

	/** Whether the server offers the feature (reactive inside computed/templates). */
	const has = (name: Capability): boolean => statusStore.hasCapability(name);

	/** Some kind of tunnel can be created (a server port, or the built-in HTTP proxy). */
	const canCreateTunnels = computed(() => has('port_tunnels') || has('http_proxy_tunnels'));

	/** The user is a platform operator (opt-in: only an explicit `operator: true` counts). */
	const operator = computed(() => statusStore.isEnabled('operator'));
	/** Usage metering is on (opt-in: only an explicit `usage: true` counts). */
	const usage = computed(() => statusStore.isEnabled('usage'));

	/** Logins may belong to several organizations: invitations and members (opt-in, Postgres servers). */
	const organizations = computed(() => statusStore.isEnabled('organizations'));

	return { has, canCreateTunnels, operator, usage, organizations };
};
