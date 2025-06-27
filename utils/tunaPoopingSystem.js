// Tuna Pooping System - Modular pooping behavior for tuna
class TunaPoopingSystem {
    constructor() {
        this.config = {
            POOP_COUNT: { min: 1, max: 3 },  // Number of poop to create (1-3)
            FIRST_POOP_INTERVAL: 200,         // 200ms for first poop
            SUBSEQUENT_POOP_INTERVAL: 200,    // 200ms for subsequent poop (changed from 400)
            POOP_SPREAD: 30,                  // Spread radius for poop placement
            DEBUG: false  // Will be controlled by debug view system
        };
        
        console.log('🐟 Tuna Pooping System initialized');
    }
    
    /**
     * Initialize pooping properties for a tuna
     * @param {Object} tuna - The tuna entity
     */
    initializePoopingProperties(tuna) {
        if (!tuna.poopingProperties) {
            tuna.poopingProperties = {
                isPooping: false,
                poopCount: 0,
                totalPoops: 0,
                lastPoopTime: 0,
                poopPositions: []
            };
        }
    }
    
    /**
     * Start a pooping sequence for a tuna
     * @param {Object} tuna - The tuna entity
     * @param {Object} gameEntities - Game entities system
     */
    startPooping(tuna, gameEntities) {
        this.initializePoopingProperties(tuna);
        
        const props = tuna.poopingProperties;
        const currentTime = Date.now();
        
        // Don't start new pooping if already pooping
        if (props.isPooping) {
            return;
        }
        
        // Determine how many poop to create (ensure it's 1-3)
        props.totalPoops = this.config.POOP_COUNT.min + 
                          Math.floor(Math.random() * (this.config.POOP_COUNT.max - this.config.POOP_COUNT.min + 1));
        
        // Ensure we always get at least 1 poop
        props.totalPoops = Math.max(1, Math.min(3, props.totalPoops));
        
        props.poopCount = 1; // Start at 1 since we create first poop immediately
        props.isPooping = true;
        props.lastPoopTime = currentTime;
        
        // Create the first poop immediately
        console.log(`🐟 Creating poop 1/${props.totalPoops} (immediate)`);
        this.createPoop(tuna, gameEntities, 0);
        
        console.log(`🐟 Tuna starting pooping sequence: ${props.totalPoops} poop over ${(props.totalPoops - 1) * 200}ms`);
    }
    
    /**
     * Calculate positions for multiple poop around the tuna
     * @param {Object} tuna - The tuna entity
     * @param {number} poopCount - Number of poop to create
     * @returns {Array} Array of poop positions
     */
    calculatePoopPositions(tuna, poopCount) {
        const positions = [];
        
        for (let i = 0; i < poopCount; i++) {
            // All poop at the tuna's exact location
            positions.push({ x: tuna.x, y: tuna.y, index: i });
        }
        
        return positions;
    }
    
    /**
     * Update pooping sequence for a tuna
     * @param {Object} tuna - The tuna entity
     * @param {Object} gameEntities - Game entities system
     */
    updatePooping(tuna, gameEntities) {
        this.initializePoopingProperties(tuna);
        
        const props = tuna.poopingProperties;
        if (!props.isPooping) return;
        
        const currentTime = Date.now();
        const timeSinceLastPoop = currentTime - props.lastPoopTime;
        
        // Determine the appropriate interval based on poop count
        const requiredInterval = props.poopCount === 0 ? this.config.FIRST_POOP_INTERVAL : this.config.SUBSEQUENT_POOP_INTERVAL;
        
        // Debug logging
        if (props.poopCount < props.totalPoops) {
            console.log(`🐟 Pooping update: ${props.poopCount}/${props.totalPoops}, time since last: ${timeSinceLastPoop}ms, required: ${requiredInterval}ms`);
        }
        
        // Check if it's time for the next poop
        if (timeSinceLastPoop >= requiredInterval && props.poopCount < props.totalPoops) {
            console.log(`🐟 Creating poop ${props.poopCount + 1}/${props.totalPoops}`);
            this.createPoop(tuna, gameEntities, props.poopCount);
            
            props.poopCount++;
            props.lastPoopTime = currentTime;
        }
        
        // Check if pooping sequence is complete
        if (props.poopCount >= props.totalPoops) {
            this.finishPooping(tuna);
        }
    }
    
    /**
     * Create a single poop at the specified position
     * @param {Object} tuna - The tuna entity
     * @param {Object} gameEntities - Game entities system
     * @param {number} poopIndex - Index of this poop in the sequence
     */
    createPoop(tuna, gameEntities, poopIndex) {
        if (!gameEntities || !gameEntities.poop || !window.Poop) {
            console.log('🐟 Cannot create poop - missing gameEntities, poop array, or Poop class');
            return;
        }
        
        // Use tuna's current position instead of pre-calculated positions
        const poopX = tuna.x;
        const poopY = tuna.y;
        
        // Create tuna poop at the tuna's current position
        const newPoop = new window.Poop(poopX, poopY, 'tuna');
        gameEntities.poop.push(newPoop);
        
        // Create visual effect (bubbles)
        if (window.ObjectPools) {
            for (let j = 0; j < 2; j++) {
                window.ObjectPools.getEatingBubble(
                    poopX + (Math.random() - 0.5) * 10,
                    poopY + (Math.random() - 0.5) * 10
                );
            }
        }
    }
    
    /**
     * Finish the pooping sequence
     * @param {Object} tuna - The tuna entity
     */
    finishPooping(tuna) {
        const props = tuna.poopingProperties;
        
        props.isPooping = false;
        props.poopCount = 0;
        props.totalPoops = 0;
        props.poopPositions = [];
        
        console.log(`🐟 Tuna pooping sequence completed`);
    }
    
    /**
     * Check if tuna is currently pooping
     * @param {Object} tuna - The tuna entity
     * @returns {boolean} True if tuna is pooping
     */
    isPooping(tuna) {
        this.initializePoopingProperties(tuna);
        return tuna.poopingProperties.isPooping;
    }
    
    /**
     * Update pooping system for all tuna
     * @param {Array} tuna - Array of tuna entities
     * @param {Object} gameEntities - Game entities system
     */
    update(tuna, gameEntities) {
        if (!tuna || !gameEntities) {
            return;
        }
        
        for (let t of tuna) {
            this.updatePooping(t, gameEntities);
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TunaPoopingSystem = TunaPoopingSystem;
}