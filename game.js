// Get the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

const gameState = { spawnMode: 'off', frameCount: 0, lastFrameTime: 0, showUI: true };
const camera = { x: 0, y: 0, zoom: 1, minZoom: 0.5, maxZoom: 4.0, viewWidth: 0, viewHeight: 0 };
const keys = { w: false, a: false, s: false, d: false, shift: false };

const sprites = {};
const spriteFiles = {
    bubble1: 'bubble1.png', bubble2: 'bubble2.png', smallFry2: 'smallFry2.png',
    smallFry3: 'smallFry3.png', smallFry4: 'smallFry4.png', tuna: 'tuna.png', tuna2: 'tuna2.png', 
    fishFood: 'fishFood.png', poop: 'poop.png', poop2: 'poop2.png', poop3: 'poop3.png',
    krill1: 'krill1.png', krill2: 'krill2.png', krill3: 'krill3.png', krillSpawnIcon: 'krillSpawnIcon.png',
    // Pale krill variant - lighter, more translucent
    paleKrill1: 'pale krill1.png', paleKrill2: 'pale krill2.png', paleKrill3: 'pale krill3.png',
    // Tiger krill variant - striped, more aggressive
    tigerKrill1: 'tiger krill1.png', tigerKrill2: 'tiger krill2.png', tigerKrill3: 'tiger krill3.png',
    // Mom krill variant - larger, nurturing
    momKrill1: 'krill mom1.png', momKrill2: 'krill mom2.png', momKrill3: 'krill mom3.png',
    giantSquid1: 'giant squid fram1.png', giantSquid2: 'giant squid fram2.png',
    abyssalSquid1: 'abbysal squid fram1.png', abyssalSquid2: 'abbysal squid fram2.png',
    abyssalSquid1Blink: 'abbysal squid fram1 (1).png', abyssalSquid2Blink: 'abbysal squid fram2 (1).png'
};

let spritesLoaded = 0;

Object.entries(spriteFiles).forEach(([key, filename]) => {
    sprites[key] = new Image();
    sprites[key].onload = () => {
        spritesLoaded++;
    };
    sprites[key].onerror = () => console.warn(`Failed to load sprite: ${filename}`);
    sprites[key].src = `images/${filename}`;
});

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

// Optimized FishFood class
class FishFood {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 12;
        this.sinkSpeed = 0.8;
        this.eatRadius = 10;
        this.eaten = false;
        this.opacity = 1;
        this.transformedToPoop = false; // Track if already transformed to avoid multiple transformations
    }

    update() {
        if (!this.eaten) {
            this.y += this.sinkSpeed;
            
            // Check if we've reached abyssal depth (80% of world height)
            const abyssalDepth = WORLD_HEIGHT * CONSTANTS.DEPTH_FADE_END; // 80%
            if (this.y >= abyssalDepth && !this.transformedToPoop) {
                // Transform into poop3 when reaching abyssal depth
                gameEntities.poop.push(new Poop(this.x, this.y, 'abyssal'));
                this.eaten = true;
                this.transformedToPoop = true;
                return;
            }
            
            if (this.y > WORLD_HEIGHT + 10) {
                this.eaten = true;
            }
        }
    }

    draw() {
        if (!this.eaten && Utils.inRenderDistance(this)) {
            const depthOpacity = Utils.getDepthOpacity(this.y, this.opacity);
            const tintStrength = Utils.getDepthTint(this.y);
            
            ctx.save();
            
            if (tintStrength > 0) {
                // Create temporary canvas for proper transparency handling
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = this.size;
                tempCanvas.height = this.size;
                
                // Draw sprite on temp canvas
                tempCtx.drawImage(sprites.fishFood, 0, 0, this.size, this.size);
                
                // Apply tint using source-atop (only affects non-transparent pixels)
                tempCtx.globalCompositeOperation = 'source-atop';
                tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
                tempCtx.fillRect(0, 0, this.size, this.size);
                
                // Draw the tinted sprite to main canvas
                ctx.globalAlpha = depthOpacity;
                ctx.drawImage(tempCanvas, this.x - this.size/2, this.y - this.size/2);
            } else {
                // No tint needed, draw normally
                ctx.globalAlpha = depthOpacity;
                ctx.drawImage(sprites.fishFood, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
            }
            
            ctx.restore();
        }
    }

    checkEaten(fish, krill = []) {
        if (this.eaten) return false;
        
        const eatRadiusSquared = this.eatRadius * this.eatRadius;
        
        // Check if fish ate the food
        for (let fishEntity of fish) {
            if (Utils.distanceSquared(this, fishEntity) < eatRadiusSquared) {
                this.eaten = true;
                
                // Track food consumption for fry pooping system
                if (fishEntity.foodEaten !== undefined) {
                    fishEntity.foodEaten++;
                    
                    // Fry poop after eating 8-10 food items WITH COOLDOWN
                    const currentTime = Date.now();
                    const foodThreshold = 8 + Math.floor(Math.random() * 3); // 8-10 items
                    
                    if (fishEntity.foodEaten >= foodThreshold && 
                        (currentTime - (fishEntity.lastPoopTime || 0)) > (fishEntity.poopCooldown || 5000)) {
                        gameEntities.poop.push(new Poop(fishEntity.x, fishEntity.y));
                        fishEntity.foodEaten = 0; // Reset counter
                        fishEntity.lastPoopTime = currentTime;
                    }
                }
                
                return true;
            }
        }
        
        // Check if krill ate the food
        for (let krillEntity of krill) {
            if (Utils.distanceSquared(this, krillEntity) < eatRadiusSquared) {
                this.eaten = true;
                
                // Handle krill food consumption
                if (krillEntity.checkFoodConsumption) {
                    krillEntity.checkFoodConsumption(1); // Fish food has value of 1
                }
                
                // Reduced bubbles when krill eat fish food (prevent lag)
                if (Math.random() < 0.5) { // Only 50% chance of bubbles
                    ObjectPools.getEatingBubble(this.x, this.y);
                }
                
                return true;
            }
        }
        return false;
    }
}

// Optimized Bubble class
class Bubble {
    constructor() {
        this.reset();
        this.sprite = Utils.getRandomBubbleSprite();
    }

    reset() {
        this.x = Math.random() * WORLD_WIDTH;
        this.y = WORLD_HEIGHT + Math.random() * 20;
        this.size = (Math.random() * 16 + 10) * (0.5 + Math.random() * 0.8);
        this.speed = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.5 + 0.5;
    }

    update() {
        this.y -= this.speed;
        if (this.y < -this.size) {
            this.reset();
        }
    }

    draw() {
        if (Utils.inRenderDistance(this)) {
            const depthOpacity = Utils.getDepthOpacity(this.y, this.opacity);
            const tintStrength = Utils.getDepthTint(this.y);
            
            ctx.save();
            
            if (tintStrength > 0) {
                // Create temporary canvas for proper transparency handling
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = this.size;
                tempCanvas.height = this.size;
                
                // Draw sprite on temp canvas
                tempCtx.drawImage(this.sprite, 0, 0, this.size, this.size);
                
                // Apply tint using source-atop (only affects non-transparent pixels)
                tempCtx.globalCompositeOperation = 'source-atop';
                tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
                tempCtx.fillRect(0, 0, this.size, this.size);
                
                // Draw the tinted sprite to main canvas
                ctx.globalAlpha = depthOpacity;
                ctx.drawImage(tempCanvas, this.x - this.size/2, this.y - this.size/2);
            } else {
                // No tint needed, draw normally
                ctx.globalAlpha = depthOpacity;
                ctx.drawImage(this.sprite, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
            }
            
            ctx.restore();
        }
    }
}

// Optimized EatingBubble class with pooling
class EatingBubble {
    constructor(x, y) {
        this.reset(x, y);
        this.sprite = Utils.getRandomBubbleSprite();
    }
    
    reset(x, y) {
        this.x = x + (Math.random() - 0.5) * 20;
        this.y = y + (Math.random() - 0.5) * 20;
        this.size = Math.random() * 8 + 4;
        this.speed = Math.random() * 3 + 2;
        this.opacity = 0.8;
        this.life = 0;
        this.maxLife = 60;
        this.dead = false;
    }

    update() {
        if (this.dead) return;
        
        this.y -= this.speed;
        this.life++;
        this.opacity = Math.max(0, 0.8 - (this.life / this.maxLife) * 0.8);
        this.speed *= 0.99;
        
        if (this.life >= this.maxLife || this.opacity <= 0) {
            this.dead = true;
        }
    }

    draw() {
        if (!this.dead && Utils.inRenderDistance(this)) {
            const depthOpacity = Utils.getDepthOpacity(this.y, this.opacity);
            const tintStrength = Utils.getDepthTint(this.y);
            
            ctx.save();
            
            if (tintStrength > 0) {
                // Create temporary canvas for proper transparency handling
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = this.size;
                tempCanvas.height = this.size;
                
                // Draw sprite on temp canvas
                tempCtx.drawImage(this.sprite, 0, 0, this.size, this.size);
                
                // Apply tint using source-atop (only affects non-transparent pixels)
                tempCtx.globalCompositeOperation = 'source-atop';
                tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
                tempCtx.fillRect(0, 0, this.size, this.size);
                
                // Draw the tinted sprite to main canvas
                ctx.globalAlpha = depthOpacity;
                ctx.drawImage(tempCanvas, this.x - this.size/2, this.y - this.size/2);
            } else {
                // No tint needed, draw normally
                ctx.globalAlpha = depthOpacity;
                ctx.drawImage(this.sprite, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
            }
            
            ctx.restore();
        }
    }

    isDead() {
        return this.dead;
    }
}

// Base Entity class with optimized rendering
class Entity {
    constructor(x, y, spawnDepthZone = null) {
        this.x = x || Math.random() * WORLD_WIDTH;
        
        // Habitat-based spawning system
        if (spawnDepthZone && !y) {
            switch (spawnDepthZone) {
                case 'surface': // 0-20% depth (surface layer)
                    this.y = Math.random() * (WORLD_HEIGHT * 0.2);
                    break;
                case 'shallow': // 0-40% depth (shallow water)
                    this.y = Math.random() * (WORLD_HEIGHT * 0.4);
                    break;
                case 'mid': // 20-60% depth (mid-water zone)
                    this.y = (WORLD_HEIGHT * 0.2) + Math.random() * (WORLD_HEIGHT * 0.4);
                    break;
                case 'deep': // 0-80% depth (avoid abyssal)
                    this.y = Math.random() * (WORLD_HEIGHT * 0.8);
                    break;
                case 'abyssal': // 80-100% depth (deep water)
                    this.y = (WORLD_HEIGHT * 0.8) + Math.random() * (WORLD_HEIGHT * 0.2);
                    break;
                default:
                    this.y = Math.random() * WORLD_HEIGHT;
            }
        } else {
            this.y = y || Math.random() * WORLD_HEIGHT;
        }
        
        this.velocity = { x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 };
    }
    
    move() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
    
    // Properly optimized sprite drawing with correct transparency handling
    drawSprite(sprite, size, opacity = 1, angle = 0) {
        if (!Utils.inRenderDistance(this)) return;
        
        const depthOpacity = Utils.getDepthOpacity(this.y, opacity);
        const tintStrength = Utils.getDepthTint(this.y);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.velocity.x < 0) ctx.scale(-1, 1);
        if (angle !== 0) ctx.rotate(angle);
        
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(sprite, 0, 0, size, size);
            
            // Apply tint using source-atop (only affects non-transparent pixels)
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, size, size);
            
            // Draw the tinted sprite to main canvas
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -size/2, -size/2);
        } else {
            // No tint needed, draw normally
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(sprite, -size/2, -size/2, size, size);
        }
        
        ctx.restore();
    }
}

// Optimized Predator class
class Predator extends Entity {
    constructor(tunaType = 'tuna') {
        // All tuna now spawn in mid-water zones (balanced between surface and deep)
        super(null, null, 'mid');
        
        this.velocity = { x: Math.random() * 6 - 3, y: Math.random() * 6 - 3 };
        this.tunaType = tunaType;
        // Standardized size and speed for all tuna
        this.size = 58; // Average of 60 and 55
        this.maxSpeed = 4.75; // Average of 4.5 and 5
        this.maxForce = 0.08;
        this.huntRadius = 180; // 50% increase from 120
        this.huntRadiusSquared = this.huntRadius * this.huntRadius;
        this.eatRadius = 25; // Back to original value
        this.eatRadiusSquared = this.eatRadius * this.eatRadius;
        
        // Reduced deep water shader effect by half
        this.depthOpacityMultiplier = 0.5; // 50% shader reduction
        this.lastEatTime = 0; // Track when tuna last ate
        this.eatCooldown = 8000; // 8 second cooldown between eating for tuna
        this.lastPoopTime = 0; // Track when tuna last pooped
        this.poopIgnoreDuration = 5000; // 5 seconds to ignore fry after pooping
    }

    edges() {
        Utils.handleEdges(this, 30, 0.7);
    }

    hunt(prey, krill = []) {
        let closest = null;
        let closestDistSquared = this.huntRadiusSquared;
        
        // Check if tuna should ignore fry after pooping
        const currentTime = Date.now();
        const shouldIgnoreFry = (currentTime - this.lastPoopTime) < this.poopIgnoreDuration;
        
        // Hunt regular fish
        for (let fish of prey) {
            if (Utils.shouldIgnorePrey(this.tunaType, fish.fishType)) continue;
            
            // Skip fry if we recently pooped
            if (shouldIgnoreFry && (fish.fishType === FISH_TYPES.SMALL_FRY_2 || 
                                   fish.fishType === FISH_TYPES.SMALL_FRY_3 || 
                                   fish.fishType === FISH_TYPES.SMALL_FRY_4)) {
                continue;
            }
            
            const distSquared = Utils.distanceSquared(this, fish);
            if (distSquared < closestDistSquared) {
                closest = fish;
                closestDistSquared = distSquared;
            }
        }
        
        // Also hunt krill
        for (let krillEntity of krill) {
            if (Utils.shouldIgnorePrey(this.tunaType, FISH_TYPES.KRILL)) continue;
            
            const distSquared = Utils.distanceSquared(this, krillEntity);
            if (distSquared < closestDistSquared) {
                closest = krillEntity;
                closestDistSquared = distSquared;
            }
        }
        
        return closest ? Utils.calculateSteering(this, closest, this.maxSpeed, this.maxForce) : { x: 0, y: 0 };
    }

    checkForFood(prey, krill = []) {
        // Check eating cooldown
        const currentTime = Date.now();
        if (currentTime - this.lastEatTime < this.eatCooldown) return;
        
        // Check for regular fish prey
        for (let i = prey.length - 1; i >= 0; i--) {
            if (Utils.shouldIgnorePrey(this.tunaType, prey[i].fishType)) continue;
            
            if (Utils.distanceSquared(this, prey[i]) < this.eatRadiusSquared) {
                // Use object pool for eating bubbles
                const bubbleCount = Math.floor(Math.random() * 4) + 3;
                for (let j = 0; j < bubbleCount; j++) {
                    ObjectPools.getEatingBubble(prey[i].x, prey[i].y);
                }
                
                // Create poop when tuna eats fry
                gameEntities.poop.push(new Poop(this.x, this.y, 'tuna'));
                this.lastPoopTime = currentTime; // Track when we pooped
                
                prey.splice(i, 1);
                this.lastEatTime = currentTime;
                break; // Only eat one per frame
            }
        }
        
        // Check for krill prey
        for (let i = krill.length - 1; i >= 0; i--) {
            if (Utils.shouldIgnorePrey(this.tunaType, FISH_TYPES.KRILL)) continue;
            
            if (Utils.distanceSquared(this, krill[i]) < this.eatRadiusSquared) {
                // Smaller bubble effect for krill
                const bubbleCount = Math.floor(Math.random() * 2) + 1;
                for (let j = 0; j < bubbleCount; j++) {
                    ObjectPools.getEatingBubble(krill[i].x, krill[i].y);
                }
                
                // Create poop when tuna eats krill (smaller poop)
                gameEntities.poop.push(new Poop(this.x, this.y));
                this.lastPoopTime = currentTime; // Track when we pooped
                
                krill.splice(i, 1);
                this.lastEatTime = currentTime;
                break; // Only eat one per frame
            }
        }
    }

    flee(squids) {
        let fleeForce = { x: 0, y: 0 };
        const fleeRadius = 200; // Distance at which tuna start fleeing from squids
        const fleeRadiusSquared = fleeRadius * fleeRadius;
        
        for (let squid of squids) {
            const distSquared = Utils.distanceSquared(this, squid);
            if (distSquared < fleeRadiusSquared) {
                // Calculate flee direction (away from squid)
                const dx = this.x - squid.x;
                const dy = this.y - squid.y;
                const distance = Math.sqrt(distSquared);
                
                if (distance > 0) {
                    // Stronger flee force when closer to squid
                    const fleeStrength = (fleeRadius - distance) / fleeRadius;
                    fleeForce.x += (dx / distance) * fleeStrength * this.maxForce * 3;
                    fleeForce.y += (dy / distance) * fleeStrength * this.maxForce * 3;
                }
            }
        }
        
        return fleeForce;
    }

    update(prey, krill, squids = []) {
        // Flee from squids takes priority over hunting
        const fleeForce = this.flee(squids);
        const fleeMagnitude = Math.hypot(fleeForce.x, fleeForce.y);
        
        if (fleeMagnitude > 0) {
            // Fleeing from squids - apply strong flee force
            this.velocity.x += fleeForce.x * 2.5;
            this.velocity.y += fleeForce.y * 2.5;
        } else {
            // No squids nearby - normal hunting behavior
            const huntSteering = this.hunt(prey, krill);
            const huntMagnitude = Math.hypot(huntSteering.x, huntSteering.y);
            
            if (huntMagnitude > 0) {
                this.velocity.x += huntSteering.x * 2;
                this.velocity.y += huntSteering.y * 2;
            } else {
                // Simple patrol behavior
                this.velocity.x += (Math.random() - 0.5) * 0.1;
                this.velocity.y += (Math.random() - 0.5) * 0.1;
            }
        }
        
        // All tuna now have the same depth preference: mid-water to deep (0-75%) - avoid abyssal
        const avoidDepth = WORLD_HEIGHT * 0.75; // Avoid deepest abyssal zone (75-100%)
        const currentDepth = this.y;
        
        if (currentDepth > avoidDepth) {
            const depthDifference = currentDepth - avoidDepth;
            const maxDepthForce = WORLD_HEIGHT * 0.25;
            const forceStrength = Math.min(depthDifference / maxDepthForce, 1.0);
            
            // Apply moderate upward force to avoid abyssal darkness
            this.velocity.y -= forceStrength * this.maxForce * 4.0;
        }
        
        Utils.limitVelocity(this.velocity, this.maxSpeed);
        this.move();
        this.edges();
        this.checkForFood(prey, krill);
    }

    draw() {
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.3;
        
        // Apply reduced deep water shader effect (50% reduction)
        const baseOpacity = Utils.getDepthOpacity(this.y, 0.95);
        const reducedOpacity = baseOpacity * this.depthOpacityMultiplier + (1 - this.depthOpacityMultiplier);
        
        this.drawSprite(sprites[this.tunaType], this.size, reducedOpacity, angle);
    }
}

// Giant Squid - Deep water predator that lurks upward to grab tuna and drag them down
class GiantSquid extends Entity {
    constructor() {
        // Spawn in abyssal zones (75-95% depth)
        const spawnY = WORLD_HEIGHT * (0.75 + Math.random() * 0.2);
        const spawnX = Math.random() * WORLD_WIDTH;
        super(spawnX, spawnY, 'abyssal');
        
        // Physical properties - 5x larger sprite (reduced to 5% increase)
        this.size = 446.25; // 5% increase from 425 (reduced from 10%)
        this.maxSpeed = 73.5; // 5% increase from 70.0 (reduced from 10%)
        this.cruiseSpeed = 16.8; // 5% increase from 16.0 (reduced from 10%)
        this.burstSpeed = 63.0; // 5% increase from 60.0 (reduced from 10%)
        this.maxForce = 1.05; // 5% increase from 1.0 (reduced from 10%)
        
        // Jet propulsion system
        this.jetPower = 0;
        this.jetDirection = { x: 0, y: 0 };
        this.jetCooldown = 0;
        this.jetDuration = 0;
        this.mantle = {
            contracted: false,
            contractTime: 0,
            cycleTime: 0
        };
        
        // Behavioral state machine
        this.state = 'patrolling';  // patrolling, hunting, attacking, retreating
        this.stateTimer = 0;
        this.huntTarget = null;
        this.grabbedPrey = null;
        
        // Movement patterns
        this.tentaclePulse = 0;
        this.finUndulation = 0;
        this.currentSpeed = 0;
        this.targetDepth = this.y;
        
        // Bioluminescent blinking system
        this.blinkTimer = 0;
        this.blinkCycle = 80; // Blink every 1.33 seconds (60 FPS * 1.33)
        this.blinkDuration = 20; // Blink lasts 0.33 seconds
        
        // Sensory system - scaled proportionally for larger squid (reduced to 5% increase)
        this.visionRange = 1050; // 5% increase from 1000 (reduced from 10%)
        this.visionRangeSquared = this.visionRange * this.visionRange;
        this.attackRange = 315; // 5% increase from 300 (reduced from 10%)
        this.attackRangeSquared = this.attackRange * this.attackRange;
        
        // Full shader effect applied (no reduction)
        this.depthOpacityMultiplier = 1; // No reduction - full depth shader effect
        this.lastEatTime = 0; // Track when giant squid last ate
        this.eatCooldown = 10000; // 10 second cooldown between eating for giant squid
        this.lastPoopTime = 0; // Track when squid last pooped
        this.poopIgnoreDuration = 8000; // 8 seconds to ignore tuna after pooping
        
        // Initialize with gentle downward drift
        this.velocity = { x: 0, y: 0.2 };
        
        console.log('Massive Giant Squid created at:', this.x, this.y, 'Size:', this.size);
    }
    
    // Jet propulsion mechanics
    jet(direction, power = 1.0) {
        if (this.jetCooldown <= 0) {
            this.jetPower = power;
            this.jetDirection.x = direction.x;
            this.jetDirection.y = direction.y;
            this.jetDuration = 15 + (power * 10); // Jet duration based on power
            this.jetCooldown = 30 + (power * 20); // Cooldown based on power
            this.mantle.contracted = true;
            this.mantle.contractTime = 8;
            
            // Immediate velocity change from jet (reduced to 5% increase)
            const jetForce = power * 1.68; // 5% increase from 1.6 (reduced from 10%)
            this.velocity.x += direction.x * jetForce;
            this.velocity.y += direction.y * jetForce;
        }
    }
    
    // Fin-based gentle movement (reduced to 5% increase)
    finPropulsion(direction, intensity = 0.5) {
        const finForce = intensity * 0.315; // 5% increase from 0.3 (reduced from 10%)
        this.velocity.x += direction.x * finForce;
        this.velocity.y += direction.y * finForce;
        this.finUndulation += 0.3;
    }
    
    // Tentacle movement for fine positioning (reduced to 5% increase)  
    tentacleAdjust(direction, strength = 0.3) {
        const tentacleForce = strength * 0.168; // 5% increase from 0.16 (reduced from 10%)
        this.velocity.x += direction.x * tentacleForce;
        this.velocity.y += direction.y * tentacleForce;
        this.tentaclePulse += 0.2;
    }
    
    // Hunt for prey (only target tuna)
    scanForPrey(predators, fish) {
        let closestPrey = null;
        let closestDistance = this.visionRangeSquared;
        
        // Check if squid should ignore tuna after pooping
        const currentTime = Date.now();
        const shouldIgnoreTuna = (currentTime - this.lastPoopTime) < this.poopIgnoreDuration;
        
        // Only hunt tuna (predators) - ignore all other fish
        if (!shouldIgnoreTuna) {
            for (let tuna of predators) {
                const distSquared = Utils.distanceSquared(this, tuna);
                if (distSquared < closestDistance) {
                    closestPrey = tuna;
                    closestDistance = distSquared;
                }
            }
        }
        
        return closestPrey;
    }
    
    // Depth preference (stay in deep waters)
    maintainDepth() {
        const currentDepth = this.y / WORLD_HEIGHT;
        
        // Prefer 75-95% depth range
        let targetDepthPercent = 0.85; // Preferred depth
        
        if (currentDepth < 0.7) {
            // Too shallow - dive deeper
            targetDepthPercent = 0.8;
        } else if (currentDepth > 0.95) {
            // Too deep - rise slightly
            targetDepthPercent = 0.9;
        }
        
        this.targetDepth = WORLD_HEIGHT * targetDepthPercent;
        
        // Gentle depth adjustment - scaled for larger squid
        const depthDiff = this.targetDepth - this.y;
        if (Math.abs(depthDiff) > 150) { // 5x larger threshold (was 30)
            const direction = { x: 0, y: Math.sign(depthDiff) };
            this.finPropulsion(direction, 0.4);
        }
    }
    
    update(fish, predators, krill) {
        this.stateTimer++;
        
        // Update jet propulsion system
        if (this.jetDuration > 0) {
            this.jetDuration--;
            // Apply continuous jet force (reduced to 5% increase)
            this.velocity.x += this.jetDirection.x * this.jetPower * 0.21; // 5% increase from 0.2 (reduced from 10%)
            this.velocity.y += this.jetDirection.y * this.jetPower * 0.21;
        }
        
        if (this.jetCooldown > 0) {
            this.jetCooldown--;
        }
        
        // Update mantle contraction
        if (this.mantle.contracted) {
            this.mantle.contractTime--;
            if (this.mantle.contractTime <= 0) {
                this.mantle.contracted = false;
            }
        }
        
        // Update fin and tentacle animation
        this.finUndulation += 0.1;
        this.tentaclePulse += 0.05;
        
        // Update bioluminescent blinking
        this.blinkTimer++;
        if (this.blinkTimer >= this.blinkCycle) {
            this.blinkTimer = 0; // Reset timer
        }
        
        // Behavioral state machine
        switch (this.state) {
            case 'patrolling':
                this.patrolBehavior(fish, predators);
                break;
            case 'hunting':
                this.huntBehavior(fish, predators);
                break;
            case 'attacking':
                this.attackBehavior(fish, predators);
                break;
            case 'retreating':
                this.retreatBehavior();
                break;
        }
        
        // Maintain depth preference
        this.maintainDepth();
        
        // Apply drag (squids are not as streamlined as fish) - balanced drag
        this.velocity.x *= 0.94; // Balanced drag (was 0.96)
        this.velocity.y *= 0.94;
        
        // Calculate current speed for animation
        this.currentSpeed = Math.hypot(this.velocity.x, this.velocity.y);
        
        // Limit velocity
        Utils.limitVelocity(this.velocity, this.maxSpeed);
        
        this.move();
        this.edges();
    }
    
    patrolBehavior(fish, predators) {
        // Slow, energy-efficient movement
        if (this.stateTimer % 60 === 0) { // Every 2 seconds
            // Random gentle movement
            const direction = {
                x: (Math.random() - 0.5) * 0.5,
                y: (Math.random() - 0.5) * 0.3
            };
            this.finPropulsion(direction, 0.3);
        }
        
        // Scan for prey
        const prey = this.scanForPrey(predators, fish);
        if (prey) {
            this.huntTarget = prey;
            this.state = 'hunting';
            this.stateTimer = 0;
        }
        
        // Change to hunting state periodically
        if (this.stateTimer > 300 + Math.random() * 300) {
            this.state = 'hunting';
            this.stateTimer = 0;
        }
    }
    
    huntBehavior(fish, predators) {
        if (!this.huntTarget) {
            this.huntTarget = this.scanForPrey(predators, fish);
        }
        
                 if (this.huntTarget) {
             const dist = distance(this, this.huntTarget);
             
             if (dist < this.attackRange) {
                 this.state = 'attacking';
                 this.stateTimer = 0;
                 return;
             }
             
             // Approach using jet propulsion
             const direction = normalize({
                 x: this.huntTarget.x - this.x,
                 y: this.huntTarget.y - this.y
             });
             
             // Use powerful jet for attack approach
             if (this.jetCooldown <= 0 && dist > 400) { // 5x larger (was 80)
                 this.jet(direction, 0.8);
             } else {
                 // Use fins for fine positioning
                 this.finPropulsion(direction, 0.6);
             }
        } else {
            // No target found, return to patrolling
            this.state = 'patrolling';
            this.stateTimer = 0;
        }
        
        // Timeout hunting
        if (this.stateTimer > 200) {
            this.state = 'patrolling';
            this.stateTimer = 0;
            this.huntTarget = null;
        }
    }
    
    attackBehavior(fish, predators) {
                 if (this.huntTarget) {
             const dist = distance(this, this.huntTarget);
             
             if (dist < 220) { // 10% increase from 200 (was 40 originally)
                // Check eating cooldown before grabbing prey
                const currentTime = Date.now();
                if (currentTime - this.lastEatTime < this.eatCooldown) {
                    // Still in cooldown, retreat
                    this.state = 'retreating';
                    this.stateTimer = 0;
                    this.huntTarget = null;
                    return;
                }
                
                // Successful attack - grab prey
                this.grabbedPrey = this.huntTarget;
                
                // Remove prey from arrays
                let preyIndex = predators.indexOf(this.huntTarget);
                if (preyIndex !== -1) {
                    predators.splice(preyIndex, 1);
                } else {
                    preyIndex = fish.indexOf(this.huntTarget);
                    if (preyIndex !== -1) {
                        fish.splice(preyIndex, 1);
                    }
                }
                
                // Create dramatic capture effect - scaled for larger squid
                for (let i = 0; i < 20; i++) { // More bubbles for larger squid
                    ObjectPools.getEatingBubble(
                        this.x + (Math.random() - 0.5) * 250, // 5x larger spread (was 50)
                        this.y + (Math.random() - 0.5) * 250
                    );
                }
                
                this.state = 'retreating';
                this.stateTimer = 0;
                this.huntTarget = null;
                
                // Powerful escape jet
                const escapeDirection = {
                    x: (Math.random() - 0.5),
                    y: 0.8 // Dive down
                };
                                 this.jet(normalize(escapeDirection), 1.0);
                
            } else {
                                 // Final attack approach
                 const direction = normalize({
                     x: this.huntTarget.x - this.x,
                     y: this.huntTarget.y - this.y
                 });
                
                // Tentacle strike
                this.tentacleAdjust(direction, 0.8);
                
                // Timeout attack
                if (this.stateTimer > 60) {
                    this.state = 'hunting';
                    this.stateTimer = 0;
                }
            }
        } else {
            this.state = 'patrolling';
            this.stateTimer = 0;
        }
    }
    
    retreatBehavior() {
        // Consume prey and rest
        if (this.grabbedPrey) {
            // Consumption complete after 3 seconds
            if (this.stateTimer > 180) {
                // Create large poop (100% of the time when eating tuna)
                gameEntities.poop.push(new Poop(this.x, this.y, 'squid'));
                this.lastEatTime = Date.now();
                this.lastPoopTime = Date.now(); // Track when we pooped
                
                // Final consumption bubbles - scaled for larger squid
                for (let i = 0; i < 15; i++) { // More bubbles for larger squid
                    ObjectPools.getEatingBubble(
                        this.x + (Math.random() - 0.5) * 300, // 5x larger spread (was 60)
                        this.y + (Math.random() - 0.5) * 300
                    );
                }
                
                this.grabbedPrey = null;
                this.state = 'patrolling';
                this.stateTimer = 0;
            }
        } else {
            // Just retreating without prey
            if (this.stateTimer > 120) {
                this.state = 'patrolling';
                this.stateTimer = 0;
            }
        }
        
        // Gentle settling movement
        if (this.stateTimer % 30 === 0) {
            const settleDirection = {
                x: (Math.random() - 0.5) * 0.2,
                y: 0.1
            };
            this.finPropulsion(settleDirection, 0.2);
        }
    }
    
    edges() {
        Utils.handleEdges(this, 200, 0.6); // 5x larger edge buffer (was 40)
    }
    
    draw() {
        if (Utils.inRenderDistance(this)) {
            // Choose sprite based on movement state
            let sprite, abyssalSprite;
            const isBlinking = this.blinkTimer < this.blinkDuration; // Blink for first part of cycle
            
            if (this.mantle.contracted || this.jetDuration > 0) {
                sprite = sprites.giantSquid2; // Contracted mantle during jetting
                // Alternate between normal and blinking bioluminescent sprites
                abyssalSprite = isBlinking ? sprites.abyssalSquid2Blink : sprites.abyssalSquid2;
            } else {
                sprite = sprites.giantSquid1; // Relaxed mantle
                // Alternate between normal and blinking bioluminescent sprites
                abyssalSprite = isBlinking ? sprites.abyssalSquid1Blink : sprites.abyssalSquid1;
            }
            
            // Calculate angle based on movement direction
            let angle = 0;
            if (this.currentSpeed > 0.5) {
                angle = Math.atan2(this.velocity.y, this.velocity.x) * 0.3;
            }
            
            // Apply full water shader effect
            const baseOpacity = Utils.getDepthOpacity(this.y, 1.0);
            const reducedOpacity = baseOpacity * this.depthOpacityMultiplier + (1 - this.depthOpacityMultiplier);
            
            // Draw base squid sprite
            this.drawSprite(sprite, this.size, reducedOpacity, angle);
            
            // Check if in deep waters (70%+ depth) and overlay bioluminescent sprites
            const depthFactor = Utils.getDepthFactor(this.y);
            if (depthFactor >= 0.7) { // In deep waters or abyssal zone
                let bioIntensity;
                
                if (depthFactor >= 0.8) {
                    // Abyssal zone (80-100%): Full intensity bioluminescence
                    const abyssalProgress = (depthFactor - 0.8) / 0.2; // 0 to 1 in abyssal zone
                    bioIntensity = 0.3 + (abyssalProgress * 0.4); // 0.3 to 0.7 opacity
                } else {
                    // Faint tier (70-80%): Progressive bioluminescence activation
                    const faintProgress = (depthFactor - 0.7) / 0.1; // 0 to 1 in faint zone
                    bioIntensity = 0.1 + (faintProgress * 0.2); // 0.1 to 0.3 opacity
                }
                
                // Full brightness for abyssal sprites - no depth shader tint
                const spotReducedOpacity = 1.0; // Maximum opacity, no depth effects
                
                // Draw bioluminescent overlay with additive blending for glow effect
                ctx.save();
                ctx.globalCompositeOperation = 'screen'; // Additive blending for glow
                this.drawSprite(abyssalSprite, this.size, spotReducedOpacity, angle);
                ctx.restore();
            }
            
            // Draw grabbed prey if consuming - scaled for larger squid
            if (this.grabbedPrey && this.state === 'retreating') {
                const preySprite = sprites[this.grabbedPrey.tunaType] || sprites.smallFry2;
                const preyX = this.x + Math.cos(this.tentaclePulse) * 75; // 5x larger (was 15)
                const preyY = this.y + Math.sin(this.tentaclePulse) * 50; // 5x larger (was 10)
                
                ctx.save();
                ctx.globalAlpha = reducedOpacity * 0.7;
                ctx.translate(preyX, preyY);
                ctx.rotate(angle * 0.5);
                ctx.drawImage(preySprite, -this.grabbedPrey.size/2, -this.grabbedPrey.size/2, 
                             this.grabbedPrey.size, this.grabbedPrey.size);
                ctx.restore();
            }
        }
    }
}

// Heavily optimized Boid class
class Boid extends Entity {
    constructor(fishType = FISH_TYPES.SMALL_FRY_2) {
        // Spawn fish in their preferred habitat zones
        let spawnZone;
        switch (fishType) {
            case FISH_TYPES.SMALL_FRY_2:
            case FISH_TYPES.SMALL_FRY_4:
                spawnZone = 'surface'; // Surface dwellers (0-20%)
                break;
            case FISH_TYPES.SMALL_FRY_3:
                spawnZone = 'mid'; // Mid-water dwellers (20-60%)
                break;
            case FISH_TYPES.KRILL:
                spawnZone = 'deep'; // Mid-to-deep waters (40-80%)
                break;
            default:
                spawnZone = 'shallow'; // Default to shallow water
        }
        
        super(null, null, spawnZone);
        
        this.fishType = fishType;
        this.setupFishProperties();
        this.maxForce = 0.05;
        this.fearRadiusSquared = CONSTANTS.FEAR_RADIUS * CONSTANTS.FEAR_RADIUS;
        this.foodEaten = 0; // Track food consumption for pooping
        this.lastPoopTime = 0; // Track when fish last pooped to prevent infinite pooping
        this.poopCooldown = 5000; // 5 second minimum cooldown between poops
        this.lastEatTime = 0; // Track when fish last ate
        this.eatCooldown = 5000; // 5 second cooldown between eating for fry
        this.poopIgnoreDuration = 3000; // 3 seconds to ignore fish food and krill after pooping
        
        // All fry types can hunt krill (different hunt ranges)
        if (fishType === FISH_TYPES.SMALL_FRY_3) {
            this.huntRadius = 60; // Largest hunt range
            this.huntRadiusSquared = this.huntRadius * this.huntRadius;
            this.eatRadius = 15;
            this.eatRadiusSquared = this.eatRadius * this.eatRadius;
        } else if (fishType === FISH_TYPES.SMALL_FRY_2) {
            this.huntRadius = 40; // Smaller hunt range for smaller fish
            this.huntRadiusSquared = this.huntRadius * this.huntRadius;
            this.eatRadius = 12;
            this.eatRadiusSquared = this.eatRadius * this.eatRadius;
        } else if (fishType === FISH_TYPES.SMALL_FRY_4) {
            this.huntRadius = 50; // Medium hunt range
            this.huntRadiusSquared = this.huntRadius * this.huntRadius;
            this.eatRadius = 14;
            this.eatRadiusSquared = this.eatRadius * this.eatRadius;
        }
    }
    
    setupFishProperties() {
        const configs = {
            [FISH_TYPES.SMALL_FRY_4]: { size: 28, maxSpeed: 3.2 },
            [FISH_TYPES.SMALL_FRY_3]: { size: 32, maxSpeed: 2.8 },
            [FISH_TYPES.SMALL_FRY_2]: { size: 35, maxSpeed: 3.0 }
        };
        
        const config = configs[this.fishType] || configs[FISH_TYPES.SMALL_FRY_2];
        this.size = config.size;
        this.maxSpeed = config.maxSpeed;
    }

    edges() {
        Utils.handleEdges(this, 20, 0.8);
    }

    // Optimized flocking with spatial awareness
    flock(boids, predators, food, krill = []) {
        const perceptionRadiusSquared = CONSTANTS.PERCEPTION_RADIUS * CONSTANTS.PERCEPTION_RADIUS;
        const separationRadiusSquared = CONSTANTS.SEPARATION_RADIUS * CONSTANTS.SEPARATION_RADIUS;
        
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let separation = { x: 0, y: 0 };
        let alignCount = 0, cohesionCount = 0, separationCount = 0;
        
        // Single pass through nearby boids
        for (let other of boids) {
            if (other === this) continue;
            
            const distSquared = Utils.distanceSquared(this, other);
            
            if (distSquared < perceptionRadiusSquared) {
                alignment.x += other.velocity.x;
                alignment.y += other.velocity.y;
                alignCount++;
                
                cohesion.x += other.x;
                cohesion.y += other.y;
                cohesionCount++;
            }
            
            if (distSquared < separationRadiusSquared) {
                const dist = Math.sqrt(distSquared);
                const diff = { x: (this.x - other.x) / dist, y: (this.y - other.y) / dist };
                separation.x += diff.x;
                separation.y += diff.y;
                separationCount++;
            }
        }
        
        // Calculate steering forces
        const forces = { x: 0, y: 0 };
        
        if (alignCount > 0) {
            alignment.x /= alignCount;
            alignment.y /= alignCount;
            const alignSteering = Utils.calculateSteering({ x: 0, y: 0, velocity: this.velocity }, alignment, this.maxSpeed, this.maxForce);
            forces.x += alignSteering.x;
            forces.y += alignSteering.y;
        }
        
        if (cohesionCount > 0) {
            cohesion.x = (cohesion.x / cohesionCount) - this.x;
            cohesion.y = (cohesion.y / cohesionCount) - this.y;
            const cohesionSteering = Utils.calculateSteering({ x: 0, y: 0, velocity: this.velocity }, cohesion, this.maxSpeed, this.maxForce);
            forces.x += cohesionSteering.x;
            forces.y += cohesionSteering.y;
        }
        
        if (separationCount > 0) {
            separation.x /= separationCount;
            separation.y /= separationCount;
            const separationSteering = Utils.calculateSteering({ x: 0, y: 0, velocity: this.velocity }, separation, this.maxSpeed, this.maxForce);
            forces.x += separationSteering.x * 1.5;
            forces.y += separationSteering.y * 1.5;
        }
        
        // Flee from predators
        this.addFleeForce(forces, predators, boids);
        
        // Seek food
        this.addSeekForce(forces, food);
        
        // Hunt smaller fish and krill (all fry types can hunt krill)
        if (this.fishType === FISH_TYPES.SMALL_FRY_3 || 
            this.fishType === FISH_TYPES.SMALL_FRY_2 || 
            this.fishType === FISH_TYPES.SMALL_FRY_4) {
            this.addHuntForce(forces, boids, krill);
        }
        
        // Add depth preference for smallFry fish (prefer upper areas)
        this.addDepthPreference(forces);
        
        // Apply forces
        this.velocity.x += forces.x;
        this.velocity.y += forces.y;
        Utils.limitVelocity(this.velocity, this.maxSpeed);
    }
    
    addFleeForce(forces, predators, boids) {
        let fleeX = 0, fleeY = 0, fleeCount = 0;
        
        // Flee from tuna
        for (let predator of predators) {
            if (Utils.shouldFlee(this.fishType, predator.tunaType)) {
                const distSquared = Utils.distanceSquared(this, predator);
                if (distSquared < this.fearRadiusSquared) {
                    const dist = Math.sqrt(distSquared);
                    fleeX += (this.x - predator.x) / dist;
                    fleeY += (this.y - predator.y) / dist;
                    fleeCount++;
                }
            }
        }
        
        // Flee from smallFry3
        if (this.fishType === FISH_TYPES.SMALL_FRY_2) {
            for (let fish of boids) {
                if (fish.fishType === FISH_TYPES.SMALL_FRY_3) {
                    const distSquared = Utils.distanceSquared(this, fish);
                    if (distSquared < this.fearRadiusSquared) {
                        const dist = Math.sqrt(distSquared);
                        fleeX += (this.x - fish.x) / dist;
                        fleeY += (this.y - fish.y) / dist;
                        fleeCount++;
                    }
                }
            }
        }
        
        if (fleeCount > 0) {
            const fleeTarget = { x: fleeX / fleeCount, y: fleeY / fleeCount };
            const fleeSteering = Utils.calculateSteering({ x: 0, y: 0, velocity: this.velocity }, fleeTarget, this.maxSpeed, this.maxForce);
            forces.x += fleeSteering.x * 3;
            forces.y += fleeSteering.y * 3;
        }
    }
    
    addSeekForce(forces, food) {
        // Check if fry should ignore fish food after pooping
        const currentTime = Date.now();
        const shouldIgnoreFood = (currentTime - this.lastPoopTime) < this.poopIgnoreDuration;
        
        if (shouldIgnoreFood) {
            return; // Skip food seeking if we recently pooped
        }
        
        let closest = null;
        let closestDistSquared = CONSTANTS.FOOD_ATTRACTION_RADIUS * CONSTANTS.FOOD_ATTRACTION_RADIUS;
        
        for (let piece of food) {
            if (!piece.eaten) {
                const distSquared = Utils.distanceSquared(this, piece);
                if (distSquared < closestDistSquared) {
                    closest = piece;
                    closestDistSquared = distSquared;
                }
            }
        }
        
        if (closest) {
            const seekSteering = Utils.calculateSteering(this, closest, this.maxSpeed, this.maxForce);
            forces.x += seekSteering.x * 2;
            forces.y += seekSteering.y * 2;
        }
    }
    
    addHuntForce(forces, boids, krill = []) {
        // Check if fry should ignore krill after pooping
        const currentTime = Date.now();
        const shouldIgnoreKrill = (currentTime - this.lastPoopTime) < this.poopIgnoreDuration;
        
        let closest = null;
        let closestDistSquared = this.huntRadiusSquared;
        
        // Only SmallFry3 hunts other fish (SmallFry2)
        if (this.fishType === FISH_TYPES.SMALL_FRY_3) {
            for (let fish of boids) {
                if (fish.fishType === FISH_TYPES.SMALL_FRY_2) {
                    const distSquared = Utils.distanceSquared(this, fish);
                    if (distSquared < closestDistSquared) {
                        closest = fish;
                        closestDistSquared = distSquared;
                    }
                }
            }
        }
        
        // All fry types hunt krill (prioritize krill over fish) - unless we recently pooped
        if (!shouldIgnoreKrill) {
            for (let krillEntity of krill) {
                const distSquared = Utils.distanceSquared(this, krillEntity);
                // Give krill hunting slight priority by expanding search radius
                const krillHuntRadius = this.huntRadiusSquared * 1.2;
                if (distSquared < krillHuntRadius) {
                    closest = krillEntity;
                    closestDistSquared = distSquared;
                    break; // Prefer krill over fish
                }
            }
        }
        
        if (closest) {
            // Adjust hunting intensity based on fish type
            let huntStrength = 2.5;
            if (this.fishType === FISH_TYPES.SMALL_FRY_2) {
                huntStrength = 2.0; // Smaller fish hunt less aggressively
            } else if (this.fishType === FISH_TYPES.SMALL_FRY_4) {
                huntStrength = 2.2; // Medium aggression
            }
            
            const huntSteering = Utils.calculateSteering(this, closest, this.maxSpeed, this.maxForce);
            forces.x += huntSteering.x * huntStrength;
            forces.y += huntSteering.y * huntStrength;
        }
    }
    
    addDepthPreference(forces) {
        // SmallFry2 & SmallFry4 prefer surface layer (0-20%)
        if (this.fishType === FISH_TYPES.SMALL_FRY_2 || this.fishType === FISH_TYPES.SMALL_FRY_4) {
            const preferredDepth = WORLD_HEIGHT * 0.2; // Stay in surface layer (0-20%)
            const currentDepth = this.y;
            
            if (currentDepth > preferredDepth) {
                const depthDifference = currentDepth - preferredDepth;
                const maxDepthForce = WORLD_HEIGHT * 0.8; // Maximum depth difference for full force
                const forceStrength = Math.min(depthDifference / maxDepthForce, 1.0);
                
                // Apply strong upward force to stay in surface
                forces.y -= forceStrength * this.maxForce * 4.0;
            }
        }
        
        // SmallFry3 prefers mid-water zone (20-60%)
        if (this.fishType === FISH_TYPES.SMALL_FRY_3) {
            const preferredDepth = WORLD_HEIGHT * 0.6; // Stay above deep zone (prefer top 60%)
            const currentDepth = this.y;
            
            if (currentDepth > preferredDepth) {
                const depthDifference = currentDepth - preferredDepth;
                const maxDepthForce = WORLD_HEIGHT * 0.4;
                const forceStrength = Math.min(depthDifference / maxDepthForce, 1.0);
                
                // Apply moderate upward force to stay in mid-water
                forces.y -= forceStrength * this.maxForce * 2.0;
            }
        }
    }

    checkForSmallerFish(boids, krill = [], poop = []) {
        // All fry types can eat krill and poop (no cannibalism)
        if (this.fishType !== FISH_TYPES.SMALL_FRY_2 && 
            this.fishType !== FISH_TYPES.SMALL_FRY_3 && 
            this.fishType !== FISH_TYPES.SMALL_FRY_4) return;
        
        // Check eating cooldown
        const currentTime = Date.now();
        if (currentTime - this.lastEatTime < this.eatCooldown) return;
        
        // Eat krill (different poop chances for different krill types)
        // We need to check each krill type array separately to properly remove eaten krill
        
        // Check regular krill
        for (let i = gameEntities.krill.length - 1; i >= 0; i--) {
            if (Utils.distanceSquared(this, gameEntities.krill[i]) < this.eatRadiusSquared) {
                const krillEaten = gameEntities.krill[i];
                
                // Reduced bubble effect for krill (prevent lag)
                if (Math.random() < 0.6) { // Only 60% chance of bubbles
                    ObjectPools.getEatingBubble(krillEaten.x, krillEaten.y);
                }
                
                // 50% poop chance for regular krill
                if (Math.random() < 0.5) {
                    gameEntities.poop.push(new Poop(this.x, this.y));
                    this.lastPoopTime = currentTime; // Track when we pooped
                }
                
                gameEntities.krill.splice(i, 1);
                this.lastEatTime = currentTime;
                break; // Only eat one per frame
            }
        }
        
        // Check pale krill
        for (let i = gameEntities.paleKrill.length - 1; i >= 0; i--) {
            if (Utils.distanceSquared(this, gameEntities.paleKrill[i]) < this.eatRadiusSquared) {
                const krillEaten = gameEntities.paleKrill[i];
                
                // Reduced bubble effect for krill (prevent lag)
                if (Math.random() < 0.6) { // Only 60% chance of bubbles
                    ObjectPools.getEatingBubble(krillEaten.x, krillEaten.y);
                }
                
                // 25% poop chance for pale krill (less nutritious)
                if (Math.random() < 0.25) {
                    gameEntities.poop.push(new Poop(this.x, this.y));
                    this.lastPoopTime = currentTime; // Track when we pooped
                }
                
                gameEntities.paleKrill.splice(i, 1);
                this.lastEatTime = currentTime;
                break; // Only eat one per frame
            }
        }
        
        // Check mom krill
        for (let i = gameEntities.momKrill.length - 1; i >= 0; i--) {
            if (Utils.distanceSquared(this, gameEntities.momKrill[i]) < this.eatRadiusSquared) {
                const krillEaten = gameEntities.momKrill[i];
                
                // Reduced bubble effect for krill (prevent lag)
                if (Math.random() < 0.6) { // Only 60% chance of bubbles
                    ObjectPools.getEatingBubble(krillEaten.x, krillEaten.y);
                }
                
                // 50% poop chance for mom krill (same as regular)
                if (Math.random() < 0.5) {
                    gameEntities.poop.push(new Poop(this.x, this.y));
                    this.lastPoopTime = currentTime; // Track when we pooped
                }
                
                gameEntities.momKrill.splice(i, 1);
                this.lastEatTime = currentTime;
                break; // Only eat one per frame
            }
        }
        
        // Eat poop (only poop2 - aged poop, not fresh fry poop)
        for (let i = poop.length - 1; i >= 0; i--) {
            const poopItem = poop[i];
            // Fry can only eat poop2 (aged poop), not fresh poop (state 1)
            if (poopItem.isActive && poopItem.state === 2 && Utils.distanceSquared(this, poopItem) < this.eatRadiusSquared) {
                // Reduced bubble effect for eating poop (prevent lag)
                if (Math.random() < 0.5) { // Only 50% chance of bubbles
                    ObjectPools.getEatingBubble(poopItem.x, poopItem.y);
                }
                
                // Gain nutrition based on poop feed value
                this.foodEaten += poopItem.feedValue;
                
                // Create new poop after eating enough (based on feed value) WITH COOLDOWN
                const poopThreshold = poopItem.type === 'tuna' ? 8 : 12; // Increased thresholds to reduce frequency
                const currentTime = Date.now();
                
                if (this.foodEaten >= poopThreshold && (currentTime - this.lastPoopTime) > this.poopCooldown) {
                    gameEntities.poop.push(new Poop(this.x, this.y));
                    this.foodEaten = 0;
                    this.lastPoopTime = currentTime; // Track when we pooped (for both cooldown and ignore duration)
                }
                
                poop.splice(i, 1);
                break; // Only eat one per frame
            }
        }
    }

    update(boids, predators, food, krill, poop) {
        this.flock(boids, predators, food, krill);
        this.move();
        this.edges();
        this.checkForSmallerFish(boids, krill, poop);
    }

    draw() {
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.5;
        this.drawSprite(sprites[this.fishType], this.size, 0.9, angle);
    }
}

// Specialized Krill class - poop-eating mid-to-deep water dwellers with surface migration
class Krill extends Boid {
    constructor() {
        super(FISH_TYPES.KRILL);
        
        // Krill-specific properties
        this.krillSize = 9; // Reduced to match mom krill size
        this.size = this.krillSize;
        this.maxSpeed = 1.8; // Slower, more gentle movement
        this.maxForce = 0.025; // Much lower force for calmer behavior
        this.eatRadius = 20; // Can eat poop from a distance
        this.eatRadiusSquared = this.eatRadius * this.eatRadius;
        
        // Animation system for krill
        this.animationFrame = 0;
        this.animationSpeed = 0.1;
        this.spriteFrames = ['krill1', 'krill2', 'krill3', 'krill2']; // Cycle animation
        
        // Migration behavior (much less frequent)
        this.migrationTimer = Math.random() * 200000; // Random start time (very long)
        this.migrationCycle = 300000; // 5 minute migration cycle (much longer)
        this.isMigrating = false;
        this.migrationDirection = 1; // 1 = up to surface, -1 = down to deep
        this.restPeriod = true; // Most time spent resting
        
        // Spawning override - spawn in mid-to-deep waters
        const spawnDepth = 0.4 + Math.random() * 0.4; // 40%-80% depth
        this.y = WORLD_HEIGHT * spawnDepth;
        
        // Poop consumption tracking
        this.poopEaten = 0;
        this.nutritionLevel = 0.5; // Affects speed and behavior
        this.foodValue = 0; // Track total food value consumed
        this.canTransform = true; // Can transform to mom krill
    }
    
    setupFishProperties() {
        // Override parent method - krill have their own properties
        this.size = this.krillSize;
        this.maxSpeed = 2.5 + (this.nutritionLevel * 0.5); // Speed varies with nutrition
    }
    
    // Krill-specific flocking that includes poop seeking
    flock(boids, predators, food, poop) {
        // Use parent flocking as base
        super.flock(boids, predators, food, poop);
        
        // Add poop-seeking behavior
        this.addPoopSeekForce(poop);
        
        // Add migration behavior
        this.addMigrationForce();
    }
    
    addPoopSeekForce(poopArray) {
        let closest = null;
        let closestDistSquared = this.eatRadiusSquared * 4; // Wider search radius for poop
        
        for (let poop of poopArray) {
            // Only seek poop in states 2 and 3 (aged and deep water)
            if (poop.isActive && poop.state >= 2) {
                const distSquared = Utils.distanceSquared(this, poop);
                if (distSquared < closestDistSquared) {
                    closest = poop;
                    closestDistSquared = distSquared;
                }
            }
        }
        
        if (closest) {
            const seekSteering = Utils.calculateSteering(this, closest, this.maxSpeed, this.maxForce);
            this.velocity.x += seekSteering.x * 1.5; // Moderate attraction to poop
            this.velocity.y += seekSteering.y * 1.5;
        }
    }
    
    addMigrationForce() {
        this.migrationTimer += 16; // Approximate frame time
        
        // Determine migration phase (much shorter active periods)
        const cyclePosition = (this.migrationTimer % this.migrationCycle) / this.migrationCycle;
        
        if (cyclePosition > 0.3 && cyclePosition < 0.35) {
            // Brief upward migration (only 5% of cycle)
            this.isMigrating = true;
            this.restPeriod = false;
            this.migrationDirection = -1;
            
            const surfaceTarget = WORLD_HEIGHT * 0.15; // Don't go too shallow
            if (this.y > surfaceTarget) {
                const migrationForce = (this.y - surfaceTarget) / (WORLD_HEIGHT * 0.6);
                this.velocity.y -= migrationForce * this.maxForce * 1.5; // Much weaker force
            }
        } else if (cyclePosition > 0.7 && cyclePosition < 0.75) {
            // Brief downward migration (only 5% of cycle)
            this.isMigrating = true;
            this.restPeriod = false;
            this.migrationDirection = 1;
            
            const deepTarget = WORLD_HEIGHT * 0.7; // Target deeper waters
            if (this.y < deepTarget) {
                const migrationForce = (deepTarget - this.y) / (WORLD_HEIGHT * 0.6);
                this.velocity.y += migrationForce * this.maxForce * 1.2; // Weaker force
            }
        } else {
            // Rest phase: 90% of the time - minimal depth adjustment
            this.isMigrating = false;
            this.restPeriod = true;
            
            const preferredDepthMin = WORLD_HEIGHT * 0.45; // Narrower preferred zone
            const preferredDepthMax = WORLD_HEIGHT * 0.65;
            
            // Very weak depth preference during rest
            if (this.y < preferredDepthMin) {
                const depthForce = (preferredDepthMin - this.y) / (WORLD_HEIGHT * 0.8);
                this.velocity.y += depthForce * this.maxForce * 0.3; // Very weak force
            } else if (this.y > preferredDepthMax) {
                const depthForce = (this.y - preferredDepthMax) / (WORLD_HEIGHT * 0.8);
                this.velocity.y -= depthForce * this.maxForce * 0.3; // Very weak force
            }
        }
    }
    
    // Krill don't flee from as many predators (they're often too small to be worth hunting)
    addFleeForce(forces, predators, boids) {
        let fleeX = 0, fleeY = 0, fleeCount = 0;
        
        // Only flee from tuna (not from other small fish)
        for (let predator of predators) {
            const distSquared = Utils.distanceSquared(this, predator);
            if (distSquared < this.fearRadiusSquared * 0.7) { // Smaller fear radius
                const dist = Math.sqrt(distSquared);
                fleeX += (this.x - predator.x) / dist;
                fleeY += (this.y - predator.y) / dist;
                fleeCount++;
            }
        }
        
        if (fleeCount > 0) {
            const fleeTarget = { x: fleeX / fleeCount, y: fleeY / fleeCount };
            const fleeSteering = Utils.calculateSteering({ x: 0, y: 0, velocity: this.velocity }, fleeTarget, this.maxSpeed, this.maxForce);
            forces.x += fleeSteering.x * 2; // Less panic than other fish
            forces.y += fleeSteering.y * 2;
        }
    }
    
    // Check for poop consumption (only states 2 and 3)
    checkForPoop(poopArray) {
        for (let i = poopArray.length - 1; i >= 0; i--) {
            const poop = poopArray[i];
            // Krill can only eat poop in states 2 and 3 (not fresh poop)
            if (poop.isActive && poop.state >= 2 && Utils.distanceSquared(this, poop) < this.eatRadiusSquared) {
                // Eat the poop
                this.poopEaten++;
                // More nutrition from tuna poop
                const nutritionGain = poop.type === 'tuna' ? 0.15 : 0.1;
                this.nutritionLevel = Math.min(1.0, this.nutritionLevel + nutritionGain);
                
                // Track food value for reproduction (tuna=2, fry=1, others=1)
                const foodValue = poop.type === 'tuna' ? 2 : 1; // Tuna poop worth 2, fry/regular poop worth 1
                this.foodConsumed = (this.foodConsumed || 0) + foodValue;
                
                // Reduced bubbles when krill eat poop (prevent lag)
                if (Math.random() < 0.4) { // Only 40% chance of bubbles
                    ObjectPools.getEatingBubble(poop.x, poop.y);
                }
                
                // Remove the poop
                poopArray.splice(i, 1);
                break; // Only eat one poop per frame
            }
        }
        
        // Nutrition decays slowly over time
        this.nutritionLevel = Math.max(0.2, this.nutritionLevel - 0.001);
    }
    
    // Handle food consumption from fish food
    checkFoodConsumption(foodValue) {
        this.foodConsumed = (this.foodConsumed || 0) + foodValue;
        this.nutritionLevel = Math.min(1.0, this.nutritionLevel + 0.1);
    }
    
    // Check if krill should transform into mom krill
    checkReproduction() {
        if ((this.foodConsumed || 0) >= 5) {
            // Transform into mom krill
            return {
                shouldTransform: true,
                newType: 'mom',
                x: this.x,
                y: this.y,
                velocity: { x: this.velocity.x, y: this.velocity.y }
            };
        }
        return { shouldTransform: false };
    }
    
    update(boids, predators, food, poop) {
        // Update animation
        this.animationFrame += this.animationSpeed;
        if (this.animationFrame >= this.spriteFrames.length) {
            this.animationFrame = 0;
        }
        
        // Standard boid update with poop parameter
        this.flock(boids, predators, food, poop);
        this.move();
        this.edges();
        this.checkForPoop(poop);
        
        // Update speed based on nutrition
        this.setupFishProperties();
    }
    
    draw() {
        if (!Utils.inRenderDistance(this)) return;
        
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.3;
        
        // Get current animation frame
        const currentSpriteKey = this.spriteFrames[Math.floor(this.animationFrame)];
        
        // Adjust opacity based on migration status
        const migrationOpacity = this.isMigrating ? 0.95 : 0.85;
        
        // Apply 50% deep water shader effect
        let depthOpacity = Utils.getDepthOpacity(this.y, migrationOpacity);
        let tintStrength = Utils.getDepthTint(this.y);
        
        // Reduce depth shader effect by 50% for krill
        depthOpacity = migrationOpacity * 0.5 + depthOpacity * 0.5;
        tintStrength *= 0.5;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        if (tintStrength > 0) {
            // Create temporary canvas for tinting
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.size;
            tempCanvas.height = this.size;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(sprites[currentSpriteKey], 0, 0, this.size, this.size);
            
            // Apply tint
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, this.size, this.size);
            
            // Draw tinted sprite
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -this.size/2, -this.size/2);
        } else {
            // Draw normally with depth opacity
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(sprites[currentSpriteKey], -this.size/2, -this.size/2, this.size, this.size);
        }
        
        ctx.restore();
    }
}

// Pale Krill - smaller, faster, juvenile form that matures into regular krill
class PaleKrill extends Krill {
    constructor(x, y, velocity = null) {
        super();
        
        // Override krill properties for pale krill
        this.krillSize = 7; // Increased by 2px (was 5, now 7)
        this.size = this.krillSize;
        this.maxSpeed = 2.8; // Faster than regular krill (1.8)
        this.maxForce = 0.035; // Slightly higher force for more agile movement
        
        // Pale krill specific properties
        this.maturationTimer = 0;
        this.maturationTime = 60000; // 1 minute in milliseconds
        this.isMaturing = false;
        
        // Use pale krill sprites
        this.spriteFrames = ['paleKrill1', 'paleKrill2', 'paleKrill3', 'paleKrill2'];
        
        // Set position and velocity if provided
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        }
        if (velocity) {
            this.velocity.x = velocity.x;
            this.velocity.y = velocity.y;
        }
        
        // Reset food consumption
        this.foodConsumed = 0;
    }
    
    update(boids, predators, food, poop) {
        // Update maturation timer
        this.maturationTimer += 16; // Approximate frame time
        
        // Check if ready to mature into regular krill
        if (this.maturationTimer >= this.maturationTime) {
            this.isMaturing = true;
        }
        
        // Standard krill update
        super.update(boids, predators, food, poop);
    }
    
    // Check if pale krill should transform into regular krill
    checkMaturation() {
        if (this.isMaturing) {
            return {
                shouldTransform: true,
                newType: 'regular',
                x: this.x,
                y: this.y,
                velocity: { x: this.velocity.x, y: this.velocity.y }
            };
        }
        return { shouldTransform: false };
    }
    
    draw() {
        if (!Utils.inRenderDistance(this)) return;
        
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.3;
        
        // Get current animation frame
        const currentSpriteKey = this.spriteFrames[Math.floor(this.animationFrame)];
        
        // Pale krill have slightly different opacity (more translucent)
        const paleOpacity = 0.75;
        
        // Apply 50% deep water shader effect
        let depthOpacity = Utils.getDepthOpacity(this.y, paleOpacity);
        let tintStrength = Utils.getDepthTint(this.y);
        
        // Reduce depth shader effect by 50% for krill
        depthOpacity = paleOpacity * 0.5 + depthOpacity * 0.5;
        tintStrength *= 0.5;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        if (tintStrength > 0) {
            // Create temporary canvas for tinting
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.size;
            tempCanvas.height = this.size;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(sprites[currentSpriteKey], 0, 0, this.size, this.size);
            
            // Apply tint
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, this.size, this.size);
            
            // Draw tinted sprite
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -this.size/2, -this.size/2);
        } else {
            // Draw normally with depth opacity
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(sprites[currentSpriteKey], -this.size/2, -this.size/2, this.size, this.size);
        }
        
        ctx.restore();
    }
}

// Mom Krill - larger, produces pale krill offspring
class MomKrill extends Krill {
    constructor(x, y, velocity = null) {
        super();
        
        // Override krill properties for mom krill
        this.krillSize = 9; // 4x smaller than current (was 36, now 9)
        this.size = this.krillSize;
        this.maxSpeed = 1.5; // Slower than regular krill (pregnancy effect)
        this.maxForce = 0.02; // Lower force (less agile when pregnant)
        
        // Mom krill specific properties
        this.reproductionTimer = 0;
        this.reproductionTime = 10000; // 10 seconds in milliseconds
        this.hasReproduced = false;
        this.offspringCount = Math.floor(Math.random() * 3) + 2; // 2-4 offspring
        this.batchesProduced = 0; // Track how many batches have been produced
        this.maxBatches = Math.floor(Math.random() * 2) + 1; // 1-2 batches before turning back
        this.shouldRevert = false; // Flag to indicate when mom should turn back to regular krill
        
        // Use mom krill sprites
        this.spriteFrames = ['momKrill1', 'momKrill2', 'momKrill3', 'momKrill2'];
        
        // Set position and velocity if provided
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        }
        if (velocity) {
            this.velocity.x = velocity.x;
            this.velocity.y = velocity.y;
        }
        
        // Reset food consumption
        this.foodConsumed = 0;
    }
    
    update(boids, predators, food, poop) {
        // Update reproduction timer
        if (!this.hasReproduced) {
            this.reproductionTimer += 16; // Approximate frame time
        }
        
        // Standard krill update
        super.update(boids, predators, food, poop);
    }
    
    // Check if mom krill should produce offspring
    checkOffspring() {
        if (!this.hasReproduced && this.reproductionTimer >= this.reproductionTime) {
            const offspring = [];
            
            for (let i = 0; i < this.offspringCount; i++) {
                // Spread offspring around the mom
                const angle = (Math.PI * 2 * i) / this.offspringCount + Math.random() * 0.5;
                const distance = 20 + Math.random() * 15;
                const offsetX = Math.cos(angle) * distance;
                const offsetY = Math.sin(angle) * distance;
                
                offspring.push({
                    x: this.x + offsetX,
                    y: this.y + offsetY,
                    velocity: {
                        x: this.velocity.x * 0.5 + (Math.random() - 0.5) * 0.5,
                        y: this.velocity.y * 0.5 + (Math.random() - 0.5) * 0.5
                    }
                });
            }
            
            this.hasReproduced = true;
            this.batchesProduced++;
            
            // Check if mom should revert after this batch
            if (this.batchesProduced >= this.maxBatches) {
                this.shouldRevert = true;
            } else {
                // Reset for next batch
                this.reproductionTimer = 0;
                this.hasReproduced = false;
                this.offspringCount = Math.floor(Math.random() * 3) + 2; // New offspring count for next batch
            }
            
            // Reduced birth effect bubbles (prevent lag)
            for (let i = 0; i < Math.min(this.offspringCount, 3); i++) {
                ObjectPools.getEatingBubble(
                    this.x + (Math.random() - 0.5) * 20,
                    this.y + (Math.random() - 0.5) * 20
                );
            }
            
            return {
                shouldProduce: true,
                offspring: offspring,
                shouldRevert: this.shouldRevert
            };
        }
        return { shouldProduce: false };
    }
    
    draw() {
        if (!Utils.inRenderDistance(this)) return;
        
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.3;
        
        // Get current animation frame
        const currentSpriteKey = this.spriteFrames[Math.floor(this.animationFrame)];
        
        // Mom krill have full opacity and slight glow effect when about to reproduce
        let momOpacity = 1.0;
        if (!this.hasReproduced && this.reproductionTimer > this.reproductionTime * 0.8) {
            // Slight pulsing when close to reproduction
            momOpacity = 0.9 + 0.1 * Math.sin(this.reproductionTimer * 0.01);
        }
        
        // Apply 50% deep water shader effect
        let depthOpacity = Utils.getDepthOpacity(this.y, momOpacity);
        let tintStrength = Utils.getDepthTint(this.y);
        
        // Reduce depth shader effect by 50% for krill
        depthOpacity = momOpacity * 0.5 + depthOpacity * 0.5;
        tintStrength *= 0.5;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        if (tintStrength > 0) {
            // Create temporary canvas for tinting
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.size;
            tempCanvas.height = this.size;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(sprites[currentSpriteKey], 0, 0, this.size, this.size);
            
            // Apply tint
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, this.size, this.size);
            
            // Draw tinted sprite
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -this.size/2, -this.size/2);
        } else {
            // Draw normally with depth opacity
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(sprites[currentSpriteKey], -this.size/2, -this.size/2, this.size, this.size);
        }
        
        ctx.restore();
    }
}

// Create optimized game entities with reduced counts for better performance
const gameEntities = {
    bubbles: Array.from({ length: 100 }, () => new Bubble()), // Reduced from 200
    fish: [
        ...Array.from({ length: 120 }, () => new Boid(FISH_TYPES.SMALL_FRY_2)), // Reduced from 250
        ...Array.from({ length: 80 }, () => new Boid(FISH_TYPES.SMALL_FRY_3)),  // Reduced from 150
        ...Array.from({ length: 60 }, () => new Boid(FISH_TYPES.SMALL_FRY_4))   // Reduced from 125
    ],
    predators: [
        ...Array.from({ length: 4 }, () => new Predator('tuna')),  // Reduced from 8
        ...Array.from({ length: 2 }, () => new Predator('tuna2')) // Reduced from 4
    ],
    krill: Array.from({ length: 160 }, () => new Krill()), // 80% regular krill (160 out of 200)
    paleKrill: Array.from({ length: 20 }, () => new PaleKrill(Math.random() * WORLD_WIDTH, Math.random() * WORLD_HEIGHT)), // 10% pale krill
    momKrill: Array.from({ length: 20 }, () => new MomKrill(Math.random() * WORLD_WIDTH, Math.random() * WORLD_HEIGHT)), // 10% mom krill
    squid: Array.from({ length: 3 }, () => new GiantSquid()), // Reduced to 3 giant squids on launch
    fishFood: [],
    poop: []
};



// Optimized spawning system
canvas.addEventListener('click', (event) => {
    if (gameState.spawnMode === 'off') return;
    
    const rect = canvas.getBoundingClientRect();
    const centerX = ((event.clientX - rect.left) / camera.zoom) + camera.x;
    const centerY = ((event.clientY - rect.top) / camera.zoom) + camera.y;
    
    if (gameState.spawnMode === 'food') {
        const foodCount = Math.floor(Math.random() * 6) + 5;
        const spreadRadius = 25;
        
        for (let i = 0; i < foodCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * spreadRadius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            gameEntities.fishFood.push(new FishFood(x, y));
        }
    } else if (gameState.spawnMode === 'krill') {
        const krillCount = Math.floor(Math.random() * 6) + 5; // Spawn 5-10 krill
        const spreadRadius = 30;
        
        for (let i = 0; i < krillCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * spreadRadius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // 80% regular, 10% pale, 10% mom distribution
            const rand = Math.random();
            if (rand < 0.8) {
                // 80% regular krill
                gameEntities.krill.push(new Krill());
                const newKrill = gameEntities.krill[gameEntities.krill.length - 1];
                newKrill.x = x;
                newKrill.y = y;
            } else if (rand < 0.9) {
                // 10% pale krill
                gameEntities.paleKrill.push(new PaleKrill(x, y));
            } else {
                // 10% mom krill
                gameEntities.momKrill.push(new MomKrill(x, y));
            }
        }
    } else if (gameState.spawnMode === 'poop') {
        const poopCount = Math.floor(Math.random() * 3) + 2;
        const spreadRadius = 20;
        
        for (let i = 0; i < poopCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * spreadRadius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            gameEntities.poop.push(new Poop(x, y));
        }
    } else if (gameState.spawnMode === 'fry') {
        // Spawn 1-5 fry of random types
        const fryCount = Math.floor(Math.random() * 5) + 1;
        const spreadRadius = 40;
        const fryTypes = [FISH_TYPES.SMALL_FRY_2, FISH_TYPES.SMALL_FRY_3, FISH_TYPES.SMALL_FRY_4];
        
        for (let i = 0; i < fryCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * spreadRadius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Choose random fry type
            const randomFryType = fryTypes[Math.floor(Math.random() * fryTypes.length)];
            const newFry = new Boid(randomFryType);
            newFry.x = x;
            newFry.y = y;
            
            gameEntities.fish.push(newFry);
        }
    } else if (gameState.spawnMode === 'tuna') {
        // Spawn 1-3 tuna of random types
        const tunaCount = Math.floor(Math.random() * 3) + 1;
        const spreadRadius = 60;
        const tunaTypes = ['tuna', 'tuna2'];
        
        for (let i = 0; i < tunaCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * spreadRadius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Choose random tuna type
            const randomTunaType = tunaTypes[Math.floor(Math.random() * tunaTypes.length)];
            const newTuna = new Predator(randomTunaType);
            newTuna.x = x;
            newTuna.y = y;
            
            gameEntities.predators.push(newTuna);
        }
    } else if (gameState.spawnMode === 'squid') {
        // Spawn a single giant squid (apex predator)
        const newSquid = new GiantSquid();
        newSquid.x = centerX;
        newSquid.y = centerY;
        
        // Initialize squid array if it doesn't exist
        if (!gameEntities.squid) {
            gameEntities.squid = [];
        }
        
        gameEntities.squid.push(newSquid);
        console.log('Giant squid spawned at:', centerX, centerY);
    }
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
    
    window.updateCamera(camera, keys, CONSTANTS, WORLD_WIDTH, WORLD_HEIGHT);
    window.applyCamera(ctx);
    
    // Draw background
    ctx.fillStyle = Utils.createDepthGradient();
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    drawBorders();
    
    // Update bubbles efficiently
    const { bubbles } = gameEntities;
    const { eatingBubbles } = ObjectPools;
    
    for (let i = 0; i < bubbles.length; i++) {
        bubbles[i].update();
        bubbles[i].draw();
    }
    
    for (let i = 0; i < eatingBubbles.length; i++) {
        eatingBubbles[i].update();
        eatingBubbles[i].draw();
    }
    
    // Clean up pools more frequently to prevent lag
    if (gameState.frameCount % 180 === 0) { // Every 3 seconds instead of 5
        ObjectPools.cleanup();
    }
    
    // Handle fish food and poop in optimized loops
    const { fishFood, poop: poopArray, krill, paleKrill, momKrill } = gameEntities;
    
    for (let i = fishFood.length - 1; i >= 0; i--) {
        const food = fishFood[i];
        food.update();
        food.draw();
        
        if (food.checkEaten(gameEntities.fish, [...krill, ...paleKrill, ...momKrill]) || food.eaten) {
            fishFood.splice(i, 1);
        }
    }
    
    for (let i = poopArray.length - 1; i >= 0; i--) {
        const poop = poopArray[i];
        poop.update();
        poop.draw();
        
        if (poop.isDead()) {
            poopArray.splice(i, 1);
        }
    }
    
    // Update entities with cached references
    const { fish, predators, squid = [] } = gameEntities;
    
    fish.forEach(f => {
        f.update(fish, predators, fishFood, [...krill, ...paleKrill, ...momKrill], poopArray);
        f.draw();
    });
    
    predators.forEach(p => {
        p.update(fish, [...krill, ...paleKrill, ...momKrill], squid);
        p.draw();
    });
    
    // Handle krill lifecycle transformations
    
    // Regular krill updates and transformations to mom krill
    for (let i = krill.length - 1; i >= 0; i--) {
        const k = krill[i];
        k.update([...krill, ...paleKrill, ...momKrill], predators, fishFood, poopArray);
        k.draw();
        
        // Check if krill should become mom krill
        const reproductionCheck = k.checkReproduction();
        if (reproductionCheck.shouldTransform) {
            // Remove from regular krill array
            krill.splice(i, 1);
            // Add to mom krill array
            momKrill.push(new MomKrill(reproductionCheck.x, reproductionCheck.y, reproductionCheck.velocity));
            console.log('Krill became mom krill!');
        }
    }
    
    // Pale krill updates and maturation to regular krill
    for (let i = paleKrill.length - 1; i >= 0; i--) {
        const pk = paleKrill[i];
        pk.update([...krill, ...paleKrill, ...momKrill], predators, fishFood, poopArray);
        pk.draw();
        
        // Check if pale krill should mature to regular krill
        const maturationCheck = pk.checkMaturation();
        if (maturationCheck.shouldTransform) {
            // Remove from pale krill array
            paleKrill.splice(i, 1);
            // Add to regular krill array
            const newKrill = new Krill();
            newKrill.x = maturationCheck.x;
            newKrill.y = maturationCheck.y;
            newKrill.velocity.x = maturationCheck.velocity.x;
            newKrill.velocity.y = maturationCheck.velocity.y;
            krill.push(newKrill);
            console.log('Pale krill matured to regular krill!');
        }
    }
    
    // Mom krill updates and offspring production
    for (let i = momKrill.length - 1; i >= 0; i--) {
        const mk = momKrill[i];
        mk.update([...krill, ...paleKrill, ...momKrill], predators, fishFood, poopArray);
        mk.draw();
        
        // Check if mom krill should produce offspring
        const offspringCheck = mk.checkOffspring();
        if (offspringCheck.shouldProduce) {
            // Add pale krill offspring
            offspringCheck.offspring.forEach(offspring => {
                paleKrill.push(new PaleKrill(offspring.x, offspring.y, offspring.velocity));
            });
            console.log(`Mom krill produced ${offspringCheck.offspring.length} pale krill! (Batch ${mk.batchesProduced}/${mk.maxBatches})`);
            
            // Check if mom krill should revert to regular krill
            if (offspringCheck.shouldRevert) {
                // Create new regular krill at mom's position
                const newKrill = new Krill();
                newKrill.x = mk.x;
                newKrill.y = mk.y;
                newKrill.velocity.x = mk.velocity.x;
                newKrill.velocity.y = mk.velocity.y;
                
                krill.push(newKrill);
                momKrill.splice(i, 1); // Remove mom krill
                console.log('Mom krill completed reproduction cycle and reverted to regular krill!');
            }
        }
    }
    
    // Update giant squid - the apex predators of the deep
    squid.forEach(s => {
        s.update(fish, predators, krill);
        s.draw();
    });
    
    // Debug: Test squid if gameEntities doesn't work
    if (window.testSquid) {
        window.testSquid.update(fish, predators, krill);
        window.testSquid.draw();
    }
    
    // Draw spawn indicator
    if (gameState.spawnMode !== 'off' && Utils.inRenderDistance(mouseWorldPos)) {
        const indicatorOpacity = Utils.getDepthOpacity(mouseWorldPos.y, 0.7);
        const tintStrength = Utils.getDepthTint(mouseWorldPos.y);
        
        ctx.save();
        
        // Choose appropriate sprite based on spawn mode
        let spriteToUse;
        if (gameState.spawnMode === 'food') {
            spriteToUse = sprites.fishFood;
        } else if (gameState.spawnMode === 'krill') {
            spriteToUse = sprites.krillSpawnIcon;
        } else if (gameState.spawnMode === 'poop') {
            spriteToUse = sprites.poop;
        } else if (gameState.spawnMode === 'fry') {
            spriteToUse = sprites.smallFry2; // Use smallFry2 as representative fry sprite
        } else if (gameState.spawnMode === 'tuna') {
            spriteToUse = sprites.tuna; // Use tuna as representative tuna sprite
        } else if (gameState.spawnMode === 'squid') {
            spriteToUse = sprites.giantSquid1; // Use giantSquid1 as representative squid sprite
        }
        
        // All spawn icons same size now
        const iconSize = 48;
        const halfSize = iconSize / 2;
        
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = iconSize;
            tempCanvas.height = iconSize;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(spriteToUse, 0, 0, iconSize, iconSize);
            
            // Apply tint using source-atop (only affects non-transparent pixels)
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, iconSize, iconSize);
            
            // Draw the tinted sprite to main canvas
            ctx.globalAlpha = indicatorOpacity;
            ctx.drawImage(tempCanvas, mouseWorldPos.x - halfSize, mouseWorldPos.y - halfSize);
        } else {
            // No tint needed, draw normally
            ctx.globalAlpha = indicatorOpacity;
            ctx.drawImage(spriteToUse, mouseWorldPos.x - halfSize, mouseWorldPos.y - halfSize, iconSize, iconSize);
        }
        
        ctx.globalAlpha = indicatorOpacity;
        let strokeColor = 'rgba(255, 255, 255, 0.5)'; // Default white for food
        if (gameState.spawnMode === 'krill') {
            strokeColor = 'rgba(255, 150, 100, 0.5)'; // Orange for krill
        } else if (gameState.spawnMode === 'poop') {
            strokeColor = 'rgba(139, 69, 19, 0.7)'; // Brown for poop
        } else if (gameState.spawnMode === 'fry') {
            strokeColor = 'rgba(100, 200, 255, 0.7)'; // Light blue for fry
        } else if (gameState.spawnMode === 'tuna') {
            strokeColor = 'rgba(255, 100, 100, 0.7)'; // Red for tuna
        } else if (gameState.spawnMode === 'squid') {
            strokeColor = 'rgba(150, 50, 200, 0.8)'; // Purple for squid
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const circleRadius = 30;
        ctx.arc(mouseWorldPos.x, mouseWorldPos.y, circleRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    
    window.resetCamera(ctx);
    
    // Only draw UI if showUI is true
    if (gameState.showUI) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '16px Arial';
        ctx.fillText(`Zoom: ${camera.zoom.toFixed(1)}x`, 10, 25);
        ctx.fillText('WASD: Move | Wheel: Zoom | F: Spawn Mode | H: Hide UI', 10, 45);
        
        if (gameState.spawnMode === 'food') {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.drawImage(sprites.fishFood, 10, 52, 20, 20);
            ctx.fillText('FOOD MODE - Click to spawn', 35, 70);
        } else if (gameState.spawnMode === 'krill') {
            ctx.fillStyle = 'rgba(255, 150, 100, 0.8)';
            ctx.drawImage(sprites.krillSpawnIcon, 10, 52, 40, 40);
            ctx.fillText('KRILL MODE - Click to spawn', 55, 70);
        } else if (gameState.spawnMode === 'poop') {
            ctx.fillStyle = 'rgba(139, 69, 19, 0.8)';
            ctx.drawImage(sprites.poop, 10, 52, 20, 20);
            ctx.fillText('POOP MODE - Click to spawn', 35, 70);
        } else if (gameState.spawnMode === 'fry') {
            ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
            ctx.drawImage(sprites.smallFry2, 10, 52, 30, 30);
            ctx.fillText('FRY MODE - Click to spawn (1-5 random)', 45, 70);
        } else if (gameState.spawnMode === 'tuna') {
            ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
            ctx.drawImage(sprites.tuna, 10, 52, 35, 35);
            ctx.fillText('TUNA MODE - Click to spawn (1-3 random)', 50, 70);
        } else if (gameState.spawnMode === 'squid') {
            ctx.fillStyle = 'rgba(150, 50, 200, 0.8)';
            ctx.drawImage(sprites.giantSquid1, 10, 52, 45, 45);
            ctx.fillText('SQUID MODE - Click to spawn giant squid', 60, 70);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText('Press F to cycle: Food → Krill → Poop → Fry → Tuna → Squid → Off', 10, 70);
        }
    }
    
    requestAnimationFrame(animate);
}

function startAnimation() {
    if (spritesLoaded === Object.keys(spriteFiles).length) {
        // Initialize the giant squid swarm and maintain population
        if (!ecosystemInitialized) {
            // Ensure gameEntities exists and has squid array
            if (typeof gameEntities !== 'undefined') {
                if (!gameEntities.squid) {
                    gameEntities.squid = [];
                }
                // Ensure minimum squid swarm density (3 squids)
                const targetSquidCount = 3;
                while (gameEntities.squid.length < targetSquidCount) {
                    gameEntities.squid.push(new GiantSquid());
                }
                console.log(`Giant squid swarm initialized with ${gameEntities.squid.length} squids!`);
            } else {
                console.warn('gameEntities not found, creating temporary squid for testing');
                // Create a temporary global squid for testing
                window.testSquid = new GiantSquid();
            }
            ecosystemInitialized = true;
        }
        animate();
    } else {
        setTimeout(startAnimation, 100);
    }
}

startAnimation();

class Poop {
    constructor(x, y, type = 'regular') {
        this.x = x;
        this.y = y;
        this.velocity = { x: 0, y: 0.3 }; // Slow downward drift
        this.type = type; // 'regular', 'tuna', 'squid', or 'abyssal'
        this.size = type === 'squid' ? 18 : (type === 'tuna' ? 16 : 12); // Squid poop is 18px, tuna poop is 16px
        this.feedValue = type === 'squid' ? 5 : (type === 'tuna' ? 2 : 1); // Squid poop worth 5, tuna poop worth 2
        
        // Abyssal poop (from fish food) starts as poop3 (deep water state)
        if (type === 'abyssal') {
            this.state = 3; // Start as deep water poop (poop3)
            this.size = 10; // Smaller than regular poop
            this.feedValue = 1; // Standard nutrition value
        } else {
            this.state = 1; // 1 = fresh, 2 = aged, 3 = deep water
        }
        
        this.stateTimer = 0;
        this.maxAge = 5000; // 5 seconds for state 1
        this.isActive = true;
        this.opacity = 1.0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.rotation = 0;
        
        // Add slight random drift
        this.velocity.x = (Math.random() - 0.5) * 0.1;
    }
    
    update() {
        if (!this.isActive) return;
        
        this.stateTimer += 16; // Approximate frame time
        
        // State 1 -> State 2 after 5 seconds
        if (this.state === 1 && this.stateTimer >= this.maxAge) {
            this.state = 2;
            this.stateTimer = 0;
        }
        
        // Check if we're in deep water (bottom 40% of world)
        const deepWaterThreshold = WORLD_HEIGHT * 0.6;
        if (this.y > deepWaterThreshold && this.state === 2) {
            this.state = 3;
        }
        
        // Movement
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.rotation += this.rotationSpeed;
        
        // Slight deceleration over time
        this.velocity.x *= 0.998;
        this.velocity.y *= 0.999;
        
        // Bounds checking - remove if too far down or out of bounds
        if (this.y > WORLD_HEIGHT + 100 || this.x < -100 || this.x > WORLD_WIDTH + 100) {
            this.isActive = false;
        }
        
        // Fade out very old poop
        if (this.stateTimer > 30000) { // 30 seconds total life
            this.opacity -= 0.01;
            if (this.opacity <= 0) {
                this.isActive = false;
            }
        }
    }
    
    draw() {
        if (!this.isActive || !Utils.inRenderDistance(this)) return;
        
        let depthOpacity = Utils.getDepthOpacity(this.y, this.opacity);
        let tintStrength = Utils.getDepthTint(this.y);
        
        // Reduce deep water shader effect by 50% for poop 3 sprite
        if (this.state === 3) {
            // Blend depth opacity with base opacity (50% less effect)
            depthOpacity = this.opacity * 0.5 + depthOpacity * 0.5;
            // Reduce tint strength by 50%
            tintStrength *= 0.5;
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        let spriteKey;
        switch(this.state) {
            case 1: spriteKey = 'poop'; break;
            case 2: spriteKey = 'poop2'; break;
            case 3: spriteKey = 'poop3'; break;
        }
        
        if (tintStrength > 0) {
            // Create temporary canvas for tinting
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.size;
            tempCanvas.height = this.size;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(sprites[spriteKey], 0, 0, this.size, this.size);
            
            // Apply tint
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, this.size, this.size);
            
            // Draw tinted sprite
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -this.size/2, -this.size/2);
        } else {
            // Draw normally
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(sprites[spriteKey], -this.size/2, -this.size/2, this.size, this.size);
        }
        
        ctx.restore();
    }
    
    isDead() {
        return !this.isActive;
    }
} 