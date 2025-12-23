# New Tuna Behavior System - How It Works

## Architecture Overview

The system uses a **modular 3-layer architecture**:

1. **TunaBehaviorTree** - State machine controller (decisions)
2. **TunaAI** - Main controller (orchestrates everything)
3. **TunaSteeringForces** - Movement/physics (execution)

```
Predator.update()
  → TunaAI.updateAI()
    → TunaBehaviorTree.updateState()  // Check threats, update timers
      → TunaAI.handle[State]()        // State-specific logic
        → TunaSteeringForces.apply[State]Forces()  // Movement
    → TunaSteeringForces.applyMovementForces()     // General physics
```

---

## Update Cycle Flow

### Step 1: Update State Machine (`TunaBehaviorTree.updateState`)
```javascript
1. Initialize tuna if needed
2. Increment timers (aiTimer, targetSwitchTimer)
3. Update alertness (based on hunt success + time)
4. Check for threats FIRST → FLEEING overrides everything
5. Call appropriate state handler via controller
```

### Step 2: State Handler (`TunaAI.handle[State]`)
Each state has specific logic:
- **PATROLLING**: Search for prey, horizontal patrol movement
- **HUNTING**: Pursue target, eat when close
- **FEEDING**: Lock out hunting, minimal movement
- **FLEEING**: Escape from threats

### Step 3: Apply Forces (`TunaSteeringForces`)
Movement and physics are applied:
- State-specific forces (hunting, fleeing, patrolling)
- General forces (depth preference, edge avoidance, tuna repulsion)

---

## The 4 States

### 1. PATROLLING (Default State)

**Purpose**: Search for prey while moving horizontally

**Behavior**:
- **Horizontal Movement**: 80% horizontal bias (moves mostly left/right)
- **Quick Scanning**: 5% chance per frame for ±45° turn to scan area
- **Periodic Direction Changes**: Every 5-11 seconds, changes direction 30-90°
- **Speed**: 1.0x base speed

**Transition to HUNTING**:
- Post-feeding cooldown expired (60 frames)
- Prey detected within detection radius
- Best target selected based on priority

**Code Flow**:
```javascript
handlePatrolling()
  → Check if can hunt (cooldown expired)
  → findNearbyPrey() (uses type-specific detection radii)
  → selectBestTarget() (prioritizes regular fry > truefry > eggs)
  → If target found: transitionToState(HUNTING, target)
  → Else: handleHorizontalPatrolling() (movement)
```

---

### 2. HUNTING (Pursuit State)

**Purpose**: Pursue and eat detected prey

**Behavior**:
- **Pursuit**: Moves toward target with movement prediction (intercepts future position)
- **Speed Boost**: 1.5x speed (50% faster)
- **Eating**: When within 40px, attempts to eat directly (no separate attack phase)
- **Target Persistence**: Won't abandon target if within 80px (2× attackRadius)

**Target Validation**:
- Checks if target still exists in game arrays
- Validates coordinates (no NaN/Infinity)
- Abandons if target is > 450px away (unless very close)

**Target Switching**:
- Can switch to better target if:
  - Not close to current target (> 80px away)
  - Better target has 20% higher priority
  - Cooldown expired (60 frames between switches)

**Transition to FEEDING**:
- Successfully ate target (within 40px)
- Spawns poop, creates bubbles
- Enters feeding state

**Code Flow**:
```javascript
handleHunting()
  → Validate target exists
  → Calculate distance to target
  → If < 40px: attemptToEat() → transitionToState(FEEDING)
  → If too far (> 450px) and not close: abandon → transitionToState(PATROLLING)
  → If not close and cooldown expired: check for better targets
  → applyHuntingForces() (pursue with prediction)
```

---

### 3. FEEDING (Post-Eating Recovery)

**Purpose**: Lock out hunting after eating

**Behavior**:
- **Hunting Lock**: Cannot enter HUNTING state for 180 frames (3 seconds)
- **Movement**: Minimal wandering (uses handleWandering)
- **Cooldown**: After feeding completes, additional 60-frame cooldown before can hunt

**Transition to PATROLLING**:
- Feeding duration elapsed (180 frames)
- Returns to patrolling (can hunt again after cooldown)

**Note**: Threats are checked in behavior tree BEFORE this handler, so fleeing can still override feeding

**Code Flow**:
```javascript
handleFeeding()
  → Check if duration elapsed (> 180 frames)
  → If yes: transitionToState(PATROLLING)
  → Else: handleWandering() (minimal movement)
```

---

### 4. FLEEING (Emergency Escape)

**Purpose**: Escape from giant squid threats

**Behavior**:
- **Override**: Checks for threats FIRST in update cycle, overrides ALL other states
- **Detection**: 850px range for giant squids
- **Escape**: Repulsion force away from all threats
- **Speed**: 1.2x speed (20% boost)
- **Alertness**: Maximum (1.0)

**Transition to PATROLLING**:
- No threats detected within 850px
- Returns to normal patrolling

**Code Flow**:
```javascript
updateState() // In behavior tree
  → Check threats FIRST (before state handlers)
  → If threats found: transitionToState(FLEEING)
  
handleFleeing()
  → Check if threats still present
  → If no threats: transitionToState(PATROLLING)
  → Else: applyFleeForces() (repulsion away)
```

---

## Prey Detection System

### Type-Specific Detection Radii

Different prey types have different detection ranges (smaller = harder to see):

```javascript
regularFryDetectionRadius: 300px  // Easiest to see (full range)
trueFryDetectionRadius: 200px     // Harder to see (reduced)
fertilizedEggDetectionRadius: 120px  // Even smaller
fishEggDetectionRadius: 80px      // Smallest (hardest to see)
```

### Priority System

Prey priority determines target selection (higher = preferred):

1. **Regular Fry**: ×3.0 priority (HIGHEST - preferred prey)
2. **TrueFry**: ×2.0 priority (Second choice)
3. **Fertilized Eggs**: ×1.5 priority (Third)
4. **Fish Eggs**: ×1.2 priority (Lowest)

**Additional Factors**:
- Distance: Closer = higher priority
- Size: Optimal ratio 0.3-0.8 of tuna size = bonus
- Speed: Slower prey = higher priority

**NOT Hunted**: Krill (completely excluded from detection)

---

## Movement Systems

### Horizontal Patrolling
- **Horizontal Bias**: 80% horizontal, 20% vertical movement
- **Scanning**: Random small turns (5% chance per frame, ±45°)
- **Direction Changes**: Periodic large turns (30-90°, every 5-11 seconds)
- **Smooth Movement**: Uses velocity smoothing to reduce jitter

### Hunting Movement
- **Prediction**: Calculates future position (up to 3 seconds ahead)
- **Interception**: Steers toward predicted position (not current position)
- **Speed Boost**: 1.5x speed when hunting
- **Aggression**: Uses tuna's aggression multiplier for force

### Fleeing Movement
- **Repulsion**: Force away from all threats
- **Normalized**: Direction normalized for consistent escape
- **Speed Boost**: 1.2x speed when fleeing
- **Multiple Threats**: Averages repulsion from all threats

---

## State Transition Logic

### Transition Priority (Order Matters)

1. **FLEEING** (Highest Priority)
   - Checked FIRST in update cycle
   - Overrides all other states
   - Trigger: Squid detected within 850px

2. **HUNTING → FEEDING**
   - Trigger: Successfully ate prey (within 40px)
   - Action: Spawn poop, create bubbles, clear target

3. **FEEDING → PATROLLING**
   - Trigger: 180 frames elapsed
   - Action: Unlock hunting (after cooldown)

4. **HUNTING → PATROLLING**
   - Trigger: Target invalid, too far (> 450px), or lost
   - Action: Clear target, return to searching

5. **PATROLLING → HUNTING**
   - Trigger: Prey detected, cooldown expired
   - Action: Select best target, start pursuit

---

## Key Features

### Target Persistence
- Won't abandon target if within 80px (2× attackRadius)
- Prevents "giving up" right before eating
- Only abandons if target is truly invalid or very far

### Feeding Lock System
- **Primary Lock**: 180 frames (3 seconds) - FEEDING state duration
- **Secondary Cooldown**: 60 frames (1 second) - PATROLLING before can hunt
- **Total Lockout**: ~4 seconds after eating before can hunt again

### Alertness System (Simplified)
- Base: 0.7
- Hunt Success Bonus: +0.2 per 10 successful hunts
- Time Variation: ±0.1 (sinusoidal)
- Range: 0.5 - 1.0
- Currently not used for detection radius (removed from system)

### Future Expansion Hooks
- **State Transition Hook**: `window.tunaBehaviorHooks.onStateTransition()`
- Allows future systems (reproduction, complex hunting) to react to state changes
- Passes: tuna, oldState, newState, target

---

## Configuration Values

All tunable values in `TUNA_CONFIG`:

```javascript
// Detection
huntRadius: 300,                      // Base detection radius
attackRadius: 40,                     // Eating range
fleeRadius: 850,                      // Squid detection
regularFryDetectionRadius: 300,       // Regular fry detection
trueFryDetectionRadius: 200,          // TrueFry detection (smaller)
fertilizedEggDetectionRadius: 120,    // Egg detection (smaller)
fishEggDetectionRadius: 80,           // Smallest detection

// Speed
patrolSpeed: 1.0,                     // Base patrol speed
huntSpeed: 1.5,                       // 50% boost when hunting
fleeSpeed: 1.2,                       // 20% boost when fleeing

// Patrol Behavior
patrolHorizontalBias: 0.8,            // 80% horizontal movement
patrolScanFrequency: 0.05,            // 5% chance per frame to scan
patrolDistance: 800,                  // Base patrol distance
patrolVariation: 500,                 // ±variation

// State Management
feedingDuration: 180,                 // 3 seconds feeding lock
postFeedingCooldown: 60,              // 1 second additional cooldown
targetSwitchCooldown: 60,             // Cooldown between target switches
```

---

## Data Flow Example

**Scenario**: Tuna detects a regular fry while patrolling

```
1. updateState() called
   → Check threats (none found)
   → Call handlePatrolling()

2. handlePatrolling()
   → Check cooldown (expired)
   → findNearbyPrey()
     → Scan fish array
     → Regular fry found at 250px distance
     → Calculate priority: distance × 3.0 (regular fry) = high priority
   → selectBestTarget() → returns regular fry
   → transitionToState(HUNTING, regularFry)

3. transitionToState()
   → Set aiState = HUNTING
   → Set aiTarget = regularFry
   → Increase alertness by 0.2
   → Record lastStateChange time

4. Next frame: handleHunting()
   → Validate target still exists
   → Calculate distance: 245px
   → Check if < 40px (no, continue hunting)
   → applyHuntingForces()
     → Predict future position (3 seconds ahead)
     → Calculate steering toward predicted position
     → Apply force at 1.5x speed

5. Continue hunting...
   → Distance decreases: 200px, 150px, 100px, 50px...

6. When distance < 40px:
   → attemptToEat()
     → Remove fry from fish array
     → Spawn tuna poop
     → Create 3 eating bubbles
     → Increment huntSuccess
   → transitionToState(FEEDING)

7. handleFeeding()
   → Wait 180 frames (3 seconds)
   → transitionToState(PATROLLING)
   → Wait additional 60 frames (cooldown)
   → Can now hunt again
```

---

## Summary

The new system is:
- **Simpler**: 4 states instead of 5 (removed ATTACKING)
- **Cleaner**: Horizontal-focused patrolling
- **More Realistic**: Type-specific detection (harder to see eggs/truefry)
- **Priority-Based**: Regular fry preferred over truefry/eggs
- **Future-Ready**: Hook system for expansion
- **Efficient**: Direct eating, no separate attack phase

