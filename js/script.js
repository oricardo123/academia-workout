(() => {
  "use strict";

  const body = document.body;
  const header = document.querySelector("#site-header");
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");
  const navLinks = [...document.querySelectorAll(".primary-nav a")];
  const ambientVideos = [
    ...document.querySelectorAll(".hero-video, .drone-video, .jiujitsu-video"),
  ];
  const videoControls = [...document.querySelectorAll("[data-video-target]")];
  const year = document.querySelector("#year");
  const lightbox = document.querySelector(".lightbox");
  const lightboxImage = lightbox?.querySelector("img");
  const lightboxClose = lightbox?.querySelector(".lightbox-close");
  const galleryToggle = document.querySelector(".gallery-toggle");
  const galleryExtras = [...document.querySelectorAll(".gallery-extra")];

  if (year) year.textContent = new Date().getFullYear();

  const loadVideoSource = (video) => {
    const deferredSources = [...video.querySelectorAll("source[data-src]")];
    if (deferredSources.length === 0) return;

    deferredSources.forEach((source) => {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    video.load();
  };

  const setMenuState = (open) => {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    nav.classList.toggle("open", open);
    body.classList.toggle("menu-open", open);
  };

  menuButton?.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuState(false);
      if (lightbox?.open) lightbox.close();
    }
  });

  let lastScrollY = window.scrollY;
  let scrollTicking = false;

  const updateHeader = () => {
    const currentScrollY = window.scrollY;
    header?.classList.toggle("scrolled", currentScrollY > 24);

    if (!body.classList.contains("menu-open") && currentScrollY > 500) {
      header?.classList.toggle("hidden", currentScrollY > lastScrollY + 8);
    } else {
      header?.classList.remove("hidden");
    }

    lastScrollY = currentScrollY;
    scrollTicking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(updateHeader);
        scrollTicking = true;
      }
    },
    { passive: true },
  );
  updateHeader();

  const updateVideoControl = (control, video) => {
    const icon = control.querySelector(".video-control-icon");
    const label = control.querySelector(".video-control-label");
    const isPaused = video.paused;

    control.setAttribute("aria-pressed", String(isPaused));
    control.setAttribute(
      "aria-label",
      isPaused ? "Reproduzir vídeo" : "Pausar vídeo",
    );
    if (icon) icon.textContent = isPaused ? "▶" : "Ⅱ";
    if (label) label.textContent = isPaused ? "Reproduzir" : "Pausar";
  };

  videoControls.forEach((control) => {
    const selector = control.dataset.videoTarget;
    const video = selector ? document.querySelector(selector) : null;
    if (!video) return;

    updateVideoControl(control, video);

    control.addEventListener("click", async () => {
      try {
        if (video.paused) {
          loadVideoSource(video);
          await video.play();
        } else {
          video.pause();
        }
        updateVideoControl(control, video);
      } catch (error) {
        console.warn("O navegador bloqueou a reprodução do vídeo.", error);
      }
    });

    video.addEventListener("play", () => updateVideoControl(control, video));
    video.addEventListener("pause", () => updateVideoControl(control, video));
  });

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (prefersReducedMotion) ambientVideos.forEach((video) => video.pause());

  const lazyVideos = [...document.querySelectorAll("[data-lazy-video]")];
  const loadAndPlayVideo = async (video) => {
    loadVideoSource(video);
    try {
      await video.play();
    } catch (error) {
      console.warn("O navegador bloqueou a reprodução do vídeo.", error);
    }
  };

  if (!prefersReducedMotion) {
    if ("IntersectionObserver" in window) {
      const videoObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            loadAndPlayVideo(entry.target);
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "100px 0px", threshold: 0 },
      );

      lazyVideos.forEach((video) => videoObserver.observe(video));
    } else {
      lazyVideos.forEach(loadAndPlayVideo);
    }
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.13, rootMargin: "0px 0px -4%" },
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const counters = document.querySelectorAll(".counter");
  const animateCounter = (element) => {
    const target = Number(element.dataset.target || 0);
    const duration = 1100;
    const start = performance.now();

    const step = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.floor(target * eased).toLocaleString("pt-PT");
      if (progress < 1) window.requestAnimationFrame(step);
    };

    window.requestAnimationFrame(step);
  };

  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.65 },
    );

    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach((counter) => {
      counter.textContent = Number(counter.dataset.target || 0).toLocaleString(
        "pt-PT",
      );
    });
  }

  const sections = [...document.querySelectorAll("main section[id]")];
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const activeId = entry.target.id;
          navLinks.forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("href") === `#${activeId}`,
            );
          });
        });
      },
      { rootMargin: "-35% 0px -55%", threshold: 0 },
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  const setGalleryState = (expanded) => {
    if (!galleryToggle) return;

    galleryToggle.setAttribute("aria-expanded", String(expanded));
    galleryToggle.textContent = expanded
      ? "Ver menos fotografias"
      : "Ver mais fotografias";

    galleryExtras.forEach((item) => {
      if (expanded) {
        item.hidden = false;
        window.requestAnimationFrame(() => item.classList.add("is-visible"));
      } else {
        item.classList.remove("is-visible");
        item.hidden = true;
      }
    });
  };

  if (galleryToggle) {
    const galleryActions = galleryToggle.closest(".gallery-actions");

    if (galleryExtras.length === 0) {
      if (galleryActions) galleryActions.hidden = true;
    } else {
      setGalleryState(false);
      galleryToggle.addEventListener("click", () => {
        const expanded = galleryToggle.getAttribute("aria-expanded") === "true";
        setGalleryState(!expanded);
      });
    }
  }

  document.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (!lightbox || !lightboxImage) return;
      lightboxImage.src = item.dataset.full || "";
      lightboxImage.alt = item.dataset.alt || "Fotografia da Academia Workout";
      lightbox.showModal();
      body.classList.add("lightbox-open");
    });
  });

  lightboxClose?.addEventListener("click", () => lightbox?.close());
  lightbox?.addEventListener("click", (event) => {
    const rect = lightbox.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) lightbox.close();
  });
  lightbox?.addEventListener("close", () => {
    body.classList.remove("lightbox-open");
    if (lightboxImage) lightboxImage.src = "";
  });
})();
