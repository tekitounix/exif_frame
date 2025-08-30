// Editor View - UI components and DOM manipulation only

export class EditorView {
    constructor() {
        this.parameterSelector = document.getElementById('parameterSelector');
        this.sliderContainer = document.getElementById('sliderContainer');
        this.sliderWrapper = document.getElementById('sliderWrapper');
        this.editorControls = document.getElementById('editorControls');
        this.parameterLabel = document.getElementById('parameterLabel');
        this.previewContainer = document.querySelector('.preview-container');
        
        // Setup resize observer to adjust layout
        this.setupLayoutAdjustment();
    }

    // Show/hide editor
    showEditor() {
        this.editorControls.classList.add('active');
    }

    hideEditor() {
        this.editorControls.classList.remove('active');
    }

    // Clear all UI elements
    clearUI() {
        this.parameterSelector.classList.remove('active');
        this.sliderContainer.classList.remove('active');
        this.parameterLabel.classList.remove('active');
        this.sliderWrapper.innerHTML = '';
        this.parameterLabel.textContent = '';
    }
    
    // Show parameter label
    showParameterLabel(name) {
        this.parameterLabel.textContent = name;
        this.parameterLabel.classList.add('active');
    }

    // Create parameter buttons
    createParameterButtons(params, activeParam) {
        this.parameterSelector.innerHTML = '';
        this.parameterSelector.classList.add('active');
        
        // Create wrapper for sliding animation
        const wrapper = document.createElement('div');
        wrapper.className = 'parameter-icons-wrapper';
        this.parameterSelector.appendChild(wrapper);
        
        // Store initial active index
        let initialActiveIndex = -1;

        params.forEach((param, index) => {
            const btn = document.createElement('button');
            btn.className = 'parameter-btn';
            btn.dataset.param = param.id;
            btn.dataset.type = param.type; // Add parameter type
            if (param.id === activeParam) {
                btn.classList.add('active');
                initialActiveIndex = index;
            }

            const icon = document.createElement('div');
            icon.className = 'parameter-icon';
            icon.innerHTML = param.icon;

            const value = document.createElement('div');
            value.className = 'parameter-value';
            value.dataset.param = param.id;
            value.textContent = '0';

            const name = document.createElement('div');
            name.className = 'parameter-name';
            name.textContent = param.name;

            btn.appendChild(icon);
            btn.appendChild(value);
            btn.appendChild(name);
            wrapper.appendChild(btn);
        });
        
        // Center the initial active button after DOM update
        if (initialActiveIndex >= 0) {
            setTimeout(() => {
                this.centerParameterButton(initialActiveIndex);
            }, 0);
        }
    }
    
    // Center parameter button
    centerParameterButton(activeIndex) {
        const wrapper = this.parameterSelector.querySelector('.parameter-icons-wrapper');
        if (!wrapper) return;
        
        const buttons = wrapper.querySelectorAll('.parameter-btn');
        if (!buttons[activeIndex]) return;
        
        const activeBtn = buttons[activeIndex];
        const container = this.parameterSelector;
        
        console.log(`centerParameterButton: index ${activeIndex}, button: ${activeBtn.dataset.param}`);
        
        // Get button position relative to wrapper
        const btnOffsetLeft = activeBtn.offsetLeft;
        const btnWidth = activeBtn.offsetWidth;
        const btnCenter = btnOffsetLeft + (btnWidth / 2);
        
        // Get container center
        const containerWidth = container.offsetWidth;
        const containerCenter = containerWidth / 2;
        
        // Calculate offset to center the active button
        const targetOffset = containerCenter - btnCenter;
        
        // Get wrapper total width
        const wrapperWidth = wrapper.scrollWidth;
        
        // Only apply bounds if wrapper is wider than container
        let finalOffset = targetOffset;
        if (wrapperWidth > containerWidth) {
            // Calculate bounds to keep content visible
            const minOffset = containerWidth - wrapperWidth;
            const maxOffset = 0;
            
            // Clamp the offset to keep icons visible
            finalOffset = Math.max(minOffset, Math.min(maxOffset, targetOffset));
        }
        
        // Apply smooth transition
        wrapper.style.transition = 'transform 0.3s ease';
        wrapper.style.transform = `translateX(${finalOffset}px)`;
        
        // Remove transition after animation
        setTimeout(() => {
            wrapper.style.transition = '';
        }, 300);
    }

    // Update active parameter button and slide to center
    setActiveParameter(paramId) {
        const buttons = this.parameterSelector.querySelectorAll('.parameter-btn');
        let activeIndex = -1;
        
        buttons.forEach((btn, index) => {
            const isActive = btn.dataset.param === paramId;
            btn.classList.toggle('active', isActive);
            if (isActive) activeIndex = index;
        });
        
        console.log(`setActiveParameter: ${paramId}, activeIndex: ${activeIndex}`);
        
        // Slide active button to center
        if (activeIndex >= 0) {
            this.centerParameterButton(activeIndex);
        }
    }

    // Show slider container
    showSliderContainer() {
        this.sliderContainer.classList.add('active');
    }

    // Update value display
    updateValueDisplay(value) {
        // Value display is no longer used in iOS Photos style
        // Values are shown in parameter buttons instead
    }
    
    // Update parameter value display
    updateParameterValue(paramId, value) {
        const valueEl = this.parameterSelector.querySelector(`.parameter-value[data-param="${paramId}"]`);
        if (valueEl) {
            valueEl.textContent = value;
        }
    }
    
    // Update parameter progress ring
    updateParameterProgress(paramId, progress, isDefault = false) {
        const btn = this.parameterSelector.querySelector(`.parameter-btn[data-param="${paramId}"]`);
        if (btn) {
            btn.style.setProperty('--progress', progress + '%');
            // Add edited class if not default value
            if (!isDefault && progress > 0) {
                btn.classList.add('edited');
            } else {
                btn.classList.remove('edited');
            }
        }
    }
    
    // Toggle parameter bypass state
    toggleParameterBypass(paramId, isBypassed) {
        const btn = this.parameterSelector.querySelector(`.parameter-btn[data-param="${paramId}"]`);
        if (btn) {
            if (isBypassed) {
                btn.classList.add('bypassed');
            } else {
                btn.classList.remove('bypassed');
            }
        }
    }
    
    // Check if parameter is currently active
    isParameterActive(paramId) {
        const btn = this.parameterSelector.querySelector(`.parameter-btn[data-param="${paramId}"]`);
        return btn && btn.classList.contains('active');
    }

    // Create iOS Photos scroll slider
    createSlider(config) {
        this.sliderWrapper.innerHTML = '';

        // Create container
        const container = document.createElement('div');
        container.className = 'ios-slider-container';

        // Create center indicator
        const center = document.createElement('div');
        center.className = 'ios-slider-center';
        container.appendChild(center);
        
        // Create value dot for center position
        const valueDot = document.createElement('div');
        valueDot.className = 'ios-slider-value-dot';
        container.appendChild(valueDot);

        // Create scale container
        const scale = document.createElement('div');
        scale.className = 'ios-slider-scale';

        // Fixed slider width and marks for all parameters
        const SLIDER_WIDTH = 400; // Fixed width for consistent operation
        const range = config.max - config.min;
        const totalMarks = 41; // 40 divisions + 1
        const pixelsPerStep = SLIDER_WIDTH / (totalMarks - 1);
        const totalWidth = SLIDER_WIDTH;

        // Create marks (40 divisions)
        for (let i = 0; i < totalMarks; i++) {
            const mark = document.createElement('div');
            mark.className = 'ios-slider-mark';
            
            // Every 10th mark is major (0, 10, 20, 30, 40)
            if (i % 10 === 0) {
                mark.classList.add('major');
            } else {
                mark.classList.add('minor');
            }
            
            // Position marks with flex gap instead of margin
            scale.appendChild(mark);
        }

        // Set initial position - map value to fixed width
        const normalizedValue = (config.value - config.min) / range;
        const valuePosition = normalizedValue * totalWidth;
        
        // Defer position calculation until container has width
        setTimeout(() => {
            const containerWidth = container.offsetWidth || 280;
            const initialOffset = containerWidth / 2 - valuePosition;
            scale.style.transform = `translate3d(${initialOffset}px, -50%, 0)`;
            
            // Update center dot position based on parameter type
            let dotPosition;
            if (config.id === 'zoom') {
                // For zoom, dot at x1 (value 100), which is at the left edge
                dotPosition = 0;
            } else if (config.min < 0 && config.max > 0) {
                // For parameters with negative range, dot at value 0
                dotPosition = (-config.min / range) * totalWidth;
            } else {
                // For other parameters, dot at center of range
                dotPosition = totalWidth / 2;
            }
            valueDot.style.left = `${dotPosition}px`;
            valueDot.style.transform = `translate3d(${initialOffset}px, 0, 0)`;
        }, 0);
        
        scale.style.width = totalWidth + 'px';

        container.appendChild(scale);

        // Hidden input for value storage
        const input = document.createElement('input');
        input.type = 'range';
        input.className = 'ios-slider';
        input.min = config.min;
        input.max = config.max;
        input.step = config.step;
        input.value = config.value;
        input.dataset.param = config.id;
        container.appendChild(input);

        // Touch/mouse handling
        let isDragging = false;
        let startX = 0;
        let startOffset = 0;
        let lastTapTime = 0;
        let tapCount = 0;
        let tapTimer = null;

        // Double tap/click detection
        const handleDoubleTap = () => {
            // Get default value based on parameter type
            let defaultValue = config.default;
            if (defaultValue === undefined) {
                // Fallback defaults
                if (config.id === 'zoom') {
                    defaultValue = 100;
                } else if (config.min < 0 && config.max > 0) {
                    defaultValue = 0;
                } else {
                    defaultValue = config.min;
                }
            }
            
            // Update slider to default value
            input.value = defaultValue;
            
            // Update visual position
            const normalizedValue = (defaultValue - config.min) / range;
            const targetPosition = normalizedValue * totalWidth;
            const containerWidth = container.offsetWidth || 280;
            const targetOffset = containerWidth / 2 - targetPosition;
            
            scale.style.transition = 'transform 0.3s ease';
            valueDot.style.transition = 'transform 0.3s ease';
            scale.style.transform = `translate3d(${targetOffset}px, -50%, 0)`;
            valueDot.style.transform = `translate3d(${targetOffset}px, 0, 0)`;
            
            setTimeout(() => {
                scale.style.transition = 'none';
                valueDot.style.transition = 'none';
            }, 300);
            
            // Dispatch input event
            input.dispatchEvent(new Event('input', { bubbles: true }));
        };

        const handleStart = (e) => {
            // Double tap detection
            const currentTime = Date.now();
            if (currentTime - lastTapTime < 300) {
                tapCount++;
                if (tapCount === 2) {
                    clearTimeout(tapTimer);
                    handleDoubleTap();
                    tapCount = 0;
                    return;
                }
            } else {
                tapCount = 1;
            }
            lastTapTime = currentTime;
            
            // Reset tap count after timeout
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, 300);
            isDragging = true;
            container.classList.add('dragging');
            // Add dragging class to active parameter button
            const activeBtn = this.parameterSelector.querySelector('.parameter-btn.active');
            if (activeBtn) {
                activeBtn.classList.add('dragging');
            }
            startX = e.touches ? e.touches[0].clientX : e.clientX;
            // Parse the transform more safely
            const transform = scale.style.transform || '';
            const match = transform.match(/translate(?:3d|X)\(([-\d.]+)px/);
            if (match) {
                startOffset = parseFloat(match[1]);
            } else {
                // Calculate initial offset if transform not set yet
                const currentValue = parseFloat(input.value);
                const normalizedValue = (currentValue - config.min) / range;
                const valuePosition = normalizedValue * totalWidth;
                const containerWidth = container.offsetWidth || 280;
                startOffset = containerWidth / 2 - valuePosition;
                // Set the transform immediately
                scale.style.transform = `translate3d(${startOffset}px, -50%, 0)`;
                valueDot.style.transform = `translate3d(${startOffset}px, 0, 0)`;
            }
            e.preventDefault();
        };

        // Use RAF for smooth animation
        let rafId = null;
        let lastValue = config.value;
        
        const handleMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            // Cancel previous RAF
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            
            rafId = requestAnimationFrame(() => {
                const x = e.touches ? e.touches[0].clientX : e.clientX;
                const diff = x - startX;
                let newOffset = startOffset + diff;

                // Limit scrolling
                const minOffset = container.offsetWidth / 2 - totalWidth;
                const maxOffset = container.offsetWidth / 2;
                newOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

                // Use transform3d for hardware acceleration
                scale.style.transform = `translate3d(${newOffset}px, -50%, 0)`;
                valueDot.style.transform = `translate3d(${newOffset}px, 0, 0)`;

                // Calculate value based on position
                const centerOffset = container.offsetWidth / 2 - newOffset;
                const normalizedPosition = centerOffset / totalWidth;
                const value = config.min + normalizedPosition * range;
                const clampedValue = Math.max(config.min, Math.min(config.max, value));
                
                // Round to nearest step
                let roundedValue = Math.round(clampedValue / config.step) * config.step;
                
                // Apply snap points for specific parameters
                if (config.id === 'rotation') {
                    // Snap to 90° intervals if within 5° tolerance
                    const snapTolerance = 5;
                    const snapAngles = [-180, -90, 0, 90, 180];
                    for (let snapAngle of snapAngles) {
                        if (Math.abs(roundedValue - snapAngle) < snapTolerance) {
                            roundedValue = snapAngle;
                            break;
                        }
                    }
                }
                
                const finalValue = Math.max(config.min, Math.min(config.max, roundedValue));

                // Only dispatch event if value actually changed
                if (lastValue !== finalValue) {
                    lastValue = finalValue;
                    input.value = finalValue;
                    // Throttle input events
                    clearTimeout(this.inputTimeout);
                    this.inputTimeout = setTimeout(() => {
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }, 16); // ~60fps
                }
            });
        };

        const handleEnd = () => {
            isDragging = false;
            container.classList.remove('dragging');
            // Remove dragging class from active parameter button
            const activeBtn = this.parameterSelector.querySelector('.parameter-btn.active');
            if (activeBtn) {
                activeBtn.classList.remove('dragging');
            }
            // Cancel any pending RAF
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };

        // Mouse wheel support
        const handleWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? config.step : -config.step;
            const currentValue = parseFloat(input.value);
            const newValue = currentValue + delta;
            const clampedValue = Math.max(config.min, Math.min(config.max, newValue));
            
            if (currentValue !== clampedValue) {
                input.value = clampedValue;
                
                // Update slider position smoothly
                const normalizedValue = (clampedValue - config.min) / range;
                const targetPosition = normalizedValue * totalWidth;
                const containerWidth = container.offsetWidth || 280;
                const targetOffset = containerWidth / 2 - targetPosition;
                
                scale.style.transition = 'transform 0.1s ease';
                valueDot.style.transition = 'transform 0.1s ease';
                scale.style.transform = `translate3d(${targetOffset}px, -50%, 0)`;
                valueDot.style.transform = `translate3d(${targetOffset}px, 0, 0)`;
                
                setTimeout(() => {
                    scale.style.transition = 'none';
                    valueDot.style.transition = 'none';
                }, 100);
                
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };

        container.addEventListener('touchstart', handleStart, { passive: false });
        container.addEventListener('touchmove', handleMove, { passive: false });
        container.addEventListener('touchend', handleEnd);
        container.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        container.addEventListener('wheel', handleWheel, { passive: false });

        this.sliderWrapper.appendChild(container);
        return input;
    }

    // Create toggle as collection slider
    createToggle(config) {
        // Use different labels based on parameter type
        let options = ['Off', 'On'];
        if (config.id === 'theme') {
            options = ['Light', 'Dark'];
        }
        
        // Use segmented control with appropriate options
        return this.createSegmentedControl({
            id: config.id,
            options: options,
            value: config.value ? 1 : 0
        });
    }

    // Create segmented control as collection slider
    createSegmentedControl(config) {
        this.sliderWrapper.innerHTML = '';

        // Create container
        const container = document.createElement('div');
        container.className = 'ios-collection-slider';

        // Create center indicator
        const centerIndicator = document.createElement('div');
        centerIndicator.className = 'ios-collection-center';
        container.appendChild(centerIndicator);

        // Create scrollable scale
        const scale = document.createElement('div');
        scale.className = 'ios-collection-scale';

        // Calculate item width and spacing
        const itemWidth = 80;
        const itemSpacing = 10;
        const totalItems = config.options.length;
        const totalWidth = (itemWidth + itemSpacing) * totalItems;
        
        // Create items
        config.options.forEach((option, index) => {
            const item = document.createElement('div');
            item.className = 'ios-collection-item';
            item.dataset.index = index;
            item.textContent = option;
            item.style.width = `${itemWidth}px`;
            item.style.left = `${index * (itemWidth + itemSpacing)}px`;
            scale.appendChild(item);
        });

        scale.style.width = totalWidth + 'px';
        container.appendChild(scale);

        // Hidden input for value storage
        const input = document.createElement('input');
        input.type = 'hidden';
        input.value = config.value;
        container.appendChild(input);

        // Initialize position
        const containerWidth = 280; // Fixed container width
        const initialPosition = config.value * (itemWidth + itemSpacing) + (itemWidth / 2);
        const initialOffset = containerWidth / 2 - initialPosition;
        scale.style.transform = `translateX(${initialOffset}px)`;

        // Touch/mouse handling
        let isDragging = false;
        let startX = 0;
        let startOffset = 0;
        let currentValue = config.value;

        const updateSelection = (offset) => {
            // Calculate which item is at center
            const centerPosition = containerWidth / 2 - offset;
            const itemIndex = Math.round((centerPosition - itemWidth / 2) / (itemWidth + itemSpacing));
            const clampedIndex = Math.max(0, Math.min(totalItems - 1, itemIndex));
            
            // Update visual selection
            scale.querySelectorAll('.ios-collection-item').forEach((item, i) => {
                item.classList.toggle('active', i === clampedIndex);
            });
            
            return clampedIndex;
        };

        const snapToItem = (index) => {
            const targetPosition = index * (itemWidth + itemSpacing) + (itemWidth / 2);
            const targetOffset = containerWidth / 2 - targetPosition;
            scale.style.transition = 'transform 0.2s ease';
            scale.style.transform = `translateX(${targetOffset}px)`;
            
            // Clear transition after animation
            setTimeout(() => {
                scale.style.transition = 'none';
            }, 200);
            
            return targetOffset;
        };

        const handleStart = (e) => {
            handleTapStart(e); // Track for tap detection
            isDragging = true;
            container.classList.add('dragging');
            startX = e.touches ? e.touches[0].clientX : e.clientX;
            startOffset = parseFloat(scale.style.transform.match(/translateX\(([-\d.]+)px\)/)[1]);
            scale.style.transition = 'none';
            e.preventDefault();
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            hasDragged = true; // Mark as dragged
            e.preventDefault();
            
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            const diff = x - startX;
            let newOffset = startOffset + diff;
            
            // Limit scrolling
            const minOffset = containerWidth / 2 - totalWidth + itemWidth / 2;
            const maxOffset = containerWidth / 2 - itemWidth / 2;
            newOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));
            
            scale.style.transform = `translateX(${newOffset}px)`;
            updateSelection(newOffset);
        };

        const handleEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            container.classList.remove('dragging');
            
            // Snap to nearest item
            const currentOffset = parseFloat(scale.style.transform.match(/translateX\(([-\d.]+)px\)/)[1]);
            const newIndex = updateSelection(currentOffset);
            snapToItem(newIndex);
            
            // Fire change event if value changed
            if (newIndex !== currentValue) {
                currentValue = newIndex;
                input.value = newIndex;
                container.dispatchEvent(new CustomEvent('change', { 
                    detail: { index: newIndex }
                }));
            }
        };

        // Variables for tap detection
        let tapStartTime = 0;
        let tapStartX = 0;
        let hasDragged = false;

        // Enhanced tap detection
        const handleTapStart = (e) => {
            tapStartTime = Date.now();
            tapStartX = e.touches ? e.touches[0].clientX : e.clientX;
            hasDragged = false;
        };

        const handleTapEnd = (e) => {
            const tapEndTime = Date.now();
            const tapDuration = tapEndTime - tapStartTime;
            const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
            const tapDistance = Math.abs(endX - tapStartX);
            
            // If it's a quick tap (less than 200ms) and hasn't moved much (less than 10px)
            if (!hasDragged && tapDuration < 200 && tapDistance < 10) {
                const rect = container.getBoundingClientRect();
                const relativeX = endX - rect.left;
                
                // Find which item was tapped
                const currentOffset = parseFloat(scale.style.transform.match(/translateX\(([-\d.]+)px\)/)[1]);
                
                for (let i = 0; i < totalItems; i++) {
                    const itemPosition = i * (itemWidth + itemSpacing) + (itemWidth / 2) + currentOffset;
                    
                    if (Math.abs(relativeX - itemPosition) < itemWidth / 2 + 10) { // Added 10px tolerance
                        // Item was tapped
                        if (i !== currentValue) {
                            snapToItem(i);
                            currentValue = i;
                            input.value = i;
                            updateSelection(currentOffset);
                            container.dispatchEvent(new CustomEvent('change', { 
                                detail: { index: i }
                            }));
                        }
                        break;
                    }
                }
            }
        };

        // Add event listeners
        container.addEventListener('touchstart', (e) => {
            handleStart(e);
            handleTapStart(e);
        }, { passive: false });
        container.addEventListener('touchmove', handleMove, { passive: false });
        container.addEventListener('touchend', (e) => {
            handleEnd();
            handleTapEnd(e);
        });
        container.addEventListener('mousedown', handleStart);
        container.addEventListener('mousemove', handleMove);
        container.addEventListener('mouseup', handleEnd);
        container.addEventListener('click', (e) => {
            // For desktop click handling
            if (!e.touches) {
                handleTapEnd(e);
            }
        });

        // Set initial selection
        updateSelection(initialOffset);

        this.sliderWrapper.appendChild(container);
        return container;
    }

    // Update existing slider without recreating
    updateSlider(container, config, value) {
        const scale = container.querySelector('.ios-slider-scale');
        const input = container.querySelector('.ios-slider');
        const valueDot = container.querySelector('.ios-slider-value-dot');
        
        if (!scale || !input) return;
        
        // Update input values
        input.min = config.min;
        input.max = config.max;
        input.step = config.step;
        input.value = value;
        
        // Calculate positions
        const SLIDER_WIDTH = 400;
        const range = config.max - config.min;
        const normalizedValue = (value - config.min) / range;
        const valuePosition = normalizedValue * SLIDER_WIDTH;
        const containerWidth = container.offsetWidth || 280;
        const targetOffset = containerWidth / 2 - valuePosition;
        
        // Update position smoothly
        scale.style.transition = 'transform 0.15s ease';
        valueDot.style.transition = 'transform 0.15s ease';
        scale.style.transform = `translate3d(${targetOffset}px, -50%, 0)`;
        valueDot.style.transform = `translate3d(${targetOffset}px, 0, 0)`;
        
        // Update value dot position based on parameter type
        let dotPosition;
        if (config.id === 'zoom') {
            dotPosition = 0;
        } else if (config.min < 0 && config.max > 0) {
            dotPosition = (-config.min / range) * SLIDER_WIDTH;
        } else {
            dotPosition = SLIDER_WIDTH / 2;
        }
        valueDot.style.left = `${dotPosition}px`;
        
        // Reset transition after animation
        setTimeout(() => {
            scale.style.transition = 'none';
            valueDot.style.transition = 'none';
        }, 150);
    }
    
    // Update slider position (for iOS scroll slider)
    updateSliderProgress(slider) {
        // This is now handled internally by the scroll slider
        // No need to update CSS variables
    }

    // Set active tool button
    setActiveTool(toolId) {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolId);
        });
    }

    // Get tool buttons
    getToolButtons() {
        return document.querySelectorAll('.tool-btn');
    }

    // Get parameter buttons
    getParameterButtons() {
        return this.parameterSelector.querySelectorAll('.parameter-btn');
    }
    
    // Setup layout adjustment
    setupLayoutAdjustment() {
        if (!this.editorControls || !this.previewContainer) return;
        
        const preview = document.querySelector('.preview');
        const canvas = document.querySelector('.frame-canvas');
        if (!preview) return;
        
        // Function to update preview area height
        const updatePreviewHeight = () => {
            // Only update if editor is active/visible
            if (this.editorControls.classList.contains('active')) {
                // Use offsetHeight for more reliable height measurement
                const editorHeight = this.editorControls.offsetHeight;
                
                // On mobile, we need to account for actual rendered height
                preview.style.bottom = `${editorHeight}px`;
                
                // Update canvas constraints
                if (canvas) {
                    // Remove max-height constraint and rely on CSS
                    canvas.style.maxHeight = '';
                }
            } else {
                preview.style.bottom = '0px';
                if (canvas) {
                    canvas.style.maxHeight = '';
                }
            }
        };
        
        // Create ResizeObserver to watch editor controls height
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(updatePreviewHeight);
        });
        
        // Start observing editor controls
        resizeObserver.observe(this.editorControls);
        
        // Also watch for class changes on editor controls
        const observer = new MutationObserver(() => {
            requestAnimationFrame(updatePreviewHeight);
        });
        
        observer.observe(this.editorControls, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Watch for window resize
        window.addEventListener('resize', () => {
            requestAnimationFrame(updatePreviewHeight);
        });
        
        // Initial adjustment
        updatePreviewHeight();
    }
}