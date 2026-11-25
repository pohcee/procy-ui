import { $fetch } from 'ofetch';
import type { FetchOptions } from 'ofetch';
import AuthModule from '~/repository/modules/auth';
import { setAuthCookies } from '~/stores/auth';
import { readAuthToken } from '~/utils/authToken';
import ClientsModule from '~/repository/modules/clients';
import GroupsModule from '~/repository/modules/groups';
import UsersModule from '~/repository/modules/users';
import UserGroupsModule from '~/repository/modules/user-groups';
import ProfileModule from '~/repository/modules/profile';
import ClientAuthModule from '~/repository/modules/client-auth';
import StatusModule from '~/repository/modules/status';
import TunnelsModule from '~/repository/modules/tunnels';
import VaultModule from '~/repository/modules/vault';
import LibraryModule from '~/repository/modules/library';
import SchedulesModule from '~/repository/modules/schedules';
import AuditLogModule from '~/repository/modules/auditlog';
import FilesModule from '~/repository/modules/files';
import NotificationsModule from '~/repository/modules/notifications';
import JobsModule from '~/repository/modules/jobs';
import OperatorModule from '~/repository/modules/operator';
import UsageModule from '~/repository/modules/usage';
import MembershipModule from '~/repository/modules/membership';
import SignupModule from '~/repository/modules/signup';
import BillingModule from '~/repository/modules/billing';
import { noteBillingRefusal } from '~/composables/useBilling';

interface IApiInstance {
	auth: AuthModule;
	clients: ClientsModule;
	groups: GroupsModule;
	users: UsersModule;
	userGroups: UserGroupsModule;
	profile: ProfileModule;
	clientAuth: ClientAuthModule;
	status: StatusModule;
	tunnels: TunnelsModule;
	vault: VaultModule;
	library: LibraryModule;
	schedules: SchedulesModule;
	auditLog: AuditLogModule;
	files: FilesModule;
	notifications: NotificationsModule;
	jobs: JobsModule;
	operator: OperatorModule;
	usage: UsageModule;
	membership: MembershipModule;
	signup: SignupModule;
	billing: BillingModule;
}

/**
 * When the UI is served by rportd (no NUXT_API_URL, empty baseURL), a path like
 * 'api/v1/me' would resolve against the current page (/auth/ → /auth/api/v1/me)
 * and hit the UI's HTML instead of the API. Always send API paths from the root.
 */
const rootRelative = (request: unknown) => (typeof request === 'string' && !/^([a-z]+:)?\/\//i.test(request) && !request.startsWith('/')
	? `/${request}`
	: request);

export default defineNuxtPlugin(() => {
	const config = useRuntimeConfig();
	const fetchOptions: FetchOptions = {
		baseURL: config.public.apiUrl,
		onRequest(context): void {
			context.request = rootRelative(context.request) as typeof context.request;
		},
	};
	const apiFetchOptions: FetchOptions = {
		baseURL: config.public.apiUrl,
		headers: {
			Accept: 'application/json',
		},
		onRequest(context): void | Promise<void> {
			context.request = rootRelative(context.request) as typeof context.request;
			const { options } = context;
			const headers = new Headers(options.headers);
			const token = readAuthToken();
			// No token → no header (a "Bearer null" just counts as a bad request on the server).
			if (token) headers.set('Authorization', `Bearer ${token}`);
			options.headers = headers;
		},
		onRequestError({ request, error }): void | Promise<void> {
			console.log('[fetch request error]', request, error);
		},
		async onResponseError({ response }): Promise<void> {
			// A read-only organization or the transfer limit: remembered for the app-wide banner and its toast.
			noteBillingRefusal(response.status, response._data);
			if (response.status === 401) {
				// Clear the cookies now so the auth middleware doesn't see the stale token.
				setAuthCookies(null);
				useTokenStore().authenticated = false;
				await navigateTo('/auth');
			}
		},
	};
	const authFetcher = $fetch.create(fetchOptions);
	const apiFetcher = $fetch.create(apiFetchOptions);
	const modules: IApiInstance = {
		auth: new AuthModule(authFetcher),
		clients: new ClientsModule(apiFetcher),
		groups: new GroupsModule(apiFetcher),
		users: new UsersModule(apiFetcher),
		userGroups: new UserGroupsModule(apiFetcher),
		profile: new ProfileModule(apiFetcher),
		clientAuth: new ClientAuthModule(apiFetcher),
		status: new StatusModule(apiFetcher),
		tunnels: new TunnelsModule(apiFetcher),
		vault: new VaultModule(apiFetcher),
		library: new LibraryModule(apiFetcher),
		schedules: new SchedulesModule(apiFetcher),
		auditLog: new AuditLogModule(apiFetcher),
		files: new FilesModule(apiFetcher),
		notifications: new NotificationsModule(apiFetcher),
		jobs: new JobsModule(apiFetcher),
		operator: new OperatorModule(apiFetcher),
		usage: new UsageModule(apiFetcher),
		membership: new MembershipModule(apiFetcher),
		// Public routes: no session header, and a 401 there is no reason to leave the page.
		signup: new SignupModule(authFetcher),
		billing: new BillingModule(apiFetcher),
	};

	return {
		provide: {
			api: modules,
		},
	};
});
