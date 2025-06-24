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
                // Cycle through spawn modes: off -> food -> krill -> poop -> fry -> tuna -> squid -> off
                if (gameState.spawnMode === 'off') {
                    gameState.spawnMode = 'food';
                } else if (gameState.spawnMode === 'food') {
                    gameState.spawnMode = 'krill';
                } else if (gameState.spawnMode === 'krill') {
                    gameState.spawnMode = 'poop';
                } else if (gameState.spawnMode === 'poop') {
                    gameState.spawnMode = 'fry';
                } else if (gameState.spawnMode === 'fry') {
                    gameState.spawnMode = 'tuna';
                } else if (gameState.spawnMode === 'tuna') {
                    gameState.spawnMode = 'squid';
                } else {
                    gameState.spawnMode = 'off';
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
            } else if (key === 't') {
                // Cycle through behavior state display: Off -> Tuna -> Squid -> Fry -> Krill -> Off
                if (!gameState.behaviorDebug || gameState.behaviorDebug === 'off') {
                    gameState.behaviorDebug = 'tuna';
                    gameState.tunaDebug = true;
                    gameState.squidDebug = false;
                    gameState.fryDebug = false;
                    gameState.krillDebug = false;
                    console.log('🐟 Show Behaviour State: Tuna (tunaDebug:', gameState.tunaDebug, ')');
                } else if (gameState.behaviorDebug === 'tuna') {
                    gameState.behaviorDebug = 'squid';
                    gameState.tunaDebug = false;
                    gameState.squidDebug = true;
                    gameState.fryDebug = false;
                    gameState.krillDebug = false;
                    console.log('🦑 Show Behaviour State: Squid (squidDebug:', gameState.squidDebug, ')');
                } else if (gameState.behaviorDebug === 'squid') {
                    gameState.behaviorDebug = 'fry';
                    gameState.tunaDebug = false;
                    gameState.squidDebug = false;
                    gameState.fryDebug = true;
                    gameState.krillDebug = false;
                    console.log('🐠 Show Behaviour State: Fry (fryDebug:', gameState.fryDebug, ')');
                } else if (gameState.behaviorDebug === 'fry') {
                    gameState.behaviorDebug = 'krill';
                    gameState.tunaDebug = false;
                    gameState.squidDebug = false;
                    gameState.fryDebug = false;
                    gameState.krillDebug = true;
                    console.log('🦐 Show Behaviour State: Krill (krillDebug:', gameState.krillDebug, ')');
                } else {
                    gameState.behaviorDebug = 'off';
                    gameState.tunaDebug = false;
                    gameState.squidDebug = false;
                    gameState.fryDebug = false;
                    gameState.krillDebug = false;
                    console.log('❌ Show Behaviour State: Off');
                }
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
        'off': { name: 'OFF', color: 'rgba(255, 255, 255, 0.6)', message: 'Press F to cycle: Food → Krill → Poop → Fry → Tuna → Squid → Off' },
        'food': { name: 'FOOD MODE', color: 'rgba(0, 255, 0, 0.8)', message: 'Click to spawn food' },
        'krill': { name: 'KRILL MODE', color: 'rgba(255, 150, 100, 0.8)', message: 'Click to spawn krill' },
        'poop': { name: 'POOP MODE', color: 'rgba(139, 69, 19, 0.8)', message: 'Click to spawn poop' },
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