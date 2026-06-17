import type { VisitCursor } from "@/types";

// ── Generic keyset cursor ────────────────────────────────────────────────────
// A neutral { key, id } cursor for feeds ordered by (<some string column> DESC,
// id DESC) other than the visit timeline — e.g. notifications ordered by
// created_at. Kept separate from the visit-specific encode/decode above so the
// shipped /visits + /feed pagination is untouched (zero regression risk). Same
// TOTAL-decoder contract: malformed/tampered tokens yield null (= page one),
// never throw.

export interface KeysetCursor {
  key: string; // the last row's ordering value (e.g. created_at)
  id: number; // the last row's id (unique, monotonic tiebreaker)
}

interface KeysetPayload {
  k: string;
  i: number;
}

export function encodeKeysetCursor(cursor: KeysetCursor): string {
  const payload: KeysetPayload = { k: cursor.key, i: cursor.id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeKeysetCursor(
  token: string | null | undefined
): KeysetCursor | null {
  if (!token) return null;
  try {
    const json = Buffer.from(token, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as KeysetPayload).k !== "string" ||
      typeof (parsed as KeysetPayload).i !== "number" ||
      !Number.isInteger((parsed as KeysetPayload).i)
    ) {
      return null;
    }
    const { k, i } = parsed as KeysetPayload;
    return { key: k, id: i };
  } catch {
    return null;
  }
}

// Opaque keyset-pagination cursor tokens for visit lists.
//
// A cursor is the (visit_date, id) of the last row on a page. We serialize it
// to a short base64url token so the client can echo it back as `?cursor=…`
// without ever parsing or constructing it — the ordering key stays an
// implementation detail of the query layer. Used only server-side (the two API
// routes encode/decode; the feed server component encodes its seed cursor).
//
// `decodeCursor` is intentionally TOTAL: any malformed or tampered token yields
// null, which callers treat as "no cursor" (start from page one). It never
// throws, so a junk `?cursor=` can't 500 a route or create a 400-vs-200
// differential worth probing.

interface CursorPayload {
  d: string; // visit_date
  i: number; // id
}

export function encodeCursor(cursor: VisitCursor): string {
  const payload: CursorPayload = { d: cursor.visitDate, i: cursor.id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(token: string | null | undefined): VisitCursor | null {
  if (!token) return null;
  try {
    const json = Buffer.from(token, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as CursorPayload).d !== "string" ||
      typeof (parsed as CursorPayload).i !== "number" ||
      !Number.isInteger((parsed as CursorPayload).i)
    ) {
      return null;
    }
    const { d, i } = parsed as CursorPayload;
    return { visitDate: d, id: i };
  } catch {
    return null;
  }
}
