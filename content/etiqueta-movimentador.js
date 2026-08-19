(function () {
  'use strict';

  // R-4: guard de reinjeção — evita observers/listeners duplicados se o script rodar 2x no mesmo documento
  if (window.__pjmEtiquetaMovLoaded) return;
  window.__pjmEtiquetaMovLoaded = true;

  const STORAGE_KEY = 'etiquetaComando';
  const TIMEOUT_MAX = 60000;

  // ─────────────────────────────────────────────────────────────────────
  // HUD flutuante
  // ─────────────────────────────────────────────────────────────────────
  var hudEl = null;

  function criarHud() {
    if (hudEl) return;
    hudEl = document.createElement('div');
    hudEl.id = 'pjm-etiqueta-hud';
    Object.assign(hudEl.style, {
      position: 'fixed', top: '16px', right: '16px', zIndex: '999999',
      padding: '12px 16px', borderRadius: '8px',
      fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '13px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      maxWidth: '360px', minWidth: '220px', lineHeight: '1.5', display: 'none',
    });
    document.body.appendChild(hudEl);
  }

  function mostrarHud(msg, tipo) {
    tipo = tipo || 'info';
    criarHud();
    var cores = {
      info:    ['#1a5276', 'white'],
      success: ['#1e8449', 'white'],
      warning: ['#7d6608', 'white'],
      error:   ['#922b21', 'white'],
    };
    var cor = cores[tipo] || cores.info;
    hudEl.style.background = cor[0];
    hudEl.style.color      = cor[1];
    hudEl.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:10px">' +
        '<span style="flex:1">' + msg + '</span>' +
        '<span id="pjm-hud-close" style="cursor:pointer;font-size:16px;opacity:.8;flex-shrink:0" title="Fechar">✕</span>' +
      '</div>';
    hudEl.style.display = 'block';
    hudEl.querySelector('#pjm-hud-close').addEventListener('click', function () {
      hudEl.style.display = 'none';
    });
    if (tipo === 'success') setTimeout(function () { if (hudEl) hudEl.style.display = 'none'; }, 8000);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Utilitários
  // ─────────────────────────────────────────────────────────────────────
  // ── Relatório: emite ação para o background gravar ───────────────────
  function pjmLogAcao(cnj, label, doc) {
    if (!cnj || !label) return;
    var _m = { type: 'PJM_LOG_ACAO', cnj: cnj, label: label };
    if (doc) _m.doc = doc;
    try { chrome.runtime.sendMessage(_m); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
  }

  /**
   * Extrai CNJ (20 dígitos) de qualquer texto, independente do formato de exibição.
   * Estratégia: divide o texto em segmentos de dígitos/separadores e retorna o
   * primeiro segmento que, após remover separadores, tenha exatamente 20 dígitos.
   * Cobre: "0600275-91.2025.6.26.0000", "0600275912025.6.26.0000", "06002759120256260000".
   */
  function extrairCnjDeTexto(texto) {
    var segmentos = (texto || '').match(/[\d.\-\/]+/g) || [];
    for (var _i = 0; _i < segmentos.length; _i++) {
      var _d = segmentos[_i].replace(/[^0-9]/g, '');
      if (_d.length === 20) return _d;
    }
    return null;
  }

  // Extrai CNJs de uma lista de containers DOM via extrairCnjDeTexto (texto completo do container)
  function pjmCnjsDeContainers(containers) {
    var cnjs = [];
    (containers || []).forEach(function(c) {
      var n = extrairCnjDeTexto(c.textContent);
      if (n && cnjs.indexOf(n) === -1) cnjs.push(n);
    });
    return cnjs;
  }

  // Descreve o documento de uma regra de comunicação para o Relatório ("Doc. do Processo").
  // Fonte: configuração da regra. DP (Documento do Processo) -> tipo do doc (ex.: "Decisão",
  // "Despacho"); DN (Documento Novo) -> "Modelo: <nome>". Retorna '' quando a regra não define.
  // GANCHO (fase 2 - valor real): quando preparar-comunicacao.js devolver o documento
  // efetivamente anexado (via prepComunicacaoStatus), preferir esse valor por CNJ aqui.
  function descreverDocRegra(r) {
    if (!r) return '';
    if (r.instrumento === 'DP') return String(r.tipoDocumento || '').trim();
    if (r.instrumento === 'DN') {
      var m = String(r.modeloDocumento || '').trim();
      return m ? 'Modelo: ' + m : '';
    }
    return '';
  }

  // Loga uma ação para um CNJ específico ou para múltiplos CNJs em uma única operação
  // (PJM_LOG_ACOES_MULTI evita race condition de múltiplos sendMessage simultâneos)
  function pjmLogAcaoMulti(cnjOuNull, containersOuCnjs, label, doc, docsReais, docsStatus, docsBase) {
    if (!label) return;
    if (cnjOuNull) {
      pjmLogAcao(cnjOuNull, label, doc);
      return;
    }
    var lista = Array.isArray(containersOuCnjs) ? containersOuCnjs : [];
    var cnjs = [];
    lista.forEach(function(item) {
      var n = null;
      if (typeof item === 'string') {
        n = item;
      } else if (item && item.textContent !== undefined) {
        // Elemento DOM — extrai CNJ do texto completo
        n = extrairCnjDeTexto(item.textContent);
      }
      if (n && cnjs.indexOf(n) === -1) cnjs.push(n);
    });
    if (cnjs.length === 0) return;
    // Uma única mensagem grava todos os CNJs atomicamente no background
    try {
      chrome.runtime.sendMessage({ type: 'PJM_LOG_ACOES_MULTI', cnjs: cnjs, label: label, doc: doc || '', docsReais: docsReais || {}, docsStatus: docsStatus || {}, docsBase: docsBase || {} }, function() {});
    } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
  }

  function norm(s) {
    return (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  }

  function aguardar(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // ----- Contexto canonico do PJe (correcao da regressao pos-atualizacao) -----
  // Na origem crua (pje-frontend.tse.jus.br/#/...) o app Angular monta a base da
  // API como "null" -> null/seam/... -> HTTP 405 e a lista da tarefa nao carrega.
  // Estas funcoes detectam contexto valido e descobrem/persistem a base canonica
  // (ex.: https://pje.tre-sp.jus.br/pje) para reentrar por ela.
  var BASE_CANONICA_PADRAO = 'https://pje.tre-sp.jus.br/pje';
  var BASE_KEY = 'pjmBaseCanonica';

  function ehContextoValido() {
    try {
      if (/pje-frontend\.tse\.jus\.br$/i.test(location.hostname) &&
          !/^\/[^/]+\//.test(location.pathname)) return false;
      return /^\/[^/]+\/(?:ng2\/dev\.seam|Processo\/|seam\/)/.test(location.pathname) ||
             /\/pje\//.test(location.pathname);
    } catch (_) { return true; }
  }

  function capturarBaseCanonica() {
    try {
      var m = location.pathname.match(/^\/([^/]+)\/(?:ng2\/dev\.seam|Processo\/|seam\/)/);
      if (m && !/pje-frontend/i.test(location.hostname)) {
        var base = location.origin + '/' + m[1];
        try { localStorage.setItem(BASE_KEY, base); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
        try { sessionStorage.setItem(BASE_KEY, base); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
        return base;
      }
    } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
    return '';
  }

  function pjeBaseCanonica() {
    var cap = capturarBaseCanonica();
    if (cap) return cap;
    try { var pp = localStorage.getItem(BASE_KEY) || sessionStorage.getItem(BASE_KEY); if (pp) return pp; } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
    try {
      if (document.referrer) {
        var u = new URL(document.referrer);
        var mm = u.pathname.match(/^\/([^/]+)\//);
        if (mm && !/pje-frontend/i.test(u.hostname)) return u.origin + '/' + mm[1];
      }
    } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
    return BASE_CANONICA_PADRAO;
  }

  /**
   * Aguarda um elemento aparecer no DOM e satisfazer uma condição opcional.
   * Resolve com o elemento ou rejeita com timeout.
   */
  function aguardarElemento(seletor, condicao, timeout) {
    timeout = timeout || 8000;
    return new Promise(function (resolve, reject) {
      var inicio = Date.now();
      function check() {
        var el = document.querySelector(seletor);
        if (el && (!condicao || condicao(el))) { resolve(el); return; }
        if (Date.now() - inicio > timeout) { reject(new Error('Timeout: ' + seletor)); return; }
        setTimeout(check, 200);
      }
      check();
    });
  }

  /**
   * Extrai nomes das etiquetas de um container de processo.
   * Ignora spans de botão (icon-desvincular-tag).
   */
  function etiquetasDoContainer(container) {
    var result = [];
    if (!container) return result;
    container.querySelectorAll('div.label.label-info.label-etiqueta').forEach(function (div) {
      div.querySelectorAll('span').forEach(function (s) {
        if ((s.className || '').includes('icon-desvincular-tag')) return;
        var nome = (s.textContent || '').trim();
        if (nome && nome.length > 1) result.push(nome);
      });
    });
    return result.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  /**
   * Clica via element.click() — único método que o Angular Zone.js reconhece
   * (dispatchEvent com MouseEvent sintético NÃO funciona).
   */
  function clickRobusto(el) {
    if (!el) return;
    try { el.click(); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
  }

  /**
   * Verifica se o checkbox do processo já está marcado.
   * Indicador: i.marcar-todos.fa-check-square dentro do button.botao-selecionar.
   */
  function jaSelecionado(container) {
    var dc = container.closest('div.datalist-content') || container.parentElement;
    if (!dc) return false;
    return !!dc.querySelector(PJM_SEL.ETQ_MARCADO);
  }

  /**
   * Marca o checkbox do processo clicando em button.botao-selecionar.
   * NÃO usa a.selecionarProcesso (que abre o painel individual e navega).
   *
   * Estrutura confirmada:
   *   div.datalist-content
   *     div.selecionarProcesso.pull-left  ← coluna do checkbox
   *       button.botao-selecionar         ← ESTE elemento
   *         i.far.marcar-todos.fa-square
   *     div.col-sm-11                     ← container recebido
   */
  function selecionarProcesso(container) {
    var dc = container.closest('div.datalist-content') || container.parentElement;
    if (!dc) return false;
    if (jaSelecionado(container)) return true;
    var btn = dc.querySelector(PJM_SEL.ETQ_CHECKBOX);
    if (!btn) return false;
    clickRobusto(btn);
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Movimentação em lote
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Abre o modal "Movimentação em lote", tenta cada destino em ordem e usa
   * o primeiro que existir no dropdown de transições da tarefa atual.
   *
   * @param {string[]} destinos - Lista de destinos em ordem de prioridade
   *   Ex: ["Nada mais a cumprir", "Registrar trânsito em julgado"]
   *   O sistema usa o PRIMEIRO que aparecer no dropdown da tarefa atual.
   * @returns {Promise<boolean>}
   */
  async function dispararMovimentacaoLote(destinos) {
    // 1. Localizar e clicar no botão de movimentação em lote
    // O botão é ícone-only (sem texto): title="Movimentar em lote"
    mostrarHud('⏳ Abrindo movimentação em lote...', 'info');

    var btnLote = document.querySelector(
      'button[title="Movimentar em lote"], button[data-target="#modalMovimentarEmLote"]'
    );
    if (!btnLote) {
      mostrarHud('❌ Botão de movimentação em lote não encontrado. Os processos foram selecionados?', 'error');
      return false;
    }
    btnLote.click();

    // 2. Aguardar modal abrir
    var modal;
    try {
      modal = await aguardarElemento(PJM_SEL.ETQ_MODAL, function (el) {
        return el.classList.contains('in') || (el.style.display || '').includes('block');
      }, 6000);
    } catch (e) {
      mostrarHud('❌ Modal "Movimentação em lote" não abriu.', 'error');
      return false;
    }
    await aguardar(700); // aguardar Angular iniciar renderização

    // 3. Selecionar transição — aguarda opções carregarem (Angular pode demorar > 1s)
    var sel = modal.querySelector(PJM_SEL.ETQ_TRANSICOES);
    if (!sel) {
      mostrarHud('❌ Select de transições não encontrado no modal.', 'error');
      return false;
    }

    var opcoesDisponiveis = [];
    for (var _tentOpc = 0; _tentOpc < 10 && opcoesDisponiveis.length === 0; _tentOpc++) {
      opcoesDisponiveis = Array.from(sel.options).filter(function (o) { return o.value; });
      if (opcoesDisponiveis.length === 0) await aguardar(500);
    }

    var opcao = null;
    var destinoUsado = '';
    for (var d = 0; d < destinos.length; d++) {
      var destNorm = norm(destinos[d]);
      opcao = opcoesDisponiveis.find(function (o) {
        return norm(o.text) === destNorm ||
               norm(o.text).includes(destNorm) ||
               destNorm.includes(norm(o.text));
      });
      if (opcao) { destinoUsado = destinos[d]; break; }
    }

    if (!opcao) {
      // Transição não disponível nesta tarefa — fechar o modal e retornar null
      // (null = "não disponível aqui", distinto de false = "erro real")
      var btnFecharModal = Array.from(modal.querySelectorAll('button')).find(function (b) {
        return norm(b.textContent) === 'fechar' || b.classList.contains('close');
      });
      if (btnFecharModal) btnFecharModal.click();
      return null; // sinaliza "não disponível nesta tarefa"
    }

    mostrarHud('⏳ Selecionando: ' + opcao.text + '...', 'info');

    // Setar valor + disparar event change para Angular NgModel reconhecer
    sel.value = opcao.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await aguardar(400);

    // 4. Clicar "Movimentar" dentro do modal
    var btnMovimentar = Array.from(modal.querySelectorAll('button')).find(function (b) {
      return norm(b.textContent) === 'movimentar' && !b.classList.contains('close');
    });
    if (!btnMovimentar) {
      mostrarHud('❌ Botão "Movimentar" não encontrado no modal.', 'error');
      return false;
    }
    btnMovimentar.click();
    mostrarHud('⏳ Processando movimentação...', 'info');

    // 5. Aguardar conclusão REAL do servidor: progress bar atingindo 100%.
    //    ATENÇÃO: button.disabled ocorre IMEDIATAMENTE após o clique (proteção
    //    Angular contra duplo envio) e NÃO indica que o servidor terminou.
    //    A progress bar só chega a 100% quando a API responde para cada item.
    try {
      await aguardarElemento(PJM_SEL.ETQ_MODAL, function (el) {
        // Critério primário: progress bar em 100% (aria-valuenow ou style.width)
        var bar = el.querySelector('.progress-bar');
        if (bar) {
          var v = parseInt(bar.getAttribute('aria-valuenow') || '0');
          var w = parseFloat(bar.style.width || '0');
          if (v >= 100 || w >= 100) return true;
        }
        // Critério secundário: botão disabled + pelo menos 1 ícone de resultado
        // (check ou erro) — indica que o servidor devolveu ao menos 1 resposta
        var btn = el.querySelector('button:not(.close)');
        if (btn && btn.disabled) {
          var icones = el.querySelectorAll(
            '.glyphicon-ok, .glyphicon-remove, .fa-check, .fa-times, ' +
            '[class*="check-circle"], [class*="ok-circle"], .text-success, .text-danger'
          );
          if (icones.length > 0) return true;
        }
        return false;
      }, 30000);
    } catch (e) {
      // Timeout — servidor demorou mais que 30s; prossegue com estado atual
      console.warn('[PJM Etiqueta] Timeout aguardando conclusão da movimentação no servidor.');
    }

    await aguardar(500); // buffer curto; a conclusão REAL já foi confirmada acima (progress bar 100%)

    // 6. Fechar modal automaticamente clicando em "Fechar"
    var btnFechar = Array.from(modal.querySelectorAll('button')).find(function (b) {
      return norm(b.textContent) === 'fechar' && !b.disabled;
    });
    if (btnFechar) {
      btnFechar.click();
    }

    return destinoUsado;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Seleção de processos por etiqueta + movimentação
  // ─────────────────────────────────────────────────────────────────────
  function frameTemProcessos() {
    return document.querySelectorAll(PJM_SEL.NUM_PROCESSO).length > 0;
  }

  /**
   * Varre o DOM ao vivo e retorna os containers de processos que casam com
   * as regras do grupo informado. Sempre usa referências DOM frescas.
   */
  function scanGrupo(regrasDoGrupo) {
    return scanGrupoFiltrado(regrasDoGrupo, null);
  }

  // Quando cnj é fornecido, restringe a busca ao processo com aquele número.
  function scanGrupoFiltrado(regrasDoGrupo, cnj) {
    var containers = [];
    var visitados = new Set();

    document.querySelectorAll(PJM_SEL.NUM_PROCESSO).forEach(function (elNum) {
      var container = elNum.closest('div.col-sm-11')
                   || elNum.closest('div[class*="col-sm-11"]')
                   || elNum.parentElement;
      if (!container) return;
      if (visitados.has(container)) return;
      visitados.add(container);

      // Filtro por CNJ: ignora processos que não correspondem ao alvo
      if (cnj) {
        var numText = String(elNum.textContent || '').replace(/[^0-9]/g, '');
        if (numText !== cnj) return;
      }

      var etiquetas = etiquetasDoContainer(container);
      var casou = regrasDoGrupo.some(function (regra) {
        // Se cnj especificado, etiqueta é opcional — o CNJ já identifica o processo
        // unicamente (ex.: etiqueta recém-inserida via REST que ainda não renderizou).
        if (cnj) return true;
        var etqNorm = norm(regra.etiqueta);
        return etiquetas.some(function (e) {
          return norm(e) === etqNorm || norm(e).includes(etqNorm);
        });
      });
      if (casou) containers.push(container);
    });

    return containers;
  }

  /**
   * Aguarda a lista de processos do PJe estabilizar após um movimento.
   * Verifica se o número de spans parou de mudar por 700ms.
   */
  async function aguardarListaEstabilizar(maxMs) {
    maxMs = maxMs || 5000;
    var inicio = Date.now();
    var snapshotAnterior = document.querySelectorAll(PJM_SEL.NUM_PROCESSO).length;
    var estavelDesde = Date.now();

    while (Date.now() - inicio < maxMs) {
      await aguardar(200);
      var atual = document.querySelectorAll(PJM_SEL.NUM_PROCESSO).length;
      if (atual !== snapshotAnterior) {
        snapshotAnterior = atual;
        estavelDesde = Date.now();
      } else if (Date.now() - estavelDesde >= 700) {
        // Com processos visíveis: estável → retornar imediatamente
        if (atual > 0) return;
        // Sem processos: aguardar ao menos 1500ms desde o início antes de aceitar
        // lista vazia — evita falso-estável logo após navegação quando o Angular
        // ainda não terminou de renderizar os cards de processos.
        if (Date.now() - inicio >= 1500) return;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Pipeline: navegação e execução em cadeia
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Navega para uma tarefa do PJe dentro do card "Minhas Tarefas".
   *
   * Estratégia:
   *  1. Vai ao dashboard (#/painel-usuario-interno).
   *  2. Aguarda o card "Minhas Tarefas" carregar (links com "lista-minhas-tarefas").
   *  3. Procura o link APENAS dentro do card "Minhas Tarefas" — identifica o card
   *     pelo heading cujo texto normalizado contém "minhas tarefas", ou, como
   *     fallback, usa o selector direto a[href*="lista-minhas-tarefas"], a[href*="lista-tarefas"]:not([href*="lista-minhas-tarefas"]).
   *  4. Clica no link da tarefa alvo (até 4 tentativas).
   */
  /**
   * Navega para o Painel Principal clicando em um link real do PJe,
   * garantindo que o AngularJS reinicializa o componente e busca dados frescos.
   * Fallback: se não houver link clicável, força re-entrada na rota via hash bounce.
   */
  async function navegarPainelPrincipal() {
    var pathname = location.pathname;
    var ehSeamJSF = pathname.indexOf('.seam') !== -1 &&
                    pathname.indexOf('ng2/dev.seam') === -1;

    if (ehSeamJSF) {
      var partes = pathname.split('/');
      var contexto = partes.length >= 2 ? '/' + partes[1] : '';
      location.href = location.origin + contexto + '/ng2/dev.seam#/painel-usuario-interno';
      await aguardar(5000); // aguarda navegação (contexto JS será destruído em seguida)
    } else {
      // Já no Angular — reload para dados frescos (evita cache do roteador)
      if (!ehContextoValido()) {
        // Origem crua (pje-frontend sem contexto): NAO recarregar aqui -- rebota
        // o app sem contexto -> null/seam/... -> 405. Reentrar pela base canonica
        // navegando a janela TOP (recarrega a aba inteira ja com /pje/).
        var alvoCanon = pjeBaseCanonica() + '/ng2/dev.seam#/painel-usuario-interno';
        console.log('[PJM] navegarPainelPrincipal: contexto ausente -- reentrando por', alvoCanon);
        try {
          if (window.top && window.top !== window) { window.top.location.href = alvoCanon; }
          else { location.href = alvoCanon; }
        } catch (e) {
          try { location.href = alvoCanon; } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
        }
        await aguardar(5000);
        return;
      }
      location.hash = '#/painel-usuario-interno';
      await aguardar(100);
      location.reload();
    }
  }

  async function navegarParaTarefa(nomeTarefa, forcarCompleto) {
    var normNome = norm(nomeTarefa);

    // Caminho rápido: se já estamos em alguma página de lista de tarefas
    // (url contém lista-minhas-tarefas), tenta clicar o link diretamente
    // sem passar pelo painel principal — elimina navegação redundante entre
    // processos consecutivos na FASE 2 do "Executar tudo".
    // Se o link não for encontrado, cai no fluxo completo abaixo.
    // forcarCompleto=true PULA o atalho — necessário quando acabamos de MOVER um
    // processo para esta tarefa (a lista cacheada ainda não o mostra).
    if (!forcarCompleto && document.querySelector('a[href*="lista-minhas-tarefas"], a[href*="lista-tarefas"]:not([href*="lista-minhas-tarefas"])')) {
      await aguardar(300);
      var hrefsVistosRapido = new Set();
      var encontrouRapido = false;
      document.querySelectorAll('a[href*="lista-minhas-tarefas"], a[href*="lista-tarefas"]:not([href*="lista-minhas-tarefas"])').forEach(function(link) {
        if (encontrouRapido) return;
        var href = link.getAttribute('href') || '';
        if (hrefsVistosRapido.has(href)) return;
        hrefsVistosRapido.add(href);
        var spanNome = link.querySelector('span.nome');
        if (!spanNome) return;
        var textoNome = norm(spanNome.textContent);
        if (textoNome === normNome || textoNome.includes(normNome) || normNome.includes(textoNome)) {
          link.click();
          encontrouRapido = true;
        }
      });
      if (encontrouRapido) {
        console.log('[PJM] navegarParaTarefa: caminho rápido — clicando diretamente sem ir ao painel.');
        return true;
      }
      console.log('[PJM] navegarParaTarefa: caminho rápido falhou; prosseguindo com navegação completa.');
    }

    // 1. Ir ao dashboard
    location.hash = '#/painel-usuario-interno';

    // 2. Aguardar links de "Minhas Tarefas" aparecerem
    try {
      await aguardarElemento('a[href*="lista-minhas-tarefas"], a[href*="lista-tarefas"]:not([href*="lista-minhas-tarefas"]) span.nome', null, 8000);
    } catch (e) {
      return false;
    }
    await aguardar(1000); // settle do dashboard (links já confirmados acima; loop de 15 tentativas abaixo compensa)

    // 3. Tentar encontrar e clicar no link (até 4 tentativas)
    var TENTATIVAS_MAX = 15;
    for (var tentativa = 0; tentativa < TENTATIVAS_MAX; tentativa++) {
      if (tentativa > 0) await aguardar(1200);

      // Identificar o container do card "Minhas Tarefas" para restringir a busca
      var cardMinhasTarefas = null;
      document.querySelectorAll(
        'h3, h4, .card-header, [class*="titulo-card"], [class*="nome-agrupamento"], .label-agrupamento'
      ).forEach(function(h) {
        if (cardMinhasTarefas) return;
        if (norm(h.textContent).includes('minhas tarefas')) {
          // O card é o ancestral mais próximo que contém os links de tarefa
          var ancestor = h.parentElement;
          while (ancestor && ancestor !== document.body) {
            if (ancestor.querySelector('a[href*="lista-minhas-tarefas"], a[href*="lista-tarefas"]:not([href*="lista-minhas-tarefas"])')) {
              cardMinhasTarefas = ancestor;
              break;
            }
            ancestor = ancestor.parentElement;
          }
        }
      });

      // Escopo da busca: card identificado, ou document como fallback
      var scope = cardMinhasTarefas || document;

      var hrefsVistos = new Set();
      var encontrou = false;
      scope.querySelectorAll('a[href*="lista-minhas-tarefas"], a[href*="lista-tarefas"]:not([href*="lista-minhas-tarefas"])').forEach(function(link) {
        if (encontrou) return;
        var href = link.getAttribute('href') || '';
        if (hrefsVistos.has(href)) return;
        hrefsVistos.add(href);

        var spanNome = link.querySelector('span.nome');
        if (!spanNome) return;
        var textoNome = norm(spanNome.textContent);
        if (textoNome === normNome || textoNome.includes(normNome) || normNome.includes(textoNome)) {
          link.click();
          encontrou = true;
        }
      });

      if (encontrou) return true;
      console.log('[PJM] navegarParaTarefa: tentativa', tentativa + 1, '— "' + nomeTarefa + '" não encontrada em Minhas Tarefas, aguardando...');
    }

    return false;
  }

  /**
   * Aguarda a lista de processos carregar após uma navegação.
   */
  async function aguardarProcessosCarregar(timeout) {
    timeout = timeout || 10000;
    var inicio = Date.now();
    while (Date.now() - inicio < timeout) {
      await aguardar(400);
      if (frameTemProcessos()) {
        await aguardarListaEstabilizar(2000);
        return true;
      }
    }
    return false;
  }

  /**
   * Aguarda qualquer indicador de etiquetas na página (compatível com ambas as estruturas).
   * Resolve com 'dropdown' ou 'chip' dependendo do que aparecer primeiro.
   * Rejeita se nenhum for encontrado dentro do timeout.
   */
  function aguardarEtiquetasProntas(timeout) {
    return new Promise(function(resolve, reject) {
      var inicio = Date.now();
      var timer = setInterval(function() {
        if (document.querySelector('#btn-gerenciar-etiquetas')) {
          clearInterval(timer);
          resolve('dropdown');
        } else if (document.querySelector('.label-etiqueta')) {
          clearInterval(timer);
          resolve('chip');
        } else if (Date.now() - inicio >= timeout) {
          clearInterval(timer);
          reject(new Error('timeout'));
        }
      }, 250);
    });
  }

  /**
   * Remove a etiqueta indicada de todos os processos visíveis na página atual.
   *
   * Suporta duas estruturas DOM do PJe:
   *
   * ESTRUTURA A — Dropdown (ex: "Analisar determinação"):
   *   Cada card tem #btn-gerenciar-etiquetas que abre dropdown com
   *   tr.ng-star-inserted > td.col-md-11 (nome) + button.botao-selecionar.check-etiqueta
   *
   * ESTRUTURA B — Chip direto (ex: "Preparar comunicação"):
   *   Etiquetas visíveis como div.label-etiqueta > span (nome) + span.icon-desvincular-tag
   */
  async function removerEtiquetaDeProcessos(nomeEtiqueta, cnj) {
    if (!nomeEtiqueta) return;

    // No PJe a remocao e feita clicando o X do chip individualmente (NAO ha
    // selecao em lote para REMOVER). Por isso o chip e o caminho primario;
    // o dropdown (#btn-gerenciar-etiquetas) fica so como fallback.
    if (document.querySelector('.label-etiqueta') || document.querySelector('span.icon-desvincular-tag')) {
      await removerPorChip(nomeEtiqueta, cnj);
    } else if (document.querySelector('#btn-gerenciar-etiquetas')) {
      await removerPorDropdown(nomeEtiqueta, cnj);
    } else {
      mostrarHud('⚠️ Estrutura de etiquetas não reconhecida na página atual.', 'warning');
    }
  }

  /**
   * Remoção via dropdown (#btn-gerenciar-etiquetas).
   * Estrutura: abre dropdown por processo, busca tr visível com nome, clica check.
   */
  async function removerPorDropdown(nomeEtiqueta, cnj) {
    var todosBtn = Array.from(document.querySelectorAll('#btn-gerenciar-etiquetas'));
    // Se cnj especificado, restringe ao processo com esse número
    var btnsGerenciar = cnj ? todosBtn.filter(function(btn) {
      var container = btn.closest('div.col-sm-11') || btn.closest('div[class*="col-sm-11"]') || btn.parentElement;
      if (!container) return false;
      var spanNum = container.querySelector(PJM_SEL.NUM_PROCESSO);
      if (!spanNum) return false;
      return String(spanNum.textContent || '').replace(/[^0-9]/g, '') === cnj;
    }) : todosBtn;
    if (btnsGerenciar.length === 0) {
      mostrarHud('⚠️ Nenhum processo visível para remover etiqueta "' + nomeEtiqueta + '".', 'warning');
      return;
    }

    mostrarHud('🏷️ [Dropdown] Removendo "' + nomeEtiqueta + '" de ' + btnsGerenciar.length + ' processo(s)...', 'info');

    var removidos = 0;
    var semEtiqueta = 0;

    for (var i = 0; i < btnsGerenciar.length; i++) {
      var btnGerenciar = btnsGerenciar[i];

      // Abrir painel de etiquetas deste processo
      btnGerenciar.click();
      await aguardar(600);

      // Buscar linhas VISÍVEIS (offsetParent !== null) com o nome da etiqueta alvo
      var linhaAlvo = null;
      var todasLinhas = document.querySelectorAll('tr.ng-star-inserted');
      for (var j = 0; j < todasLinhas.length; j++) {
        var linha = todasLinhas[j];
        if (linha.offsetParent === null) continue;
        var tdNome = linha.querySelector('td.col-md-11');
        if (!tdNome || tdNome.textContent.trim() !== nomeEtiqueta) continue;
        linhaAlvo = linha;
        break;
      }

      if (!linhaAlvo) {
        semEtiqueta++;
        document.body.click();
        await aguardar(300);
        continue;
      }

      var btnCheck = linhaAlvo.querySelector(PJM_SEL.ETQ_CHECK_ETIQUETA);
      if (!btnCheck || !btnCheck.querySelector('.fa-check-square')) {
        semEtiqueta++;
        document.body.click();
        await aguardar(300);
        continue;
      }

      btnCheck.click();
      await aguardar(700);
      removidos++;
      document.body.click();
      await aguardar(400);
    }

    mostrarHud(
      '🏷️ Etiqueta "' + nomeEtiqueta + '": <strong>' + removidos + '</strong> removida(s)' +
      (semEtiqueta > 0 ? ' (' + semEtiqueta + ' processo(s) sem essa etiqueta)' : '') + '.',
      removidos > 0 ? 'success' : 'info'
    );
  }

  /**
   * Remoção via chip direto (div.label-etiqueta).
   * Estrutura: chips visíveis nos cards; cada chip tem span.icon-desvincular-tag para remover.
   */
  async function removerPorChip(nomeEtiqueta, cnj) {
    var tituloX = 'Excluir etiqueta ' + nomeEtiqueta;

    function containerDe(el) {
      return el.closest('div.col-sm-11') || el.closest('div[class*="col-sm-11"]') || el.parentElement;
    }

    // Acha o X (icon-desvincular-tag) da etiqueta alvo dentro de um container.
    function acharXNoContainer(container) {
      if (!container) return null;
      var xs = container.querySelectorAll('span.icon-desvincular-tag, .icon-desvincular-tag');
      for (var k = 0; k < xs.length; k++) {
        var ti = (xs[k].getAttribute('title') || '').trim();
        if (ti === tituloX || (ti && ti.indexOf(nomeEtiqueta) !== -1)) return xs[k];
      }
      // Fallback: chip .label-etiqueta cujo nome casa -> seu X.
      var chips = container.querySelectorAll('.label-etiqueta');
      for (var c = 0; c < chips.length; c++) {
        var sn = chips[c].querySelector('span:first-child') || chips[c].querySelector('span');
        if (sn && sn.textContent.trim() === nomeEtiqueta) {
          var x = chips[c].querySelector('.icon-desvincular-tag');
          if (x) return x;
          var sp = chips[c].querySelectorAll('span');
          if (sp.length > 1) return sp[sp.length - 1];
        }
      }
      return null;
    }

    // Coleta os CNJs dos processos-alvo ANTES do loop. NAO guarda referencias
    // DOM: o Angular re-renderiza a lista a cada remocao (re-render in-place,
    // sem reload), invalidando elementos anteriores (bug: so o 1o era removido).
    function coletarCnjsAlvo() {
      var seen = {}, lista = [];
      document.querySelectorAll(PJM_SEL.NUM_PROCESSO).forEach(function(sn) {
        var num = String(sn.textContent || '').replace(/[^0-9]/g, '');
        if (!num || seen[num]) return;
        if (cnj && num !== cnj) return;
        if (acharXNoContainer(containerDe(sn))) { seen[num] = 1; lista.push(num); }
      });
      return lista;
    }

    // Re-localiza o container de um CNJ no DOM ATUAL (referencia fresca).
    function containerPorCnj(num) {
      var sns = document.querySelectorAll(PJM_SEL.NUM_PROCESSO);
      for (var i = 0; i < sns.length; i++) {
        if (String(sns[i].textContent || '').replace(/[^0-9]/g, '') === num) return containerDe(sns[i]);
      }
      return null;
    }

    var cnjsAlvo = coletarCnjsAlvo();
    if (cnjsAlvo.length === 0) {
      mostrarHud('ℹ️ Nenhum processo com etiqueta "' + nomeEtiqueta + '" encontrado.', 'info');
      return;
    }

    mostrarHud('🏷️ [Chip] Removendo "' + nomeEtiqueta + '" de ' + cnjsAlvo.length + ' processo(s)...', 'info');

    var removidos = 0, falhas = 0;
    for (var i = 0; i < cnjsAlvo.length; i++) {
      var num = cnjsAlvo[i];
      // Re-consulta o DOM a cada iteracao (evita refs obsoletas pos re-render).
      var btnX = acharXNoContainer(containerPorCnj(num));
      if (!btnX) { falhas++; continue; }
      btnX.click();
      // Aguarda o re-render e CONFIRMA que o X daquele processo sumiu.
      var saiu = false;
      for (var tent = 0; tent < 12; tent++) {
        await aguardar(250);
        if (!acharXNoContainer(containerPorCnj(num))) { saiu = true; break; }
      }
      if (saiu) removidos++; else falhas++;
    }

    mostrarHud(
      '🏷️ Etiqueta "' + nomeEtiqueta + '": <strong>' + removidos + '</strong> removida(s)' +
      (falhas > 0 ? ' (' + falhas + ' não confirmada(s))' : '') + '.',
      removidos > 0 ? 'success' : 'info'
    );
  }

  /**
   * Executa um pipeline completo para uma etiqueta.
   *
   * @param {string}   etiqueta      - nome da etiqueta
   * @param {Array}    passos        - [{ transicao, proximaTarefa }, ...]
   * @param {string}   tarefaInicial - navegar antes de iniciar (opcional)
   * @param {string}   tarefaFinal   - navegar após concluir (opcional)
   *
   * Cada passo:
   *   transicao    : texto exato da opção no select#transicoes do modal
   *   proximaTarefa: nome da tarefa onde o processo aparecerá após este movimento
   *                  (deixar vazio no último passo)
   */
  async function executarPipelineRegra(etiqueta, passos, tarefaInicial, tarefaFinal, cnj) {
    var totalMovidos = 0;
    var cnjsColetados = []; // CNJs dos processos processados, coletados no passo 0 após navegação

    // Navegar para tarefa inicial se configurada
    if (tarefaInicial) {
      mostrarHud('⏳ Navegando para tarefa inicial: "' + tarefaInicial + '"...', 'info');
      var navegouInicio = await navegarParaTarefa(tarefaInicial);
      if (!navegouInicio) {
        // Tarefa pode estar vazia (sem processos) e ausente da sidebar do PJe.
        // Verificar se há processos na página atual antes de desistir.
        mostrarHud('ℹ️ "' + tarefaInicial + '" não encontrada na sidebar. Tarefa provavelmente vazia.', 'info');
        await aguardar(1000);
        if (!frameTemProcessos()) {
          // Nada a fazer — encerrar silenciosamente
          return cnjsColetados;
        }
        // Há processos na página atual — continuar de onde estamos
        console.log('[PJM Pipeline] Continuando na página atual (tarefaInicial ausente da sidebar).');
      }
      var carregouInicio = await aguardarProcessosCarregar(12000);
      if (!carregouInicio) {
        mostrarHud('⚠️ Timeout aguardando "' + tarefaInicial + '" carregar. Tentando continuar...', 'warning');
      }
    }

    for (var p = 0; p < passos.length; p++) {
      var passo = passos[p];
      var numEtapa   = p + 1;
      var totalEtapas = passos.length;
      var isUltima   = p === passos.length - 1;

      mostrarHud(
        '⏳ Pipeline ' + numEtapa + '/' + totalEtapas +
        ': <em>"' + etiqueta + '"</em> → <strong>' + passo.transicao + '</strong>',
        'info'
      );

      if (passo.modo === 'individual') {
        // ── Modo individual: abre cada processo e executa a transição ───
        // CNJs são coletados DENTRO do loop (antes de cada clique) para capturar
        // processos que só ficam visíveis após outros serem movidos (paginação do PJe).
        var prefixo = 'Etapa ' + numEtapa + '/' + totalEtapas + ' ';
        var indRes = await _encaminhamentoIndividualLoop(passo.transicao, [etiqueta], prefixo, cnj);

        if (indRes.interrompido) {
          mostrarHud('❌ "' + passo.transicao + '" não disponível (etapa ' + numEtapa + ').', 'error');
          return cnjsColetados;
        }
        if (indRes.processados === 0 && indRes.erros === 0) {
          mostrarHud('ℹ️ Etapa ' + numEtapa + ': nenhum processo com "' + etiqueta + '" na tarefa.', 'info');
          return cnjsColetados;
        }
        totalMovidos += indRes.processados;
        // Incorpora CNJs dos processos movidos individualmente
        if (Array.isArray(indRes.cnjs)) {
          indRes.cnjs.forEach(function(n) {
            if (cnjsColetados.indexOf(n) === -1) cnjsColetados.push(n);
          });
        }
        console.log('[PJM Pipeline] Etapa', numEtapa, '(individual) — movidos:', indRes.processados, '— CNJs:', cnjsColetados);

      } else {
        // ── Modo lote (padrão) ──────────────────────────────────────────
        var containers = scanGrupoFiltrado([{ etiqueta: etiqueta }], cnj);

        // Passo 0: coleta CNJs no DOM antes de mover (processos saem da lista após movimentação)
        if (p === 0) {
          containers.forEach(function(c) {
            var n = extrairCnjDeTexto(c.textContent);
            if (n && cnjsColetados.indexOf(n) === -1) cnjsColetados.push(n);
          });
        }

        if (containers.length === 0) {
          mostrarHud(
            numEtapa === 1
              ? '⚠️ Nenhum processo com "' + etiqueta + '" nesta tarefa.'
              : 'ℹ️ Etapa ' + numEtapa + ': nenhum processo com "' + etiqueta + '" na tarefa atual.',
            'warning'
          );
          return cnjsColetados;
        }

        var selecionados = 0;
        containers.forEach(function (c) { if (selecionarProcesso(c)) selecionados++; });
        await aguardar(1000);

        var destinoUsado = await dispararMovimentacaoLote([passo.transicao]);

        if (destinoUsado) {
          totalMovidos += selecionados;
          console.log('[PJM Pipeline] Etapa', numEtapa, '— movidos:', selecionados, '→', destinoUsado);
        } else if (destinoUsado === null) {
          mostrarHud('ℹ️ "' + passo.transicao + '" não disponível nesta tarefa.', 'info');
          return cnjsColetados;
        } else {
          mostrarHud('❌ Erro na etapa ' + numEtapa + ' ao mover para "' + passo.transicao + '"', 'error');
          return cnjsColetados;
        }
      }

      // Navegar para a próxima tarefa (se não for a última etapa)
      if (!isUltima) {
        var proximaTarefa = passo.proximaTarefa;
        // Se vazio, usa a transição do próximo passo como destino (heurística:
        // após step N o processo vai para a tarefa cujo nome = transição do step N+1)
        if (!proximaTarefa && p + 1 < passos.length) {
          proximaTarefa = passos[p + 1].transicao || '';
        }
        if (!proximaTarefa) {
          mostrarHud('❌ "Próxima tarefa" não configurada na etapa ' + numEtapa, 'error');
          return cnjsColetados;
        }

        await aguardarListaEstabilizar(2000);
        mostrarHud('⏳ Navegando para "' + proximaTarefa + '"...', 'info');

        var navegou = await navegarParaTarefa(proximaTarefa);
        if (!navegou) {
          mostrarHud('❌ Tarefa "' + proximaTarefa + '" não encontrada no dashboard.', 'error');
          return cnjsColetados;
        }

        var carregou = await aguardarProcessosCarregar(10000);
        if (!carregou) {
          mostrarHud('⚠️ Timeout aguardando "' + proximaTarefa + '" carregar. Continuando...', 'warning');
        }
      }
    }

    mostrarHud(
      '✅ <strong>Pipeline concluído</strong> — ' + totalMovidos + ' processo(s) movimentado(s) em ' +
      passos.length + ' etapa(s)!',
      'success'
    );
    console.log('[PJM Pipeline] Concluído:', etiqueta, '—', totalMovidos, 'processos.');

    // Navegação final: tarefa indicada ou painel principal por padrão
    await aguardar(2000);
    if (tarefaFinal) {
      mostrarHud('⏳ Navegando para "' + tarefaFinal + '"...', 'info');
      var navFinal = await navegarParaTarefa(tarefaFinal);
      if (!navFinal) {
        mostrarHud('⚠️ Destino final "' + tarefaFinal + '" não encontrado na sidebar.', 'warning');
      }
    } else {
      await navegarPainelPrincipal();
    }
    return cnjsColetados;
  }

  // ─────────────────────────────────────────────────────────────────────

  // sinaliza conclusão sempre — evita pollStatus do overlay ficar preso
  // reqTs = ts do COMANDO que esta ação conclui. O painel (pollStatus) casa por reqTs===t0,
  // então o sinal só libera a ação certa — evita que um 2º executor (dreno/ação sobreposta)
  // libere o poll do painel cedo demais (quebra do serial descrita no docs).
  function sinalizarConcluido(reqTs) {
    try { chrome.storage.local.set({ etiquetaComandoStatus: { done: true, ts: Date.now(), reqTs: reqTs || 0 } }); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MOVER VIA REST — idêntico à extensão "PJe - Teste Mover" (content-cadeia.js).
  // Lista a caixa via API, RE-LISTA a cada salto e casa por idProcesso (estável).
  // Roda só no frame Angular (checarEExecutar garante) — que é o ngframe onde a
  // listagem responde. Só REST: transições que exigem formulário (despacho/minuta)
  // simplesmente não movem, exatamente como no Teste Mover. Não usa o modal nativo,
  // então nada fica "selado" na seleção do painel.
  // ═══════════════════════════════════════════════════════════════════════
  var USAR_MOVER_REST = true; 

  var _apiBaseRest = null;
  function apiBaseRest() {
    if (_apiBaseRest) return _apiBaseRest;
    try {
      var ents = performance.getEntriesByType('resource') || [];
      for (var i = 0; i < ents.length; i++) {
        var u = ents[i].name || '';
        if (/\/seam\/resource\/rest\/pje-legacy\/painelUsuario\//.test(u)) { _apiBaseRest = new URL(u).origin; return _apiBaseRest; }
      }
    } catch (_) { /* noop */ }
    try { if (window.PJeColetorAPI && window.PJeColetorAPI.detectarApiBase) { var b = window.PJeColetorAPI.detectarApiBase(); if (b) { _apiBaseRest = b; return _apiBaseRest; } } } catch (_) { /* noop */ }
    return location.origin;
  }
  function restUrlPU(suffix) { return apiBaseRest() + '/pje/seam/resource/rest/pje-legacy/painelUsuario/' + suffix; }
  function nomeSaidaDe(t) { return String((t && (t.nomeSaida || t.nome)) || '').trim(); }
  function digREST(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  var CRIT_REST = { numeroProcesso: "", classe: null, tags: [], tagsString: null, poloAtivo: null,
    poloPassivo: null, orgao: null, ordem: "DESC", page: 0, maxResults: 1000, idTaskInstance: null,
    apelidoSessao: null, idTipoSessao: null, dataSessao: null, somenteFavoritas: null, objeto: null,
    semEtiqueta: null, assunto: null, dataAutuacao: null, nomeParte: null, nomeFiltro: null,
    numeroDocumento: null, competencia: "", relator: null, orgaoJulgador: null, somenteLembrete: null,
    somenteSigiloso: null, eleicao: null, estado: null, municipio: null, prioridadeProcesso: null,
    cpfCnpj: null, porEtiqueta: null, conferidos: null, numeroProcessoReferencia: null,
    apresentaProcessoPrincipal: false, pedidoLiminarAntecipacaoTutela: false };

  // Quando o painel roda cross-site (pje-frontend -> pje.tre-sp) a sessão viaja no
  // x-pje-cookies. Reaproveita o mesmo mecanismo do coletor-api. Vazio = same-site (cookies).
  var _pjmApiHeaders = null;
  try {
    chrome.storage.local.get('pjmApiHeaders', function (r) { if (r && r.pjmApiHeaders) _pjmApiHeaders = r.pjmApiHeaders; });
    chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch.pjmApiHeaders && ch.pjmApiHeaders.newValue) _pjmApiHeaders = ch.pjmApiHeaders.newValue; });
  } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
  function restHeaders(extra) { return Object.assign({}, _pjmApiHeaders || {}, extra || {}); }

  // Lista os nomes EXATOS das tarefas do usuario (tarefas + favoritas), com cache.
  var _tarefasNomesCache = null;
  async function listarTarefasNomes() {
    if (_tarefasNomesCache) return _tarefasNomesCache;
    var nomes = [], body = JSON.stringify({ numeroProcesso: '', competencia: '', etiquetas: [] });
    var eps = ['tarefas', 'tarefasFavoritas'];
    for (var i = 0; i < eps.length; i++) {
      try {
        var r = await fetch(restUrlPU(eps[i]), { method: 'POST', credentials: 'include', headers: restHeaders({ 'Content-Type': 'application/json' }), body: body });
        var j = await r.json();
        (Array.isArray(j) ? j : (j && j.entities) || []).forEach(function (t) { var n = t && (t.nome || t.nomeTarefa); if (n) nomes.push(String(n)); });
      } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
    }
    _tarefasNomesCache = nomes;
    return nomes;
  }
  // Resolve o nome digitado na regra para o nome EXATO do servidor (ignora maiusc./acento/
  // espaco). Corrige "Verificar pendencias" vs "Verificar Pendencias". Sem match -> mantem.
  async function resolverNomeTarefa(nome) {
    var alvo = normTr(nome);
    if (!alvo) return nome;
    var nomes = await listarTarefasNomes();
    var hit = nomes.filter(function (n) { return normTr(n) === alvo; })[0];
    if (hit && hit !== nome) console.log('[PJM Mover REST] tarefa "' + nome + '" resolvida p/ "' + hit + '"');
    return hit || nome;
  }

  function listarCaixaREST(caixa) {
    return fetch(restUrlPU('recuperarProcessosTarefaPendenteComCriterios/' + encodeURIComponent(caixa) + '/true'),
      { method: 'POST', credentials: 'include', headers: restHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(CRIT_REST) })
      .then(function (r) { return r.json(); })
      .then(function (j) { return (j && j.entities) || []; })
      .catch(function () { return []; });
  }
  function temTransicaoREST(idTask, tr) {
    return fetch(restUrlPU('transicoes/' + encodeURIComponent(idTask)), { credentials: 'include', headers: restHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (ts) { var a = Array.isArray(ts) ? ts : (ts && ts.entities) || []; return a.some(function (x) { return nomeSaidaDe(x).toUpperCase() === String(tr).trim().toUpperCase(); }); })
      .catch(function () { return false; });
  }
  function moverUmREST(idTask, tr) {
    return fetch(restUrlPU('movimentar/' + encodeURIComponent(idTask) + '/' + encodeURIComponent(tr)), { credentials: 'include', mode: 'cors', headers: restHeaders() })
      .then(function (r) { return r.ok; })
      .catch(function () { return false; });
  }
  // Resolve o nomeSaida EXATO do servidor a partir do nome da regra (casa sem diferenciar
  // maiúsc./acento/espaço). Corrige mismatch tipo "Atos de comunicação" vs "Atos de Comunicação".
  function normTr(s) { return String(s || '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); }
  function resolverNomeSaida(idTask, trAlvo) {
    var alvo = normTr(trAlvo);
    return fetch(restUrlPU('transicoes/' + encodeURIComponent(idTask)), { credentials: 'include', headers: restHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (ts) {
        var a = Array.isArray(ts) ? ts : (ts && ts.entities) || [];
        var hit = a.filter(function (x) { return normTr(nomeSaidaDe(x)) === alvo; })[0];
        return { nome: hit ? nomeSaidaDe(hit) : '', disp: a.map(nomeSaidaDe).filter(Boolean) };
      })
      .catch(function () { return { nome: '', disp: [] }; });
  }
  // Caixa atualmente aberta no ngframe (hash Angular) — fallback quando a regra não fixa a caixa.
  function caixaAtualHash() {
    try { return decodeURIComponent((String(location.hash || '').match(/lista-(?:minhas-tarefas|processos-tarefa)\/([^/?#]+)/) || [])[1] || ''); } catch (_) { return ''; }
  }
  // Cadeia [{caixa, transicao}] a partir de uma regra + caixa de origem.
  function cadeiaDaRegra(regra, caixaOrigem) {
    var c0 = String(caixaOrigem || regra.tarefaInicial || caixaAtualHash() || '').trim();
    if (regra.pipeline && regra.pipeline.length) {
      return regra.pipeline.map(function (p, i) {
        var caixa = (i === 0) ? c0 : String((regra.pipeline[i - 1] || {}).proximaTarefa || '').trim();
        return { caixa: caixa, transicao: String(p.transicao || '').trim() };
      }).filter(function (h) { return h.transicao; });
    }
    if (regra.tarefaDestino) return [{ caixa: c0, transicao: String(regra.tarefaDestino).trim() }];
    return [];
  }
  // Move uma regra via REST (retorna string-resumo).
  async function moverRegraREST(regra, cnj, caixaOrigem) {
    var cadeia = cadeiaDaRegra(regra, caixaOrigem);
    if (!cadeia.length) return 'ℹ️ "' + regra.etiqueta + '": sem transição configurada';
    if (!cadeia[0].caixa) return '⚠️ "' + regra.etiqueta + '": sem caixa de origem (defina Tarefa inicial ou rode pela fila)';
    for (var _ci = 0; _ci < cadeia.length; _ci++) { cadeia[_ci].caixa = await resolverNomeTarefa(cadeia[_ci].caixa); }
    var etqAlvo = String(regra.etiqueta || '').trim().toUpperCase();
    var cnjDig = digREST(cnj);
    var ent = await listarCaixaREST(cadeia[0].caixa);
    var _n0 = ent.length;
    if (etqAlvo) ent = ent.filter(function (p) { return (p.tagsProcessoList || p.etiquetas || p.tags || []).some(function (t) { return String((t && (t.nomeTagCompleto || t.nomeTag || t.nome)) || t || '').trim().toUpperCase() === etqAlvo; }); });
    if (cnjDig) ent = ent.filter(function (p) { return digREST(p.numeroProcesso) === cnjDig; });
    console.log('[PJM Mover REST]', regra.etiqueta, '| base=', apiBaseRest(), '| caixa="' + cadeia[0].caixa + '" | listados=' + _n0 + ' | apósFiltro=' + ent.length + ' | etq="' + etqAlvo + '" cnj="' + (cnjDig || '') + '"');
    var vivos = ent.map(function (p) { return { idp: p.idProcesso }; });
    if (!vivos.length) return 'ℹ️ "' + regra.etiqueta + '": nenhum processo em "' + cadeia[0].caixa + '"' + (cnjDig ? ' (CNJ ' + cnj + ')' : '') + ' [listados=' + _n0 + ']';
    // SIMULAR (flag da regra): valida só o 1º salto, não move.
    if (regra.simular) {
      var mapA = {}; ent.forEach(function (p) { mapA[p.idProcesso] = p.idTaskInstance; });
      var okc = 0;
      for (var i = 0; i < vivos.length; i++) { if (await temTransicaoREST(mapA[vivos[i].idp], cadeia[0].transicao)) okc++; }
      return '🔎 Simular "' + regra.etiqueta + '": ' + okc + '/' + vivos.length + ' com "' + cadeia[0].transicao + '" disponível (não movi)';
    }
    // EXECUTAR: a cada salto RE-LISTA a caixa e casa por idProcesso (estável).
    var movidosFim = 0, totalIni = ent.length;
    for (var s = 0; s < cadeia.length; s++) {
      var passo = cadeia[s];
      var atual = await listarCaixaREST(passo.caixa);
      console.log('[PJM Mover REST] passo ' + (s + 1) + '/' + cadeia.length + ' caixa="' + passo.caixa + '" listados=' + atual.length);
      var mapId = {}; atual.forEach(function (p) { mapId[p.idProcesso] = p.idTaskInstance; });
      var proximos = [];
      for (var k = 0; k < vivos.length; k++) {
        var idTask = mapId[vivos[k].idp];
        if (!idTask) { console.log('[PJM Mover REST] idProcesso', vivos[k].idp, 'não está em "' + passo.caixa + '"'); continue; }
        var res = await resolverNomeSaida(idTask, passo.transicao);
        if (!res.nome) { console.log('[PJM Mover REST] transição "' + passo.transicao + '" indisponível (idTask ' + idTask + '). Disponíveis:', res.disp); continue; }
        var _ok = await moverUmREST(idTask, res.nome);
        console.log('[PJM Mover REST] mover idTask', idTask, '→ "' + res.nome + '" (regra: "' + passo.transicao + '") =', _ok);
        if (_ok) proximos.push(vivos[k]);
      }
      vivos = proximos;
      if (s === cadeia.length - 1) movidosFim = vivos.length;
      if (!vivos.length) break;
      if (s < cadeia.length - 1) await aguardar(800);
    }
    // Registro no relatório. moverViaREST é a via da PIPELINE (autos → painel); sem isto o
    // Movimentar por pipeline não aparece na aba Relatório (o 1-salto simples registra à
    // parte em autos-acoes.js via pjmLogAutos). Nos autos, 'cnj' identifica o processo (mais
    // confiável); no lote do painel (cnj nulo) usa-se os numeroProcesso que moveram.
    try {
      var _movSet = {}; vivos.forEach(function (v) { _movSet[v.idp] = true; });
      var _movCnjs = ent.filter(function (p) { return _movSet[p.idProcesso]; })
        .map(function (p) { return String(p.numeroProcesso || '').trim(); })
        .filter(Boolean);
      var _alvoCnjs = cnj ? [String(cnj)] : _movCnjs;
      if (movidosFim > 0 && _alvoCnjs.length) {
        pjmLogAcaoMulti(null, _alvoCnjs, (regra.labelRelatorio || regra.etiqueta) + ' (Movimentar)');
      }
    } catch (_e) { console.warn('[PJM Mover REST] log relatório falhou:', _e); }
    return (movidosFim > 0 ? '✅ ' : '⚠️ ') + '"' + regra.etiqueta + '": ' + movidosFim + '/' + totalIni +
      ' movido(s) (' + cadeia.map(function (h) { return h.transicao; }).join(' → ') + ')';
  }
  // Orquestra todas as regras ativas via REST.
  async function moverViaREST(regras, cnj, tarefaOrigem) {
    var ativas = (regras || []).filter(function (r) { return r.ativo !== false && r.etiqueta; });
    if (!ativas.length) { mostrarHud('⚠️ Nenhuma regra ativa configurada.', 'warning'); return; }
    mostrarHud('⏳ Movimentando via REST (' + ativas.length + ' regra(s))…', 'info');
    var resumo = [];
    for (var i = 0; i < ativas.length; i++) {
      try { resumo.push(await moverRegraREST(ativas[i], cnj, tarefaOrigem)); }
      catch (e) { resumo.push('❌ "' + (ativas[i].etiqueta || '') + '": ' + ((e && e.message) || e)); }
    }
    var houveMov = resumo.some(function (x) { return x.indexOf('✅') === 0; });
    mostrarHud(resumo.join('<br>'), houveMov ? 'success' : 'warning');
    console.log('[PJM Mover REST] resumo:', resumo);
  }

  async function executarRegras(regras, cnj, tarefaOrigem, reqTs) {
    if (USAR_MOVER_REST) { await moverViaREST(regras, cnj, tarefaOrigem); sinalizarConcluido(reqTs); return; }
    var regraAtivas = (regras || []).filter(function (r) { return r.ativo !== false && r.etiqueta; });
    if (regraAtivas.length === 0) {
      mostrarHud('⚠️ Nenhuma regra ativa configurada.', 'warning');
      sinalizarConcluido(reqTs);
      return;
    }

    // Separar regras com pipeline das simples (tarefaDestino)
    var regrasPipeline = regraAtivas.filter(function (r) {
      return r.pipeline && r.pipeline.length > 0;
    });
    var regrasSimplas = regraAtivas.filter(function (r) {
      return !r.pipeline || r.pipeline.length === 0;
    });

    // Regras pipeline com tarefaInicial navegam automaticamente — não precisam de processos visíveis agora
    var temNavegacaoAutomatica = regrasPipeline.some(function(r) { return !!r.tarefaInicial; });

    if (!frameTemProcessos()) {
      // Se temos cnj + tarefaOrigem, navegar para a tarefa-origem antes de continuar
      if (cnj && tarefaOrigem) {
        mostrarHud('⏳ Navegando para "' + tarefaOrigem + '" (passo da fila)...', 'info');
        var navOrigem = await navegarParaTarefa(tarefaOrigem);
        if (navOrigem) {
          await aguardar(1500);
          await aguardarListaEstabilizar(5000);
        }
      } else if (!temNavegacaoAutomatica) {
        console.log('[PJM Etiqueta] Frame sem processos visíveis e nenhuma regra com tarefa inicial.');
        sinalizarConcluido(reqTs);
        return;
      }
      // Ignorar regras simples e pipelines sem tarefa inicial (quando não temos tarefaOrigem)
      if (!cnj || !tarefaOrigem) {
        regrasSimplas = [];
        regrasPipeline = regrasPipeline.filter(function(r) { return !!r.tarefaInicial; });
        mostrarHud('⏳ Iniciando automação com navegação automática...', 'info');
        await aguardar(1000);
      }
    }

    // ── Regras simples: agrupadas por destino ────────────────────────────
    if (regrasSimplas.length > 0) {
      var destinos = [];
      regrasSimplas.forEach(function (r) {
        if (r.tarefaDestino && destinos.indexOf(r.tarefaDestino) === -1) {
          destinos.push(r.tarefaDestino);
        }
      });

      var totalInicial = scanGrupoFiltrado(regrasSimplas, cnj).length;
      if (totalInicial === 0 && regrasPipeline.length === 0) {
        mostrarHud('⚠️ Nenhum processo com as etiquetas configuradas nesta página.', 'warning');
        sinalizarConcluido(reqTs);
        return;
      }

      if (destinos.length === 0 && totalInicial > 0) {
        var semDestino = scanGrupoFiltrado(regrasSimplas, cnj);
        semDestino.forEach(function (c) { selecionarProcesso(c); });
        if (regrasPipeline.length === 0) {
          mostrarHud(
            '✅ <strong>' + semDestino.length + ' processo(s) selecionado(s)</strong>' +
            '<br><small style="opacity:.8">Nenhuma tarefa de destino configurada.</small>',
            'success'
          );
          sinalizarConcluido(reqTs);
          return;
        }
      }

      var resumoSimples = [];
      for (var g = 0; g < destinos.length; g++) {
        var destino = destinos[g];
        var regrasGrupo = regrasSimplas.filter(function (r) { return r.tarefaDestino === destino; });

        mostrarHud(
          '⏳ Rodada ' + (g + 1) + '/' + destinos.length +
          ': buscando → <strong>' + destino + '</strong>...',
          'info'
        );

        var containers = scanGrupoFiltrado(regrasGrupo, cnj);
        if (containers.length === 0) {
          resumoSimples.push('ℹ️ Nenhum processo para "' + destino + '"');
          continue;
        }

        var selecionados = 0;
        containers.forEach(function (c) { if (selecionarProcesso(c)) selecionados++; });
        if (selecionados === 0) { resumoSimples.push('⚠️ "' + destino + '": não selecionado'); continue; }

        await aguardar(1000);
        var destinoUsado = await dispararMovimentacaoLote([destino]);

        if (destinoUsado) {
          resumoSimples.push('✅ ' + selecionados + ' proc. → <strong>' + destinoUsado + '</strong>');
        } else if (destinoUsado === null) {
          resumoSimples.push('ℹ️ "' + destino + '" não disponível nesta tarefa.');
        } else {
          resumoSimples.push('❌ Erro ao mover para "' + destino + '"');
        }

        if (g < destinos.length - 1) await aguardarListaEstabilizar(5000);
      }

      if (regrasPipeline.length === 0) {
        mostrarHud('✅ <strong>Concluído</strong><br>' + resumoSimples.join('<br>'), 'success');
        console.log('[PJM Etiqueta v6] Simples concluído.', resumoSimples);
        // Registra ações no relatório — uma entrada por regra / por CNJ afetado
        var cnjsSimples = cnj ? null : pjmCnjsDeContainers(containers);
        regrasSimplas.forEach(function(r) {
          pjmLogAcaoMulti(cnj, cnjsSimples, (r.labelRelatorio || r.etiqueta) + ' (Movimentar)');
        });
        sinalizarConcluido(reqTs);
        return;
      }

      // Há pipelines a executar após as regras simples
      mostrarHud(resumoSimples.join('<br>') + '<br>⏳ Iniciando pipeline...', 'info');
      await aguardar(800);
    }

    // ── Regras pipeline: execução em cadeia ──────────────────────────────
    for (var rp = 0; rp < regrasPipeline.length; rp++) {
      var regraPL = regrasPipeline[rp];
      // CNJs coletados DENTRO de executarPipelineRegra após navegação para tarefaInicial
      // (pré-scan aqui era inútil: a DOM ainda não mostra a tarefa de destino)
      var cnjsRetorno = await executarPipelineRegra(regraPL.etiqueta, regraPL.pipeline, regraPL.tarefaInicial || '', regraPL.tarefaFinal || '', cnj);
      pjmLogAcaoMulti(cnj, Array.isArray(cnjsRetorno) ? cnjsRetorno : [], (regraPL.labelRelatorio || regraPL.etiqueta) + ' (Movimentar)');
      if (rp < regrasPipeline.length - 1) await aguardar(800);
    }
    // Sinaliza conclusão para o motor de fila do overlay
    sinalizarConcluido(reqTs);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Encaminhamento individual (sem "Movimentar em lote")
  //
  //   Processo   : a.selecionarProcesso (click abre no frame-tarefa)
  //   Btn dropdown: button#btnTransicoesTarefa.btn.dropdown-toggle
  //   Menu aberto : .btn-group.open .dropdown-menu a (ou .dropdown.open)
  //   Transições  : links <a href=""> com texto da transição
  //   Modal conf. : .modal.in button com texto "confirmar"/"ok"/"sim"
  // ─────────────────────────────────────────────────────────────────────

  const STORAGE_KEY_INDIVIDUAL = 'encaminharIndividualComando';
  const STORAGE_KEY_REMOVER    = 'etiquetaRemoverComando';
  const STORAGE_KEY_REMOVER_REGRAS = 'etiquetaRemoverRegras';
  const STORAGE_KEY_VINCULAR   = 'etiquetaVincularComando';

  /**
   * Clica no botão dropdown #btnTransicoesTarefa e seleciona a transição
   * cujo texto casar com textoTransicao.
   *
   * @returns {Promise<string|false|null>}
   *   string  = texto da transição usada (sucesso)
   *   null    = transição não encontrada no dropdown (não disponível)
   *   false   = erro real (timeout, elemento ausente)
   */
  async function dispararTransicaoIndividual(textoTransicao) {
    // 1. Aguardar botão de transições aparecer e estar habilitado
    var btnTransicoes;
    try {
      btnTransicoes = await aguardarElemento(
        '#btnTransicoesTarefa',
        function (el) { return !el.disabled && !el.closest('[disabled]'); },
        10000
      );
    } catch (e) {
      mostrarHud('❌ #btnTransicoesTarefa não apareceu. Processo carregado?', 'error');
      return false;
    }

    // Registrar quais modais já estavam abertos ANTES de clicar
    var modaisAntes = new Set(
      Array.from(document.querySelectorAll('.modal.in, .modal[style*="display: block"]'))
        .map(function (m) { return m.id || m.className; })
    );

    // 2. Abrir dropdown
    clickRobusto(btnTransicoes);
    await aguardar(500);

    // 3. Aguardar dropdown aberto (.btn-group.open ou .dropdown.open)
    var normTransicao = norm(textoTransicao);
    var linkTransicao = null;

    // Tenta até 1.5s por um dropdown aberto com os links
    var tentativas = 0;
    while (tentativas < 5 && !linkTransicao) {
      await aguardar(300);
      tentativas++;

      // Buscar dentro do grupo aberto
      var grupoAberto = document.querySelector(
        '.btn-group.open .dropdown-menu, .dropdown.open .dropdown-menu'
      );

      if (grupoAberto) {
        var linksMenu = Array.from(grupoAberto.querySelectorAll('li a, a'));
        linkTransicao = linksMenu.find(function (a) {
          var t = norm(a.textContent);
          return t === normTransicao || t.includes(normTransicao) || normTransicao.includes(t);
        });
      }
    }

    if (!linkTransicao) {
      // Dropdown não abriu ou transição não existe — fechar clicando de novo e retornar null
      clickRobusto(btnTransicoes);
      return null; // não disponível
    }

    // 4. Clicar na transição
    clickRobusto(linkTransicao);
    await aguardar(1000);

    // 5. Verificar e confirmar modal que possa ter aberto
    try {
      await aguardarElemento(
        '.modal.in, .modal[style*="display: block"]',
        function (el) {
          // Deve ser um modal NOVO (não existia antes)
          var id = el.id || el.className;
          return !modaisAntes.has(id);
        },
        2500
      );
      // Modal novo detectado — procurar botão de confirmação
      var modaisNovos = Array.from(
        document.querySelectorAll('.modal.in, .modal[style*="display: block"]')
      ).filter(function (m) { return !modaisAntes.has(m.id || m.className); });

      for (var m = 0; m < modaisNovos.length; m++) {
        var modal = modaisNovos[m];
        var btnConfirmar = Array.from(modal.querySelectorAll('button')).find(function (b) {
          var t = norm(b.textContent);
          return t === 'confirmar' || t === 'ok' || t === 'sim' || t === 'concluir';
        });
        if (btnConfirmar) {
          clickRobusto(btnConfirmar);
          await aguardar(1200);
          break;
        }
      }
    } catch (_) {
      // Nenhum modal novo — operação concluída diretamente
    }

    return textoTransicao;
  }

  /**
   * Itera pela lista de processos visíveis (opcionalmente filtrados por etiqueta)
   * e encaminha cada um via transição individual.
   *
   * Estratégia: após cada transição bem-sucedida, aguarda o processo sair da
   * lista (contagem diminui) antes de prosseguir para o próximo.
   *
   * @param {string}   textoTransicao  - texto exato (ou parcial) da transição
   * @param {string[]} etiquetas       - filtro por etiqueta ([] = todos os processos)
   */
  /**
   * Versão interna: retorna { processados, erros, interrompido } sem exibir HUD final.
   * Usada tanto standalone quanto pelo pipeline.
   */
  async function _encaminhamentoIndividualLoop(textoTransicao, etiquetas, prefixoHud, cnj) {
    etiquetas = etiquetas || [];
    prefixoHud = prefixoHud || '';
    var processados = 0;
    var erros = 0;
    var pulados = new Set();
    var cnjsProcessados = []; // CNJs coletados antes de cada clique (DOM muda após abertura)
    // Salvar o hash da tarefa atual para detectar se o PJe navegar para outro lugar
    var hashTarefa = location.hash;

    while (true) {
      await aguardar(500);

      // O PJe às vezes navega o frame pai após uma transição individual
      // (ex.: volta ao dashboard). Detectar e voltar à tarefa.
      if (location.hash !== hashTarefa) {
        console.log('[PJM Individual] Navegação detectada (' + location.hash + '). Voltando para a tarefa...');
        location.hash = hashTarefa;
        var voltou = false;
        for (var t = 0; t < 15; t++) {
          await aguardar(600);
          if (document.querySelectorAll('a.selecionarProcesso').length > 0) { voltou = true; break; }
        }
        if (!voltou) {
          console.log('[PJM Individual] Tarefa não carregou após voltar. Encerrando loop.');
          break;
        }
      }

      var links = Array.from(document.querySelectorAll('a.selecionarProcesso'));
      if (links.length === 0) break;

      var linkAlvo = null;
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var textoProc = norm(link.textContent);
        if (pulados.has(textoProc)) continue;

        if (cnj) {
          var containerCnj = link.closest('div.col-sm-11') ||
                             link.closest('div.datalist-content') ||
                             link.parentElement;
          var spanNumCnj = containerCnj && containerCnj.querySelector(PJM_SEL.NUM_PROCESSO);
          var numProcCnj = spanNumCnj ? String(spanNumCnj.textContent || '').replace(/[^0-9]/g, '') : '';
          if (numProcCnj !== cnj) { pulados.add(textoProc); continue; }
        }

        if (etiquetas.length > 0) {
          var container = link.closest('div.col-sm-11') ||
                          link.closest('div.datalist-content') ||
                          link.parentElement;
          if (container) {
            var etqsDoProc = etiquetasDoContainer(container);
            var temEtiqueta = etiquetas.some(function (etq) {
              var etqNorm = norm(etq);
              return etqsDoProc.some(function (e) {
                return norm(e) === etqNorm || norm(e).includes(etqNorm);
              });
            });
            if (!temEtiqueta) { pulados.add(textoProc); continue; }
          }
        }
        linkAlvo = link;
        break;
      }

      if (!linkAlvo) break;

      var numProcessoTexto = linkAlvo.textContent.trim().slice(0, 60);
      var textoAlvo = norm(linkAlvo.textContent);

      // Captura CNJ antes de clicar — DOM muda após abertura do processo
      // 1ª: segmento de exatamente 20 dígitos no texto do link
      var cnjLinkAtual = extrairCnjDeTexto(linkAlvo.textContent);
      // 2ª: texto completo do container (inclui span, labels e outros elementos do card)
      if (!cnjLinkAtual) {
        var containerLink = linkAlvo.closest('div.col-sm-11') ||
                            linkAlvo.closest('processo-datalist-card') ||
                            linkAlvo.closest('div.datalist-content') ||
                            linkAlvo.parentElement;
        if (containerLink) cnjLinkAtual = extrairCnjDeTexto(containerLink.textContent);
      }

      mostrarHud(
        '⏳ ' + prefixoHud + 'Proc. ' + (processados + erros + 1) + ': ' + numProcessoTexto + '...',
        'info'
      );

      clickRobusto(linkAlvo);
      await aguardar(2000);

      var res = await dispararTransicaoIndividual(textoTransicao);

      if (res === false) {
        erros++;
        pulados.add(textoAlvo);
        mostrarHud('⚠️ ' + prefixoHud + 'Erro no processo. Continuando...', 'warning');
        await aguardar(1000);
        continue;
      }

      if (res === null) {
        return { processados: processados, erros: erros, interrompido: true, cnjs: cnjsProcessados };
      }

      // Verificar se o processo efetivamente saiu da lista ANTES de contar como
      // processado. Quando o painel direito ainda está carregando (formulário Seam
      // em branco), dispararTransicaoIndividual dispara a transição num estado
      // incompleto — o PJe aceita o clique mas não move o processo. Um retry com
      // espera maior resolve a maioria dos casos (ex.: último processo de "Escolher tipo").
      var qtdAntes = document.querySelectorAll('a.selecionarProcesso').length;
      await aguardarListaEstabilizar(6000);
      var qtdDepois = document.querySelectorAll('a.selecionarProcesso').length;
      var _moveuOk = qtdDepois < qtdAntes;

      if (!_moveuOk) {
        // Processo ainda na lista — painel pode não ter carregado completamente.
        // Aguardar mais e tentar uma segunda vez.
        mostrarHud('\u26a0\ufe0f ' + prefixoHud + 'Painel lento, aguardando e retentando...', 'warning');
        await aguardar(3000);
        var _resRetry = await dispararTransicaoIndividual(textoTransicao);
        if (_resRetry && _resRetry !== false) {
          var _qA = document.querySelectorAll('a.selecionarProcesso').length;
          await aguardarListaEstabilizar(6000);
          var _qD = document.querySelectorAll('a.selecionarProcesso').length;
          _moveuOk = _qD < _qA;
        }
      }

      if (!_moveuOk) {
        erros++;
        pulados.add(textoAlvo);
        mostrarHud('\u26a0\ufe0f ' + prefixoHud + 'Processo não moveu após retry. Continuando...', 'warning');
        continue;
      }

      processados++;
      if (cnjLinkAtual && cnjsProcessados.indexOf(cnjLinkAtual) === -1) cnjsProcessados.push(cnjLinkAtual);
    }

    return { processados: processados, erros: erros, interrompido: false, cnjs: cnjsProcessados };
  }

  async function executarEncaminhamentoIndividual(textoTransicao, etiquetas) {
    mostrarHud('⏳ Encaminhamento individual → <strong>' + textoTransicao + '</strong>...', 'info');
    var r = await _encaminhamentoIndividualLoop(textoTransicao, etiquetas, '');

    if (r.interrompido) {
      mostrarHud('❌ "' + textoTransicao + '" não disponível. Interrompendo.', 'error');
      return;
    }
    if (r.processados === 0 && r.erros === 0) {
      mostrarHud('⚠️ Nenhum processo encontrado com os filtros informados.', 'warning');
    } else {
      mostrarHud(
        '✅ <strong>Concluído</strong> — ' + r.processados + ' processo(s) encaminhado(s)' +
        (r.erros > 0 ? ', ' + r.erros + ' com erro' : '') + '.',
        'success'
      );
      console.log('[PJM Individual] Encaminhamento concluído:', r.processados, 'movidos, transição:', textoTransicao);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Ativação via storage
  // ─────────────────────────────────────────────────────────────────────
  function checarEExecutar() {
    if (!document.querySelector('app-root, [ng-version]')) return;
    if (!chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get(STORAGE_KEY, function (r) {
      var cmd = r && r[STORAGE_KEY];
      if (!cmd || !cmd.regras || !cmd.ts) return;
      if (Date.now() - cmd.ts > TIMEOUT_MAX) { chrome.storage.local.remove(STORAGE_KEY); return; }
      chrome.storage.local.remove(STORAGE_KEY, function () {
        executarRegras(cmd.regras, cmd.cnj || null, cmd.tarefaOrigem || null, cmd.ts);
      });
    });
  }

  function checarEExecutarIndividual() {
    if (!document.querySelector('app-root, [ng-version]')) return;
    if (!chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get(STORAGE_KEY_INDIVIDUAL, function (r) {
      var cmd = r && r[STORAGE_KEY_INDIVIDUAL];
      if (!cmd || !cmd.transicao || !cmd.ts) return;
      if (Date.now() - cmd.ts > TIMEOUT_MAX) { chrome.storage.local.remove(STORAGE_KEY_INDIVIDUAL); return; }
      if (!frameTemProcessos()) return;

      chrome.storage.local.remove(STORAGE_KEY_INDIVIDUAL, function () {
        executarEncaminhamentoIndividual(cmd.transicao, cmd.etiquetas || []);
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Remoção standalone de etiqueta
  //
  // Ativado por chrome.storage.local[STORAGE_KEY_REMOVER] = { regras, ts }
  // Cada regra: { etiqueta, tarefa, ativo }
  // Fluxo: navegar para a tarefa em Minhas Tarefas → aguardar carga →
  //        removerEtiquetaDeProcessos(etiqueta) → próxima regra → painel principal
  // ─────────────────────────────────────────────────────────────────────

  async function executarRemoverEtiquetas(regras, cnj) {
    var ativas = (regras || []).filter(function(r) {
      return r.ativo !== false && r.etiqueta && r.tarefa;
    });
    var logRemocoes = []; // acumula { r, cnjs[] } para modo sem CNJ específico
    if (ativas.length === 0) {
      mostrarHud('⚠️ Nenhuma regra de remoção ativa configurada.', 'warning');
      try { chrome.storage.local.set({ etiquetaRemoverStatus: { done: true, ts: Date.now() } }); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
      return;
    }

    for (var i = 0; i < ativas.length; i++) {
      var regra = ativas[i];
      mostrarHud(
        '⏳ [' + (i + 1) + '/' + ativas.length + '] Navegando para "' + regra.tarefa + '"...',
        'info'
      );

      var navegou = await navegarParaTarefa(regra.tarefa);
      if (!navegou) {
        mostrarHud(
          '⚠️ Tarefa "' + regra.tarefa + '" não encontrada em Minhas Tarefas. Pulando.',
          'warning'
        );
        continue;
      }

      // Aguardar indicador de etiquetas — compatível com dropdown (#btn-gerenciar-etiquetas)
      // e chip direto (.label-etiqueta). NÃO usar aguardarProcessosCarregar() pois
      // span.tarefa-numero-processo existe no dashboard, causando execução prematura.
      try {
        await aguardarEtiquetasProntas(12000);
        await aguardar(500); // estabilizar o Angular após o render
      } catch(e) {
        mostrarHud(
          '⚠️ Timeout: etiquetas não encontradas em "' + regra.tarefa + '". Pulando.',
          'warning'
        );
        continue;
      }

      // Captura CNJs antes da remoção (containers saem da lista após remoção da etiqueta)
      if (!cnj) {
        var cnjsRemov = pjmCnjsDeContainers(scanGrupoFiltrado([{ etiqueta: regra.etiqueta }], null));
        logRemocoes.push({ r: regra, cnjs: cnjsRemov });
      }

      await removerEtiquetaDeProcessos(regra.etiqueta, cnj);

      if (i < ativas.length - 1) await aguardar(800);
    }

    // Voltar ao painel principal ao concluir todas as regras
    // Registra remoções no relatório
    if (cnj) {
      ativas.forEach(function(r) {
        pjmLogAcao(cnj, (r.labelRelatorio || r.etiqueta) + ' (Remover)');
      });
    } else {
      logRemocoes.forEach(function(entry) {
        pjmLogAcaoMulti(null, entry.cnjs, (entry.r.labelRelatorio || entry.r.etiqueta) + ' (Remover)');
      });
    }
    await aguardar(1500);
    await navegarPainelPrincipal();
    // Sinaliza conclusão para o motor de fila do overlay
    try { chrome.storage.local.set({ etiquetaRemoverStatus: { done: true, ts: Date.now() } }); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
  }

  function checarEExecutarRemover() {
    if (!document.querySelector('app-root, [ng-version]')) return;
    if (!chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get(STORAGE_KEY_REMOVER, function(r) {
      var cmd = r && r[STORAGE_KEY_REMOVER];
      if (!cmd || !cmd.regras || !cmd.ts) return;
      if (Date.now() - cmd.ts > TIMEOUT_MAX) { chrome.storage.local.remove(STORAGE_KEY_REMOVER); return; }
      chrome.storage.local.remove(STORAGE_KEY_REMOVER, function() {
        executarRemoverEtiquetas(cmd.regras, cmd.cnj || null);
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // VINCULAR ETIQUETA — adiciona etiqueta a um processo via diálogo
  // "Etiquetar processos em lote". Escopado por CNJ.
  // Acionado por chrome.storage.local[STORAGE_KEY_VINCULAR] = { regras, ts, cnj }
  // ─────────────────────────────────────────────────────────────────────
  async function vincularEtiquetasEmProcessos(nomesEtiquetas, cnjs) {
    if (!nomesEtiquetas) return false;

    function soDig(s){ return String(s == null ? '' : s).replace(/\D/g, ''); }
    function cardDoCnj(num) {
      var sns = document.querySelectorAll(PJM_SEL.NUM_PROCESSO);
      for (var i = 0; i < sns.length; i++) {
        if (soDig(sns[i].textContent) === num) {
          return sns[i].closest('processo-datalist-card') || sns[i].closest('li.ng-star-inserted') || sns[i].closest('div.datalist-content');
        }
      }
      return null;
    }
    async function esperarEl(sel, timeout) {
      var t0 = Date.now();
      while (Date.now() - t0 < (timeout || 6000)) {
        var el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
        await aguardar(200);
      }
      return document.querySelector(sel);
    }
    function setInputAngular(inp, val) {
      try {
        var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(inp, val);
      } catch (e) { inp.value = val; }
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function acharBtnPorTexto(escopoSel, texto) {
      return Array.prototype.filter.call(document.querySelectorAll(escopoSel + ' button'), function(b){ return (b.textContent || '').trim() === texto; })[0] || null;
    }

    // 1) Selecionar a(s) caixa(s) do(s) processo(s) — vincula em lote
    var lista = Array.isArray(cnjs) ? cnjs.slice() : (cnjs ? [cnjs] : []);
    var selecionados = 0;
    for (var ci = 0; ci < lista.length; ci++) {
      var cardSel = cardDoCnj(lista[ci]);
      if (!cardSel) { mostrarHud('⚠️ Processo ' + lista[ci] + ' não visível nesta lista — pulando.', 'warning'); continue; }
      var selBtn = cardSel.querySelector('.selecionarProcesso button.botao-selecionar') || cardSel.querySelector('div.selecionarProcesso button');
      if (selBtn) {
        var icoSel = selBtn.querySelector('i');
        if (icoSel && icoSel.classList.contains('fa-square')) { selBtn.click(); await aguardar(350); }
        selecionados++;
      }
    }
    if (lista.length && selecionados === 0) {
      mostrarHud('⚠️ Nenhum processo encontrado para vincular "' + nomeEtiqueta + '".', 'warning');
      return false;
    }

    // 2) Abrir o diálogo "Vincular etiqueta"
    var btnAbrir = document.querySelector('#acoes-processos-selecionados button[title="Vincular etiqueta"]');
    if (!btnAbrir) {
      mostrarHud('⚠️ Botão "Vincular etiqueta" não encontrado (o processo foi selecionado?).', 'warning');
      return false;
    }
    btnAbrir.click();

    // 3-4) Para CADA etiqueta: buscar e marcar (as marcações persistem entre buscas)
    var nomes = (Array.isArray(nomesEtiquetas) ? nomesEtiquetas : [nomesEtiquetas])
      .map(function(s){ return String(s == null ? '' : s).trim(); }).filter(Boolean);
    var inp = await esperarEl('#itPesquisarEtiquetas', 8000);
    if (!inp) { mostrarHud('⚠️ Campo de busca de etiquetas não apareceu.', 'warning'); return false; }
    // Estado limpo: remove seleções remanescentes de uma vinculação anterior
    // (o PJe mantém as etiquetas marcadas até "Desmarcar Seleções" ou troca de tarefa).
    var btnDesmIni = acharBtnPorTexto('#modalEtiquetarLote', 'Desmarcar Seleções') || document.querySelector('#modalEtiquetarLote button.btn-warning');
    if (btnDesmIni) { btnDesmIni.click(); await aguardar(350); }
    var marcadas = 0, naoAchadas = [];
    for (var ne = 0; ne < nomes.length; ne++) {
      var nomeAtual = nomes[ne];
      inp.focus();
      setInputAngular(inp, nomeAtual);
      try { inp.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true })); } catch (e) { console.warn('[PJM etiqueta-movimentador]', e); }
      try { inp.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { console.warn('[PJM etiqueta-movimentador]', e); }
      var alvoNome = nomeAtual.toUpperCase();
      var alvo = null, t0busca = Date.now();
      while (Date.now() - t0busca < 7000 && !alvo) {
        var modal = document.querySelector('#modalEtiquetarLote') || document.querySelector('.modal-content') || document;
        var rows = modal.querySelectorAll('table tbody tr');
        for (var i = 0; i < rows.length && !alvo; i++) {
          if (rows[i].offsetParent === null) continue;
          var tds = rows[i].querySelectorAll('td');
          for (var j = 0; j < tds.length; j++) {
            if ((tds[j].textContent || '').trim().toUpperCase() === alvoNome) { alvo = rows[i]; break; }
          }
        }
        if (!alvo) await aguardar(300);
      }
      if (!alvo) { naoAchadas.push(nomeAtual); continue; }
      var chkBtn = alvo.querySelector(PJM_SEL.ETQ_CHECK_ETIQUETA) || alvo.querySelector(PJM_SEL.ETQ_CHECKBOX);
      var icoChk = chkBtn && chkBtn.querySelector('i');
      if (icoChk && icoChk.classList.contains('fa-square')) { chkBtn.click(); await aguardar(400); }
      marcadas++;
    }
    if (marcadas === 0) {
      mostrarHud('⚠️ Nenhuma etiqueta encontrada na lista: ' + nomes.join(', ') + '.', 'warning');
      var bFecha0 = acharBtnPorTexto('#modalEtiquetarLote', 'Fechar');
      if (bFecha0) bFecha0.click();
      return false;
    }

    // 5) Confirmar "Vincular etiqueta" (uma vez para TODAS as etiquetas marcadas)
    var btnConfirmar = acharBtnPorTexto('#modalEtiquetarLote', 'Vincular etiqueta');
    if (btnConfirmar) { btnConfirmar.click(); await aguardar(1300); }
    if (naoAchadas.length) mostrarHud('⚠️ Não encontradas: ' + naoAchadas.join(', ') + '.', 'warning');

    // 5b) Desmarcar seleções ANTES de fechar — senão o PJe mantém as etiquetas
    // marcadas e a próxima vinculação herdaria as anteriores.
    var btnDesmarcar = acharBtnPorTexto('#modalEtiquetarLote', 'Desmarcar Seleções') || document.querySelector('#modalEtiquetarLote button.btn-warning');
    if (btnDesmarcar) { btnDesmarcar.click(); await aguardar(400); }

    // 6) Fechar o diálogo
    var btnFechar = acharBtnPorTexto('#modalEtiquetarLote', 'Fechar');
    if (btnFechar) { btnFechar.click(); await aguardar(400); }

    // 7) Desmarcar os processos (deixa a lista limpa)
    for (var di = 0; di < lista.length; di++) {
      var cardD = cardDoCnj(lista[di]);
      var selBtnD = cardD && (cardD.querySelector('.selecionarProcesso button.botao-selecionar') || cardD.querySelector('div.selecionarProcesso button'));
      var icoD = selBtnD && selBtnD.querySelector('i');
      if (icoD && icoD.classList.contains('fa-check-square')) { selBtnD.click(); await aguardar(200); }
    }

    mostrarHud('🏷️ ' + marcadas + ' etiqueta(s) vinculada(s) a ' + selecionados + ' processo(s).', 'success');
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Etiqueta em lote SEM abrir o modal nativo (nada fica "selado" na seleção).
  // idProcesso: 1º da coleta (pjeMapperUltimoResultado.idInterno); se faltar,
  // lista a caixa (fallback). Sem CNJs → etiqueta todos os processos da caixa.
  // Reaproveita restUrlPU/digREST/listarCaixaREST/caixaAtualHash do bloco de mover.
  // ═══════════════════════════════════════════════════════════════════════
  var USAR_VINCULAR_REST = true; // false → volta ao modal nativo (reserva abaixo)

  function mapaColetaVinc() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get('pjeMapperUltimoResultado', function (r) {
          var res = r && r.pjeMapperUltimoResultado, m = {};
          ((res && res.tarefas) || []).forEach(function (t) {
            (t.processos || []).forEach(function (p) {
              var d = digREST(p.numero); if (d && p.idInterno) m[d] = { numero: p.numero, idp: p.idInterno };
            });
          });
          resolve(m);
        });
      } catch (_) { resolve({}); }
    });
  }
  async function mapaCaixaVinc(caixa) {
    var m = {};
    if (!caixa) return m;
    (await listarCaixaREST(caixa)).forEach(function (p) {
      var d = digREST(p.numeroProcesso); if (d && p.idProcesso) m[d] = { numero: p.numeroProcesso, idp: p.idProcesso };
    });
    return m;
  }
  function inserirTagsREST(idProcesso, numeroProcesso, tags) {
    var body = tags.map(function (t) { return { tag: String(t), idProcesso: String(idProcesso), numeroProcesso: String(numeroProcesso || '') }; });
    return fetch(restUrlPU('processoTags/inserir'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.ok; }).catch(function () { return false; });
  }
  async function vincularRegraREST(regra, cnjs) {
    var etqs = (regra.etiquetas && regra.etiquetas.length ? regra.etiquetas : [regra.etiqueta])
      .map(function (s) { return String(s || '').trim(); }).filter(Boolean);
    if (!etqs.length) return 'ℹ️ regra sem etiqueta';
    var caixa = String(regra.tarefa || caixaAtualHash() || '').trim();
    var lista = (Array.isArray(cnjs) ? cnjs : (cnjs ? [cnjs] : [])).map(digREST).filter(Boolean);
    var alvos = [];
    if (lista.length) {
      var col = await mapaColetaVinc();
      var faltam = lista.filter(function (d) { return !col[d]; });
      var cxMap = faltam.length ? await mapaCaixaVinc(caixa) : {};
      lista.forEach(function (d) {
        var hit = col[d] || cxMap[d];
        if (hit) alvos.push({ numero: hit.numero, idp: hit.idp });
        else console.log('[PJM Vincular REST] sem idProcesso para CNJ', d);
      });
    } else {
      // Sem CNJs: só etiqueta em lote quando a regra fixa a Tarefa (intenção explícita).
      // Sem Tarefa, não etiqueta a lista inteira por engano (a seleção manual não é legível por script).
      if (!regra.tarefa) return 'ℹ️ "' + etqs.join('+') + '": selecione os processos ou defina a Tarefa na regra (evita etiquetar a lista toda por engano).';
      var cx = await mapaCaixaVinc(regra.tarefa);
      Object.keys(cx).forEach(function (d) { alvos.push({ numero: cx[d].numero, idp: cx[d].idp }); });
    }
    if (!alvos.length) return 'ℹ️ "' + etqs.join('+') + '": nenhum processo com idProcesso' + (caixa ? ' em "' + caixa + '"' : '');
    var ok = 0;
    for (var i = 0; i < alvos.length; i++) {
      var res = await inserirTagsREST(alvos[i].idp, alvos[i].numero, etqs);
      console.log('[PJM Vincular REST] inserir', etqs, 'em', alvos[i].numero, '(idp ' + alvos[i].idp + ') =', res);
      if (res) ok++;
    }
    return (ok > 0 ? '✅ ' : '⚠️ ') + '"' + etqs.join(' + ') + '": ' + ok + '/' + alvos.length + ' processo(s)';
  }
  async function vincularViaREST(regras, cnjs) {
    var ativas = (regras || []).filter(function (r) { return r.ativo !== false && (r.etiqueta || (r.etiquetas && r.etiquetas.length)); });
    if (!ativas.length) { mostrarHud('⚠️ Nenhuma regra de vincular ativa.', 'warning'); return; }
    mostrarHud('⏳ Vinculando via REST (' + ativas.length + ' regra(s))…', 'info');
    var resumo = [];
    for (var i = 0; i < ativas.length; i++) {
      try { resumo.push(await vincularRegraREST(ativas[i], cnjs)); }
      catch (e) { resumo.push('❌ ' + ((e && e.message) || e)); }
    }
    var houve = resumo.some(function (x) { return x.indexOf('✅') === 0; });
    mostrarHud(resumo.join('<br>'), houve ? 'success' : 'warning');
    console.log('[PJM Vincular REST] resumo:', resumo);
  }

  async function executarVincularEtiquetas(regras, cnjs) {
    if (USAR_VINCULAR_REST) {
      await vincularViaREST(regras, cnjs);
      try { chrome.storage.local.set({ etiquetaVincularStatus: { done: true, ts: Date.now() } }); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
      return;
    }
    var ativas = (regras || []).filter(function(r) { return r.ativo !== false && (r.etiqueta || (r.etiquetas && r.etiquetas.length)); });
    if (ativas.length === 0) {
      mostrarHud('⚠️ Nenhuma regra de vincular ativa configurada.', 'warning');
      try { chrome.storage.local.set({ etiquetaVincularStatus: { done: true, ts: Date.now() } }); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
      return;
    }
    var navegouAlguma = false;
    for (var i = 0; i < ativas.length; i++) {
      var regra = ativas[i];
      if (regra.tarefa) {
        // Com tarefa: navega para ela em Minhas Tarefas
        mostrarHud('⏳ [Vincular] Navegando para "' + regra.tarefa + '"...', 'info');
        var navegou = await navegarParaTarefa(regra.tarefa);
        if (!navegou) { mostrarHud('⚠️ Tarefa "' + regra.tarefa + '" não encontrada. Pulando.', 'warning'); continue; }
        navegouAlguma = true;
        try { await aguardarEtiquetasProntas(12000); } catch (e) { console.warn('[PJM etiqueta-movimentador]', e); }
        await aguardar(600);
      } else {
        // Sem tarefa (item 1): vincula na página atual, onde os processos já estão
        mostrarHud('⏳ [Vincular] Vinculando na página atual...', 'info');
        try { await aguardarEtiquetasProntas(8000); } catch (e) { console.warn('[PJM etiqueta-movimentador]', e); }
        await aguardar(300);
      }
      var ok = await vincularEtiquetasEmProcessos(regra.etiquetas || [regra.etiqueta], cnjs);
      if (ok && cnjs && cnjs.length) { try { pjmLogAcaoMulti(null, cnjs, (regra.labelRelatorio || (regra.etiquetas||[regra.etiqueta]).join(' + ')) + ' (Vincular)'); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); } }
      if (i < ativas.length - 1) await aguardar(800);
    }
    await aguardar(1200);
    if (navegouAlguma) await navegarPainelPrincipal();
    try { chrome.storage.local.set({ etiquetaVincularStatus: { done: true, ts: Date.now() } }); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
  }

  function checarEExecutarVincular() {
    if (!document.querySelector('app-root, [ng-version]')) return;
    if (!chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get(STORAGE_KEY_VINCULAR, function(r) {
      var cmd = r && r[STORAGE_KEY_VINCULAR];
      if (!cmd || !cmd.regras || !cmd.ts) return;
      if (Date.now() - cmd.ts > TIMEOUT_MAX) { chrome.storage.local.remove(STORAGE_KEY_VINCULAR); return; }
      chrome.storage.local.remove(STORAGE_KEY_VINCULAR, function() {
        executarVincularEtiquetas(cmd.regras, cmd.cnjs || (cmd.cnj ? [cmd.cnj] : []));
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // PREPARAR COMUNICAÇÃO — orquestrador Angular
  //
  // Este código (Angular frame) navega, encontra os cards e coordena
  // via chrome.storage.local.
  //
  // Storage keys:
  //   prepComunicacaoAcionar  : disparo pelo popup/overlay { regras, ts }
  // ─────────────────────────────────────────────────────────────────────

  var STORAGE_KEY_PREP_CMD = 'prepComunicacaoComando';
  var STORAGE_KEY_PREP_STS = 'prepComunicacaoStatus';
  var STORAGE_KEY_PREP_ACN = 'prepComunicacaoAcionar';

  /**
   * Encontra todos os cards de processo (processo-datalist-card) que possuem
   * um chip .label-etiqueta com o texto exato de nomeEtiqueta.
   */
  function encontrarCardsComEtiqueta(nomeEtiqueta) {
    var chips = Array.from(document.querySelectorAll('.label-etiqueta'));
    var cards = [];
    chips.forEach(function (chip) {
      var spanNome = chip.querySelector('span:first-child');
      if (!spanNome || spanNome.textContent.trim() !== nomeEtiqueta) return;
      var card = chip.closest('processo-datalist-card');
      if (card && !cards.includes(card)) cards.push(card);
    });
    return cards;
  }

  function aguardarStatusPrep(processIndex, timeout) {
    timeout = timeout || 90000;
    return new Promise(function (resolve, reject) {
      var inicio = Date.now();
      function verificar() {
        chrome.storage.local.get(STORAGE_KEY_PREP_STS, function (r) {
          var sts = r && r[STORAGE_KEY_PREP_STS];
          if (sts && sts.done && sts.processIndex === processIndex) {
            chrome.storage.local.remove(STORAGE_KEY_PREP_STS);
            resolve(sts);
          } else if (Date.now() - inicio >= timeout) {
            reject(new Error('timeout aguardando conclusão do processo ' + processIndex));
          } else {
            setTimeout(verificar, 800);
          }
        });
      }
      verificar();
    });
  }

  async function executarPrepararComunicacao(regras, cnj, navegarNoFim, forcarNav, reqTs) {
    if (!document.querySelector('app-root, [ng-version]')) { sinalizarConcluido(reqTs); return; }

    var ativas = (regras || []).filter(function (r) {
      return r.ativo !== false && r.etiqueta;
    });
    var logComunicacao = []; // CNJs realmente preenchidos nesta execução
    var logJaPreparada = []; // CNJs pulados por já terem comunicação preparada
    var docRealPorCnj = {};   // CNJ -> documento realmente anexado (conferência)
    var docStatusPorCnj = {}; // CNJ -> 'ok' | 'diverge' | 'nao_anexado'
    var basePorCnj = {};      // CNJ -> baseline { taskId, md5s } p/ monitor de substituição

    if (ativas.length === 0) {
      mostrarHud('⚠️ Nenhuma regra de comunicação ativa configurada.', 'warning');
      sinalizarConcluido(reqTs);
      return;
    }

    for (var i = 0; i < ativas.length; i++) {
      var regra = ativas[i];
      var tarefa = regra.tarefa || 'Preparar comunicação';

      mostrarHud(
        '⏳ [Regra ' + (i + 1) + '/' + ativas.length + '] Navegando para "' + tarefa + '"...',
        'info'
      );

      var navegou = await navegarParaTarefa(tarefa, forcarNav);
      if (!navegou) {
        mostrarHud('⚠️ Tarefa "' + tarefa + '" não encontrada em Minhas Tarefas. Pulando.', 'warning');
        continue;
      }

      // Aguarda chips de etiqueta aparecerem na tarefa
      try {
        await aguardarEtiquetasProntas(10000);
        await aguardar(800);
      } catch (e) {
        mostrarHud('⚠️ Timeout aguardando processos em "' + tarefa + '". Pulando.', 'warning');
        continue;
      }

      var cards = encontrarCardsComEtiqueta(regra.etiqueta);
      // Quando CNJ fornecido, filtra para abrir apenas o processo-alvo
      if (cnj) {
        cards = cards.filter(function(card) {
          var spanNum = card.querySelector(PJM_SEL.NUM_PROCESSO);
          var numText = spanNum ? String(spanNum.textContent || '').replace(/[^0-9]/g, '') : '';
          return numText === cnj;
        });
      }
      if (cards.length === 0) {
        mostrarHud(
          'ℹ️ Nenhum processo com etiqueta "' + regra.etiqueta + '" em "' + tarefa + '".',
          'info'
        );
        continue;
      }

      mostrarHud(
        '📋 ' + cards.length + ' processo(s) com "' + regra.etiqueta + '" para comunicação.',
        'info'
      );

      for (var j = 0; j < cards.length; j++) {
        mostrarHud(
          '📋 [' + (j + 1) + '/' + cards.length + '] Abrindo processo ' + (j + 1) + '...',
          'info'
        );

        await new Promise(function (resolve) {
          chrome.storage.local.set({
            [STORAGE_KEY_PREP_CMD]: {
              regra: regra,
              ts: Date.now(),
              processIndex: j,
              totalProcesses: cards.length
            }
          }, resolve);
        });

        // Captura CNJ deste card ANTES de clicar (o DOM muda ao abrir o processo).
        // A classificação (preenchido x já preparada) ocorre após o sinal do frame.
        var card = cards[j];
        var _cnjCard = cnj || null;
        if (!_cnjCard) {
          var _linkCnjCard = card.querySelector('a.selecionarProcesso');
          if (_linkCnjCard) _cnjCard = extrairCnjDeTexto(_linkCnjCard.textContent);
          if (!_cnjCard) _cnjCard = extrairCnjDeTexto(card.textContent);
        }
        var linkCard = card.querySelector('a.selecionarProcesso')
                    || card.querySelector('.datalist-content')
                    || card;
        linkCard.click();

        await aguardar(2500);

        mostrarHud('⏳ Aguardando preenchimento do processo ' + (j + 1) + '...', 'info');
        try {
          var sts = await aguardarStatusPrep(j, 90000);
          if (sts.error) {
            mostrarHud('⚠️ Processo ' + (j + 1) + ': ' + sts.error, 'warning');
            // Já preparada: registra p/ indicar na aba Tarefas e no relatório.
            if (/j[áa]\s+preparada/i.test(sts.error) && _cnjCard && logJaPreparada.indexOf(_cnjCard) === -1) {
              logJaPreparada.push(_cnjCard);
            }
          } else {
            mostrarHud('✅ Processo ' + (j + 1) + '/' + cards.length + ' comunicação preparada.', 'success');
            if (_cnjCard && logComunicacao.indexOf(_cnjCard) === -1) logComunicacao.push(_cnjCard);
            if (_cnjCard) { docRealPorCnj[_cnjCard] = sts.docReal || ''; docStatusPorCnj[_cnjCard] = sts.docStatus || ''; if (sts.taskId || (sts.md5s && sts.md5s.length)) basePorCnj[_cnjCard] = { taskId: sts.taskId || '', md5s: sts.md5s || [] }; }
          }
        } catch (e) {
          mostrarHud('⚠️ Timeout no processo ' + (j + 1) + '. Continuando...', 'warning');
          chrome.storage.local.remove(STORAGE_KEY_PREP_CMD);
        }

        await aguardar(1000);
      }
    }

    await aguardar(2000);
    // Registra comunicações no relatório (uma operação atômica por regra para evitar race condition)
    var regrasPrep = regras || [];
    regrasPrep.forEach(function(r) {
      var base = (r.labelRelatorio || r.etiqueta || r.comunicacao || 'Comunicação');
      var docDesc = descreverDocRegra(r);
      // Preenchidas nesta execução - carregam config + real + status.
      pjmLogAcaoMulti(null, logComunicacao, base + ' (Comunicação)', docDesc, docRealPorCnj, docStatusPorCnj, basePorCnj);
      // Já preparadas (puladas): rótulo distinto — acende o selo "Comunicação preexistente"
      // na aba Tarefas e aparece com essa frase no relatório (não conta como feita).
      pjmLogAcaoMulti(null, logJaPreparada, base + ' — Comunicação preexistente, aguardando providência (não elaborada)');
    });
    sinalizarConcluido(reqTs); // sinaliza ao motor de fila do overlay que o passo concluiu
    if (navegarNoFim !== false) { await navegarPainelPrincipal(); }
    mostrarHud('✅ Automação "Preparar Comunicação" concluída.', 'success');
  }

  function checarEExecutarPrep() {
    if (!document.querySelector('app-root, [ng-version]')) return;
    if (!chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get(STORAGE_KEY_PREP_ACN, function (r) {
      var cmd = r && r[STORAGE_KEY_PREP_ACN];
      if (!cmd || !cmd.regras || !cmd.ts) return;
      if (Date.now() - cmd.ts > TIMEOUT_MAX) {
        chrome.storage.local.remove(STORAGE_KEY_PREP_ACN);
        return;
      }
      chrome.storage.local.remove(STORAGE_KEY_PREP_ACN, function () {
        executarPrepararComunicacao(cmd.regras, cmd.cnj || null, cmd.navegarNoFim !== false, undefined, cmd.ts);
      });
    });
  }

  // ── Fila de Comunicar vinda dos AUTOS (comunicarFila) — drena SERIAL, FIFO ──
  // Cada job = { cnj, regra, ts }. Reusa executarPrepararComunicacao (prepara e
  // para; o motor não envia/assina). Um de cada vez, na ordem do clique.
  var STORAGE_KEY_COM_FILA = 'comunicarFila';
  var _drenandoFila = false;
  // Acha a regra de MOVIMENTAÇÃO pareada (mesma etiqueta) para o Comunicar composto.
  function acharRegraMovePorEtiqueta(etq) {
    var n = String(etq || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    return new Promise(function (resolve) {
      if (!n) { resolve(null); return; }
      try {
        chrome.storage.local.get('etiquetaRegras', function (r) {
          var regras = (r && r.etiquetaRegras) || [];
          resolve(regras.filter(function (x) {
            if (!x || x.ativo === false || !x.etiqueta) return false;
            return String(x.etiqueta).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim() === n;
          })[0] || null);
        });
      } catch (_) { resolve(null); }
    });
  }
  async function drenarComunicarFila() {
    if (_drenandoFila) return;
    if (!document.querySelector('app-root, [ng-version]')) return; // só no painel Angular
    _drenandoFila = true;
    try {
      while (true) {
        var job = await new Promise(function (resolve) {
          chrome.storage.local.get(STORAGE_KEY_COM_FILA, function (r) {
            var fila = (r && r[STORAGE_KEY_COM_FILA]) || [];
            resolve(fila.length ? fila[0] : null);
          });
        });
        if (!job || !job.regra) break;
        try {
          // 1) MOVE pareado (mesma etiqueta) → leva o processo até "Preparar comunicação".
          var moveRule = await acharRegraMovePorEtiqueta(job.regra && job.regra.etiqueta);
          if (moveRule) await executarRegras([moveRule], job.cnj || null, moveRule.tarefaInicial || '', job.ts);
          // 2) PREPARA (prepara e para) — forcarNav=true: navegação completa, pois
          //    acabamos de mover e a lista cacheada de "Preparar comunicação" está velha.
          await executarPrepararComunicacao([job.regra], job.cnj || null, false, true, job.ts);
        } catch (e) { console.warn('[PJM etiqueta-movimentador] job de comunicação falhou:', e); }
        // Remove o job processado (pelo ts) e segue para o próximo.
        await new Promise(function (resolve) {
          chrome.storage.local.get(STORAGE_KEY_COM_FILA, function (r) {
            var fila = (r && r[STORAGE_KEY_COM_FILA]) || [];
            var nova = fila.filter(function (x) { return x && x.ts !== job.ts; });
            chrome.storage.local.set({ [STORAGE_KEY_COM_FILA]: nova }, resolve);
          });
        });
      }
    } finally { _drenandoFila = false; }
  }
  // Drena o que já estiver na fila ao abrir/focar o painel (o onChanged não
  // dispara para valores que já existiam quando esta aba carregou).
  setTimeout(function () { try { drenarComunicarFila(); } catch (_) { } }, 1500);

  chrome.storage.onChanged.addListener(function (changes) {
    if (changes[STORAGE_KEY] && changes[STORAGE_KEY].newValue) {
      setTimeout(checarEExecutar, 300);
    }
    if (changes[STORAGE_KEY_INDIVIDUAL] && changes[STORAGE_KEY_INDIVIDUAL].newValue) {
      setTimeout(checarEExecutarIndividual, 300);
    }
    if (changes[STORAGE_KEY_REMOVER] && changes[STORAGE_KEY_REMOVER].newValue) {
      setTimeout(checarEExecutarRemover, 300);
    }
    if (changes[STORAGE_KEY_PREP_ACN] && changes[STORAGE_KEY_PREP_ACN].newValue) {
      setTimeout(checarEExecutarPrep, 300);
    }
    if (changes[STORAGE_KEY_COM_FILA] && changes[STORAGE_KEY_COM_FILA].newValue) {
      setTimeout(function () { try { drenarComunicarFila(); } catch (_) { } }, 300);
    }
    if (changes[STORAGE_KEY_VINCULAR] && changes[STORAGE_KEY_VINCULAR].newValue) {
      setTimeout(checarEExecutarVincular, 300);
    }
  });

  try { capturarBaseCanonica(); } catch (_) { console.warn('[PJM etiqueta-movimentador]', _); }
  setTimeout(checarEExecutar, 1500);
  setTimeout(checarEExecutarIndividual, 1500);
  setTimeout(checarEExecutarRemover, 1500);
  setTimeout(checarEExecutarPrep, 1500);
  setTimeout(checarEExecutarVincular, 1500);

  console.log('[PJM Etiqueta-Movimentador v6.18 +ctx +rmchip +acento +vincopc +veloc +cnjopt +restmove +diag +resolvtr +vincrest +resolvtarefa +apihdr +relmove +relmovecnj +serial +doccom +docreal +baseline] Carregado em', location.href.slice(0, 80));
})();
