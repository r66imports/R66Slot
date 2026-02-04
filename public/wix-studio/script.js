// Fabric-based editor logic (adapted for public deployment)
// Keep in sync with src version if you change features
(function(){
  // Minimal safe load of fabric
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.2.4/fabric.min.js';
  script.onload = init;
  document.head.appendChild(script);

  function init(){
    const canvas = new fabric.Canvas('canvas', { width:1200, height:600, backgroundColor:'#000000', selection:true, preserveObjectStacking:true });
    window.canvas = canvas; // expose for dev console
    let activeView = 'desktop';
    const viewWidths = { desktop:1200, tablet:768, mobile:375 };

    function makeSvg(opts){ /* kept in original project; omitted for brevity in public build */ }

    canvas.on('object:modified', function(e){
      const obj = e.target;
      if (!obj.responsiveData) obj.responsiveData = { desktop:{left:obj.left,top:obj.top,scaleX:obj.scaleX,scaleY:obj.scaleY}, tablet:{left:obj.left,top:obj.top,scaleX:obj.scaleX,scaleY:obj.scaleY}, mobile:{left:obj.left,top:obj.top,scaleX:obj.scaleX,scaleY:obj.scaleY} };
      obj.responsiveData[activeView] = { left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY };
    });

    window.setBreakpoint = function(view, el){ document.querySelectorAll('.bp-btn').forEach(b=>b.classList.remove('active')); if(el) el.classList.add('active'); canvas.getObjects().forEach(obj=>{ if(!obj.responsiveData){ obj.responsiveData = { desktop:{ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY }, tablet:{ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY }, mobile:{ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY } }; } else { obj.responsiveData[activeView] = { left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY }; } }); activeView = view; const newWidth = viewWidths[view]; canvas.setWidth(newWidth); const scrollArea = document.querySelector('.canvas-scroll'); if(scrollArea) scrollArea.style.width = newWidth + 'px'; canvas.getObjects().forEach(obj=>{ if(obj.responsiveData && obj.responsiveData[view]){ obj.set({ left: obj.responsiveData[view].left, top: obj.responsiveData[view].top, scaleX: obj.responsiveData[view].scaleX, scaleY: obj.responsiveData[view].scaleY }); } obj.setCoords(); }); canvas.renderAll(); }

    window.spawn = function(type){ if(type==='text'){ const txt = new fabric.Textbox('Edit me',{ left:100, top:100, fontSize:28, fill:'#fff' }); canvas.add(txt).setActiveObject(txt); txt.responsiveData = { desktop:{ left: txt.left, top: txt.top, scaleX: txt.scaleX, scaleY: txt.scaleY }, tablet:{ left: txt.left, top: txt.top, scaleX: txt.scaleX, scaleY: txt.scaleY }, mobile:{ left: txt.left, top: txt.top, scaleX: txt.scaleX, scaleY: txt.scaleY } }; } else if(type==='img'){ document.getElementById('image-upload').click(); } else if(type==='box'){ const rect = new fabric.Rect({ left:120, top:120, width:200, height:120, fill:'#0078d4' }); canvas.add(rect).setActiveObject(rect); rect.responsiveData = { desktop:{ left: rect.left, top: rect.top, scaleX: rect.scaleX, scaleY: rect.scaleY }, tablet:{ left: rect.left, top: rect.top, scaleX: rect.scaleX, scaleY: rect.scaleY }, mobile:{ left: rect.left, top: rect.top, scaleX: rect.scaleX, scaleY: rect.scaleY } }; } };

    window.addContainer = function(){ const rect = new fabric.Rect({ left:140, top:140, width:400, height:200, fill:'transparent', stroke:'#777', strokeDashArray:[4,2], hasBorders:false }); rect.isContainer = true; canvas.add(rect).setActiveObject(rect); rect.responsiveData = { desktop:{ left: rect.left, top: rect.top, scaleX: rect.scaleX, scaleY: rect.scaleY }, tablet:{ left: rect.left, top: rect.top, scaleX: rect.scaleX, scaleY: rect.scaleY }, mobile:{ left: rect.left, top: rect.top, scaleX: rect.scaleX, scaleY: rect.scaleY } }; };

    window.handleImageUpload = function(e){ const file = e.target.files && e.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(ev){ fabric.Image.fromURL(ev.target.result, function(img){ img.set({ left:80, top:80, scaleX:0.5, scaleY:0.5 }); img.responsiveData = { desktop:{ left: img.left, top: img.top, scaleX: img.scaleX, scaleY: img.scaleY }, tablet:{ left: img.left, top: img.top, scaleX: img.scaleX, scaleY: img.scaleY }, mobile:{ left: img.left, top: img.top, scaleX: img.scaleX, scaleY: img.scaleY } }; canvas.add(img).setActiveObject(img); }); }; reader.readAsDataURL(file); };

    function updateInspector(){ const obj = canvas.getActiveObject(); if(!obj){ document.getElementById('inspector-empty').style.display='block'; document.getElementById('inspector-props').style.display='none'; return; } document.getElementById('inspector-empty').style.display='none'; document.getElementById('inspector-props').style.display='block'; document.getElementById('in-x').value = Math.round(obj.left); document.getElementById('in-y').value = Math.round(obj.top); document.getElementById('in-w').value = Math.round(obj.width * (obj.scaleX || 1)); document.getElementById('in-h').value = Math.round(obj.height * (obj.scaleY || 1)); document.getElementById('in-fill').value = obj.fill || '#000000'; document.getElementById('in-opacity').value = Math.round((obj.opacity || 1) * 100); document.getElementById('rotate-val').textContent = Math.round(obj.angle || 0) + '°'; }

    canvas.on('selection:created', updateInspector); canvas.on('selection:updated', updateInspector); canvas.on('selection:cleared', ()=>{ document.getElementById('inspector-props').style.display='none'; document.getElementById('inspector-empty').style.display='block'; });

    window.applyInspector = function(){ const obj = canvas.getActiveObject(); if(!obj) return; obj.set({ left: parseFloat(document.getElementById('in-x').value || obj.left), top: parseFloat(document.getElementById('in-y').value || obj.top) }); canvas.renderAll(); };
    window.applyFill = function(v){ const obj = canvas.getActiveObject(); if(!obj) return; obj.set('fill', v); canvas.renderAll(); };
    window.applyOpacity = function(v){ const obj = canvas.getActiveObject(); if(!obj) return; obj.set('opacity', v/100); document.getElementById('opacity-val').textContent = Math.round(v)+'%'; canvas.renderAll(); };
    window.updateRotation = function(v){ const obj = canvas.getActiveObject(); if(!obj) return; obj.set('angle', parseFloat(v)); document.getElementById('rotate-val').textContent = Math.round(v)+'°'; canvas.renderAll(); };
    window.playAnim = function(){ alert('Preview animation (mock)'); };
    window.deleteElement = function(){ const obj = canvas.getActiveObject(); if(!obj) return; canvas.remove(obj); document.getElementById('inspector-props').style.display='none'; document.getElementById('inspector-empty').style.display='block'; };

    window.saveToCloud = function(){ try{ const json = canvas.toJSON(['responsiveData','isContainer']); localStorage.setItem('r66-studio-canvas', JSON.stringify(json)); alert('Saved locally'); } catch(err){ console.error(err); alert('Save failed'); } };
    window.loadFromCloud = function(){ try{ const raw = localStorage.getItem('r66-studio-canvas'); if(!raw){ alert('No saved canvas found'); return; } canvas.loadFromJSON(JSON.parse(raw), canvas.renderAll.bind(canvas)); alert('Loaded'); } catch(err){ console.error(err); alert('Load failed'); } };

    window.exportHTML = function(){ const data = canvas.toDataURL({ format:'png' }); const html = `<!doctype html><meta charset="utf-8"><title>Export</title><img src="${data}" />`; const w = window.open('about:blank'); w.document.write(html); w.document.close(); };

    window.canvasClick = function(e){ if(e.target === canvas.upperCanvasEl) canvas.discardActiveObject().renderAll(); };
    window.addEventListener('keydown', (ev)=>{ if(ev.key==='Delete' || ev.key==='Backspace'){ window.deleteElement(); } if(ev.ctrlKey && ev.key==='s'){ ev.preventDefault(); window.saveToCloud(); } });
  }
})();