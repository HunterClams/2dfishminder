// Tuna AI Configuration - Centralized constants and settings
// This module contains all configuration values for the tuna AI system

const TUNA_STATES = {
    PATROLLING: 'patrolling',
    HUNTING: 'hunting',
    FEEDING: 'feeding',
    FLEEING: 'fleeing'
};

const TUNA_CONFIG = {
    // Detection and attack ranges
    huntRadius: 300, // Primary detection radius for regular fry
    attackRadius: 40, // Eating range (within this distance, can eat)
    fleeRadius: 850, // Giant squid detection range
    
    // Prey-specific detection radii (smaller = harder to see)
    regularFryDetectionRadius: 300, // Regular fry - easiest to see (full hunt radius)
    trueFryDetectionRadius: 200, // TrueFry - harder to see (reduced radius)
    fertilizedEggDetectionRadius: 120, // Fertilized eggs - even smaller
    fishEggDetectionRadius: 80, // Unfertilized eggs - smallest (hardest to see)
    
    // Movement and speed
    maxPredictionTime: 3.0, // Max seconds to predict prey movement
    patrolSpeed: 1.0, // Base patrol speed (horizontal-focused)
    patrolHorizontalBias: 0.85, // Horizontal movement bias (0-1, higher = more horizontal) - 85% horizontal, 15% vertical
    huntSpeed: 1.5, // Speed boost when hunting (50% boost, increased from 40%)
    fleeSpeed: 1.2, // Speed boost when fleeing
    
    // Flocking behavior (minor - for 3-5 tuna schools)
    flockingPerceptionRadius: 400, // Range to detect other tuna for flocking
    flockingSeparationRadius: 150, // Range to maintain separation from other tuna
    flockingAlignmentWeight: 0.8, // Alignment force weight (strong for visible grouping)
    flockingCohesionWeight: 0.5, // Cohesion force weight (strong for visible grouping)
    flockingSeparationWeight: 0.3, // Separation force weight (moderate - prevents overlap)
    
    // Patrol behavior
    patrolDistance: 800, // Base patrol distance
    patrolVariation: 500, // Variation in patrol distance
    patrolScanFrequency: 0.05, // Chance per frame to do quick scan turn
    
    // State management
    feedingDuration: 180, // Frames locked out of hunting after eating (3 seconds)
    targetSwitchCooldown: 60, // Frames between target switches
    postFeedingCooldown: 60 // Cooldown after feeding before can hunt again (1 second)
};

// Export for global access
if (typeof window !== 'undefined') {
    window.TUNA_STATES = TUNA_STATES;
    window.TUNA_CONFIG = TUNA_CONFIG;
} 