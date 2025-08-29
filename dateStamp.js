// Film date stamp module (写ルンです style)

/**
 * Draw film-style date stamp on canvas
 * @param {CanvasRenderingContext2D} ctx - Main canvas context
 * @param {Object} config - Configuration object
 * @param {string} config.date - Date string
 * @param {number} config.imageDrawW - Image draw width
 * @param {number} config.imageDrawH - Image draw height
 * @param {number} config.imagePad - Image padding
 * @param {number} config.opacity - Opacity (0-100)
 * @param {number} config.brightness - Brightness (50-150)
 * @param {number} config.blur - Blur amount in pixels
 */
export function drawFilmDateStamp(ctx, config) {
    const {
        date,
        imageDrawW,
        imageDrawH,
        imagePad,
        opacity = 60,
        brightness = 100,
        blur = 0.8 // Reduced blur for more realistic film stamp
    } = config;
    
    if (!date) return;
    
    // Check DSEG font availability
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    testCanvas.width = 100;
    testCanvas.height = 50;
    
    // Font test
    testCtx.font = '20px monospace';
    const monoWidth = testCtx.measureText('0').width;
    testCtx.font = '20px "DSEG14-Classic-MINI"';
    const dsegWidth = testCtx.measureText('0').width;
    
    // If DSEG14 not available, try DSEG7
    if (dsegWidth === monoWidth) {
        testCtx.font = '20px "DSEG7-Modern-MINI"';
        const dseg7Width = testCtx.measureText('0').width;
        if (dseg7Width !== monoWidth) {
            // DSEG7 is available
            return;
        }
    }
    
    // Parse date
    let dateStr = "'25  1 23";
    try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear().toString().slice(-2);
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            dateStr = `'${year}  ${String(month).padStart(2, ' ')}  ${String(day).padStart(2, ' ')}`;
        }
    } catch (e) {
        console.error('Date parse error:', e);
    }
    
    // Configure date stamp - smaller size for realistic film look
    const dateFontSize = Math.round(imageDrawW * 0.018); // 1.8% of image width (smaller)
    const dateFont = dsegWidth !== monoWidth 
        ? `${dateFontSize}px "DSEG14-Classic-MINI", "DSEG7-Modern-MINI", monospace`
        : `${dateFontSize}px monospace`;
    
    // Create temporary canvas for date stamp
    const dateCanvas = document.createElement('canvas');
    const dateCtx = dateCanvas.getContext('2d');
    
    // Measure text
    dateCtx.font = dateFont;
    const dateTextMetrics = dateCtx.measureText(dateStr);
    const dateWidth = dateTextMetrics.width;
    const dateHeight = dateFontSize * 1.2;
    
    // Size date canvas with padding
    const datePadding = dateFontSize * 0.5;
    dateCanvas.width = dateWidth + datePadding * 2;
    dateCanvas.height = dateHeight + datePadding;
    
    // Apply subtle blur effect for film realism
    if (blur > 0) {
        dateCtx.filter = `blur(${blur}px) brightness(${brightness}%)`;
    }
    
    // Draw date text
    dateCtx.font = dateFont;
    dateCtx.fillStyle = `rgba(255, 100, 0, ${opacity / 100})`;  // Deeper orange for film stamp
    dateCtx.textBaseline = 'middle';
    dateCtx.fillText(dateStr, datePadding, dateCanvas.height / 2);
    
    // Apply brightness adjustment
    if (brightness !== 100) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = brightness / 100;
    }
    
    // Draw date stamp on main canvas
    const dateX = imagePad + imageDrawW - dateCanvas.width - (dateFontSize * 0.8);
    const dateY = imagePad + imageDrawH - dateCanvas.height - (dateFontSize * 0.8);
    ctx.drawImage(dateCanvas, dateX, dateY);
    
    if (brightness !== 100) {
        ctx.restore();
    }
}

/**
 * Format date string for film stamp
 * @param {Date|string} date - Date object or string
 * @returns {string} Formatted date string
 */
export function formatFilmDate(date) {
    try {
        const dateObj = date instanceof Date ? date : new Date(date);
        if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear().toString().slice(-2);
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            return `'${year}  ${String(month).padStart(2, ' ')}  ${String(day).padStart(2, ' ')}`;
        }
    } catch (e) {
        console.error('Date parse error:', e);
    }
    return "'25  1 23"; // Default
}