(function () {
  'use strict';

  // R-4: guard de reinjeção
  if (window.__pjmColetorApiProd) return;
  window.__pjmColetorApiProd = true;

  if (window.PJM_ehAssistentePrepararExpediente && window.PJM_ehAssistentePrepararExpediente()) return;

  var SEL = window.PJM_SEL || {};
  var NUM_PROC    = SEL.NUM_PROCESSO      || 'span.tarefa-numero-processo';
  var NUM_PROC_P  = SEL.NUM_PROCESSO_PROC || 'span.tarefa-numero-processo.process';
  var NUM_PROC_FB = SEL.NUM_PROCESSO_FB   || 'span.tarefa-numero-processo:not(.process)';

  // ── CONFIG ────────────────────────────────────────────────────────────────
  var CONFIG = {
    autoColetar: true,        // coletar a tarefa ao abrir a tela de lista
    cardsPadrao: { minhas: true, gerais: false },  // fallback do "Quais cards capturar" se não houver pjmConfig
    debounceMs: 800,          // espera o Angular estabilizar antes de coletar
    apiBase: null,            // null = auto-detecta (cross-origin frontend↔API)
    ENDPOINTS: {
      tarefas:          '/pje/seam/resource/rest/pje-legacy/painelUsuario/tarefas',
      tarefasFavoritas: '/pje/seam/resource/rest/pje-legacy/painelUsuario/tarefasFavoritas',
      processos:        '/pje/seam/resource/rest/pje-legacy/painelUsuario/recuperarProcessosTarefaPendenteComCriterios/{nomeTarefa}/{flag}',
    },
    tarefasBody: { numeroProcesso: '', competencia: '', etiquetas: [] },
    processos: {
      flag: 'false',
      maxResults: 1000,   // 1 página por tarefa: o servidor ignora paginação e devolve a lista toda
      criterioBase: {
        numeroProcesso: '', classe: null, tags: [], tagsString: null, poloAtivo: null,
        poloPassivo: null, orgao: null, ordem: 'DESC', idTaskInstance: null, apelidoSessao: null,
        idTipoSessao: null, dataSessao: null, somenteFavoritas: null, objeto: null, semEtiqueta: null,
        assunto: null, dataAutuacao: null, nomeParte: null, nomeFiltro: null, numeroDocumento: null,
        competencia: '', relator: null, orgaoJulgador: null, somenteLembrete: null, somenteSigiloso: null,
        eleicao: null, estado: null, municipio: null, prioridadeProcesso: null, cpfCnpj: null, porEtiqueta: null,
      },
    },
    campos: {
      tarefa:  { nome: ['nome', 'nomeTarefa'], quantidade: ['quantidadePendente', 'quantidade', 'qtd', 'total'], id: ['id', 'idTarefa'] },
      processo: { numero: ['numeroProcesso', 'numero', 'numeroProcessoFormatado'],
                  id: ['idProcesso', 'id', 'idTaskInstance'],
                  etiquetas: ['tagsProcessoList', 'etiquetas', 'tags'],
                  orgao: ['orgaoJulgador', 'orgao'], classe: ['classeJudicial', 'classe'] },
    },
    concorrencia: 3,
    delayEntreReqMs: 250,
    maxPaginas: 50,          // teto por tarefa na coleta explícita/completa
    maxPaginasAuto: 6,       // teto na coleta automática ao abrir (gentil: ~180 processos)
    timeoutReqMs: 20000,
  };

  // ── Utilidades ──────────────────────────────────────────────────────────
  var RE_CNJ = /\d{7}-\d{2}\.\d{4}\.\d{1,2}\.\d{2}\.\d{4}/;
  function txt(el) { return el ? (el.textContent || '').trim().replace(/\s+/g, ' ') : ''; }
  function cnjDe(s) { var m = (s || '').match(RE_CNJ); return m ? m[0] : ''; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function logw(e) { try { console.warn('[PJM coleta-api v1.10]', e); } catch (_) { /* noop */ } }

  function pega(o, aliases) { if (!o) return undefined; for (var i = 0; i < aliases.length; i++) if (o[aliases[i]] != null) return o[aliases[i]]; return undefined; }

  function acharArray(obj) {
    if (Array.isArray(obj)) return obj;
    if (!obj || typeof obj !== 'object') return null;
    var ks = ['entities', 'resultado', 'resultados', 'content', 'items', 'itens', 'lista', 'tarefas', 'processos', 'data', 'rows'];
    for (var i = 0; i < ks.length; i++) if (Array.isArray(obj[ks[i]])) return obj[ks[i]];
    for (var p in obj) if (Object.prototype.hasOwnProperty.call(obj, p) && Array.isArray(obj[p])) return obj[p];
    return null;
  }

  function interpolar(tpl, params) {
    return String(tpl).replace(/\{(\w+)\}/g, function (_, k) { return params && params[k] != null ? encodeURIComponent(params[k]) : ''; });
  }

  var _apiBaseCache = null;
  function detectarApiBase() {
    if (_apiBaseCache) return _apiBaseCache;
    try {
      var ents = performance.getEntriesByType('resource') || [];
      for (var i = 0; i < ents.length; i++) {
        var u = ents[i].name || '';
        if (/\/seam\/resource\/rest\/pje-legacy\/painelUsuario\//.test(u)) { _apiBaseCache = new URL(u).origin; return _apiBaseCache; }
      }
    } catch (_) { /* noop */ }
    return null;
  }
  function base() { return CONFIG.apiBase || detectarApiBase() || location.origin; }

  var _apiHeaders = null;
  try {
    chrome.storage.local.get('pjmApiHeaders', function (r) { if (r && r.pjmApiHeaders) _apiHeaders = r.pjmApiHeaders; });
    window.addEventListener('message', function (ev) {
      if (ev.source === window && ev.data && ev.data.__pjmApiHeaders) {
        _apiHeaders = ev.data.__pjmApiHeaders;
        try { chrome.storage.local.set({ pjmApiHeaders: _apiHeaders }); } catch (_) { /* noop */ }
      }
    });
    chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch.pjmApiHeaders && ch.pjmApiHeaders.newValue) _apiHeaders = ch.pjmApiHeaders.newValue; });
  } catch (_) { /* noop */ }

  async function fetchJson(url, init) {
    if (/\/null(\/|$|\?)/.test(url)) throw new Error('URL com /null/ — contexto Seam (órgão/perfil) ausente.');
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, CONFIG.timeoutReqMs);
    try {
      init = init || {};
      var headers = Object.assign({ 'Accept': 'application/json, text/plain, */*' }, _apiHeaders || {}, init.headers || {});
      var resp = await fetch(url, Object.assign({ credentials: 'include', signal: ctrl.signal }, init, { headers: headers }));
      var ct = resp.headers.get('content-type') || '';
      var texto = await resp.text();
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' em ' + url);
      if (ct.indexOf('json') < 0 && !/^[\s\r\n]*[\[{]/.test(texto)) throw new Error('Resposta não-JSON (login/erro?) em ' + url);
      return JSON.parse(texto);
    } finally { clearTimeout(timer); }
  }

  async function mapComLimite(itens, limite, fn) {
    var out = new Array(itens.length), idx = 0;
    async function worker() {
      while (idx < itens.length) {
        var i = idx++;
        try { out[i] = await fn(itens[i], i); } catch (e) { out[i] = { __erro: String(e && e.message || e) }; }
        if (CONFIG.delayEntreReqMs) await sleep(CONFIG.delayEntreReqMs);
      }
    }
    var ws = []; for (var w = 0; w < Math.max(1, limite); w++) ws.push(worker());
    await Promise.all(ws);
    return out;
  }

  // ── Classificador (paridade com content/mapper.js) ──────────────────────
  var CATEGORIAS = {
    'conhecimento': ['petição inicial', 'analisar petição', 'analisar processos', 'inicial', 'ordinário', 'sumaríssimo'],
    'recursal': ['apelação', 'agravo', 'embargos', 'recurso interno', 'registrar recurso', 'julgamento do recurso'],
    'execução': ['cumprimento', 'penhora', 'expropriação', 'pagamento', 'execução'],
    'cautelar': ['liminar', 'medida cautelar', 'cautelar'],
    'comunicação': ['preparar comunicação', 'analisar resposta', 'carta de ordem', 'ofício', 'intimação', 'informação de ar', 'cumprimento de ar'],
    'prazo': ['prazo em curso', 'trânsito em julgado', 'informar data'],
    'instrução': ['audiência', 'perícia', 'prova', 'instrução'],
    'documentos': ['elaborar documentos', 'desentranhar', 'digitalizar'],
    'publicação': ['publicar processos', 'verificar decisão', 'verificar pendências'],
    'remessa': ['expedir processo', 'processos expedidos', 'processos remetidos', 'apreciação de outra', 'apreciação pela instância'],
    'suspensão': ['suspensos', 'sobrestados'],
    'arquivo': ['arquivamento provisório', 'arquivados provisoriamente', 'arquivado', 'baixado'],
    'determinação': ['analisar determinação'], 'petição': ['petição avulsa'],
    'pendências': ['aguardando providências'], 'assinatura': ['assinatura', 'assinar'],
  };
  function classificar(fase, subfase, nomeTarefa) {
    var s = (String(fase || '') + ' ' + String(subfase || '') + ' ' + String(nomeTarefa || '')).toLowerCase();
    for (var cat in CATEGORIAS) if (CATEGORIAS[cat].some(function (t) { return s.indexOf(t) >= 0; })) return cat;
    return fase ? 'outras' : 'não classificado';
  }

  // ── Parsers (defensivos) ─────────────────────────────────────────────────
  function parseEtiquetas(v) {
    if (!v) return [];
    if (Array.isArray(v)) {
      return v.map(function (e) {
        if (typeof e === 'string') return e;
        return (e && (e.nomeTag || e.nomeTagCompleto || e.nome || e.descricao || e.texto || e.label)) || '';
      }).filter(Boolean);
    }
    return [String(v)];
  }
  function parseTarefa(item) {
    var c = CONFIG.campos.tarefa;
    return { nome: String(pega(item, c.nome) || '').trim(), quantidade: parseInt(pega(item, c.quantidade), 10) || 0, idTarefa: pega(item, c.id) };
  }
  // Classe judicial: o PJe entrega "PROPAGANDA PARTIDARIA (11536)" (nome + codigo) ou um
  // objeto. Guardamos os dois -- o CODIGO e o identificador estavel (o nome muda com redacao).
  function _classeDe(v) {
    if (v == null) return { nome: '', codigo: '' };
    if (typeof v === 'object') {
      return { nome: String(v.descricao || v.nome || v.label || '').trim(),
               codigo: String(v.codigo || v.id || v.value || '').trim() };
    }
    var s = String(v).trim(), m = s.match(/^(.*?)\s*\((\d+)\)\s*$/);
    return m ? { nome: m[1].trim(), codigo: m[2] } : { nome: s, codigo: '' };
  }
  function parseProcesso(item) {
    var c = CONFIG.campos.processo, numBruto = pega(item, c.numero);
    var etq = parseEtiquetas(pega(item, c.etiquetas));
    return {
      numero: cnjDe(String(numBruto || '')) || String(numBruto || ''),
      idInterno: pega(item, c.id) != null ? String(pega(item, c.id)) : '',
      etiquetas: etq.filter(function (v, i, a) { return a.indexOf(v) === i; }),
      fase: String(pega(item, c.orgao) || pega(item, c.classe) || '').trim(),
      classe: _classeDe(pega(item, c.classe)).nome,
      classeCodigo: _classeDe(pega(item, c.classe)).codigo,
      subfase: '', origem: 'API',
    };
  }

  // ── Enriquecimento de href (raspado do DOM do painel) ─────────────────────
  // A coleta por API não traz href; o "Abrir no PJe em sequência" e o "↗ Autos"
  // precisam dele. Raspa os links das tarefas do ngframe e casa por card+nome.
  // Cache acumula entre coletas (sobrevive a coletas sem o dashboard visível).
  var _hrefCache = {};
  function _parseHrefTarefa(href) {
    var dec; try { dec = decodeURIComponent(href); } catch (_) { dec = href; }
    var m = dec.match(/lista-(?:minhas-tarefas|processos-tarefa)\/([^/]+?)(?:\/true)?\/([A-Za-z0-9+/=]+)$/);
    if (m) return { nome: m[1], filtroBase64: m[2] };
    var seg = dec.split('/'), idx = -1;
    for (var i = 0; i < seg.length; i++) { if (seg[i].indexOf('lista-') === 0) { idx = i; break; } }
    return { nome: (idx >= 0 ? seg[idx + 1] : '') || '', filtroBase64: seg[seg.length - 1] || '' };
  }
  function _normNome(s) { return String(s || '').trim().toUpperCase().replace(/\s+/g, ' '); }
  function _scrapeHrefsLocais() {
    var achou = {};
    try {
      document.querySelectorAll('a[href*="lista-minhas-tarefas"], a[href*="lista-processos-tarefa"]').forEach(function (a) {
        var href = a.getAttribute('href') || ''; if (!href) return;
        var tipo = /lista-processos-tarefa/.test(href) ? 'gerais' : 'minhas';
        var p = _parseHrefTarefa(href), nn = _normNome(p.nome);
        if (nn) achou[tipo + '|' + nn] = { href: href, filtroBase64: p.filtroBase64, nome: p.nome };
      });
    } catch (e) { logw(e); }
    return achou;
  }
  // Cada frame publica no storage os hrefs que enxerga (o ngframe tem o dashboard; o top, não).
  function publicarHrefs() {
    var achou = _scrapeHrefsLocais();
    var qtd = Object.keys(achou).length;
    if (!qtd) return;
    try {
      chrome.storage.local.get('pjmHrefTarefas', function (r) {
        var m = (r && r.pjmHrefTarefas) || {};
        Object.assign(m, achou); Object.assign(_hrefCache, achou);
        try { chrome.storage.local.set({ pjmHrefTarefas: m }); } catch (e) { logw(e); }
        console.log('[PJM coleta-api] hrefs publicados:', qtd, '(mapa total', Object.keys(m).length + ')');
      });
    } catch (e) { logw(e); }
  }
  function enriquecerHrefs(tarefas) {
    if (!tarefas || !tarefas.length) return tarefas;
    Object.assign(_hrefCache, _scrapeHrefsLocais());   // + o que este frame vê agora
    var n = 0;
    tarefas.forEach(function (t) {
      if (!t || !t.nome || t.href) return;
      var nn = _normNome(t.nome), tipo = t.tipoCard || 'minhas';
      var hit = _hrefCache[tipo + '|' + nn] || _hrefCache['minhas|' + nn] || _hrefCache['gerais|' + nn];
      if (hit) { t.href = hit.href; t.filtroBase64 = hit.filtroBase64; n++; }
    });
    console.log('[PJM coleta-api] enriquecer href:', n + '/' + tarefas.length, 'tarefa(s) | cache', Object.keys(_hrefCache).length);
    return tarefas;
  }
  // Mantém _hrefCache fresco a partir do storage (o ngframe publica; o top lê via onChanged).
  try {
    chrome.storage.local.get('pjmHrefTarefas', function (r) { if (r && r.pjmHrefTarefas) Object.assign(_hrefCache, r.pjmHrefTarefas); });
    chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch.pjmHrefTarefas && ch.pjmHrefTarefas.newValue) Object.assign(_hrefCache, ch.pjmHrefTarefas.newValue); });
  } catch (_) { /* noop */ }

  // ── Caminho API ──────────────────────────────────────────────────────────
  // Nomes das tarefas raspados do DOM (links "Minhas tarefas" do painel) — fallback
  // quando /tarefas vem vazio (contexto/competência). Reusa _parseHrefTarefa.
  function tarefasDoDOM() {
    var out = [], vistos = {};
    function add(nome) { var k = _normNome(nome); if (nome && !vistos[k]) { vistos[k] = 1; out.push({ nome: nome, tipoCard: 'minhas' }); } }
    try {   // 1) DOM local (quando este frame tem os links do painel)
      document.querySelectorAll('a[href*="lista-minhas-tarefas"]').forEach(function (a) {
        add(String(_parseHrefTarefa(a.getAttribute('href') || '').nome || '').trim());
      });
    } catch (e) { logw(e); }
    if (!out.length) {   // 2) mapa cross-frame (pjmHrefTarefas) — links publicados por outro frame
      try {
        Object.keys(_hrefCache).forEach(function (kk) {
          if (kk.indexOf('minhas|') === 0 && _hrefCache[kk] && _hrefCache[kk].nome) add(String(_hrefCache[kk].nome).trim());
        });
      } catch (e) { logw(e); }
    }
    return out;
  }
  async function _listarTarefasEndpoint(endpoint, tipoCard) {
    try {
      var json = await fetchJson(base() + endpoint,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CONFIG.tarefasBody) });
      return (acharArray(json) || []).map(parseTarefa).filter(function (t) { return t.nome; })
        .map(function (t) { t.tipoCard = tipoCard; return t; });
    } catch (e) { logw(e); return []; }
  }
  // Enumera as tarefas dos cards MARCADOS (segue "Quais cards capturar"):
  //   Minhas → tarefasFavoritas (tipoCard 'minhas'); Gerais → tarefas (tipoCard 'gerais').
  async function coletarTarefasAPI(cards) {
    cards = cards || CONFIG.cardsPadrao;
    var out = [];
    if (cards.minhas) {
      var minhas = await _listarTarefasEndpoint(CONFIG.ENDPOINTS.tarefasFavoritas, 'minhas');
      if (!minhas.length) minhas = tarefasDoDOM();   // fallback DOM (coluna Minhas)
      out = out.concat(minhas);
      console.log('[PJM coleta-api] Minhas → ' + minhas.length + ' tarefa(s) | headers=' + (_apiHeaders ? 'sim' : 'NÃO'));
    }
    if (cards.gerais) {
      var gerais = await _listarTarefasEndpoint(CONFIG.ENDPOINTS.tarefas, 'gerais');
      out = out.concat(gerais);
      console.log('[PJM coleta-api] Gerais → ' + gerais.length + ' tarefa(s) | headers=' + (_apiHeaders ? 'sim' : 'NÃO'));
    }
    return out;
  }
  // Filtra tarefas pela seleção do usuário (modal "Tarefas a capturar" → pjmTarefasBlock).
  // Chave = "nome|tipoCard" (minúsculas), espelhando fullscreen-overlay + background.
  function filtrarPorBlocklist(tarefas, bloquear) {
    if (!bloquear || !bloquear.length) return tarefas;
    var block = new Set(bloquear.map(function (s) { return String(s).trim().toLowerCase(); }));
    var puladas = [];
    var alvo = (tarefas || []).filter(function (t) {
      var nome = String(t.nome || '').trim().toLowerCase();
      var tipo = String(t.tipoCard || '').trim().toLowerCase();
      if (block.has(nome + '|' + tipo) || block.has(nome)) { puladas.push(t.nome); return false; }
      return true;
    });
    if (puladas.length) console.log('[PJM coleta-api] Bloqueadas pelo modal: ' + puladas.length + ' — ' + puladas.join(', '));
    return alvo;
  }
  function urlProcessos(nomeTarefa, flag) {
    return base() + interpolar(CONFIG.ENDPOINTS.processos, { nomeTarefa: nomeTarefa, flag: flag || CONFIG.processos.flag });
  }
  function corpoProcessos(offset) {
    return JSON.stringify(Object.assign({}, CONFIG.processos.criterioBase, { page: offset, maxResults: CONFIG.processos.maxResults }));
  }
  async function coletarProcessosAPI(nomeTarefa, maxPag, flag) {
    var procs = [], max = CONFIG.processos.maxResults, url = urlProcessos(nomeTarefa, flag), totalServidor = null;
    var limitePag = maxPag || CONFIG.maxPaginas, _vistos = {};
    for (var n = 0; n < limitePag; n++) {
      if (n > 0 && CONFIG.delayEntreReqMs) await sleep(CONFIG.delayEntreReqMs);   // gentil entre páginas
      var json = await fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpoProcessos(n * max) });
      if (totalServidor == null && json && typeof json.count === 'number') totalServidor = json.count;   // total real (campo count)
      var arr = acharArray(json) || [];
      var _novos = 0;
      arr.map(parseProcesso).forEach(function (p) {
        var d = String(p.numero || '').replace(/\D/g, '');
        if (p.numero && !_vistos[d]) { _vistos[d] = 1; procs.push(p); _novos++; }   // dedup por número
      });
      if (arr.length < max || _novos === 0) break;   // última página OU página repetida (servidor ignora paginação)
    }
    procs.totalServidor = (totalServidor != null) ? totalServidor : procs.length;
    return procs;
  }

  // ── Fallback DOM (tela atual) ────────────────────────────────────────────
  function extrairProcessosDOMTelaAtual() {
    var out = [], vistos = {};
    document.querySelectorAll(NUM_PROC_P + ', ' + NUM_PROC_FB).forEach(function (el) {
      var num = cnjDe(txt(el)); if (!num || vistos[num]) return; vistos[num] = 1;
      var container = el.closest('div.col-sm-11') || el.closest('div[class*="col-sm-11"]') || el.closest('div.datalist-content');
      var etiquetas = [];
      if (container) container.querySelectorAll('div.label.label-info.label-etiqueta').forEach(function (d) {
        var span = [].slice.call(d.querySelectorAll('span')).find(function (s) {
          var cls = s.className || ''; return cls.indexOf('fa ') < 0 && cls.indexOf('fa-') !== 0 && cls.indexOf('glyphicon') < 0;
        });
        var nome = txt(span);
        if (nome && nome.length > 1 && !/Excluir|Desvincular|Remover/.test(nome)) etiquetas.push(nome);
      });
      out.push({ numero: num, idInterno: '', etiquetas: etiquetas.filter(function (v, i, a) { return a.indexOf(v) === i; }),
                 fase: txt(container && container.querySelector('.fase, span.orgao, span.local')), subfase: '', origem: 'DOM' });
    });
    return out;
  }

  // ── Orquestração ─────────────────────────────────────────────────────────
  function nomeTarefaDaTela() {
    return decodeURIComponent((location.hash.match(/lista-(?:minhas-tarefas|processos-tarefa)\/([^/]+)/) || [])[1] || '');
  }
  function emTelaDeLista() { return /lista-(?:minhas-tarefas|processos-tarefa)/.test(location.hash); }
  // 'minhas' = card "Minhas Tarefas" (lista-minhas-tarefas); 'gerais' = "Tarefas Gerais" (lista-processos-tarefa)
  function tipoTelaLista() {
    if (/lista-minhas-tarefas/.test(location.hash)) return 'minhas';
    if (/lista-processos-tarefa/.test(location.hash)) return 'gerais';
    return null;
  }

  /** Coleta a tarefa aberta: tenta API; em falha, cai para o DOM da tela. */
  async function coletarTarefaAtual(opts) {
    opts = opts || {};
    var nome = nomeTarefaDaTela();
    if (!nome) throw new Error('Nenhuma tarefa aberta na tela.');
    var flag = (tipoTelaLista() === 'gerais') ? 'false' : 'true';
    var t0 = Date.now(), via = 'API', processos;
    try {
      processos = await coletarProcessosAPI(nome, opts.maxPaginas, flag);
    } catch (e) {
      logw('API falhou, fallback DOM: ' + (e && e.message));
      via = 'DOM(fallback)';
      processos = extrairProcessosDOMTelaAtual();
    }
    processos.forEach(function (p) { p.categoria = classificar(p.fase, p.subfase, nome); });
    var resultado = { tarefa: nome, via: via, tipoCard: (flag === 'false' ? 'gerais' : 'minhas'),
                      total: (processos.totalServidor != null ? processos.totalServidor : processos.length),
                      coletados: processos.length, processos: processos,
                      origin: base(), timestamp: new Date().toISOString(), duracaoMs: Date.now() - t0 };
    persistir(resultado);
    console.log('%c[PJM coleta-api v1.10] ' + via + ' — "' + nome + '": ' + processos.length + ' processo(s) em ' + resultado.duracaoMs + 'ms',
      'color:#0f766e;font-weight:bold');
    return resultado;
  }

  function gerarResumo(tarefas) {
    var rz = { totalTarefas: tarefas.length, totalProcessos: 0, comEtiqueta: 0, semEtiqueta: 0, porCategoria: {}, porEtiqueta: {}, porTarefa: {} };
    tarefas.forEach(function (t) {
      var ps = t.processos || [];
      rz.totalProcessos += ps.length;
      rz.porTarefa[t.nome] = ps.length;
      ps.forEach(function (p) {
        var cat = p.categoria || 'não classificado';
        rz.porCategoria[cat] = (rz.porCategoria[cat] || 0) + 1;
        if ((p.etiquetas || []).length) { rz.comEtiqueta++; p.etiquetas.forEach(function (e) { rz.porEtiqueta[e] = (rz.porEtiqueta[e] || 0) + 1; }); }
        else rz.semEtiqueta++;
      });
    });
    return rz;
  }

  // Mescla a coleta da tarefa no "último mapeamento" que o painel/overlay já consome
  // (pjeMapperUltimoResultado), para os processos+etiquetas aparecerem no painel.
  function mesclarNoMapeamento(col) {
    try {
      chrome.storage.local.get('pjeMapperUltimoResultado', function (r) {
        var res = (r && r.pjeMapperUltimoResultado) || { tarefas: [], fonte: 'Coleta API', timestamp: new Date().toISOString() };
        if (!Array.isArray(res.tarefas)) res.tarefas = [];
        var dados = { nome: col.tarefa, quantidade: col.total, processos: col.processos, fonteColeta: col.via, tipoCard: col.tipoCard || 'minhas', timestamp: col.timestamp };
        var idx = -1;
        for (var i = 0; i < res.tarefas.length; i++) { if ((res.tarefas[i].nome || '') === col.tarefa) { idx = i; break; } }
        if (idx >= 0) res.tarefas[idx] = Object.assign({}, res.tarefas[idx], dados);
        else res.tarefas.push(Object.assign({ id: res.tarefas.length + 1 }, dados));
        res.resumo = gerarResumo(res.tarefas);
        if (!res.fonte) res.fonte = 'Coleta API';
        try { chrome.storage.local.set({ pjeMapperUltimoResultado: res }); } catch (e) { logw(e); }
      });
    } catch (e) { logw(e); }
  }

  function persistir(resultado) {
    try { chrome.storage.local.set({ pjmColetaApi: resultado }); } catch (e) { logw(e); }
    try { window.dispatchEvent(new CustomEvent('pjm:coleta-api', { detail: resultado })); } catch (e) { logw(e); }
    mesclarNoMapeamento(resultado);
  }

  // Varredura completa: coleta TODAS as tarefas (Minhas/favoritas por padrão) de uma vez,
  // em segundo plano, e grava o panorama completo no pjeMapperUltimoResultado.
  // Lê a config de captura (cards marcados + blocklist do modal) do storage.
  function lerConfigCaptura() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(['pjmConfig', 'pjmTarefasBlock'], function (r) {
          resolve({ cards: (r && r.pjmConfig && r.pjmConfig.cards) || CONFIG.cardsPadrao,
                    bloquear: (r && r.pjmTarefasBlock) || [] });
        });
      } catch (_) { resolve({ cards: CONFIG.cardsPadrao, bloquear: [] }); }
    });
  }

  // Varredura completa: segue os cards MARCADOS ("Quais cards capturar") e a seleção
  // do modal ("Tarefas a capturar"). opts.cards/opts.bloquear sobrepõem o storage.
  async function coletarTudo(opts) {
    opts = opts || {};
    var cfg = await lerConfigCaptura();
    var cards = opts.cards || cfg.cards;
    var bloquear = opts.bloquear || cfg.bloquear;
    var maxPag = opts.maxPaginas || CONFIG.maxPaginasAuto || 8;   // cap gentil por tarefa
    var t0 = Date.now();
    var marcados = [cards.minhas && 'Minhas', cards.gerais && 'Gerais'].filter(Boolean).join('+') || 'nenhum';
    console.log('[PJM coleta-api] Varredura iniciada (cards=' + marcados + ', bloqueadas=' + (bloquear ? bloquear.length : 0) + ')…');
    var tarefas = filtrarPorBlocklist(await coletarTarefasAPI(cards), bloquear);
    var comProcs = await mapComLimite(tarefas, CONFIG.concorrencia, async function (t) {
      var flag = (t.tipoCard === 'gerais') ? 'false' : 'true';   // flag conforme o card
      try {
        var procs = await coletarProcessosAPI(t.nome, maxPag, flag);
        procs.forEach(function (p) { p.categoria = classificar(p.fase, p.subfase, t.nome); });
        return { nome: t.nome, quantidade: procs.length, coletados: procs.length,
                 total: (procs.totalServidor != null ? procs.totalServidor : procs.length),
                 processos: procs, fonteColeta: 'API', tipoCard: t.tipoCard || 'minhas' };
      } catch (e) {
        return { nome: t.nome, quantidade: 0, processos: [], tipoCard: t.tipoCard || 'minhas', _erro: String(e && e.message || e) };
      }
    });
    var res = { tarefas: comProcs.filter(function (t) { return (t.processos || []).length > 0; }),
                fonte: 'Coleta API (varredura ' + marcados + ')', timestamp: new Date().toISOString() };
    enriquecerHrefs(res.tarefas);   // anexa href/filtroBase64 (cross-frame) — p/ "Abrir em sequência" e "↗ Autos"
    res.resumo = gerarResumo(res.tarefas);
    res.duracaoMs = Date.now() - t0;
    try { chrome.storage.local.set({ pjeMapperUltimoResultado: res, pjmUltimaVarreduraTs: Date.now() }); } catch (e) { logw(e); }
    try { window.dispatchEvent(new CustomEvent('pjm:coleta-api', { detail: res })); } catch (e) { logw(e); }
    console.log('%c[PJM coleta-api v1.10] Varredura: ' + res.tarefas.length + ' tarefa(s) com processos, ' +
      res.resumo.totalProcessos + ' processo(s) em ' + res.duracaoMs + 'ms', 'color:#0f766e;font-weight:bold');
    return res;
  }

  // Coleta um conjunto específico de tarefas (por nome) via API e MESCLA no
  // pjeMapperUltimoResultado, mantendo as demais (usado pelo re-map das afetadas).
  async function coletarTarefas(nomes, opts) {
    opts = opts || {};
    var flag = opts.flag || 'true';
    var maxPag = opts.maxPaginas || CONFIG.maxPaginas;
    var coletas = await mapComLimite(nomes || [], CONFIG.concorrencia, async function (nome) {
      try {
        var procs = await coletarProcessosAPI(nome, maxPag, flag);
        procs.forEach(function (p) { p.categoria = classificar(p.fase, p.subfase, nome); });
        return { nome: nome, total: (procs.totalServidor != null ? procs.totalServidor : procs.length), processos: procs };
      } catch (e) { return { nome: nome, processos: [], _erro: String(e && e.message || e) }; }
    });
    await new Promise(function (resolve) {
      try {
        chrome.storage.local.get('pjeMapperUltimoResultado', function (r) {
          var res = (r && r.pjeMapperUltimoResultado) || { tarefas: [], fonte: 'Coleta API', timestamp: new Date().toISOString() };
          if (!Array.isArray(res.tarefas)) res.tarefas = [];
          coletas.forEach(function (c) {
            var dados = { nome: c.nome, quantidade: (c.processos || []).length, coletados: (c.processos || []).length,
                          total: c.total, processos: c.processos, fonteColeta: 'API', tipoCard: (flag === 'true' ? 'minhas' : 'gerais'), timestamp: new Date().toISOString() };
            var idx = -1;
            for (var i = 0; i < res.tarefas.length; i++) { if ((res.tarefas[i].nome || '') === c.nome) { idx = i; break; } }
            if (idx >= 0) res.tarefas[idx] = Object.assign({}, res.tarefas[idx], dados);
            else res.tarefas.push(Object.assign({ id: res.tarefas.length + 1 }, dados));
          });
          enriquecerHrefs(res.tarefas);   // backfill href/filtroBase64 (DOM) nas tarefas
          res.timestamp = new Date().toISOString();   // avança o T0 → limpa marcadores "movido oculto" (re-map = dado fresco)
          res.resumo = gerarResumo(res.tarefas);
          try { chrome.storage.local.set({ pjeMapperUltimoResultado: res }); } catch (e) { logw(e); }
          try { window.dispatchEvent(new CustomEvent('pjm:coleta-api', { detail: res })); } catch (e) { logw(e); }
          resolve(res);
        });
      } catch (e) { logw(e); resolve(null); }
    });
    return coletas;
  }

  // ── Gatilho sob demanda (ao abrir a tela de lista) ───────────────────────
  var _ultimoHash = '', _debounce = null, _coletando = false;
  function agendarColeta() {
    if (!CONFIG.autoColetar || !emTelaDeLista()) return;
    if (location.hash === _ultimoHash) return;          // mesma tela, ignora
    _ultimoHash = location.hash;
    clearTimeout(_debounce);
    _debounce = setTimeout(function () {
      if (!chrome.storage || !chrome.storage.local) return;
      chrome.storage.local.get(['pjmAtivo', 'pjmConfig', 'pjmExecutandoFila'], function (r) {
        if (r && r.pjmAtivo === false) return;           // respeita o desligar da extensão
        // Não coleta enquanto a fila de ações executa (evita capturar passos intermediários de pipeline).
        var _execTs = r && r.pjmExecutandoFila;
        if (_execTs && (Date.now() - _execTs) < 5 * 60 * 1000) return;
        // Respeita "Quais cards capturar" (Configurações): por padrão só Minhas Tarefas.
        var cards = (r && r.pjmConfig && r.pjmConfig.cards) || CONFIG.cardsPadrao;
        var tipo = tipoTelaLista();
        if (tipo === 'minhas' && cards.minhas === false) return;
        if (tipo === 'gerais' && cards.gerais !== true) return;   // gerais desligado por padrão
        if (_coletando) return;
        _coletando = true;
        coletarTarefaAtual({ maxPaginas: CONFIG.maxPaginasAuto }).catch(logw).finally(function () { _coletando = false; });
      });
    }, CONFIG.debounceMs);
  }
  window.addEventListener('hashchange', agendarColeta);
  window.addEventListener('popstate', agendarColeta);
  // O PJe/Angular navega via history.pushState — que NÃO dispara 'hashchange' — e
  // o content script (mundo isolado) não enxerga o pushState feito no mundo MAIN.
  // Por isso detectamos a troca de tela por polling leve do hash (agendarColeta
  // tem guard próprio anti-duplicação).
  setInterval(agendarColeta, 1200);
  if (document.readyState === 'complete' || document.readyState === 'interactive') agendarColeta();
  else window.addEventListener('load', agendarColeta);

  // ── Mensagem runtime: {type:'PJM_COLETAR_API', nomeTarefa?, completa?} ───
  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg || msg.type !== 'PJM_COLETAR_API') return;
      (async function () {
        try {
          if (msg.nomeTarefa) {
            var procs = await coletarProcessosAPI(msg.nomeTarefa);
            procs.forEach(function (p) { p.categoria = classificar(p.fase, p.subfase, msg.nomeTarefa); });
            var res = { tarefa: msg.nomeTarefa, via: 'API', total: procs.length, processos: procs, timestamp: new Date().toISOString() };
            persistir(res); sendResponse({ ok: true, data: res });
          } else {
            sendResponse({ ok: true, data: await coletarTarefaAtual() });
          }
        } catch (e) { sendResponse({ ok: false, error: String(e && e.message || e) }); }
      })();
      return true; // resposta assíncrona
    });
  } catch (e) { logw(e); }

  // ── Mensagem runtime: {type:'PJM_COLETAR_TUDO'} (agendamento/alarme) — só no top frame ──
  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg || msg.type !== 'PJM_COLETAR_TUDO') return;
      if (window.top !== window.self) return;   // só o top frame executa (evita duplicar entre frames)
      coletarTudo(msg).then(function (res) { try { sendResponse({ ok: true, total: res.resumo.totalProcessos }); } catch (_) { /* noop */ } })
                      .catch(function (e) { try { sendResponse({ ok: false, error: String(e && e.message || e) }); } catch (_) { /* noop */ } });
      return true;
    });
  } catch (e) { logw(e); }

  // ── API pública ──────────────────────────────────────────────────────────
  window.PJeColetorAPI = {
    __v: '1.13',
    CONFIG: CONFIG,
    coletarTarefaAtual: coletarTarefaAtual,
    coletarTudo: coletarTudo,
    coletarTarefas: coletarTarefas,
    coletarTarefasAPI: coletarTarefasAPI,
    coletarProcessosAPI: coletarProcessosAPI,
    extrairProcessosDOMTelaAtual: extrairProcessosDOMTelaAtual,
    detectarApiBase: detectarApiBase,
  };

  // Publica os hrefs das tarefas no storage (roda em TODOS os frames; o ngframe é
  // quem tem o dashboard, o top frame só lê via onChanged). setTimeouts + hashchange
  // + observer debounced cobrem o carregamento tardio do Angular.
  try {
    [1500, 4000, 8000].forEach(function (ms) { setTimeout(publicarHrefs, ms); });
    window.addEventListener('hashchange', function () { setTimeout(publicarHrefs, 900); });
    if (document.body && window.MutationObserver) {
      var _tHref; new MutationObserver(function () { clearTimeout(_tHref); _tHref = setTimeout(publicarHrefs, 1500); }).observe(document.body, { childList: true, subtree: true });
    }
  } catch (_) { /* noop */ }

  // ── Agendamento "Ao abrir o PJe" (1×/sessão) — só no top frame, gated por pjmConfig.agendaModo ──
  if (window.top === window.self) {
    try {
      chrome.storage.local.get(['pjmConfig', 'pjmUltimaVarreduraTs', 'pjmAtivo'], function (r) {
        if (r && r.pjmAtivo === false) return;
        var modo = r && r.pjmConfig && r.pjmConfig.agendaModo;
        if (modo !== 'sessao') return;
        var ultima = (r && r.pjmUltimaVarreduraTs) || 0;
        if (Date.now() - ultima < 30 * 60 * 1000) return;   // já varreu nos últimos 30 min
        setTimeout(function () { coletarTudo().catch(logw); }, 5000);   // espera o PJe carregar a sessão
      });
    } catch (e) { logw(e); }
  }

  console.log('[PJM coleta-api v1.10] carregado. API base: ' + (detectarApiBase() || '(auto)') + ' | autoColetar: ' + CONFIG.autoColetar);
})();
