# BTD6 Contested Territory Tracker

For tracking stuff in CT.

## Dev workflow

Add an env file and fill out the variables.

Use `npm run start` to start the server. Currently the bot wipes commands and re-adds them on start.

Use `npm run remove-commands` to remove the commands from your server.

## TODO

TODO:
- debug /available command finding existing message and editing it
- debug expiring soon returning 'none'
- consider formatting dates a little better with h, m, s. Maybe HH:MM:SS to match CT?
  - fix "expiring at undefinedm"
  - format table by making minimum spaces, maybe code snippet? check sidekick 2
- locally test
- get a channel to start testing for real
- try hosting on lightsail
