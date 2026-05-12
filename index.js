const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const sass = require('sass');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 8080;

// --- 1. CONFIGURĂRI GENERALE ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Definire folder resurse ca static
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// --- 1.1 BAZA DE DATE PRODUSE (Cerinta 1.2p) ---
let db;
function initDatabase() {
    const dbPath = path.join(__dirname, 'resurse/database/produse.db');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('[EROARE DB] Nu s-a putut conecta la baza de date:', err.message);
            return;
        }
        console.log('[OK] Conexiune la baza de date SQLite stabilită');
    });
    
    // Creare tabel dacă nu există
    db.run(`
        CREATE TABLE IF NOT EXISTS produse (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nume TEXT NOT NULL,
            descriere TEXT,
            imagine TEXT,
            categorie_mare TEXT CHECK(categorie_mare IN ('Mingi', 'Adidasi', 'Accesorii', 'Protectie', 'Echipament')),
            subcategorie TEXT,
            pret REAL NOT NULL,
            caracteristica_numerica REAL,
            data_intrare DATE DEFAULT CURRENT_TIMESTAMP,
            culoare TEXT,
            caracteristici_multi TEXT,
            este_noutate INTEGER DEFAULT 0
        )
    `, (err) => {
        if (err) {
            console.error('[EROARE DB] Nu s-a putut crea tabelul:', err.message);
        } else {
            console.log('[OK] Tabel produse verificat/creat');
        }
    });
}

// Funcție helper pentru interogări DB
function getProduse(categorie, callback) {
    let sql = 'SELECT * FROM produse';
    let params = [];
    
    if (categorie && categorie !== 'toate') {
        sql += ' WHERE categorie_mare = ?';
        params.push(categorie);
    }
    
    sql += ' ORDER BY id ASC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('[EROARE DB]', err.message);
            callback([]);
        } else {
            callback(rows);
        }
    });
}

function getProdusById(id, callback) {
    db.get('SELECT * FROM produse WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('[EROARE DB]', err.message);
            callback(null);
        } else {
            callback(row);
        }
    });
}

function getCategorii(callback) {
    db.all('SELECT DISTINCT categorie_mare FROM produse ORDER BY categorie_mare', (err, rows) => {
        if (err) {
            console.error('[EROARE DB]', err.message);
            // Fallback la categorii statice
            callback(['Mingi', 'Adidasi', 'Accesorii', 'Protectie', 'Echipament']);
        } else {
            callback(rows.map(r => r.categorie_mare));
        }
    });
}

// Inițializează baza de date la pornire
initDatabase();

// Populare date inițiale (dacă tabelul e gol)
db.get('SELECT COUNT(*) as cnt FROM produse', (err, row) => {
    if (row && row.cnt === 0) {
        console.log('[INFO] Se populează baza de date cu produse...');
        
        const produseInitiale = [
            {nume:'Minge Handbal IHF Pro',descriere:'Minge oficială de competiție, aprobată IHF, pentru meciuri și antrenamente.',imagine:'/resurse/imagini/produse/minge-ihf.png',categorie_mare:'Mingi',subcategorie:'Competitie',pret:89.99,caracteristica_numerica:325,data_intrare:'2026-01-15',culoare:'Albastru',caracteristici_multi:'oficiala,IHF,competitie',este_noutate:1},
            {nume:'Minge Antrenament Basic',descriere:'Minge de antrenament durabilă, ideală pentru sesiuni de pregătire.',imagine:'/resurse/imagini/produse/minge-basic.png',categorie_mare:'Mingi',subcategorie:'Antrenament',pret:45.50,caracteristica_numerica:300,data_intrare:'2025-11-20',culoare:'Rosu',caracteristici_multi:'antrement,durabila',este_noutate:0},
            {nume:'Minge Juniori Size 0',descriere:'Minge dedicată copiilor sub 8 ani, ușoară și manevrabilă.',imagine:'/resurse/imagini/produse/minge-juniori.png',categorie_mare:'Mingi',subcategorie:'Juniori',pret:35.00,caracteristica_numerica:250,data_intrare:'2026-02-10',culoare:'Galben',caracteristici_multi:'juniori,copii',este_noutate:1},
            {nume:'Adidasi Handbal Speed',descriere:'Adidași profesionali cu talpă aderentă pentru interior.',imagine:'/resurse/imagini/produse/adidasi-speed.png',categorie_mare:'Adidasi',subcategorie:'Profesionisti',pret:249.99,caracteristica_numerica:320,data_intrare:'2026-03-01',culoare:'Negru',caracteristici_multi:'grip,interior,profesionisti',este_noutate:1},
            {nume:'Adidasi Indoor Comfort',descriere:'Adidași confortabili pentru antrenament zilnic.',imagine:'/resurse/imagini/produse/adidasi-comfort.png',categorie_mare:'Adidasi',subcategorie:'Antrenament',pret:159.99,caracteristica_numerica:350,data_intrare:'2025-12-15',culoare:'Alb',caracteristici_multi:'comfort,antrement',este_noutate:0},
            {nume:'Adidasi Youth Junior',descriere:'Adidași pentru tineri, flexibili și ușori.',imagine:'/resurse/imagini/produse/adidasi-youth.png',categorie_mare:'Adidasi',subcategorie:'Juniori',pret:119.99,caracteristica_numerica:280,data_intrare:'2026-01-25',culoare:'Rosu',caracteristici_multi:'tineri,flexibili',este_noutate:0},
            {nume:'Banda Absorbtie Umiditate',descriere:'Banda de absorbtie pentru mana, 50 buc/set.',imagine:'/resurse/imagini/produse/banda-absortie.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:24.99,caracteristica_numerica:50,data_intrare:'2025-10-05',culoare:'Alb',caracteristici_multi:'absorbtie,set',este_noutate:0},
            {nume:'Fluiere Arbitru Profesional',descriere:'Fluier profesional cu sunet clar, incl. curea.',imagine:'/resurse/imagini/produse/fluier.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:39.99,caracteristica_numerica:30,data_intrare:'2025-09-20',culoare:'Negru',caracteristici_multi:'arbitru,profesionist',este_noutate:0},
            {nume:'Geanta Echipament Sport',descriere:'Geanta spatioasa pentru echipament, cu buzunare.',imagine:'/resurse/imagini/produse/geanta.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:79.99,caracteristica_numerica:800,data_intrare:'2026-02-28',culoare:'Negru',caracteristici_multi:'spatioasa,buzunare',este_noutate:1},
            {nume:'Cotiera Protectie Pro',descriere:'Cotiera cu protectie spumă, pentru impact.',imagine:'/resurse/imagini/produse/cotiera-pro.png',categorie_mare:'Protectie',subcategorie:'Cotiere',pret:44.99,caracteristica_numerica:85,data_intrare:'2025-11-10',culoare:'Negru',caracteristici_multi:'protectie,impact',este_noutate:0},
            {nume:'Genunchiera Impact Extra',descriere:'Genunchiera pentru protectie la alunecare.',imagine:'/resurse/imagini/produse/genunchiera.png',categorie_mare:'Protectie',subcategorie:'Genunchiere',pret:54.99,caracteristica_numerica:120,data_intrare:'2025-12-01',culoare:'Alb',caracteristici_multi:'protectie,alunecare',este_noutate:0},
            {nume:'Protecie Tibie Handbal',descriere:'Protecie tibie pentru portari.',imagine:'/resurse/imagini/produse/tibie.png',categorie_mare:'Protectie',subcategorie:'Portari',pret:69.99,caracteristica_numerica:200,data_intrare:'2026-01-05',culoare:'Negru',caracteristici_multi:'portari,protectie',este_noutate:0},
            {nume:'Tricou Jucator Profesional',descriere:'Tricou din poliester respirabil, rapid.',imagine:'/resurse/imagini/produse/tricou.png',categorie_mare:'Echipament',subcategorie:'Tricouri',pret:34.99,caracteristica_numerica:150,data_intrare:'2025-08-15',culoare:'Albastru',caracteristici_multi:'polister,respirabil',este_noutate:0},
            {nume:'Sort Competitie Elastic',descriere:'Sort elastic pentru competitie, miscare libera.',imagine:'/resurse/imagini/produse/sort.png',categorie_mare:'Echipament',subcategorie:'Sorturi',pret:29.99,caracteristica_numerica:120,data_intrare:'2025-08-15',culoare:'Albastru',caracteristici_multi:'elastic,competitie',este_noutate:0},
            {nume:'Set Antrenament Complet',descriere:'Set incl. tricou, sort, sosete, pentru club.',imagine:'/resurse/imagini/produse/set-echipament.png',categorie_mare:'Echipament',subcategorie:'Seturi',pret:89.99,caracteristica_numerica:450,data_intrare:'2026-03-10',culoare:'Verde',caracteristici_multi:'set,club,complet',este_noutate:1},
            {nume:'Pompa Aer Mingi',descriere:'Pompa manuala pentru umflarea mingilor.',imagine:'/resurse/imagini/produse/pompa.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:19.99,caracteristica_numerica:100,data_intrare:'2025-07-20',culoare:'Gri',caracteristici_multi:'pompa,manuala',este_noutate:0},
            {nume:'Clister 500ml Bottle',descriere:'Clister pentru aderentă minge, 500ml.',imagine:'/resurse/imagini/produse/clister.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:29.99,caracteristica_numerica:500,data_intrare:'2025-06-15',culoare:'Transparent',caracteristici_multi:'aderenta,500ml',este_noutate:0},
            {nume:'Sosete Handbal Algodon',descriere:'Sosete confortabile cu suport pentru glezna.',imagine:'/resurse/imagini/produse/sosete.png',categorie_mare:'Echipament',subcategorie:'Sosete',pret:14.99,caracteristica_numerica:50,data_intrare:'2025-09-01',culoare:'Alb',caracteristici_multi:'algodon,confort',este_noutate:0},
            {nume:'Marsupiul Sport cu Buzunar',descriere:'Marsupiu pentru obiecte mici, cu fermoar.',imagine:'/resurse/imagini/produse/marsupiu.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:34.99,caracteristica_numerica:80,data_intrare:'2026-02-20',culoare:'Negru',caracteristici_multi:'buzunar,fermoar',este_noutate:1},
            {nume:'Filet Sac Echipament',descriere:'Filet pentru transport mingi si accesorii.',imagine:'/resurse/imagini/produse/filet.png',categorie_mare:'Accesorii',subcategorie:'Accesorii',pret:22.99,caracteristica_numerica:150,data_intrare:'2025-10-30',culoare:'Verde',caracteristici_multi:'filet,transport',este_noutate:0}
        ];
        
        const stmt = db.prepare(`INSERT INTO produse (nume, descriere, imagine, categorie_mare, subcategorie, pret, caracteristica_numerica, data_intrare, culoare, caracteristici_multi, este_noutate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        produseInitiale.forEach(p => {
            stmt.run([p.nume, p.descriere, p.imagine, p.categorie_mare, p.subcategorie, p.pret, p.caracteristica_numerica, p.data_intrare, p.culoare, p.caracteristici_multi, p.este_noutate]);
        });
        
        stmt.finalize();
        console.log('[OK] S-au adăugat ' + produseInitiale.length + ' produse în baza de date');
    }
});

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


// --- PAGINA PRODUSE (Cerinta 1.2p) ---
app.get("/produse", (req, res) => {
    let categorie = req.query.categorie || 'toate';
    
    getCategorii(categorii => {
        getProduse(categorie, produse => {
            res.render('pages/produse', {
                ip: req.ip,
                produse: produse,
                categorii: categorii,
                categorieSelectata: categorie
            });
        });
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

    let d = new Date();
    let minCurente = d.getHours() * 60 + d.getMinutes();

    // Filtrare poze (aceeași logică pentru ambele galerii)
    let imaginiFiltrate = imagini.filter(img => {
        let [start, end] = img.timp.split('-');
        let minStart = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
        let minEnd = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
        return minCurente >= minStart && minCurente <= minEnd;
    });

    // 1. Galeria Statică (Maxim 10 imagini)
    let imaginiStatice = imaginiFiltrate.slice(0, 10);

    // 2. LOGICA PENTRU GALERIA ANIMATĂ (Identificator: galerie-animata)
    // Dacă filtrul de timp returnează prea puține poze (sub 6), folosim tot setul pentru a respecta cerința 6-12
    let sursaPoze = imaginiFiltrate.length >= 6 ? imaginiFiltrate : imagini;
    
    let posibilitati = [6, 8, 10, 12];
    let nrImaginiAnimat = posibilitati.filter(v => v <= sursaPoze.length).pop() || 6;

    let imaginiAnimate = [...sursaPoze].sort(() => 0.5 - Math.random()).slice(0, nrImaginiAnimat);

    // 3. GENERARE SASS DINAMIC
    let cssGalerieAnimata = "";
    try {
        let caleScssAnimat = path.join(__dirname, 'resurse/scss/galerie_animata.scss').replace(/\\/g, '/');
        let scssDinamic = `
            $nr-imagini: ${imaginiAnimate.length};
            @import "${caleScssAnimat}";
        `;
        cssGalerieAnimata = sass.compileString(scssDinamic).css;
    } catch (err) {
        console.error("[Eroare SASS Galerie]:", err.message);
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