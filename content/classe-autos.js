(function () {
  'use strict';
  if (window.__pjmClasseAutos) return;
  window.__pjmClasseAutos = true;
  if (window.top !== window.self) return;
  if (!/listAutosDigitais\.seam/i.test(location.pathname + location.search)) return;

  var EXT = (typeof chrome !== 'undefined') ? chrome : null;
  var CNJ_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

  function txt(el) { return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim(); }

  function lerClasse() {
    var dts = document.querySelectorAll('#maisDetalhes dl dt, dl.dl-horizontal dt');
    for (var i = 0; i < dts.length; i++) {
      if (!/classe/i.test(txt(dts[i]))) continue;
      var dd = dts[i].nextElementSibling;
      if (!dd || String(dd.tagName).toUpperCase() !== 'DD') continue;
      var s = txt(dd);
      if (!s) continue;
      var m = s.match(/^(.*?)\s*\((\d+)\)\s*$/);          // "NOME (codigo)"
      return m ? { nome: m[1].trim(), codigo: m[2] } : { nome: s, codigo: '' };
    }
    return null;
  }

  function cnjDaPagina() {
    var m = String(document.title || '').match(CNJ_RE);
    if (m) return m[0];
    var t = document.body ? String(document.body.innerText || '').slice(0, 5000) : '';
    m = t.match(CNJ_RE);
    return m ? m[0] : '';
  }

  function _normC(x) { return String(x || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); }
  function siglaDaPagina() {
    var els = document.querySelectorAll('.titulo-topo, h1, h2');
    for (var i = 0; i < els.length; i++) { var t = txt(els[i]); var m = t.match(/^\s*(\S+)\s+\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/); if (m) return m[1]; }
    var mt = String(document.title || '').match(/^\s*(\S+)\s+\d{7}-\d{2}\./); return mt ? mt[1] : '';
  }
  function tentar(restantes) {
    var c = lerClasse();
    if (!c) { if (restantes > 0) setTimeout(function () { tentar(restantes - 1); }, 700); return; }
    var cnj = cnjDaPagina();
    var sigla = siglaDaPagina();
    window.PJM_CLASSE_AUTOS = { cnj: cnj, nome: c.nome, codigo: c.codigo, sigla: sigla };
    var k = String(cnj || '').replace(/\D/g, '');
    console.log('%c[pjm-classe-autos] ' + (c.nome || '?') + (c.codigo ? ' (' + c.codigo + ')' : '') + ' — ' + (cnj || 'CNJ?'), 'color:#1a5276;font-weight:bold');
    if (!k || !EXT || !EXT.storage) return;
    try {
      EXT.storage.local.get(['pjmClassePorCnj', 'pjmClasseDicionario'], function (r) {
        var mapa = (r && r.pjmClassePorCnj) || {};
        mapa[k] = { nome: c.nome, codigo: c.codigo, sigla: sigla, ts: Date.now() };
        var dic = (r && r.pjmClasseDicionario) || {};
        if (!Object.keys(dic).length && typeof PJM_CLASSES_SEED !== 'undefined') {
          PJM_CLASSES_SEED.forEach(function (e) { if (e && e.nome) dic[_normC(e.nome)] = { nome: e.nome, codigo: e.codigo || '', sigla: e.sigla || '' }; });
        }
        var key = _normC(c.nome), ex = dic[key] || {};
        dic[key] = { nome: c.nome, codigo: c.codigo || ex.codigo || '', sigla: sigla || ex.sigla || '' };
        try { EXT.storage.local.set({ pjmClassePorCnj: mapa, pjmClasseDicionario: dic }); } catch (_) { /* noop */ }
      });
    } catch (_) { /* noop */ }
  }

  tentar(6);
})();
