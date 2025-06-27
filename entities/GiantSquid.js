// GiantSquid class - Deep water apex predator with advanced jet propulsion and bioluminescence
// Now uses modular AI systems for better maintainability and organization

class GiantSquid extends (window.Entity || Entity) {
    constructor(x = null, y = null) {
        // Use global constants safely
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        // Use provided position or spawn in abyssal zones (75-95% depth)
        const spawnY = y !== null ? y : WORLD_HEIGHT * (0.75 + Math.random() * 0.2);
        const spawnX = x !== null ? x : Math.random() * WORLD_WIDTH;
        super(spawnX, spawnY, 'abyssal');
        
        // Physical properties - 5% increase from base values
        this.size = window.SQUID_CONFIG.SIZE;
        this.maxSpeed = window.SQUID_CONFIG.MAX_SPEED;
        this.cruiseSpeed = window.SQUID_CONFIG.CRUISE_SPEED;
        this.burstSpeed = window.SQUID_CONFIG.BURST_SPEED;
        this.maxForce = window.SQUID_CONFIG.MAX_FORCE;
        
        // Sensory system - scaled proportionally for larger squid
        this.visionRange = window.SQUID_CONFIG.VISION_RANGE;
        this.visionRangeSquared = this.visionRange * this.visionRange;
        this.attackRange = window.SQUID_CONFIG.ATTACK_RANGE;
        this.attackRangeSquared = this.attackRange * this.attackRange;
        
        // Full shader effect applied (no reduction)
        this.depthOpacityMultiplier = 1; // Full depth shader effect
        
        // Initialize with gentle downward drift (stronger if spawned at surface)
        const currentDepth = this.y / WORLD_HEIGHT;
        const downwardForce = currentDepth < 0.5 ? 0.8 : 0.2; // Stronger drift if near surface
        this.velocity = { x: 0, y: downwardForce };
        
        // Initialize modular systems
        this.initializeModularSystems();
        
        console.log('Massive Giant Squid created at:', this.x, this.y, 'Size:', this.size, 'State:', this.state, 'Depth:', Math.round(currentDepth * 100) + '%');
    }

    /**
     * Initialize all modular systems
     */
    initializeModularSystems() {
        // Initialize jet propulsion system
        this.jetSystem = new window.SquidJetSystem();
        this.jetSystem.initializeJetSystem(this);
        
        // Initialize behavior tree
        this.behaviorTree = new window.SquidBehaviorTree();
        this.behaviorTree.initializeBehaviorTree(this);
        
        // Initialize steering forces
        this.steeringForces = new window.SquidSteeringForces();
        
        // Initialize rendering system
        this.renderingSystem = new window.SquidRenderingSystem();
        
        // Set this controller as the delegate for the behavior tree
        this.behaviorTree.setController(this);
    }
    
    // Delegate jet propulsion methods to the jet system
    jet(direction, power = 1.0) {
        this.jetSystem.jet(this, direction, power);
    }

    finPropulsion(direction, intensity = 0.5) {
        this.jetSystem.finPropulsion(this, direction, intensity);
    }
    
    tentacleAdjust(direction, strength = 0.3) {
        this.jetSystem.tentacleAdjust(this, direction, strength);
    }
    
    // Delegate prey scanning to behavior tree
    scanForPrey(predators, fish) {
        return this.behaviorTree.scanForPrey(this, predators, fish);
    }

    // Delegate depth maintenance to behavior tree
    maintainDepth() {
        this.behaviorTree.maintainDepth(this);
    }

    // Main update method - orchestrates all modular systems
    update(fish, predators, krill) {
        // Debug logging for movement tracking
        if (window.gameState && window.gameState.squidDebug && this.stateTimer % 60 === 0) {
            console.log(`🦑 Squid update:`, {
                position: { x: Math.round(this.x), y: Math.round(this.y) },
                velocity: { x: Math.round(this.velocity.x * 100) / 100, y: Math.round(this.velocity.y * 100) / 100 },
                state: this.state,
                currentSpeed: Math.round(this.currentSpeed * 100) / 100,
                depth: Math.round((this.y / (window.WORLD_HEIGHT || 8000)) * 100) + '%'
            });
        }
        
        // Update jet propulsion system
        this.jetSystem.updateJetSystem(this);
        
        // Update animation timers
        this.jetSystem.updateAnimationTimers(this);
        
        // Maintain depth preference (especially important if spawned at surface)
        this.maintainDepth();
        
        // Update behavior tree
        this.behaviorTree.updateBehaviorTree(this, fish, predators, krill);
        
        // Apply movement physics
        this.jetSystem.applyMovementPhysics(this);
        
        // Handle world edges
        this.steeringForces.handleEdges(this);
        
        // Move the entity
        this.move();
    }

    // State handler methods - delegate to steering forces
    handlePatrolling(fish, predators) {
        // Scan for prey
        const prey = this.scanForPrey(predators, fish);
        if (prey) {
            this.behaviorTree.transitionToState(this, window.SQUID_STATES.HUNTING, prey);
            return;
        }
        
        // Apply patrolling forces
        if (this.behaviorTree.shouldPatrolMove(this)) {
            this.steeringForces.applyPatrollingForces(this, this.jetSystem);
        }
        
        // Change to hunting state periodically
        if (this.behaviorTree.shouldPatrolToHunting(this)) {
            this.behaviorTree.transitionToState(this, window.SQUID_STATES.HUNTING);
        }
    }
    
    handleHunting(fish, predators) {
        if (!this.huntTarget) {
            this.huntTarget = this.scanForPrey(predators, fish);
        }
        
        if (this.huntTarget) {
            const dist = this.steeringForces.distance(this, this.huntTarget);
            
            if (dist < this.attackRange) {
                this.behaviorTree.transitionToState(this, window.SQUID_STATES.ATTACKING);
                return;
            }
            
            // Apply hunting forces
            this.steeringForces.applyHuntingForces(this, this.jetSystem);
        } else {
            // No target found, return to patrolling
            this.behaviorTree.transitionToState(this, window.SQUID_STATES.PATROLLING);
        }
        
        // Timeout hunting
        if (this.behaviorTree.shouldHuntTimeout(this)) {
            this.behaviorTree.transitionToState(this, window.SQUID_STATES.PATROLLING);
            this.huntTarget = null;
        }
    }
    
    handleAttacking(fish, predators) {
        if (this.huntTarget) {
            // Attempt to grab prey
            if (this.steeringForces.attemptToGrabPrey(this, predators, fish)) {
                // Apply escape jet after successful grab
                this.steeringForces.applyEscapeJet(this, this.jetSystem);
                this.behaviorTree.transitionToState(this, window.SQUID_STATES.RETREATING);
                    this.huntTarget = null;
                    return;
                }
                
            // Apply attack forces
            this.steeringForces.applyAttackForces(this, this.jetSystem);
                
                // Timeout attack
            if (this.behaviorTree.shouldAttackTimeout(this)) {
                this.behaviorTree.transitionToState(this, window.SQUID_STATES.HUNTING);
            }
        } else {
            this.behaviorTree.transitionToState(this, window.SQUID_STATES.PATROLLING);
        }
    }
    
    handleRetreating(fish, predators) {
        // Consume prey and rest
        if (this.grabbedPrey) {
            this.steeringForces.consumePrey(this);
            
            // Consumption complete
            if (this.behaviorTree.isConsumptionComplete(this)) {
                this.behaviorTree.transitionToState(this, window.SQUID_STATES.PATROLLING);
            }
        } else {
            // Just retreating without prey
            if (this.behaviorTree.shouldRetreatTimeout(this)) {
                this.behaviorTree.transitionToState(this, window.SQUID_STATES.PATROLLING);
            }
        }
        
        // Apply retreat forces
        if (this.behaviorTree.shouldRetreatSettle(this)) {
            this.steeringForces.applyRetreatForces(this, this.jetSystem);
        }
    }
    
    // Delegate drawing to rendering system
    draw() {
        this.renderingSystem.draw(this, this.jetSystem);
    }

    // Delegate edge handling to steering forces
    edges() {
        this.steeringForces.handleEdges(this);
    }

    // Helper methods - delegate to steering forces
    distance(obj1, obj2) {
        return this.steeringForces.distance(obj1, obj2);
    }

    normalize(vector) {
        return this.steeringForces.normalize(vector);
    }
}

// Export for global access
window.GiantSquid = GiantSquid; 