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
        this.huntingRadius = window.SQUID_CONFIG.HUNTING_RADIUS;
        this.huntingRadiusSquared = this.huntingRadius * this.huntingRadius;
        this.attackRange = window.SQUID_CONFIG.ATTACK_RANGE;
        this.attackRangeSquared = this.attackRange * this.attackRange;
        
        // Full shader effect applied (no reduction)
        this.depthOpacityMultiplier = 1; // Full depth shader effect
        
        // Sprite flipping cooldown system
        this.FLIP_COOLDOWN = 1000; // 1 second cooldown for horizontal flips
        this.lastFlipTime = 0;
        this.facingDirection = 1; // 1 for right, -1 for left
        
        // REMOVED: Spawn grace period - no longer needed, squids should move immediately
        // Squids will now immediately start moving toward preferred depth when spawned shallow
        const currentDepth = this.y / WORLD_HEIGHT;
        this.spawnGracePeriod = 0; // No grace period - immediate movement
        this.spawnTime = Date.now();
        
        // Initialize velocity - start moving immediately toward preferred depth if shallow
        if (currentDepth < 0.5) {
            // Spawned in shallow water - give immediate downward velocity toward preferred depth
            const targetDepth = WORLD_HEIGHT * 0.85; // Preferred depth target
            const directionY = targetDepth - this.y;
            const directionX = (Math.random() - 0.5) * 200; // Small horizontal variation
            const mag = Math.sqrt(directionX ** 2 + directionY ** 2);
            
            if (mag > 0) {
                // Give immediate velocity toward preferred depth
                const initialSpeed = 2.0; // Moderate initial speed
                this.velocity.x = (directionX / mag) * initialSpeed;
                this.velocity.y = (directionY / mag) * initialSpeed;
            } else {
                // Fallback: simple downward velocity
                this.velocity = { x: 0, y: 0.8 };
            }
        } else {
            // Normal spawn: gentle downward drift
            const downwardForce = 0.2;
            this.velocity = { x: 0, y: downwardForce };
        }
        
        // Initialize modular systems
        this.initializeModularSystems();
        
        console.log('Massive Giant Squid created at:', this.x, this.y, 'Size:', this.size, 'State:', this.state, 'Depth:', Math.round(currentDepth * 100) + '%', 'Grace period:', this.spawnGracePeriod);
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
        // REMOVED: Grace period decrement and expiration logic - no longer needed
        // Squids now start moving immediately when spawned shallow
        
        // Debug logging for movement tracking
        if (window.gameState && window.gameState.squidDebug && this.stateTimer % 60 === 0) {
            console.log(`🦑 Squid update:`, {
                position: { x: Math.round(this.x), y: Math.round(this.y) },
                velocity: { x: Math.round(this.velocity.x * 100) / 100, y: Math.round(this.velocity.y * 100) / 100 },
                state: this.state,
                currentSpeed: Math.round(this.currentSpeed * 100) / 100,
                depth: Math.round((this.y / (window.WORLD_HEIGHT || 8000)) * 100) + '%',
                isJetting: this.jetSystem.isJetting(this),
                spawnGracePeriod: this.spawnGracePeriod || 0
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
        
        // CRITICAL FIX: Apply depth maintenance - maintainDepth() handles jetting logic internally
        // maintainDepth() is designed to skip only if jetting AND no dive target exists
        // If there IS a dive target, it should be applied even during jetting to prevent freezing
        // So we always call maintainDepth() and let it decide based on jetting + dive target state
        this.maintainDepth();
        
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
        
        // Hard limit: Prevent squids from going above 50% depth (4000px if WORLD_HEIGHT is 8000)
        // BUT: Respect dive target - allow squids to actively swim down
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const maxShallowDepth = WORLD_HEIGHT * 0.5; // 50% depth limit
        
        // Only enforce depth limit if not actively diving to target
        const hasDiveTarget = this.diveTargetPoint !== null && this.diveTargetPoint !== undefined;
        
        // Don't teleport if actively diving - let it swim down naturally
        if (!hasDiveTarget) {
            if (this.y < maxShallowDepth) {
                this.y = maxShallowDepth;
                // Stop upward velocity if we hit the limit
                if (this.velocity && this.velocity.y < 0) {
                    this.velocity.y = 0;
                }
            }
        }
    }

    // State handler methods - delegate to steering forces
    handlePatrolling(fish, predators) {
        // Check for other squids first - flee if detected
        if (window.gameEntities && window.gameEntities.squid) {
            const nearbySquid = this.behaviorTree.scanForOtherSquids(this, window.gameEntities.squid);
            if (nearbySquid) {
                // Only retreat if this squid should retreat (deterministic comparison)
                // This ensures only one squid retreats when two detect each other
                if (this.behaviorTree.shouldRetreatFromSquid(this, nearbySquid)) {
                    // Store the threatening squid and transition to retreating
                    this.fleeingFromSquid = nearbySquid;
                    this.behaviorTree.transitionToState(this, window.SQUID_STATES.RETREATING);
                    return;
                }
                // Otherwise, continue patrolling (the other squid will retreat)
            }
        }
        
        // Scan for prey
        const prey = this.scanForPrey(predators, fish);
        if (prey) {
            // Claim the target when starting to hunt
            prey.huntedBySquid = this;
            this.behaviorTree.transitionToState(this, window.SQUID_STATES.HUNTING, prey);
            return;
        }
        
        // Apply patrolling forces
        // CRITICAL FIX: If squid has a dive target, apply forces every frame
        // to ensure active swimming instead of freezing
        const hasDiveTarget = this.diveTargetPoint !== null && this.diveTargetPoint !== undefined;
        if (hasDiveTarget) {
            // Actively diving - maintainDepth() handles the dive forces, but ensure we don't freeze
            // The dive forces are applied in maintainDepth(), so we skip normal patrolling here
        } else if (this.behaviorTree.shouldPatrolMove(this)) {
            // Normal patrolling - apply forces at normal interval
            this.steeringForces.applyPatrollingForces(this, this.jetSystem);
        }
        
        // Change to hunting state periodically
        if (this.behaviorTree.shouldPatrolToHunting(this)) {
            this.behaviorTree.transitionToState(this, window.SQUID_STATES.HUNTING);
        }
    }
    
    handleHunting(fish, predators) {
        // Check for other squids first - flee if detected (even while hunting)
        if (window.gameEntities && window.gameEntities.squid) {
            const nearbySquid = this.behaviorTree.scanForOtherSquids(this, window.gameEntities.squid);
            if (nearbySquid) {
                // Only retreat if this squid should retreat (deterministic comparison)
                // This ensures only one squid retreats when two detect each other
                if (this.behaviorTree.shouldRetreatFromSquid(this, nearbySquid)) {
                    // Clear claim on hunt target when fleeing
                    if (this.huntTarget && this.huntTarget.huntedBySquid === this) {
                        this.huntTarget.huntedBySquid = null;
                    }
                    // Store the threatening squid and transition to retreating
                    this.fleeingFromSquid = nearbySquid;
                    this.behaviorTree.transitionToState(this, window.SQUID_STATES.RETREATING);
                    return;
                }
                // Otherwise, continue hunting (the other squid will retreat)
            }
        }
        
        if (!this.huntTarget) {
            this.huntTarget = this.scanForPrey(predators, fish);
            // Claim the target if we found one
            if (this.huntTarget && this.huntTarget.huntedBySquid !== this) {
                this.huntTarget.huntedBySquid = this;
            }
        }
        
        if (this.huntTarget) {
            const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
            const squidConfig = window.SQUID_CONFIG || {};
            const huntRadius = squidConfig.VISION_RANGE || 2000;
            const dist = this.steeringForces.distance(this, this.huntTarget);
            const targetTooShallow = this.huntTarget.y < (WORLD_HEIGHT * 0.5 - 50); // Tuna above reachable depth
            const outOfHuntRadius = dist > huntRadius;
            
            // If target is too shallow (above 50% depth limit) or too far away, abandon hunt and retreat
            if (targetTooShallow || outOfHuntRadius) {
                // Clear claim on unreachable target
                if (this.huntTarget.huntedBySquid === this) {
                    this.huntTarget.huntedBySquid = null;
                }
                this.huntTarget = null;
                this.behaviorTree.transitionToState(this, window.SQUID_STATES.RETREATING);
                return;
            }
            
            if (dist < this.attackRange) {
                this.behaviorTree.transitionToState(this, window.SQUID_STATES.ATTACKING);
                return;
            }
            
            // Apply hunting forces
            this.steeringForces.applyHuntingForces(this, this.jetSystem);
        } else {
            // No target found, return to patrolling
            // Clear any existing claim before transitioning
            if (this.huntTarget && this.huntTarget.huntedBySquid === this) {
                this.huntTarget.huntedBySquid = null;
            }
            this.behaviorTree.transitionToState(this, window.SQUID_STATES.PATROLLING);
        }
        
        // Timeout hunting
        if (this.behaviorTree.shouldHuntTimeout(this)) {
            // Clear claim on timeout
            if (this.huntTarget && this.huntTarget.huntedBySquid === this) {
                this.huntTarget.huntedBySquid = null;
            }
            this.behaviorTree.transitionToState(this, window.SQUID_STATES.PATROLLING);
            this.huntTarget = null;
        }
    }
    
    handleAttacking(fish, predators) {
        if (this.huntTarget) {
            // Attempt to grab prey
            if (this.steeringForces.attemptToGrabPrey(this, predators, fish)) {
                // Clear claim on the eaten tuna
                if (this.huntTarget.huntedBySquid === this) {
                    this.huntTarget.huntedBySquid = null;
                }
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
                // Transition back to hunting (keep claim on target)
                this.behaviorTree.transitionToState(this, window.SQUID_STATES.HUNTING);
            }
        } else {
            // No target, clear any claim and return to patrolling
            if (this.huntTarget && this.huntTarget.huntedBySquid === this) {
                this.huntTarget.huntedBySquid = null;
            }
            this.behaviorTree.transitionToState(this, window.SQUID_STATES.PATROLLING);
        }
    }
    
    handleRetreating(fish, predators) {
        // If fleeing from another squid, check if still in range
        if (this.fleeingFromSquid) {
            const squidDetectionRange = window.SQUID_CONFIG?.SQUID_DETECTION_RANGE || 1000;
            const dist = this.steeringForces.distance(this, this.fleeingFromSquid);
            // If far enough away or squid is no longer valid, clear flee target and return to patrolling
            if (dist > squidDetectionRange * 1.5 || 
                !this.fleeingFromSquid.x || !this.fleeingFromSquid.y) {
                this.fleeingFromSquid = null;
                this.retreatTargetPoint = null; // Clear retreat target when done fleeing
                this.retreatSpeedMultiplier = undefined; // Clear distance-based speed multiplier
                this.behaviorTree.transitionToState(this, window.SQUID_STATES.PATROLLING);
                return;
            }
            // Continue fleeing - apply retreat forces every frame for immediate response
            this.steeringForces.applyRetreatForces(this, this.jetSystem);
            return; // Don't process prey consumption while fleeing
        }
        
        // Consume prey and rest (normal retreat behavior)
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
        
        // Apply retreat forces (only when settling, not when fleeing from squid)
        if (this.behaviorTree.shouldRetreatSettle(this)) {
            this.steeringForces.applyRetreatForces(this, this.jetSystem);
        }
    }
    
    /**
     * Update facing direction with cooldown to prevent rapid flipping
     * ENHANCED: Now accounts for diagonal sprite orientation
     */
    updateFacingDirection() {
        const currentTime = Date.now();
        
        // Only update facing direction if enough time has passed since last flip (1 second cooldown)
        if (currentTime - this.lastFlipTime >= this.FLIP_COOLDOWN) {
            // CRITICAL FIX: Calculate movement angle to determine proper facing for diagonal sprite
            // Your sprite has head in top-right, tentacles in bottom-left (diagonal orientation)
            const movementAngle = Math.atan2(this.velocity.y, this.velocity.x);
            const speed = Math.hypot(this.velocity.x, this.velocity.y);
            
            // Only update if moving fast enough to have a clear direction
            if (speed > 0.5) {
                // ENHANCED LOGIC: Determine flip based on diagonal sprite orientation
                // For diagonal sprite (head top-right), we need to flip when movement is toward top-left quadrant
                // Movement angles: Right=0°, Down=90°, Left=180°, Up=270° (in radians: 0, π/2, π, 3π/2)
                
                let desiredDirection = 1; // Default to right (no flip)
                
                // Convert angle to degrees for easier understanding
                const angleDegrees = (movementAngle * 180 / Math.PI + 360) % 360;
                
                // DIAGONAL SPRITE FLIP LOGIC:
                // - Head is in top-right of sprite
                // - When moving toward top-left quadrant (135° to 315°), flip sprite
                // - This makes the head point toward movement direction
                if (angleDegrees > 90 && angleDegrees < 270) {
                    desiredDirection = -1; // Flip sprite
                } else {
                    desiredDirection = 1; // Don't flip sprite
                }
                
                // Only flip if direction actually needs to change
                if (desiredDirection !== this.facingDirection) {
                    this.facingDirection = desiredDirection;
                    this.lastFlipTime = currentTime;
                    
                    // Debug logging for flip events (only when debug is enabled)
                    if (window.gameState && window.gameState.squidDebug) {
                        console.log(`🦑 Squid flipped to face ${this.facingDirection === 1 ? 'right' : 'left'} at angle ${angleDegrees.toFixed(1)}°, velocity (${Math.round(this.velocity.x * 100) / 100}, ${Math.round(this.velocity.y * 100) / 100})`);
                    }
                }
            }
        } else {
            // Debug logging for cooldown prevention (only when debug is enabled)
            const speed = Math.hypot(this.velocity.x, this.velocity.y);
            if (window.gameState && window.gameState.squidDebug && speed > 0.5) {
                const timeRemaining = this.FLIP_COOLDOWN - (currentTime - this.lastFlipTime);
                const angleDegrees = (Math.atan2(this.velocity.y, this.velocity.x) * 180 / Math.PI + 360) % 360;
                console.log(`🦑 Squid flip blocked by cooldown: ${timeRemaining.toFixed(0)}ms remaining, angle: ${angleDegrees.toFixed(1)}°`);
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