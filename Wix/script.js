// 1. INITIALIZE CANVAS
// Connects to <canvas id="canvas"></canvas> in your HTML
const canvas = new fabric.Canvas('canvas', {
    width: 1200,
    height: 600,
    backgroundColor: '#000000',
    selection: true,
    preserveObjectStacking: true
});

let activeView = 'desktop';
const viewWidths = {
    'desktop': 1200,
    'tablet': 768,
    'mobile': 375
};

// 2. THE LOGIC FIX & SAFE GUARD
// Fires every time you finish moving or resizing an object
canvas.on('object:modified', function(e) {
    const obj = e.target;

    // Ensure we have a responsiveData container, but DO NOT populate other breakpoints here
    if (!obj.responsiveData) {
        obj.responsiveData = {};
    }

    // Save the NEW position ONLY to the view you are currently looking at
    obj.responsiveData[activeView] = {
        left: obj.left,
        top: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY
    };

    console.log("Locked position for: " + activeView);
});

// 3. THE BREAKPOINT SWITCHER
// This runs when you click the Desktop, Tablet, or Mobile buttons
function setBreakpoint(view, element) {
    // 1. UI Update
    document.querySelectorAll('.bp-btn').forEach(btn => btn.classList.remove('active'));
    if (element) element.classList.add('active');

    // 2. The "Before Switch" Save
    // We MUST save where things are right now before we change the screen size
    canvas.getObjects().forEach(obj => {
        if (!obj.responsiveData) obj.responsiveData = {};
        obj.responsiveData[activeView] = {
            left: obj.left,
            top: obj.top,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY
        };
    });

    // ... later, when loading the view, fallback to scaled desktop if target view missing
    // This logic is implemented below in the After Switch load section.

    // 3. Switch the View
    activeView = view;
    const newWidth = viewWidths[view];
    canvas.setWidth(newWidth);
    
    // Resize the visual container
    const scrollArea = document.querySelector('.canvas-scroll');
    if (scrollArea) scrollArea.style.width = newWidth + 'px';

    // 4. The "After Switch" Load
    canvas.getObjects().forEach(obj => {
        // If we have saved data for this specific view, use it!
        if (obj.responsiveData && obj.responsiveData[view]) {
            obj.set({
                left: obj.responsiveData[view].left,
                top: obj.responsiveData[view].top,
                scaleX: obj.responsiveData[view].scaleX,
                scaleY: obj.responsiveData[view].scaleY
            });
        } 
        // If NO data exists for this view yet, keep it where it is but scale it
        else {
            console.log("No saved data for " + view + ", using current position.");
        }
        obj.setCoords(); 
    });

    canvas.renderAll();
}

// ===== BASIC UI & EDITOR FUNCTIONS =====
function spawn(type) {
  if (type === 'text') {
    const txt = new fabric.Textbox('Edit me', { left: 100, top: 100, fontSize: 28, fill: '#fff' });
    canvas.add(txt).setActiveObject(txt);
    txt.responsiveData = { desktop: { left: txt.left, top: txt.top, scaleX: txt.scaleX, scaleY: txt.scaleY }, tablet: { left: txt.left, top: txt.top, scaleX: txt.scaleX, scaleY: txt.scaleY }, mobile: { left: txt.left, top: txt.top, scaleX: txt.scaleX, scaleY: txt.scaleY } };
  } else if (type === 'img') {
    document.getElementById('image-upload').click();
  } else if (type === 'box') {
    const rect = new fabric.Rect({ left: 120, top: 120, width: 200, height: 120, fill: '#0078d4' });
    canvas.add(rect).setActiveObject(rect);
    rect.responsiveData = { desktop: { left: rect.left, top: rect.top, scaleX: rect.scaleX, scaleY: rect.scaleY }, tablet: { left: rect.left, top: rect.top, scaleX: rect.scaleX, scaleY: rect.scaleY }, mobile: { left: rect.left, top: rect.top, scaleX: rect.scaleX, scaleY: rect.scaleY } };
  }
}

function addContainer() {
  const rect = new fabric.Rect({ left: 140, top: 140, width: 400, height: 200, fill: 'transparent', stroke: '#777', strokeDashArray: [4,2], hasBorders: false });
  rect.isContainer = true;
  canvas.add(rect).setActiveObject(rect);
}

function handleImageUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    fabric.Image.fromURL(ev.target.result, function(img) {
      img.set({ left: 80, top: 80, scaleX: 0.5, scaleY: 0.5 });
      img.responsiveData = { desktop: { left: img.left, top: img.top, scaleX: img.scaleX, scaleY: img.scaleY }, tablet: { left: img.left, top: img.top, scaleX: img.scaleX, scaleY: img.scaleY }, mobile: { left: img.left, top: img.top, scaleX: img.scaleX, scaleY: img.scaleY } };
      canvas.add(img).setActiveObject(img);
    });
  };
  reader.readAsDataURL(file);
}

// Selection / Inspector
canvas.on('selection:created', updateInspector);
canvas.on('selection:updated', updateInspector);
canvas.on('selection:cleared', () => showInspectorEmpty());

function updateInspector(e) {
  const obj = canvas.getActiveObject();
  if (!obj) { showInspectorEmpty(); return; }
  document.getElementById('inspector-empty').style.display = 'none';
  document.getElementById('inspector-props').style.display = 'block';
  document.getElementById('in-x').value = Math.round(obj.left);
  document.getElementById('in-y').value = Math.round(obj.top);
  document.getElementById('in-w').value = Math.round(obj.width * (obj.scaleX || 1));
  document.getElementById('in-h').value = Math.round(obj.height * (obj.scaleY || 1));
  document.getElementById('in-fill').value = obj.fill || '#000000';
  document.getElementById('in-opacity').value = Math.round((obj.opacity || 1) * 100);
  document.getElementById('rotate-val').textContent = Math.round(obj.angle || 0) + '°';
}

function showInspectorEmpty() {
  document.getElementById('inspector-props').style.display = 'none';
  document.getElementById('inspector-empty').style.display = 'block';
}

function applyInspector() {
  const obj = canvas.getActiveObject(); if (!obj) return;
  obj.set({ left: parseFloat(document.getElementById('in-x').value || obj.left), top: parseFloat(document.getElementById('in-y').value || obj.top) });
  canvas.renderAll();
}

function applyFill(value) { const obj = canvas.getActiveObject(); if (!obj) return; obj.set('fill', value); canvas.renderAll(); }
function applyOpacity(v) { const obj = canvas.getActiveObject(); if (!obj) return; obj.set('opacity', v/100); document.getElementById('opacity-val').textContent = Math.round(v)+'%'; canvas.renderAll(); }
function updateRotation(v) { const obj = canvas.getActiveObject(); if (!obj) return; obj.set('angle', parseFloat(v)); document.getElementById('rotate-val').textContent = Math.round(v)+'°'; canvas.renderAll(); }

function playAnim() { alert('Preview animation (mock)'); }
function deleteElement() { const obj = canvas.getActiveObject(); if (!obj) return; canvas.remove(obj); showInspectorEmpty(); }

// Save / Load (localStorage)
function saveToCloud() {
  try {
    const json = canvas.toJSON(['responsiveData','isContainer']);
    localStorage.setItem('r66-studio-canvas', JSON.stringify(json));
    alert('Saved to localStorage (r66-studio-canvas)');
  } catch (err) { console.error(err); alert('Save failed'); }
}

function loadFromCloud() {
  try {
    const raw = localStorage.getItem('r66-studio-canvas');
    if (!raw) { alert('No saved canvas found'); return; }
    canvas.loadFromJSON(JSON.parse(raw), canvas.renderAll.bind(canvas));
    alert('Loaded from localStorage');
  } catch (err) { console.error(err); alert('Load failed'); }
}

function exportHTML() {
  const data = canvas.toDataURL({ format: 'png' });
  const html = `<!doctype html><meta charset="utf-8"><title>Export</title><img src="${data}" />`;
  const w = window.open('about:blank');
  w.document.write(html);
  w.document.close();
}

// Utility: canvas click to clear selection
function canvasClick(e) { if (e.target === canvas.upperCanvasEl) canvas.discardActiveObject().renderAll(); }

// Keyboard shortcuts
window.addEventListener('keydown', (ev) => { if (ev.key === 'Delete' || ev.key === 'Backspace') { deleteElement(); } if (ev.ctrlKey && ev.key === 's') { ev.preventDefault(); saveToCloud(); } });
