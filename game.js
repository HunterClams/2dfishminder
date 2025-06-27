// Get the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Make canvas and context globally accessible
window.canvas = canvas;
window.ctx = ctx;

// World dimensions
const WORLD_WIDTH = 12000;
const WORLD_HEIGHT = 8000;

const CONSTANTS = {
    PERCEPTION_RADIUS: 50,
    SEPARATION_RADIUS: 30,
    FEAR_RADIUS: 80,
    FOOD_ATTRACTION_RADIUS: 60,
    CAMERA_MARGIN: 50,
    CAMERA_SPEED: 5,
    CAMERA_BOOST: 2.5,
    ZOOM_FACTOR: 0.1,
    BORDER_WIDTH: 8,
    CORNER_SIZE: 30,
    DEPTH_FADE_START: 0.2,
    DEPTH_FADE_END: 0.8,
    MIN_DEPTH_OPACITY: 0.15,
    DEPTH_BLUE_INTENSITY: 0.7,
    ABYSSAL_OPACITY: 0.05,
    MAX_EATING_BUBBLES: 50,
    RENDER_DISTANCE: 1500,
    UPDATE_FREQUENCY: 60
};

const FISH_TYPES = {
    SMALL_FRY_2: 'smallFry2',
    SMALL_FRY_3: 'smallFry3', 
    SMALL_FRY_4: 'smallFry4',
    KRILL: 'krill',
    PALE_KRILL: 'paleKrill',
    TIGER_KRILL: 'tigerKrill',
    MOM_KRILL: 'momKrill'
};

// Make global constants accessible to all modules
window.WORLD_WIDTH = WORLD_WIDTH;
window.WORLD_HEIGHT = WORLD_HEIGHT;
window.CONSTANTS = CONSTANTS;
window.FISH_TYPES = FISH_TYPES;

const gameState = {
    spawnMode: 'off',
    showUI: true,
    hudState: 'full', // 'controls', 'full', or 'off'
    lastFrameTime: 0,
    frameCount: 0
    // All debug flags are now managed by DebugManager and default to false
};

// Make gameState globally accessible
window.gameState = gameState;

// Initialize DebugManager
if (window.DebugManager) {
    window.debugManager = new window.DebugManager();
    console.log('🔧 DebugManager instance created');
    
    // Connect DebugManager to ConsoleDebugSystem if available
    if (window.ConsoleDebugSystem) {
        window.ConsoleDebugSystem.setDebugManager(window.debugManager);
        console.log('🔗 DebugManager connected to ConsoleDebugSystem');
    }
    
    // Initialize DebugIntegration
    if (window.DebugIntegration) {
        window.DebugIntegration.setDebugManager(window.debugManager);
        window.DebugIntegration.initialize();
        console.log('🔗 DebugIntegration initialized');
    } else {
        console.warn('⚠️ DebugIntegration not found - debug integration disabled');
    }
} else {
    console.warn('⚠️ DebugManager not found - debug functionality disabled');
}

const camera = { x: 0, y: 0, zoom: 1, minZoom: 0.5, maxZoom: 4.0, viewWidth: 0, viewHeight: 0 };
const keys = { w: false, a: false, s: false, d: false, shift: false };

const sprites = {};
const spriteFiles = {
    bubble1: 'bubble1.png', bubble2: 'bubble2.png', smallFry2: 'smallFry2.png',
    smallFry3: 'smallFry3.png', smallFry4: 'smallFry4.png', tuna: 'tuna.png', tuna2: 'tuna2.png',
    tunaFins: 'tuna fins.png', // New overlay sprite for both tuna types
    tunaEaten: 'tuna eaten.png', tuna2Eaten: 'tuna2 eaten.png', // Tuna eaten overlay sprites
    fishFood: 'fishFood.png', fishEgg: 'fishEgg.png', fishSperm: 'fishsperm.png', fertilizedEgg: 'fertilizedegg.png', poop: 'poop.png', poop2: 'poop2.png', poop3: 'poop3.png',
    krill1: 'krill1.png', krill2: 'krill2.png', krill3: 'krill3.png', krillSpawnIcon: 'krillSpawnIcon.png',
    // Pale krill variant - lighter, more translucent
    paleKrill1: 'pale krill1.png', paleKrill2: 'pale krill2.png', paleKrill3: 'pale krill3.png',
    // Tiger krill variant - striped, more aggressive
    tigerKrill1: 'tiger krill1.png', tigerKrill2: 'tiger krill2.png', tigerKrill3: 'tiger krill3.png',
    // Mom krill variant - larger, nurturing
    momKrill1: 'krill mom1.png', momKrill2: 'krill mom2.png', momKrill3: 'krill mom3.png',
    // TrueFry - enhanced fry with stronger schooling
    truefry1: 'truefry1.png',
    truefry2: 'truefry2.png',
    giantSquid1: 'giant squid fram1.png', giantSquid2: 'giant squid fram2.png',
    abyssalSquid1: 'abbysal squid fram1.png', abyssalSquid2: 'abbysal squid fram2.png',
    abyssalSquid1Blink: 'abbysal squid fram1 (1).png', abyssalSquid2Blink: 'abbysal squid fram2 (1).png'
};

let spritesLoaded = 0;

Object.entries(spriteFiles).forEach(([key, filename]) => {
    sprites[key] = new Image();
    sprites[key].onload = () => {
        spritesLoaded++;
        if (key.includes('krill')) {
            console.log(`✅ Loaded krill sprite: ${key} -> ${filename}`);
        }
    };
    sprites[key].onerror = () => {
        console.warn(`❌ Failed to load sprite: ${filename}`);
        if (key.includes('krill')) {
            console.error(`🚨 KRILL SPRITE FAILED: ${key} -> ${filename}`);
        }
    };
    sprites[key].src = `images/${filename}`;
    
    // Log krill sprite loading attempts
    if (key.includes('krill')) {
        console.log(`🔄 Attempting to load krill sprite: ${key} -> images/${filename}`);
    }
});

// Make sprites globally accessible
window.sprites = sprites;

// Object pools for performance
const ObjectPools = {
    eatingBubbles: [],
    
    getEatingBubble(x, y) {
        let bubble = this.eatingBubbles.find(b => b.isDead());
        if (!bubble) {
            bubble = new EatingBubble(x, y);
            this.eatingBubbles.push(bubble);
        } else {
            bubble.reset(x, y);
        }
        return bubble;
    },
    
    cleanup() {
        // Keep pool size manageable
        if (this.eatingBubbles.length > CONSTANTS.MAX_EATING_BUBBLES) {
            this.eatingBubbles = this.eatingBubbles.filter(b => !b.isDead()).slice(0, CONSTANTS.MAX_EATING_BUBBLES);
        }
    }
};

// Make ObjectPools globally accessible
window.ObjectPools = ObjectPools;

// Optimized utility functions
const Utils = {
    // Math functions now loaded from mathUtils.js
    distanceSquared: window.distanceSquared,
    distance: window.distance,
    calculateSteering: window.calculateSteering,
    limitVelocity: window.limitVelocity,
    handleEdges: (entity, margin, damping) => window.handleEdges(entity, margin, damping, WORLD_WIDTH, WORLD_HEIGHT),
    
    // Behavioral functions now loaded from behaviorUtils.js
    shouldIgnorePrey: (predatorType, preyType) => window.shouldIgnorePrey(predatorType, preyType, FISH_TYPES),
    shouldFlee: (fishType, predatorType) => window.shouldFlee(fishType, predatorType, FISH_TYPES),
    
    // Depth functions now loaded from depthUtils.js
    getDepthFactor: (y) => window.getDepthFactor(y, WORLD_HEIGHT),
    getDepthOpacity: (y, baseOpacity = 1) => window.getDepthOpacity(y, baseOpacity, WORLD_HEIGHT, CONSTANTS),
    getDepthTint: (y) => window.getDepthTint(y, WORLD_HEIGHT, CONSTANTS),
    createDepthGradient: () => window.createDepthGradient(ctx, WORLD_HEIGHT),
    inRenderDistance: (entity) => window.inRenderDistance(entity, camera, CONSTANTS.RENDER_DISTANCE),
    
    // Random bubble sprite now from behaviorUtils.js
    getRandomBubbleSprite: () => window.getRandomBubbleSprite(sprites)
};

// Make Utils globally accessible
window.Utils = Utils;

// Canvas management
function resizeCanvas() {
    canvas.width = window.innerWidth - 10;
    canvas.height = window.innerHeight - 10;
    camera.viewWidth = canvas.width / camera.zoom;
    camera.viewHeight = canvas.height / camera.zoom;
    window.resetDepthGradient(); // Reset gradient cache
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Camera functions now loaded from cameraUtils.js

// Optimized border drawing
function drawBorders() {
    ctx.strokeStyle = 'rgba(0, 50, 100, 0.8)';
    ctx.lineWidth = CONSTANTS.BORDER_WIDTH;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    ctx.fillStyle = 'rgba(0, 30, 60, 0.6)';
    const size = CONSTANTS.CORNER_SIZE;
    
    // Draw corners efficiently
    ctx.fillRect(0, 0, size, size);
    ctx.fillRect(WORLD_WIDTH - size, 0, size, size);
    ctx.fillRect(0, WORLD_HEIGHT - size, size, size);
    ctx.fillRect(WORLD_WIDTH - size, WORLD_HEIGHT - size, size, size);
}

// Input handling now loaded from inputUtils.js
const inputHandler = window.createInputHandler(keys, gameState);
// Add wheel handler with proper parameters
inputHandler.handleWheel = (event) => window.handleCameraZoom(event, camera, canvas, CONSTANTS);
window.setupInputListeners(inputHandler, canvas);

// Mouse tracking using input utils
let mouseWorldPos = { x: 0, y: 0 };
window.setupMouseTracking(canvas, camera, mouseWorldPos);

// Initialize ecosystem when sprites are loaded
let ecosystemInitialized = false;

// Create game entities using the new modular system
let gameEntities;
            
// Initialize the game entities system
function initializeGameEntities() {
    if (window.GameEntities) {
        gameEntities = new window.GameEntities();
        gameEntities.initializeEcosystem();
        window.gameEntities = gameEntities; // Make globally accessible for compatibility
        console.log('GameEntities system initialized successfully');
            } else {
        console.error('GameEntities module not found!');
    }
}

// Optimized spawning system using GameEntities
canvas.addEventListener('click', (event) => {
    if (gameState.spawnMode === 'off' || !gameEntities) return;
    
    const rect = canvas.getBoundingClientRect();
    const centerX = ((event.clientX - rect.left) / camera.zoom) + camera.x;
    const centerY = ((event.clientY - rect.top) / camera.zoom) + camera.y;
    
    // Use the GameEntities spawn system
    gameEntities.spawnEntity(gameState.spawnMode, centerX, centerY);
});

// Highly optimized animation loop with frame limiting
function animate(currentTime = 0) {
    // Frame rate limiting
    if (currentTime - gameState.lastFrameTime < 1000 / CONSTANTS.UPDATE_FREQUENCY) {
        requestAnimationFrame(animate);
        return;
    }
    
    gameState.lastFrameTime = currentTime;
    gameState.frameCount++;
    
    // Reset console debug system frame counters
    if (window.ConsoleDebugSystem) {
        window.ConsoleDebugSystem.resetFrameCounters();
    }
    
    window.updateCamera(camera, keys, CONSTANTS, WORLD_WIDTH, WORLD_HEIGHT);
    window.applyCamera(ctx);
    
    // Draw background
    ctx.fillStyle = Utils.createDepthGradient();
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    drawBorders();
    
    // Update and draw using GameEntities system
    if (gameEntities) {
        gameEntities.update();
        gameEntities.draw();
    }
    
    // Update eating bubbles from object pools
    const { eatingBubbles } = ObjectPools;
    for (let i = 0; i < eatingBubbles.length; i++) {
        eatingBubbles[i].update();
        eatingBubbles[i].draw();
    }
    
    // Clean up pools more frequently to prevent lag
    if (gameState.frameCount % 180 === 0) { // Every 3 seconds instead of 5
        ObjectPools.cleanup();
    }
    
    // Draw spawn indicator
    if (gameState.spawnMode !== 'off' && Utils.inRenderDistance(mouseWorldPos)) {
        if (window.uiRenderingSystem) {
            window.uiRenderingSystem.drawSpawnIndicator(ctx, mouseWorldPos, gameState.spawnMode, sprites);
        }
    }
    
    window.resetCamera(ctx);
    
    // Draw entity counter UI (replaces old ecosystem info)
    if (gameEntities && gameEntities.entityCounter) {
        gameEntities.entityCounter.drawUI(ctx, sprites, gameState);
    }
    
    // Draw controls and spawn UI when hudState is 'controls' or 'full'
    if (!gameState.hudState) gameState.hudState = 'controls'; // Initialize if not set
    if (gameState.hudState === 'controls' || gameState.hudState === 'full') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '16px Arial';
        ctx.fillText(`Zoom: ${camera.zoom.toFixed(1)}x`, 10, 25);
        ctx.fillText('WASD: Move | Wheel: Zoom | F: Spawn Mode | H: Hide UI | T: Cycle Behaviour State (Tuna→Squid→Fry→Krill→Off)', 10, 45);
        
        // Use modular UI rendering system
        if (window.uiRenderingSystem) {
            window.uiRenderingSystem.drawUIModeIndicators(ctx, gameState.spawnMode, sprites);
        }
    }
    
    requestAnimationFrame(animate);
}

function startAnimation() {
    const totalSprites = Object.keys(spriteFiles).length;
    console.log(`🔄 Sprite loading check: ${spritesLoaded}/${totalSprites} sprites loaded`);
    
    if (spritesLoaded === totalSprites) {
        console.log(`✅ All sprites loaded successfully! Starting animation...`);
        // Initialize the game entities system
        if (!ecosystemInitialized) {
            initializeGameEntities();
            ecosystemInitialized = true;
        }
        animate();
    } else {
        // Log which sprites are missing
        const loadedKeys = Object.keys(sprites).filter(key => sprites[key].complete);
        const missingKeys = Object.keys(spriteFiles).filter(key => !sprites[key] || !sprites[key].complete);
        if (missingKeys.length > 0) {
            console.log(`⏳ Waiting for sprites: ${missingKeys.join(', ')}`);
        }
        setTimeout(startAnimation, 100);
    }
}

startAnimation();