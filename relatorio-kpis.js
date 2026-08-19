/**
 * PJe Mapeador — RELATÓRIO DE KPIs (por etiqueta) v2
 * Formatos: card · cobertura(%) · semaforo(limite) · meta(progresso) · barras · funil · rosca · tabela.
 * Cada regra: { nome, padrao, formato, cor, alvo, ativo }. Coringa no padrao: • ou *.
 */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
  function globRe(pat) { var parts = norm(pat).split(/[•*]/); return new RegExp('^' + parts.map(function (p) { return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('.*') + '$'); }
  // Padrao = lista separada por virgula. Termo com '!' na frente EXCLUI. Coringa: • ou *.
  function buildMatcher(padrao) {
    var inc = [], exc = [];
    String(padrao || '').split(',').forEach(function (tk) { tk = tk.trim(); if (!tk) return; if (tk.charAt(0) === '!') exc.push(globRe(tk.slice(1).trim())); else inc.push(globRe(tk)); });
    return function (en) { if (exc.some(function (re) { return re.test(en); })) return false; return inc.length ? inc.some(function (re) { return re.test(en); }) : false; };
  }
  function tint(hex, f) { hex = (hex || '#7d3c98').replace('#', ''); if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1'); var n = parseInt(hex, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; r = Math.round(r + (255 - r) * f); g = Math.round(g + (255 - g) * f); b = Math.round(b + (255 - b) * f); return 'rgb(' + r + ',' + g + ',' + b + ')'; }

  var DEFAULT_REGRAS = [
    { nome: 'Fase (RCand)', padrao: 'RCand F• · •', formato: 'funil', cor: '#7d3c98', ativo: true },
    { nome: 'Carga por membro', padrao: 'SePP - •', formato: 'barras', cor: '#2980b9', ativo: true }
  ];

  function carregar(cb) {
    chrome.storage.local.get(['pjeMapperUltimoResultado', 'pjmKpiRegras'], function (r) {
      var res = r.pjeMapperUltimoResultado || {}, by = {};
      (res.tarefas || []).forEach(function (t) { (t.processos || []).forEach(function (p) { var k = String(p.numero || p.numeroProcesso || '').replace(/\D/g, ''); if (!k) return; if (!by[k]) by[k] = { cnj: p.numero || k, etq: {} }; (p.etiquetas || []).forEach(function (e) { if (e) by[k].etq[e] = 1; }); }); });
      var procs = Object.keys(by).map(function (k) { return { cnj: by[k].cnj, etiquetas: Object.keys(by[k].etq) }; });
      var regras = (Array.isArray(r.pjmKpiRegras) && r.pjmKpiRegras.length) ? r.pjmKpiRegras : DEFAULT_REGRAS;
      cb({ procs: procs, total: procs.length, regras: regras, usouPadrao: !(Array.isArray(r.pjmKpiRegras) && r.pjmKpiRegras.length), ts: res.timestamp || null });
    });
  }

  function computar(d) {
    return (d.regras || []).filter(function (r) { return r && r.ativo !== false && r.padrao; }).map(function (r) {
      var match = buildMatcher(r.padrao), cor = r.cor || '#7d3c98', f = r.formato || 'card';
      if (f === 'funil' || f === 'barras' || f === 'rosca') {
        var mapa = {};
        d.procs.forEach(function (p) { (p.etiquetas || []).forEach(function (e) { if (match(norm(e))) mapa[e] = (mapa[e] || 0) + 1; }); });
        var series = Object.keys(mapa).map(function (e) { return { label: e, valor: mapa[e] }; });
        if (f === 'funil') series.sort(function (a, b) { return a.label < b.label ? -1 : a.label > b.label ? 1 : 0; });
        else series.sort(function (a, b) { return b.valor - a.valor; });
        return { nome: r.nome || r.padrao, formato: f, series: series, cor: cor };
      }
      if (f === 'tabela') {
        var itens = [];
        d.procs.forEach(function (p) { (p.etiquetas || []).forEach(function (e) { if (match(norm(e))) itens.push({ cnj: p.cnj, etq: e }); }); });
        return { nome: r.nome || r.padrao, formato: 'tabela', itens: itens, cor: cor };
      }
      var n = 0;
      d.procs.forEach(function (p) { if ((p.etiquetas || []).some(function (e) { return match(norm(e)); })) n++; });
      return { nome: r.nome || r.padrao, formato: f, valor: n, cor: cor, alvo: num(r.alvo), total: d.total };
    });
  }

  function barras(series, cor) {
    if (!series.length) return '<div class="vazio2">Sem etiquetas correspondentes na coleta.</div>';
    var max = series.reduce(function (m, s) { return Math.max(m, s.valor); }, 1);
    return series.map(function (s) { var pct = Math.max(2, Math.round(s.valor / max * 100)); return '<div class="brow"><div class="bnm" title="' + esc(s.label) + '">' + esc(s.label) + '</div><div class="btr"><div class="bfl" style="width:' + pct + '%;background:' + cor + '"></div></div><div class="bvl">' + s.valor + '</div></div>'; }).join('');
  }
  function rosca(series, cor) {
    if (!series.length) return '<div class="vazio2">Sem etiquetas correspondentes.</div>';
    var tot = series.reduce(function (a, s) { return a + s.valor; }, 0) || 1, acc = 0, stops = [], leg = '';
    series.forEach(function (s, i) { var c = tint(cor, Math.min(0.75, i * 0.16)); var p0 = acc / tot * 100; acc += s.valor; var p1 = acc / tot * 100; stops.push(c + ' ' + p0 + '% ' + p1 + '%'); leg += '<div class="lg"><span class="dot" style="background:' + c + '"></span>' + esc(s.label) + '<b style="margin-left:auto">' + Math.round(s.valor / tot * 100) + '%</b></div>'; });
    return '<div style="display:flex;align-items:center;gap:16px"><div class="don" style="background:conic-gradient(' + stops.join(',') + ')"></div><div style="flex:1">' + leg + '</div></div>';
  }
  function cobertura(k) { var pct = k.total ? Math.round(k.valor / k.total * 100) : 0; return '<div class="sec"><div class="sect">' + esc(k.nome) + '</div><div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:38px;font-weight:800;color:' + k.cor + '">' + pct + '%</span><span style="font-size:12px;color:#6b7280">' + k.valor + ' de ' + k.total + '</span></div><div class="btr" style="margin-top:8px"><div class="bfl" style="width:' + pct + '%;background:' + k.cor + '"></div></div></div>'; }
  function metaKpi(k) { var m = k.alvo || 0, pct = m ? Math.min(100, Math.round(k.valor / m * 100)) : 0; return '<div class="sec"><div class="sect">' + esc(k.nome) + '</div><div style="display:flex;align-items:baseline;gap:6px"><span style="font-size:28px;font-weight:800">' + k.valor + '</span><span style="font-size:13px;color:#9ca3af">/ meta ' + m + '</span><span style="margin-left:auto;font-weight:600;color:' + k.cor + '">' + pct + '%</span></div><div class="btr" style="margin-top:8px"><div class="bfl" style="width:' + pct + '%;background:' + k.cor + '"></div></div></div>'; }
  function semaforo(k) { var lim = k.alvo || 0, cor = '#1f7a4d', bg = '#e6f4ec'; if (lim && k.valor >= lim) { cor = '#c0392b'; bg = '#f7dada'; } else if (lim && k.valor >= lim * 0.6) { cor = '#a5720b'; bg = '#faeeda'; } return '<div class="card" style="background:' + bg + '"><div class="cn" style="color:' + cor + '">' + k.valor + '</div><div class="cl">' + esc(k.nome) + (lim ? ' · limite ' + lim : '') + '</div></div>'; }
  function cardNum(k) { return '<div class="card"><div class="cn" style="color:' + k.cor + '">' + k.valor + '</div><div class="cl">' + esc(k.nome) + '</div></div>'; }
  function tabela(k) {
    var rows = k.itens.length ? k.itens.slice(0, 300).map(function (it) { return '<tr><td style="font-family:monospace;font-size:11.5px;padding:4px 8px;border-top:0.5px solid #eef1f4">' + esc(it.cnj) + '</td><td style="padding:4px 8px;border-top:0.5px solid #eef1f4"><span class="pill" style="background:' + k.cor + '22;color:' + k.cor + '">' + esc(it.etq) + '</span></td></tr>'; }).join('') : '<tr><td colspan="2" class="vazio2">Nenhum processo.</td></tr>';
    return '<div class="sec"><div class="sect">' + esc(k.nome) + ' <span style="color:#9ca3af;font-weight:400">(' + k.itens.length + ')</span></div><table style="width:100%;border-collapse:collapse"><tr style="color:#94a3b8;text-align:left;font-size:10px"><th style="padding:0 8px">CNJ</th><th style="padding:0 8px">Etiqueta</th></tr>' + rows + '</table></div>';
  }

  var DADOS = null, KPIS = [];
  function render() {
    if (!DADOS) return;
    KPIS = computar(DADOS);
    var cards = KPIS.filter(function (k) { return k.formato === 'card' || k.formato === 'semaforo'; });
    var html = cards.length ? '<div class="sec"><div class="sect">Indicadores</div><div class="cards">' + cards.map(function (k) { return k.formato === 'semaforo' ? semaforo(k) : cardNum(k); }).join('') + '</div></div>' : '';
    KPIS.forEach(function (k) {
      if (k.formato === 'funil' || k.formato === 'barras') html += '<div class="sec"><div class="sect">' + esc(k.nome) + '</div>' + barras(k.series, k.cor) + '</div>';
      else if (k.formato === 'rosca') html += '<div class="sec"><div class="sect">' + esc(k.nome) + '</div>' + rosca(k.series, k.cor) + '</div>';
      else if (k.formato === 'cobertura') html += cobertura(k);
      else if (k.formato === 'meta') html += metaKpi(k);
      else if (k.formato === 'tabela') html += tabela(k);
    });
    if (!KPIS.length) html = '<div class="sec"><div class="vazio">Nenhum KPI configurado. Configure em Configurações → Gerenciar KPIs.</div></div>';
    $('conteudo').innerHTML = html;
    $('meta').textContent = DADOS.total + ' processos na coleta' + (DADOS.usouPadrao ? ' · padrão embutido' : '') + (DADOS.ts ? ' · ' + new Date(DADOS.ts).toLocaleString('pt-BR') : '');
  }
  function csv() {
    var L = [['KPI', 'Formato', 'Serie', 'Valor']];
    KPIS.forEach(function (k) {
      if (k.formato === 'funil' || k.formato === 'barras' || k.formato === 'rosca') (k.series || []).forEach(function (s) { L.push([k.nome, k.formato, s.label, s.valor]); });
      else if (k.formato === 'tabela') (k.itens || []).forEach(function (it) { L.push([k.nome, 'tabela', it.cnj, it.etq]); });
      else L.push([k.nome, k.formato, '', k.valor]);
    });
    return L.map(function (r) { return r.map(function (c) { return String(c == null ? '' : c).replace(/[\t\r\n]+/g, ' '); }).join('\t'); }).join('\n');
  }
  function atualizar() { carregar(function (d) { DADOS = d; render(); }); }
  function boot() { atualizar(); $('bAtualizar').addEventListener('click', atualizar); $('bCsv').addEventListener('click', function () { navigator.clipboard.writeText(csv()).then(function () { $('bCsv').textContent = 'Copiado!'; setTimeout(function () { $('bCsv').textContent = 'Copiar CSV'; }, 1500); }, function () { alert('Falha ao copiar.'); }); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
