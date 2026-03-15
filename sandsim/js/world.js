// World management functions
let worldOffsetX = 0;
let worldOffsetY = 0;
let worldOffsetXBeforeDrag = 0;
let worldOffsetYBeforeDrag = 0;
let chunks = new Map(); // Map to store chunks with key "x,y"
let metadata = new Map(); // Map to store metadata for pixels
let generatedChunks = new Set(); // Set to track which chunks have been generated
let dirtyChunks = new Set(); // Set to track which chunks need rendering
let lastPhysicsTime = 0; // Last time physics was updated
let physicsUpdateRate = 16; // Update physics every 16ms (approx 60fps)
let worldMoved = false; // Track if the world has moved for rendering

function moveWorld(dx, dy) {
    worldOffsetX += dx;
    worldOffsetY += dy;
    updateCoordinatesDisplay();
    
    // Mark that the world has moved for rendering
    worldMoved = true;
    
    // Generate terrain for chunks around the current view
    generateChunksAroundPlayer();
}

function updateCoordinatesDisplay() {
    const chunkX = Math.floor(worldOffsetX / CHUNK_SIZE);
    const chunkY = Math.floor(worldOffsetY / CHUNK_SIZE);
    document.getElementById('coords').textContent = `Chunk: ${chunkX},${chunkY} | Offset: ${Math.floor(worldOffsetX)},${Math.floor(worldOffsetY)}`;
}

function getChunkKey(chunkX, chunkY) {
    return `${chunkX},${chunkY}`;
}

function getOrCreateChunk(chunkX, chunkY) {
    const key = getChunkKey(chunkX, chunkY);
    
    if (!chunks.has(key)) {
        // Create a new chunk with empty pixels
        const chunkData = new Array(CHUNK_SIZE * CHUNK_SIZE).fill(EMPTY);
        
        // Fill chunk at y = 1 with stone, but create a noisy transition at the top
        if (chunkY === 1) {
            // Use the chunk position as part of the seed for consistent generation
            const seed = chunkX * 10000;
            const random = createSeededRandom(seed);
            
            for (let y = 0; y < CHUNK_SIZE; y++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    // Create a noisy transition at the top of the stone layer
                    if (y < 10) { // Only apply noise to the top 10 rows
                        // More noise at the top, less as we go down
                        const noiseThreshold = y / 10; // 0 at the top, 1 at row 10
                        
                        if (random() > noiseThreshold) {
                            chunkData[y * CHUNK_SIZE + x] = SAND;
                        } else {
                            // Increase stone density to make it more visible
                            chunkData[y * CHUNK_SIZE + x] = random() < 0.9 ? STONE : EMPTY;
                        }
                    } else {
                        // Below the transition zone, it's all stone
                        chunkData[y * CHUNK_SIZE + x] = STONE;
                    }
                }
            }
            
            // Mark this chunk as dirty to ensure it gets rendered
            dirtyChunks.add(key);
        }
        
        // Floor has been removed as it's no longer needed
        
        // Special generation for all chunks at y=0
        if (chunkY === 0) {
            generateSpecialChunk(chunkData, chunkX, chunkX);
        }
        
        chunks.set(key, chunkData);
    }
    
    return chunks.get(key);
}

// Generate special terrain for chunks near the player
function generateSpecialChunk(chunkData, chunkX, playerChunkX) {
    // 1. Create a base layer of sand above the floor
    const floorY = CHUNK_SIZE - 1;
    const baseHeight = 10; // Base height of sand
    
    // Use the chunk position as part of the seed for consistent generation
    const seed = chunkX * 10000;
    const random = createSeededRandom(seed);
    
    // Create two random hill points
    const hill1X = Math.floor(CHUNK_SIZE * (0.2 + random() * 0.2));
    const hill2X = Math.floor(CHUNK_SIZE * (0.6 + random() * 0.2));
    const hill1Height = baseHeight + Math.floor(random() * 10) + 5; // 5-15 blocks higher
    const hill2Height = baseHeight + Math.floor(random() * 10) + 5;
    
    // Generate height map for sand
    const heightMap = new Array(CHUNK_SIZE).fill(0);
    
    // Calculate heights based on distance from the two hills
    for (let x = 0; x < CHUNK_SIZE; x++) {
        // Distance from each hill (using a simple distance function)
        const dist1 = Math.abs(x - hill1X);
        const dist2 = Math.abs(x - hill2X);
        
        // Height contribution from each hill (inverse to distance)
        const h1 = hill1Height * Math.max(0, 1 - dist1 / (CHUNK_SIZE * 0.3));
        const h2 = hill2Height * Math.max(0, 1 - dist2 / (CHUNK_SIZE * 0.3));
        
        // Take the maximum height contribution
        heightMap[x] = Math.floor(baseHeight + Math.max(h1, h2));
        
        // Add some variation based on distance from player's chunk
        const distanceFromPlayer = Math.abs(chunkX - playerChunkX);
        if (distanceFromPlayer > 0) {
            // Make terrain more extreme as we move away from player
            const factor = 1 + (distanceFromPlayer * 0.2);
            heightMap[x] = Math.floor(heightMap[x] * factor);
        }
    }
    
    // Find the lowest points for water
    let minHeight = Math.min(...heightMap);
    
    // Place sand according to the height map with noise
    for (let x = 0; x < CHUNK_SIZE; x++) {
        const height = heightMap[x];
        
        // Add more noise to the height
        const noiseHeight = height + Math.floor(random() * 5) - 2;
        
        for (let y = floorY - noiseHeight; y < floorY; y++) {
            chunkData[y * CHUNK_SIZE + x] = SAND;
        }
        
        // 3. Add grass with significantly more coverage and noise
        // Increase grass probability for more coverage - now almost guaranteed
        const grassProbability = (height - baseHeight) / (hill1Height - baseHeight);
        
        if (random() < grassProbability * 0.3 + 0.7) { // Minimum 70% chance, up to 100%
            // Add grass on top
            chunkData[(floorY - noiseHeight) * CHUNK_SIZE + x] = GRASS;
            
            // Much more frequently add patches of grass on the sides
            if (random() < 0.8) { // Increased from 0.5
                // Add grass to the left if possible
                if (x > 0 && chunkData[(floorY - noiseHeight) * CHUNK_SIZE + (x-1)] === SAND) {
                    chunkData[(floorY - noiseHeight) * CHUNK_SIZE + (x-1)] = GRASS;
                }
            }
            
            if (random() < 0.8) { // Increased from 0.5
                // Add grass to the right if possible
                if (x < CHUNK_SIZE-1 && chunkData[(floorY - noiseHeight) * CHUNK_SIZE + (x+1)] === SAND) {
                    chunkData[(floorY - noiseHeight) * CHUNK_SIZE + (x+1)] = GRASS;
                }
            }
            
            // More frequently add grass patches below the top
            if (random() < 0.6 && noiseHeight > 2) { // Increased from 0.3
                const patchDepth = Math.floor(random() * 5) + 2; // Increased max depth and minimum
                for (let d = 1; d <= patchDepth; d++) {
                    if (floorY - noiseHeight + d < floorY) {
                        chunkData[(floorY - noiseHeight + d) * CHUNK_SIZE + x] = GRASS;
                    }
                }
            }
            
            // More frequently add grass clusters
            if (random() < 0.5) { // Increased from 0.2
                // Add a larger cluster of grass
                for (let dy = -2; dy <= 1; dy++) { // Increased vertical range
                    for (let dx = -2; dx <= 2; dx++) { // Increased horizontal range
                        const nx = x + dx;
                        const ny = floorY - noiseHeight + dy;
                        
                        if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_SIZE && 
                            (chunkData[ny * CHUNK_SIZE + nx] === SAND || chunkData[ny * CHUNK_SIZE + nx] === EMPTY)) {
                            // Higher chance to place grass closer to center
                            if (Math.abs(dx) + Math.abs(dy) <= 2 || random() < 0.7) {
                                chunkData[ny * CHUNK_SIZE + nx] = GRASS;
                            }
                        }
                    }
                }
            }
            
            // Sometimes add grass "islands" on top of sand
            if (random() < 0.15 && noiseHeight > 4) {
                // Add a small patch of grass above the surface
                const islandHeight = Math.floor(random() * 2) + 1;
                for (let d = 1; d <= islandHeight; d++) {
                    const ny = floorY - noiseHeight - d;
                    if (ny >= 0) {
                        chunkData[ny * CHUNK_SIZE + x] = GRASS;
                    }
                }
            }
            
            // Randomly spawn tree seeds on grass (reduced frequency)
            if (random() < 0.03) { // Reduced from 8% to 3% chance for a tree seed on grass
                const seedY = floorY - noiseHeight - 1; // Position above the grass
                
                // Check if there are any existing tree seeds within 5 pixels
                let hasSeedNearby = false;
                for (let checkY = Math.max(0, seedY - 5); checkY <= Math.min(CHUNK_SIZE - 1, seedY + 5); checkY++) {
                    for (let checkX = Math.max(0, x - 5); checkX <= Math.min(CHUNK_SIZE - 1, x + 5); checkX++) {
                        if (chunkData[checkY * CHUNK_SIZE + checkX] === TREE_SEED) {
                            hasSeedNearby = true;
                            break;
                        }
                    }
                    if (hasSeedNearby) break;
                }
                
                // Check if there's water below or nearby
                let hasWaterBelow = false;
                for (let checkY = floorY - noiseHeight + 1; checkY < Math.min(CHUNK_SIZE, floorY - noiseHeight + 5); checkY++) {
                    if (chunkData[checkY * CHUNK_SIZE + x] === WATER) {
                        hasWaterBelow = true;
                        break;
                    }
                }
                
                // Only place the seed if there are no other seeds nearby and no water below
                // Place seed 3 pixels above the surface instead of just 1
                const elevatedSeedY = floorY - noiseHeight - 3; // 3 pixels above the grass
                if (!hasSeedNearby && !hasWaterBelow && elevatedSeedY >= 0 && chunkData[(floorY - noiseHeight) * CHUNK_SIZE + x] === GRASS) {
                    chunkData[elevatedSeedY * CHUNK_SIZE + x] = TREE_SEED;
                    // Add metadata for the tree seed
                    const seedMetadata = {
                        age: Math.floor(random() * 50), // Random initial age
                        growthStage: 0,
                        type: 'oak' // Default tree type
                    };
                    // We'll set the metadata when the chunk is actually created
                }
            }
        }
    }
    
    // 2. Add water in more areas with greater depth
    for (let x = 0; x < CHUNK_SIZE; x++) {
        const height = heightMap[x];
        // Add water where the height is close to the minimum (increased threshold)
        if (height <= minHeight + 4) { // Increased from +2 to +4
            // Add more layers of water
            const waterDepth = 5; // Increased from 3 to 5
            for (let d = 0; d < waterDepth; d++) {
                const y = floorY - height - d - 1;
                if (y >= 0) {
                    chunkData[y * CHUNK_SIZE + x] = WATER;
                }
            }
        }
        
        // Sometimes add small water pools in random depressions
        if (random() < 0.1 && height <= minHeight + 8 && height > minHeight + 4) {
            // Add a small pool of water
            const poolDepth = Math.floor(random() * 2) + 1;
            for (let d = 0; d < poolDepth; d++) {
                const y = floorY - height - d - 1;
                if (y >= 0) {
                    chunkData[y * CHUNK_SIZE + x] = WATER;
                }
            }
        }
    }
    
    // Add some connected water channels between pools
    for (let x = 1; x < CHUNK_SIZE - 1; x++) {
        // Check if there's water to the left and right but not at this position
        const y = floorY - heightMap[x] - 1;
        const leftHasWater = x > 0 && chunkData[y * CHUNK_SIZE + (x-1)] === WATER;
        const rightHasWater = x < CHUNK_SIZE-1 && chunkData[y * CHUNK_SIZE + (x+1)] === WATER;
        
        if (leftHasWater && rightHasWater && chunkData[y * CHUNK_SIZE + x] !== WATER) {
            if (random() < 0.7) { // 70% chance to connect water bodies
                chunkData[y * CHUNK_SIZE + x] = WATER;
            }
        }
    }
    
    // Add some random elements based on the chunk position
    if (random() < 0.3) {
        // Add a small tree or plant cluster
        const plantX = Math.floor(random() * CHUNK_SIZE);
        const plantY = floorY - heightMap[plantX] - 1;
        
        if (plantY > 0 && chunkData[plantY * CHUNK_SIZE + plantX] === GRASS) {
            // Add a small tree
            for (let i = 0; i < 3; i++) {
                if (plantY - i > 0) {
                    chunkData[(plantY - i) * CHUNK_SIZE + plantX] = WOOD;
                }
            }
            
            // Add some leaves
            for (let dy = -2; dy <= 0; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const leafX = plantX + dx;
                    const leafY = plantY - 3 + dy;
                    
                    if (leafX >= 0 && leafX < CHUNK_SIZE && leafY >= 0 && 
                        Math.abs(dx) + Math.abs(dy) < 3) {
                        chunkData[leafY * CHUNK_SIZE + leafX] = LEAF;
                    }
                }
            }
        }
    }
    
    // Add additional tree seeds scattered throughout the terrain with minimum spacing
    const treePositions = []; // Track positions of placed tree seeds
    
    for (let x = 0; x < CHUNK_SIZE; x += 15 + Math.floor(random() * 20)) { // Increased spacing from 5-15 to 15-35
        const height = heightMap[x];
        const surfaceY = floorY - height;
        
        // Only place seeds on grass
        if (chunkData[surfaceY * CHUNK_SIZE + x] === GRASS) {
            // Reduced from 25% to 10% chance for a tree seed at each valid position
            if (random() < 0.1) {
                const seedY = surfaceY - 3; // Position 3 pixels above the grass instead of just 1
                
                // Check if this position is at least 5 pixels away from any existing tree seed
                let tooClose = false;
                for (const pos of treePositions) {
                    const distance = Math.abs(x - pos.x) + Math.abs(seedY - pos.y); // Manhattan distance
                    if (distance < 5) {
                        tooClose = true;
                        break;
                    }
                }
                
                // Check if there's water below or nearby
                let hasWaterBelow = false;
                for (let checkY = surfaceY + 1; checkY < Math.min(CHUNK_SIZE, surfaceY + 5); checkY++) {
                    if (chunkData[checkY * CHUNK_SIZE + x] === WATER) {
                        hasWaterBelow = true;
                        break;
                    }
                }
                
                // Only place the seed if it's not too close to another seed and no water below
                if (!tooClose && !hasWaterBelow && seedY >= 0) {
                    chunkData[seedY * CHUNK_SIZE + x] = TREE_SEED;
                    treePositions.push({ x, y: seedY });
                }
            }
        }
    }
    
    // Add some flower seeds in clusters near grass
    for (let i = 0; i < 3; i++) { // Create a few flower clusters
        const clusterX = Math.floor(random() * CHUNK_SIZE);
        const clusterY = floorY - heightMap[clusterX];
        
        if (chunkData[clusterY * CHUNK_SIZE + clusterX] === GRASS) {
            // Create a small cluster of flower seeds
            for (let dy = -1; dy <= 0; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const seedX = clusterX + dx;
                    const seedY = clusterY + dy - 1; // Above the grass
                    
                    if (seedX >= 0 && seedX < CHUNK_SIZE && seedY >= 0 && 
                        random() < 0.6 && // 60% chance for each position in the cluster
                        chunkData[(seedY+1) * CHUNK_SIZE + seedX] === GRASS) {
                        chunkData[seedY * CHUNK_SIZE + seedX] = SEED;
                    }
                }
            }
        }
    }
}

function getChunkCoordinates(worldX, worldY) {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    
    return { chunkX, chunkY, localX, localY };
}

function setPixel(worldX, worldY, type) {
    const { chunkX, chunkY, localX, localY } = getChunkCoordinates(worldX, worldY);
    const chunk = getOrCreateChunk(chunkX, chunkY);
    const index = localY * CHUNK_SIZE + localX;
    
    // Only update if the pixel type is changing
    if (chunk[index] !== type) {
        chunk[index] = type;
        
        // Mark chunk as dirty for rendering
        dirtyChunks.add(getChunkKey(chunkX, chunkY));
        
        // Assign random color index for natural elements
        if (type === DIRT || type === GRASS || type === STONE || type === WOOD || type === LEAF) {
            const colorIndex = Math.floor(Math.random() * 10);
            setMetadata(worldX, worldY, { ...getMetadata(worldX, worldY) || {}, colorIndex });
        }
        else if (type === WATER) {
            const colorIndex = Math.floor(Math.random() * 10);
            setMetadata(worldX, worldY, { ...getMetadata(worldX, worldY) || {}, colorIndex, waterColorTimer: 0 });
        }
        else if (type === TREE_SEED) {
            // Initialize tree seed metadata
            setMetadata(worldX, worldY, { 
                age: Math.floor(Math.random() * 50), // Random initial age
                growthStage: 0,
                type: Math.random() < 0.8 ? 'oak' : 'pine' // 80% oak, 20% pine
            });
        }
        else if (type === SEED) {
            // Initialize flower seed metadata
            setMetadata(worldX, worldY, { 
                age: Math.floor(Math.random() * 30),
                growthStage: 0,
                flowerType: Math.floor(Math.random() * 5) // Different flower types
            });
        }
    }
}

function getPixel(worldX, worldY) {
    const { chunkX, chunkY, localX, localY } = getChunkCoordinates(worldX, worldY);
    const key = getChunkKey(chunkX, chunkY);
    
    if (!chunks.has(key)) {
        return EMPTY;
    }
    
    const chunk = chunks.get(key);
    const index = localY * CHUNK_SIZE + localX;
    
    return chunk[index];
}

// Metadata functions to store additional information about pixels
function setMetadata(worldX, worldY, data) {
    const key = `${worldX},${worldY}`;
    metadata.set(key, data);
}

function getMetadata(worldX, worldY) {
    const key = `${worldX},${worldY}`;
    return metadata.get(key);
}

function removeMetadata(worldX, worldY) {
    const key = `${worldX},${worldY}`;
    metadata.delete(key);
}

// Move metadata when a pixel moves
function moveMetadata(fromX, fromY, toX, toY) {
    const data = getMetadata(fromX, fromY);
    if (data) {
        setMetadata(toX, toY, data);
        removeMetadata(fromX, fromY);
        
        // Mark chunks as dirty for rendering
        const { chunkX: fromChunkX, chunkY: fromChunkY } = getChunkCoordinates(fromX, fromY);
        const { chunkX: toChunkX, chunkY: toChunkY } = getChunkCoordinates(toX, toY);
        
        dirtyChunks.add(getChunkKey(fromChunkX, fromChunkY));
        dirtyChunks.add(getChunkKey(toChunkX, toChunkY));
    }
}

function getVisibleChunks() {
    const visibleChunks = [];
    
    // Calculate visible chunk range (chunks that might be visible on screen)
    const startChunkX = Math.floor(worldOffsetX / CHUNK_SIZE) - 1;
    const endChunkX = Math.ceil((worldOffsetX + canvas.width / PIXEL_SIZE) / CHUNK_SIZE) + 1;
    const startChunkY = Math.floor(worldOffsetY / CHUNK_SIZE) - 1;
    const endChunkY = Math.ceil((worldOffsetY + canvas.height / PIXEL_SIZE) / CHUNK_SIZE) + 1;
    
    // Calculate the exact visible area in world coordinates
    const visibleStartX = worldOffsetX;
    const visibleEndX = worldOffsetX + canvas.width / PIXEL_SIZE;
    const visibleStartY = worldOffsetY;
    const visibleEndY = worldOffsetY + canvas.height / PIXEL_SIZE;
    
    for (let chunkY = startChunkY; chunkY < endChunkY; chunkY++) {
        for (let chunkX = startChunkX; chunkX < endChunkX; chunkX++) {
            // Calculate chunk boundaries in world coordinates
            const chunkWorldStartX = chunkX * CHUNK_SIZE;
            const chunkWorldEndX = (chunkX + 1) * CHUNK_SIZE;
            const chunkWorldStartY = chunkY * CHUNK_SIZE;
            const chunkWorldEndY = (chunkY + 1) * CHUNK_SIZE;
            
            // Check if this chunk is actually visible in the viewport
            const isVisible = !(
                chunkWorldEndX < visibleStartX ||
                chunkWorldStartX > visibleEndX ||
                chunkWorldEndY < visibleStartY ||
                chunkWorldStartY > visibleEndY
            );
            
            visibleChunks.push({ chunkX, chunkY, isVisible });
        }
    }
    
    return visibleChunks;
}

function generateChunksAroundPlayer() {
    const centerChunkX = Math.floor(worldOffsetX / CHUNK_SIZE);
    const centerChunkY = Math.floor(worldOffsetY / CHUNK_SIZE);
    const radius = 3; // Generate chunks within 3 chunks of the player
    
    // Get visible chunks to prioritize their generation
    const visibleChunks = getVisibleChunks();
    const visibleChunkKeys = new Set(visibleChunks.map(chunk => getChunkKey(chunk.chunkX, chunk.chunkY)));
    
    // Always generate the stone layer at y = 1 for visible chunks first
    for (let dx = -radius; dx <= radius; dx++) {
        const chunkX = centerChunkX + dx;
        const chunkY = 1; // The chunk at y = 1 (moved from y = -1)
        const key = getChunkKey(chunkX, chunkY);
        
        // Always generate stone layer chunks
        const isNewChunk = !chunks.has(key);
        getOrCreateChunk(chunkX, chunkY);
        
        // Mark as dirty only if it's a new chunk
        if (isNewChunk) {
            dirtyChunks.add(key);
        }
    }
    
    // Generate visible chunks first
    for (const { chunkX, chunkY, isVisible } of visibleChunks) {
        if (isVisible) {
            getOrCreateChunk(chunkX, chunkY);
        }
    }
    
    // Then generate non-visible chunks within the radius (with lower priority)
    // Always generate the stone layer at y = 1 for remaining chunks
    for (let dx = -radius; dx <= radius; dx++) {
        const chunkX = centerChunkX + dx;
        const chunkY = 1;
        const key = getChunkKey(chunkX, chunkY);
        
        // Skip if already generated
        if (!visibleChunkKeys.has(key)) {
            getOrCreateChunk(chunkX, chunkY);
        }
    }
    
    // Generate remaining chunks in a square around the player
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const chunkX = centerChunkX + dx;
            const chunkY = centerChunkY + dy;
            const key = getChunkKey(chunkX, chunkY);
            
            // Skip if already generated
            if (!visibleChunkKeys.has(key)) {
                getOrCreateChunk(chunkX, chunkY);
            }
        }
    }
}
