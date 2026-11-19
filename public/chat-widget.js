/*
 * Widget de chat — Asistente M.A.No
 * Uso: <script src="https://TU-SITIO.netlify.app/chat-widget.js" defer></script>
 * Opcional: data-endpoint="https://TU-SITIO.netlify.app/api/chat"  data-position="left|right"
 */
(function () {
  if (window.__manoChat) return;
  window.__manoChat = true;

  var script = document.currentScript;
  var base = script && script.src ? new URL(script.src).origin : location.origin;
  var ENDPOINT = (script && script.dataset.endpoint) || base + "/api/chat";
  var SIDE = (script && script.dataset.position) === "right" ? "right" : "left";
  var STORE_KEY = "manoChatHistory";
  var GRAD = "linear-gradient(135deg,#6A4996,#DA5E2E)";
  var WELCOME =
    "¡Hola! Soy el asistente virtual del consultorio del Dr. Fernando Juarez Cesca. ¿En qué te puedo ayudar?";

  var history = [];
  try {
    history = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]");
    if (!Array.isArray(history)) history = [];
  } catch (e) {
    history = [];
  }
  function save() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-30)));
    } catch (e) {}
  }

  var css =
    ".mc-btn{position:fixed;" + SIDE + ":18px;bottom:18px;z-index:10000;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;background:" + GRAD + ";color:#fff;font-size:28px;box-shadow:0 8px 24px rgba(106,73,150,.4);display:grid;place-items:center}" +
    ".mc-panel{position:fixed;" + SIDE + ":18px;bottom:90px;z-index:10000;width:min(370px,calc(100vw - 32px));height:min(560px,calc(100vh - 120px));background:#fff;border-radius:18px;box-shadow:0 16px 48px rgba(43,29,69,.3);display:none;flex-direction:column;overflow:hidden;font:15px/1.45 system-ui,-apple-system,sans-serif;color:#2b1d45}" +
    ".mc-panel.open{display:flex}" +
    ".mc-head{background:" + GRAD + ";color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}" +
    ".mc-head b{font-size:16px}.mc-head small{display:block;opacity:.85;font-size:12px}" +
    ".mc-x{background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}" +
    ".mc-note{font-size:11.5px;color:#5c5470;background:#f6f1fc;padding:7px 14px;border-bottom:1px solid #e6dcf5}" +
    ".mc-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#fbf9fe}" +
    ".mc-msg{max-width:85%;padding:9px 13px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}" +
    ".mc-bot{align-self:flex-start;background:#fff;border:1px solid #e6dcf5;border-bottom-left-radius:4px}" +
    ".mc-user{align-self:flex-end;background:#6A4996;color:#fff;border-bottom-right-radius:4px}" +
    ".mc-msg a{color:#6A4996;font-weight:600}.mc-user a{color:#fff}" +
    ".mc-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e6dcf5;background:#fff}" +
    ".mc-in{flex:1;resize:none;border:1px solid #d9cdee;border-radius:12px;padding:9px 11px;font:inherit;max-height:96px;outline-color:#6A4996}" +
    ".mc-send{border:0;border-radius:12px;padding:0 16px;background:" + GRAD + ";color:#fff;font-weight:700;cursor:pointer}" +
    ".mc-send:disabled{opacity:.5;cursor:default}" +
    ".mc-wa{display:block;text-align:center;font-size:12.5px;padding:6px;color:#6A4996;text-decoration:none;font-weight:600}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var btn = el("button", "mc-btn");
  btn.setAttribute("aria-label", "Abrir chat de consultas");
  btn.textContent = "💬";

  var panel = el("div", "mc-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Asistente virtual");
  panel.innerHTML =
    '<div class="mc-head"><div><b>Asistente M.A.No</b><small>Cirugía de mano · Salta</small></div><button class="mc-x" aria-label="Cerrar">×</button></div>' +
    '<div class="mc-note">Asistente virtual con IA: brinda información general y no reemplaza la consulta médica. Ante una urgencia, acudí a la guardia o llamá al 107.</div>' +
    '<div class="mc-log" aria-live="polite"></div>' +
    '<a class="mc-wa" href="https://wa.me/5493875515111" target="_blank" rel="noopener">Pedir turno por WhatsApp</a>' +
    '<form class="mc-form"><textarea class="mc-in" rows="1" placeholder="Escribí tu consulta…" maxlength="2000"></textarea><button class="mc-send" type="submit">Enviar</button></form>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var log = panel.querySelector(".mc-log");
  var form = panel.querySelector(".mc-form");
  var input = panel.querySelector(".mc-in");
  var send = panel.querySelector(".mc-send");
  var busy = false;

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  // Muestra texto como nodos seguros (sin innerHTML), convirtiendo URLs en enlaces.
  function render(node, text) {
    node.textContent = "";
    var re = /(https?:\/\/[^\s)]+)/g, last = 0, m;
    while ((m = re.exec(text))) {
      node.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement("a");
      a.href = m[1];
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = m[1];
      node.appendChild(a);
      last = m.index + m[1].length;
    }
    node.appendChild(document.createTextNode(text.slice(last)));
  }

  function bubble(role, text) {
    var n = el("div", "mc-msg " + (role === "user" ? "mc-user" : "mc-bot"));
    render(n, text);
    log.appendChild(n);
    log.scrollTop = log.scrollHeight;
    return n;
  }

  function redraw() {
    log.textContent = "";
    bubble("assistant", WELCOME);
    history.forEach(function (m) { bubble(m.role, m.content); });
  }

  function toggle(open) {
    panel.classList.toggle("open", open);
    if (open) {
      if (!log.childNodes.length) redraw();
      setTimeout(function () { input.focus(); }, 50);
    }
  }

  btn.addEventListener("click", function () { toggle(!panel.classList.contains("open")); });
  panel.querySelector(".mc-x").addEventListener("click", function () { toggle(false); });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit"));
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    history.push({ role: "user", content: text });
    save();
    bubble("user", text);
    ask();
  });

  function ask() {
    busy = true;
    send.disabled = true;
    var node = bubble("assistant", "Escribiendo…");
    var answer = "";

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    })
      .then(function (res) {
        if (!res.ok || !res.body) throw new Error("HTTP " + res.status);
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            answer += decoder.decode(r.value, { stream: true });
            render(node, answer);
            log.scrollTop = log.scrollHeight;
            return pump();
          });
        }
        return pump();
      })
      .catch(function () {
        if (!answer)
          answer = "No pude conectarme. Probá de nuevo o escribinos por WhatsApp al +54 387 5515111.";
        render(node, answer);
      })
      .then(function () {
        if (answer) {
          history.push({ role: "assistant", content: answer });
          save();
        }
        busy = false;
        send.disabled = false;
      });
  }
})();
