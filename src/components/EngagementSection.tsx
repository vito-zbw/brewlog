import type { ReactionSummary, SocialResourceType } from "@/types";
import { ReactionButton } from "./ReactionButton";
import { CommentsSection } from "./CommentsSection";

// Composes the 👍 reaction + flat comments for one social resource. Mounted on
// the visit / bean / crawl detail pages. Server pages pass the viewer's id
// (null when logged out) and the server-computed initial reaction summary.
export function EngagementSection({
  resourceType,
  resourceId,
  currentUserId,
  initialReaction,
}: {
  resourceType: SocialResourceType;
  resourceId: number;
  currentUserId: number | null;
  initialReaction: ReactionSummary;
}) {
  return (
    <div
      data-testid="engagement-section"
      className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6 mb-8 space-y-6"
    >
      <div className="flex items-center gap-3">
        <ReactionButton
          resourceType={resourceType}
          resourceId={resourceId}
          initialCount={initialReaction.count}
          initialReacted={initialReaction.reacted}
          canInteract={currentUserId != null}
        />
      </div>
      <CommentsSection
        resourceType={resourceType}
        resourceId={resourceId}
        currentUserId={currentUserId}
      />
    </div>
  );
}
