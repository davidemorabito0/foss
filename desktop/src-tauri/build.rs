// Le funzioni dell'app che le pagine possono chiamare: per ognuna Tauri crea il permesso
// «allow-<nome>», che lib.rs da' solo alle pagine di FOSS. Stesso elenco di COMANDI in lib.rs.
fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "avviso", "conta", "apri", "apri_fuori", "chat_larghezza", "chat_mostra", "aggiorna",
            "cerca_aggiornamenti", "scorciatoia", "impostazioni", "imposta", "attenzione", "prova",
            "collega_browser", "prova_avviso",
        ]),
    ))
    .expect("errore nella preparazione di FOSS");
}
