import { NextResponse } from "next/server";
import { contentTypeForKey, readLocalPhoto } from "@/lib/storage";

// Serves locally-stored photos (the no-R2 fallback). Keys are
// "<entityType>/<uuid>.<ext>" — anything else 404s, and readLocalPhoto
// resolves against the uploads dir to block path traversal.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const joined = key.join("/");
  if (key.some((part) => part === ".." || part === "" || part === ".")) {
    return NextResponse.json({ error: "未找到该文件" }, { status: 404 });
  }
  const contentType = contentTypeForKey(joined);
  const data = contentType ? await readLocalPhoto(joined) : null;
  if (!data || !contentType) {
    return NextResponse.json({ error: "未找到该文件" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      // Keys are content-addressed (uuid) — safe to cache forever.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
