import { App } from "@slack/bolt";

import { Link } from "./views/Link";
import { Delink } from "./views/Delink";
// import onChannelJoin from "./events/onChannelJoin";
// import onChannelLeave from "./events/onChannelLeave";

export const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	socketMode: true,
	appToken: process.env.SLACK_APP_TOKEN,
});

(async () => {
	await app.start(process.env.PORT || 3000);
	console.log("⚡️ App is running!");

	Link();
	Delink();
	// onChannelJoin();
	// onChannelLeave();
})();
