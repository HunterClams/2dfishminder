// Math utilities for the underwater game
// Core mathematical functions used throughout the game
// Enhanced with object pooling for better performance

// Pre-computed squared radii for performance optimization (using global CONSTANTS)
const GAME_CONSTANTS = window.CONSTANTS || {};
const PERCEPTION_RADIUS_SQUARED = (GAME_CONSTANTS.PERCEPTION_RADIUS || 50) * (GAME_CONSTANTS.PERCEPTION_RADIUS || 50);
const SEPARATION_RADIUS_SQUARED = (GAME_CONSTANTS.SEPARATION_RADIUS || 30) * (GAME_CONSTANTS.SEPARATION_RADIUS || 30);
const FEAR_RADIUS_SQUARED = (GAME_CONSTANTS.FEAR_RADIUS || 80) * (GAME_CONSTANTS.FEAR_RADIUS || 80);
const FOOD_ATTRACTION_RADIUS_SQUARED = (GAME_CONSTANTS.FOOD_ATTRACTION_RADIUS || 60) * (GAME_CONSTANTS.FOOD_ATTRACTION_RADIUS || 60);

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

// Optimized range checks using pre-computed squared radii
function isInPerceptionRange(obj1, obj2) {
    return distanceSquared(obj1, obj2) < PERCEPTION_RADIUS_SQUARED;
}

function isInSeparationRange(obj1, obj2) {
    return distanceSquared(obj1, obj2) < SEPARATION_RADIUS_SQUARED;
}

function isInFearRange(obj1, obj2) {
    return distanceSquared(obj1, obj2) < FEAR_RADIUS_SQUARED;
}

function isInFoodAttractionRange(obj1, obj2) {
    return distanceSquared(obj1, obj2) < FOOD_ATTRACTION_RADIUS_SQUARED;
}

// Fast inverse square root (Quake III algorithm adaptation for JavaScript)
function fastInverseSqrt(x) {
    const threehalfs = 1.5;
    let x2 = x * 0.5;
    let y = x;
    
    // Convert to 32-bit representation (JavaScript approximation)
    let i = new Float32Array([y])[0];
    i = 0x5f3759df - (i >> 1); // Magic number
    y = new Float32Array([i])[0];
    
    y = y * (threehalfs - (x2 * y * y));   // 1st iteration
    y = y * (threehalfs - (x2 * y * y));   // 2nd iteration
    
    return y;
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
window.handleEdges = handleEdges;
window.addVectors = addVectors;
window.multiplyVector = multiplyVector;

// Export optimized range check functions
window.isInPerceptionRange = isInPerceptionRange;
window.isInSeparationRange = isInSeparationRange;
window.isInFearRange = isInFearRange;
window.isInFoodAttractionRange = isInFoodAttractionRange;
window.fastInverseSqrt = fastInverseSqrt;

// Export pre-computed constants
window.PERCEPTION_RADIUS_SQUARED = PERCEPTION_RADIUS_SQUARED;
window.SEPARATION_RADIUS_SQUARED = SEPARATION_RADIUS_SQUARED;
window.FEAR_RADIUS_SQUARED = FEAR_RADIUS_SQUARED;
window.FOOD_ATTRACTION_RADIUS_SQUARED = FOOD_ATTRACTION_RADIUS_SQUARED; 