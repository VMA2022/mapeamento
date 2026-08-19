(function () {
  'use strict';
  if (window.__pjmColetorLoc) return;
  window.__pjmColetorLoc = true;
  if (!/ConsultaLocalizacao\/listView\.seam/i.test(location.pathname)) return;

  var EXT = (typeof chrome !== 'undefined') ? chrome : null;
  var NOSEL = 'NoSelectionConverter';

  function txt(el) { return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim(); }

  // Opcoes de um <select> cujo name termina em ":<sufixo>" (ignora "Selecione").
  function opcoes(sufixo) {
    var sel = document.querySelector('select[name$=":' + sufixo + '"]');
    if (!sel) return null;
    var out = [];
    Array.prototype.forEach.call(sel.options, function (o) {
      if (!o || String(o.value || '').indexOf(NOSEL) >= 0) return;
      var nome = txt(o);
      if (nome && nome.toLowerCase() !== 'selecione') out.push(nome);
    });
    return out;
  }

  function unicosOrdenados(arr) {
    var vis = {}, out = [];
    (arr || []).forEach(function (n) { var k = n.toLowerCase(); if (!vis[k]) { vis[k] = 1; out.push(n); } });
    out.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    return out;
  }

  function coletar(restantes) {
    var fluxosRaw = opcoes('fluxoDecoration:fluxo');
    var tarefasRaw = opcoes('tarefaDecoration:tarefa');
    var orgaosRaw = opcoes('orgaoJulgadorColegiadoDecoration:orgaoJulgadorColegiado');
    if (!fluxosRaw && !tarefasRaw) {                         // selects ainda nao no DOM
      if (restantes > 0) setTimeout(function () { coletar(restantes - 1); }, 700);
      return;
    }
    var fluxos = unicosOrdenados(fluxosRaw);
    var tarefas = unicosOrdenados(tarefasRaw);
    var orgaos = unicosOrdenados(orgaosRaw);
    var cat = {
      fluxos: fluxos, tarefas: tarefas, orgaos: orgaos,
      contagem: {
        fluxos: fluxos.length,
        tarefasBrutas: (tarefasRaw || []).length, tarefas: tarefas.length,
        orgaos: orgaos.length
      },
      url: location.href, ts: Date.now()
    };
    window.PJM_LOC_CATALOGO = cat;
    console.log('%c[pjm-coletor-localizacao v1] catalogo: ' + fluxos.length + ' fluxos · ' +
      tarefas.length + ' tarefas (de ' + cat.contagem.tarefasBrutas + ' brutas) · ' + orgaos.length + ' orgaos',
      'color:#1a5276;font-weight:bold');
    if (EXT && EXT.storage) { try { EXT.storage.local.set({ pjmLocCatalogo: cat }); } catch (_) { /* noop */ } }
  }

  coletar(8);
})();
