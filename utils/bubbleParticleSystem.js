// High-Performance Bubble Particle System
// Optimized for 400+ bubbles without performance impact
// Uses pre-rendering, batch operations, and efficient data structures

class BubbleParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 1200; // Increased from 400 to 1200
        this.targetParticles = 1200; // Target count for dynamic adjustment
        this.preRenderedSprites = new Map();
        this.batchSize = 100; // Increased batch size for better throughput
        this.currentBatch = 0;
        this.isInitialized = false;
        
        // Advanced performance optimizations
        this.lastUpdateTime = 0;
        this.updateThrottle = 16; // ~60fps
        this.visibilityDistance = 2000; // Only render bubbles within camera view + margin
        this.performanceMetrics = {
            frameTime: [],
            renderCount: [],
            maxSamples: 60 // Track last 60 frames
        };
        this.adaptiveQuality = true;
        this.qualityLevel = 1.0; // 1.0 = maximum quality, 0.5 = half particles
        this.lastPerformanceCheck = 0;
        this.performanceCheckInterval = 1000; // Check every second
        
        // Pre-calculated constants for better performance
        this.WORLD_WIDTH = 12000;
        this.WORLD_HEIGHT = 8000;
        this.GRAVITY = 0.5;
        this.DRIFT_STRENGTH = 0.1;
        
        // Optimized sprite configuration for high-count rendering
        this.spriteConfigs = [
            { size: 6, opacity: 0.3, tintStrength: 0.05 },  // Tiny bubbles
            { size: 8, opacity: 0.4, tintStrength: 0.1 },   // Small bubbles
            { size: 12, opacity: 0.5, tintStrength: 0.15 }, // Medium bubbles
            { size: 16, opacity: 0.6, tintStrength: 0.2 },  // Large bubbles
            { size: 20, opacity: 0.7, tintStrength: 0.25 }, // Extra large bubbles
            { size: 4, opacity: 0.25, tintStrength: 0.03 }  // Micro bubbles for volume
        ];
        
        // Advanced rendering settings
        this.lodEnabled = true; // Level of Detail system
        this.lodDistances = [500, 1000, 1500]; // LOD switch distances
        this.cullDistance = 2500; // Distance to completely cull particles
        
        // Wait for sprites to be loaded before initializing
        this.initializeWhenReady();
    }
    
    initializeWhenReady() {
        // Wait for sprites to be loaded
        const checkSprites = () => {
            if (window.sprites && window.sprites.bubble1 && window.sprites.bubble2) {
                this.initializeSystem();
                this.isInitialized = true;
                console.log('🫧 BubbleParticleSystem initialized successfully');
            } else {
                // Retry in 100ms
                setTimeout(checkSprites, 100);
            }
        };
        checkSprites();
    }
    
    initializeSystem() {
        // Pre-render sprite variants for maximum performance  
        this.preRenderSprites();
        
        // Initialize particle pool
        this.initializeParticles();
        
        // Setup efficient update batching
        this.setupBatchUpdates();
    }
    
    preRenderSprites() {
        // Silent sprite pre-rendering
        
        this.spriteConfigs.forEach((config, index) => {
            // Create offscreen canvas for each sprite variant
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { 
                alpha: true, 
                desynchronized: true 
            });
            
            canvas.width = config.size + 4; // Add padding for glow effects
            canvas.height = config.size + 4;
            
            // Get base bubble sprite - wait for sprites to be loaded
            let baseSprite = null;
            if (window.sprites && window.sprites.bubble1 && window.sprites.bubble2) {
                baseSprite = window.getRandomBubbleSprite(window.sprites);
            }
            
            // Skip if sprites not loaded yet
            if (!baseSprite) return;
            
            // Draw base sprite
            ctx.drawImage(baseSprite, 2, 2, config.size, config.size);
            
            // Apply depth tinting if needed
            if (config.tintStrength > 0) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = `rgba(100, 150, 255, ${config.tintStrength})`;
                ctx.fillRect(2, 2, config.size, config.size);
                ctx.globalCompositeOperation = 'source-over';
            }
            
            // Store pre-rendered sprite
            this.preRenderedSprites.set(`bubble_${index}`, {
                canvas: canvas,
                size: config.size,
                opacity: config.opacity,
                centerOffset: (config.size + 4) / 2
            });
        });
        
        // Silent sprite pre-rendering
    }
    
    initializeParticles() {
        // Initialize particle pool silently
        
        // Use efficient Float32Arrays for better memory performance
        this.particleData = {
            x: new Float32Array(this.maxParticles),
            y: new Float32Array(this.maxParticles),
            speedX: new Float32Array(this.maxParticles),
            speedY: new Float32Array(this.maxParticles),
            animOffset: new Float32Array(this.maxParticles),
            spriteIndex: new Uint8Array(this.maxParticles),
            depth: new Float32Array(this.maxParticles),
            active: new Uint8Array(this.maxParticles)
        };
        
        // Initialize each particle
        for (let i = 0; i < this.maxParticles; i++) {
            this.resetParticle(i);
        }
        
        // Silent particle initialization
    }
    
    resetParticle(index) {
        this.particleData.x[index] = Math.random() * this.WORLD_WIDTH;
        this.particleData.y[index] = Math.random() * this.WORLD_HEIGHT;
        this.particleData.speedY[index] = -(Math.random() * 0.7 + 0.3); // Upward movement
        this.particleData.speedX[index] = (Math.random() - 0.5) * 0.1; // Slight horizontal drift
        this.particleData.animOffset[index] = Math.random() * Math.PI * 2;
        this.particleData.spriteIndex[index] = Math.floor(Math.random() * this.spriteConfigs.length);
        this.particleData.depth[index] = this.particleData.y[index];
        this.particleData.active[index] = 1;
    }
    
    setupBatchUpdates() {
        // Setup efficient batched updates to avoid frame drops
        this.updateBatches = [];
        const batchCount = Math.ceil(this.maxParticles / this.batchSize);
        
        for (let i = 0; i < batchCount; i++) {
            const start = i * this.batchSize;
            const end = Math.min(start + this.batchSize, this.maxParticles);
            this.updateBatches.push({ start, end });
        }
        
        // Silent batch setup
    }
    
    update() {
        const now = performance.now();
        
        // Record frame time for performance monitoring
        const frameTime = now - this.lastUpdateTime;
        this.recordPerformanceMetric('frameTime', frameTime);
        
        // Throttle updates for consistent performance
        if (frameTime < this.updateThrottle) {
            return;
        }
        
        this.lastUpdateTime = now;
        
        // Adaptive batch processing based on performance
        const batchesToProcess = this.calculateOptimalBatchCount(frameTime);
        
        for (let i = 0; i < batchesToProcess; i++) {
            const batch = this.updateBatches[this.currentBatch];
            this.updateBatch(batch.start, batch.end, now);
            this.currentBatch = (this.currentBatch + 1) % this.updateBatches.length;
        }
        
        // Check and adjust performance periodically
        if (now - this.lastPerformanceCheck > this.performanceCheckInterval) {
            this.adjustPerformanceSettings();
            this.lastPerformanceCheck = now;
        }
    }
    
    updateBatch(start, end, currentTime) {
        const sinTime = Math.sin(currentTime * 0.001);
        const cosTime = Math.cos(currentTime * 0.0007);
        
        for (let i = start; i < end; i++) {
            if (!this.particleData.active[i]) continue;
            
            // Update position with efficient calculations
            this.particleData.y[i] += this.particleData.speedY[i];
            
            // Add organic horizontal drift using pre-calculated sin/cos
            const driftOffset = this.particleData.animOffset[i];
            this.particleData.x[i] += this.particleData.speedX[i] + 
                (sinTime + driftOffset) * this.DRIFT_STRENGTH;
            
            // Wrap horizontal boundaries
            if (this.particleData.x[i] < 0) {
                this.particleData.x[i] = this.WORLD_WIDTH;
            } else if (this.particleData.x[i] > this.WORLD_WIDTH) {
                this.particleData.x[i] = 0;
            }
            
            // Reset particle when it reaches the top
            if (this.particleData.y[i] < -50) {
                this.resetParticle(i);
                this.particleData.y[i] = this.WORLD_HEIGHT + 50;
            }
            
            // Update depth for rendering optimization
            this.particleData.depth[i] = this.particleData.y[i];
        }
    }
    
    render() {
        if (!window.ctx || !window.camera || !this.isInitialized) return;
        
        // Calculate visible area for culling
        const cameraX = window.camera.x;
        const cameraY = window.camera.y;
        const viewWidth = window.camera.viewWidth || 1200;
        const viewHeight = window.camera.viewHeight || 800;
        const margin = 200; // Render margin outside visible area
        
        const visibleLeft = cameraX - margin;
        const visibleRight = cameraX + viewWidth + margin;
        const visibleTop = cameraY - margin;
        const visibleBottom = cameraY + viewHeight + margin;
        
        // Batch render for maximum performance
        this.batchRender(visibleLeft, visibleRight, visibleTop, visibleBottom);
    }
    
    batchRender(visibleLeft, visibleRight, visibleTop, visibleBottom) {
        const ctx = window.ctx;
        const camera = window.camera;
        let renderedCount = 0;
        let culledCount = 0;
        let lodReducedCount = 0;
        
        const startTime = performance.now();
        
        ctx.save();
        
        // Calculate effective particle count based on quality level
        const effectiveParticleCount = Math.floor(this.maxParticles * this.qualityLevel);
        
        // Advanced spatial partitioning for ultra-fast culling
        const visibleParticles = this.spatialCulling(visibleLeft, visibleRight, visibleTop, visibleBottom, effectiveParticleCount);
        
        // Group particles by LOD level and sprite type for ultra-efficient batch rendering
        const lodGroups = new Map();
        
        visibleParticles.forEach(particleData => {
            const distance = this.calculateCameraDistance(particleData.x, particleData.y, camera);
            const lodLevel = this.calculateLOD(distance);
            
            // Skip particles that are too distant (aggressive culling for performance)
            if (lodLevel === -1) {
                culledCount++;
                return;
            }
            
            // Apply LOD-based reduction
            if (lodLevel > 0 && Math.random() > (1 - lodLevel * 0.3)) {
                lodReducedCount++;
                return;
            }
            
            const groupKey = `${particleData.spriteIndex}_${lodLevel}`;
            if (!lodGroups.has(groupKey)) {
                lodGroups.set(groupKey, []);
            }
            
            lodGroups.get(groupKey).push({
                x: particleData.x,
                y: particleData.y,
                depth: particleData.depth,
                spriteIndex: particleData.spriteIndex,
                lodLevel: lodLevel
            });
        });
        
        // Ultra-fast batch rendering with LOD optimization
        lodGroups.forEach((particles, groupKey) => {
            const [spriteIndex, lodLevel] = groupKey.split('_').map(Number);
            const spriteData = this.preRenderedSprites.get(`bubble_${spriteIndex}`);
            if (!spriteData) return;
            
            // Apply LOD-based optimizations
            const renderScale = lodLevel === 0 ? 1.0 : (lodLevel === 1 ? 0.8 : 0.6);
            const opacityScale = lodLevel === 0 ? 1.0 : (lodLevel === 1 ? 0.7 : 0.5);
            
            // Batch render all particles of this type
            particles.forEach(particle => {
                const depthOpacity = this.calculateDepthOpacity(particle.depth, spriteData.opacity * opacityScale);
                
                if (depthOpacity < 0.05) return; // Skip nearly invisible particles
                
                ctx.globalAlpha = depthOpacity;
                
                // Scale sprite based on LOD
                const size = spriteData.size * renderScale;
                const centerOffset = size / 2;
                
                if (renderScale === 1.0) {
                    // Full quality rendering
                    ctx.drawImage(
                        spriteData.canvas,
                        particle.x - spriteData.centerOffset,
                        particle.y - spriteData.centerOffset
                    );
                } else {
                    // Scaled LOD rendering
                    ctx.drawImage(
                        spriteData.canvas,
                        particle.x - centerOffset,
                        particle.y - centerOffset,
                        size + 4, // Add padding
                        size + 4
                    );
                }
                
                renderedCount++;
            });
        });
        
        ctx.restore();
        
        const renderTime = performance.now() - startTime;
        
        // Record performance metrics
        this.recordPerformanceMetric('renderCount', renderedCount);
        this.recordPerformanceMetric('renderTime', renderTime);
        
        // Minimal performance logging (only when performance issues detected)
        if (renderTime > 5 && window.gameState?.frameCount % 600 === 0) {
            console.log(`⚠️ Slow bubble rendering: ${renderTime.toFixed(1)}ms for ${renderedCount} bubbles`);
        }
    }
    
    calculateDepthOpacity(depth, baseOpacity) {
        // Fast depth opacity calculation without expensive function calls
        const normalizedDepth = Math.max(0, Math.min(1, depth / this.WORLD_HEIGHT));
        const depthFactor = 1 - (normalizedDepth * 0.4); // Fade to 60% at max depth
        return baseOpacity * depthFactor * 0.7; // Overall bubble opacity at 70%
    }
    
    // Advanced spatial culling for maximum performance
    spatialCulling(visibleLeft, visibleRight, visibleTop, visibleBottom, effectiveCount) {
        const visibleParticles = [];
        const margin = 100; // Additional margin for smooth transitions
        
        // Expand bounds slightly for smoother culling
        const left = visibleLeft - margin;
        const right = visibleRight + margin;
        const top = visibleTop - margin;
        const bottom = visibleBottom + margin;
        
        for (let i = 0; i < effectiveCount; i++) {
            if (!this.particleData.active[i]) continue;
            
            const x = this.particleData.x[i];
            const y = this.particleData.y[i];
            
            // Fast AABB culling
            if (x >= left && x <= right && y >= top && y <= bottom) {
                visibleParticles.push({
                    x: x,
                    y: y,
                    depth: this.particleData.depth[i],
                    spriteIndex: this.particleData.spriteIndex[i]
                });
            }
        }
        
        return visibleParticles;
    }
    
    // Calculate distance from camera for LOD determination
    calculateCameraDistance(x, y, camera) {
        if (!camera) return 0;
        
        const dx = x - (camera.x + (camera.viewWidth || 800) / 2);
        const dy = y - (camera.y + (camera.viewHeight || 600) / 2);
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Calculate Level of Detail based on distance
    calculateLOD(distance) {
        if (!this.lodEnabled) return 0;
        
        if (distance > this.cullDistance) return -1; // Cull completely
        if (distance < this.lodDistances[0]) return 0; // High detail
        if (distance < this.lodDistances[1]) return 1; // Medium detail
        if (distance < this.lodDistances[2]) return 2; // Low detail
        
        return -1; // Too far, cull
    }
    
    // Calculate optimal batch count based on current performance
    calculateOptimalBatchCount(frameTime) {
        // If we're running fast, process more batches per frame
        if (frameTime < 10) return 3; // Very fast, process 3 batches
        if (frameTime < 14) return 2; // Good performance, process 2 batches
        return 1; // Slow performance, process only 1 batch
    }
    
    // Record performance metrics for adaptive adjustment
    recordPerformanceMetric(metric, value) {
        if (!this.performanceMetrics[metric]) {
            this.performanceMetrics[metric] = [];
        }
        
        this.performanceMetrics[metric].push(value);
        
        // Keep only recent samples
        if (this.performanceMetrics[metric].length > this.performanceMetrics.maxSamples) {
            this.performanceMetrics[metric].shift();
        }
    }
    
    // Start performance monitoring system (silent)
    startPerformanceMonitoring() {
        // Initialize performance tracking silently
        this.performanceMetrics.frameTime = [];
        this.performanceMetrics.renderCount = [];
        this.performanceMetrics.renderTime = [];
        
        // Silent adaptive quality setup
    }
    
    // Adjust performance settings based on current metrics
    adjustPerformanceSettings() {
        if (!this.adaptiveQuality || this.performanceMetrics.frameTime.length < 30) return;
        
        // Calculate average frame time over recent samples
        const recentFrameTimes = this.performanceMetrics.frameTime.slice(-30);
        const avgFrameTime = recentFrameTimes.reduce((a, b) => a + b, 0) / recentFrameTimes.length;
        const targetFrameTime = 16.67; // 60fps = 16.67ms per frame
        
        // Calculate average render count
        const recentRenderCounts = this.performanceMetrics.renderCount.slice(-30);
        const avgRenderCount = recentRenderCounts.reduce((a, b) => a + b, 0) / recentRenderCounts.length;
        
        // Adjust quality based on performance (silent)
        if (avgFrameTime > targetFrameTime + 3) {
            // Performance is poor, reduce quality
            this.qualityLevel = Math.max(0.4, this.qualityLevel - 0.1);
        } else if (avgFrameTime < targetFrameTime - 2 && this.qualityLevel < 1.0) {
            // Performance is good, increase quality
            this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
        }
        
        // Adjust batch size based on render performance (silent)
        if (avgRenderCount > 800 && this.batchSize < 150) {
            this.batchSize = Math.min(150, this.batchSize + 10);
            this.setupBatchUpdates(); // Recreate batches with new size
        } else if (avgRenderCount < 300 && this.batchSize > 50) {
            this.batchSize = Math.max(50, this.batchSize - 10);
            this.setupBatchUpdates(); // Recreate batches with new size
        }
    }
    
    // Method to dynamically adjust particle count based on performance (now supports up to 2000)
    adjustParticleCount(targetFPS = 60) {
        if (!this.performanceMetrics.frameTime.length) return;
        
        // Calculate effective FPS from our frame time measurements
        const recentFrameTimes = this.performanceMetrics.frameTime.slice(-60);
        const avgFrameTime = recentFrameTimes.reduce((a, b) => a + b, 0) / recentFrameTimes.length;
        const effectiveFPS = 1000 / avgFrameTime;
        
        const currentEffectiveCount = Math.floor(this.maxParticles * this.qualityLevel);
        
        if (effectiveFPS < targetFPS - 10 && this.maxParticles > 400) {
            // Significant performance issues, reduce particle count
            this.maxParticles = Math.max(400, this.maxParticles - 100);
            this.reinitializeSystem();
        } else if (effectiveFPS < targetFPS - 5 && this.maxParticles > 600) {
            // Minor performance issues, small reduction
            this.maxParticles = Math.max(600, this.maxParticles - 50);
            this.reinitializeSystem();
        } else if (effectiveFPS > targetFPS + 10 && this.maxParticles < 2000) {
            // Excellent performance, increase particle count significantly
            this.maxParticles = Math.min(2000, this.maxParticles + 100);
            this.reinitializeSystem();
        } else if (effectiveFPS > targetFPS + 5 && this.maxParticles < 1800) {
            // Good performance, moderate increase
            this.maxParticles = Math.min(1800, this.maxParticles + 50);
            this.reinitializeSystem();
        }
        
        // Silent performance adjustment - no logging to avoid performance impact
    }
    
    // Method to manually set particle count (now supports up to 2000)
    setParticleCount(count) {
        const newCount = Math.max(100, Math.min(2000, count));
        if (newCount !== this.maxParticles) {
            this.maxParticles = newCount;
            this.reinitializeSystem();
        }
    }
    
    // Method to reinitialize the system with new particle count
    reinitializeSystem() {
        // Preserve current render settings
        const currentTime = this.lastUpdateTime;
        
        // Clear existing data
        this.particleData = null;
        this.updateBatches = [];
        
        // Reinitialize with new count
        this.initializeParticles();
        this.setupBatchUpdates();
        
        // Restore timing
        this.lastUpdateTime = currentTime;
    }
    
    // Get current active particle count
    getParticleCount() {
        return this.maxParticles;
    }
    
    // Get performance statistics
    getStats() {
        return {
            maxParticles: this.maxParticles,
            preRenderedSprites: this.preRenderedSprites.size,
            batchSize: this.batchSize,
            currentBatch: this.currentBatch,
            totalBatches: this.updateBatches.length,
            memoryUsage: this.getMemoryUsage()
        };
    }
    
    getMemoryUsage() {
        // Estimate memory usage of the particle system
        const arraySize = this.maxParticles * 4; // 4 bytes per Float32
        const totalArrays = 6; // x, y, speedX, speedY, animOffset, depth
        const bytesArrays = 2; // spriteIndex, active (1 byte each)
        
        return {
            floatArrays: (arraySize * totalArrays) / 1024, // KB
            byteArrays: (this.maxParticles * bytesArrays) / 1024, // KB
            sprites: this.preRenderedSprites.size * 50, // Estimate KB per sprite
            total: ((arraySize * totalArrays) + (this.maxParticles * bytesArrays) + (this.preRenderedSprites.size * 50 * 1024)) / 1024 // KB
        };
    }
    
    // Cleanup method
    destroy() {
        // Clear pre-rendered sprites
        this.preRenderedSprites.clear();
        
        // Clear particle data arrays
        Object.keys(this.particleData).forEach(key => {
            this.particleData[key] = null;
        });
        
        // Silent cleanup
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.BubbleParticleSystem = BubbleParticleSystem;
}