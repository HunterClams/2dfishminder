// Debug panel for monitoring bubble particle system performance
// Provides real-time stats and controls for the bubble system

class BubbleDebugPanel {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.updateInterval = null;
        this.stats = {
            fps: 0,
            bubbleCount: 0,
            rendered: 0,
            culled: 0,
            memoryUsage: 0
        };
        
        this.createPanel();
    }
    
    createPanel() {
        // Create debug panel element
        this.panel = document.createElement('div');
        this.panel.id = 'bubble-debug-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #333;
            z-index: 9999;
            user-select: none;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
            display: none;
        `;
        
        document.body.appendChild(this.panel);
        
        // Add event listeners for controls
        this.setupControls();
    }
    
    setupControls() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.toggle();
            } else if (this.isVisible) {
                this.handleKeyPress(e);
            }
        });
        
        // Mouse controls on panel
        this.panel.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    handleKeyPress(e) {
        const bubbleSystem = window.gameEntities?.bubbleParticleSystem;
        if (!bubbleSystem) return;
        
        switch(e.key) {
            case '=':
            case '+':
                // Increase bubble count
                const newCount = Math.min(800, bubbleSystem.getParticleCount() + 50);
                bubbleSystem.setParticleCount(newCount);
                break;
                
            case '-':
            case '_':
                // Decrease bubble count
                const reducedCount = Math.max(100, bubbleSystem.getParticleCount() - 50);
                bubbleSystem.setParticleCount(reducedCount);
                break;
                
            case '0':
                // Reset to default (400)
                bubbleSystem.setParticleCount(400);
                break;
                
            case 'r':
            case 'R':
                // Reinitialize system
                bubbleSystem.reinitializeSystem();
                console.log('🔄 Bubble system reinitialized');
                break;
        }
    }
    
    toggle() {
        this.isVisible = !this.isVisible;
        this.panel.style.display = this.isVisible ? 'block' : 'none';
        
        if (this.isVisible) {
            this.startUpdating();
            console.log('🫧 Bubble debug panel enabled (Ctrl+B to toggle, +/- to adjust count, R to reset)');
        } else {
            this.stopUpdating();
        }
    }
    
    startUpdating() {
        if (this.updateInterval) return;
        
        this.updateInterval = setInterval(() => {
            this.updateStats();
            this.render();
        }, 100); // Update 10 times per second
    }
    
    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    updateStats() {
        const bubbleSystem = window.gameEntities?.bubbleParticleSystem;
        const performanceSystem = window.performanceMonitoringSystem;
        
        // Update FPS
        this.stats.fps = performanceSystem ? 
            Math.round(performanceSystem.getAverageFrameRate()) : 
            this.estimateFPS();
        
        // Update bubble stats
        if (bubbleSystem) {
            const systemStats = bubbleSystem.getStats();
            this.stats.bubbleCount = systemStats.maxParticles;
            this.stats.memoryUsage = systemStats.memoryUsage.total;
            
            // Get render stats from performance system
            if (performanceSystem) {
                this.stats.rendered = performanceSystem.getMetric('bubbles_rendered') || 0;
                this.stats.culled = performanceSystem.getMetric('bubbles_culled') || 0;
            }
        }
    }
    
    estimateFPS() {
        // Simple FPS estimation if performance system not available
        if (!this.lastFrameTime) {
            this.lastFrameTime = performance.now();
            return 60;
        }
        
        const now = performance.now();
        const fps = 1000 / (now - this.lastFrameTime);
        this.lastFrameTime = now;
        
        return Math.round(fps);
    }
    
    render() {
        if (!this.isVisible) return;
        
        const fpsColor = this.stats.fps >= 50 ? '#00ff00' : 
                        this.stats.fps >= 30 ? '#ffff00' : '#ff0000';
        
        const renderRatio = this.stats.rendered + this.stats.culled > 0 ? 
                           Math.round((this.stats.rendered / (this.stats.rendered + this.stats.culled)) * 100) : 0;
        
        this.panel.innerHTML = `
            <div style="color: #00ccff; font-weight: bold; margin-bottom: 10px;">
                🫧 BUBBLE SYSTEM DEBUG
            </div>
            
            <div style="margin-bottom: 8px;">
                <span style="color: ${fpsColor};">FPS: ${this.stats.fps}</span>
                <span style="float: right; color: #888;">Target: 60</span>
            </div>
            
            <div style="margin-bottom: 8px;">
                <span>Bubbles: ${this.stats.bubbleCount}</span>
                <span style="float: right; color: #888;">Max: 800</span>
            </div>
            
            <div style="margin-bottom: 8px;">
                <span>Rendered: ${this.stats.rendered}</span>
                <span style="float: right;">Ratio: ${renderRatio}%</span>
            </div>
            
            <div style="margin-bottom: 8px;">
                <span>Culled: ${this.stats.culled}</span>
                <span style="float: right; color: #666;">Offscreen</span>
            </div>
            
            <div style="margin-bottom: 8px;">
                <span>Memory: ${Math.round(this.stats.memoryUsage)}KB</span>
            </div>
            
            <hr style="border: 1px solid #333; margin: 10px 0;">
            
            <div style="font-size: 10px; color: #888; line-height: 14px;">
                <div><strong>CONTROLS:</strong></div>
                <div>Ctrl+B: Toggle panel</div>
                <div>+/-: Adjust bubble count</div>
                <div>0: Reset to 400 bubbles</div>
                <div>R: Reinitialize system</div>
            </div>
            
            <div style="margin-top: 10px; padding: 5px; background: rgba(0, 100, 0, 0.2); border-radius: 3px; font-size: 10px;">
                ${this.getPerformanceAdvice()}
            </div>
        `;
    }
    
    getPerformanceAdvice() {
        if (this.stats.fps >= 50) {
            return "🟢 Performance: Excellent! Try increasing bubble count.";
        } else if (this.stats.fps >= 30) {
            return "🟡 Performance: Good. Current settings optimal.";
        } else {
            return "🔴 Performance: Poor. Consider reducing bubble count.";
        }
    }
    
    // Cleanup
    destroy() {
        this.stopUpdating();
        
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
        
        this.panel = null;
    }
}

// Auto-initialize when debug mode is enabled
if (typeof window !== 'undefined') {
    window.BubbleDebugPanel = BubbleDebugPanel;
    
    // Auto-create debug panel if debug mode is on
    document.addEventListener('DOMContentLoaded', () => {
        if (window.gameState && window.gameState.debug) {
            window.bubbleDebugPanel = new BubbleDebugPanel();
            console.log('🛠️ Bubble debug panel initialized. Press Ctrl+B to toggle.');
        }
    });
}