// Boid class for small fish with flocking behavior
class Boid extends (window.Entity || Entity) {
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
        const FISH_TYPES = window.FISH_TYPES || {};
        
        const configs = {
            [FISH_TYPES.SMALL_FRY_4]: { size: 28, maxSpeed: 3.2 },
            [FISH_TYPES.SMALL_FRY_3]: { size: 32, maxSpeed: 2.8 },
            [FISH_TYPES.SMALL_FRY_2]: { size: 35, maxSpeed: 3.0 }
        };
        
        const config = configs[this.fishType] || configs[FISH_TYPES.SMALL_FRY_2];
        this.size = config.size;
        this.maxSpeed = config.maxSpeed;
    }

    getPreferredDepth() {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const FISH_TYPES = window.FISH_TYPES || {};
        
        switch (this.fishType) {
            case FISH_TYPES.SMALL_FRY_2:
            case FISH_TYPES.SMALL_FRY_4:
                return WORLD_HEIGHT * 0.2; // Prefer surface waters
            case FISH_TYPES.SMALL_FRY_3:
                return WORLD_HEIGHT * 0.4; // Prefer mid waters
            default:
                return WORLD_HEIGHT * 0.3;
        }
    }

    edges() {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        if (window.Utils && window.Utils.handleEdges) {
            window.Utils.handleEdges(this, 20, 0.8, WORLD_WIDTH, WORLD_HEIGHT);
        }
    }

    flock(boids, predators, food, krill = []) {
        const CONSTANTS = window.CONSTANTS || { PERCEPTION_RADIUS: 50, SEPARATION_RADIUS: 30 };
        const perceptionRadiusSquared = CONSTANTS.PERCEPTION_RADIUS * CONSTANTS.PERCEPTION_RADIUS;
        const separationRadiusSquared = CONSTANTS.SEPARATION_RADIUS * CONSTANTS.SEPARATION_RADIUS;
        
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let separation = { x: 0, y: 0 };
        let alignCount = 0, cohesionCount = 0, separationCount = 0;
        
        // Single pass through nearby boids
        for (let other of boids) {
            if (other === this) continue;
            
            const distSquared = this.distanceSquared(this, other);
            
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
            const alignSteering = this.calculateSteering(alignment, this.maxSpeed, this.maxForce);
            forces.x += alignSteering.x;
            forces.y += alignSteering.y;
        }
        
        if (cohesionCount > 0) {
            cohesion.x = (cohesion.x / cohesionCount) - this.x;
            cohesion.y = (cohesion.y / cohesionCount) - this.y;
            const cohesionSteering = this.calculateSteering(cohesion, this.maxSpeed, this.maxForce);
            forces.x += cohesionSteering.x;
            forces.y += cohesionSteering.y;
        }
        
        if (separationCount > 0) {
            separation.x /= separationCount;
            separation.y /= separationCount;
            const separationSteering = this.calculateSteering(separation, this.maxSpeed, this.maxForce);
            forces.x += separationSteering.x * 1.5;
            forces.y += separationSteering.y * 1.5;
        }
        
        // Apply forces
        this.velocity.x += forces.x;
        this.velocity.y += forces.y;
        
        // Limit velocity
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(this.velocity, this.maxSpeed);
        }
    }

    distanceSquared(obj1, obj2) {
        return (obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2;
    }

    calculateSteering(target, maxSpeed, maxForce) {
        // Simplified steering calculation
        const desired = this.normalize(target);
        desired.x *= maxSpeed;
        desired.y *= maxSpeed;
        
        const steer = {
            x: desired.x - this.velocity.x,
            y: desired.y - this.velocity.y
        };
        
        // Limit steering force
        const mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
        if (mag > maxForce) {
            steer.x = (steer.x / mag) * maxForce;
            steer.y = (steer.y / mag) * maxForce;
        }
        
        return steer;
    }

    normalize(vector) {
        const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (mag === 0) return { x: 0, y: 0 };
        return { x: vector.x / mag, y: vector.y / mag };
    }

    update(boids, predators, food, krill, poop) {
        this.flock(boids, predators, food, krill);
        this.move();
        this.edges();
    }

    draw() {
        const sprites = window.sprites || {};
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.5;
        this.drawSprite(sprites[this.fishType], this.size, 0.9, angle);
    }
}

// Export for global access
window.Boid = Boid; 