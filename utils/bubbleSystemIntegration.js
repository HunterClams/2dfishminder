// Integration system for transitioning to particle-based bubbles
// Provides backward compatibility while enabling high-performance rendering

class BubbleSystemIntegration {
    constructor() {
        this.useParticleSystem = true; // Enable high-performance particle system
        this.particleSystem = null;
        this.fallbackBubbles = []; // Traditional bubble objects for compatibility
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastFPSUpdate = Date.now();
        this.fps = 60;
        
        // Configuration
        this.config = {
            particleCount: 400,
            enableLOD: true,
            enableCulling: true,
            batchSize: 50,
            qualityProfile: 'high' // 'low', 'medium', 'high', 'ultra'
        };
        
        this.applyQualityProfile();
        this.initialize();
    }
    
    applyQualityProfile() {
        const profiles = {
            low: {
                particleCount: 100,
                enableLOD: true,
                enableCulling: true,
                batchSize: 25
            },
            medium: {
                particleCount: 200,
                enableLOD: true,
                enableCulling: true,
                batchSize: 40
            },
            high: {
                particleCount: 400,
                enableLOD: true,
                enableCulling: true,
                batchSize: 50
            },
            ultra: {
                particleCount: 800,
                enableLOD: false, // Show all detail
                enableCulling: true,
                batchSize: 80
            }
        };
        
        const profile = profiles[this.config.qualityProfile] || profiles.high;
        Object.assign(this.config, profile);
    }
    
    initialize() {
        if (this.useParticleSystem && window.ParticleBubbleSystem) {
            console.log(`🫧 Initializing high-performance particle system with ${this.config.particleCount} bubbles`);
            this.particleSystem = new window.ParticleBubbleSystem(this.config.particleCount);
            this.particleSystem.enableLOD = this.config.enableLOD;
            this.particleSystem.enableCulling = this.config.enableCulling;
            this.particleSystem.batchSize = this.config.batchSize;
        } else {
            console.log('⚠️ Falling back to traditional bubble system');
            this.initializeFallbackBubbles();
        }
    }
    
    initializeFallbackBubbles() {
        // Create traditional bubble instances for fallback
        this.fallbackBubbles = [];
        const bubbleCount = Math.min(this.config.particleCount, 150); // Limit for performance
        
        for (let i = 0; i < bubbleCount; i++) {
            const bubble = new window.Bubble();
            this.fallbackBubbles.push(bubble);
        }
    }
    
    update() {
        this.updateFPS();
        
        if (this.particleSystem) {
            this.particleSystem.update();
            this.autoAdjustQuality();
        } else {
            // Update fallback bubbles
            this.fallbackBubbles.forEach(bubble => bubble.update());
        }
    }
    
    draw() {
        if (this.particleSystem) {
            this.particleSystem.draw();
        } else {
            // Draw fallback bubbles
            this.fallbackBubbles.forEach(bubble => bubble.draw());
        }
    }
    
    updateFPS() {
        this.frameCount++;
        const now = Date.now();
        
        if (now - this.lastFPSUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = now;
        }
    }
    
    autoAdjustQuality() {
        // Automatically adjust quality based on performance
        if (!this.particleSystem) return;
        
        const targetFPS = 50; // Minimum acceptable FPS
        const checkInterval = 5000; // Check every 5 seconds
        
        if (this.frameCount === 0) return;
        
        if (Date.now() - this.lastFPSUpdate >= checkInterval) {
            if (this.fps < targetFPS && this.config.particleCount > 100) {
                // Reduce particle count
                const newCount = Math.max(100, Math.floor(this.config.particleCount * 0.8));
                console.log(`🔧 Auto-adjusting: Reducing bubbles from ${this.config.particleCount} to ${newCount} (FPS: ${this.fps})`);
                this.setParticleCount(newCount);
            } else if (this.fps > targetFPS + 10 && this.config.particleCount < 800) {
                // Increase particle count
                const newCount = Math.min(800, Math.floor(this.config.particleCount * 1.1));
                console.log(`🔧 Auto-adjusting: Increasing bubbles from ${this.config.particleCount} to ${newCount} (FPS: ${this.fps})`);
                this.setParticleCount(newCount);
            }
        }
    }
    
    setParticleCount(count) {
        this.config.particleCount = count;
        
        if (this.particleSystem) {
            this.particleSystem.setParticleCount(count);
        } else {
            // Adjust fallback bubbles
            const currentCount = this.fallbackBubbles.length;
            
            if (count > currentCount) {
                // Add more bubbles
                for (let i = currentCount; i < count && i < 150; i++) {
                    this.fallbackBubbles.push(new window.Bubble());
                }
            } else if (count < currentCount) {
                // Remove bubbles
                this.fallbackBubbles.splice(count);
            }
        }
    }
    
    setQualityProfile(profile) {
        this.config.qualityProfile = profile;
        this.applyQualityProfile();
        
        if (this.particleSystem) {
            this.particleSystem.setParticleCount(this.config.particleCount);
            this.particleSystem.enableLOD = this.config.enableLOD;
            this.particleSystem.enableCulling = this.config.enableCulling;
            this.particleSystem.batchSize = this.config.batchSize;
        }
        
        console.log(`🎮 Quality profile set to '${profile}': ${this.config.particleCount} bubbles`);
    }
    
    getStats() {
        const baseStats = {
            fps: this.fps,
            qualityProfile: this.config.qualityProfile,
            useParticleSystem: this.useParticleSystem,
            actualBubbleCount: this.useParticleSystem ? 
                (this.particleSystem ? this.particleSystem.particleCount : 0) :
                this.fallbackBubbles.length
        };
        
        if (this.particleSystem) {
            return {
                ...baseStats,
                ...this.particleSystem.getStats()
            };
        }
        
        return baseStats;
    }
    
    // Debug UI integration
    createDebugPanel() {
        if (!window.gameState || !window.gameState.debug) return;
        
        const panel = document.createElement('div');
        panel.id = 'bubble-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            min-width: 200px;
        `;
        
        document.body.appendChild(panel);
        
        // Update panel periodically
        setInterval(() => {
            const stats = this.getStats();
            panel.innerHTML = `
                <div><strong>🫧 Bubble System Stats</strong></div>
                <div>FPS: ${stats.fps}</div>
                <div>Quality: ${stats.qualityProfile}</div>
                <div>Bubbles: ${stats.actualBubbleCount}</div>
                <div>System: ${stats.useParticleSystem ? 'Particle' : 'Traditional'}</div>
                ${stats.memoryUsage ? `<div>Memory: ${Math.round(stats.memoryUsage.total / 1024)} KB</div>` : ''}
                <div>LOD: ${stats.enableLOD ? 'On' : 'Off'}</div>
                <div>Culling: ${stats.enableCulling ? 'On' : 'Off'}</div>
                <hr style="border: 1px solid #333; margin: 5px 0;">
                <div style="font-size: 10px;">
                    Press 'B' to toggle system<br>
                    Press '1-4' for quality profiles
                </div>
            `;
        }, 1000);
        
        // Add keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'b' || e.key === 'B') {
                this.toggleSystem();
            } else if (e.key >= '1' && e.key <= '4') {
                const profiles = ['low', 'medium', 'high', 'ultra'];
                this.setQualityProfile(profiles[parseInt(e.key) - 1]);
            }
        });
    }
    
    toggleSystem() {
        this.useParticleSystem = !this.useParticleSystem;
        
        if (this.useParticleSystem && window.ParticleBubbleSystem) {
            console.log('🔄 Switching to particle system');
            this.particleSystem = new window.ParticleBubbleSystem(this.config.particleCount);
        } else {
            console.log('🔄 Switching to traditional bubble system');
            this.particleSystem = null;
            this.initializeFallbackBubbles();
        }
    }
    
    // Cleanup
    destroy() {
        this.particleSystem = null;
        this.fallbackBubbles = [];
        
        const panel = document.getElementById('bubble-debug-panel');
        if (panel) {
            panel.remove();
        }
    }
}

// Auto-detection for mobile devices
function detectOptimalProfile() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency < 4 || navigator.deviceMemory < 4;
    
    if (isMobile || isLowEnd) {
        return 'low';
    } else if (navigator.hardwareConcurrency >= 8) {
        return 'high';
    } else {
        return 'medium';
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.BubbleSystemIntegration = BubbleSystemIntegration;
    window.detectOptimalBubbleProfile = detectOptimalProfile;
}