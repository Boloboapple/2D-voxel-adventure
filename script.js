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

// Calculate canvas dimensions to fully contain the isometric map plus tall objects
// The width calculation needs to account for the entire diamond spread of the map
canvas.width = (MAP_WIDTH + MAP_HEIGHT) * (TILE_ISO_WIDTH / 2);
// The height needs to account for the total depth plus the height of objects above the ground
canvas.height = (MAP_WIDTH + MAP_HEIGHT) * (TILE_ISO_HEIGHT / 2) + MAX_OBJECT_HEIGHT_FROM_GROUND;

// Global offset for the entire isometric drawing on the canvas
// These values define where the (0,0) grid tile's top-middle point would appear if it were the *highest* and *left-most* tile.
// We then adjust this to center the entire map visually.
const globalDrawOffsetX = (canvas.width / 2) - ((MAP_WIDTH - MAP_HEIGHT) * TILE_ISO_WIDTH / 4); // Centers the map based on its overall diamond shape
const globalDrawOffsetY = MAX_OBJECT_HEIGHT_FROM_GROUND; // Pushes the map down to leave space for tall objects at the top

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

// --- Coordinate Conversion Function (Grid to Isometric Screen) ---
// Returns the screen coordinates of the TOP-MIDDLE point of the isometric tile
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
    ctx.strokeStyle = '#222';
    ctx.stroke();
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

    ctx.strokeStyle = '#222';
    ctx.stroke();
}


// --- Map Generation Function (Same as before) ---
function generateMap() {
    gameMap = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        gameMap[y] = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            gameMap[y][x] = TILE_TYPE_PLAINS;
        }
    }

    const lakeWidth = Math.floor(Math.random() * (MAP_WIDTH / 3)) + 3;
    const lakeHeight = Math.floor(Math.random() * (MAP_HEIGHT / 3)) + 3;
    const lakeStartX = Math.floor(Math.random() * (MAP_WIDTH - lakeWidth));
    const lakeStartY = Math.floor(Math.random() * (MAP_HEIGHT - lakeHeight));

    for (let y = lakeStartY; y < lakeStartY + lakeHeight; y++) {
        for (let x = lakeStartX; x < lakeStartX + lakeWidth; x++) {
            if (x >= 0 && x < MAP_
