/**
 * PJe Mapeador — Relatório de PRAZOS (página da extensão)  [pjm-relatorio-prazos v1]
 * Lê o pjmPrazos do storage e apresenta: KPIs, filtros (busca, status, meio, prazo,
 * intervalo de CRIAÇÃO), toggle Por processo / Por expediente, ordenação, paginação,
 * exportar CSV e abrir os autos. Sempre reflete a última coleta.
 */
(function () {
  'use strict';
  var EXT = (typeof chrome !== 'undefined') ? chrome : null;
  var PROC = [], EXPD = [], DADOS = null, RESTR = null, SOTAR = false;
  var st = { visao: 'proc', q: '', status: '', meio: '', classe: '', prazo: '', criDe: '', criAte: '', alerta: false, sort: 'prazo', dir: 1, page: 1, per: 50, exp: {} };

  var SIT_LBL = { vencido: 'Vencido', hoje: 'Vence hoje', breve: '<= 3 dias', futuro: 'No prazo', semprazo: 'Sem data', ciencia: 'Pendente de ciência' };
  var SIT_CLS = { vencido: 's-venc', hoje: 's-hoje', breve: 's-breve', futuro: 's-ok', semprazo: 'b-pend', ciencia: 'b-pend' };
  var PRZ_CLS = { vencido: 'prazo-venc', hoje: 'prazo-hoje', breve: 'prazo-breve', futuro: 'prazo-ok', semprazo: '', ciencia: '' };
  var B_CLS = { 'Pendente': 'b-pend', 'Confirmado pelo PJe e dentro do prazo': 'b-pje', 'Confirmada pelo destinatário e dentro do prazo': 'b-dest' };
  var B_SHORT = { 'Pendente': 'Pendente', 'Confirmado pelo PJe e dentro do prazo': 'Confirmado PJe', 'Confirmada pelo destinatário e dentro do prazo': 'Confirmada dest.' };

  var COLS_PROC = [
    { k: 'cnj', l: 'Nº do processo', s: 'cnj' },
    { k: 'classe', l: 'Classe', s: 'classe' },
    { k: 'bucket', l: 'Status', s: 'bucket' },
    { k: 'prazoFinal', l: 'Prazo final', s: 'dias' },
    { k: 'situacao', l: 'Situação', s: 'dias' },
    { k: 'nExp', l: 'Exp.', s: 'nExp' },
    { k: 'alerta', l: 'Alerta', s: 'semCiencia' },
    { k: 'abrir', l: 'Abrir', s: null }
  ];
  var COLS_EXP = [
    { k: 'bucket', l: 'Status', s: 'bucket' },
    { k: 'cnj', l: 'Nº do processo', s: 'cnj' },
    { k: 'destinatario', l: 'Destinatário', s: 'destinatario' },
    { k: 'meio', l: 'Meio', s: 'meio' },
    { k: 'dataCriacao', l: 'Criação', s: 'ck' },
    { k: 'dataCiencia', l: 'Ciência', s: 'nk' },
    { k: 'prazoFinal', l: 'Prazo final', s: 'dias' },
    { k: 'situacao', l: 'Situação', s: 'dias' },
    { k: 'abrir', l: 'Abrir', s: null }
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function dig(s) { return String(s || '').replace(/\D/g, ''); }
  function parseBR(s) {
    var m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{2,4})(?:\s+(\d{2}):(\d{2}))?/);
    if (!m) return null;
    var y = +m[3]; if (y < 100) y += 2000;
    var hh = +(m[4] || 0); if (hh > 23) hh = 23;
    return new Date(y, +m[2] - 1, +m[1], hh, +(m[5] || 0));
  }
  function semC(r) { return (r.semCiencia != null) ? r.semCiencia : (r.expedientes || []).filter(function (e) { return e.dias == null; }).length; }
  function temAlerta(r) { var n = semC(r); return n > 0 && ((r.nExp || 0) - n) > 0; }
  function sitOf(d) { if (d == null) return 'semprazo'; return d < 0 ? 'vencido' : d === 0 ? 'hoje' : d <= 3 ? 'breve' : 'futuro'; }
  function sitDe(x) { if (x && x.tipo === 'ciencia') return 'ciencia'; return sitOf(x ? x.dias : null); }
  function fmtDT(iso) { try { var t = new Date(iso); if (isNaN(t.getTime())) return String(iso || ''); var z = function (n) { return (n < 10 ? '0' : '') + n; }; return z(t.getDate()) + '/' + z(t.getMonth() + 1) + '/' + t.getFullYear() + ' ' + z(t.getHours()) + ':' + z(t.getMinutes()); } catch (_) { return String(iso || ''); } }

  // ── carga ────────────────────────────────────────────────────────────────
  function carregar() {
    if (!EXT || !EXT.storage) { vazio('Sem acesso ao storage da extensão.'); return; }
    EXT.storage.local.get(['pjmPrazos', 'pjmPrazosFiltro'], function (r) {
      DADOS = (r && r.pjmPrazos) || null;
      var f = (r && r.pjmPrazosFiltro) || null;
      RESTR = (f && f.soTarefas && f.cnjs && f.cnjs.length)
        ? f.cnjs.reduce(function (acc, c) { acc[c] = 1; return acc; }, {})
        : null;
      SOTAR = !!RESTR;
      if (!DADOS || !DADOS.rows || !DADOS.rows.length) { vazio('Nenhuma coleta de prazos encontrada. Abra o painel do PJe, aba Prazos, e clique em "Atualizar prazos".'); return; }
      montar();
    });
  }

  function montar() {
    var base = DADOS.rows;
    if (SOTAR && RESTR) base = base.filter(function (p) { return RESTR[dig(p.cnj)]; });
    PROC = base.map(function (p) {
      var o = Object.assign({}, p);
      o.expedientes = (p.expedientes || []).map(function (e) {
        var x = Object.assign({}, e);
        x.cnj = p.cnj; x.classe = p.classe || ''; x.idProcesso = x.idProcesso || p.idProcesso || '';
        x.ck = parseBR(x.dataCriacao); x.nk = parseBR(x.dataCiencia);
        return x;
      });
      return o;
    });
    EXPD = [];
    PROC.forEach(function (p) { var al = temAlerta(p); p.expedientes.forEach(function (e) { e.alertaProc = al; EXPD.push(e); }); });
    montarSelects();
    $('meta').textContent = 'coleta de ' + fmtDT(DADOS.gerado) + ' · ' + (DADOS.totalProcessos || 0) + ' processos · ' + (DADOS.totalExpedientes || 0) + ' expedientes';
    banner();
    st.page = 1;
    render();
  }

  function banner() {
    var el = $('fbanner'); if (!el) return;
    if (!RESTR) { el.innerHTML = ''; return; }
    var nTar = Object.keys(RESTR).length;
    if (SOTAR) {
      el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;background:#f5eef8;border:1px solid #e3d4ec;border-radius:9px;padding:9px 13px;margin-bottom:12px;font-size:12.5px;color:#5b2c6f">' +
        '<strong>Somente tarefas de prazo</strong>' +
        '<span style="color:#6c3483">' + PROC.length + ' processo(s) — os mesmos exibidos na aba Prazos</span>' +
        '<button id="bTog" class="btn" style="margin-left:auto">Ver todos os prazos</button></div>';
    } else {
      el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;background:#f7f9fb;border:1px solid #e5eaef;border-radius:9px;padding:9px 13px;margin-bottom:12px;font-size:12.5px;color:#4b5563">' +
        '<strong>Todos os prazos</strong>' +
        '<span style="color:#6b7280">' + PROC.length + ' processo(s) da coleta</span>' +
        '<button id="bTog" class="btn" style="margin-left:auto">Voltar às tarefas de prazo (' + nTar + ')</button></div>';
    }
    var b = $('bTog');
    if (b) b.onclick = function () { SOTAR = !SOTAR; montar(); };
  }
  function vazio(msg) { $('tbody').innerHTML = '<tr><td colspan="9" class="vazio">' + esc(msg) + '</td></tr>'; $('meta').textContent = ''; }

  function montarSelects() {
    var bs = {}, ms = {}, cls = {};
    EXPD.forEach(function (e) { if (e.bucket) bs[e.bucket] = 1; if (e.meio) ms[e.meio] = 1; });
    PROC.forEach(function (p) { if (p.classe) cls[p.classe] = 1; });
    $('fStatus').innerHTML = '<option value="">Todos os status</option>' + Object.keys(bs).sort().map(function (b) { return '<option value="' + esc(b) + '">' + esc(B_SHORT[b] || b) + '</option>'; }).join('');
    $('fMeio').innerHTML = '<option value="">Todos os meios</option>' + Object.keys(ms).sort().map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('');
    $('fClasse').innerHTML = '<option value="">Todas as classes</option>' + Object.keys(cls).sort().map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
  }

  // ── filtro ───────────────────────────────────────────────────────────────
  function faixaCri() {
    return { de: st.criDe ? new Date(st.criDe + 'T00:00:00') : null, ate: st.criAte ? new Date(st.criAte + 'T23:59:59') : null };
  }
  function casaExp(e, q, qd, f) {
    if (st.status && e.bucket !== st.status) return false;
    if (st.meio && e.meio !== st.meio) return false;
    if (st.classe && norm(e.classe || '') !== norm(st.classe)) return false;
    if (f.de || f.ate) { if (!e.ck) return false; if (f.de && e.ck < f.de) return false; if (f.ate && e.ck > f.ate) return false; }
    if (q) {
      var hay = norm((e.destinatario || '') + ' ' + (e.bucket || '') + ' ' + (e.meio || '') + ' ' + (e.cnj || ''));
      if (hay.indexOf(q) < 0 && !(qd && dig(e.cnj).indexOf(qd) >= 0)) return false;
    }
    return true;
  }
  function filtrados() {
    var q = norm(st.q), qd = dig(st.q), f = faixaCri();
    if (st.visao === 'exp') {
      return EXPD.filter(function (e) {
        if (st.alerta && !e.alertaProc) return false;
        if (st.prazo && sitDe(e) !== st.prazo) return false;
        return casaExp(e, q, qd, f);
      });
    }
    return PROC.filter(function (p) {
      if (st.alerta && !temAlerta(p)) return false;
      if (st.prazo && sitDe(p) !== st.prazo) return false;
      return p.expedientes.some(function (e) { return casaExp(e, q, qd, f); });
    });
  }

  // ── ordenação ────────────────────────────────────────────────────────────
  function chave(r, s) {
    if (s === 'dias') return (r.dias == null ? 1e9 : r.dias);
    if (s === 'semCiencia') return semC(r);
    if (s === 'nExp') return r.nExp || 0;
    if (s === 'ck') return r.ck ? r.ck.getTime() : 0;
    if (s === 'nk') return r.nk ? r.nk.getTime() : 0;
    if (s === 'cnj') return dig(r.cnj);
    return norm(r[s]);
  }
  function ordenar(arr) {
    var s = st.sort, d = st.dir;
    return arr.slice().sort(function (a, b) {
      var x = chave(a, s), y = chave(b, s);
      if (x < y) return -1 * d; if (x > y) return 1 * d;
      return (a.dias - b.dias);
    });
  }

  // ── render ───────────────────────────────────────────────────────────────
  function kpis() {
    var c = { vencido: 0, hoje: 0, breve: 0, futuro: 0, semprazo: 0, ciencia: 0 };
    PROC.forEach(function (p) { c[sitDe(p)]++; });
    $('kpis').innerHTML =
      (c.vencido ? '<div class="kpi k-venc"><div class="n">' + c.vencido + '</div><div class="l">Vencidos</div></div>' : '') +
      '<div class="kpi k-hoje"><div class="n">' + c.hoje + '</div><div class="l">Vence hoje</div></div>' +
      '<div class="kpi k-breve"><div class="n">' + c.breve + '</div><div class="l">Próximos 3 dias</div></div>' +
      '<div class="kpi k-ok"><div class="n">' + c.futuro + '</div><div class="l">No prazo</div></div>' +
      (c.semprazo ? '<div class="kpi"><div class="n" style="color:#4b5563">' + c.semprazo + '</div><div class="l">Sem data</div></div>' : '') +
      (c.ciencia ? '<div class="kpi"><div class="n" style="color:#4b5563">' + c.ciencia + '</div><div class="l">Pendente de ciência</div></div>' : '');
  }
  function cols() { return st.visao === 'exp' ? COLS_EXP : COLS_PROC; }
  function cabecalho() {
    $('hrow').innerHTML = cols().map(function (c) {
      var seta = (c.s && st.sort === c.s) ? (st.dir > 0 ? ' ▲' : ' ▼') : '';
      return '<th class="' + (c.s ? '' : 'nosort') + '" data-s="' + (c.s || '') + '">' + esc(c.l) + seta + '</th>';
    }).join('');
  }
  function celPrazo(r) { var s = sitDe(r); return '<span class="' + PRZ_CLS[s] + '">' + esc(r.prazoFinal || '—') + '</span>'; }
  function celSit(r) { var s = sitDe(r); var ex = (r.dias != null && r.dias < 0) ? (' · ' + (-r.dias) + 'd') : ''; return '<span class="pill ' + SIT_CLS[s] + '">' + SIT_LBL[s] + ex + '</span>'; }
  function celBucket(b) { return '<span class="pill ' + (B_CLS[b] || 'b-pend') + '">' + esc(B_SHORT[b] || b || '—') + '</span>'; }
  function celAlerta(r) { return temAlerta(r) ? '<span class="pill" style="background:#fdf0e3;color:#9a4b0a">&#9888; ' + semC(r) + ' sem ciência</span>' : '<span style="color:#c9d3db">—</span>'; }
  function celAbrir(r) { return r.idProcesso ? '<button class="lnk" data-idp="' + esc(r.idProcesso) + '" data-cnj="' + dig(r.cnj) + '">autos</button>' : '<span style="color:#c9d3db">—</span>'; }

  function linhasProc(pg) {
    return pg.map(function (p) {
      var k = dig(p.cnj), ab = !!st.exp[k];
      var tr = '<tr>' +
        '<td><strong>' + esc(p.cnj) + '</strong></td>' +
        '<td>' + (p.classe ? '<span class="pill" style="background:#f5eef8;color:#6c3483">' + esc(p.classe) + '</span>' : '<span style="color:#c9d3db">—</span>') + '</td>' +
        '<td>' + celBucket(p.bucket) + '</td>' +
        '<td>' + celPrazo(p) + '</td>' +
        '<td>' + celSit(p) + '</td>' +
        '<td><span class="exp" data-cnj="' + k + '">' + (p.nExp || 1) + ' ' + (ab ? '▾' : '▸') + '</span></td>' +
        '<td>' + celAlerta(p) + '</td>' +
        '<td>' + celAbrir(p) + '</td></tr>';
      if (ab) {
        tr += '<tr><td colspan="8" style="padding:0"><div class="sub">' +
          '<div class="sh"><span class="c1">Destinatário</span><span class="c2">Meio de comunicação</span><span class="c3">Data de criação</span><span class="c4">Data da ciência</span><span class="c5">Prazo final</span></div>' +
          p.expedientes.map(function (e) {
            return '<div class="sr"><span class="c1">' + esc(e.destinatario) + '<br><span style="font-size:10px;color:#9ca3af">' + esc(B_SHORT[e.bucket] || e.bucket) + '</span></span>' +
              '<span class="c2" style="color:#6b7280">' + esc(e.meio) + '</span>' +
              '<span class="c3" style="color:#6b7280">' + esc(e.dataCriacao || '—') + '</span>' +
              '<span class="c4" style="color:#6b7280">' + esc(e.dataCiencia || '—') + '</span>' +
              '<span class="c5">' + celPrazo(e) + '</span></div>';
          }).join('') + '</div></td></tr>';
      }
      return tr;
    }).join('');
  }
  function linhasExp(pg) {
    return pg.map(function (e) {
      return '<tr>' +
        '<td>' + celBucket(e.bucket) + '</td>' +
        '<td>' + esc(e.cnj) + '</td>' +
        '<td style="word-break:break-word">' + esc(e.destinatario) + '</td>' +
        '<td style="color:#6b7280">' + esc(e.meio) + '</td>' +
        '<td style="color:#6b7280">' + esc(e.dataCriacao || '—') + '</td>' +
        '<td style="color:#6b7280">' + esc(e.dataCiencia || '—') + '</td>' +
        '<td>' + celPrazo(e) + '</td>' +
        '<td>' + celSit(e) + '</td>' +
        '<td>' + celAbrir(e) + '</td></tr>';
    }).join('');
  }

  function render() {
    if (!PROC.length) return;
    kpis(); cabecalho();
    var arr = ordenar(filtrados());
    var per = st.per, tot = arr.length, pgs = Math.max(1, Math.ceil(tot / per));
    if (st.page > pgs) st.page = pgs;
    var ini = (st.page - 1) * per, pg = arr.slice(ini, ini + per);
    $('tbody').innerHTML = tot ? (st.visao === 'exp' ? linhasExp(pg) : linhasProc(pg)) : '<tr><td colspan="9" class="vazio">Nenhum registro com esses filtros.</td></tr>';
    var base = st.visao === 'exp' ? EXPD.length : PROC.length;
    var unid = st.visao === 'exp' ? 'expedientes' : 'processos';
    $('count').textContent = tot + ' de ' + base + ' ' + unid + (tot ? (' · página ' + st.page + '/' + pgs) : '');
    $('nota').textContent = st.visao === 'exp' ? 'uma linha por expediente' : 'uma linha por processo (prazo mais próximo)';
    var _na = $('nAlerta'); if (_na) _na.textContent = '(' + PROC.filter(temAlerta).length + ')';
    $('pag').innerHTML = pgs > 1
      ? '<button id="pAnt"' + (st.page <= 1 ? ' disabled' : '') + '>Anterior</button><span>' + st.page + ' / ' + pgs + '</span><button id="pProx"' + (st.page >= pgs ? ' disabled' : '') + '>Próxima</button>'
      : '';
    wire();
  }

  // ── eventos ──────────────────────────────────────────────────────────────
  function wire() {
    document.querySelectorAll('#hrow th[data-s]').forEach(function (th) {
      var s = th.getAttribute('data-s'); if (!s) return;
      th.onclick = function () { if (st.sort === s) st.dir = -st.dir; else { st.sort = s; st.dir = 1; } render(); };
    });
    document.querySelectorAll('.exp').forEach(function (el) {
      el.onclick = function () { var k = el.getAttribute('data-cnj'); st.exp[k] = !st.exp[k]; render(); };
    });
    document.querySelectorAll('.lnk').forEach(function (el) {
      el.onclick = function () {
        // A pagina do relatorio nao roda no PJe: informa a origem coletada (pjmPrazos.origem),
        // que o background valida antes de usar.
        var org = (DADOS && DADOS.origem) || '';
        try {
          EXT.runtime.sendMessage({ type: 'PJM_ABRIR_AUTOS_DIRETO', cnj: el.getAttribute('data-cnj'), idProcesso: el.getAttribute('data-idp'), abrirAto: false, origem: org }, function (resp) {
            if (resp && resp.ok) return;
            var err = (resp && resp.error) || (resp && resp.resultados && resp.resultados[0] && resp.resultados[0].error) || 'motivo desconhecido';
            alert('Não foi possível abrir os autos (' + err + ').\nConfira se você está logado no PJe nesta janela e refaça a coleta se necessário.');
          });
        } catch (e) { alert('Falha ao abrir os autos: ' + ((e && e.message) || e)); }
      };
    });
    var a = $('pAnt'), p = $('pProx');
    if (a) a.onclick = function () { if (st.page > 1) { st.page--; render(); } };
    if (p) p.onclick = function () { st.page++; render(); };
  }

  function csv() {
    var arr = ordenar(filtrados());
    var cs = cols().filter(function (c) { return c.k !== 'abrir'; });
    var head = cs.map(function (c) { return c.l; });
    if (st.visao === 'proc') head = head.concat(['Id processo']);
    var linhas = [head];
    arr.forEach(function (r) {
      var l = cs.map(function (c) {
        if (c.k === 'alerta') return temAlerta(r) ? (semC(r) + ' sem ciencia') : '';
        if (c.k === 'situacao') return SIT_LBL[sitDe(r)];
        if (c.k === 'bucket') return B_SHORT[r.bucket] || r.bucket || '';
        return r[c.k] == null ? '' : String(r[c.k]);
      });
      if (st.visao === 'proc') l = l.concat([r.idProcesso || '']);
      linhas.push(l);
    });
    var txt = linhas.map(function (l) { return l.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
    var blob = new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'prazos-pje-' + st.visao + '-' + Date.now() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function bindFiltros() {
    $('vProc').onclick = function () { st.visao = 'proc'; st.sort = 'dias'; st.dir = 1; st.page = 1; $('vProc').classList.add('act'); $('vExp').classList.remove('act'); render(); };
    $('vExp').onclick = function () { st.visao = 'exp'; st.sort = 'dias'; st.dir = 1; st.page = 1; $('vExp').classList.add('act'); $('vProc').classList.remove('act'); render(); };
    $('fq').oninput = function () { st.q = $('fq').value; st.page = 1; render(); };
    $('fStatus').onchange = function () { st.status = $('fStatus').value; st.page = 1; render(); };
    $('fMeio').onchange = function () { st.meio = $('fMeio').value; st.page = 1; render(); };
    $('fClasse').onchange = function () { st.classe = $('fClasse').value; st.page = 1; render(); };
    $('fPrazo').onchange = function () { st.prazo = $('fPrazo').value; st.page = 1; render(); };
    $('fAlerta').onchange = function () { st.alerta = $('fAlerta').checked; st.page = 1; render(); };
    $('fCriDe').onchange = function () { st.criDe = $('fCriDe').value; st.page = 1; render(); };
    $('fCriAte').onchange = function () { st.criAte = $('fCriAte').value; st.page = 1; render(); };
    $('fPer').onchange = function () { st.per = parseInt($('fPer').value, 10) || 50; st.page = 1; render(); };
    $('bLimpar').onclick = function () {
      st.q = ''; st.status = ''; st.meio = ''; st.classe = ''; st.prazo = ''; st.criDe = ''; st.criAte = ''; st.alerta = false; st.page = 1;
      $('fq').value = ''; $('fStatus').value = ''; $('fMeio').value = ''; $('fPrazo').value = ''; $('fCriDe').value = ''; $('fCriAte').value = ''; $('fAlerta').checked = false;
      render();
    };
    $('bCsv').onclick = csv;
  }

  st.sort = 'dias';
  bindFiltros();
  carregar();
})();
