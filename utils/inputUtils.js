// Input utilities for keyboard and mouse handling
// Manages game controls and spawn mode cycling

// Create input handler object
function createInputHandler(keys, gameState) {
    return {
        handleKeyDown(event) {
            const key = event.key.toLowerCase();
            if (key === 'h') {
                // Cycle through HUD states: controls only -> controls + tracking -> off -> repeat
                if (!gameState.hudState) gameState.hudState = 'controls'; // Initialize if not set
                
                if (gameState.hudState === 'controls') {
                    gameState.hudState = 'full'; // Show controls + tracking
                } else if (gameState.hudState === 'full') {
                    gameState.hudState = 'off';
                } else {
                    gameState.hudState = 'controls';
                }
                
                // Update HTML UI elements visibility based on state
                const instructions = document.querySelector('.instructions');
                
                if (instructions) {
                    // Show instructions for both 'controls' and 'full' states
                    instructions.style.display = (gameState.hudState !== 'off') ? 'block' : 'none';
                }
                
                // Update legacy showUI for compatibility
                gameState.showUI = gameState.hudState !== 'off';
                
                console.log(`🎮 HUD State: ${gameState.hudState}`);
                event.preventDefault();
            } else if (key === 'f') {
                // Cycle through spawn modes: off -> food -> poop -> truefry1 -> truefry2 -> fish eggs -> sperm -> fertilized eggs -> krill -> fry -> tuna -> squid -> off
                if (gameState.spawnMode === 'off') {
                    gameState.spawnMode = 'food';
                } else if (gameState.spawnMode === 'food') {
                    gameState.spawnMode = 'poop';
                } else if (gameState.spawnMode === 'poop') {
                    gameState.spawnMode = 'truefry1';
                } else if (gameState.spawnMode === 'truefry1') {
                    gameState.spawnMode = 'truefry2';
                } else if (gameState.spawnMode === 'truefry2') {
                    gameState.spawnMode = 'fishEggs';
                } else if (gameState.spawnMode === 'fishEggs') {
                    gameState.spawnMode = 'sperm';
                } else if (gameState.spawnMode === 'sperm') {
                    gameState.spawnMode = 'fertilizedEggs';
                } else if (gameState.spawnMode === 'fertilizedEggs') {
                    gameState.spawnMode = 'krill';
                } else if (gameState.spawnMode === 'krill') {
                    gameState.spawnMode = 'fry';
                } else if (gameState.spawnMode === 'fry') {
                    gameState.spawnMode = 'tuna';
                } else if (gameState.spawnMode === 'tuna') {
                    gameState.spawnMode = 'squid';
                } else {
                    gameState.spawnMode = 'off';
                }
                
                // Stop camera following when spawn mode is activated
                if (window.cameraFollowSystem && gameState.spawnMode !== 'off') {
                    window.cameraFollowSystem.stopFollowing();
                }
                
                event.preventDefault();
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
        
        handleWheel(event, camera, canvas, constants) {
            window.handleCameraZoom(event, camera, canvas, constants);
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