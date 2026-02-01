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

// ---- TEMPLATE SYSTEM ----

function toggleTemplateMenu() {
    var addMenu = document.getElementById('add-menu');
    var tplMenu = document.getElementById('template-menu');
    addMenu.style.display = 'none';
    tplMenu.style.display = tplMenu.style.display === 'none' ? 'block' : 'none';
}

// Override toggleAddMenu to close template menu
var _origToggleAdd = toggleAddMenu;
toggleAddMenu = function () {
    document.getElementById('template-menu').style.display = 'none';
    _origToggleAdd();
};

var TEMPLATES = {};

// ---------------------------------------------------------------
//  BRANDS TEMPLATE — pixel-perfect clone of r66slot.co.za/brands/nsr
//  Colors: primary=#DC2626  secondary=#1F2937  accent=#FBBF24
//          primary-dark=#991B1B  primary-light=#EF4444
// ---------------------------------------------------------------
TEMPLATES.brands = function () {
    var elements = [];
    var FF = "'Assistant', 'Segoe UI', system-ui, -apple-system, sans-serif";

    // ===== 1. HEADER / NAVBAR =====
    // bg-secondary (#1F2937), h-16 (64px), border-b border-gray-700
    var nav = document.createElement('div');
    nav.className = 'resizable-box';
    nav.dataset.type = 'header';
    nav.style.cssText = 'left:0;top:0;width:1280px;height:64px;background:#1F2937;border-bottom:1px solid #374151;display:flex;align-items:center;justify-content:space-between;padding:0 32px;';
    nav.style.zIndex = ++highestZ;
    nav.innerHTML =
        // Logo: R66 white + SLOT primary
        '<div style="font-size:24px;font-weight:700;font-family:' + FF + ';">' +
            '<span style="color:#ffffff;">R66</span>' +
            '<span style="color:#DC2626;">SLOT</span>' +
        '</div>' +
        // Nav links
        '<div style="display:flex;align-items:center;gap:28px;">' +
            '<span style="color:#fff;font-size:14px;font-family:' + FF + ';cursor:pointer;">Products</span>' +
            '<span style="color:#fff;font-size:14px;font-family:' + FF + ';cursor:pointer;">Brands</span>' +
            '<span style="color:#fff;font-size:14px;font-family:' + FF + ';cursor:pointer;">New Arrivals</span>' +
            '<span style="color:#fff;font-size:14px;font-family:' + FF + ';cursor:pointer;">Slotify Pre-Orders</span>' +
            '<span style="color:#fff;font-size:14px;font-family:' + FF + ';cursor:pointer;">About</span>' +
            '<span style="color:#fff;font-size:14px;font-family:' + FF + ';cursor:pointer;">Contact</span>' +
        '</div>' +
        // Right icons: search, account, cart
        '<div style="display:flex;align-items:center;gap:18px;">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
            '<div style="position:relative;">' +
                '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
                '<span style="position:absolute;top:-8px;right:-8px;background:#DC2626;color:#fff;font-size:10px;font-weight:700;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-family:' + FF + ';">0</span>' +
            '</div>' +
        '</div>';
    elements.push(nav);

    // ===== 2. HERO SECTION =====
    // bg-gradient from-red-600(#DC2626) to-red-700(#B91C1C), py-16 (64px top+bottom)
    var hero = document.createElement('div');
    hero.className = 'resizable-box';
    hero.dataset.type = 'hero';
    hero.style.cssText = 'left:0;top:64px;width:1280px;height:200px;background:linear-gradient(180deg,#DC2626 0%,#B91C1C 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;';
    hero.style.zIndex = ++highestZ;
    hero.innerHTML =
        '<h1 style="font-family:' + FF + ';font-size:48px;font-weight:700;color:#ffffff;margin:0;text-align:center;line-height:1.1;">NSR Slot Cars</h1>' +
        '<p style="font-family:' + FF + ';font-size:20px;color:rgba(254,202,202,0.9);margin:10px 0 0;text-align:center;">Premium Racing Performance</p>';
    elements.push(hero);

    // ===== 3. PAGE BODY BACKGROUND =====
    // bg-gray-50 (#F9FAFB) — the content area behind cards
    var body = document.createElement('div');
    body.className = 'resizable-box';
    body.dataset.type = 'section';
    body.style.cssText = 'left:0;top:264px;width:1280px;height:460px;background:#F9FAFB;';
    body.style.zIndex = ++highestZ;
    elements.push(body);

    // ===== 4. BACK LINK =====
    // text-gray-600 (#4B5563), py-8 area
    var back = document.createElement('div');
    back.className = 'resizable-box';
    back.dataset.type = 'text';
    back.style.cssText = 'left:80px;top:288px;width:200px;height:32px;display:flex;align-items:center;';
    back.style.zIndex = ++highestZ;
    back.innerHTML = '<span style="font-family:' + FF + ';font-size:14px;color:#4B5563;cursor:pointer;">&larr; Back to Home</span>';
    elements.push(back);

    // ===== 5. CARD 1 — NSR Slot Cars =====
    // rounded-lg(8px), shadow-lg, gradient from-red-500(#EF4444) to-red-700(#B91C1C)
    var card1 = document.createElement('div');
    card1.className = 'resizable-box';
    card1.dataset.type = 'card';
    card1.style.cssText = 'left:80px;top:340px;width:548px;height:340px;background:linear-gradient(180deg,#EF4444 0%,#B91C1C 100%);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1);overflow:hidden;';
    card1.style.zIndex = ++highestZ;
    card1.innerHTML =
        '<div style="font-size:80px;line-height:1;">&#127950;</div>' +
        '<h3 style="font-family:' + FF + ';font-size:24px;font-weight:700;color:#ffffff;margin:0;">NSR Slot Cars</h3>' +
        '<p style="font-family:' + FF + ';font-size:14px;color:rgba(255,255,255,0.8);margin:0;text-align:center;max-width:80%;">Explore our complete range of NSR racing models</p>' +
        '<button style="font-family:' + FF + ';display:inline-block;padding:12px 32px;background:#DC2626;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">View Cars &rarr;</button>';
    elements.push(card1);

    // ===== 6. CARD 2 — NSR Parts =====
    // gradient from-gray-700(#374151) to-gray-900(#111827)
    var card2 = document.createElement('div');
    card2.className = 'resizable-box';
    card2.dataset.type = 'card';
    card2.style.cssText = 'left:652px;top:340px;width:548px;height:340px;background:linear-gradient(180deg,#374151 0%,#111827 100%);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1);overflow:hidden;';
    card2.style.zIndex = ++highestZ;
    card2.innerHTML =
        '<div style="font-size:80px;line-height:1;">&#9881;&#65039;</div>' +
        '<h3 style="font-family:' + FF + ';font-size:24px;font-weight:700;color:#ffffff;margin:0;">NSR Parts</h3>' +
        '<p style="font-family:' + FF + ';font-size:14px;color:rgba(255,255,255,0.8);margin:0;text-align:center;max-width:80%;">Quality replacement parts and upgrades</p>' +
        '<button style="font-family:' + FF + ';display:inline-block;padding:12px 32px;background:#1F2937;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">View Parts &rarr;</button>';
    elements.push(card2);

    // ===== 7. FOOTER =====
    // bg-secondary(#1F2937), border-t border-gray-700(#374151), py-12
    var footer = document.createElement('div');
    footer.className = 'resizable-box';
    footer.dataset.type = 'footer';
    footer.style.cssText = 'left:0;top:724px;width:1280px;height:280px;background:#1F2937;border-top:1px solid #374151;padding:48px 80px 32px;display:flex;flex-direction:column;justify-content:flex-start;';
    footer.style.zIndex = ++highestZ;
    footer.innerHTML =
        // 4-column grid
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:32px;width:100%;">' +
            // Col 1: Brand
            '<div>' +
                '<div style="font-size:24px;font-weight:700;font-family:' + FF + ';margin-bottom:16px;">' +
                    '<span style="color:#ffffff;">R66</span><span style="color:#DC2626;">SLOT</span>' +
                '</div>' +
                '<p style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;line-height:1.6;margin:0;">Your premium destination for slot car racing. Quality models, fast shipping, expert service.</p>' +
            '</div>' +
            // Col 2: Shop
            '<div>' +
                '<h4 style="font-family:' + FF + ';font-size:15px;font-weight:600;color:#ffffff;margin:0 0 16px;">Shop</h4>' +
                '<div style="display:flex;flex-direction:column;gap:10px;">' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">All Products</span>' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">Brands</span>' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">New Arrivals</span>' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">Pre-Orders</span>' +
                '</div>' +
            '</div>' +
            // Col 3: Information
            '<div>' +
                '<h4 style="font-family:' + FF + ';font-size:15px;font-weight:600;color:#ffffff;margin:0 0 16px;">Information</h4>' +
                '<div style="display:flex;flex-direction:column;gap:10px;">' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">About Us</span>' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">Contact</span>' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">Shipping Info</span>' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">Returns</span>' +
                '</div>' +
            '</div>' +
            // Col 4: Account
            '<div>' +
                '<h4 style="font-family:' + FF + ';font-size:15px;font-weight:600;color:#ffffff;margin:0 0 16px;">Account</h4>' +
                '<div style="display:flex;flex-direction:column;gap:10px;">' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">My Account</span>' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">Order History</span>' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">Login</span>' +
                    '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">Register</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
        // Bottom bar: border-t, copyright + policy links
        '<div style="margin-top:auto;padding-top:24px;border-top:1px solid #374151;display:flex;justify-content:space-between;align-items:center;width:100%;">' +
            '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;">&copy; 2026 R66SLOT. All rights reserved.</span>' +
            '<div style="display:flex;gap:24px;">' +
                '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">Privacy Policy</span>' +
                '<span style="font-family:' + FF + ';font-size:13px;color:#9CA3AF;cursor:pointer;">Terms of Service</span>' +
            '</div>' +
        '</div>';
    elements.push(footer);

    return elements;
};

// ---------------------------------------------------------------
//  BLANK TEMPLATE
// ---------------------------------------------------------------
TEMPLATES.blank = function () {
    return []; // Empty canvas
};

// ---------------------------------------------------------------
//  loadTemplate — clears canvas and populates from template
// ---------------------------------------------------------------
function loadTemplate(name) {
    if (!TEMPLATES[name]) return;

    // Confirm if canvas has content
    if (canvas.children.length > 0) {
        if (!confirm('This will replace your current canvas. Continue?')) return;
    }

    // Clear
    canvas.innerHTML = '';
    containers = [];
    selectedEl = null;
    highestZ = 10;

    var elements = TEMPLATES[name]();

    elements.forEach(function (el) {
        addHandle(el);
        bindEvents(el);

        // Make inner text editable on double-click
        el.ondblclick = function (e) {
            var target = e.target;
            if (target.tagName === 'H1' || target.tagName === 'H3' ||
                target.tagName === 'P' || target.tagName === 'SPAN' ||
                target.tagName === 'BUTTON' || target.tagName === 'DIV') {
                target.contentEditable = 'true';
                target.focus();
                target.style.outline = '2px solid var(--accent)';
                target.onblur = function () {
                    target.contentEditable = 'false';
                    target.style.outline = 'none';
                };
            }
        };

        canvas.appendChild(el);
    });

    // Close template menu
    document.getElementById('template-menu').style.display = 'none';
    updateLayers();
    saveHistory('Load template: ' + name);
}

// Theme toggle
document.getElementById('theme-toggle').onclick = function () {
    document.body.classList.toggle('light-mode');
};
