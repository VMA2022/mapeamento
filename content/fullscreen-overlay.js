/**
 * PJe Mapeador - Overlay Fullscreen (v6 - rebuild)
 */
(function () {
  'use strict';

  // Stub imediato para o botao flutuante encontrar algo definido
  window.PJeOverlay = {
    open: function () { console.warn('[PJeOverlay] stub ainda carregando'); },
    close: function () {},
    setLoading: function () {},
    setError: function () {},
    render: function () {},
  };

  if (window.top !== window.self) return;
  if (window.__PJeOverlayLoaded) return;

  try {
    console.log('[PJeOverlay] Iniciando carga...');
    initOverlay();
    window.__PJeOverlayLoaded = true;
    console.log('[PJeOverlay] Carregado com sucesso.');
  } catch (e) {
    console.error('[PJeOverlay] ERRO FATAL na carga:', e);
    alert('Mapeador PJe - erro ao carregar overlay: ' + e.message);
  }

  function initOverlay() {
    const host = document.createElement('div');
    host.id = 'pjm-overlay-host';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:none;';
    const shadow = host.attachShadow({ mode: 'open' });

    const STYLE = `
      :host { all: initial; }
      * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Arial, sans-serif; }
      .bd { position: fixed; inset: 0; background: rgba(15,23,42,0.55); pointer-events: auto; }
      .panel { position: fixed; inset: 0; background: #f8fafc; display: flex; flex-direction: column; }
      .hdr { background: linear-gradient(135deg,#1a5276,#2980b9); color:#fff; padding:14px 24px; display:flex; align-items:center; gap:16px; }
      .hdr h1 { margin:0; font-size:18px; font-weight:600; }
      .hdr .sp { flex:1; }
      .ibtn { background:rgba(255,255,255,0.15); border:none; color:#fff; width:36px; height:36px; border-radius:8px; cursor:pointer; font-size:16px; }
      .ibtn:hover { background:rgba(255,255,255,0.25); }
      .tabs { display:flex; background:#fff; border-bottom:1px solid #e5e7eb; padding:0 24px; overflow-x:auto; }
      .tab { padding:12px 18px; background:none; border:none; font-size:13px; color:#6b7280; cursor:pointer; border-bottom:3px solid transparent; white-space:nowrap; }
      .tab:hover { color:#1a5276; background:#f9fafb; }
      .tab.act { color:#1a5276; border-bottom-color:#1a5276; font-weight:600; }
      .tsep { align-self:stretch; width:1px; background:#e5e7eb; margin:8px 12px; flex:0 0 auto; }
      .tsep-r { margin:8px 12px 8px auto; }
      .body { flex:1; overflow:auto; padding:24px; }
      .kpis { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px; margin-bottom:24px; }
      .kpi { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:18px 20px; }
      .kpi .lbl { font-size:11px; text-transform:uppercase; color:#6b7280; font-weight:600; margin-bottom:8px; }
      .kpi .val { font-size:28px; font-weight:700; color:#1a5276; }
      .sec { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:18px 20px; margin-bottom:20px; }
      .sec h2 { margin:0 0 14px; font-size:14px; font-weight:600; color:#1f2937; }
      .bar-row { display:grid; grid-template-columns:180px 1fr 56px; gap:12px; align-items:center; font-size:13px; padding:6px 0; }
      .bar-nm { color:#374151; text-transform:capitalize; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .bar-tr { background:#f1f5f9; height:8px; border-radius:4px; overflow:hidden; }
      .bar-fl { height:100%; background:linear-gradient(90deg,#1a5276,#2980b9); border-radius:4px; }
      .bar-fl.etq { background:linear-gradient(90deg,#8e44ad,#b06fc7); }
      .bar-ct { text-align:right; font-weight:600; color:#1a5276; }
      table { width:100%; border-collapse:collapse; font-size:13px; background:#fff; }
      th { background:#f9fafb; text-align:left; padding:10px 14px; border-bottom:1px solid #e5e7eb; font-size:11px; text-transform:uppercase; color:#4b5563; font-weight:600; }
      td { padding:10px 14px; border-bottom:1px solid #f3f4f6; color:#374151; }
      tr:hover td { background:#f9fafb; cursor:pointer; }
      .tag { display:inline-block; padding:2px 8px; background:#eef2ff; color:#4338ca; border-radius:10px; font-size:11px; margin:2px 4px 2px 0; }
      .tag.cat { background:#ecfdf5; color:#047857; }
      /* Destaque de etiquetas que sao alvo de automacao (item 3) - cor por tipo de acao */
      .tag.pjm-tag-auto { font-weight:700; border:1.5px solid currentColor; }
      .tag.pjm-tag-auto-tag { background:#fef3c7; color:#b45309; border-color:#f59e0b; }
      .tag.pjm-tag-auto-rem { background:#fee2e2; color:#b91c1c; border-color:#ef4444; }
      .tag.pjm-tag-auto-com { background:#d1fae5; color:#047857; border-color:#10b981; }
      .tag.pjm-tag-vinc { background:#fef3c7; color:#b45309; border:1px dashed #f59e0b; font-weight:600; }
      /* Híbrido: contador de executados (barra) + selo na linha, derivados do Relatório */
      .pjm-exec-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:0 0 12px; padding:9px 12px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; }
      .pjm-exec-chip { font-size:11px; font-weight:600; padding:3px 9px; border-radius:8px; }
      .pjm-exec-mov { background:#EEEDFE; color:#3C3489; }
      .pjm-exec-com { background:#E6F1FB; color:#0C447C; }
      .pjm-exec-rem { background:#FCEBEB; color:#A32D2D; }
      .pjm-exec-rest { background:#fef3c7; color:#b45309; }
      .pjm-exec-flag { display:inline-block; margin-top:3px; font-size:10px; font-weight:600; padding:1px 7px; border-radius:8px; }
      .pjm-exec-flag-com { background:#E6F1FB; color:#0C447C; }
      .pjm-exec-flag-rem { background:#FCEBEB; color:#A32D2D; }
      .empty { padding:40px; text-align:center; color:#9ca3af; }
      .btn { padding:8px 14px; background:#1a5276; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:500; cursor:pointer; }
      .btn:hover { background:#154360; }
      .btn.sec { background:#fff; color:#1a5276; border:1px solid #1a5276; }
      .btn.dng { background:#dc2626; }
      .check { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; cursor:pointer; }
      .check:hover { background:#f9fafb; }
      .check input { margin-top:2px; width:16px; height:16px; accent-color:#1a5276; }
      .check .lbl { font-size:13px; color:#1f2937; font-weight:500; }
      .check .ds { font-size:12px; color:#6b7280; margin-top:2px; }
      .cfg-row { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
      .cfg-row label { font-size:13px; color:#374151; min-width:220px; }
      .cfg-row input { width:100px; padding:6px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; }
      .prog { max-width:640px; margin:40px auto; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:28px; }
      .prog h2 { margin:0 0 8px; font-size:16px; color:#1a5276; }
      .prog-msg { color:#4b5563; font-size:13px; margin-bottom:16px; }
      .prog-bar { height:10px; background:#f1f5f9; border-radius:6px; overflow:hidden; margin-bottom:16px; }
      .prog-fl { height:100%; background:linear-gradient(90deg,#1a5276,#2980b9); transition:width 0.4s; width:0; }
      .prog-log { background:#0f172a; color:#cbd5e1; font-family:monospace; font-size:11px; padding:12px; border-radius:6px; max-height:200px; overflow-y:auto; margin-bottom:16px; line-height:1.6; }
      .prog-log .ok { color:#4ade80; }
      .prog-log .warn { color:#fbbf24; }
      .err { background:#fee2e2; color:#991b1b; padding:14px 20px; border-radius:8px; max-width:600px; border-left:4px solid #dc2626; font-size:13px; }
      .spin { width:40px; height:40px; border:3px solid #e5e7eb; border-top-color:#1a5276; border-radius:50%; animation: sp 0.8s linear infinite; margin:0 auto 16px; }
      @keyframes sp { to { transform: rotate(360deg); } }
      .center { text-align:center; padding:60px 20px; }

      /* ── Aba Etiquetas ─────────────────────────────── */
      .etq-regra { display:flex; align-items:center; gap:8px; padding:8px 12px; background:#faf5ff; border:1px solid #e8d9f0; border-radius:8px; margin-bottom:8px; font-size:13px; }
      .etq-regra.inativa { opacity:0.45; }
      .etq-regra-etq  { flex:1; font-weight:600; color:#6c3483; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .etq-regra-seta { color:#bbb; font-size:12px; flex-shrink:0; }
      .etq-regra-dest { flex:1; color:#374151; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .etq-ibtn { background:none; border:none; cursor:pointer; font-size:14px; line-height:1; padding:3px 5px; border-radius:4px; flex-shrink:0; }
      .etq-ibtn:hover { background:#ede0f7; }
      .etq-ibtn.del { color:#dc2626; }
      .etq-ibtn.del:hover { background:#fee2e2; }
      .etq-form-wrap { background:#f5eef8; border:1px dashed #c39bd3; border-radius:8px; padding:14px; margin-bottom:16px; display:none; }
      .etq-form-wrap.open { display:block; }
      .etq-form-wrap h3 { margin:0 0 12px; font-size:13px; color:#6c3483; font-weight:600; }
      .etq-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
      .etq-form-grid input { width:100%; padding:7px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; }
      .etq-form-grid input::placeholder { color:#aaa; }
      .etq-form-actions { display:flex; gap:8px; }
      .btn-etq-ok  { flex:1; padding:7px; background:#8e44ad; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; }
      .btn-etq-ok:hover { background:#7d3c98; }
      .btn-etq-cancel { padding:7px 12px; background:#fff; color:#555; border:1px solid #ccc; border-radius:6px; font-size:13px; cursor:pointer; }
      .btn-etq-cancel:hover { background:#f5f5f5; }
      .btn-etq-nova { width:100%; padding:8px; background:#fff; color:#8e44ad; border:1px dashed #9b59b6; border-radius:6px; font-size:13px; font-weight:500; cursor:pointer; margin-bottom:16px; }
      .btn-etq-nova:hover { background:#f5eef8; }
      .btn-etq-exec { width:100%; padding:10px; background:#8e44ad; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; }
      .btn-etq-exec:hover    { background:#7d3c98; }
      .btn-etq-exec:disabled { background:#95a5a6; cursor:not-allowed; }
      .etq-feedback { padding:10px 14px; border-radius:6px; font-size:13px; margin-top:12px; display:none; }
      .etq-feedback.ok   { background:#ecfdf5; color:#047857; border-left:3px solid #10b981; display:block; }
      .etq-feedback.warn { background:#fffbeb; color:#92400e; border-left:3px solid #f59e0b; display:block; }
      .etq-feedback.err  { background:#fef2f2; color:#991b1b; border-left:3px solid #ef4444; display:block; }

      /* ── Aba Etiquetas – layout espelhado de Agendamentos ──── */
      .etq-hdr { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
      .etq-hdr-title { font-size:15px; font-weight:700; color:#6c3483; }
      .etq-hdr-stats { flex:1; font-size:12px; color:#6b7280; }
      .etq-exec-all { padding:5px 14px; background:#2d7a4f; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; font-family:inherit; }
      .etq-exec-all:hover { background:#1e5c3a; }
      .etq-exec-all:disabled { background:#9ca3af; cursor:not-allowed; }
      .etq-layout { display:grid; grid-template-columns:340px 1fr; gap:20px; align-items:start; }
      .etq-form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:16px 18px; display:flex; flex-direction:column; gap:0; }
      .etq-list-panel { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:16px 18px; }
      .etq-panel-title { font-size:13px; font-weight:600; color:#374151; margin-bottom:14px; }
      .etq-tipo-btns { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:12px; }
      .etq-tipo-btn { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; padding:10px 6px 8px; border-radius:7px; cursor:pointer; font-size:12px; border:2px solid #e5e7eb; background:#fff; color:#374151; transition:all 0.15s; font-weight:500; }
      .etq-tipo-btn-ico { font-size:18px; line-height:1; }
      .etq-tipo-btn:hover { border-color:#8e44ad; background:#f5eef8; color:#6c3483; }
      .etq-tipo-btn.sel { border-color:#8e44ad; background:#f5eef8; color:#6c3483; font-weight:600; }
      .etq-editing-banner { background:#f5eef8; border:1px solid #d7bde2; border-radius:6px; padding:7px 10px; display:flex; align-items:center; gap:8px; font-size:12px; color:#6c3483; margin-bottom:10px; }
      .etq-editing-cancel { margin-left:auto; background:none; border:none; cursor:pointer; font-size:13px; color:#9ca3af; font-family:inherit; }
      .etq-editing-cancel:hover { color:#374151; }
      .etq-btn-save { width:100%; padding:8px; background:#8e44ad; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; margin-top:14px; display:flex; align-items:center; justify-content:center; gap:6px; font-family:inherit; }
      .etq-btn-save:hover { background:#7d3c98; }
      .etq-step { display:grid; grid-template-columns:auto 1fr auto 1fr auto; gap:5px; margin-bottom:6px; align-items:center; }
      .etq-step input, .etq-step select { padding:6px 8px; border:1px solid #d1d5db; border-radius:6px; font-size:12px; font-family:inherit; width:100%; color:#1f2937; background:#fff; }
      .etq-step input:focus, .etq-step select:focus { outline:none; border-color:#8e44ad; box-shadow:0 0 0 2px rgba(142,68,173,0.15); }
      .etq-add-step { width:100%; padding:5px; background:transparent; border:1px dashed #c39bd3; color:#8e44ad; border-radius:6px; font-size:11px; cursor:pointer; margin-top:4px; margin-bottom:4px; font-family:inherit; }
      .etq-add-step:hover { background:#f5eef8; }
      .etq-li { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; margin-bottom:7px; display:flex; align-items:center; gap:8px; }
      .etq-li:hover { border-color:#d1d5db; background:#f3f4f6; }
      .etq-li.editing { border-color:#8e44ad; background:#faf5ff; }
      .etq-li.inativa { opacity:0.5; }
      .etq-li-left { flex:1; min-width:0; }
      .etq-li-name { font-size:13px; font-weight:600; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .etq-li-meta { font-size:12px; color:#6b7280; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .etq-li-badge { padding:2px 9px; border-radius:20px; font-size:11px; font-weight:700; flex-shrink:0; }
      .etq-li-badge-add { background:#f5eef8; color:#6c3483; }
      .etq-li-badge-rem { background:#fee2e2; color:#991b1b; }
      .etq-li-badge-com { background:#dbeafe; color:#1e40af; }
      .etq-li-badge-off { background:#f3f4f6; color:#9ca3af; }
      .etq-ibtn2 { background:none; border:none; cursor:pointer; font-size:14px; color:#6b7280; padding:3px 5px; border-radius:4px; line-height:1; flex-shrink:0; }
      .etq-ibtn2:hover { background:#e5e7eb; color:#374151; }
      .etq-ibtn2.del:hover { background:#fee2e2; color:#dc2626; }
      .etq-vazio { text-align:center; color:#9ca3af; font-size:13px; padding:32px 0; }
      .etq-etq-fb { font-size:11px; margin-top:5px; display:none; align-items:center; gap:5px; }
      .etq-etq-fb.ok   { display:flex; color:#047857; }
      .etq-etq-fb.warn { display:flex; color:#92400e; }
      .etq-form-erro { display:none; background:#fef2f2; color:#991b1b; border-left:3px solid #ef4444; border-radius:0 6px 6px 0; font-size:12px; padding:7px 10px; margin-top:10px; }
      .etq-inp-erro { border-color:#ef4444 !important; box-shadow:0 0 0 2px rgba(239,68,68,0.15) !important; }
      .etq-pipe-prev { background:#faf5ff; border:1px solid #e8d9f0; border-radius:8px; padding:9px 10px; margin:10px 0 2px; }
      .etq-pipe-prev-hd { font-size:10px; color:#8e44ad; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px; }
      .etq-pipe-prev-row { display:flex; align-items:center; gap:5px; flex-wrap:wrap; font-size:11px; }
      .etq-pipe-etq   { background:#f5f3ff; border:1px solid #c4b5fd; color:#3b0764; border-radius:5px; padding:2px 8px; }
      .etq-pipe-trans { background:#ede9fe; color:#5b21b6; border-radius:5px; padding:2px 8px; font-weight:500; }
      .etq-pipe-tar   { color:#6b7280; }
      .etq-pipe-arrow { color:#9ca3af; }
      .etq-step-ctrl { display:flex; align-items:center; gap:3px; }
      .etq-step-num  { width:16px; height:16px; border-radius:50%; background:#5b21b6; color:#fff; font-size:9px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
      .etq-step-move { display:flex; flex-direction:column; line-height:0.7; }
      .etq-step-move button { background:none; border:none; cursor:pointer; color:#8e44ad; font-size:10px; padding:0; line-height:0.85; font-family:inherit; }
      .etq-step-move button:disabled { color:#d1c4e9; cursor:default; }
      .etq-tip { cursor:help; color:#8e44ad; font-size:10px; border:1px solid #c4b5fd; border-radius:50%; width:13px; height:13px; display:inline-flex; align-items:center; justify-content:center; font-style:normal; }
      .polo-acc { border:1px solid #e5e7eb; border-radius:8px; margin-bottom:7px; overflow:hidden; }
      .polo-head { display:flex; align-items:center; gap:8px; padding:8px 10px; cursor:pointer; font-size:13px; color:#1f2937; background:#fff; user-select:none; }
      .polo-head.on { background:#faf5ff; }
      .polo-head input { accent-color:#8e44ad; }
      .polo-nome { flex:1; font-weight:500; }
      .polo-chev { color:#8e44ad; font-size:11px; transition:transform .15s; }
      .polo-acc.collapsed .polo-chev { transform:rotate(-90deg); color:#cbd5e1; }
      .polo-body { padding:9px 10px; background:#faf5ff; border-top:1px solid #e8d9f0; }
      .etq-li-badge-vinc { background:#fffbeb; color:#92400e; }
      .etq-sec { margin-bottom:8px; }
      .etq-sec-hd { display:flex; align-items:center; gap:8px; padding:8px 11px; border-radius:8px; cursor:pointer; font-size:13px; border:1px solid; user-select:none; }
      .etq-sec-hd-add  { background:#f5eef8; border-color:#e8d9f0; color:#6c3483; }
      .etq-sec-hd-com  { background:#dbeafe; border-color:#bfdbfe; color:#1e40af; }
      .etq-sec-hd-rem  { background:#fee2e2; border-color:#fecaca; color:#991b1b; }
      .etq-sec-hd-vinc { background:#fffbeb; border-color:#fde68a; color:#92400e; }
      .etq-sec-ico { font-size:15px; }
      .etq-sec-nome { font-weight:600; }
      .etq-sec-cnt { font-size:12px; opacity:.75; }
      .etq-sec-chev { margin-left:auto; font-size:12px; transition:transform .15s; }
      .etq-sec.collapsed .etq-sec-chev { transform:rotate(-90deg); }
      .etq-sec.collapsed .etq-sec-body { display:none; }
      .etq-sec-body { padding-top:6px; }
      .etq-sec-vazio { color:#9ca3af; font-size:12px; padding:6px 4px; }
      .etq-io-btn { padding:5px 12px; border:1px solid #d7bde2; border-radius:6px; background:#fff; color:#6c3483; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; font-family:inherit; }
      .etq-io-btn:hover { background:#f5eef8; }
      .etq-import-banner { display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:9px 14px; margin-bottom:14px; font-size:13px; color:#1e40af; }
      .etq-import-banner span { flex:1; min-width:180px; }
      .etq-imp-btn { padding:5px 12px; border:none; border-radius:6px; background:#1a6a9a; color:#fff; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; }
      .etq-imp-btn.etq-imp-sub { background:#c0392b; }
      .etq-imp-cancel { padding:5px 10px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; color:#555; font-size:12px; cursor:pointer; font-family:inherit; }
      /* ── Aba Tarefas - Fila de ações por processo ───────── */
      .pjm-sanfona-fila-bar { background:#fffbeb; border:1px solid #fbbf24; border-radius:10px; padding:10px 16px; margin-bottom:16px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
      .pjm-fila-bar-info { flex:1; min-width:0; }
      .pjm-fila-bar-title { font-size:13px; font-weight:600; color:#92400e; }
      .pjm-fila-bar-sub { font-size:11px; color:#b45309; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:3px; min-height:14px; }
      .pjm-fila-prog-bar { height:3px; background:#fde68a; border-radius:2px; margin-top:6px; }
      .pjm-fila-prog-fl { height:3px; background:#d97706; width:0; border-radius:2px; transition:width 0.3s; }
      .btn-fila-cancel { background:none; border:1px solid #fcd34d; border-radius:6px; padding:5px 12px; font-size:12px; color:#b45309; cursor:pointer; white-space:nowrap; }
      .btn-fila-cancel:hover { background:#fef3c7; }
      .btn-fila-exec-all { background:#d97706; color:#fff; border:none; border-radius:8px; padding:8px 18px; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; }
      .btn-fila-exec-all:hover { background:#b45309; }
      .btn-fila-exec-all:disabled { background:#fbbf24; cursor:not-allowed; }
      .pjm-remap-tgl { display:inline-flex; align-items:center; gap:5px; font-size:12px; color:#92400e; cursor:pointer; white-space:nowrap; }

      .pjm-proc-row.pjm-has-steps > td { background:#fffef0; }
      .pjm-proc-row.pjm-running-row > td { background:#eff6ff; }
      .pjm-proc-row.pjm-done-row > td { background:#f0fdf4; }
      .pjm-step-row > td { padding:0 !important; background:#fffef0; border-bottom:1px solid #fef08a !important; }
      .pjm-step-row.pjm-running-row > td { background:#eff6ff; border-bottom-color:#bfdbfe !important; }
      .pjm-step-row.pjm-done-row > td { background:#f0fdf4; border-bottom-color:#bbf7d0 !important; }

      .pjm-step-chain { display:flex; align-items:center; gap:6px; flex-wrap:wrap; padding:6px 14px 7px 38px; }
      .pjm-step-node { display:inline-flex; align-items:center; gap:4px; border-radius:20px; padding:3px 8px 3px 6px; font-size:11px; border:1px solid; white-space:nowrap; transition:opacity 0.2s; }
      .pjm-step-num { font-size:9px; font-weight:700; width:15px; height:15px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
      .pjm-step-lbl { max-width:130px; overflow:hidden; text-overflow:ellipsis; }
      .pjm-step-x { background:none; border:none; cursor:pointer; font-size:14px; line-height:1; padding:0 0 0 3px; opacity:0.45; color:inherit; }
      .pjm-step-x:hover { opacity:1; }
      .pjm-step-arrow { color:#9ca3af; font-size:14px; flex-shrink:0; }
      .pjm-sn-tag { background:#f5f3ff; border-color:#c4b5fd; color:#3b0764; }
      .pjm-sn-tag .pjm-step-num { background:#5b21b6; color:#fff; }
      .pjm-sn-rem { background:#fff1f2; border-color:#fca5a5; color:#881337; }
      .pjm-sn-rem .pjm-step-num { background:#b91c1c; color:#fff; }
      .pjm-sn-com { background:#f0f9ff; border-color:#7dd3fc; color:#0c4a6e; }
      .pjm-sn-com .pjm-step-num { background:#0369a1; color:#fff; }
      .pjm-sn-running { animation:pjm-pulse 0.9s ease-in-out infinite; }
      .pjm-sn-active { box-shadow:0 0 0 2px #f59e0b; }
      .pjm-sn-done { opacity:0.55; }
      @keyframes pjm-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
      .pjm-spin-mini { display:inline-block; width:9px; height:9px; border:1.5px solid rgba(0,0,0,0.15); border-top-color:currentColor; border-radius:50%; animation:sp 0.7s linear infinite; }

      .btn-exec-one { background:#f59e0b; color:#fff; border:none; border-radius:6px; padding:3px 10px; font-size:11px; font-weight:500; cursor:pointer; margin-left:6px; white-space:nowrap; }
      .btn-exec-one:hover { background:#d97706; }
      .btn-exec-one:disabled { background:#fbbf24; cursor:not-allowed; }

      .pjm-act-btns { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .pjm-act-btn { display:inline-flex; align-items:center; gap:4px; background:#fff; border:1px solid #d1d5db; border-radius:7px; padding:5px 11px; cursor:pointer; font-size:12px; font-weight:500; color:#374151; line-height:1.4; transition:background 0.12s,border-color 0.12s; white-space:nowrap; }
      .pjm-act-btn:hover { background:#f3f4f6; border-color:#9ca3af; }
      .pjm-act-btn-tag { border-color:#c4b5fd; color:#3b0764; }
      .pjm-act-btn-tag:hover { background:#f5f3ff; border-color:#a78bfa; }
      .pjm-act-btn-rem { border-color:#fca5a5; color:#881337; }
      .pjm-act-btn-rem:hover { background:#fff1f2; border-color:#f87171; }
      .pjm-act-btn-vinc { border-color:#fcd34d; color:#92400e; }
      .pjm-act-btn-vinc:hover { background:#fffbeb; border-color:#f59e0b; }
      .pjm-sn-vinc { border-color:#fcd34d; }
      .pjm-act-btn-com { border-color:#7dd3fc; color:#0c4a6e; }
      .pjm-act-btn-com:hover { background:#f0f9ff; border-color:#38bdf8; }
      .pjm-steps-badge { font-size:10px; font-weight:600; background:#fef08a; color:#78350f; border:1px solid #fbbf24; border-radius:20px; padding:1px 8px; white-space:nowrap; }
      .pjm-dd-wrap { position:relative; display:inline-block; }
      .pjm-dd-menu { display:none; position:fixed; z-index:2147483647; background:#fff; border:1px solid #e5e7eb; border-radius:10px; min-width:220px; max-width:300px; overflow:hidden; box-shadow:0 4px 18px rgba(0,0,0,0.14); }
      .pjm-dd-menu.open { display:block; }
      .pjm-bulk-toolbar { display:none; align-items:center; gap:10px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:9px 16px; margin-bottom:10px; flex-wrap:wrap; }
      .pjm-bulk-toolbar.visible { display:flex; }
      .pjm-bulk-label { font-size:13px; font-weight:600; color:#1e40af; flex:1; min-width:120px; }
      .pjm-bulk-seq-btn { display:inline-flex; align-items:center; gap:5px; background:#1d4ed8; color:#fff; border:none; border-radius:7px; padding:7px 16px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; }
      .pjm-bulk-seq-btn:hover { background:#1e40af; }
      .pjm-bulk-seq-btn:disabled { background:#93c5fd; cursor:not-allowed; }
      .pjm-bulk-clear-btn { background:none; border:1px solid #93c5fd; border-radius:6px; padding:5px 10px; font-size:11px; color:#3b82f6; cursor:pointer; white-space:nowrap; }
      .pjm-bulk-clear-btn:hover { background:#dbeafe; }
      .pjm-dd-head { padding:6px 12px 5px; font-size:10px; font-weight:600; color:#6b7280; background:#f9fafb; border-bottom:1px solid #f3f4f6; text-transform:uppercase; letter-spacing:0.04em; }
      .pjm-dd-item { padding:8px 12px; font-size:12px; cursor:pointer; color:#374151; }
      .pjm-dd-item:hover { background:#f0f9ff; }
      .pjm-dd-empty { padding:8px 12px; font-size:12px; color:#9ca3af; font-style:italic; }

      /* ── Aba Agendamentos ─────────────────────── */
      .ag-hdr { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
      .ag-hdr-title { font-size:15px; font-weight:700; color:#0f766e; }
      .ag-hdr-stats { flex:1; font-size:12px; color:#6b7280; }
      .btn-ag-limpar { padding:5px 14px; border:1px solid #fca5a5; border-radius:6px; background:#fff; color:#dc2626; font-size:12px; cursor:pointer; white-space:nowrap; font-family:inherit; }
      .btn-ag-limpar:hover { background:#fee2e2; }
      .ag-layout { display:grid; grid-template-columns:340px 1fr; gap:20px; align-items:start; }
      .ag-form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:16px 18px; }
      .ag-list-panel { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:16px 18px; }
      .ag-panel-title { font-size:13px; font-weight:600; color:#374151; margin-bottom:12px; }
      .ag-form-row { margin-bottom:10px; }
      .ag-lbl { display:block; font-size:11px; font-weight:600; color:#374151; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.3px; }
      .ag-sel, .ag-inp { width:100%; padding:7px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; font-family:inherit; color:#1f2937; background:#fff; }
      .ag-sel:focus, .ag-inp:focus { outline:none; border-color:#0d9488; box-shadow:0 0 0 2px rgba(13,148,136,0.15); }
      .ag-tipo-btns { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .ag-tipo-btn { display:flex; align-items:center; gap:6px; padding:7px 10px; border-radius:7px; cursor:pointer; font-size:12px; border:2px solid #e5e7eb; background:#fff; transition:all 0.15s; }
      .ag-tipo-btn:hover { border-color:#0d9488; background:#f0fdfa; }
      .ag-tipo-btn.sel { border-color:#0d9488; background:#f0fdfa; color:#0f766e; font-weight:600; }
      .ag-tipo-btn input { accent-color:#0d9488; }
      .btn-ag-save { width:100%; padding:9px; background:#0d9488; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; margin-top:4px; }
      .btn-ag-save:hover { background:#0f766e; }
      .ag-search-wrap { position:relative; margin-bottom:10px; }
      .ag-search-icon { position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:14px; color:#9ca3af; pointer-events:none; }
      .ag-search-inp { width:100%; padding:7px 10px 7px 32px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; font-family:inherit; color:#1f2937; background:#fff; }
      .ag-search-inp:focus { outline:none; border-color:#0d9488; box-shadow:0 0 0 2px rgba(13,148,136,0.15); }
      .ag-filters-row { display:flex; gap:8px; margin-bottom:12px; }
      .ag-filters-row .ag-sel { flex:1; padding:6px 10px; font-size:12px; }
      .ag-item { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; margin-bottom:7px; }
      .ag-item-header { display:flex; align-items:center; gap:8px; margin-bottom:3px; }
      .ag-item-alvo { flex:1; font-weight:600; color:#1f2937; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .ag-badge { padding:2px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
      .ag-badge-ag { background:#fef3c7; color:#92400e; }
      .ag-badge-ft { background:#d1fae5; color:#065f46; }
      .ag-badge-vc { background:#fee2e2; color:#991b1b; }
      .ag-item-meta { font-size:12px; color:#6b7280; }
      .ag-cancel-btn { background:none; border:1px solid #fca5a5; color:#dc2626; border-radius:6px; padding:3px 10px; font-size:12px; cursor:pointer; font-family:inherit; white-space:nowrap; }
      .ag-cancel-btn:hover { background:#fee2e2; }
      .ag-pag { display:flex; align-items:center; justify-content:center; gap:12px; margin-top:12px; }
      .ag-pag button { padding:5px 16px; border:1px solid #d1d5db; border-radius:6px; background:#fff; cursor:pointer; font-size:13px; }
      .ag-pag button:disabled { opacity:0.4; cursor:not-allowed; }
      .ag-pag span { font-size:13px; color:#374151; }
      .ag-vazio { text-align:center; color:#9ca3af; padding:32px 0; font-size:13px; }
    `;

    shadow.innerHTML = '<style>' + STYLE + '</style>' +
      '<div class="bd" id="bd"><div class="panel">' +
      '<div class="hdr"><h1 style="display:flex;align-items:center;gap:10px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="30" height="30" style="flex:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.28))"><defs><linearGradient id="bgH" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#154360"/><stop offset="1" stop-color="#1f6391"/></linearGradient><radialGradient id="sheenH" cx="0.3" cy="0.2" r="0.9"><stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="128" height="128" rx="29" fill="url(#bgH)"/><rect width="128" height="128" rx="29" fill="url(#sheenH)"/><path d="M3.5 0.0V-35.0H19.5Q24.3 -35.0 27.775 -33.45Q31.25 -31.900000000000002 33.150000000000006 -28.975Q35.050000000000004 -26.05 35.050000000000004 -22.05Q35.050000000000004 -18.1 33.150000000000006 -15.200000000000001Q31.25 -12.3 27.775 -10.725000000000001Q24.3 -9.15 19.5 -9.15H9.0L13.4 -13.450000000000001V0.0ZM13.4 -12.4 9.0 -16.95H18.900000000000002Q22.0 -16.95 23.525 -18.3Q25.05 -19.650000000000002 25.05 -22.05Q25.05 -24.5 23.525 -25.85Q22.0 -27.200000000000003 18.900000000000002 -27.200000000000003H9.0L13.4 -31.75ZM47.0 0.7000000000000001Q43.150000000000006 0.7000000000000001 40.025000000000006 -0.625Q36.9 -1.9500000000000002 34.85 -4.45L40.25 -10.850000000000001Q41.650000000000006 -9.05 43.150000000000006 -8.125Q44.650000000000006 -7.2 46.300000000000004 -7.2Q50.7 -7.2 50.7 -12.3V-27.35H38.6V-35.0H60.5V-12.9Q60.5 -6.050000000000001 57.05 -2.6750000000000003Q53.6 0.7000000000000001 47.0 0.7000000000000001ZM79.95 0.45Q75.15 0.45 71.575 -1.375Q68.0 -3.2 66.025 -6.375Q64.05 -9.55 64.05 -13.600000000000001Q64.05 -17.650000000000002 65.975 -20.825000000000003Q67.9 -24.0 71.30000000000001 -25.775Q74.7 -27.55 78.95 -27.55Q82.95 -27.55 86.25 -25.925Q89.55000000000001 -24.3 91.5 -21.15Q93.45 -18.0 93.45 -13.5Q93.45 -13.0 93.4 -12.350000000000001Q93.35000000000001 -11.700000000000001 93.30000000000001 -11.15H71.85000000000001V-16.150000000000002H88.25L84.65 -14.75Q84.7 -16.6 83.975 -17.950000000000003Q83.25 -19.3 81.975 -20.05Q80.7 -20.8 79.0 -20.8Q77.30000000000001 -20.8 76.025 -20.05Q74.75 -19.3 74.05000000000001 -17.925Q73.35000000000001 -16.55 73.35000000000001 -14.700000000000001V-13.25Q73.35000000000001 -11.25 74.17500000000001 -9.8Q75.0 -8.35 76.55000000000001 -7.575Q78.10000000000001 -6.800000000000001 80.25 -6.800000000000001Q82.25 -6.800000000000001 83.67500000000001 -7.375Q85.10000000000001 -7.95 86.5 -9.15L91.5 -3.95Q89.55000000000001 -1.8 86.70000000000002 -0.675Q83.85000000000001 0.45 79.95 0.45Z" transform="translate(15.52,62.00)" fill="#f2f7fc"/><polyline points="34,96 55,90 76,97 97,91" fill="none" stroke="rgba(242,247,252,.5)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="34" cy="96" r="5.4" fill="#bd93da"/><circle cx="55" cy="90" r="5.4" fill="#4cc9b6"/><circle cx="76" cy="97" r="5.4" fill="#f3ab43"/><circle cx="97" cy="91" r="5.4" fill="#6ea8ec"/></svg>Mapeamento PJe</h1><div class="sp"></div>' +
      '<button class="ibtn" id="rfr" title="Atualizar">↻</button>' +
      '<button class="ibtn" id="cls" title="Fechar (Esc)" style="font-size:22px">×</button></div>' +
      '<div class="tabs" id="tabs">' +
      '<button class="tab act" data-t="resumo">📊 Resumo</button>' +
      '<button class="tab" data-t="processos">📁 Processos</button>' +
      '<button class="tab" data-t="relatorio">📋 Relatório</button>' +
      '<span class="tsep" aria-hidden="true"></span>' +
      '<button class="tab" data-t="tarefas">✅ Tarefas</button>' +
      '<button class="tab" data-t="agendamentos">🗓️ Agendamentos</button>' +
      '<span class="tsep tsep-r" aria-hidden="true"></span>' +
      '<button class="tab" data-t="juntada">📄 Modelos</button>' +
      '<button class="tab" data-t="etiquetas">🏷️ Etiquetas</button>' +
      '<button class="tab" data-t="prazos">⏰ Prazos</button>' +
      '<button class="tab" data-t="fases">&#9873; Fases</button>' +
      '<button class="tab" data-t="config">⚙️ Configurações</button>' +
      '</div><div class="body" id="body"></div></div></div>';

    const CFG_DEF = { cards:{minhas:true,gerais:false,assinaturas:false}, paginacao:true, maxPaginas:50, timeoutLista:12000, delayEntreTarefas:400, colFaseLocal:true, remapPosAcao:false, agendaModo:'off' };
    let state = {
      resultado: null,
      tab: 'resumo',
      cfg: JSON.parse(JSON.stringify(CFG_DEF)),
      coletando: false,
      prog: { step:0, total:0, msg:'', log:[] },
      busca: '',
      filtroTarefa: '',
      filtroCategoria: '',
      filtroClasse: '',
      pagina: 1,
      porPagina: 25,
      tarefasSel: { lista: [], bloquear: [], aberto: false, carregando: false },
      tiposDoc: { aberto: false, lista: null, importPreview: null },   // Tipos de documento da Tabela nos autos
      marcoDoc: { aberto: false, lista: null },   // Regras marco -> etiqueta (auto-etiquetador por marco)
      kpiDoc: { aberto: false, lista: null },   // Regras de KPI por etiqueta
      kpiPresetDoc: { aberto: false, lista: null },   // Presets de KPI (editaveis)
      marcoAuto: true, marcoAviso: true,
      extAtalhos: { aberto: false, lista: null, carregando: false, escolhidos: [] },   // Atalhos de extensões na barra
      expandidas: {},
      ordemCnj: {},
      filtroEtiqueta: '',
      filtroCombinado: { etiquetas: [], modo: 'and' },
      sugestaoEtq: '',
      // Juntada CoPPEx
      juntadaMateria: '',
      juntadaFase:    '',
      juntadaModelo:  '',
      // Atos por processo (Opção B): { cnjDigits: { materia, fase, modelo, descricao } }
      juntadaPorProcesso: {},
      // Card "Elaborar ato" aberto na aba Tarefas: pid do processo, ou null
      elaborarAtoPid:   null,
      elaborarAtoDraft: null,  // { materia, fase, modelo, descricao } enquanto o card está aberto
      // Catálogo editável de modelos (passo 5): { version, modelos: [{id, materia, fase, nome, descricao}] }
      juntadaCatalogo: null,   // carregado/semeado a partir do storage
      // Form "Gerenciar modelos" da aba Juntada: { id|null, materia, fase, nome, descricao } ou null
      catForm: null,
      classesConhecidas: [],
      classePorCnj: {},
      // Importação pendente do catálogo: { modelos: [...], nome } ou null (aguarda mesclar/substituir)
      catImport: null,
      // Aba Juntada: sub-aba ativa ('padrao' | 'gerenciar'), busca e grupos recolhidos
      juntadaSubaba: 'padrao',
      catBusca: '',
      catGruposRecolhidos: {},
      // Regras de etiqueta (pipeline)
      etiquetaRegras:       [],
      etqImport:            null,  // import pendente de regras: { dados, nome } ou null (item 2)
      etqFormAberto:        false,
      etqFormPassos:        null,  // [{ transicao, proximaTarefa }] enquanto form aberto
      editandoId:           null,  // id da regra Etiqueta em edição
      // Regras de remoção standalone
      removerEtiquetaRegras: [],
      remFormAberto:         false,
      editandoRemId:         null,  // id da regra Remover em edição
      // Regras de vincular etiqueta (Opção 3) — usadas pelo botão "Etiquetar" na aba Tarefas
      vincularEtiquetaRegras: [],
      // Regras de preparar comunicação standalone
      prepComunicacaoRegras: [],
      prepFormAberto:        false,
      editandoPrepId:        null,  // id da regra Prep em edição
      // Fila de ações por processo (Aba Tarefas)
      procSteps:      {},     // { pid: [{sid, type, ruleLabel, ruleId, status:'pending'|'running'|'done'}] }
      executandoFila: false,
      // Aba Agendamentos
      agendamentos:   [],
      agFiltro:       'todos',
      agFiltroModo:   'todos',
      agBusca:        '',
      agPagina:       1,
      // Identificação do servidor (para exportação)
      servidor:       '',
      // Cache do Relatório (pjmRelatorio) p/ derivar marcadores de executado na aba Tarefas
      relatorioCache: { sessoes: [] },
    };

    try {
      chrome.storage.local.get(['pjmConfig', 'pjmServidor', 'pjmTarefasLista', 'pjmTarefasBlock', 'pjeMapperUltimoResultado', 'faseAlvo', 'modeloAlvo', 'etiquetaRegras', 'removerEtiquetaRegras', 'prepComunicacaoRegras', 'pjmAgendamentos', 'pjmRelatorio', 'vincularEtiquetaRegras', 'juntadaPorProcesso', 'juntadaCatalogo', 'pjmTabelaTipos', 'pjmExtAtalhos', 'pjmClassePorCnj', 'pjmClasseDicionario', 'pjmMarcoRegras', 'pjmMarcoAuto', 'pjmMarcoAviso', 'pjmKpiRegras', 'pjmKpiPresets'], function(r) {
        if (r && r.pjmConfig) {
          state.cfg = Object.assign({}, CFG_DEF, r.pjmConfig, { cards: Object.assign({}, CFG_DEF.cards, r.pjmConfig.cards || {}) });
        }
        if (r && r.pjmServidor) state.servidor = r.pjmServidor;
        // Tenta auto-detectar nome do servidor logado no PJe (preenche só se não configurado)
        if (!state.servidor) {
          var nomeDetectado = _detectarNomePJe();
          if (nomeDetectado) {
            state.servidor = nomeDetectado;
            try { chrome.storage.local.set({ pjmServidor: nomeDetectado }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          }
        }
        if (r && r.pjmTarefasLista) state.tarefasSel.lista = r.pjmTarefasLista;
        if (r && r.pjmTarefasBlock) state.tarefasSel.bloquear = r.pjmTarefasBlock;
        state.tiposDoc.lista = (r && r.pjmTabelaTipos && Array.isArray(r.pjmTabelaTipos.tipos)) ? r.pjmTabelaTipos.tipos : tiposDocDefault();
        state.marcoDoc.lista = (r && Array.isArray(r.pjmMarcoRegras)) ? r.pjmMarcoRegras : [];
        state.kpiDoc.lista = (r && Array.isArray(r.pjmKpiRegras)) ? r.pjmKpiRegras : [];
        state.kpiPresetDoc.lista = (r && Array.isArray(r.pjmKpiPresets) && r.pjmKpiPresets.length) ? r.pjmKpiPresets : [{ nome: 'Funil de fases (RCand)', padrao: 'RCand F• · •', formato: 'funil' }, { nome: 'Carga por membro', padrao: 'SePP - •', formato: 'barras' }];
        state.marcoAuto = !(r && r.pjmMarcoAuto === false);
        state.marcoAviso = !(r && r.pjmMarcoAviso === false);
        state.extAtalhos.escolhidos = (r && r.pjmExtAtalhos && Array.isArray(r.pjmExtAtalhos.exts)) ? r.pjmExtAtalhos.exts : [];
        // Restaura o ultimo mapeamento salvo (sobrevive a reloads da pagina PJe)
        if (r && r.pjeMapperUltimoResultado) {
          state.resultado = r.pjeMapperUltimoResultado;
          state.tab = 'tarefas';
          console.log('[PJeOverlay] Mapeamento restaurado do storage:', (state.resultado.tarefas||[]).length, 'tarefas');
        }
        // Restaura regras de etiqueta (pipeline)
        if (r && Array.isArray(r.etiquetaRegras)) {
          state.etiquetaRegras = r.etiquetaRegras;
        }
        // Restaura regras de remoção standalone
        if (r && Array.isArray(r.removerEtiquetaRegras)) {
          state.removerEtiquetaRegras = r.removerEtiquetaRegras;
        }
        if (r && Array.isArray(r.vincularEtiquetaRegras)) {
          state.vincularEtiquetaRegras = r.vincularEtiquetaRegras;
        }
        // Restaura regras de preparar comunicação
        if (r && Array.isArray(r.prepComunicacaoRegras)) {
          state.prepComunicacaoRegras = r.prepComunicacaoRegras;
        }
        // Restaura agendamentos
        if (r && Array.isArray(r.pjmAgendamentos)) {
          state.agendamentos = r.pjmAgendamentos;
        }
        // Cache do Relatório p/ marcadores de executado na aba Tarefas
        if (r && r.pjmRelatorio) state.relatorioCache = r.pjmRelatorio;
        // Carrega (ou semeia, na 1ª vez) o catálogo editável de modelos
        if (r && r.juntadaCatalogo && Array.isArray(r.juntadaCatalogo.modelos)) {
          state.juntadaCatalogo = r.juntadaCatalogo;
        } else {
          state.juntadaCatalogo = _semearCatalogo();
          try { chrome.storage.local.set({ juntadaCatalogo: state.juntadaCatalogo }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
        }
        // Migracao ADITIVA: todo modelo passa a ter classes[] (vazio = generico, aparece sempre)
        try { (state.juntadaCatalogo.modelos || []).forEach(function(m) { if (!Array.isArray(m.classes)) m.classes = []; }); } catch (_) { /* noop */ }
        // Classes REAIS do acervo, para o seletor do form (vem do cache pjmClassePorCnj)
        try {
          var _cc = (r && r.pjmClassePorCnj) || {}, _vis = {}, _lista = [];
          state.classePorCnj = _cc;
          Object.keys(_cc).forEach(function(k) {
            var c = _cc[k]; if (!c || !c.nome) return;
            var kk = _normClasse(c.nome); if (_vis[kk]) return; _vis[kk] = 1;
            _lista.push({ nome: c.nome, codigo: c.codigo || '' });
          });
          _lista.sort(function(a, b) { return String(a.nome).localeCompare(String(b.nome)); });
          state.classesConhecidas = _lista;
        } catch (_) { state.classesConhecidas = []; }
        try {
          var _dic = (r && r.pjmClasseDicionario) || {}, _da = [];
          Object.keys(_dic).forEach(function (kk) { var e = _dic[kk]; if (e && e.nome) _da.push({ nome: e.nome, codigo: e.codigo || '', sigla: e.sigla || '' }); });
          (typeof PJM_CLASSES_SEED !== 'undefined' ? PJM_CLASSES_SEED : []).forEach(function (e) { if (e && e.nome) _da.push({ nome: e.nome, codigo: e.codigo || '', sigla: e.sigla || '' }); });
          state.classeDic = _da;
        } catch (_) { state.classeDic = []; }
        // Restaura configuração padrão da Juntada (fase e/ou modelo — modelo pode ser genérico)
        if (r && (r.faseAlvo || r.modeloAlvo)) {
          state.juntadaFase   = r.faseAlvo   || '';
          state.juntadaModelo = r.modeloAlvo || '';
          // Descobre a matéria correspondente (pela fase ou, se genérico sem fase, pelo modelo)
          state.juntadaMateria = (r.faseAlvo ? _materiaDaFase(r.faseAlvo) : _materiaDoModelo(r.modeloAlvo)) || state.juntadaMateria;
        }
        // Restaura atos por processo (Opção B)
        if (r && r.juntadaPorProcesso && typeof r.juntadaPorProcesso === 'object') {
          state.juntadaPorProcesso = r.juntadaPorProcesso;
        }
      });
    } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }

    function saveCfg() {
      try { chrome.storage.local.set({ pjmConfig: state.cfg }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
    }

    function _detectarNomePJe() {
      var seletores = [
        '#barraSuperiorPrincipal .nome-sobrenome',
        '#barraSuperiorPrincipal label.nome',
        '.menu-usuario .nome-sobrenome',
        '.menu-usuario label.nome',
        // PJe ng2 — toolbar Angular (fallback)
        'app-toolbar .usuario-nome',
        'app-toolbar [class*="usuario-nome"]',
        'app-toolbar [class*="nome-usuario"]',
        'app-header [class*="usuario"]',
        '[class*="usuario-nome"]',
        '[class*="nome-usuario"]',
      ];
      for (var i = 0; i < seletores.length; i++) {
        try {
          var el = document.querySelector(seletores[i]);
          if (!el) continue;
          var txt = el.textContent.trim();
          // Valida: entre 4 e 100 chars, contém letra, sem caracteres de marcação
          if (!txt || txt.length < 4 || txt.length > 100 || !/[a-zA-ZÀ-ú]/.test(txt) || /[{}<>@]/.test(txt)) continue;
          // Converte para title case se estiver todo em maiúsculas ou todo em minúsculas
          if (txt === txt.toUpperCase() || txt === txt.toLowerCase()) {
            txt = txt.toLowerCase().replace(/(?:^|\s)\S/g, function(c) { return c.toUpperCase(); });
          }
          return txt;
        } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
      }
      return null;
    }

    const $ = function(id) { return shadow.getElementById(id); };
    function esc(s) {
      return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function getProcs() {
      if (!state.resultado) return [];
      var out = [];
      (state.resultado.tarefas || []).forEach(function(t) {
        (t.processos || []).forEach(function(p) {
          out.push(Object.assign({}, p, { tarefa: t.nome }));
        });
      });
      return out;
    }

    function renderBoasVindas() {
      var c = state.cfg.cards;
      var ativos = [c.minhas && 'Minhas Tarefas', c.gerais && 'Tarefas Gerais', c.assinaturas && 'Assinaturas'].filter(Boolean).join(', ') || 'Nenhum';
      return '<div style="max-width:760px;margin:30px auto">' +
        '<div style="text-align:center;margin-bottom:30px"><div style="margin-bottom:6px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="62" height="62" style="filter:drop-shadow(0 6px 16px rgba(20,40,60,.25))"><defs><linearGradient id="bgE" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#154360"/><stop offset="1" stop-color="#1f6391"/></linearGradient><radialGradient id="sheenE" cx="0.3" cy="0.2" r="0.9"><stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="128" height="128" rx="29" fill="url(#bgE)"/><rect width="128" height="128" rx="29" fill="url(#sheenE)"/><path d="M3.5 0.0V-35.0H19.5Q24.3 -35.0 27.775 -33.45Q31.25 -31.900000000000002 33.150000000000006 -28.975Q35.050000000000004 -26.05 35.050000000000004 -22.05Q35.050000000000004 -18.1 33.150000000000006 -15.200000000000001Q31.25 -12.3 27.775 -10.725000000000001Q24.3 -9.15 19.5 -9.15H9.0L13.4 -13.450000000000001V0.0ZM13.4 -12.4 9.0 -16.95H18.900000000000002Q22.0 -16.95 23.525 -18.3Q25.05 -19.650000000000002 25.05 -22.05Q25.05 -24.5 23.525 -25.85Q22.0 -27.200000000000003 18.900000000000002 -27.200000000000003H9.0L13.4 -31.75ZM47.0 0.7000000000000001Q43.150000000000006 0.7000000000000001 40.025000000000006 -0.625Q36.9 -1.9500000000000002 34.85 -4.45L40.25 -10.850000000000001Q41.650000000000006 -9.05 43.150000000000006 -8.125Q44.650000000000006 -7.2 46.300000000000004 -7.2Q50.7 -7.2 50.7 -12.3V-27.35H38.6V-35.0H60.5V-12.9Q60.5 -6.050000000000001 57.05 -2.6750000000000003Q53.6 0.7000000000000001 47.0 0.7000000000000001ZM79.95 0.45Q75.15 0.45 71.575 -1.375Q68.0 -3.2 66.025 -6.375Q64.05 -9.55 64.05 -13.600000000000001Q64.05 -17.650000000000002 65.975 -20.825000000000003Q67.9 -24.0 71.30000000000001 -25.775Q74.7 -27.55 78.95 -27.55Q82.95 -27.55 86.25 -25.925Q89.55000000000001 -24.3 91.5 -21.15Q93.45 -18.0 93.45 -13.5Q93.45 -13.0 93.4 -12.350000000000001Q93.35000000000001 -11.700000000000001 93.30000000000001 -11.15H71.85000000000001V-16.150000000000002H88.25L84.65 -14.75Q84.7 -16.6 83.975 -17.950000000000003Q83.25 -19.3 81.975 -20.05Q80.7 -20.8 79.0 -20.8Q77.30000000000001 -20.8 76.025 -20.05Q74.75 -19.3 74.05000000000001 -17.925Q73.35000000000001 -16.55 73.35000000000001 -14.700000000000001V-13.25Q73.35000000000001 -11.25 74.17500000000001 -9.8Q75.0 -8.35 76.55000000000001 -7.575Q78.10000000000001 -6.800000000000001 80.25 -6.800000000000001Q82.25 -6.800000000000001 83.67500000000001 -7.375Q85.10000000000001 -7.95 86.5 -9.15L91.5 -3.95Q89.55000000000001 -1.8 86.70000000000002 -0.675Q83.85000000000001 0.45 79.95 0.45Z" transform="translate(15.52,62.00)" fill="#f2f7fc"/><polyline points="34,96 55,90 76,97 97,91" fill="none" stroke="rgba(242,247,252,.5)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="34" cy="96" r="5.4" fill="#bd93da"/><circle cx="55" cy="90" r="5.4" fill="#4cc9b6"/><circle cx="76" cy="97" r="5.4" fill="#f3ab43"/><circle cx="97" cy="91" r="5.4" fill="#6ea8ec"/></svg></div>' +
        '<h2 style="margin:0;color:#1a5276">Mapeador PJe</h2>' +
        '<p style="color:#6b7280;margin:8px 0 0">Escolha como capturar os processos</p></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
        '<div class="sec" style="text-align:center"><div style="font-size:36px;margin-bottom:8px">🎯</div>' +
        '<h3 style="margin:0 0 6px">Tela atual</h3>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:18px">Captura rápida do que está visível.</p>' +
        '<button class="btn sec" id="bRapido" style="width:100%">Capturar tela atual</button></div>' +
        '<div class="sec" style="text-align:center;border-color:#1a5276;background:#eaf1f8">' +
        '<div style="font-size:36px;margin-bottom:8px">🤖</div>' +
        '<h3 style="margin:0 0 6px;color:#1a5276">Mapeamento automático</h3>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:18px">Navega por todas as tarefas em uma aba auxiliar.<br><strong>Cards ativos:</strong> ' + esc(ativos) + '</p>' +
        '<button class="btn" id="bAuto" style="width:100%">▶ Iniciar mapeamento automático</button></div></div>' +
        '<div style="text-align:center;margin-top:18px"><button class="btn sec" id="bCfg" style="font-size:12px">⚙️ Configurar cards</button></div></div>';
    }

    function renderResumo() {
      var r = state.resultado;
      if (!r) return '';
      var total = (r.resumo && r.resumo.totalProcessos) || getProcs().length;
      var nt = (r.resumo && r.resumo.totalTarefas) || (r.tarefas || []).length;
      var cats = (r.resumo && r.resumo.porCategoria) || {};
      var etqs = (r.resumo && r.resumo.porEtiqueta) || {};
      var comEtq = (r.resumo && r.resumo.comEtiqueta) || 0;
      var numCats = Object.keys(cats).length;

      // Linha de topo: KPIs com icones (2x2) | Top etiquetas ranking
      var html = '<div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px">';

      // KPI cards em grid 2x2
      var kpiData = [
        { icon:'📋', val: nt,      lbl:'Tarefas' },
        { icon:'📁', val: total,   lbl:'Processos' },
        { icon:'🏷️', val: comEtq,  lbl:'Com etiqueta' },
        { icon:'🗂️',  val: numCats, lbl:'Categorias' },
      ];
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
      kpiData.forEach(function(k) {
        html += '<div class="kpi" style="display:flex;align-items:center;gap:12px">' +
          '<div style="width:38px;height:38px;border-radius:8px;background:#eaf1f8;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + k.icon + '</div>' +
          '<div><div class="val" style="font-size:26px">' + k.val + '</div><div class="lbl">' + k.lbl + '</div></div>' +
        '</div>';
      });
      html += '</div>';

      // Card top etiquetas (ranking dos 5 maiores)
      var etqEntries = Object.entries(etqs).sort(function(a,b){return b[1]-a[1];});
      var top5 = etqEntries.slice(0, 5);
      html += '<div class="sec" style="margin:0">' +
        '<h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1f2937">Top etiquetas</h2>';
      if (top5.length) {
        top5.forEach(function(e, i) {
          html += '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;' +
            (i < top5.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : '') + 'font-size:13px">' +
            '<span style="font-size:14px;font-weight:600;color:#9ca3af;min-width:20px;text-align:center">' + (i+1) + '</span>' +
            '<span style="flex:1;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(e[0]) + '">' + esc(e[0]) + '</span>' +
            '<span style="background:#eaf1f8;color:#1a5276;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:600;white-space:nowrap">' + e[1] + '</span>' +
          '</div>';
        });
      } else {
        html += '<div class="empty" style="padding:20px 0">Sem etiquetas</div>';
      }
      html += '</div>';
      html += '</div>'; // fecha grid 2fr 1fr

      // Grade inferior: Categorias (barras) | Etiquetas (chips)
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';

      // Coluna esquerda: barras por categoria
      var catEntries = Object.entries(cats).sort(function(a,b){return b[1]-a[1];});
      var catMax = catEntries.length ? catEntries[0][1] : 1;
      var catBarsHtml = catEntries.length
        ? catEntries.map(function(e) {
            var pct = Math.max(2, Math.round(e[1]/catMax*100));
            return '<div class="bar-row"><div class="bar-nm">' + esc(e[0]) + '</div>' +
              '<div class="bar-tr"><div class="bar-fl" style="width:' + pct + '%"></div></div>' +
              '<div class="bar-ct">' + e[1] + '</div></div>';
          }).join('')
        : '<div class="empty" style="padding:20px">Sem dados</div>';
      html += '<div class="sec" style="margin:0"><h2>Por categoria</h2>' + catBarsHtml + '</div>';

      // Coluna direita: chips de etiquetas filtraveis
      var filtroEtq = (state.filtroEtiqueta || '').toLowerCase();
      var etqsFiltrados = Object.fromEntries(
        Object.entries(etqs).filter(function(e) {
          if (!filtroEtq) return true;
          return e[0].toLowerCase().indexOf(filtroEtq) >= 0;
        })
      );
      var totalEtqs = Object.keys(etqs).length;
      var totalEtqsFiltrados = Object.keys(etqsFiltrados).length;
      var infoFiltro = filtroEtq
        ? '<span style="font-size:11px;color:#6b7280;margin-left:8px">' + totalEtqsFiltrados + ' de ' + totalEtqs + '</span>'
        : '<span style="font-size:11px;color:#6b7280;margin-left:8px">' + totalEtqs + ' total</span>';

      var etqSorted = Object.entries(etqsFiltrados).sort(function(a,b){return b[1]-a[1];});
      var etqMax = etqSorted.length ? etqSorted[0][1] : 1;
      var chipsHtml = etqSorted.length
        ? etqSorted.map(function(e) {
            var destaque = e[1] >= etqMax * 0.5;
            var bg  = destaque ? '#ede9fe' : '#eef2ff';
            var cor = destaque ? '#3b0764' : '#4338ca';
            var brd = destaque ? '#c4b5fd' : '#c7d2fe';
            var fw  = destaque ? '600' : '400';
            return '<span class="pjm-etq-chip" data-etq="' + esc(e[0]) + '" ' +
              'title="Clique para filtrar em Processos" ' +
              'style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;' +
              'background:' + bg + ';color:' + cor + ';border:1px solid ' + brd + ';' +
              'font-size:12px;font-weight:' + fw + ';margin:2px;cursor:pointer">' +
              esc(e[0]) + ' <span style="opacity:0.65;font-size:11px">(' + e[1] + ')</span></span>';
          }).join('')
        : '<div class="empty" style="padding:20px">Sem etiquetas</div>';

      html += '<div class="sec" style="margin:0">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:10px;flex-wrap:wrap">' +
          '<h2 style="margin:0;font-size:14px;font-weight:600;color:#1f2937">Etiquetas' + infoFiltro + '</h2>' +
          '<div style="display:flex;gap:6px;align-items:center">' +
            '<input id="filtroEtqInput" type="text" placeholder="Filtrar..." value="' + esc(state.filtroEtiqueta) + '" ' +
              'style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;width:150px;outline:none">' +
            (filtroEtq ? '<button class="btn sec" id="filtroEtqLimpar" style="font-size:11px;padding:4px 8px">Limpar</button>' : '') +
            '<button class="btn sec" id="filtroEtqCopiar" title="Copiar tabela das etiquetas exibidas (TSV) para colar no Google Sheets / Excel" style="font-size:11px;padding:4px 8px">Copiar planilha</button>' +
          '</div>' +
        '</div>' +
        '<div id="pjm-etq-chips-area" style="max-height:320px;overflow-y:auto;padding:4px 0">' + chipsHtml + '</div>' +
      '</div>';

      html += '</div>'; // fecha grid 1fr 1fr

      // Por classe — chips clicaveis (filtram a aba Processos)
      var porClasse = {};
      getProcs().forEach(function(p){ if (p.classe) porClasse[p.classe] = (porClasse[p.classe]||0) + 1; });
      var clsSorted = Object.entries(porClasse).sort(function(a,b){return b[1]-a[1];});
      if (clsSorted.length) {
        var clsMax = clsSorted[0][1];
        var clsChips = clsSorted.map(function(e){
          var destaque = e[1] >= clsMax * 0.5;
          return '<span class="pjm-cls-chip" data-classe="' + esc(e[0]) + '" title="Clique para filtrar em Processos" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;background:' + (destaque?'#f5eef8':'#faf6fd') + ';color:#6c3483;border:1px solid ' + (destaque?'#dcc6ea':'#e6d6f0') + ';font-size:12px;font-weight:' + (destaque?'600':'400') + ';margin:2px;cursor:pointer">' + esc(e[0]) + ' <span style="opacity:0.65;font-size:11px">(' + e[1] + ')</span></span>';
        }).join('');
        html += '<div class="sec" style="margin-bottom:16px"><h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1f2937">Por classe <span style="font-size:11px;color:#6b7280;font-weight:400">' + clsSorted.length + ' classes</span></h2><div style="padding:4px 0">' + clsChips + '</div></div>';
      }

      // Rodape: fonte e timestamp
      html += '<div class="sec" style="font-size:12px;color:#6b7280"><strong>Fonte:</strong> ' + esc(r.fonte||'—') +
              ' · <strong>Coletado:</strong> ' + esc(r.timestamp ? new Date(r.timestamp).toLocaleString('pt-BR') : '—') + '</div>';
      return html;
    }

    function renderTarefas() {
      var ts = (state.resultado && state.resultado.tarefas) || [];
      if (!ts.length) return '<div class="empty">Nenhuma tarefa.</div>';

      // Coluna Fase/Local pode ser ocultada via Configuracoes (item 2)
      var mostrarFase = !(state.cfg && state.cfg.colFaseLocal === false);
      // Mapa etiqueta(normalizada) -> tipo de acao, para destaque por cor (item 3).
      // Match por nome identico (trim + case-insensitive). Prioridade: tag > rem > com.
      function _normEtq(s){ return String(s == null ? '' : s).trim().toLowerCase(); }
      var autoTagTipo = {};
      (state.prepComunicacaoRegras || []).forEach(function(r){ if (r && r.ativo !== false && r.etiqueta) autoTagTipo[_normEtq(r.etiqueta)] = 'com'; });
      (state.removerEtiquetaRegras || []).forEach(function(r){ if (r && r.ativo !== false && r.etiqueta) autoTagTipo[_normEtq(r.etiqueta)] = 'rem'; });
      (state.etiquetaRegras || []).forEach(function(r){ if (r && r.ativo !== false && r.etiqueta) autoTagTipo[_normEtq(r.etiqueta)] = 'tag'; });

      // ── Híbrido: marcadores de executado derivados do Relatório (pjmRelatorio) ──
      // Recorte por T0 = timestamp do mapeamento atual; só ações posteriores contam.
      var T0exec = Date.parse((state.resultado && state.resultado.timestamp) || '') || 0;
      function _soDig(s){ return String(s == null ? '' : s).replace(/\D/g, ''); }
      var execMap = {};
      ((state.relatorioCache && state.relatorioCache.sessoes) || []).forEach(function(se){
        var procs = (se && se.processos) || {};
        Object.keys(procs).forEach(function(k){
          var d = _soDig(k); if (!d) return;
          ((procs[k] && procs[k].acoes) || []).forEach(function(a){
            if (!a || !T0exec || a.ts < T0exec) return;
            var lbl = a.label || '';
            var rec = execMap[d] || (execMap[d] = { mov:false, com:false, rem:false, hora:0 });
            if (lbl.indexOf('(Movimentar)') >= 0) { rec.mov = true; rec.movEtq = lbl.replace(/\s*\([^)]*\)\s*$/, '').trim(); }
            else if (lbl.indexOf('Comunicação preexistente') >= 0) rec.comPre = true;
            else if (lbl.indexOf('(Comunicação)') >= 0) rec.com = true;
            else if (lbl.indexOf('(Remover)') >= 0) rec.rem = true;
            else if (lbl.indexOf('(Vincular)') >= 0) {
              rec.vinc = true;
              var _vn = lbl.replace(/\s*\([^)]*\)\s*$/, '').trim();
              if (!rec.vincEtqs) rec.vincEtqs = [];
              _vn.split(' + ').forEach(function(_x){ _x = _x.trim(); if (_x && rec.vincEtqs.indexOf(_x) < 0) rec.vincEtqs.push(_x); });
            }
            if (a.ts > rec.hora) rec.hora = a.ts;
          });
        });
      });
      function _execInfo(numero){ return execMap[_soDig(numero)] || null; }
      function _fmtHoraExec(ts2){ if(!ts2) return ''; var d=new Date(ts2); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
      // Destino da movimentação derivado da regra de etiqueta (tarefaDestino simples ou última proximaTarefa do pipeline)
      function _destinoDaRegra(r){
        if (!r) return '';
        if (r.pipeline && r.pipeline.length) { var last = r.pipeline[r.pipeline.length-1]; return (last && (last.proximaTarefa || last.transicao)) || r.tarefaFinal || ''; }
        return r.tarefaDestino || '';
      }
      var etqDestino = {};
      (state.etiquetaRegras || []).forEach(function(r){
        if (!r || r.ativo === false) return;
        var d = _destinoDaRegra(r);
        if (!d) return;
        if (r.etiqueta) etqDestino[_normEtq(r.etiqueta)] = d;
        if (r.labelRelatorio) etqDestino[_normEtq(r.labelRelatorio)] = d;
      });
      // Linha só é ocultada como "movida" quando a movimentação foi registrada E
      // não há mais passos pendentes/rodando na sequência daquele processo.
      function _filaAtiva(numero){ var pid = _soDig(numero); return ((state.procSteps && state.procSteps[pid]) || []).some(function(s){ return s.status !== 'done'; }); }
      function _movidoOculto(numero){ var ex = _execInfo(numero); return !!(ex && ex.mov && !_filaAtiva(numero)); }
      var cntMovidos=0, cntComunicados=0, cntRemovidos=0, cntRestantes=0;
      (ts || []).forEach(function(t){
        (t.processos || []).forEach(function(p){
          var ex = _execInfo(p.numero);
          if (_movidoOculto(p.numero)) { cntMovidos++; }
          else {
            var _agiu = false;
            if (ex && ex.com) { cntComunicados++; _agiu = true; }
            if (ex && ex.rem) { cntRemovidos++; _agiu = true; }
            if (!_agiu) cntRestantes++;
          }
        });
      });
      var execBarHtml = '';
      if (cntMovidos || cntComunicados || cntRemovidos) {
        execBarHtml =
          '<div class="pjm-exec-bar">' +
            '<span class="pjm-exec-chip pjm-exec-mov">' + cntMovidos + ' movido' + (cntMovidos===1?'':'s') + '</span>' +
            '<span class="pjm-exec-chip pjm-exec-com">' + cntComunicados + ' comunicado' + (cntComunicados===1?'':'s') + '</span>' +
            (cntRemovidos ? '<span class="pjm-exec-chip pjm-exec-rem">' + cntRemovidos + ' removido' + (cntRemovidos===1?'':'s') + '</span>' : '') +
            '<span class="pjm-exec-chip pjm-exec-rest">' + cntRestantes + ' restante' + (cntRestantes===1?'':'s') + '</span>' +
            '<button class="btn sec" id="pjmAtualizarLista" title="Re-mapeia o PJe ao vivo e reconcilia a lista" style="margin-left:auto;font-size:12px">🔄 Atualizar lista</button>' +
          '</div>';
      }

      // ── Barra global de fila ──────────────────────────────
      var ps = state.procSteps || {};
      var totalSteps = 0;
      var procsComFila = [];
      Object.keys(ps).forEach(function(pid) {
        var ss = ps[pid];
        if (ss && ss.length) { totalSteps += ss.length; procsComFila.push(pid); }
      });
      var filaBarHtml = '';
      if (totalSteps > 0) {
        var icoT = { tag: '🏷', rem: '🏷-', com: '✉', vinc: '🏷+' };
        var subInfo = procsComFila.slice(0, 4).map(function(pid) {
          return pid + ': ' + (ps[pid]||[]).map(function(s, si){ return (si+1)+'.'+icoT[s.type]; }).join(' ');
        }).join('  ·  ') + (procsComFila.length > 4 ? '  ·  +' + (procsComFila.length - 4) + ' mais' : '');
        filaBarHtml =
          '<div class="pjm-sanfona-fila-bar">' +
            '<div class="pjm-fila-bar-info">' +
              '<div class="pjm-fila-bar-title">🗂 ' + totalSteps + ' ação' + (totalSteps !== 1 ? 'ões' : '') +
                ' em fila — ' + procsComFila.length + ' processo' + (procsComFila.length !== 1 ? 's' : '') + '</div>' +
              '<div class="pjm-fila-bar-sub" id="pjmFilaBarSub">' + esc(subInfo) + '</div>' +
              '<div class="pjm-fila-prog-bar"><div class="pjm-fila-prog-fl" id="pjmFilaProg"></div></div>' +
            '</div>' +
            (!state.executandoFila ? '<button class="btn-fila-cancel" id="pjmFilaCancelar">Cancelar tudo</button>' : '') +
            '<label class="pjm-remap-tgl" title="Ao terminar a fila, re-mapeia automaticamente as tarefas afetadas (origem e destino) e foca na de destino"><input type="checkbox" id="pjmRemapPosAcao"' + (state.cfg && state.cfg.remapPosAcao ? ' checked' : '') + '> re-mapear afetadas</label>' +
            '<button class="btn-fila-exec-all" id="pjmFilaExecAll"' + (state.executandoFila ? ' disabled' : '') + '>▶ Executar tudo</button>' +
          '</div>';
      }

      return execBarHtml + filaBarHtml + '<div class="pjm-sanfona">' + ts.map(function(t, i) {
        var procsAll = t.processos || [];
        var procsVisiveis = procsAll.filter(function(p){ return !_movidoOculto(p.numero); });
        var movidosNaTarefa = procsAll.length - procsVisiveis.length;
        var qtd = procsAll.length ? procsVisiveis.length : (t.quantidade != null ? t.quantidade : 0);
        var _movDest = {}; var _movSemId = 0;
        procsAll.forEach(function(p){ if (_movidoOculto(p.numero)) { var ex = _execInfo(p.numero); var d = (ex.movEtq && etqDestino[_normEtq(ex.movEtq)]) || ''; if (d) _movDest[d] = (_movDest[d]||0)+1; else _movSemId++; } });
        var _movDestKeys = Object.keys(_movDest).sort();
        var movidoHint = '';
        if (movidosNaTarefa) {
          var _mb = movidosNaTarefa + ' movido' + (movidosNaTarefa===1?'':'s');
          if (!_movDestKeys.length) {
            movidoHint = _mb;
          } else if (_movDestKeys.length === 1 && !_movSemId) {
            movidoHint = _mb + ' → ' + _movDestKeys[0];
          } else {
            var _partes = _movDestKeys.map(function(k){ return k + ' (' + _movDest[k] + ')'; });
            if (_movSemId) _partes.push('sem destino (' + _movSemId + ')');
            movidoHint = _mb + ' → ' + _partes.join(', ');
          }
        }
        var chave = (t.nome||'') + '|' + (t.tipoCard||'');
        var aberta = !!state.expandidas[chave];
        var corTipo = t.tipoCard === 'minhas' ? '#1a5276' : (t.tipoCard === 'gerais' ? '#8e44ad' : '#047857');
        var labelTipo = t.tipoCard === 'minhas' ? 'Minhas' : (t.tipoCard === 'gerais' ? 'Gerais' : 'Assin.');
        var hrefLista = t.href || '';

        var hdr = '<div class="pjm-tarefa-hdr" data-tarefa-key="' + esc(chave) + '" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;cursor:pointer">' +
          '<span style="color:#9ca3af;font-weight:600;min-width:24px">' + (i+1) + '</span>' +
          '<span style="color:#1a5276;font-size:16px;min-width:18px">' + (aberta ? '▼' : '▶') + '</span>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600;color:#1f2937;font-size:14px">' + esc(t.nome) + '</div>' +
            '<div style="display:flex;gap:6px;margin-top:4px;align-items:center;flex-wrap:wrap">' +
              '<span class="tag" style="background:' + corTipo + '22;color:' + corTipo + ';font-weight:600">' + labelTipo + '</span>' +
              (t.categoria ? '<span class="tag cat">' + esc(t.categoria) + '</span>' : '') +
              (_tarefaAtualizadaAgora(t.nome) ? '<span class="tag" style="background:#dcfce7;color:#166534;font-weight:600">🔄 atualizado agora</span>' : '') +
            '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:24px;font-weight:700;color:#1a5276;line-height:1">' + qtd + '</div>' +
            '<div style="font-size:11px;color:#6b7280;text-transform:uppercase">processo' + (qtd===1?'':'s') + '</div>' +
            (movidoHint ? '<div style="font-size:10px;color:#94a3b8;margin-top:2px;max-width:320px;margin-left:auto;line-height:1.35">' + esc(movidoHint) + '</div>' : '') +
          '</div>' +
          (hrefLista ? '<a class="pjm-link-lista" href="' + esc(hrefLista) + '" target="_blank" rel="noopener" title="Abrir lista no PJe" style="margin-left:8px;padding:6px 10px;background:#eef2ff;color:#4338ca;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600" onclick="event.stopPropagation()">↗ PJe</a>' : '') +
        '</div>';

        var corpo = '';
        if (aberta) {
          var ordemAtual = state.ordemCnj[chave] || null; // null = original do mapeamento
          var procsOriginais = procsVisiveis;
          var procs;
          if (ordemAtual === 'asc' || ordemAtual === 'desc') {
            procs = procsOriginais.slice().sort(function(a, b) {
              var na = String((a && a.numero) || '').replace(/[^0-9]/g, '');
              var nb = String((b && b.numero) || '').replace(/[^0-9]/g, '');
              if (na < nb) return ordemAtual === 'desc' ? 1 : -1;
              if (na > nb) return ordemAtual === 'desc' ? -1 : 1;
              return 0;
            });
          } else {
            // Sem ordenacao manual: usa a ordem original (do mapeamento)
            procs = procsOriginais;
          }
          var setaOrd = ordemAtual === 'asc' ? '▲' : (ordemAtual === 'desc' ? '▼' : '–');
          var tituloOrd = ordemAtual === 'asc' ? 'Ordem crescente (clique para descendente)'
                       : ordemAtual === 'desc' ? 'Ordem decrescente (clique para voltar ao original)'
                       : 'Ordem original do mapeamento (clique para crescente)';
          var headerCnj = '<th class="pjm-th-cnj" data-tarefa-key="' + esc(chave) + '" style="cursor:pointer;user-select:none" title="' + tituloOrd + '">Número CNJ <span style="font-size:11px;opacity:0.7;margin-left:4px">' + setaOrd + '</span></th>';

          // Regras ativas para os dropdowns de ação
          var etqRegras = (state.etiquetaRegras || []).filter(function(r){ return r.ativo !== false; });
          var remRegras = (state.removerEtiquetaRegras || []).filter(function(r){ return r.ativo !== false; });
          var comRegras = (state.prepComunicacaoRegras || []).filter(function(r){ return r.ativo !== false; });
          var vincRegras = (state.vincularEtiquetaRegras || []).filter(function(r){ return r.ativo !== false; });

          corpo = '<div style="margin:-4px 0 10px 30px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:visible">' +
            (procs.length === 0
              ? '<div class="empty" style="padding:24px">Nenhum processo nesta tarefa.</div>'
              : '<div class="pjm-bulk-toolbar" id="pjmBulkBar_' + esc(String(i)) + '">' +
                  '<span class="pjm-bulk-label">↗ <span class="pjm-bulk-count">0</span> / 5 selecionados</span>' +
                  '<button class="pjm-bulk-seq-btn" data-sanfona="' + esc(String(i)) + '" id="pjmBulkSeq_' + esc(String(i)) + '">▶ Abrir no PJe em sequência</button>' +
                  '<button class="pjm-bulk-etq-btn" data-sanfona="' + esc(String(i)) + '" style="border:1px solid #f59e0b;background:#fffbeb;color:#b45309;border-radius:6px;padding:5px 11px;font-size:12px;cursor:pointer;font-weight:600" title="Marcar etiquetas e aplicar aos processos selecionados">🏷 Etiquetar em lote</button>' +
                  '<button class="pjm-bulk-ato-btn" data-sanfona="' + esc(String(i)) + '" style="border:1px solid #1a5276;background:#1a5276;color:#fff;border-radius:6px;padding:5px 11px;font-size:12px;cursor:pointer;font-weight:600" title="Define o modelo de juntada dos processos selecionados (1 ou vários)">📝 Elaborar ato</button>' +
                  '<button class="pjm-bulk-juntar-btn" data-sanfona="' + esc(String(i)) + '" style="border:1px solid #047857;background:#047857;color:#fff;border-radius:6px;padding:5px 11px;font-size:12px;cursor:pointer;font-weight:600" title="Abre cada processo com ato definido, preenche a juntada e PARA antes de salvar/assinar">⚙️ Preparar juntada (lote)</button>' +
                  '<button class="pjm-bulk-clear-btn" data-sanfona="' + esc(String(i)) + '">✕ Limpar</button>' +
                '</div>' +
                '<table style="margin:0;overflow:visible"><thead><tr>' +
                  '<th style="width:30px;padding:6px 8px;text-align:center"></th>' +
                  headerCnj +
                  '<th>Classe</th>' +
                  (mostrarFase ? '<th>Fase / Local</th>' : '') +
                  '<th>Etiquetas</th>' +
                  '<th style="min-width:260px;font-size:10px;letter-spacing:0.04em;text-transform:uppercase">Ações</th>' +
                  '<th style="width:80px;text-align:center">Autos</th>' +
                '</tr></thead><tbody>' +
                procs.map(function(p, j) {
                  var cnjLimpo = String(p.numero||'').replace(/[^0-9]/g,'');
                  var pid = cnjLimpo || ('p' + i + '_' + j);
                  var exInfo = _execInfo(p.numero);
                  var pagP = p.pagina != null ? p.pagina : '';
                  var btnAutos = cnjLimpo
                    ? '<button class="btn sec pjm-autos-btn" data-cnj="' + esc(cnjLimpo) + '" data-pagina="' + esc(String(pagP)) + '" title="Abrir os autos e o ato (📝)' + (pagP ? ' — pág. ' + pagP : '') + '" style="padding:4px 8px;font-size:11px">↗ Autos' + (pagP && pagP > 1 ? ' <span style="opacity:0.6;font-size:10px">p.' + pagP + '</span>' : '') + '</button>'
                    : '<span style="color:#d1d5db">—</span>';

                  // Estado da fila deste processo
                  var procStepArr = ps[pid] || [];
                  var hasSteps   = procStepArr.length > 0;
                  var isRunning  = procStepArr.some(function(s){ return s.status === 'running'; });
                  var isDone     = hasSteps && procStepArr.every(function(s){ return s.status === 'done'; });
                  var rowCls = 'pjm-proc-row' + (isDone ? ' pjm-done-row' : isRunning ? ' pjm-running-row' : hasSteps ? ' pjm-has-steps' : '');

                  // Opções dos dropdowns de ação
                  var tagItems = etqRegras.map(function(r) {
                    var lbl = r.etiqueta + (r.pipeline && r.pipeline.length ? ' (pipeline ' + r.pipeline.length + 'p)' : (r.tarefaDestino ? ' → ' + r.tarefaDestino : ''));
                    return '<div class="pjm-dd-item" data-pid="' + esc(pid) + '" data-type="tag" data-rule-id="' + esc(r.id) + '" data-rule-label="' + esc(lbl) + '">🏷 ' + esc(lbl) + '</div>';
                  }).join('') || '<div class="pjm-dd-empty">Nenhuma regra de etiqueta</div>';

                  var remItems = remRegras.map(function(r) {
                    var lbl = r.etiqueta + (r.tarefa ? ' / ' + r.tarefa : '');
                    return '<div class="pjm-dd-item" data-pid="' + esc(pid) + '" data-type="rem" data-rule-id="' + esc(r.id) + '" data-rule-label="' + esc(lbl) + '">🏷- ' + esc(lbl) + '</div>';
                  }).join('') || '<div class="pjm-dd-empty">Nenhuma regra de remoção</div>';

                  var comItems = comRegras.map(function(r) {
                    var lbl = r.etiqueta + (r.comunicacao ? ' → ' + r.comunicacao : '');
                    return '<div class="pjm-dd-item" data-pid="' + esc(pid) + '" data-type="com" data-rule-id="' + esc(r.id) + '" data-rule-label="' + esc(lbl) + '">✉ ' + esc(lbl) + '</div>';
                  }).join('') || '<div class="pjm-dd-empty">Nenhuma regra de comunicação</div>';

                  var vincItems = vincRegras.map(function(r) {
                    var lbl = (r.etiquetas||[r.etiqueta]).filter(Boolean).join(' + ') + (r.tarefa ? ' / ' + r.tarefa : '');
                    return '<div class="pjm-dd-item" data-pid="' + esc(pid) + '" data-type="vinc" data-rule-id="' + esc(r.id) + '" data-rule-label="' + esc(lbl) + '">🏷+ ' + esc(lbl) + '</div>';
                  }).join('') || '<div class="pjm-dd-empty">Nenhuma regra de vincular</div>';

                  // Cadeia de passos da fila
                  var icoTipo = { tag: '🏷', rem: '🏷-', com: '✉', vinc: '🏷+' };
                  var snCls   = { tag: 'pjm-sn-tag', rem: 'pjm-sn-rem', com: 'pjm-sn-com', vinc: 'pjm-sn-vinc' };
                  var stepsChain = '';
                  if (hasSteps) {
                    stepsChain = procStepArr.map(function(s, si) {
                      var extra = s.status === 'running' ? ' pjm-sn-running pjm-sn-active'
                                : (s.status === 'done'    ? ' pjm-sn-done' : '');
                      var numHtml = s.status === 'running' ? '<span class="pjm-spin-mini"></span>'
                                  : (s.status === 'done'   ? '✔' : String(si + 1));
                      var lbl = s.ruleLabel || '';
                      var lblShort = lbl.length > 24 ? lbl.slice(0, 22) + '…' : lbl;
                      return (si > 0 ? '<span class="pjm-step-arrow">→</span>' : '') +
                        '<span class="pjm-step-node ' + snCls[s.type] + extra + '">' +
                          '<span class="pjm-step-num">' + numHtml + '</span>' +
                          '<span style="font-size:13px;line-height:1">' + icoTipo[s.type] + '</span>' +
                          '<span class="pjm-step-lbl" title="' + esc(lbl) + '">' + esc(lblShort) + '</span>' +
                          (!state.executandoFila
                            ? '<button class="pjm-step-x" data-pid="' + esc(pid) + '" data-sid="' + esc(s.sid) + '" title="Remover esta ação">×</button>'
                            : '') +
                        '</span>';
                    }).join('');
                  }

                  return (
                    '<tr class="' + rowCls + '" data-pid="' + esc(pid) + '">' +
                      '<td style="padding:6px 8px;text-align:center">' +
                        '<input type="checkbox" class="pjm-proc-chk" data-pid="' + esc(pid) + '" data-cnj="' + esc(cnjLimpo) + '" ' +
                          'style="width:13px;height:13px;accent-color:#1a5276;cursor:pointer">' +
                      '</td>' +
                      '<td style="font-family:monospace;font-size:12px">' + esc(p.numero || '—') +
                        (exInfo && exInfo.comPre && !exInfo.com ? '<div class="pjm-exec-flag" style="background:#FEF3C7;color:#92400E">⏸️ Comunicação preexistente — aguarda providência' + (exInfo.hora ? ' · ' + _fmtHoraExec(exInfo.hora) : '') + '</div>' : '') +
                        (exInfo && (exInfo.com || exInfo.rem) ? '<div class="pjm-exec-flag ' + (exInfo.com ? 'pjm-exec-flag-com' : 'pjm-exec-flag-rem') + '">✔ ' + (exInfo.com && exInfo.rem ? 'Comunicação + Remoção feitas' : (exInfo.com ? 'Comunicação feita' : 'Remoção feita')) + (exInfo.hora ? ' · ' + _fmtHoraExec(exInfo.hora) : '') + ' · pode refazer</div>' : '') +
                      '</td>' +
                      '<td>' + (p.classe ? '<span class="tag">' + esc(p.classe) + '</span>' : '<span style="color:#d1d5db">—</span>') + '</td>' +
                      (mostrarFase ? '<td>' + esc(p.fase || '—') + (p.subfase ? '<div style="color:#9ca3af;font-size:11px">' + esc(p.subfase) + '</div>' : '') + '</td>' : '') +
                      '<td>' + (
                        (p.etiquetas||[]).map(function(e){
                            var _tp = autoTagTipo[_normEtq(e)];
                            if (_tp) {
                              var _ico = _tp === 'tag' ? '🏷' : (_tp === 'rem' ? '🏷−' : '✉');
                              var _ttl = _tp === 'tag' ? 'Etiqueta com automação de movimentação'
                                       : _tp === 'rem' ? 'Etiqueta com automação de remoção'
                                       : 'Etiqueta com automação de comunicação';
                              return '<span class="tag pjm-tag-auto pjm-tag-auto-' + _tp + '" title="' + _ttl + '">' + _ico + ' ' + esc(e) + '</span>';
                            }
                            return '<span class="tag">' + esc(e) + '</span>';
                          }).join('')
                        + ((exInfo && exInfo.vincEtqs ? exInfo.vincEtqs : []).filter(function(_ev){ var _n = _normEtq(_ev); return (p.etiquetas||[]).map(function(_x){ return _normEtq(_x); }).indexOf(_n) < 0; }).map(function(_ev){ return '<span class="tag pjm-tag-vinc" title="Etiqueta vinculada pela automação">🏷+ ' + esc(_ev) + '</span>'; }).join(''))
                        || '<span style="color:#d1d5db">—</span>') + '</td>' +
                      '<td style="padding:6px 8px">' +
                        '<div class="pjm-act-btns">' +
                          '<div class="pjm-dd-wrap">' +
                            '<button class="pjm-act-btn pjm-act-btn-vinc" data-pid="' + esc(pid) + '" data-ddtype="vinc">🏷 Etiquetar</button>' +
                            '<div class="pjm-dd-menu">' +
                              '<div class="pjm-dd-head">Vincular Etiqueta</div>' + vincItems +
                            '</div>' +
                          '</div>' +
                          '<div class="pjm-dd-wrap">' +
                            '<button class="pjm-act-btn pjm-act-btn-tag" data-pid="' + esc(pid) + '" data-ddtype="tag">🔀 Movimentar</button>' +
                            '<div class="pjm-dd-menu">' +
                              '<div class="pjm-dd-head">Etiqueta / Movimentação</div>' + tagItems +
                            '</div>' +
                          '</div>' +
                          '<div class="pjm-dd-wrap">' +
                            '<button class="pjm-act-btn pjm-act-btn-com" data-pid="' + esc(pid) + '" data-ddtype="com">✉ Comunicação</button>' +
                            '<div class="pjm-dd-menu">' +
                              '<div class="pjm-dd-head">Preparar Comunicação</div>' + comItems +
                            '</div>' +
                          '</div>' +
                          '<div class="pjm-dd-wrap">' +
                            '<button class="pjm-act-btn pjm-act-btn-rem" data-pid="' + esc(pid) + '" data-ddtype="rem">🏷− Remover</button>' +
                            '<div class="pjm-dd-menu">' +
                              '<div class="pjm-dd-head">Remover Etiqueta</div>' + remItems +
                            '</div>' +
                          '</div>' +
                          (getAtoProcesso(cnjLimpo)
                            ? '<button class="pjm-act-btn pjm-elaborar-btn" data-pid="' + esc(pid) + '" data-cnj="' + esc(cnjLimpo) + '" title="Ver/editar o ato salvo deste processo" style="border-color:#1a5276;background:#eaf1f8;color:#1a5276">✓ Ato: ' + esc(((getAtoProcesso(cnjLimpo).modelo) || '').split(' - ').pop()) + '</button>'
                            : '') +
                          (hasSteps
                            ? '<span class="pjm-steps-badge">' + procStepArr.length + ' ação' + (procStepArr.length !== 1 ? 'ões' : '') + '</span>'
                            : '') +
                        '</div>' +
                      '</td>' +
                      '<td style="text-align:center">' + btnAutos + '</td>' +
                    '</tr>' +
                    (hasSteps
                      ? '<tr class="pjm-step-row' + (isDone ? ' pjm-done-row' : isRunning ? ' pjm-running-row' : '') + '">' +
                          '<td colspan="' + (mostrarFase ? 6 : 5) + '">' +
                            '<div class="pjm-step-chain">' +
                              stepsChain +
                              (!state.executandoFila
                                ? '<button class="btn-exec-one" data-pid="' + esc(pid) + '">▶ Executar este</button>'
                                : '') +
                            '</div>' +
                          '</td>' +
                        '</tr>'
                      : '') +
                    (state.elaborarAtoPid === pid
                      ? '<tr class="pjm-elaborar-row">' +
                          '<td colspan="' + (mostrarFase ? 6 : 5) + '" style="background:#f8fafc;padding:6px 12px">' +
                            renderElaborarAtoCard(pid, cnjLimpo) +
                          '</td>' +
                        '</tr>'
                      : '')
                  );
                }).join('') + '</tbody></table>'
            ) + '</div>';
        }

        return hdr + corpo;
      }).join('') + '</div>';
    }

    function renderProcessos() {
      var todos = getProcs();
      if (!todos.length) return '<div class="empty">Nenhum processo. Use o mapeamento automático.</div>';

      var cats = Array.from(new Set(todos.map(function(p){return p.categoria;}).filter(Boolean))).sort();
      var tarefas = Array.from(new Set(todos.map(function(p){return p.tarefa;}).filter(Boolean))).sort();
      var classes = Array.from(new Set(todos.map(function(p){return p.classe;}).filter(Boolean))).sort();

      // Aplica filtros (incluindo filtro combinado de etiquetas)
      var combinadas = (state.filtroCombinado && state.filtroCombinado.etiquetas) || [];
      var modoComb = (state.filtroCombinado && state.filtroCombinado.modo) || 'and';
      var ps = todos.filter(function(p) {
        if (state.filtroCategoria && p.categoria !== state.filtroCategoria) return false;
        if (state.filtroTarefa && p.tarefa !== state.filtroTarefa) return false;
        if (state.filtroClasse && _normClasse(p.classe||'') !== _normClasse(state.filtroClasse)) return false;
        if (state.busca) {
          var t = (String(p.numero||'') + ' ' + String(p.tarefa||'') + ' ' + String(p.fase||'') + ' ' + String(p.subfase||'') + ' ' + (p.etiquetas||[]).join(' ')).toLowerCase();
          if (t.indexOf(state.busca.toLowerCase()) < 0) return false;
        }
        if (combinadas.length) {
          var setEtq = new Set((p.etiquetas||[]).map(function(x){ return x.toLowerCase(); }));
          if (modoComb === 'and') {
            for (var i = 0; i < combinadas.length; i++) {
              if (!setEtq.has(combinadas[i].toLowerCase())) return false;
            }
          } else { // or
            var temAlguma = false;
            for (var j = 0; j < combinadas.length; j++) {
              if (setEtq.has(combinadas[j].toLowerCase())) { temAlguma = true; break; }
            }
            if (!temAlguma) return false;
          }
        }
        return true;
      });

      var total = ps.length;
      var totalPag = Math.max(1, Math.ceil(total / state.porPagina));
      if (state.pagina > totalPag) state.pagina = totalPag;
      var ini = (state.pagina - 1) * state.porPagina;
      var page = ps.slice(ini, ini + state.porPagina);

      // Lista de todas as etiquetas existentes nos processos (com contagem)
      var contEtq = {};
      todos.forEach(function(p) {
        (p.etiquetas||[]).forEach(function(e) { contEtq[e] = (contEtq[e]||0) + 1; });
      });
      var todasEtqs = Object.entries(contEtq).sort(function(a, b) { return b[1] - a[1]; });
      var combSet = new Set(combinadas.map(function(x){ return x.toLowerCase(); }));
      var sugestoes = [];
      if (state.sugestaoEtq) {
        var qb = state.sugestaoEtq.toLowerCase();
        sugestoes = todasEtqs.filter(function(e) {
          return !combSet.has(e[0].toLowerCase()) && e[0].toLowerCase().indexOf(qb) >= 0;
        }).slice(0, 8);
      }

      var chipsHtml = combinadas.map(function(e) {
        return '<span class="pjm-chip-etq" data-etq="' + esc(e) + '" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:#e0e7ff;color:#3730a3;border-radius:16px;font-size:12px;font-weight:600">' + esc(e) +
          ' <span class="pjm-chip-rm" data-etq="' + esc(e) + '" style="cursor:pointer;font-size:14px;opacity:0.7">✕</span></span>';
      }).join(' ');

      var sugestoesHtml = sugestoes.length
        ? '<div id="pjmSugList" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">' +
            sugestoes.map(function(e) {
              return '<button class="pjm-sug-etq" data-etq="' + esc(e[0]) + '" style="padding:3px 8px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:12px;font-size:11px;cursor:pointer">+ ' + esc(e[0]) + ' <span style="color:#6b7280">(' + e[1] + ')</span></button>';
            }).join('') + '</div>'
        : '';

      var combinadoBar = '<div style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-bottom:none;border-radius:10px 10px 0 0">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
          '<span style="font-size:12px;color:#374151;font-weight:600">🎯 Filtro combinado:</span>' +
          (combinadas.length
            ? '<span style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">' + chipsHtml + '</span>'
            : '<span style="font-size:12px;color:#9ca3af;font-style:italic">nenhuma etiqueta selecionada</span>') +
          '<span style="flex:1"></span>' +
          (combinadas.length >= 2
            ? '<div style="display:flex;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;font-size:11px">' +
                '<button class="pjm-modo-comb" data-modo="and" style="padding:4px 10px;border:none;background:' + (modoComb==='and'?'#1a5276':'#fff') + ';color:' + (modoComb==='and'?'#fff':'#1a5276') + ';cursor:pointer">TODAS (AND)</button>' +
                '<button class="pjm-modo-comb" data-modo="or" style="padding:4px 10px;border:none;background:' + (modoComb==='or'?'#1a5276':'#fff') + ';color:' + (modoComb==='or'?'#fff':'#1a5276') + ';cursor:pointer">QUALQUER (OR)</button>' +
              '</div>'
            : '') +
          (combinadas.length
            ? '<button class="btn sec" id="pjmCombLimpar" style="font-size:11px;padding:4px 10px">Limpar tudo</button>'
            : '') +
          '<button class="btn sec" id="pjmCombCopiar" title="Copiar lista de processos filtrados (TSV) para colar no Google Sheets / Excel" style="font-size:11px;padding:4px 10px">📋 Copiar planilha</button>' +
        '</div>' +
        '<div style="display:flex;gap:6px;margin-top:8px">' +
          '<input id="pjmSugInput" type="text" placeholder="➕ Adicionar etiqueta ao filtro..." value="' + esc(state.sugestaoEtq) + '" ' +
            'style="flex:1;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;outline:none">' +
        '</div>' +
        sugestoesHtml +
      '</div>';

      var toolbar = combinadoBar +
        '<div style="display:flex;gap:10px;padding:12px 16px;background:#fff;border:1px solid #e5e7eb;border-bottom:none;flex-wrap:wrap;align-items:center">' +
        '<input id="pSearch" type="text" placeholder="🔍 Buscar por número, etiqueta, fase..." value="' + esc(state.busca) + '" ' +
          'style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;outline:none">' +
        '<select id="pFiltTar" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;background:#fff;cursor:pointer">' +
          '<option value="">Todas as tarefas</option>' +
          tarefas.map(function(t){
            return '<option value="' + esc(t) + '"' + (state.filtroTarefa===t?' selected':'') + '>' + esc(t) + '</option>';
          }).join('') +
        '</select>' +
        '<select id="pFiltCat" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;background:#fff;cursor:pointer">' +
          '<option value="">Todas as categorias</option>' +
          cats.map(function(c){
            return '<option value="' + esc(c) + '"' + (state.filtroCategoria===c?' selected':'') + '>' + esc(c) + '</option>';
          }).join('') +
        '</select>' +
        '<select id="pFiltClasse" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;background:#fff;cursor:pointer">' +
          '<option value="">Todas as classes</option>' +
          classes.map(function(c){ return '<option value="' + esc(c) + '"' + (state.filtroClasse===c?' selected':'') + '>' + esc(c) + '</option>'; }).join('') +
        '</select>' +
      '</div>';

      var corpo = '<table style="border-top:none"><thead><tr><th>Número CNJ</th><th>Tarefa</th><th>Classe</th><th>Fase</th><th>Etiquetas</th><th>Categoria</th></tr></thead><tbody>' +
        (page.length === 0
          ? '<tr><td colspan="6" class="empty">Nenhum resultado para os filtros.</td></tr>'
          : page.map(function(p) {
              return '<tr><td style="font-family:monospace;font-size:12px">' + esc(p.numero || '—') + '</td>' +
                '<td>' + esc(p.tarefa || '—') + '</td>' +
                '<td>' + (p.classe ? '<span class="tag">' + esc(p.classe) + '</span>' : '<span style="color:#d1d5db">—</span>') + '</td>' +
                '<td>' + esc(p.fase || '—') + (p.subfase ? '<div style="color:#9ca3af;font-size:11px">' + esc(p.subfase) + '</div>' : '') + '</td>' +
                '<td>' + ((p.etiquetas||[]).length ? p.etiquetas.map(function(e){return '<span class="tag">'+esc(e)+'</span>';}).join('') : '<span style="color:#d1d5db">—</span>') + '</td>' +
                '<td><span class="tag cat">' + esc(p.categoria || '—') + '</span></td></tr>';
            }).join(''))
        + '</tbody></table>';

      var pager = '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;background:#f9fafb;font-size:12px;color:#6b7280">' +
        '<div>Mostrando <strong>' + page.length + '</strong> de <strong>' + total + '</strong> processo(s)' +
          (state.busca || state.filtroCategoria || state.filtroTarefa || state.filtroClasse || combinadas.length ? ' (filtrado de ' + todos.length + ')' : '') +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<button id="pgPrev" ' + (state.pagina <= 1 ? 'disabled' : '') +
            ' style="padding:4px 10px;background:#fff;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;font-size:12px">‹ Anterior</button>' +
          '<span style="padding:4px 10px">Página ' + state.pagina + ' de ' + totalPag + '</span>' +
          '<button id="pgNext" ' + (state.pagina >= totalPag ? 'disabled' : '') +
            ' style="padding:4px 10px;background:#fff;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;font-size:12px">Próxima ›</button>' +
        '</div>' +
      '</div>';

      return toolbar + corpo + pager;
    }

    // ── Aba Etiquetas ─────────────────────────────────────────────────────
    // ── Autocomplete/validação: helpers de dados do mapeamento ───────────
    function _normAce(s){ return String(s == null ? '' : s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' '); }
    function _mapaEtiquetas(){
      var m = (state.resultado && state.resultado.resumo && state.resultado.resumo.porEtiqueta) || null;
      var out = {};
      if (m && typeof m === 'object') { Object.keys(m).forEach(function(k){ out[k] = m[k]; }); }
      else {
        ((state.resultado && state.resultado.tarefas) || []).forEach(function(t){
          (t.processos || []).forEach(function(p){ (p.etiquetas || []).forEach(function(e){ out[e] = (out[e]||0)+1; }); });
        });
      }
      return out;
    }
    function _listaTarefas(){
      var seen = {}, out = [];
      ((state.resultado && state.resultado.tarefas) || []).forEach(function(t){
        var n = (t && t.nome || '').trim();
        if (n && !seen[n]) { seen[n] = 1; out.push(n); }
      });
      return out.sort(function(a,b){ return a.localeCompare(b, 'pt-BR'); });
    }
    function _etqDatalistHtml(){
      var m = _mapaEtiquetas();
      var nomes = Object.keys(m).sort(function(a,b){ return a.localeCompare(b, 'pt-BR'); });
      var opt = nomes.map(function(n){ return '<option value="' + esc(n) + '">' + esc(String(m[n])) + ' proc.</option>'; }).join('');
      var tar = _listaTarefas().map(function(n){ return '<option value="' + esc(n) + '"></option>'; }).join('');
      var vinc = _etiquetasDoVincular().map(function(n){ return '<option value="' + esc(n) + '"></option>'; }).join('');
      return '<datalist id="dlEtiquetas">' + opt + '</datalist><datalist id="dlTarefas">' + tar + '</datalist><datalist id="dlEtiquetasVinc">' + vinc + '</datalist>';
    }
    // Feedback de etiqueta: casa SEM acento contra o mapeamento e devolve {cls, html}
    function _etqFb(valor){
      var v = _normAce(valor);
      if (!v) return { cls:'', html:'' };
      var m = _mapaEtiquetas();
      if (!state.resultado || !Object.keys(m).length) return { cls:'', html:'' };
      var total = 0, achou = false;
      Object.keys(m).forEach(function(k){ var nk = _normAce(k); if (nk === v || nk.indexOf(v) >= 0) { total += (m[k]||0); achou = true; } });
      if (achou) return { cls:'ok', html:'✓ ' + total + ' processo' + (total!==1?'s':'') + ' com esta etiqueta no mapeamento' };
      return { cls:'warn', html:'⚠ Nenhum processo com esta etiqueta no último mapeamento — confira a grafia' };
    }
    // Etiquetas cadastradas nas regras de Vincular — fonte de Movimentar, Comunicar e Remover (itens 2/4)
    function _etiquetasDoVincular(){
      var set = {}, out = [];
      (state.vincularEtiquetaRegras || []).forEach(function(r){
        var arr = (r.etiquetas && r.etiquetas.length) ? r.etiquetas : (r.etiqueta ? [r.etiqueta] : []);
        arr.forEach(function(e){ var t = (e||'').trim(); if (t && !set[t.toLowerCase()]) { set[t.toLowerCase()] = 1; out.push(t); } });
      });
      return out.sort(function(a,b){ return a.localeCompare(b, 'pt-BR'); });
    }
    function _etqFbVinc(valor){
      var v = _normAce(valor);
      if (!v) return { cls:'', html:'' };
      var lista = _etiquetasDoVincular();
      if (!lista.length) return { cls:'', html:'' };
      var achou = lista.some(function(e){ var ne = _normAce(e); return ne === v || ne.indexOf(v) >= 0; });
      if (achou) return { cls:'ok', html:'✓ etiqueta cadastrada nas regras de Vincular' };
      return { cls:'warn', html:'⚠ não consta nas regras de Vincular — crie uma regra Vincular ou confira a grafia' };
    }

    // ── Exportar / Importar regras (item 2 — espelha o Catálogo) ─────────
    function etqExportar(){
      var envelope = {
        tipo: 'pje-mapeador-regras-etiqueta',
        version: 1,
        exportadoEm: new Date().toISOString(),
        etiquetaRegras:         state.etiquetaRegras         || [],
        removerEtiquetaRegras:  state.removerEtiquetaRegras  || [],
        prepComunicacaoRegras:  state.prepComunicacaoRegras  || [],
        vincularEtiquetaRegras: state.vincularEtiquetaRegras || []
      };
      try {
        var blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var dt = new Date();
        var stamp = dt.getFullYear() + '-' + ('0'+(dt.getMonth()+1)).slice(-2) + '-' + ('0'+dt.getDate()).slice(-2);
        var a = document.createElement('a');
        a.href = url; a.download = 'regras-etiqueta-pje-' + stamp + '.json';
        document.body.appendChild(a); a.click();
        setTimeout(function(){ try { URL.revokeObjectURL(url); a.remove(); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); } }, 1500);
      } catch (e) { alert('Falha ao exportar: ' + (e && e.message ? e.message : e)); }
    }
    function etqImportarArquivo(file){
      var reader = new FileReader();
      reader.onload = function(){
        var dados;
        try { dados = JSON.parse(reader.result); }
        catch (e) { alert('Arquivo inválido: não é um JSON válido.'); return; }
        var keys = ['etiquetaRegras','removerEtiquetaRegras','prepComunicacaoRegras','vincularEtiquetaRegras'];
        var temAlgo = keys.some(function(k){ return Array.isArray(dados[k]) && dados[k].length; });
        if (!dados || (dados.tipo && dados.tipo !== 'pje-mapeador-regras-etiqueta') || !temAlgo) {
          alert('Arquivo inválido: não contém regras de etiqueta.'); return;
        }
        state.etqImport = { dados: dados, nome: file.name || '' };
        render();
      };
      reader.onerror = function(){ alert('Não foi possível ler o arquivo.'); };
      reader.readAsText(file);
    }
    function _sigRegra(r){ var c = {}; Object.keys(r||{}).forEach(function(k){ if (k!=='id' && k!=='ativo' && k!=='labelRelatorio') c[k]=r[k]; }); return JSON.stringify(c); }
    function _novoIdRegra(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
    function etqAplicarImport(modo){
      if (!state.etqImport) return;
      var d = state.etqImport.dados || {};
      ['etiquetaRegras','removerEtiquetaRegras','prepComunicacaoRegras','vincularEtiquetaRegras'].forEach(function(key){
        var imp = Array.isArray(d[key]) ? d[key] : [];
        if (modo === 'substituir') {
          state[key] = imp.map(function(r){ return Object.assign({}, r, { id: r.id || _novoIdRegra(), ativo: r.ativo !== false }); });
        } else {
          var cur = (state[key] || []).slice();
          var sigs = {}; cur.forEach(function(r){ sigs[_sigRegra(r)] = 1; });
          imp.forEach(function(r){
            var s = _sigRegra(r);
            if (!sigs[s]) { cur.push(Object.assign({}, r, { id: _novoIdRegra(), ativo: r.ativo !== false })); sigs[s] = 1; }
          });
          state[key] = cur;
        }
        var st = {}; st[key] = state[key]; try { chrome.storage.local.set(st); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
      });
      state.etqImport = null;
      render();
    }

    function renderEtiquetas() {
      var tipo     = state.etqTipo || 'add';
      var editInfo = state.etqEditing || null;
      var addRegras = state.etiquetaRegras        || [];
      var remRegras = state.removerEtiquetaRegras || [];
      var comRegras = state.prepComunicacaoRegras || [];
      var vincRegras = state.vincularEtiquetaRegras || [];

      var tipoButtons =
        '<div class="etq-tipo-btns" id="etqTipoBtns">' +
          '<div class="etq-tipo-btn' + (tipo==='add'?' sel':'') + '" data-etq-tipo="add"><span class="etq-tipo-btn-ico">🔀</span>Movimentar</div>' +
          '<div class="etq-tipo-btn' + (tipo==='com'?' sel':'') + '" data-etq-tipo="com"><span class="etq-tipo-btn-ico">📨</span>Comunicar</div>' +
          '<div class="etq-tipo-btn' + (tipo==='rem'?' sel':'') + '" data-etq-tipo="rem"><span class="etq-tipo-btn-ico">🗑️</span>Remover</div>' +
          '<div class="etq-tipo-btn' + (tipo==='vinc'?' sel':'') + '" data-etq-tipo="vinc"><span class="etq-tipo-btn-ico">🏷️</span>Vincular</div>' +
        '</div>';

      var formHtml = '';
      if (tipo === 'add') formHtml = renderEtqAddForm(editInfo && editInfo.tipo==='add' ? editInfo.r : null);
      else if (tipo === 'rem') formHtml = renderEtqRemForm(editInfo && editInfo.tipo==='rem' ? editInfo.r : null);
      else if (tipo === 'com') formHtml = renderEtqComForm(editInfo && editInfo.tipo==='com' ? editInfo.r : null);
      else if (tipo === 'vinc') formHtml = renderEtqVincForm(editInfo && editInfo.tipo==='vinc' ? editInfo.r : null);

      var editBanner = editInfo
        ? '<div class="etq-editing-banner">✏️ Editando: <strong>' + esc(editInfo.r.etiqueta) + '</strong><button class="etq-editing-cancel" id="etqCancelEdit">✕ Cancelar</button></div>'
        : '';

      var saveLbl = editInfo ? '✔ Atualizar regra' : '✚ Salvar regra';
      var saveBg  = tipo==='rem' ? 'background:#c0392b' : tipo==='com' ? 'background:#1a6a9a' : '';

      var leftPanel =
        '<div class="etq-form-panel">' +
          '<div class="etq-panel-title">Nova regra</div>' +
          tipoButtons +
          editBanner +
          '<div id="etqFormArea">' + formHtml + '</div>' +
          '<div class="etq-form-erro" id="etqFormErro"></div>' +
          '<button class="etq-btn-save" id="etqBtnSave" style="' + saveBg + '">' + saveLbl + '</button>' +
        '</div>';

      var allItems = [];
      addRegras.forEach(function(r){ allItems.push({ tipo:'add', r:r }); });
      remRegras.forEach(function(r){ allItems.push({ tipo:'rem', r:r }); });
      comRegras.forEach(function(r){ allItems.push({ tipo:'com', r:r }); });
      vincRegras.forEach(function(r){ allItems.push({ tipo:'vinc', r:r }); });
      var totalAtivas = allItems.filter(function(x){ return x.r.ativo !== false; }).length;

      function itemMeta(x) {
        if (x.tipo === 'add') {
          return (x.r.pipeline && x.r.pipeline.length)
            ? 'pipeline ' + x.r.pipeline.length + ' etapas'
            : (x.r.tarefaDestino ? '→ ' + esc(x.r.tarefaDestino) : 'sem destino');
        }
        if (x.tipo === 'rem') return '→ ' + esc(x.r.tarefa || '—');
        if (x.tipo === 'vinc') return esc((x.r.etiquetas||[x.r.etiqueta]).filter(Boolean).join(' + ')) + ' · → ' + esc(x.r.tarefa || '—');
        if (x.tipo === 'com') {
          var dest = [x.r.poloAtivo&&'P.Ativo', x.r.poloPassivo&&'P.Passivo', x.r.terceiros&&'Terceiros'].filter(Boolean).join(', ') || '—';
          return esc(x.r.tarefa) + ' · ' + dest + ' · ' + esc(x.r.comunicacao||'Intimação');
        }
        return '';
      }

      function renderLi(x) {
        var r = x.r;
        var isEditing = editInfo && editInfo.tipo===x.tipo && editInfo.r.id===r.id;
        var badgeCls  = r.ativo===false ? 'etq-li-badge-off' : 'etq-li-badge-'+x.tipo;
        var badgeTxt  = x.tipo==='add' ? 'Etiqueta' : x.tipo==='rem' ? 'Remover' : x.tipo==='vinc' ? 'Vincular' : 'Comunicação';
        if (r.ativo===false) badgeTxt += ' (inativa)';
        return '<div class="etq-li' + (r.ativo===false?' inativa':'') + (isEditing?' editing':'') + '"' +
          ' data-li-tipo="' + x.tipo + '" data-li-id="' + esc(r.id) + '">' +
          '<div class="etq-li-left">' +
            '<div class="etq-li-name">' + esc(r.etiqueta) + '</div>' +
            '<div class="etq-li-meta"><span class="etq-li-badge ' + badgeCls + '">' + badgeTxt + '</span>&nbsp; ' + itemMeta(x) + '</div>' +
          '</div>' +
          '<button class="etq-ibtn2" data-li-action="edit" data-li-tipo="' + x.tipo + '" data-li-id="' + esc(r.id) + '" title="Editar">✎</button>' +
          '<button class="etq-ibtn2" data-li-action="tog"  data-li-tipo="' + x.tipo + '" data-li-id="' + esc(r.id) + '">' + (r.ativo===false?'▷':'⏸') + '</button>' +
          '<button class="etq-ibtn2 del" data-li-action="del" data-li-tipo="' + x.tipo + '" data-li-id="' + esc(r.id) + '" title="Excluir">✕</button>' +
        '</div>';
      }
      // item 3: agrupa as regras em seções por tipo (recolhíveis, recolhidas por padrão)
      var _secOrdem = [
        { k:'add',  nome:'Movimentar',  ico:'🔀', cls:'add'  },
        { k:'com',  nome:'Comunicação', ico:'📨', cls:'com'  },
        { k:'rem',  nome:'Remover',     ico:'🗑️', cls:'rem'  },
        { k:'vinc', nome:'Vincular',    ico:'🏷️', cls:'vinc' }
      ];
      var _porTipo = { add:[], com:[], rem:[], vinc:[] };
      allItems.forEach(function(x){ if (_porTipo[x.tipo]) _porTipo[x.tipo].push(x); });
      var sectionsHtml = allItems.length === 0
        ? '<div class="etq-vazio">Nenhuma regra cadastrada. Use o formulário ao lado.</div>'
        : _secOrdem.map(function(t){
            var itens = _porTipo[t.k] || [];
            var corpo = itens.length ? itens.map(renderLi).join('') : '<div class="etq-sec-vazio">Nenhuma regra.</div>';
            return '<div class="etq-sec collapsed" data-sec="' + t.k + '">' +
              '<div class="etq-sec-hd etq-sec-hd-' + t.cls + '" data-sec-tgl="' + t.k + '">' +
                '<span class="etq-sec-ico">' + t.ico + '</span>' +
                '<span class="etq-sec-nome">' + t.nome + '</span>' +
                '<span class="etq-sec-cnt">' + itens.length + '</span>' +
                '<span class="etq-sec-chev">▾</span>' +
              '</div>' +
              '<div class="etq-sec-body">' + corpo + '</div>' +
            '</div>';
          }).join('');

      var totalReg = allItems.length;

      var rightPanel =
        '<div class="etq-list-panel">' +
          '<div class="etq-panel-title">📋 Regras (' + totalReg + ')</div>' +
          '<div class="ag-search-wrap"><span class="ag-search-icon">🔍</span><input class="ag-search-inp" id="etqSearchInp" type="text" placeholder="Buscar etiqueta..." value="' + esc(state.etqBusca||'') + '"></div>' +
          '<div class="ag-filters-row">' +
            '<select id="etqFiltroTipo" class="ag-sel"><option value="">Todos os tipos</option><option value="add">Etiqueta</option><option value="rem">Remover</option><option value="vinc">Vincular</option><option value="com">Comunicação</option></select>' +
            '<select id="etqFiltroStatus" class="ag-sel"><option value="">Todos os status</option><option value="on">Ativas</option><option value="off">Inativas</option></select>' +
          '</div>' +
          '<div id="etqList">' + sectionsHtml + '</div>' +
        '</div>';

      var etqHeader =
        '<div class="etq-hdr">' +
          '<span class="etq-hdr-title">🏷️ Regras de Automação de Etiquetas</span>' +
          '<span class="etq-hdr-stats">' + totalReg + ' regra' + (totalReg!==1?'s':'') + ' · ' + totalAtivas + ' ativa' + (totalAtivas!==1?'s':'') + '</span>' +
          '<button class="etq-io-btn" id="etqBtnExportar" title="Exportar regras para um arquivo JSON">⬆ Exportar</button>' +
          '<button class="etq-io-btn" id="etqBtnImportar" title="Importar regras de um arquivo JSON">⬇ Importar</button>' +
          '<input type="file" id="etqImportFile" accept="application/json,.json" style="display:none">' +
        '</div>';

      var _impArr = state.etqImport ? (state.etqImport.dados || {}) : {};
      var _impTot = state.etqImport ? ['etiquetaRegras','removerEtiquetaRegras','prepComunicacaoRegras','vincularEtiquetaRegras'].reduce(function(n,k){ return n + (Array.isArray(_impArr[k])?_impArr[k].length:0); }, 0) : 0;
      var importBanner = state.etqImport
        ? '<div class="etq-import-banner">' +
            '<span>📥 Importar <strong>' + _impTot + '</strong> regra(s) de "' + esc(state.etqImport.nome||'arquivo') + '". Como aplicar?</span>' +
            '<button class="etq-imp-btn" id="etqImpMesclar">Mesclar</button>' +
            '<button class="etq-imp-btn etq-imp-sub" id="etqImpSubstituir">Substituir</button>' +
            '<button class="etq-imp-cancel" id="etqImpCancelar">Cancelar</button>' +
          '</div>'
        : '';

      return _etqDatalistHtml() + etqHeader + importBanner + '<div class="etq-layout">' + leftPanel + rightPanel + '</div>';
    }

    // Prévia visual do fluxo do pipeline (etiqueta → transição → próxima tarefa → ...)
    function _pipePrevHtml(etq, passos){
      var ps = (passos||[]).filter(function(p){ return p && (p.transicao||'').trim(); });
      if (!(etq||'').trim() && !ps.length) return '';
      var row = '<span class="etq-pipe-etq">' + esc((etq||'').trim() || '(etiqueta)') + '</span>';
      ps.forEach(function(p, i){
        row += '<span class="etq-pipe-arrow">→</span><span class="etq-pipe-trans">' + esc(p.transicao.trim()) + '</span>';
        var prox = (p.proximaTarefa||'').trim();
        if (!prox && i+1 < ps.length) prox = (ps[i+1].transicao||'').trim();
        if (i < ps.length-1 && prox) row += '<span class="etq-pipe-arrow">→</span><span class="etq-pipe-tar">' + esc(prox) + '</span>';
      });
      return '<div class="etq-pipe-prev"><div class="etq-pipe-prev-hd">Prévia do fluxo</div><div class="etq-pipe-prev-row">' + row + '</div></div>';
    }

    function renderEtqAddForm(r) {
      // Prioriza o estado de edição (inicializado ao clicar em editar), para que
      // adicionar/reordenar/remover etapas e digitar persistam no re-render. (item 3)
      var etq    = state.etqFormEtq || (r ? r.etiqueta : '');
      var ti     = state.etqFormTarefaInicial || (r ? (r.tarefaInicial||'') : '');
      var tf     = state.etqFormTarefaFinal   || (r ? (r.tarefaFinal||'')   : '');
      var passos = (state.etqFormPassos && state.etqFormPassos.length)
        ? state.etqFormPassos
        : (r && r.pipeline && r.pipeline.length) ? r.pipeline
        : (r && r.tarefaDestino) ? [{transicao:r.tarefaDestino,proximaTarefa:'',modo:'lote'}]
        : [{transicao:'',proximaTarefa:'',modo:'lote'}];
      var nPassos = passos.length;
      var sim = (state.etqFormSimular != null) ? state.etqFormSimular : (r ? !!r.simular : false);
      var stepsHtml = passos.map(function(ps,i){
        return '<div class="etq-step" data-step-idx="' + i + '">' +
          '<div class="etq-step-ctrl">' +
            '<span class="etq-step-num">' + (i+1) + '</span>' +
            '<span class="etq-step-move">' +
              '<button type="button" data-etq-action="up-step" data-step-idx="' + i + '" title="Mover acima"' + (i===0?' disabled':'') + '>▲</button>' +
              '<button type="button" data-etq-action="down-step" data-step-idx="' + i + '" title="Mover abaixo"' + (i===nPassos-1?' disabled':'') + '>▼</button>' +
            '</span>' +
          '</div>' +
          '<input type="text" class="step-trans" placeholder="Transição" value="' + esc(ps.transicao||'') + '">' +
          '<select class="step-modo" title="Lote: seleciona e move todos os processos de uma vez (Movimentar em lote). Individual: abre processo a processo — use quando a transição não aparece no lote.">' +
            '<option value="lote"'       + (ps.modo!=='individual'?' selected':'') + '>🔷 Lote</option>' +
            '<option value="individual"' + (ps.modo==='individual' ?' selected':'') + '>🔹 Ind.</option>' +
          '</select>' +
          '<input type="text" class="step-prox" placeholder="Próxima tarefa" list="dlTarefas" value="' + esc(ps.proximaTarefa||'') + '">' +
          '<button class="etq-ibtn del" data-etq-action="del-step" data-step-idx="' + i + '" title="Remover">✕</button>' +
        '</div>';
      }).join('');
      return '<div class="ag-form-row"><label class="ag-lbl">Etiqueta</label>' +
        '<input id="etqInpEtq" class="ag-inp" type="text" list="dlEtiquetasVinc" placeholder="Ex: TRÂNSITO EM JULGADO" value="' + esc(etq) + '">' +
        '<div class="etq-etq-fb" id="etqEtqFb"></div></div>' +
        '<div class="ag-form-row"><label class="ag-lbl">Tarefa inicial <span style="font-weight:400;text-transform:none;font-size:10px">(opcional)</span></label>' +
        '<input id="etqInpTI" class="ag-inp" type="text" list="dlTarefas" placeholder="Onde a automação começa" value="' + esc(ti) + '"></div>' +
        '<div class="ag-form-row"><label class="ag-lbl">Tarefa final <span style="font-weight:400;text-transform:none;font-size:10px">(opcional)</span></label>' +
        '<input id="etqInpTF" class="ag-inp" type="text" list="dlTarefas" placeholder="Navegar após concluir" value="' + esc(tf) + '"></div>' +
        '<div class="ag-form-row"><label class="ag-lbl">Etapas</label>' +
        '<div style="display:grid;grid-template-columns:auto 1fr auto 1fr auto;gap:5px;font-size:10px;color:#6b7280;margin-bottom:4px;padding:0 1px"><span></span><span>Transição</span><span>Modo</span><span>Próxima tarefa</span><span></span></div>' +
        '<div id="etqFormSteps">' + stepsHtml + '</div>' +
        '<button class="etq-add-step" id="etqBtnAddStep">＋ Adicionar etapa</button>' +
        '<div id="etqPipeWrap">' + _pipePrevHtml(etq, passos) + '</div></div>' +
        '<div class="ag-form-row"><label class="ag-lbl" style="display:flex;align-items:center;gap:7px;cursor:pointer;text-transform:none;font-weight:500">' +
        '<input id="etqInpSimular" type="checkbox"' + (sim?' checked':'') + ' style="width:auto;margin:0;flex:0 0 auto">' +
        '🔎 Simular nos autos <span style="font-weight:400;color:#6b7280;font-size:11px">(testa a transição, não move)</span></label></div>';
    }

    function renderEtqRemForm(r) {
      return '<div class="ag-form-row"><label class="ag-lbl">Etiqueta a remover</label>' +
        '<input id="remInpEtq" class="ag-inp" type="text" list="dlEtiquetasVinc" placeholder="Ex: CoPPEx - Cota" value="' + esc(r?r.etiqueta:'') + '">' +
        '<div class="etq-etq-fb" id="etqEtqFb"></div></div>' +
        '<div class="ag-form-row"><label class="ag-lbl">Tarefa em Minhas Tarefas</label>' +
        '<input id="remInpTarefa" class="ag-inp" type="text" list="dlTarefas" placeholder="Ex: Cumprimento de Diligência" value="' + esc(r?r.tarefa:'') + '"></div>';
    }

    function renderEtqVincForm(r) {
      var etqs = r ? ((r.etiquetas && r.etiquetas.length) ? r.etiquetas : (r.etiqueta ? [r.etiqueta] : [])) : [];
      return '<div class="ag-form-row"><label class="ag-lbl">Etiqueta(s) a vincular <span style="font-weight:400;text-transform:none;font-size:10px">(uma por linha)</span></label>' +
        '<textarea id="vincInpEtq" class="ag-inp" rows="3" placeholder="Ex: DILIGÊNCIA (uma por linha)" style="resize:vertical;font-family:inherit">' + esc(etqs.join('\n')) + '</textarea>' +
        '<div class="etq-etq-fb" id="etqEtqFb"></div></div>' +
        '<div class="ag-form-row"><label class="ag-lbl">Tarefa em Minhas Tarefas <span style="font-weight:400;text-transform:none;font-size:10px">(opcional)</span></label>' +
        '<input id="vincInpTarefa" class="ag-inp" type="text" list="dlTarefas" placeholder="Vazio = vincula na página atual" value="' + esc(r?r.tarefa:'') + '"></div>';
    }

    function renderEtqComForm(r) {
      var isDP = !r || r.instrumento !== 'DN';
      function selOpt(val,cur,isDef){ return (cur===val||(!cur&&isDef))?' selected':''; }
      // item 5: configuração por polo (acordeão). Campos por destinatário: Comunicação/Meio/Tipo de Prazo/Prazo.
      function _cfgPolo(key){
        if (r && r.polos && r.polos[key]) return r.polos[key];
        if (r) return { comunicacao:r.comunicacao, meio:r.meio, tipoPrazo:r.tipoPrazo, prazo:r.prazo };
        return {};
      }
      function _poloOn(key){
        if (!r) return false; // item 1: regra nova abre com todos os polos desmarcados
        return key==='ativo' ? !!r.poloAtivo : key==='passivo' ? !!r.poloPassivo : !!r.terceiros;
      }
      function _optsComun(cur){ return ['Citação','Comunicação','Edital','Intimação','Intimação de Pauta'].map(function(v){ return '<option'+selOpt(v,cur,v==='Intimação')+'>'+v+'</option>'; }).join(''); }
      function _optsMeio(cur){ return ['Diário Eletrônico','Sistema','Correios','Central de Mandados','Pessoalmente','Mural'].map(function(v){ return '<option'+selOpt(v,cur,v==='Diário Eletrônico')+'>'+v+'</option>'; }).join(''); }
      function _optsTPrazo(cur){ return ['dias','meses','anos','horas','minutos','data certa'].map(function(v){ return '<option'+selOpt(v,cur,v==='dias')+'>'+v+'</option>'; }).join(''); }
      function _poloBloco(key, nome){
        var c=_cfgPolo(key), on=_poloOn(key), chkId='prepChk'+(key==='ativo'?'Ativo':key==='passivo'?'Passivo':'Terc');
        return '<div class="polo-acc'+(on?'':' collapsed')+'">' +
          '<label class="polo-head'+(on?' on':'')+'">' +
            '<input type="checkbox" class="polo-chk" data-polo="'+key+'" id="'+chkId+'"'+(on?' checked':'')+'>' +
            '<span class="polo-nome">'+nome+'</span><span class="polo-chev">▾</span>' +
          '</label>' +
          '<div class="polo-body" data-polo-body="'+key+'"'+(on?'':' style="display:none"')+'>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">' +
              '<div><label class="ag-lbl">Comunicação</label><select class="ag-sel prep-comun">'+_optsComun(c.comunicacao)+'</select></div>' +
              '<div><label class="ag-lbl">Meio</label><select class="ag-sel prep-meio">'+_optsMeio(c.meio)+'</select></div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px">' +
              '<div><label class="ag-lbl">Tipo de Prazo</label><select class="ag-sel prep-tprazo">'+_optsTPrazo(c.tipoPrazo)+'</select></div>' +
              '<div><label class="ag-lbl">Prazo</label><input class="ag-inp prep-prazo" type="number" min="0" value="'+esc(c.prazo!=null&&c.prazo!==''?c.prazo:'3')+'"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
      var destHtml = '<div class="ag-form-row"><label class="ag-lbl">Destinatários <span style="font-weight:400;text-transform:none;font-size:10px">(marque para configurar cada um)</span></label>' +
        _poloBloco('ativo','Polo Ativo') + _poloBloco('passivo','Polo Passivo') + _poloBloco('terceiros','Terceiros') + '</div>';
      return '<div class="ag-form-row"><label class="ag-lbl">Etiqueta (filtro)</label>' +
        '<input id="prepInpEtq" class="ag-inp" type="text" list="dlEtiquetasVinc" placeholder="Ex: DILIGÊNCIA" value="' + esc(r?r.etiqueta:'') + '">' +
        '<div class="etq-etq-fb" id="etqEtqFb"></div></div>' +
        '<div class="ag-form-row"><label class="ag-lbl">Tarefa em Minhas Tarefas</label>' +
        '<input id="prepInpTarefa" class="ag-inp" type="text" list="dlTarefas" placeholder="Ex: Preparar comunicação" value="' + esc(r?r.tarefa:'Preparar comunicação') + '"></div>' +
        destHtml +
        '<div class="ag-form-row"><label class="ag-lbl">Instrumento</label>' +
        '<div style="display:flex;gap:16px;font-size:13px;margin-top:4px">' +
          '<label><input type="radio" name="prepInstrumento" id="prepRadioDP" value="DP"' + ( isDP?' checked':'') + '> Doc. do Processo</label>' +
          '<label><input type="radio" name="prepInstrumento" id="prepRadioDN" value="DN"' + (!isDP?' checked':'') + '> Documento Novo</label>' +
        '</div></div>' +
        '<div id="prepWrapTipoDoc" class="ag-form-row"' + (!isDP?' style="display:none"':'') + '><label class="ag-lbl">Tipo do Documento</label>' +
        '<input id="prepInpTipoDoc" class="ag-inp" type="text" placeholder="Ex: Decisão" value="' + esc(r?r.tipoDocumento:'') + '"></div>' +
        '<div id="prepWrapModelo" class="ag-form-row"' + ( isDP?' style="display:none"':'') + '><label class="ag-lbl">Nome do Modelo</label>' +
        '<input id="prepInpModelo" class="ag-inp" type="text" placeholder="Ex: CoPPEx - SePP PropPart" value="' + esc(r?r.modeloDocumento:'') + '"></div>';
    }

    function wireEtiquetas() {
      var tipo = state.etqTipo || 'add';

      // ── Validação visível (substitui o foco silencioso) ──────────────
      function erroForm(msg, el){
        var box=$('etqFormErro');
        if(box){ box.textContent=msg; box.style.display='block'; }
        if(el){ el.classList.add('etq-inp-erro'); el.focus(); }
      }
      function limpaErro(){
        var box=$('etqFormErro');
        if(box){ box.style.display='none'; box.textContent=''; }
        ['etqInpEtq','etqInpTI','etqInpTF','remInpEtq','remInpTarefa','vincInpEtq','vincInpTarefa','prepInpEtq','prepInpTarefa'].forEach(function(id){ var e=$(id); if(e) e.classList.remove('etq-inp-erro'); });
      }
      // ── Feedback de etiqueta (casa sem acento) e prévia do pipeline ───
      function _etqInputAtual(){
        if(tipo==='add')  return $('etqInpEtq');
        if(tipo==='rem')  return $('remInpEtq');
        if(tipo==='com')  return $('prepInpEtq');
        if(tipo==='vinc') return $('vincInpEtq');
        return null;
      }
      function atualizarFb(){
        var box=$('etqEtqFb'); if(!box) return;
        var el=_etqInputAtual();
        if(!el){ box.className='etq-etq-fb'; box.innerHTML=''; return; }
        var m=_mapaEtiquetas(), temMapa=state.resultado&&Object.keys(m).length;
        if(tipo==='vinc'){
          var linhas=(el.value||'').split('\n').map(function(s){return s.trim();}).filter(Boolean);
          if(!linhas.length||!temMapa){ box.className='etq-etq-fb'; box.innerHTML=''; return; }
          var nao=linhas.filter(function(l){ var nl=_normAce(l); return !Object.keys(m).some(function(k){ var nk=_normAce(k); return nk===nl||nk.indexOf(nl)>=0; }); });
          if(nao.length){ box.className='etq-etq-fb warn'; box.innerHTML='⚠ Não encontrada(s) no mapeamento: '+esc(nao.join(', ')); }
          else { box.className='etq-etq-fb ok'; box.innerHTML='✓ '+linhas.length+' etiqueta(s) reconhecida(s) no mapeamento'; }
          return;
        }
        var fb=_etqFbVinc(el.value);
        box.className='etq-etq-fb'+(fb.cls?(' '+fb.cls):''); box.innerHTML=fb.html;
      }
      function atualizarPreview(){
        var w=$('etqPipeWrap'); if(!w) return;
        var etqEl=$('etqInpEtq');
        w.innerHTML=_pipePrevHtml(etqEl?etqEl.value:'', lerPassos());
      }

      var tipoBtnsEl = $('etqTipoBtns');
      if (tipoBtnsEl) {
        tipoBtnsEl.addEventListener('click', function(e) {
          var btn = e.target.closest('[data-etq-tipo]');
          if (!btn) return;
          state.etqTipo = btn.dataset.etqTipo;
          state.etqEditing = null; state.etqFormPassos = null;
          state.etqFormEtq = ''; state.etqFormTarefaInicial = ''; state.etqFormTarefaFinal = ''; state.etqFormSimular = null;
          render();
        });
      }

      var cancelEdit = $('etqCancelEdit');
      if (cancelEdit) {
        cancelEdit.addEventListener('click', function() {
          state.etqEditing = null; state.etqFormPassos = null;
          state.etqFormEtq = ''; state.etqFormTarefaInicial = ''; state.etqFormTarefaFinal = ''; state.etqFormSimular = null;
          render();
        });
      }

      function lerPassos() {
        var ei=$('etqInpEtq'), ti=$('etqInpTI'), tf=$('etqInpTF');
        if(ei) state.etqFormEtq=ei.value;
        if(ti) state.etqFormTarefaInicial=ti.value;
        if(tf) state.etqFormTarefaFinal=tf.value;
        var sc=$('etqInpSimular'); if(sc) state.etqFormSimular=sc.checked;
        var el=$('etqFormSteps');
        if(!el) return state.etqFormPassos||[];
        return Array.from(el.querySelectorAll('.etq-step')).map(function(row){
          return {
            transicao:    (row.querySelector('.step-trans')||{value:''}).value.trim(),
            modo:         (row.querySelector('.step-modo') ||{value:'lote'}).value,
            proximaTarefa:(row.querySelector('.step-prox') ||{value:''}).value.trim()
          };
        });
      }

      var btnAddStep=$('etqBtnAddStep');
      if(btnAddStep){
        btnAddStep.addEventListener('click',function(){
          var ps=lerPassos(); ps.push({transicao:'',proximaTarefa:'',modo:'lote'});
          state.etqFormPassos=ps; render();
        });
      }
      var stepsEl=$('etqFormSteps');
      if(stepsEl){
        stepsEl.addEventListener('click',function(e){
          var btn=e.target.closest('[data-etq-action]');
          if(!btn) return;
          var act=btn.dataset.etqAction, idx=parseInt(btn.dataset.stepIdx,10);
          var ps=lerPassos();
          if(act==='del-step'){
            ps.splice(idx,1);
            if(!ps.length) ps=[{transicao:'',proximaTarefa:'',modo:'lote'}];
          } else if(act==='up-step'){
            if(idx>0){ var a=ps[idx-1]; ps[idx-1]=ps[idx]; ps[idx]=a; }
          } else if(act==='down-step'){
            if(idx<ps.length-1){ var b=ps[idx+1]; ps[idx+1]=ps[idx]; ps[idx]=b; }
          } else { return; }
          state.etqFormPassos=ps; render();
        });
        stepsEl.addEventListener('input', function(){ state.etqFormPassos = lerPassos(); atualizarPreview(); });
        stepsEl.addEventListener('change', function(){ state.etqFormPassos = lerPassos(); });
      }

      // Feedback ao vivo da etiqueta + prévia inicial do pipeline
      var etqInpAtual=_etqInputAtual();
      if(etqInpAtual){
        etqInpAtual.addEventListener('input', function(){ this.classList.remove('etq-inp-erro'); atualizarFb(); if(tipo==='add') atualizarPreview(); });
      }
      atualizarFb();

      var radioDP=$('prepRadioDP'), radioDN=$('prepRadioDN');
      var wrapTipo=$('prepWrapTipoDoc'), wrapMod=$('prepWrapModelo');
      function updInstr(){
        var isDP=radioDP&&radioDP.checked;
        if(wrapTipo) wrapTipo.style.display=isDP?'':'none';
        if(wrapMod)  wrapMod.style.display =isDP?'none':'';
      }
      if(radioDP) radioDP.addEventListener('change',updInstr);
      if(radioDN) radioDN.addEventListener('change',updInstr);

      // item 5: acordeão por polo — marcar/desmarcar expande/recolhe o painel de campos
      Array.from(shadow.querySelectorAll('.polo-chk')).forEach(function(chk){
        chk.addEventListener('change', function(){
          var acc=chk.closest('.polo-acc');
          var body=acc?acc.querySelector('.polo-body'):null;
          var head=chk.closest('.polo-head');
          if(body) body.style.display=chk.checked?'':'none';
          if(acc) acc.classList.toggle('collapsed', !chk.checked);
          if(head) head.classList.toggle('on', chk.checked);
        });
      });

      var btnSave=$('etqBtnSave');
      if(btnSave){
        btnSave.addEventListener('click',function(){
          limpaErro();
          var editInfo=state.etqEditing;
          var editId=editInfo?editInfo.r.id:null;
          if(tipo==='add'){
            var ps=lerPassos();
            var inpEtq=$('etqInpEtq');
            var etq=(inpEtq?inpEtq.value:'').trim();
            if(!etq){return erroForm('Informe a etiqueta.', inpEtq);}
            var ti=(state.etqFormTarefaInicial||'').trim();
            var tf=(state.etqFormTarefaFinal||'').trim();
            var passos=ps.filter(function(x){return x.transicao;});
            if(!passos.length){return erroForm('Adicione ao menos uma etapa com transição.', inpEtq);}
            var simular=!!(($('etqInpSimular')||{}).checked);
            var nova;
            if(passos.length===1&&!passos[0].proximaTarefa&&passos[0].modo!=='individual'&&!ti){
              nova={id:editId||Date.now().toString(36),etiqueta:etq,tarefaDestino:passos[0].transicao,simular:simular,ativo:true};
            } else {
              nova={id:editId||Date.now().toString(36),etiqueta:etq,tarefaInicial:ti,tarefaFinal:tf,tarefaDestino:'',pipeline:passos,simular:simular,ativo:true};
            }
            var ex=state.etiquetaRegras||[];
            state.etiquetaRegras=editId?ex.map(function(r){return r.id===editId?Object.assign({},nova,{ativo:r.ativo}):r;}):ex.concat([nova]);
            try{chrome.storage.local.set({etiquetaRegras:state.etiquetaRegras});}catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          } else if(tipo==='rem'){
            var inpE=$('remInpEtq'),inpT=$('remInpTarefa');
            var etq=(inpE?inpE.value:'').trim(),tar=(inpT?inpT.value:'').trim();
            if(!etq){return erroForm('Informe a etiqueta a remover.', inpE);}
            if(!tar){return erroForm('Informe a tarefa em Minhas Tarefas.', inpT);}
            var nova={id:editId||Date.now().toString(36),etiqueta:etq,tarefa:tar,ativo:true};
            var ex=state.removerEtiquetaRegras||[];
            state.removerEtiquetaRegras=editId?ex.map(function(r){return r.id===editId?Object.assign({},nova,{ativo:r.ativo}):r;}):ex.concat([nova]);
            try{chrome.storage.local.set({removerEtiquetaRegras:state.removerEtiquetaRegras});}catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          } else if(tipo==='vinc'){
            var inpVE=$('vincInpEtq'),inpVT=$('vincInpTarefa');
            var etqs=(inpVE?inpVE.value:'').split('\n').map(function(s){return s.trim();}).filter(Boolean);
            var tar=(inpVT?inpVT.value:'').trim();
            if(!etqs.length){return erroForm('Informe ao menos uma etiqueta (uma por linha).', inpVE);}
            // tarefa é opcional no Vincular (item 1): vazio = vincula na página atual
            var nova={id:editId||Date.now().toString(36),etiquetas:etqs,etiqueta:etqs[0],tarefa:tar,ativo:true};
            var ex=state.vincularEtiquetaRegras||[];
            state.vincularEtiquetaRegras=editId?ex.map(function(r){return r.id===editId?Object.assign({},nova,{ativo:r.ativo}):r;}):ex.concat([nova]);
            try{chrome.storage.local.set({vincularEtiquetaRegras:state.vincularEtiquetaRegras});}catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          } else if(tipo==='com'){
            var etq=($('prepInpEtq')?$('prepInpEtq').value:'').trim();
            if(!etq){return erroForm('Informe a etiqueta (filtro).', $('prepInpEtq'));}
            var instr=($('prepRadioDN')&&$('prepRadioDN').checked)?'DN':'DP';
            var lerPolo=function(key){
              var body=shadow.querySelector('[data-polo-body="'+key+'"]'); if(!body) return null;
              var g=function(sel){ var e=body.querySelector(sel); return e?e.value:''; };
              return { comunicacao:g('.prep-comun')||'Intimação', meio:g('.prep-meio')||'Diário Eletrônico', tipoPrazo:g('.prep-tprazo')||'dias', prazo:g('.prep-prazo')||'3' };
            };
            var padraoPolo={comunicacao:'Intimação',meio:'Diário Eletrônico',tipoPrazo:'dias',prazo:'3'};
            var pAtivo=!!($('prepChkAtivo')&&$('prepChkAtivo').checked);
            var pPassivo=!!($('prepChkPassivo')&&$('prepChkPassivo').checked);
            var pTerc=!!($('prepChkTerc')&&$('prepChkTerc').checked);
            if(!pAtivo&&!pPassivo&&!pTerc){ return erroForm('Marque ao menos um destinatário (polo).', null); }
            var polos={};
            if(pAtivo) polos.ativo=lerPolo('ativo')||padraoPolo;
            if(pPassivo) polos.passivo=lerPolo('passivo')||padraoPolo;
            if(pTerc) polos.terceiros=lerPolo('terceiros')||padraoPolo;
            var primeiro=polos.ativo||polos.passivo||polos.terceiros||padraoPolo;
            var nova={
              id:editId||Date.now().toString(36),etiqueta:etq,
              tarefa:($('prepInpTarefa')?$('prepInpTarefa').value:'').trim()||'Preparar comunicação',
              poloAtivo:pAtivo, poloPassivo:pPassivo, terceiros:pTerc,
              polos:polos,
              comunicacao:primeiro.comunicacao||'Intimação',
              meio:primeiro.meio||'Diário Eletrônico',
              tipoPrazo:primeiro.tipoPrazo||'dias',
              prazo:primeiro.prazo||'3',
              instrumento:instr,
              tipoDocumento:($('prepInpTipoDoc')?$('prepInpTipoDoc').value:'').trim(),
              modeloDocumento:($('prepInpModelo')?$('prepInpModelo').value:'').trim(),
              ativo:true
            };
            var ex=state.prepComunicacaoRegras||[];
            state.prepComunicacaoRegras=editId?ex.map(function(r){return r.id===editId?Object.assign({},nova,{ativo:r.ativo}):r;}):ex.concat([nova]);
            try{chrome.storage.local.set({prepComunicacaoRegras:state.prepComunicacaoRegras});}catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          }
          state.etqEditing=null; state.etqFormPassos=null;
          state.etqFormEtq=''; state.etqFormTarefaInicial=''; state.etqFormTarefaFinal=''; state.etqFormSimular=null;
          render();
        });
      }

      var lista=$('etqList');
      if(lista){
        lista.addEventListener('click',function(e){
          var btn=e.target.closest('[data-li-action]');
          if(!btn) return;
          var act=btn.dataset.liAction, lid=btn.dataset.liId, lTip=btn.dataset.liTipo;
          var keyMap={add:'etiquetaRegras',rem:'removerEtiquetaRegras',com:'prepComunicacaoRegras',vinc:'vincularEtiquetaRegras'};
          var key=keyMap[lTip], arr=state[key]||[];
          if(act==='edit'){
            var rFound=arr.find(function(r){return r.id===lid;});
            if(!rFound) return;
            state.etqTipo=lTip; state.etqEditing={tipo:lTip,r:rFound};
            if(lTip==='add'){
              state.etqFormPassos=(rFound.pipeline&&rFound.pipeline.length)
                ?rFound.pipeline.map(function(p){return Object.assign({},p);})
                :[{transicao:rFound.tarefaDestino||'',proximaTarefa:'',modo:'lote'}];
              state.etqFormTarefaInicial=rFound.tarefaInicial||'';
              state.etqFormTarefaFinal=rFound.tarefaFinal||'';
              state.etqFormEtq=rFound.etiqueta;
              state.etqFormSimular=!!rFound.simular;
            }
            render(); return;
          }
          if(act==='tog'){
            state[key]=arr.map(function(r){return r.id===lid?Object.assign({},r,{ativo:r.ativo===false}):r;});
            var s={}; s[key]=state[key]; try{chrome.storage.local.set(s);}catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          } else if(act==='del'){
            if(!confirm('Excluir esta regra?')) return;
            state[key]=arr.filter(function(r){return r.id!==lid;});
            var s={}; s[key]=state[key]; try{chrome.storage.local.set(s);}catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
            if(state.etqEditing&&state.etqEditing.r.id===lid) state.etqEditing=null;
          }
          render();
        });
      }

      function aplicarFiltros(){
        var busca=($('etqSearchInp')?$('etqSearchInp').value.toLowerCase():'');
        var fTipo=($('etqFiltroTipo')?$('etqFiltroTipo').value:'');
        var fStat=($('etqFiltroStatus')?$('etqFiltroStatus').value:'');
        state.etqBusca=busca;
        if(!lista) return;
        Array.from(lista.querySelectorAll('.etq-li')).forEach(function(el){
          var nome=el.querySelector('.etq-li-name').textContent.toLowerCase();
          var liTip=el.dataset.liTipo, isOff=el.classList.contains('inativa'), show=true;
          if(busca&&nome.indexOf(busca)<0) show=false;
          if(fTipo&&liTip!==fTipo) show=false;
          if(fStat==='on'&&isOff) show=false;
          if(fStat==='off'&&!isOff) show=false;
          el.style.display=show?'':'none';
        });
        var filtroAtivo=!!(busca||fTipo||fStat);
        Array.from(lista.querySelectorAll('.etq-sec')).forEach(function(sec){
          var temVisivel=Array.from(sec.querySelectorAll('.etq-li')).some(function(el){ return el.style.display!=='none'; });
          if(filtroAtivo){
            sec.style.display=temVisivel?'':'none';
            sec.classList.toggle('collapsed', !temVisivel);
          } else {
            sec.style.display='';
            sec.classList.add('collapsed');
          }
        });
      }
      var si=$('etqSearchInp'),ft=$('etqFiltroTipo'),fs=$('etqFiltroStatus');
      if(si) si.addEventListener('input',aplicarFiltros);
      if(ft) ft.addEventListener('change',aplicarFiltros);
      if(fs) fs.addEventListener('change',aplicarFiltros);
      aplicarFiltros();

      // item 2: exportar / importar regras
      var btnExp=$('etqBtnExportar'); if(btnExp) btnExp.addEventListener('click', etqExportar);
      var btnImp=$('etqBtnImportar'), fileImp=$('etqImportFile');
      if(btnImp&&fileImp){
        btnImp.addEventListener('click', function(){ fileImp.value=''; fileImp.click(); });
        fileImp.addEventListener('change', function(){ if(fileImp.files&&fileImp.files[0]) etqImportarArquivo(fileImp.files[0]); });
      }
      var impM=$('etqImpMesclar'), impS=$('etqImpSubstituir'), impC=$('etqImpCancelar');
      if(impM) impM.addEventListener('click', function(){ etqAplicarImport('mesclar'); });
      if(impS) impS.addEventListener('click', function(){ if(confirm('Substituir TODAS as regras atuais pelas do arquivo?')) etqAplicarImport('substituir'); });
      if(impC) impC.addEventListener('click', function(){ state.etqImport=null; render(); });

      // item 3: expandir/recolher se\u00e7\u00f5es por tipo
      if(lista){
        lista.addEventListener('click', function(e){
          var hd=e.target.closest('[data-sec-tgl]'); if(!hd) return;
          var sec=hd.closest('.etq-sec'); if(sec) sec.classList.toggle('collapsed');
        });
      }
    }

    function wireRemoverEtiquetas() { /* unificado em wireEtiquetas */ }

    function wirePrepararComunicacao() { /* unificado em wireEtiquetas */ }

    function renderConfig() {
      var c = state.cfg;
      function chk(id, m, lb, ds) {
        return '<label class="check"><input type="checkbox" id="' + id + '"' + (m?' checked':'') + '>' +
               '<div><div class="lbl">' + esc(lb) + '</div><div class="ds">' + esc(ds) + '</div></div></label>';
      }
      var nomeDetectado = _detectarNomePJe();
      var nomeAtual = state.servidor || '';
      var placeholderServidor = nomeDetectado ? 'Detectado: ' + nomeDetectado : 'Ex: João Silva';
      return '<div class="sec"><h2>👤 Identificação do servidor</h2>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:10px">Nome exibido na coluna <strong>Servidor</strong> ao exportar o Relatório para o Google Sheets.</p>' +
        '<div class="cfg-row">' +
          '<label>Nome do servidor</label>' +
          '<div style="display:flex;gap:6px;flex:1">' +
            '<input type="text" id="cServidor" placeholder="' + esc(placeholderServidor) + '" value="' + esc(nomeAtual) + '" style="flex:1;padding:5px 8px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;font-family:inherit">' +
            (nomeDetectado ? '<button id="bAutoServidor" class="btn sec" style="font-size:11px;white-space:nowrap;padding:4px 10px">🔍 Usar PJe</button>' : '') +
          '</div>' +
        '</div>' +
        (nomeDetectado ? '<p style="color:#059669;font-size:11px;margin-top:6px;margin-bottom:0">✅ Nome detectado automaticamente do PJe: <strong>' + esc(nomeDetectado) + '</strong></p>' :
                         '<p style="color:#9ca3af;font-size:11px;margin-top:6px;margin-bottom:0">Não foi possível detectar o nome do PJe automaticamente. Digite manualmente.</p>') +
        '</div><div class="sec"><h2>📂 Quais cards capturar</h2>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:14px">Marque os cards do dashboard a serem percorridos.</p>' +
        chk('cMinhas', c.cards.minhas, 'Minhas Tarefas', 'Tarefas atribuídas a você.') +
        chk('cGerais', c.cards.gerais, 'Tarefas Gerais', 'Tarefas do órgão como um todo.') +
        chk('cAssin', c.cards.assinaturas, 'Assinaturas', 'Documentos para assinatura.') +
        '</div><div class="sec"><h2>🔄 Atualização automática (Minhas Tarefas via API)</h2>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:10px">Varre Minhas Tarefas pela API, sem abrir aba. Os modos periódicos exigem uma aba do PJe aberta no horário.</p>' +
        '<div class="cfg-row"><label>Quando rodar</label>' +
          '<select id="cAgendaModo" style="flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;font-family:inherit">' +
            '<option value="off"' + (!c.agendaModo || c.agendaModo === 'off' ? ' selected' : '') + '>Desligado (só manual)</option>' +
            '<option value="sessao"' + (c.agendaModo === 'sessao' ? ' selected' : '') + '>Ao abrir o PJe (1× por sessão)</option>' +
            '<option value="15min"' + (c.agendaModo === '15min' ? ' selected' : '') + '>A cada 15 minutos</option>' +
            '<option value="30min"' + (c.agendaModo === '30min' ? ' selected' : '') + '>A cada 30 minutos</option>' +
            '<option value="1h"' + (c.agendaModo === '1h' ? ' selected' : '') + '>A cada 1 hora</option>' +
            '<option value="dia"' + (c.agendaModo === 'dia' ? ' selected' : '') + '>1× ao dia</option>' +
          '</select>' +
        '</div>' +
        '</div><div class="sec"><h2>⏱️ Comportamento</h2>' +
        chk('cPag', c.paginacao, 'Capturar todas as páginas', 'Desativar = só primeira página.') +
        '<div class="cfg-row" style="margin-top:12px"><label>Máximo de páginas</label><input type="number" id="cMaxPag" min="1" max="500" value="' + c.maxPaginas + '"></div>' +
        '<div class="cfg-row"><label>Timeout por página (ms)</label><input type="number" id="cTimeout" min="2000" max="60000" step="1000" value="' + c.timeoutLista + '"></div>' +
        '<div class="cfg-row"><label>Pausa entre tarefas (ms)</label><input type="number" id="cDelay" min="0" max="5000" step="100" value="' + c.delayEntreTarefas + '"></div>' +
        '<div class="cfg-row" style="margin-top:14px;padding-top:14px;border-top:1px solid #e5e7eb">' +
          '<label>Tarefas a capturar</label>' +
          '<button class="btn sec" id="bSelTarefas" style="font-size:12px">📋 Selecionar tarefas (' + (state.tarefasSel.bloquear.length) + ' bloqueadas)</button>' +
        '</div>' +
        '</div><div class="sec"><h2>👁️ Exibição da aba Tarefas</h2>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:14px">Oculte colunas que você não usa na tabela de processos. O Número CNJ permanece sempre visível.</p>' +
        chk('cColFase', c.colFaseLocal !== false, 'Mostrar coluna "Fase / Local"', 'Desmarque para ocultar a coluna Fase / Local na aba Tarefas.') +
        '</div><div class="sec"><h2>⚡ Abertura dos autos</h2>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:14px">A <strong>abertura rápida</strong> abre os autos direto pela URL (regenerando a chave de acesso), sem percorrer a lista da tarefa — bem mais rápido. Desligue se o PJe mudar e a abertura direta falhar.</p>' +
        chk('cFastAutos', true, 'Abertura rápida dos autos', 'Usa o cache de processos já abertos; sem cache, cai no fluxo normal automaticamente.') +
        '</div><div class="sec"><h2>🏷️ Tipos de documento (Tabela nos autos)</h2>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:12px">Como a <strong>Tabela nos autos</strong> classifica e colore os documentos. Inclua, edite, exclua, importe ou exporte os tipos.</p>' +
        '<button class="btn sec" id="bTiposDoc" style="font-size:12px">🏷️ Gerenciar tipos de documento</button>' +
        '</div><div class="sec"><h2>🧩 Atalhos de extensões</h2>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:12px">Coloque na barra dos autos botões para abrir outras extensões (ex.: AuditJE). A extensão precisa suportar a chamada e estar ativa.</p>' +
        '<button class="btn sec" id="bAtalhosExt" style="font-size:12px">🧩 Gerenciar atalhos de extensões</button>' +
        '</div>' +
        '<div class="sec"><h2>Etiquetagem automática por marco</h2>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:12px">Ao abrir os autos, identifica na árvore (documentos/movimentos) os marcos configurados e <strong>vincula a etiqueta</strong> correspondente. As etiquetas vêm das regras de <strong>vincular etiqueta</strong> (aba Etiquetas).</p>' +
        chk('cMarcoAuto', state.marcoAuto !== false, 'Ligar etiquetagem automática por marco', 'Detecta certidão/movimento na árvore e aplica a etiqueta da regra correspondente.') +
        chk('cMarcoAviso', state.marcoAviso !== false, 'Avisar a cada etiquetagem', 'Mostra um aviso sempre que uma etiqueta for aplicada por marco.') +
        '<button class="btn sec" id="bMarcoRegras" style="font-size:12px;margin-top:8px">Gerenciar regras (marco → etiqueta) (' + ((state.marcoDoc.lista||[]).length) + ')</button>' +
        '</div>' +
        '<div class="sec"><h2>KPIs por etiqueta</h2>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:10px">Relatório de indicadores por etiqueta — cards, funil de fases e carga por membro. Por ora usa o padrão embutido (funil RCand + carga SePP); o configurador vem a seguir.</p>' +
        '<button class="btn sec" id="bKpiConfig" style="font-size:12px">Gerenciar KPIs</button> ' +
        '<button class="btn sec" id="bRelKpis" style="font-size:12px">Abrir relatório de KPIs</button>' +
        '</div>' +
        '<div class="sec"><h2>🚀 Iniciar coleta</h2>' +
        '<p style="color:#6b7280;font-size:12px;margin-bottom:14px">Será aberta uma aba auxiliar. Não interaja com ela.</p>' +
        '<div style="display:flex;gap:10px"><button class="btn" id="bAuto2">▶ Iniciar mapeamento</button>' +
        '<button class="btn sec" id="bSave">💾 Salvar configurações</button></div></div>';
    }

    // ── Tipos de documento (Tabela nos autos): CRUD + importar/exportar ──────
    // Espelha a config lida por content/tabela-autos.js (storage 'pjmTabelaTipos').
    function tiposDocDefault() {
      return [
        { key:'certidao',   label:'Certidão',        cor:'#166534', fundo:'#dcfce7', palavras:['certid'], ativo:true },
        { key:'peticao',    label:'Petição',         cor:'#6b21a8', fundo:'#f3e8ff', palavras:['peticao','recurso','contrarraz','contrarrazoes','memori','embargos','agravo','apelacao','contestacao'], ativo:true },
        { key:'edital',     label:'Edital',          cor:'#a21caf', fundo:'#fae8ff', palavras:['edital'], ativo:true },
        { key:'decisao',    label:'Decisão/Acórdão', cor:'#92400e', fundo:'#fef3c7', palavras:['decisao','acordao','sentenca','despacho','voto'], ativo:true },
        { key:'informacao', label:'Informação',      cor:'#075985', fundo:'#e0f2fe', palavras:['informa'], ativo:true }
      ];
    }
    function tdCorOk(c, fb) { return (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(String(c).trim())) ? String(c).trim() : fb; }
    function tdSlug(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_]/g, ''); }
    // Lê os inputs das linhas de volta para state.tiposDoc.lista (preserva edições ao re-renderizar)
    function harvestTipos() {
      if (!state.tiposDoc.aberto) return state.tiposDoc.lista || [];
      var out = [];
      shadow.querySelectorAll('.pjmtd-row').forEach(function(row) {
        var g = function(sel){ var el = row.querySelector(sel); return el ? el.value : ''; };
        var label = g('.pjmtd-label');
        var palavras = g('.pjmtd-palavras').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        var chk = row.querySelector('.pjmtd-ativo');
        out.push({
          key: row.getAttribute('data-key') || tdSlug(label),
          label: label,
          cor: tdCorOk(g('.pjmtd-cor'), '#475569'),
          fundo: tdCorOk(g('.pjmtd-fundo'), '#eef1f6'),
          palavras: palavras,
          ativo: !!(chk && chk.checked)
        });
      });
      state.tiposDoc.lista = out;
      return out;
    }
    function renderModalTipos() {
      var lista = state.tiposDoc.lista || (state.tiposDoc.lista = tiposDocDefault());
      var ip = state.tiposDoc.importPreview;
      var rows = lista.map(function(t, i) {
        return '<div class="pjmtd-row" data-key="' + esc(t.key || '') + '" style="display:grid;grid-template-columns:24px 34px 34px 1fr 1.4fr auto 30px;gap:8px;align-items:center;padding:8px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;background:' + (t.ativo ? '#fff' : '#f9fafb') + '">' +
          '<div style="display:flex;flex-direction:column;gap:2px">' +
            '<button type="button" class="pjmtd-up" data-idx="' + i + '" title="Subir" style="width:24px;height:15px;font-size:9px;border:none;background:#eef2ff;color:#4338ca;border-radius:4px;cursor:pointer' + (i === 0 ? ';opacity:.3' : '') + '">▲</button>' +
            '<button type="button" class="pjmtd-down" data-idx="' + i + '" title="Descer" style="width:24px;height:15px;font-size:9px;border:none;background:#eef2ff;color:#4338ca;border-radius:4px;cursor:pointer' + (i === lista.length - 1 ? ';opacity:.3' : '') + '">▼</button>' +
          '</div>' +
          '<input type="color" class="pjmtd-fundo" value="' + tdCorOk(t.fundo, '#eef1f6') + '" title="Cor de fundo do badge" style="width:34px;height:30px;border:1px solid #d1d5db;border-radius:6px;padding:0;cursor:pointer">' +
          '<input type="color" class="pjmtd-cor" value="' + tdCorOk(t.cor, '#475569') + '" title="Cor do texto do badge" style="width:34px;height:30px;border:1px solid #d1d5db;border-radius:6px;padding:0;cursor:pointer">' +
          '<input type="text" class="pjmtd-label" value="' + esc(t.label || '') + '" placeholder="Rótulo (ex.: Ofício)" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' +
          '<input type="text" class="pjmtd-palavras" value="' + esc((t.palavras || []).join(', ')) + '" placeholder="palavras-chave: oficio, of" title="A 1ª palavra do documento deve começar por uma destas" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' +
          '<label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#374151;white-space:nowrap;cursor:pointer"><input type="checkbox" class="pjmtd-ativo"' + (t.ativo ? ' checked' : '') + '> ativo</label>' +
          '<button type="button" class="pjmtd-del" data-idx="' + i + '" title="Excluir tipo" style="width:30px;height:28px;border:none;background:#fee2e2;color:#dc2626;border-radius:6px;cursor:pointer">🗑</button>' +
        '</div>';
      }).join('') || '<div class="empty" style="padding:24px">Nenhum tipo. Clique em “＋ Novo tipo”.</div>';
      var banner = ip ? '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:9px 14px;margin:0 20px 4px;font-size:13px;color:#1e40af">' +
          '<span style="flex:1;min-width:180px"><strong>' + ip.length + '</strong> tipo(s) no arquivo. <strong>Mesclar</strong> mantém os atuais e adiciona/atualiza; <strong>Substituir</strong> troca todos.</span>' +
          '<button type="button" class="btn" id="tdImpMesclar" style="font-size:12px">Mesclar</button>' +
          '<button type="button" class="btn dng" id="tdImpSubst" style="font-size:12px">Substituir</button>' +
          '<button type="button" class="btn sec" id="tdImpCancel" style="font-size:12px">Cancelar</button>' +
        '</div>' : '';
      return '<div style="position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:12;display:flex;align-items:center;justify-content:center;padding:20px" id="tdBackdrop">' +
        '<div style="background:#fff;border-radius:12px;max-width:840px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.3)">' +
          '<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<h2 style="margin:0;font-size:16px;color:#1a5276;flex:1;min-width:150px">🏷️ Tipos de documento — Tabela nos autos</h2>' +
            '<button class="btn sec" id="tdExport" style="font-size:12px">⬆ Exportar</button>' +
            '<button class="btn sec" id="tdImport" style="font-size:12px">⬇ Importar</button>' +
            '<input type="file" id="tdImportFile" accept="application/json,.json" style="display:none">' +
            '<button class="ibtn" id="tdClose" title="Fechar" style="background:#e5e7eb;color:#374151;font-size:22px">×</button>' +
          '</div>' +
          '<div style="padding:12px 20px 6px;color:#6b7280;font-size:12px">A <strong>ordem</strong> importa: vence a primeira regra cujo nome do documento <em>comece</em> por uma das palavras-chave. As cores definem o badge na tabela.</div>' +
          banner +
          '<div style="flex:1;overflow-y:auto;padding:8px 20px 12px">' + rows + '</div>' +
          '<div style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<div style="display:flex;gap:8px"><button class="btn sec" id="tdNovo" style="font-size:12px">＋ Novo tipo</button><button class="btn sec" id="tdRestaurar" style="font-size:12px">↺ Restaurar padrões</button></div>' +
            '<div style="display:flex;gap:8px"><button class="btn sec" id="tdCancel" style="font-size:12px">Cancelar</button><button class="btn" id="tdSalvar" style="font-size:13px">💾 Salvar</button></div>' +
          '</div>' +
        '</div></div>';
    }
    function wireModalTipos() {
      if (!state.tiposDoc.aberto) return;
      var fechar = function() { state.tiposDoc.aberto = false; state.tiposDoc.importPreview = null; render(); };
      var bk = $('tdBackdrop'); if (bk) bk.addEventListener('click', function(e) { if (e.target === bk) fechar(); });
      var xc = $('tdClose'); if (xc) xc.addEventListener('click', fechar);
      var cc = $('tdCancel'); if (cc) cc.addEventListener('click', fechar);
      var nv = $('tdNovo'); if (nv) nv.addEventListener('click', function() { harvestTipos(); state.tiposDoc.lista.push({ key:'', label:'', cor:'#475569', fundo:'#eef1f6', palavras:[], ativo:true }); render(); });
      var rs = $('tdRestaurar'); if (rs) rs.addEventListener('click', function() { state.tiposDoc.lista = tiposDocDefault(); state.tiposDoc.importPreview = null; render(); });
      shadow.querySelectorAll('.pjmtd-up').forEach(function(b) { b.addEventListener('click', function() { var i = +b.dataset.idx; if (i <= 0) return; harvestTipos(); var a = state.tiposDoc.lista, t = a[i]; a[i] = a[i-1]; a[i-1] = t; render(); }); });
      shadow.querySelectorAll('.pjmtd-down').forEach(function(b) { b.addEventListener('click', function() { var i = +b.dataset.idx; harvestTipos(); var a = state.tiposDoc.lista; if (i >= a.length - 1) return; var t = a[i]; a[i] = a[i+1]; a[i+1] = t; render(); }); });
      shadow.querySelectorAll('.pjmtd-del').forEach(function(b) { b.addEventListener('click', function() { var i = +b.dataset.idx; harvestTipos(); state.tiposDoc.lista.splice(i, 1); render(); }); });
      var sv = $('tdSalvar'); if (sv) sv.addEventListener('click', function() {
        var lista = harvestTipos().filter(function(t) { return (t.label || '').trim(); }).map(function(t) {
          return { key: t.key || tdSlug(t.label) || ('tipo' + Math.random().toString(36).slice(2,6)), label: t.label.trim(), cor: t.cor, fundo: t.fundo, palavras: t.palavras, ativo: t.ativo };
        });
        try { chrome.storage.local.set({ pjmTabelaTipos: { version: 1, tipos: lista } }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
        state.tiposDoc.lista = lista; state.tiposDoc.aberto = false; state.tiposDoc.importPreview = null; render();
      });
      var ex = $('tdExport'); if (ex) ex.addEventListener('click', function() {
        try {
          var blob = new Blob([JSON.stringify({ version: 1, tipos: harvestTipos() }, null, 2)], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = 'tipos-tabela-pje-' + new Date().toISOString().slice(0,10) + '.json';
          a.click();
          setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        } catch (e) { alert('Falha ao exportar: ' + (e && e.message ? e.message : e)); }
      });
      var im = $('tdImport'); if (im) im.addEventListener('click', function() { var f = $('tdImportFile'); if (f) f.click(); });
      var imf = $('tdImportFile'); if (imf) imf.addEventListener('change', function() {
        var file = imf.files && imf.files[0]; if (!file) { return; }
        var reader = new FileReader();
        reader.onload = function() {
          try {
            var data = JSON.parse(String(reader.result || ''));
            var tipos = Array.isArray(data) ? data : (data && data.tipos);
            if (!Array.isArray(tipos) || !tipos.length) { alert('Arquivo sem tipos válidos.'); return; }
            harvestTipos();
            state.tiposDoc.importPreview = tipos;
            render();
          } catch (e) { alert('JSON inválido: ' + (e && e.message ? e.message : e)); }
        };
        reader.readAsText(file);
        imf.value = '';
      });
      var mm = $('tdImpMesclar'); if (mm) mm.addEventListener('click', function() {
        harvestTipos();
        var ip = state.tiposDoc.importPreview || [], byKey = {}, ordem = [];
        (state.tiposDoc.lista || []).forEach(function(t) { var k = t.key || tdSlug(t.label); if (!k) return; if (!byKey[k]) ordem.push(k); byKey[k] = t; });
        ip.forEach(function(t) { var k = tdSlug(t.key || t.label); if (!k) return; if (!byKey[k]) ordem.push(k); byKey[k] = Object.assign({}, t, { key: k }); });
        state.tiposDoc.lista = ordem.map(function(k) { return byKey[k]; });
        state.tiposDoc.importPreview = null; render();
      });
      var sb = $('tdImpSubst'); if (sb) sb.addEventListener('click', function() { state.tiposDoc.lista = (state.tiposDoc.importPreview || []).slice(); state.tiposDoc.importPreview = null; render(); });
      var ic = $('tdImpCancel'); if (ic) ic.addEventListener('click', function() { state.tiposDoc.importPreview = null; render(); });
    }

    // -- Regras marco -> etiqueta (editor; motor em content/marco-etiquetador.js) --
    function _mkNorm(x) { return String(x == null ? '' : x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
    function _marcoTipos() {
      var base = (state.tiposDoc.lista && state.tiposDoc.lista.length) ? state.tiposDoc.lista : tiposDocDefault();
      var out = [];
      base.forEach(function (t) { if (t && t.ativo !== false && t.label) out.push({ key: t.key || '', label: t.label }); });
      out.push({ key: 'documento', label: 'Documento (outro)' });
      out.push({ key: 'movimento', label: 'Movimento (sem documento)' });
      return out;
    }
    function _marcoEtiquetas() {
      var set = {}, out = [];
      (state.vincularEtiquetaRegras || []).forEach(function (r) {
        var arr = (r && r.etiquetas && r.etiquetas.length) ? r.etiquetas : (r && r.etiqueta ? [r.etiqueta] : []);
        arr.forEach(function (e) { var n = String(e == null ? '' : e).trim(); if (n && !set[_mkNorm(n)]) { set[_mkNorm(n)] = 1; out.push(n); } });
      });
      return out.sort();
    }
    function harvestMarcos() {
      if (!state.marcoDoc.aberto) return state.marcoDoc.lista || [];
      var out = [];
      shadow.querySelectorAll('.pjmmk-row').forEach(function (row) {
        var g = function (sel) { var el = row.querySelector(sel); return el ? el.value : ''; };
        var ck = row.querySelector('.pjmmk-persist');
        out.push({ tipo: g('.pjmmk-tipo'), nome: (g('.pjmmk-nome') || '').trim(), etiqueta: g('.pjmmk-etq'), persistente: !!(ck && ck.checked), ativo: true });
      });
      state.marcoDoc.lista = out;
      return out;
    }
    function renderModalMarcos() {
      var lista = state.marcoDoc.lista || (state.marcoDoc.lista = []);
      var tipos = _marcoTipos(), etqs = _marcoEtiquetas();
      var optTipo = function (sel) {
        return '<option value="">-- qualquer tipo --</option>' + tipos.map(function (t) { return '<option value="' + esc(t.key) + '"' + (sel && _mkNorm(sel) === _mkNorm(t.key) ? ' selected' : '') + '>' + esc(t.label) + '</option>'; }).join('');
      };
      var optEtq = function (sel) {
        var has = false;
        var o = etqs.map(function (n) { var m2 = sel && _mkNorm(n) === _mkNorm(sel); if (m2) has = true; return '<option value="' + esc(n) + '"' + (m2 ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
        if (sel && !has) o = '<option value="' + esc(sel) + '" selected>' + esc(sel) + ' (fora das regras)</option>' + o;
        return '<option value="">-- escolha a etiqueta --</option>' + o;
      };
      var rows = lista.map(function (m, i) {
        return '<div class="pjmmk-row" style="display:grid;grid-template-columns:1fr 1.4fr 1.4fr auto 30px;gap:8px;align-items:center;padding:8px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;background:#fff">' +
          '<select class="pjmmk-tipo" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' + optTipo(m.tipo || '') + '</select>' +
          '<input type="text" class="pjmmk-nome" value="' + esc(m.nome || '') + '" placeholder="texto a conter (ex.: edital); vazio = qualquer" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' +
          '<select class="pjmmk-etq" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' + optEtq(m.etiqueta || '') + '</select>' +
          '<label title="Repor a etiqueta se ela for removida enquanto o marco existir (recuperacao de remocao acidental)" style="display:flex;align-items:center;justify-content:center;cursor:pointer"><input type="checkbox" class="pjmmk-persist"' + (m.persistente ? ' checked' : '') + '></label>' +
          '<button type="button" class="pjmmk-del" data-idx="' + i + '" title="Excluir regra" style="width:30px;height:28px;border:none;background:#fee2e2;color:#dc2626;border-radius:6px;cursor:pointer;font-size:16px">&times;</button>' +
        '</div>';
      }).join('') || '<div class="empty" style="padding:24px">Nenhuma regra. Clique em "+ Nova regra".</div>';
      var semEtq = !etqs.length ? '<div style="margin:0 20px 6px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:9px 13px;font-size:12px;color:#9a3412">Voce ainda nao tem etiquetas em <b>vincular etiqueta</b> (aba Etiquetas). Cadastre-as la para escolhe-las aqui.</div>' : '';
      return '<div style="position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:12;display:flex;align-items:center;justify-content:center;padding:20px" id="mkBackdrop">' +
        '<div style="background:#fff;border-radius:12px;max-width:820px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.3)">' +
          '<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px">' +
            '<h2 style="margin:0;font-size:16px;color:#1a5276;flex:1">Regras: marco -> etiqueta</h2>' +
            '<button class="ibtn" id="mkClose" title="Fechar" style="background:#e5e7eb;color:#374151;font-size:22px">&times;</button>' +
          '</div>' +
          '<div style="padding:12px 20px 6px;color:#6b7280;font-size:12px">Ao abrir os autos, se a arvore tiver um item do <strong>tipo</strong> escolhido cujo nome <strong>contenha</strong> o texto, a <strong>etiqueta</strong> e aplicada. Deixe o tipo em "qualquer" ou o texto vazio para casar de forma mais ampla.</div>' +
          semEtq +
          '<div style="display:grid;grid-template-columns:1fr 1.4fr 1.4fr auto 30px;gap:8px;padding:2px 20px 4px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em"><span>Tipo</span><span>Nome/descricao na arvore</span><span>Etiqueta a vincular</span><span>Repor</span><span></span></div>' +
          '<div style="flex:1;overflow-y:auto;padding:4px 20px 12px">' + rows + '</div>' +
          '<div style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
            '<button class="btn sec" id="mkNovo" style="font-size:12px">+ Nova regra</button>' +
            '<div style="display:flex;gap:8px"><button class="btn sec" id="mkCancel" style="font-size:12px">Cancelar</button><button class="btn" id="mkSalvar" style="font-size:13px">Salvar</button></div>' +
          '</div>' +
        '</div></div>';
    }
    function wireModalMarcos() {
      if (!state.marcoDoc.aberto) return;
      var fechar = function () { state.marcoDoc.aberto = false; render(); };
      var bk = $('mkBackdrop'); if (bk) bk.addEventListener('click', function (e) { if (e.target === bk) fechar(); });
      var xc = $('mkClose'); if (xc) xc.addEventListener('click', fechar);
      var cc = $('mkCancel'); if (cc) cc.addEventListener('click', fechar);
      var nv = $('mkNovo'); if (nv) nv.addEventListener('click', function () { harvestMarcos(); state.marcoDoc.lista.push({ tipo: '', nome: '', etiqueta: '', persistente: false, ativo: true }); render(); });
      shadow.querySelectorAll('.pjmmk-del').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.idx; harvestMarcos(); state.marcoDoc.lista.splice(i, 1); render(); }); });
      var sv = $('mkSalvar'); if (sv) sv.addEventListener('click', function () {
        var lista = harvestMarcos().filter(function (m) { return (m.etiqueta || '').trim() && ((m.tipo || '').trim() || (m.nome || '').trim()); }).map(function (m) { return { tipo: m.tipo, nome: m.nome, etiqueta: m.etiqueta, persistente: !!m.persistente, ativo: true }; });
        try { chrome.storage.local.set({ pjmMarcoRegras: lista }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
        state.marcoDoc.lista = lista; state.marcoDoc.aberto = false; render();
      });
    }

    function harvestKpis() {
      if (!state.kpiDoc.aberto) return state.kpiDoc.lista || [];
      var out = [];
      shadow.querySelectorAll('.pjmkp-row').forEach(function (row) {
        var g = function (sel) { var el = row.querySelector(sel); return el ? el.value : ''; };
        out.push({ nome: (g('.pjmkp-nome') || '').trim(), padrao: (g('.pjmkp-pad') || '').trim(), formato: g('.pjmkp-fmt') || 'card', cor: g('.pjmkp-cor') || '#7d3c98', alvo: g('.pjmkp-alvo'), ativo: true });
      });
      state.kpiDoc.lista = out; return out;
    }
    function renderModalKpis() {
      var lista = state.kpiDoc.lista || (state.kpiDoc.lista = []);
      var fmtOpts = function (sel) { return [['card','Card (número)'],['cobertura','Cobertura (%)'],['semaforo','Semáforo (limite)'],['meta','Meta (progresso)'],['barras','Barras (por valor)'],['funil','Funil (etapas)'],['rosca','Rosca (distribuição)'],['tabela','Tabela (lista)']].map(function (o) { return '<option value="' + o[0] + '"' + (sel === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); };
      var rows = lista.map(function (k, i) {
        return '<div class="pjmkp-row" style="display:grid;grid-template-columns:1fr 1.3fr 0.9fr 30px 54px auto;gap:8px;align-items:center;padding:8px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;background:#fff">' +
          '<input type="text" class="pjmkp-nome" value="' + esc(k.nome || '') + '" placeholder="nome do KPI" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' +
          '<input type="text" class="pjmkp-pad" value="' + esc(k.padrao || '') + '" placeholder="etiqueta, lista ou padrão — • coringa, ! exclui" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' +
          '<select class="pjmkp-fmt" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' + fmtOpts(k.formato || 'card') + '</select>' +
          '<input type="color" class="pjmkp-cor" value="' + esc(k.cor || '#7d3c98') + '" title="Cor do KPI" style="width:30px;height:28px;border:1px solid #d1d5db;border-radius:6px;padding:0;cursor:pointer">' +
          '<input type="number" class="pjmkp-alvo" value="' + (k.alvo != null && k.alvo !== '' ? k.alvo : '') + '" placeholder="—" title="Meta (formato Meta) ou Limite (Semaforo)" style="width:54px;padding:6px 6px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box">' +
          '<span style="display:inline-flex;gap:4px"><button type="button" class="pjmkp-star" data-idx="' + i + '" title="Salvar como preset" style="width:26px;height:28px;border:none;background:#f5eef8;color:#6c3483;border-radius:6px;cursor:pointer;font-size:13px">★</button><button type="button" class="pjmkp-del" data-idx="' + i + '" title="Excluir" style="width:26px;height:28px;border:none;background:#fee2e2;color:#dc2626;border-radius:6px;cursor:pointer;font-size:16px">&times;</button></span>' +
        '</div>';
      }).join('') || '<div class="empty" style="padding:24px">Nenhum KPI. Use um preset ou "+ Novo KPI".</div>';
      return '<div style="position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:12;display:flex;align-items:center;justify-content:center;padding:20px" id="kpBackdrop">' +
        '<div style="background:#fff;border-radius:12px;max-width:820px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.3)">' +
          '<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px"><h2 style="margin:0;font-size:16px;color:#1a5276;flex:1">Configurar KPIs (por etiqueta)</h2><button class="ibtn" id="kpClose" title="Fechar" style="background:#e5e7eb;color:#374151;font-size:22px">&times;</button></div>' +
          '<div style="padding:12px 20px 6px;color:#6b7280;font-size:12px">Cada KPI conta os processos com a(s) etiqueta(s). Pode ser <b>nome exato</b>, <b>padrão</b> com <b>•</b> (coringa) ou <b>lista</b> separada por vírgula. Use <code>!</code> antes de um termo para <b>excluir</b>. Ex.: <code>SePP - •, !SePP - Informação</code> = todos os SePP, menos a Informação.</div>' +
          '<div style="padding:2px 20px 8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;font-weight:700">Presets:</span>' + (state.kpiPresetDoc.lista||[]).map(function(pp,pi){ return '<button class="btn sec pjmkp-preset" data-pi="'+pi+'" style="font-size:11.5px">+ '+esc(pp.nome||pp.padrao)+'</button>'; }).join('') + '<button class="btn sec" id="kpEditarPresets" style="font-size:11.5px;color:#6c3483" title="Criar/editar presets">⚙ Editar presets</button></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1.3fr 0.9fr 30px 54px auto;gap:8px;padding:2px 20px 4px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em"><span>Nome</span><span>Conta as etiquetas</span><span>Formato</span><span>Cor</span><span>Meta/Lim.</span><span></span></div>' +
          '<div style="flex:1;overflow-y:auto;padding:4px 20px 12px">' + rows + '</div>' +
          '<div style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;gap:10px"><button class="btn sec" id="kpNovo" style="font-size:12px">+ Novo KPI</button><div style="display:flex;gap:8px"><button class="btn sec" id="kpCancel" style="font-size:12px">Cancelar</button><button class="btn" id="kpSalvar" style="font-size:13px">Salvar</button></div></div>' +
        '</div></div>';
    }
    function wireModalKpis() {
      if (!state.kpiDoc.aberto) return;
      var fechar = function () { state.kpiDoc.aberto = false; render(); };
      var bk = $('kpBackdrop'); if (bk) bk.addEventListener('click', function (e) { if (e.target === bk) fechar(); });
      var xc = $('kpClose'); if (xc) xc.addEventListener('click', fechar);
      var cc = $('kpCancel'); if (cc) cc.addEventListener('click', fechar);
      var nv = $('kpNovo'); if (nv) nv.addEventListener('click', function () { harvestKpis(); state.kpiDoc.lista.push({ nome: '', padrao: '', formato: 'card', ativo: true }); render(); });
      shadow.querySelectorAll('.pjmkp-preset').forEach(function (b) { b.addEventListener('click', function () { harvestKpis(); var pp = (state.kpiPresetDoc.lista || [])[+b.dataset.pi]; if (pp) state.kpiDoc.lista.push({ nome: pp.nome, padrao: pp.padrao, formato: pp.formato || 'card', ativo: true }); render(); }); });
      var ep = $('kpEditarPresets'); if (ep) ep.addEventListener('click', function () { harvestKpis(); state.kpiPresetDoc.aberto = true; render(); });
      shadow.querySelectorAll('.pjmkp-star').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.idx; harvestKpis(); var k = state.kpiDoc.lista[i]; if (k && (k.padrao || '').trim()) { if (!state.kpiPresetDoc.lista) state.kpiPresetDoc.lista = []; state.kpiPresetDoc.lista.push({ nome: k.nome || k.padrao, padrao: k.padrao, formato: k.formato || 'card' }); try { chrome.storage.local.set({ pjmKpiPresets: state.kpiPresetDoc.lista }); } catch (_) {} } render(); }); });
      shadow.querySelectorAll('.pjmkp-del').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.idx; harvestKpis(); state.kpiDoc.lista.splice(i, 1); render(); }); });
      var sv = $('kpSalvar'); if (sv) sv.addEventListener('click', function () {
        var lista = harvestKpis().filter(function (k) { return (k.padrao || '').trim(); }).map(function (k) { return { nome: k.nome || k.padrao, padrao: k.padrao, formato: k.formato || 'card', cor: k.cor || '#7d3c98', alvo: k.alvo, ativo: true }; });
        try { chrome.storage.local.set({ pjmKpiRegras: lista }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
        state.kpiDoc.lista = lista; state.kpiDoc.aberto = false; render();
      });
    }

    function harvestPresets() {
      if (!state.kpiPresetDoc.aberto) return state.kpiPresetDoc.lista || [];
      var out = [];
      shadow.querySelectorAll('.pjmpr-row').forEach(function (row) {
        var g = function (sel) { var el = row.querySelector(sel); return el ? el.value : ''; };
        out.push({ nome: (g('.pjmpr-nome') || '').trim(), padrao: (g('.pjmpr-pad') || '').trim(), formato: g('.pjmpr-fmt') || 'card' });
      });
      state.kpiPresetDoc.lista = out; return out;
    }
    function renderModalPresets() {
      var lista = state.kpiPresetDoc.lista || (state.kpiPresetDoc.lista = []);
      var fmtOpts = function (sel) { return [['card','Card (número)'],['cobertura','Cobertura (%)'],['semaforo','Semáforo (limite)'],['meta','Meta (progresso)'],['barras','Barras (por valor)'],['funil','Funil (etapas)'],['rosca','Rosca (distribuição)'],['tabela','Tabela (lista)']].map(function (o) { return '<option value="' + o[0] + '"' + (sel === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); };
      var rows = lista.map(function (k, i) {
        return '<div class="pjmpr-row" style="display:grid;grid-template-columns:1.1fr 1.5fr 1fr 30px;gap:8px;align-items:center;padding:8px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;background:#fff">' +
          '<input type="text" class="pjmpr-nome" value="' + esc(k.nome || '') + '" placeholder="nome do preset" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' +
          '<input type="text" class="pjmpr-pad" value="' + esc(k.padrao || '') + '" placeholder="padrao (ex.: SePP - •)" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' +
          '<select class="pjmpr-fmt" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit">' + fmtOpts(k.formato || 'card') + '</select>' +
          '<button type="button" class="pjmpr-del" data-idx="' + i + '" title="Excluir" style="width:30px;height:28px;border:none;background:#fee2e2;color:#dc2626;border-radius:6px;cursor:pointer;font-size:16px">&times;</button>' +
        '</div>';
      }).join('') || '<div class="empty" style="padding:24px">Nenhum preset. Clique em "+ Novo preset".</div>';
      return '<div style="position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:13;display:flex;align-items:center;justify-content:center;padding:20px" id="prBackdrop">' +
        '<div style="background:#fff;border-radius:12px;max-width:760px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.3)">' +
          '<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px"><h2 style="margin:0;font-size:16px;color:#6c3483;flex:1">Editar presets de KPI</h2><button class="ibtn" id="prClose" title="Fechar" style="background:#e5e7eb;color:#374151;font-size:22px">&times;</button></div>' +
          '<div style="padding:12px 20px 6px;color:#6b7280;font-size:12px">Presets sao atalhos reutilizaveis — aparecem como botoes no configurador de KPIs.</div>' +
          '<div style="display:grid;grid-template-columns:1.1fr 1.5fr 1fr 30px;gap:8px;padding:2px 20px 4px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em"><span>Nome</span><span>Padrao</span><span>Formato</span><span></span></div>' +
          '<div style="flex:1;overflow-y:auto;padding:4px 20px 12px">' + rows + '</div>' +
          '<div style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;gap:10px"><button class="btn sec" id="prNovo" style="font-size:12px">+ Novo preset</button><div style="display:flex;gap:8px"><button class="btn sec" id="prCancel" style="font-size:12px">Cancelar</button><button class="btn" id="prSalvar" style="font-size:13px">Salvar</button></div></div>' +
        '</div></div>';
    }
    function wireModalPresets() {
      if (!state.kpiPresetDoc.aberto) return;
      var fechar = function () { state.kpiPresetDoc.aberto = false; render(); };
      var bk = $('prBackdrop'); if (bk) bk.addEventListener('click', function (e) { if (e.target === bk) fechar(); });
      var xc = $('prClose'); if (xc) xc.addEventListener('click', fechar);
      var cc = $('prCancel'); if (cc) cc.addEventListener('click', fechar);
      var nv = $('prNovo'); if (nv) nv.addEventListener('click', function () { harvestPresets(); state.kpiPresetDoc.lista.push({ nome: '', padrao: '', formato: 'card' }); render(); });
      shadow.querySelectorAll('.pjmpr-del').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.idx; harvestPresets(); state.kpiPresetDoc.lista.splice(i, 1); render(); }); });
      var sv = $('prSalvar'); if (sv) sv.addEventListener('click', function () {
        var lista = harvestPresets().filter(function (k) { return (k.padrao || '').trim(); }).map(function (k) { return { nome: k.nome || k.padrao, padrao: k.padrao, formato: k.formato || 'card' }; });
        try { chrome.storage.local.set({ pjmKpiPresets: lista }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
        state.kpiPresetDoc.lista = lista; state.kpiPresetDoc.aberto = false; render();
      });
    }


    // ── Atalhos de extensões: escolhe quais extensões viram botão na barra ────
    function renderModalAtalhos() {
      var s = state.extAtalhos;
      var escolhidos = {}; (s.escolhidos || []).forEach(function(e) { escolhidos[e.id] = true; });
      var corpo;
      if (s.carregando || s.lista === null) {
        corpo = '<div class="center" style="padding:40px"><div class="spin"></div><div style="color:#6b7280">Carregando extensões instaladas…</div></div>';
      } else if (!s.lista.length) {
        corpo = '<div class="empty" style="padding:30px">Nenhuma outra extensão encontrada.</div>';
      } else {
        corpo = s.lista.map(function(e) {
          var na = !!escolhidos[e.id];
          var meta = (e.enabled ? 'Ativa' : 'Inativa') + (e.mayDisable ? '' : ' · não pode ligar/desligar');
          var ico = '<div style="width:28px;height:28px;border-radius:6px;background:#e6f1fb;color:#0c447c;display:flex;align-items:center;justify-content:center;flex:none;font-size:15px">🧩</div>';
          var ctrl = e.mayDisable
            ? '<button class="pjm-atl-sw" data-atl-id="' + esc(e.id) + '" data-atl-nome="' + esc(e.name) + '" role="switch" aria-checked="' + (na ? 'true' : 'false') + '" title="Mostrar na barra" style="position:relative;width:38px;height:22px;border-radius:12px;border:none;cursor:pointer;flex:none;padding:0;background:' + (na ? '#22c55e' : '#cbd5e1') + '"><span style="position:absolute;top:2px;left:' + (na ? '18px' : '2px') + ';width:18px;height:18px;border-radius:50%;background:#fff"></span></button>'
            : '<span style="font-size:15px;color:#cbd5e1" title="Travada por política">🔒</span>';
          return '<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:7px">' +
            ico +
            '<div style="flex:1;min-width:0"><div style="font-size:13px;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(e.name) + '</div>' +
            '<div style="font-size:11px;color:#94a3b8">' + esc(meta) + '</div></div>' + ctrl + '</div>';
        }).join('');
      }
      return '<div style="position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:12;display:flex;align-items:center;justify-content:center;padding:20px" id="atlBackdrop">' +
        '<div style="background:#fff;border-radius:12px;max-width:620px;width:100%;max-height:86vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.3)">' +
          '<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px">' +
            '<h2 style="margin:0;font-size:16px;color:#1a5276;flex:1">🧩 Atalhos de extensões</h2>' +
            '<button class="btn sec" id="atlReload" style="font-size:12px">↻ Atualizar</button>' +
            '<button class="ibtn" id="atlClose" title="Fechar" style="background:#e5e7eb;color:#374151;font-size:22px">×</button>' +
          '</div>' +
          '<div style="padding:10px 20px 4px;color:#6b7280;font-size:12px">Ligue o botão para a extensão aparecer na barra dos autos. Ao clicar nela, o MapeamentoJE pede para a extensão abrir o painel (ela precisa suportar isso e estar ativa).</div>' +
          '<div style="flex:1;overflow-y:auto;padding:12px 20px 16px">' + corpo + '</div>' +
        '</div></div>';
    }
    function wireModalAtalhos() {
      if (!state.extAtalhos.aberto) return;
      var s = state.extAtalhos;
      if (s.lista === null && !s.carregando) {
        s.carregando = true;
        try {
          chrome.runtime.sendMessage({ type: 'PJM_EXT_LIST' }, function(resp) {
            s.carregando = false;
            s.lista = (resp && resp.ok && resp.exts) ? resp.exts : [];
            render();
          });
        } catch (e) { s.carregando = false; s.lista = []; render(); }
      }
      var fechar = function() { state.extAtalhos.aberto = false; render(); };
      var bk = $('atlBackdrop'); if (bk) bk.addEventListener('click', function(e) { if (e.target === bk) fechar(); });
      var xc = $('atlClose'); if (xc) xc.addEventListener('click', fechar);
      var rl = $('atlReload'); if (rl) rl.addEventListener('click', function() { state.extAtalhos.lista = null; render(); });
      shadow.querySelectorAll('.pjm-atl-sw').forEach(function(b) {
        b.addEventListener('click', function() {
          var id = b.getAttribute('data-atl-id'), nome = b.getAttribute('data-atl-nome');
          var arr = state.extAtalhos.escolhidos || (state.extAtalhos.escolhidos = []);
          var idx = -1; arr.forEach(function(e, i) { if (e.id === id) idx = i; });
          if (idx >= 0) arr.splice(idx, 1); else arr.push({ id: id, name: nome });
          try { chrome.storage.local.set({ pjmExtAtalhos: { version: 1, exts: state.extAtalhos.escolhidos } }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          render();
        });
      });
    }

    function renderProg() {
      var p = state.prog;
      var pct = p.total > 0 ? Math.round(p.step/p.total*100) : 0;
      return '<div class="prog"><h2>🔄 Coleta em andamento</h2>' +
        '<div class="prog-msg" id="pMsg">' + esc(p.msg || 'Iniciando...') + '</div>' +
        '<div class="prog-bar"><div class="prog-fl" id="pFl" style="width:' + pct + '%"></div></div>' +
        '<div style="display:flex;justify-content:space-between;color:#6b7280;font-size:12px;margin-bottom:20px">' +
        '<span>' + (p.total > 0 ? 'Tarefa ' + p.step + ' de ' + p.total : 'Preparando...') + '</span><span>' + pct + '%</span></div>' +
        '<div class="prog-log" id="pLog">' + p.log.map(function(l){return '<div class="'+(l.cls||'')+'">'+esc(l.txt)+'</div>';}).join('') + '</div>' +
        '<div style="text-align:right"><button class="btn dng" id="bCanc">✖ Cancelar</button></div></div>';
    }

    // Chave única que distingue tarefa de mesmo nome em cards diferentes
    function chaveTarefa(t) { return (t.nome || '') + '|' + (t.tipoCard || ''); }

    function renderModalTarefas() {
      var sel = state.tarefasSel;
      var blockSet = new Set(sel.bloquear);
      var msgVazio = '';
      if (sel.carregando) {
        msgVazio = '<div class="center" style="padding:40px"><div class="spin"></div><div style="color:#6b7280">Carregando lista de tarefas...</div></div>';
      } else if (!sel.lista.length) {
        msgVazio = '<div class="empty" style="padding:30px">Nenhuma tarefa carregada. Clique em "Atualizar" para listar as tarefas do dashboard.</div>';
      }

      var listaHtml = sel.lista.map(function(t, i) {
        var bloqueada = blockSet.has(chaveTarefa(t));
        var marcado = !bloqueada;
        var corTipo = t.tipoCard === 'minhas' ? '#1a5276' : (t.tipoCard === 'gerais' ? '#8e44ad' : '#047857');
        var labelTipo = t.tipoCard === 'minhas' ? 'Minhas' : (t.tipoCard === 'gerais' ? 'Gerais' : 'Assin.');
        return '<label class="check" style="margin-bottom:4px">' +
          '<input type="checkbox" data-modal-idx="' + i + '"' + (marcado ? ' checked' : '') + '>' +
          '<div style="flex:1;display:flex;justify-content:space-between;align-items:center">' +
            '<div><div class="lbl">' + esc(t.nome) + '</div>' +
            '<div class="ds"><span style="color:' + corTipo + ';font-weight:600">' + labelTipo + '</span> · ' + t.quantidade + ' processo(s)</div></div>' +
          '</div></label>';
      }).join('');

      var marcadas = sel.lista.filter(function(t){ return !blockSet.has(chaveTarefa(t)); }).length;
      var totalProcs = sel.lista.filter(function(t){ return !blockSet.has(chaveTarefa(t)); }).reduce(function(a,t){ return a + (t.quantidade||0); }, 0);

      return '<div style="position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:10;display:flex;align-items:center;justify-content:center;padding:20px" id="modalBackdrop">' +
        '<div style="background:#fff;border-radius:12px;max-width:760px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.3)" id="modalCorpo">' +
          '<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px">' +
            '<h2 style="margin:0;font-size:16px;color:#1a5276;flex:1">📋 Selecionar tarefas para capturar</h2>' +
            '<button class="ibtn" id="modalClose" title="Fechar" style="background:#e5e7eb;color:#374151;font-size:22px">×</button>' +
          '</div>' +
          '<div style="padding:12px 20px;background:#f9fafb;border-bottom:1px solid #e5e7eb;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            '<input id="modalBusca" type="text" placeholder="🔍 Filtrar tarefas..." style="flex:1;min-width:180px;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">' +
            '<button class="btn sec" id="modalTodas" style="font-size:12px">✓ Todas</button>' +
            '<button class="btn sec" id="modalNenhuma" style="font-size:12px">✗ Nenhuma</button>' +
            '<button class="btn sec" id="modalRefresh" style="font-size:12px">↻ Atualizar</button>' +
          '</div>' +
          '<div style="flex:1;overflow-y:auto;padding:16px 20px" id="modalLista">' +
            (msgVazio || listaHtml) +
          '</div>' +
          '<div style="padding:12px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">' +
            '<div style="color:#6b7280;font-size:13px">' +
              (sel.lista.length ? '<strong>' + marcadas + '</strong> de ' + sel.lista.length + ' tarefa(s) marcadas · ~<strong>' + totalProcs + '</strong> processo(s)' : '') +
            '</div>' +
            '<div style="display:flex;gap:8px">' +
              '<button class="btn sec" id="modalCancel">Cancelar</button>' +
              '<button class="btn" id="modalSalvar">💾 Salvar seleção</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    // Re-renderiza so a area de etiquetas (preserva foco do input do filtro)
    function filtrarEtiquetasNoDOM() {
      var r = state.resultado;
      if (!r) return;
      var etqs = (r.resumo && r.resumo.porEtiqueta) || {};
      var filtro = (state.filtroEtiqueta || '').toLowerCase();
      var etqsFiltrados = Object.fromEntries(
        Object.entries(etqs).filter(function(e) {
          if (!filtro) return true;
          return e[0].toLowerCase().indexOf(filtro) >= 0;
        })
      );
      var es = Object.entries(etqsFiltrados).sort(function(a,b){return b[1]-a[1];});
      var max = Math.max.apply(null, es.map(function(e){return e[1];}).concat([1]));

      // Procura a section de etiquetas (a .sec com 'Etiquetas' no h2)
      var secs = shadow.querySelectorAll('.sec');
      var secEtq = null;
      for (var i = 0; i < secs.length; i++) {
        var h2 = secs[i].querySelector('h2');
        if (h2 && h2.textContent.indexOf('Etiquetas') >= 0) { secEtq = secs[i]; break; }
      }
      if (!secEtq) return;

      // Atualiza contador
      var infoSpan = secEtq.querySelector('h2 span');
      if (infoSpan) {
        var totalEtqs = Object.keys(etqs).length;
        var totalFiltrados = es.length;
        infoSpan.textContent = filtro
          ? totalFiltrados + ' de ' + totalEtqs
          : totalEtqs + ' total';
      }

      // Layout Opcao C: atualiza chips dentro de #pjm-etq-chips-area
      var chipsArea = shadow.getElementById('pjm-etq-chips-area');
      if (chipsArea) {
        var etqMax = es.length ? es[0][1] : 1;
        var corpo;
        if (!es.length) {
          corpo = '<div class="empty" style="padding:20px">Nenhuma etiqueta corresponde ao filtro</div>';
        } else {
          corpo = es.map(function(e) {
            var destaque = e[1] >= etqMax * 0.5;
            var bg  = destaque ? '#ede9fe' : '#eef2ff';
            var cor = destaque ? '#3b0764' : '#4338ca';
            var brd = destaque ? '#c4b5fd' : '#c7d2fe';
            var fw  = destaque ? '600' : '400';
            return '<span class="pjm-etq-chip" data-etq="' + esc(e[0]) + '" ' +
              'title="Clique para filtrar em Processos" ' +
              'style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;' +
              'background:' + bg + ';color:' + cor + ';border:1px solid ' + brd + ';' +
              'font-size:12px;font-weight:' + fw + ';margin:2px;cursor:pointer">' +
              esc(e[0]) + ' <span style="opacity:0.65;font-size:11px">(' + e[1] + ')</span></span>';
          }).join('');
        }
        chipsArea.innerHTML = corpo;
        // Re-anexa handlers de clique nos novos chips
        chipsArea.querySelectorAll('.pjm-etq-chip').forEach(function(chip) {
          chip.addEventListener('click', function() {
            var etq = chip.dataset.etq;
            if (!etq) return;
            if (!state.filtroCombinado.etiquetas) state.filtroCombinado.etiquetas = [];
            if (state.filtroCombinado.etiquetas.indexOf(etq) < 0) {
              state.filtroCombinado.etiquetas.push(etq);
            }
            state.tab = 'processos';
            render();
          });
        });
      } else {
        // Fallback: layout antigo com bar-rows
        var antigas = secEtq.querySelectorAll('.bar-row, .empty');
        antigas.forEach(function(el) { el.remove(); });
        var barCorpo;
        if (!es.length) {
          barCorpo = '<div class="empty" style="padding:20px">Nenhuma etiqueta corresponde ao filtro</div>';
        } else {
          barCorpo = es.map(function(e) {
            var pct = Math.max(2, Math.round(e[1]/max*100));
            return '<div class="bar-row"><div class="bar-nm">' + esc(e[0]) + '</div>' +
              '<div class="bar-tr"><div class="bar-fl etq" style="width:' + pct + '%"></div></div>' +
              '<div class="bar-ct">' + e[1] + '</div></div>';
          }).join('');
        }
        secEtq.insertAdjacentHTML('beforeend', barCorpo);
      }

      // Mostra/oculta botao Limpar conforme tem filtro
      var btnLimpar = $('filtroEtqLimpar');
      if (filtro && !btnLimpar) {
        var ctrlsDiv = secEtq.querySelector('h2').parentElement.querySelector('div:last-child');
        if (ctrlsDiv) {
          ctrlsDiv.insertAdjacentHTML('beforeend', '<button class="btn sec" id="filtroEtqLimpar" style="font-size:11px;padding:4px 8px">Limpar</button>');
          var novoBtn = $('filtroEtqLimpar');
          if (novoBtn) {
            novoBtn.addEventListener('click', function() {
              state.filtroEtiqueta = '';
              render();
            });
          }
        }
      } else if (!filtro && btnLimpar) {
        btnLimpar.remove();
      }
    }

    // Copia para o clipboard a tabela de etiquetas filtradas em TSV,
    // pronta para colar no Google Sheets / Excel.
    function copiarEtiquetasComoTSV(btn) {
      var r = state.resultado;
      if (!r) return;
      var etqs = (r.resumo && r.resumo.porEtiqueta) || {};
      var filtro = (state.filtroEtiqueta || '').toLowerCase();
      var entradas = Object.entries(etqs)
        .filter(function(e) { return !filtro || e[0].toLowerCase().indexOf(filtro) >= 0; })
        .sort(function(a, b) { return b[1] - a[1]; });

      var total = (r.resumo && r.resumo.totalProcessos) || getProcs().length;
      var linhas = ['Etiqueta\tProcessos\t% sobre total de processos'];
      entradas.forEach(function(e) {
        var pct = total > 0 ? ((e[1] / total) * 100).toFixed(1).replace('.', ',') + '%' : '0%';
        linhas.push(e[0] + '\t' + e[1] + '\t' + pct);
      });
      var tsv = linhas.join('\n');

      function feedback(ok) {
        if (!btn) return;
        var orig = btn.textContent;
        btn.textContent = ok ? '✓ Copiado' : '✗ Falhou';
        btn.disabled = true;
        setTimeout(function() { btn.textContent = orig; btn.disabled = false; }, 1800);
      }

      // Tenta primeiro a API moderna do clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tsv).then(function() {
          feedback(true);
        }).catch(function(err) {
          console.warn('[PJeOverlay] Clipboard API falhou, tentando fallback:', err);
          fallbackCopy();
        });
      } else {
        fallbackCopy();
      }

      function fallbackCopy() {
        try {
          var ta = document.createElement('textarea');
          ta.value = tsv;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          feedback(ok);
        } catch (e) {
          console.error('[PJeOverlay] Fallback de copy falhou:', e);
          feedback(false);
        }
      }
    }

    // Atualiza so as sugestoes do filtro combinado (preserva foco do input)
    function atualizarSugestoesEtqNoDOM() {
      var todos = getProcs();
      if (!todos.length) return;
      var contEtq = {};
      todos.forEach(function(p) {
        (p.etiquetas||[]).forEach(function(e) { contEtq[e] = (contEtq[e]||0) + 1; });
      });
      var todasEtqs = Object.entries(contEtq).sort(function(a, b) { return b[1] - a[1]; });
      var combSet = new Set((state.filtroCombinado.etiquetas || []).map(function(x){ return x.toLowerCase(); }));
      var qb = (state.sugestaoEtq || '').toLowerCase();
      var sugestoes = qb
        ? todasEtqs.filter(function(e) {
            return !combSet.has(e[0].toLowerCase()) && e[0].toLowerCase().indexOf(qb) >= 0;
          }).slice(0, 8)
        : [];

      var sugList = $('pjmSugList');
      var html = sugestoes.map(function(e) {
        return '<button class="pjm-sug-etq" data-etq="' + esc(e[0]) + '" style="padding:3px 8px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:12px;font-size:11px;cursor:pointer">+ ' + esc(e[0]) + ' <span style="color:#6b7280">(' + e[1] + ')</span></button>';
      }).join('');

      if (sugList) {
        if (!sugestoes.length) { sugList.remove(); return; }
        sugList.innerHTML = html;
      } else if (sugestoes.length) {
        var input = $('pjmSugInput');
        if (input) {
          input.parentElement.insertAdjacentHTML('afterend', '<div id="pjmSugList" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">' + html + '</div>');
        }
      }

      // Religa handlers dos botoes de sugestao
      shadow.querySelectorAll('.pjm-sug-etq').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var etq = btn.dataset.etq;
          if (!etq) return;
          if (state.filtroCombinado.etiquetas.indexOf(etq) < 0) {
            state.filtroCombinado.etiquetas.push(etq);
          }
          state.sugestaoEtq = '';
          state.pagina = 1;
          render();
        });
      });
    }

    // Copia para o clipboard a lista atual de processos filtrados em TSV,
    // pronto para colar no Google Sheets / Excel.
    // Aplica TODOS os filtros ativos: busca, tarefa, categoria e combinado de etiquetas.
    function copiarProcessosFiltradosTSV(btn) {
      var todos = getProcs();
      if (!todos.length) return;
      var combinadas = (state.filtroCombinado && state.filtroCombinado.etiquetas) || [];
      var modoComb = (state.filtroCombinado && state.filtroCombinado.modo) || 'and';

      var filtrados = todos.filter(function(p) {
        if (state.filtroCategoria && p.categoria !== state.filtroCategoria) return false;
        if (state.filtroTarefa && p.tarefa !== state.filtroTarefa) return false;
        if (state.busca) {
          var t = (String(p.numero||'') + ' ' + String(p.tarefa||'') + ' ' + String(p.fase||'') + ' ' + String(p.subfase||'') + ' ' + (p.etiquetas||[]).join(' ')).toLowerCase();
          if (t.indexOf(state.busca.toLowerCase()) < 0) return false;
        }
        if (combinadas.length) {
          var setEtq = new Set((p.etiquetas||[]).map(function(x){ return x.toLowerCase(); }));
          if (modoComb === 'and') {
            for (var i = 0; i < combinadas.length; i++) {
              if (!setEtq.has(combinadas[i].toLowerCase())) return false;
            }
          } else {
            var temAlguma = false;
            for (var j = 0; j < combinadas.length; j++) {
              if (setEtq.has(combinadas[j].toLowerCase())) { temAlguma = true; break; }
            }
            if (!temAlguma) return false;
          }
        }
        return true;
      });

      var sanitiza = function(s) { return String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim(); };
      var linhas = ['Número CNJ\tTarefa\tFase\tSubfase\tCategoria\tEtiquetas'];
      filtrados.forEach(function(p) {
        var etqs = (p.etiquetas || []).join('; ');
        linhas.push([
          sanitiza(p.numero),
          sanitiza(p.tarefa),
          sanitiza(p.fase),
          sanitiza(p.subfase),
          sanitiza(p.categoria),
          sanitiza(etqs),
        ].join('\t'));
      });
      var tsv = linhas.join('\n');

      function feedback(ok, qtd) {
        if (!btn) return;
        var orig = btn.textContent;
        btn.textContent = ok ? '✓ ' + qtd + ' linhas' : '✗ Falhou';
        btn.disabled = true;
        setTimeout(function() { btn.textContent = orig; btn.disabled = false; }, 1800);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tsv).then(function() {
          feedback(true, filtrados.length);
        }).catch(function(err) {
          console.warn('[PJeOverlay] Clipboard API falhou:', err);
          fallback();
        });
      } else {
        fallback();
      }

      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = tsv;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          feedback(ok, filtrados.length);
        } catch (e) {
          console.error('[PJeOverlay] Fallback de copy falhou:', e);
          feedback(false, 0);
        }
      }
    }

    // ── Aba Juntada CoPPEx ────────────────────────────────────────────

    // Helpers de atos por processo (Opção B)
    function _cnjDigits(cnj) { return String(cnj == null ? '' : cnj).replace(/[^0-9]/g, ''); }
    function getAtoProcesso(cnj) {
      var d = _cnjDigits(cnj);
      return (d && state.juntadaPorProcesso && state.juntadaPorProcesso[d]) || null;
    }
    function salvarAtoProcesso(cnj, ato) {
      var d = _cnjDigits(cnj);
      if (!d) return;
      if (!state.juntadaPorProcesso) state.juntadaPorProcesso = {};
      state.juntadaPorProcesso[d] = ato;
      try { chrome.storage.local.set({ juntadaPorProcesso: state.juntadaPorProcesso }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
    }
    function removerAtoProcesso(cnj) {
      var d = _cnjDigits(cnj);
      if (state.juntadaPorProcesso && state.juntadaPorProcesso[d]) {
        delete state.juntadaPorProcesso[d];
        try { chrome.storage.local.set({ juntadaPorProcesso: state.juntadaPorProcesso }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
      }
    }

    // ── Catálogo editável de modelos (passo 5) ──────────────────────────
    // Modelo: { id, materia, fase, nome, descricao }. materia/fase podem ser
    // vazios → modelo genérico (aparece em qualquer matéria/fase).
    function _catId() {
      return 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }
    function _normClasse(s) { return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); }
    function _semearCatalogo() {
      var modelos = [];
      if (typeof BANCO_MODELOS_COPPEX !== 'undefined') {
        Object.keys(BANCO_MODELOS_COPPEX).forEach(function(materia) {
          var fases = BANCO_MODELOS_COPPEX[materia] || {};
          Object.keys(fases).forEach(function(fase) {
            (fases[fase] || []).forEach(function(nome) {
              var desc = (typeof DESCRICOES_COPPEX !== 'undefined' && DESCRICOES_COPPEX[nome]) ? DESCRICOES_COPPEX[nome] : '';
              modelos.push({ id: _catId(), materia: materia, fase: fase, nome: nome, descricao: desc, classes: [] });
            });
          });
        });
      }
      return { version: 1, modelos: modelos };
    }
    function catModelos() {
      return (state.juntadaCatalogo && Array.isArray(state.juntadaCatalogo.modelos)) ? state.juntadaCatalogo.modelos : [];
    }
    function _catCabecalho() {
      var th = 'font-size:10px;color:#8b949e;font-weight:600;letter-spacing:.04em;text-transform:uppercase';
      return '<div style="display:flex;align-items:center;gap:10px;padding:6px 11px;border-bottom:1px solid #e5eaef;background:#fafbfc">' +
        '<span style="flex:1;min-width:0;' + th + '">Modelo</span>' +
        '<span style="width:190px;' + th + '">Classe</span>' +
        '<span style="width:120px;' + th + '">Fase</span>' +
        '<span style="width:62px;text-align:right;' + th + '">Ações</span>' +
      '</div>';
    }
    function catSave() {
      if (!state.juntadaCatalogo) state.juntadaCatalogo = { version: 1, modelos: [] };
      try { chrome.storage.local.set({ juntadaCatalogo: state.juntadaCatalogo }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
    }
    function catMaterias() {
      var set = {};
      catModelos().forEach(function(m) { if (m.materia) set[m.materia] = 1; });
      return Object.keys(set).sort();
    }
    function catFases(materia) {
      var set = {};
      catModelos().forEach(function(m) {
        if (m.fase && (!m.materia || m.materia === materia)) set[m.fase] = 1;
      });
      return Object.keys(set).sort();
    }
    // Entradas aplicáveis a (materia, fase): match exato OU genérico (campo vazio)
    // Filtro estrito (alinhado ao popover dos autos): quando matéria/fase estão
    // escolhidas, exige igualdade — genéricos só aparecem com o campo em branco.
    // Classe do processo por CNJ (cache pjmClassePorCnj + fallback na coleta).
    function _classeDeCnj(cnj) {
      var dig = String(cnj || '').replace(/\D/g, '');
      if (!dig) return null;
      var cc = state.classePorCnj || {};
      if (cc[dig] && cc[dig].nome) return { nome: cc[dig].nome, codigo: cc[dig].codigo || '' };
      var ts = (state.resultado && state.resultado.tarefas) || [];
      for (var i = 0; i < ts.length; i++) {
        var ps = ts[i].processos || [];
        for (var j = 0; j < ps.length; j++) {
          var pp = ps[j];
          if (String(pp.numero || pp.numeroProcesso || '').replace(/\D/g, '') === dig && pp.classe) return { nome: pp.classe, codigo: pp.classeCodigo || '' };
        }
      }
      return null;
    }
    // Mesmo criterio do juntada.js: so os modelos marcados para a classe. Conservador:
    // sem classe conhecida -> nao filtra; classe sem nenhum modelo marcado -> mostra todos.
    function _filtrarPorClasse(modelos, cls) {
      if (!cls || !cls.nome) return modelos;
      var temClasses = modelos.some(function (m) { return m && m.classes && m.classes.length; });
      if (!temClasses) return modelos;
      var alvo = _mkNorm(cls.nome), cod = String(cls.codigo || '');
      var casa = function (m) { return (m.classes || []).some(function (c) { return (cod && String(c.codigo || '') === cod) || _mkNorm(c.nome) === alvo; }); };
      var daClasse = modelos.filter(function (m) { return m && m.nome && casa(m); });
      return daClasse.length ? daClasse : modelos;
    }
    function _classeComumDeCnjs(cnjs) {
      var comum = null;
      for (var i = 0; i < (cnjs || []).length; i++) {
        var c = _classeDeCnj(cnjs[i]);
        if (!c || !c.nome) return null;
        if (comum === null) comum = c;
        else if (_mkNorm(comum.nome) !== _mkNorm(c.nome)) return null;
      }
      return comum;
    }
    function _materiaDaClasse(cls) {
      if (!cls || !cls.nome) return '';
      var alvo = _mkNorm(cls.nome), cod = String(cls.codigo || ''), mats = {};
      catModelos().forEach(function (m) {
        if (!m.materia || !m.classes || !m.classes.length) return;
        if (m.classes.some(function (c) { return (cod && String(c.codigo || '') === cod) || _mkNorm(c.nome) === alvo; })) mats[m.materia] = 1;
      });
      var ks = Object.keys(mats);
      return ks.length === 1 ? ks[0] : '';
    }
    function catModelosFor(materia, fase) {
      return catModelos().filter(function(m) {
        var okMat = materia ? (m.materia === materia) : true;
        var okFase = fase ? (m.fase === fase) : true;
        return okMat && okFase;
      });
    }
    function _materiaDaFase(fase) {
      var achou = '';
      catModelos().forEach(function(m) { if (!achou && m.fase === fase && m.materia) achou = m.materia; });
      return achou;
    }
    function _materiaDoModelo(nome) {
      var achou = '';
      catModelos().forEach(function(m) { if (!achou && m.nome === nome && m.materia) achou = m.materia; });
      return achou;
    }
    function catDescricao(nome) {
      var found = '';
      catModelos().some(function(m) { if (m.nome === nome) { found = m.descricao || ''; return true; } return false; });
      return found;
    }
    function catAdd(dados) {
      if (!state.juntadaCatalogo) state.juntadaCatalogo = { version: 1, modelos: [] };
      state.juntadaCatalogo.modelos.push({
        id: _catId(),
        materia: (dados.materia || '').trim(),
        fase: (dados.fase || '').trim(),
        nome: (dados.nome || '').trim(),
        descricao: (dados.descricao || '').trim(),
        classes: Array.isArray(dados.classes) ? dados.classes.slice() : []
      });
      catSave();
    }
    function catUpdate(id, dados) {
      catModelos().forEach(function(m) {
        if (m.id === id) {
          m.materia   = (dados.materia || '').trim();
          m.fase      = (dados.fase || '').trim();
          m.nome      = (dados.nome || '').trim();
          m.descricao = (dados.descricao || '').trim();
          m.classes   = Array.isArray(dados.classes) ? dados.classes.slice() : (m.classes || []);
        }
      });
      catSave();
    }
    function catRemove(id) {
      if (!state.juntadaCatalogo) return;
      state.juntadaCatalogo.modelos = catModelos().filter(function(m) { return m.id !== id; });
      catSave();
    }

    // ── Exportar / Importar catálogo (passo 5 — Etapa 2) ────────────────
    function catExportar() {
      var envelope = {
        tipo: 'pje-mapeador-catalogo-juntada',
        version: 1,
        exportadoEm: new Date().toISOString(),
        modelos: catModelos().map(function(m) {
          return { materia: m.materia || '', fase: m.fase || '', nome: m.nome || '', descricao: m.descricao || '' };
        })
      };
      try {
        var blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var dt = new Date();
        var stamp = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'catalogo-juntada-pje-' + stamp + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { try { URL.revokeObjectURL(url); a.remove(); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); } }, 1500);
      } catch (e) {
        alert('Falha ao exportar: ' + (e && e.message ? e.message : e));
      }
    }

    function catImportarArquivo(file) {
      var reader = new FileReader();
      reader.onload = function() {
        var dados;
        try { dados = JSON.parse(reader.result); }
        catch (e) { alert('Arquivo inválido: não é um JSON válido.'); return; }
        var arr = Array.isArray(dados) ? dados : (dados && Array.isArray(dados.modelos) ? dados.modelos : null);
        if (!arr) { alert('Arquivo inválido: não contém uma lista de modelos.'); return; }
        var modelos = arr.filter(function(m) { return m && String(m.nome || '').trim(); }).map(function(m) {
          return {
            materia:   String(m.materia   || '').trim(),
            fase:      String(m.fase      || '').trim(),
            nome:      String(m.nome      || '').trim(),
            descricao: String(m.descricao || '').trim()
          };
        });
        if (modelos.length === 0) { alert('Nenhum modelo válido encontrado no arquivo.'); return; }
        state.catImport = { modelos: modelos, nome: file.name || '' };
        render();
      };
      reader.onerror = function() { alert('Não foi possível ler o arquivo.'); };
      reader.readAsText(file);
    }

    function catAplicarImport(modo) {
      if (!state.catImport) return;
      var importados = state.catImport.modelos || [];
      if (!state.juntadaCatalogo) state.juntadaCatalogo = { version: 1, modelos: [] };

      if (modo === 'substituir') {
        state.juntadaCatalogo.modelos = importados.map(function(m) {
          return { id: _catId(), materia: m.materia, fase: m.fase, nome: m.nome, descricao: m.descricao };
        });
      } else { // mesclar: atualiza descrição de existentes (mesma materia|fase|nome) e adiciona novos
        var atuais = catModelos();
        var chave = function(m) { return (m.materia || '') + '|' + (m.fase || '') + '|' + (m.nome || ''); };
        var indice = {};
        atuais.forEach(function(m) { indice[chave(m)] = m; });
        importados.forEach(function(m) {
          var k = chave(m);
          if (indice[k]) {
            indice[k].descricao = m.descricao;
          } else {
            var novo = { id: _catId(), materia: m.materia, fase: m.fase, nome: m.nome, descricao: m.descricao };
            atuais.push(novo);
            indice[k] = novo;
          }
        });
        state.juntadaCatalogo.modelos = atuais;
      }
      catSave();
      state.catImport = null;
      state.catForm = null;
      render();
    }

    // Item clicável da lista de modelos (usado na aba Juntada e no card "Elaborar ato")
    function jModeloItem(value, label, selected, isLivre, cls) {
      var base = 'display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:7px;font-size:12.5px;cursor:pointer;border:1px solid ';
      var sty = selected
        ? base + '#1a5276;background:#eaf1f8;color:#1a5276;font-weight:600'
        : base + 'transparent;color:#374151';
      return '<div class="' + (cls || 'jmod-item') + '" data-modelo="' + esc(value) + '" style="' + sty + '">' +
        '<span style="color:' + (selected ? '#1a5276' : '#9ca3af') + '">' + (selected ? '◉' : '○') + '</span>' +
        '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' + (isLivre ? ';color:#6b7280;font-style:italic' : '') + '" title="' + esc(label) + '">' + esc(label) + '</span>' +
      '</div>';
    }

    // Card "Elaborar ato" (inline na aba Tarefas) — modelo/descrição por processo
    function renderElaborarAtoCard(pid, cnj) {
      var d = state.elaborarAtoDraft || { materia: '', fase: '', modelo: '', descricao: '', textoInserir: '' };
      var mat = d.materia || '', fase = d.fase || '', modelo = d.modelo || '';

      var matOpts = '<option value="">— selecione —</option>' + catMaterias().map(function(m) {
        return '<option value="' + esc(m) + '"' + (m === mat ? ' selected' : '') + '>' + esc(m) + '</option>';
      }).join('');

      var faseOpts = '<option value="">— selecione —</option>';
      if (mat) {
        faseOpts += catFases(mat).map(function(f) {
          return '<option value="' + esc(f) + '"' + (f === fase ? ' selected' : '') + '>' + esc(f) + '</option>';
        }).join('');
      }

      // Lista sempre os modelos aplicáveis a (mat, fase) — incluindo genéricos,
      // que ficam disponíveis mesmo sem matéria/fase selecionadas.
      var modelosHtml = '';
      var vistosEA = {};
      _filtrarPorClasse(catModelosFor(mat, fase), _classeDeCnj(cnj)).forEach(function(m) {
        if (m.nome && !vistosEA[m.nome]) {
          vistosEA[m.nome] = 1;
          var rot = m.nome + ((!m.materia || !m.fase) ? '   · genérico' : '');
          modelosHtml += jModeloItem(m.nome, rot, m.nome === modelo, false, 'eamod-item');
        }
      });
      if (Object.keys(vistosEA).length === 0) {
        modelosHtml = '<div style="font-size:12px;color:#9ca3af;padding:6px 2px">' +
          ((mat || fase) ? 'Nenhum modelo para esta combinação.' : 'Selecione a matéria/fase ou cadastre modelos genéricos.') + '</div>';
      }

      var temAto   = !!getAtoProcesso(cnj);
      var selStyle = 'width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12.5px;color:#1f2937;background:#fff;cursor:pointer';
      var capStyle = 'font-size:11px;color:#6b7280;font-weight:600;margin-bottom:4px';
      var faseDis  = mat ? '' : ' disabled';

      return '<div style="border:1px solid #1a5276;border-radius:10px;overflow:hidden">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:#eaf1f8;border-bottom:1px solid #cfe0f0;color:#1a5276;font-weight:600;font-size:12.5px">' +
          '<span>📝 Elaborar ato — Processo ' + esc(cnj || pid) + '</span>' +
          '<span style="flex:1"></span>' +
          '<button class="ea-cancelar" data-pid="' + esc(pid) + '" title="Fechar" style="border:none;background:none;color:#1a5276;cursor:pointer;font-size:18px;line-height:1">×</button>' +
        '</div>' +
        '<div style="padding:12px;background:#fff">' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">' +
            '<div style="flex:1;min-width:180px"><div style="' + capStyle + '">Matéria</div>' +
              '<select id="eaMateria" style="' + selStyle + '">' + matOpts + '</select></div>' +
            '<div style="flex:1;min-width:180px"><div style="' + capStyle + '">Fase</div>' +
              '<select id="eaFase" style="' + selStyle + (mat ? '' : ';background:#f9fafb;cursor:not-allowed') + '"' + faseDis + '>' + faseOpts + '</select></div>' +
          '</div>' +
          '<div style="margin-bottom:10px"><div style="' + capStyle + '">Modelo (para este processo)</div>' +
            '<div style="display:flex;flex-direction:column;gap:4px;border:1px solid #eef2f7;border-radius:8px;padding:6px">' + modelosHtml + '</div></div>' +
          '<div style="margin-bottom:12px"><div style="' + capStyle + '">Descrição</div>' +
            '<textarea id="eaDescricao" rows="2" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12.5px;color:#1f2937;font-family:inherit;resize:vertical">' + esc(d.descricao || '') + '</textarea></div>' +
          '<div style="margin-bottom:12px"><div style="' + capStyle + '">Inserir no texto <span style="font-weight:400;color:#9ca3af">(substitui {{…}} ou "inserir aqui")</span></div>' +
            '<input id="eaInserir" type="text" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12.5px;color:#1f2937;box-sizing:border-box" value="' + esc(d.textoInserir || '') + '" placeholder="ex.: Id da intimação"></div>' +
          '<div style="font-size:11px;color:#6b7280;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:6px 9px;margin-bottom:10px">ℹ️ Aqui você salva/edita o ato. Para <strong>juntar</strong>, use o botão <strong>↗ Autos</strong> da linha (o popover já vem preenchido).</div>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button class="btn ea-salvar" data-pid="' + esc(pid) + '" data-cnj="' + esc(cnj) + '">💾 Salvar ato</button>' +
            '<button class="btn sec ea-cancelar" data-pid="' + esc(pid) + '">Cancelar</button>' +
            (temAto ? '<button class="btn sec ea-remover" data-pid="' + esc(pid) + '" data-cnj="' + esc(cnj) + '" style="margin-left:auto;color:#b91c1c">🗑 Remover ato</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }

    // ── Aplicar ato em lote (Fase 1) — modal autocontido, anexado ao shadow ──
    // Grava o MESMO ato em juntadaPorProcesso para todos os CNJs selecionados.
    // A assinatura final continua manual (você revisa cada um nos autos).
    function abrirBulkAtoModal(cnjs) {
      cnjs = (cnjs || []).filter(Boolean);
      if (!cnjs.length) return;
      var _clsBulk = _classeComumDeCnjs(cnjs);
      var draft = { materia: '', fase: '', modelo: '', descricao: '', textoInserir: '' };
      if (!draft.materia && _clsBulk) { var _matB = _materiaDaClasse(_clsBulk); if (_matB) draft.materia = _matB; }
      var antigo = shadow.getElementById('bulkAtoBackdrop'); if (antigo) antigo.remove();
      var wrap = document.createElement('div');
      wrap.id = 'bulkAtoBackdrop';
      wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:30;display:flex;align-items:center;justify-content:center;padding:20px';
      shadow.appendChild(wrap);
      function fechar() { try { wrap.remove(); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); } }
      function descDe(nome) { var m = catModelos().find(function (x) { return x && x.nome === nome; }); return m ? (m.descricao || '') : ''; }
      function pintar() {
        var mat = draft.materia, fase = draft.fase, modelo = draft.modelo;
        var capStyle = 'font-size:11px;color:#6b7280;font-weight:600;margin-bottom:4px';
        var selStyle = 'width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12.5px;color:#1f2937;background:#fff;cursor:pointer';
        var matOpts = '<option value="">— selecione —</option>' + catMaterias().map(function (m) {
          return '<option value="' + esc(m) + '"' + (m === mat ? ' selected' : '') + '>' + esc(m) + '</option>';
        }).join('');
        var faseOpts = '<option value="">— selecione —</option>';
        if (mat) faseOpts += catFases(mat).map(function (f) {
          return '<option value="' + esc(f) + '"' + (f === fase ? ' selected' : '') + '>' + esc(f) + '</option>';
        }).join('');
        var modelosHtml = ''; var vistos = {};
        _filtrarPorClasse(catModelosFor(mat, fase), _clsBulk).forEach(function (m) {
          if (m.nome && !vistos[m.nome]) {
            vistos[m.nome] = 1;
            var rot = m.nome + ((!m.materia || !m.fase) ? '   · genérico' : '');
            modelosHtml += jModeloItem(m.nome, rot, m.nome === modelo, false, 'bamod-item');
          }
        });
        if (!Object.keys(vistos).length) modelosHtml = '<div style="font-size:12px;color:#9ca3af;padding:6px 2px">' + ((mat || fase) ? 'Nenhum modelo para esta combinação.' : 'Selecione a matéria/fase ou cadastre modelos genéricos.') + '</div>';
        wrap.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,0.3)">' +
          '<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:#eaf1f8;border-bottom:1px solid #cfe0f0;color:#1a5276;font-weight:700;font-size:13.5px">' +
            '<span>📝 Elaborar ato — ' + cnjs.length + ' processo' + (cnjs.length > 1 ? 's' : '') + '</span><span style="flex:1"></span>' +
            '<button id="baFechar" title="Fechar" style="border:none;background:none;color:#1a5276;cursor:pointer;font-size:20px;line-height:1">×</button>' +
          '</div>' +
          '<div style="padding:16px">' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">' +
              '<div style="flex:1;min-width:180px"><div style="' + capStyle + '">Matéria</div><select id="baMateria" style="' + selStyle + '">' + matOpts + '</select></div>' +
              '<div style="flex:1;min-width:180px"><div style="' + capStyle + '">Fase</div><select id="baFase" style="' + selStyle + (mat ? '' : ';background:#f9fafb;cursor:not-allowed') + '"' + (mat ? '' : ' disabled') + '>' + faseOpts + '</select></div>' +
            '</div>' +
            '<div style="margin-bottom:10px"><div style="' + capStyle + '">Modelo (aplicado a todos)</div><div style="display:flex;flex-direction:column;gap:4px;border:1px solid #eef2f7;border-radius:8px;padding:6px;max-height:220px;overflow:auto">' + modelosHtml + '</div></div>' +
            '<div style="margin-bottom:10px"><div style="' + capStyle + '">Descrição</div><textarea id="baDescricao" rows="2" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12.5px;color:#1f2937;font-family:inherit;resize:vertical">' + esc(draft.descricao || '') + '</textarea></div>' +
            '<div style="margin-bottom:12px"><div style="' + capStyle + '">Inserir no texto <span style="font-weight:400;color:#9ca3af">(substitui {{…}} ou "inserir aqui")</span></div><input id="baInserir" type="text" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12.5px;color:#1f2937;box-sizing:border-box" value="' + esc(draft.textoInserir || '') + '" placeholder="ex.: Id da intimação"></div>' +
            '<div style="font-size:11px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:7px 10px;margin-bottom:14px">⚠️ O mesmo ato será gravado para os ' + cnjs.length + ' processos. A assinatura final continua manual — você revisa cada um nos autos.</div>' +
            '<div style="display:flex;gap:8px;align-items:center">' +
              '<button class="btn" id="baAplicar">💾 Aplicar a ' + cnjs.length + ' processo(s)</button>' +
              '<button class="btn sec" id="baCancelar">Cancelar</button>' +
            '</div>' +
          '</div></div>';
        wireModal();
      }
      function wireModal() {
        var mMat = wrap.querySelector('#baMateria'); if (mMat) mMat.onchange = function () { draft.materia = mMat.value; draft.fase = ''; draft.modelo = ''; draft.descricao = ''; pintar(); };
        var mFas = wrap.querySelector('#baFase'); if (mFas) mFas.onchange = function () { draft.fase = mFas.value; draft.modelo = ''; draft.descricao = ''; pintar(); };
        wrap.querySelectorAll('.bamod-item').forEach(function (it) { it.onclick = function () { draft.modelo = it.dataset.modelo; draft.descricao = draft.modelo ? (descDe(draft.modelo) || draft.modelo) : ''; pintar(); }; });
        var dsc = wrap.querySelector('#baDescricao'); if (dsc) dsc.oninput = function () { draft.descricao = dsc.value; };
        var ins = wrap.querySelector('#baInserir'); if (ins) ins.oninput = function () { draft.textoInserir = ins.value; };
        var ap = wrap.querySelector('#baAplicar'); if (ap) ap.onclick = aplicar;
        var ca = wrap.querySelector('#baCancelar'); if (ca) ca.onclick = fechar;
        var fc = wrap.querySelector('#baFechar'); if (fc) fc.onclick = fechar;
        wrap.onclick = function (e) { if (e.target === wrap) fechar(); };
      }
      function aplicar() {
        if (!draft.modelo) { alert('Selecione o modelo a aplicar.'); return; }
        var n = 0;
        cnjs.forEach(function (cnj) { salvarAtoProcesso(cnj, { materia: draft.materia || '', fase: draft.fase || '', modelo: draft.modelo, descricao: draft.descricao || '', textoInserir: draft.textoInserir || '' }); n++; });
        fechar();
        render();
        alert('Ato aplicado a ' + n + ' processo(s). Abra cada um nos autos (↗ Autos) para revisar e salvar/assinar.');
      }
      pintar();
    }

    // ── Etiquetar em lote (Vincular) — modal multi-seleção, anexado ao shadow ──
    // Marca 1+ etiquetas e aplica aos CNJs selecionados via REST (processoTags/inserir).
    // Mesmo layout do "Elaborar ato", com checkbox no lugar do radio de modelo.
    function abrirBulkVincularModal(cnjs, tarefaSanfona) {
      cnjs = (cnjs || []).filter(Boolean);
      if (!cnjs.length) return;
      // Vocabulário: etiquetas das regras de vincular (únicas, ordenadas)
      var vistos = {}, etiquetas = [];
      (state.vincularEtiquetaRegras || []).forEach(function (r) {
        var es = (r.etiquetas && r.etiquetas.length) ? r.etiquetas : (r.etiqueta ? [r.etiqueta] : []);
        es.forEach(function (e) { var t = String(e || '').trim(); if (t && !vistos[t.toUpperCase()]) { vistos[t.toUpperCase()] = 1; etiquetas.push(t); } });
      });
      etiquetas.sort(function (a, b) { return a.localeCompare(b, 'pt'); });
      var marcadas = {};
      var antigo = shadow.getElementById('bulkVincBackdrop'); if (antigo) antigo.remove();
      var wrap = document.createElement('div');
      wrap.id = 'bulkVincBackdrop';
      wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:30;display:flex;align-items:center;justify-content:center;padding:20px';
      shadow.appendChild(wrap);
      function fechar() { try { wrap.remove(); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); } }
      var nSel = cnjs.length;
      var capStyle = 'font-size:11px;color:#6b7280;font-weight:600;margin-bottom:4px';
      var rowsHtml = etiquetas.length
        ? etiquetas.map(function (e, idx) {
            return '<label class="bv-row" data-etq="' + esc(e) + '" style="display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:6px;cursor:pointer;font-size:12.5px;color:#1f2937">' +
              '<input type="checkbox" class="bv-chk" data-idx="' + idx + '" style="width:15px;height:15px;accent-color:#1a5276">' + esc(e) + '</label>';
          }).join('')
        : '<div style="font-size:12px;color:#9ca3af;padding:8px 4px">Nenhuma etiqueta nas regras de vincular. Cadastre em Etiquetas → Vincular.</div>';
      wrap.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:520px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,0.3)">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:#eaf1f8;border-bottom:1px solid #cfe0f0;color:#1a5276;font-weight:700;font-size:13.5px">' +
          '<span>🏷 Etiquetar em lote — ' + nSel + ' processo' + (nSel > 1 ? 's' : '') + '</span><span style="flex:1"></span>' +
          '<button id="bvFechar" title="Fechar" style="border:none;background:none;color:#1a5276;cursor:pointer;font-size:20px;line-height:1">×</button>' +
        '</div>' +
        '<div style="padding:16px">' +
          '<input id="bvBusca" type="text" placeholder="Buscar etiqueta…" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12.5px;color:#1f2937;box-sizing:border-box;margin-bottom:10px">' +
          '<div style="' + capStyle + '">Etiquetas <span style="font-weight:400;color:#9ca3af">(marque uma ou mais)</span></div>' +
          '<div id="bvLista" style="display:flex;flex-direction:column;border:1px solid #eef2f7;border-radius:8px;padding:4px;max-height:210px;overflow:auto;margin-bottom:10px">' + rowsHtml + '</div>' +
          '<div style="font-size:11px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:7px 10px;margin-bottom:14px">⚠️ <span id="bvNota">0</span> etiqueta(s) marcada(s) serão aplicadas aos ' + nSel + ' processo(s), via REST.</div>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button id="bvAplicar" style="background:#1a5276;color:#fff;border:1px solid #1a5276;border-radius:7px;padding:8px 14px;font-size:12.5px;font-weight:600;cursor:pointer">🏷 Aplicar a ' + nSel + ' processo(s)</button>' +
            '<button id="bvCancelar" style="background:#fff;color:#374151;border:1px solid #d1d5db;border-radius:7px;padding:8px 14px;font-size:12.5px;cursor:pointer">Cancelar</button>' +
          '</div>' +
        '</div></div>';
      var notaEl = wrap.querySelector('#bvNota');
      function contar() { return Object.keys(marcadas).filter(function (k) { return marcadas[k]; }).length; }
      function atualizarNota() { if (notaEl) notaEl.textContent = contar(); }
      wrap.querySelectorAll('.bv-chk').forEach(function (chk) {
        chk.addEventListener('change', function () {
          var row = chk.closest('.bv-row'); var etq = row && row.dataset.etq;
          if (!etq) return;
          if (chk.checked) { marcadas[etq] = 1; if (row) row.style.background = '#eff6ff'; }
          else { delete marcadas[etq]; if (row) row.style.background = ''; }
          atualizarNota();
        });
      });
      var busca = wrap.querySelector('#bvBusca');
      if (busca) busca.addEventListener('input', function () {
        var q = busca.value.trim().toUpperCase();
        wrap.querySelectorAll('.bv-row').forEach(function (row) {
          var e = String(row.dataset.etq || '').toUpperCase();
          row.style.display = (!q || e.indexOf(q) >= 0) ? '' : 'none';
        });
      });
      function aplicar() {
        var etqs = Object.keys(marcadas).filter(function (k) { return marcadas[k]; });
        if (!etqs.length) { alert('Marque ao menos uma etiqueta.'); return; }
        var regraSint = { id: 'bulkvinc_' + Date.now().toString(36), etiquetas: etqs, etiqueta: etqs[0], tarefa: tarefaSanfona || '', ativo: true };
        var t0 = Date.now();
        try {
          chrome.storage.local.remove('etiquetaVincularStatus', function () {
            chrome.storage.local.set({ etiquetaVincularComando: { regras: [regraSint], ts: t0, cnjs: cnjs } });
          });
        } catch (e2) { console.warn('[PJM fullscreen-overlay]', e2); }
        try { reColetarAposVincular(tarefaSanfona || '', t0); } catch (_) { /* noop */ }
        fechar();
      }
      var ap = wrap.querySelector('#bvAplicar'); if (ap) ap.onclick = aplicar;
      var ca = wrap.querySelector('#bvCancelar'); if (ca) ca.onclick = fechar;
      var fc = wrap.querySelector('#bvFechar'); if (fc) fc.onclick = fechar;
      wrap.onclick = function (e) { if (e.target === wrap) fechar(); };
      if (busca) { try { busca.focus(); } catch (_) { /* noop */ } }
      atualizarNota();
    }

    function renderJuntada() {
      var sub = state.juntadaSubaba || 'padrao';
      function segBtn(id, label, ativo) {
        return '<button class="jsub-btn" data-sub="' + id + '" style="font-size:12.5px;padding:6px 15px;border:none;border-radius:6px;cursor:pointer;' +
          (ativo ? 'background:#fff;color:#1a5276;font-weight:600' : 'background:transparent;color:#6b7280') + '">' + label + '</button>';
      }
      var seg = '<div style="display:inline-flex;background:#eef2f7;border-radius:8px;padding:3px;gap:2px;margin-bottom:18px">' +
        segBtn('padrao', 'Configuração padrão', sub === 'padrao') +
        segBtn('gerenciar', 'Catálogo · ' + catModelos().length, sub === 'gerenciar') +
        '</div>';

      return '<div style="max-width:920px;margin:0 auto">' +
        seg +
        (sub === 'gerenciar' ? renderGerenciarModelos() : renderJuntadaPadrao()) +
      '</div>';
    }

    // Vista "Configuração padrão" (config global de juntada)
    function renderJuntadaPadrao() {
      var faseAtiva = state.juntadaFase || '';
      var modeloAtivo = state.juntadaModelo || '';
      var materiaAtiva = state.juntadaMateria || '';

      var statusHtml = '';
      if (faseAtiva || modeloAtivo) {
        var descBadge = modeloAtivo && catDescricao(modeloAtivo) ? ' — "' + esc(catDescricao(modeloAtivo)) + '"' : '';
        var rotuloAtivo = faseAtiva
          ? esc(faseAtiva) + (modeloAtivo ? ' · <em>' + esc(modeloAtivo) + '</em>' + descBadge : ' <span style="opacity:.7">(modelo livre)</span>')
          : '<em>' + esc(modeloAtivo) + '</em>' + descBadge + ' <span style="opacity:.7">(genérico, sem fase)</span>';
        statusHtml = '<div style="background:#d5f5e3;border:1px solid #a9dfbf;border-radius:8px;padding:10px 14px;margin-bottom:18px;font-size:13px;color:#1e8449">' +
          '<strong>✅ Configuração ativa:</strong> ' + rotuloAtivo +
          '</div>';
      } else {
        statusHtml = '<div style="background:#fef9e7;border:1px solid #f9e79f;border-radius:8px;padding:10px 14px;margin-bottom:18px;font-size:13px;color:#9a7d0a">' +
          '⚠️ Nenhuma configuração padrão salva. Selecione abaixo.' +
          '</div>';
      }

      var materiasOpts = '<option value="">— selecione —</option>' +
        catMaterias().map(function(m) {
          return '<option value="' + esc(m) + '"' + (m === materiaAtiva ? ' selected' : '') + '>' + esc(m) + '</option>';
        }).join('');

      var fasesOpts = '<option value="">— selecione —</option>';
      if (materiaAtiva) {
        fasesOpts += catFases(materiaAtiva).map(function(f) {
          return '<option value="' + esc(f) + '"' + (f === faseAtiva ? ' selected' : '') + '>' + esc(f) + '</option>';
        }).join('');
      }

      // Card 3 — lista de modelos selecionáveis (sempre lista; inclui genéricos)
      var vistos = {};
      var modelosHtml = jModeloItem('', '— nenhum fixo (usuário escolhe) —', modeloAtivo === '', true);
      catModelosFor(materiaAtiva, faseAtiva).forEach(function(m) {
        if (m.nome && !vistos[m.nome]) {
          vistos[m.nome] = 1;
          var rotulo = m.nome + ((!m.materia || !m.fase) ? '   · genérico' : '');
          modelosHtml += jModeloItem(m.nome, rotulo, m.nome === modeloAtivo, false);
        }
      });
      if (Object.keys(vistos).length === 0) {
        modelosHtml += '<div style="font-size:12px;color:#9ca3af;padding:8px 2px">' +
          ((materiaAtiva || faseAtiva) ? 'Nenhum modelo para esta combinação.' : 'Selecione a matéria/fase ou cadastre modelos genéricos.') + '</div>';
      }

      var faseDis  = materiaAtiva ? '' : ' disabled';
      var selStyle = 'width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#1f2937;background:#fff;cursor:pointer';
      var cardStyle = 'flex:1;min-width:230px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px';
      var capStyle  = 'font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;font-weight:600;margin-bottom:10px';

      var cardMateria = '<div style="' + cardStyle + '">' +
        '<div style="' + capStyle + '">1 · Matéria</div>' +
        '<select id="jMateria" style="' + selStyle + '">' + materiasOpts + '</select></div>';

      var cardFase = '<div style="' + cardStyle + '">' +
        '<div style="' + capStyle + '">2 · Fase</div>' +
        '<select id="jFase" style="' + selStyle + (materiaAtiva ? '' : ';background:#f9fafb;cursor:not-allowed') + '"' + faseDis + '>' + fasesOpts + '</select></div>';

      var cardModelo = '<div style="' + cardStyle + ';flex:1.4">' +
        '<div style="' + capStyle + '">3 · Modelo <span style="text-transform:none;font-weight:400;color:#9ca3af">(opcional)</span></div>' +
        '<div id="jModeloLista" style="display:flex;flex-direction:column;gap:4px">' + modelosHtml + '</div></div>';

      var descAtual = modeloAtivo ? catDescricao(modeloAtivo) : '';
      var cardDescricao = '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-top:14px">' +
        '<div style="' + capStyle + '">Descrição (preenche o campo do PJe)</div>' +
        (descAtual
          ? '<div style="border:1px solid #d1d5db;border-radius:8px;padding:9px 11px;font-size:13px;color:#1a5276;background:#f8fafc">' + esc(descAtual) + '</div>'
          : '<div style="font-size:12px;color:#9ca3af">Sem descrição padrão para o modelo selecionado — o nome do modelo será usado.</div>') +
        '</div>';

      return statusHtml +
        '<p style="color:#6b7280;font-size:12px;margin:-6px 0 16px">Configuração padrão de juntada (Certidão), aplicada quando o processo não tem um ato específico. Para um modelo por processo, selecione o(s) processo(s) na aba Tarefas e use <strong>📝 Elaborar ato</strong>; o chip <strong>✓ Ato</strong> edita um já definido.</p>' +
        '<div style="display:flex;gap:14px;align-items:stretch;flex-wrap:wrap">' +
          cardMateria + cardFase + cardModelo +
        '</div>' +
        cardDescricao +
        '<div style="display:flex;gap:10px;margin-top:14px">' +
          '<button class="btn" id="jSalvar" style="flex:1">💾 Salvar configuração</button>' +
          '<button class="btn sec" id="jLimpar">✕ Limpar</button>' +
        '</div>';
    }

    // Seção "Gerenciar modelos" (CRUD do catálogo) — aba Juntada
    function renderGerenciarModelos() {
      var modelos = catModelos();
      var capStyle = 'font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;font-weight:600';

      // Form adicionar/editar
      var formHtml = '';
      if (state.catForm) {
        var f = state.catForm;
        var ehEdicao = !!f.id;
        var inpStyle = 'width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12.5px;color:#1f2937;font-family:inherit';
        var lblStyle = 'font-size:11px;color:#6b7280;font-weight:600;margin-bottom:4px';
        var dataList = '<datalist id="cfMateriasList">' + catMaterias().map(function(m){ return '<option value="' + esc(m) + '"></option>'; }).join('') + '</datalist>'
          + '<datalist id="cfClassesList">' + (state.classesConhecidas || []).map(function(c){ return '<option value="' + esc(c.nome + (c.codigo ? (' (' + c.codigo + ')') : '')) + '"></option>'; }).join('') + '</datalist>';
        formHtml =
          '<div style="border:1px solid #1a5276;border-radius:10px;overflow:hidden;margin-bottom:14px">' +
            '<div style="padding:8px 12px;background:#eaf1f8;color:#1a5276;font-size:12.5px;font-weight:600">' + (ehEdicao ? '✏️ Editar modelo' : '➕ Adicionar modelo') + '</div>' +
            '<div style="padding:12px;background:#fff">' + dataList +
              '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">' +
                '<div style="flex:1;min-width:180px"><div style="' + lblStyle + '">Matéria <span style="font-weight:400;color:#9ca3af">(em branco = genérica)</span></div>' +
                  '<input id="cfMateria" list="cfMateriasList" style="' + inpStyle + '" value="' + esc(f.materia || '') + '" placeholder="ex.: Registro de Candidatura"></div>' +
                '<div style="flex:1;min-width:140px"><div style="' + lblStyle + '">Fase <span style="font-weight:400;color:#9ca3af">(em branco = sem fase)</span></div>' +
                  '<input id="cfFase" style="' + inpStyle + '" value="' + esc(f.fase || '') + '" placeholder="ex.: Impugnação"></div>' +
              '</div>' +
              '<div style="margin-bottom:10px"><div style="' + lblStyle + '">Nome do modelo (exato, como no PJe)</div>' +
                '<input id="cfNome" style="' + inpStyle + '" value="' + esc(f.nome || '') + '" placeholder="ex.: RCAND - Cert - Pub - Mural+CAND"></div>' +
              '<div style="margin-bottom:12px"><div style="' + lblStyle + '">Descrição</div>' +
                '<textarea id="cfDescricao" rows="2" style="' + inpStyle + ';resize:vertical">' + esc(f.descricao || '') + '</textarea></div>' +
              '<div style="margin-bottom:12px"><div style="' + lblStyle + '">Classes <span style="font-weight:400;color:#9ca3af">(em branco = genérico — aparece em todas as classes)</span></div>' +
                '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">' +
                  ((f.classes && f.classes.length)
                    ? f.classes.map(function(c, i) { return '<span class="cf-cls" data-i="' + i + '" title="remover" style="cursor:pointer;font-size:11px;padding:3px 8px;border-radius:10px;background:#f5eef8;color:#6c3483;font-weight:500">' + esc(c.nome) + (c.codigo ? (' (' + esc(c.codigo) + ')') : '') + ' ×</span>'; }).join('')
                    : '<span style="font-size:11.5px;color:#9ca3af">nenhuma — modelo genérico</span>') +
                '</div>' +
                '<input id="cfClasse" list="cfClassesList" style="' + inpStyle + '" placeholder="escolha uma classe do acervo e tecle Enter">' +
              '</div>' +
              '<div style="display:flex;gap:8px">' +
                '<button class="btn" id="cfSalvar">💾 ' + (ehEdicao ? 'Salvar alterações' : 'Adicionar') + '</button>' +
                '<button class="btn sec" id="cfCancelar">Cancelar</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      }

      // Toolbar: busca + adicionar + exportar/importar
      var toolbar =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">' +
          '<div style="flex:1;display:flex;align-items:center;gap:6px;border:1px solid #d1d5db;border-radius:8px;padding:7px 10px">' +
            '<span style="font-size:13px;color:#9ca3af">🔍</span>' +
            '<input id="cfBusca" placeholder="Buscar modelo, matéria, fase…" value="' + esc(state.catBusca || '') + '" autocomplete="off" style="flex:1;border:none;outline:none;background:transparent;font-size:12.5px;color:#1f2937">' +
          '</div>' +
          '<button class="btn" id="cfNovo">➕ Adicionar</button>' +
          '<button class="etq-io-btn" id="catExportar" title="Exportar catálogo (.json)">⬆ Exportar</button>' +
          '<button class="etq-io-btn" id="catImportar" title="Importar catálogo (.json)">⬇ Importar</button>' +
        '</div>';

      // Lista agrupada por matéria (+ Genéricos) — grupos recolhíveis (como na aba Relatório)
      var grupos = {};
      modelos.forEach(function(m) {
        var k = m.materia || '__GEN__';
        (grupos[k] = grupos[k] || []).push(m);
      });
      var chaves = Object.keys(grupos).filter(function(k){ return k !== '__GEN__'; }).sort();
      if (grupos['__GEN__']) chaves.push('__GEN__');

      // Recolhido por padrão: na 1ª montagem marca todos os grupos como recolhidos.
      // Depois respeita o que você expandir/recolher (o estado reseta ao recarregar o painel).
      if (!state.catGruposInit) {
        state.catGruposRecolhidos = state.catGruposRecolhidos || {};
        chaves.forEach(function(k) { if (state.catGruposRecolhidos[k] === undefined) state.catGruposRecolhidos[k] = true; });
        state.catGruposInit = true;
      }

      var listaHtml = '';
      if (modelos.length === 0) {
        listaHtml = '<div style="font-size:12px;color:#9ca3af;padding:10px 2px">Catálogo vazio. Use "Adicionar".</div>';
      } else {
        chaves.forEach(function(k) {
          var titulo = (k === '__GEN__') ? 'Genéricos · sem matéria' : k;
          var recolhido = !!(state.catGruposRecolhidos && state.catGruposRecolhidos[k]);
          var rows = grupos[k].slice().sort(function(a, b) {
            return (String(a.fase) + a.nome).localeCompare(String(b.fase) + b.nome);
          }).map(function(m) {
            var _cls = Array.isArray(m.classes) ? m.classes : [];
            var _clsTxt = _cls.map(function(c) { return (c && c.nome ? c.nome : '') + (c && c.codigo ? (' (' + c.codigo + ')') : ''); }).join(' · ');
            var termo = ((m.nome || '') + ' ' + (m.materia || '') + ' ' + (m.fase || '') + ' ' + (m.descricao || '') + ' ' + _clsTxt).toLowerCase();
            var _vazio = 'display:inline-block;font-size:11px;background:#fff;color:#9ca3af;border:1px dashed #d8dee5;padding:1px 7px;border-radius:6px;white-space:nowrap';
            var _cheio = 'display:inline-block;max-width:100%;font-size:11px;padding:2px 8px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle';
            var classeChip = _cls.length
              ? '<span title="' + esc(_clsTxt) + '" style="' + _cheio + ';background:#f5eef8;color:#6c3483;font-weight:500">' + (_cls.length === 1 ? esc(_cls[0].nome) : (_cls.length + ' classes')) + '</span>'
              : '<span title="sem classe marcada — serve a qualquer classe" style="' + _vazio + '">genérico</span>';
            var faseChip = m.fase
              ? '<span title="' + esc(m.fase) + '" style="' + _cheio + ';background:#eef2f7;color:#4b5563">' + esc(m.fase) + '</span>'
              : '<span title="serve a qualquer fase" style="' + _vazio + '">qualquer fase</span>';
            var _btn = 'cursor:pointer;width:26px;height:26px;border:1px solid #e5eaef;border-radius:6px;background:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px';
            return '<div class="cat-row" data-busca="' + esc(termo) + '" style="display:flex;align-items:center;gap:10px;padding:9px 11px;border-bottom:1px solid #f1f3f5">' +
              '<div style="flex:1;min-width:0">' +
                '<div style="font-size:12.5px;color:#1f2937;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(m.nome) + '">' + esc(m.nome || '(sem nome)') + '</div>' +
                (m.descricao ? '<div style="font-size:11px;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.descricao) + '</div>' : '') +
              '</div>' +
              '<div style="width:190px;min-width:190px">' + classeChip + '</div>' +
              '<div style="width:120px;min-width:120px">' + faseChip + '</div>' +
              '<div style="width:62px;min-width:62px;display:flex;gap:5px;justify-content:flex-end">' +
                '<span class="cf-editar" data-id="' + esc(m.id) + '" title="Editar" style="' + _btn + ';color:#28527a">✏️</span>' +
                '<span class="cf-excluir" data-id="' + esc(m.id) + '" title="Excluir" style="' + _btn + ';color:#b91c1c">🗑</span>' +
              '</div>' +
            '</div>';
          }).join('');
          if (rows) rows = _catCabecalho() + rows;
          // estilo das seções da aba Etiquetas: matéria com acento azul, Genéricos neutro
          var gen = (k === '__GEN__');
          var hBg = gen ? '#f1f3f5' : '#eaf1f8';
          var hBd = gen ? '#e5e7eb' : '#cfe0f0';
          var hFg = gen ? '#4b5563' : '#1a5276';
          var cFg = gen ? '#6b7280' : '#1a5276';
          listaHtml +=
            '<div class="cat-grupo" data-grupo="' + esc(k) + '" style="margin-bottom:8px">' +
              '<div class="cat-grupo-hdr" data-grupo="' + esc(k) + '" style="display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px solid ' + hBd + ';border-radius:8px;cursor:pointer;background:' + hBg + ';color:' + hFg + '">' +
                '<span class="cat-grupo-ic" style="font-size:11px;color:' + hFg + ';width:12px;display:inline-block">' + (recolhido ? '▶' : '▼') + '</span>' +
                '<span style="font-size:12.5px;font-weight:600;flex:1">' + esc(titulo) + '</span>' +
                '<span style="font-size:11px;background:#fff;color:' + cFg + ';padding:2px 9px;border-radius:20px;font-weight:600">' + grupos[k].length + '</span>' +
              '</div>' +
              '<div class="cat-grupo-rows" style="border:1px solid ' + hBd + ';border-top:none;border-radius:0 0 8px 8px;overflow:hidden' + (recolhido ? ';display:none' : '') + '">' + rows + '</div>' +
            '</div>';
        });
      }

      // Card de importação pendente (escolha mesclar/substituir)
      var importHtml = '';
      if (state.catImport) {
        var nImp = (state.catImport.modelos || []).length;
        importHtml = '<div style="border:1px solid #f59e0b;background:#fffbeb;border-radius:10px;padding:12px;margin-bottom:14px">' +
          '<div style="font-size:13px;color:#92400e;margin-bottom:10px">📥 Importar <strong>' + nImp + '</strong> modelo(s)' +
            (state.catImport.nome ? ' de <em>' + esc(state.catImport.nome) + '</em>' : '') + '. Como aplicar?</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn" id="catImpMesclar">Mesclar com os atuais</button>' +
            '<button class="btn sec" id="catImpSubstituir" style="color:#b91c1c">Substituir tudo</button>' +
            '<button class="btn sec" id="catImpCancelar">Cancelar</button>' +
          '</div>' +
        '</div>';
      }

      return '<div>' +
        toolbar +
        importHtml +
        formHtml +
        listaHtml +
      '</div>';
    }

    // Filtra o catálogo no DOM pela busca (sem re-render, para não perder o foco do campo)
    function filtrarCatalogoNoDOM() {
      var inp = $('cfBusca');
      var termo = inp ? String(inp.value || '').trim().toLowerCase() : '';
      var buscando = termo.length > 0;
      shadow.querySelectorAll('.cat-grupo').forEach(function(g) {
        var key = g.getAttribute('data-grupo');
        var recolhido = !!(state.catGruposRecolhidos && state.catGruposRecolhidos[key]);
        var algumVisivel = false;
        g.querySelectorAll('.cat-row').forEach(function(r) {
          var match = !termo || (r.getAttribute('data-busca') || '').indexOf(termo) >= 0;
          // 'flex' e NAO '': a linha usa display:flex INLINE. Atribuir '' apaga a
          // propriedade e a linha vira block, empilhando as colunas.
          r.style.display = match ? 'flex' : 'none';
          if (match) algumVisivel = true;
        });
        var box = g.querySelector('.cat-grupo-rows');
        var mostrarBox = buscando ? algumVisivel : !recolhido;
        if (box) box.style.display = mostrarBox ? '' : 'none';
        g.style.display = (buscando && !algumVisivel) ? 'none' : '';
        var ic = g.querySelector('.cat-grupo-ic');
        if (ic) ic.textContent = mostrarBox ? '▼' : '▶';
      });
    }

    function wireJuntada() {
      // Catálogo é a fonte de verdade; não depende mais da constante do arquivo de dados.
      var selMat = $('jMateria');
      var selFas = $('jFase');

      if (selMat) {
        selMat.addEventListener('change', function() {
          var mat = selMat.value;
          state.juntadaMateria = mat;
          state.juntadaFase    = '';
          state.juntadaModelo  = '';
          render();
        });
      }

      if (selFas) {
        selFas.addEventListener('change', function() {
          state.juntadaFase   = selFas.value;
          state.juntadaModelo = '';
          render();
        });
      }

      shadow.querySelectorAll('.jmod-item').forEach(function(item) {
        item.addEventListener('click', function() {
          state.juntadaModelo = item.dataset.modelo || '';
          render();
        });
      });

      var btnSalvar = $('jSalvar');
      if (btnSalvar) {
        btnSalvar.addEventListener('click', function() {
          var fase   = state.juntadaFase   || '';
          var modelo = state.juntadaModelo || '';
          if (!fase && !modelo) {
            alert('Selecione ao menos a fase ou um modelo (genérico) antes de salvar.');
            return;
          }
          // Grava fase/modelo no chrome.storage.local; o content script juntada.js lê e aplica.
          try { chrome.storage.local.set({ faseAlvo: fase, modeloAlvo: modelo }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }

          var orig = btnSalvar.textContent;
          btnSalvar.textContent = '✅ Salvo!';
          btnSalvar.disabled = true;
          setTimeout(function() { btnSalvar.textContent = orig; btnSalvar.disabled = false; }, 1500);
          render();
        });
      }

      var btnLimpar = $('jLimpar');
      if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
          try { chrome.storage.local.remove(['faseAlvo', 'modeloAlvo']); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          state.juntadaFase    = '';
          state.juntadaModelo  = '';
          state.juntadaMateria = '';
          render();
        });
      }

      // ─ Gerenciar modelos (CRUD do catálogo) ─
      var cfNovo = $('cfNovo');
      if (cfNovo) {
        cfNovo.addEventListener('click', function() {
          state.catForm = { id: null, materia: '', fase: '', nome: '', descricao: '', classes: [] };
          render();
        });
      }
      var cfCancelar = $('cfCancelar');
      if (cfCancelar) {
        cfCancelar.addEventListener('click', function() {
          state.catForm = null;
          render();
        });
      }
      var cfSalvar = $('cfSalvar');
      if (cfSalvar) {
        cfSalvar.addEventListener('click', function() {
          var elNome = $('cfNome');
          var nome = (elNome ? elNome.value : '').trim();
          if (!nome) { alert('Informe o nome do modelo (exatamente como aparece no PJe).'); return; }
          _commitClasse();   // captura classe escolhida/digitada que ainda nao virou chip
          var dados = {
            materia:   $('cfMateria')   ? $('cfMateria').value   : '',
            fase:      $('cfFase')      ? $('cfFase').value      : '',
            nome:      nome,
            descricao: $('cfDescricao') ? $('cfDescricao').value : '',
            classes:   (state.catForm && Array.isArray(state.catForm.classes)) ? state.catForm.classes.slice() : []
          };
          if (state.catForm && state.catForm.id) catUpdate(state.catForm.id, dados);
          else catAdd(dados);
          state.catForm = null;
          render();
        });
      }
      // Classes do modelo (chips). ATENCAO: escolher no datalist NAO dispara Enter --
      // por isso commitamos tambem no 'change' e, por seguranca, no momento de salvar.
      function _commitClasse() {
        var el = $('cfClasse');
        if (!el || !state.catForm) return false;
        var v = String(el.value || '').trim();
        if (!v) return false;
        var mm = v.match(/^(.*?)\s*\((\d+)\)\s*$/);
        var novo = mm ? { nome: mm[1].trim(), codigo: mm[2] } : { nome: v, codigo: '' };
        state.catForm.classes = state.catForm.classes || [];
        var chave = _normClasse(novo.nome);
        if (!state.catForm.classes.some(function(c) { return _normClasse(c.nome) === chave; })) state.catForm.classes.push(novo);
        el.value = '';
        return true;
      }
      var _cfCls = $('cfClasse');
      if (_cfCls) {
        _cfCls.addEventListener('keydown', function(ev) {
          if (ev.key !== 'Enter') return;
          ev.preventDefault();
          if (_commitClasse()) render();
        });
        _cfCls.addEventListener('change', function() { if (_commitClasse()) render(); });
      }
      shadow.querySelectorAll('.cf-cls').forEach(function(el) {
        el.addEventListener('click', function() {
          var i = parseInt(el.getAttribute('data-i'), 10);
          if (state.catForm && Array.isArray(state.catForm.classes) && i >= 0) { state.catForm.classes.splice(i, 1); render(); }
        });
      });
      // Sincroniza o que está sendo digitado no form com o state (sobrevive a re-render)
      ['cfMateria', 'cfFase', 'cfNome', 'cfDescricao'].forEach(function(cid) {
        var el = $(cid);
        if (el) el.addEventListener('input', function() {
          if (!state.catForm) return;
          state.catForm[cid.slice(2).toLowerCase()] = el.value;
        });
      });
      shadow.querySelectorAll('.cf-editar').forEach(function(el) {
        el.addEventListener('click', function() {
          var id = el.dataset.id;
          var m = catModelos().find(function(x) { return x.id === id; });
          if (!m) return;
          state.catForm = { id: m.id, materia: m.materia || '', fase: m.fase || '', nome: m.nome || '', descricao: m.descricao || '', classes: (m.classes || []).slice() };
          render();
        });
      });
      shadow.querySelectorAll('.cf-excluir').forEach(function(el) {
        el.addEventListener('click', function() {
          var id = el.dataset.id;
          var m = catModelos().find(function(x) { return x.id === id; });
          if (!confirm('Excluir "' + (m ? m.nome : 'este modelo') + '" do catálogo?')) return;
          catRemove(id);
          if (state.catForm && state.catForm.id === id) state.catForm = null;
          render();
        });
      });

      // ─ Exportar / Importar catálogo ─
      var catExp = $('catExportar');
      if (catExp) catExp.addEventListener('click', catExportar);
      var catImpBtn = $('catImportar');
      if (catImpBtn) {
        catImpBtn.addEventListener('click', function() {
          var inp = document.createElement('input');
          inp.type = 'file';
          inp.accept = '.json,application/json';
          inp.style.display = 'none';
          inp.addEventListener('change', function() {
            var file = inp.files && inp.files[0];
            if (file) catImportarArquivo(file);
            try { inp.remove(); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); }
          });
          document.body.appendChild(inp);
          inp.click();
        });
      }
      var impMesclar = $('catImpMesclar');
      if (impMesclar) impMesclar.addEventListener('click', function() { catAplicarImport('mesclar'); });
      var impSubst = $('catImpSubstituir');
      if (impSubst) impSubst.addEventListener('click', function() {
        if (!confirm('Substituir TODO o catálogo atual pelos modelos importados? Os modelos que não estiverem no arquivo serão removidos.')) return;
        catAplicarImport('substituir');
      });
      var impCancel = $('catImpCancelar');
      if (impCancel) impCancel.addEventListener('click', function() { state.catImport = null; render(); });

      // ─ Sub-abas (Configuração padrão / Gerenciar modelos) ─
      shadow.querySelectorAll('.jsub-btn').forEach(function(b) {
        b.addEventListener('click', function() {
          state.juntadaSubaba = b.dataset.sub || 'padrao';
          render();
        });
      });

      // ─ Busca do catálogo: filtra no DOM, sem perder o foco do campo ─
      var cfBusca = $('cfBusca');
      if (cfBusca) {
        cfBusca.addEventListener('input', function() {
          state.catBusca = cfBusca.value;
          filtrarCatalogoNoDOM();
        });
      }

      // ─ Recolher/expandir grupos por matéria (como na aba Relatório) ─
      shadow.querySelectorAll('.cat-grupo-hdr').forEach(function(h) {
        h.addEventListener('click', function() {
          var key = h.getAttribute('data-grupo');
          if (!state.catGruposRecolhidos) state.catGruposRecolhidos = {};
          state.catGruposRecolhidos[key] = !state.catGruposRecolhidos[key];
          render();
        });
      });

      // Reaplica a busca após cada render (mantém o filtro ao recolher/editar)
      filtrarCatalogoNoDOM();
    }

    // ── Aba Relatório ────────────────────────────────────────────────────
    function renderRelatorio() {
      chrome.storage.local.get('pjmRelatorio', function(r) {
        var rel = (r && r.pjmRelatorio) || { sessoes: [] };
        var b = $('body');
        if (!b) return;

        var sessoes = rel.sessoes || [];
        if (!sessoes.length) {
          b.innerHTML = '<div class="empty" style="padding:60px 20px;text-align:center;color:#9ca3af">' +
            '<div style="font-size:32px;margin-bottom:12px">📋</div>' +
            '<div style="font-size:14px">Nenhuma sessão registrada.<br>Clique em <strong>Mapear</strong> para iniciar o registro.</div></div>';
          return;
        }

        function fmtData(ts, tipo) {
          if (!ts) return '—';
          var d = new Date(ts);
          var dd = String(d.getDate()).padStart(2,'0');
          var mm = String(d.getMonth()+1).padStart(2,'0');
          var yyyy = d.getFullYear();
          var hh = String(d.getHours()).padStart(2,'0');
          var mi = String(d.getMinutes()).padStart(2,'0');
          var base = dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + mi;
          return tipo === 'agendamento' ? '⏰ ' + base : base;
        }
        function fmtHora(ts) {
          if (!ts) return '—';
          var d = new Date(ts);
          return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
        }
        function fmtSoData(ts) {
          if (!ts) return '—';
          var d = new Date(ts);
          return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
        }
        function extrairTipoAcao(acao) {
          if (!acao) return '';
          var m = acao.match(/\(([^)]+)\)/);
          return m ? m[1].trim() : '';
        }
        function extrairMateria(acao) {
          if (!acao) return '';
          var idx = acao.indexOf('(');
          return idx > 0 ? acao.slice(0, idx).trim() : acao.trim();
        }
        // Formata número bruto para padrão CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
        function formatarCNJ(cnj) {
          if (!cnj || cnj === '—') return cnj || '—';
          var s = cnj.replace(/[\.\-\s]/g, '');
          if (!/^\d{20}$/.test(s)) return cnj; // mantém original se não for 20 dígitos
          return s.slice(0,7)+'-'+s.slice(7,9)+'.'+s.slice(9,13)+'.'+s.slice(13,14)+'.'+s.slice(14,16)+'.'+s.slice(16,20);
        }
        function badgeAcao(label) {
          if (!label) return '<span style="font-size:11px;color:#9ca3af;font-style:italic">nenhuma ação</span>';
          if (label === 'Visualizar autos digitais') {
            return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 8px;border-radius:4px;background:#EFF6FF;color:#1E40AF">' +
              '<span style="width:5px;height:5px;border-radius:50%;background:#3B82F6;flex-shrink:0;display:inline-block"></span>' +
              'Visualizar autos digitais</span>';
          }
          var tipo = extrairTipoAcao(label);
          var bg = '#F1EFE8', fg = '#444441', dot = '#888780';
          if (tipo === 'Movimentar')       { bg='#EEEDFE'; fg='#3C3489'; dot='#534AB7'; }
          else if (tipo === 'Comunicação') { bg='#E6F1FB'; fg='#0C447C'; dot='#185FA5'; }
          else if (tipo === 'Remover')     { bg='#FCEBEB'; fg='#A32D2D'; dot='#A32D2D'; }
          return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 8px;border-radius:4px;background:' + bg + ';color:' + fg + '">' +
            '<span style="width:5px;height:5px;border-radius:50%;background:' + dot + ';flex-shrink:0;display:inline-block"></span>' +
            esc(label) + '</span>';
        }

        // Célula "Doc. (real)": documento realmente anexado, colorido pelo status de conferência.
        function docRealCell(row) {
          if (!row || !row.doc) return '<span style="color:#d1d5db">—</span>';
          var st = row.docStatus || '', real = row.docReal || '';
          if (st === 'ok')          return '<span style="background:#E6F4EA;color:#067647;border-radius:8px;padding:1px 7px">' + esc(real || '—') + '</span> <span style="color:#067647;font-size:10.5px">✓</span>';
          if (st === 'diverge')     return '<span style="background:#FEF3C7;color:#B45309;border-radius:8px;padding:1px 7px">' + esc(real || '—') + '</span> <span style="color:#B45309;font-size:10.5px">⚠</span>';
          if (st === 'nao_anexado') return '<span style="background:#FCEBEB;color:#A32D2D;border-radius:8px;padding:1px 7px">não anexado</span> <span style="color:#A32D2D;font-size:10.5px">✗</span>';
          return '<span style="color:#9ca3af;font-size:11px">— sem captura</span>';
        }

        sessoes = sessoes.slice().sort(function(a, b) { return (a.inicio || 0) - (b.inicio || 0); });

        // Linhas planas (para exportação TSV)
        var linhas = [];
        var totalAcoes = 0;
        var cnjTodosSet = {};

        // Grupos para exibição na tabela
        var grupos = [];

        sessoes.forEach(function(s) {
          var sessaoLabel = fmtData(s.inicio, s.tipo);
          var dataSessao  = fmtSoData(s.inicio);
          var horaSessao  = fmtHora(s.inicio);
          var tipoSessao  = s.tipo === 'agendamento' ? 'agendamento' : 'manual';
          var procs = s.processos || {};
          var cnjList = Object.keys(procs);
          var grupoRows = [];
          var grupoAcoes = 0;
          var grupoCnjSet = {};

          cnjList.forEach(function(cnj) {
            var p       = procs[cnj];
            var horaAb  = fmtHora(p.horaAbertura);
            var cnjFmt  = formatarCNJ(cnj);
            // Injeta abertura dos autos como primeira ação cronológica
            var acoesBase = (p.acoes || []).slice();
            if (p.horaAbertura) {
              acoesBase.push({ ts: p.horaAbertura, label: 'Visualizar autos digitais' });
            }
            acoesBase.sort(function(a2, b2) { return (a2.ts||0)-(b2.ts||0); });

            if (!acoesBase.length) {
              linhas.push({ sessao:sessaoLabel, data:dataSessao, horaSessao:horaSessao, tipoSessao:tipoSessao, horaAb:horaAb, cnj:cnjFmt, horaAcao:'—', acao:null, tipoAcao:'', materia:'', doc:'', docReal:'', docStatus:'' });
              grupoRows.push({ horaAb:horaAb, cnj:cnjFmt, horaAcao:'—', acao:null, tipoAcao:'', doc:'', docReal:'', docStatus:'' });
            } else {
              grupoCnjSet[cnj] = 1;
              cnjTodosSet[cnj] = 1;
              acoesBase.forEach(function(a) {
                totalAcoes++;
                grupoAcoes++;
                var isVis = a.label === 'Visualizar autos digitais';
                var ta  = isVis ? 'Visualizar' : extrairTipoAcao(a.label);
                var mat = isVis ? 'Visualizar autos digitais' : extrairMateria(a.label);
                var docv = isVis ? '' : (a.doc || '');
                var docR = isVis ? '' : (a.docReal || '');
                var docS = isVis ? '' : (a.docStatus || '');
                linhas.push({ sessao:sessaoLabel, data:dataSessao, horaSessao:horaSessao, tipoSessao:tipoSessao, horaAb:horaAb, cnj:cnjFmt, horaAcao:fmtHora(a.ts), acao:a.label, tipoAcao:ta, materia:mat, doc:docv, docReal:docR, docStatus:docS });
                grupoRows.push({ horaAb:horaAb, cnj:cnjFmt, horaAcao:fmtHora(a.ts), acao:a.label, tipoAcao:ta, doc:docv, docReal:docR, docStatus:docS });
              });
            }
          });
          grupos.push({ id:'s'+String(s.inicio||Date.now()), label:sessaoLabel, tipo:tipoSessao, date:dataSessao, procCount:Object.keys(grupoCnjSet).length, acaoCount:grupoAcoes, rows:grupoRows });
        });

        var totalProcs   = Object.keys(cnjTodosSet).length;
        var nAg          = sessoes.filter(function(s){ return s.tipo==='agendamento'; }).length;
        var nMn          = sessoes.length - nAg;
        var nEtq         = linhas.filter(function(l){ return l.tipoAcao==='Movimentar'; }).length;
        var nCom         = linhas.filter(function(l){ return l.tipoAcao==='Comunicação'; }).length;
        var servidor     = state.servidor || '—';
        var dataRel      = sessoes.length ? fmtSoData(sessoes[0].inicio) : '—';

        // Datas únicas das sessões (para o select de filtro)
        var datesSet = {}, datesList = [];
        grupos.forEach(function(g) {
          if (g.date && !datesSet[g.date]) { datesSet[g.date]=1; datesList.push(g.date); }
        });

        // ── Constrói linhas da tabela ──
        var tbodyHtml = '';
        grupos.forEach(function(g) {
          var isAg   = g.tipo === 'agendamento';
          var sBg    = isAg ? '#EEEDFE' : '#f9fafb';
          var sFg    = isAg ? '#3C3489' : '#6b7280';
          var sBd    = isAg ? '#AFA9EC' : '#e5e7eb';
          var sIcon  = isAg ? '⏰' : '📅';
          var chipAg = isAg
            ? '<span style="font-size:10px;padding:1px 7px;border-radius:20px;background:#CECBF6;color:#26215C">agendamento</span>'
            : '<span style="font-size:10px;padding:1px 7px;border-radius:20px;background:#e5e7eb;color:#6b7280">manual</span>';
          var chipCt = g.acaoCount > 0
            ? '<span style="font-size:10px;padding:1px 7px;border-radius:20px;background:rgba(0,0,0,0.06);color:#6b7280">' + g.procCount + ' proc. · ' + g.acaoCount + ' ações</span>'
            : '<span style="font-size:10px;font-style:italic;color:#9ca3af">nenhuma ação</span>';
          var hasRows = g.rows.length > 0;

          tbodyHtml += '<tr class="pjm-rel-sess" data-sid="' + g.id + '" data-tipo="' + g.tipo + '" data-date="' + esc(g.date) + '" style="cursor:' + (hasRows?'pointer':'default') + '">' +
            '<td colspan="8" style="padding:7px 12px;background:' + sBg + ';border-bottom:0.5px solid ' + sBd + ';border-top:0.5px solid ' + sBd + '">' +
              '<div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:' + sFg + '">' +
                '<span>' + sIcon + '</span>' +
                '<span>' + esc(g.label.replace('⏰ ','')) + '</span>' +
                '<div style="display:flex;gap:5px;margin-left:auto">' + chipAg + chipCt + '</div>' +
                (hasRows ? '<span id="pjm-ic-' + g.id + '" style="font-size:11px;color:' + sFg + ';display:inline-block;transition:transform .15s">▾</span>' : '') +
              '</div>' +
            '</td>' +
          '</tr>';

          g.rows.forEach(function(row) {
            var ta = row.tipoAcao || '';
            var _cnjDig = String(row.cnj||'').replace(/\D/g,''); var _clsO = (state.classePorCnj||{})[_cnjDig]; var _clsNome = (_clsO && _clsO.nome) || '';
            tbodyHtml += '<tr class="pjm-rel-data" data-sid="' + g.id + '" data-stipo="' + g.tipo + '" data-atipo="' + esc(ta) + '">' +
              '<td style="padding:7px 12px;border-bottom:0.5px solid #f3f4f6;vertical-align:middle"></td>' +
              '<td style="padding:7px 12px;border-bottom:0.5px solid #f3f4f6;vertical-align:middle;font-family:monospace;font-size:11px;color:#6b7280;white-space:nowrap">' + esc(row.horaAb) + '</td>' +
              '<td style="padding:7px 12px;border-bottom:0.5px solid #f3f4f6;vertical-align:middle;font-family:monospace;font-size:11px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(row.cnj) + '">' + esc(row.cnj) + '</td>' +
              '<td style="padding:7px 12px;border-bottom:0.5px solid #f3f4f6;vertical-align:middle;font-size:11px">' + (_clsNome ? '<span style="background:#f5eef8;color:#6c3483;border-radius:8px;padding:1px 7px">' + esc(_clsNome) + '</span>' : '<span style="color:#d1d5db">—</span>') + '</td>' +
              '<td style="padding:7px 12px;border-bottom:0.5px solid #f3f4f6;vertical-align:middle;font-family:monospace;font-size:11px;color:#6b7280;white-space:nowrap">' + esc(row.horaAcao) + '</td>' +
              '<td style="padding:7px 12px;border-bottom:0.5px solid #f3f4f6;vertical-align:middle">' + badgeAcao(row.acao) + '</td>' +
              '<td style="padding:7px 12px;border-bottom:0.5px solid #f3f4f6;vertical-align:middle;font-size:11px">' + (row.doc ? '<span style="background:#EEF2F6;color:#374151;border-radius:8px;padding:1px 7px">' + esc(row.doc) + '</span>' : '<span style="color:#d1d5db">—</span>') + '</td>' +
              '<td style="padding:7px 12px;border-bottom:0.5px solid #f3f4f6;vertical-align:middle;font-size:11px">' + docRealCell(row) + '</td>' +
            '</tr>';
          });
        });

        // ── Helper card de estatística ──
        function statCard(lbl, val, sub, smallVal, id) {
          var idV = id ? ' id="'+id+'-val"' : '';
          var idS = id ? ' id="'+id+'-sub"' : '';
          return '<div style="background:#f9fafb;border:0.5px solid #e5e7eb;border-radius:8px;padding:8px 12px">' +
            '<div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">' + esc(lbl) + '</div>' +
            '<div'+idV+' style="font-size:' + (smallVal?'13':'20') + 'px;font-weight:500;' + (smallVal?'margin-top:4px':'') + '">' + esc(String(val)) + '</div>' +
            '<div'+idS+' style="font-size:10px;color:#9ca3af;margin-top:2px">' + esc(sub) + '</div>' +
          '</div>';
        }

        var TH = 'style="padding:8px 12px;text-align:left;font-size:10px;color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:.4px;border-bottom:0.5px solid #e5e7eb;background:#f9fafb"';

        // Producao por classe (agrega a producao; classe via state.classePorCnj)
        var _relPorClasse = {}, _relVistos = {};
        (sessoes || []).forEach(function (se) {
          var procs = (se && se.processos) || {};
          Object.keys(procs).forEach(function (k) {
            var dg = String(k).replace(/\D/g, ''); if (!dg || _relVistos[dg]) return; _relVistos[dg] = 1;
            var cc = state.classePorCnj || {};
            var nome = (cc[dg] && cc[dg].nome) || 'Sem classe';
            _relPorClasse[nome] = (_relPorClasse[nome] || 0) + 1;
          });
        });
        var _relClsSorted = Object.entries(_relPorClasse).sort(function (a, b) { return b[1] - a[1]; });
        var _relClsHtml = _relClsSorted.length ? _relClsSorted.map(function (e) { return '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;background:#f5eef8;color:#6c3483;border:1px solid #e6d6f0;font-size:12px;margin:2px">' + esc(e[0]) + ' <span style="opacity:0.65;font-size:11px">(' + e[1] + ')</span></span>'; }).join('') : '<span style="font-size:11px;color:#9ca3af">Sem dados de classe</span>';

        b.innerHTML =
          // ── Stats bar ──
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">' +
            statCard('Sessões', sessoes.length, nAg+' agend. · '+nMn+' manual', false, 'pjm-st-s') +
            statCard('Processos únicos', totalProcs, 'CNJs distintos', false, 'pjm-st-p') +
            statCard('Ações registradas', totalAcoes, nEtq+' movimentar · '+nCom+' comunicação', false, 'pjm-st-a') +
            statCard('Servidor', servidor, dataRel, true) +
          '</div>' +
          // ── Producao por classe ──
          '<div style="margin-bottom:12px"><div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Produção por classe</div><div style="padding:2px 0">' + _relClsHtml + '</div></div>' +
          // ── Barra de filtros ──
          '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap">' +
            '<span style="font-size:11px;color:#6b7280">Filtrar:</span>' +
            '<button class="pjm-flt" data-f="todos"       style="font-size:11px;padding:3px 10px;border-radius:20px;border:0.5px solid #AFA9EC;background:#EEEDFE;color:#3C3489;cursor:pointer">Todos</button>' +
            '<button class="pjm-flt" data-f="agendamento" style="font-size:11px;padding:3px 10px;border-radius:20px;border:0.5px solid #d1d5db;background:#fff;color:#6b7280;cursor:pointer">Agendamentos</button>' +
            '<button class="pjm-flt" data-f="manual"      style="font-size:11px;padding:3px 10px;border-radius:20px;border:0.5px solid #d1d5db;background:#fff;color:#6b7280;cursor:pointer">Manual</button>' +
            '<span style="display:inline-block;width:0.5px;height:16px;background:#e5e7eb;margin:0 2px"></span>' +
            '<button class="pjm-flt-a" data-fa="Movimentar"  style="font-size:11px;padding:3px 10px;border-radius:20px;border:0.5px solid #d1d5db;background:#fff;color:#6b7280;cursor:pointer">Movimentar</button>' +
            '<button class="pjm-flt-a" data-fa="Comunicação" style="font-size:11px;padding:3px 10px;border-radius:20px;border:0.5px solid #d1d5db;background:#fff;color:#6b7280;cursor:pointer">Comunicação</button>' +
            '<span style="display:inline-block;width:0.5px;height:16px;background:#e5e7eb;margin:0 2px"></span>' +
            '<select id="pjm-flt-data" style="font-size:11px;padding:3px 8px;border-radius:6px;border:0.5px solid #d1d5db;background:#fff;color:#374151;cursor:pointer;outline:none">' +
              '<option value="">Todas as datas</option>' +
              datesList.map(function(d){ return '<option value="'+esc(d)+'">'+esc(d)+'</option>'; }).join('') +
            '</select>' +
          '</div>' +
          // ── Barra de ações e contador ──
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
            '<span id="pjm-rel-count" style="font-size:11px;color:#6b7280">' + totalProcs + ' processo(s) · ' + totalAcoes + ' ação(ões)</span>' +
            '<div style="display:flex;gap:6px">' +
              '<button id="pjm-rel-sheets" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:5px 10px;border-radius:6px;border:0.5px solid #d1d5db;background:#fff;color:#374151;cursor:pointer">📋 Copiar para o Sheets</button>' +
              '<button id="pjm-rel-limpar" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:5px 10px;border-radius:6px;border:0.5px solid #fca5a5;background:#fff;color:#A32D2D;cursor:pointer">🗑️ Limpar</button>' +
            '</div>' +
          '</div>' +
          // ── Tabela ──
          '<div style="border:0.5px solid #e5e7eb;border-radius:8px;overflow:clip;background:#fff">' +
          '<table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed">' +
          '<colgroup><col style="width:4%"><col style="width:8%"><col style="width:20%"><col style="width:12%"><col style="width:7%"><col style="width:20%"><col style="width:14%"><col style="width:15%"></colgroup>' +
          '<thead style="position:sticky;top:0;z-index:10"><tr>' +
            '<th ' + TH + '></th>' +
            '<th ' + TH + '>Autos PJe</th>' +
            '<th ' + TH + '>CNJ</th>' +
            '<th ' + TH + '>Classe</th>' +
            '<th ' + TH + '>Hora</th>' +
            '<th ' + TH + '>Ação</th>' +
            '<th ' + TH + '>Doc. (config)</th>' +
            '<th ' + TH + '>Doc. (real)</th>' +
          '</tr></thead>' +
          '<tbody>' + tbodyHtml + '</tbody>' +
          '</table></div>' +
          // ── Legenda ──
          '<div style="display:flex;align-items:center;justify-content:flex-end;gap:14px;margin-top:8px">' +
            '<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#6b7280"><span style="width:8px;height:8px;border-radius:2px;background:#3B82F6;display:inline-block"></span>visualizar</div>' +
            '<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#6b7280"><span style="width:8px;height:8px;border-radius:2px;background:#534AB7;display:inline-block"></span>movimentar</div>' +
            '<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#6b7280"><span style="width:8px;height:8px;border-radius:2px;background:#185FA5;display:inline-block"></span>comunicação</div>' +
            '<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#6b7280"><span style="width:8px;height:8px;border-radius:2px;background:#A32D2D;display:inline-block"></span>remover</div>' +
          '</div>';

        // ── Estado dos filtros e colapso ──
        var collapsed  = {};
        var filtroTipo = 'todos';
        var filtroAcao = '';
        var filtroData = '';

        // Recalcula e atualiza os cards de estatística com base nos elementos visíveis
        function atualizarEstatisticas() {
          var nSess=0, nVisAg=0, nVisMn=0, nAcoes=0, nEtqV=0, nComV=0, cnjVis={};
          b.querySelectorAll('tr.pjm-rel-sess').forEach(function(sRow) {
            if (sRow.dataset.fmatch !== '0') {                 // conta por filtro, não pelo fold
              nSess++;
              if (sRow.getAttribute('data-tipo') === 'agendamento') nVisAg++; else nVisMn++;
            }
          });
          b.querySelectorAll('tr.pjm-rel-data').forEach(function(dr) {
            if (dr.dataset.fmatch !== '0') {                   // conta por filtro, não pelo fold
              nAcoes++;
              var tdC = dr.querySelectorAll('td')[2];
              if (tdC) { var cv = tdC.textContent.trim(); if (cv && cv !== '—') cnjVis[cv]=1; }
              var at = dr.getAttribute('data-atipo') || '';
              if (at === 'Movimentar') nEtqV++;
              else if (at === 'Comunicação') nComV++;
            }
          });
          var nProcs = Object.keys(cnjVis).length;
          // Indica filtro ativo nos cards (borda colorida)
          var filtroAtivo = filtroTipo !== 'todos' || filtroAcao !== '' || filtroData !== '';
          b.querySelectorAll('#pjm-st-s-val,#pjm-st-s-sub,#pjm-st-p-val,#pjm-st-a-val,#pjm-st-a-sub').forEach(function(el) {
            el.parentElement.style.borderColor = filtroAtivo ? '#AFA9EC' : '#e5e7eb';
          });
          var e; // helpers
          e=b.querySelector('#pjm-st-s-val'); if(e) e.textContent=String(nSess);
          e=b.querySelector('#pjm-st-s-sub'); if(e) e.textContent=nVisAg+' agend. · '+nVisMn+' manual';
          e=b.querySelector('#pjm-st-p-val'); if(e) e.textContent=String(nProcs);
          e=b.querySelector('#pjm-st-a-val'); if(e) e.textContent=String(nAcoes);
          e=b.querySelector('#pjm-st-a-sub'); if(e) e.textContent=nEtqV+' movimentar · '+nComV+' comunicação';
          e=b.querySelector('#pjm-rel-count'); if(e) e.textContent=nProcs+' processo(s) · '+nAcoes+' ação(ões) visível(eis)';
        }

        function aplicarFiltros() {
          b.querySelectorAll('tr.pjm-rel-sess').forEach(function(sRow) {
            var sid   = sRow.getAttribute('data-sid');
            var stipo = sRow.getAttribute('data-tipo');
            var sdate = sRow.getAttribute('data-date') || '';
            var mostrar = (filtroTipo === 'todos' || filtroTipo === stipo) &&
                          (!filtroData || sdate === filtroData);
            sRow.style.display = mostrar ? '' : 'none';
            sRow.dataset.fmatch = mostrar ? '1' : '0';                 // casa com o filtro (independe do fold)
            b.querySelectorAll('tr.pjm-rel-data[data-sid="' + sid + '"]').forEach(function(dr) {
              var aTipo  = dr.getAttribute('data-atipo') || '';
              var visAcao = !filtroAcao || aTipo === filtroAcao || aTipo.indexOf(filtroAcao) >= 0;
              var fmatch = mostrar && visAcao;
              dr.dataset.fmatch = fmatch ? '1' : '0';                  // estatística usa isto; display também respeita o fold
              dr.style.display = (fmatch && !collapsed[sid]) ? '' : 'none';
            });
          });
          atualizarEstatisticas();
        }

        // Colapso por sessão
        b.querySelectorAll('tr.pjm-rel-sess').forEach(function(row) {
          var sid = row.getAttribute('data-sid');
          row.addEventListener('click', function() {
            collapsed[sid] = !collapsed[sid];
            var ic = b.querySelector('#pjm-ic-' + sid);
            if (ic) ic.style.transform = collapsed[sid] ? 'rotate(-90deg)' : '';
            aplicarFiltros();
          });
        });

        // Recolhido por padrão: ao abrir a aba, todas as sessões começam dobradas.
        // (Os cards de resumo seguem os filtros, não o fold — ver atualizarEstatisticas.)
        grupos.forEach(function(g) {
          collapsed[g.id] = true;
          var ic0 = b.querySelector('#pjm-ic-' + g.id);
          if (ic0) ic0.style.transform = 'rotate(-90deg)';
        });
        aplicarFiltros();

        // Filtro por tipo de sessão
        b.querySelectorAll('.pjm-flt').forEach(function(btn) {
          btn.addEventListener('click', function() {
            filtroTipo = btn.getAttribute('data-f');
            b.querySelectorAll('.pjm-flt').forEach(function(b2) {
              b2.style.background='#fff'; b2.style.color='#6b7280'; b2.style.borderColor='#d1d5db';
            });
            btn.style.background='#EEEDFE'; btn.style.color='#3C3489'; btn.style.borderColor='#AFA9EC';
            aplicarFiltros();
          });
        });

        // Filtro por tipo de ação
        b.querySelectorAll('.pjm-flt-a').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var val = btn.getAttribute('data-fa');
            if (filtroAcao === val) {
              filtroAcao = '';
              b.querySelectorAll('.pjm-flt-a').forEach(function(b2) {
                b2.style.background='#fff'; b2.style.color='#6b7280'; b2.style.borderColor='#d1d5db';
              });
            } else {
              filtroAcao = val;
              b.querySelectorAll('.pjm-flt-a').forEach(function(b2) {
                b2.style.background='#fff'; b2.style.color='#6b7280'; b2.style.borderColor='#d1d5db';
              });
              var isMov = val === 'Movimentar';
              btn.style.background   = isMov ? '#EEEDFE' : '#E6F1FB';
              btn.style.color        = isMov ? '#3C3489' : '#0C447C';
              btn.style.borderColor  = isMov ? '#AFA9EC' : '#85B7EB';
            }
            aplicarFiltros();
          });
        });

        // Filtro por data
        var selData = b.querySelector('#pjm-flt-data');
        if (selData) selData.addEventListener('change', function() {
          filtroData = selData.value;
          // Destaca o select quando há filtro de data ativo
          selData.style.borderColor  = filtroData ? '#AFA9EC' : '#d1d5db';
          selData.style.color        = filtroData ? '#3C3489' : '#374151';
          selData.style.background   = filtroData ? '#EEEDFE' : '#fff';
          aplicarFiltros();
        });

        // Copiar para Sheets — TSV 13 colunas (+ Doc_Config, Doc_Real, Confere ao final)
        var btnSheets = b.querySelector('#pjm-rel-sheets');
        if (btnSheets) btnSheets.addEventListener('click', function() {
          var srv = state.servidor || '—';
          var _conf = { ok:'OK', diverge:'DIVERGE', nao_anexado:'NÃO ANEXADO' };
          var tsv = 'Servidor\tData\tHora_Sessao\tTipo_Sessao\tCNJ\tClasse\tHora_Acao\tAcao\tTipo_Acao\tMateria\tDoc_Config\tDoc_Real\tConfere\n';
          linhas.forEach(function(l) {
            if (!l.acao) return;
            tsv += [srv, l.data, l.horaSessao, l.tipoSessao, l.cnj, ((state.classePorCnj||{})[String(l.cnj||'').replace(/\D/g,'')]||{}).nome||'', l.horaAcao, l.acao, l.tipoAcao, l.materia, l.doc||'', l.docReal||'', (l.doc ? (_conf[l.docStatus]||'') : '')].join('\t') + '\n';
          });
          navigator.clipboard.writeText(tsv).then(function() {
            btnSheets.textContent = '✅ Copiado!';
            setTimeout(function() { btnSheets.innerHTML = '📋 Copiar para o Sheets'; }, 2000);
          }).catch(function() { alert('Não foi possível copiar. Use Ctrl+C no resultado.'); });
        });

        // Limpar relatório
        var btnLimpar = b.querySelector('#pjm-rel-limpar');
        if (btnLimpar) btnLimpar.addEventListener('click', function() {
          if (!confirm('Limpar todo o histórico do Relatório?')) return;
          chrome.storage.local.remove('pjmRelatorio', function() { renderRelatorio(); });
        });
      });

      return '<div class="center"><div class="spin"></div></div>';
    }

    // ════════════════════════════════════════════════════════════════
    // ABA AGENDAMENTOS
    // ════════════════════════════════════════════════════════════════
    var AG_PG_SIZE = 10;

    function renderAgendamentos() {
      // Data LOCAL (não UTC): toISOString() devolve UTC e, à noite no Brasil (UTC-3),
      // viraria o dia seguinte — fazendo o agendamento "pular" para amanhã.
      var _hj = new Date();
      var hoje = _hj.getFullYear() + '-' + String(_hj.getMonth() + 1).padStart(2, '0') + '-' + String(_hj.getDate()).padStart(2, '0');
      // Exibição 'yyyy-mm-dd' -> 'dd/mm/yyyy'.
      function fmtDataBR(iso) { var p = (iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : (iso || ''); }
      var etqAtivas  = state.etiquetaRegras.filter(function(r) { return r.ativo !== false; });
      var prepAtivas = state.prepComunicacaoRegras.filter(function(r) { return r.ativo !== false; });

      var optRegras = etqAtivas.map(function(r) {
        return '<option value="' + esc(r.id) + '">' + esc(r.etiqueta) + (r.pipeline ? ' [' + r.pipeline.length + ' etapas]' : '') + '</option>';
      }).join('') || '<option value="">— nenhuma regra cadastrada —</option>';
      var optPrep = prepAtivas.map(function(r) {
        return '<option value="' + esc(r.id) + '">' + esc(r.etiqueta) + ' → ' + esc(r.tarefa || 'Preparar comunicação') + '</option>';
      }).join('') || '<option value="">— nenhuma regra cadastrada —</option>';

      // ── Contadores ──
      var total = state.agendamentos.length;
      var nAg   = state.agendamentos.filter(function(i){ return i.status === 'aguardando'; }).length;
      var nFt   = state.agendamentos.filter(function(i){ return i.status === 'feito'; }).length;
      var nVc   = state.agendamentos.filter(function(i){ return i.status === 'vencido'; }).length;
      var podeLimpar = state.agendamentos.some(function(i){ return i.status === 'feito' && i.tipo === 0; });

      var header =
        '<div class="ag-hdr">' +
          '<span class="ag-hdr-title">🗓️ Agendamentos</span>' +
          '<span class="ag-hdr-stats">' + total + ' registro' + (total !== 1 ? 's' : '') +
            (nAg ? ' · <strong style="color:#92400e">' + nAg + ' aguardando</strong>' : '') +
            (nFt ? ' · <strong style="color:#065f46">' + nFt + ' concluído' + (nFt !== 1 ? 's' : '') + '</strong>' : '') +
            (nVc ? ' · <strong style="color:#991b1b">' + nVc + ' vencido' + (nVc !== 1 ? 's' : '') + '</strong>' : '') +
          '</span>' +
          (podeLimpar ? '<button class="btn-ag-limpar" id="btnAgLimpar">✕ Limpar concluídos</button>' : '') +
        '</div>';

      // ── Formulário (painel esquerdo) ──
      var form =
        '<div class="ag-form-panel">' +
        '<div class="ag-panel-title">＋ Novo agendamento</div>' +
        '<div class="ag-form-row"><label class="ag-lbl">Ação</label>' +
        '<select id="agSelAcao" class="ag-sel">' +
          '<option value="mover">Movimentar</option>' +
          '<option value="comunicar">Preparar Comunicação</option>' +
          '<option value="mover+comunicar">Movimentar + Comunicação</option>' +
        '</select></div>' +
        '<div id="agWrapRegra" class="ag-form-row"><label class="ag-lbl">Regra de movimentação</label>' +
        '<select id="agSelRegra" class="ag-sel"><option value="">— selecione —</option>' + optRegras + '</select></div>' +
        '<div id="agWrapRegraC" class="ag-form-row" style="display:none"><label class="ag-lbl">Regra de comunicação</label>' +
        '<select id="agSelRegraC" class="ag-sel"><option value="">— selecione —</option>' + optPrep + '</select></div>' +
        '<div class="ag-form-row"><label class="ag-lbl">CNJ específico <span style="font-weight:400;font-size:10px;text-transform:none">(opcional)</span></label>' +
        '<input id="agInputCnj" type="text" class="ag-inp" placeholder="0000001-11.2024.8.26.0000"></div>' +
        '<div class="ag-form-row"><label class="ag-lbl">Tipo de disparo</label>' +
        '<div class="ag-tipo-btns">' +
          '<label class="ag-tipo-btn sel" id="agLabelTipo0"><input type="radio" name="agTipo" value="0" checked> ⏰ Data/hora exata</label>' +
          '<label class="ag-tipo-btn" id="agLabelTipo1"><input type="radio" name="agTipo" value="1"> 📲 Ao abrir PJe</label>' +
        '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
          '<div><label class="ag-lbl">Data <span style="color:#dc2626">*</span></label>' +
          '<input id="agInputData" type="date" class="ag-inp" value="' + esc(hoje) + '"></div>' +
          '<div><label class="ag-lbl">Hora <span id="agHoraOpc" style="font-weight:400;text-transform:none;font-size:10px">(obrigatória)</span></label>' +
          '<input id="agInputHora" type="time" class="ag-inp"></div>' +
        '</div>' +
        '<button class="btn-ag-save" id="btnAgSave">✚ Agendar</button>' +
        '<div id="agFeedback" style="display:none;margin-top:10px;padding:10px;border-radius:6px;font-size:13px"></div>' +
        '</div>';

      // ── Painel direito: busca + filtros + lista ──
      var buscaHtml =
        '<div class="ag-search-wrap"><span class="ag-search-icon">🔍</span>' +
        '<input id="agBuscaInp" class="ag-search-inp" type="text" placeholder="Buscar CNJ ou etiqueta..." value="' + esc(state.agBusca || '') + '"></div>';

      var filtrosHtml =
        '<div class="ag-filters-row">' +
        '<select id="agSelStatus" class="ag-sel">' +
          '<option value="todos"' + (state.agFiltro === 'todos' ? ' selected' : '') + '>Todos os status</option>' +
          '<option value="aguardando"' + (state.agFiltro === 'aguardando' ? ' selected' : '') + '>⏳ Aguardando</option>' +
          '<option value="feito"' + (state.agFiltro === 'feito' ? ' selected' : '') + '>✅ Concluídos</option>' +
          '<option value="vencido"' + (state.agFiltro === 'vencido' ? ' selected' : '') + '>⚠️ Vencidos</option>' +
        '</select>' +
        '<select id="agSelModo" class="ag-sel">' +
          '<option value="todos"' + (state.agFiltroModo === 'todos' ? ' selected' : '') + '>Todos os modos</option>' +
          '<option value="0"' + (state.agFiltroModo === '0' ? ' selected' : '') + '>⏰ Data/hora exata</option>' +
          '<option value="1"' + (state.agFiltroModo === '1' ? ' selected' : '') + '>📲 Ao abrir PJe</option>' +
        '</select>' +
        '</div>';

      // ── Filtragem ──
      var busca = (state.agBusca || '').toLowerCase().trim();
      var lista = state.agendamentos.filter(function(i) {
        if (state.agFiltro !== 'todos' && i.status !== state.agFiltro) return false;
        if (state.agFiltroModo !== 'todos' && String(i.tipo) !== state.agFiltroModo) return false;
        if (busca && (i.alvo || '').toLowerCase().indexOf(busca) < 0) return false;
        return true;
      });

      var totalPgs = Math.max(1, Math.ceil(lista.length / AG_PG_SIZE));
      if (state.agPagina > totalPgs) state.agPagina = totalPgs;
      var fatia = lista.slice((state.agPagina - 1) * AG_PG_SIZE, state.agPagina * AG_PG_SIZE);

      var listHtml;
      if (lista.length === 0) {
        var msgEmpty = busca ? 'Nenhum resultado para "' + esc(busca) + '".' :
          (state.agFiltro !== 'todos' || state.agFiltroModo !== 'todos' ? 'Nenhum agendamento com este filtro.' : 'Nenhum agendamento cadastrado.');
        listHtml = '<div class="ag-vazio">' + msgEmpty + '</div>';
      } else {
        listHtml = fatia.map(function(item) {
          var ex    = item.status === 'executando';
          var bCls  = item.status === 'feito' ? 'ag-badge-ft' : item.status === 'vencido' ? 'ag-badge-vc' : 'ag-badge-ag';
          var bTxt  = item.status === 'feito' ? '✅ Feito' : item.status === 'vencido' ? '⚠️ Vencido' : ex ? '▶️ Executando' : '⏳ Aguardando';
          var tipo  = item.tipo === 1 ? '📲 Ao abrir PJe' : '⏰ ' + fmtDataBR(item.data) + (item.hora ? ' às ' + item.hora : '');
          var acao  = { mover:'Movimentar', comunicar:'Comunicar', 'mover+comunicar':'Mover+Com.' }[item.acao] || item.acao;
          var execI = item.execAt ? ' · exec. ' + item.execAt : '';
          return '<div class="ag-item">' +
            '<div class="ag-item-header">' +
              '<span class="ag-item-alvo" title="' + esc(item.alvo) + '">' + esc(item.alvo || '—') + '</span>' +
              '<span class="ag-badge ' + bCls + '"' + (ex ? ' style="background:#2563eb;color:#fff"' : '') + '>' + bTxt + '</span>' +
              (item.status === 'aguardando' ? '<button class="ag-cancel-btn" data-ag-cancel="' + esc(item.id) + '">Cancelar</button>' : '') +
            '</div>' +
            '<div class="ag-item-meta">' + esc(acao) + ' · ' + esc(tipo) + esc(execI) + '</div>' +
            '</div>';
        }).join('');
        if (totalPgs > 1) {
          listHtml += '<div class="ag-pag">' +
            '<button id="agPgPrev"' + (state.agPagina <= 1 ? ' disabled' : '') + '>‹ Ant.</button>' +
            '<span>' + state.agPagina + ' / ' + totalPgs + '</span>' +
            '<button id="agPgNext"' + (state.agPagina >= totalPgs ? ' disabled' : '') + '>Próx. ›</button>' +
            '</div>';
        }
      }

      var subtitulo = lista.length !== total
        ? ' (' + lista.length + ' de ' + total + ')'
        : (total ? ' (' + total + ')' : '');
      var listaPanel =
        '<div class="ag-list-panel">' +
        '<div class="ag-panel-title">📋 Agendamentos' + subtitulo + '</div>' +
        buscaHtml + filtrosHtml + listHtml +
        '</div>';

      return header + '<div class="ag-layout">' + form + listaPanel + '</div>';
    }

    function wireAgendamentos() {
      if (state.tab !== 'agendamentos') return;

      var selAcao    = $('agSelAcao');
      var wrapRegra  = $('agWrapRegra');
      var wrapRegraC = $('agWrapRegraC');

      function atualizarCamposAcao() {
        if (!selAcao) return;
        var acao  = selAcao.value;
        var mover = acao === 'mover' || acao === 'mover+comunicar';
        var comun = acao === 'comunicar' || acao === 'mover+comunicar';
        if (wrapRegra)  wrapRegra.style.display  = mover ? '' : 'none';
        if (wrapRegraC) wrapRegraC.style.display = comun ? '' : 'none';
      }
      if (selAcao) selAcao.addEventListener('change', atualizarCamposAcao);
      atualizarCamposAcao();

      // Tipo de disparo
      shadow.querySelectorAll('input[name="agTipo"]').forEach(function(r) {
        r.addEventListener('change', function() {
          var isTipo1 = shadow.querySelector('input[name="agTipo"][value="1"]') && shadow.querySelector('input[name="agTipo"][value="1"]').checked;
          var opc = $('agHoraOpc');
          if (opc) opc.textContent = isTipo1 ? '(opcional)' : '(obrigatória)';
          var lbl0 = $('agLabelTipo0'); var lbl1 = $('agLabelTipo1');
          if (lbl0) lbl0.classList.toggle('sel', !isTipo1);
          if (lbl1) lbl1.classList.toggle('sel', isTipo1);
        });
      });

      // Busca
      var buscaInp = $('agBuscaInp');
      if (buscaInp) {
        buscaInp.addEventListener('input', function() {
          state.agBusca  = buscaInp.value;
          state.agPagina = 1;
          render();
        });
      }

      // Filtro de status
      var selStatus = $('agSelStatus');
      if (selStatus) {
        selStatus.addEventListener('change', function() {
          state.agFiltro = selStatus.value;
          state.agPagina = 1;
          render();
        });
      }

      // Filtro de modo
      var selModo = $('agSelModo');
      if (selModo) {
        selModo.addEventListener('change', function() {
          state.agFiltroModo = selModo.value;
          state.agPagina     = 1;
          render();
        });
      }

      // Paginação
      var pgPrev = $('agPgPrev');
      var pgNext = $('agPgNext');
      if (pgPrev) pgPrev.addEventListener('click', function() { state.agPagina--; render(); });
      if (pgNext) pgNext.addEventListener('click', function() { state.agPagina++; render(); });

      // Cancelar agendamento
      shadow.querySelectorAll('[data-ag-cancel]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.dataset.agCancel;
          if (!id) return;
          chrome.runtime.sendMessage({ type: 'PJM_CANCELAR_AGENDAMENTO', id: id }, function() {
            state.agendamentos = state.agendamentos.filter(function(i) { return i.id !== id; });
            render();
          });
        });
      });

      // Limpar concluídos — remove apenas tipo=0 (Data/hora exata) com status feito
      var btnLimpar = $('btnAgLimpar');
      if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
          var removidos = state.agendamentos.filter(function(i) { return i.status === 'feito' && i.tipo === 0; });
          if (!removidos.length) return;
          state.agendamentos = state.agendamentos.filter(function(i) { return !(i.status === 'feito' && i.tipo === 0); });
          try {
            chrome.storage.local.set({ pjmAgendamentos: state.agendamentos });
            removidos.forEach(function(item) {
              try { chrome.runtime.sendMessage({ type: 'PJM_CANCELAR_AGENDAMENTO', id: item.id }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
            });
          } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          render();
        });
      }

      // Salvar
      var btnSave = $('btnAgSave');
      if (btnSave) {
        btnSave.addEventListener('click', function() {
          var acao  = selAcao ? selAcao.value : 'mover';
          var data  = $('agInputData') ? $('agInputData').value : '';
          var hora  = $('agInputHora') ? $('agInputHora').value : '';
          var cnj   = $('agInputCnj')  ? $('agInputCnj').value.trim() : '';
          var tipo  = (shadow.querySelector('input[name="agTipo"][value="1"]') && shadow.querySelector('input[name="agTipo"][value="1"]').checked) ? 1 : 0;
          var mover = acao === 'mover' || acao === 'mover+comunicar';
          var comun = acao === 'comunicar' || acao === 'mover+comunicar';

          function fb(msg, ok) {
            var el = $('agFeedback'); if (!el) return;
            el.textContent = msg;
            el.style.display = 'block';
            el.style.background = ok ? '#d1fae5' : '#fee2e2';
            el.style.color = ok ? '#065f46' : '#991b1b';
            el.style.borderLeft = '4px solid ' + (ok ? '#10b981' : '#dc2626');
          }

          if (!data) { fb('⚠️ Informe a data.', false); return; }
          if (tipo === 0 && !hora) { fb('⚠️ Para disparo por horário exato informe a hora.', false); return; }

          chrome.storage.local.get(['etiquetaRegras', 'prepComunicacaoRegras'], function(r) {
            var etqR  = Array.isArray(r.etiquetaRegras)        ? r.etiquetaRegras        : [];
            var prepR = Array.isArray(r.prepComunicacaoRegras) ? r.prepComunicacaoRegras  : [];
            var regras = [], regrasC = [], alvo = cnj || '';

            if (mover) {
              var idReg = $('agSelRegra') ? $('agSelRegra').value : '';
              if (!idReg) { fb('⚠️ Selecione a regra de movimentação.', false); return; }
              var regra = etqR.find(function(x) { return x.id === idReg; });
              if (!regra) { fb('⚠️ Regra não encontrada.', false); return; }
              regras = [regra];
              if (!alvo) alvo = regra.etiqueta;
            }
            if (comun) {
              var idRegC = $('agSelRegraC') ? $('agSelRegraC').value : '';
              if (!idRegC) { fb('⚠️ Selecione a regra de comunicação.', false); return; }
              var regraC = prepR.find(function(x) { return x.id === idRegC; });
              if (!regraC) { fb('⚠️ Regra de comunicação não encontrada.', false); return; }
              regrasC = [regraC];
              if (!alvo) alvo = regraC.etiqueta;
            }

            var item = {
              id:                'ag_' + Date.now().toString(36),
              modo:              cnj ? 'cnj' : 'etiqueta',
              alvo:              alvo,
              acao:              acao,
              tipo:              tipo,
              data:              data,
              hora:              hora,
              status:            'aguardando',
              regras:            regras,
              regrasComunicacao: regrasC,
              ts:                Date.now(),
              execAt:            '',
            };

            chrome.runtime.sendMessage({ type: 'PJM_AGENDAR', item: item }, function(res) {
              if (res && res.ok) {
                // NÃO empurrar no state aqui: o storage.onChanged sincroniza a lista a
                // partir do storage. O push duplicava o item (corrida push x onChanged).
                fb('✅ Agendado para ' + data + (hora ? ' às ' + hora : '') + '.', true);
                if ($('agInputCnj'))  $('agInputCnj').value  = '';
                if ($('agInputHora')) $('agInputHora').value = '';
              } else {
                fb('❌ Erro ao salvar agendamento.', false);
              }
            });
          });
        });
      }
    }

    function render() {
      var b = $('body');
      if (!b) return;

      if (state.coletando) {
        b.innerHTML = renderProg();
      } else if (!state.resultado && state.tab !== 'config' && state.tab !== 'juntada' && state.tab !== 'etiquetas' && state.tab !== 'relatorio' && state.tab !== 'agendamentos' && state.tab !== 'prazos' && state.tab !== 'fases') {
        b.innerHTML = renderBoasVindas();
      } else {
        if (state.tab === 'config')           b.innerHTML = renderConfig();
        else if (state.tab === 'resumo')      b.innerHTML = renderResumo();
        else if (state.tab === 'tarefas')     b.innerHTML = renderTarefas();
        else if (state.tab === 'processos')   b.innerHTML = renderProcessos();
        else if (state.tab === 'juntada')     b.innerHTML = renderJuntada();
        else if (state.tab === 'etiquetas')   b.innerHTML = renderEtiquetas();
        else if (state.tab === 'agendamentos') { b.innerHTML = renderAgendamentos(); }
        else if (state.tab === 'prazos')      { b.innerHTML = renderPrazos(); }
        else if (state.tab === 'fases')       { b.innerHTML = renderFases(); }
        else if (state.tab === 'relatorio')   { b.innerHTML = renderRelatorio(); return; }
      }

      // ativa tab
      shadow.querySelectorAll('.tab').forEach(function(t) {
        t.classList.toggle('act', t.dataset.t === state.tab);
      });

      // Sobrepõe o modal se estiver aberto
      if (state.tarefasSel.aberto) {
        b.innerHTML += renderModalTarefas();
      }
      if (state.tiposDoc.aberto) {
        b.innerHTML += renderModalTipos();
      }
      if (state.marcoDoc.aberto) {
        b.innerHTML += renderModalMarcos();
      }
      if (state.kpiDoc.aberto) {
        b.innerHTML += renderModalKpis();
      }
      if (state.kpiPresetDoc.aberto) {
        b.innerHTML += renderModalPresets();
      }
      if (state.extAtalhos.aberto) {
        b.innerHTML += renderModalAtalhos();
      }

      wireBody();
    }


    // ── Fila de ações por processo ────────────────────────────
    function wireFila() {

      // ─ Utilitário: posiciona dropdown com position:fixed ─
      function openDropdown(menu, anchor) {
        shadow.querySelectorAll('.pjm-dd-menu.open').forEach(function(m) { m.classList.remove('open'); });
        var r = anchor.getBoundingClientRect();
        var menuMaxH = 240;
        var spaceBelow = window.innerHeight - r.bottom - 6;
        if (spaceBelow < menuMaxH && r.top > menuMaxH) {
          // Abrir para cima
          menu.style.top  = '';
          menu.style.bottom = (window.innerHeight - r.top + 4) + 'px';
        } else {
          menu.style.bottom = '';
          menu.style.top  = (r.bottom + 4) + 'px';
        }
        menu.style.left = Math.min(r.left, window.innerWidth - 310) + 'px';
        menu.classList.add('open');
      }

      // Fecha dropdowns ao clicar fora (capture phase)
      var painel = shadow.querySelector('.panel');
      if (painel) {
        painel.addEventListener('click', function(ev) {
          // Não fecha quando o clique é DENTRO do menu ou no botão que o abre —
          // senão a captura fecha o menu no mesmo clique que deveria selecionar o item.
          var t = ev && ev.target;
          if (t && t.closest && t.closest('.pjm-dd-menu, .pjm-dd-wrap')) return;
          shadow.querySelectorAll('.pjm-dd-menu.open').forEach(function(m) { m.classList.remove('open'); });
        }, true);
      }

      // Barra global: cancelar
      var btnCancelar = $('pjmFilaCancelar');
      if (btnCancelar) {
        btnCancelar.addEventListener('click', function(e) {
          e.stopPropagation();
          state.procSteps = {};
          state.executandoFila = false; try { chrome.storage.local.set({ pjmExecutandoFila: 0 }); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); }
          render();
        });
      }

      // Barra global: executar tudo
      var btnExecAll = $('pjmFilaExecAll');
      if (btnExecAll && !state.executandoFila) {
        btnExecAll.addEventListener('click', function(e) {
          e.stopPropagation();
          execTodasAsFilas();
        });
      }

      // Híbrido: atualizar lista (re-mapeia o PJe e reconcilia os marcadores)
      var btnAtualizarLista = $('pjmAtualizarLista');
      if (btnAtualizarLista) {
        btnAtualizarLista.addEventListener('click', function(e) {
          e.stopPropagation();
          // Atualiza via API (varredura Minhas Tarefas), sem abrir aba. Fallback: método antigo.
          if (window.PJeColetorAPI && window.PJeColetorAPI.coletarTudo) {
            setLoading('Atualizando via API (Minhas Tarefas)…');
            window.PJeColetorAPI.coletarTudo().then(function(res) {
              showResult(res);
            }).catch(function(err) {
              console.warn('[PJeOverlay] Atualizar lista via API falhou, usando metodo antigo:', err);
              iniciarAuto();
            });
            return;
          }
          iniciarAuto();
        });
      }

      // Toggle: re-mapear automaticamente as tarefas afetadas ao terminar a fila
      var chkRemap = $('pjmRemapPosAcao');
      if (chkRemap) {
        chkRemap.addEventListener('change', function(e) {
          e.stopPropagation();
          state.cfg.remapPosAcao = chkRemap.checked;
          saveCfg();
        });
      }

      // ─ Checkboxes: selecionar para abrir em sequência (máx. 5 por sanfona) ─
      if (!state.selectedPids) state.selectedPids = {};
      shadow.querySelectorAll('.pjm-proc-chk').forEach(function(chk) {
        chk.addEventListener('change', function() {
          var pid = chk.dataset.pid;
          // Encontrar o container da sanfona
          var row = chk.closest('tr');
          var tbody = row && row.closest('tbody');
          var table = tbody && tbody.closest('table');
          var container = table && table.parentElement;
          var bulkBar = container && container.querySelector('.pjm-bulk-toolbar');

          if (chk.checked) {
            // Contar já selecionados nesta sanfona (máx 5)
            var selNaSanfona = [];
            if (container) {
              container.querySelectorAll('.pjm-proc-chk').forEach(function(c) {
                if (state.selectedPids[c.dataset.pid]) selNaSanfona.push(c.dataset.pid);
              });
            }
            if (selNaSanfona.length >= 5) {
              chk.checked = false; // bloqueia 6º
              return;
            }
            state.selectedPids[pid] = true;
          } else {
            delete state.selectedPids[pid];
          }

          // Atualizar barra
          if (bulkBar) {
            var selecionados = [];
            if (container) {
              container.querySelectorAll('.pjm-proc-chk').forEach(function(c) {
                if (state.selectedPids[c.dataset.pid]) selecionados.push(c.dataset.pid);
              });
            }
            var countEl = bulkBar.querySelector('.pjm-bulk-count');
            if (countEl) countEl.textContent = selecionados.length;
            bulkBar.classList.toggle('visible', selecionados.length > 0);
          }
        });
      });

      // ─ Botão "Limpar seleção" ─
      shadow.querySelectorAll('.pjm-bulk-clear-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var container = btn.closest('.pjm-bulk-toolbar') && btn.closest('.pjm-bulk-toolbar').parentElement;
          if (container) {
            container.querySelectorAll('.pjm-proc-chk').forEach(function(c) {
              delete state.selectedPids[c.dataset.pid];
              c.checked = false;
            });
          }
          var bulkBar = btn.closest('.pjm-bulk-toolbar');
          if (bulkBar) {
            var countEl = bulkBar.querySelector('.pjm-bulk-count');
            if (countEl) countEl.textContent = '0';
            bulkBar.classList.remove('visible');
          }
        });
      });

      // ─ Botão "Elaborar ato" (define o modelo dos processos selecionados — Fase 1) ─
      shadow.querySelectorAll('.pjm-bulk-ato-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var container = btn.closest('.pjm-bulk-toolbar') && btn.closest('.pjm-bulk-toolbar').parentElement;
          var cnjs = [];
          if (container) {
            container.querySelectorAll('.pjm-proc-chk').forEach(function(c) {
              if (state.selectedPids[c.dataset.pid]) { var d = String(c.dataset.cnj || '').replace(/[^0-9]/g, ''); if (d) cnjs.push(d); }
            });
          }
          if (!cnjs.length) { alert('Selecione ao menos um processo.'); return; }
          abrirBulkAtoModal(cnjs);
        });
      });

      // ─ Botão "Etiquetar em lote": abre o menu das regras de Vincular ─
      shadow.querySelectorAll('.pjm-bulk-etq-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (state.executandoFila) { alert('Aguarde a fila atual terminar.'); return; }
          var sanfonaIdx = parseInt(btn.dataset.sanfona, 10);
          var bar = shadow.getElementById('pjmBulkBar_' + sanfonaIdx);
          var container = bar && bar.parentElement;
          var cnjs = [];
          if (container) {
            container.querySelectorAll('.pjm-proc-chk').forEach(function(c) {
              if (state.selectedPids[c.dataset.pid]) { var d = String(c.dataset.cnj || '').replace(/[^0-9]/g, ''); if (d) cnjs.push(d); }
            });
          }
          if (!cnjs.length) { alert('Selecione ao menos um processo.'); return; }
          var tarefaSanfona = (state.resultado && state.resultado.tarefas && state.resultado.tarefas[sanfonaIdx] && state.resultado.tarefas[sanfonaIdx].nome) || '';
          abrirBulkVincularModal(cnjs, tarefaSanfona);
        });
      });

      // ─ "Etiquetar em lote": agora abre o modal multi-seleção (abrirBulkVincularModal),
      //   no handler do botão acima. O antigo dropdown de itens foi removido. ─

      // ─ Botão "Abrir no PJe em sequência" ─
      shadow.querySelectorAll('.pjm-bulk-seq-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          try { aplicarHrefsDoMapa(); } catch (_) { /* noop */ }
          var container = btn.closest('.pjm-bulk-toolbar') && btn.closest('.pjm-bulk-toolbar').parentElement;
          var pids = [];
          if (container) {
            container.querySelectorAll('.pjm-proc-chk').forEach(function(c) {
              if (state.selectedPids[c.dataset.pid]) pids.push(c.dataset.pid);
            });
          }
          if (!pids.length) return;

          // Abertura DIRETA em lote (N abas, monta cada URL do zero) quando todos têm idProcesso.
          var _dir = pids.map(function (p) { return { cnj: p, idProcesso: idProcessoDeCnj(p) }; });
          if (_dir.length && _dir.every(function (x) { return x.idProcesso; })) {
            btn.disabled = true;
            var _barD = btn.closest('.pjm-bulk-toolbar'); var _lblD = _barD && _barD.querySelector('.pjm-bulk-label'); var _origD = _lblD ? _lblD.innerHTML : '';
            if (_lblD) _lblD.innerHTML = '↗ Abrindo ' + _dir.length + ' direto…';
            try {
              chrome.runtime.sendMessage({ type: 'PJM_ABRIR_AUTOS_DIRETO', itens: _dir }, function () {
                setTimeout(function () { btn.disabled = false; if (_lblD) _lblD.innerHTML = _origD; }, 2500);
              });
            } catch (e) { console.warn('[PJM fullscreen-overlay]', e); btn.disabled = false; if (_lblD) _lblD.innerHTML = _origD; }
            return;
          }

          // Buscar href de tarefa para cada CNJ selecionado
          var ts = (state.resultado && state.resultado.tarefas) || [];
          function getHrefTarefa(cnj) {
            for (var i = 0; i < ts.length; i++) {
              var t = ts[i];
              if (!t.processos || !t.href) continue;
              for (var j = 0; j < t.processos.length; j++) {
                var pn = String((t.processos[j]||{}).numero||'').replace(/[^0-9]/g,'');
                if (pn === cnj) return t.href;
              }
            }
            return '';
          }

          btn.disabled = true;
          var bulkBar  = btn.closest('.pjm-bulk-toolbar');
          var labelEl  = bulkBar && bulkBar.querySelector('.pjm-bulk-label');
          var original = labelEl ? labelEl.innerHTML : '';

          // Monta lista de {cnj, pagina} e envia UM único comando sequencial
          var ts = (state.resultado && state.resultado.tarefas) || [];
          var sanfonaIdx = parseInt(btn.dataset.sanfona, 10);
          var tarefa = ts[sanfonaIdx];

          var selCnjs = pids.map(function(cnj) {
            var pagina = 1;
            for (var ti = 0; ti < ts.length; ti++) {
              var procs = ts[ti].processos || [];
              for (var pi = 0; pi < procs.length; pi++) {
                var pn = String((procs[pi]||{}).numero||'').replace(/[^0-9]/g,'');
                if (pn === cnj) { pagina = procs[pi].pagina || 1; break; }
              }
            }
            return { cnj: cnj, pagina: pagina };
          });

          // Fallback: busca href pelo primeiro CNJ se a tarefa não tiver href
          var href = (tarefa && tarefa.href) || getHrefTarefa(selCnjs.length ? selCnjs[0].cnj : '');
          if (!href || !chrome.runtime || !chrome.runtime.sendMessage) {
            btn.disabled = false;
            if (labelEl) labelEl.innerHTML = original;
            return;
          }
          var hashAlvo = href;
          if (hashAlvo.indexOf('#') !== 0) {
            hashAlvo = hashAlvo.indexOf('/') === 0 ? '#' + hashAlvo : '#/' + hashAlvo;
          }
          var urlAlvo = window.top.location.href.replace(/#.*$/, '') + hashAlvo;
          if (labelEl) labelEl.innerHTML = '↗ Abrindo ' + selCnjs.length + ' em sequência...';
          try {
            chrome.runtime.sendMessage(
              { type: 'PJM_ABRIR_TAREFA_SEQUENCIA', url: urlAlvo, cnjs: selCnjs },
              function() { setTimeout(function() { btn.disabled = false; if (labelEl) labelEl.innerHTML = original; }, 3000); }
            );
          } catch(ex) {
            btn.disabled = false;
            if (labelEl) labelEl.innerHTML = original;
          }
        });
      });

      // ─ Botão "Preparar juntada (lote)" — Executar agora, modo seguro (Fase 3) ─
      shadow.querySelectorAll('.pjm-bulk-juntar-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var container = btn.closest('.pjm-bulk-toolbar') && btn.closest('.pjm-bulk-toolbar').parentElement;
          var pids = [];
          if (container) {
            container.querySelectorAll('.pjm-proc-chk').forEach(function(c) {
              if (state.selectedPids[c.dataset.pid]) pids.push(c.dataset.pid);
            });
          }
          // Só processos com ato definido entram na fila
          var comAto = pids.filter(function(cnj) { return !!getAtoProcesso(cnj); });
          if (!comAto.length) { alert('Nenhum dos processos selecionados tem ato definido.\n\nUse "📝 Elaborar ato" primeiro.'); return; }
          var semAto = pids.length - comAto.length;
          var aviso = 'Preparar a juntada de ' + comAto.length + ' processo(s)?\n\nVou abrir cada um, clicar em "Juntar documentos" e preencher o formulário — e PARAR antes de salvar/assinar. Você revisa e dá o SALVAR em cada um.' + (semAto ? '\n\n(' + semAto + ' selecionado(s) sem ato serão ignorados.)' : '');
          if (!confirm(aviso)) return;

          var ts = (state.resultado && state.resultado.tarefas) || [];
          var sanfonaIdx = parseInt(btn.dataset.sanfona, 10);
          var tarefa = ts[sanfonaIdx];
          function getHrefTarefa(cnj) {
            for (var i = 0; i < ts.length; i++) {
              var t = ts[i]; if (!t.processos || !t.href) continue;
              for (var j = 0; j < t.processos.length; j++) {
                if (String((t.processos[j]||{}).numero||'').replace(/[^0-9]/g,'') === cnj) return t.href;
              }
            }
            return '';
          }
          var selCnjs = comAto.map(function(cnj) {
            var pagina = 1;
            for (var ti = 0; ti < ts.length; ti++) {
              var procs = ts[ti].processos || [];
              for (var pi = 0; pi < procs.length; pi++) {
                if (String((procs[pi]||{}).numero||'').replace(/[^0-9]/g,'') === cnj) { pagina = procs[pi].pagina || 1; break; }
              }
            }
            return { cnj: cnj, pagina: pagina };
          });
          var href = (tarefa && tarefa.href) || getHrefTarefa(selCnjs[0].cnj);
          if (!href || !chrome.runtime || !chrome.runtime.sendMessage) { alert('Não encontrei o link da tarefa para abrir os autos.'); return; }
          var hashAlvo = href;
          if (hashAlvo.indexOf('#') !== 0) hashAlvo = hashAlvo.indexOf('/') === 0 ? '#' + hashAlvo : '#/' + hashAlvo;
          var urlAlvo = window.top.location.href.replace(/#.*$/, '') + hashAlvo;

          btn.disabled = true;
          var bulkBar = btn.closest('.pjm-bulk-toolbar');
          var labelEl = bulkBar && bulkBar.querySelector('.pjm-bulk-label');
          var original = labelEl ? labelEl.innerHTML : '';
          if (labelEl) labelEl.innerHTML = '⚙️ Preparando ' + selCnjs.length + ' juntada(s)...';
          // Arma o lote: os autos abertos vão auto-clicar "Juntar documentos" e preencher.
          try {
            chrome.storage.local.set({ pjmJuntadaLote: { cnjs: comAto.slice(), ts: Date.now() } }, function() {
              chrome.runtime.sendMessage(
                { type: 'PJM_ABRIR_TAREFA_SEQUENCIA', url: urlAlvo, cnjs: selCnjs },
                function() { setTimeout(function() { btn.disabled = false; if (labelEl) labelEl.innerHTML = original; }, 3000); }
              );
            });
          } catch(ex) {
            btn.disabled = false; if (labelEl) labelEl.innerHTML = original;
          }
        });
      });

      // ─ Botões de ação por processo (dropdown individual) ─
      shadow.querySelectorAll('.pjm-act-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var menu = btn.nextElementSibling;
          if (!menu || !menu.classList.contains('pjm-dd-menu')) return;
          var wasOpen = menu.classList.contains('open');
          shadow.querySelectorAll('.pjm-dd-menu.open').forEach(function(m) { m.classList.remove('open'); });
          if (!wasOpen) openDropdown(menu, btn);
        });
      });

      // ─ Item de dropdown individual → adiciona passo ─
      shadow.querySelectorAll('.pjm-dd-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          var pid       = item.dataset.pid;
          var type      = item.dataset.type;
          var ruleId    = item.dataset.ruleId    || '';
          var ruleLabel = item.dataset.ruleLabel || '';
          if (!pid || !type) return;
          if (!state.procSteps)       state.procSteps = {};
          if (!state.procSteps[pid])  state.procSteps[pid] = [];
          state.procSteps[pid].push({
            sid: pid + '_' + Date.now().toString(36),
            type: type, ruleId: ruleId, ruleLabel: ruleLabel, status: 'pending'
          });
          shadow.querySelectorAll('.pjm-dd-menu.open').forEach(function(m) { m.classList.remove('open'); });
          render();
        });
      });

      // ─ Botão × em cada passo → remove da fila ─
      shadow.querySelectorAll('.pjm-step-x').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var pid = btn.dataset.pid;
          var sid = btn.dataset.sid;
          if (!pid || !sid || !(state.procSteps || {})[pid]) return;
          state.procSteps[pid] = state.procSteps[pid].filter(function(s) { return s.sid !== sid; });
          if (!state.procSteps[pid].length) delete state.procSteps[pid];
          render();
        });
      });

      // ─ Executar passos de um único processo ─
      shadow.querySelectorAll('.btn-exec-one').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var pid = btn.dataset.pid;
          if (!pid || state.executandoFila) return;
          execProcFila([pid], true); // "Executar este": com CNJ, só este processo
        });
      });

      // ─ "Elaborar ato": abre/fecha o card de modelo por processo ─
      shadow.querySelectorAll('.pjm-elaborar-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var pid = btn.dataset.pid;
          var cnj = btn.dataset.cnj || '';
          if (!cnj) { alert('Processo sem número CNJ — não é possível elaborar ato.'); return; }
          if (state.elaborarAtoPid === pid) { state.elaborarAtoPid = null; state.elaborarAtoDraft = null; render(); return; }
          var ato = getAtoProcesso(cnj);
          var descGlobal = state.juntadaModelo ? catDescricao(state.juntadaModelo) : '';
          state.elaborarAtoPid = pid;
          state.elaborarAtoDraft = ato
            ? { materia: ato.materia || '', fase: ato.fase || '', modelo: ato.modelo || '', descricao: ato.descricao || '', textoInserir: ato.textoInserir || '' }
            : { materia: state.juntadaMateria || '', fase: state.juntadaFase || '', modelo: state.juntadaModelo || '', descricao: descGlobal, textoInserir: '' };
          render();
        });
      });

      // ─ Card "Elaborar ato": cascata matéria → fase → modelo + descrição ─
      var eaMat = $('eaMateria');
      if (eaMat) {
        eaMat.addEventListener('change', function() {
          if (!state.elaborarAtoDraft) state.elaborarAtoDraft = {};
          state.elaborarAtoDraft.materia = eaMat.value;
          state.elaborarAtoDraft.fase = '';
          state.elaborarAtoDraft.modelo = '';
          state.elaborarAtoDraft.descricao = '';
          render();
        });
      }
      var eaFas = $('eaFase');
      if (eaFas) {
        eaFas.addEventListener('change', function() {
          if (!state.elaborarAtoDraft) state.elaborarAtoDraft = {};
          state.elaborarAtoDraft.fase = eaFas.value;
          state.elaborarAtoDraft.modelo = '';
          state.elaborarAtoDraft.descricao = '';
          render();
        });
      }
      shadow.querySelectorAll('.eamod-item').forEach(function(item) {
        item.addEventListener('click', function() {
          if (!state.elaborarAtoDraft) state.elaborarAtoDraft = {};
          var mod = item.dataset.modelo || '';
          state.elaborarAtoDraft.modelo = mod;
          state.elaborarAtoDraft.descricao = mod ? (catDescricao(mod) || mod) : '';
          render();
        });
      });
      var eaDesc = $('eaDescricao');
      if (eaDesc) {
        eaDesc.addEventListener('input', function() {
          if (!state.elaborarAtoDraft) state.elaborarAtoDraft = {};
          state.elaborarAtoDraft.descricao = eaDesc.value;
        });
      }
      var eaIns = $('eaInserir');
      if (eaIns) {
        eaIns.addEventListener('input', function() {
          if (!state.elaborarAtoDraft) state.elaborarAtoDraft = {};
          state.elaborarAtoDraft.textoInserir = eaIns.value;
        });
      }
      shadow.querySelectorAll('.ea-cancelar').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          state.elaborarAtoPid = null;
          state.elaborarAtoDraft = null;
          render();
        });
      });
      shadow.querySelectorAll('.ea-salvar').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var cnj = btn.dataset.cnj || '';
          var d = state.elaborarAtoDraft || {};
          var descEl = $('eaDescricao');
          var descricao = descEl ? descEl.value : (d.descricao || '');
          var insEl = $('eaInserir');
          var textoInserir = insEl ? insEl.value : (d.textoInserir || '');
          // Só o modelo é obrigatório — fase é opcional (modelos genéricos não têm fase)
          if (!d.modelo) { alert('Selecione o modelo para este processo.'); return; }
          salvarAtoProcesso(cnj, { materia: d.materia || '', fase: d.fase || '', modelo: d.modelo, descricao: descricao, textoInserir: textoInserir });
          state.elaborarAtoPid = null;
          state.elaborarAtoDraft = null;
          render();
        });
      });
      shadow.querySelectorAll('.ea-remover').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          removerAtoProcesso(btn.dataset.cnj || '');
          state.elaborarAtoPid = null;
          state.elaborarAtoDraft = null;
          render();
        });
      });
    }

    // ── Motor de execução — "Executar tudo" (2 fases) ────────
    //
    // FASE 1 — tag/rem: regras únicas por ruleId, sem CNJ, executadas uma vez
    //          cada. Move todos os processos com a etiqueta de uma só vez.
    //          Quando uma regra cobre N pids, todos têm o step marcado como
    //          done em simultâneo, sem nova navegação por pid.
    //
    // FASE 2 — com: iterada por pid com CNJ, pois comunicação é individual.
    //
    function execTodasAsFilas() {
      if (state.executandoFila) return;
      var pids = Object.keys(state.procSteps || {}).filter(function(pid) {
        return (state.procSteps[pid] || []).length > 0;
      });
      if (!pids.length) return;

      state.executandoFila = true; try { chrome.storage.local.set({ pjmExecutandoFila: Date.now() }); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); }
      render();

      var totalSteps = pids.reduce(function(acc, pid) {
        return acc + ((state.procSteps || {})[pid] || []).length;
      }, 0);
      var doneSteps = 0;

      function atualizarUI(msg) {
        var sub  = $('pjmFilaBarSub');
        var prog = $('pjmFilaProg');
        if (sub)  sub.textContent  = msg || '';
        if (prog) prog.style.width = Math.round((doneSteps / Math.max(1, totalSteps)) * 100) + '%';
      }

      function pollStatus(storageKey, t0, cb) {
        var fired = false;
        var timer = setInterval(function() {
          chrome.storage.local.get(storageKey, function(r) {
            if (fired) return;
            var sts = r && r[storageKey];
            if (sts && sts.done && (sts.reqTs === t0 || (!sts.reqTs && sts.ts >= t0))) {
              fired = true;
              clearInterval(timer);
              chrome.storage.local.remove(storageKey);
              cb();
            } else if (Date.now() - t0 > 120000) {
              fired = true;
              clearInterval(timer);
              cb();
            }
          });
        }, 1500);
      }

      function finalizarFila() {
        state.executandoFila = false; try { chrome.storage.local.set({ pjmExecutandoFila: 0 }); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); }
        var _afetadas = (state.cfg && state.cfg.remapPosAcao) ? coletarTarefasAfetadas(pids) : null;
        pids.forEach(function(pid) {
          if ((state.procSteps[pid] || []).every(function(s) { return s.status === 'done'; })) {
            delete state.procSteps[pid];
          }
        });
        // Navegação final centralizada: se houve ações com, cada pid suprimiu a
        // navegação individual (navegarNoFim:false); retornamos ao painel aqui,
        // uma única vez após todos os processos concluídos.
        if (fase2Items.length > 0) {
          var _pathname = location.pathname;
          var _ehSeamJSF = _pathname.indexOf('.seam') !== -1 && _pathname.indexOf('ng2/dev.seam') === -1;
          if (_ehSeamJSF) {
            var _partes = _pathname.split('/');
            var _contexto = _partes.length >= 2 ? '/' + _partes[1] : '';
            location.href = location.origin + _contexto + '/ng2/dev.seam#/painel-usuario-interno';
          } else {
            location.hash = '#/painel-usuario-interno';
          }
        }
        render();
        remapPosAcaoSeLigado(_afetadas);
      }

      // ── Montar listas de fases respeitando a ordem da fila ────────────────
      //
      // FASE 1 — tag/rem ANTES do primeiro step 'com' de cada pid (lote, sem CNJ)
      // FASE 2 — todos os steps 'com', por pid com CNJ (individual)
      // FASE 3 — tag/rem APÓS o primeiro step 'com' de cada pid (lote, sem CNJ)
      //
      // Garante que um rem/tag colocado pelo usuário DEPOIS de um com
      // não seja adiantado para antes do com (bug: tudo não-com ia para
      // FASE 1 independentemente da posição na fila).

      var maxSteps = pids.reduce(function(max, pid) {
        return Math.max(max, (state.procSteps[pid] || []).length);
      }, 0);

      // firstComIdx[pid] = índice do primeiro step 'com' (steps.length se não houver)
      var firstComIdx = {};
      pids.forEach(function(pid) {
        var steps = state.procSteps[pid] || [];
        firstComIdx[pid] = steps.length;
        for (var i = 0; i < steps.length; i++) {
          if (steps[i].type === 'com') { firstComIdx[pid] = i; break; }
        }
      });

      // Etiquetas usadas por comunicações na fila: remover uma delas precisa rodar
      // DEPOIS das comunicações (FASE 3), mesmo que, na fila do processo onde o
      // "remover" foi pendurado, não exista nenhum "com". Evita que a remoção em
      // lote apague a etiqueta de que a comunicação de OUTRO processo depende.
      function _ne(s){ return String(s == null ? '' : s).trim().toLowerCase(); }
      var comEtqs = {};
      pids.forEach(function(pid) {
        (state.procSteps[pid] || []).forEach(function(s) {
          if (s.type === 'com') {
            var rc = (state.prepComunicacaoRegras || []).find(function(r){ return r.id === s.ruleId; });
            if (rc && rc.etiqueta) comEtqs[_ne(rc.etiqueta)] = true;
          }
        });
      });

      var fase1Items = [];   // tag/rem pré-com  [{type, ruleId, ruleLabel, affectedPids:{pid:si}}]
      var ruleMap1   = {};
      var fase3Items = [];   // tag/rem pós-com
      var ruleMap3   = {};

      for (var si = 0; si < maxSteps; si++) {
        pids.forEach(function(sid_pid) {
          var step = (state.procSteps[sid_pid] || [])[si];
          if (!step || step.type === 'com') return;
          // Chave inclui si: a mesma regra em posições diferentes de pids distintos
          // NÃO é fundida num único item. Sem o si, "Movimentar" em si=0 de pid2
          // absorvia "Movimentar" em si=1 de pid1 e executava antes do "Etiquetar"
          // em si=0 de pid1 — violando a ordem definida pelo usuário.
          var key = step.type + ':' + step.ruleId + ':' + si;
          // Remoção cuja etiqueta é usada por alguma comunicação da fila → FASE 3 (pós-com)
          var forcarFase3 = false;
          if (step.type === 'rem') {
            var _rr = (state.removerEtiquetaRegras || []).find(function(r){ return r.id === step.ruleId; });
            if (_rr && _rr.etiqueta && comEtqs[_ne(_rr.etiqueta)]) forcarFase3 = true;
          }
          if (si < firstComIdx[sid_pid] && !forcarFase3) {
            // Pré-com → FASE 1
            if (!ruleMap1[key]) {
              ruleMap1[key] = { type: step.type, ruleId: step.ruleId, ruleLabel: step.ruleLabel, affectedPids: {} };
              fase1Items.push(ruleMap1[key]);
            }
            ruleMap1[key].affectedPids[sid_pid] = si;
          } else {
            // Pós-com → FASE 3
            if (!ruleMap3[key]) {
              ruleMap3[key] = { type: step.type, ruleId: step.ruleId, ruleLabel: step.ruleLabel, affectedPids: {} };
              fase3Items.push(ruleMap3[key]);
            }
            ruleMap3[key].affectedPids[sid_pid] = si;
          }
        });
      }

      // ── Montar lista FASE 2: steps com, por pid na ordem da fila ──────────
      var fase2Items = [];   // [{pid, si, step}]
      pids.forEach(function(pid) {
        (state.procSteps[pid] || []).forEach(function(step, stepIdx) {
          if (step.type === 'com') fase2Items.push({ pid: pid, si: stepIdx, step: step });
        });
      });

      // ── Executor genérico para fases tag/rem (FASE 1 e FASE 3) ───────────
      function execFaseBatch(items, onConcluido) {
        function execIdx(idx) {
          if (idx >= items.length) { onConcluido(); return; }

          var item = items[idx];
          var pidList = Object.keys(item.affectedPids);

          pidList.forEach(function(pid) {
            var s = (state.procSteps[pid] || [])[item.affectedPids[pid]];
            if (s) s.status = 'running';
          });
          render();
          atualizarUI(item.ruleLabel + ' (' + pidList.length + ' processo(s))');

          var t0 = Date.now();

          function onBatchDone() {
            pidList.forEach(function(pid) {
              var s = (state.procSteps[pid] || [])[item.affectedPids[pid]];
              if (s) s.status = 'done';
            });
            doneSteps += pidList.length;
            render();
            atualizarUI('');
            setTimeout(function() { execIdx(idx + 1); }, 400);
          }

          if (item.type === 'tag') {
            var regra = (state.etiquetaRegras || []).find(function(r) { return r.id === item.ruleId; });
            if (!regra) { onBatchDone(); return; }
            var _t = Date.now();
            chrome.storage.local.remove('etiquetaComandoStatus', function() {
              chrome.storage.local.set({ etiquetaComando: { regras: [regra], ts: _t } }, function() {
                pollStatus('etiquetaComandoStatus', _t, onBatchDone);
              });
            });
          } else if (item.type === 'rem') {
            var regraRem = (state.removerEtiquetaRegras || []).find(function(r) { return r.id === item.ruleId; });
            if (!regraRem) { onBatchDone(); return; }
            // Remoção ESCOPADA por processo: uma chamada por CNJ (não em lote),
            // para tirar a etiqueta apenas do processo onde a ação foi pendurada.
            var _remPids = pidList.slice();
            (function remOne(k) {
              if (k >= _remPids.length) {
                atualizarUI('');
                setTimeout(function() { execIdx(idx + 1); }, 400);
                return;
              }
              var _pidR = _remPids[k];
              var _cnjR = String(_pidR).replace(/[^0-9]/g, '');
              atualizarUI(item.ruleLabel + ' — ' + _pidR + ' (' + (k + 1) + '/' + _remPids.length + ')');
              var _tR = Date.now();
              chrome.storage.local.remove('etiquetaRemoverStatus', function() {
                chrome.storage.local.set({ etiquetaRemoverComando: { regras: [regraRem], ts: _tR, cnj: _cnjR } }, function() {
                  pollStatus('etiquetaRemoverStatus', _tR, function() {
                    var _sR = (state.procSteps[_pidR] || [])[item.affectedPids[_pidR]];
                    if (_sR) _sR.status = 'done';
                    doneSteps += 1;
                    render();
                    setTimeout(function() { remOne(k + 1); }, 300);
                  });
                });
              });
            })(0);
            return;
          } else if (item.type === 'vinc') {
            var regraVinc = (state.vincularEtiquetaRegras || []).find(function(r) { return r.id === item.ruleId; });
            if (!regraVinc) { onBatchDone(); return; }
            // Vincular em LOTE: seleciona todos os processos afetados e vincula de uma vez.
            var _vCnjs = pidList.map(function(p){ return String(p).replace(/[^0-9]/g, ''); }).filter(Boolean);
            var _tV = Date.now();
            chrome.storage.local.remove('etiquetaVincularStatus', function() {
              chrome.storage.local.set({ etiquetaVincularComando: { regras: [regraVinc], ts: _tV, cnjs: _vCnjs } }, function() {
                pollStatus('etiquetaVincularStatus', _tV, onBatchDone);
              });
            });
          } else {
            onBatchDone();
          }
        }
        execIdx(0);
      }

      // ── FASE 2: executa ações com por pid, com CNJ ────────────────────────
      function execFase2(idx) {
        if (idx >= fase2Items.length) {
          // FASE 3 — tag/rem pós-com, depois finaliza
          execFaseBatch(fase3Items, finalizarFila);
          return;
        }

        var item = fase2Items[idx];
        item.step.status = 'running';
        render();
        atualizarUI('Processo ' + item.pid + ' — ' + item.step.ruleLabel);

        var t0 = Date.now();

        function onFase2Done() {
          item.step.status = 'done';
          doneSteps++;
          render();
          atualizarUI('');
          setTimeout(function() { execFase2(idx + 1); }, 400);
        }

        var regraPrep = (state.prepComunicacaoRegras || []).find(function(r) { return r.id === item.step.ruleId; });
        if (!regraPrep) { onFase2Done(); return; }

        chrome.storage.local.remove('etiquetaComandoStatus', function() {
          chrome.storage.local.set({
            prepComunicacaoAcionar: { regras: [regraPrep], ts: t0, cnj: item.pid, navegarNoFim: false }
          }, function() {
            pollStatus('etiquetaComandoStatus', t0, onFase2Done);
          });
        });
      }

      // Inicia: FASE 1 → FASE 2 → FASE 3 → finalizarFila
      execFaseBatch(fase1Items, function() { execFase2(0); });
    }

    function execProcFila(pids, usarCnj) {
      if (state.executandoFila) return;
      state.executandoFila = true; try { chrome.storage.local.set({ pjmExecutandoFila: Date.now() }); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); }
      render();

      var totalSteps = pids.reduce(function(acc, pid) {
        return acc + ((state.procSteps || {})[pid] || []).length;
      }, 0);
      var doneSteps = 0;

      function atualizarUI(msg) {
        var sub  = $('pjmFilaBarSub');
        var prog = $('pjmFilaProg');
        if (sub)  sub.textContent  = msg || '';
        if (prog) prog.style.width = Math.round((doneSteps / Math.max(1, totalSteps)) * 100) + '%';
      }

      function execProximo(idx) {
        if (idx >= pids.length) {
          state.executandoFila = false; try { chrome.storage.local.set({ pjmExecutandoFila: 0 }); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); }
          var _afetadas = (state.cfg && state.cfg.remapPosAcao) ? coletarTarefasAfetadas(pids) : null;
          pids.forEach(function(pid) {
            if ((state.procSteps[pid] || []).every(function(s){ return s.status === 'done'; })) {
              delete state.procSteps[pid];
            }
          });
          render();
          remapPosAcaoSeLigado(_afetadas);
          return;
        }
        var pid   = pids[idx];
        var steps = (state.procSteps || {})[pid] || [];
        execStep(pid, steps, 0, function() {
          setTimeout(function() { execProximo(idx + 1); }, 500);
        }, usarCnj);
      }

      function execStep(pid, steps, si, onDone, usarCnj) {
        if (si >= steps.length) { onDone(); return; }
        var s = steps[si];
        s.status = 'running';
        render();
        var tipoLabel = { tag: 'Etiqueta', rem: 'Remover', com: 'Comunicação', vinc: 'Vincular' };
        atualizarUI('Processo ' + pid + ' — passo ' + (si+1) + '/' + steps.length + ': ' +
                    tipoLabel[s.type] + ' — ' + s.ruleLabel);

        // Calcula tarefaOrigem: onde o processo provavelmente está agora.
        // Passo 0 → tarefa original do processo no resultado da coleta.
        // Passo N>0 → tarefaFinal (pipeline) ou tarefaDestino (simples) do passo anterior.
        function calcTarefaOrigem() {
          if (si === 0) {
            // A "Tarefa inicial" da regra manda: fixa a caixa de origem e evita pegar a
            // tarefa errada quando o MESMO processo está em mais de uma tarefa.
            var regra0 = (state.etiquetaRegras || []).concat(state.removerEtiquetaRegras || [])
                           .find(function(r){ return r.id === s.ruleId; });
            if (regra0 && regra0.tarefaInicial) return regra0.tarefaInicial;
            // Fallback: primeira tarefa da coleta que contém o processo.
            var ts = (state.resultado && state.resultado.tarefas) || [];
            for (var ti = 0; ti < ts.length; ti++) {
              var procs = ts[ti].processos || [];
              for (var pi = 0; pi < procs.length; pi++) {
                var pn = String((procs[pi]||{}).numero||'').replace(/[^0-9]/g,'');
                if (pn === pid) return ts[ti].nome || '';
              }
            }
            return '';
          }
          var prev = steps[si - 1];
          if (!prev) return '';
          var allRegras = (state.etiquetaRegras || []).concat(state.removerEtiquetaRegras || []);
          var pr = allRegras.find(function(r){ return r.id === prev.ruleId; });
          if (!pr) return '';
          return pr.tarefaFinal || pr.tarefaDestino || pr.tarefa || '';
        }

        function onStepConcluido() {
          s.status = 'done';
          doneSteps++;
          render();
          atualizarUI('');
          setTimeout(function() { execStep(pid, steps, si + 1, onDone, usarCnj); }, 400);
        }

        function pollStatus(storageKey, t0, cb) {
          var fired = false;
          var timer = setInterval(function() {
            chrome.storage.local.get(storageKey, function(r) {
              if (fired) return;
              var sts = r && r[storageKey];
              if (sts && sts.done && (sts.reqTs === t0 || (!sts.reqTs && sts.ts >= t0))) {
                fired = true;
                clearInterval(timer);
                chrome.storage.local.remove(storageKey);
                cb();
              } else if (Date.now() - t0 > 120000) {
                fired = true;
                clearInterval(timer);
                cb(); // timeout — avança mesmo sem confirmação
              }
            });
          }, 1500);
        }

        // "Executar este" (usarCnj=true): filtra pelo CNJ do processo específico.
        // "Executar tudo" (usarCnj=false): sem CNJ para 'tag'/'rem' (move por etiqueta);
        //   'com' sempre usa CNJ pois comunicação é individual por processo.
        var cnjAlvo = usarCnj ? pid : null;
        var tarefaOrigem = usarCnj ? calcTarefaOrigem() : '';

        if (s.type === 'tag') {
          var regra = (state.etiquetaRegras || []).find(function(r){ return r.id === s.ruleId; });
          if (!regra) { onStepConcluido(); return; }
          var t0 = Date.now();
          var cmdTag = { regras: [regra], ts: t0 };
          if (cnjAlvo) { cmdTag.cnj = cnjAlvo; cmdTag.tarefaOrigem = tarefaOrigem; }
          chrome.storage.local.remove('etiquetaComandoStatus', function() {
            chrome.storage.local.set({ etiquetaComando: cmdTag }, function() {
              pollStatus('etiquetaComandoStatus', t0, onStepConcluido);
            });
          });

        } else if (s.type === 'rem') {
          var regraRem = (state.removerEtiquetaRegras || []).find(function(r){ return r.id === s.ruleId; });
          if (!regraRem) { onStepConcluido(); return; }
          var t0 = Date.now();
          var cmdRem = { regras: [regraRem], ts: t0 };
          if (cnjAlvo) { cmdRem.cnj = cnjAlvo; cmdRem.tarefaOrigem = tarefaOrigem; }
          chrome.storage.local.remove('etiquetaRemoverStatus', function() {
            chrome.storage.local.set({ etiquetaRemoverComando: cmdRem }, function() {
              pollStatus('etiquetaRemoverStatus', t0, onStepConcluido);
            });
          });

        } else if (s.type === 'com') {
          var regraPrep = (state.prepComunicacaoRegras || []).find(function(r){ return r.id === s.ruleId; });
          if (!regraPrep) { onStepConcluido(); return; }
          var t0 = Date.now();
          // Comunicação: envia para o frame Angular (prepComunicacaoAcionar) que
          // Sempre usa CNJ para abrir o processo correto; aguarda etiquetaComandoStatus.
          chrome.storage.local.remove('etiquetaComandoStatus', function() {
            chrome.storage.local.set({ prepComunicacaoAcionar: { regras: [regraPrep], ts: t0, cnj: pid } }, function() {
              pollStatus('etiquetaComandoStatus', t0, onStepConcluido);
            });
          });

        } else if (s.type === 'vinc') {
          var regraVinc = (state.vincularEtiquetaRegras || []).find(function(r){ return r.id === s.ruleId; });
          if (!regraVinc) { onStepConcluido(); return; }
          var t0 = Date.now();
          var cmdVinc = { regras: [regraVinc], ts: t0 };
          if (cnjAlvo) cmdVinc.cnjs = [cnjAlvo];
          chrome.storage.local.remove('etiquetaVincularStatus', function() {
            chrome.storage.local.set({ etiquetaVincularComando: cmdVinc }, function() {
              pollStatus('etiquetaVincularStatus', t0, onStepConcluido);
            });
          });

        } else {
          onStepConcluido();
        }
      }

      execProximo(0);
    }

    // -- Aba PRAZOS (radar de prazos) --------------------------------------
    function _pe(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
    function _pdig(x){ return String(x||'').replace(/\D/g,''); }
    function _fmtDT(iso){ try{ var t=new Date(iso); if(isNaN(t.getTime())) return String(iso||''); var z=function(n){ return (n<10?'0':'')+n; }; return z(t.getDate())+'/'+z(t.getMonth()+1)+'/'+t.getFullYear()+' '+z(t.getHours())+':'+z(t.getMinutes()); }catch(_){ return String(iso||''); } }
    function carregarPrazos(){ state.prazosLoaded=true; try{ chrome.storage.local.get('pjmPrazos',function(r){ state.prazosData=(r&&r.pjmPrazos)||null; if(state.tab==='prazos') render(); }); }catch(e){ state.prazosData=null; } }
    function carregarTarefaCnjs(cb){
      try{
        chrome.storage.local.get(['pjeMapperUltimoResultado','pjmColetaApi'],function(r){
          var set={}, n=0;
          var res=r&&r.pjeMapperUltimoResultado; var ts=(res&&res.tarefas)||[];
          ts.forEach(function(t){ if(!/prazo/i.test(String(t.nome||''))) return; (t.processos||[]).forEach(function(pp){ var d=_pdig(pp.numero); if(d&&!set[d]){ set[d]=1; n++; } }); });
          if(!n){ var col=r&&r.pjmColetaApi; if(col&&/prazo/i.test(String(col.tarefa||''))) (col.processos||[]).forEach(function(pp){ var d=_pdig(pp.numero); if(d&&!set[d]){ set[d]=1; n++; } }); }
          state.prazosTarefaCnjs=set; state.prazosTarefaQtd=n;
          if(cb)cb();
        });
      }catch(e){ if(cb)cb(); }
    }
    function coletarPrazosUI(){ if(!window.PJeColetorPrazos||!window.PJeColetorPrazos.coletar){ alert('Abra o painel numa aba do tribunal (host legado, ex.: pje.tre-sp.jus.br) para coletar os prazos.'); return; } state.prazosColetando=true; render(); window.PJeColetorPrazos.coletar().then(function(pl){ state.prazosData=pl; state.prazosColetando=false; state.prazosLoaded=true; render(); }).catch(function(e){ state.prazosColetando=false; render(); alert('Falha ao coletar prazos: '+((e&&e.message)||e)); }); }
    function _przPill(bg,fg,tx){ return '<span style="font-size:11px;padding:2px 8px;border-radius:10px;font-weight:500;background:'+bg+';color:'+fg+';white-space:nowrap">'+tx+'</span>'; }
    function _przBadge(r){
      if(r.tipo==='ciencia'){
        if(r.dias==null)  return _przPill('#f3f4f6','#4b5563','sem data');
        if(r.dias<0)      return _przPill('#fdf0e3','#9a4b0a','ci&ecirc;ncia atrasada &middot; '+(-r.dias)+'d');
        if(r.dias===0)    return _przPill('#f3f4f6','#4b5563','ci&ecirc;ncia hoje');
        return _przPill('#f3f4f6','#4b5563','ci&ecirc;ncia em '+r.dias+' dias');
      }
      if(r.dias==null) return _przPill('#f3f4f6','#4b5563','sem data');
      var c=r.dias<0?['#fceaea','#a32d2d']:r.dias<=3?['#faeeda','#854f0b']:['#e1f5ee','#0f6e56'];
      var tx=r.dias<0?('vencido &middot; '+(-r.dias)+'d'):r.dias===0?'vence hoje':(r.dias+' dias');
      return _przPill(c[0],c[1],tx);
    }
    function _przCor(r){ if(r.tipo==='ciencia') return (r.dias!=null&&r.dias<0)?'#f0b45f':'#9ca3af'; if(r.dias==null) return '#9ca3af'; return r.dias<0?'#dc2626':r.dias<=3?'#f59e0b':'#1d9e75'; }
    function _przSemCiencia(r){ if(r.semCiencia!=null) return r.semCiencia; return (r.expedientes||[]).filter(function(e){ return e.dias==null; }).length; }
    function _przAlerta(r){ var n=_przSemCiencia(r); if(!n) return ''; if(((r.nExp||0)-n)<=0) return ''; return '<span title="expedientes pendentes, sem ci&ecirc;ncia registrada" style="font-size:10.5px;padding:2px 7px;border-radius:10px;font-weight:500;background:#fdf0e3;color:#9a4b0a;white-space:nowrap">&#9888; '+n+' sem ci&ecirc;ncia</span>'; }
    function _przItem(r){
      var k=_pdig(r.cnj); var ab=!!(state.prazosExp&&state.prazosExp[k]); var subs='';
      if(ab&&r.expedientes&&r.expedientes.length){
        var hd='<div style="display:flex;font-size:10.5px;color:#8b949e;font-weight:500;padding:2px 0 4px"><span style="flex:1;min-width:0">Destinat&aacute;rio</span><span style="width:124px">Meio de comunica&ccedil;&atilde;o</span><span style="width:100px">Data de cria&ccedil;&atilde;o</span><span style="width:100px">Data da ci&ecirc;ncia</span><span style="width:106px">Prazo final</span></div>';
        subs='<div style="padding:4px 10px 10px 16px;background:#fafbfc">'+hd+r.expedientes.map(function(e){ return '<div style="display:flex;align-items:flex-start;font-size:11.5px;color:#4b5563;padding:4px 0;border-top:0.5px solid #eef1f4'+(e.dias==null?';background:#fffaf3':'')+'">'+'<span style="flex:1;min-width:0;padding-right:10px;word-break:break-word">'+_pe(e.destinatario)+'<br><span style="font-size:10px;color:'+(e.dias==null?'#9a4b0a':'#9ca3af')+'">'+_pe(e.bucket)+(e.dias==null?' &mdash; sem ci&ecirc;ncia':'')+'</span></span>'+'<span style="width:124px;color:#6b7280">'+_pe(e.meio)+'</span>'+'<span style="width:100px;color:#6b7280">'+(e.dataCriacao?_pe(e.dataCriacao):'&mdash;')+'</span>'+'<span style="width:100px;color:#6b7280">'+(e.dataCiencia?_pe(e.dataCiencia):'&mdash;')+'</span>'+'<span style="width:106px;font-weight:500;color:'+_przCor(e)+'">'+_pe(e.prazoFinal)+'</span>'+'</div>'; }).join('')+'</div>';
      }
      var aut=r.idProcesso?'<button class="prz-autos" data-idp="'+_pe(r.idProcesso)+'" data-cnj="'+k+'" style="border:0.5px solid #c9d3db;background:#fff;color:#28527a;border-radius:7px;padding:3px 8px;font-size:11.5px;cursor:pointer">autos</button>':'';
      return '<div class="prz-item" data-cnj="'+k+'"><div style="display:flex;align-items:center;border-left:3px solid '+_przCor(r)+';border-bottom:0.5px solid #f0f2f5">'+
        '<span style="flex:1;font-size:12.5px;padding:7px 10px;color:#1f2937">'+_pe(r.cnj)+'<br><span style="font-size:10.5px;color:#9ca3af">'+_pe(r.bucket)+'</span></span>'+
        '<span style="width:92px;font-size:12px;color:#6b7280;padding:7px 6px">'+_pe(r.prazoFinal)+'</span>'+
        '<span style="width:134px;padding:7px 6px">'+_przBadge(r)+'</span>'+
        '<span class="prz-exp" data-cnj="'+k+'" title="ver expedientes" style="width:52px;text-align:center;font-size:12px;color:#6c3483;cursor:pointer;padding:7px 4px">'+r.nExp+' '+(ab?'&#9662;':'&#9656;')+'</span>'+
        '<span style="width:118px;padding:7px 4px">'+_przAlerta(r)+'</span>'+
        '<span style="width:60px;text-align:center;padding:5px 6px">'+aut+'</span></div>'+subs+'</div>';
    }
    function _przGrupo(t,arr,id){ if(!arr.length) return ''; var rec=!!(state.prazosGrpRecolhido&&state.prazosGrpRecolhido[id]); return '<div class="prz-grp-hd" data-grp="'+id+'" style="font-size:11.5px;font-weight:500;color:#5f6b76;margin:12px 0 4px;cursor:pointer;user-select:none">'+(rec?'&#9656;':'&#9662;')+' '+t+' ('+arr.length+')</div>'+(rec?'':('<div style="border:0.5px solid #eef1f4;border-radius:8px;overflow:hidden">'+arr.map(_przItem).join('')+'</div>')); }
    function renderPrazos(){
      if(state.prazosJanela==null) state.prazosJanela=60;
      if(!state.prazosExp) state.prazosExp={};
      if(!state.prazosGrpRecolhido) state.prazosGrpRecolhido={};
      if(state.prazosBusca==null) state.prazosBusca='';
      if(state.prazosFiltroClasse==null) state.prazosFiltroClasse='';
      if(!state.prazosLoaded){ carregarPrazos(); }
      var d=state.prazosData;
      var _przClasses=(d&&d.rows)?Array.from(new Set(d.rows.map(function(r){return r.classe;}).filter(Boolean))).sort():[];
      var jan=[30,60,90,365];
      var opt=jan.map(function(n){ return '<option value="'+n+'"'+(n===state.prazosJanela?' selected':'')+'>Atrasados: '+(n===365?'1 ano':(n+' dias'))+'</option>'; }).join('');
      var meta=(d&&d.gerado)?('&uacute;ltima coleta: '+_pe(_fmtDT(d.gerado))+' &middot; '+(d.totalProcessos||0)+' processos'):'sem coleta ainda';
      var bar='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">'+
        '<button id="przAtualizar" style="border:0.5px solid #154360;background:#1a5276;color:#fff;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:500;cursor:pointer">&#8635; Atualizar prazos</button>'+
        '<button id="przRelatorio" style="border:0.5px solid #c9d3db;background:#fff;color:#28527a;border-radius:7px;padding:6px 12px;font-size:12.5px;cursor:pointer">Abrir relat&oacute;rio</button>'+
        '<span style="font-size:11.5px;color:#6b7280">'+meta+'</span>'+
        '<span style="margin-left:auto;display:flex;align-items:center;gap:10px">'+
          '<input id="przBusca" placeholder="Buscar CNJ" value="'+_pe(state.prazosBusca)+'" style="border:0.5px solid #c9d3db;border-radius:7px;padding:5px 9px;font-size:12px;width:140px">'+
          '<select id="przJanela" style="border:0.5px solid #c9d3db;border-radius:7px;padding:5px 8px;font-size:12px">'+opt+'</select>'+
          '<select id="przFiltClasse" style="border:0.5px solid #c9d3db;border-radius:7px;padding:5px 8px;font-size:12px"><option value="">Todas as classes</option>'+_przClasses.map(function(c){return '<option value="'+_pe(c)+'"'+(state.prazosFiltroClasse===c?' selected':'')+'>'+_pe(c)+'</option>';}).join('')+'</select>'+
          '<label style="font-size:12px;color:#374151;display:inline-flex;align-items:center;gap:5px"><input type="checkbox" id="przSoTarefas"'+(state.prazosSoTarefas?' checked':'')+'> S&oacute; tarefas de prazo</label>'+
        '</span></div>';
      if(state.prazosColetando) return bar+'<div style="padding:22px;text-align:center;color:#6b7280;font-size:13px">Coletando prazos&hellip; pode levar cerca de 1 minuto.</div>';
      if(!state.prazosLoaded) return bar+'<div style="padding:22px;text-align:center;color:#6b7280">Carregando&hellip;</div>';
      if(!d||!d.rows||!d.rows.length) return bar+'<div style="padding:22px;text-align:center;color:#6b7280;font-size:13px">Nenhum prazo coletado ainda. Clique em <b>Atualizar prazos</b>.</div>';
      var rows=d.rows.filter(function(r){ return r.dias==null || r.dias>=-state.prazosJanela; });
      if(state.prazosSoTarefas){
        var set=state.prazosTarefaCnjs;
        if(!set||!Object.keys(set).length){ state.prazosVisiveis=[]; return bar+'<div style="padding:22px;text-align:center;color:#6b7280;font-size:13px">Nenhuma <b>tarefa de prazo</b> encontrada no mapeamento.<br>Rode o mapeamento das tarefas para este filtro funcionar.</div>'; }
        rows=rows.filter(function(r){ return set[_pdig(r.cnj)]; });
      }
      var _q=_pdig(state.prazosBusca); if(_q) rows=rows.filter(function(r){ return _pdig(r.cnj).indexOf(_q)>=0; });
      if(state.prazosFiltroClasse){ rows=rows.filter(function(r){ return _normClasse(r.classe||'')===_normClasse(state.prazosFiltroClasse); }); }
      state.prazosVisiveis=rows.map(function(r){ return _pdig(r.cnj); });
      // "Vencidos" (G.v) e REDE DE SEGURANCA, nao categoria de trabalho: os buckets coletados sao
      // "Pendente" e os dois "...e dentro do prazo". Quando o prazo de manifestacao estoura, o PJe
      // move o expediente para "Prazo encerrado nos ultimos 10 dias", que NAO coletamos -- logo este
      // grupo deve ficar VAZIO (e grupo vazio nao e renderizado, some sozinho da tela). Se aparecer,
      // investigue: (a) defasagem do PJe ou (b) erro de parse. NAO remova achando que e codigo morto.
      // Justificativa completa: docs/radar-prazos.md (Decisao 1).
      var G={v:[],h:[],t:[],c:[],s:[]}; rows.forEach(function(r){ if(r.tipo==='ciencia')G.s.push(r); else if(r.dias==null)G.s.push(r); else if(r.dias<0)G.v.push(r); else if(r.dias===0)G.h.push(r); else if(r.dias<=3)G.t.push(r); else G.c.push(r); });
      var chips='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">'+
        (G.v.length?'<span style="font-size:11px;padding:2px 8px;border-radius:10px;font-weight:500;background:#fceaea;color:#a32d2d">Vencidos: '+G.v.length+'</span>':'')+
        '<span style="font-size:11px;padding:2px 8px;border-radius:10px;font-weight:500;background:#faeeda;color:#854f0b">Vence hoje: '+G.h.length+'</span>'+
        '<span style="font-size:11px;padding:2px 8px;border-radius:10px;font-weight:500;background:#faeeda;color:#854f0b">Pr&oacute;x. 3 dias: '+G.t.length+'</span>'+
        '<span style="font-size:11px;padding:2px 8px;border-radius:10px;font-weight:500;background:#e1f5ee;color:#0f6e56">Em curso: '+G.c.length+'</span>'+(G.s.length?'<span style="font-size:11px;padding:2px 8px;border-radius:10px;font-weight:500;background:#f3f4f6;color:#4b5563">Pendente de ci&ecirc;ncia: '+G.s.length+'</span>':'')+'</div>';
      var body=_przGrupo('Vencidos',G.v,'venc')+_przGrupo('Vence hoje',G.h,'hoje')+_przGrupo('Pr&oacute;ximos 3 dias',G.t,'tres')+_przGrupo('Em curso',G.c,'curso')+_przGrupo('Pendente de ci&ecirc;ncia',G.s,'sem');
      var foot='<div style="font-size:11px;color:#9ca3af;margin-top:8px">Mostrando '+rows.length+' de '+d.rows.length+' processos'+(rows.length<d.rows.length?(' &middot; '+(d.rows.length-rows.length)+' ocultos pelos filtros'):'')+'</div>';
      return bar+chips+body+foot;
    }
    function wirePrazos(){
      if(state.tab!=='prazos') return;
      var a=$('przAtualizar'); if(a) a.addEventListener('click', coletarPrazosUI);
      var rel=$('przRelatorio'); if(rel) rel.addEventListener('click', function(){
        var f={ soTarefas: !!state.prazosSoTarefas, cnjs: (state.prazosSoTarefas ? (state.prazosVisiveis||[]) : null), ts: Date.now() };
        var abrir=function(){ try{ chrome.runtime.sendMessage({ type:'PJM_ABRIR_RELATORIO_PRAZOS' }, function(){}); }catch(_){} };
        try{ chrome.storage.local.set({ pjmPrazosFiltro: f }, abrir); }catch(_){ abrir(); }
      });
      var j=$('przJanela'); if(j) j.addEventListener('change', function(){ state.prazosJanela=parseInt(j.value,10)||60; render(); });
      var fc=$('przFiltClasse'); if(fc) fc.addEventListener('change', function(){ state.prazosFiltroClasse=fc.value; render(); });
      var t=$('przSoTarefas'); if(t) t.addEventListener('change', function(){ state.prazosSoTarefas=t.checked; if(t.checked) carregarTarefaCnjs(render); else render(); });
      var s=$('przBusca');
      if(s){
        s.addEventListener('input', function(){ state.prazosBusca=s.value; state.prazosFoco=true; render(); });
        if(state.prazosFoco){ try{ s.focus(); var _v=s.value; s.setSelectionRange(_v.length,_v.length); }catch(_){} }
      }
      shadow.querySelectorAll('.prz-exp').forEach(function(el){ el.addEventListener('click', function(){ var k=el.dataset.cnj; state.prazosExp[k]=!state.prazosExp[k]; render(); }); });
      shadow.querySelectorAll('.prz-grp-hd').forEach(function(el){ el.addEventListener('click', function(){ var g=el.dataset.grp; state.prazosGrpRecolhido[g]=!state.prazosGrpRecolhido[g]; render(); }); });
      shadow.querySelectorAll('.prz-autos').forEach(function(el){ el.addEventListener('click', function(){ var idp=el.dataset.idp, cnj=el.dataset.cnj; try{ chrome.runtime.sendMessage({ type:'PJM_ABRIR_AUTOS_DIRETO', cnj: cnj, idProcesso: idp, abrirAto:false }, function(){}); }catch(_){} }); });
    }
    // ── Aba FASES (motor de fase por classe) — editor no padrão da aba Modelos ──
    var _FX_SEED = { 'Registro de Candidatura': ['Análise documental','Edital e decurso de prazo','Contencioso','Informação ao juízo','Decisão e registro no CAND','Recurso','Encerramento','Revisão e fechamento do CAND'] };
    function carregarFases() {
      state.fasesLoaded = true;
      try { chrome.storage.local.get('pjmFasesRegras', function (r) { state.fasesRegras = (r && r.pjmFasesRegras) || {}; if (state.tab === 'fases') render(); }); }
      catch (e) { state.fasesRegras = {}; }
    }
    function _fxSalvar() { try { chrome.storage.local.set({ pjmFasesRegras: state.fasesRegras }); } catch (_) {} }
    function _fxTarefas() {
      var set = {}, out = []; var ts = (state.resultado && state.resultado.tarefas) || [];
      ts.forEach(function (t) { var n = String(t.nome || '').trim(); if (n && !set[n]) { set[n] = 1; out.push(n); } });
      return out.sort();
    }
    function _fxClAtual() {
      var reg = state.fasesRegras || {}, ks = Object.keys(reg);
      if (state.fasesClasse && reg[state.fasesClasse]) return state.fasesClasse;
      return ks.length ? ks.sort()[0] : '';
    }
    function _fxResolve(input) {
      var st = String(input || '').trim(); if (!st) return { nome: '', codigo: '', sigla: '' };
      var m = st.match(/^(.*?)\s*\((\d+)\)\s*$/); var cod = m ? m[2] : ''; var base = m ? m[1].trim() : st; var nn = _normClasse(base);
      var dic = state.classeDic || [];
      for (var i = 0; i < dic.length; i++) { var e = dic[i]; if (cod && e.codigo && e.codigo === cod) return e; if (_normClasse(e.nome) === nn) return e; if (e.sigla && _normClasse(e.sigla) === nn) return e; }
      return { nome: base, codigo: cod, sigla: '' };
    }
    function _fxLabel(nome) { var e = _fxResolve(nome); return e.sigla ? (e.sigla + ' · ' + e.nome) : e.nome; }
    function _fxCriarClasse(input) {
      var e = _fxResolve(input); var chave = (e.nome || String(input || '').trim()); if (!chave) return;
      if (!state.fasesRegras) state.fasesRegras = {};
      var alvo = _normClasse(e.nome || chave);
      var existente = Object.keys(state.fasesRegras).filter(function (k) { return _normClasse(_fxResolve(k).nome || k) === alvo; })[0];
      if (existente) { state.fasesClasse = existente; state.fxNovaClasse = false; return; }
      var sk = Object.keys(_FX_SEED).filter(function (k) { return _normClasse(k) === _normClasse(chave); })[0];
      var seed = sk ? _FX_SEED[sk] : null;
      state.fasesRegras[chave] = seed ? seed.map(function (n) { return { id: _catId(), fase: n, tarefas: [], movimentos: [], certidoes: [] }; }) : [];
      state.fasesClasse = chave; state.fxNovaClasse = false; _fxSalvar();
    }
    function _fxFchip(txt, kind, ci, bg, fg) {
      return '<span style="font-size:11px;padding:2px 8px;border-radius:11px;background:' + bg + ';color:' + fg + ';white-space:nowrap;display:inline-flex;align-items:center;gap:5px">' + esc(txt) + '<span class="fx-rm" data-kind="' + kind + '" data-ci="' + ci + '" style="cursor:pointer;font-weight:700">×</span></span>';
    }
    function _fxEtiquetas() {
      var set = {}, out = []; var ts = (state.resultado && state.resultado.tarefas) || [];
      ts.forEach(function (t) { (t.processos || []).forEach(function (p) { (p.etiquetas || []).forEach(function (e) { var n = String(e || '').trim(); if (n && !set[n]) { set[n] = 1; out.push(n); } }); }); });
      return out.sort();
    }
    function _fxEtqDatalist() { return '<datalist id="fxEtqDL">' + _fxEtiquetas().map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist>'; }
    function _fxEtqSugestao(cl, f) {
      var sig = _fxResolve(cl).sigla || cl;
      var ord = (f._idx != null ? f._idx + 1 : (((state.fasesRegras && state.fasesRegras[cl]) || []).length + 1));
      return sig + ' F' + ord + (f.fase ? (' · ' + f.fase) : '');
    }
    function _fxForm(cl) {
      var f = state.fxForm, ed = f._idx != null;
      var inp = 'width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12.5px;color:#1f2937;font-family:inherit';
      var lbl = 'font-size:11px;color:#6b7280;font-weight:600;margin-bottom:4px';
      var certSel = '<select id="fxAddCert" style="border:1px solid #d1d5db;border-radius:7px;padding:6px 8px;font-size:12px"><option value="">+ certidão do catálogo…</option>' + catModelos().map(function (m) { return '<option>' + esc(m.nome) + '</option>'; }).join('') + '</select>';
      var movs = (f.movimentos || []).map(function (t, i) { return _fxFchip(t, 'movimentos', i, '#eef4f9', '#28527a'); }).join(' ') || '<span style="font-size:11px;color:#9ca3af">nenhum</span>';
      var certs = (f.certidoes || []).map(function (t, i) { return _fxFchip(t, 'certidoes', i, '#f5eef8', '#6c3483'); }).join(' ') || '<span style="font-size:11px;color:#9ca3af">nenhuma — a fase não exige certidão para concluir</span>';
      return '<div style="border:1px solid #1a5276;border-radius:10px;overflow:hidden;margin-bottom:14px">' +
        '<div style="padding:8px 12px;background:#eaf1f8;color:#1a5276;font-size:12.5px;font-weight:600">' + (ed ? '✎ Editar fase' : '+ Nova fase') + ' — ' + esc(cl) + '</div>' +
        '<div style="padding:12px;background:#fff">' +
          '<div style="margin-bottom:12px"><div style="' + lbl + '">Nome da fase</div><input id="fxNome" style="' + inp + '" value="' + esc(f.fase || '') + '" placeholder="ex.: Análise documental"></div>' +
          '<div style="margin-bottom:12px"><div style="' + lbl + '">Marco(s) — movimento ou documento nos autos</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px">' + movs + '</div><div style="display:flex;gap:6px"><input id="fxMovInp" style="' + inp + '" placeholder="texto do movimento (ex.: Publicação de edital)"><button id="fxMovAdd" style="border:1px solid #c9d3db;background:#fff;color:#28527a;border-radius:7px;padding:0 12px;font-size:12px;cursor:pointer">Adicionar</button></div></div>' +
          '<div style="margin-bottom:14px"><div style="' + lbl + '">Fase CONCLUÍDA quando — certidões nos autos <span style="font-weight:400;color:#9ca3af">(pode indicar várias)</span></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px">' + certs + '</div>' + certSel + '</div>' +
          '<div style="margin-bottom:14px"><div style="' + lbl + '">Etiqueta desta fase <span style="font-weight:400;color:#9ca3af">(pré-cadastrada no PJe; aplicada automaticamente)</span></div><input id="fxEtq" list="fxEtqDL" style="' + inp + '" value="' + esc(f.etiqueta || _fxEtqSugestao(cl, f)) + '" placeholder="' + esc(_fxEtqSugestao(cl, f)) + '">' + _fxEtqDatalist() + '</div>' +
          '<div style="display:flex;gap:8px"><button id="fxOk" style="border:1px solid #154360;background:#1a5276;color:#fff;border-radius:7px;padding:7px 16px;font-size:12.5px;font-weight:500;cursor:pointer">Salvar fase</button><button id="fxCancel" style="border:1px solid #c9d3db;background:#fff;color:#4b5563;border-radius:7px;padding:7px 16px;font-size:12.5px;cursor:pointer">Cancelar</button></div>' +
        '</div></div>';
    }
    function renderFases() {
      if (!state.fasesLoaded) { carregarFases(); return '<div style="padding:22px;text-align:center;color:#6b7280">Carregando…</div>'; }
      var reg = state.fasesRegras || {}, cadastradas = Object.keys(reg).sort(), cl = _fxClAtual();
      var known = [], _kseen = {};
      (state.classesConhecidas || []).forEach(function (c) { if (c && c.nome) { var n = _normClasse(c.nome); if (!_kseen[n]) { _kseen[n] = 1; known.push(c.nome); } } });
      Object.keys(_FX_SEED).forEach(function (k) { var n = _normClasse(k); if (!_kseen[n]) { _kseen[n] = 1; known.push(k); } });
      var _dset = {}, _dopts = [];
      (state.classeDic || []).forEach(function (e) { var kk = _normClasse(e.nome); if (e.nome && !_dset[kk]) { _dset[kk] = 1; _dopts.push('<option value="' + esc(e.nome) + '">' + esc(e.sigla ? (e.sigla + ' · ' + e.nome) : e.nome) + '</option>'); } });
      known.forEach(function (n) { var kk = _normClasse(n); if (!_dset[kk]) { _dset[kk] = 1; _dopts.push('<option value="' + esc(n) + '"></option>'); } });
      var dl = '<datalist id="fxClDL">' + _dopts.join('') + '</datalist>';
      var barra;
      if (state.fxNovaClasse || !cadastradas.length) {
        barra = dl + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
          '<span style="font-size:12.5px;color:#374151">Classe:</span>' +
          '<input id="fxClInp" list="fxClDL" style="min-width:290px;padding:7px 10px;border:1px solid #c9d3db;border-radius:7px;font-size:12.5px" placeholder="indique a classe (ex.: Registro de Candidatura)">' +
          '<button id="fxClAdd" style="border:1px solid #154360;background:#1a5276;color:#fff;border-radius:7px;padding:7px 14px;font-size:12.5px;font-weight:500;cursor:pointer">Adicionar classe</button>' +
          (cadastradas.length ? '<button id="fxClCancel" style="border:1px solid #c9d3db;background:#fff;color:#4b5563;border-radius:7px;padding:7px 12px;font-size:12.5px;cursor:pointer">Cancelar</button>' : '') +
          '</div>';
        if (!cadastradas.length) return barra + '<div style="padding:8px 2px;font-size:12px;color:#9ca3af">Indique a classe para configurar suas fases. Comece por <b>Registro de Candidatura</b> — vem com as 8 fases prontas para ajustar.</div>';
      } else {
        barra = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
          '<span style="font-size:12.5px;color:#374151">Classe:</span>' +
          '<select id="fxClasse" style="border:1px solid #c9d3db;border-radius:7px;padding:6px 10px;font-size:12.5px">' + cadastradas.map(function (c) { return '<option' + (c === cl ? ' selected' : '') + ' value="' + esc(c) + '">' + esc(_fxLabel(c)) + '</option>'; }).join('') + '</select>' +
          '<button id="fxClNova" style="border:1px solid #c9d3db;background:#fff;color:#28527a;border-radius:7px;padding:6px 12px;font-size:12.5px;cursor:pointer">+ outra classe</button>' +
          '<button id="fxClDel" title="Excluir esta classe e suas fases" style="border:1px solid #e3b7b7;background:#fff;color:#b91c1c;border-radius:7px;padding:6px 10px;font-size:12.5px;cursor:pointer">Excluir classe</button>' +
          '</div>';
      }
      if (state.fxForm) return barra + _fxForm(cl);
      var lista = reg[cl] || [];
      var top = '<div style="display:flex;align-items:center;margin-bottom:8px"><span style="font-size:12px;color:#6b7280">' + lista.length + ' fase(s) em <b>' + esc(_fxLabel(cl)) + '</b></span><span style="margin-left:auto"><button id="fxNovaFase" style="border:1px solid #154360;background:#1a5276;color:#fff;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:500;cursor:pointer">+ Nova fase</button></span></div>';
      if (!lista.length) return barra + top + '<div style="padding:16px;text-align:center;color:#9ca3af;font-size:12.5px">Nenhuma fase. Clique em <b>+ Nova fase</b>.</div>';
      var rows = lista.map(function (f, i) {
        var sinais = ((f.tarefas || []).length + (f.movimentos || []).length), nCert = (f.certidoes || []).length;
        return '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-top:0.5px solid #f1f3f5">' +
          '<span style="display:flex;flex-direction:column;flex:none"><span class="fx-btn" data-act="up" data-fi="' + i + '" title="subir" style="cursor:pointer;color:#9ca3af;font-size:11px;line-height:1">▲</span><span class="fx-btn" data-act="down" data-fi="' + i + '" title="descer" style="cursor:pointer;color:#9ca3af;font-size:11px;line-height:1">▼</span></span>' +
          '<span style="width:22px;height:22px;border-radius:50%;background:#6c3483;color:#fff;font-size:11px;display:inline-flex;align-items:center;justify-content:center;flex:none">' + (i + 1) + '</span>' +
          '<span style="flex:1;min-width:0;font-size:12.5px;color:#1f2937;font-weight:500">' + esc(f.fase) + '</span>' +
          '<span style="font-size:10.5px;color:#9ca3af;white-space:nowrap">' + sinais + ' marco(s) · ' + nCert + ' certidão(ões)' + (f.etiqueta ? ' · etiqueta: ' + esc(f.etiqueta) : ' · <span style=\"color:#c47b2c\">sem etiqueta</span>') + '</span>' +
          '<span class="fx-btn" data-act="edit" data-fi="' + i + '" title="Editar" style="cursor:pointer;width:26px;height:26px;border:1px solid #e5eaef;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:#28527a">✎</span>' +
          '<span class="fx-btn" data-act="del" data-fi="' + i + '" title="Excluir" style="cursor:pointer;width:26px;height:26px;border:1px solid #e5eaef;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:#b91c1c;font-weight:700">×</span>' +
        '</div>';
      }).join('');
      return barra + top + '<div style="border:0.5px solid #e5eaef;border-radius:9px;overflow:hidden">' + rows + '</div>' +
        '<div style="font-size:11px;color:#9ca3af;margin-top:8px">A ordem (▲▼) define o "fase mais avançada vence". A certidão marca a fase como concluída quando aparece nos autos (captura em construção).</div>';
    }
    function wireFases() {
      if (state.tab !== 'fases') return;
      var reg = state.fasesRegras || {};
      var sc = $('fxClasse'); if (sc) sc.addEventListener('change', function () { state.fasesClasse = sc.value; state.fxForm = null; render(); });
      var nb = $('fxClNova'); if (nb) nb.addEventListener('click', function () { state.fxNovaClasse = true; render(); });
      var cadd = $('fxClAdd'); if (cadd) cadd.addEventListener('click', function () { var el = $('fxClInp'); _fxCriarClasse(el ? el.value : ''); render(); });
      var ccan = $('fxClCancel'); if (ccan) ccan.addEventListener('click', function () { state.fxNovaClasse = false; render(); });
      var cdel = $('fxClDel'); if (cdel) cdel.addEventListener('click', function () {
        var c = _fxClAtual(); if (!c) return;
        if (confirm('Excluir a classe "' + c + '" e todas as suas fases?')) { delete reg[c]; state.fasesClasse = ''; state.fxForm = null; _fxSalvar(); render(); }
      });
      var cl = _fxClAtual(), lista = reg[cl] || [];
      shadow.querySelectorAll('.fx-btn').forEach(function (el) {
        el.addEventListener('click', function () {
          var act = el.dataset.act, fi = parseInt(el.dataset.fi, 10);
          if (act === 'up' && fi > 0) { var a = lista[fi]; lista[fi] = lista[fi - 1]; lista[fi - 1] = a; _fxSalvar(); render(); return; }
          if (act === 'down' && fi < lista.length - 1) { var b = lista[fi]; lista[fi] = lista[fi + 1]; lista[fi + 1] = b; _fxSalvar(); render(); return; }
          if (act === 'edit' && lista[fi]) { var m = lista[fi]; state.fxForm = { _idx: fi, id: m.id, fase: m.fase, tarefas: (m.tarefas || []).slice(), movimentos: (m.movimentos || []).slice(), certidoes: (m.certidoes || []).slice(), etiqueta: m.etiqueta || '' }; render(); return; }
          if (act === 'del' && lista[fi]) { if (confirm('Excluir a fase "' + lista[fi].fase + '"?')) { lista.splice(fi, 1); _fxSalvar(); render(); } return; }
        });
      });
      var nf = $('fxNovaFase'); if (nf) nf.addEventListener('click', function () { state.fxForm = { _idx: null, id: null, fase: '', tarefas: [], movimentos: [], certidoes: [], etiqueta: '' }; render(); });
      if (state.fxForm) {
        var nome = $('fxNome'); if (nome) nome.addEventListener('input', function () { state.fxForm.fase = nome.value; });
        var fe = $('fxEtq'); if (fe) fe.addEventListener('input', function () { state.fxForm.etiqueta = fe.value; });
        var acx = $('fxAddCert'); if (acx) acx.addEventListener('change', function () { if (acx.value && state.fxForm.certidoes.indexOf(acx.value) < 0) { state.fxForm.certidoes.push(acx.value); render(); } });
        var ma = $('fxMovAdd'); if (ma) ma.addEventListener('click', function () { var mi = $('fxMovInp'); var v = mi ? mi.value.trim() : ''; if (v && state.fxForm.movimentos.indexOf(v) < 0) { state.fxForm.movimentos.push(v); render(); } });
        shadow.querySelectorAll('.fx-rm').forEach(function (el) { el.addEventListener('click', function () { var k = el.dataset.kind, ci = parseInt(el.dataset.ci, 10); if (state.fxForm[k] && ci >= 0) { state.fxForm[k].splice(ci, 1); render(); } }); });
        var ok = $('fxOk'); if (ok) ok.addEventListener('click', function () {
          var nm = (($('fxNome') ? $('fxNome').value : state.fxForm.fase) || '').trim();
          if (!nm) { alert('Informe o nome da fase.'); return; }
          var novo = { id: state.fxForm.id || _catId(), fase: nm, tarefas: state.fxForm.tarefas, movimentos: state.fxForm.movimentos, certidoes: state.fxForm.certidoes, etiqueta: (($('fxEtq') ? $('fxEtq').value : state.fxForm.etiqueta) || '').trim() };
          if (!reg[cl]) reg[cl] = [];
          if (state.fxForm._idx != null && reg[cl][state.fxForm._idx]) reg[cl][state.fxForm._idx] = novo; else reg[cl].push(novo);
          state.fasesRegras = reg; _fxSalvar(); state.fxForm = null; render();
        });
        var cx = $('fxCancel'); if (cx) cx.addEventListener('click', function () { state.fxForm = null; render(); });
      }
    }

    function wireBody() {
      wireJuntada();
      wireEtiquetas();
      wireRemoverEtiquetas();
      wirePrepararComunicacao();
      wireFila();
      wireAgendamentos();
      wirePrazos();
      wireFases();
      var bd = function(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); };
      bd('bRapido', iniciarRapida);
      bd('bAuto', iniciarAuto);
      bd('bAuto2', iniciarAuto);
      bd('bCfg', function() { state.tab='config'; render(); });
      bd('bTiposDoc', function() { state.tiposDoc.aberto = true; render(); });
      wireModalTipos();
      bd('bMarcoRegras', function() { state.marcoDoc.aberto = true; render(); });
      bd('bRelKpis', function() { try { chrome.runtime.sendMessage({ type: 'PJM_ABRIR_RELATORIO_KPIS' }, function(){}); } catch (_) {} });
      wireModalMarcos();
      bd('bKpiConfig', function() { state.kpiDoc.aberto = true; render(); });
      wireModalKpis();
      wireModalPresets();
      var checkKey = function(id, key, stKey) {
        var el = $(id); if (!el) return;
        el.addEventListener('change', function() { state[stKey] = el.checked; var o = {}; o[key] = el.checked; try { chrome.storage.local.set(o); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); } });
      };
      checkKey('cMarcoAuto', 'pjmMarcoAuto', 'marcoAuto');
      checkKey('cMarcoAviso', 'pjmMarcoAviso', 'marcoAviso');
      bd('bAtalhosExt', function() { state.extAtalhos.aberto = true; render(); });
      wireModalAtalhos();
      bd('bSave', function() {
        // Salva nome do servidor
        var inpServidor = $('cServidor');
        if (inpServidor) {
          state.servidor = inpServidor.value.trim();
          try { chrome.storage.local.set({ pjmServidor: state.servidor }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
        }
        saveCfg();
        alert('Configurações salvas.');
      });
      // Botão "Usar PJe": preenche o input com o nome detectado automaticamente
      bd('bAutoServidor', function() {
        var detectado = _detectarNomePJe();
        var inp = $('cServidor');
        if (inp && detectado) inp.value = detectado;
      });
      bd('bCanc', cancelar);

      var check = function(id, set) {
        var el = $(id); if (!el) return;
        el.addEventListener('change', function() { set(el.checked); saveCfg(); });
      };
      check('cMinhas', function(v) { state.cfg.cards.minhas = v; });
      check('cGerais', function(v) { state.cfg.cards.gerais = v; });
      check('cAssin', function(v) { state.cfg.cards.assinaturas = v; });
      check('cPag', function(v) { state.cfg.paginacao = v; });
      check('cColFase', function(v) { state.cfg.colFaseLocal = v; });

      var selAgenda = $('cAgendaModo');
      if (selAgenda) selAgenda.addEventListener('change', function() {
        state.cfg.agendaModo = selAgenda.value; saveCfg();
        try { chrome.runtime.sendMessage({ type: 'PJM_AGENDA_VARREDURA', modo: selAgenda.value }); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); }
      });

      var num = function(id, key, min, max) {
        var el = $(id); if (!el) return;
        el.addEventListener('change', function() {
          var v = Math.max(min, Math.min(max, parseInt(el.value, 10) || min));
          state.cfg[key] = v; el.value = v; saveCfg();
        });
      };
      num('cMaxPag', 'maxPaginas', 1, 500);
      num('cTimeout', 'timeoutLista', 2000, 60000);
      num('cDelay', 'delayEntreTarefas', 0, 5000);

      // Filtros e busca da aba Processos
      // IMPORTANTE: usa filtragem direta no DOM (sem re-renderizar tudo)
      // para nao perder o foco do input enquanto o usuario digita.
      var inSearch = $('pSearch');
      if (inSearch) {
        // Restaura o cursor se acabou de re-renderizar
        if (state.busca && document.activeElement !== inSearch) {
          // Nao auto-foca para nao roubar foco de outros campos
        }

        inSearch.addEventListener('input', function(e) {
          state.busca = e.target.value;
          state.pagina = 1;
          // Em vez de render() (que destroi o input), filtra as linhas no DOM
          filtrarProcessosNoDOM();
        });
      }
      var selT = $('pFiltTar');
      if (selT) selT.addEventListener('change', function(e) { state.filtroTarefa = e.target.value; state.pagina = 1; render(); });
      var selC = $('pFiltCat');
      if (selC) selC.addEventListener('change', function(e) { state.filtroCategoria = e.target.value; state.pagina = 1; render(); });
      var selCl = $('pFiltClasse');
      if (selCl) selCl.addEventListener('change', function(e) { state.filtroClasse = e.target.value; state.pagina = 1; render(); });
      var btnPrev = $('pgPrev');
      if (btnPrev) btnPrev.addEventListener('click', function() { if (state.pagina > 1) { state.pagina--; render(); } });
      var btnNext = $('pgNext');
      if (btnNext) btnNext.addEventListener('click', function() { state.pagina++; render(); });

      // Filtro combinado de etiquetas (chips, autocomplete, AND/OR, limpar)
      shadow.querySelectorAll('.pjm-chip-rm').forEach(function(x) {
        x.addEventListener('click', function(e) {
          e.stopPropagation();
          var etq = x.dataset.etq;
          if (!etq) return;
          state.filtroCombinado.etiquetas = state.filtroCombinado.etiquetas.filter(function(v) { return v !== etq; });
          state.pagina = 1;
          render();
        });
      });
      shadow.querySelectorAll('.pjm-sug-etq').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var etq = btn.dataset.etq;
          if (!etq) return;
          if (state.filtroCombinado.etiquetas.indexOf(etq) < 0) {
            state.filtroCombinado.etiquetas.push(etq);
          }
          state.sugestaoEtq = '';
          state.pagina = 1;
          render();
        });
      });
      shadow.querySelectorAll('.pjm-modo-comb').forEach(function(btn) {
        btn.addEventListener('click', function() {
          state.filtroCombinado.modo = btn.dataset.modo;
          state.pagina = 1;
          render();
        });
      });
      var btnCombLimpar = $('pjmCombLimpar');
      if (btnCombLimpar) btnCombLimpar.addEventListener('click', function() {
        state.filtroCombinado.etiquetas = [];
        state.sugestaoEtq = '';
        state.pagina = 1;
        render();
      });
      var btnCombCopiar = $('pjmCombCopiar');
      if (btnCombCopiar) btnCombCopiar.addEventListener('click', function() {
        copiarProcessosFiltradosTSV(btnCombCopiar);
      });
      var sugInput = $('pjmSugInput');
      if (sugInput) {
        sugInput.addEventListener('input', function(e) {
          state.sugestaoEtq = e.target.value;
          atualizarSugestoesEtqNoDOM();
        });
        sugInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var primeiraSug = shadow.querySelector('.pjm-sug-etq');
            if (primeiraSug) primeiraSug.click();
          }
        });
      }

      // Aba Tarefas - sanfona: click no cabecalho expande/colapsa
      shadow.querySelectorAll('.pjm-tarefa-hdr').forEach(function(hdr) {
        hdr.addEventListener('click', function(e) {
          // ignora clicks no link "PJe" interno
          if (e.target.closest('.pjm-link-lista')) return;
          var k = hdr.dataset.tarefaKey;
          if (!k) return;
          if (state.expandidas[k]) delete state.expandidas[k];
          else state.expandidas[k] = true;
          render();
        });
      });

      // Filtro de etiquetas na aba Resumo (in-place, sem perder foco do input)
      var filtroEtqIn = $('filtroEtqInput');
      if (filtroEtqIn) {
        filtroEtqIn.addEventListener('input', function(e) {
          state.filtroEtiqueta = e.target.value;
          // Re-renderiza apenas as barras de etiquetas para nao perder o foco do input
          filtrarEtiquetasNoDOM();
        });
      }
      var filtroEtqLimpar = $('filtroEtqLimpar');
      if (filtroEtqLimpar) {
        filtroEtqLimpar.addEventListener('click', function() {
          state.filtroEtiqueta = '';
          render();
        });
      }
      var filtroEtqCopiar = $('filtroEtqCopiar');
      if (filtroEtqCopiar) {
        filtroEtqCopiar.addEventListener('click', function() {
          copiarEtiquetasComoTSV(filtroEtqCopiar);
        });
      }
      // Chips de etiqueta na aba Resumo: clique filtra a aba Processos
      shadow.querySelectorAll('.pjm-etq-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          var etq = chip.dataset.etq;
          if (!etq) return;
          if (!state.filtroCombinado.etiquetas) state.filtroCombinado.etiquetas = [];
          if (state.filtroCombinado.etiquetas.indexOf(etq) < 0) {
            state.filtroCombinado.etiquetas.push(etq);
          }
          state.tab = 'processos';
          render();
        });
      });
      // Chips de CLASSE na aba Resumo: clique filtra a aba Processos
      shadow.querySelectorAll('.pjm-cls-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          var cls = chip.dataset.classe;
          if (!cls) return;
          state.filtroClasse = cls;
          state.tab = 'processos';
          state.pagina = 1;
          render();
        });
      });


      // Click no header "Numero CNJ" cicla: original (–) -> asc (▲) -> desc (▼) -> original
      shadow.querySelectorAll('.pjm-th-cnj').forEach(function(th) {
        th.addEventListener('click', function(e) {
          e.stopPropagation();
          var k = th.dataset.tarefaKey;
          if (!k) return;
          var atual = state.ordemCnj[k] || null;
          if (atual === null) state.ordemCnj[k] = 'asc';
          else if (atual === 'asc') state.ordemCnj[k] = 'desc';
          else delete state.ordemCnj[k]; // volta ao original
          render();
        });
      });

      // Botoes "Autos" - grava pedido + navega a aba do PJe ate a tarefa
      // O auto-open.js detecta os spans aparecendo e clica em "Abrir autos"
      shadow.querySelectorAll('.pjm-autos-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          try { aplicarHrefsDoMapa(); } catch (_) { /* noop */ }
          var cnj = btn.dataset.cnj;
          if (!cnj) return;
          // Abertura DIRETA (monta URL + ca, sem lista) quando há idProcesso na coleta.
          var _idpAutos = idProcessoDeCnj(cnj);
          if (_idpAutos) {
            try { chrome.runtime.sendMessage({ type: 'PJM_ABRIR_AUTOS_DIRETO', cnj: cnj, idProcesso: _idpAutos, abrirAto: true }, function () {}); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
            try { close(); } catch (_) { /* noop */ }
            return;
          }
          var paginaAlvo = parseInt(btn.dataset.pagina, 10) || 1;
          if (!chrome.storage || !chrome.storage.local) { alert('chrome.storage indisponivel'); return; }

          // Descobre a href da tarefa que contem esse processo
          var hrefTarefa = '';
          var ts = (state.resultado && state.resultado.tarefas) || [];
          for (var i = 0; i < ts.length; i++) {
            var t = ts[i];
            if (!t.processos || !t.href) continue;
            var achou = false;
            for (var j = 0; j < t.processos.length; j++) {
              var pn = String((t.processos[j]||{}).numero||'').replace(/[^0-9]/g,'');
              if (pn === cnj) { achou = true; break; }
            }
            if (achou) { hrefTarefa = t.href; break; }
          }

          // Reaproveita a aba dos autos já aberta para esse CNJ (foca + abre o 📝);
          // se não houver, abre nova aba e o 📝 aparece ao carregar. Fecha o painel
          // para você cair direto nos autos com o popover do ato.
          var urlAlvo = '';
          if (hrefTarefa) {
            var hashAlvo = hrefTarefa;
            if (hashAlvo.indexOf('#') !== 0) hashAlvo = (hashAlvo.indexOf('/') === 0 ? '#' : '#/') + hashAlvo;
            urlAlvo = window.top.location.href.replace(/#.*$/, '') + hashAlvo;
          }
          // Abertura rápida: passa o cache {idProcesso/ca/url} + a flag para o background
          // tentar abrir DIRETO (regenera a ca). Sem cache/flag off → fluxo da lista.
          chrome.storage.local.get(['juntadaAutosCache', 'pjmFastAutos'], function (st) {
            var fast = !st || st.pjmFastAutos !== false;            // default: ligado
            var info = (st && st.juntadaAutosCache && st.juntadaAutosCache[cnj]) || null;
            console.log('[PJeOverlay] Abrir autos + ato:', cnj, info ? '(cache → direto)' : '(lista)', urlAlvo);
            try { chrome.runtime.sendMessage({ type: 'PJM_ELABORAR_NOS_AUTOS', cnj: cnj, url: urlAlvo, pagina: paginaAlvo, info: info, fast: fast }, function () {}); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          });
          try { close(); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); }   // fecha o painel para ver os autos + o popover
        });
      });

      // Botão "Selecionar tarefas" em Configurações
      var btnSelTar = $('bSelTarefas');
      if (btnSelTar) btnSelTar.addEventListener('click', abrirModalTarefas);

      // Toggle "Abertura rápida dos autos" (pjmFastAutos, default ligado)
      var elFast = $('cFastAutos');
      if (elFast) {
        chrome.storage.local.get('pjmFastAutos', function (r) { elFast.checked = !r || r.pjmFastAutos !== false; });
        elFast.addEventListener('change', function () { chrome.storage.local.set({ pjmFastAutos: elFast.checked }); });
      }

      // Handlers do modal de seleção
      var modalBd = $('modalBackdrop');
      if (modalBd) {
        // fecha clicando fora
        modalBd.addEventListener('click', function(e) {
          if (e.target.id === 'modalBackdrop') fecharModalTarefas();
        });
        var bC = $('modalClose'); if (bC) bC.addEventListener('click', fecharModalTarefas);
        var bCancel = $('modalCancel'); if (bCancel) bCancel.addEventListener('click', fecharModalTarefas);

        var bAll = $('modalTodas');
        if (bAll) bAll.addEventListener('click', function() {
          state.tarefasSel.bloquear = [];
          render();
        });
        var bNone = $('modalNenhuma');
        if (bNone) bNone.addEventListener('click', function() {
          state.tarefasSel.bloquear = state.tarefasSel.lista.map(function(t){ return chaveTarefa(t); });
          render();
        });
        var bRef = $('modalRefresh');
        if (bRef) bRef.addEventListener('click', atualizarListaTarefas);
        var bSav = $('modalSalvar');
        if (bSav) bSav.addEventListener('click', function() {
          try { chrome.storage.local.set({ pjmTarefasBlock: state.tarefasSel.bloquear }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          fecharModalTarefas();
        });

        // checkboxes individuais (marcar = capturar, desmarcar = bloquear)
        shadow.querySelectorAll('input[data-modal-idx]').forEach(function(cb) {
          cb.addEventListener('change', function() {
            var idx = parseInt(cb.dataset.modalIdx, 10);
            var t = state.tarefasSel.lista[idx];
            if (!t) return;
            var k = chaveTarefa(t);
            var blockSet = new Set(state.tarefasSel.bloquear);
            if (cb.checked) blockSet.delete(k);
            else blockSet.add(k);
            state.tarefasSel.bloquear = Array.from(blockSet);
            render();
          });
        });

        // busca/filtro do modal
        var inBusca = $('modalBusca');
        if (inBusca) {
          inBusca.addEventListener('input', function(e) {
            var q = e.target.value.toLowerCase();
            shadow.querySelectorAll('#modalLista label.check').forEach(function(lb) {
              var nm = (lb.querySelector('.lbl')?.textContent || '').toLowerCase();
              lb.style.display = nm.indexOf(q) >= 0 ? '' : 'none';
            });
          });
        }
      }
    }

    function abrirModalTarefas() {
      state.tarefasSel.aberto = true;
      render();
      if (!state.tarefasSel.lista.length) {
        atualizarListaTarefas();
      }
    }

    function fecharModalTarefas() {
      state.tarefasSel.aberto = false;
      render();
    }

    function atualizarListaTarefas() {
      state.tarefasSel.carregando = true;
      render();
      try {
        chrome.runtime.sendMessage({ type: 'PJM_LISTAR_TAREFAS' }, function(resp) {
          state.tarefasSel.carregando = false;
          if (chrome.runtime.lastError) {
            alert('Erro: ' + chrome.runtime.lastError.message);
            render();
            return;
          }
          if (!resp || !resp.ok) {
            alert('Falha ao listar: ' + ((resp && resp.error) || 'sem resposta'));
            render();
            return;
          }
          state.tarefasSel.lista = resp.data || [];
          try { chrome.storage.local.set({ pjmTarefasLista: state.tarefasSel.lista }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
          render();
        });
      } catch (e) {
        state.tarefasSel.carregando = false;
        alert('Excecao: ' + e.message);
        render();
      }
    }

    // Filtra as linhas da tabela de Processos diretamente no DOM (sem re-render).
    // Mantém o foco do campo de busca enquanto o usuário digita.
    function filtrarProcessosNoDOM() {
      var todos = getProcs();
      if (!todos.length) return;
      var busca = (state.busca || '').toLowerCase();
      var filtTar = state.filtroTarefa || '';
      var filtCat = state.filtroCategoria || '';

      // Filtra a lista
      var lista = todos.filter(function(p) {
        if (filtCat && p.categoria !== filtCat) return false;
        if (filtTar && p.tarefa !== filtTar) return false;
        if (busca) {
          var t = (String(p.numero||'') + ' ' + String(p.tarefa||'') + ' ' +
                   String(p.fase||'') + ' ' + String(p.subfase||'') + ' ' +
                   (p.etiquetas||[]).join(' ')).toLowerCase();
          if (t.indexOf(busca) < 0) return false;
        }
        return true;
      });

      // Pagina
      var total = lista.length;
      var totalPag = Math.max(1, Math.ceil(total / state.porPagina));
      if (state.pagina > totalPag) state.pagina = totalPag;
      var ini = (state.pagina - 1) * state.porPagina;
      var page = lista.slice(ini, ini + state.porPagina);

      // Reconstrói apenas o tbody (mantém o input intacto)
      var tbody = shadow.querySelector('tbody');
      if (tbody) {
        if (page.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="empty">Nenhum resultado para os filtros.</td></tr>';
        } else {
          tbody.innerHTML = page.map(function(p) {
            return '<tr><td style="font-family:monospace;font-size:12px">' + esc(p.numero || '—') + '</td>' +
              '<td>' + esc(p.tarefa || '—') + '</td>' +
              '<td>' + esc(p.fase || '—') + (p.subfase ? '<div style="color:#9ca3af;font-size:11px">' + esc(p.subfase) + '</div>' : '') + '</td>' +
              '<td>' + ((p.etiquetas||[]).length ? p.etiquetas.map(function(e){return '<span class="tag">'+esc(e)+'</span>';}).join('') : '<span style="color:#d1d5db">—</span>') + '</td>' +
              '<td><span class="tag cat">' + esc(p.categoria || '—') + '</span></td></tr>';
          }).join('');
        }
      }

      // Atualiza o rodapé com contagem
      var pager = shadow.querySelector('[style*="border-radius:0 0 10px 10px"]');
      if (pager) {
        var filtrado = (busca || filtCat || filtTar);
        var infoEsq = 'Mostrando <strong>' + page.length + '</strong> de <strong>' + total + '</strong> processo(s)' +
                      (filtrado ? ' (filtrado de ' + todos.length + ')' : '');
        var first = pager.querySelector('div');
        if (first) first.innerHTML = infoEsq;
        var prev = shadow.getElementById('pgPrev');
        var next = shadow.getElementById('pgNext');
        if (prev) prev.disabled = state.pagina <= 1;
        if (next) next.disabled = state.pagina >= totalPag;
        var spanPag = pager.querySelector('span');
        if (spanPag) spanPag.textContent = 'Página ' + state.pagina + ' de ' + totalPag;
      }
    }

    function logP(txt, cls) {
      var ts = new Date().toLocaleTimeString('pt-BR', { hour12: false });
      state.prog.log.push({ txt: '[' + ts + '] ' + txt, cls: cls });
      if (state.prog.log.length > 200) state.prog.log.shift();
    }

    function iniciarRapida() {
      console.log('[PJeOverlay] iniciarRapida');
      setLoading('Capturando tela atual...');
      chrome.runtime.sendMessage({ type: 'PJM_MAPEAR' }, function(resp) {
        if (chrome.runtime.lastError) return setError(chrome.runtime.lastError.message);
        if (!resp) return setError('Sem resposta do background.');
        if (resp.ok) showResult(resp.data);
        else setError(resp.error || 'Erro ao capturar.');
      });
    }

    // Destino de uma regra de movimentação (tarefaDestino simples ou última proximaTarefa do pipeline)
    function _destinoRegra(r) {
      if (!r) return '';
      if (r.pipeline && r.pipeline.length) { var last = r.pipeline[r.pipeline.length-1]; return (last && (last.proximaTarefa || last.transicao)) || r.tarefaFinal || ''; }
      return r.tarefaDestino || '';
    }
    // Conjunto de tarefas afetadas por uma fila: origem (onde os processos estão) + destino (das regras)
    function coletarTarefasAfetadas(pids) {
      function dig(s){ return String(s == null ? '' : s).replace(/\D/g, ''); }
      var nomes = {}, foco = '';
      var ts = (state.resultado && state.resultado.tarefas) || [];
      (pids || []).forEach(function(pid) {
        var pd = dig(pid);
        ts.forEach(function(t) {
          (t.processos || []).forEach(function(p) { if (dig(p.numero) === pd && t.nome) nomes[t.nome] = true; });
        });
        ((state.procSteps || {})[pid] || []).forEach(function(s) {
          var dest = '';
          if (s.type === 'tag')       dest = _destinoRegra((state.etiquetaRegras || []).filter(function(r){ return r.id === s.ruleId; })[0]);
          else if (s.type === 'com')  { var rc = (state.prepComunicacaoRegras || []).filter(function(r){ return r.id === s.ruleId; })[0]; dest = rc ? rc.tarefa : ''; }
          else if (s.type === 'rem')  { var rr = (state.removerEtiquetaRegras || []).filter(function(r){ return r.id === s.ruleId; })[0]; dest = rr ? rr.tarefa : ''; }
          else if (s.type === 'vinc') { var rv = (state.vincularEtiquetaRegras || []).filter(function(r){ return r.id === s.ruleId; })[0]; dest = rv ? rv.tarefa : ''; }
          if (dest) { nomes[dest] = true; foco = dest; }
        });
      });
      return { nomes: Object.keys(nomes), foco: foco };
    }
    // Mescla o resultado de um re-map parcial (só algumas tarefas) no state.resultado e foca o destino
    function mesclarResultado(data, focoNome) {
      if (!state.resultado || !data) { state.coletando = false; if (data) showResult(data); return; }
      var novas = data.tarefas || [];
      var atuais = state.resultado.tarefas || [];
      novas.forEach(function(nt) {
        var idx = -1;
        for (var i = 0; i < atuais.length; i++) {
          if (atuais[i].nome === nt.nome && (atuais[i].tipoCard || '') === (nt.tipoCard || '')) { idx = i; break; }
        }
        if (idx >= 0) atuais[idx] = nt; else atuais.push(nt);
      });
      state.resultado.tarefas = atuais;
      // Avança o T0 → limpa os marcadores (as tarefas afetadas agora têm dado fresco)
      state.resultado.timestamp = data.timestamp || new Date().toISOString();
      state.coletando = false;
      // Não força a aba — preserva a que o usuário estava vendo ao atualizar.
      if (focoNome) {
        var alvo = atuais.filter(function(t){ return t.nome === focoNome; })[0];
        if (alvo) { if (!state.expandidas) state.expandidas = {}; state.expandidas[(alvo.nome || '') + '|' + (alvo.tipoCard || '')] = true; }
      }
      render();
      try { chrome.storage.local.set({ pjeMapperUltimoResultado: state.resultado }); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
      try { if (window.PJeFloatingBtn) window.PJeFloatingBtn.atualizarBadge(state.resultado); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
    }
    // Marca tarefas como "atualizado agora" (chip temporário ~20s na aba Tarefas).
    function marcarTarefasAtualizadas(nomes) {
      if (!nomes || !nomes.length) return;
      if (!state.tarefasAtualizadas) state.tarefasAtualizadas = {};
      var agora = Date.now();
      nomes.forEach(function(n){ if (n) state.tarefasAtualizadas[n] = agora; });
      clearTimeout(state._timerAtualizadas);
      state._timerAtualizadas = setTimeout(function(){
        var ag = Date.now();
        Object.keys(state.tarefasAtualizadas || {}).forEach(function(n){ if (ag - state.tarefasAtualizadas[n] >= 20000) delete state.tarefasAtualizadas[n]; });
        try { render(); } catch (_) { console.warn('[PJM fullscreen-overlay]', _); }
      }, 20500);
    }
    function _tarefaAtualizadaAgora(nome) {
      var ts = (state.tarefasAtualizadas || {})[nome];
      return !!(ts && (Date.now() - ts < 20000));
    }

    // Dispara o re-map das tarefas afetadas (se o toggle estiver ligado)
    // Re-coleta a tarefa afetada após "Etiquetar em lote" (aguarda o motor concluir).
    // coletarTarefas persiste no storage → o onChanged atualiza o painel, preservando a aba.
    function reColetarAposVincular(tarefa, t0) {
      if (!tarefa) return;
      if (!(window.PJeColetorAPI && window.PJeColetorAPI.coletarTarefas)) return;
      var n = 0, MAX = 8, INT = 2000;
      (function poll() {
        n++;
        chrome.storage.local.get('etiquetaVincularStatus', function (r) {
          var s = r && r.etiquetaVincularStatus;
          if (s && s.done && s.ts >= t0) {
            window.PJeColetorAPI.coletarTarefas([tarefa]).then(function () {
              try { marcarTarefasAtualizadas([tarefa]); render(); } catch (_) { /* noop */ }
            }).catch(function (e) { console.warn('[PJM fullscreen-overlay] re-coleta pós-etiqueta:', e); });
            return;
          }
          if (n < MAX) setTimeout(poll, INT);
        });
      })();
    }

    function remapPosAcaoSeLigado(afetadas) {
      if (!(state.cfg && state.cfg.remapPosAcao) || !afetadas || !afetadas.nomes.length) return;
      marcarTarefasAtualizadas(afetadas.nomes);
      // Re-mapeia as tarefas afetadas via API (rápido, sem abrir aba). Fallback: método antigo.
      var temApi = !!(window.PJeColetorAPI && window.PJeColetorAPI.coletarTarefas);
      console.log('[PJeOverlay] re-map afetadas:', afetadas.nomes, '| coletarTarefas?', temApi, '| coletor __v:', (window.PJeColetorAPI && window.PJeColetorAPI.__v) || '(ausente)');
      if (temApi) {
        // Poll adaptativo: re-coleta a cada 5s (até ~37s). O índice do PJe pode demorar para
        // refletir o move no destino. Para assim que o destino (foco) aumenta; senão, no timeout.
        var _foco = afetadas.foco || '';
        var _contaFoco = function(coletas){ var c = -1; (coletas || []).forEach(function(x){ if (x && x.nome === _foco) c = (x.processos || []).length; }); return c; };
        var _focoIni = (function(){ var ts = (state.resultado && state.resultado.tarefas) || []; for (var i = 0; i < ts.length; i++) if (ts[i].nome === _foco) return (ts[i].processos || []).length; return -1; })();
        var _n = 0, _MAX = 8, _INT = 5000, _fezFallback = false;
        var _poll = function(){
          _n++;
          if (!(window.PJeColetorAPI && window.PJeColetorAPI.coletarTarefas)) return;
          window.PJeColetorAPI.coletarTarefas(afetadas.nomes).then(function(coletas){
            render();
            var _cf = _contaFoco(coletas);
            console.log('[PJeOverlay] ✅ re-map passada ' + _n + '/' + _MAX + ' | destino "' + _foco + '" = ' + _cf + ' (inicial ' + _focoIni + ')');
            if (_foco && _focoIni >= 0 && _cf > _focoIni) { marcarTarefasAtualizadas(afetadas.nomes); render(); return; }
            if (_n < _MAX) setTimeout(_poll, _INT);
          }).catch(function(e){
            if (_n === 1 && !_fezFallback) { _fezFallback = true; console.warn('[PJeOverlay] Re-map via API falhou, usando metodo antigo:', e); iniciarAuto({ tarefasFiltro: afetadas.nomes, foco: afetadas.foco }); }
            else if (_n < _MAX) setTimeout(_poll, _INT);
          });
        };
        setTimeout(_poll, 1500);
        return;
      }
      console.warn('[PJeOverlay] ⚠️ coletarTarefas indisponível → metodo antigo (abre aba). Recarregue a extensão E dê F5 na página do PJe.');
      setTimeout(function(){ iniciarAuto({ tarefasFiltro: afetadas.nomes, foco: afetadas.foco }); }, 900);
    }

    function iniciarAuto(opts) {
      opts = opts || {};
      console.log('[PJeOverlay] iniciarAuto', opts.tarefasFiltro || '');
      if (state.coletando) return;
      var c = state.cfg.cards;
      if (!c.minhas && !c.gerais && !c.assinaturas) {
        if (opts.tarefasFiltro) return; // re-map filtrado sem cards configurados — ignora
        alert('Marque pelo menos um card antes de iniciar.');
        return;
      }
      state.coletando = true;
      state.prog = { step:0, total:0, msg:'Iniciando coleta...', log:[] };
      logP('Iniciando coleta automatica');
      render();

      var timeoutId = setTimeout(function() {
        if (state.coletando) {
          state.coletando = false;
          setError('Timeout de 90s sem resposta. Recarregue a extensao em chrome://extensions.');
        }
      }, 90000);

      // Adiciona a blocklist do modal de seleção ao config enviado ao background
      var cfgComBloqueio = Object.assign({}, state.cfg, { bloquear: state.tarefasSel.bloquear || [] });
      if (opts.tarefasFiltro && opts.tarefasFiltro.length) cfgComBloqueio.tarefasFiltro = opts.tarefasFiltro;
      console.log('[PJeOverlay] Enviando coleta com bloquear =', cfgComBloqueio.bloquear);

      try {
        chrome.runtime.sendMessage({ type: 'PJM_MAPEAR_AUTO', config: cfgComBloqueio }, function(resp) {
          clearTimeout(timeoutId);
          state.coletando = false;
          if (chrome.runtime.lastError) {
            setError('Erro: ' + chrome.runtime.lastError.message);
            return;
          }
          if (!resp) { setError('Sem resposta do background.'); return; }
          if (resp.ok) {
            if (opts.tarefasFiltro && opts.tarefasFiltro.length) mesclarResultado(resp.data, opts.foco);
            else showResult(resp.data);
          }
          else setError(resp.error || 'Erro na coleta.');
        });
      } catch (e) {
        clearTimeout(timeoutId);
        state.coletando = false;
        setError('Excecao: ' + e.message);
      }
    }

    function cancelar() {
      console.log('[PJeOverlay] cancelar');
      if (!state.coletando) { state.tab = 'config'; render(); return; }
      logP('Cancelamento solicitado...', 'warn');
      render();
      try { chrome.runtime.sendMessage({ type: 'PJM_CANCELAR' }, function() {}); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
      setTimeout(function() {
        if (state.coletando) {
          state.coletando = false;
          setError('Coleta cancelada.');
        }
      }, 3000);
    }

    try {
      chrome.runtime.onMessage.addListener(function(msg) {
        if (!msg || msg.type !== 'PJM_PROGRESSO') return;
        if (!state.coletando) return;
        state.prog.step = msg.step != null ? msg.step : state.prog.step;
        state.prog.total = msg.total != null ? msg.total : state.prog.total;
        state.prog.msg = msg.msg || state.prog.msg;
        logP(msg.msg || '...', msg.fase === 'concluido' ? 'ok' : (msg.fase === 'erro' ? 'warn' : ''));
        var msgEl = $('pMsg'), flEl = $('pFl'), logEl = $('pLog');
        if (msgEl) msgEl.textContent = state.prog.msg;
        if (flEl && state.prog.total > 0) flEl.style.width = Math.round(state.prog.step/state.prog.total*100) + '%';
        if (logEl) {
          logEl.innerHTML = state.prog.log.map(function(l){return '<div class="'+(l.cls||'')+'">'+esc(l.txt)+'</div>';}).join('');
          logEl.scrollTop = logEl.scrollHeight;
        }
      });
    } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }

    function showResult(r) {
      // Preserva a aba ativa num refresh (já havia resultado); só cai no "resumo" na 1ª coleta.
      var abaPrev = state.tab, tinha = !!state.resultado;
      state.resultado = r;
      state.tab = (tinha && abaPrev) ? abaPrev : 'resumo';
      render();
      try { if (window.PJeFloatingBtn) window.PJeFloatingBtn.atualizarBadge(r); } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }
    }

    function setLoading(msg) {
      var b = $('body'); if (b) b.innerHTML = '<div class="center"><div class="spin"></div><div style="color:#6b7280">' + esc(msg||'Carregando...') + '</div></div>';
    }

    function setError(msg) {
      var b = $('body'); if (!b) return;
      b.innerHTML = '<div class="center"><div style="font-size:42px">⚠️</div><div class="err">' + esc(msg) + '</div><br><button class="btn" id="bBack">Voltar</button></div>';
      var bk = $('bBack'); if (bk) bk.addEventListener('click', function() { state.resultado = null; state.tab = 'resumo'; render(); });
    }

    function open() {
      host.style.display = 'block';
      host.style.pointerEvents = 'auto';
      document.documentElement.style.overflow = 'hidden';
      render();
      console.log('[PJeOverlay] open()');
    }

    function close() {
      host.style.display = 'none';
      host.style.pointerEvents = 'none';
      document.documentElement.style.overflow = '';
    }

    // Substitui o stub pelas funcoes reais agora que tudo esta definido
    window.PJeOverlay = {
      open: open,
      close: close,
      setLoading: setLoading,
      setError: setError,
      render: showResult,
    };

    function init() {
      document.body.appendChild(host);
      $('cls').addEventListener('click', close);
      $('rfr').addEventListener('click', function() {
        // Atualização via API (varredura Minhas Tarefas): rápida, sem abrir aba auxiliar.
        // Fallback automático para o método antigo (aba + raspagem do DOM) se a API falhar.
        if (window.PJeColetorAPI && window.PJeColetorAPI.coletarTudo) {
          setLoading('Atualizando via API (Minhas Tarefas)…');
          window.PJeColetorAPI.coletarTudo().then(function(res) {
            showResult(res);
          }).catch(function(e) {
            console.warn('[PJeOverlay] Varredura API falhou, usando metodo antigo:', e);
            if (state.resultado && state.resultado.fonte === 'Coleta automática completa') iniciarAuto();
            else iniciarRapida();
          });
          return;
        }
        if (state.resultado && state.resultado.fonte === 'Coleta automática completa') iniciarAuto();
        else if (state.resultado) iniciarRapida();
        else render();
      });
      shadow.querySelectorAll('.tab').forEach(function(t) {
        t.addEventListener('click', function() { state.tab = t.dataset.t; render(); });
      });
      document.addEventListener('keydown', function(e) {
        if (host.style.display !== 'none' && e.key === 'Escape' && !state.coletando) close();
      });
    }

    // Backfill de href das tarefas a partir do mapa pjmHrefTarefas (publicado pelo
    // coletor no ngframe). Garante que "Abrir em sequência" e "↗ Autos" tenham href
    // mesmo quando a coleta por API não trouxe href.
    function aplicarHrefsDoMapa() {
      var mapa = state.hrefMap;
      if (!mapa || !state.resultado || !state.resultado.tarefas) return 0;
      var nrm = function (s) { return String(s || '').trim().toUpperCase().replace(/\s+/g, ' '); };
      var n = 0;
      state.resultado.tarefas.forEach(function (t) {
        if (!t || !t.nome || t.href) return;
        var nn = nrm(t.nome), tipo = t.tipoCard || 'minhas';
        var hit = mapa[tipo + '|' + nn] || mapa['minhas|' + nn] || mapa['gerais|' + nn];
        if (hit) { t.href = hit.href; t.filtroBase64 = hit.filtroBase64; n++; }
      });
      if (n) console.log('[PJM overlay] href backfill:', n, 'tarefa(s) do mapa');
      return n;
    }
    // idProcesso (idInterno) de um CNJ, pela coleta — habilita a abertura DIRETA dos autos.
    function idProcessoDeCnj(cnj) {
      var d = String(cnj || '').replace(/\D/g, '');
      var ts = (state.resultado && state.resultado.tarefas) || [];
      for (var i = 0; i < ts.length; i++) {
        var ps = ts[i].processos || [];
        for (var j = 0; j < ps.length; j++) {
          if (String((ps[j] || {}).numero || '').replace(/\D/g, '') === d) return String(ps[j].idInterno || '');
        }
      }
      return '';
    }
    try { chrome.storage.local.get('pjmHrefTarefas', function (r) { if (r && r.pjmHrefTarefas) { state.hrefMap = r.pjmHrefTarefas; aplicarHrefsDoMapa(); } }); } catch (_) { /* noop */ }

    // Atualiza lista de agendamentos quando o executor ou o alarme modificar o storage
    try {
      chrome.storage.onChanged.addListener(function(changes) {
        if (changes.pjmAgendamentos) {
          state.agendamentos = changes.pjmAgendamentos.newValue || [];
          if (state.tab === 'agendamentos') render();
        }
        if (changes.pjmRelatorio) {
          state.relatorioCache = changes.pjmRelatorio.newValue || { sessoes: [] };
          if (state.tab === 'tarefas') render();
        }
        // Mapa de href das tarefas (publicado pelo coletor no ngframe) → backfill.
        if (changes.pjmHrefTarefas && changes.pjmHrefTarefas.newValue) {
          state.hrefMap = changes.pjmHrefTarefas.newValue;
          if (aplicarHrefsDoMapa() && host && host.style.display !== 'none') render();
        }
        // Coleta via API (content/coletor-api.js) mescla em pjeMapperUltimoResultado:
        // atualiza o painel ao vivo se aberto; senao fica pronto para o proximo open().
        if (changes.pjeMapperUltimoResultado && changes.pjeMapperUltimoResultado.newValue) {
          state.resultado = changes.pjeMapperUltimoResultado.newValue;
          aplicarHrefsDoMapa();
          if (host && host.style.display !== 'none') render();
        }
      });
    } catch (e) { console.warn('[PJM fullscreen-overlay]', e); }

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
  }
})();
