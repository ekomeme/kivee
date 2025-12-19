# 🏗️ Nueva Arquitectura del Proyecto

```
kivee/
│
├── 📚 DOCUMENTACIÓN
│   ├── REFACTORING_SUMMARY.md     ⭐ EMPIEZA AQUÍ
│   ├── REFACTORING_GUIDE.md       📖 Guía completa de uso
│   ├── MIGRATION_EXAMPLE.md       💡 Ejemplo práctico
│   └── ARCHITECTURE.md            🏗️ Este archivo
│
├── src/
│   │
│   ├── 🎛️ CONFIG (Configuración Central)
│   │   └── constants.js           185 líneas - TODAS las constantes
│   │
│   ├── 🌐 CONTEXTS (Context API)
│   │   └── AcademyContext.jsx     238 líneas - Elimina prop drilling
│   │
│   ├── 🔧 SERVICES (Capa de Datos)
│   │   └── firestore.js           385 líneas - Queries centralizadas
│   │
│   ├── 🛠️ UTILS (Utilidades)
│   │   ├── permissions.js         184 líneas - Permisos y roles
│   │   ├── formatters.js          350 líneas - Formateo de datos
│   │   └── validators.js          (ya existía) - Validación
│   │
│   └── 🧩 COMPONENTS
│       ├── AcademySelector.jsx    120 líneas - Extraído (elimina duplicación)
│       └── UserMenu.jsx           138 líneas - Extraído (reutilizable)
│
└── Total: ~1,600 líneas de código profesional
```

## 📊 Mapa de Dependencias

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                             │
│                  (Wrapped with AcademyProvider)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ├─► 🌐 AcademyContext
                         │    │
                         │    ├─► 🎛️ constants.js
                         │    └─► 🔧 firestore.js
                         │
                         ├─► 🧩 Components
                         │    │
                         │    ├─► AcademySelector
                         │    ├─► UserMenu
                         │    ├─► PlayersSection ─┐
                         │    ├─► AdminSection    │
                         │    ├─► Dashboard       ├─► useAcademy()
                         │    └─► ...             │   (Context)
                         │                        │
                         └────────────────────────┘
                              │
                              ├─► 🛠️ permissions.js
                              ├─► 🛠️ formatters.js
                              ├─► 🛠️ validators.js
                              └─► 🔧 firestore.js
```

## 🎯 Flujo de Datos

### Antes (Prop Drilling)
```
App
 │
 ├─► props: { user, academy, db, membership }
 │     │
 │     ├─► PlayersSection (recibe 4 props)
 │     │     │
 │     │     ├─► PlayerCard (recibe 4 props)
 │     │     └─► FilterMenu (recibe 4 props)
 │     │
 │     ├─► AdminSection (recibe 4 props)
 │     └─► Dashboard (recibe 4 props)
```

### Después (Context API)
```
App
 │
 └─► AcademyProvider
       │
       ├─► Context: { academy, membership, ...helpers }
       │
       ├─► PlayersSection
       │     └─► const { academy, membership } = useAcademy()
       │
       ├─► AdminSection
       │     └─► const { academy, isOwner } = useAcademy()
       │
       └─► Dashboard
             └─► const { academy, studentLabelPlural } = useAcademy()
```

## 📦 Módulos Creados

### 1. Configuration Layer
```javascript
// constants.js
export const ROLES = { OWNER: 'owner', ADMIN: 'admin', MEMBER: 'member' };
export const VALID_ROLES = [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER];
export const FILE_UPLOAD = { MAX_IMAGE_SIZE: 2MB, ... };
export const COLLECTIONS = { ACADEMIES: 'academies', ... };
// + 30 constantes más
```

### 2. Context Layer
```javascript
// AcademyContext.jsx
export const useAcademy = () => {
  const context = useContext(AcademyContext);
  return context; // { academy, membership, isOwner, ... }
};
```

### 3. Service Layer
```javascript
// firestore.js
export const getPlayers = async (db, academyId) => { ... };
export const getTiers = async (db, academyId) => { ... };
export const getDashboardData = async (db, academyId) => { ... };
// + 20 funciones más
```

### 4. Utilities Layer
```javascript
// permissions.js
export const isOwner = (membership) => { ... };
export const canEditSettings = (membership) => { ... };
// + 15 funciones más

// formatters.js
export const formatCurrency = (value, currency) => { ... };
export const formatDateShort = (date) => { ... };
export const calculateAge = (birthdate) => { ... };
// + 25 funciones más
```

## 🔄 Ciclo de Migración

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LEE LA DOCUMENTACIÓN                                     │
│    ├─► REFACTORING_SUMMARY.md (este archivo)               │
│    ├─► REFACTORING_GUIDE.md                                │
│    └─► MIGRATION_EXAMPLE.md                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. PRUEBA LAS UTILIDADES                                    │
│    ├─► Importa formatters.js en un componente              │
│    ├─► Usa formatCurrency() o formatDateShort()            │
│    └─► Verifica que funciona                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. MIGRA UN COMPONENTE PEQUEÑO                              │
│    ├─► InviteTeammateModal (recomendado)                   │
│    ├─► Sigue MIGRATION_EXAMPLE.md                          │
│    └─► Verifica que funciona igual                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. IMPLEMENTA CONTEXT API                                   │
│    ├─► Envuelve App con AcademyProvider                    │
│    ├─► Migra componentes a useAcademy()                    │
│    └─► Elimina props de academy/membership                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. REFACTORIZA COMPONENTES GRANDES                          │
│    ├─► Divide PlansOffersSection (1069 líneas)             │
│    ├─► Divide AdminSection (652 líneas)                    │
│    └─► Divide PlayersSection (609 líneas)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. AGREGA TESTS Y CI/CD                                     │
│    ├─► Tests unitarios para utils                          │
│    ├─► Tests de integración para services                  │
│    └─► GitHub Actions para CI/CD                           │
└─────────────────────────────────────────────────────────────┘
```

## 💾 Antes y Después en Números

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Archivos con roles hardcodeados | 5+ | 1 | -80% |
| Props por componente (promedio) | 4-5 | 0-2 | -60% |
| Queries Firestore duplicadas | 3+ | 0 | -100% |
| Lógica de formateo duplicada | 3+ | 0 | -100% |
| Componentes duplicados | 2 | 1 | -50% |
| Líneas en componente más grande | 1,069 | (pendiente) | TBD |
| Tests unitarios | 0 | 0* | 0%* |
| Documentación técnica | 1 README | 4 docs | +300% |

*Pendiente de crear

## 🎓 Recursos de Aprendizaje

### Para Entender las Utilidades
1. **constants.js** - Lee los comentarios JSDoc
2. **permissions.js** - Ejemplos en REFACTORING_GUIDE.md
3. **formatters.js** - Ejemplos en REFACTORING_GUIDE.md
4. **firestore.js** - Ejemplos en REFACTORING_GUIDE.md

### Para Implementar Context
1. **AcademyContext.jsx** - Lee los comentarios
2. **MIGRATION_EXAMPLE.md** - Ejemplo completo
3. [React Context Docs](https://react.dev/reference/react/useContext)

### Para Dividir Componentes
1. **REFACTORING_GUIDE.md** - Sección "Componentes Grandes"
2. [Component Design Patterns](https://react.dev/learn/thinking-in-react)

## 🎯 Quick Start

```bash
# 1. Lee la documentación
open REFACTORING_SUMMARY.md

# 2. Revisa el ejemplo
open MIGRATION_EXAMPLE.md

# 3. Prueba las utilidades en tu código
# Edita InviteTeammateModal.jsx siguiendo el ejemplo

# 4. Verifica que funciona
npm run dev

# 5. Commit incremental
git add .
git commit -m "refactor: migrate InviteTeammateModal to use new utils"

# 6. Continúa con siguiente componente
```

## 📞 Soporte

- **Guía Completa:** `REFACTORING_GUIDE.md`
- **Ejemplo Práctico:** `MIGRATION_EXAMPLE.md`
- **JSDoc:** Comentarios en cada archivo
- **Resumen:** `REFACTORING_SUMMARY.md`

---

**Estado:** ✅ Listo para adopción
**Próximo paso:** Lee `REFACTORING_SUMMARY.md`
**Última actualización:** 2024-12-19
