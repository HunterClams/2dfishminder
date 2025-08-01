// Behavioral utilities for AI and predator-prey relationships
// Handles fish behavior logic and cached relationships

// Caches for performance
let _preyCache = new Map();
let _fleeCache = new Map();

// Check if predator should ignore certain prey types
function shouldIgnorePrey(predatorType, preyType, fishTypes) {
    const key = `${predatorType}-${preyType}`;
    if (!_preyCache.has(key)) {
        let ignore = false;
        if (predatorType === 'tuna') {
            ignore = preyType === fishTypes.SMALL_FRY_3;
            // All tuna ignore krill (standardized behavior)
            if (preyType === fishTypes.KRILL) ignore = true;
            // Tuna can eat TrueFry and both types of eggs
            if (preyType === 'truefry' || preyType === 'truefry1' || preyType === 'truefry2') ignore = false;
            if (preyType === 'fertilizedEggs' || preyType === 'fishEggs' || preyType === 'fishEgg') ignore = false;
        } else if (predatorType === fishTypes.SMALL_FRY_2 || 
                   predatorType === fishTypes.SMALL_FRY_3 || 
                   predatorType === fishTypes.SMALL_FRY_4) {
            // All fry can eat krill (all types) AND fish food AND poop
            // Fry do NOT eat fish eggs, fertilized eggs, TrueFry, or sperm - only krill, food, and poop
            ignore = !(preyType === fishTypes.KRILL || 
                      preyType === fishTypes.PALE_KRILL || 
                      preyType === fishTypes.MOM_KRILL ||
                      preyType === 'krill' || preyType === 'paleKrill' || preyType === 'momKrill' ||
                      preyType === 'fishFood' || preyType === 'poop');
            // Explicitly prevent fry from eating eggs, TrueFry, and sperm
            if (preyType === 'fertilizedEggs' || preyType === 'fishEggs' || preyType === 'fishEgg') ignore = true;
            if (preyType === 'truefry' || preyType === 'truefry1' || preyType === 'truefry2') ignore = true;
            if (preyType === 'sperm') ignore = true; // Fry cannot eat sperm
        } else if (predatorType === 'truefry' || predatorType === 'truefry1' || predatorType === 'truefry2') {
            // TrueFry can eat: krill, fish food, poop
            // TrueFry CANNOT eat: fertilized eggs, unfertilized eggs, other TrueFry, or sperm
            ignore = !(preyType === fishTypes.KRILL || 
                      preyType === fishTypes.PALE_KRILL || 
                      preyType === fishTypes.MOM_KRILL ||
                      preyType === 'krill' || preyType === 'paleKrill' || preyType === 'momKrill' ||
                      preyType === 'fishFood' || preyType === 'poop');
            // Explicitly prevent TrueFry from eating any type of eggs
            if (preyType === 'fertilizedEggs' || preyType === 'fishEggs' || preyType === 'fishEgg') ignore = true;
            // Explicitly prevent TrueFry from eating other TrueFry
            if (preyType === 'truefry' || preyType === 'truefry1' || preyType === 'truefry2') ignore = true;
            // Explicitly prevent TrueFry from eating sperm
            if (preyType === 'sperm') ignore = true;
        }
        _preyCache.set(key, ignore);
    }
    return _preyCache.get(key);
}

// Check if fish should flee from predator
function shouldFlee(fishType, predatorType, fishTypes) {
    const key = `${fishType}-${predatorType}`;
    if (!_fleeCache.has(key)) {
        let shouldFleeFlag = true;
        
        if (fishType === fishTypes.SMALL_FRY_3 && predatorType === 'tuna') {
            shouldFleeFlag = false; // SmallFry3 doesn't flee from any tuna (standardized)
        } else if (fishType === fishTypes.KRILL) {
            // Krill flee from all predators but with reduced panic
            shouldFleeFlag = true;
        }
        
        _fleeCache.set(key, shouldFleeFlag);
    }
    return _fleeCache.get(key);
}

// Get random bubble sprite
function getRandomBubbleSprite(sprites) {
    return Math.random() < 0.5 ? sprites.bubble1 : sprites.bubble2;
}

// Clear behavior caches (useful for testing or dynamic behavior changes)
function clearBehaviorCaches() {
    _preyCache.clear();
    _fleeCache.clear();
}

// Make functions available globally
window.shouldIgnorePrey = shouldIgnorePrey;
window.shouldFlee = shouldFlee;
window.getRandomBubbleSprite = getRandomBubbleSprite;
window.clearBehaviorCaches = clearBehaviorCaches;

// Clear cache to ensure new behavior takes effect
clearBehaviorCaches();

// Clear cache again to ensure fry cannot eat sperm
clearBehaviorCaches(); 