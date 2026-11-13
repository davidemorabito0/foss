// FOSS per Mac e Windows.
//
// Una finestra con due pagine affiancate, le stesse del sito: a sinistra FOSS
// (https://foss.team/) e a destra FOSS.chat (https://foss.team/chat.html).
// Nessun codice del sito e' copiato qui: l'app carica le pagine pubblicate, quindi
// ogni aggiornamento del sito arriva subito anche all'app.
//
// Quello che fa l'app in piu' del browser:
// - avvisi di sistema (chat e FOSS) anche a finestra chiusa, e il clic porta al punto giusto;
// - icona nella barra dei menu (Mac) o vicino all'orologio (Windows) col numero da leggere;
// - chiudendo la finestra l'app resta attiva; parte da sola all'accensione;
// - file trascinati dal computer, link foss:// (e foss.team aperti nell'app), scorciatoie;
// - aggiornamento: a ogni avvio controlla se c'e' una versione nuova (freccia gialla).
//
// Il «ponte» (ponte.js) e' lo script che l'app mette in cima alle due pagine: parla con
// questo file. Il sito parla col ponte solo attraverso window.fossDesktop (che nel browser
// non esiste) e l'app chiama il sito attraverso window.fossApp (index.html).

mod avvisi;
mod vassoio;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::PathBuf,
    sync::Mutex,
    time::Duration,
};
use tauri::{
    ipc::CapabilityBuilder,
    utils::config::BackgroundThrottlingPolicy,
    webview::{DownloadEvent, NewWindowResponse, PageLoadEvent},
    AppHandle, LogicalPosition, LogicalSize, Manager, Rect, RunEvent, Url, Webview, WebviewBuilder,
    WebviewUrl, WindowBuilder, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt as _;
use tauri_plugin_deep_link::DeepLinkExt as _;
use tauri_plugin_opener::OpenerExt as _;
use tauri_plugin_updater::UpdaterExt as _;

/// L'indirizzo del sito. Per le prove si puo' usare un server sul computer
/// (FOSS_SITO=http://localhost:8123/), mai un altro sito.
const SITO: &str = "https://foss.team/";
/// Le funzioni che le pagine possono chiamare (vedi build.rs: stesso elenco).
pub const COMANDI: &[&str] = &[
    "avviso", "conta", "apri", "apri_fuori", "chat_larghezza", "chat_mostra", "aggiorna",
    "cerca_aggiornamenti", "scorciatoia", "impostazioni", "imposta", "attenzione", "prova",
    "collega_browser", "prova_avviso",
];
const PONTE: &str = include_str!("ponte.js");
const MIN_FOSS: f64 = 420.0;
const MIN_CHAT: f64 = 300.0;

/// Le impostazioni dell'app su questo computer (file impostazioni.json).
#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct Cfg {
    /// la chat aperta accanto a FOSS
    pub chat_accanto: bool,
    /// larghezza della colonna della chat
    pub larghezza_chat: f64,
    /// avvisi di sistema
    pub notifiche: bool,
    /// da che parte sta la chat: "destra" o "sinistra"
    pub lato: String,
    /// "accanto" = FOSS e chat affiancate; "pieno" = una alla volta, a tutta finestra
    pub modo: String,
    /// con "pieno": quale si vede ("foss" o "chat")
    pub davanti: String,
    /// gia' fatto al primo avvio: avvio automatico acceso e browser collegato
    pub primo_avvio_fatto: bool,
    /// versione delle impostazioni: 2 = FOSS e chat separate di serie (dalla 1.0.3)
    pub schema: u32,
}
impl Default for Cfg {
    fn default() -> Self {
        Cfg {
            chat_accanto: true,
            larghezza_chat: 430.0,
            notifiche: true,
            lato: "destra".into(),
            modo: "pieno".into(),
            davanti: "foss".into(),
            primo_avvio_fatto: false,
            schema: 2,
        }
    }
}

pub struct Stato {
    pub sito: Url,
    /// la versione dell'app (da tauri.conf.json)
    pub versione: String,
    pub cfg: Mutex<Cfg>,
    file_cfg: PathBuf,
    pub non_lette: Mutex<i64>,
    pub update: Mutex<Option<tauri_plugin_updater::Update>>,
    pub nuova_versione: Mutex<Option<String>>,
    pub aggiornando: Mutex<bool>,
    pub uscita: Mutex<bool>,
    /// prove automatiche: file dove scrivo cosa succede (FOSS_PROVA)
    pub prova: Option<PathBuf>,
}

impl Stato {
    fn salva(&self) {
        if let Ok(c) = self.cfg.lock() {
            if let Some(d) = self.file_cfg.parent() {
                let _ = fs::create_dir_all(d);
            }
            let _ = fs::write(&self.file_cfg, serde_json::to_vec_pretty(&*c).unwrap_or_default());
        }
    }
}

/// Scrive una riga nel registro delle prove (solo con FOSS_PROVA).
pub fn registra(app: &AppHandle, cosa: &str, dati: Value) {
    let st = app.state::<Stato>();
    if let Some(f) = &st.prova {
        if let Ok(mut h) = fs::OpenOptions::new().create(true).append(true).open(f) {
            let _ = writeln!(h, "{}", json!({"cosa": cosa, "dati": dati}));
        }
    }
}

fn sito_di_prova() -> Option<Url> {
    let v = std::env::var("FOSS_SITO").ok()?;
    let u = Url::parse(&v).ok()?;
    let locale = matches!(u.host_str(), Some("localhost") | Some("127.0.0.1"));
    if u.scheme() == "http" && locale { Some(u) } else { None }
}

fn stesso_sito(st: &Stato, u: &Url) -> bool {
    u.scheme() == st.sito.scheme() && u.host_str() == st.sito.host_str() && u.port_or_known_default() == st.sito.port_or_known_default()
}
fn e_chat(u: &Url) -> bool {
    let p = u.path();
    p.ends_with("/chat.html") || p.ends_with("/chat")
}

// ---------------------------------------------------------------- finestra

fn finestra(app: &AppHandle) -> Option<tauri::Window> {
    app.get_window("main")
}
fn vista(app: &AppHandle, quale: &str) -> Option<Webview> {
    app.get_webview(quale)
}

/// Mette FOSS e la chat nella finestra: affiancate (chat a destra o a sinistra), solo FOSS,
/// oppure una alla volta a tutta finestra. Quella che non si vede resta viva fuori vista.
pub fn disponi(app: &AppHandle) {
    let Some(w) = finestra(app) else { return };
    let (Some(foss), Some(chat)) = (vista(app, "foss"), vista(app, "chat")) else { return };
    let scala = w.scale_factor().unwrap_or(1.0);
    let Ok(dim) = w.inner_size() else { return };
    let dim = dim.to_logical::<f64>(scala);
    let st = app.state::<Stato>();
    let c = st.cfg.lock().unwrap().clone();
    let largh = dim.width.max(1.0);
    let alto = dim.height.max(1.0);
    let metti = |v: &Webview, x: f64, l: f64| {
        let _ = v.set_bounds(Rect { position: LogicalPosition::new(x, 0.0).into(), size: LogicalSize::new(l, alto).into() });
        let _ = v.show();
    };
    // fuori dalla finestra e nascosta: resta viva (messaggi, avvisi, numero) ma non si vede
    let via = |v: &Webview| {
        let _ = v.hide();
        let _ = v.set_bounds(Rect { position: LogicalPosition::new(largh, 0.0).into(), size: LogicalSize::new(MIN_CHAT.max(largh / 2.0), alto).into() });
    };
    if c.modo == "pieno" {
        if c.davanti == "chat" {
            metti(&chat, 0.0, largh);
            via(&foss);
        } else {
            metti(&foss, 0.0, largh);
            via(&chat);
        }
    } else if c.chat_accanto {
        let max_chat = (largh - MIN_FOSS).max(MIN_CHAT);
        let lc = c.larghezza_chat.clamp(MIN_CHAT, max_chat).min(largh);
        let lf = (largh - lc).max(0.0);
        if c.lato == "sinistra" {
            metti(&chat, 0.0, lc);
            metti(&foss, lc, lf);
        } else {
            metti(&foss, 0.0, lf);
            metti(&chat, lf, lc);
        }
    } else {
        metti(&foss, 0.0, largh);
        via(&chat);
    }
    manda_disposizione(app, false);
}

/// La chat deve sapere dove sta (maniglia sul bordo giusto, o niente maniglia).
pub fn manda_disposizione(app: &AppHandle, sempre: bool) {
    static ULTIMA: Mutex<String> = Mutex::new(String::new());
    let c = app.state::<Stato>().cfg.lock().unwrap().clone();
    let d = json!({"tipo": "disposizione", "lato": c.lato, "modo": c.modo, "accanto": c.chat_accanto, "davanti": c.davanti});
    let chiave = d.to_string();
    {
        let mut u = ULTIMA.lock().unwrap();
        if !sempre && *u == chiave {
            return;
        }
        *u = chiave;
    }
    al_ponte(app, "chat", d);
}

/// Porta davanti FOSS o la chat. Affiancate: la chat si apre accanto. Una alla volta: cambia pagina.
pub fn porta_davanti(app: &AppHandle, quale: &str) {
    let st = app.state::<Stato>();
    {
        let mut c = st.cfg.lock().unwrap();
        if c.modo == "pieno" {
            c.davanti = if quale == "chat" { "chat".into() } else { "foss".into() };
        } else if quale == "chat" {
            c.chat_accanto = true;
        }
    }
    st.salva();
    disponi(app);
    vassoio::aggiorna_menu(app);
    if let Some(v) = vista(app, if quale == "chat" { "chat" } else { "foss" }) {
        let _ = v.set_focus();
    }
    registra(app, "davanti", json!(quale));
}

/// Affiancate <-> una alla volta (a tutta finestra).
pub fn cambia_modo(app: &AppHandle, modo: Option<&str>) {
    let st = app.state::<Stato>();
    let nuovo = {
        let mut c = st.cfg.lock().unwrap();
        let nuovo = match modo {
            Some("pieno") => "pieno",
            Some("accanto") => "accanto",
            _ => {
                if c.modo == "pieno" { "accanto" } else { "pieno" }
            }
        };
        if nuovo == "accanto" {
            c.chat_accanto = true;
        }
        c.modo = nuovo.to_string();
        nuovo
    };
    st.salva();
    disponi(app);
    vassoio::aggiorna_menu(app);
    registra(app, "modo", json!(nuovo));
}

/// La chat a destra o a sinistra di FOSS.
pub fn cambia_lato(app: &AppHandle, lato: &str) {
    let st = app.state::<Stato>();
    st.cfg.lock().unwrap().lato = if lato == "sinistra" { "sinistra".to_string() } else { "destra".to_string() };
    st.salva();
    disponi(app);
    vassoio::aggiorna_menu(app);
    registra(app, "lato", json!(lato));
}

pub fn mostra_finestra(app: &AppHandle) {
    if let Some(w) = finestra(app) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

pub fn chat_mostra_pubblica(app: &AppHandle, mostra: Option<bool>) {
    chat_mostra_interna(app, mostra, true);
}

fn chat_mostra_interna(app: &AppHandle, mostra: Option<bool>, fuoco: bool) {
    let st = app.state::<Stato>();
    // una alla volta: ⌘J (e simili) scambia FOSS e chat
    let pieno = st.cfg.lock().unwrap().modo == "pieno";
    if pieno {
        let chat = {
            let c = st.cfg.lock().unwrap();
            mostra.unwrap_or(c.davanti != "chat")
        };
        porta_davanti(app, if chat { "chat" } else { "foss" });
        return;
    }
    let ora = {
        let mut c = st.cfg.lock().unwrap();
        c.chat_accanto = mostra.unwrap_or(!c.chat_accanto);
        c.chat_accanto
    };
    st.salva();
    disponi(app);
    vassoio::aggiorna_menu(app);
    if let (true, true, Some(chat)) = (ora, fuoco, vista(app, "chat")) {
        let _ = chat.set_focus();
    }
    if !ora {
        if let Some(f) = vista(app, "foss") {
            let _ = f.set_focus();
        }
    }
    registra(app, "chat_accanto", json!(ora));
}

/// Manda un messaggio al ponte di una pagina.
pub fn al_ponte(app: &AppHandle, quale: &str, dati: Value) {
    if let Some(v) = vista(app, quale) {
        let _ = v.eval(format!("window.__fossDesktopRicevi && window.__fossDesktopRicevi({})", dati));
    }
}

/// Porta al punto giusto: un indirizzo del sito (FOSS o chat) aperto nella pagina giusta.
pub fn apri_indirizzo(app: &AppHandle, u: &Url) {
    let st = app.state::<Stato>();
    if !stesso_sito(&st, u) {
        return;
    }
    mostra_finestra(app);
    if e_chat(u) {
        porta_davanti(app, "chat");
        if let Some(chat) = vista(app, "chat") {
            let h = u.fragment().map(|f| format!("#{f}")).unwrap_or_default();
            let gia = chat.url().map(|x| e_chat(&x) && stesso_sito(&st, &x)).unwrap_or(false);
            if gia {
                al_ponte(app, "chat", json!({"tipo": "hash", "hash": h}));
            } else {
                let _ = chat.navigate(u.clone());
            }
        }
    } else if let Some(foss) = vista(app, "foss") {
        porta_davanti(app, "foss");
        let gia = foss.url().map(|x| !e_chat(&x) && stesso_sito(&st, &x)).unwrap_or(false);
        let h = u.fragment().map(|f| format!("#{f}")).unwrap_or_default();
        if gia && !h.is_empty() && u.query().is_none() {
            al_ponte(app, "foss", json!({"tipo": "hash", "hash": h}));
        } else {
            let _ = foss.navigate(u.clone());
        }
    }
    registra(app, "apri", json!(u.as_str()));
}

/// Dove porta il clic su un avviso.
#[derive(Deserialize, Serialize, Clone, Debug, Default)]
#[serde(default)]
pub struct Dove {
    /// "chat" o "foss"
    pub vista: String,
    /// per la chat: #c=<chat>&m=<messaggio>
    pub hash: String,
    /// per FOSS: l'id della notifica (la apre come la campanella)
    pub notifica: String,
    /// per FOSS: "mie" = le mie task (scadenze)
    pub azione: String,
    /// un file scaricato da mostrare nella cartella
    pub file: String,
}

pub fn vai_a(app: &AppHandle, d: &Dove) {
    registra(app, "clic_avviso", json!(d));
    if !d.file.is_empty() {
        let _ = app.opener().reveal_item_in_dir(&d.file);
        return;
    }
    mostra_finestra(app);
    if d.vista == "chat" {
        porta_davanti(app, "chat");
        al_ponte(app, "chat", json!({"tipo": "hash", "hash": d.hash}));
    } else {
        porta_davanti(app, "foss");
        al_ponte(app, "foss", json!({"tipo": "apri", "notifica": d.notifica, "azione": d.azione}));
    }
}

// ---------------------------------------------------------------- le due pagine

fn ponte_per(st: &Stato, quale: &str) -> String {
    let os = if cfg!(target_os = "macos") { "mac" } else if cfg!(windows) { "windows" } else { "linux" };
    let prova = std::env::var("FOSS_PROVA_JS").ok().filter(|_| st.prova.is_some())
        .and_then(|p| fs::read_to_string(p).ok()).unwrap_or_default();
    PONTE
        .replace("__VISTA__", quale)
        .replace("__SITO__", st.sito.as_str())
        .replace("__VERSIONE__", &st.versione)
        .replace("__OS__", os)
        .replace("/*__PROVA__*/", &prova)
}

fn costruisci_vista(app: &AppHandle, quale: &'static str) -> WebviewBuilder<tauri::Wry> {
    let st = app.state::<Stato>();
    // si parte da una paginetta locale che aspetta la rete e poi apre il sito
    let mut b = WebviewBuilder::new(quale, WebviewUrl::App(PathBuf::from("avvio.html")))
        .initialization_script(ponte_per(&st, quale))
        // i file trascinati arrivano alla pagina (come nel browser)
        .disable_drag_drop_handler()
        // a finestra nascosta la pagina resta sveglia: messaggi e avvisi arrivano lo stesso
        .background_throttling(BackgroundThrottlingPolicy::Disabled)
        .zoom_hotkeys_enabled(false);

    #[cfg(windows)]
    {
        // come quelli di serie, piu': suoni senza tocco, pagina sveglia anche nascosta
        b = b.additional_browser_args(
            "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,CalculateNativeWinOcclusion \
             --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling \
             --disable-renderer-backgrounding --disable-backgrounding-occluded-windows",
        );
    }

    let a = app.clone();
    b = b.on_navigation(move |u: &Url| naviga(&a, quale, u));

    let a = app.clone();
    b = b.on_new_window(move |u, _| {
        let a2 = a.clone();
        let u2 = u.clone();
        tauri::async_runtime::spawn(async move { apri_qualcosa(&a2, &u2) });
        NewWindowResponse::Deny
    });

    let a = app.clone();
    b = b.on_download(move |_wv, ev| scaricamento(&a, ev));

    let a = app.clone();
    b = b.on_permission_request(move |wv, _tipo| {
        // microfono (vocali) e fotocamera: solo per le pagine di FOSS
        let st = a.state::<Stato>();
        let ok = wv.url().map(|u| stesso_sito(&st, &u)).unwrap_or(false);
        if ok { tauri::webview::PermissionResponse::Allow } else { tauri::webview::PermissionResponse::Default }
    });

    let a = app.clone();
    b = b.on_page_load(move |wv, p| {
        if let PageLoadEvent::Finished = p.event() {
            registra(&a, "caricata", json!({"vista": wv.label(), "url": p.url().as_str()}));
            // la pagina appena caricata deve sapere se c'e' una versione nuova
            let v = a.state::<Stato>().nuova_versione.lock().unwrap().clone();
            if let Some(v) = v {
                al_ponte(&a, wv.label(), json!({"tipo": "aggiornamento", "versione": v}));
            }
            if wv.label() == "chat" {
                manda_disposizione(&a, true);
            }
        }
    });
    b
}

/// Decide se una pagina puo' andare a un indirizzo. Quello che non e' FOSS va nel browser.
fn naviga(app: &AppHandle, quale: &str, u: &Url) -> bool {
    match u.scheme() {
        "about" | "data" | "blob" | "tauri" | "asset" | "ipc" => return true,
        "http" | "https" => {}
        "mailto" | "tel" => {
            let _ = app.opener().open_url(u.as_str(), None::<&str>);
            return false;
        }
        "foss" => {
            let a = app.clone();
            let u2 = u.clone();
            tauri::async_runtime::spawn(async move { apri_link_foss(&a, &u2) });
            return false;
        }
        _ => return false,
    }
    // le pagine locali dell'app (su Windows hanno questo indirizzo)
    if u.host_str() == Some("tauri.localhost") {
        return true;
    }
    let st = app.state::<Stato>();
    if stesso_sito(&st, u) {
        let chat = e_chat(u);
        if (quale == "foss" && chat) || (quale == "chat" && !chat) {
            // FOSS che apre la chat (o la chat che apre FOSS): va nell'altra colonna
            let a = app.clone();
            let u2 = u.clone();
            tauri::async_runtime::spawn(async move { apri_indirizzo(&a, &u2) });
            return false;
        }
        return true;
    }
    // il database e il server dei file di FOSS (non dovrebbero mai essere pagine, ma non li blocco)
    let h = u.host_str().unwrap_or("");
    if h.ends_with(".supabase.co") || h == "media.foss.team" {
        return true;
    }
    let a = app.clone();
    let u2 = u.clone();
    tauri::async_runtime::spawn(async move { apri_qualcosa(&a, &u2) });
    false
}

/// Un indirizzo qualsiasi: FOSS nell'app, il resto nel browser.
fn apri_qualcosa(app: &AppHandle, u: &Url) {
    let st = app.state::<Stato>();
    if stesso_sito(&st, u) {
        apri_indirizzo(app, u);
    } else if matches!(u.scheme(), "http" | "https" | "mailto" | "tel") {
        registra(app, "apri_fuori", json!(u.as_str()));
        if st.prova.is_none() {
            let _ = app.opener().open_url(u.as_str(), None::<&str>);
        }
    }
}

/// foss://apri?u=https://foss.team/... (dal browser o da un altro programma)
pub fn apri_link_foss(app: &AppHandle, u: &Url) {
    registra(app, "link", json!(u.as_str()));
    let st = app.state::<Stato>();
    let dentro = u.query_pairs().find(|(k, _)| k == "u").map(|(_, v)| v.to_string());
    let meta = match dentro.and_then(|d| Url::parse(&d).ok()) {
        Some(d) if stesso_sito(&st, &d) => d,
        // foss://chat.html#c=...  oppure  foss:///#/p/...
        _ => {
            let resto = u.as_str().trim_start_matches("foss:").trim_start_matches('/');
            let resto = resto.strip_prefix("apri").unwrap_or(resto).trim_start_matches('/');
            st.sito.join(resto).unwrap_or_else(|_| st.sito.clone())
        }
    };
    apri_indirizzo(app, &meta);
}

fn scaricamento(app: &AppHandle, ev: DownloadEvent<'_>) -> bool {
    match ev {
        DownloadEvent::Requested { url, destination } => {
            let nome = destination
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .filter(|n| !n.is_empty())
                .or_else(|| url.path_segments().and_then(|mut s| s.next_back()).map(|s| s.to_string()))
                .filter(|n| !n.is_empty())
                .unwrap_or_else(|| "file".into());
            let cartella = app.path().download_dir().unwrap_or_else(|_| std::env::temp_dir());
            *destination = libero(&cartella, &nome);
            registra(app, "scarico", json!(destination.to_string_lossy()));
            true
        }
        DownloadEvent::Finished { path, success, .. } => {
            if success {
                if let Some(p) = path {
                    let nome = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
                    avvisi::mostra(app, avvisi::Avviso {
                        titolo: "Scaricato".into(),
                        testo: format!("«{nome}» è nella cartella Download. Clicca per vederlo."),
                        dove: Dove { file: p.to_string_lossy().to_string(), ..Default::default() },
                        ..Default::default()
                    });
                }
            }
            true
        }
        _ => true,
    }
}

/// Un nome di file che non sovrascrive niente: «foto.jpg», «foto (2).jpg», ...
fn libero(cartella: &std::path::Path, nome: &str) -> PathBuf {
    let pulito: String = nome.chars().map(|c| if "/\\:*?\"<>|".contains(c) { '_' } else { c }).collect();
    let p = cartella.join(&pulito);
    if !p.exists() {
        return p;
    }
    let (base, est) = match pulito.rfind('.') {
        Some(i) if i > 0 => (pulito[..i].to_string(), pulito[i..].to_string()),
        _ => (pulito.clone(), String::new()),
    };
    for n in 2..1000 {
        let q = cartella.join(format!("{base} ({n}){est}"));
        if !q.exists() {
            return q;
        }
    }
    p
}

// ---------------------------------------------------------------- aggiornamenti

pub fn cerca_aggiornamento(app: &AppHandle, a_mano: bool) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let esito = match app.updater() {
            Ok(u) => u.check().await.map_err(|e| e.to_string()),
            Err(e) => Err(e.to_string()),
        };
        match esito {
            Ok(Some(up)) => {
                let v = up.version.clone();
                registra(&app, "aggiornamento", json!(v));
                *app.state::<Stato>().update.lock().unwrap() = Some(up);
                *app.state::<Stato>().nuova_versione.lock().unwrap() = Some(v.clone());
                for q in ["foss", "chat"] {
                    al_ponte(&app, q, json!({"tipo": "aggiornamento", "versione": v}));
                }
                vassoio::aggiorna_menu(&app);
            }
            Ok(None) => {
                registra(&app, "aggiornamento", Value::Null);
                if a_mano {
                    al_ponte(&app, "foss", json!({"tipo": "aggiornato", "versione": app.package_info().version.to_string()}));
                }
            }
            Err(e) => {
                registra(&app, "aggiornamento_errore", json!(e));
                if a_mano {
                    al_ponte(&app, "foss", json!({"tipo": "aggiornamento-errore", "testo": "Non riesco a controllare adesso: riprova più tardi."}));
                }
            }
        }
    });
}

pub async fn installa_aggiornamento(app: AppHandle) -> Result<(), String> {
    let st = app.state::<Stato>();
    {
        let mut g = st.aggiornando.lock().unwrap();
        if *g {
            return Ok(());
        }
        *g = true;
    }
    let up = st.update.lock().unwrap().take();
    let Some(up) = up else {
        *st.aggiornando.lock().unwrap() = false;
        return Err("nessun aggiornamento".into());
    };
    let mut fatti: u64 = 0;
    let mut ultimo: i64 = -1;
    let a = app.clone();
    let esito = up
        .download_and_install(
            move |pezzo, totale| {
                fatti += pezzo as u64;
                let pct = totale.filter(|t| *t > 0).map(|t| (fatti * 100 / t) as i64).unwrap_or(-1);
                if pct != ultimo {
                    ultimo = pct;
                    for q in ["foss", "chat"] {
                        al_ponte(&a, q, json!({"tipo": "aggiornamento-progresso", "pct": pct}));
                    }
                }
            },
            || {},
        )
        .await;
    match esito {
        Ok(()) => {
            *st.uscita.lock().unwrap() = true;
            app.restart();
        }
        Err(e) => {
            *st.aggiornando.lock().unwrap() = false;
            for q in ["foss", "chat"] {
                al_ponte(&app, q, json!({"tipo": "aggiornamento-errore", "testo": "L’aggiornamento non è riuscito: riprova tra poco."}));
            }
            // si riprova al prossimo controllo
            cerca_aggiornamento(&app, false);
            Err(e.to_string())
        }
    }
}

// ---------------------------------------------------------------- comandi dalle pagine

#[tauri::command]
fn avviso(app: AppHandle, a: avvisi::Avviso) {
    avvisi::mostra(&app, a);
}

#[tauri::command]
fn conta(app: AppHandle, n: i64) {
    let n = n.clamp(0, 9999);
    *app.state::<Stato>().non_lette.lock().unwrap() = n;
    vassoio::aggiorna_numero(&app, n);
    registra(&app, "conta", json!(n));
}

#[tauri::command]
fn apri(app: AppHandle, url: String) {
    if let Ok(u) = Url::parse(&url) {
        apri_qualcosa(&app, &u);
    }
}

#[tauri::command]
fn apri_fuori(app: AppHandle, url: String) {
    if let Ok(u) = Url::parse(&url) {
        apri_qualcosa(&app, &u);
    }
}

#[tauri::command]
fn chat_larghezza(app: AppHandle, w: f64, fine: bool) {
    let st = app.state::<Stato>();
    {
        let mut c = st.cfg.lock().unwrap();
        c.larghezza_chat = w.clamp(MIN_CHAT, 2000.0);
    }
    disponi(&app);
    if fine {
        st.salva();
    }
}

#[tauri::command]
fn chat_mostra(app: AppHandle, mostra: Option<bool>) {
    chat_mostra_interna(&app, mostra, true);
}

#[tauri::command]
async fn aggiorna(app: AppHandle) -> Result<(), String> {
    installa_aggiornamento(app).await
}

#[tauri::command]
fn cerca_aggiornamenti(app: AppHandle) {
    cerca_aggiornamento(&app, true);
}

#[tauri::command]
fn scorciatoia(app: AppHandle, k: String) {
    esegui_scorciatoia(&app, &k);
}

pub fn esegui_scorciatoia(app: &AppHandle, k: &str) {
    registra(app, "scorciatoia", json!(k));
    match k {
        "cerca" | "nuova-task" => {
            mostra_finestra(app);
            if let Some(f) = vista(app, "foss") {
                let _ = f.set_focus();
            }
            al_ponte(app, "foss", json!({"tipo": "scorciatoia", "k": k}));
        }
        "chat" => {
            mostra_finestra(app);
            chat_mostra_interna(app, None, true);
        }
        // ⌘1 FOSS, ⌘2 chat, ⌘\ affiancate / una alla volta
        "foss-davanti" => {
            mostra_finestra(app);
            porta_davanti(app, "foss");
        }
        "chat-davanti" => {
            mostra_finestra(app);
            porta_davanti(app, "chat");
        }
        "modo" => {
            mostra_finestra(app);
            cambia_modo(app, None);
        }
        "lato-destra" => cambia_lato(app, "destra"),
        "lato-sinistra" => cambia_lato(app, "sinistra"),
        "impostazioni" => apri_impostazioni(app),
        "ricarica" => {
            for q in ["foss", "chat"] {
                if let Some(v) = vista(app, q) {
                    let _ = v.eval("location.reload()");
                }
            }
        }
        _ => {}
    }
}

#[tauri::command]
fn impostazioni(app: AppHandle) -> Value {
    let st = app.state::<Stato>();
    let c = st.cfg.lock().unwrap().clone();
    json!({
        "versione": app.package_info().version.to_string(),
        "nuova": st.nuova_versione.lock().unwrap().clone(),
        "avvio": app.autolaunch().is_enabled().unwrap_or(false),
        "notifiche": c.notifiche,
        "chat_accanto": c.chat_accanto,
        "lato": c.lato,
        "modo": c.modo,
        "os": if cfg!(target_os = "macos") { "mac" } else { "windows" },
    })
}

#[tauri::command]
fn imposta(app: AppHandle, chiave: String, valore: Value) -> Value {
    let st = app.state::<Stato>();
    let si = valore.as_bool().unwrap_or(false);
    match chiave.as_str() {
        "avvio" => {
            let _ = if si { app.autolaunch().enable() } else { app.autolaunch().disable() };
            vassoio::aggiorna_menu(&app);
        }
        "notifiche" => {
            st.cfg.lock().unwrap().notifiche = si;
            st.salva();
        }
        "chat_accanto" => chat_mostra_interna(&app, Some(si), false),
        "lato" => cambia_lato(&app, valore.as_str().unwrap_or("destra")),
        "modo" => cambia_modo(&app, valore.as_str()),
        _ => {}
    }
    registra(&app, "imposta", json!({"chiave": chiave, "valore": valore}));
    impostazioni(app.clone())
}

#[tauri::command]
fn attenzione(app: AppHandle) {
    // il trillo: l'icona salta nel Dock (Mac) o lampeggia nella barra (Windows)
    if let Some(w) = finestra(&app) {
        let davanti = w.is_focused().unwrap_or(false) && w.is_visible().unwrap_or(false);
        if !davanti {
            let _ = w.request_user_attention(Some(tauri::UserAttentionType::Critical));
        }
    }
    registra(&app, "attenzione", Value::Null);
}

#[tauri::command]
fn collega_browser(app: AppHandle, collega: bool) {
    collega_il_browser(&app, collega);
}

/// Apre il sito nel browser predefinito con #app-collega: da li' i link di FOSS si aprono qui.
fn collega_il_browser(app: &AppHandle, collega: bool) {
    let st = app.state::<Stato>();
    let mut u = st.sito.clone();
    u.set_fragment(Some(if collega { "app-collega" } else { "app-scollega" }));
    registra(app, "collega_browser", json!(u.as_str()));
    if st.prova.is_none() {
        let _ = app.opener().open_url(u.as_str(), None::<&str>);
    }
}

#[tauri::command]
fn prova_avviso(app: AppHandle) {
    avvisi::mostra(&app, avvisi::Avviso {
        titolo: "FOSS".into(),
        testo: "Gli avvisi arrivano su questo computer.".into(),
        dove: Dove { vista: "foss".into(), ..Default::default() },
        sempre: true,
        ..Default::default()
    });
}

/// Solo per le prove automatiche (FOSS_PROVA): la pagina scrive nel registro o simula un clic.
#[tauri::command]
fn prova(app: AppHandle, dati: Value) {
    if app.state::<Stato>().prova.is_none() {
        return;
    }
    match dati.get("azione").and_then(|v| v.as_str()) {
        Some("clic_avviso") => {
            if let Ok(d) = serde_json::from_value::<Dove>(dati.get("dove").cloned().unwrap_or_default()) {
                vai_a(&app, &d);
            }
        }
        Some("scorciatoia") => esegui_scorciatoia(&app, dati.get("k").and_then(|v| v.as_str()).unwrap_or("")),
        Some("link") => {
            if let Some(u) = dati.get("url").and_then(|v| v.as_str()).and_then(|s| Url::parse(s).ok()) {
                apri_link_foss(&app, &u);
            }
        }
        Some("nascondi") => {
            if let Some(w) = finestra(&app) {
                let _ = w.hide();
            }
        }
        Some("mostra") => mostra_finestra(&app),
        Some("aggiornamento") => {
            let v = dati.get("versione").and_then(|v| v.as_str()).unwrap_or("9.9.9").to_string();
            *app.state::<Stato>().nuova_versione.lock().unwrap() = Some(v.clone());
            for q in ["foss", "chat"] {
                al_ponte(&app, q, json!({"tipo": "aggiornamento", "versione": v}));
            }
            vassoio::aggiorna_menu(&app);
        }
        Some("stato") => {
            let st = app.state::<Stato>();
            let c = st.cfg.lock().unwrap().clone();
            let vis = finestra(&app).and_then(|w| w.is_visible().ok()).unwrap_or(false);
            let b = |q: &str| vista(&app, q).and_then(|v| v.bounds().ok()).map(|r| {
                let s = r.size.to_logical::<f64>(1.0);
                let p = r.position.to_logical::<f64>(1.0);
                json!([p.x, p.y, s.width, s.height])
            });
            registra(&app, "stato", json!({"chat_accanto": c.chat_accanto, "larghezza_chat": c.larghezza_chat,
                "lato": c.lato, "modo": c.modo, "davanti": c.davanti,
                "visibile": vis, "foss": b("foss"), "chat": b("chat"),
                "non_lette": *st.non_lette.lock().unwrap()}));
        }
        Some("esci") => {
            *app.state::<Stato>().uscita.lock().unwrap() = true;
            app.exit(0);
        }
        _ => registra(&app, "pagina", dati),
    }
}

// ---------------------------------------------------------------- impostazioni

/// Le impostazioni dell'app stanno in un pannellino dentro FOSS, sotto il tasto accanto alla
/// foto del profilo (lo disegna il ponte): niente finestre in mezzo allo schermo.
pub fn apri_impostazioni(app: &AppHandle) {
    mostra_finestra(app);
    porta_davanti(app, "foss");
    al_ponte(app, "foss", json!({"tipo": "impostazioni"}));
}

// ---------------------------------------------------------------- avvio

pub fn run() {
    let autostart = tauri_plugin_autostart::Builder::new().args(["--nascosta"]);
    #[cfg(target_os = "macos")]
    let autostart = autostart.macos_launcher(tauri_plugin_autostart::MacosLauncher::LaunchAgent);
    #[allow(unused_mut)]
    let mut b = tauri::Builder::default()
        // una sola FOSS aperta: il secondo avvio (o un link foss://) porta avanti quella che c'e'
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            registra(app, "secondo_avvio", json!(argv));
            if !argv.iter().any(|a| a.starts_with("foss:")) {
                mostra_finestra(app);
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(autostart.build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::new()
            .with_state_flags(
                tauri_plugin_window_state::StateFlags::SIZE
                    | tauri_plugin_window_state::StateFlags::POSITION
                    | tauri_plugin_window_state::StateFlags::MAXIMIZED,
            )
            .build());

    #[cfg(target_os = "macos")]
    {
        // i clic sul menu li riceve gia' il gestore dell'icona (vale per tutti i menu):
        // un secondo gestore li farebbe due volte (⌘J aprirebbe e richiuderebbe la chat)
        b = b.menu(vassoio::menu_mac);
    }

    b.invoke_handler(tauri::generate_handler![
            avviso, conta, apri, apri_fuori, chat_larghezza, chat_mostra, aggiorna,
            cerca_aggiornamenti, scorciatoia, impostazioni, imposta, attenzione, prova,
            collega_browser, prova_avviso
        ])
        .setup(|app| {
            let h = app.handle().clone();
            let file_cfg = h.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir()).join("impostazioni.json");
            let mut cfg: Cfg = fs::read(&file_cfg).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
            // dalla 1.0.3 FOSS e la chat partono separate (una alla volta): vale anche per chi aveva gia' l'app
            if cfg.schema < 2 {
                cfg.modo = "pieno".into();
                cfg.davanti = "foss".into();
                cfg.schema = 2;
                if let Some(d) = file_cfg.parent() {
                    let _ = fs::create_dir_all(d);
                }
                let _ = fs::write(&file_cfg, serde_json::to_vec_pretty(&cfg).unwrap_or_default());
            }
            let prova = std::env::var("FOSS_PROVA").ok().map(PathBuf::from);
            let sito = sito_di_prova().unwrap_or_else(|| Url::parse(SITO).unwrap());
            app.manage(Stato {
                sito: sito.clone(),
                versione: h.package_info().version.to_string(),
                cfg: Mutex::new(cfg),
                file_cfg,
                non_lette: Mutex::new(0),
                update: Mutex::new(None),
                nuova_versione: Mutex::new(None),
                aggiornando: Mutex::new(false),
                uscita: Mutex::new(false),
                prova,
            });

            // le pagine di FOSS (e solo loro) possono chiamare l'app
            let origine = format!("{}://{}", sito.scheme(), sito.host_str().unwrap_or(""))
                + &sito.port().map(|p| format!(":{p}")).unwrap_or_default();
            let mut cap = CapabilityBuilder::new("sito").remote(format!("{origine}/*")).webviews(["foss", "chat"]);
            let mut loc = CapabilityBuilder::new("locale").local(true).webviews(["foss", "chat"]);
            for c in COMANDI {
                cap = cap.permission(format!("allow-{}", c.replace('_', "-")));
                loc = loc.permission(format!("allow-{}", c.replace('_', "-")));
            }
            loc = loc.windows(["main"]);
            cap = cap.windows(["main"]);
            app.add_capability(cap)?;
            app.add_capability(loc)?;

            let nascosta = std::env::args().any(|a| a == "--nascosta");
            let w = WindowBuilder::new(app, "main")
                .title("FOSS")
                .inner_size(1440.0, 900.0)
                .min_inner_size(760.0, 520.0)
                .center()
                .visible(false)
                .build()?;
            let dim = w.inner_size()?.to_logical::<f64>(w.scale_factor()?);
            w.add_child(costruisci_vista(&h, "foss"), LogicalPosition::new(0.0, 0.0), LogicalSize::new(dim.width, dim.height))?;
            w.add_child(costruisci_vista(&h, "chat"), LogicalPosition::new(dim.width, 0.0), LogicalSize::new(MIN_CHAT, dim.height))?;
            disponi(&h);
            if !nascosta {
                let _ = w.show();
                let _ = w.set_focus();
            }

            let h2 = h.clone();
            w.on_window_event(move |ev| match ev {
                WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. } => disponi(&h2),
                WindowEvent::CloseRequested { api, .. } => {
                    // chiudere la finestra non chiude FOSS: resta nella barra in alto / vicino all'orologio
                    if !*h2.state::<Stato>().uscita.lock().unwrap() {
                        api.prevent_close();
                        if let Some(w) = finestra(&h2) {
                            #[cfg(target_os = "macos")]
                            {
                                // a tutto schermo prima esco, sennò resta uno spazio nero
                                if w.is_fullscreen().unwrap_or(false) {
                                    let _ = w.set_fullscreen(false);
                                }
                            }
                            let _ = w.hide();
                        }
                        registra(&h2, "nascosta", Value::Null);
                    }
                }
                _ => {}
            });

            vassoio::crea(&h)?;
            avvisi::prepara(&h);

            // link foss:// (anche quello che ha fatto partire l'app)
            #[cfg(any(windows, target_os = "linux"))]
            {
                let _ = h.deep_link().register_all();
            }
            let h3 = h.clone();
            h.deep_link().on_open_url(move |e| {
                for u in e.urls() {
                    apri_link_foss(&h3, &u);
                }
            });
            if let Ok(Some(lista)) = h.deep_link().get_current() {
                let h4 = h.clone();
                tauri::async_runtime::spawn(async move {
                    tokio_sleep(Duration::from_secs(3)).await;
                    for u in lista {
                        apri_link_foss(&h4, &u);
                    }
                });
            }

            // primo avvio: parte con il computer e i link di foss.team aprono l'app
            let primo = !h.state::<Stato>().cfg.lock().unwrap().primo_avvio_fatto;
            if primo && h.state::<Stato>().prova.is_none() {
                let _ = h.autolaunch().enable();
                h.state::<Stato>().cfg.lock().unwrap().primo_avvio_fatto = true;
                h.state::<Stato>().salva();
                let h5 = h.clone();
                tauri::async_runtime::spawn(async move {
                    tokio_sleep(Duration::from_secs(6)).await;
                    collega_il_browser(&h5, true);
                });
            }
            vassoio::aggiorna_menu(&h);

            // a ogni avvio (e poi ogni 6 ore, per chi la tiene sempre accesa) controllo gli aggiornamenti
            if h.state::<Stato>().prova.is_none() || std::env::var("FOSS_PROVA_AGGIORNAMENTI").is_ok() {
                let h6 = h.clone();
                tauri::async_runtime::spawn(async move {
                    tokio_sleep(Duration::from_secs(4)).await;
                    loop {
                        cerca_aggiornamento(&h6, false);
                        tokio_sleep(Duration::from_secs(6 * 3600)).await;
                    }
                });
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("FOSS non riesce a partire")
        .run(|app, ev| match ev {
            // Mac: clic sull'icona nel Dock con la finestra chiusa
            #[cfg(target_os = "macos")]
            RunEvent::Reopen { .. } => mostra_finestra(app),
            RunEvent::ExitRequested { api, code, .. } => {
                // senza finestre l'app resta viva; si esce solo da «Esci» (o da un aggiornamento)
                if code.is_none() && !*app.state::<Stato>().uscita.lock().unwrap() {
                    api.prevent_exit();
                }
            }
            _ => {}
        });
}

async fn tokio_sleep(d: Duration) {
    tokio::time::sleep(d).await;
}
