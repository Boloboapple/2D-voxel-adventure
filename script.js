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
const GAME_VERSION = 9; // <--- INCREMENTED TO 8 FOR PLAYER BODY/LEG SORTING FIXES!
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
    targetX: 0, // Player's target X grid coordinate for movement
    targetY: 0, // Player's target Y grid coordinate for movement
    bodyColor: { top: '#FFD700', left: '#DAA520', right: '#B8860B' }, // Gold colors for body
    legColor: { top: '#CD853F', left: '#8B4513', right: '#A0522D' }, // Brown colors for legs
    isMoving: false, // Flag to indicate if player is currently interpolating between tiles
    moveSpeed: 0.05, // How fast player interpolates (0.01 - 1.0, larger is faster) - DECREASED FOR SLOWER MOVEMENT
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
            player.targetX = startX; // Initialize target to current position
            player.targetY = startY; // Initialize target to current position
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
                sortY: screenPos.y + TILE_ISO_HEIGHT, // Sort by the lowest point of the tile
                colorSet: groundColorSet
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
                    // Sort by the lowest point of the trunk.
                    // Player will be sorted between trunk and leaves
                    sortY: screenPos.y + TILE_ISO_HEIGHT + TRUNK_Z_HEIGHT
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
                    // Leaves have a higher sortY to be drawn after player and trunk
                    sortY: screenPos.y + TILE_ISO_HEIGHT + TRUNK_Z_HEIGHT + LEAVES_Z_HEIGHT
                });
            }
        }
    }

    // --- Add Player components to drawables separately ---
    const playerScreenPos = isoToScreen(player.x, player.y); // Use interpolated player.x, player.y

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

    // Calculate base Y for the entire player figure (feet on the ground)
    // This is the effective ground level for the player.
    const playerActualGroundY = playerScreenPos.y + TILE_ISO_HEIGHT;

    // Calculate the top of the legs relative to playerActualGroundY and visual lift
    const legsTopY = playerActualGroundY - PLAYER_LEG_Z_HEIGHT + (PLAYER_LEG_ISO_HEIGHT / 2) - PLAYER_VISUAL_LIFT_OFFSET;

    // Player Leg A
    drawables.push({
        type: 'playerLeg',
        x: player.x, y: player.y,
        screenX: playerScreenPos.x + (TILE_ISO_WIDTH / 2) - (PLAYER_BODY_ISO_WIDTH / 2) + (PLAYER_BODY_ISO_WIDTH * 0.1),
        screenY: legsTopY + animOffsetA,
        zHeight: PLAYER_LEG_Z_HEIGHT,
        isoWidth: PLAYER_LEG_ISO_WIDTH,
        isoHeight: PLAYER_LEG_ISO_HEIGHT,
        colors: player.legColor,
        // Sort at its lowest point. Needs to be above the tile (playerActualGroundY)
        // Adding player.y as a secondary sort for legs on the same tile but slightly different interpolated y
        sortY: playerActualGroundY + (player.y * 0.001) + 0.01 // Epsilon + interpolated Y for smoother sorting during movement
    });

    // Player Leg B
    drawables.push({
        type: 'playerLeg',
        x: player.x, y: player.y,
        screenX: playerScreenPos.x + (TILE_ISO_WIDTH / 2) + (PLAYER_BODY_ISO_WIDTH / 2) - (PLAYER_LEG_ISO_WIDTH) - (PLAYER_BODY_ISO_WIDTH * 0.1),
        screenY: legsTopY + animOffsetB,
        zHeight: PLAYER_LEG_Z_HEIGHT,
        isoWidth: PLAYER_LEG_ISO_WIDTH,
        isoHeight: PLAYER_LEG_ISO_HEIGHT,
        colors: player.legColor,
        // Sort at its lowest point. Needs to be above the tile (playerActualGroundY)
        // Adding player.y as a secondary sort for legs on the same tile but slightly different interpolated y
        sortY: playerActualGroundY + (player.y * 0.001) + 0.02 // Slightly larger epsilon for the second leg
    });

    // Player Body
    const bodyTopY = legsTopY - PLAYER_BODY_Z_HEIGHT + (PLAYER_BODY_ISO_HEIGHT / 2);
    drawables.push({
        type: 'playerBody',
        x: player.x, y: player.y,
        screenX: playerScreenPos.x + (TILE_ISO_WIDTH / 2) - (PLAYER_BODY_ISO_WIDTH / 2),
        screenY: bodyTopY,
        zHeight: PLAYER_BODY_Z_HEIGHT,
        isoWidth: PLAYER_BODY_ISO_WIDTH,
        isoHeight: PLAYER_BODY_ISO_HEIGHT,
        colors: player.bodyColor,
        // The sortY for the body should be its lowest point, where it connects to the legs.
        // This is visually above the legs.
        // It needs to be consistently sorted *after* the legs.
        sortY: legsTopY + PLAYER_LEG_Z_HEIGHT + (PLAYER_LEG_ISO_HEIGHT / 2) + (player.y * 0.001) + 0.03 // Epsilon + interpolated Y for smoother sorting
    });


    // Sort drawables by their sortY (depth), then by grid Y (for tie-breaking on same screenY line), then by grid X
    drawables.sort((a, b) => {
        // Primary sort by actual screen Y of their lowest point (or effective base)
        if (a.sortY !== b.sortY) {
            return a.sortY - b.sortY;
        }
        // Secondary sort by grid Y for items on the same sortY level (important for isometric depth)
        // Using player.y for player components for smoother interpolated sorting
        const aY = a.type.startsWith('player') ? a.y : a.y;
        const bY = b.type.startsWith('player') ? b.y : b.y;

        if (aY !== bY) {
            return aY - bY;
        }
        // Tertiary sort by grid X for items on the same grid Y and sortY level
        if (a.x !== b.x) {
            return a.x - b.x;
        }
        // Tie-breaker for objects on the exact same tile and same sortY (e.g., player vs. tree components)
        // Order based on your request: Tile -> Tree Trunk -> Player Legs -> Player Body -> Tree Leaves
        // MODIFIED ORDER: Player Body (3) now draws AFTER Player Legs (2)
        const typeOrder = { 'tile': 0, 'treeTrunk': 1, 'playerLeg': 2, 'playerBody': 3, 'treeLeaves': 4 };
        return typeOrder[a.type] - typeOrder[b.type];
    });

    // Draw all sorted entities
    drawables.forEach(entity => {
        if (entity.type === 'tile') {
            drawIsometricDiamond(entity.colorSet, entity.screenX, entity.screenY);
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

// --- Movement Logic and Collision Detection ---
function movePlayer(dx, dy) {
    const newTargetX = player.targetX + dx;
    const newTargetY = player.targetY + dy;

    // Check map boundaries for the target tile
    if (newTargetX >= 0 && newTargetX < MAP_WIDTH && newTargetY >= 0 && newTargetY < MAP_HEIGHT) {
        const targetTileType = gameMap[newTargetY][newTargetX];

        // COLLISION FIX: Cannot walk on water or *any* tile where a tree exists
        if (targetTileType !== TILE_TYPE_LAKE_WATER && targetTileType !== TILE_TYPE_TREE) {
            player.targetX = newTargetX;
            player.targetY = newTargetY;
            player.isMoving = true; // Start interpolation and animation
            player.animationFrame = 0; // Reset animation frame
        } else {
            // console.log("Collision! Cannot move there.");
        }
    }
}

// --- Game Loop ---
function gameLoop() {
    // 1. Update Player Position (Interpolation)
    // Check if current (x,y) is different from target (x,y)
    if (Math.abs(player.x - player.targetX) > player.moveSpeed / 2 || Math.abs(player.y - player.targetY) > player.moveSpeed / 2) {
        player.isMoving = true;

        // Move X
        if (player.x < player.targetX) {
            player.x = Math.min(player.x + player.moveSpeed, player.targetX);
        } else if (player.x > player.targetX) {
            player.x = Math.max(player.x - player.moveSpeed, player.targetX);
        }

        // Move Y
        if (player.y < player.targetY) {
            player.y = Math.min(player.y + player.moveSpeed, player.targetY);
        } else if (player.y > player.targetY) {
            player.y = Math.max(player.y - player.moveSpeed, player.targetY);
        }

        // Check if movement is complete (or very close)
        // Using a small epsilon for float comparison
        if (Math.abs(player.x - player.targetX) < 0.01 && Math.abs(player.y - player.targetY) < 0.01) {
            player.x = player.targetX; // Snap to target to prevent floating point issues
            player.y = player.targetY;
            player.isMoving = false; // Stop interpolation
            player.animationFrame = 0; // Reset animation when movement stops
        }
    } else {
        player.isMoving = false; // Ensure isMoving is false if at target
    }


    // 2. Update Animation Frame if moving
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
    // Only allow a new move command if player is not currently interpolating to a target
    if (!player.isMoving) {
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
    }
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
    player.x = player.targetX; // Snap player to current target position to avoid issues
    player.y = player.targetY;
    player.isMoving = false; // Stop any ongoing animation
    player.animationFrame = 0; // Reset animation
    player.frameCount = 0; // Reset frame counter
    // The gameLoop will automatically redraw
});
