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

    // Handle wandering behavior - Enhanced patrol system
    handleWandering(tuna) {
        // Initialize patrol system if needed
        if (!tuna.patrolTarget || !tuna.patrolDirection) {
            this.initializePatrolSystem(tuna);
        }
        
        const distToTarget = window.Utils.distance(tuna, tuna.patrolTarget);
        
        // Check if we've reached the current patrol target
        if (distToTarget < 50) {
            tuna.patrolTarget = this.generatePatrolTarget(tuna);
        }
        
        // Calculate steering toward patrol target
        const patrol = window.Utils.calculateSteering(
            tuna, 
            tuna.patrolTarget, 
            tuna.maxSpeed * window.TUNA_CONFIG.patrolSpeed, 
            tuna.maxForce
        );
        
        // Apply patrol forces with smooth variation
        const patrolStrength = 0.7; // Stronger than old wandering
        this.applySmoothForce(tuna, {
            x: patrol.x * patrolStrength,
            y: patrol.y * patrolStrength
        });
        
        // Apply velocity smoothing to reduce jitter
        this.smoothTunaVelocity(tuna);
        
        // Add very subtle random variation to prevent perfectly straight lines (reduced for smoothness)
        const randomVariation = 0.01; // Further reduced for even smoother movement
        const randomAngle = Math.random() * Math.PI * 2;
        tuna.applyForce({
            x: Math.cos(randomAngle) * randomVariation,
            y: Math.sin(randomAngle) * randomVariation
        });
    }

    // Initialize the patrol system for a tuna
    initializePatrolSystem(tuna) {
        // Set initial patrol direction (random)
        tuna.patrolDirection = Math.random() * Math.PI * 2;
        
        // Set patrol parameters
        tuna.patrolDistance = 300 + Math.random() * 400; // 300-700 pixel patrol range
        tuna.patrolChangeTimer = 0;
        tuna.patrolChangeInterval = 300 + Math.random() * 360; // 5-11 seconds between direction changes (increased for smoothness)
        
        // Initialize movement smoothing
        tuna.velocityHistory = []; // Store recent velocities for smoothing
        tuna.maxVelocityHistory = 10; // Number of velocities to average
        tuna.smoothedVelocity = { x: 0, y: 0 };
        
        // Generate first patrol target
        tuna.patrolTarget = this.generatePatrolTarget(tuna);
        
        // Debug logging
        if (window.gameState && window.gameState.tunaDebug) {
            console.log(`🐟 Tuna patrol system initialized: direction ${(tuna.patrolDirection * 180 / Math.PI).toFixed(1)}°, distance ${tuna.patrolDistance.toFixed(1)}px`);
        }
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

    // Attempt to eat a target
    attemptToEat(tuna, target, gameEntities) {
        const preyArrays = [
            { array: gameEntities.fish, name: 'fish' },
            { array: gameEntities.krill, name: 'krill' },
            { array: gameEntities.paleKrill, name: 'paleKrill' },
            { array: gameEntities.momKrill, name: 'momKrill' },
            { array: gameEntities.fertilizedEggs, name: 'fertilizedEggs' }
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