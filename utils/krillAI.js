// Krill AI System - Advanced behavioral states and swarm intelligence
// Handles foraging, hunting, fleeing, resting, and group migration behaviors

const KRILL_STATES = {
    FORAGING: 'foraging',      // Searching for food (poop, organic matter)
    SEEKING: 'seeking',        // Actively pursuing detected food
    EATING: 'eating',          // Consuming food
    FLEEING: 'fleeing',        // Escaping from predators
    RESTING: 'resting',        // Low-energy conservation mode
    SWARMING: 'swarming',      // Group formation behavior
    MIGRATING: 'migrating',    // Vertical migration with swarm
    SPAWNING: 'spawning'       // Reproduction behavior
};

const KRILL_CONFIG = {
    // Behavioral parameters
    SWARM_RADIUS: 240,          // Distance to consider other krill for swarming (doubled from 120)
    SWARM_MIN_SIZE: 8,          // Minimum group size for migration
    SWARM_OPTIMAL_SIZE: 15,     // Optimal swarm size
    MIGRATION_THRESHOLD: 8,     // Minimum swarm size to trigger migration (reduced from 12)
    
    // State transition thresholds
    HUNGER_THRESHOLD: 0.7,      // When to prioritize food seeking
    FEAR_THRESHOLD: 0.8,        // When to enter flee state
    REST_THRESHOLD: 0.3,        // Energy level to enter rest state
    ENERGY_RECOVERY: 0.6,       // Energy level to exit rest state
    
    // Post-migration resting (reduced to half)
    POST_MIGRATION_REST_DURATION: 9000, // 9 seconds (reduced from 18 seconds)
    POST_MIGRATION_REST_ENERGY_GAIN: 0.001, // Slower energy recovery during post-migration rest
    
    // Behavioral ranges
    FOOD_DETECTION_RANGE: 120,   // Range to detect food (doubled from 60)
    PREDATOR_DETECTION_RANGE: 150, // Range to detect threats
    COMMUNICATION_RANGE: 160,    // Range for swarm communication (doubled from 80)
    
    // Migration parameters  
    MIGRATION_CYCLE_LENGTH: 150000, // 2.5 minutes in milliseconds (increased by 25% from 2 minutes)
    MIGRATION_DEPTH_RANGE: 0.4,  // 40% of world height range
    DEEP_WATER_PREFERENCE: 0.75, // Prefer 75% depth
    SURFACE_MIGRATION_DEPTH: 0.25, // Surface migration target
    SURFACE_FORAGING_THRESHOLD: 0.05, // Within 5% of surface depth = at surface (for surface foraging feature)
    
    // Behavioral weights
    WEIGHTS: {
        SEPARATION: 1.5,
        ALIGNMENT: 1.0,
        COHESION: 1.2,
        FOOD_SEEK: 2.0,
        PREDATOR_AVOID: 3.0,
        DEPTH_PREFERENCE: 0.8,
        SWARM_COHESION: 1.8,
        MIGRATION: 1.0
    }
};

// Export for global access
if (typeof window !== 'undefined') {
    window.KRILL_STATES = KRILL_STATES;
    window.KRILL_CONFIG = KRILL_CONFIG;
}

class KrillBehaviorTree {
    constructor(krill) {
        this.krill = krill;
        this.lastStateChangeTime = Date.now();
        this.stateHistory = [];
        this.maxStateHistory = 10;
        this.previousState = null;
    }
    
    // Main decision tree for krill behavior
    evaluateState(nearbyKrill, predators, food, poop, sperm = []) {
        const currentTime = Date.now();
        const timeSinceLastChange = currentTime - this.lastStateChangeTime;
        
        // Prevent rapid state changes (minimum 500ms between changes)
        if (timeSinceLastChange < 500) {
            return this.krill.behaviorState;
        }
        
        // Emergency flee state - highest priority
        if (this.detectPredatorThreat(predators)) {
            return this.changeState(KRILL_STATES.FLEEING);
        }
        
        // Eating state - if food is very close
        if (this.isEatingFood(poop, food, sperm)) {
            return this.changeState(KRILL_STATES.EATING);
        }
        
        // Post-migration pause - use swarming instead of resting, then resume migration
        if (this.krill.wasMigrating && this.krill.energy < KRILL_CONFIG.ENERGY_RECOVERY) {
            // Mark duration-based pause (old post-migration rest)
            this.krill.migrationPauseType = 'duration';
            this.krill.resumeMigrationAfterPause = true;
            return this.changeState(KRILL_STATES.SWARMING);
        }
        
        // Energy-based state decisions
        if (this.krill.energy < KRILL_CONFIG.REST_THRESHOLD) {
            // During migration, pause by swarming instead of resting
            if (this.krill.behaviorState === KRILL_STATES.MIGRATING || this.krill.wasMigrating) {
                // Mark energy-based pause; resume when energy recovers
                this.krill.migrationPauseType = 'energy';
                this.krill.resumeMigrationAfterPause = true;
                return this.changeState(KRILL_STATES.SWARMING);
            }
            return this.changeState(KRILL_STATES.RESTING);
        }
        
        // Food seeking - high priority when hungry
        if (this.krill.hunger > KRILL_CONFIG.HUNGER_THRESHOLD) {
            const nearbyFood = this.detectFood(poop, food, sperm);
            if (nearbyFood) {
                return this.changeState(KRILL_STATES.SEEKING);
            }
        }
        
        // ADDITIONAL FEATURE: Allow foraging/seeking at surface during migration
        // When krill reach surface during migration, they can forage/seek while maintaining migration state
        if (this.krill.behaviorState === KRILL_STATES.MIGRATING) {
            const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
            const surfaceDepth = WORLD_HEIGHT * KRILL_CONFIG.SURFACE_MIGRATION_DEPTH;
            const surfaceThreshold = WORLD_HEIGHT * KRILL_CONFIG.SURFACE_FORAGING_THRESHOLD;
            const distanceFromSurface = Math.abs(this.krill.y - surfaceDepth);
            const isAtSurface = distanceFromSurface < surfaceThreshold;
            
            // If at surface, allow normal foraging/seeking behavior (but keep migration state for coordination)
            // This allows krill to forage at surface while still being part of the migration swarm
            if (isAtSurface) {
                // Check for food seeking first (higher priority)
                const nearbyFood = this.detectFood(poop, food, sperm);
                if (nearbyFood) {
                    this.krill.seekTarget = nearbyFood;
                    // Stay in MIGRATING state but allow seeking forces to work (handled in force calculation)
                }
                // Foraging behavior will naturally occur due to reduced migration forces
            }
        }
        
        // Swarm behavior evaluation
        const swarmInfo = this.evaluateSwarmConditions(nearbyKrill);
        if (swarmInfo.shouldMigrate) {
            return this.changeState(KRILL_STATES.MIGRATING);
        } else if (swarmInfo.shouldSwarm) {
            return this.changeState(KRILL_STATES.SWARMING);
        }
        
        // Default to foraging
        return this.changeState(KRILL_STATES.FORAGING);
    }
    
    changeState(newState) {
        if (this.krill.behaviorState !== newState) {
            this.stateHistory.push({
                from: this.krill.behaviorState,
                to: newState,
                time: Date.now()
            });
            
            if (this.stateHistory.length > this.maxStateHistory) {
                this.stateHistory.shift();
            }
            
            // Track previous state for transition-aware logic
            this.previousState = this.krill.behaviorState;
            this.krill.behaviorState = newState;
            this.lastStateChangeTime = Date.now();
            this.onStateChange(newState);
        }
        return newState;
    }
    
    onStateChange(newState) {
        // Reset state-specific properties
        switch (newState) {
            case KRILL_STATES.FLEEING:
                this.krill.fleeTarget = null;
                this.krill.fleeIntensity = 1.0;
                break;
            case KRILL_STATES.SEEKING:
                this.krill.seekTarget = null;
                break;
            case KRILL_STATES.SWARMING:
                this.krill.swarmCenter = null;
                this.krill.swarmSize = 0;
                // If we paused migration due to low energy, use swarming as the pause state
                if (this.previousState === KRILL_STATES.MIGRATING) {
                    this.krill.postMigrationRest = true;
                    this.krill.postMigrationRestStart = Date.now();
                    // Prevent immediate re-trigger loops
                    this.krill.wasMigrating = false;
                    this.krill.resumeMigrationAfterPause = true;
                }
                break;
            case KRILL_STATES.MIGRATING:
                this.krill.migrationTarget = null;
                this.krill.migrationPhase = this.calculateMigrationPhase();
                this.krill.wasMigrating = true; // Track that krill was migrating
                break;
            case KRILL_STATES.RESTING:
                this.krill.restStartTime = Date.now();
                // Check if this is post-migration rest
                if (this.krill.wasMigrating) {
                    // We now prefer swarming as the pause state; mark flags but do not remain resting
                    this.krill.postMigrationRest = true;
                    this.krill.postMigrationRestStart = Date.now();
                    this.krill.resumeMigrationAfterPause = true;
                    this.krill.wasMigrating = false; // Reset migration flag
                    // Immediately switch to swarming to represent the pause behavior
                    this.krill.behaviorState = KRILL_STATES.SWARMING;
                }
                break;
        }
    }
    
    // Detect immediate predator threats
    detectPredatorThreat(predators) {
        for (let predator of predators) {
            const distance = this.distanceToTarget(predator);
            const threatLevel = this.calculateThreatLevel(predator, distance);
            
            if (threatLevel > KRILL_CONFIG.FEAR_THRESHOLD) {
                this.krill.fleeTarget = predator;
                this.krill.fleeIntensity = Math.min(1.0, threatLevel);
                return true;
            }
        }
        return false;
    }
    
    // Calculate threat level based on predator type and distance
    calculateThreatLevel(predator, distance) {
        if (distance > KRILL_CONFIG.PREDATOR_DETECTION_RANGE) return 0;
        
        let baseThreat = 0.5;
        
        // Different threat levels for different predator types
                        if (predator.fishType === 'tuna') {
            baseThreat = 0.3; // Tuna don't actively hunt krill
        } else if (predator.type === 'squid' || predator.type === 'giantSquid') {
            baseThreat = 0.9; // Squid are major threats
        } else if (predator.fishType && predator.fishType.includes('smallFry')) {
            baseThreat = 0.7; // Small fry actively eat krill
        }
        
        // Distance-based threat calculation
        const proximityFactor = 1 - (distance / KRILL_CONFIG.PREDATOR_DETECTION_RANGE);
        return baseThreat * proximityFactor;
    }
    
    // Check if currently eating food
    isEatingFood(poop, food, sperm = []) {
        const eatRadius = this.krill.size / 2 + 5;
        
        // Check poop (preferred food)
        for (let p of poop) {
            if (p.isActive && p.state >= 2) { // Only aged/deep poop
                if (this.distanceToTarget(p) < eatRadius) {
                    return true;
                }
            }
        }
        
        // Check sperm (high nutrition, easy to catch)
        for (let s of sperm) {
            if (!s.eaten && this.distanceToTarget(s) < eatRadius) {
                return true;
            }
        }
        
        // Check fish food
        for (let f of food) {
            if (!f.eaten && this.distanceToTarget(f) < eatRadius) {
                return true;
            }
        }
        
        return false;
    }
    
    // Detect nearby food sources
    detectFood(poop, food, sperm = []) {
        let closest = null;
        let closestDistSquared = KRILL_CONFIG.FOOD_DETECTION_RANGE * KRILL_CONFIG.FOOD_DETECTION_RANGE;
        
        // Check poop first (preferred food source)
        for (let p of poop) {
            if (p.isActive && p.state >= 2) {
                const distSquared = this.distanceToTarget(p) ** 2;
                if (distSquared < closestDistSquared) {
                    closest = p;
                    closestDistSquared = distSquared;
                }
            }
        }
        
        // Check sperm second (high nutrition, easy to catch)
        if (!closest) {
            for (let s of sperm) {
                if (!s.eaten) {
                    const distSquared = this.distanceToTarget(s) ** 2;
                    if (distSquared < closestDistSquared) {
                        closest = s;
                        closestDistSquared = distSquared;
                    }
                }
            }
        }
        
        // Check fish food if no poop or sperm found
        if (!closest) {
            for (let f of food) {
                if (!f.eaten) {
                    const distSquared = this.distanceToTarget(f) ** 2;
                    if (distSquared < closestDistSquared) {
                        closest = f;
                        closestDistSquared = distSquared;
                    }
                }
            }
        }
        
        if (closest) {
            this.krill.seekTarget = closest;
            return closest;
        }
        
        return null;
    }
    
    // Evaluate swarm conditions and migration triggers
    evaluateSwarmConditions(nearbyKrill) {
        const swarmmates = this.findSwarmmates(nearbyKrill);
        const swarmSize = swarmmates.length;
        
        // Update krill's swarm info
        this.krill.swarmSize = swarmSize;
        if (swarmSize > 0) {
            const centerX = swarmmates.reduce((sum, k) => sum + k.x, 0) / swarmSize;
            const centerY = swarmmates.reduce((sum, k) => sum + k.y, 0) / swarmSize;
            this.krill.swarmCenter = { x: centerX, y: centerY };
        }
        
        return {
            shouldSwarm: swarmSize >= KRILL_CONFIG.SWARM_MIN_SIZE,
            shouldMigrate: this.shouldTriggerMigration(swarmmates, swarmSize),
            swarmSize: swarmSize
        };
    }
    
    findSwarmmates(nearbyKrill) {
        return nearbyKrill.filter(k => 
            k !== this.krill && 
            k.behaviorState !== KRILL_STATES.FLEEING &&
            this.distanceToTarget(k) < KRILL_CONFIG.SWARM_RADIUS
        );
    }
    
    shouldTriggerMigration(swarmmates, swarmSize) {
        if (swarmSize < KRILL_CONFIG.MIGRATION_THRESHOLD) return false;
        
        // Check if enough swarmmates are also ready to migrate
        const readyToMigrate = swarmmates.filter(k => 
            k.behaviorState === KRILL_STATES.SWARMING || 
            k.behaviorState === KRILL_STATES.FORAGING
        ).length;
        
        return readyToMigrate >= KRILL_CONFIG.MIGRATION_THRESHOLD * 0.7;
    }
    
    calculateMigrationPhase() {
        const currentTime = Date.now();
        const cyclePosition = (currentTime % KRILL_CONFIG.MIGRATION_CYCLE_LENGTH) / KRILL_CONFIG.MIGRATION_CYCLE_LENGTH;
        return cyclePosition;
    }
    
    distanceToTarget(target) {
        const dx = this.krill.x - target.x;
        const dy = this.krill.y - target.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class KrillAI {
    constructor() {
        this.behaviorTrees = new Map();
    }
    
    // Get or create behavior tree for krill
    getBehaviorTree(krill) {
        if (!this.behaviorTrees.has(krill)) {
            this.behaviorTrees.set(krill, new KrillBehaviorTree(krill));
        }
        return this.behaviorTrees.get(krill);
    }
    
    // Main AI update function
    updateKrillBehavior(krill, nearbyKrill, predators, food, poop, sperm = []) {
        const behaviorTree = this.getBehaviorTree(krill);
        
        // Evaluate and update behavior state
        const newState = behaviorTree.evaluateState(nearbyKrill, predators, food, poop, sperm);
        
        // Calculate steering forces based on current state
        const steeringForces = this.calculateSteeringForces(krill, nearbyKrill, predators, food, poop, sperm);
        
        // Apply forces to krill velocity
        this.applySteeringForces(krill, steeringForces);
        
        // Update krill properties based on behavior
        this.updateKrillProperties(krill);
        
        return {
            state: newState,
            forces: steeringForces,
            swarmInfo: krill.swarmSize ? {
                size: krill.swarmSize,
                center: krill.swarmCenter
            } : null
        };
    }
    
    // Calculate all steering forces based on current behavior state
    calculateSteeringForces(krill, nearbyKrill, predators, food, poop, sperm = []) {
        const forces = {
            separation: { x: 0, y: 0 },
            alignment: { x: 0, y: 0 },
            cohesion: { x: 0, y: 0 },
            foodSeek: { x: 0, y: 0 },
            predatorAvoid: { x: 0, y: 0 },
            depthPreference: { x: 0, y: 0 },
            swarmCohesion: { x: 0, y: 0 },
            migration: { x: 0, y: 0 },
            wandering: { x: 0, y: 0 }
        };
        
        // State-specific force calculations
        switch (krill.behaviorState) {
            case KRILL_STATES.FORAGING:
                this.calculateForagingForces(krill, nearbyKrill, forces);
                break;
                
            case KRILL_STATES.SEEKING:
                this.calculateSeekingForces(krill, nearbyKrill, forces);
                break;
                
            case KRILL_STATES.FLEEING:
                this.calculateFleeingForces(krill, predators, forces);
                break;
                
            case KRILL_STATES.SWARMING:
                this.calculateSwarmingForces(krill, nearbyKrill, forces);
                break;
                
            case KRILL_STATES.MIGRATING:
                this.calculateMigrationForces(krill, nearbyKrill, forces);
                break;
                
            case KRILL_STATES.RESTING:
                // Resting path retained for non-migration-related rests, but migration pauses use swarming
                this.calculateRestingForces(krill, nearbyKrill, forces);
                break;
        }
        
        // Always calculate basic avoidance regardless of state
        this.calculatePredatorAvoidance(krill, predators, forces);
        
        // Always maintain depth preference
        this.calculateDepthPreference(krill, forces);
        
        // ADDITIONAL FEATURE: Surface foraging during migration
        // When krill reach the surface during migration phase, allow normal foraging/seeking behavior
        // while maintaining surface depth with reduced migration forces
        if (krill.behaviorState === KRILL_STATES.MIGRATING) {
            const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
            const surfaceDepth = WORLD_HEIGHT * KRILL_CONFIG.SURFACE_MIGRATION_DEPTH;
            const surfaceThreshold = WORLD_HEIGHT * KRILL_CONFIG.SURFACE_FORAGING_THRESHOLD;
            const distanceFromSurface = Math.abs(krill.y - surfaceDepth);
            
            // If krill is at surface (within threshold), reduce migration forces to allow foraging/seeking
            if (distanceFromSurface < surfaceThreshold) {
                // Reduce migration forces significantly - let foraging/seeking forces dominate
                forces.migration.y *= 0.2; // 80% reduction
                forces.migration.x *= 0.2;
                
                // FIXED: Apply foraging/seeking forces WITHOUT flocking to prevent double application
                // Flocking is already applied via calculateMigrationForces → calculateSwarmingForces
                // So we only apply food-seeking or wandering forces, not the full methods
                if (krill.seekTarget) {
                    // Apply food seeking force only (no flocking - already applied via migration)
                    const dx = krill.seekTarget.x - krill.x;
                    const dy = krill.seekTarget.y - krill.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        forces.foodSeek.x = (dx / distance) * KRILL_CONFIG.WEIGHTS.FOOD_SEEK;
                        forces.foodSeek.y = (dy / distance) * KRILL_CONFIG.WEIGHTS.FOOD_SEEK;
                    }
                } else {
                    // Apply wandering behavior only (no flocking - already applied via migration)
                    const wanderAngle = (Date.now() / 1000 + krill.wanderOffset || 0) * 0.1;
                    forces.wandering.x = Math.cos(wanderAngle) * 0.3;
                    forces.wandering.y = Math.sin(wanderAngle) * 0.2;
                }
                // Don't override depth preference - allow natural behavior
                // This allows krill to forage and seek at surface while staying near surface depth
            }
        }
        
        return forces;
    }
    
    calculateForagingForces(krill, nearbyKrill, forces) {
        // Basic flocking with reduced intensity
        this.calculateBasicFlocking(krill, nearbyKrill, forces, 0.6);
        
        // Wandering behavior - random exploration
        const wanderAngle = (Date.now() / 1000 + krill.wanderOffset || 0) * 0.1;
        forces.wandering.x = Math.cos(wanderAngle) * 0.3;
        forces.wandering.y = Math.sin(wanderAngle) * 0.2;
    }
    
    calculateSeekingForces(krill, nearbyKrill, forces) {
        // Reduced flocking when seeking food
        this.calculateBasicFlocking(krill, nearbyKrill, forces, 0.3);
        
        // Strong food seeking
        if (krill.seekTarget) {
            const dx = krill.seekTarget.x - krill.x;
            const dy = krill.seekTarget.y - krill.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                forces.foodSeek.x = (dx / distance) * KRILL_CONFIG.WEIGHTS.FOOD_SEEK;
                forces.foodSeek.y = (dy / distance) * KRILL_CONFIG.WEIGHTS.FOOD_SEEK;
            }
        }
    }
    
    calculateFleeingForces(krill, predators, forces) {
        // Strong predator avoidance
        if (krill.fleeTarget) {
            const dx = krill.x - krill.fleeTarget.x;
            const dy = krill.y - krill.fleeTarget.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const intensity = krill.fleeIntensity || 1.0;
                forces.predatorAvoid.x = (dx / distance) * KRILL_CONFIG.WEIGHTS.PREDATOR_AVOID * intensity;
                forces.predatorAvoid.y = (dy / distance) * KRILL_CONFIG.WEIGHTS.PREDATOR_AVOID * intensity;
            }
        }
        
        // Emergency schooling - stick close to other fleeing krill
        const fleeingNearby = krill.nearbyKrill?.filter(k => k.behaviorState === KRILL_STATES.FLEEING) || [];
        if (fleeingNearby.length > 0) {
            this.calculateBasicFlocking(krill, fleeingNearby, forces, 1.5);
        }
    }
    
    calculateSwarmingForces(krill, nearbyKrill, forces) {
        // Enhanced flocking for swarm formation
        this.calculateBasicFlocking(krill, nearbyKrill, forces, 1.2);
        
        // Swarm cohesion - move toward swarm center
        if (krill.swarmCenter) {
            const dx = krill.swarmCenter.x - krill.x;
            const dy = krill.swarmCenter.y - krill.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                forces.swarmCohesion.x = (dx / distance) * KRILL_CONFIG.WEIGHTS.SWARM_COHESION;
                forces.swarmCohesion.y = (dy / distance) * KRILL_CONFIG.WEIGHTS.SWARM_COHESION;
            }
        }

        // If swarming is used as a migration pause, either wait a duration or until energy recovers, then resume
        if (krill.resumeMigrationAfterPause) {
            if (krill.migrationPauseType === 'duration' && krill.postMigrationRest) {
                const restDuration = Date.now() - (krill.postMigrationRestStart || 0);
                if (restDuration < KRILL_CONFIG.POST_MIGRATION_REST_DURATION) {
                    // Recover some energy during the pause
                    krill.energy = Math.min(1.0, krill.energy + KRILL_CONFIG.POST_MIGRATION_REST_ENERGY_GAIN);
                } else {
                    // Duration-based pause complete - resume migration
                    krill.postMigrationRest = false;
                    krill.postMigrationRestStart = null;
                    krill.resumeMigrationAfterPause = false;
                    krill.migrationPauseType = null;
                    krill.wasMigrating = true;
                    krill.behaviorState = KRILL_STATES.MIGRATING;
                }
            } else if (krill.migrationPauseType === 'energy') {
                // Recover energy during swarming pause
                krill.energy = Math.min(1.0, krill.energy + KRILL_CONFIG.POST_MIGRATION_REST_ENERGY_GAIN);
                if (krill.energy > KRILL_CONFIG.ENERGY_RECOVERY) {
                    // Energy-based pause complete - resume migration
                    krill.resumeMigrationAfterPause = false;
                    krill.migrationPauseType = null;
                    krill.wasMigrating = true;
                    krill.behaviorState = KRILL_STATES.MIGRATING;
                }
            }
        }
    }
    
    calculateMigrationForces(krill, nearbyKrill, forces) {
        // Maintain swarm cohesion during migration
        this.calculateSwarmingForces(krill, nearbyKrill, forces);
        
        // Calculate migration target based on phase (update phase every frame)
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        krill.migrationPhase = this.calculateMigrationPhase(); // Update phase continuously
        const phase = krill.migrationPhase;
        
        let baseTargetDepth;
        if (phase > 0.3 && phase < 0.7) {
            // Migration upward phase (40% of cycle)
            baseTargetDepth = WORLD_HEIGHT * KRILL_CONFIG.SURFACE_MIGRATION_DEPTH;
        } else {
            // Return to deep water phase (60% of cycle)
            baseTargetDepth = WORLD_HEIGHT * KRILL_CONFIG.DEEP_WATER_PREFERENCE;
        }
        
        // Add individual depth variation per krill to prevent all stacking at same Y
        // Use krill's wanderOffset as a seed for consistent per-krill variation
        // Use both sine and cosine for better distribution, increased to ±650 pixels (30% increase from 500)
        const timeOffset = (krill.wanderOffset || 0) + Date.now() * 0.0001;
        const depthVariation = (Math.sin(timeOffset) + Math.cos(timeOffset * 1.7)) * 325; // ±650 pixels variation (30% increase from ±500)
        const targetDepth = baseTargetDepth + depthVariation;
        
        // Add individual horizontal target variation per krill (similar to vertical variation)
        // Use a different offset seed (wanderOffset * 2.3) for independent horizontal variation
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const horizontalTimeOffset = (krill.wanderOffset || 0) * 2.3 + Date.now() * 0.0001;
        const horizontalVariation = (Math.sin(horizontalTimeOffset) + Math.cos(horizontalTimeOffset * 1.9)) * 162.5; // ±325 pixels variation (30% increase from ±250)
        
        // Calculate base horizontal target (use swarm center if available, otherwise world center)
        let baseTargetX = WORLD_WIDTH / 2; // Default to world center
        if (nearbyKrill.length > 0) {
            // Use swarm center as base for horizontal targeting
            let swarmCenterX = 0;
            for (let other of nearbyKrill) {
                swarmCenterX += other.x;
            }
            swarmCenterX /= nearbyKrill.length;
            baseTargetX = swarmCenterX;
        }
        
        const targetX = baseTargetX + horizontalVariation;
        
        // Apply migration forces (slightly reduced to allow separation to work better)
        const depthDiff = krill.y - targetDepth;
        let baseMigrationY = -depthDiff * KRILL_CONFIG.WEIGHTS.MIGRATION * 0.015; // Reduced from 0.02 to allow separation
        
        // Add randomization to vertical migration movement for more natural up/down behavior
        // Use a different seed pattern for vertical randomization (independent from other variations)
        const verticalRandomSeed = ((krill.wanderOffset || 0) * 1.5 + Date.now() * 0.0002) % (Math.PI * 2);
        const verticalRandomVariation = (Math.sin(verticalRandomSeed) + Math.cos(verticalRandomSeed * 2.1)) * 0.45; // ±0.9 variation (increased from ±0.6 for more randomness)
        // Add the random component to migration force (increased multiplier for more noticeable randomness)
        forces.migration.y = baseMigrationY + (verticalRandomVariation * 0.006);
        
        // Apply horizontal migration force towards target X
        const horizontalDiff = krill.x - targetX;
        forces.migration.x = -horizontalDiff * KRILL_CONFIG.WEIGHTS.MIGRATION * 0.015; // Same strength as vertical
        
        // Add random movement during migration to break up stacking (increased randomness)
        // Use a seed based on krill's offset for consistent randomness per krill
        const randomSeed = ((krill.wanderOffset || 0) + Date.now() * 0.001) % (Math.PI * 2);
        const randomAngle = randomSeed + Math.random() * 1.2; // Increased random variation (from 0.9 to 1.2 for more randomness)
        const randomStrength = 0.18; // Increased random movement (from 0.13 to 0.18) for more natural migration randomness
        forces.wandering.x += Math.cos(randomAngle) * randomStrength;
        forces.wandering.y += Math.sin(randomAngle) * randomStrength * 0.75; // Increased vertical randomness (from 0.6 to 0.75) for more variation
        
        // Additional separation force for very close krill during migration to prevent stacking
        // This works alongside the basic flocking separation but is stronger
        let closeSeparationX = 0;
        let closeSeparationY = 0;
        let closeSeparationCount = 0;
        const closeSeparationDistance = 50; // Check within 50 pixels
        for (let other of nearbyKrill) {
            if (other === krill) continue;
            const dx = krill.x - other.x;
            const dy = krill.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < closeSeparationDistance) {
                // Strong repulsion - stronger when closer
                const repulsionStrength = (1 - distance / closeSeparationDistance) * 5.0;
                closeSeparationX += (dx / distance) * repulsionStrength;
                closeSeparationY += (dy / distance) * repulsionStrength;
                closeSeparationCount++;
            }
        }
        
        // Add additional separation to existing separation forces
        if (closeSeparationCount > 0) {
            closeSeparationX /= closeSeparationCount;
            closeSeparationY /= closeSeparationCount;
            // Add to existing separation (don't override, but strengthen it)
            forces.separation.x += closeSeparationX * 0.3;
            forces.separation.y += closeSeparationY * 0.3;
        }
        
        // Override depth preference during migration
        forces.depthPreference.y = 0; // Disable depth preference force during migration
    }
    
    calculateRestingForces(krill, nearbyKrill, forces) {
        // Minimal movement during rest
        this.calculateBasicFlocking(krill, nearbyKrill, forces, 0.2);
        
        // Check if this is post-migration rest
        if (krill.postMigrationRest) {
            const restDuration = Date.now() - krill.postMigrationRestStart;
            
            // Post-migration rest: longer duration and slower energy recovery
            if (restDuration < KRILL_CONFIG.POST_MIGRATION_REST_DURATION) {
                // Slower energy recovery during post-migration rest
                krill.energy = Math.min(1.0, krill.energy + KRILL_CONFIG.POST_MIGRATION_REST_ENERGY_GAIN);
            } else {
                // Post-migration rest complete
                krill.postMigrationRest = false;
                krill.postMigrationRestStart = null;
                krill.behaviorState = KRILL_STATES.FORAGING;
            }
        } else {
            // Normal rest: standard energy recovery
            krill.energy = Math.min(1.0, krill.energy + 0.002);
            
            // Exit rest state when energy recovers
            if (krill.energy > KRILL_CONFIG.ENERGY_RECOVERY) {
                krill.behaviorState = KRILL_STATES.FORAGING;
            }
        }
    }
    
    calculateBasicFlocking(krill, nearbyKrill, forces, intensity = 1.0) {
        let separationCount = 0;
        let alignmentCount = 0;
        let cohesionCount = 0;
        
        for (let other of nearbyKrill) {
            if (other === krill) continue;
            
            const dx = krill.x - other.x;
            const dy = krill.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < KRILL_CONFIG.SWARM_RADIUS) {
                // Separation
                if (distance < 30) {
                    forces.separation.x += (dx / distance) * intensity;
                    forces.separation.y += (dy / distance) * intensity;
                    separationCount++;
                }
                
                // Alignment
                forces.alignment.x += other.velocity.x * intensity;
                forces.alignment.y += other.velocity.y * intensity;
                alignmentCount++;
                
                // Cohesion
                forces.cohesion.x -= dx * intensity * 0.005;
                forces.cohesion.y -= dy * intensity * 0.005;
                cohesionCount++;
            }
        }
        
        // Normalize forces
        if (separationCount > 0) {
            forces.separation.x /= separationCount;
            forces.separation.y /= separationCount;
        }
        
        if (alignmentCount > 0) {
            forces.alignment.x /= alignmentCount;
            forces.alignment.y /= alignmentCount;
        }
        
        if (cohesionCount > 0) {
            forces.cohesion.x /= cohesionCount;
            forces.cohesion.y /= cohesionCount;
        }
    }
    
    calculatePredatorAvoidance(krill, predators, forces) {
        for (let predator of predators) {
            const dx = krill.x - predator.x;
            const dy = krill.y - predator.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < KRILL_CONFIG.PREDATOR_DETECTION_RANGE && distance > 0) {
                const strength = KRILL_CONFIG.PREDATOR_DETECTION_RANGE / distance;
                forces.predatorAvoid.x += (dx / distance) * strength * 0.5;
                forces.predatorAvoid.y += (dy / distance) * strength * 0.5;
            }
        }
    }
    
    calculateDepthPreference(krill, forces) {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const preferredDepth = WORLD_HEIGHT * KRILL_CONFIG.DEEP_WATER_PREFERENCE;
        const depthDiff = krill.y - preferredDepth;
        
        forces.depthPreference.y = -depthDiff * KRILL_CONFIG.WEIGHTS.DEPTH_PREFERENCE * 0.001;
    }
    
    applySteeringForces(krill, forces) {
        const maxForce = krill.maxForce || 0.04;
        
        // Apply all forces to velocity
        const totalForce = {
            x: forces.separation.x * KRILL_CONFIG.WEIGHTS.SEPARATION +
               forces.alignment.x * KRILL_CONFIG.WEIGHTS.ALIGNMENT +
               forces.cohesion.x * KRILL_CONFIG.WEIGHTS.COHESION +
               forces.foodSeek.x * KRILL_CONFIG.WEIGHTS.FOOD_SEEK +
               forces.predatorAvoid.x * KRILL_CONFIG.WEIGHTS.PREDATOR_AVOID +
               forces.depthPreference.x * KRILL_CONFIG.WEIGHTS.DEPTH_PREFERENCE +
               forces.swarmCohesion.x * KRILL_CONFIG.WEIGHTS.SWARM_COHESION +
               forces.migration.x * KRILL_CONFIG.WEIGHTS.MIGRATION +
               forces.wandering.x,
            
            y: forces.separation.y * KRILL_CONFIG.WEIGHTS.SEPARATION +
               forces.alignment.y * KRILL_CONFIG.WEIGHTS.ALIGNMENT +
               forces.cohesion.y * KRILL_CONFIG.WEIGHTS.COHESION +
               forces.foodSeek.y * KRILL_CONFIG.WEIGHTS.FOOD_SEEK +
               forces.predatorAvoid.y * KRILL_CONFIG.WEIGHTS.PREDATOR_AVOID +
               forces.depthPreference.y * KRILL_CONFIG.WEIGHTS.DEPTH_PREFERENCE +
               forces.swarmCohesion.y * KRILL_CONFIG.WEIGHTS.SWARM_COHESION +
               forces.migration.y * KRILL_CONFIG.WEIGHTS.MIGRATION +
               forces.wandering.y
        };
        
        // Limit force magnitude
        const forceMagnitude = Math.sqrt(totalForce.x * totalForce.x + totalForce.y * totalForce.y);
        if (forceMagnitude > maxForce) {
            totalForce.x = (totalForce.x / forceMagnitude) * maxForce;
            totalForce.y = (totalForce.y / forceMagnitude) * maxForce;
        }
        
        // Apply to velocity
        krill.velocity.x += totalForce.x;
        krill.velocity.y += totalForce.y;
        
        // Limit velocity
        const speed = Math.sqrt(krill.velocity.x * krill.velocity.x + krill.velocity.y * krill.velocity.y);
        const maxSpeed = krill.maxSpeed || 2.0;
        if (speed > maxSpeed) {
            krill.velocity.x = (krill.velocity.x / speed) * maxSpeed;
            krill.velocity.y = (krill.velocity.y / speed) * maxSpeed;
        }
    }
    
    updateKrillProperties(krill) {
        // Update vital stats
        krill.energy = Math.max(0, krill.energy - 0.0002);
        krill.hunger = Math.min(1.0, krill.hunger + 0.0003);
        krill.nutritionLevel = Math.max(0.2, krill.nutritionLevel - 0.0001);
        
        // Update speed based on state and nutrition
        let speedMultiplier = 1.0;
        switch (krill.behaviorState) {
            case KRILL_STATES.FLEEING:
                speedMultiplier = 1.5;
                break;
            case KRILL_STATES.SEEKING:
                speedMultiplier = 1.2;
                break;
            case KRILL_STATES.MIGRATING:
                speedMultiplier = 1.1;
                break;
            case KRILL_STATES.RESTING:
                speedMultiplier = 0.5;
                break;
            case KRILL_STATES.SWARMING:
                speedMultiplier = 0.9;
                break;
        }
        
        const nutritionSpeedBonus = krill.nutritionLevel * 0.3;
        krill.maxSpeed = (1.8 + nutritionSpeedBonus) * speedMultiplier;
    }
    
    calculateMigrationPhase() {
        const currentTime = Date.now();
        const cyclePosition = (currentTime % KRILL_CONFIG.MIGRATION_CYCLE_LENGTH) / KRILL_CONFIG.MIGRATION_CYCLE_LENGTH;
        return cyclePosition;
    }
    
    cleanup() {
        // Clean up old behavior trees
        const currentTime = Date.now();
        for (let [krill, tree] of this.behaviorTrees) {
            if (currentTime - tree.lastStateChangeTime > 60000) { // 1 minute
                this.behaviorTrees.delete(krill);
            }
        }
    }
}

// Create global instance
const krillAI = new KrillAI();

// Export for global access
if (typeof window !== 'undefined') {
    window.krillAI = krillAI;
} 