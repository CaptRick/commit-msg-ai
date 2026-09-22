import * as vscode from 'vscode';
import { getGitApi, resolveRepository, getDiffForCommitMessage } from './git';
import { SYSTEM_PROMPT, truncateDiff, buildUserPrompt } from './prompt';
import { runClaudeCli } from './claudeCli';

const output = vscode.window.createOutputChannel('Commit Message AI');

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('commitMsgAI.generate', (sourceControl?: vscode.SourceControl) =>
      generateCommitMessage(sourceControl)
    ),
    output
  );
}

async function generateCommitMessage(sourceControlArg?: vscode.SourceControl) {
  const gitApi = await getGitApi();
  if (!gitApi) {
    vscode.window.showErrorMessage('Commit Message AI: the built-in Git extension is not available.');
    return;
  }

  const repo = await resolveRepository(gitApi, sourceControlArg);
  if (!repo) {
    vscode.window.showErrorMessage('Commit Message AI: no git repository found.');
    return;
  }

  const { diff, scope, empty } = await getDiffForCommitMessage(repo);
  if (empty) {
    vscode.window.showInformationMessage('No changes to commit.');
    return;
  }

  const config = vscode.workspace.getConfiguration('commitMsgAI');
  const claudePath = config.get<string>('claudePath', 'claude');
  const model = config.get<string>('model', 'sonnet');
  const maxDiffChars = config.get<number>('maxDiffChars', 8000);
  const timeoutMs = config.get<number>('timeoutMs', 30000);

  const { text: diffText } = truncateDiff(diff, maxDiffChars);
  const userPrompt = buildUserPrompt(diffText, scope);

  try {
    const message = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.SourceControl, title: 'Generating commit message…' },
      () =>
        runClaudeCli(userPrompt, SYSTEM_PROMPT, {
          claudePath,
          model,
          timeoutMs,
          cwd: repo.rootUri.fsPath,
        })
    );

    repo.inputBox.value = message;
    vscode.window.setStatusBarMessage('$(sparkle) Commit message generated', 3000);
  } catch (err) {
    const e = err as NodeJS.ErrnoException & Error;
    output.appendLine(String(e.stack ?? e.message));

    if (e.code === 'ENOENT') {
      const choice = await vscode.window.showErrorMessage(
        `Commit Message AI: could not find the Claude CLI at "${claudePath}". Set "commitMsgAI.claudePath" to its full path (e.g. /Users/apple/.local/bin/claude).`,
        'Open Settings'
      );
      if (choice === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'commitMsgAI.claudePath');
      }
      return;
    }
    vscode.window.showErrorMessage(`Commit Message AI failed: ${e.message}`);
  }
}

export function deactivate() {}
