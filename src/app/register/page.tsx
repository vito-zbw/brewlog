import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { createPasswordUser, isNameTaken } from "@/lib/queries";
import { hashPassword } from "@/lib/password";
import { safeRedirectTarget } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "请填写所有字段。",
  email: "请输入有效的邮箱地址。",
  weak: "密码至少需要 8 个字符。",
  mismatch: "两次输入的密码不一致。",
  exists: "该邮箱已被注册，请直接登录或更换邮箱。",
  nametaken: "该昵称已被使用，请更换。",
  auth: "注册成功，但自动登录失败，请前往登录页登录。",
};

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream text-espresso placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-sage";

async function registerAction(formData: FormData): Promise<void> {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const redirectTo = safeRedirectTarget(String(formData.get("redirectTo") ?? ""));
  const fail = (code: string): never =>
    redirect(
      `/register?error=${code}&callbackUrl=${encodeURIComponent(redirectTo)}`
    );

  // Server-side validation is the security boundary; messages surface inline
  // via ?error= (no alerts, per the project's form conventions).
  if (!name || !email || !password || !confirm) fail("missing");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("email");
  if (password.length < 8) fail("weak");
  if (password !== confirm) fail("mismatch");
  if (await isNameTaken(name, 0)) fail("nametaken");

  // Returns null when the email already exists — registration NEVER sets a
  // password on a pre-existing account (that would be an account takeover).
  let id: number | null;
  try {
    id = await createPasswordUser(email, name, hashPassword(password));
  } catch (err) {
    // Lost the name race after the isNameTaken check — the unique index fired.
    if (err instanceof Error && /UNIQUE/i.test(err.message)) fail("nametaken");
    throw err;
  }
  if (id === null) fail("exists");

  try {
    await signIn("password", { email, password, redirectTo });
  } catch (err) {
    // signIn throws a framework redirect on success — re-throw it. Only an
    // AuthError means the auto-login failed.
    if (err instanceof AuthError) fail("auth");
    throw err;
  }
}

interface RegisterPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safeRedirectTarget(callbackUrl);

  const session = await auth();
  if (typeof session?.user?.id === "number") {
    redirect(redirectTo);
  }

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-8">
        <div className="text-center mb-8">
          <p className="text-5xl mb-4">☕</p>
          <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso">
            注册 BrewLog
          </h1>
          <p className="text-warm-gray mt-2">创建账号，开始记录你的咖啡之旅</p>
        </div>

        {error && (
          <div
            data-testid="register-error"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {ERROR_MESSAGES[error] ?? "注册失败，请重试。"}
          </div>
        )}

        <form action={registerAction} className="space-y-3">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input
            type="text"
            name="name"
            data-testid="register-name"
            placeholder="昵称"
            aria-label="昵称"
            autoComplete="nickname"
            className={inputClass}
          />
          <input
            type="email"
            name="email"
            data-testid="register-email"
            placeholder="邮箱"
            aria-label="邮箱"
            autoComplete="email"
            className={inputClass}
          />
          <input
            type="password"
            name="password"
            data-testid="register-password"
            placeholder="密码（至少 8 位）"
            aria-label="密码"
            autoComplete="new-password"
            className={inputClass}
          />
          <input
            type="password"
            name="confirm"
            data-testid="register-confirm"
            placeholder="确认密码"
            aria-label="确认密码"
            autoComplete="new-password"
            className={inputClass}
          />
          <button
            type="submit"
            data-testid="register-submit"
            className="w-full px-4 py-3 rounded-xl bg-espresso hover:bg-espresso/90 text-cream font-medium transition-colors shadow-sm"
          >
            注册
          </button>
        </form>

        <p className="text-center text-sm text-warm-gray mt-4">
          已有账号？
          <a
            href={`/login?callbackUrl=${encodeURIComponent(redirectTo)}`}
            data-testid="login-link"
            className="text-sage hover:underline font-medium"
          >
            返回登录
          </a>
        </p>
      </div>
    </div>
  );
}
