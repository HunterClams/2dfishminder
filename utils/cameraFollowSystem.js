// Camera Follow System - Modular system for following entities
// Allows left-click to follow creatures and right-click to stop following

class CameraFollowSystem {
    constructor() {
        // Configuration
        this.config = {
            // Follow settings
            FOLLOW_SPEED: 0.1, // Smoothing factor for camera movement
            FOLLOW_OFFSET: { x: 0, y: 0 }, // Offset from entity center
            FOLLOW_DISTANCE_THRESHOLD: 5, // Distance threshold to consider "following"
            
            // Click detection
            CLICK_DETECTION_RADIUS: 50, // Radius to detect entity clicks
            CLICK_DETECTION_RADIUS_SQUARED: 2500, // Squared for performance
            
            // Debug settings
            DEBUG_DRAW_CLICK_RADIUS: false,
            DEBUG_DRAW_FOLLOW_TARGET: false
        };
        
        // State
        this.isFollowing = false;
        this.followTarget = null;
        this.followTargetId = null;
        this.lastFollowUpdate = 0;
        
        // Event handlers
        this.boundHandleLeftClick = this.handleLeftClick.bind(this);
        this.boundHandleRightClick = this.handleRightClick.bind(this);
        
        // Performance tracking
        this.performanceStats = {
            clickChecks: 0,
            followUpdates: 0,
            entitiesChecked: 0
        };
        
        console.log('📷 Camera Follow System initialized');
    }
    
    /**
     * Initialize the camera follow system
     * @param {HTMLCanvasElement} canvas - The game canvas
     * @param {Object} camera - The camera object
     * @param {Object} gameState - The game state object
     */
    initialize(canvas, camera, gameState) {
        this.canvas = canvas;
        this.camera = camera;
        this.gameState = gameState;
        
        // Add event listeners
        this.addEventListeners();
        
        console.log('📷 Camera Follow System initialized with canvas and camera');
    }
    
    /**
     * Add event listeners for mouse clicks
     */
    addEventListeners() {
        if (!this.canvas) {
            console.warn('📷 Canvas not available for camera follow system');
            return;
        }
        
        // Remove existing listeners to prevent duplicates
        this.removeEventListeners();
        
        // Add new listeners
        this.canvas.addEventListener('click', this.boundHandleLeftClick);
        this.canvas.addEventListener('contextmenu', this.boundHandleRightClick);
        
        console.log('📷 Camera follow event listeners added');
    }
    
    /**
     * Remove event listeners
     */
    removeEventListeners() {
        if (!this.canvas) return;
        
        this.canvas.removeEventListener('click', this.boundHandleLeftClick);
        this.canvas.removeEventListener('contextmenu', this.boundHandleRightClick);
    }
    
    /**
     * Handle left click to start following an entity
     * @param {MouseEvent} event - The click event
     */
    handleLeftClick(event) {
        // Don't follow if spawn mode is active
        if (this.gameState.spawnMode !== 'off') {
            return;
        }
        
        // Prevent default behavior
        event.preventDefault();
        
        // Get click position in world coordinates
        const clickPos = this.getClickWorldPosition(event);
        
        // Find entity at click position
        const targetEntity = this.findEntityAtPosition(clickPos);
        
        if (targetEntity) {
            this.startFollowing(targetEntity);
        }
    }
    
    /**
     * Handle right click to stop following
     * @param {MouseEvent} event - The right click event
     */
    handleRightClick(event) {
        // Prevent default context menu
        event.preventDefault();
        
        this.stopFollowing();
    }
    
    /**
     * Get world position from click event
     * @param {MouseEvent} event - The click event
     * @returns {Object} World position {x, y}
     */
    getClickWorldPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        
        // Use existing screenToWorld function
        if (window.screenToWorld) {
            return window.screenToWorld(screenX, screenY, this.camera);
        }
        
        // Fallback calculation
        return {
            x: (screenX / this.camera.zoom) + this.camera.x,
            y: (screenY / this.camera.zoom) + this.camera.y
        };
    }
    
    /**
     * Find entity at the given world position
     * @param {Object} worldPos - World position {x, y}
     * @returns {Object|null} Entity at position or null
     */
    findEntityAtPosition(worldPos) {
        const gameEntities = window.gameEntities;
        if (!gameEntities) {
            console.warn('📷 GameEntities not available for entity detection');
            return null;
        }
        
        this.performanceStats.clickChecks++;
        this.performanceStats.entitiesChecked = 0;
        
        // Check all entity arrays
        const entityArrays = [
            { array: gameEntities.fish, name: 'fish' },
            { array: gameEntities.predators, name: 'predators' },
            { array: gameEntities.krill, name: 'krill' },
            { array: gameEntities.paleKrill, name: 'paleKrill' },
            { array: gameEntities.momKrill, name: 'momKrill' },
            { array: gameEntities.truefry, name: 'truefry' },
            { array: gameEntities.squid, name: 'squid' }
        ];
        
        for (const { array, name } of entityArrays) {
            if (!array || !Array.isArray(array)) continue;
            
            for (const entity of array) {
                this.performanceStats.entitiesChecked++;
                
                if (!entity || typeof entity.x !== 'number' || typeof entity.y !== 'number') {
                    continue;
                }
                
                // Calculate distance to entity
                const dx = worldPos.x - entity.x;
                const dy = worldPos.y - entity.y;
                const distanceSquared = dx * dx + dy * dy;
                
                // Check if within click detection radius
                if (distanceSquared <= this.config.CLICK_DETECTION_RADIUS_SQUARED) {
                    console.log(`📷 Found ${name} entity at distance ${Math.sqrt(distanceSquared).toFixed(1)}px`);
                    return entity;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Start following an entity
     * @param {Object} entity - The entity to follow
     */
    startFollowing(entity) {
        if (!entity) return;
        
        this.followTarget = entity;
        this.followTargetId = this.generateEntityId(entity);
        this.isFollowing = true;
        
        console.log(`📷 Started following ${entity.fishType || entity.constructor.name} at (${entity.x.toFixed(0)}, ${entity.y.toFixed(0)})`);
    }
    
    /**
     * Stop following current entity
     */
    stopFollowing() {
        if (!this.isFollowing) return;
        
        const targetName = this.followTarget?.fishType || this.followTarget?.constructor.name || 'unknown';
        console.log(`📷 Stopped following ${targetName}`);
        
        this.followTarget = null;
        this.followTargetId = null;
        this.isFollowing = false;
    }
    
    /**
     * Generate a unique ID for an entity
     * @param {Object} entity - The entity
     * @returns {string} Unique entity ID
     */
    generateEntityId(entity) {
        return `${entity.constructor.name}_${entity.x}_${entity.y}_${Date.now()}`;
    }
    
    /**
     * Update camera position to follow target
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime = 16) {
        if (!this.isFollowing || !this.followTarget) {
            return;
        }
        
        // Check if target still exists
        if (!this.isTargetValid()) {
            console.log('📷 Follow target no longer valid, stopping follow');
            this.stopFollowing();
            return;
        }
        
        this.performanceStats.followUpdates++;
        
        // Calculate target camera position (center on entity)
        const targetX = this.followTarget.x - (this.camera.viewWidth / 2) + this.config.FOLLOW_OFFSET.x;
        const targetY = this.followTarget.y - (this.camera.viewHeight / 2) + this.config.FOLLOW_OFFSET.y;
        
        // Smooth camera movement
        const smoothingFactor = this.config.FOLLOW_SPEED;
        this.camera.x += (targetX - this.camera.x) * smoothingFactor;
        this.camera.y += (targetY - this.camera.y) * smoothingFactor;
        
        // Update camera view dimensions
        if (this.camera.viewWidth && this.camera.viewHeight) {
            this.camera.viewWidth = this.canvas.width / this.camera.zoom;
            this.camera.viewHeight = this.canvas.height / this.camera.zoom;
        }
        
        // Clamp camera to world bounds (use existing logic)
        this.clampCameraToWorldBounds();
    }
    
    /**
     * Check if the follow target is still valid
     * @returns {boolean} True if target is valid
     */
    isTargetValid() {
        if (!this.followTarget) return false;
        
        // Check if entity still exists in game entities
        const gameEntities = window.gameEntities;
        if (!gameEntities) return false;
        
        // Check all entity arrays for the target
        const entityArrays = [
            gameEntities.fish,
            gameEntities.predators,
            gameEntities.krill,
            gameEntities.paleKrill,
            gameEntities.momKrill,
            gameEntities.truefry,
            gameEntities.squid
        ];
        
        for (const array of entityArrays) {
            if (array && array.includes(this.followTarget)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Clamp camera to world bounds
     */
    clampCameraToWorldBounds() {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const CONSTANTS = window.CONSTANTS || {};
        const margin = CONSTANTS.CAMERA_MARGIN || 50;
        
        this.camera.x = Math.max(margin, Math.min(this.camera.x, WORLD_WIDTH - this.camera.viewWidth - margin));
        this.camera.y = Math.max(margin, Math.min(this.camera.y, WORLD_HEIGHT - this.camera.viewHeight - margin));
    }
    
    /**
     * Draw debug information
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawDebug(ctx) {
        if (!ctx || !this.gameState?.performanceDebug) return;
        
        ctx.save();
        
        // Draw click detection radius around mouse
        if (this.config.DEBUG_DRAW_CLICK_RADIUS && window.mouseWorldPos) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            const screenPos = window.worldToScreen ? 
                window.worldToScreen(window.mouseWorldPos.x, window.mouseWorldPos.y, this.camera) :
                { x: window.mouseWorldPos.x, y: window.mouseWorldPos.y };
            
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, this.config.CLICK_DETECTION_RADIUS * this.camera.zoom, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw follow target indicator
        if (this.config.DEBUG_DRAW_FOLLOW_TARGET && this.isFollowing && this.followTarget) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            
            const screenPos = window.worldToScreen ? 
                window.worldToScreen(this.followTarget.x, this.followTarget.y, this.camera) :
                { x: this.followTarget.x, y: this.followTarget.y };
            
            const size = (this.followTarget.size || 50) * this.camera.zoom;
            
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw follow indicator text
            ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('FOLLOWING', screenPos.x, screenPos.y - size - 10);
        }
        
        ctx.restore();
    }
    
    /**
     * Get system statistics
     * @returns {Object} Performance statistics
     */
    getStats() {
        return {
            isFollowing: this.isFollowing,
            followTarget: this.followTarget ? (this.followTarget.fishType || this.followTarget.constructor.name) : null,
            clickChecks: this.performanceStats.clickChecks,
            followUpdates: this.performanceStats.followUpdates,
            entitiesChecked: this.performanceStats.entitiesChecked
        };
    }
    
    /**
     * Reset performance statistics
     */
    resetStats() {
        this.performanceStats.clickChecks = 0;
        this.performanceStats.followUpdates = 0;
        this.performanceStats.entitiesChecked = 0;
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        this.removeEventListeners();
        this.stopFollowing();
        console.log('📷 Camera Follow System cleaned up');
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.CameraFollowSystem = CameraFollowSystem;
} 