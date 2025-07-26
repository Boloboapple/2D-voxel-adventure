// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
const TILE_ISO_WIDTH = 64; // Base unit for isometric scaling
const TILE_ISO_HEIGHT = 32; // Base unit for isometric scaling

// Define the logical "world size" in terms of how many "base units" it spans
// This is no longer strict tiles, but a conceptual scale for the continuous world
const WORLD_UNITS_WIDTH = 20;
const WORLD_UNITS_HEIGHT = 15;

// Max height of the tallest object (tree) in pixels from its ground plane
const MAX_OBJECT_HEIGHT_FROM_GROUND = TILE_ISO_HEIGHT * 3;

// Calculate required canvas dimensions based on the new world size
// The overall width and height of the isometric "diamond"
const totalIsoWidth = (WORLD_UNITS_WIDTH + WORLD_UNITS_HEIGHT) * (TILE_ISO_WIDTH / 2);
const totalIsoHeight = (WORLD_UNITS_WIDTH + WORLD_UNITS_HEIGHT) * (TILE_ISO_HEIGHT / 2);

// Add some padding to ensure nothing is clipped at the edges
const paddingX = TILE_ISO_WIDTH * 2;
const paddingY = TILE_ISO_HEIGHT * 2;

canvas.width = totalIsoWidth + paddingX;
canvas.height = totalIsoHeight + paddingY + MAX_OBJECT_HEIGHT_FROM_GROUND; // Add max object height for total canvas height

// --- Global Offset for the Isometric Drawing ---
// This offset defines where the (0,0) conceptual "world unit" point will be placed on the canvas.
// It needs to shift right to make space for the left side of the large diamond,
// and shift down to make space for object tops.
const globalDrawOffsetX = (WORLD_UNITS_HEIGHT * TILE_ISO_WIDTH / 2) + (paddingX / 2);
const globalDrawOffsetY = MAX_OBJECT_HEIGHT_FROM_GROUND + (paddingY / 2);

// Debugging: Log calculated values
console.log(`Canvas Dimensions: ${canvas.width}x${canvas.height}`);
console.log(`Global Draw Offset: X=${globalDrawOffsetX}, Y=${globalDrawOffsetY}`);


// --- GAME VERSION COUNTER ---
// IMPORTANT: INCREMENT THIS NUMBER EACH TIME YOU MAKE A CHANGE AND PUSH!
const GAME_VERSION = 17; // <--- INCREMENTED TO 17 for single ground plane
console.log("------------------------------------------");
console.log(`>>> Game Version: ${GAME_VERSION} <<<`); // This will confirm load
console.log("------------------------------------------");

// --- Colors for the single ground plane ---
const GROUND_COLORS = { top: '#66BB6A', left: '#4CAF50', right: '#388E3C' }; // Plains green

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

// --- Tree Objects (simplified for now, will be re-done with continuous biomes) ---
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

// Draws an isometric diamond (like a flat ground plane)
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


// Draws an isometric 3D block composed of top, left, and right faces.
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
    // We are no longer generating a grid map (gameMap array is empty now)
    // For now, we'll just place a few trees manually.
    // In future steps, we will implement continuous biomes and more dynamic tree placement.

    // Clear existing trees
    trees.length = 0;

    // Place a few static trees for testing on the new continuous ground
    // Tree positions are now in WORLD_UNITS
    trees.push({ x: 5, y: 3 });
    trees.push({ x: 7, y: 6 });
    trees.push({ x: 4, y: 8 });
    trees.push({ x: 9, y: 11 });
    trees.push({ x: 12, y: 4 });

    // Place player at the center
    player.x = WORLD_UNITS_WIDTH / 2;
    player.y = WORLD_UNITS_HEIGHT / 2;
    player.isMoving = false;
    player.animationFrame = 0;
    player.frameCount = 0;
}


// --- Main Drawing Function (Modified for Single Ground Plane) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the version number on the canvas for easy verification
    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Version: ${GAME_VERSION}`, 10, 30);

    // Array to hold all drawable entities
    const drawables = [];

    // --- Add the single, large ground plane ---
    // The top-middle point of the (0,0) conceptual world unit
    const groundScreenPos = isoToScreen(0, 0);

    drawables.push({
        type: 'ground',
        screenX: groundScreenPos.x,
        screenY: groundScreenPos.y,
        isoWidth: (WORLD_UNITS_WIDTH + WORLD_UNITS_HEIGHT) * (TILE_ISO_WIDTH / 2),
        isoHeight: (WORLD_UNITS_WIDTH + WORLD_UNITS_HEIGHT) * (TILE_ISO_HEIGHT / 2),
        colors: GROUND_COLORS,
        sortY: groundScreenPos.y + totalIsoHeight + 0.0 // The lowest point of the entire diamond, base layer
    });

    // --- Add Trees to drawables ---
    trees.forEach(tree => {
        const treeScreenPos = isoToScreen(tree.x, tree.y);

        const TRUNK_Z_HEIGHT = TILE_ISO_HEIGHT * 2.0;
        const TRUNK_ISO_WIDTH_SCALE = 0.4;
        const TRUNK_ISO_HEIGHT_SCALE = 0.4;

        const LEAVES_Z_HEIGHT = TILE_ISO_HEIGHT * 1.5;
        const LEAVES_ISO_WIDTH_SCALE = 1.4;
        const LEAVES_ISO_HEIGHT_SCALE = 1.4;

        // Trunk's top diamond's top-middle point (relative to tree's ground point)
        const trunkTopScreenY = treeScreenPos.y - TRUNK_Z_HEIGHT + (TILE_ISO_HEIGHT / 2);
        // Leaves' top diamond's top-middle point (relative to trunk's top)
        const leavesTopScreenY = trunkTopScreenY - LEAVES_Z_HEIGHT + (TILE_ISO_HEIGHT * TRUNK_ISO_HEIGHT_SCALE / 2);

        // Add trunk
        drawables.push({
            type: 'treeTrunk',
            x: tree.x, y: tree.y,
            screenX: treeScreenPos.x + (TILE_ISO_WIDTH / 2) - (TILE_ISO_WIDTH * TRUNK_ISO_WIDTH_SCALE / 2),
            screenY: trunkTopScreenY,
            zHeight: TRUNK_Z_HEIGHT,
            isoWidth: TILE_ISO_WIDTH * TRUNK_ISO_WIDTH_SCALE,
            isoHeight: TILE_ISO_HEIGHT * TRUNK_ISO_HEIGHT_SCALE,
            colors: TREE_TRUNK_COLOR,
            // Trunk draws after ground, but before player
            sortY: treeScreenPos.y + TILE_ISO_HEIGHT + 0.1
        });

        // Add leaves
        drawables.push({
            type: 'treeLeaves',
            x: tree.x, y: tree.y,
            screenX: treeScreenPos.x + (TILE_ISO_WIDTH / 2) - (TILE_ISO_WIDTH * LEAVES_ISO_WIDTH_SCALE / 2),
            screenY: leavesTopScreenY,
            zHeight: LEAVES_Z_HEIGHT,
            isoWidth: TILE_ISO_WIDTH * LEAVES_ISO_WIDTH_SCALE,
            isoHeight: TILE_ISO_HEIGHT * LEAVES_ISO_HEIGHT_SCALE,
            colors: TREE_LEAVES_COLOR,
            // Leaves are the highest layer on the tile
            sortY: treeScreenPos.y + TILE_ISO_HEIGHT + 0.3
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

    const playerBaseScreenYForSort = playerScreenPos.y + TILE_ISO_HEIGHT;

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
        sortY: playerBaseScreenYForSort + 0.2
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
        sortY: playerBaseScreenYForSort + 0.2001
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
        sortY: playerBaseScreenYForSort + 0.2002
    });


    // Sort drawables primarily by their sortY (lowest point on screen),
    // then as a tie-breaker, by their object type's inherent drawing priority.
    drawables.sort((a, b) => {
        if (a.sortY !== b.sortY) {
            return a.sortY - b.sortY;
        }
        // Secondary sort for exact same sortY values (e.g., player parts)
        const typeOrder = { 'ground': 0, 'treeTrunk': 1, 'playerLeg': 2, 'playerBody': 3, 'treeLeaves': 4 };
        return typeOrder[a.type] - typeOrder[b.type];
    });

    // Draw all sorted entities
    drawables.forEach(entity => {
        if (entity.type === 'ground') {
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

    // --- Basic World Boundary Collision (no more tile-based collision) ---
    // Player will now be contained within the conceptual WORLD_UNITS boundaries.
    const playerCollisionMarginX = PLAYER_BODY_ISO_WIDTH / (TILE_ISO_WIDTH * WORLD_UNITS_WIDTH); // Rough margin for player's width
    const playerCollisionMarginY = PLAYER_BODY_ISO_HEIGHT / (TILE_ISO_HEIGHT * WORLD_UNITS_HEIGHT); // Rough margin for player's height

    player.x = Math.max(0 + playerCollisionMarginX, Math.min(WORLD_UNITS_WIDTH - playerCollisionMarginX, potentialNewX));
    player.y = Math.max(0 + playerCollisionMarginY, Math.min(WORLD_UNITS_HEIGHT - playerCollisionMarginY, potentialNewY));


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


// Optional: Add a button to generate a new map (now generates a new tree layout)
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
