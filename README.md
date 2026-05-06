# ai-feed

Daily AI-frontier intelligence digest. Two layers:

1. **`fetch.py`** — pulls RSS/Atom + the HuggingFace daily-papers JSON API,
   dedupes against `seen.json`, appends raw items to `feeds/<date>.md`.
2. **`run-agent.sh`** — fires a headless Claude Code agent (`claude -p`) that
   refreshes the raw feeds, reads them, then writes an opinionated synthesis
   to `digest/<date>.md`. Claude is in the loop; this is the deliverable.

## Layout

```
ai-feed/
├── sources.txt          one feed per line: "Name | URL"
├── agent-task.md        the prompt fired into headless Claude
├── scripts/
│   ├── fetch.py         pure-stdlib RSS+Atom+JSON fetcher
│   └── run-agent.sh     cron entry point — wraps `claude -p`
├── feeds/               raw daily aggregations (input to the agent)
├── digest/              agent output: <date>.md + <date>.json (+ <date>.zh.json cache)
├── web/                 Next.js 14 portal (App Router, NextAuth, Tailwind)
├── nginx/ai-feed.conf   reverse-proxy snippet for the host nginx
├── docker-compose.yml   runs the web container, mounts digest/ into it
├── seen.json            dedup state (gitignored)
├── fetch.log            fetch.py run log (gitignored)
└── cron.log             crontab stdout/stderr capture (gitignored)
```

## Schedule

Installed in user crontab on this VM:

```
13 0,12 * * * /home/liharr/src/ai-feed/scripts/run-agent.sh >>/home/liharr/src/ai-feed/cron.log 2>&1
```

08:13 and 20:13 Asia/Shanghai (VM runs in UTC). Two passes/day catches both
overnight (US PM) and daytime (US AM) updates. Each run takes ~90s end-to-end
(fetch ~10s, agent ~80s).

`run-agent.sh` invokes `claude -p` with `--dangerously-skip-permissions`
(non-interactive — no human to confirm) and `--max-budget-usd 1` (hard cap
per run). Typical observed cost: well under $0.50/run.

## Reading the digest

The agent's synthesis is what you actually want — short, opinionated, ranked:

```
vim digest/$(date +%F).md
```

The raw aggregation is one level lower if you want to verify or look at
something the agent skipped:

```
vim feeds/$(date +%F).md
```

## Adding / removing sources

Edit `sources.txt`. Lines starting with `#` are ignored. Format: `Name | URL`.

To re-test after a change without waiting for cron:

```
python3 scripts/fetch.py
```

The script is tolerant — a single bad source logs `FAIL` and the others continue.

## Portal (`web/`)

A Next.js 14 dashboard that consumes `digest/<date>.json` and renders today's
synthesis behind GitHub OAuth. Live AI features (translate to Chinese, deeper
"AI explain" per item) call **Azure AI Foundry** — content production stays
with Claude (the agent); the live web bits use Foundry.

### Pages

- `/` — latest day's synthesis with EN ↔ 中文 toggle
- `/d/<date>` — historical day, prev/next links
- `/archive` — all digests, filterable by tag

### Bring it up

```bash
# 1. Fill in env (project root)
cp .env.example .env
# AUTH_SECRET=$(openssl rand -base64 32)
# AUTH_GITHUB_ID, AUTH_GITHUB_SECRET — from a GitHub OAuth App with
#   callback URL https://<your-host>/feed/api/auth/callback/github
#   (you can extend the existing ai-playground OAuth App with another callback URL)
# AZURE_AI_BASE_URL=https://<resource>.services.ai.azure.com/models
# AZURE_AI_API_KEY=<your-key>
# AZURE_AI_MODEL=gpt-4o-mini   # or any chat model deployed in your Foundry project

# 2. Build + run
docker compose build
docker compose up -d

# 3. Wire nginx (host)
sudo cp nginx/ai-feed.conf /etc/nginx/snippets/ai-feed.conf
# Edit /etc/nginx/sites-available/<your-personal-site>.conf and add:
#   include snippets/ai-feed.conf;
# inside the server block, alongside the existing vpn-monitor / ai-playground includes.
sudo nginx -t && sudo systemctl reload nginx

# 4. Smoke
curl -I https://<your-host>/feed/login   # → 200
```

### JSON contract

`digest/<date>.json` is the contract between the agent and the portal.
Schema lives in `web/src/types/digest.ts` (zod-validated on read).
Don't add fields without updating both sides.

## What's not here yet

- **Sources without RSS.** Anthropic, Meta AI, Mistral don't publish RSS.
  Covered indirectly by Smol AI News and HN. Direct scraping is intentionally
  deferred — not worth the maintenance cost yet.
- **Cross-day memory.** Agent only sees today's feeds. Passing last-N-days
  digests in the prompt for week-over-week context isn't worth the tokens yet.
- **Translation cache invalidation.** A second-run-of-the-day adds new
  developments; the cached `<date>.zh.json` doesn't auto-refresh. To force
  re-translate, delete the file and click 中文 again.

## Notes / quirks

- `seen.json` is capped at the most recent 5000 IDs to avoid unbounded growth.
- Each source is capped at 8 new items per run to bound the digest size when a
  long-dormant source suddenly returns.
- `User-Agent` is a Chrome string — some hosts (Substack, certain Cloudflare
  setups) refuse non-browser UAs. Substack's `importai` still 403s anyway.
