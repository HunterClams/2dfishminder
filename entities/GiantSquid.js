// GiantSquid class - Deep water apex predator with advanced jet propulsion and bioluminescence
class GiantSquid extends (window.Entity || Entity) {
    constructor() {
        // Use global constants safely
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        // Spawn in abyssal zones (75-95% depth)
        const spawnY = WORLD_HEIGHT * (0.75 + Math.random() * 0.2);
        const spawnX = Math.random() * WORLD_WIDTH;
        super(spawnX, spawnY, 'abyssal');
        
        // Physical properties - 5% increase from base values
        this.size = 446.25; // Large sprite size
        this.maxSpeed = 73.5; 
        this.cruiseSpeed = 16.8; 
        this.burstSpeed = 63.0; 
        this.maxForce = 1.05; 
        
        // Jet propulsion system
        this.jetPower = 0;
        this.jetDirection = { x: 0, y: 0 };
        this.jetCooldown = 0;
        this.jetDuration = 0;
        this.mantle = {
            contracted: false,
            contractTime: 0,
            cycleTime: 0
        };
        
        // Behavioral state machine
        this.state = 'patrolling';  // patrolling, hunting, attacking, retreating
        this.stateTimer = 0;
        this.huntTarget = null;
        this.grabbedPrey = null;
        
        // Movement patterns
        this.tentaclePulse = 0;
        this.finUndulation = 0;
        this.currentSpeed = 0;
        this.targetDepth = this.y;
        
        // Bioluminescent blinking system
        this.blinkTimer = 0;
        this.blinkCycle = 80; // Blink every 1.33 seconds (60 FPS * 1.33)
        this.blinkDuration = 20; // Blink lasts 0.33 seconds
        
        // Sensory system - scaled proportionally for larger squid
        this.visionRange = 1050; 
        this.visionRangeSquared = this.visionRange * this.visionRange;
        this.attackRange = 315; 
        this.attackRangeSquared = this.attackRange * this.attackRange;
        
        // Full shader effect applied (no reduction)
        this.depthOpacityMultiplier = 1; // Full depth shader effect
        this.lastEatTime = 0; // Track when giant squid last ate
        this.eatCooldown = 10000; // 10 second cooldown between eating
        this.lastPoopTime = 0; // Track when squid last pooped
        this.poopIgnoreDuration = 8000; // 8 seconds to ignore tuna after pooping
        
        // Initialize with gentle downward drift
        this.velocity = { x: 0, y: 0.2 };
        
        console.log('Massive Giant Squid created at:', this.x, this.y, 'Size:', this.size);
    }
    
    // Jet propulsion mechanics
    jet(direction, power = 1.0) {
        if (this.jetCooldown <= 0) {
            this.jetPower = power;
            this.jetDirection.x = direction.x;
            this.jetDirection.y = direction.y;
            this.jetDuration = 15 + (power * 10); // Jet duration based on power
            this.jetCooldown = 30 + (power * 20); // Cooldown based on power
            this.mantle.contracted = true;
            this.mantle.contractTime = 8;
            
            // Immediate velocity change from jet
            const jetForce = power * 1.68; 
            this.velocity.x += direction.x * jetForce;
            this.velocity.y += direction.y * jetForce;
        }
    }
    
    // Fin-based gentle movement
    finPropulsion(direction, intensity = 0.5) {
        const finForce = intensity * 0.315; 
        this.velocity.x += direction.x * finForce;
        this.velocity.y += direction.y * finForce;
        this.finUndulation += 0.3;
    }
    
    // Tentacle movement for fine positioning  
    tentacleAdjust(direction, strength = 0.3) {
        const tentacleForce = strength * 0.168; 
        this.velocity.x += direction.x * tentacleForce;
        this.velocity.y += direction.y * tentacleForce;
        this.tentaclePulse += 0.2;
    }
    
    // Hunt for prey (only target tuna)
    scanForPrey(predators, fish) {
        let closestPrey = null;
        let closestDistance = this.visionRangeSquared;
        
        // Check if squid should ignore tuna after pooping
        const currentTime = Date.now();
        const shouldIgnoreTuna = (currentTime - this.lastPoopTime) < this.poopIgnoreDuration;
        
        // Only hunt tuna (predators) - ignore all other fish
        if (!shouldIgnoreTuna) {
            for (let tuna of predators) {
                const distSquared = Utils.distanceSquared(this, tuna);
                if (distSquared < closestDistance) {
                    closestPrey = tuna;
                    closestDistance = distSquared;
                }
            }
        }
        
        return closestPrey;
    }
    
    // Depth preference (stay in deep waters)
    maintainDepth() {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const currentDepth = this.y / WORLD_HEIGHT;
        
        // Prefer 75-95% depth range
        let targetDepthPercent = 0.85; // Preferred depth
        
        if (currentDepth < 0.7) {
            // Too shallow - dive deeper
            targetDepthPercent = 0.8;
        } else if (currentDepth > 0.95) {
            // Too deep - rise slightly
            targetDepthPercent = 0.9;
        }
        
        this.targetDepth = WORLD_HEIGHT * targetDepthPercent;
        
        // Gentle depth adjustment - scaled for larger squid
        const depthDiff = this.targetDepth - this.y;
        if (Math.abs(depthDiff) > 150) { 
            const direction = { x: 0, y: Math.sign(depthDiff) };
            this.finPropulsion(direction, 0.4);
        }
    }
    
    update(fish, predators, krill) {
        this.stateTimer++;
        
        // Update jet propulsion system
        if (this.jetDuration > 0) {
            this.jetDuration--;
            // Apply continuous jet force
            this.velocity.x += this.jetDirection.x * this.jetPower * 0.21; 
            this.velocity.y += this.jetDirection.y * this.jetPower * 0.21;
        }
        
        if (this.jetCooldown > 0) {
            this.jetCooldown--;
        }
        
        // Update mantle contraction
        if (this.mantle.contracted) {
            this.mantle.contractTime--;
            if (this.mantle.contractTime <= 0) {
                this.mantle.contracted = false;
            }
        }
        
        // Update fin and tentacle animation
        this.finUndulation += 0.1;
        this.tentaclePulse += 0.05;
        
        // Update bioluminescent blinking
        this.blinkTimer++;
        if (this.blinkTimer >= this.blinkCycle) {
            this.blinkTimer = 0; // Reset timer
        }
        
        // Behavioral state machine
        switch (this.state) {
            case 'patrolling':
                this.patrolBehavior(fish, predators);
                break;
            case 'hunting':
                this.huntBehavior(fish, predators);
                break;
            case 'attacking':
                this.attackBehavior(fish, predators);
                break;
            case 'retreating':
                this.retreatBehavior();
                break;
        }
        
        // Maintain depth preference
        this.maintainDepth();
        
        // Apply drag (squids are not as streamlined as fish) - balanced drag
        this.velocity.x *= 0.94; 
        this.velocity.y *= 0.94;
        
        // Calculate current speed for animation
        this.currentSpeed = Math.hypot(this.velocity.x, this.velocity.y);
        
        // Limit velocity
        Utils.limitVelocity(this.velocity, this.maxSpeed);
        
        this.move();
        this.edges();
    }
    
    patrolBehavior(fish, predators) {
        // Slow, energy-efficient movement
        if (this.stateTimer % 60 === 0) { // Every 2 seconds
            // Random gentle movement
            const direction = {
                x: (Math.random() - 0.5) * 0.5,
                y: (Math.random() - 0.5) * 0.3
            };
            this.finPropulsion(direction, 0.3);
        }
        
        // Scan for prey
        const prey = this.scanForPrey(predators, fish);
        if (prey) {
            this.huntTarget = prey;
            this.state = 'hunting';
            this.stateTimer = 0;
        }
        
        // Change to hunting state periodically
        if (this.stateTimer > 300 + Math.random() * 300) {
            this.state = 'hunting';
            this.stateTimer = 0;
        }
    }
    
    huntBehavior(fish, predators) {
        if (!this.huntTarget) {
            this.huntTarget = this.scanForPrey(predators, fish);
        }
        
        if (this.huntTarget) {
            const dist = this.distance(this, this.huntTarget);
            
            if (dist < this.attackRange) {
                this.state = 'attacking';
                this.stateTimer = 0;
                return;
            }
            
            // Approach using jet propulsion
            const direction = this.normalize({
                x: this.huntTarget.x - this.x,
                y: this.huntTarget.y - this.y
            });
            
            // Use powerful jet for attack approach
            if (this.jetCooldown <= 0 && dist > 400) { 
                this.jet(direction, 0.8);
            } else {
                // Use fins for fine positioning
                this.finPropulsion(direction, 0.6);
            }
        } else {
            // No target found, return to patrolling
            this.state = 'patrolling';
            this.stateTimer = 0;
        }
        
        // Timeout hunting
        if (this.stateTimer > 200) {
            this.state = 'patrolling';
            this.stateTimer = 0;
            this.huntTarget = null;
        }
    }
    
    attackBehavior(fish, predators) {
        if (this.huntTarget) {
            const dist = this.distance(this, this.huntTarget);
            
            if (dist < 220) { 
                // Check eating cooldown before grabbing prey
                const currentTime = Date.now();
                if (currentTime - this.lastEatTime < this.eatCooldown) {
                    // Still in cooldown, retreat
                    this.state = 'retreating';
                    this.stateTimer = 0;
                    this.huntTarget = null;
                    return;
                }
                
                // Successful attack - grab prey
                this.grabbedPrey = this.huntTarget;
                
                // Remove prey from arrays
                let preyIndex = predators.indexOf(this.huntTarget);
                if (preyIndex !== -1) {
                    predators.splice(preyIndex, 1);
                } else {
                    preyIndex = fish.indexOf(this.huntTarget);
                    if (preyIndex !== -1) {
                        fish.splice(preyIndex, 1);
                    }
                }
                
                // Create dramatic capture effect - scaled for larger squid
                for (let i = 0; i < 20; i++) { // More bubbles for larger squid
                    if (window.ObjectPools) {
                        window.ObjectPools.getEatingBubble(
                            this.x + (Math.random() - 0.5) * 250, 
                            this.y + (Math.random() - 0.5) * 250
                        );
                    }
                }
                
                this.state = 'retreating';
                this.stateTimer = 0;
                this.huntTarget = null;
                
                // Powerful escape jet
                const escapeDirection = {
                    x: (Math.random() - 0.5),
                    y: 0.8 // Dive down
                };
                this.jet(this.normalize(escapeDirection), 1.0);
                
            } else {
                // Final attack approach
                const direction = this.normalize({
                    x: this.huntTarget.x - this.x,
                    y: this.huntTarget.y - this.y
                });
                
                // Tentacle strike
                this.tentacleAdjust(direction, 0.8);
                
                // Timeout attack
                if (this.stateTimer > 60) {
                    this.state = 'hunting';
                    this.stateTimer = 0;
                }
            }
        } else {
            this.state = 'patrolling';
            this.stateTimer = 0;
        }
    }
    
    retreatBehavior() {
        // Consume prey and rest
        if (this.grabbedPrey) {
            // Consumption complete after 3 seconds
            if (this.stateTimer > 180) {
                // Create large poop (100% of the time when eating tuna)
                if (window.gameEntities && window.Poop) {
                    window.gameEntities.poop.push(new window.Poop(this.x, this.y, 'squid'));
                }
                this.lastEatTime = Date.now();
                this.lastPoopTime = Date.now(); // Track when we pooped
                
                // Final consumption bubbles - scaled for larger squid
                for (let i = 0; i < 15; i++) { 
                    if (window.ObjectPools) {
                        window.ObjectPools.getEatingBubble(
                            this.x + (Math.random() - 0.5) * 300, 
                            this.y + (Math.random() - 0.5) * 300
                        );
                    }
                }
                
                this.grabbedPrey = null;
                this.state = 'patrolling';
                this.stateTimer = 0;
            }
        } else {
            // Just retreating without prey
            if (this.stateTimer > 120) {
                this.state = 'patrolling';
                this.stateTimer = 0;
            }
        }
        
        // Gentle settling movement
        if (this.stateTimer % 30 === 0) {
            const settleDirection = {
                x: (Math.random() - 0.5) * 0.2,
                y: 0.1
            };
            this.finPropulsion(settleDirection, 0.2);
        }
    }
    
    edges() {
        Utils.handleEdges(this, 200, 0.6); // Larger edge buffer
    }
    
    draw() {
        if (Utils.inRenderDistance(this)) {
            // Choose sprite based on movement state
            let sprite, abyssalSprite;
            const isBlinking = this.blinkTimer < this.blinkDuration; // Blink for first part of cycle
            
            // Use global sprites safely
            const sprites = window.sprites || {};
            
            if (this.mantle.contracted || this.jetDuration > 0) {
                sprite = sprites.giantSquid2; // Contracted mantle during jetting
                // Alternate between normal and blinking bioluminescent sprites
                abyssalSprite = isBlinking ? sprites.abyssalSquid2Blink : sprites.abyssalSquid2;
            } else {
                sprite = sprites.giantSquid1; // Relaxed mantle
                // Alternate between normal and blinking bioluminescent sprites
                abyssalSprite = isBlinking ? sprites.abyssalSquid1Blink : sprites.abyssalSquid1;
            }
            
            // Calculate angle based on movement direction
            let angle = 0;
            if (this.currentSpeed > 0.5) {
                angle = Math.atan2(this.velocity.y, this.velocity.x) * 0.3;
            }
            
            // Apply full water shader effect
            const baseOpacity = Utils.getDepthOpacity(this.y, 1.0);
            const reducedOpacity = baseOpacity * this.depthOpacityMultiplier + (1 - this.depthOpacityMultiplier);
            
            // Draw base squid sprite
            this.drawSprite(sprite, this.size, reducedOpacity, angle);
            
            // Check if in deep waters (70%+ depth) and overlay bioluminescent sprites
            const depthFactor = Utils.getDepthFactor(this.y);
            if (depthFactor >= 0.7) { // In deep waters or abyssal zone
                let bioIntensity;
                
                if (depthFactor >= 0.8) {
                    // Abyssal zone (80-100%): Full intensity bioluminescence
                    const abyssalProgress = (depthFactor - 0.8) / 0.2; // 0 to 1 in abyssal zone
                    bioIntensity = 0.3 + (abyssalProgress * 0.4); // 0.3 to 0.7 opacity
                } else {
                    // Faint tier (70-80%): Progressive bioluminescence activation
                    const faintProgress = (depthFactor - 0.7) / 0.1; // 0 to 1 in faint zone
                    bioIntensity = 0.1 + (faintProgress * 0.2); // 0.1 to 0.3 opacity
                }
                
                // Full brightness for abyssal sprites - no depth shader tint
                const spotReducedOpacity = 1.0; // Maximum opacity, no depth effects
                
                // Draw bioluminescent overlay with additive blending for glow effect
                ctx.save();
                ctx.globalCompositeOperation = 'screen'; // Additive blending for glow
                this.drawSprite(abyssalSprite, this.size, spotReducedOpacity, angle);
                ctx.restore();
            }
            
            // Draw grabbed prey if consuming - scaled for larger squid
            if (this.grabbedPrey && this.state === 'retreating') {
                const sprites = window.sprites || {};
                const preySprite = sprites[this.grabbedPrey.tunaType] || sprites.smallFry2;
                const preyX = this.x + Math.cos(this.tentaclePulse) * 75; 
                const preyY = this.y + Math.sin(this.tentaclePulse) * 50; 
                
                ctx.save();
                ctx.globalAlpha = reducedOpacity * 0.7;
                ctx.translate(preyX, preyY);
                ctx.rotate(angle * 0.5);
                ctx.drawImage(preySprite, -this.grabbedPrey.size/2, -this.grabbedPrey.size/2, 
                             this.grabbedPrey.size, this.grabbedPrey.size);
                ctx.restore();
            }
        }
    }

    // Helper methods
    distance(obj1, obj2) {
        return Math.sqrt((obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2);
    }

    normalize(vector) {
        const mag = Math.sqrt(vector.x ** 2 + vector.y ** 2);
        if (mag === 0) return { x: 0, y: 0 };
        return { x: vector.x / mag, y: vector.y / mag };
    }
}

// Export for global access
window.GiantSquid = GiantSquid; 