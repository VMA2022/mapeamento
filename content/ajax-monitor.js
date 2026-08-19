(function () {
  'use strict';
  if (window.__pjmAjaxMonitor) return;
  window.__pjmAjaxMonitor = true;

  var ativos = 0;
  function publicar() {
    try {
      if (document.documentElement) document.documentElement.dataset.pjmAjax = String(ativos);
    } catch (_) { console.warn('[PJM ajax-monitor]', _); }
  }
  function inc() { ativos++; publicar(); }
  function dec() { ativos = Math.max(0, ativos - 1); publicar(); }
  publicar();

  // (authorization/x-pje-cookies/x-pje-legacy-app/x-no-sso). A sessão vai no
  // x-pje-cookies porque o cookie é cross-site. A coleta reusa esses headers.
  function capturarHeaders(url, h) {
    try {
      if (!url || !h || !/\/pje-legacy\/painelUsuario\//.test(String(url))) return;
      if (!h['x-pje-cookies'] && !h['authorization']) return;
      var pkg = {};
      ['authorization', 'x-pje-cookies', 'x-pje-legacy-app', 'x-no-sso'].forEach(function (k) { if (h[k]) pkg[k] = h[k]; });
      if (Object.keys(pkg).length) window.postMessage({ __pjmApiHeaders: pkg, ts: Date.now() }, location.origin);
    } catch (_) { /* noop */ }
  }

  try {
    var _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try { this.__pjmUrl = url; this.__pjmHdrs = {}; } catch (_) { /* noop */ }
      return _open.apply(this, arguments);
    };
    var _setHdr = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
      try { if (this.__pjmHdrs) this.__pjmHdrs[String(k).toLowerCase()] = v; } catch (_) { /* noop */ }
      return _setHdr.apply(this, arguments);
    };
    var _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      inc();
      try { capturarHeaders(this.__pjmUrl, this.__pjmHdrs); } catch (_) { /* noop */ }
      var liberado = false;
      var liberar = function () { if (!liberado) { liberado = true; dec(); } };
      try { this.addEventListener('loadend', liberar); } catch (_) { console.warn('[PJM ajax-monitor]', _); }
      // Rede de segurança caso loadend não dispare nesta engine
      var prev = this.onreadystatechange;
      this.onreadystatechange = function () {
        try { if (this.readyState === 4) liberar(); } catch (_) { console.warn('[PJM ajax-monitor]', _); }
        if (prev) { try { return prev.apply(this, arguments); } catch (e) { console.warn('[PJM ajax-monitor]', e); } }
      };
      return _send.apply(this, arguments);
    };
  } catch (_) { console.warn('[PJM ajax-monitor]', _); }

  // fetch — caso algum trecho da página o utilize
  try {
    if (typeof window.fetch === 'function') {
      var _fetch = window.fetch;
      window.fetch = function (input, init) {
        inc();
        try {
          var url = (typeof input === 'string') ? input : (input && input.url) || '';
          var hh = (init && init.headers) || (input && input.headers), h = {};
          if (hh) { if (typeof hh.forEach === 'function') hh.forEach(function (v, k) { h[String(k).toLowerCase()] = v; }); else for (var kk in hh) h[String(kk).toLowerCase()] = hh[kk]; }
          capturarHeaders(url, h);
        } catch (_) { /* noop */ }
        var p;
        try { p = _fetch.apply(this, arguments); }
        catch (e) { dec(); throw e; }
        return p.then(function (r) { dec(); return r; }, function (e) { dec(); throw e; });
      };
    }
  } catch (_) { console.warn('[PJM ajax-monitor]', _); }
})();
