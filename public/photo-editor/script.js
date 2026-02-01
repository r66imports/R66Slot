let canvas;
let isDrawing = false;

window.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('editor-canvas');

    // Initialize Fabric canvas
    canvas = new fabric.Canvas(el, {
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
        selection: true
    });
    canvas.setWidth(900);
    canvas.setHeight(600);

    // Drawing defaults
    canvas.isDrawingMode = false;
    canvas.freeDrawingBrush.width = 8;
    canvas.freeDrawingBrush.color = '#000000';

    // Upload input
    const upload = document.getElementById('upload-img');
    if (upload) upload.addEventListener('change', handleUpload);

    // Keyboard delete
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') deleteObject();
    });

    // Keep objects selectable/correct cursor
    canvas.on('object:selected', () => (document.body.style.cursor = 'default'));
    canvas.on('selection:cleared', () => (document.body.style.cursor = 'default'));
});

// Upload image handler
function handleUpload(e) {
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
            // Constrain size
            const maxW = 800, maxH = 500;
            const scale = Math.min(maxW / img.width, maxH / img.height, 1);
            img.scale(scale);
            canvas.add(img);
            canvas.centerObject(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
        }, { crossOrigin: 'anonymous' });
    };
    reader.readAsDataURL(file);
}

// Add editable text
function addText() {
    const itext = new fabric.IText('Tap to Edit', {
        left: 100,
        top: 100,
        fill: '#000000',
        fontSize: 28,
        editable: true
    });
    canvas.add(itext).setActiveObject(itext);
    canvas.requestRenderAll();
}

// Toggle drawing mode
function toggleDraw() {
    isDrawing = !isDrawing;
    canvas.isDrawingMode = isDrawing;
    const btn = document.getElementById('draw-btn');
    if (btn) btn.style.color = isDrawing ? '#0078d4' : 'white';
}

// Change brush color (optional helper)
function setBrushColor(color) {
    canvas.freeDrawingBrush.color = color;
}

// Change brush width (optional helper)
function setBrushWidth(width) {
    canvas.freeDrawingBrush.width = width;
}

// Export canvas as PNG
function downloadImage() {
    // Ensure white background in export
    const origBg = canvas.backgroundColor;
    canvas.backgroundColor = '#ffffff';
    canvas.requestRenderAll();
    const data = canvas.toDataURL({ format: 'png', quality: 1 });
    canvas.backgroundColor = origBg;
    const link = document.createElement('a');
    link.download = 'r66-photo.png';
    link.href = data;
    link.click();
}

// Delete selected object(s)
function deleteObject() {
    const active = canvas.getActiveObject();
    if (!active) return;
    if (active.type === 'activeSelection') {
        active.forEachObject((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
    } else {
        canvas.remove(active);
    }
    canvas.requestRenderAll();
}

// Expose functions for inline handlers if used in HTML
window.addText = addText;
window.toggleDraw = toggleDraw;
window.downloadImage = downloadImage;
window.deleteObject = deleteObject;
window.setBrushColor = setBrushColor;
window.setBrushWidth = setBrushWidth;