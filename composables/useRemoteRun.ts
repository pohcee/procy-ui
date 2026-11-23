import type { CommandResult, JobClientTags } from '~/types';
import type { RunKind } from '~/utils/runKind';
import { apiBaseUrl } from '~/utils/apiBase';
import { readAuthToken } from '~/utils/authToken';

export interface RemoteRunOptions {
	kind: RunKind;
	code: string;
	clientIds?: string[];
	groupIds?: string[];
	tags?: JobClientTags | null;
	cwd?: string;
	/** '' = the device default (/bin/sh or the script's shebang). */
	interpreter?: string;
	isSudo?: boolean;
	timeoutSec?: number;
	abortOnError?: boolean;
	executeConcurrently?: boolean;
}

export interface RemoteEntryRunOptions {
	entryId: string;
	clientIds?: string[];
	groupIds?: string[];
	tags?: JobClientTags | null;
	abortOnError?: boolean;
	executeConcurrently?: boolean;
}

/** Base64 of the UTF-8 bytes (plain btoa() throws on non-Latin-1 text). */
const toBase64 = (text: string) => {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	bytes.forEach((b) => {
		binary += String.fromCharCode(b);
	});
	return btoa(binary);
};

/** ws:// for an http API, wss:// for https (same origin when no API URL is configured). */
const socketBase = (apiUrl: unknown) => {
	const url = apiBaseUrl(apiUrl);
	return `${url.protocol === 'http:' ? 'ws:' : 'wss:'}//${url.host}`;
};

/**
 * Runs a command or a script on one or more devices over the server's
 * websocket API and collects the per-device results as they arrive.
 */
export const useRemoteRun = () => {
	const config = useRuntimeConfig();

	let ws: WebSocket | null = null;
	const results = ref<CommandResult[]>([]);
	const isLoading = ref(false);
	const error = ref<string | null>(null);
	const lastKind = ref<RunKind | null>(null);

	const disconnect = () => {
		ws?.close();
		ws = null;
	};

	// The server treats an empty `client_ids: []` as "targeting by client" and rejects it
	// next to group or tag targeting, so leave empty lists out entirely.
	const nonEmpty = (ids?: string[]) => (ids && ids.length ? ids : undefined);

	const open = (endpoint: string, payload: object, kind: RunKind | null) => {
		disconnect();
		const url = `${socketBase(config.public.apiUrl)}/api/v1/ws/${endpoint}?access_token=${readAuthToken() ?? ''}`;

		results.value = [];
		error.value = null;
		isLoading.value = true;
		lastKind.value = kind;

		const socket = new WebSocket(url);
		ws = socket;
		socket.onopen = () => socket.send(JSON.stringify(payload));
		socket.onmessage = (event) => {
			results.value.push(JSON.parse(event.data) as CommandResult);
			isLoading.value = false;
		};
		socket.onerror = () => {
			error.value = 'Could not reach the server to run this. Check your connection and try again.';
			isLoading.value = false;
			socket.close();
		};
		socket.onclose = () => {
			isLoading.value = false;
		};
	};

	const run = (options: RemoteRunOptions) => {
		open(options.kind === 'script' ? 'scripts' : 'commands', {
			...(options.kind === 'script'
				? { script: toBase64(options.code) }
				: { command: options.code }),
			client_ids: nonEmpty(options.clientIds),
			group_ids: nonEmpty(options.groupIds),
			tags: options.tags ?? undefined,
			cwd: options.cwd || undefined,
			interpreter: normalizeInterpreter(options.interpreter) || undefined,
			is_sudo: options.isSudo ?? false,
			timeout_sec: options.timeoutSec ?? 300,
			abort_on_error: options.abortOnError ?? true,
			execute_concurrently: options.executeConcurrently ?? true,
		}, options.kind);
	};

	/** Runs a library entry (its active version, resolved by the server when the run starts). */
	const runEntry = (options: RemoteEntryRunOptions) => {
		open('library-entries', {
			entry_id: options.entryId,
			client_ids: nonEmpty(options.clientIds),
			group_ids: nonEmpty(options.groupIds),
			tags: options.tags ?? undefined,
			abort_on_error: options.abortOnError ?? true,
			execute_concurrently: options.executeConcurrently ?? true,
		}, null);
	};

	return { run, runEntry, disconnect, results, isLoading, error, lastKind };
};
