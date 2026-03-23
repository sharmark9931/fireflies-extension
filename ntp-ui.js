(function () {
  const LS_SEARCH = "ntp_showSearch";
  const LS_DOCK = "ntp_showTopSites";

  const DEFAULT_SITE_ICON =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
        '<rect width="24" height="24" rx="6" fill="#e8eaed"/>' +
        '<path fill="#5f6368" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>' +
        "</svg>"
    );

  const searchHub = document.getElementById("searchHub");
  const dockWrap = document.getElementById("topSitesDockWrap");
  const dockList = document.getElementById("topSitesDock");
  const toggleSearch = document.getElementById("toggleSearch");
  const toggleDock = document.getElementById("toggleDock");

  function loadBool(key, defaultVal) {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return defaultVal;
      return v === "1" || v === "true";
    } catch {
      return defaultVal;
    }
  }

  function saveBool(key, val) {
    try {
      localStorage.setItem(key, val ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function applyVisibility() {
    const showSearch = loadBool(LS_SEARCH, true);
    const showDock = loadBool(LS_DOCK, true);

    if (searchHub) {
      searchHub.hidden = !showSearch;
      searchHub.setAttribute("aria-hidden", showSearch ? "false" : "true");
    }
    if (dockWrap) {
      dockWrap.hidden = !showDock;
      dockWrap.setAttribute("aria-hidden", showDock ? "false" : "true");
    }
    if (toggleSearch) {
      toggleSearch.setAttribute("aria-pressed", showSearch ? "true" : "false");
      toggleSearch.classList.toggle("ntp-toggle--on", showSearch);
    }
    if (toggleDock) {
      toggleDock.setAttribute("aria-pressed", showDock ? "true" : "false");
      toggleDock.classList.toggle("ntp-toggle--on", showDock);
    }
  }

  function openUrl(url) {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function faviconUrlForPage(url) {
    try {
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
    } catch {
      return "https://www.google.com/s2/favicons?domain=google.com&sz=64";
    }
  }

  function renderTopSites(sites) {
    if (!dockList) return;
    dockList.innerHTML = "";
    const max = 12;
    (sites || []).slice(0, max).forEach((site) => {
      if (!site.url) return;
      const a = document.createElement("a");
      a.className = "ntp-dock-item";
      a.href = site.url;
      a.title = site.title || site.url;
      a.setAttribute("aria-label", site.title || site.url);
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openUrl(site.url);
      });
      const img = document.createElement("img");
      img.className = "ntp-dock-favicon";
      img.src = faviconUrlForPage(site.url);
      img.alt = "";
      img.width = 36;
      img.height = 36;
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.addEventListener(
        "error",
        function onDockIconError() {
          if (img.src !== DEFAULT_SITE_ICON) {
            img.src = DEFAULT_SITE_ICON;
          }
        },
        { once: true }
      );
      a.appendChild(img);
      dockList.appendChild(a);
    });

    if (!dockList.children.length) {
      const empty = document.createElement("p");
      empty.className = "ntp-dock-empty";
      empty.textContent = "No top sites yet — browse a bit and they’ll appear here.";
      dockList.appendChild(empty);
    }
  }

  function loadTopSites() {
    if (typeof chrome === "undefined" || !chrome.topSites || !chrome.topSites.get) {
      renderTopSites([]);
      return;
    }
    chrome.topSites.get((sites) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        renderTopSites([]);
        return;
      }
      renderTopSites(sites || []);
    });
  }

  if (toggleSearch) {
    toggleSearch.addEventListener("click", () => {
      const next = !loadBool(LS_SEARCH, true);
      saveBool(LS_SEARCH, next);
      applyVisibility();
    });
  }

  if (toggleDock) {
    toggleDock.addEventListener("click", () => {
      const next = !loadBool(LS_DOCK, true);
      saveBool(LS_DOCK, next);
      applyVisibility();
    });
  }

  applyVisibility();
  loadTopSites();
})();
