/** The Lumbung page: sign in with Google, an overview, files (folders per project, with previews), and settings. Plain HTML and script, no build. */
export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#faf7f2" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#2a1a12" media="(prefers-color-scheme: dark)" />
<title>Lumbung</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%232a1a12'/%3E%3Cpath d='M5%2015.5%2016%207l11%208.5-1.6%201.2L16%2010%206.6%2016.7z' fill='%23faf7f2'/%3E%3Crect x='8' y='16' width='16' height='9' rx='1' fill='%23faf7f2'/%3E%3Crect x='13.5' y='19' width='5' height='6' fill='%23ff5f1f'/%3E%3C/svg%3E" type="image/svg+xml" />
<script>
  // Apply the saved theme before first paint (same key as Silpasala).
  try { var t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) {}
</script>
<style>
  /* Basis design tokens, the same palette as Silpasala (ivory and espresso, signal orange accent). */
  :root { color-scheme: light dark; --bg: #faf7f2; --surface: #fffdf9; --surface-2: #f3eee5; --text: #2a1a12; --muted: #6e5a4c; --line: rgb(42 26 18 / 0.1); --fill: rgb(42 26 18 / 0.05); --accent: #ff5f1f; --accent-ink: #a83a08; --accent-fill: #d14210; --accent-hover: #b93a0c; --accent-soft: rgb(255 95 31 / 0.12); --danger: #c62222; --radius: 8px; --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter Variable", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme=light]) { --bg: #2a1a12; --surface: #33221a; --surface-2: #35231a; --text: #faf7f2; --muted: #bfae9f; --line: rgb(250 247 242 / 0.1); --fill: rgb(250 247 242 / 0.07); --accent-ink: #ff8a5c; --accent-soft: rgb(255 95 31 / 0.18); --danger: #f87171; } }
  :root[data-theme=dark] { --bg: #2a1a12; --surface: #33221a; --surface-2: #35231a; --text: #faf7f2; --muted: #bfae9f; --line: rgb(250 247 242 / 0.1); --fill: rgb(250 247 242 / 0.07); --accent-ink: #ff8a5c; --accent-soft: rgb(255 95 31 / 0.18); --danger: #f87171; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--text); font: 14px/1.5 var(--font); }
  h1, h2 { margin: 0; letter-spacing: -0.01em; }
  h1 { font-size: 24px; }
  h2 { font-size: 16px; }
  .muted { color: var(--muted); }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 14px; white-space: nowrap; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
  .btn:hover { background: var(--fill); }
  .btn.primary { background: var(--accent-fill); border-color: var(--accent-fill); color: #fff; }
  .btn.primary:hover { background: var(--accent-hover); }
  .btn.danger { color: var(--danger); }
  .btn.small { padding: 4px 10px; font-size: 13px; }
  .btn:focus-visible, .side-link:focus-visible, .theme-switch button:focus-visible, .menu-btn:focus-visible, .folder:focus-visible, .file-name-btn:focus-visible, .crumbs button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; background: var(--fill); color: var(--muted); font-size: 12px; font-weight: 600; white-space: nowrap; }
  .badge.accent { background: var(--accent-soft); color: var(--accent-ink); }
  .banner { margin: 0 0 16px; border-radius: var(--radius); padding: 12px 16px; background: color-mix(in srgb, var(--danger) 10%, var(--surface)); color: var(--danger); white-space: pre-line; }
  input, select { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 7px 10px; }
  input:focus, select:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

  /* Theme switch (system, light, dark) */
  .theme-switch { display: inline-flex; gap: 2px; padding: 3px; border-radius: var(--radius); background: var(--fill); }
  .theme-switch button { display: grid; place-items: center; width: 30px; height: 26px; padding: 0; border: 0; border-radius: 6px; background: none; color: var(--muted); cursor: pointer; }
  .theme-switch button[aria-pressed=true] { background: var(--surface); color: var(--text); box-shadow: 0 1px 2px rgb(42 26 18 / 0.12); }

  /* Sign-in: a dark brand panel on the left, the Google sign-in on the right (as in Silpasala). */
  .login { min-height: 100vh; min-height: 100dvh; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); background: var(--bg); }
  .login-hero { position: relative; isolation: isolate; display: flex; flex-direction: column; gap: 32px; padding: 40px clamp(32px, 5vw, 64px); overflow: hidden; color: #fff; background: #2a1a12; box-shadow: inset -1px 0 0 rgb(255 255 255 / 0.08); }
  .login-hero::before { content: ""; position: absolute; inset: 0; z-index: -1; background: radial-gradient(560px 380px at 88% 4%, rgb(255 255 255 / 0.14), transparent 70%), radial-gradient(520px 420px at 0% 100%, rgb(255 255 255 / 0.07), transparent 70%), linear-gradient(rgb(255 255 255 / 0.045) 1px, transparent 1px) 0 0 / 32px 32px, linear-gradient(90deg, rgb(255 255 255 / 0.045) 1px, transparent 1px) 0 0 / 32px 32px; mask-image: linear-gradient(to bottom, #000 45%, transparent); }
  .login-brand { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
  .login-brand svg { width: 36px; height: 36px; display: block; border-radius: 9px; box-shadow: 0 0 0 1px rgb(255 255 255 / 0.18), 0 4px 14px rgb(0 0 0 / 0.4); }
  .login-pitch { max-width: 30rem; margin-top: auto; }
  .login-pitch h2 { margin: 0 0 10px; font-size: clamp(28px, 3vw, 40px); line-height: 1.1; letter-spacing: -0.03em; color: #fff; }
  .login-pitch p { margin: 0; font-size: 16px; line-height: 1.5; color: rgb(255 255 255 / 0.7); }
  .login-preview { display: flex; flex-direction: column; gap: 10px; max-width: 30rem; padding: 12px; border-radius: 12px; background: rgb(255 255 255 / 0.06); box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12), 0 24px 60px rgb(0 0 0 / 0.5); }
  .login-preview-row { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 9px; background: #fff; box-shadow: 0 2px 10px rgb(0 0 0 / 0.35); animation: login-float 6s ease infinite; animation-delay: calc(var(--i) * -2s); }
  .login-chip { flex-shrink: 0; padding: 3px 7px; border-radius: 5px; background: var(--c); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; }
  .login-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .login-lines i { display: block; height: 6px; border-radius: 3px; background: #e6dccb; }
  .login-lines i.short { width: 38%; background: #ececee; }
  @keyframes login-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  @media (prefers-reduced-motion: reduce) { .login-preview-row { animation: none; } }
  .login-highlights { display: grid; gap: 14px; max-width: 30rem; margin: 0; padding: 0; list-style: none; }
  .login-highlights strong { display: block; font-size: 14px; color: #fff; }
  .login-highlights span { font-size: 13.5px; line-height: 1.45; color: rgb(255 255 255 / 0.65); }
  .login-main { position: relative; display: grid; place-items: center; padding: 72px 24px 32px; }
  .login-theme { position: absolute; top: 16px; right: 16px; }
  .login-card { width: min(400px, 100%); display: flex; flex-direction: column; gap: 18px; }
  .login-card-logo svg { width: 44px; height: 44px; display: block; border-radius: 10px; box-shadow: 0 0 0 1px var(--line), 0 6px 18px rgb(0 0 0 / 0.18); }
  .login-card-head h1 { margin: 0 0 6px; font-size: 30px; letter-spacing: -0.02em; }
  .login-card-head p { margin: 0; color: var(--muted); font-size: 14px; }
  .login-card .banner { margin: 0; }
  .google-btn { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 48px; padding: 0 20px; border-radius: var(--radius); background: var(--surface); color: var(--text); font-weight: 600; text-decoration: none; box-shadow: 0 0 0 1px var(--line), 0 1px 2px rgb(42 26 18 / 0.08); transition: box-shadow 0.15s, background 0.15s; }
  .google-btn:hover { background: color-mix(in srgb, var(--surface) 94%, var(--accent)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--line) 50%, var(--accent)), 0 6px 18px rgb(42 26 18 / 0.1); }
  .google-btn:active { transform: scale(0.99); }
  .login-note { margin: 0; padding: 12px 14px; border-radius: var(--radius); background: var(--fill); color: var(--muted); font-size: 13px; line-height: 1.45; }
  @media (max-width: 900px) {
    .login { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto 1fr; }
    .login-hero { gap: 22px; padding: 22px 24px 30px; border-radius: 0 0 16px 16px; box-shadow: inset 0 -1px 0 rgb(255 255 255 / 0.08); }
    .login-pitch { margin-top: 6px; }
    .login-pitch h2 { font-size: 30px; }
    .login-pitch p { font-size: 15px; }
    .login-preview { max-width: none; }
    .login-highlights { display: none; }
    .login-main { place-items: start center; padding: 28px 24px 32px; }
    .login-card-logo { display: none; }
    .login-card-head h1 { font-size: 26px; }
    .login-theme { top: 18px; right: 18px; }
    .login-theme .theme-switch { background: rgb(255 255 255 / 0.1); }
    .login-theme .theme-switch button { color: rgb(255 255 255 / 0.65); }
    .login-theme .theme-switch button[aria-pressed=true] { background: rgb(255 255 255 / 0.2); color: #fff; box-shadow: none; }
  }
  @media (max-width: 900px) and (max-height: 700px), (min-width: 901px) and (max-height: 720px) { .login-preview { display: none; } }

  /* App shell: sidebar on the left (as in Silpasala), the page on the right. */
  .app { display: grid; grid-template-columns: 232px minmax(0, 1fr); min-height: 100vh; }
  .sidebar { position: sticky; top: 0; height: 100vh; height: 100dvh; display: flex; flex-direction: column; gap: 2px; padding: 14px 10px; background: var(--surface); border-right: 1px solid var(--line); }
  .sidebar-brand { display: flex; align-items: center; gap: 10px; padding: 2px 8px 14px; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
  .sidebar-brand svg { width: 28px; height: 28px; display: block; border-radius: 8px; box-shadow: 0 0 0 1px var(--line), 0 2px 8px rgb(0 0 0 / 0.16); }
  .sidebar-nav { display: flex; flex-direction: column; gap: 2px; }
  .side-link { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 34px; padding: 6px 10px; border: 0; border-radius: 6px; background: none; color: var(--muted); font: inherit; font-weight: 500; text-align: left; text-decoration: none; cursor: pointer; transition: background 0.15s, color 0.15s; }
  .side-link svg { flex-shrink: 0; }
  .side-link:hover { background: var(--fill); color: var(--text); }
  .side-link.is-active { background: var(--accent-soft); color: var(--accent-ink); font-weight: 600; }
  .sidebar-foot { margin-top: auto; display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--line); }
  .side-user { display: flex; flex-direction: column; gap: 2px; padding: 4px 10px; min-width: 0; }
  .side-user strong { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .side-user span { font-size: 12px; color: var(--muted); }
  .topbar { display: none; }
  .backdrop { display: none; }
  .content { min-width: 0; }
  main { max-width: 1120px; padding: 28px 32px 64px; }
  .page-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
  .page-head p { margin: 4px 0 0; color: var(--muted); }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; justify-content: space-between; }
  .drop { border: 1.5px dashed var(--line); border-radius: 12px; padding: 22px; text-align: center; color: var(--muted); cursor: pointer; display: block; }
  .drop:hover, .drop.over { border-color: var(--accent); color: var(--text); background: var(--accent-soft); }
  input[type=file] { display: none; }
  .card.flush { padding: 0; overflow: hidden; margin-bottom: 0; }
  .empty { padding: 28px 8px; text-align: center; color: var(--muted); }
  .meta { font-size: 12px; color: var(--muted); }
  .grow { flex: 1; min-width: 0; }

  /* Overview */
  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  .kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
  .kpi-label { font-size: 13px; color: var(--muted); }
  .kpi-value { margin: 4px 0 2px; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .kpi-sub { font-size: 12px; color: var(--muted); }
  .two { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; align-items: start; }
  .list-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); }
  .list-row:last-child { border-bottom: 0; padding-bottom: 0; }
  .list-row .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar-track { height: 6px; margin-top: 6px; border-radius: 3px; background: var(--fill); overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; background: var(--accent); }

  /* Files: folders per project, then the files inside */
  .crumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; font-size: 13px; color: var(--muted); }
  .crumbs button { padding: 2px 6px; border: 0; border-radius: 6px; background: none; color: var(--muted); font: inherit; cursor: pointer; }
  .crumbs button:hover { background: var(--fill); color: var(--text); }
  .crumbs .here { color: var(--text); font-weight: 600; }
  .folder-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .folder { display: flex; flex-direction: column; gap: 10px; padding: 16px; text-align: left; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--text); font: inherit; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
  .folder:hover { border-color: var(--accent); background: color-mix(in srgb, var(--surface) 92%, var(--accent)); }
  .folder-icon { color: var(--accent-ink); }
  .folder-name { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .folder-sub { font-size: 12px; color: var(--muted); }
  .file-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .file-kind { flex-shrink: 0; color: var(--muted); display: grid; place-items: center; }
  .file-name-btn { min-width: 0; padding: 0; border: 0; background: none; color: var(--text); font: inherit; font-weight: 600; text-align: left; word-break: break-word; cursor: pointer; }
  .file-name-btn:hover { color: var(--accent-ink); text-decoration: underline; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  th { color: var(--muted); font-size: 12px; font-weight: 600; letter-spacing: 0.02em; background: var(--surface-2); }
  td:first-child, th:first-child { padding-left: 16px; }
  td:last-child, th:last-child { padding-right: 16px; }
  tbody tr:hover td { background: var(--fill); }
  td.num, th.num { text-align: right; white-space: nowrap; }
  td.actions { text-align: right; white-space: nowrap; }
  td.actions .btn { margin-left: 6px; }
  .name { font-weight: 600; word-break: break-word; }
  .form-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 16px; }
  .form-row input[type=email] { flex: 1 1 260px; }

  /* Preview dialog */
  #modal:empty { display: none; }
  .modal-bg { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 20px; background: rgb(20 12 8 / 0.6); }
  .modal { width: min(1000px, 100%); height: min(88vh, 900px); display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; box-shadow: 0 30px 80px rgb(0 0 0 / 0.4); }
  .modal-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px 12px 18px; border-bottom: 1px solid var(--line); }
  .modal-body { flex: 1; min-height: 0; overflow: auto; display: flex; align-items: center; justify-content: center; background: var(--surface-2); }
  .modal-body.is-text { display: block; background: var(--surface); }
  .modal-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--line); }
  .preview-img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
  .preview-frame { width: 100%; height: 100%; border: 0; background: #fff; }
  .preview-text { margin: 0; padding: 18px; white-space: pre-wrap; word-break: break-word; font: 13px/1.55 ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace; }
  .preview-note { padding: 8px 18px; font-size: 12px; color: var(--muted); }
  .preview-table { overflow: auto; }
  .preview-table td, .preview-table th { white-space: nowrap; font-size: 13px; }

  @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 900px) {
    .two { grid-template-columns: minmax(0, 1fr); }
    th.hide-sm, td.hide-sm { display: none; }
  }
  @media (max-width: 800px) {
    .app { grid-template-columns: minmax(0, 1fr); }
    .sidebar { position: fixed; z-index: 30; left: 0; top: 0; width: 260px; transform: translateX(-100%); transition: transform 0.2s ease; box-shadow: 0 0 40px rgb(0 0 0 / 0.25); }
    .nav-open .sidebar { transform: none; }
    .nav-open .backdrop { display: block; position: fixed; inset: 0; z-index: 29; background: rgb(0 0 0 / 0.4); }
    .topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--line); }
    .menu-btn { display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); color: var(--text); cursor: pointer; }
    .topbar-brand { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .topbar-brand svg { width: 24px; height: 24px; display: block; border-radius: 7px; }
    main { padding: 20px 16px 48px; }
    .kpis { gap: 10px; }
    .kpi-value { font-size: 22px; }
    .modal-bg { padding: 0; }
    .modal { width: 100%; height: 100%; border-radius: 0; border: 0; }
  }
  @media (max-width: 480px) { .kpis { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
</style>
</head>
<body>
<div id="app"></div>
<div id="modal"></div>
<script>
(function () {
  var app = document.getElementById("app");
  var modalHost = document.getElementById("modal");
  var TABS = ["home", "files", "settings"];
  var state = { me: null, tab: "home", files: [], drive: null, members: [], error: "", notice: "", nav: false, folder: null, preview: null };
  var hashTab = location.hash.slice(1);
  if (TABS.indexOf(hashTab) >= 0) state.tab = hashTab;
  var ERRORS = {
    not_invited: "This Google account is not invited to Lumbung. Ask the superadmin to add it.",
    disabled: "This account has been disabled. Ask the superadmin for access.",
    unverified: "Your Google email address is not verified.",
    state: "The sign-in expired. Please try again.",
    google: "Google sign-in failed. Please try again.",
    signin: "Sign in as the superadmin before connecting Google Drive.",
    drive: "Google Drive could not be connected. Please try again."
  };
  // The brand mark: a rice barn (lumbung), on the same espresso tile as Silpasala's mark.
  var MARK = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#2a1a12"/><rect x=".5" y=".5" width="31" height="31" rx="7.5" fill="none" stroke="#fff" stroke-opacity=".14"/><path d="M5 15.5 16 7l11 8.5-1.6 1.2L16 10 6.6 16.7z" fill="#faf7f2"/><rect x="8" y="16" width="16" height="9" rx="1" fill="#faf7f2"/><rect x="13.5" y="19" width="5" height="6" fill="#ff5f1f"/></svg>';
  var GOOGLE_MARK = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  // Icons: one path each, drawn with the current color (24px grid, 2px stroke).
  var ICON = {
    home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    files: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    settings: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    menu: "M3 6h18M3 12h18M3 18h18",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
    download: "M12 4v12M7 11l5 5 5-5M4 20h16",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14",
    chevL: "M15 18l-6-6 6-6",
    chevR: "M9 18l6-6-6-6",
    x: "M18 6L6 18M6 6l12 12",
    image: "M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6M15 8.5a1 1 0 1 0 0 .01",
    table: "M3 4h18v16H3zM3 10h18M3 15h18M9 4v16",
    doc: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h7M9 17h7",
    system: "M3 4h18v12H3zM8 20h8M12 16v4",
    light: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    dark: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
  };
  function svg(name, size) { return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICON[name] + '"/></svg>'; }
  var RANK = { user: 1, admin: 2, superadmin: 3 };
  var ROLE_LABEL = { superadmin: "Superadmin", admin: "Admin", user: "User" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function bytes(n) { if (n < 1024) return n + " B"; if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"; if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + " MB"; return (n / 1024 / 1024 / 1024).toFixed(2) + " GB"; }
  function when(t) { return t ? new Date(t).toLocaleString() : "–"; }
  function can(min) { return state.me && RANK[state.me.role] >= RANK[min]; }

  function api(path, opts) {
    return fetch(path, opts || {}).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) { var e = new Error(body.error || ("Request failed (" + res.status + ")")); e.status = res.status; throw e; }
        return body;
      });
    });
  }

  function notify(text, isError) { state.error = isError ? text : ""; state.notice = isError ? "" : text; render(); }

  /* Theme: system (follows the OS), light, or dark. The choice is kept on this device. */
  function themeSwitch() {
    var cur = document.documentElement.getAttribute("data-theme") || "system";
    return '<div class="theme-switch" role="group" aria-label="Theme">' + ["system", "light", "dark"].map(function (t) {
      return '<button type="button" data-theme-value="' + t + '" aria-pressed="' + (t === cur) + '" aria-label="' + t + ' theme" title="' + t + '">' + svg(t, 15) + "</button>";
    }).join("") + "</div>";
  }
  function setTheme(t) {
    if (t === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
    try { if (t === "system") localStorage.removeItem("theme"); else localStorage.setItem("theme", t); } catch (e) {}
    render();
  }
  function wireTheme() {
    document.querySelectorAll("[data-theme-value]").forEach(function (b) {
      b.onclick = function () { setTheme(b.getAttribute("data-theme-value")); };
    });
  }

  function loginView() {
    var err = state.error ? '<div class="banner">' + esc(state.error) + "</div>" : "";
    var rows = [["PDF", "#c62222", 70], ["PNG", "#ff5f1f", 56], ["CSV", "#137438", 82]].map(function (r, i) {
      return '<div class="login-preview-row" style="--i:' + i + '"><span class="login-chip" style="--c:' + r[1] + '">' + r[0] + '</span><span class="login-lines"><i style="width:' + r[2] + '%"></i><i class="short"></i></span></div>';
    }).join("");
    app.innerHTML =
      '<div class="login">' +
      '<aside class="login-hero">' +
      '<div class="login-brand">' + MARK + "<span>Lumbung</span></div>" +
      '<div class="login-pitch"><h2>Keep every file safe, in one place.</h2><p>Storage for Silpasala and other apps. Files are kept in Google Drive, and deleted files stay in the trash for 30 days.</p></div>' +
      '<div class="login-preview" aria-hidden="true">' + rows + "</div>" +
      '<ul class="login-highlights">' +
      "<li><strong>Your own Google Drive</strong><span>Every file is stored in the Drive that the superadmin connects.</span></li>" +
      "<li><strong>Invitation only</strong><span>Only the superadmin and members they invite can sign in.</span></li>" +
      "<li><strong>Trash for 30 days</strong><span>Deleted files can be recovered before they are removed for good.</span></li>" +
      "</ul></aside>" +
      '<main class="login-main"><div class="login-theme">' + themeSwitch() + '</div><div class="login-card">' +
      '<div class="login-card-logo">' + MARK + "</div>" +
      '<div class="login-card-head"><h1>Welcome back</h1><p>Sign in with your Google account to continue.</p></div>' +
      err +
      '<a class="google-btn" href="/auth/login">' + GOOGLE_MARK + "Continue with Google</a>" +
      '<p class="login-note">Access is by invitation only. Ask the superadmin to invite your email.</p>' +
      "</div></main></div>";
    wireTheme();
  }

  function setTab(tab) {
    state.tab = tab;
    state.nav = false;
    state.error = "";
    state.notice = "";
    if (tab !== "files") state.folder = null;
    history.replaceState(null, "", "#" + tab);
    render();
    if (tab === "settings") loadSettings();
  }

  function navLink(tab, label, icon) {
    return '<button type="button" class="side-link' + (state.tab === tab ? " is-active" : "") + '" data-tab="' + tab + '"' + (state.tab === tab ? ' aria-current="page"' : "") + ">" + svg(icon, 16) + "<span>" + label + "</span></button>";
  }

  function sidebar() {
    return '<aside class="sidebar" aria-label="Sidebar">' +
      '<div class="sidebar-brand">' + MARK + "<span>Lumbung</span></div>" +
      '<nav class="sidebar-nav" aria-label="Main">' +
      navLink("home", "Overview", "home") +
      navLink("files", "Files", "files") +
      (can("admin") ? navLink("settings", "Settings", "settings") : "") +
      "</nav>" +
      '<div class="sidebar-foot">' + themeSwitch() +
      '<div class="side-user"><strong>' + esc(state.me.email) + "</strong><span>" + ROLE_LABEL[state.me.role] + "</span></div>" +
      '<button type="button" class="side-link" id="logout">' + svg("logout", 16) + "<span>Sign out</span></button>" +
      "</div></aside>";
  }

  function notices() {
    return (state.error ? '<div class="banner">' + esc(state.error) + "</div>" : "") +
      (state.notice ? '<div class="card" style="padding:12px 16px;">' + esc(state.notice) + "</div>" : "");
  }

  /* Overview: numbers from the files list, the newest uploads, and what each app stores. */
  function homeView() {
    var files = state.files;
    var total = files.reduce(function (sum, f) { return sum + f.size; }, 0);
    var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var week = files.filter(function (f) { return f.createdAt >= weekAgo; }).length;
    var apps = {};
    files.forEach(function (f) {
      var a = apps[f.app] || (apps[f.app] = { name: f.app, count: 0, bytes: 0 });
      a.count++;
      a.bytes += f.size;
    });
    var appList = Object.keys(apps).map(function (k) { return apps[k]; }).sort(function (x, y) { return y.bytes - x.bytes; });
    var maxBytes = appList.length ? appList[0].bytes : 0;
    var more = files.length >= 500 ? "+" : "";
    var kpi = function (label, value, sub) {
      return '<div class="kpi"><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div><div class="kpi-sub">' + sub + "</div></div>";
    };
    var recent = files.slice(0, 6).map(function (f) {
      var scope = esc(f.app) + (f.project ? " · " + esc(f.project) : "");
      return '<div class="list-row"><div class="grow"><button type="button" class="file-name-btn" data-view="' + esc(f.id) + '">' + esc(f.name) + '</button><div class="meta">' + scope + " · " + when(f.createdAt) + '</div></div>' +
        '<span class="meta">' + bytes(f.size) + '</span><a class="btn small" href="/api/files/' + encodeURIComponent(f.id) + '" aria-label="Download ' + esc(f.name) + '">' + svg("download", 14) + "</a></div>";
    }).join("");
    var byApp = appList.map(function (a) {
      var pct = maxBytes ? Math.max(4, Math.round((a.bytes / maxBytes) * 100)) : 0;
      return '<div class="list-row" style="flex-direction:column;align-items:stretch;gap:0;"><div class="row"><span class="name">' + esc(a.name) + '</span><span class="meta">' + a.count + (a.count === 1 ? " file" : " files") + " · " + bytes(a.bytes) + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>';
    }).join("");
    return '<div class="page-head"><div><h1>Overview</h1><p>Everything stored in Lumbung, at a glance.</p></div>' +
      '<button type="button" class="btn primary" data-tab="files">' + svg("upload", 15) + " Upload files</button></div>" +
      '<div class="kpis">' +
      kpi("Files stored", files.length + more, "Live files, all apps") +
      kpi("Storage used", bytes(total), "Size of live files") +
      kpi("Added this week", week, "Uploaded in the last 7 days") +
      kpi("Apps", appList.length, "Apps storing files here") +
      "</div>" +
      '<div class="two"><div class="card"><div class="card-head"><h2>Recent uploads</h2><button type="button" class="btn small" data-tab="files">View all</button></div>' +
      (recent || '<div class="empty">No files yet. Upload one to see it here.</div>') + "</div>" +
      '<div class="card"><div class="card-head"><h2>By app</h2></div>' + (byApp || '<div class="empty">Nothing stored yet.</div>') + "</div></div>";
  }

  /* Files: one folder per project (grouped by app), and inside a folder its files. */
  function folders() {
    var map = {};
    state.files.forEach(function (f) {
      var key = f.app + "/" + (f.project || "");
      var g = map[key] || (map[key] = { app: f.app, project: f.project || null, count: 0, bytes: 0, last: 0 });
      g.count++;
      g.bytes += f.size;
      if (f.createdAt > g.last) g.last = f.createdAt;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (x, y) { return y.last - x.last; });
  }

  function folderFiles() {
    var fo = state.folder;
    return state.files.filter(function (f) { return f.app === fo.app && (f.project || null) === fo.project; });
  }

  function kindOf(f) {
    var ct = f.contentType || "";
    if (ct.indexOf("image/") === 0) return "image";
    if (ct === "application/pdf") return "pdf";
    if (ct === "text/csv") return "csv";
    if (ct === "text/plain" || ct === "text/markdown" || ct === "application/json") return "text";
    return "none";
  }

  function iconFor(f) {
    var k = kindOf(f);
    if (k === "image") return svg("image", 18);
    if (k === "csv" || /sheet|excel/.test(f.contentType || "")) return svg("table", 18);
    return svg("doc", 18);
  }

  function rootView() {
    var list = folders();
    var cards = list.map(function (g, i) {
      return '<button type="button" class="folder" data-folder="' + i + '">' + '<span class="folder-icon">' + svg("files", 26) + '</span>' + '<span class="folder-name">' + esc(g.project || "No project") + '</span><span class="folder-sub">' + esc(g.app) + " · " + g.count + (g.count === 1 ? " file" : " files") + " · " + bytes(g.bytes) + "</span></button>";
    }).join("");
    return '<div class="page-head"><div><h1>Files</h1><p>Each project is a folder. Open one to see and read its files.</p></div></div>' +
      (cards ? '<div class="folder-grid">' + cards + "</div>" : '<div class="card"><div class="empty">No files yet. Files uploaded from the apps appear here, in a folder per project.</div></div>');
  }

  function folderView() {
    var fo = state.folder;
    var list = folderFiles();
    var total = list.reduce(function (sum, f) { return sum + f.size; }, 0);
    var rows = list.map(function (f) {
      var del = can("admin") ? '<button class="btn small danger" data-delete="' + esc(f.id) + '" aria-label="Delete ' + esc(f.name) + '">' + svg("trash", 14) + "</button>" : "";
      return '<tr><td><div class="file-cell"><span class="file-kind">' + iconFor(f) + '</span><button type="button" class="file-name-btn" data-view="' + esc(f.id) + '">' + esc(f.name) + "</button></div></td>" +
        '<td class="hide-sm muted">' + esc(f.contentType) + '</td><td class="num">' + bytes(f.size) + '</td><td class="hide-sm muted">' + esc(f.uploadedBy) + '<div class="meta">' + when(f.createdAt) + "</div></td>" +
        '<td class="actions"><button class="btn small" data-view="' + esc(f.id) + '">' + svg("eye", 14) + ' View</button> <a class="btn small" href="/api/files/' + encodeURIComponent(f.id) + '" aria-label="Download ' + esc(f.name) + '">' + svg("download", 14) + "</a>" + del + "</td></tr>";
    }).join("");
    return '<div class="crumbs"><button type="button" data-crumb="root">Files</button><span>/</span><span>' + esc(fo.app) + '</span><span>/</span><span class="here">' + esc(fo.project || "No project") + "</span></div>" +
      '<div class="page-head"><div><h1>' + esc(fo.project || "No project") + '</h1><p>' + esc(fo.app) + " · " + list.length + (list.length === 1 ? " file" : " files") + " · " + bytes(total) + "</p></div>" +
      '<button type="button" class="btn primary" id="pick">' + svg("upload", 15) + " Upload here</button></div>" +
      '<div class="card"><label class="drop" id="drop"><strong>Drop files here</strong> to add them to this folder. Up to 100 MB each.<input id="file-input" type="file" multiple /></label>' +
      '<div class="muted" id="upload-state" style="margin-top:10px;"></div></div>' +
      '<div class="card flush"><table><thead><tr><th>Name</th><th class="hide-sm">Type</th><th class="num">Size</th><th class="hide-sm">Uploaded by</th><th></th></tr></thead><tbody>' +
      rows + "</tbody></table>" + (list.length ? "" : '<div class="empty">This folder is empty.</div>') + "</div>";
  }

  function filesView() {
    return state.folder ? folderView() : rootView();
  }

  function driveCard() {
    var d = state.drive || {};
    var action = "";
    var text;
    if (d.connected) {
      text = "Connected as " + esc(d.email || "a Google account") + (d.connectedAt ? " since " + new Date(d.connectedAt).toLocaleDateString() : "");
      if (can("superadmin")) action = '<button class="btn danger" id="drive-disconnect">Disconnect</button>';
    } else {
      text = "Not connected. Uploads need Google Drive.";
      if (can("superadmin")) action = '<a class="btn primary" href="/auth/drive">Connect Google Drive</a>';
    }
    return '<div class="card"><div class="row"><div><h2>Google Drive</h2><div class="muted">' + text + "</div></div><div>" + action + "</div></div></div>";
  }

  function membersCard() {
    var rows = state.members.map(function (m) {
      var roleCell, statusCell, actions = "";
      if (m.fixed) {
        roleCell = '<span class="badge accent">Superadmin</span>';
        statusCell = '<span class="muted">Always active</span>';
      } else {
        roleCell = can("superadmin")
          ? '<select data-role="' + esc(m.email) + '"><option value="admin"' + (m.role === "admin" ? " selected" : "") + '>Admin</option><option value="user"' + (m.role === "user" ? " selected" : "") + ">User</option></select>"
          : '<span class="badge">' + ROLE_LABEL[m.role] + "</span>";
        statusCell = m.status === "active" ? '<span class="muted">Active</span>' : '<span class="badge">Disabled</span>';
        if (can("superadmin")) {
          actions = '<button class="btn small" data-toggle="' + esc(m.email) + '" data-status="' + esc(m.status) + '">' + (m.status === "active" ? "Disable" : "Enable") + '</button><button class="btn small danger" data-remove="' + esc(m.email) + '">Remove</button>';
        }
      }
      return "<tr><td class=\\"name\\">" + esc(m.email) + "</td><td>" + roleCell + '</td><td class="hide-sm">' + statusCell + '</td><td class="hide-sm muted">' + (m.fixed ? "" : esc(m.invitedBy || "")) + '</td><td class="actions">' + actions + "</td></tr>";
    }).join("");
    var add = can("superadmin")
      ? '<form class="form-row" id="add-member"><input type="email" id="new-email" placeholder="name@example.com" required /><select id="new-role"><option value="user">User</option><option value="admin">Admin</option></select><button class="btn primary" type="submit">Add member</button></form>'
      : "";
    return '<div class="card"><h2>Members</h2><div class="muted" style="margin:4px 0 12px;">Admins can delete files. Users can upload and download. Only the superadmin changes members and Drive.</div>' +
      '<div style="overflow-x:auto;"><table><thead><tr><th>Email</th><th>Role</th><th class="hide-sm">Status</th><th class="hide-sm">Invited by</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>" + add + "</div>";
  }

  function settingsView() {
    return '<div class="page-head"><div><h1>Settings</h1><p>Google Drive and who can sign in.</p></div></div>' + driveCard() + membersCard();
  }

  function pageView() {
    if (state.tab === "files") return filesView();
    if (state.tab === "settings" && can("admin")) return settingsView();
    return homeView();
  }

  function appView() {
    app.innerHTML =
      '<div class="app' + (state.nav ? " nav-open" : "") + '">' + sidebar() +
      '<div class="backdrop" id="backdrop"></div>' +
      '<div class="content"><div class="topbar"><button type="button" class="menu-btn" id="menu" aria-label="Open navigation">' + svg("menu", 18) + '</button><span class="topbar-brand">' + MARK + "<span>Lumbung</span></span></div>" +
      "<main>" + notices() + pageView() + "</main></div></div>";
    wireApp();
  }

  function render() {
    renderModal();
    if (!state.me) return loginView();
    appView();
  }

  function wireApp() {
    document.getElementById("logout").onclick = function () {
      fetch("/auth/logout", { method: "POST" }).then(function () { location.href = "/"; });
    };
    document.getElementById("menu").onclick = function () { state.nav = true; render(); };
    document.getElementById("backdrop").onclick = function () { state.nav = false; render(); };
    wireTheme();
    document.querySelectorAll("[data-tab]").forEach(function (b) {
      b.onclick = function () { setTab(b.getAttribute("data-tab")); };
    });
    document.querySelectorAll("[data-view]").forEach(function (b) {
      b.onclick = function () { openPreview(b.getAttribute("data-view")); };
    });
    if (state.tab === "files") wireFiles();
    else if (state.tab === "settings" && can("admin")) wireSettings();
  }

  function wireFiles() {
    document.querySelectorAll("[data-folder]").forEach(function (b) {
      b.onclick = function () {
        var g = folders()[Number(b.getAttribute("data-folder"))];
        if (!g) return;
        state.folder = { app: g.app, project: g.project };
        render();
      };
    });
    document.querySelectorAll("[data-crumb]").forEach(function (b) {
      b.onclick = function () { state.folder = null; render(); };
    });
    var input = document.getElementById("file-input");
    if (!input) return;
    var drop = document.getElementById("drop");
    var pick = document.getElementById("pick");
    pick.onclick = function () { input.click(); };
    input.onchange = function (e) { upload(e.target.files, state.folder); e.target.value = ""; };
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { upload(e.dataTransfer.files, state.folder); });
    document.querySelectorAll("[data-delete]").forEach(function (b) {
      b.onclick = function () { removeFile(b.getAttribute("data-delete")); };
    });
  }

  function removeFile(id) {
    var f = state.files.filter(function (x) { return x.id === id; })[0];
    if (!f || !confirm("Delete " + f.name + "? It goes to the trash for 30 days, then it is removed from Google Drive.")) return;
    api("/api/files/" + encodeURIComponent(id), { method: "DELETE" }).then(function () {
      if (state.preview && state.preview.id === id) closePreview();
      notify("Moved to the trash", false);
      loadFiles();
    }).catch(function (e) { notify(e.message, true); });
  }

  function wireSettings() {
    var d = document.getElementById("drive-disconnect");
    if (d) d.onclick = function () {
      if (!confirm("Disconnect Google Drive? Files stay in Drive, but uploads stop until you connect again.")) return;
      api("/api/drive/disconnect", { method: "POST" }).then(loadSettings).catch(function (e) { notify(e.message, true); });
    };
    document.querySelectorAll("[data-role]").forEach(function (s) {
      s.onchange = function () {
        api("/api/members/" + encodeURIComponent(s.getAttribute("data-role")), { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: s.value }) })
          .then(function (list) { state.members = list; notify("Role updated", false); }).catch(function (e) { notify(e.message, true); });
      };
    });
    document.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.onclick = function () {
        var next = b.getAttribute("data-status") === "active" ? "disabled" : "active";
        api("/api/members/" + encodeURIComponent(b.getAttribute("data-toggle")), { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) })
          .then(function (list) { state.members = list; notify(next === "active" ? "Member enabled" : "Member disabled", false); }).catch(function (e) { notify(e.message, true); });
      };
    });
    document.querySelectorAll("[data-remove]").forEach(function (b) {
      b.onclick = function () {
        var email = b.getAttribute("data-remove");
        if (!confirm("Remove " + email + "? They are signed out and can no longer sign in.")) return;
        api("/api/members/" + encodeURIComponent(email), { method: "DELETE" })
          .then(function (list) { state.members = list; notify("Member removed", false); }).catch(function (e) { notify(e.message, true); });
      };
    });
    var form = document.getElementById("add-member");
    if (form) form.onsubmit = function (e) {
      e.preventDefault();
      api("/api/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: document.getElementById("new-email").value, role: document.getElementById("new-role").value }) })
        .then(function (list) { state.members = list; notify("Member added", false); }).catch(function (e2) { notify(e2.message, true); });
    };
  }

  /* Uploads go into the folder that is open (its app and project); the drop zone is only in folders. */
  function upload(list, folder) {
    var files = Array.prototype.slice.call(list);
    if (!files.length) return;
    var done = 0, failed = [];
    var label = document.getElementById("upload-state");
    if (label) label.textContent = "Uploading…";
    files.reduce(function (chain, file) {
      return chain.then(function () {
        var headers = { "content-type": file.type || "application/octet-stream", "x-file-name": encodeURIComponent(file.name) };
        if (folder) { headers["x-app"] = folder.app; if (folder.project) headers["x-project"] = folder.project; }
        return fetch("/api/files", { method: "POST", headers: headers, body: file }).then(function (res) {
          if (!res.ok) return res.json().catch(function () { return {}; }).then(function (b) { failed.push(file.name + ": " + (b.error || res.status)); });
          done++;
        });
      });
    }, Promise.resolve()).then(function () {
      state.error = failed.join("\\n");
      state.notice = done + " of " + files.length + " uploaded";
      loadFiles();
    });
  }

  /* Preview: the file is fetched with the session and shown from a local blob. Images and PDFs show
     as they are, text and CSV as text, and other types can only be downloaded. */
  function parseCsv(text) {
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length && rows.length < 1000; i++) {
      var c = text.charAt(i);
      if (q) {
        if (c === '"') { if (text.charAt(i + 1) === '"') { cell += '"'; i++; } else q = false; } else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c !== "\\r") cell += c;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function visibleFiles() {
    return state.folder ? folderFiles() : state.files;
  }

  function openPreview(id) {
    if (state.preview) closePreview(true);
    var f = state.files.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    state.preview = { id: id, status: "loading", url: null, text: null, error: "" };
    renderModal();
    var kind = kindOf(f);
    if (kind === "none") { state.preview.status = "none"; renderModal(); return; }
    fetch("/api/files/" + encodeURIComponent(id)).then(function (res) {
      if (!res.ok) return res.json().catch(function () { return {}; }).then(function (b) { throw new Error(b.error || "The file could not be loaded."); });
      return res.blob();
    }).then(function (blob) {
      var p = state.preview;
      if (!p || p.id !== id) return;
      if (kind === "text" || kind === "csv") return blob.text().then(function (t) { p.text = t.slice(0, 500000); p.truncated = t.length > 500000; });
      p.url = URL.createObjectURL(blob);
    }).then(function () {
      if (state.preview && state.preview.id === id) { state.preview.status = "ready"; renderModal(); }
    }).catch(function (e) {
      if (state.preview && state.preview.id === id) { state.preview.status = "error"; state.preview.error = e.message; renderModal(); }
    });
  }

  function closePreview(keepState) {
    if (state.preview && state.preview.url) URL.revokeObjectURL(state.preview.url);
    state.preview = null;
    if (!keepState) renderModal();
  }

  function stepPreview(delta) {
    if (!state.preview) return;
    var list = visibleFiles();
    var i = -1;
    list.forEach(function (f, k) { if (f.id === state.preview.id) i = k; });
    var next = list[i + delta];
    if (next) openPreview(next.id);
  }

  function previewBody(p, f) {
    if (p.status === "loading") return '<div class="empty">Loading…</div>';
    if (p.status === "error") return '<div class="empty">' + esc(p.error) + "</div>";
    if (p.status === "none") return '<div class="empty">No preview for this type (' + esc(f.contentType) + "). Download it to open it.</div>";
    var kind = kindOf(f);
    if (kind === "image") return '<img class="preview-img" src="' + p.url + '" alt="' + esc(f.name) + '" />';
    if (kind === "pdf") return '<iframe class="preview-frame" src="' + p.url + '" title="' + esc(f.name) + '"></iframe>';
    if (kind === "csv") {
      var rows = parseCsv(p.text || "");
      if (!rows.length) return '<div class="empty">This file is empty.</div>';
      return '<div class="preview-table"><table>' + rows.map(function (r, i) {
        return "<tr>" + r.map(function (c) { return i === 0 ? "<th>" + esc(c) + "</th>" : "<td>" + esc(c) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</table></div>" + (p.truncated ? '<div class="preview-note">Showing the first 1,000 rows.</div>' : "");
    }
    return '<pre class="preview-text">' + esc(p.text) + "</pre>" + (p.truncated ? '<div class="preview-note">Showing the first 500 KB. Download the file for the rest.</div>' : "");
  }

  function renderModal() {
    var p = state.preview;
    if (!p) { modalHost.innerHTML = ""; return; }
    var f = state.files.filter(function (x) { return x.id === p.id; })[0];
    if (!f) { closePreview(true); modalHost.innerHTML = ""; return; }
    var list = visibleFiles();
    var idx = 0;
    list.forEach(function (x, k) { if (x.id === p.id) idx = k; });
    var del = can("admin") ? '<button type="button" class="btn small danger" id="pv-delete">' + svg("trash", 14) + " Delete</button>" : "";
    var isText = kindOf(f) === "text" || kindOf(f) === "csv";
    modalHost.innerHTML =
      '<div class="modal-bg" id="pv-bg"><div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(f.name) + '">' +
      '<div class="modal-head"><div class="grow"><div class="name">' + esc(f.name) + '</div><div class="meta">' + esc(f.contentType) + " · " + bytes(f.size) + " · " + esc(f.uploadedBy) + " · " + when(f.createdAt) + "</div></div>" +
      '<a class="btn small" href="/api/files/' + encodeURIComponent(f.id) + '">' + svg("download", 14) + " Download</a>" + del +
      '<button type="button" class="btn small" id="pv-close" aria-label="Close preview">' + svg("x", 14) + "</button></div>" +
      '<div class="modal-body' + (isText ? " is-text" : "") + '">' + previewBody(p, f) + "</div>" +
      '<div class="modal-foot"><button type="button" class="btn small" id="pv-prev"' + (idx === 0 ? " disabled" : "") + ">" + svg("chevL", 14) + " Previous</button>" +
      '<span class="meta">' + (idx + 1) + " of " + list.length + "</span>" +
      '<button type="button" class="btn small" id="pv-next"' + (idx >= list.length - 1 ? " disabled" : "") + '>Next ' + svg("chevR", 14) + "</button></div>" +
      "</div></div>";
    document.getElementById("pv-close").onclick = function () { closePreview(); };
    document.getElementById("pv-bg").onclick = function (e) { if (e.target.id === "pv-bg") closePreview(); };
    document.getElementById("pv-prev").onclick = function () { stepPreview(-1); };
    document.getElementById("pv-next").onclick = function () { stepPreview(1); };
    var d = document.getElementById("pv-delete");
    if (d) d.onclick = function () { removeFile(f.id); };
  }

  document.addEventListener("keydown", function (e) {
    if (!state.preview) return;
    if (e.key === "Escape") closePreview();
    else if (e.key === "ArrowLeft") stepPreview(-1);
    else if (e.key === "ArrowRight") stepPreview(1);
  });

  function loadFiles() {
    return api("/api/files").then(function (list) { state.files = list; render(); });
  }

  function loadSettings() {
    return Promise.all([
      can("admin") ? api("/api/drive").then(function (d) { state.drive = d; }) : null,
      api("/api/members").then(function (m) { state.members = m; })
    ]).then(function () { render(); }).catch(function (e) { notify(e.message, true); });
  }

  function start() {
    var params = new URLSearchParams(location.search);
    if (params.get("error")) state.error = ERRORS[params.get("error")] || "Something went wrong.";
    api("/api/me").then(function (me) {
      state.me = me;
      if (!can("admin") && state.tab === "settings") state.tab = "home";
      if (state.tab === "settings") return Promise.all([loadSettings(), loadFiles()]);
      return loadFiles();
    }).catch(function () {
      state.me = null;
      render();
    });
  }

  start();
})();
</script>
</body>
</html>`;
