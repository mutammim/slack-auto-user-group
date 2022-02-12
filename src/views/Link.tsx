/** @jsx JSXSlack.h **/
/** @jsxFrag JSXSlack.Fragment **/
import {
	JSXSlack,
	Modal,
	Input,
	ExternalSelect,
	Checkbox,
	CheckboxGroup,
	Confirm,
	ConversationsSelect,
	Context,
	Option,
	Section,
	Mrkdwn,
	Field,
} from "jsx-slack";
import Fuse from "fuse.js";

import { ViewOutput } from "@slack/bolt";

import { app } from "../main";
import {
	getAllUserGroups,
	getChannelMemberCount,
	isUserAdmin as isUserAdminCheck,
} from "../logic";

export function Link() {
	// These are identifiers, used for events, actions, etc.
	// I leave them all up here, in one object, for easy reference and usage

	const id = {
		main: "link-user-group",
		page1: {
			submissionCallback: "link-user-group_p1_submitted",
			channelSelector: "link-user-group_p1_channel-selector",
			userGroupSelector: "link-user-group_p1_user-group-selector",
		},
		page2: {
			submissionCallback: "link-user-group_p2_submitted",
			inviteExistingMembersCheckbox:
				"link-user-group_p2_invite-existing-members-checkbox",
		},
	};

	/* -------------------------------------------------------------------------- */
	/*                             Initial modal page                             */
	/* -------------------------------------------------------------------------- */

	app.shortcut(id.main, async ({ ack, client, logger, shortcut }) => {
		try {
			/* ------------------------- Acknowledge the request ------------------------ */

			await ack();

			/* --------------------------- Construct the view --------------------------- */

			const view = JSXSlack(
				<Modal
					title="Link user group"
					close="Cancel"
					submit="Continue"
					callbackId={id.page1.submissionCallback}
					privateMetadata={JSON.stringify({
						userID: shortcut.user.id, // Keep track of the user, to verify action eligibility later
					})}
				>
					<Input label="Channel" required={true}>
						<ConversationsSelect
							name={id.page1.channelSelector}
							placeholder="Select channel"
							include={["public", "private"]}
						></ConversationsSelect>
					</Input>
					<Input label="User group" required={true}>
						<ExternalSelect
							name={id.page1.userGroupSelector}
							placeholder="Select user group"
							minQueryLength={0}
						></ExternalSelect>
					</Input>
					<Context>
						Can't find your user group? Type more letters; the
						selector only shows the top 100.
					</Context>
				</Modal>
			);

			/* ------------------------------ Show the view ----------------------------- */

			await client.views.open({
				trigger_id: shortcut.trigger_id,
				view,
			});
		} catch (error) {
			logger.error(error);
		}
	});

	/* -------------------------------------------------------------------------- */
	/*                         Advanced options modal page                        */
	/* -------------------------------------------------------------------------- */

	app.view(id.page1.submissionCallback, async ({ ack, logger, payload }) => {
		try {
			/* -------------------------- Get info from payload ------------------------- */
			// (The payload comes from the previous page)

			const { selectedChannel, selectedUserGroup, userID } =
				processPayloadForSecondPage(payload);

			/* --------------------------- Construct the view --------------------------- */

			const view = JSXSlack(
				<Modal
					title="Link user group"
					close="Cancel"
					submit="Continue"
					callbackId={id.page2.submissionCallback}
					// Storing input from first and second pages, for use on final page
					privateMetadata={JSON.stringify({
						userID,
						selectedChannel,
						selectedUserGroup,
					})}
				>
					<CheckboxGroup
						name={id.page2.inviteExistingMembersCheckbox}
						label="Advanced"
						confirm={
							<Confirm title="Are you sure?" confirm="Confirm">
								This action may ping a lot of people. Make sure
								you want to select it before continuing.
							</Confirm>
						}
					>
						<Checkbox
							description=":warning: This could result in a lot of DMs. Be careful if choosing this option."
							value="invite-existing-channel-members"
						>
							Invite existing channel members to user group
						</Checkbox>
					</CheckboxGroup>
				</Modal>
			);

			/* -------------- Acknowledge the request, and update the view -------------- */

			await ack({
				response_action: "update",
				view,
			});
		} catch (error) {
			logger.error(error);
		}
	});

	/* -------------------------------------------------------------------------- */
	/*                           Confirmation modal page                          */
	/* -------------------------------------------------------------------------- */

	app.view(
		id.page2.submissionCallback,
		async ({ ack, client, logger, payload }) => {
			try {
				/* ------------------------ Get info from the payload ----------------------- */

				const {
					selectedChannel,
					selectedUserGroup,
					userID,
					inviteExistingMembers,
				} = processPayloadForConfirmationPage(payload);

				/* --------- Determine whether to show error or confirmation screen --------- */

				// If the channel has 50+ people, and the user running this shortcut is not an admin
				//     Show error screen
				// Else
				//     Show confirmation screen

				const MANY_MEMBERS_THRESHOLD = 50;

				const doesChannelHaveManyPeople =
					(await getChannelMemberCount(
						client,
						logger,
						selectedChannel
					)) >= MANY_MEMBERS_THRESHOLD;

				const isUserAdmin =
					(await isUserAdminCheck(client, logger, userID)) === false;

				let showErrorScreen = false;

				if (doesChannelHaveManyPeople && !isUserAdmin)
					showErrorScreen = true;

				/* --------------------------- Construct the view --------------------------- */

				let view;

				if (showErrorScreen) {
					view = JSXSlack(
						<Modal
							title="Admin status required"
							close="Cancel"
							submit="Okay"
						>
							<Section>
								For safety reasons, this action requires admin
								status, because it affects a channel with{" "}
								{MANY_MEMBERS_THRESHOLD}+ members. Sorry about
								that! You can ask a Workspace Admin to do this
								for you.
							</Section>
						</Modal>
					);
				} else {
					// The raw in <Mrkdwn raw> is necessary to make the mentions work

					view = JSXSlack(
						<Modal
							title="Link user group"
							close="Cancel"
							submit="Complete"
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
								<Field>Existing members auto-invited</Field>
								<Field>
									{inviteExistingMembers ? "*Yes*" : "*No*"}
								</Field>
							</Section>
						</Modal>
					);
				}

				/* -------------- Acknowledge the request, and update the view -------------- */

				await ack({
					response_action: "update",
					view,
				});
			} catch (error) {
				logger.error(error);
			}
		}
	);

	/* -------------------------------------------------------------------------- */
	/*                                    Other                                   */
	/* -------------------------------------------------------------------------- */

	/* ----------------- Provide options for user group selector ---------------- */

	app.options(
		id.page1.userGroupSelector,
		async ({ ack, client, payload }) => {
			// Get all user groups

			const allUserGroups = await (
				await getAllUserGroups(client)
			).usergroups.map(({ handle, id, name }) => {
				return {
					handle,
					id,
					name,
				};
			});

			// Do filtering if necessary

			let filteredUserGroups;

			if (payload.value === "") {
				// If there was no search, skip the searching

				filteredUserGroups = allUserGroups;

				// Send list of 100 user groups

				await ack({
					options: filteredUserGroups
						.slice(0, 100)
						.map(({ id, name, handle }) =>
							JSXSlack(
								<Option value={id}>
									{name} — @{handle}
								</Option>
							)
						),
				});
			} else {
				// If there was a search, do a fuzzy search

				filteredUserGroups = new Fuse(allUserGroups, {
					keys: ["handle", "name"],
				}).search(payload.value);

				// Send list of 100 user groups
				// item.item is because of how Fuse structures the data it returns

				await ack({
					options: filteredUserGroups.slice(0, 100).map((item) =>
						JSXSlack(
							<Option value={item.item.id}>
								{item.item.name} — @{item.item.handle}
							</Option>
						)
					),
				});
			}
		}
	);

	/* --------------------- Process payload for second page -------------------- */

	function processPayloadForSecondPage(payload: ViewOutput) {
		/* -------------------------- Find selected channel ------------------------- */

		// We need to get the channel selector's block ID
		//     (so that we can find the right value in the state object)
		// This is done by filtering through all the blocks, and finding the
		//     block ID of the block with a matching action ID
		// ?. is crucial because some blocks don't have action_id
		// [0] takes the first result (we only expect one) from the filtering
		// ["block_id"] grabs the relevant property, which we'll use soon

		const channelSelectorBlockID = payload.blocks.filter(
			(block) => block.element?.action_id == id.page1.channelSelector
		)[0]["block_id"];

		// Now that we have the Block ID, let's search through the keys of
		//    the object state.values, knowing that each key is a Block ID,
		//    and find the right object

		const channelSelectorStateObj =
			payload.state.values[channelSelectorBlockID];

		// Finally, let's drill a bit more into the object

		const selectedChannel =
			channelSelectorStateObj[id.page1.channelSelector][
				"selected_conversation"
			];

		/* ------------------------ Find selected user group ------------------------ */

		// Same process as above

		const userGroupSelectorBlockID = payload.blocks.filter(
			(block) => block.element?.action_id == id.page1.userGroupSelector
		)[0]["block_id"];

		const userGroupSelectorStateObj =
			payload.state.values[userGroupSelectorBlockID];

		const selectedUserGroup =
			userGroupSelectorStateObj[id.page1.userGroupSelector][
				"selected_option"
			].value;

		/* ------------------------------ Find user ID ------------------------------ */

		// By user ID, I'm referring to the ID of the user who started the modal
		// This was sent from the first page to the second not with payload.state.values,
		// but with payload.private_metadata
		// This is because it isn't an input, so it's not going to be in payload.state

		const userID = JSON.parse(payload.private_metadata).userID;

		/* ------------------------------ Return values ----------------------------- */

		return { selectedChannel, selectedUserGroup, userID };
	}

	/* ------------------ Process payload for confirmation page ----------------- */

	function processPayloadForConfirmationPage(payload: ViewOutput) {
		/* --------- Find selected channel, selected user group, and user ID -------- */

		const { selectedChannel, selectedUserGroup, userID } = JSON.parse(
			payload.private_metadata
		);

		/* -------- Find whether or not "invite existing members" was checked ------- */

		// Same sort of process as previously

		const inviteExistingMembersCheckboxBlockID = payload.blocks.filter(
			(block) =>
				block.element?.action_id ==
				id.page2.inviteExistingMembersCheckbox
		)[0]["block_id"];

		const inviteExistingMembersCheckboxStateObj =
			payload.state.values[inviteExistingMembersCheckboxBlockID];

		// Boolean that says if the user wants to invite existing members
		const inviteExistingMembers =
			inviteExistingMembersCheckboxStateObj[
				id.page2.inviteExistingMembersCheckbox
			]["selected_options"].length > 0;

		/* ------------------------------ Return values ----------------------------- */

		return {
			selectedChannel,
			selectedUserGroup,
			userID,
			inviteExistingMembers,
		};
	}
}
