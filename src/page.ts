/** The Lumbung page: sign in with Google, files, and settings (Google Drive and members). Plain HTML and script, no build. */
export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#f5f0e6" />
<title>Lumbung</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23d9480f'/%3E%3Cpath d='M9 8h4v12h8v4H9z' fill='%23fffdf8'/%3E%3C/svg%3E" />
<style>
  :root { --bg: #f5f0e6; --surface: #fffdf8; --text: #2a1a12; --muted: #7a6a5e; --line: #e4dccd; --fill: #efe8da; --accent: #d9480f; --accent-soft: #fbe3d6; --danger: #b42318; --radius: 12px; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme=light]) { --bg: #2a1a12; --surface: #35251c; --text: #f5f0e6; --muted: #b9a999; --line: #4a3628; --fill: #3f2d22; --accent-soft: #4d2e1f; } }
  :root[data-theme=dark] { --bg: #2a1a12; --surface: #35251c; --text: #f5f0e6; --muted: #b9a999; --line: #4a3628; --fill: #3f2d22; --accent-soft: #4d2e1f; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .muted { color: var(--muted); }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn.danger { color: var(--danger); }
  .btn.small { padding: 4px 10px; font-size: 13px; }
  .btn:disabled { opacity: 0.6; cursor: progress; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: var(--fill); color: var(--muted); font-size: 12px; font-weight: 600; }
  .badge.accent { background: var(--accent-soft); color: var(--accent); }
  .banner { margin: 0 0 16px; border-radius: var(--radius); padding: 12px 16px; background: color-mix(in srgb, var(--danger) 12%, var(--surface)); color: var(--danger); white-space: pre-line; }
  input, select { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
  input:focus, select:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

  /* Sign-in */
  .login { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
  .login-card { width: min(400px, 100%); background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 32px 28px; text-align: center; box-shadow: 0 12px 40px rgba(42, 26, 18, 0.08); }
  .login-logo { width: 48px; height: 48px; border-radius: 12px; background: var(--accent); display: grid; place-items: center; margin: 0 auto 16px; }
  .login-card h1 { margin: 0 0 6px; font-size: 22px; }
  .google { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; margin-top: 20px; padding: 11px 16px; border-radius: 10px; border: 1px solid var(--line); background: #fff; color: #1f1f1f; font: inherit; font-weight: 600; text-decoration: none; }
  .login-note { margin-top: 18px; font-size: 13px; color: var(--muted); }

  /* App */
  header.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 24px; border-bottom: 1px solid var(--line); background: var(--surface); position: sticky; top: 0; z-index: 2; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 17px; }
  .brand-mark { width: 28px; height: 28px; border-radius: 8px; background: var(--accent); }
  .tabs { display: flex; gap: 4px; padding: 4px; background: var(--fill); border-radius: 999px; }
  .tab { padding: 6px 14px; border: 0; border-radius: 999px; background: none; color: var(--muted); font: inherit; font-weight: 600; cursor: pointer; }
  .tab[aria-selected=true] { background: var(--surface); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
  .me { display: flex; align-items: center; gap: 10px; font-size: 14px; }
  main { max-width: 1040px; margin: 0 auto; padding: 24px 16px 64px; }
  h2 { margin: 0 0 4px; font-size: 18px; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; justify-content: space-between; }
  .drop { border: 2px dashed var(--line); border-radius: var(--radius); padding: 24px; text-align: center; color: var(--muted); cursor: pointer; display: block; }
  .drop.over { border-color: var(--accent); color: var(--text); }
  input[type=file] { display: none; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  th { color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  td.actions { text-align: right; white-space: nowrap; }
  td.actions .btn { margin-left: 6px; }
  .name { font-weight: 600; word-break: break-word; }
  .empty { padding: 36px 16px; text-align: center; color: var(--muted); }
  .form-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 16px; }
  .form-row input[type=email] { flex: 1 1 260px; }
  @media (max-width: 720px) { th.hide-sm, td.hide-sm { display: none; } header.top { padding: 12px 16px; } }
</style>
</head>
<body>
<div id="app"></div>
<script>
(function () {
  var app = document.getElementById("app");
  var state = { me: null, tab: "files", files: [], drive: null, members: [], error: "", notice: "" };
  var ERRORS = {
    not_invited: "This Google account is not invited to Lumbung. Ask the superadmin to add it.",
    disabled: "This account has been disabled. Ask the superadmin for access.",
    unverified: "Your Google email address is not verified.",
    state: "The sign-in expired. Please try again.",
    google: "Google sign-in failed. Please try again.",
    signin: "Sign in as the superadmin before connecting Google Drive.",
    drive: "Google Drive could not be connected. Please try again."
  };
  var RANK = { user: 1, admin: 2, superadmin: 3 };
  var ROLE_LABEL = { superadmin: "Superadmin", admin: "Admin", user: "User" };
  var GOOGLE_MARK = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function bytes(n) { if (n < 1024) return n + " B"; if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"; return (n / 1024 / 1024).toFixed(1) + " MB"; }
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

  function loginView() {
    var err = state.error ? '<div class="banner">' + esc(state.error) + "</div>" : "";
    app.innerHTML =
      '<div class="login"><div class="login-card">' +
      '<div class="login-logo"><svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true"><path d="M9 8h4v12h8v4H9z" fill="#fffdf8"/></svg></div>' +
      "<h1>Lumbung</h1><div class=\\"muted\\">Sign in with your Google account to continue.</div>" +
      '<div style="margin-top:18px;text-align:left;">' + err + "</div>" +
      '<a class="google" href="/auth/login">' + GOOGLE_MARK + "Continue with Google</a>" +
      '<div class="login-note">Only invited accounts can sign in.</div>' +
      "</div></div>";
  }

  function header() {
    var tabs = '<div class="tabs" role="tablist">' +
      '<button class="tab" role="tab" aria-selected="' + (state.tab === "files") + '" data-tab="files">Files</button>' +
      (can("admin") ? '<button class="tab" role="tab" aria-selected="' + (state.tab === "settings") + '" data-tab="settings">Settings</button>' : "") +
      "</div>";
    return '<header class="top"><div class="brand"><span class="brand-mark"></span>Lumbung</div>' + tabs +
      '<div class="me"><span>' + esc(state.me.email) + '</span><span class="badge ' + (state.me.role === "user" ? "" : "accent") + '">' + ROLE_LABEL[state.me.role] + '</span><button class="btn small" id="logout">Sign out</button></div></header>';
  }

  function notices() {
    return (state.error ? '<div class="banner">' + esc(state.error) + "</div>" : "") +
      (state.notice ? '<div class="card" style="padding:12px 16px;margin-bottom:16px;">' + esc(state.notice) + "</div>" : "");
  }

  function filesView() {
    var rows = state.files.map(function (f) {
      var del = can("admin") ? '<button class="btn small danger" data-delete="' + esc(f.id) + '">Delete</button>' : "";
      var scope = esc(f.app) + (f.project ? " · " + esc(f.project) : "") + (f.ref ? '<div class="muted" style="font-size:12px;">' + esc(f.ref) + "</div>" : "");
      return "<tr><td class=\\"name\\">" + esc(f.name) + "</td><td class=\\"hide-sm\\">" + scope + '</td><td class="hide-sm muted">' + esc(f.contentType) + '</td><td class="num">' + bytes(f.size) + '</td><td class="hide-sm muted">' + esc(f.uploadedBy) + "<div style=\\"font-size:12px;\\">" + when(f.createdAt) + "</div></td>" +
        '<td class="actions"><a class="btn small" href="/api/files/' + encodeURIComponent(f.id) + '">Download</a>' + del + "</td></tr>";
    }).join("");
    return '<div class="card"><label class="drop" id="drop"><strong>Drop files here</strong> or click to choose. Up to 100 MB each.<input id="file-input" type="file" multiple /></label>' +
      '<div class="muted" id="upload-state" style="margin-top:10px;"></div></div>' +
      '<div class="card" style="padding:0;overflow:hidden;"><table><thead><tr><th>Name</th><th class="hide-sm">App / project</th><th class="hide-sm">Type</th><th class="num">Size</th><th class="hide-sm">Uploaded by</th><th></th></tr></thead><tbody>' +
      rows + "</tbody></table>" + (state.files.length ? "" : '<div class="empty">No files yet.</div>') + "</div>";
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
    var superRow = true;
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
      return "<tr><td class=\\"name\\">" + esc(m.email) + '</td><td>' + roleCell + '</td><td class="hide-sm">' + statusCell + '</td><td class="hide-sm muted">' + (m.fixed ? "" : esc(m.invitedBy || "")) + '</td><td class="actions">' + actions + "</td></tr>";
    }).join("");
    var add = can("superadmin")
      ? '<form class="form-row" id="add-member"><input type="email" id="new-email" placeholder="name@example.com" required /><select id="new-role"><option value="user">User</option><option value="admin">Admin</option></select><button class="btn primary" type="submit">Add member</button></form>'
      : "";
    return '<div class="card"><h2>Members</h2><div class="muted" style="margin-bottom:12px;">Admins can delete files. Users can upload and download. Only the superadmin changes members and Drive.</div>' +
      '<div style="overflow-x:auto;"><table><thead><tr><th>Email</th><th>Role</th><th class="hide-sm">Status</th><th class="hide-sm">Invited by</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>" + add + "</div>";
  }

  function settingsView() {
    return driveCard() + membersCard();
  }

  function appView() {
    app.innerHTML = header() + "<main>" + notices() + (state.tab === "settings" && can("admin") ? settingsView() : filesView()) + "</main>";
    wireApp();
  }

  function render() {
    if (!state.me) return loginView();
    appView();
  }

  function wireApp() {
    document.getElementById("logout").onclick = function () {
      fetch("/auth/logout", { method: "POST" }).then(function () { location.href = "/"; });
    };
    document.querySelectorAll("[data-tab]").forEach(function (b) {
      b.onclick = function () { state.tab = b.getAttribute("data-tab"); state.error = ""; state.notice = ""; render(); if (state.tab === "settings") loadSettings(); };
    });
    if (state.tab === "files") wireFiles();
    else wireSettings();
  }

  function wireFiles() {
    var input = document.getElementById("file-input");
    var drop = document.getElementById("drop");
    input.onchange = function (e) { upload(e.target.files); e.target.value = ""; };
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { upload(e.dataTransfer.files); });
    document.querySelectorAll("[data-delete]").forEach(function (b) {
      b.onclick = function () {
        var f = state.files.filter(function (x) { return x.id === b.getAttribute("data-delete"); })[0];
        if (!f || !confirm("Delete " + f.name + "? Its file is removed from Google Drive too.")) return;
        api("/api/files/" + encodeURIComponent(f.id), { method: "DELETE" }).then(loadFiles).catch(function (e) { notify(e.message, true); });
      };
    });
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

  function upload(list) {
    var files = Array.prototype.slice.call(list);
    if (!files.length) return;
    var done = 0, failed = [];
    var label = document.getElementById("upload-state");
    if (label) label.textContent = "Uploading…";
    files.reduce(function (chain, file) {
      return chain.then(function () {
        return fetch("/api/files", {
          method: "POST",
          headers: { "content-type": file.type || "application/octet-stream", "x-file-name": encodeURIComponent(file.name) },
          body: file
        }).then(function (res) {
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
      if (state.tab === "settings") return loadSettings();
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
