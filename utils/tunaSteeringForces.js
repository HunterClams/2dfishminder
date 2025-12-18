// Tuna Steering Forces - Force calculations and movement logic for tuna AI
// Handles all steering, movement, target prediction, and eating logic

class TunaSteeringForces {
    constructor() {}

    // Apply hunting movement forces - pursue prey with prediction
    applyHuntingForces(tuna) {
        if (!tuna.aiTarget) return;
        
        const config = window.TUNA_CONFIG || {};
        const distanceToTarget = window.Utils.distance(tuna, tuna.aiTarget);
        
        // Use config huntSpeed (1.4 = 40% boost)
        const speedBoost = config.huntSpeed || 1.4;
        
        // Predict target movement (intercept trajectory)
        const predictionTime = Math.min(
            distanceToTarget / (tuna.maxSpeed * speedBoost),
            config.maxPredictionTime || 3.0
        );
        
        const futureX = tuna.aiTarget.x + (tuna.aiTarget.velocity?.x || 0) * predictionTime;
        const futureY = tuna.aiTarget.y + (tuna.aiTarget.velocity?.y || 0) * predictionTime;
        
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

    // REMOVED: applyAttackForces - no longer needed, hunting handles eating directly

    // Handle wandering behavior - REALISTIC predator patrol patterns (used during feeding)
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
    
    // Horizontal-focused patrolling to large distant targets (covers large areas)
    handleHorizontalPatrolling(tuna, gameEntities = null) {
        const config = window.TUNA_CONFIG || {};
        const horizontalBias = config.patrolHorizontalBias || 0.8;
        const patrolDistance = config.patrolDistance || 800;
        const patrolVariation = config.patrolVariation || 500;
        
        // Calculate flocking influence BEFORE setting patrol target
        // This allows the patrol target to be biased toward nearby tuna (cohesion)
        let flockingBias = { x: 0, y: 0 };
        if (gameEntities && gameEntities.predators) {
            const allTuna = gameEntities.predators || [];
            const perceptionRadius = config.flockingPerceptionRadius || 400;
            const perceptionRadiusSquared = perceptionRadius * perceptionRadius;
            
            let nearbyCount = 0;
            let nearbyCenterX = 0;
            let nearbyCenterY = 0;
            
            for (let other of allTuna) {
                if (other === tuna || !other.x || !other.y) continue;
                
                const distSquared = window.Utils.distanceSquared(tuna, other);
                if (distSquared < perceptionRadiusSquared) {
                    nearbyCenterX += other.x;
                    nearbyCenterY += other.y;
                    nearbyCount++;
                }
            }
            
            // If there are nearby tuna, bias patrol target toward them (cohesion influence)
            if (nearbyCount > 0) {
                nearbyCenterX /= nearbyCount;
                nearbyCenterY /= nearbyCount;
                
                // Calculate direction toward nearby tuna center (stronger influence)
                const cohesionInfluence = 0.4; // How much to bias toward group
                flockingBias.x = (nearbyCenterX - tuna.x) * cohesionInfluence;
                flockingBias.y = (nearbyCenterY - tuna.y) * cohesionInfluence;
            }
        }
        
        // Initialize patrol target if needed
        if (!tuna.patrolTarget) {
            tuna.patrolTarget = this.generateLargePatrolTarget(tuna, patrolDistance, patrolVariation, horizontalBias);
        }
        
        // Adjust patrol target based on flocking bias (makes tuna move toward each other)
        if (flockingBias.x !== 0 || flockingBias.y !== 0) {
            // Move patrol target slightly toward nearby tuna center
            tuna.patrolTarget.x += flockingBias.x * 0.3;
            tuna.patrolTarget.y += flockingBias.y * 0.3;
        }
        
        // Check if we've reached the target or are close enough
        const distToTarget = window.Utils.distance(tuna, tuna.patrolTarget);
        const arrivalThreshold = 100; // Consider "reached" when within 100px
        
        if (distToTarget < arrivalThreshold) {
            // Generate new distant target for large-area patrolling
            tuna.patrolTarget = this.generateLargePatrolTarget(tuna, patrolDistance, patrolVariation, horizontalBias);
            
            // Apply flocking bias to new target as well
            if (flockingBias.x !== 0 || flockingBias.y !== 0) {
                tuna.patrolTarget.x += flockingBias.x * 0.3;
                tuna.patrolTarget.y += flockingBias.y * 0.3;
            }
        }
        
        // Use steering to move toward the distant target (creates large area coverage)
        const steering = window.Utils.calculateSteering(
            tuna,
            tuna.patrolTarget,
            tuna.maxSpeed * (config.patrolSpeed || 1.0),
            tuna.maxForce
        );
        
        // Reduce patrol steering strength significantly to allow flocking forces to have more influence
        // Scale down by 30% to make room for flocking behavior
        const patrolForceScale = 0.7;
        const scaledSteering = {
            x: steering.x * patrolForceScale,
            y: steering.y * patrolForceScale
        };
        
        // Apply steering force (this will make tuna travel long distances)
        this.applySmoothForce(tuna, scaledSteering);
        
        // Apply velocity smoothing
        this.smoothTunaVelocity(tuna);
    }
    
    // Generate a large patrol target far away (for covering large areas)
    generateLargePatrolTarget(tuna, baseDistance, variation, horizontalBias) {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        // Calculate random distance (large distance for large area coverage)
        // Increase horizontal distance by 25% to cover more ground
        const baseDistanceScaled = baseDistance * 1.25; // Increase base distance for more horizontal coverage
        const variationScaled = variation * 1.25; // Scale variation proportionally
        const distance = baseDistanceScaled + Math.random() * variationScaled; // ~1000-1625px away (increased from 800-1300)
        
        // Choose direction with horizontal bias (mostly horizontal movement)
        // Random angle, but bias toward horizontal directions
        // Add 25% vertical boost for slight vertical variation
        const angle = Math.random() * Math.PI * 2;
        const horizontalComponent = Math.cos(angle);
        const verticalComponent = Math.sin(angle) * (1 - horizontalBias) * 1.25; // 25% vertical boost
        
        // Normalize the biased direction
        const dirMag = Math.sqrt(horizontalComponent * horizontalComponent + verticalComponent * verticalComponent);
        const dirX = dirMag > 0 ? horizontalComponent / dirMag : (horizontalComponent >= 0 ? 1 : -1);
        const dirY = dirMag > 0 ? verticalComponent / dirMag : 0;
        
        // Calculate target position
        let targetX = tuna.x + dirX * distance;
        let targetY = tuna.y + dirY * distance;
        
        // Keep target within world bounds (with buffer)
        const buffer = 300;
        targetX = Math.max(buffer, Math.min(WORLD_WIDTH - buffer, targetX));
        targetY = Math.max(buffer, Math.min(WORLD_HEIGHT - buffer, targetY));
        
        // If target would be outside bounds, generate a new direction toward center
        if (targetX <= buffer || targetX >= WORLD_WIDTH - buffer || 
            targetY <= buffer || targetY >= WORLD_HEIGHT - buffer) {
            // Turn toward center of world
            const centerX = WORLD_WIDTH / 2;
            const centerY = WORLD_HEIGHT / 2;
            const toCenterX = centerX - tuna.x;
            const toCenterY = centerY - tuna.y;
            const toCenterMag = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
            
            if (toCenterMag > 0) {
                // Apply horizontal distance boost here too
                const distanceScaled = distance; // distance is already scaled above
                targetX = tuna.x + (toCenterX / toCenterMag) * distanceScaled;
                targetY = tuna.y + (toCenterY / toCenterMag) * distanceScaled * (1 - horizontalBias);
            }
        }
        
        return { x: targetX, y: targetY };
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
        // Initialize velocity history if needed
        if (!tuna.velocityHistory) {
            tuna.velocityHistory = [];
            tuna.maxVelocityHistory = 8;
        }
        
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

    // REMOVED: findRestingSpot method - no longer needed without resting state
    // Tuna now use continuous dynamic patrolling for better predator behavior

    // Apply flee forces - escape from threats
    applyFleeForces(tuna, threats) {
        const config = window.TUNA_CONFIG || {};
        const fleeSpeed = config.fleeSpeed || 1.2;
        let fleeX = 0, fleeY = 0;
        
        for (let threat of threats) {
            const distance = window.Utils.distance(tuna, threat);
            const strength = config.fleeRadius / distance;
            
            fleeX += (tuna.x - threat.x) * strength;
            fleeY += (tuna.y - threat.y) * strength;
        }
        
        if (threats.length > 0) {
            fleeX /= threats.length;
            fleeY /= threats.length;
            
            // Normalize flee direction
            const fleeMagnitude = Math.sqrt(fleeX * fleeX + fleeY * fleeY);
            if (fleeMagnitude > 0) {
                fleeX /= fleeMagnitude;
                fleeY /= fleeMagnitude;
            }
            
            // Apply flee force with speed boost
            tuna.applyForce({
                x: fleeX * tuna.maxForce * fleeSpeed * 0.15,
                y: fleeY * tuna.maxForce * fleeSpeed * 0.15
            });
            
            tuna.currentSpeedBoost = fleeSpeed;
        }
    }

    // Calculate minor flocking forces (for 3-5 tuna schools)
    calculateTunaFlocking(tuna, allTuna) {
        const config = window.TUNA_CONFIG || {};
        const perceptionRadius = config.flockingPerceptionRadius || 400;
        const separationRadius = config.flockingSeparationRadius || 150;
        const perceptionRadiusSquared = perceptionRadius * perceptionRadius;
        const separationRadiusSquared = separationRadius * separationRadius;
        
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let separation = { x: 0, y: 0 };
        let alignCount = 0, cohesionCount = 0, separationCount = 0;
        
        // Find nearby tuna
        for (let other of allTuna) {
            if (other === tuna || !other.velocity) continue;
            
            const distSquared = window.Utils.distanceSquared(tuna, other);
            
            // Alignment and cohesion - within perception radius
            if (distSquared < perceptionRadiusSquared) {
                alignment.x += other.velocity.x;
                alignment.y += other.velocity.y;
                alignCount++;
                
                cohesion.x += other.x;
                cohesion.y += other.y;
                cohesionCount++;
            }
            
            // Separation - within separation radius
            if (distSquared < separationRadiusSquared) {
                const dist = Math.sqrt(distSquared);
                if (dist > 0) {
                    const diff = { x: (tuna.x - other.x) / dist, y: (tuna.y - other.y) / dist };
                    separation.x += diff.x;
                    separation.y += diff.y;
                    separationCount++;
                }
            }
        }
        
        // Calculate forces with minor weights (for subtle flocking)
        const forces = { x: 0, y: 0 };
        
        // Alignment: Match velocity direction of nearby tuna (weak)
        if (alignCount > 0) {
            alignment.x /= alignCount;
            alignment.y /= alignCount;
            // Alignment is the desired velocity (average of nearby tuna velocities)
            // Calculate steering from current velocity toward desired alignment
            const desired = { x: alignment.x * tuna.maxSpeed, y: alignment.y * tuna.maxSpeed };
            const steer = {
                x: desired.x - tuna.velocity.x,
                y: desired.y - tuna.velocity.y
            };
            // Limit steering force
            const steerMag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
            if (steerMag > tuna.maxForce) {
                steer.x = (steer.x / steerMag) * tuna.maxForce;
                steer.y = (steer.y / steerMag) * tuna.maxForce;
            }
            forces.x += steer.x * (config.flockingAlignmentWeight || 0.4);
            forces.y += steer.y * (config.flockingAlignmentWeight || 0.4);
        }
        
        // Cohesion: Move toward center of nearby tuna (very weak - just enough to group)
        if (cohesionCount > 0) {
            cohesion.x = (cohesion.x / cohesionCount) - tuna.x;
            cohesion.y = (cohesion.y / cohesionCount) - tuna.y;
            // Cohesion target is the center of nearby tuna
            const cohesionTarget = { x: tuna.x + cohesion.x, y: tuna.y + cohesion.y };
            const cohesionSteering = window.Utils.calculateSteering(
                tuna,
                cohesionTarget,
                tuna.maxSpeed,
                tuna.maxForce
            );
            forces.x += cohesionSteering.x * (config.flockingCohesionWeight || 0.5);
            forces.y += cohesionSteering.y * (config.flockingCohesionWeight || 0.5);
        }
        
        // Separation: Avoid crowding (moderate - prevents overlap)
        if (separationCount > 0) {
            separation.x /= separationCount;
            separation.y /= separationCount;
            forces.x += separation.x * (config.flockingSeparationWeight || 0.3) * tuna.maxForce;
            forces.y += separation.y * (config.flockingSeparationWeight || 0.3) * tuna.maxForce;
        }
        
        return forces;
    }
    
    // Apply general movement forces (depth preference, etc.)
    applyMovementForces(tuna, gameEntities = null) {
        // Apply minor flocking during patrolling and feeding (not during hunting or fleeing)
        if (gameEntities && 
            (tuna.aiState === window.TUNA_STATES.PATROLLING || tuna.aiState === window.TUNA_STATES.FEEDING)) {
            const allTuna = gameEntities.predators || [];
            const flockingForces = this.calculateTunaFlocking(tuna, allTuna);
            tuna.applyForce(flockingForces);
        }
        
        // Apply repulsion from other tuna to prevent overlapping (legacy system - still used)
        this.applyTunaRepulsion(tuna);
        
        // Depth preference - only when not hunting, and much gentler
        if (tuna.aiState !== window.TUNA_STATES.HUNTING) {
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