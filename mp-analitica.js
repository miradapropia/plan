/* ═══════════════════════════════════════════════
   mp-analitica.js · analítica del ecosistema miradapropia · v3
   fuente de verdad: este archivo, en el repo guIA. en las demás
   herramientas es una copia literal: no editar allí; editar aquí
   y propagar la copia, igual que mp.css.
   v1 · 16/10/2026: ga solo con consentimiento.
   v2 · 01/11/2026: mpMedir y el evento clic_ecosistema.
   v3 · 03/11/2026: el aviso espera al primer desplazamiento de la
        página (o a 8 s sin desplazarse) y en el móvil es compacto,
        para no tapar lo primero que se usa (el primer «ver precio»
        del comparador, el campo de pregunta de guIA). el enlace
        «cookies» del pie lo sigue abriendo al momento.

   qué hace
   - google analytics 4 (G-0NSDDT1H5Z, la misma propiedad que la
     web) solo se carga si la persona acepta. sin respuesta, con
     rechazo o con la señal gpc del navegador no se carga nada de
     google.
   - la elección vale para todo *.miradapropia.org (cookie
     mp_analitica, 180 días) y se cambia desde el enlace «cookies»
     del pie: cualquier elemento con data-mp-cookies abre el aviso.
     su href lleva a la política de cookies, por si este archivo
     no llega a cargar.
   - a google solo viaja la dirección sin parámetros (salvo utm_*)
     ni #: nada de lo que se escribe en la herramienta. sin señales
     de google ni personalización de anuncios.
   - solo actúa en *.miradapropia.org: en local y en las previews
     de netlify no hace nada.
   - el aviso no sale al cargar: espera a que la persona desplace la
     página (rueda, dedo, teclado o barra; no cuenta el desplazamiento
     que haga la propia herramienta) o a 8 s sin desplazarse. en el
     móvil (480 px o menos) es compacto: el mismo texto en letra de
     11 px (tres líneas a 390 px) y los dos botones, del mismo tamaño,
     en una fila debajo.
   - sale abajo en el centro, salvo que ahí tape más controles que
     en otro sitio (los campos de texto y los botones rellenos pesan
     más): entonces va abajo a un lado, en pantallas anchas, o arriba,
     debajo de la cabecera fija de la herramienta.

   medición
   - window.mpMedir(nombre, parametros, unaVez) manda un evento a ga
     solo si la persona ha aceptado; si no, no hace nada ni guarda
     nada para después. claves en minúsculas y valores de una lista
     cerrada de la herramienta (60 caracteres como mucho): nunca
     texto escrito por la persona. con unaVez, el mismo evento con
     los mismos parámetros sale una sola vez por página cargada.
     este archivo carga el último y fuera de *.miradapropia.org no
     existe, así que las herramientas lo llaman siempre con guarda:
       if (window.mpMedir) mpMedir('uso', { accion: 'nota' }, true);
   - clic_ecosistema lo mide este archivo solo, en las once: un clic
     en un enlace a otra parte de miradapropia.org (otra herramienta,
     la web o la newsletter), con destino (el subdominio, o «web»)
     y zona (pie, cabecera, aviso o cuerpo).
   - en ga (administrar, definiciones personalizadas) se dan de alta
     como dimensiones de evento accion, detalle, destino y zona.

   requisitos donde hay csp (netlify.toml)
   - script-src  https://*.googletagmanager.com
   - connect-src https://*.google-analytics.com
                 https://*.analytics.google.com
                 https://*.googletagmanager.com
   - img-src     https://*.google-analytics.com
                 https://*.googletagmanager.com
   - style-src 'unsafe-inline' (el aviso inyecta su <style>)

   se carga una vez por página, al final del body:
   <script src="/mp-analitica.js" defer></script>
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  var ID = 'G-0NSDDT1H5Z';
  var COOKIE = 'mp_analitica';
  var DIAS = 180;
  var POLITICA = 'https://miradapropia.org/politica-de-cookies-ue/';

  if (!/(^|\.)miradapropia\.org$/.test(location.hostname)) return;
  if (window.__mpAnalitica) return;
  window.__mpAnalitica = true;

  var cargado = false;
  var aviso = null;

  function leer() {
    var m = document.cookie.match(/(?:^|;\s*)mp_analitica=(si|no)(?:;|$)/);
    return m ? m[1] : null;
  }

  function guardar(valor) {
    document.cookie = COOKIE + '=' + valor + '; domain=.miradapropia.org; path=/; max-age=' +
      (DIAS * 86400) + '; SameSite=Lax; Secure';
  }

  function direccion() {
    var limpia = new URLSearchParams();
    new URLSearchParams(location.search).forEach(function (valor, clave) {
      if (/^utm_(source|medium|campaign|term|content)$/.test(clave)) limpia.set(clave, valor);
    });
    var qs = limpia.toString();
    return location.origin + location.pathname + (qs ? '?' + qs : '');
  }

  function borrarCookiesGA() {
    document.cookie.split(';').forEach(function (par) {
      var nombre = par.split('=')[0].trim();
      if (nombre === '_ga' || nombre.indexOf('_ga_') === 0) {
        document.cookie = nombre + '=; domain=.miradapropia.org; path=/; max-age=0';
        document.cookie = nombre + '=; path=/; max-age=0';
      }
    });
  }

  function cargar() {
    window['ga-disable-' + ID] = false;
    if (cargado) {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
      return;
    }
    cargado = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted'
    });
    window.gtag('js', new Date());
    window.gtag('config', ID, {
      page_location: direccion(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
  }

  function parar() {
    window['ga-disable-' + ID] = true;
    if (cargado) window.gtag('consent', 'update', { analytics_storage: 'denied' });
    borrarCookiesGA();
  }

  var enviados = {};

  function medir(nombre, parametros, unaVez) {
    if (!cargado || window['ga-disable-' + ID] || typeof window.gtag !== 'function') return;
    if (!/^[a-z_]{1,40}$/.test(String(nombre))) return;
    var limpio = {};
    Object.keys(parametros || {}).forEach(function (clave) {
      var valor = parametros[clave];
      if (!/^[a-z_]{1,24}$/.test(clave)) return;
      if (typeof valor === 'number' && isFinite(valor)) limpio[clave] = valor;
      else if (typeof valor === 'string' && valor) limpio[clave] = valor.slice(0, 60);
    });
    if (unaVez) {
      var huella = nombre + '|' + JSON.stringify(limpio);
      if (enviados[huella]) return;
      enviados[huella] = true;
    }
    window.gtag('event', nombre, limpio);
  }
  window.mpMedir = medir;

  // a qué parte del ecosistema lleva un enlace: el subdominio, «web» o null si es esta misma o de fuera
  function destinoDe(host) {
    if (host === location.hostname || !/(^|\.)miradapropia\.org$/.test(host)) return null;
    if (host === 'miradapropia.org' || host === 'www.miradapropia.org') return 'web';
    return host.replace(/\.miradapropia\.org$/, '');
  }

  document.addEventListener('click', function (e) {
    if (!cargado) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('data-mp-cookies')) return;
    var destino;
    try { destino = destinoDe(new URL(a.href, location.href).hostname.toLowerCase()); } catch (er) { return; }
    if (!destino) return;
    var zona = a.closest('.mp-ck') ? 'aviso'
      : a.closest('.mp-foot, footer') ? 'pie'
      : a.closest('header, nav, .mp-head') ? 'cabecera' : 'cuerpo';
    medir('clic_ecosistema', { destino: destino, zona: zona });
  });

  var CSS =
    '.mp-ck{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;' +
      'max-width:560px;margin:0 auto;box-sizing:border-box;' +
      'display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;padding:16px 18px;' +
      'background:var(--paper-pure,#ffffff);color:var(--ink,#1d1d1f);' +
      'border:1px solid var(--g-200,#d2d2d7);border-radius:var(--radius-lg,18px);' +
      'box-shadow:var(--shadow-lg,0 4px 16px rgba(0,0,0,.06),0 8px 32px rgba(0,0,0,.08));' +
      'font-family:var(--font,\'Inter\',-apple-system,system-ui,sans-serif);' +
      'font-size:13px;line-height:1.55;font-weight:400;text-align:left;' +
      'opacity:0;transform:translateY(8px);' +
      'transition:opacity var(--dur-med,360ms) var(--ease-out,cubic-bezier(0.16,1,0.3,1)),' +
        'transform var(--dur-med,360ms) var(--ease-out,cubic-bezier(0.16,1,0.3,1))}' +
    '.mp-ck.mp-ck-on{opacity:1;transform:none}' +
    '.mp-ck p{margin:0;flex:1 1 260px;color:var(--g-800,#2c2c2e)}' +
    '.mp-ck a{color:var(--ink,#1d1d1f);text-decoration:none;border-bottom:1px solid var(--g-200,#d2d2d7)}' +
    '.mp-ck a:hover{border-bottom-color:var(--ink,#1d1d1f)}' +
    '.mp-ck-b{display:flex;gap:8px;flex:0 0 auto}' +
    '.mp-ck button{font:inherit;font-size:13px;font-weight:500;line-height:1.2;margin:0;' +
      'padding:9px 18px;cursor:pointer;color:var(--ink,#1d1d1f);background:var(--paper-pure,#ffffff);' +
      'border:1px solid var(--g-200,#d2d2d7);border-radius:var(--radius-md,12px);' +
      'transition:transform var(--dur-micro,120ms) var(--ease,cubic-bezier(0.4,0,0.2,1))}' +
    '.mp-ck button:hover{box-shadow:var(--shadow-hover,0 4px 12px rgba(0,0,0,.08),0 8px 24px rgba(0,0,0,.10))}' +
    '.mp-ck button:active{transform:scale(.97)}' +
    '.mp-ck button:focus-visible,.mp-ck a:focus-visible{outline:none;' +
      'box-shadow:var(--focus-ring,0 0 0 2px #fbfbfd,0 0 0 4px #1d1d1f)}' +
    /* arriba, debajo de la cabecera fija de la herramienta, cuando abajo taparía más */
    '.mp-ck.mp-ck-arriba{bottom:auto;transform:translateY(-8px)}' +
    '.mp-ck.mp-ck-arriba.mp-ck-on{transform:none}' +
    '.mp-ck.mp-ck-lado{margin:0}' +
    /* en el móvil, compacto: el texto en poco alto y los dos botones en una fila */
    '@media (max-width:480px){.mp-ck{left:8px;right:8px;bottom:8px;padding:10px 12px;gap:8px;' +
      'font-size:11px;line-height:1.4;letter-spacing:-.005em;border-radius:var(--radius-md,12px)}' +
      '.mp-ck p{flex-basis:100%}.mp-ck-b{width:100%}' +
      '.mp-ck button{flex:1;font-size:12px;padding:7px 12px}}' +
    '@media (prefers-reduced-motion:reduce){.mp-ck,.mp-ck button{transition:none}}';

  function crearAviso() {
    var estilo = document.createElement('style');
    estilo.textContent = CSS;
    document.head.appendChild(estilo);

    var caja = document.createElement('div');
    caja.className = 'mp-ck';
    caja.setAttribute('role', 'region');
    caja.setAttribute('aria-label', 'aviso de cookies');

    var texto = document.createElement('p');
    texto.appendChild(document.createTextNode(
      'medimos el uso de las herramientas con google analytics, solo si aceptas. ' +
      'no recibe nada de lo que escribes y no se usa para anuncios. '));
    var enlace = document.createElement('a');
    enlace.href = POLITICA;
    enlace.target = '_blank';
    enlace.rel = 'noopener';
    enlace.textContent = 'política de cookies';
    texto.appendChild(enlace);

    var botones = document.createElement('div');
    botones.className = 'mp-ck-b';
    var rechazar = document.createElement('button');
    rechazar.type = 'button';
    rechazar.textContent = 'rechazar';
    var aceptar = document.createElement('button');
    aceptar.type = 'button';
    aceptar.textContent = 'aceptar';
    botones.appendChild(rechazar);
    botones.appendChild(aceptar);

    rechazar.addEventListener('click', function () { guardar('no'); parar(); ocultar(); });
    aceptar.addEventListener('click', function () { guardar('si'); cargar(); ocultar(); });

    caja.appendChild(texto);
    caja.appendChild(botones);
    document.body.appendChild(caja);
    return caja;
  }

  // controles que el aviso no debería tapar: los campos de texto pesan más que el resto
  var CONTROLES = 'a[href],button,input,textarea,select,[role="button"],[contenteditable="true"]';

  function solape(r, x0, x1, y0, y1) {
    var alto = Math.min(r.bottom, y1) - Math.max(r.top, y0);
    var ancho = Math.min(r.right, x1) - Math.max(r.left, x0);
    return alto > 0 && ancho > 0 ? alto * ancho : 0;
  }

  // dónde acaba la cabecera fija o pegada de la herramienta, si la hay
  function bajoCabecera() {
    var fondo = 0;
    var x = window.innerWidth / 2;
    var pila = document.elementsFromPoint ? document.elementsFromPoint(x, 2) : [];
    pila.forEach(function (el) {
      for (var n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        var pos = getComputedStyle(n).position;
        if (pos === 'fixed' || pos === 'sticky') {
          var r = n.getBoundingClientRect();
          if (r.top <= 2 && r.bottom < window.innerHeight * 0.4) fondo = Math.max(fondo, r.bottom);
        }
      }
    });
    return fondo;
  }

  // cuánto pesa tapar un control: los campos de texto y los botones rellenos (los
  // principales, como «ver precio») mucho más que un enlace o un chip
  function pesoDe(el) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return 6;
    var m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    if (m && (m.length < 4 || +m[3] > 0.5) && (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 128) return 6;
    return 1;
  }

  // dónde va: abajo en el centro salvo que otro sitio tape menos controles (por
  // superficie y peso): abajo a la derecha o a la izquierda en pantallas anchas, o
  // arriba, debajo de la cabecera fija de la herramienta
  var SITIOS = ['centro', 'der', 'izq', 'arriba'];

  function colocar() {
    var caja = aviso.getBoundingClientRect();
    var ancho = caja.width;
    var alto = caja.height;
    var margen = parseFloat(getComputedStyle(aviso).bottom) || 16;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var techo = bajoCabecera() + margen;
    var abajo = [vh - margen - alto, vh - margen];
    var zonas = {
      centro: [caja.left, caja.right, abajo[0], abajo[1]],
      der: [vw - margen - ancho, vw - margen, abajo[0], abajo[1]],
      izq: [margen, margen + ancho, abajo[0], abajo[1]],
      arriba: [caja.left, caja.right, techo, techo + alto]
    };
    var lado = vw - 2 * margen - ancho > 40;
    var peso = { centro: 0, der: 0, izq: 0, arriba: 0 };
    var lista = document.querySelectorAll(CONTROLES);
    for (var i = 0; i < lista.length; i++) {
      var el = lista[i];
      if (aviso.contains(el) || el.type === 'hidden') continue;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > vh) continue;
      var k = 0;
      SITIOS.forEach(function (s) {
        var z = zonas[s];
        var a = solape(r, z[0], z[1], z[2], z[3]);
        if (a) peso[s] += (k || (k = pesoDe(el))) * a;
      });
    }
    var sitio = 'centro';
    SITIOS.forEach(function (s) {
      if ((s === 'der' || s === 'izq') && !lado) return;
      if (peso[s] < peso[sitio]) sitio = s;
    });
    aviso.classList.toggle('mp-ck-arriba', sitio === 'arriba');
    aviso.classList.toggle('mp-ck-lado', sitio === 'der' || sitio === 'izq');
    aviso.style.top = sitio === 'arriba' ? techo + 'px' : '';
    aviso.style.width = sitio === 'der' || sitio === 'izq' ? ancho + 'px' : '';
    aviso.style.left = sitio === 'der' ? 'auto' : sitio === 'izq' ? margen + 'px' : '';
    aviso.style.right = sitio === 'izq' ? 'auto' : sitio === 'der' ? margen + 'px' : '';
  }

  function mostrar(conFoco) {
    if (!document.body) return;
    if (!aviso) aviso = crearAviso();
    aviso.hidden = false;
    aviso.classList.remove('mp-ck-arriba', 'mp-ck-lado');
    aviso.style.top = aviso.style.width = aviso.style.left = aviso.style.right = '';
    colocar();
    requestAnimationFrame(function () { aviso.classList.add('mp-ck-on'); });
    if (conFoco) aviso.querySelector('button').focus();
  }

  function ocultar() {
    if (!aviso) return;
    aviso.classList.remove('mp-ck-on');
    aviso.hidden = true;
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-mp-cookies]') : null;
    if (!t) return;
    e.preventDefault();
    quitarEspera();
    mostrar(true);
  });

  // el aviso espera a la primera señal de lectura: un desplazamiento hecho por la
  // persona (rueda, dedo, teclas de desplazamiento o la barra) o 8 s sin desplazarse.
  // el desplazamiento que hace la herramienta sola (bajar un chat, un ancla) no cuenta.
  var ESPERA = 8000;
  var TECLAS = /^(ArrowDown|ArrowUp|PageDown|PageUp|End|Home| |Spacebar)$/;
  var espera = null;
  var pulsado = false;

  function quitarEspera() {
    if (espera === null) return;
    clearTimeout(espera);
    espera = null;
    window.removeEventListener('wheel', alLeer, true);
    window.removeEventListener('touchmove', alLeer, true);
    window.removeEventListener('keydown', alTeclear, true);
    window.removeEventListener('pointerdown', alPulsar, true);
    window.removeEventListener('pointerup', alSoltar, true);
    window.removeEventListener('scroll', alDesplazar, true);
  }
  function salir() {
    if (espera === null) return;
    quitarEspera();
    if (leer() === null) mostrar(false);
  }
  function alLeer() { salir(); }
  function alTeclear(e) {
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (TECLAS.test(e.key)) salir();
  }
  function alPulsar() { pulsado = true; }
  function alSoltar() { pulsado = false; }
  function alDesplazar() { if (pulsado) salir(); }

  function esperar() {
    var o = { capture: true, passive: true };
    espera = setTimeout(salir, ESPERA);
    window.addEventListener('wheel', alLeer, o);
    window.addEventListener('touchmove', alLeer, o);
    window.addEventListener('keydown', alTeclear, true);
    window.addEventListener('pointerdown', alPulsar, true);
    window.addEventListener('pointerup', alSoltar, true);
    window.addEventListener('scroll', alDesplazar, o);
  }

  var gpc = navigator.globalPrivacyControl === true;
  var eleccion = leer();
  if (eleccion === 'si' && !gpc) {
    cargar();
  } else if (eleccion === null && !gpc) {
    esperar();
  }
})();
