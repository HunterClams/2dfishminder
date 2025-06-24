// Camera utilities for viewport and zoom management
// Handles camera movement, zoom, and coordinate transformations

// Update camera position based on input
function updateCamera(camera, keys, constants, worldWidth, worldHeight) {
    const baseSpeed = constants.CAMERA_SPEED / camera.zoom;
    const moveSpeed = keys.shift ? baseSpeed * constants.CAMERA_BOOST : baseSpeed;
    
    if (keys.w) camera.y -= moveSpeed;
    if (keys.s) camera.y += moveSpeed;
    if (keys.a) camera.x -= moveSpeed;
    if (keys.d) camera.x += moveSpeed;
    
    // Update view dimensions
    camera.viewWidth = canvas.width / camera.zoom;
    camera.viewHeight = canvas.height / camera.zoom;
    
    // Clamp camera to world bounds
    const margin = constants.CAMERA_MARGIN;
    camera.x = Math.max(margin, Math.min(camera.x, worldWidth - camera.viewWidth - margin));
    camera.y = Math.max(margin, Math.min(camera.y, worldHeight - camera.viewHeight - margin));
}

// Apply camera transformation to canvas
function applyCamera(ctx) {
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
}

// Reset camera transformation
function resetCamera(ctx) {
    ctx.restore();
}

// Handle zoom with mouse wheel
function handleCameraZoom(event, camera, canvas, constants) {
    event.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const worldX = (mouseX / camera.zoom) + camera.x;
    const worldY = (mouseY / camera.zoom) + camera.y;
    
    const oldZoom = camera.zoom;
    camera.zoom = event.deltaY < 0 
        ? Math.min(camera.zoom + constants.ZOOM_FACTOR, camera.maxZoom)
        : Math.max(camera.zoom - constants.ZOOM_FACTOR, camera.minZoom);
    
    // Adjust camera position to zoom towards mouse
    camera.x = worldX - (mouseX / camera.zoom);
    camera.y = worldY - (mouseY / camera.zoom);
}

// Convert screen coordinates to world coordinates
function screenToWorld(screenX, screenY, camera) {
    return {
        x: (screenX / camera.zoom) + camera.x,
        y: (screenY / camera.zoom) + camera.y
    };
}

// Convert world coordinates to screen coordinates
function worldToScreen(worldX, worldY, camera) {
    return {
        x: (worldX - camera.x) * camera.zoom,
        y: (worldY - camera.y) * camera.zoom
    };
}

// Check if world coordinates are visible on screen
function isVisible(worldX, worldY, camera, margin = 0) {
    return worldX >= camera.x - margin && 
           worldX <= camera.x + camera.viewWidth + margin &&
           worldY >= camera.y - margin && 
           worldY <= camera.y + camera.viewHeight + margin;
}

// Make functions available globally
window.updateCamera = updateCamera;
window.applyCamera = applyCamera;
window.resetCamera = resetCamera;
window.handleCameraZoom = handleCameraZoom;
window.screenToWorld = screenToWorld;
window.worldToScreen = worldToScreen;
window.isVisible = isVisible; 