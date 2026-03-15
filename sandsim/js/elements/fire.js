// Fire and lava element behaviors
let fireUpdateCounter = 0;

function updateFire(x, y) {
    let modified = false;
    const metadata = getMetadata(x, y);
    
    if (!metadata) {
        // Initialize metadata if it doesn't exist
        setMetadata(x, y, { 
            lifetime: 100 + Math.floor(Math.random() * 100),
            colorIndex: Math.floor(Math.random() * FIRE_COLORS.length)
        });
        return true;
    }
    
    // Decrease lifetime
    metadata.lifetime--;
    modified = true;
    
    // Randomly change color for flickering effect
    if (Math.random() < 0.2) {
        metadata.colorIndex = Math.floor(Math.random() * FIRE_COLORS.length);
        modified = true;
    }
    
    // Update metadata
    setMetadata(x, y, metadata);
    
    // Fire rises upward occasionally
    if (Math.random() < 0.3 && getPixel(x, y - 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x, y - 1, FIRE);
        moveMetadata(x, y, x, y - 1);
        return true;
    }
    
    // Fire can also move slightly to the sides
    if (Math.random() < 0.1) {
        const direction = Math.random() > 0.5 ? 1 : -1;
        if (getPixel(x + direction, y - 1) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x + direction, y - 1, FIRE);
            moveMetadata(x, y, x + direction, y - 1);
            return true;
        }
    }
    
    // Fire spreads to nearby flammable materials (less frequently to reduce performance impact)
    if (fireUpdateCounter % 3 === 0 && Math.random() < 0.3) {
        const directions = [
            {dx: -1, dy: 0}, {dx: 1, dy: 0}, 
            {dx: 0, dy: -1}, {dx: 0, dy: 1},
            {dx: -1, dy: -1}, {dx: 1, dy: -1},
            {dx: -1, dy: 1}, {dx: 1, dy: 1}
        ];
        
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const nearbyType = getPixel(x + dir.dx, y + dir.dy);
        
        if (FLAMMABLE_MATERIALS.includes(nearbyType)) {
            setPixel(x + dir.dx, y + dir.dy, FIRE);
            setMetadata(x + dir.dx, y + dir.dy, { 
                lifetime: 100 + Math.floor(Math.random() * 100),
                colorIndex: Math.floor(Math.random() * FIRE_COLORS.length)
            });
            modified = true;
        }
    }
    
    // Fire burns out after its lifetime
    if (metadata.lifetime <= 0) {
        setPixel(x, y, EMPTY);
        removeMetadata(x, y);
        return true;
    }
    
    return modified;
}

function updateLava(x, y) {
    let modified = false;
    const metadata = getMetadata(x, y);
    
    if (!metadata) {
        // Initialize metadata if it doesn't exist
        setMetadata(x, y, { 
            colorIndex: Math.floor(Math.random() * LAVA_COLORS.length)
        });
        modified = true;
    } else {
        // Randomly change color for flowing effect
        if (Math.random() < 0.1) {
            metadata.colorIndex = Math.floor(Math.random() * LAVA_COLORS.length);
            setMetadata(x, y, metadata);
            modified = true;
        }
    }
    
    // Lava moves slower than water
    if (Math.random() < 0.7) {
        // Try to move down
        if (getPixel(x, y + 1) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x, y + 1, LAVA);
            moveMetadata(x, y, x, y + 1);
            return true;
        } 
        // Try to move down-left or down-right
        else if (getPixel(x - 1, y + 1) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x - 1, y + 1, LAVA);
            moveMetadata(x, y, x - 1, y + 1);
            return true;
        } 
        else if (getPixel(x + 1, y + 1) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x + 1, y + 1, LAVA);
            moveMetadata(x, y, x + 1, y + 1);
            return true;
        } 
        // Try to spread horizontally (slower than water)
        else if (Math.random() < 0.3) {
            // Randomly choose direction first
            const goLeft = Math.random() > 0.5;
            
            if (goLeft && getPixel(x - 1, y) === EMPTY) {
                setPixel(x, y, EMPTY);
                setPixel(x - 1, y, LAVA);
                moveMetadata(x, y, x - 1, y);
                return true;
            } else if (!goLeft && getPixel(x + 1, y) === EMPTY) {
                setPixel(x, y, EMPTY);
                setPixel(x + 1, y, LAVA);
                moveMetadata(x, y, x + 1, y);
                return true;
            } 
            // Try the other direction if first failed
            else if (!goLeft && getPixel(x - 1, y) === EMPTY) {
                setPixel(x, y, EMPTY);
                setPixel(x - 1, y, LAVA);
                moveMetadata(x, y, x - 1, y);
                return true;
            } else if (goLeft && getPixel(x + 1, y) === EMPTY) {
                setPixel(x, y, EMPTY);
                setPixel(x + 1, y, LAVA);
                moveMetadata(x, y, x + 1, y);
                return true;
            }
        }
    }
    
    // Lava sets nearby flammable materials on fire
    const directions = [
        {dx: -1, dy: 0}, {dx: 1, dy: 0}, 
        {dx: 0, dy: -1}, {dx: 0, dy: 1},
        {dx: -1, dy: -1}, {dx: 1, dy: -1},
        {dx: -1, dy: 1}, {dx: 1, dy: 1}
    ];
    
    for (const dir of directions) {
        const nearbyType = getPixel(x + dir.dx, y + dir.dy);
        
        // Set flammable materials on fire
        if (FLAMMABLE_MATERIALS.includes(nearbyType)) {
            setPixel(x + dir.dx, y + dir.dy, FIRE);
            setMetadata(x + dir.dx, y + dir.dy, { 
                lifetime: 100 + Math.floor(Math.random() * 100),
                colorIndex: Math.floor(Math.random() * FIRE_COLORS.length)
            });
            modified = true;
        }
        
        // Lava can melt sand into glass (stone)
        else if (nearbyType === SAND && Math.random() < 0.05) {
            setPixel(x + dir.dx, y + dir.dy, STONE);
            modified = true;
        }
        
        // Lava can burn dirt
        else if (nearbyType === DIRT && Math.random() < 0.02) {
            setPixel(x + dir.dx, y + dir.dy, EMPTY);
            modified = true;
        }
    }
    
    return modified;
}
