import sqlite3
from config import DATABASE_PATH

def get_db():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection

def query_all(sql, params=()):
    with get_db() as db:
        return db.execute(sql, params).fetchall()
