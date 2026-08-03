import { HttpFactory } from '~/repository/factory';
import type { Command, CommandPayload, CommandResponse, Script, ScriptPayload, ScriptResponse } from '~/types';

class LibraryModule extends HttpFactory {
	private RESOURCE = '/api/v1/library';

	async listCommand(): Promise<CommandResponse> {
		return await this.call<CommandResponse>(
			'GET',
			`${this.RESOURCE}/commands`,
			undefined,
		);
	}

	async createCommand(command: CommandPayload): Promise<{ data: Command }> {
		return await this.call<{ data: Command }>(
			'POST',
			`${this.RESOURCE}/commands`,
			command,
		);
	}

	async deleteCommand(id: string): Promise<any> {
		return await this.call('DELETE', `${this.RESOURCE}/commands/${id}`, undefined);
	};

	async showCommand(id: string): Promise<{ data: Command }> {
		return await this.call<{ data: Command }>(
			'GET',
			`${this.RESOURCE}/commands/${id}`,
			undefined,
		);
	}

	async updateCommand(id: string, command: CommandPayload): Promise<{ data: Command }> {
		return await this.call<{ data: Command }>(
			'PUT',
			`${this.RESOURCE}/commands/${id}`,
			command,
		);
	}

	async listScript(): Promise<ScriptResponse> {
		return await this.call<ScriptResponse>(
			'GET',
			`${this.RESOURCE}/scripts`,
			undefined,
		);
	}

	async createScript(script: ScriptPayload): Promise<{ data: Script }> {
		return await this.call<{ data: Script }>(
			'POST',
			`${this.RESOURCE}/scripts`,
			script,
		);
	}

	async deleteScript(id: string): Promise<any> {
		return await this.call('DELETE', `${this.RESOURCE}/scripts/${id}`, undefined);
	};

	async showScript(id: string): Promise<{ data: Script }> {
		return await this.call<{ data: Script }>(
			'GET',
			`${this.RESOURCE}/scripts/${id}`,
			undefined,
		);
	}

	async updateScript(id: string, script: ScriptPayload): Promise<{ data: Script }> {
		return await this.call<{ data: Script }>(
			'PUT',
			`${this.RESOURCE}/scripts/${id}`,
			script,
		);
	}
}
export default LibraryModule;
