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
  created_by: string;
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
  created_by: string;
  created_at: string;
}

export interface Visit {
  id: number;
  cafe_id: number;
  visited_by: string;
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
  beans: Bean[];
}

export interface CafeWithStats extends Cafe {
  avg_rating: number | null;
  visit_count: number;
}

export interface BeanWithVisits extends Bean {
  visits: VisitWithDetails[];
}

export type BrewMethod =
  | "Espresso"
  | "V60"
  | "Chemex"
  | "Aeropress"
  | "Siphon"
  | "French Press"
  | "Cold Brew"
  | "Other";

export type ProcessingMethod =
  | "washed"
  | "natural"
  | "honey"
  | "anaerobic"
  | "unknown";

export type RoastLevel =
  | "light"
  | "medium-light"
  | "medium"
  | "medium-dark"
  | "dark";

export const BREW_METHODS: BrewMethod[] = [
  "Espresso",
  "V60",
  "Chemex",
  "Aeropress",
  "Siphon",
  "French Press",
  "Cold Brew",
  "Other",
];

export const PROCESSING_METHODS: ProcessingMethod[] = [
  "washed",
  "natural",
  "honey",
  "anaerobic",
  "unknown",
];

export const ROAST_LEVELS: RoastLevel[] = [
  "light",
  "medium-light",
  "medium",
  "medium-dark",
  "dark",
];

export const TEAM_MEMBERS = ["Baiwei", "Friend1", "Friend2"] as const;
export type TeamMember = (typeof TEAM_MEMBERS)[number];
