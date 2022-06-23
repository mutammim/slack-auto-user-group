# Auto User Group for Slack

![Screenshot of main interface for app, the Edit linked user groups modal. There is some explanatory text, and a multi-select menu that allows the user to select up to 3 user groups, to be linked to the channel currently being edited.](https://www.mutammim.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fauto-user-group.d3049f03.png&w=1920&q=75)

Auto User Group allows user groups to be "linked" to Slack channels. Anyone who joins those channels in the future get automatically added to any linked user group(s). It can be convenient!

# Features

- Based on Slack commands and modals
- One-click leaving the user group after joining or leaving the channel
- People are only allowed to modify linked user groups for channels they own, unless they are a Workspace Admin or a Bot Manager

# Tooling

- **Slack app framework:** [BoltJS](https://slack.dev/bolt-js/tutorial/getting-started)
- **Fuzzy searching:** [fuse.js](https://fusejs.io/)
- **Slack UI representation:** [jsx-slack](https://github.com/yhatt/jsx-slack)
- **Bundling:** [esbuild](https://esbuild.github.io/)

# Setup

Set up a Slack bot using [the provided manifest](manifest.yml). Then, add the following environment variables, perhaps in a `.env` file.

-   `SLACK_BOT_TOKEN`
-   `SLACK_APP_TOKEN` (app-level token, for socket mode)
-   `SLACK_SIGNING_SECRET`
-   `DATA_FILE_PATH` (absolute path of data.json)
-   `LOGS_FILE_PATH` (absolute path of logs.txt)
-   `BOT_MANAGER_IDS` (comma-separated list of user IDs of users who may modify any channel's configuration)

Depending on your environment (such as the shell you're using), you may need to install a library that automatically handles environment variables.
