// Boid Flocking System Module
// Enhanced with spatial partitioning for efficient neighbor queries

class BoidFlockingSystem {
    constructor() {
        this.constants = {
            PERCEPTION_RADIUS: 50,
            SEPARATION_RADIUS: 30
        };
        
        // Performance tracking
        this.performanceStats = {
            spatialQueries: 0,
            traditionalQueries: 0,
            lastReset: 0
        };
    }

    flock(boid, boids, predators, food, krill = []) {
        const gameEntities = window.gameEntities;
        
        // Use spatial partitioning if available
        if (gameEntities && gameEntities.spatialPartitioning) {
            return this.spatialFlock(boid, gameEntities);
        } else {
            // Fallback to traditional flocking
            return this.traditionalFlock(boid, boids, predators, food, krill);
        }
    }
    
    spatialFlock(boid, gameEntities) {
        this.performanceStats.spatialQueries++;
        
        const perceptionRadius = this.constants.PERCEPTION_RADIUS;
        const separationRadius = this.constants.SEPARATION_RADIUS;
        
        // Get nearby boids using spatial partitioning
        const nearbyBoids = gameEntities.spatialPartitioning.getNearbyEntities(
            boid, 
            perceptionRadius, 
            ['fish', 'krill', 'paleKrill', 'momKrill']
        );
        
        // Filter to actual boids (not other entity types)
        const nearbyActualBoids = nearbyBoids.filter(entity => 
            entity instanceof window.Boid || 
            entity instanceof window.Krill || 
            entity instanceof window.PaleKrill || 
            entity instanceof window.MomKrill
        );
        
        return this.calculateFlockingForces(boid, nearbyActualBoids, perceptionRadius, separationRadius);
    }
    
    traditionalFlock(boid, boids, predators, food, krill) {
        this.performanceStats.traditionalQueries++;
        
        const perceptionRadius = this.constants.PERCEPTION_RADIUS;
        const separationRadius = this.constants.SEPARATION_RADIUS;
        
        // Combine all boids for traditional flocking
        const allBoids = [...boids, ...krill];
        
        // Debug logging for fry flocking
        if (window.gameState && window.gameState.fryDebug && boid.frameCount % 120 === 0) {
            console.log(`🐟 Fry traditional flocking:`, {
                fishType: boid.fishType,
                totalBoids: allBoids.length,
                perceptionRadius: perceptionRadius,
                separationRadius: separationRadius,
                currentVelocity: { x: Math.round(boid.velocity.x * 100) / 100, y: Math.round(boid.velocity.y * 100) / 100 }
            });
        }
        
        return this.calculateFlockingForces(boid, allBoids, perceptionRadius, separationRadius);
    }
    
    calculateFlockingForces(boid, nearbyBoids, perceptionRadius, separationRadius) {
        const perceptionRadiusSquared = perceptionRadius * perceptionRadius;
        const separationRadiusSquared = separationRadius * separationRadius;
        
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let separation = { x: 0, y: 0 };
        let alignCount = 0, cohesionCount = 0, separationCount = 0;
        
        // Process nearby entities
        for (let other of nearbyBoids) {
            if (other === boid) continue;
            
            const distSquared = this.distanceSquared(boid, other);
            
            if (distSquared < perceptionRadiusSquared) {
                alignment.x += other.velocity.x;
                alignment.y += other.velocity.y;
                alignCount++;
                
                cohesion.x += other.x;
                cohesion.y += other.y;
                cohesionCount++;
            }
            
            if (distSquared < separationRadiusSquared) {
                const dist = Math.sqrt(distSquared);
                const diff = { x: (boid.x - other.x) / dist, y: (boid.y - other.y) / dist };
                separation.x += diff.x;
                separation.y += diff.y;
                separationCount++;
            }
        }
        
        // RESTORE FULL COMPLEX FLOCKING SYSTEM (CAREFULLY BALANCED)
        // Calculate steering forces
        const forces = { x: 0, y: 0 };
        
        // Alignment: Fry align their direction with nearby fry
        if (alignCount > 0) {
            alignment.x /= alignCount;
            alignment.y /= alignCount;
            const alignSteering = this.calculateSteering(boid, alignment, boid.maxSpeed, boid.maxForce);
            forces.x += alignSteering.x * 0.4; // Moderate alignment
            forces.y += alignSteering.y * 0.4;
        }
        
        // Cohesion: Fry move toward the center of nearby groups (VERY WEAK to prevent cascade)
        if (cohesionCount > 0) {
            cohesion.x = (cohesion.x / cohesionCount) - boid.x;
            cohesion.y = (cohesion.y / cohesionCount) - boid.y;
            const cohesionSteering = this.calculateSteering(boid, cohesion, boid.maxSpeed, boid.maxForce);
            
            // EXTREMELY weak cohesion to prevent cascade effects
            const cohesionStrength = 0.05; // Very weak - just enough to create loose groups
            forces.x += cohesionSteering.x * cohesionStrength;
            forces.y += cohesionSteering.y * cohesionStrength;
            
            // Add random offset to break perfect convergence
            const randomOffset = 0.02;
            forces.x += (Math.random() - 0.5) * randomOffset;
            forces.y += (Math.random() - 0.5) * randomOffset;
        }
        
        // Separation: Fry avoid crowding each other
        if (separationCount > 0) {
            separation.x /= separationCount;
            separation.y /= separationCount;
            const separationSteering = this.calculateSteering(boid, separation, boid.maxSpeed, boid.maxForce);
            forces.x += separationSteering.x * 1.2; // Strong separation to prevent clustering
            forces.y += separationSteering.y * 1.2;
        }
        
        // Add small random movement to prevent perfect alignment
        const randomAngle = Math.random() * Math.PI * 2;
        const randomForce = 0.015; // Small random force
        forces.x += Math.cos(randomAngle) * randomForce;
        forces.y += Math.sin(randomAngle) * randomForce;
        
        // Debug logging for complex flocking
        if (window.gameState && window.gameState.fryDebug && boid.frameCount % 120 === 0) {
            console.log(`🐟 Fry complex flocking:`, {
                fishType: boid.fishType,
                behaviorState: boid.behaviorState,
                nearbyBoids: nearbyBoids.length,
                alignCount: alignCount,
                cohesionCount: cohesionCount,
                separationCount: separationCount,
                totalForces: { x: Math.round(forces.x * 100) / 100, y: Math.round(forces.y * 100) / 100 },
                currentPosition: { x: Math.round(boid.x), y: Math.round(boid.y) },
                currentVelocity: { x: Math.round(boid.velocity.x * 100) / 100, y: Math.round(boid.velocity.y * 100) / 100 }
            });
        }
        
        // Add depth-seeking behavior for fry
        if (boid.preferredDepth !== undefined && boid.depthTolerance !== undefined) {
            const depthDifference = boid.y - boid.preferredDepth;
            if (Math.abs(depthDifference) > boid.depthTolerance) {
                // Create a target at the preferred depth
                const depthTarget = { x: boid.x, y: boid.preferredDepth };
                const depthSteering = this.calculateSteering(boid, depthTarget, boid.maxSpeed, boid.maxForce);
                
                // Apply depth-seeking force (gentle to avoid overwhelming other behaviors)
                forces.x += depthSteering.x * 0.2;
                forces.y += depthSteering.y * 0.2;
                
                // Debug logging for depth-seeking behavior
                if (window.gameState && window.gameState.fryDebug && boid.frameCount % 120 === 0) {
                    console.log(`🐟 Fry depth-seeking:`, {
                        fishType: boid.fishType,
                        currentY: Math.round(boid.y),
                        preferredDepth: Math.round(boid.preferredDepth),
                        depthDifference: Math.round(depthDifference),
                        depthTolerance: Math.round(boid.depthTolerance),
                        depthForce: { x: Math.round(depthSteering.x * 100) / 100, y: Math.round(depthSteering.y * 100) / 100 },
                        totalForces: { x: Math.round(forces.x * 100) / 100, y: Math.round(forces.y * 100) / 100 }
                    });
                }
            }
        }
        
        // Add random movement when no flocking forces are applied (prevents straight-line drift)
        if (alignCount === 0 && cohesionCount === 0 && separationCount === 0) {
            // Add small random steering force to prevent straight-line movement
            const randomAngle = Math.random() * Math.PI * 2;
            const randomForce = 0.02; // Very small random force
            forces.x += Math.cos(randomAngle) * randomForce;
            forces.y += Math.sin(randomAngle) * randomForce;
            
            // Debug logging for random movement
            if (window.gameState && window.gameState.fryDebug && boid.frameCount % 120 === 0) {
                console.log(`🐟 Fry random movement applied:`, {
                    fishType: boid.fishType,
                    behaviorState: boid.behaviorState,
                    randomForce: { x: Math.round(Math.cos(randomAngle) * randomForce * 100) / 100, y: Math.round(Math.sin(randomAngle) * randomForce * 100) / 100 }
                });
            }
        }
        
        // Add boundary avoidance to prevent fry from getting stuck in corners
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const boundaryMargin = 200; // Distance from edge to start avoiding
        
        // Check if fry is too close to any boundary
        let boundaryForce = { x: 0, y: 0 };
        
        if (boid.x < boundaryMargin) {
            boundaryForce.x += 0.1; // Push away from left edge
        } else if (boid.x > WORLD_WIDTH - boundaryMargin) {
            boundaryForce.x -= 0.1; // Push away from right edge
        }
        
        if (boid.y < boundaryMargin) {
            boundaryForce.y += 0.1; // Push away from top edge
        } else if (boid.y > WORLD_HEIGHT - boundaryMargin) {
            boundaryForce.y -= 0.1; // Push away from bottom edge
        }
        
        // Apply boundary avoidance force
        forces.x += boundaryForce.x;
        forces.y += boundaryForce.y;
        
        // Debug logging for boundary avoidance
        if (window.gameState && window.gameState.fryDebug && boid.frameCount % 120 === 0 && (boundaryForce.x !== 0 || boundaryForce.y !== 0)) {
            console.log(`🐟 Fry boundary avoidance:`, {
                fishType: boid.fishType,
                position: { x: Math.round(boid.x), y: Math.round(boid.y) },
                boundaryForce: { x: Math.round(boundaryForce.x * 100) / 100, y: Math.round(boundaryForce.y * 100) / 100 },
                worldBounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT }
            });
        }
        
        // Apply forces directly to velocity (like original working version)
        boid.velocity.x += forces.x;
        boid.velocity.y += forces.y;
        
        // Limit velocity
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(boid.velocity, boid.maxSpeed);
        }
        
        // Log performance stats periodically
        if (window.gameState && window.gameState.frameCount % 600 === 0) {
            const totalQueries = this.performanceStats.spatialQueries + this.performanceStats.traditionalQueries;
            if (totalQueries > 0) {
                const spatialPercentage = (this.performanceStats.spatialQueries / totalQueries * 100).toFixed(1);
                if (window.ConsoleDebugSystem) {
                    window.ConsoleDebugSystem.log('FLOCKING', `Spatial queries: ${spatialPercentage}% (${this.performanceStats.spatialQueries}/${totalQueries})`);
                }
            }
        }
    }

    distanceSquared(obj1, obj2) {
        return (obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2;
    }

    calculateSteering(boid, target, maxSpeed, maxForce) {
        // Use enhanced math utilities with object pooling
        if (window.calculateSteering) {
            return window.calculateSteering(boid, target, maxSpeed, maxForce);
        }
        
        // Fallback to simplified steering calculation
        const desired = this.normalize(target);
        desired.x *= maxSpeed;
        desired.y *= maxSpeed;
        
        const steer = {
            x: desired.x - boid.velocity.x,
            y: desired.y - boid.velocity.y
        };
        
        // Limit steering force
        const mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
        if (mag > maxForce) {
            steer.x = (steer.x / mag) * maxForce;
            steer.y = (steer.y / mag) * maxForce;
        }
        
        return steer;
    }

    normalize(vector) {
        const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (mag === 0) return { x: 0, y: 0 };
        return { x: vector.x / mag, y: vector.y / mag };
    }

    handleEdges(boid) {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        if (window.Utils && window.Utils.handleEdges) {
            window.Utils.handleEdges(boid, 50, 0.9, WORLD_WIDTH, WORLD_HEIGHT);
        }
    }
    
    // Get performance statistics
    getStats() {
        const totalQueries = this.performanceStats.spatialQueries + this.performanceStats.traditionalQueries;
        const spatialPercentage = totalQueries > 0 ? 
            (this.performanceStats.spatialQueries / totalQueries * 100).toFixed(1) : 0;
        
        return {
            spatialQueries: this.performanceStats.spatialQueries,
            traditionalQueries: this.performanceStats.traditionalQueries,
            spatialPercentage: spatialPercentage + '%',
            totalQueries: totalQueries
        };
    }
    
    // Reset performance stats
    reset() {
        this.performanceStats.spatialQueries = 0;
        this.performanceStats.traditionalQueries = 0;
    }
}

// Export for global access
window.BoidFlockingSystem = BoidFlockingSystem; 