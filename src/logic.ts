import fs from "fs";

import { Logger } from "@slack/logger";
import { WebClient } from "@slack/web-api";

interface Data {
	channel: string;
	userGroups: string[];
}

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

export async function isUserChannelOwner(
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

export async function getUserGroupsOfChannel(
	logger: Logger,
	channelID: string
) {
	try {
		const data: Data[] = JSON.parse(
			fs.readFileSync(process.env.DATA_FILE_PATH, "utf-8")
		);

		const items = data.filter((item) => item.channel === channelID);

		if (items.length === 0) return [];
		else return items[0].userGroups;
	} catch (error) {
		logger.error(error);
	}
}

export async function linkUserGroupToChannel(
	logger: Logger,
	channelID: string,
	userGroupID: string
) {
	try {
		let data: Data[] = JSON.parse(
			fs.readFileSync(process.env.DATA_FILE_PATH, "utf-8")
		);

		for (const item of data) {
			if (
				item.channel === channelID &&
				item.userGroups.includes(userGroupID) === true
			) {
				item.userGroups.push(userGroupID);
			}
		}

		fs.writeFileSync(process.env.DATA_FILE_PATH, "utf-8");
	} catch (error) {
		logger.error(error);
	}
}

export async function delinkUserGroupFromChannel(
	logger: Logger,
	channelID: string,
	userGroupID: string
) {
	let data: Data[] = JSON.parse(
		fs.readFileSync(process.env.DATA_FILE_PATH, "utf-8")
	);

	for (const item of data) {
		if (
			item.channel === channelID &&
			item.userGroups.includes(userGroupID) === true
		) {
			item.userGroups = item.userGroups.filter(
				(id: string) => id !== userGroupID
			);
		}
	}

	fs.writeFileSync(process.env.DATA_FILE_PATH, "utf-8");
}
