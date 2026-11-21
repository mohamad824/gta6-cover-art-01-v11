// NEON VICE cover renderer — draws the 1280x720 seven-panel story cover
// and exports it at the common post sizes. All geometry lives in a
// 1280x720 design space and is scaled to the output canvas.

export const COVER_W = 1280;
export const COVER_H = 720;
export const BORDER = 8;
export const GAP = 6;
export const STRIP_H = 48;

export const PHOTOS = [
  "photos/hero.jpg",
  "photos/portrait.jpg",
  "photos/car.jpg",
  "photos/crew.jpg",
  "photos/heli.jpg",
  "photos/bike.jpg",
  "photos/gas.jpg",
];

export const PANEL_NAMES = [
  "Hero — Neon Mile",
  "Portrait — Rooftop 9",
  "Car — Interstate 6",
  "Crew — Pier 26",
  "Heli — Tower 2",
  "Bike — Alley 7",
  "Gas — Route 27",
];

// Focus points keep faces and subjects centred when a photo is cropped.
export const PANEL_FOCUS = [
  { x: 0.5, y: 0.48 },
  { x: 0.5, y: 0.42 },
  { x: 0.52, y: 0.58 },
  { x: 0.5, y: 0.38 },
  { x: 0.55, y: 0.3 },
  { x: 0.35, y: 0.45 },
  { x: 0.58, y: 0.48 },
];

export function defaultPanels() {
  const meta = [
    { place: "NEON MILE", time: "11:42 PM", flavor: "FIRST DROP" },
    { place: "ROOFTOP 9", time: "1:15 AM", flavor: "LAST LIGHT" },
    { place: "INTERSTATE 6", time: "2:30 AM", flavor: "FULL THROTTLE" },
    { place: "PIER 26", time: "12:10 AM", flavor: "LOW TIDE" },
    { place: "TOWER 2", time: "11:15 PM", flavor: "SPOTLIGHT" },
    { place: "ALLEY 7", time: "1:04 AM", flavor: "NO TURNING BACK" },
    { place: "ROUTE 27", time: "3:47 AM", flavor: "LIGHTS OUT" },
  ];
  return PHOTOS.map((photo, i) => ({
    photo,
    zoom: 1,
    shiftX: 0,
    shiftY: 0,
    place: meta[i].place,
    time: meta[i].time,
    flavor: meta[i].flavor,
  }));
}

export function defaultState() {
  return {
    layout: "story",
    night: true,
    wanted: true,
    title: "NEON VICE",
    script: "Midnight Rain",
    quote: "THE CITY NEVER DRIES",
    station: "VICE FM 99.9",
    tagline: "THE CITY NEVER DRIES · COMING SOON",
    panels: defaultPanels(),
  };
}

// Panel rectangles in the 1280x720 design space, per layout.
export function layoutPanels(layout) {
  const b = BORDER;
  const g = GAP;
  const rightX = b + 642 + g;
  const rightW = COVER_W - b - rightX;
  const colH = 650;
  if (layout === "classic") {
    return [
      { x: b, y: b, w: 642, h: colH },
      { x: rightX, y: b, w: rightW, h: 322 },
      { x: rightX, y: b + 494, w: 304, h: 156 },
      { x: rightX, y: b + 328, w: rightW, h: 160 },
      { x: b, y: b, w: 1, h: 1 },
      { x: b, y: b, w: 1, h: 1 },
      { x: rightX + 310, y: b + 494, w: rightW - 310, h: 156 },
    ];
  }
  if (layout === "hero") {
    const bw = Math.floor((COVER_W - 2 * b - 3 * g) / 4);
    const top = [];
    for (let i = 0; i < 4; i++) {
      top.push({ x: b + i * (bw + g), y: b + 476, w: bw, h: 182 });
    }
    return [
      { x: b, y: b, w: COVER_W - 2 * b, h: 462 },
      top[0],
      top[1],
      top[2],
      { x: b, y: b, w: 1, h: 1 },
      { x: b, y: b, w: 1, h: 1 },
      top[3],
    ];
  }
  // story: 7-panel default
  return [
    { x: b, y: b, w: 642, h: colH },
    { x: rightX, y: b, w: 306, h: 242 },
    { x: rightX + 312, y: b, w: rightW - 312, h: 242 },
    { x: rightX, y: b + 248, w: rightW, h: 200 },
    { x: rightX, y: b + 454, w: 200, h: 196 },
    { x: rightX + 206, y: b + 454, w: 200, h: 196 },
    { x: rightX + 412, y: b + 454, w: rightW - 412, h: 196 },
  ];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPhotoInto(ctx, img, rect, panel, focus) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const zoom = panel.zoom || 1;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  let x = rect.x + rect.w / 2 - focus.x * dw + (panel.shiftX || 0);
  let y = rect.y + rect.h / 2 - focus.y * dh + (panel.shiftY || 0);
  x = Math.min(Math.max(x, rect.x + rect.w - dw), rect.x);
  y = Math.min(Math.max(y, rect.y + rect.h - dh), rect.y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  // Neon grade: lift exposure and push magenta/cyan saturation so the
  // night cover reads bright at thumbnail size.
  ctx.filter = "saturate(2.0) brightness(1.45) contrast(1.04)";
  ctx.drawImage(img, x, y, dw, dh);
  ctx.filter = "none";
  ctx.restore();
}

function drawChip(ctx, rect, panel, alignRight, placeTop) {
  const pad = 8;
  const w = Math.min(rect.w - 2 * pad, 300);
  const h = 40;
  const x = alignRight ? rect.x + rect.w - w - pad : rect.x + pad;
  // Hero chip goes top-left: the chrome title covers the hero bottom.
  const y = placeTop ? rect.y + pad : rect.y + rect.h - h - pad;
  ctx.save();
  ctx.fillStyle = "rgba(4, 8, 20, 0.82)";
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px Arial, Helvetica, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(panel.place + " · " + panel.time, x + 9, y + 13);
  ctx.fillStyle = "#ff5fd0";
  ctx.font = "bold 12px Arial, Helvetica, sans-serif";
  ctx.fillText(panel.flavor, x + 9, y + 29);
  ctx.restore();
}

function drawPill(ctx, x, y, text, bg, fg, font) {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, 26, 13);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 9, y + 14);
  ctx.restore();
  return w;
}

function drawStarburst(ctx, cx, cy, r, label) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i * Math.PI) / spikes;
    const rad = i % 2 === 0 ? r : r * 0.78;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#ffd23e";
  ctx.fill();
  ctx.strokeStyle = "#0a0e1e";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#0a0e1e";
  ctx.font = "bold 13px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = "#0a0e1e";
  let px = x;
  let seed = 11;
  while (px < x + w) {
    seed = (seed * 73 + 41) % 97;
    const bw = 1 + (seed % 4);
    if (seed % 3 !== 0) ctx.fillRect(px, y, bw, h);
    px += bw + 1 + (seed % 3);
  }
  ctx.restore();
}

function seededStreaks(ctx) {
  let seed = 20261121;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 130; i++) {
    const x = next() * COVER_W;
    const y = next() * COVER_H;
    const len = 10 + next() * 22;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y + len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScript(ctx, text, x, y) {
  ctx.save();
  ctx.font = "italic bold 40px Georgia, 'Times New Roman', serif";
  ctx.shadowColor = "#ff2dc8";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ff7ad9";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawCover(canvas, state, images) {
  const ctx = canvas.getContext("2d");
  canvas.width = COVER_W;
  canvas.height = COVER_H;
  const rects = layoutPanels(state.layout);
  ctx.clearRect(0, 0, COVER_W, COVER_H);
  ctx.fillStyle = state.night ? "#04060f" : "#1a0f2e";
  ctx.fillRect(0, 0, COVER_W, COVER_H);

  for (let i = 0; i < 7; i++) {
    const rect = rects[i];
    if (rect.w < 10 || rect.h < 10) continue;
    const panel = state.panels[i];
    const img = images[panel.photo] || images[PHOTOS[i]];
    if (img) drawPhotoInto(ctx, img, rect, panel, PANEL_FOCUS[i]);
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
    // Portrait chip sits bottom-right so the EST. 2026 starburst on the
    // hero seam never covers its text.
    drawChip(ctx, rect, panel, i === 1, i === 0);
  }

  // Neon light wash: magenta low-left, cyan high-right; warm dusk in DAY.
  const wash = ctx.createLinearGradient(0, COVER_H, COVER_W, 0);
  if (state.night) {
    wash.addColorStop(0, "rgba(255,45,200,0.14)");
    wash.addColorStop(0.5, "rgba(0,0,0,0)");
    wash.addColorStop(1, "rgba(0,210,255,0.12)");
  } else {
    wash.addColorStop(0, "rgba(255,120,40,0.20)");
    wash.addColorStop(0.55, "rgba(255,80,160,0.08)");
    wash.addColorStop(1, "rgba(255,190,90,0.16)");
  }
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, COVER_W, COVER_H);
  seededStreaks(ctx);

  // Pills and starburst (story layout only keeps all of them visible).
  if (state.layout === "story") {
    if (state.wanted) {
      drawPill(ctx, rects[4].x + 8, rects[4].y + 8, "WANTED ★★★★★", "#c8102e", "#ffffff", "bold 14px Arial, Helvetica, sans-serif");
    }
    drawPill(ctx, rects[2].x + rects[2].w - 92, rects[2].y + 8, "★★★★★", "rgba(4,8,20,0.85)", "#ffd23e", "bold 14px Arial, Helvetica, sans-serif");
    drawStarburst(ctx, rects[0].x + rects[0].w + 2, rects[1].y + rects[1].h + 4, 34, "EST. 2026");
    drawPill(ctx, rects[6].x + rects[6].w - 86, rects[6].y + 8, "VOL. 11", "rgba(4,8,20,0.85)", "#7df3ff", "bold 13px Arial, Helvetica, sans-serif");
  } else if (state.wanted) {
    // Other layouts: WANTED goes top-right of the hero so it never
    // covers the hero caption chip at top-left.
    drawPill(ctx, rects[0].x + rects[0].w - 178, rects[0].y + 10, "WANTED ★★★★★", "#c8102e", "#ffffff", "bold 14px Arial, Helvetica, sans-serif");
  }

  // Chrome title image + neon script, overlapping the hero bottom.
  // The default title is the PIL-rendered chrome PNG; an edited title
  // is drawn with the same chrome gradient, dark stroke and magenta glow.
  // Title width stays inside the hero panel so it never covers the
  // neighbouring panels' chips.
  const tw = state.layout === "hero" ? 820 : 640;
  const tx = 10;
  // Hero Focus has a shorter hero panel: keep the title inside it so it
  // never covers the bottom-row panels' chips.
  const ty = BORDER + (state.layout === "hero" ? 462 : 650) - 6;
  const titleImg = images["title.png"];
  if (state.title === "NEON VICE" && titleImg) {
    const th = (tw * titleImg.naturalHeight) / titleImg.naturalWidth;
    ctx.drawImage(titleImg, tx, ty - th, tw, th);
    drawScript(ctx, state.script, tx + tw - 300, ty + 2);
  } else {
    ctx.save();
    const grad = ctx.createLinearGradient(0, ty - 118, 0, ty);
    grad.addColorStop(0, "#f8fbfd");
    grad.addColorStop(0.45, "#d6e2ee");
    grad.addColorStop(1, "#2ebee8");
    ctx.font = "900 104px Arial, Helvetica, sans-serif";
    ctx.shadowColor = "#ff2dc8";
    ctx.shadowBlur = 20;
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#060a1a";
    ctx.strokeText(state.title.toUpperCase(), tx + 6, ty);
    ctx.shadowBlur = 0;
    ctx.fillStyle = grad;
    ctx.fillText(state.title.toUpperCase(), tx + 6, ty);
    ctx.restore();
    drawScript(ctx, state.script, tx + tw - 300, ty + 2);
  }

  // Bottom quote strip.
  const sy = COVER_H - BORDER - STRIP_H;
  ctx.fillStyle = "#070b18";
  ctx.fillRect(BORDER, sy, COVER_W - 2 * BORDER, STRIP_H);
  ctx.strokeStyle = "rgba(125,243,255,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(BORDER + 0.5, sy + 0.5, COVER_W - 2 * BORDER - 1, STRIP_H - 1);
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffd23e";
  ctx.font = "bold 19px Arial, Helvetica, sans-serif";
  ctx.fillText("★★★★★", BORDER + 14, sy + STRIP_H / 2 + 1);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 19px Arial, Helvetica, sans-serif";
  const quoteText = '"' + state.quote + '" — ' + state.station;
  ctx.fillText(quoteText, BORDER + 118, sy + STRIP_H / 2 + 1);
  ctx.fillStyle = "#9fb4d8";
  ctx.font = "13px Arial, Helvetica, sans-serif";
  const tagW = ctx.measureText(state.tagline).width;
  ctx.fillText(state.tagline, COVER_W - BORDER - 128 - tagW, sy + STRIP_H / 2 + 1);
  ctx.restore();
  drawBarcode(ctx, COVER_W - BORDER - 104, sy + 9, 88, 30);
  return canvas;
}

export function exportCover(state, images, outW, outH) {
  const cover = document.createElement("canvas");
  drawCover(cover, state, images);
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#04060f";
  ctx.fillRect(0, 0, outW, outH);
  const scale = Math.min(outW / COVER_W, outH / COVER_H);
  const dw = COVER_W * scale;
  const dh = COVER_H * scale;
  ctx.drawImage(cover, (outW - dw) / 2, (outH - dh) / 2, dw, dh);
  return out;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not load " + src));
    img.src = src;
  });
}
