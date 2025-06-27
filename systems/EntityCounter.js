// Entity Counter System - Tracks world populations and player spawn statistics
class EntityCounter {
    constructor() {
        // World population counters
        this.worldCounts = {
            trueFry1: 0,
            trueFry2: 0,
            regularFry: 0,
            bubbles: 0,
            fish: 0,
            predators: 0,
            krill: 0,
            paleKrill: 0,
            momKrill: 0,
            squid: 0,
            fishFood: 0,
            fishEggs: 0,
            sperm: 0,
            poop: 0,
            eatingBubbles: 0
        };
        
        // Player spawn statistics (for analytics/tracking)
        this.playerSpawns = {
            food: 0,
            krill: 0,
            poop: 0,
            truefry1: 0,
            truefry2: 0,
            fry: 0,
            tuna: 0,
            squid: 0
        };
        
        // Entity display configuration
        this.entityDisplayConfig = [
            { key: 'trueFry1', name: 'TrueFry1', icon: 'truefry1' },
            { key: 'trueFry2', name: 'TrueFry2', icon: 'truefry2' },
            { key: 'regularFry', name: 'Regular Fry', icon: 'smallFry2' },
            { key: 'bubbles', name: 'Bubbles', icon: 'bubble1' },
            { key: 'predators', name: 'Tuna', icon: 'tuna' },
            { key: 'krill', name: 'Krill', icon: 'krill1' },
            { key: 'paleKrill', name: 'Pale Krill', icon: 'paleKrill1' },
            { key: 'momKrill', name: 'Mom Krill', icon: 'momKrill1' },
            { key: 'squid', name: 'Giant Squid', icon: 'giantSquid1' },
            { key: 'fishFood', name: 'Fish Food', icon: 'fishFood' },
            { key: 'fishEggs', name: 'Fish Eggs', icon: 'fishEgg' },
            { key: 'sperm', name: 'Fish Sperm', icon: 'fishSperm' },
            { key: 'poop', name: 'Poop', icon: 'poop' },
            { key: 'eatingBubbles', name: 'Eating Bubbles', icon: 'bubble2' }
        ];
        
        // UI positioning
        this.uiStartY = 90;
        this.lineHeight = 25;
        this.iconSize = 20;
        this.iconPadding = 5;
    }
    
    // Update world population counts
    updateWorldCounts(gameEntities, objectPools) {
        if (!gameEntities) return;
        
        this.worldCounts.bubbles = gameEntities.bubbles ? gameEntities.bubbles.length : 0;
        this.worldCounts.fish = gameEntities.fish ? gameEntities.fish.length : 0;
        this.worldCounts.predators = gameEntities.predators ? gameEntities.predators.length : 0;
        this.worldCounts.krill = gameEntities.krill ? gameEntities.krill.length : 0;
        this.worldCounts.paleKrill = gameEntities.paleKrill ? gameEntities.paleKrill.length : 0;
        this.worldCounts.momKrill = gameEntities.momKrill ? gameEntities.momKrill.length : 0;
        this.worldCounts.squid = gameEntities.squid ? gameEntities.squid.length : 0;
        this.worldCounts.fishFood = gameEntities.fishFood ? gameEntities.fishFood.length : 0;
        this.worldCounts.fishEggs = gameEntities.fishEggs ? gameEntities.fishEggs.length : 0;
        this.worldCounts.sperm = gameEntities.sperm ? gameEntities.sperm.length : 0;
        this.worldCounts.poop = gameEntities.poop ? gameEntities.poop.length : 0;
        
        // Count fry stages
        if (gameEntities.fish) {
            this.worldCounts.trueFry1 = gameEntities.fish.filter(f => f.constructor.name === 'TrueFry1').length;
            this.worldCounts.trueFry2 = gameEntities.fish.filter(f => f.constructor.name === 'TrueFry2').length;
            this.worldCounts.regularFry = gameEntities.fish.filter(f => 
                f.constructor.name !== 'TrueFry1' && f.constructor.name !== 'TrueFry2'
            ).length;
        }
        
        // Count active eating bubbles from object pool
        if (objectPools && objectPools.eatingBubbles) {
            this.worldCounts.eatingBubbles = objectPools.eatingBubbles.filter(b => !b.isDead()).length;
        }
    }
    
    // Track player spawns with immediate analytics
    trackPlayerSpawn(spawnType, amount = 1) {
        if (this.playerSpawns.hasOwnProperty(spawnType)) {
            this.playerSpawns[spawnType] += amount;
            
            // Send immediate analytics for player spawn action
            this.sendPlayerSpawnAnalytics(spawnType, amount);
        }
    }
    
    // Send immediate analytics for individual spawn actions
    sendPlayerSpawnAnalytics(spawnType, amount) {
        if (typeof window !== 'undefined' && window.va && window.va.track) {
            // Track individual spawn event
            window.va.track('player_spawn_action', {
                spawn_type: spawnType,
                spawn_amount: amount,
                total_spawns: this.getTotalPlayerSpawns(),
                session_timestamp: Date.now()
            });
            
            console.log(`📊 Analytics: Player spawned ${amount} ${spawnType}(s)`);
        }
    }
    
    // Get total entities in world
    getTotalWorldEntities() {
        return Object.values(this.worldCounts).reduce((sum, count) => sum + count, 0);
    }
    
    // Get total player spawns
    getTotalPlayerSpawns() {
        return Object.values(this.playerSpawns).reduce((sum, count) => sum + count, 0);
    }
    
    // Draw the entity counter UI
    drawUI(ctx, sprites, gameState) {
        // Only show entity counter when hudState is 'full'
        if (!gameState.hudState) gameState.hudState = 'controls'; // Initialize if not set
        if (gameState.hudState !== 'full') return;
        
        const canvas = window.canvas;
        if (!canvas) return;
        
        ctx.save();
        
        // Background for entity counter
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, this.uiStartY - 10, 280, this.entityDisplayConfig.length * this.lineHeight + 40);
        
        // Title
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('🌊 Ecosystem Population', 15, this.uiStartY + 5);
        
        // Entity counts
        ctx.font = '12px Arial';
        let yOffset = this.uiStartY + 25;
        
        for (let config of this.entityDisplayConfig) {
            const count = this.worldCounts[config.key] || 0;
            
            // Skip if count is 0 and it's eating bubbles (to reduce clutter)
            if (count === 0 && config.key === 'eatingBubbles') {
                continue;
            }
            
            // Draw icon
            if (sprites && sprites[config.icon]) {
                ctx.drawImage(sprites[config.icon], 15, yOffset - this.iconSize + 2, this.iconSize, this.iconSize);
            }
            
            // Draw entity name and count
            const textX = 15 + this.iconSize + this.iconPadding;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(`${config.name}:`, textX, yOffset);
            
            // Count with color coding
            const countColor = this.getCountColor(config.key, count);
            ctx.fillStyle = countColor;
            ctx.fillText(count.toString(), textX + 100, yOffset);
            
            yOffset += this.lineHeight;
        }
        
        // Total count
        yOffset += 5;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`Total Entities: ${this.getTotalWorldEntities()}`, 15, yOffset);
        
        // Player spawn statistics (below ecosystem population)
        if (this.getTotalPlayerSpawns() > 0) {
            const statsY = yOffset + 15; // Position below the ecosystem counter
            
            // Background for spawn stats
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            const spawnStatsHeight = Object.values(this.playerSpawns).filter(count => count > 0).length * 15 + 35;
            ctx.fillRect(10, statsY - 10, 280, spawnStatsHeight);
            
            // Title
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('🎯 Player Spawn Statistics', 15, statsY + 5);
            
            // Spawn counts
            ctx.font = '11px Arial';
            let spawnY = statsY + 20;
            
            for (let [type, count] of Object.entries(this.playerSpawns)) {
                if (count > 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    const displayName = this.getSpawnDisplayName(type);
                    ctx.fillText(`${displayName}:`, 15, spawnY);
                    
                    // Count with color
                    ctx.fillStyle = 'rgba(100, 255, 100, 0.9)';
                    ctx.fillText(count.toString(), 80, spawnY);
                    spawnY += 15;
                }
            }
            
            // Total spawns
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 11px Arial';
            ctx.fillText(`Total Player Spawns: ${this.getTotalPlayerSpawns()}`, 15, spawnY + 5);
        }
        
        ctx.restore();
    }
    
    // Get color for count based on entity type and population
    getCountColor(entityType, count) {
        if (count === 0) return 'rgba(128, 128, 128, 0.6)'; // Gray for empty
        
        switch (entityType) {
            case 'fish':
                if (count > 200) return 'rgba(100, 255, 100, 0.9)'; // Green for healthy
                if (count > 100) return 'rgba(255, 255, 100, 0.9)'; // Yellow for moderate
                return 'rgba(255, 150, 100, 0.9)'; // Orange for low
                
            case 'predators':
                if (count > 8) return 'rgba(255, 100, 100, 0.9)'; // Red for too many predators
                if (count > 4) return 'rgba(255, 200, 100, 0.9)'; // Orange for many
                return 'rgba(255, 255, 255, 0.9)'; // White for normal
                
            case 'krill':
            case 'paleKrill':
            case 'momKrill':
                if (count > 50) return 'rgba(150, 255, 150, 0.9)'; // Light green for abundant
                return 'rgba(255, 255, 255, 0.9)'; // White for normal
                
            case 'squid':
                if (count > 5) return 'rgba(200, 100, 255, 0.9)'; // Purple for many apex predators
                return 'rgba(255, 255, 255, 0.9)'; // White for normal
                
            default:
                return 'rgba(255, 255, 255, 0.8)'; // Default white
        }
    }
    
    // Get display name for spawn types
    getSpawnDisplayName(spawnType) {
        const names = {
            food: 'Food',
            krill: 'Krill',
            poop: 'Poop',
            truefry1: 'TrueFry1',
            truefry2: 'TrueFry2',
            fry: 'Fry',
            tuna: 'Tuna',
            squid: 'Squid'
        };
        return names[spawnType] || spawnType;
    }
    
    // Reset player spawn statistics
    resetPlayerStats() {
        // Send final analytics before reset
        if (this.getTotalPlayerSpawns() > 0) {
            this.sendAnalytics();
        }
        
        for (let key in this.playerSpawns) {
            this.playerSpawns[key] = 0;
        }
        
        console.log('🔄 Player spawn statistics reset');
    }
    
    // Manual analytics trigger (useful for testing)
    triggerAnalytics() {
        console.log('🚀 Manually triggering analytics...');
        this.sendAnalytics();
    }
    
    // Export data for analytics (useful for Vercel deployment)
    exportData() {
        return {
            worldCounts: { ...this.worldCounts },
            playerSpawns: { ...this.playerSpawns },
            totalEntities: this.getTotalWorldEntities(),
            totalPlayerSpawns: this.getTotalPlayerSpawns(),
            timestamp: Date.now()
        };
    }
    
    // Send analytics data to Vercel (if available)
    sendAnalytics() {
        if (typeof window !== 'undefined' && window.va && window.va.track) {
            try {
                const data = this.exportData();
                
                // Track ecosystem health metrics
                window.va.track('ecosystem_snapshot', {
                    total_entities: data.totalEntities,
                    fish_count: data.worldCounts.fish,
                    predator_count: data.worldCounts.predators,
                    krill_count: data.worldCounts.krill + data.worldCounts.paleKrill + data.worldCounts.momKrill,
                    squid_count: data.worldCounts.squid,
                    player_spawns: data.totalPlayerSpawns,
                    food_count: data.worldCounts.fishFood,
                    poop_count: data.worldCounts.poop,
                    bubble_count: data.worldCounts.bubbles
                });
                
                // Track detailed player interaction patterns
                if (data.totalPlayerSpawns > 0) {
                    window.va.track('player_spawning_summary', {
                        food_spawns: data.playerSpawns.food,
                        krill_spawns: data.playerSpawns.krill,
                        poop_spawns: data.playerSpawns.poop,
                        fry_spawns: data.playerSpawns.fry,
                        tuna_spawns: data.playerSpawns.tuna,
                        squid_spawns: data.playerSpawns.squid,
                        total_player_spawns: data.totalPlayerSpawns,
                        ecosystem_health_score: this.calculateEcosystemHealth(data)
                    });
                }
                
                console.log('📊 Vercel Analytics: Ecosystem data sent successfully');
            } catch (error) {
                console.warn('⚠️ Vercel Analytics error:', error);
            }
        } else {
            console.log('📊 Vercel Analytics not available (development mode)');
        }
    }
    
    // Calculate ecosystem health score for analytics
    calculateEcosystemHealth(data) {
        let score = 50; // Base score
        
        // Healthy fish population
        if (data.worldCounts.fish > 100) score += 20;
        else if (data.worldCounts.fish > 50) score += 10;
        
        // Balanced predator count
        if (data.worldCounts.predators > 0 && data.worldCounts.predators < 10) score += 15;
        
        // Active krill ecosystem
        const totalKrill = data.worldCounts.krill + data.worldCounts.paleKrill + data.worldCounts.momKrill;
        if (totalKrill > 30) score += 15;
        
        // Player engagement
        if (data.totalPlayerSpawns > 10) score += 10;
        
        return Math.min(100, Math.max(0, score));
    }
    
    // Initialize Vercel Analytics connection
    initializeAnalytics() {
        // Wait for Vercel Analytics to load
        const checkAnalytics = () => {
            if (typeof window !== 'undefined' && window.va) {
                console.log('📊 Vercel Analytics initialized successfully');
                
                // Send initial session start event
                window.va.track('ecosystem_session_start', {
                    timestamp: Date.now(),
                    user_agent: navigator.userAgent,
                    screen_resolution: `${screen.width}x${screen.height}`
                });
                
                return true;
            }
            return false;
        };
        
        // Try immediately, then retry every 500ms for up to 10 seconds
        if (!checkAnalytics()) {
            let attempts = 0;
            const maxAttempts = 20;
            const retryInterval = setInterval(() => {
                attempts++;
                if (checkAnalytics() || attempts >= maxAttempts) {
                    clearInterval(retryInterval);
                    if (attempts >= maxAttempts) {
                        console.log('📊 Vercel Analytics not available - running in development mode');
                    }
                }
            }, 500);
        }
    }
    
    // Auto-send analytics every 30 seconds (for active sessions)
    startAnalyticsTimer() {
        this.initializeAnalytics();
        
        setInterval(() => {
            if (this.getTotalWorldEntities() > 0) {
                this.sendAnalytics();
            }
        }, 30000); // 30 seconds
    }
}

// Make EntityCounter globally available
window.EntityCounter = EntityCounter; 