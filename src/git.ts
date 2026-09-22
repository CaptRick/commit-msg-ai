import * as vscode from 'vscode';
import { execFile } from 'child_process';
import type { API as GitAPI, GitExtension, Repository } from './types/git';

export async function getGitApi(): Promise<GitAPI | undefined> {
  const ext = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!ext) return undefined;
  const gitExtension = ext.isActive ? ext.exports : await ext.activate();
  return gitExtension.getAPI(1);
}

/** Resolve the repository this action targets: use the SourceControl arg
 * passed by the scm/inputBox menu when present; otherwise fall back to the
 * sole open repository, or prompt via quick pick when there are several. */
export async function resolveRepository(
  gitApi: GitAPI,
  sourceControlArg?: vscode.SourceControl
): Promise<Repository | undefined> {
  if (gitApi.repositories.length === 0) return undefined;

  if (sourceControlArg?.rootUri) {
    const match = gitApi.repositories.find(
      (r) => r.rootUri.toString() === sourceControlArg.rootUri!.toString()
    );
    if (match) return match;
  }

  if (gitApi.repositories.length === 1) return gitApi.repositories[0];

  const pick = await vscode.window.showQuickPick(
    gitApi.repositories.map((r) => ({
      label: r.rootUri.fsPath,
      repo: r,
    })),
    { placeHolder: 'Select a repository to generate a commit message for' }
  );
  return pick?.repo;
}

function runGit(args: string[], cwd: string): Promise<{ stdout: string; failed: boolean }> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, maxBuffer: 20 * 1024 * 1024 }, (error, stdout) => {
      resolve({ stdout: stdout ?? '', failed: !!error });
    });
  });
}

export type DiffScope = 'staged' | 'all';

export interface DiffResult {
  diff: string;
  scope: DiffScope;
  empty: boolean;
}

/** Staged changes take priority; fall back to staged+unstaged vs HEAD;
 * if there is truly nothing (including the unborn-HEAD edge case), report empty. */
export async function getDiffForCommitMessage(repo: Repository): Promise<DiffResult> {
  const root = repo.rootUri.fsPath;

  const staged = await runGit(['diff', '--cached'], root);
  if (!staged.failed && staged.stdout.trim().length > 0) {
    return { diff: staged.stdout, scope: 'staged', empty: false };
  }

  // git diff HEAD fails on a brand-new repo with no commits yet (unborn HEAD);
  // fall back to unstaged-vs-index diff in that edge case.
  const all = await runGit(['diff', 'HEAD'], root);
  if (!all.failed && all.stdout.trim().length > 0) {
    return { diff: all.stdout, scope: 'all', empty: false };
  }

  const fallback = await runGit(['diff'], root);
  if (fallback.stdout.trim().length > 0) {
    return { diff: fallback.stdout, scope: 'all', empty: false };
  }

  return { diff: '', scope: 'all', empty: true };
}
