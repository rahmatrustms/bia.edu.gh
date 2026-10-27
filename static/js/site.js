// Shared mobile navigation and current-year footer
const lucideScript = document.createElement("script");
lucideScript.src = "https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js";
lucideScript.onload = () => window.renderLucideIcons();
document.head.appendChild(lucideScript);

window.renderLucideIcons = () => {
  if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
};
window.setLucideIcon = (element, name, fallback) => {
  if (!element) return;
  element.innerHTML = `<i data-lucide="${name}" aria-hidden="true">${fallback}</i>`;
  window.renderLucideIcons();
};

const themeButtons = [...document.querySelectorAll(".site-theme-toggle")];
const applyTheme = theme => {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  localStorage.setItem("bia-theme", isDark ? "dark" : "light");
  themeButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
  });
};
const savedTheme = localStorage.getItem("bia-theme");
applyTheme(savedTheme === "dark" ? "dark" : "light");
themeButtons.forEach(button => button.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}));

const imageFallback = "/static/images/gallery-fallback.svg";
const setImageFallback = image => {
  if (!(image instanceof HTMLImageElement) || image.dataset.fallbackApplied || !image.getAttribute("src")) return;
  image.dataset.fallbackApplied = "true";
  image.src = imageFallback;
};
document.addEventListener("error", event => {
  if (event.target instanceof HTMLImageElement) setImageFallback(event.target);
}, true);
document.querySelectorAll("img").forEach(image => {
  if (image.complete && image.naturalWidth === 0) setImageFallback(image);
});

const menuButton = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
let closeHomeNavigation = () => {};
if (menuButton && mainNav) {
  const navBackdrop = document.querySelector(".home-nav-backdrop");
  const navCloseButton = document.querySelector(".home-nav-close");
  closeHomeNavigation = () => {
    mainNav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    window.setLucideIcon(menuButton, "menu", "☰");
    if (navBackdrop) navBackdrop.hidden = true;
    document.body.classList.remove("home-nav-open");
    if (navCloseButton?.contains(document.activeElement)) menuButton.focus();
  };
  menuButton.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    window.setLucideIcon(menuButton, open ? "x" : "menu", open ? "×" : "☰");
    if (navBackdrop) navBackdrop.hidden = !open;
    document.body.classList.toggle("home-nav-open", open);
    if (open) navCloseButton?.focus();
  });
  mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeHomeNavigation));
  if (navCloseButton) navCloseButton.addEventListener("click", closeHomeNavigation);
  if (navBackdrop) navBackdrop.addEventListener("click", closeHomeNavigation);
}
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

let installPrompt = null;
const installButtons = [...document.querySelectorAll(".site-install-button")];
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButtons.forEach(button => { button.hidden = false; });
});
installButtons.forEach(button => button.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  if (choice.outcome === "accepted") installButtons.forEach(item => { item.hidden = true; });
  installPrompt = null;
}));
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButtons.forEach(button => { button.hidden = true; });
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js")
    .catch(error => console.error("Could not register the app service worker.", error));
}

const homeSearchPanel = document.querySelector("#home-search-panel");
const homeSearchInput = document.querySelector("#home-search-input");
if (homeSearchPanel && homeSearchInput) {
  const searchTriggers = [...document.querySelectorAll(".home-search-trigger")];
  const searchResults = document.querySelector("#home-search-results");
  const searchTargets = [
    ...document.querySelectorAll(
      ".home-hero-slide, .home-about-copy, .home-school-note, .home-audio-card, .home-notice-list li, .home-gallery-grid a, .home-footer-main>div:last-child"
    ),
  ];
  const closeSearch = () => {
    homeSearchPanel.hidden = true;
    searchTriggers.forEach(trigger => trigger.setAttribute("aria-expanded", "false"));
  };
  const openSearch = () => {
    if (mainNav?.classList.contains("open")) menuButton?.click();
    homeSearchPanel.hidden = false;
    searchTriggers.forEach(trigger => trigger.setAttribute("aria-expanded", "true"));
    homeSearchInput.focus();
  };
  const renderResults = () => {
    const query = homeSearchInput.value.trim().toLowerCase();
    searchResults.replaceChildren();
    if (!query) {
      searchResults.textContent = "Type a topic to search this homepage.";
      searchResults.classList.add("is-empty");
      return;
    }

    const terms = query.split(/\s+/);
    const matches = searchTargets.filter(target => {
      const imageText = [...target.querySelectorAll("img")].map(image => image.alt).join(" ");
      const searchableText = `${target.textContent} ${imageText}`.toLowerCase();
      return terms.every(term => searchableText.includes(term));
    }).slice(0, 8);

    if (!matches.length) {
      searchResults.textContent = "No matching information found on this homepage.";
      searchResults.classList.add("is-empty");
      return;
    }
    searchResults.classList.remove("is-empty");
    matches.forEach(target => {
      const heading = target.querySelector("h1, h2, h3");
      const title = heading?.textContent.trim() || target.dataset.caption || "Homepage information";
      const description = [...target.querySelectorAll("p")]
        .map(paragraph => paragraph.textContent.trim())
        .find(text => text && text !== title) || target.textContent.trim();
      const result = document.createElement("button");
      result.className = "home-search-result";
      result.type = "button";
      const resultTitle = document.createElement("strong");
      resultTitle.textContent = title;
      const resultDescription = document.createElement("span");
      resultDescription.textContent = description;
      result.append(resultTitle, resultDescription);
      result.addEventListener("click", () => {
        closeSearch();
        const slides = [...document.querySelectorAll(".home-hero-slide")];
        const slideIndex = slides.indexOf(target);
        if (slideIndex >= 0 && slides[slideIndex].hidden) {
          document.querySelectorAll(".home-hero-dots button")[slideIndex]?.click();
        }
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("home-search-match");
        window.setTimeout(() => target.classList.remove("home-search-match"), 1600);
      });
      searchResults.append(result);
    });
  };

  searchTriggers.forEach(trigger => trigger.addEventListener("click", () => {
    if (homeSearchPanel.hidden) openSearch();
    else closeSearch();
  }));
  menuButton?.addEventListener("click", closeSearch);
  homeSearchPanel.querySelector(".home-search-close").addEventListener("click", closeSearch);
  homeSearchInput.addEventListener("input", renderResults);
  homeSearchPanel.querySelector("form").addEventListener("submit", event => event.preventDefault());
  document.addEventListener("click", event => {
    if (!homeSearchPanel.hidden && !homeSearchPanel.contains(event.target) &&
        !searchTriggers.some(trigger => trigger.contains(event.target))) closeSearch();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeSearch();
      if (mainNav?.classList.contains("open")) closeHomeNavigation();
    }
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName) &&
        !document.activeElement?.isContentEditable) {
      event.preventDefault();
      openSearch();
    }
  });
  renderResults();
}

const hero = document.querySelector(".home-hero");
if (hero) {
  const slides = [...hero.querySelectorAll(".home-hero-slide")];
  const dots = [...hero.querySelectorAll(".home-hero-dots button")];
  let activeSlide = slides.findIndex(slide => slide.classList.contains("is-active"));
  const showSlide = index => {
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === activeSlide;
      slide.hidden = !active;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      dots[slideIndex].classList.toggle("is-active", active);
      dots[slideIndex].setAttribute("aria-pressed", String(active));
    });
  };
  hero.querySelector(".home-hero-previous").addEventListener("click", () => showSlide(activeSlide - 1));
  hero.querySelector(".home-hero-next").addEventListener("click", () => showSlide(activeSlide + 1));
  dots.forEach((dot, index) => dot.addEventListener("click", () => showSlide(index)));
}
