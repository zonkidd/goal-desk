use chrono::Local;
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::Manager;

const MAX_AUTO_BACKUPS: usize = 10;

pub fn perform_auto_backup(app_handle: &tauri::AppHandle, db_path: PathBuf) {
    // Determine the auto backup directory
    let home_dir = match app_handle.path().home_dir() {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("Failed to get home directory for auto backup: {}", e);
            return;
        }
    };

    let backup_dir = home_dir.join(".kairos").join("auto_backup");

    // Create backup directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(&backup_dir) {
        eprintln!("Failed to create auto backup directory: {}", e);
        return;
    }

    // Generate filename based on current date
    let today = Local::now().format("%Y-%m-%d").to_string();
    let backup_filename = format!("auto-backup-{}.sqlite", today);
    let backup_file_path = backup_dir.join(&backup_filename);

    // If today's backup already exists, skip
    if backup_file_path.exists() {
        return;
    }

    // Perform backup copy
    if let Err(e) = fs::copy(&db_path, &backup_file_path) {
        eprintln!("Failed to copy database for auto backup: {}", e);
        return;
    }

    // Clean up old backups
    if let Ok(entries) = fs::read_dir(&backup_dir) {
        let mut backups: Vec<(PathBuf, SystemTime)> = Vec::new();

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.starts_with("auto-backup-") && name.ends_with(".sqlite") {
                        if let Ok(metadata) = fs::metadata(&path) {
                            if let Ok(modified) = metadata.modified() {
                                backups.push((path, modified));
                            }
                        }
                    }
                }
            }
        }

        // Sort by modification time, newest first
        backups.sort_by(|a, b| b.1.cmp(&a.1));

        // Remove older backups if we exceed MAX_AUTO_BACKUPS
        if backups.len() > MAX_AUTO_BACKUPS {
            for (path, _) in backups.into_iter().skip(MAX_AUTO_BACKUPS) {
                let _ = fs::remove_file(path);
            }
        }
    }
}
