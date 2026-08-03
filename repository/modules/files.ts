import { HttpFactory } from '~/repository/factory';

export interface FileUploadOptions {
	file: File;
	clientIds: string[];
	groupIds?: string[];
	tags?: { tags: string[]; operator: string } | null;
	dest: string;
	mode?: string;
	user?: string;
	group?: string;
	force?: boolean;
	sync?: boolean;
}

export interface UploadResponse {
	data: {
		id: string;
		filepath: string;
		size_bytes: number;
	};
}

class FilesModule extends HttpFactory {
	private RESOURCE = '/api/v1/files';

	async upload(options: FileUploadOptions): Promise<UploadResponse> {
		const form = new FormData();
		form.append('upload', options.file);
		options.clientIds.forEach(id => form.append('client_id', id));
		(options.groupIds ?? []).forEach(id => form.append('group_id', id));
		if (options.tags) {
			form.append('tags', JSON.stringify(options.tags));
		}
		form.append('dest', options.dest);
		if (options.mode) form.append('mode', options.mode);
		if (options.user) form.append('user', options.user);
		if (options.group) form.append('group', options.group);
		form.append('force', options.force ? '1' : '0');
		form.append('sync', options.sync ? '1' : '0');

		return this.call<UploadResponse>('POST', this.RESOURCE, form as unknown as object);
	}
}

export default FilesModule;
