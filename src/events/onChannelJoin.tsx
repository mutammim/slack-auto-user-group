/** @jsx JSXSlack.h **/
/** @jsxFrag JSXSlack.Fragment **/

import JSXSlack, { Actions, Blocks, Button, Mrkdwn, Section } from "jsx-slack";

import { app } from "../main";
import {
	addUserToUserGroup,
	logEventHasHappened,
	getUserGroupInfo,
	getUserGroupsOfChannel,
	getUserGroupUsersList,
	removeUserFromUserGroup,
	hasEventAlreadyHappened,
} from "../logic";

export default function onChannelJoin() {
	app.event("member_joined_channel", async ({ event, client, logger }) => {
		/* ---------- Return if this event happened already (record if not) --------- */

		if (hasEventAlreadyHappened(logger, event["event_ts"]) === true) {
			return;
		} else {
			logEventHasHappened(logger, event["event_ts"]);
		}

		/* ---------------------- Get basic info and log event ---------------------- */

		const channelID = event.channel;
		const userID = event.user;

		logger.info(`${userID} just joined ${channelID}`);

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
							{"<!subteam^" + userGroupID + ">"}. If you'd like,
							you can leave the user group.
						</Mrkdwn>
					</Section>
					<Actions>
						<Button actionId="on-channel-join_leave">
							Leave user group
						</Button>
					</Actions>
				</Blocks>
			);

			let detailsText = `Hello! Someone set #${channelID} to automatically add you to @${userGroupHandle}. If you'd like,
							you can leave the user group.`;

			let doneDM = JSXSlack(
				<Blocks>
					<Section>
						<Mrkdwn raw>
							Hello! Someone set {"<#" + channelID + ">"} to
							automatically add you to{" "}
							{"<!subteam^" + userGroupID + ">"}. If you'd like,
							you can leave the user group.
						</Mrkdwn>
					</Section>
					<Section>
						✅ You left the user group. (You can still rejoin at any
						time.)
					</Section>
				</Blocks>
			);

			let doneText = `✅ You left @${userGroupHandle}. (You can still rejoin at any
						time.)`;

			/* --------------------------------- Send DM -------------------------------- */

			app.client.chat.postMessage({
				channel: userID,
				blocks: detailsDM,
				text: detailsText,
			});

			app.action("on-channel-join_leave", async (everything) => {
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
