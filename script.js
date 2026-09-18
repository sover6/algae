(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Mobile nav toggle */
  var navToggle = document.getElementById("navToggle");
  var siteNav = document.getElementById("siteNav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var open = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Scroll-reveal via IntersectionObserver */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Parallax: elements move at different speeds as the page scrolls,
     each layer's own vertical position sets the depth illusion. */
  var parallaxEls = document.querySelectorAll("[data-speed]");
  var ticking = false;

  function updateParallax() {
    var viewportH = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var speed = parseFloat(el.getAttribute("data-speed")) || 0.2;
      var rect = el.getBoundingClientRect();
      var elCenter = rect.top + rect.height / 2;
      var distanceFromCenter = elCenter - viewportH / 2;
      var offset = distanceFromCenter * speed * -1;
      el.style.transform = "translateY(" + offset.toFixed(1) + "px)";
    });
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  if (parallaxEls.length && !reduceMotion) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateParallax();
  }

  /* ---------------------------------------------------------------
     Living algae canvas: soft, blurred cell-like blobs that drift,
     morph their outline, and slowly shift color — a generative
     stand-in for the organism itself, not a literal photo. Pauses
     off-screen / hidden tab to stay cheap, and reduces to one static
     frame under prefers-reduced-motion.
  ----------------------------------------------------------------*/
  var canvas = document.getElementById("algaeCanvas");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var hero = canvas.closest(".hero");
    var cells = [];
    var cssWidth = 0, cssHeight = 0;
    var mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
    var running = false;
    var rafId = null;
    var startTime = null;

    var HUES = [152, 168, 178, 195]; // green -> teal -> ocean blue

    function rand(min, max) { return min + Math.random() * (max - min); }

    function buildCells() {
      var area = cssWidth * cssHeight;
      var count = Math.max(7, Math.min(16, Math.round(area / 45000)));
      cells = [];
      for (var i = 0; i < count; i++) {
        var radius = rand(0.045, 0.13) * Math.min(cssWidth, cssHeight);
        cells.push({
          x: rand(0, cssWidth),
          y: rand(0, cssHeight),
          radius: radius,
          vx: rand(-1, 1) * 0.06,
          vy: rand(-1, 1) * 0.045,
          wobbleAmt: radius * rand(0.12, 0.28),
          phase: rand(0, Math.PI * 2),
          phase2: rand(0, Math.PI * 2),
          speed: rand(0.35, 0.8),
          hue: HUES[i % HUES.length] + rand(-6, 6),
          hueDrift: rand(0.4, 1.1) * (Math.random() < 0.5 ? -1 : 1),
          alpha: rand(0.16, 0.34)
        });
      }
    }

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      cssWidth = rect.width;
      cssHeight = rect.height;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildCells();
    }

    function drawCell(cell, t) {
      var points = 10;
      ctx.beginPath();
      for (var i = 0; i <= points; i++) {
        var angle = (i / points) * Math.PI * 2;
        var wobble =
          Math.sin(angle * 3 + t * cell.speed + cell.phase) * cell.wobbleAmt +
          Math.cos(angle * 2 - t * cell.speed * 0.7 + cell.phase2) * cell.wobbleAmt * 0.6;
        var r = cell.radius + wobble;
        var px = cell.x + Math.cos(angle) * r;
        var py = cell.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      var hue = cell.hue + Math.sin(t * 0.15 + cell.phase) * 10;
      var grad = ctx.createRadialGradient(cell.x, cell.y, 0, cell.x, cell.y, cell.radius * 1.4);
      grad.addColorStop(0, "hsla(" + hue + ", 70%, 72%, " + cell.alpha + ")");
      grad.addColorStop(1, "hsla(" + (hue + 25) + ", 65%, 45%, 0)");
      ctx.fillStyle = grad;
      ctx.fill();
    }

    function step(now) {
      if (!running) return;
      if (startTime === null) startTime = now;
      var t = (now - startTime) / 1000;

      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.filter = "blur(14px)";
      ctx.save();
      ctx.translate(mouseX, mouseY);

      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        cell.x += cell.vx;
        cell.y += cell.vy;
        var pad = cell.radius * 1.6;
        if (cell.x < -pad) cell.x = cssWidth + pad;
        if (cell.x > cssWidth + pad) cell.x = -pad;
        if (cell.y < -pad) cell.y = cssHeight + pad;
        if (cell.y > cssHeight + pad) cell.y = -pad;
        drawCell(cell, t);
      }
      ctx.restore();
      ctx.filter = "none";

      rafId = window.requestAnimationFrame(step);
    }

    function start() {
      if (running) return;
      running = true;
      rafId = window.requestAnimationFrame(step);
    }

    function stop() {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
    }

    function drawStaticFrame() {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.filter = "blur(14px)";
      for (var i = 0; i < cells.length; i++) drawCell(cells[i], 0);
      ctx.filter = "none";
    }

    resize();

    if (reduceMotion) {
      drawStaticFrame();
    } else {
      if (hero) {
        hero.addEventListener("mousemove", function (e) {
          var rect = hero.getBoundingClientRect();
          targetMouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 24;
          targetMouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 16;
        });
        hero.addEventListener("mouseleave", function () {
          targetMouseX = 0;
          targetMouseY = 0;
        });
      }

      if ("IntersectionObserver" in window) {
        var heroObserver = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting && !document.hidden) start();
              else stop();
            });
          },
          { threshold: 0.01 }
        );
        heroObserver.observe(canvas.parentElement);
      } else {
        start();
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop();
        else if (hero && hero.getBoundingClientRect().bottom > 0) start();
      });

      window.addEventListener("resize", function () {
        resize();
      });
    }
  }
})();

(function () {
  "use strict";

  /* ---------------------------------------------------------------
     Scroll-driven algae morph: a single organic shape that smoothly
     reshapes from one cell, to many, to a colony as the user scrolls
     through a tall sticky section — literally "changing" as you
     scroll, rather than just drifting. Doubles as a small motto:
     one -> many -> a colony.
  ----------------------------------------------------------------*/
  var section = document.getElementById("morph");
  var pathEl = document.getElementById("morphPath");
  var glowPathEl = document.getElementById("morphGlowPath");
  var dotsGroup = document.getElementById("morphDots");
  var stop1 = document.getElementById("morphStop1");
  var stop2 = document.getElementById("morphStop2");
  var stop3 = document.getElementById("morphStop3");
  var words = document.querySelectorAll(".morph-word");
  if (!section || !pathEl) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CX = 300, CY = 300, BASE = 175, POINTS = 60;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function blobPoints(radiusFn) {
    var pts = [];
    for (var i = 0; i < POINTS; i++) {
      var angle = (i / POINTS) * Math.PI * 2;
      var r = radiusFn(angle);
      pts.push([CX + Math.cos(angle) * r, CY + Math.sin(angle) * r]);
    }
    return pts;
  }

  var stageA = blobPoints(function (angle) { return BASE + 10 * Math.sin(angle * 2); });
  var stageB = blobPoints(function (angle) { return BASE * 1.05 + 58 * Math.sin(angle * 3 + 0.6) + 26 * Math.cos(angle * 7); });
  var stageC = blobPoints(function (angle) { return BASE * 0.95 + 38 * Math.sin(angle * 5); });
  var hues = [148, 176, 156];

  function catmullRomPath(points) {
    var n = points.length;
    var d = "M " + points[0][0].toFixed(2) + " " + points[0][1].toFixed(2) + " ";
    for (var i = 0; i < n; i++) {
      var p0 = points[(i - 1 + n) % n];
      var p1 = points[i];
      var p2 = points[(i + 1) % n];
      var p3 = points[(i + 2) % n];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += "C " + c1x.toFixed(2) + " " + c1y.toFixed(2) + ", " + c2x.toFixed(2) + " " + c2y.toFixed(2) + ", " + p2[0].toFixed(2) + " " + p2[1].toFixed(2) + " ";
    }
    return d + "Z";
  }

  function blendPoints(ptsFrom, ptsTo, t) {
    var out = [];
    for (var i = 0; i < POINTS; i++) {
      out.push([lerp(ptsFrom[i][0], ptsTo[i][0], t), lerp(ptsFrom[i][1], ptsTo[i][1], t)]);
    }
    return out;
  }

  function centroidOf(points) {
    var sx = 0, sy = 0;
    for (var i = 0; i < points.length; i++) { sx += points[i][0]; sy += points[i][1]; }
    return [sx / points.length, sy / points.length];
  }

  function scaleFromCentroid(points, factor) {
    var c = centroidOf(points);
    return points.map(function (p) {
      return [c[0] + (p[0] - c[0]) * factor, c[1] + (p[1] - c[1]) * factor];
    });
  }

  function activeWord(progress) {
    if (progress < 0.32) return 0;
    if (progress < 0.68) return 1;
    return 2;
  }

  var lastStageIdx = -1;

  function render(progress) {
    var pts, hue;
    if (progress <= 0.5) {
      var t = progress / 0.5;
      pts = blendPoints(stageA, stageB, t);
      hue = lerp(hues[0], hues[1], t);
    } else {
      var t2 = (progress - 0.5) / 0.5;
      pts = blendPoints(stageB, stageC, t2);
      hue = lerp(hues[1], hues[2], t2);
    }

    pathEl.setAttribute("d", catmullRomPath(pts));
    glowPathEl.setAttribute("d", catmullRomPath(scaleFromCentroid(pts, 1.06)));

    stop1.setAttribute("stop-color", "hsl(" + (hue - 15) + ", 75%, 84%)");
    stop2.setAttribute("stop-color", "hsl(" + hue + ", 55%, 55%)");
    stop3.setAttribute("stop-color", "hsl(" + (hue + 20) + ", 60%, 20%)");

    var dotCount = Math.round(lerp(3, 14, progress));
    if (dotCount !== dotsGroup.childElementCount) {
      var centroid = centroidOf(pts);
      dotsGroup.innerHTML = "";
      for (var i = 0; i < dotCount; i++) {
        var boundary = pts[Math.floor((i / dotCount) * pts.length)];
        var pull = 0.25 + 0.35 * Math.sin(i * 2.1);
        var cx = centroid[0] + (boundary[0] - centroid[0]) * pull;
        var cy = centroid[1] + (boundary[1] - centroid[1]) * pull;
        var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", cx.toFixed(1));
        circle.setAttribute("cy", cy.toFixed(1));
        circle.setAttribute("r", (6 + (i % 3) * 2).toFixed(1));
        circle.setAttribute("fill", "hsla(" + (hue + 10) + ", 70%, 88%, 0.55)");
        dotsGroup.appendChild(circle);
      }
    }

    var stageIdx = activeWord(progress);
    if (stageIdx !== lastStageIdx) {
      words.forEach(function (w) {
        w.classList.toggle("is-active", Number(w.getAttribute("data-stage")) === stageIdx);
      });
      lastStageIdx = stageIdx;
    }
  }

  if (reduceMotion) {
    render(0.5);
    return;
  }

  var ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  function update() {
    var rect = section.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    var progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
    progress = Math.max(0, Math.min(1, progress));
    render(progress);
    ticking = false;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
