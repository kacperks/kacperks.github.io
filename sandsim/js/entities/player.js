// Player entity class
class Player extends Entity {
    constructor(x, y, options = {}) {
        super(ENTITY_TYPES.PLAYER, x, y, {
            width: 3,  // 50% smaller collision box width
            height: 6, // 50% smaller collision box height
            ...options
        });
        
        // Load player sprite
        this.sprite = new Image();
        this.sprite.src = 'sprites/player.png';
        
        // Movement properties
        this.moveSpeed = 0.03;
        this.jumpForce = -0.2;
        this.gravity = 0.02;
        this.maxVelocity = 0.5;
        this.friction = 0.9;
        
        // State tracking
        this.isJumping = false;
        this.direction = 1; // 1 = right, -1 = left
        this.lastUpdate = performance.now();
        this.lastDirection = 1; // Track last direction to prevent unnecessary flipping
        this.isClimbing = false; // Track climbing state
        
        // Player stats
        this.maxHealth = 100;
        this.health = 100;
        this.breakingPower = 1;
        this.breakingRange = 10; // Increased from 3 to 10 pixels
        this.isBreaking = false;
        this.breakingCooldown = 0;
        this.breakingCooldownMax = 10;
        
        // Inventory
        this.inventory = {
            sand: 0,
            water: 0,
            dirt: 0,
            stone: 0,
            wood: 0,
            grass: 0,
            seed: 0
        };
        
        // Animation properties
        this.frameWidth = 32;
        this.frameHeight = 30;
        this.frameCount = 4;
        this.currentFrame = 0;
        this.animationSpeed = 150; // ms per frame
        this.lastFrameUpdate = 0;
        this.isMoving = false;
        this.animationTimer = 0; // Consistent timer for animation
    }
    
    update() {
        const now = performance.now();
        const deltaTime = Math.min(50, now - this.lastUpdate);
        this.lastUpdate = now;
        
        // Apply gravity
        this.vy += this.gravity;
        
        // Cap velocity
        if (this.vx > this.maxVelocity) this.vx = this.maxVelocity;
        if (this.vx < -this.maxVelocity) this.vx = -this.maxVelocity;
        if (this.vy > this.maxVelocity * 2) this.vy = this.maxVelocity * 2;
        
        // Apply friction when not actively moving
        if (!this.isMoving) {
            this.vx *= this.friction;
        }
        
        // Calculate new position
        let newX = this.x + this.vx * deltaTime;
        let newY = this.y + this.vy * deltaTime;
        
        // Check for collisions
        const collisionResult = this.checkCollisions(newX, newY);
        
        if (collisionResult.collision) {
            if (collisionResult.horizontal) {
                // Try to climb up if there's a 1-pixel step
                if (this.tryClimbing(newX, newY)) {
                    // Successfully climbed, continue with adjusted position
                    newY -= 1; // Move up one pixel to climb
                } else {
                    // Can't climb, stop horizontal movement
                    newX = this.x;
                    this.vx = 0;
                }
            }
            
            if (collisionResult.vertical) {
                if (this.vy > 0) {
                    this.isJumping = false;
                }
                newY = this.y;
                this.vy = 0;
            }
        }
        
        // Update position
        this.x = newX;
        this.y = newY;
        
        // Update breaking cooldown
        if (this.breakingCooldown > 0) {
            this.breakingCooldown--;
        }
        
        // Handle breaking action
        if (this.isBreaking && this.breakingCooldown <= 0) {
            this.breakBlock();
            this.breakingCooldown = this.breakingCooldownMax;
        }
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Center camera on player
        this.centerCamera();
        
        // Update HUD
        this.updateHUD();
        
        return true;
    }
    
    updateAnimation(deltaTime) {
        // Update animation timer consistently
        this.animationTimer += deltaTime;
        
        // Only update direction when it actually changes to prevent flipping
        if (Math.abs(this.vx) > 0.005) {
            const newDirection = this.vx > 0 ? 1 : -1;
            if (newDirection !== this.lastDirection) {
                this.direction = newDirection;
                this.lastDirection = newDirection;
            }
        }
        
    }
    
    render(ctx, offsetX, offsetY) {
        const screenX = (this.x - offsetX) * PIXEL_SIZE;
        const screenY = (this.y - offsetY) * PIXEL_SIZE;
        
        if (this.sprite && this.sprite.complete) {
            // Set pixelated rendering (nearest neighbor)
            ctx.imageSmoothingEnabled = false;
            
            ctx.save();
            ctx.translate(screenX, screenY);
            
            // Use 50% smaller dimensions for the sprite
            const spriteDisplayWidth = 12 * (PIXEL_SIZE / 2);  // 50% smaller sprite
            const spriteDisplayHeight = 12 * (PIXEL_SIZE / 2); // 50% smaller sprite
            
            // Flip horizontally based on direction
            if (this.direction < 0) {
                ctx.scale(-1, 1);
            }
            
            // Draw the correct sprite frame
            // Center the sprite on the entity position, with y-offset to align feet with collision box
            // Stretch the sprite vertically to match the collision box height
            ctx.drawImage(
                this.sprite,
                this.currentFrame * this.frameWidth, 0,
                this.frameWidth, this.frameHeight,
                -spriteDisplayWidth / 2, -spriteDisplayHeight / 2, // Remove the negative offset that caused levitation
                spriteDisplayWidth, spriteDisplayHeight * 1.2 // Stretch sprite vertically by 20% to match collision box
            );
            
            ctx.restore();
            // Reset image smoothing for other rendering
            ctx.imageSmoothingEnabled = true;
            
            // Draw collision box in debug mode
            if (debugMode) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    screenX - this.width * PIXEL_SIZE / 2,
                    screenY - this.height * PIXEL_SIZE / 2,
                    this.width * PIXEL_SIZE,
                    this.height * PIXEL_SIZE
                );
                
                // Also draw sprite boundary in debug mode
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    screenX - spriteDisplayWidth / 2,
                    screenY - spriteDisplayHeight / 2, // Match the updated sprite drawing position
                    spriteDisplayWidth,
                    spriteDisplayHeight * 1.2 // Match the stretched sprite height
                );
                
                // Draw a dot at the entity's exact position
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    moveLeft() {
        this.vx = -this.moveSpeed;
        this.direction = -1;
        this.isMoving = true;
    }
    
    moveRight() {
        this.vx = this.moveSpeed;
        this.direction = 1;
        this.isMoving = true;
    }
    
    moveUp() {
        this.vy = -this.moveSpeed;
        this.isMoving = true;
    }
    
    moveDown() {
        this.vy = this.moveSpeed;
        this.isMoving = true;
    }
    
    stopMoving() {
        this.isMoving = false;
    }
    
    jump() {
        if (!this.isJumping) {
            this.vy = this.jumpForce;
            this.isJumping = true;
        }
    }
    
    startBreaking() {
        this.isBreaking = true;
    }
    
    stopBreaking() {
        this.isBreaking = false;
    }
    
    breakBlock() {
        // Get mouse position in world coordinates
        const worldX = Math.floor(currentMouseX / PIXEL_SIZE) + worldOffsetX;
        const worldY = Math.floor(currentMouseY / PIXEL_SIZE) + worldOffsetY;
        
        // Calculate distance from player to target block
        const distance = Math.sqrt(
            Math.pow(worldX - this.x, 2) + 
            Math.pow(worldY - this.y, 2)
        );
        
        // Only break blocks within range
        if (distance <= this.breakingRange) {
            // Get the block type at that position
            const blockType = getPixel(worldX, worldY);
            
            // Only break non-empty blocks that aren't special entities
            if (blockType !== EMPTY && 
                blockType !== WATER && 
                blockType !== FIRE &&
                blockType !== SQUARE && 
                blockType !== CIRCLE && 
                blockType !== TRIANGLE) {
                
                // Add to inventory based on block type
                this.addToInventory(blockType);
                
                // Replace with empty space
                setPixel(worldX, worldY, EMPTY);
                
                // Create a breaking effect (particles)
                this.createBreakingEffect(worldX, worldY, blockType);
            }
        }
    }
    
    addToInventory(blockType) {
        // Map block type to inventory item
        switch(blockType) {
            case SAND:
                this.inventory.sand++;
                break;
            case DIRT:
                this.inventory.dirt++;
                break;
            case STONE:
                this.inventory.stone++;
                break;
            case GRASS:
                this.inventory.grass++;
                break;
            case WOOD:
                this.inventory.wood++;
                break;
            case SEED:
            case TREE_SEED:
                this.inventory.seed++;
                break;
        }
    }
    
    createBreakingEffect(x, y, blockType) {
        // Create a simple particle effect at the breaking location
        // This could be expanded with a proper particle system
        const numParticles = 5;
        
        // For now, we'll just create a visual feedback by setting nearby pixels
        // to a different color briefly, then clearing them
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                // Skip if the pixel is not empty
                if (getPixel(x + dx, y + dy) !== EMPTY) continue;
                
                // Set a temporary pixel
                setPixel(x + dx, y + dy, EMPTY);
                
                // Mark the chunk as dirty for rendering
                const { chunkX, chunkY } = getChunkCoordinates(x + dx, y + dy);
                const key = getChunkKey(chunkX, chunkY);
                dirtyChunks.add(key);
            }
        }
    }
    
    updateHUD() {
        // Get or create the HUD container
        let hudContainer = document.getElementById('player-hud');
        if (!hudContainer) {
            hudContainer = document.createElement('div');
            hudContainer.id = 'player-hud';
            hudContainer.style.position = 'fixed';
            hudContainer.style.bottom = '10px';
            hudContainer.style.left = '10px';
            hudContainer.style.width = '300px';
            hudContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            hudContainer.style.color = 'white';
            hudContainer.style.padding = '10px';
            hudContainer.style.borderRadius = '5px';
            hudContainer.style.fontFamily = 'Arial, sans-serif';
            hudContainer.style.zIndex = '1000';
            document.body.appendChild(hudContainer);
            
            // Create health bar container
            const healthBarContainer = document.createElement('div');
            healthBarContainer.id = 'health-bar-container';
            healthBarContainer.style.width = '100%';
            healthBarContainer.style.height = '20px';
            healthBarContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            healthBarContainer.style.marginBottom = '10px';
            healthBarContainer.style.borderRadius = '3px';
            
            // Create health bar
            const healthBar = document.createElement('div');
            healthBar.id = 'health-bar';
            healthBar.style.width = '100%';
            healthBar.style.height = '100%';
            healthBar.style.backgroundColor = '#4CAF50';
            healthBar.style.borderRadius = '3px';
            healthBar.style.transition = 'width 0.3s';
            
            healthBarContainer.appendChild(healthBar);
            hudContainer.appendChild(healthBarContainer);
            
            // Create inventory container
            const inventoryContainer = document.createElement('div');
            inventoryContainer.id = 'inventory-container';
            inventoryContainer.style.display = 'grid';
            inventoryContainer.style.gridTemplateColumns = 'repeat(7, 1fr)';
            inventoryContainer.style.gap = '5px';
            
            // Create inventory slots
            const inventoryItems = ['sand', 'dirt', 'stone', 'grass', 'wood', 'water', 'seed'];
            inventoryItems.forEach(item => {
                const slot = document.createElement('div');
                slot.id = `inventory-${item}`;
                slot.className = 'inventory-slot';
                slot.style.width = '30px';
                slot.style.height = '30px';
                slot.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                slot.style.borderRadius = '3px';
                slot.style.display = 'flex';
                slot.style.flexDirection = 'column';
                slot.style.alignItems = 'center';
                slot.style.justifyContent = 'center';
                slot.style.fontSize = '10px';
                slot.style.position = 'relative';
                
                // Create item icon
                const icon = document.createElement('div');
                icon.style.width = '20px';
                icon.style.height = '20px';
                icon.style.borderRadius = '3px';
                
                // Set color based on item type
                switch(item) {
                    case 'sand': icon.style.backgroundColor = '#e6c588'; break;
                    case 'dirt': icon.style.backgroundColor = '#8B4513'; break;
                    case 'stone': icon.style.backgroundColor = '#A9A9A9'; break;
                    case 'grass': icon.style.backgroundColor = '#7CFC00'; break;
                    case 'wood': icon.style.backgroundColor = '#8B5A2B'; break;
                    case 'water': icon.style.backgroundColor = '#4a80f5'; break;
                    case 'seed': icon.style.backgroundColor = '#654321'; break;
                }
                
                // Create count label
                const count = document.createElement('div');
                count.id = `${item}-count`;
                count.style.position = 'absolute';
                count.style.bottom = '2px';
                count.style.right = '2px';
                count.style.fontSize = '8px';
                count.style.fontWeight = 'bold';
                count.textContent = '0';
                
                slot.appendChild(icon);
                slot.appendChild(count);
                inventoryContainer.appendChild(slot);
            });
            
            hudContainer.appendChild(inventoryContainer);
            
            // Create controls help text
            const controlsHelp = document.createElement('div');
            controlsHelp.style.marginTop = '10px';
            controlsHelp.style.fontSize = '10px';
            controlsHelp.style.color = '#aaa';
            controlsHelp.innerHTML = 'Controls: A/D - Move, W/Space - Jump, E - Break blocks';
            
            hudContainer.appendChild(controlsHelp);
        }
        
        // Update health bar
        const healthBar = document.getElementById('health-bar');
        if (healthBar) {
            const healthPercent = (this.health / this.maxHealth) * 100;
            healthBar.style.width = `${healthPercent}%`;
            
            // Change color based on health
            if (healthPercent > 60) {
                healthBar.style.backgroundColor = '#4CAF50'; // Green
            } else if (healthPercent > 30) {
                healthBar.style.backgroundColor = '#FFC107'; // Yellow
            } else {
                healthBar.style.backgroundColor = '#F44336'; // Red
            }
        }
        
        // Update inventory counts
        for (const [item, count] of Object.entries(this.inventory)) {
            const countElement = document.getElementById(`${item}-count`);
            if (countElement) {
                countElement.textContent = count;
            }
        }
    }
    
    // Try to climb up a small step
    tryClimbing(newX, newY) {
        const halfWidth = this.width / 2;
        
        // Check if there's a solid pixel in front of the player
        const frontX = newX + (this.direction * halfWidth);
        const frontY = newY;
        
        // Check if there's a solid pixel at the current level
        if (this.isPixelSolid(frontX, frontY)) {
            // Check if there's empty space one pixel above
            if (!this.isPixelSolid(frontX, frontY - 1) && 
                !this.isPixelSolid(this.x, this.y - 1)) {
                
                // Check if there's ground to stand on after climbing
                if (this.isPixelSolid(frontX, frontY + 1)) {
                    this.isClimbing = true;
                    return true;
                }
            }
        }
        
        this.isClimbing = false;
        return false;
    }
    
    centerCamera() {
        // Get current camera center in world coordinates
        const cameraWidth = canvas.width / PIXEL_SIZE;
        const cameraHeight = canvas.height / PIXEL_SIZE;
        const cameraCenterX = worldOffsetX + cameraWidth / 2;
        const cameraCenterY = worldOffsetY + cameraHeight / 2;
        
        // Calculate distance from player to camera center
        const distanceX = Math.abs(this.x - cameraCenterX);
        const distanceY = Math.abs(this.y - cameraCenterY);
        
        // Define thresholds for camera movement (percentage of screen size)
        const thresholdX = cameraWidth * 0.2; // Move when player is 30% away from center
        const thresholdY = cameraHeight * 0.2;
        
        // Only move camera when player gets close to the edge of current view
        let needsUpdate = false;
        
        if (distanceX > thresholdX) {
            // Calculate target position with chunk-based snapping
            const chunkSize = CHUNK_SIZE;
            const playerChunkX = Math.floor(this.x / chunkSize);
            const targetX = this.x - (canvas.width / PIXEL_SIZE / 2);
            
            // Smooth transition to the target position
            worldOffsetX += (targetX - worldOffsetX) * 0.2;
            needsUpdate = true;
        }
        
        if (distanceY > thresholdY) {
            // Calculate target position with chunk-based snapping
            const chunkSize = CHUNK_SIZE;
            const playerChunkY = Math.floor(this.y / chunkSize);
            const targetY = this.y - (canvas.height / PIXEL_SIZE / 2);
            
            // Smooth transition to the target position
            worldOffsetY += (targetY - worldOffsetY) * 0.1;
            needsUpdate = true;
        }
        
        // Only mark world as moved if we actually updated the camera
        if (needsUpdate) {
            worldMoved = true;
        }
    }
}
