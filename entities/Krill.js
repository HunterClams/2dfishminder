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
            this.isSwarmKrill = false; // Already lone krill
        } else {
            // Regular krill sprites (34% chance) - use larger size (swarm sprite with 4 krill)
            this.spriteFrames = ['krill1', 'krill2', 'krill3', 'krill2'];
            // Make regular krill larger (18px)
            this.size = 18;
            this.krillSize = 18;
            this.isSwarmKrill = true; // Mark as swarm krill (can be converted to lone krill)
        }
        
        // Regular krill can transform (this is already set in KrillBase but ensuring it's true)
        this.canTransform = true;
    }
    
    /**
     * Convert swarm krill to lone krill when part of the swarm is eaten
     * This is called when a fry eats the swarm krill
     */
    convertToLoneKrill() {
        if (!this.isSwarmKrill) return false; // Already lone krill or already converted
        
        // Swap sprite frames to lone krill
        this.spriteFrames = ['lonekrill1', 'lonekrill2', 'lonekrill3', 'lonekrill2'];
        
        // Reduce size from swarm size (18px) to lone size (9px)
        this.size = 9;
        this.krillSize = 9;
        
        // Mark as no longer swarm krill
        this.isSwarmKrill = false;
        
        return true; // Conversion successful
    }
    
    // Inherit all other functionality from KrillBase
    // Only override methods that need krill-specific behavior
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Krill = Krill;
} 