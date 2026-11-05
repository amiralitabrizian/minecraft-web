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
      // Projectile silhouettes.
      for (const a of this.arrows) {
        const x = a.x - camera.x, y = a.y - camera.y;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(a.vy, a.vx));
        ctx.fillStyle = "#79512e"; ctx.fillRect(-11, -1.5, 19, 3);
        ctx.fillStyle = "#dfe5ea"; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(3, -4); ctx.lineTo(4, 0); ctx.lineTo(3, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      for (const m of this.entities) {
        if (!m.alive) continue;
        const sx = Math.round(m.x - camera.x), sy = Math.round(m.y - camera.y);
        if (sx < -100 || sx > width + 100 || sy < -100 || sy > height + 100) continue;
        const facing = m.direction >= 0 ? 1 : -1;
        const step = m.direction ? Math.sin(m.walk) * 2.5 : 0;
        ctx.save();
        if (m.kind === "sheep" || m.kind === "cow") {
          ctx.translate(sx + (facing < 0 ? m.width : 0), sy);
          ctx.scale(facing, 1);
          // Soft ground shadow and animated legs.
          ctx.fillStyle = "rgba(12,18,20,.28)";
          ctx.beginPath(); ctx.ellipse(m.width * .5, m.height - 3, m.width * .39, 3.5, 0, 0, Math.PI * 2); ctx.fill();
          const legColor = m.kind === "sheep" ? "#494a4b" : "#49352b";
          for (const [lx, swing] of [[12, step], [m.width - 18, -step]]) {
            ctx.fillStyle = legColor; ctx.fillRect(lx, m.height - 17 + swing, 7, 14 - swing * .25);
            ctx.fillStyle = "#24272a"; ctx.fillRect(lx - 1, m.height - 5 + swing, 9, 4);
            ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(lx + 1, m.height - 15 + swing, 2, 7);
          }
          if (m.kind === "sheep") {
            // Woolly body: layered rounded puffs with shaded undersides.
            ctx.fillStyle = "#aeb4b5"; ctx.beginPath(); ctx.ellipse(25, 29, 21, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#f3f3ed"; ctx.beginPath(); ctx.ellipse(24, 25, 20, 13, 0, 0, Math.PI * 2); ctx.fill();
            for (const puff of [[9,23,8],[17,16,8],[27,15,9],[37,21,8],[13,31,8],[27,31,9],[39,30,7]]) {
              ctx.fillStyle = "#d6d9d5"; ctx.beginPath(); ctx.arc(puff[0], puff[1] + 1, puff[2], 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = "#fffefa"; ctx.beginPath(); ctx.arc(puff[0] - 1, puff[1] - 1, puff[2] - .8, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(puff[0] - 3, puff[1] - 4, Math.max(1.5, puff[2] * .28), 0, Math.PI * 2); ctx.fill();
            }
            // Head, ears, muzzle and face.
            ctx.fillStyle = "#3b3b3d"; ctx.beginPath(); ctx.ellipse(43, 27, 8, 11, -.12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#69696a"; ctx.beginPath(); ctx.ellipse(43, 33, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#8d8d8c"; ctx.beginPath(); ctx.ellipse(36, 20, 5, 2.5, -.35, 0, Math.PI * 2); ctx.ellipse(48, 20, 5, 2.5, .35, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#f8f4e8"; ctx.beginPath(); ctx.arc(45, 25, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#17191b"; ctx.beginPath(); ctx.arc(45.8, 25, 1, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#29292b"; ctx.fillRect(41, 36, 4, 1.5);
            ctx.fillStyle = "#c5c9c5"; ctx.fillRect(3, 21, 4, 7);
          } else {
            // Cow: warm brown coat, irregular white patches, proper head and horns.
            ctx.fillStyle = "#533a2b"; ctx.fillRect(4, 16, 48, 28);
            ctx.fillStyle = "#a66f48"; ctx.fillRect(6, 15, 45, 26);
            ctx.fillStyle = "#f0e8d5";
            ctx.beginPath(); ctx.moveTo(10,18); ctx.lineTo(21,16); ctx.lineTo(25,22); ctx.lineTo(18,29); ctx.lineTo(9,27); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(34,29); ctx.lineTo(43,24); ctx.lineTo(50,29); ctx.lineTo(48,38); ctx.lineTo(38,39); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#795039"; ctx.fillRect(7, 38, 12, 3);
            // Neck / head.
            ctx.fillStyle = "#583b2c"; ctx.beginPath(); ctx.ellipse(49, 26, 10, 12, .1, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#b77d50"; ctx.beginPath(); ctx.ellipse(50, 27, 8, 10, .1, 0, Math.PI * 2); ctx.fill();
            // Ears and horns.
            ctx.fillStyle = "#76503b"; ctx.beginPath(); ctx.ellipse(42, 19, 7, 3, -.35, 0, Math.PI * 2); ctx.ellipse(56, 19, 7, 3, .35, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#f4e7c4"; ctx.beginPath(); ctx.moveTo(43,18); ctx.lineTo(40,8); ctx.lineTo(47,14); ctx.closePath(); ctx.moveTo(54,15); ctx.lineTo(58,7); ctx.lineTo(59,18); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#fff4e4"; ctx.beginPath(); ctx.arc(53, 25, 2.1, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#201b19"; ctx.beginPath(); ctx.arc(53.8, 25, 1, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#dfaaa0"; ctx.beginPath(); ctx.ellipse(56, 34, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#754b49"; ctx.beginPath(); ctx.arc(54, 34, 1, 0, Math.PI * 2); ctx.arc(59, 34, 1, 0, Math.PI * 2); ctx.fill();
            // Tail with a little dark tuft.
            ctx.strokeStyle = "#5b3e2e"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(7, 23); ctx.quadraticCurveTo(0, 31, 4, 36); ctx.stroke();
            ctx.fillStyle = "#3b2b24"; ctx.beginPath(); ctx.ellipse(4, 37, 3, 4, .3, 0, Math.PI * 2); ctx.fill();
          }
          if (m.flash > 0) { ctx.fillStyle = `rgba(255,45,45,${Math.min(.42, m.flash * 2.2)})`; ctx.fillRect(0, 5, m.width, m.height - 7); }
        } else {
          // Hostile mobs remain pixel-art, with clearer silhouettes and facial contrast.
          if (m.kind === "zombie") {
            ctx.fillStyle = "#1e5639"; ctx.fillRect(sx + 7, sy + 2, 29, 26);
            ctx.fillStyle = m.flash > 0 ? "#f66" : "#4d9c60"; ctx.fillRect(sx + 9, sy + 4, 25, 22);
            ctx.fillStyle = "#234f9a"; ctx.fillRect(sx + 2, sy + 27, 39, 22); ctx.fillStyle = "#3271b9"; ctx.fillRect(sx + 8, sy + 29, 25, 16);
            ctx.fillStyle = "#275b42"; ctx.fillRect(sx, sy + 28, 8, 22); ctx.fillRect(sx + 35, sy + 28, 8, 22);
            ctx.fillStyle = "#263b76"; ctx.fillRect(sx + 8, sy + 48, 10, 14); ctx.fillRect(sx + 25, sy + 48, 10, 14);
            ctx.fillStyle = "#f4f1dd"; ctx.fillRect(sx + (facing > 0 ? 24 : 12), sy + 13, 6, 5);
            ctx.fillStyle = "#b52f35"; ctx.fillRect(sx + (facing > 0 ? 27 : 12), sy + 14, 3, 3);
          } else {
            ctx.fillStyle = m.flash > 0 ? "#fbb" : "#d8d8ca";
            ctx.fillRect(sx + 7, sy + 3, 26, 25); ctx.fillRect(sx + 11, sy + 28, 19, 17);
            ctx.fillRect(sx + 3, sy + 28, 7, 22); ctx.fillRect(sx + 32, sy + 28, 7, 22);
            ctx.fillRect(sx + 10, sy + 44, 7, 18); ctx.fillRect(sx + 25, sy + 44, 7, 18);
            ctx.fillStyle = "#77786f"; ctx.fillRect(sx + 8, sy + 4, 24, 4);
            ctx.fillStyle = "#252525"; ctx.fillRect(sx + 12, sy + 13, 6, 6); ctx.fillRect(sx + 23, sy + 13, 6, 6);
            ctx.fillStyle = "#bd3434"; ctx.fillRect(sx + 14, sy + 15, 3, 3); ctx.fillRect(sx + 25, sy + 15, 3, 3);
          }
          if (m.burning) {
            ctx.fillStyle = "rgba(255,130,20,.82)";
            for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sx + 7 + i * 13, sy + 9); ctx.lineTo(sx + 10 + i * 13, sy - 5 - (i % 2) * 5); ctx.lineTo(sx + 15 + i * 13, sy + 10); ctx.fill(); }
          }
        }
        if (m.hp < m.maxHp) {
          ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(sx, sy - 9, m.width, 5);
          ctx.fillStyle = "#e74646"; ctx.fillRect(sx + 1, sy - 8, (m.width - 2) * Math.max(0, m.hp / m.maxHp), 3);
        }
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
