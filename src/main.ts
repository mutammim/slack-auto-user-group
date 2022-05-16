import { App, LogLevel } from "@slack/bolt";

const { createWriteStream } = require("fs");
const logWritable = createWriteStream("./logs.txt");

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
			logWritable.write(
				`[${Date.now()}] [DEBUG] ${JSON.stringify(msgs)}\n`
			);
		},
		info: (...msgs) => {
			logWritable.write(
				`[${Date.now()}] [INFO ] ${JSON.stringify(msgs)}\n`
			);
		},
		warn: (...msgs) => {
			logWritable.write(
				`[${Date.now()}] [WARN ] ${JSON.stringify(msgs)}\n`
			);
		},
		error: (...msgs) => {
			logWritable.write(
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
	console.log("⚡️ App is running!");

	Edit();
	onChannelJoin();
	onChannelLeave();
})();
