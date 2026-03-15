// Physics objects (square, circle, triangle)
// Constants are already defined in constants.js

// Physics object properties
const PHYSICS_OBJECT_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'];

// Physics constants
const GRAVITY_ACCELERATION = 0.2;
const BOUNCE_FACTOR = 0.7;
const FRICTION = 0.98;
const ROTATION_SPEED = 0.05;

// Store physics objects
const physicsObjects = [];

// Physics object class
class PhysicsObject {
    constructor(type, x, y, size) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = size || 10;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.angularVelocity = (Math.random() - 0.5) * ROTATION_SPEED;
        this.color = PHYSICS_OBJECT_COLORS[Math.floor(Math.random() * PHYSICS_OBJECT_COLORS.length)];
        this.isStatic = false;
        this.lastUpdate = performance.now();
    }

    update() {
        const now = performance.now();
        const deltaTime = Math.min(50, now - this.lastUpdate); // Cap at 50ms to prevent huge jumps
        this.lastUpdate = now;

        if (this.isStatic) return false;

        // Apply gravity
        this.vy += GRAVITY_ACCELERATION;

        // Calculate new position
        const newX = this.x + this.vx;
        const newY = this.y + this.vy;

        // Check for collisions with world elements
        const collisionResult = this.checkCollisions(newX, newY);

        if (collisionResult.collision) {
            // Handle collision response
            if (collisionResult.horizontal) {
                this.vx *= -BOUNCE_FACTOR;
            }
            if (collisionResult.vertical) {
                this.vy *= -BOUNCE_FACTOR;
            }

            // Apply friction
            this.vx *= FRICTION;
            this.vy *= FRICTION;

            // If object is almost stopped, make it static
            if (Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1 && Math.abs(this.angularVelocity) < 0.01) {
                this.isStatic = true;
            }
        } else {
            // No collision, update position
            this.x = newX;
            this.y = newY;
        }

        // Update rotation
        this.rotation += this.angularVelocity;
        this.angularVelocity *= FRICTION;

        return true;
    }

    checkCollisions(newX, newY) {
        const result = {
            collision: false,
            horizontal: false,
            vertical: false
        };

        // Check points around the object based on its type
        const checkPoints = this.getCollisionCheckPoints(newX, newY);

        for (const point of checkPoints) {
            const pixel = getPixel(Math.floor(point.x), Math.floor(point.y));
            if (pixel !== EMPTY && pixel !== WATER && 
                pixel !== SQUARE && pixel !== CIRCLE && pixel !== TRIANGLE) {
                result.collision = true;
                
                // Determine collision direction
                if (point.type === 'horizontal') {
                    result.horizontal = true;
                } else if (point.type === 'vertical') {
                    result.vertical = true;
                } else {
                    // Corner collision, check both directions
                    result.horizontal = true;
                    result.vertical = true;
                }
            }
        }

        return result;
    }

    getCollisionCheckPoints(x, y) {
        const points = [];
        const halfSize = this.size / 2;

        if (this.type === SQUARE) {
            // For a square, check corners and edges
            const corners = [
                { x: x - halfSize, y: y - halfSize },
                { x: x + halfSize, y: y - halfSize },
                { x: x - halfSize, y: y + halfSize },
                { x: x + halfSize, y: y + halfSize }
            ];

            // Add rotated corners
            for (const corner of corners) {
                const rotatedCorner = this.rotatePoint(corner.x, corner.y, x, y, this.rotation);
                points.push({ x: rotatedCorner.x, y: rotatedCorner.y, type: 'corner' });
            }

            // Add edge midpoints
            points.push({ x: x, y: y - halfSize, type: 'vertical' });
            points.push({ x: x, y: y + halfSize, type: 'vertical' });
            points.push({ x: x - halfSize, y: y, type: 'horizontal' });
            points.push({ x: x + halfSize, y: y, type: 'horizontal' });

        } else if (this.type === CIRCLE) {
            // For a circle, check points around the circumference
            const numPoints = 12;
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                points.push({
                    x: x + Math.cos(angle) * halfSize,
                    y: y + Math.sin(angle) * halfSize,
                    type: angle < Math.PI / 4 || angle > Math.PI * 7/4 || (angle > Math.PI * 3/4 && angle < Math.PI * 5/4) ? 'horizontal' : 'vertical'
                });
            }

        } else if (this.type === TRIANGLE) {
            // For a triangle, check vertices and edges
            const vertices = [
                { x: x, y: y - halfSize },
                { x: x - halfSize, y: y + halfSize },
                { x: x + halfSize, y: y + halfSize }
            ];

            // Add rotated vertices
            for (const vertex of vertices) {
                const rotatedVertex = this.rotatePoint(vertex.x, vertex.y, x, y, this.rotation);
                points.push({ x: rotatedVertex.x, y: rotatedVertex.y, type: 'corner' });
            }

            // Add edge midpoints
            const midpoints = [
                { x: (vertices[0].x + vertices[1].x) / 2, y: (vertices[0].y + vertices[1].y) / 2, type: 'edge' },
                { x: (vertices[1].x + vertices[2].x) / 2, y: (vertices[1].y + vertices[2].y) / 2, type: 'horizontal' },
                { x: (vertices[2].x + vertices[0].x) / 2, y: (vertices[2].y + vertices[0].y) / 2, type: 'edge' }
            ];

            for (const midpoint of midpoints) {
                const rotatedMidpoint = this.rotatePoint(midpoint.x, midpoint.y, x, y, this.rotation);
                points.push({ x: rotatedMidpoint.x, y: rotatedMidpoint.y, type: midpoint.type });
            }
        }

        return points;
    }

    rotatePoint(px, py, cx, cy, angle) {
        const s = Math.sin(angle);
        const c = Math.cos(angle);

        // Translate point back to origin
        px -= cx;
        py -= cy;

        // Rotate point
        const xnew = px * c - py * s;
        const ynew = px * s + py * c;

        // Translate point back
        return {
            x: xnew + cx,
            y: ynew + cy
        };
    }

    render(ctx, offsetX, offsetY) {
        const screenX = (this.x - offsetX) * PIXEL_SIZE;
        const screenY = (this.y - offsetY) * PIXEL_SIZE;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        
        // Draw collision box in debug mode
        if (debugMode) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1;
            
            // Draw a circle for the collision radius
            ctx.beginPath();
            ctx.arc(0, 0, this.size * PIXEL_SIZE / 2, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw a dot at the center
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Restore original fill color
            ctx.fillStyle = this.color;
        }
        
        if (this.type === SQUARE) {
            const halfSize = this.size / 2 * PIXEL_SIZE;
            ctx.fillRect(-halfSize, -halfSize, this.size * PIXEL_SIZE, this.size * PIXEL_SIZE);
        } else if (this.type === CIRCLE) {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2 * PIXEL_SIZE, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === TRIANGLE) {
            const halfSize = this.size / 2 * PIXEL_SIZE;
            ctx.beginPath();
            ctx.moveTo(0, -halfSize);
            ctx.lineTo(-halfSize, halfSize);
            ctx.lineTo(halfSize, halfSize);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
}

function createPhysicsObject(type, x, y, size) {
    const obj = new PhysicsObject(type, x, y, size || 10);
    physicsObjects.push(obj);
    return obj;
}

function updatePhysicsObjects() {
    // Update all physics objects
    for (let i = physicsObjects.length - 1; i >= 0; i--) {
        physicsObjects[i].update();
    }
}

function renderPhysicsObjects(ctx, offsetX, offsetY) {
    // Render all physics objects
    for (const obj of physicsObjects) {
        obj.render(ctx, offsetX, offsetY);
    }
}
