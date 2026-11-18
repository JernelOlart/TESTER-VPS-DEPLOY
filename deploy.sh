#!/bin/bash
set -e

echo "=================================================="
echo "   🚀 Desplegando VPS Tester Suite en tu Servidor"
echo "=================================================="

# 1. Comprobar Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️ Docker no está instalado en este sistema."
    echo "Instalando Docker automáticamente..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER || true
    echo "✔ Docker instalado correctamente."
else
    echo "✔ Docker detectado: $(docker --version)"
fi

# 2. Comprobar Docker Compose
if ! docker compose version &> /dev/null; then
    echo "⚠️ 'docker compose' plugin no encontrado, comprobando docker-compose clásico..."
    if ! command -v docker-compose &> /dev/null; then
        echo "Instalando Docker Compose..."
        sudo apt-get update && sudo apt-get install -y docker-compose-plugin || sudo apt-get install -y docker-compose
    fi
fi

# 3. Preparar directorios de volúmenes persistentes
echo "📂 Verificando directorios de volúmenes persistentes..."
mkdir -p data storage
chmod 777 data storage

# 4. Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "⚙️ Creando archivo de configuración .env inicial..."
    cp .env.example .env
fi

# 5. Levantar contenedores
echo "🐳 Construyendo e iniciando contenedores con Docker Compose..."
if docker compose version &> /dev/null; then
    docker compose up -d --build
else
    docker-compose up -d --build
fi

echo ""
echo "=================================================="
echo "   ✅ ¡Despliegue completado con éxito!"
echo "=================================================="
echo ""
PUBLIC_IP=$(curl -s https://api.ipify.org || echo "IP_DE_TU_VPS")
echo "🌐 Puedes acceder a la interfaz web en:"
echo "   👉 http://${PUBLIC_IP}:8000"
echo "   👉 http://localhost:8000 (si accedes localmente)"
echo ""
echo "Comandos útiles:"
echo " - Ver logs:             docker compose logs -f"
echo " - Detener aplicación:   docker compose down"
echo " - Reiniciar:            docker compose restart"
echo "=================================================="
