const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

// 1. Configurare motor de randare EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 2. Definire folder resurse statice
app.use("/resurse", express.static(path.join(__dirname, "resurse")));

// 3. Variabila globala pentru erori
let obGlobal = {
    obErori: null
};

// Funcție pentru inițializarea erorilor din JSON
// Funcție pentru inițializarea erorilor din JSON
function initErori() {
    // AM MODIFICAT CALEA AICI:
    const rawData = fs.readFileSync(path.join(__dirname, "resurse", "json", "erori.json"));
    obGlobal.obErori = JSON.parse(rawData);
    
    // Setăm căile absolute pentru imagini
    if (obGlobal.obErori && obGlobal.obErori.info_erori) {
        obGlobal.obErori.info_erori.forEach(err => {
            err.imagine = path.join(obGlobal.obErori.cale_baza, err.imagine);
        });
    }
}
initErori();

// Funcția de afișare a erorilor
function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(e => e.identificator == identificator);
    if (!eroare) eroare = obGlobal.obErori.eroare_default;

    const deAfisat = {
        titlu: titlu || eroare.titlu,
        text: text || eroare.text,
        imagine: imagine || eroare.imagine
    };

    const status = eroare.status ? identificator : 200;
    res.status(status).render("pages/eroare", deAfisat);
}

// 4. Securitate: Interzicere acces folder resurse fără fișier (403)
app.use("/resurse", (req, res, next) => {
    // Verificăm dacă url-ul original are o extensie de fișier. Dacă nu are (ex: /resurse/css/), dăm 403.
    if (!path.extname(req.originalUrl)) {
        return afisareEroare(res, 403);
    }
    next();
});

// 5. Securitate: Interzicere acces direct la .ejs (400)
// Folosim un RegExp care se aplică oricărui link ce se termină în ".ejs"
app.get(/\.ejs$/, (req, res) => {
    afisareEroare(res, 400);
});

// 6. Rute pentru Pagina Principală
app.get(["/", "/index", "/home"], (req, res) => {
    res.render("pages/index", { ip: req.ip });
});

// 7. Rută pentru Favicon
app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse/imagini/favicon/favicon.ico"));
});

// 8. Rută Generală pentru pagini (trebuie să fie ultima)
// Folosim un RegExp care capturează orice cuvânt de după "/"
app.get(/^\/(.*)$/, (req, res) => {
    const pagina = req.params[0];
    res.render("pages/" + pagina, { ip: req.ip }, function(err, rezultatRandare) {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res, 500, "Eroare Server", "A apărut o eroare la randarea paginii.");
            }
        } else {
            res.send(rezultatRandare);
        }
    });
});

// 9. Creare automată foldere
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
vect_foldere.forEach(f => {
    const cale = path.join(__dirname, f);
    if (!fs.existsSync(cale)) {
        fs.mkdirSync(cale);
    }
});

// Afișare informații cerute în consolă
console.log("Folder index.js:", __dirname);
console.log("Folder curent de lucru:", process.cwd());
console.log("Cale fișier:", __filename);
// Răspuns la întrebare: __dirname și process.cwd() NU sunt mereu identice.
// __dirname este locația fișierului script, process.cwd() este locația de unde ai lansat comanda 'node'.

app.listen(8080, () => {
    console.log("Serverul a pornit pe http://localhost:8080");
});