export const SYSTEM_PROMPT = `You are a git commit message generator. You will be given a git diff. Output ONLY the commit message text - no preamble, no explanation, no markdown code fences, and no surrounding quotes.

Rules:
- First line: a concise conventional-commit-style subject line (max ~72 chars), formatted as "<type>(<optional scope>): <summary>" where type is one of feat, fix, refactor, docs, style, test, chore, perf, build, ci.
- If the change is small or single-purpose, output ONLY the subject line.
- If the diff spans multiple files or concerns, add one blank line after the subject followed by up to 3 short bullet points ("- ...") summarizing the key changes. Never exceed 3 bullets.
- Be concise, not exhaustive. Do not restate every changed line or list every file name.
- Never wrap the output in markdown code fences or quotes.
- Output nothing but the commit message itself.`;

export function truncateDiff(diff: string, maxChars: number): { text: string; truncated: boolean } {
  if (diff.length <= maxChars) return { text: diff, truncated: false };
  const omitted = diff.length - maxChars;
  return {
    text: `${diff.slice(0, maxChars)}\n... [diff truncated, ${omitted} more characters omitted] ...`,
    truncated: true,
  };
}

export function buildUserPrompt(diffText: string, scope: 'staged' | 'all'): string {
  const label =
    scope === 'staged'
      ? 'the staged changes (git diff --cached)'
      : 'all pending changes, staged and unstaged (git diff HEAD)';
  return `Generate a commit message for ${label}.\n\n\`\`\`diff\n${diffText}\n\`\`\``;
}
