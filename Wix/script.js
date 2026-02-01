// ============================================================
//  Wix Studio Editor — script.js
//  Container Box feature with clip + containment logic
// ============================================================

let selectedEl = null;
let history = [];
let highestZ = 10;
let containers = []; // Track all container elements
let pendingContainer = null; // Container waiting for an image upload

const canvas = document.getElementById('canvas-area');
const snapSize = 20;

// ---- SPAWN GENERIC ELEMENTS ----

function spawn(type) {
    const el = document.createElement('div');
    el.className = 'resizable-box';
    el.dataset.type = type;
    el.style.left = '100px';
    el.style.top = '100px';
    el.style.width = '200px';
    el.style.height = '200px';
    el.style.zIndex = ++highestZ;

    if (type === 'text') {
        el.innerHTML = '<div class="text-element" spellcheck="false">Edit me</div>';
        el.style.height = 'auto';
        el.ondblclick = () => {
            const inner = el.querySelector('.text-element');
            inner.contentEditable = true;
            inner.focus();
        };
    } else if (type === 'img') {
        // Open file picker — image will be placed freely on canvas
        pendingContainer = null;
        document.getElementById('image-upload').click();
        return; // Element created in handleImageUpload
    } else {
        el.style.backgroundColor = 'var(--accent)';
    }

    addHandle(el);
    bindEvents(el);
    canvas.appendChild(el);
    updateLayers();
    saveHistory('Add ' + type);
}

// ---- CONTAINER BOX ----

function addContainer() {
    const el = document.createElement('div');
    el.className = 'resizable-box container-box';
    el.dataset.type = 'container';
    el.dataset.containerId = 'c-' + Date.now();
    el.style.left = '80px';
    el.style.top = '80px';
    el.style.width = '400px';
    el.style.height = '300px';
    el.style.zIndex = ++highestZ;

    // Label above the container
    const label = document.createElement('div');
    label.className = 'container-label';
    label.textContent = 'Container';
    el.appendChild(label);

    addHandle(el);
    bindEvents(el);
    canvas.appendChild(el);
    containers.push(el);
    updateLayers();
    saveHistory('Add container');
}

// ---- IMAGE UPLOAD HANDLER ----
// When triggered from the toolbar "Image" button, places image freely.
// When triggered from double-clicking a container, places image inside that container.

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const dataUrl = e.target.result;
        const targetContainer = pendingContainer;
        pendingContainer = null;

        if (targetContainer) {
            // Place image INSIDE the container as a child
            addImageToContainer(targetContainer, dataUrl);
        } else {
            // Find if there's a container on the canvas — auto-assign to first one
            const firstContainer = containers.find(c => c.isConnected);
            if (firstContainer) {
                addImageToContainer(firstContainer, dataUrl);
            } else {
                // No container — place freely on canvas
                addFreeImage(dataUrl);
            }
        }
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset input
}

function addFreeImage(dataUrl) {
    const el = document.createElement('div');
    el.className = 'resizable-box';
    el.dataset.type = 'img';
    el.style.left = '100px';
    el.style.top = '100px';
    el.style.width = '300px';
    el.style.height = '200px';
    el.style.zIndex = ++highestZ;
    el.style.backgroundImage = 'url(' + dataUrl + ')';

    addHandle(el);
    bindEvents(el);
    canvas.appendChild(el);
    updateLayers();
    saveHistory('Add image');
}

function addImageToContainer(container, dataUrl) {
    const img = document.createElement('div');
    img.className = 'container-child';
    img.dataset.type = 'container-image';
    img.style.left = '0px';
    img.style.top = '0px';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.backgroundImage = 'url(' + dataUrl + ')';

    const handle = document.createElement('div');
    handle.className = 'handle se';
    img.appendChild(handle);

    // Bind drag with containment
    bindContainerChild(img, container);
    container.appendChild(img);
    updateLayers();
    saveHistory('Add image to container');
}

// ---- CONTAINMENT DRAG LOGIC ----
// Children inside a container are bounded so they cannot leave the container rect.

function bindContainerChild(child, container) {
    child.onmousedown = function (e) {
        e.stopPropagation(); // Don't trigger container's select

        // Deselect previous
        if (selectedEl) selectedEl.classList.remove('selected');
        selectedEl = child;
        child.classList.add('selected');

        showInspectorFor(child);

        const isResizing = e.target.classList.contains('handle');
        const startX = e.clientX;
        const startY = e.clientY;
        const startL = child.offsetLeft;
        const startT = child.offsetTop;
        const startW = child.offsetWidth;
        const startH = child.offsetHeight;
        const contW = container.clientWidth;
        const contH = container.clientHeight;

        const move = function (m) {
            if (isResizing) {
                // Resize but clamp to container bounds
                let newW = startW + (m.clientX - startX);
                let newH = startH + (m.clientY - startY);
                newW = Math.min(newW, contW - child.offsetLeft);
                newH = Math.min(newH, contH - child.offsetTop);
                newW = Math.max(newW, 40);
                newH = Math.max(newH, 40);
                child.style.width = Math.round(newW / snapSize) * snapSize + 'px';
                child.style.height = Math.round(newH / snapSize) * snapSize + 'px';
            } else {
                // Move but clamp within container
                let newL = startL + (m.clientX - startX);
                let newT = startT + (m.clientY - startY);

                // Snap
                newL = Math.round(newL / snapSize) * snapSize;
                newT = Math.round(newT / snapSize) * snapSize;

                // Containment bounds
                newL = Math.max(0, Math.min(newL, contW - child.offsetWidth));
                newT = Math.max(0, Math.min(newT, contH - child.offsetHeight));

                child.style.left = newL + 'px';
                child.style.top = newT + 'px';
            }
            syncInspector();
        };

        const up = function () {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            saveHistory('Move child');
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };
}

// ---- DOUBLE-CLICK CONTAINER → upload image into it ----

function setupContainerDblClick(el) {
    el.ondblclick = function (e) {
        if (e.target !== el && !e.target.classList.contains('container-label')) return;
        e.stopPropagation();
        pendingContainer = el;
        document.getElementById('image-upload').click();
    };
}

// ---- SHARED HELPERS ----

function addHandle(el) {
    const handle = document.createElement('div');
    handle.className = 'handle se';
    el.appendChild(handle);
}

function bindEvents(el) {
    el.onmousedown = function (e) {
        if (e.target.contentEditable === 'true') return;
        select(el, e);
    };

    // If it's a container, add double-click to upload image inside
    if (el.classList.contains('container-box')) {
        setupContainerDblClick(el);
    }
}

function select(el, e) {
    if (selectedEl) selectedEl.classList.remove('selected');
    selectedEl = el;
    selectedEl.classList.add('selected');

    showInspectorFor(el);

    const isResizing = e.target.classList.contains('handle');
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = el.offsetWidth;
    const startH = el.offsetHeight;
    const startL = el.offsetLeft;
    const startT = el.offsetTop;

    const move = function (m) {
        if (isResizing) {
            el.style.width = Math.round((startW + (m.clientX - startX)) / snapSize) * snapSize + 'px';
            el.style.height = Math.round((startH + (m.clientY - startY)) / snapSize) * snapSize + 'px';
        } else {
            el.style.left = Math.round((startL + (m.clientX - startX)) / snapSize) * snapSize + 'px';
            el.style.top = Math.round((startT + (m.clientY - startY)) / snapSize) * snapSize + 'px';
        }
        syncInspector();
    };

    const up = function () {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        saveHistory('Modify');
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
}

// ---- INSPECTOR ----

function showInspectorFor(el) {
    document.getElementById('no-sel').style.display = 'none';
    document.getElementById('inspector-ui').style.display = 'block';

    // Show/hide container info panel
    const containerInfo = document.getElementById('container-info');
    if (el.classList.contains('container-box')) {
        containerInfo.style.display = 'block';
        const childCount = el.querySelectorAll('.container-child').length;
        document.getElementById('container-child-count').textContent = childCount;
    } else {
        containerInfo.style.display = 'none';
    }

    syncInspector();
}

function syncInspector() {
    if (!selectedEl) return;
    document.getElementById('in-w').value = selectedEl.offsetWidth;
    document.getElementById('in-h').value = selectedEl.offsetHeight;
    document.getElementById('in-x').value = selectedEl.offsetLeft;
    document.getElementById('in-y').value = selectedEl.offsetTop;

    const currentRot = selectedEl.getAttribute('data-rotation') || 0;
    document.getElementById('in-rotate').value = currentRot;
    document.getElementById('rotate-val').innerText = currentRot + '\u00B0';
}

function applyInspector() {
    if (!selectedEl) return;
    selectedEl.style.width = document.getElementById('in-w').value + 'px';
    selectedEl.style.height = document.getElementById('in-h').value + 'px';
    selectedEl.style.left = document.getElementById('in-x').value + 'px';
    selectedEl.style.top = document.getElementById('in-y').value + 'px';
    saveHistory('Inspector edit');
}

function updateRotation(degrees) {
    if (!selectedEl) return;
    selectedEl.style.transform = 'rotate(' + degrees + 'deg)';
    selectedEl.setAttribute('data-rotation', degrees);
    document.getElementById('rotate-val').innerText = degrees + '\u00B0';
}

function playAnim() {
    if (!selectedEl) return;
    const type = document.getElementById('anim-type').value;
    if (type === 'none') return;
    selectedEl.classList.remove('anim-' + type);
    void selectedEl.offsetWidth; // Trigger reflow
    selectedEl.classList.add('anim-' + type);
}

// ---- SYSTEM FUNCTIONS ----

function setBreakpoint(device) {
    const widths = { desktop: '1280px', tablet: '768px', mobile: '375px' };
    canvas.style.width = widths[device];
}

function saveHistory(name) {
    history.push({ name: name, html: canvas.innerHTML });
    const hStack = document.getElementById('history-stack');
    hStack.innerHTML = history
        .slice(-5)
        .map(function (h) { return '<div class="menu-item">' + h.name + '</div>'; })
        .reverse()
        .join('');
}

function updateLayers() {
    const lStack = document.getElementById('layer-stack');
    const children = Array.from(canvas.children);
    lStack.innerHTML = children
        .map(function (el, i) {
            const type = el.dataset.type || 'element';
            const isContainer = el.classList.contains('container-box');
            const childCount = isContainer ? el.querySelectorAll('.container-child').length : 0;
            const label = isContainer
                ? 'Container (' + childCount + ' children)'
                : 'Layer ' + (i + 1) + ' (' + type + ')';
            const cls = isContainer ? 'menu-item is-container' : 'menu-item';
            return '<div class="' + cls + '">' + label + '</div>';
        })
        .reverse()
        .join('');
}

function deleteElement() {
    if (!selectedEl) return;
    // If deleting a container, also remove from tracking array
    if (selectedEl.classList.contains('container-box')) {
        containers = containers.filter(function (c) { return c !== selectedEl; });
    }
    selectedEl.remove();
    selectedEl = null;
    deselect({ target: canvas });
    updateLayers();
    saveHistory('Delete');
}

function saveToCloud() {
    localStorage.setItem('wix_master', canvas.innerHTML);
    alert('Saved!');
}

function loadFromCloud() {
    const data = localStorage.getItem('wix_master');
    if (!data) return;

    canvas.innerHTML = data;
    containers = [];

    // Rebind all elements
    Array.from(canvas.children).forEach(function (el) {
        bindEvents(el);

        // Track containers and rebind their children
        if (el.classList.contains('container-box')) {
            containers.push(el);
            Array.from(el.querySelectorAll('.container-child')).forEach(function (child) {
                bindContainerChild(child, el);
            });
        }
    });

    updateLayers();
}

function exportHTML() {
    const css = document.querySelector('link[rel="stylesheet"]');
    let styleText = '';
    try {
        const sheets = document.styleSheets;
        for (let i = 0; i < sheets.length; i++) {
            try {
                const rules = sheets[i].cssRules;
                for (let j = 0; j < rules.length; j++) {
                    styleText += rules[j].cssText + '\n';
                }
            } catch (e) { /* cross-origin */ }
        }
    } catch (e) { /* fallback */ }

    const html = '<!DOCTYPE html><html><head><style>' +
        styleText +
        '.handle{display:none!important;}.container-label{display:none!important;}.container-box{border-color:transparent!important;background:transparent!important;}' +
        '</style></head><body style="margin:0;display:flex;justify-content:center;background:#f0f0f0;padding:40px;">' +
        '<div style="background:white;width:1280px;min-height:800px;position:relative;box-shadow:0 10px 40px rgba(0,0,0,0.1);">' +
        canvas.innerHTML +
        '</div></body></html>';

    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'page.html';
    a.click();
}

function togglePreview() {
    document.body.classList.toggle('preview-mode');
}

function toggleAddMenu() {
    const m = document.getElementById('add-menu');
    m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

function deselect(e) {
    if (e.target === canvas) {
        if (selectedEl) selectedEl.classList.remove('selected');
        selectedEl = null;
        document.getElementById('no-sel').style.display = 'block';
        document.getElementById('inspector-ui').style.display = 'none';
    }
}

// Theme toggle
document.getElementById('theme-toggle').onclick = function () {
    document.body.classList.toggle('light-mode');
};
