/**
 * PJe Mapeador - Auto-abrir autos digitais (v12)
 *
 * v6: paginacao. Se o CNJ alvo nao esta na pagina atual da lista,
 * clica em "proxima pagina" (PrimeNG: a.ui-paginator-next) e tenta
 * de novo. Repete ate achar ou esgotar.
 *
 * v5: 1 click apenas (sem retries duplicados).
 *
 * Roda em TODOS os frames. Le pedido do chrome.storage.local. So
 * consome (apaga) o pedido quando esta no frame com os spans.
 */

(function () {
  'use strict';

  // R-4: guard de reinjeção — evita observers/listeners duplicados se o script rodar 2x no mesmo documento
  if (window.__pjmAutoOpenLoaded) return;
  window.__pjmAutoOpenLoaded = true;
  if (window.PJM_ehAssistentePrepararExpediente && window.PJM_ehAssistentePrepararExpediente()) return;

  const STORAGE_KEY = 'pjmAutoOpen';
  const STORAGE_KEY_SEQ = 'pjmSequenciaComando';
  const TIMEOUT_MAX = 60000;
  const TIMEOUT_SEQ = 120000; // 2 min para sequência completa
  const ESPERA_LISTA_MS = 30000;
  const PRIMEIRA_TENTATIVA_MS = 2000;
  const MAX_PAGINAS = 50;
  const ESPERA_PAGINA_MS = 8000;

  function normalizaCnj(s) {
    return String(s || '').replace(/[^\d]/g, '');
  }

  function frameTemSpansDeProcesso() {
    return document.querySelectorAll(PJM_SEL.NUM_PROCESSO).length > 0;
  }

  function ehFramePjeFrontend() {
    return /pje-frontend|painel-usuario-interno/i.test(location.href);
  }

  function encontrarBotaoPorCnj(cnjAlvo) {
    const alvo = normalizaCnj(cnjAlvo);
    if (!alvo) return null;

    const spans = document.querySelectorAll(PJM_SEL.NUM_PROCESSO);
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      const textoCnj = normalizaCnj(span.textContent || '');
      if (!textoCnj || textoCnj.indexOf(alvo) < 0) continue;

      let no = span.parentElement;
      let nivel = 0;
      while (no && nivel < 12) {
        const botoes = no.querySelectorAll('button[title="Abrir autos"], button[title*="autos" i]');
        if (botoes.length === 1) return botoes[0];
        if (botoes.length > 1) break;
        no = no.parentElement;
        nivel++;
      }
    }

    const todosBotoes = document.querySelectorAll('button[title="Abrir autos"], button[title*="autos" i]');
    for (let b = 0; b < todosBotoes.length; b++) {
      const btn = todosBotoes[b];
      let n = btn.parentElement;
      let lvl = 0;
      while (n && lvl < 12) {
        const spansAqui = n.querySelectorAll(PJM_SEL.NUM_PROCESSO);
        let achou = false;
        for (let s = 0; s < spansAqui.length; s++) {
          const txt = normalizaCnj(spansAqui[s].textContent || '');
          if (txt.indexOf(alvo) >= 0) { achou = true; break; }
        }
        if (achou) return btn;
        if (spansAqui.length > 0) break;
        n = n.parentElement;
        lvl++;
      }
    }

    return null;
  }

  // Verifica se algum span da pagina atual contem o CNJ alvo
  function cnjEstaNaPaginaAtual(cnjAlvo) {
    const alvo = normalizaCnj(cnjAlvo);
    if (!alvo) return false;
    const spans = document.querySelectorAll(PJM_SEL.NUM_PROCESSO);
    for (let i = 0; i < spans.length; i++) {
      const txt = normalizaCnj(spans[i].textContent || '');
      if (txt.indexOf(alvo) >= 0) return true;
    }
    return false;
  }

  // Le qual eh a pagina atual no paginador (a.ui-state-active)
  function paginaAtualDoPaginador() {
    const ativa = document.querySelector(PJM_SEL.PAG_PAGE_ATIVA);
    if (ativa) {
      const n = parseInt((ativa.textContent || '').trim(), 10);
      if (!isNaN(n)) return n;
    }
    return null;
  }

  // Lista todos os numeros de pagina visiveis no paginador
  function paginasVisiveis() {
    const out = [];
    document.querySelectorAll(PJM_SEL.PAG_PAGE).forEach(function(a) {
      const n = parseInt((a.textContent || '').trim(), 10);
      if (!isNaN(n)) out.push({ num: n, el: a });
    });
    return out;
  }

  // Tenta clicar DIRETAMENTE na pagina N pelo numero visivel.
  // Retorna true se conseguiu; false se a pagina nao esta entre os links visiveis.
  function clicarPaginaDireta(n) {
    const lista = paginasVisiveis();
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].num === n) {
        lista[i].el.click();
        console.log('[PJM auto-open] Click direto na pagina', n);
        return true;
      }
    }
    return false;
  }

  // Tenta clicar em "ultima pagina" (para chegar nos numeros altos rapido)
  function clicarUltimaPagina() {
    const el = document.querySelector(PJM_SEL.PAG_LAST);
    if (el && !el.classList.contains('ui-state-disabled')) {
      el.click();
      console.log('[PJM auto-open] Click em ultima pagina');
      return true;
    }
    return false;
  }

  // Tenta clicar no botao "proxima pagina" do paginador PrimeNG
  // Retorna true se conseguiu clicar, false se nao tem mais paginas
  function clicarProximaPagina() {
    const sels = [
      PJM_SEL.PAG_NEXT_A,
      PJM_SEL.PAG_NEXT,
      'a[title="Próxima página"]',
      'a[title="Proxima pagina"]',
      'li:not(.disabled) a[aria-label="Next"]',
      '.pagination .next:not(.disabled) a',
    ];
    for (let i = 0; i < sels.length; i++) {
      const el = document.querySelector(sels[i]);
      if (el && !el.classList.contains('ui-state-disabled') &&
          !el.closest('.disabled, [aria-disabled="true"]')) {
        // UM SO click - dispatch multiplo fazia o Angular pular 2 paginas
        el.click();
        console.log('[PJM auto-open] Clicou proxima pagina via:', sels[i]);
        return true;
      }
    }
    return false;
  }

  function clickRobustoAngular(btn) {
    // O PJe (Angular + Zone.js) so reconhece o .click() NATIVO; MouseEvent
    // sintetico (dispatchEvent) NAO dispara o handler -- mesma licao do
    // etiqueta-movimentador.js, e a paginacao deste arquivo ja usa .click() real.
    try {
      btn.focus();
      btn.click();
    } catch (e) {
      console.error('[PJM auto-open] Erro no click:', e);
    }
  }

  // Espera ate que aparecam spans diferentes dos atuais OU timeout
  function esperarNovaPagina(cnjsAntigos, maxMs) {
    return new Promise(function(resolve) {
      const inicio = Date.now();
      function check() {
        if (Date.now() - inicio > maxMs) { resolve(false); return; }
        const spans = document.querySelectorAll(PJM_SEL.NUM_PROCESSO);
        if (spans.length > 0) {
          // Verifica se mudou (compara primeiro CNJ)
          const primeiroAtual = normalizaCnj(spans[0].textContent || '');
          if (primeiroAtual && cnjsAntigos.indexOf(primeiroAtual) < 0) {
            resolve(true); return;
          }
        }
        setTimeout(check, 200);
      }
      check();
    });
  }

  function snapshotCnjs() {
    const out = [];
    const spans = document.querySelectorAll(PJM_SEL.NUM_PROCESSO);
    for (let i = 0; i < spans.length; i++) {
      const c = normalizaCnj(spans[i].textContent || '');
      if (c) out.push(c);
    }
    return out;
  }

  // Espera ate que a lista de CNJs visiveis nao mude por estabilidadeMs.
  // Util porque o Angular renderiza primeiro os primeiros itens e vai
  // adicionando o restante - se procurarmos cedo demais, perdemos o alvo.
  async function esperarEstabilizar(maxMs, estabilidadeMs) {
    maxMs = maxMs || 4000;
    estabilidadeMs = estabilidadeMs || 700;
    const inicio = Date.now();
    let snapAnterior = snapshotCnjs().join(',');
    let estavelDesde = Date.now();
    while (Date.now() - inicio < maxMs) {
      await new Promise(function(r) { setTimeout(r, 150); });
      const snapAtual = snapshotCnjs().join(',');
      if (snapAtual === snapAnterior) {
        if (Date.now() - estavelDesde >= estabilidadeMs) {
          console.log('[PJM auto-open] Pagina estabilizou com', snapAtual.split(',').length, 'CNJs');
          return true;
        }
      } else {
        snapAnterior = snapAtual;
        estavelDesde = Date.now();
      }
    }
    console.warn('[PJM auto-open] Timeout esperando pagina estabilizar; prosseguindo.');
    return false;
  }

  async function buscarComPaginacao(cnj, paginaAlvo) {
    const alvo = normalizaCnj(cnj);
    let pagina = 1;

    // Espera a pagina 1 carregar os spans antes de qualquer coisa
    const inicio0 = Date.now();
    while (!frameTemSpansDeProcesso() && (Date.now() - inicio0 < ESPERA_PAGINA_MS)) {
      await new Promise(function(r) { setTimeout(r, 300); });
    }
    if (!frameTemSpansDeProcesso()) {
      console.warn('[PJM auto-open] Spans nao apareceram na pagina 1');
      return null;
    }

    // Espera a pagina 1 estabilizar
    await esperarEstabilizar(4000, 700);

    // Funcao auxiliar: verifica se o CNJ apareceu na pagina atual
    // (pode ter aparecido durante um salto - dica do mapeamento esta defasada)
    function checarAtual() {
      if (cnjEstaNaPaginaAtual(alvo)) {
        console.log('[PJM auto-open] CNJ encontrado na pagina', pagina);
        return encontrarBotaoPorCnj(alvo);
      }
      return null;
    }

    var btnEncontrado = checarAtual();
    if (btnEncontrado) return btnEncontrado;

    // Se temos paginaAlvo conhecida, navega ate ela.
    // Estrategia: prefere click DIRETO no numero (instantaneo, sem pular),
    // e quando o numero nao esta visivel, vai clicando proxima/ultima ate
    // ficar visivel, depois clica direto.
    if (paginaAlvo && paginaAlvo > 1) {
      console.log('[PJM auto-open] Navegando ate a pagina', paginaAlvo, '(direto se possivel)');
      let voltas = 0;
      const maxVoltas = 30;
      while (voltas < maxVoltas) {
        voltas++;
        const atual = paginaAtualDoPaginador() || pagina;
        if (atual === paginaAlvo) {
          pagina = atual;
          break;
        }
        // Pagina alvo esta visivel? Click direto.
        if (clicarPaginaDireta(paginaAlvo)) {
          const antigos = snapshotCnjs();
          const mudou = await esperarNovaPagina(antigos, ESPERA_PAGINA_MS);
          if (!mudou) {
            console.warn('[PJM auto-open] Pagina nao mudou apos click direto, abortando salto');
            break;
          }
          pagina = paginaAlvo;
          break;
        }
        // Nao esta visivel - precisa avancar pelos blocos.
        // Se alvo > maior visivel: clica em ultima ou no maior numero visivel.
        const visiveis = paginasVisiveis().map(function(x){ return x.num; });
        if (visiveis.length === 0) {
          console.warn('[PJM auto-open] Sem links de pagina visiveis');
          break;
        }
        const maxVis = Math.max.apply(null, visiveis);
        const minVis = Math.min.apply(null, visiveis);
        const antigos = snapshotCnjs();
        let clicou = false;
        if (paginaAlvo > maxVis) {
          // Vai para o maior visivel para avancar o bloco
          if (clicarPaginaDireta(maxVis) && (paginaAtualDoPaginador() !== maxVis)) {
            clicou = true;
          } else {
            clicou = clicarProximaPagina();
          }
        } else if (paginaAlvo < minVis) {
          // Vai para o menor visivel para retroceder o bloco
          clicou = clicarPaginaDireta(minVis);
        }
        if (!clicou) {
          console.warn('[PJM auto-open] Nao consegui avancar o bloco do paginador');
          break;
        }
        const mudou = await esperarNovaPagina(antigos, ESPERA_PAGINA_MS);
        if (!mudou) {
          console.warn('[PJM auto-open] Pagina nao mudou apos avancar bloco');
          break;
        }
        await esperarEstabilizar(4000, 600);
        // Atualiza pagina logica
        const atualPos = paginaAtualDoPaginador();
        if (atualPos) pagina = atualPos;
        // Talvez o CNJ ja apareceu
        btnEncontrado = checarAtual();
        if (btnEncontrado) return btnEncontrado;
      }
      // Apos chegar na paginaAlvo (ou desistir), espera estabilizar antes de buscar
      console.log('[PJM auto-open] Estabilizando na pag.', pagina, 'antes de buscar...');
      await esperarEstabilizar(4000, 700);
    }

    // A partir daqui, varre normal procurando o CNJ (frente)
    while (pagina <= MAX_PAGINAS) {
      const inicio = Date.now();
      while (!frameTemSpansDeProcesso() && (Date.now() - inicio < ESPERA_PAGINA_MS)) {
        await new Promise(function(r) { setTimeout(r, 300); });
      }
      if (!frameTemSpansDeProcesso()) {
        console.warn('[PJM auto-open] Spans nao apareceram na pagina', pagina);
        break;
      }

      btnEncontrado = checarAtual();
      if (btnEncontrado) return btnEncontrado;

      console.log('[PJM auto-open] CNJ nao esta na pagina', pagina, '- tentando proxima');
      const antigos = snapshotCnjs();
      const clicou = clicarProximaPagina();
      if (!clicou) {
        console.warn('[PJM auto-open] Nao tem mais paginas a frente. Vou tentar voltar para pagina 1 e varrer tudo.');
        break;
      }
      const mudou = await esperarNovaPagina(antigos, ESPERA_PAGINA_MS);
      if (!mudou) {
        console.warn('[PJM auto-open] Pagina nao mudou apos click. Abortando frente.');
        break;
      }
      pagina++;
      await esperarEstabilizar(4000, 700);
    }

    // FALLBACK: pulou direto para o alvo mas nao achou, e tambem nao achou
    // na frente. Volta para pagina 1 (clicando "Primeira") e varre tudo do inicio.
    if (paginaAlvo && paginaAlvo > 1) {
      console.log('[PJM auto-open] FALLBACK: voltando para pagina 1 e varrendo tudo.');
      // Tenta clicar em "primeira pagina"
      var primeira = document.querySelector(PJM_SEL.PAG_FIRST);
      if (primeira) {
        try {
          const opts = { bubbles: true, cancelable: true, view: window };
          primeira.dispatchEvent(new MouseEvent('mousedown', opts));
          primeira.dispatchEvent(new MouseEvent('mouseup', opts));
          primeira.dispatchEvent(new MouseEvent('click', opts));
          primeira.click();
        } catch(_) { primeira.click(); }
        const antigos = snapshotCnjs();
        await esperarNovaPagina(antigos, ESPERA_PAGINA_MS);
      }
      pagina = 1;
      await esperarEstabilizar(4000, 700);
      while (pagina <= MAX_PAGINAS) {
        const inicio = Date.now();
        while (!frameTemSpansDeProcesso() && (Date.now() - inicio < ESPERA_PAGINA_MS)) {
          await new Promise(function(r) { setTimeout(r, 300); });
        }
        if (!frameTemSpansDeProcesso()) break;
        btnEncontrado = checarAtual();
        if (btnEncontrado) return btnEncontrado;
        console.log('[PJM auto-open] FALLBACK: pagina', pagina, 'sem CNJ');
        const antigos = snapshotCnjs();
        const clicou = clicarProximaPagina();
        if (!clicou) break;
        const mudou = await esperarNovaPagina(antigos, ESPERA_PAGINA_MS);
        if (!mudou) break;
        pagina++;
        await esperarEstabilizar(4000, 700);
      }
    }

    console.warn('[PJM auto-open] CNJ nao encontrado em nenhuma pagina.');
    return null;
  }

  async function executarPedido(cnj, paginaAlvo, fecharAposAbrir) {
    console.log('[PJM auto-open] Buscando CNJ', cnj, paginaAlvo ? '(esperado na pag.' + paginaAlvo + ')' : '(pagina nao informada)');
    const btn = await buscarComPaginacao(cnj, paginaAlvo);
    if (!btn) {
      console.warn('[PJM auto-open] CNJ nao encontrado em nenhuma pagina.');
      if (fecharAposAbrir) pedirFechamentoDaAba(2000);
      return;
    }
    console.log('[PJM auto-open] Botao encontrado. Esperando 500ms e clicando 1x...');
    setTimeout(function() {
      clickRobustoAngular(btn);
      console.log('[PJM auto-open] Click unico disparado.');
      if (fecharAposAbrir) {
        // Espera o popup dos autos abrir (~2s) antes de fechar esta aba.
        pedirFechamentoDaAba(2500);
      }
    }, 500);
  }

  // Manda mensagem ao background para fechar a aba atual apos delayMs
  function pedirFechamentoDaAba(delayMs) {
    setTimeout(function() {
      try {
        chrome.runtime.sendMessage({ type: 'PJM_FECHAR_ABA' }, function(resp) {
          if (resp && resp.ok) console.log('[PJM auto-open] Aba sera fechada pelo background');
          else console.warn('[PJM auto-open] Falha ao pedir fechamento:', resp && resp.error);
        });
      } catch (e) {
        console.warn('[PJM auto-open] Erro ao mandar PJM_FECHAR_ABA:', e);
      }
    }, delayMs || 2000);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Modo sequencial: abre autos de vários processos em ordem, dentro
  // da mesma aba de tarefa, sem abrir várias abas simultâneas.
  // ─────────────────────────────────────────────────────────────────────
  async function executarSequencia(seq) {
    var cnjs = seq.cnjs || [];
    if (!cnjs.length) return;
    console.log('[PJM auto-open] Sequência: ' + cnjs.length + ' processo(s)');

    // Aguarda a lista carregar (spans aparecerem)
    var inicio0 = Date.now();
    while (!frameTemSpansDeProcesso() && Date.now() - inicio0 < 30000) {
      await new Promise(function(r){ setTimeout(r, 300); });
    }
    if (!frameTemSpansDeProcesso()) {
      console.warn('[PJM auto-open] Sequência: spans não apareceram, abortando');
      pedirFechamentoDaAba(500);
      return;
    }

    for (var i = 0; i < cnjs.length; i++) {
      var item = cnjs[i];
      console.log('[PJM auto-open] Sequência [' + (i+1) + '/' + cnjs.length + '] CNJ:', item.cnj);

      // Reseta para página 1 antes de cada busca (exceto a primeira)
      if (i > 0) {
        var primeiraBtn = document.querySelector(
          PJM_SEL.PAG_FIRST
        );
        if (primeiraBtn) {
          var antigos = snapshotCnjs();
          clickRobustoAngular(primeiraBtn);
          await esperarNovaPagina(antigos, 8000);
          await esperarEstabilizar(3000, 600);
        }
      }

      var btn = await buscarComPaginacao(item.cnj, item.pagina);
      if (!btn) {
        console.warn('[PJM auto-open] Sequência: CNJ não encontrado:', item.cnj);
        continue;
      }

      clickRobustoAngular(btn);
      console.log('[PJM auto-open] Sequência: autos abertos para', item.cnj);
      // Registra abertura no relatório
      try { chrome.runtime.sendMessage({ type: 'PJM_REGISTRAR_ABERTURA', cnj: item.cnj }); } catch (_) { console.warn('[PJM auto-open]', _); }

      // Delay entre processos (exceto após o último)
      if (i < cnjs.length - 1) {
        await new Promise(function(r){ setTimeout(r, 2000); });
      }
    }

    console.log('[PJM auto-open] Sequência concluída. Fechando aba.');
    pedirFechamentoDaAba(1000);
  }

  var executando = false;

  function checarEExecutar() {
    if (!chrome.storage || !chrome.storage.local) return;
    if (executando) {
      console.log('[PJM auto-open] Ja em execucao, ignorando trigger duplicado');
      return;
    }

    chrome.storage.local.get(['pjmAtivo', STORAGE_KEY, STORAGE_KEY_SEQ], function(r) {
      if (r && r.pjmAtivo === false) {
        console.log('[PJM auto-open] Automacao inativa, ignorando pedido.');
        return;
      }

      const temSpans = frameTemSpansDeProcesso();
      const ehAngular = ehFramePjeFrontend();

      // ─ Modo sequencial (prioridade sobre modo individual) ─
      const seq = r && r[STORAGE_KEY_SEQ];
      if (seq && seq.cnjs && seq.cnjs.length) {
        if (Date.now() - seq.ts > TIMEOUT_SEQ) {
          chrome.storage.local.remove(STORAGE_KEY_SEQ);
          // não retorna: verifica também modo individual abaixo
        } else {
          if (!temSpans && !ehAngular) return; // frame errado, ignora
          if (!temSpans && ehAngular) {
            // Aguarda spans aparecerem no frame Angular
            let tent = 0;
            const intv = setInterval(function() {
              tent++;
              if (frameTemSpansDeProcesso()) {
                clearInterval(intv);
                chrome.storage.local.get(STORAGE_KEY_SEQ, function(r2) {
                  const s2 = r2 && r2[STORAGE_KEY_SEQ];
                  if (!s2 || !s2.cnjs) { console.log('[PJM auto-open] Sequência já consumida.'); return; }
                  executando = true;
                  chrome.storage.local.remove(STORAGE_KEY_SEQ, function() {
                    executarSequencia(s2).finally(function() { executando = false; });
                  });
                });
              } else if (tent >= 60) {
                clearInterval(intv);
                console.warn('[PJM auto-open] Sequência: spans nunca apareceram.');
              }
            }, 500);
            return;
          }
          // temSpans === true: consome e executa
          executando = true;
          chrome.storage.local.remove(STORAGE_KEY_SEQ, function() {
            executarSequencia(seq).finally(function() { executando = false; });
          });
          return;
        }
      }

      // ─ Modo individual ─
      const pedido = r && r[STORAGE_KEY];
      if (!pedido || !pedido.cnj || !pedido.ts) return;
      if (Date.now() - pedido.ts > TIMEOUT_MAX) {
        chrome.storage.local.remove(STORAGE_KEY);
        return;
      }

      if (!temSpans && !ehAngular) {
        console.log('[PJM auto-open] Pedido pendente mas este frame nao tem spans nem e Angular, ignorando.');
        return;
      }

      if (!temSpans && ehAngular) {
        console.log('[PJM auto-open] Frame Angular sem spans ainda, vou esperar carregar...');
        let tentativas = 0;
        const intervalo = setInterval(function() {
          tentativas++;
          if (frameTemSpansDeProcesso()) {
            clearInterval(intervalo);
            chrome.storage.local.get(STORAGE_KEY, function(r2) {
              const p2 = r2 && r2[STORAGE_KEY];
              if (!p2 || !p2.cnj) {
                console.log('[PJM auto-open] Pedido ja consumido por outro frame.');
                return;
              }
              console.log('[PJM auto-open] Consumindo pedido e executando...');
              executando = true;
              chrome.storage.local.remove(STORAGE_KEY, function() {
                executarPedido(p2.cnj, p2.pagina, p2.fecharAposAbrir).finally(function() { executando = false; });
              });
            });
          } else if (tentativas >= 60) {
            clearInterval(intervalo);
            console.warn('[PJM auto-open] Spans nunca apareceram neste frame Angular.');
          }
        }, 500);
        return;
      }

      console.log('[PJM auto-open] Pedido pendente:', pedido.cnj, '(frame com spans)');
      executando = true;
      chrome.storage.local.remove(STORAGE_KEY, function() {
        executarPedido(pedido.cnj, pedido.pagina, pedido.fecharAposAbrir).finally(function() { executando = false; });
      });
    });
  }

  function agendar() {
    setTimeout(checarEExecutar, PRIMEIRA_TENTATIVA_MS);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    agendar();
  } else {
    window.addEventListener('load', agendar);
  }

  window.addEventListener('hashchange', function() {
    // Se ja estamos executando um pedido, ignorar (cada paginacao muda a hash)
    if (executando) return;
    setTimeout(checarEExecutar, PRIMEIRA_TENTATIVA_MS);
  });

  // pop-up seria bloqueado por falta de gesto, e pede ao background para abrir
  // via chrome.tabs.create -- que ignora o bloqueador de pop-up.
  window.addEventListener('message', function (ev) {
    try {
      if (ev.origin !== location.origin) return;
      var d = ev.data;
      if (!d || d.__pjmOpenAutos == null) return;
      var u = String(d.__pjmOpenAutos);
      if (!/^https?:\/\/[^/]*\.jus\.br\//i.test(u)) return;
      chrome.runtime.sendMessage({ type: 'PJM_ABRIR_URL', url: u });
    } catch (_) { console.warn('[PJM auto-open]', _); }
  });

  console.log('[PJM auto-open v12.1] Carregado em', location.href.slice(0, 80));
})();
