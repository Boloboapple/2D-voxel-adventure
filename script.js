// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
const TILE_SIZE = 32; // Size of each tile in pixels (e.g., 32x32)
const MAP_WIDTH = 20; // Map width in tiles
const MAP_HEIGHT = 15; // Map height in tiles

// Set canvas dimensions based on map size
canvas.width = MAP_WIDTH * TILE_SIZE;
canvas.height = MAP_HEIGHT * TILE_SIZE;

// --- Tile Type Definitions ---
const TILE_TYPE_PLAINS = 0;
const TILE_TYPE_LAKE_WATER = 1;
const TILE_TYPE_FOREST_GROUND = 2; // The ground *within* the forest biome
const TILE_TYPE_TREE = 3;         // Individual trees

// Define colors for each tile type
const tileColors = {
    [TILE_TYPE_PLAINS]: '#4CAF50',        // Green for plains
    [TILE_TYPE_LAKE_WATER]: '#2196F3',    // Blue for lake water
    [TILE_TYPE_FOREST_GROUND]: '#388E3C', // Darker green for forest ground
    [TILE_TYPE_TREE]: '#795548'           // Brown for trees
};

// --- Game Map Data (will be generated) ---
let gameMap = [];

// --- Map Generation Function ---
function generateMap() {
    // 1. Initialize entire map as plains
    gameMap = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        gameMap[y] = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            gameMap[y][x] = TILE_TYPE_PLAINS;
        }
    }

    // 2. Generate Lake (rectangular for simplicity)
    const lakeWidth = Math.floor(Math.random() * (MAP_WIDTH / 3)) + 3; // Min 3, Max 1/3 of map width
    const lakeHeight = Math.floor(Math.random() * (MAP_HEIGHT / 3)) + 3; // Min 3, Max 1/3 of map height

    // Random top-left corner for the lake, ensuring it fits
    const lakeStartX = Math.floor(Math.random() * (MAP_WIDTH - lakeWidth));
    const lakeStartY = Math.floor(Math.random() * (MAP_HEIGHT - lakeHeight));

    for (let y = lakeStartY; y < lakeStartY + lakeHeight; y++) {
        for (let x = lakeStartX; x < lakeStartX + lakeWidth; x++) {
            // Ensure coordinates are within bounds (just in case of weird random numbers)
            if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                gameMap[y][x] = TILE_TYPE_LAKE_WATER;
            }
        }
    }

    // 3. Generate Forest Biome (covers a portion of remaining land)
    // We'll define a large rectangular area that becomes forest ground
    const forestAreaWidth = Math.floor(Math.random() * (MAP_WIDTH / 2)) + 5; // Min 5, Max 1/2 of map width
    const forestAreaHeight = Math.floor(Math.random() * (MAP_HEIGHT / 2)) + 5; // Min 5, Max 1/2 of map height

    // Random top-left corner for the forest area
    const forestStartX = Math.floor(Math.random() * (MAP_WIDTH - forestAreaWidth));
    const forestStartY = Math.floor(Math.random() * (MAP_HEIGHT - forestAreaHeight));

    for (let y = forestStartY; y < forestStartY + forestAreaHeight; y++) {
        for (let x = forestStartX; x < forestStartX + forestAreaWidth; x++) {
            if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                // Only turn into forest if it's not already water
                if (gameMap[y][x] !== TILE_TYPE_LAKE_WATER) {
                    gameMap[y][x] = TILE_TYPE_FOREST_GROUND;
                }
            }
        }
    }

    // 4. Place individual Trees within Forest_Ground tiles
    const treeDensity = 0.3; // 30% chance for a tree on forest ground
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (gameMap[y][x] === TILE_TYPE_FOREST_GROUND) {
                if (Math.random() < treeDensity) { // Randomly place a tree
                    gameMap[y][x] = TILE_TYPE_TREE;
                }
            }
        }
    }
    
    // Note: Plains will naturally be all areas not covered by water or forest
}

// --- Drawing Function ---
function draw() {
    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the game map
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tileType = gameMap[y][x];
            const color = tileColors[tileType];

            ctx.fillStyle = color;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Optional: Draw a grid line for visibility during development
            ctx.strokeStyle = '#333';
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

// --- Initial Setup ---
generateMap(); // Generate the map once
draw();        // Draw the generated map

// Optional: Add a button to generate a new map
const regenerateButton = document.createElement('button');
regenerateButton.textContent = 'Generate New Map';
regenerateButton.style.marginTop = '20px';
regenerateButton.style.padding = '10px 20px';
regenerateButton.style.fontSize = '1em';
regenerateButton.style.backgroundColor = '#61dafb';
regenerateButton.style.color = '#282c34';
regenerateButton.style.border = 'none';
regenerateButton.style.borderRadius = '5px';
regenerateButton.style.cursor = 'pointer';
document.body.appendChild(regenerateButton);

regenerateButton.addEventListener('click', () => {
    generateMap(); // Generate a new map
    draw();        // Redraw the new map
});
