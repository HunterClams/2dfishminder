// Object pool system for managing reusable objects
class ObjectPoolSystem {
    constructor() {
        this.eatingBubbles = [];
        
        // Make this globally accessible
        window.ObjectPools = this;
    }
    
    getEatingBubble(x, y) {
        let bubble = this.eatingBubbles.find(b => b.isDead());
        if (!bubble) {
            bubble = new EatingBubble(x, y);
            this.eatingBubbles.push(bubble);
        } else {
            bubble.reset(x, y);
        }
        return bubble;
    }
    
    cleanup() {
        // Keep pool size manageable
        if (this.eatingBubbles.length > CONSTANTS.MAX_EATING_BUBBLES) {
            this.eatingBubbles = this.eatingBubbles.filter(b => !b.isDead()).slice(0, CONSTANTS.MAX_EATING_BUBBLES);
        }
    }
    
    reset() {
        this.eatingBubbles = [];
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.ObjectPoolSystem = ObjectPoolSystem;
} 