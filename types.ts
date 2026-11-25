export interface ILoginInput {
	username: string;
	password: string;
	remember_me: string;
	/** The organization picked at login when the user belongs to several (Postgres servers). */
	organization?: string;
	/** A new password, when the server says the current one has expired (sent with POST /login). */
	new_password?: string;
}
export interface UpdateSummary {
	title: string;
	description: string;
	reboot_required: boolean;
	is_security_update: boolean;
}
export interface UpdatesStatus {
	refreshed: Date;
	updates_available: number;
	security_updates_available: number;
	update_summaries: UpdateSummary[];
	reboot_pending: boolean;
}
export interface VaultStatus {
	init: 'uninitialized' | 'setup-completed';
	status: 'locked' | 'unlocked' | '';
	/** True when the server manages the vault key: no passphrase is needed. Absent otherwise. */
	managed?: boolean;
}

export interface ClientAuth {
	id: string;
	password: string;
}

export interface ClientAuthResponse {
	data: ClientAuth[];
	meta: Meta;
}
export interface Client {
	id: string;
	name: string;
	address?: string;
	/** Hostname the client connected with (Host header of its connection). */
	connected_host?: string;
	hostname?: string;
	os: string;
	os_full_name: string;
	os_version?: string;
	os_arch?: string;
	os_family: string;
	os_kernel: string;
	os_virtualization_system?: string;
	os_virtualization_role?: string;
	num_cpus?: number;
	cpu_family?: string;
	cpu_model?: string;
	cpu_model_name?: string;
	cpu_vendor?: string;
	mem_total?: number;
	timezone?: string;
	client_auth_id?: string;
	version?: string;
	disconnected_at: null;
	last_heartbeat_at?: Date;
	connection_state?: string;
	ipv4: string[];
	ipv6?: string[];
	tags: string[];
	allowed_user_groups?: null;
	tunnels?: Tunnel[];
	updates_status?: UpdatesStatus;
	client_configuration?: Record<string, unknown>;
	groups?: string[];
	labels?: Record<string, string>;
}
export interface ClientMetric {
	cpu_usage_percent: number;
	io_usage_percent: number;
	memory_usage_percent: number;
	timestamp: string;
}

export interface ClientMountpoint {
	mountpoints: Record<string, number>;
	timestamp: string;
}

export interface DiskUsage {
	mount: string;
	free: number;
	total: number;
	usedPercent: number;
}
export interface Meta {
	count: number;
}
export interface ClientsResponse {
	data: Client[];
	meta: Meta;
}
export interface ClientMetricsResponse {
	data: ClientMetric[];
	meta: Meta;
}
export interface ClientMountpointsResponse {
	data: ClientMountpoint[];
	meta: Meta;
}
/** Mirrors cgroups.ClientParams in the rport server. */
export interface ClientGroupParams {
	client_id?: string[] | null;
	name?: string[] | null;
	os?: string[] | null;
	os_arch?: string[] | null;
	os_family?: string[] | null;
	os_kernel?: string[] | null;
	hostname?: string[] | null;
	ipv4?: string[] | null;
	ipv6?: string[] | null;
	tag?: string[] | JobClientTags | null;
	version?: string[] | null;
	address?: string[] | null;
	client_auth_id?: string[] | null;
	connection_state?: string[] | null;
}
export interface ClientGroup {
	id: string;
	description: string;
	num_clients: number;
	clients_ids?: string[];
	client_ids?: string[];
	params?: ClientGroupParams | null;
	allowed_user_groups?: string[];
}
export interface ClientGroupResponse {
	data: ClientGroup[];
	meta: Meta;
}

export interface ClientResponse {
	data: Client;
}
export interface ServerStatus {
	auditlog: object;
	auth_header: boolean;
	caddy_integration_enabled: boolean;
	clients_auth_mode: string;
	clients_auth_source: string;
	clients_connected: number;
	clients_disconnected: number;
	connect_url: Array<string>;
	excluded_ports: Array<string>;
	fingerprint: string;
	group_permissions_enabled: boolean;
	monitoring_enabled: boolean;
	pairing_url: string;
	/** true when rportd serves pairing itself (pairing_url then needs the API token) */
	pairing_builtin?: boolean;
	tunnel_host: string;
	tunnel_proxy_enabled: boolean;
	two_fa_delivery_method: string;
	two_fa_enabled: boolean;
	used_ports: Array<string>;
	users_auth_source: string;
	version: string;
	capabilities?: Partial<ServerCapabilities>;
	/** Sign in with Google ([oidc]) is enabled on the server. */
	oidc_enabled?: boolean;
}
/**
 * Features the server offers (GET /api/v1/status → capabilities). A missing object or
 * field (older servers) means available; use useCapabilities() rather than reading it directly.
 */
export interface ServerCapabilities {
	vault_passphrase: boolean;
	port_tunnels: boolean;
	http_proxy_tunnels: boolean;
	subdomain_tunnels: boolean;
	browser_vnc: boolean;
	browser_rdp: boolean;
	monitoring: boolean;
	alerting: boolean;
	pairing: boolean;
	file_upload: boolean;
	scheduled_jobs: boolean;
	library: boolean;
	/** The requesting user is a platform operator (operator API). Reported only when true. */
	operator?: boolean;
	/** Usage metering is on (GET /usage). Reported only when true. */
	usage?: boolean;
	/** A login may belong to several organizations (Postgres): membership, invitations. Reported only when true. */
	organizations?: boolean;
	/** Self-service signup is on (Postgres with [signup] enabled). Reported only when true. */
	signup?: boolean;
	/** Billing plans and limits are on (Postgres with [billing] enabled): GET /billing, operator billing. Reported only when true. */
	billing?: boolean;
}
export interface TwoFa {
	send_to: string;
	delivery_method: string;
	totp_key_status: string;
}
export interface ApiLoginResponse {
	data: ILoginResponse;
}
export interface ILoginResponse {
	token: string;
	two_fa: TwoFa;
	/** Several organizations and no token: the user must pick one (Postgres servers). */
	organizations?: { id: string; name: string }[];
}
export interface ProfileResponse {
	data: Profile;
}
export interface Profile {
	username: string;
	password_expired: boolean;
	groups: string[];
	two_fa_send_to: string;
	effective_user_permissions: Permissions;
	group_permissions_enabled: boolean;
	/** How this login may sign in here (Postgres servers; omitted standalone). */
	sign_in?: 'both' | 'password' | 'oidc';
	/** How the current session signed in. */
	auth_method?: 'password' | 'oidc';
	/** A Google account is linked (pinned) to this login. */
	oidc_linked?: boolean;
}
export interface UserListResponse {
	data: User[];
}
export interface Permissions {
	commands: boolean;
	monitoring: boolean;
	scheduler: boolean;
	/** @deprecated Merged into `commands`; only present on older responses. */
	scripts?: boolean;
	tunnels: boolean;
	uploads: boolean;
	vault: boolean;
	auditlog: boolean;
}
export interface EffectiveExtendedPermissions {
	tunnels_restricted: object;
	commands_restricted: object;
}
export interface User {
	username: string;
	password_expired: boolean;
	groups: string[];
	two_fa_send_to: string;
	effective_user_permissions: Permissions;
	effective_extended_permissions: EffectiveExtendedPermissions;
	/** How the user may sign in to this organization (Postgres servers; omitted standalone). */
	sign_in?: 'both' | 'password' | 'oidc';
	/** A Google account is linked (pinned) to this login (Postgres servers). */
	oidc_linked?: boolean;
}

export interface UserPayload {
	username: string;
	groups: string[];
	/** Optional where the user signs in with Google only. */
	password?: string;
	sign_in?: 'both' | 'password' | 'oidc';
}

export interface UserGroup {
	name: string;
	permissions: Permissions;
}

export interface UserGroupResponse {
	data: UserGroup[];
}

export interface Status {
	auditlog: Auditlog;
	auth_header: boolean;
	caddy_integration_enabled: boolean;
	clients_auth_mode: string;
	clients_auth_source: string;
	clients_connected: number;
	clients_disconnected: number;
	connect_url: string[];
	excluded_ports: string[];
	fingerprint: string;
	group_permissions_enabled: boolean;
	monitoring_enabled: boolean;
	pairing_url: string;
	/** true when rportd serves pairing itself (pairing_url then needs the API token) */
	pairing_builtin?: boolean;
	tunnel_host: string;
	tunnel_proxy_enabled: boolean;
	two_fa_delivery_method: string;
	two_fa_enabled: boolean;
	used_ports: string[];
	users_auth_source: string;
	version: string;
	capabilities?: Partial<ServerCapabilities>;
}

export interface Auditlog {
	enabled: boolean;
	rotation: string;
}
export interface StatusResponse {
	data: Status;
}
export interface Tunnel {
	name: string;
	protocol: string;
	lhost: string;
	lport: string;
	lport_random: boolean;
	rhost: string;
	rport: string;
	scheme: string;
	acl: string;
	idle_timeout_minutes: number;
	auto_close: number;
	http_proxy: boolean;
	host_header: string;
	auth_user: string;
	auth_password: string;
	tunnel_url: string;
	id: string;
	client_id: string;
	created_at: Date;
	/** Payload bytes carried so far; only on servers with usage metering. */
	bytes?: { to_user: number; to_device: number };
}
export interface TunnelFurtherOptions {
	'idle-timeout-minutes': number;
	'is_service_forwarding': boolean;
	'protocol': string;
}
export interface StoredTunnel {
	id: string;
	name: string;
	acl: string;
	created_at: Date;
	public_port: number;
	remote_ip: string;
	remote_port: number;
	scheme: string;
	further_options: TunnelFurtherOptions;
}

export interface TunnelResponse {
	data: Tunnel[];
}

export interface StoredTunnelResponse {
	data: StoredTunnel[];
	meta: Meta;
}
export interface UserSession {
	expires_at: Date;
	ip_address: string;
	last_access_at: Date;
	session_id: number;
	user_agent: string;
	username: string;
}
export interface UserSessionResponse {
	data: UserSession[];
}

export interface APIToken {
	prefix: string;
	scope: string;
	name: string;
	created_at: Date;
	expires_at: Date;
	token?: string;
}
export interface APITokensResponse {
	data: APIToken[];
}

export interface APITokenResponse {
	data: APIToken;
}
export interface IpResponse {
	data: {
		ip: string;
	};
}
export interface APITokenPayload {
	expires_at: Date;
	name: string;
	scope: string;
	prefix?: string;
}

export interface AuditLog {
	timestamp: Date;
	username: string;
	remote_ip: string;
	application: string;
	action: string;
	affected_id: string;
	client_id: string;
	client_hostname: string;
	request: string;
	response: string;
}
export interface AuditLogResponse {
	data: AuditLog[];
	meta: Meta;
}

export interface FilePayload {
	upload: string;
	client_id: string;
	group_id?: string;
	tags?: JobClientTags;
	dest: string;
	force: string;
	sync: string;
	mode: string;
	user: string;
	group: string;
}
export type INstallerOptionId = 'remote' | 'sudoright' | 'filetransfer' | 'sudotransfer' | 'tacoscript';
export type TunnelOptionId = 'ssh' | 'rdp' | 'vnc' | 'realvnc' | 'http' | 'https' | 'other' | 'forwarding';
export interface InstallerOption {
	id: INstallerOptionId;
	label: string;
	flag: string;
	platformSupport?: 'all' | 'linux';
}
export interface TunnelOption {
	id: TunnelOptionId;
	label: string;
	ports: string;
}
export interface InstallerResponse {
	installers: {
		linux: string;
		windows: string;
	};
	pairing_code: string;
}

export interface TunnelFormState {
	service: string;
	forwardingService?: string;
	forwardDestination?: string;
	port: number;
	storeInLibrary: boolean;
	protocol: 'tcp' | 'udp' | 'tcp+udp';
	name?: string;
	lport?: number;
	lport_random?: 'random' | 'specify';
	acl_model: 'current' | 'specific' | 'anyone';
	acl_risk: boolean;
	http_proxy?: boolean;
	auth_user?: string;
	auth_password?: string;
	host_header?: string;
	acl: string;
	skip_idle_timeout: boolean;
	idle_timeout_minutes: number;
	autoclose_enable: boolean;
	autoclose_hour: number;
	autoclose_minute: number;
}

export interface TunnelPayload {
	'local'?: string;
	'remote': string;
	'scheme': string;
	'acl': string;
	'check_port'?: string;
	'idle-timeout-minutes'?: number;
	'auto-close'?: string;
	'protocol': 'tcp' | 'udp' | 'tcp+udp';
	'skip-idle-timeout'?: number;
	'http_proxy'?: boolean;
	'host_header'?: string;
	'auth_user'?: string;
	'auth_password'?: string;
}

/** The OS keys of a library entry: the client's `os_kernel` values. */
export type LibraryOS = 'linux' | 'windows' | 'darwin';

/** How an implementation runs; `auto` resolves like `utils/runKind.ts` does. */
export type EntryImplementationKind = 'auto' | 'command' | 'script';

export interface EntryImplementation {
	kind: EntryImplementationKind;
	code: string;
	interpreter: string;
	is_sudo: boolean;
	cwd: string;
	timeout_sec: number;
}

export type EntryImplementations = Partial<Record<LibraryOS, EntryImplementation>>;

/** A library entry as the server returns it (`implementations` is missing from the list). */
export interface LibraryEntryRecord {
	id: string;
	name: string;
	description: string;
	tags: string[];
	active_version: number;
	builtin_key?: string | null;
	os: LibraryOS[];
	created_at: string;
	created_by: string;
	updated_at: string;
	updated_by: string;
	deleted_at?: string;
	deleted_by?: string;
	implementations?: EntryImplementations;
}

export interface EntryContent {
	name: string;
	description: string;
	tags: string[];
	implementations: EntryImplementations;
}

export interface LibraryEntryPayload {
	name: string;
	description: string;
	tags: string[];
	implementations: EntryImplementations;
	message?: string;
	/** Required when saving an existing entry. */
	base_version?: number;
}

export interface EntryVersion {
	entry_id: string;
	version: number;
	created_at: string;
	created_by: string;
	message: string;
	changed: string[];
	/** Only when reading a single version. */
	content?: EntryContent;
}

export interface LibraryEntriesResponse {
	data: LibraryEntryRecord[];
	meta: { count: number };
}

export type QueryParams = {
	[key: string]: string | number | boolean | undefined | null;
};

export interface TunnelOptionsState {
	skip_idle_timeout: boolean;
	idle_timeout_minutes: number;
	autoclose_enable: boolean;
	autoclose_hour: number;
	autoclose_minute: number;
}

export interface TunnelOptionsProps {
	modelValue: TunnelOptionsState;
	disabled?: boolean;
	errors?: Record<string, string>;
}
export interface CommandResult {
	jid: string;
	status?: string;
	finished_at?: Date;
	client_id: string;
	client_name: string;
	command?: string;
	cwd?: string;
	interpreter?: string;
	pid?: number;
	started_at?: Date;
	created_by?: string;
	timeout_sec?: number;
	multi_job_id?: string;
	schedule_id?: null;
	error?: string;
	result: Result;
	is_sudo?: boolean;
	is_script?: boolean;
	stream_result?: boolean;
	/** Set on runs of a library entry. */
	library_entry_id?: string;
	library_version?: number;
	/** The OS implementation that ran (a library `os_kernel` value). */
	os?: string;
}

export interface Result {
	stdout: string;
	stderr: string;
	summary: string;
}

export interface JobClientTags {
	tags: string[];
	operator: 'AND' | 'OR';
}

export interface ScheduleDetails {
	client_ids: string[];
	group_ids: string[];
	tags?: JobClientTags | null;
	command?: string;
	script?: string;
	/** Set on schedules of type 'library'; command, script, interpreter, cwd, is_sudo and timeout are then ignored. */
	library_entry_id?: string;
	interpreter?: string;
	cwd?: string;
	is_sudo: boolean;
	timeout_sec: number;
	execute_concurrently: boolean;
	abort_on_error?: boolean | null;
	overlaps: boolean;
}

export interface ScheduleExecution {
	started_at: Date | null;
	client_count: number | null;
	success_count: number | null;
	status: string | null;
	summary: string | null;
	/** Why the run failed before or instead of running (e.g. a deleted library entry). */
	error?: string | null;
}

export interface Schedule extends ScheduleDetails {
	id: string;
	created_at: Date;
	created_by: string;
	name: string;
	schedule: string;
	type: 'command' | 'script' | 'library';
	last_execution?: ScheduleExecution | null;
}

export interface SchedulePayload extends ScheduleDetails {
	name: string;
	schedule: string;
	type: 'command' | 'script' | 'library';
}

/** A schedule that runs a library entry. */
export interface EntryUsedBy {
	id: string;
	name: string;
}

export interface ScheduleResponse {
	data: Schedule[];
	meta: Meta;
}

export interface VaultItem {
	id: number;
	client_id: string;
	required_group: string;
	key: string;
	value?: string;
	type: 'text' | 'secret' | 'markdown' | 'string';
	created_at: Date;
	updated_at: Date;
	created_by: string;
	updated_by?: string | null;
}

export interface VaultItemPayload {
	client_id: string;
	required_group: string;
	key: string;
	value: string;
	type: 'text' | 'secret' | 'markdown' | 'string';
}

export interface VaultItemResponse {
	data: VaultItem[];
	meta: Meta;
}

export interface TotP {
	secret: string;
	qr: string;
}

/** Mirrors AuthProviderInfo in the rport server (GET /api/v1/auth/provider). */
export interface AuthProviderInfo {
	auth_provider: string;
	settings_uri: string;
	device_settings_uri?: string;
	max_token_lifetime: number;
	/** Sign in with Google, when the server has [oidc] enabled. */
	oidc?: { enabled: boolean; button_label?: string; login_url?: string };
}

export interface AuthProviderResponse {
	data: AuthProviderInfo;
}

/** Mirrors api.ErrorPayload in the rport server (uniform error response body). */
export interface ApiErrorItem {
	code: string;
	title: string;
	detail: string;
}

export interface ApiErrorResponse {
	errors: ApiErrorItem[];
}
