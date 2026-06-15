import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getVisitWithBeans } from "@/lib/queries";
import { VisitForm } from "@/components/VisitForm";

export const dynamic = "force-dynamic";

export default async function EditVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const visitId = Number(id);
  if (!Number.isInteger(visitId) || visitId <= 0) {
    notFound();
  }

  const visit = await getVisitWithBeans(visitId);
  if (!visit) {
    notFound();
  }

  // src/proxy.ts already gates /visits/[id]/edit behind login; this is defensive.
  const session = await auth();
  const userId = session?.user?.id;
  if (typeof userId !== "number") {
    redirect("/login");
  }
  // Non-owners get the same 404 as a missing visit — don't leak ownership.
  if (visit.user_id !== userId) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        编辑探店记录
      </h1>
      <VisitForm
        currentUserId={userId}
        initial={{
          id: visit.id,
          cafe_id: visit.cafe_id,
          visit_date: visit.visit_date,
          brew_method: visit.brew_method,
          bean_ids: visit.beans.map((b) => b.id),
          rating_overall: visit.rating_overall,
          rating_bean_quality: visit.rating_bean_quality,
          rating_barista_skill: visit.rating_barista_skill,
          rating_ambiance: visit.rating_ambiance,
          notes: visit.notes ?? "",
        }}
      />
    </div>
  );
}
