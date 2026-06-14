const MIN_LENGTH = 2;
const MAX_LENGTH = 24;

/** Returns a Chinese error message, or null when the trimmed name is valid. */
export function validateUsername(name: unknown): string | null {
  if (typeof name !== "string") return "用户名格式无效";
  const trimmed = name.trim();
  if (trimmed.length === 0) return "请输入用户名";
  if (trimmed.length < MIN_LENGTH) return `用户名至少需要 ${MIN_LENGTH} 个字符`;
  if (trimmed.length > MAX_LENGTH) return `用户名不能超过 ${MAX_LENGTH} 个字符`;
  // Reject control characters (incl. tabs/newlines) without a control-char
  // regex (which would trip ESLint's no-control-regex rule).
  for (const ch of trimmed) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return "用户名不能包含特殊字符";
  }
  return null;
}
