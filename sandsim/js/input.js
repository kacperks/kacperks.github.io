// Input handling functions
let isDrawing = false;
let isDragging = false;
let lastMouseX, lastMouseY;
let currentMouseX, currentMouseY;

// Keyboard state tracking
const keyState = {};
let player = null;

// Handle keyboard input for player movement
window.addEventListener('keydown', (e) => {
    keyState[e.code] = true;
    
    // Toggle debug mode with F3
    if (e.code === 'F3') {
        toggleDebug();
        e.preventDefault();
    }
    
    // Start breaking blocks with E key or left mouse button
    if (e.code === 'KeyE' && player) {
        player.startBreaking();
    }
    
    // Prevent default behavior for game control keys
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE'].includes(e.code)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
    
    // Stop breaking blocks when E key is released
    if (e.code === 'KeyE' && player) {
        player.stopBreaking();
    }
});

function updatePlayerMovement() {
    if (!player) return;
    
    // Reset movement flag
    player.stopMoving();
    
    // Handle movement
    if (keyState['KeyA']) {
        player.moveLeft();
    }
    if (keyState['KeyD']) {
        player.moveRight();
    }
    if (keyState['KeyW'] || keyState['Space']) {
        player.jump();
    }
}

function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tools button').forEach(btn => btn.classList.remove('active'));
    
    if (tool === SAND) {
        document.getElementById('sand-btn').classList.add('active');
    } else if (tool === WATER) {
        document.getElementById('water-btn').classList.add('active');
    } else if (tool === DIRT) {
        document.getElementById('dirt-btn').classList.add('active');
    } else if (tool === STONE) {
        document.getElementById('stone-btn').classList.add('active');
    } else if (tool === GRASS) {
        document.getElementById('grass-btn').classList.add('active');
    } else if (tool === WOOD) {
        document.getElementById('wood-btn').classList.add('active');
    } else if (tool === SEED) {
        document.getElementById('seed-btn').classList.add('active');
    } else if (tool === TREE_SEED) {
        document.getElementById('tree-seed-btn').classList.add('active');
    } else if (tool === FIRE) {
        document.getElementById('fire-btn').classList.add('active');
    } else if (tool === LAVA) {
        document.getElementById('lava-btn').classList.add('active');
    } else if (tool === RABBIT) {
        document.getElementById('rabbit-btn').classList.add('active');
    } else if (tool === SQUARE) {
        document.getElementById('square-btn').classList.add('active');
    } else if (tool === CIRCLE) {
        document.getElementById('circle-btn').classList.add('active');
    } else if (tool === TRIANGLE) {
        document.getElementById('triangle-btn').classList.add('active');
    } else if (tool === EMPTY) {
        document.getElementById('eraser-btn').classList.add('active');
    }
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Right mouse button for dragging the world
    if (e.button === 2 || e.ctrlKey || e.shiftKey) {
        isDragging = true;
        lastMouseX = x;
        lastMouseY = y;
        worldOffsetXBeforeDrag = worldOffsetX;
        worldOffsetYBeforeDrag = worldOffsetY;
    } else {
        // Left mouse button for drawing or breaking blocks
        if (player) {
            // If player exists, start breaking blocks
            player.startBreaking();
        } else {
            // Otherwise use normal drawing
            isDrawing = true;
            draw(x, y);
        }
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Always update current mouse position
    currentMouseX = x;
    currentMouseY = y;
    
    if (isDragging) {
        // Calculate how much the mouse has moved
        const dx = x - lastMouseX;
        const dy = y - lastMouseY;
        
        // Move the world in the opposite direction (divide by pixel size to convert to world coordinates)
        moveWorld(-dx / PIXEL_SIZE, -dy / PIXEL_SIZE);
        
        // Update the last mouse position
        lastMouseX = x;
        lastMouseY = y;
    } else if (isDrawing) {
        draw(x, y);
    }
}

function handleMouseUp(e) {
    isDrawing = false;
    if (isDragging) {
        // Calculate the total movement during this drag
        const totalDragX = worldOffsetX - worldOffsetXBeforeDrag;
        const totalDragY = worldOffsetY - worldOffsetYBeforeDrag;
        
        if (debugMode) {
            console.log(`Drag completed: ${totalDragX}, ${totalDragY}`);
        }
    }
    isDragging = false;
    
    // Stop breaking blocks if player exists
    if (player) {
        player.stopBreaking();
    }
}

function draw(x, y) {
    if (!isDrawing) return;
    
    // Convert screen coordinates to world coordinates
    const worldX = Math.floor(x / PIXEL_SIZE) + worldOffsetX;
    const worldY = Math.floor(y / PIXEL_SIZE) + worldOffsetY;
    
    // Special handling for physics objects
    if (currentTool === SQUARE || currentTool === CIRCLE || currentTool === TRIANGLE) {
        // Create a physics object at the cursor position
        const size = 10; // Default size
        createPhysicsObject(currentTool, worldX, worldY, size);
        return;
    }
    
    // Draw a small brush (3x3)
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const pixelX = worldX + dx;
            const pixelY = worldY + dy;
            
            // Special handling for fire - only set fire to flammable materials
            if (currentTool === FIRE) {
                const currentPixel = getPixel(pixelX, pixelY);
                if (FLAMMABLE_MATERIALS.includes(currentPixel)) {
                    setPixel(pixelX, pixelY, FIRE);
                    setMetadata(pixelX, pixelY, { 
                        lifetime: 100 + Math.floor(Math.random() * 100),
                        colorIndex: Math.floor(Math.random() * FIRE_COLORS.length)
                    });
                }
            } 
            // Special handling for rabbits - create rabbit entity
            else if (currentTool === RABBIT) {
                createEntity(ENTITY_TYPES.RABBIT, pixelX, pixelY);
                return; // Only create one rabbit per click
            } else {
                setPixel(pixelX, pixelY, currentTool);
                
                // Add metadata for special types
                if (currentTool === SEED) {
                    setMetadata(pixelX, pixelY, { type: 'regular' });
                } else if (currentTool === FLOWER) {
                    setMetadata(pixelX, pixelY, { 
                        type: 'flower',
                        color: FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
                        age: 0,
                        height: 1
                    });
                }
            }
        }
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    
    // Check if we have multiple touch points (for dragging)
    if (e.touches.length > 1) {
        isDragging = true;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
        worldOffsetXBeforeDrag = worldOffsetX;
        worldOffsetYBeforeDrag = worldOffsetY;
    } else {
        // Single touch for drawing
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        currentMouseX = x;
        currentMouseY = y;
        draw(x, y);
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    
    if (isDragging && e.touches.length > 1) {
        // Calculate how much the touch has moved
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        const dx = x - lastMouseX;
        const dy = y - lastMouseY;
        
        // Move the world in the opposite direction
        moveWorld(-dx / PIXEL_SIZE, -dy / PIXEL_SIZE);
        
        // Update the last touch position
        lastMouseX = x;
        lastMouseY = y;
    } else if (isDrawing) {
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        currentMouseX = x;
        currentMouseY = y;
        draw(x, y);
    }
}

function toggleDebug() {
    debugMode = !debugMode;
    document.getElementById('debug-btn').classList.toggle('active');
    
    // Update UI to show debug mode is active
    if (debugMode) {
        // Show a temporary notification
        const notification = document.createElement('div');
        notification.textContent = 'Debug Mode: ON';
        notification.style.position = 'fixed';
        notification.style.top = '10px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        document.body.appendChild(notification);
        
        // Remove notification after 2 seconds
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 2000);
    }
}
