// Rendering functions
// Cache for rendered chunks
let chunkCanvasCache = new Map();

function render() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set pixelated rendering for the entire canvas
    ctx.imageSmoothingEnabled = false;
    
    // Draw animated sky background
    renderSky();
    
    // Display FPS in debug mode
    if (debugMode) {
        displayDebugInfo();
    }
    
    // Get visible chunks - limit the number of chunks processed per frame
    const visibleChunks = getVisibleChunks().slice(0, 20);
    
    // Render each visible chunk
    for (const { chunkX, chunkY, isVisible } of visibleChunks) {
        // Skip rendering for chunks that are not visible
        if (!isVisible) continue;
        
        const key = getChunkKey(chunkX, chunkY);
        
        if (!chunks.has(key)) continue;
        
        // Calculate screen position of chunk
        const screenX = (chunkX * CHUNK_SIZE - worldOffsetX) * PIXEL_SIZE;
        const screenY = (chunkY * CHUNK_SIZE - worldOffsetY) * PIXEL_SIZE;
        
        // Check if we need to render this chunk
        const needsRender = dirtyChunks.has(key) || worldMoved || !chunkCanvasCache.has(key);
        
        // Always render the chunk if it's in the stone layer (for visibility)
        // or if it needs rendering
        if (needsRender) {
            renderChunkToCache(chunkX, chunkY, key);
        }
        
        // Draw the cached chunk to the main canvas
        const cachedCanvas = chunkCanvasCache.get(key);
        if (cachedCanvas) {
            ctx.drawImage(cachedCanvas, screenX, screenY);
        }
        
        // Draw chunk border in debug mode
        if (debugMode) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1;
            ctx.strokeRect(
                screenX, 
                screenY, 
                CHUNK_SIZE * PIXEL_SIZE, 
                CHUNK_SIZE * PIXEL_SIZE
            );
            
            // Draw chunk coordinates
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.fillText(`${chunkX},${chunkY}`, screenX + 5, screenY + 15);
        }
        
        // Remove this chunk from the dirty list after rendering
        if (dirtyChunks.has(key)) {
            dirtyChunks.delete(key);
        }
    }
    
    // Reset world moved flag after rendering
    worldMoved = false;
    
    // Update cloud position animation only (not colors or shapes)
    skyAnimationTime += skyAnimationSpeed;
    if (skyAnimationTime > 1) skyAnimationTime -= 1;
    
    // Render physics objects
    renderPhysicsObjects(ctx, worldOffsetX, worldOffsetY);
    
    // Render entities
    if (typeof renderEntities === 'function') {
        renderEntities(ctx, worldOffsetX, worldOffsetY);
    }
    
    // Render breaking range indicator if player is breaking
    if (player && player.isBreaking) {
        renderBreakingIndicator(ctx, worldOffsetX, worldOffsetY);
    }
    
    // Draw cursor position and update debug info
    if (currentMouseX !== undefined && currentMouseY !== undefined) {
        const worldX = Math.floor(currentMouseX / PIXEL_SIZE) + worldOffsetX;
        const worldY = Math.floor(currentMouseY / PIXEL_SIZE) + worldOffsetY;
        
        // Update coordinates display in debug mode
        if (debugMode) {
            document.getElementById('coords').textContent = 
                `Chunk: ${Math.floor(worldOffsetX / CHUNK_SIZE)},${Math.floor(worldOffsetY / CHUNK_SIZE)} | ` +
                `Mouse: ${worldX},${worldY} | Offset: ${Math.floor(worldOffsetX)},${Math.floor(worldOffsetY)}`;
            
            // Draw cursor outline
            const cursorScreenX = (worldX - worldOffsetX) * PIXEL_SIZE;
            const cursorScreenY = (worldY - worldOffsetY) * PIXEL_SIZE;
            
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                cursorScreenX - PIXEL_SIZE, 
                cursorScreenY - PIXEL_SIZE, 
                PIXEL_SIZE * 3, 
                PIXEL_SIZE * 3
            );
            
            // Draw a dot at the exact mouse position
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(currentMouseX, currentMouseY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Render the animated sky background
function renderSky() {
    // Create a gradient with fixed colors (no animation of colors)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    
    // Use fixed color positions for a brighter, static sky
    gradient.addColorStop(0, SKY_COLORS[0]);
    gradient.addColorStop(0.5, SKY_COLORS[1]);
    gradient.addColorStop(1, SKY_COLORS[2]);
    
    // Fill the background with the gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a subtle horizon line to separate sky from world
    const horizonGradient = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height * 0.6);
    horizonGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    horizonGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    horizonGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = horizonGradient;
    ctx.fillRect(0, canvas.height * 0.4, canvas.width, canvas.height * 0.2);
}

// Display debug information
function displayDebugInfo() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 80);
    
    ctx.font = '14px monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Display FPS
    ctx.fillText(`FPS: ${fps}`, 20, 20);
    
    // Display world coordinates
    ctx.fillText(`World: ${Math.floor(worldOffsetX)}, ${Math.floor(worldOffsetY)}`, 20, 40);
    
    // Display chunk coordinates
    const chunkX = Math.floor(worldOffsetX / CHUNK_SIZE);
    const chunkY = Math.floor(worldOffsetY / CHUNK_SIZE);
    ctx.fillText(`Chunk: ${chunkX}, ${chunkY}`, 20, 60);
    
    ctx.restore();
}

// Render breaking indicator for player
function renderBreakingIndicator(ctx, offsetX, offsetY) {
    // Get mouse position in world coordinates
    const worldX = Math.floor(currentMouseX / PIXEL_SIZE) + worldOffsetX;
    const worldY = Math.floor(currentMouseY / PIXEL_SIZE) + worldOffsetY;
    
    // Calculate distance from player to target block
    const distance = Math.sqrt(
        Math.pow(worldX - player.x, 2) + 
        Math.pow(worldY - player.y, 2)
    );
    
    // Convert to screen coordinates
    const screenX = (worldX - offsetX) * PIXEL_SIZE;
    const screenY = (worldY - offsetY) * PIXEL_SIZE;
    const playerScreenX = (player.x - offsetX) * PIXEL_SIZE;
    const playerScreenY = (player.y - offsetY) * PIXEL_SIZE;
    
    // Draw breaking range circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
        playerScreenX, 
        playerScreenY, 
        player.breakingRange * PIXEL_SIZE, 
        0, 
        Math.PI * 2
    );
    ctx.stroke();
    
    // Draw target indicator
    if (distance <= player.breakingRange) {
        ctx.strokeStyle = '#ff0000';
    } else {
        ctx.strokeStyle = '#888888'; // Gray when out of range
    }
    
    ctx.lineWidth = 2;
    ctx.strokeRect(
        screenX - PIXEL_SIZE/2, 
        screenY - PIXEL_SIZE/2, 
        PIXEL_SIZE, 
        PIXEL_SIZE
    );
    
    // Draw line from player to target point
    ctx.beginPath();
    ctx.moveTo(playerScreenX, playerScreenY);
    ctx.lineTo(screenX, screenY);
    ctx.stroke();
}

// Render a chunk to an offscreen canvas and cache it
function renderChunkToCache(chunkX, chunkY, key) {
    const chunk = chunks.get(key);
    
    // Create a new canvas for this chunk if it doesn't exist
    if (!chunkCanvasCache.has(key)) {
        const chunkCanvas = document.createElement('canvas');
        chunkCanvas.width = CHUNK_SIZE * PIXEL_SIZE;
        chunkCanvas.height = CHUNK_SIZE * PIXEL_SIZE;
        chunkCanvasCache.set(key, chunkCanvas);
    }
    
    const chunkCanvas = chunkCanvasCache.get(key);
    const chunkCtx = chunkCanvas.getContext('2d');
    
    // Clear the chunk canvas
    chunkCtx.clearRect(0, 0, chunkCanvas.width, chunkCanvas.height);
    
    // Render each pixel in the chunk
    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const index = y * CHUNK_SIZE + x;
            const type = chunk[index];
            
            // Always render stone layer even if it's not directly visible
            if (type === EMPTY && chunkY !== 1) continue;
            
            // For the stone layer (chunkY = 1), render a faint background even for empty spaces
            if (type === EMPTY && chunkY === 1) {
                // Use a very faint gray for empty spaces in the stone layer
                chunkCtx.fillStyle = 'rgba(100, 100, 100, 0.2)';
                chunkCtx.fillRect(
                    x * PIXEL_SIZE,
                    y * PIXEL_SIZE,
                    PIXEL_SIZE,
                    PIXEL_SIZE
                );
                continue;
            }
            
            // Set color based on type
            if (type === SAND) {
                chunkCtx.fillStyle = SAND_COLOR;
            } else if (type === WATER) {
                // Get water color from metadata with variation
                const metadata = getMetadata(chunkX * CHUNK_SIZE + x, chunkY * CHUNK_SIZE + y);
                const colorIndex = metadata && metadata.colorIndex !== undefined ? metadata.colorIndex : 0;
                chunkCtx.fillStyle = WATER_COLORS[colorIndex];
            } else if (type === WALL) {
                chunkCtx.fillStyle = WALL_COLOR;
            } else if (type === DIRT) {
                // Get dirt color from metadata with variation
                const metadata = getMetadata(chunkX * CHUNK_SIZE + x, chunkY * CHUNK_SIZE + y);
                const colorIndex = metadata && metadata.colorIndex !== undefined ? metadata.colorIndex : 0;
                chunkCtx.fillStyle = DIRT_COLORS[colorIndex];
            } else if (type === STONE) {
                // Get stone color from metadata with variation
                const metadata = getMetadata(chunkX * CHUNK_SIZE + x, chunkY * CHUNK_SIZE + y);
                const colorIndex = metadata && metadata.colorIndex !== undefined ? metadata.colorIndex : 0;
                chunkCtx.fillStyle = STONE_COLORS[colorIndex];
            } else if (type === GRASS) {
                // Get grass color from metadata with variation
                const metadata = getMetadata(chunkX * CHUNK_SIZE + x, chunkY * CHUNK_SIZE + y);
                const colorIndex = metadata && metadata.colorIndex !== undefined ? metadata.colorIndex : 0;
                chunkCtx.fillStyle = GRASS_COLORS[colorIndex];
            } else if (type === WOOD) {
                // Get wood color from metadata with variation
                const metadata = getMetadata(chunkX * CHUNK_SIZE + x, chunkY * CHUNK_SIZE + y);
                const colorIndex = metadata && metadata.colorIndex !== undefined ? metadata.colorIndex : 0;
                chunkCtx.fillStyle = WOOD_COLORS[colorIndex];
            } else if (type === SEED) {
                chunkCtx.fillStyle = SEED_COLOR;
            } else if (type === GRASS_BLADE) {
                // Use the same color variation as grass
                const metadata = getMetadata(chunkX * CHUNK_SIZE + x, chunkY * CHUNK_SIZE + y);
                const colorIndex = metadata && metadata.colorIndex !== undefined ? metadata.colorIndex : 0;
                chunkCtx.fillStyle = GRASS_COLORS[colorIndex];
            } else if (type === FLOWER) {
                // Get flower color from metadata or use a default
                const metadata = getMetadata(chunkX * CHUNK_SIZE + x, chunkY * CHUNK_SIZE + y);
                chunkCtx.fillStyle = metadata && metadata.color ? metadata.color : FLOWER_COLORS[0];
            } else if (type === TREE_SEED) {
                chunkCtx.fillStyle = SEED_COLOR;
            } else if (type === LEAF) {
                // Get leaf color from metadata with variation
                const metadata = getMetadata(chunkX * CHUNK_SIZE + x, chunkY * CHUNK_SIZE + y);
                const colorIndex = metadata && metadata.colorIndex !== undefined ? metadata.colorIndex : 0;
                chunkCtx.fillStyle = LEAF_COLORS[colorIndex];
            } else if (type === FIRE) {
                // Get fire color from metadata
                const metadata = getMetadata(chunkX * CHUNK_SIZE + x, chunkY * CHUNK_SIZE + y);
                const colorIndex = metadata ? metadata.colorIndex : 0;
                chunkCtx.fillStyle = FIRE_COLORS[colorIndex];
            } else if (type === LAVA) {
                // Get lava color from metadata
                const metadata = getMetadata(chunkX * CHUNK_SIZE + x, chunkY * CHUNK_SIZE + y);
                const colorIndex = metadata ? metadata.colorIndex : 0;
                chunkCtx.fillStyle = LAVA_COLORS[colorIndex];
            }
            
            // Draw the pixel
            chunkCtx.fillRect(
                x * PIXEL_SIZE,
                y * PIXEL_SIZE,
                PIXEL_SIZE,
                PIXEL_SIZE
            );
        }
    }
}
