/** @jsx JSXSlack.h **/
/** @jsxFrag JSXSlack.Fragment **/

import { Logger } from "@slack/logger";
import { WebClient } from "@slack/web-api";

import JSXSlack, {
	ExternalSelect,
	Input,
	Modal,
	Section,
	Option,
	Mrkdwn,
} from "jsx-slack";
import Fuse from "fuse.js";

import { app } from "../main";

import {
	getAllUserGroups,
	getUserGroupInfo,
	getUserGroupsOfChannel,
	isUserAdmin,
	isUserBotManager,
	isUserChannelOwner,
	setUserGroupsOfChannel,
} from "../logic";

export function Edit() {
	/* -------------------------------------------------------------------------- */
	/*                                 Identifiers                                */
	/* -------------------------------------------------------------------------- */

	// Centralized location for identifiers,
	// necessary to identify events and actions

	const ID = {
		main: "/edit-linked-user-groups",
		submitted: "edit-linked-user-groups_submitted",
		closedIneligible: "edit-linked-user-groups_closed-ineligible",
		userGroupsSelectorBlock:
			"edit-linked-user-groups_user-groups-selector-block",
		userGroupsSelector:
			"edit-linked-user-groups_user-groups-selector-block",
	};

	/* -------------------------------------------------------------------------- */
	/*                                 Open modal                                 */
	/* -------------------------------------------------------------------------- */

	app.command(ID.main, async ({ ack, body, client, logger, command }) => {
		try {
			/* --------------------------- Acknowledge request -------------------------- */

			await ack();

			/* ------------------------- Determine view to show ------------------------- */

			let showErrorScreen = true;
			let view;

			const userID = command.user_id;
			const channelID = command.text.substring(2, 13);

			if (
				(await isUserAdmin(client, logger, userID)) === true ||
				(await isUserChannelOwner(
					client,
					logger,
					userID,
					channelID
				)) === true ||
				isUserBotManager(userID) === true
			)
				showErrorScreen = false;

			/* ----------------------------- Construct view ----------------------------- */

			if (showErrorScreen == true) {
				view = JSXSlack(
					<Modal
						title="Permission required"
						close="Cancel"
						submit="Continue"
						callbackId={ID.closedIneligible}
					>
						<Section>
							Sorry! You can't edit the linked user groups for
							this channel, because you aren't the channel owner.
							Workspace Admins don't have this limitation.
						</Section>
					</Modal>
				);
			} else {
				/* ------- Construct <Option> blocks for previously-linked user groups ------ */

				const alreadyLinkedUserGroups = await getUserGroupsOfChannel(
					logger,
					channelID
				);

				let alreadyLinkedUserGroupsOptions = [];

				for (const userGroupID of alreadyLinkedUserGroups) {
					const { id, name, handle } = (
						await getUserGroupInfo(client, logger, userGroupID)
					).usergroup;

					alreadyLinkedUserGroupsOptions.push(
						JSXSlack(
							<Option value={id}>
								{name} - @{handle}
							</Option>
						)
					);
				}

				/* ------------------------- Construct rest of view ------------------------- */

				view = JSXSlack(
					<Modal
						title="Edit linked user groups"
						close="Cancel"
						submit="Continue"
						callbackId={ID.submitted}
						// Send channelID off to the next stage in the payload
						privateMetadata={JSON.stringify(channelID)}
					>
						<Section>
							<Mrkdwn raw>
								*Editing user groups for{" "}
								{"<#" + channelID + ">"}*
							</Mrkdwn>
						</Section>

						<Input
							id={ID.userGroupsSelectorBlock}
							label="User groups"
						>
							<ExternalSelect
								name={ID.userGroupsSelector}
								multiple={true}
								placeholder="Choose user groups"
								maxSelectedItems={3}
								minQueryLength={0}
								initialOption={alreadyLinkedUserGroupsOptions}
							></ExternalSelect>
						</Input>
					</Modal>
				);
			}

			/* -------------------------------- Show view ------------------------------- */

			await client.views.open({
				// Open this view when that shortcut is used
				trigger_id: body.trigger_id,
				view,
			});
		} catch (error) {
			logger.error(error);
		}
	});

	/* -------------------------------------------------------------------------- */
	/*                               Complete modal                               */
	/* -------------------------------------------------------------------------- */

	app.view(ID.closedIneligible, async ({ ack, logger }) => {
		try {
			await ack();
		} catch (error) {
			logger.error(error);
		}
	});

	app.view(ID.submitted, async ({ ack, logger, payload }) => {
		try {
			await ack();

			let selectedOptions =
				payload.state.values[ID.userGroupsSelectorBlock][
					ID.userGroupsSelector
				].selected_options;
			let userGroups = [];

			for (const option of selectedOptions) {
				userGroups.push(option.value);
			}

			setUserGroupsOfChannel(
				logger,
				JSON.parse(payload.private_metadata),
				userGroups
			);
		} catch (error) {
			logger.error(error);
		}
	});

	/* -------------------------------------------------------------------------- */
	/*                    Load options for user groups selector                   */
	/* -------------------------------------------------------------------------- */

	app.options(
		ID.userGroupsSelector,
		async ({ ack, client, logger, payload }) => {
			try {
				await ack({
					options: await getUserGroupsAsOptionBlocks(
						client,
						logger,
						payload.value
					),
				});
			} catch (error) {
				logger.error(error);
			}
		}
	);
}

/* -------------------------------------------------------------------------- */
/*                Search user groups and return option elements               */
/* -------------------------------------------------------------------------- */

async function getUserGroupsAsOptionBlocks(
	client: WebClient,
	logger: Logger,
	query: string
) {
	let optionBlocks;

	const MAX_RESULTS = 100;

	/* --------------------------- Get all user groups -------------------------- */

	const allUserGroups = (await getAllUserGroups(client, logger)).map(
		({ handle, id, name }) => {
			return {
				handle,
				id,
				name,
			};
		}
	);

	if (query === "") {
		/* -------------------- Construct blocks for blank query -------------------- */

		optionBlocks = allUserGroups
			.slice(0, MAX_RESULTS)
			.map(({ id, name, handle }) =>
				JSXSlack(
					<Option value={id}>
						{name} - @{handle}
					</Option>
				)
			);
	} else {
		/* ------------------ Construct blocks for non-blank query ------------------ */

		let filteredUserGroups = new Fuse(allUserGroups, {
			keys: ["handle", "name"],
		}).search(query);

		optionBlocks = filteredUserGroups
			.slice(0, 100)
			// TIL that you can double destructure
			.map(({ item: { id, name, handle } }) =>
				JSXSlack(
					<Option value={id}>
						{name} - @{handle}
					</Option>
				)
			);
	}

	/* ------------------------- Return option elements ------------------------- */

	return optionBlocks;
}
