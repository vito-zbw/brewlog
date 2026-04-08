-- BrewLog Seed Data
-- Realistic mock data for development. Features real-ish specialty coffee beans
-- and café locations in and around Singapore.
-- Run after schema.sql to populate the database.

-- ============================================================
-- BEANS
-- ============================================================

INSERT INTO beans (name, origin_country, origin_region, farm, roaster, processing_method, roast_level, tasting_notes_tags, tasting_notes_freetext, created_by) VALUES
('Yirgacheffe Kochere', 'Ethiopia', 'Yirgacheffe', 'Kochere washing station', 'Nylon Coffee Roasters', 'washed', 'light', 'blueberry,jasmine,bergamot,lemon zest', 'Incredibly floral and tea-like. The blueberry note is unmistakable — hits you on the first sip and lingers. Very clean finish.', 'Baiwei'),

('Gesha Village Lot 86', 'Ethiopia', 'Bench Maji', 'Gesha Village Estate', 'Common Man Coffee Roasters', 'natural', 'light', 'tropical fruit,peach,rose,honey', 'Competition-grade Gesha. Explosively fruity — stone fruit sweetness with a delicate rose-like floral note. Syrupy body for a light roast.', 'Friend1'),

('Finca El Injerto Bourbon', 'Guatemala', 'Huehuetenango', 'Finca El Injerto', 'Apartment Coffee', 'washed', 'medium-light', 'milk chocolate,caramel,orange,hazelnut', 'Classic Central American profile. Clean, sweet, balanced. The chocolate note is rich without being heavy. Great as espresso.', 'Friend2'),

('Kiunyu AA', 'Kenya', 'Kirinyaga', 'Kiunyu factory', 'PPP Coffee', 'washed', 'light', 'blackcurrant,grapefruit,brown sugar,tomato', 'Juicy and complex. That classic Kenyan blackcurrant acidity — bright but not sharp. Brown sugar sweetness rounds it out.', 'Baiwei'),

('Finca Hartmann Maragogype', 'Panama', 'Chiriquí', 'Finca Hartmann', 'Nylon Coffee Roasters', 'honey', 'medium', 'mango,vanilla,almond,toffee', 'Honey-processed Maragogype (a mutation of Typica with unusually large beans). Smooth and sweet — the mango note is vivid. Exceptional V60 brew.', 'Friend1'),

('Sidama Bensa Bombe', 'Ethiopia', 'Sidama', 'Bombe washing station', 'Tiong Hoe Specialty Coffee', 'natural', 'light', 'strawberry,wine,dark chocolate,cinnamon', 'Natural processed Sidama with intense strawberry jam sweetness. Winey fermentation character that is polarising but we love it. Hints of cinnamon spice in the finish.', 'Friend2'),

('La Palma y El Tucán Sidra', 'Colombia', 'Cundinamarca', 'La Palma y El Tucán', 'Common Man Coffee Roasters', 'anaerobic', 'medium-light', 'lychee,champagne,white grape,passionfruit', 'Anaerobic fermentation makes this wild. Effervescent, almost sparkling mouthfeel. Lychee and passionfruit dominate. Unique and memorable.', 'Baiwei'),

('Brazil Fazenda Santa Ines', 'Brazil', 'Minas Gerais', 'Fazenda Santa Ines', 'Apartment Coffee', 'natural', 'medium', 'peanut,dark chocolate,dried fig,molasses', 'A comforting, nutty Brazilian natural. Low acidity, heavy body. The dried fig sweetness is subtle. Solid everyday espresso bean.', 'Friend1');


-- ============================================================
-- CAFES
-- ============================================================

INSERT INTO cafes (name, city, country, latitude, longitude, website, created_by) VALUES
('Nylon Coffee Roasters', 'Singapore', 'Singapore', 1.2797, 103.8425, 'https://www.nyloncoffee.sg', 'Baiwei'),
('Common Man Coffee Roasters', 'Singapore', 'Singapore', 1.3048, 103.8408, 'https://commonmancoffeeroasters.com', 'Friend1'),
('Apartment Coffee', 'Singapore', 'Singapore', 1.2810, 103.8440, 'https://apartmentcoffee.co', 'Friend2'),
('PPP Coffee', 'Singapore', 'Singapore', 1.2850, 103.8465, 'https://pppcoffee.com', 'Baiwei'),
('Tiong Hoe Specialty Coffee', 'Singapore', 'Singapore', 1.2876, 103.8062, NULL, 'Friend2'),
('VCR', 'Kuala Lumpur', 'Malaysia', 3.1500, 101.7100, NULL, 'Friend1'),
('Kurasu', 'Kyoto', 'Japan', 35.0035, 135.7590, 'https://kurasu.kyoto', 'Baiwei');


-- ============================================================
-- VISITS
-- ============================================================

INSERT INTO visits (cafe_id, visited_by, visit_date, brew_method, rating_overall, rating_bean_quality, rating_barista_skill, rating_ambiance, notes) VALUES
-- Visit 1: Nylon — stellar hand-pour experience
(1, 'Baiwei', '2025-03-15', 'V60', 5, 5, 5, 4, 'Incredible V60 of the Yirgacheffe. Barista dialled in the pour perfectly — slow spiral, consistent bloom. The blueberry note was crystal clear. Space is tiny but cozy. One of the best cups I have had in Singapore.'),

-- Visit 2: Common Man — solid but commercial
(2, 'Friend1', '2025-03-18', 'Espresso', 3, 4, 3, 4, 'Gesha Village as espresso. Bean quality was great but the extraction was slightly under — a bit sour. Nice open space with good natural light. Decent but felt a bit corporate.'),

-- Visit 3: Apartment Coffee — excellent all-around
(3, 'Friend2', '2025-03-22', 'Espresso', 4, 4, 4, 5, 'The Guatemala El Injerto as a flat white was beautifully balanced — chocolate and caramel came through even with milk. Stunning interior design. Probably the best ambiance in the Everton Park area.'),

-- Visit 4: PPP Coffee — great bean, good skills
(4, 'Baiwei', '2025-03-25', 'V60', 4, 5, 4, 3, 'Tried the Kiunyu AA as a V60. Barista knew what they were doing — the blackcurrant acidity was vibrant and clean. Space is a bit cramped though. Bean quality is consistently excellent here.'),

-- Visit 5: VCR in KL — weekend trip find
(6, 'Friend1', '2025-04-01', 'Chemex', 4, 4, 4, 5, 'Found this gem during a KL weekend trip. Chemex brew of a Colombian they had on rotation. Beautiful vintage interior with great playlist. The coffee was clean and sweet. Would definitely return.'),

-- Visit 6: Kurasu Kyoto — pilgrimage
(7, 'Baiwei', '2025-02-10', 'V60', 5, 5, 5, 5, 'Kyoto trip highlight. Hand-pour bar with meticulous Japanese precision. Had an Ethiopian natural that was transcendent — strawberry and wine. Minimal Japanese aesthetic, total focus on the craft. A must-visit.'),

-- Visit 7: Nylon again — different bean
(1, 'Friend2', '2025-04-05', 'V60', 5, 5, 5, 4, 'Went back to try the Panama Hartmann honey process. Even better than last time. The mango note was wild — never tasted anything like it in a V60. They really know how to get the best out of honey-processed beans.'),

-- Visit 8: Tiong Hoe — old school specialty
(5, 'Friend2', '2025-03-30', 'Espresso', 4, 4, 3, 3, 'One of Singapore OG specialty roasters. The Sidama Bombe as espresso was intense — strawberry jam sweetness with a winey kick. Space is no-frills but the beans speak for themselves. Respect the heritage.');


-- ============================================================
-- VISIT_BEANS (linking visits to beans tried)
-- ============================================================

INSERT INTO visit_beans (visit_id, bean_id) VALUES
(1, 1),   -- Visit 1 (Nylon) → Yirgacheffe Kochere
(2, 2),   -- Visit 2 (Common Man) → Gesha Village
(3, 3),   -- Visit 3 (Apartment) → El Injerto Bourbon
(4, 4),   -- Visit 4 (PPP) → Kiunyu AA
(5, 7),   -- Visit 5 (VCR) → La Palma Sidra (similar Colombian)
(6, 6),   -- Visit 6 (Kurasu) → Sidama Bensa Bombe (similar Ethiopian natural)
(7, 5),   -- Visit 7 (Nylon again) → Finca Hartmann Maragogype
(8, 6);   -- Visit 8 (Tiong Hoe) → Sidama Bensa Bombe
