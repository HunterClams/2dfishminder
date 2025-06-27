// TrueFry class - Enhanced fry with stronger schooling behavior
class TrueFry extends Boid {
    constructor() {
        // Call parent constructor with truefry type
        super('truefry');
        
        // Enhanced schooling properties
        this.schoolingIntensity = 2.0; // Stronger schooling urge (vs 1.0 for regular fry)
        this.cohesionRadius = 100; // Larger cohesion radius (vs 80 for regular fry)
        this.alignmentRadius = 80; // Larger alignment radius (vs 60 for regular fry)
        this.separationRadius = 25; // Tighter separation (vs 35 for regular fry)
        
        // Enhanced movement properties
        this.maxSpeed = 3.5; // Slightly faster than regular fry
        this.maxForce = 0.08; // More responsive steering
        this.size = 40; // Slightly larger than regular fry
        
        // TrueFry specific properties
        this.fishType = 'truefry';
        this.spriteFrames = ['truefry1', 'truefry1', 'truefry1', 'truefry1']; // Use truefry sprite
        this.frameSpeed = 0.12; // Slightly faster animation
        
        // Enhanced energy and nutrition (truefry are more robust)
        this.energy = 120; // Higher energy than regular fry
        this.nutritionLevel = 0.9; // Higher nutrition value
        this.hunger = Math.random() * 0.3; // Lower initial hunger
        
        // Schooling behavior enhancements
        this.schoolingTarget = null;
        this.schoolingUrge = 0.9; // Very high urge to school
        this.formationPreference = 'tight'; // Prefer tight formations
        
        // Initialize modular systems with enhanced schooling
        this.initializeTrueFrySystems();
        
        console.log('🐟 TrueFry created with enhanced schooling behavior');
    }
    
    initializeTrueFrySystems() {
        // Enhanced flocking system for stronger schooling
        if (window.BoidFlockingSystem) {
            this.flockingSystem = new window.BoidFlockingSystem();
            // Override constants for stronger schooling
            this.flockingSystem.constants.PERCEPTION_RADIUS = 80; // Larger perception
            this.flockingSystem.constants.SEPARATION_RADIUS = 25; // Tighter separation
        }
        
        // Enhanced feeding system
        if (window.BoidFeedingSystem) {
            this.feedingSystem = new window.BoidFeedingSystem();
        }
    }
    
    update(boids, predators, food, krill = [], poop = [], fertilizedEggs = []) {
        // Enhanced schooling behavior
        this.updateSchooling(boids);
        
        // Standard boid behaviors
        this.updateFeeding(food, krill, poop, fertilizedEggs);
        this.updatePredatorAvoidance(predators);
        this.updateMovement();
        this.updateAnimation();
        
        // Handle edges
        if (window.Utils && window.Utils.handleEdges) {
            window.Utils.handleEdges(this, 20, 0.8);
        }
    }
    
    updateSchooling(boids) {
        if (!this.flockingSystem) return;
        
        // Enhanced flocking with stronger schooling urge
        this.flockingSystem.flock(this, boids, [], [], []);
        
        // Additional schooling behavior
        this.findSchoolingTarget(boids);
        this.applySchoolingUrge();
    }
    
    findSchoolingTarget(boids) {
        let bestTarget = null;
        let bestScore = 0;
        
        for (let other of boids) {
            if (other === this || other.fishType !== 'truefry') continue;
            
            const distance = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
            
            if (distance < this.cohesionRadius) {
                // Score based on proximity and velocity alignment
                const velocityAlignment = Math.abs(
                    (this.velocity.x * other.velocity.x + this.velocity.y * other.velocity.y) /
                    (Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2) * 
                     Math.sqrt(other.velocity.x ** 2 + other.velocity.y ** 2))
                );
                
                const score = (this.cohesionRadius - distance) / this.cohesionRadius * velocityAlignment;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = other;
                }
            }
        }
        
        this.schoolingTarget = bestTarget;
    }
    
    applySchoolingUrge() {
        if (!this.schoolingTarget) return;
        
        // Strong urge to follow schooling target
        const dx = this.schoolingTarget.x - this.x;
        const dy = this.schoolingTarget.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const schoolingForce = this.schoolingUrge * this.maxForce;
            this.velocity.x += (dx / distance) * schoolingForce;
            this.velocity.y += (dy / distance) * schoolingForce;
        }
    }
    
    updateFeeding(food, krill, poop, fertilizedEggs) {
        if (!this.feedingSystem) return;
        
        // TrueFry can eat the same things as regular fry but more efficiently
        const ateSomething = this.feedingSystem.checkForFood(this, krill, food, poop, fertilizedEggs);
        
        // If truefry ate something and we have the evolution system, mark it
        if (ateSomething && window.TrueFryEvolutionSystem) {
            window.TrueFryEvolutionSystem.markAsEaten(this);
        }
    }
    
    updatePredatorAvoidance(predators) {
        // Enhanced predator avoidance
        for (let predator of predators) {
            const distance = Math.sqrt((this.x - predator.x) ** 2 + (this.y - predator.y) ** 2);
            const fleeRadius = 150; // Larger flee radius than regular fry
            
            if (distance < fleeRadius) {
                const fleeIntensity = (fleeRadius - distance) / fleeRadius * 2.0; // Stronger flee
                const dx = this.x - predator.x;
                const dy = this.y - predator.y;
                
                if (distance > 0) {
                    this.velocity.x += (dx / distance) * fleeIntensity * this.maxForce;
                    this.velocity.y += (dy / distance) * fleeIntensity * this.maxForce;
                }
            }
        }
    }
    
    updateMovement() {
        // Apply velocity
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        // Limit velocity
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(this.velocity, this.maxSpeed);
        }
    }
    
    updateAnimation() {
        this.animationFrame += this.frameSpeed;
        if (this.animationFrame >= this.spriteFrames.length) {
            this.animationFrame = 0;
        }
    }
    
    draw(ctx, camera) {
        if (!ctx || !camera) return;
        
        // Calculate screen position
        const screenX = this.x - camera.x + camera.width / 2;
        const screenY = this.y - camera.y + camera.height / 2;
        
        // Check if on screen
        if (screenX < -50 || screenX > camera.width + 50 || 
            screenY < -50 || screenY > camera.height + 50) {
            return;
        }
        
        // Get sprite frame
        const frameIndex = Math.floor(this.animationFrame) % this.spriteFrames.length;
        const spriteName = this.spriteFrames[frameIndex];
        
        // Draw sprite
        if (window.sprites && window.sprites[spriteName]) {
            const sprite = window.sprites[spriteName];
            const drawSize = this.size * camera.zoom;
            
            ctx.save();
            ctx.translate(screenX, screenY);
            
            // Rotate based on velocity
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            ctx.rotate(angle);
            
            // Draw with enhanced visual effects
            ctx.globalAlpha = 0.9; // Slightly more visible than regular fry
            ctx.drawImage(
                sprite,
                -drawSize / 2, -drawSize / 2,
                drawSize, drawSize
            );
            
            ctx.restore();
        } else {
            // Fallback circle if sprite not found
            ctx.save();
            ctx.fillStyle = '#4CAF50';
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.size * camera.zoom / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// Export for global access
window.TrueFry = TrueFry; 