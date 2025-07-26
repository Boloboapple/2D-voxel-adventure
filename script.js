// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
const TILE_ISO_WIDTH = 64; // Base unit for isometric scaling
const TILE_ISO_HEIGHT = 32; // Base unit for isometric scaling

// Define the logical "world size" in terms of how many "base units" it spans
const WORLD_UNITS_WIDTH = 20;
const WORLD_UNITS_HEIGHT = 15;

// Max height of the tallest object (tree) in pixels from its ground plane
const MAX_OBJECT_HEIGHT_FROM_GROUND = TILE_ISO_HEIGHT * 3;

// Calculate required canvas dimensions based on the new world size
const totalIsoProjectionWidth = (WORLD_UNITS_WIDTH + WORLD_UNITS_HEIGHT) * (TILE_ISO_WIDTH / 2);
const totalIsoProjectionHeight = (WORLD_UNITS_WIDTH + WORLD_UNITS_HEIGHT) * (TILE_ISO_HEIGHT / 2);

// Add some padding to ensure nothing is clipped at the edges
const paddingX = TILE_ISO_WIDTH * 2;
const paddingY = TILE_ISO_HEIGHT * 2;

canvas.width = totalIsoProjectionWidth + paddingX;
canvas.height = totalIsoProjectionHeight + paddingY + MAX_OBJECT_HEIGHT_FROM_GROUND;

// --- Global Offset for the Isometric Drawing ---
const globalDrawOffsetX = (WORLD_UNITS_HEIGHT * TILE_ISO_WIDTH / 2) + (paddingX / 2);
const globalDrawOffsetY = MAX_OBJECT_HEIGHT_FROM_GROUND + (paddingY / 2);

// Debugging: Log calculated values
console.log(`Canvas Dimensions: ${canvas.width}x${canvas.height}`);
console.log(`Global Draw Offset: X=${globalDrawOffsetX}, Y=${globalDrawOffsetY}`);


// --- GAME VERSION COUNTER ---
// IMPORTANT: INCREMENT THIS NUMBER EACH TIME YOU MAKE A CHANGE AND PUSH!
const GAME_VERSION = 20; // <--- INCREMENTED TO 20 for refined sorting and lake
console.log("------------------------------------------");
console.log(`>>> Game Version: ${GAME_VERSION} <<<`); // This will confirm load
console.log("------------------------------------------");

// --- Colors for the single ground plane and biomes ---
const GROUND_COLORS = { top: '#66BB6A', left: '#4CAF50', right: '#388E3C' }; // Plains green
const LAKE_COLORS = { top: '#64B5F6', left: '#2196F3', right: '#1976D2' }; // Blue for lake water
const FOREST_GROUND_COLORS = { top: '#4CAF50', left: '#388E3C', right: '#2E7D32' }; // Darker green for forest ground

const TREE_TRUNK_COLOR = { top: '#A1887F', left: '#8D6E63', right: '#795548' }; // Brown for tree trunk
const TREE_LEAVES_COLOR = { top: '#7CB342', left: '#689F38', right: '#558B2F' }; // Green for tree leaves

// --- Player Object ---
const player = {
    x: WORLD_UNITS_WIDTH / 2, // Player's X world unit coordinate
    y: WORLD_UNITS_HEIGHT / 2, // Player's Y world unit coordinate
    bodyColor: { top: '#FFD700', left: '#DAA520', right: '#B8860B' }, // Gold colors for body
    legColor: { top: '#CD853F', left: '#8B4513', right: '#A0522D' }, // Brown colors for legs
    isMoving: false,
    moveSpeed: 0.05,
    animationFrame: 0,
    animationSpeed: 5,
    frameCount: 0
};

// Define player body and leg dimensions relative to tile size
const PLAYER_BODY_Z_HEIGHT = TILE_ISO_HEIGHT * 0.8;
const PLAYER_BODY_ISO_WIDTH = TILE_ISO_WIDTH * 0.5;
const PLAYER_BODY_ISO_HEIGHT = TILE_ISO_HEIGHT * 0.5;

const PLAYER_LEG_Z_HEIGHT = TILE_ISO_HEIGHT * 0.5;
const PLAYER_LEG_ISO_WIDTH = TILE_ISO_WIDTH * 0.2;
const PLAYER_LEG_ISO_HEIGHT = TILE_ISO_HEIGHT * 0.2;

const PLAYER_VISUAL_LIFT_OFFSET = TILE_ISO_HEIGHT * 0.5;

// --- World Biomes (new structure) ---
const worldBiomes = [];
const trees = [];

// --- Keyboard Input State ---
const keysPressed = {};

// --- Coordinate Conversion Function (World Unit to Isometric Screen) ---
// Returns the screen coordinates of the TOP-MIDDLE point of the isometric "unit"
function isoToScreen(x, y) {
    const screenX = (x - y) * (TILE_ISO_WIDTH / 2) + globalDrawOffsetX;
    const screenY = (x + y) * (TILE_ISO_HEIGHT / 2) + globalDrawOffsetY;
    return { x: screenX, y: screenY };
}

// --- Drawing Helper Functions ---

// Draws an isometric diamond (like a flat ground plane or a biome patch)
// screenX_top_middle, screenY_top_middle are the canvas coordinates of the top-middle vertex of the diamond
// isoWidth and isoHeight define the dimensions of this specific diamond
function drawIsometricDiamond(colorSet, screenX_top_middle, screenY_top_middle, isoWidth, isoHeight) {
    const halfIsoWidth = isoWidth / 2;
    const halfIsoHeight = isoHeight / 2;

    // Top face
    ctx.fillStyle = colorSet.top;
    ctx.beginPath();
    ctx.moveTo(screenX_top_middle, screenY_top_middle + halfIsoHeight); // Left middle
    ctx.lineTo(screenX_top_middle + halfIsoWidth, screenY_top_middle); // Top middle
    ctx.lineTo(screenX_top_middle + isoWidth, screenY_top_middle + halfIsoHeight); // Right middle
    ctx.lineTo(screenX_top_middle + halfIsoWidth, screenY_top_middle + isoHeight); // Bottom middle
    ctx.closePath();
    ctx.fill();
}

// Draws an isometric 3D block
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


// --- Initial Map/World Setup Function ---
function setupWorld() {
    worldBiomes.length = 0; // Clear previous biomes
    trees.length = 0; // Clear previous trees

    // Define the main ground plane biome (covers the entire world)
    worldBiomes.push({
        type: 'ground',
        x: 0, y: 0,
        width: WORLD_UNITS_WIDTH,
        height: WORLD_UNITS_HEIGHT,
        colors: GROUND_COLORS
    });

    // Add a Lake biome (rectangular for now)
    worldBiomes.push({
        type: 'lake',
        x: 12, y: 3,
        width: 6, height: 4,
        colors: LAKE_COLORS
    });

    // Add a Forest biome (rectangular for now)
    worldBiomes.push({
        type: 'forest',
        x: 2, y: 8,
        width: 8, height: 6,
        colors: FOREST_GROUND_COLORS // Use forest ground colors for the biome patch
    });

    // Place trees within the forest biome
    const forestBiome = worldBiomes.find(b => b.type === 'forest');
    if (forestBiome) {
        const treeDensity = 0.4; // 40% chance to place a tree in a unit square
        for (let y = forestBiome.y; y < forestBiome.y + forestBiome.height; y++) {
            for (let x = forestBiome.x; x < forestBiome.x + forestBiome.width; x++) {
                if (Math.random() < treeDensity) {
                    // Add slight random offset within the unit square for natural look
                    trees.push({ x: x + Math.random(), y: y + Math.random() });
                }
            }
        }
    }

    // Place player at the center of the world
    player.x = WORLD_UNITS_WIDTH / 2;
    player.y = WORLD_UNITS_HEIGHT / 2;
    player.isMoving = false;
    player.animationFrame = 0;
    player.frameCount = 0;
}


// --- Main Drawing Function (Modified for Biome Patches and Sorting) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Version: ${GAME_VERSION}`, 10, 30);

    const drawables = [];

    // --- Add Ground Patches for Biomes ---
    for (let y = 0; y < WORLD_UNITS_HEIGHT; y++) {
        for (let x = 0; x < WORLD_UNITS_WIDTH; x++) {
            const screenPos = isoToScreen(x, y);

            let tileColors = GROUND_COLORS; // Default to plains ground
            let isWater = false;

            // Determine biome color for this conceptual unit square
            for (const biome of worldBiomes) {
                if (x >= biome.x && x < biome.x + biome.width &&
                    y >= biome.y && y < biome.y + biome.height) {
                    tileColors = biome.colors;
                    if (biome.type === 'lake') {
                        isWater = true;
                    }
                    break;
                }
            }

            drawables.push({
                type: 'groundPatch',
                x: x, y: y,
                screenX: screenPos.x,
                screenY: screenPos.y,
                isoWidth: TILE_ISO_WIDTH,
                isoHeight: TILE_ISO_HEIGHT,
                colors: tileColors,
                isWater: isWater,
                // Sort by the bottom-most point of the diamond
                sortY: screenPos.y + TILE_ISO_HEIGHT + 0.0 // Ground patches are the base layer
            });
        }
    }


    // --- Add Trees to drawables ---
    trees.forEach(tree => {
        const treeScreenPos = isoToScreen(tree.x, tree.y);

        const TRUNK_Z_HEIGHT = TILE_ISO_HEIGHT * 2.0;
        const TRUNK_ISO_WIDTH_SCALE = 0.4;
        const TRUNK_ISO_HEIGHT_SCALE = 0.4;

        const LEAVES_Z_HEIGHT = TILE_ISO_HEIGHT * 1.5;
        const LEAVES_ISO_WIDTH_SCALE = 1.4;
        const LEAVES_ISO_HEIGHT_SCALE = 1.4;

        const trunkTopScreenY = treeScreenPos.y - TRUNK_Z_HEIGHT + (TILE_ISO_HEIGHT / 2);
        const leavesTopScreenY = trunkTopScreenY - LEAVES_Z_HEIGHT + (TILE_ISO_HEIGHT * TRUNK_ISO_HEIGHT_SCALE / 2);

        // Calculate the deepest visual point of the tree for sorting.
        // This is the bottom-most point of the trunk's right or left face.
        const treeBaseScreenY = treeScreenPos.y + TILE_ISO_HEIGHT + TRUNK_Z_HEIGHT; // Y coord of the ground point + its height
        
        drawables.push({
            type: 'treeTrunk',
            x: tree.x, y: tree.y,
            screenX: treeScreenPos.x + (TILE_ISO_WIDTH / 2) - (TILE_ISO_WIDTH * TRUNK_ISO_WIDTH_SCALE / 2),
            screenY: trunkTopScreenY,
            zHeight: TRUNK_Z_HEIGHT,
            isoWidth: TILE_ISO_WIDTH * TRUNK_ISO_WIDTH_SCALE,
            isoHeight: TILE_ISO_HEIGHT * TRUNK_ISO_HEIGHT_SCALE,
            colors: TREE_TRUNK_COLOR,
            sortY: treeBaseScreenY + 0.001 // Slightly above ground patches
        });

        drawables.push({
            type: 'treeLeaves',
            x: tree.x, y: tree.y,
            screenX: treeScreenPos.x + (TILE_ISO_WIDTH / 2) - (TILE_ISO_WIDTH * LEAVES_ISO_WIDTH_SCALE / 2),
            screenY: leavesTopScreenY,
            zHeight: LEAVES_Z_HEIGHT,
            isoWidth: LEAVES_ISO_WIDTH_SCALE * TILE_ISO_WIDTH, // Use TILE_ISO_WIDTH for scaling
            isoHeight: LEAVES_ISO_HEIGHT_SCALE * TILE_ISO_HEIGHT, // Use TILE_ISO_HEIGHT for scaling
            colors: TREE_LEAVES_COLOR,
            sortY: treeBaseScreenY + 0.002 // Leaves are higher than trunks
        });
    });

    // --- Add Player components to drawables ---
    const playerScreenPos = isoToScreen(player.x, player.y);

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

    // Calculate player's effective "ground" Y for sorting
    // This is the player's ground-level screen Y + its height (PLAYER_LEG_Z_HEIGHT + PLAYER_BODY_Z_HEIGHT)
    const playerSortY = playerScreenPos.y + TILE_ISO_HEIGHT + PLAYER_LEG_Z_HEIGHT + PLAYER_BODY_Z_HEIGHT;

    drawables.push({
        type: 'playerLeg',
        x: player.x, y: player.y,
        screenX: playerScreenPos.x + (TILE_ISO_WIDTH / 2) - (PLAYER_BODY_ISO_WIDTH / 2) + (PLAYER_BODY_ISO_WIDTH * 0.1),
        screenY: playerScreenPos.y + TILE_ISO_HEIGHT - PLAYER_VISUAL_LIFT_OFFSET - PLAYER_LEG_Z_HEIGHT + (PLAYER_LEG_ISO_HEIGHT / 2) + animOffsetA,
        zHeight: PLAYER_LEG_Z_HEIGHT,
        isoWidth: PLAYER_LEG_ISO_WIDTH,
        isoHeight: PLAYER_LEG_ISO_HEIGHT,
        colors: player.legColor,
        sortY: playerSortY + 0.003 // Player legs are at a similar depth to body
    });

    drawables.push({
        type: 'playerLeg',
        x: player.x, y: player.y,
        screenX: playerScreenPos.x + (TILE_ISO_WIDTH / 2) + (PLAYER_BODY_ISO_WIDTH / 2) - (PLAYER_LEG_ISO_WIDTH) - (PLAYER_BODY_ISO_WIDTH * 0.1),
        screenY: playerScreenPos.y + TILE_ISO_HEIGHT - PLAYER_VISUAL_LIFT_OFFSET - PLAYER_LEG_Z_HEIGHT + (PLAYER_LEG_ISO_HEIGHT / 2) + animOffsetB,
        zHeight: PLAYER_LEG_Z_HEIGHT,
        isoWidth: PLAYER_LEG_ISO_WIDTH,
        isoHeight: PLAYER_LEG_ISO_HEIGHT,
        colors: player.legColor,
        sortY: playerSortY + 0.0031 // Slight offset for sorting between legs
    });

    drawables.push({
        type: 'playerBody',
        x: player.x, y: player.y,
        screenX: playerScreenPos.x + (TILE_ISO_WIDTH / 2) - (PLAYER_BODY_ISO_WIDTH / 2),
        screenY: playerScreenPos.y + TILE_ISO_HEIGHT - PLAYER_VISUAL_LIFT_OFFSET - PLAYER_LEG_Z_HEIGHT - PLAYER_BODY_Z_HEIGHT + (PLAYER_BODY_ISO_HEIGHT / 2),
        zHeight: PLAYER_BODY_Z_HEIGHT,
        isoWidth: PLAYER_BODY_ISO_WIDTH,
        isoHeight: PLAYER_BODY_ISO_HEIGHT,
        colors: player.bodyColor,
        sortY: playerSortY + 0.0032 // Player body is slightly "higher" in screen Y but should sort with other player parts
    });


    // Sort drawables by their sortY (bottom-most visible point on screen)
    // Objects with a lower sortY value are drawn first (further away/below).
    drawables.sort((a, b) => {
        // Primary sort: by the calculated sortY
        if (a.sortY !== b.sortY) {
            return a.sortY - b.sortY;
        }

        // Secondary sort: for items with identical sortY (e.g., within the same "slice")
        // This is a tie-breaker. You can define specific drawing orders for types if needed.
        // For example, if two objects have the exact same sortY, which one draws on top?
        // This is where explicit drawing order (e.g., ground first, then trunks, then player, then leaves) helps.
        const typeOrder = { 'groundPatch': 0, 'treeTrunk': 1, 'playerLeg': 2, 'playerBody': 3, 'treeLeaves': 4 };
        return typeOrder[a.type] - typeOrder[b.type];
    });

    // Draw all sorted entities
    drawables.forEach(entity => {
        if (entity.type === 'groundPatch') {
            drawIsometricDiamond(entity.colors, entity.screenX, entity.screenY, entity.isoWidth, entity.isoHeight);
        } else if (entity.type === 'treeTrunk' || entity.type === 'treeLeaves' || entity.type === 'playerLeg' || entity.type === 'playerBody') {
            drawIsometric3DBlock(entity.screenX, entity.screenY, entity.zHeight, entity.isoWidth, entity.isoHeight, entity.colors);
        }
    });
}

// --- Game Loop ---
function gameLoop() {
    // 1. Handle Player Movement (Free Movement)
    let currentDx = 0;
    let currentDy = 0;

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

    if (currentDx !== 0 && currentDy !== 0) {
        const diagonalFactor = 1 / Math.sqrt(2);
        currentDx *= diagonalFactor;
        currentDy *= diagonalFactor;
    }

    const potentialNewX = player.x + currentDx * player.moveSpeed;
    const potentialNewY = player.y + currentDy * player.moveSpeed;

    // --- Basic World Boundary Collision ---
    const playerUnitWidth = PLAYER_BODY_ISO_WIDTH / TILE_ISO_WIDTH;
    const playerUnitHeight = PLAYER_BODY_ISO_HEIGHT / TILE_ISO_HEIGHT;

    player.x = Math.max(playerUnitWidth / 2, Math.min(WORLD_UNITS_WIDTH - playerUnitWidth / 2, potentialNewX));
    player.y = Math.max(playerUnitHeight / 2, Math.min(WORLD_UNITS_HEIGHT - playerUnitHeight / 2, potentialNewY));

    // For collision with biomes (water/trees), we'll add this logic later.
    // For now, the player can pass through everything.

    // Update isMoving flag and animation
    player.isMoving = (currentDx !== 0 || currentDy !== 0);

    // Animation update
    if (player.isMoving) {
        player.frameCount++;
        if (player.frameCount % player.animationSpeed === 0) {
            player.animationFrame = (player.animationFrame + 1) % 4;
        }
    } else {
        player.frameCount = 0;
        player.animationFrame = 0;
    }

    draw(); // Always redraw the entire scene

    requestAnimationFrame(gameLoop);
}


// --- Keyboard Input Handling ---
document.addEventListener('keydown', (event) => {
    keysPressed[event.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
});


// --- Initial Setup ---
setupWorld(); // Call the new world setup function
// Start the game loop
requestAnimationFrame(gameLoop);


// Optional: Add a button to generate a new map (now resets trees and player)
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
    setupWorld(); // Reset trees and player position
    player.isMoving = false;
    player.animationFrame = 0;
    player.frameCount = 0;
});
