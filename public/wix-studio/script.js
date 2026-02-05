// Fabric-based editor logic (adapted for public deployment)
// Keep in sync with src version if you change features
// Updated: Now uses percentage-based positioning for responsive layouts
(function(){
  // Minimal safe load of fabric
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.2.4/fabric.min.js';
  script.onload = init;
  document.head.appendChild(script);

  function init(){
    // Design canvas dimensions (reference sizes)
    const DESIGN_CANVAS = {
      desktop: { width: 1200, height: 800 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    };

    const canvas = new fabric.Canvas('canvas', {
      width: DESIGN_CANVAS.desktop.width,
      height: DESIGN_CANVAS.desktop.height,
      backgroundColor: '#000000',
      selection: true,
      preserveObjectStacking: true
    });
    window.canvas = canvas; // expose for dev console
    let activeView = 'desktop';
    const viewWidths = { desktop: 1200, tablet: 768, mobile: 375 };

    // ─── Percentage-based Position Utilities ───

    /**
     * Convert pixel position to normalized percentages
     */
    function pixelsToPercent(obj, breakpoint = 'desktop') {
      const canvasW = DESIGN_CANVAS[breakpoint].width;
      const canvasH = DESIGN_CANVAS[breakpoint].height;
      const objW = (obj.width || 100) * (obj.scaleX || 1);
      const objH = (obj.height || 100) * (obj.scaleY || 1);

      return {
        xPercent: ((obj.left || 0) / canvasW) * 100,
        yPercent: ((obj.top || 0) / canvasH) * 100,
        widthPercent: (objW / canvasW) * 100,
        heightPercent: (objH / canvasH) * 100,
        zIndex: 10,
        rotation: obj.angle || 0
      };
    }

    /**
     * Convert percentages back to pixels for a specific canvas size
     */
    function percentToPixels(normalized, canvasW, canvasH) {
      return {
        left: (normalized.xPercent / 100) * canvasW,
        top: (normalized.yPercent / 100) * canvasH,
        scaleX: 1,
        scaleY: 1,
        // Store actual pixel dimensions for rendering
        _pxWidth: (normalized.widthPercent / 100) * canvasW,
        _pxHeight: (normalized.heightPercent / 100) * canvasH
      };
    }

    /**
     * Apply normalized position to a Fabric object
     */
    function applyNormalizedPosition(obj, normalized, breakpoint = 'desktop') {
      const canvasW = DESIGN_CANVAS[breakpoint].width;
      const canvasH = DESIGN_CANVAS[breakpoint].height;
      const pixels = percentToPixels(normalized, canvasW, canvasH);

      // Calculate scale to achieve desired size
      const targetW = pixels._pxWidth;
      const targetH = pixels._pxHeight;
      const baseW = obj.width || 100;
      const baseH = obj.height || 100;

      obj.set({
        left: pixels.left,
        top: pixels.top,
        scaleX: targetW / baseW,
        scaleY: targetH / baseH,
        angle: normalized.rotation || 0
      });
      obj.setCoords();
    }

    /**
     * Initialize normalized position data for a new object
     */
    function initNormalizedPosition(obj) {
      const normalized = pixelsToPercent(obj, 'desktop');
      obj.normalizedPosition = {
        desktop: normalized,
        tablet: { ...normalized },
        mobile: { ...normalized }
      };
      // Also store legacy format for backwards compatibility
      obj.responsiveData = {
        desktop: { left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY },
        tablet: { left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY },
        mobile: { left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY }
      };
    }

    function makeSvg(opts){ /* kept in original project; omitted for brevity in public build */ }

    // ─── Object Modified Handler (saves normalized position) ───
    canvas.on('object:modified', function(e){
      const obj = e.target;
      if (!obj) return;

      // Save as normalized percentage
      if (!obj.normalizedPosition) {
        obj.normalizedPosition = { desktop: null, tablet: null, mobile: null };
      }
      obj.normalizedPosition[activeView] = pixelsToPercent(obj, activeView);

      // Also save legacy format for backwards compatibility
      if (!obj.responsiveData) obj.responsiveData = {};
      obj.responsiveData[activeView] = { left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY };
    });

    // ─── Breakpoint Switching (uses normalized positions) ───
    window.setBreakpoint = function(view, el){
      document.querySelectorAll('.bp-btn').forEach(b=>b.classList.remove('active'));
      if(el) el.classList.add('active');

      // Save current view as normalized percentages
      canvas.getObjects().forEach(obj=>{
        if(!obj.normalizedPosition) {
          obj.normalizedPosition = { desktop: null, tablet: null, mobile: null };
        }
        obj.normalizedPosition[activeView] = pixelsToPercent(obj, activeView);

        // Also save legacy format
        if(!obj.responsiveData) obj.responsiveData = {};
        obj.responsiveData[activeView] = { left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY };
      });

      activeView = view;
      const newWidth = DESIGN_CANVAS[view].width;
      const newHeight = DESIGN_CANVAS[view].height;
      canvas.setWidth(newWidth);
      canvas.setHeight(newHeight);
      const scrollArea = document.querySelector('.canvas-scroll');
      if(scrollArea) {
        scrollArea.style.width = newWidth + 'px';
        scrollArea.style.minHeight = newHeight + 'px';
      }

      // Load target view using normalized positions
      canvas.getObjects().forEach(obj=>{
        // Prefer normalized position data
        if(obj.normalizedPosition && obj.normalizedPosition[view]){
          applyNormalizedPosition(obj, obj.normalizedPosition[view], view);
        }
        // Fall back to desktop normalized position (percentages stay consistent)
        else if(obj.normalizedPosition && obj.normalizedPosition.desktop){
          applyNormalizedPosition(obj, obj.normalizedPosition.desktop, view);
        }
        // Legacy fallback: scale pixels (less accurate)
        else if (obj.responsiveData && obj.responsiveData[view]){
          const r = obj.responsiveData[view];
          obj.set({ left: r.left, top: r.top, scaleX: r.scaleX, scaleY: r.scaleY });
          obj.setCoords();
        } else if (obj.responsiveData && obj.responsiveData.desktop){
          const base = obj.responsiveData.desktop;
          const ratio = viewWidths[view] / viewWidths.desktop;
          obj.set({ left: base.left * ratio, top: base.top * ratio, scaleX: base.scaleX * ratio, scaleY: base.scaleY * ratio });
          obj.setCoords();
        }
      });

      canvas.renderAll();

      // Update zoom indicator if present
      const zoomIndicator = document.getElementById('zoom-indicator');
      if(zoomIndicator) {
        const containerWidth = document.querySelector('.canvas-scroll')?.parentElement?.clientWidth || window.innerWidth;
        const scale = Math.min(1, containerWidth / newWidth);
        zoomIndicator.textContent = `${Math.round(scale * 100)}%`;
      }
    }

    // ─── Spawn Functions (with normalized positioning) ───
    window.spawn = function(type){
      if(type === 'text'){
        const txt = new fabric.Textbox('Edit me', {
          left: 100,
          top: 100,
          fontSize: 28,
          fill: '#fff',
          width: 200
        });
        canvas.add(txt).setActiveObject(txt);
        initNormalizedPosition(txt);
      } else if(type === 'img'){
        document.getElementById('image-upload').click();
      } else if(type === 'box'){
        const rect = new fabric.Rect({
          left: 120,
          top: 120,
          width: 200,
          height: 120,
          fill: '#0078d4'
        });
        canvas.add(rect).setActiveObject(rect);
        initNormalizedPosition(rect);
      }
    };

    window.addContainer = function(){
      const rect = new fabric.Rect({
        left: 140,
        top: 140,
        width: 400,
        height: 200,
        fill: 'transparent',
        stroke: '#777',
        strokeDashArray: [4, 2],
        hasBorders: false
      });
      rect.isContainer = true;
      canvas.add(rect).setActiveObject(rect);
      initNormalizedPosition(rect);
    };

    window.handleImageUpload = function(e){
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = function(ev){
        fabric.Image.fromURL(ev.target.result, function(img){
          img.set({ left: 80, top: 80, scaleX: 0.5, scaleY: 0.5 });
          canvas.add(img).setActiveObject(img);
          initNormalizedPosition(img);
        });
      };
      reader.readAsDataURL(file);
    };

    // --- Editor helpers: center, align and snap-to-grid + smart guides ---
    // Center the currently selected object in the canvas (horiz + vert)
    window.centerSelectedObject = function(){ const obj = canvas.getActiveObject(); if(!obj) return; const cx = canvas.getWidth() / 2; const cy = canvas.getHeight() / 2; // use center origin for predictability
      obj.set({ originX: 'center', originY: 'center', left: cx, top: cy }); obj.setCoords(); canvas.requestRenderAll(); };

    // Align left edge of objA to left edge of objB
    window.alignLeftToLeft = function(objA, objB){ if(!objA || !objB) return; const rectA = objA.getBoundingRect(true); const rectB = objB.getBoundingRect(true); const dx = rectB.left - rectA.left; objA.left = (objA.left || 0) + dx; objA.setCoords(); canvas.requestRenderAll(); };

    // Smart snap-to-grid with visual guides
    (function(){
      const GRID = 10; // 10px grid
      const TOLERANCE = 6; // px tolerance for smart guides
      let guideLines = [];

      function clearGuides(){ guideLines.forEach(l=>canvas.remove(l)); guideLines = []; }
      function drawVGuide(x){ const line = new fabric.Line([x, 0, x, canvas.getHeight()], { stroke: 'rgba(0,150,255,0.9)', selectable:false, evented:false, excludeFromExport:true }); guideLines.push(line); canvas.add(line); }
      function drawHGuide(y){ const line = new fabric.Line([0, y, canvas.getWidth(), y], { stroke: 'rgba(0,150,255,0.9)', selectable:false, evented:false, excludeFromExport:true }); guideLines.push(line); canvas.add(line); }

      // Utility to snap a value to grid
      function snapToGrid(val){ return Math.round(val / GRID) * GRID; }

      canvas.on('object:moving', function(e){ const obj = e.target; if(!obj) return; // allow Alt to bypass snapping
        const bypass = e.e && e.e.altKey; clearGuides();

        // First apply grid snap unless bypassed
        if(!bypass){ obj.left = snapToGrid(obj.left); obj.top = snapToGrid(obj.top); }

        const objRect = obj.getBoundingRect(true);
        const objects = canvas.getObjects().filter(o => o !== obj && o.visible !== false);

        // Canvas edges + center
        // Left edge
        if(Math.abs(objRect.left - 0) <= TOLERANCE){ obj.left += (0 - objRect.left); drawVGuide(0); }
        // Right edge
        const canvasRight = canvas.getWidth(); if(Math.abs((objRect.left + objRect.width) - canvasRight) <= TOLERANCE){ obj.left += (canvasRight - (objRect.left + objRect.width)); drawVGuide(canvasRight); }
        // Vertical center
        const canvasCenterX = canvas.getWidth() / 2; if(Math.abs((objRect.left + objRect.width/2) - canvasCenterX) <= TOLERANCE){ obj.left += (canvasCenterX - (objRect.left + objRect.width/2)); drawVGuide(canvasCenterX); }

        // Top edge
        if(Math.abs(objRect.top - 0) <= TOLERANCE){ obj.top += (0 - objRect.top); drawHGuide(0); }
        // Bottom edge
        const canvasBottom = canvas.getHeight(); if(Math.abs((objRect.top + objRect.height) - canvasBottom) <= TOLERANCE){ obj.top += (canvasBottom - (objRect.top + objRect.height)); drawHGuide(canvasBottom); }
        // Horizontal center
        const canvasCenterY = canvas.getHeight() / 2; if(Math.abs((objRect.top + objRect.height/2) - canvasCenterY) <= TOLERANCE){ obj.top += (canvasCenterY - (objRect.top + objRect.height/2)); drawHGuide(canvasCenterY); }

        // Align to other objects (left/right/center/top/bottom)
        objects.forEach(other => {
          const r = other.getBoundingRect(true);
          // left-to-left
          if(Math.abs(objRect.left - r.left) <= TOLERANCE){ obj.left += (r.left - objRect.left); drawVGuide(r.left); }
          // right-to-right
          if(Math.abs((objRect.left + objRect.width) - (r.left + r.width)) <= TOLERANCE){ obj.left += ((r.left + r.width) - (objRect.left + objRect.width)); drawVGuide(r.left + r.width); }
          // center-x to center-x
          if(Math.abs((objRect.left + objRect.width/2) - (r.left + r.width/2)) <= TOLERANCE){ obj.left += ((r.left + r.width/2) - (objRect.left + objRect.width/2)); drawVGuide(r.left + r.width/2); }

          // top-to-top
          if(Math.abs(objRect.top - r.top) <= TOLERANCE){ obj.top += (r.top - objRect.top); drawHGuide(r.top); }
          // bottom-to-bottom
          if(Math.abs((objRect.top + objRect.height) - (r.top + r.height)) <= TOLERANCE){ obj.top += ((r.top + r.height) - (objRect.top + objRect.height)); drawHGuide(r.top + r.height); }
          // center-y to center-y
          if(Math.abs((objRect.top + objRect.height/2) - (r.top + r.height/2)) <= TOLERANCE){ obj.top += ((r.top + r.height/2) - (objRect.top + objRect.height/2)); drawHGuide(r.top + r.height/2); }
        });

        obj.setCoords(); canvas.requestRenderAll();
      });

      // Clear guides when object is modified / mouse up / selection cleared
      canvas.on('object:modified', clearGuides);
      canvas.on('mouse:up', clearGuides);
      canvas.on('selection:cleared', clearGuides);
    })();

    // --- end helpers ---

    function updateInspector(){ const obj = canvas.getActiveObject(); if(!obj){ document.getElementById('inspector-empty').style.display='block'; document.getElementById('inspector-props').style.display='none'; return; } document.getElementById('inspector-empty').style.display='none'; document.getElementById('inspector-props').style.display='block'; document.getElementById('in-x').value = Math.round(obj.left); document.getElementById('in-y').value = Math.round(obj.top); document.getElementById('in-w').value = Math.round(obj.width * (obj.scaleX || 1)); document.getElementById('in-h').value = Math.round(obj.height * (obj.scaleY || 1)); document.getElementById('in-fill').value = obj.fill || '#000000'; document.getElementById('in-opacity').value = Math.round((obj.opacity || 1) * 100); document.getElementById('rotate-val').textContent = Math.round(obj.angle || 0) + '°'; }

    canvas.on('selection:created', updateInspector); canvas.on('selection:updated', updateInspector); canvas.on('selection:cleared', ()=>{ document.getElementById('inspector-props').style.display='none'; document.getElementById('inspector-empty').style.display='block'; });

    window.applyInspector = function(){ const obj = canvas.getActiveObject(); if(!obj) return; obj.set({ left: parseFloat(document.getElementById('in-x').value || obj.left), top: parseFloat(document.getElementById('in-y').value || obj.top) }); canvas.renderAll(); };
    window.applyFill = function(v){ const obj = canvas.getActiveObject(); if(!obj) return; obj.set('fill', v); canvas.renderAll(); };
    window.applyOpacity = function(v){ const obj = canvas.getActiveObject(); if(!obj) return; obj.set('opacity', v/100); document.getElementById('opacity-val').textContent = Math.round(v)+'%'; canvas.renderAll(); };
    window.updateRotation = function(v){ const obj = canvas.getActiveObject(); if(!obj) return; obj.set('angle', parseFloat(v)); document.getElementById('rotate-val').textContent = Math.round(v)+'°'; canvas.renderAll(); };
    window.playAnim = function(){ alert('Preview animation (mock)'); };
    window.deleteElement = function(){ const obj = canvas.getActiveObject(); if(!obj) return; canvas.remove(obj); document.getElementById('inspector-props').style.display='none'; document.getElementById('inspector-empty').style.display='block'; };

    // ─── Save/Load (with normalized position data) ───
    window.saveToCloud = function(){
      try {
        // Save current view positions before export
        canvas.getObjects().forEach(obj => {
          if(!obj.normalizedPosition) {
            obj.normalizedPosition = { desktop: null, tablet: null, mobile: null };
          }
          obj.normalizedPosition[activeView] = pixelsToPercent(obj, activeView);
        });

        // Export with both legacy and normalized data
        const json = canvas.toJSON(['responsiveData', 'normalizedPosition', 'isContainer']);
        localStorage.setItem('r66-studio-canvas', JSON.stringify(json));
        alert('Saved locally (with responsive percentages)');
      } catch(err) {
        console.error(err);
        alert('Save failed');
      }
    };

    window.loadFromCloud = function(){
      try {
        const raw = localStorage.getItem('r66-studio-canvas');
        if(!raw){
          alert('No saved canvas found');
          return;
        }
        canvas.loadFromJSON(JSON.parse(raw), function() {
          // After loading, apply normalized positions for current view
          canvas.getObjects().forEach(obj => {
            if(obj.normalizedPosition && obj.normalizedPosition[activeView]) {
              applyNormalizedPosition(obj, obj.normalizedPosition[activeView], activeView);
            } else if(obj.normalizedPosition && obj.normalizedPosition.desktop) {
              applyNormalizedPosition(obj, obj.normalizedPosition.desktop, activeView);
            }
          });
          canvas.renderAll();
          alert('Loaded');
        });
      } catch(err) {
        console.error(err);
        alert('Load failed');
      }
    };

    // Export normalized position data as JSON (for integration with React editor)
    window.exportNormalizedData = function() {
      const objects = canvas.getObjects().map((obj, index) => ({
        id: `fabric-obj-${index}`,
        type: obj.type,
        normalizedPosition: obj.normalizedPosition || {
          desktop: pixelsToPercent(obj, 'desktop')
        },
        // Include other relevant properties
        fill: obj.fill,
        text: obj.text || null,
        src: obj._element?.src || null
      }));
      return JSON.stringify(objects, null, 2);
    };

    window.exportHTML = function(){ const data = canvas.toDataURL({ format:'png' }); const html = `<!doctype html><meta charset="utf-8"><title>Export</title><img src="${data}" />`; const w = window.open('about:blank'); w.document.write(html); w.document.close(); };

    window.canvasClick = function(e){ if(e.target === canvas.upperCanvasEl) canvas.discardActiveObject().renderAll(); };
    window.addEventListener('keydown', (ev)=>{ if(ev.key==='Delete' || ev.key==='Backspace'){ window.deleteElement(); } if(ev.ctrlKey && ev.key==='s'){ ev.preventDefault(); window.saveToCloud(); } });
  }
})();