/**
 * PJe Mapeador — TABELA NOS AUTOS  [pjm-tabela-autos v1]
 * ════════════════════════════════════════════════════════════════════════════
 * Alterna a linha do tempo nativa dos autos por uma TABELA (ID · Data · Tipo),
 * com carregamento completo (vence o lazy-load), filtros, ordenação e cópia p/
 * Google Sheets (TSV). Portado do AuditJE "Tabela na Página" e ADAPTADO ao
 * MapeamentoJE:
 *   • Autocontido em IIFE (não vaza globais; guarda de reinjeção).
 *   • Correção do regex de diacríticos: /[̀-ͯ]/g (robusto a copy/paste).
 *   • SEM barra própria de toggle: o controle vive no #pjm-autos-bar
 *     (autos-acoes.js) via window.PJM_toggleTabela(). A faixa de controles da
 *     tabela (Todos/Docs/Movs, contagem, ↻, ⧉ Sheets, progresso) só aparece no
 *     modo tabela, sticky no topo do container da timeline.
 *   • Liga/desliga por storage: pjmAtivo (global) && pjmTabelaAutos (esta feature).
 *   • Observer com debounce + intervalo de 2 s (custo menor sob all_frames:true).
 *
 * Prefixo interno: _pjmtab- / ids pjmtab-  (sem colisao com pjm-, etq-, ag-).
 * DOM do PJe (ponto de adaptação): ver bloco "CONTRATO DE DOM" abaixo.
 */
(function () {
  'use strict';
  if (window.__PJM_TABELA_AUTOS__) return;          // guarda de reinjeção
  window.__PJM_TABELA_AUTOS__ = true;
  if (window.PJM_ehAssistentePrepararExpediente && window.PJM_ehAssistentePrepararExpediente()) return;

  var EXT = (typeof chrome !== 'undefined') ? chrome : (typeof browser !== 'undefined' ? browser : null);

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║ CONTRATO DE DOM (adapte aqui se o PJe de destino diferir)             ║
  // ║  container:  .eventos-timeline | #divTimeLine:divEventosTimeLine       ║
  // ║  entradas:   .media.interno   corpo: .media-body.box                   ║
  // ║  movimento:  .texto-movimento   hora: .col-sm-12 small|small.text-muted║
  // ║  docs:       .anexos > a, .anexos > ul.tree > li > a                   ║
  // ║  data:       irmão anterior .media.data → .data-interna|.text-muted    ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Datas / extração ────────────────────────────────────────────────────
  var _MES_NUM = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };

  function _dataDaEntradaTimeline(entrada) {
    var reHdr = /^(\d{1,2})\s+([a-zç]{3})\w*\.?\s+(\d{4})$/i;
    var reDMY = /(\d{2})\/(\d{2})\/(\d{4})/;
    var sib = entrada && entrada.previousElementSibling;
    for (var k = 0; sib && k < 300; k++, sib = sib.previousElementSibling) {
      if (!(sib.classList && sib.classList.contains('data'))) continue;
      var alvo = sib.querySelector('.data-interna, .text-muted');
      var t = ((alvo ? alvo.textContent : sib.textContent) || '').replace(/\s+/g, ' ').trim();
      var m = t.match(reHdr);
      if (m && _MES_NUM[m[2].toLowerCase().slice(0, 3)]) return String(m[1]).padStart(2, '0') + '/' + _MES_NUM[m[2].toLowerCase().slice(0, 3)] + '/' + m[3];
      m = t.match(reDMY);
      if (m) return m[1] + '/' + m[2] + '/' + m[3];
    }
    return '';
  }

  function getLinksDocumentos() {
    return [].slice.call(document.querySelectorAll('a[id*="divTimeLine"]')).filter(function (a) {
      return a.textContent.trim().match(/^\d{6,}\s*-/);
    });
  }

  function getTimelineContainer() {
    return document.getElementById('divTimeLine:divEventosTimeLine') ||
           document.querySelector('[id*="divEventosTimeLine"]');
  }

  // Retorna [{id, nome, link}] a partir da árvore/timeline. 'link' é o <a> a clicar.
  function mapearDocumentosProcesso() {
    var docs = [], seen = new Set();
    getLinksDocumentos().forEach(function (a) {
      var texto = (a.textContent || '').trim().replace(/\s+/g, ' ');
      var m = texto.match(/^(\d{6,})\s*-\s*(.+)$/);
      if (!m) return;
      var id = m[1], nome = m[2].trim();
      if (seen.has(id)) return; seen.add(id);
      docs.push({ id: id, nome: nome, link: a, href: '' });
    });
    return docs;
  }

  // Marca "requisitos do art. 27 (Res. TSE 23.609/2019)". Domínio eleitoral (TSE/TRE).
  function _eExcluidoAtos(nomeDoc) {
    var n = (nomeDoc || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/certid/.test(n) && (/criminal|antecedente|distribui|objeto.*pe|pe.*objeto/.test(n) ||
      /estadual|federal|trabalhist|eleitoral|militar|stj|stf|stm|tjm|trf|\bjf\b/.test(n))) return true;
    if (/escolaridade|diploma|historico.*escolar|grau.*instrucao|certificado.*conclus/.test(n)) return true;
    if (/^identidade|^rg\b|^cnh\b|^passaporte|documento.*identidade|identidade.*civil/.test(n)) return true;
    if (/declaracao.*bens|bens.*declaracao/.test(n)) return true;
    if (/peticao.*inicial|inicial.*peticao/.test(n)) return true;
    if (/^rrc\b|requerimento.*registro.*candidatura|registro.*candidatura/.test(n)) return true;
    if (/desincompat/.test(n)) return true;
    return false;
  }

  function extrairAtosProcessuais() {
    var atos = [];
    var vistos = new Set();
    var _tl = document.querySelector('.eventos-timeline')
      || getTimelineContainer()
      || document.querySelector('[id*="eventosTimeLine"], [id*="divTimeLine"]');
    if (_tl) {
      _tl.querySelectorAll('.media.interno').forEach(function (entrada) {
        var box = entrada.querySelector('.media-body.box') || entrada;
        var movEl = box.querySelector('.texto-movimento');
        var mov = (movEl ? movEl.textContent : '').replace(/\s+/g, ' ').trim();
        var horaEl = box.querySelector('.col-sm-12 small, small.text-muted');
        var hora = (horaEl ? horaEl.textContent : '').trim();
        var data = _dataDaEntradaTimeline(entrada);
        var docLinks = box.querySelectorAll('.anexos > a, .anexos > ul.tree > li > a');
        if (docLinks.length === 0) {
          if (!mov) return;
          var chaveM = 'mov|' + data + '|' + hora + '|' + mov;
          if (vistos.has(chaveM)) return;
          vistos.add(chaveM);
          atos.push({ id: null, nome: mov, data: data, hora: hora, movimento: mov, fonte: 'timeline' });
          return;
        }
        docLinks.forEach(function (a) {
          var t = (a.textContent || '').replace(/\s+/g, ' ').trim();
          var m = t.match(/(\d{5,})\s*[-–]\s*(.+)$/);
          if (!m) return;
          var chave = 'id|' + m[1];
          if (vistos.has(chave)) return;
          vistos.add(chave);
          atos.push({ id: m[1], nome: m[2], data: data, hora: hora, movimento: mov, fonte: 'timeline' });
        });
      });
    }
    // Fallbacks (PJe 1G/2G): tabela <tr> e seletores genéricos
    var containerTimeline = getTimelineContainer();
    if (atos.length === 0 && containerTimeline) {
      containerTimeline.querySelectorAll('tr').forEach(function (tr) {
        var tds = tr.querySelectorAll('td');
        if (tds.length < 2) return;
        var dataTxt = '', descTxt = '';
        tds.forEach(function (td) {
          var txt = (td.textContent || '').trim();
          if (!dataTxt && /\d{2}\/\d{2}\/\d{4}/.test(txt)) dataTxt = txt.match(/\d{2}\/\d{2}\/\d{4}/)[0];
          else if (!descTxt && txt.length > 3 && !/^\d{2}\/\d{2}\/\d{4}$/.test(txt)) descTxt = txt;
        });
        if (!descTxt) return;
        var chave = dataTxt + '|' + descTxt;
        if (vistos.has(chave)) return;
        vistos.add(chave);
        atos.push({ id: (descTxt.match(/(\d{6,9})\s*[-–]/) || [])[1] || null, nome: descTxt, data: dataTxt, fonte: 'timeline' });
      });
    }
    if (atos.length === 0) {
      var seletoresEvento = ['[id*="divTimeLine"] tr', '.timeline-event', '.tl-item', '.tl-item-container', 'app-timeline .timeline-item'];
      for (var s = 0; s < seletoresEvento.length; s++) {
        document.querySelectorAll(seletoresEvento[s]).forEach(function (el) {
          var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
          if (!txt || txt.length < 5) return;
          var mData = txt.match(/(\d{2}\/\d{2}\/\d{4})/);
          var dataTxt = mData ? mData[1] : '';
          var descTxt = txt.replace(/\d{2}\/\d{2}\/\d{4}(\s+\d{2}:\d{2})?/, '').trim();
          if (!descTxt || descTxt.length < 3) return;
          var chave = dataTxt + '|' + descTxt;
          if (vistos.has(chave)) return;
          vistos.add(chave);
          atos.push({ id: (descTxt.match(/(\d{6,9})\s*[-–]/) || [])[1] || null, nome: descTxt, data: dataTxt, fonte: 'timeline-gen' });
        });
        if (atos.length > 0) break;
      }
    }
    var docs = mapearDocumentosProcesso();
    docs.forEach(function (doc) {
      var chave = 'id|' + doc.id;
      if (vistos.has(chave)) return;
      if (_eExcluidoAtos(doc.nome)) return;
      vistos.add(chave);
      atos.push({ id: doc.id, nome: doc.nome, data: '', tipo: 'documento', origem: 'arvore' });
    });
    atos.sort(function (a, b) {
      if (a.data && b.data) return b.data.localeCompare(a.data);
      if (a.data) return -1; if (b.data) return 1; return 0;
    });
    return atos;
  }

  // ── ESTADO ──────────────────────────────────────────────────────────────
  var _ajtState = { view: 'timeline', conteudo: 'documentos', tipos: new Set(), ord: { col: 'data', dir: 'desc' }, dados: [], tlEl: null, entradasEl: null, carregado: false, carregando: false };
  var _ajtExtOn = true, _ajtTabOn = true;
  function _ajtAtivo() { return _ajtExtOn && _ajtTabOn; }

  // ── TIPOS DE DOCUMENTO (configuráveis; espelham storage 'pjmTabelaTipos') ─
  // Config editável na aba Configurações do painel. Ordem importa: 1ª regra que
  // casar (por prefixo da 1ª palavra do nome) vence.
  var _AJT_TIPOS_DEFAULT = [
    { key: 'certidao',   label: 'Certidão',        cor: '#166534', fundo: '#dcfce7', palavras: ['certid'], ativo: true },
    { key: 'peticao',    label: 'Petição',         cor: '#6b21a8', fundo: '#f3e8ff', palavras: ['peticao', 'recurso', 'contrarraz', 'contrarrazoes', 'memori', 'embargos', 'agravo', 'apelacao', 'contestacao'], ativo: true },
    { key: 'edital',     label: 'Edital',          cor: '#a21caf', fundo: '#fae8ff', palavras: ['edital'], ativo: true },
    { key: 'decisao',    label: 'Decisão/Acórdão', cor: '#92400e', fundo: '#fef3c7', palavras: ['decisao', 'acordao', 'sentenca', 'despacho', 'voto'], ativo: true },
    { key: 'informacao', label: 'Informação',      cor: '#075985', fundo: '#e0f2fe', palavras: ['informa'], ativo: true }
  ];
  var _ajtTipos = [], _ajtTiposMap = {};
  function _ajtSanitCor(c, fb) { return (typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c.trim())) ? c.trim() : fb; }
  function _ajtAplicarTipos(lista) {
    var base = (lista && lista.length) ? lista : _AJT_TIPOS_DEFAULT;
    _ajtTipos = base.map(function (t, i) {
      return {
        key: String(t.key || ('tipo' + i)).toLowerCase().replace(/[^a-z0-9_]/g, '') || ('tipo' + i),
        label: String(t.label || t.key || 'Tipo'),
        cor: _ajtSanitCor(t.cor, '#475569'),
        fundo: _ajtSanitCor(t.fundo, '#eef1f6'),
        palavras: (t.palavras || []).map(function (w) { return _ajtNorm(String(w)); }).filter(Boolean),
        ativo: t.ativo !== false
      };
    });
    _ajtTiposMap = {};
    _ajtTipos.forEach(function (t) { _ajtTiposMap[t.key] = t; });
  }
  _ajtAplicarTipos(null);   // semeia os padrões no carregamento

  // ── CLASSIFICAÇÃO E UTILITÁRIOS ─────────────────────────────────────────
  function _ajtNorm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function _ajtCatPrimaria(nome) {
    // Classifica pelo tipo no INÍCIO do nome — evita falso-positivo de palavra no meio
    // (ex.: "Certidão (... recurso ...)" era classificada como Petição por conter "recurso").
    var p = _ajtNorm(nome).replace(/^[^a-z]+/, '').split(/[\s(),.:;\/-]/)[0] || '';
    for (var i = 0; i < _ajtTipos.length; i++) {
      var t = _ajtTipos[i];
      if (!t.ativo) continue;
      for (var j = 0; j < t.palavras.length; j++) {
        if (t.palavras[j] && p.indexOf(t.palavras[j]) === 0) return t.key;
      }
    }
    return 'documento';
  }
  function _ajtCategorias(nome) {
    var c = [_ajtCatPrimaria(nome)];
    if (_eExcluidoAtos(nome)) c.push('requisitos');
    return c;
  }
  function _ajtBadge(nome) {
    var t = _ajtTiposMap[_ajtCatPrimaria(nome)];
    return t ? { label: t.label, cor: t.cor, fundo: t.fundo }
             : { label: 'Documento', cor: '#475569', fundo: '#eef1f6' };
  }
  function _ajtEsc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function _ajtChave(a) {
    var m = (a.data || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return (m ? m[3] + m[2] + m[1] : '00000000') + String(a.hora || '').replace(/\D/g, '').padEnd(4, '0').slice(0, 4);
  }

  // ── DADOS / FILTRO / ORDENAÇÃO ──────────────────────────────────────────
  function _ajtDados() {
    var porId = new Map(); var semId = [];
    extrairAtosProcessuais().forEach(function (a) {
      if (!a.id) { semId.push(a); return; }
      var ex = porId.get(a.id);
      porId.set(a.id, !ex ? a : (ex.data ? Object.assign({}, a, ex) : Object.assign({}, ex, a)));
    });
    return Array.from(porId.values()).concat(semId);
  }
  function _ajtFiltrados() {
    var arr = _ajtState.dados;
    if (_ajtState.conteudo === 'documentos') arr = arr.filter(function (a) { return a.id; });
    else if (_ajtState.conteudo === 'movimentos') arr = arr.filter(function (a) { return !a.id; });
    if (_ajtState.tipos.size) arr = arr.filter(function (a) { return a.id && _ajtCategorias(a.nome).some(function (c) { return _ajtState.tipos.has(c); }); });
    var col = _ajtState.ord.col, dir = _ajtState.ord.dir, sgn = dir === 'asc' ? 1 : -1;
    return arr.slice().sort(function (a, b) {
      var va, vb;
      if (col === 'data') { va = _ajtChave(a); vb = _ajtChave(b); }
      else if (col === 'id') { va = a.id || ''; vb = b.id || ''; }
      else if (col === 'tipo') { va = _ajtNorm(a.nome); vb = _ajtNorm(b.nome); }
      else { va = a.movimento || ''; vb = b.movimento || ''; }
      return va < vb ? -sgn : va > vb ? sgn : 0;
    });
  }

  // ── LINHA / RENDER / EVENTOS ────────────────────────────────────────────
  function _ajtLinha(a) {
    var mov = !a.id; var bd = mov ? { label: 'Movimento', cor: '#475569', fundo: '#e2e8f0' } : _ajtBadge(a.nome);
    var nome = _ajtEsc(a.nome || a.movimento || '—');
    var idCell = a.id
      ? '<span class="pjmtab-idv">' + _ajtEsc(a.id) + '</span><button type="button" class="pjmtab-cp" data-cp="' + _ajtEsc(a.id) + '" title="Copiar ID">⧉</button>'
      : '—';
    return '<tr data-id="' + (a.id || '') + '">'
      + '<td class="pjmtab-id ' + (mov ? 'mov' : '') + '">' + idCell + '</td>'
      + '<td class="pjmtab-data">' + (a.data ? '<b>' + _ajtEsc(a.data) + '</b>' : '—') + (a.hora ? '<small>' + _ajtEsc(a.hora) + '</small>' : '') + '</td>'
      + '<td class="pjmtab-tipo"><span class="pjmtab-bd" style="background:' + bd.fundo + ';color:' + bd.cor + '">' + _ajtEsc(bd.label) + '</span><div class="pjmtab-nm">' + nome + '</div></td></tr>';
  }
  function _ajtRender() {
    var wrap = document.getElementById('pjmtab-wrap'); var count = document.getElementById('pjmtab-count');
    if (!wrap) return;
    wrap.style.minHeight = '';
    var linhas = _ajtFiltrados();
    if (count) {
      var sub = _ajtState.conteudo === 'documentos' ? 'documentos' : _ajtState.conteudo === 'movimentos' ? 'movimentos' : 'atos';
      count.textContent = String(linhas.length);
      count.title = linhas.length + ' ' + sub;
    }
    _ajtSyncFiltroAtivo();
    var arw = function (c) { var on = _ajtState.ord.col === c; return '<span class="pjmtab-arw' + (on ? '' : ' off') + '">' + (on ? (_ajtState.ord.dir === 'asc' ? '▲' : '▼') : '⇅') + '</span>'; };
    var scol = function (c) { return _ajtState.ord.col === c ? 'pjmtab-sorted' : ''; };
    var tem = _ajtState.tipos.size > 0, ck = function (t) { return _ajtState.tipos.has(t) ? 'checked' : ''; };
    wrap.innerHTML = '<table class="pjmtab-tab"><thead><tr>'
      + '<th data-col="id" class="' + scol('id') + '">ID ' + arw('id') + '</th>'
      + '<th data-col="data" class="' + scol('data') + '">Data ' + arw('data') + '</th>'
      + '<th data-col="tipo" class="' + scol('tipo') + '"><span class="pjmtab-th-tipo">Tipo de Documento ' + arw('tipo') + '<button type="button" class="pjmtab-funil' + (tem ? ' on' : '') + '" data-funil>▾</button>'
      + '<div class="pjmtab-dd" data-dd hidden><b>Filtrar por tipo</b>'
      + '<div class="pjmtab-dd-list">'
      + _ajtTipos.filter(function (t) { return t.ativo; }).map(function (t) { return '<label><input type="checkbox" data-t="' + t.key + '" ' + ck(t.key) + '> ' + _ajtEsc(t.label) + '</label>'; }).join('')
      + '<label><input type="checkbox" data-t="requisitos" ' + ck('requisitos') + '> Requisitos p/ registro de candidatura</label>'
      + '</div>'
      + '<div class="pjmtab-dd-acoes"><button type="button" class="pjmtab-dd-limpar" data-limpar>Limpar</button><button type="button" class="pjmtab-dd-aplicar" data-aplicar>Aplicar</button></div>'
      + '</div></span></th></tr></thead>'
      + '<tbody>' + linhas.map(_ajtLinha).join('') + '</tbody></table>';
    _ajtWire(wrap);
  }
  function _ajtWire(wrap) {
    wrap.querySelectorAll('thead th[data-col]').forEach(function (th) {
      th.addEventListener('click', function (e) {
        if (e.target.closest('[data-funil]') || e.target.closest('[data-dd]')) return;
        var col = th.dataset.col;
        if (_ajtState.ord.col === col) _ajtState.ord.dir = _ajtState.ord.dir === 'asc' ? 'desc' : 'asc';
        else _ajtState.ord = { col: col, dir: col === 'data' ? 'desc' : 'asc' };
        _ajtRender();
      });
    });
    var f = wrap.querySelector('[data-funil]'), dd = wrap.querySelector('[data-dd]');
    if (f && dd) {
      var list = dd.querySelector('.pjmtab-dd-list');
      var posicionar = function () {   // menu FLUTUANTE (position:fixed) — nunca cortado; lista rolável
        var r = f.getBoundingClientRect();
        if (list) {
          list.style.maxHeight = 'none';
          var fixo = dd.offsetHeight - list.offsetHeight;
          var espaco = Math.max(window.innerHeight - r.bottom - 16, r.top - 16);
          list.style.maxHeight = Math.max(80, espaco - fixo) + 'px';
        }
        var w = dd.offsetWidth, h = dd.offsetHeight;
        var left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
        var top = (r.bottom + 5 + h <= window.innerHeight - 8) ? r.bottom + 5 : Math.max(8, r.top - 5 - h);
        dd.style.position = 'fixed'; dd.style.top = top + 'px'; dd.style.left = left + 'px';
      };
      var fechar = function () { dd.hidden = true; window.removeEventListener('scroll', fechar, true); window.removeEventListener('resize', fechar); };
      f.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!dd.hidden) { fechar(); return; }
        dd.hidden = false; posicionar();
        setTimeout(function () {
          document.addEventListener('click', function x() { fechar(); document.removeEventListener('click', x); });
          window.addEventListener('scroll', fechar, true);
          window.addEventListener('resize', fechar);
        }, 0);
      });
      dd.addEventListener('click', function (e) { e.stopPropagation(); });
      var aplicar = dd.querySelector('[data-aplicar]');
      if (aplicar) aplicar.addEventListener('click', function (e) {
        e.stopPropagation();
        _ajtState.tipos.clear();
        dd.querySelectorAll('input[data-t]:checked').forEach(function (x) { _ajtState.tipos.add(x.dataset.t); });
        _ajtRender();
      });
      var lp = dd.querySelector('[data-limpar]');
      if (lp) lp.addEventListener('click', function (e) { e.stopPropagation(); _ajtLimparFiltros(); });
    }
    wrap.querySelectorAll('tbody tr[data-id]').forEach(function (tr) { tr.addEventListener('click', function () { if (tr.dataset.id) _ajtAbrir(tr.dataset.id); }); });
    wrap.querySelectorAll('.pjmtab-cp[data-cp]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); _ajtCopiar(b.dataset.cp, b); }); });
  }
  function _ajtAbrir(id) {
    try { var d = mapearDocumentosProcesso().find(function (x) { return String(x.id) === String(id); }); if (d && d.link) d.link.click(); } catch (_) { }
  }
  function _ajtCopiar(txt, btn) {
    var ok = function () { if (btn) { var o = btn.textContent; btn.textContent = '✓'; btn.classList.add('ok'); setTimeout(function () { btn.textContent = o; btn.classList.remove('ok'); }, 900); } };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(String(txt)).then(ok, function () { _ajtCopiarFallback(txt, ok); });
      else _ajtCopiarFallback(txt, ok);
    } catch (_) { _ajtCopiarFallback(txt, ok); }
  }
  function _ajtCopiarFallback(txt, ok) {
    try { var t = document.createElement('textarea'); t.value = String(txt); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); if (ok) ok(); } catch (_) { }
  }
  function _ajtSyncFiltroAtivo() {
    var el = document.getElementById('pjmtab-fativo'); if (!el) return;   // opcional
    var mostrar = _ajtState.view === 'tabela' && _ajtState.tipos.size > 0;
    el.hidden = !mostrar;
    if (mostrar) { var b = el.querySelector('b'); if (b) b.textContent = String(_ajtState.tipos.size); }
  }
  function _ajtLimparFiltros() { _ajtState.tipos.clear(); _ajtRender(); }

  // ── COPIAR PARA O SHEETS (TSV) ──────────────────────────────────────────
  function _ajtCopiarSheets(btn) {
    var linhas = _ajtFiltrados();
    var cel = function (v) { return String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' ').trim(); };
    var tsv = [['ID', 'Data', 'Hora', 'Tipo', 'Documento']]
      .concat(linhas.map(function (a) {
        var tipo = a.id ? _ajtBadge(a.nome).label : 'Movimento';
        return [a.id || '', a.data || '', a.hora || '', tipo, a.nome || a.movimento || ''].map(cel);
      }))
      .map(function (r) { return r.join('\t'); }).join('\n');
    var ok = function () { if (btn) { if (!btn.dataset.label) btn.dataset.label = btn.textContent; btn.textContent = '✓'; setTimeout(function () { btn.textContent = btn.dataset.label; }, 1200); } };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tsv).then(ok, function () { _ajtCopiarFallback(tsv, ok); });
      else _ajtCopiarFallback(tsv, ok);
    } catch (_) { _ajtCopiarFallback(tsv, ok); }
  }

  // ── TROCA DE VISÃO E CARREGAMENTO ───────────────────────────────────────
  function _ajtSetView(v) {
    _ajtState.view = v;
    var ent = _ajtState.entradasEl, wrap = document.getElementById('pjmtab-wrap'), bar = document.getElementById('pjmtab-bar');
    if (bar) bar.style.display = (v === 'tabela') ? 'flex' : 'none';   // faixa de controles só no modo tabela
    _ajtSyncFiltroAtivo();
    if (v === 'tabela') {
      _ajtState.conteudo = 'documentos';
      var cont = document.getElementById('pjmtab-cont');
      if (cont) cont.querySelectorAll('.pjmtab-fcont').forEach(function (x) { x.classList.toggle('on', x.dataset.c === 'documentos'); });
      _ajtCarregarERenderizar(false);
    } else {
      if (ent) ent.style.display = '';
      if (wrap) wrap.style.display = 'none';
      _ajtSetLoading(false);
    }
  }
  function _ajtScrollCandidatos() {
    var set = new Set();
    var add = function (e) { if (e && e.nodeType === 1) set.add(e); };
    add(_ajtState.tlEl);
    add(getTimelineContainer());
    add(document.scrollingElement); add(document.documentElement); add(document.body);
    var p = _ajtState.tlEl;
    for (var k = 0; k < 8 && p && p !== document.body; k++) {
      try { var st = getComputedStyle(p); if (/(auto|scroll)/.test(st.overflowY + ' ' + st.overflow)) add(p); } catch (_) { }
      p = p.parentElement;
    }
    return Array.from(set);
  }
  function _ajtScrollLoad(onProgresso) {
    var conta = function () { return document.querySelectorAll('.media.interno').length || getLinksDocumentos().length; };
    var anterior = -1, estavel = 0;
    var passo = function (i) {
      if (i >= 80) return Promise.resolve(conta());
      _ajtScrollCandidatos().forEach(function (c) { try { c.scrollTop = c.scrollHeight; c.dispatchEvent(new Event('scroll', { bubbles: true })); } catch (_) { } });
      try { window.scrollTo(0, document.body.scrollHeight); } catch (_) { }
      return new Promise(function (r) { setTimeout(r, 350); }).then(function () {
        var atual = conta();
        if (onProgresso) onProgresso(atual);
        if (atual > 0 && atual === anterior) { if (++estavel >= 6) return conta(); } else estavel = 0;
        anterior = atual;
        return passo(i + 1);
      });
    };
    return passo(0);
  }
  function _ajtCarregarERenderizar(force) {
    if (_ajtState.carregando) return;
    var ent = _ajtState.entradasEl, wrap = document.getElementById('pjmtab-wrap');
    var mostrarTabela = function () {
      var emTabela = (_ajtState.view === 'tabela');
      // v1.5: o scroll-load re-renderiza a timeline do PJe e DESANEXA a bar/wrap injetadas
      // (o observer re-monta uma wrap NOVA, oculta). Rebuscar fresco + re-montar se sumiu —
      // a referencia velha renderizava a tabela num elemento destacado ("nao abria ao terminar").
      if (emTabela && !document.getElementById('pjmtab-wrap')) { try { _ajtMount(); } catch (_) { } }
      var entA = _ajtState.entradasEl;
      var wrapA = document.getElementById('pjmtab-wrap');
      var barA = document.getElementById('pjmtab-bar');
      if (!emTabela) { if (entA) entA.style.display = ''; if (wrapA) wrapA.style.display = 'none'; return; }
      if (barA) barA.style.display = 'flex';
      if (entA) entA.style.display = 'none';
      if (wrapA) wrapA.style.display = 'block';
      _ajtState.dados = _ajtDados();
      _ajtRender();
      if (barA) { try { barA.scrollIntoView({ block: 'start' }); } catch (_) { } }
    };
    if (force || !_ajtState.carregado) {
      _ajtState.carregando = true;
      if (ent) ent.style.display = '';        // timeline visível: o scroll aciona o lazy-load do PJe
      if (wrap) wrap.style.display = 'none';
      _ajtSetLoading(true, document.querySelectorAll('.media.interno').length);
      _ajtScrollLoad(function (n) { if (_ajtState.view === 'tabela') _ajtSetLoading(true, n); })
        .then(function () {
          _ajtState.carregado = true; _ajtState.carregando = false; _ajtSetLoading(false);
          mostrarTabela();
        }, function () { _ajtState.carregando = false; _ajtSetLoading(false); mostrarTabela(); });
      return;
    }
    mostrarTabela();
  }
  function _ajtSetLoading(on, n) {
    // Aviso FIXO de carregamento (position:fixed) — permanece visivel mesmo com a pagina
    // rolando durante o scroll-load, ao contrario da barrinha #pjmtab-loadbar (que rola junto
    // e passa despercebida). Some sozinho quando a carga termina.
    var ov = document.getElementById('pjmtab-overlay');
    if (on) {
      if (!ov) {
        ov = document.createElement('div'); ov.id = 'pjmtab-overlay'; ov.className = 'pjmtab-overlay';
        ov.innerHTML = '<span class="pjmtab-ov-spin"></span><span class="pjmtab-ov-txt">Carregando todos os documentos… <b>0</b></span><span class="pjmtab-ov-sub">a tabela abre ao terminar</span>';
        (document.body || document.documentElement).appendChild(ov);
      }
      var _ob = ov.querySelector('b'); if (_ob) _ob.textContent = String(n || 0);
      // v1.6: ancora o aviso na barra da extensao (#pjm-autos-bar) - abaixo dela se couber,
      // senao ACIMA (depende de onde o usuario arrastou a barra). Sem a barra: topo-centro.
      try {
        var _bar = document.getElementById('pjm-autos-bar');
        if (_bar) {
          var _r = _bar.getBoundingClientRect();
          var _w = ov.offsetWidth || 320, _h = ov.offsetHeight || 44, _gap = 8;
          // abaixo se couber na tela; senao, acima da barra
          var _top = (_r.bottom + _gap + _h <= window.innerHeight - 8) ? (_r.bottom + _gap) : Math.max(8, _r.top - _gap - _h);
          ov.style.left = Math.max(8, Math.min(_r.left, window.innerWidth - _w - 8)) + 'px';
          ov.style.top = _top + 'px';
          ov.style.transform = 'none';
        } else {
          ov.style.left = '50%'; ov.style.top = '14px'; ov.style.transform = 'translateX(-50%)';
        }
      } catch (_) { }
    } else if (ov) {
      ov.remove();
    }
    var lb = document.getElementById('pjmtab-loadbar');
    if (!lb) return;
    lb.hidden = !on;
    if (on) { var b = lb.querySelector('b'); if (b) b.textContent = String(n || 0); }
  }

  // ── CSS INJETADO ────────────────────────────────────────────────────────
  function _ajtInjectStyle() {
    if (document.getElementById('pjmtab-style')) return;
    var st = document.createElement('style'); st.id = 'pjmtab-style';
    st.textContent = '.pjmtab-bar{display:none;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;background:#f3f5f9;border-bottom:1px solid #e5e7eb;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif}'
      + '.pjmtab-seg{display:inline-flex;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden}'
      + '.pjmtab-seg button{border:none;background:#fff;color:#475569;font:600 12px/1 inherit;padding:6px 11px;cursor:pointer}'
      + '.pjmtab-seg button.on{background:#1a5276;color:#fff}'
      + '.pjmtab-chip{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:4px 11px;font:600 11px/1 inherit;color:#475569;cursor:pointer}'
      + '.pjmtab-chip.on{background:#1a5276;border-color:#1a5276;color:#fff}'
      + '.pjmtab-count{margin-left:auto;font:12px/1 monospace;color:#64748b}'
      + '.pjmtab-btn{border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:5px 9px;font:600 11px/1 inherit;color:#475569;cursor:pointer}'
      + '.pjmtab-btn:hover{border-color:#1a5276;color:#1a5276}'
      + '.pjmtab-wrap{overflow:auto;background:#fff}'
      + '.pjmtab-tab{width:100%;border-collapse:collapse;font:13px/1.4 -apple-system,"Segoe UI",Roboto,Arial,sans-serif}'
      + '.pjmtab-tab th{position:sticky;top:0;background:#f3f5f9;text-align:left;padding:8px 10px;border-bottom:1px solid #e5e7eb;font:700 10px/1 inherit;text-transform:uppercase;letter-spacing:.04em;color:#475569;white-space:nowrap;cursor:pointer;user-select:none}'
      + '.pjmtab-tab td{padding:9px 10px;border-bottom:1px solid #eef1f6;vertical-align:middle;color:#1f2937}'
      + '.pjmtab-tab tbody tr{cursor:pointer}'
      + '.pjmtab-id{font-family:monospace;color:#1a5276;white-space:nowrap}.pjmtab-id.mov{color:#94a3b8}'
      + '.pjmtab-data{font-family:monospace;white-space:nowrap}.pjmtab-data small{display:block;color:#94a3b8;font-size:11px}'
      + '.pjmtab-bd{display:inline-flex;align-items:center;font:700 10px/1 monospace;border-radius:999px;padding:3px 8px;flex:none}'
      + '.pjmtab-cert{background:#dcfce7;color:#166534}.pjmtab-pet{background:#f3e8ff;color:#6b21a8}.pjmtab-ed{background:#fae8ff;color:#a21caf}'
      + '.pjmtab-dec{background:#fef3c7;color:#92400e}.pjmtab-inf{background:#e0f2fe;color:#075985}.pjmtab-mov{background:#e2e8f0;color:#475569}.pjmtab-out{background:#eef1f6;color:#475569}'
      + '.pjmtab-th-tipo{position:relative;display:inline-flex;align-items:center;gap:5px}'
      + '.pjmtab-funil{border:none;background:transparent;color:#1a5276;cursor:pointer;font-size:11px;padding:0}'
      + '.pjmtab-dd{position:absolute;top:calc(100% + 5px);left:0;z-index:9999;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 8px 22px rgba(0,0,0,.18);padding:6px;min-width:252px;max-width:320px;text-transform:none;letter-spacing:0;display:flex;flex-direction:column}.pjmtab-dd[hidden]{display:none}'
      + '.pjmtab-dd-list{display:flex;flex-direction:column;overflow:auto;overscroll-behavior:contain}.pjmtab-dd-list::-webkit-scrollbar{width:8px}.pjmtab-dd-list::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px}'
      + '.pjmtab-dd b{display:block;font:700 10px/1 inherit;color:#64748b;text-transform:uppercase;letter-spacing:.04em;padding:2px 6px 5px}'
      + '.pjmtab-dd label{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:5px;font:400 12px/1.2 inherit;color:#1f2937;cursor:pointer}'
      + '.pjmtab-dd label:hover{background:#f3f5f9}'
      + '.pjmtab-dd-acoes{display:flex;gap:6px;margin-top:6px;padding-top:6px;border-top:1px solid #eef1f6}.pjmtab-dd-acoes button{flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:6px;font:600 11px/1 inherit;cursor:pointer}'
      + '.pjmtab-dd-limpar{background:#fff;color:#64748b}.pjmtab-dd-limpar:hover{background:#f3f5f9}.pjmtab-dd-aplicar{background:#1a5276;color:#fff;border-color:#1a5276}.pjmtab-dd-aplicar:hover{background:#154360}'
      + '.pjmtab-btn.pjmtab-icon{padding:5px 9px;font-size:14px;line-height:1}'
      + '.pjmtab-loadbar{flex:1 0 100%;display:flex;align-items:center;gap:8px;padding-top:2px}.pjmtab-loadbar[hidden]{display:none}.pjmtab-loadbar-txt{font:12px/1 inherit;color:#1a5276;white-space:nowrap}.pjmtab-loadbar-txt b{font-family:monospace}'
      + '.pjmtab-loadbar-track{flex:1;height:5px;border-radius:3px;background:#e5e7eb;overflow:hidden;position:relative}.pjmtab-loadbar-track i{position:absolute;top:0;bottom:0;width:35%;border-radius:3px;background:linear-gradient(90deg,#2980b9,#1a5276);animation:pjmtab-indet 1.1s ease-in-out infinite}'
      + '@keyframes pjmtab-indet{0%{left:-35%}100%{left:100%}}'
      + '.pjmtab-tab th.pjmtab-sorted{color:#1a5276}'
      + '.pjmtab-arw{margin-left:4px;font-size:10px}.pjmtab-arw.off{opacity:.4}'
      + '.pjmtab-data b{font-weight:600;color:#1f2937}'
      + '.pjmtab-tipo{min-width:0}.pjmtab-nm{display:block;margin-top:4px;color:#1f2937;line-height:1.35}'
      + '.pjmtab-idv{font-family:monospace}'
      + '.pjmtab-cp{border:none;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px;padding:0 0 0 5px;opacity:0;vertical-align:middle}'
      + '.pjmtab-tab tbody tr:hover .pjmtab-cp{opacity:1}.pjmtab-cp:hover{color:#1a5276}.pjmtab-cp.ok{color:#166534;opacity:1}'
      + '.pjmtab-tab tbody tr:nth-child(even) td{background:#fbfcfe}'
      + '.pjmtab-tab tbody tr:hover td{background:#eef5fd}'
      + '.pjmtab-overlay{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:10px;background:#1a5276;color:#fff;padding:11px 18px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.28);font:600 13px/1.2 -apple-system,system-ui,Arial,sans-serif;max-width:92vw}'
      + '.pjmtab-ov-spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:pjmtab-spin .8s linear infinite;flex:none}'
      + '.pjmtab-ov-txt b{font-family:monospace}'
      + '.pjmtab-ov-sub{opacity:.85;font-weight:400;font-size:12px;border-left:1px solid rgba(255,255,255,.35);padding-left:10px}'
      + '@keyframes pjmtab-spin{to{transform:rotate(360deg)}}';
    (document.head || document.documentElement).appendChild(st);
  }

  // ── LOCALIZAÇÃO / MONTAGEM / REMOÇÃO ────────────────────────────────────
  function _ajtTimelineEl() {
    return document.querySelector('.eventos-timeline')
      || document.getElementById('divTimeLine:divEventosTimeLine')
      || document.querySelector('[id*="divEventosTimeLine"], [id*="eventosTimeLine"]')
      || (document.querySelector('.media.interno') && document.querySelector('.media.interno').closest('.scroll-y, [id*="divTimeLine"]'))
      || getTimelineContainer();
  }
  function _ajtMount() {
    if (!_ajtAtivo()) return;
    if (document.getElementById('pjmtab-bar')) return;
    var tl = null; try { tl = _ajtTimelineEl(); } catch (_) { }
    if (!tl || !tl.parentElement) return;
    try {
      _ajtState.tlEl = tl;
      _ajtInjectStyle();
      // Faixa de controles da tabela (sem o toggle ☰/▦ — o toggle vive no #pjm-autos-bar). Oculta até o modo tabela.
      var bar = document.createElement('div'); bar.id = 'pjmtab-bar'; bar.className = 'pjmtab-bar';
      bar.innerHTML = '<span class="pjmtab-seg" id="pjmtab-cont"><button type="button" class="pjmtab-fcont" data-c="todos">Todos</button><button type="button" class="pjmtab-fcont on" data-c="documentos">Docs</button><button type="button" class="pjmtab-fcont" data-c="movimentos">Movs</button></span>'
        + '<span class="pjmtab-count" id="pjmtab-count" title=""></span>'
        + '<button type="button" class="pjmtab-btn pjmtab-icon" id="pjmtab-reload" title="Recarregar (buscar todos os itens)">↻</button>'
        + '<button type="button" class="pjmtab-btn pjmtab-icon" id="pjmtab-sheets" title="Copiar p/ Sheets">⧉</button>'
        + '<div class="pjmtab-loadbar" id="pjmtab-loadbar" hidden><span class="pjmtab-loadbar-txt">Carregando todos os itens… <b>0</b></span><div class="pjmtab-loadbar-track"><i></i></div></div>';
      var wrap = document.createElement('div'); wrap.id = 'pjmtab-wrap'; wrap.className = 'pjmtab-wrap';
      wrap.style.display = 'none';
      var entradasEl = tl.querySelector('[id*="eventosTimeLineElement"]') || null;
      _ajtState.entradasEl = entradasEl;
      bar.style.position = 'sticky'; bar.style.top = '0'; bar.style.zIndex = '20';
      tl.insertBefore(bar, tl.firstChild);
      if (entradasEl) tl.insertBefore(wrap, entradasEl); else tl.appendChild(wrap);
      wrap.style.maxHeight = Math.max(200, (tl.clientHeight || 500) - 42) + 'px';
      bar.querySelectorAll('.pjmtab-fcont').forEach(function (c) {
        c.addEventListener('click', function () {
          _ajtState.conteudo = c.dataset.c;
          bar.querySelectorAll('.pjmtab-fcont').forEach(function (x) { x.classList.toggle('on', x === c); });
          _ajtRender();
        });
      });
      var _bSheets = document.getElementById('pjmtab-sheets');
      if (_bSheets) _bSheets.addEventListener('click', function (e) { e.preventDefault(); _ajtCopiarSheets(_bSheets); });
      var _bReload = document.getElementById('pjmtab-reload');
      if (_bReload) _bReload.addEventListener('click', function (e) { e.preventDefault(); _ajtCarregarERenderizar(true); });
    } catch (e) { console.warn('[PJM tabela-autos] erro ao montar:', e); }
  }
  function _ajtRemover() {
    try { if (_ajtState.entradasEl) _ajtState.entradasEl.style.display = ''; } catch (_) { }
    var bar = document.getElementById('pjmtab-bar'); if (bar) bar.remove();
    var wrap = document.getElementById('pjmtab-wrap'); if (wrap) wrap.remove();
    _ajtState.view = 'timeline';
  }

  // ── API PÚBLICA (consumida pelo #pjm-autos-bar em autos-acoes.js) ────────
  window.PJM_toggleTabela = function () {
    try {
      if (_ajtState.carregando) return true;   // blindagem: ignora cliques durante a 1a carga (evita "clicar 2-3x")
      if (!document.getElementById('pjmtab-bar')) _ajtMount();
      if (!document.getElementById('pjmtab-bar')) return false;   // timeline não encontrada nesta tela/frame
      _ajtSetView(_ajtState.view === 'tabela' ? 'timeline' : 'tabela');
      return true;
    } catch (_) { return false; }
  };
  window.PJM_tabelaAtiva = function () { return _ajtState.view === 'tabela'; };

  // Leitura PROGRAMÁTICA da árvore (documentos + movimentos), com tipo já classificado.
  // Consumida pelo auto-etiquetador por marco (content/marco-etiquetador.js).
  //   carregarTudo=true  → força scroll-load (vence lazy-load) antes de ler; move a página.
  //   carregarTudo=false → lê o DOM atual (não intrusivo; melhora conforme a página carrega).
  window.PJM_lerArvore = function (carregarTudo) {
    function coletar() {
      try {
        return _ajtDados().map(function (a) {
          return { id: a.id || null, nome: a.nome || a.movimento || '', data: a.data || '', hora: a.hora || '', movimento: !a.id, tipo: a.id ? _ajtCatPrimaria(a.nome) : 'movimento' };
        });
      } catch (_) { return []; }
    }
    if (!carregarTudo) return Promise.resolve(coletar());
    try { return _ajtScrollLoad(null).then(coletar, coletar); } catch (_) { return Promise.resolve(coletar()); }
  };

  // ── INIT (resiliente a re-render AJAX do PJe; custo baixo sob all_frames) ─
  var _ajtDeb = null;
  function _ajtTick() { if (!_ajtAtivo()) return; _ajtMount(); }
  function _ajtSchedule() { clearTimeout(_ajtDeb); _ajtDeb = setTimeout(_ajtTick, 300); }
  (function _ajtInit() {
    try {
      if (EXT && EXT.storage && EXT.storage.local) {
        EXT.storage.local.get({ pjmAtivo: true, pjmTabelaAutos: true, pjmTabelaTipos: null }, function (res) {
          _ajtExtOn = res.pjmAtivo !== false;
          _ajtTabOn = res.pjmTabelaAutos !== false;
          if (res.pjmTabelaTipos && res.pjmTabelaTipos.tipos) _ajtAplicarTipos(res.pjmTabelaTipos.tipos);
          if (!_ajtAtivo()) _ajtRemover(); else _ajtTick();
        });
      }
    } catch (_) { }
    _ajtTick();
    try { new MutationObserver(_ajtSchedule).observe(document.documentElement, { childList: true, subtree: true }); } catch (_) { }
    setInterval(_ajtTick, 2000);
    try {
      if (EXT && EXT.storage && EXT.storage.onChanged) {
        EXT.storage.onChanged.addListener(function (changes, area) {
          if (area !== 'local') return;
          if (changes.pjmAtivo) _ajtExtOn = changes.pjmAtivo.newValue !== false;
          if (changes.pjmTabelaAutos) _ajtTabOn = changes.pjmTabelaAutos.newValue !== false;
          if (changes.pjmTabelaTipos) {
            var v = changes.pjmTabelaTipos.newValue;
            _ajtAplicarTipos(v && v.tipos ? v.tipos : null);
            if (_ajtState.view === 'tabela') { _ajtState.dados = _ajtDados(); _ajtRender(); }
          }
          if (changes.pjmAtivo || changes.pjmTabelaAutos) { if (_ajtAtivo()) _ajtTick(); else _ajtRemover(); }
        });
      }
    } catch (_) { }
    console.log('[PJM tabela-autos v1.6] prefixo pjmtab- (sem colisao com AuditJE) — carregado em', location.href.slice(0, 80));
  })();
})();
