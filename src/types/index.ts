export interface User {
  id: number;
  email: string;
  name: string;
  image: string | null;
  created_at: string;
}

export interface Bean {
  id: number;
  name: string;
  origin_country: string;
  origin_region: string | null;
  farm: string | null;
  roaster: string | null;
  processing_method: string;
  roast_level: string;
  tasting_notes_tags: string | null;
  tasting_notes_freetext: string | null;
  user_id: number;
  created_at: string;
}

export interface Cafe {
  id: number;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  user_id: number;
  created_at: string;
}

/** Normalized geocoding hit returned by GET /api/geocode (Nominatim proxy). */
export interface GeocodeResult {
  displayName: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

export interface Visit {
  id: number;
  cafe_id: number;
  user_id: number;
  visit_date: string;
  brew_method: string;
  rating_overall: number;
  rating_bean_quality: number;
  rating_barista_skill: number;
  rating_ambiance: number;
  notes: string | null;
  created_at: string;
}

export interface VisitBean {
  visit_id: number;
  bean_id: number;
}

export interface VisitWithDetails extends Visit {
  cafe_name: string;
  cafe_city: string;
  user_name: string;
  beans: Bean[];
}

/**
 * Keyset-pagination cursor for visit lists: the (visit_date, id) of the last
 * row on a page. Lists order by `visit_date DESC, id DESC`, so the next page is
 * everything strictly "older" than this pair. `id` is the unique, monotonic
 * tiebreaker that makes the ordering total (visit_date alone has same-day ties).
 */
export interface VisitCursor {
  visitDate: string; // the last row's visit_date (ISO YYYY-MM-DD)
  id: number; // the last row's id
}

/** One page of visits plus the cursor to fetch the next page (null at the end). */
export interface VisitsPage {
  visits: VisitWithDetails[];
  nextCursor: VisitCursor | null;
}

export interface CafeWithStats extends Cafe {
  max_rating: number | null;
  last_visit_date: string | null;
  brew_methods: string | null;
  visit_count: number;
}

export interface BeanWithVisits extends Bean {
  visits: VisitWithDetails[];
}

// Photos attach only to beans and visits. A café has no photos of its own —
// photos taken at a café belong to a visit there. (The schema's CHECK historically
// also allowed 'cafe'; that capability was removed, see schema.sql.)
export type PhotoEntityType = "bean" | "visit";

export interface Photo {
  id: number;
  entity_type: PhotoEntityType;
  entity_id: number;
  storage_key: string;
  content_type: string;
  caption: string | null;
  user_id: number;
  created_at: string;
  /** Public URL computed from storage_key by the query layer. */
  url: string;
}

export interface OriginStat {
  origin_country: string;
  avg_rating: number;
  visit_count: number;
}

export interface BrewStat {
  brew_method: string;
  count: number;
}

export interface UserStats {
  total_beans_tried: number;
  total_cafes_visited: number;
  total_visits: number;
  top_origins: OriginStat[];
  brew_breakdown: BrewStat[];
}

export interface Crawl {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  crawl_date: string;
  created_at: string;
}

export interface CrawlSummary extends Crawl {
  user_name: string;
  stop_count: number;
}

export interface CrawlWithStops extends Crawl {
  user_name: string;
  /** The crawl's visits, in stop order. */
  stops: VisitWithDetails[];
}

export interface NewCrawlInput {
  user_id: number;
  title: string;
  description?: string | null;
  crawl_date: string;
  visit_ids: number[];
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FollowUser {
  id: number;
  name: string;
  image: string | null;
  isMutual: boolean; // does the reverse follow relationship also exist?
}

export interface LeaderboardEntry {
  user_id: number;
  user_name: string;
  user_image: string | null;
  value: number;
}

export interface CafeCommunityStats {
  visit_count: number;
  avg_overall: number | null;
  avg_bean_quality: number | null;
  avg_barista_skill: number | null;
  avg_ambiance: number | null;
}

export interface NewBeanInput {
  name: string;
  origin_country: string;
  origin_region?: string | null;
  farm?: string | null;
  roaster?: string | null;
  processing_method?: string;
  roast_level?: string;
  tasting_notes_tags?: string | null;
  tasting_notes_freetext?: string | null;
  user_id: number;
}

/** Fields editable on an existing bean (ownership/user_id never changes). */
export type UpdateBeanInput = Omit<NewBeanInput, "user_id">;

export interface NewCafeInput {
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  user_id: number;
}

export interface NewVisitInput {
  cafe_id: number;
  user_id: number;
  visit_date: string;
  brew_method: string;
  rating_overall: number;
  rating_bean_quality: number;
  rating_barista_skill: number;
  rating_ambiance: number;
  notes?: string | null;
  bean_ids?: number[];
}

/** Fields editable on an existing visit (ownership/user_id never changes). */
export type UpdateVisitInput = Omit<NewVisitInput, "user_id">;

// ── Phase 6: Engagement & Reach ──────────────────────────────────────────────

/**
 * The social objects that comments, reactions, and notifications attach to.
 * Polymorphic by (resource_type, resource_id) — no cross-table FK (libsql can't
 * enforce one); the table is resolved from a fixed map keyed by this validated
 * enum (see src/lib/queries/social-entities.ts), never from request input.
 */
export type SocialResourceType = "visit" | "bean" | "crawl";

export interface Comment {
  id: number;
  resource_type: SocialResourceType;
  resource_id: number;
  user_id: number;
  body: string;
  created_at: string;
}

/** A comment joined with its author, for display. */
export interface CommentView extends Comment {
  user_name: string;
  user_image: string | null;
}

/** Aggregate 👍 state for one resource (+ whether the viewer reacted). */
export interface ReactionSummary {
  count: number;
  reacted: boolean;
}

export type NotificationEventType =
  | "follow"
  | "follow_back"
  | "comment"
  | "reaction";

export interface Notification {
  id: number;
  user_id: number; // recipient
  event_type: NotificationEventType;
  actor_id: number; // who triggered it
  resource_type: SocialResourceType | null; // null for follow / follow_back
  resource_id: number | null;
  read_at: string | null; // null = unread
  created_at: string;
}

/** A notification joined with its actor, for display. */
export interface NotificationView extends Notification {
  actor_name: string;
  actor_image: string | null;
}

/**
 * Keyset cursor for the notifications feed: the (created_at, id) of the last
 * row on a page. Mirrors VisitCursor's role for notifications (ordered by
 * created_at DESC, id DESC). Serialized via encodeKeysetCursor in src/lib/cursor.ts.
 */
export interface NotificationCursor {
  createdAt: string;
  id: number;
}

export interface NotificationsPage {
  notifications: NotificationView[];
  nextCursor: NotificationCursor | null;
}

/** A user's self-service data export (visits + beans they own). */
export interface UserExport {
  exportedAt: string;
  user: { id: number; name: string };
  visits: VisitWithDetails[];
  beans: Bean[];
}
