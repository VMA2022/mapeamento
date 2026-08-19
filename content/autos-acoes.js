(function () {
  'use strict';

  if (window.__pjmAutosAcoesLoaded) return;
  window.__pjmAutosAcoesLoaded = true;

  if (window.top !== window.self) return;
  if (!/listAutosDigitais\.seam/i.test(location.pathname + location.search)) return;

  var ENDPOINT_INSERIR = '/pje/seam/resource/rest/pje-legacy/painelUsuario/processoTags/inserir';
  var ENDPOINT_REMOVER = '/pje/seam/resource/rest/pje-legacy/painelUsuario/processoTags/remover';
  var ENDPOINT_LISTAR = '/pje/seam/resource/rest/pje-legacy/painelUsuario/processoTags/listar/';
  var CNJ_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  var KEY_INSERIDAS = 'pjmAutosEtqInseridas';

  // ── Contexto / utilitários ───────────────────────────────────────────
  function getIdProcesso() {
    try { return new URLSearchParams(location.search).get('idProcesso') || ''; }
    catch (_) { return ''; }
  }
  function getCnj() {
    var m = (document.title || '').match(CNJ_RE);
    if (m) return m[0];
    var b = (document.body && document.body.textContent || '').match(CNJ_RE);
    return b ? b[0] : '';
  }
  function soDig(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function norm(s) {
    var reDia = new RegExp('[\\u0300-\\u036f]', 'g');
    return String(s == null ? '' : s).toLowerCase().normalize('NFD')
      .replace(reDia, '').replace(/\s+/g, ' ').trim();
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Ícones SVG (sem emoji), herdam a cor via currentColor.
  var ICONS = {
    painel: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',
    tag: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.2"/></svg>',
    mover: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    juntar: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 12v6M9 15h6"/></svg>',
    tabela: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>',
    ext: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h3a1 1 0 0 0 1 -1v-1a2 2 0 0 1 4 0v1a1 1 0 0 0 1 1h3a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h1a2 2 0 0 1 0 4h-1a1 1 0 0 0 -1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-1a2 2 0 0 0 -4 0v1a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h1a2 2 0 0 0 0 -4h-1a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1"/></svg>',
    grip: '<svg width="13" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/></svg>'
  };

  // ── Toast ────────────────────────────────────────────────────────────
  var toastEl = null;
  function toast(msg, tipo) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      Object.assign(toastEl.style, {
        position: 'fixed', bottom: '72px', right: '20px', zIndex: '2147483646',
        padding: '11px 15px', borderRadius: '9px', maxWidth: '320px',
        font: "13px/1.45 'Segoe UI', Arial, sans-serif", color: '#fff',
        boxShadow: '0 6px 22px rgba(0,0,0,.32)', display: 'none', whiteSpace: 'pre-line'
      });
      document.body.appendChild(toastEl);
    }
    var cor = { info: '#1a5276', success: '#1e8449', warning: '#9a7d0a', error: '#922b21' }[tipo || 'info'];
    toastEl.style.background = cor;
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    ancorarNaBarra(toastEl);
    clearTimeout(toastEl.__t);
    toastEl.__t = setTimeout(function () { if (toastEl) toastEl.style.display = 'none'; }, tipo === 'error' ? 7000 : 4200);
  }

  // ── ETIQUETAR: POST REST + memória do que foi inserido ───────────────
  async function inserirEtiquetas(tags) {
    var idProcesso = getIdProcesso(), cnj = getCnj();
    if (!idProcesso) throw new Error('idProcesso não encontrado na URL dos autos.');
    if (!cnj) throw new Error('Número do processo (CNJ) não encontrado na tela.');
    var corpo = tags.map(function (t) {
      return { tag: String(t), idProcesso: String(idProcesso), numeroProcesso: cnj };
    });
    var resp = await fetch(location.origin + ENDPOINT_INSERIR, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
      body: JSON.stringify(corpo)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ao inserir etiqueta');
    return true;
  }
  function lembrarInseridas(cnj, tags) {
    if (!cnj || !tags || !tags.length) return;
    try {
      chrome.storage.local.get(KEY_INSERIDAS, function (r) {
        var m = (r && r[KEY_INSERIDAS]) || {};
        var atual = (m[cnj] && m[cnj].tags) || [];
        var vistos = {}, uniq = [];
        atual.concat(tags).forEach(function (t) { var n = norm(t); if (t && !vistos[n]) { vistos[n] = 1; uniq.push(t); } });
        m[cnj] = { tags: uniq, ts: Date.now() };
        chrome.storage.local.set({ [KEY_INSERIDAS]: m });
      });
    } catch (_) { /* noop */ }
  }

  // ── DESVINCULAR: listar (traz o id do vínculo) + remover (REST) ──────
  function listarEtiquetasREST() {
    var idp = getIdProcesso();
    if (!idp) return Promise.reject(new Error('idProcesso não encontrado na URL dos autos.'));
    return fetch(location.origin + ENDPOINT_LISTAR + encodeURIComponent(idp), {
      credentials: 'include', headers: { 'Accept': 'application/json, text/plain, */*' }
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ao listar etiquetas');
      return r.json();
    }).then(function (arr) {
      return (Array.isArray(arr) ? arr : []).map(function (e) {
        return { id: e.id, nome: String(e.nomeTag || e.nomeTagCompleto || '').trim() };
      }).filter(function (e) { return e.id != null && e.nome; });
    });
  }
  //   POST processoTags/remover  { idTag, idProcesso }
  function removerEtiquetaREST(idTag) {
    var idp = getIdProcesso();
    if (!idp) return Promise.reject(new Error('idProcesso não encontrado na URL dos autos.'));
    return fetch(location.origin + ENDPOINT_REMOVER, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
      body: JSON.stringify({ idTag: Number(idTag) || idTag, idProcesso: Number(idp) || idp })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ao remover etiqueta');
      return true;
    });
  }
  // Purga a etiqueta removida da memória do Movimentar (pjmAutosEtqInseridas).
  function esquecerInserida(cnj, nome) {
    if (!cnj || !nome) return;
    try {
      chrome.storage.local.get(KEY_INSERIDAS, function (r) {
        var m = (r && r[KEY_INSERIDAS]) || {};
        if (m[cnj] && m[cnj].tags) {
          var n = norm(nome);
          m[cnj].tags = m[cnj].tags.filter(function (t) { return norm(t) !== n; });
          chrome.storage.local.set({ [KEY_INSERIDAS]: m });
        }
      });
    } catch (_) { /* noop */ }
  }

  // ── Fontes de etiquetas do processo aberto ───────────────────────────
  function etiquetasDoDOM() {
    var out = [];
    document.querySelectorAll('li[id^="etiqueta"]').forEach(function (li) {
      var t = (li.textContent || '').replace(/\s+/g, ' ').replace(/\s*[×✕x]\s*$/, '').trim();
      if (t) out.push(t);
    });
    return out;
  }
  // -- Reflete no painel ETIQUETAS dos autos as etiquetas recem-aplicadas (sem F5) --
  // Estrutura nativa: ul.dropdown-menu li.menu-conteudo > ul > li[id^="etiqueta"]
  //   > div.media-body > i.fa.fa-tag[title] + texto. A lista e' renderizada de forma
  //   lazy e NAO re-consulta apos o POST -> por isso, injetamos o chip e um observer
  //   garante que ele reapareca quando o painel (re)abre.
  var _pjmEtqSessao = {};      // { norm(nome): nome } aplicadas nesta sessao
  var _pjmEtqObsOn = false;
  function _acharListaEtiquetas() {
    var li = document.querySelector('li[id^="etiqueta"]');
    if (li && li.parentElement) return li.parentElement;
    return document.querySelector('ul.dropdown-menu li.menu-conteudo > ul') ||
           document.querySelector('li.menu-conteudo > ul') || null;
  }
  function _chipJaTem(ul, nome) {
    var n = norm(nome), lis = ul.children;
    for (var i = 0; i < lis.length; i++) {
      var li = lis[i]; if (!li.tagName || li.tagName !== 'LI') continue;
      var ic = li.querySelector('i[title]');
      var t = (ic && ic.getAttribute('title')) || li.textContent || '';
      if (norm(t) === n) return true;
    }
    return false;
  }
  function _fazerChip(nome) {
    var li = document.createElement('li');
    li.className = 'pjm-etq-inserida';
    li.setAttribute('data-pjm-etq', nome);
    li.innerHTML = '<div class="media-body"><i class="fa fa-tag mr-5" title="' + esc(nome) + '"></i>' + esc(nome) + '</div>';
    return li;
  }
  function garantirChipsEtq() {
    var chaves = Object.keys(_pjmEtqSessao);
    if (!chaves.length) return;
    var ul = _acharListaEtiquetas();
    if (!ul) return;
    chaves.forEach(function (k) { var nome = _pjmEtqSessao[k]; if (!_chipJaTem(ul, nome)) ul.appendChild(_fazerChip(nome)); });
  }
  function _ativarObserverEtq() {
    if (_pjmEtqObsOn) return; _pjmEtqObsOn = true;
    var deb = null;
    try { new MutationObserver(function () { clearTimeout(deb); deb = setTimeout(garantirChipsEtq, 400); }).observe(document.body, { childList: true, subtree: true }); } catch (_) { }
  }
  function refletirEtiquetasNoPainel(tags) {
    try {
      (tags || []).forEach(function (t) { var nome = String(t == null ? '' : t).trim(); if (nome) _pjmEtqSessao[norm(nome)] = nome; });
      garantirChipsEtq();
      _ativarObserverEtq();
    } catch (_) { }
  }
  // Reverso do refletir: tira o chip do painel ETIQUETAS (nosso injetado e o
  // nativo server-rendered) sem F5, e esquece a etiqueta da sessão.
  function removerChipDoPainel(nome) {
    var n = norm(nome);
    try {
      document.querySelectorAll('li.pjm-etq-inserida[data-pjm-etq]').forEach(function (li) {
        if (norm(li.getAttribute('data-pjm-etq')) === n) li.remove();
      });
      document.querySelectorAll('li[id^="etiqueta"]').forEach(function (li) {
        var ic = li.querySelector('i[title]');
        var t = (ic && ic.getAttribute('title')) || li.textContent || '';
        if (norm(t) === n) li.remove();
      });
      delete _pjmEtqSessao[n];
    } catch (_) { /* noop */ }
  }

  function lookupColecao(cnj, cb) {
    var res = { tarefa: '', etiquetas: [] }, alvo = soDig(cnj);
    try {
      chrome.storage.local.get('pjeMapperUltimoResultado', function (r) {
        var d = r && r.pjeMapperUltimoResultado;
        if (!d) { cb(res); return; }
        var achou = false;
        function check(p, tarefaNome) {
          if (achou || !p) return;
          if (soDig(p.numero || p.numeroProcesso || '') === alvo) {
            res.tarefa = tarefaNome || p.tarefa || '';
            res.etiquetas = (p.etiquetas || []).slice();
            achou = true;
          }
        }
        if (Array.isArray(d.tarefas)) d.tarefas.forEach(function (t) { (t.processos || []).forEach(function (p) { check(p, t.nome); }); });
        if (!achou && Array.isArray(d.processos)) d.processos.forEach(function (p) { check(p, p.tarefa); });
        cb(res);
      });
    } catch (_) { cb(res); }
  }
  function coletarEtiquetas(cnj, cb) {
    try {
      chrome.storage.local.get(KEY_INSERIDAS, function (r) {
        var m = (r && r[KEY_INSERIDAS]) || {};
        var lembradas = (m[cnj] && m[cnj].tags) || [];
        lookupColecao(cnj, function (col) {
          var todas = etiquetasDoDOM().concat(lembradas).concat(col.etiquetas || []);
          var vistos = {}, uniq = [];
          todas.forEach(function (t) { var n = norm(t); if (t && !vistos[n]) { vistos[n] = 1; uniq.push(t); } });
          cb({ etiquetas: uniq, tarefa: col.tarefa });
        });
      });
    } catch (_) { cb({ etiquetas: etiquetasDoDOM(), tarefa: '' }); }
  }

  // ── Regras (aba Etiquetas) ───────────────────────────────────────────
  function carregarRegrasVincular(cb) {
    try {
      chrome.storage.local.get('vincularEtiquetaRegras', function (r) {
        var regras = (r && r.vincularEtiquetaRegras) || [];
        cb(regras.filter(function (x) { return x && x.ativo !== false && ((x.etiquetas && x.etiquetas.length) || x.etiqueta); }));
      });
    } catch (_) { cb([]); }
  }
  function carregarRegrasMover(cb) {
    try {
      chrome.storage.local.get('etiquetaRegras', function (r) {
        cb(((r && r.etiquetaRegras) || []).filter(function (x) { return x && x.ativo !== false && x.etiqueta; }));
      });
    } catch (_) { cb([]); }
  }
  // Regras de COMUNICAÇÃO (aba Etiquetas, tipo Comunicar) — mesma fonte do painel.
  function carregarRegrasComunicar(cb) {
    try {
      chrome.storage.local.get('prepComunicacaoRegras', function (r) {
        cb(((r && r.prepComunicacaoRegras) || []).filter(function (x) { return x && x.ativo !== false && x.etiqueta; }));
      });
    } catch (_) { cb([]); }
  }
  function rotuloRegraComunicar(r) {
    return String(r.etiqueta || '') + (r.comunicacao ? ' → ' + r.comunicacao : '');
  }
  function etiquetasDaRegra(r) {
    return ((r.etiquetas && r.etiquetas.length) ? r.etiquetas : (r.etiqueta ? [r.etiqueta] : []))
      .map(function (s) { return String(s == null ? '' : s).trim(); }).filter(Boolean);
  }
  function rotuloRegraMover(r) {
    var base = (r.pipeline && r.pipeline.length) ? (r.etiqueta + ' · pipeline ' + r.pipeline.length + 'p')
      : (r.tarefaDestino ? (r.etiqueta + ' → ' + r.tarefaDestino) : r.etiqueta);
    return base + (r.simular ? ' · 🔎 simular' : '');
  }

  // ── Dispatch do move (espelha o painel) ──────────────────────────────
  function dispatchMover(regra, cnj, tarefaOrigem) {
    var t0 = Date.now();
    var cmd = { regras: [regra], ts: t0, cnj: soDig(cnj) };
    if (tarefaOrigem) cmd.tarefaOrigem = tarefaOrigem;
    try {
      chrome.storage.local.remove('etiquetaComandoStatus', function () {
        chrome.storage.local.set({ etiquetaComando: cmd }, function () {
          // NÃO navega a aba dos autos. O painel (aba Angular) executa via onChanged.
          // O background foca um painel já aberto, ou abre um se não houver.
          try { chrome.runtime.sendMessage({ type: 'PJM_FOCAR_PAINEL' }); } catch (_) { /* noop */ }
        });
      });
    } catch (e) { toast('❌ Falha ao acionar o move: ' + (e && e.message || e), 'error'); }
  }

  // ── Dispatch do Comunicar: ENFILEIRA (FIFO), não sobrescreve ─────────
  // O orquestrador (painel) drena comunicarFila um a um (prepara e para).
  function dispatchComunicar(regra, cnj) {
    try {
      chrome.storage.local.get('comunicarFila', function (r) {
        var fila = (r && r.comunicarFila) || [];
        fila.push({ cnj: soDig(cnj), numero: cnj, regra: regra, ts: Date.now() });
        chrome.storage.local.set({ comunicarFila: fila }, function () {
          try { chrome.runtime.sendMessage({ type: 'PJM_FOCAR_PAINEL' }); } catch (_) { /* noop */ }
        });
      });
    } catch (e) { toast('❌ Falha ao enfileirar comunicação: ' + (e && e.message || e), 'error'); }
  }

  // ── Movimentação via REST (movimentar/{idTaskInstance}/{nomeSaida}) ───
  // Contrato confirmado (impl-movimentacao-pje): move "seco" mesma-origem.
  // idTaskInstance vem da URL dos autos; a transição é o NOME (nomeSaida).
  var REST_BASE = '/pje/seam/resource/rest/pje-legacy/painelUsuario/';
  function getIdTaskInstance() {
    try { return new URLSearchParams(location.search).get('idTaskInstance') || ''; } catch (_) { return ''; }
  }
  function nomeTransicao(t) { return String((t && (t.nomeSaida || t.nome)) || '').trim(); }
  function transicoesDaRegra(regra) {
    if (regra.pipeline && regra.pipeline.length) return regra.pipeline.map(function (p) { return String(p.transicao || '').trim(); }).filter(Boolean);
    if (regra.tarefaDestino) return [String(regra.tarefaDestino).trim()];
    return [];
  }
  function transicoesREST(idTask) {
    return fetch(location.origin + REST_BASE + 'transicoes/' + encodeURIComponent(idTask), { credentials: 'include' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (ts) { return Array.isArray(ts) ? ts : (ts && ts.entities) || []; });
  }
  function moverREST(idTask, nomeSaida) {
    return fetch(location.origin + REST_BASE + 'movimentar/' + encodeURIComponent(idTask) + '/' + encodeURIComponent(nomeSaida), { credentials: 'include' })
      .then(function (r) { return r.ok; });
  }
  function restaurarRow(row, antes) { row.innerHTML = antes; row.style.pointerEvents = ''; row.style.opacity = ''; }

  // ── UI: popover genérico ─────────────────────────────────────────────
  var painelEl = null, painelTipo = '';
  function fecharPainel() { if (painelEl) { painelEl.remove(); painelEl = null; painelTipo = ''; } }
  function criarPainel(titulo, subtitulo) {
    var p = document.createElement('div');
    Object.assign(p.style, {
      position: 'fixed', bottom: '72px', right: '20px', zIndex: '2147483646',
      width: '300px', maxHeight: '60vh', background: '#fff', borderRadius: '12px',
      border: '1px solid #e5e7eb', boxShadow: '0 12px 34px rgba(0,0,0,.28)',
      font: "13px 'Segoe UI', Arial, sans-serif", color: '#1f2937', display: 'flex', flexDirection: 'column'
    });
    p.innerHTML =
      '<div style="padding:11px 13px;border-bottom:1px solid #eef0f2;display:flex;align-items:center;gap:8px">' +
        '<div style="flex:1;min-width:0"><div style="font-weight:600">' + esc(titulo) + '</div>' +
        '<div style="font-size:11px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(subtitulo) + '</div></div>' +
        '<span class="pjm-x" style="cursor:pointer;color:#9ca3af;font-size:16px;padding:0 2px">✕</span></div>' +
      '<div class="pjm-lista" style="overflow:auto;padding:6px"></div>';
    p.querySelector('.pjm-x').addEventListener('click', fecharPainel);
    document.body.appendChild(p);
    ancorarNaBarra(p);
    return p;
  }
  function linha(cor, fundo, borda, html) {
    var row = document.createElement('div');
    Object.assign(row.style, {
      padding: '9px 11px', margin: '3px 2px', borderRadius: '8px', cursor: 'pointer',
      border: '1px solid ' + borda, background: fundo, color: cor, fontWeight: '600',
      whiteSpace: 'normal', wordBreak: 'break-word'
    });
    row.innerHTML = html;
    row.addEventListener('mouseenter', function () { row.style.filter = 'brightness(0.97)'; });
    row.addEventListener('mouseleave', function () { row.style.filter = ''; });
    return row;
  }
  function vazio(html) {
    return '<div style="padding:14px;color:#6b7280;font-size:12px;line-height:1.5">' + html + '</div>';
  }

  // ── Popover ETIQUETAR ────────────────────────────────────────────────
  function subhead(txt) {
    var d = document.createElement('div');
    d.style.cssText = 'font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:#9ca3af;margin:8px 4px 4px;font-weight:700';
    d.textContent = txt;
    return d;
  }
  // Lista as etiquetas ATUAIS do processo (REST) e monta a remoção in-place.
  function renderNesteProcesso(lista) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'border-top:1px solid #eef0f2;margin-top:8px;padding-top:2px';
    var head = subhead('Neste processo');
    wrap.appendChild(head);
    var body = document.createElement('div');
    body.innerHTML = vazio('⏳ lendo etiquetas…');
    wrap.appendChild(body);
    lista.appendChild(wrap);
    listarEtiquetasREST().then(function (itens) {
      if (!painelEl) return;
      pintarNesteProcesso(head, body, itens);
    }).catch(function (e) {
      if (!painelEl) return;
      body.innerHTML = vazio('Não consegui listar as etiquetas deste processo.<br><span style="color:#b45309">' + esc((e && e.message) || e) + '</span>');
    });
  }
  function pintarNesteProcesso(head, body, itens) {
    var st = { sel: false, marcados: {}, filtro: '' };
    head.textContent = 'Neste processo · ' + itens.length;
    if (!itens.length) { body.innerHTML = vazio('Sem etiquetas neste processo.'); return; }
    body.innerHTML = '';

    var barra = document.createElement('div');
    barra.style.cssText = 'display:flex;align-items:center;gap:6px;margin:2px 2px 6px';
    var inp = document.createElement('input');
    inp.type = 'search'; inp.placeholder = 'Filtrar etiquetas…';
    inp.style.cssText = "flex:1;min-width:0;border:1px solid #e5e7eb;border-radius:7px;padding:5px 8px;font:12px 'Segoe UI',Arial;color:#1f2937";
    var tgl = document.createElement('button');
    tgl.type = 'button'; tgl.textContent = 'selecionar';
    tgl.style.cssText = "border:1px solid #e5e7eb;background:#fff;border-radius:7px;padding:5px 8px;font:11px 'Segoe UI',Arial;color:#2563eb;cursor:pointer;white-space:nowrap";
    barra.appendChild(inp); barra.appendChild(tgl);
    body.appendChild(barra);

    var listaEtq = document.createElement('div'); body.appendChild(listaEtq);
    var rodape = document.createElement('div');
    rodape.style.cssText = 'display:none;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #eef0f2;margin-top:6px;padding-top:8px';
    body.appendChild(rodape);

    function tirarDaLista(id) { for (var i = 0; i < itens.length; i++) { if (itens[i].id === id) { itens.splice(i, 1); return; } } }
    function apagarUm(e) {
      return removerEtiquetaREST(e.id).then(function () {
        tirarDaLista(e.id); delete st.marcados[e.id];
        removerChipDoPainel(e.nome); esquecerInserida(getCnj(), e.nome);
        pjmLogAutos(getCnj(), e.nome + ' (Desvincular)');
      });
    }
    function removerUm(e) {
      apagarUm(e).then(function () {
        head.textContent = 'Neste processo · ' + itens.length;
        desenhar();
        toast('🏷️ Etiqueta removida: ' + e.nome, 'success');
      }).catch(function (err) { toast('❌ Falha ao remover: ' + ((err && err.message) || err), 'error'); });
    }
    function removerLote() {
      var alvo = Object.keys(st.marcados).map(function (k) { return st.marcados[k]; });
      if (!alvo.length) return;
      var ok = [], fail = [], seq = Promise.resolve();
      alvo.forEach(function (e) {
        seq = seq.then(function () { return apagarUm(e).then(function () { ok.push(e.nome); }, function () { fail.push(e.nome); }); });
      });
      seq.then(function () {
        st.sel = false; tgl.textContent = 'selecionar'; tgl.style.color = '#2563eb';
        head.textContent = 'Neste processo · ' + itens.length;
        desenhar();
        if (fail.length) toast('⚠️ Removidas ' + ok.length + '; falharam ' + fail.length + ': ' + fail.join(', '), 'warning');
        else toast('🏷️ ' + ok.length + (ok.length === 1 ? ' etiqueta removida' : ' etiquetas removidas'), 'success');
      });
    }
    function pintarRodape() {
      if (!st.sel) { rodape.style.display = 'none'; rodape.innerHTML = ''; return; }
      var n = Object.keys(st.marcados).length;
      rodape.style.display = 'flex'; rodape.innerHTML = '';
      var lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:12px;color:#6b7280';
      lbl.textContent = n + (n === 1 ? ' selecionada' : ' selecionadas');
      var bts = document.createElement('div'); bts.style.cssText = 'display:flex;gap:6px';
      var lim = document.createElement('button');
      lim.type = 'button'; lim.textContent = 'Limpar';
      lim.style.cssText = "border:1px solid #e5e7eb;background:#fff;border-radius:7px;padding:4px 9px;font:11px 'Segoe UI',Arial;color:#6b7280;cursor:pointer";
      lim.addEventListener('click', function () { st.marcados = {}; desenhar(); });
      var rem = document.createElement('button');
      rem.type = 'button'; rem.textContent = '🗑 Remover' + (n ? ' ' + n : '');
      rem.style.cssText = "border:1px solid #fecaca;background:#fef2f2;border-radius:7px;padding:4px 9px;font:11px 'Segoe UI',Arial;color:#b91c1c;cursor:pointer" + (n ? '' : ';opacity:.5;pointer-events:none');
      rem.addEventListener('click', removerLote);
      bts.appendChild(lim); bts.appendChild(rem);
      rodape.appendChild(lbl); rodape.appendChild(bts);
    }
    function desenhar() {
      listaEtq.innerHTML = '';
      var f = norm(st.filtro);
      var vis = itens.filter(function (e) { return !f || norm(e.nome).indexOf(f) >= 0; });
      if (!vis.length) {
        var z = document.createElement('div');
        z.innerHTML = vazio('Nenhuma etiqueta com “' + esc(st.filtro) + '”.');
        listaEtq.appendChild(z); pintarRodape(); return;
      }
      vis.forEach(function (e) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 8px;margin:3px 2px;border-radius:8px;background:#eef6fb;border:1px solid #d6e6f2';
        if (st.sel) {
          var chk = document.createElement('input');
          chk.type = 'checkbox'; chk.checked = !!st.marcados[e.id];
          chk.style.cssText = 'width:15px;height:15px;flex:none;cursor:pointer';
          chk.addEventListener('change', function () { if (chk.checked) st.marcados[e.id] = e; else delete st.marcados[e.id]; pintarRodape(); });
          row.appendChild(chk);
        }
        var ico = document.createElement('span'); ico.style.cssText = 'display:inline-flex;flex:none;color:#1a4f72'; ico.innerHTML = ICONS.tag; row.appendChild(ico);
        var nm = document.createElement('span'); nm.style.cssText = 'flex:1;min-width:0;color:#1a4f72;font-weight:600;font-size:12px;word-break:break-word'; nm.textContent = e.nome; row.appendChild(nm);
        var x = document.createElement('button');
        x.type = 'button'; x.title = 'Remover etiqueta'; x.setAttribute('aria-label', 'Remover etiqueta ' + e.nome); x.textContent = '✕';
        x.style.cssText = 'width:22px;height:22px;flex:none;border:1px solid #cbd5e1;background:#fff;border-radius:6px;color:#64748b;cursor:pointer;font-size:12px;line-height:1';
        x.addEventListener('click', function (ev) { ev.stopPropagation(); removerUm(e); });
        row.appendChild(x);
        listaEtq.appendChild(row);
      });
      pintarRodape();
    }
    tgl.addEventListener('click', function () {
      st.sel = !st.sel; if (!st.sel) st.marcados = {};
      tgl.textContent = st.sel ? 'cancelar' : 'selecionar';
      tgl.style.color = st.sel ? '#b91c1c' : '#2563eb';
      desenhar();
    });
    inp.addEventListener('input', function () { st.filtro = inp.value || ''; desenhar(); });
    desenhar();
  }
  function abrirEtiquetar() {
    if (painelTipo === 'etq') { fecharPainel(); return; }
    fecharPainel();
    painelEl = criarPainel('Etiquetar este processo', getCnj() || '—');
    painelTipo = 'etq';
    var lista = painelEl.querySelector('.pjm-lista');
    carregarRegrasVincular(function (regras) {
      if (!painelEl) return;
      lista.appendChild(subhead('Aplicar'));
      if (!regras.length) {
        var v = document.createElement('div');
        v.innerHTML = vazio('Nenhuma etiqueta configurada.<br>Adicione regras de <b>vincular etiqueta</b> na aba <b>Etiquetas</b> do painel.');
        lista.appendChild(v);
      } else {
        regras.forEach(function (r) {
          var tags = etiquetasDaRegra(r); if (!tags.length) return;
          var label = tags.join(' + ');
          var row = linha('#92400e', '#fffbeb', '#f0d9a8', '<span style="display:inline-flex;align-items:center;gap:7px">' + ICONS.tag + '<span>' + esc(label) + '</span></span>');
          row.addEventListener('click', function () { aplicarEtiqueta(row, tags, label); });
          lista.appendChild(row);
        });
      }
      renderNesteProcesso(lista);
    });
  }
  // ── Relatório: registra ação feita aqui nos autos (movimentar/etiquetar) ──
  function pjmLogAutos(cnj, label) {
    if (!cnj || !label) return;
    try { chrome.runtime.sendMessage({ type: 'PJM_LOG_ACAO', cnj: cnj, label: label }); } catch (_) { console.warn('[PJM autos-acoes]', _); }
  }
  function aplicarEtiqueta(row, tags, label) {
    row.style.pointerEvents = 'none'; row.style.opacity = '0.6';
    var antes = row.innerHTML; row.innerHTML = '⏳ aplicando…';
    inserirEtiquetas(tags).then(function () {
      lembrarInseridas(getCnj(), tags);
      refletirEtiquetasNoPainel(tags);
      pjmLogAutos(getCnj(), label + ' (Vincular)');
      fecharPainel();
      toast('🏷️ Etiqueta aplicada: ' + label + '\n(já fica disponível para o Movimentar)', 'success');
    }).catch(function (e) {
      row.innerHTML = antes; row.style.pointerEvents = ''; row.style.opacity = '';
      toast('❌ Falha ao etiquetar: ' + ((e && e.message) || e), 'error');
    });
  }

  // ── Popover MOVIMENTAR ───────────────────────────────────────────────
  // Popover ÚNICO "Ações": abas Movimentar | Comunicar + busca + lista rolável.
  function abrirAcoes() {
    if (painelTipo === 'acoes') { fecharPainel(); return; }
    fecharPainel();
    var cnj = getCnj();
    painelEl = criarPainel('Ações', cnj || '—');
    painelTipo = 'acoes';
    var lista = painelEl.querySelector('.pjm-lista');
    lista.innerHTML = vazio('⏳ lendo etiquetas e regras…');
    coletarEtiquetas(cnj, function (info) {
      if (!painelEl) return;
      carregarRegrasMover(function (regrasMov) {
        carregarRegrasComunicar(function (regrasCom) {
          if (!painelEl) return;
          // Cada aba lista TODAS as regras ATIVAS do seu tipo — NÃO filtra pelas etiquetas
          // do processo. Movimentar aplica a transição; Comunicar aplica a etiqueta + move.
          pintarAcoes(lista, cnj, info, regrasMov, regrasCom);
        });
      });
    });
  }
  function pintarAcoes(lista, cnj, info, movCasadas, comCasadas) {
    var st = { aba: 'mov', filtro: '' };
    var svgMail = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path></svg>';
    lista.innerHTML = '';

    var abas = document.createElement('div');
    abas.style.cssText = 'display:flex;gap:4px;border-bottom:1px solid #eef0f2;margin:0 2px 8px';
    function mkTab(id, rotulo, n) {
      var t = document.createElement('button');
      t.type = 'button';
      t.innerHTML = esc(rotulo) + ' <span style="font-size:10px;background:#f1f3f5;border-radius:9px;padding:0 6px;color:#6b7280">' + n + '</span>';
      t.style.cssText = "border:none;background:transparent;font:12px 'Segoe UI',Arial;padding:6px 9px;cursor:pointer;border-bottom:2px solid transparent;color:#6b7280";
      t.addEventListener('click', function () { st.aba = id; st.filtro = ''; inp.value = ''; render(); });
      return t;
    }
    var tabMov = mkTab('mov', 'Movimentar', movCasadas.length);
    var tabCom = mkTab('com', 'Comunicar', comCasadas.length);
    abas.appendChild(tabMov); abas.appendChild(tabCom);
    lista.appendChild(abas);

    var inp = document.createElement('input');
    inp.type = 'search'; inp.placeholder = 'Filtrar regras…';
    inp.style.cssText = "width:100%;box-sizing:border-box;border:1px solid #e5e7eb;border-radius:7px;padding:6px 9px;margin:0 0 8px;font:12px 'Segoe UI',Arial;color:#1f2937";
    inp.addEventListener('input', function () { st.filtro = inp.value || ''; render(); });
    lista.appendChild(inp);

    var box = document.createElement('div');
    lista.appendChild(box);

    function render() {
      tabMov.style.color = st.aba === 'mov' ? '#1a4f72' : '#6b7280';
      tabMov.style.borderBottomColor = st.aba === 'mov' ? '#1a4f72' : 'transparent';
      tabMov.style.fontWeight = st.aba === 'mov' ? '600' : '400';
      tabCom.style.color = st.aba === 'com' ? '#0f6e56' : '#6b7280';
      tabCom.style.borderBottomColor = st.aba === 'com' ? '#0f6e56' : 'transparent';
      tabCom.style.fontWeight = st.aba === 'com' ? '600' : '400';
      box.innerHTML = '';
      var f = norm(st.filtro);
      if (st.aba === 'mov') {
        if (!movCasadas.length) { box.innerHTML = vazio('Nenhuma regra de <b>movimentação</b> ativa.<br>Configure na aba <b>Etiquetas</b> (tipo Movimentar).'); return; }
        var vis = movCasadas.filter(function (r) { return !f || norm(rotuloRegraMover(r)).indexOf(f) >= 0; });
        if (!vis.length) { box.innerHTML = vazio('Nada com “' + esc(st.filtro) + '”.'); return; }
        vis.forEach(function (r) {
          var row = linha('#1a4f72', '#eef6fb', '#bcdcef', '<span style="display:inline-flex;align-items:center;gap:7px">' + ICONS.mover + '<span>' + esc(rotuloRegraMover(r)) + '</span></span>');
          row.addEventListener('click', function () { confirmarMover(row, r, cnj, info.tarefa); });
          box.appendChild(row);
        });
      } else {
        if (!comCasadas.length) { box.innerHTML = vazio('Nenhuma regra de <b>comunicação</b> ativa.<br>Configure na aba <b>Etiquetas</b> (tipo Comunicar).'); return; }
        var visC = comCasadas.filter(function (r) { return !f || norm(rotuloRegraComunicar(r)).indexOf(f) >= 0; });
        if (!visC.length) { box.innerHTML = vazio('Nada com “' + esc(st.filtro) + '”.'); return; }
        visC.forEach(function (r) {
          var row = linha('#0f6e56', '#e1f5ee', '#9fe1cb', '<span style="display:inline-flex;align-items:center;gap:7px">' + svgMail + '<span>' + esc(rotuloRegraComunicar(r)) + '</span></span>');
          row.addEventListener('click', function () { confirmarComunicar(row, r, cnj); });
          box.appendChild(row);
        });
        var nota = document.createElement('div');
        nota.style.cssText = 'padding:8px 11px;color:#6b7280;font-size:11px;border-top:1px solid #eef0f2;line-height:1.45;margin-top:4px';
        nota.innerHTML = '📨 Entra na <b>fila</b> (ordem do clique) → motor "Preparar Expediente": <b>prepara e para</b>, você envia. Com 2+ autos, um de cada vez.';
        box.appendChild(nota);
      }
    }
    render();
  }
  // Comunicar COMPOSTO: aplica a etiqueta (se faltar) → move pela regra pareada
  // (mesma etiqueta, moverREST 1-salto) → enfileira o preparo. O drenador do painel
  // prepara e para. O move e o etiquetar reusam os caminhos REST já testados.
  // Comunicar COMPOSTO: aplica a etiqueta (se faltar) → enfileira. O DRENADOR do painel
  // faz o move pareado (mesma etiqueta) e então prepara — serial, sem corrida.
  function confirmarComunicar(row, regra, cnj) {
    row.style.pointerEvents = 'none'; row.style.opacity = '0.6';
    var antes = row.innerHTML; row.innerHTML = '⏳ enfileirando…';
    var etiqueta = regra.etiqueta || '';
    var idProcesso = getIdProcesso();
    var jaTem = etiquetasDoDOM().some(function (e) { return norm(e) === norm(etiqueta); });
    var pEtq = (!jaTem && idProcesso && etiqueta)
      ? inserirEtiquetas([etiqueta]).then(function () { try { lembrarInseridas(cnj, [etiqueta]); refletirEtiquetasNoPainel([etiqueta]); } catch (_) { } })
      : Promise.resolve();
    pEtq.then(function () {
      dispatchComunicar(regra, cnj);
      try { pjmLogAutos(cnj, (etiqueta || rotuloRegraComunicar(regra)) + ' (Comunicar composto)'); } catch (_) { }
      fecharPainel();
      toast('📨 Comunicação enfileirada: ' + rotuloRegraComunicar(regra) + '\n(etiquetei; o painel move e prepara — você envia no fim)', 'success');
    }).catch(function (e) {
      row.innerHTML = antes; row.style.pointerEvents = ''; row.style.opacity = '';
      toast('❌ Falha ao etiquetar/enfileirar: ' + ((e && e.message) || e), 'error');
    });
  }
  function confirmarMover(row, regra, cnj, tarefaOrigem) {
    var antes = row.innerHTML;
    var trans = transicoesDaRegra(regra);
    var idTask = getIdTaskInstance();
    var ehPipeline = !!(regra.pipeline && regra.pipeline.length);
    row.style.pointerEvents = 'none'; row.style.opacity = '0.6';

    // SIMULAR (flag da regra): checa a 1ª transição via REST, NÃO move.
    if (regra.simular) {
      if (!idTask || !trans.length) { restaurarRow(row, antes); toast('❌ Sem idTaskInstance ou transição para simular.', 'error'); return; }
      row.innerHTML = '🔎 simulando…';
      transicoesREST(idTask).then(function (ts) {
        var disp = ts.map(nomeTransicao).filter(Boolean);
        var alvo = trans[0];
        var ok = disp.some(function (n) { return norm(n) === norm(alvo); });
        fecharPainel();
        if (ok) toast('🔎 Simulação — "' + alvo + '" DISPONÍVEL' + (trans.length > 1 ? ' (pipeline ' + trans.length + 'p; testei o 1º)' : '') + '. Não movi.', 'success');
        else toast('🔎 Simulação — "' + alvo + '" INDISPONÍVEL nesta tarefa.\nDisponíveis: ' + (disp.slice(0, 8).join(', ') || '—'), 'warning');
      }).catch(function (e) { restaurarRow(row, antes); toast('❌ Falha ao simular: ' + ((e && e.message) || e), 'error'); });
      return;
    }

    // EXECUTAR (fluxo B) — primeiro APLICA a etiqueta da regra (se faltar): o motor do
    // painel acha o processo PELA etiqueta na tarefa inicial; sem ela, não acha. Depois:
    // 1 salto SIMPLES → REST aqui; QUALQUER pipeline → motor do painel (Lote/formulário).
    var _etq = regra.etiqueta || '', _idProc = getIdProcesso();
    var _jaTem = etiquetasDoDOM().some(function (e) { return norm(e) === norm(_etq); });
    var _pEtq = (!_jaTem && _idProc && _etq)
      ? inserirEtiquetas([_etq]).then(function () { try { lembrarInseridas(cnj, [_etq]); refletirEtiquetasNoPainel([_etq]); } catch (_) { } })
      : Promise.resolve();
    _pEtq.then(function () {
      if (!ehPipeline && trans.length === 1 && idTask) {
        row.innerHTML = '↪ movendo…';
        return moverREST(idTask, trans[0]).then(function (ok) {
          if (ok) pjmLogAutos(cnj, (regra.labelRelatorio || regra.etiqueta || trans[0]) + ' (Movimentar)');
          fecharPainel();
          if (ok) toast('↪ Movido: "' + trans[0] + '"\n(atualize os autos para ver)', 'success');
          else toast('❌ Não moveu — transição indisponível ou exige formulário. Tente Simular.', 'error');
        });
      }
      row.innerHTML = '⏳ pipeline — enviando ao painel…';
      toast('↪ Etiquetei; movimentando "' + (regra.etiqueta || '') + '" (pipeline ' + trans.length + 'p) — no painel.', 'info');
      setTimeout(function () { dispatchMover(regra, cnj, regra.tarefaInicial || tarefaOrigem || ''); }, 250);
    }).catch(function (e) { restaurarRow(row, antes); toast('❌ Falha ao etiquetar/mover: ' + ((e && e.message) || e), 'error'); });
  }

  // ── Barra de botões ──────────────────────────────────────────────────
  function seg(iconeSvg, rotulo, titulo, onClick) {
    var s = document.createElement('button');
    s.type = 'button';
    s.title = titulo || rotulo;
    Object.assign(s.style, {
      display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 13px',
      border: 'none', background: 'transparent', cursor: 'pointer', color: '#fff',
      font: "13px 'Segoe UI', Arial, sans-serif", whiteSpace: 'nowrap', textTransform: 'none'
    });
    s.innerHTML = '<span style="display:inline-flex">' + iconeSvg + '</span><span>' + esc(rotulo) + '</span>';
    s.addEventListener('mouseenter', function () { s.style.background = 'rgba(255,255,255,.15)'; });
    s.addEventListener('mouseleave', function () { s.style.background = 'transparent'; });
    s.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
    return s;
  }
  function sep() {
    var d = document.createElement('span');
    Object.assign(d.style, { width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,.22)', margin: '7px 0' });
    return d;
  }

  function abrirPainel() {
    fecharPainel();
    try { if (window.PJeOverlay && window.PJeOverlay.open) { window.PJeOverlay.open(); return; } } catch (_) { /* noop */ }
    toast('❌ Painel não carregou. Recarregue a página.', 'error');
  }
  function abrirJuntar() {
    fecharPainel();
    try { if (typeof window.PJM_abrirElaborarAto === 'function') { window.PJM_abrirElaborarAto(); return; } } catch (_) { /* noop */ }
    toast('❌ "Elaborar ato" não disponível nesta tela.', 'error');
  }

  // Alterna a linha do tempo dos autos pela TABELA (módulo content/tabela-autos.js).
  function alternarTabela() {
    fecharPainel();
    try {
      if (typeof window.PJM_toggleTabela === 'function') {
        var ok = window.PJM_toggleTabela();
        if (ok === false) toast('❌ Linha do tempo não encontrada nesta tela.', 'warning');
        return;
      }
    } catch (_) { /* noop */ }
    toast('❌ Tabela não disponível nesta tela.', 'error');
  }

  // Consolida tudo na barra: esconde o ⚖️ (floating-button) e o fab 📝 (juntada-autos) nos autos.
  function ocultarFlutuantes() {
    try { var f = document.getElementById('pjm-floating-btn'); if (f) f.style.display = 'none'; } catch (_) { /* noop */ }
    try { if (typeof window.PJM_ocultarFabJuntada === 'function') window.PJM_ocultarFabJuntada(); } catch (_) { /* noop */ }
  }

  // ── Barra arrastável (posição persistida) + ancoragem dos popovers ────
  var POS_KEY = 'pjm_autos_bar_pos';
  function loadBarPos() {
    try { var r = localStorage.getItem(POS_KEY); if (r) { var p = JSON.parse(r); if (typeof p.left === 'number' && typeof p.top === 'number') return p; } } catch (_) { /* noop */ }
    return null;
  }
  function saveBarPos(l, t) { try { localStorage.setItem(POS_KEY, JSON.stringify({ left: l, top: t })); } catch (_) { /* noop */ } }
  function clampBar(bar, l, t) {
    var w = bar.offsetWidth || 360, h = bar.offsetHeight || 44;
    return { left: Math.max(4, Math.min(l, window.innerWidth - w - 4)), top: Math.max(4, Math.min(t, window.innerHeight - h - 4)) };
  }
  function aplicarBarPos(bar, p) {
    var c = clampBar(bar, p.left, p.top);
    bar.style.left = c.left + 'px'; bar.style.top = c.top + 'px';
    bar.style.right = 'auto'; bar.style.bottom = 'auto';
  }
  function ancorarNaBarra(el) {
    var bar = document.getElementById('pjm-autos-bar');
    if (!bar) return;
    var r = bar.getBoundingClientRect();
    var cx = (r.left + r.right) / 2;
    // Horizontal: ancora pelo lado da barra que está mais perto da borda.
    if (cx < window.innerWidth / 2) { el.style.left = Math.max(8, r.left) + 'px'; el.style.right = 'auto'; }
    else { el.style.right = Math.max(8, window.innerWidth - r.right) + 'px'; el.style.left = 'auto'; }
    // Vertical: barra na metade de cima → abre ABAIXO; na de baixo → abre ACIMA.
    if (r.top < window.innerHeight / 2) { el.style.top = Math.round(r.bottom + 8) + 'px'; el.style.bottom = 'auto'; }
    else { el.style.bottom = Math.max(8, window.innerHeight - r.top + 8) + 'px'; el.style.top = 'auto'; }
  }
  function tornarArrastavel(bar, grip) {
    var st = null;
    function move(e) {
      if (!st) return;
      var pt = e.touches ? e.touches[0] : e;
      aplicarBarPos(bar, { left: pt.clientX - st.ox, top: pt.clientY - st.oy });
      if (e.cancelable) e.preventDefault();
    }
    function up() {
      if (!st) return;
      var r = bar.getBoundingClientRect();
      saveBarPos(r.left, r.top);
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('mouseup', up, true);
      document.removeEventListener('touchmove', move, { capture: true });
      document.removeEventListener('touchend', up, true);
      st = null;
    }
    function down(e) {
      if (e.type === 'mousedown' && e.button !== 0) return;
      var pt = e.touches ? e.touches[0] : e;
      var r = bar.getBoundingClientRect();
      aplicarBarPos(bar, { left: r.left, top: r.top });
      st = { ox: pt.clientX - r.left, oy: pt.clientY - r.top };
      document.addEventListener('mousemove', move, true);
      document.addEventListener('mouseup', up, true);
      document.addEventListener('touchmove', move, { passive: false, capture: true });
      document.addEventListener('touchend', up, true);
      if (e.cancelable) e.preventDefault();
    }
    grip.addEventListener('mousedown', down);
    grip.addEventListener('touchstart', down, { passive: false });
  }
  // ── Atalhos de extensões: botões que ligam/desligam outras extensões ──────
  function setDotExt(btn, on) {
    var dot = btn && btn.querySelector('.pjm-ext-dot'); if (!dot) return;
    dot.setAttribute('data-on', on ? '1' : '0');
    dot.style.background = on ? '#22c55e' : 'rgba(255,255,255,.35)';
  }
  function atualizarEstadosExt(ids) {
    if (!ids || !ids.length) return;
    try {
      chrome.runtime.sendMessage({ type: 'PJM_EXT_STATE', ids: ids }, function (resp) {
        if (chrome.runtime.lastError || !resp || !resp.ok) return;
        (resp.estados || []).forEach(function (st) {
          var btn = document.querySelector('#pjm-autos-bar [data-ext-id="' + st.id + '"]');
          if (btn) setDotExt(btn, st.enabled);
        });
      });
    } catch (_) { /* noop */ }
  }
  function toggleExt(ext, btn) {
    var dot = btn.querySelector('.pjm-ext-dot');
    var ativa = dot && dot.getAttribute('data-on') === '1';
    try {
      chrome.runtime.sendMessage({ type: 'PJM_EXT_TOGGLE', id: ext.id, enable: !ativa }, function (resp) {
        if (chrome.runtime.lastError) { toast('❌ ' + chrome.runtime.lastError.message, 'error'); return; }
        if (!resp || !resp.ok) { toast('❌ Não consegui alternar' + (resp && resp.error ? ': ' + resp.error : '') + '. Talvez precise confirmar no Chrome.', 'error'); atualizarEstadosExt([ext.id]); return; }
        setDotExt(btn, resp.enabled);
        toast((resp.enabled ? '✔ ' : '⏸ ') + (ext.name || 'Extensão') + (resp.enabled ? ' ativada' : ' desativada'), resp.enabled ? 'success' : 'info');
      });
    } catch (e) { toast('❌ ' + (e && e.message ? e.message : e), 'error'); }
  }
  function abrirExt(ext, btn) {
    var dot = btn && btn.querySelector('.pjm-ext-dot');
    if (dot && dot.getAttribute('data-on') !== '1') {
      toast('⚠ ' + (ext.name || 'A extensão') + ' parece desativada. Ative-a e recarregue a página.', 'warning');
    }
    try { window.dispatchEvent(new CustomEvent('PJM_ABRIR_EXT_' + ext.id)); }
    catch (e) { toast('❌ ' + (e && e.message ? e.message : e), 'error'); }
  }
  function montarAtalhosExt(bar) {
    if (!bar) return;
    try {
      chrome.storage.local.get('pjmExtAtalhos', function (r) {
        var cfg = r && r.pjmExtAtalhos;
        var exts = (cfg && Array.isArray(cfg.exts)) ? cfg.exts : [];
        var cont = bar.querySelector('#pjm-ext-atalhos');
        if (!cont) { cont = document.createElement('span'); cont.id = 'pjm-ext-atalhos'; cont.style.display = 'inline-flex'; cont.style.alignItems = 'stretch'; bar.appendChild(cont); }
        cont.innerHTML = '';
        if (!exts.length) return;
        exts.forEach(function (ext) {
          if (!ext || !ext.id) return;
          cont.appendChild(sep());
          var b = seg(ICONS.ext, ext.name || 'Extensão', 'Abrir ' + (ext.name || 'extensão'), function () { abrirExt(ext, b); });
          b.setAttribute('data-ext-id', ext.id);
          var dot = document.createElement('span');
          dot.className = 'pjm-ext-dot';
          Object.assign(dot.style, { width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(255,255,255,.35)', marginLeft: '3px', flexShrink: '0' });
          b.appendChild(dot);
          cont.appendChild(b);
        });
        atualizarEstadosExt(exts.map(function (e) { return e.id; }));
      });
    } catch (_) { /* noop */ }
    if (!window.__PJM_EXT_WIRED__) {
      window.__PJM_EXT_WIRED__ = true;
      try {
        chrome.storage.onChanged.addListener(function (ch, area) {
          if (area === 'local' && ch.pjmExtAtalhos) { var b2 = document.getElementById('pjm-autos-bar'); if (b2) montarAtalhosExt(b2); }
        });
      } catch (_) { /* noop */ }
      try {
        chrome.runtime.onMessage.addListener(function (m) {
          if (m && m.type === 'PJM_EXT_CHANGED') { var btn = document.querySelector('#pjm-autos-bar [data-ext-id="' + m.id + '"]'); if (btn) setDotExt(btn, m.enabled); }
        });
      } catch (_) { /* noop */ }
    }
  }

  function criarBarra() {
    if (document.getElementById('pjm-autos-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'pjm-autos-bar';
    Object.assign(bar.style, {
      position: 'fixed', bottom: '22px', right: '20px', zIndex: '2147483645',
      display: 'inline-flex', alignItems: 'stretch', background: '#1a5276',
      border: 'none', borderRadius: '24px', overflow: 'hidden',
      boxShadow: '0 6px 20px rgba(0,0,0,.28)'
    });
    var grip = document.createElement('span');
    grip.title = 'Arraste para mover';
    Object.assign(grip.style, { display: 'inline-flex', alignItems: 'center', padding: '0 6px 0 12px', color: 'rgba(255,255,255,.65)', cursor: 'grab', touchAction: 'none' });
    grip.innerHTML = ICONS.grip;
    bar.appendChild(grip);
    bar.appendChild(seg(ICONS.tag, 'Etiquetar', 'Etiquetar este processo (sem sair dos autos)', abrirEtiquetar));
    bar.appendChild(sep());
    bar.appendChild(seg(ICONS.mover, 'Ações', 'Movimentar ou Comunicar por regra de etiqueta', abrirAcoes));
    bar.appendChild(sep());
    bar.appendChild(seg(ICONS.juntar, 'Juntar', 'Juntar documentos (Elaborar ato)', abrirJuntar));
    bar.appendChild(sep());
    bar.appendChild(seg(ICONS.tabela, 'Tabela', 'Alternar linha do tempo / tabela dos documentos', alternarTabela));
    bar.appendChild(sep());
    bar.appendChild(seg(ICONS.painel, 'Painel', 'Abrir o painel do Mapeador', abrirPainel));
    document.body.appendChild(bar);
    try { montarAtalhosExt(bar); } catch (_) { /* noop */ }
    var saved = loadBarPos();
    if (saved) aplicarBarPos(bar, saved);
    tornarArrastavel(bar, grip);
    window.addEventListener('resize', function () { var r = bar.getBoundingClientRect(); aplicarBarPos(bar, { left: r.left, top: r.top }); });
    document.addEventListener('click', function (ev) {
      if (!painelEl) return;
      if (painelEl.contains(ev.target) || bar.contains(ev.target)) return;
      fecharPainel();
    }, true);
  }

  // ── API para o auto-etiquetador por marco (content/marco-etiquetador.js) ──
  // Reaproveita o mesmo caminho de escrita (REST + memória + log no Relatório).
  window.PJM_ctxAutos = function () { return { idProcesso: getIdProcesso(), cnj: getCnj() }; };
  window.PJM_etiquetasProcessoAtual = function () { try { return etiquetasDoDOM(); } catch (_) { return []; } };
  window.PJM_toastAutos = function (msg, tipo) { try { toast(msg, tipo); } catch (_) { } };
  window.PJM_aplicarEtiquetaAutos = function (tags, label) {
    var arr = (Array.isArray(tags) ? tags : [tags]).map(function (t) { return String(t == null ? '' : t).trim(); }).filter(Boolean);
    if (!arr.length) return Promise.resolve(false);
    return inserirEtiquetas(arr).then(function () {
      try { lembrarInseridas(getCnj(), arr); } catch (_) { }
      try { refletirEtiquetasNoPainel(arr); } catch (_) { }
      if (label) { try { pjmLogAutos(getCnj(), label); } catch (_) { } }
      return true;
    });
  };

  function init() {
    criarBarra();
    ocultarFlutuantes();
    setTimeout(ocultarFlutuantes, 800);
    setTimeout(ocultarFlutuantes, 2200);
    console.log('[PJM autos-acoes v6 +barra +painel +juntar +tabela +arrastavel +azul +atalhos +restmove +simular +desvincular +acoes(comunicar-composto+mov-pipeline+mov-etiqueta+com-composto)] carregado em', location.href.slice(0, 80));
  }
  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
