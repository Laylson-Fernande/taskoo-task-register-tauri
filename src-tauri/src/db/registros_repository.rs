
use serde::{Serialize,Deserialize };
use super::connection;

#[derive(Debug, Serialize, Deserialize)]
pub struct Registro {
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
pub struct ResumoDia {
    total_horas_dia:String
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DayWithWarning {
    day_warning:String,
    status:String
}

pub fn insert_registro(registro: Registro) -> Result<usize, String> {
    let conn = connection::open_db_connection();
    conn.execute(
        "INSERT INTO registros (orbit_id, contract_id, hour_type, start_at, end_at, description, release_date, status, mensagem, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime(CURRENT_TIMESTAMP, '-03:00'), datetime(CURRENT_TIMESTAMP, '-03:00'))",
        [registro.orbit_id, registro.contract_id, registro.hour_type, registro.start_at, registro.end_at, registro.description, registro.release_date, registro.status, registro.mensagem],
    )
    .map_err(|e| e.to_string())
}

pub fn update_registro(id: i64, registro: Registro) -> Result<(), String> {
    let conn = connection::open_db_connection();
    conn.execute(
        "UPDATE registros SET orbit_id = ?1, contract_id = ?2, hour_type = ?3, start_at = ?4, end_at = ?5, description = ?6, release_date = ?7, status = ?8, mensagem = ?9, updated_at = datetime(CURRENT_TIMESTAMP, '-03:00') WHERE id = ?10",
        [registro.orbit_id, registro.contract_id, registro.hour_type, registro.start_at, registro.end_at, registro.description, registro.release_date, registro.status, registro.mensagem, id.to_string()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_registro(id: i64) -> Result<(), String> {
    let conn = connection::open_db_connection();
    conn.execute("DELETE FROM registros WHERE id = ?", [id.to_string()])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn select_registros(release_date: String) -> Result<Vec<Registro>, String> {
    let conn = connection::open_db_connection();
    let mut stmt = conn.prepare("SELECT id,orbit_id, contract_id, hour_type, start_at, end_at, description, release_date, status, mensagem, created_at, updated_at FROM registros WHERE release_date = ? ORDER BY start_at")
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

pub fn select_ifexist_registro(registro: Registro) -> Result<Vec<Registro>, String> {
    let conn = connection::open_db_connection();
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

pub fn select_last_registro(release_date: String) -> Result<Vec<Registro>, String> {
    let conn = connection::open_db_connection();
    let mut stmt = conn.prepare(
        "SELECt id,orbit_id, contract_id, hour_type, start_at, end_at, description, release_date, status, mensagem, created_at, updated_at 
        FROM REGISTROS WHERE release_date = ? order by start_at DESC LIMIT 1")
        .map_err(|e| e.to_string())?;
    let registros_iter = stmt
        .query_map(
            [release_date
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

pub fn get_total_horas_dia(release_date: String) -> Result<Vec<ResumoDia>, String> {
    let conn = connection::open_db_connection();
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

pub fn get_total_horas_normal_dia(release_date: String,  ignored_id: String) -> Result<Vec<ResumoDia>, String> {
    let conn = connection::open_db_connection();
    let mut stmt = conn.prepare("SELECT printf('%02d:%02d', SUM(difference_in_seconds) / 3600, (SUM(difference_in_seconds) % 3600) / 60) AS total_dia FROM
(SELECT strftime('%s', end_at) - strftime('%s', start_at) AS difference_in_seconds FROM registros WHERE release_date = ? AND hour_type = 'NORMAL' AND id <> ?)")
        .map_err(|e| e.to_string())?;
    let result_iter = stmt
        .query_map([release_date, ignored_id], |row| {
            Ok(ResumoDia{ total_horas_dia: row.get(0)?})
        })
        .map_err(|e| e.to_string())?;

    let result: Vec<ResumoDia> = result_iter.map(|r| r.unwrap()).collect();
    Ok(result)
}

pub fn select_days_with_warning() -> Result<Vec<DayWithWarning>, String> {
    let conn = connection::open_db_connection();
    let mut stmt = conn.prepare("SELECT DISTINCT r.release_date, 
(SELECT (CASE WHEN COUNT(*) >= 1 THEN 'ERROR' ELSE r.status END) FROM registros e WHERE r.release_date = e.release_date AND status = 'ERROR') STATUS
FROM registros r WHERE r.status <> 'SYNCED'")
        .map_err(|e| e.to_string())?;
    let result_iter = stmt
        .query_map([], |row| {
            Ok(DayWithWarning{ day_warning: row.get(0)?, status: row.get(1)?})
        })
        .map_err(|e| e.to_string())?;

    let result: Vec<DayWithWarning> = result_iter.map(|r| r.unwrap()).collect();
    Ok(result)
}