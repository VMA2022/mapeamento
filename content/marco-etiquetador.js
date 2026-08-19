/**
 * PJe Mapeador — AUTO-ETIQUETADOR POR MARCO  [pjm-marco-etiquetador v1]
 * ════════════════════════════════════════════════════════════════════════════
 * Ao abrir os autos digitais, IDENTIFICA na árvore (documentos/movimentos) os
 * marcos configurados e VINCULA a etiqueta correspondente ao processo.
 *
 * NÃO reimplementa nada: usa os dois motores já existentes, expostos como globais:
 *   • window.PJM_lerArvore()            (content/tabela-autos.js)  → lê a árvore + tipo
 *   • window.PJM_aplicarEtiquetaAutos() (content/autos-acoes.js)   → POST processoTags/inserir
 *   • window.PJM_etiquetasProcessoAtual / PJM_ctxAutos / PJM_toastAutos
 *
 * Regras (storage 'pjmMarcoRegras'), lista avulsa — cada regra:
 *   { tipo, nome, etiqueta, ativo }
 *     tipo     : chave do tipo da Tabela (certidao|peticao|edital|decisao|informacao|movimento|'' = qualquer)
 *     nome     : termo a CONTER no nome/descrição do ato (vazio = qualquer)
 *     etiqueta : nome exato da etiqueta (recuperada das regras de "vincular etiqueta")
 *
 * Controles (storage): pjmAtivo (global) · pjmMarcoAuto (liga o recurso) ·
 *   pjmMarcoAviso (aviso a cada etiquetagem). Defaults: ligado/ligado.
 *
 * Salvaguardas: idempotente (não reaplica etiqueta já presente / já lembrada /
 * já aplicada nesta sessão); só aplica quando a regra casa; nunca remove nada.
 */
(function () {
  'use strict';
  if (window.__pjmMarcoEtiquetadorLoaded) return;
  window.__pjmMarcoEtiquetadorLoaded = true;

  // Só no topo dos autos digitais (mesmo contexto de autos-acoes/tabela-autos).
  if (window.top !== window.self) return;
  if (!/listAutosDigitais\.seam/i.test(location.pathname + location.search)) return;

  var EXT = (typeof chrome !== 'undefined') ? chrome : (typeof browser !== 'undefined' ? browser : null);
  if (!EXT || !EXT.storage || !EXT.storage.local) return;

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }

  var _emExecucao = false;
  var _jaAplicadasSessao = {};   // { cnj: { etiquetaNorm: 1 } }

  function lerConfig(cb) {
    try {
      EXT.storage.local.get({ pjmAtivo: true, pjmMarcoAuto: true, pjmMarcoAviso: true, pjmMarcoRegras: [], pjmAutosEtqInseridas: {} }, function (r) {
        cb({
          ativo: r.pjmAtivo !== false && r.pjmMarcoAuto !== false,
          aviso: r.pjmMarcoAviso !== false,
          regras: Array.isArray(r.pjmMarcoRegras) ? r.pjmMarcoRegras : [],
          inseridas: r.pjmAutosEtqInseridas || {}
        });
      });
    } catch (_) { cb({ ativo: false, aviso: true, regras: [], inseridas: {} }); }
  }

  // Casa a regra contra a árvore: (tipo vazio/qualquer OU ato.tipo===tipo) E (termo vazio OU nome contém termo).
  function acharCasamento(regra, atos) {
    var tipo = norm(regra.tipo || '');
    var termo = norm(regra.nome || regra.termo || regra.descricao || '');
    for (var i = 0; i < atos.length; i++) {
      var a = atos[i];
      var okTipo = !tipo || tipo === 'qualquer' || norm(a.tipo || '') === tipo;
      var okTermo = !termo || norm(a.nome || '').indexOf(termo) >= 0;
      if (okTipo && okTermo) return a;
    }
    return null;
  }

  function jaTem(etq, atuais, cnj, inseridas) {
    var n = norm(etq);
    if (atuais.some(function (e) { return norm(e) === n; })) return true;
    var lem = (inseridas[cnj] && inseridas[cnj].tags) || [];
    if (lem.some(function (e) { return norm(e) === n; })) return true;
    if (_jaAplicadasSessao[cnj] && _jaAplicadasSessao[cnj][n]) return true;
    return false;
  }

  function avisar(cfg, etq, ato) {
    if (!cfg.aviso) return;
    var msg = '🏷️ Etiqueta aplicada por marco: "' + etq + '"' + (ato && ato.nome ? '\n(detectado: ' + ato.nome + ')' : '');
    try { if (typeof window.PJM_toastAutos === 'function') { window.PJM_toastAutos(msg, 'success'); return; } } catch (_) { }
    try { console.log('[PJM marco-etiquetador]', msg.replace(/\n/g, ' ')); } catch (_) { }
  }

  var _ultimoRun = 0;

  // Estado REAL das etiquetas do processo (para as regras "Repor"/persistente).
  function _listarTagsServidor(idp) {
    if (!idp) return Promise.resolve(null);
    var url = location.origin + '/pje/seam/resource/rest/pje-legacy/painelUsuario/processoTags/listar/' + encodeURIComponent(idp);
    return fetch(url, { credentials: 'include', headers: { 'Accept': 'application/json, text/plain, */*' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (arr) {
        if (!Array.isArray(arr)) return null;
        var set = {};
        arr.forEach(function (t) { var nm = norm(t && (t.nomeTag || t.nomeTagCompleto) || ''); if (nm) set[nm] = 1; });
        return set;
      })
      .catch(function () { return null; });
  }

  function rodar() {
    if (_emExecucao) return;
    if (typeof window.PJM_lerArvore !== 'function' || typeof window.PJM_aplicarEtiquetaAutos !== 'function') return;
    var agora = Date.now(); if (agora - _ultimoRun < 3000) return; _ultimoRun = agora;   // cooldown: evita consultar a cada mutacao
    _emExecucao = true;
    lerConfig(function (cfg) {
      if (!cfg.ativo || !cfg.regras.length) { _emExecucao = false; return; }
      var ctx = {};
      try { ctx = (window.PJM_ctxAutos && window.PJM_ctxAutos()) || {}; } catch (_) { }
      var cnj = ctx.cnj || '', idp = ctx.idProcesso || '';
      Promise.resolve(window.PJM_lerArvore(false)).then(function (atos) {
        atos = Array.isArray(atos) ? atos : [];
        var atuais = [];
        try { atuais = (window.PJM_etiquetasProcessoAtual && window.PJM_etiquetasProcessoAtual()) || []; } catch (_) { }
        var casaram = [];
        cfg.regras.forEach(function (regra) {
          if (!regra || regra.ativo === false) return;
          var etq = String(regra.etiqueta || '').trim(); if (!etq) return;
          var ato = acharCasamento(regra, atos);
          if (ato) casaram.push({ etq: etq, ato: ato, persistente: !!regra.persistente });
        });
        if (!casaram.length) { _emExecucao = false; return; }
        var temPersist = casaram.some(function (x) { return x.persistente; });
        function seguir(serverSet) {
          var vistos = {}, fila = [];
          casaram.forEach(function (x) {
            var n = norm(x.etq); if (vistos[n]) return;
            var pular = (x.persistente && serverSet) ? !!serverSet[n] : jaTem(x.etq, atuais, cnj, cfg.inseridas);
            if (!pular) { vistos[n] = 1; fila.push(x); }
          });
          (function proximo(i) {
            if (i >= fila.length) { _emExecucao = false; return; }
            var x = fila[i];
            Promise.resolve(window.PJM_aplicarEtiquetaAutos([x.etq], 'Etiqueta por marco: ' + x.etq + (x.persistente ? ' (repor)' : ' (auto)'))).then(function (ok) {
              if (ok) { _jaAplicadasSessao[cnj] = _jaAplicadasSessao[cnj] || {}; _jaAplicadasSessao[cnj][norm(x.etq)] = 1; avisar(cfg, x.etq, x.ato); }
              setTimeout(function () { proximo(i + 1); }, 400);
            }, function () { setTimeout(function () { proximo(i + 1); }, 400); });
          })(0);
        }
        if (temPersist) { _listarTagsServidor(idp).then(seguir); } else { seguir(null); }
      }, function () { _emExecucao = false; });
    });
  }

  // Agenda: 1ª passada após o carregamento + re-avaliação em mutações (debounce).
  var _deb = null;
  function agenda() { clearTimeout(_deb); _deb = setTimeout(rodar, 1200); }
  agenda();
  try { new MutationObserver(agenda).observe(document.documentElement, { childList: true, subtree: true }); } catch (_) { }

  console.log('[PJM marco-etiquetador v1] carregado em', location.href.slice(0, 80));
})();
