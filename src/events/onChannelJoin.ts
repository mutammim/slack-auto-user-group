import { app } from "../main";
import { addUserToUserGroup, getUserGroupsOfChannel } from "../logic";

export default function onChannelJoin() {
	app.event("member_joined_channel", async ({ event, client, logger }) => {
		const linkedUserGroups = await getUserGroupsOfChannel(
			logger,
			event.channel
		);

		for (const userGroup of linkedUserGroups) {
			await addUserToUserGroup(client, logger, event.user, userGroup);
		}
	});
}
