class UIRenderingSystem {
    constructor() {
        this.config = {
            // Spawn indicator sizes
            SPAWN_INDICATOR_SIZE: 144, // 3x larger than original 48
            
            // UI mode indicator sizes (3x larger except krill and tuna)
            FOOD_SPRITE_SIZE: 60,      // 3x 20
            POOP_SPRITE_SIZE: 60,      // 3x 20
            FERTILIZED_EGG_SIZE: 60,   // 3x 20
            KRILL_SPRITE_SIZE: 40,     // Keep original size
            FRY_SPRITE_SIZE: 90,       // 3x 30
            TUNA_SPRITE_SIZE: 35,      // Keep original size
            SQUID_SPRITE_SIZE: 135,    // 3x 45
            
            // UI positioning
            UI_START_X: 10,
            UI_START_Y: 52,
            TEXT_OFFSET_X: 35,
            TEXT_OFFSET_Y: 70,
            
            // Colors for different spawn modes
            COLORS: {
                food: 'rgba(0, 255, 0, 0.8)',
                poop: 'rgba(139, 69, 19, 0.8)',
                fertilizedEggs: 'rgba(255, 182, 193, 0.8)',
                krill: 'rgba(255, 150, 100, 0.8)',
                fry: 'rgba(128, 128, 128, 0.8)',
                tuna: 'rgba(255, 100, 100, 0.8)',
                squid: 'rgba(150, 50, 200, 0.8)',
                default: 'rgba(255, 255, 255, 0.6)'
            },
            
            // Stroke colors for spawn indicators
            STROKE_COLORS: {
                food: 'rgba(255, 255, 255, 0.5)',
                poop: 'rgba(139, 69, 19, 0.7)',
                fertilizedEggs: 'rgba(255, 182, 193, 0.7)',
                krill: 'rgba(255, 150, 100, 0.5)',
                fry: 'rgba(100, 200, 255, 0.7)',
                tuna: 'rgba(255, 100, 100, 0.7)',
                squid: 'rgba(150, 50, 200, 0.8)'
            }
        };
    }

    /**
     * Draw spawn indicator at mouse position
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} mouseWorldPos - Mouse world position
     * @param {string} spawnMode - Current spawn mode
     * @param {Object} sprites - Sprite collection
     */
    drawSpawnIndicator(ctx, mouseWorldPos, spawnMode, sprites) {
        if (spawnMode === 'off' || !window.Utils?.inRenderDistance(mouseWorldPos)) {
            return;
        }

        const indicatorOpacity = window.Utils.getDepthOpacity(mouseWorldPos.y, 0.7);
        const tintStrength = window.Utils.getDepthTint(mouseWorldPos.y);
        
        ctx.save();
        
        // Get appropriate sprite for spawn mode
        const spriteToUse = this.getSpawnModeSprite(spawnMode, sprites);
        if (!spriteToUse) {
            ctx.restore();
            return;
        }
        
        const iconSize = this.config.SPAWN_INDICATOR_SIZE;
        const halfSize = iconSize / 2;
        
        // Draw sprite with tinting if needed
        this.drawTintedSprite(ctx, spriteToUse, mouseWorldPos.x - halfSize, mouseWorldPos.y - halfSize, 
                             iconSize, iconSize, indicatorOpacity, tintStrength);
        
        // Draw stroke circle
        this.drawSpawnIndicatorStroke(ctx, mouseWorldPos, spawnMode, indicatorOpacity);
        
        ctx.restore();
    }

    /**
     * Draw UI mode indicators
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} spawnMode - Current spawn mode
     * @param {Object} sprites - Sprite collection
     */
    drawUIModeIndicators(ctx, spawnMode, sprites) {
        if (!spawnMode || spawnMode === 'off') {
            this.drawDefaultModeText(ctx);
            return;
        }

        const color = this.config.COLORS[spawnMode] || this.config.COLORS.default;
        ctx.fillStyle = color;
        ctx.font = '16px Arial';

        switch (spawnMode) {
            case 'food':
                this.drawFoodMode(ctx, sprites);
                break;
            case 'poop':
                this.drawPoopMode(ctx, sprites);
                break;
            case 'fertilizedEggs':
                this.drawFertilizedEggMode(ctx, sprites);
                break;
            case 'krill':
                this.drawKrillMode(ctx, sprites);
                break;
            case 'fry':
                this.drawFryMode(ctx, sprites);
                break;
            case 'tuna':
                this.drawTunaMode(ctx, sprites);
                break;
            case 'squid':
                this.drawSquidMode(ctx, sprites);
                break;
        }
    }

    /**
     * Get sprite for spawn mode
     * @param {string} spawnMode - Spawn mode
     * @param {Object} sprites - Sprite collection
     * @returns {Image} Sprite image
     */
    getSpawnModeSprite(spawnMode, sprites) {
        const spriteMap = {
            food: sprites.fishFood,
            poop: sprites.poop,
            fertilizedEggs: sprites.fertilizedEgg,
            krill: sprites.krillSpawnIcon,
            fry: sprites.smallFry2,
            tuna: sprites.tuna,
            squid: sprites.giantSquid1
        };
        return spriteMap[spawnMode];
    }

    /**
     * Draw sprite with tinting
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Image} sprite - Sprite image
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} opacity - Opacity
     * @param {number} tintStrength - Tint strength
     */
    drawTintedSprite(ctx, sprite, x, y, width, height, opacity, tintStrength) {
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = width;
            tempCanvas.height = height;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(sprite, 0, 0, width, height);
            
            // Apply tint using source-atop (only affects non-transparent pixels)
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, width, height);
            
            // Draw the tinted sprite to main canvas
            ctx.globalAlpha = opacity;
            ctx.drawImage(tempCanvas, x, y);
        } else {
            // No tint needed, draw normally
            ctx.globalAlpha = opacity;
            ctx.drawImage(sprite, x, y, width, height);
        }
    }

    /**
     * Draw spawn indicator stroke
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} mouseWorldPos - Mouse world position
     * @param {string} spawnMode - Spawn mode
     * @param {number} opacity - Opacity
     */
    drawSpawnIndicatorStroke(ctx, mouseWorldPos, spawnMode, opacity) {
        ctx.globalAlpha = opacity;
        const strokeColor = this.config.STROKE_COLORS[spawnMode] || this.config.STROKE_COLORS.food;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const circleRadius = 30;
        ctx.arc(mouseWorldPos.x, mouseWorldPos.y, circleRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Draw food mode UI
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawFoodMode(ctx, sprites) {
        const size = this.config.FOOD_SPRITE_SIZE;
        const smallSize = size * 0.9; // Slightly smaller for clump effect
        
        // Draw 3 fish food sprites in a clump arrangement
        ctx.drawImage(sprites.fishFood, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        ctx.drawImage(sprites.fishFood, this.config.UI_START_X - 2, this.config.UI_START_Y + 5, smallSize, smallSize);
        ctx.drawImage(sprites.fishFood, this.config.UI_START_X + 2, this.config.UI_START_Y + 3, smallSize, smallSize);
        
        ctx.fillText('FOOD MODE - Click to spawn', this.config.TEXT_OFFSET_X, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw poop mode UI
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawPoopMode(ctx, sprites) {
        const size = this.config.POOP_SPRITE_SIZE;
        const smallSize = size * 0.9; // Slightly smaller for clump effect
        
        // Draw 3 poop sprites in a clump arrangement
        ctx.drawImage(sprites.poop, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        ctx.drawImage(sprites.poop, this.config.UI_START_X - 2, this.config.UI_START_Y + 5, smallSize, smallSize);
        ctx.drawImage(sprites.poop, this.config.UI_START_X + 2, this.config.UI_START_Y + 3, smallSize, smallSize);
        
        ctx.fillText('POOP MODE - Click to spawn', this.config.TEXT_OFFSET_X, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw fertilized egg mode UI
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawFertilizedEggMode(ctx, sprites) {
        const size = this.config.FERTILIZED_EGG_SIZE;
        ctx.drawImage(sprites.fertilizedEgg, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        ctx.fillText('FERTILIZED EGGS MODE - Click to spawn (1-3)', this.config.TEXT_OFFSET_X, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw krill mode UI (keep original size)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawKrillMode(ctx, sprites) {
        const size = this.config.KRILL_SPRITE_SIZE;
        ctx.drawImage(sprites.krillSpawnIcon, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        ctx.fillText('KRILL MODE - Click to spawn', this.config.TEXT_OFFSET_X + 15, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw fry mode UI
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawFryMode(ctx, sprites) {
        const size = this.config.FRY_SPRITE_SIZE;
        ctx.drawImage(sprites.smallFry2, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        ctx.fillText('FRY MODE - Click to spawn (1-5 random)', this.config.TEXT_OFFSET_X + 15, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw tuna mode UI (keep original size)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawTunaMode(ctx, sprites) {
        const size = this.config.TUNA_SPRITE_SIZE;
        ctx.drawImage(sprites.tuna, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        ctx.fillText('TUNA MODE - Click to spawn (1-3 random)', this.config.TEXT_OFFSET_X + 15, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw squid mode UI
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawSquidMode(ctx, sprites) {
        const size = this.config.SQUID_SPRITE_SIZE;
        ctx.drawImage(sprites.giantSquid1, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        ctx.fillText('SQUID MODE - Click to spawn giant squid', this.config.TEXT_OFFSET_X + 25, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw default mode text
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawDefaultModeText(ctx) {
        ctx.fillStyle = this.config.COLORS.default;
        ctx.font = '16px Arial';
        ctx.fillText('Press F to cycle: Food → Poop → Fertilized Eggs → Krill → Fry → Tuna → Squid → Off', 
                    this.config.UI_START_X, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration object
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

// Make globally accessible
window.UIRenderingSystem = UIRenderingSystem;

// Create global instance
const uiRenderingSystem = new UIRenderingSystem();

// Export instance for global access
if (typeof window !== 'undefined') {
    window.uiRenderingSystem = uiRenderingSystem;
} 