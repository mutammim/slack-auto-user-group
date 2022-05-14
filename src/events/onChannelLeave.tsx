/** @jsx JSXSlack.h **/
/** @jsxFrag JSXSlack.Fragment **/

import JSXSlack, { Actions, Blocks, Button, Mrkdwn, Section } from "jsx-slack";

import { app } from "../main";
import {
	getUserGroupInfo,
	getUserGroupsOfChannel,
	getUserGroupUsersList,
	removeUserFromUserGroup,
} from "../logic";

export default function onChannelLeave() {
	app.event("member_left_channel", async ({ event, client, logger }) => {
		/* ---------------------- Get basic info and log event ---------------------- */

		const channelID = event.channel;
		const userID = event.user;

		logger.info(`${userID} just left ${channelID}`);

		const allLinkedUserGroups = await getUserGroupsOfChannel(
			logger,
			channelID
		);

		/* -------------- Filter out user groups that user already left ------------- */

		let userGroups = [];

		for (const userGroupID of allLinkedUserGroups) {
			let userList = await getUserGroupUsersList(
				client,
				logger,
				userGroupID
			);

			if (userList.users.includes(userID)) {
				userGroups.push(userGroupID);
			}
		}

		/* --------------------------- Add to user groups --------------------------- */

		for (const userGroupID of userGroups) {
			/* ------------------------- Find user group handle ------------------------- */

			let userGroupHandle = (
				await getUserGroupInfo(client, logger, userGroupID)
			).usergroup.handle;

			/* ------------------------------ Construct DM ------------------------------ */

			let detailsDM = JSXSlack(
				<Blocks>
					<Section>
						<Mrkdwn raw>
							Hello! You left {"<#" + channelID + ">"}, but you're
							still a part of {"<!subteam^" + userGroupID + ">"},
							a user group linked to it. Do you want to leave the
							user group?
						</Mrkdwn>
					</Section>
					<Actions>
						<Button actionId="on-channel-leave_leave">Leave</Button>
						<Button actionId="on-channel-leave_stay">Stay</Button>
					</Actions>
				</Blocks>
			);

			let detailsText = `Hello! You left #${channelID}, but you're
							still a part of @${userGroupHandle}, a
							user group linked to it. Do you want to leave the
							user group?`;

			let leftDM = JSXSlack(
				<Blocks>
					<Section>
						<Mrkdwn raw>
							Hello! You left {"<#" + channelID + ">"}, but you're
							still a part of {"<!subteam^" + userGroupID + ">"},
							a user group linked to it. Do you want to leave the
							user group?
						</Mrkdwn>
					</Section>
					<Section>
						✅ You left the user group. (You can still rejoin at any
						time.)
					</Section>
				</Blocks>
			);

			let leftText = `✅ You left @${userGroupHandle}. (You can still rejoin at any
						time.)`;

			let stayDM = JSXSlack(
				<Blocks>
					<Section>
						<Mrkdwn raw>
							Hello! You left {"<#" + channelID + ">"}, but you're
							still a part of {"<!subteam^" + userGroupID + ">"},
							a user group linked to it. Do you want to leave the
							user group?
						</Mrkdwn>
					</Section>
					<Section>
						✅ You stayed in the user group. (You can still leave at
						any time.)
					</Section>
				</Blocks>
			);

			let stayText = `✅ You stayed in @${userGroupHandle}. (You can still leave or
						rejoin at any time.)`;

			/* --------------------------------- Send DM -------------------------------- */

			app.client.chat.postMessage({
				channel: userID,
				blocks: detailsDM,
				text: detailsText,
			});

			app.action("on-channel-leave_leave", async (everything) => {
				/* ----------------------- Remove user from user group ---------------------- */

				removeUserFromUserGroup(client, logger, userID, userGroupID);

				/* -------------------------------- Update DM ------------------------------- */

				app.client.chat.update({
					ts: (everything.body as any).message.ts,
					channel: (everything.body as any).channel.id,
					blocks: leftDM,
					text: leftText,
				});
			});

			app.action("on-channel-leave_stay", async (everything) => {
				/* -------------------------------- Update DM ------------------------------- */

				app.client.chat.update({
					ts: (everything.body as any).message.ts,
					channel: (everything.body as any).channel.id,
					blocks: stayDM,
					text: stayText,
				});
			});
		}
	});
}
