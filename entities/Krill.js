// Main Krill class - now inherits from KrillBase for modularity
class Krill extends KrillBase {
    constructor(x, y, velocity = null) {
        super();
        
        // Override spawn position if provided
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        }
        
        // Override velocity if provided
        if (velocity) {
            this.velocity = velocity;
        }
        
        // Don't override properties already set in KrillBase, just customize specific ones
        // Regular krill specific properties (only set what's unique to regular krill)
        this.behaviorState = 'foraging'; // Default behavior state
        
        // Ensure sprite frames are set for regular krill
        this.spriteFrames = ['krill1', 'krill2', 'krill3', 'krill2'];
        
        // Regular krill can transform (this is already set in KrillBase but ensuring it's true)
        this.canTransform = true;
    }
    
    // Inherit all other functionality from KrillBase
    // Only override methods that need krill-specific behavior
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Krill = Krill;
} 