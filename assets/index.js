/* Renders the latest brief and the archive from briefs.json, in both languages. */
(function () {
  "use strict";
  var MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function both(fn) { var f = document.createDocumentFragment(); ["en", "ja"].forEach(function (l) { var n = fn(l); n.setAttribute("data-lang", l); n.hidden = document.documentElement.lang !== l; f.appendChild(n); }); return f; }
  function fmt(d, l) { var p = d.split("-"); return l === "ja" ? p[0] + "年" + (+p[1]) + "月" + (+p[2]) + "日" : (+p[2]) + " " + MONTHS_EN[+p[1] - 1].slice(0, 3) + " " + p[0]; }
  fetch("briefs.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (list) {
    list.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var latest = document.getElementById("latest"), arch = document.getElementById("archive");
    if (!list.length) { latest.textContent = "No briefs yet."; return; }
    var L = list[0];
    latest.href = L.file;
    latest.appendChild(both(function (l) { return el("span", "mono note", (l === "ja" ? "最新号 · " : "Latest · ") + fmt(L.date, l)); }));
    latest.appendChild(both(function (l) { return el("h2", "", L.title[l]); }));
    latest.appendChild(both(function (l) { return el("p", "", L.summary[l]); }));
    var month = "";
    list.forEach(function (b) {
      var m = b.date.slice(0, 7);
      if (m !== month) {
        month = m;
        arch.appendChild(both(function (l) { var p = m.split("-"); return el("div", "archive-month", l === "ja" ? p[0] + "年" + (+p[1]) + "月" : MONTHS_EN[+p[1] - 1] + " " + p[0]); }));
      }
      var a = el("a", "row"); a.href = b.file;
      a.appendChild(both(function (l) { return el("span", "d", fmt(b.date, l)); }));
      var t = el("span", "t");
      t.appendChild(both(function (l) { var s = el("span", "", b.title[l]); s.appendChild(el("span", "s", b.summary[l])); return s; }));
      a.appendChild(t);
      arch.appendChild(a);
    });
  }).catch(function () { document.getElementById("archive").textContent = "Could not load the archive."; });
})();
