(() => {
  "use strict";

  // ------------------------------------------------------------------
  // Config
  // ------------------------------------------------------------------
  const CB = `v=${Math.floor(Date.now() / (30 * 60 * 1000))}`;
  const IS_LOCAL = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const DATA_URL =
    new URLSearchParams(location.search).get("data") ||
    (IS_LOCAL
      ? "otrkey_files.zip"
      : `https://raw.githubusercontent.com/simonmb/otrkey_files/refs/heads/main/otrkey_files.zip?${CB}`);
  const MIRRORS_URL = `https://cdn.jsdelivr.net/gh/simonmb/otrkey_files@main/mirrors.json?${CB}`;
  const CUTLIST_BASE = "http://cutlist.at/#!/search?q=";
  const PAGE = 40;
  const DUR_MAX = 300; // slider max; DUR_MAX means "no upper limit"

  // format bits
  const FMT = { HD: 1, HQ: 2, LQ: 4, avi: 8, mp4: 16, ac3: 32, mp3: 64, AddOn: 128 };
  const FMT_ORDER = ["HD", "HQ", "LQ", "avi", "mp4", "AddOn", "ac3", "mp3"];
  const FMT_LABEL = { HD: "HD", HQ: "HQ", LQ: "LQ", avi: "SD", mp4: "MP4", ac3: "AC3", mp3: "MP3", AddOn: "AddOn" };
  const FMT_COLOR = { HD: "--f-hd", HQ: "--f-hq", LQ: "--f-lq", avi: "--f-sd", mp4: "--f-mp4", ac3: "--f-audio", mp3: "--f-audio", AddOn: "--f-addon" };
  const QUAL = [
    { key: "HD", mask: FMT.HD },
    { key: "HQ", mask: FMT.HQ },
    { key: "LQ", mask: FMT.LQ },
    { key: "SD", mask: FMT.avi },
    { key: "MP4", mask: FMT.mp4 },
    { key: "AUDIO", mask: FMT.ac3 | FMT.mp3 },
    { key: "ADDON", mask: FMT.AddOn },
  ];
  const TYPES = { movie: 1, series: 2, news: 4, sport: 8 };
  const DUR_PRESETS = [
    { key: "lt30", min: 0, max: 30 },
    { key: "30to60", min: 30, max: 60 },
    { key: "60to90", min: 60, max: 90 },
    { key: "90to120", min: 90, max: 120 },
    { key: "gt120", min: 120, max: DUR_MAX },
    { key: "any", min: 0, max: DUR_MAX },
  ];
  const ERR_KEYS = ["MissingBeginning", "MissingEnding", "MissingVideo", "MissingAudio", "OtherError", "EPGError"];

  // ------------------------------------------------------------------
  // i18n
  // ------------------------------------------------------------------
  const I18N = {
    de: {
      heroTitle: "Aufnahmen finden",
      heroLead: "Durchsucht die Dateilisten aller bekannten OTR-Mirrors – otrkey und otr2.",
      searchLabel: "Suche",
      searchPh: "Titel, Serie oder Sender…",
      hint: 'Tipp: mehrere Wörter in beliebiger Reihenfolge, z.&nbsp;B. <code>tatort münster</code>, <code>simpsons s05e03</code> oder <code>arte doku</code>.',
      loading: "Lade Datenbank…",
      loadingPct: "Lade Datenbank… {p} %",
      unzipping: "Entpacke…",
      processing: "Verarbeite {n} Dateien…",
      loadError: "Die Datenbank konnte nicht geladen werden.",
      retry: "Erneut versuchen",
      filters: "Filter",
      reset: "Zurücksetzen",
      done: "Fertig",
      showN: "{n} anzeigen",
      period: "Zeitraum",
      from: "Von",
      to: "Bis",
      quality: "Qualität",
      type: "Art",
      typeNote: "Automatisch erkannt aus Titel, Folge und Dauer.",
      duration: "Dauer",
      channels: "Sender",
      clear: "leeren",
      chanPh: "Sender suchen…",
      more: "Weitere",
      withCutlist: "Mit Cutlist",
      noErrors: "Ohne Fehlermeldung",
      mirrors: "Mirrors",
      latest: "Neueste Aufnahmen",
      results: "Ergebnisse",
      sortBy: "Sortieren nach",
      sDate: "Datum",
      sRelevance: "Relevanz",
      sTitle: "Titel",
      sChannel: "Sender",
      sDuration: "Dauer",
      asc: "Aufsteigend",
      desc: "Absteigend",
      showMore: "Mehr anzeigen",
      footer: "Diese Seite speichert keine Dateien, sie verlinkt nur auf die Suchseiten der Mirrors. Die Dateiliste wird etwa alle 30 Minuten aktualisiert.",
      count: "{r} · {f}",
      rec1: "1 Aufnahme",
      recN: "{n} Aufnahmen",
      file1: "1 Datei",
      fileN: "{n} Dateien",
      mirrorsHidden1: "1 Mirror ausgeblendet",
      dataPill: "{n} Dateien · bis {d}",
      qAll: "Alle",
      qToday: "Heute",
      qWeek: "Diese Woche",
      qHD: "Nur HD",
      pToday: "Heute",
      pYesterday: "Gestern",
      p7: "7 Tage",
      p30: "30 Tage",
      pAll: "Alle",
      t_movie: "Filme",
      t_series: "Serien",
      t_news: "Nachrichten",
      t_sport: "Sport",
      q_HD: "HD",
      q_HQ: "HQ",
      q_LQ: "LQ",
      q_SD: "SD (avi)",
      q_MP4: "MP4",
      q_AUDIO: "Audio",
      q_ADDON: "AddOn",
      qt_HD: "HD-Video",
      qt_HQ: "HQ-Video",
      qt_LQ: "Niedrige Qualität (otr2)",
      qt_SD: "Standard-Video (avi, otrkey)",
      qt_MP4: "MP4-Video (otrkey)",
      qt_AUDIO: "Nur Ton (AC3 / MP3)",
      qt_ADDON: "AddOn-Datei (otr2)",
      d_lt30: "< 30 Min",
      d_30to60: "30–60",
      d_60to90: "60–90",
      d_90to120: "90–120",
      d_gt120: "2 Std+",
      d_any: "Beliebig",
      durAny: "beliebig",
      emptyTitle: "Nichts gefunden",
      emptyText: "Versuche weniger oder andere Suchbegriffe oder setze die Filter zurück.",
      resetAll: "Filter zurücksetzen",
      cutlists: "{n} Cutlists",
      noCutlist: "keine Cutlist",
      errors: "Fehler gemeldet",
      errorsLong: "In Cutlists gemeldet: {e}",
      mirrorsN: "{n} Mirrors",
      mirror1: "1 Mirror",
      copy: "Kopieren",
      copied: "Dateiname kopiert",
      allAirings: "Alle Ausstrahlungen",
      onlyChannel: "Nur {c}",
      searchCutlists: "Cutlists suchen",
      hiddenByFilter: "{n} weitere Dateien durch Filter ausgeblendet",
      dateRange: "Datum: {a} – {b}",
      durRange: "Dauer: {a}–{b} Min",
      durFrom: "Dauer: ab {a} Min",
      mirrorsHidden: "{n} Mirrors ausgeblendet",
      chanCount: "{n} Sender",
      noChannels: "Kein Sender gefunden",
      err_MissingBeginning: "Anfang fehlt",
      err_MissingEnding: "Ende fehlt",
      err_MissingVideo: "Bild fehlt",
      err_MissingAudio: "Ton fehlt",
      err_OtherError: "Sonstiger Fehler",
      err_EPGError: "EPG-Fehler",
      themeLight: "Helles Design",
      themeDark: "Dunkles Design",
      accentTitle: "Akzentfarbe",
      accentCustom: "Eigene Farbe",
      accentReset: "Standard",
      c_blue: "Blau", c_sky: "Himmelblau", c_teal: "Petrol", c_green: "Grün", c_amber: "Bernstein",
      c_orange: "Orange", c_red: "Rot", c_pink: "Pink", c_violet: "Violett", c_slate: "Schiefergrau",
    },
    en: {
      heroTitle: "Find recordings",
      heroLead: "Searches the file lists of all known OTR mirrors – otrkey and otr2.",
      searchLabel: "Search",
      searchPh: "Title, series or channel…",
      hint: 'Tip: several words in any order, e.g. <code>tatort münster</code>, <code>simpsons s05e03</code> or <code>arte doku</code>.',
      loading: "Loading database…",
      loadingPct: "Loading database… {p} %",
      unzipping: "Unpacking…",
      processing: "Processing {n} files…",
      loadError: "The database could not be loaded.",
      retry: "Try again",
      filters: "Filters",
      reset: "Reset",
      done: "Done",
      showN: "Show {n}",
      period: "Date",
      from: "From",
      to: "To",
      quality: "Quality",
      type: "Type",
      typeNote: "Detected automatically from title, episode and duration.",
      duration: "Duration",
      channels: "Channels",
      clear: "clear",
      chanPh: "Search channels…",
      more: "More",
      withCutlist: "Has cutlist",
      noErrors: "No reported errors",
      mirrors: "Mirrors",
      latest: "Latest recordings",
      results: "Results",
      sortBy: "Sort by",
      sDate: "Date",
      sRelevance: "Relevance",
      sTitle: "Title",
      sChannel: "Channel",
      sDuration: "Duration",
      asc: "Ascending",
      desc: "Descending",
      showMore: "Show more",
      footer: "This site stores no files; it only links to the mirrors' search pages. The file list is refreshed about every 30 minutes.",
      count: "{r} · {f}",
      rec1: "1 recording",
      recN: "{n} recordings",
      file1: "1 file",
      fileN: "{n} files",
      mirrorsHidden1: "1 mirror hidden",
      dataPill: "{n} files · up to {d}",
      qAll: "All",
      qToday: "Today",
      qWeek: "This week",
      qHD: "HD only",
      pToday: "Today",
      pYesterday: "Yesterday",
      p7: "7 days",
      p30: "30 days",
      pAll: "All",
      t_movie: "Movies",
      t_series: "Series",
      t_news: "News",
      t_sport: "Sports",
      q_HD: "HD",
      q_HQ: "HQ",
      q_LQ: "LQ",
      q_SD: "SD (avi)",
      q_MP4: "MP4",
      q_AUDIO: "Audio",
      q_ADDON: "AddOn",
      qt_HD: "HD video",
      qt_HQ: "HQ video",
      qt_LQ: "Low quality (otr2)",
      qt_SD: "Standard video (avi, otrkey)",
      qt_MP4: "MP4 video (otrkey)",
      qt_AUDIO: "Audio only (AC3 / MP3)",
      qt_ADDON: "AddOn file (otr2)",
      d_lt30: "< 30 min",
      d_30to60: "30–60",
      d_60to90: "60–90",
      d_90to120: "90–120",
      d_gt120: "2 h+",
      d_any: "Any",
      durAny: "any",
      emptyTitle: "Nothing found",
      emptyText: "Try fewer or different words, or reset the filters.",
      resetAll: "Reset filters",
      cutlists: "{n} cutlists",
      noCutlist: "no cutlist",
      errors: "errors reported",
      errorsLong: "Reported in cutlists: {e}",
      mirrorsN: "{n} mirrors",
      mirror1: "1 mirror",
      copy: "Copy",
      copied: "File name copied",
      allAirings: "All airings",
      onlyChannel: "Only {c}",
      searchCutlists: "Search cutlists",
      hiddenByFilter: "{n} more files hidden by filters",
      dateRange: "Date: {a} – {b}",
      durRange: "Duration: {a}–{b} min",
      durFrom: "Duration: from {a} min",
      mirrorsHidden: "{n} mirrors hidden",
      chanCount: "{n} channels",
      noChannels: "No channel found",
      err_MissingBeginning: "beginning missing",
      err_MissingEnding: "ending missing",
      err_MissingVideo: "video missing",
      err_MissingAudio: "audio missing",
      err_OtherError: "other error",
      err_EPGError: "EPG error",
      themeLight: "Light theme",
      themeDark: "Dark theme",
      accentTitle: "Accent color",
      accentCustom: "Custom color",
      accentReset: "Default",
      c_blue: "Blue", c_sky: "Sky", c_teal: "Teal", c_green: "Green", c_amber: "Amber",
      c_orange: "Orange", c_red: "Red", c_pink: "Pink", c_violet: "Violet", c_slate: "Slate",
    },
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  let lang = store.get("lang") || ((navigator.language || "de").toLowerCase().startsWith("de") ? "de" : "en");
  const t = (key, vars) => {
    let s = (I18N[lang] && I18N[lang][key]) ?? I18N.de[key] ?? key;
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
    return s;
  };
  const nf = () => new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB");
  const fmtNum = (n) => nf().format(n);
  const plural = (base, n) => (n === 1 ? t(`${base}1`) : t(`${base}N`, { n: fmtNum(n) }));

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); };

  function normalize(s) {
    return s
      .toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function fmtDuration(min) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  function fmtDateShort(iso) {
    const [y, m, d] = iso.split("-");
    return lang === "de" ? `${d}.${m}.${y}` : `${d}/${m}/${y}`;
  }

  let toastTimer;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  // ------------------------------------------------------------------
  // Filename parsing (old .otrkey and new .otr2 names)
  // ------------------------------------------------------------------
  const NAME_RX =
    /^(.+?)(?:_S(\d{2})E(\d{2}))?_(\d{2})\.(\d{2})\.(\d{2})_(\d{2})-(\d{2})_([a-z0-9+.]+?)_(\d+)_TVOON_DE((?:\.[A-Za-z0-9]+)*)\.(otrkey|otr2)$/i;

  function parseName(name) {
    const m = NAME_RX.exec(name);
    if (!m) return null;
    const tokens = m[11].toLowerCase().split(".").filter(Boolean);
    const audio = tokens.find((x) => x === "ac3" || x === "mp3");
    const qual = tokens.find((x) => x === "hd" || x === "hq" || x === "lq");
    const video = tokens.find((x) => x === "avi" || x === "mp4");
    const format = audio || (tokens.includes("addon") ? "AddOn" : null) || (qual && qual.toUpperCase()) || video || "avi";
    return {
      rawTitle: m[1], season: m[2] || "", episode: m[3] || "",
      yy: m[4], mm: m[5], dd: m[6], hh: m[7], mi: m[8],
      channel: m[9].toLowerCase(), duration: +m[10], format, container: m[12].toLowerCase(),
    };
  }

  const prettyTitle = (raw) => raw.replace(/_{3}/g, " & ").replace(/_{2,}/g, " – ").replace(/_*-{2,}_*/g, " · ").replace(/_/g, " ").replace(/\s+/g, " ").replace(/^[\s–]+|[\s–]+$/g, "");

  const NEWS_START = /^(tagesschau|tagesthemen|heute|nachrichten|rtl aktuell|rtl nachtjournal|zib|zeit im bild|morgenmagazin|mittagsmagazin|nachtmagazin|brennpunkt|logo|aktuelle stunde|abendschau|landesschau|hessenschau|punkt 12|euronews|rbb24|sat 1 nachrichten|wetter|ntv nachrichten|welt nachrichten)\b/;
  const NEWS_ANY = /\b(nachrichten|news|tagesschau|newstime)\b/;
  const SPORT_ANY = /\b(sport|sportschau|sportstudio|sport1|sportclub|fussball\w*|bundesliga|champions league|europa league|conference league|dfb pokal|formel 1|formel1|motogp|tennis|handball|biathlon|skispringen|ski alpin|langlauf|olympi\w*|boxen|eishockey|basketball|volleyball|darts|radsport|tour de france|leichtathletik|wm|nfl|nba|nhl|snooker|ran racing)\b/;

  // ------------------------------------------------------------------
  // Data
  // ------------------------------------------------------------------
  let mirrors = []; // {name, search_url}
  let recs = []; // recordings
  let byDate = []; // recs sorted newest first
  let channels = []; // [{ch, n}]
  let totalFiles = 0;
  let mirrorCounts = [];
  let loaded = false;

  function downloadWithProgress(url, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () => (xhr.status === 200 ? resolve(xhr.response) : reject(new Error(`HTTP ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send();
    });
  }

  const tick = () => new Promise((r) => setTimeout(r, 0));

  async function loadData() {
    const bar = $("progressBar"), status = $("statusLine");
    $("loading").hidden = false;
    status.textContent = t("loading");
    bar.style.width = "0";

    const mirrorsPromise = fetch(MIRRORS_URL).then((r) => r.json());
    const buf = await downloadWithProgress(DATA_URL, (p) => {
      bar.style.width = `${Math.round(p * 90)}%`;
      status.textContent = t("loadingPct", { p: Math.round(p * 100) });
    });
    status.textContent = t("unzipping");
    await tick();
    const zip = await JSZip.loadAsync(buf);
    const csvFile = zip.file("otrkey_files.csv");
    if (!csvFile) throw new Error("otrkey_files.csv missing in zip");
    const csvText = await csvFile.async("text");
    mirrors = await mirrorsPromise;

    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
    totalFiles = parsed.length;
    bar.style.width = "95%";
    status.textContent = t("processing", { n: fmtNum(totalFiles) });
    await tick();
    build(parsed);
    bar.style.width = "100%";
    setTimeout(() => ($("loading").hidden = true), 300);
    loaded = true;
  }

  function build(rows) {
    const mirrorIndex = new Map(mirrors.map((m, i) => [m.name, i]));
    const map = new Map();
    const chanCount = new Map();

    for (const row of rows) {
      const p = parseName(row.file_name || "");
      if (!p) continue;
      let mi = mirrorIndex.get(row.mirror_name);
      if (mi === undefined) {
        mi = mirrors.length;
        mirrors.push({ name: row.mirror_name, search_url: null });
        mirrorIndex.set(row.mirror_name, mi);
      }
      const key = `${p.rawTitle}|${p.yy}${p.mm}${p.dd}|${p.hh}${p.mi}|${p.channel}|${p.duration}`;
      let r = map.get(key);
      if (!r) {
        const title = prettyTitle(p.rawTitle);
        const nt = normalize(title);
        const se = p.season ? `s${p.season}e${p.episode}` : "";
        r = {
          title, nt, se,
          ch: p.channel,
          d: p.duration,
          date: `20${p.yy}-${p.mm}-${p.dd}`,
          time: `${p.hh}:${p.mi}`,
          ts: +`20${p.yy}${p.mm}${p.dd}${p.hh}${p.mi}`,
          hay: `${nt} ${normalize(p.channel)} ${se}`,
          files: [], fm: 0, mm: 0, cut: 0, err: "", cat: 0,
          cutKey: row.file_name.split("_TVOON_")[0],
        };
        let cat = 0;
        if (se) cat |= TYPES.series;
        if (NEWS_START.test(nt) || NEWS_ANY.test(nt)) cat |= TYPES.news;
        if (SPORT_ANY.test(nt)) cat |= TYPES.sport;
        if (!se && !(cat & (TYPES.news | TYPES.sport)) && r.d >= 75 && r.d <= 240) cat |= TYPES.movie;
        r.cat = cat;
        map.set(key, r);
        chanCount.set(p.channel, (chanCount.get(p.channel) || 0) + 1);
      }
      r.files.push({ m: mi, f: row.file_name, fmt: p.format, c: p.container });
      r.fm |= FMT[p.format];
      r.mm |= 1 << mi;
      const n = +row.n_cutlists || 0;
      if (n > r.cut) r.cut = n;
      const e = (row.all_errors || "").trim();
      if (e && !r.err.includes(e)) r.err = r.err ? `${r.err}/${e}` : e;
    }

    recs = Array.from(map.values());
    byDate = recs.slice().sort((a, b) => b.ts - a.ts || (a.nt < b.nt ? -1 : 1));
    channels = Array.from(chanCount, ([ch, n]) => ({ ch, n })).sort((a, b) => b.n - a.n);
    mirrorCounts = mirrors.map(() => 0);
    for (const r of recs) for (let i = 0; i < mirrors.length; i++) if (r.mm & (1 << i)) mirrorCounts[i]++;

    const newest = byDate[0];
    if (newest) {
      $("dataPill").hidden = false;
      $("dataPill").dataset.n = totalFiles;
      $("dataPill").dataset.d = newest.date;
    }
  }

  // ------------------------------------------------------------------
  // State (mirrored in the URL hash so links can be shared)
  // ------------------------------------------------------------------
  const DEFAULT_DIR = { date: "desc", relevance: "desc", title: "asc", channel: "asc", duration: "desc" };
  const blankState = () => ({
    q: "", sort: "date", dir: "desc", from: "", to: "", qual: [], type: "",
    dmin: 0, dmax: DUR_MAX, ch: [], cut: false, noerr: false, mx: [],
  });
  let state = blankState();

  function stateToHash() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.sort !== "date") p.set("sort", state.sort);
    if (state.dir !== DEFAULT_DIR[state.sort]) p.set("dir", state.dir);
    if (state.from) p.set("from", state.from);
    if (state.to) p.set("to", state.to);
    if (state.qual.length) p.set("quality", state.qual.join(","));
    if (state.type) p.set("type", state.type);
    if (state.dmin > 0) p.set("dmin", state.dmin);
    if (state.dmax < DUR_MAX) p.set("dmax", state.dmax);
    if (state.ch.length) p.set("channel", state.ch.join(","));
    if (state.cut) p.set("cutlist", "1");
    if (state.noerr) p.set("noerrors", "1");
    if (state.mx.length) p.set("hide", state.mx.join(","));
    const s = p.toString();
    return s ? `#${s}` : "";
  }

  function hashToState() {
    const p = new URLSearchParams(location.hash.slice(1));
    const s = blankState();
    const list = (k) => (p.get(k) || "").split(",").filter(Boolean);
    s.q = p.get("q") || "";
    s.sort = DEFAULT_DIR[p.get("sort")] ? p.get("sort") : "date";
    s.dir = p.get("dir") === "asc" || p.get("dir") === "desc" ? p.get("dir") : DEFAULT_DIR[s.sort];
    s.from = /^\d{4}-\d{2}-\d{2}$/.test(p.get("from")) ? p.get("from") : "";
    s.to = /^\d{4}-\d{2}-\d{2}$/.test(p.get("to")) ? p.get("to") : "";
    s.qual = list("quality").filter((k) => QUAL.some((q) => q.key === k));
    s.type = TYPES[p.get("type")] ? p.get("type") : "";
    s.dmin = Math.max(0, Math.min(DUR_MAX, +p.get("dmin") || 0));
    s.dmax = p.has("dmax") ? Math.max(s.dmin, Math.min(DUR_MAX, +p.get("dmax") || DUR_MAX)) : DUR_MAX;
    s.ch = list("channel");
    s.cut = p.get("cutlist") === "1";
    s.noerr = p.get("noerrors") === "1";
    s.mx = list("hide");
    return s;
  }

  let lastHash = "";
  function syncHash() {
    const h = stateToHash();
    if (h !== lastHash) {
      lastHash = h;
      history.replaceState(null, "", h || location.pathname + location.search);
    }
  }

  // ------------------------------------------------------------------
  // Filtering & sorting
  // ------------------------------------------------------------------
  const collator = () => new Intl.Collator(lang === "de" ? "de" : "en", { sensitivity: "base" });
  let current = []; // filtered + sorted recs
  let currentFiles = 0;
  let shown = 0;

  function qualMask() {
    let m = 0;
    for (const k of state.qual) m |= QUAL.find((q) => q.key === k).mask;
    return m;
  }
  function mirrorMask() {
    let m = 0;
    mirrors.forEach((mi, i) => { if (!state.mx.includes(mi.name)) m |= 1 << i; });
    return m;
  }
  const allMirrorsMask = () => (mirrors.length ? (2 ** mirrors.length) - 1 : 0);

  function fileMatches(f, qm, mm) {
    return (!qm || (FMT[f.fmt] & qm)) && (mm & (1 << f.m));
  }

  function runFilter() {
    const tokens = normalize(state.q).split(" ").filter(Boolean);
    const qm = qualMask();
    const mm = mirrorMask();
    const mirrorsFiltered = mm !== allMirrorsMask();
    const needFileCheck = qm && mirrorsFiltered;
    const tm = state.type ? TYPES[state.type] : 0;
    const chSet = state.ch.length ? new Set(state.ch) : null;
    const { from, to, dmin, dmax, cut, noerr } = state;

    const out = [];
    let files = 0;
    for (const r of byDate) {
      if (from && r.date < from) continue;
      if (to && r.date > to) continue;
      if (r.d < dmin || (dmax < DUR_MAX && r.d > dmax)) continue;
      if (tm && !(r.cat & tm)) continue;
      if (chSet && !chSet.has(r.ch)) continue;
      if (cut && !r.cut) continue;
      if (noerr && r.err) continue;
      if (qm && !(r.fm & qm)) continue;
      if (mirrorsFiltered && !(r.mm & mm)) continue;
      if (needFileCheck && !r.files.some((f) => fileMatches(f, qm, mm))) continue;
      let ok = true;
      for (const tk of tokens) if (!r.hay.includes(tk)) { ok = false; break; }
      if (!ok) continue;
      out.push(r);
      files += (qm || mirrorsFiltered) ? r.files.filter((f) => fileMatches(f, qm, mm)).length : r.files.length;
    }

    const asc = state.dir === "asc";
    const byTs = (a, b) => b.ts - a.ts;
    if (state.sort === "date") {
      if (asc) out.reverse();
    } else if (state.sort === "relevance" && tokens.length) {
      const qn = tokens.join(" ");
      for (const r of out) {
        let s = 0;
        if (r.nt === qn) s += 1000;
        else if (r.nt.startsWith(qn)) s += 300;
        const words = ` ${r.nt} `;
        for (const tk of tokens) s += words.includes(` ${tk} `) ? 40 : words.includes(` ${tk}`) ? 25 : r.nt.includes(tk) ? 10 : 2;
        r._s = s;
      }
      out.sort((a, b) => (asc ? a._s - b._s : b._s - a._s) || byTs(a, b));
    } else if (state.sort === "relevance") {
      if (asc) out.reverse();
    } else if (state.sort === "title") {
      const c = collator();
      out.sort((a, b) => (asc ? 1 : -1) * c.compare(a.title, b.title) || byTs(a, b));
    } else if (state.sort === "channel") {
      out.sort((a, b) => (asc ? 1 : -1) * (a.ch < b.ch ? -1 : a.ch > b.ch ? 1 : 0) || byTs(a, b));
    } else if (state.sort === "duration") {
      out.sort((a, b) => (asc ? a.d - b.d : b.d - a.d) || byTs(a, b));
    }
    current = out;
    currentFiles = files;
  }

  // ------------------------------------------------------------------
  // Rendering: results
  // ------------------------------------------------------------------
  const fbadge = (fmt) => `<span class="fbadge" style="--fc:var(${FMT_COLOR[fmt]})">${FMT_LABEL[fmt]}</span>`;

  function weekday(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { weekday: "short" }).replace(".", "");
  }

  function cardHTML(r, idx) {
    const [y, m, d] = r.date.split("-");
    const qm = qualMask(), mm = mirrorMask();
    const visible = r.files.filter((f) => fileMatches(f, qm, mm));
    let fm = 0, mset = new Set();
    for (const f of visible) { fm |= FMT[f.fmt]; mset.add(f.m); }
    const badges = FMT_ORDER.filter((k) => fm & FMT[k]).map(fbadge).join("");
    const errs = r.err ? r.err.split("/").filter(Boolean) : [];
    const errText = errs.map((e) => t(`err_${e}`)).join(", ");
    return `<li class="card" data-idx="${idx}">
      <button class="card-main" type="button" aria-expanded="false">
        <div class="datebox"><div class="wd">${esc(weekday(r.date))}</div><div class="dm">${d}.${m}.</div><div class="yr">${y}</div></div>
        <div>
          <div class="title">${esc(r.title)}${r.se ? `<span class="ep">${r.se.toUpperCase()}</span>` : ""}</div>
          <div class="meta">
            <span>${r.time}</span><span class="chan">${esc(r.ch)}</span><span>${fmtDuration(r.d)}</span>
            ${r.cut ? `<span class="tag-cut" title="${esc(t("cutlists", { n: r.cut }))}">✂ ${r.cut}</span>` : ""}
            ${errs.length ? `<span class="tag-warn" title="${esc(t("errorsLong", { e: errText }))}">⚠ ${esc(t("errors"))}</span>` : ""}
            <span>${mset.size === 1 ? t("mirror1") : t("mirrorsN", { n: mset.size })}</span>
          </div>
        </div>
        <div class="badges">${badges}<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></div>
      </button>
      <div class="details" hidden></div>
    </li>`;
  }

  function detailsHTML(r) {
    const qm = qualMask(), mm = mirrorMask();
    const byName = new Map();
    let hidden = 0;
    for (const f of r.files) {
      if (!fileMatches(f, qm, mm)) { hidden++; continue; }
      if (!byName.has(f.f)) byName.set(f.f, { ...f, ms: [] });
      byName.get(f.f).ms.push(f.m);
    }
    const rows = Array.from(byName.values()).sort(
      (a, b) => FMT_ORDER.indexOf(a.fmt) - FMT_ORDER.indexOf(b.fmt) || (a.c === b.c ? 0 : a.c === "otr2" ? -1 : 1)
    );
    const files = rows.map((f) => {
      const links = f.ms.map((mi) => {
        const m = mirrors[mi];
        if (!m.search_url) return `<span class="ghost">${esc(m.name)}</span>`;
        const url = m.search_url.replace("{query}", encodeURIComponent(f.f));
        return `<a class="mbtn" href="${esc(url)}" target="_blank" rel="noopener">↓ ${esc(m.name)}</a>`;
      }).join("");
      return `<div class="dfile">
        <div>${fbadge(f.fmt)}<br><span class="ctag">.${f.c}</span></div>
        <div>
          <div class="fname"><span>${esc(f.f)}</span><button class="copy-btn" type="button" data-copy="${esc(f.f)}">${t("copy")}</button></div>
          <div class="mirrors">${links}</div>
        </div>
      </div>`;
    }).join("");
    const errs = r.err ? r.err.split("/").filter(Boolean).map((e) => t(`err_${e}`)).join(", ") : "";
    return `${files}
      ${hidden ? `<p class="muted small" style="margin:8px 0 0">${t("hiddenByFilter", { n: hidden })}</p>` : ""}
      ${errs ? `<p class="small tag-warn" style="margin:8px 0 0">⚠ ${esc(t("errorsLong", { e: errs }))}</p>` : ""}
      <div class="dactions">
        <button class="ghost" type="button" data-act="airings">🔎 ${t("allAirings")}</button>
        <button class="ghost" type="button" data-act="channel">📺 ${esc(t("onlyChannel", { c: r.ch.toUpperCase() }))}</button>
        <a class="ghost" href="${esc(CUTLIST_BASE + encodeURIComponent(r.cutKey))}" target="_blank" rel="noopener">✂ ${t("searchCutlists")}${r.cut ? ` (${r.cut})` : ""} ↗</a>
      </div>`;
  }

  function renderResults() {
    const list = $("results");
    shown = 0;
    list.innerHTML = "";
    const searching = !!normalize(state.q) || activeFilters().length > 0;
    $("resultsTitle").textContent = searching ? t("results") : t("latest");
    $("resultsCount").textContent = t("count", { r: plural("rec", current.length), f: plural("file", currentFiles) });
    $("drawerClose").textContent = t("showN", { n: fmtNum(current.length) });
    if (!current.length) {
      list.innerHTML = `<li class="empty"><strong>${t("emptyTitle")}</strong>${t("emptyText")}
        ${activeFilters().length ? `<div style="margin-top:12px"><button class="ghost" type="button" data-act="resetAll">${t("resetAll")}</button></div>` : ""}</li>`;
      $("moreBtn").hidden = true;
      return;
    }
    renderMore();
  }

  function renderMore() {
    const end = Math.min(current.length, shown + PAGE);
    let html = "";
    for (let i = shown; i < end; i++) html += cardHTML(current[i], i);
    $("results").insertAdjacentHTML("beforeend", html);
    shown = end;
    $("moreBtn").hidden = shown >= current.length;
  }

  // ------------------------------------------------------------------
  // Rendering: filter controls
  // ------------------------------------------------------------------
  const PERIODS = [
    { key: "pToday", from: () => daysAgo(0), to: () => daysAgo(0) },
    { key: "pYesterday", from: () => daysAgo(1), to: () => daysAgo(1) },
    { key: "p7", from: () => daysAgo(6), to: () => "" },
    { key: "p30", from: () => daysAgo(29), to: () => "" },
    { key: "pAll", from: () => "", to: () => "" },
  ];
  const periodActive = (p) => state.from === p.from() && state.to === p.to();

  function chip(label, pressed, data, title) {
    return `<button class="chip sm" type="button" aria-pressed="${pressed}" ${data}${title ? ` title="${esc(title)}"` : ""}>${esc(label)}</button>`;
  }

  const QUICK = [
    { key: "qAll", active: () => activeFilters().length === 0, run: () => resetFilters() },
    { key: "qToday", active: () => periodActive(PERIODS[0]), run: () => togglePeriod(PERIODS[0]) },
    { key: "qWeek", active: () => periodActive(PERIODS[2]), run: () => togglePeriod(PERIODS[2]) },
    { key: "qHD", active: () => state.qual.length === 1 && state.qual[0] === "HD", run: () => { state.qual = state.qual.length === 1 && state.qual[0] === "HD" ? [] : ["HD"]; } },
    { key: "t_movie", active: () => state.type === "movie", run: () => toggleType("movie") },
    { key: "t_series", active: () => state.type === "series", run: () => toggleType("series") },
    { key: "t_news", active: () => state.type === "news", run: () => toggleType("news") },
    { key: "t_sport", active: () => state.type === "sport", run: () => toggleType("sport") },
    { key: "withCutlist", active: () => state.cut, run: () => { state.cut = !state.cut; } },
  ];

  function togglePeriod(p) {
    if (periodActive(p) && p.key !== "pAll") { state.from = ""; state.to = ""; }
    else { state.from = p.from(); state.to = p.to(); }
  }
  function toggleType(k) { state.type = state.type === k ? "" : k; }

  function renderControls() {
    $("quick").innerHTML = QUICK.map((q, i) =>
      `<button class="chip" type="button" aria-pressed="${q.active()}" data-quick="${i}">${esc(t(q.key))}</button>`).join("");
    $("periodChips").innerHTML = PERIODS.map((p, i) => chip(t(p.key), periodActive(p), `data-period="${i}"`)).join("");
    $("fromDate").value = state.from;
    $("toDate").value = state.to;
    $("qualityChips").innerHTML = QUAL.map((q) => chip(t(`q_${q.key}`), state.qual.includes(q.key), `data-qual="${q.key}"`, t(`qt_${q.key}`))).join("");
    $("typeChips").innerHTML = Object.keys(TYPES).map((k) => chip(t(`t_${k}`), state.type === k, `data-type="${k}"`)).join("");
    $("durChips").innerHTML = DUR_PRESETS.map((d) => chip(t(`d_${d.key}`), state.dmin === d.min && state.dmax === d.max, `data-dur="${d.key}"`)).join("");
    $("cutChip").setAttribute("aria-pressed", state.cut);
    $("noErrChip").setAttribute("aria-pressed", state.noerr);
    renderDuration();
    renderChannels();
    renderMirrors();
    const n = activeFilters().length;
    $("activeCount").textContent = n ? `(${n})` : "";
    $("activeCount2").textContent = n ? `(${n})` : "";
    $("resetBtn").disabled = n === 0;
    $("sortSel").value = state.sort;
    $("dirBtn").textContent = state.dir === "asc" ? "↑" : "↓";
    $("dirBtn").title = state.dir === "asc" ? t("asc") : t("desc");
    $("clearSearch").hidden = !state.q;
    renderActiveFilters();
  }

  function renderDuration() {
    $("durMin").value = state.dmin; $("durMax").value = state.dmax;
    $("durMinN").value = state.dmin; $("durMaxN").value = state.dmax;
    $("durFill").style.left = `${(state.dmin / DUR_MAX) * 100}%`;
    $("durFill").style.right = `${100 - (state.dmax / DUR_MAX) * 100}%`;
    $("durLabel").textContent = state.dmin === 0 && state.dmax === DUR_MAX
      ? t("durAny")
      : `${state.dmin}–${state.dmax === DUR_MAX ? "∞" : state.dmax} min`;
  }

  function renderChannels() {
    const q = normalize($("chanSearch").value);
    const sel = new Set(state.ch);
    let list = channels.filter((c) => !q || normalize(c.ch).includes(q));
    const selected = list.filter((c) => sel.has(c.ch));
    const rest = list.filter((c) => !sel.has(c.ch));
    list = selected.concat(q ? rest : rest.slice(0, 60));
    // also show selected channels that do not match the search text
    for (const ch of state.ch) if (!list.some((c) => c.ch === ch)) list.unshift({ ch, n: 0 });
    $("chanList").innerHTML = list.length
      ? list.map((c) => `<label><input type="checkbox" data-ch="${esc(c.ch)}" ${sel.has(c.ch) ? "checked" : ""}/> <span class="chan">${esc(c.ch)}</span><span class="count">${c.n ? fmtNum(c.n) : ""}</span></label>`).join("")
      : loaded ? `<div class="muted small" style="padding:6px">${t("noChannels")}</div>` : "";
    $("chanClear").hidden = !state.ch.length;
  }

  function renderMirrors() {
    const counts = mirrorCounts;
    $("mirrorList").innerHTML = mirrors.map((m, i) =>
      `<label><input type="checkbox" data-mirror="${esc(m.name)}" ${state.mx.includes(m.name) ? "" : "checked"}/> ${esc(m.name)}<span class="count">${fmtNum(counts[i])}</span></label>`).join("");
  }

  function activeFilters() {
    const out = [];
    if (state.from || state.to) {
      const p = PERIODS.find((x) => x.key !== "pAll" && periodActive(x));
      out.push({ label: p ? t(p.key) : t("dateRange", { a: state.from ? fmtDateShort(state.from) : "…", b: state.to ? fmtDateShort(state.to) : "…" }), clear: () => { state.from = ""; state.to = ""; } });
    }
    for (const k of state.qual) out.push({ label: t(`q_${k}`), clear: () => { state.qual = state.qual.filter((x) => x !== k); } });
    if (state.type) out.push({ label: t(`t_${state.type}`), clear: () => { state.type = ""; } });
    if (state.dmin > 0 || state.dmax < DUR_MAX) {
      out.push({ label: state.dmax < DUR_MAX ? t("durRange", { a: state.dmin, b: state.dmax }) : t("durFrom", { a: state.dmin }), clear: () => { state.dmin = 0; state.dmax = DUR_MAX; } });
    }
    for (const c of state.ch) out.push({ label: c.toUpperCase(), clear: () => { state.ch = state.ch.filter((x) => x !== c); } });
    if (state.cut) out.push({ label: t("withCutlist"), clear: () => { state.cut = false; } });
    if (state.noerr) out.push({ label: t("noErrors"), clear: () => { state.noerr = false; } });
    if (state.mx.length) out.push({ label: state.mx.length === 1 ? t("mirrorsHidden1") : t("mirrorsHidden", { n: state.mx.length }), clear: () => { state.mx = []; } });
    return out;
  }

  function renderActiveFilters() {
    const af = activeFilters();
    $("activeFilters").innerHTML = af.map((f, i) =>
      `<button class="af" type="button" data-af="${i}">${esc(f.label)} <b aria-hidden="true">×</b></button>`).join("");
  }

  function resetFilters() {
    const keep = { q: state.q, sort: state.sort, dir: state.dir };
    state = { ...blankState(), ...keep };
    $("chanSearch").value = "";
  }

  function renderStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
    $("langBtn").textContent = lang === "de" ? "EN" : "DE";
    const pill = $("dataPill");
    if (pill.dataset.n) pill.textContent = t("dataPill", { n: fmtNum(+pill.dataset.n), d: fmtDateShort(pill.dataset.d) });
    $("themeBtn").title = isDark() ? t("themeLight") : t("themeDark");
    renderAccent();
  }

  // ------------------------------------------------------------------
  // Update cycle
  // ------------------------------------------------------------------
  function update({ results = true } = {}) {
    syncHash();
    renderControls();
    if (!loaded) return;
    if (results) {
      runFilter();
      renderResults();
    }
  }

  // ------------------------------------------------------------------
  // Events
  // ------------------------------------------------------------------
  function bind() {
    const input = $("search");
    let debounce;
    input.addEventListener("input", () => {
      clearTimeout(debounce);
      $("clearSearch").hidden = !input.value;
      debounce = setTimeout(() => { state.q = input.value; update(); }, 180);
    });
    $("searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      clearTimeout(debounce);
      state.q = input.value;
      update();
      input.blur();
    });
    $("clearSearch").addEventListener("click", () => { input.value = ""; state.q = ""; update(); input.focus(); });
    $("homeLink").addEventListener("click", (e) => {
      e.preventDefault();
      state = blankState(); input.value = ""; $("chanSearch").value = "";
      update(); window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("quick").addEventListener("click", (e) => {
      const b = e.target.closest("[data-quick]");
      if (!b) return;
      QUICK[+b.dataset.quick].run();
      update();
    });

    $("filters").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.period !== undefined) togglePeriod(PERIODS[+b.dataset.period]);
      else if (b.dataset.qual) {
        const k = b.dataset.qual;
        state.qual = state.qual.includes(k) ? state.qual.filter((x) => x !== k) : state.qual.concat(k);
      } else if (b.dataset.type) toggleType(b.dataset.type);
      else if (b.dataset.dur) {
        const d = DUR_PRESETS.find((x) => x.key === b.dataset.dur);
        const on = state.dmin === d.min && state.dmax === d.max;
        state.dmin = on ? 0 : d.min; state.dmax = on ? DUR_MAX : d.max;
      } else if (b.id === "cutChip") state.cut = !state.cut;
      else if (b.id === "noErrChip") state.noerr = !state.noerr;
      else if (b.id === "chanClear") state.ch = [];
      else if (b.id === "resetBtn") resetFilters();
      else if (b.id === "drawerClose") { closeDrawer(); return; }
      else return;
      update();
    });

    $("fromDate").addEventListener("change", (e) => { state.from = e.target.value; update(); });
    $("toDate").addEventListener("change", (e) => { state.to = e.target.value; update(); });

    // duration slider + number inputs
    let durTimer;
    const setDur = (min, max, live) => {
      min = Math.max(0, Math.min(DUR_MAX, Math.round(+min || 0)));
      max = Math.max(0, Math.min(DUR_MAX, Math.round(+max || 0)));
      if (min > max) [min, max] = [max, min];
      state.dmin = min; state.dmax = max;
      renderDuration();
      clearTimeout(durTimer);
      durTimer = setTimeout(update, live ? 250 : 0);
    };
    $("durMin").addEventListener("input", (e) => setDur(Math.min(+e.target.value, state.dmax), state.dmax, true));
    $("durMax").addEventListener("input", (e) => setDur(state.dmin, Math.max(+e.target.value, state.dmin), true));
    $("durMinN").addEventListener("change", (e) => setDur(e.target.value, state.dmax));
    $("durMaxN").addEventListener("change", (e) => setDur(state.dmin, e.target.value));

    $("chanSearch").addEventListener("input", renderChannels);
    $("chanSearch").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const first = $("chanList").querySelector("input:not(:checked)");
        if (first) { first.click(); $("chanSearch").select(); }
      }
    });
    $("chanList").addEventListener("change", (e) => {
      const ch = e.target.dataset.ch;
      if (!ch) return;
      state.ch = e.target.checked ? state.ch.concat(ch) : state.ch.filter((x) => x !== ch);
      update();
    });
    $("mirrorList").addEventListener("change", (e) => {
      const m = e.target.dataset.mirror;
      if (!m) return;
      state.mx = e.target.checked ? state.mx.filter((x) => x !== m) : state.mx.concat(m);
      update();
    });

    $("activeFilters").addEventListener("click", (e) => {
      const b = e.target.closest("[data-af]");
      if (!b) return;
      activeFilters()[+b.dataset.af].clear();
      update();
    });

    $("sortSel").addEventListener("change", (e) => { state.sort = e.target.value; state.dir = DEFAULT_DIR[state.sort]; update(); });
    $("dirBtn").addEventListener("click", () => { state.dir = state.dir === "asc" ? "desc" : "asc"; update(); });

    $("results").addEventListener("click", (e) => {
      const copy = e.target.closest("[data-copy]");
      if (copy) {
        const txt = copy.dataset.copy;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
          .then(() => toast(t("copied")))
          .catch(() => { window.prompt("", txt); });
        return;
      }
      const act = e.target.closest("[data-act]");
      if (act) {
        if (act.dataset.act === "resetAll") { resetFilters(); update(); return; }
        const r = current[+act.closest(".card").dataset.idx];
        if (act.dataset.act === "airings") {
          state.q = r.title; input.value = r.title; state.sort = "date"; state.dir = "desc";
        } else if (act.dataset.act === "channel") {
          state.ch = [r.ch];
        }
        update();
        window.scrollTo({ top: $("results").offsetTop - 80, behavior: "smooth" });
        return;
      }
      const head = e.target.closest(".card-main");
      if (head) {
        const card = head.closest(".card");
        const det = card.querySelector(".details");
        const open = head.getAttribute("aria-expanded") !== "true";
        if (open && !det.innerHTML) det.innerHTML = detailsHTML(current[+card.dataset.idx]);
        head.setAttribute("aria-expanded", open);
        det.hidden = !open;
        card.classList.toggle("open", open);
      }
    });

    $("moreBtn").addEventListener("click", renderMore);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && loaded && shown < current.length && shown > 0) renderMore();
      }, { rootMargin: "600px" }).observe($("sentinel"));
    }

    // mobile drawer
    $("filterToggle").addEventListener("click", () => document.body.classList.add("drawer-open"));
    $("backdrop").addEventListener("click", closeDrawer);

    // keyboard
    document.addEventListener("keydown", (e) => {
      const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
      if (e.key === "/" && !typing) { e.preventDefault(); input.focus(); input.select(); }
      else if (e.key === "Escape") {
        if (document.body.classList.contains("drawer-open")) closeDrawer();
        else if (document.activeElement === input && input.value) { input.value = ""; state.q = ""; update(); }
      }
    });

    window.addEventListener("hashchange", () => {
      if (location.hash === lastHash) return;
      state = hashToState();
      lastHash = stateToHash();
      input.value = state.q;
      update();
    });

    window.addEventListener("scroll", () => { $("toTop").style.display = window.scrollY > 700 ? "block" : "none"; }, { passive: true });
    $("toTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    $("langBtn").addEventListener("click", () => {
      lang = lang === "de" ? "en" : "de";
      store.set("lang", lang);
      renderStatic();
      update();
    });
    $("themeBtn").addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      store.set("theme", next);
      renderStatic();
    });
  }

  // ------------------------------------------------------------------
  // Accent color (saved in localStorage, applied in <head> before paint)
  // ------------------------------------------------------------------
  const DEFAULT_ACCENT = "#2563eb";  // the colors in index.html's CSS
  const ACCENTS = [
    ["blue", "#2563eb"], ["sky", "#0284c7"], ["teal", "#0f766e"], ["green", "#15803d"], ["amber", "#b45309"],
    ["orange", "#ea580c"], ["red", "#dc2626"], ["pink", "#db2777"], ["violet", "#7c3aed"], ["slate", "#475569"],
  ];

  function hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return [h, s * 100, l * 100];
  }

  function hsl(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  function contrast(a, b) {
    const lum = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  }

  // Light and dark variants of one color; lightness is adjusted only as far as
  // needed to keep links and buttons readable (contrast >= 4.5).
  function accentCss(hex) {
    const [h, s0, l0] = hexToHsl(hex);
    const s = Math.min(s0, 75);  // softer saturation for the derived shades and dark mode
    let l = l0;
    while (l > 20 && contrast(hsl(h, s0, l), "#ffffff") < 4.5) l -= 1;
    const light = {
      brand: hsl(h, s0, l), hover: hsl(h, s0, Math.max(l - 8, 10)), ink: "#ffffff",
      soft: hsl(h, Math.min(s, 75), 94), softInk: hsl(h, s, Math.min(l, 32)),
    };
    let ld = Math.max(l0, 66);
    while (ld < 90 && contrast(hsl(h, s, ld), "#1a1d23") < 4.5) ld += 1;
    const dark = {
      brand: hsl(h, s, ld), hover: hsl(h, s, Math.min(ld + 8, 94)), ink: "#0f1115",
      soft: hsl(h, Math.min(s, 40), 18), softInk: hsl(h, s, 86),
    };
    const v = (o) => `--brand:${o.brand};--brand-hover:${o.hover};--brand-ink:${o.ink};--brand-soft:${o.soft};--brand-soft-ink:${o.softInk};`;
    return `:root{${v(light)}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${v(dark)}}}:root[data-theme="dark"]{${v(dark)}}`;
  }

  function setAccent(hex) {
    hex = (hex || DEFAULT_ACCENT).toLowerCase();
    let st = document.getElementById("accentStyle");
    if (hex === DEFAULT_ACCENT) {
      if (st) st.remove();
      store.del("accent");
      store.del("accentCss");
    } else {
      const css = accentCss(hex);
      if (!st) {
        st = document.createElement("style");
        st.id = "accentStyle";
        document.head.appendChild(st);
      }
      st.textContent = css;
      store.set("accent", hex);
      store.set("accentCss", css);
    }
    renderAccent();
  }

  function renderAccent() {
    const cur = (store.get("accent") || DEFAULT_ACCENT).toLowerCase();
    const preset = ACCENTS.some(([, c]) => c === cur);
    $("swatches").innerHTML = ACCENTS.map(([id, c]) =>
      `<button type="button" class="swatch" style="background:${c}" data-color="${c}" title="${t("c_" + id)}"
        aria-label="${t("c_" + id)}" aria-pressed="${c === cur}"></button>`).join("");
    $("accentCustom").value = cur;
    $("accentCustom").setAttribute("aria-pressed", String(!preset));
    $("accentBtn").title = t("accentTitle");
    $("accentBtn").setAttribute("aria-label", t("accentTitle"));
  }

  function toggleAccentPop(open) {
    const pop = $("accentPop");
    open = open ?? pop.hidden;
    pop.hidden = !open;
    $("accentBtn").setAttribute("aria-expanded", String(open));
    if (open) (pop.querySelector('[aria-pressed="true"]') || pop.querySelector(".swatch")).focus();
  }

  function bindAccent() {
    $("accentBtn").addEventListener("click", (e) => { e.stopPropagation(); toggleAccentPop(); });
    $("swatches").addEventListener("click", (e) => {
      const b = e.target.closest(".swatch");
      if (b) setAccent(b.dataset.color);
    });
    $("accentCustom").addEventListener("input", (e) => setAccent(e.target.value));
    $("accentReset").addEventListener("click", () => setAccent(DEFAULT_ACCENT));
    document.addEventListener("click", (e) => {
      if (!$("accentPop").hidden && !e.target.closest(".accent-wrap")) toggleAccentPop(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("accentPop").hidden) { toggleAccentPop(false); $("accentBtn").focus(); }
    });
  }

  function closeDrawer() { document.body.classList.remove("drawer-open"); }

  function isDark() {
    const th = document.documentElement.dataset.theme;
    if (th) return th === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  // ------------------------------------------------------------------
  // Start
  // ------------------------------------------------------------------
  async function start() {
    const th = store.get("theme");
    if (th === "light" || th === "dark") document.documentElement.dataset.theme = th;
    if (store.get("accent")) setAccent(store.get("accent"));  // regenerate the saved CSS with the current code
    state = hashToState();
    lastHash = stateToHash();
    $("search").value = state.q;
    renderStatic();
    bind();
    bindAccent();
    renderControls();
    if (!location.hash) $("search").focus();
    try {
      await loadData();
      renderStatic();
      update();
    } catch (err) {
      console.error(err);
      $("loading").hidden = true;
      $("results").innerHTML = `<li class="empty"><strong>${t("loadError")}</strong>${esc(err.message)}
        <div style="margin-top:12px"><button class="ghost" type="button" id="retryBtn">${t("retry")}</button></div></li>`;
      $("retryBtn").addEventListener("click", () => location.reload());
    }
  }

  start();
})();
