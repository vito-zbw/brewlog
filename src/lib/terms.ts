// Predefined value lists (see CLAUDE.md). The database stores the canonical
// English `value`; the UI displays the bilingual `label` (Chinese first).
// Tasting tags are open-ended, so they are stored exactly as displayed.

export interface BilingualOption {
  value: string;
  label: string;
}

export const PROCESSING_METHODS: readonly BilingualOption[] = [
  { value: "Washed", label: "水洗 Washed" },
  { value: "Natural", label: "日晒 Natural" },
  { value: "Honey", label: "蜜处理 Honey" },
  { value: "Anaerobic", label: "厌氧发酵 Anaerobic" },
  { value: "Wet-hulled", label: "湿刨 Wet-hulled" },
  { value: "Other", label: "其他 Other" },
];

export const ROAST_LEVELS: readonly BilingualOption[] = [
  { value: "Light", label: "浅烘 Light" },
  { value: "Medium-Light", label: "中浅烘 Medium-Light" },
  { value: "Medium", label: "中烘 Medium" },
  { value: "Medium-Dark", label: "中深烘 Medium-Dark" },
  { value: "Dark", label: "深烘 Dark" },
];

export const BREW_METHODS: readonly BilingualOption[] = [
  { value: "Espresso", label: "意式浓缩 Espresso" },
  { value: "V60", label: "V60" },
  { value: "Chemex", label: "Chemex" },
  { value: "Aeropress", label: "爱乐压 Aeropress" },
  { value: "French Press", label: "法压壶 French Press" },
  { value: "Siphon", label: "虹吸壶 Siphon" },
  { value: "Cold Brew", label: "冷萃 Cold Brew" },
  { value: "Moka Pot", label: "摩卡壶 Moka Pot" },
  { value: "Auto Drip", label: "滴滤机 Auto Drip" },
  { value: "Other", label: "其他 Other" },
];

export const TASTING_TAGS: readonly string[] = [
  "果香 Fruity",
  "莓果 Berry",
  "柑橘 Citrus",
  "热带水果 Tropical",
  "核果 Stone Fruit",
  "巧克力 Chocolate",
  "坚果 Nutty",
  "焦糖 Caramel",
  "蜂蜜 Honey",
  "花香 Floral",
  "香料 Spicy",
  "泥土 Earthy",
  "木质 Woody",
  "草本 Herbal",
  "甜感 Sweet",
  "酒香 Winey",
  "烟熏 Smoky",
  "香草 Vanilla",
  "太妃 Toffee",
  "黄油 Butter",
];

// Notification event → the verb phrase shown after the actor's name, e.g.
// "Baiwei 关注了你" / "Baiwei 评论了你的探店记录". comment/reaction phrases are
// completed with the resource label below.
export const NOTIFICATION_EVENT_LABELS: Record<string, string> = {
  follow: "关注了你",
  follow_back: "回关了你",
  comment: "评论了你的",
  reaction: "赞了你的",
};

// Social resource type → its Chinese-first display noun.
export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  visit: "探店记录",
  bean: "咖啡豆",
  crawl: "咖啡之旅",
};

export function optionLabel(
  options: readonly BilingualOption[],
  value: string
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function formatVisitDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
