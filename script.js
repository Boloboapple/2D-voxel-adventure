// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
// Isometric tile dimensions (e.g., 64px wide, 32px high for the "diamond" base)
const TILE_ISO_WIDTH = 64;
const TILE_ISO_HEIGHT = 32;

const MAP_WIDTH = 20; // Map width in tiles
const MAP_HEIGHT = 15; // Map height in tiles

// Max height of the tallest object (tree) in pixels from its ground plane
const MAX_OBJECT_HEIGHT_FROM_GROUND = TILE_ISO_HEIGHT * 3; // Trunk (1.5) + Leaves (1.5)

// Set canvas dimensions to be large enough to contain the full isometric map
// and any tall objects without clipping. These values are generous.
canvas.width = (MAP_WIDTH + MAP_HEIGHT) * (TILE_ISO_WIDTH / 2) + TILE_ISO_WIDTH * 2; // Added extra padding
canvas.height = (MAP_WIDTH + MAP_HEIGHT) * (TILE_ISO_HEIGHT / 2) + MAX_OBJECT_HEIGHT_FROM_GROUND + TILE_ISO_HEIGHT * 2; // Added extra padding

// --- IMPORTANT FIX: Global Offset for the Isometric Drawing ---
// These offsets define where the (0,0) grid tile's top-middle point will be placed on the canvas.
// We need to ensure it's not negative and leaves enough space for the entire map.
// To move the map more to the right and down, we increase these values.
const globalDrawOffsetX = (MAP_HEIGHT * TILE_ISO_WIDTH / 2) + 50; // Shift right to make space for leftmost map parts + padding
const globalDrawOffsetY = MAX_OBJECT_HEIGHT_FROM_GROUND + 50; // Shift down to make space for tree tops + padding

// --- Tile Type Definitions ---
const TILE_TYPE_PLAINS = 0;
const TILE_TYPE_LAKE_WATER = 1;
const TILE_TYPE_FOREST_GROUND = 2; // The ground *within* the forest biome
const TILE_TYPE_TREE = 3;         // Individual trees

// Define colors for each tile type. Using slightly different shades for isometric faces.
const tileColors = {
    [TILE_TYPE_PLAINS]: { top: '#66BB6A', left: '#4CAF50', right: '#388E3C' }, // Lighter to darker green for faces
    [TILE_TYPE_LAKE_WATER]: { top: '#64B5F6', left: '#2196F3', right: '#1976D2' }, // Lighter to darker blue
    [TILE_TYPE_FOREST_GROUND]: { top: '#4CAF50', left: '#388E3C', right: '#2E7D32' }, // Darker green for forest ground
    [TILE_TYPE_TREE]: { top: '#7CB342', left: '#689F38', right: '#558B2F' } // Colors for tree leaves
};
const TREE_TRUNK_COLOR = { top: '#A1887F', left: '#8D6E63', right: '#795548' }; // Brown for tree trunk

// --- Game Map Data (will be generated) ---
let gameMap = [];

// --- Player Object ---
const player = {
    x: 0, // Player's X grid coordinate
    y: 0, // Player's Y grid coordinate
    color: '#FFD700', // Gold color for the player
    width: TILE_ISO_WIDTH * 0.4, // Player width (e.g., 40% of tile width)
    height: TILE_ISO_HEIGHT * 1.5 // Player height (e.g., 1.5 times tile height for a simple sprite)
};

// --- Coordinate Conversion Function (Grid to Isometric Screen) ---
// Returns the screen coordinates of the TOP-MIDDLE point of the isometric tile's top diamond
function isoToScreen(x, y) {
    const screenX = (x - y) * (TILE_ISO_WIDTH / 2) + globalDrawOffsetX;
    const screenY = (x + y) * (TILE_ISO_HEIGHT / 2) + globalDrawOffsetY;
    return { x: screenX, y: screenY };
}

// --- Drawing Helper Functions ---

// Draws an isometric diamond (like a flat ground tile)
// screenX_top_middle, screenY_top_middle are the canvas coordinates of the top-middle vertex of the diamond
function drawIsometricDiamond(colorSet, screenX_top_middle, screenY_top_middle) {
    // Top face
    ctx.fillStyle = colorSet.top;
    ctx.beginPath();
    ctx.moveTo(screenX_top_middle, screenY_top_middle + TILE_ISO_HEIGHT / 2); // Left middle
    ctx.lineTo(screenX_top_middle + TILE_ISO_WIDTH / 2, screenY_top_middle); // Top middle
    ctx.lineTo(screenX_top_middle + TILE_ISO_WIDTH, screenY_top_middle + TILE_ISO_HEIGHT / 2); // Right middle
    ctx.lineTo(screenX_top_middle + TILE_ISO_WIDTH / 2, screenY_top_middle + TILE_ISO_HEIGHT); // Bottom middle
    ctx.closePath();
    ctx.fill();
}


// Draws an isometric 3D block composed of top, left, and right faces.
// screenX_top_middle: Screen X-coordinate of the top-middle vertex of this block's top diamond face.
// screenY_top_middle: Screen Y-coordinate of the top-middle vertex of this block's top diamond face.
// blockZHeight: The actual pixel height of the block from its base to the bottom of its top diamond.
// blockIsoWidth: The effective pixel width of the block's top diamond face.
// blockIsoHeight: The effective pixel height of the block's top diamond face.
// colors: { top, left, right } for the face colors.
function drawIsometric3DBlock(screenX_top_middle, screenY_top_middle, blockZHeight, blockIsoWidth, blockIsoHeight, colors) {
    const halfBlockIsoWidth = blockIsoWidth / 2;
    const halfBlockIsoHeight = blockIsoHeight / 2;

    // Top face (diamond)
    ctx.fillStyle = colors.top;
    ctx.beginPath();
    ctx.moveTo(screenX_top_middle, screenY_top_middle + halfBlockIsoHeight);
    ctx.lineTo(screenX_top_middle + halfBlockIsoWidth, screenY_top_middle);
    ctx.lineTo(screenX_top_middle + blockIsoWidth, screenY_top_middle + halfBlockIsoHeight);
    ctx.lineTo(screenX_top_middle + halfBlockIsoWidth, screenY_top_middle + blockIsoHeight);
    ctx.closePath();
    ctx.fill();

    // Left face (parallelogram)
    ctx.fillStyle = colors.left;
    ctx.beginPath();
    ctx.moveTo(screenX_top_middle, screenY_top_middle + halfBlockIsoHeight);
    ctx.lineTo(screenX_top_middle, screenY_top_middle + halfBlockIsoHeight + blockZHeight); // Bottom-left
    ctx.lineTo(screenX_top_middle + halfBlockIsoWidth, screenY_top_middle + blockIsoHeight + blockZHeight); // Bottom-middle
    ctx.lineTo(screenX_top_middle + halfBlockIsoWidth, screenY_top_middle + blockIsoHeight); // Top-middle
    ctx.closePath();
    ctx.fill();

    // Right face (parallelogram)
    ctx.fillStyle = colors.right;
    ctx.beginPath();
    ctx.moveTo(screenX_top_middle + blockIsoWidth, screenY_top_middle + halfBlockIsoHeight);
    ctx.lineTo(screenX_top_middle + blockIsoWidth, screenY_top_middle + halfBlockIsoHeight + blockZHeight); // Bottom-right
    ctx.lineTo(screenX_top_middle + halfBlockIsoWidth, screenY_top_middle + blockIsoHeight + blockZHeight); // Bottom-middle
    ctx.lineTo(screenX_top_middle + halfBlockIsoWidth, screenY_top_middle + blockIsoHeight); // Top-middle
    ctx.closePath();
    ctx.fill();
}

// Draws the player as a simple rectangle (or you can expand this to a simple isometric figure)
function drawPlayer() {
    const screenPos = isoToScreen(player.x, player.y);

    // Calculate player's actual drawing position
    // Center the player horizontally on the tile
    const playerDrawX = screenPos.x + (TILE_ISO_WIDTH / 2) - (player.width / 2);
    // Position player's feet at the bottom-middle of the tile, then shift up by player height
    const playerDrawY = screenPos.y + TILE_ISO_HEIGHT - player.height;

    ctx.fillStyle = player.color;
    ctx.fillRect(playerDrawX, playerDrawY, player.width, player.height);
    ctx.strokeStyle = '#000'; // Black border for visibility
    ctx.strokeRect(playerDrawX, playerDrawY, player.width, player.height);
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

    // 2. Generate Lake (using a more organic "blob" method)
    const initialLakeSize = Math.floor(Math.random() * 3) + 2; // Start with a small blob of 2-4 tiles
    const lakeIterations = 5; // Fewer iterations for less expansion
    const lakeGrowthChance = 0.4; // Slightly lower chance for a neighbor to become water
    const lakeShrinkChance = 0.08; // Slightly higher chance for water to revert (more inlets/islands)

    // Pick a random starting point for the lake
    let lakeStartX = Math.floor(Math.random() * (MAP_WIDTH - initialLakeSize));
    let lakeStartY = Math.floor(Math.random() * (MAP_HEIGHT - initialLakeSize));

    // Create initial lake seed
    for (let y = lakeStartY; y < lakeStartY + initialLakeSize; y++) {
        for (let x = lakeStartX; x < lakeStartX + initialLakeSize; x++) {
            if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                gameMap[y][x] = TILE_TYPE_LAKE_WATER;
            }
        }
    }

    // Expand lake iteratively
    for (let i = 0; i < lakeIterations; i++) {
        let newMapState = JSON.parse(JSON.stringify(gameMap)); // Create a copy to apply changes simultaneously
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (gameMap[y][x] === TILE_TYPE_LAKE_WATER) {
                    // Try to expand to neighbors
                    const neighbors = [
                        { dx: 0, dy: -1 }, // North
                        { dx: 0, dy: 1 },  // South
                        { dx: -1, dy: 0 }, // West
                        { dx: 1, dy: 0 }   // East
                    ];
                    for (const neighbor of neighbors) {
                        const nx = x + neighbor.dx;
                        const ny = y + neighbor.dy;

                        if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
                            if (gameMap[ny][nx] !== TILE_TYPE_LAKE_WATER && Math.random() < lakeGrowthChance) {
                                newMapState[ny][nx] = TILE_TYPE_LAKE_WATER;
                            }
                        }
                    }
                    // Small chance for water to revert to land (for more irregular shapes/islands)
                    if (Math.random() < lakeShrinkChance) {
                        newMapState[y][x] = TILE_TYPE_PLAINS;
                    }
                }
            }
        }
        gameMap = newMapState; // Update the map for the next iteration
    }


    // 3. Generate Forest Biome (covers a portion of remaining land)
    const forestAreaWidth = Math.floor(Math.random() * (MAP_WIDTH / 2)) + Math.floor(MAP_WIDTH / 4) + 2; // Increased base size
    const forestAreaHeight = Math.floor(Math.random() * (MAP_HEIGHT / 2)) + Math.floor(MAP_HEIGHT / 4) + 2; // Increased base size
    const forestStartX = Math.floor(Math.random() * (MAP_WIDTH - forestAreaWidth));
    const forestStartY = Math.floor(Math.random() * (MAP_HEIGHT - forestAreaHeight));

    for (let y = forestStartY; y < forestStartY + forestAreaHeight; y++) {
        for (let x = forestStartX; x < forestStartX + forestAreaWidth; x++) {
            if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                if (gameMap[y][x] === TILE_TYPE_PLAINS) {
                    gameMap[y][x] = TILE_TYPE_FOREST_GROUND;
                }
            }
        }
    }

    // 4. Place individual Trees within Forest_Ground tiles
    const treeDensity = 0.3;
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (gameMap[y][x] === TILE_TYPE_FOREST_GROUND) {
                if (Math.random() < treeDensity) {
                    gameMap[y][x] = TILE_TYPE_TREE;
                }
            }
        }
    }

    // 5. Place Player on a valid starting tile (Plains or Forest Ground)
    // Find a random valid starting position for the player
    let placedPlayer = false;
    while (!placedPlayer) {
        const startX = Math.floor(Math.random() * MAP_WIDTH);
        const startY = Math.floor(Math.random() * MAP_HEIGHT);
        const tileType = gameMap[startY][startX];

        if (tileType === TILE_TYPE_PLAINS || tileType === TILE_TYPE_FOREST_GROUND) {
            player.x = startX;
            player.y = startY;
            placedPlayer = true;
        }
    }
}


// --- Main Drawing Function ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas

    // Iterate through the map in drawing order (from top-left to bottom-right in isometric space)
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tileType = gameMap[y][x];
            const screenPos = isoToScreen(x, y); // Get top-middle screen coords of the ground tile

            // Draw the ground tile
            const groundColorSet = tileColors[
                tileType === TILE_TYPE_TREE ? TILE_TYPE_FOREST_GROUND : tileType
            ] || tileColors[TILE_TYPE_PLAINS];
            drawIsometricDiamond(groundColorSet, screenPos.x, screenPos.y);

            // Draw 3D objects (trees)
            if (tileType === TILE_TYPE_TREE) {
                const TRUNK_Z_HEIGHT = TILE_ISO_HEIGHT * 2.0;
                const TRUNK_ISO_WIDTH_SCALE = 0.4;
                const TRUNK_ISO_HEIGHT_SCALE = 0.4;

                const LEAVES_Z_HEIGHT = TILE_ISO_HEIGHT * 1.5;
                const LEAVES_ISO_WIDTH_SCALE = 1.4;
                const LEAVES_ISO_HEIGHT_SCALE = 1.4;

                const trunkTopScreenY = screenPos.y - TRUNK_Z_HEIGHT + (TILE_ISO_HEIGHT / 2);
                drawIsometric3DBlock(
                    screenPos.x + (TILE_ISO_WIDTH / 2) - (TILE_ISO_WIDTH * TRUNK_ISO_WIDTH_SCALE / 2),
                    trunkTopScreenY,
                    TRUNK_Z_HEIGHT,
                    TILE_ISO_WIDTH * TRUNK_ISO_WIDTH_SCALE,
                    TILE_ISO_HEIGHT * TRUNK_ISO_HEIGHT_SCALE,
                    TREE_TRUNK_COLOR
                );

                const leavesTopScreenY = trunkTopScreenY - LEAVES_Z_HEIGHT + (TILE_ISO_HEIGHT * TRUNK_ISO_HEIGHT_SCALE / 2);
                drawIsometric3DBlock(
                    screenPos.x + (TILE_ISO_WIDTH / 2) - (TILE_ISO_WIDTH * LEAVES_ISO_WIDTH_SCALE / 2),
                    leavesTopScreenY,
                    LEAVES_Z_HEIGHT,
                    TILE_ISO_WIDTH * LEAVES_ISO_WIDTH_SCALE,
                    TILE_ISO_HEIGHT * LEAVES_ISO_HEIGHT_SCALE,
                    tileColors[TILE_TYPE_TREE]
                );
            }
        }
    }
    // Draw player AFTER all tiles, to ensure it's on top
    drawPlayer();
}

// --- Movement Logic and Collision Detection ---
function movePlayer(dx, dy) {
    const newX = player.x + dx;
    const newY = player.y + dy;

    // Check map boundaries
    if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT) {
        const targetTileType = gameMap[newY][newX];

        // Collision check: Cannot walk on water or trees
        if (targetTileType !== TILE_TYPE_LAKE_WATER && targetTileType !== TILE_TYPE_TREE) {
            player.x = newX;
            player.y = newY;
            draw(); // Redraw the map with the player in the new position
        } else {
            console.log("Collision! Cannot move there."); // For debugging
        }
    }
}

// --- Keyboard Input Handling ---
document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w': // Move Up-Left (isometric N/W)
            movePlayer(0, -1);
            break;
        case 's': // Move Down-Right (isometric S/E)
            movePlayer(0, 1);
            break;
        case 'a': // Move Down-Left (isometric S/W)
            movePlayer(-1, 0);
            break;
        case 'd': // Move Up-Right (isometric N/E)
            movePlayer(1, 0);
            break;
    }
});


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
