/** Soft hint only — never blocks setting the password. */
export function passwordStrengthHint(password: string): string | null {
  const issues: string[] = [];
  if (password.length < 8) issues.push("shorter than 8 characters");
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  if (classes < 2) issues.push("only one character type");
  if (!issues.length) return null;
  return `This password looks weak (${issues.join(", ")}).`;
}
