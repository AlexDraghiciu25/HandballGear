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

// Definire folder resurse ca static
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

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


// --- LOGICA DE GALERIE (Paginile care folosesc galeria) ---
// Prindem pagina principală și pagina galeriei în același loc
app.get(["/", "/index", "/home", "/galerie"], async function(req, res) {
    
    // 1. Citim fisierul JSON
    let jsonPath = path.join(__dirname, 'resurse', 'json', 'galerie.json');
    
    // Verificare preventivă: dacă nu ai apucat să faci JSON-ul încă, să nu pice serverul
    if (!fs.existsSync(jsonPath)) {
        console.warn("Fisierul galerie.json nu exista! Randam fara galerie.");
        return res.render(req.path === '/galerie' ? 'pages/galerie' : 'pages/index', { ip: req.ip, imaginiGalerie: [] });
    }

    let dateGalerie = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    let imagini = dateGalerie.imagini;
    let caleGalerie = dateGalerie.cale_galerie;

    // 2. Variabilă pentru PREZENTARE
    let oraTestare = null; // ex: "11:30"
    
    let d = new Date();
    let minCurente = d.getHours() * 60 + d.getMinutes();
    
    if (oraTestare) {
        let parti = oraTestare.split(":");
        minCurente = parseInt(parti[0]) * 60 + parseInt(parti[1]);
    }

    // 3. Filtrare dupa timp
    let imaginiFiltrate = imagini.filter(img => {
        let [start, end] = img.timp.split('-');
        let [startH, startM] = start.split(':');
        let [endH, endM] = end.split(':');
        
        let minStart = parseInt(startH) * 60 + parseInt(startM);
        let minEnd = parseInt(endH) * 60 + parseInt(endM);
        
        return minCurente >= minStart && minCurente <= minEnd;
    });

    // 4. Trunchiere la maxim 10 imagini
    if (imaginiFiltrate.length > 10) {
        imaginiFiltrate = imaginiFiltrate.slice(0, 10);
    }

    // 5. Generare imagini responsive (sharp)
    for (let img of imaginiFiltrate) {
        let originalPath = path.join(__dirname, caleGalerie, img.cale_imagine);
        let numeFaraExtensie = img.cale_imagine.split('.')[0];
        let extensie = img.cale_imagine.split('.')[1];
        
        img.cale_mica = `${caleGalerie}${numeFaraExtensie}-mic.${extensie}`;
        img.cale_medie = `${caleGalerie}${numeFaraExtensie}-mediu.${extensie}`;

        let fullSmallPath = path.join(__dirname, img.cale_mica);
        let fullMediumPath = path.join(__dirname, img.cale_medie);

        if (fs.existsSync(originalPath)) {
            if (!fs.existsSync(fullSmallPath)) {
                await sharp(originalPath).resize(300).toFile(fullSmallPath);
            }
            if (!fs.existsSync(fullMediumPath)) {
                await sharp(originalPath).resize(500).toFile(fullMediumPath);
            }
        }
    }

    // 6. Alegem template-ul corect
    let templateName = req.path === '/galerie' ? 'galerie' : 'index';
    
    res.render(`pages/${templateName}`, { 
        ip: req.ip, // Păstrăm IP-ul cum aveai tu inițial pe /
        imaginiGalerie: imaginiFiltrate,
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