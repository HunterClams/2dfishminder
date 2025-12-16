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
        
        // Randomly select sprite set: 66% lone krill, 34% regular krill
        if (Math.random() < 0.66) {
            // Lone krill sprites (66% chance) - use original size (9px, smaller)
            this.spriteFrames = ['lonekrill1', 'lonekrill2', 'lonekrill3', 'lonekrill2'];
            // Size remains at 9 (original size from KrillBase)
        } else {
            // Regular krill sprites (34% chance) - use larger size
            this.spriteFrames = ['krill1', 'krill2', 'krill3', 'krill2'];
            // Make regular krill larger (18px)
            this.size = 18;
            this.krillSize = 18;
        }
        
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