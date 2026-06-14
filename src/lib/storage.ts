import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Photo storage backend: Cloudflare R2 when all R2_* env vars are present
// (see docs/setup/r2-setup.md), otherwise local disk under data/uploads
// served by GET /api/uploads/[...key]. The DB stores only the storage key;
// URLs are computed at read time from the CURRENT backend — photos uploaded
// under one backend will 404 after switching to the other, so enable R2
// before uploading any production photos.

const R2_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

const setVars = R2_VARS.filter((name) => process.env[name]);
if (setVars.length > 0 && setVars.length < R2_VARS.length) {
  console.warn(
    `storage: R2 config incomplete — missing ${R2_VARS.filter(
      (name) => !process.env[name]
    ).join(", ")}. Falling back to local disk (uploads will fail on Vercel).`
  );
}

const r2Config =
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME &&
  process.env.R2_PUBLIC_URL
    ? {
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucket: process.env.R2_BUCKET_NAME,
        publicUrl: process.env.R2_PUBLIC_URL.replace(/\/$/, ""),
      }
    : null;

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isSupportedImageType(contentType: string): boolean {
  return contentType in EXTENSIONS;
}

export function contentTypeForKey(key: string): string | null {
  const ext = key.split(".").pop();
  const match = Object.entries(EXTENSIONS).find(([, e]) => e === ext);
  return match ? match[0] : null;
}

async function getS3Client() {
  if (!r2Config) throw new Error("R2 is not configured");
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  });
}

export async function savePhoto(
  data: Buffer,
  contentType: string,
  keyPrefix: string
): Promise<string> {
  const ext = EXTENSIONS[contentType];
  if (!ext) throw new Error(`unsupported content type: ${contentType}`);
  const key = `${keyPrefix}/${randomUUID()}.${ext}`;

  if (r2Config) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );
  } else {
    const filePath = path.join(UPLOAD_DIR, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }
  return key;
}

export async function deletePhotoObject(key: string): Promise<void> {
  if (r2Config) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3Client();
    await client.send(
      new DeleteObjectCommand({ Bucket: r2Config.bucket, Key: key })
    );
  } else {
    await unlink(path.join(UPLOAD_DIR, key)).catch(() => {});
  }
}

/** Read a locally-stored photo. Returns null when missing or key is unsafe. */
export async function readLocalPhoto(key: string): Promise<Buffer | null> {
  const filePath = path.resolve(UPLOAD_DIR, key);
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) return null;
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export function photoPublicUrl(key: string): string {
  if (r2Config) return `${r2Config.publicUrl}/${key}`;
  return `/api/uploads/${key}`;
}
