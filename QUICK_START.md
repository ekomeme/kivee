# ⚡ Quick Start - Dual Environment Setup

## 🎯 TL;DR - Lo que necesitas hacer

### 1. Crear proyecto de Production en Firebase Console
```
Nombre: kivee-production (o similar)
```

### 2. Copiar credenciales
Obtener credenciales de Firebase para production y completar `.env.production`

### 3. Comandos importantes

```bash
# DESARROLLO LOCAL (usa staging por defecto)
npm run dev

# BUILD
npm run build:staging      # Para staging
npm run build:production   # Para production

# DEPLOY
npm run deploy:staging     # Deploya a staging
npm run deploy:production  # Deploya a production
```

## 📁 Archivos Creados

- ✅ `.env.staging` - Variables de staging (kivee-f4c53 - ya configurado)
- ✅ `.env.production` - Variables de production (por completar)
- ✅ `package.json` - Scripts actualizados
- ✅ `.gitignore` - Protege tus credenciales
- ✅ `DEPLOYMENT_GUIDE.md` - Guía completa paso a paso

## 🔑 Próximos Pasos

1. **Crear proyecto Firebase Production** en https://console.firebase.google.com/
2. **Copiar credenciales** del nuevo proyecto a `.env.production`
3. **Configurar Firebase CLI:**
   ```bash
   firebase use --add
   # Selecciona production project, alias: "production"
   ```
4. **Deploy Firestore rules a production:**
   ```bash
   firebase use production
   firebase deploy --only firestore:rules
   firebase deploy --only storage
   ```
5. **¡Listo!** Ahora puedes usar `npm run deploy:production`

## ℹ️ Estado Actual

- **Staging**: `kivee-f4c53` (tu proyecto actual) - ✅ Configurado
- **Production**: Por crear - ⏳ Pendiente

---

**Lee [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) para instrucciones detalladas.**
