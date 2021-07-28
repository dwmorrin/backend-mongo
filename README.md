# Calendar API

This is the backend to a calendar app for scheduling events in locations.
[Client app repo found here.](https://github.com/dwmorrin/material-calendar)

## Setup

`yarn` to install dependencies.

Create a .env file with credentials for MySQL and email:

```
PORT=3001
NODE_ENV=development
MYSQL_HOST="127.0.0.1"
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=calendar
MYSQL_BACKUP_DIR=/my/backup/dir
MYSQL_SHA2_PASSPHRASE=if_using_password_auth_passphrase
AUTH_ID=if_bypassing_auth_for_development
AUTH_METHOD=DOT_ENV_AUTH_ID
EMAIL_FROM="Booking App <admin@booking.app>"
EMAIL_PORT=25
SESSION_SECRET=SecretForSessionCookies
```

## Authentication

An authentication method must be selected in `src/utils/authentication.ts`.
The method must set `res.locals.authId` to a string matching a username in the
MySQL database's user table.

If `NODE_ENV` is set to development, then the authentication ID will be retrieved
from the .env file.

By default the app will use password authentication.
This requires the .env property:

```
MYSQL_SHA2_PASSPHRASE=passphrase
```

For production with an external authentication that can inject the auth ID into
the requeset headers, add the following entries to .env:

```
AUTH_METHOD=CUSTOM_HEADER
AUTH_CUSTOM_HEADER=my-auth-id
```

Otherwise, add an additional case in `authentication.ts` for
your environment.

## Authorization

Authorization is done on each request by looking up the user's information
immediately after authentication and attaching the authorization info to the
response object as `res.locals.user` and `res.locals.admin`.

All responses should have `res.locals.user` with basic user information and
`res.locals.admin` will a boolean value indicataing that the user is an admin.

See `src/utils/authorization.ts` for details.

## Emailing

Emailing uses nodemailer to send mail. Requires a SMTP server running locally.
Default port is 25. Port and "from" field can be set with .env using
`EMAIL_PORT` and `EMAIL_FROM`.

For local testing, a docker container works nicely to log the emails:

```sh
docker pull ghusta/fakesmtp
mkdir /tmp/fakemail
# set .env EMAIL_PORT=2525
docker run -d -p 2525:25 -v /tmp/fakemail:/var/mail ghusta/fakesmtp:2.0
# hit the email API, then inspect emails sent at /tmp/fakemail
```

## Run

`yarn watch` will use `tsc` to build and `nodemon` to refresh `node` on save.

## Credits

Inspired by [Microsoft's TypeScript + Node + Mongo example](https://github.com/microsoft/TypeScript-Node-Starter)
