// Tree element behaviors
function updateTreeSeed(x, y) {
    // Tree seeds fall like other seeds with stronger gravity
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
        setPixel(x, newY, TREE_SEED);
        moveMetadata(x, y, x, newY);
        return true;
    }
    // Try to move down-left or down-right
    else if (getPixel(x - 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x - 1, y + 1, TREE_SEED);
        moveMetadata(x, y, x - 1, y + 1);
        return true;
    } 
    else if (getPixel(x + 1, y + 1) === EMPTY) {
        setPixel(x, y, EMPTY);
        setPixel(x + 1, y + 1, TREE_SEED);
        moveMetadata(x, y, x + 1, y + 1);
        return true;
    }
    // Seeds can float on water
    else if (getPixel(x, y + 1) === WATER) {
        // Just float, don't do anything
        return false;
    }
    // If seed is on dirt or grass, it can grow into a tree
    else if (getPixel(x, y + 1) === DIRT || getPixel(x, y + 1) === GRASS) {
        // Start growing a tree
        growTree(x, y);
        return true;
    }
    
    return false;
}

function growTree(x, y) {
    // Replace the seed with the trunk
    setPixel(x, y, WOOD);
    
    // Determine tree height (50-80 blocks, 10x bigger)
    const treeHeight = 50 + Math.floor(Math.random() * 31);
    
    // Generate consistent wood color for this tree
    const woodColorIndex = Math.floor(Math.random() * 10);
    setMetadata(x, y, { colorIndex: woodColorIndex });
    
    // Grow the trunk upward
    for (let i = 1; i < treeHeight; i++) {
        if (getPixel(x, y - i) === EMPTY) {
            setPixel(x, y - i, WOOD);
            // Use the same wood color for the entire trunk
            setMetadata(x, y - i, { colorIndex: woodColorIndex });
        } else {
            break; // Stop if we hit something
        }
    }
    
    // Add leaves at the top (10x bigger radius)
    addLeaves(x, y - treeHeight + 1, 20 + Math.floor(Math.random() * 10));
    
    // Add some branches
    addBranches(x, y, treeHeight);
}

function addBranches(x, y, treeHeight) {
    // Add 2-4 branches at different heights
    const numBranches = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numBranches; i++) {
        // Position branch at different heights along the trunk
        const branchY = y - Math.floor(treeHeight * (0.3 + 0.4 * i / numBranches));
        
        // Choose left or right direction
        const direction = Math.random() > 0.5 ? 1 : -1;
        
        // Branch length (10-15 blocks)
        const branchLength = 10 + Math.floor(Math.random() * 6);
        
        // Create the branch
        for (let j = 1; j <= branchLength; j++) {
            // Branch goes out horizontally with some upward angle
            const branchX = x + (j * direction);
            const upwardAngle = Math.floor(j * 0.3);
            
            if (getPixel(branchX, branchY - upwardAngle) === EMPTY) {
                setPixel(branchX, branchY - upwardAngle, WOOD);
            } else {
                break; // Stop if we hit something
            }
            
            // Add small leaf clusters at the end of branches
            if (j === branchLength) {
                addLeaves(branchX, branchY - upwardAngle, 8 + Math.floor(Math.random() * 4));
            }
        }
    }
}

function addLeaves(x, y, radius) {
    // Generate a few leaf color variations for this tree
    const baseLeafColorIndex = Math.floor(Math.random() * 10);
    const leafColorIndices = [
        baseLeafColorIndex,
        (baseLeafColorIndex + 1) % 10,
        (baseLeafColorIndex + 2) % 10
    ];
    
    // Add a cluster of leaves around the point
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            // Skip the exact center (trunk position)
            if (dx === 0 && dy === 0) continue;
            
            // Make it more circular by checking distance
            const distance = Math.sqrt(dx*dx + dy*dy);
            if (distance <= radius) {
                // Random chance to place a leaf based on distance from center
                // More dense leaves for larger trees
                const density = radius > 10 ? 0.8 : 0.6;
                if (Math.random() < (1 - distance/radius/density)) {
                    if (getPixel(x + dx, y + dy) === EMPTY) {
                        setPixel(x + dx, y + dy, LEAF);
                        // Assign one of the tree's leaf colors
                        const colorIndex = leafColorIndices[Math.floor(Math.random() * leafColorIndices.length)];
                        setMetadata(x + dx, y + dy, { colorIndex });
                    }
                }
            }
        }
    }
}
