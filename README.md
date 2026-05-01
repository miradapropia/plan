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
   - **Functions directory:** `netlify/functions` *(autodetectado por `netlify.toml`)*
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
└── netlify/
    └── functions/
        └── claude.js           ← Proxy serverless para la API de Anthropic
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

En `index.html`, busca `claude-sonnet-4-6` y reemplaza por el modelo deseado:

- `claude-sonnet-4-6` — actual (recomendado: equilibrio coste/calidad)
- `claude-opus-4-7` — más capaz, más caro
- `claude-haiku-4-5-20251001` — más rápido y barato

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

## Tecnología

- **HTML/CSS/JS vanilla** — sin frameworks, sin build, sin transpilación
- **localStorage** — persistencia local (límite ~5–10 MB por dominio)
- **Netlify Functions** — proxy serverless para ocultar la API key
- **Anthropic Claude API** — para el motor de IA
- **Inter** (Google Fonts) — única dependencia externa de runtime

---

## Privacidad

- **Tus datos nunca salen de tu navegador** salvo cuando hablas con la IA, donde el contenido del mensaje (no el state completo) se envía a Anthropic vía la función serverless
- **No hay tracking** — sin Google Analytics, sin cookies, sin pixels
- **No hay cuentas** — la app es funcional sin registro
- **No hay servidor de datos** — los datos están solo en tu navegador

Si borras los datos del navegador o cambias de dispositivo, perderás tu plan. Usa la opción **datos → exportar** para hacer copias de seguridad periódicas.

---

## Licencia

© 2026 miradapropia · todos los derechos reservados.
