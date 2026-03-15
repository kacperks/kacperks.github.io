// Game constants
const CHUNK_SIZE = 200;
let PIXEL_SIZE = 4;
const GRAVITY = 1.5; // Increased gravity (3x stronger)
const WATER_SPREAD = 3;

// Base Colors
const SAND_COLOR = '#e6c588';
const WATER_COLOR = '#4a80f5';
const WALL_COLOR = '#888888';
const DIRT_COLOR = '#8B4513';
const STONE_COLOR = '#A9A9A9';
const GRASS_COLOR = '#7CFC00';
const WOOD_COLOR = '#8B5A2B';
const SEED_COLOR = '#654321';
const FLOWER_COLORS = ['#FF0000', '#FFFF00', '#FF00FF', '#FFA500', '#FFFFFF', '#00FFFF'];
const LEAF_COLOR = '#228B22';
const FIRE_COLORS = ['#FF0000', '#FF3300', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00'];
const LAVA_COLORS = ['#FF0000', '#FF3300', '#FF4500', '#FF6600', '#FF8C00'];
const RABBIT_COLORS = ['#FFFFFF', '#E0E0E0', '#D3C8B4']; // White, Light Gray, Light Brown

// Color variation functions
function getRandomColorVariation(baseColor, range) {
    // Convert hex to RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    
    // Add random variation
    const rVar = Math.max(0, Math.min(255, r + Math.floor(Math.random() * range * 2) - range));
    const gVar = Math.max(0, Math.min(255, g + Math.floor(Math.random() * range * 2) - range));
    const bVar = Math.max(0, Math.min(255, b + Math.floor(Math.random() * range * 2) - range));
    
    // Convert back to hex
    return `#${rVar.toString(16).padStart(2, '0')}${gVar.toString(16).padStart(2, '0')}${bVar.toString(16).padStart(2, '0')}`;
}

// Generate color palettes for natural elements
const DIRT_COLORS = Array(10).fill().map(() => getRandomColorVariation(DIRT_COLOR, 15));
const GRASS_COLORS = Array(10).fill().map(() => getRandomColorVariation(GRASS_COLOR, 20));
const STONE_COLORS = Array(10).fill().map(() => getRandomColorVariation(STONE_COLOR, 15));
const WOOD_COLORS = Array(10).fill().map(() => getRandomColorVariation(WOOD_COLOR, 15));
const LEAF_COLORS = Array(10).fill().map(() => getRandomColorVariation(LEAF_COLOR, 25));
const WATER_COLORS = Array(10).fill().map(() => getRandomColorVariation(WATER_COLOR, 20));

// Element types
const EMPTY = 0;
const SAND = 1;
const WATER = 2;
const WALL = 3;
const DIRT = 4;
const STONE = 5;
const GRASS = 6;
const WOOD = 7;
const SEED = 8;
const GRASS_BLADE = 9;
const FLOWER = 10;
const TREE_SEED = 11;
const LEAF = 12;
const FIRE = 13;
const LAVA = 14;
const RABBIT = 15;
const SQUARE = 16;
const CIRCLE = 17;
const TRIANGLE = 18;

// Flammable materials
const FLAMMABLE_MATERIALS = [GRASS, WOOD, SEED, GRASS_BLADE, FLOWER, TREE_SEED, LEAF];
