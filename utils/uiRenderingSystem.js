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
                truefry1: 'rgba(100, 150, 255, 0.8)',
                truefry2: 'rgba(150, 200, 255, 0.8)',
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
                truefry1: 'rgba(100, 150, 255, 0.7)',
                truefry2: 'rgba(150, 200, 255, 0.7)',
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
        
        // Draw clumped spawn indicators based on spawn mode
        if (spawnMode === 'food') {
            this.drawClumpedSpawnIndicator(ctx, mouseWorldPos, spriteToUse, 3, 60, 54, indicatorOpacity, tintStrength);
        } else if (spawnMode === 'poop') {
            this.drawClumpedSpawnIndicator(ctx, mouseWorldPos, spriteToUse, 3, 60, 54, indicatorOpacity, tintStrength);
        } else {
            // Single sprite for other spawn modes
            let iconSize = 40; // Default size for most modes
            
            // Special size for squid (2x larger)
            if (spawnMode === 'squid') {
                iconSize = 80; // 2x the default size
            }
            
            const halfSize = iconSize / 2;
            
            // Draw sprite with tinting if needed
            this.drawTintedSprite(ctx, spriteToUse, mouseWorldPos.x - halfSize, mouseWorldPos.y - halfSize, 
                                 iconSize, iconSize, indicatorOpacity, tintStrength);
        }
        
        // Draw stroke circle
        this.drawSpawnIndicatorStroke(ctx, mouseWorldPos, spawnMode, indicatorOpacity);
        
        ctx.restore();
    }

    /**
     * Draw clumped spawn indicator (multiple sprites in a clump)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} mouseWorldPos - Mouse world position
     * @param {Image} sprite - Sprite image
     * @param {number} count - Number of sprites to draw
     * @param {number} mainSize - Main sprite size
     * @param {number} smallSize - Smaller sprite size
     * @param {number} opacity - Opacity
     * @param {number} tintStrength - Tint strength
     */
    drawClumpedSpawnIndicator(ctx, mouseWorldPos, sprite, count, mainSize, smallSize, opacity, tintStrength) {
        const halfMainSize = mainSize / 2;
        
        // Draw main sprite in center
        this.drawTintedSprite(ctx, sprite, 
            mouseWorldPos.x - halfMainSize, 
            mouseWorldPos.y - halfMainSize, 
            mainSize, mainSize, opacity, tintStrength);
        
        // Draw smaller sprites around it for clump effect
        const halfSmallSize = smallSize / 2;
        
        // Top-left smaller sprite
        this.drawTintedSprite(ctx, sprite, 
            mouseWorldPos.x - halfSmallSize - 2, 
            mouseWorldPos.y - halfSmallSize + 5, 
            smallSize, smallSize, opacity, tintStrength);
        
        // Top-right smaller sprite
        this.drawTintedSprite(ctx, sprite, 
            mouseWorldPos.x - halfSmallSize + 2, 
            mouseWorldPos.y - halfSmallSize + 3, 
            smallSize, smallSize, opacity, tintStrength);
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
            case 'truefry1':
                this.drawTrueFry1Mode(ctx, sprites);
                break;
            case 'truefry2':
                this.drawTrueFry2Mode(ctx, sprites);
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
            truefry1: sprites.truefry1,
            truefry2: sprites.truefry2,
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
        // Validate sprite before drawing
        if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid sprite in UIRenderingSystem drawTintedSprite:', {
                sprite: sprite,
                type: typeof sprite,
                isImage: sprite instanceof HTMLImageElement,
                complete: sprite?.complete,
                naturalWidth: sprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = width;
            tempCanvas.height = height;
            
            // Draw sprite on temp canvas with validation
            try {
                tempCtx.drawImage(sprite, 0, 0, width, height);
            } catch (error) {
                console.error('🚨 drawImage error in UIRenderingSystem temp canvas:', error, {
                    sprite: sprite,
                    width: width,
                    height: height
                });
                return;
            }
            
            // Apply tint using source-atop (only affects non-transparent pixels)
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, width, height);
            
            // Draw the tinted sprite to main canvas
            ctx.globalAlpha = opacity;
            ctx.drawImage(tempCanvas, x, y);
        } else {
            // No tint needed, draw normally with validation
            ctx.globalAlpha = opacity;
            try {
                ctx.drawImage(sprite, x, y, width, height);
            } catch (error) {
                console.error('🚨 drawImage error in UIRenderingSystem main canvas:', error, {
                    sprite: sprite,
                    x: x,
                    y: y,
                    width: width,
                    height: height
                });
            }
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
        
        // Validate fish food sprite before drawing
        const fishFoodSprite = sprites.fishFood;
        if (!fishFoodSprite || !(fishFoodSprite instanceof HTMLImageElement) || !fishFoodSprite.complete || fishFoodSprite.naturalWidth === 0) {
            console.warn('🚨 Invalid fish food sprite in UIRenderingSystem drawFoodMode:', {
                fishFoodSprite: fishFoodSprite,
                type: typeof fishFoodSprite,
                isImage: fishFoodSprite instanceof HTMLImageElement,
                complete: fishFoodSprite?.complete,
                naturalWidth: fishFoodSprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        // Draw 3 fish food sprites in a clump arrangement with validation
        try {
            ctx.drawImage(fishFoodSprite, this.config.UI_START_X, this.config.UI_START_Y, size, size);
            ctx.drawImage(fishFoodSprite, this.config.UI_START_X - 2, this.config.UI_START_Y + 5, smallSize, smallSize);
            ctx.drawImage(fishFoodSprite, this.config.UI_START_X + 2, this.config.UI_START_Y + 3, smallSize, smallSize);
        } catch (error) {
            console.error('🚨 drawImage error in UIRenderingSystem drawFoodMode:', error, {
                fishFoodSprite: fishFoodSprite,
                size: size,
                smallSize: smallSize
            });
        }
        
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
        
        // Validate poop sprite before drawing
        const poopSprite = sprites.poop;
        if (!poopSprite || !(poopSprite instanceof HTMLImageElement) || !poopSprite.complete || poopSprite.naturalWidth === 0) {
            console.warn('🚨 Invalid poop sprite in UIRenderingSystem drawPoopMode:', {
                poopSprite: poopSprite,
                type: typeof poopSprite,
                isImage: poopSprite instanceof HTMLImageElement,
                complete: poopSprite?.complete,
                naturalWidth: poopSprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        // Draw 3 poop sprites in a clump arrangement with validation
        try {
            ctx.drawImage(poopSprite, this.config.UI_START_X, this.config.UI_START_Y, size, size);
            ctx.drawImage(poopSprite, this.config.UI_START_X - 2, this.config.UI_START_Y + 5, smallSize, smallSize);
            ctx.drawImage(poopSprite, this.config.UI_START_X + 2, this.config.UI_START_Y + 3, smallSize, smallSize);
        } catch (error) {
            console.error('🚨 drawImage error in UIRenderingSystem drawPoopMode:', error, {
                poopSprite: poopSprite,
                size: size,
                smallSize: smallSize
            });
        }
        
        ctx.fillText('POOP MODE - Click to spawn', this.config.TEXT_OFFSET_X, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw TrueFry1 mode UI
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawTrueFry1Mode(ctx, sprites) {
        const size = this.config.FRY_SPRITE_SIZE;
        
        // Validate truefry1 sprite before drawing
        const truefry1Sprite = sprites.truefry1;
        if (!truefry1Sprite || !(truefry1Sprite instanceof HTMLImageElement) || !truefry1Sprite.complete || truefry1Sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid truefry1 sprite in UIRenderingSystem drawTrueFry1Mode:', {
                truefry1Sprite: truefry1Sprite,
                type: typeof truefry1Sprite,
                isImage: truefry1Sprite instanceof HTMLImageElement,
                complete: truefry1Sprite?.complete,
                naturalWidth: truefry1Sprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        try {
            ctx.drawImage(truefry1Sprite, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        } catch (error) {
            console.error('🚨 drawImage error in UIRenderingSystem drawTrueFry1Mode:', error, {
                truefry1Sprite: truefry1Sprite,
                size: size
            });
        }
        
        ctx.fillText('TRUEFRY1 MODE - Click to spawn (1-3)', this.config.TEXT_OFFSET_X + 15, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw TrueFry2 mode UI
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawTrueFry2Mode(ctx, sprites) {
        const size = this.config.FRY_SPRITE_SIZE;
        
        // Validate truefry2 sprite before drawing
        const truefry2Sprite = sprites.truefry2;
        if (!truefry2Sprite || !(truefry2Sprite instanceof HTMLImageElement) || !truefry2Sprite.complete || truefry2Sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid truefry2 sprite in UIRenderingSystem drawTrueFry2Mode:', {
                truefry2Sprite: truefry2Sprite,
                type: typeof truefry2Sprite,
                isImage: truefry2Sprite instanceof HTMLImageElement,
                complete: truefry2Sprite?.complete,
                naturalWidth: truefry2Sprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        try {
            ctx.drawImage(truefry2Sprite, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        } catch (error) {
            console.error('🚨 drawImage error in UIRenderingSystem drawTrueFry2Mode:', error, {
                truefry2Sprite: truefry2Sprite,
                size: size
            });
        }
        
        ctx.fillText('TRUEFRY2 MODE - Click to spawn (1-3)', this.config.TEXT_OFFSET_X + 15, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw fertilized egg mode UI
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawFertilizedEggMode(ctx, sprites) {
        const size = this.config.FERTILIZED_EGG_SIZE;
        
        // Validate fertilized egg sprite before drawing
        const fertilizedEggSprite = sprites.fertilizedEgg;
        if (!fertilizedEggSprite || !(fertilizedEggSprite instanceof HTMLImageElement) || !fertilizedEggSprite.complete || fertilizedEggSprite.naturalWidth === 0) {
            console.warn('🚨 Invalid fertilized egg sprite in UIRenderingSystem drawFertilizedEggMode:', {
                fertilizedEggSprite: fertilizedEggSprite,
                type: typeof fertilizedEggSprite,
                isImage: fertilizedEggSprite instanceof HTMLImageElement,
                complete: fertilizedEggSprite?.complete,
                naturalWidth: fertilizedEggSprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        try {
            ctx.drawImage(fertilizedEggSprite, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        } catch (error) {
            console.error('🚨 drawImage error in UIRenderingSystem drawFertilizedEggMode:', error, {
                fertilizedEggSprite: fertilizedEggSprite,
                size: size
            });
        }
        
        ctx.fillText('FERTILIZED EGGS MODE - Click to spawn (1-3)', this.config.TEXT_OFFSET_X, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw krill mode UI (keep original size)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawKrillMode(ctx, sprites) {
        const size = this.config.KRILL_SPRITE_SIZE;
        
        // Validate krill spawn icon sprite before drawing
        const krillSpawnIconSprite = sprites.krillSpawnIcon;
        if (!krillSpawnIconSprite || !(krillSpawnIconSprite instanceof HTMLImageElement) || !krillSpawnIconSprite.complete || krillSpawnIconSprite.naturalWidth === 0) {
            console.warn('🚨 Invalid krill spawn icon sprite in UIRenderingSystem drawKrillMode:', {
                krillSpawnIconSprite: krillSpawnIconSprite,
                type: typeof krillSpawnIconSprite,
                isImage: krillSpawnIconSprite instanceof HTMLImageElement,
                complete: krillSpawnIconSprite?.complete,
                naturalWidth: krillSpawnIconSprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        try {
            ctx.drawImage(krillSpawnIconSprite, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        } catch (error) {
            console.error('🚨 drawImage error in UIRenderingSystem drawKrillMode:', error, {
                krillSpawnIconSprite: krillSpawnIconSprite,
                size: size
            });
        }
        
        ctx.fillText('KRILL MODE - Click to spawn', this.config.TEXT_OFFSET_X + 15, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw fry mode UI
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawFryMode(ctx, sprites) {
        const size = this.config.FRY_SPRITE_SIZE;
        
        // Validate small fry sprite before drawing
        const smallFrySprite = sprites.smallFry2;
        if (!smallFrySprite || !(smallFrySprite instanceof HTMLImageElement) || !smallFrySprite.complete || smallFrySprite.naturalWidth === 0) {
            console.warn('🚨 Invalid small fry sprite in UIRenderingSystem drawFryMode:', {
                smallFrySprite: smallFrySprite,
                type: typeof smallFrySprite,
                isImage: smallFrySprite instanceof HTMLImageElement,
                complete: smallFrySprite?.complete,
                naturalWidth: smallFrySprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        try {
            ctx.drawImage(smallFrySprite, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        } catch (error) {
            console.error('🚨 drawImage error in UIRenderingSystem drawFryMode:', error, {
                smallFrySprite: smallFrySprite,
                size: size
            });
        }
        
        ctx.fillText('FRY MODE - Click to spawn (1-5 random)', this.config.TEXT_OFFSET_X + 15, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw tuna mode UI (keep original size)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawTunaMode(ctx, sprites) {
        const size = this.config.TUNA_SPRITE_SIZE;
        
        // Validate tuna sprite before drawing
        const tunaSprite = sprites.tuna;
        if (!tunaSprite || !(tunaSprite instanceof HTMLImageElement) || !tunaSprite.complete || tunaSprite.naturalWidth === 0) {
            console.warn('🚨 Invalid tuna sprite in UIRenderingSystem drawTunaMode:', {
                tunaSprite: tunaSprite,
                type: typeof tunaSprite,
                isImage: tunaSprite instanceof HTMLImageElement,
                complete: tunaSprite?.complete,
                naturalWidth: tunaSprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        try {
            ctx.drawImage(tunaSprite, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        } catch (error) {
            console.error('🚨 drawImage error in UIRenderingSystem drawTunaMode:', error, {
                tunaSprite: tunaSprite,
                size: size
            });
        }
        
        ctx.fillText('TUNA MODE - Click to spawn (1-3 random)', this.config.TEXT_OFFSET_X + 15, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw squid mode UI
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} sprites - Sprite collection
     */
    drawSquidMode(ctx, sprites) {
        const size = this.config.SQUID_SPRITE_SIZE;
        
        // Validate giant squid sprite before drawing
        const giantSquidSprite = sprites.giantSquid1;
        if (!giantSquidSprite || !(giantSquidSprite instanceof HTMLImageElement) || !giantSquidSprite.complete || giantSquidSprite.naturalWidth === 0) {
            console.warn('🚨 Invalid giant squid sprite in UIRenderingSystem drawSquidMode:', {
                giantSquidSprite: giantSquidSprite,
                type: typeof giantSquidSprite,
                isImage: giantSquidSprite instanceof HTMLImageElement,
                complete: giantSquidSprite?.complete,
                naturalWidth: giantSquidSprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        try {
            ctx.drawImage(giantSquidSprite, this.config.UI_START_X, this.config.UI_START_Y, size, size);
        } catch (error) {
            console.error('🚨 drawImage error in UIRenderingSystem drawSquidMode:', error, {
                giantSquidSprite: giantSquidSprite,
                size: size
            });
        }
        
        ctx.fillText('SQUID MODE - Click to spawn giant squid', this.config.TEXT_OFFSET_X + 25, this.config.TEXT_OFFSET_Y);
    }

    /**
     * Draw default mode text
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawDefaultModeText(ctx) {
        ctx.fillStyle = this.config.COLORS.default;
        ctx.font = '16px Arial';
        ctx.fillText('Press F to cycle: Food → Poop → TrueFry1 → TrueFry2 → Fish Eggs → Sperm → Fertilized Eggs → Krill → Fry → Tuna → Squid → Off', 
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