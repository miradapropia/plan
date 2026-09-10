# CLAUDE.md

Guía de trabajo para Claude Code en este repositorio. Está escrita **a partir del
código que ya existe**: los tokens de `mp.css` en `index.html`, el system prompt
de la IA y la edge function blindada. Si el código y este archivo se contradicen,
gana el código — y entonces hay que corregir este archivo en el mismo commit.

El `README.md` explica el producto y el despliegue. Esto explica cómo tocarlo sin
romperlo.

---

## Qué es

`plan` es un organizador académico para estudiantes de arquitectura, servido en
[plan.miradapropia.org](https://plan.miradapropia.org). Forma parte del ecosistema
de herramientas de miradapropia (de ahí el pie compartido y los tokens comunes).

Tres decisiones lo definen entero:

1. **Un solo archivo.** `index.html` son ~8.000 líneas con HTML, CSS y JS. Sin
   framework, sin build, sin transpilación, sin `node_modules`. Editar el archivo
   *es* desplegar.
2. **Los datos son del estudiante.** Todo vive en `localStorage`. No hay servidor
   de datos, ni cuentas, ni tracking. Lo único que sale del navegador es lo que se
   manda a la IA.
3. **Los tokens cuestan dinero real.** Hay una jerarquía estricta de coste (capa
   0 → capa 1 → conversación) y todas las decisiones de arquitectura de la IA
   cuelgan de ahí.

---

## Mapa del repositorio

```
index.html                     toda la app (HTML + CSS + JS)
netlify/edge-functions/claude.js   el proxy blindado a la API de Anthropic (/api/claude)
netlify.toml                   headers, CSP, caché
robots.txt                     permite a propósito los bots de IA
sitemap.xml                    una sola URL; actualiza lastmod en cambios grandes
herramientas/                  scripts python que generaron la paleta (no se despliegan)
ambient/                       video y poster del modo ambiente
```

### Dentro de `index.html`

Las secciones van marcadas con banderines `// ═══`. Las que más se tocan:

| Zona | Dónde | Qué hay |
|---|---|---|
| tokens `mp.css` | `:root` (~línea 149) | paleta, tipos de curva, duraciones |
| `--cat-*` | ~línea 173 y 203 | espejo CSS de `SUBJECT_COLORS` (claro y noche) |
| seguridad | `esc`, `sanitizeState` (~2457) | escapado y saneado |
| bus de cambios | `pushChange` (~2573) | qué ha cambiado, no solo que algo cambió |
| persistencia | `saveState` (~2619) | guardar + propagar + alimentar el bus |
| navegación | `switchView` (~4309) | eje temporal, historial, teclado |
| propagación | `propagar` (~4425) | repintado coalescido por frame |
| capa 0 | `computeAvisos` (~4479) | avisos deterministas, coste cero |
| capa 1 | `ejecutarCapa1` (~4714) | vigilante de fondo en haiku |
| system prompt | `IA_SYSTEM_STATIC` (~6619) | el bloque cacheable |
| envío a la IA | `sendMsg` (~6828) | streaming SSE y manejo de errores |
| importación | `importAIPlan` (~7101) | volcar el JSON del modelo al estado |

---

## Cómo verificar un cambio

No hay tests ni linter. Lo que sí hay:

```bash
# sintaxis del js embebido (extrae el <script> grande y lo pasa por node)
node -e "
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const re=/<script(?![^>]*type=\"application\/ld\+json\")(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;
let m,i=0; while((m=re.exec(html))) fs.writeFileSync('/tmp/b'+(i++)+'.js', m[1]);
" && for f in /tmp/b*.js; do node --check "$f"; done

# la app con la IA funcionando (necesita ANTHROPIC_API_KEY en el entorno)
netlify dev
```

Sin `netlify dev`, abrir `index.html` desde el disco funciona para todo **menos**
la IA: `/api/claude` da 404 y `sendMsg()` ya lo explica con ese texto.

Comprobaciones manuales que merecen la pena antes de subir algo grande: crear una
asignatura, arrastrar un bloque en la vista semana, cambiar la nota objetivo (que
repinte la barra lateral y los avisos), y recargar para confirmar que el estado
sobrevive.

---

## Reglas de la casa

Están sacadas de los comentarios del propio código. Romper una de estas es un
error, no una preferencia.

### Fechas

**Nunca `toISOString()` para una clave de día.** Convierte a UTC y desfasa el día
entre las 00:00 y las 02:00 en hora peninsular. Usa `fmtDate(d)` para escribir y
`parseDate(s)` para leer: `new Date('YYYY-MM-DD')` se interpreta como UTC y resta
un día en zonas UTC−.

`toISOString()` sí vale para un instante con zona (los `DTSTART` con hora del ICS
salen en UTC con `Z` a propósito).

### Escapado

Los textos **se guardan crudos y se escapan al pintar**, siempre con `esc()`. Todo
lo que entra desde fuera —importar una copia, la respuesta de la IA, el propio
`localStorage`— pasa por `sanitizeState()` antes de tocar `STATE`.

Los handlers inline (`onclick="..."`) solo pueden llevar **números o ids ya
saneados** (`SAFE_ID_RE`). Ningún título de entrega ni nombre de asignatura entra
nunca en un atributo: para eso está el registro `AVISOS_ACTIVOS`, que hace que los
handlers de los avisos lleven solo un índice.

### Color

`SUBJECT_COLORS` (js) es la fuente; `--cat-1…10` (css) es su espejo, en claro y en
noche. **Si cambias uno, cambia el otro en el mismo commit** o el CSS y el JS se
separan en silencio.

La paleta v3 está construida en LCh con restricciones, no elegida a ojo: L\* 43–49,
C\* 20–30, ordenada por distinción (quien tiene 4 asignaturas recibe las 4 más
separadas entre sí). Para regenerarla y comprobar las métricas: `herramientas/refina.py`.

`safeColor()` migra los colores de la v2 por **cercanía de tono**. No lo conviertas
en un mapa por posición: quien tenía proyectos en azul lo sigue teniendo en azul.

Y la regla de fondo: **el color solo puede existir como dato.** El cromo de
interfaz (pestañas, puntos de estado, bordes) va en tinta. Cuando el color marca
un nivel —urgente, aviso— va siempre acompañado de glifo y texto: nunca es el
único canal.

### Formas y movimiento

Escalera de radios: **4 · 8 · 12 · 18**. Al añadir una superficie, usa uno de los
cuatro (`--r` es 8px). No inventes un quinto peldaño.

**Todo lo pulsable se hunde al pulsar**, sin excepción: `transform:scale(.97)`, y
`.9` en los elementos de ~20px. Sin color de acento que confirme la pulsación,
este acuse de recibo es la única microrrecompensa que tiene la interfaz.

Las cuatro vistas son un **eje de zoom** sobre el tiempo, no cuatro páginas: al
acercarte el contenido viene hacia ti (`zoom-in`), al alejarte se asienta
(`zoom-out`). Solo `transform` y `opacity`, para que vaya a 60 fps.

Usa los tokens de duración y curva que existen (`--dur-fast/med/slow`,
`--ease/-out/-spring`). Un `var(--algo)` que no está definido **invalida la
declaración entera** y se pierde en silencio: eso ya ha pasado dos veces aquí.

### Propagación

Todo entra por uno de dos sitios: el estudiante cambia algo (`saveState`) o habla
con la IA (`sendMsg`). Ambos llaman a `propagar()`, que repinta **toda** la
interfaz en el siguiente frame y coalesce una ráfaga de veinte cambios en un solo
repintado.

**Quien muta no debería tener que acordarse de repintar.** Al añadir una mutación
nueva no llames a `renderAll()` por tu cuenta y ya está: pásale un descriptor a
`saveState({op, entity, id, label})`. El repintado ya está cubierto; lo que hay
que declarar es *qué* cambió, para que llegue al bus.

Convención del bus: `op` ∈ `add|update|delete|done|log`, `entity` ∈
`subject|event|schedule|note|session|target|plan`, `src` ∈ `user|ia`.

### El coste de la IA

Tres capas, y la regla que las ordena: **ningún token se gasta en algo que una
función puede decidir.**

- **Capa 0 — `computeAvisos()`.** Determinista, coste cero, latencia cero. Se
  recalcula entera en cada `renderAll()`. Antes de subir una comprobación a un
  modelo, intenta bajarla aquí.
- **Capa 1 — `ejecutarCapa1()`.** Haiku, ~0,0013 $ por chequeo. Gasta dinero en
  algo que el estudiante **no ha pedido**, así que las guardas pesan más que la
  funcionalidad: no corre con la barra de IA abierta, ni con un pomodoro en
  marcha, ni con la pestaña oculta, ni sin conexión, ni si capa 0 ya tiene un
  aviso urgente, ni con menos de 3 cambios estructurales, ni antes de 20 minutos
  del último chequeo, ni pasados 4 al día. Si añades una guarda, añádela; si
  quitas una, explica por qué.
- **Conversación — `sendMsg()`.** Sonnet. Es la única capa que el estudiante pide
  explícitamente.

Cuidado con la distinción **estructural / rutina** (`esCambioEstructural`): mover
una entrega o tocar una nota objetivo cambia la forma del plan; marcar hecho,
guardar un enlace o escribir una nota es progreso e higiene. Solo lo estructural
despierta al vigilante. Marcar doce tareas en una tarde buena no cuesta nada, y
esa es la diferencia entre gastar y no gastar.

Un fallo de capa 1 es **silencioso de cara al estudiante**, con traza en
`console.debug`. Un chequeo de fondo nunca puede enseñarle un error a nadie.

### El system prompt

Viaja en **dos bloques y el orden importa**:

1. `IA_SYSTEM_STATIC` — invariante, ~3.300 tokens, marcado con `cache_control`
   efímero. Es el prefijo cacheable: las lecturas de caché se facturan a 0,1x la
   tarifa de entrada, y Sonnet exige un mínimo de 2.048 tokens para cachear.
2. El contexto del estudiante (`getIaContext()`) — cambia en cada petición, así
   que va **detrás**.

**No metas nada volátil en el bloque 1.** Ni una fecha, ni un contador, ni estado
del plan. Si el prefijo deja de coincidir, no se cachea nada: es exactamente lo
que pasaba hasta agosto de 2026, cuando el contexto iba en medio.

Sobre el contenido del prompt, dos cosas que no son estilo sino contrato:

- **El tono es parte del producto.** Minúsculas, cercano y directo, sin emojis
  nunca, respuestas breves (máximo 4 frases si no hay JSON). Es el mismo tono que
  usa toda la interfaz.
- **El JSON es el único canal que crea cosas.** Sin bloque ` ```json ` no se crea
  nada. Por eso el prompt insiste tanto en actuar de inmediato en vez de proponer:
  quedarse en una propuesta deja el plan vacío, que es justo lo que el estudiante
  no quiere. Solo se propone antes de **borrar** o reorganizar a fondo un plan
  lleno.

Si cambias el formato del JSON en el prompt, cambia `importAIPlan()` en el mismo
commit: son las dos mitades del mismo contrato.

### La función blindada

`netlify/edge-functions/claude.js`. Es una **Edge Function** (Deno), no una
Function normal, porque las estándar del tier gratuito se cortan a los 10 segundos
y el streaming no evita ese límite.

Lo que la blinda, y que no se debe aflojar sin motivo:

- **El cliente declara una intención, no un modelo.** La tabla `INTENTS` traduce
  `chat`/`ingest`/`check` a modelo y techo de tokens. El modelo que pida el
  cliente se ignora por completo. Una intención desconocida cae en `chat`.
- **Lista blanca de campos.** Solo `model`, `max_tokens`, `stream`, `messages` y
  `system` viajan a la API. Si necesitas mandar un campo nuevo, añádelo
  explícitamente a `outbound`.
- **`Origin` obligatorio.** Los navegadores siempre lo mandan en un POST hecho con
  `fetch()`; una petición sin `Origin` viene de curl o de un bot. Los previews
  `*.netlify.app` solo se aceptan si son de este mismo sitio.
- **Solo el primer bloque de `system` puede pedir caché, y siempre efímera.** Así
  el cliente no puede pedir la caché de 1 hora, que se factura al doble en
  escritura.
- **Presupuesto diario fail-open.** `MAX_REQUESTS_PER_CLIENT_DAY` (300) y
  `MAX_REQUESTS_GLOBAL_DAY` (3000), en Netlify Blobs. Si Blobs falla o tarda más
  de 700 ms, **la petición pasa igual**. Un fallo de contadores nunca puede dejar
  a un estudiante sin IA: esa prioridad no se negocia.

`max_tokens` es un **techo, no una reserva**: solo se paga lo que se genera. Por
eso los techos de las intenciones de usuario son generosos a propósito.

### Seguridad del navegador

La CSP de `netlify.toml` está **activa** (enforcing) y **sin `unsafe-eval`**. Eso
es posible porque pdf.js corre con `isEvalSupported:false`, que además mitiga
CVE-2024-4367 (pdfjs-dist 4.0.379). `enableScripting` y `enableXFA` también a
false: no se ejecuta javascript embebido en un PDF.

Si añades un recurso externo, hay que añadirlo a la CSP; si no, falla en silencio
en producción y funciona en local. El inventario actual: jsDelivr (pdf.js),
Google Fonts, y los tres reproductores embebidos (Spotify, YouTube-nocookie,
SoundCloud) filtrados por `EMBED_HOSTS_RE`.

### SEO y texto servido

El bloque `#que-es` va **debajo** de la app, en el DOM y visible. Por eso `html`
lleva `overflow:hidden` pero `body` scrollea: si el body no se pudiera desplazar,
ese texto estaría en el DOM pero sería inalcanzable — texto oculto, que es justo
lo que Google penaliza.

**El `FAQPage` en JSON-LD y el texto de `#que-es` dicen lo mismo.** Si editas uno,
edita el otro: un FAQPage que no coincide con el texto visible es motivo de
penalización. Lo mismo vale para el `featureList` del `WebApplication`: no
prometas ahí nada que la app no haga.

`robots.txt` **permite a propósito** a GPTBot, CCBot, ClaudeBot y compañía. Plan no
tiene búsqueda propia detrás: la citación por asistentes de IA es su único canal
orgánico. No vuelvas a bloquearlos "por seguridad".

---

## Trampas conocidas

- **No hay service worker.** La app no se puede abrir sin conexión; sigue
  funcionando mientras la pestaña esté abierta (salvo la IA). No prometas más que
  eso en el texto servido.
- **`localStorage` se llena.** `saveState()` guarda una copia aligerada: quita los
  base64 de los adjuntos de `iaMessages` y deja una nota. La copia en memoria sí
  conserva el contenido completo durante la sesión.
- **El video del modo ambiente se cachea 30 días.** Para cambiarlo, versiona el
  nombre (`lofi-v3.mp4`) y actualiza `AMBIENT_VIDEO` y `AMBIENT_POSTER`. Ver
  `ambient/README.md`.
- **`netlify.toml` declara `functions = "netlify/functions"`**, un directorio que
  no existe. Es inofensivo —las edge functions se autodetectan en
  `netlify/edge-functions/`— pero no te confunda al buscar.
- **Predecir sobre datos incompletos da disparates.** Si los pesos de evaluación
  no suman ~100%, cualquier predicción de nota sale absurda (con un 35% cargado,
  para un 5 "haría falta" un 14,3). Ahí no falta nota, falta información: el aviso
  correcto es el de pesos. `computeAvisos()` ya lleva esa guarda; no la quites.

---

## Antes de subir

- [ ] `node --check` sobre el JS extraído, sin errores.
- [ ] Ningún `var(--token)` que no esté definido en `:root`.
- [ ] Si tocaste `SUBJECT_COLORS`, los `--cat-*` van en el mismo commit (claro y noche).
- [ ] Si tocaste el formato del JSON del prompt, `importAIPlan()` va en el mismo commit.
- [ ] Si tocaste `#que-es`, el `FAQPage` de la cabecera dice lo mismo.
- [ ] Si añadiste un recurso externo, está en la CSP de `netlify.toml`.
- [ ] Si es un cambio significativo, `lastmod` de `sitemap.xml` actualizado.
- [ ] Mensajes de commit en minúsculas, en castellano, diciendo *por qué* y no
      solo *qué* — como los que ya hay.

El despliegue es automático: push a `main` → Netlify.
