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
            tuna.maxSpeed * window.TUNA_CONFIG.patrolSpeed, 
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
                
                // Start tuna pooping sequence (1-3 poop spread out over 200ms each)
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