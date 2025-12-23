// Depth utilities for underwater visual effects
// Handles opacity, tinting, and gradient effects based on depth

// Cache for optimized depth calculations
let _depthCache = new Map();
let _gradient = null;

// Get depth factor (0 = surface, 1 = bottom)
function getDepthFactor(y, worldHeight) {
    const rounded = Math.floor(y / 50) * 50; // Cache every 50 pixels
    if (!_depthCache.has(rounded)) {
        _depthCache.set(rounded, Math.max(0, Math.min(1, rounded / worldHeight)));
    }
    return _depthCache.get(rounded);
}

// Calculate opacity based on depth
function getDepthOpacity(y, baseOpacity = 1, worldHeight, constants) {
    const depthFactor = getDepthFactor(y, worldHeight);
    const fadeStart = constants.DEPTH_FADE_START;  // 0.0 (0% - surface)
    const fadeEnd = constants.DEPTH_FADE_END;      // 0.7 (70%)
    
    // Surface layer (0%): Full brightness (fade starts immediately)
    if (depthFactor <= fadeStart) return baseOpacity;
    
    // Bottom 10% (90-100%): Extra dark zone
    if (depthFactor > 0.9) {
        const bottomProgress = (depthFactor - 0.9) / 0.1; // 0 to 1 within bottom 10%
        const bottomOpacity = constants.ABYSSAL_OPACITY * (1 - bottomProgress * 0.5); // Even darker
        return baseOpacity * Math.max(bottomOpacity, constants.ABYSSAL_OPACITY * 0.5);
    }
    
    // Abyssal zone (70-90%): Extremely dark
    if (depthFactor > fadeEnd) {
        const abyssalProgress = (depthFactor - fadeEnd) / (0.9 - fadeEnd);
        const abyssalOpacity = constants.MIN_DEPTH_OPACITY * (1 - abyssalProgress * 0.9);
        return baseOpacity * Math.max(abyssalOpacity, constants.ABYSSAL_OPACITY);
    }
    
    // Mid-water and deep zones (0-70%): Aggressive fade
    const fadeProgress = (depthFactor - fadeStart) / (fadeEnd - fadeStart);
    // More aggressive fade curve (squared for steeper transition)
    const aggressiveProgress = fadeProgress * fadeProgress;
    return baseOpacity * (1 - aggressiveProgress * (1 - constants.MIN_DEPTH_OPACITY));
}

// Calculate blue tint based on depth
function getDepthTint(y, worldHeight, constants) {
    const depthFactor = getDepthFactor(y, worldHeight);
    
    // Surface layer (0%): No tint (fade starts immediately)
    if (depthFactor <= constants.DEPTH_FADE_START) return 0;
    
    // Bottom 10% (90-100%): Maximum blue tint with extra darkness
    if (depthFactor > 0.9) {
        const bottomProgress = (depthFactor - 0.9) / 0.1;
        return constants.DEPTH_BLUE_INTENSITY + 0.3 + (bottomProgress * 0.2); // Extra blue in deepest zone
    }
    
    // Abyssal zone (70-90%): Maximum blue tint with extra darkness
    if (depthFactor > constants.DEPTH_FADE_END) {
        const abyssalProgress = (depthFactor - constants.DEPTH_FADE_END) / (0.9 - constants.DEPTH_FADE_END);
        return constants.DEPTH_BLUE_INTENSITY + (abyssalProgress * 0.3); // Extra blue in abyss
    }
    
    // Mid-water and deep zones (0-70%): Progressive blue tint
    const tintProgress = (depthFactor - constants.DEPTH_FADE_START) / (constants.DEPTH_FADE_END - constants.DEPTH_FADE_START);
    return tintProgress * constants.DEPTH_BLUE_INTENSITY;
}

// Create depth gradient for background
function createDepthGradient(ctx, worldHeight) {
    if (!_gradient) {
        _gradient = ctx.createLinearGradient(0, 0, 0, worldHeight);
        // Surface layer (0%): Bright blue (fade starts immediately)
        _gradient.addColorStop(0, '#87CEEB');      // Sky blue
        _gradient.addColorStop(0.1, '#1e90ff');    // Dodger blue
        // Mid-water (10-50%): Transition to deeper blue
        _gradient.addColorStop(0.3, '#1873cc');    // Medium blue
        _gradient.addColorStop(0.5, '#145299');    // Deep blue
        // Deep zone (50-70%): Dark blue
        _gradient.addColorStop(0.7, '#0f3d73');    // Very deep blue
        // Abyssal zone (70-90%): Near black
        _gradient.addColorStop(0.9, '#0a2a4d');    // Abyssal blue
        // Bottom 10% (90-100%): Extra dark
        _gradient.addColorStop(0.95, '#030d1a');    // Very dark
        _gradient.addColorStop(1, '#000000');      // Pure black
    }
    return _gradient;
}

// Reset gradient cache (for canvas resize)
function resetDepthGradient() {
    _gradient = null;
}

// Check if entity is in render distance from camera
function inRenderDistance(entity, camera, renderDistance) {
    const dx = entity.x - (camera.x + camera.viewWidth / 2);
    const dy = entity.y - (camera.y + camera.viewHeight / 2);
    return (dx * dx + dy * dy) < (renderDistance * renderDistance);
}

// Make functions available globally
window.getDepthFactor = getDepthFactor;
window.getDepthOpacity = getDepthOpacity;
window.getDepthTint = getDepthTint;
window.createDepthGradient = createDepthGradient;
window.resetDepthGradient = resetDepthGradient;
window.inRenderDistance = inRenderDistance; 