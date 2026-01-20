# 📋 Resumen de Configuración - Entornos Staging y Production

## ✅ Lo que se ha configurado automáticamente

### Archivos Creados:

1. **`.env.staging`** - Variables para entorno de staging
2. **`.env.production`** - Variables para entorno de production
3. **`.gitignore`** - Actualizado para proteger credenciales
4. **`package.json`** - Scripts nuevos agregados
5. **`setup-env.sh`** - Script helper para configuración
6. **Documentación:**
   - `DEPLOYMENT_GUIDE.md` - Guía completa paso a paso
   - `QUICK_START.md` - Referencia rápida

### Scripts Disponibles:

```json
{
  "dev": "vite --host",                          // Desarrollo local (usa .env.local)
  "dev:staging": "vite --host --mode staging",   // Dev con vars de staging
  "dev:production": "vite --host --mode production", // Dev con vars de production

  "build:staging": "tsc -b && vite build --mode staging",     // Build staging
  "build:production": "tsc -b && vite build --mode production", // Build production

  "deploy:staging": "npm run build:staging && firebase deploy --only hosting:staging",     // Deploy completo a staging
  "deploy:production": "npm run build:production && firebase deploy --only hosting:prod"  // Deploy completo a production
}
```

---

## 🚀 Pasos que TIENES que completar

### 1. Crear Proyecto Firebase Staging

Ve a https://console.firebase.google.com/ y crea un nuevo proyecto:
- Nombre sugerido: `kivee-staging`
- Habilita:
  - ✅ Authentication (Email/Password)
  - ✅ Firestore Database
  - ✅ Storage

### 2. Obtener Credenciales

Para cada proyecto (staging y production):

**En Firebase Console:**
1. Ve a Project Settings (⚙️)
2. Sección "Your apps"
3. Click en ícono web `</>`
4. Copia el `firebaseConfig`

### 3. Configurar Variables de Entorno

**Opción A - Usar script helper:**
```bash
./setup-env.sh
```

**Opción B - Manualmente:**
Edita `.env.staging` y `.env.production` con tus credenciales

### 4. Configurar Firebase CLI

```bash
# Agregar proyecto de staging
firebase use --add
# Selecciona tu proyecto staging, alias: "staging"

# Verificar configuración
firebase projects:list
```

### 5. Deploy Reglas de Firestore

```bash
# A Staging
firebase use staging
firebase deploy --only firestore:rules
firebase deploy --only storage

# A Production
firebase use default
firebase deploy --only firestore:rules
firebase deploy --only storage
```

---

## 🎯 Flujo de Trabajo Recomendado

```
DESARROLLO → STAGING → PRODUCTION
     ↓           ↓           ↓
npm run dev → deploy:staging → deploy:production
```

### Desarrollo Local
```bash
npm run dev              # Usa .env.local (o staging si no existe)
npm run dev:staging      # Fuerza uso de staging
```

### Testing en Staging
```bash
npm run deploy:staging   # Build + Deploy a staging
# Visita: https://tu-proyecto-staging.web.app
# Prueba todo exhaustivamente
```

### Production Release
```bash
npm run deploy:production  # Build + Deploy a production
# Visita: https://tu-proyecto-production.web.app
# Monitorea que todo funcione
```

---

## 🔐 Seguridad

**CRÍTICO - Protección de Credenciales:**

✅ **SÍ hacer:**
- Mantener `.env.staging` y `.env.production` en tu máquina local
- Usar un gestor de contraseñas para compartir credenciales con el equipo
- Verificar que estén en `.gitignore` antes de commitear

❌ **NO hacer:**
- Commitear archivos `.env.*` a Git
- Compartir credenciales por Slack/email/WhatsApp
- Usar las mismas credenciales para staging y production

---

## 📊 Estado Actual

| Entorno | Firebase Project | Estado | Siguiente Acción |
|---------|-----------------|---------|------------------|
| **Staging** | `(Por crear)` | ⚠️ Pendiente | Crear proyecto en Firebase Console |
| **Production** | `kivee-f4c53` | ✅ Existente | Copiar credenciales a `.env.production` |

---

## 🆘 Necesitas Ayuda?

1. **Guía Completa:** Lee `DEPLOYMENT_GUIDE.md`
2. **Referencia Rápida:** Consulta `QUICK_START.md`
3. **Error común:** Si las variables no cargan, reinicia el dev server

---

## ✨ Beneficios de esta configuración

✅ **Separación total** de datos entre staging y production
✅ **Testing seguro** sin afectar usuarios reales
✅ **Deploy fácil** con un solo comando
✅ **Configuración clara** mediante variables de entorno
✅ **Protección** de credenciales sensibles

---

**¡Listo para empezar! 🎉**

Ejecuta `./setup-env.sh` o lee `QUICK_START.md` para comenzar.
