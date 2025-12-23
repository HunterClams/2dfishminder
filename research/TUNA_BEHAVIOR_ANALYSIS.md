# Tuna Behavior Deep Dive - Comprehensive Analysis

## Overview
Tuna are aggressive mid-water predators that hunt fry, eggs, and krill. They use a sophisticated state machine with modular systems for AI, movement, threat detection, and rendering.

---

## State Machine

### States (5 Total)
1. **PATROLLING** - Default state, active hunting/searching
2. **HUNTING** - Pursuing detected prey
3. **ATTACKING** - Close-range attack on prey
4. **FEEDING** - Post-consumption recovery state
5. **FLEEING** - Escaping from giant squid threats

### State Transitions

#### PATROLLING → HUNTING
- **Conditions:**
  - Post-feeding cooldown expired (60 frames)
  - Prey detected within `huntRadius * alertness` (scaled by alertness)
  - Energy > `huntEnergyThreshold` (50)
- **Action:** Selects best target and transitions

#### HUNTING → ATTACKING
- **Conditions:**
  - Distance to target < `attackRadius` (40px)
- **Action:** Immediate transition, preserves target

#### HUNTING → PATROLLING
- **Conditions:**
  - Target invalid or no longer in game
  - Distance > `huntRadius * 1.5` (450px) AND not close to target
  - Energy < 20 AND not close to target
- **Note:** Enhanced logic prevents abandoning target when close (< 2x attackRadius)

#### ATTACKING → FEEDING
- **Conditions:**
  - Successfully ate target (within `attackRadius`)
- **Action:** Spawns poop, creates eating bubbles, restores energy

#### ATTACKING → HUNTING
- **Conditions:**
  - Distance > `attackRadius * 1.5` (60px)
- **Action:** Revert to hunting mode

#### FEEDING → PATROLLING
- **Conditions:**
  - Feeding duration elapsed (180 frames / 3 seconds)
- **Action:** Returns to patrolling

#### FEEDING → FLEEING
- **Conditions:**
  - Threat detected during feeding

#### FLEEING → PATROLLING
- **Conditions:**
  - No threats detected within `fleeRadius` (850px)
- **Action:** Returns to normal patrolling

#### Any State → FLEEING
- **Conditions:**
  - Giant squid detected within `fleeRadius` (850px)

---

## Behavior Patterns

### Alertness System
- **Range:** 0.1 to 1.0
- **Factors:**
  - Energy level (70% weight): `energy / 100`
  - Hunt success (20% weight): `huntSuccess / 10`
  - Time factor (sinusoidal variation): `sin(timer * 0.001) * 0.1`
- **Effects:**
  - Modulates hunt radius: `huntRadius * alertness`
  - Affects hunting speed boost
  - Increases during HUNTING state (+0.2)
  - Maxes at 1.0 during FLEEING

### Patrolling Behavior (Realistic Predator Patterns)

#### Patrol States (3 Sub-states)
1. **searching** - Spiral search pattern
   - Expanding spiral (50px → 250px radius)
   - Methodical, slower speed (60% max speed)
   - Transitions after 3-5 seconds

2. **cruising** - Straight-line movement
   - Maintains direction with occasional small adjustments (1% chance per frame)
   - Faster speed (80% max speed)
   - Transitions after 4 seconds or low energy

3. **investigating** - Targeted exploration
   - Moves toward random nearby point (100-300px away)
   - Focused, faster speed (90% max speed)
   - Completes when target reached (< 30px)

#### Patrol Distance System
- **Base Distance:** 800px (configurable)
- **Variation:** ±500px per tuna
- **Direction Changes:**
  - Interval: 300-660 frames (5-11 seconds)
  - Angle: 30-90 degrees per change
  - Smooth turns, avoids world edges

### Hunting Behavior

#### Prey Detection
- **Primary Radius:** 300px (scaled by alertness)
- **Special Radii:**
  - Fertilized Eggs: 150px
  - Unfertilized Eggs: 50px
- **Target Priority System:**
  - Distance factor: `(maxDistance - distance) / maxDistance`
  - Type bonuses:
    - TrueFry: ×3.0 priority
    - Fertilized Eggs: ×2.5 priority
    - Fish Eggs: ×2.0 priority
    - Regular Fry: ×1.8 priority
    - Krill: ×1.2 priority (but NOT hunted - see prey selection)
  - Size factor: Optimal ratio 0.3-0.8 of tuna size
  - Hunger factor: `1.0 + (1 - energy/100) * 0.5`
  - Speed factor: Slower prey = higher priority

#### Target Selection Logic
- **Best Target:** Highest priority from sorted list
- **Target Switching:**
  - Only if better target priority > current × 1.2
  - Only if not close to current target (> 2x attackRadius)
  - Cooldown: 60 frames between switches
  - Prevents target abandonment when close

#### Movement Prediction
- **Prediction Time:** `min(distance / speed, maxPredictionTime)` (max 3.0 seconds)
- **Future Position:** `target.position + target.velocity * predictionTime`
- **Dynamic Speed Boost:**
  - Base: 1.0
  - Hunting intensity: `1 - (distance / huntRadius)`
  - Total: `1.0 + (0.35 * intensity * alertness)`
  - Max: 1.35x speed (35% boost)

### Attacking Behavior
- **Speed:** 2.0x max speed (very fast)
- **Force Multiplier:** 1.5x aggression
- **Range:** 40px radius
- **Eating Logic:** See "Interactions" section

### Fleeing Behavior
- **Detection Radius:** 850px (very large)
- **Force:** Repulsion from all threats
- **Strength:** `fleeRadius / distance` (inverse distance)
- **Multiple Threats:** Average repulsion direction
- **Force Applied:** 10% of maxForce

---

## Configuration Parameters

```javascript
TUNA_CONFIG = {
    huntRadius: 300,              // Detection/hunting range
    attackRadius: 40,             // Eating range
    fleeRadius: 850,              // Giant squid detection
    huntEnergyThreshold: 50,      // Minimum energy to hunt
    maxPredictionTime: 3.0,       // Max seconds to predict ahead
    patrolSpeed: 0.9,             // Base patrol speed multiplier
    patrolDistance: 800,          // Base patrol distance
    patrolVariation: 500,         // ±variation in patrol distance
    huntSpeed: 1.35,              // Speed boost when hunting
    attackSpeed: 2.0,             // Speed during attack
    targetSwitchCooldown: 60,     // Frames between target switches
    fertilizedEggDetectionRadius: 150,
    fishEggDetectionRadius: 50
}
```

---

## Prey Types & Preferences

### Prey Arrays (Checked in order)
1. **Fish (Fry)** - All fry variants
   - smallFry2, smallFry3, smallFry4
   - TrueFry1, TrueFry2
   - Priority: High (×1.8 to ×3.0)

2. **Fertilized Eggs**
   - Detection: 150px
   - Priority: Very High (×2.5)

3. **Fish Eggs (Unfertilized)**
   - Detection: 50px
   - Priority: High (×2.0)

### NOT Hunted
- **Krill** - Explicitly excluded from hunting logic
  - Krill arrays are checked in `attemptToEat()` but NOT in `findNearbyPrey()`
  - Tuna will only eat krill if they somehow get within attack range without hunting

---

## Movement & Physics

### Velocity Smoothing
- **History Buffer:** Last 8 velocity values
- **Smoothing Factor:** 30% blend with average
- **Purpose:** Reduces jitter in movement

### Force Smoothing
- **History Buffer:** Last 5 force values
- **Purpose:** Smooth acceleration changes

### Depth Preference
- **Preferred Depth:** 60% of world height
- **Tolerance:** 30% of world height
- **Force Strength:** 0.00001 (very gentle, 10x weaker than before)
- **Active:** Only when NOT hunting/attacking

### Edge Avoidance
- **Buffer:** 200px from edges
- **Force:** 50% maxForce toward center
- **Active:** Always

### Tuna Repulsion
- **Radius:** 80px (repulsion starts)
- **Max Radius:** 40px (maximum repulsion)
- **Max Force:** 0.8
- **Purpose:** Prevents overlapping/swarming
- **Gradient:** Linear from maxRadius to repulsionRadius

---

## Interactions with Other Systems

### 1. Eating System (`attemptToEat`)
**Location:** `tunaSteeringForces.js:506-555`

**Process:**
1. Searches all prey arrays for target
2. Removes target from appropriate array
3. Triggers poop generation:
   - Uses `TunaPoopingSystem.startPooping()` if available
   - Falls back to single `Poop(tuna.x, tuna.y, 'tuna')`
   - Generates 1-2 poop over 200ms
4. Creates eating bubbles:
   - 3 bubbles via `ObjectPools.getEatingBubble()`
   - Random spread: ±20px
5. Restores energy: +25 (capped at 100)
6. Sets cooldown: 180 frames (3 seconds)
7. Records attack time

**Prey Arrays Checked:**
- `gameEntities.fish`
- `gameEntities.krill`
- `gameEntities.paleKrill`
- `gameEntities.momKrill`
- `gameEntities.fertilizedEggs`
- `gameEntities.fishEggs`

### 2. Pooping System
**System:** `TunaPoopingSystem` (via `GameEntities.tunaPoopingSystem`)

**Triggers:**
- After successful eating
- Generates 1-2 poop entities
- Type: 'tuna'
- Spread over 200ms (delayed spawning)

**Ecosystem Impact:**
- Tuna poop provides high nutrition to krill (2x food value)
- Krill transformation trigger (3 food = momKrill)
- Part of nutrient cycle

### 3. Threat System (`TunaThreatSystem`)
**Threats:** Giant Squids only

**Detection:**
- Range: 850px (`fleeRadius`)
- Checks: `gameEntities.squid` array
- Continuous monitoring

**Response:**
- Immediate transition to FLEEING state
- Repulsion force away from threat
- Threat level tracking (0-1)
- Gradually decreases when threat removed

### 4. GameEntities Integration
**Update Cycle:**
```javascript
predator.update(fish, krill, squid)
  → TunaAI.updateAI(tuna, gameEntities)
    → TunaBehaviorTree.updateState()
      → Controller state handler
        → TunaSteeringForces.applyMovementForces()
```

**Called From:** `GameEntities.update()` line 132

### 5. Object Pool System
**Usage:**
- Eating bubbles (3 per kill)
- Efficient memory management
- Pooled for performance

### 6. Rendering System (`TunaRenderingSystem`)
**Delegated to:** Modular rendering system
- Handles sprite drawing
- Depth-based opacity
- Visual effects

### 7. Physics System (`TunaPhysicsSystem`)
**Delegated to:** Modular physics system
- Force application
- Edge handling
- Velocity updates

---

## Key Behaviors & Improvements

### Target Persistence Fix
- **Problem:** Tuna abandoned prey when close
- **Solution:** Enhanced `handleHunting()` with `closeToTarget` logic
- **Logic:** Prevents distance/energy checks when within 2x attackRadius
- **Result:** More successful hunts

### Target Validation
- **Checks:**
  1. Basic validity (exists, has x/y)
  2. NaN/Infinity checks
  3. Still in game arrays (`isTargetStillInGame`)
- **Purpose:** Prevents crashes from deleted targets

### Realistic Patrol System
- **Replaced:** Simple wandering
- **With:** Multi-state predator patterns (spiral, cruise, investigate)
- **Benefits:** More natural, varied movement
- **States:** searching, cruising, investigating

### Alertness-Based Hunting
- **Dynamic Range:** Scales hunt radius by alertness
- **Factors:** Energy, success rate, time
- **Effect:** More efficient hunting when alert

### Speed Modulation
- **Patrolling:** 60-90% speed (varies by sub-state)
- **Hunting:** Up to 135% speed (dynamic boost)
- **Attacking:** 200% speed (burst)
- **Fleeing:** Base speed with repulsion

---

## Energy & Resource Management

### Energy System
- **Max:** 100
- **Restoration:** +25 per kill
- **Hunt Threshold:** 50 (won't hunt below)
- **Abandon Threshold:** 20 (drops hunt if below and not close)
- **Decay:** Not implemented (energy only changes on eating)

### Hunt Success Tracking
- **Increases:** On successful kill
- **Decreases:** On failed hunt (distance/energy)
- **Effect:** Influences alertness (huntSuccess / 10)

### Hunt Cooldown
- **Duration:** 180 frames (3 seconds)
- **Purpose:** Prevents immediate re-hunting after kill
- **Applied:** After successful eating

---

## Modular Architecture

### Core Systems
1. **TunaAI** - Main controller, orchestrates all systems
2. **TunaBehaviorTree** - State machine and decisions
3. **TunaSteeringForces** - Movement and forces
4. **TunaThreatSystem** - Threat detection
5. **TunaRenderingSystem** - Visual rendering
6. **TunaPhysicsSystem** - Physics calculations
7. **TunaPoopingSystem** - Waste generation
8. **TunaLegacySystem** - Fallback compatibility

### Initialization Flow
```
Predator.constructor()
  → initializeModularSystems()
    → TunaAI.initializeTuna()
    → TunaRenderingSystem.initializeRenderingSystem()
    → TunaPhysicsSystem.initializePhysicsSystem()
    → TunaThreatSystem.initializeThreatSystem()
    → TunaLegacySystem.initializeLegacySystem()
```

### Update Flow
```
Predator.update()
  → TunaAI.updateAI()
    → TunaBehaviorTree.updateState()
      → Controller.handle[State]()
        → TunaSteeringForces.apply[State]Forces()
    → TunaSteeringForces.applyMovementForces()
      → Depth preference
      → Edge avoidance
      → Tuna repulsion
  → TunaThreatSystem.checkForThreats()
```

---

## Edge Cases & Special Behaviors

### Target Switching Prevention
- When within 2x attackRadius, prevents:
  - Target abandonment due to distance
  - Target switching for "better" prey
  - Energy-based abandonment

### Feeding State Protection
- Can still detect threats during feeding
- Can flee mid-feeding if threatened

### State Transition Safety
- Target only updated if explicitly provided (not null)
- Prevents accidental target clearing
- Explicit null assignment when transitioning to PATROLLING without target

### Multiple Threat Handling
- Averages repulsion from all threats
- Prioritizes closest threat
- Threat level calculated from all threats

---

## Performance Considerations

### Optimization Features
1. **Velocity Smoothing** - Reduces calculation frequency
2. **Force History** - Averages forces for smoother movement
3. **Target Validation** - Prevents invalid reference errors
4. **Cooldowns** - Prevents excessive state changes
5. **Distance Squared** - Uses squared distance for comparisons (avoids sqrt)

### Potential Issues
- No spatial partitioning for prey detection (linear scan)
- Alertness recalculated every frame
- Multiple array searches in `findNearbyPrey()`

---

## Summary

Tuna are sophisticated predators with:
- **5-state behavior system** with realistic patrol patterns
- **Dynamic alertness** affecting detection range
- **Intelligent target selection** with priority weighting
- **Movement prediction** for intercepting prey
- **Threat awareness** with fleeing behavior
- **Ecosystem integration** via poop generation
- **Modular architecture** for maintainability

The system emphasizes persistence in hunting (won't abandon close targets) while maintaining realistic predator behaviors like spiral searching and threat avoidance.

