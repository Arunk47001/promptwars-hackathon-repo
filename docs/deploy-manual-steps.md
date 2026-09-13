# Manual steps needed to finish the deploy lane (D2, D3, D5, D6, D7)

Everything below requires either a new external account/OAuth connection,
a paid/irreversible action, or a "Secret-Store Write" that this
environment's permission system blocked the deploy agent from performing
directly. Nothing here has been done for you — each item states exactly
what to click/run.

## 1. Provision managed Postgres+PostGIS (D2) — Neon (primary choice)

1. Sign up / log in at https://console.neon.tech (free tier is enough for
   a preview environment).
2. Create a new project (e.g. `brics-citizen-infrastructure-platform`),
   any region.
3. Copy the connection string Neon gives you. Make sure it includes
   `?sslmode=require` (Neon's default connection strings already do).
4. Locally, run the existing migrations against it once to confirm it
   works, e.g.:
   ```
   DATABASE_URL="postgresql://<neon-connection-string>?sslmode=require" npm run migrate
   ```
   `migrations/001_init.sql` already runs `CREATE EXTENSION IF NOT EXISTS
   postgis;` and `pgcrypto` — Neon supports both, but confirm the command
   above prints them applying cleanly against your actual Neon project.
5. Keep this connection string for step 4 below (Vercel env vars) — don't
   commit it anywhere.

Fallback: if Neon's Postgres version/PostGIS build doesn't work for any
reason, Supabase (https://supabase.com) is the documented fallback; same
steps apply (its connection string also needs `?sslmode=require`).

## 2. Confirm/consolidate the production Upstash instance (D3)

A real Upstash Redis database already exists and is wired into
`.env.local` (`UPSTASH_REDIS_REST_URL` on `*.upstash.io`) — this deploy
pass reused it rather than creating a second free-tier database, to avoid
unnecessary account/resource sprawl. If you'd prefer a dedicated
production-only instance separate from local dev, create a second
database at https://console.upstash.com/ and use its REST URL/token in
step 4 instead; otherwise no action is needed here.

## 3. Connect GitHub to Vercel (prerequisite for D6's native git integration)

Attempting `vercel link` during this deploy pass returned:
`Error: Failed to link Arunk47001/promptwars-hackathon-repo. You need to
add a Login Connection to your GitHub account first.`

1. Go to https://vercel.com/account/login-connections (or Account
   Settings -> Login Connections) while logged in as the `rocky-ca0b`
   account/team used by this project.
2. Connect your GitHub account (OAuth) there.
3. Then, in the Vercel dashboard, open the
   `brics-citizen-infrastructure-platform` project (already created by
   this deploy pass) -> Settings -> Git -> Connect Git Repository ->
   select `Arunk47001/promptwars-hackathon-repo`.

Once connected, Vercel's own git integration will automatically build a
preview deployment for every PR and a production deployment for every
merge to `main` — this is the intended, simplest path for D6. The
`.github/workflows/vercel-deploy.yml` added by this pass is only needed
as a fallback if you'd rather not use Vercel's native git integration
(see step 5).

## 4. Push the app code to GitHub

`git status` shows the entire application (everything the coder lane
built) is still untracked/uncommitted in this repo. Neither Vercel's git
integration nor the GitHub Actions workflow in step 5 can do anything
until this code exists on a branch/PR in
`github.com/Arunk47001/promptwars-hackathon-repo`. This deploy pass did
not commit or push your application source — that's your call on scope,
message, and branch strategy, not a "deploy" action.

## 5. Set environment variables on the Vercel project (D5)

The deploy pass created the Vercel project
(`rocky-ca0b/brics-citizen-infrastructure-platform`) but was blocked by
this environment's own permission system from writing any environment
variables into it ("Secret-Store Writes" denied by the auto-mode
classifier) — this needs to be done by you, either in the dashboard
(Project -> Settings -> Environment Variables) or by running, from your
own machine/terminal (values from your local `.env.local`):

```
vercel env add DATABASE_URL preview        # the Neon connection string from step 1
vercel env add UPSTASH_REDIS_REST_URL preview
vercel env add UPSTASH_REDIS_REST_TOKEN preview
vercel env add UPSTASH_QUEUE_NAME preview
vercel env add GEMINI_API_KEY preview
vercel env add GEMINI_FLASH_MODEL preview
vercel env add GEMINI_PRO_MODEL preview
vercel env add TWILIO_ACCOUNT_SID preview
vercel env add TWILIO_AUTH_TOKEN preview
vercel env add TWILIO_VOICE_NUMBER preview
vercel env add TWILIO_SMS_NUMBER preview
vercel env add TWILIO_WHATSAPP_NUMBER preview
vercel env add TWILIO_VALIDATE_SIGNATURE preview   # set to "true" (not "false" as in local dev)
vercel env add PHONE_HASH_SALT preview
vercel env add PUBLIC_BASE_URL preview             # set to the preview deployment's own URL once known
```

A `vercel deploy` run during this pass confirmed the build genuinely
needs `DATABASE_URL` to be set even to *build* successfully — one route
(`/api/debug/anonymization-sample`) is statically pre-rendered and
queries the DB at build time, so the preview build will keep failing
until step 1 + the `DATABASE_URL` var above are both in place.

## 6. Add `VERCEL_TOKEN` as a GitHub Actions secret (only if using the

   workflow fallback instead of native git integration)

1. Create a token at https://vercel.com/account/tokens.
2. In GitHub: repo -> Settings -> Secrets and variables -> Actions -> New
   repository secret -> name `VERCEL_TOKEN`, paste the token.
3. `.github/workflows/vercel-deploy.yml` (added by this pass) will then
   run preview deploys on PRs and production deploys on pushes to `main`
   automatically. **Be aware**: once this secret exists and the workflow
   file is on `main`, every future merge to `main` will automatically
   trigger a real production deploy with no further review step — only
   add the secret once you're ready for that.

## 7. First production deploy (D7) and Twilio webhook cutover (part of D6/D8)

Deliberately **not performed** by this deploy pass. Once steps 1-6 above
are complete and you're ready, this needs an explicit go-ahead in
conversation with the deploy agent before it:
  - runs `vercel deploy --prod` (or merges to `main` with the workflow/git
    integration active),
  - runs migrations against the production Neon database,
  - points any Twilio webhook URL (Voice/SMS/WhatsApp configuration in the
    Twilio console) at a production URL.
