/** @jsx JSXSlack.h **/
/** @jsxFrag JSXSlack.Fragment **/

/**
 * Structure of the modal:
 * Page 1 - Select channel
 * Page 2 - Check user groups to be removed
 */

import JSXSlack, {
	ConversationsSelect,
	Field,
	Input,
	Modal,
	Mrkdwn,
	Section,
} from "jsx-slack";

import { app } from "../main";

export function Delink() {
	// Identifiers, all in one place
	// These are used to identify events/actions

	const ID = {
		main: "delink-user-groups",
		page1: {
			submitted: "delink-user-groups_p1_submitted-callback",
			channelSelector: "delink-user-groups_p1_channel-selector",
		},
		page2: {
			submitted: "delink-user-groups_p1_submitted-callback",
		},
	};

	/* -------------------------------------------------------------------------- */
	/*                             Initial modal page                             */
	/* -------------------------------------------------------------------------- */

	app.shortcut(ID.main, async ({ ack, client, shortcut, logger }) => {
		try {
			/* --------------------------- Acknowledge request -------------------------- */

			await ack();

			/* ----------------------------- Construct view ----------------------------- */

			const view = JSXSlack(
				<Modal
					title="Delink user groups"
					close="Cancel"
					submit="Continue"
					callbackId={ID.page1.submitted}
				>
					<Section>
						:warning: As long as you see this message, this bot will
						not actually add people to any user groups, and is
						simply a UI demonstration.
					</Section>

					<Input label="Channel" required={true}>
						<ConversationsSelect
							name={ID.page1.channelSelector}
							placeholder="Choose a channel"
							include={["public", "private"]}
						></ConversationsSelect>
					</Input>
				</Modal>
			);

			/* -------------------------------- Show view ------------------------------- */

			await client.views.open({
				// Tell Slack that this modal is connected to that shortcut
				trigger_id: shortcut.trigger_id,
				view,
			});
		} catch (error) {
			logger.error(error);
		}
	});

	/* -------------------------------------------------------------------------- */
	/*                                   Page 2                                   */
	/* -------------------------------------------------------------------------- */

	app.view(ID.page1.submitted, async ({ ack, payload, logger }) => {
		try {
			let selectedChannel = null;

			for (const blockID in payload.state.values) {
				for (const actionID in payload.state.values[blockID]) {
					const action = payload.state.values[blockID][actionID];
					selectedChannel = action.selected_conversation;
				}
			}

			/* ----------------------------- Construct view ----------------------------- */

			// TODO: Show list of user groups for that channel in checkbox list

			const view = JSXSlack(
				<Modal
					title="Under construction"
					close="Cancel"
					submit="Continue"
					callbackId={ID.page2.submitted}
				>
					<Section>Under construction.</Section>
					<Section>
						<Field>Selected channel</Field>
						<Field>
							<Mrkdwn raw>{"<#" + selectedChannel + ">"}</Mrkdwn>
						</Field>
					</Section>
				</Modal>
			);

			/* -------------------- Acknowledge request; update view -------------------- */

			await ack({
				response_action: "update",
				view,
			});
		} catch (error) {
			logger.error(error);
		}
	});

	/* -------------------------------------------------------------------------- */
	/*                                 Close modal                                */
	/* -------------------------------------------------------------------------- */

	app.view(ID.page2.submitted, async ({ ack, logger }) => {
		try {
			await ack();
		} catch (error) {
			logger.error(error);
		}
	});
}
