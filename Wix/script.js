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
//  BRANDS TEMPLATE — based on r66slot.co.za/brands/nsr
// ---------------------------------------------------------------
TEMPLATES.brands = function () {
    var elements = [];

    // --- NAVBAR ---
    var nav = document.createElement('div');
    nav.className = 'resizable-box tpl-nav';
    nav.dataset.type = 'nav';
    nav.style.left = '0px';
    nav.style.top = '0px';
    nav.style.width = '1280px';
    nav.style.height = '60px';
    nav.style.zIndex = ++highestZ;
    nav.innerHTML =
        '<span class="tpl-logo">R66SLOT</span>' +
        '<div class="tpl-nav-links">' +
            '<span>Products</span>' +
            '<span>Brands</span>' +
            '<span>New Arrivals</span>' +
            '<span>Pre-Orders</span>' +
            '<span>About</span>' +
            '<span>Contact</span>' +
        '</div>';
    elements.push(nav);

    // --- HERO STRIP ---
    var hero = document.createElement('div');
    hero.className = 'resizable-box tpl-hero-strip';
    hero.dataset.type = 'hero';
    hero.style.left = '0px';
    hero.style.top = '60px';
    hero.style.width = '1280px';
    hero.style.height = '200px';
    hero.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
    hero.style.zIndex = ++highestZ;
    hero.innerHTML =
        '<h1 style="font-size:48px; font-weight:800; color:#ffffff; text-align:center;">NSR Slot Cars</h1>' +
        '<p style="font-size:18px; color:rgba(255,255,255,0.85); text-align:center;">Premium Racing Performance</p>';
    elements.push(hero);

    // --- BACK LINK ---
    var back = document.createElement('div');
    back.className = 'resizable-box tpl-back-link';
    back.dataset.type = 'text';
    back.style.left = '40px';
    back.style.top = '280px';
    back.style.width = '200px';
    back.style.height = '30px';
    back.style.zIndex = ++highestZ;
    back.innerHTML = '<span style="color:#4b5563; font-size:14px; font-family:Segoe UI,system-ui,sans-serif;">&larr; Back to Home</span>';
    elements.push(back);

    // --- CARD 1: NSR Slot Cars ---
    var card1 = document.createElement('div');
    card1.className = 'resizable-box tpl-card';
    card1.dataset.type = 'card';
    card1.style.left = '40px';
    card1.style.top = '320px';
    card1.style.width = '590px';
    card1.style.height = '280px';
    card1.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
    card1.style.zIndex = ++highestZ;
    card1.innerHTML =
        '<div class="tpl-card-icon">&#127950;</div>' +
        '<h3 class="tpl-card-title">NSR Slot Cars</h3>' +
        '<p class="tpl-card-desc">Explore our complete range of NSR racing models</p>' +
        '<button class="tpl-card-btn" style="background:#dc2626;">View Cars &rarr;</button>';
    elements.push(card1);

    // --- CARD 2: NSR Parts ---
    var card2 = document.createElement('div');
    card2.className = 'resizable-box tpl-card';
    card2.dataset.type = 'card';
    card2.style.left = '650px';
    card2.style.top = '320px';
    card2.style.width = '590px';
    card2.style.height = '280px';
    card2.style.background = 'linear-gradient(135deg, #374151, #111827)';
    card2.style.zIndex = ++highestZ;
    card2.innerHTML =
        '<div class="tpl-card-icon">&#9881;&#65039;</div>' +
        '<h3 class="tpl-card-title">NSR Parts</h3>' +
        '<p class="tpl-card-desc">Quality replacement parts and upgrades</p>' +
        '<button class="tpl-card-btn" style="background:#1f2937;">View Parts &rarr;</button>';
    elements.push(card2);

    // --- FOOTER ---
    var footer = document.createElement('div');
    footer.className = 'resizable-box tpl-footer';
    footer.dataset.type = 'footer';
    footer.style.left = '0px';
    footer.style.top = '640px';
    footer.style.width = '1280px';
    footer.style.height = '120px';
    footer.style.zIndex = ++highestZ;
    footer.innerHTML =
        '<div class="tpl-footer-links">' +
            '<span>Products</span>' +
            '<span>Brands</span>' +
            '<span>About</span>' +
            '<span>Contact</span>' +
            '<span>Shipping</span>' +
            '<span>Returns</span>' +
            '<span>Privacy Policy</span>' +
        '</div>' +
        '<div class="tpl-footer-copy">&copy; 2026 R66SLOT. All rights reserved.</div>';
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
