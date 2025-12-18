// Math utilities for the underwater game
// Core mathematical functions used throughout the game
// Enhanced with object pooling for better performance

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

// Optimized steering calculation for AI movement with object pooling
function calculateSteering(seeker, target, maxSpeed, maxForce) {
    const pool = window.enhancedObjectPools;
    if (!pool) {
        // Fallback to original implementation
        return calculateSteeringOriginal(seeker, target, maxSpeed, maxForce);
    }
    
    const desired = pool.getVector(target.x - seeker.x, target.y - seeker.y);
    const steer = pool.getSteeringForce();
    
    const mag = Math.hypot(desired.x, desired.y);
    
    if (mag === 0) {
        pool.releaseVector(desired);
        pool.releaseSteeringForce(steer);
        return { x: 0, y: 0 };
    }
    
    desired.x = (desired.x / mag) * maxSpeed;
    desired.y = (desired.y / mag) * maxSpeed;
    steer.x = desired.x - seeker.velocity.x;
    steer.y = desired.y - seeker.velocity.y;
    
    const steerMag = Math.hypot(steer.x, steer.y);
    
    if (steerMag > maxForce) {
        steer.x = (steer.x / steerMag) * maxForce;
        steer.y = (steer.y / steerMag) * maxForce;
    }
    
    const result = { x: steer.x, y: steer.y };
    
    // Release pooled objects
    pool.releaseVector(desired);
    pool.releaseSteeringForce(steer);
    
    return result;
}

// Original implementation as fallback
function calculateSteeringOriginal(seeker, target, maxSpeed, maxForce) {
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

// Enforce minimum speed - ensures velocity magnitude is at least minSpeed
function enforceMinimumSpeed(velocity, minSpeed) {
    if (minSpeed <= 0) return velocity; // Skip if no minimum required
    
    const speedSquared = velocity.x * velocity.x + velocity.y * velocity.y;
    const minSpeedSquared = minSpeed * minSpeed;
    
    // If velocity is too slow (or zero), set it to a random direction with minimum speed
    if (speedSquared < minSpeedSquared) {
        const angle = Math.random() * Math.PI * 2;
        velocity.x = Math.cos(angle) * minSpeed;
        velocity.y = Math.sin(angle) * minSpeed;
    }
    
    return velocity;
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

// Enhanced vector operations with pooling
function addVectors(v1, v2) {
    const pool = window.enhancedObjectPools;
    if (!pool) {
        return { x: v1.x + v2.x, y: v1.y + v2.y };
    }
    
    const result = pool.getVector(v1.x + v2.x, v1.y + v2.y);
    const finalResult = { x: result.x, y: result.y };
    pool.releaseVector(result);
    return finalResult;
}

function multiplyVector(vector, scalar) {
    const pool = window.enhancedObjectPools;
    if (!pool) {
        return { x: vector.x * scalar, y: vector.y * scalar };
    }
    
    const result = pool.getVector(vector.x * scalar, vector.y * scalar);
    const finalResult = { x: result.x, y: result.y };
    pool.releaseVector(result);
    return finalResult;
}

// Make functions available globally
window.distanceSquared = distanceSquared;
window.distance = distance;
window.normalize = normalize;
window.calculateSteering = calculateSteering;
window.limitVelocity = limitVelocity;
window.enforceMinimumSpeed = enforceMinimumSpeed;
window.handleEdges = handleEdges;
window.addVectors = addVectors;
window.multiplyVector = multiplyVector; 