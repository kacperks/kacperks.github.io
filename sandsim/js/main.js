// Main game variables and initialization
let canvas, ctx;
let currentTool = SAND;
let lastFrameTime = 0;
let fps = 0;
let debugMode = false;

// Sky background variables
const SKY_COLORS = [
    '#4a90e2', // Brighter blue
    '#74b9ff', // Light blue
    '#81ecec', // Very light blue/cyan
];
let skyAnimationTime = 0;
let skyAnimationSpeed = 0.0005; // Controls how fast the sky position animates (not color)

// Initialize the simulation
window.onload = function() {
    canvas = document.getElementById('simulation-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size to fill the screen
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Tool selection
    document.getElementById('sand-btn').addEventListener('click', () => setTool(SAND));
    document.getElementById('water-btn').addEventListener('click', () => setTool(WATER));
    document.getElementById('dirt-btn').addEventListener('click', () => setTool(DIRT));
    document.getElementById('stone-btn').addEventListener('click', () => setTool(STONE));
    document.getElementById('grass-btn').addEventListener('click', () => setTool(GRASS));
    document.getElementById('wood-btn').addEventListener('click', () => setTool(WOOD));
    document.getElementById('seed-btn').addEventListener('click', () => setTool(SEED));
    document.getElementById('tree-seed-btn').addEventListener('click', () => setTool(TREE_SEED));
    document.getElementById('fire-btn').addEventListener('click', () => setTool(FIRE));
    document.getElementById('lava-btn').addEventListener('click', () => setTool(LAVA));
    document.getElementById('rabbit-btn').addEventListener('click', () => setTool(RABBIT));
    document.getElementById('square-btn').addEventListener('click', () => setTool(SQUARE));
    document.getElementById('circle-btn').addEventListener('click', () => setTool(CIRCLE));
    document.getElementById('triangle-btn').addEventListener('click', () => setTool(TRIANGLE));
    document.getElementById('eraser-btn').addEventListener('click', () => setTool(EMPTY));
    
    // Add player spawn button
    document.getElementById('spawn-player-btn').addEventListener('click', spawnPlayer);
    
    // Navigation controls
    document.getElementById('move-left').addEventListener('click', () => moveWorld(-CHUNK_SIZE/2, 0));
    document.getElementById('move-right').addEventListener('click', () => moveWorld(CHUNK_SIZE/2, 0));
    document.getElementById('move-up').addEventListener('click', () => moveWorld(0, -CHUNK_SIZE/2));
    document.getElementById('move-down').addEventListener('click', () => moveWorld(0, CHUNK_SIZE/2));
    document.getElementById('debug-btn').addEventListener('click', toggleDebug);
    
    // Drawing events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleMouseUp);
    
    // Initialize the first chunk and generate terrain around it
    getOrCreateChunk(0, 0);
    
    // Explicitly create and mark the stone layer as dirty
    for (let dx = -5; dx <= 5; dx++) {
        const chunkX = dx;
        const chunkY = 1; // Stone layer
        const key = getChunkKey(chunkX, chunkY);
        getOrCreateChunk(chunkX, chunkY);
        dirtyChunks.add(key);
    }
    
    generateChunksAroundPlayer();
    
    // Start the simulation loop
    requestAnimationFrame(simulationLoop);
    
    // Initialize physics variables
    window.physicsUpdateRate = 16; // ms between physics updates
    window.lastPhysicsTime = 0;
    window.fireUpdateCounter = 0;
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - document.querySelector('.controls').offsetHeight;
}

// Function to spawn player
function spawnPlayer() {
    // Hide HUD elements
    document.querySelector('.controls').style.display = 'none';
    
    // Resize canvas to full screen first
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Set zoom level to 50% more zoomed in (from default 4 to 6)
    PIXEL_SIZE = 6;
    
    // Create player at specified coordinates
    // Position adjusted for proper sprite alignment with smaller sprite
    player = createEntity(ENTITY_TYPES.PLAYER, 229, 40); // Adjusted Y position for smaller player
    
    // Focus camera on player
    worldOffsetX = player.x - (canvas.width / PIXEL_SIZE / 2);
    worldOffsetY = player.y - (canvas.height / PIXEL_SIZE / 2);
    worldMoved = true;
    
    // Clear chunk cache to force redraw at new zoom level
    chunkCanvasCache.clear();
    
    // Remove the event listener for the spawn button to prevent multiple spawns
    document.getElementById('spawn-player-btn').removeEventListener('click', spawnPlayer);
    
    // Create CSS for player HUD
    const style = document.createElement('style');
    style.textContent = `
        #player-hud {
            transition: opacity 0.3s;
        }
        .inventory-slot {
            transition: transform 0.1s;
        }
        .inventory-slot:hover {
            transform: scale(1.1);
            background-color: rgba(255, 255, 255, 0.3) !important;
        }
    `;
    document.head.appendChild(style);
}

function simulationLoop(timestamp) {
    // Calculate FPS
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    fps = Math.round(1000 / deltaTime);
    document.getElementById('fps').textContent = `FPS: ${fps}`;
    
    // Update player movement if player exists
    if (player) {
        updatePlayerMovement();
    }
    
    // Update physics with timestamp for rate limiting
    updatePhysics(timestamp);
    
    // Render - skip rendering if FPS is too low to prevent death spiral
    if (fps > 10 || timestamp % 3 < 1) {
        render();
    }
    
    // Memory management: Clean up chunk cache for chunks that are far away
    if (timestamp % 5000 < 16) { // Run every ~5 seconds
        cleanupChunkCache();
    }
    
    // Continue the loop
    requestAnimationFrame(simulationLoop);
}

// Clean up chunk cache to prevent memory leaks
function cleanupChunkCache() {
    if (!chunkCanvasCache) return;
    
    const visibleChunks = getVisibleChunks();
    const visibleKeys = new Set();
    
    // Get all visible chunk keys
    for (const { chunkX, chunkY } of visibleChunks) {
        visibleKeys.add(getChunkKey(chunkX, chunkY));
    }
    
    // Remove cached canvases for chunks that are far from view
    for (const key of chunkCanvasCache.keys()) {
        if (!visibleKeys.has(key)) {
            // Keep stone layer chunks in cache longer
            if (key.split(',')[1] === '1') {
                // Only remove if it's really far away
                const [chunkX, chunkY] = key.split(',').map(Number);
                const centerChunkX = Math.floor(worldOffsetX / CHUNK_SIZE);
                if (Math.abs(chunkX - centerChunkX) > 10) {
                    chunkCanvasCache.delete(key);
                }
            } else {
                chunkCanvasCache.delete(key);
            }
        }
    }
}
