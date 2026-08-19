// content/coletor-expedientes.js -- coletor de expedientes + radar de prazos (motor: expedientes-painel v12)
(function () {
  'use strict';
  if (window.__pjmColetaExpedientes) return; window.__pjmColetaExpedientes = true;
  if (window.PJM_ehAssistentePrepararExpediente && window.PJM_ehAssistentePrepararExpediente()) return;
  if (!(/(^|\.)pje\.[a-z-]+\.jus\.br$/i.test(location.hostname) || (/\/pje\//.test(location.pathname) && !/pje-frontend/i.test(location.hostname)))) return;
  var COR = 'color:#1a5276;font-weight:bold;', COR2 = 'color:#922b21;font-weight:bold;', OKC = 'color:#1e8449;font-weight:bold;';
  var RE_PROC = /\d{4,7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/, RE_DATA = /\d{2}\/\d{2}\/\d{2,4}(?: \d{2}:\d{2}(?::\d{2})?)?/;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var ultimo = [];
  var cfg = { base: location.origin + '/', sigla: ((location.pathname || '').match(/^\/([^/]+\/)/) || [])[1] || 'pje/' };
  var B = null; // contexto bootstrapado: { vs, container, buckets, doc }

  function txt(el) { return (((el && el.innerText) || (el && el.textContent) || '')).replace(/\s+/g, ' ').trim(); }
  function urlInclude() { return cfg.base.replace(/\/?$/, '/') + cfg.sigla + 'Painel/painel_usuario/include/expedientePje2.seam?iframe=true&pjemrPopup=true'; }
  function actionURL() { return cfg.base.replace(/\/?$/, '/') + cfg.sigla + 'Painel/painel_usuario/include/expedientePje2.seam'; }
  function vsDe(doc, html) { return (doc.querySelector('input[name="javax.faces.ViewState"]') || {}).value || ((html || '').match(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/) || [])[1] || null; }
  function containerDe(html) { return ((html || '').match(/'containerId'\s*:\s*'(j_id\d+)'/) || [])[1] || 'j_id177'; }
  function lerBucketsDe(root) {
    return [].slice.call(root.querySelectorAll('.rich-stglpanel')).map(function (el) {
      var h = el.querySelector('.rich-stglpanel-header'); var t = h ? txt(h) : ''; var m = t.match(/^[«»\s]*(.+?)\s*\((\d+)\)\s*$/);
      var oc = h ? (h.getAttribute('onclick') || '') : ''; var cont = (oc.match(/'containerId'\s*:\s*'(j_id\d+)'/) || [])[1] || null; return { panelId: el.id, nome: m ? m[1] : (t || el.id), count: m ? +m[2] : null, container: cont };
    }).filter(function (p) { return p.panelId && p.count != null; });
  }

  function bootstrap() {
    return fetch(urlInclude(), { credentials: 'include' }).then(function (r) { if (!r.ok) throw new Error('GET include HTTP ' + r.status); return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      B = { vs: vsDe(doc, html), container: containerDe(html), buckets: lerBucketsDe(doc), doc: doc };
      return B;
    });
  }
  function assegura() { return B && B.vs ? Promise.resolve(B) : bootstrap(); }

  function postA4J(p) {
    return fetch(actionURL(), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: p.toString() })
      .then(function (r) { return r.text(); }).then(function (xml) { var doc = new DOMParser().parseFromString(xml, 'text/html'); var nvs = (doc.querySelector('#ajax-view-state input') || doc.querySelector('input[name="javax.faces.ViewState"]') || {}).value; if (nvs) B.vs = nvs; return doc; });
  }
  function expandir(panelId) { var b = (B.buckets || []).filter(function (x) { return x.panelId === panelId; })[0]; var cont = (b && b.container) || B.container; B.contAtual = cont; var p = new URLSearchParams(); p.set('AJAXREQUEST', cont); if (B.vs) p.set('javax.faces.ViewState', B.vs); p.set(panelId, panelId); p.set('AJAX:EVENTS_COUNT', '1'); return postA4J(p); }
  function navegar(formId, scrollerId, page) { var p = new URLSearchParams(); p.set('AJAXREQUEST', B.contAtual || B.container); p.set(formId, formId); if (B.vs) p.set('javax.faces.ViewState', B.vs); p.set(scrollerId, String(page)); p.set('ajaxSingle', scrollerId); p.set('AJAX:EVENTS_COUNT', '1'); return postA4J(p); }

  function _cData(tds, i) { if (i == null || !tds[i]) return ''; var m = txt(tds[i]).match(RE_DATA); return m ? m[0] : ''; }
  function _cTxt(tds, i) { return (i == null || !tds[i]) ? '' : txt(tds[i]); }
  function _mapaCols(tab) {
    var m = {};
    try {
      [].slice.call(tab.querySelectorAll('th')).forEach(function (th, i) {
        var t = txt(th).toLowerCase();
        if (m.processo == null && /processo/.test(t)) { m.processo = i; return; }
        if (m.destinatario == null && /destinat/.test(t)) { m.destinatario = i; return; }
        if (m.meio == null && /meio/.test(t)) { m.meio = i; return; }
        if (m.criacao == null && /cria/.test(t)) { m.criacao = i; return; }
        if (m.ciencia == null && /ci[eê]nc/.test(t)) { m.ciencia = i; return; }
        if (m.prazo == null && /prazo/.test(t)) { m.prazo = i; return; }
      });
    } catch (_) {}
    return m;
  }
  function parseRow(tr, bucket, cm) {
    var tds = tr.querySelectorAll('td.rich-table-cell'); if (!tds.length) return null;
    var todo = txt(tr); var visu = tr.querySelector('a[href*="visualizarExpediente.seam"]'); if (!RE_PROC.test(todo) && !visu) return null;
    var verDet = tr.querySelector('a[onclick*="detalheProcessoVisualizacao"]'); var oc = verDet ? (verDet.getAttribute('onclick') || '') : ''; var vh = visu ? (visu.getAttribute('href') || '') : '';
    var idExp = ''; for (var k = 0; k < tds.length && !idExp; k++) { var mm = (tds[k].id || '').match(/:(\d+):/); if (mm) idExp = mm[1]; }
    var datas = []; [].slice.call(tds).forEach(function (td) { var m = txt(td).match(RE_DATA); if (m) datas.push(m[0]); });
    cm = cm || {}; var _ok = (cm.criacao != null && cm.prazo != null && tds.length > cm.prazo && tds.length > cm.criacao);
    return { bucket: bucket || '', idExpediente: idExp, numero: (todo.match(RE_PROC) || [])[0] || txt(tds[1]), destinatario: (_ok && cm.destinatario != null) ? _cTxt(tds, cm.destinatario) : txt(tds[2]), meio: (_ok && cm.meio != null) ? _cTxt(tds, cm.meio) : txt(tds[3]), dataCriacao: _ok ? _cData(tds, cm.criacao) : (datas[0] || ''), dataCiencia: _ok ? _cData(tds, cm.ciencia) : (datas.length >= 3 ? datas[1] : ''), prazoFinal: _ok ? _cData(tds, cm.prazo) : (datas.length >= 2 ? datas[datas.length - 1] : ''), datas: datas, idProcesso: (oc.match(/[?&]id=(\d+)/) || vh.match(/[?&]idProcesso=(\d+)/) || [])[1] || '', ca: (oc.match(/[?&]ca=([0-9a-fA-F]+)/) || [])[1] || '', idProcessoDocumento: (vh.match(/idProcessoDoc=(\d+)/) || [])[1] || '', idBin: (vh.match(/idBin=(\d+)/) || [])[1] || '', linkVisualizar: visu ? new URL(vh, cfg.base).href : null };
  }
  function acharTabela(root) { return root.querySelector('[id*="ExpedienteDataTable"]') || [].slice.call(root.querySelectorAll('table.rich-table')).filter(function (t) { return t.querySelector('a[href*="visualizarExpediente"]'); })[0] || null; }
  function infoTabela(tab) { var form = tab.closest ? tab.closest('form') : null; var scroller = (tab.innerHTML.match(/new Richfaces\.Datascroller\('([^']+)'/) || [])[1] || null; return { form: form ? form.id : '', scroller: scroller }; }
  function linhasDe(tab, bucket) { var cm = _mapaCols(tab); var tb = tab.querySelector('tbody[id$=":tb"]') || tab.querySelector('tbody') || tab; return [].slice.call(tb.querySelectorAll('tr.rich-table-row')).map(function (tr) { return parseRow(tr, bucket, cm); }).filter(Boolean); }
  function paginaAtiva(doc) { var a = doc.querySelector('.rich-datascr-act'); var n = a ? parseInt(txt(a), 10) : NaN; return isFinite(n) ? n : null; }
  function chave(x) { return x.idExpediente ? ('id:' + x.idExpediente) : ('cmp:' + x.numero + '|' + x.dataCriacao + '|' + x.destinatario + '|' + x.idProcessoDocumento); }

  function inspecionar() {
    return bootstrap().then(function () {
      console.log('%c[expPainel v9] GET ' + urlInclude(), COR);
      console.log('%c[expPainel v9] ViewState: ' + (B.vs || 'NULL') + ' · container: ' + B.container, B.vs ? OKC : COR2);
      console.log('%c[expPainel v9] buckets: ', COR); try { console.table(B.buckets); } catch (e) {}
      if (!B.vs) { console.log('%c[expPainel v9] sem ViewState -> host errado? use config({base,sigla}) com o host LEGADO (pje.tre-sp.jus.br).', COR2); return false; }
      if (!B.buckets.length) { console.log('%c[expPainel v9] GET nao trouxe os accordions. Pode exigir contexto do painel; me avise.', COR2); return false; }
      var b0 = B.buckets[0];
      return expandir(b0.panelId).then(function (doc) { var tab = acharTabela(doc); console.log(tab ? '%c[expPainel v9] VIAVEL: expandir "' + b0.nome + '" trouxe a tabela em segundo plano.' : '%c[expPainel v9] expandir nao trouxe tabela - revisar.', tab ? OKC : COR2); return !!tab; });
    }).catch(function (e) { console.log('%c[expPainel v9] erro: ' + e.message, COR2); return false; });
  }

  function coletar(nomeOuIdx, opts) {
    opts = opts || {}; var paginar = opts.paginar !== false; var atraso = opts.atrasoMs != null ? opts.atrasoMs : 160; var debug = !!opts.debug;
    return assegura().then(function () {
      var b = (typeof nomeOuIdx === 'number') ? B.buckets[nomeOuIdx] : B.buckets.filter(function (x) { return x.nome.toUpperCase().indexOf(String(nomeOuIdx).toUpperCase()) >= 0; })[0];
      if (!b) { console.log('%c[expPainel v9] bucket "' + nomeOuIdx + '" nao encontrado (rode inspecionar()).', COR2); return []; }
      var mapa = {}, lidas = 0; function add(linhas) { linhas.forEach(function (x) { lidas++; var k = chave(x); if (!mapa[k]) mapa[k] = x; }); }
      return expandir(b.panelId).then(function (doc) {
        var tab = acharTabela(doc);
        if (!tab) { return bootstrap().then(function () { return expandir(b.panelId); }).then(function (d2) { return acharTabela(d2); }); } // re-bootstrap 1x
        return tab;
      }).then(function (tab) {
        if (!tab) { console.log('%c[expPainel v9] "' + b.nome + '": tabela nao veio (ViewExpired?).', COR2); return []; }
        var info = infoTabela(tab); add(linhasDe(tab, b.nome));
        if (!paginar || !info.scroller) return fim(b, mapa, lidas);
        return navegar(info.form, info.scroller, 'first').then(function (d0) { var t0 = acharTabela(d0); if (t0) add(linhasDe(t0, b.nome)); var maxAtiva = paginaAtiva(d0) || 1, lim = (b.count ? Math.ceil(b.count / 8) : 300) + 15, ps = 0;
          function passo() { if (ps++ > lim) return; return sleep(atraso).then(function () { return navegar(info.form, info.scroller, 'next'); }).then(function (d) { var t = acharTabela(d); if (t) add(linhasDe(t, b.nome)); var nova = paginaAtiva(d); if (debug) console.log('  pg ' + (nova || '?') + ' -> ' + Object.keys(mapa).length); if (nova == null || nova <= maxAtiva) return; maxAtiva = nova; return passo(); }); }
          return passo();
        }).then(function () { return fim(b, mapa, lidas); });
      });
    });
  }
  function fim(b, mapa, lidas) {
    var out = Object.keys(mapa).map(function (k) { return mapa[k]; }); var n = out.length; var dif = (b.count && b.count > n) ? (b.count - n) : 0;
    console.log('%c[expPainel v9] "' + b.nome + '": ' + n + ' distintos' + (dif ? ' (badge=' + b.count + '; ' + dif + ' nao-distintas - esperado)' : '') + ' · ' + lidas + ' lidas [2o plano]', OKC);
    return out;
  }

  function tudo(opts) {
    opts = opts || {};
    return assegura().then(function () {
      var bs = B.buckets.slice(); if (opts.apenas) bs = bs.filter(function (b) { return opts.apenas.some(function (n) { return b.nome.toUpperCase().indexOf(n.toUpperCase()) >= 0; }); });
      bs.sort(function (a, b) { return (a.count || 0) - (b.count || 0); }); console.log('%c[expPainel] coletando ' + bs.length + ' bucket(s), do menor para o maior...', COR);
      var acc = [], i = 0; function prox() { if (i >= bs.length) return Promise.resolve(acc); var b = bs[i++]; return sleep(i > 1 ? (opts.atrasoBucketMs || 900) : 0).then(function () { return bootstrap(); }).then(function () { return coletar(b.nome, opts); }).then(function (l) { acc = acc.concat(l); return prox(); }); }
      return prox().then(function () { ultimo = acc; console.log('%c[expPainel v9] TOTAL: ' + acc.length + ' distintos.', OKC); try { console.table(porBucket(acc)); } catch (e) {} return acc; });
    });
  }
  function porBucket(linhas) { var m = {}; linhas.forEach(function (x) { m[x.bucket] = (m[x.bucket] || 0) + 1; }); return Object.keys(m).map(function (k) { return { bucket: k, qtd: m[k] }; }); }
  function exportar() { if (!ultimo.length) { console.log('rode tudo() primeiro.'); return; } var b = new Blob([JSON.stringify({ gerado: new Date().toISOString(), fonte: urlInclude(), total: ultimo.length, porBucket: porBucket(ultimo), expedientes: ultimo }, null, 2)], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'pje-expedientes-painel-' + Date.now() + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); console.log('%c[expPainel v9] exportado (' + ultimo.length + ').', COR); }
  function config(o) { Object.assign(cfg, o || {}); B = null; console.log('%c[expPainel v9] config:', COR, cfg); }
  function ajuda() { console.log('%c=== pjeExpPainel v9 (auto-bootstrap, 2o plano) ===', COR); console.log('await inspecionar()  -> verifica viabilidade'); console.log('await coletar(nome) · await tudo() · exportar() · config({base,sigla})'); }

  // -- Radar de prazos: agregacao por processo + gravacao em pjmPrazos --
  var EXT = (typeof chrome !== 'undefined') ? chrome : null;
  var BUCKETS_RADAR = ['Pendente', 'Confirmada pelo destinat', 'Confirmado pelo PJe'];
  function ehHostLegado() { return /(^|\.)pje\.[a-z-]+\.jus\.br$/i.test(location.hostname) || (/\/pje\//.test(location.pathname) && !/pje-frontend/i.test(location.hostname)); }
  function _parseBR(x) { var m = String(x || '').match(/(\d{2})\/(\d{2})\/(\d{2,4})(?:\s+(\d{2}):(\d{2}))?/); if (!m) return null; var y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[2] - 1, +m[1], +(m[4] || 23), +(m[5] || 59)); }
  function _dia0(d) { var z = new Date(d); z.setHours(0, 0, 0, 0); return z; }
  function _sit(dias) { return dias < 0 ? 'vencido' : dias === 0 ? 'vence hoje' : dias <= 3 ? 'em curso (<=3d)' : 'em curso'; }
  function _dig(x) { return String(x || '').replace(/\D/g, ''); }
  function _ehPend(b) { return /^pendente/i.test(String(b || '')); }
  function _ev(e, dias) {
    var pend = _ehPend(e.bucket);
    return { prazoFinal: e.prazoFinal || '', dias: dias, tipo: (pend ? 'ciencia' : 'manifestacao'),
      situacao: (pend ? 'pendente de ciencia' : (dias == null ? 'sem prazo' : _sit(dias))),
      idExpediente: e.idExpediente || '', dataCriacao: e.dataCriacao || '', dataCiencia: e.dataCiencia || '',
      destinatario: e.destinatario || '', meio: e.meio || '', bucket: e.bucket || '',
      idProcessoDocumento: e.idProcessoDocumento || '', idBin: e.idBin || '' };
  }
  function agregarPorProcesso(exps) {
    var hoje = _dia0(new Date()), proc = {}, INF = 1e9;
    (exps || []).forEach(function (e) {
      var cnj = e.numero; if (!cnj) return;
      var dt = _parseBR(e.prazoFinal);
      var dias = dt ? Math.round((_dia0(dt) - hoje) / 864e5) : null;
      var k = _dig(cnj), ev = _ev(e, dias);
      if (!proc[k]) proc[k] = { cnj: cnj, idProcesso: e.idProcesso || '', ca: e.ca || '', nExp: 0, expedientes: [] };
      proc[k].nExp++; proc[k].expedientes.push(ev);
      if (!proc[k].idProcesso) { proc[k].idProcesso = e.idProcesso || ''; proc[k].ca = e.ca || ''; }
    });
    return Object.keys(proc).map(function (k) {
      var p = proc[k];
      p.expedientes.sort(function (x, y) { return (x.dias == null ? INF : x.dias) - (y.dias == null ? INF : y.dias); });
      // Prazo de MANIFESTACAO = bucket confirmado (dentro do prazo) com data.
      var manif = p.expedientes.filter(function (e) { return e.tipo === 'manifestacao' && e.dias != null; });
      if (manif.length) {
        var m = manif[0];
        p.tipo = 'manifestacao'; p.prazoFinal = m.prazoFinal; p.dias = m.dias; p.bucket = m.bucket; p.situacao = _sit(m.dias);
      } else {
        // Nada correndo: o processo esta PENDENTE DE CIENCIA. A data (quando ha) e o prazo DA CIENCIA.
        var pend = p.expedientes.filter(function (e) { return e.tipo === 'ciencia'; });
        var comData = pend.filter(function (e) { return e.dias != null; })[0] || null;
        p.tipo = 'ciencia';
        p.bucket = (pend[0] || p.expedientes[0] || {}).bucket || '';
        p.prazoFinal = comData ? comData.prazoFinal : '';
        p.dias = comData ? comData.dias : null;
        p.situacao = 'pendente de ciencia';
      }
      p.semCiencia = p.expedientes.filter(function (e) { return e.dias == null; }).length;
      return p;
    }).sort(function (a, b) { return (a.dias == null ? INF : a.dias) - (b.dias == null ? INF : b.dias); });
  }
  // Classe judicial nao vem do painel de expedientes -- vem por JOIN (CNJ):
  //   1) pjmClassePorCnj  (lida do cabecalho dos autos: dado CERTO)  -> prioridade
  //   2) pjeMapperUltimoResultado (mapeamento completo das tarefas)
  //   3) pjmColetaApi (ultima tarefa coletada)
  function _mapaClasses(cb) {
    if (!EXT || !EXT.storage) { cb({}); return; }
    try {
      EXT.storage.local.get(['pjmClassePorCnj', 'pjeMapperUltimoResultado', 'pjmColetaApi'], function (r) {
        var m = {};
        function add(numero, nome, codigo, forcar) {
          var k = _dig(numero); if (!k || !nome) return;
          if (forcar || !m[k]) m[k] = { classe: String(nome).trim(), classeCodigo: String(codigo || '') };
        }
        var pc = (r && r.pjmClassePorCnj) || {};
        Object.keys(pc).forEach(function (k) { if (pc[k] && pc[k].nome) add(k, pc[k].nome, pc[k].codigo, true); });
        var res = r && r.pjeMapperUltimoResultado;
        ((res && res.tarefas) || []).forEach(function (t) { (t.processos || []).forEach(function (p) { add(p.numero, p.classe, p.classeCodigo); }); });
        var col = r && r.pjmColetaApi;
        ((col && col.processos) || []).forEach(function (p) { add(p.numero, p.classe, p.classeCodigo); });
        cb(m);
      });
    } catch (e) { cb({}); }
  }
  //   GET /pje/seam/resource/rest/pje-legacy/processos/{idProcesso}  -> ~118ms, ~300 bytes
  //   { idProcesso, numeroProcesso, classeJudicial, orgaoJulgador, jurisdicao, ... }
  // ATENCAO: o REST devolve a classe SEM o codigo ("PROPAGANDA PARTIDARIA"); os AUTOS
  // devolvem com codigo ("... (11536)"). Nunca sobrescrever um codigo ja conhecido.
  var EP_PROCESSO = '/pje/seam/resource/rest/pje-legacy/processos/';
  var CONC_CLASSE = 6;

  function _origem() { return String(cfg.base || location.origin).replace(/\/+$/, ''); }

  function _classeREST(idp) {
    return fetch(_origem() + EP_PROCESSO + encodeURIComponent(idp), {
      credentials: 'include', headers: { 'Accept': 'application/json, text/plain, */*' }
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return null;
        var nome = String(j.classeJudicial || '').trim();
        if (!nome) return null;
        return { classe: nome, orgao: String(j.orgaoJulgador || '').trim() };
      })
      .catch(function () { return null; });
  }

  /** Busca a classe (REST) dos processos que ainda nao a tem e atualiza o cache. */
  function _enriquecerClasses(rows, mapa, cb) {
    var pend = rows.filter(function (r) { return !r.classe && r.idProcesso; });
    if (!pend.length) { cb(0); return; }
    console.log('%c[pjm-coleta-expedientes] buscando classe de ' + pend.length + ' processo(s) via REST...', COR);
    var i = 0, novos = 0;
    function prox() {
      if (i >= pend.length) return Promise.resolve();
      var r = pend[i++];
      return _classeREST(r.idProcesso).then(function (info) {
        if (info && info.classe) {
          r.classe = info.classe; r.classeCodigo = '';
          novos++;
          var k = _dig(r.cnj);
          if (k) mapa[k] = { classe: info.classe, classeCodigo: '', orgao: info.orgao || '' };
        }
        return prox();
      });
    }
    var fios = [];
    for (var w = 0; w < CONC_CLASSE; w++) fios.push(prox());
    Promise.all(fios).then(function () {
      try {
        EXT.storage.local.get('pjmClassePorCnj', function (r0) {
          var cache = (r0 && r0.pjmClassePorCnj) || {};
          Object.keys(mapa).forEach(function (k) {
            var n = mapa[k]; if (!n || !n.classe) return;
            var v = cache[k] || {};
            cache[k] = {
              nome: n.classe,
              codigo: v.codigo ? v.codigo : (n.classeCodigo || ''),   // codigo so vem dos AUTOS: preservar
              orgao: n.orgao || v.orgao || '',
              ts: Date.now()
            };
          });
          try { EXT.storage.local.set({ pjmClassePorCnj: cache }); } catch (_) { /* noop */ }
          cb(novos);
        });
      } catch (e) { cb(novos); }
    });
  }

  function coletarPrazos(opts) {
    opts = opts || {};
    return tudo({ apenas: BUCKETS_RADAR, atrasoBucketMs: opts.atrasoBucketMs || 900, atrasoMs: opts.atrasoMs || 160 }).then(function (ex) {
      var rows = agregarPorProcesso(ex);
      return new Promise(function (res) {
        _mapaClasses(function (mapa) {
          rows.forEach(function (r) {
            var c = mapa[_dig(r.cnj)];
            r.classe = c ? c.classe : '';
            r.classeCodigo = c ? c.classeCodigo : '';
          });
          _enriquecerClasses(rows, mapa, function (novos) {
            var comClasse = rows.filter(function (r) { return !!r.classe; }).length;
            res({ ex: ex, rows: rows, comClasse: comClasse, novos: novos });
          });
        });
      });
    }).then(function (o) {
      var payload = { gerado: new Date().toISOString(), origem: cfg.base, totalExpedientes: o.ex.length, totalProcessos: o.rows.length, comClasse: o.comClasse, classesNovas: o.novos || 0, porBucket: porBucket(o.ex), rows: o.rows };
      return new Promise(function (res) { try { EXT.storage.local.set({ pjmPrazos: payload }, function () { res(payload); }); } catch (e) { res(payload); } });
    }).then(function (pl) {
      try { window.dispatchEvent(new CustomEvent('pjm:prazos', { detail: { totalProcessos: pl.totalProcessos } })); } catch (_) {}
      console.log('%c[pjm-coleta-expedientes] ' + pl.totalProcessos + ' processos / ' + pl.totalExpedientes + ' expedientes · ' + (pl.comClasse || 0) + ' com classe (+' + (pl.classesNovas || 0) + ' novas via REST) -> pjmPrazos', OKC);
      return pl;
    });
  }

  // ── Reconciliação de execução (3a.1): documento expedido × baseline ──
  function _urlVisualizarExp(idProc, idDoc, idBin) {
    return cfg.base.replace(/\/?$/, '/') + cfg.sigla + 'Painel/painel_usuario/popup/visualizarExpediente.seam?idProcessoDoc=' + idDoc + '&idBin=' + idBin + '&idProcesso=' + idProc;
  }
  function _parseDocExp(html, idDoc) {
    var out = { tipo: '', juntadoPor: '', juntadoEm: '' };
    try {
      var mT = html.match(new RegExp(String(idDoc) + '\\s*-\\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ()/.\\-]{1,40})'));
      if (mT) out.tipo = mT[1].replace(/\s+/g, ' ').trim();
      var txt = html.replace(/<[^>]+>/g, ' ');
      var mJ = txt.match(/Juntado\s+por\s+([^0-9]{2,80}?)\s+em\s+(\d{2}\/\d{2}\/\d{2,4}\s+\d{2}:\d{2}(?::\d{2})?)/i);
      if (mJ) { out.juntadoPor = mJ[1].replace(/\s+/g, ' ').trim(); out.juntadoEm = mJ[2].trim(); }
    } catch (_) {}
    return out;
  }
  function _normNome(s) { return String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function _tipoBaseDP(docReal) { return String(docReal || '').split(' — ')[0].split(' - ')[0].trim(); }
  function _statusExecucao(acao, exec, servidor) {
    var docReal = acao.docReal || acao.doc || '';
    if (!exec) return 'pendente';
    if (acao.docStatus === 'nao_anexado' && exec.docExecutado) return 'corrigido';
    if (/^Modelo:/i.test(docReal)) {
      var okPessoa = servidor ? (_normNome(exec.juntadoPor) === _normNome(servidor)) : true;
      var dJ = _parseBR(exec.juntadoEm), tA = acao.ts || 0;
      var okTempo = (dJ && tA) ? (Math.abs(dJ.getTime() - tA) <= 24 * 3600 * 1000) : true;
      return (okPessoa && okTempo) ? 'conforme' : 'substituido';
    }
    var tb = _normNome(_tipoBaseDP(docReal)), te = _normNome(exec.docExecutado);
    if (!tb || !te) return 'verificar';
    return (te.indexOf(tb) >= 0 || tb.indexOf(te) >= 0) ? 'conforme' : 'substituido';
  }
  async function reconciliarExecucao() {
    var pl = await coletarPrazos({});
    var porCnj = {};
    ((pl && pl.rows) || []).forEach(function (r) { porCnj[_dig(r.cnj)] = r; });
    var st = await new Promise(function (res) { EXT.storage.local.get(['pjmRelatorio', 'pjmServidor'], function (r) { res(r || {}); }); });
    var rel = st.pjmRelatorio || { sessoes: [] };
    var servidor = st.pjmServidor || '';
    var updates = [], cacheDoc = {};
    var sessoes = rel.sessoes || [];
    for (var si = 0; si < sessoes.length; si++) {
      var sess = sessoes[si], procs = sess.processos || {}, cnjs = Object.keys(procs);
      for (var ci = 0; ci < cnjs.length; ci++) {
        var cnj = cnjs[ci], acoes = procs[cnj].acoes || [];
        for (var ai = 0; ai < acoes.length; ai++) {
          var acao = acoes[ai];
          if (!acao || !/\(Comunicação\)/.test(acao.label || '')) continue;
          var linha = porCnj[_dig(cnj)], exec = null;
          if (linha && linha.expedientes && linha.expedientes.length) {
            var alvo = null, melhor = Infinity;
            linha.expedientes.forEach(function (e) {
              if (!e.idProcessoDocumento) return;
              var td = _parseBR(e.dataCriacao), d = td ? Math.abs(td.getTime() - (acao.ts || 0)) : Infinity;
              if (d < melhor) { melhor = d; alvo = e; }
            });
            if (alvo) {
              var doc = cacheDoc[alvo.idProcessoDocumento];
              if (!doc) {
                try {
                  var html = await fetch(_urlVisualizarExp(linha.idProcesso, alvo.idProcessoDocumento, alvo.idBin), { credentials: 'include' }).then(function (r) { return r.ok ? r.text() : ''; });
                  doc = _parseDocExp(html, alvo.idProcessoDocumento);
                } catch (_) { doc = { tipo: '', juntadoPor: '', juntadoEm: '' }; }
                cacheDoc[alvo.idProcessoDocumento] = doc;
              }
              exec = { idExpediente: alvo.idExpediente || '', idProcessoDocumento: alvo.idProcessoDocumento, docExecutado: doc.tipo, juntadoPor: doc.juntadoPor, juntadoEm: doc.juntadoEm };
            }
          }
          updates.push({ sessaoInicio: sess.inicio, cnj: cnj, acaoTs: acao.ts, exec: exec, execStatus: _statusExecucao(acao, exec, servidor) });
        }
      }
    }
    await new Promise(function (res) { try { EXT.runtime.sendMessage({ type: 'PJM_GRAVAR_EXECUCAO', updates: updates }, function () { res(); }); } catch (_) { res(); } });
    try { console.table(updates.map(function (u) { return { cnj: u.cnj, status: u.execStatus, executado: u.exec && u.exec.docExecutado, juntadoPor: u.exec && u.exec.juntadoPor, juntadoEm: u.exec && u.exec.juntadoEm }; })); } catch (_) {}
    return { total: updates.length };
  }

  if (EXT && EXT.runtime && EXT.runtime.onMessage) {
    EXT.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg || msg.type !== 'PJM_COLETAR_PRAZOS' || !ehHostLegado()) return;
      EXT.storage.local.get('pjmAtivo', function (r) {
        if (r && r.pjmAtivo === false) { sendResponse({ ok: false, error: 'extensao desativada' }); return; }
        coletarPrazos(msg.opts || {}).then(function (pl) { sendResponse({ ok: true, totalProcessos: pl.totalProcessos, totalExpedientes: pl.totalExpedientes }); }).catch(function (e) { sendResponse({ ok: false, error: String((e && e.message) || e) }); });
      });
      return true;
    });
  }
  window.addEventListener('message', function (e) {
    if (e.source === window && e.data === 'PJM_COLETAR_PRAZOS' && ehHostLegado()) {
      coletarPrazos().then(function (pl) { try { console.table(pl.rows.slice(0, 30)); } catch (_) {} });
    } else if (e.source === window && e.data === 'PJM_RECONCILIAR_EXECUCAO' && ehHostLegado()) {
      reconciliarExecucao().then(function (o) { console.log('%c[pjm-reconciliacao] ' + o.total + ' comunicacoes reconciliadas -> pjmRelatorio', OKC); });
    }
  });
  window.PJeColetorPrazos = { coletar: coletarPrazos, coletarBuckets: tudo, agregar: agregarPorProcesso, reconciliar: reconciliarExecucao, __v: 3 };
  if (ehHostLegado()) console.log('%c[pjm-coleta-expedientes v2 +reconc] pronto (host legado).', COR, "Testes: PJM_COLETAR_PRAZOS / PJM_RECONCILIAR_EXECUCAO (via window.postMessage)");
})();
