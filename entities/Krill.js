// Krill class extending Boid with specialized behavior
class Krill extends Boid {
    constructor() {
        super(FISH_TYPES.KRILL);
        
        // Krill-specific properties
        this.maxSpeed = 0.8;
        this.size = 14;
        this.separationRadius = 25;
        this.alignmentRadius = 45;
        this.cohesionRadius = 60;
        this.fearRadius = 100;
        this.foodRadius = 60;
        
        // Migration properties
        this.migrationStrength = 0.02;
        this.migrationPhase = Math.random() * Math.PI * 2;
        this.verticalMigrationSpeed = 0.3;
        
        // Poop-seeking behavior
        this.poopSeekRadius = 80;
        this.poopSeekStrength = 1.5;
        
        // Multiple sprite animation
        this.spriteVariants = ['krill1', 'krill2', 'krill3'];
        this.currentSpriteIndex = Math.floor(Math.random() * this.spriteVariants.length);
        this.spriteTimer = 0;
        this.spriteChangeInterval = 60; // Change sprite every 60 frames
        
        // Start in deep waters typically
        this.y = WORLD_HEIGHT * 0.6 + Math.random() * WORLD_HEIGHT * 0.3;
        this.preferredDepth = WORLD_HEIGHT * 0.7; // Prefer deeper waters
        this.depthTolerance = WORLD_HEIGHT * 0.2; // More flexible with depth
    }
    
    setupFishProperties() {
        // Override parent setup for krill-specific properties
        this.fishType = FISH_TYPES.KRILL;
        this.maxSpeed = 0.8;
        this.size = 14;
        this.preferredDepthZone = 'deep';
        this.canEat = []; // Krill don't hunt other fish, they eat poop and organic matter
    }
    
    flock(boids, predators, food, poop) {
        // Use parent flocking but with krill-specific modifications
        const forces = {
            separation: { x: 0, y: 0 },
            alignment: { x: 0, y: 0 },
            cohesion: { x: 0, y: 0 },
            flee: { x: 0, y: 0 },
            seek: { x: 0, y: 0 },
            migration: { x: 0, y: 0 },
            poopSeek: { x: 0, y: 0 }
        };

        // Apply standard boid behaviors but only with other krill
        const krill = boids.filter(b => b.fishType === FISH_TYPES.KRILL);
        super.flock(krill, predators, food, []);
        
        // Add krill-specific behaviors
        this.addPoopSeekForce(poop);
        this.addMigrationForce();
    }
    
    addPoopSeekForce(poopArray) {
        let closest = null;
        let closestDist = Infinity;
        
        for (let poop of poopArray) {
            if (poop.isActive) {
                const d = Utils.distance(this.x, this.y, poop.x, poop.y);
                if (d < this.poopSeekRadius && d < closestDist) {
                    closest = poop;
                    closestDist = d;
                }
            }
        }
        
        if (closest) {
            const seek = Utils.calculateSteering(closest.x - this.x, closest.y - this.y, closestDist);
            this.applyForce({
                x: seek.x * this.maxForce * this.poopSeekStrength,
                y: seek.y * this.maxForce * this.poopSeekStrength
            });
        }
    }
    
    addMigrationForce() {
        // Vertical migration behavior - krill move up and down in daily cycles
        // Simulate a day/night cycle based on game time
        const gameTime = (Date.now() / 1000) % 120; // 2-minute cycle
        const migrationDirection = Math.sin(gameTime / 120 * Math.PI * 2 + this.migrationPhase);
        
        // Move towards surface during "night", deeper during "day"
        const targetDepth = WORLD_HEIGHT * (0.3 + 0.4 * (migrationDirection + 1) / 2);
        const depthDifference = this.y - targetDepth;
        
        this.applyForce({
            x: 0,
            y: -depthDifference * this.migrationStrength
        });
    }
    
    addFleeForce(forces, predators, boids) {
        // Enhanced flee behavior - krill are very vulnerable
        for (let predator of predators) {
            const d = Utils.distance(this.x, this.y, predator.x, predator.y);
            if (d < this.fearRadius * 1.2 && d > 0) { // Larger fear radius
                const fleeStrength = this.fearSensitivity * (this.fearRadius * 1.2 - d) / (this.fearRadius * 1.2);
                const flee = Utils.calculateSteering(this.x - predator.x, this.y - predator.y, d);
                forces.flee.x += flee.x * this.maxForce * fleeStrength * 4; // Stronger flee
                forces.flee.y += flee.y * this.maxForce * fleeStrength * 4;
            }
        }

        // Flee from all fish species that can eat krill
        for (let other of boids) {
            if (other !== this && other.canEat && other.canEat.includes(FISH_TYPES.KRILL)) {
                const d = Utils.distance(this.x, this.y, other.x, other.y);
                if (d < this.fearRadius && d > 0) {
                    const fleeStrength = (this.fearRadius - d) / this.fearRadius;
                    const flee = Utils.calculateSteering(this.x - other.x, this.y - other.y, d);
                    forces.flee.x += flee.x * this.maxForce * fleeStrength * 2;
                    forces.flee.y += flee.y * this.maxForce * fleeStrength * 2;
                }
            }
        }
        
        this.applyForce(forces.flee);
    }
    
    checkForPoop(poopArray) {
        for (let i = poopArray.length - 1; i >= 0; i--) {
            const poop = poopArray[i];
            if (poop.isActive) {
                const d = Utils.distance(this.x, this.y, poop.x, poop.y);
                if (d < this.size / 2 + poop.size / 2) {
                    // Eat the poop
                    poop.isActive = false;
                    
                    // Create eating bubble effect
                    if (window.ObjectPools) {
                        window.ObjectPools.getEatingBubble(this.x, this.y);
                    }
                    
                    // Krill digest poop and grow slightly
                    this.size = Math.min(16, this.size + 0.1);
                    this.energy = Math.min(100, this.energy + 10);
                    this.hunger = Math.max(0, this.hunger - 20);
                    break;
                }
            }
        }
    }
    
    update(boids, predators, food, poop) {
        this.flock(boids, predators, food, poop);
        this.move();
        this.edges();
        
        // Update hunger (krill get hungry faster)
        this.hunger = Math.min(100, this.hunger + 0.08);
        
        // Check for poop to eat
        this.checkForPoop(poop);
        
        // Update sprite animation
        this.spriteTimer++;
        if (this.spriteTimer >= this.spriteChangeInterval) {
            this.currentSpriteIndex = (this.currentSpriteIndex + 1) % this.spriteVariants.length;
            this.spriteTimer = 0;
        }
        
        this.animationFrame += this.frameSpeed;
    }
    
    draw() {
        this.angle = Math.atan2(this.velocity.y, this.velocity.x);
        
        // Calculate migration-based opacity
        const gameTime = (Date.now() / 1000) % 120;
        const migrationCycle = Math.sin(gameTime / 120 * Math.PI * 2 + this.migrationPhase);
        const migrationOpacity = 0.7 + 0.3 * (migrationCycle + 1) / 2; // Opacity varies from 0.7 to 1.0
        
        // Use current sprite variant
        const currentSpriteKey = this.spriteVariants[this.currentSpriteIndex];
        this.drawSprite(sprites[currentSpriteKey], this.size, migrationOpacity, this.angle);
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Krill = Krill;
} 