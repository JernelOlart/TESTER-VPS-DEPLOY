# 🚀 VPS Tester Suite

Una solución completa y lista para desplegar en cualquier **VPS (Servidor Privado Virtual)** con un solo comando. Diseñada para probar de forma visual e interactiva el rendimiento, almacenamiento, base de datos y conectividad de tu servidor.

---

## 📦 ¿Qué incluye este proyecto?

1. **📁 Volumen de Almacenamiento Persistente (`/app/storage`):**
   - Montado a través de volúmenes de Docker para garantizar que los datos sobrevivan al reiniciar el contenedor.
   - Gestor de archivos integrado en la interfaz (subida por *drag & drop*, descarga y eliminación).
   - Indicador de espacio ocupado vs libre en disco.

2. **🗄️ Base de Datos Integrada y Persistente (`/app/data/app.db`):**
   - SQLite 3 con modo **WAL (Write-Ahead Logging)** para alto rendimiento sin consumir memoria excesiva (ideal para VPS pequeños de 512MB/1GB RAM).
   - Formulario interactivo para crear registros, listar datos y vaciar tablas.
   - Guardada en un volumen dedicado persistente.

3. **💻 Interfaz de Usuario Moderna y Responsiva:**
   - Construida con Tailwind CSS, Lucide Icons y tema oscuro profesional.
   - Dashboard en tiempo real con monitores de uso de CPU, Memoria RAM y Estado de los discos.
   - Navegación fluida por pestañas sin recargar la página.

4. **🧪 Menú Completo de Tests:**
   - **Test 1 - Benchmark de Base de Datos:** Inserta 500 registros en lote, mide latencias y operaciones por segundo.
   - **Test 2 - Rendimiento de Disco I/O:** Escribe 25 MB en el volumen de almacenamiento montado con sincronización `fsync`, mide lectura/escritura en MB/s.
   - **Test 3 - Red y Conectividad:** Comprueba resolución DNS, latencia HTTP saliente y detecta la **IP pública real** de tu VPS.
   - **Test 4 - Esfuerzo de CPU:** Evalúa la potencia de cálculo del procesador ejecutando operaciones matemáticas intensivas.
   - Consola integrada con registro de eventos y tiempos de respuesta.

5. **ℹ️ Menú de Información del VPS:**
   - Hostname, Sistema Operativo, Kernel, Arquitectura (x86_64 / arm64).
   - Núcleos físicos y lógicos de CPU.
   - Memoria RAM total, usada y disponible.
   - Puntos de montaje y particiones (Volumen de almacenamiento vs Disco raíz `/`).
   - Uptime en vivo del VPS y del contenedor.

---

## ⚡ Despliegue Rápido en tu VPS

### Opción 1: Con el script automático (Recomendado)

Sube esta carpeta a tu servidor o clónala vía git y ejecuta:

```bash
chmod +x deploy.sh
./deploy.sh
```

El script verificará si tienes Docker y Docker Compose instalados (los instalará si no están presentes), preparará los permisos de los volúmenes y levantará la aplicación.

---

### Opción 2: Con Docker Compose manual

```bash
# 1. Crear los directorios de los volúmenes
mkdir -p data storage

# 2. Levantar la aplicación en segundo plano
docker compose up -d --build
```

---

## 🌐 Acceso a la Interfaz

Una vez levantada, abre tu navegador web en:

```
http://<IP_DE_TU_VPS>:8000
```

*(Si deseas usar el puerto estándar **80**, edita el archivo `.env` o `docker-compose.yml` y cambia `8000:8000` por `80:8000`)*.

---

## 🛠️ Comandos Útiles en el Servidor

| Acción | Comando |
|---|---|
| **Ver logs en tiempo real** | `docker compose logs -f` |
| **Reiniciar la aplicación** | `docker compose restart` |
| **Detener la aplicación** | `docker compose down` |
| **Reconstruir cambios** | `docker compose up -d --build` |
| **Comprobar contenedores activos** | `docker ps` |

---

## 📂 Estructura del Proyecto

```text
.
├── Dockerfile              # Imagen ligera Python 3.11-slim
├── docker-compose.yml      # Definición del servicio y volúmenes montados
├── deploy.sh               # Script de instalación y arranque automático
├── requirements.txt        # Dependencias (FastAPI, uvicorn, psutil, etc.)
├── .env.example            # Plantilla de variables de entorno
├── app/
│   ├── main.py             # Servidor API FastAPI y endpoints de tests
│   ├── database.py         # Configuración y consultas SQLite WAL
│   ├── templates/
│   │   └── index.html      # Interfaz de usuario completa con Tailwind
│   └── static/
│       └── app.js          # Lógica cliente, tests en vivo y métricas
├── data/                   # Volumen montado para la base de datos
└── storage/                # Volumen montado para archivos y pruebas I/O
```

---

## 🔒 Firewall (UFW) en Ubuntu/Debian

Si tienes activado el firewall en tu VPS, asegúrate de habilitar el puerto:

```bash
sudo ufw allow 8000/tcp
# O si usas el puerto 80:
sudo ufw allow 80/tcp
```
