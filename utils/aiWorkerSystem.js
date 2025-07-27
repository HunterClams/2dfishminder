// AI Worker System Module
// Provides Web Worker integration for heavy AI calculations to improve main thread performance

class AIWorkerSystem {
    constructor() {
        this.workers = new Map();
        this.workerPool = [];
        this.maxWorkers = navigator.hardwareConcurrency || 4; // Use CPU cores count
        this.taskQueue = [];
        this.activeJobs = new Map();
        this.jobId = 0;
        
        this.performanceStats = {
            tasksOffloaded: 0,
            tasksCompleted: 0,
            totalProcessingTime: 0,
            averageTaskTime: 0,
            workerUtilization: 0
        };
        
        this.initializeWorkerPool();
        console.log('🧠 AI Worker System initialized with', this.maxWorkers, 'workers');
    }
    
    // Initialize worker pool
    initializeWorkerPool() {
        // Create AI calculation worker
        const aiWorkerCode = this.createAIWorkerCode();
        const aiWorkerBlob = new Blob([aiWorkerCode], { type: 'application/javascript' });
        const aiWorkerURL = URL.createObjectURL(aiWorkerBlob);
        
        for (let i = 0; i < this.maxWorkers; i++) {
            try {
                const worker = new Worker(aiWorkerURL);
                worker.onmessage = (e) => this.handleWorkerMessage(e, worker);
                worker.onerror = (e) => this.handleWorkerError(e, worker);
                worker.isAvailable = true;
                worker.id = i;
                this.workerPool.push(worker);
            } catch (error) {
                console.warn('Web Workers not supported or failed to create:', error);
                break;
            }
        }
        
        // Clean up blob URL
        URL.revokeObjectURL(aiWorkerURL);
    }
    
    // Create AI worker code as string
    createAIWorkerCode() {
        return `
            // AI Worker - runs in background thread
            
            // Flocking calculations
            function calculateFlockingForces(boid, nearbyBoids, constants) {
                const perceptionRadiusSquared = constants.PERCEPTION_RADIUS * constants.PERCEPTION_RADIUS;
                const separationRadiusSquared = constants.SEPARATION_RADIUS * constants.SEPARATION_RADIUS;
                
                let alignment = { x: 0, y: 0 };
                let cohesion = { x: 0, y: 0 };
                let separation = { x: 0, y: 0 };
                let alignCount = 0, cohesionCount = 0, separationCount = 0;
                
                for (let other of nearbyBoids) {
                    if (other.id === boid.id) continue;
                    
                    const dx = boid.x - other.x;
                    const dy = boid.y - other.y;
                    const distSquared = dx * dx + dy * dy;
                    
                    if (distSquared < perceptionRadiusSquared) {
                        alignment.x += other.velocity.x;
                        alignment.y += other.velocity.y;
                        alignCount++;
                        
                        cohesion.x += other.x;
                        cohesion.y += other.y;
                        cohesionCount++;
                    }
                    
                    if (distSquared < separationRadiusSquared) {
                        const dist = Math.sqrt(distSquared);
                        separation.x += dx / dist;
                        separation.y += dy / dist;
                        separationCount++;
                    }
                }
                
                // Calculate forces
                const forces = { x: 0, y: 0 };
                
                if (alignCount > 0) {
                    alignment.x /= alignCount;
                    alignment.y /= alignCount;
                    forces.x += alignment.x * 0.4;
                    forces.y += alignment.y * 0.4;
                }
                
                if (cohesionCount > 0) {
                    cohesion.x = (cohesion.x / cohesionCount) - boid.x;
                    cohesion.y = (cohesion.y / cohesionCount) - boid.y;
                    forces.x += cohesion.x * 0.3;
                    forces.y += cohesion.y * 0.3;
                }
                
                if (separationCount > 0) {
                    separation.x /= separationCount;
                    separation.y /= separationCount;
                    forces.x += separation.x * 1.5;
                    forces.y += separation.y * 1.5;
                }
                
                return forces;
            }
            
            // Batch process multiple entities
            function processBatchFlocking(entities, constants) {
                const results = [];
                
                for (let i = 0; i < entities.length; i++) {
                    const entity = entities[i];
                    const nearbyEntities = entities.filter((e, idx) => {
                        if (idx === i) return false;
                        const dx = entity.x - e.x;
                        const dy = entity.y - e.y;
                        const distSquared = dx * dx + dy * dy;
                        return distSquared < constants.PERCEPTION_RADIUS * constants.PERCEPTION_RADIUS * 4; // Larger radius for worker processing
                    });
                    
                    const forces = calculateFlockingForces(entity, nearbyEntities, constants);
                    results.push({
                        id: entity.id,
                        forces: forces
                    });
                }
                
                return results;
            }
            
            // Handle messages from main thread
            self.onmessage = function(e) {
                const { type, data, jobId } = e.data;
                let result = null;
                
                try {
                    switch (type) {
                        case 'BATCH_FLOCKING':
                            result = processBatchFlocking(data.entities, data.constants);
                            break;
                        case 'PING':
                            result = 'PONG';
                            break;
                        default:
                            throw new Error('Unknown task type: ' + type);
                    }
                    
                    self.postMessage({
                        type: 'TASK_COMPLETE',
                        jobId: jobId,
                        result: result,
                        success: true
                    });
                } catch (error) {
                    self.postMessage({
                        type: 'TASK_ERROR',
                        jobId: jobId,
                        error: error.message,
                        success: false
                    });
                }
            };
        `;
    }
    
    // Handle worker messages
    handleWorkerMessage(event, worker) {
        const { type, jobId, result, success } = event.data;
        
        if (type === 'TASK_COMPLETE' || type === 'TASK_ERROR') {
            worker.isAvailable = true;
            
            if (this.activeJobs.has(jobId)) {
                const job = this.activeJobs.get(jobId);
                const processingTime = Date.now() - job.startTime;
                
                this.updatePerformanceStats(processingTime);
                
                if (success && job.callback) {
                    job.callback(result);
                } else if (!success && job.errorCallback) {
                    job.errorCallback(event.data.error);
                }
                
                this.activeJobs.delete(jobId);
                this.processQueue();
            }
        }
    }
    
    // Handle worker errors
    handleWorkerError(error, worker) {
        console.error('AI Worker error:', error);
        worker.isAvailable = true;
        this.processQueue();
    }
    
    // Process flocking calculations in batch
    processBatchFlocking(entities, constants, callback, errorCallback = null) {
        if (this.workerPool.length === 0) {
            // Fallback to main thread if no workers available
            console.warn('No workers available, processing on main thread');
            return this.fallbackBatchFlocking(entities, constants, callback);
        }
        
        const task = {
            type: 'BATCH_FLOCKING',
            data: {
                entities: entities.map(e => ({
                    id: e.id || Math.random(),
                    x: e.x,
                    y: e.y,
                    velocity: { x: e.velocity.x, y: e.velocity.y }
                })),
                constants: constants
            },
            callback: callback,
            errorCallback: errorCallback,
            priority: 1
        };
        
        this.queueTask(task);
    }
    
    // Queue task for worker processing
    queueTask(task) {
        this.taskQueue.push(task);
        this.processQueue();
    }
    
    // Process task queue
    processQueue() {
        if (this.taskQueue.length === 0) return;
        
        const availableWorker = this.workerPool.find(w => w.isAvailable);
        if (!availableWorker) return;
        
        const task = this.taskQueue.shift();
        const jobId = ++this.jobId;
        
        availableWorker.isAvailable = false;
        
        this.activeJobs.set(jobId, {
            ...task,
            startTime: Date.now(),
            workerId: availableWorker.id
        });
        
        availableWorker.postMessage({
            type: task.type,
            data: task.data,
            jobId: jobId
        });
        
        this.performanceStats.tasksOffloaded++;
    }
    
    // Fallback processing on main thread
    fallbackBatchFlocking(entities, constants, callback) {
        // Simple main thread processing as fallback
        setTimeout(() => {
            const results = entities.map(entity => ({
                id: entity.id || Math.random(),
                forces: { x: 0, y: 0 } // Simplified fallback
            }));
            callback(results);
        }, 0);
    }
    
    // Update performance statistics
    updatePerformanceStats(processingTime) {
        this.performanceStats.tasksCompleted++;
        this.performanceStats.totalProcessingTime += processingTime;
        this.performanceStats.averageTaskTime = 
            this.performanceStats.totalProcessingTime / this.performanceStats.tasksCompleted;
        
        const busyWorkers = this.workerPool.filter(w => !w.isAvailable).length;
        this.performanceStats.workerUtilization = (busyWorkers / this.workerPool.length) * 100;
    }
    
    // Get performance statistics
    getPerformanceStats() {
        return {
            ...this.performanceStats,
            queueLength: this.taskQueue.length,
            activeJobs: this.activeJobs.size,
            availableWorkers: this.workerPool.filter(w => w.isAvailable).length,
            totalWorkers: this.workerPool.length
        };
    }
    
    // Test worker functionality
    testWorkers() {
        console.log('Testing AI workers...');
        
        this.workerPool.forEach((worker, index) => {
            if (worker.isAvailable) {
                worker.postMessage({
                    type: 'PING',
                    data: null,
                    jobId: 'test_' + index
                });
            }
        });
    }
    
    // Cleanup workers
    destroy() {
        this.workerPool.forEach(worker => {
            worker.terminate();
        });
        this.workerPool = [];
        this.taskQueue = [];
        this.activeJobs.clear();
    }
}

// Make globally accessible
window.AIWorkerSystem = AIWorkerSystem; 