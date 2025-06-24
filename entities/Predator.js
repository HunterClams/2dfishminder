// Predator class for large hunting fish (tuna)
class Predator extends (window.Entity || Entity) {
    constructor(tunaType = 'tuna') {
        // Call parent constructor with mid-water spawning
        super(null, null, 'mid');
        
        // Use global constants safely
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        this.tunaType = tunaType;
        this.maxSpeed = 3;
        this.maxForce = 0.06;
        this.size = tunaType === 'tuna2' ? 55 : 50;
        this.huntRadius = 150;
        this.attackRadius = 30;
        this.energy = 100;
        this.huntCooldown = 0;
        this.isHunting = false;
        this.target = null;
        this.aggression = 0.7 + Math.random() * 0.3;
        this.patience = Math.random() * 200 + 100;
        this.currentPatience = this.patience;
        
        // Ensure velocity is properly initialized (safety check)
        if (!this.velocity) {
            this.velocity = { x: Math.random() * 6 - 3, y: Math.random() * 6 - 3 };
        }
        
        // Start in mid-to-deep waters
        this.y = WORLD_HEIGHT * 0.4 + Math.random() * WORLD_HEIGHT * 0.4;
        this.preferredDepth = WORLD_HEIGHT * 0.6;
        this.depthTolerance = WORLD_HEIGHT * 0.3;
    }

    edges() {
        Utils.handleEdges(this, 30, 0.9);
    }

    hunt(prey, krill = []) {
        const allPrey = [...prey, ...krill];
        let closest = null;
        let closestDist = Infinity;

        for (let p of allPrey) {
            if (!Utils.shouldIgnorePrey(this.tunaType, p.fishType)) {
                const d = Utils.distance(this.x, this.y, p.x, p.y);
                if (d < this.huntRadius && d < closestDist) {
                    closest = p;
                    closestDist = d;
                }
            }
        }

        if (closest) {
            this.target = closest;
            this.isHunting = true;
            this.currentPatience = this.patience;
            
            // Predict where the prey will be
            const predictionTime = closestDist / this.maxSpeed;
            const futureX = closest.x + closest.velocity.x * predictionTime;
            const futureY = closest.y + closest.velocity.y * predictionTime;
            
            const pursue = Utils.calculateSteering(futureX - this.x, futureY - this.y, closestDist);
            this.applyForce({
                x: pursue.x * this.maxForce * this.aggression * 2,
                y: pursue.y * this.maxForce * this.aggression * 2
            });
        } else {
            this.isHunting = false;
            this.target = null;
        }
    }

    checkForFood(prey, krill = []) {
        if (this.huntCooldown > 0) {
            this.huntCooldown--;
            return;
        }

        const allPrey = [...prey, ...krill];
        
        for (let i = allPrey.length - 1; i >= 0; i--) {
            const p = allPrey[i];
            if (!Utils.shouldIgnorePrey(this.tunaType, p.fishType)) {
                const d = Utils.distance(this.x, this.y, p.x, p.y);
                if (d < this.attackRadius) {
                    // Remove the prey
                    if (krill.includes(p)) {
                        const index = krill.indexOf(p);
                        if (index > -1) krill.splice(index, 1);
                    } else {
                        const index = prey.indexOf(p);
                        if (index > -1) prey.splice(index, 1);
                    }
                    
                    // Add large poop when tuna eats
                    if (window.gameSystem) {
                        window.gameSystem.addEntity('poop', new Poop(this.x, this.y, 'tuna'));
                    }
                    
                    // Create multiple eating bubbles
                    if (window.ObjectPools) {
                        for (let j = 0; j < 3; j++) {
                            window.ObjectPools.getEatingBubble(
                                this.x + (Math.random() - 0.5) * 20,
                                this.y + (Math.random() - 0.5) * 20
                            );
                        }
                    }
                    
                    this.energy = Math.min(100, this.energy + 25);
                    this.huntCooldown = 180; // 3 second cooldown
                    this.isHunting = false;
                    this.target = null;
                    break;
                }
            }
        }
    }

    update(prey, krill) {
        this.hunt(prey, krill);
        this.checkForFood(prey, krill);
        
        // Wander behavior when not hunting
        if (!this.isHunting) {
            this.currentPatience--;
            if (this.currentPatience <= 0) {
                // Random wander
                const wanderForce = {
                    x: (Math.random() - 0.5) * this.maxForce * 0.5,
                    y: (Math.random() - 0.5) * this.maxForce * 0.5
                };
                this.applyForce(wanderForce);
                this.currentPatience = this.patience;
            }
        }
        
        // Depth preference
        const depthDifference = this.y - this.preferredDepth;
        if (Math.abs(depthDifference) > this.depthTolerance) {
            const depthForce = -depthDifference * 0.0001;
            this.applyForce({ x: 0, y: depthForce * this.maxForce });
        }
        
        // Limit velocity
        const vel = Utils.limitVelocity(this.velocity, this.maxSpeed);
        this.velocity = vel;
        
        this.move();
        this.edges();
        
        // Decrease energy over time
        this.energy = Math.max(0, this.energy - 0.02);
    }

    draw() {
        this.angle = Math.atan2(this.velocity.y, this.velocity.x);
        this.drawSprite(sprites[this.tunaType], this.size, 1, this.angle);
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Predator = Predator;
} 