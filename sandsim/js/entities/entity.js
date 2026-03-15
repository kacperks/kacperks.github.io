// Base entity system
const ENTITY_TYPES = {
    RABBIT: 'rabbit',
    PLAYER: 'player'
};

// Store all entities
const entities = [];

// Base Entity class
class Entity {
    constructor(type, x, y, options = {}) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = options.width || 10;
        this.height = options.height || 10;
        this.rotation = 0;
        this.sprite = null;
        this.flipped = false;
        this.isStatic = false;
        this.lastUpdate = performance.now();
        this.id = Entity.nextId++;
    }

    static nextId = 1;

    update() {
        // Override in subclasses
        return false;
    }

    render(ctx, offsetX, offsetY) {
        // Default rendering - override in subclasses
        const screenX = (this.x - offsetX) * PIXEL_SIZE;
        const screenY = (this.y - offsetY) * PIXEL_SIZE;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.rotation);
        
        if (this.sprite && this.sprite.complete) {
            const width = this.width * PIXEL_SIZE;
            const height = this.height * PIXEL_SIZE;
            
            if (this.flipped) {
                ctx.scale(-1, 1);
                ctx.drawImage(this.sprite, -width/2, -height/2, width, height);
            } else {
                ctx.drawImage(this.sprite, -width/2, -height/2, width, height);
            }
        } else {
            // Fallback if sprite not loaded
            ctx.fillStyle = '#FF00FF';
            ctx.fillRect(
                -this.width/2 * PIXEL_SIZE, 
                -this.height/2 * PIXEL_SIZE, 
                this.width * PIXEL_SIZE, 
                this.height * PIXEL_SIZE
            );
        }
        
        // Draw collision box in debug mode
        if (debugMode) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.strokeRect(
                -this.width/2 * PIXEL_SIZE, 
                -this.height/2 * PIXEL_SIZE, 
                this.width * PIXEL_SIZE, 
                this.height * PIXEL_SIZE
            );
            
            // Draw a dot at the entity's center
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    checkCollisions(newX, newY) {
        const result = {
            collision: false,
            horizontal: false,
            vertical: false,
            ground: false
        };

        // Check points around the entity
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Check bottom points for ground collision - check multiple points along the bottom
        const numBottomPoints = 5;
        let groundCollision = false;
        
        // For player entity, adjust the collision detection to match sprite feet position
        const yOffset = this.type === ENTITY_TYPES.PLAYER ? 2 : 0;
        
        for (let i = 0; i < numBottomPoints; i++) {
            const ratio = i / (numBottomPoints - 1);
            const bottomX = newX - halfWidth + (2 * halfWidth * ratio);
            const bottomY = newY + halfHeight + yOffset;
            
            if (this.isPixelSolid(bottomX, bottomY)) {
                groundCollision = true;
                break;
            }
        }
        
        if (groundCollision) {
            result.collision = true;
            result.vertical = true;
            result.ground = true;
        }
        
        // Check side points for horizontal collision
        // For player entity, adjust the collision detection to match sprite position
        const yAdjust = this.type === ENTITY_TYPES.PLAYER ? -1 : 0;
        
        const leftMiddle = { x: newX - halfWidth, y: newY + yAdjust };
        const rightMiddle = { x: newX + halfWidth, y: newY + yAdjust };
        
        if (this.isPixelSolid(leftMiddle.x, leftMiddle.y)) {
            result.collision = true;
            result.horizontal = true;
        }
        
        if (this.isPixelSolid(rightMiddle.x, rightMiddle.y)) {
            result.collision = true;
            result.horizontal = true;
        }
        
        // Check top for ceiling collision
        const topMiddle = { x: newX, y: newY - halfHeight + (this.type === ENTITY_TYPES.PLAYER ? -2 : 0) };
        if (this.isPixelSolid(topMiddle.x, topMiddle.y)) {
            result.collision = true;
            result.vertical = true;
        }

        return result;
    }

    isPixelSolid(x, y) {
        // Use ceiling for y coordinate to better detect ground below
        const pixel = getPixel(Math.floor(x), Math.ceil(y));
        
        // For player entity, don't collide with trees (WOOD and LEAF)
        if (this.type === ENTITY_TYPES.PLAYER) {
            return pixel !== EMPTY && 
                   pixel !== WATER && 
                   pixel !== FIRE &&
                   pixel !== SQUARE && 
                   pixel !== CIRCLE && 
                   pixel !== TRIANGLE &&
                   pixel !== WOOD &&
                   pixel !== LEAF;
        }
        
        // For other entities, use the original collision detection
        return pixel !== EMPTY && 
               pixel !== WATER && 
               pixel !== FIRE &&
               pixel !== SQUARE && 
               pixel !== CIRCLE && 
               pixel !== TRIANGLE;
    }
}

// Function to create and register an entity
function createEntity(type, x, y, options = {}) {
    let entity;
    
    switch(type) {
        case ENTITY_TYPES.RABBIT:
            entity = new Rabbit(x, y, options);
            break;
        case ENTITY_TYPES.PLAYER:
            entity = new Player(x, y, options);
            break;
        default:
            console.error(`Unknown entity type: ${type}`);
            return null;
    }
    
    entities.push(entity);
    return entity;
}

// Update all entities
function updateEntities() {
    for (let i = entities.length - 1; i >= 0; i--) {
        entities[i].update();
    }
}

// Render all entities
function renderEntities(ctx, offsetX, offsetY) {
    for (const entity of entities) {
        entity.render(ctx, offsetX, offsetY);
    }
}
