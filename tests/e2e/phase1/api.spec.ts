import { test, expect } from "../../helpers/fixtures";
import { SEED } from "../../helpers/seed";

interface BeanRow {
  id: number;
  name: string;
  origin_country: string;
  processing_method: string;
}

interface CafeRow {
  id: number;
  name: string;
  max_rating: number | null;
  last_visit_date: string | null;
  visit_count: number;
}

interface VisitRow {
  id: number;
  visit_date: string;
}

test.describe("Phase 1 API", () => {
  test("GET /api/beans returns the seeded bean catalog", async ({
    request,
  }) => {
    const res = await request.get("/api/beans");
    expect(res.status()).toBe(200);

    const body = (await res.json()) as { data: BeanRow[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(SEED.beanCount);

    const first = body.data[0];
    expect(typeof first.name).toBe("string");
    expect(typeof first.origin_country).toBe("string");
    expect(typeof first.processing_method).toBe("string");
  });

  test("GET /api/cafes returns cafés with visit stats", async ({
    request,
  }) => {
    const res = await request.get("/api/cafes");
    expect(res.status()).toBe(200);

    const body = (await res.json()) as { data: CafeRow[] };
    expect(body.data.length).toBeGreaterThanOrEqual(SEED.cafeCount);

    for (const cafe of body.data) {
      expect(cafe).toHaveProperty("max_rating");
      expect(cafe).toHaveProperty("last_visit_date");
      expect(cafe).toHaveProperty("visit_count");
    }

    const unvisited = body.data.find((c) => c.name === SEED.unvisitedCafe);
    expect(unvisited).toBeDefined();
    expect(unvisited?.max_rating).toBeNull();
    expect(unvisited?.visit_count).toBe(0);
  });

  test("GET /api/visits is newest-first and honors ?limit", async ({
    request,
  }) => {
    const res = await request.get("/api/visits");
    expect(res.status()).toBe(200);

    const body = (await res.json()) as { data: VisitRow[] };
    expect(body.data.length).toBeGreaterThanOrEqual(SEED.visitCount);

    // visit_date is ISO YYYY-MM-DD, so lexicographic comparison is valid.
    for (let i = 0; i < body.data.length - 1; i++) {
      expect(
        body.data[i].visit_date >= body.data[i + 1].visit_date
      ).toBe(true);
    }

    const limited = await request.get("/api/visits?limit=2");
    expect(limited.status()).toBe(200);
    const limitedBody = (await limited.json()) as { data: VisitRow[] };
    expect(limitedBody.data).toHaveLength(2);
  });

  test("GET /api/beans/[id] returns visits, 404 for unknown id", async ({
    request,
  }) => {
    const found = await request.get("/api/beans/1");
    expect(found.status()).toBe(200);
    const foundBody = (await found.json()) as {
      data: { id: number; visits: VisitRow[] };
    };
    expect(foundBody.data.id).toBe(1);
    expect(Array.isArray(foundBody.data.visits)).toBe(true);

    const missing = await request.get("/api/beans/999999");
    expect(missing.status()).toBe(404);
    const missingBody = (await missing.json()) as { error: string };
    expect(missingBody.error).toBe("未找到该咖啡豆");
  });

  test("POST /api/beans rejects an empty body with 400", async ({
    request,
  }) => {
    const res = await request.post("/api/beans", { data: {} });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("豆名、产地国家和记录人为必填项");
  });

  test("POST /api/beans creates a bean findable via ?search", async ({
    request,
  }) => {
    const beanName = `E2E瑰夏${Date.now()}`;
    const created = await request.post("/api/beans", {
      data: {
        name: beanName,
        origin_country: "Panama",
        created_by: "Baiwei",
        processing_method: "Washed",
        roast_level: "Light",
      },
    });
    expect(created.status()).toBe(201);
    const createdBody = (await created.json()) as { data: BeanRow };
    expect(typeof createdBody.data.id).toBe("number");
    expect(createdBody.data.name).toBe(beanName);

    const search = await request.get("/api/beans", {
      params: { search: beanName },
    });
    expect(search.status()).toBe(200);
    const searchBody = (await search.json()) as { data: BeanRow[] };
    expect(searchBody.data).toHaveLength(1);
    expect(searchBody.data[0].name).toBe(beanName);
  });
});
