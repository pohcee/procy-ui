import { HttpFactory } from '~/repository/factory';
import type {
	ClientMetric,
	ClientMetricsResponse,
	ClientMountpoint,
	ClientMountpointsResponse,
	ClientResponse,
	ClientsResponse,
	Client,
	StoredTunnel, StoredTunnelResponse,
	Tunnel, TunnelPayload,
	TunnelResponse,
} from '~/types';
import { toQueryString } from '~/lib/utils';

class ClientsModule extends HttpFactory {
	private RESOURCE = '/api/v1/clients';

	async show(id: string): Promise<ClientResponse> {
		return this.call<ClientResponse>(
			'GET',
			// Client IDs are case-sensitive on the server (e.g. Windows hardware UUIDs are
			// upper-case), so pass them through unchanged.
			`${this.RESOURCE}/${encodeURIComponent(id)}`,
			undefined,
		);
	}

	async listClients(): Promise<ClientsResponse> {
		return this.call<ClientsResponse>('GET',
			`${this.RESOURCE}?sort=name&fields[clients]=id,name,os,os_family,os_kernel,os_full_name,ipv4,disconnected_at,tags&page[limit]=20&page[offset]=0`,
			undefined,
		);
	}

	/** Up to `limit` devices with the fields needed to match tags and OS (the default list stops at 20). */
	async listForTargeting(limit = 500): Promise<ClientsResponse> {
		return this.call<ClientsResponse>('GET',
			`${this.RESOURCE}?sort=name&fields[clients]=id,name,os_kernel,tags&page[limit]=${limit}&page[offset]=0`,
			undefined,
		);
	}

	async paginate(page = 0, itemsPerPage = 20, filter = '', connectionState = ''): Promise<ClientsResponse> {
		let params = `?sort=name&fields[clients]=id,name,os,os_full_name,hostname,ipv4,connection_state,disconnected_at,version,tags,updates_status`
			+ `&page[limit]=${itemsPerPage}&page[offset]=${page * itemsPerPage}`;
		if (filter?.length > 0) {
			params += `&filter[name]=*${encodeURIComponent(filter)}*`;
		}
		if (connectionState?.length > 0) {
			params += `&filter[connection_state]=${connectionState}`;
		}
		return this.call<ClientsResponse>('GET', `${this.RESOURCE}${params}`, undefined);
	}

	/** One page (max 500, the server's hard limit) of clients with the fields the device list needs. */
	async listFleet(offset = 0, limit = 500): Promise<ClientsResponse> {
		return this.call<ClientsResponse>('GET',
			`${this.RESOURCE}?sort=name&fields[clients]=id,name,hostname,os,os_family,os_kernel,os_full_name,os_arch,ipv4,connection_state,disconnected_at,last_heartbeat_at,tags,labels,groups,updates_status`
			+ `&page[limit]=${limit}&page[offset]=${offset}`,
			undefined,
		);
	}

	async getClientsName(clientsIds: Array<string>): Promise<ClientsResponse> {
		return this.call<ClientsResponse>('GET',
			`${this.RESOURCE}?sort=name&fields[clients]=name,id,connection_state,disconnected_at&page[limit]=${clientsIds.length}&page[offset]=0&filter[id]=${clientsIds.join(',')}`,
			undefined,
		);
	}

	async listByGroup(id: string): Promise<ClientsResponse> {
		let params = `?sort=name&fields[clients]=id,name,os,os_family,os_kernel,os_full_name,ipv4,disconnected_at,tags&page[limit]=20&page[offset]=0`;
		if (id !== 'all') {
			params += `&filter[groups]=${id}`;
		}
		return this.call(
			'GET',
			`${this.RESOURCE}${params}`,
			undefined,
		);
	}

	async getTotalClients(): Promise<ClientsResponse> {
		return this.call(
			'GET',
			`${this.RESOURCE}?page[limit]=1`,
			undefined,
		);
	}

	async metrics(id: string, since?: string, until?: string): Promise<ClientMetricsResponse> {
		// page[limit] defaults to 1 on the server if omitted, so it must be passed
		// explicitly to get a real time series (120 is the server's hard max).
		let params = '?sort=-timestamp&page[limit]=120';
		if (since) {
			params += `&filter[timestamp][since]=${encodeURIComponent(since)}`;
		}
		if (until) {
			params += `&filter[timestamp][until]=${encodeURIComponent(until)}`;
		}
		return this.call(
			'GET',
			`${this.RESOURCE}/${id}/metrics${params}`,
			undefined,
		);
	}

	/**
	 * CPU/memory/IO history for a time range, downsampled by the server (avg/min/max per
	 * bucket, ~120 points). Use this for ranges: /metrics only returns the newest 120 raw
	 * samples, which is about 2 h at the default once-a-minute rate. Spans must be 2–48 h.
	 */
	async graphMetrics(id: string, since: string, until: string): Promise<ClientMetric[]> {
		type Stat = { avg: number };
		type Entry = { timestamp: string; cpu_usage_percent?: Stat; memory_usage_percent?: Stat; io_usage_percent?: Stat };
		const params = `?filter[timestamp][since]=${encodeURIComponent(since)}&filter[timestamp][until]=${encodeURIComponent(until)}`;
		const response = await this.call<{ data: Entry[] }>('GET', `${this.RESOURCE}/${id}/graph-metrics${params}`, undefined);
		return (response.data ?? []).map(e => ({
			timestamp: e.timestamp,
			cpu_usage_percent: e.cpu_usage_percent?.avg ?? 0,
			memory_usage_percent: e.memory_usage_percent?.avg ?? 0,
			io_usage_percent: e.io_usage_percent?.avg ?? 0,
		}));
	}

	/**
	 * Disk usage across a time range. The server has no downsampled mount point history and
	 * returns at most 100 raw samples, so take the latest sample in each of `slices` equal
	 * slices of the range (newest first).
	 */
	async mountpointsOverRange(id: string, since: string, until: string, slices = 30): Promise<ClientMountpoint[]> {
		const start = new Date(since).getTime();
		const step = (new Date(until).getTime() - start) / slices;
		const results = await Promise.all(Array.from({ length: slices }, (_, i) => {
			const from = new Date(start + i * step).toISOString();
			const to = new Date(start + (i + 1) * step).toISOString();
			return this.mountpoints(id, from, to, 1).then(r => r.data ?? []).catch(() => []);
		}));
		return results.flat().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	}

	async mountpoints(id: string, since?: string, until?: string, limit = 100): Promise<ClientMountpointsResponse> {
		// page[limit] defaults to 1 on the server if omitted; 100 is the server's hard max
		// for this endpoint (lower than metrics' 120 - exceeding it is a 400, not a clamp).
		let params = `?sort=-timestamp&page[limit]=${limit}`;
		if (since) {
			params += `&filter[timestamp][since]=${encodeURIComponent(since)}`;
		}
		if (until) {
			params += `&filter[timestamp][until]=${encodeURIComponent(until)}`;
		}
		return this.call(
			'GET',
			`${this.RESOURCE}/${id}/mountpoints${params}`,
			undefined,
		);
	}

	async tunnels(id: string): Promise<Tunnel[]> {
		const response = await this.call<TunnelResponse>(
			'GET',
			`${this.RESOURCE}/${id}?fields[clients]=tunnels`,
			undefined,
		);
		return response?.data;
	}

	async storedTunnels(id: string): Promise<StoredTunnel[]> {
		const response = await this.call<StoredTunnelResponse>(
			'GET',
			`${this.RESOURCE}/${id}/stored-tunnels?page[limit]=100`,
			undefined,
		);
		return response?.data;
	}

	async createTunnel(clientId: string, payload: TunnelPayload): Promise<{ data: Tunnel }> {
		return await this.call<{ data: Tunnel }>(
			'PUT',
			`${this.RESOURCE}/${clientId}/tunnels${toQueryString(payload)}`,
			undefined,
		);
	}

	async updateTagsLabel(client: Client): Promise<never> {
		return await this.call(
			'PUT',
			`${this.RESOURCE}/${client.id}/attributes`,
			{
				tags: client.tags,
				labels: client.labels,
			},
		);
	}

	async deleteTunnel(clientId: string, tunnelId: string, force = false): Promise<void> {
		await this.call(
			'DELETE',
			`${this.RESOURCE}/${clientId}/tunnels/${tunnelId}?force=${force}`,
			undefined,
		);
	}

	async updateTunnelACL(clientId: string, tunnelId: string, acl: string): Promise<void> {
		await this.call(
			'PUT',
			`${this.RESOURCE}/${clientId}/tunnels/${tunnelId}/acl`,
			{ acl },
		);
	}

	async createStoredTunnel(clientId: string, payload: Partial<StoredTunnel>): Promise<{ data: StoredTunnel }> {
		return await this.call<{ data: StoredTunnel }>(
			'POST',
			`${this.RESOURCE}/${clientId}/stored-tunnels`,
			payload,
		);
	}

	async updateStoredTunnel(clientId: string, tunnelId: string, payload: Partial<StoredTunnel>): Promise<{ data: StoredTunnel }> {
		return await this.call<{ data: StoredTunnel }>(
			'PUT',
			`${this.RESOURCE}/${clientId}/stored-tunnels/${tunnelId}`,
			payload,
		);
	}

	async deleteStoredTunnel(clientId: string, tunnelId: string): Promise<void> {
		await this.call(
			'DELETE',
			`${this.RESOURCE}/${clientId}/stored-tunnels/${tunnelId}`,
			undefined,
		);
	}
}

export default ClientsModule;
