import { PROCESSING_METHODS, ROAST_LEVELS } from "@/lib/terms";

/**
 * Shared body validation for creating and updating a bean (mirror of
 * visit-validation.ts). Returns a Chinese error message, or null when valid.
 * Only `name` and `origin_country` are required; the enum-like fields are
 * validated against the canonical lists when present.
 */
export function validateBeanBody(body: {
  name?: unknown;
  origin_country?: unknown;
  processing_method?: unknown;
  roast_level?: unknown;
}): string | null {
  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.origin_country !== "string" ||
    !body.origin_country.trim()
  ) {
    return "豆名和产地国家为必填项";
  }
  if (
    (body.processing_method != null &&
      !PROCESSING_METHODS.some((o) => o.value === body.processing_method)) ||
    (body.roast_level != null &&
      !ROAST_LEVELS.some((o) => o.value === body.roast_level))
  ) {
    return "处理法或烘焙度无效";
  }
  return null;
}
