/* Blockchain Brief: language toggle + read-aloud (Web Speech API). No dependencies. */
(function () {
  "use strict";
  var LANGS = ["en", "ja"];
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var UI = {
    en: { play: "▶ Listen", pause: "❚❚ Pause", resume: "▶ Resume", stop: "■ Stop",
          all: "Whole brief", dev: "Dev only", nondev: "Non-dev only", speed: "Speed", voice: "Voice",
          idle: "Reads this brief aloud with your device's built-in voice.",
          reading: "Reading…", paused: "Paused.", done: "Finished.",
          novoice: "No English voice found on this device.",
          nosupport: "This browser can't read pages aloud. Try Chrome, Edge or Safari." },
    ja: { play: "▶ 読み上げ", pause: "❚❚ 一時停止", resume: "▶ 再開", stop: "■ 停止",
          all: "全文", dev: "Dev のみ", nondev: "Non-dev のみ", speed: "速度", voice: "音声",
          idle: "端末に内蔵された音声でこのブリーフを読み上げます。",
          reading: "読み上げ中…", paused: "一時停止中", done: "読み上げが終わりました。",
          novoice: "この端末に日本語の音声が見つかりません。iPhone は「設定 › アクセシビリティ › 読み上げコンテンツ › 声」、Android は「設定 › テキスト読み上げ」で日本語音声を追加してください。",
          nosupport: "このブラウザは読み上げに対応していません。Chrome、Edge、Safari をお試しください。" }
  };

  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // ---------- Language ----------
  var param = new URLSearchParams(location.search).get("lang");
  var lang = LANGS.indexOf(param) >= 0 ? param : (store.get("bb-lang") || ((navigator.language || "").slice(0, 2) === "ja" ? "ja" : "en"));
  if (LANGS.indexOf(lang) < 0) lang = "en";

  function applyLang(l) {
    lang = l;
    document.documentElement.lang = l;
    qsa("[data-lang]").forEach(function (el) { el.hidden = el.getAttribute("data-lang") !== l; });
    qsa("[data-set-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === l)); });
    var t = document.body.getAttribute("data-title-" + l);
    if (t) document.title = t;
    store.set("bb-lang", l);
    if (window.__bbAudio) window.__bbAudio.onLang();
  }
  qsa("[data-set-lang]").forEach(function (b) {
    b.addEventListener("click", function () { applyLang(b.getAttribute("data-set-lang")); });
  });

  // ---------- Read aloud ----------
  var panel = qs("#audio");
  if (panel) setupAudio(panel);
  applyLang(lang);

  function setupAudio(panel) {
    var synth = window.speechSynthesis;
    var playBtn = qs("[data-a=play]", panel), stopBtn = qs("[data-a=stop]", panel);
    var scopeSel = qs("[data-a=scope]", panel), rateSel = qs("[data-a=rate]", panel), voiceSel = qs("[data-a=voice]", panel);
    var status = qs("[data-a=status]", panel);
    var queue = [], pos = 0, state = "idle", current = null, token = 0;

    function t(k) { return UI[lang][k]; }
    function label() {
      playBtn.textContent = state === "playing" ? t("pause") : state === "paused" ? t("resume") : t("play");
      stopBtn.textContent = t("stop");
      stopBtn.disabled = state === "idle";
      qsa("option", scopeSel).forEach(function (o) { o.textContent = t(o.value); });
      qs("[data-a=speedlbl]", panel).textContent = t("speed");
      qs("[data-a=voicelbl]", panel).textContent = t("voice");
    }
    function say(msg) { status.textContent = msg; }

    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      playBtn.disabled = true; label(); say(t("nosupport"));
      window.__bbAudio = { onLang: function () { label(); say(t("nosupport")); } };
      return;
    }

    var PREFERRED = /natural|neural|premium|enhanced|google|siri|kyoko|otoya|o-ren|nanami|keita|samantha|ava|daniel/i;
    function voicesFor(l) {
      return synth.getVoices().filter(function (v) { return (v.lang || "").toLowerCase().replace("_", "-").indexOf(l) === 0; });
    }
    function fillVoices() {
      var list = voicesFor(lang);
      var saved = store.get("bb-voice-" + lang);
      voiceSel.innerHTML = "";
      list.sort(function (a, b) { return (PREFERRED.test(b.name) ? 1 : 0) - (PREFERRED.test(a.name) ? 1 : 0); });
      list.forEach(function (v) {
        var o = document.createElement("option");
        o.value = v.name; o.textContent = v.name.replace(/\s*\(.*\)$/, "") + " · " + v.lang;
        if (v.name === saved) o.selected = true;
        voiceSel.appendChild(o);
      });
      voiceSel.disabled = !list.length;
      playBtn.disabled = !list.length;
      if (state === "idle") say(list.length ? t("idle") : t("novoice"));
    }
    function chosenVoice() {
      var name = voiceSel.value;
      return voicesFor(lang).filter(function (v) { return v.name === name; })[0] || voicesFor(lang)[0] || null;
    }

    // Split text into chunks short enough for every engine (Chrome stops long utterances).
    function chunk(text, l) {
      var parts = l === "ja" ? text.split(/(?<=[。！？!?])/) : text.split(/(?<=[.!?;:])\s+/);
      var out = [], buf = "";
      parts.forEach(function (p) {
        if ((buf + p).length > 180 && buf) { out.push(buf); buf = p; } else { buf += (buf && l !== "ja" ? " " : "") + p; }
      });
      if (buf.trim()) out.push(buf);
      return out;
    }
    function build() {
      var art = qs('article[data-lang="' + lang + '"]');
      if (!art) return [];
      var scope = scopeSel.value, roots = [];
      if (scope === "all") roots = [qs("header.brief", art), qs(".track.dev", art), qs(".track.nondev", art)];
      else roots = [qs(".track." + scope, art)];
      var items = [];
      roots.forEach(function (r) {
        if (!r) return;
        qsa("h1, h2, h3, p, li", r).forEach(function (el) {
          if (el.closest("[data-noread]") || el.closest(".sources")) return;
          if (el.tagName === "P" && el.closest("li")) return;
          var txt = (el.getAttribute("data-say") || el.textContent).replace(/\s+/g, " ").trim();
          if (!txt) return;
          chunk(txt, lang).forEach(function (c) { items.push({ el: el, text: c }); });
        });
      });
      return items;
    }
    function mark(el) {
      qsa(".reading").forEach(function (e) { e.classList.remove("reading"); });
      if (el) {
        el.classList.add("reading");
        var r = el.getBoundingClientRect();
        if (r.top < 70 || r.bottom > innerHeight - 20) el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    function speakNext() {
      if (state !== "playing") return;
      if (pos >= queue.length) { finish(t("done")); return; }
      var item = queue[pos], my = ++token;
      var u = new SpeechSynthesisUtterance(item.text);
      var v = chosenVoice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : (lang === "ja" ? "ja-JP" : "en-US");
      u.rate = parseFloat(rateSel.value) || 1;
      u.onend = function () { if (my !== token) return; pos++; speakNext(); };
      u.onerror = function (e) { if (my !== token) return; if (e.error === "interrupted" || e.error === "canceled") return; pos++; speakNext(); };
      current = u;
      mark(item.el);
      synth.speak(u);
    }
    function play() {
      if (state === "idle") { queue = build(); pos = 0; }
      if (!queue.length) return;
      state = "playing"; label(); say(t("reading"));
      synth.cancel();
      setTimeout(speakNext, 60);
    }
    // Pause = cancel and remember position; works on every engine (native pause is unreliable on Android).
    function pause() { state = "paused"; token++; synth.cancel(); label(); say(t("paused")); }
    function finish(msg) { state = "idle"; token++; synth.cancel(); mark(null); queue = []; pos = 0; label(); say(msg || t("idle")); }

    playBtn.addEventListener("click", function () { state === "playing" ? pause() : play(); });
    stopBtn.addEventListener("click", function () { finish(); });
    scopeSel.addEventListener("change", function () { if (state !== "idle") finish(); store.set("bb-scope", scopeSel.value); });
    rateSel.addEventListener("change", function () { store.set("bb-rate", rateSel.value); if (state === "playing") { token++; synth.cancel(); setTimeout(speakNext, 60); } });
    voiceSel.addEventListener("change", function () { store.set("bb-voice-" + lang, voiceSel.value); if (state === "playing") { token++; synth.cancel(); setTimeout(speakNext, 60); } });
    window.addEventListener("pagehide", function () { synth.cancel(); });

    var sc = store.get("bb-scope"); if (sc && qs('option[value="' + sc + '"]', scopeSel)) scopeSel.value = sc;
    var rt = store.get("bb-rate"); if (rt && qs('option[value="' + rt + '"]', rateSel)) rateSel.value = rt;
    if (synth.addEventListener) synth.addEventListener("voiceschanged", fillVoices); else synth.onvoiceschanged = fillVoices;

    window.__bbAudio = { onLang: function () { if (state !== "idle") finish(); fillVoices(); label(); } };
    fillVoices(); label();
  }
})();

/* Reader comments via giscus (GitHub Discussions). One discussion per brief, matched by page path. */
(function () {
  "use strict";
  var GISCUS = {
    repo: "yukioshirowork/blockchain-brief",
    repoId: "",        // filled in once Discussions is on
    category: "Brief comments",
    categoryId: ""
  };
  var box = document.querySelector(".giscus");
  if (!box) return;
  function giscusLang() { return document.documentElement.lang === "ja" ? "ja" : "en"; }
  if (!GISCUS.repoId || !GISCUS.categoryId) {
    box.textContent = giscusLang() === "ja" ? "コメント欄は準備中です。" : "Comments are coming soon.";
    return;
  }
  var s = document.createElement("script");
  s.src = "https://giscus.app/client.js";
  var attrs = {
    "data-repo": GISCUS.repo, "data-repo-id": GISCUS.repoId,
    "data-category": GISCUS.category, "data-category-id": GISCUS.categoryId,
    "data-mapping": "pathname", "data-strict": "1", "data-reactions-enabled": "1",
    "data-emit-metadata": "0", "data-input-position": "top",
    "data-theme": "preferred_color_scheme", "data-lang": giscusLang(), "data-loading": "lazy"
  };
  Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
  s.crossOrigin = "anonymous"; s.async = true;
  box.appendChild(s);
  // Keep the comment widget's language in step with the EN / 日本語 toggle.
  document.querySelectorAll("[data-set-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = document.querySelector("iframe.giscus-frame");
      if (f) f.contentWindow.postMessage({ giscus: { setConfig: { lang: giscusLang() } } }, "https://giscus.app");
    });
  });
})();
