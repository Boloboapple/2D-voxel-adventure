// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
const TILE_ISO_WIDTH = 64; // Base unit for isometric scaling
const TILE_ISO_HEIGHT = 32; // Base unit for isometric scaling

const WORLD_UNITS_WIDTH = 60;
const WORLD_UNITS_HEIGHT = 45;

const DRAW_GROUND_BORDERS = false;
const GROUND_BORDER_COLOR = '#000000';
const GROUND_BORDER_THICKNESS = 1;

const MAX_OBJECT_HEIGHT_FROM_GROUND = TILE_ISO_HEIGHT * 3;

// Set Canvas Dimensions to a Fixed Size
canvas.width = 1280;
canvas.height = 720;

// Global Offset for the Isometric Drawing - Center of the canvas
const initialGlobalDrawOffsetX = canvas.width / 2;
const initialGlobalDrawOffsetY = (canvas.height / 2) + (MAX_OBJECT_HEIGHT_FROM_GROUND / 2);

// Debugging: Log calculated values
console.log(`Canvas Dimensions: ${canvas.width}x${canvas.height}`);
console.log(`Initial Global Draw Offset: X=${initialGlobalDrawOffsetX}, Y=${initialGlobalDrawOffsetY}`);

// --- GAME VERSION COUNTER ---
// IMPORTANT: INCREMENT THIS NUMBER EACH TIME YOU MAKE A CHANGE AND PUSH!
const GAME_VERSION = 33; // <--- INCREMENTED TO 33 for non-stop spawning
console.log("------------------------------------------");
console.log(`>>> Game Version: ${GAME_VERSION} <<<`); // This will confirm load
console.log("------------------------------------------");

// --- Colors for biomes and objects ---
const BIOME_COLORS = {
    'ground': { top: '#66BB6A', left: '#4CAF50', right: '#388E3C' },
    'lake': { top: '#64B5F6', left: '#2196F3', right: '#1976D2' },
    'forest': { top: '#4CAF50', left: '#388E3C', right: '#2E7D32' },
    'desert': { top: '#FFEB3B', left: '#FBC02D', right: '#F57F17' },
    'mountain': { top: '#B0BEC5', left: '#90A4AE', right: '#78909C' }
};

const TREE_TRUNK_COLOR = { top: '#A1887F', left: '#8D6E63', right: '#795548' };
const TREE_LEAVES_COLOR = { top: '#7CB342', left: '#689F38', right: '#558B2F' };

const PLAYER_BODY_COLOR = { top: '#FFD700', left: '#DAA520', right: '#B8860B' }; // Gold
const PLAYER_LEG_COLOR = { top: '#CD853F', left: '#8B4513', right: '#A0522D' }; // Brown

const WARRIOR_BODY_COLOR = { top: '#B22222', left: '#8B0000', right: '#660000' }; // Dark Red
const WARRIOR_LEG_COLOR = { top: '#4F4F4F', left: '#363636', right: '#292929' }; // Dark Grey

// --- Player Object ---
const player = {
    x: WORLD_UNITS_WIDTH / 2,
    y: WORLD_UNITS_HEIGHT / 2,
    bodyColor: PLAYER_BODY_COLOR,
    legColor: PLAYER_LEG_COLOR,
    isMoving: false,
    moveSpeed: 0.05,
    animationFrame: 0,
    animationSpeed: 5,
    frameCount: 0,
    health: 100, // Player health
    maxHealth: 100,
    aggroRange: 0 // Player doesn't "aggro" things, but useful for debugging
};

// Define character dimensions relative to tile size
const CHARACTER_BODY_Z_HEIGHT = TILE_ISO_HEIGHT * 0.8;
const CHARACTER_BODY_ISO_WIDTH = TILE_ISO_WIDTH * 0.5;
const CHARACTER_BODY_ISO_HEIGHT = TILE_ISO_HEIGHT * 0.5;

const CHARACTER_LEG_Z_HEIGHT = TILE_ISO_HEIGHT * 0.5;
const CHARACTER_LEG_ISO_WIDTH = TILE_ISO_WIDTH * 0.2;
const CHARACTER_LEG_ISO_HEIGHT = TILE_ISO_HEIGHT * 0.2;

const CHARACTER_VISUAL_LIFT_OFFSET = TILE_ISO_HEIGHT * 0.5;

// --- Camera Object ---
const camera = {
    x: player.x,
    y: player.y
};

// --- Enemy Warrior Configuration ---
const warriors = [];
// *** CHANGE FOR NON-STOP SPAWNING ***
const WARRIOR_SPAWN_INTERVAL = 100; // 100 milliseconds = spawn almost every frame
// *** END CHANGE ***
let lastWarriorSpawnTime = 0; // Will be initialized to 0 in setupWorld
// TEMPORARY: More warriors for debugging!
const MAX_WARRIORS = 50; // Increased max warriors even further

const WARRIOR_AGGRO_RANGE = 5; // Distance in world units for player detection
const WARRIOR_MOVE_SPEED = 0.03; // Warriors move slightly slower than player
const WARRIOR_IDLE_MOVE_CHANCE = 0.02; // Chance per frame for idle warrior to move
const WARRIOR_HEALTH = 50; // Warrior health

// Warrior states
const WARRIOR_STATE = {
    IDLE: 'idle',
    CHASING: 'chasing',
    ATTACKING: 'attacking' // Will implement in next phase
};

// --- World Data Structure ---
const worldMap = [];
const trees = [];

// --- Keyboard Input State ---
const keysPressed = {};

// --- Coordinate Conversion Function (World Unit to Isometric Screen) ---
function isoToScreen(x, y) {
    const relativeX = x - camera.x;
    const relativeY = y - camera.y;

    const screenX = (relativeX - relativeY) * (TILE_ISO_WIDTH / 2) + initialGlobalDrawOffsetX;
    const screenY = (relativeX + relativeY) * (TILE_ISO_HEIGHT / 2) + initialGlobalDrawOffsetY;
    return { x: screenX, y: screenY };
}

// --- Drawing Helper Functions ---
function drawIsometricDiamond(colorSet, screenX_top_middle, screenY_top_middle, isoWidth, isoHeight, drawBorder = false, borderColor = 'black', borderWidth = 1) {
    const halfIsoWidth = isoWidth / 2;
    const halfIsoHeight = isoHeight / 2;

    ctx.fillStyle = colorSet.top;
    ctx.beginPath();
    ctx.moveTo(screenX_top_middle, screenY_top_middle + halfIsoHeight);
    ctx.lineTo(screenX_top_middle + halfIsoWidth, screenY_top_middle);
    ctx.lineTo(screenX_top_middle + isoWidth, screenY_top_middle + halfIsoHeight);
    ctx.lineTo(screenX_top_middle + halfIsoWidth, screenY_top_middle + isoHeight);
    ctx.closePath();
    ctx.fill();

    if (drawBorder) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();
    }
}

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
    ctx.lineTo(screenX_top_middle, screenY_top_middle + halfBlockIsoHeight + blockZHeight);
    ctx.lineTo(screenX_top_middle + halfBlockIsoWidth, screenY_top_middle + blockIsoHeight + blockZHeight);
    ctx.lineTo(screenX_top_middle + halfBlockIsoWidth, screenY_top_middle + blockIsoHeight);
    ctx.closePath();
    ctx.fill();

    // Right face (parallelogram)
    ctx.fillStyle = colors.right;
    ctx.beginPath();
    ctx.moveTo(screenX_top_middle + blockIsoWidth, screenY_top_middle + halfBlockIsoHeight);
    ctx.lineTo(screenX_top_middle + blockIsoWidth, screenY_top_middle + halfBlockIsoHeight + blockZHeight);
    ctx.lineTo(screenX_top_middle + halfBlockIsoWidth, screenY_top_middle + blockIsoHeight + blockZHeight);
    ctx.lineTo(screenX_top_middle + halfBlockIsoWidth, screenY_top_middle + blockIsoHeight);
    ctx.closePath();
    ctx.fill();
}

function drawCharacter(character, screenPos, sortY) {
    let animOffsetA = 0;
    let animOffsetB = 0;

    if (character.isMoving) {
        const frame = character.animationFrame;
        const liftAmount = TILE_ISO_HEIGHT * 0.08;
        if (frame === 0) { animOffsetA = -liftAmount; animOffsetB = 0; }
        else if (frame === 1) { animOffsetA = 0; animOffsetB = -liftAmount; }
        else if (frame === 2) { animOffsetA = -liftAmount; animOffsetB = 0; }
        else if (frame === 3) { animOffsetA = 0; animOffsetB = -liftAmount; }
    }

    // Legs
    drawables.push({
        type: 'characterPart',
        x: character.x, y: character.y,
        screenX: screenPos.x + (TILE_ISO_WIDTH / 2) - (CHARACTER_BODY_ISO_WIDTH / 2) + (CHARACTER_BODY_ISO_WIDTH * 0.1),
        screenY: screenPos.y + TILE_ISO_HEIGHT - CHARACTER_VISUAL_LIFT_OFFSET - CHARACTER_LEG_Z_HEIGHT + (CHARACTER_LEG_ISO_HEIGHT / 2) + animOffsetA,
        zHeight: CHARACTER_LEG_Z_HEIGHT,
        isoWidth: CHARACTER_LEG_ISO_WIDTH,
        isoHeight: CHARACTER_LEG_ISO_HEIGHT,
        colors: character.legColor,
        sortY: sortY + 0.003
    });

    drawables.push({
        type: 'characterPart',
        x: character.x, y: character.y,
        screenX: screenPos.x + (TILE_ISO_WIDTH / 2) + (CHARACTER_BODY_ISO_WIDTH / 2) - (CHARACTER_LEG_ISO_WIDTH) - (CHARACTER_BODY_ISO_WIDTH * 0.1),
        screenY: screenPos.y + TILE_ISO_HEIGHT - CHARACTER_VISUAL_LIFT_OFFSET - CHARACTER_LEG_Z_HEIGHT + (CHARACTER_LEG_ISO_HEIGHT / 2) + animOffsetB,
        zHeight: CHARACTER_LEG_Z_HEIGHT,
        isoWidth: CHARACTER_LEG_ISO_WIDTH,
        isoHeight: CHARACTER_LEG_ISO_HEIGHT,
        colors: character.legColor,
        sortY: sortY + 0.0031
    });

    // Body
    drawables.push({
        type: 'characterPart',
        x: character.x, y: character.y,
        screenX: screenPos.x + (TILE_ISO_WIDTH / 2) - (CHARACTER_BODY_ISO_WIDTH / 2),
        screenY: screenPos.y + TILE_ISO_HEIGHT - CHARACTER_VISUAL_LIFT_OFFSET - CHARACTER_LEG_Z_HEIGHT - CHARACTER_BODY_Z_HEIGHT + (CHARACTER_BODY_ISO_HEIGHT / 2),
        zHeight: CHARACTER_BODY_Z_HEIGHT,
        isoWidth: CHARACTER_BODY_ISO_WIDTH,
        isoHeight: CHARACTER_BODY_ISO_HEIGHT,
        colors: character.bodyColor,
        sortY: sortY + 0.0032
    });
}


// --- Biome Generation Helper Functions ---
function generateOrganicBiome(map, biomeType, startX, startY, maxTiles, spreadChance) {
    const queue = [{ x: startX, y: startY }];
    let tilesPlaced = 0;
    const visited = new Set();

    const addTileToQueue = (x, y) => {
        const key = `${x},${y}`;
        if (x >= 0 && x < WORLD_UNITS_WIDTH && y >= 0 && y < WORLD_UNITS_HEIGHT &&
            map[y][x] === 'ground' && !visited.has(key)) {
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
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
                { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
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
    for (let y = 0; y < WORLD_UNITS_HEIGHT; y++) {
        worldMap[y] = [];
        for (let x = 0; x < WORLD_UNITS_WIDTH; x++) {
            worldMap[y][x] = 'ground';
        }
    }

    trees.length = 0;
    warriors.length = 0; // Clear warriors on new map generation

    const biomesToGenerate = [
        { type: 'lake', maxTilesFactor: 0.03, spreadChance: 0.6, numInstances: 3 },
        { type: 'forest', maxTilesFactor: 0.08, spreadChance: 0.7, numInstances: 4 },
        { type: 'desert', maxTilesFactor: 0.15, spreadChance: 0.65, numInstances: 2 },
        { type: 'mountain', maxTilesFactor: 0.06, spreadChance: 0.55, numInstances: 2 }
    ];

    biomesToGenerate.forEach(biomeConfig => {
        for (let i = 0; i < biomeConfig.numInstances; i++) {
            const startX = Math.floor(Math.random() * (WORLD_UNITS_WIDTH * 0.6) + WORLD_UNITS_WIDTH * 0.2);
            const startY = Math.floor(Math.random() * (WORLD_UNITS_HEIGHT * 0.6) + WORLD_UNITS_HEIGHT * 0.2);
            const maxTiles = Math.floor(WORLD_UNITS_WIDTH * WORLD_UNITS_HEIGHT * biomeConfig.maxTilesFactor);
            generateOrganicBiome(worldMap, biomeConfig.type, startX, startY, maxTiles, biomeConfig.spreadChance);
        }
    });

    const treeDensity = 0.4;
    for (let y = 0; y < WORLD_UNITS_HEIGHT; y++) {
        for (let x = 0; x < WORLD_UNITS_WIDTH; x++) {
            if (worldMap[y][x] === 'forest' && Math.random() < treeDensity) {
                trees.push({ x: x + Math.random(), y: y + Math.random() });
            }
        }
    }

    // Place player at a valid starting position
    player.x = WORLD_UNITS_WIDTH / 2;
    player.y = WORLD_UNITS_HEIGHT / 2;
    player.health = player.maxHealth; // Reset player health

    let playerGridX = Math.floor(player.x);
    let playerGridY = Math.floor(player.y);

    if (worldMap[playerGridY] && (worldMap[playerGridY][playerGridX] !== 'ground')) {
        let foundGround = false;
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

    camera.x = player.x;
    camera.y = player.y;

    player.isMoving = false;
    player.animationFrame = 0;
    player.frameCount = 0;

    // *** CHANGE FOR NON-STOP SPAWNING ***
    lastWarriorSpawnTime = 0; // Initialize to 0 to trigger immediate spawn on first loop
    // *** END CHANGE ***
}

// --- Helper for collision detection ---
function isWalkable(x, y) {
    if (x < 0 || x >= WORLD_UNITS_WIDTH || y < 0 || y >= WORLD_UNITS_HEIGHT) {
        return false; // Out of bounds
    }
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);

    if (!worldMap[gridY] || !worldMap[gridY][gridX]) {
        // This case should ideally not happen if bounds check passed, but good for safety
        return false;
    }

    const biomeType = worldMap[gridY][gridX];

    if (biomeType === 'lake' || biomeType === 'mountain') {
        return false;
    }

    if (biomeType === 'forest') {
        const treePresent = trees.some(tree =>
            Math.floor(tree.x) === gridX &&
            Math.floor(tree.y) === gridY
        );
        if (treePresent) {
            return false;
        }
    }
    return true;
}

// --- Warrior Logic ---
function spawnWarrior() {
    console.log(`spawnWarrior() called. Current warriors: ${warriors.length}, Max warriors: ${MAX_WARRIORS}`);

    if (warriors.length >= MAX_WARRIORS) {
        console.log(`Max warriors (${MAX_WARRIORS}) reached. Not spawning.`);
        return;
    }

    let spawnX, spawnY;
    let attempts = 0;
    const maxAttempts = 1; // TEMPORARY: Still reduced to 1 for debugging
    let foundValidSpot = false;

    // Try to find a spawn location that is 'ground' and not too close to the player
    while (attempts < maxAttempts && !foundValidSpot) {
        spawnX = Math.random() * WORLD_UNITS_WIDTH;
        spawnY = Math.random() * WORLD_UNITS_HEIGHT;

        const gridX = Math.floor(spawnX);
        const gridY = Math.floor(spawnY);

        // Debugging the isWalkable check
        const walkableResult = isWalkable(gridX, gridY);
        const distanceToPlayer = Math.sqrt(Math.pow(spawnX - player.x, 2) + Math.pow(spawnY - player.y, 2));
        const farEnough = distanceToPlayer > WARRIOR_AGGRO_RANGE * 2;

        console.log(`Attempt ${attempts}: Spawn at (${gridX},${gridY}). Walkable: ${walkableResult}. Distance to player: ${distanceToPlayer.toFixed(2)}. Far enough: ${farEnough}`);


        // *** TEMPORARY DEBUGGING CHANGE: FORCE VALID SPOT ***
        foundValidSpot = true; // THIS LINE FORCES A VALID SPOT FOR DEBUGGING
        // *** END TEMPORARY DEBUGGING CHANGE ***

        attempts++;
    }

    if (!foundValidSpot) {
        // This 'if' block should now almost never be hit with foundValidSpot = true
        console.warn(`Could not find suitable spawn location for warrior after ${maxAttempts} attempts. Map might be too full or player position too central.`);
        return;
    }

    warriors.push({
        x: spawnX,
        y: spawnY,
        bodyColor: WARRIOR_BODY_COLOR,
        legColor: WARRIOR_LEG_COLOR,
        isMoving: false,
        animationFrame: 0,
        animationSpeed: 10,
        frameCount: 0,
        health: WARRIOR_HEALTH,
        maxHealth: WARRIOR_HEALTH,
        state: WARRIOR_STATE.IDLE,
        targetX: null,
        targetY: null,
        aggroRange: WARRIOR_AGGRO_RANGE,
        attackRange: 0.8
    });
    console.log(`SUCCESS: Warrior spawned at (${spawnX.toFixed(2)}, ${spawnY.toFixed(2)}). Total warriors: ${warriors.length}`);
}

function updateWarriors() {
    warriors.forEach((warrior, index) => {
        const distToPlayer = Math.sqrt(Math.pow(warrior.x - player.x, 2) + Math.pow(warrior.y - player.y, 2));

        // State Transition: IDLE to CHASING
        if (warrior.state === WARRIOR_STATE.IDLE && distToPlayer <= warrior.aggroRange) {
            warrior.state = WARRIOR_STATE.CHASING;
            console.log(`Warrior ${index} at (${warrior.x.toFixed(2)}, ${warrior.y.toFixed(2)}) is now CHASING player.`);
        }
        // State Transition: CHASING to IDLE (if player gets too far)
        else if (warrior.state === WARRIOR_STATE.CHASING && distToPlayer > warrior.aggroRange * 1.5) {
            warrior.state = WARRIOR_STATE.IDLE;
            console.log(`Warrior ${index} is now IDLE (player too far).`);
            warrior.targetX = null;
            warrior.targetY = null;
        }

        // Behavior based on state
        if (warrior.state === WARRIOR_STATE.CHASING) {
            warrior.isMoving = true;
            let dx = player.x - warrior.x;
            let dy = player.y - warrior.y;
            const magnitude = Math.sqrt(dx * dx + dy * dy);

            if (magnitude > warrior.attackRange) {
                dx /= magnitude;
                dy /= magnitude;

                let potentialNewX = warrior.x + dx * WARRIOR_MOVE_SPEED;
                let potentialNewY = warrior.y + dy * WARRIOR_MOVE_SPEED;

                // Improved collision for warriors: check next tile
                // Note: isWalkable expects grid coordinates, so floor the float positions for the check
                if (isWalkable(potentialNewX, potentialNewY)) {
                    warrior.x = potentialNewX;
                    warrior.y = potentialNewY;
                } else {
                    // Try horizontal or vertical movement if diagonal is blocked
                    if (isWalkable(warrior.x + dx * WARRIOR_MOVE_SPEED, warrior.y)) {
                        warrior.x += dx * WARRIOR_MOVE_SPEED;
                    } else if (isWalkable(warrior.x, warrior.y + dy * WARRIOR_MOVE_SPEED)) {
                        warrior.y += dy * WARRIOR_MOVE_SPEED;
                    }
                    // If still stuck, stop moving
                    else {
                         warrior.isMoving = false;
                    }
                }
            } else {
                warrior.isMoving = false;
                // Attack logic goes here in the next phase
            }
        } else if (warrior.state === WARRIOR_STATE.IDLE) {
            if (!warrior.isMoving && Math.random() < WARRIOR_IDLE_MOVE_CHANCE) {
                let foundTarget = false;
                let attempts = 0;
                const maxIdleAttempts = 5;
                while (!foundTarget && attempts < maxIdleAttempts) {
                    const randomOffsetMagnitude = Math.random() * 3 + 1;
                    const randomAngle = Math.random() * Math.PI * 2;
                    const targetCandidateX = warrior.x + Math.cos(randomAngle) * randomOffsetMagnitude; // Don't floor yet, keep float for target
                    const targetCandidateY = warrior.y + Math.sin(randomAngle) * randomOffsetMagnitude;

                    // Check if the destination tile is walkable (using floor for grid lookup)
                    if (isWalkable(Math.floor(targetCandidateX), Math.floor(targetCandidateY))) {
                        warrior.targetX = targetCandidateX;
                        warrior.targetY = targetCandidateY;
                        warrior.isMoving = true;
                        foundTarget = true;
                    }
                    attempts++;
                }
            }

            if (warrior.isMoving && warrior.targetX !== null && warrior.targetY !== null) {
                let dx = warrior.targetX - warrior.x;
                let dy = warrior.targetY - warrior.y;
                const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

                if (distanceToTarget < WARRIOR_MOVE_SPEED) {
                    warrior.x = warrior.targetX;
                    warrior.y = warrior.targetY;
                    warrior.isMoving = false;
                    warrior.targetX = null;
                    warrior.targetY = null;
                } else {
                    dx /= distanceToTarget;
                    dy /= distanceToTarget;

                    let potentialNewX = warrior.x + dx * WARRIOR_MOVE_SPEED;
                    let potentialNewY = warrior.y + dy * WARRIOR_MOVE_SPEED;

                    if (isWalkable(potentialNewX, potentialNewY)) {
                        warrior.x = potentialNewX;
                        warrior.y = potentialNewY;
                    } else {
                        warrior.isMoving = false;
                        warrior.targetX = null;
                        warrior.targetY = null;
                    }
                }
            }
        }

        // Animation update for warrior
        if (warrior.isMoving) {
            warrior.frameCount++;
            if (warrior.frameCount % warrior.animationSpeed === 0) {
                warrior.animationFrame = (warrior.animationFrame + 1) % 4;
            }
        } else {
            warrior.frameCount = 0;
            warrior.animationFrame = 0;
        }

        // Remove dead warriors (for future attack system)
        if (warrior.health <= 0) {
            warriors.splice(index, 1);
            console.log(`Warrior ${index} defeated! Remaining warriors: ${warriors.length}`);
        }
    });
}


// --- Main Drawing Function ---
let drawables = []; // This needs to be accessible in this scope for drawCharacter

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawables = []; // Clear drawables array for each frame

    // Calculate visible area in world units for culling
    const visibleWorldWidth = (canvas.width / (TILE_ISO_WIDTH / 2)) + 4;
    const visibleWorldHeight = (canvas.height / (TILE_ISO_HEIGHT / 2)) + 4;

    const startGridX = Math.max(0, Math.floor(camera.x - visibleWorldWidth / 2));
    const endGridX = Math.min(WORLD_UNITS_WIDTH, Math.ceil(camera.x + visibleWorldWidth / 2));
    const startGridY = Math.max(0, Math.floor(camera.y - visibleWorldHeight / 2));
    const endGridY = Math.min(WORLD_UNITS_HEIGHT, Math.ceil(camera.y + visibleWorldHeight / 2));

    // Add Ground Patches
    for (let y = startGridY; y < endGridY; y++) {
        for (let x = startGridX; x < endGridX; x++) {
            const screenPos = isoToScreen(x, y);

            if (screenPos.x + TILE_ISO_WIDTH > 0 && screenPos.x < canvas.width &&
                screenPos.y + TILE_ISO_HEIGHT + MAX_OBJECT_HEIGHT_FROM_GROUND > 0 && screenPos.y < canvas.height) {

                const biomeType = worldMap[y] ? worldMap[y][x] : 'ground';
                const tileColors = BIOME_COLORS[biomeType] || BIOME_COLORS['ground'];

                drawables.push({
                    type: 'groundPatch',
                    x: x, y: y,
                    screenX: screenPos.x,
                    screenY: screenPos.y,
                    isoWidth: TILE_ISO_WIDTH,
                    isoHeight: TILE_ISO_HEIGHT,
                    colors: tileColors,
                    sortY: screenPos.y + TILE_ISO_HEIGHT + 0.0
                });
            }
        }
    }

    // Add Trees
    trees.forEach(tree => {
        const treeScreenPos = isoToScreen(tree.x, tree.y);

        if (treeScreenPos.x + TILE_ISO_WIDTH > 0 && treeScreenPos.x < canvas.width &&
            treeScreenPos.y + MAX_OBJECT_HEIGHT_FROM_GROUND > 0 && treeScreenPos.y < canvas.height + TILE_ISO_HEIGHT) {

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
        }
    });

    // Add Player components
    const playerScreenPos = isoToScreen(player.x, player.y);
    const playerSortY = playerScreenPos.y + TILE_ISO_HEIGHT + CHARACTER_LEG_Z_HEIGHT + CHARACTER_BODY_Z_HEIGHT;
    drawCharacter(player, playerScreenPos, playerSortY);

    // Add Warriors components
    warriors.forEach(warrior => {
        const warriorScreenPos = isoToScreen(warrior.x, warrior.y);
        const warriorSortY = warriorScreenPos.y + TILE_ISO_HEIGHT + CHARACTER_LEG_Z_HEIGHT + CHARACTER_BODY_Z_HEIGHT;

        // *** TEMPORARY: CULLING COMMENTED OUT FOR DEBUGGING ***
        // if (warriorScreenPos.x + TILE_ISO_WIDTH > 0 && warriorScreenPos.x < canvas.width &&
        //     warriorScreenPos.y + CHARACTER_BODY_Z_HEIGHT + CHARACTER_LEG_Z_HEIGHT > 0 && warriorScreenPos.y < canvas.height + TILE_ISO_HEIGHT) {
            drawCharacter(warrior, warriorScreenPos, warriorSortY);

            // --- DEBUGGING VISUALS FOR WARRIORS ---
            // Draw aggro range
            ctx.strokeStyle = warrior.state === WARRIOR_STATE.CHASING ? 'red' : 'rgba(255, 165, 0, 0.5)'; // Orange if idle, red if chasing
            ctx.beginPath();
            const aggroRangeScreen = warrior.aggroRange * (TILE_ISO_WIDTH / 2) * 1.5; 
            ctx.arc(warriorScreenPos.x + TILE_ISO_WIDTH / 2, warriorScreenPos.y + TILE_ISO_HEIGHT / 2, aggroRangeScreen, 0, Math.PI * 2);
            ctx.stroke();

            // Draw warrior's exact world (x,y) point
            ctx.fillStyle = 'purple';
            ctx.fillRect(warriorScreenPos.x + TILE_ISO_WIDTH / 2 - 2, warriorScreenPos.y + TILE_ISO_HEIGHT / 2 - 2, 4, 4);

            // Draw warrior target if they are moving idly
            if (warrior.state === WARRIOR_STATE.IDLE && warrior.targetX !== null && warrior.targetY !== null) {
                const targetScreenPos = isoToScreen(warrior.targetX, warrior.targetY);
                ctx.strokeStyle = 'cyan';
                ctx.beginPath();
                ctx.moveTo(warriorScreenPos.x + TILE_ISO_WIDTH / 2, warriorScreenPos.y + TILE_ISO_HEIGHT / 2);
                ctx.lineTo(targetScreenPos.x + TILE_ISO_WIDTH / 2, targetScreenPos.y + TILE_ISO_HEIGHT / 2);
                ctx.stroke();
                ctx.fillStyle = 'blue';
                ctx.fillRect(targetScreenPos.x + TILE_ISO_WIDTH / 2 - 3, targetScreenPos.y + TILE_ISO_HEIGHT / 2 - 3, 6, 6);
            }
        // } // END TEMPORARY: CULLING COMMENTED OUT
    });


    // Sort drawables by their sortY
    drawables.sort((a, b) => {
        if (a.sortY !== b.sortY) {
            return a.sortY - b.sortY;
        }
        const typeOrder = { 'groundPatch': 0, 'treeTrunk': 1, 'characterPart': 2, 'treeLeaves': 3 };
        return typeOrder[a.type] - typeOrder[b.type];
    });

    // Draw all sorted entities
    drawables.forEach(entity => {
        if (entity.type === 'groundPatch') {
            drawIsometricDiamond(entity.colors, entity.screenX, entity.screenY, entity.isoWidth, entity.isoHeight, DRAW_GROUND_BORDERS, GROUND_BORDER_COLOR, GROUND_BORDER_THICKNESS);
        } else if (entity.type === 'treeTrunk' || entity.type === 'treeLeaves' || entity.type === 'characterPart') {
            drawIsometric3DBlock(entity.screenX, entity.screenY, entity.zHeight, entity.isoWidth, entity.isoHeight, entity.colors);
        }
    });

    // --- Draw UI Elements (Health, Version) ---
    // Player Health Bar
    ctx.fillStyle = 'black';
    ctx.fillRect(10, 50, 150, 20); // Background for health bar
    const healthBarWidth = (player.health / player.maxHealth) * 148;
    ctx.fillStyle = 'red';
    ctx.fillRect(11, 51, healthBarWidth, 18);
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`HP: ${player.health}/${player.maxHealth}`, 170, 66);


    // Version Number
    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Version: ${GAME_VERSION}`, 10, 30);
}

// --- Game Loop ---
function gameLoop(currentTime) {
    // *** TEMPORARY: VERY VERBOSE LOGGING FOR DEBUGGING TIMING ***
    console.log("------------------------------------------");
    console.log(`Game loop running. CurrentTime: ${currentTime.toFixed(2)}`);
    console.log(`Last Warrior Spawn Time: ${lastWarriorSpawnTime.toFixed(2)}`);
    console.log(`Time Since Last Spawn: ${(currentTime - lastWarriorSpawnTime).toFixed(2)} ms`);
    console.log(`Warrior Spawn Interval: ${WARRIOR_SPAWN_INTERVAL} ms`);
    console.log(`Condition (Time Since Last Spawn > Interval): ${(currentTime - lastWarriorSpawnTime) > WARRIOR_SPAWN_INTERVAL}`);
    console.log("------------------------------------------");
    // *** END TEMPORARY VERBOSE LOGGING ***

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

    if (currentDx !== 0 && currentDy !== 0) {
        const diagonalFactor = 1 / Math.sqrt(2);
        currentDx *= diagonalFactor;
        currentDy *= diagonalFactor;
    }

    let potentialNewPlayerX = player.x + currentDx * player.moveSpeed;
    let potentialNewPlayerY = player.y + currentDy * player.moveSpeed;

    if (isWalkable(potentialNewPlayerX, potentialNewPlayerY)) {
        player.x = potentialNewPlayerX;
        player.y = potentialNewPlayerY;
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

    // --- Camera Follow Logic (snaps to player's exact position) ---
    camera.x = player.x;
    camera.y = player.y;

    // --- Warrior Spawning Logic ---
    if (currentTime - lastWarriorSpawnTime > WARRIOR_SPAWN_INTERVAL) {
        console.log(`--- Attempting to spawn warrior! Time elapsed: ${currentTime - lastWarriorSpawnTime} ms ---`);
        spawnWarrior();
        lastWarriorSpawnTime = currentTime;
    } else {
        // console.log("Not yet time to spawn warrior."); // No need for this, the verbose log above covers it.
    }

    // --- Update Warrior Logic ---
    updateWarriors();

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
