// constants 
    
    // display names das categorias e caminhos das imagens
    // juntamos mais imagens ao juntar mais caminhos no array
// MUDAR MANUAL
    const GALLERY = {
      "With hands": {
        folder: "withhands",
        display: "With hands",
        images: [{ file: "1.jpeg" }],
      },
      "Zoomed in page": {
        folder: "zoomedinpage",
        display: "Zoomed in",
        images: [{ file: "1.jpeg" }],
      },
      "Close-up": {
        folder: "closeup",
        display: "Close-up",
        images: [{ file: "1.jpeg" }, { file: "2.jpeg" }, { file: "3.jpeg" }, { file: "4.jpeg" }, { file: "5.jpeg" }, { file: "6.jpeg" }],
      },
      "Simple Blank": {
        folder: "simpleblank",
        display: "Simple Blank",
        images: [{ file: "1.jpeg" }],
      },
    };
    
    // elements
    const canvas     = document.getElementById("myCanvas");
    const ctx        = canvas.getContext("2d");
    const canvasArea = document.getElementById("canvas-area");
    const FONT_LIST = [
      // Sans Serif
      {name:"Roboto", cat:"Sans Serif"}, {name:"Open Sans", cat:"Sans Serif"},
      {name:"Lato", cat:"Sans Serif"}, {name:"Montserrat", cat:"Sans Serif"},
      {name:"Poppins", cat:"Sans Serif"}, {name:"Source Sans Pro", cat:"Sans Serif"},
      {name:"Oswald", cat:"Sans Serif"}, {name:"Raleway", cat:"Sans Serif"},
      {name:"Nunito", cat:"Sans Serif"}, {name:"Work Sans", cat:"Sans Serif"},
      {name:"Inter", cat:"Sans Serif"}, {name:"Mulish", cat:"Sans Serif"},
      {name:"Rubik", cat:"Sans Serif"}, {name:"Karla", cat:"Sans Serif"},
      {name:"Barlow", cat:"Sans Serif"}, {name:"DM Sans", cat:"Sans Serif"},
      {name:"Manrope", cat:"Sans Serif"}, {name:"Quicksand", cat:"Sans Serif"},
      {name:"Heebo", cat:"Sans Serif"}, {name:"Josefin Sans", cat:"Sans Serif"},
      {name:"Bebas Neue", cat:"Sans Serif"}, {name:"Archivo", cat:"Sans Serif"},
      {name:"Hind", cat:"Sans Serif"}, {name:"PT Sans", cat:"Sans Serif"},
      // Serif
      {name:"Playfair Display", cat:"Serif"}, {name:"Merriweather", cat:"Serif"},
      {name:"Lora", cat:"Serif"}, {name:"PT Serif", cat:"Serif"},
      {name:"Noto Serif", cat:"Serif"}, {name:"Crimson Text", cat:"Serif"},
      {name:"Libre Baskerville", cat:"Serif"}, {name:"EB Garamond", cat:"Serif"},
      {name:"Cormorant Garamond", cat:"Serif"}, {name:"Source Serif Pro", cat:"Serif"},
      {name:"Bitter", cat:"Serif"}, {name:"Vollkorn", cat:"Serif"},
      {name:"Domine", cat:"Serif"}, {name:"Spectral", cat:"Serif"},
      {name:"Frank Ruhl Libre", cat:"Serif"}, {name:"Cardo", cat:"Serif"},
      {name:"Old Standard TT", cat:"Serif"},
    ];

    // favorites (guardados no browser, ficam entre visitas) ──────
    let favoriteFonts = [];
    try { favoriteFonts = JSON.parse(localStorage.getItem("bookpage-fav-fonts") || "[]"); }
    catch { favoriteFonts = []; }

    function saveFavorites() {
      localStorage.setItem("bookpage-fav-fonts", JSON.stringify(favoriteFonts));
    }

    function toggleFavorite(name) {
      const i = favoriteFonts.indexOf(name);
      if (i === -1) favoriteFonts.push(name); else favoriteFonts.splice(i, 1);
      saveFavorites();
    }

    // estados
    let textBoxes  = [];
    let selectedId = null;
    let addMode    = false;
    let editMode   = false;
    let editDiv    = null;
    let drag       = null;
    let nextId     = 1;
    let bgImage    = null;
    let snapEnabled = true;
    let darkMode = localStorage.getItem("bookpage-darkmode") === "true";
    if (darkMode) {
      document.body.classList.add("dark");
      document.addEventListener("DOMContentLoaded", () => {
        const icon = document.getElementById("theme-icon");
        if (icon) icon.textContent = "light_mode";
      });
    }

    const DEFAULTS = {
      fontSize:      20,
      lineHeight:    1.35,
      letterSpacing: 0,
      wordSpacing:   0,
      arch:          0,
      archPeak:      50,
      straightenArch: 50,
      rotation:      0,
      blur:          0,
    };

    function mkBox(x, y) {
      return {
        id:"b"+nextId++, x:x-75, y:y-45, width:150, height:90,
        text:"Your text here",
        fontFamily:"EB Garamond", fontSize:20, fontColor:"#0f0f0f",
        fontWeight:"normal", fontStyle:"normal", textAlign:"left",
        arch:0, archPeak:50, straightenArch:50, rotation:0, blur:0,
        manualWidth: false,
        letterSpacing:0, wordSpacing:0, lineHeight:1.35,
        justifyMinWords:3, justifyAuto:false, justifyHyphen:false,
      };
    }

    // ajudantes geometria

    function getXY(e) {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (canvas.width  / r.width),
        y: (e.clientY - r.top)  * (canvas.height / r.height),
      };
    }

    function localToWorld(lx, ly, box) {
      const θ = (box.rotation||0) * Math.PI/180;
      const cx = box.x + box.width/2, cy = box.y + box.height/2;
      return {
        x: cx + lx*Math.cos(θ) - ly*Math.sin(θ),
        y: cy + lx*Math.sin(θ) + ly*Math.cos(θ),
      };
    }

    function pointInBox(px, py, box) {
      const θ = (box.rotation||0) * Math.PI/180;
      const cx = box.x+box.width/2, cy = box.y+box.height/2;
      const dx = px-cx, dy = py-cy;
      const lx =  dx*Math.cos(θ) + dy*Math.sin(θ);
      const ly = -dx*Math.sin(θ) + dy*Math.cos(θ);
      return lx >= -box.width/2 && lx <= box.width/2 && ly >= -box.height/2 && ly <= box.height/2;
    }

    function rotHandlePos(box) {
      return localToWorld(0, -(box.height/2 + 22), box);
    }

    function applyResize(box, action, dx, dy) {
      const θ = (box.rotation||0) * Math.PI/180;
      const cos = Math.cos(θ), sin = Math.sin(θ);
      const w = box.width, h = box.height;
      const cx = box.x+w/2, cy = box.y+h/2;

      const dlx =  dx*cos + dy*sin;
      const dly = -dx*sin + dy*cos;

      const fl = { se:[-w/2,-h/2], sw:[w/2,-h/2], ne:[-w/2,h/2], nw:[w/2,h/2] }[action];

      const fx = cx + fl[0]*cos - fl[1]*sin;
      const fy = cy + fl[0]*sin + fl[1]*cos;

      let nw = w, nh = h;
      if (action==="se") { nw=Math.max(40,w+dlx); nh=Math.max(20,h+dly); }
      if (action==="sw") { nw=Math.max(40,w-dlx); nh=Math.max(20,h+dly); }
      if (action==="ne") { nw=Math.max(40,w+dlx); nh=Math.max(20,h-dly); }
      if (action==="nw") { nw=Math.max(40,w-dlx); nh=Math.max(20,h-dly); }

      const nfl = { se:[-nw/2,-nh/2], sw:[nw/2,-nh/2], ne:[-nw/2,nh/2], nw:[nw/2,nh/2] }[action];

      const ncx = fx - nfl[0]*cos + nfl[1]*sin;
      const ncy = fy - nfl[0]*sin - nfl[1]*cos;

      return { ...box, x:ncx-nw/2, y:ncy-nh/2, width:nw, height:nh };
    }

    // hit testing
    const CURSORS = { nw:"nwse-resize", se:"nwse-resize", ne:"nesw-resize", sw:"nesw-resize", move:"move", rotate:"grab" };

    function hitTest(x, y) {
      if (selectedId) {
        const s = textBoxes.find(b => b.id===selectedId);
        if (s) {
          const rh = rotHandlePos(s);
          if (Math.hypot(x-rh.x, y-rh.y) <= 11) return { id:selectedId, action:"rotate" };

          const corners = [
            { lx:-s.width/2, ly:-s.height/2, type:"nw" }, { lx:s.width/2, ly:-s.height/2, type:"ne" },
            { lx:-s.width/2, ly: s.height/2, type:"sw" }, { lx:s.width/2, ly: s.height/2, type:"se" },
          ];
          for (const c of corners) {
            const wp = localToWorld(c.lx, c.ly, s);
            if (Math.hypot(x-wp.x, y-wp.y) <= 11) return { id:selectedId, action:c.type };
          }

          if (pointInBox(x, y, s)) return { id:selectedId, action:"move" };
        }
      }
      for (let i=textBoxes.length-1; i>=0; i--) {
        if (pointInBox(x, y, textBoxes[i])) return { id:textBoxes[i].id, action:"move" };
      }
      return null;
    }

    // matemática do arch
    function mkPara(pt) {
      const p = Math.max(0.02, Math.min(0.98, pt));
      const spread = Math.PI * 0.85;

      return {
        f: t => Math.cos((t - p) * spread),
      };
    }


    // wrap das palavras
    function getLines(c, text, maxW, box) {
      const lines = [];
      const doHyphen = box && box.justifyHyphen && box.textAlign === "justify";

      text.split("\n").forEach(para => {
        if (!para) { lines.push(""); return; }
        const words = para.split(" ");
        let line = "";

        words.forEach(w => {
          const test = line ? line + " " + w : w;
          if (c.measureText(test).width > maxW && line) {
            // tentar hifen se não couber
            if (doHyphen) {
              const parts = hyphenate(w);
              if (parts.length === 2) {
                const withHyphen = line ? line + " " + parts[0] : parts[0];
                if (c.measureText(withHyphen).width <= maxW) {
                  lines.push(withHyphen);
                  line = parts[1];
                  return;
                }
              }
            }
            lines.push(line);
            line = w;
          } else {
            line = test;
          }
        });
        lines.push(line);
      });
      return lines;
    }


    // snapping
    const SNAP_THRESHOLD = 6;
    const SNAP_COLOR = "#4a9eff";

    function getSnapPoints(box) {
      return {
        left:    box.x,
        right:   box.x + box.width,
        centerX: box.x + box.width / 2,
        top:     box.y,
        bottom:  box.y + box.height,
        centerY: box.y + box.height / 2,
      };
    }

    function getSnap(movingBox, activeEdges) {
      const snapX = [];
      const snapY = [];
      const guides = [];

      textBoxes.forEach(other => {
        if (other.id === movingBox.id) return;
        const o = getSnapPoints(other);
        const m = getSnapPoints(movingBox);

        const xCandidates = [];
        if (activeEdges.left)    xCandidates.push({ moving: "left",    target: o.left,    delta: o.left    - m.left });
        if (activeEdges.left)    xCandidates.push({ moving: "left",    target: o.right,   delta: o.right   - m.left });
        if (activeEdges.left)    xCandidates.push({ moving: "left",    target: o.centerX, delta: o.centerX - m.left });
        if (activeEdges.right)   xCandidates.push({ moving: "right",   target: o.left,    delta: o.left    - m.right });
        if (activeEdges.right)   xCandidates.push({ moving: "right",   target: o.right,   delta: o.right   - m.right });
        if (activeEdges.right)   xCandidates.push({ moving: "right",   target: o.centerX, delta: o.centerX - m.right });
        if (activeEdges.centerX) xCandidates.push({ moving: "centerX", target: o.left,    delta: o.left    - m.centerX });
        if (activeEdges.centerX) xCandidates.push({ moving: "centerX", target: o.right,   delta: o.right   - m.centerX });
        if (activeEdges.centerX) xCandidates.push({ moving: "centerX", target: o.centerX, delta: o.centerX - m.centerX });

        xCandidates.forEach(c => {
          if (Math.abs(c.delta) <= SNAP_THRESHOLD) snapX.push(c);
        });

        const yCandidates = [];
        if (activeEdges.top)     yCandidates.push({ moving: "top",     target: o.top,     delta: o.top     - m.top });
        if (activeEdges.top)     yCandidates.push({ moving: "top",     target: o.bottom,  delta: o.bottom  - m.top });
        if (activeEdges.top)     yCandidates.push({ moving: "top",     target: o.centerY, delta: o.centerY - m.top });
        if (activeEdges.bottom)  yCandidates.push({ moving: "bottom",  target: o.top,     delta: o.top     - m.bottom });
        if (activeEdges.bottom)  yCandidates.push({ moving: "bottom",  target: o.right,   delta: o.bottom  - m.bottom });
        if (activeEdges.bottom)  yCandidates.push({ moving: "bottom",  target: o.centerY, delta: o.centerY - m.bottom });
        if (activeEdges.centerY) yCandidates.push({ moving: "centerY", target: o.top,     delta: o.top     - m.centerY });
        if (activeEdges.centerY) yCandidates.push({ moving: "centerY", target: o.bottom,  delta: o.bottom  - m.centerY });
        if (activeEdges.centerY) yCandidates.push({ moving: "centerY", target: o.centerY, delta: o.centerY - m.centerY });

        yCandidates.forEach(c => {
          if (Math.abs(c.delta) <= SNAP_THRESHOLD) snapY.push(c);
        });
      });

      // snap mais próximo de cada eixo
      let dx = 0, dy = 0;
      if (snapX.length) {
        const best = snapX.reduce((a, b) => Math.abs(a.delta) < Math.abs(b.delta) ? a : b);
        dx = best.delta;
        guides.push({ axis: "x", pos: best.target });
      }
      if (snapY.length) {
        const best = snapY.reduce((a, b) => Math.abs(a.delta) < Math.abs(b.delta) ? a : b);
        dy = best.delta;
        guides.push({ axis: "y", pos: best.target });
      }

      return { dx, dy, guides };
    }

    let activeGuides = [];

    function drawGuides() {
      if (!activeGuides.length) return;
      ctx.save();
      ctx.strokeStyle = SNAP_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      activeGuides.forEach(g => {
        ctx.beginPath();
        if (g.axis === "x") {
          ctx.moveTo(g.pos, 0);
          ctx.lineTo(g.pos, canvas.height);
        } else {
          ctx.moveTo(0, g.pos);
          ctx.lineTo(canvas.width, g.pos);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
    }

    function drawDistances(movingBox) {
      if (!drag || drag.action !== "move" && !["nw","ne","sw","se"].includes(drag.action)) return;

      const others = textBoxes.filter(b => b.id !== movingBox.id);
      if (!others.length) return;

      let nearest = null;
      let nearestDist = Infinity;

      others.forEach(other => {
        const gapX = Math.max(other.x - (movingBox.x + movingBox.width), movingBox.x - (other.x + other.width), 0);
        const gapY = Math.max(other.y - (movingBox.y + movingBox.height), movingBox.y - (other.y + other.height), 0);
        const dist = Math.sqrt(gapX * gapX + gapY * gapY);
        if (dist < nearestDist) { nearestDist = dist; nearest = other; }
      });

      if (!nearest || nearestDist > 300) return;

      ctx.save();
      ctx.strokeStyle = SNAP_COLOR;
      ctx.fillStyle = SNAP_COLOR;
      ctx.lineWidth = 1;
      ctx.font = "11px 'DM Mono', monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      // dist horizontal
      const mLeft = movingBox.x, mRight = movingBox.x + movingBox.width;
      const oLeft = nearest.x,   oRight = nearest.x + nearest.width;
      const mCY = movingBox.y + movingBox.height / 2;
      const oCY = nearest.y + nearest.height / 2;
      const midY = (mCY + oCY) / 2;

      if (oLeft > mRight) {
        // se caixa está à direita
        const dist = Math.round(oLeft - mRight);
        const x1 = mRight, x2 = oLeft;
        ctx.setLineDash([3, 2]);
        ctx.beginPath(); ctx.moveTo(x1, midY); ctx.lineTo(x2, midY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x1, midY - 4); ctx.lineTo(x1, midY + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, midY - 4); ctx.lineTo(x2, midY + 4); ctx.stroke();
        const label = String(dist);
        const lw = ctx.measureText(label).width + 6;
        ctx.fillStyle = SNAP_COLOR;
        ctx.fillRect((x1 + x2) / 2 - lw / 2, midY - 9, lw, 18);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, (x1 + x2) / 2, midY);
      } else if (mLeft > oRight) {
        // se está à esquerda
        const dist = Math.round(mLeft - oRight);
        const x1 = oRight, x2 = mLeft;
        ctx.setLineDash([3, 2]);
        ctx.beginPath(); ctx.moveTo(x1, midY); ctx.lineTo(x2, midY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x1, midY - 4); ctx.lineTo(x1, midY + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, midY - 4); ctx.lineTo(x2, midY + 4); ctx.stroke();
        const label = String(dist);
        const lw = ctx.measureText(label).width + 6;
        ctx.fillStyle = SNAP_COLOR;
        ctx.fillRect((x1 + x2) / 2 - lw / 2, midY - 9, lw, 18);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, (x1 + x2) / 2, midY);
      }

      // dist vertical
      const mTop = movingBox.y, mBottom = movingBox.y + movingBox.height;
      const oTop = nearest.y,   oBottom = nearest.y + nearest.height;
      const mCX = movingBox.x + movingBox.width / 2;
      const oCX = nearest.x + nearest.width / 2;
      const midX = (mCX + oCX) / 2;

      if (oTop > mBottom) {
        // a outra caixa está abaixo
        const dist = Math.round(oTop - mBottom);
        const y1 = mBottom, y2 = oTop;
        ctx.setLineDash([3, 2]);
        ctx.beginPath(); ctx.moveTo(midX, y1); ctx.lineTo(midX, y2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(midX - 4, y1); ctx.lineTo(midX + 4, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(midX - 4, y2); ctx.lineTo(midX + 4, y2); ctx.stroke();
        const label = String(dist);
        const lw = ctx.measureText(label).width + 6;
        ctx.fillStyle = SNAP_COLOR;
        ctx.fillRect(midX - lw / 2, (y1 + y2) / 2 - 9, lw, 18);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, midX, (y1 + y2) / 2);
      } else if (mTop > oBottom) {
        // está acima
        const dist = Math.round(mTop - oBottom);
        const y1 = oBottom, y2 = mTop;
        ctx.setLineDash([3, 2]);
        ctx.beginPath(); ctx.moveTo(midX, y1); ctx.lineTo(midX, y2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(midX - 4, y1); ctx.lineTo(midX + 4, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(midX - 4, y2); ctx.lineTo(midX + 4, y2); ctx.stroke();
        const label = String(dist);
        const lw = ctx.measureText(label).width + 6;
        ctx.fillStyle = SNAP_COLOR;
        ctx.fillRect(midX - lw / 2, (y1 + y2) / 2 - 9, lw, 18);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, midX, (y1 + y2) / 2);
      }

      ctx.restore();
    }

    // HYPHENATION
    // tamanho min. da palavra que se pode hifenizar, e onde meter o hifen
    function hyphenate(word) {
      if (word.length <= 7) return [word];
      const parts = [];
      // tentar meter o hifen entre 3 primeiras letras e 3 ultimas
      for (let i = 4; i <= word.length - 3; i++) {
        const before = word[i - 1];
        const after  = word[i];
        const isVowel = c => "aeiouAEIOU".includes(c);
        // partir entre vogal e consoante
        if ((isVowel(before) && !isVowel(after)) ||
            (!isVowel(before) && isVowel(after))) {
          parts.push(word.slice(0, i) + "-");
          parts.push(word.slice(i));
          return parts;
        }
      }
      // se não houver sítio, não hifenizar
      return [word];
    }

    function justifyLine(c, words, boxX, boxWidth, box) {
      const minWords   = box.justifyMinWords || 3;
      const autoImprove = box.justifyAuto;
      const doHyphen   = box.justifyHyphen;
      const baseSpaceW   = c.measureText(" ").width;
      const normalSpaceW = baseSpaceW + (autoImprove ? -1.5 : 0);
      const availW       = boxWidth - 12;

      // tentar hifenizar a ultima palavra se hyphenation estiver ligada
      let finalWords = [...words];
      let addedHyphen = false;

      const totalWordW = finalWords.reduce((s, w) => s + c.measureText(w).width, 0);
      const gaps = finalWords.length - 1;
      const extraSpace = availW - totalWordW;

      // alinhar à esquerda, se poucas palavras
      if (finalWords.length < minWords) {
        return { instructions: finalWords.map((w, i) => ({
          text: w,
          x: boxX + 6 + finalWords.slice(0, i).reduce((s, ww) => s + c.measureText(ww).width + normalSpaceW, 0),
          scaleX: 1,
        })), hyphenated: false };
      }

      if (gaps === 0) {
        return { instructions: [{ text: finalWords[0], x: boxX + 6, scaleX: 1 }], hyphenated: false };
      }

      let wordSpaceW = gaps > 0 ? extraSpace / gaps : 0;
      let letterAdj  = 0;
      let glyphScale = 1;
      let fallback   = false;

      if (autoImprove) {
        const minWS  = normalSpaceW * 0.70;
        const maxWS  = normalSpaceW * 1.00;
        const desWS  = normalSpaceW * 0.85;

        if (wordSpaceW + normalSpaceW < minWS || wordSpaceW + normalSpaceW > maxWS) {
          // tentar ajustar espaçamento de letra (0 a +2%)
          const maxLetterAdj = box.fontSize * 0.02;
          const neededPerGap = extraSpace / gaps;
          const neededTotal  = neededPerGap * gaps;
          const letterChars  = finalWords.join("").length;

          letterAdj = Math.min(maxLetterAdj, neededTotal / letterChars);

          // recalcular com letter spacing
          const newTotalW = finalWords.reduce((s, w) =>
            s + c.measureText(w).width + letterAdj * w.length, 0);
          const newExtra  = availW - newTotalW;
          wordSpaceW = gaps > 0 ? newExtra / gaps : 0;

          // glyph scaling (98% a 102%)
          if (wordSpaceW + normalSpaceW < minWS || wordSpaceW + normalSpaceW > maxWS) {
            glyphScale = Math.max(0.98, Math.min(1.02,
              availW / (newTotalW + normalSpaceW * gaps)));
            const scaledW = finalWords.reduce((s, w) =>
              s + c.measureText(w).width * glyphScale + letterAdj * w.length, 0);
            wordSpaceW = gaps > 0 ? (availW - scaledW) / gaps : 0;
          }

          // se palavras sobrepuserem, alinhar à esquerda
          if (wordSpaceW + normalSpaceW < 0) fallback = true;
        }
      }

      if (fallback) {
        return { instructions: finalWords.map((w, i) => ({
          text: w,
          x: boxX + 6 + finalWords.slice(0, i).reduce((s, ww) =>
            s + c.measureText(ww).width + normalSpaceW, 0),
          scaleX: 1,
        })), hyphenated: false };
      }

      const totalScaledW = finalWords.reduce((s, w) =>
        s + c.measureText(w).width * glyphScale + letterAdj * w.length, 0);
      const exactSpaceW = gaps > 0 ? (availW - totalScaledW) / gaps - normalSpaceW : 0;

      let cx = boxX + 6;
      const instructions = finalWords.map(w => {
        const inst = { text: w, x: cx, scaleX: glyphScale, letterAdj };
        cx += c.measureText(w).width * glyphScale + letterAdj * w.length + normalSpaceW + exactSpaceW;
        return inst;
      });

      return { instructions, hyphenated: addedHyphen };
    }

    // drawing
    function drawCanvas() {
      ctx.clearRect(0, 0, 820, 520);
      if (bgImage) {
        const area = document.getElementById("canvas-area");
        const maxW = area.clientWidth  - 32;
        const maxH = area.clientHeight - 32;
        const s    = Math.min(maxW / bgImage.width, maxH / bgImage.height, 1);
        canvas.width  = Math.round(bgImage.width  * s);
        canvas.height = Math.round(bgImage.height * s);
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle="#14120F"; ctx.fillRect(0,0,820,520);
        ctx.strokeStyle="rgba(255,255,255,.025)"; ctx.lineWidth=1;
        for (let x=0;x<820;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,520);ctx.stroke();}
        for (let y=0;y<520;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(820,y);ctx.stroke();}
        ctx.fillStyle="rgba(255,255,255,.18)"; ctx.font="12px 'DM Mono',monospace";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("Select a background image from the panel",410,260);
      }
      textBoxes.forEach(b => drawTBox(b, ctx, false));
      if (selectedId) { const s=textBoxes.find(b=>b.id===selectedId); if(s) drawHandles(s); }
      drawGuides();
      if (drag && selectedId) {
        const moving = textBoxes.find(b => b.id === selectedId);
        if (moving) drawDistances(moving);
      }
    }

    function drawTBox(box, c, forDownload) {
      box = { ...box };
      if (!forDownload && editMode && box.id === selectedId) return;
      if (!box.text) return;

      c.save();

      c.font = [
        box.fontStyle === "italic" ? "italic" : "",
        box.fontWeight === "bold"  ? "bold"   : "",
        box.fontSize + "px",
        '"' + box.fontFamily + '"',
      ].filter(Boolean).join(" ");
      c.fillStyle    = box.fontColor;
      c.textBaseline = "alphabetic";
      if (box.blur > 0) c.filter = `blur(${box.blur}px)`;
      c.letterSpacing = (box.letterSpacing || 0) + "px";
      c.wordSpacing   = (box.wordSpacing   || 0) + "px";

      const lh     = box.fontSize * (box.lineHeight || 1.35);
      const lines  = getLines(c, box.text, box.width - 12, box);
      const startY = box.y;

      if (box.arch === 0) {
        if (box.rotation) {
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          c.translate(cx, cy);
          c.rotate(box.rotation * Math.PI / 180);
          c.translate(-cx, -cy);
        }

        c.textAlign = box.textAlign === "justify" ? "left" : box.textAlign;
        const textX =
          box.textAlign === "right"  ? box.x + box.width - 6 :
          box.textAlign === "center" ? box.x + box.width / 2 :
          box.x + 6;

        lines.forEach((line, i) => {
          const isLastLine = i === lines.length - 1;
          const lineY = startY + (i + 0.5) * lh + box.fontSize * 0.32;

          if (box.textAlign === "justify" && !isLastLine) {
            const words = line.split(" ");
            const { instructions } = justifyLine(
              c, words, box.x, box.width, box
            );

            c.save();
            instructions.forEach(inst => {
              if (inst.scaleX !== 1) {
                c.save();
                c.translate(inst.x, lineY);
                c.scale(inst.scaleX, 1);
                if (inst.letterAdj) c.letterSpacing = inst.letterAdj + "px";
                c.fillText(inst.text, 0, 0);
                c.restore();
              } else {
                if (inst.letterAdj) c.letterSpacing = inst.letterAdj + "px";
                c.fillText(inst.text, inst.x, lineY);
              }
            });
            c.restore();
            c.letterSpacing = (box.letterSpacing || 0) + "px";
          } else {
            c.fillText(line, textX, lineY);
          }
        });

      } else {
        // caminho do arco
        if (box.rotation) {
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          c.translate(cx, cy);
          c.rotate(box.rotation * Math.PI / 180);
          c.translate(-cx, -cy);
        }

        lines.forEach((line, i) => {
          const lineY = startY + (i + 0.5) * lh + box.fontSize * 0.32;
          drawArchLine(c, line, box, lineY);
        });
      }

      c.restore();
    }

    function getEffectiveT(t, curvePos, archPeak) {
      const cp   = (curvePos === undefined ? 50 : curvePos)  / 100;
      const peak = (archPeak === undefined ? 50 : archPeak)  / 100;
      const zone = 0.08;

      if (t <= peak) {
        const leftActive = Math.min(1, cp * 2);
        const dist = peak - t;
        const zoneBlend = dist < zone
          ? 1 - (1 - leftActive) * (dist / zone) * (dist / zone) * (3 - 2 * dist / zone)
          : leftActive;
        const tEff = peak - (peak - t) * zoneBlend;
        return { tEff, scale: zoneBlend };
      } else {
        const rightActive = Math.min(1, (1 - cp) * 2);
        const dist = t - peak;
        const zoneBlend = dist < zone
          ? 1 - (1 - rightActive) * (dist / zone) * (dist / zone) * (3 - 2 * dist / zone)
          : rightActive;
        const tEff = peak + (t - peak) * zoneBlend;
        return { tEff, scale: zoneBlend };
      }
    }

    function drawArchLine(c, text, box, centerY) {
      if (!text) return;


      const archPad = Math.ceil(Math.abs(box.arch / 100) * box.fontSize * 2.5);
      const offW    = Math.ceil(box.width);
      const offH    = Math.ceil(box.fontSize * 2.5) + archPad;
      const off  = document.createElement("canvas");
      off.width  = offW;
      off.height = offH;
      const octx = off.getContext("2d");

      octx.font = c.font;
      octx.fillStyle    = box.fontColor;
      octx.textBaseline = "alphabetic";
      octx.textAlign    = box.textAlign === "justify" ? "left" : box.textAlign;
      octx.letterSpacing = (box.letterSpacing || 0) + "px";
      octx.wordSpacing   = (box.wordSpacing   || 0) + "px";
      if (box.blur > 0) octx.filter = `blur(${box.blur}px)`;

      const offBaselineY = Math.ceil(box.fontSize * 2.5) * 0.72; // where the text baseline sits in the offscreen canvas
      if (box.textAlign === "justify") {
        const words = text.split(" ");
        if (words.length >= 3) {
          const totalWordW = words.reduce((sum, w) => sum + octx.measureText(w).width, 0);
          const spaceW = (offW - 12 - totalWordW) / (words.length - 1);
          let wx = 6;
          words.forEach(w => {
            octx.fillText(w, wx, offBaselineY);
            wx += octx.measureText(w).width + spaceW;
          });
        } else {
          octx.fillText(text, 6, offBaselineY);
        }
      } else {
        const textX =
          box.textAlign === "right"  ? offW - 6 :
          box.textAlign === "center" ? offW / 2 :
          6;
        octx.fillText(text, textX, offBaselineY);
      }

      const ah = (box.arch / 100) * box.fontSize * 2.5;
      const { f } = mkPara(box.archPeak / 100);
      const fcenter = f(box.archPeak / 100);

      let maxDroop = 0;
      for (let i = 0; i <= 20; i++) maxDroop = Math.max(maxDroop, fcenter - f(i / 20));
      const normFactor = maxDroop > 0.001 ? 1 / maxDroop : 1;

      const metrics  = c.measureText(text);
      const textW    = metrics.width;

      const sliceW = 1;
      for (let px = 0; px < offW; px += sliceW) {
        const tNorm = Math.max(0, Math.min(1, px / offW));

        const { tEff } = getEffectiveT(tNorm, box.straightenArch, box.archPeak);
        const yo = box.arch !== 0 ? ah * (fcenter - f(tEff)) * normFactor : 0;

        const finalYo = yo;

      c.drawImage(
          off,
          px, 0, sliceW, offH,
          box.x + px,
          centerY - offBaselineY + finalYo,
          sliceW, offH
        );
      }

    }

    function drawHandles(box) {
      const {width:w,height:h}=box;

      const worldCorners=[
        localToWorld(-w/2,-h/2,box), // nw
        localToWorld( w/2,-h/2,box), // ne
        localToWorld( w/2, h/2,box), // se
        localToWorld(-w/2, h/2,box), // sw
      ];

      ctx.save();

      ctx.beginPath();
      ctx.moveTo(worldCorners[0].x,worldCorners[0].y);
      worldCorners.forEach(c=>ctx.lineTo(c.x,c.y));
      ctx.closePath();
      ctx.strokeStyle="rgba(160,155,148,.7)"; ctx.lineWidth=1; ctx.setLineDash([4,3]);
      ctx.stroke(); ctx.setLineDash([]);

      worldCorners.forEach(({x:hx,y:hy})=>{
        ctx.beginPath(); ctx.arc(hx,hy,6,0,Math.PI*2);
        ctx.fillStyle="#fff"; ctx.fill();
        ctx.strokeStyle="rgba(100,95,90,.8)"; ctx.lineWidth=1.5; ctx.stroke();
      });

      const topCenter=localToWorld(0,-h/2,box);
      const rh=rotHandlePos(box);

      ctx.beginPath(); ctx.moveTo(topCenter.x,topCenter.y); ctx.lineTo(rh.x,rh.y);
      ctx.strokeStyle="rgba(100,95,90,.4)"; ctx.lineWidth=1; ctx.stroke();

      ctx.beginPath(); ctx.arc(rh.x,rh.y,7,0,Math.PI*2);
      ctx.fillStyle="#fff"; ctx.fill();
      ctx.strokeStyle="rgba(100,95,90,.8)"; ctx.lineWidth=1.5; ctx.stroke();

      ctx.fillStyle="rgba(80,75,70,.85)"; ctx.font="10px system-ui";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("↻",rh.x,rh.y);

      ctx.restore();
    }

    document.fonts.ready.then(() => {
      drawCanvas();
    });

    // modo edit
    function enterEditMode(box) {
      if (editMode) exitEditMode();
      editMode=true;
      const cr=canvas.getBoundingClientRect(), ar=canvasArea.getBoundingClientRect();
      const sx=cr.width/canvas.width, sy=cr.height/canvas.height, sf=Math.min(sx,sy);

      editDiv=document.createElement("div");
      editDiv.contentEditable="true"; editDiv.spellcheck=false;

      Object.assign(editDiv.style, {
        position:   "absolute",
        left:       (cr.left - ar.left + box.x * sx) + "px",
        top:        (cr.top  - ar.top  + box.y * sy) + "px",
        width:      (box.width * sx) + "px",
        minHeight:  (box.height * sy) + "px",
        height:     (box.height * sy) + "px",
        fontFamily: '"' + box.fontFamily + '", sans-serif',
        fontSize:   (box.fontSize * sf) + "px",
        fontWeight: box.fontWeight,
        fontStyle:  box.fontStyle,
        color:      box.fontColor,
        textAlign:  box.textAlign,
        lineHeight:    String(box.lineHeight || 1.35),
        letterSpacing: (box.letterSpacing || 0) + "px",
        wordSpacing:   (box.wordSpacing   || 0) + "px",
        outline:    "none",
        background: "transparent",
        caretColor: box.fontColor,
        zIndex:     "20",
        whiteSpace: "pre-wrap",
        wordBreak:  "break-word",
        overflow:   "visible",
        cursor:     "text",
        padding:    `0 ${(box.width * sx - (box.width - 12) * sf) / 2}px`,
        transform:  `rotate(${box.rotation||0}deg)`,
        transformOrigin: `${box.width * sx / 2}px ${box.height * sy / 2}px`,
      });

      editDiv.innerHTML=box.text.split("\n").map(line=>{
        const safe=(line||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        return `<div>${safe||"<br>"}</div>`;
      }).join("");

      canvasArea.appendChild(editDiv);
      editDiv.focus();
      const range=document.createRange();
      range.selectNodeContents(editDiv); range.collapse(false);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(range);

      editDiv.addEventListener("input", () => {
        const t = extractEditText();
        textBoxes = textBoxes.map(b => b.id === selectedId ? {...b, text: t} : b);

        editDiv.style.height = "auto";
        const contentH = editDiv.scrollHeight;
        editDiv.style.height = contentH + "px";

        const cr = canvas.getBoundingClientRect();
        const sy = cr.height / canvas.height;
        const newH = contentH / sy;
        textBoxes = textBoxes.map(b => b.id === selectedId ? {...b, height: newH} : b);

        drawCanvas();
      });

      syncSidebar(); drawCanvas();
    }

    function exitEditMode() {
      if (!editDiv){ editMode=false; return; }
      const t=extractEditText();
      textBoxes=textBoxes.map(b=>b.id===selectedId?{...b,text:t}:b);
      editDiv.remove(); editDiv=null; editMode=false;

      if (selectedId) {
        const box = textBoxes.find(b => b.id === selectedId);
        if (box) {
          const tempCanvas = document.createElement("canvas");
          const tempCtx    = tempCanvas.getContext("2d");
          tempCtx.font = [
            box.fontStyle === "italic" ? "italic" : "",
            box.fontWeight === "bold"  ? "bold"   : "",
            box.fontSize + "px",
            '"' + box.fontFamily + '"',
          ].filter(Boolean).join(" ");
          tempCtx.letterSpacing = (box.letterSpacing || 0) + "px";
          tempCtx.wordSpacing   = (box.wordSpacing   || 0) + "px";

          const lh = box.fontSize * (box.lineHeight || 1.35);
          const lines = getLines(tempCtx, box.text, box.width - 12, box);
          const newHeight = lines.length * lh + box.fontSize * 0.4;

          textBoxes = textBoxes.map(b =>
            b.id === selectedId ? { ...b, height: newHeight } : b
          );
        }
      }

      syncSidebar(); drawCanvas();
    }

    function extractEditText() {
      if (!editDiv) return "";

      const lines = [];
      editDiv.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          lines.push(node.textContent);
        } else if (node.nodeName === "DIV" || node.nodeName === "P") {
          let line = "";
          node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
              line += child.textContent;
            } else if (child.nodeName === "BR") {
              if (child.nextSibling) line += "\n";
            } else {
              line += child.textContent || "";
            }
          });
          lines.push(line);
        } else if (node.nodeName === "BR") {
          lines.push("");
        } else {
          lines.push(node.textContent || "");
        }
      });

      const result = lines.join("\n").replace(/\n$/, "");


      if (!result.trim() && editDiv.innerText.trim()) {
        return editDiv.innerText.replace(/\n$/, "");
      }

      return result;
    }

    let lastDevicePixelRatio = window.devicePixelRatio;
    window.addEventListener("resize",()=>{
      if (bgImage) drawCanvas();

      if (window.devicePixelRatio !== lastDevicePixelRatio) {
        lastDevicePixelRatio = window.devicePixelRatio;
        if (editMode) exitEditMode();
        return;
      }

      if (!editMode||!editDiv||!selectedId) return;
      const box=textBoxes.find(b=>b.id===selectedId); if(!box) return;
      const cr=canvas.getBoundingClientRect(), ar=canvasArea.getBoundingClientRect();
      const sx=cr.width/canvas.width, sy=cr.height/canvas.height, sf=Math.min(sx,sy);
      editDiv.style.left     = (cr.left - ar.left + box.x * sx) + "px";
      editDiv.style.top      = (cr.top  - ar.top  + box.y * sy) + "px";
      editDiv.style.width    = (box.width * sx) + "px";
      editDiv.style.fontSize = (box.fontSize * sf) + "px";
      editDiv.style.padding  = `0 ${(box.width * sx - (box.width - 12) * sf) / 2}px`;
      editDiv.style.transform = `rotate(${box.rotation||0}deg)`;
      editDiv.style.transformOrigin = `${box.width*sx/2}px ${box.height*sy/2}px`;
    });

    // sidebar
    function syncSidebar() {
      const ctrls=document.getElementById("ctrls"), status=document.getElementById("status");
      const editHint=document.getElementById("edit-hint"), btnDel=document.getElementById("btn-delete");
      if (!selectedId){
        ctrls.classList.add("off"); status.style.display="block";
        editHint.style.display="none";
      const sidebarDel = document.getElementById("sidebar-btn-delete");
      if (sidebarDel) sidebarDel.classList.add("disabled");
      return;
      }
      const box=textBoxes.find(b=>b.id===selectedId); if(!box) return;
      ctrls.classList.remove("off"); status.style.display="none";
      const sidebarDelActive = document.getElementById("sidebar-btn-delete");
      if (sidebarDelActive) sidebarDelActive.classList.remove("disabled");
      editHint.style.display=editMode?"block":"none";
      const fontMeta = FONT_LIST.find(f => f.name === box.fontFamily);
      const btnLabel = document.getElementById("font-btn-label");
      if (btnLabel) {
        btnLabel.textContent = box.fontFamily;
        btnLabel.style.fontFamily = `"${box.fontFamily}", ${fontMeta?.cat === "Serif" ? "serif" : "sans-serif"}`;
      }
      document.getElementById("ctrl-color").value=box.fontColor;
      document.getElementById("ctrl-color-hex").value=box.fontColor;
      setSlider("ctrl-size",box.fontSize,"px");
      setSlider("ctrl-arch",box.arch,"");
      setSlider("ctrl-peak",box.archPeak,"");
      setSlider("ctrl-sa",box.straightenArch||50,"");
      setSlider("ctrl-rot", box.rotation||0,"°");
      setSlider("ctrl-ls",  box.letterSpacing||0, "px");
      setSlider("ctrl-ws",  box.wordSpacing||0,   "px");
      setSlider("ctrl-lh",  box.lineHeight||1.35, "");
      setSlider("ctrl-blur",box.blur,"px");
      document.querySelectorAll(`.tgb[data-key="fontWeight"]`).forEach(btn=>{
        btn.classList.toggle("on", box.fontWeight === "bold");
      });
      document.querySelectorAll(`.tgb[data-key="fontStyle"]`).forEach(btn=>{
        btn.classList.toggle("on", box.fontStyle === "italic");
      });
      document.querySelectorAll(`.tgb[data-key="textAlign"]`).forEach(btn=>{
        btn.classList.toggle("on", btn.dataset.val === box.textAlign);
      });
      const justifyOptions = document.getElementById("justify-options");
      if (justifyOptions) {
        justifyOptions.style.display = box.textAlign === "justify" ? "block" : "none";
      }
      const minWordsInput = document.getElementById("ctrl-justify-min-words");
      if (minWordsInput) minWordsInput.value = box.justifyMinWords || 3;
      const autoTrack = document.getElementById("justify-auto-track");
      if (autoTrack) autoTrack.classList.toggle("on", !!box.justifyAuto);
      const hyphenTrack = document.getElementById("justify-hyphen-track");
      if (hyphenTrack) hyphenTrack.classList.toggle("on", !!box.justifyHyphen);
    }

    function setSlider(id,val,unit){
      const r=document.getElementById(id+"-range"), s=document.getElementById(id+"-val");
      if(r) r.value=val;
      if(s) s.textContent=(Number.isInteger(val)?val:val.toFixed(1))+unit;
    }

    function updateBox(key, val) {
      textBoxes = textBoxes.map(b => b.id === selectedId ? {...b, [key]: val} : b);
      if (key === "fontFamily" || key === "fontWeight" || key === "fontStyle") {
        const box = textBoxes.find(b => b.id === selectedId);
        if (box) {
          const fontString = [
            box.fontStyle === "italic" ? "italic" : "",
            box.fontWeight === "bold" ? "bold" : "",
            box.fontSize + "px",
            '"' + box.fontFamily + '"',
          ].filter(Boolean).join(" ");
          document.fonts.load(fontString).then(() => drawCanvas());
        } else {
          drawCanvas();
        }
        return;
      }
      if (editMode&&editDiv){
        if(key==="fontFamily") editDiv.style.fontFamily='"'+val+'", sans-serif';
        if(key==="fontColor")  { editDiv.style.color=val; editDiv.style.caretColor=val; }
        if(key==="fontWeight") editDiv.style.fontWeight=val;
        if(key==="fontStyle")  editDiv.style.fontStyle=val;
        if(key==="textAlign")  editDiv.style.textAlign=val;
        if(key==="rotation")   editDiv.style.transform=`rotate(${val}deg)`;
        if(key==="letterSpacing") editDiv.style.letterSpacing = val + "px";
        if(key==="wordSpacing")   editDiv.style.wordSpacing   = val + "px";
        if(key==="lineHeight")    editDiv.style.lineHeight     = String(val);
        if(key==="fontSize"){
          const cr=canvas.getBoundingClientRect();
          editDiv.style.fontSize=(val*Math.min(cr.width/canvas.width,cr.height/canvas.height))+"px";
        }
      }
      drawCanvas();
    }

    // wire controls
    function wireControls(){
      wireFontPicker();
      document.getElementById("ctrl-color").addEventListener("input",e=>{
        document.getElementById("ctrl-color-hex").value=e.target.value;
        updateBox("fontColor",e.target.value);
      });
      document.getElementById("ctrl-color-hex").addEventListener("input",e=>{
        if(/^#[0-9a-fA-F]{6}$/.test(e.target.value)){
          document.getElementById("ctrl-color").value=e.target.value;
          updateBox("fontColor",e.target.value);
        }
      });
      wireSlider("ctrl-size","px",v=>updateBox("fontSize",Math.round(v)));
      wireSlider("ctrl-arch","",  v=>updateBox("arch",    Math.round(v)));
      wireSlider("ctrl-peak","",  v=>updateBox("archPeak",Math.round(v)));
      wireSlider("ctrl-sa","",  v=>updateBox("straightenArch",Math.round(v)));
      wireSlider("ctrl-rot", "°", v=>updateBox("rotation", v));
      document.getElementById("sidebar-btn-add").addEventListener("click", () => {
        document.getElementById("btn-add").click();
      });

      document.getElementById("sidebar-btn-delete").addEventListener("click", () => {
        document.getElementById("btn-delete").click();
      });
      document.getElementById("sidebar-btn-download").addEventListener("click", () => {
        document.getElementById("btn-download").click();
      });
      wireSlider("ctrl-ls", "px", v=>updateBox("letterSpacing", v));
      document.querySelectorAll(".reset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const key = btn.dataset.key;
          if (DEFAULTS[key] === undefined) return;
          updateBox(key, DEFAULTS[key]);
          syncSidebar();
        });
      });
      // opções Justify
      const minWordsInput = document.getElementById("ctrl-justify-min-words");
      minWordsInput.addEventListener("change", () => {
        const v = Math.max(1, Math.min(10, parseInt(minWordsInput.value) || 3));
        minWordsInput.value = v;
        updateBox("justifyMinWords", v);
      });

      document.getElementById("justify-auto-label").addEventListener("click", () => {
        const box = textBoxes.find(b => b.id === selectedId);
        if (!box) return;
        const newVal = !box.justifyAuto;
        updateBox("justifyAuto", newVal);
        document.getElementById("justify-auto-track").classList.toggle("on", newVal);
      });

      document.getElementById("justify-hyphen-label").addEventListener("click", () => {
        const box = textBoxes.find(b => b.id === selectedId);
        if (!box) return;
        const newVal = !box.justifyHyphen;
        updateBox("justifyHyphen", newVal);
        document.getElementById("justify-hyphen-track").classList.toggle("on", newVal);
      });
      wireSlider("ctrl-ws", "px", v=>updateBox("wordSpacing",   v));
      wireSlider("ctrl-lh", "",   v=>updateBox("lineHeight",    v));
      wireSlider("ctrl-blur","px",v=>updateBox("blur",v));
      document.querySelectorAll(".tgb").forEach(btn=>{
        btn.addEventListener("click",()=>{
          const key=btn.dataset.key, val=btn.dataset.val;
          if (key === "fontStyle") {
            const box = textBoxes.find(b => b.id === selectedId);
            const newVal = box && box.fontStyle === "italic" ? "normal" : "italic";
            updateBox("fontStyle", newVal);
            btn.classList.toggle("on", newVal === "italic");
          } else if (key === "fontWeight") {
            const box = textBoxes.find(b => b.id === selectedId);
            const newVal = box && box.fontWeight === "bold" ? "normal" : "bold";
            updateBox("fontWeight", newVal);
            btn.classList.toggle("on", newVal === "bold");
          } else {
            updateBox(key,val);
            document.querySelectorAll(`.tgb[data-key="${key}"]`).forEach(b=>b.classList.toggle("on",b.dataset.val===val));
            if (key === "textAlign") {
              const jo = document.getElementById("justify-options");
              if (jo) jo.style.display = val === "justify" ? "block" : "none";
            }
          }
        });
      });

      const tooltipTrigger = document.getElementById("arch-tooltip-trigger");
      const tooltip = document.getElementById("arch-tooltip");
      tooltipTrigger.addEventListener("mouseenter", () => tooltip.style.display = "block");
      tooltipTrigger.addEventListener("mouseleave", () => tooltip.style.display = "none");

    }

    function wireFontPicker() {
      const btn     = document.getElementById("font-btn");
      const panel   = document.getElementById("font-panel");
      const search  = document.getElementById("font-search");
      const listEl  = document.getElementById("font-list");

      function renderList(filter) {
        const q = (filter || "").trim().toLowerCase();
        const matches = FONT_LIST.filter(f => f.name.toLowerCase().includes(q));
        const favs = matches.filter(f => favoriteFonts.includes(f.name));
        const sans = matches.filter(f => f.cat === "Sans Serif");
        const serif = matches.filter(f => f.cat === "Serif");

        listEl.innerHTML = "";

        function addGroup(label, fonts) {
          if (!fonts.length) return;
          const h = document.createElement("div");
          h.className = "font-group-label";
          h.textContent = label;
          listEl.appendChild(h);
          fonts.forEach(f => listEl.appendChild(makeRow(f)));
        }

        function makeRow(f) {
          const row = document.createElement("div");
          row.className = "font-row";

          const star = document.createElement("span");
          star.className = "star" + (favoriteFonts.includes(f.name) ? " on" : "");
          star.textContent = favoriteFonts.includes(f.name) ? "★" : "☆";
          star.addEventListener("click", e => {
            e.stopPropagation();
            toggleFavorite(f.name);
            renderList(search.value);
          });

          const name = document.createElement("span");
          name.className = "font-row-name";
          name.textContent = f.name;
          name.style.fontFamily = `"${f.name}", ${f.cat === "Serif" ? "serif" : "sans-serif"}`;

          row.appendChild(star);
          row.appendChild(name);

          row.addEventListener("click", () => {
            updateBox("fontFamily", f.name);
            document.getElementById("font-btn-label").textContent = f.name;
            document.getElementById("font-btn-label").style.fontFamily = `"${f.name}", ${f.cat === "Serif" ? "serif" : "sans-serif"}`;
            panel.style.display = "none";
          });

          return row;
        }

        if (favs.length) addGroup("Favorites", favs);
        addGroup("Serif", serif);
        addGroup("Sans Serif", sans);

        if (!matches.length) {
          const empty = document.createElement("div");
          empty.style.cssText = "padding:14px;font-size:11px;color:var(--sub);text-align:center;";
          empty.textContent = "No fonts found";
          listEl.appendChild(empty);
        }
      }

      btn.addEventListener("click", () => {
        const open = panel.style.display === "block";
        panel.style.display = open ? "none" : "block";
        if (!open) { renderList(""); search.value = ""; search.focus(); }
      });

      search.addEventListener("input", () => renderList(search.value));

      document.addEventListener("click", e => {
        if (!e.target.closest("#font-panel") && e.target !== btn && !btn.contains(e.target)) {
          panel.style.display = "none";
        }
      });

      renderList("");
    }

    function wireSlider(id,unit,onChange){
      const range=document.getElementById(id+"-range"), span=document.getElementById(id+"-val");
      range.addEventListener("input",()=>{
        const v=parseFloat(range.value);
        span.textContent=(Number.isInteger(v)?v:v.toFixed(1))+unit;
        onChange(v);
      });
      span.addEventListener("click",()=>{
        const cur=parseFloat(range.value);
        const inp=document.createElement("input");
        inp.type="number"; inp.value=cur; inp.min=range.min; inp.max=range.max;
        inp.step=range.step||"1"; inp.className="sld-input";
        span.style.display="none"; span.parentNode.insertBefore(inp,span.nextSibling);
        inp.focus(); inp.select();
        function done(){
          const n=parseFloat(inp.value), v=isNaN(n)?cur:Math.max(+range.min,Math.min(+range.max,n));
          range.value=v; span.textContent=(Number.isInteger(v)?v:v.toFixed(1))+unit;
          span.style.display=""; inp.remove(); onChange(v);
        }
        inp.addEventListener("blur",done);
        inp.addEventListener("keydown",e=>{if(e.key==="Enter")inp.blur();if(e.key==="Escape"){span.style.display="";inp.remove();}});
      });
    }

    wireControls();

    // mouse events
    canvas.addEventListener("mousedown",e=>{
      e.preventDefault();
      const {x,y}=getXY(e);

      if (editMode){
        const sel=textBoxes.find(b=>b.id===selectedId);
        if (!sel||!pointInBox(x,y,sel)) exitEditMode();
        return;
      }

      if (addMode){
        const box=mkBox(x,y); textBoxes.push(box); selectedId=box.id;
        addMode = false;
        canvas.style.cursor = "default";
        const btnAdd = document.getElementById("btn-add");
        btnAdd.classList.remove("active"); btnAdd.textContent = "+ Text Box";
        document.getElementById("add-prompt").style.display = "none";
        document.fonts.load(`${box.fontSize}px "${box.fontFamily}"`).then(() => drawCanvas());
        syncSidebar(); return;
      }

      const hit=hitTest(x,y);
      if (hit){
        const prev=selectedId; selectedId=hit.id;
        const box=textBoxes.find(b=>b.id===hit.id);
        drag={
          action:hit.action, id:hit.id, sx:x, sy:y, orig:{...box},
          startAngle: hit.action==="rotate" ? Math.atan2(y-(box.y+box.height/2),x-(box.x+box.width/2)) : 0,
        };
        if(selectedId!==prev) syncSidebar();
        drawCanvas();
      } else {
        selectedId=null; drag=null; syncSidebar(); drawCanvas();
      }
    });

    canvas.addEventListener("dblclick",e=>{
      if(addMode||editMode) return;
      const {x,y}=getXY(e);
      for(let i=textBoxes.length-1;i>=0;i--){
        if(pointInBox(x,y,textBoxes[i])){ selectedId=textBoxes[i].id; enterEditMode(textBoxes[i]); return; }
      }
    });

    canvas.addEventListener("mousemove",e=>{
      const {x,y}=getXY(e);
      if(!drag){
        if(addMode){canvas.style.cursor="crosshair";return;}
        if(editMode){canvas.style.cursor="default";return;}
        const hit=hitTest(x,y);
        canvas.style.cursor=hit?(CURSORS[hit.action]||"default"):"default";
        return;
      }

      const {action,id,sx,sy,orig,startAngle}=drag;
      const dx=x-sx, dy=y-sy;

      if (action==="rotate"){
        const cx=orig.x+orig.width/2, cy=orig.y+orig.height/2;
        const currentAngle=Math.atan2(y-cy,x-cx);
        const delta=(currentAngle-startAngle)*180/Math.PI;
        const newRot=(orig.rotation||0)+delta;
        textBoxes=textBoxes.map(b=>b.id===id?{...b,rotation:newRot}:b);
        setSlider("ctrl-rot",Math.round(newRot),"°");
      } else if(action==="move"){
        let newBox = {...orig, x:orig.x+dx, y:orig.y+dy};

        if (snapEnabled && textBoxes.filter(b => b.id !== id).length > 0) {
          const activeEdges = { left:true, right:true, centerX:true, top:true, bottom:true, centerY:true };
          const snap = getSnap(newBox, activeEdges);
          newBox.x += snap.dx;
          newBox.y += snap.dy;
          activeGuides = snap.guides;
        } else {
          activeGuides = [];
        }

        textBoxes = textBoxes.map(b => b.id===id ? newBox : b);

      } else {
        const resized = {...applyResize(orig, action, dx, dy), manualWidth:true};

        if (snapEnabled && textBoxes.filter(b => b.id !== id).length > 0) {
          // só snap nos active edges
          const activeEdges = {
            left:    action === "sw" || action === "nw",
            right:   action === "se" || action === "ne",
            centerX: false,
            top:     action === "nw" || action === "ne",
            bottom:  action === "sw" || action === "se",
            centerY: false,
          };
          const snap = getSnap(resized, activeEdges);

          // aplicar snap
          let { x, y, width, height } = resized;
          if (snap.dx) {
            if (action === "sw" || action === "nw") { x += snap.dx; width -= snap.dx; }
            else { width += snap.dx; }
          }
          if (snap.dy) {
            if (action === "nw" || action === "ne") { y += snap.dy; height -= snap.dy; }
            else { height += snap.dy; }
          }

          activeGuides = snap.guides;
          textBoxes = textBoxes.map(b => b.id===id ? {...resized, x, y, width, height} : b);
        } else {
          activeGuides = [];
          textBoxes = textBoxes.map(b => b.id===id ? resized : b);
        }
      }
      drawCanvas();
    });

    canvas.addEventListener("mouseup", () => {
      activeGuides = [];
      if (drag && drag.action !== "move" && drag.action !== "rotate" && selectedId) {
        const box = textBoxes.find(b => b.id === selectedId);
        if (box) {
          const tempCanvas = document.createElement("canvas");
          const tempCtx    = tempCanvas.getContext("2d");
          tempCtx.font = [
            box.fontStyle === "italic" ? "italic" : "",
            box.fontWeight === "bold"  ? "bold"   : "",
            box.fontSize + "px",
            '"' + box.fontFamily + '"',
          ].filter(Boolean).join(" ");
          tempCtx.letterSpacing = (box.letterSpacing || 0) + "px";
          tempCtx.wordSpacing   = (box.wordSpacing   || 0) + "px";

          const lh       = box.fontSize * (box.lineHeight || 1.35);
          const lines    = getLines(tempCtx, box.text, box.width - 12, box);
          const newHeight = lines.length * lh + box.fontSize * 0.4;

          textBoxes = textBoxes.map(b =>
            b.id === selectedId ? { ...b, height: newHeight } : b
          );
          drawCanvas();
        }
      }
      drag = null;
    });
    canvas.addEventListener("mouseleave",()=>{drag=null;});

    document.addEventListener("mousedown",e=>{
      if(!editMode) return;
      if(e.target===canvas||editDiv?.contains(e.target)) return;
      exitEditMode();
      selectedId = null;
      syncSidebar();
      drawCanvas();
    },true);

    // keyboard
    document.addEventListener("keydown",e=>{
      if(e.key==="Escape"){
        if(editMode){exitEditMode();return;}
        const btnAdd=document.getElementById("btn-add");
        if(addMode){addMode=false;canvas.style.cursor="default";btnAdd.classList.remove("active");btnAdd.textContent="+ Text Box";document.getElementById("add-prompt").style.display="none";}
        selectedId=null;drag=null;syncSidebar();drawCanvas();return;
      }
      if((e.key==="Delete"||e.key==="Backspace")&&selectedId&&!editMode&&e.target.tagName!=="INPUT"&&e.target.tagName!=="TEXTAREA"){
        textBoxes=textBoxes.filter(b=>b.id!==selectedId);selectedId=null;syncSidebar();drawCanvas();
      }
    });

    // botões cabeçalho
    document.getElementById("btn-add").addEventListener("click",()=>{
      if(editMode) exitEditMode();
      addMode=!addMode;
      const btnAdd=document.getElementById("btn-add");
      if(addMode){
        canvas.style.cursor="crosshair";btnAdd.classList.add("active");btnAdd.textContent="✕ Cancel";
        document.getElementById("add-prompt").style.display="block";
        selectedId=null;syncSidebar();drawCanvas();
      } else {
        canvas.style.cursor="default";btnAdd.classList.remove("active");btnAdd.textContent="+ Text Box";
        document.getElementById("add-prompt").style.display="none";
      }
    });

    document.getElementById("btn-delete").addEventListener("click",()=>{
      if(editMode) exitEditMode();
      textBoxes=textBoxes.filter(b=>b.id!==selectedId);selectedId=null;syncSidebar();drawCanvas();
    });

    document.getElementById("btn-download").addEventListener("click",()=>{
      if(editMode){const t=extractEditText();textBoxes=textBoxes.map(b=>b.id===selectedId?{...b,text:t}:b);}

      const off=document.createElement("canvas");
      off.width  = bgImage ? bgImage.naturalWidth  : canvas.width;
      off.height = bgImage ? bgImage.naturalHeight : canvas.height;
      const octx=off.getContext("2d");
      if(bgImage){
        octx.drawImage(bgImage, 0, 0, off.width, off.height);
      } else {
        octx.fillStyle="#14120F";
        octx.fillRect(0, 0, off.width, off.height);
      }

      const scaleX = off.width  / canvas.width;
      const scaleY = off.height / canvas.height;
      const scaledBoxes = textBoxes.map(b => ({
        ...b,
        x:         b.x         * scaleX,
        y:         b.y         * scaleY,
        width:     b.width     * scaleX,
        height:    b.height    * scaleY,
        fontSize:  b.fontSize  * scaleX,
        blur:      b.blur      * scaleX,
        letterSpacing: b.letterSpacing * scaleX,
        wordSpacing:   b.wordSpacing   * scaleX,
      }));
      const origBoxes = textBoxes;
      textBoxes = scaledBoxes;
      scaledBoxes.forEach(b=>drawTBox(b,octx,true));
      textBoxes = origBoxes;
      try{
        const a=document.createElement("a");a.href=off.toDataURL("image/png");a.download="bookpics.png";a.click();
      } catch{alert("Download failed — cross-origin image restriction.");}
    });

    const snapTrack = document.getElementById("snap-track");
    document.getElementById("btn-snap").addEventListener("click", () => {
      snapEnabled = !snapEnabled;
      snapTrack.classList.toggle("on", snapEnabled);
    });

    document.getElementById("btn-theme").addEventListener("click",()=>{
      darkMode=!darkMode;
      document.body.classList.toggle("dark",darkMode);
      document.getElementById("theme-icon").textContent=darkMode?"light_mode":"dark_mode";
      localStorage.setItem("bookpage-darkmode", darkMode);
    });

    // GALERIA

    // detetar zoom no browser
    function checkZoom() {
      if (Math.round(window.devicePixelRatio * 100) !== 100) {
        const zoom = Math.round(window.devicePixelRatio * 100);
        document.getElementById("zoom-warning").style.display = "flex";
        document.getElementById("zoom-warning-text").textContent =
          `Browser zoom is at ${zoom}%. For best results, set zoom to 100% (Ctrl+0).`;
      } else {
        document.getElementById("zoom-warning").style.display = "none";
      }
    }
    window.addEventListener("resize", checkZoom);
    checkZoom();

    // escolher imagem
    let activeCat = Object.keys(GALLERY)[0];

    function loadImage(path, isDefault) {
      const full = new Image();
      if (path.startsWith("http")) full.crossOrigin = "anonymous";
      full.onload = () => {
        bgImage = full;
        if (!isDefault) {
          document.getElementById("img-picker").classList.remove("awaiting");
        }
        drawCanvas();
      };
      full.src = path;
    }

    function buildCatPills() {
      const pillsEl = document.getElementById("cat-pills");
      pillsEl.innerHTML = "";
      Object.keys(GALLERY).forEach(cat => {
        const pill = document.createElement("button");
        pill.className = "cat-pill" + (cat === activeCat ? " on" : "");
        pill.textContent = GALLERY[cat].display || cat;
        pill.addEventListener("click", () => {
          document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("on"));
          pill.classList.add("on");
          activeCat = cat;
          buildCatImages(cat);
          const { folder, images } = GALLERY[cat];
          loadImage(`images/${folder}/${images[0].file}`);
          setTimeout(() => {
            const first = document.querySelector("#cat-images img");
            if (first) {
              document.querySelectorAll("#cat-images img").forEach(i => i.classList.remove("on"));
              first.classList.add("on");
            }
          }, 50);
        });
        pillsEl.appendChild(pill);
      });
    }

    function buildCatImages(cat) {
      const container = document.getElementById("cat-images");
      container.innerHTML = "";
      const { folder, images } = GALLERY[cat];

      images.forEach((item, idx) => {
        const path = `images/${folder}/${item.file}`;

        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;";

        const img = document.createElement("img");
        img.src = path;
        img.alt = item.title || "";
        if (idx === 0) img.classList.add("on");

        const label = document.createElement("div");
        const autoTitle = item.file.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        label.textContent = item.title || autoTitle;
        label.style.cssText = "font-size:9px;color:var(--sub);font-family:'DM Mono',monospace;text-align:center;letter-spacing:.03em;line-height:1.3;";

        wrapper.addEventListener("click", () => {
          document.querySelectorAll("#cat-images img").forEach(i => i.classList.remove("on"));
          img.classList.add("on");
          loadImage(path);
        });

        wrapper.appendChild(img);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
      });
    }

    buildCatPills();
    buildCatImages(activeCat);
    //imagem inicial
    loadImage("images/landing.png", true);
    // começar a pulsar se não escolher imagem
    document.getElementById("img-picker").classList.add("awaiting");
    
// MUDAR MANUAL
    // upload
    document.getElementById("upload-input").addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        const img = new Image();
        img.onload = () => {
          document.querySelectorAll("#cat-images img").forEach(i => i.classList.remove("on"));
          bgImage = img;
          document.getElementById("img-picker").classList.remove("awaiting");
          drawCanvas();
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    });

    // leaderboard
    // Update mensal com os tippers.
    // name: nome real ou ficticio
    // handle: @ de redes sociais
    // amount: quanto doou
    // socialLink / socialLabel: socials
    // bookLink / bookLabel: link para site de projeto, e o nome do site
// MUDAR MANUAL
    const LEADERBOARD = [
      // juntar supporters assim:

      // featured desde 10/07:
     {
       name: "Your name here",
       handle: "Collage Artist",
       amount: "€10",
       socialLink: "https://instagram.com/martabaratatest2918974haeae",
       socialLabel: "instagram.com/yourname",
       bookLink: "https://aLinkToYourBookOrProject.com",
       bookLabel: "aLinkToYourBookOrProject.com",
     },
     
    ];

    function buildLeaderboard() {
      const el = document.getElementById("leaderboard");
      if (!LEADERBOARD.length) {
        el.innerHTML = `<div class="lb-empty">Be the first to appear here!</div>`;
        return;
      }

      const VISIBLE = 5;
      let expanded = false;

      function renderRows() {
        const visible = expanded ? LEADERBOARD : LEADERBOARD.slice(0, VISIBLE);
        el.innerHTML = visible.map((t, i) => `
          <div class="lb-row">
            <div class="lb-top">
              <span class="lb-rank">${i + 1}.</span>
              <span class="lb-name">${t.name}</span>
              ${t.handle ? `<span class="lb-handle">${t.handle}</span>` : ""}
              ${t.amount ? `<span class="lb-amount">${t.amount}</span>` : ""}
            </div>
            <div class="lb-links">
              ${t.socialLink ? `
                <a class="lb-link-row" href="${t.socialLink}" target="_blank">
                  <span class="material-symbols-outlined">person</span>
                  <span class="lb-link-label">${t.socialLabel || t.socialLink}</span>
                </a>` : ""}
              ${t.bookLink ? `
                <a class="lb-link-row" href="${t.bookLink}" target="_blank">
                  <span class="material-symbols-outlined">menu_book</span>
                  <span class="lb-link-label">${t.bookLabel || t.bookLink}</span>
                </a>` : ""}
            </div>
          </div>
        `).join("");

        if (LEADERBOARD.length > VISIBLE) {
          const toggle = document.createElement("div");
          toggle.style.cssText = "font-size:10px;color:var(--sub);font-family:'DM Mono',monospace;text-align:center;padding:8px 0;cursor:pointer;letter-spacing:.04em;";
          toggle.textContent = expanded ? "Show less ↑" : `Show ${LEADERBOARD.length - VISIBLE} more ↓`;
          toggle.addEventListener("click", () => { expanded = !expanded; renderRows(); });
          el.appendChild(toggle);
        }
      }

      renderRows();
    }

    fetch("https://api.hits.sh/hits/bookpics")
      .then(r => r.json())
      .then(data => {
        const el = document.getElementById("visitor-count");
        if (el && data.hits) {
          el.textContent = parseInt(data.hits).toLocaleString();
        }
      })
      .catch(() => {});

    buildLeaderboard();
