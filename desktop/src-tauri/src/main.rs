// FOSS per Mac e Windows: tutto il lavoro sta in lib.rs.
// Su Windows niente finestra nera del terminale dietro all'app.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    foss_desktop_lib::run()
}
