const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const sandbox = { console, Math, Set, Map, Array, Number, String, Object, JSON };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const file of ['world.js', 'survival.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}
const { World, BLOCK_SIZE, CHUNK_SIZE } = sandbox.MinecraftWorld;
const S = sandbox.MinecraftSystems;

// Dead entities are removed even if an old positive hp value remains.
{
  const mobs = new S.MobSystem();
  mobs.entities.push({ kind: 'sheep', x: 0, y: 0, width: 50, height: 50, hp: 8, maxHp: 20, alive: false });
  const emptyWorld = { getAt: () => null, blocksInRect: () => [], isSolid: () => false };
  mobs.update(0, { x: 1000, y: 0, width: 32, height: 72 }, emptyWorld, BLOCK_SIZE, () => 0, false, () => {}, () => {});
  assert.strictEqual(mobs.entities.length, 0);
}

// Zombie contact damage is 2.
{
  const mobs = new S.MobSystem(); mobs.wasNight = true;
  mobs.entities.push({ kind: 'zombie', x: 0, y: 0, width: 42, height: 62, hp: 30, maxHp: 30, alive: true, cooldown: 0, timer: 9, direction: 1, walk: 0, vy: 0, flash: 0, burnTimer: 0 });
  let damage = 0;
  const emptyWorld = { getAt: () => null, blocksInRect: () => [], isSolid: () => false };
  mobs.update(0.01, { x: 30, y: 0, width: 32, height: 72 }, emptyWorld, BLOCK_SIZE, () => 0, true, n => damage += n, () => {});
  assert.strictEqual(damage, 2);
}

// Skeleton cadence is 3.2 seconds and arrow damage is 4.
{
  const mobs = new S.MobSystem(); mobs.wasNight = true;
  mobs.entities.push({ kind: 'skeleton', x: 0, y: 0, width: 40, height: 62, hp: 24, maxHp: 24, alive: true, cooldown: 0, timer: 9, direction: 1, walk: 0, vy: 0, flash: 0, burnTimer: 0 });
  const emptyWorld = { getAt: () => null, blocksInRect: () => [], isSolid: () => false };
  mobs.update(0.01, { x: 230, y: 0, width: 32, height: 72 }, emptyWorld, BLOCK_SIZE, () => 0, true, () => {}, () => {});
  assert.strictEqual(mobs.arrows.length, 1);
  assert.strictEqual(mobs.arrows[0].damage, 4);
  assert(Math.abs(mobs.entities[0].cooldown - 3.2) < 0.02);
}

// Swept projectile collision catches a block crossed between frames.
{
  const mobs = new S.MobSystem();
  mobs.arrows.push({ x: 0, y: 20, vx: 330, vy: 0, damage: 4, life: 3, alive: true });
  const block = { x: 40, y: 0 };
  const world = { getAt: () => null, blocksInRect: (l, t, r) => l <= 40 && r >= 40 ? [block] : [], isSolid: () => true };
  mobs.update(0.3, { x: 500, y: 500, width: 32, height: 72 }, world, BLOCK_SIZE, () => 0, false, () => {}, () => {});
  assert.strictEqual(mobs.arrows.length, 0);
}

// Swept arrow collision damages the player once when no block is in the way.
{
  const mobs = new S.MobSystem();
  mobs.arrows.push({ x: 0, y: 20, vx: 330, vy: 0, damage: 4, life: 3, alive: true });
  const emptyWorld = { getAt: () => null, blocksInRect: () => [], isSolid: () => false };
  let damage = 0;
  mobs.update(0.3, { x: 40, y: 0, width: 32, height: 72 }, emptyWorld, BLOCK_SIZE, () => 0, false, n => damage += n, () => {});
  assert.strictEqual(damage, 4);
  assert.strictEqual(mobs.arrows.length, 0);
}

// Furnace progress resets when the input item type changes; elapsed time can cook a stack.
{
  const f = S.furnaceState(); f.input = { type: 'iron', count: 1 }; f.fuel = { type: 'coal', count: 1 };
  S.updateFurnace(f, 2); assert.strictEqual(f.cookTime, 2);
  f.input = null; S.updateFurnace(f, 0.1); f.input = { type: 'gold', count: 1 }; S.updateFurnace(f, 0.1);
  assert(Math.abs(f.cookTime - 0.1) < 1e-8);
  const f2 = S.furnaceState(); f2.input = { type: 'iron', count: 2 }; f2.fuel = { type: 'coal', count: 1 };
  S.updateFurnace(f2, 8); assert.strictEqual(f2.output.count, 2); assert.strictEqual(f2.input, null);
}

// Tree pieces near chunk edges are deterministic after unload/reload; removed leaves stay removed.
{
  const world = new World();
  const snapshot = chunk => world.blocks.filter(b => Math.floor(b.x / CHUNK_SIZE) * CHUNK_SIZE === chunk).map(b => `${b.x},${b.y}:${b.type}`).sort().join('|');
  const baseline = snapshot(0);
  world.generateAround(1000000); world.generateAround(0);
  assert.strictEqual(snapshot(0), baseline);
  const edgeLeaves = world.blocks.find(b => b.type === 'leaves' && (Math.abs(b.x - CHUNK_SIZE) < BLOCK_SIZE * 3 || Math.abs(b.x) < BLOCK_SIZE * 3));
  assert(edgeLeaves, 'expected tree leaves near a chunk boundary');
  const x = edgeLeaves.x, y = edgeLeaves.y;
  assert(world.removeBlock(edgeLeaves));
  world.generateAround(1000000); world.generateAround(x);
  assert.strictEqual(world.getAt(x, y), null);
  assert(world.loadedChunks.size <= 8);
}

// Static regression checks for script-level changes.
{
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert(script.includes('function validateSaveData(data)'));
  assert(script.includes('let hiddenSince = document.hidden ? Date.now() : null'));
  assert(script.includes('function dispatchGameCommand(command, source = "keyboard")'));
  assert(script.includes('sort((a, b) => a.y - b.y)[0]'));
  assert(!/localStorage\.(getItem|setItem|removeItem)/.test(script.replace(/function storage(?:Get|Set|Remove)[\s\S]*?\n  }/g, '')));
  assert(html.includes('منتور: منصوره رنجبریان'));
  assert(sw.includes('minecraft-web-v31'));
}

console.log('PASS: mob cleanup; reduced zombie damage; slower/lower-damage skeleton; swept arrow/block collision; furnace input reset and multi-cook; chunk-edge tree regeneration/deletion; loaded-chunk bound; script/save/time/input/menu regression checks.');
