// Global Game Configuration
// This file provides global constants accessible to all modules

// World dimensions
window.WORLD_WIDTH = 12000;
window.WORLD_HEIGHT = 8000;

// Game constants
window.CONSTANTS = {
    PERCEPTION_RADIUS: 50,
    SEPARATION_RADIUS: 30,
    FEAR_RADIUS: 80,
    FOOD_ATTRACTION_RADIUS: 60,
    CAMERA_MARGIN: 50,
    CAMERA_SPEED: 5,
    CAMERA_BOOST: 2.5,
    ZOOM_FACTOR: 0.1,
    BORDER_WIDTH: 8,
    CORNER_SIZE: 30,
    DEPTH_FADE_START: 0.2,
    DEPTH_FADE_END: 0.8,
    MIN_DEPTH_OPACITY: 0.15,
    DEPTH_BLUE_INTENSITY: 0.7,
    ABYSSAL_OPACITY: 0.05,
    MAX_EATING_BUBBLES: 50,
    RENDER_DISTANCE: 1500,
    UPDATE_FREQUENCY: 60
};

// Fish types
window.FISH_TYPES = {
    SMALL_FRY_2: 'smallFry2',
    SMALL_FRY_3: 'smallFry3',
    SMALL_FRY_4: 'smallFry4',
    KRILL: 'krill'
};

// Make constants available as local constants for backward compatibility
if (typeof WORLD_WIDTH === 'undefined') {
    const WORLD_WIDTH = window.WORLD_WIDTH;
    const WORLD_HEIGHT = window.WORLD_HEIGHT;
    const CONSTANTS = window.CONSTANTS;
    const FISH_TYPES = window.FISH_TYPES;
} 