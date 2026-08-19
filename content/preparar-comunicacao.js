(function () {
  'use strict';

  // R-4: guard de reinjeção — evita observers/listeners duplicados se o script rodar 2x no mesmo documento
  if (window.__pjmPrepComLoaded) return;
  window.__pjmPrepComLoaded = true;

  var STORAGE_CMD  = 'prepComunicacaoComando';
  var STORAGE_STS  = 'prepComunicacaoStatus';
  var TIMEOUT_MAX  = 120000;

  // ─────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  function isFramePrepararExpediente() {
    return !!(
      document.querySelector(PJM_SEL.PREP_PARTES) ||
      document.querySelector(PJM_SEL.PREP_PARTES_ALT)
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Utilitários
  // ─────────────────────────────────────────────────────────────────────
  function aguardar(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function aguardarSeletor(seletor, timeout) {
    timeout = timeout || 8000;
    return new Promise(function (resolve, reject) {
      var inicio = Date.now();
      var timer = setInterval(function () {
        var el = document.querySelector(seletor);
        if (el && el.offsetParent !== null) {
          clearInterval(timer);
          resolve(el);
        } else if (Date.now() - inicio >= timeout) {
          clearInterval(timer);
          reject(new Error('timeout aguardando: ' + seletor));
        }
      }, 300);
    });
  }

  // forma assíncrona, então o nº de linhas pode crescer após a 1ª aparecer. Retorna
  // quando atinge 'esperado' e fica quieto por QUIET_MS, ou após uma quietação maior
  // (caso o esperado não seja atingido), ou no timeout.
  async function aguardarDestinatariosEstabilizar(esperado, maxMs) {
    maxMs = maxMs || 15000;
    var QUIET_MS = 1000;        // quieto curto quando já atingiu o esperado
    var QUIET_LONGO_MS = 3000;  // quieto longo: aceita mesmo sem atingir o esperado
    function conta() {
      return document.querySelectorAll(PJM_SEL.PREP_TIPO_ATO_CELLS).length;
    }
    var inicio = Date.now();
    var ultimo = -1, estavelDesde = Date.now();
    while (Date.now() - inicio < maxMs) {
      var atual = conta();
      if (atual !== ultimo) { ultimo = atual; estavelDesde = Date.now(); }
      var quietoMs = Date.now() - estavelDesde;
      if (atual > 0) {
        if (esperado && atual >= esperado && quietoMs >= QUIET_MS) return atual;
        if (quietoMs >= QUIET_LONGO_MS) return atual;
      }
      await aguardar(200);
    }
    return conta();
  }

  // MAIN em document.documentElement.dataset.pjmAjax. Evita timers fixos: retorna assim
  // que a requisição da última ação termina e o DOM assenta. Se o monitor não estiver
  // presente (atributo ausente), cai numa espera fixa de compatibilidade (fallbackMs).
  async function aguardarAjaxOcioso(maxMs, fallbackMs) {
    maxMs = maxMs || 8000;
    if (document.documentElement.dataset.pjmAjax === undefined) {
      await aguardar(fallbackMs != null ? fallbackMs : 1200);
      return;
    }
    function n() { return parseInt(document.documentElement.dataset.pjmAjax || '0', 10) || 0; }
    var t0 = Date.now();
    var graceEnd = Date.now() + 500;          
    while (Date.now() < graceEnd && n() === 0) await aguardar(50);
    while (Date.now() - t0 < maxMs) {
      if (n() === 0) {
        await aguardar(150);                  // margem p/ o DOM aplicar a resposta
        if (n() === 0) return;
      }
      await aguardar(60);
    }
  }

  function clickEl(el) {
    if (!el) return;
    try { el.click(); } catch (_) {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  }

  function setSelectByText(sel, texto) {
    if (!sel || !texto) return false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].text.trim() === texto) {
        sel.selectedIndex = i;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    // Fallback: match parcial case-insensitive
    var lower = texto.toLowerCase();
    for (var j = 0; j < sel.options.length; j++) {
      if (sel.options[j].text.trim().toLowerCase().includes(lower)) {
        sel.selectedIndex = j;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  // item 5: configuração por polo. Retorna {comunicacao,meio,tipoPrazo,prazo} do polo,
  // com fallback para os campos "flat" da regra (compatível com regras antigas).
  function cfgDoPolo(regra, key) {
    if (key && regra.polos && regra.polos[key]) return regra.polos[key];
    return { comunicacao: regra.comunicacao, meio: regra.meio, tipoPrazo: regra.tipoPrazo, prazo: regra.prazo };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Mapeamento por IDENTIDADE da parte (corrige a ordem instável dos destinatários)
  //
  // posição (poloSeq[rowIdx]) entrega a configuração ao polo errado. Aqui lemos a
  // árvore de partes para saber a qual polo cada parte pertence (chave = CNPJ/CPF;
  // nome normalizado como fallback) e casamos cada linha por essa identidade.
  // ─────────────────────────────────────────────────────────────────────
  function _soDigitos(s) { return ((s || '').match(/\d/g) || []).join(''); }

  function _norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  // Chaves de identidade de uma parte, em ORDEM de prioridade: documento (CNPJ/CPF)
  // e nome normalizado. Retorna ARRAY para casar mesmo quando uma fonte mostra o
  // documento e a outra só o nome (ou vice-versa).
  function _chavesParte(texto) {
    texto = texto || '';
    var chaves = [];
    var mDoc = texto.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
    if (mDoc) {
      var d = _soDigitos(mDoc[0]);
      if (d.length === 14 || d.length === 11) chaves.push('doc:' + d);   // 14 = CNPJ, 11 = CPF
    }
    var nome = texto
      .replace(/cnpj[:\s][\s\S]*$/i, '')
      .replace(/cpf[:\s][\s\S]*$/i, '')
      .replace(/\b(interessad[oa]|fiscal da lei|custos legis|requerente|requerid[oa]|autor|r[ée]u|exequente|executad[oa]|advogad[oa]|terceiro|representante|peticionante)\b/gi, '')
      .replace(/[()\-:.\/]/g, ' ');
    nome = _norm(nome);
    if (nome) chaves.push('nome:' + nome);
    return chaves;
  }

  // Texto da CÉLULA do destinatário (sem selects/inputs/ícones) — evita capturar as
  // opções dos dropdowns (Citação/Comunicação/...) que poluiriam o nome da parte.
  function _textoParteDaLinha(tr) {
    if (!tr) return '';
    var melhor = '';
    var tds = tr.querySelectorAll('td');
    for (var i = 0; i < tds.length; i++) {
      var c = tds[i].cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('select, option, input, button, i, script, style, noscript'), function (n) { n.remove(); });
      var t = (c.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length > melhor.length) melhor = t;
    }
    return melhor;
  }

  // Conjunto de identidades (chaves CNPJ/CPF/nome) das partes presentes AGORA na
  // tabela de destinatários. Base do "diff de inclusão": comparando antes/depois de
  // clicar cada polo, descobrimos quais partes aquele polo adicionou (sem depender
  // de id/estrutura da árvore, que se mostrou instável).
  function snapshotIdentidades() {
    var ids = {};
    var sels = document.querySelectorAll(PJM_SEL.PREP_TIPO_ATO_CELLS);
    Array.prototype.forEach.call(sels, function (sel) {
      _chavesParte(_textoParteDaLinha(sel.closest('tr'))).forEach(function (ch) { ids[ch] = true; });
    });
    return ids;
  }

  // ─────────────────────────────────────────────────────────────────────
  // ETAPA 1 — Escolher Destinatários
  // ─────────────────────────────────────────────────────────────────────
  async function etapa1(regra) {
    console.log('[PrepCom] Etapa 1: Escolher Destinatários');

    // GUARDA "já preparada": se a tabela de destinatários já tem linhas ANTES de
    // adicionarmos qualquer polo, este processo já possui comunicação preparada.
    // Não refazer (evita preencher por cima com dados errados) — informa e pula.
    var _jaExistentes = document.querySelectorAll(PJM_SEL.PREP_TIPO_ATO_CELLS).length;
    if (_jaExistentes > 0) {
      throw new Error('Comunicação já preparada (' + _jaExistentes + ' destinatário[s] já na lista) — processo pulado, nada alterado.');
    }

    // Adiciona os polos e descobre a identidade de cada parte por DIFF DE INCLUSÃO:
    // antes de clicar um polo, fotografa as identidades presentes; após o clique (e a
    // estabilização da tabela), as identidades NOVAS pertencem àquele polo. Robusto à
    // ordem instável das linhas e independente do id/estrutura da árvore.
    //
    // Cada polo tem dois links: a[id$=":handle"] (expander) e o link de texto que
    // adiciona ao destinatários. querySelectorAll + find pega o de texto (sem :handle).
    var poloIndices = [], poloSeq = [];
    if (regra.poloAtivo)   { poloIndices.push(0); poloSeq.push('ativo'); }
    if (regra.poloPassivo) { poloIndices.push(1); poloSeq.push('passivo'); }
    if (regra.terceiros)   { poloIndices.push(2); poloSeq.push('terceiros'); }

    if (poloIndices.length === 0) {
      throw new Error('Nenhum polo configurado para adicionar como destinatário.');
    }

    function _contaLinhas() {
      return document.querySelectorAll(PJM_SEL.PREP_TIPO_ATO_CELLS).length;
    }

    var mapaIdent = {};   // chave de identidade -> 'ativo'|'passivo'|'terceiros'
    var algumPoloAdicionado = false;

    for (var k = 0; k < poloIndices.length; k++) {
      var idx = poloIndices[k];
      var polo = poloSeq[k];

      var antes = snapshotIdentidades();
      var nAntes = _contaLinhas();

      var poloLinks = Array.from(
        document.querySelectorAll('a[id*="partesTree:j__id123:' + idx + '"]')
      );
      var btn = poloLinks.find(function (a) { return !a.id.endsWith(':handle'); });
      if (!btn) {
        console.warn('[PrepCom] Link de polo não encontrado para índice:', idx);
        continue;
      }
      clickEl(btn);
      algumPoloAdicionado = true;

      // Espera as linhas DESTE polo entrarem e a tabela estabilizar (>= 1 nova linha).
      await aguardarDestinatariosEstabilizar(nAntes + 1, 12000);

      // Identidades novas = partes adicionadas por ESTE polo.
      var depois = snapshotIdentidades();
      var novas = 0;
      for (var ch in depois) {
        if (antes[ch]) continue;
        if (!(ch in mapaIdent)) mapaIdent[ch] = polo;
        else if (mapaIdent[ch] !== polo) mapaIdent[ch] = '__ambiguo__'; // mesma chave em 2 polos: não arrisca
        novas++;
      }
      console.log('[PrepCom] Polo "' + polo + '": +' + novas + ' identidade(s) por diff de inclusão.');
    }

    if (!algumPoloAdicionado) {
      throw new Error('Nenhum polo configurado para adicionar como destinatário.');
    }

    // A tabela já estabilizou a cada polo; confirma que há linhas para preencher.
    try {
      await aguardarSeletor(PJM_SEL.PREP_TIPO_ATO, 8000);
    } catch (e) {
      throw new Error('Tabela de destinatários não apareceu após adicionar polo.');
    }
    console.log('[PrepCom] Destinatários prontos: ' + _contaLinhas() + ' linha(s).');

    // Configura cada linha de destinatário — específico por polo (item 5), resolvido
    // pela IDENTIDADE da parte de cada linha (não pela ordem de inserção).
    var rowIdx = 0;
    while (true) {
      var tipoSel = document.querySelector(
        'select[id*="destinatariosTable:' + rowIdx + ':tipoAtoCombo"]'
      );
      if (!tipoSel) break;

      // Tenta cada chave da linha (documento primeiro, depois nome) contra o mapa.
      var chavesLinha = _chavesParte(_textoParteDaLinha(tipoSel.closest('tr')));
      var poloDaLinha = null, chaveUsada = '';
      for (var ci = 0; ci < chavesLinha.length; ci++) {
        var pv = mapaIdent[chavesLinha[ci]];
        if (pv && pv !== '__ambiguo__') { poloDaLinha = pv; chaveUsada = chavesLinha[ci]; break; }
      }
      if (!poloDaLinha) {
        poloDaLinha = poloSeq[rowIdx];
        console.warn('[PrepCom] Linha ' + rowIdx + ': identidade não casou (' + (chavesLinha.join(', ') || '—') + '); usando polo posicional "' + poloDaLinha + '".');
      } else {
        console.log('[PrepCom] Linha ' + rowIdx + ' → polo "' + poloDaLinha + '" por identidade (' + chaveUsada + ').');
      }

      var cfg = cfgDoPolo(regra, poloDaLinha);

      if (cfg.comunicacao) {
        setSelectByText(tipoSel, cfg.comunicacao);
        await aguardarAjaxOcioso(8000, 1500);
      }

      var meioSel = document.querySelector(
        'select[id*="destinatariosTable:' + rowIdx + ':meioCom"]'
      );
      if (meioSel && cfg.meio) {
        setSelectByText(meioSel, cfg.meio);
        // Aguarda esse AJAX antes de mexer nos campos de prazo (senão são revertidos).
        await aguardarAjaxOcioso(8000, 1200);
      }

      var tipoPrazoSel = document.querySelector(
        'select[id*="destinatariosTable:' + rowIdx + ':tipoPrazoCombo"]'
      );
      if (tipoPrazoSel && cfg.tipoPrazo) setSelectByText(tipoPrazoSel, cfg.tipoPrazo);
      await aguardarAjaxOcioso(6000, 400);

      // o valor para o default. Reaplica até o input refletir o desejado (re-consulta o
      if (cfg.prazo !== undefined && String(cfg.prazo).trim() !== '') {
        var alvoPrazo = String(cfg.prazo).trim();
        for (var tp = 0; tp < 5; tp++) {
          var prazoInp = document.querySelector(
            'input[id*="destinatariosTable:' + rowIdx + ':quantidadePrazoAto"]'
          );
          if (!prazoInp) break;
          if (String(prazoInp.value).trim() === alvoPrazo) break;
          prazoInp.value = alvoPrazo;
          prazoInp.dispatchEvent(new Event('input', { bubbles: true }));
          prazoInp.dispatchEvent(new Event('change', { bubbles: true }));
          await aguardar(500);
        }
      }

      rowIdx++;
    }

    if (rowIdx === 0) {
      throw new Error('Nenhuma linha de destinatário configurada.');
    }
    console.log('[PrepCom] Etapa 1: ' + rowIdx + ' destinatário(s) configurado(s).');

    // Clicar PRÓXIMO
    var btnProx = document.querySelector('input[value="Próximo"]');
    if (!btnProx) throw new Error('Botão Próximo não encontrado na Etapa 1.');
    clickEl(btnProx);
    await aguardar(2000);
  }

  // ─────────────────────────────────────────────────────────────────────
  // ETAPA 2 — Preparar Ato
  // ─────────────────────────────────────────────────────────────────────
  async function etapa2(regra) {
    console.log('[PrepCom] Etapa 2: Preparar Ato');
    var _docReal = '', _docStatus = '';  // documento realmente anexado (conferência no Relatório)

    // Aguarda tabela de destinatários da etapa 2
    try {
      await aguardarSeletor('a[id*="tabelaDestinatarios:"]', 8000);
    } catch (e) {
      throw new Error('Tabela de destinatários não carregou na Etapa 2.');
    }
    await aguardar(500);

    // Coleta botões Editar (identificados pelo ícone fa-pencil)
    var editBtns = Array.from(
      document.querySelectorAll('a[id*="tabelaDestinatarios:"]')
    ).filter(function (a) {
      return a.offsetParent !== null && a.querySelector('.fa-pencil, .fa-edit');
    });

    // Fallback: todos os <a class="btn"> visíveis com fa-pencil em qualquer lugar
    if (editBtns.length === 0) {
      editBtns = Array.from(document.querySelectorAll('a.btn, a.btn-sm')).filter(function (a) {
        return a.offsetParent !== null && a.querySelector('.fa-pencil, .fa-edit');
      });
    }

    console.log('[PrepCom] Etapa 2: ' + editBtns.length + ' destinatário(s) para editar.');

    for (var i = 0; i < editBtns.length; i++) {
      var editBtn = editBtns[i];
      var row = editBtn.closest('tr');
      var isPRE = row && /PROCURADORIA REGIONAL ELEITORAL/i.test(row.textContent);
      console.log('[PrepCom] Editando destinatário', i + 1, isPRE ? '(PRE)' : '');

      clickEl(editBtn);
      await aguardar(1200);

      // Aguarda radios de instrumento aparecerem
      var radioDP = null, radioDN = null;
      try {
        radioDP = await aguardarSeletor('input[id*="selectInstrumentoRadio:0"]', 6000);
        radioDN = document.querySelector('input[id*="selectInstrumentoRadio:1"]');
      } catch (e) {
        console.warn('[PrepCom] Radios de instrumento não apareceram para destinatário', i + 1);
        continue;
      }

      if (regra.instrumento === 'DP') {
        // Documento do Processo
        if (radioDP && !radioDP.checked) {
          clickEl(radioDP);
          await aguardar(1000);
        }
        if (regra.tipoDocumento) {
          var _rDP = await selecionarDocumentoDoProcesso(regra.tipoDocumento);
          if (_docStatus !== 'ok') { _docReal = _rDP.real; _docStatus = _rDP.ok ? 'ok' : 'nao_anexado'; }
        }
      } else {
        // Documento Novo (DN)
        if (radioDN && !radioDN.checked) {
          clickEl(radioDN);
          await aguardar(1000);
        }
        if (regra.modeloDocumento) {
          var _rDN = await selecionarModeloNovo(regra.modeloDocumento);
          if (_docStatus !== 'ok') { _docReal = _rDN.real; _docStatus = _rDN.found ? (_rDN.exact ? 'ok' : 'diverge') : 'nao_anexado'; }
        }
      }

      // CONFIRMAR este destinatário
      var btnConf = document.querySelector('input[value="Confirmar"]');
      if (btnConf && btnConf.offsetParent !== null) {
        clickEl(btnConf);
        await aguardar(1500);
      } else {
        console.warn('[PrepCom] Botão Confirmar não encontrado para destinatário', i + 1);
      }
    }

    // PRÓXIMO → Etapa 3
    var btnProx = document.querySelector('input[value="Próximo"]');
    if (!btnProx) throw new Error('Botão Próximo não encontrado na Etapa 2.');
    clickEl(btnProx);
    await aguardar(1500);
    return { docReal: _docReal, docStatus: _docStatus };
  }

  /**
   * Seleciona documento do processo pelo tipo (coluna "Tipo" da tabela).
   * Após selecionar radio DP, o PJe exibe lista de documentos do processo.
   */
  async function selecionarDocumentoDoProcesso(tipoDocumento) {
    await aguardar(800);
    var rows = Array.from(document.querySelectorAll('tr')).filter(function (tr) {
      return tr.offsetParent !== null;
    });
    for (var r = 0; r < rows.length; r++) {
      var tds = Array.from(rows[r].querySelectorAll('td'));
      var temTipo = tds.some(function (td) {
        return td.textContent.trim() === tipoDocumento;
      });
      if (!temTipo) continue;

      // Identificação (best-effort) da linha selecionada: nomes/datas das demais
      // células, sem botões/ícones — permite conferir QUAL documento foi anexado.
      var _det = tds.map(function (td) {
        var c = td.cloneNode(true);
        Array.prototype.forEach.call(c.querySelectorAll('a,button,i,input,select,option,script,style'), function (n) { n.remove(); });
        return (c.textContent || '').replace(/\s+/g, ' ').trim();
      }).filter(function (t) { return t && t !== tipoDocumento; });
      var _detStr = _det.join(' · ');
      if (_detStr.length > 80) _detStr = _detStr.slice(0, 80) + '…';
      var _real = tipoDocumento + (_detStr ? ' — ' + _detStr : '');

      // ATENÇÃO: cada linha tem dois links:
      //   1. title="Visualizar"                  (fa-external-link) → abre popup em nova aba — ERRADO
      //   2. title="Usar como ato de comunicação" (fa-check-square-o) → seleciona o doc — CORRETO
      // Estratégia de seleção (ordem de prioridade):
      //   a) pelo title exato
      //   b) pelo ícone fa-check-square-o
      //   c) segundo <a> da linha (Visualizar é sempre o primeiro)
      var selBtn = rows[r].querySelector('a[title="Usar como ato de comunicação"]');
      if (!selBtn) {
        var iconCheck = rows[r].querySelector('i.fa-check-square-o, i.fa-check-square');
        if (iconCheck) selBtn = iconCheck.closest('a');
      }
      if (!selBtn) {
        var anchors = rows[r].querySelectorAll('a');
        selBtn = anchors.length > 1 ? anchors[1] : null;
      }

      if (selBtn && selBtn.offsetParent !== null) {
        clickEl(selBtn);
        await aguardar(1000);
        console.log('[PrepCom] Documento tipo "' + tipoDocumento + '" selecionado (real: "' + _real + '").');
        return { ok: true, real: _real };
      } else {
        console.warn('[PrepCom] Botão "Usar como ato de comunicação" não encontrado para tipo "' + tipoDocumento + '".');
        return { ok: false, real: _real };
      }
    }
    console.warn('[PrepCom] Documento tipo "' + tipoDocumento + '" não encontrado na lista.');
    return { ok: false, real: '' };
  }

  /**
   * Seleciona modelo de documento novo pelo nome no dropdown.
   */
  async function selecionarModeloNovo(nomeModelo) {
    await aguardar(500);
    // Busca qualquer select visível com opções suficientes (o select de modelo)
    var sels = Array.from(document.querySelectorAll('select')).filter(function (s) {
      return s.offsetParent !== null && s.options.length > 1;
    });
    // Prefere selects cujo ID contenha "modelo"
    var modeloSel = sels.find(function (s) { return /modelo/i.test(s.id); }) ||
                    sels[sels.length - 1] || null;
    if (!modeloSel) {
      console.warn('[PrepCom] Select de modelo não encontrado.');
      return { found: false, real: '', exact: false };
    }
    var ok = setSelectByText(modeloSel, nomeModelo);
    // Lê o texto REALMENTE selecionado (pode diferir do configurado por causa do
    // fallback de correspondência parcial em setSelectByText).
    var selText = '';
    if (modeloSel.selectedIndex >= 0 && modeloSel.options[modeloSel.selectedIndex]) {
      selText = (modeloSel.options[modeloSel.selectedIndex].text || '').trim();
    }
    var exact = ok && selText === String(nomeModelo || '').trim();
    if (ok) {
      console.log('[PrepCom] Modelo "' + nomeModelo + '" selecionado (real: "' + selText + '").');
    } else {
      console.warn('[PrepCom] Modelo "' + nomeModelo + '" não encontrado no select.');
    }
    await aguardar(500);
    return { found: ok, real: ok && selText ? ('Modelo: ' + selText) : '', exact: exact };
  }

  // ─────────────────────────────────────────────────────────────────────
  // ETAPA 3 — Escolher Documentos e Finalizar
  // ─────────────────────────────────────────────────────────────────────
  async function etapa3() {
    console.log('[PrepCom] Etapa 3: Finalizar');
    await aguardar(800);
    // Tenta Finalizar primeiro, depois Próximo como fallback
    var btnFin = document.querySelector('input[value="Finalizar"], button[id*="finalizar"]');
    if (btnFin && btnFin.offsetParent !== null) {
      clickEl(btnFin);
      console.log('[PrepCom] Botão Finalizar clicado.');
      await aguardar(1000);
      return;
    }
    var btnProx = document.querySelector('input[value="Próximo"]');
    if (btnProx && btnProx.offsetParent !== null) {
      clickEl(btnProx);
      console.log('[PrepCom] Botão Próximo (etapa 3) clicado.');
      await aguardar(1000);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Executor principal
  // ─────────────────────────────────────────────────────────────────────
  // ── Baseline p/ monitor de substituição (peça-base) ──────────────────
  // Correlação (taskId da task "Preparar Expediente") + impressão de conteúdo
  // (md5 de cada documento do ato, do bloco divAssinaturaMultipla). Defensivo:
  // retorna vazio se a página/estado não expuser (cai p/ CNJ + tipo).
  function lerTaskId() {
    var el = document.querySelector('[id*="Processo_Fluxo_prepararExpediente-"]');
    var m = el && el.id.match(/prepararExpediente-(\d+)/);
    return m ? m[1] : '';
  }
  function lerMd5sAssinatura() {
    var alvo = document.querySelector('[id$=":divAssinaturaMultipla"]');
    var txt = alvo ? (alvo.textContent || '') : '';
    var out = [], re = /md5=([0-9a-fA-F]{32})/g, m;
    while ((m = re.exec(txt))) if (out.indexOf(m[1]) === -1) out.push(m[1]);
    return out;
  }
  async function coletarBaseline() {
    // A etapa 3 costuma terminar na página de assinatura (prepara e para);
    // aguarda curto pelo bloco de assinatura para captar os md5 já prontos.
    for (var i = 0; i < 8 && !document.querySelector('[id$=":divAssinaturaMultipla"]'); i++) {
      await aguardar(250);
    }
    return { taskId: lerTaskId(), md5s: lerMd5sAssinatura() };
  }

  async function executarComando(cmd) {
    console.log('[PrepCom] Executando processo', cmd.processIndex + 1, '/', cmd.totalProcesses);
    try {
      // Garante Etapa 1 visível
      await aguardarSeletor(PJM_SEL.PREP_PARTES, 12000);
      await aguardar(500);

      await etapa1(cmd.regra);
      var _docInfo = await etapa2(cmd.regra);
      await etapa3();
      var _base = await coletarBaseline();

      chrome.storage.local.set({
        [STORAGE_STS]: {
          done: true,
          processIndex: cmd.processIndex,
          error: null,
          ts: Date.now(),
          docReal: (_docInfo && _docInfo.docReal) || '',
          docStatus: (_docInfo && _docInfo.docStatus) || '',
          taskId: _base.taskId,
          md5s: _base.md5s
        }
      });
      console.log('[PrepCom] ✅ Processo', cmd.processIndex + 1, 'concluído.');
    } catch (e) {
      console.error('[PrepCom] ❌ Erro:', e.message);
      chrome.storage.local.set({
        [STORAGE_STS]: {
          done: true,
          processIndex: cmd.processIndex,
          error: e.message,
          ts: Date.now()
        }
      });
    }
  }

  // Guarda contra dupla execução (o polling de carga e o onChanged podem coincidir).
  var _prepEmExec = false;

  function checarComando() {
    if (_prepEmExec) return;
    if (!isFramePrepararExpediente()) return;
    if (!chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get(STORAGE_CMD, function (r) {
      var cmd = r && r[STORAGE_CMD];
      if (!cmd || !cmd.ts) return;
      if (Date.now() - cmd.ts > TIMEOUT_MAX) {
        chrome.storage.local.remove(STORAGE_CMD);
        return;
      }
      if (_prepEmExec) return;
      _prepEmExec = true;
      chrome.storage.local.remove(STORAGE_CMD, function () {
        executarComando(cmd);
      });
    });
  }

  chrome.storage.onChanged.addListener(function (changes) {
    if (changes[STORAGE_CMD] && changes[STORAGE_CMD].newValue) {
      setTimeout(checarComando, 200);
    }
  });

  // o onChanged não dispara para este worker, e a árvore (partesTree) pode não estar
  // pronta em 800ms. Se já houver comando pendente, faz POLLING até o frame ficar pronto
  // e o comando ser consumido — em vez de uma única tentativa (que, perdida, deixava o
  // comando parado e a preparação não executava). Sem comando, só verifica uma vez.
  chrome.storage.local.get(STORAGE_CMD, function (r) {
    if (!(r && r[STORAGE_CMD] && r[STORAGE_CMD].ts)) { setTimeout(checarComando, 800); return; }
    var t0 = Date.now();
    var timer = setInterval(function () {
      if (_prepEmExec || Date.now() - t0 > 60000) { clearInterval(timer); return; }
      checarComando();
    }, 400);
  });

  console.log('[PrepCom v12 +docreal +baseline] Carregado em', location.href.slice(0, 80));
})();
