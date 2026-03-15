// Rabbit element behaviors
function updateRabbit(x, y) {
    const metadata = getMetadata(x, y) || {};
    
    // Initialize rabbit metadata if it doesn't exist
    if (!metadata.initialized) {
        metadata.initialized = true;
        metadata.jumpCooldown = 0;
        metadata.direction = Math.random() > 0.5 ? 1 : -1; // 1 for right, -1 for left
        metadata.jumpHeight = 0;
        metadata.colorIndex = Math.floor(Math.random() * RABBIT_COLORS.length);
        setMetadata(x, y, metadata);
        return true;
    }
    
    // Update metadata
    metadata.jumpCooldown = Math.max(0, metadata.jumpCooldown - 1);
    
    // Check if rabbit is on solid ground
    const onGround = getPixel(x, y + 1) !== EMPTY && getPixel(x, y + 1) !== WATER;
    
    // Rabbit falls if there's nothing below
    if (!onGround && metadata.jumpHeight <= 0) {
        if (getPixel(x, y + 1) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x, y + 1, RABBIT);
            moveMetadata(x, y, x, y + 1);
            return true;
        }
        // Rabbit can swim but prefers not to
        else if (getPixel(x, y + 1) === WATER) {
            // 50% chance to swim down or stay in place
            if (Math.random() < 0.5) {
                setPixel(x, y, EMPTY);
                setPixel(x, y + 1, RABBIT);
                moveMetadata(x, y, x, y + 1);
                return true;
            }
            // When in water, try to jump out
            metadata.jumpCooldown = 0;
        }
    }
    
    // Rabbit jumps occasionally when on ground
    if (onGround && metadata.jumpCooldown === 0) {
        // Start a jump
        metadata.jumpHeight = 3 + Math.floor(Math.random() * 2); // Jump 3-4 blocks high
        metadata.jumpCooldown = 30 + Math.floor(Math.random() * 50); // Wait 30-80 frames before next jump
        
        // Randomly change direction sometimes
        if (Math.random() < 0.3) {
            metadata.direction = -metadata.direction;
        }
        
        setMetadata(x, y, metadata);
    }
    
    // Execute jump if jump height is positive
    if (metadata.jumpHeight > 0) {
        // Move up
        if (getPixel(x, y - 1) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x, y - 1, RABBIT);
            moveMetadata(x, y, x, y - 1);
            metadata.jumpHeight--;
            setMetadata(x, y - 1, metadata);
            return true;
        }
        // If can't move up, try moving diagonally up in current direction
        else if (getPixel(x + metadata.direction, y - 1) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x + metadata.direction, y - 1, RABBIT);
            moveMetadata(x, y, x + metadata.direction, y - 1);
            metadata.jumpHeight--;
            setMetadata(x + metadata.direction, y - 1, metadata);
            return true;
        }
        // If can't move diagonally up, try moving horizontally
        else if (getPixel(x + metadata.direction, y) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x + metadata.direction, y, RABBIT);
            moveMetadata(x, y, x + metadata.direction, y);
            metadata.jumpHeight = 0; // End jump if blocked
            setMetadata(x + metadata.direction, y, metadata);
            return true;
        }
        // If completely blocked, end jump
        else {
            metadata.jumpHeight = 0;
            setMetadata(x, y, metadata);
        }
    }
    // Move horizontally when not jumping
    else if (metadata.jumpCooldown > 0 && metadata.jumpCooldown < 15 && onGround) {
        // Hop horizontally between jumps
        if (getPixel(x + metadata.direction, y) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x + metadata.direction, y, RABBIT);
            moveMetadata(x, y, x + metadata.direction, y);
            return true;
        }
        // If blocked, try to change direction
        else {
            metadata.direction = -metadata.direction;
            setMetadata(x, y, metadata);
        }
    }
    
    return false;
}
