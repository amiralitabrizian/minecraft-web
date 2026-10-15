"use strict";

/* World/game rules live here; rendering and input live in script.js. */
(function () {
  const BLOCK_SIZE = 40;
  const SOLID_TYPES = new Set(["grass", "dirt", "stone", "wood", "leaves"]);
  const COLORS = {
    grass: { top: "#76d747", side: "#4d9d2a", detail: "#347d22" },
    dirt: { top: "#99613a", side: "#774323", detail: "#60371f" },
    stone: { top: "#a5a8ad", side: "#777b82", detail: "#5e6269" },
    wood: { top: "#bd8950", side: "#86572f", detail: "#684224" },
    leaves: { top: "#42ad43", side: "#287c30", detail: "#1c6325" },
    bedrock: { top: "#343943", side: "#20242b", detail: "#101318" }
  };

  class World {
    constructor() {
      this.blocks = [];
      this.blockMap = new Map();
      this.generate();
    }

    key(x, y) { return `${x},${y}`; }
    getAt(x, y) { return this.blockMap.get(this.key(x, y)) || null; }

    addBlock(x, y, type) {
      x = Math.round(x / BLOCK_SIZE) * BLOCK_SIZE;
      y = Math.round(y / BLOCK_SIZE) * BLOCK_SIZE;
      if (!SOLID_TYPES.has(type) && type !== "bedrock") return null;
      if (this.getAt(x, y)) return null;
      const block = { x, y, type };
      this.blocks.push(block);
      this.blockMap.set(this.key(x, y), block);
      return block;
    }

    removeBlock(block) {
      if (!block || block.type === "bedrock" || this.getAt(block.x, block.y) !== block) return false;
      this.blockMap.delete(this.key(block.x, block.y));
      const index = this.blocks.indexOf(block);
      if (index >= 0) this.blocks.splice(index, 1);
      return true;
    }

    generate() {
      this.blocks.length = 0;
      this.blockMap.clear();
      // A long, flat ground made from independent 40x40 blocks.
      for (let x = -20 * BLOCK_SIZE; x <= 100 * BLOCK_SIZE; x += BLOCK_SIZE) {
        this.addBlock(x, 0, "grass");
        this.addBlock(x, BLOCK_SIZE, "dirt");
        this.addBlock(x, BLOCK_SIZE * 2, "dirt");
        this.addBlock(x, BLOCK_SIZE * 3, "bedrock");
      }
      // A small, low platform to make block collisions easy to test.
      for (let x = 8; x <= 10; x++) this.addBlock(x * BLOCK_SIZE, -BLOCK_SIZE * 2, "stone");
      this.addBlock(14 * BLOCK_SIZE, -BLOCK_SIZE, "wood");
      this.addBlock(15 * BLOCK_SIZE, -BLOCK_SIZE, "leaves");
    }

    isSolid(block) { return !!block && SOLID_TYPES.has(block.type) || !!block && block.type === "bedrock"; }

    blocksInRect(left, top, right, bottom) {
      const result = [];
      const startX = Math.floor(left / BLOCK_SIZE) * BLOCK_SIZE;
      const endX = Math.floor(right / BLOCK_SIZE) * BLOCK_SIZE;
      const startY = Math.floor(top / BLOCK_SIZE) * BLOCK_SIZE;
      const endY = Math.floor(bottom / BLOCK_SIZE) * BLOCK_SIZE;
      for (let y = startY; y <= endY; y += BLOCK_SIZE) {
        for (let x = startX; x <= endX; x += BLOCK_SIZE) {
          const block = this.getAt(x, y);
          if (block && this.isSolid(block)) result.push(block);
        }
      }
      return result;
    }

    canPlace(x, y, player) {
      const bx = Math.round(x / BLOCK_SIZE) * BLOCK_SIZE;
      const by = Math.round(y / BLOCK_SIZE) * BLOCK_SIZE;
      if (this.getAt(bx, by)) return false;
      // Require the new block to touch at least one existing block.
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

  window.MinecraftWorld = { World, BLOCK_SIZE, SOLID_TYPES, COLORS, rectanglesOverlap };
})();
