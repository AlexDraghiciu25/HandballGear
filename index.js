const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const sass = require('sass');

const app = express();
const PORT = 8080;

// --- 1. CONFIGURĂRI GENERALE ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Funcție globală pentru EJS care formatează data în limba română
app.locals.formateazaData = function(dataStr) {
    if (!dataStr) return "-";
    const zile = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
    const luni = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    let d = new Date(dataStr);
    return `${zile[d.getDay()]}, ${d.getDate()} ${luni[d.getMonth()]} ${d.getFullYear()}`;
};

// Definire folder resurse ca static
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));
app.use(express.json()); // Pentru preluarea JSON via fetch() (Bonus 10)

// --- 1.1 BAZA DE DATE POSTGRESQL (Cerinta 1.2p) ---
const { Pool } = require('pg');

// Configurare conexiune la baza de date
const pool = new Pool({
    user: 'user_proiect',      // Utilizatorul creat de noi
    host: 'localhost',
    database: 'handballgear',  // Numele bazei de date
    password: 'parola_secreta',// Parola setata in pgAdmin
    port: 5432,                // Portul default pentru Postgres
});

pool.connect()
    .then(() => console.log('[OK] Conexiune la PostgreSQL stabilită cu succes!'))
    .catch(err => console.error('[EROARE DB] Eroare conexiune PostgreSQL:', err.stack));

// Functie pentru initializare asincrona (ca sa fim siguri ca respecta ordinea)
async function initDB() {
    try {
        // 1. Creare Tabel (sintaxa specifica Postgres: SERIAL in loc de AUTOINCREMENT)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS produse (
                id SERIAL PRIMARY KEY,
                nume VARCHAR(255) NOT NULL,
                descriere TEXT,
                imagine VARCHAR(255),
                categorie_mare VARCHAR(50) CHECK(categorie_mare IN ('Mingi', 'Adidasi', 'Accesorii', 'Protectie', 'Echipament')),
                subcategorie VARCHAR(50),
                pret NUMERIC NOT NULL,
                caracteristica_numerica NUMERIC,
                data_intrare TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                culoare VARCHAR(50),
                caracteristici_multi TEXT,
                este_noutate BOOLEAN DEFAULT FALSE
            )
        `);
        console.log('[OK] Tabel produse verificat/creat în PostgreSQL');

        // 2. Verificare daca tabelul e gol
        const countRes = await pool.query('SELECT COUNT(*) AS cnt FROM produse');
        if (parseInt(countRes.rows[0].cnt) === 0) {
            console.log('[INFO] Se populează baza de date PostgreSQL cu produse...');
            
            // Aceeasi lista, dar cu 'este_noutate' scris cu true/false in loc de 1/0
            const produseInitiale = [
                {nume:'Minge Antrenament Basic',descriere:'Varianta ușoară.',imagine:'/resurse/imagini/produse/minge-basic.png',categorie_mare:'Mingi',subcategorie:'Antrenament',pret:45,caracteristica_numerica:250,data_intrare:'2025-11-20',culoare:'Rosu',caracteristici_multi:'antrement,durabila',este_noutate:false},
                {nume:'Minge Antrenament Basic',descriere:'Varianta grea.',imagine:'/resurse/imagini/produse/minge-basic.png',categorie_mare:'Mingi',subcategorie:'Antrenament',pret:50,caracteristica_numerica:350,data_intrare:'2025-11-20',culoare:'Rosu',caracteristici_multi:'antrement,durabila',este_noutate:false},
                {nume:'Adidasi Handbal Speed',descriere:'Versiunea de antrenament.',imagine:'/resurse/imagini/produse/adidasi-speed.png',categorie_mare:'Adidasi',subcategorie:'Profesionisti',pret:200,caracteristica_numerica:280,data_intrare:'2026-03-01',culoare:'Negru',caracteristici_multi:'grip,interior',este_noutate:true},
                {nume:'Adidasi Handbal Speed',descriere:'Versiunea Pro, mai grea.',imagine:'/resurse/imagini/produse/adidasi-speed.png',categorie_mare:'Adidasi',subcategorie:'Profesionisti',pret:350,caracteristica_numerica:380,data_intrare:'2026-03-01',culoare:'Negru',caracteristici_multi:'grip,interior,profesionisti',este_noutate:true},
                {nume:'Minge Handbal IHF Pro',descriere:'Minge oficială de competiție, aprobată IHF.',imagine:'/resurse/imagini/produse/minge-ihf.png',categorie_mare:'Mingi',subcategorie:'Competitie',pret:89.99,caracteristica_numerica:325,data_intrare:'2026-01-15',culoare:'Albastru',caracteristici_multi:'oficiala,IHF,competitie',este_noutate:true},
                {nume:'Minge Juniori Size 0',descriere:'Minge dedicată copiilor sub 8 ani.',imagine:'/resurse/imagini/produse/minge-juniori.png',categorie_mare:'Mingi',subcategorie:'Juniori',pret:35.00,caracteristica_numerica:250,data_intrare:'2026-02-10',culoare:'Galben',caracteristici_multi:'juniori,copii',este_noutate:true},
                {nume:'Adidasi Indoor Comfort',descriere:'Adidași confortabili pentru antrenament zilnic.',imagine:'/resurse/imagini/produse/adidasi-comfort.png',categorie_mare:'Adidasi',subcategorie:'Antrenament',pret:159.99,caracteristica_numerica:350,data_intrare:'2025-12-15',culoare:'Alb',caracteristici_multi:'comfort,antrement',este_noutate:false},
                {nume:'Banda Absorbtie Umiditate',descriere:'Banda de absorbtie pentru mana.',imagine:'/resurse/imagini/produse/banda-absortie.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:24.99,caracteristica_numerica:50,data_intrare:'2025-10-05',culoare:'Alb',caracteristici_multi:'absorbtie,set',este_noutate:false},
                {nume:'Fluiere Arbitru Profesional',descriere:'Fluier profesional cu sunet clar.',imagine:'/resurse/imagini/produse/fluier.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:39.99,caracteristica_numerica:30,data_intrare:'2025-09-20',culoare:'Negru',caracteristici_multi:'arbitru,profesionist',este_noutate:false},
                {nume:'Geanta Echipament Sport',descriere:'Geanta spatioasa pentru echipament.',imagine:'/resurse/imagini/produse/geanta.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:79.99,caracteristica_numerica:800,data_intrare:'2026-02-28',culoare:'Negru',caracteristici_multi:'spatioasa,buzunare',este_noutate:true},
                {nume:'Cotiera Protectie Pro',descriere:'Cotiera cu protectie spumă.',imagine:'/resurse/imagini/produse/cotiera-pro.png',categorie_mare:'Protectie',subcategorie:'Cotiere',pret:44.99,caracteristica_numerica:85,data_intrare:'2025-11-10',culoare:'Negru',caracteristici_multi:'protectie,impact',este_noutate:false},
                {nume:'Genunchiera Impact Extra',descriere:'Genunchiera pentru protectie la alunecare.',imagine:'/resurse/imagini/produse/genunchiera.png',categorie_mare:'Protectie',subcategorie:'Genunchiere',pret:54.99,caracteristica_numerica:120,data_intrare:'2025-12-01',culoare:'Alb',caracteristici_multi:'protectie,alunecare',este_noutate:false},
                {nume:'Protecie Tibie Handbal',descriere:'Protecie tibie pentru portari.',imagine:'/resurse/imagini/produse/tibie.png',categorie_mare:'Protectie',subcategorie:'Portari',pret:69.99,caracteristica_numerica:200,data_intrare:'2026-01-05',culoare:'Negru',caracteristici_multi:'portari,protectie',este_noutate:false},
                {nume:'Tricou Jucator Profesional',descriere:'Tricou din poliester respirabil, rapid.',imagine:'/resurse/imagini/produse/tricou.png',categorie_mare:'Echipament',subcategorie:'Tricouri',pret:34.99,caracteristica_numerica:150,data_intrare:'2025-08-15',culoare:'Albastru',caracteristici_multi:'polister,respirabil',este_noutate:false},
                {nume:'Sort Competitie Elastic',descriere:'Sort elastic pentru competitie.',imagine:'/resurse/imagini/produse/sort.png',categorie_mare:'Echipament',subcategorie:'Sorturi',pret:29.99,caracteristica_numerica:120,data_intrare:'2025-08-15',culoare:'Albastru',caracteristici_multi:'elastic,competitie',este_noutate:false},
                {nume:'Set Antrenament Complet',descriere:'Set incl. tricou, sort, sosete.',imagine:'/resurse/imagini/produse/set-echipament.png',categorie_mare:'Echipament',subcategorie:'Seturi',pret:89.99,caracteristica_numerica:450,data_intrare:'2026-03-10',culoare:'Verde',caracteristici_multi:'set,club,complet',este_noutate:true},
                {nume:'Pompa Aer Mingi',descriere:'Pompa manuala pentru umflarea mingilor.',imagine:'/resurse/imagini/produse/pompa.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:19.99,caracteristica_numerica:100,data_intrare:'2025-07-20',culoare:'Gri',caracteristici_multi:'pompa,manuala',este_noutate:false},
                {nume:'Clister 500ml Bottle',descriere:'Clister pentru aderentă minge, 500ml.',imagine:'/resurse/imagini/produse/clister.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:29.99,caracteristica_numerica:500,data_intrare:'2025-06-15',culoare:'Transparent',caracteristici_multi:'aderenta,500ml',este_noutate:false},
                {nume:'Sosete Handbal Algodon',descriere:'Sosete confortabile cu suport.',imagine:'/resurse/imagini/produse/sosete.png',categorie_mare:'Echipament',subcategorie:'Sosete',pret:14.99,caracteristica_numerica:50,data_intrare:'2025-09-01',culoare:'Alb',caracteristici_multi:'algodon,confort',este_noutate:false},
                {nume:'Marsupiul Sport cu Buzunar',descriere:'Marsupiu pentru obiecte mici.',imagine:'/resurse/imagini/produse/marsupiu.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:34.99,caracteristica_numerica:80,data_intrare:'2026-02-20',culoare:'Negru',caracteristici_multi:'buzunar,fermoar',este_noutate:true}
            ];
            
            // Inseram produsele (in Postgres variabilele se scriu cu $1, $2 etc.)
            const queryInsert = `INSERT INTO produse (nume, descriere, imagine, categorie_mare, subcategorie, pret, caracteristica_numerica, data_intrare, culoare, caracteristici_multi, este_noutate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
            
            for (let p of produseInitiale) {
                await pool.query(queryInsert, [p.nume, p.descriere, p.imagine, p.categorie_mare, p.subcategorie, p.pret, p.caracteristica_numerica, p.data_intrare, p.culoare, p.caracteristici_multi, p.este_noutate]);
            }
            console.log(`[OK] S-au adăugat ${produseInitiale.length} produse în PostgreSQL`);
        }
    } catch (err) {
        console.error('[EROARE DB INITIALIZARE]', err.message);
    }
}
initDB();

// --- Functii Helper rescrise pentru PostgreSQL ---
async function getProduse(categorie, callback) {
    try {
        let sql = 'SELECT * FROM produse';
        let params = [];
        if (categorie && categorie !== 'toate') {
            sql += ' WHERE categorie_mare = $1';
            params.push(categorie);
        }
        sql += ' ORDER BY id ASC';
        
        const res = await pool.query(sql, params);
        // Bonus 9: Atasare imagini multiple
        res.rows.forEach(prod => {
            let baseExt = prod.imagine.lastIndexOf('.');
            let base = prod.imagine.substring(0, baseExt);
            let ext = prod.imagine.substring(baseExt);
            prod.imagini_multiple = [
                prod.imagine,
                base + '-alt1' + ext,
                base + '-alt2' + ext
            ];
        });
        callback(res.rows);
    } catch (err) {
        console.error('[EROARE DB getProduse]', err.message);
        callback([]);
    }
}

async function getProdusById(id, callback) {
    try {
        const res = await pool.query('SELECT * FROM produse WHERE id = $1', [id]);
        if (res.rows.length > 0) {
            let prod = res.rows[0];
            let baseExt = prod.imagine.lastIndexOf('.');
            let base = prod.imagine.substring(0, baseExt);
            let ext = prod.imagine.substring(baseExt);
            prod.imagini_multiple = [
                prod.imagine,
                base + '-alt1' + ext,
                base + '-alt2' + ext
            ];
            callback(prod);
        } else {
            callback(null);
        }
    } catch (err) {
        console.error('[EROARE DB getProdusById]', err.message);
        callback(null);
    }
}

async function getCategorii(callback) {
    try {
        const res = await pool.query('SELECT DISTINCT categorie_mare FROM produse ORDER BY categorie_mare');
        callback(res.rows.map(r => r.categorie_mare));
    } catch (err) {
        console.error('[EROARE DB getCategorii]', err.message);
        callback(['Mingi', 'Adidasi', 'Accesorii', 'Protectie', 'Echipament']);
    }
}

// --- (Bonus 1) Functie pentru extragerea metadatelor filtrelor din DB ---
async function getFilterMeta(callback) {
    try {
        // Extragem min/max pret, min/max greutate din tabel
        const statsRes = await pool.query(`
            SELECT 
                MIN(pret) AS pret_min, MAX(pret) AS pret_max,
                MIN(caracteristica_numerica) AS greutate_min, MAX(caracteristica_numerica) AS greutate_max,
                MIN(data_intrare) AS data_min, MAX(data_intrare) AS data_max
            FROM produse
        `);
        // Extragem culorile distincte
        const culoriRes = await pool.query('SELECT DISTINCT culoare FROM produse ORDER BY culoare');
        // Extragem subcategoriile distincte
        const subcatRes = await pool.query('SELECT DISTINCT subcategorie FROM produse ORDER BY subcategorie');
        // Extragem toate valorile multiple distincte (split dupa virgula)
        const multiRes = await pool.query('SELECT DISTINCT caracteristici_multi FROM produse');
        
        // Construim setul de valori multiple unice
        let setMulti = new Set();
        multiRes.rows.forEach(r => {
            if (r.caracteristici_multi) {
                r.caracteristici_multi.split(',').forEach(v => setMulti.add(v.trim()));
            }
        });

        let stats = statsRes.rows[0];
        callback({
            pretMin: parseFloat(stats.pret_min) || 0,
            pretMax: Math.ceil(parseFloat(stats.pret_max) || 500),
            greutateMin: parseFloat(stats.greutate_min) || 0,
            greutateMax: Math.ceil(parseFloat(stats.greutate_max) || 1000),
            culori: culoriRes.rows.map(r => r.culoare),
            subcategorii: subcatRes.rows.map(r => r.subcategorie),
            valoriMultiple: Array.from(setMulti).sort()
        });
    } catch (err) {
        console.error('[EROARE DB getFilterMeta]', err.message);
        callback({
            pretMin: 0, pretMax: 500,
            greutateMin: 0, greutateMax: 1000,
            culori: [], subcategorii: [], valoriMultiple: []
        });
    }
}

// Variabila globala pentru erori (Cerinta)
global.obGlobal = {
    obErori: null,
    folderScss: path.join(__dirname, 'resurse/scss'),
    folderCss: path.join(__dirname, 'resurse/css')
};

// --- 2. INITIALIZARE SI VERIFICARE ERORI (Task Bonus) ---
function initErori() {
    const caleJson = path.join(__dirname, 'resurse/json/erori.json');

    // BONUS (0.025): Verificăm dacă fișierul erori.json există
    if (!fs.existsSync(caleJson)) {
        console.error("\n[EROARE CRITICĂ] Fișierul erori.json nu există la calea:", caleJson);
        console.error("Aplicația se va închide acum pentru a preveni comportamente neașteptate.\n");
        process.exit(1); // Oprește execuția serverului (Cerința taskului)
    }

    // Citim conținutul fișierului ca simplu text (string)
    const continut = fs.readFileSync(caleJson, 'utf8');

    // BONUS (0.2): Verificăm dacă există o proprietate duplicată în același obiect (verificare pe string)
    // Căutăm toate blocurile de tip { ... } și verificăm cheile ("proprietate":)
    let obiecte = continut.match(/\{[^{}]*\}/g) || [];
    obiecte.forEach(obiect => {
        let chei = [...obiect.matchAll(/"([^"]+)"\s*:/g)].map(match => match[1]);
        let cheiUnice = new Set(chei);
        if (chei.length !== cheiUnice.size) {
            console.error("\n[AVERTISMENT JSON] S-a găsit o proprietate declarată de mai multe ori în același obiect!");
            console.error("Obiectul cu problema:", obiect, "\n");
        }
    });

    let dateErori;
    try {
        dateErori = JSON.parse(continut);
    } catch (e) {
        console.error("\n[EROARE CRITICĂ] Fișierul erori.json nu are un format JSON valid. Eroare:", e.message);
        process.exit(1);
    }

    // BONUS (0.025): Verificăm existența proprietăților principale
    if (!dateErori.info_erori || !dateErori.cale_baza || !dateErori.eroare_default) {
        console.error("\n[EROARE JSON] Lipsesc proprietăți esențiale! Trebuie să existe 'info_erori', 'cale_baza' și 'eroare_default'.\n");
    } else {
        
        // BONUS (0.025): Verificăm dacă folderul specificat în "cale_baza" există în sistem
        let folderBaza = path.join(__dirname, dateErori.cale_baza);
        if (!fs.existsSync(folderBaza)) {
            console.error(`\n[EROARE FIȘIERE] Folderul de bază pentru imagini nu există: ${folderBaza}\n`);
        }

        // BONUS (0.025): Verificăm dacă eroare_default are titlu, text și imagine
        let ed = dateErori.eroare_default;
        if (!ed.titlu || !ed.text || !ed.imagine) {
            console.error("\n[EROARE JSON] Obiectul 'eroare_default' este incomplet! Trebuie să conțină 'titlu', 'text' și 'imagine'.\n");
        } else {
            // BONUS (0.05): Verificăm dacă imaginea de la eroarea default există fizic pe disc
            let caleImgDef = path.join(__dirname, dateErori.cale_baza, ed.imagine);
            if (!fs.existsSync(caleImgDef)) {
                console.error(`\n[EROARE FIȘIERE] Imaginea pentru eroarea default nu a fost găsită pe disc: ${caleImgDef}\n`);
            }
        }

        // BONUS (0.15): Verificăm erorile cu același identificator și BONUS (0.05) verificăm imaginile
        let identificatoriGasiti = {};
        
        dateErori.info_erori.forEach(eroare => {
            let id = eroare.identificator;
            
            // Adăugăm eroarea în dicționar pentru a număra identificatorii
            if (!identificatoriGasiti[id]) {
                identificatoriGasiti[id] = [];
            }
            identificatoriGasiti[id].push(eroare);

            // Verificăm dacă imaginea acestei erori există fizic pe disc
            if (eroare.imagine) {
                let caleImg = path.join(__dirname, dateErori.cale_baza, eroare.imagine);
                if (!fs.existsSync(caleImg)) {
                    console.error(`\n[EROARE FIȘIERE] Imaginea pentru eroarea HTTP ${id} nu a fost găsită pe disc: ${caleImg}\n`);
                }
            }
        });

        // Verificăm dacă am strâns mai multe erori cu același ID (Duplicat)
        for (let id in identificatoriGasiti) {
            if (identificatoriGasiti[id].length > 1) {
                console.error(`\n[EROARE JSON] Identificatorul "${id}" apare de mai multe ori în info_erori!`);
                console.error("Detaliile erorilor duplicate pentru a le găsi ușor:");
                identificatoriGasiti[id].forEach(err => {
                    console.error(` -> Titlu: "${err.titlu}", Text: "${err.text}", Imagine: "${err.imagine}"`);
                });
                console.log("\n");
            }
        }
    }

    // --- Setarea căilor absolute pentru randare (Codul vechi funcțional) ---
    if (dateErori && dateErori.info_erori) {
        dateErori.info_erori.forEach(eroare => {
            eroare.imagine = path.join('/', dateErori.cale_baza, eroare.imagine).replace(/\\/g, "/");
        });
        dateErori.eroare_default.imagine = path.join('/', dateErori.cale_baza, dateErori.eroare_default.imagine).replace(/\\/g, "/");
        
        global.obGlobal.obErori = dateErori;
    }
}
initErori();

function verificaDateGalerie() {
    try {
        const jsonPath = path.join(__dirname, 'resurse/json/galerie.json');
        if (!fs.existsSync(jsonPath)) return;
        const date = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const folderGal = path.join(__dirname, date.cale_galerie);

        if (!fs.existsSync(folderGal)) {
            console.error(`[EROARE JSON] Folderul "${date.cale_galerie}" NU există!`);
        } else {
            date.imagini.forEach(img => {
                let caleImg = path.join(folderGal, img.cale_imagine);
                if (!fs.existsSync(caleImg)) {
                    console.error(`[EROARE JSON] Imaginea "${img.cale_imagine}" lipsește din folder!`);
                }
            });
        }
    } catch (err) { console.error('[EROARE JSON] Galerie invalidă.'); }
}
verificaDateGalerie();

// --- BONUS 5: Verificare Date Galerie JSON ---
function verificaDateGalerie() {
    try {
        const jsonPath = path.join(__dirname, 'resurse/json/galerie.json');
        if (!fs.existsSync(jsonPath)) return;

        const date = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const folderGal = path.join(__dirname, date.cale_galerie);

        // (0.025) Verificăm dacă folderul specificat în "cale_galerie" există
        if (!fs.existsSync(folderGal)) {
            console.error(`[EROARE JSON] Folderul specificat în "cale_galerie" (${date.cale_galerie}) NU există în sistem!`);
        } else {
            // (0.025) Verificăm dacă fișierele imagine specificate există fizic
            date.imagini.forEach(img => {
                let caleImg = path.join(folderGal, img.cale_imagine);
                if (!fs.existsSync(caleImg)) {
                    console.error(`[EROARE JSON] Fișierul imagine "${img.cale_imagine}" lipsește din folderul de galerie!`);
                }
            });
        }
    } catch (err) {
        console.error('[EROARE JSON] Galerie: format invalid sau fișier lipsă.');
    }
}
// Apelăm funcția la pornire
verificaDateGalerie();

// --- 3. FUNCTIE AFISARE EROARE (Cerinta: afisareEroare) ---
function afisareEroare(res, identificator, titlu, text, imagine) {
    let ed = global.obGlobal.obErori.eroare_default;
    let eroareGasita = global.obGlobal.obErori.info_erori.find(e => e.identificator == identificator);

    // Prioritate: Argument funcție > Date JSON > Date Default
    let resTitlu = titlu || (eroareGasita ? eroareGasita.titlu : ed.titlu);
    let resText = text || (eroareGasita ? eroareGasita.text : ed.text);
    let resImagine = imagine || (eroareGasita ? eroareGasita.imagine : ed.imagine);

    let statusCod = (eroareGasita && eroareGasita.status) ? parseInt(identificator) : 200;
    if(isNaN(statusCod)) statusCod = 500;

    res.status(statusCod).render('pages/eroare', {
        titlu: resTitlu,
        text: resText,
        imagine: resImagine
    });
}

// --- 4. CREARE AUTOMATA FOLDERE (Cerinta: vect_foldere) ---
const vect_foldere = ["temp", "logs", "backup", "backup/resurse/css", "fisiere_uploadate"];
vect_foldere.forEach(f => {
    let cale = path.join(__dirname, f);
    if (!fs.existsSync(cale)) {
        fs.mkdirSync(cale);
    }
});

// =======================================================
// --- COMPILARE AUTOMATĂ SCSS -> CSS (Cerinta SCSS) ---
// =======================================================

// 1. Funcția principală de compilare și backup
// =======================================================
// --- COMPILARE AUTOMATĂ SCSS (Update cu Bonus 3 & 4) ---
// =======================================================

function compileazaScss(caleScss, caleCss) {
    try {
        let absoluteCaleScss = path.isAbsolute(caleScss) ? caleScss : path.join(global.obGlobal.folderScss, caleScss);
        
        // Bonus 4: Gestionare corectă a numelor cu mai multe puncte
        let numeFisierScss = path.basename(absoluteCaleScss);
        let numeFisierFaraExtensie = numeFisierScss.substring(0, numeFisierScss.lastIndexOf('.'));
        
        let absoluteCaleCss = caleCss ? 
            (path.isAbsolute(caleCss) ? caleCss : path.join(global.obGlobal.folderCss, caleCss)) : 
            path.join(global.obGlobal.folderCss, `${numeFisierFaraExtensie}.css`);

        // Salvare in backup inainte de suprascriere
        if (fs.existsSync(absoluteCaleCss)) {
            let folderBackup = path.join(__dirname, 'backup/resurse/css');
            if (!fs.existsSync(folderBackup)) fs.mkdirSync(folderBackup, { recursive: true });

            // Bonus 3: Informație de timp (timestamp) în numele backup-ului
            let timestamp = new Date().getTime(); 
            let numeBackup = `${numeFisierFaraExtensie}_${timestamp}.css`;
            let caleBackup = path.join(folderBackup, numeBackup);
            
            try {
                fs.copyFileSync(absoluteCaleCss, caleBackup);
            } catch (err) {
                console.error(`[Eroare Backup] Copiere eșuată:`, err.message);
            }
        }

        // Compilare
        let rezultat = sass.compile(absoluteCaleScss);
        fs.writeFileSync(absoluteCaleCss, rezultat.css);
        console.log(`[SASS] Compilat: ${numeFisierScss} -> ${path.basename(absoluteCaleCss)}`);

    } catch (err) {
        console.error(`[Eroare SASS] la compilarea (${caleScss}):`, err.message);
    }
}

// Compilare inițială
if (fs.existsSync(global.obGlobal.folderScss)) {
    fs.readdirSync(global.obGlobal.folderScss).forEach(file => {
        if (file.endsWith('.scss')) compileazaScss(file);
    });
}

// Watcher (Compilare pe parcurs)
if (fs.existsSync(global.obGlobal.folderScss)) {
    fs.watch(global.obGlobal.folderScss, (event, filename) => {
        if (filename && filename.endsWith('.scss')) {
            let caleAbs = path.join(global.obGlobal.folderScss, filename);
            if (fs.existsSync(caleAbs)) compileazaScss(filename);
        }
    });
}
// =======================================================

// --- 5. RUTE ---

// Cerinta: Afisare cai
console.log("Calea folderului (dirname):", __dirname);
console.log("Calea fisierului (filename):", __filename);
console.log("Folder lucru (cwd):", process.cwd());

// Cerinta: Favicon
app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse/imagini/favicon/favicon.ico"));
});

// Middleware pentru a trimite dinamic categoriile in header (Meniu)
app.use((req, res, next) => {
    getCategorii(categorii => {
        res.locals.categorii = categorii;
        next();
    });
});

// --- (Cerinta 1.2p) ---
// --- PAGINA PRODUSE (Filtrare categorie din Meniu + Bonus 1: metadata filtre din DB) ---
app.get("/produse", (req, res) => {
    let categorie = req.query.categorie || 'toate';
    
    getProduse(categorie, produse => {
        getFilterMeta(filterMeta => {
            res.render('pages/produse', {
                ip: req.ip,
                produse: produse,
                categorieSelectata: categorie,
                filterMeta: filterMeta
            });
        });
    });
});

// --- Bonus 10a + 10b: API Server-Side pentru filtrare/sortare prin Fetch ---
app.post("/api/produse/filtre", (req, res) => {
    let { nume, descriere, pret, categorie, multiplu, culoare, noutate, subcategorie, sortKey1, sortDir1, sortKey2, sortDir2 } = req.body;
    
    // Functie helper pt diacritice (Bonus 7)
    const removeDiacritics = (str) => {
        if (!str) return "";
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    getProduse('toate', produse => {
        let n = removeDiacritics(nume);
        let d = removeDiacritics(descriere);
        
        let filtered = produse.filter(prod => {
            let pName = removeDiacritics(prod.nume);
            let pDesc = removeDiacritics(prod.descriere);
            let pCol = removeDiacritics(prod.culoare);
            let optMulti = removeDiacritics(prod.caracteristici_multi);
            let subcat = removeDiacritics(prod.subcategorie);
            
            let condNume = pName.startsWith(n);
            let condDesc = d === "" || pDesc.includes(d);
            let condPret = prod.pret <= parseFloat(pret);
            let condCateg = (categorie === "toate" || prod.categorie_mare === categorie);
            let condCuloare = (culoare === "" || pCol === removeDiacritics(culoare));
            let condRad = (subcategorie === "toate" || subcat.includes(removeDiacritics(subcategorie)));
            
            let condNou = noutate ? (new Date(prod.data_intrare) > new Date("2024-01-01")) : true;
            
            let condMulti = true;
            if (multiplu && multiplu.length > 0) {
                condMulti = multiplu.some(opt => optMulti.includes(removeDiacritics(opt)));
            }
            
            return condNume && condDesc && condPret && condCateg && condCuloare && condRad && condNou && condMulti;
        });
        
        // Sortare dubla (Bonus 8)
        filtered.sort((a, b) => {
            const getValue = (prod, key) => {
                if (key === 'nume') return prod.nume.toLowerCase();
                if (key === 'pret') return prod.pret;
                if (key === 'categorie') return prod.categorie_mare.toLowerCase();
                if (key === 'data') return new Date(prod.data_intrare).getTime();
                return 0;
            };

            let valA1 = getValue(a, sortKey1);
            let valB1 = getValue(b, sortKey1);
            let valA2 = getValue(a, sortKey2);
            let valB2 = getValue(b, sortKey2);
            
            let sign1 = sortDir1 === 'asc' ? 1 : -1;
            let sign2 = sortDir2 === 'asc' ? 1 : -1;

            if (valA1 < valB1) return -1 * sign1;
            if (valA1 > valB1) return 1 * sign1;
            
            if (valA2 < valB2) return -1 * sign2;
            if (valA2 > valB2) return 1 * sign2;
            return 0;
        });

        res.json(filtered);
    });
});

app.get("/produs/:id", (req, res) => {
    let id = parseInt(req.params.id);
    
    getProdusById(id, produs => {
        if (!produs) {
            return afisareEroare(res, 404);
        }
        res.render('pages/produs', {
            ip: req.ip,
            produs: produs
        });
    });
});


// --- LOGICA DE GALERIE (Actualizată pentru stabilitate) ---
app.get(["/", "/index", "/home", "/galerie"], async function(req, res) {
    let jsonPath = path.join(__dirname, 'resurse', 'json', 'galerie.json');
    if (!fs.existsSync(jsonPath)) {
        return res.render('pages/index', { ip: req.ip, imaginiGalerie: [], cssGalerieAnimata: "", caleBaza: "" });
    }

    let dateGalerie = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    let imagini = dateGalerie.imagini;
    let caleGalerie = dateGalerie.cale_galerie;

    // Asiguram ca exista o imagine pentru border-image.png
    const borderImagePath = path.join(__dirname, 'resurse', 'imagini', 'border-image.png');
    if (!fs.existsSync(borderImagePath)) {
        console.warn("[AVERTISMENT] Imaginea 'border-image.png' pentru border-image nu a fost găsită. Asigură-te că există în 'resurse/imagini/'. Se va crea o imagine placeholder transparentă.");
        // Creăm o imagine placeholder simplă dacă lipsește
        try {
            // Folosim sharp pentru a crea o imagine PNG transparentă
            await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
                .png()
                .toFile(borderImagePath);
        } catch (err) { console.error("[Eroare Sharp] Nu s-a putut crea imaginea placeholder pentru border-image:", err.message); }
    }
    let d = new Date();
    let minCurente = d.getHours() * 60 + d.getMinutes();

    // Filtrare poze (aceeași logică pentru ambele galerii)
    let imaginiFiltrate = imagini.filter(img => {
        let [start, end] = img.timp.split('-');
        let minStart = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
        let minEnd = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
        return minCurente >= minStart && minCurente <= minEnd;
    });

    // 1. Galeria Statică (Garantăm 10 imagini ca să afișeze corect a) ... j) )
    let imaginiStatice = [...imaginiFiltrate];
    if (imaginiStatice.length < 10) {
        let ramase = imagini.filter(img => !imaginiStatice.includes(img));
        imaginiStatice = imaginiStatice.concat(ramase).slice(0, 10);
    } else {
        imaginiStatice = imaginiStatice.slice(0, 10);
    }

    // 2. LOGICA PENTRU GALERIA ANIMATĂ (Identificator: galerie-animata)
    // Dacă filtrul de timp returnează prea puține poze (sub 6), folosim tot setul pentru a respecta cerința 6-12
    let sursaPoze = imaginiFiltrate.length >= 6 ? imaginiFiltrate : imagini;

    // Selectăm un număr par aleatoriu de imagini între 6 și 12
    let nrImaginiAnimat = 0;
    const posibilitatiNrImagini = [6, 8, 10, 12];
    const disponibile = posibilitatiNrImagini.filter(count => count <= sursaPoze.length);

    if (disponibile.length > 0) {
        nrImaginiAnimat = disponibile[Math.floor(Math.random() * disponibile.length)];
    } else {
        console.warn("[AVERTISMENT] Nu sunt suficiente imagini disponibile pentru galeria animată (min. 6). Galeria animată nu va fi afișată.");
    }

    let imaginiAnimate = (nrImaginiAnimat > 0) ? [...sursaPoze].sort(() => 0.5 - Math.random()).slice(0, nrImaginiAnimat) : [];

    // 3. GENERARE SASS DINAMIC
    let cssGalerieAnimata = "";
    if (imaginiAnimate.length > 0) {
        try {
            let caleScssAnimat = path.join(__dirname, 'resurse/scss/galerie_animata.scss');
            let continutScss = fs.readFileSync(caleScssAnimat, 'utf8');
            let scssDinamic = `$nr-imagini: ${imaginiAnimate.length};\n` + continutScss;
            
            cssGalerieAnimata = sass.compileString(scssDinamic).css;
        } catch (err) {
            console.error("[Eroare SASS Galerie]:", err.message);
        }
    }

    let templateName = req.path === '/galerie' ? 'galerie' : 'index';
    res.render(`pages/${templateName}`, { 
        ip: req.ip, 
        imaginiGalerie: imaginiStatice,
        imaginiAnimate: imaginiAnimate,
        cssGalerieAnimata: cssGalerieAnimata,
        caleBaza: caleGalerie
    });
});

// Cerinta: Eroare 400 pentru fisiere .ejs
app.get(/\/[^/]*\.ejs$/, (req, res) => {
    afisareEroare(res, 400);
});

// Cerinta: Eroare 403 pentru directoare din resurse
app.get(/^\/resurse\/.*\/$/, (req, res) => {
    afisareEroare(res, 403);
});


// --- RUTA GENERALA (TREBUIE SĂ FIE ULTIMA DEFINITĂ) ---
app.get("/:pagina", (req, res) => {
    let pagina = req.params.pagina; 
    
    res.render("pages/" + pagina, { ip: req.ip }, function(err, rezultatRandare) {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res, 500, "Eroare Randare", "A aparut o eroare la procesarea paginii.");
            }
        } else {
            res.send(rezultatRandare);
        }
    });
});

// Pornire server
app.listen(PORT, () => {
    console.log(`Serverul a pornit pe: http://localhost:${PORT}`);
});