import "dotenv/config";

import { App, LogLevel } from "@slack/bolt";

const { appendFileSync } = require("fs");

import { Edit } from "./views/Edit";
import onChannelJoin from "./events/onChannelJoin";
import onChannelLeave from "./events/onChannelLeave";

export const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	socketMode: true,
	appToken: process.env.SLACK_APP_TOKEN,
	// Source: https://slack.dev/bolt-js/concepts#logging
	logger: {
		debug: (...msgs) => {
			appendFileSync(
				process.env.LOGS_FILE_PATH,
				`[${Date.now()}] [DEBUG] ${JSON.stringify(msgs)}\n`
			);
		},
		info: (...msgs) => {
			appendFileSync(
				process.env.LOGS_FILE_PATH,
				`[${Date.now()}] [INFO ] ${JSON.stringify(msgs)}\n`
			);
		},
		warn: (...msgs) => {
			appendFileSync(
				process.env.LOGS_FILE_PATH,
				`[${Date.now()}] [WARN ] ${JSON.stringify(msgs)}\n`
			);
		},
		error: (...msgs) => {
			appendFileSync(
				process.env.LOGS_FILE_PATH,
				`[${Date.now()}] [ERROR] ${JSON.stringify(msgs)}\n`
			);
		},
		// This are required...but will really just be ignored
		setLevel: (level) => {},
		getLevel: () => LogLevel.DEBUG,
		setName: (name) => {},
	},
});

(async () => {
	await app.start(process.env.PORT || 3000);

	appendFileSync(process.env.LOGS_FILE_PATH, `[${Date.now()}] [START]\n`);
	console.log("⚡️ App is running!");

	Edit();
	onChannelJoin();
	onChannelLeave();
})();
