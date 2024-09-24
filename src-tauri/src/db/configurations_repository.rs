use serde::{Serialize,Deserialize };
use super::connection;

#[derive(Debug, Serialize, Deserialize)]
pub struct Configuracao {
    id: i64,
    identifier: String,
    default_value: String,
    custom_value: String,
}

pub fn update_configuracao(configuracao: Configuracao) -> Result<(), String> {
    let conn = connection::open_db_connection();
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

pub fn reset_configuracoes(reset_user_credentials: bool) -> Result<(), String> {
    let conn = connection::open_db_connection();
    let mut sql_command = String::from(
        "UPDATE configuracoes SET custom_value = NULL WHERE custom_value IS NOT NULL ",
    );
    if !reset_user_credentials {
        sql_command.push_str("AND  identifier NOT IN ('USER.EMAIL', 'USER.PASSWORD')");
    }
    conn.execute(&sql_command, []).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn select_configuracoes() -> Result<Vec<Configuracao>, String> {
    let conn = connection::open_db_connection();
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

pub fn select_configuracao(identifier: String) -> Result<Vec<Configuracao>, String> {
    let conn = connection::open_db_connection();
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