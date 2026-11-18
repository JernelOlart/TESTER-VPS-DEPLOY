import os
import sqlite3
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_DIR = os.getenv("DATA_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data"))
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.getenv("DATABASE_PATH", os.path.join(DB_DIR, "app.db"))

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            category TEXT DEFAULT 'general',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS test_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_type TEXT NOT NULL,
            status TEXT NOT NULL,
            details TEXT,
            duration_ms REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()

def get_db_stats() -> Dict[str, Any]:
    file_size_bytes = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM items")
    items_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM test_logs")
    logs_count = cursor.fetchone()[0]
    cursor.execute("PRAGMA journal_mode;")
    journal_mode = cursor.fetchone()[0]
    conn.close()

    return {
        "db_path": DB_PATH,
        "db_size_bytes": file_size_bytes,
        "db_size_kb": round(file_size_bytes / 1024, 2),
        "total_items": items_count,
        "total_test_logs": logs_count,
        "sqlite_version": sqlite3.sqlite_version,
        "journal_mode": journal_mode
    }

def list_items() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, content, category, created_at FROM items ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_item(title: str, content: str, category: str = "general") -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO items (title, content, category) VALUES (?, ?, ?)",
        (title, content, category)
    )
    conn.commit()
    item_id = cursor.lastrowid
    conn.close()
    return {"id": item_id, "title": title, "content": content, "category": category}

def delete_item(item_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def clear_all_items() -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM items")
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count

def run_db_benchmark(batch_size: int = 500) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Benchmark Insert
    start_insert = time.perf_counter()
    sample_records = [
        (f"Registro de Test #{i}", f"Contenido generado automáticamente para prueba de velocidad {i}", "benchmark")
        for i in range(batch_size)
    ]
    cursor.executemany("INSERT INTO items (title, content, category) VALUES (?, ?, ?)", sample_records)
    conn.commit()
    insert_duration = (time.perf_counter() - start_insert) * 1000  # in ms
    
    # 2. Benchmark Query / Read
    start_read = time.perf_counter()
    cursor.execute("SELECT COUNT(*), AVG(LENGTH(content)) FROM items WHERE category = 'benchmark'")
    read_result = cursor.fetchone()
    read_duration = (time.perf_counter() - start_read) * 1000  # in ms
    
    # 3. Clean up benchmark items
    start_cleanup = time.perf_counter()
    cursor.execute("DELETE FROM items WHERE category = 'benchmark'")
    conn.commit()
    cleanup_duration = (time.perf_counter() - start_cleanup) * 1000
    
    total_duration = insert_duration + read_duration + cleanup_duration
    
    # Log the benchmark
    cursor.execute(
        "INSERT INTO test_logs (test_type, status, details, duration_ms) VALUES (?, ?, ?, ?)",
        ("DB_BENCHMARK", "SUCCESS", f"Lote de {batch_size} registros insertados, leídos y limpiados.", round(total_duration, 2))
    )
    conn.commit()
    conn.close()
    
    return {
        "batch_size": batch_size,
        "insert_ms": round(insert_duration, 2),
        "read_ms": round(read_duration, 2),
        "cleanup_ms": round(cleanup_duration, 2),
        "total_ms": round(total_duration, 2),
        "inserts_per_second": round(batch_size / (insert_duration / 1000), 2) if insert_duration > 0 else 0
    }
