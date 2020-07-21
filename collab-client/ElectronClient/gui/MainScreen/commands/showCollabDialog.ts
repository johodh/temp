import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'showCollabDialog',
	label: () => _('Collaborate...'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteIds }:any) => {
			comp.setState({
				collabDialogOptions: {
					noteIds: noteIds,
					visible: true,
				},
			});
		},
	};
};
