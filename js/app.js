// Main application logic for EXIF Frame Generator
import { fmtExposure, fmtAperture, fmtDate, wrapLines } from './utils.js';
import { drawFilmDateStamp } from './dateStamp.js';
import { EditorController } from './editor-controller.js';
import { applyFilmFilter, FILM_FILTERS } from './filmFilters.js';

// Show toast notification
function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        white-space: nowrap;
        animation: toastSlideUp 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideDown 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, duration);
}

// Add CSS animation
if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes toastSlideUp {
            from { transform: translate(-50%, 100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes toastSlideDown {
            from { transform: translate(-50%, 0); opacity: 1; }
            to { transform: translate(-50%, 100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Global variables
const THEMES = {
    light: { name: 'Light', bg1: '#f5f5f4', bg2: '#ffffff', paper: '#ffffff', text: '#111827', sub: '#6b7280' },
    dark: { name: 'Dark', bg1: '#0b0b0b', bg2: '#1f2937', paper: '#0f1115', text: '#f5f5f5', sub: '#a1a1aa' }
};

// Application state
let state = {
    fileName: '',
    imageEl: null,
    originalImageEl: null,
    exif: {},
    themeKey: 'light',
    pad: 24,  // Default 24px
    fontScale: 0.8,  // Font size scale (default 80%)
    showCamera: true,
    showLens: true,
    showAperture: true,
    showShutter: true,
    showISO: true,
    showDate: true,
    // Film date is now controlled by dateStamp parameter in Film tool
    useImagePadding: false,  // Default off
    outputWidth: 1080,
    // Override values
    cameraOverride: '',
    lensOverride: '',
    isoOverride: '',
    apertureOverride: '',
    shutterOverride: '',
    dateOverride: '',
    // Image editor states
    cropRatio: null,  // Will be set to closest ratio when image loads
    customRatio: null,
    rotation: 0,
    flipH: false,
    flipV: false,
    cropRect: null,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    // Image adjustments
    exposure: 0,
    highlights: 0,
    shadows: 0,
    contrast: 0,
    whiteBalance: 0,
    saturation: 0,
    vibrance: 0,
    vignette: 0,
    grain: 0,
    // Date stamp adjustments
    dateOpacity: 60,
    dateBrightness: 100,
    dateBlur: 0.8,
    // Frame orientation
    frameOrientation: false,
    // Active parameter group
    activeParamGroup: 'crop'
};

// Get DOM elements
let canvas, dropZone, preview, themes;
let editorController;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    canvas = document.getElementById('canvas');
    dropZone = document.getElementById('dropZone');
    preview = document.getElementById('preview');
    
    const ctx = canvas ? canvas.getContext('2d') : null;
    
    // Prevent double tap zoom
    if (canvas) {
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    if (preview) {
        preview.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Event listeners
    const outputSizeSelect = document.getElementById('outputSizeSelect');
    const customSizeInput = document.getElementById('customSizeInput');
    const exportFormat = document.getElementById('exportFormat');
    
    // Set appropriate text for drop zone based on device
    const setDropZoneText = () => {
        const dropZoneText = document.querySelector('.drop-zone-text');
        if (!dropZoneText) return;
        
        // Default text
        dropZoneText.textContent = 'Drop Image or Click to Select';
        
        // Check for touch device using multiple methods
        const isTouchDevice = (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0 ||
            window.matchMedia("(pointer: coarse)").matches
        );
        
        if (isTouchDevice) {
            dropZoneText.textContent = 'Tap to Select Image';
        }
    };
    
    // Ensure DOM is loaded before setting text
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setDropZoneText);
    } else {
        setDropZoneText();
    }
    
    // Initialize all components
    initializeFileHandling();
    initializeOverrideInputs();
    initializeCheckboxes();
    initializeExportSettings();
    
    // Debug: Check if elements are properly initialized
    console.log('DOM elements check:', {
        canvas: !!canvas,
        dropZone: !!dropZone,
        preview: !!preview,
        fileInput: !!document.getElementById('fileInput')
    });
    
    // Initialize new editor controller
    editorController = new EditorController(state, (paramId) => {
        // Handle parameter changes
        if (paramId === 'rotation' || paramId === 'zoom' || 
            paramId === 'flipH' || paramId === 'flipV' || 
            paramId === 'ratio' || paramId === 'exposure' || 
            paramId === 'highlights' || paramId === 'shadows' || 
            paramId === 'contrast' || paramId === 'whiteBalance' ||
            paramId === 'saturation' || paramId === 'vibrance' ||
            paramId === 'vignette' || paramId === 'grain') {
            applyTransformations();
        } else if (paramId === 'orientation' || paramId === 'textPadding' || 
                   paramId === 'framePadding' || paramId === 'theme' || 
                   paramId === 'fontSize') {
            // Handle frame-related changes
            render();
        } else if (paramId === 'filmType' || paramId === 'filmStrength' || 
                   paramId === 'dateStamp' || paramId === 'dateOpacity' || 
                   paramId === 'dateBrightness' || paramId === 'dateBlur') {
            // Handle film-related changes
            render();
        } else {
            render();
        }
    });
    
    // Initialize editor
    editorController.init();
    
    // Show frame tool by default
    setTimeout(() => {
        // Use the proper method to activate the frame tool
        editorController.handleToolClick('frame');
    }, 100);
    
    // Disable UI when no image is loaded
    if (!state.imageEl) {
        // Add disabled class to parameter selector and slider
        const parameterSelector = document.getElementById('parameterSelector');
        const sliderContainer = document.getElementById('sliderContainer');
        
        if (parameterSelector) {
            parameterSelector.classList.add('disabled');
        }
        if (sliderContainer) {
            sliderContainer.classList.add('disabled');
        }
        
        // Disable all tool buttons
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
    }
    
    // Initialize old controls for settings
    initializeSettingsControls();
    
    // Update preview container height
    updatePreviewContainerHeight();
    
    // Update upload button visibility
    updateUploadBtnVisibility();
});

// Update EXIF placeholders with actual values
function updateEXIFPlaceholders() {
    const camera = [state.exif?.Make, state.exif?.Model].filter(Boolean).join(' ');
    const lens = state.exif?.LensModel || state.exif?.LensSpecification || state.exif?.LensMake || '';
    const aperture = fmtAperture(state.exif?.FNumber ?? state.exif?.ApertureValue);
    const shutter = fmtExposure(state.exif?.ExposureTime ?? state.exif?.ShutterSpeedValue);
    const iso = state.exif?.ISO ?? state.exif?.ISOSpeedRatings;
    const date = fmtDate(state.exif?.DateTimeOriginal || state.exif?.CreateDate || state.exif?.ModifyDate);
    
    const cameraInput = document.getElementById('cameraOverride');
    const lensInput = document.getElementById('lensOverride');
    const isoInput = document.getElementById('isoOverride');
    const apertureInput = document.getElementById('apertureOverride');
    const shutterInput = document.getElementById('shutterOverride');
    const dateInput = document.getElementById('dateOverride');
    
    if (cameraInput) cameraInput.placeholder = camera || 'No data';
    if (lensInput) lensInput.placeholder = lens || 'No data';
    if (isoInput) isoInput.placeholder = iso ? `ISO${iso}` : 'No data';
    if (apertureInput) apertureInput.placeholder = aperture || 'No data';
    if (shutterInput) shutterInput.placeholder = shutter || 'No data';
    if (dateInput) dateInput.placeholder = date || 'No data';
}

// File handling
async function handleFile(file) {
    console.log('handleFile called with:', file);
    if (!file) return;
    
    state.fileName = file.name || '';
    
    // Check if this is a RAW file
    const rawExtensions = ['.dng', '.cr2', '.cr3', '.nef', '.arw', '.orf', '.rw2', '.raf', '.pef', '.srw', '.x3f'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const isRaw = rawExtensions.includes(extension);
    
    // Parse EXIF first
    try {
        const data = await window.exifr.parse(file);
        state.exif = data || {};
        console.log('EXIF data:', state.exif);
        
        // For RAW files, try to extract embedded preview
        if (isRaw) {
            console.log('Processing RAW file:', file.name);
            try {
                // Extract thumbnail/preview from RAW
                const options = {
                    ifd0: true,
                    ifd1: true,
                    thumbnail: true,
                    exif: true,
                    gps: true,
                    interop: true,
                    // Specific settings for RW2
                    tiff: true,
                    makerNote: true,
                    userComment: true
                };
                
                let thumbnail = null;
                
                // Try different extraction methods
                try {
                    // Method 1: Standard thumbnail extraction
                    thumbnail = await window.exifr.thumbnail(file);
                    console.log('Thumbnail extracted using standard method');
                } catch (e1) {
                    console.log('Standard thumbnail extraction failed:', e1);
                    
                    try {
                        // Method 2: Parse with thumbnail option and extract manually
                        const output = await window.exifr.parse(file, { ...options, outputBinaryFields: true });
                        if (output && output.thumbnail && output.thumbnail.length > 0) {
                            thumbnail = output.thumbnail;
                            console.log('Thumbnail extracted from parse output');
                        }
                    } catch (e2) {
                        console.log('Manual thumbnail extraction failed:', e2);
                        
                        // Method 3: For RW2, try different approaches
                        if (extension === '.rw2') {
                            try {
                                // Try to get the JPEG preview from IFD0
                                const ifd0 = await window.exifr.parse(file, {
                                    ifd0: ['ImageWidth', 'ImageHeight', 'Compression', 'JPEGInterchangeFormat', 'JPEGInterchangeFormatLength'],
                                    exif: false,
                                    gps: false,
                                    interop: false,
                                    ifd1: false
                                });
                                
                                if (ifd0 && ifd0.JPEGInterchangeFormat && ifd0.JPEGInterchangeFormatLength) {
                                    // Read the JPEG data from the file
                                    const arrayBuffer = await file.arrayBuffer();
                                    const jpegData = new Uint8Array(arrayBuffer, ifd0.JPEGInterchangeFormat, ifd0.JPEGInterchangeFormatLength);
                                    thumbnail = jpegData;
                                    console.log('RW2 JPEG preview extracted from IFD0');
                                }
                            } catch (e3) {
                                console.log('RW2 IFD0 extraction failed:', e3);
                            }
                        }
                    }
                }
                
                if (thumbnail) {
                    console.log('RAW preview extracted, size:', thumbnail.length || thumbnail.byteLength);
                    // Create blob URL from thumbnail
                    const blob = new Blob([thumbnail], { type: 'image/jpeg' });
                    const url = URL.createObjectURL(blob);
                    
                    // Load thumbnail as image
                    const img = new Image();
                    img.onerror = (e) => {
                        console.error('Preview load error:', e);
                        alert('Could not load RAW preview. The file may not contain an embedded preview.');
                    };
                    img.onload = () => {
                        console.log('RAW preview loaded:', img.width, 'x', img.height);
                        processLoadedImage(img);
                        
                        // Show RAW mode indicator
                        showRawModeIndicator();
                    };
                    img.src = url;
                    return;
                }
            } catch (err) {
                console.error('Error extracting RAW preview:', err);
            }
            
            // Provide specific help for RW2 files
            if (extension === '.rw2') {
                alert('RW2ファイルのプレビューを抽出できませんでした。\n\n' +
                      '推奨される解決方法：\n' +
                      '1. Adobe DNG Converter（無料）でDNG形式に変換\n' +
                      '2. LUMIX/SILKYPIX等の純正ソフトでJPEG書き出し\n' +
                      '3. オンラインコンバーター（CloudConvert等）を使用\n\n' +
                      'DNG形式への変換が最も推奨されます（画質・EXIF保持）');
            } else {
                alert('This RAW file does not contain an embedded preview.\n\nPlease convert to JPEG/PNG for editing.');
            }
            return;
        }
    } catch (err) {
        console.error('EXIF parse error:', err);
        state.exif = {};
    }
    
    // Read regular image files
    const reader = new FileReader();
    reader.onload = () => {
        console.log('FileReader loaded');
        const img = new Image();
        img.onerror = (e) => {
            console.error('Image load error:', e);
        };
        img.onload = () => {
            console.log('Image loaded:', img.width, 'x', img.height);
            processLoadedImage(img);
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
}

// Process loaded image (common for regular and RAW files)
function processLoadedImage(img) {
    state.originalImageEl = img;
    state.imageEl = img;
            
            // Calculate image aspect ratio and find closest match
            const imageAspectRatio = img.width / img.height;
            const ratioOptions = {
                '1:1': 1,
                '4:3': 4/3,
                '3:2': 3/2,
                '16:9': 16/9
            };
            
            // Find closest ratio
            let closestRatio = null;
            let closestDiff = Infinity;
            let closestIndex = 0;
            
            Object.entries(ratioOptions).forEach(([key, value], index) => {
                const diff = Math.abs(imageAspectRatio - value);
                if (diff < closestDiff) {
                    closestDiff = diff;
                    closestRatio = key;
                    closestIndex = index;
                }
            });
            
            // Reset editor states when new image loaded
            state.cropRatio = closestRatio;
            state.originalAspectRatioIndex = closestIndex; // Remember which ratio is closest to original
            state.rotation = 0;
            state.flipH = false;
            state.flipV = false;
            state.cropRect = null;
            state.zoom = 1;
            state.offsetX = 0;
            state.offsetY = 0;
            
            // Update the Frame ratio UI if it's active
            if (editorController && editorController.logic.activeTool === 'frame') {
                // The ratio options are now: 1:1, 4:3, 3:2, 16:9
                editorController.logic.updateParamValue('ratio', closestIndex);
                
                // Update the UI
                const displayValue = editorController.logic.formatDisplayValue('ratio', closestIndex);
                editorController.view.updateParameterValue('ratio', displayValue);
                editorController.view.updateParameterProgress('ratio', (closestIndex / 3) * 100); // 3 because we have 4 options (0-3)
                
                // If the ratio parameter is currently shown, update the collection slider
                if (editorController.logic.activeParam === 'ratio') {
                    editorController.showParameter('ratio');
                }
            }
            if (document.getElementById('rotationSlider')) document.getElementById('rotationSlider').value = '0';
            if (document.getElementById('rotationValue')) document.getElementById('rotationValue').textContent = '0°';
            const editorControls = document.getElementById('editorControls');
            if (editorControls) {
                editorControls.classList.add('active');
                // Update height immediately when editor becomes active
                requestAnimationFrame(() => {
                    updatePreviewContainerHeight();
                });
            }
            
            canvas.style.display = 'block';
            if (dropZone) dropZone.style.display = 'none';
            
            // Editor is already visible, just ensure it's active
            const editor = document.getElementById('editorControls');
            if (editor) {
                editor.classList.add('active');
            }
            
            // Enable UI when image is loaded
            const toolButtons = document.querySelectorAll('.tool-btn');
            toolButtons.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('disabled');
            });
            
            // Enable parameter selector and slider
            const parameterSelector = document.getElementById('parameterSelector');
            const sliderContainer = document.getElementById('sliderContainer');
            
            if (parameterSelector) {
                parameterSelector.classList.remove('disabled');
            }
            if (sliderContainer) {
                sliderContainer.classList.remove('disabled');
            }
            
            // Update upload button visibility
            updateUploadBtnVisibility();
            
            // Update preview container height after editor becomes active
            setTimeout(() => updatePreviewContainerHeight(), 100);
            
            // Update EXIF placeholders
            updateEXIFPlaceholders();
            
            render();
}

// Show RAW mode indicator
function showRawModeIndicator() {
    const warning = document.createElement('div');
    warning.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #ff9800; color: white; padding: 10px 20px; border-radius: 4px; z-index: 9999; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
    warning.textContent = 'RAW Preview Mode - Using embedded preview image';
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 5000);
}

// Apply image transformations
function applyTransformations() {
    if (!state.originalImageEl) {
        return;
    }
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    let img = state.originalImageEl;
    
    // Determine target output dimensions based on crop ratio
    let targetW, targetH;
    const ratios = {
        '1:1': 1,
        '4:3': 4/3,
        '3:2': 3/2,
        '16:9': 16/9
    };
    
    if (state.cropRatio && ratios[state.cropRatio]) {
        const targetRatio = ratios[state.cropRatio];
        // Use a standard width for consistency
        targetW = 1000;
        targetH = targetW / targetRatio;
    } else {
        // No crop - use original aspect ratio
        const scale = 1000 / img.width;
        targetW = 1000;
        targetH = img.height * scale;
    }
    
    tempCanvas.width = targetW;
    tempCanvas.height = targetH;
    
    // Calculate rotation parameters
    const angle = state.rotation * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const absCos = Math.abs(cos);
    const absSin = Math.abs(sin);
    
    // Image dimensions
    const imgW = img.width;
    const imgH = img.height;
    
    // Calculate scale to fill the canvas
    // This ensures the image always covers the entire output area
    let baseScale;
    
    if (state.rotation === 0) {
        // No rotation - simple fill
        const scaleX = targetW / imgW;
        const scaleY = targetH / imgH;
        baseScale = Math.max(scaleX, scaleY);
    } else {
        // With rotation, we need to ensure the rotated image still fills the frame
        // Calculate the scale needed for each edge of the target to be covered
        
        // When rotated, the effective width and height that need to cover the target
        const coverW = targetW * absCos + targetH * absSin;
        const coverH = targetW * absSin + targetH * absCos;
        
        // Scale needed to cover
        const scaleX = coverW / imgW;
        const scaleY = coverH / imgH;
        
        baseScale = Math.max(scaleX, scaleY);
    }
    
    // Apply zoom on top of base scale
    const totalScale = baseScale * state.zoom;
    
    const drawW = imgW * totalScale;
    const drawH = imgH * totalScale;
    
    // Calculate maximum allowed offset to keep image filling the canvas
    // We need to ensure that the rotated image always covers all four corners of the canvas
    
    // For a rotated rectangle, calculate the maximum distance we can move
    // before a corner of the canvas becomes uncovered
    if (totalScale > 0) {
        // Calculate the extent of the rotated image from center
        const rotatedExtentX = (drawW * absCos + drawH * absSin) / 2;
        const rotatedExtentY = (drawW * absSin + drawH * absCos) / 2;
        
        // Maximum offset is the difference between rotated extent and half canvas size
        // Normalized by canvas size
        const maxOffsetX = Math.max(0, (rotatedExtentX - targetW/2) / targetW);
        const maxOffsetY = Math.max(0, (rotatedExtentY - targetH/2) / targetH);
        
        // Clamp the offset
        state.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, state.offsetX));
        state.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, state.offsetY));
    }
    
    // Setup transformations
    tempCtx.save();
    tempCtx.translate(targetW/2, targetH/2);
    
    // Apply rotation
    tempCtx.rotate(angle);
    
    // Apply flips
    tempCtx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
    
    // Apply offset (scaled to actual canvas size)
    tempCtx.translate(state.offsetX * targetW, state.offsetY * targetH);
    
    // Apply color adjustments
    const needsFilters = state.exposure !== 0 || state.highlights !== 0 || state.shadows !== 0 || 
                        state.contrast !== 0 || state.whiteBalance !== 0 || state.saturation !== 0 || 
                        state.vibrance !== 0;
    
    if (needsFilters) {
        // Create filters
        const filters = [];
        
        if (state.exposure !== 0) {
            filters.push(`brightness(${1 + state.exposure/100})`);
        }
        
        if (state.contrast !== 0) {
            filters.push(`contrast(${1 + state.contrast/100})`);
        }
        
        if (state.highlights !== 0 || state.shadows !== 0) {
            const contrast = 1 + (state.highlights - state.shadows) / 200;
            filters.push(`contrast(${contrast})`);
        }
        
        if (state.saturation !== 0) {
            filters.push(`saturate(${1 + state.saturation/100})`);
        }
        
        if (state.vibrance !== 0) {
            // Vibrance is like saturation but more subtle
            // It affects less saturated colors more than highly saturated ones
            const vibranceSat = 1 + (state.vibrance/100 * 0.7);
            filters.push(`saturate(${vibranceSat})`);
        }
        
        if (state.whiteBalance !== 0) {
            // Warm/cool adjustment using sepia for warmth
            if (state.whiteBalance > 0) {
                filters.push(`sepia(${state.whiteBalance/200})`);
            } else {
                // Cool adjustment using hue rotation
                filters.push(`hue-rotate(${state.whiteBalance * 0.3}deg)`);
            }
        }
        
        tempCtx.filter = filters.join(' ');
    }
    
    // Draw image centered at origin
    tempCtx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
    tempCtx.restore();
    
    // Apply vignette effect
    if (state.vignette > 0) {
        tempCtx.save();
        const gradient = tempCtx.createRadialGradient(
            targetW/2, targetH/2, 0,
            targetW/2, targetH/2, Math.max(targetW, targetH) * 0.7
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${state.vignette/100})`);
        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(0, 0, targetW, targetH);
        tempCtx.restore();
    }
    
    // Apply grain effect
    if (state.grain > 0) {
        tempCtx.save();
        // Optimize grain by using smaller canvas for performance
        const grainScale = 0.5; // Reduce grain resolution for better performance
        const grainW = Math.round(targetW * grainScale);
        const grainH = Math.round(targetH * grainScale);
        
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = grainW;
        grainCanvas.height = grainH;
        const grainCtx = grainCanvas.getContext('2d');
        
        const grainData = grainCtx.createImageData(grainW, grainH);
        const data = grainData.data;
        const intensity = state.grain / 100 * 30; // Scale grain intensity
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity;
            data[i] = noise;       // R
            data[i+1] = noise;     // G
            data[i+2] = noise;     // B
            data[i+3] = intensity; // A
        }
        
        grainCtx.putImageData(grainData, 0, 0);
        
        tempCtx.globalCompositeOperation = 'overlay';
        tempCtx.drawImage(grainCanvas, 0, 0, grainW, grainH, 0, 0, targetW, targetH);
        tempCtx.restore();
    }
    
    // Create new image from canvas
    const newImg = new Image();
    newImg.onload = () => {
        state.imageEl = newImg;
        render();
    };
    newImg.src = tempCanvas.toDataURL();
}

// Update upload button visibility
function updateUploadBtnVisibility() {
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.style.display = 'flex';
    }
}

// Rendering with debouncing
let renderTimeout = null;
function render() {
    if (!state.imageEl) {
        return;
    }
    
    // Cancel pending render
    if (renderTimeout) {
        cancelAnimationFrame(renderTimeout);
    }
    
    // Use requestAnimationFrame for smooth updates
    renderTimeout = requestAnimationFrame(() => {
        renderTimeout = null;
        renderCanvas();
    });
}

function renderCanvas() {
    if (!state.imageEl) {
        console.error('renderCanvas: No image element');
        return;
    }
    
    const theme = THEMES[state.themeKey];
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    
    let imgW = state.imageEl.naturalWidth || 1000;
    let imgH = state.imageEl.naturalHeight || 667;
    
    // Apply frame orientation if enabled
    if (state.frameOrientation) {
        // Swap width and height
        [imgW, imgH] = [imgH, imgW];
    }
    
    const aspect = imgW / imgH;
    
    const W = state.outputWidth;
    const basePad = state.pad;  // ユーザー設定の基準余白
    const scaleFactor = W / 1000; // 1000pxを基準
    const outerPad = Math.round(basePad * scaleFactor);
    const imagePad = state.useImagePadding ? outerPad : 0;
    
    const imageDrawW = W - (imagePad * 2);
    const imageDrawH = Math.round((W - (imagePad * 2)) / aspect);
    
    // Font sizes - always based on total width W to maintain consistent ratios
    const metaSize = Math.round(W * 0.014 * state.fontScale * 1.5);
    const meta1stSize = Math.round(W * 0.018 * state.fontScale * 1.5);
    const lineHMeta = Math.round(metaSize * 1.3);
    const lineHMeta1st = Math.round(meta1stSize * 1.3);
    
    // Font selection
    const fontBase = '"Barlow", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const weights = { normal: 400, bold: 600 };
    
    const metaFontStr = `${weights.normal} ${metaSize}px ${fontBase}`;
    const meta1stFontStr = `${weights.bold} ${meta1stSize}px ${fontBase}`;
    
    const ctx = canvas.getContext('2d');
    
    // キャンバスのテキストレンダリングを改善
    ctx.textRendering = 'optimizeLegibility';
    
    // Extract data with overrides
    const camera = state.cameraOverride || [state.exif?.Make, state.exif?.Model].filter(Boolean).join(' ');
    const lens = state.lensOverride || state.exif?.LensModel || state.exif?.LensSpecification || state.exif?.LensMake || '';
    const aperture = state.apertureOverride || fmtAperture(state.exif?.FNumber ?? state.exif?.ApertureValue);
    const shutter = state.shutterOverride || fmtExposure(state.exif?.ExposureTime ?? state.exif?.ShutterSpeedValue);
    const iso = state.isoOverride || (state.exif?.ISO ?? state.exif?.ISOSpeedRatings);
    const date = state.dateOverride || fmtDate(state.exif?.DateTimeOriginal || state.exif?.CreateDate || state.exif?.ModifyDate);
    
    
    // Text content - 左右をスワップ
    const rightTopParts = [
        state.showISO && iso ? (state.isoOverride || `ISO${iso}`) : '',
        state.showAperture ? aperture : '',
        state.showShutter ? shutter : ''
    ].filter(Boolean);
    const rightBottom = state.showDate ? date : '';
    const leftTop = state.showCamera ? camera : '';
    const leftBottom = state.showLens ? lens : '';
    
    // Layout - scale column width and gap
    const textBlockPadding = state.useImagePadding ? outerPad : 0; // 画像余白ONの時は文字ブロックも同じ余白
    const maxTextW = W - outerPad * 2 - textBlockPadding * 2;
    const gap = Math.round(Math.max(16, outerPad) * scaleFactor);
    const colW = Math.floor((maxTextW - gap) / 2);
    const leftFrameX = outerPad + textBlockPadding;
    
    // 右側のテキストの実際の幅を計算
    ctx.font = meta1stFontStr;
    const sepWidth = ctx.measureText('    ').width; // 4スペース分のセパレータ
    let rightTop1Width = 0;
    if (rightTopParts.length > 0) {
        for (let i = 0; i < rightTopParts.length; i++) {
            rightTop1Width += ctx.measureText(rightTopParts[i]).width;
            if (i < rightTopParts.length - 1) {
                rightTop1Width += sepWidth;
            }
        }
    }
    ctx.font = metaFontStr;
    const rightBottom1Width = rightBottom ? ctx.measureText(rightBottom).width : 0;
    const rightMaxWidth = Math.max(rightTop1Width, rightBottom1Width);
    const rightFrameX = W - outerPad - textBlockPadding - rightMaxWidth;
    
    // Measure text
    
    ctx.font = meta1stFontStr;
    const l1 = wrapLines(ctx, leftTop, colW);
    const r1 = []; // 右側は個別描画のため空配列
    const row1H = Math.max(l1.length, 1) * lineHMeta1st; // 最低1行分の高さを確保
    
    ctx.font = metaFontStr;
    const l2 = wrapLines(ctx, leftBottom, colW);
    const r2 = wrapLines(ctx, rightBottom, colW);
    const row2H = Math.max(l2.length, r2.length) * lineHMeta;
    
    const rowsGap = row2H ? Math.round(metaSize * 0.7) : 0;
    const textHeight = row1H + rowsGap + row2H;
    const topPad = outerPad;
    const bottomPad = Math.round(outerPad * 0.85); // 下部の余白を少し減らす
    const blockH = topPad + textHeight + bottomPad;
    const totalH = imagePad + imageDrawH + blockH;  // 画像の上と左右に余白
    
    // Set canvas size
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(totalH * dpr);
    // キャンバスのレスポンシブ表示
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    // デバッグ用のテスト描画を削除
    ctx.scale(dpr, dpr);
    
    // Draw background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, totalH);
    bgGrad.addColorStop(0, theme.bg1);
    bgGrad.addColorStop(1, theme.bg2);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, totalH);
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, W, totalH);
    
    // Save canvas state before image drawing
    ctx.save();
    
    // Draw image with padding
    if (state.frameOrientation) {
        // When frame orientation is rotated, crop the image to fit the rotated aspect
        const srcAspect = state.imageEl.naturalWidth / state.imageEl.naturalHeight;
        const dstAspect = imageDrawW / imageDrawH;
        
        let srcX = 0, srcY = 0, srcW = state.imageEl.naturalWidth, srcH = state.imageEl.naturalHeight;
        
        if (srcAspect > dstAspect) {
            // Source is wider - crop left and right
            srcW = state.imageEl.naturalHeight * dstAspect;
            srcX = (state.imageEl.naturalWidth - srcW) / 2;
        } else {
            // Source is taller - crop top and bottom
            srcH = state.imageEl.naturalWidth / dstAspect;
            srcY = (state.imageEl.naturalHeight - srcH) / 2;
        }
        
        ctx.drawImage(state.imageEl, srcX, srcY, srcW, srcH, imagePad, imagePad, imageDrawW, imageDrawH);
    } else {
        // Normal drawing
        ctx.drawImage(state.imageEl, imagePad, imagePad, imageDrawW, imageDrawH);
    }
    
    // Restore canvas state
    ctx.restore();
    
    // Apply film filter if selected (optimized version)
    if (state.filmType && state.filmType > 0) {
        const filterNames = Object.keys(FILM_FILTERS);
        const filterName = filterNames[state.filmType];
        const filter = FILM_FILTERS[filterName];
        
        if (filter && filterName !== 'None') {
            ctx.save();
            
            // Use CSS filters for basic adjustments (much faster)
            const strength = (state.filmStrength || 70) / 100;
            const filters = [];
            
            if (filter.saturation !== undefined) {
                const sat = 1 + (filter.saturation - 1) * strength;
                filters.push(`saturate(${sat})`);
            }
            
            if (filter.contrast !== undefined) {
                const con = 1 + (filter.contrast - 1) * strength;
                filters.push(`contrast(${con})`);
            }
            
            // Apply basic color shift for film looks
            if (filterName === 'Portra' || filterName === 'Gold' || filterName === 'Superia') {
                filters.push(`sepia(${0.15 * strength})`);
                filters.push(`hue-rotate(${5 * strength}deg)`);
            } else if (filterName === 'Velvia') {
                filters.push(`saturate(${1 + 0.2 * strength})`);
                filters.push(`hue-rotate(${-5 * strength}deg)`);
            } else if (filterName === 'Ektar') {
                filters.push(`hue-rotate(${-3 * strength}deg)`);
            }
            
            // B&W filters
            if (filterName === 'Tri-X' || filterName === 'HP5' || filterName === 'T-MAX') {
                filters.push('grayscale(1)');
                if (filterName === 'Tri-X') {
                    filters.push(`contrast(${1.2})`);
                    filters.push(`brightness(${0.95})`);
                } else if (filterName === 'HP5') {
                    filters.push(`contrast(${1.1})`);
                } else if (filterName === 'T-MAX') {
                    filters.push(`contrast(${1.15})`);
                    filters.push(`brightness(${1.05})`);
                }
            }
            
            if (filters.length > 0) {
                ctx.filter = filters.join(' ');
            }
            
            // Redraw the image area with filters applied
            if (state.frameOrientation) {
                const srcAspect = state.imageEl.naturalWidth / state.imageEl.naturalHeight;
                const dstAspect = imageDrawW / imageDrawH;
                
                let srcX = 0, srcY = 0, srcW = state.imageEl.naturalWidth, srcH = state.imageEl.naturalHeight;
                
                if (srcAspect > dstAspect) {
                    srcW = state.imageEl.naturalHeight * dstAspect;
                    srcX = (state.imageEl.naturalWidth - srcW) / 2;
                } else {
                    srcH = state.imageEl.naturalWidth / dstAspect;
                    srcY = (state.imageEl.naturalHeight - srcH) / 2;
                }
                
                ctx.drawImage(state.imageEl, srcX, srcY, srcW, srcH, imagePad, imagePad, imageDrawW, imageDrawH);
            } else {
                ctx.drawImage(state.imageEl, 0, 0, state.imageEl.naturalWidth, state.imageEl.naturalHeight, imagePad, imagePad, imageDrawW, imageDrawH);
            }
            
            // Skip grain effect for performance - can be added as CSS filter later
            
            ctx.restore();
        }
    }
    
    // Draw film date stamp if enabled via Film tool
    if (state.dateStamp && date) {
        drawFilmDateStamp(ctx, {
            date: date,
            imageDrawW: imageDrawW,
            imageDrawH: imageDrawH,
            imagePad: imagePad,
            opacity: state.dateOpacity,
            brightness: state.dateBrightness,
            blur: state.dateBlur
        });
    }
    
    // Draw text frame
    const frameY = imagePad + imageDrawH;
    ctx.fillStyle = theme.text;
    ctx.textBaseline = 'top';
    
    // Left side - カメラ情報
    ctx.font = meta1stFontStr;
    let y = frameY + topPad;
    for (const ln of l1) {
        ctx.fillText(ln, leftFrameX, y);
        y += lineHMeta1st;
    }
    
    ctx.font = metaFontStr;
    y = frameY + topPad + row1H + rowsGap;
    for (const ln of l2) {
        ctx.fillText(ln, leftFrameX, y);
        y += lineHMeta;
    }
    
    // Right side - 撮影データ（個別描画）
    ctx.font = meta1stFontStr;
    if (rightTopParts.length > 0) {
        let x = rightFrameX;
        const y = frameY + topPad;
        for (let i = 0; i < rightTopParts.length; i++) {
            ctx.fillText(rightTopParts[i], x, y);
            x += ctx.measureText(rightTopParts[i]).width;
            if (i < rightTopParts.length - 1) {
                x += sepWidth;
            }
        }
    }
    
    // Right bottom - date
    ctx.font = metaFontStr;
    ctx.textAlign = 'left';
    y = frameY + topPad + row1H + rowsGap;
    for (const ln of r2) {
        ctx.fillText(ln, rightFrameX, y);
        y += lineHMeta;
    }
    
    // Update responsive canvas height
    updateCanvasDisplay();
}

// Update canvas display properties for responsiveness
function updateCanvasDisplay() {
    if (!canvas) return;
    
    const editorControls = document.getElementById('editorControls');
    if (editorControls && editorControls.classList.contains('active') && state.imageEl) {
        // Editor is active - adjust preview container
        const viewportHeight = window.innerHeight;
        const editorHeight = editorControls.offsetHeight;
        const availableHeight = viewportHeight - editorHeight;
        
        // Update canvas max dimensions
        const padding = 32;
        canvas.style.maxHeight = `${availableHeight - padding}px`;
        canvas.style.maxWidth = `calc(100% - ${padding}px)`;
    } else {
        // Editor is hidden - use full viewport
        canvas.style.maxHeight = 'calc(100vh - 32px)';
        canvas.style.maxWidth = 'calc(100% - 32px)';
    }
}

// Initialize file handling
function initializeFileHandling() {
    // Setup the file input that's now in the HTML
    const fileInput = document.getElementById('fileInput');
    console.log('fileInput element:', fileInput);
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            console.log('File input changed:', e.target.files);
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        });
        console.log('Event listener added to fileInput');
    }
    
    // Add click event to dropZone
    if (dropZone) {
        dropZone.addEventListener('click', (e) => {
            // Only trigger file input if clicking on the dropzone itself (not children)
            if (e.target === dropZone || e.target.classList.contains('drop-zone-icon') || e.target.classList.contains('drop-zone-text')) {
                console.log('Dropzone clicked, triggering file input');
                if (fileInput) fileInput.click();
            }
        });
    }
    
    // Also create a picker for the upload button
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.style.display = 'none';
    document.body.appendChild(picker);
    
    picker.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    });
    
    window.openPicker = () => picker.click();
    
    // Drop events
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        if (dropZone) dropZone.classList.remove('dragging');
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        if (dropZone) dropZone.classList.add('dragging');
    }
    
    function handleDragLeave(e) {
        e.preventDefault();
        if (dropZone) dropZone.classList.remove('dragging');
    }
    
    if (preview) {
        preview.addEventListener('drop', handleDrop);
        preview.addEventListener('dragover', handleDragOver);
        preview.addEventListener('dragleave', handleDragLeave);
    }
}

// Initialize settings controls (for modal)
function initializeSettingsControls() {
    const sliderStack = document.getElementById('sliderStack');
    const parameterSelector = document.getElementById('parameterSelector');
    const settingsBtn = document.getElementById('settingsBtn');
    const resetBtn = document.getElementById('resetBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    // Export button
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportImage();
        });
    }
    
    // Tool groups with their parameters
    const toolGroups = {
        crop: {
            name: 'Crop',
            params: {
                rotation: { name: 'Rotation', params: ['rotation'] },
                zoom: { name: 'Zoom', params: ['zoom'] },
                flip: { name: 'Flip', params: ['flipH', 'flipV'] },
                ratio: { name: 'Ratio', params: ['ratio'] }
            }
        },
        adjust: {
            name: 'Adjust',
            params: {
                exposure: { name: 'Exposure', params: ['exposure'] },
                highlights: { name: 'Highlights', params: ['highlights'] },
                shadows: { name: 'Shadows', params: ['shadows'] },
                temperature: { name: 'Temperature', params: ['whiteBalance'] }
            }
        },
        frame: {
            name: 'Frame',
            params: {
                padding: { name: 'Padding', params: ['padding'] },
                theme: { name: 'Theme', params: ['theme'] },
                fontSize: { name: 'Font Size', params: ['fontSize'] }
            }
        },
        date: {
            name: 'Date Stamp',
            params: {
                opacity: { name: 'Opacity', params: ['dateOpacity'] },
                brightness: { name: 'Brightness', params: ['dateBrightness'] },
                blur: { name: 'Blur', params: ['dateBlur'] }
            }
        }
    };
    
    const paramConfigs = {
        rotation: { label: 'Rotation', min: -180, max: 180, step: 1, default: 0, unit: '°' },
        zoom: { label: 'Zoom', min: 50, max: 300, step: 10, default: 100, unit: '%' },
        flipH: { label: 'Flip H', min: 0, max: 1, step: 1, default: 0, unit: '', labels: ['Off', 'On'] },
        flipV: { label: 'Flip V', min: 0, max: 1, step: 1, default: 0, unit: '', labels: ['Off', 'On'] },
        ratio: { label: 'Ratio', min: 0, max: 3, step: 1, default: 0, unit: '', labels: ['1:1', '4:3', '3:2', '16:9'] },
        padding: { label: 'Padding', min: 0, max: 4, step: 1, default: 0, unit: 'px' },
        theme: { label: 'Theme', min: 0, max: 1, step: 1, default: 0, unit: '', labels: ['Light', 'Dark'] },
        fontSize: { label: 'Font Size', min: 60, max: 100, step: 10, default: 80, unit: '%' },
        dateOpacity: { label: 'Opacity', min: 0, max: 100, step: 10, default: 60, unit: '%' },
        dateBrightness: { label: 'Brightness', min: 50, max: 150, step: 10, default: 100, unit: '%' },
        dateBlur: { label: 'Blur', min: 0, max: 5, step: 0.5, default: 2.2, unit: 'px' },
        exposure: { label: 'Exposure', min: -100, max: 100, step: 5, default: 0, unit: '' },
        highlights: { label: 'Highlights', min: -100, max: 100, step: 5, default: 0, unit: '' },
        shadows: { label: 'Shadows', min: -100, max: 100, step: 5, default: 0, unit: '' },
        whiteBalance: { label: 'Temp', min: -100, max: 100, step: 5, default: 0, unit: 'K' }
    };
    
    // Create slider row
    function createSliderRow(param) {
        const config = paramConfigs[param];
        const row = document.createElement('div');
        row.className = 'slider-row';
        
        // Check if this is a toggle or select parameter
        if (param === 'flipH' || param === 'flipV' || param === 'theme') {
            // Create toggle button
            row.innerHTML = `
                <span class="slider-label">${config.label}</span>
                <button type="button" class="toggle-btn" data-param="${param}">
                    <span class="toggle-state">${config.labels[0]}</span>
                </button>
            `;
            
            const toggleBtn = row.querySelector('.toggle-btn');
            const toggleState = row.querySelector('.toggle-state');
            
            // Set initial state
            let isActive = false;
            switch(param) {
                case 'flipH': isActive = state.flipH; break;
                case 'flipV': isActive = state.flipV; break;
                case 'theme': isActive = state.themeKey === 'dark'; break;
            }
            
            toggleBtn.classList.toggle('active', isActive);
            toggleState.textContent = config.labels[isActive ? 1 : 0];
            
            // Handle toggle
            toggleBtn.addEventListener('click', () => {
                isActive = !isActive;
                toggleBtn.classList.toggle('active', isActive);
                toggleState.textContent = config.labels[isActive ? 1 : 0];
                
                switch(param) {
                    case 'flipH': state.flipH = isActive; applyTransformations(); break;
                    case 'flipV': state.flipV = isActive; applyTransformations(); break;
                    case 'theme':
                        state.themeKey = isActive ? 'dark' : 'light';
                        state.theme = THEMES[state.themeKey];
                        render();
                        break;
                }
            });
            
        } else if (param === 'ratio') {
            // Create select buttons
            row.innerHTML = `
                <span class="slider-label">${config.label}</span>
                <div class="ratio-select">
                    ${config.labels.map((label, i) => 
                        `<button type="button" class="ratio-btn" data-value="${i}">${label}</button>`
                    ).join('')}
                </div>
            `;
            
            const buttons = row.querySelectorAll('.ratio-btn');
            
            const ratios = ['1:1', '4:3', '3:2', '16:9'];
            let currentIndex = ratios.indexOf(state.cropRatio);
            
            // Set initial active state
            if (currentIndex >= 0) {
                buttons[currentIndex].classList.add('active');
            }
            
            // Handle ratio selection
            buttons.forEach((btn, i) => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    state.cropRatio = ratios[i];
                    applyTransformations();
                });
            });
            
        } else {
            // Create regular slider
            row.innerHTML = `
                <span class="slider-label">${config.label}</span>
                <input type="range" min="${config.min}" max="${config.max}" step="${config.step}" data-param="${param}">
                <span class="slider-value" data-param="${param}">--</span>
            `;
            
            const slider = row.querySelector('input');
            const valueDisplay = row.querySelector('.slider-value');
            
            // Set initial value
            let currentValue;
            switch(param) {
                case 'rotation': currentValue = state.rotation; break;
                case 'zoom': currentValue = state.zoom * 100; break;
                case 'padding': 
                    // Map padding value to slider position (0-4)
                    const paddingValues = [24, 32, 40, 48, 48];
                    currentValue = paddingValues.indexOf(state.pad);
                    if (currentValue === -1) currentValue = 0;
                    if (currentValue === 4 && !state.useImagePadding) currentValue = 3;
                    break;
                case 'fontSize': currentValue = state.fontScale * 100; break;
                case 'dateOpacity': currentValue = state.dateOpacity; break;
                case 'dateBrightness': currentValue = state.dateBrightness; break;
                case 'dateBlur': currentValue = state.dateBlur; break;
                default: currentValue = state[param] || config.default;
            }
            
            slider.value = currentValue;
            updateSliderDisplay(param, currentValue, valueDisplay);
            
            // Update progress bar
            const updateProgress = () => {
                const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
                slider.style.setProperty('--progress', percent + '%');
            };
            updateProgress();
            
            // Handle slider change
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                updateSliderDisplay(param, value, valueDisplay);
                updateProgress();
                
                // Update center display
                const centerDisplay = document.getElementById('sliderValueDisplay');
                if (centerDisplay) {
                    centerDisplay.textContent = formatDisplayValue(param, value);
                }
                
                // Apply the value to state
                switch(param) {
                    case 'rotation': state.rotation = value; applyTransformations(); break;
                    case 'zoom': state.zoom = value / 100; applyTransformations(); break;
                    case 'padding': 
                        const paddingMap = [24, 32, 40, 48, 48];
                        const useImageMap = [false, false, false, false, true];
                        const index = Math.round(value);
                        state.pad = paddingMap[index];
                        state.useImagePadding = useImageMap[index];
                        render(); 
                        break;
                    case 'fontSize': state.fontScale = value / 100; render(); break;
                    case 'dateOpacity': state.dateOpacity = value; render(); break;
                    case 'dateBrightness': state.dateBrightness = value; render(); break;
                    case 'dateBlur': state.dateBlur = value; render(); break;
                    default:
                        if (state.hasOwnProperty(param)) {
                            state[param] = value;
                            if (param === 'exposure' || param === 'highlights' || param === 'shadows' || param === 'whiteBalance') {
                                applyTransformations();
                            }
                        }
                }
                
                // Date stamp is controlled by dateStamp toggle in Film tool
            });
        }
        
        return row;
    }
    
    // Update slider display
    function updateSliderDisplay(param, value, display) {
        // iOS style doesn't show inline values
    }
    
    // Format value for center display
    function formatDisplayValue(param, value) {
        const config = paramConfigs[param];
        if (param === 'padding') {
            const labels = ['24', '32', '40', '48', '48+Image'];
            return labels[Math.round(value)] || '0';
        } else if (config.labels) {
            return config.labels[Math.round(value)] || '0';
        } else if (param === 'rotation') {
            return Math.round(value) + '°';
        } else if (param === 'zoom') {
            return Math.round(value) + '%';
        } else if (param === 'fontSize') {
            return Math.round(value) + '%';
        } else if (param === 'dateOpacity' || param === 'dateBrightness') {
            return Math.round(value) + '%';
        } else if (param === 'dateBlur') {
            return value.toFixed(1) + 'px';
        } else {
            return Math.round(value);
        }
    }
    
    // Current active tool and parameter
    let activeTool = null;
    let activeParam = null;
    
    // Parameter icons
    const paramIcons = {
        rotation: '↻',
        zoom: '🔍',
        flip: '↔',
        ratio: '▢',
        exposure: '☀',
        highlights: '◐',
        shadows: '●',
        temperature: '🌡',
        padding: '□',
        theme: '◑',
        fontSize: 'Aa',
        dateStamp: '📅',
        opacity: '◯',
        brightness: '☀',
        blur: '◐'
    };
    
    // Create parameter selector buttons
    function updateParameterSelector() {
        if (!parameterSelector || !activeTool) return;
        
        parameterSelector.innerHTML = '';
        const toolConfig = toolGroups[activeTool];
        if (!toolConfig) return;
        
        Object.entries(toolConfig.params).forEach(([key, param]) => {
            const btn = document.createElement('button');
            btn.className = 'parameter-btn';
            btn.dataset.param = key;
            
            // Create icon
            const icon = document.createElement('div');
            icon.className = 'parameter-icon';
            icon.textContent = paramIcons[key] || '●';
            
            // Create name
            const name = document.createElement('div');
            name.className = 'parameter-name';
            name.textContent = param.name;
            
            btn.appendChild(icon);
            btn.appendChild(name);
            
            if (key === activeParam) {
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', () => {
                activeParam = key;
                updateParameterSelector();
                updateSliders();
            });
            
            parameterSelector.appendChild(btn);
        });
    }
    
    // Show all sliders for a tool
    function showToolSliders(toolId) {
        if (!sliderStack) return;
        
        // Hide all sliders first
        document.querySelectorAll('.slider-row').forEach(row => {
            row.classList.remove('active');
        });
        
        // Show sliders for this tool
        const toolConfig = toolGroups[toolId];
        if (!toolConfig) return;
        
        // Collect all parameters for this tool
        const allParams = [];
        Object.values(toolConfig.params).forEach(paramGroup => {
            paramGroup.params.forEach(param => {
                allParams.push(param);
            });
        });
        
        // Create and show sliders
        sliderStack.innerHTML = '';
        allParams.forEach(param => {
            const row = createSliderRow(param);
            row.classList.add('active');
            sliderStack.appendChild(row);
        });
    }
    
    // Handle tool button clicks
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (!tool || !toolGroups[tool]) return;
            
            // Update active states
            toolButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            activeTool = tool;
            // Select first parameter by default
            activeParam = Object.keys(toolGroups[tool].params)[0];
            
            // Show all sliders for the selected tool
            showToolSliders(tool);
            
            // Update preview container height
            requestAnimationFrame(() => {
                setTimeout(() => updatePreviewContainerHeight(), 100);
            });
        });
    });
    
    // Settings button
    if (settingsBtn) {
        const modal = document.getElementById('settingsModal');
        const modalClose = document.getElementById('modalClose');
        
        settingsBtn.addEventListener('click', () => {
            if (modal) modal.classList.add('active');
        });
        
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                if (modal) modal.classList.remove('active');
            });
        }
        
        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    }
    
    // Upload button
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            if (window.openPicker) window.openPicker();
        });
    }
    
    // Export button is already handled above
    
    // Reset button - remove since not in iOS style
    /*if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            state.cropRatio = 'none';
            state.rotation = 0;
            state.flipH = false;
            state.flipV = false;
            state.cropRect = null;
            state.zoom = 1;
            state.offsetX = 0;
            state.offsetY = 0;
            state.imageEl = state.originalImageEl;
            
            // Reset adjustments
            state.exposure = 0;
            state.highlights = 0;
            state.shadows = 0;
            state.whiteBalance = 0;
            
            // Update active sliders if visible
            const activeSliders = sliderStack.querySelectorAll('input[type="range"]');
            activeSliders.forEach(slider => {
                const param = slider.dataset.param;
                const config = paramConfigs[param];
                if (config) {
                    slider.value = config.default;
                    const valueDisplay = sliderStack.querySelector(`.slider-value[data-param="${param}"]`);
                    if (valueDisplay) {
                        updateSliderDisplay(param, config.default, valueDisplay);
                    }
                }
            });
            
            applyTransformations();
        });
    }*/
    
    // Export button handler is already set up above
}

// Update preview container height
function updatePreviewContainerHeight() {
    const editorControls = document.getElementById('editorControls');
    const previewContainer = document.querySelector('.preview-container');
    const canvas = document.getElementById('canvas');
    
    if (editorControls && previewContainer) {
        // Wait for DOM update
        requestAnimationFrame(() => {
            // Get actual height of editor controls
            const editorRect = editorControls.getBoundingClientRect();
            const editorHeight = Math.ceil(editorRect.height);
            const viewportHeight = window.innerHeight;
            
            // Calculate available height for preview
            const availableHeight = viewportHeight - editorHeight;
            
            // Update preview container height
            previewContainer.style.height = `${availableHeight}px`;
            previewContainer.style.bottom = `${editorHeight}px`;
            
            // Update canvas max dimensions
            if (canvas) {
                const padding = 32; // Total padding (16px * 2)
                canvas.style.maxHeight = `${availableHeight - padding}px`;
                canvas.style.maxWidth = `calc(100% - ${padding}px)`;
            }
            
            // Trigger render if image exists
            if (state.imageEl) {
                render();
            }
        });
    }
}

// Initialize override inputs
function initializeOverrideInputs() {
    const overrideInputs = {
        cameraOverride: document.getElementById('cameraOverride'),
        lensOverride: document.getElementById('lensOverride'),
        isoOverride: document.getElementById('isoOverride'),
        apertureOverride: document.getElementById('apertureOverride'),
        shutterOverride: document.getElementById('shutterOverride'),
        dateOverride: document.getElementById('dateOverride')
    };
    
    Object.entries(overrideInputs).forEach(([key, input]) => {
        if (input) {
            input.addEventListener('input', (e) => {
                state[key] = e.target.value;
                render();
            });
        }
    });
}

// Initialize checkboxes
function initializeCheckboxes() {
    const showISO = document.getElementById('showISO');
    const showAperture = document.getElementById('showAperture');
    const showShutter = document.getElementById('showShutter');
    const showDate = document.getElementById('showDate');
    const showCamera = document.getElementById('showCamera');
    const showLens = document.getElementById('showLens');
    // Film date is now controlled in Film tool, not in settings
    
    if (showISO) {
        showISO.addEventListener('change', (e) => {
            state.showISO = e.target.checked;
            render();
        });
    }
    
    if (showAperture) {
        showAperture.addEventListener('change', (e) => {
            state.showAperture = e.target.checked;
            render();
        });
    }
    
    if (showShutter) {
        showShutter.addEventListener('change', (e) => {
            state.showShutter = e.target.checked;
            render();
        });
    }
    
    if (showDate) {
        showDate.addEventListener('change', (e) => {
            state.showDate = e.target.checked;
            render();
        });
    }
    
    if (showCamera) {
        showCamera.addEventListener('change', (e) => {
            state.showCamera = e.target.checked;
            render();
        });
    }
    
    if (showLens) {
        showLens.addEventListener('change', (e) => {
            state.showLens = e.target.checked;
            render();
        });
    }
    
    // Film date event listener removed - controlled by Film tool
}

// Initialize export settings
function initializeExportSettings() {
    const outputSizeSelect = document.getElementById('outputSizeSelect');
    const customSizeInput = document.getElementById('customSizeInput');
    const exportFormat = document.getElementById('exportFormat');
    
    if (outputSizeSelect) {
        outputSizeSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'custom') {
                if (customSizeInput) {
                    customSizeInput.style.display = 'block';
                    state.outputWidth = parseInt(customSizeInput.value);
                }
            } else {
                if (customSizeInput) customSizeInput.style.display = 'none';
                state.outputWidth = parseInt(value);
            }
            render();
        });
    }
    
    if (customSizeInput) {
        customSizeInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value && value >= 640 && value <= 7680) {
                state.outputWidth = value;
                render();
            }
        });
    }
    
    // Prevent export format select from triggering button styles
    if (exportFormat) {
        exportFormat.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        exportFormat.addEventListener('change', (e) => {
            e.stopPropagation();
        });
    }
}

// Export image
async function exportImage() {
    if (!canvas || !state.imageEl) return;
    
    const format = document.getElementById('exportFormat')?.value || 'jpeg';
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'png' ? 1 : 0.95;
    
    canvas.toBlob(async blob => {
        const filename = `${state.fileName.replace(/\.[^/.]+$/, '')}_framed.${format}`;
        
        // Check if on mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            
            // デバッグ情報
            console.log('Mobile detected:', {
                isIOS,
                hasShare: !!navigator.share,
                hasCanShare: !!navigator.canShare,
                isSecureContext: window.isSecureContext,
                protocol: location.protocol
            });
            
            if (isIOS && navigator.share) {
                // iOS: シンプルなファイル共有（canShareを使わない）
                try {
                    // フォーマットに応じた拡張子
                    const extension = format === 'png' ? '.png' : '.jpg';
                    const fileName = `exif-frame-${Date.now()}${extension}`;
                    
                    const file = new File([blob], fileName, { 
                        type: mimeType
                    });
                    
                    // canShareを使わずに直接共有
                    await navigator.share({
                        files: [file]
                    });
                    console.log('Share successful');
                    showToast('画像を共有しました');
                    return;
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Share failed:', error);
                        // iOSでShareが失敗した場合は通常のダウンロードを試行
                        const url = URL.createObjectURL(blob);
                        fallbackDownload(url, filename);
                    }
                }
            } else if (!isIOS && navigator.share) {
                // Android and others: can use File API
                const url = URL.createObjectURL(blob);
                try {
                    const file = new File([blob], filename, { 
                        type: mimeType,
                        lastModified: Date.now()
                    });
                    
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file]
                        });
                        URL.revokeObjectURL(url);
                        return;
                    } else {
                        // Fallback to URL sharing
                        await navigator.share({
                            url: url
                        });
                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                        return;
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Share failed:', error);
                    }
                    URL.revokeObjectURL(url);
                }
            }
            
            // Fallback for all mobile devices when share API is not available
            const url = URL.createObjectURL(blob);
            fallbackDownload(url, filename);
        } else {
            // Desktop behavior
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
            showToast('画像をダウンロードしました');
        }
        
        // Fallback download function for mobile
        function fallbackDownload(url, filename) {
            // Simply try to download
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            
            try {
                a.click();
            } catch (e) {
                console.error('Download failed:', e);
            }
            
            document.body.removeChild(a);
            
            // Keep URL alive longer for mobile
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
    }, mimeType, quality);
}