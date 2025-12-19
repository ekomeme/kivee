# Refactoring Guide - Kivee Academy

Esta guía explica la nueva arquitectura del proyecto y cómo usarla.

## 📁 Nueva Estructura

```
src/
├── config/
│   └── constants.js          # Todas las constantes centralizadas
├── contexts/
│   └── AcademyContext.jsx    # Context API para datos de academia
├── services/
│   └── firestore.js          # Capa de servicios para Firestore
├── utils/
│   ├── permissions.js        # Utilidades de permisos y roles
│   ├── formatters.js         # Formateo de fechas, monedas, etc.
│   └── validators.js         # Validación de inputs (ya existía)
└── components/
    ├── AcademySelector.jsx   # Selector de academias (extraído)
    └── UserMenu.jsx          # Menú de usuario (extraído)
```

## 🎯 Guía de Uso

### 1. Constants (Constantes)

**Antes:**
```javascript
// ❌ Hardcodeado en cada archivo
if (!['owner', 'admin', 'member'].includes(membership.role)) {
  return;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // ¿Dónde está esto definido?
```

**Ahora:**
```javascript
// ✅ Importar de constants.js
import { VALID_ROLES, FILE_UPLOAD } from '../config/constants';

if (!VALID_ROLES.includes(membership.role)) {
  return;
}

const MAX_FILE_SIZE = FILE_UPLOAD.MAX_DOCUMENT_SIZE;
```

**Constantes disponibles:**
- `ROLES` - Roles de usuario (OWNER, ADMIN, MEMBER)
- `VALID_ROLES` - Array de roles válidos
- `ROLE_PERMISSIONS` - Permisos por rol
- `ACADEMY_CATEGORIES` - Categorías de academias
- `FILE_UPLOAD` - Límites de archivos
- `COLLECTIONS` - Nombres de colecciones Firestore
- `PAYMENT_STATUS` - Estados de pago
- `ERROR_MESSAGES` - Mensajes de error estándar

### 2. Permissions (Permisos)

**Antes:**
```javascript
// ❌ Lógica de permisos duplicada
if (!membership || !['owner', 'admin'].includes(membership.role)) {
  toast.error('No tienes permiso');
  return;
}
```

**Ahora:**
```javascript
// ✅ Usar utilidades de permisos
import { isAdminOrOwner, canEditSettings, hasPermission } from '../utils/permissions';

if (!isAdminOrOwner(membership)) {
  toast.error('No tienes permiso');
  return;
}

// O más específico:
if (!canEditSettings(membership)) {
  toast.error('No puedes editar configuraciones');
  return;
}

// O genérico:
if (!hasPermission(membership, 'canManageTeam')) {
  toast.error('No puedes gestionar el equipo');
  return;
}
```

**Funciones disponibles:**
- `isOwner(membership)` - ¿Es owner?
- `isAdminOrOwner(membership)` - ¿Es admin u owner?
- `hasRole(membership, ['owner', 'admin'])` - ¿Tiene alguno de estos roles?
- `canEditSettings(membership)` - ¿Puede editar settings?
- `canManageTeam(membership)` - ¿Puede gestionar equipo?
- `canViewFinances(membership)` - ¿Puede ver finanzas?
- `canManagePlayers(membership)` - ¿Puede gestionar jugadores?
- `canManagePlans(membership)` - ¿Puede gestionar planes?

### 3. Firestore Services (Servicios)

**Antes:**
```javascript
// ❌ Queries duplicadas en cada componente
const playersRef = collection(db, `academies/${academy.id}/players`);
const snapshot = await getDocs(playersRef);
const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Ahora:**
```javascript
// ✅ Usar servicios centralizados
import { getPlayers, getTiers, getDashboardData } from '../services/firestore';

// Obtener jugadores
const players = await getPlayers(db, academy.id);

// Obtener múltiples recursos a la vez
const { products, players, trials, tiers } = await getDashboardData(db, academy.id);
```

**Funciones disponibles:**

**Academias:**
- `getAcademy(db, academyId)`
- `getUserAcademies(db, userId)`
- `updateAcademy(db, academyId, data)`

**Jugadores:**
- `getPlayers(db, academyId)`
- `getPlayer(db, academyId, playerId)`
- `createPlayer(db, academyId, playerData)`
- `updatePlayer(db, academyId, playerId, data)`
- `deletePlayer(db, academyId, playerId)`

**Recursos:**
- `getTiers(db, academyId)`
- `getGroups(db, academyId)`
- `getTutors(db, academyId)`
- `getProducts(db, academyId)`
- `getTrials(db, academyId)`

**Batch:**
- `getDashboardData(db, academyId)` - Obtiene products, players, trials, tiers, subscriptions
- `getAcademyResources(db, academyId)` - Obtiene tiers, groups, tutors, products

**Suscripciones en tiempo real:**
- `subscribeToPlayers(db, academyId, callback)`
- `subscribeToAcademy(db, academyId, callback)`

### 4. Formatters (Formateo)

**Antes:**
```javascript
// ❌ Lógica de formateo duplicada
const toDateSafe = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (d?.seconds) return new Date(d.seconds * 1000);
  return new Date(d);
};

const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: academy?.currency || 'USD'
    }).format(value || 0);
  } catch (e) {
    return `$${Number(value || 0).toFixed(2)}`;
  }
};
```

**Ahora:**
```javascript
// ✅ Usar formatters centralizados
import {
  formatDateShort,
  formatCurrency,
  formatAcademyCurrency,
  calculateAge,
  formatPhone,
  formatCountLabel
} from '../utils/formatters';

const formattedDate = formatDateShort(player.birthdate); // "12/25/2010"
const age = calculateAge(player.birthdate); // 14
const price = formatAcademyCurrency(100, academy); // "$100.00"
const phone = formatPhone(player.phone); // "(555) 123-4567"
const label = formatCountLabel(players.length, 'player'); // "25 players"
```

**Funciones disponibles:**

**Fechas:**
- `toDateSafe(date)` - Convertir a Date seguro
- `formatDateShort(date)` - "12/25/2023"
- `formatDateLong(date)` - "December 25, 2023"
- `formatDateTime(date)` - "12/25/2023 10:30 AM"
- `formatDateISO(date)` - "2023-12-25"
- `formatRelativeTime(date)` - "2 days ago"
- `calculateAge(birthdate)` - Edad en años

**Moneda:**
- `formatCurrency(value, currency)` - Formatear moneda
- `formatAcademyCurrency(value, academy)` - Usar currency de academia

**Números:**
- `formatNumber(value)` - "1,000"
- `formatPercentage(value)` - "75.5%"
- `formatFileSize(bytes)` - "2.5 MB"

**Texto:**
- `formatPhone(phone)` - Formatear teléfono
- `formatName(name)` - Capitalizar nombre
- `getInitials(name)` - "JD" de "John Doe"
- `truncateText(text, maxLength)` - Truncar texto
- `pluralize(count, 'player', 'players')` - Pluralizar
- `formatCountLabel(5, 'player')` - "5 players"

### 5. Academy Context (Context API)

**Antes:**
```javascript
// ❌ Prop drilling en cada componente
<Route path="/students" element={
  <PlayersSection user={user} academy={academy} db={db} membership={membership} />
} />

function PlayersSection({ user, academy, db, membership }) {
  // ...
}
```

**Ahora:**
```javascript
// ✅ Envolver app con AcademyProvider
import { AcademyProvider } from './contexts/AcademyContext';

<AcademyProvider user={user} db={db}>
  <Routes>
    <Route path="/students" element={<PlayersSection />} />
  </Routes>
</AcademyProvider>

// En el componente:
import { useAcademy } from '../contexts/AcademyContext';

function PlayersSection() {
  const {
    academy,
    membership,
    isOwner,
    studentLabelPlural,
    refreshAcademy
  } = useAcademy();

  // ¡Ya no necesitas props! 🎉
}
```

**Valores disponibles en el Context:**

**Estado:**
- `academy` - Objeto de academia actual
- `membership` - Membership del usuario en esta academia
- `allAcademies` - Todas las academias del usuario
- `loading` - Estado de carga
- `error` - Error si lo hay

**Funciones:**
- `selectAcademy(academyId)` - Seleccionar academia
- `switchAcademy(academyId)` - Cambiar de academia
- `refreshAcademy()` - Refrescar datos de academia
- `loadUserAcademies()` - Recargar todas las academias

**Valores computados:**
- `isOwner` - ¿Es owner?
- `isAdmin` - ¿Es admin?
- `isMember` - ¿Es member?

**Labels (con fallbacks):**
- `studentLabelSingular` / `studentLabelPlural`
- `tutorLabelSingular` / `tutorLabelPlural`
- `groupLabelSingular` / `groupLabelPlural`
- `classLabelSingular` / `classLabelPlural`

### 6. Componentes Extraídos

**AcademySelector:**
```javascript
import AcademySelector from '../components/AcademySelector';

<AcademySelector
  availableAcademies={allAcademies}
  currentAcademy={academy}
  onSwitch={switchAcademy}
/>
```

**UserMenu:**
```javascript
import UserMenu from '../components/UserMenu';

<UserMenu
  user={user}
  onSignOut={handleSignOut}
  isSidebar={false}
/>
```

## 🔄 Plan de Migración

### Paso 1: Migrar App.jsx (PENDIENTE)
- [ ] Envolver app con `AcademyProvider`
- [ ] Importar `AcademySelector` y `UserMenu` componentes
- [ ] Eliminar componentes inline
- [ ] Simplificar rutas (eliminar props)

### Paso 2: Migrar componentes uno por uno (PENDIENTE)
Para cada componente:
1. Importar `useAcademy` hook
2. Reemplazar props con hook
3. Importar utilidades necesarias
4. Reemplazar código hardcodeado con constantes
5. Usar servicios de Firestore en lugar de queries directas
6. Usar formatters en lugar de lógica custom

### Paso 3: Testing
- [ ] Verificar que todo funciona igual
- [ ] Agregar tests unitarios para utilidades
- [ ] Agregar tests de integración para Context

## 🎨 Ejemplo de Migración Completa

**Antes (PlayersSection.jsx):**
```javascript
import { collection, getDocs } from 'firebase/firestore';

function PlayersSection({ user, academy, db, membership }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const ref = collection(db, `academies/${academy.id}/players`);
      const snap = await getDocs(ref);
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchPlayers();
  }, [academy.id]);

  if (!['owner', 'admin', 'member'].includes(membership.role)) {
    return <div>No access</div>;
  }

  return (
    <div>
      <h1>{academy?.studentLabelPlural || 'Students'}</h1>
      {/* ... */}
    </div>
  );
}
```

**Después (con refactoring):**
```javascript
import { getPlayers } from '../services/firestore';
import { useAcademy } from '../contexts/AcademyContext';
import { hasValidMembership } from '../utils/permissions';

function PlayersSection() {
  const { academy, membership, studentLabelPlural } = useAcademy();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const data = await getPlayers(db, academy.id);
      setPlayers(data);
    };
    if (academy?.id) fetchPlayers();
  }, [academy?.id]);

  if (!hasValidMembership(membership)) {
    return <div>No access</div>;
  }

  return (
    <div>
      <h1>{studentLabelPlural}</h1>
      {/* ... */}
    </div>
  );
}
```

## 📊 Beneficios del Refactoring

1. **DRY (Don't Repeat Yourself)**: Código no duplicado
2. **Mantenibilidad**: Cambios en un solo lugar
3. **Testabilidad**: Funciones puras fáciles de testear
4. **Legibilidad**: Código más claro y autodocumentado
5. **Performance**: Menos queries duplicadas
6. **Escalabilidad**: Fácil agregar nuevas features

## 🚀 Próximos Pasos

1. **Migrar App.jsx** para usar el Context
2. **Migrar componentes grandes** (PlansOffersSection, AdminSection, PlayersSection)
3. **Dividir componentes grandes** en componentes más pequeños
4. **Agregar tests** para utilidades y servicios
5. **Migrar a TypeScript** (opcional pero recomendado)

## ❓ Preguntas Frecuentes

**P: ¿Tengo que migrar todo de una vez?**
R: No. Puedes migrar incrementalmente. Las nuevas utilidades pueden coexistir con el código viejo.

**P: ¿Esto romperá mi código actual?**
R: No. Los archivos nuevos son independientes. El código actual seguirá funcionando.

**P: ¿Necesito `db` en el Context?**
R: Sí, pero ya no necesitas pasarlo como prop a cada componente.

**P: ¿Puedo seguir usando queries directas de Firestore?**
R: Sí, pero se recomienda usar los servicios para evitar duplicación.

## 📞 Soporte

Si tienes dudas sobre cómo usar estas utilidades, revisa:
1. Este documento
2. Los comentarios JSDoc en cada archivo
3. Los ejemplos en este guide
