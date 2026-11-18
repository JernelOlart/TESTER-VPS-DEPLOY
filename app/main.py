import os
import time
import shutil
import platform
import socket
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import psutil
import httpx

from app.database import (
    init_db,
    get_db_stats,
    list_items,
    add_item,
    delete_item,
    clear_all_items,
    run_db_benchmark,
    get_connection
)

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.getenv("STORAGE_DIR", os.path.join(os.path.dirname(BASE_DIR), "storage"))
DATA_DIR = os.getenv("DATA_DIR", os.path.join(os.path.dirname(BASE_DIR), "data"))
APP_PORT = int(os.getenv("PORT", 8000))
APP_ENV = os.getenv("APP_ENV", "testing")

os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize FastAPI
app = FastAPI(
    title="VPS Tester Suite",
    description="Herramienta completa para probar VPS: Almacenamiento, BD, UI y Tests",
    version="1.0.0"
)

# Static and Templates
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

START_TIME = time.time()

@app.on_event("startup")
def on_startup():
    init_db()

# ----------------- UI Pages -----------------

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "app_env": APP_ENV,
        "port": APP_PORT
    })

# ----------------- System Info API -----------------

@app.get("/api/system/info")
def get_system_info():
    uptime_seconds = int(time.time() - psutil.boot_time())
    app_uptime = int(time.time() - START_TIME)
    
    # Memory
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    # Disk (Storage volume)
    storage_disk = psutil.disk_usage(STORAGE_DIR)
    root_disk = psutil.disk_usage("/")
    
    # CPU
    cpu_freq = psutil.cpu_freq()
    
    return {
        "hostname": socket.gethostname(),
        "os": {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "platform": platform.platform()
        },
        "python_version": platform.python_version(),
        "uptime": {
            "system_uptime_str": str(timedelta(seconds=uptime_seconds)),
            "app_uptime_str": str(timedelta(seconds=app_uptime)),
            "boot_time": datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S")
        },
        "cpu": {
            "cores_physical": psutil.cpu_count(logical=False) or 1,
            "cores_logical": psutil.cpu_count(logical=True) or 1,
            "percent": psutil.cpu_percent(interval=None),
            "freq_current_mhz": round(cpu_freq.current, 2) if cpu_freq else None
        },
        "memory": {
            "total_gb": round(mem.total / (1024**3), 2),
            "used_gb": round(mem.used / (1024**3), 2),
            "free_gb": round(mem.available / (1024**3), 2),
            "percent": mem.percent,
            "swap_percent": swap.percent
        },
        "disks": {
            "storage_volume": {
                "path": STORAGE_DIR,
                "total_gb": round(storage_disk.total / (1024**3), 2),
                "used_gb": round(storage_disk.used / (1024**3), 2),
                "free_gb": round(storage_disk.free / (1024**3), 2),
                "percent": storage_disk.percent
            },
            "root_volume": {
                "path": "/",
                "total_gb": round(root_disk.total / (1024**3), 2),
                "used_gb": round(root_disk.used / (1024**3), 2),
                "free_gb": round(root_disk.free / (1024**3), 2),
                "percent": root_disk.percent
            }
        },
        "environment": {
            "env": APP_ENV,
            "storage_dir": STORAGE_DIR,
            "data_dir": DATA_DIR
        }
    }

# ----------------- Database APIs -----------------

@app.get("/api/db/stats")
def api_db_stats():
    return get_db_stats()

@app.get("/api/db/items")
def api_get_items():
    return list_items()

@app.post("/api/db/items")
def api_add_item(title: str = Form(...), content: str = Form(""), category: str = Form("general")):
    if not title.strip():
        raise HTTPException(status_code=400, detail="El título es obligatorio")
    created = add_item(title=title.strip(), content=content.strip(), category=category.strip())
    return created

@app.delete("/api/db/items/{item_id}")
def api_delete_item(item_id: int):
    success = delete_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Elemento no encontrado")
    return {"success": True, "deleted_id": item_id}

@app.delete("/api/db/items")
def api_clear_items():
    count = clear_all_items()
    return {"success": True, "deleted_count": count}

# ----------------- Storage Volume APIs -----------------

@app.get("/api/storage/files")
def list_storage_files():
    files = []
    try:
        for entry in os.scandir(STORAGE_DIR):
            if entry.is_file():
                stat = entry.stat()
                files.append({
                    "name": entry.name,
                    "size_bytes": stat.st_size,
                    "size_kb": round(stat.st_size / 1024, 2),
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    files.sort(key=lambda x: x["modified"], reverse=True)
    return {
        "storage_path": STORAGE_DIR,
        "total_files": len(files),
        "files": files
    }

@app.post("/api/storage/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = os.path.basename(file.filename)
    dest_path = os.path.join(STORAGE_DIR, filename)
    
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar archivo: {str(e)}")
    
    file_stat = os.stat(dest_path)
    return {
        "success": True,
        "filename": filename,
        "size_kb": round(file_stat.st_size / 1024, 2)
    }

@app.get("/api/storage/download/{filename}")
def download_file(filename: str):
    file_path = os.path.join(STORAGE_DIR, os.path.basename(filename))
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(file_path, filename=filename)

@app.delete("/api/storage/files/{filename}")
def delete_file(filename: str):
    file_path = os.path.join(STORAGE_DIR, os.path.basename(filename))
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    try:
        os.remove(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar archivo: {str(e)}")
    return {"success": True, "deleted_filename": filename}

# ----------------- Test Suite APIs -----------------

@app.post("/api/tests/db-benchmark")
def test_db_benchmark(count: int = 500):
    if count > 2000:
        count = 2000
    return run_db_benchmark(batch_size=count)

@app.post("/api/tests/disk-benchmark")
def test_disk_benchmark(size_mb: int = 25):
    if size_mb > 100:
        size_mb = 100
    
    test_file = os.path.join(STORAGE_DIR, f"temp_io_benchmark_{int(time.time())}.bin")
    chunk_size = 1024 * 1024 # 1MB
    payload = b"0" * chunk_size
    
    # Write speed
    start_write = time.perf_counter()
    with open(test_file, "wb") as f:
        for _ in range(size_mb):
            f.write(payload)
        f.flush()
        os.fsync(f.fileno())
    write_time = time.perf_counter() - start_write
    write_mb_s = round(size_mb / write_time, 2) if write_time > 0 else 0
    
    # Read speed
    start_read = time.perf_counter()
    with open(test_file, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
    read_time = time.perf_counter() - start_read
    read_mb_s = round(size_mb / read_time, 2) if read_time > 0 else 0
    
    # Clean up
    if os.path.exists(test_file):
        os.remove(test_file)
        
    return {
        "tested_mb": size_mb,
        "write_seconds": round(write_time, 3),
        "write_speed_mb_s": write_mb_s,
        "read_seconds": round(read_time, 3),
        "read_speed_mb_s": read_mb_s
    }

@app.post("/api/tests/network")
async def test_network():
    results = {}
    
    # 1. DNS Resolution Test
    start_dns = time.perf_counter()
    try:
        ip = socket.gethostbyname("cloudflare.com")
        dns_time_ms = round((time.perf_counter() - start_dns) * 1000, 2)
        results["dns"] = {"status": "OK", "resolved_ip": ip, "latency_ms": dns_time_ms}
    except Exception as e:
        results["dns"] = {"status": "FAIL", "error": str(e)}
        
    # 2. Public IP detection & outbound HTTP ping
    async with httpx.AsyncClient(timeout=5.0) as client:
        # Check Public IP
        try:
            r = await client.get("https://api.ipify.org?format=json")
            if r.status_code == 200:
                results["public_ip"] = r.json().get("ip", "Desconocida")
            else:
                results["public_ip"] = "No detectada"
        except Exception as e:
            results["public_ip"] = f"Error: {str(e)}"
            
        # Ping Cloudflare CDN
        start_ping = time.perf_counter()
        try:
            r2 = await client.get("https://1.1.1.1")
            http_latency = round((time.perf_counter() - start_ping) * 1000, 2)
            results["outbound_http"] = {
                "target": "https://1.1.1.1",
                "status_code": r2.status_code,
                "latency_ms": http_latency
            }
        except Exception as e:
            results["outbound_http"] = {"target": "https://1.1.1.1", "status": "FAIL", "error": str(e)}
            
    return results

@app.post("/api/tests/cpu-load")
def test_cpu_load(seconds: int = 3):
    """Prueba rápida de estrés matemático para verificar la respuesta del procesador"""
    if seconds > 10:
        seconds = 10
    start = time.perf_counter()
    count = 0
    while time.perf_counter() - start < seconds:
        _ = [x ** 2 for x in range(1000)]
        count += 1
    duration = time.perf_counter() - start
    iterations_per_sec = round(count / duration, 2)
    return {
        "duration_seconds": round(duration, 2),
        "iterations_completed": count,
        "iterations_per_second": iterations_per_sec,
        "status": "Completado con éxito"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=APP_PORT, reload=True)
