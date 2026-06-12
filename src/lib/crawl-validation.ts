function isPositiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Returns a Chinese error message, or null when the body is valid. */
export function validateCrawlBody(body: {
  title?: unknown;
  crawl_date?: unknown;
  visit_ids?: unknown;
}): string | null {
  if (typeof body.title !== "string" || !body.title.trim()) {
    return "标题为必填项";
  }
  if (typeof body.crawl_date !== "string" || !body.crawl_date) {
    return "日期为必填项";
  }
  if (
    !Array.isArray(body.visit_ids) ||
    body.visit_ids.length === 0 ||
    !body.visit_ids.every(isPositiveInteger)
  ) {
    return "请至少选择一条探店记录";
  }
  if (new Set(body.visit_ids).size !== body.visit_ids.length) {
    return "同一条探店记录只能选择一次";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.crawl_date)) {
    return "日期格式无效";
  }
  return null;
}
