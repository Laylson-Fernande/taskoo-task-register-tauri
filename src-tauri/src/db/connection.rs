use rusqlite::Connection;

static mut DB_NAME: String = String::new();

pub fn set_db_name(db_name: String) {
    unsafe {
        DB_NAME = db_name;
    }
}

pub fn get_db_name() -> String {
    let db_name:String;
    unsafe {
        db_name = DB_NAME.clone();
    }
    return db_name;
}

pub fn open_db_connection() -> Connection {
    let db_name = get_db_name();
    Connection::open(db_name).unwrap_or_else(|e| {
        eprintln!("Failed to open the database connection: {}", e);
        std::process::exit(1);
    })
}