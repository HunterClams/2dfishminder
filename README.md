# 🌊 Underwater Ecosystem Simulation

A sophisticated marine biology simulation featuring advanced AI behavioral systems, realistic predator-prey relationships, vertical migration patterns, and complex ecosystem dynamics.

## 🐟 Features

### Advanced Marine Life
- **Fry Species**: 3 types (SmallFry2, SmallFry3, SmallFry4) with distinct behaviors and habitat preferences
- **Tuna Predators**: 18 apex hunters (12 regular + 6 tuna2) with intelligent hunting patterns
- **Giant Squids**: 2 abyssal apex predators with complex AI and bioluminescent effects
- **Krill System**: 200 krill with advanced AI including 8 behavioral states and swarm intelligence

### 🧠 Sophisticated Krill AI System
- **8 Behavioral States**: Foraging, Seeking, Eating, Fleeing, Resting, Swarming, Migrating, Spawning
- **Swarm Intelligence**: Group formation, coordinated movement, and collective decision-making
- **Vertical Migration**: Large swarms (8+ krill) migrate between deep waters (75% depth) and surface (25% depth)
- **Lifecycle System**: Regular krill → Mom krill (reproduction) → Pale krill (juveniles) → Regular krill
- **Advanced Steering**: Multiple force calculations including separation, alignment, cohesion, food seeking, predator avoidance

### 🔄 Ecosystem Dynamics
- **Complex Food Web**: Krill → Small fry → Tuna → Giant squid with realistic consumption patterns
- **Feeding Cooldowns**: 3-second feeding timers prevent rapid food consumption
- **4-State Waste Cycle**: Fresh → Aged → Deep water → Abyssal transformation
- **Habitat Stratification**: Surface, mid-water, deep, and abyssal zones with depth-based behavior
- **Population Dynamics**: Natural reproduction, lifecycle transformations, and territorial behaviors

### 🎮 Interactive Systems
- **6-Mode Spawning**: Food → Krill → Poop → Fry → Tuna → Squid → Off
- **Debug Visualization**: Press T to cycle through behavior state displays (Tuna → Squid → Fry → Krill)
- **Entity Analytics**: Real-time population tracking and ecosystem statistics
- **Camera System**: Smooth movement with boost, zoom (0.5x - 4.0x), and world boundaries

### ⚡ Performance Optimizations
- **Object Pooling**: Efficient particle system for eating bubbles
- **Spatial Caching**: Krill update nearby entities every 200ms for performance
- **Render Distance**: 1500px culling optimization
- **Frame Limiting**: 60 FPS target with dynamic entity management
- **Memory Efficiency**: Behavior tree caching and cleanup systems

## 🎯 Controls
- **WASD**: Camera movement (Shift for 2.5x boost)
- **Mouse Wheel**: Zoom control
- **F**: Cycle spawn modes
- **H**: Toggle UI visibility (Controls → Full → Off)
- **T**: Cycle debug visualization modes
- **Click**: Spawn selected items with spread patterns

## 🐠 Behavioral Systems

### Krill AI Highlights
- **Energy Management**: Energy-based state transitions and rest cycles
- **Threat Assessment**: Dynamic predator detection and flee responses
- **Food Prioritization**: Prefer aged poop > fresh poop > fish food
- **Migration Cycles**: 2-minute cycles with 40% upward migration phase
- **Swarm Coordination**: Minimum 8 krill for basic swarming, 12+ for migration

### Predator Intelligence
- **Tuna**: Selective hunting with energy management and territorial patrol
- **Giant Squid**: Complex state machine with jet propulsion and tentacle control
- **Small Fry**: Flocking behavior with active krill hunting and feeding timers

### Visual Features
- **Depth Effects**: Realistic lighting, tinting, and opacity based on depth
- **Animation Systems**: Multi-frame sprites with state-based animation speeds
- **Particle Effects**: Eating bubbles, birth effects, and environmental atmosphere
- **Debug Overlays**: Comprehensive behavior state visualization with color coding

## 🏗️ Architecture
- **Modular Design**: Separate entity classes, utility systems, and game systems
- **Global Constants**: Centralized configuration for world parameters
- **Component System**: EntityCounter analytics, ObjectPools, and behavior trees
- **Clean Dependencies**: Organized script loading with proper initialization order

## 🚀 Performance Metrics
- **60 FPS** stable with 400+ entities
- **18 Tuna** + **200 Krill** + **260 Small Fry** + **2 Giant Squids**
- **Dynamic population** through reproduction and lifecycle systems
- **Real-time analytics** without performance impact

Built with vanilla JavaScript, HTML5 Canvas, and advanced AI behavioral systems.

---

**🔬 Experience a living underwater ecosystem with emergent behaviors, complex interactions, and realistic marine biology simulation!** 