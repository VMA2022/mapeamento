
function pjmExtrairNoFrame() {
  const T = function(el) { return el ? (el.textContent||'').trim().replace(/\s+/g,' ') : ''; };
  const D = function(s) { try { return decodeURIComponent(s); } catch(_) { return s; } };
  const N = function(s) { const m=(s||'').match(/\d{7}-\d{2}\.\d{4}\.\d{1,2}\.\d{2}\.\d{4}/); return m?m[0]:''; };

  const CATS = [
    ['determinacao', ['analisar determinacao','analisar determinação']],
    ['documentos', ['elaborar documentos','desentranhar','digitalizar']],
    ['publicacao', ['publicar processos','verificar decisao','verificar decisão']],
    ['comunicacao', ['preparar comunicacao','preparar comunicação','analisar resposta','carta de ordem','oficio','ofício','intimacao','intimação','informacao de ar','informação de ar','cumprimento de ar']],
    ['prazo', ['prazo em curso','transito em julgado','trânsito em julgado','informar data']],
    ['remessa', ['expedir processo','processos expedidos','processos remetidos']],
    ['recursal', ['recurso interno','registrar recurso','julgamento do recurso']],
    ['suspensao', ['suspensos','sobrestados']],
    ['arquivo', ['arquivamento provisorio','arquivamento provisório','arquivados provisoriamente']],
    ['peticao', ['peticao avulsa','petição avulsa','analisar processos']],
    ['pendencias', ['aguardando providencias','aguardando providências','verificar pendencias','verificar pendências']],
    ['assinatura', ['assinatura','assinar']],
  ];
  function cat(nome) {
    const s = (nome||'').toLowerCase();
    for (var i=0; i<CATS.length; i++) {
      if (CATS[i][1].some(function(t){return s.includes(t);})) return CATS[i][0];
    }
    return 'outras';
  }

  const hash = location.hash || '';
  const emLista = hash.indexOf('lista-minhas-tarefas')>=0 ||
                  hash.indexOf('lista-processos-tarefa')>=0 ||
                  hash.indexOf('lista-tarefa')>=0 ||
                  hash.indexOf('lista-processos-assinatura')>=0;

  if (emLista) {
    var partes = D(hash).split('/');
    var nomeTarefa = 'Tarefa';
    for (var k=0; k<partes.length; k++) {
      var prev = partes[k-1] || '';
      if (prev.indexOf('lista-') === 0) { nomeTarefa = partes[k]; break; }
    }
    const procs = [];
    const vistos = new Set();
    document.querySelectorAll('span.tarefa-numero-processo').forEach(function(elNum) {
      const numCNJ = N(T(elNum));
      if (!numCNJ || vistos.has(numCNJ)) return;
      vistos.add(numCNJ);
      const spanHidden = elNum.querySelector('span.hidden, span[id]');
      const idInterno = spanHidden ? (spanHidden.id || T(spanHidden)).trim() : '';
      const container = elNum.closest('div.col-sm-11') || elNum.closest('div[class*="col-sm-11"]') || elNum.closest('div.datalist-content') || elNum.parentElement;
      const etiquetas = [];
      if (container) {
        container.querySelectorAll('div.label.label-info.label-etiqueta').forEach(function(div) {
          const spans = div.querySelectorAll('span');
          for (var s=0; s<spans.length; s++) {
            const cls = spans[s].className || '';
            if (cls.indexOf('fa ')<0 && cls.indexOf('fa-')!==0 && cls.indexOf('glyphicon')<0) {
              const nome = T(spans[s]);
              if (nome && nome.length>1 && nome.indexOf('Excluir')<0 && nome.indexOf('Desvincular')<0 && nome.indexOf('Remover')<0) {
                etiquetas.push(nome); break;
              }
            }
          }
        });
      }
      const fase = T(container && container.querySelector('.fase, span.orgao, span.local'));
      const subfase = T(container && container.querySelector('.subfase, [class*="subfase"]'));
      procs.push({
        numero: numCNJ, idInterno: idInterno, fase: fase || '', subfase: subfase || '',
        etiquetas: Array.from(new Set(etiquetas)),
        categoria: fase ? cat(fase+' '+subfase+' '+nomeTarefa) : cat(nomeTarefa),
        origem: 'DOM datalist',
      });
    });
    const porCategoria = {}, porEtiqueta = {};
    var comEtiqueta = 0;
    procs.forEach(function(p) {
      porCategoria[p.categoria] = (porCategoria[p.categoria]||0)+1;
      if ((p.etiquetas||[]).length) {
        comEtiqueta++;
        p.etiquetas.forEach(function(e){ porEtiqueta[e] = (porEtiqueta[e]||0)+1; });
      }
    });
    return {
      fonte: 'Lista de processos (tela atual)',
      timestamp: new Date().toISOString(),
      tarefas: [{ id:1, nome:nomeTarefa, quantidade:procs.length, processos:procs, categoria:cat(nomeTarefa) }],
      resumo: {
        totalTarefas:1, totalProcessos:procs.length,
        comEtiqueta: comEtiqueta, semEtiqueta: procs.length-comEtiqueta,
        porCategoria: porCategoria, porEtiqueta: porEtiqueta, porTarefa: { [nomeTarefa]: procs.length },
      },
    };
  }

  // Dashboard - varre TODOS os links com "lista" no href e classifica
  const tarefas = [];
  const hrefsVistos = new Set();

  function classificarLink(href, anchor) {
    if (href.indexOf('lista-minhas-tarefas') >= 0) return 'minhas';
    if (href.indexOf('lista-processos-assinatura') >= 0) return 'assinaturas';
    if (href.indexOf('lista-processos-tarefa') >= 0) return 'gerais';
    if (href.indexOf('lista-tarefa') >= 0) return 'gerais';
    if (href.indexOf('lista-processos-orgao') >= 0) return 'gerais';
    // Heuristica: olhar texto do container ancestral
    var pai = anchor && anchor.closest('div[id*="Tarefa"], div[id*="tarefa"], [class*="card"], [class*="painel"]');
    if (pai) {
      var titulo = (pai.textContent || '').toLowerCase().slice(0, 300);
      if (titulo.indexOf('minhas tarefas') >= 0) return 'minhas';
      if (titulo.indexOf('assinatura') >= 0) return 'assinaturas';
      if (titulo.indexOf('tarefas gerais') >= 0 || titulo.indexOf('tarefas do') >= 0) return 'gerais';
    }
    return 'gerais'; // fallback
  }

  document.querySelectorAll('a[href*="lista"]').forEach(function(a) {
    const href = a.getAttribute('href') || '';
    if (!href || hrefsVistos.has(href)) return;
    const div = a.querySelector('div.detalheTarefasQuantidade');
    if (!div) return;
    hrefsVistos.add(href);
    const nome = T(div.querySelector('span.nome')) || T(a);
    const qtd = parseInt(T(div.querySelector('span.quantidadeTarefa')), 10) || 0;
    tarefas.push({
      id: tarefas.length+1, nome: nome, quantidade: qtd, href: href,
      tipoCard: classificarLink(href, a),
      categoria: cat(nome), processos: [],
    });
  });

  const porCategoria = {};
  tarefas.forEach(function(t){ porCategoria[t.categoria] = (porCategoria[t.categoria]||0)+t.quantidade; });

  return {
    fonte: 'Dashboard', timestamp: new Date().toISOString(), tarefas: tarefas,
    resumo: {
      totalTarefas: tarefas.length,
      totalProcessos: tarefas.reduce(function(a,t){return a+t.quantidade;},0),
      comEtiqueta:0, semEtiqueta:0,
      porCategoria: porCategoria, porEtiqueta:{},
      porTarefa: Object.fromEntries(tarefas.map(function(t){return [t.nome, t.quantidade];})),
    },
  };
}

function pjmAguardarLista(maxMs) {
  return new Promise(function(resolve) {
    const inicio = Date.now();
    function tick() {
      const nums = document.querySelectorAll('span.tarefa-numero-processo').length;
      const spinner = document.querySelector('.loading, .spinner');
      if (nums>0 && !spinner) return resolve({ ready:true, qtdNumeros:nums });
      if (Date.now()-inicio > maxMs) return resolve({ ready:false, qtdNumeros:nums });
      setTimeout(tick, 250);
    }
    tick();
  });
}

function pjmProximaPagina() {
  // PJe TRE-SP usa PrimeNG <p-paginator>. Botoes principais:
  //   .ui-paginator-first / .ui-paginator-prev / .ui-paginator-next / .ui-paginator-last
  //   .ui-paginator-page (ativa tem .ui-state-active)
  // Desabilitado: classe .ui-state-disabled
  const sels = [
    'a.ui-paginator-next:not(.ui-state-disabled)',
    '.ui-paginator-next:not(.ui-state-disabled)',
    // Fallback: outros frameworks
    'a[title="Próxima página"]',
    'a[title="Proxima pagina"]',
    'li:not(.disabled) a[aria-label="Next"]',
    '.pagination .next:not(.disabled) a',
  ];
  for (var i=0; i<sels.length; i++) {
    const el = document.querySelector(sels[i]);
    if (el && !el.classList.contains('ui-state-disabled') &&
        !el.closest('.disabled, [aria-disabled="true"]')) {
      el.click();
      return { clicou: true, seletor: sels[i] };
    }
  }
  return { clicou: false };
}

// Volta para a primeira pagina (importante antes de iniciar nova tarefa,
// pois o paginador PrimeNG mantem estado entre navegacoes).
function pjmIrParaPrimeiraPagina() {
  // Procura botao "primeira" do PrimeNG
  var first = document.querySelector('a.ui-paginator-first');
  if (first && !first.classList.contains('ui-state-disabled')) {
    first.click();
    return { clicou: true, motivo: 'ui-paginator-first' };
  }
  // Fallback: procura pagina "1" ativa ou inativa
  var pag1 = Array.from(document.querySelectorAll('a.ui-paginator-page'))
    .find(function(a) { return (a.textContent || '').trim() === '1'; });
  if (pag1 && !pag1.classList.contains('ui-state-active')) {
    pag1.click();
    return { clicou: true, motivo: 'page 1' };
  }
  // Ja esta na primeira pagina (ou nao tem paginador)
  return { clicou: false, motivo: 'sem paginador ou ja na 1a' };
}

function pjmDetectarLogin() {
  return {
    isLogin: document.querySelectorAll('input[type="password"]').length>0 || /\/login|\/auth/i.test(location.href),
    url: location.href,
  };
}

function pjmDiagnosticarDom() {
  return {
    url: location.href, hash: location.hash,
    temPainel: !!document.querySelector('.painel-usuario-interno-dashboard, div#divTarefasPendentes'),
    temNumProc: document.querySelectorAll('span.tarefa-numero-processo').length,
    temAlgumProc: document.querySelectorAll('[class*="processo"]').length,
    temLinks: document.querySelectorAll('a[href*="lista-minhas-tarefas"]').length,
    bodyChars: document.body ? document.body.innerText.length : 0,
  };
}

function pjmNavegarHash(novoHash) {
  window.location.hash = '#/__pjm_reset__';
  setTimeout(function() {
    window.location.hash = novoHash;
    try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (_) { console.warn('[PJM background]', _); }
    try { window.dispatchEvent(new Event('popstate')); } catch (_) { console.warn('[PJM background]', _); }
  }, 150);
}

function sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

function aguardarTabReady(tabId, maxMs) {
  if (!maxMs) maxMs = 30000;
  return new Promise(function(resolve, reject) {
    const t0 = Date.now();
    function check() {
      chrome.tabs.get(tabId).then(function(tab) {
        if (tab.status === 'complete') return resolve(tab);
        if (Date.now()-t0 > maxMs) return reject(new Error('Timeout aguardando aba'));
        setTimeout(check, 300);
      }).catch(reject);
    }
    check();
  });
}

function emitirProgresso(tabId, payload) {
  try { chrome.tabs.sendMessage(tabId, Object.assign({ type:'PJM_PROGRESSO' }, payload)); } catch (_) { console.warn('[PJM background]', _); }
}

async function extrairMelhorFrame(tabId) {
  let results = [];
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true }, func: pjmExtrairNoFrame, world: 'MAIN',
    });
  } catch (e) {
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true }, func: pjmExtrairNoFrame,
      });
    } catch (_) { console.warn('[PJM background]', _); }
  }
  let melhor = null;
  (results || []).forEach(function(r) {
    const t = r.result && r.result.tarefas;
    if (t && t.length) {
      const procs = t[0] && t[0].processos ? t[0].processos.length : 0;
      const score = procs * 1000 + t.length;
      if (!melhor || score > melhor.score) {
        melhor = { result: r.result, frameId: r.frameId, score: score };
      }
    }
  });
  return melhor || { result: null, frameId: 0, score: 0 };
}

const CFG_DEF = {
  cards: { minhas:true, gerais:false, assinaturas:false },
  paginacao: true, maxPaginas: 50, timeoutLista: 12000, delayEntreTarefas: 400,
};

let coletaAtual = null;

async function coletarAutomatico(origemTabId, cfgUser) {
  if (coletaAtual) throw new Error('Ja existe uma coleta em andamento.');
  const cfg = Object.assign({}, CFG_DEF, cfgUser, {
    cards: Object.assign({}, CFG_DEF.cards, (cfgUser && cfgUser.cards) || {}),
  });

  emitirProgresso(origemTabId, { fase:'pre-aba', msg:'Verificando aba de origem...' });
  const origem = await chrome.tabs.get(origemTabId);
  if (!origem || !origem.url || !/pje|tse/i.test(origem.url)) {
    throw new Error('A aba ativa nao esta no PJe.');
  }

  const baseUrl = origem.url.replace(/#.*$/, '');
  const dashboardUrl = baseUrl + '#/painel-usuario-interno';

  emitirProgresso(origemTabId, { fase:'abrir-aba', msg:'Abrindo aba auxiliar em ' + dashboardUrl.slice(-60) });
  const tabSec = await chrome.tabs.create({ url: dashboardUrl, active: true, windowId: origem.windowId });
  coletaAtual = { cancelado: false, tabSecundariaId: tabSec.id, origemTabId: origemTabId };

  async function finalizar() {
    try { await chrome.tabs.remove(tabSec.id); } catch (_) { console.warn('[PJM background]', _); }
    try { await chrome.tabs.update(origemTabId, { active: true }); } catch (_) { console.warn('[PJM background]', _); }
    coletaAtual = null;
  }

  try {
    await aguardarTabReady(tabSec.id);
    if (coletaAtual && coletaAtual.cancelado) throw new Error('Cancelado pelo usuario');
    // R-1: settle mínimo para o Angular iniciar; o loop de estabilização do dashboard (abaixo) é quem espera por condição.
    await sleep(1000);

    try {
      const li = await chrome.scripting.executeScript({ target: { tabId: tabSec.id }, func: pjmDetectarLogin });
      if (li[0] && li[0].result && li[0].result.isLogin) {
        throw new Error('Aba auxiliar caiu no login. Faca login na aba original primeiro.');
      }
    } catch(e) {
      if (e.message && e.message.indexOf('login')>=0) throw e;
    }

    emitirProgresso(origemTabId, { fase:'dashboard', msg:'Identificando tarefas (aguardando Angular)...' });

    // Aguarda dashboard ESTABILIZAR (mesmo numero de tarefas em 2 leituras consecutivas)
    // para evitar pegar dashboard parcial enquanto Angular ainda renderiza os 3 cards.
    let dashboard = null;
    let frameAngularId = 0;
    let tentativas = 0;
    let ultimaContagem = -1;
    let leiturasEstaveis = 0;
    const MIN_LEITURAS_ESTAVEIS = 2;
    const MAX_TENTATIVAS_DASH = 45;

    while (tentativas < MAX_TENTATIVAS_DASH) {
      if (coletaAtual && coletaAtual.cancelado) throw new Error('Cancelado pelo usuario');
      const best = await extrairMelhorFrame(tabSec.id);
      const numTarefas = (best.result && best.result.tarefas && best.result.tarefas.length) || 0;

      if (numTarefas > 0) {
        if (numTarefas === ultimaContagem) {
          leiturasEstaveis++;
          if (leiturasEstaveis >= MIN_LEITURAS_ESTAVEIS) {
            dashboard = best.result;
            frameAngularId = best.frameId;
            emitirProgresso(origemTabId, { fase:'dashboard-ok',
              msg:'Dashboard estavel: ' + numTarefas + ' tarefa(s) (frame ' + best.frameId + ', ' + (tentativas+1) + ' leituras)' });
            break;
          }
        } else {
          leiturasEstaveis = 0;
          ultimaContagem = numTarefas;
        }
        if (tentativas % 3 === 0) {
          emitirProgresso(origemTabId, { fase:'dashboard',
            msg:'Aguardando dashboard estabilizar: ' + numTarefas + ' tarefa(s) (leitura ' + (tentativas+1) + '/' + MAX_TENTATIVAS_DASH + ')' });
        }
      } else if (tentativas > 0 && tentativas % 5 === 0) {
        emitirProgresso(origemTabId, { fase:'dashboard', msg:'Tentativa ' + (tentativas+1) + '/' + MAX_TENTATIVAS_DASH + '...' });
      }
      await sleep(700);
      tentativas++;
    }
    if (!dashboard) throw new Error('Nao foi possivel ler o dashboard apos ' + MAX_TENTATIVAS_DASH + ' tentativas.');

    const contagemPorTipo = { minhas: 0, gerais: 0, assinaturas: 0 };
    dashboard.tarefas.forEach(function(t) {
      if (contagemPorTipo[t.tipoCard] !== undefined) contagemPorTipo[t.tipoCard]++;
    });
    emitirProgresso(origemTabId, { fase:'filtro', msg:
      'Cards detectados: Minhas=' + contagemPorTipo.minhas +
      ' Gerais=' + contagemPorTipo.gerais +
      ' Assinaturas=' + contagemPorTipo.assinaturas +
      ' | Marcados: ' + (cfg.cards.minhas?'M':'-') + (cfg.cards.gerais?'G':'-') + (cfg.cards.assinaturas?'A':'-') });

    // Blocklist de tarefas muito grandes (>500 procs) que devem ser PULADAS
    // por padrao. O usuario pode adicionar mais via cfg.bloquear (array de strings).
    const BLOCKLIST_PADRAO = [
      'manter processos expedidos',
      'processos remetidos a zona',
      'processos remetidos à zona',
    ];
    // Separar exclusoes:
    // - BLOCKLIST_PADRAO: usa substring (genericos)
    // - cfg.bloquear (do modal): usa formato "nome|tipoCard" (chave composta)
    //   para distinguir tarefa de mesmo nome em cards diferentes
    const blocklistSubstring = BLOCKLIST_PADRAO; // ja em lowercase
    const blocklistExata = new Set((cfg.bloquear || []).map(function(s){
      return String(s).trim().toLowerCase();
    }));
    console.log('[PJM] Blocklist exata recebida:', Array.from(blocklistExata));

    function deveBloquear(tarefa) {
      var nome = String(tarefa.nome || '').trim().toLowerCase();
      var tipo = String(tarefa.tipoCard || '').trim().toLowerCase();
      // 1) match exato pelo nome+tipo (vindo do modal)
      if (blocklistExata.has(nome + '|' + tipo)) return true;
      // 2) match exato só pelo nome (compatibilidade retroativa)
      if (blocklistExata.has(nome)) return true;
      // 3) substring (vindo da blocklist padrao generica)
      return blocklistSubstring.some(function(termo){ return nome.indexOf(termo) >= 0; });
    }

    const tarefasFiltradasPorCard = dashboard.tarefas.filter(function(t) {
      if (t.tipoCard==='minhas') return cfg.cards.minhas;
      if (t.tipoCard==='gerais') return cfg.cards.gerais;
      if (t.tipoCard==='assinaturas') return cfg.cards.assinaturas;
      return false;
    });

    const bloqueadas = [];
    let tarefasAlvo = tarefasFiltradasPorCard.filter(function(t) {
      if (deveBloquear(t)) {
        bloqueadas.push(t.nome + ' (' + t.quantidade + ')');
        return false;
      }
      return true;
    });

    // Re-map só das tarefas afetadas: restringe aos nomes informados em tarefasFiltro
    if (cfg.tarefasFiltro && cfg.tarefasFiltro.length) {
      const _filt = {};
      cfg.tarefasFiltro.forEach(function(n){ _filt[String(n || '').trim().toLowerCase()] = true; });
      tarefasAlvo = tarefasAlvo.filter(function(t){ return _filt[String(t.nome || '').trim().toLowerCase()]; });
    }

    if (bloqueadas.length) {
      emitirProgresso(origemTabId, { fase:'bloqueadas',
        msg: 'Tarefas puladas (blocklist): ' + bloqueadas.join(', ') });
    }

    if (!tarefasAlvo.length) {
      const marcados = [];
      if (cfg.cards.minhas) marcados.push('Minhas Tarefas');
      if (cfg.cards.gerais) marcados.push('Tarefas Gerais');
      if (cfg.cards.assinaturas) marcados.push('Assinaturas');
      const motivo = marcados.length === 0
        ? 'Nenhum card foi marcado nas configuracoes.'
        : 'Apos filtros, nenhuma tarefa restou. Detectados: Minhas=' + contagemPorTipo.minhas +
          ', Gerais=' + contagemPorTipo.gerais +
          ', Assinaturas=' + contagemPorTipo.assinaturas +
          (bloqueadas.length ? '. Bloqueadas: ' + bloqueadas.length : '');
      throw new Error(motivo);
    }

    emitirProgresso(origemTabId, { step:0, total:tarefasAlvo.length, fase:'iniciar',
      msg:'Identificadas ' + tarefasAlvo.length + ' tarefa(s). Iniciando captura...' });

    const resultadoFinal = {
      fonte: 'Coleta automática completa', timestamp: new Date().toISOString(),
      tarefas: [], config: cfg,
    };

    for (let i=0; i<tarefasAlvo.length; i++) {
      if (coletaAtual && coletaAtual.cancelado) throw new Error('Cancelado pelo usuario');
      const t = tarefasAlvo[i];

      emitirProgresso(origemTabId, {
        step: i+1, total: tarefasAlvo.length, fase:'tarefa',
        msg: 'Capturando "' + t.nome + '" (' + t.quantidade + ' processos)...',
      });

      let hashAlvo = t.href || '';
      if (hashAlvo.indexOf('#') !== 0) {
        if (hashAlvo.indexOf('/') === 0) hashAlvo = '#' + hashAlvo;
        else if (hashAlvo.indexOf('painel-') === 0 || hashAlvo.indexOf('lista-') === 0) hashAlvo = '#/' + hashAlvo;
        else hashAlvo = '#/painel-usuario-interno/lista-minhas-tarefas/' + encodeURIComponent(t.nome) + '/true/' + hashAlvo;
      }

      emitirProgresso(origemTabId, {
        step: i+1, total: tarefasAlvo.length, fase:'nav',
        msg: 'Setando hash: ' + hashAlvo.slice(0, 100),
      });

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabSec.id, frameIds: [frameAngularId] },
          func: pjmNavegarHash, args: [hashAlvo],
        });
        // R-1: settle p/ o reset de rota limpar a lista anterior; o loop pjmAguardarLista (abaixo) espera a nova lista aparecer.
        await sleep(1200);
        try {
          const tNow = await chrome.tabs.get(tabSec.id);
          emitirProgresso(origemTabId, { step: i+1, total: tarefasAlvo.length, fase:'nav-ok',
            msg: 'URL atual: ' + (tNow.url||'').slice(-80) });
        } catch (_) { console.warn('[PJM background]', _); }
      } catch (e) {
        emitirProgresso(origemTabId, { step: i+1, total: tarefasAlvo.length, fase:'erro',
          msg: 'Falha ao navegar: ' + e.message });
      }

      let listaPronta = false;
      const tEsp = Date.now();
      while (Date.now() - tEsp < cfg.timeoutLista) {
        if (coletaAtual && coletaAtual.cancelado) throw new Error('Cancelado pelo usuario');
        let waitR = [];
        try {
          waitR = await chrome.scripting.executeScript({
            target: { tabId: tabSec.id, allFrames: true },
            func: pjmAguardarLista, args: [800], world: 'MAIN',
          });
        } catch (_) { console.warn('[PJM background]', _); }
        const pronta = (waitR||[]).some(function(r){ return r.result && r.result.qtdNumeros > 0; });
        if (pronta) { listaPronta = true; break; }
        await sleep(500);
      }

      if (!listaPronta) {
        let diagDom = '';
        try {
          const ds = await chrome.scripting.executeScript({
            target: { tabId: tabSec.id, allFrames: true }, func: pjmDiagnosticarDom,
          });
          diagDom = (ds||[]).map(function(d) {
            const r = d.result || {};
            return 'f#' + d.frameId + ' hash:' + (r.hash||'').slice(0,30) +
                   ' painel:' + (r.temPainel?1:0) + ' num:' + r.temNumProc +
                   ' proc*:' + r.temAlgumProc;
          }).join(' || ');
        } catch (_) { console.warn('[PJM background]', _); }
        emitirProgresso(origemTabId, {
          step: i+1, total: tarefasAlvo.length, fase:'vazia',
          msg: '"' + t.nome + '" lista nao apareceu. ' + diagDom,
        });
        resultadoFinal.tarefas.push(Object.assign({}, t, { processos: [], quantidade: t.quantidade || 0 }));
        continue;
      }

      const procsTarefa = [];
      const vistosCNJ = new Set();

      // Reset do paginador PrimeNG: volta para pagina 1 ANTES de comecar a coletar
      // (caso a tarefa anterior tenha deixado o paginador em outra pagina)
      try {
        const resetR = await chrome.scripting.executeScript({
          target: { tabId: tabSec.id, allFrames: true },
          func: pjmIrParaPrimeiraPagina, world: 'MAIN',
        });
        const reset = (resetR || []).find(function(r){ return r.result && r.result.clicou; });
        if (reset) {
          emitirProgresso(origemTabId, {
            step: i+1, total: tarefasAlvo.length, fase:'reset-pag',
            msg: '"' + t.nome + '" reset paginador: ' + reset.result.motivo,
          });
          await sleep(800); // aguarda recarregar pagina 1
        }
      } catch (_) { console.warn('[PJM background]', _); }

      let pagina = 0;
      const maxPag = cfg.paginacao ? cfg.maxPaginas : 1;
      let frameUsado = 0;
      let primeiroCnjAnterior = '';
      while (pagina < maxPag) {
        if (coletaAtual && coletaAtual.cancelado) throw new Error('Cancelado pelo usuario');
        pagina++;
        const best = await extrairMelhorFrame(tabSec.id);
        const procs = (best.result && best.result.tarefas && best.result.tarefas[0] && best.result.tarefas[0].processos) || [];
        frameUsado = best.frameId;
        // Sanity check: se o primeiro CNJ desta extracao for igual ao da anterior,
        // significa que o paginador AINDA NAO MUDOU - estamos lendo a mesma pagina!
        // Nesse caso, nao incrementa, espera mais e re-extrai (ate 5x).
        const primeiroAtual = (procs[0] && procs[0].numero) || '';
        if (pagina > 1 && primeiroAtual && primeiroAtual === primeiroCnjAnterior) {
          // Mesma pagina - desfaz incremento e tenta mais 2s
          pagina--;
          let retried = 0;
          while (retried < 4) {
            await sleep(700);
            const reb = await extrairMelhorFrame(tabSec.id);
            const rp = (reb.result && reb.result.tarefas && reb.result.tarefas[0] && reb.result.tarefas[0].processos) || [];
            const np = (rp[0] && rp[0].numero) || '';
            if (np && np !== primeiroCnjAnterior) {
              // Mudou! Reusa essa nova leitura
              pagina++;
              const novos2 = rp.filter(function(p) {
                if (vistosCNJ.has(p.numero)) return false;
                vistosCNJ.add(p.numero); p.pagina = pagina; return true;
              });
              procsTarefa.push.apply(procsTarefa, novos2);
              primeiroCnjAnterior = np;
              emitirProgresso(origemTabId, {
                step: i+1, total: tarefasAlvo.length, fase:'pagina',
                msg: '"' + t.nome + '" pag.' + pagina + ' (apos espera): ' + procsTarefa.length + ' processo(s)',
              });
              if (novos2.length === 0) { pagina = maxPag + 1; break; } // sai do while externo
              break;
            }
            retried++;
          }
          if (retried >= 4) break; // desistiu, paginador travou
        } else {
          const novos = procs.filter(function(p) {
            if (vistosCNJ.has(p.numero)) return false;
            vistosCNJ.add(p.numero); p.pagina = pagina; return true;
          });
          procsTarefa.push.apply(procsTarefa, novos);
          primeiroCnjAnterior = primeiroAtual;
          emitirProgresso(origemTabId, {
            step: i+1, total: tarefasAlvo.length, fase:'pagina',
            msg: '"' + t.nome + '" pag.' + pagina + ': ' + procsTarefa.length + ' processo(s) (frame ' + frameUsado + ')',
          });
          if (novos.length === 0) break;
        }
        if (!cfg.paginacao) break;
        let nr = null;
        try {
          const nrA = await chrome.scripting.executeScript({
            target: { tabId: tabSec.id, frameIds: [frameUsado] },
            func: pjmProximaPagina, world: 'MAIN',
          });
          nr = nrA && nrA[0] && nrA[0].result;
        } catch (_) { console.warn('[PJM background]', _); }
        if (!nr || !nr.clicou) break;
        await sleep(800);
      }

      resultadoFinal.tarefas.push(Object.assign({}, t, {
        processos: procsTarefa, quantidade: t.quantidade || procsTarefa.length,
      }));
      await sleep(cfg.delayEntreTarefas);
    }

    resultadoFinal.resumo = calcularResumo(resultadoFinal.tarefas);
    emitirProgresso(origemTabId, {
      step: tarefasAlvo.length, total: tarefasAlvo.length, fase:'concluido',
      msg: 'Concluido: ' + resultadoFinal.resumo.totalProcessos + ' processo(s) em ' + resultadoFinal.tarefas.length + ' tarefa(s)',
    });
    try { await chrome.storage.local.set({ pjeMapperUltimoResultado: resultadoFinal }); } catch (_) { console.warn('[PJM background]', _); }
    await finalizar();
    return resultadoFinal;
  } catch (err) {
    await finalizar();
    throw err;
  }
}

function calcularResumo(tarefas) {
  const r = { totalTarefas:tarefas.length, totalProcessos:0, comEtiqueta:0, semEtiqueta:0, porCategoria:{}, porEtiqueta:{}, porTarefa:{} };
  tarefas.forEach(function(t) {
    const procs = t.processos || [];
    r.totalProcessos += procs.length;
    r.porTarefa[t.nome] = procs.length;
    procs.forEach(function(p) {
      const c = p.categoria || 'nao classificado';
      r.porCategoria[c] = (r.porCategoria[c]||0)+1;
      if ((p.etiquetas||[]).length) {
        r.comEtiqueta++;
        p.etiquetas.forEach(function(e){ r.porEtiqueta[e] = (r.porEtiqueta[e]||0)+1; });
      } else { r.semEtiqueta++; }
    });
  });
  return r;
}

// ─────────────────────────────────────────────────────────────────────
// RELATÓRIO — helpers de sessão
// ─────────────────────────────────────────────────────────────────────

// R-2: serializa o ciclo ler→alterar→salvar por chave, evitando que gravações
// concorrentes (várias abas, alarme + popup) se sobrescrevam e percam dados.
const _pjmStorageFila = {};
function pjmAtualizarStorage(chave, mutator) {
  const anterior = _pjmStorageFila[chave] || Promise.resolve();
  const proximo = anterior.then(async function() {
    const r = await chrome.storage.local.get(chave);
    const novo = await mutator(r ? r[chave] : undefined);
    if (novo !== undefined) await chrome.storage.local.set({ [chave]: novo });
    return novo;
  });
  _pjmStorageFila[chave] = proximo.catch(function() {});
  return proximo;
}

async function pjmIniciarSessao() {
  await pjmAtualizarStorage('pjmRelatorio', function(rel) {
    rel = rel || { sessoes: [] };
    const agora = Date.now();
    rel.sessoes.push({ id: new Date(agora).toISOString(), inicio: agora, processos: {} });
    if (rel.sessoes.length > 50) rel.sessoes = rel.sessoes.slice(-50);
    return rel;
  });
}

// Reaproveita a última sessão só se for do MESMO dia; senão abre uma nova AGORA,
// para o Relatório refletir o momento real da ação (inclusive as feitas pelos
// autos digitais, que antes eram descartadas por não haver sessão de mapeamento).
function pjmMesmoDia(ts) {
  if (!ts) return false;
  const a = new Date(ts), b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function pjmSessaoCorrente(rel) {
  rel.sessoes = rel.sessoes || [];
  const ult = rel.sessoes[rel.sessoes.length - 1];
  if (!ult || !pjmMesmoDia(ult.inicio)) {
    const agora = Date.now();
    rel.sessoes.push({ id: new Date(agora).toISOString(), inicio: agora, processos: {} });
    if (rel.sessoes.length > 50) rel.sessoes = rel.sessoes.slice(-50);
  }
  return rel.sessoes[rel.sessoes.length - 1];
}

async function pjmRegistrarAbertura(cnj) {
  if (!cnj) return;
  await pjmAtualizarStorage('pjmRelatorio', function(rel) {
    rel = rel || { sessoes: [] };
    const sessao = pjmSessaoCorrente(rel);
    if (!sessao.processos[cnj]) sessao.processos[cnj] = { horaAbertura: Date.now(), acoes: [] };
    else sessao.processos[cnj].horaAbertura = Date.now();
    return rel;
  });
}

async function pjmRegistrarAcao(cnj, label, doc) {
  if (!cnj || !label) return;
  await pjmAtualizarStorage('pjmRelatorio', function(rel) {
    rel = rel || { sessoes: [] };
    const sessao = pjmSessaoCorrente(rel);
    if (!sessao.processos[cnj]) sessao.processos[cnj] = { horaAbertura: null, acoes: [] };
    const acao = { label, ts: Date.now() };
    if (doc) acao.doc = doc;
    sessao.processos[cnj].acoes.push(acao);
    return rel;
  });
}

// Registra a mesma ação para múltiplos CNJs em uma única operação de storage.
// Evita race condition de múltiplos pjmRegistrarAcao() simultâneos.
async function pjmRegistrarAcoes(cnjs, label, doc, docsReais, docsStatus, docsBase) {
  if (!cnjs || !cnjs.length || !label) return;
  await pjmAtualizarStorage('pjmRelatorio', function(rel) {
    rel = rel || { sessoes: [] };
    const sessao = pjmSessaoCorrente(rel);
    const ts = Date.now();
    cnjs.forEach(function(cnj) {
      if (!cnj) return;
      if (!sessao.processos[cnj]) sessao.processos[cnj] = { horaAbertura: null, acoes: [] };
      const acao = { label, ts };
      if (doc) acao.doc = doc;
      const dr = docsReais && docsReais[cnj];
      if (dr) acao.docReal = dr;
      const dsv = docsStatus && docsStatus[cnj];
      if (dsv) acao.docStatus = dsv;
      const bs = docsBase && docsBase[cnj];
      if (bs) { if (bs.taskId) acao.taskId = bs.taskId; if (bs.md5s && bs.md5s.length) acao.md5s = bs.md5s; }
      sessao.processos[cnj].acoes.push(acao);
    });
    return rel;
  });
}

// Grava o resultado da reconciliação de execução (3a.1) nas ações do pjmRelatorio.
// Casa a ação por (sessao.inicio + cnj + ts) e acrescenta os campos do executado.
async function pjmGravarExecucao(updates) {
  if (!updates || !updates.length) return;
  await pjmAtualizarStorage('pjmRelatorio', function(rel) {
    rel = rel || { sessoes: [] };
    (updates || []).forEach(function(u) {
      var sess = (rel.sessoes || []).filter(function(s){ return s.inicio === u.sessaoInicio; })[0];
      if (!sess || !sess.processos || !sess.processos[u.cnj]) return;
      var acao = (sess.processos[u.cnj].acoes || []).filter(function(a){ return a.ts === u.acaoTs; })[0];
      if (!acao) return;
      acao.execStatus = u.execStatus || '';
      acao.execTs = Date.now();
      var e = u.exec;
      if (e) {
        if (e.idExpediente) acao.idExpediente = e.idExpediente;
        if (e.idProcessoDocumento) acao.idProcessoDocumento = e.idProcessoDocumento;
        if (e.docExecutado) acao.docExecutado = e.docExecutado;
        if (e.juntadoPor) acao.juntadoPor = e.juntadoPor;
        if (e.juntadoEm) acao.juntadoEm = e.juntadoEm;
      }
    });
    return rel;
  });
}

// Registra uma juntada/elaboração de ato. Diferente de pjmRegistrarAcao, cria
// uma sessão (tipo 'juntada') se ainda não houver nenhuma — assim a ação é
// sempre registrada, mesmo sem um mapeamento aberto.
async function pjmRegistrarJuntada(cnj, label) {
  if (!cnj || !label) return;
  await pjmAtualizarStorage('pjmRelatorio', function(rel) {
    rel = rel || { sessoes: [] };
    const sessao = pjmSessaoCorrente(rel);
    if (!sessao.processos[cnj]) sessao.processos[cnj] = { horaAbertura: null, acoes: [] };
    sessao.processos[cnj].acoes.push({ label, ts: Date.now() });
    return rel;
  });
}

async function pjmIniciarSessaoAgendamento() {
  await pjmAtualizarStorage('pjmRelatorio', function(rel) {
    rel = rel || { sessoes: [] };
    const agora = Date.now();
    rel.sessoes.push({ id: new Date(agora).toISOString(), inicio: agora, processos: {}, tipo: 'agendamento' });
    if (rel.sessoes.length > 50) rel.sessoes = rel.sessoes.slice(-50);
    return rel;
  });
}

// ─────────────────────────────────────────────────────────────────────

// ── Segurança: valida URLs/origens vindas de mensagens (S-2/S-3) ──────────────
function urlPjePermitida(u) {
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:' && x.protocol !== 'http:') return false; // bloqueia javascript:, data:, etc.
    const h = x.hostname.toLowerCase();
    return h === 'jus.br' || h.endsWith('.jus.br');                       // somente hosts *.jus.br
  } catch (_) { return false; }
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  // S-4: aceita apenas mensagens das próprias partes da extensão (content scripts / popup).
  if (!sender || sender.id !== chrome.runtime.id) return;

  if (msg && msg.type === 'PJM_MAPEAR') {
    (async function() {
      try {
        const tabId = msg.tabId != null ? msg.tabId : (sender.tab && sender.tab.id);
        if (!tabId) throw new Error('Aba nao identificada');
        const best = await extrairMelhorFrame(tabId);
        if (!best.result) throw new Error('Nenhum dado retornado');
        try { await chrome.storage.local.set({ pjeMapperUltimoResultado: best.result }); } catch (_) { console.warn('[PJM background]', _); }
        try { await pjmIniciarSessao(); } catch (_) { console.warn('[PJM background]', _); }
        sendResponse({ ok:true, data: best.result });
      } catch (e) {
        sendResponse({ ok:false, error: e.message || String(e) });
      }
    })();
    return true;
  }
  if (msg && msg.type === 'PJM_MAPEAR_AUTO') {
    (async function() {
      try {
        const tabId = msg.tabId != null ? msg.tabId : (sender.tab && sender.tab.id);
        if (!tabId) throw new Error('Aba nao identificada');
        try { await pjmIniciarSessao(); } catch (_) { console.warn('[PJM background]', _); }
        const data = await coletarAutomatico(tabId, msg.config || {});
        sendResponse({ ok:true, data: data });
      } catch (e) {
        console.error('[PJM] PJM_MAPEAR_AUTO erro:', e);
        sendResponse({ ok:false, error: e.message || String(e) });
      }
    })();
    return true;
  }
  if (msg && msg.type === 'PJM_CANCELAR') {
    if (coletaAtual) { coletaAtual.cancelado = true; sendResponse({ ok:true }); }
    else { sendResponse({ ok:false }); }
    return false;
  }

  if (msg && msg.type === 'PJM_ABRIR_AUTOS') {
    // Abre nova aba do PJe ja na URL da tarefa, em segundo plano,
    // gravando pedido para o auto-open executar la dentro.
    (async function() {
      try {
        const origemTabId = sender.tab && sender.tab.id;
        const origemTab = origemTabId ? await chrome.tabs.get(origemTabId) : null;
        const url = msg.url;
        if (!url) throw new Error('URL nao informada');
        if (!urlPjePermitida(url)) throw new Error('URL nao permitida.');

        // Grava pedido em chrome.storage.local (auto-open le isso)
        await chrome.storage.local.set({
          pjmAutoOpen: {
            cnj: msg.cnj,
            ts: Date.now(),
            pagina: msg.pagina || 1,
            fecharAposAbrir: true,
          }
        });
        // Registra abertura dos autos no relatório
        try { await pjmRegistrarAbertura(msg.cnj); } catch (_) { console.warn('[PJM background]', _); }

        // Abre a aba em PRIMEIRO PLANO. Em segundo plano o Chrome estrangula/
        // congela timers e bloqueia abertura que depende de ativacao do usuario,
        // entao o clique em "Abrir autos" so completa quando a aba ganha foco.
        const novaAba = await chrome.tabs.create({
          url: url,
          active: true,
          windowId: origemTab ? origemTab.windowId : undefined,
        });
        console.log('[PJM bg] Aba auxiliar aberta em background:', novaAba.id);
        sendResponse({ ok: true, tabId: novaAba.id });
      } catch (e) {
        console.error('[PJM] PJM_ABRIR_AUTOS erro:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_ELABORAR_NOS_AUTOS') {
    // Reaproveita a aba dos autos já aberta para esse CNJ (foca + abre o popover);
    // se não houver, abre nova aba e sinaliza para o popover abrir ao carregar.
    (async function() {
      try {
        const cnj = (msg.cnj || '').replace(/[^0-9]/g, '');
        if (!cnj) throw new Error('CNJ não informado');
        const tabs = await chrome.tabs.query({ url: ['*://*.pje.jus.br/*', '*://pje.tre-sp.jus.br/*', '*://*.tse.jus.br/*', '*://pje-frontend.tse.jus.br/*'] });
        let alvo = null;
        for (const t of tabs) {
          try {
            const resp = await chrome.tabs.sendMessage(t.id, { type: 'PJM_QUAL_CNJ' });
            if (resp && resp.cnj === cnj) { alvo = t; break; }
          } catch (_) { console.warn('[PJM background]', _); }
        }
        if (alvo) {
          await chrome.tabs.update(alvo.id, { active: true });
          try { await chrome.windows.update(alvo.windowId, { focused: true }); } catch (_) { console.warn('[PJM background]', _); }
          try { await chrome.tabs.sendMessage(alvo.id, { type: 'PJM_ABRIR_POPUP_JUNTADA' }); } catch (_) { console.warn('[PJM background]', _); }
          sendResponse({ ok: true, reaproveitou: true });
        } else if (msg.fast !== false && msg.info && msg.info.idProcesso) {
          // ── Abertura rápida: regenera a "ca" e abre os autos DIRETO (sem lista) ──
          // Camadas de fallback: ca nova → URL cacheada (vale na sessão) → lista.
          const origemTabId = sender.tab && sender.tab.id;
          const origemTab = origemTabId ? await chrome.tabs.get(origemTabId) : null;
          let urlAutos = '';
          try {
            const base = msg.info.url ? new URL(msg.info.url) : null;
            if (base) {
              if (!urlPjePermitida(base.href)) throw new Error('Origem não permitida para requisição autenticada.');
              const r = await fetch(base.origin + '/pje/seam/resource/rest/pje-legacy/painelUsuario/gerarChaveAcessoProcesso/' + encodeURIComponent(msg.info.idProcesso), { credentials: 'include' });
              const ca = (await r.text()).trim();
              if (r.ok && /^[a-f0-9]{100,}$/i.test(ca)) {
                base.searchParams.set('ca', ca);   // troca só a chave; mantém idProcesso/idTaskInstance/path
                urlAutos = base.toString();
              }
            }
          } catch (_) { console.warn('[PJM background]', _); }
          if (!urlAutos && msg.info.url) urlAutos = msg.info.url;   // fallback: URL cacheada
          if (urlAutos) {
            await chrome.storage.local.set({ pjmAbrirPopupJuntada: { cnj, ts: Date.now() } });
            try { await pjmRegistrarAbertura(cnj); } catch (_) { console.warn('[PJM background]', _); }
            if (!urlPjePermitida(urlAutos)) throw new Error('URL não permitida.');
            await chrome.tabs.create({ url: urlAutos, active: true, windowId: origemTab ? origemTab.windowId : undefined });
            sendResponse({ ok: true, direto: true });
          } else if (msg.url) {
            await chrome.storage.local.set({
              pjmAbrirPopupJuntada: { cnj, ts: Date.now() },
              pjmAutoOpen: { cnj, ts: Date.now(), pagina: msg.pagina || 1, fecharAposAbrir: true }
            });
            try { await pjmRegistrarAbertura(cnj); } catch (_) { console.warn('[PJM background]', _); }
            if (!urlPjePermitida(msg.url)) throw new Error('URL não permitida.');
            await chrome.tabs.create({ url: msg.url, active: true, windowId: origemTab ? origemTab.windowId : undefined });
            sendResponse({ ok: true, direto: false });
          } else {
            sendResponse({ ok: false, error: 'Sem caminho para abrir os autos.' });
          }
        } else if (msg.url) {
          const origemTabId = sender.tab && sender.tab.id;
          const origemTab = origemTabId ? await chrome.tabs.get(origemTabId) : null;
          await chrome.storage.local.set({
            pjmAbrirPopupJuntada: { cnj, ts: Date.now() },
            pjmAutoOpen: { cnj, ts: Date.now(), pagina: msg.pagina || 1, fecharAposAbrir: true }
          });
          try { await pjmRegistrarAbertura(cnj); } catch (_) { console.warn('[PJM background]', _); }
          if (!urlPjePermitida(msg.url)) throw new Error('URL não permitida.');
          await chrome.tabs.create({ url: msg.url, active: true, windowId: origemTab ? origemTab.windowId : undefined });
          sendResponse({ ok: true, reaproveitou: false });
        } else {
          sendResponse({ ok: false, error: 'Autos não estão abertos e não há URL para abrir.' });
        }
      } catch (e) {
        console.error('[PJM] PJM_ELABORAR_NOS_AUTOS erro:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_ABRIR_TAREFA_SEQUENCIA') {
    // Abre UMA aba com a URL da tarefa e grava pjmSequenciaComando no storage.
    // O auto-open.js lê o comando e abre os autos de cada CNJ em sequência.
    (async function() {
      try {
        const origemTabId = sender.tab && sender.tab.id;
        const origemTab = origemTabId ? await chrome.tabs.get(origemTabId) : null;
        const url = msg.url;
        if (!url) throw new Error('URL não informada');
        if (!urlPjePermitida(url)) throw new Error('URL não permitida.');
        if (!msg.cnjs || !msg.cnjs.length) throw new Error('Lista de CNJs vazia');

        await chrome.storage.local.set({
          pjmSequenciaComando: { cnjs: msg.cnjs, ts: Date.now() }
        });

        const novaAba = await chrome.tabs.create({
          url: url,
          active: true,
          windowId: origemTab ? origemTab.windowId : undefined,
        });
        console.log('[PJM bg] Aba de sequência aberta:', novaAba.id, '(', msg.cnjs.length, 'CNJs)');
        sendResponse({ ok: true, tabId: novaAba.id });
      } catch (e) {
        console.error('[PJM] PJM_ABRIR_TAREFA_SEQUENCIA erro:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  // Abertura DIRETA dos autos: monta a URL do zero (idProcesso + ca regenerada),
  // sem depender da lista da tarefa nem de cache. Aceita item único {cnj,idProcesso}
  // ou lote {itens:[{cnj,idProcesso}]}. 1ª aba em foco, resto em segundo plano.
  // (Validado 05/07: idProcesso + ca abrem os autos; idTaskInstance dispensável.)
  if (msg && msg.type === 'PJM_ABRIR_AUTOS_DIRETO') {
    (async function () {
      try {
        let origem = '';
        try { origem = (sender.tab && sender.tab.url) ? new URL(sender.tab.url).origin : ''; } catch (_) { origem = ''; }
        // Mensagem vinda de uma PAGINA DA EXTENSAO (ex.: relatorio-prazos.html): a origem do
        // sender e chrome-extension://... e nunca passa no urlPjePermitida. Nesse caso usa a
        // origem do PJe informada na mensagem -- validada ABAIXO, antes de qualquer fetch
        // credenciado (mantem o endurecimento S-2/S-3: nada de credenciais p/ origem arbitraria).
        if (!urlPjePermitida(origem + '/pje/') && msg.origem) {
          try { origem = new URL(msg.origem).origin; } catch (_) { /* noop */ }
        }
        if (!urlPjePermitida(origem + '/pje/')) throw new Error('Origem não permitida ou não determinada.');
        const origemTab = (sender.tab && sender.tab.id) ? await chrome.tabs.get(sender.tab.id) : null;
        const winId = origemTab ? origemTab.windowId : undefined;
        const itens = Array.isArray(msg.itens) ? msg.itens
          : [{ cnj: msg.cnj, idProcesso: msg.idProcesso, idTaskInstance: msg.idTaskInstance }];
        // Ato: grava ANTES de abrir para o content script dos autos achar ao carregar.
        if (msg.abrirAto && itens.length === 1) {
          const c = String(itens[0].cnj || '').replace(/[^0-9]/g, '');
          if (c) await chrome.storage.local.set({ pjmAbrirPopupJuntada: { cnj: c, ts: Date.now() } });
        }
        async function abrirUm(it, ativar) {
          const idp = String(it.idProcesso || '').trim();
          if (!idp) return { cnj: it.cnj, ok: false, error: 'sem idProcesso' };
          const rc = await fetch(origem + '/pje/seam/resource/rest/pje-legacy/painelUsuario/gerarChaveAcessoProcesso/' + encodeURIComponent(idp), { credentials: 'include' });
          const ca = (await rc.text()).trim();
          if (!rc.ok || !/^[a-f0-9]{100,}$/i.test(ca)) return { cnj: it.cnj, ok: false, error: 'ca inválida (HTTP ' + rc.status + ')' };
          let url = origem + '/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=' + encodeURIComponent(idp) + '&ca=' + encodeURIComponent(ca);
          if (it.idTaskInstance) url += '&idTaskInstance=' + encodeURIComponent(it.idTaskInstance);
          if (!urlPjePermitida(url)) return { cnj: it.cnj, ok: false, error: 'URL não permitida' };
          const cDig = String(it.cnj || '').replace(/[^0-9]/g, '');
          if (cDig) { try { await pjmRegistrarAbertura(cDig); } catch (_) { /* noop */ } }
          const nova = await chrome.tabs.create({ url: url, active: !!ativar, windowId: winId });
          return { cnj: it.cnj, ok: true, tabId: nova.id };
        }
        const resultados = [];
        for (let i = 0; i < itens.length; i++) {
          resultados.push(await abrirUm(itens[i], i === 0));   // 1ª em foco
          if (i < itens.length - 1) await new Promise(function (r) { setTimeout(r, 350); });   // stagger leve
        }
        console.log('[PJM bg] Autos DIRETO:', resultados.filter(function (x) { return x.ok; }).length + '/' + resultados.length);
        sendResponse({ ok: resultados.some(function (x) { return x.ok; }), resultados: resultados });
      } catch (e) {
        console.error('[PJM] PJM_ABRIR_AUTOS_DIRETO erro:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_ABRIR_URL') {
    // Abre uma URL (autos) em nova aba via API da extensao -- contorna o
    // bloqueio de pop-up que barra o window.open automatico do auto-open.
    (async function () {
      try {
        const origemTabId = sender.tab && sender.tab.id;
        const origemTab = origemTabId ? await chrome.tabs.get(origemTabId) : null;
        if (!msg.url) throw new Error('URL nao informada');
        if (!urlPjePermitida(msg.url)) throw new Error('URL nao permitida.');
        const nova = await chrome.tabs.create({
          url: msg.url,
          active: true,
          windowId: origemTab ? origemTab.windowId : undefined,
        });
        sendResponse({ ok: true, tabId: nova.id });
      } catch (e) {
        console.error('[PJM] PJM_ABRIR_URL erro:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_ABRIR_RELATORIO_PRAZOS') {
    // Abre a pagina de relatorio de prazos (pagina da propria extensao).
    (async function () {
      try {
        const origemTabId = sender.tab && sender.tab.id;
        const origemTab = origemTabId ? await chrome.tabs.get(origemTabId) : null;
        const nova = await chrome.tabs.create({
          url: chrome.runtime.getURL('relatorio-prazos.html'),
          active: true,
          windowId: origemTab ? origemTab.windowId : undefined,
        });
        sendResponse({ ok: true, tabId: nova.id });
      } catch (e) {
        console.error('[PJM] PJM_ABRIR_RELATORIO_PRAZOS erro:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_ABRIR_RELATORIO_KPIS') {
    (async function () {
      try {
        const origemTabId = sender.tab && sender.tab.id;
        const origemTab = origemTabId ? await chrome.tabs.get(origemTabId) : null;
        const nova = await chrome.tabs.create({ url: chrome.runtime.getURL('relatorio-kpis.html'), active: true, windowId: origemTab ? origemTab.windowId : undefined });
        sendResponse({ ok: true, tabId: nova.id });
      } catch (e) { console.error('[PJM] PJM_ABRIR_RELATORIO_KPIS erro:', e); sendResponse({ ok: false, error: e.message }); }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_FECHAR_ABA') {
    // Fecha a aba do remetente (auto-open chama isso apos abrir os autos)
    (async function() {
      try {
        const tabId = sender.tab && sender.tab.id;
        if (!tabId) throw new Error('Tab sem id');
        await chrome.tabs.remove(tabId);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_FOCAR_PAINEL') {
    // Foca uma aba do painel Angular (que executa etiquetaComando via onChanged);
    // se nenhuma estiver aberta, cria uma. Usado pelo botão Movimentar dos autos,
    // que NÃO navega a própria aba (evita fechar os autos / abrir aba inútil).
    (async function () {
      try {
        const filtros = ['*://pje.tre-sp.jus.br/*', '*://*.pje.jus.br/*', '*://*.tse.jus.br/*', '*://pje-frontend.tse.jus.br/*'];
        const tabs = await chrome.tabs.query({ url: filtros });
        const painel = tabs.find(function (t) { return /ng2\/dev\.seam/i.test(t.url || ''); });
        if (painel) {
          // Camada 1: se houver um assistente "Preparar Expediente" ABERTO no painel
          // content script do painel executa via onChanged mesmo com a aba ao fundo).
          // Ativar a aba com o assistente aberto sacode a lista e trava o assistente
          // frágil (movido-mas-não-preparado). Sem assistente, mantém o foco (padrão).
          let _temAssistente = false;
          try {
            const _frames = await chrome.webNavigation.getAllFrames({ tabId: painel.id });
            _temAssistente = (_frames || []).some(function (f) { return /\/Processo\/movimentar\.seam/i.test(f.url || ''); });
          } catch (_) { /* sem webNavigation disponível → comportamento padrão (foca) */ }
          if (!_temAssistente) { await chrome.tabs.update(painel.id, { active: true }); }
          sendResponse({ ok: true, focado: painel.id, segundoPlano: _temAssistente });
          return;
        }
        const origem = (sender.tab && sender.tab.url) || (tabs[0] && tabs[0].url) || 'https://pje.tre-sp.jus.br/pje/';
        let u = null; try { u = new URL(origem); } catch (_) { /* noop */ }
        const ctx = u ? (u.pathname.split('/')[1] || 'pje') : 'pje';
        const base = u ? (u.origin + '/' + ctx) : 'https://pje.tre-sp.jus.br/pje';
        const origemTab = sender.tab ? sender.tab : null;
        const nova = await chrome.tabs.create({ url: base + '/ng2/dev.seam#/painel-usuario-interno', active: true, windowId: origemTab ? origemTab.windowId : undefined });
        sendResponse({ ok: true, criado: nova.id });
      } catch (e) {
        console.error('[PJM] PJM_FOCAR_PAINEL erro:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_LISTAR_TAREFAS') {
    (async function() {
      try {
        const tabId = msg.tabId != null ? msg.tabId : (sender.tab && sender.tab.id);
        if (!tabId) throw new Error('Aba nao identificada');
        const origem = await chrome.tabs.get(tabId);
        if (!origem || !/pje|tse/i.test(origem.url || '')) {
          throw new Error('A aba ativa nao esta no PJe.');
        }
        const baseUrl = origem.url.replace(/#.*$/, '');
        const dashUrl = baseUrl + '#/painel-usuario-interno';
        const tabSec = await chrome.tabs.create({ url: dashUrl, active: true, windowId: origem.windowId });
        try {
          await aguardarTabReady(tabSec.id);
          // R-1: settle mínimo; o loop de estabilização (abaixo) é quem espera por condição.
          await sleep(1000);
          // Aguarda estabilizar (igual coletarAutomatico)
          let dashboard = null;
          let ultima = -1, estaveis = 0;
          for (let i = 0; i < 45 && !dashboard; i++) {
            const best = await extrairMelhorFrame(tabSec.id);
            const n = (best.result && best.result.tarefas && best.result.tarefas.length) || 0;
            if (n > 0) {
              if (n === ultima) { estaveis++; if (estaveis >= 2) { dashboard = best.result; break; } }
              else { estaveis = 0; ultima = n; }
            }
            await sleep(700);
          }
          if (!dashboard) throw new Error('Nao foi possivel listar tarefas (timeout).');
          // Retorna lista enxuta (sem processos)
          const lista = dashboard.tarefas.map(function(t) {
            return { nome: t.nome, quantidade: t.quantidade, tipoCard: t.tipoCard, categoria: t.categoria };
          });
          sendResponse({ ok: true, data: lista });
        } finally {
          try { await chrome.tabs.remove(tabSec.id); } catch (_) { console.warn('[PJM background]', _); }
          try { await chrome.tabs.update(tabId, { active: true }); } catch (_) { console.warn('[PJM background]', _); }
        }
      } catch (e) {
        console.error('[PJM] PJM_LISTAR_TAREFAS erro:', e);
        sendResponse({ ok: false, error: e.message || String(e) });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_REGISTRAR_ABERTURA') {
    (async function() {
      try { await pjmRegistrarAbertura(msg.cnj || ''); sendResponse({ ok: true }); }
      catch (e) { sendResponse({ ok: false, error: e.message }); }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_LOG_ACAO') {
    (async function() {
      try {
        await pjmRegistrarAcao(msg.cnj || '', msg.label || '', msg.doc || '');
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_LOG_JUNTADA') {
    (async function() {
      try {
        await pjmRegistrarJuntada(msg.cnj || '', msg.label || '');
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  // Versão batch: grava múltiplos CNJs numa única operação de storage (evita race condition)
  if (msg && msg.type === 'PJM_LOG_ACOES_MULTI') {
    (async function() {
      try {
        await pjmRegistrarAcoes(msg.cnjs || [], msg.label || '', msg.doc || '', msg.docsReais || {}, msg.docsStatus || {}, msg.docsBase || {});
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_GRAVAR_EXECUCAO') {
    (async function() {
      try {
        await pjmGravarExecucao(msg.updates || []);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_INICIAR_SESSAO_AGENDAMENTO') {
    (async function() {
      try { await pjmIniciarSessaoAgendamento(); sendResponse({ ok: true }); }
      catch (e) { sendResponse({ ok: false, error: e.message }); }
    })();
    return true;
  }

  // ─── AGENDAMENTO ────────────────────────────────────────────────────────

  if (msg && msg.type === 'PJM_AGENDAR') {
    (async function() {
      try {
        const item = msg.item;
        if (!item || !item.id) throw new Error('Item de agendamento inválido.');

        // Persiste na lista de agendamentos (serial — R-2)
        await pjmAtualizarStorage('pjmAgendamentos', function(lista) {
          lista = lista || [];
          lista.push(item);
          return lista;
        });

        // Para tipo 0 (horário fixo), cria alarme
        if (item.tipo === 0 && item.data && item.hora) {
          const [y, m, d] = item.data.split('-').map(Number);
          const [h, min]  = item.hora.split(':').map(Number);
          const when = new Date(y, m - 1, d, h, min, 0).getTime();
          if (when > Date.now()) {
            await chrome.alarms.create('pjm_agenda_' + item.id, { when });
          }
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_CANCELAR_AGENDAMENTO') {
    (async function() {
      try {
        const id = msg.id;
        // Remove alarme se existir
        try { await chrome.alarms.clear('pjm_agenda_' + id); } catch (_) { console.warn('[PJM background]', _); }
        // Remove da lista (serial — R-2)
        await pjmAtualizarStorage('pjmAgendamentos', function(lista) {
          return ((lista) || []).filter(function(i) { return i.id !== id; });
        });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg && msg.type === 'PJM_LISTAR_AGENDAMENTOS') {
    (async function() {
      try {
        const r = await chrome.storage.local.get('pjmAgendamentos');
        sendResponse({ ok: true, data: (r && r.pjmAgendamentos) || [] });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
});

// ─── ALARMES DE AGENDAMENTO ──────────────────────────────────────────────────
let _pjmAlarmeFila = Promise.resolve();
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (!alarm.name.startsWith('pjm_agenda_')) return;
  // SERIAL: cada alarme espera o anterior concluir — evita que dois disparos sobrescrevam
  // a mesma chave de comando (causa de "só o último ser executado").
  _pjmAlarmeFila = _pjmAlarmeFila
    .then(function() { return pjmProcessarAlarme(alarm); })
    .catch(function(e) { console.warn('[PJM bg] erro ao processar alarme:', e && e.message); });
});

async function pjmProcessarAlarme(alarm) {
  const id = alarm.name.replace('pjm_agenda_', '');

  const r = await chrome.storage.local.get('pjmAgendamentos');
  const lista = (r && r.pjmAgendamentos) || [];
  const item = lista.find(function(i) { return i.id === id; });
  if (!item || item.status !== 'aguardando') return;

  // Encontra aba do PJe aberta
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ url: ['https://pje.tre-sp.jus.br/*', 'https://*.pje.jus.br/*', 'https://*.tse.jus.br/*'] });
  } catch (_) { console.warn('[PJM background]', _); }

  if (!tabs.length) {
    // Não há aba PJe aberta — converte para tipo 1 (ao abrir PJe)
    item.tipo = 1;
    await pjmAtualizarStorage('pjmAgendamentos', function(l) {
      l = l || [];
      const it = l.find(function(i) { return i.id === id; });
      if (it) it.tipo = 1;
      return l;
    });
    return;
  }

  // Cria sessão de agendamento no relatório antes de disparar
  try { await pjmIniciarSessaoAgendamento(); } catch (_) { console.warn('[PJM background]', _); }

  // Marca "executando" (informa o status na lista) e persiste — patch serial (R-2)
  item.status = 'executando';
  item.iniciadoAt = Date.now();
  await pjmAtualizarStorage('pjmAgendamentos', function(l) {
    l = l || [];
    const it = l.find(function(i) { return i.id === id; });
    if (it) { it.status = 'executando'; it.iniciadoAt = item.iniciadoAt; }
    return l;
  });

  try {
    // Dispara o comando de storage correto (aguarda a conclusão internamente)
    await pjmDispararAgendamento(item, tabs[0].id);
    item.status = 'feito';
    item.execAt = new Date().toLocaleString('pt-BR');
  } catch (e) {
    console.warn('[PJM bg] falha ao executar agendamento', id, '—', e && e.message);
    item.status = 'aguardando'; // reverte para tentar de novo
  }
  await pjmAtualizarStorage('pjmAgendamentos', function(l) {
    l = l || [];
    const it = l.find(function(i) { return i.id === id; });
    if (it) { it.status = item.status; it.execAt = item.execAt; }
    return l;
  });
}

async function pjmAguardarConclusao(tsInicio) {
  const TIMEOUT_MS = 120000; // 2 min de segurança
  const POLL_MS    = 500;
  const deadline   = Date.now() + TIMEOUT_MS;
  return new Promise(function(resolve) {
    function verificar() {
      chrome.storage.local.get('etiquetaComandoStatus', function(r) {
        const sts = r && r.etiquetaComandoStatus;
        if (sts && sts.done && sts.ts >= tsInicio) {
          resolve();
        } else if (Date.now() >= deadline) {
          console.warn('[PJM bg] timeout aguardando conclusão do agendamento');
          resolve();
        } else {
          setTimeout(verificar, POLL_MS);
        }
      });
    }
    setTimeout(verificar, POLL_MS);
  });
}

// Dispara um comando e AGUARDA o sinal de conclusão antes de retornar. Serializa cada
// etapa: antes só 'mover+comunicar' aguardava; 'mover' e 'comunicar' puros seguiam
// adiante e podiam ter a chave sobrescrita pelo próximo agendamento.
async function pjmDispararEAguardar(chave, valorSemTs) {
  await chrome.storage.local.remove('etiquetaComandoStatus');
  const ts = Date.now();
  const valor = Object.assign({}, valorSemTs, { ts: ts });
  await chrome.storage.local.set({ [chave]: valor });
  await pjmAguardarConclusao(ts);
}

async function pjmDispararAgendamento(item, tabId) {
  const acao = item.acao || 'mover';
  const cnj  = item.modo === 'cnj' ? item.alvo.replace(/[^0-9]/g, '') : null;

  if (acao === 'mover' || acao === 'mover+comunicar') {
    await pjmDispararEAguardar('etiquetaComando', { regras: item.regras || [], cnj: cnj });
    if (acao === 'mover+comunicar') {
      await pjmDispararEAguardar('prepComunicacaoAcionar', { regras: item.regrasComunicacao || [], cnj: cnj, navegarNoFim: false });
    }
  } else if (acao === 'comunicar') {
    await pjmDispararEAguardar('prepComunicacaoAcionar', { regras: item.regrasComunicacao || [], cnj: cnj, navegarNoFim: false });
  }

  // Foca na aba do PJe
  try { await chrome.tabs.update(tabId, { active: true }); } catch (_) { console.warn('[PJM background]', _); }
}

// ── Agendamento da varredura completa (Minhas Tarefas via API) ──────────────
// Configurado pelo usuário na aba Configurações (pjmConfig.agendaModo). Modos
// periódicos disparam PJM_COLETAR_TUDO numa aba do PJe aberta (listeners próprios).
(function () {
  var ALARME = 'pjmVarredura';
  var PERIODOS = { '15min': 15, '30min': 30, '1h': 60, 'dia': 1440 };

  function armarVarredura(modo) {
    try { chrome.alarms.clear(ALARME); } catch (_) { console.warn('[PJM background]', _); }
    var min = PERIODOS[modo];
    if (min) {
      chrome.alarms.create(ALARME, { delayInMinutes: min, periodInMinutes: min });
      console.log('[PJM bg] varredura agendada:', modo, '(' + min + ' min)');
    } else {
      console.log('[PJM bg] varredura periodica desligada (modo:', modo || 'off', ')');
    }
  }

  function dispararVarreduraEmAba() {
    chrome.tabs.query({ url: ['https://pje.tre-sp.jus.br/*', 'https://*.pje.jus.br/*', 'https://*.tse.jus.br/*'] }, function (tabs) {
      var tab = (tabs || [])[0];
      if (!tab) { console.log('[PJM bg] varredura: nenhuma aba PJe aberta, pulando'); return; }
      try { chrome.tabs.sendMessage(tab.id, { type: 'PJM_COLETAR_TUDO' }); } catch (e) { console.warn('[PJM bg] varredura sendMessage:', e); }
    });
  }

  chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm && alarm.name === ALARME) dispararVarreduraEmAba();
  });

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.type === 'PJM_AGENDA_VARREDURA') armarVarredura(msg.modo);
  });

  function rearmarDoStorage() {
    try {
      chrome.storage.local.get('pjmConfig', function (r) {
        armarVarredura(r && r.pjmConfig && r.pjmConfig.agendaModo);
      });
    } catch (_) { console.warn('[PJM background]', _); }
  }
  try { chrome.runtime.onStartup.addListener(rearmarDoStorage); } catch (_) { console.warn('[PJM background]', _); }
  try { chrome.runtime.onInstalled.addListener(rearmarDoStorage); } catch (_) { console.warn('[PJM background]', _); }
  rearmarDoStorage();
})();

console.log('[PJM bg v24] + atalhos de extensoes (management) + doc na comunicacao (config+real) + baseline + reconciliacao');

// ── Atalhos de extensões: liga/desliga outras extensões via chrome.management ──
// Content scripts não têm chrome.management; eles mandam estas mensagens ao background.
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) return;

  // Lista completa de extensões instaláveis (para o seletor no painel)
  if (msg.type === 'PJM_EXT_LIST') {
    try {
      if (!chrome.management || !chrome.management.getAll) { sendResponse({ ok: false, error: 'API management indisponível' }); return; }
      chrome.management.getAll(function (list) {
        var self = chrome.runtime.id;
        var exts = (list || [])
          .filter(function (e) { return e.type === 'extension' && e.id !== self; })
          .map(function (e) {
            var icon = (e.icons && e.icons.length) ? e.icons[e.icons.length - 1].url : '';
            return { id: e.id, name: e.name, enabled: !!e.enabled, mayDisable: e.mayDisable !== false, icon: icon };
          })
          .sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
        sendResponse({ ok: true, exts: exts });
      });
    } catch (e) { sendResponse({ ok: false, error: e.message || String(e) }); }
    return true;
  }

  // Estado (ativa/inativa) de uma lista de IDs (para a barra)
  if (msg.type === 'PJM_EXT_STATE') {
    try {
      var ids = msg.ids || [];
      chrome.management.getAll(function (list) {
        var byId = {}; (list || []).forEach(function (e) { byId[e.id] = e; });
        var estados = ids.map(function (id) {
          var e = byId[id];
          return { id: id, presente: !!e, enabled: !!(e && e.enabled), name: e ? e.name : '', mayDisable: e ? (e.mayDisable !== false) : false };
        });
        sendResponse({ ok: true, estados: estados });
      });
    } catch (e) { sendResponse({ ok: false, error: e.message || String(e) }); }
    return true;
  }

  // Liga/desliga uma extensão
  if (msg.type === 'PJM_EXT_TOGGLE') {
    try {
      var id = msg.id, enable = !!msg.enable;
      if (!id || id === chrome.runtime.id) { sendResponse({ ok: false, error: 'ID inválido' }); return; }
      chrome.management.setEnabled(id, enable, function () {
        if (chrome.runtime.lastError) { sendResponse({ ok: false, error: chrome.runtime.lastError.message }); return; }
        sendResponse({ ok: true, id: id, enabled: enable });
      });
    } catch (e) { sendResponse({ ok: false, error: e.message || String(e) }); }
    return true;
  }
});

// Avisa as abas do PJe quando alguma extensão liga/desliga (para atualizar os botões da barra)
(function () {
  if (!chrome.management || !chrome.management.onEnabled) return;
  var avisar = function (id, enabled) {
    try {
      chrome.tabs.query({ url: ['https://pje.tre-sp.jus.br/*', 'https://*.pje.jus.br/*', 'https://*.tse.jus.br/*'] }, function (tabs) {
        (tabs || []).forEach(function (t) { try { chrome.tabs.sendMessage(t.id, { type: 'PJM_EXT_CHANGED', id: id, enabled: enabled }); } catch (_) { } });
      });
    } catch (_) { }
  };
  chrome.management.onEnabled.addListener(function (info) { avisar(info.id, true); });
  chrome.management.onDisabled.addListener(function (info) { avisar(info.id, false); });
})();
