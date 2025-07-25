// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
// Isometric tile dimensions (e.g., 64px wide, 32px high for the "diamond" base)
const TILE_ISO_WIDTH = 64;
const TILE_ISO_HEIGHT = 32;

const MAP_WIDTH = 20; // Map width in tiles
const MAP_HEIGHT = 15; // Map height in tiles

// Adjust canvas dimensions to fit the isometric projection
// The width will be (MAP_WIDTH + MAP_HEIGHT) * TILE_ISO_WIDTH / 2
// The height will be (MAP_WIDTH + MAP_HEIGHT) * TILE_ISO_HEIGHT / 2
canvas.width = (MAP_WIDTH + MAP_HEIGHT) * TILE_ISO_WIDTH / 2;
canvas.height = (MAP_WIDTH + MAP_HEIGHT) * TILE_ISO_HEIGHT / 2 + TILE_ISO_HEIGHT; // Add extra height for tall objects

// To center the isometric map on the canvas
const xOffset = (canvas.width / 2) - (MAP_WIDTH * TILE_ISO_WIDTH / 2);
const yOffset = TILE_ISO_HEIGHT; // Start drawing slightly lower to make room for top-left tiles

// --- Tile Type Definitions ---
const TILE_TYPE_PLAINS = 0;
const TILE_TYPE_LAKE_WATER = 1;
const TILE_TYPE_FOREST_GROUND = 2; // The ground *within* the forest biome
const TILE_TYPE_TREE = 3;         // Individual trees

// Define colors for each tile type (will be replaced by images later)
const tileColors = {
    [TILE_TYPE_PLAINS]: '#4CAF50',        // Green for plains
    [TILE_TYPE_LAKE_WATER]: '#2196F3',    // Blue for lake water
    [TILE_TYPE_FOREST_GROUND]: '#388E3C', // Darker green for forest ground
    [TILE_TYPE_TREE]: '#8B4513'           // Brown for tree trunk (for placeholder)
};

// --- Game Map Data (will be generated) ---
let gameMap = [];

// --- Coordinate Conversion Function (Grid to Isometric Screen) ---
function isoToScreen(x, y) {
    const screenX = (x - y) * (TILE_ISO_WIDTH / 2) + xOffset;
    const screenY = (x + y) * (TILE_ISO_HEIGHT / 2) + yOffset;
    return { x: screenX, y: screenY };
}

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
            if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                gameMap[y][x] = TILE_TYPE_LAKE_WATER;
            }
        }
    }

    // 3. Generate Forest Biome (covers a portion of remaining land)
    const forestAreaWidth = Math.floor(Math.random() * (MAP_WIDTH / 2)) + 5; // Min 5, Max 1/2 of map width
    const forestAreaHeight = Math.floor(Math.random() * (MAP_HEIGHT / 2)) + 5; // Min 5, Max 1/2 of map height

    const forestStartX = Math.floor(Math.random() * (MAP_WIDTH - forestAreaWidth));
    const forestStartY = Math.floor(Math.random() * (MAP_HEIGHT - forestAreaHeight));

    for (let y = forestStartY; y < forestStartY + forestAreaHeight; y++) {
        for (let x = forestStartX; x < forestStartX + forestAreaWidth; x++) {
            if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
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
                if (Math.random() < treeDensity) {
                    gameMap[y][x] = TILE_TYPE_TREE;
                }
            }
        }
    }
}

// --- Drawing Function ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas

    // Iterate through the map in drawing order (from top-left to bottom-right)
    // This ensures correct overlapping for isometric projection
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tileType = gameMap[y][x];
            const screenPos = isoToScreen(x, y);

            // Draw the ground tile (plains, water, forest_ground)
            ctx.fillStyle = tileColors[tileType] || tileColors[TILE_TYPE_PLAINS]; // Default to plains if type not found
            
            // Draw an isometric diamond for the base tile
            ctx.beginPath();
            ctx.moveTo(screenPos.x, screenPos.y + TILE_ISO_HEIGHT / 2); // Left middle
            ctx.lineTo(screenPos.x + TILE_ISO_WIDTH / 2, screenPos.y); // Top middle
            ctx.lineTo(screenPos.x + TILE_ISO_WIDTH, screenPos.y + TILE_ISO_HEIGHT / 2); // Right middle
            ctx.lineTo(screenPos.x + TILE_ISO_WIDTH / 2, screenPos.y + TILE_ISO_HEIGHT); // Bottom middle
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.stroke();

            // If it's a tree, draw the "3D" part (e.g., a taller block)
            if (tileType === TILE_TYPE_TREE) {
                // Placeholder for a "tall" tree effect (replace with sprite drawing later)
                const treeHeight = TILE_ISO_HEIGHT * 2; // Make tree taller than tile
                
                ctx.fillStyle = tileColors[TILE_TYPE_TREE]; // Trunk color
                // Draw a rectangle above the tile's base, positioned to look like it's coming from the center-top
                ctx.fillRect(screenPos.x + TILE_ISO_WIDTH / 2 - (TILE_ISO_WIDTH / 8), screenPos.y - treeHeight + TILE_ISO_HEIGHT, TILE_ISO_WIDTH / 4, treeHeight);

                // Placeholder for leaves (a green rectangle above the trunk)
                ctx.fillStyle = '#228B22'; // Forest green for leaves
                ctx.fillRect(screenPos.x + TILE_ISO_WIDTH / 2 - (TILE_ISO_WIDTH / 3), screenPos.y - treeHeight + TILE_ISO_HEIGHT - (TILE_ISO_HEIGHT / 2), TILE_ISO_WIDTH * 2 / 3, TILE_ISO_HEIGHT);
            }
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
