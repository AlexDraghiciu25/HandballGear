-- Baza de date pentru HandballGear - Tabel produse
-- Produse de echipament handbal

CREATE TABLE IF NOT EXISTS produse (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nume TEXT NOT NULL,
    descriere TEXT,
    imagine TEXT,
    categorie_mare TEXT CHECK(categorie_mare IN ('Mingi', 'Adidasi', 'Accesorii', 'Protectie', 'Echipament')),
    subcategorie TEXT,
    pret REAL NOT NULL,
    caracteristica_numerica REAL,  -- gramaj/greutate in grame
    data_intrare DATE DEFAULT CURRENT_TIMESTAMP,
    culoare TEXT,
    caracteristici_multi TEXT,  -- valori separate prin virgula
    este_noutate INTEGER DEFAULT 0  -- boolean
);

-- Inserare produse de test (15-20 produse)
INSERT INTO produse (nume, descriere, imagine, categorie_mare, subcategorie, pret, caracteristica_numerica, data_intrare, culoare, caracteristici_multi, este_noutate) VALUES
('Minge Handbal IHF Pro', 'Minge oficială de competiție, aprobată IHF, pentru meciuri și antrenamente.', '/resurse/imagini/produse/minge-ihf.png', 'Mingi', 'Competitie', 89.99, 325, '2026-01-15', 'Albastru', 'oficiala,IHF,competitie', 1),
('Minge Antrenament Basic', 'Minge de antrenament durabilă, ideală pentru sesiuni de pregătire.', '/resurse/imagini/produse/minge-basic.png', 'Mingi', 'Antrenament', 45.50, 300, '2025-11-20', 'Rosu', 'antrenament,durabila', 0),
('Minge Juniori Size 0', 'Minge dedicată copiilor sub 8 ani, ușoară și manevrabilă.', '/resurse/imagini/produse/minge-juniori.png', 'Mingi', 'Juniori', 35.00, 250, '2026-02-10', 'Galben', 'juniori,copii', 1),
('Adidasi Handbal Speed', 'Adidași profesionali cu talpă aderentă pentru interior.', '/resurse/imagini/produse/adidasi-speed.png', 'Adidasi', 'Profesionisti', 249.99, 320, '2026-03-01', 'Negru', 'grip,interior,profesionisti', 1),
('Adidasi Indoor Comfort', 'Adidași confortabili pentru antrenament zilnic.', '/resurse/imagini/produse/adidasi-comfort.png', 'Adidasi', 'Antrenament', 159.99, 350, '2025-12-15', 'Alb', 'comfort,antrement', 0),
('Adidasi Youth Junior', 'Adidași pentru tineri, flexibili și ușori.', '/resurse/imagini/produse/adidasi-youth.png', 'Adidasi', 'Juniori', 119.99, 280, '2026-01-25', 'Rosu', 'tineri,flexibili', 0),
('Banda Absorbtie Umiditate', 'Banda de absorbtie pentru mana, 50 buc/set.', '/resurse/imagini/produse/banda-absortie.png', 'Accesorii', 'Accesorii', 24.99, 50, '2025-10-05', 'Alb', 'absorbtie,set', 0),
('Fluiere Arbitru Profesional', 'Fluier profesional cu sunet clar, incl. curea.', '/resurse/imagini/produse/fluier.png', 'Accesorii', 'Accesorii', 39.99, 30, '2025-09-20', 'Negru', 'arbitru,profesionist', 0),
('Geanta Echipament Sport', 'Geanta spatioasa pentru echipament, cu buzunare.', '/resurse/imagini/produse/geanta.png', 'Accesorii', 'Accesorii', 79.99, 800, '2026-02-28', 'Negru', 'spatioasa,buzunare', 1),
('Cotiera Protectie Pro', 'Cotiera cu protectie spumă, pentru impact.', '/resurse/imagini/produse/cotiera-pro.png', 'Protectie', 'Cotiere', 44.99, 85, '2025-11-10', 'Negru', 'protectie,impact', 0),
('Genunchiera Impact Extra', 'Genunchiera pentru protectie la alunecare.', '/resurse/imagini/produse/genunchiera.png', 'Protectie', 'Genunchiere', 54.99, 120, '2025-12-01', 'Alb', 'protectie,alunecare', 0),
('Protecie Tibie Handbal', 'Protecie tibie pentru portari.', '/resurse/imagini/produse/tibie.png', 'Protectie', 'Portari', 69.99, 200, '2026-01-05', 'Negru', 'portari,protectie', 0),
('Tricou Jucator Profesional', 'Tricou din poliester respirabil, rapid.', '/resurse/imagini/produse/tricou.png', 'Echipament', 'Tricouri', 34.99, 150, '2025-08-15', 'Albastru', 'polister,respirabil', 0),
('Sort Competitie Elastic', 'Sort elastic pentru competitie, miscare libera.', '/resurse/imagini/produse/sort.png', 'Echipament', 'Sorturi', 29.99, 120, '2025-08-15', 'Albastru', 'elastic,competitie', 0),
('Set Antrenament Complet', 'Set incl. tricou, sort, sosete, pentru club.', '/resurse/imagini/produse/set-echipament.png', 'Echipament', 'Seturi', 89.99, 450, '2026-03-10', 'Verde', 'set,club,complet', 1),
('Pompa Aer Mingi', 'Pompa manuala pentru umflarea mingilor.', '/resurse/imagini/produse/pompa.png', 'Accesorii', 'Accesorii', 19.99, 100, '2025-07-20', 'Gri', 'pompa,manuala', 0),
('Clister 500ml Bottle', 'Clister pentru aderentă minge, 500ml.', '/resurse/imagini/produse/clister.png', 'Accesorii', 'Accesorii', 29.99, 500, '2025-06-15', 'Transparent', 'aderenta,500ml', 0),
('Sosete Handbal Algodon', 'Sosete confortabile cu suport pentru glezna.', '/resurse/imagini/produse/sosete.png', 'Echipament', 'Sosete', 14.99, 50, '2025-09-01', 'Alb', 'algodon,confort', 0),
('Marsupiul Sport cu Buzunar', 'Marsupiu pentru obiecte mici, cu fermoar.', '/resurse/imagini/produse/marsupiu.png', 'Accesorii', 'Accesorii', 34.99, 80, '2026-02-20', 'Negru', 'buzunar,fermoar', 1),
('Filet Sac Echipament', 'Filet pentru transport mingi si accesorii.', '/resurse/imagini/produse/filet.png', 'Accesorii', 'Accesorii', 22.99, 150, '2025-10-30', 'Verde', 'filet,transport', 0);