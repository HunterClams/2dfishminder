# Tuna Behavior - Current State Summary (Post-Energy Removal)

## Current Behavior Summary (After Energy System Removal)

### State Machine (5 States)
1. **PATROLLING** - Default state, active hunting/searching
2. **HUNTING** - Pursuing detected prey  
3. **ATTACKING** - Close-range attack on prey
4. **FEEDING** - Post-consumption recovery (3 seconds)
5. **FLEEING** - Escaping from giant squid threats

### Key Changes from Document (Energy Removed)

#### State Transitions (Updated)
- **PATROLLING → HUNTING:** No energy threshold - tuna can always hunt if prey detected
- **HUNTING → PATROLLING:** Only distance-based abandonment (no energy < 20 check)
- **Alertness System:** Now based only on hunt success + time factor (no energy component)

### Current Alertness System (Simplified)
- **Range:** 0.5 to 1.0 (was 0.1-1.0)
- **Formula:** `0.7 + (huntSuccess / 10) * 0.2 + timeFactor`
  - Base: 0.7 (was energy-based 70%)
  - Hunt success: 20% weight
  - Time variation: ±0.1 (sinusoidal)
- **Effects:** Still modulates hunt radius (`huntRadius * alertness`)

### Hunting Behavior

#### Prey Detection
- **Primary Radius:** 300px (scaled by alertness)
- **Special Radii:**
  - Fertilized Eggs: 150px
  - Unfertilized Eggs: 50px
- **Prey Types:** Fry (all variants), Eggs (fertilized & unfertilized)
- **NOT Hunted:** Krill (excluded from detection)

#### Target Priority (Updated)
- **Removed:** Hunger factor (was based on energy)
- **Still Uses:**
  - Distance factor
  - Type bonuses (TrueFry ×3.0, Fertilized Eggs ×2.5, etc.)
  - Size factor (optimal 0.3-0.8 ratio)
  - Speed factor (slower prey = higher priority)

#### Target Persistence
- **Close Target Protection:** Within 2× attackRadius (80px) prevents:
  - Target abandonment
  - Target switching
- **Distance Abandonment:** Only if > 450px (1.5× huntRadius) AND not close

### Patrolling Behavior

#### Patrol Sub-States (3)
1. **searching** - Spiral pattern (50px → 250px radius)
2. **cruising** - Straight-line movement
3. **investigating** - Targeted exploration

#### Patrol Patterns
- **Removed:** Low-energy transition checks
- **Base Distance:** 800px ± 500px variation
- **Speed:** 60-90% max speed (varies by sub-state)
- **Transitions:** Time-based and random (no energy factor)

### Movement & Physics

#### Speed Modulations
- **Patrolling:** 60-90% speed (sub-state dependent)
- **Hunting:** Up to 135% speed (dynamic boost based on distance + alertness)
- **Attacking:** 200% speed (burst)
- **Fleeing:** Base speed with repulsion force

#### Movement Systems
- **Velocity Smoothing:** 8-frame history, 30% blend
- **Force Smoothing:** 5-frame history
- **Depth Preference:** 60% depth, very gentle (0.00001 strength)
- **Edge Avoidance:** 200px buffer, 50% maxForce
- **Tuna Repulsion:** 80px radius, prevents overlapping

### Interactions

#### Eating System
- **Trigger:** Successfully eating prey
- **Effects:**
  - Removes prey from array
  - Spawns 1-2 tuna poop (via TunaPoopingSystem)
  - Creates 3 eating bubbles
  - **No energy restoration** (removed)
  - Sets 180-frame cooldown (3 seconds)
  - Increments huntSuccess

#### Threat System
- **Detection:** 850px range for giant squids
- **Response:** Immediate FLEEING state
- **Force:** Repulsion away from threats (10% maxForce)

---

## Issues Identified (What Needs Reworking)

### 1. Alertness System
- **Current:** Base 0.7, varies 0.5-1.0
- **Issue:** Less dynamic without energy component
- **Impact:** Hunt radius less variable (300px × 0.5-1.0 = 150-300px)

### 2. Prey Priority
- **Removed:** Hunger factor multiplier
- **Issue:** Priority calculations less nuanced
- **Impact:** Target selection doesn't account for "motivation" levels

### 3. State Transitions
- **Removed:** Energy thresholds
- **Issue:** No resource-based decision making
- **Impact:** Tuna can hunt indefinitely (which may be intended)

### 4. Patrol Patterns
- **Removed:** Energy-based transitions
- **Issue:** Less "realistic" predator behavior variation
- **Impact:** Patterns purely time/random based

### 5. Documentation Outdated
- Research document still references energy system
- Need to update analysis document

---

## What Should Be Reworked?

Based on removing the energy system, the following aspects may need adjustment:

1. **Alertness System** - Should it be simplified further or enhanced with other factors?
2. **Hunting Motivation** - Without hunger/energy, what drives aggressive hunting?
3. **Patrol Patterns** - Should transitions be more varied or predictable?
4. **State Machine** - Are all 5 states still necessary?
5. **Target Selection** - Priority system may need rebalancing without hunger factor

---

## Current Code Status

### Files Modified (Energy Removal)
- ✅ `utils/tunaAI.js` - Removed energy checks
- ✅ `utils/tunaBehaviorTree.js` - Simplified alertness (no energy)
- ✅ `utils/tunaSteeringForces.js` - Removed energy from patrol transitions
- ✅ `utils/tunaConfig.js` - Removed huntEnergyThreshold
- ✅ `entities/Predator.js` - Removed energy initialization
- ✅ `utils/tunaPhysicsSystem.js` - Removed energy decay
- ✅ `utils/tunaRenderingSystem.js` - Removed energy bar display
- ✅ `utils/tunaLegacySystem.js` - Removed energy restoration

### Current Configuration
```javascript
TUNA_CONFIG = {
    huntRadius: 300,
    attackRadius: 40,
    fleeRadius: 850,
    maxPredictionTime: 3.0,
    patrolSpeed: 0.9,
    patrolDistance: 800,
    patrolVariation: 500,
    huntSpeed: 1.35,
    attackSpeed: 2.0,
    targetSwitchCooldown: 60,
    fertilizedEggDetectionRadius: 150,
    fishEggDetectionRadius: 50
}
```

---

## Recommendations for Rework

1. **Simplify Alertness** - Since energy is gone, consider making alertness static or based only on recent hunt success
2. **Review State Necessity** - FEEDING state may be redundant without energy management
3. **Balance Patrol Patterns** - Ensure transitions feel natural without energy-driven logic
4. **Update Documentation** - Research document needs updating to reflect current state

