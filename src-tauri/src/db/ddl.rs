use rusqlite::Result;
use std::path::PathBuf;
use super::connection;

pub fn create_db_default(mut app_data_path: PathBuf) -> Result<()> {

    app_data_path.push("task_register_local.db");
    connection::set_db_name(app_data_path.into_os_string().into_string().unwrap());

    let conn = connection::open_db_connection();
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
        ('AUTO.SYNC.ORBIT', 'true', ''),
        ('USER.ORBIT.EMAIL', '', ''),
        ('USER.ORBIT.PASSWORD', '', ''),
        ('INTEGRATE.ORBIT','true',''),
        ('AUTORUN.APPLICATION','true','');",
        (),
    )?;

    conn.execute(
        "UPDATE configuracoes SET default_value = 'true' WHERE identifier = 'AUTO.SYNC.ORBIT';",
        (),
    )?;
    conn.close().unwrap();
    Ok(())
}