/**
 * Saving a client group from the modal. The modal edits only the description and the
 * allowed user groups; the rules (`params`) are set through the API, so an edit sends the
 * loaded group's params back unchanged instead of clearing them.
 * Pure helpers (tested in tests/clientGroup.test.ts).
 */
import type { ClientGroupParams } from '../types.ts';

export interface ClientGroupForm {
	id: string;
	description: string;
	/** Comma separated user groups, as typed. */
	allowedUserGroupsText: string;
	/** The params of the group being edited, as loaded. */
	params?: ClientGroupParams | null;
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
	if (isEditing) {
		// Without params the server keeps the stored ones; with them it stores what we send.
		if (form.params) payload.params = form.params;
	}
	else {
		payload.params = {};
	}
	return payload;
}
