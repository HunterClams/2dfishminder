// Boid class for small fish with flocking behavior
class Boid extends (window.Entity || Entity) {
    constructor(fishType = null) {
        // Use BoidConfig for fish types and spawn zone determination
        const config = window.BoidConfig || {};
        const FISH_TYPES = config.FISH_TYPES || {
            SMALL_FRY_2: 'smallFry2',
            SMALL_FRY_3: 'smallFry3', 
            SMALL_FRY_4: 'smallFry4',
            KRILL: 'krill'
        };
        
        // Determine fish type and spawn zone BEFORE calling super()
        const actualFishType = fishType || FISH_TYPES.SMALL_FRY_2;
        const spawnZone = config.getSpawnZone ? config.getSpawnZone(actualFishType) : 'shallow';
        
        // Call parent constructor with proper spawn zone
        super(null, null, spawnZone);
        
        // NOW we can set this properties
        this.fishType = actualFishType;
        
        // Get behavior config for minimum speed check
        const behaviorConfig = config.BEHAVIOR_CONFIG || {};
        const minSpeed = behaviorConfig.minSpeed || 0.5;
        
        // Ensure velocity is properly initialized with minimum speed to prevent stationary fry
        if (!this.velocity) {
            // Set initial velocity with minimum speed in random direction
            const angle = Math.random() * Math.PI * 2;
            this.velocity = {
                x: Math.cos(angle) * minSpeed,
                y: Math.sin(angle) * minSpeed
            };
        } else {
            // Ensure existing velocity meets minimum speed requirement
            if (window.Utils && window.Utils.enforceMinimumSpeed) {
                window.Utils.enforceMinimumSpeed(this.velocity, minSpeed);
            }
        }
        
        // Initialize modular systems
        this.initializeModularSystems();
        
        // Setup fish properties using config
        this.setupFishProperties();
        
        // Generate some variance in movement (behaviorConfig already declared above)
        this.personalSpace = (behaviorConfig.separationRadius || 35) + (Math.random() - 0.5) * 10;
        this.groupAffinity = 0.8 + Math.random() * 0.4;
        this.fearSensitivity = 0.8 + Math.random() * 0.4;
        
        // Depth preference based on fish type
        this.preferredDepth = config.getPreferredDepth ? config.getPreferredDepth(actualFishType) : this.getPreferredDepth();
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        this.depthTolerance = WORLD_HEIGHT * (behaviorConfig.depthTolerance || 0.15);
        
        // Initialize behavior state (default to foraging)
        this.behaviorState = 'foraging';
        
        // Initialize threat system properties
        if (window.boidThreatSystem) {
            window.boidThreatSystem.initializeThreatSystem(this);
        }
    }

    initializeModularSystems() {
        // Initialize modular systems with safety checks
        try {
            this.flockingSystem = new (window.BoidFlockingSystem || BoidFlockingSystem)();
            this.feedingSystem = new (window.BoidFeedingSystem || BoidFeedingSystem)();
            this.renderingSystem = new (window.BoidRenderingSystem || BoidRenderingSystem)();
            
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.logSystemInit('BOID', 'Modular systems initialized successfully');
            }
        } catch (error) {
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.logError('BOID', 'Error initializing modular systems: ' + error.message);
            }
        }
    }
    
    setupFishProperties() {
        const config = window.BoidConfig || {};
        const FISH_TYPES = config.FISH_TYPES || {};
        
        const fishConfig = config.getFishConfig ? config.getFishConfig(this.fishType) : {
            size: 35,
            maxSpeed: 3.0
        };
        
        this.size = fishConfig.size;
        this.maxSpeed = fishConfig.maxSpeed;
        
        // Set other properties from behavior config
        const behaviorConfig = config.BEHAVIOR_CONFIG || {};
        this.maxForce = behaviorConfig.maxForce || 0.06;
        this.separationRadius = behaviorConfig.separationRadius || 35;
        this.alignmentRadius = behaviorConfig.alignmentRadius || 60;
        this.cohesionRadius = behaviorConfig.cohesionRadius || 80;
        this.fearRadius = behaviorConfig.fearRadius || 120;
        this.foodRadius = behaviorConfig.foodRadius || 80;
        this.huntRadius = behaviorConfig.huntRadius || 40;
        this.frameSpeed = behaviorConfig.frameSpeed || 0.1;
        
        // Initialize other properties
        this.energy = 100;
        this.hunger = 0;
        this.huntCooldown = 0;
        this.animationFrame = 0;
        this.frameCount = 0; // Add frame counter for debug logging
    }

    getPreferredDepth() {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const config = window.BoidConfig || {};
        const FISH_TYPES = config.FISH_TYPES || {};
        
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
        if (this.flockingSystem && this.flockingSystem.handleEdges) {
            this.flockingSystem.handleEdges(this);
        }
    }

    flock(boids, predators, food, krill = []) {
        // TEMPORARILY USE ORIGINAL WORKING FLOCKING CODE
        const CONSTANTS = window.CONSTANTS || { PERCEPTION_RADIUS: 50, SEPARATION_RADIUS: 30 };
        const perceptionRadiusSquared = CONSTANTS.PERCEPTION_RADIUS * CONSTANTS.PERCEPTION_RADIUS;
        const separationRadiusSquared = CONSTANTS.SEPARATION_RADIUS * CONSTANTS.SEPARATION_RADIUS;
        
        // When fleeing, disable alignment/cohesion completely - they counteract fleeing forces
        // Only keep separation to avoid collisions while fleeing
        const isFleeing = this.behaviorState === 'fleeing';
        const flockingIntensity = isFleeing ? 0.0 : 1.0; // NO alignment/cohesion when fleeing
        
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
        
        // CRITICAL: Skip alignment and cohesion when fleeing - they counteract fleeing forces
        if (!isFleeing) {
            if (alignCount > 0) {
                alignment.x /= alignCount;
                alignment.y /= alignCount;
                const alignSteering = this.calculateSteering(alignment, this.maxSpeed, this.maxForce);
                forces.x += alignSteering.x * flockingIntensity;
                forces.y += alignSteering.y * flockingIntensity;
            }
            
            if (cohesionCount > 0) {
                cohesion.x = (cohesion.x / cohesionCount) - this.x;
                cohesion.y = (cohesion.y / cohesionCount) - this.y;
                const cohesionSteering = this.calculateSteering(cohesion, this.maxSpeed, this.maxForce);
                forces.x += cohesionSteering.x * flockingIntensity;
                forces.y += cohesionSteering.y * flockingIntensity;
            }
        }
        
        if (separationCount > 0) {
            separation.x /= separationCount;
            separation.y /= separationCount;
            const separationSteering = this.calculateSteering(separation, this.maxSpeed, this.maxForce);
            // Separation still important when fleeing (avoid crowding during escape)
            // CRITICAL: Don't multiply by flockingIntensity when fleeing - separation should still work
            const separationMultiplier = isFleeing ? 2.0 : 1.5; // Stronger separation when fleeing
            const separationIntensity = isFleeing ? 1.0 : flockingIntensity; // Full separation when fleeing
            forces.x += separationSteering.x * separationMultiplier * separationIntensity;
            forces.y += separationSteering.y * separationMultiplier * separationIntensity;
        }
        
        // Apply forces - forces are already correctly calculated above:
        // When fleeing: forces only contains separation (alignment/cohesion skipped above)
        // When not fleeing: forces contains all flocking forces (separation, alignment, cohesion)
        // So we can apply forces unconditionally - the conditional above already filtered what goes into forces
        this.velocity.x += forces.x;
        this.velocity.y += forces.y;
        
        // Limit velocity (with flee speed boost if fleeing)
        const maxSpeed = isFleeing ? this.maxSpeed * (window.BoidConfig?.BEHAVIOR_CONFIG?.fleeSpeed || 1.3) : this.maxSpeed;
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(this.velocity, maxSpeed);
        }
        
        // Enforce minimum speed to prevent stationary fry
        const minSpeed = window.BoidConfig?.BEHAVIOR_CONFIG?.minSpeed || 0.5;
        if (window.Utils && window.Utils.enforceMinimumSpeed) {
            window.Utils.enforceMinimumSpeed(this.velocity, minSpeed);
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

    update(boids, predators, food, krill, poop, fertilizedEggs = []) {
        // Update frame counter
        this.frameCount++;
        
        // Check for threats (for fleeing state) - similar to how tuna handles it
        // PRIORITY ORDER: Fleeing > All other states (spawning, feeding, foraging, hunting)
        // IMPORTANT: Fleeing has absolute priority - override all other states
        const squids = (window.gameEntities && window.gameEntities.squid) || [];
        
        // CRITICAL FIX: Ensure predators array is valid and contains tuna
        // Debug logging to verify predators are being passed
        if (window.gameState && window.gameState.fryDebug && this.frameCount % 120 === 0) {
            console.log(`🐟 Fry threat check:`, {
                fishType: this.fishType,
                predatorsCount: predators ? predators.length : 0,
                squidsCount: squids ? squids.length : 0,
                predatorsValid: predators && predators.length > 0 ? predators.filter(p => p && p.x !== undefined && p.y !== undefined).length : 0
            });
        }
        
        const threats = window.boidThreatSystem ? window.boidThreatSystem.findThreats(this, predators, squids) : [];
        
        // Handle fleeing state transitions - fleeing takes priority over ALL states
        if (threats.length > 0) {
            // Threats detected - enter fleeing state (override any current state)
            if (this.behaviorState !== 'fleeing') {
                // Store the previous state so we can restore it when threats are gone
                this.previousStateBeforeFlee = this.behaviorState;
                this.behaviorState = 'fleeing';
                if (window.gameState && window.gameState.fryDebug) {
                    console.log(`🐟 Fry ${this.fishType} entering fleeing state due to ${threats.length} threat(s) (was ${this.previousStateBeforeFlee})`);
                }
            }
            // If already fleeing, stay fleeing (don't overwrite previousStateBeforeFlee)
        } else if (this.behaviorState === 'fleeing') {
            // No threats and we're fleeing - restore previous state
            // Only restore if we have a stored previous state (don't default to foraging if we don't know)
            if (this.previousStateBeforeFlee) {
                const stateToRestore = this.previousStateBeforeFlee;
                this.behaviorState = stateToRestore;
                
                // CRITICAL FIX: Reset timers when restoring feeding/spawning states from fleeing
                // This prevents expired timers from immediately breaking the restored state
                if (stateToRestore === 'feeding' && this.feedingTimer !== undefined) {
                    // Reset feeding timer so feeding state has time to work after fleeing
                    this.feedingTimer = 0;
                }
                if (stateToRestore === 'spawning' && this.spawningProperties?.spawningTimer !== undefined) {
                    // Reset spawning timer so spawning state has time to work after fleeing
                    this.spawningProperties.spawningTimer = 0;
                }
                
                this.previousStateBeforeFlee = null;
                if (window.gameState && window.gameState.fryDebug) {
                    console.log(`🐟 Fry ${this.fishType} returning to ${stateToRestore} (no threats, timers reset)`);
                }
            } else {
                // No stored previous state, default to foraging
                this.behaviorState = 'foraging';
                if (window.gameState && window.gameState.fryDebug) {
                    console.log(`🐟 Fry ${this.fishType} returning to foraging (no threats, no previous state)`);
                }
            }
        }
        
        // Debug logging for fry movement
        if (window.gameState && window.gameState.fryDebug && this.frameCount % 60 === 0) {
            console.log(`🐟 Fry update:`, {
                fishType: this.fishType,
                position: { x: Math.round(this.x), y: Math.round(this.y) },
                velocity: { x: Math.round(this.velocity.x * 100) / 100, y: Math.round(this.velocity.y * 100) / 100 },
                behaviorState: this.behaviorState,
                threats: threats.length,
                maxSpeed: this.maxSpeed,
                energy: this.energy
            });
        }
        
        // Apply fleeing forces if in fleeing state (before flocking)
        if (this.behaviorState === 'fleeing' && window.boidThreatSystem && threats.length > 0) {
            window.boidThreatSystem.applyFleeForces(this, threats);
        }
        
        // Apply flocking and feeding systems (direct velocity modification like original)
        // Note: When fleeing, flocking will be reduced/modified by the flock method
        this.flock(boids, predators, food, krill);
        
        // Check for food (feeding system handles state transitions properly)
        // The feeding system respects fleeing, feeding, spawning, and cooldown states
        this.checkForFood(krill, food, poop, fertilizedEggs);
        
        this.move();
        this.edges();
    }
    
    checkForFood(krillArray, fishFoodArray, poopArray, fertilizedEggsArray = []) {
        if (this.feedingSystem && this.feedingSystem.checkForFood) {
            this.feedingSystem.checkForFood(this, krillArray, fishFoodArray, poopArray, fertilizedEggsArray);
        }
    }

    draw() {
        if (this.renderingSystem && this.renderingSystem.draw) {
            this.renderingSystem.draw(this);
        }
    }
}

// Export for global access
window.Boid = Boid; 