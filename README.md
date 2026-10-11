# claude-code-mods

Mods for [Claude Code](https://docs.anthropic.com/en/docs/claude-code): function-hook plugins that run inside the session and change what you see around the prompt. Each one installs separately — take only what you want.

Built and tested on Claude Code 2.1.296; mods need a version with function-hook plugins (2.1.275 or later). The status line is a plain script and only needs `jq`.

| Mod | What it does |
|-----|--------------|
| [`english-coach`](english-coach) | Checks the grammar and fluency of each prompt you write and shows corrections, plus a word or expression to learn, in a band above the prompt |
| [`toolbar`](toolbar) | A **Toolbar** button under the prompt: model and effort picker, open in VS Code, and a clean view that replaces the work log with a step tracker |
| [`statusline`](statusline) | A status line that shows where you are and what you are driving, and a rate-limit row only when a limit needs attention. A script, not a plugin — [install it by hand](statusline#install) |

## Install

In a session:

```
/plugin marketplace add rafagomes/claude-code-mods
/plugin install english-coach@claude-code-mods
/plugin install toolbar@claude-code-mods
```

Or from a shell:

```bash
claude plugin marketplace add rafagomes/claude-code-mods
claude plugin install english-coach@claude-code-mods
claude plugin install toolbar@claude-code-mods
```

Turn one off with `/plugin disable <mod>@claude-code-mods`; remove it with `claude plugin uninstall <mod>@claude-code-mods`. Plugins are installed per profile — set `CLAUDE_CONFIG_DIR` in front of the commands for each extra profile.

## What each mod sends, and where

Both mods make extra model requests on your account. Read this before installing.

### english-coach

Each prompt you write is checked for grammar *and* fluency — phrasing that is correct but not what a native speaker would say — by a parallel Haiku call, so the turn never waits. Corrections appear as colour-coded bullets (`[grammar]` / `[fluency]`, ~~original~~ → **improved**, reason) in a dismissable band above the prompt, plus a "Natural:" rewrite when a short message (under 300 characters) has two or more issues. The last line is a "Learn:" tip — one word, phrasal verb or idiom a native speaker would have used in that message, with its meaning — so the band also appears, with only that line, when there is nothing to correct. A bulleted copy is written to the transcript as a log entry for you, not as part of the conversation.

- **Checked:** prompts typed at the terminal or sent through Remote Control. Prompts from the SDK, background tasks, peers and schedules are not.
- **Sent:** your own words from the prompt — pasted blocks and fenced code are stripped first — capped at 3,000 characters, one Haiku request per prompt.
- **Skipped entirely:** slash commands, `!` shell lines, and prompts with fewer than four of your own words left after stripping.
- **Switched off and on:** `/english-coach off` stops the checks for the rest of the session and takes the band down; `/english-coach on` resumes them, and with no argument it toggles. Every session starts with it on. With the toolbar mod installed, the same switch is a row in its card.
- **Tuned for Portuguese speakers:** the coaching prompt describes the writer as a Brazilian software engineer and looks for literal translations and false friends from Portuguese. It works for anyone, but edit `SYSTEM` in `english-coach/hooks/register.tsx` to describe yourself.

### toolbar

Adds a **Toolbar** button at the right of the hint row under the prompt (also `/toolbar`). It opens a card above the prompt to:

- pick the model, the 1M-context variant and the effort — applied with one `/model` and one `/effort` when the card closes;
- open the project root in VS Code (runs `open -a "Visual Studio Code"`, so macOS only);
- switch **clean view**;
- switch the **English coach** on and off — a row drawn only when the english-coach mod is loaded, which runs its `/english-coach` command.

Clean view hides the work — tool rows, the spinner line, the turn-duration line, notifications of background tasks that completed — and shows a step tracker of the task list instead: a short heading, `Step N of M` with a progress bar, and one row per task. Of the model's text, only the answer to your last prompt stays drawn, plus the latest message of a turn a background task started.

- **Sent, only while clean view is on:** each prompt you send (typed at the terminal, or through Remote Control or the SDK; up to 4,000 characters) goes to Haiku once for the band's 3-to-6-word heading. A turn started by a background task, a peer or a schedule is never sent.
- **Added to the system prompt, only while clean view is on:** a short section telling the model that only its task list and final message are seen, and to keep both complete. The steps come from the model's own task tools.

## Development

```bash
claude plugin test english-coach     # run a mod's tests
claude plugin test toolbar
claude --plugin-dir toolbar          # try a mod without installing it
```

To type-check a mod, load it once (installed, or with `--plugin-dir`): the engine writes its types and a `tsconfig.json` into the mod folder (both gitignored). Then run `npx tsc -p <mod>`.

After editing a mod installed from a local clone (`claude plugin marketplace add /path/to/claude-code-mods`), `/reload-plugins` picks up the change.

## License

[MIT](LICENSE)
