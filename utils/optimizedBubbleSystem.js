// High-Performance Optimized Bubble System
// Based on 2024 best practices for canvas particle systems
// Fixes all issues with the previous implementations

class OptimizedBubbleSystem {
    constructor(maxBubbles = 400) {
        this.maxBubbles = maxBubbles;
        this.bubbles = [];
        this.isInitialized = false;
        this.sprites = null;
        
        // Performance monitoring
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.avgFrameTime = 16.67; // Target 60fps
        
        // Batch rendering settings
        this.batchSize = 50;
        this.currentBatch = 0;
        
        // Quality settings based on device performance
        this.qualityLevel = 1.0;
        this.adaptiveQuality = true;
        
        // Initialize when sprites are ready
        this.initializeWhenReady();
    }
    
    initializeWhenReady() {
        // Wait for sprites to be loaded
        const checkSprites = () => {
            if (window.sprites && window.sprites.bubble1 && window.sprites.bubble2) {
                this.sprites = window.sprites;
                this.initialize();
            } else {
                // Retry in 100ms
                setTimeout(checkSprites, 100);
            }
        };
        checkSprites();
    }
    
    initialize() {
        console.log(`🫧 Initializing OptimizedBubbleSystem with ${this.maxBubbles} bubbles`);
        
        // Create bubble data using optimized structure
        for (let i = 0; i < this.maxBubbles; i++) {
            this.bubbles.push(this.createBubble());
        }
        
        this.isInitialized = true;
        console.log(`✅ OptimizedBubbleSystem initialized successfully`);
    }
    
    createBubble() {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        return {
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            speed: Math.random() * 0.7 + 0.3, // 0.3 to 1.0
            size: Math.random() * 15 + 8, // 8 to 23
            opacity: Math.random() * 0.3 + 0.5, // 0.5 to 0.8
            sprite: this.getRandomSprite(),
            driftX: (Math.random() - 0.5) * 0.1, // Horizontal drift
            animOffset: Math.random() * Math.PI * 2, // For animation variation
            depth: 0 // Will be set based on Y position
        };
    }
    
    getRandomSprite() {
        if (!this.sprites || !this.sprites.bubble1 || !this.sprites.bubble2) {
            return null;
        }
        return Math.random() < 0.5 ? this.sprites.bubble1 : this.sprites.bubble2;
    }
    
    update() {
        if (!this.isInitialized) return;
        
        const startTime = performance.now();
        
        // Update bubbles in batches to maintain smooth framerate
        const batchStart = this.currentBatch * this.batchSize;
        const batchEnd = Math.min(batchStart + this.batchSize, this.bubbles.length);
        
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        for (let i = batchStart; i < batchEnd; i++) {
            const bubble = this.bubbles[i];
            
            // Update position
            bubble.y -= bubble.speed;
            bubble.x += bubble.driftX;
            
            // Update depth for opacity calculations
            bubble.depth = bubble.y;
            
            // Reset bubble when it goes off screen
            if (bubble.y < -50) {
                bubble.y = WORLD_HEIGHT + 50;
                bubble.x = Math.random() * (window.WORLD_WIDTH || 12000);
            }
            
            // Wrap horizontal drift
            if (bubble.x < -50) {
                bubble.x = (window.WORLD_WIDTH || 12000) + 50;
            } else if (bubble.x > (window.WORLD_WIDTH || 12000) + 50) {
                bubble.x = -50;
            }
        }
        
        // Move to next batch
        this.currentBatch = (this.currentBatch + 1) % Math.ceil(this.bubbles.length / this.batchSize);
        
        // Performance monitoring
        const frameTime = performance.now() - startTime;
        this.updatePerformanceMetrics(frameTime);
    }
    
    render() {
        if (!this.isInitialized || !window.ctx || !window.camera) return;
        
        const ctx = window.ctx;
        const camera = window.camera;
        
        // Calculate visible area for culling
        const viewWidth = camera.viewWidth || 1200;
        const viewHeight = camera.viewHeight || 800;
        const margin = 200;
        
        const visibleLeft = camera.x - margin;
        const visibleRight = camera.x + viewWidth + margin;
        const visibleTop = camera.y - margin;
        const visibleBottom = camera.y + viewHeight + margin;
        
        ctx.save();
        
        let renderedCount = 0;
        const maxRender = Math.floor(this.bubbles.length * this.qualityLevel);
        
        // Render visible bubbles
        for (let i = 0; i < this.bubbles.length && renderedCount < maxRender; i++) {
            const bubble = this.bubbles[i];
            
            // Frustum culling
            if (bubble.x < visibleLeft || bubble.x > visibleRight ||
                bubble.y < visibleTop || bubble.y > visibleBottom) {
                continue;
            }
            
            // Skip if sprite not loaded
            if (!bubble.sprite) continue;
            
            // Calculate depth-based opacity
            const depthOpacity = this.calculateDepthOpacity(bubble.depth, bubble.opacity);
            if (depthOpacity < 0.05) continue; // Skip nearly invisible bubbles
            
            // Apply camera distance-based LOD
            const distanceFromCamera = Math.sqrt(
                Math.pow(bubble.x - (camera.x + viewWidth/2), 2) + 
                Math.pow(bubble.y - (camera.y + viewHeight/2), 2)
            );
            
            const maxDistance = Math.sqrt(viewWidth * viewWidth + viewHeight * viewHeight);
            const distanceFactor = 1 - Math.min(distanceFromCamera / maxDistance, 1);
            const finalOpacity = depthOpacity * (0.3 + distanceFactor * 0.7);
            
            if (finalOpacity < 0.05) continue;
            
            ctx.globalAlpha = finalOpacity;
            
            // Draw bubble
            const size = bubble.size;
            ctx.drawImage(
                bubble.sprite,
                bubble.x - size/2,
                bubble.y - size/2,
                size,
                size
            );
            
            renderedCount++;
        }
        
        ctx.restore();
        
        // Adaptive quality adjustment
        if (this.adaptiveQuality) {
            this.adjustQuality(renderedCount);
        }
    }
    
    calculateDepthOpacity(depth, baseOpacity) {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const normalizedDepth = Math.max(0, Math.min(1, depth / WORLD_HEIGHT));
        
        // Apply depth-based fading
        const depthFactor = 1 - (normalizedDepth * 0.4); // Fade to 60% at max depth
        return baseOpacity * depthFactor;
    }
    
    updatePerformanceMetrics(frameTime) {
        this.frameCount++;
        
        // Calculate rolling average
        this.avgFrameTime = this.avgFrameTime * 0.9 + frameTime * 0.1;
        
        // Adjust quality every 60 frames
        if (this.frameCount % 60 === 0 && this.adaptiveQuality) {
            this.adjustQualityBasedOnPerformance();
        }
    }
    
    adjustQualityBasedOnPerformance() {
        const targetFrameTime = 16.67; // 60fps
        
        if (this.avgFrameTime > targetFrameTime * 1.2) {
            // Performance issues, reduce quality
            this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.1);
        } else if (this.avgFrameTime < targetFrameTime * 0.8) {
            // Good performance, increase quality
            this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
        }
    }
    
    adjustQuality(renderedCount) {
        // Simple adaptive quality based on rendered count
        if (renderedCount > 300 && this.qualityLevel > 0.5) {
            this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.01);
        } else if (renderedCount < 150 && this.qualityLevel < 1.0) {
            this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.01);
        }
    }
    
    // Public API methods
    setMaxBubbles(count) {
        const newCount = Math.max(50, Math.min(1000, count));
        if (newCount !== this.maxBubbles) {
            this.maxBubbles = newCount;
            this.reinitialize();
        }
    }
    
    reinitialize() {
        this.bubbles = [];
        if (this.isInitialized) {
            this.initialize();
        }
    }
    
    getStats() {
        return {
            maxBubbles: this.maxBubbles,
            activeBubbles: this.bubbles.length,
            qualityLevel: this.qualityLevel,
            avgFrameTime: this.avgFrameTime.toFixed(2),
            isInitialized: this.isInitialized
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.OptimizedBubbleSystem = OptimizedBubbleSystem;
}