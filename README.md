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
├── digest/              Claude's synthesis (the actual deliverable)
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

## What's not here yet

- **Web view.** No frontend — read the markdown directly. Could later add a
  Next.js page (basePath `/feed`) under the same nginx + GitHub OAuth pattern
  as `ai-playground` and `vpn-monitor`.
- **Sources without RSS.** Anthropic, Meta AI, Mistral don't publish RSS.
  These get covered indirectly by Smol AI News and HN. Direct scraping
  is intentionally deferred — not worth the maintenance cost yet.
- **Cross-day memory.** Agent only sees today's feeds, not yesterday's.
  Could pass last-N-days digests in the prompt for week-over-week context;
  not yet worth the token cost.

## Notes / quirks

- `seen.json` is capped at the most recent 5000 IDs to avoid unbounded growth.
- Each source is capped at 8 new items per run to bound the digest size when a
  long-dormant source suddenly returns.
- `User-Agent` is a Chrome string — some hosts (Substack, certain Cloudflare
  setups) refuse non-browser UAs. Substack's `importai` still 403s anyway.
