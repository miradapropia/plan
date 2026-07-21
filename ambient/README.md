# ambient — modo ambiente

Esta carpeta contiene los recursos del modo ambiente (video lofi de fondo + poster).

## archivos

> estado actual (2026-07-21): `lofi-v2.mp4` (~10 MB, H.264 720p, crf 26, sin audio) vive en esta carpeta y se sirve desde Netlify (`AMBIENT_VIDEO = 'ambient/lofi-v2.mp4'`). sustituye a la antigua release de ~279 MB, ya no usada. el póster es `lofi-poster-v2.jpg` (~106 KB, 1280×720).

- `lofi.mp4` — video que se reproduce en bucle como fondo del modo ambiente. Recomendado: H.264, 1080p, 1-2 Mbps, **sin audio**, duración 10-15 min en bucle suave. Tamaño objetivo: ~50-150 MB.
- `lofi-poster.png` — primera frame del video. Se usa cuando el usuario tiene `prefers-reduced-motion` activado o cuando el video aún no se ha cargado. JPG 1920×1080, 80% calidad, ~200-400 KB.

## cómo cambiar el video

Como Netlify cachea estos archivos durante 30 días, si subes un archivo con el mismo nombre los usuarios verán el viejo de su caché. Hay dos opciones:

### opción a (recomendada) — versionado en el nombre

1. Sube el video nuevo como `lofi-v2.mp4` (luego `lofi-v3.mp4`, etc).
2. En `index.html`, busca la línea `const AMBIENT_VIDEO = 'ambient/lofi.mp4'` y cámbiala a `'ambient/lofi-v2.mp4'`.
3. Genera el nuevo poster con: `ffmpeg -i lofi-v2.mp4 -ss 00:00:05 -vframes 1 lofi-poster-v2.png`
4. Cambia también `const AMBIENT_POSTER = 'ambient/lofi-poster.png'` a la versión nueva.
5. Push a GitHub → Netlify auto-deploya.

### opción b — sustituir el archivo

1. Sube el archivo nuevo con el mismo nombre.
2. En el dashboard de Netlify, ve a *Deploys → Trigger deploy → Clear cache and deploy site*.
3. Los usuarios verán el video nuevo gradualmente conforme expira su caché (hasta 30 días).

## generar el poster desde el video

Si tienes `ffmpeg` instalado:

```bash
ffmpeg -i lofi.mp4 -ss 00:00:05 -vframes 1 -q:v 2 lofi-poster.png
```

`-ss 00:00:05` toma el frame del segundo 5 (suele ser más interesante que el frame 0).

## optimizar un video grande

Si tu video master pesa demasiado:

```bash
ffmpeg -i master.mp4 -c:v libx264 -preset slow -crf 26 -an -movflags +faststart lofi.mp4
```

- `-crf 26` controla calidad (18=alta, 28=baja). 24-26 suele ser buen punto medio.
- `-an` quita el audio.
- `-movflags +faststart` mueve los metadatos al principio del archivo para que empiece a reproducirse antes.
