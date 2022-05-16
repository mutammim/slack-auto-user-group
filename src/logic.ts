import fs from "fs";

import { Logger } from "@slack/logger";
import { WebClient } from "@slack/web-api";

interface Data {
	channel: string;
	userGroups: string[];
}

/* -------------------------------------------------------------------------- */
/*                                  Get info                                  */
/* -------------------------------------------------------------------------- */

export async function getUserGroupInfo(
	client: WebClient,
	logger: Logger,
	userGroupID: string
) {
	try {
		let userGroup = await client.usergroups.update({
			usergroup: userGroupID,
		});

		return userGroup;
	} catch (error) {
		logger.error(error);
	}
}

export async function getUserGroupUsersList(
	client: WebClient,
	logger: Logger,
	userGroupID: string
) {
	try {
		let list = await client.usergroups.users.list({
			usergroup: userGroupID,
		});

		return list;
	} catch (error) {
		logger.error(error);
	}
}

export async function getAllUserGroups(client: WebClient, logger: Logger) {
	try {
		let allUserGroups = await client.usergroups.list();

		return allUserGroups.usergroups;
	} catch (error) {
		logger.error(error);
	}
}

export async function isUserAdmin(
	client: WebClient,
	logger: Logger,
	userID: string
) {
	try {
		const data = await client.users.info({
			user: userID,
		});

		return data.user.is_admin;
	} catch (error) {
		logger.error(error);
	}
}

export function isUserBotManager(userID: string) {
	let botManagers = process.env.BOT_MANAGER_IDS.split(",");

	return botManagers.includes(userID);
}

export async function isUserChannelCreator(
	client: WebClient,
	logger: Logger,
	userID: string,
	channelID: string
) {
	try {
		let channelCreator = (
			await client.conversations.info({
				channel: channelID,
			})
		).channel.creator;

		return channelCreator == userID;
	} catch (error) {
		logger.error(error);
	}
}

/* -------------------------------------------------------------------------- */
/*                     Edit linked user groups in database                    */
/* -------------------------------------------------------------------------- */

export async function getUserGroupsOfChannel(
	logger: Logger,
	channelID: string
) {
	try {
		/* --------------------------- Get database state --------------------------- */

		const data: Data[] = JSON.parse(
			fs.readFileSync(process.env.DATA_FILE_PATH, "utf-8")
		);

		/* -------------- Filter for user groups linked to this channel ------------- */

		const items = data.filter((item) => item.channel === channelID);

		/* ------------- Return user groups IDs, or blank array if none ------------- */

		if (items.length === 0) return [];
		else return items[0].userGroups;
	} catch (error) {
		logger.error(error);
	}
}

export async function setUserGroupsOfChannel(
	logger: Logger,
	channelID: string,
	userGroups: string[]
) {
	try {
		/* --------------------------- Get database state --------------------------- */

		let data: Data[] = JSON.parse(
			fs.readFileSync(process.env.DATA_FILE_PATH, "utf-8")
		);

		/* -------- Does this channel already have an entry in the database? -------- */

		// If not, give it one.

		let channelHasEntry = false;

		for (const item of data) {
			if (item.channel === channelID) channelHasEntry = true;
		}

		if (!channelHasEntry) {
			data.push({ channel: channelID, userGroups: [] });
		}

		/* ------------------ Set the channel's linked user groups ------------------ */

		for (const item of data) {
			if (item.channel === channelID) item.userGroups = userGroups;
		}

		/* ------------------------------ Write changes ----------------------------- */

		fs.writeFileSync(
			process.env.DATA_FILE_PATH,
			JSON.stringify(data),
			"utf-8"
		);
	} catch (error) {
		logger.error(error);
	}
}

/* -------------------------------------------------------------------------- */
/*                              Edit user groups                              */
/* -------------------------------------------------------------------------- */

export async function addUserToUserGroup(
	client: WebClient,
	logger: Logger,
	userID: string,
	userGroupID: string
) {
	try {
		/* --------------------- Get current users in user group -------------------- */

		const currentUsers = (
			await client.usergroups.users.list({ usergroup: userGroupID })
		).users;

		/* ------------------- Update user group to include userID ------------------ */

		// If they're already included this will result in a duplicate sent over, which is okay

		await client.usergroups.users.update({
			usergroup: userGroupID,
			users: [...currentUsers, userID].toString(),
		});
	} catch (error) {
		logger.error(error);
	}
}

export async function removeUserFromUserGroup(
	client: WebClient,
	logger: Logger,
	userID: string,
	userGroupID: string
) {
	try {
		/* --------------------- Get current users in user group -------------------- */

		const currentUsers = (
			await client.usergroups.users.list({ usergroup: userGroupID })
		).users;

		/* ------------------- Update user group to exclude userID ------------------ */

		// This will work even if the user isn't in the user group

		await client.usergroups.users.update({
			usergroup: userGroupID,
			users: currentUsers.filter((id) => id !== userID).toString(),
		});
	} catch (error) {
		logger.error(error);
	}
}
