"use strict";

/* Survival systems adapted from the original Minecraft2D Python project. */
(function () {
  const TOOL_INFO = {
    wooden_pickaxe: { kind: "pickaxe", damage: 5, speed: 1.15, maxDurability: 59, targets: ["stone", "coal", "iron", "gold", "diamond"] },
    iron_pickaxe: { kind: "pickaxe", damage: 7, speed: 1.65, maxDurability: 250, targets: ["stone", "coal", "iron", "gold", "diamond"] },
    golden_pickaxe: { kind: "pickaxe", damage: 6, speed: 2.25, maxDurability: 32, targets: ["stone", "coal", "iron", "gold", "diamond"] },
    diamond_pickaxe: { kind: "pickaxe", damage: 8, speed: 1.95, maxDurability: 1561, targets: ["stone", "coal", "iron", "gold", "diamond"] },
    wooden_axe: { kind: "axe", damage: 6, speed: 1.35, maxDurability: 59, targets: ["wood", "leaves", "leaf"] },
    iron_axe: { kind: "axe", damage: 9, speed: 1.65, maxDurability: 250, targets: ["wood", "leaves", "leaf"] },
    golden_axe: { kind: "axe", damage: 10, speed: 2.25, maxDurability: 32, targets: ["wood", "leaves", "leaf"] },
    diamond_axe: { kind: "axe", damage: 10, speed: 1.95, maxDurability: 1561, targets: ["wood", "leaves", "leaf"] },
    wooden_sword: { kind: "sword", damage: 10, speed: 1, maxDurability: 59, targets: [] },
    iron_sword: { kind: "sword", damage: 15, speed: 1, maxDurability: 250, targets: [] },
    golden_sword: { kind: "sword", damage: 13, speed: 1, maxDurability: 32, targets: [] },
    diamond_sword: { kind: "sword", damage: 18, speed: 1, maxDurability: 1561, targets: [] }
  };

  const RECIPES = [
    { id: "crafting_table", name: "Crafting Table", output: "crafting_table", count: 1, ingredients: { wood: 4 }, requiresTable: false },
    { id: "planks", name: "Oak Planks", output: "planks", count: 4, ingredients: { wood: 1 }, requiresTable: true },
    { id: "sticks", name: "Stick", output: "stick", count: 4, ingredients: { planks: 2 }, requiresTable: true },
    { id: "furnace", name: "Furnace", output: "furnace", count: 1, ingredients: { stone: 8 }, requiresTable: true },
    { id: "wooden_pickaxe", name: "Wooden Pickaxe", output: "wooden_pickaxe", count: 1, ingredients: { planks: 3, stick: 2 }, requiresTable: true, unique: true },
    { id: "wooden_axe", name: "Wooden Axe", output: "wooden_axe", count: 1, ingredients: { planks: 3, stick: 2 }, requiresTable: true, unique: true },
    { id: "wooden_sword", name: "Wooden Sword", output: "wooden_sword", count: 1, ingredients: { planks: 2, stick: 1 }, requiresTable: true, unique: true },
    { id: "iron_pickaxe", name: "Iron Pickaxe", output: "iron_pickaxe", count: 1, ingredients: { iron_ingot: 3, stick: 2 }, requiresTable: true, unique: true },
    { id: "iron_axe", name: "Iron Axe", output: "iron_axe", count: 1, ingredients: { iron_ingot: 3, stick: 2 }, requiresTable: true, unique: true },
    { id: "iron_sword", name: "Iron Sword", output: "iron_sword", count: 1, ingredients: { iron_ingot: 2, stick: 1 }, requiresTable: true, unique: true },
    { id: "golden_pickaxe", name: "Golden Pickaxe", output: "golden_pickaxe", count: 1, ingredients: { gold_ingot: 3, stick: 2 }, requiresTable: true, unique: true },
    { id: "golden_axe", name: "Golden Axe", output: "golden_axe", count: 1, ingredients: { gold_ingot: 3, stick: 2 }, requiresTable: true, unique: true },
    { id: "golden_sword", name: "Golden Sword", output: "golden_sword", count: 1, ingredients: { gold_ingot: 2, stick: 1 }, requiresTable: true, unique: true },
    { id: "diamond_pickaxe", name: "Diamond Pickaxe", output: "diamond_pickaxe", count: 1, ingredients: { diamond: 3, stick: 2 }, requiresTable: true, unique: true },
    { id: "diamond_axe", name: "Diamond Axe", output: "diamond_axe", count: 1, ingredients: { diamond: 3, stick: 2 }, requiresTable: true, unique: true },
    { id: "diamond_sword", name: "Diamond Sword", output: "diamond_sword", count: 1, ingredients: { diamond: 2, stick: 1 }, requiresTable: true, unique: true }
  ];

  const ITEM_NAMES = {
    grass: "Grass Block", dirt: "Dirt", stone: "Stone", wood: "Wood", leaves: "Leaves", leaf: "Leaves",
    bedrock: "Bedrock", bone: "Bone", coal: "Coal", iron: "Iron Ore", gold: "Gold Ore", diamond: "Diamond",
    torch: "Torch", crafting_table: "Crafting Table", furnace: "Furnace", planks: "Oak Planks", stick: "Stick",
    iron_ingot: "Iron Ingot", gold_ingot: "Gold Ingot", meat: "Raw Beef", mutton: "Raw Mutton",
    cooked_beef: "Cooked Beef", cooked_mutton: "Cooked Mutton", wool: "Wool", apple: "Apple", zombie_meat: "Rotten Flesh",
    wooden_pickaxe: "Wooden Pickaxe", iron_pickaxe: "Iron Pickaxe", golden_pickaxe: "Golden Pickaxe", diamond_pickaxe: "Diamond Pickaxe",
    wooden_axe: "Wooden Axe", iron_axe: "Iron Axe", golden_axe: "Golden Axe", diamond_axe: "Diamond Axe",
    wooden_sword: "Wooden Sword", iron_sword: "Iron Sword", golden_sword: "Golden Sword", diamond_sword: "Diamond Sword"
  };
  const FOOD_VALUES = { meat: 18, mutton: 16, cooked_beef: 20, cooked_mutton: 20 };
  const SMELT_RECIPES = { iron: "iron_ingot", gold: "gold_ingot", meat: "cooked_beef", mutton: "cooked_mutton" };
  const BLOCK_HARDNESS = { grass: .5, dirt: .5, stone: 1.5, wood: 1, leaves: .3, coal: 2.5, iron: 3, gold: 3.5, diamond: 4, torch: .2, crafting_table: .8, furnace: 1.2, planks: .8 };

  class GameClock {
    constructor(minutes = 360) { this.minutes = ((Number(minutes) || 0) % 1440 + 1440) % 1440; }
    update(dt) { this.minutes = (this.minutes + Math.max(0, dt) * 1) % 1440; }
    get hour() { return Math.floor(this.minutes / 60); }
    get minute() { return Math.floor(this.minutes % 60); }
    get phase() { const m = this.minutes; return m >= 300 && m < 360 ? "sunrise" : m >= 360 && m < 1020 ? "day" : m >= 1020 && m < 1200 ? "sunset" : "night"; }
    get night() { return this.minutes < 300 || this.minutes >= 1200; }
    get light() {
      const m = this.minutes;
      if (m < 300 || m >= 1200) return .16;
      if (m < 360) return .16 + ((m - 300) / 60) * .84;
      if (m < 1020) return 1;
      return 1 - ((m - 1020) / 180) * .84;
    }
    get text() { return `${String(this.hour).padStart(2, "0")}:${String(this.minute).padStart(2, "0")}`; }
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  class MobSystem {
    constructor() { this.entities = []; this.arrows = []; this.spawnTimer = 0; this.wasNight = false; this.attackCooldown = 0; }
    clearHostiles() { this.entities = this.entities.filter(m => m.kind === "sheep" || m.kind === "cow"); this.arrows.length = 0; }
    count(kind) { return this.entities.filter(m => m.alive && m.kind === kind).length; }
    spawnOne(kind, player, world, BLOCK_SIZE, surfaceY) {
      const width = kind === "cow" ? 62 : kind === "sheep" ? 52 : kind === "zombie" ? 42 : 40;
      const height = kind === "cow" ? 56 : kind === "sheep" ? 50 : 62;
      for (let tries = 0; tries < 50; tries++) {
        const dir = Math.random() < .5 ? -1 : 1;
        const x = Math.round((player.x + dir * (260 + Math.random() * 420)) / BLOCK_SIZE) * BLOCK_SIZE;
        const ground = surfaceY(x);
        const y = ground - height;
        if (Math.abs(x - player.x) < 190) continue;
        const rect = { x, y, width, height };
        if (rectsOverlap(rect, { x: player.x - 120, y: player.y - 60, width: player.width + 240, height: player.height + 120 })) continue;
        let blocked = false;
        for (const b of world.blocksInRect(x, y, x + width, y + height)) {
          if (rectsOverlap(rect, { x: b.x, y: b.y, width: BLOCK_SIZE, height: BLOCK_SIZE })) { blocked = true; break; }
        }
        if (blocked) continue;
        this.entities.push({ kind, x, y, width, height, hp: kind === "sheep" ? 20 : kind === "cow" ? 25 : kind === "zombie" ? 30 : 24,
          maxHp: kind === "sheep" ? 20 : kind === "cow" ? 25 : kind === "zombie" ? 30 : 24,
          vx: 0, vy: 0, direction: Math.random() < .5 ? -1 : 1, timer: .8 + Math.random() * 2,
          cooldown: .5 + Math.random(), walk: Math.random() * 6, alive: true, burning: false, burnTimer: 0, flash: 0 });
        return true;
      }
      return false;
    }
    spawnForPhase(player, world, BLOCK_SIZE, surfaceY, night) {
      const counts = { sheep: 3, cow: 3, zombie: 3, skeleton: 2 };
      for (const kind of Object.keys(counts)) {
        if ((kind === "zombie" || kind === "skeleton") !== night) continue;
        let guard = counts[kind] - this.count(kind);
        while (guard-- > 0) if (!this.spawnOne(kind, player, world, BLOCK_SIZE, surfaceY)) break;
      }
    }
    update(dt, player, world, BLOCK_SIZE, surfaceY, night, onPlayerDamage, onDeath) {
      this.spawnTimer += dt;
      if (night !== this.wasNight || this.spawnTimer >= 4) {
        if (night !== this.wasNight && !night) this.clearHostiles();
        this.wasNight = night; this.spawnTimer = 0;
        this.spawnForPhase(player, world, BLOCK_SIZE, surfaceY, night);
      }
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      for (const m of this.entities) {
        if (!m.alive) continue;
        m.flash = Math.max(0, m.flash - dt); m.cooldown = Math.max(0, m.cooldown - dt); m.timer -= dt;
        if (m.kind === "zombie" || m.kind === "skeleton") {
          const dx = (player.x + player.width / 2) - (m.x + m.width / 2);
          const dy = (player.y + player.height / 2) - (m.y + m.height / 2);
          const distance = Math.hypot(dx, dy);
          const roof = world.getAt(Math.floor((m.x + m.width / 2) / BLOCK_SIZE) * BLOCK_SIZE, Math.floor((m.y - 4) / BLOCK_SIZE) * BLOCK_SIZE);
          m.burning = !night && !roof;
          if (m.burning) { m.burnTimer += dt; if (m.burnTimer >= .45) { m.hp -= 4; m.burnTimer = 0; m.flash = .1; } } else m.burnTimer = 0;
          if (m.kind === "zombie") {
            if (distance <= 48 && m.cooldown <= 0) { onPlayerDamage(3); m.cooldown = 1; }
            if (distance <= 260) m.direction = dx >= 0 ? 1 : -1;
            else if (m.timer <= 0) { m.direction = Math.random() < .45 ? 0 : (Math.random() < .5 ? -1 : 1); m.timer = .8 + Math.random() * 2; }
          } else {
            if (distance < 190) m.direction = dx >= 0 ? -1 : 1;
            else if (distance <= 360 && m.cooldown <= 0 && night) {
              this.arrows.push({ x: m.x + m.width / 2, y: m.y + 25, vx: Math.cos(Math.atan2(dy, dx)) * 330, vy: Math.sin(Math.atan2(dy, dx)) * 330, damage: 10, life: 3, alive: true });
              m.cooldown = 1.7;
            } else if (distance > 360 && m.timer <= 0) { m.direction = Math.random() < .4 ? 0 : (Math.random() < .5 ? -1 : 1); m.timer = 1 + Math.random() * 1.5; }
          }
        } else if (m.timer <= 0) { m.direction = Math.random() < .5 ? 0 : (Math.random() < .5 ? -1 : 1); m.timer = 1 + Math.random() * 2; }
        const speed = m.kind === "cow" ? 31.2 : m.kind === "sheep" ? 42 : m.kind === "zombie" ? 45 : 37.2;
        const nextX = m.x + m.direction * speed * dt;
        const groundedProbe = world.blocksInRect(nextX, m.y + m.height, nextX + m.width, m.y + m.height + BLOCK_SIZE + 2);
        const hasGround = groundedProbe.some(b => b.y >= m.y + m.height - 3 && b.x < nextX + m.width && b.x + BLOCK_SIZE > nextX);
        const blocked = world.blocksInRect(nextX, m.y, nextX + m.width, m.y + m.height).some(b => rectsOverlap({ x: nextX, y: m.y, width: m.width, height: m.height }, { x: b.x, y: b.y, width: BLOCK_SIZE, height: BLOCK_SIZE }));
        if (m.direction && !blocked && (m.kind === "zombie" || m.kind === "skeleton" || hasGround)) m.x = nextX;
        else if (blocked || !hasGround) m.direction *= -1;
        m.walk += dt * (m.direction ? 8 : 0);
        m.vy = Math.min(700, m.vy + 1400 * dt);
        const nextY = m.y + m.vy * dt;
        const feet = world.blocksInRect(m.x, m.y, m.x + m.width, nextY + m.height + 1);
        let landed = false;
        for (const b of feet) if (m.vy >= 0 && m.y + m.height <= b.y + 3 && nextY + m.height >= b.y && m.x < b.x + BLOCK_SIZE && m.x + m.width > b.x) { m.y = b.y - m.height; m.vy = 0; landed = true; break; }
        if (!landed) m.y = nextY;
        if (m.hp <= 0) { m.alive = false; onDeath(m); }
      }
      this.entities = this.entities.filter(m => m.alive || m.hp > 0);
      for (const a of this.arrows) {
        if (!a.alive) continue;
        a.life -= dt; a.x += a.vx * dt; a.y += a.vy * dt;
        const bx = Math.floor(a.x / BLOCK_SIZE) * BLOCK_SIZE, by = Math.floor(a.y / BLOCK_SIZE) * BLOCK_SIZE;
        if (world.getAt(bx, by) && world.isSolid(world.getAt(bx, by))) a.alive = false;
        if (a.x >= player.x && a.x <= player.x + player.width && a.y >= player.y && a.y <= player.y + player.height) { onPlayerDamage(a.damage || 10); a.alive = false; }
        if (a.life <= 0) a.alive = false;
      }
      this.arrows = this.arrows.filter(a => a.alive);
    }
    hitAt(x, y, player, damage, onDeath) {
      if (this.attackCooldown > 0) return false;
      const target = [...this.entities].reverse().find(m => m.alive && x >= m.x && x <= m.x + m.width && y >= m.y && y <= m.y + m.height);
      if (!target) return false;
      const distance = Math.hypot((target.x + target.width / 2) - (player.x + player.width / 2), (target.y + target.height / 2) - (player.y + player.height / 2));
      if (distance > 120) return false;
      target.hp -= damage; target.flash = .18; target.direction = target.x < player.x ? -1 : 1;
      this.attackCooldown = .25;
      if (target.hp <= 0) { target.alive = false; onDeath(target); }
      return true;
    }
    draw(ctx, camera, width, height) {
      for (const a of this.arrows) { const x = a.x - camera.x, y = a.y - camera.y; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(a.vy, a.vx)); ctx.fillStyle = "#765331"; ctx.fillRect(-10, -2, 20, 4); ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.fill(); ctx.restore(); }
      for (const m of this.entities) {
        if (!m.alive) continue;
        const x = Math.round(m.x - camera.x), y = Math.round(m.y - camera.y);
        if (x < -100 || x > width + 100 || y < -100 || y > height + 100) continue;
        ctx.save();
        const hurt = m.flash > 0; const f = m.direction >= 0 ? 1 : -1;
        if (m.kind === "sheep") {
          ctx.fillStyle = hurt ? "#f99" : "#eee"; ctx.fillRect(x + 5, y + 12, 40, 28); ctx.fillRect(x + 8, y + 8, 12, 12); ctx.fillRect(x + 24, y + 6, 14, 14); ctx.fillRect(x + 34, y + 14, 12, 14);
          ctx.fillStyle = "#444"; ctx.fillRect(x + (f > 0 ? 38 : -2), y + 16, 16, 18); ctx.fillRect(x + 11, y + 37, 6, 13); ctx.fillRect(x + 35, y + 37, 6, 13);
          ctx.fillStyle = "#111"; ctx.fillRect(x + (f > 0 ? 49 : 2), y + 21, 3, 3);
        } else if (m.kind === "cow") {
          ctx.fillStyle = hurt ? "#f99" : "#b47b4d"; ctx.fillRect(x + 5, y + 14, 48, 31); ctx.fillStyle = "#49352d"; ctx.fillRect(x + 13, y + 18, 11, 9); ctx.fillRect(x + 34, y + 30, 12, 8); ctx.fillRect(x + (f > 0 ? 42 : -2), y + 17, 20, 23); ctx.fillStyle = "#eee1c7"; ctx.fillRect(x + (f > 0 ? 47 : 2), y + 10, 5, 8); ctx.fillRect(x + (f > 0 ? 57 : 12), y + 10, 5, 8); ctx.fillStyle = "#33251f"; ctx.fillRect(x + 13, y + 43, 8, 13); ctx.fillRect(x + 42, y + 43, 8, 13);
        } else if (m.kind === "zombie") {
          ctx.fillStyle = hurt ? "#f66" : "#478f50"; ctx.fillRect(x + 7, y + 3, 28, 25); ctx.fillRect(x + 1, y + 26, 40, 23); ctx.fillStyle = "#285c9d"; ctx.fillRect(x + 8, y + 28, 26, 16); ctx.fillStyle = "#2b386f"; ctx.fillRect(x + 9, y + 47, 10, 15); ctx.fillRect(x + 25, y + 47, 10, 15); ctx.fillStyle = "#eee"; ctx.fillRect(x + (f > 0 ? 25 : 11), y + 14, 5, 5); ctx.fillStyle = "#b22"; ctx.fillRect(x + (f > 0 ? 27 : 12), y + 15, 3, 3);
        } else {
          ctx.fillStyle = hurt ? "#f99" : "#d8d5c8"; ctx.fillRect(x + 7, y + 3, 26, 26); ctx.fillRect(x + 11, y + 28, 19, 17); ctx.fillRect(x + 3, y + 28, 7, 22); ctx.fillRect(x + 32, y + 28, 7, 22); ctx.fillRect(x + 10, y + 44, 7, 18); ctx.fillRect(x + 25, y + 44, 7, 18); ctx.fillStyle = "#282828"; ctx.fillRect(x + 12, y + 13, 6, 6); ctx.fillRect(x + 23, y + 13, 6, 6); ctx.fillStyle = "#d44"; ctx.fillRect(x + 15, y + 15, 2, 2); ctx.fillRect(x + 26, y + 15, 2, 2);
        }
        if (m.burning) { ctx.fillStyle = "rgba(255,130,20,.8)"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 7 + i * 13, y + 9); ctx.lineTo(x + 10 + i * 13, y - 5 - (i % 2) * 5); ctx.lineTo(x + 15 + i * 13, y + 10); ctx.fill(); } }
        if (m.hp < m.maxHp) { ctx.fillStyle = "#222"; ctx.fillRect(x, y - 8, m.width, 4); ctx.fillStyle = "#e54b4b"; ctx.fillRect(x, y - 8, m.width * Math.max(0, m.hp / m.maxHp), 4); }
        ctx.restore();
      }
    }
    save() { return { entities: this.entities.filter(m => m.alive).map(m => ({ ...m })), arrows: this.arrows.map(a => ({ ...a })), wasNight: this.wasNight }; }
    load(data) { this.entities = Array.isArray(data?.entities) ? data.entities.filter(m => m && typeof m.kind === "string" && Number.isFinite(m.x) && Number.isFinite(m.y)).map(m => ({ ...m, alive: true })) : []; this.arrows = Array.isArray(data?.arrows) ? data.arrows.filter(a => Number.isFinite(a.x) && Number.isFinite(a.y)).map(a => ({ ...a, alive: true })) : []; this.wasNight = !!data?.wasNight; }
  }

  function furnaceState() { return { input: null, fuel: null, output: null, burnTime: 0, cookTime: 0, animationTime: 0 }; }
  function updateFurnace(state, dt) {
    state.animationTime += dt;
    if (state.input && state.input.count > 0 && SMELT_RECIPES[state.input.type]) {
      const result = SMELT_RECIPES[state.input.type];
      const outputOkay = !state.output || (state.output.type === result && state.output.count < 64);
      if (outputOkay) {
        if (state.burnTime <= 0 && state.fuel?.type === "coal" && state.fuel.count > 0) {
          state.fuel.count--; if (!state.fuel.count) state.fuel = null; state.burnTime = 8;
        }
        if (state.burnTime > 0) {
          state.burnTime = Math.max(0, state.burnTime - dt);
          state.cookTime += dt;
          if (state.cookTime >= 4) {
            state.cookTime -= 4; state.input.count--; if (!state.input.count) state.input = null;
            if (state.output) state.output.count++; else state.output = { type: result, count: 1 };
          }
        }
      }
    } else state.cookTime = 0;
    for (const slot of ["input", "fuel", "output"]) if (state[slot] && (!state[slot].count || state[slot].count <= 0)) state[slot] = null;
  }

  window.MinecraftSystems = { TOOL_INFO, RECIPES, ITEM_NAMES, FOOD_VALUES, SMELT_RECIPES, BLOCK_HARDNESS, GameClock, MobSystem, furnaceState, updateFurnace };
})();
