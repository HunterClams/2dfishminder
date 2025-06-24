// Modular Tuna AI System - Advanced predator behavior management
class TunaAI {
    constructor() {
        // AI States
        this.states = {
            PATROLLING: 'patrolling',
            HUNTING: 'hunting',
            ATTACKING: 'attacking',
            FEEDING: 'feeding',
            RESTING: 'resting',
            FLEEING: 'fleeing'
        };
        
        // AI Configuration
        this.config = {
            huntRadius: 300, // Doubled from 150 to 300 for better prey detection
            attackRadius: 40, // Increased from 30 to 40 for better eating success
            fleeRadius: 200,
            restEnergyThreshold: 30,
            huntEnergyThreshold: 50,
            maxPredictionTime: 3.0,
            wanderRadius: 100,
            patrolSpeed: 0.8,
            huntSpeed: 1.35, // 35% speed boost when hunting (1.0 + 0.35)
            attackSpeed: 2.0,
            stateChangeDelay: 30, // frames
            targetSwitchCooldown: 60 // frames
        };
    }
    
    // Initialize AI for a tuna instance
    initializeTuna(tuna) {
        tuna.aiState = this.states.PATROLLING;
        tuna.aiTarget = null;
        tuna.aiTimer = 0;
        tuna.lastStateChange = 0;
        tuna.targetSwitchTimer = 0;
        tuna.wanderTarget = this.generateWanderTarget(tuna);
        tuna.alertness = 0.5; // 0-1 scale
        tuna.huntSuccess = 0; // Track hunting success for learning
        tuna.lastAttackTime = 0;
        tuna.restingSpot = null;
        
        return tuna;
    }
    
    // Main AI update function
    updateAI(tuna, gameEntities) {
        if (!tuna.aiState) this.initializeTuna(tuna);
        
        tuna.aiTimer++;
        tuna.targetSwitchTimer = Math.max(0, tuna.targetSwitchTimer - 1);
        
        // Update alertness based on energy and recent activity
        this.updateAlertness(tuna);
        
        // State machine
        switch (tuna.aiState) {
            case this.states.PATROLLING:
                this.handlePatrolling(tuna, gameEntities);
                break;
            case this.states.HUNTING:
                this.handleHunting(tuna, gameEntities);
                break;
            case this.states.ATTACKING:
                this.handleAttacking(tuna, gameEntities);
                break;
            case this.states.FEEDING:
                this.handleFeeding(tuna, gameEntities);
                break;
            case this.states.RESTING:
                this.handleResting(tuna, gameEntities);
                break;
            case this.states.FLEEING:
                this.handleFleeing(tuna, gameEntities);
                break;
        }
        
        // Apply movement forces
        this.applyMovementForces(tuna);
    }
    
    // Update alertness based on various factors
    updateAlertness(tuna) {
        const energyFactor = tuna.energy / 100;
        const timeFactor = Math.sin(tuna.aiTimer * 0.001) * 0.1; // Slight variation over time
        
        tuna.alertness = Math.max(0.1, Math.min(1.0, 
            energyFactor * 0.7 + 
            (tuna.huntSuccess / 10) * 0.2 + 
            timeFactor
        ));
    }
    
    // Patrolling state - looking for prey while wandering
    handlePatrolling(tuna, gameEntities) {
        // Add brief cooldown after feeding to prevent rapid state switching
        const timeSinceStateChange = tuna.aiTimer - tuna.lastStateChange;
        const postFeedingCooldown = 60; // 1 second cooldown after feeding
        
        // Only look for prey if not in post-feeding cooldown
        if (timeSinceStateChange > postFeedingCooldown) {
            const nearbyPrey = this.findNearbyPrey(tuna, gameEntities, this.config.huntRadius * tuna.alertness);
            
            if (nearbyPrey.length > 0 && tuna.energy > this.config.huntEnergyThreshold) {
                const bestTarget = this.selectBestTarget(tuna, nearbyPrey);
                if (bestTarget) {
                    this.transitionToState(tuna, this.states.HUNTING, bestTarget);
                    return;
                }
            }
        }
        
        // Check if need to rest
        if (tuna.energy < this.config.restEnergyThreshold) {
            this.transitionToState(tuna, this.states.RESTING);
            return;
        }
        
        // Wander behavior
        this.handleWandering(tuna);
    }
    
    // Hunting state - actively pursuing a target
    handleHunting(tuna, gameEntities) {
        if (!tuna.aiTarget || !this.isValidTarget(tuna.aiTarget)) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        const distToTarget = window.Utils.distance(tuna, tuna.aiTarget);
        
        // Switch to attacking if close enough
        if (distToTarget < this.config.attackRadius) {
            this.transitionToState(tuna, this.states.ATTACKING);
            return;
        }
        
        // Lose target if too far or energy too low
        if (distToTarget > this.config.huntRadius * 1.5 || tuna.energy < 20) {
            tuna.huntSuccess = Math.max(0, tuna.huntSuccess - 1);
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        // Check for better targets nearby
        if (tuna.targetSwitchTimer <= 0) {
            const nearbyPrey = this.findNearbyPrey(tuna, gameEntities, this.config.huntRadius);
            const betterTarget = this.selectBetterTarget(tuna, tuna.aiTarget, nearbyPrey);
            if (betterTarget) {
                tuna.aiTarget = betterTarget;
                tuna.targetSwitchTimer = this.config.targetSwitchCooldown;
            }
        }
        
        // Apply hunting forces
        this.applyHuntingForces(tuna);
    }
    
    // Attacking state - close range combat
    handleAttacking(tuna, gameEntities) {
        if (!tuna.aiTarget || !this.isValidTarget(tuna.aiTarget)) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        const distToTarget = window.Utils.distance(tuna, tuna.aiTarget);
        
        // Try to eat the target (ignore huntCooldown during attacking state)
        if (distToTarget < this.config.attackRadius) {
            // Debug log attack attempt
            if (window.gameState && window.gameState.tunaDebug) {
                console.log(`🎯 Tuna attacking target at distance ${distToTarget.toFixed(1)} (radius: ${this.config.attackRadius})`);
            }
            
            if (this.attemptToEat(tuna, tuna.aiTarget, gameEntities)) {
                tuna.huntSuccess++;
                this.transitionToState(tuna, this.states.FEEDING);
                return;
            }
        }
        
        // Target escaped - give more leeway before switching back to hunting
        if (distToTarget > this.config.attackRadius * 1.5) {
            this.transitionToState(tuna, this.states.HUNTING);
            return;
        }
        
        // Apply attack forces
        this.applyAttackForces(tuna);
    }
    
    // Feeding state - just ate something, passive behavior for 3 seconds
    handleFeeding(tuna, gameEntities) {
        const feedingDuration = 180; // 3 seconds of feeding behavior
        const timeSinceFeeding = tuna.aiTimer - tuna.lastStateChange;
        
        // Transition to patrolling after 3 seconds
        if (timeSinceFeeding > feedingDuration) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        // During feeding, just do gentle wandering - NO prey detection
        // This prevents rapid state switching after eating
        this.handleWandering(tuna);
        
        // Check for threats (giant squids) but ignore other prey
        const threats = this.findThreats(tuna, gameEntities);
        if (threats.length > 0) {
            this.transitionToState(tuna, this.states.FLEEING);
            return;
        }
    }
    
    // Resting state - conserving energy
    handleResting(tuna, gameEntities) {
        // Find or maintain resting spot
        if (!tuna.restingSpot) {
            tuna.restingSpot = this.findRestingSpot(tuna);
        }
        
        // Move to resting spot
        if (tuna.restingSpot) {
            const distToRest = window.Utils.distance(tuna, tuna.restingSpot);
            if (distToRest > 20) {
                const restForce = window.Utils.calculateSteering(tuna, tuna.restingSpot, tuna.maxSpeed * 0.5, tuna.maxForce);
                tuna.applyForce({
                    x: restForce.x * 0.3,
                    y: restForce.y * 0.3
                });
            }
        }
        
        // Recover energy faster while resting
        tuna.energy = Math.min(100, tuna.energy + 0.1);
        
        // Return to patrolling when energy recovered
        if (tuna.energy > 70) {
            tuna.restingSpot = null;
            this.transitionToState(tuna, this.states.PATROLLING);
        }
        
        // Still respond to very close prey
        const closePrey = this.findNearbyPrey(tuna, gameEntities, this.config.attackRadius);
        if (closePrey.length > 0) {
            this.transitionToState(tuna, this.states.HUNTING, closePrey[0].entity);
        }
    }
    
    // Fleeing state - avoiding larger predators
    handleFleeing(tuna, gameEntities) {
        // Find threats
        const threats = this.findThreats(tuna, gameEntities);
        
        if (threats.length === 0) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        // Apply flee forces
        this.applyFleeForces(tuna, threats);
    }
    
    // Find nearby prey within radius
    findNearbyPrey(tuna, gameEntities, radius) {
        const nearbyPrey = [];
        const radiusSquared = radius * radius;
        
        const preyArrays = [
            gameEntities.fish || [],
            gameEntities.krill || [],
            gameEntities.paleKrill || [],
            gameEntities.momKrill || []
        ];
        
        for (let preyArray of preyArrays) {
            for (let prey of preyArray) {
                if (window.Utils && !window.Utils.shouldIgnorePrey(tuna.tunaType, prey.fishType)) {
                    const distSquared = window.Utils.distanceSquared(tuna, prey);
                    if (distSquared < radiusSquared) {
                        nearbyPrey.push({
                            entity: prey,
                            distance: Math.sqrt(distSquared),
                            priority: this.calculatePreyPriority(tuna, prey)
                        });
                    }
                }
            }
        }
        
        return nearbyPrey.sort((a, b) => b.priority - a.priority);
    }
    
    // Calculate prey priority based on various factors
    calculatePreyPriority(tuna, prey) {
        const distance = window.Utils.distance(tuna, prey);
        const maxDistance = this.config.huntRadius;
        
        let priority = 1.0;
        
        // Distance factor (closer = higher priority)
        priority *= (maxDistance - distance) / maxDistance;
        
        // Size factor (prefer appropriate sized prey)
        const sizeRatio = prey.size / tuna.size;
        if (sizeRatio > 0.3 && sizeRatio < 0.8) {
            priority *= 1.5; // Good size prey
        } else if (sizeRatio < 0.2) {
            priority *= 0.7; // Too small
        }
        
        // Energy factor (hungrier = less picky)
        const hungerFactor = 1.0 - (tuna.energy / 100);
        priority *= (1.0 + hungerFactor * 0.5);
        
        // Velocity factor (prefer slower moving prey)
        const preySpeed = Math.sqrt(prey.velocity.x ** 2 + prey.velocity.y ** 2);
        priority *= Math.max(0.5, 1.0 - preySpeed / 10);
        
        return priority;
    }
    
    // Select the best target from available prey
    selectBestTarget(tuna, nearbyPrey) {
        if (nearbyPrey.length === 0) return null;
        return nearbyPrey[0].entity;
    }
    
    // Select a better target if available
    selectBetterTarget(tuna, currentTarget, nearbyPrey) {
        if (nearbyPrey.length === 0) return null;
        
        const currentPriority = this.calculatePreyPriority(tuna, currentTarget);
        const bestPrey = nearbyPrey[0];
        
        // Switch only if significantly better
        if (bestPrey.priority > currentPriority * 1.3) {
            return bestPrey.entity;
        }
        
        return null;
    }
    
    // Check if target is still valid
    isValidTarget(target) {
        // More lenient validation - just check if target exists and has position
        return target && typeof target.x === 'number' && typeof target.y === 'number';
    }
    
    // Apply hunting movement forces
    applyHuntingForces(tuna) {
        if (!tuna.aiTarget) return;
        
        const distanceToTarget = window.Utils.distance(tuna, tuna.aiTarget);
        
        // Calculate dynamic speed boost based on hunting intensity
        // Closer targets get higher speed boost (up to 35%)
        const huntIntensity = Math.max(0, 1 - (distanceToTarget / this.config.huntRadius));
        const speedBoost = 1.0 + (0.35 * huntIntensity * tuna.alertness); // Up to 35% boost
        
        // Predict target movement
        const predictionTime = Math.min(
            distanceToTarget / (tuna.maxSpeed * speedBoost),
            this.config.maxPredictionTime
        );
        
        const futureX = tuna.aiTarget.x + tuna.aiTarget.velocity.x * predictionTime;
        const futureY = tuna.aiTarget.y + tuna.aiTarget.velocity.y * predictionTime;
        
        const target = { x: futureX, y: futureY };
        const pursue = window.Utils.calculateSteering(
            tuna, 
            target, 
            tuna.maxSpeed * speedBoost, // Apply dynamic speed boost
            tuna.maxForce
        );
        
        tuna.applyForce({
            x: pursue.x * tuna.aggression,
            y: pursue.y * tuna.aggression
        });
        
        // Store current speed boost for debug display
        tuna.currentSpeedBoost = speedBoost;
    }
    
    // Apply attack movement forces
    applyAttackForces(tuna) {
        if (!tuna.aiTarget) return;
        
        const attack = window.Utils.calculateSteering(
            tuna, 
            tuna.aiTarget, 
            tuna.maxSpeed * this.config.attackSpeed, 
            tuna.maxForce
        );
        
        tuna.applyForce({
            x: attack.x * tuna.aggression * 1.5,
            y: attack.y * tuna.aggression * 1.5
        });
    }
    
    // Handle wandering behavior
    handleWandering(tuna) {
        if (!tuna.wanderTarget) {
            tuna.wanderTarget = this.generateWanderTarget(tuna);
        }
        
        const distToWander = window.Utils.distance(tuna, tuna.wanderTarget);
        
        if (distToWander < 30) {
            tuna.wanderTarget = this.generateWanderTarget(tuna);
        }
        
        const wander = window.Utils.calculateSteering(
            tuna, 
            tuna.wanderTarget, 
            tuna.maxSpeed * this.config.patrolSpeed, 
            tuna.maxForce
        );
        
        tuna.applyForce({
            x: wander.x * 0.5,
            y: wander.y * 0.5
        });
    }
    
    // Generate a random wander target
    generateWanderTarget(tuna) {
        const angle = Math.random() * Math.PI * 2;
        const distance = this.config.wanderRadius * (0.5 + Math.random() * 0.5);
        
        return {
            x: tuna.x + Math.cos(angle) * distance,
            y: tuna.y + Math.sin(angle) * distance
        };
    }
    
    // Find a good resting spot
    findRestingSpot(tuna) {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        
        // Prefer deeper, quieter areas
        return {
            x: Math.max(100, Math.min(WORLD_WIDTH - 100, tuna.x + (Math.random() - 0.5) * 200)),
            y: Math.max(WORLD_HEIGHT * 0.6, Math.min(WORLD_HEIGHT - 100, tuna.y + Math.random() * 100))
        };
    }
    
    // Find threats (larger predators)
    findThreats(tuna, gameEntities) {
        const threats = [];
        const squidArray = gameEntities.squid || [];
        
        for (let squid of squidArray) {
            const distance = window.Utils.distance(tuna, squid);
            if (distance < this.config.fleeRadius) {
                threats.push(squid);
            }
        }
        
        return threats;
    }
    
    // Apply flee forces
    applyFleeForces(tuna, threats) {
        let fleeX = 0, fleeY = 0;
        
        for (let threat of threats) {
            const distance = window.Utils.distance(tuna, threat);
            const strength = this.config.fleeRadius / distance;
            
            fleeX += (tuna.x - threat.x) * strength;
            fleeY += (tuna.y - threat.y) * strength;
        }
        
        if (threats.length > 0) {
            fleeX /= threats.length;
            fleeY /= threats.length;
            
            tuna.applyForce({
                x: fleeX * tuna.maxForce * 2,
                y: fleeY * tuna.maxForce * 2
            });
        }
    }
    
    // Attempt to eat a target
    attemptToEat(tuna, target, gameEntities) {
        const preyArrays = [
            { array: gameEntities.fish, name: 'fish' },
            { array: gameEntities.krill, name: 'krill' },
            { array: gameEntities.paleKrill, name: 'paleKrill' },
            { array: gameEntities.momKrill, name: 'momKrill' }
        ];
        
        for (let preyGroup of preyArrays) {
            const index = preyGroup.array.indexOf(target);
            if (index !== -1) {
                // Debug log successful eating
                if (window.gameState && window.gameState.tunaDebug) {
                    console.log(`🐟 Tuna ate ${preyGroup.name} at distance ${window.Utils.distance(tuna, target).toFixed(1)}`);
                }
                
                // Remove prey
                preyGroup.array.splice(index, 1);
                
                // Add poop
                if (window.gameEntities && window.gameEntities.poop && window.Poop) {
                    window.gameEntities.poop.push(new window.Poop(tuna.x, tuna.y, 'tuna'));
                }
                
                // Create eating bubbles
                if (window.ObjectPools) {
                    for (let j = 0; j < 3; j++) {
                        window.ObjectPools.getEatingBubble(
                            tuna.x + (Math.random() - 0.5) * 20,
                            tuna.y + (Math.random() - 0.5) * 20
                        );
                    }
                }
                
                // Restore energy
                tuna.energy = Math.min(100, tuna.energy + 25);
                tuna.huntCooldown = 180;
                tuna.lastAttackTime = tuna.aiTimer;
                
                return true;
            }
        }
        
        // Debug log failed eating attempts
        if (window.gameState && window.gameState.tunaDebug) {
            console.log(`🐟 Tuna failed to eat target - not found in any prey array`);
        }
        
        return false;
    }
    
    // Apply general movement forces (depth preference, etc.)
    applyMovementForces(tuna) {
        // Depth preference
        const depthDifference = tuna.y - tuna.preferredDepth;
        if (Math.abs(depthDifference) > tuna.depthTolerance) {
            const depthForce = -depthDifference * 0.0001;
            tuna.applyForce({ x: 0, y: depthForce * tuna.maxForce });
        }
        
        // Avoid world edges
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const edgeBuffer = 200;
        
        if (tuna.x < edgeBuffer) {
            tuna.applyForce({ x: tuna.maxForce * 0.5, y: 0 });
        } else if (tuna.x > WORLD_WIDTH - edgeBuffer) {
            tuna.applyForce({ x: -tuna.maxForce * 0.5, y: 0 });
        }
        
        if (tuna.y < edgeBuffer) {
            tuna.applyForce({ x: 0, y: tuna.maxForce * 0.5 });
        } else if (tuna.y > WORLD_HEIGHT - edgeBuffer) {
            tuna.applyForce({ x: 0, y: -tuna.maxForce * 0.5 });
        }
    }
    
    // Transition to a new AI state
    transitionToState(tuna, newState, target = null) {
        if (tuna.aiState === newState) return;
        
        tuna.aiState = newState;
        tuna.aiTarget = target;
        tuna.lastStateChange = tuna.aiTimer;
        
        // State-specific initialization
        switch (newState) {
            case this.states.HUNTING:
                tuna.alertness = Math.min(1.0, tuna.alertness + 0.2);
                break;
            case this.states.RESTING:
                tuna.alertness = Math.max(0.1, tuna.alertness - 0.3);
                tuna.currentSpeedBoost = 1.0; // Reset speed boost when resting
                break;
            case this.states.FLEEING:
                tuna.alertness = 1.0;
                break;
            case this.states.PATROLLING:
                tuna.currentSpeedBoost = 1.0; // Reset speed boost when patrolling
                break;
            case this.states.FEEDING:
                tuna.currentSpeedBoost = 1.0; // Reset speed boost when feeding
                break;
        }
    }
}

// Create singleton instance
const tunaAI = new TunaAI();

// Make globally accessible
window.TunaAI = tunaAI; 