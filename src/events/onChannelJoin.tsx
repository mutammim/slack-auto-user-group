/** @jsx JSXSlack.h **/
/** @jsxFrag JSXSlack.Fragment **/

import JSXSlack, { Actions, Blocks, Button, Mrkdwn, Section } from "jsx-slack";

import { app } from "../main";
import {
	addUserToUserGroup,
	getUserGroupInfo,
	getUserGroupsOfChannel,
	getUserGroupUsersList,
	removeUserFromUserGroup,
} from "../logic";

export default function onChannelJoin() {
	app.event("member_joined_channel", async ({ event, client, logger }) => {
		/* ----------------------------- Get basic info ----------------------------- */

		const channelID = event.channel;
		const userID = event.user;

		const allLinkedUserGroups = await getUserGroupsOfChannel(
			logger,
			channelID
		);

		/* ------------- Filter out user groups that user is already in ------------- */

		let userGroups = [];

		for (const userGroupID of allLinkedUserGroups) {
			let userList = await getUserGroupUsersList(
				client,
				logger,
				userGroupID
			);

			if (!userList.users.includes(userID)) {
				userGroups.push(userGroupID);
			}
		}

		/* --------------------------- Add to user groups --------------------------- */

		for (const userGroupID of userGroups) {
			/* ------------------------- Add user to user group ------------------------- */

			await addUserToUserGroup(client, logger, userID, userGroupID);

			/* ------------------------- Find user group handle ------------------------- */

			let userGroupHandle = (
				await getUserGroupInfo(client, logger, userGroupID)
			).usergroup.handle;

			/* ------------------------------ Construct DM ------------------------------ */

			let detailsDM = JSXSlack(
				<Blocks>
					<Section>
						<Mrkdwn raw>
							Hello! Someone set {"<#" + channelID + ">"} to
							automatically add you to{" "}
							{"<!subteam^" + userGroupID + ">"}.
						</Mrkdwn>
					</Section>
					<Actions>
						<Button actionId="removeFromUserGroup">
							Remove me from the user group
						</Button>
					</Actions>
				</Blocks>
			);

			let detailsText = `Hello! Someone set #${channelID} to automatically add you to @${userGroupHandle}.`;

			let doneDM = JSXSlack(
				<Blocks>
					<Section>
						<Mrkdwn raw>
							Hello! Someone set {"<#" + channelID + ">"} to
							automatically add you to{" "}
							{"<!subteam^" + userGroupID + ">"}.
						</Mrkdwn>
					</Section>
					<Section>✅ You've been removed.</Section>
				</Blocks>
			);

			let doneText = `✅ You've been removed from @${userGroupHandle}.`;

			/* --------------------------------- Send DM -------------------------------- */

			app.client.chat.postMessage({
				channel: userID,
				blocks: detailsDM,
				text: detailsText,
			});

			app.action("removeFromUserGroup", async (everything) => {
				/* ----------------------- Remove user from user group ---------------------- */

				removeUserFromUserGroup(client, logger, userID, userGroupID);

				/* -------------------------------- Update DM ------------------------------- */

				app.client.chat.update({
					ts: (everything.body as any).message.ts,
					channel: (everything.body as any).channel.id,
					blocks: doneDM,
					text: doneText,
				});
			});
		}
	});
}
