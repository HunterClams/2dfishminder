// Modular Underwater Ecosystem Game - Main Controller
// This file orchestrates all the modular components

// Global game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Use global constants from gameConfig.js
const WORLD_WIDTH = window.WORLD_WIDTH;
const WORLD_HEIGHT = window.WORLD_HEIGHT;
const CONSTANTS = window.CONSTANTS;
const FISH_TYPES = window.FISH_TYPES;

// Sprite management
const sprites = {};
const spriteFiles = {
    bubble1: 'bubble1.png', bubble2: 'bubble2.png', smallFry2: 'smallFry2.png',
    smallFry3: 'smallFry3.png', smallFry4: 'smallFry4.png', tuna: 'tuna.png', tuna2: 'tuna2.png',
    fishFood: 'fishFood.png', poop: 'poop.png', poop2: 'poop2.png', poop3: 'poop3.png',
    krill1: 'krill1.png', krill2: 'krill2.png', krill3: 'krill3.png', krillSpawnIcon: 'krillSpawnIcon.png',
    giantSquid1: 'giant squid fram1.png', giantSquid2: 'giant squid fram2.png',
    abyssalSquid1: 'abbysal squid fram1.png', abyssalSquid2: 'abbysal squid fram2.png',
    abyssalSquid1Blink: 'abbysal squid fram1 (1).png', abyssalSquid2Blink: 'abbysal squid fram2 (1).png'
};

let spritesLoaded = 0;

// Load all sprites
Object.entries(spriteFiles).forEach(([key, filename]) => {
    sprites[key] = new Image();
    sprites[key].onload = () => {
        spritesLoaded++;
        console.log(`Loaded sprite: ${key} (${spritesLoaded}/${Object.keys(spriteFiles).length})`);
    };
    sprites[key].onerror = () => console.warn(`Failed to load sprite: ${filename}`);
    sprites[key].src = `images/${filename}`;
});

// Utility functions aggregator - Fixed circular dependency
const Utils = {
    // Math functions from mathUtils.js
    distanceSquared: window.distanceSquared,
    distance: window.distance,
    calculateSteering: window.calculateSteering,
    limitVelocity: window.limitVelocity,
    handleEdges: (entity, margin, damping) => window.handleEdges(entity, margin, damping, WORLD_WIDTH, WORLD_HEIGHT),
    
    // Behavioral functions from behaviorUtils.js
    shouldIgnorePrey: (predatorType, preyType) => window.shouldIgnorePrey(predatorType, preyType, FISH_TYPES),
    shouldFlee: (fishType, predatorType) => window.shouldFlee(fishType, predatorType, FISH_TYPES),
    getRandomBubbleSprite: () => window.getRandomBubbleSprite(sprites),
    
    // Depth functions from depthUtils.js
    getDepthFactor: (y) => window.getDepthFactor(y, WORLD_HEIGHT),
    getDepthOpacity: (y, baseOpacity = 1) => window.getDepthOpacity(y, baseOpacity, WORLD_HEIGHT, CONSTANTS),
    getDepthTint: (y) => window.getDepthTint(y, WORLD_HEIGHT, CONSTANTS),
    createDepthGradient: () => window.createDepthGradient(ctx, WORLD_HEIGHT),
    // Fixed: Use a function that gets camera dynamically to avoid circular dependency
    inRenderDistance: (entity) => {
        if (!gameSystem) return true; // During initialization, render everything
        return window.inRenderDistance(entity, gameSystem.getCamera(), CONSTANTS.RENDER_DISTANCE);
    }
};

// Game systems
let gameSystem;
let objectPools;

// Canvas management
function resizeCanvas() {
    canvas.width = window.innerWidth - 10;
    canvas.height = window.innerHeight - 10;
    
    if (gameSystem) {
        const camera = gameSystem.getCamera();
        camera.viewWidth = canvas.width / camera.zoom;
        camera.viewHeight = canvas.height / camera.zoom;
    }
    
    window.resetDepthGradient(); // Reset gradient cache
}

// Input system setup
function setupInputSystem() {
    const gameState = gameSystem.getGameState();
    const keys = gameSystem.getKeys();
    const camera = gameSystem.getCamera();
    const mouseWorldPos = gameSystem.getMouseWorldPos();
    
    // Setup input handlers
    const inputHandler = window.createInputHandler(keys, gameState);
    inputHandler.handleWheel = (event) => window.handleCameraZoom(event, camera, canvas, CONSTANTS);
    window.setupInputListeners(inputHandler, canvas);
    
    // Setup mouse tracking
    window.setupMouseTracking(canvas, camera, mouseWorldPos);
    
    // Setup spawn mode cycling
    window.addEventListener('keydown', (event) => {
        if (event.key === 'f' || event.key === 'F') {
            const modes = ['off', 'food', 'krill', 'poop', 'fry', 'tuna', 'squid'];
            const currentIndex = modes.indexOf(gameState.spawnMode);
            const nextIndex = (currentIndex + 1) % modes.length;
            gameState.spawnMode = modes[nextIndex];
            console.log(`Spawn mode: ${gameState.spawnMode}`);
        } else if (event.key === 'h' || event.key === 'H') {
            gameState.showUI = !gameState.showUI;
            console.log(`UI visibility: ${gameState.showUI}`);
        }
    });
    
    // Setup click spawning
    canvas.addEventListener('click', (event) => {
        if (gameState.spawnMode === 'off') return;
        
        const rect = canvas.getBoundingClientRect();
        const centerX = ((event.clientX - rect.left) / camera.zoom) + camera.x;
        const centerY = ((event.clientY - rect.top) / camera.zoom) + camera.y;
        
        gameSystem.spawnItems(centerX, centerY, gameState.spawnMode);
    });
}

// Main game loop
function animate(currentTime = 0) {
    if (!gameSystem) return;
    
    const gameState = gameSystem.getGameState();
    
    // Frame rate limiting
    if (currentTime - gameState.lastFrameTime < 1000 / CONSTANTS.UPDATE_FREQUENCY) {
        requestAnimationFrame(animate);
        return;
    }
    
    gameState.lastFrameTime = currentTime;
    
    // Update all systems
    gameSystem.update();
    
    // Render everything
    gameSystem.render();
    
    requestAnimationFrame(animate);
}

// Initialize the game
function initializeGame() {
    console.log('Initializing modular underwater ecosystem game...');
    
    // Create main systems
    gameSystem = new GameSystem();
    objectPools = new ObjectPoolSystem();
    
    // Setup canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Setup input system
    setupInputSystem();
    
    // Initialize ecosystem
    gameSystem.initializeEcosystem();
    
    console.log('Game systems initialized successfully!');
}

// Start the game when all sprites are loaded
function startGame() {
    if (spritesLoaded === Object.keys(spriteFiles).length) {
        initializeGame();
        animate();
        console.log('🌊 Modular Underwater Ecosystem Game Started! 🐟');
    } else {
        console.log(`Loading sprites... ${spritesLoaded}/${Object.keys(spriteFiles).length}`);
        setTimeout(startGame, 100);
    }
}

// Start the game
startGame(); 