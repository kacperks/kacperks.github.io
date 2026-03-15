// Terrain generation functions
function generateChunksAroundPlayer() {
    const centerChunkX = Math.floor(worldOffsetX / CHUNK_SIZE);
    const centerChunkY = Math.floor(worldOffsetY / CHUNK_SIZE);
    const radius = 3; // Generate chunks within 3 chunks of the player
    
    // Generate chunks in a square around the player
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const chunkX = centerChunkX + dx;
            const chunkY = centerChunkY + dy;
            
            // Only generate terrain for chunks at or above y=0
            if (chunkY >= 0) {
                getOrCreateChunk(chunkX, chunkY);
            }
        }
    }
}

function generateTerrain(chunkX, chunkY, chunkData) {
    // Use a seeded random number generator based on chunk coordinates
    const seed = chunkX * 10000 + chunkY;
    const random = createSeededRandom(seed);
    
    // Generate base terrain (hills)
    generateHills(chunkX, chunkY, chunkData, random);
    
    // Add lakes
    if (random() < 0.3) { // 30% chance for a lake in a chunk
        generateLake(chunkX, chunkY, chunkData, random);
    }
    
    // Add stone formations
    if (random() < 0.4) { // 40% chance for stone formations
        generateStoneFormation(chunkX, chunkY, chunkData, random);
    }
    
    // Add vegetation (seeds and trees)
    addVegetation(chunkX, chunkY, chunkData, random);
}

function createSeededRandom(seed) {
    // Simple seeded random function
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

function generateHills(chunkX, chunkY, chunkData, random) {
    // Generate a height map for this chunk using simplex-like noise
    const heightMap = new Array(CHUNK_SIZE).fill(0);
    
    // Base height (higher for chunks further from origin)
    const baseHeight = Math.max(0, 50 - Math.sqrt(chunkX*chunkX + chunkY*chunkY) * 5);
    
    // Generate a smooth height map
    for (let x = 0; x < CHUNK_SIZE; x++) {
        // Use multiple frequencies for more natural looking terrain
        const noise1 = Math.sin(x * 0.02 + chunkX * CHUNK_SIZE * 0.02 + random() * 10) * 15;
        const noise2 = Math.sin(x * 0.05 + chunkX * CHUNK_SIZE * 0.05 + random() * 10) * 7;
        const noise3 = Math.sin(x * 0.1 + chunkX * CHUNK_SIZE * 0.1 + random() * 10) * 3;
        
        // Combine noise at different frequencies
        heightMap[x] = Math.floor(baseHeight + noise1 + noise2 + noise3);
        
        // Ensure height is positive
        heightMap[x] = Math.max(0, heightMap[x]);
    }
    
    // Fill the terrain based on the height map
    for (let x = 0; x < CHUNK_SIZE; x++) {
        const height = heightMap[x];
        
        for (let y = CHUNK_SIZE - 1; y >= 0; y--) {
            const worldY = chunkY * CHUNK_SIZE + y;
            const depth = CHUNK_SIZE - 1 - y;
            
            if (depth < height) {
                const index = y * CHUNK_SIZE + x;
                
                // Top layer is grass
                if (depth === 0) {
                    chunkData[index] = GRASS;
                    // Set metadata with color index for grass
                    const worldX = chunkX * CHUNK_SIZE + x;
                    const worldY = chunkY * CHUNK_SIZE + y;
                    setMetadata(worldX, worldY, { colorIndex: Math.floor(Math.random() * 10) });
                }
                // Next few layers are dirt
                else if (depth < 5) {
                    chunkData[index] = DIRT;
                    // Set metadata with color index for dirt
                    const worldX = chunkX * CHUNK_SIZE + x;
                    const worldY = chunkY * CHUNK_SIZE + y;
                    setMetadata(worldX, worldY, { colorIndex: Math.floor(Math.random() * 10) });
                }
                // Deeper layers are stone
                else {
                    chunkData[index] = STONE;
                    // Set metadata with color index for stone
                    const worldX = chunkX * CHUNK_SIZE + x;
                    const worldY = chunkY * CHUNK_SIZE + y;
                    setMetadata(worldX, worldY, { colorIndex: Math.floor(Math.random() * 10) });
                }
            }
        }
    }
}

function generateLake(chunkX, chunkY, chunkData, random) {
    // Lake parameters
    const lakeX = Math.floor(random() * (CHUNK_SIZE - 60)) + 30;
    const lakeY = Math.floor(random() * (CHUNK_SIZE - 60)) + 30;
    const lakeWidth = Math.floor(random() * 40) + 20;
    const lakeHeight = Math.floor(random() * 20) + 10;
    
    // Create an elliptical lake
    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            // Calculate distance from lake center (normalized to create an ellipse)
            const dx = (x - lakeX) / lakeWidth;
            const dy = (y - lakeY) / lakeHeight;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < 1) {
                const index = y * CHUNK_SIZE + x;
                
                // Water in the center
                if (distance < 0.8) {
                    chunkData[index] = WATER;
                }
                // Sand around the edges
                else {
                    chunkData[index] = SAND;
                }
            }
        }
    }
}

function generateStoneFormation(chunkX, chunkY, chunkData, random) {
    // Stone formation parameters
    const formationX = Math.floor(random() * (CHUNK_SIZE - 40)) + 20;
    const formationWidth = Math.floor(random() * 30) + 10;
    const formationHeight = Math.floor(random() * 40) + 20;
    
    // Create a stone hill/mountain
    for (let x = formationX - formationWidth; x < formationX + formationWidth; x++) {
        if (x < 0 || x >= CHUNK_SIZE) continue;
        
        // Calculate height at this x position (higher in the middle)
        const dx = (x - formationX) / formationWidth;
        const height = Math.floor(formationHeight * (1 - dx*dx));
        
        for (let y = CHUNK_SIZE - 1; y >= CHUNK_SIZE - height; y--) {
            if (y < 0 || y >= CHUNK_SIZE) continue;
            
            const index = y * CHUNK_SIZE + x;
            chunkData[index] = STONE;
        }
    }
}

function addVegetation(chunkX, chunkY, chunkData, random) {
    // Add vegetation on grass
    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const index = y * CHUNK_SIZE + x;
            
            // Only add vegetation on grass
            if (chunkData[index] === GRASS) {
                // Check if there's empty space above
                if (y > 0 && chunkData[(y-1) * CHUNK_SIZE + x] === EMPTY) {
                    // Random chance to add different types of vegetation
                    const roll = random();
                    
                    if (roll < 0.01) { // 1% chance for a tree seed
                        chunkData[(y-1) * CHUNK_SIZE + x] = TREE_SEED;
                    } else if (roll < 0.05) { // 4% chance for a regular seed
                        chunkData[(y-1) * CHUNK_SIZE + x] = SEED;
                    }
                }
            }
        }
    }
}
