/** The admin page: sign in, Google Drive status, upload, and the list of files. Plain HTML and script, no build. */
export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Silpasala storage</title>
<style>
  :root { --bg: #f5f0e6; --surface: #fffdf8; --text: #2a1a12; --muted: #7a6a5e; --line: #e4dccd; --accent: #d9480f; --danger: #b42318; --radius: 12px; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme=light]) { --bg: #2a1a12; --surface: #35251c; --text: #f5f0e6; --muted: #b9a999; --line: #4a3628; } }
  :root[data-theme=dark] { --bg: #2a1a12; --surface: #35251c; --text: #f5f0e6; --muted: #b9a999; --line: #4a3628; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 980px; margin: 0 auto; padding: 32px 16px 64px; }
  header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 24px; }
  h1 { margin: 0; font-size: 22px; }
  .muted { color: var(--muted); }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; justify-content: space-between; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn.danger { color: var(--danger); }
  .btn:disabled { opacity: 0.6; cursor: progress; }
  .banner { border-radius: var(--radius); padding: 12px 16px; margin-bottom: 16px; background: color-mix(in srgb, var(--danger) 12%, var(--surface)); color: var(--danger); }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  th { color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .name { font-weight: 600; word-break: break-word; }
  .actions { white-space: nowrap; text-align: right; }
  .actions a, .actions button { margin-left: 6px; }
  .empty { padding: 40px 16px; text-align: center; color: var(--muted); }
  .drop { border: 2px dashed var(--line); border-radius: var(--radius); padding: 24px; text-align: center; color: var(--muted); }
  .drop.over { border-color: var(--accent); color: var(--text); }
  input[type=file] { display: none; }
  @media (max-width: 640px) { th.hide-sm, td.hide-sm { display: none; } }
</style>
</head>
<body>
<main>
  <header>
    <div>
      <h1>Silpasala storage</h1>
      <div class="muted" id="who">&nbsp;</div>
    </div>
    <div id="account"></div>
  </header>
  <div id="banner"></div>
  <section id="signed-out" hidden class="card">
    <div class="row">
      <div>
        <strong>Sign in to manage files</strong>
        <div class="muted">Only the storage admin can sign in.</div>
      </div>
      <a class="btn primary" href="/auth/login">Sign in with Google</a>
    </div>
  </section>
  <section id="signed-in" hidden>
    <div class="card">
      <div class="row">
        <div>
          <strong>Google Drive</strong>
          <div class="muted" id="drive-state">Checking…</div>
        </div>
        <div id="drive-actions"></div>
      </div>
    </div>
    <div class="card">
      <label id="drop" class="drop" for="file-input" style="display:block;cursor:pointer;">
        <strong>Drop files here</strong> or click to choose. Up to 100 MB each.
        <input id="file-input" type="file" multiple />
      </label>
      <div class="row" style="margin-top:12px;">
        <span class="muted" id="upload-state"></span>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <table>
        <thead>
          <tr><th>Name</th><th class="hide-sm">App / project</th><th class="hide-sm">Type</th><th class="num">Size</th><th class="hide-sm">Uploaded</th><th></th></tr>
        </thead>
        <tbody id="files"></tbody>
      </table>
      <div class="empty" id="empty" hidden>No files yet.</div>
    </div>
  </section>
</main>
<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var ERRORS = {
    not_admin: "This Google account is not the storage admin.",
    state: "The sign-in expired. Please try again.",
    signin: "Sign in before connecting Google Drive.",
    drive: "Google Drive could not be connected. Please try again.",
    google: "Google sign-in failed. Please try again."
  };

  function banner(text) {
    $("banner").innerHTML = "";
    if (!text) return;
    var div = document.createElement("div");
    div.className = "banner";
    div.textContent = text;
    $("banner").appendChild(div);
  }

  function api(path, opts) {
    opts = opts || {};
    return fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || ("Request failed (" + res.status + ")"));
        return body;
      });
    });
  }

  function bytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(1) + " MB";
  }

  function button(label, cls, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn " + (cls || "");
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function renderDrive(status) {
    var state = $("drive-state");
    var actions = $("drive-actions");
    actions.innerHTML = "";
    if (status.connected) {
      state.textContent = "Connected as " + (status.email || "a Google account") + (status.connectedAt ? " since " + new Date(status.connectedAt).toLocaleDateString() : "");
      actions.appendChild(button("Disconnect", "danger", disconnect));
    } else {
      state.textContent = "Not connected. Uploads need Google Drive.";
      var link = document.createElement("a");
      link.className = "btn primary";
      link.href = "/auth/drive";
      link.textContent = "Connect Google Drive";
      actions.appendChild(link);
    }
  }

  function disconnect() {
    if (!confirm("Disconnect Google Drive? Files already stored stay in Drive, but uploads stop until you connect again.")) return;
    api("/api/drive/disconnect", { method: "POST" }).then(load).catch(function (e) { banner(e.message); });
  }

  function renderFiles(files) {
    var body = $("files");
    body.innerHTML = "";
    $("empty").hidden = files.length > 0;
    files.forEach(function (f) {
      var tr = document.createElement("tr");
      var name = document.createElement("td");
      name.className = "name";
      name.textContent = f.name;
      var scope = document.createElement("td");
      scope.className = "hide-sm";
      scope.textContent = f.app + (f.project ? " · " + f.project : "");
      var type = document.createElement("td");
      type.className = "hide-sm muted";
      type.textContent = f.contentType;
      var size = document.createElement("td");
      size.className = "num";
      size.textContent = bytes(f.size);
      var when = document.createElement("td");
      when.className = "hide-sm muted";
      when.textContent = new Date(f.createdAt).toLocaleString();
      var actions = document.createElement("td");
      actions.className = "actions";
      var download = document.createElement("a");
      download.className = "btn";
      download.href = "/api/files/" + encodeURIComponent(f.id);
      download.textContent = "Download";
      actions.appendChild(download);
      actions.appendChild(button("Delete", "danger", function () { remove(f); }));
      tr.appendChild(name);
      tr.appendChild(scope);
      tr.appendChild(type);
      tr.appendChild(size);
      tr.appendChild(when);
      tr.appendChild(actions);
      body.appendChild(tr);
    });
  }

  function remove(f) {
    if (!confirm("Delete " + f.name + "? Its file is removed from Google Drive too.")) return;
    api("/api/files/" + encodeURIComponent(f.id), { method: "DELETE" }).then(load).catch(function (e) { banner(e.message); });
  }

  function upload(list) {
    var files = Array.prototype.slice.call(list);
    if (!files.length) return;
    var done = 0;
    var failed = [];
    $("upload-state").textContent = "Uploading…";
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
      $("upload-state").textContent = done + " of " + files.length + " uploaded";
      if (failed.length) banner(failed.join("\\n"));
      load();
    });
  }

  function load() {
    api("/api/me").then(function (me) {
      $("signed-out").hidden = true;
      $("signed-in").hidden = false;
      $("who").textContent = me.email;
      $("account").innerHTML = "";
      var out = document.createElement("button");
      out.type = "button";
      out.className = "btn";
      out.textContent = "Sign out";
      out.addEventListener("click", function () {
        fetch("/auth/logout", { method: "POST" }).then(function () { location.href = "/"; });
      });
      $("account").appendChild(out);
      return Promise.all([api("/api/drive"), api("/api/files")]);
    }).then(function (parts) {
      renderDrive(parts[0]);
      renderFiles(parts[1]);
    }).catch(function () {
      $("signed-in").hidden = true;
      $("signed-out").hidden = false;
      $("who").innerHTML = "&nbsp;";
    });
  }

  $("file-input").addEventListener("change", function (e) { upload(e.target.files); e.target.value = ""; });
  var drop = $("drop");
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { upload(e.dataTransfer.files); });

  var params = new URLSearchParams(location.search);
  if (params.get("error")) banner(ERRORS[params.get("error")] || "Something went wrong.");
  load();
})();
</script>
</body>
</html>`;
