// Gli avvisi di sistema (in alto a destra sul Mac, in basso a destra su Windows).
// Il clic sull'avviso porta al punto giusto: la chat e il messaggio, oppure la
// notifica di FOSS (task assegnata, menzione...), oppure il file scaricato.

use crate::{registra, Dove, Stato};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Deserialize, Serialize, Default, Clone, Debug)]
#[serde(default)]
pub struct Avviso {
    pub titolo: String,
    pub testo: String,
    pub dove: Dove,
    /// la foto di chi scrive: PNG in base64, gia' ritagliata tonda dal ponte
    pub icona: String,
    /// suono di sistema (la chat suona gia' da se', FOSS no)
    pub suono: bool,
    /// parte anche se stai guardando la pagina (l'avviso di prova)
    pub sempre: bool,
    /// si puo' rispondere scrivendo dentro l'avviso (messaggi della chat)
    pub risposta: bool,
}

fn taglia(s: &str, n: usize) -> String {
    let t: String = s.chars().filter(|c| !c.is_control() || *c == '\n').collect();
    if t.chars().count() <= n {
        t
    } else {
        t.chars().take(n - 1).collect::<String>() + "…"
    }
}

/// La foto di chi scrive in un file temporaneo (gli avvisi di sistema vogliono un file).
fn salva_icona(b64: &str) -> Option<PathBuf> {
    if b64.is_empty() || b64.len() > 400_000 {
        return None;
    }
    let dati = decodifica_base64(b64)?;
    if dati.len() < 8 || &dati[1..4] != b"PNG" {
        return None;
    }
    let cartella = std::env::temp_dir().join("foss-avvisi");
    let _ = std::fs::create_dir_all(&cartella);
    // un nome che dipende dal contenuto: la stessa foto si riusa
    let mut h: u64 = 1469598103934665603;
    for b in &dati {
        h = (h ^ *b as u64).wrapping_mul(1099511628211);
    }
    let p = cartella.join(format!("{h:016x}.png"));
    if !p.exists() {
        std::fs::write(&p, &dati).ok()?;
    }
    Some(p)
}

fn decodifica_base64(s: &str) -> Option<Vec<u8>> {
    let mut out = Vec::with_capacity(s.len() * 3 / 4);
    let mut buf: u32 = 0;
    let mut bits = 0;
    for c in s.bytes() {
        let v = match c {
            b'A'..=b'Z' => c - b'A',
            b'a'..=b'z' => c - b'a' + 26,
            b'0'..=b'9' => c - b'0' + 52,
            b'+' | b'-' => 62,
            b'/' | b'_' => 63,
            b'=' | b'\n' | b'\r' | b' ' => continue,
            _ => return None,
        } as u32;
        buf = (buf << 6) | v;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }
    Some(out)
}

pub fn prepara(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    mac::prepara(app);
    #[cfg(not(target_os = "macos"))]
    let _ = app;
}

pub fn mostra(app: &AppHandle, a: Avviso) {
    let st = app.state::<Stato>();
    let acceso = st.cfg.lock().unwrap().notifiche;
    let titolo = taglia(&a.titolo, 120);
    let testo = taglia(&a.testo, 300);
    if !acceso && a.dove.file.is_empty() {
        registra(app, "avviso_spento", json!({"titolo": titolo}));
        return;
    }
    // «Non disturbare»: niente avvisi (il numero sull'icona invece si aggiorna)
    if a.dove.file.is_empty() && !a.sempre && crate::in_silenzio(&st.cfg.lock().unwrap()) {
        registra(app, "avviso_silenzio", json!({"titolo": titolo}));
        return;
    }
    // con la finestra davanti e la pagina in vista l'avviso lo mostra gia' la pagina (come il Mac)
    if a.dove.file.is_empty() && !a.sempre {
        if let Some(w) = app.get_window("main") {
            let davanti = w.is_focused().unwrap_or(false) && w.is_visible().unwrap_or(false) && !w.is_minimized().unwrap_or(false);
            let in_vista = {
                let c = st.cfg.lock().unwrap();
                if c.modo == "pieno" {
                    // una alla volta: si vede solo quella davanti
                    c.davanti == (if a.dove.vista == "chat" { "chat" } else { "foss" })
                } else {
                    a.dove.vista != "chat" || c.chat_accanto
                }
            };
            if davanti && in_vista {
                registra(app, "avviso_saltato", json!({"titolo": titolo}));
                return;
            }
        }
    }
    registra(app, "avviso", json!({"titolo": titolo, "testo": testo, "dove": a.dove, "icona": !a.icona.is_empty(), "suono": a.suono, "risposta": a.risposta}));
    // nelle prove automatiche niente avvisi veri, a meno che non li chieda la prova
    if st.prova.is_some() && std::env::var("FOSS_PROVA_AVVISI_VERI").is_err() {
        return;
    }
    let icona = salva_icona(&a.icona);
    let app2 = app.clone();
    let dove = a.dove.clone();
    let (suono, risposta) = (a.suono, a.risposta && a.dove.vista == "chat");
    std::thread::spawn(move || manda(&app2, &titolo, &testo, icona, suono, risposta, dove));
}

#[cfg(target_os = "macos")]
fn manda(app: &AppHandle, titolo: &str, testo: &str, icona: Option<PathBuf>, suono: bool, risposta: bool, dove: Dove) {
    mac::manda(app, titolo, testo, icona, suono, risposta, dove);
}

/// Mac: avvisi del Centro notifiche con un «delegato» nostro. Ogni avviso ha un
/// identificativo; quando lo clicchi il Mac ce lo restituisce e da li' sappiamo dove portarti
/// (la chat e il messaggio, la notifica di FOSS, il file scaricato).
#[cfg(target_os = "macos")]
#[allow(deprecated)]
mod mac {
    use super::*;
    use objc2::rc::{Allocated, Retained};
    use objc2::runtime::{AnyClass, AnyObject, NSObject, NSObjectProtocol, ProtocolObject};
    use objc2::{define_class, msg_send, AnyThread};
    use objc2_foundation::{
        NSString, NSUserNotification, NSUserNotificationActivationType, NSUserNotificationCenter, NSUserNotificationCenterDelegate,
        NSUserNotificationDefaultSoundName,
    };
    use std::collections::HashMap;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::{Mutex, OnceLock};

    static APP: OnceLock<AppHandle> = OnceLock::new();
    static DOVE: OnceLock<Mutex<HashMap<String, Dove>>> = OnceLock::new();
    static CONTA: AtomicU64 = AtomicU64::new(1);
    fn mappa() -> &'static Mutex<HashMap<String, Dove>> {
        DOVE.get_or_init(|| Mutex::new(HashMap::new()))
    }

    define_class!(
        #[unsafe(super(NSObject))]
        #[name = "FossDelegatoAvvisi"]
        struct Delegato;

        unsafe impl NSObjectProtocol for Delegato {}

        unsafe impl NSUserNotificationCenterDelegate for Delegato {
            /// Di serie il Mac non mostra gli avvisi dell'app che hai davanti: decidiamo noi quando
            /// mandarli (mostra() li salta se stai gia' guardando quella pagina), quindi qui sempre si'.
            #[unsafe(method(userNotificationCenter:shouldPresentNotification:))]
            fn presenta(&self, _centro: &NSUserNotificationCenter, _avviso: &NSUserNotification) -> bool {
                true
            }

            #[unsafe(method(userNotificationCenter:didActivateNotification:))]
            fn attivato(&self, centro: &NSUserNotificationCenter, avviso: &NSUserNotification) {
                let id = avviso.identifier().map(|s| s.to_string()).unwrap_or_default();
                centro.removeDeliveredNotification(avviso);
                let dove = mappa().lock().unwrap().remove(&id);
                // risposta scritta nell'avviso: la manda la chat, la finestra resta dov'e'
                let scritta = if avviso.activationType().0 == NSUserNotificationActivationType::Replied.0 {
                    avviso.response().map(|r| r.string().to_string())
                } else {
                    None
                };
                if let Some(app) = APP.get() {
                    registra(app, "clic_avviso_mac", json!({"id": id, "trovato": dove.is_some(), "risposta": scritta.is_some()}));
                    if let Some(d) = dove {
                        let a = app.clone();
                        match scritta {
                            Some(t) => { std::thread::spawn(move || crate::rispondi(&a, &d, &t)); }
                            None => { std::thread::spawn(move || crate::vai_a(&a, &d)); }
                        }
                    }
                }
            }
        }
    );

    pub fn prepara(app: &AppHandle) {
        let _ = APP.set(app.clone());
        let _ = app.run_on_main_thread(|| {
            let this = Delegato::alloc().set_ivars(());
            let d: Retained<Delegato> = unsafe { msg_send![super(this), init] };
            let centro = NSUserNotificationCenter::defaultUserNotificationCenter();
            unsafe { centro.setDelegate(Some(ProtocolObject::from_ref(&*d))) };
            // il Centro notifiche non lo tiene: lo teniamo vivo per sempre
            std::mem::forget(d);
        });
    }

    fn immagine(p: &std::path::Path) -> Option<Retained<AnyObject>> {
        let cls = AnyClass::get(c"NSImage")?;
        let percorso = NSString::from_str(&p.to_string_lossy());
        unsafe {
            let a: Allocated<AnyObject> = msg_send![cls, alloc];
            msg_send![a, initWithContentsOfFile: &*percorso]
        }
    }

    pub fn manda(app: &AppHandle, titolo: &str, testo: &str, icona: Option<PathBuf>, suono: bool, risposta: bool, dove: Dove) {
        let id = format!("foss-{}-{}", std::process::id(), CONTA.fetch_add(1, Ordering::Relaxed));
        {
            let mut m = mappa().lock().unwrap();
            if m.len() > 500 {
                m.clear();
            }
            m.insert(id.clone(), dove);
        }
        let (t, x) = (titolo.to_string(), testo.to_string());
        let _ = app.run_on_main_thread(move || {
            let n = NSUserNotification::new();
            n.setIdentifier(Some(&NSString::from_str(&id)));
            n.setTitle(Some(&NSString::from_str(&t)));
            n.setInformativeText(Some(&NSString::from_str(&x)));
            if suono {
                n.setSoundName(Some(unsafe { NSUserNotificationDefaultSoundName }));
            }
            if risposta {
                n.setHasReplyButton(true);
                n.setResponsePlaceholder(Some(&NSString::from_str("Scrivi una risposta…")));
            }
            // la foto di chi scrive al posto dell'icona (come WhatsApp)
            if let Some(img) = icona.as_deref().and_then(immagine) {
                let chiave = NSString::from_str("_identityImage");
                let _: () = unsafe { msg_send![&*n, setValue: &*img, forKey: &*chiave] };
            }
            NSUserNotificationCenter::defaultUserNotificationCenter().deliverNotification(&n);
        });
    }
}

/// Windows: l'avviso (toast) costruito a mano, cosi' ha anche il campo per rispondere.
/// Il clic porta al punto giusto; «Invia» manda la risposta senza aprire la finestra.
#[cfg(windows)]
fn manda(app: &AppHandle, titolo: &str, testo: &str, icona: Option<PathBuf>, suono: bool, risposta: bool, dove: Dove) {
    use windows::core::{Interface, HSTRING};
    use windows::Data::Xml::Dom::XmlDocument;
    use windows::Foundation::{IPropertyValue, TypedEventHandler};
    use windows::UI::Notifications::{ToastActivatedEventArgs, ToastNotification, ToastNotificationManager};
    const POWERSHELL: &str = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe";
    let esc = |s: &str| s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&apos;");
    // installata: gli avvisi portano il nome FOSS; in prova uso quello di PowerShell
    let installata = std::env::current_exe().map(|p| !p.to_string_lossy().contains("\\target\\")).unwrap_or(true);
    let id = if installata { app.config().identifier.clone() } else { POWERSHELL.to_string() };
    let foto = icona
        .map(|p| format!(r#"<image placement="appLogoOverride" hint-crop="circle" src="{}"/>"#, esc(&p.to_string_lossy())))
        .unwrap_or_default();
    let audio = if suono { "" } else { r#"<audio silent="true"/>"# };
    let azioni = if risposta {
        r#"<actions><input id="testo" type="text" placeHolderContent="Scrivi una risposta…"/><action content="Invia" arguments="rispondi" hint-inputId="testo"/></actions>"#
    } else {
        ""
    };
    let xml = format!(
        r#"<toast launch="apri"><visual><binding template="ToastGeneric"><text>{}</text><text>{}</text>{}</binding></visual>{}{}</toast>"#,
        esc(titolo), esc(testo), foto, audio, azioni
    );
    let esito = (|| -> windows::core::Result<()> {
        let doc = XmlDocument::new()?;
        doc.LoadXml(&HSTRING::from(xml))?;
        let toast = ToastNotification::CreateToastNotification(&doc)?;
        let a2 = app.clone();
        toast.Activated(&TypedEventHandler::<ToastNotification, windows::core::IInspectable>::new(move |_, args| {
            let mut scritta: Option<String> = None;
            if let Some(args) = &*args {
                if let Ok(t) = args.cast::<ToastActivatedEventArgs>() {
                    if t.Arguments().map(|x| x.to_string()).unwrap_or_default() == "rispondi" {
                        if let Ok(v) = t.UserInput().and_then(|u| u.Lookup(&HSTRING::from("testo"))) {
                            if let Ok(pv) = v.cast::<IPropertyValue>() {
                                scritta = pv.GetString().ok().map(|x| x.to_string());
                            }
                        }
                    }
                }
            }
            registra(&a2, "clic_avviso_windows", json!({"risposta": scritta.is_some()}));
            match scritta {
                Some(t) => crate::rispondi(&a2, &dove, &t),
                None => crate::vai_a(&a2, &dove),
            }
            Ok(())
        }))?;
        ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(id))?.Show(&toast)?;
        Ok(())
    })();
    if let Err(e) = esito {
        registra(app, "avviso_errore", json!(e.to_string()));
    }
}

#[cfg(not(any(target_os = "macos", windows)))]
fn manda(_app: &AppHandle, _t: &str, _x: &str, _i: Option<PathBuf>, _s: bool, _r: bool, _d: Dove) {}
