/**
 * Saving a client group from the modal. The modal edits only the description and the
 * allowed user groups; the rules (`params`) are set through the API. An edit leaves `params`
 * out, and the server keeps the stored rules (never a round trip through the UI's types,
 * which could alter them); a new group starts without rules.
 * Pure helpers (tested in tests/clientGroup.test.ts).
 */
import type { ClientGroupParams } from '../types.ts';

export interface ClientGroupForm {
	id: string;
	description: string;
	/** Comma separated user groups, as typed. */
	allowedUserGroupsText: string;
}

export interface ClientGroupSavePayload {
	id: string;
	description: string;
	allowed_user_groups: string[];
	params?: ClientGroupParams;
}

export function parseUserGroups(text: string): string[] {
	return text.split(',').map(group => group.trim()).filter(Boolean);
}

export function clientGroupSavePayload(form: ClientGroupForm, isEditing: boolean): ClientGroupSavePayload {
	const payload: ClientGroupSavePayload = {
		id: form.id,
		description: form.description,
		allowed_user_groups: parseUserGroups(form.allowedUserGroupsText),
	};
	if (!isEditing) payload.params = {};
	return payload;
}
