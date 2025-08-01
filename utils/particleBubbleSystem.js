// High-performance particle system for 400+ bubbles
// Uses typed arrays and batch rendering for optimal performance

class ParticleBubbleSystem {
    constructor(particleCount = 400) {
        this.particleCount = particleCount;
        
        // Use typed arrays for maximum performance
        this.positions = new Float32Array(particleCount * 2); // x, y
        this.velocities = new Float32Array(particleCount * 2); // vx, vy
        this.properties = new Float32Array(particleCount * 4); // size, opacity, animOffset, speed
        this.sprites = new Uint8Array(particleCount); // sprite type indices
        
        // Pre-rendered sprite canvases for batch drawing
        this.spriteCanvases = [];
        this.spriteTypes = ['bubble1', 'bubble2'];
        
        // Performance optimization flags
        this.enableLOD = true; // Level of detail
        this.enableCulling = true; // Viewport culling
        this.batchSize = 50; // Process batches for smooth frame rate
        this.currentBatch = 0;
        
        // World bounds
        this.WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        this.WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        this.initializeParticles();
        this.createSpriteCanvases();
    }
    
    initializeParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            const index2 = i * 2;
            const index4 = i * 4;
            
            // Positions
            this.positions[index2] = Math.random() * this.WORLD_WIDTH;
            this.positions[index2 + 1] = Math.random() * this.WORLD_HEIGHT;
            
            // Velocities (all bubbles move upward with slight horizontal drift)
            this.velocities[index2] = (Math.random() - 0.5) * 0.2; // horizontal drift
            this.velocities[index2 + 1] = -(Math.random() * 0.7 + 0.2); // upward speed
            
            // Properties: size, opacity, animOffset, speed
            this.properties[index4] = Math.random() * 15 + 8; // size
            this.properties[index4 + 1] = Math.random() * 0.3 + 0.5; // opacity
            this.properties[index4 + 2] = Math.random() * Math.PI * 2; // animOffset
            this.properties[index4 + 3] = Math.random() * 0.7 + 0.2; // speed
            
            // Sprite type
            this.sprites[i] = Math.random() < 0.5 ? 0 : 1;
        }
    }
    
    createSpriteCanvases() {
        // Pre-render different sized bubbles for performance
        const sizes = [8, 12, 16, 20]; // Different LOD sizes
        
        for (let spriteIndex = 0; spriteIndex < this.spriteTypes.length; spriteIndex++) {
            const spriteType = this.spriteTypes[spriteIndex];
            const sprite = window.sprites[spriteType];
            
            if (!sprite) continue;
            
            this.spriteCanvases[spriteIndex] = [];
            
            for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
                const size = sizes[sizeIndex];
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = size;
                canvas.height = size;
                
                // Pre-render the sprite at this size
                ctx.drawImage(sprite, 0, 0, size, size);
                
                this.spriteCanvases[spriteIndex][sizeIndex] = canvas;
            }
        }
    }
    
    update() {
        // Batch processing for smooth frame rate
        const startIndex = this.currentBatch * this.batchSize;
        const endIndex = Math.min(startIndex + this.batchSize, this.particleCount);
        
        const currentTime = Date.now() * 0.001;
        
        for (let i = startIndex; i < endIndex; i++) {
            const index2 = i * 2;
            const index4 = i * 4;
            
            // Get current values
            let x = this.positions[index2];
            let y = this.positions[index2 + 1];
            const vx = this.velocities[index2];
            const vy = this.velocities[index2 + 1];
            const animOffset = this.properties[index4 + 2];
            const speed = this.properties[index4 + 3];
            
            // Update position
            x += vx + Math.sin(currentTime + animOffset) * 0.15;
            y += vy * speed;
            
            // Wrap around boundaries
            if (x < 0) x = this.WORLD_WIDTH;
            if (x > this.WORLD_WIDTH) x = 0;
            
            if (y < -20) {
                y = this.WORLD_HEIGHT + 20;
                // Reset to random x position when wrapping
                x = Math.random() * this.WORLD_WIDTH;
            }
            
            // Store updated positions
            this.positions[index2] = x;
            this.positions[index2 + 1] = y;
        }
        
        // Advance to next batch
        this.currentBatch = (this.currentBatch + 1) % Math.ceil(this.particleCount / this.batchSize);
    }
    
    draw() {
        if (!window.camera || !window.ctx) return;
        
        const camera = window.camera;
        const ctx = window.ctx;
        
        // Calculate viewport bounds for culling
        const viewLeft = camera.x - camera.viewWidth / 2;
        const viewRight = camera.x + camera.viewWidth / 2;
        const viewTop = camera.y - camera.viewHeight / 2;
        const viewBottom = camera.y + camera.viewHeight / 2;
        
        // Extend bounds slightly to avoid pop-in
        const cullMargin = 100;
        const cullLeft = viewLeft - cullMargin;
        const cullRight = viewRight + cullMargin;
        const cullTop = viewTop - cullMargin;
        const cullBottom = viewBottom + cullMargin;
        
        ctx.save();
        
        let drawnCount = 0;
        
        for (let i = 0; i < this.particleCount; i++) {
            const index2 = i * 2;
            const index4 = i * 4;
            
            const x = this.positions[index2];
            const y = this.positions[index2 + 1];
            
            // Viewport culling for performance
            if (this.enableCulling) {
                if (x < cullLeft || x > cullRight || y < cullTop || y > cullBottom) {
                    continue;
                }
            }
            
            const size = this.properties[index4];
            const opacity = this.properties[index4 + 1];
            const spriteIndex = this.sprites[i];
            
            // Level of detail based on distance from camera
            let lodLevel = 0;
            if (this.enableLOD) {
                const distanceFromCamera = Math.sqrt(
                    Math.pow(x - camera.x, 2) + Math.pow(y - camera.y, 2)
                );
                
                if (distanceFromCamera > 2000) lodLevel = 3;
                else if (distanceFromCamera > 1500) lodLevel = 2;
                else if (distanceFromCamera > 1000) lodLevel = 1;
                else lodLevel = 0;
            }
            
            // Get pre-rendered sprite canvas
            const spriteCanvas = this.spriteCanvases[spriteIndex] && 
                                this.spriteCanvases[spriteIndex][lodLevel];
            
            if (!spriteCanvas) continue;
            
            // Apply depth effects
            const finalOpacity = window.Utils ? 
                window.Utils.getDepthOpacity(y, opacity * 0.6) : opacity * 0.6;
            
            if (finalOpacity <= 0.01) continue; // Skip nearly invisible bubbles
            
            // Fast rendering using pre-rendered canvas
            ctx.globalAlpha = finalOpacity;
            
            const drawSize = lodLevel === 0 ? size : spriteCanvas.width;
            ctx.drawImage(
                spriteCanvas,
                x - drawSize / 2,
                y - drawSize / 2,
                drawSize,
                drawSize
            );
            
            drawnCount++;
        }
        
        ctx.restore();
        
        // Performance monitoring
        if (window.gameState && window.gameState.debug) {
            console.log(`Particle System: ${drawnCount}/${this.particleCount} bubbles drawn`);
        }
    }
    
    // Add/remove particles dynamically
    setParticleCount(newCount) {
        if (newCount === this.particleCount) return;
        
        this.particleCount = newCount;
        
        // Resize typed arrays
        const newPositions = new Float32Array(newCount * 2);
        const newVelocities = new Float32Array(newCount * 2);
        const newProperties = new Float32Array(newCount * 4);
        const newSprites = new Uint8Array(newCount);
        
        // Copy existing data
        const copyLength = Math.min(this.positions.length, newPositions.length);
        newPositions.set(this.positions.subarray(0, copyLength));
        newVelocities.set(this.velocities.subarray(0, Math.min(this.velocities.length, newVelocities.length)));
        newProperties.set(this.properties.subarray(0, Math.min(this.properties.length, newProperties.length)));
        newSprites.set(this.sprites.subarray(0, Math.min(this.sprites.length, newSprites.length)));
        
        // Initialize new particles if expanding
        if (newCount > this.positions.length / 2) {
            for (let i = this.positions.length / 2; i < newCount; i++) {
                const index2 = i * 2;
                const index4 = i * 4;
                
                newPositions[index2] = Math.random() * this.WORLD_WIDTH;
                newPositions[index2 + 1] = Math.random() * this.WORLD_HEIGHT;
                newVelocities[index2] = (Math.random() - 0.5) * 0.2;
                newVelocities[index2 + 1] = -(Math.random() * 0.7 + 0.2);
                newProperties[index4] = Math.random() * 15 + 8;
                newProperties[index4 + 1] = Math.random() * 0.3 + 0.5;
                newProperties[index4 + 2] = Math.random() * Math.PI * 2;
                newProperties[index4 + 3] = Math.random() * 0.7 + 0.2;
                newSprites[i] = Math.random() < 0.5 ? 0 : 1;
            }
        }
        
        this.positions = newPositions;
        this.velocities = newVelocities;
        this.properties = newProperties;
        this.sprites = newSprites;
    }
    
    // Get performance stats
    getStats() {
        return {
            particleCount: this.particleCount,
            memoryUsage: {
                positions: this.positions.byteLength,
                velocities: this.velocities.byteLength,
                properties: this.properties.byteLength,
                sprites: this.sprites.byteLength,
                total: this.positions.byteLength + this.velocities.byteLength + 
                       this.properties.byteLength + this.sprites.byteLength
            },
            batchSize: this.batchSize,
            enableLOD: this.enableLOD,
            enableCulling: this.enableCulling
        };
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.ParticleBubbleSystem = ParticleBubbleSystem;
}