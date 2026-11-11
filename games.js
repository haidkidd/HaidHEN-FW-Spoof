/* HaidHEN Games TEST -- loja estática com integração experimental de Remote PKG.
 * Não há payload nativo neste pacote, e nenhum resultado é tratado como instalação concluída.
 * Compatível com navegadores que implementam fetch e Promises (ainda não validado no PS4).
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var setup = $("setup"), store = $("store"), grid = $("games"), empty = $("empty");
  var status = $("status"), search = $("search"), serverLabel = $("serverLabel");
  var list = [], sending = false;
  var API = "http://127.0.0.1:12800/api/";
  var REPO_API = "https://api.github.com/repos/haidkidd2k14/HaidHEN-FW-Spoof/contents/pkgs?ref=main";

  function setStatus(message, type) {
    status.textContent = message;
    status.setAttribute("data-type", type || "info");
  }
  function nameOf(file) {
    var text = file.split("/").pop().replace(/\.pkg$/i, "");
    try { text = decodeURIComponent(text); } catch (e) {}
    return text.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function safeUrl(value) {
    if (!value || typeof value !== "string") return "";
    try {
      var u = new URL(value, document.baseURI || location.href);
      return (u.protocol === "http:" || u.protocol === "https:") ? u.href : "";
    } catch (err) { return ""; }
  }
  function fileKey(value) { return String(value || "").replace(/^\.\//, ""); }
  function gameFrom(value) {
    if (!value || typeof value !== "object") return null;
    var file = fileKey(value.file || value.pkg || value.url || "");
    var url = safeUrl(file);
    if (!file || !url || !/\.pkg(?:[?#]|$)/i.test(url)) return null;
    var title = String(value.title || nameOf(file) || "PKG sem nome");
    var bytes = Number(value.bytes || value.size_bytes || 0);
    return { file:file, url:url, title:title,
      description:String(value.description || ""), version:String(value.version || ""),
      bytes:isFinite(bytes) && bytes > 0 ? bytes : 0,
      cover:safeUrl(value.cover || ""), author:String(value.author || "") };
  }
  function bytesLabel(value) {
    if (!value) return "Tamanho não informado";
    var unit = value >= 1073741824 ? "GB" : "MB";
    var num = value / (unit === "GB" ? 1073741824 : 1048576);
    return num.toFixed(num < 10 ? 1 : 0) + " " + unit;
  }
  function fetchJson(url) {
    return fetch(url).then(function (resp) {
      if (!resp.ok) throw Error("HTTP " + resp.status);
      return resp.json();
    });
  }
  function loadCatalog() {
    setStatus("Carregando catálogo de pkgs/...");
    Promise.all([
      fetchJson("pkgs/catalog.json").catch(function () { return {games: []}; }),
      fetchJson(REPO_API).catch(function () { return []; })
    ]).then(function (results) {
      var declared = Array.isArray(results[0]) ? results[0] : results[0].games;
      if (!Array.isArray(declared)) declared = [];
      var github = Array.isArray(results[1]) ? results[1] : [];
      var seen = {};
      var items = [];
      function pushGame(item) {
        var g = gameFrom(item);
        if (!g || seen[g.url]) return;
        seen[g.url] = true; items.push(g);
      }
      declared.forEach(pushGame);
      github.forEach(function (file) {
        if (file && file.type === "file" && /\.pkg$/i.test(file.name || "")) {
          pushGame({file:"pkgs/" + encodeURIComponent(file.name), title:nameOf(file.name), bytes:file.size});
        }
      });
      list = items;
      render();
      setStatus(items.length ? items.length + " PKG(s) carregado(s). O catálogo não garante compatibilidade nem segurança dos arquivos." :
        "Nenhum arquivo .pkg encontrado. Consulte pkgs/README.md para adicionar um.", items.length ? "info" : "warn");
    }).catch(function (err) {
      list = []; render(); setStatus("Falha ao carregar a lista: " + String(err.message || err), "error");
    });
  }
  function make(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function render() {
    grid.textContent = "";
    var q = search.value.toLowerCase().trim();
    var games = list.filter(function (g) {
      return (g.title + " " + g.file + " " + g.description).toLowerCase().indexOf(q) >= 0;
    });
    empty.style.display = games.length ? "none" : "block";
    games.forEach(function (g) {
      var card = make("article", "game");
      if (g.cover) {
        var img = make("img", "cover"); img.src = g.cover; img.alt = "Capa de " + g.title;
        img.onerror = function () { img.style.display = "none"; }; card.appendChild(img);
      }
      card.appendChild(make("h3", "", g.title));
      card.appendChild(make("div", "detail", [g.version ? "Versão " + g.version : "", bytesLabel(g.bytes), g.author].filter(Boolean).join(" · ")));
      if (g.description) card.appendChild(make("p", "", g.description));
      var buttons = make("div", "gameactions");
      var download = make("a", "", "Baixar PKG");
      download.href = g.url; download.target = "_blank"; download.rel = "noopener";
      buttons.appendChild(download);
      var install = make("button", "", "Instalar no PS4");
      install.type = "button";
      install.onclick = function () { installGame(g); };
      buttons.appendChild(install);
      card.appendChild(buttons); grid.appendChild(card);
    });
  }
  function sendRequest(route, data) {
    if (typeof fetch !== "function") return Promise.reject(Error("fetch indisponível neste navegador"));
    // text/plain evita um preflight CORS; resposta 'opaque' NUNCA confirma que o PS4 processou o comando.
    // Alguns navegadores impedem HTTPS -> HTTP loopback (mixed content) mesmo em modo no-cors.
    return fetch(API + route, {
      method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain"},
      body:JSON.stringify(data)
    });
  }
  function testServer() {
    serverLabel.textContent = "Testando...";
    setStatus("Tentando a API local. Respostas podem ser ocultadas pelo navegador.");
    sendRequest("is_exists", {title_id:"CUSA00000"}).then(function () {
      serverLabel.textContent = "Requisição enviada (sem confirmação)";
      setStatus("O navegador realizou uma tentativa de requisição. Sem acesso à resposta por CORS, isso NÃO comprova que o servidor ou instalador esteja funcionando.", "warn");
    }).catch(function (err) {
      serverLabel.textContent = "Não foi possível verificar";
      setStatus("Falha na comunicação local. Verifique se há instalador HTTP ativo na porta 12800; o browser pode bloquear HTTP/CORS. Detalhe: " + String(err.message || err), "error");
    });
  }
  function installGame(g) {
    if (sending) return;
    if (!window.confirm("Solicitar ao instalador local a instalação de:\n" + g.title + "?\n\nUse somente arquivos que você tem autorização para instalar.")) return;
    sending = true;
    setStatus("Tentando enviar comando para o instalador local. Verifique o PS4 antes de repetir.", "warn");
    sendRequest("install", {type:"direct", packages:[g.url]}).then(function () {
      setStatus("Requisição enviada pelo navegador, mas a resposta é inacessível. NÃO é possível confirmar que a instalação foi iniciada. Confira a fila/notificações do PS4 antes de tentar novamente.", "warn");
    }).catch(function (err) {
      setStatus("Não foi possível enviar/verificar o comando. Serviço HTTP pode não estar disponível ou o PS4 pode bloquear a requisição: " + String(err.message || err), "error");
    }).then(function () { sending = false; }, function () { sending = false; });
  }
  $("ready").onclick = function () {
    setup.style.display = "none"; store.style.display = "block";
    setStatus("Escolha um PKG no catálogo. Instalação direta depende de um serviço HTTP compatível já ativo.", "warn");
    loadCatalog();
  };
  $("backSetup").onclick = function () { store.style.display = "none"; setup.style.display = "block"; };
  $("testServer").onclick = testServer;
  $("reload").onclick = loadCatalog;
  search.oninput = render;
})();
