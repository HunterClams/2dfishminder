// DebugManager - Centralized debug system for all creatures and systems
// F3 toggles all debug overlays ON/OFF and console debug info. T cycles through per-creature overlays.

class DebugManager {
    constructor() {
        this.creatureTypes = ['tuna', 'squid', 'fry', 'krill', 'truefry', 'eggs', 'food', 'poop', 'sperm'];
        this.state = {
            allDebug: false,      // F3 master switch for visual overlays
            consoleDebug: false,  // F3 master switch for console logging
            cycleIndex: -1,       // -1 = all off, 0 = tuna, 1 = squid, etc.
            verboseLogging: false, // Additional detailed logging
            performanceMode: false // Reduce debug overhead
        };
        
        // Debug subsystems
        this.subsystems = {
            console: null,
            visual: null,
            performance: null,
            analytics: null
        };
        
        // Initialize subsystems
        this.initializeSubsystems();
        this.bindKeyEvents();
        
        console.log('🐟 DebugManager initialized (F3: all debug + console, T: cycle creatures)');
    }

    // Initialize debug subsystems
    initializeSubsystems() {
        // Console debug system
        if (window.ConsoleDebugSystem) {
            this.subsystems.console = window.ConsoleDebugSystem;
        }
        
        // Visual debug system
        if (window.DebugViewSystem) {
            this.subsystems.visual = window.DebugViewSystem;
        }
        
        // Performance monitoring
        this.subsystems.performance = {
            frameTimes: [],
            maxFrameTimeHistory: 60,
            lastFrameTime: 0,
            
            startFrame() {
                this.lastFrameTime = performance.now();
            },
            
            endFrame() {
                const frameTime = performance.now() - this.lastFrameTime;
                this.frameTimes.push(frameTime);
                if (this.frameTimes.length > this.maxFrameTimeHistory) {
                    this.frameTimes.shift();
                }
                return frameTime;
            },
            
            getAverageFrameTime() {
                if (this.frameTimes.length === 0) return 0;
                return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
            },
            
            getMaxFrameTime() {
                return Math.max(...this.frameTimes, 0);
            }
        };
        
        // Analytics system
        this.subsystems.analytics = {
            entityCounts: {},
            transformations: {},
            events: [],
            
            trackEntityCount(type, count) {
                this.entityCounts[type] = count;
            },
            
            trackTransformation(from, to) {
                const key = `${from}->${to}`;
                this.transformations[key] = (this.transformations[key] || 0) + 1;
            },
            
            trackEvent(event, data = {}) {
                this.events.push({
                    timestamp: Date.now(),
                    event,
                    data
                });
                
                // Keep only last 100 events
                if (this.events.length > 100) {
                    this.events.shift();
                }
            },
            
            getStats() {
                return {
                    entityCounts: { ...this.entityCounts },
                    transformations: { ...this.transformations },
                    recentEvents: this.events.slice(-10)
                };
            }
        };
    }

    // Keybinds for F3 and T
    bindKeyEvents() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F3') {
                event.preventDefault();
                this.toggleAllDebug();
            } else if (event.key === 't' || event.key === 'T') {
                event.preventDefault();
                this.cycleCreatureDebug();
            } else if (event.key === 'v' || event.key === 'V') {
                event.preventDefault();
                this.toggleVerboseLogging();
            } else if (event.key === 'p' || event.key === 'P') {
                event.preventDefault();
                this.togglePerformanceMode();
            }
        });
    }

    // F3: Toggle all debug overlays and console logging
    toggleAllDebug() {
        this.state.allDebug = !this.state.allDebug;
        this.state.consoleDebug = !this.state.consoleDebug; // Toggle console debug with visual debug
        
        if (this.state.allDebug) {
            this.state.cycleIndex = -1; // When all debug is on, cycle is ignored
        }
        
        // Update global gameState debug flags
        this.updateGlobalDebugFlags();
        this.logState();
    }

    // T: Cycle through per-creature debug overlays
    cycleCreatureDebug() {
        if (this.state.allDebug) {
            // If all debug is on, turn it off and start cycle at first creature
            this.state.allDebug = false;
            this.state.consoleDebug = false;
            this.state.cycleIndex = 0;
        } else {
            this.state.cycleIndex++;
            if (this.state.cycleIndex >= this.creatureTypes.length) {
                this.state.cycleIndex = -1; // All off
            }
        }
        
        // Update global gameState debug flags
        this.updateGlobalDebugFlags();
        this.logState();
    }

    // V: Toggle verbose logging
    toggleVerboseLogging() {
        this.state.verboseLogging = !this.state.verboseLogging;
        console.log(`🔊 Verbose logging ${this.state.verboseLogging ? 'ENABLED' : 'DISABLED'}`);
    }

    // P: Toggle performance mode
    togglePerformanceMode() {
        this.state.performanceMode = !this.state.performanceMode;
        console.log(`⚡ Performance mode ${this.state.performanceMode ? 'ENABLED' : 'DISABLED'}`);
    }

    // Update global gameState debug flags based on current state
    updateGlobalDebugFlags() {
        if (!window.gameState) {
            window.gameState = {};
        }
        
        // Set individual debug flags based on current state
        window.gameState.tunaDebug = this.isDebugOn('tuna');
        window.gameState.squidDebug = this.isDebugOn('squid');
        window.gameState.fryDebug = this.isDebugOn('fry');
        window.gameState.krillDebug = this.isDebugOn('krill');
        window.gameState.truefryDebug = this.isDebugOn('truefry');
        window.gameState.eggsDebug = this.isDebugOn('eggs');
        window.gameState.foodDebug = this.isDebugOn('food');
        window.gameState.poopDebug = this.isDebugOn('poop');
        window.gameState.spermDebug = this.isDebugOn('sperm');
        
        // Set console debug flag
        window.gameState.consoleDebug = this.state.consoleDebug;
        window.gameState.verboseLogging = this.state.verboseLogging;
        window.gameState.performanceMode = this.state.performanceMode;
        
        // Set system-specific debug flags (all off by default)
        window.gameState.frySpawningDebug = this.state.consoleDebug;
        window.gameState.fryEggLayingDebug = this.state.consoleDebug;
        window.gameState.eggRenderingDebug = this.state.consoleDebug;
        window.gameState.spermFertilizationDebug = this.state.consoleDebug;
        window.gameState.truefryHatchingDebug = this.state.consoleDebug;
        window.gameState.truefryTransformationDebug = this.state.consoleDebug;
        window.gameState.krillLifecycleDebug = this.state.consoleDebug;
        window.gameState.krillTransformationDebug = this.state.consoleDebug;
        window.gameState.squidBehaviorDebug = this.state.consoleDebug;
        window.gameState.tunaAIDebug = this.state.consoleDebug;
        window.gameState.tunaPoopingDebug = this.state.consoleDebug;
        window.gameState.tunaRenderingDebug = this.state.consoleDebug;
        window.gameState.boidFeedingDebug = this.state.consoleDebug;
        window.gameState.boidRenderingDebug = this.state.consoleDebug;
        window.gameState.debugViewDebug = this.state.consoleDebug;
        window.gameState.uiRenderingDebug = this.state.consoleDebug;
        window.gameState.gameEntitiesDebug = this.state.consoleDebug;
    }

    // Check if all debug overlays are on
    isAllDebugOn() {
        return this.state.allDebug;
    }

    // Check if console debug is on
    isConsoleDebugOn() {
        return this.state.consoleDebug;
    }

    // Check if verbose logging is on
    isVerboseLoggingOn() {
        return this.state.verboseLogging;
    }

    // Check if performance mode is on
    isPerformanceModeOn() {
        return this.state.performanceMode;
    }

    // Check if debug overlay is on for a specific creature type
    isDebugOn(creatureType) {
        if (this.state.allDebug) return true;
        if (this.state.cycleIndex === -1) return false;
        return this.creatureTypes[this.state.cycleIndex] === creatureType;
    }

    // Check if global debug is on (for backward compatibility)
    isGlobalDebugOn() {
        return this.state.allDebug;
    }

    // Get current cycle creature type
    getCurrentCycle() {
        if (this.state.cycleIndex === -1) return 'none';
        return this.creatureTypes[this.state.cycleIndex];
    }

    // Log current debug state
    logState() {
        if (this.state.allDebug) {
            console.log('🟢 DebugManager: ALL debug overlays ON + Console logging ON');
        } else if (this.state.cycleIndex === -1) {
            console.log('⚪ DebugManager: All debug overlays OFF + Console logging OFF');
        } else {
            console.log(`🔵 DebugManager: Only ${this.creatureTypes[this.state.cycleIndex]} debug ON + Console logging OFF`);
        }
    }

    // Check if should log for a specific system
    shouldLog(systemName) {
        return this.state.consoleDebug || this.state.verboseLogging;
    }

    // Centralized logging method
    log(systemName, message, level = 'info') {
        if (!this.shouldLog(systemName)) return;
        
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `[${timestamp}] [${systemName.toUpperCase()}]`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            case 'debug':
                if (this.state.verboseLogging) {
                    console.log(`${prefix} ${message}`);
                }
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }

    // Performance monitoring methods
    startFrame() {
        if (this.subsystems.performance) {
            this.subsystems.performance.startFrame();
        }
    }

    endFrame() {
        if (this.subsystems.performance) {
            return this.subsystems.performance.endFrame();
        }
        return 0;
    }

    getPerformanceStats() {
        if (!this.subsystems.performance) return {};
        
        return {
            averageFrameTime: this.subsystems.performance.getAverageFrameTime(),
            maxFrameTime: this.subsystems.performance.getMaxFrameTime(),
            lastFrameTime: this.subsystems.performance.lastFrameTime
        };
    }

    // Analytics tracking methods
    trackEntityCount(type, count) {
        if (this.subsystems.analytics) {
            this.subsystems.analytics.trackEntityCount(type, count);
        }
    }

    trackTransformation(from, to) {
        if (this.subsystems.analytics) {
            this.subsystems.analytics.trackTransformation(from, to);
        }
    }

    trackEvent(event, data = {}) {
        if (this.subsystems.analytics) {
            this.subsystems.analytics.trackEvent(event, data);
        }
    }

    getAnalyticsStats() {
        if (!this.subsystems.analytics) return {};
        return this.subsystems.analytics.getStats();
    }

    // Export debug data for analysis
    exportDebugData() {
        return {
            state: { ...this.state },
            performance: this.getPerformanceStats(),
            analytics: this.getAnalyticsStats(),
            timestamp: Date.now()
        };
    }

    // Reset all debug data
    resetDebugData() {
        if (this.subsystems.performance) {
            this.subsystems.performance.frameTimes = [];
        }
        if (this.subsystems.analytics) {
            this.subsystems.analytics.entityCounts = {};
            this.subsystems.analytics.transformations = {};
            this.subsystems.analytics.events = [];
        }
        console.log('🔄 Debug data reset');
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.DebugManager = DebugManager;
} 