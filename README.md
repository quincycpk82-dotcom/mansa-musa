# Mansa Musa — Pocket AI Wealth Strategist

Installs to your phone like a native app. Autonomous opportunity hunter + on-demand strategist for Captain Phillip Kirkland.

## What it is

A PWA (Progressive Web App) — loads in the browser, installs to your home screen, runs full-screen with no browser chrome. Looks and feels native. Free to host. HTTPS-secured.

## Architecture

```
Your iPhone/Android ←── PWA ──→ Vercel
                                  ↓
                        Supabase Edge Functions
                        ├── mansa-musa  (chat)
                        ├── mansa-scout (cron 3x/day)
                        └── mansa-notify (cron 7am daily)
                                  ↓
                        Anthropic Claude 4.5
                        + Web Search, Reddit, HN APIs
                        + Resend (email digest)
```

## One-command deploy

```bash
cd mansa-musa
./deploy.sh
```

Handles GitHub repo creation, Supabase function deployment, and Vercel push. Prompts you through the interactive parts. Requires `gh`, `vercel`, and `supabase` CLIs logged in.

## Or — manual, in 4 parts

### 1. Check into GitHub (30 seconds)

```bash
cd mansa-musa
git init -b main
git add .
git commit -m "Initial commit: Mansa Musa"
gh repo create mansa-musa --private --source=. --push
```

Done. It's on GitHub.

### 2. Supabase — database + functions (5 minutes)

```bash
# Link + migrate
supabase login
supabase link --project-ref YOUR_REF
# Open Supabase SQL editor → paste & run: supabase/migrations/001_mansa_schema.sql

# Secrets
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-xxx
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set MANSA_FROM_EMAIL=mansa@yourdomain.com
supabase secrets set CAPTAIN_EMAIL=your@email.com
supabase secrets set CAPTAIN_USER_ID=your-uuid

# Deploy all 3 functions
supabase functions deploy mansa-musa --no-verify-jwt
supabase functions deploy mansa-scout --no-verify-jwt
supabase functions deploy mansa-notify --no-verify-jwt

# Enable pg_cron + pg_net in Supabase Dashboard → Database → Extensions
# Then paste supabase/cron.sql into SQL editor (replace PROJECT_REF + SERVICE_ROLE_KEY)
```

### 3. Vercel — ship the frontend (2 minutes)

```bash
vercel
# Follow prompts → link to your GitHub repo
# Then in Vercel dashboard → Project Settings → Environment Variables, add:
#   VITE_MANSA_ENDPOINT = https://YOUR_REF.supabase.co/functions/v1/mansa-musa
#   VITE_SCOUT_ENDPOINT = https://YOUR_REF.supabase.co/functions/v1/mansa-scout
#   VITE_SUPABASE_URL   = https://YOUR_REF.supabase.co
#   VITE_SUPABASE_ANON_KEY = eyJ...

vercel --prod
```

You'll get a URL like `https://mansa-musa-kirkland.vercel.app`.

### 4. Install on your phone (30 seconds)

**iPhone (Safari):**
1. Open the Vercel URL
2. Tap the Share button (square with arrow)
3. Scroll → "Add to Home Screen"
4. Done. Mansa Musa is now a home screen app.

**Android (Chrome):**
1. Open the URL
2. Tap the three-dot menu
3. "Install app" or "Add to Home screen"
4. Done.

The app launches full-screen with no browser chrome. Splash screen uses the gold M emblem. Feels native.

## What happens after install

- Morning email brief at 7 AM ET with new opportunities scored 7+
- Red badge on app icon (well — in-app badge; real push requires additional setup)
- Tap the app → land in the Audience (chat) tab
- Swipe to Intel tab → see scored leads with "Consult Emperor" buttons
- Deck tab → quick-fire prompts + portfolio at a glance

## Security note for pocket mode

Right now the edge functions are open (`--no-verify-jwt`) and the frontend has no auth. Since the app is behind an unguessable Vercel URL and only you have the link, this is fine for solo pocket use. If you want to tighten:

```javascript
// In src/App.jsx — add a simple PIN gate before the main app
const [unlocked, setUnlocked] = useState(localStorage.getItem("mm_unlocked") === "1");
// ... gate the render with a 4-digit PIN input checked against import.meta.env.VITE_PIN
```

For stronger auth, add full Supabase Auth and drop `--no-verify-jwt` on the functions.

## Cost

| Item | Monthly |
|------|---------|
| Vercel hobby | $0 |
| Supabase free tier | $0 |
| Resend (100/day free) | $0 |
| Claude API (chat + 3 scouts/day) | ~$10-15 |
| GitHub private repo | $0 |
| **Total** | **~$10-15** |

## Future upgrades (in order of impact)

1. **Real push notifications** — add `web-push` lib + VAPID keys, SW listens for pushes from the notify function. No more waiting for email.
2. **Interests editor UI** — swap out SQL seeding for an in-app screen to tune what Mansa hunts for.
3. **Slack webhook for 9+ leads** — urgent intel pings your Slack instantly.
4. **Lead → calendar automation** — mark a lead "acted_on" and it creates a calendar event for the next step.
5. **Siri Shortcuts** — run "Hey Siri, brief me" and get a spoken summary.
6. **Voice input** — iOS natively supports dictation in textareas; essentially free.

## File map

```
mansa-musa/
├── README.md
├── deploy.sh                       ← one-shot helper
├── vercel.json
├── package.json
├── vite.config.js
├── index.html                      ← PWA meta + SW registration
├── .env.example
├── .gitignore
├── public/
│   ├── manifest.json               ← PWA manifest
│   ├── sw.js                       ← service worker
│   ├── icon-192.png                ← gold M emblem
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   └── favicon.png
├── src/
│   ├── main.jsx
│   ├── App.jsx                     ← mobile-first 3-tab shell
│   └── components/
│       └── IntelFeed.jsx
└── supabase/
    ├── cron.sql                    ← pg_cron schedules
    ├── migrations/
    │   └── 001_mansa_schema.sql
    └── functions/
        ├── _shared/anthropic.ts
        ├── mansa-musa/index.ts     ← chat
        ├── mansa-scout/index.ts    ← autonomous hunter
        └── mansa-notify/index.ts   ← email digest
```

— Ship it, Captain. Your pocket strategist awaits.
