(function () {
  'use strict';
  if (window.__pjmAutosBridge) return;
  window.__pjmAutosBridge = true;

  var _open = window.open;
  window.open = function (url, name, features) {
    try {
      var u = (typeof url === 'string') ? url : (url && url.href) || '';
      var semGesto = !(navigator.userActivation && navigator.userActivation.isActive);
      if (u && /listAutosDigitais\.seam/i.test(u) && semGesto) {
        window.postMessage({ __pjmOpenAutos: String(u) }, location.origin);
        return null; // o pop-up seria bloqueado; a extensao abre via tabs.create
      }
    } catch (_) { console.warn('[PJM autos-open-bridge]', _); }
    return _open.apply(this, arguments);
  };

  console.log('[PJM autos-bridge] ativo em', location.href.slice(0, 60));
})();
