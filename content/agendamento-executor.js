/**
 * PJe - Executor de Agendamentos v2
 *
 * Verifica agendamentos do tipo 1 ("ao abrir PJe") na carga da página.
 * Se a data/hora já passou e o status é "aguardando", dispara a ação
 * escrevendo o storage command correto — o mesmo que o usuário escreveria
 * ao clicar manualmente na aba Etiquetas ou Comunicação do popup.
 *
 * Storage key lida : pjmAgendamentos (array de itens)
 * Storage keys escritas (conforme ação):
 *   etiquetaComando        → mover
 *   prepComunicacaoAcionar → comunicar
 *   ambas (sequenciais)    → mover+comunicar
 *
 * Para mover+comunicar: aguarda etiquetaComandoStatus.done antes de disparar
 * a comunicação, evitando corrida de navegação entre os dois executores.
 */
(function () {
  'use strict';

  // R-4: guard de reinjeção — evita observers/listeners duplicados se o script rodar 2x no mesmo documento
  if (window.__pjmAgendaExecLoaded) return;
  window.__pjmAgendaExecLoaded = true;

  // Executa apenas no frame Angular do PJe
  if (!document.querySelector('app-root, [ng-version]')) return;
  if (!chrome.storage || !chrome.storage.local) return;

  const STORAGE_KEY  = 'pjmAgendamentos';
  const TIMEOUT_MS   = 120000; // 2 min de segurança para aguardar movimentação
  const POLL_MS      = 500;

  function aguardar(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /**
   * Aguarda etiquetaComandoStatus.done === true (escrito por etiqueta-movimentador.js
   * ao finalizar qualquer pipeline). O parâmetro tsInicio garante que não aceitamos
   * um sinal de uma execução anterior.
   */
  function aguardarMovimentacaoConcluida(tsInicio) {
    return new Promise(function (resolve) {
      var deadline = Date.now() + TIMEOUT_MS;

      function verificar() {
        chrome.storage.local.get('etiquetaComandoStatus', function (r) {
          var sts = r && r.etiquetaComandoStatus;
          if (sts && sts.done && sts.ts >= tsInicio) {
            resolve();
          } else if (Date.now() >= deadline) {
            console.warn('[PJM Agenda] mover+comunicar: timeout aguardando etiquetaComandoStatus — disparando comunicação mesmo assim');
            resolve();
          } else {
            setTimeout(verificar, POLL_MS);
          }
        });
      }

      setTimeout(verificar, POLL_MS);
    });
  }

  /**
   * Verifica se um item de agendamento do tipo 1 deve ser executado agora.
   * Retorna true se a data atual >= data do agendamento
   * e, se houver hora mínima, hora atual >= hora mínima.
   */
  function deveExecutar(item) {
    if (item.tipo !== 1) return false;
    // Elegível se 'aguardando' OU 'executando' preso há >5min (recuperação de crash/reload).
    if (item.status !== 'aguardando' &&
        !(item.status === 'executando' && item.iniciadoAt && (Date.now() - item.iniciadoAt > 300000))) return false;

    var agora = new Date();
    var partes = item.data.split('-').map(Number);
    var dataAgenda = new Date(partes[0], partes[1] - 1, partes[2], 0, 0, 0);

    if (agora < dataAgenda) return false;

    if (item.hora) {
      var hm = item.hora.split(':').map(Number);
      var horaMin = new Date(partes[0], partes[1] - 1, partes[2], hm[0], hm[1], 0);
      if (agora < horaMin) return false;
    }

    return true;
  }

  // Dispara um comando de storage e AGUARDA o sinal de conclusão (etiquetaComandoStatus.done)
  // antes de retornar. Serializa a execução: o próximo agendamento só dispara após este
  // terminar — evita que a chave (etiquetaComando/prepComunicacaoAcionar) seja sobrescrita
  // antes de ser consumida (era a causa de "só o último ser executado").
  async function dispararEAguardar(chave, valorSemTs) {
    await new Promise(function (resolve) { chrome.storage.local.remove('etiquetaComandoStatus', resolve); });
    var ts = Date.now();
    var valor = Object.assign({}, valorSemTs, { ts: ts });
    await new Promise(function (resolve) { chrome.storage.local.set({ [chave]: valor }, resolve); });
    await aguardarMovimentacaoConcluida(ts);
  }

  // Marca UM item como 'feito' e persiste imediatamente — assim uma falha no meio não
  // marca como feitos os itens que ainda não rodaram.
  async function marcarFeito(id) {
    var r = await new Promise(function (resolve) { chrome.storage.local.get(STORAGE_KEY, resolve); });
    var lista = (r && r[STORAGE_KEY]) || [];
    var idx = lista.findIndex(function (it) { return it.id === id; });
    if (idx === -1) return;
    lista[idx].status = 'feito';
    lista[idx].execAt = new Date().toLocaleString('pt-BR');
    await new Promise(function (resolve) { chrome.storage.local.set({ [STORAGE_KEY]: lista }, resolve); });
  }

  async function marcarExecutando(id) {
    var r = await new Promise(function (resolve) { chrome.storage.local.get(STORAGE_KEY, resolve); });
    var lista = (r && r[STORAGE_KEY]) || [];
    var idx = lista.findIndex(function (it) { return it.id === id; });
    if (idx === -1) return;
    lista[idx].status = 'executando';
    lista[idx].iniciadoAt = Date.now();
    await new Promise(function (resolve) { chrome.storage.local.set({ [STORAGE_KEY]: lista }, resolve); });
  }

  async function marcarAguardando(id) {
    var r = await new Promise(function (resolve) { chrome.storage.local.get(STORAGE_KEY, resolve); });
    var lista = (r && r[STORAGE_KEY]) || [];
    var idx = lista.findIndex(function (it) { return it.id === id; });
    if (idx === -1) return;
    if (lista[idx].status === 'executando') lista[idx].status = 'aguardando';
    await new Promise(function (resolve) { chrome.storage.local.set({ [STORAGE_KEY]: lista }, resolve); });
  }

  async function executarAgendamentos() {
    const r = await new Promise(function (resolve) {
      chrome.storage.local.get(STORAGE_KEY, resolve);
    });
    const lista     = (r && r[STORAGE_KEY]) || [];
    const pendentes = lista.filter(deveExecutar);
    if (!pendentes.length) return;

    // Cria sessão de agendamento no relatório antes de executar
    await new Promise(function(resolve) {
      try {
        chrome.runtime.sendMessage({ type: 'PJM_INICIAR_SESSAO_AGENDAMENTO' }, function() { resolve(); });
      } catch(_) { resolve(); }
    });

    // SERIAL: um item por vez, aguardando a conclusão antes do próximo.
    for (let i = 0; i < pendentes.length; i++) {
      const item = pendentes[i];
      const acao = item.acao || 'mover';
      const cnj  = item.modo === 'cnj' ? item.alvo.replace(/[^0-9]/g, '') : null;

      console.log('[PJM Agenda] Executando item', item.id, '— ação:', acao, '— alvo:', item.alvo);

      try {
        await marcarExecutando(item.id);   // informa "▶️ Executando" na lista
        if (acao === 'mover' || acao === 'mover+comunicar') {
          await dispararEAguardar('etiquetaComando', { regras: item.regras || [], cnj: cnj });
          if (acao === 'mover+comunicar') {
            await dispararEAguardar('prepComunicacaoAcionar', { regras: item.regrasComunicacao || [], cnj: cnj, navegarNoFim: false });
          }
        } else if (acao === 'comunicar') {
          await dispararEAguardar('prepComunicacaoAcionar', { regras: item.regrasComunicacao || [], cnj: cnj, navegarNoFim: false });
        }
        // Marca como executado SÓ após concluir; persiste item a item.
        await marcarFeito(item.id);
      } catch (e) {
        console.warn('[PJM Agenda] Falha no item', item.id, '—', e && e.message, '— não marcado como feito (tentará de novo).');
        await marcarAguardando(item.id);   // reverte para reexecução
      }
    }
  }

  // Aguarda um pouco para o Angular terminar de montar o app
  setTimeout(executarAgendamentos, 2000);

  console.log('[PJM Agenda-Executor v4] Carregado em', location.href.slice(0, 80));
})();
