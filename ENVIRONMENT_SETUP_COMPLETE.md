# ✅ Configuración de Entornos - Completada

## 📊 Resumen de la Configuración

Tu proyecto ahora está configurado para trabajar con dos entornos separados:

### 🟢 Staging (kivee-f4c53)
- **Estado**: ✅ Completamente configurado
- **Proyecto Firebase**: `kivee-f4c53` (tu proyecto actual)
- **Archivo de configuración**: `.env.staging`
- **Uso**: Desarrollo local y pruebas
- **URL de hosting**: `https://kivee-f4c53.web.app`

### 🔴 Production
- **Estado**: ⏳ Pendiente de crear
- **Proyecto Firebase**: Por crear en Firebase Console
- **Archivo de configuración**: `.env.production` (template creado, falta completar)
- **Uso**: Usuarios reales
- **URL de hosting**: Por determinar (depende del nombre del proyecto)

---

## 🎯 Lo que se ha configurado

### 1. Variables de Entorno

✅ **`.env.staging`** - Configurado con credenciales de `kivee-f4c53`
```bash
VITE_FIREBASE_PROJECT_ID=kivee-f4c53
VITE_ENV=staging
```

⏳ **`.env.production`** - Template creado, listo para completar con las credenciales del nuevo proyecto

✅ **`.env.local`** - Ya existía, apunta a `kivee-f4c53` (staging)

### 2. Scripts de NPM

Agregados en `package.json`:

```bash
# Desarrollo
npm run dev              # Usa .env.local (staging)
npm run dev:staging      # Usa .env.staging
npm run dev:production   # Usa .env.production

# Build
npm run build:staging      # Build para staging
npm run build:production   # Build para production

# Deploy
npm run deploy:staging     # Build + Deploy a staging
npm run deploy:production  # Build + Deploy a production
```

### 3. Seguridad

✅ `.gitignore` actualizado para proteger:
- `.env.staging`
- `.env.production`
- `.env.local`

### 4. Documentación

✅ **DEPLOYMENT_GUIDE.md** - Guía completa paso a paso
✅ **QUICK_START.md** - Referencia rápida
✅ **setup-env.sh** - Script interactivo para configurar credenciales

---

## 🚀 Próximos Pasos

Para completar la configuración de production, sigue estos pasos:

### 1. Crear Proyecto de Production

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Click en "Añadir proyecto"
3. Nombre sugerido: `kivee-production`
4. Habilita:
   - **Authentication** (Email/Password)
   - **Firestore Database**
   - **Storage**

### 2. Obtener Credenciales

1. Ve a **Project Settings** (⚙️)
2. En "Your apps", click en el ícono web `</>`
3. Registra tu app: "Kivee Production Web"
4. Copia las credenciales del `firebaseConfig`

### 3. Configurar `.env.production`

Abre [.env.production](.env.production) y reemplaza con las credenciales del paso anterior.

### 4. Configurar Firebase CLI

```bash
# Agrega el proyecto de production
firebase use --add
# Selecciona tu nuevo proyecto de production
# Cuando pregunte por alias, escribe: "production"
```

### 5. Deploy Rules a Production

```bash
firebase use production
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### 6. ¡Listo para Deployar!

```bash
npm run deploy:production
```

---

## 📝 Workflow Recomendado

1. **Desarrollo Local**
   ```bash
   npm run dev
   ```
   Usa staging automáticamente (`.env.local`)

2. **Probar en Staging**
   ```bash
   npm run deploy:staging
   ```
   Deploya a `kivee-f4c53` para pruebas

3. **Release a Production**
   ```bash
   npm run deploy:production
   ```
   Deploya al nuevo proyecto de production para usuarios reales

---

## 🔍 Verificación

### ¿Cómo saber en qué entorno estoy?

Abre la consola del navegador en modo desarrollo:

```
🔥 Firebase initialized in STAGING mode
📦 Project ID: kivee-f4c53
```

o

```
🔥 Firebase initialized in PRODUCTION mode
📦 Project ID: tu-proyecto-production-id
```

Esto solo aparece en modo desarrollo (`npm run dev`), no en builds de producción.

---

## 📚 Documentación Adicional

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Guía completa
- [QUICK_START.md](./QUICK_START.md) - Referencia rápida

---

## 🆘 ¿Necesitas ayuda?

Si tienes problemas:

1. Revisa [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) sección "Troubleshooting"
2. Verifica que las variables de entorno estén bien configuradas
3. Asegúrate de estar usando el proyecto correcto: `firebase use --list`

---

**¡Todo listo para comenzar a trabajar con staging y production! 🎉**
