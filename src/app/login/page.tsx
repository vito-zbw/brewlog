import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { devLoginEnabled } from "@/auth.config";
import { listUsers } from "@/lib/queries";
import { safeRedirectTarget } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

async function signInAction(
  provider: string,
  redirectTo: string,
  extra?: Record<string, string>
): Promise<void> {
  try {
    await signIn(provider, { redirectTo, ...(extra ?? {}) });
  } catch (err) {
    // signIn throws a framework redirect on success — only AuthError means
    // the sign-in itself failed.
    if (err instanceof AuthError) {
      redirect(`/login?error=auth&callbackUrl=${encodeURIComponent(redirectTo)}`);
    }
    throw err;
  }
}

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream text-espresso placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-sage";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safeRedirectTarget(callbackUrl);

  // Only sessions with a usable user id leave the login page — an id-less
  // session (pre-Phase-3 token) must be able to sign in again here.
  const session = await auth();
  if (typeof session?.user?.id === "number") {
    redirect(redirectTo);
  }

  const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID);
  const hasGitHub = Boolean(process.env.AUTH_GITHUB_ID);
  const users = devLoginEnabled ? await listUsers() : [];

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-8">
        <div className="text-center mb-8">
          <p className="text-5xl mb-4">☕</p>
          <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso">
            登录 BrewLog
          </h1>
          <p className="text-warm-gray mt-2">记录你的精品咖啡探店之旅</p>
        </div>

        {error && (
          <div
            data-testid="login-error"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            登录失败，请检查邮箱和密码后重试。
          </div>
        )}

        {/* Email + password — always available */}
        <form
          action={async (formData: FormData) => {
            "use server";
            await signInAction("password", redirectTo, {
              email: String(formData.get("email") ?? ""),
              password: String(formData.get("password") ?? ""),
            });
          }}
          className="space-y-3"
        >
          <input
            type="email"
            name="email"
            data-testid="login-email"
            placeholder="邮箱"
            autoComplete="email"
            className={inputClass}
          />
          <input
            type="password"
            name="password"
            data-testid="login-password"
            placeholder="密码"
            autoComplete="current-password"
            className={inputClass}
          />
          <button
            type="submit"
            data-testid="login-credentials"
            className="w-full px-4 py-3 rounded-xl bg-espresso hover:bg-espresso/90 text-cream font-medium transition-colors shadow-sm"
          >
            使用邮箱登录
          </button>
        </form>

        <p className="text-center text-sm text-warm-gray mt-4">
          还没有账号？
          <a
            href={`/register?callbackUrl=${encodeURIComponent(redirectTo)}`}
            data-testid="register-link"
            className="text-sage hover:underline font-medium"
          >
            立即注册
          </a>
        </p>

        {(hasGoogle || hasGitHub) && (
          <>
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 border-t border-cream-dark" />
              <p className="text-xs text-warm-gray">或</p>
              <div className="flex-1 border-t border-cream-dark" />
            </div>
            <div className="space-y-3">
              {hasGoogle && (
                <form
                  action={async () => {
                    "use server";
                    await signInAction("google", redirectTo);
                  }}
                >
                  <button
                    type="submit"
                    data-testid="login-google"
                    className="w-full px-4 py-3 rounded-xl border border-cream-dark text-espresso font-medium hover:bg-cream transition-colors"
                  >
                    使用 Google 登录
                  </button>
                </form>
              )}

              {hasGitHub && (
                <form
                  action={async () => {
                    "use server";
                    await signInAction("github", redirectTo);
                  }}
                >
                  <button
                    type="submit"
                    data-testid="login-github"
                    className="w-full px-4 py-3 rounded-xl border border-cream-dark text-espresso font-medium hover:bg-cream transition-colors"
                  >
                    使用 GitHub 登录
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {devLoginEnabled && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t border-cream-dark" />
              <p className="text-xs text-warm-gray">开发模式快速登录</p>
              <div className="flex-1 border-t border-cream-dark" />
            </div>
            <div className="space-y-3">
              {users.map((user) => (
                <form
                  key={user.id}
                  action={async () => {
                    "use server";
                    await signInAction("dev-login", redirectTo, {
                      name: user.name,
                    });
                  }}
                >
                  <button
                    type="submit"
                    data-testid={`dev-login-${user.name}`}
                    className="w-full px-4 py-3 rounded-xl bg-sage hover:bg-sage-light text-cream font-medium transition-colors shadow-sm"
                  >
                    {user.name}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
