// Film filter definitions and application logic

export const FILM_FILTERS = {
    'None': null,
    'Superia': {
        // Fujifilm Superia - Vibrant colors, warm tones
        curves: {
            red: [[0, 0], [64, 70], [128, 140], [192, 215], [255, 255]],
            green: [[0, 0], [64, 65], [128, 130], [192, 205], [255, 255]],
            blue: [[0, 0], [64, 55], [128, 120], [192, 195], [255, 255]]
        },
        saturation: 1.2,
        contrast: 1.1,
        grain: { amount: 0.015, size: 1.5 }
    },
    'Provia': {
        // Fujifilm Provia - Neutral, accurate colors
        curves: {
            red: [[0, 0], [64, 64], [128, 128], [192, 195], [255, 255]],
            green: [[0, 0], [64, 66], [128, 130], [192, 194], [255, 255]],
            blue: [[0, 0], [64, 62], [128, 126], [192, 195], [255, 255]]
        },
        saturation: 1.1,
        contrast: 1.05,
        grain: { amount: 0.01, size: 1.2 }
    },
    'Velvia': {
        // Fujifilm Velvia - High saturation, high contrast
        curves: {
            red: [[0, 0], [64, 75], [128, 145], [192, 220], [255, 255]],
            green: [[0, 0], [64, 65], [128, 135], [192, 210], [255, 255]],
            blue: [[0, 5], [64, 55], [128, 125], [192, 200], [255, 250]]
        },
        saturation: 1.4,
        contrast: 1.2,
        grain: { amount: 0.008, size: 1.0 }
    },
    'Portra': {
        // Kodak Portra - Warm skin tones
        curves: {
            red: [[0, 0], [64, 68], [128, 135], [192, 205], [255, 255]],
            green: [[0, 0], [64, 64], [128, 128], [192, 200], [255, 255]],
            blue: [[0, 0], [64, 58], [128, 118], [192, 190], [255, 250]]
        },
        saturation: 1.15,
        contrast: 1.0,
        grain: { amount: 0.012, size: 1.8 }
    },
    'Ektar': {
        // Kodak Ektar - Vibrant, fine grain
        curves: {
            red: [[0, 0], [64, 70], [128, 138], [192, 210], [255, 255]],
            green: [[0, 0], [64, 66], [128, 132], [192, 206], [255, 255]],
            blue: [[0, 0], [64, 60], [128, 125], [192, 200], [255, 255]]
        },
        saturation: 1.3,
        contrast: 1.15,
        grain: { amount: 0.006, size: 0.8 }
    },
    'Gold': {
        // Kodak Gold - Warm, consumer film
        curves: {
            red: [[0, 0], [64, 72], [128, 140], [192, 208], [255, 255]],
            green: [[0, 0], [64, 66], [128, 130], [192, 200], [255, 252]],
            blue: [[0, 0], [64, 56], [128, 115], [192, 188], [255, 245]]
        },
        saturation: 1.25,
        contrast: 1.1,
        grain: { amount: 0.018, size: 2.0 }
    },
    'Astia': {
        // Fujifilm Astia - Soft, pastel colors
        curves: {
            red: [[0, 10], [64, 66], [128, 130], [192, 196], [255, 250]],
            green: [[0, 10], [64, 65], [128, 128], [192, 194], [255, 250]],
            blue: [[0, 15], [64, 64], [128, 128], [192, 194], [255, 248]]
        },
        saturation: 0.95,
        contrast: 0.95,
        grain: { amount: 0.01, size: 1.3 }
    },
    'Tri-X': {
        // Kodak Tri-X - Classic B&W
        curves: {
            mono: [[0, 0], [64, 58], [128, 135], [192, 210], [255, 255]]
        },
        saturation: 0,
        contrast: 1.2,
        grain: { amount: 0.025, size: 2.5 }
    },
    'HP5': {
        // Ilford HP5 - Versatile B&W
        curves: {
            mono: [[0, 5], [64, 65], [128, 130], [192, 200], [255, 250]]
        },
        saturation: 0,
        contrast: 1.1,
        grain: { amount: 0.02, size: 2.2 }
    },
    'T-MAX': {
        // Kodak T-MAX - Fine grain B&W
        curves: {
            mono: [[0, 0], [64, 62], [128, 128], [192, 196], [255, 255]]
        },
        saturation: 0,
        contrast: 1.05,
        grain: { amount: 0.008, size: 1.0 }
    }
};

// Apply film filter to canvas
export function applyFilmFilter(ctx, filterName, strength = 70) {
    const filter = FILM_FILTERS[filterName];
    if (!filter || filterName === 'None') return;

    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const strengthRatio = strength / 100;

    // Apply curves
    if (filter.curves) {
        applyCurves(data, filter.curves, strengthRatio);
    }

    // Apply saturation
    if (filter.saturation !== undefined) {
        const targetSaturation = 1 + (filter.saturation - 1) * strengthRatio;
        applySaturation(data, targetSaturation);
    }

    // Apply contrast
    if (filter.contrast !== undefined) {
        const targetContrast = 1 + (filter.contrast - 1) * strengthRatio;
        applyContrast(data, targetContrast);
    }

    // Apply grain
    if (filter.grain && strengthRatio > 0) {
        applyGrain(data, canvas.width, canvas.height, 
            filter.grain.amount * strengthRatio, 
            filter.grain.size);
    }

    ctx.putImageData(imageData, 0, 0);
}

// Apply tone curves
function applyCurves(data, curves, strength) {
    const lookupTables = {};
    
    // Build lookup tables for each channel
    if (curves.mono) {
        // B&W film - apply same curve to all channels
        const lut = buildLookupTable(curves.mono);
        lookupTables.red = lut;
        lookupTables.green = lut;
        lookupTables.blue = lut;
    } else {
        // Color film - separate curves for each channel
        lookupTables.red = buildLookupTable(curves.red);
        lookupTables.green = buildLookupTable(curves.green);
        lookupTables.blue = buildLookupTable(curves.blue);
    }

    // Apply curves to image data
    for (let i = 0; i < data.length; i += 4) {
        const origR = data[i];
        const origG = data[i + 1];
        const origB = data[i + 2];

        data[i] = Math.round(origR + (lookupTables.red[origR] - origR) * strength);
        data[i + 1] = Math.round(origG + (lookupTables.green[origG] - origG) * strength);
        data[i + 2] = Math.round(origB + (lookupTables.blue[origB] - origB) * strength);
    }
}

// Build lookup table from curve points
function buildLookupTable(points) {
    const lut = new Uint8Array(256);
    
    for (let i = 0; i < 256; i++) {
        // Find surrounding points
        let p1, p2;
        for (let j = 0; j < points.length - 1; j++) {
            if (i >= points[j][0] && i <= points[j + 1][0]) {
                p1 = points[j];
                p2 = points[j + 1];
                break;
            }
        }

        if (p1 && p2) {
            // Linear interpolation
            const ratio = (i - p1[0]) / (p2[0] - p1[0]);
            lut[i] = Math.round(p1[1] + (p2[1] - p1[1]) * ratio);
        } else {
            lut[i] = i;
        }
    }
    
    return lut;
}

// Apply saturation adjustment
function applySaturation(data, saturation) {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate luminance
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Apply saturation
        data[i] = Math.min(255, Math.max(0, Math.round(lum + (r - lum) * saturation)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(lum + (g - lum) * saturation)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(lum + (b - lum) * saturation)));
    }
}

// Apply contrast adjustment
function applyContrast(data, contrast) {
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, Math.round(factor * (data[i] - 128) + 128)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(factor * (data[i + 1] - 128) + 128)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(factor * (data[i + 2] - 128) + 128)));
    }
}

// Apply film grain
function applyGrain(data, width, height, amount, size) {
    // Create grain pattern
    const grainCanvas = document.createElement('canvas');
    const grainCtx = grainCanvas.getContext('2d');
    
    // Use smaller canvas for grain pattern based on size
    const grainScale = Math.max(1, Math.round(size));
    grainCanvas.width = Math.ceil(width / grainScale);
    grainCanvas.height = Math.ceil(height / grainScale);
    
    const grainData = grainCtx.createImageData(grainCanvas.width, grainCanvas.height);
    const grain = grainData.data;
    
    // Generate grain with per-channel noise for more natural appearance
    for (let i = 0; i < grain.length; i += 4) {
        // Different noise amount per channel for more film-like grain
        const noiseR = (Math.random() - 0.5) * amount * 512;
        const noiseG = (Math.random() - 0.5) * amount * 512;
        const noiseB = (Math.random() - 0.5) * amount * 512;
        
        grain[i] = 128 + noiseR;
        grain[i + 1] = 128 + noiseG * 0.95; // Slightly less green
        grain[i + 2] = 128 + noiseB * 0.9;  // Even less blue
        grain[i + 3] = 255;
    }
    
    grainCtx.putImageData(grainData, 0, 0);
    
    // Scale up grain if needed
    if (grainScale > 1) {
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = width;
        scaledCanvas.height = height;
        const scaledCtx = scaledCanvas.getContext('2d');
        // Enable smoothing for more natural grain appearance
        scaledCtx.imageSmoothingEnabled = true;
        scaledCtx.imageSmoothingQuality = 'low';
        scaledCtx.drawImage(grainCanvas, 0, 0, width, height);
        
        const scaledData = scaledCtx.getImageData(0, 0, width, height).data;
        
        // Apply grain using overlay blend mode with slight variation
        for (let i = 0; i < data.length; i += 4) {
            const grainR = scaledData[i] - 128;
            const grainG = scaledData[i + 1] - 128;
            const grainB = scaledData[i + 2] - 128;
            
            // Overlay blend mode calculation
            if (data[i] < 128) {
                data[i] = Math.min(255, Math.max(0, data[i] + grainR * (data[i] / 128)));
            } else {
                data[i] = Math.min(255, Math.max(0, data[i] + grainR * ((255 - data[i]) / 128)));
            }
            
            if (data[i + 1] < 128) {
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grainG * (data[i + 1] / 128)));
            } else {
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grainG * ((255 - data[i + 1]) / 128)));
            }
            
            if (data[i + 2] < 128) {
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grainB * (data[i + 2] / 128)));
            } else {
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grainB * ((255 - data[i + 2]) / 128)));
            }
        }
    }
}