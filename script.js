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

// Calculate required canvas dimensions based on map size and object height
// The width needs to accommodate the full diagonal span of the isometric map.
// The height needs to accommodate the vertical span of the map plus the height of the tallest object.
const requiredCanvasWidth = (MAP_WIDTH + MAP_HEIGHT) * (TILE_ISO_WIDTH / 2);
const requiredCanvasHeight = (MAP_WIDTH + MAP_HEIGHT) * (TILE_ISO_HEIGHT / 2) + MAX_OBJECT_HEIGHT_FROM_GROUND;

// Add some padding to ensure nothing is clipped at the edges
const paddingX = TILE_ISO_WIDTH * 2;
const paddingY = TILE_ISO_HEIGHT * 2;

canvas.width = requiredCanvasWidth + paddingX;
canvas.height = requiredCanvasHeight + paddingY;

// --- Global Offset for the Isometric Drawing ---
// These offsets define where the (0,0) grid tile's top-middle point will be placed on the canvas.
// We need to ensure it's not negative and leaves enough space for the entire map.
// To center the map, we calculate the offset.
// The top-left corner of the isometric projection of the map (0,0) is at:
// X: MAP_HEIGHT * TILE_ISO_WIDTH / 2 (due to isometric skew)
// Y: MAX_OBJECT_HEIGHT_FROM_GROUND (to make space for tallest objects above the top-left tile)
const globalDrawOffsetX = (MAP_HEIGHT * TILE_ISO_WIDTH / 2) + (paddingX / 2); // Shift right to make space for leftmost map parts + padding
const globalDrawOffsetY = MAX_OBJECT_HEIGHT_FROM_GROUND + (paddingY / 2); // Shift down to make space for tree tops + padding

// Debugging: Log calculated values
console.log(`Canvas Dimensions: ${canvas.width}x${canvas.height}`);
console.log(`Global Draw Offset: X=${globalDrawOffsetX}, Y=${globalDrawOffsetY}`);


// --- GAME VERSION COUNTER ---
// IMPORTANT: INCREMENT THIS NUMBER EACH TIME YOU MAKE A CHANGE AND PUSH!
const GAME_VERSION = 14; // <--- INCREMENTED TO 14 FOR Z-SORTING FIX
console.log("------------------------------------------");
console.log(`>>> Game Version: ${GAME_VERSION} <<<`); // This will confirm load
console.log("------------------------------------------");

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
    x: 0, // Player's X grid coordinate (current interpolated position)
    y: 0, // Player's Y grid coordinate (current interpolated position)
    bodyColor: { top: '#FFD700', left: '#DAA520', right: '#B8860B' }, // Gold colors for body
    legColor: { top: '#CD853F', left: '#8B4513', right: '#A0522D' }, // Brown colors for legs
    isMoving: false, // Flag to indicate if player is currently moving (any key pressed)
    moveSpeed: 0.05, // How fast player moves (tiles per frame)
    animationFrame: 0, // Current frame of walking animation
    animationSpeed: 5, // How many game frames per animation frame (lower = faster)
    frameCount: 0 // Global frame counter for animation timing
};

// Define player body and leg dimensions relative to tile size
const PLAYER_BODY_Z_HEIGHT = TILE_ISO_HEIGHT * 0.8;
const PLAYER_BODY_ISO_WIDTH = TILE_ISO_WIDTH * 0.5;
const PLAYER_BODY_ISO_HEIGHT = TILE_ISO_HEIGHT * 0.5;

const PLAYER_LEG_Z_HEIGHT = TILE_ISO_HEIGHT * 0.5; // Adjusted height of each leg segment to be shorter
const PLAYER_LEG_ISO_WIDTH = TILE_ISO_WIDTH * 0.2; // Width of each leg
const PLAYER_LEG_ISO_HEIGHT = TILE_ISO_HEIGHT * 0.2; // Height of each leg's top diamond

// How much the player's entire figure is visually lifted from the tile's base.
// This is for visual appeal, not sorting.
const PLAYER_VISUAL_LIFT_OFFSET = TILE_ISO_HEIGHT * 0.5;

// --- Keyboard Input State ---
const keysPressed = {};

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
    const initialLakeSize = Math.floor(Math.random() * 3) + 2;
    const lakeIterations = 5;
    const lakeGrowthChance = 0.4;
    const lakeShrinkChance = 0.08;

    let lakeStartX = Math.floor(Math.random() * (MAP_WIDTH - initialLakeSize));
    let lakeStartY = Math.floor(Math.random() * (MAP_HEIGHT - initialLakeSize));

    for (let y = lakeStartY; y < lakeStartY + initialLakeSize; y++) {
        for (let x = lakeStartX; x < lakeStartX + initialLakeSize; x++) {
            if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                gameMap[y][x] = TILE_TYPE_LAKE_WATER;
            }
        }
    }

    for (let i = 0; i < lakeIterations; i++) {
        let newMapState = JSON.parse(JSON.stringify(gameMap));
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (gameMap[y][x] === TILE_TYPE_LAKE_WATER) {
                    const neighbors = [
                        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
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
                    if (Math.random() < lakeShrinkChance) {
                        newMapState[y][x] = TILE_TYPE_PLAINS;
                    }
                }
            }
        }
        gameMap = newMapState;
    }

    // 3. Generate Forest Biome (covers a portion of remaining land)
    const forestAreaWidth = Math.floor(Math.random() * (MAP_WIDTH / 2)) + Math.floor(MAP_WIDTH / 4) + 2;
    const forestAreaHeight = Math.floor(Math.random() * (MAP_HEIGHT / 2)) + Math.floor(MAP_HEIGHT / 4) + 2;
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


// --- Main Drawing Function (Modified for Z-sorting) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the version number on the canvas for easy verification
    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Version: ${GAME_VERSION}`, 10, 30);

    // Array to hold all drawable entities
    const drawables = [];

    // Add map tiles and trees to drawables
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tileType = gameMap[y][x];
            const screenPos = isoToScreen(x, y);

            // Determine the correct color set for the ground tile
            let groundColorSet;
            if (tileType === TILE_TYPE_TREE) {
                // If it's a tree tile, its ground is FOREST_GROUND
                groundColorSet = tileColors[TILE_TYPE_FOREST_GROUND];
            } else {
                // Otherwise, use its own tile type color
                groundColorSet = tileColors[tileType];
            }

            // Fallback: If for some reason a tile type is not defined in tileColors, use Plains
            if (!groundColorSet) {
                console.warn(`Warning: Missing color definition for tileType ${tileType}. Using PLAINS.`);
                groundColorSet = tileColors[TILE_TYPE_PLAINS];
            }

            // Add ground tile
            drawables.push({
                type: 'tile',
                x: x, y: y,
                screenX: screenPos.x,
                screenY: screenPos.y,
                // Sort by the absolute bottom of the tile on screen
                sortY: screenPos.y + TILE_ISO_HEIGHT // Base for tiles
            });

            // If it's a tree, add its components as separate drawables
            if (tileType === TILE_TYPE_TREE) {
                const TRUNK_Z_HEIGHT = TILE_ISO_HEIGHT * 2.0;
                const TRUNK_ISO_WIDTH_SCALE = 0.4;
                const TRUNK_ISO_HEIGHT_SCALE = 0.4;

                const LEAVES_Z_HEIGHT = TILE_ISO_HEIGHT * 1.5;
                const LEAVES_ISO_WIDTH_SCALE = 1.4;
                const LEAVES_ISO_HEIGHT_SCALE = 1.4;

                const trunkTopScreenY = screenPos.y - TRUNK_Z_HEIGHT + (TILE_ISO_HEIGHT / 2);
                const leavesTopScreenY = trunkTopScreenY - LEAVES_Z_HEIGHT + (TILE_ISO_HEIGHT * TRUNK_ISO_HEIGHT_SCALE / 2);

                // Add trunk
                drawables.push({
                    type: 'treeTrunk',
                    x: x, y: y,
                    screenX: screenPos.x + (TILE_ISO_WIDTH / 2) - (TILE_ISO_WIDTH * TRUNK_ISO_WIDTH_SCALE / 2),
                    screenY: trunkTopScreenY,
                    zHeight: TRUNK_Z_HEIGHT,
                    isoWidth: TILE_ISO_WIDTH * TRUNK_ISO_WIDTH_SCALE,
                    isoHeight: TILE_ISO_HEIGHT * TRUNK_ISO_HEIGHT_SCALE,
                    colors: TREE_TRUNK_COLOR,
                    // Trunk should be drawn after the tile. Its base is the same as the tile's.
                    sortY: screenPos.y + TILE_ISO_HEIGHT + 0.0005 // Just slightly above tile base
                });

                // Add leaves
                drawables.push({
                    type: 'treeLeaves',
                    x: x, y: y,
                    screenX: screenPos.x + (TILE_ISO_WIDTH / 2) - (TILE_ISO_WIDTH * LEAVES_ISO_WIDTH_SCALE / 2),
                    screenY: leavesTopScreenY,
                    zHeight: LEAVES_Z_HEIGHT,
                    isoWidth: TILE_ISO_WIDTH * LEAVES_ISO_WIDTH_SCALE,
                    isoHeight: TILE_ISO_HEIGHT * LEAVES_ISO_HEIGHT_SCALE,
                    colors: tileColors[TILE_TYPE_TREE], // Tree leaves use TILE_TYPE_TREE colors
                    // Leaves should be drawn above player and trunk
                    sortY: screenPos.y + TILE_ISO_HEIGHT + 0.0009 // Highest element on this tile's z-depth
                });
            }
        }
    }

    // --- Add Player components to drawables separately ---
    // Use interpolated player.x, player.y for player's current visual position
    const playerScreenPos = isoToScreen(player.x, player.y);

    // Animation offset for legs
    let animOffsetA = 0;
    let animOffsetB = 0;

    if (player.isMoving) {
        const frame = player.animationFrame;
        const liftAmount = TILE_ISO_HEIGHT * 0.08;
        if (frame === 0) { animOffsetA = -liftAmount; animOffsetB = 0; }
        else if (frame === 1) { animOffsetA = 0; animOffsetB = -liftAmount; }
        else if (frame === 2) { animOffsetA = -liftAmount; animOffsetB = 0; }
        else if (frame === 3) { animOffsetA = 0; animOffsetB = -liftAmount; }
    }

    // Calculate the base Y for the player's "feet" for sorting purposes.
    // This needs to be above the tile's base.
    // Use the player's screen Y, plus the full tile height, to get the absolute bottom-middle point of their base.
    // Then add a small epsilon (0.0001) to ensure they are always drawn after the ground tile.
    const playerBaseScreenYForSort = playerScreenPos.y + TILE_ISO_HEIGHT + 0.0001; // Epsilon to put player just above tile base


    // Player Leg A
    drawables.push({
        type: 'playerLeg',
        x: player.x, y: player.y,
        screenX: playerScreenPos.x + (TILE_ISO_WIDTH / 2) - (PLAYER_BODY_ISO_WIDTH / 2) + (PLAYER_BODY_ISO_WIDTH * 0.1),
        screenY: playerScreenPos.y + TILE_ISO_HEIGHT - PLAYER_VISUAL_LIFT_OFFSET - PLAYER_LEG_Z_HEIGHT + (PLAYER_LEG_ISO_HEIGHT / 2) + animOffsetA,
        zHeight: PLAYER_LEG_Z_HEIGHT,
        isoWidth: PLAYER_LEG_ISO_WIDTH,
        isoHeight: PLAYER_LEG_ISO_HEIGHT,
        colors: player.legColor,
        // Legs sort at their base, with a tiny offset for distinctness.
        sortY: playerBaseScreenYForSort
    });

    // Player Leg B
    drawables.push({
        type: 'playerLeg',
        x: player.x, y: player.y,
        screenX: playerScreenPos.x + (TILE_ISO_WIDTH / 2) + (PLAYER_BODY_ISO_WIDTH / 2) - (PLAYER_LEG_ISO_WIDTH) - (PLAYER_BODY_ISO_WIDTH * 0.1),
        screenY: playerScreenPos.y + TILE_ISO_HEIGHT - PLAYER_VISUAL_LIFT_OFFSET - PLAYER_LEG_Z_HEIGHT + (PLAYER_LEG_ISO_HEIGHT / 2) + animOffsetB,
        zHeight: PLAYER_LEG_Z_HEIGHT,
        isoWidth: PLAYER_LEG_ISO_WIDTH,
        isoHeight: PLAYER_LEG_ISO_HEIGHT,
        colors: player.legColor,
        // Legs sort at their base, with a tiny offset for distinctness.
        sortY: playerBaseScreenYForSort + 0.00001 // Make leg B draw slightly after leg A if on same base line
    });

    // Player Body
    drawables.push({
        type: 'playerBody',
        x: player.x, y: player.y,
        screenX: playerScreenPos.x + (TILE_ISO_WIDTH / 2) - (PLAYER_BODY_ISO_WIDTH / 2),
        screenY: playerScreenPos.y + TILE_ISO_HEIGHT - PLAYER_VISUAL_LIFT_OFFSET - PLAYER_LEG_Z_HEIGHT - PLAYER_BODY_Z_HEIGHT + (PLAYER_BODY_ISO_HEIGHT / 2),
        zHeight: PLAYER_BODY_Z_HEIGHT,
        isoWidth: PLAYER_BODY_ISO_WIDTH,
        isoHeight: PLAYER_BODY_ISO_HEIGHT,
        colors: player.bodyColor,
        // Body sorts above the legs' base.
        sortY: playerBaseScreenYForSort + 0.00002 // Body draws after legs
    });


    // Sort drawables by their sortY (depth), then by type order as a final tie-breaker.
    drawables.sort((a, b) => {
        if (a.sortY !== b.sortY) {
            return a.sortY - b.sortY;
        }
        // If sortY is identical (which should be rare with floating point numbers,
        // but good for robustness, especially if using integer sortY in future)
        // Order: Tile (0), Tree Trunk (1), Player Leg (2), Player Body (3), Tree Leaves (4)
        const typeOrder = { 'tile': 0, 'treeTrunk': 1, 'playerLeg': 2, 'playerBody': 3, 'treeLeaves': 4 };
        return typeOrder[a.type] - typeOrder[b.type];
    });

    // Draw all sorted entities
    drawables.forEach(entity => {
        if (entity.type === 'tile') {
            // Retrieve the tile's actual type from the gameMap to get its color
            drawIsometricDiamond(tileColors[gameMap[entity.y][entity.x]], entity.screenX, entity.screenY);
        } else if (entity.type === 'treeTrunk') {
            drawIsometric3DBlock(entity.screenX, entity.screenY, entity.zHeight, entity.isoWidth, entity.isoHeight, entity.colors);
        } else if (entity.type === 'treeLeaves') {
            drawIsometric3DBlock(entity.screenX, entity.screenY, entity.zHeight, entity.isoWidth, entity.isoHeight, entity.colors);
        } else if (entity.type === 'playerLeg' || entity.type === 'playerBody') {
            // These now have all the necessary properties in their entity object
            drawIsometric3DBlock(entity.screenX, entity.screenY, entity.zHeight, entity.isoWidth, entity.isoHeight, entity.colors);
        }
    });
}

// --- Game Loop ---
function gameLoop() {
    // 1. Handle Player Movement (Free Movement)
    let currentDx = 0; // Desired movement in X grid units
    let currentDy = 0; // Desired movement in Y grid units

    if (keysPressed['w']) { // Move Up-Left (isometric N/W)
        currentDy -= 1;
    }
    if (keysPressed['s']) { // Move Down-Right (isometric S/E)
        currentDy += 1;
    }
    if (keysPressed['a']) { // Move Down-Left (isometric S/W)
        currentDx -= 1;
    }
    if (keysPressed['d']) { // Move Up-Right (isometric N/E)
        currentDx += 1;
    }

    // Normalize diagonal movement speed (optional but good practice)
    // If moving diagonally, currentDx and currentDy would both be 1 or -1,
    // leading to faster movement. Normalize by dividing by sqrt(2).
    if (currentDx !== 0 && currentDy !== 0) {
        const diagonalFactor = 1 / Math.sqrt(2);
        currentDx *= diagonalFactor;
        currentDy *= diagonalFactor;
    }

    // Calculate potential new position
    const potentialNewX = player.x + currentDx * player.moveSpeed;
    const potentialNewY = player.y + currentDy * player.moveSpeed;

    // --- Collision Detection for Free Movement ---
    // Player's conceptual collision box (relative to its center)
    // Adjust these values to make the player "thinner" or "wider" for collision
    const playerCollisionWidth = 0.5; // Player occupies 50% of tile width for collision
    const playerCollisionHeight = 0.5; // Player occupies 50% of tile height for collision

    let canMoveX = true;
    let canMoveY = true;

    // Check X movement
    if (currentDx !== 0) {
        // Determine the horizontal bounds of the player's potential collision box
        const testLeft = (currentDx > 0) ? player.x - playerCollisionWidth / 2 : potentialNewX - playerCollisionWidth / 2;
        const testRight = (currentDx > 0) ? potentialNewX + playerCollisionWidth / 2 : player.x + playerCollisionWidth / 2;

        // Iterate through all Y-rows the player covers
        for (let yOffset = 0; yOffset < 1; yOffset += 0.5) { // Check top and bottom half of player collision vertically
            const checkY = Math.floor(potentialNewY - playerCollisionHeight / 2 + (playerCollisionHeight * yOffset));

            // Check the leading edge for X movement
            const checkX = Math.floor((currentDx > 0) ? testRight : testLeft);

            if (checkX < 0 || checkX >= MAP_WIDTH || checkY < 0 || checkY >= MAP_HEIGHT) {
                canMoveX = false; // Collides with map boundary
                break;
            }
            const tileType = gameMap[checkY][checkX];
            if (tileType === TILE_TYPE_LAKE_WATER || tileType === TILE_TYPE_TREE) {
                canMoveX = false;
                break;
            }
        }
    }

    // Check Y movement
    if (currentDy !== 0) {
        // Determine the vertical bounds of the player's potential collision box
        const testTop = (currentDy > 0) ? player.y - playerCollisionHeight / 2 : potentialNewY - playerCollisionHeight / 2;
        const testBottom = (currentDy > 0) ? potentialNewY + playerCollisionHeight / 2 : player.y + playerCollisionHeight / 2;

        // Iterate through all X-columns the player covers
        for (let xOffset = 0; xOffset < 1; xOffset += 0.5) { // Check left and right half of player collision horizontally
            const checkX = Math.floor(potentialNewX - playerCollisionWidth / 2 + (playerCollisionWidth * xOffset));

            // Check the leading edge for Y movement
            const checkY = Math.floor((currentDy > 0) ? testBottom : testTop);

            if (checkX < 0 || checkX >= MAP_WIDTH || checkY < 0 || checkY >= MAP_HEIGHT) {
                canMoveY = false; // Collides with map boundary
                break;
            }
            const tileType = gameMap[checkY][checkX];
            if (tileType === TILE_TYPE_LAKE_WATER || tileType === TILE_TYPE_TREE) {
                canMoveY = false;
                break;
            }
        }
    }

    // Apply movement only if no collision in that direction
    if (canMoveX) {
        player.x = potentialNewX;
    }
    if (canMoveY) {
        player.y = potentialNewY;
    }

    // Ensure player stays within map bounds (final clamp)
    player.x = Math.max(0 + playerCollisionWidth / 2, Math.min(MAP_WIDTH - playerCollisionWidth / 2, player.x));
    player.y = Math.max(0 + playerCollisionHeight / 2, Math.min(MAP_HEIGHT - playerCollisionHeight / 2, player.y));


    // Update isMoving flag and animation
    player.isMoving = (currentDx !== 0 || currentDy !== 0);

    // Animation update
    if (player.isMoving) {
        player.frameCount++;
        if (player.frameCount % player.animationSpeed === 0) {
            player.animationFrame = (player.animationFrame + 1) % 4; // 4 frames for the cycle
        }
    } else {
        player.frameCount = 0; // Reset frame counter when not moving
        player.animationFrame = 0; // Ensure legs are static when not moving
    }

    draw(); // Always redraw the entire scene

    requestAnimationFrame(gameLoop); // Request next frame
}


// --- Keyboard Input Handling ---
document.addEventListener('keydown', (event) => {
    keysPressed[event.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
});


// --- Initial Setup ---
generateMap(); // Generate the map once
// Start the game loop
requestAnimationFrame(gameLoop);


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
    // Reset player position to a valid starting tile on the new map
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
    player.isMoving = false; // Stop any ongoing animation
    player.animationFrame = 0; // Reset animation
    player.frameCount = 0; // Reset frame counter
    // The gameLoop will automatically redraw
});
