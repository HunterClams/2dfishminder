# Underwater Ecosystem Simulation

A highly optimized marine biology simulation featuring realistic predator-prey relationships, migration patterns, waste cycles, and advanced giant squid AI with bioluminescent effects.

## Features

### Marine Life
- **Fry Species**: 3 types with distinct behaviors and habitat preferences
- **Tuna Predators**: Apex hunters with selective feeding
- **Giant Squid**: Advanced AI with bioluminescent effects and depth-based hunting
- **Krill Swarms**: Waste cleaners with vertical migration patterns

### Ecosystem Dynamics
- **4-State Spawning System**: Food → Krill → Poop → Off
- **3-Stage Waste Cycle**: Fresh → Aged → Deep water
- **Habitat Stratification**: Surface, mid-water, and deep zones
- **Realistic Food Web**: Complete predator-prey relationships

### Technical Optimizations
- Object pooling for performance
- Spatial caching for calculations
- Optimized rendering pipeline
- Memory-efficient entity management

## Controls
- **WASD**: Camera movement (Shift to boost)
- **Mouse Wheel**: Zoom (0.5x - 4.0x)
- **F**: Cycle spawn modes
- **H**: Toggle UI visibility
- **Click**: Spawn selected items

## Performance
- 60 FPS target with dynamic entity counts
- 1500px render distance optimization
- Cached depth and relationship calculations
- Minimized garbage collection

Built with vanilla JavaScript and HTML5 Canvas. 