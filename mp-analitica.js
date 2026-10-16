/* ═══════════════════════════════════════════════
   mp-analitica.js · analítica del ecosistema miradapropia · v1
   fuente de verdad: este archivo, en el repo guIA. en las demás
   herramientas es una copia literal: no editar allí; editar aquí
   y propagar la copia, igual que mp.css.

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
    /* en el móvil, lo más bajo posible: no debe tapar el primer botón de compra del comparador */
    '@media (max-width:480px){.mp-ck{left:12px;right:12px;bottom:12px;padding:12px 14px;gap:10px;' +
      'font-size:12px;line-height:1.45}.mp-ck-b{width:100%}.mp-ck button{flex:1;padding:8px 14px}}' +
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

  function mostrar(conFoco) {
    if (!document.body) return;
    if (!aviso) aviso = crearAviso();
    aviso.hidden = false;
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
    mostrar(true);
  });

  var gpc = navigator.globalPrivacyControl === true;
  var eleccion = leer();
  if (eleccion === 'si' && !gpc) {
    cargar();
  } else if (eleccion === null && !gpc) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { mostrar(false); });
    } else {
      mostrar(false);
    }
  }
})();
