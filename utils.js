// Utility functions for EXIF Frame Generator

// Format exposure time
function fmtExposure(v) {
    const n = Number(v);
    if (!isFinite(n) || n <= 0) return '';
    if (n >= 1) return `${n.toFixed(n < 10 ? 1 : 0)}s`;
    return `1/${Math.round(1 / n)}s`;
}

// Format aperture
function fmtAperture(v) {
    const n = Number(v);
    if (!isFinite(n) || n <= 0) return '';
    return `f/${n.toFixed(1)}`;
}

// Format date
function fmtDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
}

// Wrap text lines to fit width
function wrapLines(ctx, text, maxWidth) {
    if (!text) return [];
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width <= maxWidth) {
            line = test;
        } else {
            if (line) lines.push(line);
            line = w;
        }
    }
    if (line) lines.push(line);
    return lines;
}

// Export functions
export { fmtExposure, fmtAperture, fmtDate, wrapLines };