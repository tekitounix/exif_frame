// Editor Logic - Business logic for the editor, no DOM manipulation

import { FILM_FILTERS } from './filmFilters.js';

export class EditorLogic {
    constructor(state) {
        this.state = state;
        this.activeTool = null;
        this.activeParam = null;
        this.bypassedParams = new Set(); // Track bypassed parameters

        // Tool and parameter configurations
        this.tools = {
            crop: {
                name: 'Crop & Transform',
                params: [
                    { id: 'rotation', icon: '<i class="fas fa-redo"></i>', name: 'Rotate', type: 'slider' },
                    { id: 'zoom', icon: '<i class="fas fa-search-plus"></i>', name: 'Zoom', type: 'slider' },
                    { id: 'flipH', icon: '<i class="fas fa-arrows-alt-h"></i>', name: 'Flip H', type: 'toggle' },
                    { id: 'flipV', icon: '<i class="fas fa-arrows-alt-v"></i>', name: 'Flip V', type: 'toggle' }
                ]
            },
            adjust: {
                name: 'Adjust',
                params: [
                    { id: 'exposure', icon: '<i class="fas fa-sun"></i>', name: 'Exposure', type: 'slider' },
                    { id: 'highlights', icon: '<i class="fas fa-circle-half-stroke"></i>', name: 'Highlights', type: 'slider' },
                    { id: 'shadows', icon: '<i class="fas fa-circle"></i>', name: 'Shadows', type: 'slider' },
                    { id: 'contrast', icon: '<i class="fas fa-adjust"></i>', name: 'Contrast', type: 'slider' },
                    { id: 'whiteBalance', icon: '<i class="fas fa-temperature-half"></i>', name: 'Warmth', type: 'slider' },
                    { id: 'saturation', icon: '<i class="fas fa-palette"></i>', name: 'Saturation', type: 'slider' },
                    { id: 'vibrance', icon: '<i class="fas fa-magic"></i>', name: 'Vibrance', type: 'slider' },
                    { id: 'vignette', icon: '<i class="fas fa-circle-notch"></i>', name: 'Vignette', type: 'slider' },
                    { id: 'grain', icon: '<i class="fas fa-braille"></i>', name: 'Grain', type: 'slider' }
                ]
            },
            frame: {
                name: 'Frame',
                params: [
                    { id: 'ratio', icon: '<i class="fas fa-expand"></i>', name: 'Aspect', type: 'segmented' },
                    { id: 'orientation', icon: '<i class="fas fa-sync-alt"></i>', name: 'Orient', type: 'toggle' },
                    { id: 'textPadding', icon: '<i class="fas fa-text-width"></i>', name: 'Text Pad', type: 'slider' },
                    { id: 'framePadding', icon: '<i class="fas fa-border-all"></i>', name: 'Frame', type: 'toggle' },
                    { id: 'theme', icon: '<i class="fas fa-moon"></i>', name: 'Theme', type: 'toggle' },
                    { id: 'fontSize', icon: '<i class="fas fa-text-height"></i>', name: 'Font', type: 'slider' },
                    { id: 'lineSpacing', icon: '<i class="fas fa-arrows-alt-v"></i>', name: 'Line Gap', type: 'slider' }
                ]
            },
            film: {
                name: 'Film',
                params: [
                    { id: 'filmType', icon: '<i class="fas fa-film"></i>', name: 'Film', type: 'segmented' },
                    { id: 'filmStrength', icon: '<i class="fas fa-adjust"></i>', name: 'Strength', type: 'slider' },
                    { id: 'dateStamp', icon: '<i class="far fa-calendar-alt"></i>', name: 'Date', type: 'toggle' },
                    { id: 'dateOpacity', icon: '<i class="fas fa-circle-notch"></i>', name: 'Opacity', type: 'slider' },
                    { id: 'dateBrightness', icon: '<i class="fas fa-sun"></i>', name: 'Bright', type: 'slider' },
                    { id: 'dateBlur', icon: '<i class="fas fa-blur"></i>', name: 'Blur', type: 'slider' }
                ]
            }
        };

        this.paramConfigs = {
            rotation: { min: -180, max: 180, step: 1, default: 0 },
            zoom: { min: 100, max: 500, step: 10, default: 100 },
            flipH: { default: false },
            flipV: { default: false },
            ratio: { options: ['1:1', '4:3', '3:2', '16:9'], default: 0 },
            orientation: { default: false }, // false = original aspect, true = rotated aspect (swap width/height)
            textPadding: { min: 24, max: 48, step: 8, default: 24 },
            framePadding: { default: false }, // false = no frame padding, true = with frame padding
            theme: { default: false }, // false = light, true = dark
            fontSize: { min: 60, max: 100, step: 10, default: 80 },
            lineSpacing: { min: 0, max: 200, step: 10, default: 70 },
            filmType: { 
                options: ['None', 'Superia', 'Provia', 'Velvia', 'Portra', 'Ektar', 'Gold', 'Astia', 'Tri-X', 'HP5', 'T-MAX'], 
                default: 0 
            },
            filmStrength: { min: 0, max: 100, step: 1, default: 70 },
            dateStamp: { default: false },
            dateOpacity: { min: 0, max: 100, step: 10, default: 60 },
            dateBrightness: { min: 50, max: 150, step: 10, default: 100 },
            dateBlur: { min: 0, max: 2, step: 0.1, default: 0.8 },
            exposure: { min: -100, max: 100, step: 5, default: 0 },
            highlights: { min: -100, max: 100, step: 5, default: 0 },
            shadows: { min: -100, max: 100, step: 5, default: 0 },
            contrast: { min: -100, max: 100, step: 5, default: 0 },
            whiteBalance: { min: -100, max: 100, step: 5, default: 0 },
            saturation: { min: -100, max: 100, step: 5, default: 0 },
            vibrance: { min: -100, max: 100, step: 5, default: 0 },
            vignette: { min: 0, max: 100, step: 5, default: 0 },
            grain: { min: 0, max: 100, step: 5, default: 0 }
        };
    }

    // Set active tool
    setActiveTool(toolId) {
        if (this.activeTool === toolId) {
            this.activeTool = null;
            this.activeParam = null;
            return null;
        }
        
        this.activeTool = toolId;
        const tool = this.tools[toolId];
        if (tool && tool.params.length > 0) {
            this.activeParam = tool.params[0].id;
        }
        return tool;
    }

    // Set active parameter
    setActiveParam(paramId) {
        this.activeParam = paramId;
    }

    // Get current tool
    getCurrentTool() {
        return this.activeTool ? this.tools[this.activeTool] : null;
    }

    // Get current parameter
    getCurrentParam() {
        const tool = this.getCurrentTool();
        if (!tool) return null;
        return tool.params.find(p => p.id === this.activeParam);
    }

    // Get parameter config
    getParamConfig(paramId) {
        return this.paramConfigs[paramId];
    }

    // Toggle parameter bypass
    toggleBypass(paramId) {
        if (this.bypassedParams.has(paramId)) {
            this.bypassedParams.delete(paramId);
            console.log(`Bypass OFF: ${paramId}`);
            return false;
        } else {
            this.bypassedParams.add(paramId);
            console.log(`Bypass ON: ${paramId}`);
            return true;
        }
    }
    
    // Check if parameter is bypassed
    isParamBypassed(paramId) {
        return this.bypassedParams.has(paramId);
    }
    
    // Get parameter value from state
    getParamValue(paramId) {
        // If bypassed, return default value
        if (this.bypassedParams.has(paramId)) {
            const config = this.paramConfigs[paramId];
            if (paramId === 'zoom') return 100;
            if (paramId === 'fontSize') return 80;
            if (paramId === 'textPadding') return 24;
            if (paramId === 'ratio') return 0;
            return config ? config.default : 0;
        }
        
        switch (paramId) {
            case 'rotation': return this.state.rotation;
            case 'zoom': return this.state.zoom * 100;
            case 'flipH': return this.state.flipH;
            case 'flipV': return this.state.flipV;
            case 'ratio':
                const ratios = ['1:1', '4:3', '3:2', '16:9'];
                let idx = ratios.indexOf(this.state.cropRatio);
                if (idx === -1) idx = 0; // Default to first option if not found
                return idx;
            case 'orientation':
                return this.state.frameOrientation || false;
            case 'textPadding':
                return this.state.pad || 24;
            case 'framePadding':
                return this.state.useImagePadding || false;
            case 'theme': return this.state.themeKey === 'dark';
            case 'fontSize': return this.state.fontScale * 100;
            case 'filmType': return this.state.filmType || 0;
            case 'filmStrength': return this.state.filmStrength || 70;
            case 'dateStamp': return this.state.dateStamp || false;
            case 'dateOpacity': return this.state.dateOpacity;
            case 'dateBrightness': return this.state.dateBrightness;
            case 'dateBlur': return this.state.dateBlur;
            case 'exposure': return this.state.exposure || 0;
            case 'highlights': return this.state.highlights || 0;
            case 'shadows': return this.state.shadows || 0;
            case 'contrast': return this.state.contrast || 0;
            case 'whiteBalance': return this.state.whiteBalance || 0;
            case 'saturation': return this.state.saturation || 0;
            case 'vibrance': return this.state.vibrance || 0;
            case 'vignette': return this.state.vignette || 0;
            case 'grain': return this.state.grain || 0;
            default: return this.state[paramId] || 0;
        }
    }

    // Update parameter value in state
    updateParamValue(paramId, value) {
        console.log('Updating param:', paramId, 'to value:', value);
        switch (paramId) {
            case 'rotation':
                this.state.rotation = value;
                break;
            case 'zoom':
                this.state.zoom = value / 100;
                break;
            case 'flipH':
                this.state.flipH = value;
                break;
            case 'flipV':
                this.state.flipV = value;
                break;
            case 'ratio':
                const ratios = ['1:1', '4:3', '3:2', '16:9'];
                this.state.cropRatio = ratios[value] || '1:1';
                break;
            case 'orientation':
                this.state.frameOrientation = value; // Add new state for frame orientation
                break;
            case 'textPadding':
                this.state.pad = value;
                break;
            case 'framePadding':
                this.state.useImagePadding = value;
                break;
            case 'theme':
                this.state.themeKey = value ? 'dark' : 'light';
                break;
            case 'fontSize':
                this.state.fontScale = value / 100;
                break;
            case 'filmType':
                this.state.filmType = value;
                break;
            case 'filmStrength':
                this.state.filmStrength = value;
                break;
            case 'dateStamp':
                this.state.dateStamp = value;
                break;
            case 'dateOpacity':
                this.state.dateOpacity = value;
                break;
            case 'dateBrightness':
                this.state.dateBrightness = value;
                break;
            case 'dateBlur':
                this.state.dateBlur = value;
                break;
            case 'exposure':
                this.state.exposure = value;
                break;
            case 'highlights':
                this.state.highlights = value;
                break;
            case 'shadows':
                this.state.shadows = value;
                break;
            case 'whiteBalance':
                this.state.whiteBalance = value;
                break;
            case 'contrast':
                this.state.contrast = value;
                break;
            case 'saturation':
                this.state.saturation = value;
                break;
            case 'vibrance':
                this.state.vibrance = value;
                break;
            case 'vignette':
                this.state.vignette = value;
                break;
            case 'grain':
                this.state.grain = value;
                break;
            default:
                if (this.state.hasOwnProperty(paramId)) {
                    this.state[paramId] = value;
                }
        }
    }

    // Check if value is default
    isDefaultValue(paramId, value) {
        const config = this.paramConfigs[paramId];
        if (!config) return true;
        
        switch (paramId) {
            case 'rotation':
                return value === config.default;
            case 'zoom':
                return value === 100; // zoom is stored as percentage
            case 'flipH':
            case 'flipV':
            case 'orientation':
            case 'framePadding':
                return value === config.default;
            case 'theme':
                return value === false; // Light is default
            case 'ratio':
                return value === 0; // Original is default
            case 'textPadding':
                return value === 24; // 24 is default
            case 'fontSize':
                return value === 80; // 80 is default
            case 'dateOpacity':
            case 'dateBrightness':
            case 'dateBlur':
            case 'exposure':
            case 'highlights':
            case 'shadows':
            case 'whiteBalance':
                return value === config.default;
            default:
                return value === (config.default || 0);
        }
    }
    
    // Format display value with units
    formatDisplayValue(paramId, value) {
        switch (paramId) {
            case 'rotation':
                return `${Math.round(value)}°`;
            case 'zoom':
                return `×${(value / 100).toFixed(2)}`;
            case 'flipH':
            case 'flipV':
                return value ? 'On' : 'Off';
            case 'theme':
                return value ? 'Dark' : 'Light';
            case 'ratio':
                const ratios = ['1:1', '4:3', '3:2', '16:9'];
                return ratios[value] || '1:1';
            case 'orientation':
                return value ? 'Rotate' : 'Original';
            case 'textPadding':
                return `${Math.round(value)}px`;
            case 'framePadding':
                return value ? 'On' : 'Off';
            case 'fontSize':
                return `${Math.round(value)}%`;
            case 'dateOpacity':
                return `${Math.round(value)}%`;
            case 'dateBrightness':
                return `${Math.round(value)}%`;
            case 'dateBlur':
                return `${value.toFixed(1)}px`;
            case 'exposure':
            case 'highlights':
            case 'shadows':
            case 'contrast':
            case 'whiteBalance':
            case 'saturation':
            case 'vibrance':
                const val = Math.round(value);
                return val > 0 ? `+${val}` : `${val}`;
            case 'vignette':
            case 'grain':
            case 'filmStrength':
                return `${Math.round(value)}%`;
            case 'filmType':
                const filmNames = Object.keys(FILM_FILTERS);
                return filmNames[value] || 'None';
            case 'dateStamp':
                return value ? 'On' : 'Off';
            default:
                return Math.round(value);
        }
    }
}