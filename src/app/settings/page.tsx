import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { formatVisitDate } from "@/lib/terms";
import { UsernameForm } from "@/components/UsernameForm";
import { AvatarUpload } from "@/components/AvatarUpload";

export const dynamic = "force-dynamic";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  password: "邮箱密码 Email",
  "dev-login": "开发登录 Dev",
};

const cardClass =
  "bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6";
const headingClass =
  "font-[Playfair_Display] font-semibold text-espresso mb-4";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/settings");
  }
  const session = await auth();
  const provider = session?.user?.provider;
  const providerLabel = provider
    ? (PROVIDER_LABELS[provider] ?? provider)
    : "未知 Unknown";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl font-bold font-[Playfair_Display] text-espresso">
        账号设置
      </h1>

      <section className={cardClass}>
        <h2 className={headingClass}>头像 Avatar</h2>
        <AvatarUpload
          userId={user.id}
          currentImage={user.image}
          name={user.name}
        />
      </section>

      <section className={cardClass}>
        <h2 className={headingClass}>用户名 Display name</h2>
        <UsernameForm userId={user.id} currentName={user.name} />
      </section>

      <section className={cardClass} data-testid="account-info">
        <h2 className={headingClass}>账号信息 Account</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-warm-gray">邮箱 Email</dt>
            <dd className="text-espresso">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-warm-gray">登录方式 Sign-in</dt>
            <dd className="text-espresso" data-testid="account-provider">
              {providerLabel}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-warm-gray">加入于 Joined</dt>
            <dd className="text-espresso">{formatVisitDate(user.created_at)}</dd>
          </div>
        </dl>
      </section>

      <section className={cardClass} data-testid="data-export">
        <h2 className={headingClass}>导出我的数据 Export</h2>
        <p className="text-sm text-warm-gray mb-4">
          下载你的探店记录与咖啡豆数据，随时备份。
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/api/users/${user.id}/export?format=json`}
            download
            data-testid="export-json"
            className="px-4 py-2 rounded-lg border border-cream-dark text-sm text-espresso hover:bg-cream transition-colors"
          >
            下载 JSON
          </a>
          <a
            href={`/api/users/${user.id}/export?format=csv`}
            download
            data-testid="export-csv"
            className="px-4 py-2 rounded-lg border border-cream-dark text-sm text-espresso hover:bg-cream transition-colors"
          >
            下载 CSV（探店记录）
          </a>
        </div>
      </section>
    </div>
  );
}
