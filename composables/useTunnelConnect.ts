import { useLocalStorage } from '@vueuse/core';
import type { Tunnel } from '~/types';
import { apiBaseUrl } from '~/utils/apiBase';

/** What kind of session a tunnel carries, which decides how "Connect" behaves. */
export type TunnelKind = 'ssh' | 'rdp' | 'http' | 'https' | 'vnc' | 'other';

const PORT_KINDS: Record<string, TunnelKind> = { 22: 'ssh', 3389: 'rdp', 80: 'http', 443: 'https', 5900: 'vnc' };

/** Kind from the tunnel's scheme, else from the well-known destination port. */
export const tunnelKind = (t: Pick<Tunnel, 'scheme' | 'rport' | 'http_proxy' | 'tunnel_url'>): TunnelKind => {
	const scheme = (t.scheme || '').toLowerCase();
	if (scheme === 'ssh' || scheme === 'rdp' || scheme === 'http' || scheme === 'https' || scheme === 'vnc') return scheme;
	if (scheme === 'realvnc') return 'vnc';
	if (t.http_proxy || t.tunnel_url) return 'https';
	return PORT_KINDS[String(t.rport)] ?? 'other';
};

/** Button label for the kind. */
export const connectLabel = (kind: TunnelKind) => (kind === 'http' || kind === 'https' ? 'Open' : 'Connect');

/** Secure Shell (Chrome extension by Google) — opens connections via its nassh page. */
const SECURE_SHELL_EXTENSION_ID = 'iodihamcpbpeioajjeobimgagajmlibd';

/**
 * Connection preferences from Settings → Profile → Preferences (stored per browser).
 * The keys match pages/Profile.vue.
 */
export const useConnectionPrefs = () => ({
	useSecureShellExtension: useLocalStorage('profile_use_secure_shell_extension', 'false'),
	rdpConnectionMethod: useLocalStorage('profile_rdp_connection_method', 'microsoft_remote_desktop'),
	rdpWidth: useLocalStorage('profile_rdp_width', '1024'),
	rdpHeight: useLocalStorage('profile_rdp_height', '768'),
	defaultRdpUsername: useLocalStorage('profile_default_rdp_username', ''),
	/** Last SSH username used per device (client id → username). */
	sshUsernames: useLocalStorage<Record<string, string>>('tunnel_ssh_usernames', {}),
});

/** The host people connect to: the server's tunnel host, else the API/UI host. */
export const useTunnelHost = () => {
	const config = useRuntimeConfig();
	const statusStore = useStatusStore();
	return computed(() => {
		const tunnelHost = statusStore.status?.tunnel_host;
		if (tunnelHost) return tunnelHost;
		try {
			return apiBaseUrl(config.public.apiUrl).hostname;
		}
		catch {
			return window.location.hostname;
		}
	});
};

export interface ConnectTarget {
	tunnel: Tunnel;
	host: string;
	/** Used for the .rdp file name. */
	deviceName?: string;
	/** The device's client id (some tunnel listings omit tunnel.client_id). */
	clientId?: string;
}

export const browserUrl = ({ tunnel, host }: ConnectTarget) => tunnel.tunnel_url
	|| `${tunnelKind(tunnel) === 'https' ? 'https' : 'http'}://${host}:${tunnel.lport}`;

export const sshCommand = ({ tunnel, host }: ConnectTarget, user?: string) =>
	`ssh -p ${tunnel.lport} ${user ? `${user}@` : '<user>@'}${host}`;

/** A standard .rdp file honouring the RDP preferences. */
export const rdpFileContent = ({ tunnel, host }: ConnectTarget, prefs: { username?: string; width?: string; height?: string }) => [
	`full address:s:${host}:${tunnel.lport}`,
	prefs.username ? `username:s:${prefs.username}` : '',
	`desktopwidth:i:${Number(prefs.width) || 1024}`,
	`desktopheight:i:${Number(prefs.height) || 768}`,
	'screen mode id:i:1',
	'use multimon:i:0',
	'prompt for credentials:i:1',
].filter(Boolean).join('\r\n') + '\r\n';

/**
 * rdp:// link as a standard URL: rdp://[user@]host:port?desktopwidth=W&desktopheight=H.
 * (Microsoft's "rdp://full%20address=s:…" form is not a valid URL, so Chrome blocks it.)
 * Remmina understands rdp://user@host:port; the query carries the window size for handlers that read it.
 */
export const rdpUri = ({ tunnel, host }: ConnectTarget, prefs: { username?: string; width?: string; height?: string }) => {
	const user = prefs.username ? `${encodeURIComponent(prefs.username)}@` : '';
	const size = `desktopwidth=${Number(prefs.width) || 1024}&desktopheight=${Number(prefs.height) || 768}`;
	return `rdp://${user}${host}:${tunnel.lport}?${size}`;
};

/** Open an app-protocol link (ssh://, rdp://, vnc://) without leaving the page. */
const openAppLink = (url: string) => {
	const a = document.createElement('a');
	a.href = url;
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	a.remove();
};

const download = (name: string, content: string, type: string) => {
	const url = URL.createObjectURL(new Blob([content], { type }));
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
};

/**
 * Launches the right client for a tunnel, following the user's connection preferences:
 * - http/https: opens the tunnel in a new browser tab;
 * - ssh: the Secure Shell Chrome extension when enabled, else an ssh:// link for the system client;
 * - rdp: an .rdp file download or an rdp:// link, with the default RDP username and window size;
 * - vnc: a vnc:// link.
 * Returns a short description of what it did (for a toast).
 */
export const useTunnelConnect = () => {
	const prefs = useConnectionPrefs();

	const connect = (target: ConnectTarget, opts: { sshUser?: string } = {}): string => {
		const { tunnel, host } = target;
		const kind = tunnelKind(tunnel);
		switch (kind) {
			case 'http':
			case 'https': {
				window.open(browserUrl(target), '_blank', 'noopener');
				return 'Opened in a new tab';
			}
			case 'ssh': {
				const user = (opts.sshUser || '').trim();
				const clientId = target.clientId || tunnel.client_id;
				if (user && clientId) {
					prefs.sshUsernames.value = { ...prefs.sshUsernames.value, [clientId]: user };
				}
				const who = user ? `${encodeURIComponent(user)}@` : '';
				if (prefs.useSecureShellExtension.value === 'true') {
					window.open(`chrome-extension://${SECURE_SHELL_EXTENSION_ID}/html/nassh.html#${who}${host}:${tunnel.lport}`, '_blank');
					return 'Opening Secure Shell';
				}
				openAppLink(`ssh://${who}${host}:${tunnel.lport}`);
				return 'Opening your SSH client';
			}
			case 'rdp': {
				const rdpPrefs = { username: prefs.defaultRdpUsername.value, width: prefs.rdpWidth.value, height: prefs.rdpHeight.value };
				if (prefs.rdpConnectionMethod.value === 'schema_link') {
					openAppLink(rdpUri(target, rdpPrefs));
					return 'Opening your RDP client';
				}
				const name = `${(target.deviceName || target.clientId || tunnel.client_id || 'rport').replace(/[^\w.-]+/g, '_')}-${tunnel.lport}.rdp`;
				download(name, rdpFileContent(target, rdpPrefs), 'application/x-rdp');
				return `Downloaded ${name}`;
			}
			case 'vnc': {
				openAppLink(`vnc://${host}:${tunnel.lport}`);
				return 'Opening your VNC viewer';
			}
			default:
				return '';
		}
	};

	return { connect, prefs };
};
