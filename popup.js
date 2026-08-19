
const $ = id => document.getElementById(id);
// Escapa texto para uso seguro em innerHTML (defesa contra XSS — S-1)
const escHtml = s => (s == null ? '' : String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
let ultimoResultado = null;

// ── UI ────────────────────────────────────────────────────────────────

function setStatus(msg, tipo = 'info') {
  const el = $('status');
  el.innerHTML = msg;
  el.className = tipo;
  el.style.display = 'block';
}

function setBotoes(on) {
  ['btnJSON', 'btnCSV', 'btnConsole'].forEach(id => $(id).disabled = !on);
}

function setBtnMapear(loading) {
  const btn = $('btnMapear');
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Mapeando...'
    : '<span>🔍</span> Mapear Minhas Tarefas';
}

// ── Resumo visual ─────────────────────────────────────────────────────

function exibirResumo(r) {
  let totalTarefas = 0, totalProcessos = 0;
  const porCat = {};
  const porEtiqueta = {};

  if (r.tipo === 'dashboard') {
    const mt = r.minhasTarefas || [];
    totalTarefas   = mt.length;
    totalProcessos = mt.reduce((a, t) => a + (t.quantidade || 0), 0);
    mt.forEach(t => {
      const c = t.categoria || 'outras';
      porCat[c] = (porCat[c] || 0) + (t.quantidade || 1);
      // etiquetas se já foram extraídas
      (t.processos || []).forEach(p =>
        (p.etiquetas || []).forEach(e => { porEtiqueta[e] = (porEtiqueta[e] || 0) + 1; })
      );
    });
  } else if (r.tipo === 'lista-processos') {
    totalTarefas   = 1;
    totalProcessos = (r.processos || []).length;
    (r.processos || []).forEach(p => {
      const c = p.categoria || '—';
      porCat[c] = (porCat[c] || 0) + 1;
      (p.etiquetas || []).forEach(e => { porEtiqueta[e] = (porEtiqueta[e] || 0) + 1; });
    });
  } else if (r.tipo === 'extrator') {
    // Resultado completo do extrator (navegação automática)
    const tarefas = r.tarefas || [];
    totalTarefas   = tarefas.length;
    totalProcessos = r.resumo?.totalProcessos || tarefas.reduce((a, t) => a + (t.processos?.length || 0), 0);
    Object.entries(r.resumo?.porCategoria || {}).forEach(([c, n]) => { porCat[c] = n; });
    Object.entries(r.resumo?.porEtiqueta  || {}).forEach(([e, n]) => { porEtiqueta[e] = n; });
  }

  $('numTarefas').textContent   = totalTarefas;
  $('numProcessos').textContent = totalProcessos;
  $('numFases').textContent     = Object.keys(porCat).length;

  // Categorias
  const lista = $('fasesLista');
  lista.innerHTML = '';
  const maxCat = Math.max(...Object.values(porCat), 1);
  Object.entries(porCat).sort((a, b) => b[1] - a[1]).forEach(([cat, qtd]) => {
    const pct = Math.round(qtd / maxCat * 100);
    lista.insertAdjacentHTML('beforeend', `
      <div class="fase-item">
        <div style="flex:1;min-width:0">
          <div class="fase-nome">${cat}</div>
          <div class="fase-barra" style="width:${pct}%"></div>
        </div>
        <span class="fase-badge">${qtd}</span>
      </div>`);
  });

  // Etiquetas (se existirem)
  const listaEtq = $('etiquetasLista');
  if (Object.keys(porEtiqueta).length > 0) {
    listaEtq.innerHTML = '';
    const maxEtq = Math.max(...Object.values(porEtiqueta), 1);
    Object.entries(porEtiqueta).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([etq, qtd]) => {
      const pct = Math.round(qtd / maxEtq * 100);
      listaEtq.insertAdjacentHTML('beforeend', `
        <div class="fase-item">
          <div style="flex:1;min-width:0">
            <div class="fase-nome">${etq}</div>
            <div class="fase-barra etq-barra" style="width:${pct}%"></div>
          </div>
          <span class="fase-badge etq-badge">${qtd}</span>
        </div>`);
    });
    $('secaoEtiquetas').style.display = 'block';
  } else {
    $('secaoEtiquetas').style.display = 'none';
  }

  $('resumo').style.display = 'block';
}

// ── Função injetada no iframe do PJe ─────────────────────────────────
// Roda em world:'MAIN' dentro do iframe pje-frontend.tse.jus.br.
// ATENÇÃO: totalmente auto-contida — sem referências externas.

function pjeMapearNoFrame() {
  const T = el => el ? (el.textContent || '').trim().replace(/\s+/g, ' ') : '';
  const D = s  => { try { return decodeURIComponent(s); } catch(_) { return s; } };
  const N = s  => { const m = (s||'').match(/\d{7}-\d{2}\.\d{4}\.\d{1,2}\.\d{2}\.\d{4}/); return m ? m[0] : ''; };

  const CATS = [
    ['determinação', ['analisar determinação']],
    ['documentos',   ['elaborar documentos', 'desentranhar', 'digitalizar']],
    ['publicação',   ['publicar processos', 'verificar decisão']],
    ['comunicação',  ['preparar comunicação', 'analisar resposta', 'carta de ordem', 'ofício', 'intimação', 'informação de ar', 'cumprimento de ar']],
    ['prazo',        ['prazo em curso', 'trânsito em julgado', 'informar data']],
    ['remessa',      ['expedir processo', 'processos expedidos', 'processos remetidos', 'apreciação de outra', 'apreciação pela instância']],
    ['recursal',     ['recurso interno', 'registrar recurso', 'julgamento do recurso']],
    ['suspensão',    ['suspensos', 'sobrestados']],
    ['arquivo',      ['arquivamento provisório', 'arquivados provisoriamente']],
    ['petição',      ['petição avulsa', 'analisar processos']],
    ['pendências',   ['aguardando providências', 'verificar pendências']],
  ];
  function cat(nome) {
    const s = (nome || '').toLowerCase();
    for (const [c, ts] of CATS) if (ts.some(t => s.includes(t))) return c;
    return 'outras';
  }

  const diag = {
    url:             location.href,
    hash:            location.hash,
    readyState:      document.readyState,
    linksMinhas:     document.querySelectorAll('a[href*="lista-minhas-tarefas"]').length,
    linksGerais:     document.querySelectorAll('a[href*="lista-processos-tarefa"]').length,
    linksAssinatura: document.querySelectorAll('a[href*="lista-processos-assinatura"]').length,
    spanNome:        document.querySelectorAll('span.nome').length,
    spanQtd:         document.querySelectorAll('span.quantidadeTarefa').length,
    menuItems:       document.querySelectorAll('div.menuItem').length,
    overflowTarefas: document.querySelectorAll('div.overflowTarefas').length,
    painel:          document.querySelectorAll('.painel-usuario-interno-dashboard').length,
    numeroProcesso:  document.querySelectorAll('span.tarefa-numero-processo').length,
    etiquetas:       document.querySelectorAll('div.label.label-info.label-etiqueta').length,
  };

  const hash    = location.hash || '';
  const emLista = hash.includes('lista-minhas-tarefas') || hash.includes('lista-processos-tarefa');

  // ── tela de lista de processos ──────────────────────────────────────
  if (emLista) {
    const nomeT = D(hash).split('/').find((s, i, a) =>
      a[i-1] === 'lista-minhas-tarefas' || a[i-1] === 'lista-processos-tarefa'
    ) || 'Tarefa';

    // Extrair processos com etiquetas usando seletores reais confirmados
    const procs = [];
    const vistos = new Set();

    document.querySelectorAll(
      'span.tarefa-numero-processo.process, span.tarefa-numero-processo:not(.process)'
    ).forEach(elNum => {
      const numCNJ = N(T(elNum));
      if (!numCNJ || vistos.has(numCNJ)) return;
      vistos.add(numCNJ);

      // ID interno PJe
      const spanHidden = elNum.querySelector('span.hidden, span[id]');
      const idInterno  = spanHidden ? (spanHidden.id || T(spanHidden)).trim() : '';

      const container = elNum.closest('div.col-sm-11')
                     || elNum.closest('div[class*="col-sm-11"]')
                     || elNum.closest('div.datalist-content')
                     || elNum.parentElement?.parentElement?.parentElement;

      // Etiquetas — ignorar spans que são ícones font-awesome
      const etiquetas = [];
      if (container) {
        container.querySelectorAll('div.label.label-info.label-etiqueta').forEach(divEtq => {
          const spanNome = [...divEtq.querySelectorAll('span')].find(s => {
            const cls = s.className || '';
            return !cls.includes('fa ') && !cls.startsWith('fa-') && !cls.includes('glyphicon');
          });
          const nome = T(spanNome);
          if (nome && nome.length > 1
              && !nome.includes('Excluir')
              && !nome.includes('Desvincular')
              && !nome.includes('Remover')) {
            etiquetas.push(nome);
          }
        });
      }

      const fase    = T(container?.querySelector('.fase, span.orgao, span.local'));
      const subfase = T(container?.querySelector('.subfase, [class*="subfase"]'));

      const CFASE = [
        ['comunicação', ['comunicação', 'ofício', 'intimação', 'ar']],
        ['prazo',       ['prazo', 'trânsito em julgado']],
        ['recursal',    ['recurso', 'apelação', 'agravo', 'embargos']],
        ['execução',    ['cumprimento', 'penhora', 'execução']],
        ['instrução',   ['audiência', 'perícia', 'prova']],
      ];
      function cFase(f, s) {
        const x = `${f} ${s}`.toLowerCase();
        for (const [c, ts] of CFASE) if (ts.some(t => x.includes(t))) return c;
        return f ? 'outras' : '—';
      }

      procs.push({
        numero:    numCNJ,
        idInterno,
        fase:      fase    || '',
        subfase:   subfase || '',
        etiquetas: [...new Set(etiquetas)],
        categoria: cFase(fase, subfase),
      });
    });

    // Fallback para tabelas (telas sem o componente datalist)
    if (procs.length === 0) {
      document.querySelectorAll('tbody tr, tr.ng-star-inserted').forEach(tr => {
        const n = N(T(tr));
        if (!n || vistos.has(n)) return;
        vistos.add(n);
        const eF = tr.querySelector('.fase, [class*="fase"]:not([class*="subfase"])');
        const eS = tr.querySelector('.subfase, [class*="subfase"]');
        const cs = [...tr.querySelectorAll('td')];
        const hs = [...(tr.closest('table')?.querySelectorAll('th') || [])].map(T);
        const row = Object.fromEntries(cs.map((c, i) => [(hs[i] || `c${i}`).toLowerCase(), T(c)]));
        const f = T(eF) || row.fase || row['fase atual'] || '';
        const s = T(eS) || row.subfase || row['sub-fase'] || '';
        procs.push({ numero: n, idInterno: '', fase: f, subfase: s, etiquetas: [], categoria: f ? 'outras' : '—' });
      });
    }

    return { tipo: 'lista-processos', tarefa: nomeT, processos: procs, diag, timestamp: new Date().toISOString() };
  }

  // ── dashboard ────────────────────────────────────────────────────────
  const minhasTarefas = [], tarefasGerais = [], assinaturas = [];

  // Deduplicar pelo href — PJe renderiza o mesmo componente 2× no DOM
  const hrefsVistos = new Set();

  document.querySelectorAll('a[href*="lista-minhas-tarefas"]').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (!href || hrefsVistos.has(href)) return;
    hrefsVistos.add(href);
    const div  = a.querySelector('div.detalheTarefasQuantidade');
    const nome = T(div?.querySelector('span.nome')) || T(a);
    const qtd  = parseInt(T(div?.querySelector('span.quantidadeTarefa')), 10) || 0;
    minhasTarefas.push({ id: minhasTarefas.length + 1, nome, quantidade: qtd, href, categoria: cat(nome), processos: [] });
  });

  const hrefsGerais = new Set();
  document.querySelectorAll('a[href*="lista-processos-tarefa"]').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (!href || hrefsGerais.has(href)) return;
    hrefsGerais.add(href);
    const div  = a.querySelector('div.detalheTarefasQuantidade');
    const nome = T(div?.querySelector('span.nome')) || T(a);
    const qtd  = parseInt(T(div?.querySelector('span.quantidadeTarefa')), 10) || 0;
    tarefasGerais.push({ id: tarefasGerais.length + 1, nome, quantidade: qtd, href, categoria: cat(nome) });
  });

  document.querySelectorAll('a[href*="lista-processos-assinatura"]').forEach((a, i) => {
    const div  = a.querySelector('div.detalheTarefasQuantidade');
    const nome = T(div?.querySelector('span.nome')) || T(a);
    const qtd  = parseInt(T(div?.querySelector('span.quantidadeTarefa')), 10) || 0;
    assinaturas.push({ id: i+1, nome, quantidade: qtd });
  });

  return {
    tipo: 'dashboard',
    minhasTarefas,
    tarefasGerais,
    assinaturas,
    diag,
    timestamp: new Date().toISOString(),
  };
}

// ── Descobrir frameId do iframe do PJe Angular ───────────────────────

async function descobrirFrameId(tabId) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });

  console.log('[PJeMapper] Frames encontrados:', frames.map(f => ({
    frameId: f.frameId,
    url: f.url,
    parentFrameId: f.parentFrameId,
  })));

  const PADROES = [
    /pje-frontend\.tse\.jus\.br/,
    /tse\.jus\.br.*painel/,
    /pje-frontend/,
    /\/ng2\//,
    /painel-usuario-interno/,
    /pje\.jus\.br.*ng/,
  ];

  for (const padrao of PADROES) {
    const frame = frames.find(f => f.frameId !== 0 && padrao.test(f.url));
    if (frame) {
      console.log(`[PJeMapper] Frame do PJe encontrado: frameId=${frame.frameId} url=${frame.url}`);
      return frame.frameId;
    }
  }

  const frameNaoPrincipal = frames.find(f => f.frameId !== 0 && f.url && f.url !== 'about:blank');
  if (frameNaoPrincipal) {
    console.log(`[PJeMapper] Usando frame não-principal: frameId=${frameNaoPrincipal.frameId} url=${frameNaoPrincipal.url}`);
    return frameNaoPrincipal.frameId;
  }

  console.log('[PJeMapper] Nenhum iframe encontrado — usando frame principal.');
  return 0;
}

// ── Botão Mapear ──────────────────────────────────────────────────────

$('btnMapear').addEventListener('click', async () => {
  setBtnMapear(true);
  setStatus('Localizando iframe do PJe...', 'info');
  $('resumo').style.display = 'none';
  setBotoes(false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      setStatus('❌ Nenhuma aba ativa encontrada.', 'error');
      setBtnMapear(false);
      return;
    }

    setStatus('Identificando frame do Angular...', 'info');
    const frameId = await descobrirFrameId(tab.id);

    setStatus(`Mapeando frame ${frameId}...`, 'info');

    let execResult;
    try {
      [execResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frameId] },
        func: pjeMapearNoFrame,
        world: 'MAIN',
      });
    } catch (e1) {
      console.warn('[PJeMapper] world:MAIN falhou, tentando sem world:', e1.message);
      try {
        [execResult] = await chrome.scripting.executeScript({
          target: { tabId: tab.id, frameIds: [frameId] },
          func: pjeMapearNoFrame,
        });
      } catch (e2) {
        console.warn('[PJeMapper] frameIds falhou, tentando allFrames:', e2.message);
        [execResult] = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: pjeMapearNoFrame,
          world: 'MAIN',
        });
        if (Array.isArray(execResult)) {
          execResult = execResult.find(r => r.result?.minhasTarefas?.length || r.result?.processos?.length) || execResult[0];
        }
      }
    }

    const r = execResult?.result;


    ultimoResultado = r;

    const temDados =
      (r?.tipo === 'dashboard'       && ((r.minhasTarefas?.length||0) + (r.tarefasGerais?.length||0)) > 0) ||
      (r?.tipo === 'lista-processos'  && (r.processos?.length||0) > 0);

    if (!temDados) {
      const d = r?.diag || {};
      setStatus(
        `⚠️ Nenhuma tarefa encontrada no frame ${frameId}.<br>` +
        `<small>` +
        `URL: ${escHtml((d.url||'').replace('https://','').slice(0,50))}<br>` +
        `minhas-tarefas: ${d.linksMinhas||0} | gerais: ${d.linksGerais||0} | ` +
        `span.nome: ${d.spanNome||0} | menuItems: ${d.menuItems||0}` +
        `</small>`,
        'warning'
      );
      setBtnMapear(false);
      return;
    }

    let msgOk = '';
    if (r.tipo === 'dashboard') {
      const qM  = r.minhasTarefas?.length || 0;
      const qG  = r.tarefasGerais?.length || 0;
      const totP = (r.minhasTarefas||[]).reduce((a, t) => a + (t.quantidade||0), 0);
      msgOk = `✅ ${qM} "Minhas Tarefas" (${totP} proc.)${qG ? ` · ${qG} gerais` : ''}`;
    } else if (r.tipo === 'lista-processos') {
      const comEtq = (r.processos||[]).filter(p => p.etiquetas?.length > 0).length;
      msgOk = `✅ "${escHtml(r.tarefa)}": ${r.processos.length} processo(s)${comEtq ? ` · ${comEtq} com etiqueta` : ''}`;
    }

    setStatus(msgOk, 'success');
    exibirResumo(r);
    setBotoes(true);
    await chrome.storage.local.set({ pjeUltimoResultado: r });

  } catch (err) {
    console.error('[PJeMapper]', err);
    setStatus(
      `❌ Erro: ${err.message || err}<br>` +
      `<small>Recarregue a extensão em chrome://extensions e tente novamente.</small>`,
      'error'
    );
  }

  setBtnMapear(false);
});

// ── Exportar JSON ─────────────────────────────────────────────────────

$('btnJSON').addEventListener('click', async () => {
  if (!ultimoResultado) return;
  const exportar = JSON.parse(JSON.stringify(ultimoResultado));
  delete exportar.diag;
  const blob = new Blob([JSON.stringify(exportar, null, 2)], { type: 'application/json' });
  const data = new Date().toISOString().slice(0, 10);
  const objUrl = URL.createObjectURL(blob);
  try {
    await chrome.downloads.download({ url: objUrl, filename: `pje_tarefas_${data}.json`, saveAs: true });
  } catch(_) {
    Object.assign(document.createElement('a'), { href: objUrl, download: `pje_tarefas_${data}.json` }).click();
  }
  setTimeout(() => { try { URL.revokeObjectURL(objUrl); } catch (_) { console.warn('[PJM popup]', _); } }, 1500);
});

// ── Exportar CSV ──────────────────────────────────────────────────────

$('btnCSV').addEventListener('click', async () => {
  if (!ultimoResultado) return;
  const r   = ultimoResultado;
  const sep = ',';
  const q   = s => `"${(s||'').replace(/"/g, '""')}"`;

  // Inclui coluna Etiquetas
  const linhas = [['Card','Tarefa','Qtd','Número','ID Interno','Etiquetas','Fase','Sub-fase','Categoria','URL'].join(sep)];

  if (r.tipo === 'dashboard') {
    const addCard = (card, lista) => (lista||[]).forEach(t => {
      if (t.processos?.length) {
        t.processos.forEach(p =>
          linhas.push([
            q(card), q(t.nome), t.quantidade,
            q(p.numero), q(p.idInterno||''),
            q((p.etiquetas||[]).join(' | ')),
            q(p.fase||''), q(p.subfase||''), q(p.categoria||''),
            q(t.href||''),
          ].join(sep))
        );
      } else {
        linhas.push([q(card), q(t.nome), t.quantidade, '', '', '', '', '', q(t.categoria||''), q(t.href||'')].join(sep));
      }
    });
    addCard('Minhas Tarefas', r.minhasTarefas);
    addCard('Tarefas Gerais', r.tarefasGerais);
    addCard('Assinaturas',    r.assinaturas);
  } else if (r.tipo === 'lista-processos') {
    (r.processos||[]).forEach(p =>
      linhas.push([
        q('Lista'), q(r.tarefa), r.processos.length,
        q(p.numero), q(p.idInterno||''),
        q((p.etiquetas||[]).join(' | ')),
        q(p.fase||''), q(p.subfase||''), q(p.categoria||''),
        q(''),
      ].join(sep))
    );
  } else if (r.tipo === 'extrator') {
    (r.tarefas||[]).forEach(t =>
      (t.processos||[]).forEach(p =>
        linhas.push([
          q('Minhas Tarefas'), q(t.nome), t.quantidade||'',
          q(p.numero), q(p.idInterno||''),
          q((p.etiquetas||[]).join(' | ')),
          q(p.fase||''), q(p.subfase||''), q(p.categoria||''),
          q(t.href||''),
        ].join(sep))
      )
    );
  }

  const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const data = new Date().toISOString().slice(0, 10);
  const objUrl = URL.createObjectURL(blob);
  try {
    await chrome.downloads.download({ url: objUrl, filename: `pje_tarefas_${data}.csv`, saveAs: true });
  } catch(_) {
    Object.assign(document.createElement('a'), { href: objUrl, download: `pje_tarefas_${data}.csv` }).click();
  }
  setTimeout(() => { try { URL.revokeObjectURL(objUrl); } catch (_) { console.warn('[PJM popup]', _); } }, 1500);
});

// ── Botão Console ─────────────────────────────────────────────────────

$('btnConsole').addEventListener('click', async () => {
  if (!ultimoResultado) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const frameId = await descobrirFrameId(tab.id);
  const str = JSON.stringify(ultimoResultado);

  const injetar = async (fId) => chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [fId] },
    func: s => {
      const d = JSON.parse(s);
      window._pjeMapper = d;
      console.group('%c[PJeMapper] Resultado', 'color:#1a5276;font-weight:bold;font-size:13px;');
      if (d.tipo === 'dashboard') {
        console.log('⭐ Minhas Tarefas:');
        console.table((d.minhasTarefas||[]).map(t => ({ Nome:t.nome, Qtd:t.quantidade, Categoria:t.categoria, URL:t.href })));
        if ((d.tarefasGerais||[]).length) {
          console.log('✅ Tarefas Gerais:');
          console.table((d.tarefasGerais||[]).map(t => ({ Nome:t.nome, Qtd:t.quantidade })));
        }
      } else if (d.tipo === 'lista-processos') {
        console.log(`📋 ${d.tarefa} — ${d.processos?.length} processo(s)`);
        console.table((d.processos||[]).map(p => ({
          Número:    p.numero,
          Etiquetas: (p.etiquetas||[]).join(' | ') || '—',
          Fase:      p.fase,
          'Sub-fase':p.subfase,
          Categoria: p.categoria,
        })));
      } else if (d.tipo === 'extrator') {
        console.log(`📊 Extrator — ${d.resumo?.totalTarefas} tarefas / ${d.resumo?.totalProcessos} processos`);
        (d.tarefas||[]).forEach(t => {
          console.group(`📋 ${t.nome}`);
          console.table((t.processos||[]).map(p => ({
            Número:    p.numero,
            Etiquetas: (p.etiquetas||[]).join(' | ') || '—',
            Categoria: p.categoria,
          })));
          console.groupEnd();
        });
      }
      console.groupEnd();
    },
    args: [str],
    world: 'MAIN',
  });

  try { await injetar(frameId); } catch(_) { await injetar(0); }
  setStatus('📋 Resultado enviado ao Console (F12 → selecione frame "ngFrame" no seletor de contexto).', 'info');
});

// ── Último resultado salvo ────────────────────────────────────────────

chrome.storage.local.get('pjeUltimoResultado', ({ pjeUltimoResultado: r }) => {

  if (!r) return;
  const ok =
    (r.tipo === 'dashboard'       && ((r.minhasTarefas?.length||0) + (r.tarefasGerais?.length||0)) > 0) ||
    (r.tipo === 'lista-processos'  && (r.processos?.length||0) > 0) ||
    (r.tipo === 'extrator'         && (r.tarefas?.length||0) > 0);
  if (!ok) return;
  ultimoResultado = r;
  const data = new Date(r.timestamp || Date.now()).toLocaleString('pt-BR');
  const desc = r.tipo === 'dashboard'
    ? `${r.minhasTarefas?.length||0} tarefa(s)`
    : r.tipo === 'extrator'
      ? `${r.resumo?.totalProcessos||0} processo(s) extraído(s)`
      : `${r.processos?.length||0} processo(s)`;
  setStatus(`📌 Último: ${data} — ${desc}`, 'info');
  exibirResumo(r);
  setBotoes(true);
});



// ════════════════════════════════════════════════════════════════════════
// AGENDAMENTOS
// Gerencia a aba de agendamentos: formulário, lista paginada, cancelamento.
// Storage key: pjmAgendamentos (array)
// Background messages: PJM_AGENDAR, PJM_CANCELAR_AGENDAMENTO, PJM_LISTAR_AGENDAMENTOS
// ════════════════════════════════════════════════════════════════════════
(function initAgendamentos() {
  'use strict';

  const STORAGE_AG  = 'pjmAgendamentos';
  const PG_SIZE     = 10;
  let paginaAtual   = 1;
  let filtroAtual   = 'todos';
  let listaCache    = [];   // todos os itens carregados

  const agHeader    = $('agHeader');
  const agChevron   = $('agChevron');
  const agBody      = $('agBody');
  const agBadge     = $('agBadgeCount');
  const agListaEl   = $('agLista');
  const agVazio     = $('agVazio');
  const agPag       = $('agPaginacao');
  const agPgInfo    = $('agPgInfo');
  const btnPrev     = $('btnAgPrev');
  const btnNext     = $('btnAgNext');
  const btnAgendar  = $('btnAgAgendar');
  const selAcao     = $('agSelAcao');
  const selRegra    = $('agSelRegra');
  const selRegraC   = $('agSelRegraComun');
  const wrapRegra   = $('agWrapRegra');
  const wrapRegraC  = $('agWrapRegraComun');
  const inpCnj      = $('agInputCnj');
  const inpData     = $('agInputData');
  const inpHora     = $('agInputHora');
  const agHoraOpc   = $('agHoraOpc');

  if (!agHeader) return;

  // ── Accordion ─────────────────────────────────────────────────────────
  agHeader.addEventListener('click', function() {
    var aberto = agBody.classList.toggle('open');
    agChevron.classList.toggle('open', aberto);
    if (aberto) carregarEListar();
  });

  // ── Data padrão = hoje ────────────────────────────────────────────────
  inpData.value = new Date().toISOString().slice(0, 10);

  // ── Tipo de disparo: atualiza label da hora ───────────────────────────
  document.querySelectorAll('input[name="agTipo"]').forEach(function(r) {
    r.addEventListener('change', function() {
      var isTipo1 = $('agTipo1') && $('agTipo1').checked;
      if (agHoraOpc) agHoraOpc.textContent = isTipo1 ? '(opcional)' : '';
    });
  });

  // ── Ação: mostrar/ocultar seletores de regra ──────────────────────────
  function atualizarCamposAcao() {
    var acao = selAcao.value;
    var precisaMover  = acao === 'mover'  || acao === 'mover+comunicar';
    var precisaComun  = acao === 'comunicar' || acao === 'mover+comunicar';
    wrapRegra.style.display  = precisaMover  ? '' : 'none';
    wrapRegraC.style.display = precisaComun  ? '' : 'none';
  }
  selAcao.addEventListener('change', atualizarAcao);
  function atualizarAcao() { atualizarCamposAcao(); }
  atualizarCamposAcao();

  // ── Popular seletores de regra ────────────────────────────────────────
  function popularSelRegras() {
    chrome.storage.local.get(['etiquetaRegras', 'prepComunicacaoRegras'], function(r) {
      var etqR  = Array.isArray(r.etiquetaRegras)          ? r.etiquetaRegras          : [];
      var prepR = Array.isArray(r.prepComunicacaoRegras)    ? r.prepComunicacaoRegras   : [];

      selRegra.innerHTML = '<option value="">— selecione a regra —</option>';
      etqR.filter(function(x) { return x.ativo !== false; }).forEach(function(reg) {
        var opt = document.createElement('option');
        opt.value = reg.id;
        opt.textContent = reg.etiqueta + (reg.pipeline ? ' [pipeline ' + reg.pipeline.length + ' etapas]' : '');
        selRegra.appendChild(opt);
      });
      if (etqR.filter(function(x) { return x.ativo !== false; }).length === 0) {
        selRegra.innerHTML = '<option value="">— nenhuma regra de etiqueta cadastrada —</option>';
      }

      selRegraC.innerHTML = '<option value="">— selecione a regra —</option>';
      prepR.filter(function(x) { return x.ativo !== false; }).forEach(function(reg) {
        var opt = document.createElement('option');
        opt.value = reg.id;
        opt.textContent = reg.etiqueta + ' → ' + (reg.tarefa || 'Preparar comunicação');
        selRegraC.appendChild(opt);
      });
      if (prepR.filter(function(x) { return x.ativo !== false; }).length === 0) {
        selRegraC.innerHTML = '<option value="">— nenhuma regra de comunicação cadastrada —</option>';
      }
    });
  }
  popularSelRegras();

  // ── Salvar agendamento ────────────────────────────────────────────────
  btnAgendar.addEventListener('click', function() {
    var acao    = selAcao.value;
    var data    = inpData.value;
    var hora    = inpHora.value;
    var cnj     = inpCnj.value.trim();
    var tipo    = ($('agTipo1') && $('agTipo1').checked) ? 1 : 0;
    var precisaMover = acao === 'mover'  || acao === 'mover+comunicar';
    var precisaComun = acao === 'comunicar' || acao === 'mover+comunicar';

    if (!data) { inpData.focus(); setStatus('⚠️ Informe a data do agendamento.', 'warning'); return; }
    if (tipo === 0 && !hora) { inpHora.focus(); setStatus('⚠️ Para disparo por horário exato informe a hora.', 'warning'); return; }

    // Buscar regras completas do storage
    chrome.storage.local.get(['etiquetaRegras', 'prepComunicacaoRegras'], function(r) {
      var etqR  = Array.isArray(r.etiquetaRegras)       ? r.etiquetaRegras       : [];
      var prepR = Array.isArray(r.prepComunicacaoRegras) ? r.prepComunicacaoRegras : [];

      var regras          = [];
      var regrasComunicacao = [];
      var alvo            = cnj || '';

      if (precisaMover) {
        var idSel = selRegra.value;
        if (!idSel) { selRegra.focus(); setStatus('⚠️ Selecione a regra de movimentação.', 'warning'); return; }
        var rMovimentar = etqR.find(function(x) { return x.id === idSel; });
        if (!rMovimentar) { setStatus('⚠️ Regra de movimentação não encontrada.', 'warning'); return; }
        regras = [rMovimentar];
        if (!alvo) alvo = rMovimentar.etiqueta;
      }

      if (precisaComun) {
        var idSelC = selRegraC.value;
        if (!idSelC) { selRegraC.focus(); setStatus('⚠️ Selecione a regra de comunicação.', 'warning'); return; }
        var rComun = prepR.find(function(x) { return x.id === idSelC; });
        if (!rComun) { setStatus('⚠️ Regra de comunicação não encontrada.', 'warning'); return; }
        regrasComunicacao = [rComun];
        if (!alvo) alvo = rComun.etiqueta;
      }

      var item = {
        id:               'ag_' + Date.now().toString(36),
        modo:             cnj ? 'cnj' : 'etiqueta',
        alvo:             alvo,
        acao:             acao,
        tipo:             tipo,
        data:             data,
        hora:             hora,
        status:           'aguardando',
        regras:           regras,
        regrasComunicacao: regrasComunicacao,
        ts:               Date.now(),
        execAt:           '',
      };

      chrome.runtime.sendMessage({ type: 'PJM_AGENDAR', item: item }, function(res) {
        if (res && res.ok) {
          setStatus('✅ Agendamento salvo para ' + data + (hora ? ' às ' + hora : '') + '.', 'success');
          inpCnj.value  = '';
          inpData.value = new Date().toISOString().slice(0, 10);
          inpHora.value = '';
          carregarEListar();
        } else {
          setStatus('❌ Erro ao salvar agendamento.', 'error');
        }
      });
    });
  });

  // ── Filtros ───────────────────────────────────────────────────────────
  document.querySelectorAll('[data-ag-filtro]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-ag-filtro]').forEach(function(b) {
        b.classList.remove('ag-filtro-ativo');
      });
      btn.classList.add('ag-filtro-ativo');
      filtroAtual = btn.dataset.agFiltro;
      paginaAtual = 1;
      renderizarLista();
    });
  });

  // ── Paginação ─────────────────────────────────────────────────────────
  if (btnPrev) btnPrev.addEventListener('click', function() {
    if (paginaAtual > 1) { paginaAtual--; renderizarLista(); }
  });
  if (btnNext) btnNext.addEventListener('click', function() {
    var filtrados = getFiltrados();
    var totalPgs = Math.ceil(filtrados.length / PG_SIZE) || 1;
    if (paginaAtual < totalPgs) { paginaAtual++; renderizarLista(); }
  });

  // ── Carregas lista ────────────────────────────────────────────────────
  function carregarEListar() {
    chrome.storage.local.get(STORAGE_AG, function(r) {
      listaCache = Array.isArray(r[STORAGE_AG]) ? r[STORAGE_AG] : [];
      paginaAtual = 1;
      renderizarLista();
    });
  }

  function getFiltrados() {
    if (filtroAtual === 'todos') return listaCache;
    return listaCache.filter(function(i) { return i.status === filtroAtual; });
  }

  function renderizarLista() {
    // Remover itens antigos
    agListaEl.querySelectorAll('.ag-item').forEach(function(el) { el.remove(); });

    var filtrados = getFiltrados();

    // Badge total aguardando
    var aguardando = listaCache.filter(function(i) { return i.status === 'aguardando'; }).length;
    if (agBadge) agBadge.textContent = aguardando > 0 ? aguardando + ' pendente' + (aguardando > 1 ? 's' : '') : listaCache.length + '';

    if (filtrados.length === 0) {
      agVazio.style.display = '';
      agPag.style.display = 'none';
      return;
    }
    agVazio.style.display = 'none';

    var totalPgs = Math.ceil(filtrados.length / PG_SIZE) || 1;
    if (paginaAtual > totalPgs) paginaAtual = totalPgs;
    var inicio = (paginaAtual - 1) * PG_SIZE;
    var fatia  = filtrados.slice(inicio, inicio + PG_SIZE);

    fatia.forEach(function(item) {
      var statusCls = item.status === 'feito' ? 'ag-status-feito' : item.status === 'vencido' ? 'ag-status-vencido' : 'ag-status-aguardando';
      var statusTxt = item.status === 'feito' ? '✅ Feito' : item.status === 'vencido' ? '⚠️ Vencido' : '⏳ Aguardando';
      var tipoTxt   = item.tipo === 1 ? '📲 Ao abrir' : '⏰ ' + item.data + (item.hora ? ' ' + item.hora : '');
      var acaoTxt   = item.acao === 'mover' ? 'Movimentar' : item.acao === 'comunicar' ? 'Comunicar' : 'Mover+Com.';
      var execInfo  = item.execAt ? ' · exec. ' + item.execAt : '';

      var div = document.createElement('div');
      div.className = 'ag-item';
      div.dataset.agId = item.id;
      div.innerHTML =
        '<div class="ag-item-header">' +
          '<span class="ag-item-alvo" title="' + escHtml(item.alvo||'') + '">' + escHtml(item.alvo || '—') + '</span>' +
          '<span class="ag-status ' + statusCls + '">' + statusTxt + '</span>' +
          (item.status === 'aguardando'
            ? '<button class="ag-item-cancel" data-ag-cancel="' + escHtml(item.id) + '" title="Cancelar agendamento">✕</button>'
            : '') +
        '</div>' +
        '<div class="ag-item-meta">' + acaoTxt + ' · ' + tipoTxt + execInfo + '</div>';
      agListaEl.appendChild(div);
    });

    // Paginação
    if (totalPgs > 1) {
      agPag.style.display = 'flex';
      agPgInfo.textContent = paginaAtual + ' / ' + totalPgs;
      if (btnPrev) btnPrev.disabled = paginaAtual <= 1;
      if (btnNext) btnNext.disabled = paginaAtual >= totalPgs;
    } else {
      agPag.style.display = 'none';
    }
  }

  // ── Cancelar agendamento ──────────────────────────────────────────────
  agListaEl.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-ag-cancel]');
    if (!btn) return;
    var id = btn.dataset.agCancel;
    if (!id) return;
    chrome.runtime.sendMessage({ type: 'PJM_CANCELAR_AGENDAMENTO', id: id }, function() {
      carregarEListar();
    });
  });

  // Atualiza se storage mudar (ex: executor disparou um item)
  chrome.storage.onChanged.addListener(function(changes) {
    if (changes[STORAGE_AG] && agBody.classList.contains('open')) {
      listaCache = changes[STORAGE_AG].newValue || [];
      renderizarLista();
      if (agBadge) {
        var ag = listaCache.filter(function(i) { return i.status === 'aguardando'; }).length;
        agBadge.textContent = ag > 0 ? ag + ' pendente' + (ag > 1 ? 's' : '') : listaCache.length + '';
      }
    }
  });

  // Carregar badge ao abrir popup mesmo sem abrir o accordion
  chrome.storage.local.get(STORAGE_AG, function(r) {
    var lista = Array.isArray(r[STORAGE_AG]) ? r[STORAGE_AG] : [];
    var ag = lista.filter(function(i) { return i.status === 'aguardando'; }).length;
    if (agBadge) agBadge.textContent = ag > 0 ? ag + ' pendente' + (ag > 1 ? 's' : '') : lista.length + '';
  });

})();

// ── Toggle de Automação ───────────────────────────────────────────────
// Estado salvo em chrome.storage.local sob a chave pjmAtivo (boolean).
// Default = true (ativo). Quando false:
//   - botão flutuante não aparece nas paginas do PJe
//   - auto-open ignora pedidos

(function initToggleAuto() {
  const sw = $('autoSwitch');
  const est = $('autoEstado');
  const desc = $('autoDesc');
  if (!sw || !est) return;

  function aplicar(ativo) {
    if (ativo) {
      sw.classList.add('on');
      sw.setAttribute('aria-checked', 'true');
      est.textContent = 'Ativa';
      est.classList.add('on');
      est.classList.remove('off');
      if (desc) desc.textContent = 'Quando ativa, o botão flutuante aparece nas páginas do PJe.';
    } else {
      sw.classList.remove('on');
      sw.setAttribute('aria-checked', 'false');
      est.textContent = 'Inativa';
      est.classList.add('off');
      est.classList.remove('on');
      if (desc) desc.textContent = 'Inativa: o botão flutuante some e a extensão não age automaticamente.';
    }
  }

  function alternar() {
    chrome.storage.local.get('pjmAtivo', function(r) {
      const atual = !r || r.pjmAtivo !== false;
      const novo = !atual;
      chrome.storage.local.set({ pjmAtivo: novo }, function() {
        aplicar(novo);
        try {
          chrome.tabs.query({ url: ['https://pje.tre-sp.jus.br/*', 'https://*.pje.jus.br/*', 'https://*.tse.jus.br/*'] }, function(tabs) {
            (tabs || []).forEach(function(t) {
              try { chrome.tabs.sendMessage(t.id, { type: 'PJM_AUTO_TOGGLE', ativo: novo }); } catch (_) { console.warn('[PJM popup]', _); }
            });
          });
        } catch (_) { console.warn('[PJM popup]', _); }
      });
    });
  }

  chrome.storage.local.get('pjmAtivo', function(r) {
    const ativo = !r || r.pjmAtivo !== false;
    aplicar(ativo);
  });

  sw.addEventListener('click', alternar);
  sw.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); alternar(); }
  });

})();

// Interruptor "Tabela nos autos" — persiste pjmTabelaAutos; o content script
// (content/tabela-autos.js) reage ao vivo via storage.onChanged (sem F5).
(function initToggleTabela() {
  const sw = $('tabSwitch');
  const est = $('tabEstado');
  if (!sw || !est) return;

  function aplicar(ativo) {
    sw.classList.toggle('on', ativo);
    sw.setAttribute('aria-checked', ativo ? 'true' : 'false');
    est.textContent = ativo ? 'Ativa' : 'Inativa';
    est.classList.toggle('on', ativo);
    est.classList.toggle('off', !ativo);
  }

  function alternar() {
    chrome.storage.local.get('pjmTabelaAutos', function(r) {
      const atual = !r || r.pjmTabelaAutos !== false;
      const novo = !atual;
      chrome.storage.local.set({ pjmTabelaAutos: novo }, function() { aplicar(novo); });
    });
  }

  chrome.storage.local.get('pjmTabelaAutos', function(r) {
    aplicar(!r || r.pjmTabelaAutos !== false);
  });

  sw.addEventListener('click', alternar);
  sw.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); alternar(); }
  });
})();


// ── Painel CoPPEx ─────────────────────────────────────────────────────
// Usa BANCO_MODELOS_COPPEX e DESCRICOES_COPPEX definidos em data-juntada.js.
// Grava faseAlvo e modeloAlvo no chrome.storage.local —
// as mesmas chaves que o content.js da extensão CoPPEx já lê.

(function initCoppex() {
  const elHeader   = $('coppexHeader');
  const elBody     = $('coppexBody');
  const elChevron  = $('coppexChevron');
  const elBadge    = $('coppexBadge');
  const elMateria  = $('selMateria');
  const elFase     = $('selFase');
  const elModelo   = $('selModelo');
  const elSalvar   = $('btnCoppexSalvar');
  const elLimpar   = $('btnCoppexLimpar');
  const elConfigAt = $('coppexConfigAtual');

  if (!elHeader || typeof BANCO_MODELOS_COPPEX === 'undefined') return;

  // ── Accordion ──────────────────────────────────────────────────────
  elHeader.addEventListener('click', () => {
    const aberto = elBody.classList.toggle('open');
    elChevron.classList.toggle('open', aberto);
  });

  // ── Popular Matéria ────────────────────────────────────────────────
  Object.keys(BANCO_MODELOS_COPPEX).forEach(materia => {
    const opt = document.createElement('option');
    opt.value = materia;
    opt.textContent = materia;
    elMateria.appendChild(opt);
  });

  // ── Cascata Matéria → Fase ─────────────────────────────────────────
  elMateria.addEventListener('change', () => {
    const materia = elMateria.value;
    elFase.innerHTML = '<option value="">— selecione a fase —</option>';
    elModelo.innerHTML = '<option value="">— nenhum fixo (usuário escolhe) —</option>';
    elFase.disabled   = !materia;
    elModelo.disabled = true;

    if (materia && BANCO_MODELOS_COPPEX[materia]) {
      Object.keys(BANCO_MODELOS_COPPEX[materia]).forEach(fase => {
        const opt = document.createElement('option');
        opt.value = fase;
        opt.textContent = fase;
        elFase.appendChild(opt);
      });
    }
  });

  // ── Cascata Fase → Modelo ──────────────────────────────────────────
  elFase.addEventListener('change', () => {
    const materia = elMateria.value;
    const fase    = elFase.value;
    elModelo.innerHTML = '<option value="">— nenhum fixo (usuário escolhe) —</option>';
    elModelo.disabled  = !fase;

    if (materia && fase && BANCO_MODELOS_COPPEX[materia]?.[fase]) {
      BANCO_MODELOS_COPPEX[materia][fase].forEach(modelo => {
        const opt = document.createElement('option');
        opt.value = modelo;
        opt.textContent = modelo;
        elModelo.appendChild(opt);
      });
    }
  });

  // ── Atualizar badge do cabeçalho ────────────────────────────────────
  function atualizarBadge(faseAlvo, modeloAlvo) {
    if (!faseAlvo) {
      elBadge.textContent = 'não configurada';
      elBadge.className   = 'coppex-badge-inativa';
      elConfigAt.style.display = 'none';
    } else {
      const label = modeloAlvo ? `${faseAlvo} · ${modeloAlvo.split(' - ').pop()}` : faseAlvo;
      elBadge.textContent = label;
      elBadge.className   = 'coppex-badge-ativa';
      const descModelo = modeloAlvo && DESCRICOES_COPPEX?.[modeloAlvo]
        ? ` — "${DESCRICOES_COPPEX[modeloAlvo]}"` : '';
      elConfigAt.textContent = modeloAlvo
        ? `Modelo fixo: ${modeloAlvo}${descModelo}`
        : `Fase configurada: ${faseAlvo} (modelo livre)`;
      elConfigAt.style.display = 'block';
    }
  }

  // ── Restaurar estado salvo ─────────────────────────────────────────
  chrome.storage.local.get(['faseAlvo', 'modeloAlvo'], ({ faseAlvo, modeloAlvo }) => {
    if (!faseAlvo) return;

    // Encontrar matéria correspondente à fase
    let materiaEncontrada = null;
    for (const [mat, fases] of Object.entries(BANCO_MODELOS_COPPEX)) {
      if (fases[faseAlvo]) { materiaEncontrada = mat; break; }
    }
    if (!materiaEncontrada) return;

    elMateria.value = materiaEncontrada;
    elMateria.dispatchEvent(new Event('change'));

    elFase.value = faseAlvo;
    elFase.dispatchEvent(new Event('change'));

    if (modeloAlvo) elModelo.value = modeloAlvo;

    atualizarBadge(faseAlvo, modeloAlvo || '');
  });

  // ── Salvar ─────────────────────────────────────────────────────────
  elSalvar.addEventListener('click', () => {
    const fase   = elFase.value;
    const modelo = elModelo.value;

    if (!fase) {
      elConfigAt.textContent  = '⚠️ Selecione ao menos a Fase antes de salvar.';
      elConfigAt.style.display = 'block';
      return;
    }

    chrome.storage.local.set({ faseAlvo: fase, modeloAlvo: modelo }, () => {
      atualizarBadge(fase, modelo);
      elSalvar.textContent = '✅ Salvo!';
      setTimeout(() => { elSalvar.innerHTML = '💾 Salvar configuração'; }, 1500);
    });
  });

  // ── Limpar ─────────────────────────────────────────────────────────
  elLimpar.addEventListener('click', () => {
    chrome.storage.local.remove(['faseAlvo', 'modeloAlvo'], () => {
      elMateria.value = '';
      elMateria.dispatchEvent(new Event('change'));
      atualizarBadge('', '');
    });
  });

})();

// ════════════════════════════════════════════════════════════════════════
// REGRAS DE ETIQUETA
// Formato de regra:
//   Simples : { id, etiqueta, tarefaDestino, ativo }
//   Pipeline: { id, etiqueta, ativo, pipeline: [{ transicao, proximaTarefa },...] }
// ════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  let editandoId     = null;  // id da regra Etiqueta em edição
  let editandoRemId  = null;  // id da regra Remover em edição
  let editandoPrepId = null;  // id da regra Prep em edição

  const STORAGE_KEY_REGRAS  = 'etiquetaRegras';
  const STORAGE_KEY_COMANDO = 'etiquetaComando';
  const STORAGE_KEY_REMOVER_REGRAS  = 'removerEtiquetaRegras';
  const STORAGE_KEY_REMOVER_COMANDO = 'etiquetaRemoverComando';

  const etqHeader     = $('etqHeader');
  const etqChevron    = $('etqChevron');
  const etqBody       = $('etqBody');
  const etqBadgeCount = $('etqBadgeCount');
  const etqRegraLista = $('etqRegraLista');
  const etqVazio      = $('etqVazio');
  const etqForm       = $('etqForm');
  const btnNovaRegra  = $('btnEtqNovaRegra');
  const btnConfirmar  = $('btnEtqConfirmar');
  const btnCancelar   = $('btnEtqCancelar');
  const btnExecutar   = $('btnEtqExecutar');
  const inputEtq           = $('etqInputEtiqueta');
  const inputTarefaInicial = $('etqInputTarefaInicial');
  const inputTarefaFinal   = $('etqInputTarefaFinal');
  const formSteps          = $('etqFormSteps');
  const btnAddStep    = $('btnEtqAddStep');

  // ── Collapse ──────────────────────────────────────────────────────────
  etqHeader.addEventListener('click', () => {
    const aberto = etqBody.classList.toggle('open');
    etqChevron.classList.toggle('open', aberto);
  });

  // ── Renderizar lista de regras ────────────────────────────────────────
  function renderizarRegras(regras) {
    [...etqRegraLista.querySelectorAll('.etq-regra-item')].forEach(el => el.remove());
    etqVazio.style.display = regras.length === 0 ? 'block' : 'none';
    etqBadgeCount.textContent = regras.length === 1 ? '1 regra' : `${regras.length} regras`;

    regras.forEach(regra => {
      const isPipeline = regra.pipeline && regra.pipeline.length > 0;
      const div = document.createElement('div');
      div.className = 'etq-regra-item' + (regra.ativo === false ? ' etq-regra-inativa' : '');
      div.dataset.id = regra.id;

      let conteudo = '';
      if (isPipeline) {
        // Exibir etapas do pipeline
        const passosHtml = regra.pipeline.map((p, i) =>
          `<div class="etq-passo">
            <span class="etq-passo-num">${i+1}</span>
            <span class="etq-passo-trans">${escHtml(p.transicao || '—')}${p.modo === 'individual' ? '<span style="background:#5d6d7e;color:#fff;border-radius:3px;padding:0 4px;font-size:9px;margin-left:4px">ind</span>' : ''}</span>
            ${p.proximaTarefa ? `<span class="etq-passo-prox">∷ ${escHtml(p.proximaTarefa)}</span>` : ''}
          </div>`
        ).join('');
        conteudo = `
          <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
            <span class="etq-regra-etq" title="${escHtml(regra.etiqueta)}">${escHtml(regra.etiqueta)}</span>
            <span class="etq-badge-pl">pipeline ${regra.pipeline.length} etapas</span>
          </div>
          <button class="etq-regra-toggle" data-action="edit" data-id="${escHtml(regra.id)}" title="Editar">✎</button>
          <button class="etq-regra-toggle" data-action="toggle" data-id="${escHtml(regra.id)}"
                  title="${regra.ativo===false?'Ativar':'Desativar'}">${regra.ativo===false?'▷':'⏸'}</button>
          <button class="etq-regra-del" data-action="del" data-id="${escHtml(regra.id)}" title="Excluir">✕</button>
          <div class="etq-pipeline-steps" style="width:100%">
            ${regra.tarefaInicial ? `<div style="font-size:11px;color:#8e44ad;margin-bottom:4px;padding-left:2px">📍 Início: <strong>${escHtml(regra.tarefaInicial)}</strong></div>` : ''}
            ${passosHtml}
            <div style="font-size:11px;color:#555;margin-top:4px;padding-left:2px">🏁 Fim: <strong>${escHtml(regra.tarefaFinal || 'Painel principal')}</strong></div>
          </div>`;
      } else {
        const dest = regra.tarefaDestino || '';
        conteudo = `
          <span class="etq-regra-etq" title="${escHtml(regra.etiqueta)}">${escHtml(regra.etiqueta)}</span>
          <span class="etq-regra-seta">→</span>
          <span class="etq-regra-dest" title="${escHtml(dest)}">${dest ? escHtml(dest) : '<em style="color:#aaa">sem destino</em>'}</span>
          <button class="etq-regra-toggle" data-action="edit" data-id="${escHtml(regra.id)}" title="Editar">✎</button>
          <button class="etq-regra-toggle" data-action="toggle" data-id="${escHtml(regra.id)}"
                  title="${regra.ativo===false?'Ativar':'Desativar'}">${regra.ativo===false?'▷':'⏸'}</button>
          <button class="etq-regra-del" data-action="del" data-id="${escHtml(regra.id)}" title="Excluir">✕</button>`;
      }

      // Pipeline rules need flex-wrap for the steps row
      if (isPipeline) div.style.flexWrap = 'wrap';
      div.innerHTML = conteudo;
      etqRegraLista.appendChild(div);
    });
  }

  // ── Storage ───────────────────────────────────────────────────────────
  function carregarRegras(cb) {
    chrome.storage.local.get(STORAGE_KEY_REGRAS, r => {
      cb(Array.isArray(r[STORAGE_KEY_REGRAS]) ? r[STORAGE_KEY_REGRAS] : []);
    });
  }
  function salvarRegras(regras, cb) {
    chrome.storage.local.set({ [STORAGE_KEY_REGRAS]: regras }, cb || (() => {}));
  }

  carregarRegras(regras => renderizarRegras(regras));

  // ── Delegação: toggle / excluir ───────────────────────────────────────
  etqRegraLista.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id   = btn.dataset.id;
    const acao = btn.dataset.action;
    carregarRegras(regras => {
      if (acao === 'edit') {
        const regra = regras.find(r => r.id === id);
        if (!regra) return;
        editandoId = id;
        etqForm.classList.add('open');
        btnNovaRegra.style.display = 'none';
        inputEtq.value = regra.etiqueta;
        if (inputTarefaInicial) inputTarefaInicial.value = regra.tarefaInicial || '';
        if (inputTarefaFinal)   inputTarefaFinal.value   = regra.tarefaFinal   || '';
        formSteps.innerHTML = '';
        const steps = (regra.pipeline && regra.pipeline.length > 0)
          ? regra.pipeline
          : [{ transicao: regra.tarefaDestino || '', modo: 'lote', proximaTarefa: '' }];
        steps.forEach(p => criarLinhaStep(p.transicao, p.modo || 'lote', p.proximaTarefa || ''));
        if (btnConfirmar) btnConfirmar.textContent = 'Atualizar regra';
        inputEtq.focus();
        return;
      }
      let novas;
      if (acao === 'del') {
        novas = regras.filter(r => r.id !== id);
      } else if (acao === 'toggle') {
        novas = regras.map(r => r.id === id ? { ...r, ativo: r.ativo === false } : r);
      } else return;
      salvarRegras(novas, () => renderizarRegras(novas));
    });
  });

  // ── Formulário de nova regra (com etapas de pipeline) ─────────────────
  function criarLinhaStep(trans, modo, prox) {
    const div = document.createElement('div');
    div.className = 'etq-form-step';
    div.innerHTML = `
      <input type="text" class="step-trans" placeholder="Transição (ex: Nada mais a cumprir)" value="${escHtml(trans||'')}">
      <select class="step-modo" title="Modo de execução">
        <option value="lote"${modo !== 'individual' ? ' selected' : ''}>🔷 Lote</option>
        <option value="individual"${modo === 'individual' ? ' selected' : ''}>🔹 Individual</option>
      </select>
      <input type="text" class="step-prox"  placeholder="Próxima tarefa (vazio na última)" value="${escHtml(prox||'')}">
      <button class="del-step" type="button" title="Remover etapa">✕</button>`;
    div.querySelector('.del-step').addEventListener('click', () => {
      div.remove();
      // Garantir ao menos uma etapa
      if (!formSteps.querySelector('.etq-form-step')) adicionarStep();
    });
    formSteps.appendChild(div);
  }

  function adicionarStep() { criarLinhaStep('', 'lote', ''); }

  btnAddStep.addEventListener('click', adicionarStep);

  btnNovaRegra.addEventListener('click', () => {
    etqForm.classList.add('open');
    btnNovaRegra.style.display = 'none';
    inputEtq.value = '';
    if (inputTarefaInicial) inputTarefaInicial.value = '';
    if (inputTarefaFinal)   inputTarefaFinal.value   = '';
    formSteps.innerHTML = '';
    adicionarStep(); // começa com 1 etapa vazia
    inputEtq.focus();
  });

  function fecharForm() {
    etqForm.classList.remove('open');
    btnNovaRegra.style.display = '';
    formSteps.innerHTML = '';
    if (inputTarefaInicial) inputTarefaInicial.value = '';
    if (inputTarefaFinal)   inputTarefaFinal.value   = '';
    editandoId = null;
    if (btnConfirmar) btnConfirmar.textContent = 'Confirmar';
  }

  $('btnEtqCancelar').addEventListener('click', fecharForm);

  $('btnEtqConfirmar').addEventListener('click', () => {
    const etq = inputEtq.value.trim();
    if (!etq) { inputEtq.focus(); return; }

    // Ler etapas do formulário
    const passos = [...formSteps.querySelectorAll('.etq-form-step')].map(row => ({
      transicao:    row.querySelector('.step-trans').value.trim(),
      modo:         row.querySelector('.step-modo')?.value || 'lote',
      proximaTarefa: row.querySelector('.step-prox').value.trim(),
    })).filter(p => p.transicao); // ignorar etapas sem transição

    if (passos.length === 0) {
      formSteps.querySelector('.step-trans')?.focus();
      return;
    }

    const tarefaInicial  = inputTarefaInicial ? inputTarefaInicial.value.trim() : '';
    const tarefaFinal    = inputTarefaFinal   ? inputTarefaFinal.value.trim()   : '';
    const isPipelineRule = !(passos.length === 1 && !passos[0].proximaTarefa && passos[0].modo !== 'individual');

    const novaRegra = {
      id:       Date.now().toString(36),
      etiqueta: etq,
      ativo:    true,
      // Pipeline com 1 etapa e sem próxima tarefa vira simples para compat
      ...(isPipelineRule
        ? { tarefaDestino: '', pipeline: passos, tarefaInicial: tarefaInicial, tarefaFinal: tarefaFinal }
        : { tarefaDestino: passos[0].transicao }),
    };

    carregarRegras(regras => {
      const novas = editandoId !== null
        ? regras.map(r => r.id !== editandoId ? r : {
            id: r.id, ativo: r.ativo, etiqueta: etq,
            ...(isPipelineRule
              ? { tarefaDestino: '', pipeline: passos, tarefaInicial: tarefaInicial, tarefaFinal: tarefaFinal }
              : { tarefaDestino: passos[0].transicao }),
          })
        : [...regras, novaRegra];
      salvarRegras(novas, () => { renderizarRegras(novas); fecharForm(); });
    });
  });

  inputEtq.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharForm();
  });

  // ── Executar regras (pipeline) ─────────────────────────────────────────
  btnExecutar.addEventListener('click', async () => {
    carregarRegras(async regras => {
      const ativas = regras.filter(r => r.ativo !== false);
      if (ativas.length === 0) {
        setStatus('⚠️ Nenhuma regra ativa. Cadastre e ative pelo menos uma regra.', 'warning');
        return;
      }

      btnExecutar.disabled = true;
      btnExecutar.innerHTML = '<span class="spinner"></span> Executando...';

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        setStatus('❌ Não foi possível acessar a aba atual.', 'error');
        btnExecutar.disabled = false;
        btnExecutar.innerHTML = '<span>▶</span> Executar regras nesta página';
        return;
      }

      chrome.storage.local.set({
        [STORAGE_KEY_COMANDO]: { regras: ativas, ts: Date.now() }
      }, () => {
        setStatus('✅ Comando enviado. Pipeline em execução no PJe.', 'success');
        btnExecutar.disabled = false;
        btnExecutar.innerHTML = '<span>▶</span> Executar regras nesta página';
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Seção "Remover Etiquetas" — standalone, independente das regras de pipeline
  // ══════════════════════════════════════════════════════════════════════
  {
    const remHeader    = $('remHeader');
    const remChevron   = $('remChevron');
    const remBody      = $('remBody');
    const remBadge     = $('remBadgeCount');
    const remLista     = $('remRegraLista');
    const remVazio     = $('remVazio');
    const remForm      = $('remForm');
    const btnRemNova   = $('btnRemNovaRegra');
    const btnRemOk     = $('btnRemConfirmar');
    const btnRemCan    = $('btnRemCancelar');
    const btnRemExec   = $('btnRemExecutar');
    const inpRemEtq    = $('remInputEtiqueta');
    const inpRemTarefa = $('remInputTarefa');

    // Collapse
    if (remHeader) {
      remHeader.addEventListener('click', () => {
        const aberto = remBody.classList.toggle('open');
        remChevron.classList.toggle('open', aberto);
      });
    }

    function carregarRemRegras(cb) {
      chrome.storage.local.get(STORAGE_KEY_REMOVER_REGRAS, r => {
        cb(Array.isArray(r[STORAGE_KEY_REMOVER_REGRAS]) ? r[STORAGE_KEY_REMOVER_REGRAS] : []);
      });
    }
    function salvarRemRegras(regras, cb) {
      chrome.storage.local.set({ [STORAGE_KEY_REMOVER_REGRAS]: regras }, cb || (() => {}));
    }

    function renderizarRemRegras(regras) {
      [...remLista.querySelectorAll('.rem-regra-item')].forEach(el => el.remove());
      remVazio.style.display = regras.length === 0 ? 'block' : 'none';
      remBadge.textContent = regras.length === 1 ? '1 regra' : `${regras.length} regras`;

      regras.forEach(regra => {
        const div = document.createElement('div');
        div.className = 'etq-regra-item rem-regra-item' + (regra.ativo === false ? ' etq-regra-inativa' : '');
        div.dataset.id = regra.id;
        div.innerHTML = `
          <span class="etq-regra-etq" title="${escHtml(regra.etiqueta)}">${escHtml(regra.etiqueta)}</span>
          <span class="etq-regra-seta">→</span>
          <span class="etq-regra-dest" title="${escHtml(regra.tarefa)}">${escHtml(regra.tarefa)}</span>
          <button class="etq-regra-toggle" data-action="edit" data-id="${escHtml(regra.id)}" title="Editar">✎</button>
          <button class="etq-regra-toggle" data-action="toggle" data-id="${escHtml(regra.id)}"
                  title="${regra.ativo===false?'Ativar':'Desativar'}">${regra.ativo===false?'▷':'⏸'}</button>
          <button class="etq-regra-del" data-action="del" data-id="${escHtml(regra.id)}" title="Excluir">✕</button>`;
        remLista.appendChild(div);
      });
    }

    carregarRemRegras(regras => renderizarRemRegras(regras));

    // Delegação: toggle / excluir
    if (remLista) {
      remLista.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id   = btn.dataset.id;
        const acao = btn.dataset.action;
        carregarRemRegras(regras => {
          if (acao === 'edit') {
            const regra = regras.find(r => r.id === id);
            if (!regra) return;
            editandoRemId = id;
            if (remForm)    remForm.classList.add('open');
            if (btnRemNova) btnRemNova.style.display = 'none';
            if (inpRemEtq)    inpRemEtq.value    = regra.etiqueta;
            if (inpRemTarefa) inpRemTarefa.value = regra.tarefa;
            if (btnRemOk) btnRemOk.textContent = 'Atualizar regra';
            if (inpRemEtq) inpRemEtq.focus();
            return;
          }
          let novas;
          if (acao === 'del') {
            novas = regras.filter(r => r.id !== id);
          } else if (acao === 'toggle') {
            novas = regras.map(r => r.id === id ? { ...r, ativo: r.ativo === false } : r);
          } else return;
          salvarRemRegras(novas, () => renderizarRemRegras(novas));
        });
      });
    }

    function fecharRemForm() {
      if (remForm)    remForm.classList.remove('open');
      if (btnRemNova) btnRemNova.style.display = '';
      if (inpRemEtq)    inpRemEtq.value    = '';
      if (inpRemTarefa) inpRemTarefa.value = '';
      editandoRemId = null;
      if (btnRemOk) btnRemOk.textContent = 'Adicionar';
    }

    if (btnRemNova) {
      btnRemNova.addEventListener('click', () => {
        remForm.classList.add('open');
        btnRemNova.style.display = 'none';
        if (inpRemEtq) inpRemEtq.focus();
      });
    }
    if (btnRemCan) btnRemCan.addEventListener('click', fecharRemForm);

    if (btnRemOk) {
      btnRemOk.addEventListener('click', () => {
        const etq    = inpRemEtq    ? inpRemEtq.value.trim()    : '';
        const tarefa = inpRemTarefa ? inpRemTarefa.value.trim() : '';
        if (!etq)    { if (inpRemEtq)    inpRemEtq.focus();    return; }
        if (!tarefa) { if (inpRemTarefa) inpRemTarefa.focus(); return; }

        carregarRemRegras(regras => {
          const novas = editandoRemId !== null
            ? regras.map(r => r.id !== editandoRemId ? r : { id: r.id, ativo: r.ativo, etiqueta: etq, tarefa: tarefa })
            : [...regras, { id: Date.now().toString(36), etiqueta: etq, tarefa: tarefa, ativo: true }];
          salvarRemRegras(novas, () => { renderizarRemRegras(novas); fecharRemForm(); });
        });
      });
    }

    [inpRemEtq, inpRemTarefa].forEach(inp => {
      if (!inp) return;
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { if (btnRemOk) btnRemOk.click(); }
        if (e.key === 'Escape') fecharRemForm();
      });
    });

    if (btnRemExec) {
      btnRemExec.addEventListener('click', () => {
        carregarRemRegras(regras => {
          const ativas = regras.filter(r => r.ativo !== false);
          if (ativas.length === 0) {
            setStatus('⚠️ Nenhuma regra de remoção ativa.', 'warning');
            return;
          }
          btnRemExec.disabled = true;
          btnRemExec.innerHTML = '<span class="spinner"></span> Executando...';
          chrome.storage.local.set({
            [STORAGE_KEY_REMOVER_COMANDO]: { regras: ativas, ts: Date.now() }
          }, () => {
            setStatus('✅ Comando de remoção enviado. Em execução no PJe.', 'success');
            btnRemExec.disabled = false;
            btnRemExec.innerHTML = '<span>▶</span> Executar remoções';
          });
        });
      });
    }
  }

  // ── Preparar Comunicação (standalone) ───────────────────────────────────
  {
    const STORAGE_KEY_PREP_REGRAS  = 'prepComunicacaoRegras';
    const STORAGE_KEY_PREP_ACIONAR = 'prepComunicacaoAcionar';

    const secPrep    = $('prepSection');
    const headerPrep = $('prepHeader');
    const bodyPrep   = $('prepBody');
    const chevronPrep = $('prepChevron');
    const badgePrep  = $('prepBadgeCount');

    const btnPrepNova = $('btnPrepNovaRegra');
    const btnPrepOk   = $('btnPrepConfirmar');
    const btnPrepCan  = $('btnPrepCancelar');
    const btnPrepExec = $('btnPrepExecutar');
    const formPrep    = $('prepForm');
    const listaPrep   = $('prepRegraLista');
    const vazioPrep   = $('prepVazio');
    const radioDP     = $('prepRadioDP');
    const radioDN     = $('prepRadioDN');
    const wrapTipoDoc = $('prepWrapTipoDoc');
    const wrapModelo  = $('prepWrapModelo');

    // Toggle visibilidade instrumento
    function atualizarCamposInstrumento() {
      const isDP = radioDP && radioDP.checked;
      if (wrapTipoDoc) wrapTipoDoc.style.display = isDP ? '' : 'none';
      if (wrapModelo)  wrapModelo.style.display  = isDP ? 'none' : '';
    }
    if (radioDP) radioDP.addEventListener('change', atualizarCamposInstrumento);
    if (radioDN) radioDN.addEventListener('change', atualizarCamposInstrumento);

    // Colapso
    if (headerPrep && bodyPrep) {
      bodyPrep.style.display = 'none';
      if (chevronPrep) chevronPrep.textContent = '▶';
      headerPrep.addEventListener('click', () => {
        const aberto = bodyPrep.style.display !== 'none';
        bodyPrep.style.display = aberto ? 'none' : '';
        if (chevronPrep) chevronPrep.textContent = aberto ? '▶' : '▼';
      });
    }
    if (formPrep) formPrep.style.display = 'none';

    function carregarPrepRegras(cb) {
      chrome.storage.local.get(STORAGE_KEY_PREP_REGRAS, r => {
        cb(Array.isArray(r[STORAGE_KEY_PREP_REGRAS]) ? r[STORAGE_KEY_PREP_REGRAS] : []);
      });
    }

    function salvarPrepRegras(regras, cb) {
      chrome.storage.local.set({ [STORAGE_KEY_PREP_REGRAS]: regras }, cb || (() => {}));
    }

    function renderizarPrepRegras(regras) {
      if (!listaPrep) return;
      if (badgePrep) badgePrep.textContent = regras.length + ' regra' + (regras.length !== 1 ? 's' : '');
      if (vazioPrep) vazioPrep.style.display = regras.length === 0 ? '' : 'none';

      const existentes = listaPrep.querySelectorAll('.etq-regra-item');
      existentes.forEach(el => el.remove());

      regras.forEach(r => {
        const dest = [r.poloAtivo && 'P.Ativo', r.poloPassivo && 'P.Passivo', r.terceiros && 'Terceiros']
                     .filter(Boolean).join(', ') || '—';
        const instrLabel = r.instrumento === 'DP'
          ? 'Doc.' + (r.tipoDocumento || 'Processo')
          : 'Modelo:' + (r.modeloDocumento || '—');
        const div = document.createElement('div');
        div.className = 'etq-regra-item' + (r.ativo === false ? ' inativa' : '');
        div.dataset.prepId = r.id;
        div.innerHTML =
          '<span class="etq-regra-etq" title="' + esc(r.etiqueta) + '">' + esc(r.etiqueta) + '</span>' +
          '<span class="etq-regra-seta">→</span>' +
          '<span class="etq-regra-dest" title="' + esc(dest + ' | ' + r.comunicacao + ' | ' + instrLabel) + '">' + esc(dest) + '</span>' +
          '<button class="etq-ibtn" data-prep-action="edit"   data-prep-id="' + esc(r.id) + '" title="Editar">✎</button>' +
          '<button class="etq-ibtn" data-prep-action="toggle" data-prep-id="' + esc(r.id) + '">' + (r.ativo === false ? '▷' : '⏸') + '</button>' +
          '<button class="etq-ibtn del" data-prep-action="del" data-prep-id="' + esc(r.id) + '">✕</button>';
        listaPrep.appendChild(div);
      });

      if (btnPrepExec) btnPrepExec.disabled = !regras.some(r => r.ativo !== false);
    }

    function fecharPrepForm() {
      if (formPrep) formPrep.style.display = 'none';
      if (btnPrepNova) btnPrepNova.style.display = '';
      editandoPrepId = null;
      if (btnPrepOk) btnPrepOk.textContent = 'Adicionar';
    }

    carregarPrepRegras(renderizarPrepRegras);

    // Abrir formulário
    if (btnPrepNova) {
      btnPrepNova.addEventListener('click', () => {
        formPrep.style.display = '';
        btnPrepNova.style.display = 'none';
        const inp = $('prepInputEtiqueta');
        if (inp) inp.focus();
      });
    }

    // Cancelar
    if (btnPrepCan) btnPrepCan.addEventListener('click', fecharPrepForm);

    // Salvar
    if (btnPrepOk) {
      btnPrepOk.addEventListener('click', () => {
        const etq    = ($('prepInputEtiqueta') ? $('prepInputEtiqueta').value : '').trim();
        const tarefa = ($('prepInputTarefa')   ? $('prepInputTarefa').value   : '').trim() || 'Preparar comunicação';
        if (!etq) { const i = $('prepInputEtiqueta'); if (i) i.focus(); return; }

        const instrumento = ($('prepRadioDN') && $('prepRadioDN').checked) ? 'DN' : 'DP';
        const nova = {
          id:              Date.now().toString(36),
          etiqueta:        etq,
          tarefa:          tarefa,
          poloAtivo:       !!($('prepChkAtivo')     && $('prepChkAtivo').checked),
          poloPassivo:     !!($('prepChkPassivo')    && $('prepChkPassivo').checked),
          terceiros:       !!($('prepChkTerc')       && $('prepChkTerc').checked),
          comunicacao:     $('prepSelComun')         ? $('prepSelComun').value         : 'Intimação',
          meio:            $('prepSelMeio')          ? $('prepSelMeio').value          : 'Diário Eletrônico',
          tipoPrazo:       $('prepSelTipoPrazo')     ? $('prepSelTipoPrazo').value     : 'dias',
          prazo:           $('prepInputPrazo')       ? $('prepInputPrazo').value       : '3',
          instrumento:     instrumento,
          tipoDocumento:   ($('prepInputTipoDoc')    ? $('prepInputTipoDoc').value     : '').trim(),
          modeloDocumento: ($('prepInputModelo')     ? $('prepInputModelo').value      : '').trim(),
          ativo:           true
        };
        if (!nova.poloAtivo && !nova.poloPassivo && !nova.terceiros) nova.poloAtivo = true;

        carregarPrepRegras(regras => {
          const novas = editandoPrepId !== null
            ? regras.map(r => r.id !== editandoPrepId ? r : { ...nova, id: r.id, ativo: r.ativo })
            : regras.concat([nova]);
          salvarPrepRegras(novas, () => {
            fecharPrepForm();
            carregarPrepRegras(renderizarPrepRegras);
          });
        });
      });
    }

    // Toggle / excluir na lista
    if (listaPrep) {
      listaPrep.addEventListener('click', e => {
        const btn = e.target.closest('[data-prep-action]');
        if (!btn) return;
        const id   = btn.dataset.prepId;
        const acao = btn.dataset.prepAction;
        if (acao === 'edit') {
          carregarPrepRegras(regras => {
            const regra = regras.find(r => r.id === id);
            if (!regra) return;
            editandoPrepId = id;
            formPrep.style.display = '';
            if (btnPrepNova) btnPrepNova.style.display = 'none';
            const set = (elId, val) => { const el = $(elId); if (el) el.value = val || ''; };
            const chk = (elId, val) => { const el = $(elId); if (el) el.checked = !!val; };
            set('prepInputEtiqueta', regra.etiqueta);
            set('prepInputTarefa',   regra.tarefa);
            chk('prepChkAtivo',    regra.poloAtivo);
            chk('prepChkPassivo',  regra.poloPassivo);
            chk('prepChkTerc',     regra.terceiros);
            set('prepSelComun',    regra.comunicacao);
            set('prepSelMeio',     regra.meio);
            set('prepSelTipoPrazo', regra.tipoPrazo);
            set('prepInputPrazo',  regra.prazo);
            const isDP = regra.instrumento !== 'DN';
            if (radioDP) radioDP.checked = isDP;
            if (radioDN) radioDN.checked = !isDP;
            set('prepInputTipoDoc', regra.tipoDocumento);
            set('prepInputModelo',  regra.modeloDocumento);
            atualizarCamposInstrumento();
            if (btnPrepOk) btnPrepOk.textContent = 'Atualizar regra';
            const inp = $('prepInputEtiqueta');
            if (inp) inp.focus();
          });
          return;
        }
        carregarPrepRegras(regras => {
          let novas;
          if (acao === 'del') {
            novas = regras.filter(r => r.id !== id);
          } else if (acao === 'toggle') {
            novas = regras.map(r => r.id === id ? { ...r, ativo: r.ativo === false } : r);
          } else return;
          salvarPrepRegras(novas, () => carregarPrepRegras(renderizarPrepRegras));
        });
      });
    }

    // Executar
    if (btnPrepExec) {
      btnPrepExec.addEventListener('click', () => {
        carregarPrepRegras(regras => {
          const ativas = regras.filter(r => r.ativo !== false);
          if (ativas.length === 0) {
            setStatus('Nenhuma regra de comunicação ativa.', 'warning');
            return;
          }
          btnPrepExec.disabled = true;
          btnPrepExec.innerHTML = '<span class="spinner"></span> Executando...';
          chrome.storage.local.set({
            [STORAGE_KEY_PREP_ACIONAR]: { regras: ativas, ts: Date.now() }
          }, () => {
            setStatus('✅ Comando de comunicação enviado. Em execução no PJe.', 'success');
            btnPrepExec.disabled = false;
            btnPrepExec.innerHTML = '<span>▶</span> Executar comunicações';
          });
        });
      });
    }
  }

})();
