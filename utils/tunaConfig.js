// Tuna AI Configuration - Centralized constants and settings
// This module contains all configuration values for the tuna AI system

const TUNA_STATES = {
    PATROLLING: 'patrolling',
    HUNTING: 'hunting',
    ATTACKING: 'attacking',
    FEEDING: 'feeding',
    RESTING: 'resting',
    FLEEING: 'fleeing'
};

const TUNA_CONFIG = {
    huntRadius: 300, // Doubled from 150 to 300 for better prey detection
    attackRadius: 40, // Increased from 30 to 40 for better eating success
    fleeRadius: 850, // Increased from 500 to 650 for even earlier threat detection
    restEnergyThreshold: 30,
    huntEnergyThreshold: 50,
    maxPredictionTime: 3.0,
    wanderRadius: 800, // Increased from 100 to 800 for much larger patrol areas
    patrolSpeed: 1.2, // Increased from 0.8 to 1.2 for faster patrolling
    huntSpeed: 1.35, // 35% speed boost when hunting (1.0 + 0.35)
    attackSpeed: 2.0,
    stateChangeDelay: 30, // frames
    targetSwitchCooldown: 60, // frames
    fertilizedEggDetectionRadius: 150, // Specific detection radius for fertilized eggs
    // New patrolling configuration
    patrolAreaRadius: 1200, // Large area for patrolling
    patrolTargetDistance: 600, // Distance to travel before changing direction
    patrolDirectionChangeChance: 0.02, // 2% chance per frame to change direction
    patrolDepthRange: { min: 0.4, max: 0.8 } // Patrol in mid to deep waters
};

// Export for global access
if (typeof window !== 'undefined') {
    window.TUNA_STATES = TUNA_STATES;
    window.TUNA_CONFIG = TUNA_CONFIG;
} 