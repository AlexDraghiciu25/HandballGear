const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;

// --- 1. CONFIGURĂRI GENERALE ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Definire folder resurse ca static
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// Variabila globala pentru erori (Cerinta)
global.obGlobal = {
    obErori: null
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
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
vect_foldere.forEach(f => {
    let cale = path.join(__dirname, f);
    if (!fs.existsSync(cale)) {
        fs.mkdirSync(cale);
    }
});

// --- 5. RUTE ---

// Cerinta: Afisare cai
console.log("Calea folderului (dirname):", __dirname);
console.log("Calea fisierului (filename):", __filename);
console.log("Folder lucru (cwd):", process.cwd());

// Cerinta: Favicon
app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse/imagini/favicon/favicon.ico"));
});

// Cerinta: Index cu vector de rute
app.get(["/", "/index", "/home"], (req, res) => {
    res.render("pages/index", { ip: req.ip });
});

// Cerinta: Eroare 400 pentru fisiere .ejs
// Folosim RegExp pentru a evita eroarea de parametru missing
app.get(/\/[^/]*\.ejs$/, (req, res) => {
    afisareEroare(res, 400);
});

// Cerinta: Eroare 403 pentru directoare din resurse
app.get(/^\/resurse\/.*\/$/, (req, res) => {
    afisareEroare(res, 403);
});

// Cerinta: Ruta generala /* (trebuie sa fie ULTIMA)
// Folosim paranteze capturante conform noii sintaxe Express
// Cerinta: Ruta generala (trebuie sa fie ULTIMA)
app.get("/:pagina", (req, res) => {
    let pagina = req.params.pagina; // preluam numele paginii din URL
    
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