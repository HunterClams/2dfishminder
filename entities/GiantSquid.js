// GiantSquid class - the apex predator of the deep
class GiantSquid extends Entity {
    constructor() {
        super();
        
        // Giant squid properties
        this.maxSpeed = 4;
        this.maxForce = 0.08;
        this.size = 80;
        this.huntRadius = 200;
        this.attackRadius = 50;
        this.energy = 200;
        this.jetCooldown = 0;
        this.tentacleReach = 60;
        
        // Behavioral states
        this.state = 'patrol'; // patrol, hunt, attack, retreat
        this.target = null;
        this.stateTimer = 0;
        this.aggression = 0.9;
        this.territorialRadius = 300;
        
        // Animation
        this.animationFrame = 0;
        this.eyeBlinkTimer = 0;
        this.eyeBlinkDuration = 0;
        this.isBlinking = false;
        
        // Start in deep abyssal waters
        this.y = WORLD_HEIGHT * 0.8 + Math.random() * WORLD_HEIGHT * 0.15;
        this.preferredDepth = WORLD_HEIGHT * 0.85;
        this.depthTolerance = WORLD_HEIGHT * 0.1;
        
        // Territory center
        this.territoryX = this.x;
        this.territoryY = this.y;
    }
    
    jet(direction, power = 1.0) {
        if (this.jetCooldown > 0) return;
        
        // Powerful jet propulsion
        const jetForce = {
            x: direction.x * this.maxForce * power * 3,
            y: direction.y * this.maxForce * power * 3
        };
        
        this.applyForce(jetForce);
        this.jetCooldown = 60; // 1 second cooldown
        
        // Create jet effect (bubbles)
        if (window.ObjectPools) {
            for (let i = 0; i < 5; i++) {
                window.ObjectPools.getEatingBubble(
                    this.x - direction.x * 30 + (Math.random() - 0.5) * 20,
                    this.y - direction.y * 30 + (Math.random() - 0.5) * 20
                );
            }
        }
    }
    
    finPropulsion(direction, intensity = 0.5) {
        // Gentle fin-based movement
        const finForce = {
            x: direction.x * this.maxForce * intensity,
            y: direction.y * this.maxForce * intensity
        };
        this.applyForce(finForce);
    }
    
    tentacleAdjust(direction, strength = 0.3) {
        // Fine tentacle adjustments
        const tentacleForce = {
            x: direction.x * this.maxForce * strength,
            y: direction.y * this.maxForce * strength
        };
        this.applyForce(tentacleForce);
    }
    
    scanForPrey(predators, fish) {
        let closest = null;
        let closestDist = Infinity;
        
        // Hunt everything - predators and fish
        const allPrey = [...predators, ...fish];
        
        for (let prey of allPrey) {
            const d = Utils.distance(this.x, this.y, prey.x, prey.y);
            if (d < this.huntRadius && d < closestDist) {
                closest = prey;
                closestDist = d;
            }
        }
        
        return { target: closest, distance: closestDist };
    }
    
    maintainDepth() {
        // Strong preference for deep waters
        const depthDifference = this.y - this.preferredDepth;
        if (Math.abs(depthDifference) > this.depthTolerance) {
            const depthForce = -depthDifference * 0.0002;
            this.applyForce({ x: 0, y: depthForce * this.maxForce });
        }
    }
    
    update(fish, predators, krill) {
        this.stateTimer++;
        
        // Update cooldowns
        if (this.jetCooldown > 0) this.jetCooldown--;
        
        // Eye blinking animation
        this.eyeBlinkTimer++;
        if (this.eyeBlinkTimer > 180 && !this.isBlinking) { // Every 3 seconds
            this.isBlinking = true;
            this.eyeBlinkDuration = 10; // Blink for 10 frames
            this.eyeBlinkTimer = 0;
        }
        
        if (this.isBlinking) {
            this.eyeBlinkDuration--;
            if (this.eyeBlinkDuration <= 0) {
                this.isBlinking = false;
            }
        }
        
        // State machine
        switch (this.state) {
            case 'patrol':
                this.patrolBehavior(fish, predators);
                break;
            case 'hunt':
                this.huntBehavior(fish, predators);
                break;
            case 'attack':
                this.attackBehavior(fish, predators);
                break;
            case 'retreat':
                this.retreatBehavior();
                break;
        }
        
        // Always maintain depth preference
        this.maintainDepth();
        
        // Limit velocity
        const vel = Utils.limitVelocity(this.velocity, this.maxSpeed);
        this.velocity = vel;
        
        this.move();
        this.edges();
        
        // Decrease energy over time
        this.energy = Math.max(0, this.energy - 0.01);
        
        this.animationFrame += 0.05;
    }
    
    patrolBehavior(fish, predators) {
        // Scan for prey
        const scan = this.scanForPrey(predators, fish);
        
        if (scan.target && scan.distance < this.huntRadius) {
            this.target = scan.target;
            this.state = 'hunt';
            this.stateTimer = 0;
            return;
        }
        
        // Patrol territory
        const centerDist = Utils.distance(this.x, this.y, this.territoryX, this.territoryY);
        if (centerDist > this.territorialRadius) {
            // Return to territory center
            const returnDirection = Utils.calculateSteering(
                this.territoryX - this.x, 
                this.territoryY - this.y, 
                centerDist
            );
            this.finPropulsion(returnDirection, 0.3);
        } else {
            // Random patrol within territory
            if (this.stateTimer % 120 === 0) { // Every 2 seconds
                const patrolDirection = {
                    x: (Math.random() - 0.5) * 2,
                    y: (Math.random() - 0.5) * 2
                };
                this.finPropulsion(patrolDirection, 0.2);
            }
        }
    }
    
    huntBehavior(fish, predators) {
        if (!this.target || !this.target.isAlive) {
            this.state = 'patrol';
            this.target = null;
            return;
        }
        
        const dist = Utils.distance(this.x, this.y, this.target.x, this.target.y);
        
        if (dist < this.attackRadius) {
            this.state = 'attack';
            this.stateTimer = 0;
            return;
        }
        
        if (dist > this.huntRadius * 1.5) {
            // Lost prey
            this.state = 'patrol';
            this.target = null;
            return;
        }
        
        // Intelligent pursuit with prediction
        const predictionTime = dist / this.maxSpeed;
        const futureX = this.target.x + this.target.velocity.x * predictionTime * 2;
        const futureY = this.target.y + this.target.velocity.y * predictionTime * 2;
        
        const pursuitDirection = Utils.calculateSteering(
            futureX - this.x, 
            futureY - this.y, 
            dist
        );
        
        // Use jet for fast pursuit
        if (dist > 100 && this.jetCooldown === 0) {
            this.jet(pursuitDirection, 1.5);
        } else {
            this.finPropulsion(pursuitDirection, 0.8);
        }
    }
    
    attackBehavior(fish, predators) {
        if (!this.target) {
            this.state = 'patrol';
            return;
        }
        
        const dist = Utils.distance(this.x, this.y, this.target.x, this.target.y);
        
        if (dist < this.tentacleReach) {
            // Successful attack
            let preyArray = fish.includes(this.target) ? fish : predators;
            const index = preyArray.indexOf(this.target);
            
            if (index > -1) {
                preyArray.splice(index, 1);
                
                // Create massive poop when giant squid eats
                if (window.gameSystem) {
                    window.gameSystem.addEntity('poop', new Poop(this.x, this.y, 'squid'));
                }
                
                // Create dramatic eating effect
                if (window.ObjectPools) {
                    for (let i = 0; i < 8; i++) {
                        window.ObjectPools.getEatingBubble(
                            this.x + (Math.random() - 0.5) * 40,
                            this.y + (Math.random() - 0.5) * 40
                        );
                    }
                }
                
                this.energy = Math.min(200, this.energy + 50);
                console.log('Giant squid devoured its prey!');
            }
            
            this.state = 'retreat';
            this.target = null;
            this.stateTimer = 0;
        } else if (dist > this.attackRadius * 2) {
            // Prey escaped
            this.state = 'hunt';
        } else {
            // Continue attacking - use tentacles for fine control
            const attackDirection = Utils.calculateSteering(
                this.target.x - this.x, 
                this.target.y - this.y, 
                dist
            );
            this.tentacleAdjust(attackDirection, 1.0);
        }
    }
    
    retreatBehavior() {
        // Brief retreat after successful attack
        if (this.stateTimer > 60) { // 1 second retreat
            this.state = 'patrol';
            this.stateTimer = 0;
        } else {
            // Move away from last attack position
            const retreatDirection = {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2
            };
            this.finPropulsion(retreatDirection, 0.3);
        }
    }

    edges() {
        Utils.handleEdges(this, 50, 0.95);
    }

    draw() {
        if (!Utils.inRenderDistance(this)) return;
        
        this.angle = Math.atan2(this.velocity.y, this.velocity.x);
        
        // Choose sprite based on animation frame and blinking
        let spriteKey;
        if (this.isBlinking) {
            spriteKey = Math.sin(this.animationFrame) > 0 ? 'abyssalSquid1Blink' : 'abyssalSquid2Blink';
        } else {
            spriteKey = Math.sin(this.animationFrame) > 0 ? 'giantSquid1' : 'giantSquid2';
        }
        
        // State-based opacity
        let opacity = 1.0;
        if (this.state === 'hunt') {
            opacity = 0.9 + Math.sin(this.animationFrame * 3) * 0.1; // Slight pulsing when hunting
        } else if (this.state === 'attack') {
            opacity = 0.8 + Math.sin(this.animationFrame * 5) * 0.2; // More intense pulsing when attacking
        }
        
        this.drawSprite(sprites[spriteKey], this.size, opacity, this.angle);
        
        // Debug: Draw hunt radius in attack state
        if (this.state === 'attack' && this.target) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.tentacleReach, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.GiantSquid = GiantSquid;
} 