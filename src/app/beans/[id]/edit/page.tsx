import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getBean } from "@/lib/queries";
import { BeanEditForm } from "@/components/BeanEditForm";

export const dynamic = "force-dynamic";

export default async function EditBeanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const beanId = Number(id);
  if (!Number.isInteger(beanId) || beanId <= 0) {
    notFound();
  }

  const bean = await getBean(beanId);
  if (!bean) {
    notFound();
  }

  // src/proxy.ts already gates /beans/[id]/edit behind login; this is defensive.
  const session = await auth();
  const userId = session?.user?.id;
  if (typeof userId !== "number") {
    redirect("/login");
  }
  // Non-owners get the same 404 as a missing bean — don't leak ownership.
  if (bean.user_id !== userId) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href={`/beans/${bean.id}`}
        className="text-terracotta hover:underline text-sm mb-4 inline-block"
      >
        &larr; 返回咖啡豆
      </Link>
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        编辑咖啡豆
      </h1>
      <BeanEditForm bean={bean} />
    </div>
  );
}
