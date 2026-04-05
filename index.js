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

// --- 2. INITIALIZARE ERORI (Cerinta: initErori) ---
function initErori() {
    const caleJson = path.join(__dirname, 'resurse/json/erori.json');
    try {
        const continut = fs.readFileSync(caleJson, 'utf8');
        let dateErori = JSON.parse(continut);
        
        // Setăm căile absolute pentru imagini folosind cale_baza
        dateErori.info_erori.forEach(eroare => {
            eroare.imagine = path.join('/', dateErori.cale_baza, eroare.imagine).replace(/\\/g, "/");
        });
        dateErori.eroare_default.imagine = path.join('/', dateErori.cale_baza, dateErori.eroare_default.imagine).replace(/\\/g, "/");
        
        global.obGlobal.obErori = dateErori;
    } catch (e) {
        console.error("Eroare la citirea fisierului erori.json:", e);
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