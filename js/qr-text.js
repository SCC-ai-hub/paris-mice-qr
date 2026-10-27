(function () {
  var LANGS = [
    { code: "ru", label: "Русский" },
    { code: "en", label: "English" },
    { code: "fr", label: "Français" },
    { code: "es", label: "Español" }
  ];

  var FLAG_SVG = {
    ru:
      '<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="20" y="0" fill="#fff"/><rect width="60" height="20" y="20" fill="#0039A6"/><rect width="60" height="20" y="40" fill="#D52B1E"/></svg>',
    en:
      '<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="#012169"/><path d="M0 0L60 60M60 0L0 60" stroke="#fff" stroke-width="10"/><path d="M0 0L60 60M60 0L0 60" stroke="#C8102E" stroke-width="6"/><path d="M30 0V60M0 30H60" stroke="#fff" stroke-width="16"/><path d="M30 0V60M0 30H60" stroke="#C8102E" stroke-width="10"/></svg>',
    fr:
      '<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="20" height="60" x="0" fill="#002395"/><rect width="20" height="60" x="20" fill="#fff"/><rect width="20" height="60" x="40" fill="#ED2939"/></svg>',
    es:
      '<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="#AA151B"/><rect width="60" height="24" y="18" fill="#F1BF00"/></svg>'
  };

  function flagMarkup(code) {
    return FLAG_SVG[code];
  }

  function paragraphs(text) {
    return (text || "")
      .split(/\n+/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean)
      .map(function (line) {
        return "<p>" + escapeHtml(line) + "</p>";
      })
      .join("");
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function initScroll(textSection) {
    var scrollTrack = qs(".scroll-track");
    var scrollThumb = qs(".scroll-thumb");
    var btnUp = qs("[data-scroll-up]");
    var btnDown = qs("[data-scroll-down]");
    if (!textSection || !scrollTrack || !scrollThumb) return { reset: function () {} };

    function maxScroll() {
      return Math.max(0, textSection.scrollHeight - textSection.clientHeight);
    }

    function updateScrollArrows() {
      if (!btnUp || !btnDown) return;
      var top = textSection.scrollTop;
      var max = maxScroll();
      var atTop = top <= 1;
      var atBottom = max <= 0 || top >= max - 1;
      btnUp.classList.toggle("scroll-btn--inactive", atTop);
      btnDown.classList.toggle("scroll-btn--inactive", atBottom);
      btnUp.disabled = atTop;
      btnDown.disabled = atBottom;
    }

    function updateScrollbar() {
      var scrollHeight = textSection.scrollHeight;
      var clientHeight = textSection.clientHeight;
      var max = maxScroll();
      if (max <= 0) {
        scrollTrack.style.visibility = "hidden";
      } else {
        scrollTrack.style.visibility = "visible";
        var trackHeight = scrollTrack.clientHeight;
        var ratio = clientHeight / scrollHeight;
        var thumbHeight = Math.max(ratio * trackHeight * 0.5, trackHeight * 0.08);
        var maxThumbTop = trackHeight - thumbHeight;
        var thumbTop = max > 0 ? (textSection.scrollTop / max) * maxThumbTop : 0;
        scrollThumb.style.height = thumbHeight + "px";
        scrollThumb.style.transform = "translateY(" + thumbTop + "px)";
      }
      updateScrollArrows();
    }

    var scrollAnimating = false;
    var burstCount = 0;
    var lastDir = 0;
    var pendingDir = 0;
    var idleTimer = null;
    var IDLE_RESET_MS = 900;

    function scrollStep() {
      return Math.max(120, textSection.clientHeight * 0.28);
    }

    function armIdleReset() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        burstCount = 0;
        lastDir = 0;
        pendingDir = 0;
      }, IDLE_RESET_MS);
    }

    function canScroll(direction) {
      if (direction < 0) {
        return btnUp && !btnUp.classList.contains("scroll-btn--inactive");
      }
      return btnDown && !btnDown.classList.contains("scroll-btn--inactive");
    }

    function animatedScrollBy(pixels, onDone) {
      var start = textSection.scrollTop;
      var end = Math.max(0, Math.min(start + pixels, maxScroll()));
      var total = end - start;
      if (total === 0) {
        if (onDone) onDone();
        return;
      }
      scrollAnimating = true;
      var duration = 550;
      var startTime = null;

      function step(ts) {
        if (!startTime) startTime = ts;
        var t = (ts - startTime) / duration;
        if (t >= 1) {
          textSection.scrollTop = end;
          scrollAnimating = false;
          if (onDone) onDone();
          return;
        }
        var ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        textSection.scrollTop = start + total * ease;
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function finishScrollCycle() {
      updateScrollArrows();
      if (pendingDir && canScroll(pendingDir)) {
        var dir = pendingDir;
        pendingDir = 0;
        startScroll(dir, false);
        return;
      }
      pendingDir = 0;
      armIdleReset();
    }

    function startScroll(direction, countTap) {
      if (countTap) {
        if (direction !== lastDir) {
          burstCount = 0;
          lastDir = direction;
        }
        burstCount += 1;
        clearTimeout(idleTimer);
      }
      if (!canScroll(direction)) {
        burstCount = 0;
        pendingDir = 0;
        updateScrollArrows();
        return;
      }
      var mult = burstCount >= 3 ? 2 : 1;
      animatedScrollBy(direction * scrollStep() * mult, finishScrollCycle);
    }

    function onArrowClick(direction) {
      if (!canScroll(direction)) return;
      if (scrollAnimating) {
        if (direction !== lastDir) {
          burstCount = 0;
          lastDir = direction;
        }
        burstCount += 1;
        pendingDir = direction;
        clearTimeout(idleTimer);
        return;
      }
      startScroll(direction, true);
    }

    function resetScroll() {
      textSection.scrollTop = 0;
      burstCount = 0;
      lastDir = 0;
      pendingDir = 0;
      clearTimeout(idleTimer);
      updateScrollbar();
    }

    if (btnUp) btnUp.addEventListener("click", function () { onArrowClick(-1); });
    if (btnDown) btnDown.addEventListener("click", function () { onArrowClick(1); });
    textSection.addEventListener("scroll", updateScrollbar, { passive: true });
    window.addEventListener("resize", updateScrollbar);
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(updateScrollbar).observe(textSection);
    }
    updateScrollbar();
    return { reset: resetScroll, update: updateScrollbar };
  }

  function buildFlags(container, sizeClass, withLabels, onPick) {
    container.innerHTML = "";
    LANGS.forEach(function (lang) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = sizeClass || "flag-btn";
      btn.dataset.lang = lang.code;
      btn.setAttribute("aria-label", lang.label);
      btn.innerHTML = flagMarkup(lang.code);

      if (withLabels) {
        var wrap = document.createElement("div");
        wrap.className = "flag-choice";
        wrap.appendChild(btn);
        var lab = document.createElement("span");
        lab.className = "flag-label";
        lab.textContent = lang.label;
        wrap.appendChild(lab);
        wrap.addEventListener("click", function () {
          onPick(lang.code);
        });
        container.appendChild(wrap);
      } else {
        btn.addEventListener("click", function () {
          onPick(lang.code);
        });
        container.appendChild(btn);
      }
    });
  }

  function boot(entry) {
    var textBody = qs("[data-text-body]");
    var textCode = qs("[data-text-code]");
    var overlay = qs("[data-lang-overlay]");
    var overlayFlags = qs("[data-overlay-flags]");
    var barFlags = qs("[data-bar-flags]");
    var textSection = qs(".text-section");
    var scrollApi = initScroll(textSection);
    var currentLang = null;

    if (textCode) textCode.textContent = entry.id;

    function setLang(code, fromOverlay) {
      currentLang = code;
      document.body.classList.add("has-lang");
      document.documentElement.lang = code;
      textBody.innerHTML = paragraphs(entry.texts[code] || "");
      qsa(".flag-btn", barFlags).forEach(function (b) {
        b.classList.toggle("is-active", b.dataset.lang === code);
      });
      if (fromOverlay && overlay) {
        overlay.classList.add("is-hidden");
      }
      scrollApi.reset();
      requestAnimationFrame(function () {
        scrollApi.update();
      });
    }

    buildFlags(overlayFlags, "flag-btn", true, function (code) {
      setLang(code, true);
    });

    buildFlags(barFlags, "flag-btn", false, function (code) {
      setLang(code, false);
    });
  }

  window.QRTextApp = {
    boot: boot,
    load: function (textId) {
      var base = document.querySelector('script[src*="qr-text.js"]');
      var root = base ? base.getAttribute("src").replace(/js\/qr-text\.js.*$/, "") : "../../";
      return fetch(root + "data/texts.json")
        .then(function (r) {
          return r.json();
        })
        .then(function (list) {
          var entry = list.find(function (x) {
            return x.id === textId || x.slug === textId;
          });
          if (!entry) throw new Error("Text not found: " + textId);
          boot(entry);
        });
    }
  };
})();
