(function () {
  const btnApps = document.getElementById("btnApps");
  const appsPanel = document.getElementById("appsPanel");

  function openUrl(url) {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function closeAll() {
    if (appsPanel) appsPanel.hidden = true;
    if (btnApps) btnApps.setAttribute("aria-expanded", "false");
  }

  function toggleApps(e) {
    e.stopPropagation();
    const willOpen = appsPanel && appsPanel.hidden;
    closeAll();
    if (willOpen && appsPanel) {
      appsPanel.hidden = false;
      if (btnApps) btnApps.setAttribute("aria-expanded", "true");
    }
  }

  document.addEventListener("click", () => closeAll());

  if (appsPanel) {
    appsPanel.addEventListener("click", (e) => e.stopPropagation());
  }

  if (btnApps) {
    btnApps.addEventListener("click", toggleApps);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });

  document.querySelectorAll("[data-open-url]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const url = el.getAttribute("data-open-url");
      if (url) openUrl(url);
      closeAll();
    });
  });
})();
