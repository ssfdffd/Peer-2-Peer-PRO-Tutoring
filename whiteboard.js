// Whiteboard Application - Complete Drawing Tool
// ==============================================

// Global Variables
let canvas, ctx;
let fabricCanvas;
let currentTool = 'select';
let currentColor = '#000000';
let currentBrushSize = 3;
let currentShape = 'rectangle';
let currentPage = 0;
let pages = [];
let isDrawing = false;
let isPanning = false;
let lastX, lastY;
let zoomLevel = 1;
let history = [];
let historyIndex = -1;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let recordings = [];
let hasUnsavedChanges = false;
let autoSaveInterval;
let collaborators = [];

// Color Palette
const colors = [
    '#000000', '#4361ee', '#f72585', '#4cc9f0',
    '#f8961e', '#7209b7', '#2a9d8f', '#e63946',
    '#ffd166', '#06d6a0', '#ffffff'
];

// Initialize Whiteboard
function initializeWhiteboard() {
    // Create fabric canvas
    canvas = document.getElementById('whiteboard-canvas');
    fabricCanvas = new fabric.Canvas('whiteboard-canvas', {
        selection: true,
        selectionColor: 'rgba(100, 255, 218, 0.3)',
        selectionLineWidth: 2,
        backgroundColor: '#f8fafc',
        preserveObjectStacking: true
    });

    // Set initial canvas size
    resizeCanvas();

    // Create first page
    createNewPage();

    // Set up event listeners
    setupCanvasEvents();

    // Set up fabric event handlers
    setupFabricEvents();

    // Initialize UI
    updateUI();

    // Start auto-save
    startAutoSave();

    // Load saved files list
    loadSavedFiles();

    // Generate invite link
    generateInviteLink();

    console.log('Whiteboard initialized successfully');
}

// Resize canvas to fit window
function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    fabricCanvas.setWidth(width);
    fabricCanvas.setHeight(height);
    fabricCanvas.calcOffset();

    // Update canvas boundary
    updateCanvasBoundary();
}

// Create a new page
function createNewPage() {
    const page = {
        id: Date.now(),
        name: `Page ${pages.length + 1}`,
        objects: [],
        background: '#f8fafc',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    pages.push(page);
    currentPage = pages.length - 1;

    // Clear canvas
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = page.background;

    updatePageInfo();
    saveHistory();

    return page;
}

// Set current tool
function setTool(tool) {
    currentTool = tool;

    // Update active tool button
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tool}-tool`).classList.add('active');

    // Update cursor
    updateCursor();

    // Update UI
    updateToolInfo();

    // Show/hide tool sections
    updateToolSections();
}

// Set color
function setColor(color) {
    currentColor = color;

    // Update active color
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
    const colorOpt = Array.from(document.querySelectorAll('.color-option')).find(opt =>
        opt.style.backgroundColor === color ||
        opt.style.backgroundColor === rgbToHex(color)
    );
    if (colorOpt) colorOpt.classList.add('active');

    // Update custom color picker
    document.getElementById('customColorPicker').value = color;

    // Update fabric brush color
    if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = color;
    }

    // Update selected objects
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
        activeObjects.forEach(obj => {
            if (obj.type === 'path' || obj.type === 'line' || obj.type === 'rect' ||
                obj.type === 'circle' || obj.type === 'triangle') {
                obj.set({ stroke: color });
            } else if (obj.type === 'textbox' || obj.type === 'i-text') {
                obj.set({ fill: color });
            }
        });
        fabricCanvas.renderAll();
        saveHistory();
    }

    updateColorInfo();
}

// Set brush size
function setBrushSize(size) {
    currentBrushSize = size;
    document.getElementById('brush-slider').value = size;
    updateBrushSize(size);
}

function updateBrushSize(size) {
    currentBrushSize = parseInt(size);

    // Update size preview
    const preview = document.getElementById('size-preview');
    preview.style.width = `${currentBrushSize * 2}px`;
    preview.style.height = `${currentBrushSize * 2}px`;
    preview.style.backgroundColor = currentColor;

    // Update fabric brush width
    if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.width = currentBrushSize;
    }

    updateBrushInfo();
}

// Set shape
function setShape(shape) {
    currentShape = shape;

    // Update active shape button
    document.querySelectorAll('.shape-btn').forEach(btn => btn.classList.remove('active'));
    const shapeBtn = Array.from(document.querySelectorAll('.shape-btn')).find(btn =>
        btn.querySelector('i').className.includes(shape)
    );
    if (shapeBtn) shapeBtn.classList.add('active');
}

// Set up canvas events
function setupCanvasEvents() {
    const container = document.getElementById('canvas-container');

    // Mouse wheel for zoom
    container.addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        } else {
            // Scroll the canvas
            container.scrollLeft += e.deltaY;
            container.scrollTop += e.deltaX;
        }
    });

    // Pan with middle mouse button
    container.addEventListener('mousedown', function (e) {
        if (e.button === 1) { // Middle button
            e.preventDefault();
            isPanning = true;
            lastX = e.clientX;
            lastY = e.clientY;
            container.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', function (e) {
        if (isPanning) {
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            container.scrollLeft -= deltaX;
            container.scrollTop -= deltaY;
            lastX = e.clientX;
            lastY = e.clientY;
        }
    });

    document.addEventListener('mouseup', function () {
        isPanning = false;
        container.style.cursor = '';
        updateCursor();
    });

    // Prevent context menu
    container.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY);
    });
}

// Set up fabric events
function setupFabricEvents() {
    // Object selection
    fabricCanvas.on('selection:created', function () {
        updateSelectionProperties();
    });

    fabricCanvas.on('selection:updated', function () {
        updateSelectionProperties();
    });

    fabricCanvas.on('selection:cleared', function () {
        clearSelectionProperties();
    });

    // Object modification
    fabricCanvas.on('object:modified', function () {
        saveHistory();
        hasUnsavedChanges = true;
        updatePage();
    });

    // Object added
    fabricCanvas.on('object:added', function () {
        saveHistory();
        hasUnsavedChanges = true;
        updatePage();
    });

    // Object removed
    fabricCanvas.on('object:removed', function () {
        saveHistory();
        hasUnsavedChanges = true;
        updatePage();
    });

    // Mouse down for drawing
    fabricCanvas.on('mouse:down', function (options) {
        if (currentTool === 'pen' || currentTool === 'highlighter') {
            isDrawing = true;
            const pointer = fabricCanvas.getPointer(options.e);

            // Create a new path
            const path = new fabric.Path(`M ${pointer.x} ${pointer.y}`, {
                stroke: currentColor,
                strokeWidth: currentTool === 'highlighter' ? currentBrushSize * 3 : currentBrushSize,
                fill: null,
                strokeLineCap: 'round',
                strokeLineJoin: 'round',
                opacity: currentTool === 'highlighter' ? 0.5 : 1
            });

            fabricCanvas.add(path);
            fabricCanvas.setActiveObject(path);
        } else if (currentTool === 'shape') {
            const pointer = fabricCanvas.getPointer(options.e);
            lastX = pointer.x;
            lastY = pointer.y;

            let shape;
            const fill = document.getElementById('fill-shape').checked ? currentColor : 'transparent';

            switch (currentShape) {
                case 'rectangle':
                    shape = new fabric.Rect({
                        left: pointer.x,
                        top: pointer.y,
                        width: 0,
                        height: 0,
                        stroke: currentColor,
                        strokeWidth: currentBrushSize,
                        fill: fill
                    });
                    break;
                case 'circle':
                    shape = new fabric.Circle({
                        left: pointer.x,
                        top: pointer.y,
                        radius: 0,
                        stroke: currentColor,
                        strokeWidth: currentBrushSize,
                        fill: fill
                    });
                    break;
                case 'triangle':
                    shape = new fabric.Triangle({
                        left: pointer.x,
                        top: pointer.y,
                        width: 0,
                        height: 0,
                        stroke: currentColor,
                        strokeWidth: currentBrushSize,
                        fill: fill
                    });
                    break;
                case 'line':
                    shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                        stroke: currentColor,
                        strokeWidth: currentBrushSize,
                        fill: 'transparent'
                    });
                    break;
                case 'arrow':
                    shape = createArrow(pointer.x, pointer.y, pointer.x, pointer.y);
                    break;
                case 'star':
                    shape = new fabric.Path(createStarPath(pointer.x, pointer.y, 0), {
                        stroke: currentColor,
                        strokeWidth: currentBrushSize,
                        fill: fill
                    });
                    break;
                case 'cloud':
                    shape = createCloud(pointer.x, pointer.y, 0);
                    break;
            }

            if (shape) {
                fabricCanvas.add(shape);
                fabricCanvas.setActiveObject(shape);
            }
        } else if (currentTool === 'line') {
            const pointer = fabricCanvas.getPointer(options.e);
            lastX = pointer.x;
            lastY = pointer.y;

            const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                stroke: currentColor,
                strokeWidth: currentBrushSize,
                fill: 'transparent'
            });

            fabricCanvas.add(line);
            fabricCanvas.setActiveObject(line);
        } else if (currentTool === 'text') {
            const pointer = fabricCanvas.getPointer(options.e);
            const fontSize = parseInt(document.getElementById('font-size-slider').value);
            const fontFamily = document.getElementById('font-family').value;

            const text = new fabric.IText('Type here...', {
                left: pointer.x,
                top: pointer.y,
                fontSize: fontSize,
                fontFamily: fontFamily,
                fill: currentColor
            });

            fabricCanvas.add(text);
            fabricCanvas.setActiveObject(text);
            text.enterEditing();
        }
    });

    // Mouse move for drawing
    fabricCanvas.on('mouse:move', function (options) {
        if (isDrawing && (currentTool === 'pen' || currentTool === 'highlighter')) {
            const pointer = fabricCanvas.getPointer(options.e);
            const path = fabricCanvas.getActiveObject();

            if (path && path.type === 'path') {
                path.path.push(['L', pointer.x, pointer.y]);
                fabricCanvas.renderAll();
            }
        } else if ((currentTool === 'shape' || currentTool === 'line') && fabricCanvas.getActiveObject()) {
            const pointer = fabricCanvas.getPointer(options.e);
            const obj = fabricCanvas.getActiveObject();

            if (obj.type === 'rect') {
                obj.set({
                    width: Math.abs(pointer.x - lastX),
                    height: Math.abs(pointer.y - lastY),
                    left: Math.min(pointer.x, lastX),
                    top: Math.min(pointer.y, lastY)
                });
            } else if (obj.type === 'circle') {
                const radius = Math.sqrt(Math.pow(pointer.x - lastX, 2) + Math.pow(pointer.y - lastY, 2)) / 2;
                obj.set({
                    radius: radius,
                    left: lastX - radius,
                    top: lastY - radius
                });
            } else if (obj.type === 'triangle') {
                obj.set({
                    width: Math.abs(pointer.x - lastX),
                    height: Math.abs(pointer.y - lastY),
                    left: Math.min(pointer.x, lastX),
                    top: Math.min(pointer.y, lastY)
                });
            } else if (obj.type === 'line') {
                obj.set({
                    x2: pointer.x,
                    y2: pointer.y
                });
            } else if (obj.type === 'path' && obj.path) {
                // Handle custom shapes
                if (currentShape === 'arrow') {
                    const newArrow = createArrow(lastX, lastY, pointer.x, pointer.y);
                    fabricCanvas.remove(obj);
                    fabricCanvas.add(newArrow);
                    fabricCanvas.setActiveObject(newArrow);
                } else if (currentShape === 'star') {
                    const radius = Math.sqrt(Math.pow(pointer.x - lastX, 2) + Math.pow(pointer.y - lastY, 2));
                    const newStar = new fabric.Path(createStarPath(lastX, lastY, radius), {
                        stroke: currentColor,
                        strokeWidth: currentBrushSize,
                        fill: document.getElementById('fill-shape').checked ? currentColor : 'transparent'
                    });
                    fabricCanvas.remove(obj);
                    fabricCanvas.add(newStar);
                    fabricCanvas.setActiveObject(newStar);
                } else if (currentShape === 'cloud') {
                    const radius = Math.sqrt(Math.pow(pointer.x - lastX, 2) + Math.pow(pointer.y - lastY, 2));
                    const newCloud = createCloud(lastX, lastY, radius);
                    fabricCanvas.remove(obj);
                    fabricCanvas.add(newCloud);
                    fabricCanvas.setActiveObject(newCloud);
                }
            }

            fabricCanvas.renderAll();
        }
    });

    // Mouse up
    fabricCanvas.on('mouse:up', function () {
        isDrawing = false;
        if (currentTool === 'shape' || currentTool === 'line') {
            saveHistory();
            hasUnsavedChanges = true;
        }
    });
}

// Create arrow shape
function createArrow(x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = 20;

    // Arrow line
    const path = `M ${x1} ${y1} L ${x2} ${y2}`;

    // Arrow head
    const arrowHead = `M ${x2} ${y2} L ${x2 - headLength * Math.cos(angle - Math.PI / 6)} ${y2 - headLength * Math.sin(angle - Math.PI / 6)} L ${x2 - headLength * Math.cos(angle + Math.PI / 6)} ${y2 - headLength * Math.sin(angle + Math.PI / 6)} Z`;

    return new fabric.Path(path + ' ' + arrowHead, {
        stroke: currentColor,
        strokeWidth: currentBrushSize,
        fill: document.getElementById('fill-shape').checked ? currentColor : 'transparent'
    });
}

// Create star path
function createStarPath(cx, cy, radius) {
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius * 0.5;
    let path = `M ${cx} ${cy - outerRadius}`;

    for (let i = 1; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        path += ` L ${cx + Math.sin(angle) * r} ${cy - Math.cos(angle) * r}`;
    }

    return path + ' Z';
}

// Create cloud shape
function createCloud(cx, cy, radius) {
    const path = `M ${cx - radius * 0.7} ${cy} 
                 Q ${cx - radius} ${cy - radius * 0.3} ${cx - radius * 0.5} ${cy - radius * 0.5}
                 Q ${cx - radius * 0.3} ${cy - radius} ${cx} ${cy - radius * 0.5}
                 Q ${cx + radius * 0.3} ${cy - radius} ${cx + radius * 0.5} ${cy - radius * 0.5}
                 Q ${cx + radius} ${cy - radius * 0.3} ${cx + radius * 0.7} ${cy}
                 Q ${cx + radius} ${cy + radius * 0.3} ${cx + radius * 0.5} ${cy + radius * 0.5}
                 Q ${cx + radius * 0.3} ${cy + radius} ${cx} ${cy + radius * 0.5}
                 Q ${cx - radius * 0.3} ${cy + radius} ${cx - radius * 0.5} ${cy + radius * 0.5}
                 Q ${cx - radius} ${cy + radius * 0.3} ${cx - radius * 0.7} ${cy} Z`;

    return new fabric.Path(path, {
        stroke: currentColor,
        strokeWidth: currentBrushSize,
        fill: document.getElementById('fill-shape').checked ? currentColor : 'transparent'
    });
}

// Update UI
function updateUI() {
    updateToolInfo();
    updateColorInfo();
    updateBrushInfo();
    updatePageInfo();
    updateZoomInfo();
}

function updateToolInfo() {
    const toolNames = {
        'select': 'Select',
        'pen': 'Pen',
        'highlighter': 'Highlighter',
        'eraser': 'Eraser',
        'text': 'Text',
        'shape': 'Shape',
        'line': 'Line',
        'pan': 'Pan'
    };

    document.getElementById('current-tool').textContent = toolNames[currentTool] || currentTool;
}

function updateColorInfo() {
    document.getElementById('current-color').textContent = currentColor.toUpperCase();
}

function updateBrushInfo() {
    document.getElementById('brush-size').textContent = `Size: ${currentBrushSize}px`;
}

function updatePageInfo() {
    document.getElementById('current-page').textContent = `Page ${currentPage + 1}`;
    document.getElementById('total-pages').textContent = pages.length;
}

function updateZoomInfo() {
    document.getElementById('zoom-level').textContent = `${Math.round(zoomLevel * 100)}%`;
}

function updateCursor() {
    const container = document.getElementById('canvas-container');
    container.className = 'whiteboard-canvas-container';

    switch (currentTool) {
        case 'pen':
        case 'highlighter':
            container.classList.add('pen-cursor');
            break;
        case 'eraser':
            container.classList.add('eraser-cursor');
            break;
        case 'text':
            container.classList.add('text-cursor');
            break;
        case 'shape':
        case 'line':
            container.classList.add('shape-cursor');
            break;
        case 'pan':
            container.classList.add('grab-cursor');
            break;
        default:
            container.classList.add('select-cursor');
    }
}

function updateToolSections() {
    const shapesSection = document.getElementById('shapes-section');
    const textSection = document.getElementById('text-section');

    if (currentTool === 'shape') {
        shapesSection.style.display = 'block';
        textSection.style.display = 'none';
    } else if (currentTool === 'text') {
        shapesSection.style.display = 'none';
        textSection.style.display = 'block';
    } else {
        shapesSection.style.display = 'none';
        textSection.style.display = 'none';
    }
}

// Update canvas boundary
function updateCanvasBoundary() {
    const boundary = document.getElementById('canvas-boundary');
    const objects = fabricCanvas.getObjects();

    if (objects.length === 0) {
        boundary.style.display = 'none';
        return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    objects.forEach(obj => {
        const bounds = obj.getBoundingRect();
        minX = Math.min(minX, bounds.left);
        minY = Math.min(minY, bounds.top);
        maxX = Math.max(maxX, bounds.left + bounds.width);
        maxY = Math.max(maxY, bounds.top + bounds.height);
    });

    // Add padding
    const padding = 100;
    boundary.style.left = `${minX - padding}px`;
    boundary.style.top = `${minY - padding}px`;
    boundary.style.width = `${maxX - minX + padding * 2}px`;
    boundary.style.height = `${maxY - minY + padding * 2}px`;
    boundary.style.display = 'block';
}

// Update page content
function updatePage() {
    if (pages[currentPage]) {
        pages[currentPage].objects = fabricCanvas.toJSON();
        pages[currentPage].updatedAt = new Date().toISOString();
    }
}

// Save current state to history
function saveHistory() {
    // Remove future history if we're not at the end
    history = history.slice(0, historyIndex + 1);

    // Save current state
    const state = JSON.stringify(fabricCanvas.toJSON());
    history.push(state);
    historyIndex++;

    // Limit history size
    if (history.length > 50) {
        history.shift();
        historyIndex--;
    }
}

// Undo
function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        fabricCanvas.loadFromJSON(history[historyIndex], function () {
            fabricCanvas.renderAll();
            updateCanvasBoundary();
        });
        hasUnsavedChanges = true;
    }
}

// Redo
function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        fabricCanvas.loadFromJSON(history[historyIndex], function () {
            fabricCanvas.renderAll();
            updateCanvasBoundary();
        });
        hasUnsavedChanges = true;
    }
}

// Clear whiteboard
function clearWhiteboard() {
    if (confirm('Are you sure you want to clear the entire whiteboard? This action cannot be undone.')) {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#f8fafc';
        saveHistory();
        hasUnsavedChanges = true;
        updateCanvasBoundary();
    }
}

// New whiteboard
function newWhiteboard() {
    if (hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Create new whiteboard anyway?')) {
            return;
        }
    }

    createNewPage();
    hasUnsavedChanges = false;
}

// Save whiteboard
function saveWhiteboard() {
    const filename = document.getElementById('save-filename').value || `Whiteboard_${new Date().toISOString().split('T')[0]}`;
    const format = document.getElementById('save-format').value;

    switch (format) {
        case 'json':
            saveAsJSON(filename);
            break;
        case 'png':
            saveAsPNG(filename);
            break;
        case 'jpg':
            saveAsJPG(filename);
            break;
        case 'pdf':
            saveAsPDF(filename);
            break;
        case 'svg':
            saveAsSVG(filename);
            break;
    }

    hideSaveModal();
    hasUnsavedChanges = false;
    updateStorageInfo();
}

// Save as JSON
function saveAsJSON(filename) {
    const data = {
        version: '1.0',
        pages: pages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
            currentPage: currentPage,
            currentColor: currentColor,
            currentBrushSize: currentBrushSize,
            currentTool: currentTool
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Save to localStorage for quick load
    const saves = JSON.parse(localStorage.getItem('whiteboard_saves') || '[]');
    saves.unshift({
        id: Date.now(),
        name: filename,
        data: data,
        timestamp: new Date().toISOString(),
        type: 'json'
    });

    // Keep only last 20 saves
    if (saves.length > 20) saves.pop();

    localStorage.setItem('whiteboard_saves', JSON.stringify(saves));

    showNotification('Whiteboard saved successfully!', 'success');
}

// Save as PNG
function saveAsPNG(filename) {
    const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 2
    });

    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showNotification('PNG exported successfully!', 'success');
}

// Save as JPG
function saveAsJPG(filename) {
    const dataURL = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.95,
        multiplier: 2
    });

    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `${filename}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showNotification('JPEG exported successfully!', 'success');
}

// Save as PDF (simplified)
function saveAsPDF(filename) {
    showNotification('PDF export coming soon!', 'info');
    // Note: For production, use a library like jsPDF or html2pdf
}

// Save as SVG
function saveAsSVG(filename) {
    const svg = fabricCanvas.toSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('SVG exported successfully!', 'success');
}

// Load whiteboard
function loadWhiteboard(id) {
    const saves = JSON.parse(localStorage.getItem('whiteboard_saves') || '[]');
    const save = saves.find(s => s.id === id);

    if (!save) {
        showNotification('File not found!', 'error');
        return;
    }

    if (save.type === 'json') {
        pages = save.data.pages;
        currentPage = save.data.settings.currentPage || 0;
        currentColor = save.data.settings.currentColor || '#000000';
        currentBrushSize = save.data.settings.currentBrushSize || 3;

        // Load current page
        if (pages[currentPage] && pages[currentPage].objects) {
            fabricCanvas.loadFromJSON(pages[currentPage].objects, function () {
                fabricCanvas.renderAll();
                updateCanvasBoundary();
                updateUI();
            });
        }

        hasUnsavedChanges = false;
        showNotification('Whiteboard loaded successfully!', 'success');
        hideLoadModal();
    }
}

// Import whiteboard
function importWhiteboard() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.png,.jpg,.jpeg,.svg';

    input.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            if (file.name.endsWith('.json')) {
                try {
                    const data = JSON.parse(event.target.result);
                    pages = data.pages || [data];
                    currentPage = 0;

                    if (pages[currentPage] && pages[currentPage].objects) {
                        fabricCanvas.loadFromJSON(pages[currentPage].objects, function () {
                            fabricCanvas.renderAll();
                            updateCanvasBoundary();
                            updateUI();
                        });
                    }

                    hasUnsavedChanges = true;
                    showNotification('Whiteboard imported successfully!', 'success');
                } catch (error) {
                    showNotification('Error loading file: Invalid format', 'error');
                }
            } else {
                // Load as image
                fabric.Image.fromURL(event.target.result, function (img) {
                    fabricCanvas.clear();
                    fabricCanvas.add(img);
                    fabricCanvas.renderAll();
                    saveHistory();
                    hasUnsavedChanges = true;
                    showNotification('Image imported successfully!', 'success');
                });
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

// Insert image
function insertImage() {
    const input = document.getElementById('hidden-image-upload');
    input.click();

    input.onchange = function (e) {
        const files = e.target.files;
        if (!files.length) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function (event) {
                fabric.Image.fromURL(event.target.result, function (img) {
                    img.set({
                        left: fabricCanvas.width / 2 - img.width / 2,
                        top: fabricCanvas.height / 2 - img.height / 2,
                        scaleX: 0.5,
                        scaleY: 0.5
                    });

                    fabricCanvas.add(img);
                    fabricCanvas.setActiveObject(img);
                    fabricCanvas.renderAll();
                    saveHistory();
                    hasUnsavedChanges = true;
                    updateCanvasBoundary();
                });
            };
            reader.readAsDataURL(file);
        });
    };
}

// Insert video
function insertVideo() {
    const input = document.getElementById('hidden-video-upload');
    input.click();

    input.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const url = URL.createObjectURL(file);

        // Create video element
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.style.width = '300px';
        video.style.height = 'auto';

        // Convert to fabric object
        const videoEl = new fabric.Image(video, {
            left: fabricCanvas.width / 2 - 150,
            top: fabricCanvas.height / 2 - 100,
            width: 300,
            height: 200
        });

        fabricCanvas.add(videoEl);
        fabricCanvas.setActiveObject(videoEl);
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
        updateCanvasBoundary();

        showNotification('Video inserted! Double-click to play.', 'info');
    };
}

// Audio recording
function toggleAudioRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);

                recordings.push({
                    url: audioUrl,
                    blob: audioBlob,
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - recordingStartTime
                });

                // Add to canvas as note
                const note = new fabric.Text('🎤 Audio Note', {
                    left: fabricCanvas.width / 2 - 75,
                    top: fabricCanvas.height / 2,
                    fontSize: 20,
                    fill: currentColor,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: 10
                });

                note.on('mousedown', function () {
                    const audio = new Audio(audioUrl);
                    audio.play();
                });

                fabricCanvas.add(note);
                fabricCanvas.renderAll();
                saveHistory();
                hasUnsavedChanges = true;

                document.getElementById('play-btn').disabled = false;
                showNotification('Audio recorded and attached! Click the note to play.', 'success');
            };

            mediaRecorder.start();
            isRecording = true;
            recordingStartTime = Date.now();

            // Update UI
            document.getElementById('record-btn').innerHTML = '<i class="fas fa-stop"></i><span>Stop Recording</span>';
            document.getElementById('recording-indicator').classList.add('active');

            // Start timer
            startRecordingTimer();
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            showNotification('Cannot access microphone. Please check permissions.', 'error');
        });
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;

        // Update UI
        document.getElementById('record-btn').innerHTML = '<i class="fas fa-microphone"></i><span>Start Recording</span>';
        document.getElementById('recording-indicator').classList.remove('active');
        stopRecordingTimer();
    }
}

let recordingTimer;
function startRecordingTimer() {
    let seconds = 0;
    const timerElement = document.getElementById('recording-timer');

    recordingTimer = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopRecordingTimer() {
    clearInterval(recordingTimer);
    document.getElementById('recording-timer').textContent = '00:00';
}

function playRecordings() {
    if (recordings.length > 0) {
        const audio = new Audio(recordings[recordings.length - 1].url);
        audio.play();
    }
}

// Zoom functions
function zoomIn() {
    zoomLevel = Math.min(zoomLevel * 1.2, 5);
    applyZoom();
}

function zoomOut() {
    zoomLevel = Math.max(zoomLevel / 1.2, 0.2);
    applyZoom();
}

function resetZoom() {
    zoomLevel = 1;
    applyZoom();
}

function applyZoom() {
    fabricCanvas.setZoom(zoomLevel);
    updateZoomInfo();
}

// Page navigation
function nextPage() {
    if (currentPage < pages.length - 1) {
        currentPage++;
        loadPage(currentPage);
    }
}

function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        loadPage(currentPage);
    }
}

function addPage() {
    createNewPage();
}

function deletePage() {
    if (pages.length > 1) {
        if (confirm('Delete this page?')) {
            pages.splice(currentPage, 1);
            if (currentPage >= pages.length) {
                currentPage = pages.length - 1;
            }
            loadPage(currentPage);
        }
    } else {
        showNotification('Cannot delete the only page!', 'error');
    }
}

function loadPage(pageIndex) {
    if (pages[pageIndex]) {
        if (pages[pageIndex].objects) {
            fabricCanvas.loadFromJSON(pages[pageIndex].objects, function () {
                fabricCanvas.renderAll();
                updateCanvasBoundary();
            });
        } else {
            fabricCanvas.clear();
            fabricCanvas.backgroundColor = pages[pageIndex].background || '#f8fafc';
        }
        updatePageInfo();
    }
}

// Toggle grid
function toggleGrid() {
    const container = document.getElementById('canvas-container');
    const hasGrid = container.style.backgroundImage.includes('linear-gradient');

    if (hasGrid) {
        container.style.backgroundImage = 'none';
    } else {
        container.style.backgroundImage = `
            linear-gradient(var(--grid-color) 1px, transparent 1px) 0 0 / 50px 50px,
            linear-gradient(90deg, var(--grid-color) 1px, transparent 1px) 0 0 / 50px 50px
        `;
    }
}

// Fullscreen
function toggleFullscreen() {
    const elem = document.documentElement;

    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Context menu
function showContextMenu(x, y) {
    const menu = document.getElementById('context-menu');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';

    // Hide menu when clicking elsewhere
    document.addEventListener('click', hideContextMenu);
}

function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    menu.style.display = 'none';
    document.removeEventListener('click', hideContextMenu);
}

// Object manipulation
function deleteSelected() {
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
        activeObjects.forEach(obj => fabricCanvas.remove(obj));
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
        updateCanvasBoundary();
    }
    hideContextMenu();
}

function copySelected() {
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
        fabricCanvas.getActiveObject().clone(function (cloned) {
            fabricCanvas.clipboard = cloned;
        });
        showNotification('Copied to clipboard!', 'success');
    }
    hideContextMenu();
}

function pasteSelected() {
    if (fabricCanvas.clipboard) {
        fabricCanvas.clipboard.clone(function (clonedObj) {
            fabricCanvas.discardActiveObject();
            clonedObj.set({
                left: clonedObj.left + 20,
                top: clonedObj.top + 20,
                evented: true
            });

            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = fabricCanvas;
                clonedObj.forEachObject(function (obj) {
                    fabricCanvas.add(obj);
                });
                clonedObj.setCoords();
            } else {
                fabricCanvas.add(clonedObj);
            }

            fabricCanvas.setActiveObject(clonedObj);
            fabricCanvas.requestRenderAll();
            saveHistory();
            hasUnsavedChanges = true;
            updateCanvasBoundary();
        });
        showNotification('Pasted!', 'success');
    }
    hideContextMenu();
}

function bringToFront() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
        activeObject.bringToFront();
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
    }
    hideContextMenu();
}

function sendToBack() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
        activeObject.sendToBack();
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
    }
    hideContextMenu();
}

function groupObjects() {
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 1) {
        const group = new fabric.Group(activeObjects);
        fabricCanvas.remove(...activeObjects);
        fabricCanvas.add(group);
        fabricCanvas.setActiveObject(group);
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
        showNotification('Objects grouped!', 'success');
    }
    hideContextMenu();
}

function ungroupObjects() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === 'group') {
        const objects = activeObject.getObjects();
        fabricCanvas.remove(activeObject);
        objects.forEach(obj => {
            fabricCanvas.add(obj);
        });
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
        showNotification('Objects ungrouped!', 'success');
    }
    hideContextMenu();
}

// Update selection properties
function updateSelectionProperties() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
        // Update color picker if object has stroke or fill
        if (activeObject.stroke) {
            setColor(activeObject.stroke);
        } else if (activeObject.fill && typeof activeObject.fill === 'string') {
            setColor(activeObject.fill);
        }

        // Update brush size if object has strokeWidth
        if (activeObject.strokeWidth) {
            setBrushSize(activeObject.strokeWidth);
        }
    }
}

function clearSelectionProperties() {
    // Reset to default properties when nothing is selected
}

// Auto-save
function startAutoSave() {
    autoSaveInterval = setInterval(() => {
        if (hasUnsavedChanges) {
            autoSave();
        }
    }, 30000); // Auto-save every 30 seconds

    // Also save on visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && hasUnsavedChanges) {
            autoSave();
        }
    });
}

function autoSave() {
    const autoSaveData = {
        pages: pages,
        currentPage: currentPage,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('whiteboard_autosave', JSON.stringify(autoSaveData));
    hasUnsavedChanges = false;

    // Update auto-save time
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('auto-save').textContent = `Auto-saved: ${timeString}`;
}

function loadAutoSave() {
    const autoSaveData = localStorage.getItem('whiteboard_autosave');
    if (autoSaveData) {
        try {
            const data = JSON.parse(autoSaveData);
            const savedTime = new Date(data.timestamp);
            const now = new Date();
            const diffHours = (now - savedTime) / (1000 * 60 * 60);

            if (diffHours < 24) { // Only load if less than 24 hours old
                if (confirm('Found an auto-saved whiteboard. Load it?')) {
                    pages = data.pages || [];
                    currentPage = data.currentPage || 0;
                    loadPage(currentPage);
                    hasUnsavedChanges = false;
                    showNotification('Auto-saved whiteboard loaded!', 'success');
                }
            }
        } catch (error) {
            console.error('Error loading auto-save:', error);
        }
    }
}

// Update storage info
function updateStorageInfo() {
    const saves = JSON.parse(localStorage.getItem('whiteboard_saves') || '[]');
    const autoSave = localStorage.getItem('whiteboard_autosave');

    let totalSize = 0;

    // Calculate size of saves
    saves.forEach(save => {
        totalSize += JSON.stringify(save).length;
    });

    // Add auto-save size
    if (autoSave) {
        totalSize += autoSave.length;
    }

    // Convert to MB
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    document.getElementById('storage-used').textContent = `Storage: ${sizeMB}MB`;
}

// Load saved files list
function loadSavedFiles() {
    const saves = JSON.parse(localStorage.getItem('whiteboard_saves') || '[]');
    const saveList = document.getElementById('saved-files-list');
    const loadList = document.getElementById('load-files-list');

    saveList.innerHTML = '';
    loadList.innerHTML = '';

    if (saves.length === 0) {
        saveList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No saved whiteboards yet.</p>';
        loadList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No saved whiteboards yet.</p>';
        return;
    }

    saves.forEach(save => {
        const time = new Date(save.timestamp).toLocaleString();

        const saveItem = document.createElement('div');
        saveItem.className = 'save-item';
        saveItem.innerHTML = `
            <div class="save-info">
                <h4>${save.name}</h4>
                <span>${time} • ${save.type.toUpperCase()}</span>
            </div>
            <div class="save-actions">
                <button class="action-btn small" onclick="loadWhiteboard(${save.id})">
                    <i class="fas fa-folder-open"></i>
                </button>
                <button class="action-btn small danger" onclick="deleteSave(${save.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        const loadItem = saveItem.cloneNode(true);

        saveList.appendChild(saveItem);
        loadList.appendChild(loadItem);
    });
}

function deleteSave(id) {
    if (confirm('Delete this saved whiteboard?')) {
        const saves = JSON.parse(localStorage.getItem('whiteboard_saves') || '[]');
        const filtered = saves.filter(save => save.id !== id);
        localStorage.setItem('whiteboard_saves', JSON.stringify(filtered));
        loadSavedFiles();
        updateStorageInfo();
        showNotification('Saved whiteboard deleted!', 'success');
    }
}

// Collaboration
function generateInviteLink() {
    const roomId = 'wb_' + Math.random().toString(36).substr(2, 9);
    const inviteLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    document.getElementById('invite-link').value = inviteLink;
}

function copyInviteLink() {
    const input = document.getElementById('invite-link');
    input.select();
    input.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(input.value)
        .then(() => {
            showNotification('Invite link copied to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            showNotification('Failed to copy link', 'error');
        });
}

function showCollaborationModal() {
    document.getElementById('collab-modal').style.display = 'flex';
}

function hideCollaborationModal() {
    document.getElementById('collab-modal').style.display = 'none';
}

function startCollaboration() {
    showNotification('Collaboration session started! Share the link with others.', 'success');
    hideCollaborationModal();
}

// Modal controls
function showSaveModal() {
    document.getElementById('save-modal').style.display = 'flex';
    loadSavedFiles();
}

function hideSaveModal() {
    document.getElementById('save-modal').style.display = 'none';
}

function showLoadModal() {
    document.getElementById('load-modal').style.display = 'flex';
    loadSavedFiles();
}

function hideLoadModal() {
    document.getElementById('load-modal').style.display = 'none';
}

function closeModals() {
    hideSaveModal();
    hideLoadModal();
    hideCollaborationModal();
    hideContextMenu();
}

// Export whiteboard
function exportWhiteboard() {
    const format = prompt('Export format (png, jpg, svg, json):', 'png').toLowerCase();

    switch (format) {
        case 'png':
            saveAsPNG(`whiteboard_export_${new Date().toISOString().split('T')[0]}`);
            break;
        case 'jpg':
        case 'jpeg':
            saveAsJPG(`whiteboard_export_${new Date().toISOString().split('T')[0]}`);
            break;
        case 'svg':
            saveAsSVG(`whiteboard_export_${new Date().toISOString().split('T')[0]}`);
            break;
        case 'json':
            saveAsJSON(`whiteboard_export_${new Date().toISOString().split('T')[0]}`);
            break;
        default:
            showNotification('Invalid format! Use png, jpg, svg, or json.', 'error');
    }
}

// Text properties
function updateFontSize(size) {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text')) {
        activeObject.set({ fontSize: parseInt(size) });
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
    }
}

function updateFontFamily(font) {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text')) {
        activeObject.set({ fontFamily: font });
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
    }
}

function setTextBold() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text')) {
        const isBold = activeObject.fontWeight === 'bold';
        activeObject.set({ fontWeight: isBold ? 'normal' : 'bold' });
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
    }
}

function setTextItalic() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text')) {
        const isItalic = activeObject.fontStyle === 'italic';
        activeObject.set({ fontStyle: isItalic ? 'normal' : 'italic' });
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
    }
}

function setTextUnderline() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text')) {
        const isUnderlined = activeObject.textDecoration === 'underline';
        activeObject.set({ textDecoration: isUnderlined ? '' : 'underline' });
        fabricCanvas.renderAll();
        saveHistory();
        hasUnsavedChanges = true;
    }
}

// Utility functions
function rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;

    const result = rgb.match(/\d+/g);
    if (!result) return '#000000';

    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #064e3b, #047857)' :
            type === 'error' ? 'linear-gradient(135deg, #7f1d1d, #dc2626)' :
                'linear-gradient(135deg, #1e3a8a, #3b82f6)'};
        color: white;
        padding: 16px 24px;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        box-shadow: var(--shadow);
        transform: translateX(100%);
        opacity: 0;
        transition: transform 0.3s, opacity 0.3s;
        max-width: 400px;
    `;

    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Event listeners setup
function setupEventListeners() {
    // File uploads
    document.getElementById('image-upload').addEventListener('change', function (e) {
        insertImageFromFile(e.target.files);
    });

    document.getElementById('document-upload').addEventListener('change', function (e) {
        insertDocumentsFromFile(e.target.files);
    });

    // Font size slider
    document.getElementById('font-size-slider').addEventListener('input', function (e) {
        updateFontSize(e.target.value);
    });

    // Font family select
    document.getElementById('font-family').addEventListener('change', function (e) {
        updateFontFamily(e.target.value);
    });

    // Fill shape checkbox
    document.getElementById('fill-shape').addEventListener('change', function (e) {
        // Update any selected shapes
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject && (activeObject.type === 'rect' || activeObject.type === 'circle' ||
            activeObject.type === 'triangle' || activeObject.type === 'path')) {
            activeObject.set({ fill: e.target.checked ? currentColor : 'transparent' });
            fabricCanvas.renderAll();
            saveHistory();
            hasUnsavedChanges = true;
        }
    });
}

// Helper functions for file insertion
function insertImageFromFile(files) {
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function (event) {
            fabric.Image.fromURL(event.target.result, function (img) {
                img.set({
                    left: fabricCanvas.width / 2 - img.width / 2,
                    top: fabricCanvas.height / 2 - img.height / 2,
                    scaleX: 0.5,
                    scaleY: 0.5
                });

                fabricCanvas.add(img);
                fabricCanvas.setActiveObject(img);
                fabricCanvas.renderAll();
                saveHistory();
                hasUnsavedChanges = true;
                updateCanvasBoundary();
            });
        };
        reader.readAsDataURL(file);
    });
}

function insertDocumentsFromFile(files) {
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function (event) {
            // Create a text object with document info
            const text = new fabric.Text(`📄 ${file.name}`, {
                left: fabricCanvas.width / 2,
                top: fabricCanvas.height / 2,
                fontSize: 16,
                fill: currentColor,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: 10
            });

            // Store file data as custom property
            text.fileData = event.target.result;
            text.fileName = file.name;
            text.fileType = file.type;

            // Add click handler to download/view
            text.on('mousedown', function () {
                const a = document.createElement('a');
                a.href = text.fileData;
                a.download = text.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            fabricCanvas.add(text);
            fabricCanvas.renderAll();
            saveHistory();
            hasUnsavedChanges = true;
            updateCanvasBoundary();
        };
        reader.readAsDataURL(file);
    });
}

// Initialize
console.log('Whiteboard application loaded successfully');