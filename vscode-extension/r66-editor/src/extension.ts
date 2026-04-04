import * as vscode from 'vscode';

/**
 * R66 Editor VS Code Extension
 *
 * Provides direct manipulation of section y-values via webview dragging.
 * Updates source code in real-time without flickering.
 */

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('R66 Editor extension is now active');

  // Register the command to open the editor
  const openEditorCommand = vscode.commands.registerCommand('r66Editor.openEditor', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    openR66EditorPanel(context, editor.document);
  });

  context.subscriptions.push(openEditorCommand);
}

/**
 * Opens the R66 Editor webview panel
 */
function openR66EditorPanel(context: vscode.ExtensionContext, document: vscode.TextDocument) {
  // If panel already exists, reveal it
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  // Create new webview panel
  currentPanel = vscode.window.createWebviewPanel(
    'r66Editor',
    'R66 Visual Editor',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media')
      ]
    }
  );

  // Set HTML content
  currentPanel.webview.html = getWebviewContent(document);

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGE HANDLER - Catches commands from webview
  // ═══════════════════════════════════════════════════════════════════════════
  currentPanel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'updateY':
          await handleUpdateY(message.sectionId, message.newY, message.deltaY);
          break;

        case 'updatePosition':
          await handleUpdatePosition(message.sectionId, message.x, message.y);
          break;

        case 'updateSize':
          await handleUpdateSize(message.sectionId, message.width, message.height);
          break;

        case 'requestSections':
          // Send current sections to webview
          const sections = parseSectionsFromDocument();
          currentPanel?.webview.postMessage({
            command: 'loadSections',
            sections
          });
          break;

        case 'saveDocument':
          await vscode.window.activeTextEditor?.document.save();
          vscode.window.showInformationMessage('Document saved');
          break;
      }
    },
    undefined,
    context.subscriptions
  );

  // Handle panel disposal
  currentPanel.onDidDispose(
    () => {
      currentPanel = undefined;
    },
    null,
    context.subscriptions
  );

  // Watch for document changes
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document === vscode.window.activeTextEditor?.document) {
      // Sync changes back to webview
      const sections = parseSectionsFromDocument();
      currentPanel?.webview.postMessage({
        command: 'loadSections',
        sections
      });
    }
  });

  context.subscriptions.push(documentChangeListener);
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE Y HANDLER - Core direct manipulation logic
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle updateY command from webview.
 * Updates the y property of a section in the source code.
 *
 * @param sectionId - The unique ID of the section
 * @param newY - The new y value in pixels or percentage
 * @param deltaY - The change in y (optional, for relative updates)
 */
async function handleUpdateY(
  sectionId: string,
  newY: number,
  deltaY?: number
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const text = document.getText();

  // Find the section in the document
  const sectionMatch = findSectionInDocument(text, sectionId);
  if (!sectionMatch) {
    console.warn(`Section ${sectionId} not found in document`);
    return;
  }

  // Find the y property within the section
  const yMatch = findYPropertyInSection(text, sectionMatch.start, sectionMatch.end);
  if (!yMatch) {
    console.warn(`Y property not found in section ${sectionId}`);
    return;
  }

  // Create workspace edit (preserves cursor position, no flickering)
  const workspaceEdit = new vscode.WorkspaceEdit();

  const startPos = document.positionAt(yMatch.start);
  const endPos = document.positionAt(yMatch.end);
  const range = new vscode.Range(startPos, endPos);

  // Format the new value (preserve original format - number or string with unit)
  const newValue = formatYValue(newY, yMatch.originalFormat);

  workspaceEdit.replace(document.uri, range, newValue);

  // Apply edit without moving cursor
  await vscode.workspace.applyEdit(workspaceEdit);
}

/**
 * Handle position updates (x and y together)
 */
async function handleUpdatePosition(
  sectionId: string,
  x: number,
  y: number
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const text = document.getText();

  const sectionMatch = findSectionInDocument(text, sectionId);
  if (!sectionMatch) return;

  // Create a single workspace edit for both x and y
  const workspaceEdit = new vscode.WorkspaceEdit();

  // Find and update x
  const xMatch = findPropertyInSection(text, sectionMatch.start, sectionMatch.end, 'x');
  if (xMatch) {
    const startPos = document.positionAt(xMatch.start);
    const endPos = document.positionAt(xMatch.end);
    workspaceEdit.replace(document.uri, new vscode.Range(startPos, endPos), String(x));
  }

  // Find and update y
  const yMatch = findPropertyInSection(text, sectionMatch.start, sectionMatch.end, 'y');
  if (yMatch) {
    const startPos = document.positionAt(yMatch.start);
    const endPos = document.positionAt(yMatch.end);
    workspaceEdit.replace(document.uri, new vscode.Range(startPos, endPos), String(y));
  }

  await vscode.workspace.applyEdit(workspaceEdit);
}

/**
 * Handle size updates (width and height)
 */
async function handleUpdateSize(
  sectionId: string,
  width: number,
  height: number
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const text = document.getText();

  const sectionMatch = findSectionInDocument(text, sectionId);
  if (!sectionMatch) return;

  const workspaceEdit = new vscode.WorkspaceEdit();

  const widthMatch = findPropertyInSection(text, sectionMatch.start, sectionMatch.end, 'width');
  if (widthMatch) {
    const startPos = document.positionAt(widthMatch.start);
    const endPos = document.positionAt(widthMatch.end);
    workspaceEdit.replace(document.uri, new vscode.Range(startPos, endPos), String(width));
  }

  const heightMatch = findPropertyInSection(text, sectionMatch.start, sectionMatch.end, 'height');
  if (heightMatch) {
    const startPos = document.positionAt(heightMatch.start);
    const endPos = document.positionAt(heightMatch.end);
    workspaceEdit.replace(document.uri, new vscode.Range(startPos, endPos), String(height));
  }

  await vscode.workspace.applyEdit(workspaceEdit);
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT PARSING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

interface SectionMatch {
  start: number;
  end: number;
  id: string;
}

interface PropertyMatch {
  start: number;
  end: number;
  originalFormat: 'number' | 'string' | 'percentage';
  value: number;
}

/**
 * Parse sections from the active document.
 * Supports both JSON and TypeScript/JavaScript object formats.
 */
function parseSectionsFromDocument(): any[] {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return [];

  const text = editor.document.getText();
  const ext = editor.document.fileName.split('.').pop();

  try {
    if (ext === 'json') {
      const data = JSON.parse(text);
      return Array.isArray(data.sections) ? data.sections :
             Array.isArray(data.components) ? data.components :
             Array.isArray(data) ? data : [];
    } else {
      // For TS/JS, try to extract sections array
      const sectionsMatch = text.match(/sections\s*[=:]\s*\[([\s\S]*?)\]/);
      if (sectionsMatch) {
        // This is a simplified parser - may need adjustment for complex cases
        return JSON.parse(`[${sectionsMatch[1]}]`);
      }
    }
  } catch (e) {
    console.error('Failed to parse sections:', e);
  }

  return [];
}

/**
 * Find a section by ID in the document text.
 * Works with both JSON and JS/TS object literals.
 */
function findSectionInDocument(text: string, sectionId: string): SectionMatch | null {
  // Pattern for JSON: "id": "sectionId" or 'id': 'sectionId'
  // Pattern for JS/TS: id: "sectionId" or id: 'sectionId'
  const patterns = [
    new RegExp(`["']?id["']?\\s*[=:]\\s*["']${escapeRegex(sectionId)}["']`, 'g'),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      // Find the containing object boundaries
      const objStart = findObjectStart(text, match.index);
      const objEnd = findObjectEnd(text, match.index);

      if (objStart !== -1 && objEnd !== -1) {
        return {
          start: objStart,
          end: objEnd,
          id: sectionId
        };
      }
    }
  }

  return null;
}

/**
 * Find a specific property within a section's text range.
 */
function findPropertyInSection(
  text: string,
  sectionStart: number,
  sectionEnd: number,
  propertyName: string
): PropertyMatch | null {
  const sectionText = text.substring(sectionStart, sectionEnd);

  // Match patterns like: "y": 100, y: 100, "y": "100px", y: "50%"
  const pattern = new RegExp(
    `["']?${propertyName}["']?\\s*[=:]\\s*` +
    `(["']?)([-\\d.]+)(%|px|vh|vw)?\\1`,
    'g'
  );

  const match = pattern.exec(sectionText);
  if (match) {
    const valueStart = sectionStart + match.index + match[0].indexOf(match[2]);
    const fullValue = match[2] + (match[3] || '');
    const valueEnd = valueStart + fullValue.length;

    let format: 'number' | 'string' | 'percentage' = 'number';
    if (match[1]) format = 'string'; // Has quotes
    if (match[3] === '%') format = 'percentage';

    return {
      start: valueStart,
      end: valueEnd,
      originalFormat: format,
      value: parseFloat(match[2])
    };
  }

  return null;
}

/**
 * Find the y property specifically (alias for findPropertyInSection)
 */
function findYPropertyInSection(
  text: string,
  sectionStart: number,
  sectionEnd: number
): PropertyMatch | null {
  return findPropertyInSection(text, sectionStart, sectionEnd, 'y');
}

/**
 * Find the start of an object (opening brace)
 */
function findObjectStart(text: string, fromIndex: number): number {
  let depth = 0;
  for (let i = fromIndex; i >= 0; i--) {
    if (text[i] === '}') depth++;
    if (text[i] === '{') {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

/**
 * Find the end of an object (closing brace)
 */
function findObjectEnd(text: string, fromIndex: number): number {
  let depth = 0;
  for (let i = fromIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') {
      if (depth === 0) return i + 1;
      depth--;
    }
  }
  return -1;
}

/**
 * Format the y value preserving original format
 */
function formatYValue(value: number, format: 'number' | 'string' | 'percentage'): string {
  switch (format) {
    case 'percentage':
      return `${value}%`;
    case 'string':
      return `"${value}"`;
    default:
      return String(Math.round(value));
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBVIEW HTML CONTENT
// ═══════════════════════════════════════════════════════════════════════════

function getWebviewContent(document: vscode.TextDocument): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>R66 Visual Editor</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1e1e1e;
      color: #fff;
      height: 100vh;
      overflow: hidden;
    }

    .toolbar {
      height: 40px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
      display: flex;
      align-items: center;
      padding: 0 12px;
      gap: 8px;
    }

    .toolbar button {
      background: #0e639c;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }

    .toolbar button:hover {
      background: #1177bb;
    }

    .canvas-container {
      position: relative;
      width: 100%;
      height: calc(100vh - 40px);
      overflow: auto;
      background: #2d2d2d;
    }

    .canvas {
      position: relative;
      width: 1200px;
      min-height: 800px;
      margin: 20px auto;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
    }

    /* Section element styles */
    .section {
      position: absolute;
      background: rgba(30, 144, 255, 0.1);
      border: 2px solid #1e90ff;
      cursor: move;
      user-select: none;
      transition: box-shadow 0.15s ease;
    }

    .section:hover {
      box-shadow: 0 0 0 2px rgba(30, 144, 255, 0.5);
    }

    .section.dragging {
      opacity: 0.8;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1000;
    }

    .section-label {
      position: absolute;
      top: -24px;
      left: 0;
      background: #1e90ff;
      color: white;
      padding: 2px 8px;
      font-size: 11px;
      border-radius: 3px;
      white-space: nowrap;
    }

    .section-coords {
      position: absolute;
      bottom: -20px;
      left: 0;
      background: #333;
      color: #aaa;
      padding: 2px 6px;
      font-size: 10px;
      font-family: monospace;
      border-radius: 2px;
    }

    /* Resize handles */
    .resize-handle {
      position: absolute;
      width: 10px;
      height: 10px;
      background: #1e90ff;
      border: 2px solid white;
      border-radius: 2px;
    }

    .resize-handle.se { bottom: -5px; right: -5px; cursor: se-resize; }
    .resize-handle.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
    .resize-handle.ne { top: -5px; right: -5px; cursor: ne-resize; }
    .resize-handle.nw { top: -5px; left: -5px; cursor: nw-resize; }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="refreshSections()">Refresh</button>
    <button onclick="saveDocument()">Save</button>
    <span style="margin-left: auto; color: #888; font-size: 12px;">
      Drag sections to update Y position in source code
    </span>
  </div>

  <div class="canvas-container">
    <div class="canvas" id="canvas"></div>
  </div>

  <script>
    // ═══════════════════════════════════════════════════════════════════════
    // VS CODE API
    // ═══════════════════════════════════════════════════════════════════════
    const vscode = acquireVsCodeApi();

    // ═══════════════════════════════════════════════════════════════════════
    // THROTTLE UTILITY - Prevents too many updates (16ms = ~60fps)
    // ═══════════════════════════════════════════════════════════════════════
    function throttle(func, limit = 16) {
      let inThrottle = false;
      let lastArgs = null;

      return function(...args) {
        lastArgs = args;

        if (!inThrottle) {
          inThrottle = true;
          func.apply(this, args);

          setTimeout(() => {
            inThrottle = false;
            if (lastArgs) {
              func.apply(this, lastArgs);
              lastArgs = null;
            }
          }, limit);
        }
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DIRECT MANIPULATION - Drag to update Y
    // ═══════════════════════════════════════════════════════════════════════

    let isDragging = false;
    let dragTarget = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let elementStartX = 0;
    let elementStartY = 0;

    // Throttled position update (sends to extension host)
    const throttledUpdatePosition = throttle((sectionId, x, y) => {
      vscode.postMessage({
        command: 'updatePosition',
        sectionId: sectionId,
        x: Math.round(x),
        y: Math.round(y)
      });
    }, 16); // 16ms = ~60fps

    // Throttled Y-only update
    const throttledUpdateY = throttle((sectionId, newY, deltaY) => {
      vscode.postMessage({
        command: 'updateY',
        sectionId: sectionId,
        newY: Math.round(newY),
        deltaY: Math.round(deltaY)
      });
    }, 16);

    /**
     * Initialize drag listeners on a section element
     */
    function initDragListeners(element, sectionId, initialX, initialY) {
      // ─── MOUSEDOWN: Start dragging ───
      element.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('resize-handle')) return;

        e.preventDefault();
        isDragging = true;
        dragTarget = element;

        dragStartX = e.clientX;
        dragStartY = e.clientY;
        elementStartX = initialX;
        elementStartY = initialY;

        element.classList.add('dragging');
        document.body.style.cursor = 'move';
      });
    }

    // ─── MOUSEMOVE: Update position while dragging ───
    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !dragTarget) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      const newX = elementStartX + deltaX;
      const newY = elementStartY + deltaY;

      // Update visual position immediately
      dragTarget.style.left = newX + 'px';
      dragTarget.style.top = newY + 'px';

      // Update coordinates display
      const coordsEl = dragTarget.querySelector('.section-coords');
      if (coordsEl) {
        coordsEl.textContent = 'x: ' + Math.round(newX) + ', y: ' + Math.round(newY);
      }

      // Send throttled update to extension host
      const sectionId = dragTarget.dataset.sectionId;
      throttledUpdatePosition(sectionId, newX, newY);
    });

    // ─── MOUSEUP: End dragging ───
    document.addEventListener('mouseup', (e) => {
      if (!isDragging || !dragTarget) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      const newX = elementStartX + deltaX;
      const newY = elementStartY + deltaY;

      // Final update (guaranteed to send)
      const sectionId = dragTarget.dataset.sectionId;
      vscode.postMessage({
        command: 'updatePosition',
        sectionId: sectionId,
        x: Math.round(newX),
        y: Math.round(newY)
      });

      // Update internal tracking
      dragTarget.dataset.x = newX;
      dragTarget.dataset.y = newY;

      dragTarget.classList.remove('dragging');
      document.body.style.cursor = '';

      isDragging = false;
      dragTarget = null;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION RENDERING
    // ═══════════════════════════════════════════════════════════════════════

    function renderSections(sections) {
      const canvas = document.getElementById('canvas');
      canvas.innerHTML = '';

      sections.forEach((section, index) => {
        const el = document.createElement('div');
        el.className = 'section';
        el.dataset.sectionId = section.id || 'section-' + index;
        el.dataset.x = section.x || section.position?.x || 0;
        el.dataset.y = section.y || section.position?.y || 0;

        const x = parseFloat(el.dataset.x);
        const y = parseFloat(el.dataset.y);
        const width = section.width || section.position?.width || 200;
        const height = section.height || section.position?.height || 100;

        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.width = width + 'px';
        el.style.height = height + 'px';

        // Label
        const label = document.createElement('div');
        label.className = 'section-label';
        label.textContent = section.type || section.id || 'Section ' + (index + 1);
        el.appendChild(label);

        // Coordinates display
        const coords = document.createElement('div');
        coords.className = 'section-coords';
        coords.textContent = 'x: ' + Math.round(x) + ', y: ' + Math.round(y);
        el.appendChild(coords);

        // Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle se';
        el.appendChild(resizeHandle);

        // Initialize drag listeners
        initDragListeners(el, el.dataset.sectionId, x, y);

        canvas.appendChild(el);
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MESSAGE HANDLING FROM EXTENSION HOST
    // ═══════════════════════════════════════════════════════════════════════

    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.command) {
        case 'loadSections':
          renderSections(message.sections);
          break;
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // TOOLBAR ACTIONS
    // ═══════════════════════════════════════════════════════════════════════

    function refreshSections() {
      vscode.postMessage({ command: 'requestSections' });
    }

    function saveDocument() {
      vscode.postMessage({ command: 'saveDocument' });
    }

    // Initial load
    refreshSections();
  </script>
</body>
</html>`;
}

export function deactivate() {}
