-- +goose Up
-- Migration: Create provinces and towns reference tables
-- Version: 007
-- Description: Zambian provinces (10) and towns/districts (~80) for branch location data

CREATE TABLE IF NOT EXISTS provinces (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(10)  NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS towns (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_id UUID         NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    code        VARCHAR(10)
);

CREATE INDEX idx_towns_province_id ON towns(province_id);

-- Seed 10 Zambian provinces
INSERT INTO provinces (name, code) VALUES
    ('Central Province',       'CP'),
    ('Copperbelt Province',    'CB'),
    ('Eastern Province',       'EP'),
    ('Luapula Province',       'LP'),
    ('Lusaka Province',        'LK'),
    ('Muchinga Province',      'MC'),
    ('Northern Province',      'NP'),
    ('North-Western Province', 'NW'),
    ('Southern Province',      'SP'),
    ('Western Province',       'WP');

-- Seed ~80 Zambian towns/districts (8 per province)
WITH p AS (SELECT id, code FROM provinces)
INSERT INTO towns (province_id, name, code)
SELECT p.id, t.name, t.code
FROM p
JOIN (VALUES
    -- Central Province
    ('CP', 'Kabwe',         'KBW'),
    ('CP', 'Kapiri Mposhi', 'KPM'),
    ('CP', 'Serenje',       'SRJ'),
    ('CP', 'Mkushi',        'MKS'),
    ('CP', 'Chibombo',      'CHB'),
    ('CP', 'Mumbwa',        'MBW'),
    ('CP', 'Luano',         'LUO'),
    ('CP', 'Shibuyunji',    'SBY'),
    -- Copperbelt Province
    ('CB', 'Ndola',           'NDL'),
    ('CB', 'Kitwe',           'KTW'),
    ('CB', 'Mufulira',        'MFR'),
    ('CB', 'Chingola',        'CHL'),
    ('CB', 'Luanshya',        'LSY'),
    ('CB', 'Kalulushi',       'KLS'),
    ('CB', 'Chililabombwe',   'CLB'),
    ('CB', 'Lufwanyama',      'LFW'),
    ('CB', 'Masaiti',         'MST'),
    ('CB', 'Mpongwe',         'MPW'),
    -- Eastern Province
    ('EP', 'Chipata',  'CHP'),
    ('EP', 'Petauke',  'PTK'),
    ('EP', 'Katete',   'KTE'),
    ('EP', 'Lundazi',  'LDZ'),
    ('EP', 'Mambwe',   'MMB'),
    ('EP', 'Nyimba',   'NYM'),
    ('EP', 'Chadiza',  'CDZ'),
    ('EP', 'Vubwi',    'VBW'),
    -- Luapula Province
    ('LP', 'Mansa',          'MNS'),
    ('LP', 'Nchelenge',      'NCH'),
    ('LP', 'Kawambwa',       'KWB'),
    ('LP', 'Samfya',         'SMF'),
    ('LP', 'Chiengi',        'CHG'),
    ('LP', 'Milenge',        'MLG'),
    ('LP', 'Chipili',        'CPL'),
    ('LP', 'Mwansabombwe',   'MWB'),
    -- Lusaka Province
    ('LK', 'Lusaka',   'LSK'),
    ('LK', 'Kafue',    'KFE'),
    ('LK', 'Chongwe',  'CGW'),
    ('LK', 'Luangwa',  'LGW'),
    ('LK', 'Chilanga', 'CLG'),
    ('LK', 'Rufunsa',  'RFS'),
    -- Muchinga Province
    ('MC', 'Chinsali',    'CNS'),
    ('MC', 'Nakonde',     'NKD'),
    ('MC', 'Mpika',       'MPK'),
    ('MC', 'Isoka',       'ISK'),
    ('MC', 'Mafinga',     'MFG'),
    ('MC', 'Kanchibiya',  'KCB'),
    -- Northern Province
    ('NP', 'Kasama',     'KSM'),
    ('NP', 'Mbala',      'MBL'),
    ('NP', 'Luwingu',    'LWG'),
    ('NP', 'Mungwi',     'MGW'),
    ('NP', 'Kaputa',     'KPT'),
    ('NP', 'Chilubi',    'CLBI'),
    ('NP', 'Mpulungu',   'MPL'),
    ('NP', 'Senga Hill', 'SGH'),
    -- North-Western Province
    ('NW', 'Solwezi',    'SLW'),
    ('NW', 'Kasempa',    'KSP'),
    ('NW', 'Mwinilunga', 'MWL'),
    ('NW', 'Kabompo',    'KBP'),
    ('NW', 'Mufumbwe',   'MFB'),
    ('NW', 'Chavuma',    'CHV'),
    ('NW', 'Zambezi',    'ZMB'),
    ('NW', 'Ikelenge',   'IKL'),
    -- Southern Province
    ('SP', 'Livingstone', 'LVG'),
    ('SP', 'Choma',       'CHM'),
    ('SP', 'Mazabuka',    'MZB'),
    ('SP', 'Monze',       'MNZ'),
    ('SP', 'Kalomo',      'KLM'),
    ('SP', 'Gwembe',      'GWB'),
    ('SP', 'Namwala',     'NMW'),
    ('SP', 'Kazungula',   'KZG'),
    ('SP', 'Pemba',       'PMB'),
    ('SP', 'Siavonga',    'SVG'),
    -- Western Province
    ('WP', 'Mongu',      'MNG'),
    ('WP', 'Kaoma',      'KOM'),
    ('WP', 'Senanga',    'SNG'),
    ('WP', 'Sesheke',    'SSH'),
    ('WP', 'Kalabo',     'KLB'),
    ('WP', 'Shangombo',  'SGM'),
    ('WP', 'Limulunga',  'LML'),
    ('WP', 'Mulobezi',   'MLB')
) AS t(pcode, name, code) ON p.code = t.pcode;

-- +goose Down
-- Rollback: Drop provinces and towns tables
DROP TABLE IF EXISTS towns;
DROP TABLE IF EXISTS provinces;
