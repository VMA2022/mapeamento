/**
 * PJe Mapeador - Botao Flutuante
 *
 * Injeta um botao circular flutuante e arrastavel nas paginas do PJe.
 * - Posicao persistida em localStorage
 * - Diferencia clique (abre overlay) de arraste (move o botao)
 * - Roda apenas no top frame
 */

(function () {
  'use strict';

  // R-4: guard de reinjeção — evita observers/listeners duplicados se o script rodar 2x no mesmo documento
  if (window.__pjmFloatingBtnLoaded) return;
  window.__pjmFloatingBtnLoaded = true;

  if (window.top !== window.self) return;
  if (document.getElementById('pjm-floating-btn')) return;

  const STORAGE_KEY = 'pjm_btn_position';
  const DRAG_THRESHOLD = 5;

  function isPjePage() {
    const host = location.hostname;
    return /pje|tse/i.test(host);
  }

  if (!isPjePage()) return;

  // Nos autos digitais, a barra de ações (autos-acoes.js) fornece "Abrir painel".
  // Evita o ⚖️ solto duplicando a função só nessa tela.
  if (/listAutosDigitais\.seam/i.test(location.pathname + location.search)) return;

  const btn = document.createElement('button');
  btn.id = 'pjm-floating-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Abrir Mapeador PJe');
  btn.setAttribute('title', 'Clique: abrir painel  •  Clique direito: coletar todas as Minhas Tarefas');
  btn.innerHTML = '<span class="pjm-btn-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="34" height="34" style="display:block"><path d="M3.6399999999999997 0.0V-36.4H20.279999999999998Q25.272 -36.4 28.886 -34.788Q32.5 -33.176 34.476 -30.134Q36.452 -27.092 36.452 -22.932Q36.452 -18.823999999999998 34.476 -15.808Q32.5 -12.792 28.886 -11.154Q25.272 -9.516 20.279999999999998 -9.516H9.36L13.936 -13.988V0.0ZM13.936 -12.895999999999999 9.36 -17.628H19.656Q22.88 -17.628 24.466 -19.032Q26.052 -20.436 26.052 -22.932Q26.052 -25.48 24.466 -26.884Q22.88 -28.288 19.656 -28.288H9.36L13.936 -33.019999999999996ZM48.92 0.728Q44.916 0.728 41.666 -0.65Q38.416 -2.028 36.284 -4.628L41.9 -11.283999999999999Q43.355999999999995 -9.411999999999999 44.916 -8.45Q46.476 -7.4879999999999995 48.192 -7.4879999999999995Q52.768 -7.4879999999999995 52.768 -12.792V-28.444H40.184V-36.4H62.959999999999994V-13.415999999999999Q62.959999999999994 -6.292 59.372 -2.782Q55.784 0.728 48.92 0.728ZM83.228 0.46799999999999997Q78.23599999999999 0.46799999999999997 74.518 -1.43Q70.8 -3.328 68.746 -6.63Q66.692 -9.932 66.692 -14.144Q66.692 -18.355999999999998 68.69399999999999 -21.657999999999998Q70.696 -24.959999999999997 74.232 -26.805999999999997Q77.768 -28.651999999999997 82.18799999999999 -28.651999999999997Q86.348 -28.651999999999997 89.78 -26.961999999999996Q93.21199999999999 -25.272 95.24 -21.996Q97.268 -18.72 97.268 -14.04Q97.268 -13.52 97.216 -12.844Q97.16399999999999 -12.168 97.112 -11.596H74.804V-16.796H91.86L88.116 -15.34Q88.16799999999999 -17.264 87.41399999999999 -18.668Q86.66 -20.072 85.334 -20.851999999999997Q84.008 -21.631999999999998 82.24 -21.631999999999998Q80.472 -21.631999999999998 79.14599999999999 -20.851999999999997Q77.82 -20.072 77.09199999999998 -18.642Q76.36399999999999 -17.212 76.36399999999999 -15.287999999999998V-13.78Q76.36399999999999 -11.7 77.222 -10.192Q78.08 -8.684 79.69200000000001 -7.878Q81.304 -7.072 83.53999999999999 -7.072Q85.62 -7.072 87.102 -7.67Q88.584 -8.267999999999999 90.03999999999999 -9.516L95.24 -4.108Q93.21199999999999 -1.8719999999999999 90.24799999999999 -0.702Q87.28399999999999 0.46799999999999997 83.228 0.46799999999999997Z" transform="translate(13.55,62.00)" fill="#ffffff"/><polyline points="34,96 55,90 76,97 97,91" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="34" cy="96" r="5.4" fill="#bd93da"/><circle cx="55" cy="90" r="5.4" fill="#4cc9b6"/><circle cx="76" cy="97" r="5.4" fill="#f3ab43"/><circle cx="97" cy="91" r="5.4" fill="#6ea8ec"/></svg></span><span class="pjm-btn-badge" id="pjm-btn-badge">0</span>';

  function loadPosition() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const pos = JSON.parse(raw);
      if (typeof pos.left === 'number' && typeof pos.top === 'number') return pos;
    } catch (_) { console.warn('[PJM floating-button]', _); }
    return null;
  }

  function savePosition(left, top) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top })); } catch (_) { console.warn('[PJM floating-button]', _); }
  }

  function clampPosition(left, top) {
    const w = btn.offsetWidth || 56;
    const h = btn.offsetHeight || 56;
    const maxLeft = window.innerWidth - w - 4;
    const maxTop = window.innerHeight - h - 4;
    return {
      left: Math.max(4, Math.min(left, maxLeft)),
      top: Math.max(4, Math.min(top, maxTop)),
    };
  }

  function applyPosition(left, top) {
    const c = clampPosition(left, top);
    btn.style.left = c.left + 'px';
    btn.style.top = c.top + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  }

  let dragState = null;

  function onPointerDown(e) {
    if (e.type === 'mousedown' && e.button !== 0) return;

    const point = e.touches ? e.touches[0] : e;
    const rect = btn.getBoundingClientRect();

    dragState = {
      startX: point.clientX,
      startY: point.clientY,
      offsetX: point.clientX - rect.left,
      offsetY: point.clientY - rect.top,
      moved: false,
    };

    if (e.type === 'mousedown') {
      document.addEventListener('mousemove', onPointerMove, true);
      document.addEventListener('mouseup', onPointerUp, true);
    } else {
      document.addEventListener('touchmove', onPointerMove, { passive: false, capture: true });
      document.addEventListener('touchend', onPointerUp, true);
      document.addEventListener('touchcancel', onPointerUp, true);
    }

    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragState) return;
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - dragState.startX;
    const dy = point.clientY - dragState.startY;

    if (!dragState.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragState.moved = true;
      btn.classList.add('pjm-dragging');
    }

    if (dragState.moved) {
      const left = point.clientX - dragState.offsetX;
      const top = point.clientY - dragState.offsetY;
      applyPosition(left, top);
      if (e.cancelable) e.preventDefault();
    }
  }

  function onPointerUp(e) {
    if (!dragState) return;
    const wasDrag = dragState.moved;

    document.removeEventListener('mousemove', onPointerMove, true);
    document.removeEventListener('mouseup', onPointerUp, true);
    document.removeEventListener('touchmove', onPointerMove, { capture: true });
    document.removeEventListener('touchend', onPointerUp, true);
    document.removeEventListener('touchcancel', onPointerUp, true);

    btn.classList.remove('pjm-dragging');

    if (wasDrag) {
      const rect = btn.getBoundingClientRect();
      savePosition(rect.left, rect.top);
      const suppress = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      btn.addEventListener('click', suppress, { capture: true, once: true });
    } else {
      onButtonClick();
    }

    dragState = null;
  }

  function onButtonClick() {
    console.log('[PJeMapper] Clique no botao flutuante detectado.');
    if (typeof window.PJeOverlay === 'undefined') {
      console.error('[PJeMapper] window.PJeOverlay nao esta definido. O fullscreen-overlay.js falhou ao carregar?');
      alert('Mapeador PJe: o overlay nao carregou. Abra o console (F12) para ver o erro e me avise.');
      return;
    }
    try {
      window.PJeOverlay.open();
    } catch (e) {
      console.error('[PJeMapper] Erro ao abrir overlay:', e);
      alert('Erro ao abrir o overlay: ' + e.message);
    }
  }

  // Clique direito → varredura completa de Minhas Tarefas via API; abre o painel ao fim.
  function onColetarTudo(e) {
    if (e) e.preventDefault();
    if (!window.PJeColetorAPI || !window.PJeColetorAPI.coletarTudo) {
      alert('Mapeador PJe: coletor nao carregado. Recarregue a extensao (chrome://extensions).');
      return;
    }
    btn.classList.add('pjm-loading');
    Promise.resolve(window.PJeColetorAPI.coletarTudo())
      .then(function (res) {
        try {
          if (window.PJeOverlay && window.PJeOverlay.render) { window.PJeOverlay.render(res); window.PJeOverlay.open(); }
          else atualizarBadge(res);
        } catch (_) { atualizarBadge(res); }
      })
      .catch(function (err) {
        console.error('[PJeMapper] Erro na varredura completa:', err);
        alert('Erro na varredura completa: ' + ((err && err.message) || err));
      })
      .finally(function () { btn.classList.remove('pjm-loading'); });
  }

  function atualizarBadge(resultado) {
    const badge = btn.querySelector('#pjm-btn-badge');
    if (!badge) return;
    const total = (resultado && resultado.resumo && resultado.resumo.totalProcessos)
      || ((resultado && resultado.tarefas) || []).reduce((a, t) => a + ((t.processos && t.processos.length) || 0), 0);
    if (total > 0) {
      badge.textContent = total > 999 ? '999+' : String(total);
      badge.classList.add('pjm-visible');
    } else {
      badge.classList.remove('pjm-visible');
    }
  }

  window.PJeFloatingBtn = {
    atualizarBadge,
    setLoading: (on) => btn.classList.toggle('pjm-loading', !!on),
  };

  function aplicarAtivo(ativo) {
    btn.style.display = ativo ? '' : 'none';
  }

  function init() {
    document.body.appendChild(btn);

    const saved = loadPosition();
    if (saved) applyPosition(saved.left, saved.top);

    btn.addEventListener('mousedown', onPointerDown);
    btn.addEventListener('touchstart', onPointerDown, { passive: false });
    btn.addEventListener('contextmenu', onColetarTudo);

    window.addEventListener('resize', () => {
      const rect = btn.getBoundingClientRect();
      applyPosition(rect.left, rect.top);
    });

    // Verifica estado de Automação no storage (padrão: ativa)
    try {
      chrome.storage.local.get('pjmAtivo', function(r) {
        const ativo = !r || r.pjmAtivo !== false;
        aplicarAtivo(ativo);
      });
    } catch (_) { console.warn('[PJM floating-button]', _); }

    // Escuta toggle em tempo real disparado pelo popup
    try {
      chrome.runtime.onMessage.addListener(function(msg) {
        if (msg && msg.type === 'PJM_AUTO_TOGGLE') aplicarAtivo(!!msg.ativo);
      });
    } catch (_) { console.warn('[PJM floating-button]', _); }

    console.log('[PJeMapper] Botao flutuante carregado (v2 — clique direito: coletar tudo).');
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
