# Auditoría Técnica — Server-RX

**Fecha:** 26 de febrero de 2026

---

## HALLAZGO 1 — Credenciales hardcodeadas en DEFAULT_CONFIG

- **Severidad**: Crítico
- **Tipo**: Seguridad
- **Ubicación**: `src/config/index.ts` — `DEFAULT_CONFIG`
- **Problema**: `DEFAULT_CONFIG` está hardcodeado con credenciales débiles (`JWT_SECRET`, `ADMIN_PASSWORD: "admin"`, `ORTHANC_PASSWORD: "orthanc"`) y ese secreto JWT está en el código fuente. Si `config.json` no existe, se crea automáticamente con estos valores, exponiendo el sistema desde el primer arranque.
- **Riesgo**: Cualquiera que lea el repo puede autenticarse como admin o falsificar tokens JWT.
- **Recomendación**: Cambiar el `DEFAULT_CONFIG` para que use valores vacíos/placeholder y forzar al usuario a configurarlos explícitamente antes de arrancar. El `JWT_SECRET` default nunca debería estar en el código fuente.
- **Evidencia**: `JWT_SECRET: "RX_2026_JWT_8f2c4b9d6a1e3f7c0d5b8a2e1f4c6d9b"`, `ADMIN_PASSWORD: "admin"`

---

## HALLAZGO 2 — Bypass de autenticación con PatientID nulo

- **Severidad**: Crítico
- **Tipo**: Bug lógico / Seguridad
- **Ubicación**: `src/utils/server/api-auth.ts` — función `validateStudyAccess` (líneas 71-75)
- **Problema**: La comparación del DNI usa `String(payload.dni).trim() === String(DNI).trim()`. Si un estudio no tiene `PatientID` en Orthanc, `GetDNIbyStudyID` devuelve `null`/`undefined`. Entonces `String(null)` = `"null"` === `"null"` → **acceso concedido sin credenciales válidas** para cualquier estudio sin `PatientID`.
- **Riesgo**: Bypass de autenticación de pacientes en estudios con `PatientID` nulo.
- **Recomendación**:
  ```typescript
  const dni = await GetDNIbyStudyID(studyId);
  // Rechazar inmediatamente si no hay DNI registrado
  if (!dni) return { isAuthorized: false, isAdmin: false };

  if (payload && payload.type === 'lite_access' &&
      payload.studyId === studyId &&
      String(payload.dni).trim() === String(dni).trim()) { ... }
  ```

---

## HALLAZGO 3 — SSRF en configuración de ORTHANC_URL

- **Severidad**: Alto
- **Tipo**: Seguridad (SSRF)
- **Ubicación**: `src/actions/config.ts` (línea 11) + `src/libs/orthanc/index.ts` (línea 25)
- **Problema**: `ORTHANC_URL` se acepta como cualquier URL válida (`z.string().url()`). Un admin mal intencionado (o una sesión comprometida) puede apuntarla a `http://169.254.169.254/` (metadata AWS) o a servicios internos, y el watcher + todas las APIs del proxy harán peticiones a esa dirección.
- **Riesgo**: Server-Side Request Forgery (SSRF) hacia servicios internos de la red.
- **Recomendación**: Validar que `ORTHANC_URL` sea un host local o dominio confiable. Bloquear IPs privadas/especiales con un `refine()` en el schema Zod.

---

## HALLAZGO 4 — Login falla con ADMIN_USERNAME en mayúsculas

- **Severidad**: Alto
- **Tipo**: Bug lógico
- **Ubicación**: `src/actions/auth.ts` — línea 30
- **Problema**: `username === ADMIN_USERNAME.toLowerCase()` — el input del usuario NO se normaliza a minúsculas, pero el `ADMIN_USERNAME` almacenado sí. Si el admin configura `ADMIN_USERNAME: "Admin"`, el login siempre falla porque compara `"Admin"` (input) con `"admin"` (normalizado).
- **Riesgo**: Lockout del admin al configurar un username con mayúsculas.
- **Recomendación**: `username.toLowerCase() === ADMIN_USERNAME.toLowerCase()` (normalizar ambos lados).

---

## HALLAZGO 5 — ORTHANC_AUTH no se actualiza al cambiar configuración

- **Severidad**: Alto
- **Tipo**: Bug / Mantenibilidad
- **Ubicación**: `src/config/index.ts` — línea 38
- **Problema**: `ORTHANC_AUTH` se calcula **una sola vez al arranque del módulo**. Si el admin actualiza `ORTHANC_USERNAME` o `ORTHANC_PASSWORD` vía `updateConfig`, el header de autenticación permanece con los valores viejos hasta el próximo reinicio del servidor.
- **Riesgo**: El servidor sigue usando credenciales antiguas hacia Orthanc hasta reinicio, generando errores silenciosos.
- **Recomendación**: Calcular `ORTHANC_AUTH` de forma dinámica en `orthancFetch` leyendo siempre la config actual, o bien exportar una función `getOrthancAuth()` en lugar de una constante.

---

## HALLAZGO 6 — IP Spoofing bypassea el Rate Limiting

- **Severidad**: Alto
- **Tipo**: Seguridad — IP Spoofing
- **Ubicación**: `src/utils/server/rate-limit.ts` — función `getClientIP` (líneas 52-58)
- **Problema**: `getClientIP` lee `X-Forwarded-For` y `X-Real-IP` sin ninguna validación. Un cliente puede enviar `X-Forwarded-For: 1.2.3.4` y el rate limiter lo tomará como IP real, permitiendo omitir completamente el límite de intentos de login.
- **Riesgo**: Bypass del rate limiting → brute force de passwords ilimitado.
- **Recomendación**: Solo confiar en `cf-connecting-ip` si hay Cloudflare, o configurar qué proxies son confiables. Nunca confiar en headers que el cliente puede falsificar.

---

## HALLAZGO 7 — Path Traversal en IDs de Orthanc

- **Severidad**: Alto
- **Tipo**: Seguridad — Inyección de ruta
- **Ubicación**: `src/libs/orthanc/index.ts` (línea 25), múltiples API routes
- **Problema**: Los `studyId`, `seriesId`, `instanceId` se insertan directamente en la URL sin sanitización: `` `${ORTHANC_URL}/studies/${studyId}` ``. Si el id contiene `../`, `%2F`, o query strings, podría alterar la URL final hacia Orthanc.
- **Riesgo**: Path traversal o manipulación de parámetros en la API de Orthanc.
- **Recomendación**: URL-encodear los segmentos: `encodeURIComponent(studyId)` al construir URLs.

---

## HALLAZGO 8 — Falta autorización en actions de configuración

- **Severidad**: Medio
- **Tipo**: Seguridad — Autorización ausente
- **Ubicación**: `src/actions/config.ts` — handlers de `updateConfig` y `syncNow`
- **Problema**: Ninguno de los dos handlers verifica `context.locals.user`. El middleware protege la ruta a nivel HTTP, pero no hay defensa en profundidad dentro de la action.
- **Riesgo**: Si el middleware es bypasseado, las actions quedan abiertas.
- **Recomendación**: Añadir al inicio de ambos handlers:
  ```typescript
  if (!context.locals.user) throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
  ```

---

## HALLAZGO 9 — Import duplicado desde el mismo módulo

- **Severidad**: Bajo
- **Tipo**: Código muerto / Mantenibilidad
- **Ubicación**: `src/utils/server/api-auth.ts` — líneas 4-5
- **Problema**: `orthancFetch` y `GetDNIbyStudyID` se importan en dos líneas separadas desde el mismo módulo `@/libs/orthanc`.
- **Recomendación**: `import { orthancFetch, GetDNIbyStudyID } from '@/libs/orthanc';`

---

## HALLAZGO 10 — Prepared statement recreado en cada llamada

- **Severidad**: Medio
- **Tipo**: Mantenibilidad / Performance
- **Ubicación**: `src/libs/db/studies.ts` — función `checkSeriesExists`
- **Problema**: `db.prepare('SELECT 1 FROM series WHERE id = ?')` se llama dentro de la función en cada invocación, creando un nuevo prepared statement cada vez. El resto de statements del módulo son constantes pre-compiladas.
- **Recomendación**:
  ```typescript
  const stmtCheckSeriesExists = db.prepare('SELECT 1 FROM series WHERE id = ?');
  export function checkSeriesExists(seriesId: string): boolean {
    return !!stmtCheckSeriesExists.get(seriesId);
  }
  ```

---

## HALLAZGO 11 — Uso de @ts-ignore para variables globales

- **Severidad**: Medio
- **Tipo**: Mantenibilidad
- **Ubicación**: `src/libs/orthanc/index.ts` (líneas 14, 19, 21) y `src/libs/orthanc/watcher.ts` (línea 18)
- **Problema**: Se usan `// @ts-ignore` para acceder a `global._orthancWatcherStarted` y `global.isOrthancSyncing`, silenciando errores de TypeScript en lugar de corregirlos.
- **Recomendación**: Declarar los globales con augmentation de tipos en `src/env.d.ts`:
  ```typescript
  declare global {
    var _orthancWatcherStarted: boolean | undefined;
    var isOrthancSyncing: boolean | undefined;
  }
  ```

---

## HALLAZGO 12 — saveConfig acepta `any` sin validación

- **Severidad**: Bajo
- **Tipo**: Mantenibilidad
- **Ubicación**: `src/config/index.ts` — función `saveConfig`
- **Problema**: `saveConfig(newConfig: any)` no valida la estructura del objeto. Podría guardar un JSON con campos faltantes o tipos incorrectos que rompen el servidor al reiniciar.
- **Recomendación**: Tipar con un interface o schema Zod, y validar antes de escribir al disco.

---

## Quick Wins (alto valor, bajo esfuerzo)

1. **Hallazgo 2** — Añadir `if (!dni) return { isAuthorized: false, ... }` + check `payload.type === 'lite_access'`
2. **Hallazgo 4** — `username.toLowerCase() === ADMIN_USERNAME.toLowerCase()`
3. **Hallazgo 9** — Fusionar los dos imports de `@/libs/orthanc`
4. **Hallazgo 10** — Mover `db.prepare(...)` fuera de `checkSeriesExists`
5. **Hallazgo 11** — Añadir declaraciones en `env.d.ts` y quitar los `@ts-ignore`

---

## Refactors Sugeridos (mediano plazo)

- **Config dinámica**: Reemplazar las constantes exportadas por funciones getters para que `updateConfig` tome efecto sin reinicio.
- **ORTHANC_AUTH dinámico**: Calcular en `orthancFetch` en lugar de módulo-nivel.
- **Validación de IDs**: Wrapper que verifique el formato UUID de Orthanc antes de hacer fetch.
- **Tipar `saveConfig`**: Usar un schema Zod compartido con `updateConfig`.

---

## Checklist de Validación

- [ ] Verificar que `config.json` está en `.gitignore`
- [ ] Test: login con `ADMIN_USERNAME` mixedcase → debe funcionar
- [ ] Test: paciente con `PatientID` nulo → NO debe obtener acceso
- [ ] Test: `X-Forwarded-For` spoofed en login → rate limit debe aplicarse
- [ ] `tsc --noEmit` sin errores
- [ ] Revisar que `updateConfig` + reinicio refleja nuevas creds en Orthanc
