// content/selectors.js
// R-5: fonte unica dos seletores frageis do PJe (mundo isolado).
// Carregado ANTES dos demais content scripts (ver manifest.json), igual ao data-juntada.js.
//
// Limite (isolamento de mundos do Chrome): scripts em world:'MAIN'
// (ajax-monitor, autos-open-bridge) e as funcoes injetadas
// pelo background.js NAO enxergam este objeto — esses pontos mantem os seletores localmente.
//
// Centralizados: juntada, paginador, etiqueta (nucleo), comunicacao (estaticos), numero do processo.
// Fora de escopo (por design): world:'MAIN', funcoes do background.js, popup.js e seletores dinamicos/perifericos.
window.PJM_SEL = window.PJM_SEL || {
  // Juntada de certidao -- IDs do formulario do PJe (instaveis: mudam a cada atualizacao)
  JUNTADA_TIPO_DOC:  'cbTDDecoration:cbTD',
  JUNTADA_MODELO:    'modTDDecoration:modTD',
  JUNTADA_DESCRICAO: 'ipDesc',

  // Paginador PrimeNG (auto-open.js)
  PAG_PAGE_ATIVA: 'a.ui-paginator-page.ui-state-active',
  PAG_PAGE:       'a.ui-paginator-page',
  PAG_NEXT_A:     'a.ui-paginator-next:not(.ui-state-disabled)',
  PAG_NEXT:       '.ui-paginator-next:not(.ui-state-disabled)',
  PAG_FIRST:      'a.ui-paginator-first:not(.ui-state-disabled), .ui-paginator-first:not(.ui-state-disabled)',
  PAG_LAST:       'a.ui-paginator-last:not(.ui-state-disabled), .ui-paginator-last:not(.ui-state-disabled)',

  // Movimentacao por etiqueta (etiqueta-movimentador.js)
  ETQ_CHECKBOX:       'button.botao-selecionar',
  ETQ_MARCADO:        'i.marcar-todos.fa-check-square',
  ETQ_MODAL:          '#modalMovimentarEmLote',
  ETQ_TRANSICOES:     'select#transicoes',
  ETQ_CHECK_ETIQUETA: '.botao-selecionar.check-etiqueta',

  // Preparar comunicacao (preparar-comunicacao.js) -- seletores estaticos
  PREP_PARTES:         'a[id*="partesTree:j__id123"]',
  PREP_PARTES_ALT:     'a[id*="prepararExpediente"][id*="partesTree"]',
  PREP_TIPO_ATO:       'select[id*="tipoAtoCombo"]',
  PREP_TIPO_ATO_CELLS: 'select[id*="destinatariosTable:"][id*=":tipoAtoCombo"]',

  // Numero do processo na lista (mapper.js, etiqueta-movimentador.js, auto-open.js)
  NUM_PROCESSO:      'span.tarefa-numero-processo',
  NUM_PROCESSO_PROC: 'span.tarefa-numero-processo.process',
  NUM_PROCESSO_FB:   'span.tarefa-numero-processo:not(.process)',
};

// Vários content scripts (coletor-api, coletor-expedientes, tabela-autos, juntada,
// mapper, auto-open) rodam em TODOS os frames do PJe, inclusive no iframe deste
// Participantes/Destinatários (o spinner trava mesmo com a resposta 200). Este
// detector permite que esses scripts se AUTO-BLINDEM. Sinais estáveis do formulário
// do assistente: ids contendo "prepararExpediente", "destinatarioSGB" ou "partesTree".
window.PJM_ehAssistentePrepararExpediente = function () {
  try {
    var p = location.pathname + location.search;
    if (/movimentar\.seam/i.test(p)) return true;
    // ter função. O console provou que rodavam neste frame e atropelavam o render.
    if (/\/a4j\//i.test(location.pathname) || /richfaces/i.test(location.pathname)) return true;
    // (3) Fallback por DOM (caso a URL do assistente mude em alguma atualização do PJe).
    return !!document.querySelector('[id*="prepararExpediente"], [id*="destinatarioSGB"], [id*="partesTree"]');
  } catch (_) { return false; }
};
