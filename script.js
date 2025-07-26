// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
const TILE_ISO_WIDTH = 64; // Base unit for isometric scaling
const TILE_ISO_HEIGHT = 32; // Base unit for isometric scaling

// Define the logical "world size" in terms of how many "base units" it spans
const WORLD_UNITS_WIDTH = 25; // You can adjust this value!
const WORLD_UNITS_HEIGHT = 20; // You can adjust this value!

// Toggle to draw borders around ground patches (set to false as per your clarification)
const DRAW_GROUND_BORDERS = false; // Set to false to hide visual borders
const GROUND_BORDER_COLOR = '#000000';
const GROUND_BORDER_THICKNESS = 1;

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
const GAME_VERSION = 24; // <--- INCREMENTED TO 24 for collision detection
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

// --- World Data Structure ---
const worldMap = []; // Stores biome type for each (x,y) unit
const trees = []; // Stores tree objects (x,y)

// --- Keyboard Input State ---
const keysPressed = {};

// --- Coordinate Conversion Function (World Unit to Isometric Screen) ---
function isoToScreen(x, y) {
    const screenX = (x - y) * (TILE_ISO_WIDTH / 2) + globalDrawOffsetX;
    const screenY = (x + y) * (TILE_ISO_HEIGHT / 2) + globalDrawOffsetY;
    return { x: screenX, y: screenY };
}

// --- Drawing Helper Functions ---

// Draws an isometric diamond (like a flat ground plane or a biome patch)
function drawIsometricDiamond(colorSet, screenX_top_middle, screenY_top_middle, isoWidth, isoHeight, drawBorder = false, borderColor = 'black', borderWidth = 1) {
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

    if (drawBorder) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();
    }
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


// --- Biome Generation Helper Functions ---
function generateOrganicBiome(map, biomeType, startX, startY, maxTiles, spreadChance) {
    const queue = [{ x: startX, y: startY }];
    let tilesPlaced = 0;
    const visited = new Set();

    const addTileToQueue = (x, y) => {
        const key = `${x},${y}`;
        if (x >= 0 && x < WORLD_UNITS_WIDTH && y >= 0 && y < WORLD_UNITS_HEIGHT &&
            map[y][x] === 'ground' && !visited.has(key)) { // Only place on empty 'ground'
            map[y][x] = biomeType;
            visited.add(key);
            queue.push({ x, y });
            tilesPlaced++;
            return true;
        }
        return false;
    };

    if (addTileToQueue(startX, startY)) {
        let head = 0;
        while (head < queue.length && tilesPlaced < maxTiles) {
            const { x, y } = queue[head++];

            const directions = [
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }, // Cardinal
                { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }  // Diagonal
            ];
            directions.sort(() => Math.random() - 0.5);

            for (const dir of directions) {
                if (tilesPlaced >= maxTiles) break;

                const nx = x + dir.dx;
                const ny = y + dir.dy;

                if (Math.random() < spreadChance) {
                    addTileToQueue(nx, ny);
                }
            }
        }
    }
}


// --- Initial Map/World Setup Function ---
function setupWorld() {
    // Initialize worldMap with 'ground' everywhere
    for (let y = 0; y < WORLD_UNITS_HEIGHT; y++) {
        worldMap[y] = [];
        for (let x = 0; x < WORLD_UNITS_WIDTH; x++) {
            worldMap[y][x] = 'ground';
        }
    }

    trees.length = 0; // Clear previous trees

    // Generate Lake Biome
    const lakeStartX = Math.floor(Math.random() * (WORLD_UNITS_WIDTH * 0.6) + WORLD_UNITS_WIDTH * 0.2);
    const lakeStartY = Math.floor(Math.random() * (WORLD_UNITS_HEIGHT * 0.6) + WORLD_UNITS_HEIGHT * 0.2);
    const maxLakeTiles = Math.floor(WORLD_UNITS_WIDTH * WORLD_UNITS_HEIGHT * 0.04);
    generateOrganicBiome(worldMap, 'lake', lakeStartX, lakeStartY, maxLakeTiles, 0.6);

    // Generate Forest Biome
    const forestStartX = Math.floor(Math.random() * (WORLD_UNITS_WIDTH * 0.6) + WORLD_UNITS_WIDTH * 0.2);
    const forestStartY = Math.floor(Math.random() * (WORLD_UNITS_HEIGHT * 0.6) + WORLD_UNITS_HEIGHT * 0.2);
    const maxForestTiles = Math.floor(WORLD_UNITS_WIDTH * WORLD_UNITS_HEIGHT * 0.12);
    generateOrganicBiome(worldMap, 'forest', forestStartX, forestStartY, maxForestTiles, 0.7);


    // Place trees within the forest biome based on the generated worldMap
    const treeDensity = 0.4;
    for (let y = 0; y < WORLD_UNITS_HEIGHT; y++) {
        for (let x = 0; x < WORLD_UNITS_WIDTH; x++) {
            if (worldMap[y][x] === 'forest' && Math.random() < treeDensity) {
                // Store actual tree coordinates for collision detection later
                trees.push({ x: x + Math.random(), y: y + Math.random() });
            }
        }
    }

    // Place player at the center of the world, or on valid ground if center is a biome
    player.x = WORLD_UNITS_WIDTH / 2;
    player.y = WORLD_UNITS_HEIGHT / 2;
    let playerGridX = Math.floor(player.x);
    let playerGridY = Math.floor(player.y);

    // Ensure player starts on a 'ground' tile
    if (worldMap[playerGridY] && (worldMap[playerGridY][playerGridX] === 'lake' || worldMap[playerGridY][playerGridX] === 'forest')) {
        let foundGround = false;
        // Search for nearest ground tile in a spiral
        for (let radius = 1; radius < Math.max(WORLD_UNITS_WIDTH, WORLD_UNITS_HEIGHT); radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                        const checkX = Math.floor(player.x) + dx;
                        const checkY = Math.floor(player.y) + dy;
                        if (checkX >= 0 && checkX < WORLD_UNITS_WIDTH &&
                            checkY >= 0 && checkY < WORLD_UNITS_HEIGHT &&
                            worldMap[checkY][checkX] === 'ground') {
                            player.x = checkX + 0.5;
                            player.y = checkY + 0.5;
                            foundGround = true;
                            break;
                        }
                    }
                }
                if (foundGround) break;
            }
            if (foundGround) break;
        }
    }

    player.isMoving = false;
    player.animationFrame = 0;
    player.frameCount = 0;
}


// --- Main Drawing Function ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Version: ${GAME_VERSION}`, 10, 30);

    const drawables = [];

    // --- Add Ground Patches based on World Map ---
    for (let y = 0; y < WORLD_UNITS_HEIGHT; y++) {
        for (let x = 0; x < WORLD_UNITS_WIDTH; x++) {
            const screenPos = isoToScreen(x, y);

            let tileColors;
            let isWater = false;
            const biomeType = worldMap[y][x];

            switch (biomeType) {
                case 'ground':
                    tileColors = GROUND_COLORS;
                    break;
                case 'lake':
                    tileColors = LAKE_COLORS;
                    isWater = true;
                    break;
                case 'forest':
                    tileColors = FOREST_GROUND_COLORS;
                    break;
                default:
                    tileColors = GROUND_COLORS;
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
                sortY: screenPos.y + TILE_ISO_HEIGHT + 0.0
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

        const treeBaseScreenY = treeScreenPos.y + TILE_ISO_HEIGHT + TRUNK_Z_HEIGHT;
        
        drawables.push({
            type: 'treeTrunk',
            x: tree.x, y: tree.y,
            screenX: treeScreenPos.x + (TILE_ISO_WIDTH / 2) - (TILE_ISO_WIDTH * TRUNK_ISO_WIDTH_SCALE / 2),
            screenY: trunkTopScreenY,
            zHeight: TRUNK_Z_HEIGHT,
            isoWidth: TILE_ISO_WIDTH * TRUNK_ISO_WIDTH_SCALE,
            isoHeight: TILE_ISO_HEIGHT * TRUNK_ISO_HEIGHT_SCALE,
            colors: TREE_TRUNK_COLOR,
            sortY: treeBaseScreenY + 0.001
        });

        drawables.push({
            type: 'treeLeaves',
            x: tree.x, y: tree.y,
            screenX: treeScreenPos.x + (TILE_ISO_WIDTH / 2) - (TILE_ISO_WIDTH * LEAVES_ISO_WIDTH_SCALE / 2),
            screenY: leavesTopScreenY,
            zHeight: LEAVES_Z_HEIGHT,
            isoWidth: LEAVES_ISO_WIDTH_SCALE * TILE_ISO_WIDTH,
            isoHeight: LEAVES_ISO_HEIGHT_SCALE * TILE_ISO_HEIGHT,
            colors: TREE_LEAVES_COLOR,
            sortY: treeBaseScreenY + 0.002
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
        sortY: playerSortY + 0.003
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
        sortY: playerSortY + 0.0031
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
        sortY: playerSortY + 0.0032
    });


    // Sort drawables by their sortY (bottom-most visible point on screen)
    drawables.sort((a, b) => {
        if (a.sortY !== b.sortY) {
            return a.sortY - b.sortY;
        }
        const typeOrder = { 'groundPatch': 0, 'treeTrunk': 1, 'playerLeg': 2, 'playerBody': 3, 'treeLeaves': 4 };
        return typeOrder[a.type] - typeOrder[b.type];
    });

    // Draw all sorted entities
    drawables.forEach(entity => {
        if (entity.type === 'groundPatch') {
            drawIsometricDiamond(entity.colors, entity.screenX, entity.screenY, entity.isoWidth, entity.isoHeight, DRAW_GROUND_BORDERS, GROUND_BORDER_COLOR, GROUND_BORDER_THICKNESS);
        } else if (entity.type === 'treeTrunk' || entity.type === 'treeLeaves' || entity.type === 'playerLeg' || entity.type === 'playerBody') {
            drawIsometric3DBlock(entity.screenX, entity.screenY, entity.zHeight, entity.isoWidth, entity.isoHeight, entity.colors);
        }
    });
}

// --- Game Loop ---
function gameLoop() {
    let currentDx = 0;
    let currentDy = 0;

    if (keysPressed['w']) {
        currentDy -= 1;
    }
    if (keysPressed['s']) {
        currentDy += 1;
    }
    if (keysPressed['a']) {
        currentDx -= 1;
    }
    if (keysPressed['d']) {
        currentDx += 1;
    }

    // Calculate potential new position without immediately applying it
    let potentialNewX = player.x + currentDx * player.moveSpeed;
    let potentialNewY = player.y + currentDy * player.moveSpeed;

    // --- Collision Detection Logic ---
    let collision = false;

    // Check world boundaries
    if (potentialNewX < 0 || potentialNewX >= WORLD_UNITS_WIDTH ||
        potentialNewY < 0 || potentialNewY >= WORLD_UNITS_HEIGHT) {
        collision = true;
    } else {
        // Get the grid coordinates of the potential new position
        const gridX = Math.floor(potentialNewX);
        const gridY = Math.floor(potentialNewY);

        // Check for collision with biomes (lake or forest)
        if (worldMap[gridY] && worldMap[gridY][gridX]) {
            const biomeTypeAtNewPos = worldMap[gridY][gridX];
            if (biomeTypeAtNewPos === 'lake') {
                collision = true; // Cannot walk on lake
            } else if (biomeTypeAtNewPos === 'forest') {
                // Check if there's a specific tree at this forest tile
                // This is a simplified check, ideally, you'd check against tree bounding boxes
                const treePresent = trees.some(tree => 
                    Math.floor(tree.x) === gridX && 
                    Math.floor(tree.y) === gridY
                );
                if (treePresent) {
                    collision = true; // Cannot walk through a tree
                }
            }
        }
    }

    // Only update player position if no collision
    if (!collision) {
        player.x = potentialNewX;
        player.y = potentialNewY;
    }


    player.isMoving = (currentDx !== 0 || currentDy !== 0);

    if (player.isMoving) {
        player.frameCount++;
        if (player.frameCount % player.animationSpeed === 0) {
            player.animationFrame = (player.animationFrame + 1) % 4;
        }
    } else {
        player.frameCount = 0;
        player.animationFrame = 0;
    }

    draw();

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
setupWorld();
requestAnimationFrame(gameLoop);


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
    setupWorld();
    player.isMoving = false;
    player.animationFrame = 0;
    player.frameCount = 0;
});
