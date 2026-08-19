/**
 * content/classes-eleitorais.js  [pjm-classes-seed v1]
 * Dicionário SEMENTE sigla ↔ nome das classes eleitorais mais comuns.
 * O dicionário real (pjmClasseDicionario) é completado/corrigido automaticamente a
 * partir do TÍTULO dos autos (sigla) + cabeçalho "Classe judicial" (nome + código),
 * via content/classe-autos.js. Este seed só dá o pontapé antes de abrir os autos.
 * Carregado (manifest) antes de classe-autos.js e do fullscreen-overlay.js.
 */
window.PJM_CLASSES_SEED = window.PJM_CLASSES_SEED || [
  { sigla: 'RCand',    nome: 'REGISTRO DE CANDIDATURA' },
  { sigla: 'PropPart', nome: 'PROPAGANDA PARTIDÁRIA' },
  { sigla: 'RP',       nome: 'REPRESENTAÇÃO' },
  { sigla: 'AIJE',     nome: 'AÇÃO DE INVESTIGAÇÃO JUDICIAL ELEITORAL' },
  { sigla: 'AIME',     nome: 'AÇÃO DE IMPUGNAÇÃO DE MANDATO ELETIVO' },
  { sigla: 'RCED',     nome: 'RECURSO CONTRA EXPEDIÇÃO DE DIPLOMA' },
  { sigla: 'PC',       nome: 'PRESTAÇÃO DE CONTAS' },
  { sigla: 'Pet',      nome: 'PETIÇÃO' },
  { sigla: 'RE',       nome: 'RECURSO ELEITORAL' }
];
