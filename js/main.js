(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasLibs = window.gsap && window.ScrollTrigger;

  var header = document.getElementById("header");
  var hero = document.querySelector(".hero");
  var video = document.querySelector(".hero__video");

  /* ---------- Movimento reduzido: poster (último quadro) fixo, textos visíveis ---------- */
  if (reduced) {
    if (video) {
      video.pause();
      video.removeAttribute("preload");
      video.setAttribute("preload", "none");
      video.setAttribute("poster", "assets/hero-last.jpg");
      Array.prototype.forEach.call(video.querySelectorAll("source"), function (s) { s.remove(); });
      video.load();
    }
    if (hasLibs) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.create({
        trigger: "#metodo",
        start: "top top+=72",
        onToggle: function (self) { header.classList.toggle("is-solid", self.isActive || self.progress === 1); }
      });
    } else {
      window.addEventListener("scroll", function () {
        header.classList.toggle("is-solid", window.scrollY > hero.offsetHeight - 72);
      }, { passive: true });
    }
    return;
  }

  /* Sem GSAP (CDN fora do ar): página estática legível, hero com poster */
  if (!hasLibs) {
    window.addEventListener("scroll", function () {
      header.classList.toggle("is-solid", window.scrollY > hero.offsetHeight - 72);
    }, { passive: true });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("anim", "hero-scroll");

  /* ---------- Lenis + ScrollTrigger ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Hero: scrub do vídeo + textos ---------- */
  var intro = document.querySelector("[data-hero-intro]");
  var hint = document.querySelector("[data-hero-hint]");
  var scrim = document.querySelector(".hero__scrim");
  var scrimCap = document.querySelector(".hero__scrim-cap");
  var media = document.querySelector(".hero__media");
  var mobileMQ = window.matchMedia("(max-width: 767px)");
  var mediaShift = 0;
  var caps = Array.prototype.slice.call(document.querySelectorAll("[data-caption]"));

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* [início da entrada, fim da entrada, início da saída, fim da saída] */
  var capRanges = [
    [0.15, 0.19, 0.21, 0.25],
    [0.25, 0.29, 0.56, 0.60],
    [0.60, 0.64, 2, 3] /* a última fica até o fim */
  ];

  var target = 0;   /* progresso de scroll (0..1) */
  var smooth = 0;   /* progresso suavizado (lerp) usado por vídeo e textos */
  var lastTime = -1;

  /* Mobile: o vídeo desce até o centro da tela quando o bloco de texto sai */
  function measure() {
    if (!mobileMQ.matches) { mediaShift = 0; media.style.transform = ""; return; }
    var stageH = media.parentElement.clientHeight;
    mediaShift = (stageH - media.offsetHeight) / 2 - media.offsetTop;
  }
  measure();
  window.addEventListener("resize", function () { measure(); render(smooth); });

  function render(p) {
    var t = easeOut(seg(p, 0, 0.15));
    intro.style.opacity = 1 - t;
    intro.style.transform = "translate3d(0," + (-48 * t).toFixed(2) + "px,0)";
    intro.style.visibility = t >= 1 ? "hidden" : "visible";
    if (scrim) scrim.style.opacity = 1 - t;
    if (mediaShift) media.style.transform = "translate3d(0," + (mediaShift * t).toFixed(2) + "px,0)";
    if (scrimCap) scrimCap.style.opacity = easeOut(seg(p, 0.15, 0.19));
    if (hint) hint.style.opacity = 1 - seg(p, 0, 0.12);

    for (var i = 0; i < caps.length; i++) {
      var r = capRanges[i];
      var inn = easeOut(seg(p, r[0], r[1]));
      var out = easeOut(seg(p, r[2], r[3]));
      caps[i].style.opacity = inn * (1 - out);
      caps[i].style.transform = "translate3d(0," + ((1 - inn) * 24 - out * 24).toFixed(2) + "px,0)";
    }

    if (video && video.duration) {
      var time = p * video.duration;
      /* ~1 quadro de tolerância evita seeks redundantes que fazem o vídeo tremer */
      if (!video.seeking && Math.abs(time - lastTime) >= 1 / 48) {
        video.currentTime = time;
        lastTime = time;
      }
    }
  }

  gsap.ticker.add(function () {
    var d = target - smooth;
    smooth = Math.abs(d) < 0.0005 ? target : smooth + d * 0.18;
    render(smooth);
  });

  /* nunca dar play: o scroll controla o tempo */
  if (video) {
    video.pause();
    video.addEventListener("play", function () { video.pause(); });
  }

  var pinTrigger = ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "+=200%", /* 100vh de tela + 200vh de scroll = ~300vh */
    pin: true,
    anticipatePin: 1,
    onUpdate: function (self) { target = self.progress; }
  });

  /* Header sólido depois do hero */
  ScrollTrigger.create({
    trigger: "#metodo",
    start: "top top+=72",
    onToggle: function (self) { header.classList.toggle("is-solid", self.isActive || self.progress === 1); }
  });

  /* ---------- Reveals: fade + translateY, uma vez ---------- */
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 85%",
    once: true,
    onEnter: function (batch) {
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, overwrite: true });
    }
  });

  /* ---------- Números da prova social: 0 -> valor, 1.2s, uma vez ---------- */
  function format(v, kind) {
    if (kind === "dec1") return v.toFixed(1).replace(".", ",");
    return Math.round(v).toLocaleString("pt-BR");
  }
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var end = parseFloat(el.getAttribute("data-count"));
    var kind = el.getAttribute("data-format");
    var obj = { v: 0 };
    el.textContent = format(0, kind);
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: function () {
        gsap.to(obj, {
          v: end,
          duration: 1.2,
          ease: "power2.out",
          onUpdate: function () { el.textContent = format(obj.v, kind); },
          onComplete: function () { el.textContent = format(end, kind); }
        });
      }
    });
  });

  /* Garante estado correto depois que fontes/vídeo mudarem as medidas */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  if (video) {
    video.addEventListener("loadedmetadata", function () { render(smooth); });
  }
})();
