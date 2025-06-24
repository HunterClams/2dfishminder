// Main GameSystem class for managing entities and game state
class GameSystem {
    constructor() {
        // Use global constants
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const CONSTANTS = window.CONSTANTS || {};
        
        // Game state
        this.gameState = {
            showUI: true,
            spawnMode: 'off',
            lastFrameTime: 0,
            frameCount: 0
        };

        // Input handling
        this.keys = {
            w: false, a: false, s: false, d: false,
            shift: false
        };

        // Camera system
        this.camera = {
            x: WORLD_WIDTH / 2,
            y: WORLD_HEIGHT / 2,
            zoom: 1,
            viewWidth: (typeof canvas !== 'undefined' ? canvas.width : 800) / 1,
            viewHeight: (typeof canvas !== 'undefined' ? canvas.height : 600) / 1
        };

        // Mouse tracking
        this.mouseWorldPos = { x: 0, y: 0 };

        // Entity management
        this.entities = {
            boids: [],
            predators: [],
            food: [],
            krill: [],
            poop: [],
            bubbles: [],
            giantSquids: []
        };

        // Entity pools for reuse
        this.entityPools = {
            bubbles: []
        };

        // Make this system globally accessible
        window.gameSystem = this;
    }

    // Getters for external access
    getGameState() { return this.gameState; }
    getKeys() { return this.keys; }
    getCamera() { return this.camera; }
    getMouseWorldPos() { return this.mouseWorldPos; }
    getEntities() { return this.entities; }

    // Entity management
    addEntity(type, entity) {
        if (this.entities[type]) {
            this.entities[type].push(entity);
        }
    }

    removeEntity(type, entity) {
        if (this.entities[type]) {
            const index = this.entities[type].indexOf(entity);
            if (index > -1) {
                this.entities[type].splice(index, 1);
            }
        }
    }

    // Spawn system
    spawnItems(x, y, mode) {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const FISH_TYPES = window.FISH_TYPES || {
            SMALL_FRY_2: 'smallFry2',
            SMALL_FRY_3: 'smallFry3',
            SMALL_FRY_4: 'smallFry4',
            KRILL: 'krill'
        };
        
        switch(mode) {
            case 'food':
                if (window.FishFood) {
                    this.addEntity('food', new window.FishFood(x, y));
                }
                break;
            case 'krill':
                for (let i = 0; i < 5; i++) {
                    const offsetX = (Math.random() - 0.5) * 100;
                    const offsetY = (Math.random() - 0.5) * 100;
                    if (window.Krill) {
                        this.addEntity('krill', new window.Krill(x + offsetX, y + offsetY));
                    }
                }
                break;
            case 'poop':
                if (window.Poop) {
                    this.addEntity('poop', new window.Poop(x, y));
                }
                break;
            case 'fry':
                const fishTypes = [FISH_TYPES.SMALL_FRY_2, FISH_TYPES.SMALL_FRY_3, FISH_TYPES.SMALL_FRY_4];
                for (let i = 0; i < 8; i++) {
                    const offsetX = (Math.random() - 0.5) * 120;
                    const offsetY = (Math.random() - 0.5) * 120;
                    const fishType = fishTypes[Math.floor(Math.random() * fishTypes.length)];
                    if (window.Boid) {
                        this.addEntity('boids', new window.Boid(fishType));
                    }
                }
                break;
            case 'tuna':
                if (window.Predator) {
                    this.addEntity('predators', new window.Predator(x, y));
                }
                break;
            case 'squid':
                if (window.GiantSquid) {
                    this.addEntity('giantSquids', new window.GiantSquid(x, y));
                }
                break;
        }
    }

    // Initialize ecosystem with starting entities
    initializeEcosystem() {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const FISH_TYPES = window.FISH_TYPES || {
            SMALL_FRY_2: 'smallFry2',
            SMALL_FRY_3: 'smallFry3',
            SMALL_FRY_4: 'smallFry4',
            KRILL: 'krill'
        };
        
        console.log('Initializing ecosystem...');

        // Create initial boids (small fish)
        const fishTypes = [FISH_TYPES.SMALL_FRY_2, FISH_TYPES.SMALL_FRY_3, FISH_TYPES.SMALL_FRY_4];
        for (let i = 0; i < 40; i++) {
            const fishType = fishTypes[Math.floor(Math.random() * fishTypes.length)];
            const x = Math.random() * WORLD_WIDTH;
            const y = Math.random() * WORLD_HEIGHT;
            if (window.Boid) {
                this.addEntity('boids', new window.Boid(fishType));
            }
        }

        // Create initial krill
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * WORLD_WIDTH;
            const y = Math.random() * WORLD_HEIGHT;
            if (window.Krill) {
                this.addEntity('krill', new window.Krill(x, y));
            }
        }

        // Create initial predators (tuna)
        for (let i = 0; i < 3; i++) {
            const x = Math.random() * WORLD_WIDTH;
            const y = Math.random() * WORLD_HEIGHT;
            if (window.Predator) {
                this.addEntity('predators', new window.Predator(x, y));
            }
        }

        // Create initial giant squids
        for (let i = 0; i < 1; i++) {
            const x = Math.random() * WORLD_WIDTH;
            const y = WORLD_HEIGHT * 0.8 + Math.random() * WORLD_HEIGHT * 0.2; // Deep water
            if (window.GiantSquid) {
                this.addEntity('giantSquids', new window.GiantSquid(x, y));
            }
        }

        // Create some ambient bubbles
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * WORLD_WIDTH;
            const y = Math.random() * WORLD_HEIGHT;
            if (window.Bubble) {
                this.addEntity('bubbles', new window.Bubble(x, y));
            }
        }

        console.log(`Ecosystem initialized with ${this.entities.boids.length} boids, ${this.entities.krill.length} krill, ${this.entities.predators.length} predators, ${this.entities.giantSquids.length} giant squids`);
    }

    // Update all entities
    update() {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const CONSTANTS = window.CONSTANTS || {};
        
        // Update camera
        if (window.updateCamera) {
            window.updateCamera(this.camera, this.keys, CONSTANTS, WORLD_WIDTH, WORLD_HEIGHT);
        }

        // Clean up inactive entities
        this.cleanupEntities();

        // Object pool cleanup
        if (window.ObjectPools) {
            const { eatingBubbles } = window.ObjectPools;
            if (eatingBubbles) {
                for (let i = eatingBubbles.length - 1; i >= 0; i--) {
                    eatingBubbles[i].update();
                    if (eatingBubbles[i].life <= 0) {
                        eatingBubbles.splice(i, 1);
                    }
                }
            }
            window.ObjectPools.cleanup();
        }

        // Update all entities
        this.entities.boids.forEach(boid => {
            boid.update(this.entities.boids, this.entities.predators, this.entities.food, this.entities.krill, this.entities.poop);
        });

        this.entities.predators.forEach(predator => {
            predator.update(this.entities.boids, this.entities.predators, this.entities.food, this.entities.krill);
        });

        this.entities.food.forEach(food => food.update());
        this.entities.krill.forEach(krill => {
            krill.update(this.entities.boids, this.entities.predators, this.entities.food, this.entities.krill, this.entities.poop);
        });
        this.entities.poop.forEach(poop => poop.update());
        this.entities.bubbles.forEach(bubble => bubble.update());
        this.entities.giantSquids.forEach(squid => {
            squid.update(this.entities.boids, this.entities.predators, this.entities.krill);
        });

        // Check food consumption
        this.entities.food.forEach(food => {
            food.checkEaten(this.entities.boids);
        });

        this.gameState.frameCount++;
    }

    cleanupEntities() {
        // Remove eaten food
        this.entities.food = this.entities.food.filter(food => !food.eaten);
        
        // Remove inactive poop
        this.entities.poop = this.entities.poop.filter(poop => poop.isActive);
        
        // Remove inactive bubbles
        this.entities.bubbles = this.entities.bubbles.filter(bubble => bubble.isActive);
    }

    // Render all entities
    render() {
        // Safe check for ctx
        if (!window.ctx && typeof ctx === 'undefined') return;
        const context = window.ctx || ctx;
        
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        // Apply camera transform
        if (window.applyCamera) {
            window.applyCamera(context);
        }

        // Clear and draw background
        context.fillStyle = '#001122';
        context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Draw depth gradient
        if (window.Utils && window.Utils.createDepthGradient) {
            const gradient = window.Utils.createDepthGradient();
            if (gradient) {
                context.fillStyle = gradient;
                context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
            }
        }

        // Draw all entities
        this.entities.bubbles.forEach(bubble => bubble.draw());
        this.entities.food.forEach(food => food.draw());
        this.entities.poop.forEach(poop => poop.draw());
        this.entities.krill.forEach(krill => krill.draw());
        this.entities.boids.forEach(boid => boid.draw());
        this.entities.predators.forEach(predator => predator.draw());
        this.entities.giantSquids.forEach(squid => squid.draw());

        // Draw eating bubbles from object pool
        if (window.ObjectPools) {
            const { eatingBubbles } = window.ObjectPools;
            if (eatingBubbles) {
                eatingBubbles.forEach(bubble => bubble.draw());
            }
        }

        // Draw world borders
        this.drawWorldBorders(context, WORLD_WIDTH, WORLD_HEIGHT);

        // Reset camera transform
        if (window.resetCamera) {
            window.resetCamera(context);
        }

        // Draw UI
        if (this.gameState.showUI) {
            this.drawUI(context);
        }
    }

    drawWorldBorders(context, WORLD_WIDTH, WORLD_HEIGHT) {
        const CONSTANTS = window.CONSTANTS || { BORDER_WIDTH: 8, CORNER_SIZE: 30 };
        
        context.strokeStyle = '#444';
        context.lineWidth = CONSTANTS.BORDER_WIDTH;
        context.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Draw corner indicators
        const size = CONSTANTS.CORNER_SIZE;
        context.fillStyle = '#666';
        context.fillRect(0, 0, size, size);
        context.fillRect(WORLD_WIDTH - size, 0, size, size);
        context.fillRect(0, WORLD_HEIGHT - size, size, size);
        context.fillRect(WORLD_WIDTH - size, WORLD_HEIGHT - size, size, size);
    }

    drawUI(context) {
        // Draw spawn mode indicator
        if (this.gameState.spawnMode !== 'off') {
            // Safe check for Utils and inRenderDistance
            const shouldShow = !window.Utils || !window.Utils.inRenderDistance || window.Utils.inRenderDistance(this.mouseWorldPos);
            
            if (shouldShow) {
                const spawnInfo = this.getSpawnModeInfo();
                context.fillStyle = spawnInfo.color;
                context.fillRect(this.mouseWorldPos.x - 10, this.mouseWorldPos.y - 10, 20, 20);
            }
        }

        // Draw entity counts
        context.fillStyle = 'white';
        context.font = '16px Arial';
        const stats = [
            `Boids: ${this.entities.boids.length}`,
            `Krill: ${this.entities.krill.length}`,
            `Predators: ${this.entities.predators.length}`,
            `Giant Squids: ${this.entities.giantSquids.length}`,
            `Food: ${this.entities.food.length}`,
            `Poop: ${this.entities.poop.length}`,
            `Spawn Mode: ${this.gameState.spawnMode}`,
            `Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)}) Zoom: ${this.camera.zoom.toFixed(2)}`
        ];

        stats.forEach((stat, index) => {
            context.fillText(stat, 10, 25 + index * 20);
        });
    }

    getSpawnModeInfo() {
        const modes = {
            'food': { color: '#8B4513', name: 'Fish Food' },
            'krill': { color: '#FF69B4', name: 'Krill' },
            'poop': { color: '#8B4513', name: 'Poop' },
            'fry': { color: '#FFD700', name: 'Small Fish' },
            'tuna': { color: '#FF4500', name: 'Tuna' },
            'squid': { color: '#800080', name: 'Giant Squid' }
        };
        return modes[this.gameState.spawnMode] || { color: '#FFF', name: 'Unknown' };
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.GameSystem = GameSystem;
} 