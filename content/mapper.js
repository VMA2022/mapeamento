
(function () {
  'use strict';

  // R-4: guard de reinjeção — evita observers/listeners duplicados se o script rodar 2x no mesmo documento
  if (window.__pjmMapperLoaded) return;
  window.__pjmMapperLoaded = true;
  if (window.PJM_ehAssistentePrepararExpediente && window.PJM_ehAssistentePrepararExpediente()) return;

  // ─────────────────────────────────────────────
  // SELETORES REAIS (confirmados no HTML do PJe)
  // ─────────────────────────────────────────────
  const SEL = {
    // Dashboard — card "Minhas Tarefas"
    linkMinhasTarefas:  'a[href*="lista-minhas-tarefas"]',
    linkTarefasGerais:  'a[href*="lista-processos-tarefa"]',
    nomeTarefa:         'span.nome',
    qtdTarefa:          'span.quantidadeTarefa',

    // Lista de processos — seletores reais confirmados
    numeroProcesso:     PJM_SEL.NUM_PROCESSO_PROC,
    numeroProcessoFb:   PJM_SEL.NUM_PROCESSO_FB,
    containerProcesso:  'div.col-sm-11',          // container individual por processo
    etiqueta:           'div.label.label-info.label-etiqueta',
    orgao:              'span.orgao',
    local:              'span.local',

    // Paginação
    proximaPagina: 'a[title="Próxima página"], .pagination .next:not(.disabled) a',
  };

  // ─────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────

  const txt   = el  => el ? (el.textContent || '').trim().replace(/\s+/g, ' ') : '';
  const cnj   = str => { const m = (str||'').match(/\d{7}-\d{2}\.\d{4}\.\d{1,2}\.\d{2}\.\d{4}/); return m ? m[0] : ''; };
  const decodeHref = href => { try { return decodeURIComponent(href); } catch(_) { return href; } };

  /** Extrai nome da tarefa e filtro Base64 da URL do PJe */
  function parsearHref(href) {
    const decoded = decodeHref(href);
    const m = decoded.match(/lista-(?:minhas-tarefas|processos-tarefa)\/([^/]+?)(?:\/true)?\/([A-Za-z0-9+/=]+)$/);
    if (m) return { nome: m[1], filtroBase64: m[2] };
    const seg = decoded.split('/');
    const idx = seg.findIndex(s => s.startsWith('lista-'));
    return { nome: seg[idx + 1] || 'Tarefa', filtroBase64: seg[seg.length - 1] };
  }

  // ─────────────────────────────────────────────
  // ETAPA 1 — MAPEAR TAREFAS DO DASHBOARD
  // ─────────────────────────────────────────────

  function mapearMinhasTarefas() {
    // Deduplicar pelo href — PJe renderiza o mesmo componente Angular 2× no DOM
    const hrefsVistos = new Set();
    const tarefas = [];

    document.querySelectorAll(SEL.linkMinhasTarefas).forEach(link => {
      const href = link.getAttribute('href') || '';
      if (!href || hrefsVistos.has(href)) return;
      hrefsVistos.add(href);

      const div    = link.querySelector('div.detalheTarefasQuantidade');
      const nome   = txt(div?.querySelector(SEL.nomeTarefa)) || txt(link);
      const qtd    = parseInt(txt(div?.querySelector(SEL.qtdTarefa)), 10) || 0;
      const parsed = parsearHref(href);

      tarefas.push({
        id:           tarefas.length + 1,
        nome:         nome || parsed.nome,
        quantidade:   qtd,
        href,
        urlCompleta:  location.origin + location.pathname + href,
        filtroBase64: parsed.filtroBase64,
        processos:    [],
      });
    });

    return tarefas;
  }

  // ─────────────────────────────────────────────
  // ETAPA 2 — LER PROCESSOS DA TELA ATUAL
  // ─────────────────────────────────────────────

  function lerProcessosDaTelaAtual() {
    const hash = location.hash;
    const nomeTarefaAtual = decodeHref(hash).split('/').find((s, i, a) =>
      a[i - 1] === 'lista-minhas-tarefas' || a[i - 1] === 'lista-processos-tarefa'
    ) || 'Tarefa atual';

    const processos = [];
    const vistos    = new Set();

    // ── Seletor real: span.tarefa-numero-processo ─────────────────────
    document.querySelectorAll(
      `${SEL.numeroProcesso}, ${SEL.numeroProcessoFb}`
    ).forEach(elNum => {
      const numCNJ = cnj(txt(elNum));
      if (!numCNJ || vistos.has(numCNJ)) return;
      vistos.add(numCNJ);

      // ID interno PJe — span.hidden dentro do span do número
      const spanHidden = elNum.querySelector('span.hidden, span[id]');
      const idInterno  = spanHidden ? (spanHidden.id || txt(spanHidden)).trim() : '';

      const container = elNum.closest(SEL.containerProcesso)
                     || elNum.closest('div[class*="col-sm-11"]')
                     || elNum.closest('div.datalist-content')
                     || elNum.parentElement?.parentElement?.parentElement;

      // Etiquetas — ignorar spans que contêm apenas ícones font-awesome
      const etiquetas = [];
      if (container) {
        container.querySelectorAll(SEL.etiqueta).forEach(divEtq => {
          const spanNome = [...divEtq.querySelectorAll('span')].find(s => {
            const cls = s.className || '';
            return !cls.includes('fa ') && !cls.startsWith('fa-') && !cls.includes('glyphicon');
          });
          const nome = txt(spanNome);
          if (nome && nome.length > 1
              && !nome.includes('Excluir')
              && !nome.includes('Desvincular')
              && !nome.includes('Remover')) {
            etiquetas.push(nome);
          }
        });
      }

      const fase    = txt(container?.querySelector(`.fase, ${SEL.orgao}, ${SEL.local}`));
      const subfase = txt(container?.querySelector('.subfase, [class*="subfase"]'));

      processos.push({
        numero:    numCNJ,
        idInterno,
        fase,
        subfase,
        etiquetas: [...new Set(etiquetas)],
        origem:    'DOM datalist',
      });
    });

    // ── Fallback: tabelas (para telas sem datalist) ───────────────────
    if (processos.length === 0) {
      document.querySelectorAll('tbody tr, tr.ng-star-inserted').forEach(linha => {
        const textoLinha = txt(linha);
        const num = cnj(textoLinha);
        if (!num || vistos.has(num)) return;
        vistos.add(num);

        const cels    = [...linha.querySelectorAll('td')];
        const headers = [...(linha.closest('table')?.querySelectorAll('th') || [])].map(txt);
        const row     = Object.fromEntries(cels.map((c, i) => [(headers[i] || `col${i}`).toLowerCase(), txt(c)]));

        const elFase    = linha.querySelector('.fase, [class*="fase"]');
        const elSubfase = linha.querySelector('.subfase, [class*="subfase"]');
        const fase      = txt(elFase) || row['fase'] || row['fase atual'] || row['situação'] || '';
        const subfase   = txt(elSubfase) || row['subfase'] || row['sub-fase'] || '';

        processos.push({ numero: num, idInterno: '', fase, subfase, etiquetas: [], origem: 'DOM tabela' });
      });
    }

    return {
      tarefas: [{ id: 1, nome: nomeTarefaAtual, quantidade: processos.length, processos }],
      fonte: 'DOM tela atual',
    };
  }

  // ─────────────────────────────────────────────
  // CLASSIFICADOR
  // ─────────────────────────────────────────────

  const CATEGORIAS = {
    'conhecimento':  ['petição inicial', 'analisar petição', 'analisar processos', 'inicial', 'ordinário', 'sumaríssimo'],
    'recursal':      ['apelação', 'agravo', 'embargos', 'recurso interno', 'registrar recurso', 'julgamento do recurso'],
    'execução':      ['cumprimento', 'penhora', 'expropriação', 'pagamento', 'execução'],
    'cautelar':      ['liminar', 'medida cautelar', 'cautelar'],
    'comunicação':   ['preparar comunicação', 'analisar resposta', 'carta de ordem', 'ofício', 'intimação', 'informação de ar', 'cumprimento de ar'],
    'prazo':         ['prazo em curso', 'trânsito em julgado', 'informar data'],
    'instrução':     ['audiência', 'perícia', 'prova', 'instrução'],
    'documentos':    ['elaborar documentos', 'desentranhar', 'digitalizar'],
    'publicação':    ['publicar processos', 'verificar decisão', 'verificar pendências'],
    'remessa':       ['expedir processo', 'processos expedidos', 'processos remetidos', 'apreciação de outra', 'apreciação pela instância'],
    'suspensão':     ['suspensos', 'sobrestados'],
    'arquivo':       ['arquivamento provisório', 'arquivados provisoriamente', 'arquivado', 'baixado'],
    'determinação':  ['analisar determinação'],
    'petição':       ['petição avulsa'],
    'pendências':    ['aguardando providências'],
    'assinatura':    ['assinatura', 'assinar'],
  };

  function classificar(fase, subfase, nomeTarefa) {
    const s = `${fase} ${subfase} ${nomeTarefa}`.toLowerCase();
    for (const [cat, termos] of Object.entries(CATEGORIAS)) {
      if (termos.some(t => s.includes(t))) return cat;
    }
    return fase ? 'outras' : 'não classificado';
  }

  // ─────────────────────────────────────────────
  // FUNÇÃO PRINCIPAL
  // ─────────────────────────────────────────────

  async function mapear({ buscarProcessos = false } = {}) {
    console.group('%c[PJeMapper] Iniciando mapeamento...', 'color: #1a5276; font-weight: bold; font-size: 13px;');
    console.log('URL atual:', location.href);
    console.log('Hash:', location.hash);

    const hash = location.hash;
    const estaEmListaTarefa  = hash.includes('lista-minhas-tarefas') || hash.includes('lista-processos-tarefa');

    let resultado;

    if (estaEmListaTarefa) {
      resultado = lerProcessosDaTelaAtual();
      console.log('[PJeMapper] Modo: leitura de tela de lista de processos');
    } else {
      const tarefas = mapearMinhasTarefas();
      console.log(`[PJeMapper] Tarefas "Minhas Tarefas" encontradas: ${tarefas.length}`);

      resultado = { tarefas, fonte: 'Dashboard', timestamp: new Date().toISOString() };
    }

    // Aplicar classificação
    resultado.tarefas.forEach(t =>
      (t.processos || []).forEach(p => {
        p.categoria = classificar(p.fase, p.subfase, t.nome);
      })
    );

    resultado.resumo = gerarResumo(resultado.tarefas);
    exibir(resultado);
    console.groupEnd();

    window._pjeMapperResultado = resultado;
    try { chrome.storage.local.set({ pjeMapperUltimoResultado: resultado }); } catch (_) { console.warn('[PJM mapper]', _); }

    return resultado;
  }

  function gerarResumo(tarefas) {
    const resumo = {
      totalTarefas: tarefas.length,
      totalProcessos: 0,
      comEtiqueta: 0,
      semEtiqueta: 0,
      porCategoria: {},
      porEtiqueta: {},
      porTarefa: {},
    };
    tarefas.forEach(t => {
      resumo.totalProcessos += (t.processos || []).length;
      resumo.porTarefa[t.nome] = (t.processos || []).length;
      (t.processos || []).forEach(p => {
        const cat = p.categoria || 'não classificado';
        resumo.porCategoria[cat] = (resumo.porCategoria[cat] || 0) + 1;
        if ((p.etiquetas || []).length > 0) {
          resumo.comEtiqueta++;
          p.etiquetas.forEach(e => { resumo.porEtiqueta[e] = (resumo.porEtiqueta[e] || 0) + 1; });
        } else {
          resumo.semEtiqueta++;
        }
      });
    });
    return resumo;
  }

  function exibir(r) {
    const total = r.resumo.totalProcessos;
    console.log(`%c✔ Fonte: ${r.fonte}`, 'color: green;');
    console.log(`%c📋 Tarefas: ${r.resumo.totalTarefas}  |  📁 Processos: ${total}  |  🏷️ Com etiqueta: ${r.resumo.comEtiqueta}`, 'font-size: 13px;');

    if (Object.keys(r.resumo.porCategoria).length) {
      console.group('📊 Por categoria');
      Object.entries(r.resumo.porCategoria).sort((a,b)=>b[1]-a[1]).forEach(([c,n]) =>
        console.log(`  ${c.padEnd(20,' ')}: ${n}`)
      );
      console.groupEnd();
    }

    if (Object.keys(r.resumo.porEtiqueta).length) {
      console.group('🏷️  Por etiqueta');
      Object.entries(r.resumo.porEtiqueta).sort((a,b)=>b[1]-a[1]).forEach(([e,n]) =>
        console.log(`  "${e}": ${n}`)
      );
      console.groupEnd();
    }

    console.group('📋 Tarefas ("Minhas Tarefas")');
    r.tarefas.forEach(t => {
      const info = t.quantidade !== undefined ? ` — ${t.quantidade} proc. no card` : '';
      console.group(`Tarefa ${t.id}: ${t.nome}${info}`);
      if (t.href) console.log('  🔗', t.href);
      if ((t.processos||[]).length) {
        console.table((t.processos||[]).map(p => ({
          'Número':    p.numero || '(ver no card)',
          'Etiquetas': (p.etiquetas||[]).join(' | ') || '—',
          'Fase':      p.fase || '—',
          'Sub-fase':  p.subfase || '—',
          'Categoria': p.categoria,
        })));
      } else {
        console.log('  ℹ️  Clique na tarefa para ver os processos, ou use PJeMapper.lerProcessosDaTelaAtual()');
      }
      console.groupEnd();
    });
    console.groupEnd();

    console.log('%c💾 window._pjeMapperResultado', 'color:#888;font-style:italic;');
  }

  // ─────────────────────────────────────────────
  // OBSERVER — detecta navegação SPA (Angular)
  // ─────────────────────────────────────────────

  let _ultimoHash = location.hash;
  window.addEventListener('hashchange', () => {
    const novoHash = location.hash;
    if (novoHash !== _ultimoHash) {
      _ultimoHash = novoHash;
      console.log(`%c[PJeMapper] Navegação detectada: ${novoHash}`, 'color:#1a5276;');
      if (novoHash.includes('lista-minhas-tarefas') || novoHash.includes('lista-processos-tarefa')) {
        console.log('[PJeMapper] Tela de lista detectada. Execute PJeMapper.lerProcessosDaTelaAtual() para capturar.');
      }
      if (novoHash.includes('painel-usuario-interno') && !novoHash.includes('lista-')) {
        console.log('[PJeMapper] Dashboard detectado. Execute PJeMapper.mapear() para mapear as tarefas.');
      }
    }
  });

  // ─────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────

  window.PJeMapper = {
    mapear,
    mapearMinhasTarefas,
    lerProcessosDaTelaAtual,
    classificar,
    SEL,


    exportarJSON() {
      const d = window._pjeMapperResultado;
      if (!d) { console.warn('Execute PJeMapper.mapear() primeiro.'); return; }
      const _u = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      Object.assign(document.createElement('a'), {
        href: _u,
        download: `pje_tarefas_${new Date().toISOString().slice(0,10)}.json`,
      }).click();
      setTimeout(() => { try { URL.revokeObjectURL(_u); } catch (_) { console.warn('[PJM mapper]', _); } }, 1500);
      console.log('✅ JSON exportado.');
    },

    exportarCSV() {
      const d = window._pjeMapperResultado;
      if (!d) { console.warn('Execute PJeMapper.mapear() primeiro.'); return; }
      const q = s => `"${(s||'').replace(/"/g,'""')}"`;
      const linhas = [['Tarefa','Qtd','Número','ID Interno','Etiquetas','Fase','Sub-fase','Categoria','URL'].join(',')];
      d.tarefas.forEach(t => {
        if ((t.processos||[]).length) {
          t.processos.forEach(p =>
            linhas.push([
              q(t.nome), t.quantidade||'',
              q(p.numero), q(p.idInterno||''),
              q((p.etiquetas||[]).join(' | ')),
              q(p.fase||''), q(p.subfase||''),
              q(p.categoria||''), q(t.href||''),
            ].join(','))
          );
        } else {
          linhas.push([q(t.nome), t.quantidade||'', '', '', '', '', '', '', q(t.href||'')].join(','));
        }
      });
      const _u = URL.createObjectURL(new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' }));
      Object.assign(document.createElement('a'), {
        href: _u,
        download: `pje_tarefas_${new Date().toISOString().slice(0,10)}.csv`,
      }).click();
      setTimeout(() => { try { URL.revokeObjectURL(_u); } catch (_) { console.warn('[PJM mapper]', _); } }, 1500);
      console.log('✅ CSV exportado.');
    },

    ajuda() {
      console.log(`%c
╔══════════════════════════════════════════════════════════════════╗
║         PJe Mapeador v4 — Comandos (contexto: ngFrame)           ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  PJeMapper.mapear()                                              ║
║    → Mapeia tarefas do card "Minhas Tarefas" (dashboard)         ║
║                                                                  ║
║  PJeMapper.lerProcessosDaTelaAtual()                             ║
║    → Extrai processos + etiquetas da tela de lista aberta        ║
║                                                                  ║
║                                                                  ║
║  PJeMapper.exportarJSON()   → Baixa resultado em JSON            ║
║  PJeMapper.exportarCSV()    → Baixa resultado em CSV (c/ etiq.)  ║
║  PJeMapper.ajuda()          → Esta mensagem                      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝`,
      'color:#1a5276;font-family:monospace;');
    },
  };

  console.log('%c[PJeMapper v4] Carregado ✔ — Digite PJeMapper.ajuda() para ver os comandos.', 'color:#1a5276;font-weight:bold;');

})();
