/**
 * PJe Mapeador — "Elaborar ato" direto na tela dos autos (Modelo A)
 *
 * Botão flutuante (📝) na tela dos autos. Ao clicar, abre um popover para
 * escolher Matéria / Fase / Modelo (lendo o catálogo do storage, o mesmo da
 * aba Juntada). Ao "Salvar e juntar":
 *   1. grava o ato em juntadaPorProcesso[cnj] (o content/juntada.js preenche o
 *      formulário quando ele aparece);
 *   2. clica em "Juntar documentos"  (#navbar:linkAbaIncluirPeticoes1);
 *   3. garante o rádio "Editor de texto" (#raTipoDocPrincipal:1) selecionado —
 *      reaplicando se o PJe resetar para "Arquivo PDF" durante os AJAX, até
 *      estabilizar. Isso carrega o modelo no editor.
 * A automação PARA aqui: o usuário revisa o texto e clica SALVAR.
 *
 * Selectores mapeados no PJe TRE-SP (podem mudar entre versões):
 *   - "Juntar documentos": navbar:linkAbaIncluirPeticoes1 (ícone do topo) /
 *                          navbar:linkAbaIncluirPeticoes (fallback)
 *   - "Editor de texto":   raTipoDocPrincipal:1  (Arquivo PDF = raTipoDocPrincipal:0)
 */
(function () {
  'use strict';
  if (window.top !== window.self) return;          // só no frame principal
  if (window.__pjmJuntadaAutos) return;
  window.__pjmJuntadaAutos = true;
  if (!/pje|tse/i.test(location.hostname)) return;

  var SEL_JUNTAR_1 = 'navbar:linkAbaIncluirPeticoes1';
  var SEL_JUNTAR_2 = 'navbar:linkAbaIncluirPeticoes';
  var SEL_RADIO_EDITOR = 'raTipoDocPrincipal:1';
  var SEL_MODELO = PJM_SEL.JUNTADA_MODELO;
  var SEL_EDITOR_IFRAME = 'docPrincipalEditorTextArea_ifr';
  var MARCADOR = 'inserir aqui';
  var POS_KEY = 'pjm_juntada_btn_pos';

  // ───────── CNJ ─────────
  var RE_CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  function detectarCnj() {
    var sels = ['[class*="numero-processo"]', '[class*="numeroProcesso"]', '.titulo-processo', '.cabecalho-processo', 'h1', 'h2'];
    for (var i = 0; i < sels.length; i++) {
      var els = document.querySelectorAll(sels[i]);
      for (var j = 0; j < els.length; j++) {
        var m = (els[j].textContent || '').match(RE_CNJ);
        if (m) return m[0];
      }
    }
    var mt = (document.title || '').match(RE_CNJ);
    if (mt) return mt[0];
    var mb = ((document.body && document.body.textContent) || '').match(RE_CNJ);
    return mb ? mb[0] : '';
  }
  function soDigitos(c) { return String(c || '').replace(/[^0-9]/g, ''); }
  // CNJ ESTRITO para reaproveitamento de aba: só responde quando ESTA aba é
  // realmente os autos de um processo (tem a navbar "Juntar documentos"). Sem o
  // fallback do body.textContent — assim uma aba de LISTA de tarefas (que tem
  // vários CNJs) nunca reivindica o CNJ e rouba o foco indevidamente.
  function detectarCnjAutos() {
    var ehAutos = !!(document.getElementById(SEL_JUNTAR_1) || document.getElementById(SEL_JUNTAR_2));
    if (!ehAutos) return '';
    var sels = ['.titulo-processo', '.cabecalho-processo', '[class*="numero-processo"]', '[class*="numeroProcesso"]', 'h1', 'h2'];
    for (var i = 0; i < sels.length; i++) {
      var els = document.querySelectorAll(sels[i]);
      for (var j = 0; j < els.length; j++) { var m = (els[j].textContent || '').match(RE_CNJ); if (m) return m[0]; }
    }
    var mt = (document.title || '').match(RE_CNJ);
    return mt ? mt[0] : '';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ───────── catálogo (do storage) ─────────
  var CATALOGO = [];
  function carregarCatalogo(cb) {
    try {
      chrome.storage.local.get('juntadaCatalogo', function (r) {
        CATALOGO = (r && r.juntadaCatalogo && Array.isArray(r.juntadaCatalogo.modelos)) ? r.juntadaCatalogo.modelos : [];
        if (cb) cb();
      });
    } catch (_) { if (cb) cb(); }
  }
  // Carrega o catálogo e pré-preenche o popover a partir do ato salvo para o CNJ atual
  // (mantém consistência com o "Elaborar ato" da aba Tarefas).
  function carregarParaAbrir(cb) {
    var cnj = soDigitos(detectarCnj());
    try {
      chrome.storage.local.get(['juntadaCatalogo', 'juntadaPorProcesso', 'pjmClassePorCnj'], function (r) {
        CATALOGO = (r && r.juntadaCatalogo && Array.isArray(r.juntadaCatalogo.modelos)) ? r.juntadaCatalogo.modelos : [];
        var ato = cnj && r && r.juntadaPorProcesso && r.juntadaPorProcesso[cnj];
        var _pc = (r && r.pjmClassePorCnj) || {};
        CLASSE_PROC = (cnj && _pc[cnj] && _pc[cnj].nome) ? { nome: _pc[cnj].nome, codigo: _pc[cnj].codigo || '' } : null;
        if (ato) draft = { materia: ato.materia || '', fase: ato.fase || '', modelo: ato.modelo || '', descricao: ato.descricao || '', textoInserir: ato.textoInserir || '' };
        if (!draft.materia) { var _cM = _classeAtual(); var _matAuto = _cM ? _materiaDaClasse(_cM) : ''; if (_matAuto) draft.materia = _matAuto; }
        if (cb) cb();
      });
    } catch (_) { if (cb) cb(); }
  }
  function catMaterias() { var s = {}; CATALOGO.forEach(function (m) { if (m.materia) s[m.materia] = 1; }); return Object.keys(s).sort(); }
  function catFases(mat) { var s = {}; CATALOGO.forEach(function (m) { if (m.fase && (!m.materia || m.materia === mat)) s[m.fase] = 1; }); return Object.keys(s).sort(); }
  // Filtro estrito: quando matéria/fase estão escolhidas, exige igualdade — então
  // genéricos (matéria/fase em branco) só aparecem com o respectivo campo em branco.
  function catModelosFor(mat, fase) {
    return CATALOGO.filter(function (m) {
      var okMat = mat ? (m.materia === mat) : true;
      var okFase = fase ? (m.fase === fase) : true;
      return okMat && okFase;
    });
  }
  function catDescricao(nome) { var m = CATALOGO.find(function (x) { return x && x.nome === nome; }); return m ? (m.descricao || '') : ''; }
  function _nrm(x) { return String(x == null ? '' : x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); }
  var CLASSE_PROC = null;
  function _classeAtual() {
    try { if (window.PJM_CLASSE_AUTOS && window.PJM_CLASSE_AUTOS.nome) return { nome: window.PJM_CLASSE_AUTOS.nome, codigo: window.PJM_CLASSE_AUTOS.codigo || '' }; } catch (_) { }
    return CLASSE_PROC;
  }
  function _filtrarPorClasse(modelos, cls) {
    if (!cls || !cls.nome) return modelos;
    var temClasses = modelos.some(function (m) { return m && m.classes && m.classes.length; });
    if (!temClasses) return modelos;
    var alvo = _nrm(cls.nome), cod = String(cls.codigo || '');
    var casa = function (m) { return (m.classes || []).some(function (c) { return (cod && String(c.codigo || '') === cod) || _nrm(c.nome) === alvo; }); };
    var daClasse = modelos.filter(function (m) { return m && m.nome && casa(m); });
    return daClasse.length ? daClasse : modelos;
  }
  // Matéria correspondente à classe: só retorna se os modelos da classe forem de UMA matéria.
  function _materiaDaClasse(cls) {
    if (!cls || !cls.nome) return '';
    var alvo = _nrm(cls.nome), cod = String(cls.codigo || ''), mats = {};
    CATALOGO.forEach(function (m) {
      if (!m.materia || !m.classes || !m.classes.length) return;
      if (m.classes.some(function (c) { return (cod && String(c.codigo || '') === cod) || _nrm(c.nome) === alvo; })) mats[m.materia] = 1;
    });
    var ks = Object.keys(mats);
    return ks.length === 1 ? ks[0] : '';
  }

  // ───────── posição do botão (arrastável, persistida) ─────────
  function clampPos(l, t) {
    var s = 50;
    return { left: Math.max(4, Math.min(l, window.innerWidth - s - 4)), top: Math.max(4, Math.min(t, window.innerHeight - s - 4)) };
  }
  function loadPos() {
    try { var raw = localStorage.getItem(POS_KEY); if (raw) { var p = JSON.parse(raw); if (typeof p.left === 'number' && typeof p.top === 'number') return p; } } catch (_) { console.warn('[PJM juntada-autos]', _); }
    return null;
  }
  function savePos(l, t) { try { localStorage.setItem(POS_KEY, JSON.stringify({ left: l, top: t })); } catch (_) { console.warn('[PJM juntada-autos]', _); } }
  var btnPos = loadPos();

  // ───────── UI (shadow DOM) ─────────
  var draft = { materia: '', fase: '', modelo: '', descricao: '', textoInserir: '' };
  var aberto = false;
  var _ocultarFab = false;  // nos autos, a barra (autos-acoes.js) assume o gatilho e esconde o fab 📝

  var host = document.createElement('div');
  host.id = 'pjm-juntada-autos';
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647';
  var shadow = host.attachShadow({ mode: 'open' });

  function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(label) + '</option>'; }

  function render() {
    if (!btnPos) btnPos = { left: window.innerWidth - 72, top: window.innerHeight - 72 };
    btnPos = clampPos(btnPos.left, btnPos.top);

    var cnj = detectarCnj();
    var materias = catMaterias();
    var fases = draft.materia ? catFases(draft.materia) : [];
    var vistos = {}, modelosUnicos = [];
    _filtrarPorClasse(catModelosFor(draft.materia, draft.fase), _classeAtual()).forEach(function (m) {
      if (m.nome && !vistos[m.nome]) { vistos[m.nome] = 1; modelosUnicos.push(m); }
    });

    var matOpts = opt('', '— matéria —', !draft.materia) + materias.map(function (m) { return opt(m, m, m === draft.materia); }).join('');
    var faseOpts = opt('', '— fase —', !draft.fase) + fases.map(function (f) { return opt(f, f, f === draft.fase); }).join('');
    var modOpts = opt('', '— modelo —', !draft.modelo) + modelosUnicos.map(function (m) {
      return opt(m.nome, m.nome + ((!m.materia || !m.fase) ? '  · genérico' : ''), m.nome === draft.modelo);
    }).join('');

    var ss = 'width:100%;padding:7px 9px;border:1px solid #d1d5db;border-radius:6px;font-size:12.5px;color:#1f2937;background:#fff;margin-top:3px;box-sizing:border-box';
    var ls = 'font-size:11px;color:#6b7280;font-weight:600;display:block;margin-top:8px';

    // posição estimada do popover (refinada em posicionarPopover após render)
    var pw = 300, phEst = 360;
    var popLeft = Math.min(Math.max(8, btnPos.left + 50 - pw), window.innerWidth - pw - 8);
    var popTop = (btnPos.top - phEst - 8 >= 8) ? (btnPos.top - phEst - 8) : Math.min(btnPos.top + 58, window.innerHeight - phEst - 8);
    if (popTop < 8) popTop = 8;

    var pop = aberto ? (
      '<div class="pop" style="left:' + popLeft + 'px;top:' + popTop + 'px">' +
        '<div class="pop-h"><span>📝 Elaborar ato</span><span style="flex:1"></span><button id="x" class="x" title="Fechar">×</button></div>' +
        '<div class="pop-b">' +
          (cnj ? '<div class="cnj">✔ CNJ: ' + esc(cnj) + '</div>'
               : '<div class="cnj warn">⚠ Abra os autos de um processo.</div>') +
          '<label style="' + ls + '">Matéria</label><select id="mMat" style="' + ss + '">' + matOpts + '</select>' +
          '<label style="' + ls + '">Fase</label><select id="mFas" style="' + ss + '"' + (draft.materia ? '' : ' disabled') + '>' + faseOpts + '</select>' +
          '<label style="' + ls + '">Modelo</label><select id="mMod" style="' + ss + '">' + modOpts + '</select>' +
          '<label style="' + ls + '">Descrição</label>' +
          '<textarea id="mDesc" rows="2" style="' + ss + ';resize:vertical;font-family:inherit">' + esc(draft.descricao) + '</textarea>' +
          '<label style="' + ls + '">Inserir no texto <span style="font-weight:400;color:#9ca3af">(substitui {{…}} ou "inserir aqui")</span></label>' +
          '<input id="mInserir" type="text" style="' + ss + '" value="' + esc(draft.textoInserir) + '" placeholder="ex.: Id da intimação">' +
          '<button id="salvar" class="btn">💾 Salvar e juntar</button>' +
        '</div>' +
      '</div>'
    ) : '';

    shadow.innerHTML =
      '<style>' +
      '.fab{position:fixed;width:50px;height:50px;border-radius:50%;background:#1a5276;color:#fff;border:none;cursor:grab;font-size:22px;box-shadow:0 3px 10px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;touch-action:none}' +
      '.fab:hover{background:#154360}' +
      '.fab:active{cursor:grabbing}' +
      '.pop{position:fixed;width:300px;background:#fff;border:1px solid #1a5276;border-radius:10px;overflow:hidden;font-family:Segoe UI,Arial,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)}' +
      '.pop-h{display:flex;align-items:center;gap:6px;padding:9px 12px;background:#eaf1f8;color:#1a5276;font-size:12.5px;font-weight:600}' +
      '.x{border:none;background:none;color:#1a5276;font-size:18px;cursor:pointer;line-height:1}' +
      '.pop-b{padding:11px}' +
      '.cnj{font-size:11px;color:#1e8449;background:#eafaf1;border:1px solid #a9dfbf;border-radius:6px;padding:5px 8px}' +
      '.cnj.warn{color:#9a7d0a;background:#fef9e7;border-color:#f9e79f}' +
      '.btn{width:100%;margin-top:12px;padding:9px;border:none;border-radius:7px;background:#1a5276;color:#fff;font-size:12.5px;font-weight:600;cursor:pointer}' +
      '.btn:hover{background:#154360}' +
      '</style>' +
      '<button class="fab" id="fab" title="Elaborar ato (juntada) — arraste para mover" style="left:' + btnPos.left + 'px;top:' + btnPos.top + 'px' + (_ocultarFab ? ';visibility:hidden;pointer-events:none' : '') + '">📝</button>' +
      pop;

    wire();
    if (aberto) posicionarPopover();
  }

  function posicionarPopover() {
    var fab = shadow.getElementById('fab');
    var pop = shadow.querySelector('.pop');
    if (!fab || !pop) return;
    var r = fab.getBoundingClientRect();
    var pw = 300, ph = pop.offsetHeight || 360;
    var left = Math.min(Math.max(8, r.right - pw), window.innerWidth - pw - 8);
    var top = (r.top - ph - 8 >= 8) ? (r.top - ph - 8) : Math.min(r.bottom + 8, window.innerHeight - ph - 8);
    if (top < 8) top = 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  // ───────── arrastar o botão ─────────
  var dragState = null;
  function onDown(e) {
    if (e.type === 'mousedown' && e.button !== 0) return;
    var p = e.touches ? e.touches[0] : e;
    var fab = shadow.getElementById('fab');
    var rect = fab.getBoundingClientRect();
    dragState = { fab: fab, startX: p.clientX, startY: p.clientY, offX: p.clientX - rect.left, offY: p.clientY - rect.top, moved: false };
    if (e.type === 'mousedown') {
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
    } else {
      document.addEventListener('touchmove', onMove, { passive: false, capture: true });
      document.addEventListener('touchend', onUp, true);
      document.addEventListener('touchcancel', onUp, true);
    }
  }
  function onMove(e) {
    if (!dragState) return;
    var p = e.touches ? e.touches[0] : e;
    var dx = p.clientX - dragState.startX, dy = p.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) > 5) dragState.moved = true;
    if (dragState.moved) {
      btnPos = clampPos(p.clientX - dragState.offX, p.clientY - dragState.offY);
      if (dragState.fab) { dragState.fab.style.left = btnPos.left + 'px'; dragState.fab.style.top = btnPos.top + 'px'; }
      if (aberto) posicionarPopover();
      if (e.cancelable) e.preventDefault();
    }
  }
  function onUp() {
    if (!dragState) return;
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mouseup', onUp, true);
    document.removeEventListener('touchmove', onMove, { capture: true });
    document.removeEventListener('touchend', onUp, true);
    document.removeEventListener('touchcancel', onUp, true);
    if (dragState.moved) {
      savePos(btnPos.left, btnPos.top);
      if (dragState.fab) dragState.fab.__pjmSuppress = true;   // ignora o click pós-arrasto
    }
    dragState = null;
  }

  function wire() {
    var fab = shadow.getElementById('fab');
    if (fab) {
      fab.addEventListener('mousedown', onDown);
      fab.addEventListener('touchstart', onDown, { passive: false });
      fab.onclick = function () {
        if (fab.__pjmSuppress) { fab.__pjmSuppress = false; return; }
        aberto = !aberto;
        if (aberto) carregarParaAbrir(render);
        else render();
      };
    }
    var x = shadow.getElementById('x');
    if (x) x.onclick = function () { aberto = false; render(); };
    var mMat = shadow.getElementById('mMat');
    if (mMat) mMat.onchange = function () { draft.materia = mMat.value; draft.fase = ''; draft.modelo = ''; draft.descricao = ''; render(); };
    var mFas = shadow.getElementById('mFas');
    if (mFas) mFas.onchange = function () { draft.fase = mFas.value; draft.modelo = ''; draft.descricao = ''; render(); };
    var mMod = shadow.getElementById('mMod');
    if (mMod) mMod.onchange = function () { draft.modelo = mMod.value; draft.descricao = draft.modelo ? (catDescricao(draft.modelo) || draft.modelo) : ''; render(); };
    var mDesc = shadow.getElementById('mDesc');
    if (mDesc) mDesc.oninput = function () { draft.descricao = mDesc.value; };
    var mIns = shadow.getElementById('mInserir');
    if (mIns) mIns.oninput = function () { draft.textoInserir = mIns.value; };
    var salvar = shadow.getElementById('salvar');
    if (salvar) salvar.onclick = onSalvar;
  }

  function onSalvar() {
    var d = soDigitos(detectarCnj());
    if (!d) { alert('Não consegui detectar o número do processo. Abra os autos digitais.'); return; }
    if (!draft.modelo) { alert('Selecione o modelo.'); return; }
    var descEl = shadow.getElementById('mDesc');
    var descricao = descEl ? descEl.value : draft.descricao;
    var insEl = shadow.getElementById('mInserir');
    var textoInserir = insEl ? insEl.value : (draft.textoInserir || '');
    try {
      chrome.storage.local.get('juntadaPorProcesso', function (r) {
        var mapa = (r && r.juntadaPorProcesso) || {};
        mapa[d] = { materia: draft.materia || '', fase: draft.fase || '', modelo: draft.modelo, descricao: descricao };
        chrome.storage.local.set({ juntadaPorProcesso: mapa, juntadaAutoEditor: { cnj: d, ts: Date.now(), textoInserir: textoInserir } }, function () {
          aberto = false;
          render();
          // Registra a ação no Relatório (ao "Salvar e juntar")
          try { chrome.runtime.sendMessage({ type: 'PJM_LOG_JUNTADA', cnj: d, label: 'Juntada (Certidão): ' + draft.modelo }); } catch (_) { console.warn('[PJM juntada-autos]', _); }
          var btn = document.getElementById(SEL_JUNTAR_1) || document.getElementById(SEL_JUNTAR_2);
          if (btn) {
            btn.click();
          } else {
            alert('Ato salvo. Não encontrei o botão "Juntar documentos" nesta tela — abra-o manualmente; o formulário será preenchido automaticamente.');
          }
        });
      });
    } catch (e) { alert('Erro ao salvar: ' + (e && e.message ? e.message : e)); }
  }

  // ───────── orquestração: garantir "Editor de texto" selecionado ─────────
  var flagEditor = null; // { cnj, ts }
  try {
    chrome.storage.local.get('juntadaAutoEditor', function (r) { flagEditor = (r && r.juntadaAutoEditor) || null; });
    chrome.storage.onChanged.addListener(function (ch) { if (ch.juntadaAutoEditor) { flagEditor = ch.juntadaAutoEditor.newValue || null; if (flagEditor) { radioOk = false; editorEstavelDesde = 0; ultimoCliqueEditor = 0; } } });
  } catch (_) { console.warn('[PJM juntada-autos]', _); }
  function limparFlag() { flagEditor = null; try { chrome.storage.local.remove('juntadaAutoEditor'); } catch (_) { console.warn('[PJM juntada-autos]', _); } }

  var ultimoCliqueEditor = 0;
  var editorEstavelDesde = 0;
  var radioOk = false;   // já garantiu "Editor de texto" marcado ao menos uma vez
  function garantirEditor() {
    if (!flagEditor) return;
    if (Date.now() - flagEditor.ts > 180000) { limparFlag(); return; }   // mantém ativo por 3 min
    var selModelo = document.getElementById(SEL_MODELO);
    var modeloAplicado = selModelo && selModelo.selectedIndex > 0 && selModelo.value;

    // 1) Garante "Editor de texto" marcado — só até estabilizar a 1ª vez. Depois não força
    //    mais (assim você pode trocar para "Arquivo PDF" se quiser, sem briga).
    if (!radioOk && modeloAplicado) {
      var radio = document.getElementById(SEL_RADIO_EDITOR);
      if (radio) {
        if (!radio.checked) {
          if (Date.now() - ultimoCliqueEditor > 300) {                   // debounce
            radio.click();
            try { radio.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) { console.warn('[PJM juntada-autos]', _); }
            ultimoCliqueEditor = Date.now();
          }
          editorEstavelDesde = 0;
        } else {
          if (!editorEstavelDesde) editorEstavelDesde = Date.now();
          else if (Date.now() - editorEstavelDesde > 1500) radioOk = true;
        }
      }
    }

    // 2) Insere o texto SEMPRE que o marcador aparecer (cobre recarga de modelo,
    //    troca de documento, restauração de rascunho, etc.) — idempotente.
    inserirTextoNoEditor();
  }

  // Substitui o marcador "inserir aqui" pelo valor do campo, dentro do editor
  // TinyMCE (iframe). Retorna true se inseriu (ou se não havia nada a inserir);
  // false se o marcador ainda não apareceu (para tentar de novo na próxima.
  function inserirTextoNoEditor() {
    var texto = flagEditor && flagEditor.textoInserir;
    if (!texto) return true;                                  // nada a inserir
    var ifr = document.getElementById(SEL_EDITOR_IFRAME);
    var body = ifr && ifr.contentDocument && ifr.contentDocument.body;
    if (!body) return false;
    var html = body.innerHTML;
    var temToken = /\{\{[^}]*\}\}/.test(html);                // {{...}} (recomendado)
    var temFrase = /inserir aqui/i.test(html);                // "inserir aqui" (legado)
    if (!temToken && !temFrase) return false;                 // modelo ainda sem marcador
    // {{...}} → valor ; "inserir aqui" com aspas ao redor → valor (remove as aspas)
    var reFrase = /["'“”‘’]?\s*inserir aqui\s*["'“”‘’]?/gi;
    var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
    var n, alvos = [];
    while ((n = walker.nextNode())) {
      var v = n.nodeValue || '';
      if (/\{\{[^}]*\}\}/.test(v) || v.toLowerCase().indexOf('inserir aqui') >= 0) alvos.push(n);
    }
    alvos.forEach(function (node) {
      node.nodeValue = node.nodeValue.replace(/\{\{[^}]*\}\}/g, texto).replace(reFrase, texto);
    });
    try { body.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) { console.warn('[PJM juntada-autos]', _); }   // TinyMCE registra
    return true;
  }

  // ───────── abrir o popover por mensagem do background / flag (Etapa B) ─────────
  function abrirPopover() { aberto = true; carregarParaAbrir(render); }

  // Hooks p/ a barra dos autos (autos-acoes.js): abrir o "Elaborar ato" e esconder o fab 📝.
  // A lógica de seleção (Matéria/Fase/Modelo/Descrição/Salvar) permanece intacta.
  window.PJM_abrirElaborarAto = abrirPopover;
  window.PJM_ocultarFabJuntada = function () {
    _ocultarFab = true;
    try { var f = shadow.getElementById('fab'); if (f) { f.style.visibility = 'hidden'; f.style.pointerEvents = 'none'; } } catch (_) { console.warn('[PJM juntada-autos]', _); }
  };
  function checarFlagPopup() {
    try {
      chrome.storage.local.get('pjmAbrirPopupJuntada', function (r) {
        var f = r && r.pjmAbrirPopupJuntada;
        if (!f) return;
        if (Date.now() - f.ts > 30000) { try { chrome.storage.local.remove('pjmAbrirPopupJuntada'); } catch (_) { console.warn('[PJM juntada-autos]', _); } return; }
        var d = soDigitos(detectarCnj());
        if (d && f.cnj === d) {
          try { chrome.storage.local.remove('pjmAbrirPopupJuntada'); } catch (_) { console.warn('[PJM juntada-autos]', _); }
          // (desacoplado) NÃO abre o popover sozinho — leitura primeiro; use o 📝 quando for elaborar.
        }
      });
    } catch (_) { console.warn('[PJM juntada-autos]', _); }
  }
  // ── Juntada em lote (Fase 3): ao abrir os autos, se este CNJ está na fila e tem
  //    ato salvo, clica "Juntar documentos" e arma o editor — PARA antes do SALVAR.
  function checarLoteJuntada() {
    try {
      chrome.storage.local.get(['pjmJuntadaLote', 'juntadaPorProcesso'], function (r) {
        var lote = r && r.pjmJuntadaLote;
        if (!lote || !Array.isArray(lote.cnjs) || !lote.cnjs.length) return;
        if (Date.now() - lote.ts > 300000) { try { chrome.storage.local.remove('pjmJuntadaLote'); } catch (_) { console.warn('[PJM juntada-autos]', _); } return; }   // 5 min
        var d = soDigitos(detectarCnj());
        if (!d || lote.cnjs.indexOf(d) < 0) return;
        if (window.__pjmLoteFeito === d) return;                            // já tratei este CNJ nesta aba
        var ato = r.juntadaPorProcesso && r.juntadaPorProcesso[d];
        if (!ato) return;                                                   // sem ato → nada a preparar
        var btn = document.getElementById(SEL_JUNTAR_1) || document.getElementById(SEL_JUNTAR_2);
        if (!btn) return;                                                   // navbar "Juntar documentos" ainda não pronta
        window.__pjmLoteFeito = d;
        try { chrome.storage.local.set({ juntadaAutoEditor: { cnj: d, ts: Date.now(), textoInserir: ato.textoInserir || '' } }); } catch (_) { console.warn('[PJM juntada-autos]', _); }
        try { chrome.runtime.sendMessage({ type: 'PJM_LOG_JUNTADA', cnj: d, label: 'Juntada preparada (lote): ' + (ato.modelo || '') }); } catch (_) { console.warn('[PJM juntada-autos]', _); }
        btn.click();                                                        // abre o formulário → juntada.js preenche; NÃO dá SALVAR
        try {
          chrome.storage.local.get('pjmJuntadaLote', function (r2) {        // remove este CNJ da fila
            var l2 = r2 && r2.pjmJuntadaLote; if (!l2 || !Array.isArray(l2.cnjs)) return;
            l2.cnjs = l2.cnjs.filter(function (x) { return x !== d; });
            if (l2.cnjs.length) chrome.storage.local.set({ pjmJuntadaLote: l2 });
            else { try { chrome.storage.local.remove('pjmJuntadaLote'); } catch (_) { console.warn('[PJM juntada-autos]', _); } }
          });
        } catch (_) { console.warn('[PJM juntada-autos]', _); }
      });
    } catch (_) { console.warn('[PJM juntada-autos]', _); }
  }
  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (msg && msg.type === 'PJM_QUAL_CNJ') { sendResponse({ cnj: soDigitos(detectarCnjAutos()) }); return true; }
      if (msg && msg.type === 'PJM_ABRIR_POPUP_JUNTADA') { sendResponse({ ok: true }); return true; }   // (desacoplado) não auto-abre
    });
  } catch (_) { console.warn('[PJM juntada-autos]', _); }

  // ───────── aprende a URL dos autos por CNJ (p/ abertura rápida) ─────────
  // CNJ no cabeçalho. Guardamos {CNJ → ...} para o painel abrir os autos direto depois.
  function aprenderCacheAutos() {
    try {
      if (!/listAutosDigitais\.seam/i.test(location.pathname + location.search)) return;
      var sp = new URLSearchParams(location.search);
      var idProcesso = sp.get('idProcesso');
      if (!idProcesso) return;
      var idTaskInstance = sp.get('idTaskInstance') || '';
      var ca = sp.get('ca') || '';
      var tent = 0;
      (function tentar() {
        var cnj = soDigitos(detectarCnj());
        if (cnj) {
          chrome.storage.local.get('juntadaAutosCache', function (r) {
            var cache = (r && r.juntadaAutosCache) || {};
            cache[cnj] = { idProcesso: idProcesso, idTaskInstance: idTaskInstance, ca: ca, url: location.href, ts: Date.now() };
            var ks = Object.keys(cache);
            if (ks.length > 300) {                                   // poda os mais antigos
              ks.sort(function (a, b) { return (cache[a].ts || 0) - (cache[b].ts || 0); });
              for (var i = 0; i < ks.length - 300; i++) delete cache[ks[i]];
            }
            chrome.storage.local.set({ juntadaAutosCache: cache });
            console.log('[PJM autos-cache] aprendido', cnj, '→ idProcesso', idProcesso);
          });
          return;
        }
        if (tent++ < 20) setTimeout(tentar, 300);                    // ~6s esperando o cabeçalho
      })();
    } catch (_) { console.warn('[PJM juntada-autos]', _); }
  }

  // ───────── init ─────────
  function init() {
    document.body.appendChild(host);
    aprenderCacheAutos();
    carregarCatalogo(render);
    host.style.display = detectarCnj() ? '' : 'none';
    checarFlagPopup();                                                    // abre o popover se veio pedido da lista
    checarLoteJuntada();                                                  // juntada em lote (Fase 3)
    setInterval(function () { host.style.display = detectarCnj() ? '' : 'none'; checarFlagPopup(); checarLoteJuntada(); }, 1500);
    setInterval(garantirEditor, 400);                                    // garante mesmo sem mutações
    var obs = new MutationObserver(function () { garantirEditor(); });
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', function () { if (btnPos) { btnPos = clampPos(btnPos.left, btnPos.top); var fab = shadow.getElementById('fab'); if (fab) { fab.style.left = btnPos.left + 'px'; fab.style.top = btnPos.top + 'px'; } if (aberto) posicionarPopover(); } });
    console.log('[PJM juntada-autos v1.11] Elaborar ato nos autos carregado (popover sob demanda + juntada em lote).');
  }
  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
