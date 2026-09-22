// Minimal subset of the built-in `vscode.git` extension's API surface,
// covering only what this extension uses. VS Code doesn't publish the
// full `microsoft/vscode` extensions/git/src/api/git.d.ts as an npm
// package, so callers vendor the pieces they need.
import type { Uri } from 'vscode';

export interface InputBox {
  value: string;
}

export interface RepositoryState {
  readonly HEAD: unknown;
}

export interface Repository {
  readonly rootUri: Uri;
  readonly inputBox: InputBox;
  readonly state: RepositoryState;
}

export interface API {
  readonly repositories: Repository[];
}

export interface GitExtension {
  readonly enabled: boolean;
  getAPI(version: 1): API;
}
