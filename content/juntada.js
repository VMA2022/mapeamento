/**
 * PJe Mapeador — Automação de Juntada (integração CoPPEx)
 *
 * Detecta o formulário de juntada de atos processuais do PJe e aplica
 * automaticamente:
 *   1. Seleciona o tipo "Certidão"
 *   2. Filtra os modelos disponíveis pela fase configurada
 *   3. Seleciona o modelo fixo (se houver) e preenche a descrição
 *
 * Lê faseAlvo / modeloAlvo do chrome.storage.local do próprio Mapeador
 * (gravados pela aba "Juntada" do overlay).
 *
 * Depende de BANCO_MODELOS_COPPEX e DESCRICOES_COPPEX definidos em data-juntada.js,
 * que é carregado antes deste script pelo manifest.json.
 */

(function () {
  'use strict';

  // Guarda referência para não registrar o observer mais de uma vez por frame
  if (window.__pjmJuntadaCarregado) return;
  window.__pjmJuntadaCarregado = true;
  if (window.PJM_ehAssistentePrepararExpediente && window.PJM_ehAssistentePrepararExpediente()) return;

  // Detecta o número CNJ do processo cujos autos estão abertos.
  // Usado para aplicar o ato configurado por processo (Opção B).
  // OBS: os seletores do cabeçalho podem variar entre versões do PJe — o
  // fallback por regex no texto da página cobre a maioria dos casos.
  function detectarCnjDosAutos() {
    const re = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
    const seletores = [
      '[class*="numero-processo"]', '[class*="numeroProcesso"]',
      '.titulo-processo', '.cabecalho-processo', '.processo-numero',
      'a[href*="numeroProcesso"]', 'h1', 'h2'
    ];
    for (const sel of seletores) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const m = (el.textContent || '').match(re);
        if (m) return m[0].replace(/[^0-9]/g, '');
      }
    }
    const mt = (document.title || '').match(re);
    if (mt) return mt[0].replace(/[^0-9]/g, '');
    const mb = ((document.body && document.body.textContent) || '').match(re);
    if (mb) return mb[0].replace(/[^0-9]/g, '');
    return '';
  }

  function normCls(s) {
    return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }

  // Aviso in-place quando a classe do processo nao tem NENHUM modelo marcado.
  // Decisao: nesse caso mostramos TODOS os modelos -- nunca deixar o usuario sem saida.
  function mostrarAvisoClasse(cls) {
    const ID = 'pjm-aviso-classe';
    const el = document.getElementById(ID);
    if (!cls) { if (el) el.remove(); return; }
    if (el) return;                       // ja existe (evita re-inserir a cada mutacao)
    const sel = document.getElementById(PJM_SEL.JUNTADA_MODELO);
    if (!sel || !sel.parentNode) return;
    const d = document.createElement('div');
    d.id = ID;
    d.style.cssText = 'margin:6px 0;padding:6px 10px;border:1px solid #e8c79b;background:#fdf0e3;color:#9a4b0a;border-radius:6px;font-size:12px';
    d.textContent = 'Nenhum modelo marcado para a classe "' + (cls.nome || '') + (cls.codigo ? ' (' + cls.codigo + ')' : '') + '". Mostrando todos os modelos.';
    sel.parentNode.insertBefore(d, sel);
  }

  function aplicarAutomacaoJuntada() {
    chrome.storage.local.get(['faseAlvo', 'modeloAlvo', 'juntadaPorProcesso', 'juntadaCatalogo', 'pjmClassePorCnj'], (res) => {
      let faseAlvo   = res.faseAlvo   || '';
      let modeloAlvo = res.modeloAlvo || '';
      let descricaoForcada = '';

      // Ato por processo (Opção B): se houver config salva para o CNJ destes autos,
      // ela tem prioridade sobre a configuração global da aba Juntada.
      const mapaPorProcesso = res.juntadaPorProcesso || {};
      const cnjAtual = detectarCnjDosAutos();
      if (cnjAtual && mapaPorProcesso[cnjAtual]) {
        const ato = mapaPorProcesso[cnjAtual];
        faseAlvo   = ato.fase   || '';   // pode ser vazio (modelo genérico, sem fase)
        modeloAlvo = ato.modelo || '';
        descricaoForcada = ato.descricao || '';
      }

      // Catálogo editável de modelos (passo 5); null enquanto não migrado
      const catModelos = (res.juntadaCatalogo && Array.isArray(res.juntadaCatalogo.modelos)) ? res.juntadaCatalogo.modelos : null;
      const descDoCatalogo = (nome) => {
        if (!catModelos) return '';
        const m = catModelos.find(x => x && x.nome === nome);
        return m ? (m.descricao || '') : '';
      };

      // ── Classe do processo (fase 3) ────────────────────────────────────────
      // A classe vem do cache pjmClassePorCnj (cabecalho dos autos + REST) ou do
      // classe-autos.js no mesmo frame. O filtro so LIGA quando o catalogo tem
      // classes marcadas -- ou seja, e opt-in pelo proprio uso, nao muda nada antes.
      const cacheCls = res.pjmClassePorCnj || {};
      const clsProc = (cnjAtual && cacheCls[cnjAtual]) ? cacheCls[cnjAtual] : (window.PJM_CLASSE_AUTOS || null);
      const catTemClasses = !!(catModelos && catModelos.some(m => m && Array.isArray(m.classes) && m.classes.length));
      const podeFiltrarPorClasse = !!(clsProc && clsProc.nome && catTemClasses);

      // Nada a aplicar se não há fase, nem modelo, nem filtro por classe
      if (!faseAlvo && !modeloAlvo && !podeFiltrarPorClasse) return;

      const selectTipo     = document.getElementById(PJM_SEL.JUNTADA_TIPO_DOC);
      const selectModelo   = document.getElementById(PJM_SEL.JUNTADA_MODELO);
      const campoDescricao = document.getElementById(PJM_SEL.JUNTADA_DESCRICAO);

      if (!selectTipo || !selectModelo) return;

      // 1. Fixar Tipo "Certidão" — busca pelo texto, não pelo valor numérico
      //    (o valor numérico muda a cada atualização do PJe)
      const optionCertidao = Array.from(selectTipo.options)
        .find(opt => opt.textContent.trim() === 'Certidão');
      if (!optionCertidao) return;

      if (selectTipo.value !== optionCertidao.value) {
        selectTipo.value = optionCertidao.value;
        if (campoDescricao) campoDescricao.value = '';
        selectTipo.dispatchEvent(new Event('change', { bubbles: true }));
        return; // aguarda o PJe recarregar os modelos via AJAX (nova mutação virá)
      }

      // 2. Conjunto de modelos PERMITIDOS: classe (prioritária) e/ou fase.
      let permitidos = null;      // null = nao filtra
      let avisoClasse = null;     // classe sem nenhum modelo marcado -> mostra todos + aviso

      if (podeFiltrarPorClasse) {
        const alvo = normCls(clsProc.nome);
        const cod  = String(clsProc.codigo || '');
        const casa = (m) => (m.classes || []).some(c =>
          (cod && String(c.codigo || '') === cod) || normCls(c.nome) === alvo);
        const daClasse = catModelos.filter(m => m && m.nome && casa(m));
        if (daClasse.length) {
          // So os modelos marcados para a classe. "Sem classe" NAO e mais universal:
          // um modelo coringa deve ser marcado com TODAS as classes em que aparece.
          permitidos = new Set(daClasse.map(m => m.nome));
        } else {
          avisoClasse = clsProc;   // nenhum modelo marcado p/ esta classe -> nao filtra
        }
      }

      // Fase: refina o conjunto, mas NUNCA o zera (nao deixar o usuario sem opcoes).
      if (faseAlvo) {
        let daFase = [];
        if (catModelos) {
          daFase = catModelos.filter(m => m && m.nome && (!m.fase || m.fase === faseAlvo)).map(m => m.nome);
        } else if (typeof BANCO_MODELOS_COPPEX !== 'undefined') {
          const sf = new Set();
          for (const fases of Object.values(BANCO_MODELOS_COPPEX)) {
            if (fases[faseAlvo]) fases[faseAlvo].forEach(n => sf.add(n));
          }
          daFase = Array.from(sf);
        }
        if (daFase.length) {
          if (permitidos) {
            const inter = daFase.filter(n => permitidos.has(n));
            if (inter.length) permitidos = new Set(inter);   // so aperta se sobrar algo
          } else {
            permitidos = new Set(daFase);
          }
        }
      }

      // 3. Filtrar o select (preserva a opção padrão "Selecione")
      if (permitidos && permitidos.size > 0) {
        Array.from(selectModelo.options).forEach(opt => {
          const ehOpcaoPadrao = !opt.value ||
            opt.value === 'org.jboss.seam.ui.NoSelectionConverter.noSelectionValue';
          if (!ehOpcaoPadrao && !permitidos.has(opt.textContent.trim())) {
            opt.remove();
          }
        });
      }
      mostrarAvisoClasse(avisoClasse);

      // 4. Se há modelo fixo: selecionar automaticamente e preencher descrição
      if (modeloAlvo) {
        const opcaoAlvo = Array.from(selectModelo.options)
          .find(opt => opt.textContent.trim() === modeloAlvo);

        if (opcaoAlvo && selectModelo.value !== opcaoAlvo.value) {
          selectModelo.value = opcaoAlvo.value;
          selectModelo.dispatchEvent(new Event('change', { bubbles: true }));

          if (campoDescricao) {
            const descricao = descricaoForcada
              || descDoCatalogo(modeloAlvo)
              || ((typeof DESCRICOES_COPPEX !== 'undefined' && DESCRICOES_COPPEX[modeloAlvo]) ? DESCRICOES_COPPEX[modeloAlvo] : modeloAlvo);
            campoDescricao.value = descricao;
          }
        }
      }
      // Se não há modelo fixo: select já está filtrado, usuário escolhe manualmente
    });
  }

  // Ao usuário escolher o modelo manualmente no select do PJe, preenche a descrição
  // (consulta primeiro o catálogo editável; cai para as constantes do data-juntada.js)
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === PJM_SEL.JUNTADA_MODELO) {
      const nomeModelo = e.target.options[e.target.selectedIndex]?.textContent.trim();
      const campoDescricao = document.getElementById(PJM_SEL.JUNTADA_DESCRICAO);
      if (!nomeModelo || !campoDescricao) return;
      chrome.storage.local.get('juntadaCatalogo', (res) => {
        const cat = (res.juntadaCatalogo && Array.isArray(res.juntadaCatalogo.modelos)) ? res.juntadaCatalogo.modelos : null;
        let desc = '';
        if (cat) {
          const m = cat.find(x => x && x.nome === nomeModelo);
          if (m) desc = m.descricao || '';
        }
        if (!desc && typeof DESCRICOES_COPPEX !== 'undefined' && DESCRICOES_COPPEX[nomeModelo]) {
          desc = DESCRICOES_COPPEX[nomeModelo];
        }
        campoDescricao.value = desc || nomeModelo;
      });
    }
  });

  // Observa mutações no DOM para detectar quando o formulário de juntada aparece
  const observer = new MutationObserver(() => aplicarAutomacaoJuntada());
  observer.observe(document.body, { childList: true, subtree: true });

  console.log('[PJe Mapeador] Automação de juntada carregada.');
})();
