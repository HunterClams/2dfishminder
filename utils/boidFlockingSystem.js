// Boid Flocking System Module
class BoidFlockingSystem {
    constructor() {
        this.constants = {
            PERCEPTION_RADIUS: 50,
            SEPARATION_RADIUS: 30
        };
    }

    flock(boid, boids, predators, food, krill = []) {
        const perceptionRadiusSquared = this.constants.PERCEPTION_RADIUS * this.constants.PERCEPTION_RADIUS;
        const separationRadiusSquared = this.constants.SEPARATION_RADIUS * this.constants.SEPARATION_RADIUS;
        
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let separation = { x: 0, y: 0 };
        let alignCount = 0, cohesionCount = 0, separationCount = 0;
        
        // Single pass through nearby boids
        for (let other of boids) {
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
        
        // Calculate steering forces
        const forces = { x: 0, y: 0 };
        
        if (alignCount > 0) {
            alignment.x /= alignCount;
            alignment.y /= alignCount;
            const alignSteering = this.calculateSteering(boid, alignment, boid.maxSpeed, boid.maxForce);
            forces.x += alignSteering.x;
            forces.y += alignSteering.y;
        }
        
        if (cohesionCount > 0) {
            cohesion.x = (cohesion.x / cohesionCount) - boid.x;
            cohesion.y = (cohesion.y / cohesionCount) - boid.y;
            const cohesionSteering = this.calculateSteering(boid, cohesion, boid.maxSpeed, boid.maxForce);
            forces.x += cohesionSteering.x;
            forces.y += cohesionSteering.y;
        }
        
        if (separationCount > 0) {
            separation.x /= separationCount;
            separation.y /= separationCount;
            const separationSteering = this.calculateSteering(boid, separation, boid.maxSpeed, boid.maxForce);
            forces.x += separationSteering.x * 1.5;
            forces.y += separationSteering.y * 1.5;
        }
        
        // Apply forces
        boid.velocity.x += forces.x;
        boid.velocity.y += forces.y;
        
        // Limit velocity
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(boid.velocity, boid.maxSpeed);
        }
    }

    distanceSquared(obj1, obj2) {
        return (obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2;
    }

    calculateSteering(boid, target, maxSpeed, maxForce) {
        // Simplified steering calculation
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
            window.Utils.handleEdges(boid, 20, 0.8, WORLD_WIDTH, WORLD_HEIGHT);
        }
    }
}

// Export for global access
window.BoidFlockingSystem = BoidFlockingSystem; 