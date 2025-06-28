// Simple utility functions for the fish game
// This file can be loaded as a separate script without ES6 modules

function createFishFood(x, y) {
    return {
        x: x,
        y: y,
        velocity: { x: (Math.random() - 0.5) * 0.1, y: 0.5 },
        size: 8,
        eaten: false,
        feedValue: 15,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        rotation: 0,
        opacity: 1.0,
        age: 0,
        maxAge: 10000,
        
        update: function() {
            if (this.eaten) return;
            
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.rotation += this.rotationSpeed;
            this.age++;
            
            this.velocity.x *= 0.998;
            this.velocity.y *= 0.999;
            
            if (this.age > this.maxAge * 0.8) {
                this.opacity = Math.max(0, 1 - (this.age - this.maxAge * 0.8) / (this.maxAge * 0.2));
            }
            
            if (this.age > this.maxAge || this.y > 8000 + 100 || 
                this.x < -100 || this.x > 12000 + 100) {
                this.eaten = true;
            }
        }
    };
}

// Make the function available globally
window.createFishFood = createFishFood; 