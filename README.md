# Auto User Group for Slack

This app, using Slack commands, allows users to "link" user groups to channels, thereby auto-adding any future channel members to linked user group(s).

To get set up, add the following environment variables:

-   SLACK_BOT_TOKEN
-   SLACK_APP_TOKEN (app-level token, for socket mode)
-   SLACK_SIGNING_SECRET
-   DATA_FILE_PATH (absolute path of data.json)
-   LOGS_FILE_PATH (absolute path of logs.txt)
-   BOT_MANAGER_IDS (comma-separated list of user IDs of users who may modify any channel's configuration)
