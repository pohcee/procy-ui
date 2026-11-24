import { HttpFactory } from '~/repository/factory';
import type { CommandResult, Meta } from '~/types';

/** A multi-device run as GET /commands lists it. */
export interface MultiJobSummary {
	jid: string;
	started_at: string;
	created_by: string;
	schedule_id: string | null;
}

export interface JobsPage {
	data: CommandResult[];
	meta: Meta;
}

export interface MultiJobsPage {
	data: MultiJobSummary[];
	meta: Meta;
}

const BASE_FIELDS = ['jid', 'status', 'client_id', 'client_name', 'started_at', 'finished_at', 'created_by', 'error', 'pid', 'timeout_sec', 'multi_job_id', 'schedule_id', 'is_script', 'command'];
/** Newer servers only (older ones reject the list with 400). */
const LIBRARY_FIELDS = ['library_entry_id', 'library_version', 'os'];

const statusOf = (e: unknown) => (e as { status?: number; response?: { status?: number } })?.response?.status
	?? (e as { status?: number })?.status;

/**
 * Job lists (per device and per multi-device run) for the run history. Asks for the library
 * fields and remembers when the server doesn't know them, then asks without.
 */
class JobsModule extends HttpFactory {
	private libraryFields = true;

	private async withFields<T>(url: (fields: string) => string, extra = ''): Promise<T> {
		const fields = (lib: boolean) => `fields[jobs]=${[...BASE_FIELDS, ...(lib ? LIBRARY_FIELDS : [])].join(',')}${extra}`;
		if (this.libraryFields) {
			try {
				return await this.call<T>('GET', url(fields(true)), undefined);
			}
			catch (e) {
				if (statusOf(e) !== 400) throw e;
				this.libraryFields = false;
			}
		}
		return this.call<T>('GET', url(fields(false)), undefined);
	}

	/** Runs on one device, newest first. Output (`result`) only with `withOutput`. */
	async listForClient(clientId: string, opts: { page?: number; perPage?: number; status?: string[]; withOutput?: boolean } = {}): Promise<JobsPage> {
		const perPage = opts.perPage ?? 20;
		const offset = (opts.page ?? 0) * perPage;
		let query = `sort=-started_at&sort=jid&page[limit]=${perPage}&page[offset]=${offset}`;
		if (opts.status?.length) query += `&filter[status]=${opts.status.map(encodeURIComponent).join(',')}`;
		const result = opts.withOutput ? '&fields[result]=stdout,stderr,summary' : '&fields[result]=summary';
		return this.withFields<JobsPage>(fields => `/api/v1/clients/${encodeURIComponent(clientId)}/commands?${query}&${fields}`, result);
	}

	/** One job with its full output and command. */
	async showForClient(clientId: string, jid: string): Promise<{ data: CommandResult }> {
		return this.call<{ data: CommandResult }>('GET', `/api/v1/clients/${encodeURIComponent(clientId)}/commands/${encodeURIComponent(jid)}`, undefined);
	}

	/** Multi-device runs, newest first (non-admins get only their own). */
	async listRuns(opts: { page?: number; perPage?: number; scheduleId?: string; createdBy?: string } = {}): Promise<MultiJobsPage> {
		const perPage = opts.perPage ?? 20;
		const offset = (opts.page ?? 0) * perPage;
		let query = `sort=-started_at&page[limit]=${perPage}&page[offset]=${offset}`;
		if (opts.scheduleId) query += `&filter[schedule_id]=${encodeURIComponent(opts.scheduleId)}`;
		if (opts.createdBy) query += `&filter[created_by]=${encodeURIComponent(opts.createdBy)}`;
		return this.call<MultiJobsPage>('GET', `/api/v1/commands?${query}`, undefined);
	}

	/** The device jobs of a multi-device run (up to 500). Output only with `withOutput`. */
	async listRunJobs(multiJobId: string, opts: { withOutput?: boolean } = {}): Promise<JobsPage> {
		const result = opts.withOutput ? '&fields[result]=stdout,stderr,summary' : '&fields[result]=summary';
		return this.withFields<JobsPage>(fields => `/api/v1/commands/${encodeURIComponent(multiJobId)}/jobs?sort=started_at&page[limit]=500&${fields}`, result);
	}
}

export default JobsModule;
