# Instrucciones para el proyecto Kivee

## Idioma y Comunicación
- Toda la comunicación con el usuario debe ser en **español**
- Los mensajes de la interfaz (toast, alerts, etc.) deben estar en español
- Los comentarios en el código pueden estar en inglés o español

## Stack Tecnológico
- **Frontend**: React 18+ con hooks
- **Styling**: Tailwind CSS (usar clases utilitarias)
- **Base de datos**: Firebase Firestore
- **Almacenamiento**: Firebase Storage
- **Routing**: React Router v6
- **Iconos**: Lucide React
- **Notificaciones**: react-hot-toast

## Estructura del Proyecto
```
/src
  /components     - Componentes React
  /contexts       - Context providers (AcademyContext, etc.)
  /utils          - Funciones utilitarias y helpers
  /services       - Servicios de Firebase y APIs
  /styles         - Archivos CSS globales
  /config         - Constantes y configuración
```

## Convenciones de Código

### Componentes React
- Usar **componentes funcionales** con hooks
- Exportar como `export default function ComponentName()`
- Destructurar props en la firma de la función
- Usar hooks en este orden: useState, useEffect, useRef, useMemo, custom hooks

### Firebase
- **SIEMPRE** validar permisos con `hasValidMembership(membership)` antes de operaciones de lectura/escritura
- Usar constantes de `COLLECTIONS` desde `/config/constants` para nombres de colecciones
- Estructura de rutas: `academies/${academy.id}/${COLLECTIONS.PLAYERS}`

### Constantes y Configuración Centralizada
**IMPORTANTE**: Usar constantes centralizadas en lugar de valores hardcodeados

#### Rutas de Navegación
```javascript
import { ROUTES } from '../config/routes';

// ❌ NO hacer:
navigate('/students/new');
navigate(`/students/${id}/edit`);

// ✅ SÍ hacer:
navigate(ROUTES.STUDENT_NEW);
navigate(ROUTES.STUDENT_EDIT(id));
```

#### Compresión de Imágenes
```javascript
import { IMAGE_COMPRESSION } from '../config/constants';

// ❌ NO hacer:
maxWidthOrHeight: 72, quality: 0.8

// ✅ SÍ hacer:
...IMAGE_COMPRESSION.THUMBNAIL
```

#### Paths de Firebase Storage
```javascript
import { STORAGE_PATHS } from '../config/constants';

// ❌ NO hacer:
`academies/${id}/player_photos/${timestamp}_${file}_thumb.jpg`

// ✅ SÍ hacer:
STORAGE_PATHS.playerPhoto(academyId, timestamp, filename, 'thumbnail')
STORAGE_PATHS.brandingLogo(academyId, timestamp, filename)
STORAGE_PATHS.paymentReceipt(academyId, studentId, timestamp, filename)
```

#### Límites de Archivo
```javascript
import { FILE_UPLOAD } from '../config/constants';

// ❌ NO hacer:
if (file.size > 5 * 1024 * 1024)

// ✅ SÍ hacer:
if (file.size > FILE_UPLOAD.MAX_DOCUMENT_SIZE)
if (file.size > FILE_UPLOAD.MAX_IMAGE_SIZE)
```

#### Paginación
```javascript
import { PAGINATION } from '../config/constants';

// ❌ NO hacer:
const pageSize = 10;

// ✅ SÍ hacer:
const pageSize = PAGINATION.PAYMENT_ITEMS_PER_PAGE;
```

### Context de Academy
- Usar `useAcademy()` para acceder a:
  - `academy` - Datos de la academia actual
  - `membership` - Membresía del usuario
  - `studentLabelPlural` - Label personalizado (ej: "Estudiantes", "Jugadores")
  - `studentLabelSingular` - Label personalizado singular

### UI Strings (Textos de Interfaz)
**IMPORTANTE**: Usar strings centralizados para consistencia y futura internacionalización

```javascript
import { ACTIONS, STATUS, ERRORS, SUCCESS, NAVIGATION } from '../config/uiStrings';

// ❌ NO hardcodear textos:
<button>Add</button>
toast.error("Something went wrong");
<p>No data available</p>

// ✅ SÍ usar constantes:
<button>{ACTIONS.ADD}</button>
toast.error(ERRORS.GENERIC);
<p>{STATUS.NO_DATA}</p>
```

**Con labels de academia:**
```javascript
import { getUIStringsWithAcademy } from '../config/uiStrings';
import { useAcademy } from '../contexts/AcademyContext';

const { academy } = useAcademy();
const strings = getUIStringsWithAcademy(academy);

// Textos adaptados automáticamente:
<h2>{strings.ADD_STUDENT}</h2>  // "Add New Student" o "Add New Player"
<button>{strings.BACK_TO_STUDENTS}</button>  // Usa el label correcto
```

**Categorías disponibles:**
- `ACTIONS` - Acciones comunes (Add, Edit, Delete, Save, etc.)
- `STATUS` - Estados (Loading, Success, Error, No Data, etc.)
- `ERRORS` - Mensajes de error con funciones dinámicas
- `SUCCESS` - Mensajes de éxito con funciones dinámicas
- `CONFIRMATIONS` - Confirmaciones de acciones
- `EMPTY_STATES` - Estados vacíos
- `FORM_LABELS` - Labels de formularios
- `PLACEHOLDERS` - Placeholders de inputs

### Estilos
- Preferir **Tailwind CSS** sobre CSS personalizado
- Usar clases del theme:
  - `bg-section` para fondos de secciones
  - `btn-primary` para botones principales
  - `content-card-responsive` para tarjetas adaptativas
  - `section-title` para títulos de sección
- Responsive: mobile-first, usar prefijos `md:` y `lg:` para breakpoints

### Imágenes
- Almacenar en Firebase Storage en: `academies/${academy.id}/players/${playerId}/`
- Generar 3 versiones:
  - Original (800x800): `{playerId}.jpg`
  - Medium (200x200): `{playerId}_medium.jpg`
  - Thumbnail (72x72): `{playerId}_thumbnail.jpg`
- Usar `photoMediumURL` para drawers y vistas detalladas
- Usar `photoThumbnailURL` para listas y tablas

### Navegación
- Después de editar, regresar a la lista (no al detalle)
- **SIEMPRE** usar `ROUTES` de `/config/routes` para navegación
- Usar `useLocation()` para detectar cambios de ruta y refrescar datos

```javascript
import { ROUTES } from '../config/routes';

// ❌ NO usar strings hardcodeados:
navigate('/students');
navigate(`/students/${id}/edit`);

// ✅ SÍ usar ROUTES:
navigate(ROUTES.STUDENTS);
navigate(ROUTES.STUDENT_EDIT(id));
```

## Reglas Específicas

### NO hacer
- ❌ NO usar emojis en código o UI (a menos que el usuario lo pida explícitamente)
- ❌ NO crear archivos de documentación (.md) sin que se solicite
- ❌ NO hacer commits automáticos sin autorización explícita
- ❌ NO usar `console.log` en producción (eliminar después de debug)
- ❌ NO agregar features o refactorizar sin que se solicite

### SÍ hacer
- ✅ Validar permisos antes de operaciones con Firebase
- ✅ Usar loading states para operaciones async
- ✅ Mostrar toast notifications para feedback al usuario
- ✅ Manejar errores con try-catch y mostrar mensajes amigables
- ✅ Usar labels personalizables del contexto (studentLabel)
- ✅ Mantener el código simple y directo

## Patrones Comunes

### Fetch de datos
```javascript
const fetchData = async () => {
  if (!academy?.id || !db || !membership) return;
  if (!hasValidMembership(membership)) {
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    const ref = collection(db, `academies/${academy.id}/collection`);
    const snapshot = await getDocs(query(ref));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setData(data);
  } catch (error) {
    console.error('Error:', error);
    toast.error('Error al cargar datos');
  } finally {
    setLoading(false);
  }
};
```

### Refresh al volver de edición
```javascript
const location = useLocation();

useEffect(() => {
  if (location.pathname === '/students' && academy?.id && db && membership && hasValidMembership(membership)) {
    fetchPlayers();
  }
}, [location.pathname]);
```

## Notas Importantes
- Este es un sistema de gestión para academias deportivas
- Los términos "estudiantes", "jugadores", "players" se usan intercambiablemente
- La aplicación debe funcionar tanto en desktop como mobile
- Priorizar la experiencia del usuario y la simplicidad
