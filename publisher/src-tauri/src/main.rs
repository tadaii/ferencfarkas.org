use dotenv::dotenv;
use serde::{Deserialize, Serialize};
use std::{env, str};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ScoreRef {
    path: String,
    size: u64,
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#[cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn scores_get_diff() -> Result<Vec<ScoreRef>, String> {
    let res = match execute_script("scores.js") {
        Ok(val) => val,
        Err(err) => return Err(err)
    };

    println!("{}", res);

    let mut refs: Vec<ScoreRef> = Vec::new();

    let score_ref = ScoreRef {
        path: "/patte".to_string(),
        size: 0,
    };

    refs.push(score_ref);
    Ok(refs)
}

fn get_scripts_root() -> Result<String, String> {
    let scripts_root_key = "SCRIPTS_ROOT";
    let scripts_root = match env::var(scripts_root_key) {
        Ok(val) =>  val,
        Err(_) => return Err("scripts_root_key missing".to_string()),
    };

    Ok(scripts_root)
}

fn execute_script(script: &str) -> Result<String, String> {
    let scripts_root = match get_scripts_root() {
        Ok(val) => val,
        Err(err) => return Err(err)
    };

    let output = Command::new("node")
        .arg([scripts_root, script.to_string().to_string()].join("/"))
        .output()
        .expect("Failed to execute command");

    let res = match str::from_utf8(&output.stdout) {
        Ok(val) => val,
        Err(_) => return Err("Invalid UTF-8 sequence in command output".to_string()),
    };

    Ok(res.to_string())
}

fn main() {
    dotenv().ok();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![scores_get_diff])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}