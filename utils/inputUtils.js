// Input utilities for keyboard and mouse handling
// Manages game controls and spawn mode cycling

// Spawn mode order for cycling (excluding 'off' for wheel cycling)
const SPAWN_MODE_ORDER = ['off', 'food', 'poop', 'truefry1', 'truefry2', 'fishEggs', 'sperm', 'fertilizedEggs', 'krill', 'fry', 'tuna', 'squid'];
const SPAWN_MODE_CYCLE = ['food', 'poop', 'truefry1', 'truefry2', 'fishEggs', 'sperm', 'fertilizedEggs', 'krill', 'fry', 'tuna', 'squid'];

// Cycle spawn mode forward or backward (wraps around, skipping 'off')
function cycleSpawnMode(gameState, direction) {
    // If currently 'off', start at 'food' when cycling forward
    if (gameState.spawnMode === 'off') {
        gameState.spawnMode = 'food';
        if (window.cameraFollowSystem) {
            window.cameraFollowSystem.stopFollowing();
        }
        return;
    }
    
    const currentIndex = SPAWN_MODE_CYCLE.indexOf(gameState.spawnMode);
    if (currentIndex === -1) {
        // If current mode not found in cycle, default to 'food'
        gameState.spawnMode = 'food';
        if (window.cameraFollowSystem) {
            window.cameraFollowSystem.stopFollowing();
        }
        return;
    }
    
    let newIndex;
    if (direction === 'forward') {
        // Scroll up: move forward in the cycle (wraps to food from squid)
        newIndex = (currentIndex + 1) % SPAWN_MODE_CYCLE.length;
    } else {
        // Scroll down: move backward in the cycle (wraps to squid from food)
        newIndex = (currentIndex - 1 + SPAWN_MODE_CYCLE.length) % SPAWN_MODE_CYCLE.length;
    }
    
    gameState.spawnMode = SPAWN_MODE_CYCLE[newIndex];
    
    // Stop camera following when spawn mode is activated
    if (window.cameraFollowSystem) {
        window.cameraFollowSystem.stopFollowing();
    }
}

// Create input handler object
function createInputHandler(keys, gameState) {
    return {
        handleKeyDown(event) {
            const key = event.key.toLowerCase();
            if (event.key === 'Escape') {
                // Toggle pause menu
                gameState.paused = !gameState.paused;
                const pauseMenu = document.getElementById('pauseMenu');
                if (pauseMenu) {
                    pauseMenu.style.display = gameState.paused ? 'flex' : 'none';
                }
                event.preventDefault();
            } else if (key === 'h') {
                // Toggle entity counter display (minimal UI only, controls are in pause menu)
                if (!gameState.hudState) gameState.hudState = 'off'; // Initialize if not set
                
                if (gameState.hudState === 'off') {
                    gameState.hudState = 'full'; // Show entity counter
                } else {
                    gameState.hudState = 'off'; // Hide entity counter
                }
                
                // Update legacy showUI for compatibility
                gameState.showUI = gameState.hudState !== 'off';
                
                console.log(`🎮 HUD State: ${gameState.hudState}`);
                event.preventDefault();
            } else if (key === 'f') {
                // Toggle spawn mode on/off
                if (gameState.spawnMode === 'off') {
                    // Activate spawn mode (start at 'food')
                    gameState.spawnMode = 'food';
                    // Stop camera following when spawn mode is activated
                    if (window.cameraFollowSystem) {
                        window.cameraFollowSystem.stopFollowing();
                    }
                } else {
                    // Deactivate spawn mode
                    gameState.spawnMode = 'off';
                }
                event.preventDefault();
            } else if (event.key === 'ArrowRight' && gameState.spawnMode !== 'off') {
                // Right arrow: cycle spawn mode forward (same as scroll up)
                event.preventDefault();
                cycleSpawnMode(gameState, 'forward');
            } else if (event.key === 'ArrowLeft' && gameState.spawnMode !== 'off') {
                // Left arrow: cycle spawn mode backward (same as scroll down)
                event.preventDefault();
                cycleSpawnMode(gameState, 'backward');
            } else if (key === 'r' && event.ctrlKey) {
                // Reset player spawn statistics (Ctrl+R)
                if (window.entityCounter) {
                    window.entityCounter.resetPlayerStats();
                }
                event.preventDefault();
            } else if (key === 'a' && event.ctrlKey) {
                // Trigger analytics manually (Ctrl+A) - useful for testing
                if (window.entityCounter) {
                    window.entityCounter.triggerAnalytics();
                }
                event.preventDefault();
            } else if (key === 't' || key === 'T') {
                // DebugManager handles cycling debug overlays
                event.preventDefault();
            } else if (key === 'F3') {
                // DebugManager handles toggling all debug overlays
                event.preventDefault();
            } else if (key in keys) {
                keys[key] = true;
                event.preventDefault();
            } else if (key === 'shift') {
                keys.shift = true;
                event.preventDefault();
            }
        },
        
        handleKeyUp(event) {
            const key = event.key.toLowerCase();
            if (key in keys) {
                keys[key] = false;
                event.preventDefault();
            } else if (key === 'shift') {
                keys.shift = false;
                event.preventDefault();
            }
        },
        
        handleWheel(event) {
            // If spawn mode is active, use scroll wheel to cycle through spawn options
            if (gameState.spawnMode !== 'off') {
                event.preventDefault();
                cycleSpawnMode(gameState, event.deltaY < 0 ? 'forward' : 'backward');
            }
            // Note: Normal zoom is handled by the override in game.js when spawn mode is off
        }
    };
}

// Setup input event listeners
function setupInputListeners(inputHandler, canvas) {
    document.addEventListener('keydown', inputHandler.handleKeyDown);
    document.addEventListener('keyup', inputHandler.handleKeyUp);
    canvas.addEventListener('wheel', inputHandler.handleWheel);
}

// Setup mouse tracking
function setupMouseTracking(canvas, camera, mouseWorldPos) {
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        const worldPos = window.screenToWorld(screenX, screenY, camera);
        mouseWorldPos.x = worldPos.x;
        mouseWorldPos.y = worldPos.y;
    });
}

// Get current spawn mode info
function getSpawnModeInfo(spawnMode) {
    const modes = {
        'off': { name: 'OFF', color: 'rgba(255, 255, 255, 0.6)', message: 'Press F to cycle: Food → Poop → TrueFry1 → TrueFry2 → Fish Eggs → Sperm → Fertilized Eggs → Krill → Fry → Tuna → Squid → Off' },
        'food': { name: 'FOOD MODE', color: 'rgba(0, 255, 0, 0.8)', message: 'Click to spawn food' },
        'poop': { name: 'POOP MODE', color: 'rgba(139, 69, 19, 0.8)', message: 'Click to spawn poop' },
        'truefry1': { name: 'TRUEFRY1 MODE', color: 'rgba(100, 150, 255, 0.8)', message: 'Click to spawn TrueFry1 (1-3)' },
        'truefry2': { name: 'TRUEFRY2 MODE', color: 'rgba(150, 200, 255, 0.8)', message: 'Click to spawn TrueFry2 (1-3)' },
        'fishEggs': { name: 'FISH EGGS MODE', color: 'rgba(255, 255, 200, 0.8)', message: 'Click to spawn fish eggs (1-3, need sperm to fertilize)' },
        'sperm': { name: 'SPERM MODE', color: 'rgba(255, 200, 255, 0.8)', message: 'Click to spawn sperm (1-3, fertilizes fish eggs)' },
        'fertilizedEggs': { name: 'FERTILIZED EGGS MODE', color: 'rgba(255, 182, 193, 0.8)', message: 'Click to spawn fertilized eggs (1-3)' },
        'krill': { name: 'KRILL MODE', color: 'rgba(255, 150, 100, 0.8)', message: 'Click to spawn krill' },
        'fry': { name: 'FRY MODE', color: 'rgba(100, 200, 255, 0.8)', message: 'Click to spawn fry (1-5 random types)' },
        'tuna': { name: 'TUNA MODE', color: 'rgba(255, 100, 100, 0.8)', message: 'Click to spawn tuna (1-3 random types)' },
        'squid': { name: 'SQUID MODE', color: 'rgba(150, 50, 200, 0.8)', message: 'Click to spawn giant squid (apex predator)' }
    };
    return modes[spawnMode] || modes['off'];
}

// Clean up input listeners (useful for testing or reinitialization)
function removeInputListeners(inputHandler, canvas) {
    document.removeEventListener('keydown', inputHandler.handleKeyDown);
    document.removeEventListener('keyup', inputHandler.handleKeyUp);
    canvas.removeEventListener('wheel', inputHandler.handleWheel);
}

// Make functions available globally
window.createInputHandler = createInputHandler;
window.setupInputListeners = setupInputListeners;
window.setupMouseTracking = setupMouseTracking;
window.getSpawnModeInfo = getSpawnModeInfo;
window.removeInputListeners = removeInputListeners;
window.cycleSpawnMode = cycleSpawnMode; 