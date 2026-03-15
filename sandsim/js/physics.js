// Physics simulation functions
function updatePhysics(timestamp) {
    // Check if we should update physics based on the update rate
    if (timestamp && lastPhysicsTime && timestamp - lastPhysicsTime < physicsUpdateRate) {
        return;
    }
    
    lastPhysicsTime = timestamp || 0;
    
    // Update physics objects
    if (typeof updatePhysicsObjects === 'function') {
        updatePhysicsObjects();
    }
    
    // Update entities
    if (typeof updateEntities === 'function') {
        updateEntities();
    }
    
    // Get visible chunks
    const visibleChunks = getVisibleChunks();
    
    // Increment fire update counter
    fireUpdateCounter++;
    
    // Process each visible chunk
    for (const { chunkX, chunkY, isVisible } of visibleChunks) {
        // Skip physics calculations for chunks that are not visible
        if (!isVisible) continue;
        
        const chunk = getOrCreateChunk(chunkX, chunkY);
        let chunkModified = false;
        
        // Process from bottom to top, right to left for correct gravity simulation
        for (let y = CHUNK_SIZE - 1; y >= 0; y--) {
            // Alternate direction each row for more natural flow
            const startX = y % 2 === 0 ? 0 : CHUNK_SIZE - 1;
            const endX = y % 2 === 0 ? CHUNK_SIZE : -1;
            const step = y % 2 === 0 ? 1 : -1;
            
            for (let x = startX; x !== endX; x += step) {
                const index = y * CHUNK_SIZE + x;
                const type = chunk[index];
                
                if (type === EMPTY || type === STONE || type === WOOD || type === LEAF) continue;
                
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldY = chunkY * CHUNK_SIZE + y;
                
                // Use a lookup table for faster element updates
                const updateFunctions = {
                    [SAND]: updateSand,
                    [WATER]: updateWater,
                    [DIRT]: updateDirt,
                    [GRASS]: updateGrass,
                    [SEED]: updateSeed,
                    [GRASS_BLADE]: updateGrassBlade,
                    [FLOWER]: updateFlower,
                    [TREE_SEED]: updateTreeSeed,
                    [FIRE]: updateFire,
                    [LAVA]: updateLava
                };
                
                const updateFunction = updateFunctions[type];
                if (updateFunction) {
                    const wasModified = updateFunction(worldX, worldY);
                    if (wasModified) {
                        chunkModified = true;
                    }
                }
            }
        }
        
        // Mark chunk as dirty if it was modified
        if (chunkModified) {
            dirtyChunks.add(getChunkKey(chunkX, chunkY));
        }
    }
    
    // Adaptive physics rate based on FPS
    if (fps < 30 && physicsUpdateRate < 32) {
        // If FPS is low, update physics less frequently
        physicsUpdateRate = Math.min(32, physicsUpdateRate + 2);
    } else if (fps > 50 && physicsUpdateRate > 16) {
        // If FPS is high, update physics more frequently
        physicsUpdateRate = Math.max(16, physicsUpdateRate - 2);
    }
}
