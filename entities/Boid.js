// Boid class for small fish with flocking behavior
class Boid extends Entity {
    constructor(fishType = null) {
        super();
        
        // Use global constants safely
        const FISH_TYPES = window.FISH_TYPES || {
            SMALL_FRY_2: 'smallFry2',
            SMALL_FRY_3: 'smallFry3', 
            SMALL_FRY_4: 'smallFry4',
            KRILL: 'krill'
        };
        
        this.fishType = fishType || FISH_TYPES.SMALL_FRY_2;
        this.maxSpeed = 1.5;
        this.maxForce = 0.03;
        this.size = 18;
        this.separationRadius = 35;
        this.alignmentRadius = 60;
        this.cohesionRadius = 80;
        this.fearRadius = 120;
        this.foodRadius = 80;
        this.huntRadius = 40;
        this.energy = 100;
        this.hunger = 0;
        this.huntCooldown = 0;
        this.animationFrame = 0;
        this.frameSpeed = 0.1;
        
        // Species-specific setup
        this.setupFishProperties();
        
        // Generate some variance in movement
        this.personalSpace = this.separationRadius + (Math.random() - 0.5) * 10;
        this.groupAffinity = 0.8 + Math.random() * 0.4;
        this.fearSensitivity = 0.8 + Math.random() * 0.4;
        
        // Depth preference based on fish type
        this.preferredDepth = this.getPreferredDepth();
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        this.depthTolerance = WORLD_HEIGHT * 0.15; // 15% of world height tolerance
    }
    
    setupFishProperties() {
        const FISH_TYPES = window.FISH_TYPES || {
            SMALL_FRY_2: 'smallFry2',
            SMALL_FRY_3: 'smallFry3', 
            SMALL_FRY_4: 'smallFry4',
            KRILL: 'krill'
        };
        
        switch(this.fishType) {
            case FISH_TYPES.SMALL_FRY_2:
                this.maxSpeed = 1.5;
                this.size = 18;
                this.preferredDepthZone = 'shallow';
                this.canEat = [FISH_TYPES.KRILL];
                break;
            case FISH_TYPES.SMALL_FRY_3:
                this.maxSpeed = 1.3;
                this.size = 20;
                this.preferredDepthZone = 'mid';
                this.canEat = [FISH_TYPES.KRILL, FISH_TYPES.SMALL_FRY_2];
                break;
            case FISH_TYPES.SMALL_FRY_4:
                this.maxSpeed = 1.1;
                this.size = 22;
                this.preferredDepthZone = 'deep';
                this.canEat = [FISH_TYPES.KRILL, FISH_TYPES.SMALL_FRY_2, FISH_TYPES.SMALL_FRY_3];
                break;
        }
    }
    
    getPreferredDepth() {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        switch(this.preferredDepthZone) {
            case 'surface': return WORLD_HEIGHT * 0.1;
            case 'shallow': return WORLD_HEIGHT * 0.3;
            case 'mid': return WORLD_HEIGHT * 0.5;
            case 'deep': return WORLD_HEIGHT * 0.7;
            case 'abyssal': return WORLD_HEIGHT * 0.9;
            default: return WORLD_HEIGHT * 0.5;
        }
    }

    edges() {
        if (window.Utils && window.Utils.handleEdges) {
            window.Utils.handleEdges(this, 50, 0.8);
        }
    }

    flock(boids, predators, food, krill = []) {
        const forces = {
            separation: { x: 0, y: 0 },
            alignment: { x: 0, y: 0 },
            cohesion: { x: 0, y: 0 },
            flee: { x: 0, y: 0 },
            seek: { x: 0, y: 0 },
            hunt: { x: 0, y: 0 },
            depth: { x: 0, y: 0 }
        };

        let total = 0;
        let fleeTotal = 0;

        for (let other of boids) {
            const d = Utils.distance(this.x, this.y, other.x, other.y);

            if (other !== this && d > 0) {
                // Separation
                if (d < this.personalSpace) {
                    const diff = Utils.calculateSteering(other.x - this.x, other.y - this.y, d);
                    forces.separation.x -= diff.x / d;
                    forces.separation.y -= diff.y / d;
                    total++;
                }

                // Alignment and Cohesion (same species preference)
                if (d < this.alignmentRadius && other.fishType === this.fishType) {
                    forces.alignment.x += other.velocity.x;
                    forces.alignment.y += other.velocity.y;
                    forces.cohesion.x += other.x;
                    forces.cohesion.y += other.y;
                    fleeTotal++;
                }
            }
        }

        // Apply flee, seek, hunt, and depth forces
        this.addFleeForce(forces, predators, boids);
        this.addSeekForce(forces, food);
        this.addHuntForce(forces, boids, krill);
        this.addDepthPreference(forces);

        // Normalize and apply forces
        if (total > 0) {
            forces.separation.x = (forces.separation.x / total) * this.maxForce * 2;
            forces.separation.y = (forces.separation.y / total) * this.maxForce * 2;
        }

        if (fleeTotal > 0) {
            forces.alignment.x = (forces.alignment.x / fleeTotal) * this.maxForce * 0.5;
            forces.alignment.y = (forces.alignment.y / fleeTotal) * this.maxForce * 0.5;
            
            forces.cohesion.x = (forces.cohesion.x / fleeTotal - this.x) * this.maxForce * 0.3;
            forces.cohesion.y = (forces.cohesion.y / fleeTotal - this.y) * this.maxForce * 0.3;
        }

        // Apply all forces
        Object.values(forces).forEach(force => this.applyForce(force));
    }

    addFleeForce(forces, predators, boids) {
        for (let predator of predators) {
            const d = Utils.distance(this.x, this.y, predator.x, predator.y);
            if (d < this.fearRadius && d > 0) {
                const fleeStrength = this.fearSensitivity * (this.fearRadius - d) / this.fearRadius;
                const flee = Utils.calculateSteering(this.x - predator.x, this.y - predator.y, d);
                forces.flee.x += flee.x * this.maxForce * fleeStrength * 3;
                forces.flee.y += flee.y * this.maxForce * fleeStrength * 3;
            }
        }

        // Also flee from larger fish of different species that can eat this fish
        for (let other of boids) {
            if (other !== this && Utils.shouldFlee(this.fishType, other.fishType)) {
                const d = Utils.distance(this.x, this.y, other.x, other.y);
                if (d < this.fearRadius * 0.7 && d > 0) {
                    const fleeStrength = (this.fearRadius * 0.7 - d) / (this.fearRadius * 0.7);
                    const flee = Utils.calculateSteering(this.x - other.x, this.y - other.y, d);
                    forces.flee.x += flee.x * this.maxForce * fleeStrength * 1.5;
                    forces.flee.y += flee.y * this.maxForce * fleeStrength * 1.5;
                }
            }
        }
    }

    addSeekForce(forces, food) {
        if (this.hunger > 50) {
            let closest = null;
            let closestDist = Infinity;
            
            for (let f of food) {
                if (!f.eaten) {
                    const d = Utils.distance(this.x, this.y, f.x, f.y);
                    if (d < this.foodRadius && d < closestDist) {
                        closest = f;
                        closestDist = d;
                    }
                }
            }
            
            if (closest) {
                const seek = Utils.calculateSteering(closest.x - this.x, closest.y - this.y, closestDist);
                const hungerMultiplier = this.hunger / 100;
                forces.seek.x = seek.x * this.maxForce * hungerMultiplier * 2;
                forces.seek.y = seek.y * this.maxForce * hungerMultiplier * 2;
            }
        }
    }

    addHuntForce(forces, boids, krill = []) {
        if (this.huntCooldown > 0) {
            this.huntCooldown--;
            return;
        }

        const allPrey = [...boids, ...krill];
        let closest = null;
        let closestDist = Infinity;

        for (let prey of allPrey) {
            if (prey !== this && this.canEat && this.canEat.includes(prey.fishType)) {
                const d = Utils.distance(this.x, this.y, prey.x, prey.y);
                if (d < this.huntRadius && d < closestDist) {
                    closest = prey;
                    closestDist = d;
                }
            }
        }

        if (closest) {
            const hunt = Utils.calculateSteering(closest.x - this.x, closest.y - this.y, closestDist);
            const huntStrength = this.hunger > 70 ? 2 : 1;
            forces.hunt.x = hunt.x * this.maxForce * huntStrength;
            forces.hunt.y = hunt.y * this.maxForce * huntStrength;
        }
    }

    addDepthPreference(forces) {
        const currentDepth = this.y;
        const depthDifference = currentDepth - this.preferredDepth;
        
        // Only apply depth force if outside tolerance zone
        if (Math.abs(depthDifference) > this.depthTolerance) {
            const depthForce = -depthDifference * 0.0001; // Gentle depth correction
            forces.depth.y = depthForce * this.maxForce;
        }
    }

    checkForSmallerFish(boids, krill = [], poop = []) {
        const allPrey = [...boids, ...krill];
        
        for (let i = allPrey.length - 1; i >= 0; i--) {
            const prey = allPrey[i];
            if (prey !== this && this.canEat && this.canEat.includes(prey.fishType)) {
                const d = Utils.distance(this.x, this.y, prey.x, prey.y);
                if (d < this.size / 2 + 5) {
                    // Remove the prey
                    if (krill.includes(prey)) {
                        const index = krill.indexOf(prey);
                        if (index > -1) krill.splice(index, 1);
                    } else {
                        const index = boids.indexOf(prey);
                        if (index > -1) boids.splice(index, 1);
                    }
                    
                    // Add poop and eating effects
                    if (window.gameSystem) {
                        window.gameSystem.addEntity('poop', new Poop(this.x, this.y));
                    }
                    if (window.ObjectPools) {
                        window.ObjectPools.getEatingBubble(this.x, this.y);
                    }
                    
                    this.hunger = Math.max(0, this.hunger - 30);
                    this.huntCooldown = 120; // 2 second cooldown
                    break;
                }
            }
        }
    }

    update(boids, predators, food, krill, poop) {
        this.flock(boids, predators, food, krill);
        this.move();
        this.edges();
        
        // Update hunger
        this.hunger = Math.min(100, this.hunger + 0.05);
        
        // Check for smaller fish to eat
        this.checkForSmallerFish(boids, krill, poop);
        
        this.animationFrame += this.frameSpeed;
    }

    draw() {
        this.angle = Math.atan2(this.velocity.y, this.velocity.x);
        this.drawSprite(sprites[this.fishType], this.size, 1, this.angle);
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Boid = Boid;
} 