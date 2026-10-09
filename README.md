# Mwalimu Digital

A private, static-first CBC teacher workspace. Add your class details in
**Class & backup**, then build the nominal roll and use it throughout the app.

## Included

- Learner register with search, editing and admission-number checks
- Daily attendance with present, absent and late statuses
- Weekly timetable with overlap warnings and print support
- CBC lesson plans with outcomes, learning activities and resources
- Assessment evidence using EE, ME, AE and BE
- Individual learner support goals and review dates
- Class summaries and CSV exports
- JSON backup and restore for moving between browsers or devices

## Data and privacy

The app needs no account, server, database or third-party JavaScript library.
Records are stored in the browser's local storage on the device being used.
They do not automatically sync across devices or browsers. Download backups
regularly and keep backup files private. Do not store unnecessary sensitive
learner details in support notes.

## Deploy to Cloudflare Workers

The static site is in `public/`; `wrangler.jsonc` points Wrangler at that
directory. From the project root, deploy with:

```sh
npx wrangler deploy
```

To try the site locally with Wrangler, run:

```sh
npx wrangler dev
```
