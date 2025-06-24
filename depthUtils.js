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
    const fadeStart = constants.DEPTH_FADE_START;  // 0.2 (20%)
    const fadeEnd = constants.DEPTH_FADE_END;      // 0.8 (80%)
    
    // Surface layer (0-20%): Full brightness
    if (depthFactor < fadeStart) return baseOpacity;
    
    // Abyssal zone (80-100%): Extremely dark
    if (depthFactor > fadeEnd) {
        const abyssalProgress = (depthFactor - fadeEnd) / (1 - fadeEnd);
        const abyssalOpacity = constants.MIN_DEPTH_OPACITY * (1 - abyssalProgress * 0.9);
        return baseOpacity * Math.max(abyssalOpacity, constants.ABYSSAL_OPACITY);
    }
    
    // Mid-water and deep zones (20-80%): Gradual fade
    const fadeProgress = (depthFactor - fadeStart) / (fadeEnd - fadeStart);
    return baseOpacity * (1 - fadeProgress * (1 - constants.MIN_DEPTH_OPACITY));
}

// Calculate blue tint based on depth
function getDepthTint(y, worldHeight, constants) {
    const depthFactor = getDepthFactor(y, worldHeight);
    
    // Surface layer (0-20%): No tint
    if (depthFactor <= constants.DEPTH_FADE_START) return 0;
    
    // Abyssal zone (80-100%): Maximum blue tint with extra darkness
    if (depthFactor > constants.DEPTH_FADE_END) {
        const abyssalProgress = (depthFactor - constants.DEPTH_FADE_END) / (1 - constants.DEPTH_FADE_END);
        return constants.DEPTH_BLUE_INTENSITY + (abyssalProgress * 0.3); // Extra blue in abyss
    }
    
    // Mid-water and deep zones (20-80%): Progressive blue tint
    const tintProgress = (depthFactor - constants.DEPTH_FADE_START) / (constants.DEPTH_FADE_END - constants.DEPTH_FADE_START);
    return tintProgress * constants.DEPTH_BLUE_INTENSITY;
}

// Create depth gradient for background
function createDepthGradient(ctx, worldHeight) {
    if (!_gradient) {
        _gradient = ctx.createLinearGradient(0, 0, 0, worldHeight);
        // Surface layer (0-20%): Bright blue
        _gradient.addColorStop(0, '#87CEEB');      // Sky blue
        _gradient.addColorStop(0.2, '#1e90ff');    // Dodger blue
        // Mid-water (20-60%): Transition to deeper blue
        _gradient.addColorStop(0.4, '#1873cc');    // Medium blue
        _gradient.addColorStop(0.6, '#145299');    // Deep blue
        // Deep zone (60-80%): Dark blue
        _gradient.addColorStop(0.8, '#0f3d73');    // Very deep blue
        // Abyssal zone (80-100%): Near black
        _gradient.addColorStop(0.9, '#0a2a4d');    // Abyssal blue
        _gradient.addColorStop(1, '#051220');      // Almost black
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