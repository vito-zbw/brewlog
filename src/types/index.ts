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
  website: string | null;
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

export interface CafeWithStats extends Cafe {
  max_rating: number | null;
  last_visit_date: string | null;
  brew_methods: string | null;
  visit_count: number;
}

export interface BeanWithVisits extends Bean {
  visits: VisitWithDetails[];
}

export type PhotoEntityType = "bean" | "cafe" | "visit";

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

export interface NewCafeInput {
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  website?: string | null;
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
