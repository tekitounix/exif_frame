// Editor Controller - Connects view and logic, handles events

import { EditorView } from './editor-view.js';
import { EditorLogic } from './editor-logic.js';

export class EditorController {
    constructor(state, onParamChange) {
        this.view = new EditorView();
        this.logic = new EditorLogic(state);
        this.onParamChange = onParamChange; // Callback when parameters change
        
        this.setupEventListeners();
    }

    // Initialize editor
    init() {
        this.view.showEditor();
    }

    // Setup all event listeners
    setupEventListeners() {
        // Tool button clicks
        this.view.getToolButtons().forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleToolClick(btn.dataset.tool);
            });
        });
    }

    // Handle tool button click
    handleToolClick(toolId, forceShow = false) {
        const tool = this.logic.setActiveTool(toolId);
        
        if (!tool) {
            // Tool deactivated
            this.view.clearUI();
            this.view.setActiveTool(null);
            return;
        }

        // Tool activated
        this.view.setActiveTool(toolId);
        this.view.createParameterButtons(tool.params, this.logic.activeParam);
        this.view.showSliderContainer();
        
        // Update all parameter values and progress states
        tool.params.forEach(param => {
            const value = this.logic.getParamValue(param.id);
            const displayValue = this.logic.formatDisplayValue(param.id, value);
            this.view.updateParameterValue(param.id, displayValue);
            
            // Update amount ring for edited parameters
            const config = this.logic.getParamConfig(param.id);
            let amount = 0;
            const isDefault = this.logic.isDefaultValue(param.id, value);
            
            if (param.type === 'slider') {
                // Calculate amount from default, not from min
                const defaultVal = config.default || 0;
                if (param.id === 'zoom') {
                    amount = Math.abs(value - 100) / 4; // Max deviation is 400 (500-100)
                } else if (param.id === 'fontSize' || param.id === 'textPadding') {
                    amount = Math.abs(value - defaultVal) / (config.max - defaultVal);
                } else if (config.min < 0 && config.max > 0) {
                    // Parameters with negative range (rotation, exposure, etc)
                    amount = Math.abs(value) / Math.max(Math.abs(config.min), config.max);
                } else {
                    amount = Math.abs(value - defaultVal) / (config.max - config.min);
                }
                amount = Math.min(1, amount) * 100;
            } else if (param.type === 'toggle') {
                amount = value === config.default ? 0 : 100;
            } else if (param.type === 'segmented') {
                amount = value === config.default ? 0 : 100;
            }
            
            this.view.updateParameterProgress(param.id, amount, isDefault);
            
            // Apply bypass state
            if (this.logic.isParamBypassed(param.id)) {
                this.view.toggleParameterBypass(param.id, true);
            } else {
                this.view.toggleParameterBypass(param.id, false);
            }
        });
        
        // Setup parameter button listeners
        this.setupParameterSwipe();
        // Click listeners are handled in setupParameterSwipe to avoid duplicates

        // Show first parameter
        this.showParameter(this.logic.activeParam);
    }

    // Handle parameter button click
    handleParamClick(paramId) {
        console.log(`Click: ${paramId}, Active: ${this.logic.activeParam}`);
        
        // Get the previous active parameter before any changes
        const previousActiveParam = this.logic.activeParam;
        
        // If clicking on a different parameter, switch to it
        if (previousActiveParam !== paramId) {
            this.logic.setActiveParam(paramId);
            this.view.setActiveParameter(paramId);
            this.showParameter(paramId);
            return;
        }
        
        // If this is the same parameter that's currently active, toggle bypass
        const btn = this.view.parameterSelector.querySelector(`.parameter-btn[data-param="${paramId}"]`);
        if (btn && btn.classList.contains('active')) {
            // This is a click on the currently active parameter - toggle bypass
            const isBypassed = this.logic.toggleBypass(paramId);
            this.view.toggleParameterBypass(paramId, isBypassed);
            this.onParamChange(paramId);
        }
    }

    // Show parameter control
    showParameter(paramId) {
        const param = this.logic.getCurrentParam();
        if (!param) return;
        
        // Store current parameter in view
        this.view.sliderWrapper.dataset.currentParam = paramId;

        const config = this.logic.getParamConfig(paramId);
        const value = this.logic.getParamValue(paramId);
        
        // Show parameter label
        this.view.showParameterLabel(param.name);
        
        // Update display value
        this.view.updateValueDisplay(
            this.logic.formatDisplayValue(paramId, value)
        );

        // Check if we need to recreate the control
        const previousParam = this.previousParam;
        const previousTool = this.previousTool;
        const currentTool = this.logic.activeTool;
        
        // Get previous parameter type
        let previousType = null;
        if (previousParam && previousTool) {
            const prevParam = this.logic.tools[previousTool].params.find(p => p.id === previousParam);
            previousType = prevParam ? prevParam.type : null;
        }
        
        const needsRecreate = !previousParam || 
                            previousTool !== currentTool || 
                            previousType !== param.type ||
                            (param.type === 'segmented' && this.currentSegmentedOptions !== config.options?.length);
        
        // Store current state for next time
        this.previousParam = paramId;
        this.previousTool = currentTool;
        if (param.type === 'segmented') {
            this.currentSegmentedOptions = config.options?.length;
        }
        
        // Always recreate controls to ensure perfect sync
        // This prevents any timing issues or stale state
        
        // Clear current control and create new one immediately
        const sliderWrapper = this.view.sliderWrapper;
        sliderWrapper.innerHTML = '';
        sliderWrapper.classList.remove('visible');
        
        // Create appropriate control immediately
        let control;
        switch (param.type) {
            case 'slider':
                control = this.view.createSlider({
                    id: paramId,
                    min: config.min,
                    max: config.max,
                    step: config.step,
                    value: value,
                    default: config.default
                });
                control.addEventListener('input', (e) => {
                    this.handleSliderChange(paramId, parseFloat(e.target.value), e.target);
                });
                break;

            case 'toggle':
                control = this.view.createToggle({
                    id: paramId,
                    value: value
                });
                control.addEventListener('change', (e) => {
                    this.handleToggleChange(paramId, e.detail.index === 1);
                });
                break;

            case 'segmented':
                control = this.view.createSegmentedControl({
                    id: paramId,
                    options: config.options,
                    value: value
                });
                control.addEventListener('change', (e) => {
                    this.handleSegmentChange(paramId, e.detail.index);
                });
                break;
        }
            
        // Fade in new control immediately
        requestAnimationFrame(() => {
            sliderWrapper.classList.add('visible');
        });
    }

    // Handle slider change
    handleSliderChange(paramId, value, sliderElement = null) {
        this.logic.updateParamValue(paramId, value);
        const displayValue = this.logic.formatDisplayValue(paramId, value);
        this.view.updateValueDisplay(displayValue);
        this.view.updateParameterValue(paramId, displayValue);
        
        if (sliderElement) {
            this.view.updateSliderProgress(sliderElement);
        }
        
        // Update progress ring
        const config = this.logic.getParamConfig(paramId);
        const progress = ((value - config.min) / (config.max - config.min)) * 100;
        const isDefault = this.logic.isDefaultValue(paramId, value);
        this.view.updateParameterProgress(paramId, progress, isDefault);
        
        this.onParamChange(paramId);
    }

    // Handle toggle change
    handleToggleChange(paramId, value) {
        this.logic.updateParamValue(paramId, value);
        this.view.updateValueDisplay(
            this.logic.formatDisplayValue(paramId, value)
        );
        this.view.updateParameterValue(paramId, this.logic.formatDisplayValue(paramId, value));
        
        // Update progress ring
        const isDefault = this.logic.isDefaultValue(paramId, value);
        this.view.updateParameterProgress(paramId, value ? 100 : 0, isDefault);
        
        this.onParamChange(paramId);
    }

    // Handle segment change
    handleSegmentChange(paramId, index) {
        this.logic.updateParamValue(paramId, index);
        this.view.updateValueDisplay(
            this.logic.formatDisplayValue(paramId, index)
        );
        this.view.updateParameterValue(paramId, this.logic.formatDisplayValue(paramId, index));
        
        // Update progress ring
        const config = this.logic.getParamConfig(paramId);
        const progress = (index / (config.options.length - 1)) * 100;
        const isDefault = this.logic.isDefaultValue(paramId, index);
        this.view.updateParameterProgress(paramId, progress, isDefault);
        
        this.onParamChange(paramId);
    }

    // Setup parameter swipe navigation
    setupParameterSwipe() {
        const selector = this.view.parameterSelector;
        const wrapper = selector.querySelector('.parameter-icons-wrapper');
        if (!wrapper) return;

        // Remove any existing listeners first to prevent duplicates
        if (this.cleanupSwipe) {
            this.cleanupSwipe();
        }

        let isDragging = false;
        let startX = 0;
        let startOffset = 0;
        let currentOffset = 0;
        let startTime = 0;
        let hasMoved = false;
        let clickProcessed = false;

        const handleStart = (e) => {
            isDragging = true; // Set dragging state to true on start
            startX = e.touches ? e.touches[0].clientX : e.clientX;
            startTime = Date.now();
            hasMoved = false;
            clickProcessed = false;
            const transform = wrapper.style.transform || 'translateX(0px)';
            startOffset = parseFloat(transform.match(/translateX\(([-\d.]+)px\)/)?.[1] || 0);
            currentOffset = startOffset;
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            const diff = Math.abs(x - startX);
            // Only mark as moved if actually moved more than 5 pixels
            if (diff > 5) {
                hasMoved = true;
            }
            e.preventDefault();
            
            const moveX = x - startX;
            currentOffset = startOffset + moveX;
            
            // Apply the offset with smoother transition
            wrapper.style.transition = 'none';
            wrapper.style.transform = `translateX(${currentOffset}px)`;
            
            // Check which button is at center with debouncing
            const buttons = Array.from(wrapper.querySelectorAll('.parameter-btn'));
            const containerWidth = selector.offsetWidth;
            const centerX = containerWidth / 2;
            
            let closestIndex = 0;
            let closestDistance = Infinity;
            
            buttons.forEach((btn, index) => {
                const rect = btn.getBoundingClientRect();
                const selectorRect = selector.getBoundingClientRect();
                const btnCenterX = rect.left - selectorRect.left + rect.width / 2;
                const distance = Math.abs(btnCenterX - centerX);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = index;
                }
            });
            
            // Update active button
            const paramId = buttons[closestIndex].dataset.param;
            if (this.logic.activeParam !== paramId) {
                // Only change selection from swipe
                this.logic.setActiveParam(paramId);
                this.view.setActiveParameter(paramId);
                this.showParameter(paramId);
            }
        };

        const handleEnd = (e) => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            
            // If it's a quick tap (less than 200ms) and hasn't moved much
            if (!hasMoved && duration < 200) {
                const target = e?.target?.closest('.parameter-btn');
                if (target) {
                    // Prevent duplicate click handling
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleParamClick(target.dataset.param);
                }
            }
            
            if (isDragging) {
                isDragging = false;
                
                // Snap to active button with animation
                wrapper.style.transition = 'transform 0.2s ease';
                const activeBtn = wrapper.querySelector('.parameter-btn.active');
                if (activeBtn) {
                    const index = Array.from(wrapper.querySelectorAll('.parameter-btn')).indexOf(activeBtn);
                    this.view.centerParameterButton(index);
                }
            }
        };

        // Touch events
        wrapper.addEventListener('touchstart', handleStart, { passive: true });
        wrapper.addEventListener('touchmove', handleMove, { passive: false });
        wrapper.addEventListener('touchend', handleEnd);
        
        // Mouse events - use wrapper for mousemove to prevent hover issues
        wrapper.addEventListener('mousedown', handleStart);
        wrapper.addEventListener('mousemove', handleMove);
        wrapper.addEventListener('mouseup', handleEnd);
        
        // Also handle mouseup on window in case mouse is released outside
        const handleWindowMouseUp = (e) => {
            if (isDragging) {
                handleEnd(e);
            }
        };
        window.addEventListener('mouseup', handleWindowMouseUp);
        
        // Store cleanup function
        this.cleanupSwipe = () => {
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }
}