# plan · miradapropia

> Organizador académico para estudiantes de arquitectura, con planificación por IA.

[![Despliegue](https://img.shields.io/badge/deploy-netlify-00ad9f)](https://www.netlify.com/)
[![Modelo IA](https://img.shields.io/badge/IA-Claude%20Sonnet%204-d97757)](https://anthropic.com/)

**Sitio en producción:** [plan.miradapropia.org](https://plan.miradapropia.org)

---

## Funcionalidades

- **Vista hoy** — próxima entrega con cuenta atrás, clases del día, sesiones de estudio y carga de las próximas 8 semanas
- **Semana** — horario detallado por horas (8h–20h) con clases, estudio y tareas, línea de hora actual y banner de sobrecarga
- **Mes** — calendario con eventos, notas y números de semana clicables. Indicador rojo/naranja en semanas con sobrecarga
- **Cuatrimestre** — diagrama de Gantt completo con fases por asignatura
- **IA siempre visible** — panel lateral con conversación persistente. Sube PDFs o imágenes de tu calendario y la IA configura todo
- **Ficha por asignatura** — hover sobre una asignatura del sidebar y clica `→` para ver historial de entregas, todos los enlaces guardados, notas, tiempo registrado y eventos pasados
- **Eventos editables** — clic en cualquier entrega/examen/clase abre el editor con título, fecha, asignatura, notas y enlaces (URLs, rutas de carpeta o app links)
- **Notas por día** — botón `+` en cada día del mes y la semana
- **Temporizador pomodoro** con cronómetro de sesiones por asignatura y diario opcional al terminar
- **Reproductor de música embebido** — Spotify, YouTube y SoundCloud
- **Modo oscuro** que sigue el sistema o se fuerza manualmente
- **Exportar a PDF, ICS o JSON** — eligiendo el alcance (hoy, semana, mes, cuatrimestre, todo)
- **100% local** — todos los datos en `localStorage` del navegador. Sin servidor, sin cuenta, sin tracking

---

## Despliegue

### Requisitos
- Cuenta en [Netlify](https://www.netlify.com)
- API key de [Anthropic](https://console.anthropic.com/settings/keys)
- (opcional) Repositorio de GitHub para CI/CD

### Pasos

#### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "initial release"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/plan-miradapropia.git
git push -u origin main
```

#### 2. Conectar con Netlify

1. Ir a [app.netlify.com](https://app.netlify.com) → *Add new site* → *Import an existing project*
2. Conectar GitHub y seleccionar el repositorio
3. Configuración de build:
   - **Build command:** *(dejar vacío)*
   - **Publish directory:** `.`
   - **Functions:** la Edge Function de `netlify/edge-functions/` se autodetecta sola; no hay build
4. *Deploy site*

#### 3. Configurar la API key

`Site settings → Environment variables → Add a variable`:

| Key                 | Value                          |
|---------------------|--------------------------------|
| `ANTHROPIC_API_KEY` | tu clave (`sk-ant-...`)        |

Después: `Deploys → Trigger deploy → Clear cache and deploy site`

#### 4. Subdominio personalizado

`Domain settings → Add custom domain` → introduce `plan.miradapropia.org` → seguir las instrucciones de DNS:

- **Si gestionas el DNS en otro proveedor**: añadir un registro `CNAME` apuntando a `<tu-sitio>.netlify.app`
- **Si gestionas el DNS en Netlify**: cambiar los nameservers del dominio en tu registrador

---

## Estructura del proyecto

```
plan-miradapropia/
├── index.html                  ← App completa (HTML + CSS + JS en un archivo)
├── netlify.toml                ← Build, headers, caché y SEO
├── robots.txt                  ← Reglas para crawlers
├── sitemap.xml                 ← Para Google Search Console
├── favicon.png                 ← Icono del navegador
├── og-image.png                ← Imagen para social sharing (1200×630)
├── README.md                   ← Este archivo
├── ambient/
│   └── lofi-poster.png         ← poster del modo ambiente (el video vive en GitHub Releases)
└── netlify/
    └── edge-functions/
        └── claude.js           ← Edge Function: proxy con streaming a la API (ruta /api/claude)
```

---

## SEO — qué se ha incluido

- Meta tags de descripción, palabras clave y autor
- Open Graph completo (Facebook, LinkedIn, WhatsApp)
- Twitter Card
- JSON-LD `WebApplication` con datos estructurados
- Canonical URL
- robots.txt con reglas para crawlers (bloqueo opcional de bots de scraping de IA)
- Sitemap.xml
- Theme-color para PWA / móvil
- Headers de seguridad: HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- Caché agresiva en assets estáticos, no-cache en `index.html` para que las actualizaciones se vean al instante

### Pasos post-despliegue para Google

1. Verifica el dominio en [Google Search Console](https://search.google.com/search-console)
2. Envía el sitemap: `https://plan.miradapropia.org/sitemap.xml`
3. Solicita la indexación de la URL principal
4. (Opcional) Vincula con [Bing Webmaster Tools](https://www.bing.com/webmasters)

---

## Mantenimiento

### Cambiar el modelo de IA

El modelo **ya no se fija en el cliente**. El cliente declara una *intención* y el servidor decide modelo y techo de tokens. Todo vive en la tabla `INTENTS` de `netlify/edge-functions/claude.js`:

| Intención | Cuándo | Modelo | Techo |
|-----------|--------|--------|-------|
| `chat`    | conversación y replanificación | `claude-sonnet-4-6` | 8000 |
| `ingest`  | volcar un PDF o imagen al plan | `claude-sonnet-4-6` | 8000 |
| `check`   | comprobaciones de fondo (capa 1) | `claude-haiku-4-5-20251001` | 400 |

Una intención desconocida cae en `chat`. `max_tokens` es un techo, no una reserva: solo se paga lo que se genera, así que los techos de las intenciones de usuario son generosos a propósito y solo existen para frenar una generación desbocada.

### Caché de prompt

El *system* viaja en dos bloques y **el orden importa**:

1. `IA_SYSTEM_STATIC` (`index.html`) — invariante, ~3.350 tokens. Lleva `cache_control` efímero: las lecturas de caché se facturan a 0,1x la tarifa de entrada, y Sonnet exige un mínimo de 2.048 tokens para cachear.
2. El contexto del estudiante — cambia en cada petición, así que va **detrás**.

Si metes algo volátil (una fecha, un contador, estado del plan) en el bloque 1, el prefijo deja de coincidir y **no se cachea nada**. Es exactamente lo que pasaba hasta agosto de 2026, cuando el contexto iba en medio del prompt.

### Presupuesto diario de la IA

En `netlify/edge-functions/claude.js`, dos constantes:

- `MAX_REQUESTS_PER_CLIENT_DAY` (300) — por navegador. Un estudiante intensivo gasta ~30 en todo un cuatrimestre.
- `MAX_REQUESTS_GLOBAL_DAY` (3000) — techo de la factura.

Los contadores viven en Netlify Blobs (store `metricas-ia`) y son **fail-open**: si Blobs falla o tarda más de 700 ms, la petición pasa igual. Un fallo de contadores nunca puede dejar a un estudiante sin IA.

### Capa 0 — avisos deterministas

Todo lo que se puede saber **sin preguntarle a un modelo** se calcula en `computeAvisos()` (`index.html`): coste cero, latencia cero, y se recalcula entero en cada `renderAll()`, así que cualquier cambio —del estudiante o de la IA— se refleja al instante.

Comprobaciones actuales: entregas vencidas sin marcar, objetivo de nota fuera de alcance o ya asegurado, semana sobrecargada (esta y la siguiente), entrega cercana sin sesiones de estudio, plan de trabajo desfasado (lo detecta el bus de cambios), ausencia de plan, pesos de evaluación que no suman 100%, referencias a asignaturas borradas y semanas sin ningún día de descanso.

Se muestran como máximo tres, urgentes primero, en la vista *hoy*, más un punto en tinta sobre la pestaña cuando estás en otra vista. Cada aviso puede llevar una acción: navegar, o **redactarle la pregunta a la IA sin enviarla** — el estudiante decide si gasta la llamada.

Reglas al añadir una comprobación nueva:

- **Ningún token se gasta en algo que una función puede decidir.** Antes de subir algo a la IA, intenta bajarlo aquí.
- Las acciones son **funciones**, nunca cadenas de código en un `onclick`: los avisos incluyen nombres de asignatura y títulos de entrega, y eso dentro de un atributo es una vía de inyección. El registro `AVISOS_ACTIVOS` hace que los handlers solo lleven un índice.
- **Cuidado con predecir sobre datos incompletos.** Si los pesos de evaluación no suman ~100%, cualquier predicción de nota sale disparatada (con un 35% cargado, para un 5 «haría falta» un 14,3). Ahí no falta nota, falta información: el aviso correcto es el de pesos, no un falso «objetivo imposible».
- Cada aviso lleva una `sig` (firma del estado). Si el estudiante lo descarta y luego la situación cambia, la firma cambia y el aviso vuelve.
- El color solo va en el filo izquierdo y **siempre** acompañado de glifo y texto: nunca es el único canal. El punto de la pestaña va en tinta, porque una pestaña es cromo de interfaz.

### Capa 1 — el vigilante de fondo

Una comprobación en Haiku (`ejecutarCapa1()`) que se dispara sola 45 s después de la última edición, mira el **delta del bus** —no el plan entero— y como mucho suelta una frase, que aparece en la misma tira de avisos marcada como `asistente`.

Coste medido: **~0,001 $ por chequeo** (~500 tokens de entrada, ~100 de salida). Un turno de conversación en Sonnet cuesta 30 veces más. Techo absoluto: 0,48 $ por estudiante y cuatrimestre; uso realista, ~0,05 $.

**No usa caché de prompt a propósito.** El prompt son ~350 tokens y Haiku exige 1.024 para cachear: inflarlo hasta el mínimo saldría más caro que no cachear.

Esta capa gasta dinero en algo que el estudiante **no ha pedido**, así que las guardas pesan más que la funcionalidad. No se ejecuta si:

- la barra de la IA está abierta (ya está hablando con ella)
- hay un pomodoro o un cronómetro de sesión en marcha — romper el foco es lo contrario de para lo que existe plan
- la pestaña no está visible, o no hay conexión
- capa 0 ya tiene un aviso **urgente** (el estudiante ya tiene un problema más claro delante)
- el delta trae menos de 3 cambios y ninguno es de peso (`target`, `subject`)
- ya se preguntó por ese mismo delta (hash)
- han pasado menos de 20 minutos desde el último chequeo
- se agotó el cupo del día (4)

Los cambios con `src:'ia'` **no cuentan** como delta: la IA no se avisa a sí misma. Un 429 apaga la capa el resto del día en vez de seguir insistiendo. Cualquier fallo es silencioso de cara al estudiante, con traza en `console.debug` para poder depurarlo.

El prompt le prohíbe repetir lo que capa 0 ya dice y le prohíbe contar hechos que la herramienta ya muestra: solo debe hablar de contradicciones y patrones —esfuerzo que no da fruto, un objetivo que no cuadra con las horas, una decisión que choca con otra—. Ante la duda, `{"aviso": null}`.

### Bus de cambios

`STATE.changeBus` (en `index.html`) registra qué ha cambiado, no solo que algo ha cambiado: `{t, op, entity, id, label, src}`. No se pinta en ninguna parte. Sirve para que la IA pueda recibir un delta compacto en vez del plan entero, y para dar un disparador preciso a las comprobaciones deterministas. Se alimenta pasando un descriptor opcional a `saveState({op, entity, id, label})`; llamarla sin argumento sigue funcionando igual que siempre.

### Cambiar el system prompt de la IA

En `index.html`, función `getIaSystemPrompt()` — al principio de la sección `IA — system prompt + send`.

### Actualizar `lastmod` del sitemap

Edita `sitemap.xml` y cambia la fecha cuando hagas cambios significativos. Esto ayuda a Google a priorizar el re-rastreo.

### Borrar todos los datos guardados (debug)

Desde la consola del navegador:
```js
localStorage.removeItem('plan_miradapropia')
```

O desde la app: botón **datos → borrar todo**.

---

## Solución de problemas

### Error 404 al hablar con la IA

La función serverless no se encuentra. Puede deberse a:

- **Estás abriendo el `index.html` directamente desde el disco** — la IA solo funciona cuando se sirve a través de Netlify (o `netlify dev` en local). Funcionalidades como el calendario, notas, temporizador, exportación, etc. funcionan offline.
- **La carpeta `netlify/edge-functions/` no se subió al repositorio** — verifica que esté en GitHub.
- **El despliegue no detectó la función** — en el dashboard de Netlify, ve a *Functions* y comprueba que `claude` aparece en la lista.

### Error 500 / "ANTHROPIC_API_KEY no está configurada"

- Ve a *Site settings → Environment variables* y añade la variable `ANTHROPIC_API_KEY` con tu clave (`sk-ant-...`)
- Después: *Deploys → Trigger deploy → Clear cache and deploy site* para que tome el cambio
- Si la clave ya está, comprueba que no tenga espacios ni saltos de línea

### Error de la API (rate limit, modelo no encontrado, etc)

- **Rate limit**: espera unos segundos y reintenta
- **Modelo no encontrado**: el identificador del modelo en `index.html` (`claude-sonnet-4-6`) puede haber cambiado. Consulta los modelos disponibles en [docs.claude.com](https://docs.claude.com/en/docs/about-claude/models/overview)
- **Insufficient credits**: añade saldo en [console.anthropic.com](https://console.anthropic.com)

### "A listener indicated an asynchronous response..."

Este error viene de **una extensión del navegador** (típicamente un bloqueador de anuncios o gestor de contraseñas), no del código de la app. Puedes ignorarlo. Para silenciarlo, prueba el sitio en una ventana de incógnito.

### El plan se borra al recargar

- Comprueba que no estés en modo incógnito (no persiste localStorage)
- Algunos navegadores limpian localStorage al cerrar — revisa los ajustes de privacidad
- Haz copias de seguridad periódicas con *datos → exportar*

---

## Tecnología

- **HTML/CSS/JS vanilla** — sin frameworks, sin build, sin transpilación
- **localStorage** — persistencia local (límite ~5–10 MB por dominio)
- **Netlify Edge Function** (Deno) — proxy con streaming SSE, para esquivar el timeout de 10 s de las Functions normales
- **Anthropic Claude API** — para el motor de IA
- **Inter** (Google Fonts) — única dependencia externa de runtime

---

## Privacidad

- **Tus datos nunca salen de tu navegador** salvo cuando hablas con la IA: en ese caso se envían a Anthropic, vía la Edge Function, tu mensaje, los archivos adjuntos y un resumen del plan (asignaturas, medias, nota objetivo y horas registradas), solo para generar la respuesta
- **No hay tracking** — sin Google Analytics, sin cookies, sin pixels
- **No hay cuentas** — la app es funcional sin registro
- **No hay servidor de datos** — los datos están solo en tu navegador

Si borras los datos del navegador o cambias de dispositivo, perderás tu plan. Usa la opción **datos → exportar** para hacer copias de seguridad periódicas.

---

## Licencia

© 2026 miradapropia · todos los derechos reservados.
