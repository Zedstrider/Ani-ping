# Ani-ping

[![Status](https://img.shields.io/badge/status-active-brightgreen)]() [![License](https://img.shields.io/badge/license-ISC-blue)]()

Lightweight Node.js service that monitors anime airing schedules (via the Jikan API) and notifies subscribed users by email when an episode starts. Built with Express, MongoDB (Mongoose), Google Gmail API and a cron job.

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Quickstart](#quickstart)
- [Environment variables](#environment-variables)
- [Run](#run)
- [API / Endpoints](#api--endpoints)
- [How it works](#how-it-works)
- [Generating Gmail refresh token](#generating-gmail-refresh-token)
- [Troubleshooting](#troubleshooting)
- [Development & Testing](#development--testing)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## About

Ani-ping checks the Jikan (MyAnimeList) schedule for anime airing times and, when an anime's broadcast time matches the current time in Tokyo, sends emails to users who subscribed to that anime. It stores subscriber records in MongoDB and uses the Gmail API (OAuth2) to send the mail.

Tech stack
- Node.js (JavaScript)
- Express
- MongoDB (Mongoose)
- Jikan API (https://api.jikan.moe)
- Google APIs (Gmail)
- node-cron, axios

You can find the main files:
- `server.js` — main application and cron logic
- `generate_token.js` — helper to obtain Gmail OAuth refresh token
- `package.json` — dependencies
- `public/` — static assets / UI

---

## Features

- Subscribe by email to anime titles
- Unsubscribe link inside emails
- Uses Jikan schedule endpoint to detect airing anime for current day
- Emails sent through Gmail API (OAuth2, refresh token)
- Runs periodic checks via cron (configured in `server.js`)

---

## Quickstart

Prerequisites:
- Node.js (v16+ recommended)
- MongoDB connection (Atlas or local)
- Google Cloud OAuth 2.0 Client credentials (credentials.json)
- A Google account to send emails from (Gmail API enabled)

1. Clone and install
```bash
git clone https://github.com/Zedstrider/Ani-ping.git
cd Ani-ping
npm install
```

2. Add credentials and obtain a refresh token
- Create a Google OAuth client (Desktop or Web) in Google Cloud Console and download `credentials.json` to the project root.
- Run the helper to get a refresh token:
```bash
node generate_token.js
```
Follow the URL printed, authorize, paste the code — copy the printed refresh token.

3. Create a `.env` file in project root (example below) and fill values.

4. Start the app
```bash
npm start
```

By default the server listens on PORT (or 5501).

---

## Environment variables

Example `.env` (do NOT commit this file):

```

# Gmail / Google OAuth
GMAIL_USER=youremail@gmail.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
GOOGLE_REFRESH_TOKEN=...

# App
BASE_URL=https://your-public-url.example  # used for unsubscribe links
PORT=5501
```

Notes:
- `credentials.json` (from Google Cloud) is required for `generate_token.js`.
- `GOOGLE_REFRESH_TOKEN` is obtained by running `generate_token.js`.

---

## Run

Start the server:

```bash
npm start
```

The project currently schedules `checkUpdates()` every minute via `node-cron` (see `server.js`):

- The cron expression is `* * * * *` (runs every minute). Adjust as needed.

---

## API / Endpoints

- GET /  
  - Status page, returns "Ani-Ping is online!"

- POST /subscribe  
  - Form fields: `email`, `animeTitle`  
  - Adds or updates a subscriber record. Prevents duplicate anime subscriptions per email.

- GET /unsubscribe?id=<mongodb_id>&title=<animeTitle>  
  - Removes the anime title from the subscriber's list.

- GET /test-check  
  - Triggers a manual `checkUpdates()` run (useful for testing).

---

## How it works (implementation notes)

- Every run, the app requests `https://api.jikan.moe/v4/schedules/<day>` where `<day>` is today's weekday name in English.
- For each anime returned, it compares the anime's `broadcast.time` with the current Tokyo time (formatted as `HH:MM`). If they match exactly, it looks up subscribers with the title in lowercase and sends an email.
- Email sending is implemented using the Google APIs client by creating a raw RFC 822 message and calling `gmail.users.messages.send`.

Caveats / possible improvements:
- Exact time string matching can easily miss notifications (network latency, timezone shifts). Consider a small time window (e.g., +/- 2–5 minutes) or scheduling based on parsed timestamps.
- Title matching is done using `animeTitle.toLowerCase()` and exact equals; consider fuzzy matching or fuzzy-search to handle title variations.
- Add rate-limiting and batching of emails for large subscriber lists.

---

## Generating Gmail refresh token

1. Place `credentials.json` (downloaded from Google Cloud console) in the repo root.
2. Run:
```bash
node generate_token.js
```
3. Visit the printed URL, authorize the app, paste the returned code into the prompt.
4. The script will print the refresh token — copy it into your `.env` as `GOOGLE_REFRESH_TOKEN`.

---

## Troubleshooting

- MongoDB connection fails:
  - Check `MONGO_URI`, network access and IP whitelist (if using Atlas).
- Gmail / OAuth errors:
  - Ensure Gmail API is enabled in Google Cloud project and credentials are correct.
  - Ensure the refresh token is valid (may need to re-run `generate_token.js`).
- Duplicate subscription errors:
  - A duplicate email will trigger MongoDB unique index error (handled in `server.js`). Use different email or unsubscribe first.

---

## Development & Testing

- No tests are included yet. Use the `test` script in `package.json` as a placeholder.
- To add live-reload development flow, consider adding `nodemon` and a `dev` script:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```
- Linting / formatting are not configured; consider adding ESLint and Prettier.

---

## Security

- Never commit `.env` or `credentials.json` to source control.
- Keep `GOOGLE_REFRESH_TOKEN` and `GOOGLE_CLIENT_SECRET` private.
- When deploying, use secret managers or environment variables provided by your host.

---

## Roadmap / Improvements

- Add tests and CI (GitHub Actions).
- Add retries and better error handling for email sends.
- Add an admin UI to view subscribers and metrics.
- Support Discord / Telegram notifications as alternative delivery channels.
- Improve matching logic (aliases, synonyms, fuzzy matching).

---

## Contributing

Contributions are welcome. Typical workflow:
- Fork → feature branch → PR
- Open an issue for large changes first
- Add tests for new functionality where appropriate

---

## License

This project uses the ISC license (see `package.json`).

---

## Contact

Maintainer listed in package.json: Sharath P  
Repository: https://github.com/Zedstrider/Ani-ping

---