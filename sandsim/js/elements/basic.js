// Basic element behaviors (sand, water, dirt)
function updateSand(x, y) {
    // Try to move down with stronger gravity (up to 5 pixels at once)
    let maxFall = 5;
    let newY = y;
    
    // Check how far down we can fall
    for (let i = 1; i <= maxFall; i++) {
        if (getPixel(x, y + i) === EMPTY) {
            newY = y + i;
        } else {
            break;
        }
    }
    
    if (newY > y) {
        // Fall straight down as far as possible
        setPixel(x, y, EMPTY);
        setPixel(x, newY, SAND);
        return true;
    }
    // Try to move down-left or down-right
    else if (getPixel(x - 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x - 1, y + 1, SAND);
        return true;
    } 
    else if (getPixel(x + 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x + 1, y + 1, SAND);
        return true;
    }
    // Sand can displace water
    else if (getPixel(x, y + 1) === WATER) {
        setPixel(x, y, WATER);
        setPixel(x, y + 1, SAND);
        return true;
    }
    return false;
}

function updateWater(x, y) {
    let modified = false;
    
    // Update water color dynamically
    const metadata = getMetadata(x, y);
    if (metadata) {
        if (metadata.waterColorTimer === undefined) {
            metadata.waterColorTimer = 0;
            modified = true;
        }
        
        metadata.waterColorTimer++;
        
        // Change color occasionally
        if (metadata.waterColorTimer > 20 && Math.random() < 0.1) {
            metadata.colorIndex = Math.floor(Math.random() * 10);
            metadata.waterColorTimer = 0;
            modified = true;
        }
        
        setMetadata(x, y, metadata);
    }
    
    // Try to move down with stronger gravity (up to 4 pixels at once)
    let maxFall = 4;
    let newY = y;
    
    // Check how far down we can fall
    for (let i = 1; i <= maxFall; i++) {
        if (getPixel(x, y + i) === EMPTY) {
            newY = y + i;
        } else {
            break;
        }
    }
    
    if (newY > y) {
        // Fall straight down as far as possible
        setPixel(x, y, EMPTY);
        setPixel(x, newY, WATER);
        moveMetadata(x, y, x, newY);
        return true;
    }
    // Try to move down-left or down-right
    else if (getPixel(x - 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x - 1, y + 1, WATER);
        moveMetadata(x, y, x - 1, y + 1);
        return true;
    } 
    else if (getPixel(x + 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x + 1, y + 1, WATER);
        moveMetadata(x, y, x + 1, y + 1);
        return true;
    } 
    // Try to spread horizontally
    else {
        let moved = false;
        
        // Randomly choose direction first
        const goLeft = Math.random() > 0.5;
        
        if (goLeft && getPixel(x - 1, y) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x - 1, y, WATER);
            moveMetadata(x, y, x - 1, y);
            return true;
        } else if (!goLeft && getPixel(x + 1, y) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x + 1, y, WATER);
            moveMetadata(x, y, x + 1, y);
            return true;
        } 
        // Try the other direction if first failed
        else if (!goLeft && getPixel(x - 1, y) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x - 1, y, WATER);
            moveMetadata(x, y, x - 1, y);
            return true;
        } else if (goLeft && getPixel(x + 1, y) === EMPTY) {
            setPixel(x, y, EMPTY);
            setPixel(x + 1, y, WATER);
            moveMetadata(x, y, x + 1, y);
            return true;
        }
    }
    
    // Water extinguishes fire and turns lava into stone
    const directions = [
        {dx: -1, dy: 0}, {dx: 1, dy: 0}, 
        {dx: 0, dy: -1}, {dx: 0, dy: 1},
        {dx: -1, dy: -1}, {dx: 1, dy: -1},
        {dx: -1, dy: 1}, {dx: 1, dy: 1}
    ];
    
    for (const dir of directions) {
        if (getPixel(x + dir.dx, y + dir.dy) === FIRE) {
            setPixel(x + dir.dx, y + dir.dy, EMPTY);
            removeMetadata(x + dir.dx, y + dir.dy);
            return true;
        } else if (getPixel(x + dir.dx, y + dir.dy) === LAVA) {
            // Water turns lava into stone
            setPixel(x + dir.dx, y + dir.dy, STONE);
            removeMetadata(x + dir.dx, y + dir.dy);
            // Water is consumed in the process
            setPixel(x, y, EMPTY);
            return true;
        }
    }
    
    return modified;
}

function updateDirt(x, y) {
    // Try to move down with stronger gravity (up to 5 pixels at once)
    let maxFall = 5;
    let newY = y;
    
    // Check how far down we can fall
    for (let i = 1; i <= maxFall; i++) {
        if (getPixel(x, y + i) === EMPTY) {
            newY = y + i;
        } else {
            break;
        }
    }
    
    if (newY > y) {
        // Fall straight down as far as possible
        setPixel(x, y, EMPTY);
        setPixel(x, newY, DIRT);
        return true;
    }
    // Try to move down-left or down-right
    else if (getPixel(x - 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x - 1, y + 1, DIRT);
        return true;
    } 
    else if (getPixel(x + 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x + 1, y + 1, DIRT);
        return true;
    }
    // Dirt can displace water
    else if (getPixel(x, y + 1) === WATER) {
        setPixel(x, y, WATER);
        setPixel(x, y + 1, DIRT);
        return true;
    }
    
    // Dirt can turn into grass if exposed to air above
    if (getPixel(x, y - 1) === EMPTY && Math.random() < 0.001) {
        setPixel(x, y, GRASS);
        return true;
    }
    
    // Dirt can randomly spawn seeds if exposed to air above
    if (getPixel(x, y - 1) === EMPTY) {
        // Spawn different types of seeds with different probabilities
        const seedRoll = Math.random();
        if (seedRoll < 0.0002) { // Grass blade seed (most common)
            setPixel(x, y - 1, SEED);
            return true;
        } else if (seedRoll < 0.00025) { // Flower seed (less common)
            setPixel(x, y - 1, SEED);
            // Mark this seed as a flower seed (will be handled in updateSeed)
            setMetadata(x, y - 1, { type: 'flower' });
            return true;
        } else if (seedRoll < 0.00026) { // Tree seed (rare)
            setPixel(x, y - 1, TREE_SEED);
            return true;
        }
    }
    
    return false;
}
