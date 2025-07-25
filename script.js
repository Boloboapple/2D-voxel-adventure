// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
// Isometric tile dimensions (e.g., 64px wide, 32px high for the "diamond" base)
const TILE_ISO_WIDTH = 64;
const TILE_ISO_HEIGHT = 32;

const MAP_WIDTH = 20; // Map width in tiles
const MAP_HEIGHT = 15; // Map height in tiles

// Calculate canvas dimensions and offsets to fit the entire isometric map
// The total width of the isometric map is (MAP_WIDTH + MAP_HEIGHT) * TILE_ISO_WIDTH / 2
// The maximum possible height (from top-most point to bottom-most point)
// is (MAP_WIDTH + MAP_HEIGHT) * TILE_ISO_HEIGHT / 2
// We also need to account for the height of the trees extending upwards.
const MAX_TREE_HEIGHT = TILE_ISO_HEIGHT * 2; // Roughly how tall our simulated tree is

canvas.width = (MAP_WIDTH + MAP_HEIGHT) * TILE_ISO_WIDTH / 2;
canvas.height = (MAP_WIDTH + MAP_HEIGHT) * TILE_ISO_HEIGHT / 2 + MAX_TREE_HEIGHT; // Add space for tall objects

// Offset to center the map and ensure it's visible.
// xOffset: Centers the isometric diamond grid horizontally.
// yOffset: Ensures the top-most part of the map (including tall objects) is visible.
const xOffset = (canvas.width - MAP_WIDTH * TILE_ISO_WIDTH / 2 - MAP_HEIGHT * TILE_ISO_WIDTH / 2) / 2;
const yOffset = MAX_TREE_HEIGHT + (MAP_WIDTH * TILE_ISO_HEIGHT / 2); // Start drawing lower to allow for height above map


// --- Tile Type Definitions ---
const TILE_TYPE_PLAINS = 0;
const TILE_TYPE_LAKE_WATER = 1;
const TILE_TYPE_FOREST_GROUND = 2; // The ground *within* the forest biome
const TILE_TYPE_TREE = 3;         // Individual trees

// Define colors for each tile type. We'll use slightly different shades for isometric faces.
const tileColors = {
    [TILE_TYPE_PLAINS]: { top: '#66BB6A', left: '#4CAF50', right: '#388E3C' }, // Lighter to darker green for faces
    [TILE_TYPE_LAKE_WATER]: { top: '#64B5F6', left: '#2196F3', right: '#1976D2' }, // Lighter to darker blue
    [TILE_TYPE_FOREST_GROUND]: { top: '#4CAF50', left: '#388E3C', right: '#2E7D32' }, // Darker green for forest ground
    [TILE_TYPE_TREE]: { top: '#8BC34A', left: '#7CB342', right: '#689F38' } // Placeholder for tree leaves top/sides
};
const TREE_TRUNK_COLOR = { top: '#A1887F', left: '#8D6E63', right: '#795548' }; // Brown for tree trunk

// --- Game Map Data (will be generated) ---
let gameMap = [];

// --- Coordinate Conversion Function (Grid to Isometric Screen) ---
// Returns the screen coordinates of the TOP-CENTER point of the isometric tile
function isoToScreen(x, y) {
    const screenX = (x - y) * (TILE_ISO_WIDTH / 2) + xOffset;
    const screenY = (x + y) * (TILE_ISO_HEIGHT / 2) + yOffset;
    return { x: screenX, y: screenY };
}

// --- Drawing Helper Functions ---

// Draws an isometric diamond (like a flat ground tile)
function drawIsometricDiamond(color, screenX, screenY) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + TILE_ISO_HEIGHT / 2); // Left middle
    ctx.lineTo(screenX + TILE_ISO_WIDTH / 2, screenY); // Top middle
    ctx.lineTo(screenX + TILE_ISO_WIDTH, screenY + TILE_ISO_HEIGHT / 2); // Right middle
    ctx.lineTo(screenX + TILE_ISO_WIDTH / 2, screenY + TILE_ISO_HEIGHT); // Bottom middle
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.stroke();
}

// Draws an isometric block with top, left, and right faces
// screenX, screenY are the coordinates of the TOP-CENTER point of the block
// blockHeight is the pixel height of the block
// colors is an object { top, left, right } for face colors
function drawIsometricBlock(screenX, screenY, blockHeight, colors) {
    // Top face (diamond)
    ctx.fillStyle = colors.top;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + TILE_ISO_HEIGHT / 2);
    ctx.lineTo(screenX + TILE_ISO_WIDTH / 2, screenY);
    ctx.lineTo(screenX + TILE_ISO_WIDTH, screenY + TILE_ISO_HEIGHT / 2);
    ctx.lineTo(screenX + TILE_ISO_WIDTH / 2, screenY + TILE_ISO_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Left face (parallelogram)
    ctx.fillStyle = colors.left;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + TILE_ISO_HEIGHT / 2);
    ctx.lineTo(screenX, screenY + TILE_ISO_HEIGHT / 2 + blockHeight); // Bottom-left
    ctx.lineTo(screenX + TILE_ISO_WIDTH / 2, screenY + TILE_ISO_HEIGHT + blockHeight); // Bottom-middle
    ctx.lineTo(screenX + TILE_ISO_WIDTH / 2, screenY + TILE_ISO_HEIGHT); // Top-middle
    ctx.closePath();
    ctx.fill();

    // Right face (parallelogram)
    ctx.fillStyle = colors.right;
    ctx.beginPath();
    ctx.moveTo(screenX + TILE_ISO_WIDTH, screenY + TILE_ISO_HEIGHT / 2);
    ctx.lineTo(screenX + TILE_ISO_WIDTH, screenY + TILE_ISO_HEIGHT / 2 + blockHeight); // Bottom-right
    ctx.lineTo(screenX + TILE_ISO_WIDTH / 2, screenY + TILE_ISO_HEIGHT + blockHeight); // Bottom-middle
    ctx.lineTo(screenX + TILE_ISO_WIDTH / 2, screenY + TILE_ISO_HEIGHT); // Top-middle
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#222'; // Darker stroke for definition
    ctx.stroke();
}


// --- Map Generation Function (Same as before) ---
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


// --- Main Drawing Function ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas

    // Iterate through the map in drawing order (from top-left to bottom-right)
    // This ensures correct overlapping for isometric projection
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tileType = gameMap[y][x];
            const screenPos = isoToScreen(x, y);

            // Draw the ground tile first (plains, water, forest_ground)
            const groundColor = tileColors[tileType] || tileColors[TILE_TYPE_PLAINS]; // Default to plains colors
            drawIsometricDiamond(groundColor.top, screenPos.x, screenPos.y);

            // If it's a tree, draw the "3D" tree block on top of its ground tile
            if (tileType === TILE_TYPE_TREE) {
                const trunkHeight = TILE_ISO_HEIGHT * 1.5; // Height of the tree trunk
                const leavesHeight = TILE_ISO_HEIGHT * 1;  // Height of the leaves block
                
                // Draw trunk: screenPos.y - trunkHeight + TILE_ISO_HEIGHT is the top point
                drawIsometricBlock(
                    screenPos.x,
                    screenPos.y - trunkHeight + TILE_ISO_HEIGHT, // Adjust Y to draw above the ground
                    trunkHeight,
                    TREE_TRUNK_COLOR // Use specific trunk colors
                );

                // Draw leaves block on top of the trunk
                drawIsometricBlock(
                    screenPos.x,
                    screenPos.y - trunkHeight + TILE_ISO_HEIGHT - leavesHeight + TILE_ISO_HEIGHT / 2, // Position leaves above trunk
                    leavesHeight,
                    tileColors[TILE_TYPE_TREE] // Use tree colors for leaves (defined to be green)
                );
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
