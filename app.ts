const USER_GROUPS = {
	// channel ID as key: user group ID as value,
};

import { App } from "@slack/bolt";
import { WebClient } from "@slack/web-api";

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	socketMode: true,
	appToken: process.env.SLACK_APP_TOKEN,
});

(async () => {
	await app.start(process.env.PORT || 3000);
	console.log("⚡️ App is running!");
})();

/* -------------------------------------------------------------------------- */
/*                                  Utilities                                 */
/* -------------------------------------------------------------------------- */

async function getUserGroupMembers(client: WebClient, channelID: string) {
	try {
		const result = await client.usergroups.users.list({
			usergroup: USER_GROUPS[channelID],
		});

		return result.users;
	} catch (error) {
		console.error(error);
	}
}

async function setUserGroupMembers(
	client: WebClient,
	channelID: string,
	newMembers
) {
	try {
		await client.usergroups.users.update({
			usergroup: USER_GROUPS[channelID],
			users: newMembers,
		});

		return true;
	} catch (error) {
		console.error(error);
	}
}

/* -------------------------------------------------------------------------- */
/*                                   Events                                   */
/* -------------------------------------------------------------------------- */

app.event("member_joined_channel", async ({ event, client, logger }) => {
	console.log("someone joined!");

	// Get current list of members

	let membersInGroup = await getUserGroupMembers(client, event.channel);

	// Add members to list if not already on list

	if (membersInGroup.includes(event.user) === false) {
		membersInGroup.push(event.user);
	}

	// Update list of members of user group

	setUserGroupMembers(client, event.channel, membersInGroup);
});

app.event("member_left_channel", async ({ event, client, logger }) => {
	console.log("someone left.");

	// Get current list of members

	let membersInGroup = await getUserGroupMembers(client, event.channel);

	// Remove user from list if found

	membersInGroup = membersInGroup.filter((member) => member !== event.user);

	// Update list of members of user group

	setUserGroupMembers(client, event.channel, membersInGroup);
});
