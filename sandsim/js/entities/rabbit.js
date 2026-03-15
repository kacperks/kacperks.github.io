// Rabbit entity
class Rabbit extends Entity {
    constructor(x, y, options = {}) {
        super(ENTITY_TYPES.RABBIT, x, y, {
            width: 6,  // Smaller size for rabbit
            height: 6,
            ...options
        });
        
        // Load rabbit sprite
        this.sprite = new Image();
        this.sprite.src = 'sprites/rabbit.png';
        
        // Rabbit specific properties
        this.jumpCooldown = 0;
        this.jumpForce = -3.5;
        this.moveSpeed = 0.8;
        this.direction = Math.random() > 0.5 ? 1 : -1; // 1 for right, -1 for left
        this.isJumping = false;
        this.thinkTimer = 0;
        this.actionDuration = 0;
        this.currentAction = 'idle';
        
        // Apply gravity
        this.gravity = 0.2;
    }
    
    update() {
        const now = performance.now();
        const deltaTime = Math.min(50, now - this.lastUpdate);
        this.lastUpdate = now;
        
        // Apply gravity
        this.vy += this.gravity;
        
        // Calculate new position
        let newX = this.x + this.vx;
        let newY = this.y + this.vy;
        
        // Check for collisions
        const collisionResult = this.checkCollisions(newX, newY);
        
        if (collisionResult.collision) {
            if (collisionResult.horizontal) {
                // Hit a wall, reverse direction
                this.direction *= -1;
                this.vx = this.moveSpeed * this.direction;
                newX = this.x; // Don't move horizontally this frame
            }
            
            if (collisionResult.vertical) {
                if (collisionResult.ground) {
                    // Landed on ground
                    this.vy = 0;
                    this.isJumping = false;
                    
                    // Find exact ground position
                    while (this.isPixelSolid(this.x, newY)) {
                        newY--;
                    }
                    newY = Math.floor(newY) + 0.5; // Position just above ground (reduced from 0.99)
                } else {
                    // Hit ceiling
                    this.vy = 0;
                    newY = this.y;
                }
            }
        }
        
        // Update position
        this.x = newX;
        this.y = newY;
        
        // Update jump cooldown
        if (this.jumpCooldown > 0) {
            this.jumpCooldown--;
        }
        
        // AI behavior
        this.thinkTimer++;
        if (this.thinkTimer >= 30) { // Think every 30 frames
            this.thinkTimer = 0;
            this.think();
        }
        
        // Update action duration
        if (this.actionDuration > 0) {
            this.actionDuration--;
        } else if (this.currentAction !== 'idle') {
            this.currentAction = 'idle';
            this.vx = 0;
        }
        
        // Update sprite direction but only flip the sprite, not rotate it
        this.flipped = this.direction < 0;
        
        // Only apply rotation when jumping
        if (this.isJumping) {
            this.rotation = this.direction < 0 ? -0.2 : 0.2;
        } else {
            this.rotation = 0;
        }
        
        return true;
    }
    
    think() {
        // Only make decisions when on the ground and not already in an action
        if (!this.isJumping && this.actionDuration <= 0) {
            const decision = Math.random();
            
            if (decision < 0.5) {  // Increased from 0.2 to 0.5 for more frequent jumping
                // Jump
                this.jump();
            } else if (decision < 0.8) {  // Adjusted range
                // Move
                this.move();
            } else {
                // Idle
                this.idle();
            }
        }
    }
    
    jump() {
        if (!this.isJumping && this.jumpCooldown <= 0) {
            this.vy = this.jumpForce;
            this.vx = this.moveSpeed * this.direction;
            this.isJumping = true;
            this.jumpCooldown = 20;
            this.currentAction = 'jump';
            this.actionDuration = 30;
        }
    }
    
    move() {
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.vx = this.moveSpeed * this.direction;
        this.currentAction = 'move';
        this.actionDuration = 60 + Math.floor(Math.random() * 60);
    }
    
    idle() {
        this.vx = 0;
        this.currentAction = 'idle';
        this.actionDuration = 30 + Math.floor(Math.random() * 30);
    }
}
