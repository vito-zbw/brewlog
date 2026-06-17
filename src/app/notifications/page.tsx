import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getNotifications, markAllRead } from "@/lib/queries";
import { encodeKeysetCursor } from "@/lib/cursor";
import { NotificationsList } from "@/components/NotificationsList";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (typeof session?.user?.id !== "number") redirect("/login");
  const userId = session.user.id;

  // Fetch page one FIRST (so the rendered list still shows which were unread),
  // THEN mark all read so the nav badge clears on the next render / poll.
  const page = await getNotifications(userId, null);
  await markAllRead(userId);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        通知
      </h1>
      <NotificationsList
        initial={{
          notifications: page.notifications,
          nextCursor: page.nextCursor
            ? encodeKeysetCursor({
                key: page.nextCursor.createdAt,
                id: page.nextCursor.id,
              })
            : null,
        }}
      />
    </div>
  );
}
