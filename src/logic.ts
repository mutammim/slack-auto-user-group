import { Logger } from "@slack/logger";
import { WebClient } from "@slack/web-api";

/**
 * Get an array of all user groups in the workspace.
 */
export async function getAllUserGroups(client: WebClient, logger: Logger) {
	try {
		const result = await client.usergroups.list();
		return result;
	} catch (error) {
		logger.error(error);
	}
}

/**
 * Add the provided user to the user group.
 */
export async function addUserToUserGroup(
	client: WebClient,
	logger: Logger,
	memberID: string,
	userGroupID: string
) {
	try {
		// Get list of all users in user group

		let users = (
			await client.usergroups.users.list({
				usergroup: userGroupID,
			})
		).users;

		// Add member if they aren't already there

		if (users.includes(memberID) === false) {
			users.push(memberID);
		}

		await client.usergroups.users.update({
			usergroup: userGroupID,
			users: users as any,
		});
	} catch (error) {
		logger.error(error);
	}
}

/**
 * Remove the provided user from the user group.
 */
export async function removeUserFromUserGroup(
	client: WebClient,
	logger: Logger,
	memberID: string,
	userGroupID: string
) {
	try {
		// Get list of all users in user group

		let users = (
			await client.usergroups.users.list({
				usergroup: userGroupID,
			})
		).users;

		// Remove member if they aren't already there

		users = users.filter((user) => user !== memberID);

		await client.usergroups.users.update({
			usergroup: userGroupID,
			users: users as any,
		});
	} catch (error) {
		logger.error(error);
	}
}

/**
 * Get the member count of the channel.
 */
export async function getChannelMemberCount(
	client: WebClient,
	logger: Logger,
	channelID: string
) {
	try {
		const data = await client.conversations.members({
			channel: channelID,
		});

		return data.members.length;
	} catch (error) {
		logger.error(error);
	}
}

/**
 * Is the provided user an admin?
 */
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
