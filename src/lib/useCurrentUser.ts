"use client";

import { useSyncExternalStore } from "react";
import { TEAM_MEMBERS, type TeamMember } from "@/lib/terms";

// Phase 1-2 identity: a name picked from the fixed list, remembered in
// localStorage. Replaced by real sessions in Phase 3. localStorage is an
// external store, so useSyncExternalStore keeps every consumer (dashboard
// select, log form) in sync; the custom event covers same-tab updates,
// which the native "storage" event does not fire for.
const STORAGE_KEY = "brewlog.user";
const CHANGE_EVENT = "brewlog:user-change";

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): TeamMember {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved && (TEAM_MEMBERS as readonly string[]).includes(saved)
    ? (saved as TeamMember)
    : TEAM_MEMBERS[0];
}

function getServerSnapshot(): TeamMember {
  return TEAM_MEMBERS[0];
}

export function useCurrentUser(): [TeamMember, (user: TeamMember) => void] {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setUser = (next: TeamMember) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [user, setUser];
}
