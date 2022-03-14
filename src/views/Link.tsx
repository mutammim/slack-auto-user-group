/** @jsx JSXSlack.h **/
/** @jsxFrag JSXSlack.Fragment **/

/**
 * Structure of the modal:
 * Page 1 - Select channel and user group; invite option
 * Page 2 - Confirmation page
 */

import JSXSlack, {
	Checkbox,
	CheckboxGroup,
	Confirm,
	Context,
	ConversationsSelect,
	Divider,
	ExternalSelect,
	Field,
	Input,
	Modal,
	Mrkdwn,
	Option,
	Section,
} from "jsx-slack";
import Fuse from "fuse.js";

import { app } from "../main";
import {
	getAllUserGroups,
	getChannelMemberCount,
	isUserAdmin as isUserAdminCheck,
} from "../logic";

export function Link() {
	// Identifiers, all in one place
	// These are used to identify events/actions

	const ID = {
		main: "link-user-group", // This ID is called when the shortcut is started
		page1: {
			submitted: "link-user-group_p1_submitted-callback",
			channelSelector: "link-user-group_p1_channel-selector",
			userGroupSelector: "link-user-group_p1_user-group-selector",
			inviteExistingCheckboxGroup:
				"link-user-group_p1_invite-existing-members-checkbox-group",
			inviteExistingCheckbox:
				"link-user-group_p1_invite-existing-members-checkbox",
		},
		page2: {
			submitted: "link-user-group_p2_submitted-callback",
		},
	};

	/* -------------------------------------------------------------------------- */
	/*                                   Page 1                                   */
	/* -------------------------------------------------------------------------- */

	app.shortcut(ID.main, async ({ ack, client, logger, shortcut }) => {
		try {
			/* --------------------------- Acknowledge request -------------------------- */

			await ack();

			/* ----------------------------- Construct view ----------------------------- */

			const view = JSXSlack(
				<Modal
					title="Link user group"
					close="Cancel"
					submit="Continue"
					callbackId={ID.page1.submitted}
					// Pass user ID of shortcut user into "store" (kinda)
					// so the next screen will have it
					privateMetadata={JSON.stringify({
						userID: shortcut.user.id,
					})}
				>
					<Input label="Channel" required={true}>
						<ConversationsSelect
							name={ID.page1.channelSelector}
							placeholder="Choose a channel"
							include={["public", "private"]}
						></ConversationsSelect>
					</Input>

					<Input label="User group" required={true}>
						<ExternalSelect
							name={ID.page1.userGroupSelector}
							placeholder="Choose a user group"
							minQueryLength={0}
						></ExternalSelect>
					</Input>

					<Context>
						Can't find your user group? Type a bit more; the
						selector only shows the top 100.
					</Context>

					<Divider></Divider>

					<CheckboxGroup
						name={ID.page1.inviteExistingCheckboxGroup}
						label="Advanced"
						confirm={
							<Confirm title="Are you sure?" confirm="Confirm">
								When you invite someone to a user group, they're
								DMed about it. Are you sure you want to invite
								every member of this channel to the user group?
							</Confirm>
						}
					>
						<Checkbox
							description=":warning: This action may DM a lot of people. Proceed with caution."
							value={ID.page1.inviteExistingCheckbox}
						>
							Invite current channel members to user group
						</Checkbox>
					</CheckboxGroup>
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

	app.view(ID.page1.submitted, async ({ ack, client, logger, payload }) => {
		try {
			/* -------------------------- Get info from payload ------------------------- */

			const { userID } = JSON.parse(payload.private_metadata);
			let selectedChannel = null;
			let selectedUserGroup = null;
			let inviteExisting = null;

			// This is how payload.state.values looks like:
			// {
			//     [random block ID]: { [action ID]: [useful info]
			//     [random block ID]: { [action ID]: [useful info]
			//     [random block ID]: { [action ID]: [useful info]
			// }
			// So, why don't we iterate through every item
			// (and its single sub-item),
			// doing stuff based on the action ID found?

			for (const blockID in payload.state.values) {
				for (const actionID in payload.state.values[blockID]) {
					const action = payload.state.values[blockID][actionID];

					switch (actionID) {
						case ID.page1.channelSelector:
							selectedChannel = action.selected_conversation;
							break;

						case ID.page1.userGroupSelector:
							selectedUserGroup = action.selected_option.value;
							break;

						case ID.page1.inviteExistingCheckboxGroup:
							inviteExisting =
								Array.isArray(action.selected_options) &&
								action.selected_options.length === 0;
							break;
					}
				}
			}

			/* -------------------------- Decide screen to show ------------------------- */

			// If member count <= MANY_MEMBERS_THRESHOLD OR is admin
			//     Show confirmation screen
			// Else
			//     Show error screen

			const MANY_MEMBERS_THRESHOLD = 9;

			const isChannelAboveThreshold =
				(await getChannelMemberCount(client, logger, selectedChannel)) >
				MANY_MEMBERS_THRESHOLD;

			const isUserAdmin = await isUserAdminCheck(client, logger, userID);

			let showErrorScreen = true;

			if (isChannelAboveThreshold == false) showErrorScreen = false;
			if (isUserAdmin == true) showErrorScreen = false;

			/* ----------------------------- Construct view ----------------------------- */

			let view;

			if (showErrorScreen) {
				view = JSXSlack(
					<Modal
						title="Admin status required"
						close="Cancel"
						submit="Close"
						callbackId={ID.page2.submitted}
					>
						<Section>
							The channel you're working with has over{" "}
							{MANY_MEMBERS_THRESHOLD} members. So, for safety
							reasons, a Workspace Admin will have to do this.
							Sorry about that!
						</Section>
					</Modal>
				);
			} else {
				// <Mrkdwn> needs raw={true} to make mentions work

				view = JSXSlack(
					<Modal
						title="Link user group"
						close="Cancel"
						submit="Complete"
						callbackId={ID.page2.submitted}
					>
						<Section>
							Review your changes, and click *Complete* when
							you're ready!
						</Section>
						<Section>
							<Field>Selected channel</Field>
							<Field>
								<Mrkdwn raw>
									{"<#" + selectedChannel + ">"}
								</Mrkdwn>
							</Field>
						</Section>
						<Section>
							<Field>Selected user group</Field>
							<Field>
								<Mrkdwn raw>
									{"<!subteam^" + selectedUserGroup + ">"}
								</Mrkdwn>
							</Field>
						</Section>
						<Section>
							<Field>Existing channel members auto-invited</Field>
							<Field>
								{inviteExisting ? ":warning: *Yes*" : "*No*"}
							</Field>
						</Section>
					</Modal>
				);
			}

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

	/* -------------------------------------------------------------------------- */
	/*                      Load user group selector options                      */
	/* -------------------------------------------------------------------------- */

	app.options(
		ID.page1.userGroupSelector,
		async ({ ack, client, logger, payload }) => {
			try {
				const MAX_ITEMS_TO_SEND = 100;

				/* --------------------------- Get all user groups -------------------------- */

				const allUserGroups = (
					await getAllUserGroups(client, logger)
				).usergroups.map(({ handle, id, name }) => {
					return {
						handle,
						id,
						name,
					};
				});

				/* ------------ Filter results; acknowledge request; update view ------------ */

				if (payload.value === "") {
					await ack({
						options: allUserGroups
							.slice(0, MAX_ITEMS_TO_SEND)
							.map(({ id, name, handle }) =>
								JSXSlack(
									<Option value={id}>
										{name} - @{handle}
									</Option>
								)
							),
					});
				} else {
					let filteredUserGroups = new Fuse(allUserGroups, {
						keys: ["handle", "name"],
					}).search(payload.value);

					await ack({
						options: filteredUserGroups
							.slice(0, 100)
							// TIL that you can double destructure
							.map(({ item: { id, name, handle } }) =>
								JSXSlack(
									<Option value={id}>
										{name} - @{handle}
									</Option>
								)
							),
					});
				}
			} catch (error) {
				logger.error(error);
			}
		}
	);
}
