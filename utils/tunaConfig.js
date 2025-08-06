// Tuna AI Configuration - Centralized constants and settings
// This module contains all configuration values for the tuna AI system

const TUNA_STATES = {
    PATROLLING: 'patrolling',
    HUNTING: 'hunting',
    ATTACKING: 'attacking',
    FEEDING: 'feeding',
    FLEEING: 'fleeing'
};

const TUNA_CONFIG = {
    huntRadius: 300, // Doubled from 150 to 300 for better prey detection
    attackRadius: 40, // Increased from 30 to 40 for better eating success
    fleeRadius: 850, // Increased from 500 to 650 for even earlier threat detection
    huntEnergyThreshold: 50, // Removed restEnergyThreshold - no more resting state
    maxPredictionTime: 3.0,
    wanderRadius: 100, // Keep for compatibility
    patrolSpeed: 0.9, // Increased from 0.8 for more active patrolling
    patrolDistance: 800, // EXPANDED: Base patrol distance (was 500)
    patrolVariation: 500, // EXPANDED: Variation in patrol distance (±500px, was ±300px)
    huntSpeed: 1.35, // 35% speed boost when hunting (1.0 + 0.35)
    attackSpeed: 2.0,
    stateChangeDelay: 30, // frames
    targetSwitchCooldown: 60, // frames
    fertilizedEggDetectionRadius: 150, // Specific detection radius for fertilized eggs
    fishEggDetectionRadius: 50 // ENHANCED: Detection radius for unfertilized fish eggs (as requested)
};

// Export for global access
if (typeof window !== 'undefined') {
    window.TUNA_STATES = TUNA_STATES;
    window.TUNA_CONFIG = TUNA_CONFIG;
} 