import { BREW_METHODS } from "@/lib/terms";

function isValidRating(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/**
 * Shared body validation for creating and updating a visit (mirror of
 * crawl-validation.ts). Returns a Chinese error message, or null when valid.
 */
export function validateVisitBody(body: {
  cafe_id?: unknown;
  visit_date?: unknown;
  brew_method?: unknown;
  rating_overall?: unknown;
  rating_bean_quality?: unknown;
  rating_barista_skill?: unknown;
  rating_ambiance?: unknown;
  bean_ids?: unknown;
}): string | null {
  if (
    !body.cafe_id ||
    !body.visit_date ||
    !body.brew_method ||
    !body.rating_overall ||
    !body.rating_bean_quality ||
    !body.rating_barista_skill ||
    !body.rating_ambiance
  ) {
    return "请填写所有必填项";
  }
  if (!isPositiveInteger(Number(body.cafe_id))) {
    return "咖啡馆参数无效";
  }
  if (
    typeof body.visit_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.visit_date)
  ) {
    return "日期格式无效";
  }
  if (
    !isValidRating(body.rating_overall) ||
    !isValidRating(body.rating_bean_quality) ||
    !isValidRating(body.rating_barista_skill) ||
    !isValidRating(body.rating_ambiance)
  ) {
    return "评分需为 1-5 的整数";
  }
  if (
    body.bean_ids != null &&
    (!Array.isArray(body.bean_ids) || !body.bean_ids.every(isPositiveInteger))
  ) {
    return "咖啡豆参数无效";
  }
  if (!BREW_METHODS.some((o) => o.value === body.brew_method)) {
    return "冲煮方式无效";
  }
  return null;
}
