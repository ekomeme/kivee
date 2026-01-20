# 🚀 Kivee - Deployment Guide

Esta guía te ayudará a configurar y desplegar tu aplicación en dos entornos separados: **Staging** y **Production**.

## 📋 Prerequisitos

1. Tener dos proyectos de Firebase creados:
   - **Staging**: `kivee-f4c53` (tu proyecto actual - ya existe)
   - **Production**: Un nuevo proyecto para usuarios reales (por crear)

---

## 🔧 Paso 1: Crear el Proyecto de Production en Firebase

### 1.1. Crear nuevo proyecto
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Click en "Añadir proyecto" o "Create a project"
3. Nombre sugerido: `kivee-production` o similar
4. Sigue los pasos del asistente (puedes habilitar Google Analytics para production)

### 1.2. Habilitar servicios necesarios

En tu nuevo proyecto de production, habilita:

**Authentication:**
1. Ve a Authentication > Sign-in method
2. Habilita Email/Password

**Firestore:**
1. Ve a Firestore Database
2. Click "Create database"
3. Selecciona modo "production" (aunque sea staging, las reglas las manejarás tú)
4. Elige la ubicación más cercana a tus usuarios

**Storage:**
1. Ve a Storage
2. Click "Get started"
3. Acepta las reglas de seguridad por defecto (las actualizarás después)

### 1.3. Obtener credenciales del proyecto

1. Ve a **Project Settings** (⚙️ icono arriba a la izquierda)
2. En la sección "Your apps", haz click en el ícono web `</>`
3. Registra tu app (puedes llamarla "Kivee Production Web")
4. Copia las credenciales del `firebaseConfig`

---

## 🔑 Paso 2: Configurar Variables de Entorno

### 2.1. Archivo `.env.staging`

✅ **Ya está configurado** con las credenciales de tu proyecto actual `kivee-f4c53`.

Si necesitas verificarlo o modificarlo:

\`\`\`bash
VITE_FIREBASE_API_KEY=AIzaSyAGoz6kfcuCWv0DbrHzLZabowjyRDonJyY
VITE_FIREBASE_AUTH_DOMAIN=kivee-f4c53.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kivee-f4c53
VITE_FIREBASE_STORAGE_BUCKET=kivee-f4c53.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=633042954006
VITE_FIREBASE_APP_ID=1:633042954006:web:818ab675ff70fe6e671237
VITE_FIREBASE_MEASUREMENT_ID=G-M1DRE4B57F

VITE_ENV=staging
\`\`\`

### 2.2. Archivo `.env.production`

Abre el archivo `.env.production` y reemplaza con las credenciales de tu **nuevo proyecto de production** (el que crearás en el Paso 1):

\`\`\`bash
VITE_FIREBASE_API_KEY=tu_production_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto-production.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto-production-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto-production.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_production_sender_id
VITE_FIREBASE_APP_ID=tu_production_app_id
VITE_FIREBASE_MEASUREMENT_ID=tu_production_measurement_id

VITE_ENV=production
\`\`\`

### 2.3. Archivo `.env.local` (Desarrollo)

✅ **Ya está configurado** con las credenciales de `kivee-f4c53` (staging).

Por defecto, `npm run dev` usa `.env.local`, que apunta a tu proyecto de staging. Esto es perfecto para desarrollo local.

---

## 🔥 Paso 3: Configurar Firebase CLI

### 3.1. Agregar el proyecto de production a Firebase CLI

\`\`\`bash
# Agrega tu nuevo proyecto de production
firebase use --add
\`\`\`

Cuando te pregunte:
1. Selecciona tu **nuevo proyecto de production** de la lista
2. Cuando pregunte por un alias, escribe: `production`

### 3.2. Actualizar `.firebaserc`

Tu archivo `.firebaserc` debería verse así:

\`\`\`json
{
  "projects": {
    "default": "kivee-f4c53",
    "production": "tu-proyecto-production-id"
  },
  "targets": {
    "kivee-f4c53": {
      "hosting": {
        "staging": ["kivee-f4c53"]
      }
    },
    "tu-proyecto-production-id": {
      "hosting": {
        "prod": ["tu-proyecto-production-id"]
      }
    }
  }
}
\`\`\`

---

## 🛠️ Paso 4: Deployar Firestore Rules y Storage Rules

### 4.1. Deployar rules a Staging

\`\`\`bash
# El proyecto default ya es staging (kivee-f4c53)
firebase use default

# Deployar reglas de Firestore
firebase deploy --only firestore:rules

# Deployar reglas de Storage
firebase deploy --only storage
\`\`\`

### 4.2. Deployar rules a Production

\`\`\`bash
# Cambiar al proyecto de production
firebase use production

# Deployar reglas de Firestore
firebase deploy --only firestore:rules

# Deployar reglas de Storage
firebase deploy --only storage
\`\`\`

---

## 🚀 Comandos de Deployment

### Desarrollo Local

\`\`\`bash
# Desarrollo con variables de .env.local
npm run dev

# Desarrollo con variables de staging
npm run dev:staging

# Desarrollo con variables de production (cuidado!)
npm run dev:production
\`\`\`

### Build

\`\`\`bash
# Build para staging
npm run build:staging

# Build para production
npm run build:production
\`\`\`

### Deploy

\`\`\`bash
# Deploy a staging (hace build automáticamente)
npm run deploy:staging

# Deploy a production (hace build automáticamente)
npm run deploy:production
\`\`\`

---

## ✅ Verificación

### Staging
1. Después de deployar a staging, visita: `https://kivee-f4c53.web.app`
2. Verifica que puedas crear una cuenta
3. Verifica que los datos se guarden en Firestore de **staging** (kivee-f4c53)

### Production
1. Después de deployar a production, visita: `https://tu-proyecto-production.web.app`
2. Asegúrate de que todo funcione correctamente
3. Los datos deberían guardarse en Firestore de **production** (tu nuevo proyecto)

---

## 🔐 Seguridad

**IMPORTANTE:**
- ❌ **NUNCA** commitees los archivos `.env.staging` y `.env.production` a Git
- ✅ Estos archivos están en `.gitignore` para proteger tus credenciales
- ✅ Cada miembro del equipo debe tener su propia copia local de estos archivos
- ✅ Usa un gestor de secretos compartidos (1Password, LastPass, etc.) para compartir credenciales de forma segura

---

## 📝 Workflow Recomendado

1. **Desarrollo:**
   - Trabaja localmente con `npm run dev` (usa staging)
   - Haz cambios y prueba

2. **Staging:**
   - Deploy a staging: `npm run deploy:staging`
   - Prueba exhaustivamente en staging
   - Comparte el link de staging con el equipo para testing

3. **Production:**
   - Una vez que staging está aprobado
   - Deploy a production: `npm run deploy:production`
   - Monitorea que todo funcione correctamente

---

## 🆘 Troubleshooting

### Error: "Permission denied" al deployar
\`\`\`bash
# Vuelve a autenticarte
firebase login --reauth
\`\`\`

### Error: "Project not found"
\`\`\`bash
# Lista tus proyectos
firebase projects:list

# Cambia al proyecto correcto
firebase use staging  # o 'default' para production
\`\`\`

### Las variables de entorno no se cargan
- Asegúrate de usar el comando correcto (`dev:staging` o `dev:production`)
- Vite solo reconoce variables que empiezan con `VITE_`
- Reinicia el servidor de desarrollo después de cambiar variables

---

## 📚 Recursos Adicionales

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firebase Projects](https://firebase.google.com/docs/projects/learn-more)

---

¡Listo! Ahora tienes dos entornos completamente separados 🎉
