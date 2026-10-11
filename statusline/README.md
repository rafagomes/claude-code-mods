# statusline

A status line for Claude Code that stays quiet until something needs a decision. It is a shell script, not a plugin — Claude Code reads the status line from your `settings.json`.

```
ai-workflow · main ✚2 · Opus 5 (1M) · high · ctx 69k/1M
5h ███████░  88% ↻ today 22:00 (39m)
```

| Row | Shows |
|---|---|
| **1 — identity** | Directory, git branch and uncommitted count, model, reasoning effort (plus `⚡` in fast mode and any non-default output style), and the context in absolute tokens |
| **2 — rate-limit alert** | A 5-hour or 7-day window, drawn only once it reaches 70% used, with a usage bar, the **local clock time the allowance resets**, and a countdown |

Only the uncommitted count and the context count move while you work, so row 1 can be read once and then ignored. Row 2 is absent until there is a decision to make.

## Install

Requires `jq`.

```bash
git clone https://github.com/rafagomes/claude-code-mods.git
ln -sf "$PWD/claude-code-mods/statusline/statusline-command.sh" ~/.claude/statusline-command.sh
```

Then add to `~/.claude/settings.json`:

```json
"statusLine": {
  "type": "command",
  "command": "bash \"${CLAUDE_CONFIG_DIR:-$HOME/.claude}/statusline-command.sh\"",
  "refreshInterval": 30
}
```

The `refreshInterval` keeps the reset countdown ticking while the session is idle; status lines are otherwise event-driven and the clock would freeze. For another profile, link the script into that profile's directory instead of `~/.claude`.

## Tuning

| Variable | Default | Effect |
|---|---|---|
| `CLAUDE_STATUSLINE_LIMIT_SHOW` | `70` | Percentage at which a rate-limit window is drawn. `0` always shows both windows |
| `CLAUDE_STATUSLINE_CTX_IDEAL` | `150000` | Context tokens past which the count turns amber |
| `NO_COLOR` | unset | Any value disables colour |

## Details

- **Colours.** Limit bars are green below 70%, amber from 70–89%, red at 90%+. The context count is graded on absolute tokens: amber past the ideal, red once auto-compact is close.
- **Unambiguous reset stamps.** `today 22:00` and `tomorrow 05:00` when the reset is that close, the full `Mon 10 Aug 05:00` otherwise — a bare weekday would be ambiguous for the 7-day window, which can land up to a week out.
- **No context bar or percentage.** On a 1M window the percentage stays in single digits for a whole session, so the token count carries the meaning and its colour says whether to act.
- **Cost appears only on API-key billing**, from `cost.total_cost_usd`. On a Claude.ai subscription the figure is notional and is not shown.
- **Width-adaptive** via `$COLUMNS` (needs Claude Code 2.1.153 or later): countdowns drop below 90 columns, limit bars below 70, the context window size below 80.
- **Treats its input as untrusted.** Directory and branch names are drawn on your terminal, so control characters and escape sequences are stripped, numeric fields must be integers before they reach shell arithmetic, and the git cache lives in a user-only directory (`${XDG_CACHE_HOME:-~/.cache}/claude-statusline`).
- **Portable and safe to fail.** Works on macOS and Linux, runs a single `jq` pass, caches `git status` for 3 seconds, and always exits 0 — a broken status line is worse than a plain one.
