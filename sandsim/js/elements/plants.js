// Plant element behaviors (grass, seeds, trees)
function updateGrass(x, y) {
    // Grass behaves like dirt for physics with stronger gravity
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
        setPixel(x, newY, GRASS);
        return true;
    }
    // Try to move down-left or down-right
    else if (getPixel(x - 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x - 1, y + 1, GRASS);
        return true;
    } 
    else if (getPixel(x + 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x + 1, y + 1, GRASS);
        return true;
    }
    else if (getPixel(x, y + 1) === WATER) {
        setPixel(x, y, WATER);
        setPixel(x, y + 1, GRASS);
        return true;
    }
    
    // Grass can spread to nearby dirt
    if (Math.random() < 0.0005) {
        const directions = [
            {dx: -1, dy: 0}, {dx: 1, dy: 0}, 
            {dx: 0, dy: -1}, {dx: 0, dy: 1}
        ];
        
        const dir = directions[Math.floor(Math.random() * directions.length)];
        if (getPixel(x + dir.dx, y + dir.dy) === DIRT) {
            setPixel(x + dir.dx, y + dir.dy, GRASS);
            return true;
        }
    }
    
    // Grass dies if covered (no air above)
    if (getPixel(x, y - 1) !== EMPTY && Math.random() < 0.05) {
        setPixel(x, y, DIRT);
        return true;
    }
    
    return false;
}

function updateSeed(x, y) {
    // Seeds fall like sand with stronger gravity
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
        setPixel(x, newY, SEED);
        moveMetadata(x, y, x, newY);
        return true;
    }
    // Try to move down-left or down-right
    else if (getPixel(x - 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x - 1, y + 1, SEED);
        moveMetadata(x, y, x - 1, y + 1);
        return true;
    } 
    else if (getPixel(x + 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x + 1, y + 1, SEED);
        moveMetadata(x, y, x + 1, y + 1);
        return true;
    }
    // Seeds can float on water
    else if (getPixel(x, y + 1) === WATER) {
        // Just float, don't do anything
        return false;
    }
    // If seed is on dirt or grass, it can germinate
    else if (getPixel(x, y + 1) === DIRT || getPixel(x, y + 1) === GRASS) {
        const metadata = getMetadata(x, y);
        
        // Check if this is a flower seed
        if (metadata && metadata.type === 'flower') {
            setPixel(x, y, FLOWER);
            // Set a random flower color
            setMetadata(x, y, { 
                type: 'flower',
                color: FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
                age: 0,
                height: 1
            });
            return true;
        } else {
            // Regular seed becomes a grass blade
            setPixel(x, y, GRASS_BLADE);
            setMetadata(x, y, { age: 0, height: 1 });
            return true;
        }
    }
    
    return false;
}

function updateGrassBlade(x, y) {
    // Grass blades are static once grown
    const metadata = getMetadata(x, y);
    
    if (!metadata) {
        setMetadata(x, y, { age: 0, height: 1 });
        return true;
    }
    
    // Increment age
    metadata.age++;
    setMetadata(x, y, metadata);
    
    // Grass blades can grow taller up to a limit
    if (metadata.age % 200 === 0 && metadata.height < 3 && getPixel(x, y - 1) === EMPTY) {
        setPixel(x, y - 1, GRASS_BLADE);
        setMetadata(x, y - 1, { age: 0, height: metadata.height + 1 });
        metadata.isTop = false;
        setMetadata(x, y, metadata);
        return true;
    }
    
    // Grass blades die if covered by something other than another grass blade
    if (getPixel(x, y - 1) !== EMPTY && getPixel(x, y - 1) !== GRASS_BLADE && Math.random() < 0.01) {
        setPixel(x, y, EMPTY);
        removeMetadata(x, y);
        return true;
    }
    
    return false;
}

function updateFlower(x, y) {
    // Flowers are similar to grass blades but with a colored top
    const metadata = getMetadata(x, y);
    
    if (!metadata) {
        setMetadata(x, y, { 
            type: 'flower',
            color: FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
            age: 0,
            height: 1
        });
        return true;
    }
    
    // Increment age
    metadata.age++;
    setMetadata(x, y, metadata);
    
    // Flowers can grow taller up to a limit (2x bigger)
    if (metadata.age % 300 === 0 && metadata.height < 8 && getPixel(x, y - 1) === EMPTY) {
        // If this is the top of the flower, make it a stem and put a new flower on top
        setPixel(x, y - 1, FLOWER);
        setMetadata(x, y - 1, { 
            type: 'flower',
            color: metadata.color,
            age: 0,
            height: metadata.height + 1,
            isTop: true
        });
        metadata.isTop = false;
        setMetadata(x, y, metadata);
        return true;
    }
    
    // Flowers die if covered
    if (getPixel(x, y - 1) !== EMPTY && getPixel(x, y - 1) !== FLOWER && Math.random() < 0.01) {
        setPixel(x, y, EMPTY);
        removeMetadata(x, y);
        return true;
    }
    
    // Flowers can drop seeds occasionally
    if (metadata.isTop && Math.random() < 0.0001) {
        const directions = [-1, 1];
        const dir = directions[Math.floor(Math.random() * directions.length)];
        if (getPixel(x + dir, y) === EMPTY) {
            setPixel(x + dir, y, SEED);
            setMetadata(x + dir, y, { type: 'flower' });
            return true;
        }
    }
    
    return false;
}
