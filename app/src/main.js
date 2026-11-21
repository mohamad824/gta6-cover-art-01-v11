// NEON VICE Cover Studio — editor wiring: loads the seven photos, keeps
// the live preview in sync with every control, and exports PNGs.
// Photos stay on the user's machine: uploads are read with FileReader
// and never leave the browser.

import {
  COVER_W,
  COVER_H,
  PHOTOS,
  PANEL_NAMES,
  defaultState,
  drawCover,
  exportCover,
  loadImage,
} from "./cover.js";

const state = defaultState();
const images = {};
const params = new URLSearchParams(location.search);
const shot = params.get("shot") || "";

const $ = (id) => document.getElementById(id);

function redraw() {
  drawCover($("coverCanvas"), state, images);
}

function photoOptions(selected) {
  return PHOTOS.map(
    (p) =>
      `<option value="${p}"${p === selected ? " selected" : ""}>${p.replace("photos/", "")}</option>`,
  ).join("");
}

function buildPanelCards() {
  const host = $("panels");
  host.innerHTML = "";
  state.panels.forEach((panel, i) => {
    const card = document.createElement("div");
    card.className = "panel-card";
    card.innerHTML =
      `<h3>${PANEL_NAMES[i]}</h3>` +
      `<label>Photo <select data-panel="${i}" data-field="photo">${photoOptions(panel.photo)}</select></label>` +
      `<label>Upload your photo <input type="file" accept="image/*" data-upload="${i}"></label>` +
      `<label>Zoom <input type="range" min="1" max="2.5" step="0.05" value="${panel.zoom}" data-panel="${i}" data-field="zoom"></label>` +
      `<label>Shift X <input type="range" min="-120" max="120" step="1" value="${panel.shiftX}" data-panel="${i}" data-field="shiftX"></label>` +
      `<label>Shift Y <input type="range" min="-120" max="120" step="1" value="${panel.shiftY}" data-panel="${i}" data-field="shiftY"></label>` +
      `<label>Place <input type="text" value="${panel.place}" data-panel="${i}" data-field="place"></label>` +
      `<label>Time <input type="text" value="${panel.time}" data-panel="${i}" data-field="time"></label>` +
      `<label>Flavor <input type="text" value="${panel.flavor}" data-panel="${i}" data-field="flavor"></label>`;
    host.appendChild(card);
  });
  host.querySelectorAll("select[data-field=photo]").forEach((sel) => {
    sel.addEventListener("change", () => {
      state.panels[+sel.dataset.panel].photo = sel.value;
      redraw();
    });
  });
  host.querySelectorAll("input[type=range], input[type=text]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const panel = state.panels[+inp.dataset.panel];
      const field = inp.dataset.field;
      panel[field] = inp.type === "range" ? +inp.value : inp.value;
      redraw();
    });
  });
  host.querySelectorAll("input[type=file]").forEach((inp) => {
    inp.addEventListener("change", () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const key = "upload-" + inp.dataset.upload + "-" + file.name;
          images[key] = img;
          state.panels[+inp.dataset.upload].photo = key;
          redraw();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  });
}

function bindText(id, key) {
  $(id).addEventListener("input", () => {
    state[key] = $(id).value;
    redraw();
  });
}

function setLayoutButtons() {
  document.querySelectorAll("[data-layout]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.layout === state.layout);
    btn.addEventListener("click", () => {
      state.layout = btn.dataset.layout;
      setLayoutButtons();
      redraw();
    });
  });
}

function bindToolbar() {
  setLayoutButtons();
  $("nightToggle").addEventListener("click", () => {
    state.night = !state.night;
    $("nightToggle").textContent = state.night ? "NIGHT" : "DAY";
    $("nightToggle").classList.toggle("active", state.night);
    redraw();
  });
  $("wantedToggle").addEventListener("change", () => {
    state.wanted = $("wantedToggle").checked;
    redraw();
  });
  $("exportBtn").addEventListener("click", () => {
    const size = $("exportSize").value.split("x").map(Number);
    const out = exportCover(state, images, size[0], size[1]);
    out.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "neon-vice-cover-" + size[0] + "x" + size[1] + ".png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, "image/png");
  });
  bindText("titleInput", "title");
  bindText("scriptInput", "script");
  bindText("quoteInput", "quote");
  bindText("stationInput", "station");
  bindText("taglineInput", "tagline");
}

async function boot() {
  if (["story", "classic", "hero"].includes(params.get("layout") || "")) {
    state.layout = params.get("layout");
  }
  if (params.get("night") === "day") state.night = false;
  if (params.get("wanted") === "off") state.wanted = false;
  const jobs = PHOTOS.map((p) =>
    loadImage(p).then((img) => {
      images[p] = img;
    }),
  );
  jobs.push(
    loadImage("title.png").then((img) => {
      images["title.png"] = img;
    }),
  );
  await Promise.all(jobs);
  redraw();

  if (shot === "cover") {
    // Cover-only mode for screenshots: the app's own drawing, full-bleed.
    document.body.classList.add("shot-cover");
    const canvas = $("coverCanvas");
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.objectFit = "contain";
    document.title = "NEON VICE cover";
    return;
  }
  if (shot === "export") {
    const w = +(params.get("w") || 1080);
    const h = +(params.get("h") || 1080);
    const out = exportCover(state, images, w, h);
    document.body.classList.add("shot-cover");
    document.body.innerHTML = "";
    out.style.width = "100vw";
    out.style.height = "100vh";
    out.style.objectFit = "contain";
    document.body.appendChild(out);
    out.toBlob((blob) => {
      document.title = "export-ok " + w + "x" + h + " bytes=" + blob.size;
    }, "image/png");
    return;
  }
  buildPanelCards();
  bindToolbar();
  document.title = "NEON VICE Cover Studio";
}

boot().catch((err) => {
  document.title = "load-error";
  const el = $("loadError");
  if (el) el.textContent = "Could not load photos: " + err.message;
});
