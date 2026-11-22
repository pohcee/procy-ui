import { $fetch } from 'ofetch';
import type { FetchOptions } from 'ofetch';
import AuthModule from '~/repository/modules/auth';
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
}

export default defineNuxtPlugin(() => {
	const config = useRuntimeConfig();
	const userAuth = useCookie('token');
	const is_authenticated = useCookie<boolean>('is_authenticated');
	const fetchOptions: FetchOptions = {
		baseURL: config.public.apiUrl,
	};
	const apiFetchOptions: FetchOptions = {
		baseURL: config.public.apiUrl,
		headers: {
			Accept: 'application/json',
		},
		onRequest({ options }): void | Promise<void> {
			const headers = new Headers(options.headers);
			headers.set('Authorization', `Bearer ${userAuth.value}`);
			options.headers = headers;
		},
		onRequestError({ request, error }): void | Promise<void> {
			console.log('[fetch request error]', request, error);
		},
		async onResponseError({ response }): Promise<void> {
			if (response.status === 401) {
				userAuth.value = null;
				is_authenticated.value = false;
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
	};

	return {
		provide: {
			api: modules,
		},
	};
});
