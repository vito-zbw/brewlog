-- BrewLog Seed Data
-- 以广州为中心的精品咖啡示例数据（另含深圳、京都各一两家），用于开发环境。
-- Apply after schema.sql: `npm run db:seed` (local) or `turso db shell brewlog < seed.sql` (cloud).
--
-- 评分刻意分散，使地图同时出现绿（最高分>=4）、黄（=3）、红（<=2）、灰（无探店）四种图钉。

-- ============================================================
-- USERS（占位邮箱 — 接入真实 OAuth 前请改为真实邮箱，
-- 邮箱是 OAuth 登录与已有账号关联的唯一依据）
-- ============================================================

INSERT INTO users (email, name) VALUES
('baiwei@example.com', 'Baiwei'),
('friend1@example.com', 'Friend1'),
('friend2@example.com', 'Friend2');


-- ============================================================
-- BEANS（豆名与烘焙商保留原文，处理法/烘焙度存储英文规范值）
-- ============================================================

INSERT INTO beans (name, origin_country, origin_region, farm, roaster, processing_method, roast_level, tasting_notes_tags, tasting_notes_freetext, user_id) VALUES
('云南保山铁皮卡 Yunnan Baoshan Typica', 'China', '云南保山', '新寨庄园', 'Torch Coffee Lab', 'Washed', 'Medium-Light', '焦糖 Caramel,坚果 Nutty,甜感 Sweet', '国产精品豆的惊喜之作。焦糖甜感突出，坚果尾韵干净，几乎没有传统云南豆的土腥味。手冲和奶咖都合适。', 1),

('Seesaw 云南日晒 Yunnan Natural', 'China', '云南普洱', '孟连天宇庄园', 'Seesaw Coffee', 'Natural', 'Medium-Light', '莓果 Berry,酒香 Winey,甜感 Sweet', '日晒处理带来明显的发酵酒香，莓果调性活泼。Seesaw 对云南豆的烘焙把握得很好，甜感饱满。', 2),

('耶加雪菲科契尔 Yirgacheffe Kochere', 'Ethiopia', 'Yirgacheffe', 'Kochere washing station', '鱼眼咖啡 Fisheye Coffee', 'Washed', 'Light', '花香 Floral,柑橘 Citrus,蜂蜜 Honey', '经典水洗耶加。茉莉花香扑鼻，柑橘酸质明亮干净，蜂蜜般的甜尾韵很长。鱼眼的浅烘处理得非常透亮。', 1),

('Esmeralda Gesha 瑰夏', 'Panama', 'Boquete', 'Hacienda La Esmeralda', 'Torch Coffee Lab', 'Washed', 'Light', '花香 Floral,热带水果 Tropical,蜂蜜 Honey', '传奇庄园的瑰夏。香气复杂到难以描述——白花、荔枝、佛手柑层层展开。贵但值得一试的豆子。', 3),

('肯尼亚 AA Kirinyaga', 'Kenya', 'Kirinyaga', 'Kiunyu factory', 'Seesaw Coffee', 'Washed', 'Light', '莓果 Berry,柑橘 Citrus,甜感 Sweet', '典型肯尼亚风味：黑加仑般的莓果酸质，明亮多汁。冰镇后酸甜感更突出，做冰手冲一流。', 2),

('哥伦比亚 El Paraiso 厌氧', 'Colombia', 'Cauca', 'Finca El Paraiso', '.jpg coffee', 'Anaerobic', 'Medium-Light', '酒香 Winey,热带水果 Tropical,香料 Spicy', '双重厌氧发酵的网红豆。荔枝和酒酿的香气非常张扬，口感像气泡酒一样跳跃。喜恶分明的一支豆。', 3),

('巴西塞拉多日晒 Brazil Cerrado', 'Brazil', 'Cerrado Mineiro', 'Fazenda Sertão', 'Manner Coffee', 'Natural', 'Medium', '巧克力 Chocolate,坚果 Nutty,焦糖 Caramel', '扎实的日常意式拼配基底。牛奶巧克力和花生酱的香气，低酸厚实，做奶咖完全不会被牛奶压住。', 1),

('苏门答腊曼特宁 Mandheling', 'Indonesia', 'Sumatra', 'Lintong region', '鱼眼咖啡 Fisheye Coffee', 'Wet-hulled', 'Medium-Dark', '泥土 Earthy,木质 Woody,香料 Spicy', '湿刨法带来标志性的低酸醇厚。草本、雪松木和一点烟草气息，深烘后回甘明显。法压壶的好搭档。', 2);


-- ============================================================
-- CAFES（坐标为大致位置；城市/国家用中文）
-- ============================================================

INSERT INTO cafes (name, city, country, latitude, longitude, website, user_id) VALUES
('.jpg coffee', '广州', '中国', 23.0945, 113.2820, NULL, 1),
('鱼眼咖啡 Fisheye Café', '广州', '中国', 23.1330, 113.3220, 'https://www.fisheyecafe.com', 2),
('Seesaw Coffee 太古汇店', '广州', '中国', 23.1336, 113.3262, 'https://www.seesawcoffee.com', 3),
('Manner Coffee 天环广场店', '广州', '中国', 23.1320, 113.3240, 'https://www.mannercoffee.com', 1),
('%Arabica 深业上城店', '深圳', '中国', 22.5530, 114.0930, 'https://arabica.coffee', 2),
('Something For Café', '深圳', '中国', 22.5400, 113.9850, NULL, 3),
('Kurasu Kyoto', '京都', '日本', 35.0035, 135.7590, 'https://kurasu.kyoto', 1);


-- ============================================================
-- VISITS（评分分布：.jpg/鱼眼/%Arabica/Kurasu→绿，Seesaw→黄，Manner→红，Something For→灰）
-- ============================================================

INSERT INTO visits (cafe_id, user_id, visit_date, brew_method, rating_overall, rating_bean_quality, rating_barista_skill, rating_ambiance, notes) VALUES
-- 探店 1：.jpg coffee — 江南西的宝藏小店
(1, 1, '2026-03-14', 'V60', 5, 5, 5, 4, '江南西巷子里的神仙小店。点了耶加雪菲的 V60，咖啡师注水稳得像机器，茉莉花香在第一口就炸开。店面很小要排队，但完全值得。'),

-- 探店 2：鱼眼咖啡 — 老牌精品
(2, 1, '2026-03-21', 'V60', 4, 5, 4, 3, '鱼眼老牌出品，自家烘焙的耶加雪菲很稳。出品干净利落，就是周末人太多，座位紧张。豆子可以直接买半磅带走。'),

-- 探店 3：.jpg coffee — 二刷试意式
(1, 3, '2026-04-18', 'Espresso', 4, 4, 4, 4, '二刷 .jpg，这次试了巴西豆的浓缩。油脂厚实，巧克力调性突出，不酸不涩。店员还送了小块手工饼干，好感度拉满。'),

-- 探店 4：Seesaw 太古汇 — 中规中矩
(3, 2, '2026-04-02', 'Cold Brew', 3, 3, 3, 4, '太古汇逛街顺路来的。云南日晒冷萃风味还行，酒香有出来，但出品速度慢，更像连锁店标准化产品。环境倒是宽敞舒服。'),

-- 探店 5：Manner 天环 — 翻车体验
(4, 2, '2026-04-25', 'Espresso', 2, 2, 3, 2, '高峰期来的，浓缩萃取明显过快，酸涩寡淡。档口店没有座位，站在商场过道里喝完。便宜是真便宜，但这杯不行。'),

-- 探店 6：%Arabica 深业上城 — 设计感拉满
(5, 3, '2026-05-01', 'Espresso', 4, 4, 4, 5, '深圳周末一日游打卡。纯白极简空间确实出片，拿铁拉花很稳。曼特宁做底的浓缩偏深烘风格，配奶完美。人多但翻台快。'),

-- 探店 7：Kurasu Kyoto — 京都朝圣
(7, 1, '2026-02-10', 'V60', 5, 5, 5, 5, '京都之行的高光时刻。手冲吧台的仪式感无可挑剔，肯尼亚 AA 的黑加仑酸质透亮得发光。日式极简美学和咖啡专注度的完美结合。'),

-- 探店 8：鱼眼咖啡 — 爱乐压尝鲜
(2, 2, '2026-05-20', 'Aeropress', 4, 4, 3, 4, '点了哥伦比亚厌氧的爱乐压。发酵酒香很冲，像在喝荔枝酒，又试了一次确认不是错觉。咖啡师说这支豆争议很大，我站喜欢这边。'),

-- 探店 9：Seesaw 太古汇 — 滴滤机日常
(3, 1, '2026-05-28', 'Auto Drip', 3, 4, 2, 3, '赶时间点了批量滴滤的云南铁皮卡。豆子本身不错，焦糖甜感在，但放久了温度偏低，风味闷住了。当工作日续命水还可以。');


-- ============================================================
-- VISIT_BEANS（探店 ↔ 咖啡豆 关联；探店 1 关联两支豆，演示多豆记录）
-- ============================================================

INSERT INTO visit_beans (visit_id, bean_id) VALUES
(1, 3),   -- .jpg → 耶加雪菲
(1, 6),   -- .jpg → 哥伦比亚厌氧（同行朋友点的）
(2, 3),   -- 鱼眼 → 耶加雪菲
(3, 7),   -- .jpg 二刷 → 巴西塞拉多
(4, 2),   -- Seesaw → Seesaw 云南日晒
(5, 7),   -- Manner → 巴西塞拉多
(6, 8),   -- %Arabica → 曼特宁
(7, 5),   -- Kurasu → 肯尼亚 AA
(8, 6),   -- 鱼眼 → 哥伦比亚厌氧
(9, 1);   -- Seesaw → 云南保山铁皮卡
