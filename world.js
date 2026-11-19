 "use strict";

/* Stage 1: deterministic chunk terrain and block interaction primitives. */
(function () {
  const BLOCK_SIZE = 40;
  const CHUNK_BLOCKS = 20;
  const CHUNK_SIZE = BLOCK_SIZE * CHUNK_BLOCKS;
  const SEED = 12345;
  const WORLD_BOTTOM = 1600;
  const SOLID_TYPES = new Set(["grass", "dirt", "stone", "wood", "leaves", "leaf", "bedrock", "coal", "iron", "gold", "diamond", "planks", "crafting_table", "furnace"]);
  const ALLOWED_TYPES = new Set([...SOLID_TYPES, "torch"]);
  const COLORS = {
    grass: { top: "#76d747", side: "#4d9d2a", detail: "#347d22" },
    dirt: { top: "#99613a", side: "#774323", detail: "#60371f" },
    stone: { top: "#a5a8ad", side: "#777b82", detail: "#5e6269" },
    wood: { top: "#bd8950", side: "#86572f", detail: "#684224" },
    leaves: { top: "#42ad43", side: "#287c30", detail: "#1c6325" },
    leaf: { top: "#42ad43", side: "#287c30", detail: "#1c6325" },
    bedrock: { top: "#343943", side: "#20242b", detail: "#101318" },
    coal: { top: "#55585d", side: "#34373b", detail: "#17191c" },
    iron: { top: "#c6a98c", side: "#8c7b6c", detail: "#dfcbb7" },
    gold: { top: "#f3d34a", side: "#b68a16", detail: "#fff08a" },
    diamond: { top: "#7ce5de", side: "#268f95", detail: "#c9ffff" },
    planks: { top: "#c9955e", side: "#97613a", detail: "#6e472d" },
    crafting_table: { top: "#b77b43", side: "#81512e", detail: "#d7ad70" },
    furnace: { top: "#8b8d91", side: "#55585e", detail: "#34383f" },
    torch: { top: "#ffe08a", side: "#a56a28", detail: "#ffb52e" }
  };

  function hashInt(n) {
    let x = (n | 0) + SEED;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    return (x ^ (x >>> 16)) >>> 0;
  }
  function seededRandom(n) {
    let state = hashInt(n) || 1;
    return function () {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }
  function surfaceY(blockX) {
    const waveA = Math.sin(blockX / 520) * 85;
    const waveB = Math.sin(blockX / 210) * 30;
    const r = seededRandom(Math.floor(blockX / BLOCK_SIZE) * 17)();
    const detail = r < 1 / 7 ? -BLOCK_SIZE : r > 6 / 7 ? BLOCK_SIZE : 0;
    const raw = Math.max(200, Math.min(440, 320 + waveA + waveB + detail));
    return Math.floor(raw / BLOCK_SIZE) * BLOCK_SIZE;
  }

  class World {
    constructor() {
      this.blocks = [];
      this.blockMap = new Map();
      this.loadedChunks = new Set();
      this.chunkOverrides = new Map();
      // World generation is deferred until the saved world is checked.
      // This avoids generating a temporary world before loading a save.
    }
    key(x, y) { return `${x},${y}`; }
    getAt(x, y) { return this.blockMap.get(this.key(x, y)) || null; }
    addBlock(x, y, type, recordChange = true) {
      x = Math.round(x / BLOCK_SIZE) * BLOCK_SIZE;
      y = Math.round(y / BLOCK_SIZE) * BLOCK_SIZE;
      if (!ALLOWED_TYPES.has(type) || this.getAt(x, y)) return null;
      const block = { x, y, type };
      this.blocks.push(block);
      this.blockMap.set(this.key(x, y), block);
      if (recordChange) this.setChunkOverride(x, y, type);
      return block;
    }
    chunkStart(x) { return Math.floor(x / CHUNK_SIZE) * CHUNK_SIZE; }
    setChunkOverride(x, y, type) {
      const start = this.chunkStart(x);
      if (!this.chunkOverrides.has(start)) this.chunkOverrides.set(start, new Map());
      this.chunkOverrides.get(start).set(this.key(x, y), type);
    }
    removeBlock(block) {
      if (!block || block.type === "bedrock" || this.getAt(block.x, block.y) !== block) return false;
      this.blockMap.delete(this.key(block.x, block.y));
      this.setChunkOverride(block.x, block.y, null);
      const index = this.blocks.indexOf(block);
      if (index >= 0) this.blocks.splice(index, 1);
      return true;
    }
    generateChunk(startX) {
      if (this.loadedChunks.has(startX)) return;
      this.loadedChunks.add(startX);
      for (let x = startX; x < startX + CHUNK_SIZE; x += BLOCK_SIZE) {
        const groundY = surfaceY(x);
        this.addBlock(x, groundY, "grass", false);
        // A few dirt layers, followed by stone and a bottom bedrock layer.
        for (let layer = 1; layer <= 4; layer++) this.addBlock(x, groundY + layer * BLOCK_SIZE, "dirt", false);
        for (let y = groundY + 5 * BLOCK_SIZE; y < WORLD_BOTTOM - BLOCK_SIZE; y += BLOCK_SIZE) {
          const depth = (y - groundY) / BLOCK_SIZE;
          // Broad deterministic cave tunnels; the first few dirt/stone layers stay intact.
          const caveNoise = Math.sin(x * 0.012 + Math.sin(y * 0.013) * 2.1) *
            Math.cos(y * 0.009 + Math.sin(x * 0.007) * 1.8);
          if (depth > 4 && caveNoise > 0.76) continue;
          const oreRoll = seededRandom(Math.floor(x / BLOCK_SIZE) * 73856093 ^ Math.floor(y / BLOCK_SIZE) * 19349663)();
          let blockType = "stone";
          if (depth >= 5 && oreRoll < 0.030) blockType = "coal";
          if (depth >= 9 && oreRoll > 0.965 && oreRoll < 0.980) blockType = "iron";
          if (depth >= 16 && oreRoll > 0.991 && oreRoll < 0.997) blockType = "gold";
          if (depth >= 24 && oreRoll > 0.9985) blockType = "diamond";
          this.addBlock(x, y, blockType, false);
        }
        this.addBlock(x, WORLD_BOTTOM - BLOCK_SIZE, "bedrock", false);

        // Deterministic, sparse trees inspired by the original project's chunk terrain.
        const treeRng = seededRandom(Math.floor(x / BLOCK_SIZE) * 7919 + 777777);
        if (treeRng() < 0.075) {
          const trunkHeight = 4 + Math.floor(treeRng() * 3);
          for (let i = 0; i < trunkHeight; i++) this.addBlock(x, groundY - (i + 1) * BLOCK_SIZE, "wood", false);
          const canopyY = groundY - (trunkHeight + 1) * BLOCK_SIZE;
          for (let row = -2; row <= 2; row++) {
            const width = 3 - Math.abs(row);
            for (let offset = -width; offset <= width; offset++) {
              if (treeRng() < (Math.abs(offset) < width ? 0.92 : 0.55)) {
                this.addBlock(x + offset * BLOCK_SIZE, canopyY + row * BLOCK_SIZE, "leaves", false);
              }
            }
          }
          this.addBlock(x, canopyY - BLOCK_SIZE, "leaves", false);
        }
      }
      const overrides = this.chunkOverrides.get(startX);
      if (overrides && overrides.size) {
        // Apply all saved edits in linear time. The old per-entry indexOf/splice
        // made loading large saves progressively slower (O(blocks × edits)).
        const changedKeys = new Set(overrides.keys());
        for (const key of changedKeys) this.blockMap.delete(key);

        let write = 0;
        for (let read = 0; read < this.blocks.length; read++) {
          const block = this.blocks[read];
          if (!changedKeys.has(this.key(block.x, block.y))) {
            this.blocks[write++] = block;
          }
        }
        this.blocks.length = write;

        for (const [key, type] of overrides) {
          if (!type) continue;
          const comma = key.indexOf(",");
          const ox = Number(key.slice(0, comma));
          const oy = Number(key.slice(comma + 1));
          if (Number.isFinite(ox) && Number.isFinite(oy)) this.addBlock(ox, oy, type, false);
        }
      }
    }
    generateAround(worldX) {
      const center = this.chunkStart(worldX);
      const required = new Set();
      // Five nearby chunks keep world generation and memory use lighter on phones.
      for (let offset = -2; offset <= 2; offset++) {
        const chunk = center + offset * CHUNK_SIZE;
        required.add(chunk);
        this.generateChunk(chunk);
      }
      // Unload distant chunks with one compacting pass instead of repeatedly
      // splicing the blocks array (which can become expensive on large worlds).
      const unload = new Set();
      for (const chunk of this.loadedChunks) {
        if (!required.has(chunk)) {
          unload.add(chunk);
          this.loadedChunks.delete(chunk);
        }
      }
      if (unload.size) {
        let write = 0;
        for (let read = 0; read < this.blocks.length; read++) {
          const block = this.blocks[read];
          if (unload.has(this.chunkStart(block.x))) {
            this.blockMap.delete(this.key(block.x, block.y));
          } else {
            this.blocks[write++] = block;
          }
        }
        this.blocks.length = write;
      }
    }
    exportChanges() {
      return [...this.chunkOverrides.entries()].map(([chunk, entries]) => [chunk, [...entries.entries()]]);
    }
    importChanges(data, aroundX = 0) {
      this.blocks.length = 0;
      this.blockMap.clear();
      this.loadedChunks.clear();
      this.chunkOverrides.clear();
      if (Array.isArray(data)) {
        for (const row of data) {
          if (!Array.isArray(row) || !Number.isFinite(Number(row[0])) || !Array.isArray(row[1])) continue;
          const entries = new Map();
          for (const entry of row[1]) {
            if (!Array.isArray(entry) || typeof entry[0] !== "string") continue;
            const type = entry[1];
            if (type !== null && !ALLOWED_TYPES.has(type)) continue;
            entries.set(entry[0], type);
          }
          this.chunkOverrides.set(Number(row[0]), entries);
        }
      }
      this.generateAround(aroundX);
    }
    blocksInRect(left, top, right, bottom, includeNonSolid = false) {
      const result = [];
      const startX = Math.floor(left / BLOCK_SIZE) * BLOCK_SIZE;
      const endX = Math.floor(right / BLOCK_SIZE) * BLOCK_SIZE;
      const startY = Math.floor(top / BLOCK_SIZE) * BLOCK_SIZE;
      const endY = Math.floor(bottom / BLOCK_SIZE) * BLOCK_SIZE;
      for (let y = startY; y <= endY; y += BLOCK_SIZE) {
        for (let x = startX; x <= endX; x += BLOCK_SIZE) {
          const block = this.getAt(x, y);
          // Physics queries stay solid-only. Rendering can explicitly include
          // non-solid objects such as torches, which must remain visible.
          if (block && (includeNonSolid || this.isSolid(block))) result.push(block);
        }
      }
      return result;
    }
    isSolid(block) { return !!block && SOLID_TYPES.has(block.type); }
    canPlace(x, y, player) {
      const bx = Math.round(x / BLOCK_SIZE) * BLOCK_SIZE;
      const by = Math.round(y / BLOCK_SIZE) * BLOCK_SIZE;
      if (this.getAt(bx, by)) return false;
      const hasNeighbor = [[BLOCK_SIZE,0],[-BLOCK_SIZE,0],[0,BLOCK_SIZE],[0,-BLOCK_SIZE]]
        .some(([dx,dy]) => this.getAt(bx + dx, by + dy));
      if (!hasNeighbor) return false;
      if (player && rectanglesOverlap(bx, by, BLOCK_SIZE, BLOCK_SIZE, player.x, player.y, player.width, player.height)) return false;
      return { x: bx, y: by };
    }
  }

  function rectanglesOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  window.MinecraftWorld = { World, BLOCK_SIZE, CHUNK_SIZE, COLORS, SOLID_TYPES, ALLOWED_TYPES, rectanglesOverlap, surfaceY };
})();
