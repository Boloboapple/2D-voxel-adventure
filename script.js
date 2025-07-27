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
const GAME_VERSION = 37; // <--- INCREMENTED TO 37 for camp biome, death screen, and player health
console.log("------------------------------------------");
console.log(`>>> Game Version: ${GAME_VERSION} <<<`); // This will confirm load
console.log("------------------------------------------");


// --- Colors for biomes and objects ---
const BIOME_COLORS = {
    'ground': { top: '#66BB6A', left: '#4CAF50', right: '#388E3C' },
    'lake': { top: '#64B5F6', left: '#2196F3', right: '#1976D2' },
    'forest': { top: '#4CAF50', left: '#388E3C', right: '#2E7D32' },
    'desert': { top: '#FFEB3B', left: '#FBC02D', right: '#F57F17' },
    'mountain': { top: '#B0BEC5', left: '#90A4AE', right: '#78909C' },
    'camp': { top: '#A0522D', left: '#8B4513', right: '#654321' } // NEW: Darker brown for camp biome
};

const TREE_TRUNK_COLOR = { top: '#A1887F', left: '#8D6E63', right: '#795548' };
const TREE_LEAVES_COLOR = { top: '#7CB342', left: '#689F38', right: '#558B2F' };

const PLAYER_BODY_COLOR = { top: '#FFD700', left: '#DAA520', right: '#B8860B' }; // Gold
const PLAYER_LEG_COLOR = { top: '#CD853F', left: '#8B4513', right: '#A0522D' }; // Brown

const WARRIOR_BODY_COLOR = { top: '#B22222', left: '#8B0000', right: '#660000' }; // Dark Red (Melee)
const WARRIOR_LEG_COLOR = { top: '#4F4F4F', left: '#363636', right: '#292929' }; // Dark Grey (Melee)
const STICK_COLOR = { top: '#8B4513', left: '#654321', right: '#4A2C00' }; // Brownish for melee stick

// Archer Colors and Arrow Colors
const ARCHER_BODY_COLOR = { top: '#4CAF50', left: '#388E3C', right: '#2E7D32' }; // Green
const ARCHER_LEG_COLOR = { top: '#4F4F4F', left: '#363636', right: '#292929' }; // Dark Grey (Archer)
const ARROW_COLOR = { top: '#A1887F', left: '#8D6E63', right: '#795548' }; // Brownish for the arrow

// NEW Camp Colors (for the actual camp structure drawn on top of the biome)
const CAMP_COLOR = { top: '#8B4513', left: '#654321', right: '#4A2C00' }; // Brown

// --- Player Object ---
const player = {
    x: WORLD_UNITS_WIDTH / 2,
    y: WORLD_UNITS_HEIGHT / 2,
    type: 'player', // Added type for drawing logic
    bodyColor: PLAYER_BODY_COLOR,
    legColor: PLAYER_LEG_COLOR,
    isMoving: false,
    moveSpeed: 0.05,
    animationFrame: 0,
    animationSpeed: 5,
    frameCount: 0,
    health: 200, // Player health - NEW: Increased to 200
    maxHealth: 200, // Player max health - NEW: Increased to 200
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
const MAX_WARRIORS = 50;

const WARRIOR_AGGRO_RANGE = 5; // Distance in world units for player detection (Melee)
const WARRIOR_MOVE_SPEED = 0.03; // Warriors move slightly slower than player
const WARRIOR_IDLE_MOVE_CHANCE = 0.02; // Chance per frame for idle warrior to move
const WARRIOR_HEALTH = 50; // Warrior health

// Warrior states
const WARRIOR_STATE = {
    IDLE: 'idle',
    CHASING: 'chasing',
    ATTACKING: 'attacking', // Melee attack
    AIMING: 'aiming', // Archer is in range and charging shot
    SHOOTING: 'shooting' // Archer is firing an arrow
};

// Archer Configuration
const ARCHER_SPAWN_CHANCE = 0.20; // 20% chance to be an archer
const ARCHER_AGGRO_RANGE = 8; // Longer range for archers
const ARCHER_ATTACK_RANGE = 7; // Within aggro, they'll shoot (doesn't cause movement stop, just defines target range)
const ARCHER_DAMAGE = 10; // Slightly less damage than melee, but from range
const ARCHER_ATTACK_COOLDOWN = 1200; // 1.2 seconds between shots
const ARCHER_HIT_CHANCE = 0.50; // 50% chance to hit

const ARROW_SPEED = 0.2; // Speed of the arrow projectile
const ARROW_Z_OFFSET = TILE_ISO_HEIGHT * 0.5; // Visual height offset for arrow
const ARROW_VISUAL_LENGTH = TILE_ISO_WIDTH * 0.3; // Length of the arrow
const arrows = []; // Array to hold arrow projectiles

// NEW Camp Configuration
const camps = []; // Array to hold enemy camps
const MIN_CAMPS = 1;
const MAX_CAMPS = 3; // Number of camps to generate
const MIN_CAMP_RADIUS = 5; // Minimum size in world units - NEW: Increased
const MAX_CAMP_RADIUS = 10; // Maximum size in world units - NEW: Increased

// How far from player a camp must spawn (to avoid immediate aggro)
const MIN_CAMP_SPAWN_DIST_FROM_PLAYER = 15;

const WARRIOR_SPAWN_INTERVAL = 1500; // Warriors spawn less frequently, but from camps now
let lastWarriorSpawnTime = 0;

// NEW: Game State
const GAME_STATE = {
    PLAYING: 'playing',
    DEFEATED: 'defeated'
};
let gameState = GAME_STATE.PLAYING; // Initial game state

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

    // Apply movement animation only if not attacking AND is a melee type
    if (character.isMoving && !character.isAttacking && character.type === 'melee') {
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

    // --- Draw Attack Weapon/Visual for each type ---
    if (character.isAttacking) {
        if (character.type === 'melee') {
            let stickOffsetIsoX = 0;
            let stickOffsetIsoY = 0;
            let stickHeight = TILE_ISO_HEIGHT * 0.7;
            let stickWidth = TILE_ISO_WIDTH * 0.15;

            const attackFrame = character.attackAnimationFrame;

            if (attackFrame === 0) {
                stickOffsetIsoX = TILE_ISO_WIDTH * 0.25;
                stickOffsetIsoY = -TILE_ISO_HEIGHT * 0.05;
            } else if (attackFrame === 1) {
                stickOffsetIsoX = TILE_ISO_WIDTH * 0.1;
                stickOffsetIsoY = TILE_ISO_HEIGHT * 0.05;
            } else if (attackFrame === 2) {
                stickOffsetIsoX = TILE_ISO_WIDTH * 0.0;
                stickOffsetIsoY = TILE_ISO_HEIGHT * 0.1;
            } else if (attackFrame === 3) {
                stickOffsetIsoX = TILE_ISO_WIDTH * 0.15;
                stickOffsetIsoY = TILE_ISO_HEIGHT * 0.0;
            }

            drawables.push({
                type: 'characterPart',
                x: character.x, y: character.y,
                screenX: screenPos.x + (TILE_ISO_WIDTH / 2) - (stickWidth / 2) + stickOffsetIsoX,
                screenY: screenPos.y + TILE_ISO_HEIGHT - CHARACTER_VISUAL_LIFT_OFFSET - CHARACTER_LEG_Z_HEIGHT - CHARACTER_BODY_Z_HEIGHT + (CHARACTER_BODY_ISO_HEIGHT / 2) - stickHeight / 2 + stickOffsetIsoY,
                zHeight: stickHeight,
                isoWidth: stickWidth,
                isoHeight: stickWidth / 2,
                colors: STICK_COLOR,
                sortY: sortY + 0.004
            });
        } else if (character.type === 'archer') {
            // Simple visual for archer holding a bow during "aiming"
            let bowHeight = TILE_ISO_HEIGHT * 0.8;
            let bowWidth = TILE_ISO_WIDTH * 0.2;
            let bowOffsetIsoX = TILE_ISO_WIDTH * 0.2;
            let bowOffsetIsoY = -TILE_ISO_HEIGHT * 0.1;

            drawables.push({
                type: 'characterPart',
                x: character.x, y: character.y,
                screenX: screenPos.x + (TILE_ISO_WIDTH / 2) - (bowWidth / 2) + bowOffsetIsoX,
                screenY: screenPos.y + TILE_ISO_HEIGHT - CHARACTER_VISUAL_LIFT_OFFSET - CHARACTER_LEG_Z_HEIGHT - CHARACTER_BODY_Z_HEIGHT + (CHARACTER_BODY_ISO_HEIGHT / 2) - bowHeight / 2 + bowOffsetIsoY,
                zHeight: bowHeight,
                isoWidth: bowWidth,
                isoHeight: bowWidth / 2,
                colors: STICK_COLOR,
                sortY: sortY + 0.004
            });
        }
    }
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


// Function to generate camps and set their biome
function generateCamps() {
    const numCamps = Math.floor(Math.random() * (MAX_CAMPS - MIN_CAMPS + 1)) + MIN_CAMPS;
    console.log(`Generating ${numCamps} enemy camps.`);

    for (let i = 0; i < numCamps; i++) {
        let campX, campY, campRadius;
        let attempts = 0;
        const maxAttempts = 50; // Try several times to find a good spot

        let foundValidCampSpot = false;
        while (attempts < maxAttempts && !foundValidCampSpot) {
            campX = Math.random() * WORLD_UNITS_WIDTH;
            campY = Math.random() * WORLD_UNITS_HEIGHT;
            campRadius = Math.random() * (MAX_CAMP_RADIUS - MIN_CAMP_RADIUS) + MIN_CAMP_RADIUS;

            // Check if the proposed camp area is suitable
            let validArea = true;
            // Iterate over a square bounding box around the potential camp center
            const startCheckX = Math.max(0, Math.floor(campX - campRadius));
            const endCheckX = Math.min(WORLD_UNITS_WIDTH - 1, Math.ceil(campX + campRadius));
            const startCheckY = Math.max(0, Math.floor(campY - campRadius));
            const endCheckY = Math.min(WORLD_UNITS_HEIGHT - 1, Math.ceil(campY + campRadius));

            for (let y = startCheckY; y <= endCheckY; y++) {
                for (let x = startCheckX; x <= endCheckX; x++) {
                    const distFromCenter = Math.sqrt(Math.pow(x - campX, 2) + Math.pow(y - campY, 2));
                    if (distFromCenter <= campRadius) {
                        // If any part of the camp overlaps with non-ground (or player start), it's invalid
                        if (!worldMap[y] || worldMap[y][x] === 'lake' || worldMap[y][x] === 'mountain' || Math.sqrt(Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2)) < MIN_CAMP_SPAWN_DIST_FROM_PLAYER) {
                            validArea = false;
                            break;
                        }
                    }
                }
                if (!validArea) break;
            }

            if (validArea) {
                foundValidCampSpot = true;
            }
            attempts++;
        }

        if (foundValidCampSpot) {
            camps.push({
                x: campX,
                y: campY,
                radius: campRadius,
                isIntruded: false
            });
            console.log(`Camp ${i + 1} spawned at (${campX.toFixed(2)}, ${campY.toFixed(2)}) with radius ${campRadius.toFixed(2)}.`);

            // --- Set biome for the camp area ---
            const startSetX = Math.max(0, Math.floor(campX - campRadius));
            const endSetX = Math.min(WORLD_UNITS_WIDTH - 1, Math.ceil(campX + campRadius));
            const startSetY = Math.max(0, Math.floor(campY - campRadius));
            const endSetY = Math.min(WORLD_UNITS_HEIGHT - 1, Math.ceil(campY + campRadius));

            for (let y = startSetY; y <= endSetY; y++) {
                for (let x = startSetX; x <= endSetX; x++) {
                    const distFromCenter = Math.sqrt(Math.pow(x - campX, 2) + Math.pow(y - campY, 2));
                    if (distFromCenter <= campRadius) {
                        worldMap[y][x] = 'camp'; // Set the biome to 'camp'
                        // Remove any trees from the camp area
                        // Iterating and splicing during iteration can be problematic, better to rebuild trees array
                        // For now, it's fine as trees are few and camps are few.
                        // A more robust approach would be to add trees that are *not* in camps.
                        trees.forEach((tree, treeIndex) => {
                            if (Math.floor(tree.x) === x && Math.floor(tree.y) === y) {
                                // Mark for removal or filter later
                                trees.splice(treeIndex, 1); // Simple removal, may cause skip if not careful with index
                            }
                        });
                    }
                }
            }
        } else {
            console.warn(`Could not find a valid spot for Camp ${i + 1} after ${maxAttempts} attempts.`);
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
    warriors.length = 0;
    arrows.length = 0;
    camps.length = 0; // Clear camps on new map generation

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
            // Only add trees to 'forest' biome and if it's not going to be a camp later
            if (worldMap[y][x] === 'forest' && Math.random() < treeDensity) {
                // We'll remove trees within camp areas after camp generation, so this is fine for now
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

    // Generate Camps AFTER player is placed so camps can spawn away from player
    // And before initial warrior spawn
    generateCamps();

    lastWarriorSpawnTime = 0; // Initialize to 0 to trigger immediate spawn on first loop
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

    // NEW: Camp biome is always walkable
    if (biomeType === 'camp') {
        return true;
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
    if (warriors.length >= MAX_WARRIORS) {
        return;
    }

    if (camps.length === 0) {
        console.warn("No enemy camps available to spawn warriors. Preventing spawn.");
        return; // No camps, no warrior spawns
    }

    // Select a random camp to spawn the warrior in
    const targetCampIndex = Math.floor(Math.random() * camps.length);
    const targetCamp = camps[targetCampIndex];

    let spawnX, spawnY;
    let attempts = 0;
    const maxAttempts = 20; // Increased attempts to find spot inside camp
    let foundValidSpot = false;

    // Try to find a spawn location *inside* the chosen camp
    while (attempts < maxAttempts && !foundValidSpot) {
        // Random angle and distance from camp center within radius
        const angle = Math.random() * Math.PI * 2;
        const distFromCenter = Math.random() * targetCamp.radius;

        spawnX = targetCamp.x + Math.cos(angle) * distFromCenter;
        spawnY = targetCamp.y + Math.sin(angle) * distFromCenter;

        const gridX = Math.floor(spawnX);
        const gridY = Math.floor(spawnY);

        if (isWalkable(gridX, gridY)) {
            foundValidSpot = true;
        }
        attempts++;
    }

    if (!foundValidSpot) {
        console.warn(`Could not find suitable spawn location within camp at (${targetCamp.x.toFixed(2)}, ${targetCamp.y.toFixed(2)}) for warrior after ${maxAttempts} attempts.`);
        return;
    }

    const isArcher = Math.random() < ARCHER_SPAWN_CHANCE;
    let newWarrior;

    if (isArcher) {
        newWarrior = {
            x: spawnX,
            y: spawnY,
            type: 'archer',
            bodyColor: ARCHER_BODY_COLOR,
            legColor: ARCHER_LEG_COLOR,
            isMoving: false,
            animationFrame: 0,
            animationSpeed: 10,
            frameCount: 0,
            health: WARRIOR_HEALTH,
            maxHealth: WARRIOR_HEALTH,
            state: WARRIOR_STATE.IDLE,
            targetX: null,
            targetY: null,
            aggroRange: ARCHER_AGGRO_RANGE,
            attackRange: ARCHER_ATTACK_RANGE,
            attackDamage: ARCHER_DAMAGE,
            attackCooldown: ARCHER_ATTACK_COOLDOWN,
            lastAttackTime: 0,
            isAttacking: false,
            attackAnimationFrame: 0,
            attackFrameCount: 0,
            hitChance: ARCHER_HIT_CHANCE,
            aimProgress: 0,
            campId: targetCampIndex, // Link warrior to its camp
            isFreed: targetCamp.isIntruded // If camp is already intruded, warrior is free
        };
        console.log(`SUCCESS: Archer spawned at (${spawnX.toFixed(2)}, ${spawnY.toFixed(2)}) in Camp ${targetCampIndex}. Total warriors: ${warriors.length}`);
    } else {
        newWarrior = {
            x: spawnX,
            y: spawnY,
            type: 'melee',
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
            attackRange: 0.8,
            attackDamage: 15,
            attackCooldown: 800,
            lastAttackTime: 0,
            isAttacking: false,
            attackAnimationFrame: 0,
            attackFrameCount: 0,
            campId: targetCampIndex, // Link warrior to its camp
            isFreed: targetCamp.isIntruded // If camp is already intruded, warrior is free
        };
        console.log(`SUCCESS: Melee warrior spawned at (${spawnX.toFixed(2)}, ${spawnY.toFixed(2)}) in Camp ${targetCampIndex}. Total warriors: ${warriors.length}`);
    }

    warriors.push(newWarrior);
}

function updateWarriors() {
    const currentTime = Date.now(); // Get current time once per update for all warriors

    // --- Check for Player Intrusion into Camps ---
    camps.forEach(camp => {
        if (!camp.isIntruded) { // Only check if not already intruded
            const distToCampCenter = Math.sqrt(Math.pow(player.x - camp.x, 2) + Math.pow(player.y - camp.y, 2));
            if (distToCampCenter <= camp.radius) {
                camp.isIntruded = true;
                console.log(`Player has intruded Camp at (${camp.x.toFixed(2)}, ${camp.y.toFixed(2)})! All warriors from this camp are now freed.`);
                // Set all warriors associated with this camp to be 'freed'
                warriors.forEach(warrior => {
                    if (warrior.campId === camps.indexOf(camp)) {
                        warrior.isFreed = true;
                        // Force state change if needed, e.g., if they were idle inside camp
                        if (warrior.state === WARRIOR_STATE.IDLE) {
                            warrior.state = WARRIOR_STATE.CHASING; // They will now chase the player
                            warrior.targetX = null; // Clear idle target
                            warrior.targetY = null;
                        }
                    }
                });
            }
        }
    });


    warriors.forEach((warrior, index) => {
        const distToPlayer = Math.sqrt(Math.pow(warrior.x - player.x, 2) + Math.pow(warrior.y - player.y, 2));

        // --- Common Animation Logic (Applies to both types if not attacking) ---
        // Only melee warriors have walking animation
        if (warrior.isMoving && !warrior.isAttacking && warrior.type === 'melee') {
            warrior.frameCount++;
            if (warrior.frameCount % warrior.animationSpeed === 0) {
                warrior.animationFrame = (warrior.animationFrame + 1) % 4;
            }
        } else if (!warrior.isAttacking && warrior.type === 'melee') { // Reset melee animation if not moving/attacking
            warrior.frameCount = 0;
            warrior.animationFrame = 0;
        }

        // --- Type-Specific Behavior ---
        if (warrior.type === 'melee') {
            // --- Melee Warrior State Transitions ---
            if (warrior.state === WARRIOR_STATE.IDLE) {
                if (distToPlayer <= warrior.aggroRange || warrior.isFreed) { // If freed, they'll chase
                    warrior.state = WARRIOR_STATE.CHASING;
                    console.log(`Melee Warrior ${index} now CHASING player.`);
                }
            } else if (warrior.state === WARRIOR_STATE.CHASING) {
                if (distToPlayer <= warrior.attackRange && currentTime - warrior.lastAttackTime > warrior.attackCooldown) {
                    warrior.state = WARRIOR_STATE.ATTACKING;
                    warrior.isMoving = false;
                    warrior.isAttacking = true;
                    warrior.attackAnimationFrame = 0;
                    warrior.attackFrameCount = 0;
                    console.log(`Melee Warrior ${index} now ATTACKING player!`);
                } else if (!warrior.isFreed && distToPlayer > warrior.aggroRange * 1.5) { // Only go idle if not freed and player far
                    warrior.state = WARRIOR_STATE.IDLE;
                    console.log(`Melee Warrior ${index} is now IDLE (player too far while chasing).`);
                    warrior.targetX = null;
                    warrior.targetY = null;
                }
            } else if (warrior.state === WARRIOR_STATE.ATTACKING) {
                if (!warrior.isAttacking) { // This means the attack animation sequence completed
                    warrior.state = WARRIOR_STATE.CHASING;
                    console.log(`Melee Warrior ${index} attack animation finished, now re-evaluating (CHASING).`);
                }
            }

            // --- Melee Warrior Behavior ---
            if (warrior.state === WARRIOR_STATE.CHASING) {
                warrior.isMoving = true;
                let dx = player.x - warrior.x;
                let dy = player.y - warrior.y;
                const magnitude = Math.sqrt(dx * dx + dy * dy);

                // Move only if not in attack range, or if still on cooldown (so it doesn't just sit there)
                if (magnitude > warrior.attackRange || currentTime - warrior.lastAttackTime <= warrior.attackCooldown) {
                    dx /= magnitude;
                    dy /= magnitude;
                    let potentialNewX = warrior.x + dx * WARRIOR_MOVE_SPEED;
                    let potentialNewY = warrior.y + dy * WARRIOR_MOVE_SPEED;

                    // Apply camp confinement if not freed
                    if (!warrior.isFreed) {
                        const currentCamp = camps[warrior.campId];
                        const distFromCampCenter = Math.sqrt(Math.pow(potentialNewX - currentCamp.x, 2) + Math.pow(potentialNewY - currentCamp.y, 2));
                        if (distFromCampCenter > currentCamp.radius) {
                            // If moving out of camp, force them back towards center slightly or stop
                            potentialNewX = warrior.x; // Stay put if trying to leave
                            potentialNewY = warrior.y;
                            warrior.isMoving = false; // Stop trying to move if hitting boundary
                            warrior.targetX = currentCamp.x; // Maybe set a target to center of camp
                            warrior.targetY = currentCamp.y;
                            // console.log(`Melee warrior ${index} confined to camp.`); // Keep this for debugging if needed
                        }
                    }

                    // Check walkability after potential confinement
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
                    warrior.isMoving = false; // Stop moving if in range and ready to attack
                }
            } else if (warrior.state === WARRIOR_STATE.ATTACKING) {
                warrior.isMoving = false; // No movement while attacking

                warrior.attackFrameCount++;
                if (warrior.attackFrameCount % 5 === 0) { // Adjust speed of attack swing animation (every 5 frames)
                    warrior.attackAnimationFrame++;
                    if (warrior.attackAnimationFrame === 2) { // Frame 2 is designated as the 'hit' frame
                        // Apply damage only once per attack animation cycle
                        if (player.health > 0) { // Don't damage if player is already dead
                            player.health = Math.max(0, player.health - warrior.attackDamage);
                            console.log(`Player hit by melee warrior ${index}! Health: ${player.health}`);
                        }
                        warrior.lastAttackTime = currentTime; // Reset cooldown after damage is dealt
                    }
                    if (warrior.attackAnimationFrame >= 4) { // After 4 frames, animation cycle ends
                        warrior.attackAnimationFrame = 0; // Reset for next attack
                        warrior.isAttacking = false; // Attack animation done
                    }
                }
            } else if (warrior.state === WARRIOR_STATE.IDLE) {
                // If not freed, idle movement is restricted to within camp
                if (!warrior.isMoving && Math.random() < WARRIOR_IDLE_MOVE_CHANCE) {
                    let foundTarget = false;
                    let attempts = 0;
                    const maxIdleAttempts = 5;
                    while (!foundTarget && attempts < maxIdleAttempts) {
                        const randomOffsetMagnitude = Math.random() * 3 + 1;
                        const randomAngle = Math.random() * Math.PI * 2;
                        const targetCandidateX = warrior.x + Math.cos(randomAngle) * randomOffsetMagnitude;
                        const targetCandidateY = warrior.y + Math.sin(randomAngle) * randomOffsetMagnitude;

                        let isValidIdleTarget = true;
                        if (!warrior.isFreed) {
                            const currentCamp = camps[warrior.campId];
                            const distFromCampCenter = Math.sqrt(Math.pow(targetCandidateX - currentCamp.x, 2) + Math.pow(targetCandidateY - currentCamp.y, 2));
                            if (distFromCampCenter > currentCamp.radius) {
                                isValidIdleTarget = false; // Cannot set target outside camp
                            }
                        }

                        if (isValidIdleTarget && isWalkable(Math.floor(targetCandidateX), Math.floor(targetCandidateY))) {
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

                        // Check again for camp confinement during idle movement
                        if (!warrior.isFreed) {
                            const currentCamp = camps[warrior.campId];
                            const distFromCampCenter = Math.sqrt(Math.pow(potentialNewX - currentCamp.x, 2) + Math.pow(potentialNewY - currentCamp.y, 2));
                            if (distFromCampCenter > currentCamp.radius) {
                                warrior.isMoving = false; // Stop moving if trying to leave camp
                                warrior.targetX = null;
                                warrior.targetY = null;
                                // console.log(`Melee warrior ${index} confined to camp during idle.`); // Keep for debugging if needed
                            }
                        }

                        if (warrior.isMoving && isWalkable(potentialNewX, potentialNewY)) { // Check if still moving after confinement
                            warrior.x = potentialNewX;
                            warrior.y = potentialNewY;
                        } else if (warrior.isMoving) { // If still trying to move but hit non-walkable
                             warrior.isMoving = false;
                             warrior.targetX = null;
                             warrior.targetY = null;
                        }
                    }
                }
            }
        }
        else if (warrior.type === 'archer') {
            warrior.isMoving = false; // Archers never move

            // --- Archer State Transitions ---
            if (warrior.state === WARRIOR_STATE.IDLE) {
                if (distToPlayer <= warrior.aggroRange || warrior.isFreed) { // If freed, they'll always try to aggro
                    warrior.state = WARRIOR_STATE.AIMING;
                    warrior.aimProgress = 0;
                    console.log(`Archer ${index} is now AIMING at player.`);
                }
            } else if (warrior.state === WARRIOR_STATE.AIMING || warrior.state === WARRIOR_STATE.SHOOTING) {
                // If player leaves aggro range AND archer is not freed (still confined to camp)
                if (!warrior.isFreed && distToPlayer > warrior.aggroRange) {
                    warrior.state = WARRIOR_STATE.IDLE;
                    warrior.aimProgress = 0;
                    warrior.isAttacking = false;
                    console.log(`Archer ${index} stopped AIMING (player out of range).`);
                } else if (currentTime - warrior.lastAttackTime > warrior.attackCooldown) {
                    // If cooldown is ready and player is in range (or warrior is freed)
                    warrior.state = WARRIOR_STATE.AIMING;
                    warrior.isAttacking = true;
                    warrior.attackAnimationFrame = 0;
                    warrior.attackFrameCount = 0;
                }
            }

            // --- Archer Behavior ---
            if (warrior.state === WARRIOR_STATE.AIMING) {
                warrior.isAttacking = true;

                warrior.attackFrameCount++;
                if (warrior.attackFrameCount % 8 === 0) {
                    warrior.attackAnimationFrame = (warrior.attackAnimationFrame + 1) % 4;
                }

                warrior.aimProgress++;
                const AIM_DURATION_FRAMES = 30;
                if (warrior.aimProgress >= AIM_DURATION_FRAMES) {
                    warrior.state = WARRIOR_STATE.SHOOTING;
                    warrior.aimProgress = 0;

                    if (Math.random() < warrior.hitChance) {
                        let arrowDx = player.x - warrior.x;
                        let arrowDy = player.y - warrior.y;
                        const arrowMagnitude = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);
                        arrowDx /= arrowMagnitude;
                        arrowDy /= arrowMagnitude;

                        arrows.push({
                            x: warrior.x,
                            y: warrior.y,
                            dx: arrowDx,
                            dy: arrowDy,
                            damage: warrior.attackDamage,
                        });
                        console.log(`Archer ${index} SHOT an arrow!`);
                    } else {
                        console.log(`Archer ${index} MISSED the shot.`);
                    }
                    warrior.lastAttackTime = currentTime;
                    warrior.isAttacking = false;
                    warrior.state = WARRIOR_STATE.IDLE;
                }
            } else if (warrior.state === WARRIOR_STATE.SHOOTING) {
                warrior.isAttacking = false;
                warrior.aimProgress = 0;
            } else {
                warrior.isAttacking = false;
                warrior.aimProgress = 0;
            }
        }

        // Remove dead warriors
        if (warrior.health <= 0) {
            warriors.splice(index, 1);
            console.log(`Warrior ${index} defeated! Remaining warriors: ${warriors.length}`);
        }
    });

    // --- Update Arrows ---
    arrows.forEach((arrow, index) => {
        arrow.x += arrow.dx * ARROW_SPEED;
        arrow.y += arrow.dy * ARROW_SPEED;

        const arrowDistToPlayer = Math.sqrt(Math.pow(arrow.x - player.x, 2) + Math.pow(arrow.y - player.y, 2));

        if (arrowDistToPlayer < 0.5) {
            if (player.health > 0) {
                player.health = Math.max(0, player.health - arrow.damage);
                console.log(`Player hit by arrow! Health: ${player.health}`);
            }
            arrows.splice(index, 1);
        }
        else if (arrow.x < -20 || arrow.x > WORLD_UNITS_WIDTH + 20 || arrow.y < -20 || arrow.y > WORLD_UNITS_HEIGHT + 20) {
            arrows.splice(index, 1);
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

    // Add Camps (structures on top of the camp biome) to drawables array
    camps.forEach(camp => {
        const campScreenPos = isoToScreen(camp.x, camp.y);
        // Convert world units radius to isometric pixels for drawing
        const isoRadius = camp.radius * (TILE_ISO_WIDTH / 2); // Roughly scales radius to screen space

        // For drawing a 3D block that looks like a flattened circle from above
        const displayIsoWidth = isoRadius * 2; // Diameter for the X-axis of the diamond
        const displayIsoHeight = isoRadius; // Diameter for the Y-axis of the diamond (half of width for squish)

        drawables.push({
            type: 'camp',
            x: camp.x, y: camp.y,
            // Center the camp's drawn shape on its world (x,y)
            screenX: campScreenPos.x + (TILE_ISO_WIDTH / 2) - (displayIsoWidth / 2),
            screenY: campScreenPos.y + TILE_ISO_HEIGHT - (displayIsoHeight / 2), // Adjust Y to sit on the ground
            zHeight: TILE_ISO_HEIGHT * 0.1, // Very thin camp ground
            isoWidth: displayIsoWidth,
            isoHeight: displayIsoHeight,
            colors: CAMP_COLOR,
            sortY: campScreenPos.y + TILE_ISO_HEIGHT + 0.0005 // Draw above ground, below characters/trees
        });

        // Debugging: Draw camp radius (actual circle in 2D plane)
        ctx.strokeStyle = camp.isIntruded ? 'red' : 'rgba(100, 100, 100, 0.5)';
        ctx.beginPath();
        // This circle is drawn in screen coordinates relative to iso point for player's perspective
        ctx.arc(campScreenPos.x + TILE_ISO_WIDTH / 2, campScreenPos.y + TILE_ISO_HEIGHT / 2, isoRadius, 0, Math.PI * 2);
        ctx.stroke();
    });


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

        // Culling commented out for debugging for now. Uncomment if performance becomes an issue.
        // if (warriorScreenPos.x + TILE_ISO_WIDTH > 0 && warriorScreenPos.x < canvas.width &&
        //     warriorScreenPos.y + CHARACTER_BODY_Z_HEIGHT + CHARACTER_LEG_Z_HEIGHT > 0 && warriorScreenPos.y < canvas.height + TILE_ISO_HEIGHT) {
            drawCharacter(warrior, warriorScreenPos, warriorSortY);

            // --- DEBUGGING VISUALS FOR WARRIORS ---
            // Draw aggro range
            let aggroColor = 'rgba(255, 165, 0, 0.5)'; // Orange if idle
            if (warrior.type === 'melee' && warrior.state === WARRIOR_STATE.CHASING) {
                aggroColor = 'red';
            } else if (warrior.type === 'archer' && (warrior.state === WARRIOR_STATE.AIMING || warrior.state === WARRIOR_STATE.SHOOTING)) {
                aggroColor = 'blue';
            }
            ctx.strokeStyle = aggroColor;
            ctx.beginPath();
            const aggroRangeScreen = warrior.aggroRange * (TILE_ISO_WIDTH / 2) * 1.5; 
            ctx.arc(warriorScreenPos.x + TILE_ISO_WIDTH / 2, warriorScreenPos.y + TILE_ISO_HEIGHT / 2, aggroRangeScreen, 0, Math.PI * 2);
            ctx.stroke();

            // Draw warrior's exact world (x,y) point
            ctx.fillStyle = 'purple';
            ctx.fillRect(warriorScreenPos.x + TILE_ISO_WIDTH / 2 - 2, warriorScreenPos.y + TILE_ISO_HEIGHT / 2 - 2, 4, 4);

            // Draw warrior target if they are moving idly (only for melee)
            if (warrior.type === 'melee' && warrior.state === WARRIOR_STATE.IDLE && warrior.targetX !== null && warrior.targetY !== null) {
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


    // Add Arrows to drawables array before drawing
    arrows.forEach(arrow => {
        const arrowScreenPos = isoToScreen(arrow.x, arrow.y);
        drawables.push({
            type: 'arrow',
            x: arrow.x, y: arrow.y,
            screenX: arrowScreenPos.x + (TILE_ISO_WIDTH / 2) - (ARROW_VISUAL_LENGTH / 2), // Center the arrow horizontally
            screenY: arrowScreenPos.y + TILE_ISO_HEIGHT - ARROW_Z_OFFSET, // Position it slightly above ground
            zHeight: TILE_ISO_HEIGHT * 0.1, // Very thin
            isoWidth: ARROW_VISUAL_LENGTH,
            isoHeight: TILE_ISO_HEIGHT * 0.05, // Very narrow
            colors: ARROW_COLOR,
            sortY: arrowScreenPos.y + TILE_ISO_HEIGHT + ARROW_Z_OFFSET + 0.005 // Ensure arrows draw above characters/trees
        });
    });

    // Sort drawables by their sortY
    drawables.sort((a, b) => {
        if (a.sortY !== b.sortY) {
            return a.sortY - b.sortY;
        }
        // Consistent drawing order for objects at the same y-level to avoid z-fighting
        const typeOrder = { 'groundPatch': 0, 'camp': 1, 'treeTrunk': 2, 'characterPart': 3, 'treeLeaves': 4, 'arrow': 5 };
        return typeOrder[a.type] - typeOrder[b.type];
    });

    // Draw all sorted entities
    drawables.forEach(entity => {
        if (entity.type === 'groundPatch') {
            drawIsometricDiamond(entity.colors, entity.screenX, entity.screenY, entity.isoWidth, entity.isoHeight, DRAW_GROUND_BORDERS, GROUND_BORDER_COLOR, GROUND_BORDER_THICKNESS);
        } else if (entity.type === 'treeTrunk' || entity.type === 'treeLeaves' || entity.type === 'characterPart' || entity.type === 'arrow') {
            drawIsometric3DBlock(entity.screenX, entity.screenY, entity.zHeight, entity.isoWidth, entity.isoHeight, entity.colors);
        } else if (entity.type === 'camp') { // Draw camps as flat blocks
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

    // NEW: Death Screen Overlay
    if (gameState === GAME_STATE.DEFEATED) {
        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // "YOU DIED!" text
        ctx.font = '72px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED!', canvas.width / 2, canvas.height / 2 - 50);

        // Make retry button visible
        retryButton.style.display = 'block';
    } else {
        // Hide retry button during gameplay
        retryButton.style.display = 'none';
    }
}

// --- Game Loop ---
function gameLoop(currentTime) {
    if (gameState === GAME_STATE.DEFEATED) {
        draw(); // Still draw to show the death screen
        requestAnimationFrame(gameLoop); // Keep looping to render the death screen
        return; // Stop updating game logic
    }

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
        spawnWarrior();
        lastWarriorSpawnTime = currentTime;
    }

    // --- Update Warrior Logic ---
    updateWarriors();

    // --- Check for Player Death ---
    if (player.health <= 0) {
        gameState = GAME_STATE.DEFEATED;
        console.log("Player defeated! Game Over.");
    }

    draw();

    requestAnimationFrame(gameLoop);
}


// --- Keyboard Input Handling ---
document.addEventListener('keydown', (event) => {
    // Only process input if not defeated
    if (gameState === GAME_STATE.PLAYING) {
        keysPressed[event.key.toLowerCase()] = true;
    }
});

document.addEventListener('keyup', (event) => {
    // Only process input if not defeated
    if (gameState === GAME_STATE.PLAYING) {
        keysPressed[event.key.toLowerCase()] = false;
    }
});


// --- Initial Setup ---
setupWorld(); // Call this once to initialize the map and player
requestAnimationFrame(gameLoop); // Start the game loop


// Get the buttons - they might already exist if you copied the HTML snippet correctly
const regenerateButton = document.getElementById('regenerateButton');
const retryButton = document.getElementById('retryButton');

// If buttons don't exist yet (e.g., if you only copied script.js and not HTML)
// These lines create them if they weren't in your HTML.
// It's generally better to define buttons in HTML and grab them by ID.
if (!regenerateButton) {
    const newRegenerateButton = document.createElement('button');
    newRegenerateButton.textContent = 'Generate New Map';
    newRegenerateButton.id = 'regenerateButton'; // Assign an ID
    newRegenerateButton.style.marginTop = '20px';
    newRegenerateButton.style.padding = '10px 20px';
    newRegenerateButton.style.fontSize = '1em';
    newRegenerateButton.style.backgroundColor = '#61dafb';
    newRegenerateButton.style.color = '#282c34';
    newRegenerateButton.style.border = 'none';
    newRegenerateButton.style.borderRadius = '5px';
    newRegenerateButton.style.cursor = 'pointer';
    document.body.appendChild(newRegenerateButton);
    regenerateButton = newRegenerateButton; // Assign to the const
}

if (!retryButton) {
    const newRetryButton = document.createElement('button');
    newRetryButton.textContent = 'Retry';
    newRetryButton.id = 'retryButton'; // Assign an ID
    newRetryButton.style.display = 'none'; // Initially hidden
    newRetryButton.style.padding = '15px 30px';
    newRetryButton.style.fontSize = '1.5em';
    newRetryButton.style.backgroundColor = '#4CAF50';
    newRetryButton.style.color = 'white';
    newRetryButton.style.border = 'none';
    newRetryButton.style.borderRadius = '8px';
    newRetryButton.style.cursor = 'pointer';
    newRetryButton.style.marginRight = '20px'; // To separate from new map button if they're in the same line
    document.body.appendChild(newRetryButton);
    retryButton = newRetryButton; // Assign to the const
}

// Add event listener for the Retry button
retryButton.addEventListener('click', () => {
    gameState = GAME_STATE.PLAYING; // Reset game state
    setupWorld(); // Re-initialize the world and player
    player.health = player.maxHealth; // Reset player health
    retryButton.style.display = 'none'; // Hide button
});

// Add event listener for the Generate New Map button
regenerateButton.addEventListener('click', () => {
    gameState = GAME_STATE.PLAYING; // Reset game state
    setupWorld(); // Re-initialize the world and reset game state
    player.health = player.maxHealth; // Reset player health
    retryButton.style.display = 'none'; // Hide button if clicked during death screen
    player.isMoving = false;
    player.animationFrame = 0;
    player.frameCount = 0;
});
