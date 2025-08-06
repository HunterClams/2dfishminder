// Tuna Steering Forces - Force calculations and movement logic for tuna AI
// Handles all steering, movement, target prediction, and eating logic

class TunaSteeringForces {
    constructor() {}

    // Apply hunting movement forces
    applyHuntingForces(tuna) {
        if (!tuna.aiTarget) return;
        
        const distanceToTarget = window.Utils.distance(tuna, tuna.aiTarget);
        
        // Calculate dynamic speed boost based on hunting intensity
        const huntIntensity = Math.max(0, 1 - (distanceToTarget / window.TUNA_CONFIG.huntRadius));
        const speedBoost = 1.0 + (0.35 * huntIntensity * tuna.alertness);
        
        // Predict target movement
        const predictionTime = Math.min(
            distanceToTarget / (tuna.maxSpeed * speedBoost),
            window.TUNA_CONFIG.maxPredictionTime
        );
        
        const futureX = tuna.aiTarget.x + tuna.aiTarget.velocity.x * predictionTime;
        const futureY = tuna.aiTarget.y + tuna.aiTarget.velocity.y * predictionTime;
        
        const target = { x: futureX, y: futureY };
        const pursue = window.Utils.calculateSteering(
            tuna, 
            target, 
            tuna.maxSpeed * speedBoost,
            tuna.maxForce
        );
        
        tuna.applyForce({
            x: pursue.x * tuna.aggression,
            y: pursue.y * tuna.aggression
        });
        
        tuna.currentSpeedBoost = speedBoost;
    }

    // Apply attack movement forces
    applyAttackForces(tuna) {
        if (!tuna.aiTarget) return;
        
        const attack = window.Utils.calculateSteering(
            tuna, 
            tuna.aiTarget, 
            tuna.maxSpeed * window.TUNA_CONFIG.attackSpeed, 
            tuna.maxForce
        );
        
        tuna.applyForce({
            x: attack.x * tuna.aggression * 1.5,
            y: attack.y * tuna.aggression * 1.5
        });
    }

    // Handle wandering behavior - REALISTIC predator patrol patterns
    handleWandering(tuna) {
        // Initialize realistic patrol system if needed
        if (!tuna.huntingPattern || !tuna.patrolState) {
            this.initializeRealisticPatrolSystem(tuna);
        }
        
        // Update patrol pattern based on current hunting behavior
        this.updateHuntingPattern(tuna);
        
        // Apply current patrol behavior
        switch (tuna.patrolState) {
            case 'searching':
                this.applySearchingBehavior(tuna);
                break;
            case 'cruising':
                this.applyCruisingBehavior(tuna);
                break;
            case 'investigating':
                this.applyInvestigatingBehavior(tuna);
                break;
            default:
                this.applySearchingBehavior(tuna);
        }
        
        // Apply velocity smoothing to reduce jitter
        this.smoothTunaVelocity(tuna);
    }

    // Initialize REALISTIC predator patrol system
    initializeRealisticPatrolSystem(tuna) {
        // Realistic hunting pattern states
        tuna.huntingPattern = {
            currentState: 'searching',
            stateTimer: 0,
            lastPreyLocation: null,
            searchRadius: 400 + Math.random() * 600, // EXPANDED: Variable search area (400-1000px, was 200-500px)
            investigationTarget: null,
            cruiseDirection: Math.random() * Math.PI * 2,
            searchSpiralCenter: { x: tuna.x, y: tuna.y },
            searchSpiralRadius: 80, // EXPANDED: Larger spiral radius (was 50)
            searchSpiralAngle: 0
        };
        
        // Current patrol state
        tuna.patrolState = 'searching';
        tuna.patrolStateTimer = 0;
        tuna.patrolTransitionCooldown = 0;
        
        // CRITICAL FIX: Initialize patrol distance from config
        const config = window.TUNA_CONFIG || {};
        tuna.patrolDistance = (config.patrolDistance || 800) + (Math.random() * 2 - 1) * (config.patrolVariation || 500);
        tuna.patrolDirection = tuna.patrolDirection || Math.random() * Math.PI * 2;
        tuna.patrolChangeTimer = 0;
        tuna.patrolChangeInterval = 300 + Math.random() * 360;
        
        // Initialize movement smoothing
        tuna.velocityHistory = [];
        tuna.maxVelocityHistory = 8;
        tuna.smoothedVelocity = { x: 0, y: 0 };
        
        // Debug logging
        if (window.gameState && window.gameState.tunaDebug) {
            console.log(`🐟 Tuna realistic patrol initialized: ${tuna.patrolState} mode`);
        }
    }
    
    // Update hunting pattern based on energy, success, and environment
    updateHuntingPattern(tuna) {
        tuna.patrolStateTimer++;
        tuna.patrolTransitionCooldown = Math.max(0, tuna.patrolTransitionCooldown - 1);
        
        // Transition logic based on realistic predator behavior
        if (tuna.patrolTransitionCooldown <= 0) {
            const energyFactor = tuna.energy / 100;
            const random = Math.random();
            
            switch (tuna.patrolState) {
                case 'searching':
                    if (tuna.patrolStateTimer > 180 && random < 0.3) { // 3 seconds of searching
                        this.transitionPatrolState(tuna, 'cruising');
                    } else if (tuna.patrolStateTimer > 300 && random < 0.2) { // 5 seconds, chance to investigate
                        this.transitionPatrolState(tuna, 'investigating');
                    }
                    break;
                    
                case 'cruising':
                    if (tuna.patrolStateTimer > 240 && random < 0.4) { // 4 seconds of cruising
                        this.transitionPatrolState(tuna, 'searching');
                    } else if (energyFactor < 0.6 && random < 0.3) { // Low energy, search more
                        this.transitionPatrolState(tuna, 'searching');
                    }
                    break;
                    
                case 'investigating':
                    if (tuna.patrolStateTimer > 120 && random < 0.5) { // 2 seconds of investigating
                        this.transitionPatrolState(tuna, random < 0.5 ? 'searching' : 'cruising');
                    }
                    break;
            }
        }
    }
    
    // Transition between patrol states
    transitionPatrolState(tuna, newState) {
        tuna.patrolState = newState;
        tuna.patrolStateTimer = 0;
        tuna.patrolTransitionCooldown = 60 + Math.random() * 120; // 1-3 seconds between transitions
        
        // Initialize new state
        switch (newState) {
            case 'searching':
                tuna.huntingPattern.searchSpiralCenter = { x: tuna.x, y: tuna.y };
                tuna.huntingPattern.searchSpiralRadius = 50;
                tuna.huntingPattern.searchSpiralAngle = 0;
                break;
                
            case 'cruising':
                tuna.huntingPattern.cruiseDirection = Math.random() * Math.PI * 2;
                break;
                
            case 'investigating':
                // Pick a random nearby point to investigate
                const angle = Math.random() * Math.PI * 2;
                const distance = 100 + Math.random() * 200;
                tuna.huntingPattern.investigationTarget = {
                    x: tuna.x + Math.cos(angle) * distance,
                    y: tuna.y + Math.sin(angle) * distance
                };
                break;
        }
        
        if (window.gameState && window.gameState.tunaDebug) {
            console.log(`🐟 Tuna patrol state: ${tuna.patrolState}`);
        }
    }
    
    // Apply searching behavior - spiral pattern like real predators
    applySearchingBehavior(tuna) {
        const pattern = tuna.huntingPattern;
        
        // Spiral search pattern
        pattern.searchSpiralAngle += 0.1; // Spiral speed
        pattern.searchSpiralRadius = Math.min(250, pattern.searchSpiralRadius + 0.5); // Expanding spiral
        
        const targetX = pattern.searchSpiralCenter.x + Math.cos(pattern.searchSpiralAngle) * pattern.searchSpiralRadius;
        const targetY = pattern.searchSpiralCenter.y + Math.sin(pattern.searchSpiralAngle) * pattern.searchSpiralRadius;
        
        const steering = window.Utils.calculateSteering(
            tuna,
            { x: targetX, y: targetY },
            tuna.maxSpeed * 0.6, // Slower, more methodical
            tuna.maxForce
        );
        
        this.applySmoothForce(tuna, {
            x: steering.x * 0.8,
            y: steering.y * 0.8
        });
    }
    
    // Apply cruising behavior - straight line movement with direction changes
    applyCruisingBehavior(tuna) {
        const pattern = tuna.huntingPattern;
        
        // Occasional direction changes during cruising
        if (Math.random() < 0.01) { // 1% chance per frame
            pattern.cruiseDirection += (Math.random() - 0.5) * 0.5; // Small direction change
        }
        
        const cruiseForce = {
            x: Math.cos(pattern.cruiseDirection) * 0.8,
            y: Math.sin(pattern.cruiseDirection) * 0.8
        };
        
        this.applySmoothForce(tuna, cruiseForce);
    }
    
    // Apply investigating behavior - move toward investigation target
    applyInvestigatingBehavior(tuna) {
        const pattern = tuna.huntingPattern;
        
        if (pattern.investigationTarget) {
            const steering = window.Utils.calculateSteering(
                tuna,
                pattern.investigationTarget,
                tuna.maxSpeed * 0.9, // Faster, more focused
                tuna.maxForce
            );
            
            this.applySmoothForce(tuna, {
                x: steering.x * 1.0,
                y: steering.y * 1.0
            });
            
            // Check if reached investigation target
            const dist = window.Utils.distance(tuna, pattern.investigationTarget);
            if (dist < 30) {
                pattern.investigationTarget = null; // Clear target when reached
            }
        }
    }
    
    // Keep the old method for compatibility but mark as legacy
    initializePatrolSystem(tuna) {
        // Legacy method - redirect to new system
        this.initializeRealisticPatrolSystem(tuna);
    }
    
    // Generate a patrol target that covers more distance
    generatePatrolTarget(tuna) {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        // Update patrol change timer
        tuna.patrolChangeTimer = (tuna.patrolChangeTimer || 0) + 1;
        
        // Occasionally change patrol direction for variety (less frequent for smoothness)
        if (tuna.patrolChangeTimer >= tuna.patrolChangeInterval) {
            // Change direction by smaller angles (30-90 degrees) for smoother turns
            const directionChange = (Math.PI / 6) + Math.random() * (Math.PI / 3);
            tuna.patrolDirection += Math.random() < 0.5 ? directionChange : -directionChange;
            
            // Reset timer with new random interval (longer intervals for smoother movement)
            tuna.patrolChangeTimer = 0;
            tuna.patrolChangeInterval = 300 + Math.random() * 360;
            
            if (window.gameState && window.gameState.tunaDebug) {
                console.log(`🐟 Tuna changed patrol direction to ${(tuna.patrolDirection * 180 / Math.PI).toFixed(1)}°`);
            }
        }
        
        // Calculate target position
        let targetX = tuna.x + Math.cos(tuna.patrolDirection) * tuna.patrolDistance;
        let targetY = tuna.y + Math.sin(tuna.patrolDirection) * tuna.patrolDistance;
        
        // Keep target within world bounds with buffer
        const buffer = 200;
        targetX = Math.max(buffer, Math.min(WORLD_WIDTH - buffer, targetX));
        targetY = Math.max(buffer, Math.min(WORLD_HEIGHT - buffer, targetY));
        
        // If target would be too close to world edge, adjust direction
        if (targetX <= buffer || targetX >= WORLD_WIDTH - buffer || 
            targetY <= buffer || targetY >= WORLD_HEIGHT - buffer) {
            // Turn toward center of world
            const centerX = WORLD_WIDTH / 2;
            const centerY = WORLD_HEIGHT / 2;
            tuna.patrolDirection = Math.atan2(centerY - tuna.y, centerX - tuna.x);
            
            // Recalculate target
            targetX = tuna.x + Math.cos(tuna.patrolDirection) * tuna.patrolDistance;
            targetY = tuna.y + Math.sin(tuna.patrolDirection) * tuna.patrolDistance;
        }
        
        return {
            x: targetX,
            y: targetY
        };
    }
    
    // Smooth tuna velocity to reduce jitter
    smoothTunaVelocity(tuna) {
        // Add current velocity to history
        tuna.velocityHistory.push({ x: tuna.velocity.x, y: tuna.velocity.y });
        
        // Keep only the most recent velocities
        if (tuna.velocityHistory.length > tuna.maxVelocityHistory) {
            tuna.velocityHistory.shift();
        }
        
        // Calculate average velocity
        let avgX = 0, avgY = 0;
        for (let vel of tuna.velocityHistory) {
            avgX += vel.x;
            avgY += vel.y;
        }
        avgX /= tuna.velocityHistory.length;
        avgY /= tuna.velocityHistory.length;
        
        // Apply smoothed velocity with gradual transition
        const smoothingFactor = 0.3; // How much to blend smoothed vs current velocity
        tuna.velocity.x = tuna.velocity.x * (1 - smoothingFactor) + avgX * smoothingFactor;
        tuna.velocity.y = tuna.velocity.y * (1 - smoothingFactor) + avgY * smoothingFactor;
    }
    
    // Apply forces smoothly to reduce jitter
    applySmoothForce(tuna, force) {
        // Initialize force history if needed
        if (!tuna.forceHistory) {
            tuna.forceHistory = [];
            tuna.maxForceHistory = 5;
        }
        
        // Add current force to history
        tuna.forceHistory.push({ x: force.x, y: force.y });
        
        // Keep only the most recent forces
        if (tuna.forceHistory.length > tuna.maxForceHistory) {
            tuna.forceHistory.shift();
        }
        
        // Calculate average force
        let avgForceX = 0, avgForceY = 0;
        for (let f of tuna.forceHistory) {
            avgForceX += f.x;
            avgForceY += f.y;
        }
        avgForceX /= tuna.forceHistory.length;
        avgForceY /= tuna.forceHistory.length;
        
        // Apply smoothed force
        tuna.applyForce({
            x: avgForceX,
            y: avgForceY
        });
    }
    
    // Generate a random wander target (kept for compatibility)
    generateWanderTarget(tuna) {
        const angle = Math.random() * Math.PI * 2;
        const distance = window.TUNA_CONFIG.wanderRadius * (0.5 + Math.random() * 0.5);
        
        return {
            x: tuna.x + Math.cos(angle) * distance,
            y: tuna.y + Math.sin(angle) * distance
        };
    }

    // Find a good resting spot
    findRestingSpot(tuna) {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        
        return {
            x: Math.max(100, Math.min(WORLD_WIDTH - 100, tuna.x + (Math.random() - 0.5) * 200)),
            y: Math.max(WORLD_HEIGHT * 0.6, Math.min(WORLD_HEIGHT - 100, tuna.y + Math.random() * 100))
        };
    }

    // Apply flee forces
    applyFleeForces(tuna, threats) {
        let fleeX = 0, fleeY = 0;
        
        for (let threat of threats) {
            const distance = window.Utils.distance(tuna, threat);
            const strength = window.TUNA_CONFIG.fleeRadius / distance;
            
            fleeX += (tuna.x - threat.x) * strength;
            fleeY += (tuna.y - threat.y) * strength;
        }
        
        if (threats.length > 0) {
            fleeX /= threats.length;
            fleeY /= threats.length;
            
            tuna.applyForce({
                x: fleeX * tuna.maxForce * 0.1,
                y: fleeY * tuna.maxForce * 0.1
            });
        }
    }

    // Apply general movement forces (depth preference, etc.)
    applyMovementForces(tuna) {
        // Apply repulsion from other tuna to prevent overlapping
        this.applyTunaRepulsion(tuna);
        
        // Depth preference - only when not hunting or attacking, and much gentler
        if (tuna.aiState !== window.TUNA_STATES.HUNTING && tuna.aiState !== window.TUNA_STATES.ATTACKING) {
            const depthDifference = tuna.y - tuna.preferredDepth;
            if (Math.abs(depthDifference) > tuna.depthTolerance) {
                // Much gentler depth force - reduced from 0.0001 to 0.00001 (10x weaker)
                const depthForce = -depthDifference * 0.00001;
                tuna.applyForce({ x: 0, y: depthForce * tuna.maxForce });
            }
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
    
    // Apply repulsion forces between tuna to prevent overlapping
    applyTunaRepulsion(tuna) {
        if (!window.gameEntities || !window.gameEntities.predators) return;
        
        const repulsionRadius = 80; // Distance at which repulsion starts
        const maxRepulsionRadius = 40; // Distance at which repulsion is maximum
        const maxRepulsionForce = 0.8; // Maximum repulsion force strength
        
        let totalRepulsionX = 0;
        let totalRepulsionY = 0;
        let repulsionCount = 0;
        
        // Check all other tuna for repulsion
        for (let otherTuna of window.gameEntities.predators) {
            if (otherTuna === tuna) continue; // Skip self
            
            const distance = window.Utils.distance(tuna, otherTuna);
            
            // Only apply repulsion if tuna are close enough
            if (distance < repulsionRadius && distance > 0) {
                // Calculate repulsion strength (stronger when closer)
                let repulsionStrength = 0;
                if (distance <= maxRepulsionRadius) {
                    // Maximum repulsion when very close
                    repulsionStrength = maxRepulsionForce;
                } else {
                    // Gradual repulsion based on distance
                    repulsionStrength = maxRepulsionForce * (1 - (distance - maxRepulsionRadius) / (repulsionRadius - maxRepulsionRadius));
                }
                
                // Calculate repulsion direction (away from other tuna)
                const angle = Math.atan2(tuna.y - otherTuna.y, tuna.x - otherTuna.x);
                const repulsionX = Math.cos(angle) * repulsionStrength;
                const repulsionY = Math.sin(angle) * repulsionStrength;
                
                totalRepulsionX += repulsionX;
                totalRepulsionY += repulsionY;
                repulsionCount++;
            }
        }
        
        // Apply average repulsion force if any repulsion was calculated
        if (repulsionCount > 0) {
            const avgRepulsionX = totalRepulsionX / repulsionCount;
            const avgRepulsionY = totalRepulsionY / repulsionCount;
            
            // Apply the repulsion force
            tuna.applyForce({
                x: avgRepulsionX,
                y: avgRepulsionY
            });
            
            // Debug logging for repulsion events (only when debug is enabled)
            if (window.gameState && window.gameState.tunaDebug && repulsionCount > 0) {
                console.log(`🐟 Tuna repulsion: ${repulsionCount} nearby tuna, force: (${avgRepulsionX.toFixed(2)}, ${avgRepulsionY.toFixed(2)})`);
            }
        }
    }

    // Attempt to eat a target - ENHANCED for comprehensive predation
    attemptToEat(tuna, target, gameEntities) {
        const preyArrays = [
            { array: gameEntities.fish, name: 'fish' },
            { array: gameEntities.krill, name: 'krill' },
            { array: gameEntities.paleKrill, name: 'paleKrill' },
            { array: gameEntities.momKrill, name: 'momKrill' },
            { array: gameEntities.fertilizedEggs, name: 'fertilizedEggs' },
            { array: gameEntities.fishEggs, name: 'fishEggs' } // CRITICAL FIX: Add fishEggs to eating logic
        ];
        
        for (let preyGroup of preyArrays) {
            const index = preyGroup.array.indexOf(target);
            if (index !== -1) {
                if (window.gameState && window.gameState.tunaDebug) {
                    console.log(`🐟 Tuna ate ${preyGroup.name} at distance ${window.Utils.distance(tuna, target).toFixed(1)}`);
                }
                
                preyGroup.array.splice(index, 1);
                
                // Start tuna pooping sequence (1-2 poop spread out over 200ms each)
                if (window.gameEntities && window.gameEntities.tunaPoopingSystem) {
                    window.gameEntities.tunaPoopingSystem.startPooping(tuna, window.gameEntities);
                } else if (window.gameEntities && window.gameEntities.poop && window.Poop) {
                    // Fallback to single poop if system not available
                    window.gameEntities.poop.push(new window.Poop(tuna.x, tuna.y, 'tuna'));
                }
                
                if (window.ObjectPools) {
                    for (let j = 0; j < 3; j++) {
                        window.ObjectPools.getEatingBubble(
                            tuna.x + (Math.random() - 0.5) * 20,
                            tuna.y + (Math.random() - 0.5) * 20
                        );
                    }
                }
                
                tuna.energy = Math.min(100, tuna.energy + 25);
                tuna.huntCooldown = 180;
                tuna.lastAttackTime = tuna.aiTimer;
                
                return true;
            }
        }
        
        if (window.gameState && window.gameState.tunaDebug) {
            console.log(`🐟 Tuna failed to eat target - not found in any prey array`);
        }
        
        return false;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TunaSteeringForces = TunaSteeringForces;
} 