// ConsoleDebugSystem - Modular console logging system for game debugging
// Integrates with DebugManager to provide conditional console output

class ConsoleDebugSystem {
    constructor() {
        this.systems = new Map();
        this.logBuffer = [];
        this.maxBufferSize = 100;
        this.frameLogCount = 0;
        this.maxLogsPerFrame = 50; // Global rate limiting
        
        // Integration with DebugManager
        this.debugManager = null;
        
        console.log('📝 ConsoleDebugSystem initialized - Use F3 to toggle console logging');
    }

    // Set reference to DebugManager
    setDebugManager(debugManager) {
        this.debugManager = debugManager;
    }

    // Register a system for logging
    registerSystem(systemName, config = {}) {
        const systemConfig = {
            enabled: true,
            logLevel: 'info', // 'error', 'warn', 'info', 'debug'
            maxLogsPerFrame: config.maxLogsPerFrame || 10,
            logCount: 0,
            verboseOnly: config.verboseOnly || false,
            ...config
        };
        
        this.systems.set(systemName, systemConfig);
        this.log('SYSTEM', `Registered system: ${systemName}`, 'info');
    }

    // Check if console logging is enabled globally
    isEnabled() {
        if (this.debugManager) {
            return this.debugManager.isConsoleDebugOn();
        }
        return window.debugManager && window.debugManager.isConsoleDebugOn();
    }

    // Check if verbose logging is required
    isVerboseRequired() {
        if (this.debugManager) {
            return this.debugManager.isVerboseLoggingOn();
        }
        return window.debugManager && window.debugManager.isVerboseLoggingOn();
    }

    // Check if a specific system should log
    shouldLog(systemName) {
        if (!this.isEnabled()) return false;
        
        // Check global rate limiting
        if (this.frameLogCount >= this.maxLogsPerFrame) return false;
        
        const system = this.systems.get(systemName);
        if (!system || !system.enabled) return false;
        
        // Check system-specific rate limiting
        if (system.logCount >= system.maxLogsPerFrame) return false;
        
        // Check if verbose logging is required for this system
        if (system.verboseOnly && !this.isVerboseRequired()) return false;
        
        return true;
    }

    // Log a message for a specific system
    log(systemName, message, level = 'info') {
        if (!this.shouldLog(systemName)) return;
        
        const system = this.systems.get(systemName);
        if (!system) {
            // Auto-register unknown systems
            this.registerSystem(systemName);
        }
        
        // Increment counters for rate limiting
        this.frameLogCount++;
        if (system) {
            system.logCount++;
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[${systemName.toUpperCase()}]`;
        const formattedMessage = `${timestamp} ${prefix} ${message}`;
        
        // Add to buffer
        this.addToBuffer(formattedMessage, level);
        
        // Output to console
        switch (level) {
            case 'error':
                console.error(formattedMessage);
                break;
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'debug':
                console.debug(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }

    // Add message to buffer for potential replay
    addToBuffer(message, level) {
        this.logBuffer.push({
            message,
            level,
            timestamp: Date.now()
        });
        
        // Trim buffer if too large
        if (this.logBuffer.length > this.maxBufferSize) {
            this.logBuffer.shift();
        }
    }

    // Reset log counters (call this at the start of each frame)
    resetFrameCounters() {
        this.frameLogCount = 0;
        for (const [systemName, system] of this.systems) {
            system.logCount = 0;
        }
    }

    // Get recent logs
    getRecentLogs(count = 10) {
        return this.logBuffer.slice(-count);
    }

    // Clear log buffer
    clearBuffer() {
        this.logBuffer = [];
    }

    // Export logs for debugging
    exportLogs() {
        return {
            timestamp: new Date().toISOString(),
            logs: this.logBuffer,
            systems: Array.from(this.systems.keys()),
            frameStats: {
                frameLogCount: this.frameLogCount,
                maxLogsPerFrame: this.maxLogsPerFrame
            }
        };
    }

    // Utility methods for common debug scenarios
    logEntityCount(systemName, entityType, count) {
        this.log(systemName, `${entityType}: ${count}`, 'info');
    }

    logEntityAction(systemName, entityType, action, details = '') {
        const message = details ? `${entityType} ${action}: ${details}` : `${entityType} ${action}`;
        this.log(systemName, message, 'debug');
    }

    logSystemState(systemName, state) {
        this.log(systemName, `State: ${JSON.stringify(state)}`, 'debug');
    }

    logError(systemName, error, context = '') {
        const message = context ? `${context}: ${error}` : error;
        this.log(systemName, message, 'error');
    }

    logWarning(systemName, warning, context = '') {
        const message = context ? `${context}: ${warning}` : warning;
        this.log(systemName, message, 'warn');
    }

    // Performance logging
    logPerformance(systemName, operation, duration) {
        this.log(systemName, `${operation} took ${duration.toFixed(2)}ms`, 'debug');
    }

    // Entity transformation logging
    logTransformation(systemName, fromType, toType, entityId = '') {
        const message = entityId ? 
            `${fromType} → ${toType} (ID: ${entityId})` : 
            `${fromType} → ${toType}`;
        this.log(systemName, message, 'info');
        
        // Track in analytics if available
        if (this.debugManager) {
            this.debugManager.trackTransformation(fromType, toType);
        }
    }

    // Entity creation logging
    logEntityCreated(systemName, entityType, x, y, details = '') {
        const message = details ? 
            `Created ${entityType} at (${x.toFixed(1)}, ${y.toFixed(1)}) - ${details}` :
            `Created ${entityType} at (${x.toFixed(1)}, ${y.toFixed(1)})`;
        this.log(systemName, message, 'debug');
    }

    // Entity destruction logging
    logEntityDestroyed(systemName, entityType, reason = '') {
        const message = reason ? 
            `Destroyed ${entityType} - ${reason}` :
            `Destroyed ${entityType}`;
        this.log(systemName, message, 'debug');
    }

    // System initialization logging
    logSystemInit(systemName, details = '') {
        const message = details ? 
            `System initialized - ${details}` :
            `System initialized`;
        this.log(systemName, message, 'info');
    }

    // Behavior state change logging
    logBehaviorChange(systemName, entityType, oldState, newState, reason = '') {
        const message = reason ?
            `${entityType} behavior: ${oldState} → ${newState} (${reason})` :
            `${entityType} behavior: ${oldState} → ${newState}`;
        this.log(systemName, message, 'debug');
    }
}

// Create and export global instance
const consoleDebugSystem = new ConsoleDebugSystem();
if (typeof window !== 'undefined') {
    window.ConsoleDebugSystem = consoleDebugSystem;
    
    // Register common systems with appropriate rate limits
    consoleDebugSystem.registerSystem('TUNA', { maxLogsPerFrame: 5 });
    consoleDebugSystem.registerSystem('SQUID', { maxLogsPerFrame: 5 });
    consoleDebugSystem.registerSystem('FRY', { maxLogsPerFrame: 8 });
    consoleDebugSystem.registerSystem('TRUEFRY', { maxLogsPerFrame: 8 });
    consoleDebugSystem.registerSystem('KRILL', { maxLogsPerFrame: 10 });
    consoleDebugSystem.registerSystem('FOOD', { maxLogsPerFrame: 3 });
    consoleDebugSystem.registerSystem('POOP', { maxLogsPerFrame: 3 });
    consoleDebugSystem.registerSystem('EGGS', { maxLogsPerFrame: 5 });
    consoleDebugSystem.registerSystem('SPAWNING', { maxLogsPerFrame: 3 });
    consoleDebugSystem.registerSystem('PHYSICS', { maxLogsPerFrame: 5 });
    consoleDebugSystem.registerSystem('AI', { maxLogsPerFrame: 8 });
    consoleDebugSystem.registerSystem('TRANSFORMATION', { maxLogsPerFrame: 5 });
    consoleDebugSystem.registerSystem('RENDERING', { maxLogsPerFrame: 10, verboseOnly: true });
    consoleDebugSystem.registerSystem('PERFORMANCE', { maxLogsPerFrame: 3 });
} 