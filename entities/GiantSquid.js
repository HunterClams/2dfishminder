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
        
        // Sprite flipping cooldown system
        this.FLIP_COOLDOWN = 1000; // 1 second cooldown for horizontal flips
        this.lastFlipTime = 0;
        this.facingDirection = 1; // 1 for right, -1 for left
        
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
        
        // Initialize bioluminescence system
        this.bioluminescenceSystem = new window.SquidBioluminescenceSystem();
        this.bioluminescenceSystem.initializeBioluminescenceSystem(this);
        
        // Initialize behavior tree
        this.behaviorTree = new window.SquidBehaviorTree();
        this.behaviorTree.initializeBehaviorTree(this);
        
        // Initialize steering forces
        this.steeringForces = new window.SquidSteeringForces();
        
        // Initialize rendering system
        this.renderingSystem = new window.SquidRenderingSystem();
        
        // Initialize flocking system for squid repulsion
        this.flockingSystem = new window.SquidFlockingSystem();
        
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
                depth: Math.round((this.y / (window.WORLD_HEIGHT || 8000)) * 100) + '%',
                isJetting: this.jetSystem.isJetting(this)
            });
        }
        
        // Update flip cooldown system
        this.updateFacingDirection();
        
        // CRITICAL FIX: Update jet system FIRST to preserve momentum
        this.jetSystem.updateJetSystem(this);
        
        // Update bioluminescence system
        this.bioluminescenceSystem.updateBioluminescenceSystem(this);
        
        // Update animation timers
        this.jetSystem.updateAnimationTimers(this);
        
        // Update behavior tree BEFORE other movement systems
        this.behaviorTree.updateBehaviorTree(this, fish, predators, krill);
        
        // CRITICAL FIX: Only apply depth maintenance when NOT jetting
        // Prevents depth system from interfering with jet propulsion
        if (!this.jetSystem.isJetting(this)) {
            this.maintainDepth();
        }
        
        // CRITICAL FIX: Reduce flocking interference during jet propulsion
        if (window.gameEntities && window.gameEntities.squid) {
            const isJetting = this.jetSystem.isJetting(this);
            const isActiveMovement = this.state === window.SQUID_STATES.HUNTING || 
                                   this.state === window.SQUID_STATES.ATTACKING ||
                                   isJetting;
            
            if (!isActiveMovement) {
                // Full flocking only when not actively moving
                this.flockingSystem.flock(this, window.gameEntities.squid);
            } else {
                // Minimal flocking during active movement to preserve momentum
                this.flockingSystem.applyMinimalFlocking(this, window.gameEntities.squid);
            }
        }
        
        // Apply movement physics with jet-aware drag
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
    
    /**
     * Update facing direction with cooldown to prevent rapid flipping
     */
    updateFacingDirection() {
        const currentTime = Date.now();
        
        // Only update facing direction if enough time has passed since last flip (1 second cooldown)
        if (currentTime - this.lastFlipTime >= this.FLIP_COOLDOWN) {
            // Determine desired direction based on velocity
            let desiredDirection = 1; // Default to right
            if (this.velocity.x < -0.5) { // Increased threshold to avoid flipping on tiny movements
                desiredDirection = -1; // Left
            } else if (this.velocity.x > 0.5) {
                desiredDirection = 1; // Right
            }
            // If velocity is very small, keep current direction
            
            // Only flip if direction actually needs to change and velocity is significant
            if (desiredDirection !== this.facingDirection && Math.abs(this.velocity.x) > 0.5) {
                this.facingDirection = desiredDirection;
                this.lastFlipTime = currentTime;
                
                // Debug logging for flip events (only when debug is enabled)
                if (window.gameState && window.gameState.squidDebug) {
                    console.log(`🦑 Squid flipped to face ${this.facingDirection === 1 ? 'right' : 'left'} at velocity ${Math.round(this.velocity.x * 100) / 100}, cooldown: ${this.FLIP_COOLDOWN}ms`);
                }
            }
        } else {
            // Debug logging for cooldown prevention (only when debug is enabled)
            if (window.gameState && window.gameState.squidDebug && Math.abs(this.velocity.x) > 0.5) {
                const timeRemaining = this.FLIP_COOLDOWN - (currentTime - this.lastFlipTime);
                console.log(`🦑 Squid flip blocked by cooldown: ${timeRemaining.toFixed(0)}ms remaining, velocity: ${Math.round(this.velocity.x * 100) / 100}`);
            }
        }
        // If cooldown is still active, maintain current facing direction
    }

    /**
     * Override drawSprite to use controlled facing direction instead of immediate velocity
     */
    drawSprite(sprite, size, opacity = 1, angle = 0) {
        if (!window.Utils || !window.Utils.inRenderDistance(this)) return;
        
        // Comprehensive sprite validation
        if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid sprite detected in GiantSquid drawSprite:', {
                sprite: sprite,
                type: typeof sprite,
                isImage: sprite instanceof HTMLImageElement,
                complete: sprite?.complete,
                naturalWidth: sprite?.naturalWidth,
                entityType: this.constructor.name,
                fishType: this.fishType
            });
            return; // Skip drawing if sprite is invalid
        }
        
        // Apply depth shader to giant squid
        const depthOpacity = window.Utils.getDepthOpacity(this.y, opacity);
        const tintStrength = window.Utils.getDepthTint(this.y);
        
        const ctx = window.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Use controlled facing direction instead of immediate velocity direction
        if (this.facingDirection < 0) {
            ctx.scale(-1, 1);
        }
        
        // Apply rotation if provided (for directional movement)
        if (angle !== 0) {
            ctx.rotate(angle);
        }
        
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            // Draw sprite on temp canvas with validation
            try {
                tempCtx.drawImage(sprite, 0, 0, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in temp canvas (GiantSquid):', error, {
                    sprite: sprite,
                    size: size,
                    entityType: this.constructor.name
                });
                ctx.restore();
                return;
            }
            
            // Apply tint using source-atop (only affects non-transparent pixels)
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, size, size);
            
            // Draw the tinted sprite to main canvas
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -size/2, -size/2);
        } else {
            // No tint needed, draw normally with validation
            ctx.globalAlpha = depthOpacity;
            try {
                ctx.drawImage(sprite, -size/2, -size/2, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in main canvas (GiantSquid):', error, {
                    sprite: sprite,
                    size: size,
                    entityType: this.constructor.name,
                    fishType: this.fishType
                });
            }
        }
        
        ctx.restore();
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