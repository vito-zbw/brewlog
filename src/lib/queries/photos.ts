import { db } from "@/lib/db";
import { photoPublicUrl } from "@/lib/storage";
import type { Photo, PhotoEntityType } from "@/types";
import { mapRows, firstRow, insertedId } from "./util";

type PhotoRow = Omit<Photo, "url">;

function withUrl(row: PhotoRow): Photo {
  return { ...row, url: photoPublicUrl(row.storage_key) };
}

export async function listPhotos(
  entityType: PhotoEntityType,
  entityId: number
): Promise<Photo[]> {
  const rs = await db.execute({
    sql: `SELECT * FROM photos WHERE entity_type = ? AND entity_id = ?
          ORDER BY created_at DESC, id DESC`,
    args: [entityType, entityId],
  });
  return mapRows<PhotoRow>(rs).map(withUrl);
}

export async function getPhoto(id: number): Promise<Photo | null> {
  const row = firstRow<PhotoRow>(
    await db.execute({ sql: "SELECT * FROM photos WHERE id = ?", args: [id] })
  );
  return row ? withUrl(row) : null;
}

export interface NewPhotoInput {
  entity_type: PhotoEntityType;
  entity_id: number;
  storage_key: string;
  content_type: string;
  caption?: string | null;
  user_id: number;
}

export async function createPhoto(input: NewPhotoInput): Promise<Photo> {
  const rs = await db.execute({
    sql: `INSERT INTO photos (entity_type, entity_id, storage_key, content_type, caption, user_id)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      input.entity_type,
      input.entity_id,
      input.storage_key,
      input.content_type,
      input.caption ?? null,
      input.user_id,
    ],
  });
  const photo = await getPhoto(insertedId(rs));
  if (!photo) throw new Error("failed to load created photo");
  return photo;
}

export async function deletePhoto(id: number): Promise<void> {
  await db.execute({ sql: "DELETE FROM photos WHERE id = ?", args: [id] });
}

const ENTITY_TABLES: Record<PhotoEntityType, string> = {
  bean: "beans",
  cafe: "cafes",
  visit: "visits",
};

export async function entityExists(
  entityType: PhotoEntityType,
  entityId: number
): Promise<boolean> {
  // Table name comes from a fixed map keyed by the validated entity type —
  // never from user input.
  const rs = await db.execute({
    sql: `SELECT 1 FROM ${ENTITY_TABLES[entityType]} WHERE id = ? LIMIT 1`,
    args: [entityId],
  });
  return rs.rows.length > 0;
}
