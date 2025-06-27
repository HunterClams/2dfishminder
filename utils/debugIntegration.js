// DebugIntegration - Centralized debug logging integration
// Replaces scattered console.log statements with controlled debug system

class DebugIntegration {
    constructor() {
        this.initialized = false;
        this.integrationComplete = false;
        this.debugManager = null;
    }

    // Set reference to DebugManager
    setDebugManager(debugManager) {
        this.debugManager = debugManager;
    }

    // Initialize debug integration
    initialize() {
        if (this.initialized) return;
        
        // Initialize console debug system
        if (window.ConsoleDebugSystem) {
            // Register common systems
            window.ConsoleDebugSystem.registerSystem('FISH', { maxLogsPerFrame: 20 });
            window.ConsoleDebugSystem.registerSystem('SQUID', { maxLogsPerFrame: 15 });
            window.ConsoleDebugSystem.registerSystem('KRILL', { maxLogsPerFrame: 15 });
            window.ConsoleDebugSystem.registerSystem('EGGS', { maxLogsPerFrame: 10 });
            window.ConsoleDebugSystem.registerSystem('SPAWNING', { maxLogsPerFrame: 10 });
            window.ConsoleDebugSystem.registerSystem('TRANSFORMATION', { maxLogsPerFrame: 10 });
            window.ConsoleDebugSystem.registerSystem('RENDERING', { maxLogsPerFrame: 15 });
            window.ConsoleDebugSystem.registerSystem('AI', { maxLogsPerFrame: 20 });
            window.ConsoleDebugSystem.registerSystem('PERFORMANCE', { maxLogsPerFrame: 5 });
            window.ConsoleDebugSystem.registerSystem('SYSTEM', { maxLogsPerFrame: 5 });
            
            // Connect to DebugManager if available
            if (this.debugManager) {
                window.ConsoleDebugSystem.setDebugManager(this.debugManager);
            }
        }
        
        // Setup frame reset for debug counters
        this.setupFrameReset();
        
        // Replace console logs with debug system
        this.replaceConsoleLogs();
        
        // Create debug helper functions
        this.createDebugHelpers();
        
        this.initialized = true;
        console.log('🔗 DebugIntegration initialized');
    }

    // Set up automatic frame counter reset
    setupFrameReset() {
        // Hook into the game loop to reset debug counters each frame
        const originalGameLoop = window.gameLoop;
        if (originalGameLoop) {
            window.gameLoop = (...args) => {
                // Reset debug counters at start of frame
                if (window.ConsoleDebugSystem) {
                    window.ConsoleDebugSystem.resetFrameCounters();
                }
                
                // Start performance monitoring
                if (this.debugManager) {
                    this.debugManager.startFrame();
                }
                
                // Call original game loop
                const result = originalGameLoop(...args);
                
                // End performance monitoring
                if (this.debugManager) {
                    this.debugManager.endFrame();
                }
                
                return result;
            };
        }
    }

    // Replace console.log with debug system logging
    replaceConsoleLogs() {
        if (this.integrationComplete) return;
        
        // Create a proxy for console.log that routes through debug system
        const originalConsoleLog = console.log;
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;
        
        console.log = (...args) => {
            // Check if this is a debug message that should be controlled
            const message = args.join(' ');
            
            // Skip if debug system is not available
            if (!window.ConsoleDebugSystem) {
                originalConsoleLog(...args);
                return;
            }
            
            // Route through debug system based on message content
            this.routeMessage(message, 'info', args);
        };
        
        console.warn = (...args) => {
            const message = args.join(' ');
            if (!window.ConsoleDebugSystem) {
                originalConsoleWarn(...args);
                return;
            }
            this.routeMessage(message, 'warn', args);
        };
        
        console.error = (...args) => {
            const message = args.join(' ');
            if (!window.ConsoleDebugSystem) {
                originalConsoleError(...args);
                return;
            }
            this.routeMessage(message, 'error', args);
        };
        
        this.integrationComplete = true;
        console.log('🔗 Console logging integrated with debug system');
    }

    // Route messages to appropriate debug systems
    routeMessage(message, level, originalArgs) {
        const debugSystem = window.ConsoleDebugSystem;
        if (!debugSystem) return;

        // Determine system based on message content
        let systemName = 'GENERAL';
        
        if (message.includes('🐟') || message.includes('fish') || message.includes('Fish')) {
            systemName = 'FISH';
        } else if (message.includes('🦑') || message.includes('squid') || message.includes('Squid')) {
            systemName = 'SQUID';
        } else if (message.includes('🦐') || message.includes('krill') || message.includes('Krill')) {
            systemName = 'KRILL';
        } else if (message.includes('🥚') || message.includes('egg') || message.includes('Egg')) {
            systemName = 'EGGS';
        } else if (message.includes('💩') || message.includes('poop') || message.includes('Poop')) {
            systemName = 'POOP';
        } else if (message.includes('🌊') || message.includes('spawn') || message.includes('Spawn')) {
            systemName = 'SPAWNING';
        } else if (message.includes('🔄') || message.includes('transform') || message.includes('Transform')) {
            systemName = 'TRANSFORMATION';
        } else if (message.includes('🎨') || message.includes('render') || message.includes('Render')) {
            systemName = 'RENDERING';
        } else if (message.includes('⚙️') || message.includes('physics') || message.includes('Physics')) {
            systemName = 'PHYSICS';
        } else if (message.includes('🎯') || message.includes('ai') || message.includes('AI')) {
            systemName = 'AI';
        } else if (message.includes('⏰') || message.includes('timer') || message.includes('Timer')) {
            systemName = 'TIMERS';
        } else if (message.includes('🍽️') || message.includes('eat') || message.includes('Eat')) {
            systemName = 'FEEDING';
        }

        // Log through debug system
        debugSystem.log(systemName, message, level);
    }

    // Create debug helper functions for common patterns
    createDebugHelpers() {
        if (!window.DebugHelpers) {
            window.DebugHelpers = {
                // Entity creation logging
                logEntityCreated: (entityType, x, y, details = '') => {
                    if (window.ConsoleDebugSystem) {
                        window.ConsoleDebugSystem.logEntityCreated('SPAWNING', entityType, x, y, details);
                    }
                },

                // Entity transformation logging
                logTransformation: (fromType, toType, entityId = '') => {
                    if (window.ConsoleDebugSystem) {
                        window.ConsoleDebugSystem.logTransformation('TRANSFORMATION', fromType, toType, entityId);
                    }
                },

                // System initialization logging
                logSystemInit: (systemName, details = '') => {
                    if (window.ConsoleDebugSystem) {
                        window.ConsoleDebugSystem.logSystemInit(systemName, details);
                    }
                },

                // Behavior state change logging
                logBehaviorChange: (entityType, oldState, newState, reason = '') => {
                    if (window.ConsoleDebugSystem) {
                        window.ConsoleDebugSystem.logBehaviorChange('AI', entityType, oldState, newState, reason);
                    }
                },

                // Performance logging
                logPerformance: (operation, duration) => {
                    if (window.ConsoleDebugSystem) {
                        window.ConsoleDebugSystem.logPerformance('PERFORMANCE', operation, duration);
                    }
                },

                // Error logging
                logError: (systemName, error, context = '') => {
                    if (window.ConsoleDebugSystem) {
                        window.ConsoleDebugSystem.logError(systemName, error, context);
                    }
                },

                // Warning logging
                logWarning: (systemName, warning, context = '') => {
                    if (window.ConsoleDebugSystem) {
                        window.ConsoleDebugSystem.logWarning(systemName, warning, context);
                    }
                }
            };
        }
    }

    // Get debug statistics
    getDebugStats() {
        const stats = {
            consoleSystem: window.ConsoleDebugSystem ? {
                enabled: window.ConsoleDebugSystem.isEnabled(),
                frameLogCount: window.ConsoleDebugSystem.frameLogCount,
                maxLogsPerFrame: window.ConsoleDebugSystem.maxLogsPerFrame,
                registeredSystems: Array.from(window.ConsoleDebugSystem.systems.keys())
            } : null,
            debugManager: this.debugManager ? {
                allDebug: this.debugManager.isAllDebugOn(),
                consoleDebug: this.debugManager.isConsoleDebugOn(),
                verboseLogging: this.debugManager.isVerboseLoggingOn(),
                performanceMode: this.debugManager.isPerformanceModeOn(),
                currentCycle: this.debugManager.getCurrentCycle()
            } : null,
            performance: this.debugManager ? this.debugManager.getPerformanceStats() : null,
            analytics: this.debugManager ? this.debugManager.getAnalyticsStats() : null
        };

        return stats;
    }

    // Export debug data
    exportDebugData() {
        const data = {
            timestamp: new Date().toISOString(),
            integration: {
                initialized: this.initialized,
                integrationComplete: this.integrationComplete
            },
            stats: this.getDebugStats(),
            consoleLogs: window.ConsoleDebugSystem ? window.ConsoleDebugSystem.exportLogs() : null
        };

        return data;
    }
}

// Create and export global instance
const debugIntegration = new DebugIntegration();
if (typeof window !== 'undefined') {
    window.DebugIntegration = debugIntegration;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            debugIntegration.initialize();
        });
    } else {
        debugIntegration.initialize();
    }
} 