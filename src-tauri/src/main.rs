// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{Local, Timelike};
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::{env::current_dir, path::PathBuf, thread, time};
use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, SystemTraySubmenu, WindowEvent, generate_context
};
use tauri_plugin_autostart::MacosLauncher;
use tauri::api::shell;
use tauri::api::path::app_data_dir;
use std::fs;
use tauri_plugin_log::{LogTarget};
use std::process::Command;
use std::fs::{File, metadata};
use std::io::Write;
use std::path::Path;
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

static mut RECEIVE_REMINDERS: bool = false;
static mut REMINDERS_INTERVAL: u32 = 30;
//static mut DB_NAME: &str = "C:/Users/layls/workspace/pessoal/TaskRegisterTauri/task-register-tauri/task_register_local.db";
//static DB_NAME: &str = "task_register_local.db";
static mut DB_NAME: String = String::new();

#[derive(Debug, Serialize, Deserialize)]
struct Registro {
    id: i64,
    orbit_id: String,
    contract_id: String,
    hour_type: String,
    start_at: String,
    end_at: String,
    description: String,
    release_date: String,
    status: String,
    mensagem: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ResumoDia {
    total_horas_dia:String
}

#[derive(Debug, Serialize, Deserialize)]
struct Configuracao {
    id: i64,
    identifier: String,
    default_value: String,
    custom_value: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn start_reminders(is_start_reminders: bool) -> String {
    unsafe {
        RECEIVE_REMINDERS = is_start_reminders;
    }
    format!("start_reminders {} ", is_start_reminders)
}

#[tauri::command]
fn insert_registro(registro: Registro) -> Result<usize, String> {
    let conn = open_db_connection();
    conn.execute(
        "INSERT INTO registros (orbit_id, contract_id, hour_type, start_at, end_at, description, release_date, status, mensagem, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime(CURRENT_TIMESTAMP, '-03:00'), datetime(CURRENT_TIMESTAMP, '-03:00'))",
        [registro.orbit_id, registro.contract_id, registro.hour_type, registro.start_at, registro.end_at, registro.description, registro.release_date, registro.status, registro.mensagem],
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_registro(id: i64, registro: Registro) -> Result<(), String> {
    let conn = open_db_connection();
    conn.execute(
        "UPDATE registros SET orbit_id = ?1, contract_id = ?2, hour_type = ?3, start_at = ?4, end_at = ?5, description = ?6, release_date = ?7, status = ?8, mensagem = ?9, updated_at = datetime(CURRENT_TIMESTAMP, '-03:00') WHERE id = ?10",
        [registro.orbit_id, registro.contract_id, registro.hour_type, registro.start_at, registro.end_at, registro.description, registro.release_date, registro.status, registro.mensagem, id.to_string()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_registro(id: i64) -> Result<(), String> {
    let conn = open_db_connection();
    conn.execute("DELETE FROM registros WHERE id = ?", [id.to_string()])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_configuracao(configuracao: Configuracao) -> Result<(), String> {
    let conn = open_db_connection();
    conn.execute(
        "UPDATE configuracoes SET custom_value = ?1 WHERE id = ?2 OR identifier = ?3",
        [
            Some(configuracao.custom_value),
            Some(configuracao.id.to_string()),
            Some(configuracao.identifier),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn reset_configuracoes(reset_user_credentials: bool) -> Result<(), String> {
    let conn = open_db_connection();
    let mut sql_command = String::from(
        "UPDATE configuracoes SET custom_value = NULL WHERE custom_value IS NOT NULL ",
    );
    if !reset_user_credentials {
        sql_command.push_str("AND  identifier NOT IN ('USER.EMAIL', 'USER.PASSWORD')");
    }
    conn.execute(&sql_command, []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn select_configuracoes() -> Result<Vec<Configuracao>, String> {
    let conn = open_db_connection();
    let mut stmt = conn
        .prepare("SELECT id, identifier, default_value, custom_value FROM configuracoes")
        .map_err(|e| e.to_string())?;
    let configuracoes_iter = stmt
        .query_map([], |row| {
            let config = Configuracao {
                id: row.get(0)?,
                identifier: row.get(1)?,
                default_value: row.get(2)?,
                custom_value: row.get(3)?,
            };
            Ok(config)
        })
        .map_err(|e| e.to_string())?;

    let configuracoes: Vec<Configuracao> = configuracoes_iter.map(|r| r.unwrap()).collect();
    Ok(configuracoes)
}

#[tauri::command]
fn select_configuracao(identifier: String) -> Result<Vec<Configuracao>, String> {
    let conn = open_db_connection();
    let mut stmt = conn.prepare("SELECT id, identifier, default_value, custom_value FROM configuracoes WHERE identifier = ?1")
        .map_err(|e| e.to_string())?;
    let configuracoes_iter = stmt
        .query_map([identifier], |row| {
            Ok(Configuracao {
                id: row.get(0)?,         // Type annotation para i64
                identifier: row.get(1)?, // Type annotation para String
                default_value: row.get(2)?,
                custom_value: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let configuracoes: Vec<Configuracao> = configuracoes_iter.map(|r| r.unwrap()).collect();
    Ok(configuracoes)
}

#[tauri::command]
fn select_registros(release_date: String) -> Result<Vec<Registro>, String> {
    let conn = open_db_connection();
    let mut stmt = conn.prepare("SELECT id,orbit_id, contract_id, hour_type, start_at, end_at, description, release_date, status, mensagem, created_at, updated_at FROM registros WHERE release_date = ?")
        .map_err(|e| e.to_string())?;
    let registros_iter = stmt
        .query_map([release_date], |row| {
            Ok(Registro {
                id: row.get(0)?,       // Type annotation para i64
                orbit_id: row.get(1)?, // Type annotation para String
                contract_id: row.get(2)?,
                hour_type: row.get(3)?,
                start_at: row.get(4)?,
                end_at: row.get(5)?,
                description: row.get(6)?,
                release_date: row.get(7)?,
                status: row.get(8)?,
                mensagem: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let registros: Vec<Registro> = registros_iter.map(|r| r.unwrap()).collect();
    Ok(registros)
}

#[tauri::command]
fn select_ifexist_registro(registro: Registro) -> Result<Vec<Registro>, String> {
    let conn = open_db_connection();
    let mut stmt = conn.prepare(
        "SELECT id,orbit_id, contract_id, hour_type, start_at, end_at, description, release_date, status, mensagem, created_at, updated_at
        FROM registros 
        WHERE (release_date = ?1
        AND start_at = ?2 
        AND end_at = ?3
        AND contract_id = ?4
        AND description = ?5) OR (orbit_id =  ?6)
        ")
        .map_err(|e| e.to_string())?;
    let registros_iter = stmt
        .query_map(
            [
                registro.release_date,
                registro.start_at,
                registro.end_at,
                registro.contract_id,
                registro.description,
                registro.orbit_id,
            ],
            |row| {
                Ok(Registro {
                    id: row.get(0)?,       // Type annotation para i64
                    orbit_id: row.get(1)?, // Type annotation para String
                    contract_id: row.get(2)?,
                    hour_type: row.get(3)?,
                    start_at: row.get(4)?,
                    end_at: row.get(5)?,
                    description: row.get(6)?,
                    release_date: row.get(7)?,
                    status: row.get(8)?,
                    mensagem: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let registros: Vec<Registro> = registros_iter.map(|r| r.unwrap()).collect();
    Ok(registros)
}

#[tauri::command]
fn get_total_horas_dia(release_date: String) -> Result<Vec<ResumoDia>, String> {
    let conn = open_db_connection();
    let mut stmt = conn.prepare("SELECT printf('%02d:%02d', SUM(difference_in_seconds) / 3600, (SUM(difference_in_seconds) % 3600) / 60) AS total_dia FROM
(SELECT strftime('%s', end_at) - strftime('%s', start_at) AS difference_in_seconds FROM registros WHERE release_date = ?)")
        .map_err(|e| e.to_string())?;
    let result_iter = stmt
        .query_map([release_date], |row| {
            Ok(ResumoDia{ total_horas_dia: row.get(0)?})
        })
        .map_err(|e| e.to_string())?;

    let result: Vec<ResumoDia> = result_iter.map(|r| r.unwrap()).collect();
    Ok(result)
}

fn atualizar(app_handle: tauri::AppHandle) {
    let receie_reminders: bool;
    unsafe {
        receie_reminders = RECEIVE_REMINDERS;
    }
    if receie_reminders {
        let agora = Local::now();
        let minuto = agora.minute();
        let segundos = agora.second();
        let reminders_interval: u32;
        unsafe {
            reminders_interval = REMINDERS_INTERVAL;
        }
        if minuto % reminders_interval == 0 {
            let app_window = app_handle.get_window("main").unwrap();
            if true || !app_window.is_visible().unwrap() {
                update_last_register(app_handle);
            }
        }
    }
    thread::sleep(time::Duration::from_secs(60));
}

fn update_last_register(app_handle: tauri::AppHandle) {
    let dialog_window = app_handle.get_window("note-reminder").unwrap();
    dialog_window.center().unwrap();
    dialog_window.show().unwrap();
    dialog_window.emit(&"atualizar-note-reminder", "").unwrap();
}

fn show_main_window(app_handle: tauri::AppHandle) {
    let main_window = app_handle.get_window("main").unwrap();
    main_window.emit(&"atualizar-dashboard", "").unwrap();
    main_window.show().unwrap();
}

fn show_dialog_change_autorun(app_handle: tauri::AppHandle) {
    let change_autorun = app_handle.get_window("change-autorun").unwrap();
    change_autorun.show().unwrap();
}

fn show_dialog_receie_reminders(app_handle: tauri::AppHandle) {
    let receie_reminders = app_handle.get_window("start-reminders").unwrap();
    receie_reminders.show().unwrap();
}

fn logout_orbit(app_handle: tauri::AppHandle) {
    let main_window = app_handle.get_window("main").unwrap();
    main_window.emit(&"logout-orbit", "").unwrap();
    main_window.show().unwrap();
}



fn main() {

    let context = generate_context!();
    let config = &context.config();
    let app_data_path= app_data_dir(config).unwrap();
    
    if !app_data_path.exists() {
        let _ = fs::create_dir_all(&app_data_path);
    }
    create_db_default(app_data_path.clone()).unwrap();
    //executar_script_powershell_update( app_data_path.clone().into_os_string().into_string().unwrap(), current_dir.into_os_string().into_string().unwrap(), config.package.product_name.clone().unwrap());

    let options_item_1 = CustomMenuItem::new(
        "autostart_enable",
        "Ativar/Desativar Inicialização automática",
    );

    let options_item_2 = CustomMenuItem::new(
        "receie_reminders",
        "Ativar/Desativar Lembretes",
    );

    let options_item_3 = CustomMenuItem::new(
       "logout", "Logout Orbit"
    );

    let options_menu = SystemTrayMenu::new()
    .add_item(options_item_1)
    .add_native_item(SystemTrayMenuItem::Separator)
    .add_item(options_item_2)
    .add_native_item(SystemTrayMenuItem::Separator)
    .add_item(options_item_3);

    let options_submenu = SystemTraySubmenu::new("Opções", options_menu);

    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new(
            "show_main_window",
            "Abrir Dashboard",
        ))
        .add_item(CustomMenuItem::new(
            "update_last_register",
            "Atualizar Último Registro",
        ))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_submenu(options_submenu)
        //.add_item(CustomMenuItem::new("logout", "Logout Orbit"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("report_failure", "Reportar Falha"))
        .add_item(CustomMenuItem::new("quit", "Encerrar Taskoo"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                show_main_window(app.app_handle());
            }
            SystemTrayEvent::RightClick {
                position: _,
                size: _,
                ..
            } => {
            }
            SystemTrayEvent::DoubleClick {
                position: _,
                size: _,
                ..
            } => {
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "show_main_window" => {
                    show_main_window(app.app_handle());
                }
                "update_last_register" => {
                    update_last_register(app.app_handle());
                }
                "autostart_enable" => {
                    show_dialog_change_autorun(app.app_handle());
                }
                "logout" => {
                    logout_orbit(app.app_handle());
                }
                "receie_reminders"  => {
                    show_dialog_receie_reminders(app.app_handle());
                }
                "report_failure" => {
                    let _ = shell::open(&app.shell_scope(), "https://github.com/Laylson-Fernande/taskoo-task-register-tauri/issues/new", None);
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let app_handle = app.app_handle();
            thread::spawn(move || loop {
                atualizar(app_handle.clone());
            });
            
            Ok(())
        })
        .on_window_event(|event| match event.event() {
            WindowEvent::CloseRequested { api, .. } => {
                let window = event.window();
                let label = window.label();

                match label {
                    "note-reminder" => {
                        window.emit(&"stop-sound-notification", "").unwrap();
                    }
                    _ => {

                        api.prevent_close();
                    }
                }
                event.window().hide().unwrap();
                api.prevent_close(); 
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            start_reminders,
            insert_registro,
            select_registros,
            select_ifexist_registro,
            update_registro,
            delete_registro,
            update_configuracao,
            reset_configuracoes,
            select_configuracoes,
            select_configuracao,
            get_version,
            executar_script_powershell_update,
            get_total_horas_dia
        ])
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_log::Builder::default().targets([
            //LogTarget::LogDir,
            LogTarget::Stdout,
            //LogTarget::Webview,
        ]).build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_version() -> String {
    let version = tauri::generate_context!().package_info().version.to_string();
    version
}

#[tauri::command]
fn executar_script_powershell_update() {
    let context = generate_context!();
    let config = &context.config();
    let app_data_path= app_data_dir(config).unwrap();
    let current_dir = current_dir().unwrap();

    let source_path: String = app_data_path.clone().into_os_string().into_string().unwrap();
    let destination_path: String = current_dir.into_os_string().into_string().unwrap();
    let file_name: String = config.package.product_name.clone().unwrap();

    // Caminho para o script PowerShell
    let script_path =  source_path.clone() + "\\UpdateTaskoo.ps1";

    create_ps_update_script(script_path.clone().as_str()).unwrap_or_else(|e| {
        eprintln!("Failed to create powershell update script: {}", e);
    });

    // Executa o script PowerShell com os parâmetros fornecidos
    let output = Command::new("powershell")
        .arg("-NoProfile")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-File")
        .arg(script_path)
        .arg("-SourcePath")
        .arg(source_path)
        .arg("-DestinationPath")
        .arg(destination_path)
        .arg("-FileName")
        .arg(file_name.clone() + ".exe")
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let result = String::from_utf8_lossy(&output.stdout).to_string();
                println!("executar_script_powershell_update success: {}",result);
                //Ok(result)
            } else {
                let error: String = String::from_utf8_lossy(&output.stderr).to_string();
                print!("executar_script_powershell_update error: {}",error);
                //Err(error)
            }
        }
        Err(e) =>  eprintln!("Erro ao executar o script PowerShell UpdateTaskoo : {}", e),
    }
}

fn set_db_name(db_name: String) {
    unsafe {
        DB_NAME = db_name;
    }
}

fn get_db_name() -> String {
    let db_name:String;
    unsafe {
        db_name = DB_NAME.clone();
    }
    return db_name;
}

fn open_db_connection() -> Connection {
    let db_name = get_db_name();
    Connection::open(db_name).unwrap_or_else(|e| {
        eprintln!("Failed to open the database connection: {}", e);
        std::process::exit(1);
    })
}

fn create_db_default(mut app_data_path: PathBuf) -> Result<()> {

    app_data_path.push("task_register_local.db");
    set_db_name(app_data_path.into_os_string().into_string().unwrap());

    let conn = open_db_connection();
    // Cria a tabela (se não existir)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS registros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orbit_id TEXT,
            contract_id TEXT,
            hour_type TEXT,
            start_at TEXT,
            end_at TEXT,
            description TEXT,
            release_date TEXT,
            status TEXT,
            mensagem TEXT,
            created_at TEXT,
            updated_at TEXT
        );",
        (),
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            identifier TEXT UNIQUE NOT NULL,
            default_value TEXT NOT NULL,
            custom_value TEXT NOT NULL
        );",
        (),
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS insert_configuracao_trigger
        BEFORE INSERT ON configuracoes
        WHEN NEW.identifier IN (
            SELECT identifier FROM configuracoes
        )
        BEGIN
            SELECT RAISE(IGNORE);
        END;",
        (),
    )?;

    conn.execute(
        "INSERT INTO configuracoes (identifier, default_value, custom_value)
        VALUES 
        ('REMINDERS.INTERVAL', '30', ''),
        ('AUTO.SYNC.ORBIT', 'false', ''),
        ('USER.ORBIT.EMAIL', '', ''),
        ('USER.ORBIT.PASSWORD', '', ''),
        ('INTEGRATE.ORBIT','true',''),
        ('AUTORUN.APPLICATION','true','');",
        (),
    )?;
    Ok(())
}


fn create_ps_update_script(file_path: &str) -> std::io::Result<()> {

    if Path::new(file_path).exists() {
        println!("O arquivo '{}' já existe. Nenhuma ação foi tomada.", file_path);
        return Ok(()); // Retorna sem fazer nada se o arquivo já existir
    }

    let script_content = r#"
param (
    [string]$Url,
    [string]$SourcePath,  # Caminho da pasta de origem
    [string]$DestinationPath,  # Caminho da pasta de destino
    [string]$FileName  # Nome do arquivo a ser copiado
)

# Combina o caminho de origem com o nome do arquivo
$SourceFile = Join-Path -Path $SourcePath -ChildPath $FileName

# Combina o caminho de destino com o nome do arquivo
$DestinationFile = Join-Path -Path $DestinationPath -ChildPath $FileName

function Test-Permission {
    param (
        [string]$Path
    )

    try {
        # Testa a permissão de escrita criando e excluindo um arquivo temporário
        $testFile = [System.IO.Path]::Combine($Path, [System.Guid]::NewGuid().ToString() + ".tmp")
        $stream = [System.IO.File]::Create($testFile)
        $stream.Close()
        Remove-Item $testFile -Force
        return $true
    } catch {
        return $false
    }
}

function Restart-ScriptAsAdmin {
    param (
        [string]$ScriptPath,
        [string]$Url,
        [string]$SourcePath,
        [string]$DestinationPath,
        [string]$FileName
    )

    # Prepara argumentos para reiniciar o script como administrador
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -Url `"$Url`" -SourcePath `"$SourcePath`" -DestinationPath `"$DestinationPath`" -FileName `"$FileName`""
    Start-Process powershell -ArgumentList $arguments -Verb RunAs
    exit
}

# Verifica permissões de escrita no diretório de destino
if (-not (Test-Permission -Path (Split-Path $DestinationFile -Parent))) {
    Write-Host "Sem permissão para escrever no diretório de destino. Tentando reiniciar como administrador..."
    # Reinicia o script como administrador
    $scriptPath = $MyInvocation.MyCommand.Path
    Restart-ScriptAsAdmin -ScriptPath $scriptPath -Url $Url -SourcePath $SourcePath -DestinationPath $DestinationPath -FileName $FileName
}

# Verifica se o arquivo de origem existe
if (Test-Path $SourceFile) {
    try {
        # Encerra o processo do programa, se estiver em execução
        Stop-Process -Name "Taskoo" -ErrorAction SilentlyContinue -Force
        Start-Sleep -Seconds 2
        # Copia o arquivo para o destino, substituindo se já existir
        Copy-Item -Path $SourceFile -Destination $DestinationFile -Force
        
        # Inicia o programa copiado
        Start-Process $DestinationFile
        Write-Host "Arquivo copiado com sucesso!"
    } catch {
        Write-Host "Erro ao copiar o arquivo: $_"
    }
} else {
    Write-Host "O arquivo de origem não foi encontrado."
}
"#;

    let path = Path::new(file_path);
    let mut file = File::create(&path)?;
    file.write_all(script_content.as_bytes())?;

    Ok(())
}