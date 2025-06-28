// Math utilities for the underwater game
// Core mathematical functions used throughout the game

// Fast distance calculation (no sqrt for comparisons)
function distanceSquared(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return dx * dx + dy * dy;
}

// Regular distance calculation
function distance(obj1, obj2) {
    return Math.hypot(obj1.x - obj2.x, obj1.y - obj2.y);
}

// Normalize a vector to unit length
function normalize(vector) {
    const magnitude = Math.hypot(vector.x, vector.y);
    if (magnitude === 0) return { x: 0, y: 0 };
    return {
        x: vector.x / magnitude,
        y: vector.y / magnitude
    };
}

// Optimized steering calculation for AI movement
function calculateSteering(seeker, target, maxSpeed, maxForce) {
    const dx = target.x - seeker.x;
    const dy = target.y - seeker.y;
    const mag = Math.hypot(dx, dy);
    
    if (mag === 0) return { x: 0, y: 0 };
    
    const desiredX = (dx / mag) * maxSpeed;
    const desiredY = (dy / mag) * maxSpeed;
    const steerX = desiredX - seeker.velocity.x;
    const steerY = desiredY - seeker.velocity.y;
    const steerMag = Math.hypot(steerX, steerY);
    
    if (steerMag > maxForce) {
        return {
            x: (steerX / steerMag) * maxForce,
            y: (steerY / steerMag) * maxForce
        };
    }
    
    return { x: steerX, y: steerY };
}

// Fast velocity limiting
function limitVelocity(velocity, maxSpeed) {
    const speedSquared = velocity.x * velocity.x + velocity.y * velocity.y;
    if (speedSquared > maxSpeed * maxSpeed) {
        const speed = Math.sqrt(speedSquared);
        velocity.x = (velocity.x / speed) * maxSpeed;
        velocity.y = (velocity.y / speed) * maxSpeed;
    }
    return velocity; // Return the velocity object
}

// Optimized edge handling for entities
function handleEdges(entity, margin, damping, worldWidth, worldHeight) {
    let bounced = false;
    if (entity.x > worldWidth - margin) {
        entity.x = worldWidth - margin;
        entity.velocity.x *= -damping;
        bounced = true;
    } else if (entity.x < margin) {
        entity.x = margin;
        entity.velocity.x *= -damping;
        bounced = true;
    }
    
    if (entity.y > worldHeight - margin) {
        entity.y = worldHeight - margin;
        entity.velocity.y *= -damping;
        bounced = true;
    } else if (entity.y < margin) {
        entity.y = margin;
        entity.velocity.y *= -damping;
        bounced = true;
    }
    return bounced;
}

// Make functions available globally
window.distanceSquared = distanceSquared;
window.distance = distance;
window.normalize = normalize;
window.calculateSteering = calculateSteering;
window.limitVelocity = limitVelocity;
window.handleEdges = handleEdges; 