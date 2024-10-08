// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
extern crate winapi;

use chrono::{DateTime, Datelike, Local, Timelike};
use rusqlite::Result;
use std::{env::current_dir, thread, time};
use tauri::{CustomMenuItem, Manager, WindowBuilder, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, SystemTraySubmenu, WindowEvent, generate_context
};
use tauri_plugin_autostart::MacosLauncher;
use tauri::api::shell;
use tauri::api::path::app_data_dir;
use std::fs;
use tauri_plugin_log::LogTarget;
use std::process::Command;
use std::fs::File;
use std::io::Write;
use std::path::Path;

use std::ptr::null_mut;
use std::mem::zeroed;
use winapi::um::winuser::*;
use winapi::um::libloaderapi::GetModuleHandleW;
use winapi::shared::minwindef::{LPARAM, LRESULT, UINT, WPARAM};
use winapi::shared::windef::HWND;


mod db;

use db::{ddl, registros_repository, registros_repository::{Registro, ResumoDia, DayWithWarning}, configurations_repository, configurations_repository::Configuracao};

// Definir manualmente as funções da wtsapi32.dll
#[link(name = "wtsapi32")]
extern "system" {
    fn WTSRegisterSessionNotification(hWnd: HWND, dwFlags: u32) -> bool;
    fn WTSUnRegisterSessionNotification(hWnd: HWND) -> bool;
}

static mut RECEIVE_REMINDERS: bool = false;
static mut REMINDERS_INTERVAL: u32 = 30;
static mut LAST_REMINDER_TIMESTAMP: i64 = 0;
static  mut SESSION_UNLOCK: bool = true;

#[tauri::command]
fn start_reminders(is_start_reminders: bool) -> String {
    unsafe {
        RECEIVE_REMINDERS = is_start_reminders;
    }
    format!("start_reminders {} ", is_start_reminders)
}

#[tauri::command]
fn insert_registro(registro: Registro) -> Result<usize, String> {
    registros_repository::insert_registro(registro)
}

#[tauri::command]
fn update_registro(id: i64, registro: Registro) -> Result<(), String> {
    registros_repository::update_registro(id, registro)
}

#[tauri::command]
fn delete_registro(id: i64) -> Result<(), String> {
    registros_repository::delete_registro(id)
}

#[tauri::command]
fn select_registros(release_date: String) -> Result<Vec<Registro>, String> {
    registros_repository::select_registros(release_date)
}

#[tauri::command]
fn select_ifexist_registro(registro: Registro) -> Result<Vec<Registro>, String> {
    registros_repository::select_ifexist_registro(registro)
}

#[tauri::command]
fn select_last_registro(release_date: String) -> Result<Vec<Registro>, String> {
    registros_repository::select_last_registro(release_date)
}

#[tauri::command]
fn select_days_with_warning() -> Result<Vec<DayWithWarning>, String> {
    registros_repository::select_days_with_warning()
}

#[tauri::command]
fn get_total_horas_normal_dia(release_date: String, ignored_id: String) -> Result<Vec<ResumoDia>, String> {
    registros_repository::get_total_horas_normal_dia(release_date, ignored_id)
}

#[tauri::command]
fn get_total_horas_dia(release_date: String) -> Result<Vec<ResumoDia>, String> {
    registros_repository::get_total_horas_dia(release_date)
}

#[tauri::command]
fn update_configuracao(configuracao: Configuracao) -> Result<(), String> {
    configurations_repository::update_configuracao(configuracao)
}

#[tauri::command]
fn reset_configuracoes(reset_user_credentials: bool) -> Result<(), String> {
    configurations_repository::reset_configuracoes(reset_user_credentials)
}

#[tauri::command]
fn select_configuracoes() -> Result<Vec<Configuracao>, String> {
    configurations_repository::select_configuracoes()
}

#[tauri::command]
fn select_configuracao(identifier: String) -> Result<Vec<Configuracao>, String> {
    configurations_repository::select_configuracao(identifier)
}

unsafe extern "system" fn wnd_proc(hwnd: HWND, msg: UINT, w_param: WPARAM, l_param: LPARAM) -> LRESULT {
    match msg {
        WM_DESTROY => {
            PostQuitMessage(0);
            0
        }
        WM_WTSSESSION_CHANGE => {
            match w_param as usize {
                WTS_SESSION_LOCK => {
                    println!("O sistema foi bloqueado.");
                    unsafe {
                        SESSION_UNLOCK = false;
                    }
                }
                WTS_SESSION_UNLOCK => {
                    println!("O sistema foi desbloqueado.");
                    unsafe {
                        SESSION_UNLOCK = true;
                    }                    
                }
                _ => {}
            }
            0
        }
        _ => DefWindowProcW(hwnd, msg, w_param, l_param),
    }
}

fn thread_get_messagens(){
    unsafe {
        let h_instance = GetModuleHandleW(null_mut());
        let class_name = wide_string("my_window_class");

        let wnd_class = WNDCLASSW {
            style: 0,
            lpfnWndProc: Some(wnd_proc),
            hInstance: h_instance,
            lpszClassName: class_name.as_ptr(),
            ..zeroed()
        };

        RegisterClassW(&wnd_class);

        let hwnd = CreateWindowExW(
            0,
            class_name.as_ptr(),
            wide_string("Session Monitor").as_ptr(),
            WS_OVERLAPPEDWINDOW,
            0,
            0,
            300,
            200,
            null_mut(),
            null_mut(),
            h_instance,
            null_mut(),
        );

        // Registra para receber notificações de sessão
        WTSRegisterSessionNotification(hwnd, 0);

        let mut msg: MSG = zeroed();

        while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        WTSUnRegisterSessionNotification(hwnd);
    }
}

fn wide_string(s: &str) -> Vec<u16> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

fn atualizar(app_handle: tauri::AppHandle) {
    let mut sleep_duration:u64 = 60;
    let receie_reminders: bool;
    unsafe {
        receie_reminders = RECEIVE_REMINDERS;
    }
    let is_user_logado :bool = is_user_logado();
    if receie_reminders && is_user_logado {
        let agora = Local::now();
        let reminders_interval: u32;
        let last_reminder:DateTime<Local>;
        unsafe {
            reminders_interval = REMINDERS_INTERVAL;
            last_reminder =  DateTime::from_timestamp(LAST_REMINDER_TIMESTAMP, 0).unwrap().into();
        }
        if agora.minute() % reminders_interval == 0  && last_reminder.minute() != agora.minute(){
            update_last_register(app_handle.clone(),false);
            unsafe {
                LAST_REMINDER_TIMESTAMP = agora.timestamp();
            }
        }
        if agora.second() != 0 {
            sleep_duration = 1;
        }
    }

    if is_user_logado {
        let last_reminder:DateTime<Local>;
        unsafe {
            last_reminder = DateTime::from_timestamp(LAST_REMINDER_TIMESTAMP, 0).unwrap().into();
        }
        let agora = Local::now();
        if last_reminder.day() != agora.day() {
            println!("ABRINDO DIALOG NOVAMENTE LAST DAY:{} AGORA:{}",last_reminder.day(), agora.day());
            show_dialog_start_reminders(app_handle.clone());
            show_dialog_check_update(app_handle.clone());
            unsafe {
                LAST_REMINDER_TIMESTAMP = agora.timestamp();
            }
        }

        if agora.minute() % 10 == 0 {
            sincronizar_registros(app_handle.clone());
        }

    }
    thread::sleep(time::Duration::from_secs(sleep_duration));
}

fn is_user_logado() -> bool {
    //println!("{}", std::env::var("USERNAME").unwrap());
    //std::env::var("USERNAME").is_ok()
    let mut session_unlock:bool = true;
    unsafe {
        session_unlock = SESSION_UNLOCK;
    }
    session_unlock
}

fn sincronizar_registros(app_handle: tauri::AppHandle){
    let main_window = app_handle.get_window("main").unwrap();
    main_window.emit(&"SINCRONIZAR-REGISTROS", "").unwrap();
}

fn update_last_register(app_handle: tauri::AppHandle, show_now: bool) {
    let dialog_window = app_handle.get_window("note-reminder").unwrap();
    dialog_window.center().unwrap();
    dialog_window.emit(&"atualizar-note-reminder", "").unwrap();
    if show_now {
        dialog_window.show().unwrap();
    }
}

fn show_dialog_start_reminders(app_handle: tauri::AppHandle){
    //let start_reminders = app_handle.get_window("start-reminders").unwrap();
    //start_reminders.show().unwrap();
    recriar_janela("start-reminders".to_string(), app_handle);
}

fn show_main_window(app_handle: tauri::AppHandle) {
    let main_window = app_handle.get_window("main").unwrap();
    main_window.emit(&"atualizar-dashboard", "").unwrap();
    main_window.show().unwrap();
}

fn show_dialog_change_autorun(app_handle: tauri::AppHandle) {
    let change_autorun = app_handle.get_window("change-autorun").unwrap();
    change_autorun.show().unwrap();
    //recriar_janela("change-autorun".to_string(), app_handle);
}

fn show_dialog_check_update(app_handle: tauri::AppHandle){
    recriar_janela("check-update".to_string(), app_handle);
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
    //create_db_default(app_data_path.clone()).unwrap();
    ddl::create_db_default(app_data_path.clone()).unwrap();

    unsafe {
        LAST_REMINDER_TIMESTAMP = Local::now().timestamp();
    }

    let options_item_1 = CustomMenuItem::new(
        "enable_autostart",
        "Ativar/Desativar Inicialização automática",
    );

    let options_item_2 = CustomMenuItem::new(
        "enable_reminders",
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
                    update_last_register(app.app_handle(), true);
                }
                "enable_autostart" => {
                    show_dialog_change_autorun(app.app_handle());
                }
                "enable_reminders" => {
                    show_dialog_start_reminders(app.app_handle());
                }
                "logout" => {
                    logout_orbit(app.app_handle());
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
            thread::spawn(move || loop {
                thread_get_messagens();
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
            select_days_with_warning,
            get_version,
            executar_script_powershell_update,
            get_total_horas_dia,
            get_total_horas_normal_dia,
            select_last_registro
        ])
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_log::Builder::default().targets([
            //LogTarget::LogDir,
            LogTarget::Stdout,
            //LogTarget::Webview,
        ]).build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

        println!("END MAIN");
}

fn recriar_janela(windows_label: String, app_handle: tauri::AppHandle) {
    // Obtém as configurações do arquivo tauri.config.json
    let config = app_handle.config().clone();

    // Identifica as configurações da janela
    let window_config = config.tauri.windows.iter().find(|w| w.label == windows_label).unwrap();

    // Recria a janela com as configurações definidas no arquivo tauri.config.json
    let window_builder = WindowBuilder::new(
        &app_handle,
    window_config.label.clone(), // Nome da janela
    window_config.url.clone() // URL da janela
    )
    .title(&window_config.title) // Título da janela
    .inner_size(window_config.width, window_config.height)
    .visible(window_config.visible)
    .maximizable(window_config.maximizable)
    .minimizable(window_config.minimizable)
    .closable(window_config.closable)
    .resizable(window_config.resizable)
    .always_on_top(window_config.always_on_top)
    .center()
    .build()
    .unwrap();

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