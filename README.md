# Tiny Date Planner

A mobile-first date-planner website inspired by the screenshots: a playful moving "No" button, date/time selection, food choices, and a final one-time comment form.

Submissions are saved in `data/submissions.jsonl`. If SMTP is configured, the reply is also sent to your email.

## Run

```bash
npm start
```

Open `http://localhost:3000`.

## Email Notifications

1. Copy `.env.example` to `.env`.
2. Add your SMTP provider details.
3. Set `OWNER_EMAIL` to your inbox.
4. Restart the server.

For Gmail, use an app password, not your normal account password. Also double-check the owner email address: `arnab20,dhar@gmail.com` has a comma and Gmail addresses normally do not.

If SMTP is not configured, the website still works and stores every answer locally in `data/submissions.jsonl`.
