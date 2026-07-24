(function () {
  "use strict";

  const STORAGE_KEY = "msiVisitedV1";
  const DATA_URL = "data/MSI.geojson";

  // ---------- Layout: keep map below the (variable-height) toolbar ----------
  function layoutMap() {
    const toolbar = document.querySelector(".toolbar");
    document.getElementById("map").style.top = toolbar.offsetHeight + "px";
  }
  window.addEventListener("resize", layoutMap);

  // ---------- Visited-state storage (this browser only) ----------
  function loadVisited() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("Could not read saved visited list, starting fresh.", e);
      return {};
    }
  }

  function saveVisited(visited) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visited));
  }

  let visited = loadVisited();

  // ---------- Map setup ----------
  const map = L.map("map", { zoomControl: true, minZoom: 9 });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const toast = document.getElementById("toast");
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function fid(feature) {
    return String(feature.properties.fid);
  }

  function isVisited(feature) {
    return Object.prototype.hasOwnProperty.call(visited, fid(feature));
  }

  function styleFor(feature) {
    const v = isVisited(feature);
    return {
      color: v ? "#8c2c23" : "#48604f",
      weight: v ? 2 : 1,
      opacity: 0.9,
      fillColor: v ? "#b23a2f" : "#6e8c7b",
      fillOpacity: v ? 0.45 : 0.12,
      dashArray: v ? "5 4" : null
    };
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function popupHtml(feature, justStamped) {
    const name = feature.properties.name || "Bez nazwy";
    const v = isVisited(feature);
    const statusLine = v
      ? `Odwiedzono: ${formatDate(visited[fid(feature)])}`
      : "Jeszcze nieodwiedzone";
    const btnLabel = v ? "Cofnij zaznaczenie" : "Oznacz jako odwiedzone";
    return `
      <div class="msi-popup${justStamped ? " just-stamped" : ""}">
        <h3>${name}</h3>
        <div class="status-line">${statusLine}</div>
        <button type="button" data-fid="${fid(feature)}">${btnLabel}</button>
      </div>`;
  }

  function updateProgress() {
    const total = geoLayer ? geoLayer.getLayers().length : 0;
    const count = Object.keys(visited).length;
    document.getElementById("progressCount").textContent = `${count}/${total}`;
  }

  function toggleVisited(feature, layer) {
    const key = fid(feature);
    if (visited[key]) {
      delete visited[key];
    } else {
      visited[key] = new Date().toISOString();
    }
    saveVisited(visited);
    layer.setStyle(styleFor(feature));
    updateProgress();
    return !!visited[key];
  }

  let geoLayer = null;
  const layersByFid = {};

  fetch(DATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((geojson) => {
      geoLayer = L.geoJSON(geojson, {
        style: styleFor,
        onEachFeature: (feature, layer) => {
          layersByFid[fid(feature)] = layer;

          layer.bindTooltip(feature.properties.name || "Bez nazwy", {
            sticky: true,
            className: "msi-tooltip"
          });

          layer.on("click", () => {
            const nowVisited = toggleVisited(feature, layer);
            showToast(
              nowVisited
                ? `Oznaczono „${feature.properties.name}” jako odwiedzone`
                : `Cofnięto zaznaczenie „${feature.properties.name}”`
            );
          });

          layer.on("popupopen", () => {
            const btn = layer.getPopup().getElement().querySelector("button[data-fid]");
            if (btn) {
              btn.addEventListener("click", () => {
                const nowVisited = toggleVisited(feature, layer);
              });
            }
          });

          layer.on("mouseover", () => {
            if (!isVisited(feature)) {
              layer.setStyle({ fillOpacity: 0.25, weight: 2 });
            }
          });
          layer.on("mouseout", () => {
            layer.setStyle(styleFor(feature));
          });
        }
      }).addTo(map);

      map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
      updateProgress();
      populateSearch(geojson.features);
    })
    .catch((err) => {
      console.error(err);
      showToast("Nie udało się wczytać danych geoportalu.");
    });

  // ---------- Search ----------
  function populateSearch(features) {
    const datalist = document.getElementById("neighborhood-list");
    const names = features
      .map((f) => f.properties.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pl"));
    datalist.innerHTML = names.map((n) => `<option value="${n}">`).join("");
  }

  const searchInput = document.getElementById("searchInput");
  function jumpToName(name) {
    const match = Object.values(layersByFid).find(
      (layer) => layer.feature.properties.name === name
    );
    if (!match) return;
    map.fitBounds(match.getBounds(), { padding: [40, 40], maxZoom: 15 });
    match.openPopup();
  }
  searchInput.addEventListener("change", () => {
    if (searchInput.value) jumpToName(searchInput.value);
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value) jumpToName(searchInput.value);
  });

  // ---------- Export / Import / Reset ----------
  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(visited, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "msi-odwiedzone.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Wyeksportowano listę odwiedzonych obszarów.");
  });

  document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importFile").click();
  });

  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(reader.result);
        visited = Object.assign({}, visited, incoming);
        saveVisited(visited);
        Object.keys(layersByFid).forEach((key) => {
          layersByFid[key].setStyle(styleFor(layersByFid[key].feature));
        });
        updateProgress();
        showToast("Zaimportowano listę odwiedzonych obszarów.");
      } catch (err) {
        console.error(err);
        showToast("Nie udało się odczytać pliku importu.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Na pewno wyczyścić wszystkie zaznaczenia? Tej operacji nie można cofnąć.")) return;
    visited = {};
    saveVisited(visited);
    Object.keys(layersByFid).forEach((key) => {
      layersByFid[key].setStyle(styleFor(layersByFid[key].feature));
    });
    updateProgress();
    showToast("Wyczyszczono wszystkie zaznaczenia.");
  });

  // ---------- Init ----------
  layoutMap();
})();
