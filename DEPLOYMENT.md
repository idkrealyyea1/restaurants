# 🚀 Step-by-step Deployment Guide — Wasmer Edge

This guide takes you from **zero** to a **live restaurant ordering platform** on the internet.

You do not need to understand everything. Just follow the steps in order, copy-paste the commands, and replace anything written like `<LIKE_THIS>` with your own values.

---

## What you will set up

```
Your customers  ──▶  Wasmer Edge (the app, https://something.wasmer.app)
                              │
                              ▼
                     Neon (managed PostgreSQL database, in the cloud)
```

| Piece | What it is | Cost to start |
|---|---|---|
| **Wasmer Edge** | Runs the app on the internet | Free tier |
| **Neon** | Hosts the database (PostgreSQL) | Free tier |
| **Wasmer account** | Your login for deploying | Free |

### Before you start, you need

- [ ] A computer with internet (this one is fine — deploying only uploads files, nothing heavy runs here)
- [ ] Node.js 20+ installed (`node --version` should print `v20...` or higher)
- [ ] A terminal (Terminal app on Mac/Linux; on Windows use WSL or Git Bash)

---

# Part A — Create the database (Neon)

The app needs a remote PostgreSQL database. We'll use Neon because it's free and takes ~3 minutes.

1. Go to **https://neon.tech** and click **Sign Up** (use Google/GitHub — easiest).
2. Click **Create project** (or "New Project").
   - Name: `restaurants`
   - Postgres version: leave the default
   - Region: pick the one closest to your restaurants' customers
3. After it's created, Neon shows a **connection string**. It looks like this:

   ```
   postgresql://user:password@ep-cool-name-123456-pooler.region.aws.neon.db/neondb?sslmode=require
   ```

4. Copy that string and save it somewhere private (notepad). This is your `<DATABASE_URL>`.

> 💡 Use the connection string that says **"pooled"** if Neon offers a choice. It handles more connections.
>
> ⚠️ Never share this string. Anyone who has it can read your whole database.

---

# Part B — Install the Wasmer CLI and create an account

### B1. Install the CLI

Mac or Linux (including WSL):

```bash
curl https://get.wasmer.io -sSfL | sh
```

Close and reopen your terminal afterwards, then check it worked:

```bash
wasmer --version
```

(Windows without WSL: get the installer from https://docs.wasmer.io/install)

### B2. Create your account

Go to **https://wasmer.io/signup** and sign up (Google/GitHub works).

### B3. Log in from the terminal

```bash
wasmer login
```

It prints a link and opens your browser → click **Approve / Confirm**.
When the terminal says you're logged in, continue.

---

# Part C — First deploy

> The first deploy creates your app on Wasmer. It will run *unhealthy* for a few minutes because we haven't given it the database password yet — that's expected, we fix it in Part D.

Open a terminal **in this project folder**, then:

```bash
cd Desktop/restaurants     # adjust if your folder lives elsewhere
npm install                # downloads dependencies (~1 minute)
wasmer deploy
```

`wasmer deploy` will ask a few questions. Safe answers:

| Prompt | Answer |
|---|---|
| Publish package `restaurants-platform`? | **yes** |
| Bump version? | **yes** |
| App owner | press Enter (your username) |
| App name | press Enter (`restaurants-platform`) |

When it finishes it prints your live URL:

```
✅ App deployed!
https://restaurants-platform-<your-username>.wasmer.app
```

📌 **Write that URL down.** Call it `<YOUR_APP_URL>`.

If it asks anything else unusual, see the [Troubleshooting](#troubleshooting) section at the bottom.

---

# Part D — Give the app its secrets

The app must never keep passwords in its code. Instead we register them as **secrets** on Wasmer. Secrets only take effect on the *next* deployment — that's why we deploy again right after this part.

### D1. Create a session secret

This protects logins. Generate a long random value:

```bash
openssl rand -base64 48
```

(If `openssl` isn't available: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`)

Copy the output. This is your `<SESSION_SECRET>`.

### D2. Register both secrets

Run these two commands (stay inside the project folder so Wasmer knows which app you mean):

```bash
wasmer app secrets create DATABASE_URL "postgresql://user:password@ep-cool-name-123456-pooler.region.aws.neon.db/neondb?sslmode=require"
```

```bash
wasmer app secrets create SESSION_SECRET "the-long-random-string-you-generated"
```

Replace the parts in quotes with **your** values from Part A and step D1. Keep the quotes.

### D3. Deploy again so the secrets go live

```bash
wasmer deploy
```

(Accept the version bump again with yes.)

---

# Part E — Prepare the database and create your owner account

Now we create the tables inside Neon and your platform-owner login. These commands are lightweight — they just send instructions over the internet to Neon — so it's safe to run them from here.

Still in the project folder:

```bash
npm run migrate
```

But wait — migrate reads `DATABASE_URL` from the environment, so run it like this instead (one line):

**Mac/Linux:**

```bash
DATABASE_URL="postgresql://user:password@ep-cool-name-123456-pooler.region.aws.neon.db/neondb?sslmode=require" npm run migrate
```

**Windows PowerShell:**

```powershell
$env:DATABASE_URL="postgresql://...same string..."; npm run migrate
```

You should see `apply 001_init.sql` then `Migrations up to date.` ✅

Now create your owner (boss) account:

```bash
DATABASE_URL="postgresql://...same string..." SUPER_ADMIN_USERNAME=owner SUPER_ADMIN_PASSWORD="pick-a-password-at-least-10-chars" npm run seed:admin
```

Choose a strong password — this account controls every restaurant on your platform.

> 🔐 After running this, consider clearing your terminal history or at least don't screenshot it.

---

# Part F — Verify everything works

1. Open **`<YOUR_APP_URL>/api/healthz`** in a browser → you should see `{"ok":true}`.
2. Open **`<YOUR_APP_URL>/login.html`** and log in with the owner username/password from Part E.
3. In the owner dashboard:
   - Click **New restaurant** → give it a name (e.g. "Burger House"), set max menu items (e.g. 30), fill the admin username + password → **Create restaurant**
   - Save the generated admin password if one was auto-generated (shown only once!)
4. Log out → log back in as the **restaurant admin** you just created.
5. Add categories and menu items in the **Menu** tab.
6. Open **Share & QR** tab → open the public page → add items to cart → place an order as a test customer.
7. Back in the dashboard → **Orders** tab → you should see the order appear (live!).

🎉 Congratulations — your SaaS is live.

---

# Part G — Final touches

### G1. Point QR codes at your real URL (important!)

Edit `app.yaml` in the project folder and uncomment/set:

```yaml
env:
  NODE_ENV: production
  TRUST_PROXY: "1"
  APP_URL: "https://restaurants-platform-<your-username>.wasmer.app"
```

Then redeploy:

```bash
wasmer deploy
```

Without this, QR codes would encode the wrong address.

### G2. Custom domain (optional)

In https://wasmer.io → open your app → **Settings → Domains** → add your domain (e.g. `order.yourrestaurantbrand.com`) and follow its DNS instructions. Then update `APP_URL` again and redeploy.

### G3. Know the current limitations

- **Uploaded images are stored temporarily.** Wasmer apps are stateless — uploaded logos/photos can disappear when the app redeploys or restarts. For production use, image storage should be moved to a cloud bucket (planned improvement — ask me to wire it up).
- **Scale-to-zero**: Wasmer puts idle apps to sleep; they wake automatically on the next visitor (first request may take a couple of seconds).
- Live order notifications use one server instance; fine for starting out.

---

# Updating the app later

Made changes to the code? Just:

```bash
wasmer deploy
```

That's it. Old versions stay available for instant rollback in the Wasmer dashboard (App → Versions).

Database changes later = add a new file in `database/migrations/` (e.g. `002_....sql`), then run the same `DATABASE_URL=... npm run migrate` command once.

---

# Troubleshooting

| Problem | Fix |
|---|---|
| **App shows error page / 503 after Part C** | Normal until Part D is done. Still broken after D3? Open your app in the wasmer.io dashboard → check **Logs**. Usually a typo in `DATABASE_URL`. |
| `password authentication failed` during migrate/seeds | Wrong Neon password inside the connection string. Re-copy it from the Neon dashboard. |
| `self signed certificate ... ssl` | Make sure the URL ends with `?sslmode=require`. |
| Migrate says `ENOTFOUND` / `getaddrinfo` | The host part of the connection string is wrong or you have no internet. |
| `wasmer deploy` complains about the manifest | Delete `wasmer.toml` from the folder and run `wasmer deploy` again — Wasmer can auto-detect Express apps from `package.json`. |
| Deployed but `/api/healthz` returns nothing | Wait ~30 seconds (cold start) and refresh. |
| Login doesn't stick after refreshing | Confirm secret name is exactly `SESSION_SECRET` and you redeployed afterwards. |
| Forgot owner password | Run the Part E seed again with a new `SUPER_ADMIN_PASSWORD` using a **new username**, or ask me to add a reset flow. |

---

# Quick reference — what lives where

| Thing | Where |
|---|---|
| App config (non-secret env vars) | `app.yaml` in this repo |
| Package info | `wasmer.toml` in this repo |
| Secrets | Wasmer dashboard → your app → Settings → Secrets |
| Database data | Neon dashboard |
| App logs | Wasmer dashboard → your app → Logs |
| Official docs | https://docs.wasmer.io/edge |

---

*Last verified against Wasmer docs: August 2026.*
