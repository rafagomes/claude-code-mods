# claude-code-mods

Mods for [Claude Code](https://docs.anthropic.com/en/docs/claude-code): function-hook plugins that run inside the session and change what you see around the prompt. Each mod is its own plugin — install only the ones you want.

Requires Claude Code 2.1.275 or later.

| Mod | What it does |
|-----|--------------|
| [`english-coach`](english-coach) | Checks the grammar and fluency of every prompt you type and shows corrections in a band above the prompt |
| [`toolbar`](toolbar) | A **Toolbar** button under the prompt: model and effort picker, open in VS Code, and a clean view that replaces the work log with a step tracker |

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

Every prompt you type is checked for grammar *and* fluency — phrasing that is correct but not what a native speaker would say — by a parallel Haiku call, so the turn never waits. Corrections appear as colour-coded bullets (`[grammar]` / `[fluency]`, ~~original~~ → **improved**, reason) in a dismissable band above the prompt, plus a "Natural:" rewrite when a message has two or more issues. A bulleted copy goes to the transcript as history; the main model never sees it.

- **Sent:** up to 3,000 characters of each checked prompt, one Haiku request per prompt.
- **Skipped:** slash commands, `!` shell lines, pastes, code fences, and prompts under four words.

### toolbar

Adds a **Toolbar** button at the right of the hint row under the prompt (also `/toolbar`). It opens a card above the prompt to:

- pick the model, the 1M-context variant and the effort — applied with one `/model` and one `/effort` when the card closes;
- open the project root in VS Code (runs `open -a "Visual Studio Code"`, so macOS only);
- switch **clean view**.

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
