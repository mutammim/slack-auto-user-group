import { app } from "../main";
import { getUserGroupsOfChannel, removeUserFromUserGroup } from "../logic";

export default function onChannelLeave() {
	app.event("member_left_channel", async ({ event, client, logger }) => {
		const linkedUserGroups = await getUserGroupsOfChannel(
			logger,
			event.channel
		);

		for (const userGroup of linkedUserGroups) {
			await removeUserFromUserGroup(
				client,
				logger,
				event.user,
				userGroup
			);
		}
	});
}
