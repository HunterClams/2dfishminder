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
    SWARM_RADIUS: 120,          // Distance to consider other krill for swarming
    SWARM_MIN_SIZE: 8,          // Minimum group size for migration
    SWARM_OPTIMAL_SIZE: 15,     // Optimal swarm size
    MIGRATION_THRESHOLD: 8,     // Minimum swarm size to trigger migration (reduced from 12)
    
    // State transition thresholds
    HUNGER_THRESHOLD: 0.7,      // When to prioritize food seeking
    FEAR_THRESHOLD: 0.8,        // When to enter flee state
    REST_THRESHOLD: 0.3,        // Energy level to enter rest state
    ENERGY_RECOVERY: 0.6,       // Energy level to exit rest state
    
    // Behavioral ranges
    FOOD_DETECTION_RANGE: 60,   // Range to detect food (reduced from 100)
    PREDATOR_DETECTION_RANGE: 150, // Range to detect threats
    COMMUNICATION_RANGE: 80,    // Range for swarm communication
    
    // Migration parameters  
    MIGRATION_CYCLE_LENGTH: 120000, // 2 minutes in milliseconds (reduced from 4 minutes)
    MIGRATION_DEPTH_RANGE: 0.4,  // 40% of world height range
    DEEP_WATER_PREFERENCE: 0.75, // Prefer 75% depth
    SURFACE_MIGRATION_DEPTH: 0.25, // Surface migration target
    
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

class KrillBehaviorTree {
    constructor(krill) {
        this.krill = krill;
        this.lastStateChangeTime = Date.now();
        this.stateHistory = [];
        this.maxStateHistory = 10;
    }
    
    // Main decision tree for krill behavior
    evaluateState(nearbyKrill, predators, food, poop) {
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
        if (this.isEatingFood(poop, food)) {
            return this.changeState(KRILL_STATES.EATING);
        }
        
        // Energy-based state decisions
        if (this.krill.energy < KRILL_CONFIG.REST_THRESHOLD) {
            return this.changeState(KRILL_STATES.RESTING);
        }
        
        // Food seeking - high priority when hungry
        if (this.krill.hunger > KRILL_CONFIG.HUNGER_THRESHOLD) {
            const nearbyFood = this.detectFood(poop, food);
            if (nearbyFood) {
                return this.changeState(KRILL_STATES.SEEKING);
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
                break;
            case KRILL_STATES.MIGRATING:
                this.krill.migrationTarget = null;
                this.krill.migrationPhase = this.calculateMigrationPhase();
                break;
            case KRILL_STATES.RESTING:
                this.krill.restStartTime = Date.now();
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
        if (predator.fishType === 'tuna' || predator.fishType === 'tuna2') {
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
    isEatingFood(poop, food) {
        const eatRadius = this.krill.size / 2 + 5;
        
        // Check poop (preferred food)
        for (let p of poop) {
            if (p.isActive && p.state >= 2) { // Only aged/deep poop
                if (this.distanceToTarget(p) < eatRadius) {
                    return true;
                }
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
    detectFood(poop, food) {
        let closestFood = null;
        let closestDistance = KRILL_CONFIG.FOOD_DETECTION_RANGE;
        
        // Check poop (preferred)
        for (let p of poop) {
            if (p.isActive && p.state >= 2) {
                const distance = this.distanceToTarget(p);
                if (distance < closestDistance) {
                    closestFood = p;
                    closestDistance = distance;
                }
            }
        }
        
        // Check fish food if no poop found
        if (!closestFood) {
            for (let f of food) {
                if (!f.eaten) {
                    const distance = this.distanceToTarget(f);
                    if (distance < closestDistance) {
                        closestFood = f;
                        closestDistance = distance;
                    }
                }
            }
        }
        
        if (closestFood) {
            this.krill.seekTarget = closestFood;
        }
        
        return closestFood;
    }
    
    // Evaluate swarm conditions and migration readiness
    evaluateSwarmConditions(nearbyKrill) {
        const swarmmates = this.findSwarmmates(nearbyKrill);
        const swarmSize = swarmmates.length + 1; // +1 for self
        
        // Calculate swarm center
        let centerX = this.krill.x;
        let centerY = this.krill.y;
        
        if (swarmmates.length > 0) {
            for (let mate of swarmmates) {
                centerX += mate.x;
                centerY += mate.y;
            }
            centerX /= swarmSize;
            centerY /= swarmSize;
        }
        
        this.krill.swarmCenter = { x: centerX, y: centerY };
        this.krill.swarmSize = swarmSize;
        
        // Check migration conditions
        const shouldMigrate = this.shouldTriggerMigration(swarmmates, swarmSize);
        const shouldSwarm = swarmSize >= 3 && !shouldMigrate;
        
        return {
            swarmSize,
            swarmmates,
            shouldMigrate,
            shouldSwarm,
            swarmCenter: this.krill.swarmCenter
        };
    }
    
    // Find nearby krill for swarming
    findSwarmmates(nearbyKrill) {
        return nearbyKrill.filter(other => {
            if (other === this.krill) return false;
            const distance = this.distanceToTarget(other);
            return distance < KRILL_CONFIG.SWARM_RADIUS;
        });
    }
    
    // Determine if swarm should migrate
    shouldTriggerMigration(swarmmates, swarmSize) {
        if (swarmSize < KRILL_CONFIG.MIGRATION_THRESHOLD) return false;
        
        // Check if enough swarmmates are ready for migration
        const readyCount = swarmmates.filter(mate => {
            return mate.energy > 0.5 && mate.behaviorState !== KRILL_STATES.FLEEING;
        }).length;
        
        return readyCount >= KRILL_CONFIG.MIGRATION_THRESHOLD * 0.8;
    }
    
    // Calculate current migration phase based on time
    calculateMigrationPhase() {
        const currentTime = Date.now();
        const cyclePosition = (currentTime % KRILL_CONFIG.MIGRATION_CYCLE_LENGTH) / KRILL_CONFIG.MIGRATION_CYCLE_LENGTH;
        return cyclePosition;
    }
    
    // Helper function to calculate distance to target
    distanceToTarget(target) {
        const dx = this.krill.x - target.x;
        const dy = this.krill.y - target.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// Advanced krill AI behavior calculator
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
    updateKrillBehavior(krill, nearbyKrill, predators, food, poop) {
        const behaviorTree = this.getBehaviorTree(krill);
        
        // Evaluate and update behavior state
        const newState = behaviorTree.evaluateState(nearbyKrill, predators, food, poop);
        
        // Calculate steering forces based on current state
        const steeringForces = this.calculateSteeringForces(krill, nearbyKrill, predators, food, poop);
        
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
    calculateSteeringForces(krill, nearbyKrill, predators, food, poop) {
        const forces = {
            separation: { x: 0, y: 0 },
            alignment: { x: 0, y: 0 },
            cohesion: { x: 0, y: 0 },
            foodSeek: { x: 0, y: 0 },
            predatorAvoid: { x: 0, y: 0 },
            depthPreference: { x: 0, y: 0 },
            swarmCohesion: { x: 0, y: 0 },
            migration: { x: 0, y: 0 }
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
                this.calculateRestingForces(krill, nearbyKrill, forces);
                break;
        }
        
        // Always calculate basic avoidance regardless of state
        this.calculatePredatorAvoidance(krill, predators, forces);
        
        // Always maintain depth preference
        this.calculateDepthPreference(krill, forces);
        
        return forces;
    }
    
    calculateForagingForces(krill, nearbyKrill, forces) {
        // Basic flocking with reduced intensity
        this.calculateBasicFlocking(krill, nearbyKrill, forces, 0.6);
        
        // Wandering behavior - random exploration
        const wanderAngle = (Date.now() / 1000 + krill.wanderOffset || 0) * 0.1;
        forces.wandering = {
            x: Math.cos(wanderAngle) * 0.3,
            y: Math.sin(wanderAngle) * 0.2
        };
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
    }
    
    calculateMigrationForces(krill, nearbyKrill, forces) {
        // Maintain swarm cohesion during migration
        this.calculateSwarmingForces(krill, nearbyKrill, forces);
        
        // Calculate migration target based on phase (update phase every frame)
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        krill.migrationPhase = this.calculateMigrationPhase(); // Update phase continuously
        const phase = krill.migrationPhase;
        
        let targetDepth;
        if (phase > 0.3 && phase < 0.7) {
            // Migration upward phase (40% of cycle)
            targetDepth = WORLD_HEIGHT * KRILL_CONFIG.SURFACE_MIGRATION_DEPTH;
        } else {
            // Return to deep water phase (60% of cycle)
            targetDepth = WORLD_HEIGHT * KRILL_CONFIG.DEEP_WATER_PREFERENCE;
        }
        
        // Apply stronger migration force
        const depthDiff = krill.y - targetDepth;
        forces.migration.y = -depthDiff * KRILL_CONFIG.WEIGHTS.MIGRATION * 0.02; // Doubled from 0.01
        
        // Override depth preference during migration
        forces.depthPreference.y = 0; // Disable depth preference force during migration
    }
    
    calculateRestingForces(krill, nearbyKrill, forces) {
        // Minimal movement during rest
        this.calculateBasicFlocking(krill, nearbyKrill, forces, 0.2);
        
        // Gradual energy recovery
        krill.energy = Math.min(1.0, krill.energy + 0.002);
        
        // Exit rest state when energy recovers
        if (krill.energy > KRILL_CONFIG.ENERGY_RECOVERY) {
            krill.behaviorState = KRILL_STATES.FORAGING;
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
                forces.cohesion.x -= dx * intensity * 0.01;
                forces.cohesion.y -= dy * intensity * 0.01;
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
            
            if (distance > 0 && distance < KRILL_CONFIG.PREDATOR_DETECTION_RANGE) {
                const threat = this.calculateThreatLevel(predator, distance);
                if (threat > 0.2) {
                    forces.predatorAvoid.x += (dx / distance) * threat;
                    forces.predatorAvoid.y += (dy / distance) * threat;
                }
            }
        }
    }
    
    calculateDepthPreference(krill, forces) {
        // Skip depth preference during migration to avoid interference
        if (krill.behaviorState === KRILL_STATES.MIGRATING) {
            return; // Let migration forces handle depth control
        }
        
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const preferredDepth = WORLD_HEIGHT * KRILL_CONFIG.DEEP_WATER_PREFERENCE;
        const depthDiff = krill.y - preferredDepth;
        
        // Gentle force toward preferred depth
        forces.depthPreference.y = -depthDiff * KRILL_CONFIG.WEIGHTS.DEPTH_PREFERENCE * 0.001;
    }
    
    calculateThreatLevel(predator, distance) {
        // Reuse the threat calculation from behavior tree
        let baseThreat = 0.5;
        
        if (predator.fishType === 'tuna' || predator.fishType === 'tuna2') {
            baseThreat = 0.3;
        } else if (predator.type === 'squid' || predator.type === 'giantSquid') {
            baseThreat = 0.9;
        } else if (predator.fishType && predator.fishType.includes('smallFry')) {
            baseThreat = 0.7;
        }
        
        const proximityFactor = 1 - (distance / KRILL_CONFIG.PREDATOR_DETECTION_RANGE);
        return baseThreat * proximityFactor;
    }
    
    applySteeringForces(krill, forces) {
        const maxForce = krill.maxForce || 0.025;
        
        // Combine all forces with their weights
        let totalX = 0;
        let totalY = 0;
        
        totalX += forces.separation.x * KRILL_CONFIG.WEIGHTS.SEPARATION;
        totalY += forces.separation.y * KRILL_CONFIG.WEIGHTS.SEPARATION;
        
        totalX += forces.alignment.x * KRILL_CONFIG.WEIGHTS.ALIGNMENT;
        totalY += forces.alignment.y * KRILL_CONFIG.WEIGHTS.ALIGNMENT;
        
        totalX += forces.cohesion.x * KRILL_CONFIG.WEIGHTS.COHESION;
        totalY += forces.cohesion.y * KRILL_CONFIG.WEIGHTS.COHESION;
        
        totalX += forces.foodSeek.x;
        totalY += forces.foodSeek.y;
        
        totalX += forces.predatorAvoid.x;
        totalY += forces.predatorAvoid.y;
        
        totalX += forces.depthPreference.x;
        totalY += forces.depthPreference.y;
        
        totalX += forces.swarmCohesion.x;
        totalY += forces.swarmCohesion.y;
        
        totalX += forces.migration.x;
        totalY += forces.migration.y;
        
        // Limit total force
        const totalMag = Math.sqrt(totalX * totalX + totalY * totalY);
        if (totalMag > maxForce) {
            totalX = (totalX / totalMag) * maxForce;
            totalY = (totalY / totalMag) * maxForce;
        }
        
        // Apply to velocity
        krill.velocity.x += totalX;
        krill.velocity.y += totalY;
        
        // Limit velocity
        const maxSpeed = krill.maxSpeed || 1.8;
        const velMag = Math.sqrt(krill.velocity.x * krill.velocity.x + krill.velocity.y * krill.velocity.y);
        if (velMag > maxSpeed) {
            krill.velocity.x = (krill.velocity.x / velMag) * maxSpeed;
            krill.velocity.y = (krill.velocity.y / velMag) * maxSpeed;
        }
    }
    
    updateKrillProperties(krill) {
        // Update energy based on behavior
        switch (krill.behaviorState) {
            case KRILL_STATES.FLEEING:
                krill.energy = Math.max(0, krill.energy - 0.003); // High energy cost
                break;
            case KRILL_STATES.MIGRATING:
                krill.energy = Math.max(0, krill.energy - 0.002); // Medium energy cost
                break;
            case KRILL_STATES.SEEKING:
                krill.energy = Math.max(0, krill.energy - 0.001); // Low energy cost
                break;
            case KRILL_STATES.RESTING:
                krill.energy = Math.min(1.0, krill.energy + 0.002); // Energy recovery
                break;
            default:
                krill.energy = Math.max(0, krill.energy - 0.0005); // Minimal energy drain
        }
        
        // Update hunger
        krill.hunger = Math.min(1.0, krill.hunger + 0.001);
        
        // Ensure properties exist and have valid values
        krill.energy = Math.max(0, Math.min(1.0, krill.energy || 0.5));
        krill.hunger = Math.max(0, Math.min(1.0, krill.hunger || 0.5));
        krill.nutritionLevel = Math.max(0.2, Math.min(1.0, krill.nutritionLevel || 0.5));
    }
    
    // Calculate current migration phase based on time
    calculateMigrationPhase() {
        const currentTime = Date.now();
        const cyclePosition = (currentTime % KRILL_CONFIG.MIGRATION_CYCLE_LENGTH) / KRILL_CONFIG.MIGRATION_CYCLE_LENGTH;
        return cyclePosition;
    }
    
    // Clean up behavior trees for removed krill
    cleanup() {
        // Remove behavior trees for krill that no longer exist
        // This should be called periodically to prevent memory leaks
        for (let [krill, tree] of this.behaviorTrees) {
            if (!krill || krill.removed) {
                this.behaviorTrees.delete(krill);
            }
        }
    }
}

// Export the AI system
if (typeof window !== 'undefined') {
    window.KRILL_STATES = KRILL_STATES;
    window.KRILL_CONFIG = KRILL_CONFIG;
    window.KrillAI = KrillAI;
    window.KrillBehaviorTree = KrillBehaviorTree;
    
    // Create global instance
    window.krillAI = new KrillAI();
} 