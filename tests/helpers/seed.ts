// Constants derived from seed.sql — the single place to update when the
// seed data changes. Mutation specs must create uniquely-named records and
// never modify seed rows, so these stay valid for the whole run.
export const SEED = {
  beanCount: 8,
  cafeCount: 7,
  visitCount: 9,
  knownBeanSearch: "Yirgacheffe",
  knownBeanName: "耶加雪菲科契尔 Yirgacheffe Kochere",
  knownCafe: ".jpg coffee",
  unvisitedCafe: "Something For Café",
  newestVisitCafe: "Seesaw Coffee 太古汇店",
  newestVisitDate: "2026-05-28",
} as const;
