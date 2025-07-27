// GiantSquid AI Configuration - Centralized constants and settings
// This module contains all configuration values for the giant squid AI system

const SQUID_STATES = {
    PATROLLING: 'patrolling',
    HUNTING: 'hunting',
    ATTACKING: 'attacking',
    RETREATING: 'retreating'
};

const SQUID_CONFIG = {
    // Physical properties
    SIZE: 446.25,
    MAX_SPEED: 73.5,
    CRUISE_SPEED: 16.8,
    BURST_SPEED: 63.0,
    MAX_FORCE: 1.05,
    
    // Jet propulsion system
    JET_BASE_DURATION: 15,
    JET_POWER_MULTIPLIER: 10,
    JET_BASE_COOLDOWN: 30,
    JET_COOLDOWN_MULTIPLIER: 20,
    JET_FORCE_MULTIPLIER: 1.68,
    JET_CONTINUOUS_FORCE: 0.21,
    MANTLE_CONTRACT_TIME: 8,
    
    // Movement forces
    FIN_FORCE_MULTIPLIER: 0.315,
    TENTACLE_FORCE_MULTIPLIER: 0.168,
    DRAG_FACTOR: 0.94,
    
    // Sensory system
    VISION_RANGE: 2000,
    ATTACK_RANGE: 315,
    EDGE_BUFFER: -892, // Allow squids to go 2 sprite lengths off the map
    EDGE_FORCE: 0.6,
    
    // Bioluminescence
    BLINK_CYCLE: 80, // Blink every 1.33 seconds (60 FPS * 1.33)
    BLINK_DURATION: 20, // Blink lasts 0.33 seconds
    
    // Behavior timing
    PATROL_MOVEMENT_INTERVAL: 20, // Every 0.67 seconds (more frequent movement)
    HUNT_TIMEOUT: 200,
    ATTACK_TIMEOUT: 60,
    RETREAT_TIMEOUT: 120,
    RETREAT_SETTLE_INTERVAL: 30,
    
    // Eating and cooldowns
    EAT_COOLDOWN: 10000, // 10 second cooldown between eating
    POOP_IGNORE_DURATION: 3000, // Reduced from 8000 to 3 seconds to ignore tuna after pooping
    CONSUMPTION_DURATION: 180, // 3 seconds to consume prey
    
    // Depth preferences
    PREFERRED_DEPTH_MIN: 0.75, // 75% depth
    PREFERRED_DEPTH_MAX: 0.95, // 95% depth
    PREFERRED_DEPTH_TARGET: 0.85, // Preferred depth
    DEPTH_ADJUSTMENT_THRESHOLD: 150,
    
    // Bioluminescence depth thresholds
    BIOLUMINESCENCE_DEPTH_THRESHOLD: 0.7, // 70% depth
    ABYSSAL_DEPTH_THRESHOLD: 0.8, // 80% depth
    BIO_INTENSITY_MIN: 0.1,
    BIO_INTENSITY_MAX: 0.7,
    
    // Enhanced bioluminescence settings (matching old system)
    BIOLUMINESCENCE_FULL_OPACITY: 1.0, // Full brightness for abyssal sprites
    BIOLUMINESCENCE_BLEND_MODE: 'screen', // Additive blending for glow effect
    BIOLUMINESCENCE_FADE_START: 0.7, // Start fading at 70% depth
    BIOLUMINESCENCE_FADE_END: 0.8, // Full intensity at 80% depth
    BIOLUMINESCENCE_ABYSSAL_START: 0.8, // Abyssal zone starts at 80% depth
    BIOLUMINESCENCE_ABYSSAL_END: 1.0, // Abyssal zone ends at 100% depth
    
    // Animation speeds
    FIN_UNDULATION_SPEED: 0.1,
    TENTACLE_PULSE_SPEED: 0.05,
    BLINK_TIMER_INCREMENT: 1,
    
    // Prey positioning
    PREY_OFFSET_X: 75,
    PREY_OFFSET_Y: 50,
    PREY_OPACITY_MULTIPLIER: 0.7,
    
    // Bubble effects
    CAPTURE_BUBBLE_COUNT: 20,
    CONSUMPTION_BUBBLE_COUNT: 15,
    BUBBLE_SPREAD_RANGE: 250,
    CONSUMPTION_BUBBLE_SPREAD: 300
};

// Export for global access
if (typeof window !== 'undefined') {
    window.SQUID_STATES = SQUID_STATES;
    window.SQUID_CONFIG = SQUID_CONFIG;
} 