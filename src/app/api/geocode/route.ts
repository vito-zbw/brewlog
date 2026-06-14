import { NextRequest, NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import type { GeocodeResult } from "@/types";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

// Nominatim's usage policy requires a descriptive User-Agent identifying the
// app + a contact. Override via env in deployment; this is a sane default.
const USER_AGENT =
  process.env.GEOCODE_USER_AGENT ??
  "BrewLog/1.0 (+https://github.com/brewlog/brewlog)";

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  country?: string;
}

interface NominatimPlace {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
}

function toResult(p: NominatimPlace): GeocodeResult | null {
  const latitude = parseFloat(p.lat ?? "");
  const longitude = parseFloat(p.lon ?? "");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const a = p.address ?? {};
  return {
    displayName: p.display_name ?? "",
    latitude,
    longitude,
    city: a.city ?? a.town ?? a.village ?? a.county ?? "",
    country: a.country ?? "",
  };
}

/**
 * Proxy to OpenStreetMap Nominatim so we can set the required User-Agent and
 * keep the key-less geocoder server-side. Two modes:
 *   forward: /api/geocode?q=<text>
 *   reverse: /api/geocode?lat=<n>&lon=<n>
 * Gated like the rest of the write surface — only the authed /log flow uses it.
 */
export async function GET(request: NextRequest) {
  try {
    await requireUserId();
    const sp = request.nextUrl.searchParams;
    const q = sp.get("q")?.trim();
    const lat = sp.get("lat");
    const lon = sp.get("lon");

    let url: string;
    if (q) {
      url =
        `${NOMINATIM_BASE}/search?format=json&addressdetails=1` +
        `&accept-language=zh&limit=5&q=${encodeURIComponent(q)}`;
    } else if (lat && lon) {
      url =
        `${NOMINATIM_BASE}/reverse?format=json&addressdetails=1` +
        `&accept-language=zh&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    } else {
      return NextResponse.json({ error: "缺少查询参数" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 429) {
      return NextResponse.json(
        { error: "搜索太频繁，请稍候再试" },
        { status: 429 }
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: "地址服务暂时不可用" },
        { status: 502 }
      );
    }

    // Forward search returns an array; reverse returns a single object (or an
    // { error } object when nothing matches). Normalize both to GeocodeResult[].
    const payload = (await res.json()) as NominatimPlace | NominatimPlace[];
    const places = Array.isArray(payload) ? payload : [payload];
    const data = places
      .map(toResult)
      .filter((r): r is GeocodeResult => r !== null);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/geocode failed:", err);
    return NextResponse.json({ error: "地址查询失败" }, { status: 500 });
  }
}
