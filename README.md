# Commit Message AI

A personal VS Code extension that generates concise git commit messages from
your diff, using your existing Claude Code CLI subscription (no separate API
key needed).

## How it works

Click the sparkle icon next to the Source Control commit message box (or run
"Generate Commit Message (AI)" from the Command Palette). The extension:

1. Reads your staged diff (`git diff --cached`), falling back to all pending
   changes if nothing is staged.
2. Sends it to the `claude` CLI non-interactively (`claude -p`), with all
   tool access disabled — it's a pure text-in/text-out call, never touching
   your filesystem or running commands.
3. Writes the resulting commit message into the SCM input box.

## Requirements

- The [Claude Code CLI](https://claude.com/claude-code) installed and logged
  in (`claude` on your `PATH`, or set `commitMsgAI.claudePath` to its full
  path).
- VS Code's built-in Git extension enabled.

## Settings

| Setting                     | Default    | Description                                   |
| ---------------------------- | ---------- | ---------------------------------------------- |
| `commitMsgAI.claudePath`     | `"claude"` | Path to the Claude Code CLI binary            |
| `commitMsgAI.model`          | `"sonnet"` | Model alias passed to `claude --model`        |
| `commitMsgAI.maxDiffChars`   | `8000`     | Max diff characters sent to Claude            |
| `commitMsgAI.timeoutMs`      | `30000`    | Timeout for the Claude CLI call               |

## Development

```bash
npm install
```

Press `F5` in VS Code to launch an Extension Development Host with the
extension loaded. Edit files in `src/`; esbuild watches and rebuilds
automatically — reload the dev host window (`Cmd+R`) to pick up changes.

## Packaging for personal use

```bash
npm run package
```

Produces `commit-msg-ai-0.0.1.vsix`. Install it via the Extensions view →
"..." menu → "Install from VSIX...". This is not published to the
Marketplace.
