import { auth } from "@/auth";
import { VisitForm } from "@/components/VisitForm";

export const dynamic = "force-dynamic";

export default async function LogVisitPage() {
  const session = await auth();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        记录探店
      </h1>
      <VisitForm currentUserId={session?.user?.id ?? null} />
    </div>
  );
}
