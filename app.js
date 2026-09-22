// ============================================================
// Vokabel-Held — Vokabeltrainer für Englisch & Spanisch
// Reines Client-seitiges Vanilla JS, Daten in localStorage.
// ============================================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

const LEGACY_STORAGE_KEY = "vokabelheld_data_v1"; // Speicherort vor der Mehrspieler-Funktion

const PROFILES = [
  { id: "tiago", name: "Tiago", avatarClass: "avatar-tiago" },
  { id: "nevio", name: "Nevio", avatarClass: "avatar-nevio" },
];

function storageKeyFor(profileId) {
  return "vokabelheld_data_v1__" + profileId;
}

const BOX_INTERVALS_DAYS = [0, 1, 2, 4, 8, 16]; // index = box (1-5), box0 unused
const MAX_BOX = 5;

const SNAKE_UNLOCK_POINTS = 1000;

const SEED_WORDS = [
  { language: "en", de: "der Hund", target: "dog", category: "Tiere" },
  { language: "en", de: "die Katze", target: "cat", category: "Tiere" },
  { language: "en", de: "das Haus", target: "house", category: "Zuhause" },
  { language: "en", de: "essen", target: "to eat", category: "Verben" },
  { language: "en", de: "die Schule", target: "school", category: "Schule" },
  { language: "en", de: "schnell", target: "fast", category: "Adjektive" },
  { language: "en", de: "der Freund", target: "friend", category: "Menschen" },
  { language: "en", de: "spielen", target: "to play", category: "Verben" },
  { language: "es", de: "der Hund", target: "el perro", category: "Tiere" },
  { language: "es", de: "die Katze", target: "el gato", category: "Tiere" },
  { language: "es", de: "das Haus", target: "la casa", category: "Zuhause" },
  { language: "es", de: "essen", target: "comer", category: "Verben" },
  { language: "es", de: "die Schule", target: "la escuela", category: "Schule" },
  { language: "es", de: "schnell", target: "rápido", category: "Adjektive" },
  { language: "es", de: "der Freund", target: "el amigo", category: "Menschen" },
  { language: "es", de: "spielen", target: "jugar", category: "Verben" },
];

// ---------------- Storage ----------------

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function loadData(profileId) {
  const key = storageKeyFor(profileId);
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through to seed */ }
  }

  // Einmaliger Umzug der alten Einzelspieler-Daten zu Tiago, damit nichts verloren geht.
  if (profileId === "tiago") {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const legacyData = JSON.parse(legacyRaw);
        localStorage.setItem(key, JSON.stringify(legacyData));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return legacyData;
      } catch (e) { /* fall through to seed */ }
    }
  }

  const seeded = {
    words: SEED_WORDS.map(w => makeWord(w.language, w.de, w.target, w.category)),
    points: 0,
    streak: { count: 0, lastDate: null },
    snakeHighscore: 0,
  };
  localStorage.setItem(key, JSON.stringify(seeded));
  return seeded;
}

function saveData(d) {
  localStorage.setItem(storageKeyFor(ACTIVE_PROFILE), JSON.stringify(d));
}

let ACTIVE_PROFILE = null;
let DATA = null;

function persist() { saveData(DATA); }

// ---------------- Migrations (Red Line 2, Bayern) ----------------
// Automatisch eingefügte Vokabeln aus abfotografierten Buchseiten.
// Läuft einmalig pro Browser, dupliziert nichts bei erneutem Laden.

const MIGRATION_UNIT1_WORDS = [
  { de: "Blog; Internettagebuch", target: "blog", category: "Unit 1: Intro" },
  { de: "so", target: "so", category: "Unit 1: Intro" },
  { de: "Sehenswürdigkeit", target: "sight", category: "Unit 1: Intro" },
  { de: "Glocke", target: "bell", category: "Unit 1: Intro" },
  { de: "Turm", target: "tower", category: "Unit 1: Intro" },
  { de: "Spitzname", target: "nickname", category: "Unit 1: Intro" },
  { de: "Rad; Steuerrad; Steuer", target: "wheel", category: "Unit 1: Intro" },
  { de: "hoch; groß", target: "high", category: "Unit 1: Intro" },
  { de: "Ticket; Eintrittskarte; Fahrschein", target: "ticket", category: "Unit 1: Intro" },
  { de: "teuer", target: "expensive", category: "Unit 1: Intro" },
  { de: "Brücke", target: "bridge", category: "Unit 1: Intro" },
  { de: "hinüber; herüber; quer durch", target: "across", category: "Unit 1: Intro" },
  { de: "Spitze; oberer Teil; oberes Ende", target: "top", category: "Unit 1: Intro" },
  { de: "Theater", target: "theatre", category: "Unit 1: Intro" },
  { de: "Theaterstück", target: "play", category: "Unit 1: Intro" },
  { de: "Autor; Verfasserin; Schriftsteller", target: "writer", category: "Unit 1: Intro" },
  { de: "ein anderes; noch ein", target: "another", category: "Unit 1: Intro" },
  { de: "Es wurde ... gebaut.", target: "It was built ...", category: "Unit 1: Intro" },
  { de: "vor", target: "ago", category: "Unit 1: Intro" },

  { de: "Stadtrundfahrt im Bus, bei der man beliebig oft ein- und aussteigen kann", target: "hop-on hop-off", category: "Unit 1: Topic 1" },
  { de: "einsteigen", target: "to get on", category: "Unit 1: Topic 1" },
  { de: "Affe", target: "monkey", category: "Unit 1: Topic 1" },
  { de: "Fahrer; Fahrerin", target: "driver", category: "Unit 1: Topic 1" },
  { de: "Witz", target: "joke", category: "Unit 1: Topic 1" },
  { de: "nennen", target: "to call", category: "Unit 1: Topic 1" },
  { de: "Schlüssel; Taste", target: "key", category: "Unit 1: Topic 1" },
  { de: "als Nächstes", target: "next", category: "Unit 1: Topic 1" },
  { de: "aufhören; anhalten", target: "to stop", category: "Unit 1: Topic 1" },
  { de: "Zirkus", target: "circus", category: "Unit 1: Topic 1" },
  { de: "Zelt", target: "tent", category: "Unit 1: Topic 1" },
  { de: "überall; irgendwo", target: "anywhere", category: "Unit 1: Topic 1" },
  { de: "überrascht", target: "surprised", category: "Unit 1: Topic 1" },
  { de: "Elefant", target: "elephant", category: "Unit 1: Topic 1" },
  { de: "aussteigen", target: "to get off", category: "Unit 1: Topic 1" },
  { de: "Gefängnis", target: "prison", category: "Unit 1: Topic 1" },
  { de: "Kronjuwelen", target: "Crown Jewels", category: "Unit 1: Topic 1" },
  { de: "nehmen; mitnehmen", target: "to take, took, taken", category: "Unit 1: Topic 1" },
  { de: "über", target: "over", category: "Unit 1: Topic 1" },
  { de: "Schritt; Stufe", target: "step", category: "Unit 1: Topic 1" },
  { de: "flüstern", target: "to whisper", category: "Unit 1: Topic 1" },

  { de: "Seite", target: "side", category: "Unit 1" },
  { de: "falsch", target: "wrong", category: "Unit 1" },
  { de: "danach", target: "after that", category: "Unit 1" },
  { de: "geschehen; passieren", target: "to happen", category: "Unit 1" },

  { de: "Kind", target: "child, children", category: "Unit 1: Topic 2" },
  { de: "Erwachsene; Erwachsener", target: "adult", category: "Unit 1: Topic 2" },
  { de: "Bahnhof; Haltestelle; Station", target: "station", category: "Unit 1: Topic 2" },
  { de: "Gern geschehen.", target: "You're welcome.", category: "Unit 1: Topic 2" },
  { de: "Bitte schön.", target: "Here you are.", category: "Unit 1: Topic 2" },
  { de: "Wechselgeld", target: "change", category: "Unit 1: Topic 2" },

  { de: "schon; bereits", target: "already", category: "Unit 1: Topic 3" },
  { de: "Mal", target: "time", category: "Unit 1: Topic 3" },
  { de: "gerade (eben); soeben", target: "just", category: "Unit 1: Topic 3" },
  { de: "schreiben", target: "to write, wrote, written", category: "Unit 1: Topic 3" },
  { de: "Internet", target: "internet", category: "Unit 1: Topic 3" },
  { de: "herüberkommen; vorbeischauen", target: "to come over", category: "Unit 1: Topic 3" },
  { de: "machen; tun", target: "to do, did, done", category: "Unit 1: Topic 3" },
  { de: "noch nicht", target: "not ... yet", category: "Unit 1: Topic 3" },
  { de: "beenden; fertigstellen; aufhören", target: "to finish", category: "Unit 1: Topic 3" },
  { de: "Vokabular; Wortschatz", target: "vocabulary", category: "Unit 1: Topic 3" },
  { de: "Test; Klassenarbeit", target: "test", category: "Unit 1: Topic 3" },

  { de: "müssen", target: "to have to", category: "Unit 1: Topic 4" },
  { de: "bald", target: "soon", category: "Unit 1: Topic 4" },
  { de: "billig", target: "cheap", category: "Unit 1: Topic 4" },

  { de: "Markt", target: "market", category: "Unit 1: Weitere Wörter" },
  { de: "Straßenkünstler; Straßenkünstlerin", target: "street performer", category: "Unit 1: Weitere Wörter" },
  { de: "kostenlos; frei", target: "free", category: "Unit 1: Weitere Wörter" },
  { de: "jemals", target: "ever", category: "Unit 1: Weitere Wörter" },
  { de: "schon", target: "yet", category: "Unit 1: Weitere Wörter" },
  { de: "Museum", target: "museum", category: "Unit 1: Weitere Wörter" },
  { de: "Park", target: "park", category: "Unit 1: Weitere Wörter" },
  { de: "Kirche", target: "church", category: "Unit 1: Weitere Wörter" },
  { de: "Stadion", target: "stadium", category: "Unit 1: Weitere Wörter" },
  { de: "Theater; Drama", target: "drama", category: "Unit 1: Weitere Wörter" },
  { de: "Schauspieler; Schauspielerin", target: "actor", category: "Unit 1: Weitere Wörter" },
  { de: "besitzen", target: "to own", category: "Unit 1: Weitere Wörter" },
  { de: "spielen", target: "to act", category: "Unit 1: Weitere Wörter" },
  { de: "Rolle; Teil", target: "part", category: "Unit 1: Weitere Wörter" },
  { de: "Eigentümer", target: "landlord", category: "Unit 1: Weitere Wörter" },
  { de: "Land", target: "land", category: "Unit 1: Weitere Wörter" },
  { de: "abbauen", target: "to take down", category: "Unit 1: Weitere Wörter" },
  { de: "vorsichtig; sorgfältig", target: "careful", category: "Unit 1: Weitere Wörter" },
  { de: "Bauarbeiter; Bauarbeiterin", target: "builder", category: "Unit 1: Weitere Wörter" },
  { de: "schwer; stark", target: "heavy", category: "Unit 1: Weitere Wörter" },
  { de: "hart; schwer; schwierig", target: "hard", category: "Unit 1: Weitere Wörter" },
  { de: "bauen", target: "to build, built, built", category: "Unit 1: Weitere Wörter" },
  { de: "Dach", target: "roof", category: "Unit 1: Weitere Wörter" },
  { de: "Tochter", target: "daughter", category: "Unit 1: Weitere Wörter" },
  { de: "König", target: "king", category: "Unit 1: Weitere Wörter" },
];

const MIGRATION_UNIT2_P24_WORDS = [
  { de: "Frankreich", target: "France", category: "Unit 2" },
  { de: "Text", target: "lines", category: "Unit 2" },
  { de: "Kanonenkugel", target: "cannon ball", category: "Unit 2" },
  { de: "treffen; schlagen", target: "to hit, hit, hit", category: "Unit 2" },
  { de: "Feuerwehrmann; Feuerwehrfrau", target: "firefighter", category: "Unit 2" },
  { de: "fangen; erwischen", target: "to catch, caught, caught", category: "Unit 2" },
  { de: "niemand", target: "nobody", category: "Unit 2" },
  { de: "verletzt", target: "hurt", category: "Unit 2" },
  { de: "Fahrkarte für den Nahverkehr in London", target: "Oyster Card", category: "Unit 2" },
  { de: "Sonnenbrille", target: "sunglasses", category: "Unit 2" },
];

// Unit 2 "Life in London", S. 30-48 (Intro bis Reading Skills), Red Line 2 Bayern.
const MIGRATION_UNIT2_INTRO_WORDS = [
  { de: "weit", target: "far", category: "Unit 2: Intro" },
  { de: "sich Sorgen machen", target: "to worry", category: "Unit 2: Intro" },
  { de: "sich verirren", target: "to get lost", category: "Unit 2: Intro" },
  { de: "würzig; pikant", target: "spicy", category: "Unit 2: Intro" },
  { de: "Soße", target: "sauce", category: "Unit 2: Intro" },
  { de: "reich", target: "rich", category: "Unit 2: Intro" },
  { de: "obdachlos", target: "homeless", category: "Unit 2: Intro" },
  { de: "verkaufen", target: "to sell, sold, sold", category: "Unit 2: Intro" },
  { de: "Tourist; Touristin", target: "tourist", category: "Unit 2: Intro" },
  { de: "freundlich; nett", target: "friendly", category: "Unit 2: Intro" },
  { de: "Verkäufer; Verkäuferin", target: "seller", category: "Unit 2: Intro" },
  { de: "vielleicht", target: "maybe", category: "Unit 2: Intro" },
  { de: "sogar; noch", target: "even", category: "Unit 2: Intro" },
  { de: "Preis", target: "price", category: "Unit 2: Intro" },
  { de: "Musiker; Musikerin", target: "musician", category: "Unit 2: Intro" },
  { de: "Möchtest du ...?", target: "Would you like (to)...?", category: "Unit 2: Intro" },
  { de: "klatschen", target: "to clap", category: "Unit 2: Intro" },
  { de: "warten (auf)", target: "to wait (for)", category: "Unit 2: Intro" },
  { de: "Einkaufszentrum", target: "shopping centre", category: "Unit 2: Intro" },

  { de: "Inlineskaten; Schlittschuhlaufen", target: "skating", category: "Unit 2: Topic 1" },
  { de: "ein bisschen; ein wenig", target: "a bit", category: "Unit 2: Topic 1" },
  { de: "fallen; hinfallen; umfallen", target: "to fall (over)", category: "Unit 2: Topic 1" },
  { de: "Wissenschaft; Naturwissenschaft", target: "Science", category: "Unit 2: Topic 1" },
  { de: "Roboter; Automat", target: "robot", category: "Unit 2: Topic 1" },
  { de: "schnell", target: "fast", category: "Unit 2: Topic 1" },
  { de: "sich interessieren (für); interessiert sein (an)", target: "to be interested (in)", category: "Unit 2: Topic 1" },
  { de: "ich bin dabei", target: "count me in", category: "Unit 2: Topic 1" },
  { de: "einander; sich; sich gegenseitig", target: "each other", category: "Unit 2: Topic 1" },
  { de: "lächeln", target: "to smile", category: "Unit 2: Topic 1" },
  { de: "einer Meinung sein; zustimmen", target: "to agree", category: "Unit 2: Topic 1" },
  { de: "anderer Meinung sein; nicht einverstanden sein", target: "to disagree", category: "Unit 2: Topic 1" },

  { de: "Spieler; Spielerin", target: "player", category: "Unit 2: Topic 2" },
  { de: "unhöflich; unverschämt", target: "rude", category: "Unit 2: Topic 2" },
  { de: "Glück", target: "luck", category: "Unit 2: Topic 2" },
  { de: "bezahlen", target: "to pay, paid, paid", category: "Unit 2: Topic 2" },
  { de: "Miete", target: "rent", category: "Unit 2: Topic 2" },
  { de: "Anfang; Beginn", target: "beginning", category: "Unit 2: Topic 2" },
  { de: "Geldschein", target: "note", category: "Unit 2: Topic 2" },
  { de: "behalten; aufbewahren; belassen; halten", target: "to keep, kept, kept", category: "Unit 2: Topic 2" },
  { de: "zusätzlich; Zusatz-", target: "extra", category: "Unit 2: Topic 2" },
  { de: "Alphabet", target: "alphabet", category: "Unit 2: Topic 2" },

  { de: "suchen nach", target: "to look for", category: "Unit 2: Topic 3" },
  { de: "Schnäppchen", target: "bargain", category: "Unit 2: Topic 3" },
  { de: "hübsch", target: "pretty", category: "Unit 2: Topic 3" },
  { de: "Größe", target: "size", category: "Unit 2: Topic 3" },
  { de: "Blume", target: "flower", category: "Unit 2: Topic 3" },
  { de: "kurz", target: "short", category: "Unit 2: Topic 3" },
  { de: "auch", target: "also", category: "Unit 2: Topic 3" },
  { de: "Rock", target: "skirt", category: "Unit 2: Topic 3" },
  { de: "sicher", target: "sure", category: "Unit 2: Topic 3" },
  { de: "perfekt; vollkommen", target: "perfect", category: "Unit 2: Topic 3" },
  { de: "jmdm. gut stehen", target: "to look good on sb", category: "Unit 2: Topic 3" },
  { de: "anprobieren", target: "to try on", category: "Unit 2: Topic 3" },
  { de: "modisch; elegant", target: "fashionable", category: "Unit 2: Topic 3" },
  { de: "kosten", target: "to cost, cost, cost", category: "Unit 2: Topic 3" },
  { de: "unmodisch", target: "unfashionable", category: "Unit 2: Topic 3" },
  { de: "unbequem; unangenehm", target: "uncomfortable", category: "Unit 2: Topic 3" },
  { de: "angenehm; bequem", target: "comfortable", category: "Unit 2: Topic 3" },
  { de: "locker; lose", target: "loose", category: "Unit 2: Topic 3" },
  { de: "eng; fest", target: "tight", category: "Unit 2: Topic 3" },
  { de: "neu", target: "new", category: "Unit 2: Topic 3" },

  { de: "billig", target: "cheap", category: "Unit 2: Weitere Wörter" },
  { de: "teuer", target: "expensive", category: "Unit 2: Weitere Wörter" },
  { de: "lang", target: "long", category: "Unit 2: Weitere Wörter" },
  { de: "klein", target: "small", category: "Unit 2: Weitere Wörter" },
  { de: "groß", target: "big", category: "Unit 2: Weitere Wörter" },
  { de: "langweilig", target: "boring", category: "Unit 2: Weitere Wörter" },
  { de: "alt", target: "old", category: "Unit 2: Weitere Wörter" },
  { de: "Chance; Gelegenheit; Möglichkeit", target: "chance", category: "Unit 2: Weitere Wörter" },
  { de: "echt; richtig; wirklich", target: "real", category: "Unit 2: Weitere Wörter" },
  { de: "sich beeilen", target: "to hurry (up)", category: "Unit 2: Weitere Wörter" },
  { de: "vergessen", target: "to forget, forgot, forgotten", category: "Unit 2: Weitere Wörter" },
  { de: "gewöhnlich; normal", target: "ordinary", category: "Unit 2: Weitere Wörter" },
  { de: "herunter; hinunter", target: "down", category: "Unit 2: Weitere Wörter" },
  { de: "Fuß", target: "foot, feet", category: "Unit 2: Weitere Wörter" },
  { de: "Pantoffel; Schuh", target: "slipper", category: "Unit 2: Weitere Wörter" },
  { de: "Album", target: "album", category: "Unit 2: Weitere Wörter" },
  { de: "stehen", target: "to stand, stood, stood", category: "Unit 2: Weitere Wörter" },
  { de: "trocken", target: "dry", category: "Unit 2: Weitere Wörter" },
  { de: "schubsen; drängeln; drücken; schieben", target: "to push", category: "Unit 2: Weitere Wörter" },
  { de: "verlegen", target: "embarrassed", category: "Unit 2: Weitere Wörter" },
  { de: "Ehemann", target: "husband", category: "Unit 2: Weitere Wörter" },
  { de: "Umschlag; Briefumschlag", target: "envelope", category: "Unit 2: Weitere Wörter" },
  { de: "beide", target: "both", category: "Unit 2: Weitere Wörter" },
  { de: "Neuigkeit(en); Nachricht(en)", target: "news", category: "Unit 2: Weitere Wörter" },
  { de: "nervös; aufgeregt", target: "nervous", category: "Unit 2: Weitere Wörter" },
  { de: "dumm; blöd", target: "stupid", category: "Unit 2: Weitere Wörter" },
  { de: "glücklich", target: "happy", category: "Unit 2: Weitere Wörter" },
  { de: "traurig", target: "sad", category: "Unit 2: Weitere Wörter" },
  { de: "wütend; zornig; verärgert; böse", target: "angry", category: "Unit 2: Weitere Wörter" },

  { de: "Briefkasten", target: "letterbox", category: "Unit 2: Film" },
  { de: "Telefonzelle", target: "phone box", category: "Unit 2: Film" },

  { de: "gehen um; handeln von", target: "to be about", category: "Unit 2: Reading Skills" },
  { de: "in; hinein", target: "into", category: "Unit 2: Reading Skills" },
  { de: "Freundschaften schließen", target: "to make friends", category: "Unit 2: Reading Skills" },
  { de: "besser", target: "better", category: "Unit 2: Reading Skills" },
  { de: "spannend; aufregend", target: "exciting", category: "Unit 2: Reading Skills" },
  { de: "schließlich; zum Schluss", target: "in the end", category: "Unit 2: Reading Skills" },
  { de: "ändern; verändern", target: "to change", category: "Unit 2: Reading Skills" },
  { de: "sich benehmen; sich verhalten", target: "to behave", category: "Unit 2: Reading Skills" },
  { de: "Bein", target: "leg", category: "Unit 2: Reading Skills" },
];

// Zwei Wörter aus der Film-Box von Unit 2, die im ersten Foto abgeschnitten waren.
const MIGRATION_UNIT2_FILM_EXTRA_WORDS = [
  { de: "Popcorn", target: "popcorn", category: "Unit 2: Film" },
  { de: "Postamt", target: "post office", category: "Unit 2: Film" },
];

// Unit 3 "Adventures in Wales", S. 50-68, Red Line 2 Bayern.
const MIGRATION_UNIT3_WORDS = [
  { de: "Radfahren", target: "cycling", category: "Unit 3: Intro" },
  { de: "Berg", target: "mountain", category: "Unit 3: Intro" },
  { de: "Mountainbike fahren", target: "mountain biking", category: "Unit 3: Intro" },
  { de: "viel; viele; jede Menge", target: "lots of", category: "Unit 3: Intro" },
  { de: "Wanderweg", target: "trail", category: "Unit 3: Intro" },
  { de: "wenn; als", target: "when", category: "Unit 3: Intro" },
  { de: "Seilrutsche", target: "zip line", category: "Unit 3: Intro" },
  { de: "Meile", target: "mile", category: "Unit 3: Intro" },
  { de: "fahren; reisen", target: "to travel", category: "Unit 3: Intro" },
  { de: "Rugby", target: "rugby", category: "Unit 3: Intro" },
  { de: "Walisisch; walisisch; Waliser; Waliserin", target: "Welsh", category: "Unit 3: Intro" },
  { de: "Klettern", target: "rock climbing", category: "Unit 3: Intro" },
  { de: "schön; hübsch", target: "beautiful", category: "Unit 3: Intro" },
  { de: "Art und Weise", target: "way", category: "Unit 3: Intro" },
  { de: "fit; in Form", target: "fit", category: "Unit 3: Intro" },
  { de: "Aussicht; Sicht; Ausblick; Blick", target: "view", category: "Unit 3: Intro" },
  { de: "vorher; zuvor", target: "before", category: "Unit 3: Intro" },
  { de: "Hallen-; Innen-", target: "indoor", category: "Unit 3: Intro" },
  { de: "Mauer; Wand", target: "wall", category: "Unit 3: Intro" },
  { de: "Küste", target: "coast", category: "Unit 3: Intro" },
  { de: "Fluss", target: "river", category: "Unit 3: Intro" },
  { de: "Kanufahren", target: "canoeing", category: "Unit 3: Intro" },
  { de: "Wellenreiten; Surfen", target: "surfing", category: "Unit 3: Intro" },
  { de: "wenn; falls; ob", target: "if", category: "Unit 3: Intro" },
  { de: "setzen; legen; stellen", target: "to put, put, put", category: "Unit 3: Intro" },
  { de: "aufstellen; errichten", target: "to put up", category: "Unit 3: Intro" },

  { de: "Freiluft-; Outdoor-", target: "outdoor", category: "Unit 3: Topic 1" },
  { de: "Zentrum; Mitte; Center", target: "centre", category: "Unit 3: Topic 1" },
  { de: "jede", target: "each", category: "Unit 3: Topic 1" },
  { de: "Skifahren", target: "skiing", category: "Unit 3: Topic 1" },
  { de: "vorziehen", target: "to prefer", category: "Unit 3: Topic 1" },
  { de: "einen Handel mit jmdm. machen", target: "to make a deal with sb", category: "Unit 3: Topic 1" },
  { de: "Socke", target: "sock", category: "Unit 3: Topic 1" },
  { de: "Regenmantel", target: "raincoat", category: "Unit 3: Topic 1" },
  { de: "Sonnencreme", target: "sunscreen", category: "Unit 3: Topic 1" },
  { de: "Mütze; Hut", target: "hat", category: "Unit 3: Topic 1" },
  { de: "Turnschuh", target: "trainer", category: "Unit 3: Topic 1" },
  { de: "warm", target: "warm", category: "Unit 3: Topic 1" },
  { de: "dick (nicht für Personen)", target: "thick", category: "Unit 3: Topic 1" },

  { de: "schließlich; endlich; zum Schluss; letztlich; zuletzt", target: "finally", category: "Unit 3: Topic 2" },
  { de: "gefährlich", target: "dangerous", category: "Unit 3: Topic 2" },
  { de: "Helm", target: "helmet", category: "Unit 3: Topic 2" },
  { de: "zwischen", target: "between", category: "Unit 3: Topic 2" },
  { de: "so ... wie", target: "as ... as", category: "Unit 3: Topic 2" },
  { de: "schwierig", target: "difficult", category: "Unit 3: Topic 2" },
  { de: "ruhig; leise; still", target: "quiet", category: "Unit 3: Topic 2" },
  { de: "beunruhigt; besorgt", target: "worried", category: "Unit 3: Topic 2" },
  { de: "langsam", target: "slow", category: "Unit 3: Topic 2" },
  { de: "stark", target: "strong", category: "Unit 3: Topic 2" },
  { de: "Ball", target: "ball", category: "Unit 3: Topic 2" },
  { de: "Sportler", target: "sportsman, sportsmen", category: "Unit 3: Topic 2" },
  { de: "Wandern", target: "hiking", category: "Unit 3: Topic 2" },
  { de: "italienisch; Italiener; Italienerin; Italienisch; aus Italien", target: "Italian", category: "Unit 3: Topic 2" },
  { de: "Geschichte", target: "history", category: "Unit 3: Topic 2" },
  { de: "Spielkarte", target: "card", category: "Unit 3: Topic 2" },
  { de: "Besucher; Besucherin", target: "visitor", category: "Unit 3: Topic 2" },

  { de: "Camping; Zelten", target: "camping", category: "Unit 3: Weitere Wörter" },
  { de: "Angeln; Fischen", target: "fishing", category: "Unit 3: Weitere Wörter" },

  { de: "anrufen; telefonieren", target: "to phone", category: "Unit 3: Topic 3" },
  { de: "paddeln; rudern", target: "to paddle", category: "Unit 3: Topic 3" },
  { de: "Kanu", target: "canoe", category: "Unit 3: Topic 3" },
  { de: "hineingelangen; hineinkommen", target: "to get into", category: "Unit 3: Topic 3" },
  { de: "Neoprenanzug", target: "wetsuit", category: "Unit 3: Topic 3" },
  { de: "gähnen", target: "to yawn", category: "Unit 3: Topic 3" },
  { de: "schnarchen", target: "to snore", category: "Unit 3: Topic 3" },
  { de: "schlimmste; schlechteste", target: "worst", category: "Unit 3: Topic 3" },
  { de: "Schlaf", target: "sleep", category: "Unit 3: Topic 3" },

  { de: "Schloss; Burg", target: "castle", category: "Unit 3: Text" },
  { de: "Stein", target: "stone", category: "Unit 3: Text" },
  { de: "zusammenzucken; erschrecken; springen", target: "to jump", category: "Unit 3: Text" },
  { de: "Ritter", target: "knight", category: "Unit 3: Text" },
  { de: "durch", target: "through", category: "Unit 3: Text" },
  { de: "Vergangenheit", target: "past", category: "Unit 3: Text" },
  { de: "Geist", target: "ghost", category: "Unit 3: Text" },
  { de: "kochen", target: "to cook", category: "Unit 3: Text" },
  { de: "Fleisch", target: "meat", category: "Unit 3: Text" },
  { de: "einen Turnierzweikampf austragen; turnieren", target: "to joust", category: "Unit 3: Text" },
  { de: "anlegen; anziehen", target: "to put on", category: "Unit 3: Text" },
  { de: "Rüstung", target: "armour", category: "Unit 3: Text" },
  { de: "halten; festhalten", target: "to hold, held, held", category: "Unit 3: Text" },
  { de: "Schwert", target: "sword", category: "Unit 3: Text" },
  { de: "noch; immer noch", target: "still", category: "Unit 3: Text" },
  { de: "Pranger", target: "stocks", category: "Unit 3: Text" },
  { de: "hoffen", target: "to hope", category: "Unit 3: Text" },

  { de: "Höhle", target: "cave", category: "Unit 3: Film" },
  { de: "in ... hinein", target: "inside", category: "Unit 3: Film" },
  { de: "Art; Sorte", target: "kind", category: "Unit 3: Film" },
  { de: "erschrecken", target: "to scare", category: "Unit 3: Film" },

  { de: "Weg", target: "way", category: "Unit 3: Speaking Skills" },
  { de: "(nach) rechts/links abbiegen", target: "to turn right/left", category: "Unit 3: Speaking Skills" },
  { de: "Straße", target: "road", category: "Unit 3: Speaking Skills" },
  { de: "Ende; Schluss", target: "end", category: "Unit 3: Speaking Skills" },
  { de: "Bäckerei", target: "bakery", category: "Unit 3: Speaking Skills" },
  { de: "Uhr", target: "clock", category: "Unit 3: Speaking Skills" },
  { de: "gegenüber", target: "opposite", category: "Unit 3: Speaking Skills" },
];

// Unit 4 "What's up in Scotland?", S. 68-86, Red Line 2 Bayern.
const MIGRATION_UNIT4_WORDS = [
  { de: "Was ist los?; Wie geht's?", target: "What's up?", category: "Unit 4: Intro" },
  { de: "Festival; Fest", target: "festival", category: "Unit 4: Intro" },
  { de: "schottisch", target: "Scottish", category: "Unit 4: Intro" },
  { de: "Tradition", target: "tradition", category: "Unit 4: Intro" },
  { de: "Dudelsack", target: "bagpipes", category: "Unit 4: Intro" },
  { de: "Schottenrock; Kilt", target: "kilt", category: "Unit 4: Intro" },
  { de: "Art; Sorte", target: "kind", category: "Unit 4: Intro" },
  { de: "Wettbewerb; Turnier", target: "competition", category: "Unit 4: Intro" },
  { de: "traditionell", target: "traditional", category: "Unit 4: Intro" },
  { de: "den Baumstamm werfen", target: "to toss the caber", category: "Unit 4: Intro" },
  { de: "im Norden (von)", target: "in the north (of)", category: "Unit 4: Intro" },
  { de: "geboren werden", target: "to be born", category: "Unit 4: Intro" },
  { de: "Führer; Führerin; Anführer; Anführerin", target: "leader", category: "Unit 4: Intro" },
  { de: "kämpfen; (sich) streiten", target: "to fight, fought, fought", category: "Unit 4: Intro" },
  { de: "seltsam; merkwürdig; fremd", target: "strange", category: "Unit 4: Intro" },
  { de: "erfinden", target: "to invent", category: "Unit 4: Intro" },
  { de: "(in der Pfanne) gebraten", target: "fried", category: "Unit 4: Intro" },
  { de: "gesund", target: "healthy", category: "Unit 4: Intro" },
  { de: "Haggis (schottisches Gericht aus Schafsinnereien)", target: "haggis", category: "Unit 4: Intro" },
  { de: "Wurst; Bratwurst", target: "sausage", category: "Unit 4: Intro" },
  { de: "See", target: "lake", category: "Unit 4: Intro" },
  { de: "Ungeheuer; Monster", target: "monster", category: "Unit 4: Intro" },
  { de: "Buttergebäck", target: "shortbread", category: "Unit 4: Intro" },

  { de: "hängen; herumhängen", target: "to hang, hung, hung (around)", category: "Unit 4: Topic 1" },
  { de: "Schlafsack", target: "sleeping bag", category: "Unit 4: Topic 1" },
  { de: "Grill", target: "barbecue", category: "Unit 4: Topic 1" },
  { de: "Projekt", target: "project", category: "Unit 4: Topic 1" },
  { de: "beitreten; sich anschließen; verbinden", target: "to join", category: "Unit 4: Topic 1" },
  { de: "Wohnwagen", target: "caravan", category: "Unit 4: Topic 1" },
  { de: "gerade; jetzt gleich; sofort", target: "right now", category: "Unit 4: Topic 1" },
  { de: "Zeitung", target: "newspaper", category: "Unit 4: Topic 1" },
  { de: "abfahren; verlassen; lassen", target: "to leave, left, left", category: "Unit 4: Topic 1" },
  { de: "Taschenlampe", target: "torch", category: "Unit 4: Topic 1" },
  { de: "Stiefel", target: "boot", category: "Unit 4: Topic 1" },
  { de: "Papier", target: "paper", category: "Unit 4: Topic 1" },
  { de: "Liebe; Liebe Grüße; Herzliche Grüße", target: "love", category: "Unit 4: Topic 1" },

  { de: "ungewöhnlich", target: "unusual", category: "Unit 4: Topic 2" },
  { de: "Jahrhundert", target: "century", category: "Unit 4: Topic 2" },
  { de: "tragen", target: "to carry", category: "Unit 4: Topic 2" },
  { de: "hinauf; oben", target: "up", category: "Unit 4: Topic 2" },
  { de: "heben; hochheben; anheben", target: "to lift", category: "Unit 4: Topic 2" },
  { de: "während", target: "while", category: "Unit 4: Topic 2" },
  { de: "(sich) bewegen; umziehen", target: "to move", category: "Unit 4: Topic 2" },
  { de: "Arzt; Ärztin", target: "doctor", category: "Unit 4: Topic 2" },
  { de: "möglich", target: "possible", category: "Unit 4: Topic 2" },
  { de: "Hammerwurf", target: "hammer throw", category: "Unit 4: Topic 2" },
  { de: "Kette", target: "chain", category: "Unit 4: Topic 2" },
  { de: "Kopf", target: "head", category: "Unit 4: Topic 2" },
  { de: "Atmosphäre; Stimmung", target: "atmosphere", category: "Unit 4: Topic 2" },
  { de: "Tanz", target: "dance", category: "Unit 4: Topic 2" },
  { de: "modern", target: "modern", category: "Unit 4: Topic 2" },
  { de: "regnen", target: "to rain", category: "Unit 4: Topic 2" },

  { de: "Schotte; Schottin", target: "Scot", category: "Unit 4: Topic 3" },
  { de: "Detektiv; Detektivin", target: "detective", category: "Unit 4: Topic 3" },
  { de: "Telefon", target: "telephone", category: "Unit 4: Topic 3" },
  { de: "Zauberer", target: "wizard", category: "Unit 4: Topic 3" },
  { de: "unterrichten; lehren; beibringen", target: "to teach, taught, taught", category: "Unit 4: Topic 3" },
  { de: "bis", target: "until", category: "Unit 4: Topic 3" },
  { de: "zurückkehren; zurückgeben", target: "to return", category: "Unit 4: Topic 3" },
  { de: "werden", target: "to become, became, become", category: "Unit 4: Topic 3" },
  { de: "Patient; Patientin", target: "patient", category: "Unit 4: Topic 3" },
  { de: "danken", target: "to thank", category: "Unit 4: Topic 3" },
  { de: "als", target: "as", category: "Unit 4: Topic 3" },
  { de: "Erfindung", target: "invention", category: "Unit 4: Topic 3" },
  { de: "sterben", target: "to die", category: "Unit 4: Topic 3" },
  { de: "heiraten", target: "to marry", category: "Unit 4: Topic 3" },
  { de: "Erfinder; Erfinderin", target: "inventor", category: "Unit 4: Topic 3" },
  { de: "Regisseur; Regisseurin", target: "director", category: "Unit 4: Topic 3" },
  { de: "Automat; Maschine", target: "machine", category: "Unit 4: Topic 3" },
  { de: "Krankenhaus", target: "hospital", category: "Unit 4: Topic 3" },
  { de: "sportlich", target: "sporty", category: "Unit 4: Topic 3" },

  { de: "Kampf; Schlacht", target: "battle", category: "Unit 4: Text 2" },
  { de: "draußen halten", target: "to keep out", category: "Unit 4: Text 2" },
  { de: "Armee; Heer", target: "army", category: "Unit 4: Text 2" },
  { de: "besiegen; schlagen", target: "to beat, beat, beaten", category: "Unit 4: Text 2" },
  { de: "verlieren", target: "to lose, lost, lost", category: "Unit 4: Text 2" },
  { de: "Soldat; Soldatin", target: "soldier", category: "Unit 4: Text 2" },
  { de: "(sich) verstecken", target: "to hide, hid, hidden", category: "Unit 4: Text 2" },
  { de: "unmöglich", target: "impossible", category: "Unit 4: Text 2" },
  { de: "Höhle", target: "cave", category: "Unit 4: Text 2" },
  { de: "Spinne", target: "spider", category: "Unit 4: Text 2" },
  { de: "Spinnennetz; Netz", target: "web", category: "Unit 4: Text 2" },
  { de: "aufgeben", target: "to give up", category: "Unit 4: Text 2" },
  { de: "ein paar; wenige; einige", target: "a few", category: "Unit 4: Text 2" },
  { de: "tapfer; mutig", target: "brave", category: "Unit 4: Text 2" },
  { de: "krank; schlecht", target: "ill", category: "Unit 4: Text 2" },
  { de: "Sohn", target: "son", category: "Unit 4: Text 2" },
  { de: "Boden; Erdboden", target: "ground", category: "Unit 4: Text 2" },
  { de: "stolz (auf)", target: "proud (of)", category: "Unit 4: Text 2" },
  { de: "Frieden", target: "peace", category: "Unit 4: Text 2" },
  { de: "erfolgreich", target: "successful", category: "Unit 4: Text 2" },

  { de: "Lehrer; Lehrerin", target: "teacher", category: "Unit 4: Weitere Wörter" },
  { de: "Busfahrer; Busfahrerin", target: "bus driver", category: "Unit 4: Weitere Wörter" },
  { de: "Sänger; Sängerin", target: "singer", category: "Unit 4: Weitere Wörter" },
  { de: "Fußballspieler; Fußballspielerin", target: "football player", category: "Unit 4: Weitere Wörter" },

  { de: "Nachricht; SMS", target: "message", category: "Unit 4: Film" },
  { de: "Telefonzelle", target: "pay phone", category: "Unit 4: Film" },
  { de: "Video-Chat", target: "video chat", category: "Unit 4: Film" },
  { de: "reparieren", target: "to repair", category: "Unit 4: Film" },
  { de: "Radio", target: "radio", category: "Unit 4: Film" },
  { de: "vorhaben", target: "to be up to", category: "Unit 4: Film" },
  { de: "direkt", target: "direct", category: "Unit 4: Film" },
  { de: "Anruf; Ruf", target: "call", category: "Unit 4: Film" },
  { de: "verbinden", target: "to connect", category: "Unit 4: Film" },
  { de: "fixieren; befestigen", target: "to fix", category: "Unit 4: Film" },
];

// Unit 5 "Let's go to the USA!", S. 92-107, Red Line 2 Bayern.
const MIGRATION_UNIT5_WORDS = [
  { de: "extrem; radikal", target: "extreme", category: "Unit 5: Intro" },
  { de: "Tornado; Wirbelsturm", target: "tornado, tornadoes", category: "Unit 5: Intro" },
  { de: "Bevölkerung; Einwohner; Einwohnerzahl", target: "population", category: "Unit 5: Intro" },
  { de: "Zeitzone", target: "time zone", category: "Unit 5: Intro" },
  { de: "Präsident; Präsidentin", target: "president", category: "Unit 5: Intro" },
  { de: "Wolkenkratzer", target: "skyscraper", category: "Unit 5: Intro" },
  { de: "Goldsucher; Goldsucherin", target: "gold hunter", category: "Unit 5: Intro" },
  { de: "Ozean; Meer", target: "ocean", category: "Unit 5: Intro" },
  { de: "Temperatur; Fieber", target: "temperature", category: "Unit 5: Intro" },

  { de: "Westen", target: "west", category: "Unit 5: Topic 1" },
  { de: "(wohnte) früher", target: "used to (live)", category: "Unit 5: Topic 1" },
  { de: "Apartment; Wohnung", target: "apartment", category: "Unit 5: Topic 1" },
  { de: "Einwohner; Einwohnerin; Bewohner; Bewohnerin", target: "inhabitant", category: "Unit 5: Topic 1" },
  { de: "eintausend; tausend", target: "a thousand, one thousand", category: "Unit 5: Topic 1" },
  { de: "neblig", target: "foggy", category: "Unit 5: Topic 1" },
  { de: "super; spitze", target: "awesome", category: "Unit 5: Topic 1" },
  { de: "Freizeitpark", target: "amusement park", category: "Unit 5: Topic 1" },
  { de: "leider; unglücklicherweise", target: "unfortunately", category: "Unit 5: Topic 1" },
  { de: "fahren; treiben", target: "to drive, drove, driven", category: "Unit 5: Topic 1" },
  { de: "Million", target: "million", category: "Unit 5: Topic 1" },
  { de: "klein; winzig", target: "tiny", category: "Unit 5: Topic 1" },
  { de: "Dorf", target: "village", category: "Unit 5: Topic 1" },
  { de: "Kornfeld; Maisfeld; Getreidefeld", target: "corn field", category: "Unit 5: Topic 1" },
  { de: "Block; Häuserblock", target: "block", category: "Unit 5: Topic 1" },
  { de: "Einkaufszentrum", target: "shopping mall", category: "Unit 5: Topic 1" },
  { de: "riesig; riesengroß", target: "huge", category: "Unit 5: Topic 1" },
  { de: "Osten", target: "east", category: "Unit 5: Topic 1" },
  { de: "entdecken", target: "to discover", category: "Unit 5: Topic 1" },
  { de: "Staat; Bundesstaat; Land", target: "state", category: "Unit 5: Topic 1" },
  { de: "feiern", target: "to celebrate", category: "Unit 5: Topic 1" },
  { de: "seit; seitdem", target: "since", category: "Unit 5: Topic 1" },
  { de: "windig", target: "windy", category: "Unit 5: Topic 1" },
  { de: "groß", target: "large", category: "Unit 5: Topic 1" },
  { de: "Kilometer (km)", target: "kilometre", category: "Unit 5: Topic 1" },

  { de: "Wettervorhersage", target: "weather forecast", category: "Unit 5: Topic 2" },
  { de: "werden", target: "will", category: "Unit 5: Topic 2" },
  { de: "Sonne", target: "sun", category: "Unit 5: Topic 2" },
  { de: "um; ungefähr; gegen", target: "around", category: "Unit 5: Topic 2" },
  { de: "scheinen; glänzen", target: "to shine, shone, shone", category: "Unit 5: Topic 2" },
  { de: "Fahrenheit", target: "Fahrenheit (F)", category: "Unit 5: Topic 2" },
  { de: "nicht werden", target: "won't", category: "Unit 5: Topic 2" },
  { de: "Regen", target: "rain", category: "Unit 5: Topic 2" },
  { de: "Nebel", target: "fog", category: "Unit 5: Topic 2" },
  { de: "aufklaren; sich aufhellen", target: "to clear", category: "Unit 5: Topic 2" },
  { de: "wahrscheinlich", target: "probably", category: "Unit 5: Topic 2" },
  { de: "Gewitter", target: "thunderstorm", category: "Unit 5: Topic 2" },
  { de: "regnerisch", target: "rainy", category: "Unit 5: Topic 2" },
  { de: "wolkig", target: "cloudy", category: "Unit 5: Topic 2" },
  { de: "schneien", target: "to snow", category: "Unit 5: Topic 2" },

  { de: "Ereignis; Veranstaltung", target: "event", category: "Unit 5: Topic 3" },
  { de: "Fußball", target: "soccer", category: "Unit 5: Topic 3" },
  { de: "oval; eiförmig", target: "oval", category: "Unit 5: Topic 3" },
  { de: "hart", target: "tough", category: "Unit 5: Topic 3" },
  { de: "Kind", target: "kid", category: "Unit 5: Topic 3" },
  { de: "rund", target: "round", category: "Unit 5: Topic 3" },
  { de: "Schläger", target: "bat", category: "Unit 5: Topic 3" },
  { de: "dünn", target: "thin", category: "Unit 5: Topic 3" },
  { de: "Cheerleading (Aktivitäten der Cheerleader)", target: "cheerleading", category: "Unit 5: Topic 3" },
  { de: "Cheerleader (jmd., der eine Sportmannschaft anfeuert)", target: "cheerleader", category: "Unit 5: Topic 3" },
  { de: "Stunt", target: "stunt", category: "Unit 5: Topic 3" },
  { de: "motivieren", target: "to motivate", category: "Unit 5: Topic 3" },
  { de: "Publikum", target: "audience", category: "Unit 5: Topic 3" },
  { de: "erklären", target: "to explain", category: "Unit 5: Topic 3" },
  { de: "Regel", target: "rule", category: "Unit 5: Topic 3" },
  { de: "deine; eure; Ihre", target: "yours", category: "Unit 5: Topic 3" },
  { de: "meins; meine", target: "mine", category: "Unit 5: Topic 3" },
  { de: "nicht treffen; verfehlen", target: "to miss", category: "Unit 5: Topic 3" },
  { de: "unseres; unsere", target: "ours", category: "Unit 5: Topic 3" },
  { de: "Ausrüstung", target: "equipment", category: "Unit 5: Topic 3" },

  { de: "Jubel; Hurraruf", target: "cheer", category: "Unit 5: Text" },
  { de: "aufführen; auftreten; leisten", target: "to perform", category: "Unit 5: Text" },
  { de: "teilnehmen (an)", target: "to take part (in)", category: "Unit 5: Text" },
  { de: "genug; genügend", target: "enough", category: "Unit 5: Text" },
  { de: "Trainer; Trainerin", target: "coach", category: "Unit 5: Text" },
  { de: "sich umziehen", target: "to change", category: "Unit 5: Text" },
  { de: "Umkleideraum; Umkleidekabine", target: "changing room", category: "Unit 5: Text" },
  { de: "Dusche", target: "shower", category: "Unit 5: Text" },
  { de: "normal", target: "normal", category: "Unit 5: Text" },
  { de: "sich fragen; sich Gedanken machen", target: "to wonder", category: "Unit 5: Text" },
  { de: "könnten", target: "might", category: "Unit 5: Text" },
  { de: "Rollstuhl", target: "wheelchair", category: "Unit 5: Text" },
  { de: "Unfall", target: "accident", category: "Unit 5: Text" },
  { de: "Pyramide", target: "pyramid", category: "Unit 5: Text" },
  { de: "rutschen; ausrutschen", target: "to slip", category: "Unit 5: Text" },
  { de: "nicht mehr", target: "not ... anymore", category: "Unit 5: Text" },
  { de: "erfreut sein", target: "to be pleased", category: "Unit 5: Text" },
  { de: "Reihe", target: "row", category: "Unit 5: Text" },

  { de: "plötzlich; auf einmal", target: "suddenly", category: "Unit 5: Writing Skills" },
  { de: "Loch", target: "hole", category: "Unit 5: Writing Skills" },
  { de: "Zaun", target: "fence", category: "Unit 5: Writing Skills" },
  { de: "Kopfsalat", target: "lettuce", category: "Unit 5: Writing Skills" },
];

// Nachtrag zu Unit 5: "Film"-Wörter, die beim ersten Foto übersehen wurden.
const MIGRATION_UNIT5_FILM_EXTRA_WORDS = [
  { de: "Trailer", target: "trailer", category: "Unit 5: Film" },
  { de: "Brieffreund; Brieffreundin", target: "e-pal", category: "Unit 5: Film" },
];

// Unit 6 "Teenage life in the USA", S. 112-126, Red Line 2 Bayern.
const MIGRATION_UNIT6_WORDS = [
  { de: "jugendlich", target: "teenage", category: "Unit 6: Intro" },
  { de: "Teenager; Jugendliche; Jugendlicher", target: "teenager", category: "Unit 6: Intro" },
  { de: "Basketballkorb", target: "basketball hoop", category: "Unit 6: Intro" },
  { de: "anderen", target: "others", category: "Unit 6: Intro" },
  { de: "online", target: "online", category: "Unit 6: Intro" },
  { de: "Gastronomiebereich in einem Einkaufszentrum", target: "food court", category: "Unit 6: Intro" },
  { de: "Smartphone", target: "smartphone", category: "Unit 6: Intro" },
  { de: "soziales Netzwerk; soziale Kontakte", target: "social network", category: "Unit 6: Intro" },
  { de: "chatten; plaudern", target: "to chat", category: "Unit 6: Intro" },
  { de: "teilen", target: "to share", category: "Unit 6: Intro" },
  { de: "Video", target: "video", category: "Unit 6: Intro" },
  { de: "Camp; Lager", target: "camp", category: "Unit 6: Intro" },

  { de: "T-Shirt", target: "T-shirt", category: "Unit 6: Topic 1" },
  { de: "Laden; Geschäft", target: "store", category: "Unit 6: Topic 1" },
  { de: "unten; im Untergeschoss; nach unten", target: "downstairs", category: "Unit 6: Topic 1" },
  { de: "vorbei (an)", target: "past", category: "Unit 6: Topic 1" },
  { de: "es eilig haben; in Eile sein", target: "to be in a hurry", category: "Unit 6: Topic 1" },
  { de: "gefroren; tiefgefroren", target: "frozen", category: "Unit 6: Topic 1" },
  { de: "Joghurt", target: "yogurt", category: "Unit 6: Topic 1" },
  { de: "Brieftasche; Geldbörse", target: "wallet", category: "Unit 6: Topic 1" },
  { de: "Was ist los?; Was stimmt nicht?", target: "What's wrong?", category: "Unit 6: Topic 1" },
  { de: "peinlich", target: "embarrassing", category: "Unit 6: Topic 1" },
  { de: "schrecklich; furchtbar", target: "terrible", category: "Unit 6: Topic 1" },
  { de: "jeder (beliebige); irgendjemand", target: "anybody", category: "Unit 6: Topic 1" },
  { de: "Schock", target: "shock", category: "Unit 6: Topic 1" },
  { de: "Typ; Kerl", target: "guy", category: "Unit 6: Topic 1" },
  { de: "Tasche; Hosentasche", target: "pocket", category: "Unit 6: Topic 1" },
  { de: "Dieb; Diebin", target: "thief, thieves", category: "Unit 6: Topic 1" },
  { de: "Polizei", target: "police", category: "Unit 6: Topic 1" },

  { de: "darstellende Künste", target: "Performing Arts", category: "Unit 6: Topic 2" },
  { de: "überall", target: "all over", category: "Unit 6: Topic 2" },
  { de: "ausprobieren", target: "to try out", category: "Unit 6: Topic 2" },
  { de: "Bär", target: "bear", category: "Unit 6: Topic 2" },
  { de: "Segeln", target: "sailing", category: "Unit 6: Topic 2" },
  { de: "Künstler; Künstlerin", target: "artist", category: "Unit 6: Topic 2" },
  { de: "Hütte", target: "cabin", category: "Unit 6: Topic 2" },
  { de: "Versuch", target: "experiment", category: "Unit 6: Topic 2" },
  { de: "erkunden; erforschen", target: "to explore", category: "Unit 6: Topic 2" },
  { de: "Vulkan", target: "volcano, volcanoes", category: "Unit 6: Topic 2" },
  { de: "Wissenschaftler; Wissenschaftlerin", target: "scientist", category: "Unit 6: Topic 2" },
  { de: "Professor; Professorin", target: "professor", category: "Unit 6: Topic 2" },
  { de: "Ingenieur; Ingenieurin; Techniker; Technikerin", target: "engineer", category: "Unit 6: Topic 2" },
  { de: "Pfannkuchen", target: "pancake", category: "Unit 6: Topic 2" },
  { de: "wessen", target: "whose", category: "Unit 6: Topic 2" },
  { de: "Datum; Zeitpunkt; Verabredung; Date", target: "date", category: "Unit 6: Topic 2" },

  { de: "unglücklich", target: "unhappy", category: "Unit 6: Topic 3" },
  { de: "online stellen; posten", target: "to post", category: "Unit 6: Topic 3" },
  { de: "Nachricht; SMS", target: "message", category: "Unit 6: Topic 3" },
  { de: "erkennen; anerkennen", target: "to recognize", category: "Unit 6: Topic 3" },
  { de: "Taschendieb; Taschendiebin", target: "pickpocket", category: "Unit 6: Topic 3" },
  { de: "Wachmann; Wachfrau", target: "security guard", category: "Unit 6: Topic 3" },
  { de: "schicken; senden", target: "to send, sent, sent", category: "Unit 6: Topic 3" },
  { de: "aufgebracht; bestürzt", target: "upset", category: "Unit 6: Topic 3" },
  { de: "verschwunden sein; weg sein", target: "to be gone", category: "Unit 6: Topic 3" },
  { de: "aus ... heraus", target: "out of", category: "Unit 6: Topic 3" },
  { de: "Funkgerät", target: "walkie-talkie", category: "Unit 6: Topic 3" },
  { de: "überprüfen; kontrollieren", target: "to check", category: "Unit 6: Topic 3" },
  { de: "piepen", target: "to beep", category: "Unit 6: Topic 3" },
  { de: "Sprachnachricht", target: "voice message", category: "Unit 6: Topic 3" },
  { de: "oben; im Obergeschoss; nach oben", target: "upstairs", category: "Unit 6: Topic 3" },
  { de: "enttäuscht", target: "disappointed", category: "Unit 6: Topic 3" },
  { de: "schreien; rufen; weinen", target: "to cry", category: "Unit 6: Topic 3" },
  { de: "Pech; Unglück", target: "bad luck", category: "Unit 6: Topic 3" },
  { de: "selbst; selber", target: "myself", category: "Unit 6: Topic 3" },
  { de: "soziale Medien", target: "social media", category: "Unit 6: Topic 3" },

  { de: "verrückt (nach); wütend", target: "mad (about)", category: "Unit 6: Text" },
  { de: "App", target: "app", category: "Unit 6: Text" },
  { de: "von Angesicht zu Angesicht", target: "face-to-face", category: "Unit 6: Text" },
  { de: "Video-Chat", target: "video chat", category: "Unit 6: Text" },
  { de: "dich selbst", target: "yourself", category: "Unit 6: Text" },
  { de: "herunterladen", target: "to download", category: "Unit 6: Text" },
  { de: "Kommentar", target: "comment", category: "Unit 6: Text" },
  { de: "vergleichen", target: "to compare", category: "Unit 6: Text" },
  { de: "(etw.) wichtig nehmen; sich interessieren (für); sich kümmern (um)", target: "to care (about sth)", category: "Unit 6: Text" },
  { de: "Technologie", target: "technology", category: "Unit 6: Text" },
  { de: "schlau; klug; intelligent", target: "clever", category: "Unit 6: Text" },
  { de: "in Verbindung bleiben", target: "to stay in touch", category: "Unit 6: Text" },
  { de: "deutsch; aus Deutschland", target: "German", category: "Unit 6: Text" },
  { de: "Forum", target: "forum", category: "Unit 6: Text" },
  { de: "Rat; Ratschlag", target: "advice", category: "Unit 6: Text" },
  { de: "Information; Informationen", target: "information", category: "Unit 6: Text" },
  { de: "alles", target: "everything", category: "Unit 6: Text" },
  { de: "wahr", target: "true", category: "Unit 6: Text" },
  { de: "gemein; garstig; scheußlich", target: "nasty", category: "Unit 6: Text" },
  { de: "Cyberbully", target: "cyberbully", category: "Unit 6: Text" },
  { de: "richtig; anständig; ordentlich", target: "properly", category: "Unit 6: Text" },
  { de: "Profil; Steckbrief", target: "profile", category: "Unit 6: Text" },
  { de: "Foto", target: "photo", category: "Unit 6: Text" },

  { de: "die freie Natur", target: "the outdoors", category: "Unit 6: Film" },
  { de: "Vorstellungsgespräch", target: "job interview", category: "Unit 6: Film" },
  { de: "vertrauen", target: "to trust", category: "Unit 6: Film" },
];

// ---------------- Migrations (Red Line 3, 7. Klasse) ----------------

// 7. Klasse, Unit 1 "A long time ago ...", S. 10-11.
const MIGRATION_GRADE7_UNIT1_WORDS = [
  { de: "Kreis; Ring", target: "circle", category: "7. Klasse – Unit 1: Intro" },
  { de: "Römer; Römerin; römisch", target: "Roman", category: "7. Klasse – Unit 1: Intro" },
  { de: "schützen", target: "to protect", category: "7. Klasse – Unit 1: Intro" },
  { de: "Reich; Kaiserreich", target: "empire", category: "7. Klasse – Unit 1: Intro" },
  { de: "dauern", target: "to take", category: "7. Klasse – Unit 1: Intro" },
  { de: "Wikinger; Wikingerin; Wikinger-", target: "Viking", category: "7. Klasse – Unit 1: Intro" },
  { de: "Zeitalter", target: "age", category: "7. Klasse – Unit 1: Intro" },
  { de: "am Ende; zum Schluss", target: "at the end", category: "7. Klasse – Unit 1: Intro" },
  { de: "nördlich", target: "northern", category: "7. Klasse – Unit 1: Intro" },
  { de: "Dänemark", target: "Denmark", category: "7. Klasse – Unit 1: Intro" },
  { de: "Norwegen", target: "Norway", category: "7. Klasse – Unit 1: Intro" },
  { de: "angreifen", target: "to attack", category: "7. Klasse – Unit 1: Intro" },
  { de: "Normanne; Normannin; normannisch", target: "Norman", category: "7. Klasse – Unit 1: Intro" },
  { de: "gründen", target: "to found, founded, founded", category: "7. Klasse – Unit 1: Intro" },
  { de: "stark; mächtig; bedeutend; beeindruckend", target: "powerful", category: "7. Klasse – Unit 1: Intro" },
  { de: "industrielle Revolution", target: "Industrial Revolution", category: "7. Klasse – Unit 1: Intro" },
  { de: "erzeugen; herstellen; anbauen", target: "to produce", category: "7. Klasse – Unit 1: Intro" },
  { de: "Industrie; Branche", target: "industry", category: "7. Klasse – Unit 1: Intro" },
  { de: "laut", target: "noisy", category: "7. Klasse – Unit 1: Intro" },
  { de: "dreckig; schmutzig", target: "dirty", category: "7. Klasse – Unit 1: Intro" },
  { de: "damals; zu der Zeit", target: "at that time", category: "7. Klasse – Unit 1: Intro" },
  { de: "wiegen", target: "to weigh", category: "7. Klasse – Unit 1: Intro" },
  { de: "Tonne", target: "tonne", category: "7. Klasse – Unit 1: Intro" },
  { de: "Grab", target: "grave", category: "7. Klasse – Unit 1: Intro" },
  { de: "heilig", target: "holy", category: "7. Klasse – Unit 1: Intro" },
];

function applyMigration(id, entries, unit, grade) {
  DATA.appliedMigrations = DATA.appliedMigrations || [];
  if (DATA.appliedMigrations.includes(id)) return;
  entries.forEach(w => {
    const key = (s) => s.trim().toLowerCase();
    const exists = DATA.words.some(x =>
      x.language === "en" && key(x.de) === key(w.de) && key(x.target) === key(w.target)
    );
    if (!exists) {
      const word = makeWord("en", w.de, w.target, w.category);
      word.unit = unit || null;
      word.grade = grade || "6";
      DATA.words.push(word);
    }
  });
  DATA.appliedMigrations.push(id);
  persist();
}

function applyTiagoMigrations() {
  applyMigration("redline2-unit1-2026-08", MIGRATION_UNIT1_WORDS, "1");
  applyMigration("redline2-unit2-p24-2026-08", MIGRATION_UNIT2_P24_WORDS, "2");
  applyMigration("redline2-unit2-intro-p30-48-2026-08", MIGRATION_UNIT2_INTRO_WORDS, "2");
  applyMigration("redline2-unit2-film-extra-2026-08", MIGRATION_UNIT2_FILM_EXTRA_WORDS, "2");
  applyMigration("redline2-unit3-p50-68-2026-08", MIGRATION_UNIT3_WORDS, "3");
  applyMigration("redline2-unit4-p68-86-2026-08", MIGRATION_UNIT4_WORDS, "4");
  applyMigration("redline2-unit5-p92-107-2026-08", MIGRATION_UNIT5_WORDS, "5");
  applyMigration("redline2-unit5-film-extra-2026-08", MIGRATION_UNIT5_FILM_EXTRA_WORDS, "5");
  applyMigration("redline2-unit6-p112-126-2026-08", MIGRATION_UNIT6_WORDS, "6");
  applyMigration("redline3-grade7-unit1-p10-11-2026-09", MIGRATION_GRADE7_UNIT1_WORDS, "1", "7");
  applyGrammarMigration("redline2-irregular-verbs-p204-2026-08", BOOK_IRREGULAR_VERBS_P204);
}

// Ordnet bereits vorhandenen Wörtern (aus der Zeit vor der Unit-Auswahl) nachträglich
// eine Unit zu, anhand ihrer Kategorie. Läuft einmalig pro Wort, idempotent.
function ensureWordUnits() {
  let changed = false;
  DATA.words.forEach(w => {
    if (w.unit === undefined) {
      if (/^Unit 1\b/.test(w.category || "")) w.unit = "1";
      else if (/^Unit 2\b/.test(w.category || "")) w.unit = "2";
      else w.unit = null;
      changed = true;
    }
  });
  if (changed) persist();
}

function makeWord(language, de, target, category) {
  return {
    id: "w_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    language, de, target, category: category || "",
    unit: null,
    grade: currentGrade || "6",
    box: 1,
    nextReview: todayStr(),
    correct: 0,
    wrong: 0,
  };
}

// ---------------- Leitner scheduling ----------------

function reviewCorrect(word) {
  word.box = Math.min(MAX_BOX, word.box + 1);
  word.nextReview = addDays(todayStr(), BOX_INTERVALS_DAYS[word.box]);
  word.correct++;
  persist();
}

function reviewWrong(word) {
  word.box = 1;
  word.nextReview = todayStr();
  word.wrong++;
  persist();
}

function wordsForLang(lang) {
  return DATA.words.filter(w => w.language === lang);
}

function wordsForLangUnit(lang, unit) {
  const pool = wordsForLang(lang).filter(w => (w.grade || "6") === currentGrade);
  return (!unit || unit === "all") ? pool : pool.filter(w => w.unit === unit);
}

function dueWords(lang, unit) {
  const t = todayStr();
  return wordsForLangUnit(lang, unit).filter(w => w.nextReview <= t);
}

// ---------------- Points & streak ----------------

function addPoints(n) {
  DATA.points += n;
  updateHeaderStats();
}

function bumpStreak() {
  const t = todayStr();
  if (DATA.streak.lastDate === t) return; // already counted today
  const yesterday = addDays(t, -1);
  if (DATA.streak.lastDate === yesterday) {
    DATA.streak.count++;
  } else {
    DATA.streak.count = 1;
  }
  DATA.streak.lastDate = t;
}

function updateHeaderStats() {
  if (!DATA) return;
  const profile = PROFILES.find(p => p.id === ACTIVE_PROFILE);
  document.getElementById("pill-player").textContent = "👤 " + (profile ? profile.name : "");
  document.getElementById("pill-points").textContent = "⭐ " + DATA.points;
  document.getElementById("pill-streak").textContent = "🔥 " + DATA.streak.count;
  document.getElementById("nav-snake-btn").classList.toggle("hidden", !snakeUnlocked() && !SNAKE_PREVIEW);
}

function snakeUnlocked() {
  return !!DATA && DATA.points >= SNAKE_UNLOCK_POINTS;
}

// ---------------- Player select ----------------

const SNAKE_PREVIEW = new URLSearchParams(location.search).get("snake") === "1";

function selectProfile(profileId) {
  ACTIVE_PROFILE = profileId;
  DATA = loadData(profileId);
  if (profileId === "tiago") applyTiagoMigrations();
  ensureGrammarSeed();
  ensureWordUnits();
  updateHeaderStats();
  showView(SNAKE_PREVIEW ? "snake" : "home");
}

function renderPlayers() {
  const wrap = document.getElementById("player-cards");
  wrap.innerHTML = "";
  PROFILES.forEach(p => {
    const card = document.createElement("div");
    card.className = "lang-card player-card";
    card.innerHTML = `
      <div class="lang-flag ${p.avatarClass}">${escapeHtml(p.name.charAt(0))}</div>
      <h2>${escapeHtml(p.name)}</h2>
    `;
    card.addEventListener("click", () => selectProfile(p.id));
    wrap.appendChild(card);
  });
}

document.getElementById("pill-player").addEventListener("click", () => {
  showView("players");
});

// ---------------- View routing ----------------

const VIEWS = ["players", "home", "learn", "grammar", "grammar-modes", "session", "result", "manage", "stats", "snake"];

function showView(name) {
  if (name !== "players" && !ACTIVE_PROFILE) name = "players";
  if (name === "snake" && !snakeUnlocked() && !SNAKE_PREVIEW) name = "home";
  if (name !== "snake") stopSnakeGame();
  VIEWS.forEach(v => {
    document.getElementById("view-" + v).classList.toggle("hidden", v !== name);
  });
  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.nav === name);
  });
  document.getElementById("topnav").classList.toggle("hidden", name === "players");
  document.getElementById("header-stats").classList.toggle("hidden", name === "players");
  if (name === "players") renderPlayers();
  if (name === "home") renderHome();
  if (name === "learn") renderLearn();
  if (name === "grammar") renderGrammarTopics();
  if (name === "grammar-modes") renderGrammarModes();
  if (name === "manage") renderManage();
  if (name === "stats") renderStats();
  if (name === "snake") renderSnakeEntry();
}

document.querySelectorAll("[data-nav]").forEach(el => {
  el.addEventListener("click", () => showView(el.dataset.nav));
});

// ---------------- HOME ----------------

function renderHome() {
  document.getElementById("home-en-count").textContent = wordsForLang("en").length + " Vokabeln";
  document.getElementById("home-es-count").textContent = wordsForLang("es").length + " Vokabeln";

  const dueEn = dueWords("en").length;
  const dueEs = dueWords("es").length;
  const banner = document.getElementById("due-banner");
  const total = dueEn + dueEs;
  document.getElementById("snake-unlock-banner").classList.toggle("hidden", !snakeUnlocked());

  if (total > 0) {
    banner.textContent = `📌 ${total} Vokabel${total === 1 ? "" : "n"} warten heute auf dich!`;
    banner.classList.add("show");
  } else {
    banner.classList.remove("show");
  }
}

document.querySelectorAll("[data-start-lang]").forEach(btn => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.startLang;
    showView("learn");
  });
});

// ---------------- LEARN (mode picker) ----------------

let currentLang = "en";
let currentUnit = "all"; // "all" | "1" | "2" — gilt für Vokabeln (nur Englisch) und Grammatik
let currentGrade = "6"; // Überordner über den Units, z.B. "6" für 6. Klasse

function renderLearn() {
  document.querySelectorAll("[data-set-lang]").forEach(b => {
    b.classList.toggle("active", b.dataset.setLang === currentLang);
  });
  const langName = currentLang === "en" ? "Englisch" : "Spanisch";
  document.getElementById("learn-title").textContent = `${langName} — wie möchtest du üben?`;
  document.querySelectorAll("[data-set-grade]").forEach(b => {
    b.classList.toggle("active", b.dataset.setGrade === currentGrade);
  });
  document.querySelectorAll("[data-set-unit]").forEach(b => {
    b.classList.toggle("active", b.dataset.setUnit === currentUnit);
  });
  // Units gibt es aktuell nur für Englisch, bei Spanisch macht die Auswahl keinen Sinn.
  document.getElementById("learn-grade-toggle").classList.toggle("hidden", currentLang !== "en");
  // Jede Klassenstufe hat ihre eigene Unit-Reihe (unterschiedliche Anzahl an Units).
  document.getElementById("learn-unit-toggle-6").classList.toggle("hidden", currentLang !== "en" || currentGrade !== "6");
  document.getElementById("learn-unit-toggle-7").classList.toggle("hidden", currentLang !== "en" || currentGrade !== "7");
}

document.querySelectorAll("[data-set-lang]").forEach(b => {
  b.addEventListener("click", () => { currentLang = b.dataset.setLang; renderLearn(); });
});

document.querySelectorAll("[data-set-grade]").forEach(b => {
  b.addEventListener("click", () => {
    currentGrade = b.dataset.setGrade;
    currentUnit = "all";
    document.querySelectorAll("[data-set-grade]").forEach(x => {
      x.classList.toggle("active", x.dataset.setGrade === currentGrade);
    });
    document.querySelectorAll("[data-set-unit]").forEach(x => {
      x.classList.toggle("active", x.dataset.setUnit === currentUnit);
    });
    if (!document.getElementById("view-grammar").classList.contains("hidden")) renderGrammarTopics();
    if (!document.getElementById("view-learn").classList.contains("hidden")) renderLearn();
  });
});

document.querySelectorAll("[data-set-unit]").forEach(b => {
  b.addEventListener("click", () => {
    currentUnit = b.dataset.setUnit;
    document.querySelectorAll("[data-set-unit]").forEach(x => {
      x.classList.toggle("active", x.dataset.setUnit === currentUnit);
    });
    if (!document.getElementById("view-grammar").classList.contains("hidden")) renderGrammarTopics();
  });
});

document.querySelectorAll("[data-mode]").forEach(b => {
  b.addEventListener("click", () => startSession(currentLang, b.dataset.mode));
});

document.querySelectorAll("[data-grammar-mode]").forEach(b => {
  b.addEventListener("click", () => startGrammarSession(b.dataset.grammarMode));
});

// ---------------- SESSION engine ----------------

let session = null; // { lang, mode, queue: [word...], index, correct, wrong, xp }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startSession(lang, mode) {
  const effectiveUnit = lang === "en" ? currentUnit : "all";
  const pool = wordsForLangUnit(lang, effectiveUnit);
  if (pool.length === 0) {
    alert("Für diese Auswahl gibt es noch keine Vokabeln. Wähle eine andere Unit oder füge welche hinzu!");
    showView("manage");
    return;
  }

  if (mode === "memory") {
    startMemorySession(lang, pool);
    return;
  }

  if ((mode === "mc") && pool.length < 4) {
    alert("Für Multiple Choice brauchst du mindestens 4 Vokabeln in dieser Auswahl. Wähle eine andere Unit oder füge welche hinzu!");
    showView("manage");
    return;
  }

  let due = dueWords(lang, effectiveUnit);
  let queue = due.length > 0 ? due : pool; // if nothing due, practice everything
  queue = shuffle(queue).slice(0, Math.min(queue.length, 15));

  session = { lang, mode, queue, index: 0, correct: 0, wrong: 0, xp: 0, wrongRepeats: {} };
  showView("session");
  renderSessionStep();
}

const MAX_WRONG_REQUEUES = 2; // Wort erscheint bei Fehler noch bis zu 2x erneut in derselben Übung

function requeueIfWrong(word) {
  const count = (session.wrongRepeats[word.id] || 0) + 1;
  session.wrongRepeats[word.id] = count;
  if (count <= MAX_WRONG_REQUEUES) {
    session.queue.push(word);
  }
}

document.getElementById("session-quit").addEventListener("click", () => {
  if (confirm("Übung wirklich abbrechen?")) showView(session && session.kind === "grammar" ? "grammar-modes" : "learn");
});

function updateSessionHeader() {
  const total = session.queue.length;
  const done = session.index;
  document.getElementById("session-progress-text").textContent = `${done} / ${total}`;
  document.getElementById("session-progress-fill").style.width = (total ? (done / total * 100) : 0) + "%";
  document.getElementById("session-score").textContent = "⭐ " + session.xp;
}

function finishSession() {
  bumpStreak();
  addPoints(session.xp);
  persist();

  const total = session.correct + session.wrong;
  const pct = total ? Math.round(session.correct / total * 100) : 100;
  document.getElementById("result-emoji").textContent = pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪";
  document.getElementById("result-title").textContent =
    pct >= 80 ? "Super gemacht!" : pct >= 50 ? "Gut gemacht!" : "Weiter so!";
  document.getElementById("result-sub").textContent = `Du hast ${pct}% richtig beantwortet.`;
  document.getElementById("result-correct").textContent = session.correct;
  document.getElementById("result-wrong").textContent = session.wrong;
  document.getElementById("result-xp").textContent = session.xp;

  const lang = session.lang, mode = session.mode, kind = session.kind;
  document.getElementById("result-again").onclick = () => {
    if (kind === "grammar") startGrammarSession(mode);
    else startSession(lang, mode);
  };

  showView("result");
}

function renderSessionStep() {
  updateSessionHeader();
  if (session.index >= session.queue.length) {
    finishSession();
    return;
  }
  const body = document.getElementById("session-body");
  body.innerHTML = "";
  if (session.kind === "grammar" && session.contentType === "verb") {
    if (session.mode === "fill") renderGrammarFill(body);
    else if (session.mode === "mc") renderGrammarMC(body);
    else if (session.mode === "order") renderGrammarOrder(body);
    return;
  }
  if (session.kind === "grammar" && session.contentType === "sentence") {
    if (session.mode === "fill") renderSentenceFill(body);
    else if (session.mode === "mc") renderSentenceMC(body);
    else if (session.mode === "order") renderSentenceOrder(body);
    return;
  }
  if (session.mode === "flash") renderFlashcard(body);
  else if (session.mode === "mc") renderMultipleChoice(body);
  else if (session.mode === "type") renderTyping(body);
}

// ---- Flashcards ----

function renderFlashcard(body) {
  const word = session.queue[session.index];
  const wrap = document.createElement("div");
  wrap.className = "flashcard-wrap";

  const card = document.createElement("div");
  card.className = "flashcard";
  card.innerHTML = `${escapeHtml(word.de)}<span class="fc-hint">Tippen zum Umdrehen 👆</span>`;

  const actions = document.createElement("div");
  actions.className = "flash-actions hidden";
  actions.innerHTML = `
    <button class="btn btn-danger" id="fc-wrong">❌ Falsch</button>
    <button class="btn btn-secondary" id="fc-correct">✅ Richtig</button>
  `;

  let flipped = false;
  card.addEventListener("click", () => {
    flipped = !flipped;
    card.classList.toggle("flipped", flipped);
    card.innerHTML = flipped
      ? `${escapeHtml(word.target)}<span class="fc-hint">War deine Antwort richtig?</span>`
      : `${escapeHtml(word.de)}<span class="fc-hint">Tippen zum Umdrehen 👆</span>`;
    actions.classList.toggle("hidden", !flipped);
  });

  wrap.appendChild(card);
  wrap.appendChild(actions);
  body.appendChild(wrap);

  actions.querySelector("#fc-correct").addEventListener("click", () => {
    reviewCorrect(word); session.correct++; session.xp += 10;
    session.index++; renderSessionStep();
  });
  actions.querySelector("#fc-wrong").addEventListener("click", () => {
    reviewWrong(word); session.wrong++; requeueIfWrong(word);
    session.index++; renderSessionStep();
  });
}

// ---- Multiple choice ----

function renderMultipleChoice(body) {
  const word = session.queue[session.index];
  const pool = wordsForLang(session.lang).filter(w => w.id !== word.id);
  const usedAnswers = new Set([normalize(word.target)]);
  const distractors = [];
  shuffle(pool).forEach(w => {
    if (distractors.length >= 3) return;
    if (usedAnswers.has(normalize(w.target))) return;
    usedAnswers.add(normalize(w.target));
    distractors.push(w.target);
  });
  const options = shuffle([word.target, ...distractors]);

  const wrap = document.createElement("div");
  wrap.className = "mc-wrap";
  wrap.innerHTML = `<div class="mc-question">${escapeHtml(word.de)}</div><div class="mc-options"></div>`;
  const optWrap = wrap.querySelector(".mc-options");

  let answered = false;
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "mc-option";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const isCorrect = opt === word.target;
      btn.classList.add(isCorrect ? "correct" : "wrong");
      if (!isCorrect) {
        [...optWrap.children].find(b => b.textContent === word.target).classList.add("correct");
      }
      if (isCorrect) { reviewCorrect(word); session.correct++; session.xp += 10; }
      else { reviewWrong(word); session.wrong++; requeueIfWrong(word); }
      setTimeout(() => { session.index++; renderSessionStep(); }, 900);
    });
    optWrap.appendChild(btn);
  });

  body.appendChild(wrap);
}

// ---- Typing ----

function normalize(s) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Ein Vokabelfeld wie "to write, wrote, written" oder "was, were" gilt als richtig
// beantwortet, wenn eine der Formen getroffen wird - auch ohne führendes "to" bei
// Verben oder optionale Klammerzusätze wie bei "had (got)".
function acceptableAnswers(target) {
  const variants = new Set();
  target.split(",").map(s => s.trim()).filter(Boolean).forEach(part => {
    variants.add(normalize(part));
    const withoutTo = part.replace(/^to\s+/i, "");
    if (withoutTo !== part) variants.add(normalize(withoutTo));
    const withoutParens = part.replace(/\s*\([^)]*\)/g, "").trim();
    if (withoutParens && withoutParens !== part) variants.add(normalize(withoutParens));
  });
  return variants;
}

function renderTyping(body) {
  const word = session.queue[session.index];
  const wrap = document.createElement("div");
  wrap.className = "type-wrap";
  wrap.innerHTML = `
    <div class="type-question">${escapeHtml(word.de)}</div>
    <input type="text" id="type-input" placeholder="Übersetzung eingeben..." autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="type-feedback" id="type-feedback"></div>
    <button class="btn btn-primary" id="type-submit">Prüfen</button>
  `;
  body.appendChild(wrap);

  const input = wrap.querySelector("#type-input");
  const feedback = wrap.querySelector("#type-feedback");
  const submitBtn = wrap.querySelector("#type-submit");
  input.focus();

  let answered = false;
  function submit() {
    if (answered) return;
    answered = true;
    const isCorrect = acceptableAnswers(word.target).has(normalize(input.value));
    input.classList.add(isCorrect ? "correct" : "wrong");
    input.disabled = true;
    if (isCorrect) {
      feedback.textContent = "✅ Richtig!";
      feedback.className = "type-feedback correct";
      reviewCorrect(word); session.correct++; session.xp += 15;
    } else {
      feedback.textContent = `❌ Richtig wäre: ${word.target}`;
      feedback.className = "type-feedback wrong";
      reviewWrong(word); session.wrong++; requeueIfWrong(word);
    }
    setTimeout(() => { session.index++; renderSessionStep(); }, 1300);
  }

  submitBtn.addEventListener("click", submit);
  input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
}

// ---- Memory game ----

function startMemorySession(lang, pool) {
  const pairsCount = Math.min(6, pool.length);
  const chosen = shuffle(pool).slice(0, pairsCount);

  let cards = [];
  chosen.forEach(w => {
    cards.push({ key: w.id, text: w.de, matched: false });
    cards.push({ key: w.id, text: w.target, matched: false });
  });
  cards = shuffle(cards);

  session = { lang, mode: "memory", cards, matchedPairs: 0, totalPairs: pairsCount, moves: 0, xp: 0, correct: 0, wrong: 0, first: null, lock: false };
  showView("session");
  renderMemory();
}

function renderMemory() {
  document.getElementById("session-progress-text").textContent = `${session.matchedPairs} / ${session.totalPairs} Paare`;
  document.getElementById("session-progress-fill").style.width = (session.totalPairs ? session.matchedPairs / session.totalPairs * 100 : 0) + "%";
  document.getElementById("session-score").textContent = "⭐ " + session.xp;

  const body = document.getElementById("session-body");
  body.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "memory-grid";

  session.cards.forEach((c, i) => {
    const el = document.createElement("div");
    el.className = "memory-card" + (c.matched ? " matched" : "") + (c.flipped ? " flipped" : "");
    el.textContent = (c.flipped || c.matched) ? c.text : "❓";
    el.addEventListener("click", () => onMemoryCardClick(i));
    grid.appendChild(el);
  });

  body.appendChild(grid);

  if (session.matchedPairs === session.totalPairs) {
    setTimeout(finishMemorySession, 600);
  }
}

function onMemoryCardClick(i) {
  if (session.lock) return;
  const c = session.cards[i];
  if (c.matched || c.flipped) return;

  c.flipped = true;
  renderMemory();

  if (session.first === null) {
    session.first = i;
    return;
  }

  const firstCard = session.cards[session.first];
  session.lock = true;
  session.moves++;

  if (firstCard.key === c.key && session.first !== i) {
    firstCard.matched = true; c.matched = true;
    session.matchedPairs++; session.xp += 8; session.correct++;
    session.first = null; session.lock = false;
    renderMemory();
  } else {
    setTimeout(() => {
      firstCard.flipped = false; c.flipped = false;
      session.first = null; session.lock = false;
      session.wrong++;
      renderMemory();
    }, 700);
  }
}

function finishMemorySession() {
  bumpStreak();
  addPoints(session.xp);
  persist();

  document.getElementById("result-emoji").textContent = "🧠";
  document.getElementById("result-title").textContent = "Memory geschafft!";
  document.getElementById("result-sub").textContent = `${session.totalPairs} Paare in ${session.moves} Zügen gefunden.`;
  document.getElementById("result-correct").textContent = session.totalPairs;
  document.getElementById("result-wrong").textContent = Math.max(0, session.moves - session.totalPairs);
  document.getElementById("result-xp").textContent = session.xp;

  const lang = session.lang;
  document.getElementById("result-again").onclick = () => startSession(lang, "memory");

  showView("result");
}

// ---------------- GRAMMAR: Unregelmäßige Verben ----------------
// Startliste, wird später durch die echten Buchseiten ergänzt/ersetzt.

const STARTER_IRREGULAR_VERBS = [
  { infinitive: "go", pastSimple: "went", pastParticiple: "gone", german: "gehen" },
  { infinitive: "write", pastSimple: "wrote", pastParticiple: "written", german: "schreiben" },
  { infinitive: "do", pastSimple: "did", pastParticiple: "done", german: "machen; tun" },
  { infinitive: "take", pastSimple: "took", pastParticiple: "taken", german: "nehmen" },
  { infinitive: "catch", pastSimple: "caught", pastParticiple: "caught", german: "fangen" },
  { infinitive: "hit", pastSimple: "hit", pastParticiple: "hit", german: "treffen; schlagen" },
  { infinitive: "build", pastSimple: "built", pastParticiple: "built", german: "bauen" },
  { infinitive: "eat", pastSimple: "ate", pastParticiple: "eaten", german: "essen" },
  { infinitive: "see", pastSimple: "saw", pastParticiple: "seen", german: "sehen" },
  { infinitive: "give", pastSimple: "gave", pastParticiple: "given", german: "geben" },
  { infinitive: "come", pastSimple: "came", pastParticiple: "come", german: "kommen" },
  { infinitive: "get", pastSimple: "got", pastParticiple: "got", german: "bekommen; werden" },
];

function makeGrammarVerb(v) {
  return {
    id: "gv_" + v.infinitive,
    infinitive: v.infinitive, pastSimple: v.pastSimple, pastParticiple: v.pastParticiple,
    german: v.german || "",
  };
}

function ensureGrammarSeed() {
  if (!DATA.grammarVerbs) {
    DATA.grammarVerbs = STARTER_IRREGULAR_VERBS.map(makeGrammarVerb);
    persist();
  }
}

// Vollständige Liste "List of irregular verbs", S. 204 (Red Line 2, Bayern).
const BOOK_IRREGULAR_VERBS_P204 = [
  { infinitive: "be", pastSimple: "was, were", pastParticiple: "been", german: "sein" },
  { infinitive: "beat", pastSimple: "beat", pastParticiple: "beaten", german: "schlagen" },
  { infinitive: "become", pastSimple: "became", pastParticiple: "become", german: "werden" },
  { infinitive: "build", pastSimple: "built", pastParticiple: "built", german: "bauen" },
  { infinitive: "buy", pastSimple: "bought", pastParticiple: "bought", german: "kaufen" },
  { infinitive: "catch", pastSimple: "caught", pastParticiple: "caught", german: "fangen" },
  { infinitive: "come", pastSimple: "came", pastParticiple: "come", german: "kommen" },
  { infinitive: "cost", pastSimple: "cost", pastParticiple: "cost", german: "kosten" },
  { infinitive: "do", pastSimple: "did", pastParticiple: "done", german: "machen; tun" },
  { infinitive: "drink", pastSimple: "drank", pastParticiple: "drunk", german: "trinken" },
  { infinitive: "drive", pastSimple: "drove", pastParticiple: "driven", german: "fahren" },
  { infinitive: "eat", pastSimple: "ate", pastParticiple: "eaten", german: "essen" },
  { infinitive: "fall", pastSimple: "fell", pastParticiple: "fallen", german: "fallen" },
  { infinitive: "feed", pastSimple: "fed", pastParticiple: "fed", german: "füttern" },
  { infinitive: "feel", pastSimple: "felt", pastParticiple: "felt", german: "sich fühlen" },
  { infinitive: "fight", pastSimple: "fought", pastParticiple: "fought", german: "kämpfen" },
  { infinitive: "find", pastSimple: "found", pastParticiple: "found", german: "finden" },
  { infinitive: "forget", pastSimple: "forgot", pastParticiple: "forgotten", german: "vergessen" },
  { infinitive: "get", pastSimple: "got", pastParticiple: "got", german: "bekommen; werden" },
  { infinitive: "give", pastSimple: "gave", pastParticiple: "given", german: "geben" },
  { infinitive: "go", pastSimple: "went", pastParticiple: "gone", german: "gehen" },
  { infinitive: "hang", pastSimple: "hung", pastParticiple: "hung", german: "hängen" },
  { infinitive: "have (got)", pastSimple: "had (got)", pastParticiple: "had (got)", german: "haben" },
  { infinitive: "hear", pastSimple: "heard", pastParticiple: "heard", german: "hören" },
  { infinitive: "hide", pastSimple: "hid", pastParticiple: "hidden", german: "sich verstecken" },
  { infinitive: "hit", pastSimple: "hit", pastParticiple: "hit", german: "treffen; schlagen" },
  { infinitive: "hold", pastSimple: "held", pastParticiple: "held", german: "halten" },
  { infinitive: "keep", pastSimple: "kept", pastParticiple: "kept", german: "behalten" },
  { infinitive: "know", pastSimple: "knew", pastParticiple: "known", german: "wissen; kennen" },
  { infinitive: "leave", pastSimple: "left", pastParticiple: "left", german: "verlassen; abfahren" },
  { infinitive: "lose", pastSimple: "lost", pastParticiple: "lost", german: "verlieren" },
  { infinitive: "make", pastSimple: "made", pastParticiple: "made", german: "machen" },
  { infinitive: "meet", pastSimple: "met", pastParticiple: "met", german: "treffen" },
  { infinitive: "pay", pastSimple: "paid", pastParticiple: "paid", german: "bezahlen" },
  { infinitive: "put", pastSimple: "put", pastParticiple: "put", german: "legen; stellen" },
  { infinitive: "read", pastSimple: "read", pastParticiple: "read", german: "lesen" },
  { infinitive: "ride", pastSimple: "rode", pastParticiple: "ridden", german: "reiten; fahren" },
  { infinitive: "run", pastSimple: "ran", pastParticiple: "run", german: "rennen; laufen" },
  { infinitive: "say", pastSimple: "said", pastParticiple: "said", german: "sagen" },
  { infinitive: "see", pastSimple: "saw", pastParticiple: "seen", german: "sehen" },
  { infinitive: "sell", pastSimple: "sold", pastParticiple: "sold", german: "verkaufen" },
  { infinitive: "send", pastSimple: "sent", pastParticiple: "sent", german: "senden; schicken" },
  { infinitive: "shine", pastSimple: "shone", pastParticiple: "shone", german: "scheinen" },
  { infinitive: "sing", pastSimple: "sang", pastParticiple: "sung", german: "singen" },
  { infinitive: "sit", pastSimple: "sat", pastParticiple: "sat", german: "sitzen" },
  { infinitive: "sleep", pastSimple: "slept", pastParticiple: "slept", german: "schlafen" },
  { infinitive: "spend", pastSimple: "spent", pastParticiple: "spent", german: "ausgeben; verbringen" },
  { infinitive: "stand", pastSimple: "stood", pastParticiple: "stood", german: "stehen" },
  { infinitive: "steal", pastSimple: "stole", pastParticiple: "stolen", german: "stehlen" },
  { infinitive: "swim", pastSimple: "swam", pastParticiple: "swum", german: "schwimmen" },
  { infinitive: "take", pastSimple: "took", pastParticiple: "taken", german: "nehmen" },
  { infinitive: "teach", pastSimple: "taught", pastParticiple: "taught", german: "unterrichten" },
  { infinitive: "tell", pastSimple: "told", pastParticiple: "told", german: "erzählen" },
  { infinitive: "think", pastSimple: "thought", pastParticiple: "thought", german: "denken" },
  { infinitive: "wear", pastSimple: "wore", pastParticiple: "worn", german: "tragen" },
  { infinitive: "win", pastSimple: "won", pastParticiple: "won", german: "gewinnen" },
  { infinitive: "write", pastSimple: "wrote", pastParticiple: "written", german: "schreiben" },
];

function applyGrammarMigration(id, verbs) {
  DATA.appliedMigrations = DATA.appliedMigrations || [];
  if (DATA.appliedMigrations.includes(id)) return;
  DATA.grammarVerbs = verbs.map(makeGrammarVerb);
  DATA.appliedMigrations.push(id);
  persist();
}

// ---------------- Grammatik: Themen & Satzübungen ----------------

const GRAMMAR_TOPICS = [
  { id: "irregular", emoji: "🔤", title: "Unregelmäßige Verben", subtitle: "S. 204: Infinitiv, Simple Past, Partizip", unit: "all", grade: "6" },
  { id: "g1", emoji: "⏳", title: "G1: Simple Past", subtitle: "Die einfache Vergangenheit", unit: "1", grade: "6" },
  { id: "g2", emoji: "🔵", title: "G2: Verb be", subtitle: "am/is/are und was/were", unit: "1", grade: "6" },
  { id: "g3", emoji: "✅", title: "G3: Present Perfect", subtitle: "Aussagen & Verneinung", unit: "1", grade: "6" },
  { id: "g4", emoji: "❓", title: "G4: Present Perfect", subtitle: "Fragen & Kurzantworten", unit: "1", grade: "6" },
  { id: "g5", emoji: "🔢", title: "G5: much, many, a lot of", subtitle: "Mengenangaben", unit: "2", grade: "6" },
  { id: "g6", emoji: "🔍", title: "G6: some & any", subtitle: "Indefinitpronomen", unit: "2", grade: "6" },
  { id: "g7", emoji: "🔮", title: "G7: going to-future", subtitle: "Aussagen & Verneinung", unit: "3", grade: "6" },
  { id: "g8", emoji: "🧳", title: "G8: going to-future", subtitle: "Fragen & Kurzantworten", unit: "3", grade: "6" },
  { id: "g9", emoji: "📏", title: "G9: Vergleiche mit -er/more", subtitle: "1. Steigerung", unit: "3", grade: "6" },
  { id: "g10", emoji: "🏆", title: "G10: Steigerung mit -est/most", subtitle: "2. Steigerung", unit: "3", grade: "6" },
  { id: "g11", emoji: "👀", title: "G11: Present Progressive", subtitle: "Wiederholung (Revision)", unit: "4", grade: "6" },
  { id: "g12", emoji: "🏋️", title: "G12: Past Progressive", subtitle: "Die Verlaufsform der Vergangenheit", unit: "4", grade: "6" },
  { id: "g13", emoji: "⏱️", title: "G13: Simple Past & Past Progressive", subtitle: "Gegenüberstellung", unit: "4", grade: "6" },
  { id: "g14", emoji: "🔁", title: "G14: Simple Present & Present Progressive", subtitle: "Wiederholung", unit: "4", grade: "6" },
  { id: "g15", emoji: "🔮", title: "G15: will-future", subtitle: "Die Zukunft mit will", unit: "5", grade: "6" },
  { id: "g16", emoji: "🤝", title: "G16: Possessivpronomen", subtitle: "mine, yours, his, hers ...", unit: "5", grade: "6" },
  { id: "g17", emoji: "❓", title: "G17: Satzstellung in Fragen", subtitle: "Wiederholung (Revision)", unit: "6", grade: "6" },
];

let currentGrammarTopic = "irregular";

// Sätze aus den "Test yourself"-Übungen von Unit 1 (S. 132-135, Red Line 2 Bayern).
// display: "___" markiert die Lücke. blank: erwartete Antwort. full: kompletter Satz (für Reihenfolge-Modus).
const GRAMMAR_SENTENCES = [
  // G1: Simple Past
  { id: "g1_1", topic: "g1", display: "Last week I ___ Olivia to my party.", blank: "invited", hint: "invite", full: "Last week I invited Olivia to my party.", german: "Letzte Woche habe ich Olivia zu meiner Party eingeladen." },
  { id: "g1_2", topic: "g1", display: "Luke and Dave ___ to the party.", blank: "didn't come", hint: "not come", full: "Luke and Dave didn't come to the party.", german: "Luke und Dave kamen nicht zur Party." },
  { id: "g1_3", topic: "g1", display: "We ___ a picnic in the garden.", blank: "had", hint: "have", full: "We had a picnic in the garden.", german: "Wir machten ein Picknick im Garten." },
  { id: "g1_4", topic: "g1", display: "We ___ to music and danced.", blank: "listened", hint: "listen", full: "We listened to music and danced.", german: "Wir hörten Musik und tanzten." },
  { id: "g1_5", topic: "g1", display: "I ___ a cake for the party.", blank: "made", hint: "make", full: "I made a cake for the party.", german: "Ich machte einen Kuchen für die Party." },
  { id: "g1_6", topic: "g1", display: "Did you ___ to London?", blank: "go", hint: "go", full: "Did you go to London?", german: "Bist du nach London gefahren?" },
  { id: "g1_7", topic: "g1", display: "Did they ___ you?", blank: "call", hint: "call", full: "Did they call you?", german: "Haben sie dich angerufen?" },
  { id: "g1_8", topic: "g1", display: "When did the party ___?", blank: "start", hint: "start", full: "When did the party start?", german: "Wann hat die Party angefangen?" },

  // G2: Verb be
  { id: "g2_1", topic: "g2", display: "It ___ my birthday today.", blank: "is", hint: "be (Gegenwart)", full: "It is my birthday today.", german: "Heute ist mein Geburtstag." },
  { id: "g2_2", topic: "g2", display: "I ___ happy!", blank: "am", hint: "be (Gegenwart)", full: "I am happy!", german: "Ich bin glücklich!" },
  { id: "g2_3", topic: "g2", display: "Why ___ you angry last week?", blank: "were", hint: "be (Vergangenheit)", full: "Why were you angry last week?", german: "Warum warst du letzte Woche wütend?" },
  { id: "g2_4", topic: "g2", display: "___ you from Bavaria?", blank: "Are", hint: "be (Gegenwart)", full: "Are you from Bavaria?", german: "Kommst du aus Bayern?" },
  { id: "g2_5", topic: "g2", display: "___ he at school yesterday?", blank: "Was", hint: "be (Vergangenheit)", full: "Was he at school yesterday?", german: "War er gestern in der Schule?" },
  { id: "g2_6", topic: "g2", display: "He ___ at school yesterday.", blank: "wasn't", hint: "be (Vergangenheit, verneint)", full: "He wasn't at school yesterday.", german: "Er war gestern nicht in der Schule." },
  { id: "g2_7", topic: "g2", display: "They ___ at home yesterday.", blank: "weren't", hint: "be (Vergangenheit, verneint)", full: "They weren't at home yesterday.", german: "Sie waren gestern nicht zu Hause." },
  { id: "g2_8", topic: "g2", display: "When ___ her party?", blank: "was", hint: "be (Vergangenheit)", full: "When was her party?", german: "Wann war ihre Party?" },

  // G3: Present Perfect - Aussagen & Verneinung
  { id: "g3_1", topic: "g3", display: "I ___ just cleaned my bike.", blank: "have", hint: "have oder has?", full: "I have just cleaned my bike.", german: "Ich habe gerade mein Fahrrad geputzt." },
  { id: "g3_2", topic: "g3", display: "She ___ already done her homework.", blank: "has", hint: "have oder has?", full: "She has already done her homework.", german: "Sie hat ihre Hausaufgaben schon gemacht." },
  { id: "g3_3", topic: "g3", display: "They ___ had a picnic in the park.", blank: "have", hint: "have oder has?", full: "They have had a picnic in the park.", german: "Sie haben im Park ein Picknick gemacht." },
  { id: "g3_4", topic: "g3", display: "Olivia ___ just bought new shoes.", blank: "has", hint: "have oder has?", full: "Olivia has just bought new shoes.", german: "Olivia hat gerade neue Schuhe gekauft." },
  { id: "g3_5", topic: "g3", display: "I ___ helped my mum yet.", blank: "haven't", hint: "haven't oder hasn't?", full: "I haven't helped my mum yet.", german: "Ich habe meiner Mum noch nicht geholfen." },
  { id: "g3_6", topic: "g3", display: "He ___ fed his dog yet.", blank: "hasn't", hint: "haven't oder hasn't?", full: "He hasn't fed his dog yet.", german: "Er hat seinen Hund noch nicht gefüttert." },
  { id: "g3_7", topic: "g3", display: "We ___ seen that film.", blank: "haven't", hint: "haven't oder hasn't?", full: "We haven't seen that film.", german: "Wir haben den Film nicht gesehen." },
  { id: "g3_8", topic: "g3", display: "Lucy ___ been to a cinema yet.", blank: "hasn't", hint: "haven't oder hasn't?", full: "Lucy hasn't been to a cinema yet.", german: "Lucy war noch nicht im Kino." },

  // G4: Present Perfect - Fragen & Kurzantworten
  { id: "g4_1", topic: "g4", display: "___ you forgotten your homework?", blank: "Have", hint: "Have oder Has?", full: "Have you forgotten your homework?", german: "Hast du deine Hausaufgaben vergessen?" },
  { id: "g4_2", topic: "g4", display: "___ Luke played with his dog yet?", blank: "Has", hint: "Have oder Has?", full: "Has Luke played with his dog yet?", german: "Hat Luke schon mit seinem Hund gespielt?" },
  { id: "g4_3", topic: "g4", display: "Where ___ you been?", blank: "have", hint: "have oder has?", full: "Where have you been?", german: "Wo bist du gewesen?" },
  { id: "g4_4", topic: "g4", display: "___ Holly made a cake yet?", blank: "Has", hint: "Have oder Has?", full: "Has Holly made a cake yet?", german: "Hat Holly schon einen Kuchen gemacht?" },
  { id: "g4_5", topic: "g4", display: "What ___ Olivia done today?", blank: "has", hint: "have oder has?", full: "What has Olivia done today?", german: "Was hat Olivia heute gemacht?" },
  { id: "g4_6", topic: "g4", display: "___ Dave and Luke ever met the Queen?", blank: "Have", hint: "Have oder Has?", full: "Have Dave and Luke ever met the Queen?", german: "Haben Dave und Luke jemals die Königin getroffen?" },
  { id: "g4_7", topic: "g4", display: "___ Dominik ever stayed in a hotel?", blank: "Has", hint: "Have oder Has?", full: "Has Dominik ever stayed in a hotel?", german: "War Dominik jemals in einem Hotel?" },
  { id: "g4_8", topic: "g4", display: "Which sights ___ Dominik already seen?", blank: "has", hint: "have oder has?", full: "Which sights has Dominik already seen?", german: "Welche Sehenswürdigkeiten hat Dominik schon gesehen?" },

  // G5: Mengenangaben - much, many, a lot of, lots of
  { id: "g5_1", topic: "g5", display: "How ___ money do we need?", blank: "much", hint: "much oder many?", full: "How much money do we need?", german: "Wie viel Geld brauchen wir?" },
  { id: "g5_2", topic: "g5", display: "I've got ___ books at home.", blank: "a lot of, lots of", hint: "a lot of / lots of", full: "I've got a lot of books at home.", german: "Ich habe zu Hause viele Bücher." },
  { id: "g5_3", topic: "g5", display: "But I haven't got ___ magazines.", blank: "many", hint: "much oder many?", full: "But I haven't got many magazines.", german: "Aber ich habe nicht viele Zeitschriften." },
  { id: "g5_4", topic: "g5", display: "How ___ friends have you got?", blank: "many", hint: "much oder many?", full: "How many friends have you got?", german: "Wie viele Freunde hast du?" },
  { id: "g5_5", topic: "g5", display: "There's ___ chocolate in that cake.", blank: "a lot of, lots of", hint: "a lot of / lots of", full: "There's a lot of chocolate in that cake.", german: "In dem Kuchen ist viel Schokolade." },
  { id: "g5_6", topic: "g5", display: "Do you know ___ English words?", blank: "many", hint: "much oder many?", full: "Do you know many English words?", german: "Kennst du viele englische Wörter?" },
  { id: "g5_7", topic: "g5", display: "Sorry, but I haven't got ___ time.", blank: "much", hint: "much oder many?", full: "Sorry, but I haven't got much time.", german: "Entschuldigung, aber ich habe nicht viel Zeit." },
  { id: "g5_8", topic: "g5", display: "Dad bought ___ food for the party.", blank: "a lot of, lots of", hint: "a lot of / lots of", full: "Dad bought a lot of food for the party.", german: "Papa hat viel Essen für die Party gekauft." },

  // G6: Indefinitpronomen - some und any
  { id: "g6_1", topic: "g6", display: "Let's buy ___ clothes.", blank: "some", hint: "some oder any?", full: "Let's buy some clothes.", german: "Lass uns (ein paar) Kleider kaufen." },
  { id: "g6_2", topic: "g6", display: "Does ___ want to come with me?", blank: "anybody", hint: "somebody oder anybody?", full: "Does anybody want to come with me?", german: "Möchte jemand mit mir kommen?" },
  { id: "g6_3", topic: "g6", display: "Are there ___ nice shoes in this shop?", blank: "any", hint: "some oder any?", full: "Are there any nice shoes in this shop?", german: "Gibt es (ein paar) schöne Schuhe in diesem Laden?" },
  { id: "g6_4", topic: "g6", display: "Yes, there are, but there aren't ___ dresses.", blank: "any", hint: "some oder any?", full: "Yes, there are, but there aren't any dresses.", german: "Ja, aber es gibt keine Kleider." },
  { id: "g6_5", topic: "g6", display: "I can't find a nice dress ___!", blank: "anywhere", hint: "somewhere oder anywhere?", full: "I can't find a nice dress anywhere!", german: "Ich kann nirgends ein schönes Kleid finden!" },
  { id: "g6_6", topic: "g6", display: "I've bought ___ new shirts.", blank: "some", hint: "some oder any?", full: "I've bought some new shirts.", german: "Ich habe (ein paar) neue Hemden gekauft." },
  { id: "g6_7", topic: "g6", display: "We have got ___ scarves at home.", blank: "some", hint: "some oder any?", full: "We have got some scarves at home.", german: "Wir haben (ein paar) Schals zu Hause." },
  { id: "g6_8", topic: "g6", display: "We haven't got ___ wellies, sorry.", blank: "any", hint: "some oder any?", full: "We haven't got any wellies, sorry.", german: "Wir haben keine Gummistiefel, sorry." },
  { id: "g6_9", topic: "g6", display: "I must find some wellies ___!", blank: "somewhere", hint: "somewhere oder anywhere?", full: "I must find some wellies somewhere!", german: "Ich muss irgendwo Gummistiefel finden!" },
  { id: "g6_10", topic: "g6", display: "Let's do ___ exciting tomorrow!", blank: "something", hint: "something oder anything?", full: "Let's do something exciting tomorrow!", german: "Lass uns morgen etwas Aufregendes machen!" },

  // G7: going to-future - Aussagen & Verneinung
  { id: "g7_1", topic: "g7", display: "Holly ___ money for the trip.", blank: "is going to need", hint: "need", full: "Holly is going to need money for the trip.", german: "Holly wird Geld für den Ausflug brauchen." },
  { id: "g7_2", topic: "g7", display: "Her mum ___ some new clothes.", blank: "is going to buy", hint: "buy", full: "Her mum is going to buy some new clothes.", german: "Ihre Mum wird ein paar neue Kleider kaufen." },
  { id: "g7_3", topic: "g7", display: "They ___ to an adventure centre.", blank: "are going to go", hint: "go", full: "They are going to go to an adventure centre.", german: "Sie werden zu einem Freizeitpark fahren." },
  { id: "g7_4", topic: "g7", display: "They ___ there by bus.", blank: "are going to get", hint: "get", full: "They are going to get there by bus.", german: "Sie werden mit dem Bus dorthin kommen." },
  { id: "g7_5", topic: "g7", display: "They ___ camping.", blank: "aren't going to try", hint: "not try", full: "They aren't going to try camping.", german: "Sie werden Camping nicht ausprobieren." },
  { id: "g7_6", topic: "g7", display: "Dave ___ his dad every day.", blank: "isn't going to call", hint: "not call", full: "Dave isn't going to call his dad every day.", german: "Dave wird nicht jeden Tag seinen Dad anrufen." },
  { id: "g7_7", topic: "g7", display: "Olivia and Holly ___ a Welsh market.", blank: "are going to visit", hint: "visit", full: "Olivia and Holly are going to visit a Welsh market.", german: "Olivia und Holly werden einen walisischen Markt besuchen." },
  { id: "g7_8", topic: "g7", display: "Holly ___ a present for her mum.", blank: "is going to look for", hint: "look for", full: "Holly is going to look for a present for her mum.", german: "Holly wird nach einem Geschenk für ihre Mum suchen." },

  // G8: going to-future - Fragen & Kurzantworten
  { id: "g8_1", topic: "g8", display: "___ Jay going to sing at the party next weekend?", blank: "Is", hint: "Am/Is/Are?", full: "Is Jay going to sing at the party next weekend?", german: "Wird Jay am nächsten Wochenende auf der Party singen? – Ja." },
  { id: "g8_2", topic: "g8", display: "___ you going to write a postcard?", blank: "Are", hint: "Am/Is/Are?", full: "Are you going to write a postcard?", german: "Wirst du eine Postkarte schreiben? – Nein." },
  { id: "g8_3", topic: "g8", display: "___ the girls going to say goodbye to their friends on Saturday?", blank: "Are", hint: "Am/Is/Are?", full: "Are the girls going to say goodbye to their friends on Saturday?", german: "Werden sich die Mädchen am Samstag von ihren Freunden verabschieden? – Ja." },
  { id: "g8_4", topic: "g8", display: "What ___ Holly going to do next week?", blank: "is", hint: "Am/Is/Are? nach Fragewort", full: "What is Holly going to do next week?", german: "Was hat Holly nächste Woche vor? – Sie wird ein Museum besuchen." },
  { id: "g8_5", topic: "g8", display: "When ___ they going to do their Maths homework?", blank: "are", hint: "Am/Is/Are? nach Fragewort", full: "When are they going to do their Maths homework?", german: "Wann werden sie ihre Mathehausaufgaben machen? – Am Montag." },
  { id: "g8_6", topic: "g8", display: "Where ___ the boys going to go at the weekend?", blank: "are", hint: "Am/Is/Are? nach Fragewort", full: "Where are the boys going to go at the weekend?", german: "Wo werden die Jungen am Wochenende hingehen? – Ins Kino." },

  // G9: Vergleiche - 1. Steigerung (-er/more, as...as)
  { id: "g9_1", topic: "g9", display: "This bike is ___ than this car.", blank: "older", hint: "old → einsilbig", full: "This bike is older than this car.", german: "Dieses Fahrrad ist älter als dieses Auto." },
  { id: "g9_2", topic: "g9", display: "Today's lunch is ___ than yesterday's.", blank: "better", hint: "good → unregelmäßig", full: "Today's lunch is better than yesterday's.", german: "Das heutige Mittagessen ist besser als das von gestern." },
  { id: "g9_3", topic: "g9", display: "Olivia is ___ Luke. They are the same height.", blank: "as tall as", hint: "gleich: as ... as", full: "Olivia is as tall as Luke.", german: "Olivia ist genauso groß wie Luke." },
  { id: "g9_4", topic: "g9", display: "Big Ben is ___ than Ben the bat.", blank: "more famous", hint: "famous → mehrsilbig", full: "Big Ben is more famous than Ben the bat.", german: "Big Ben ist berühmter als Ben die Fledermaus." },
  { id: "g9_5", topic: "g9", display: "Doing homework is ___ hiking.", blank: "more boring than", hint: "boring → mehrsilbig + than", full: "Doing homework is more boring than hiking.", german: "Hausaufgaben machen ist langweiliger als Wandern." },
  { id: "g9_6", topic: "g9", display: "Maths is ___ French. I like both subjects.", blank: "as interesting as", hint: "gleich: as ... as", full: "Maths is as interesting as French.", german: "Mathe ist genauso interessant wie Französisch." },

  // G10: Steigerung - 2. Steigerung (-est/most, best)
  { id: "g10_1", topic: "g10", display: "Which is the ___ river in England?", blank: "longest", hint: "long → einsilbig", full: "Which is the longest river in England?", german: "Welches ist der längste Fluss in England?" },
  { id: "g10_2", topic: "g10", display: "This is the ___ dress in the shop.", blank: "most exciting", hint: "exciting → mehrsilbig", full: "This is the most exciting dress in the shop.", german: "Das ist das aufregendste Kleid im Laden." },
  { id: "g10_3", topic: "g10", display: "Sherlock is the ___ dog in town.", blank: "craziest", hint: "crazy → endet auf -y", full: "Sherlock is the craziest dog in town.", german: "Sherlock ist der verrückteste Hund der Stadt." },
  { id: "g10_4", topic: "g10", display: "London is the ___ city in England.", blank: "biggest", hint: "big → Verdopplung", full: "London is the biggest city in England.", german: "London ist die größte Stadt in England." },
  { id: "g10_5", topic: "g10", display: "Which sight is the ___?", blank: "most interesting", hint: "interesting → mehrsilbig", full: "Which sight is the most interesting?", german: "Welche Sehenswürdigkeit ist die interessanteste?" },
  { id: "g10_6", topic: "g10", display: "I think Munich is the ___ city.", blank: "best", hint: "good → unregelmäßig", full: "I think Munich is the best city.", german: "Ich finde, München ist die beste Stadt." },

  // G11: Wiederholung Present Progressive
  { id: "g11_1", topic: "g11", display: "The students ___ their homework.", blank: "are doing", hint: "do → Present Progressive", full: "The students are doing their homework.", german: "Die Schüler machen gerade ihre Hausaufgaben." },
  { id: "g11_2", topic: "g11", display: "I ___ for my mum now.", blank: "am waiting", hint: "wait → Present Progressive", full: "I am waiting for my mum now.", german: "Ich warte gerade auf meine Mum." },
  { id: "g11_3", topic: "g11", display: "She ___ to her friend at the moment.", blank: "is talking", hint: "talk → Present Progressive", full: "She is talking to her friend at the moment.", german: "Sie spricht gerade mit ihrer Freundin." },
  { id: "g11_4", topic: "g11", display: "___ you reading a book?", blank: "Are", hint: "Present Progressive Frage (Am/Is/Are?)", full: "Are you reading a book?", german: "Liest du gerade ein Buch? – Ja." },
  { id: "g11_5", topic: "g11", display: "___ she having fun?", blank: "Is", hint: "Present Progressive Frage (Am/Is/Are?)", full: "Is she having fun?", german: "Hat sie gerade Spaß? – Nein." },
  { id: "g11_6", topic: "g11", display: "What ___ your friends doing now?", blank: "are", hint: "Present Progressive Frage nach Fragewort", full: "What are your friends doing now?", german: "Was machen deine Freunde gerade? – Sie schauen fern." },
  { id: "g11_7", topic: "g11", display: "You ___ to me!", blank: "aren't listening", hint: "not listen → Present Progressive verneint", full: "You aren't listening to me!", german: "Du hörst mir nicht zu!" },

  // G12: Die Verlaufsform der Vergangenheit (Past Progressive)
  { id: "g12_1", topic: "g12", display: "The king ___ very fast men.", blank: "was looking for", hint: "look for → Past Progressive", full: "The king was looking for very fast men.", german: "Der König suchte gerade sehr schnelle Männer." },
  { id: "g12_2", topic: "g12", display: "People ___ at the Highland Games.", blank: "were dancing", hint: "dance → Past Progressive", full: "People were dancing at the Highland Games.", german: "Die Leute tanzten bei den Highland Games." },
  { id: "g12_3", topic: "g12", display: "They ___ music too.", blank: "were playing", hint: "play → Past Progressive", full: "They were playing music too.", german: "Sie spielten auch Musik." },
  { id: "g12_4", topic: "g12", display: "___ the people having fun?", blank: "Were", hint: "Past Progressive Frage (Was/Were?)", full: "Were the people having fun?", german: "Hatten die Leute Spaß? – Ja." },
  { id: "g12_5", topic: "g12", display: "___ the sportsmen lifting heavy stones?", blank: "Were", hint: "Past Progressive Frage (Was/Were?)", full: "Were the sportsmen lifting heavy stones?", german: "Hoben die Sportler schwere Steine? – Ja." },
  { id: "g12_6", topic: "g12", display: "What ___ the sportsmen doing with the hammer?", blank: "were", hint: "Past Progressive Frage nach Fragewort", full: "What were the sportsmen doing with the hammer?", german: "Was machten die Sportler mit dem Hammer? – Sie warfen ihn." },

  // G13: Gegenüberstellung Simple Past und Past Progressive
  { id: "g13_1", topic: "g13", display: "My friend ___ to Bonn last month.", blank: "moved", hint: "move → Simple Past", full: "My friend moved to Bonn last month.", german: "Mein Freund ist letzten Monat nach Bonn gezogen." },
  { id: "g13_2", topic: "g13", display: "We ___ football when we saw a mouse.", blank: "were playing", hint: "play → Past Progressive", full: "We were playing football when we saw a mouse.", german: "Wir spielten Fußball, als wir eine Maus sahen." },
  { id: "g13_3", topic: "g13", display: "What was she ___ when he called her?", blank: "doing", hint: "do → Past Progressive", full: "What was she doing when he called her?", german: "Was machte sie gerade, als er sie anrief?" },
  { id: "g13_4", topic: "g13", display: "While we ___ TV, we heard a noise.", blank: "were watching", hint: "watch → Past Progressive", full: "While we were watching TV, we heard a noise.", german: "Während wir fernsahen, hörten wir ein Geräusch." },
  { id: "g13_5", topic: "g13", display: "I ___ to the cinema yesterday.", blank: "went", hint: "go → Simple Past", full: "I went to the cinema yesterday.", german: "Ich bin gestern ins Kino gegangen." },
  { id: "g13_6", topic: "g13", display: "They ___ at the party when the music stopped.", blank: "were dancing", hint: "dance → Past Progressive", full: "They were dancing at the party when the music stopped.", german: "Sie tanzten auf der Party, als die Musik aufhörte." },

  // G14: Gegenüberstellung Simple Present und Present Progressive (Revision)
  { id: "g14_1", topic: "g14", display: "You ___ to Edinburgh every Sunday.", blank: "go", hint: "go → Simple Present", full: "You go to Edinburgh every Sunday.", german: "Du fährst jeden Sonntag nach Edinburgh." },
  { id: "g14_2", topic: "g14", display: "I ___ to a cool song at the moment.", blank: "am listening", hint: "listen → Present Progressive", full: "I am listening to a cool song at the moment.", german: "Ich höre gerade ein cooles Lied." },
  { id: "g14_3", topic: "g14", display: "He ___ his homework every afternoon.", blank: "does", hint: "do → Simple Present (3. Person)", full: "He does his homework every afternoon.", german: "Er macht jeden Nachmittag seine Hausaufgaben." },
  { id: "g14_4", topic: "g14", display: "We usually ___ pizza on Sundays.", blank: "eat", hint: "eat → Simple Present", full: "We usually eat pizza on Sundays.", german: "Wir essen sonntags normalerweise Pizza." },
  { id: "g14_5", topic: "g14", display: "The students sometimes ___ about their favourite books.", blank: "talk", hint: "talk → Simple Present", full: "The students sometimes talk about their favourite books.", german: "Die Schüler sprechen manchmal über ihre Lieblingsbücher." },
  { id: "g14_6", topic: "g14", display: "The dogs ___ at the cats at the moment.", blank: "are barking", hint: "bark → Present Progressive", full: "The dogs are barking at the cats at the moment.", german: "Die Hunde bellen gerade die Katzen an." },

  // G15: Die Zukunft mit will (will-future)
  { id: "g15_1", topic: "g15", display: "It ___ next week.", blank: "won't rain", hint: "not rain → will-future verneint", full: "It won't rain next week.", german: "Es wird nächste Woche nicht regnen." },
  { id: "g15_2", topic: "g15", display: "That box is heavy. – Wait, I ___ you.", blank: "will help", hint: "help → will-future", full: "That box is heavy. – Wait, I will help you.", german: "Diese Kiste ist schwer. – Warte, ich helfe dir." },
  { id: "g15_3", topic: "g15", display: "Sorry, I ___ tomorrow.", blank: "won't come", hint: "not come → will-future verneint", full: "Sorry, I won't come tomorrow.", german: "Entschuldigung, ich komme morgen nicht." },
  { id: "g15_4", topic: "g15", display: "You ___ friends at your new school.", blank: "will find", hint: "find → will-future", full: "You will find friends at your new school.", german: "Du wirst Freunde an deiner neuen Schule finden." },
  { id: "g15_5", topic: "g15", display: "You don't understand the rules? Don't worry. I ___ them to you.", blank: "will explain", hint: "explain → will-future", full: "You don't understand the rules? Don't worry. I will explain them to you.", german: "Du verstehst die Regeln nicht? Keine Sorge. Ich werde sie dir erklären." },

  // G16: Possessivpronomen (mine, yours, his, hers, its, ours, theirs)
  { id: "g16_1", topic: "g16", display: "Your shirt looks like ___ shirt.", blank: "my", hint: "Possessivbegleiter (vor Nomen)", full: "Your shirt looks like my shirt.", german: "Dein Shirt sieht aus wie mein Shirt." },
  { id: "g16_2", topic: "g16", display: "Have you put ___ scarf in the bag, Sam?", blank: "your", hint: "Possessivbegleiter (vor Nomen)", full: "Have you put your scarf in the bag, Sam?", german: "Hast du deinen Schal in die Tasche gepackt, Sam?" },
  { id: "g16_3", topic: "g16", display: "Is that Max's bag? – Yes, it's ___.", blank: "his", hint: "Possessivpronomen (ohne Nomen)", full: "Is that Max's bag? – Yes, it's his.", german: "Ist das Max' Tasche? – Ja, sie ist seine." },
  { id: "g16_4", topic: "g16", display: "I can't find my pen. – Wait, I'll give you ___.", blank: "mine", hint: "Possessivpronomen (ohne Nomen)", full: "I can't find my pen. – Wait, I'll give you mine.", german: "Ich kann meinen Stift nicht finden. – Warte, ich gebe dir meinen." },
  { id: "g16_5", topic: "g16", display: "Their chairs are white, ___ are brown.", blank: "ours", hint: "Possessivpronomen (ohne Nomen)", full: "Their chairs are white, ours are brown.", german: "Ihre Stühle sind weiß, unsere sind braun." },
  { id: "g16_6", topic: "g16", display: "Is this your grandparents' new car? – No, it isn't ___.", blank: "theirs", hint: "Possessivpronomen (ohne Nomen)", full: "Is this your grandparents' new car? – No, it isn't theirs.", german: "Ist das das neue Auto deiner Großeltern? – Nein, es ist nicht ihrs." },
  { id: "g16_7", topic: "g16", display: "I think it's Hannah's bike. – No, I don't think it's ___ bike.", blank: "her", hint: "Possessivbegleiter (vor Nomen)", full: "I think it's Hannah's bike. – No, I don't think it's her bike.", german: "Ich glaube, das ist Hannahs Fahrrad. – Nein, ich glaube nicht, dass es ihr Fahrrad ist." },

  // G17: Satzstellung in Fragen (Revision) – Hilfsverb + Fragewort
  { id: "g17_1", topic: "g17", display: "___ the shopping mall have many shops?", blank: "Does", hint: "Hilfsverb, Gegenwart (3. Person)", full: "Does the shopping mall have many shops?", german: "Hat das Einkaufszentrum viele Läden?" },
  { id: "g17_2", topic: "g17", display: "___ Hannah see her friend at school yesterday?", blank: "Did", hint: "Hilfsverb, Vergangenheit", full: "Did Hannah see her friend at school yesterday?", german: "Hat Hannah gestern ihre Freundin in der Schule gesehen?" },
  { id: "g17_3", topic: "g17", display: "Why ___ you like shopping?", blank: "do", hint: "Hilfsverb nach Fragewort", full: "Why do you like shopping?", german: "Warum gehst du gerne einkaufen?" },
  { id: "g17_4", topic: "g17", display: "Where ___ you buy your clothes?", blank: "do", hint: "Hilfsverb nach Fragewort", full: "Where do you buy your clothes?", german: "Wo kaufst du deine Kleidung?" },
  { id: "g17_5", topic: "g17", display: "What ___ Sam and Max do last Sunday?", blank: "did", hint: "Hilfsverb nach Fragewort, Vergangenheit", full: "What did Sam and Max do last Sunday?", german: "Was haben Sam und Max letzten Sonntag gemacht?" },
  { id: "g17_6", topic: "g17", display: "___ we go to the cinema tomorrow?", blank: "Will", hint: "Hilfsverb, will-future", full: "Will we go to the cinema tomorrow?", german: "Werden wir morgen ins Kino gehen?" },
];

function renderGrammarTopics() {
  document.querySelectorAll("[data-set-grade]").forEach(b => {
    b.classList.toggle("active", b.dataset.setGrade === currentGrade);
  });
  document.querySelectorAll("[data-set-unit]").forEach(b => {
    b.classList.toggle("active", b.dataset.setUnit === currentUnit);
  });
  // Jede Klassenstufe hat ihre eigene Unit-Reihe (unterschiedliche Anzahl an Units).
  document.getElementById("grammar-unit-toggle-6").classList.toggle("hidden", currentGrade !== "6");
  document.getElementById("grammar-unit-toggle-7").classList.toggle("hidden", currentGrade !== "7");

  const wrap = document.getElementById("grammar-topic-cards");
  wrap.innerHTML = "";

  const visible = GRAMMAR_TOPICS
    .filter(t => (t.grade || "6") === currentGrade)
    .filter(t => t.unit === "all" || currentUnit === "all" || t.unit === currentUnit);
  if (visible.length === 0) {
    wrap.innerHTML = `<p class="empty-hint">Für diese Unit gibt es noch keine Grammatikthemen.</p>`;
    return;
  }

  visible.forEach(t => {
    const card = document.createElement("div");
    card.className = "lang-card grammar-topic-card";
    card.innerHTML = `
      <div class="grammar-topic-emoji">${t.emoji}</div>
      <h2>${escapeHtml(t.title)}</h2>
      <p>${escapeHtml(t.subtitle)}</p>
    `;
    card.addEventListener("click", () => {
      currentGrammarTopic = t.id;
      showView("grammar-modes");
    });
    wrap.appendChild(card);
  });
}

function renderGrammarModes() {
  const topic = GRAMMAR_TOPICS.find(t => t.id === currentGrammarTopic);
  document.getElementById("grammar-modes-title").textContent = topic ? topic.title : "";
  document.getElementById("grammar-modes-subtitle").textContent = topic ? topic.subtitle : "";
}

function startGrammarSession(mode) {
  const isVerbTopic = currentGrammarTopic === "irregular";
  const pool = isVerbTopic
    ? (DATA.grammarVerbs || [])
    : GRAMMAR_SENTENCES.filter(s => s.topic === currentGrammarTopic);

  if (pool.length === 0) {
    alert("Es sind noch keine Grammatik-Übungen für dieses Thema vorhanden.");
    showView("grammar-modes");
    return;
  }
  if (mode === "mc" && pool.length < 4) {
    alert("Für Multiple Choice werden mindestens 4 Übungen benötigt.");
    showView("grammar-modes");
    return;
  }
  const queue = shuffle(pool).slice(0, Math.min(pool.length, 12));
  session = {
    kind: "grammar", contentType: isVerbTopic ? "verb" : "sentence",
    mode, queue, index: 0, correct: 0, wrong: 0, xp: 0, wrongRepeats: {},
  };
  showView("session");
  renderSessionStep();
}

function grammarFieldLabel(askPastParticiple) {
  return askPastParticiple ? "Partizip (Perfekt)" : "Simple Past";
}

// ---- Grammatik: Lückentext ----

function renderGrammarFill(body) {
  const verb = session.queue[session.index];
  const askPastParticiple = Math.random() < 0.5;
  const fieldLabel = grammarFieldLabel(askPastParticiple);
  const correctAnswer = askPastParticiple ? verb.pastParticiple : verb.pastSimple;

  const wrap = document.createElement("div");
  wrap.className = "type-wrap";
  wrap.innerHTML = `
    <div class="type-question">${escapeHtml(verb.infinitive)}</div>
    <p class="type-hint">${verb.german ? escapeHtml(verb.german) + " — " : ""}gesucht: ${fieldLabel}</p>
    <input type="text" id="type-input" placeholder="${fieldLabel} eingeben..." autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="type-feedback" id="type-feedback"></div>
    <button class="btn btn-primary" id="type-submit">Prüfen</button>
  `;
  body.appendChild(wrap);

  const input = wrap.querySelector("#type-input");
  const feedback = wrap.querySelector("#type-feedback");
  const submitBtn = wrap.querySelector("#type-submit");
  input.focus();

  let answered = false;
  function submit() {
    if (answered) return;
    answered = true;
    const isCorrect = acceptableAnswers(correctAnswer).has(normalize(input.value));
    input.classList.add(isCorrect ? "correct" : "wrong");
    input.disabled = true;
    if (isCorrect) {
      feedback.textContent = "✅ Richtig!";
      feedback.className = "type-feedback correct";
      session.correct++; session.xp += 15;
    } else {
      feedback.textContent = `❌ Richtig wäre: ${correctAnswer}`;
      feedback.className = "type-feedback wrong";
      session.wrong++; requeueIfWrong(verb);
    }
    setTimeout(() => { session.index++; renderSessionStep(); }, 1300);
  }

  submitBtn.addEventListener("click", submit);
  input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
}

// ---- Grammatik: Multiple Choice ----

function renderGrammarMC(body) {
  const verb = session.queue[session.index];
  const askPastParticiple = Math.random() < 0.5;
  const fieldLabel = grammarFieldLabel(askPastParticiple);
  const correctAnswer = askPastParticiple ? verb.pastParticiple : verb.pastSimple;

  const usedAnswers = new Set([normalize(correctAnswer)]);
  const distractors = [];
  shuffle((DATA.grammarVerbs || []).filter(v => v.id !== verb.id)).forEach(v => {
    if (distractors.length >= 3) return;
    const val = askPastParticiple ? v.pastParticiple : v.pastSimple;
    if (usedAnswers.has(normalize(val))) return;
    usedAnswers.add(normalize(val));
    distractors.push(val);
  });
  const options = shuffle([correctAnswer, ...distractors]);

  const wrap = document.createElement("div");
  wrap.className = "mc-wrap";
  wrap.innerHTML = `<div class="mc-question">${escapeHtml(verb.infinitive)}<br><span class="type-hint">${fieldLabel}</span></div><div class="mc-options"></div>`;
  const optWrap = wrap.querySelector(".mc-options");

  let answered = false;
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "mc-option";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const isCorrect = opt === correctAnswer;
      btn.classList.add(isCorrect ? "correct" : "wrong");
      if (!isCorrect) {
        [...optWrap.children].find(b => b.textContent === correctAnswer).classList.add("correct");
      }
      if (isCorrect) { session.correct++; session.xp += 10; }
      else { session.wrong++; requeueIfWrong(verb); }
      setTimeout(() => { session.index++; renderSessionStep(); }, 900);
    });
    optWrap.appendChild(btn);
  });

  body.appendChild(wrap);
}

// ---- Grammatik: Reihenfolge ----

function renderGrammarOrder(body) {
  const verb = session.queue[session.index];
  const correctOrder = [verb.infinitive, verb.pastSimple, verb.pastParticiple];
  const labels = ["Infinitiv", "Simple Past", "Partizip"];
  const chips = shuffle(correctOrder);

  const wrap = document.createElement("div");
  wrap.className = "order-wrap";
  wrap.innerHTML = `
    <p class="order-instruction">${verb.german ? escapeHtml(verb.german) + " — " : ""}Tippe die drei Formen in der richtigen Reihenfolge an.</p>
    <div class="order-slots">
      ${labels.map(l => `<div class="order-slot"><span class="order-slot-label">${l}</span><span class="order-slot-value"></span></div>`).join("")}
    </div>
    <div class="order-chips"></div>
  `;
  body.appendChild(wrap);

  const slots = wrap.querySelectorAll(".order-slot");
  const chipWrap = wrap.querySelector(".order-chips");
  const placed = [];
  let answered = false;

  chips.forEach(word => {
    const chip = document.createElement("button");
    chip.className = "order-chip";
    chip.textContent = word;
    chip.addEventListener("click", () => {
      if (answered || chip.classList.contains("used") || placed.length >= 3) return;
      chip.classList.add("used");
      const slot = slots[placed.length];
      slot.querySelector(".order-slot-value").textContent = word;
      slot.classList.add("filled");
      placed.push(word);
      if (placed.length === 3) checkOrder();
    });
    chipWrap.appendChild(chip);
  });

  function checkOrder() {
    answered = true;
    const isCorrect = placed.every((w, i) => w === correctOrder[i]);
    slots.forEach((slot, i) => {
      slot.classList.add(placed[i] === correctOrder[i] ? "correct" : "wrong");
    });
    if (isCorrect) { session.correct++; session.xp += 10; }
    else { session.wrong++; requeueIfWrong(verb); }
    setTimeout(() => { session.index++; renderSessionStep(); }, 1300);
  }
}

// ---- Grammatik: Satzlücke (Lückentext) ----

function splitDisplay(display) {
  const idx = display.indexOf("___");
  return { before: display.slice(0, idx), after: display.slice(idx + 3) };
}

// Bei Lücken mit mehreren gültigen Antworten (z.B. "a lot of, lots of") ist die
// erste Form die "Hauptantwort" für Anzeige (MC-Optionen, Feedback-Text).
function primaryAnswer(blank) {
  return blank.split(",")[0].trim();
}

function renderSentenceFill(body) {
  const item = session.queue[session.index];
  const { before, after } = splitDisplay(item.display);

  const wrap = document.createElement("div");
  wrap.className = "type-wrap";
  wrap.innerHTML = `
    <div class="type-question sentence-question">${escapeHtml(before)}<span class="blank-marker">____</span>${escapeHtml(after)}</div>
    <p class="type-hint">${item.hint ? "Hinweis: " + escapeHtml(item.hint) : ""}</p>
    <input type="text" id="type-input" placeholder="Lücke ausfüllen..." autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="type-feedback" id="type-feedback"></div>
    <button class="btn btn-primary" id="type-submit">Prüfen</button>
  `;
  body.appendChild(wrap);

  const input = wrap.querySelector("#type-input");
  const feedback = wrap.querySelector("#type-feedback");
  const submitBtn = wrap.querySelector("#type-submit");
  input.focus();

  let answered = false;
  function submit() {
    if (answered) return;
    answered = true;
    const isCorrect = acceptableAnswers(item.blank).has(normalize(input.value));
    input.classList.add(isCorrect ? "correct" : "wrong");
    input.disabled = true;
    if (isCorrect) {
      feedback.textContent = "✅ Richtig!";
      feedback.className = "type-feedback correct";
      session.correct++; session.xp += 15;
    } else {
      feedback.textContent = `❌ Richtig wäre: ${primaryAnswer(item.blank)}`;
      feedback.className = "type-feedback wrong";
      session.wrong++; requeueIfWrong(item);
    }
    setTimeout(() => { session.index++; renderSessionStep(); }, 1300);
  }

  submitBtn.addEventListener("click", submit);
  input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
}

// ---- Grammatik: Satzlücke (Multiple Choice) ----

function renderSentenceMC(body) {
  const item = session.queue[session.index];
  const { before, after } = splitDisplay(item.display);
  const correctAnswer = primaryAnswer(item.blank);

  const usedAnswers = new Set([normalize(correctAnswer)]);
  const distractors = [];
  shuffle(GRAMMAR_SENTENCES.filter(s => s.topic === item.topic && s.id !== item.id)).forEach(s => {
    if (distractors.length >= 3) return;
    const val = primaryAnswer(s.blank);
    if (usedAnswers.has(normalize(val))) return;
    usedAnswers.add(normalize(val));
    distractors.push(val);
  });
  const options = shuffle([correctAnswer, ...distractors]);

  const wrap = document.createElement("div");
  wrap.className = "mc-wrap";
  wrap.innerHTML = `<div class="mc-question sentence-question">${escapeHtml(before)}<span class="blank-marker">____</span>${escapeHtml(after)}</div><div class="mc-options"></div>`;
  const optWrap = wrap.querySelector(".mc-options");

  let answered = false;
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "mc-option";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const isCorrect = opt === correctAnswer;
      btn.classList.add(isCorrect ? "correct" : "wrong");
      if (!isCorrect) {
        [...optWrap.children].find(b => b.textContent === correctAnswer).classList.add("correct");
      }
      if (isCorrect) { session.correct++; session.xp += 10; }
      else { session.wrong++; requeueIfWrong(item); }
      setTimeout(() => { session.index++; renderSessionStep(); }, 900);
    });
    optWrap.appendChild(btn);
  });

  body.appendChild(wrap);
}

// ---- Grammatik: Satz in Reihenfolge bringen ----

function renderSentenceOrder(body) {
  const item = session.queue[session.index];
  const tokens = item.full.split(" ");
  const chips = shuffle(tokens);

  const wrap = document.createElement("div");
  wrap.className = "order-wrap";
  wrap.innerHTML = `
    <p class="order-instruction">${item.german ? escapeHtml(item.german) + " — " : ""}Tippe die Wörter in der richtigen Reihenfolge an.</p>
    <div class="order-slots order-slots-sentence"></div>
    <div class="order-chips"></div>
  `;
  body.appendChild(wrap);

  const slotsWrap = wrap.querySelector(".order-slots");
  tokens.forEach(() => {
    const slot = document.createElement("div");
    slot.className = "order-slot order-slot-sentence";
    slot.innerHTML = `<span class="order-slot-value"></span>`;
    slotsWrap.appendChild(slot);
  });
  const slots = slotsWrap.querySelectorAll(".order-slot");
  const chipWrap = wrap.querySelector(".order-chips");
  const placed = [];
  let answered = false;

  chips.forEach(word => {
    const chip = document.createElement("button");
    chip.className = "order-chip";
    chip.textContent = word;
    chip.addEventListener("click", () => {
      if (answered || chip.classList.contains("used") || placed.length >= tokens.length) return;
      chip.classList.add("used");
      const slot = slots[placed.length];
      slot.querySelector(".order-slot-value").textContent = word;
      slot.classList.add("filled");
      placed.push(word);
      if (placed.length === tokens.length) checkOrder();
    });
    chipWrap.appendChild(chip);
  });

  function checkOrder() {
    answered = true;
    const isCorrect = placed.every((w, i) => w === tokens[i]);
    slots.forEach((slot, i) => {
      slot.classList.add(placed[i] === tokens[i] ? "correct" : "wrong");
    });
    if (isCorrect) { session.correct++; session.xp += 10; }
    else { session.wrong++; requeueIfWrong(item); }
    setTimeout(() => { session.index++; renderSessionStep(); }, 1500);
  }
}

// ---------------- MANAGE ----------------

let manageLang = "en";
let manageSearch = "";

document.querySelectorAll("[data-manage-lang]").forEach(b => {
  b.addEventListener("click", () => { manageLang = b.dataset.manageLang; renderManage(); });
});

document.getElementById("manage-search").addEventListener("input", e => {
  manageSearch = e.target.value;
  renderManage();
});

function renderManage() {
  document.querySelectorAll("[data-manage-lang]").forEach(b => {
    b.classList.toggle("active", b.dataset.manageLang === manageLang);
  });

  const tbody = document.getElementById("vocab-tbody");
  tbody.innerHTML = "";

  const q = normalize(manageSearch);
  const list = wordsForLang(manageLang)
    .filter(w => !q || normalize(w.de).includes(q) || normalize(w.target).includes(q) || normalize(w.category).includes(q))
    .sort((a, b) => a.de.localeCompare(b.de, "de"));

  document.getElementById("vocab-empty").classList.toggle("hidden", list.length > 0);

  list.forEach(w => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(w.de)}</td>
      <td>${escapeHtml(w.target)}</td>
      <td>${escapeHtml(w.category || "—")}</td>
      <td><span class="box-badge">Box ${w.box}</span></td>
      <td><button class="row-delete" title="Löschen">🗑️</button></td>
    `;
    tr.querySelector(".row-delete").addEventListener("click", () => {
      if (confirm(`"${w.de}" wirklich löschen?`)) {
        DATA.words = DATA.words.filter(x => x.id !== w.id);
        persist();
        renderManage();
      }
    });
    tbody.appendChild(tr);
  });
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

document.getElementById("add-form").addEventListener("submit", e => {
  e.preventDefault();
  const de = document.getElementById("add-de").value.trim();
  const target = document.getElementById("add-target").value.trim();
  const category = document.getElementById("add-category").value.trim();
  if (!de || !target) return;
  DATA.words.push(makeWord(manageLang, de, target, category));
  persist();
  e.target.reset();
  document.getElementById("add-de").focus();
  renderManage();
  renderHome();
});

document.getElementById("bulk-add-btn").addEventListener("click", () => {
  const raw = document.getElementById("bulk-text").value;
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  let added = 0;
  lines.forEach(line => {
    const parts = line.split("=");
    if (parts.length !== 2) return;
    const de = parts[0].trim(), target = parts[1].trim();
    if (!de || !target) return;
    DATA.words.push(makeWord(manageLang, de, target, ""));
    added++;
  });
  if (added > 0) {
    persist();
    document.getElementById("bulk-text").value = "";
    renderManage();
    renderHome();
    alert(`${added} Vokabel${added === 1 ? "" : "n"} hinzugefügt! 🎉`);
  } else {
    alert("Keine gültigen Zeilen gefunden. Format: Deutsch = Übersetzung");
  }
});

// ---------------- STATS ----------------

const BADGES = [
  { id: "first10", emoji: "🌱", name: "10 Wörter", test: () => DATA.words.length >= 10 },
  { id: "first50", emoji: "🌳", name: "50 Wörter", test: () => DATA.words.length >= 50 },
  { id: "streak3", emoji: "🔥", name: "3 Tage Serie", test: () => DATA.streak.count >= 3 },
  { id: "streak7", emoji: "🏆", name: "7 Tage Serie", test: () => DATA.streak.count >= 7 },
  { id: "points100", emoji: "⭐", name: "100 Punkte", test: () => DATA.points >= 100 },
  { id: "points500", emoji: "💎", name: "500 Punkte", test: () => DATA.points >= 500 },
  { id: "master10", emoji: "🌟", name: "10 gemeistert", test: () => DATA.words.filter(w => w.box === MAX_BOX).length >= 10 },
  { id: "snake1000", emoji: "🐍", name: "1000 Punkte – Snake!", test: () => snakeUnlocked() },
];

function renderStats() {
  document.getElementById("stat-points").textContent = DATA.points;
  document.getElementById("stat-streak").textContent = DATA.streak.count;
  document.getElementById("stat-level").textContent = Math.floor(DATA.points / 100) + 1;
  document.getElementById("stat-mastered").textContent = DATA.words.filter(w => w.box === MAX_BOX).length;

  ["en", "es"].forEach(lang => {
    const words = wordsForLang(lang);
    const mastered = words.filter(w => w.box === MAX_BOX).length;
    const pct = words.length ? Math.round(mastered / words.length * 100) : 0;
    document.getElementById("progress-" + lang).style.width = pct + "%";
    document.getElementById("progress-" + lang + "-text").textContent = pct + "%";
  });

  const badgesEl = document.getElementById("badges");
  badgesEl.innerHTML = "";
  BADGES.forEach(b => {
    const earned = b.test();
    const el = document.createElement("div");
    el.className = "badge" + (earned ? " earned" : "");
    el.innerHTML = `<span class="badge-emoji">${b.emoji}</span><span class="badge-name">${b.name}</span>`;
    badgesEl.appendChild(el);
  });
}

// ---------------- Snake (Belohnung ab 1000 Punkten) ----------------
// Klassisches Snake, eine Runde pro Spiel (Game Over = zurück zum Startbildschirm).

const SNAKE_GRID = 20;
const SNAKE_CELL = 24;
const SNAKE_SPEED_MS = 130;

let snakeGame = null; // { snake, dir, pendingDir, food, score, timer, running }
let snakeRoundUsed = false; // true nach Game Over: die eine Runde ist verbraucht

const snakeCanvas = document.getElementById("snake-canvas");
const snakeCtx = snakeCanvas.getContext("2d");

function renderSnakeEntry() {
  snakeRoundUsed = false;
  document.getElementById("snake-highscore").textContent = "🏆 " + (DATA.snakeHighscore || 0);
  document.getElementById("snake-score").textContent = "🍎 0";
  document.getElementById("snake-overlay-title").textContent = "🐍 Bereit?";
  document.getElementById("snake-overlay-text").textContent = SNAKE_PREVIEW
    ? "Sammle Äpfel, weiche Wänden und deinem eigenen Schwanz aus! Nur eine Runde, dann ist Schluss."
    : `Sammle Äpfel, weiche Wänden und deinem eigenen Schwanz aus! Nur eine Runde, dann ist Schluss — die Runde kostet ${SNAKE_UNLOCK_POINTS} Punkte.`;
  document.getElementById("snake-start-btn").textContent = "Los geht's!";
  document.getElementById("snake-overlay").classList.remove("hidden");
  drawSnakeBoard(initialSnakeSnake(), randomSnakeFood(initialSnakeSnake()));
}

function initialSnakeSnake() {
  const mid = Math.floor(SNAKE_GRID / 2);
  return [{ x: mid - 1, y: mid }, { x: mid - 2, y: mid }, { x: mid - 3, y: mid }];
}

function randomSnakeFood(snake) {
  let food;
  do {
    food = { x: Math.floor(Math.random() * SNAKE_GRID), y: Math.floor(Math.random() * SNAKE_GRID) };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
  return food;
}

function startSnakeRound() {
  const snake = initialSnakeSnake();
  snakeGame = {
    snake,
    dir: { x: 1, y: 0 },
    pendingDir: { x: 1, y: 0 },
    food: randomSnakeFood(snake),
    score: 0,
    running: true,
    timer: setInterval(snakeTick, SNAKE_SPEED_MS),
  };
  document.getElementById("snake-overlay").classList.add("hidden");
  document.getElementById("snake-score").textContent = "🍎 0";
}

function stopSnakeGame() {
  if (snakeGame && snakeGame.timer) clearInterval(snakeGame.timer);
  if (snakeGame && snakeGame.running) {
    snakeGame.running = false;
    consumeSnakeRound(snakeGame.score); // auch bei Flucht per "Zurück" zählt die Runde als verbraucht
  }
}

// Schließt die eine erlaubte Runde ab: Highscore aktualisieren, nur die 1000
// "Eintrittspunkte" abziehen (nicht den gesamten Punktestand).
// In der Vorschau (?snake=1) werden keine echten Daten verändert.
function consumeSnakeRound(score) {
  snakeRoundUsed = true;
  if (SNAKE_PREVIEW) return;
  if (score > (DATA.snakeHighscore || 0)) DATA.snakeHighscore = score;
  DATA.points = Math.max(0, DATA.points - SNAKE_UNLOCK_POINTS);
  persist();
  updateHeaderStats();
}

function snakeSetDirection(dx, dy) {
  if (!snakeGame || !snakeGame.running) return;
  const cur = snakeGame.dir;
  if (dx === -cur.x && dy === -cur.y) return; // kein direktes Umkehren
  snakeGame.pendingDir = { x: dx, y: dy };
}

function snakeTick() {
  const g = snakeGame;
  g.dir = g.pendingDir;
  const head = g.snake[0];
  const newHead = { x: head.x + g.dir.x, y: head.y + g.dir.y };

  const hitsWall = newHead.x < 0 || newHead.x >= SNAKE_GRID || newHead.y < 0 || newHead.y >= SNAKE_GRID;
  const hitsSelf = g.snake.some(s => s.x === newHead.x && s.y === newHead.y);
  if (hitsWall || hitsSelf) {
    endSnakeRound();
    return;
  }

  g.snake.unshift(newHead);
  if (newHead.x === g.food.x && newHead.y === g.food.y) {
    g.score++;
    document.getElementById("snake-score").textContent = "🍎 " + g.score;
    g.food = randomSnakeFood(g.snake);
  } else {
    g.snake.pop();
  }

  drawSnakeBoard(g.snake, g.food);
}

function endSnakeRound() {
  const g = snakeGame;
  const previousHighscore = DATA.snakeHighscore || 0;
  const finalScore = g.score;
  stopSnakeGame(); // ruft consumeSnakeRound() auf, da g.running noch true ist
  const isNewHighscore = finalScore > previousHighscore;

  document.getElementById("snake-highscore").textContent = "🏆 " + (DATA.snakeHighscore || 0);
  document.getElementById("snake-overlay-title").textContent = isNewHighscore ? "🏆 Neuer Highscore!" : "🐍 Game Over!";
  const remainingToUnlock = Math.max(0, SNAKE_UNLOCK_POINTS - DATA.points);
  document.getElementById("snake-overlay-text").textContent = SNAKE_PREVIEW
    ? `Du hast ${finalScore} ${finalScore === 1 ? "Apfel" : "Äpfel"} gesammelt. (Vorschau: Punkte wurden nicht verändert.)`
    : `Du hast ${finalScore} ${finalScore === 1 ? "Apfel" : "Äpfel"} gesammelt. ${SNAKE_UNLOCK_POINTS} Punkte wurden für die Runde abgezogen (du hast noch ${DATA.points} Punkte). Noch ${remainingToUnlock} Punkte bis zur nächsten Runde!`;
  document.getElementById("snake-start-btn").textContent = "Zur Startseite";
  document.getElementById("snake-overlay").classList.remove("hidden");
}

function drawSnakeBoard(snake, food) {
  snakeCtx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);
  snakeCtx.fillStyle = "#292454";
  snakeCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

  snakeCtx.fillStyle = "#ff6fa5";
  snakeCtx.fillRect(food.x * SNAKE_CELL + 2, food.y * SNAKE_CELL + 2, SNAKE_CELL - 4, SNAKE_CELL - 4);

  snake.forEach((s, i) => {
    snakeCtx.fillStyle = i === 0 ? "#ffa63d" : "#7c5cff";
    snakeCtx.fillRect(s.x * SNAKE_CELL + 1, s.y * SNAKE_CELL + 1, SNAKE_CELL - 2, SNAKE_CELL - 2);
  });
}

document.getElementById("snake-start-btn").addEventListener("click", () => {
  if (snakeRoundUsed) showView("home");
  else startSnakeRound();
});
document.getElementById("snake-up").addEventListener("click", () => snakeSetDirection(0, -1));
document.getElementById("snake-down").addEventListener("click", () => snakeSetDirection(0, 1));
document.getElementById("snake-left").addEventListener("click", () => snakeSetDirection(-1, 0));
document.getElementById("snake-right").addEventListener("click", () => snakeSetDirection(1, 0));

document.addEventListener("keydown", e => {
  if (document.getElementById("view-snake").classList.contains("hidden")) return;
  const key = e.key.toLowerCase();
  if (["arrowup", "w"].includes(key)) { snakeSetDirection(0, -1); e.preventDefault(); }
  else if (["arrowdown", "s"].includes(key)) { snakeSetDirection(0, 1); e.preventDefault(); }
  else if (["arrowleft", "a"].includes(key)) { snakeSetDirection(-1, 0); e.preventDefault(); }
  else if (["arrowright", "d"].includes(key)) { snakeSetDirection(1, 0); e.preventDefault(); }
});

// ---------------- Init ----------------

showView("players");
