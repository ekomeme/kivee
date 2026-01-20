#!/bin/bash

# Script para configurar variables de entorno
# Ejecuta: chmod +x setup-env.sh && ./setup-env.sh

echo "🚀 Kivee - Environment Setup Helper"
echo ""
echo "Este script te ayudará a configurar tus variables de entorno."
echo ""

# Función para solicitar credenciales
ask_firebase_config() {
    local env_name=$1
    local file_name=$2

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 Configurando $env_name environment"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    read -p "Firebase API Key: " api_key
    read -p "Auth Domain: " auth_domain
    read -p "Project ID: " project_id
    read -p "Storage Bucket: " storage_bucket
    read -p "Messaging Sender ID: " sender_id
    read -p "App ID: " app_id
    read -p "Measurement ID (opcional): " measurement_id

    # Crear archivo
    cat > "$file_name" <<EOF
# Firebase $env_name Environment Configuration
# This file contains the Firebase configuration for the $env_name environment
# DO NOT commit this file to version control

VITE_FIREBASE_API_KEY=$api_key
VITE_FIREBASE_AUTH_DOMAIN=$auth_domain
VITE_FIREBASE_PROJECT_ID=$project_id
VITE_FIREBASE_STORAGE_BUCKET=$storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=$sender_id
VITE_FIREBASE_APP_ID=$app_id
VITE_FIREBASE_MEASUREMENT_ID=$measurement_id

# Environment identifier
VITE_ENV=$env_name
EOF

    echo ""
    echo "✅ Archivo $file_name creado exitosamente!"
    echo ""
}

# Menú principal
echo "¿Qué entorno quieres configurar?"
echo ""
echo "1) Staging"
echo "2) Production"
echo "3) Ambos"
echo "4) Salir"
echo ""
read -p "Selecciona una opción (1-4): " option

case $option in
    1)
        ask_firebase_config "staging" ".env.staging"
        ;;
    2)
        ask_firebase_config "production" ".env.production"
        ;;
    3)
        ask_firebase_config "staging" ".env.staging"
        echo ""
        ask_firebase_config "production" ".env.production"
        ;;
    4)
        echo "👋 ¡Hasta luego!"
        exit 0
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 ¡Configuración completada!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Configura Firebase CLI:"
echo "   firebase use --add"
echo ""
echo "2. Deploy reglas de Firestore:"
echo "   firebase use staging"
echo "   firebase deploy --only firestore:rules"
echo ""
echo "3. ¡Empieza a desarrollar!"
echo "   npm run dev"
echo ""
echo "Lee DEPLOYMENT_GUIDE.md para más información."
echo ""
