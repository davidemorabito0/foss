// L'icona nella barra dei menu (Mac) o vicino all'orologio (Windows), col numero delle
// chat da leggere, e il menu dell'app sul Mac (FOSS, Modifica, Vista, Finestra).

use crate::{apri_impostazioni, cerca_aggiornamento, esegui_scorciatoia, installa_aggiornamento, mostra_finestra, Stato};
use tauri::{
    image::Image,
    menu::{CheckMenuItemBuilder, Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_autostart::ManagerExt as _;

const ICONA_MAC: &[u8] = include_bytes!("../icons/vassoio-mac.png");
const ICONA_WIN: &[u8] = include_bytes!("../icons/vassoio-win.png");

fn menu_vassoio(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let st = app.state::<Stato>();
    let nuova = st.nuova_versione.lock().unwrap().clone();
    let avvio = app.autolaunch().is_enabled().unwrap_or(false);
    let c = st.cfg.lock().unwrap().clone();
    let pieno = c.modo == "pieno";
    let mut m = MenuBuilder::new(app)
        .item(&MenuItemBuilder::with_id("apri", "Apri FOSS").build(app)?)
        .item(&MenuItemBuilder::with_id("chat", if pieno || c.chat_accanto { "Apri FOSS.chat" } else { "Mostra FOSS.chat accanto" }).build(app)?)
        .separator()
        .item(&CheckMenuItemBuilder::with_id("modo-accanto", "FOSS e chat affiancate").checked(!pieno).build(app)?)
        .item(&CheckMenuItemBuilder::with_id("modo-pieno", "Una alla volta, a tutta finestra").checked(pieno).build(app)?)
        .item(&CheckMenuItemBuilder::with_id("lato-destra", "Chat a destra").checked(c.lato != "sinistra").enabled(!pieno).build(app)?)
        .item(&CheckMenuItemBuilder::with_id("lato-sinistra", "Chat a sinistra").checked(c.lato == "sinistra").enabled(!pieno).build(app)?)
        .separator();
    if let Some(v) = nuova {
        m = m.item(&MenuItemBuilder::with_id("aggiorna", format!("⬆ Aggiorna FOSS alla versione {v}")).build(app)?).separator();
    }
    // «Non disturbare»: per un po', fino a domani, ogni giorno a orario
    let sil = crate::in_silenzio(&c);
    let silenzio = SubmenuBuilder::new(app, if sil { format!("☾ Non disturbare ({})", crate::silenzio_fino(&c)) } else { "Non disturbare".to_string() })
        .item(&MenuItemBuilder::with_id("dnd-60", "Per 1 ora").build(app)?)
        .item(&MenuItemBuilder::with_id("dnd-domani", "Fino a domani mattina").build(app)?)
        .item(&CheckMenuItemBuilder::with_id("dnd-orario", format!("Ogni giorno dalle {} alle {}", c.silenzio_da, c.silenzio_a)).checked(c.silenzio_orario).build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("dnd-via", "Riprendi gli avvisi").enabled(sil).build(app)?)
        .build()?;
    m.item(&silenzio)
        .item(&CheckMenuItemBuilder::with_id("avvio", "Avvia FOSS all’accensione").checked(avvio).build(app)?)
        .item(&MenuItemBuilder::with_id("impostazioni", "Impostazioni…").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("esci", "Esci da FOSS").build(app)?)
        .build()
}

pub fn crea(app: &AppHandle) -> tauri::Result<()> {
    let mac = cfg!(target_os = "macos");
    let icona = Image::from_bytes(if mac { ICONA_MAC } else { ICONA_WIN })?;
    TrayIconBuilder::with_id("foss")
        .icon(icona)
        .icon_as_template(mac)
        .tooltip("FOSS")
        .menu(&menu_vassoio(app)?)
        // Windows: clic = apri FOSS, tasto destro = menu. Mac: clic = menu (come le altre app)
        .show_menu_on_left_click(mac)
        .on_menu_event(|app, ev| menu_scelto(app, ev.id().as_ref()))
        .on_tray_icon_event(|tray, ev| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = ev {
                if !cfg!(target_os = "macos") {
                    mostra_finestra(tray.app_handle());
                }
            }
        })
        .build(app)?;
    Ok(())
}

/// Ricostruisce il menu dell'icona (avvio automatico, aggiornamento disponibile...).
pub fn aggiorna_menu(app: &AppHandle) {
    if let (Some(t), Ok(m)) = (app.tray_by_id("foss"), menu_vassoio(app)) {
        let _ = t.set_menu(Some(m));
    }
}

pub fn menu_scelto(app: &AppHandle, id: &str) {
    match id {
        "apri" => mostra_finestra(app),
        "chat" => {
            mostra_finestra(app);
            crate::porta_davanti(app, "chat");
        }
        "modo-accanto" | "modo-pieno" => {
            mostra_finestra(app);
            crate::cambia_modo(app, Some(if id == "modo-pieno" { "pieno" } else { "accanto" }));
        }
        "aggiorna" => {
            mostra_finestra(app);
            let a = app.clone();
            tauri::async_runtime::spawn(async move {
                let _ = installa_aggiornamento(a).await;
            });
        }
        "avvio" => {
            let ora = app.autolaunch().is_enabled().unwrap_or(false);
            let _ = if ora { app.autolaunch().disable() } else { app.autolaunch().enable() };
            aggiorna_menu(app);
        }
        "impostazioni" => apri_impostazioni(app),
        "dnd-60" => crate::metti_pausa(app, "60"),
        "dnd-domani" => crate::metti_pausa(app, "domani"),
        "dnd-via" => crate::metti_pausa(app, "0"),
        "dnd-orario" => {
            let st = app.state::<Stato>();
            {
                let mut c = st.cfg.lock().unwrap();
                c.silenzio_orario = !c.silenzio_orario;
            }
            st.salva();
            crate::annuncia_silenzio(app, true);
        }
        "cerca-aggiornamenti" => {
            apri_impostazioni(app);
            cerca_aggiornamento(app, true);
        }
        "esci" => {
            *app.state::<Stato>().uscita.lock().unwrap() = true;
            app.exit(0);
        }
        "cerca" | "nuova-task" | "chat-mostra" | "ricarica" | "foss-davanti" | "chat-davanti" | "modo" | "lato-destra" | "lato-sinistra" => {
            esegui_scorciatoia(app, if id == "chat-mostra" { "chat" } else { id })
        }
        _ => {}
    }
}

/// Il menu in alto sul Mac. Serve anche perche' copia, incolla e annulla funzionino.
#[cfg(target_os = "macos")]
pub fn menu_mac(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    use tauri::menu::PredefinedMenuItem;
    let foss = SubmenuBuilder::new(app, "FOSS")
        .item(&PredefinedMenuItem::about(app, Some("Informazioni su FOSS"), None)?)
        .separator()
        .item(&MenuItemBuilder::with_id("impostazioni", "Impostazioni…").accelerator("CmdOrCtrl+,").build(app)?)
        .item(&MenuItemBuilder::with_id("cerca-aggiornamenti", "Cerca aggiornamenti…").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::services(app, Some("Servizi"))?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, Some("Nascondi FOSS"))?)
        .item(&PredefinedMenuItem::hide_others(app, Some("Nascondi altre"))?)
        .item(&PredefinedMenuItem::show_all(app, Some("Mostra tutte"))?)
        .separator()
        .item(&MenuItemBuilder::with_id("esci", "Esci da FOSS").accelerator("CmdOrCtrl+Q").build(app)?)
        .build()?;
    let modifica = SubmenuBuilder::new(app, "Modifica")
        .item(&PredefinedMenuItem::undo(app, Some("Annulla"))?)
        .item(&PredefinedMenuItem::redo(app, Some("Ripeti"))?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, Some("Taglia"))?)
        .item(&PredefinedMenuItem::copy(app, Some("Copia"))?)
        .item(&PredefinedMenuItem::paste(app, Some("Incolla"))?)
        .item(&PredefinedMenuItem::select_all(app, Some("Seleziona tutto"))?)
        .build()?;
    let vista = SubmenuBuilder::new(app, "Vista")
        .item(&MenuItemBuilder::with_id("cerca", "Cerca").accelerator("CmdOrCtrl+K").build(app)?)
        .item(&MenuItemBuilder::with_id("nuova-task", "Nuova task").accelerator("CmdOrCtrl+N").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("foss-davanti", "FOSS").accelerator("CmdOrCtrl+1").build(app)?)
        .item(&MenuItemBuilder::with_id("chat-davanti", "FOSS.chat").accelerator("CmdOrCtrl+2").build(app)?)
        .item(&MenuItemBuilder::with_id("chat-mostra", "Mostra o nascondi la chat").accelerator("CmdOrCtrl+J").build(app)?)
        .item(&MenuItemBuilder::with_id("modo", "Affiancate / una alla volta").accelerator("CmdOrCtrl+Backslash").build(app)?)
        .item(&MenuItemBuilder::with_id("lato-destra", "Chat a destra").build(app)?)
        .item(&MenuItemBuilder::with_id("lato-sinistra", "Chat a sinistra").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("ricarica", "Ricarica").accelerator("CmdOrCtrl+R").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, Some("Schermo intero"))?)
        .build()?;
    let finestra = SubmenuBuilder::new(app, "Finestra")
        .item(&PredefinedMenuItem::minimize(app, Some("Riduci a icona"))?)
        .item(&PredefinedMenuItem::maximize(app, Some("Ingrandisci"))?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, Some("Chiudi finestra"))?)
        .build()?;
    MenuBuilder::new(app).items(&[&foss, &modifica, &vista, &finestra]).build()
}

// ---------------------------------------------------------------- il numero

/// Il numero delle chat da leggere: nella barra dei menu e sul Dock (Mac),
/// sull'icona vicino all'orologio e sulla barra delle applicazioni (Windows).
pub fn aggiorna_numero(app: &AppHandle, n: i64) {
    let testo = if n > 99 { "99+".to_string() } else { n.to_string() };
    let sil = crate::in_silenzio(&app.state::<Stato>().cfg.lock().unwrap());
    if let Some(t) = app.tray_by_id("foss") {
        let base = match n {
            0 => "FOSS".to_string(),
            1 => "FOSS — 1 chat da leggere".to_string(),
            _ => format!("FOSS — {testo} chat da leggere"),
        };
        let _ = t.set_tooltip(Some(if sil { format!("{base} · non disturbare") } else { base }));
        #[cfg(target_os = "macos")]
        {
            // ☾ = «Non disturbare» attivo
            let titolo = match (sil, n > 0) {
                (true, true) => Some(format!("☾ {testo}")),
                (true, false) => Some("☾".to_string()),
                (false, true) => Some(testo.clone()),
                (false, false) => None,
            };
            let _ = t.set_title(titolo);
        }
        #[cfg(not(target_os = "macos"))]
        {
            if let Ok(base) = Image::from_bytes(ICONA_WIN) {
                let _ = t.set_icon(Some(if n > 0 { con_numero(&base, n) } else { base }));
            }
        }
    }
    if let Some(w) = app.get_window("main") {
        #[cfg(target_os = "macos")]
        {
            let _ = w.set_badge_count(if n > 0 { Some(n) } else { None });
        }
        #[cfg(windows)]
        {
            let _ = w.set_overlay_icon(if n > 0 { Some(pallino(n)) } else { None });
        }
        #[cfg(not(any(target_os = "macos", windows)))]
        let _ = w;
    }
}

// cifre 3x5, una riga per stringa
const CIFRE: [[&str; 5]; 11] = [
    ["111", "101", "101", "101", "111"],
    ["010", "110", "010", "010", "111"],
    ["111", "001", "111", "100", "111"],
    ["111", "001", "111", "001", "111"],
    ["101", "101", "111", "001", "001"],
    ["111", "100", "111", "001", "111"],
    ["111", "100", "111", "101", "111"],
    ["111", "001", "001", "001", "001"],
    ["111", "101", "111", "101", "111"],
    ["111", "101", "111", "001", "111"],
    ["000", "010", "111", "010", "000"], // +
];

fn breve(n: i64) -> Vec<usize> {
    if n > 9 {
        vec![9, 10]
    } else {
        vec![n.max(0) as usize]
    }
}

fn metti(px: &mut [u8], w: u32, x: i32, y: i32, c: [u8; 3], a: f32) {
    if x < 0 || y < 0 || x as u32 >= w || a <= 0.0 {
        return;
    }
    let i = ((y as u32 * w + x as u32) * 4) as usize;
    if i + 3 >= px.len() {
        return;
    }
    let a = a.min(1.0);
    let da = px[i + 3] as f32 / 255.0;
    let oa = a + da * (1.0 - a);
    for k in 0..3 {
        let v = (c[k] as f32 * a + px[i + k] as f32 * da * (1.0 - a)) / oa.max(1e-6);
        px[i + k] = v.round().clamp(0.0, 255.0) as u8;
    }
    px[i + 3] = (oa * 255.0).round() as u8;
}

/// Una pastiglia rossa col numero, centrata in (cx, cy).
fn pastiglia(px: &mut [u8], w: u32, h: u32, n: i64, cx: f32, cy: f32, r: f32, scala: i32) {
    let cifre = breve(n);
    let largo_testo = cifre.len() as i32 * 3 * scala + (cifre.len() as i32 - 1) * scala;
    let mezzo = ((largo_testo as f32 / 2.0) - r * 0.55).max(0.0);
    let (x0, x1) = (cx - mezzo, cx + mezzo);
    for y in 0..h as i32 {
        for x in 0..w as i32 {
            let (fx, fy) = (x as f32 + 0.5, y as f32 + 0.5);
            let qx = fx.clamp(x0, x1);
            let d = ((fx - qx).powi(2) + (fy - cy).powi(2)).sqrt();
            // bordo chiaro sottile, poi il rosso
            metti(px, w, x, y, [255, 255, 255], (r + 1.5 - d).clamp(0.0, 1.0));
            metti(px, w, x, y, [229, 57, 53], (r + 0.5 - d).clamp(0.0, 1.0));
        }
    }
    let mut x = (cx - largo_testo as f32 / 2.0).round() as i32;
    let y = (cy - 2.5 * scala as f32).round() as i32;
    for c in cifre {
        for (ry, riga) in CIFRE[c].iter().enumerate() {
            for (rx, b) in riga.bytes().enumerate() {
                if b == b'1' {
                    for dy in 0..scala {
                        for dx in 0..scala {
                            metti(px, w, x + rx as i32 * scala + dx, y + ry as i32 * scala + dy, [255, 255, 255], 1.0);
                        }
                    }
                }
            }
        }
        x += 4 * scala;
    }
}

#[allow(dead_code)]
fn con_numero(base: &Image<'_>, n: i64) -> Image<'static> {
    let (w, h) = (base.width(), base.height());
    let mut px = base.rgba().to_vec();
    let s = w as f32 / 32.0;
    pastiglia(&mut px, w, h, n, w as f32 - 9.0 * s, 9.0 * s, 8.5 * s, (2.0 * s).round().max(1.0) as i32);
    Image::new_owned(px, w, h)
}

#[allow(dead_code)]
fn pallino(n: i64) -> Image<'static> {
    let (w, h) = (32u32, 32u32);
    let mut px = vec![0u8; (w * h * 4) as usize];
    pastiglia(&mut px, w, h, n, 16.0, 16.0, 14.5, if n > 9 { 3 } else { 4 });
    Image::new_owned(px, w, h)
}
