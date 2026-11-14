(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const toastEl = $("#toast");
  let toastTimer;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1900);
  }

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  const header = $("#header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const burger = $("#burger");
  if (burger && header) {
    burger.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    $$(".nav a").forEach((a) => a.addEventListener("click", () => {
      header.classList.remove("nav-open");
      burger.setAttribute("aria-expanded", "false");
    }));
  }

  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  const counters = $$("[data-count]");
  if (counters.length) {
    const animate = (el) => {
      const target = Number(el.dataset.count) || 0;
      if (reduced) { el.textContent = String(target); return; }
      const duration = 1200;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        cio.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  $$(".card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });

  const ip = "play.burmalworld.ru";
  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(message);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast(message); } catch { toast("Не удалось скопировать"); }
      ta.remove();
    }
  };

  const ipPill = $("#ipPill");
  if (ipPill) ipPill.addEventListener("click", () => copy(ip, "IP скопирован"));
  ["#playBtn", "#playBtn2"].forEach((sel) => {
    const btn = $(sel);
    if (btn) btn.addEventListener("click", () => copy(ip, "IP скопирован — вставляй в Minecraft"));
  });

  const nickInput = $("#nick");
  const amountInput = $("#amount");
  const totalEl = $("#total");
  const chips = $$(".chip[data-amount]");

  const amountValue = () => {
    const raw = parseInt(amountInput ? amountInput.value : "100", 10);
    return Math.max(1, Math.min(100000, Number.isFinite(raw) ? raw : 1));
  };

  const formatRub = (value) => value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " \u20BD";

  function renderTotal() {
    if (!totalEl) return;
    const value = amountValue();
    totalEl.textContent = formatRub(value * 0.01);
    totalEl.classList.add("bump");
    setTimeout(() => totalEl.classList.remove("bump"), 180);
  }

  if (amountInput) {
    amountInput.addEventListener("input", renderTotal);
    amountInput.addEventListener("blur", () => {
      amountInput.value = String(amountValue());
      renderTotal();
    });
    renderTotal();
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      if (!amountInput) return;
      amountInput.value = chip.dataset.amount || "100";
      chips.forEach((c) => c.classList.toggle("active", c === chip));
      renderTotal();
    });
  });

  const modal = $("#modal");
  const orderText = $("#orderText");
  const orderBtn = $("#orderBtn");
  const modalClose = $("#modalClose");
  const copyOrderBtn = $("#copyOrder");
  let currentOrder = "";

  function openModal() {
    if (!modal) return;
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    setTimeout(() => modalClose && modalClose.focus(), 30);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.classList.remove("modal-open");
  }

  if (orderBtn) {
    orderBtn.addEventListener("click", () => {
      const nick = nickInput ? nickInput.value.trim() : "";
      const amount = amountValue();
      if (!nick) {
        toast("Сначала укажи ник");
        nickInput && nickInput.focus();
        return;
      }
      const sum = formatRub(amount * 0.01);
      currentOrder = [
        "Заявка BurmalWorld",
        `Ник: ${nick}`,
        `Бурмалдирики: ${amount}`,
        `К оплате: ${sum}`,
        "Курс: 1 Бурмалдирик = 0,01 ₽"
      ].join("\n");
      if (orderText) orderText.textContent = currentOrder;
      openModal();
    });
  }

  if (copyOrderBtn) copyOrderBtn.addEventListener("click", () => copy(currentOrder, "Заявка скопирована"));
  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && modal.classList.contains("open")) closeModal();
  });

  const tabs = $$(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      $$(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `tab-${tab.dataset.tab}`);
      });
    });
  });

  $$(".cmd").forEach((cmd) => {
    cmd.addEventListener("click", () => copy(cmd.dataset.cmd || "", "Команда скопирована"));
  });

  const canvas = $("#sculkCanvas");
  if (canvas && !reduced) {
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let rafId = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(26, Math.min(64, Math.round(width / 24)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 5,
        speed: 0.12 + Math.random() * 0.35,
        drift: (Math.random() - 0.5) * 0.16,
        alpha: 0.12 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      }));
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += p.drift + Math.sin(time / 2400 + p.phase) * 0.08;
        if (p.y < -12) { p.y = height + 12; p.x = Math.random() * width; }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;
        const glow = 0.6 + Math.sin(time / 900 + p.phase) * 0.4;
        ctx.fillStyle = `rgba(126,255,232,${p.alpha * glow})`;
        ctx.shadowColor = "rgba(23,195,189,.55)";
        ctx.shadowBlur = 10;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.shadowBlur = 0;
      rafId = requestAnimationFrame(draw);
    };

    resize();
    rafId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else rafId = requestAnimationFrame(draw);
    });
  }
})();
