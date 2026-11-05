"use strict";

(() => {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const gameShell = document.getElementById("game-shell");
  const statusText = document.getElementById("debug-status");
  const rotateScreen = document.getElementById("rotate-screen");
  const tryLandscapeButton = document.getElementById("try-landscape");
  const leftButton = document.getElementById("left-button");
  const rightButton = document.getElementById("right-button");
  const jumpButton = document.getElementById("jump-button");
  const breakButton = document.getElementById("break-button");
  const placeButton = document.getElementById("place-button");
  const touchBreakButton = document.getElementById("touch-break-button");
  const touchPlaceButton = document.getElementById("touch-place-button");
  const blockTypeSelect = document.getElementById("block-type");
  const hotbarElement = document.getElementById("hotbar");
  const inventoryElement = document.getElementById("inventory-panel");
  const inventoryToggle = document.getElementById("inventory-toggle");
  const craftingToggle = document.getElementById("crafting-toggle");
  const craftingPanel = document.getElementById("crafting-panel");
  const furnacePanel = document.getElementById("furnace-panel");
  const vitalsElement = document.getElementById("vitals-hud");
  const clockElement = document.getElementById("clock-hud");
  const deathPanel = document.getElementById("death-panel");
  const mainMenuPanel = document.getElementById("main-menu-panel");
  const saveButton = document.getElementById("save-button");
  const loadButton = document.getElementById("load-button");
  const newGameButton = document.getElementById("new-game-button");
  const touchAttackButton = document.getElementById("touch-attack-button");
  const touchEatButton = document.getElementById("touch-eat-button");
  const touchInteractButton = document.getElementById("touch-interact-button");

  if (!canvas || !ctx || !window.MinecraftWorld || !window.MinecraftSystems) throw new Error("Game setup failed. Check index.html, world.js and survival.js.");

  const { World, BLOCK_SIZE, COLORS, rectanglesOverlap, surfaceY } = window.MinecraftWorld;
  const Systems = window.MinecraftSystems;
  const { TOOL_INFO, RECIPES, ITEM_NAMES, FOOD_VALUES, SMELT_RECIPES, BLOCK_HARDNESS, GameClock, MobSystem, furnaceState, updateFurnace } = Systems;
  const world = new World();
  const player = { x: 80, y: 0, width: 32, height: 72, vx: 0, vy: 0, onGround: false,
    health: 20, maxHealth: 20, hunger: 20, maxHunger: 20, hungerTimer: 0, starvationTimer: 0,
    regenTimer: 0, fallStartY: null, alive: true, damageTimer: 0 };
  const camera = { x: 0, y: 0 };
  let cameraInitialized = false;
  const keys = { left: false, right: false, sprint: false, sprintLeft: false, sprintRight: false };
  const touch = { left: false, right: false, sprintLeft: false, sprintRight: false };
  let lastLeftPress = 0, lastRightPress = 0;
  let selectedBlock = null;
  let hoveredBlock = null;
  let pointerWorld = null;
  let lastTime = 0;
  let worldReady = false;
  let dpr = 1;
  let breakState = null;
  const drops = [];
  const clock = new GameClock(360);
  const mobs = new MobSystem();
  const furnaces = new Map();
  let activeStationKey = null;
  let activeStationType = null;
  let activeCraftingRecipe = 0;
  let attackCooldown = 0;
  let eatCooldown = 0;
  let autoSaveTimer = 0;
  let hudRefreshTimer = 0;
  let deathShown = false;
  const inventory = Array(36).fill(null);
  inventory[0] = { type: "torch", count: 16 };
  let selectedSlot = 0;
  let inventoryOpen = false;
  let walkTime = 0;
  let dragSourceIndex = null;
  let dragStartPoint = null;
  let pendingTouchMoveIndex = null;
  let suppressSlotClick = false;
  const STACK_LIMIT = 64;
  const PLACEABLE_TYPES = new Set(["grass", "dirt", "stone", "wood", "leaves", "leaf", "coal", "iron", "gold", "diamond", "torch", "crafting_table", "furnace", "planks"]);
  const NON_DROPPABLE_WITHOUT_PICKAXE = new Set(["stone", "coal", "iron", "gold", "diamond"]);
  const MAX_INTERACT_DISTANCE = BLOCK_SIZE * 4.5;
  const MAX_PLACE_DISTANCE = BLOCK_SIZE * 3;
  const FALL_DAMAGE_THRESHOLD = BLOCK_SIZE * 4;
  function selectedStack() { return inventory[selectedSlot]; }
  function selectedToolInfo() { const stack = selectedStack(); return stack ? TOOL_INFO[stack.type] || null : null; }
  function breakDurationFor(block) {
    const hardness = BLOCK_HARDNESS[block && block.type] ?? .8;
    const tool = selectedToolInfo();
    const selected = selectedStack();
    const effective = !!(tool && tool.targets.includes(block && block.type) && (!selected || selected.durability !== 0));
    return effective ? Math.max(120, hardness * 1000 / tool.speed) : hardness * 1800;
  }

  // Convert the original Pygame per-frame values (speed=2, gravity=.4, jump=-6.3 at 60 FPS) to per-second physics.
  const MOVE_SPEED = 120;
  const GRAVITY = 1440;
  const JUMP_SPEED = 378;
  function setStatus(message) { statusText.textContent = message; }
  function playerRect() { return { x: player.x, y: player.y, width: player.width, height: player.height }; }
  function centerDistance(block) {
    const dx = player.x + player.width / 2 - (block.x + BLOCK_SIZE / 2);
    const dy = player.y + player.height / 2 - (block.y + BLOCK_SIZE / 2);
    return Math.hypot(dx, dy);
  }
  function isInReach(block) {
    return !!block && centerDistance(block) <= MAX_INTERACT_DISTANCE;
  }
  function isWithinPlaceReach(block) {
    return !!block && centerDistance(block) <= MAX_PLACE_DISTANCE;
  }

  function resizeCanvas() {
    const rect = gameShell.getBoundingClientRect();
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    keepPlayerInWorld();
    updateCamera(true);
    if (worldReady) render();
  }

  function updateDeviceMode() {
    const touchDevice = navigator.maxTouchPoints > 0 || "ontouchstart" in window ||
      matchMedia("(pointer: coarse)").matches || matchMedia("(hover: none)").matches;
    document.body.classList.toggle("touch-device", touchDevice);
    const portrait = matchMedia("(orientation: portrait)").matches || innerHeight > innerWidth;
    const needsLandscape = touchDevice && portrait;
    document.body.classList.toggle("needs-landscape", needsLandscape);
    if (needsLandscape) {
      setStatus("برای شروع گوشی را افقی کنید");
      releaseInputs();
    } else {
      setStatus("بازی آماده است — بلاک‌ها را لمس یا کلیک کن");
    }
    console.log("[DEVICE]", { touchDevice, portrait, needsLandscape, width: innerWidth, height: innerHeight });
  }

  async function requestLandscape() {
    try {
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
    } catch (error) {
      console.info("Landscape lock is not supported until the site is installed or user-initiated:", error.message);
    }
    updateDeviceMode();
  }

  function releaseInputs() {
    keys.left = keys.right = keys.sprint = keys.sprintLeft = keys.sprintRight = touch.left = touch.right = touch.sprintLeft = touch.sprintRight = false;
    cancelBreaking();
  }

  function keepPlayerInWorld() {
    const viewWidth = gameShell.clientWidth;
    // Keep the player in the visible camera area, while the camera can follow along the world.
    if (!Number.isFinite(player.x)) player.x = 80;
    player.x = Math.max(-BLOCK_SIZE * 100000, Math.min(player.x, BLOCK_SIZE * 100000));
    if (viewWidth <= 0) player.x = 80;
  }

  function updateCamera(snap = false, dt = 1 / 60) {
    const w = gameShell.clientWidth;
    const h = gameShell.clientHeight;
    // Follow the player near screen center, with smoothing like the original Camera class.
    const targetX = player.x + player.width / 2 - w * 0.5;
    const targetY = player.y + player.height / 2 - h * 0.5;
    if (!cameraInitialized || snap) {
      camera.x = targetX;
      camera.y = targetY;
      cameraInitialized = true;
    } else {
      const follow = 1 - Math.pow(1 - 0.15, Math.max(0, dt) * 60);
      camera.x += (targetX - camera.x) * follow;
      camera.y += (targetY - camera.y) * follow;
    }
  }

  function jump(source) {
    if (!player.alive || anyPanelOpen() || document.body.classList.contains("needs-landscape")) return;
    if (player.onGround) {
      player.vy = -JUMP_SPEED;
      player.onGround = false;
      setStatus("پرش!");
      console.log("[JUMP]", source);
    }
  }

  function keyDown(event) {
    const code = event.code;
    const key = event.key.toLowerCase();
    if (code === "KeyA" || key === "a" || code === "ArrowLeft") {
      if (!event.repeat) { const now = performance.now(); if (now - lastLeftPress < 350) keys.sprintLeft = true; lastLeftPress = now; }
      keys.left = true; event.preventDefault();
    }
    if (code === "KeyD" || key === "d" || code === "ArrowRight") {
      if (!event.repeat) { const now = performance.now(); if (now - lastRightPress < 350) keys.sprintRight = true; lastRightPress = now; }
      keys.right = true; event.preventDefault();
    }
    if (code === "ShiftLeft" || code === "ShiftRight") keys.sprint = true;
    if (code === "Space" || code === "ArrowUp" || key === "w") { event.preventDefault(); if (!event.repeat) jump("keyboard"); }
    if (!event.repeat && (key === "e" || code === "KeyE")) { event.preventDefault(); if (!anyPanelOpen()) { inventoryOpen = !inventoryOpen; renderInventory(); } else closeAllPanels(); return; }
    if (!event.repeat && (key === "f" || code === "KeyF")) { event.preventDefault(); attackAtPointer(); }
    if (!event.repeat && (key === "r" || code === "KeyR")) { event.preventDefault(); eatSelectedFood(); }
    if (!event.repeat && (key === "g" || code === "KeyG")) { event.preventDefault(); interactAtPointer(); }
    if (!event.repeat && (key === "c" || code === "KeyC")) { event.preventDefault(); if (anyPanelOpen()) closeAllPanels(); else openCraftingMenu(false); }
    if (!event.repeat && /^[1-9]$/.test(key)) { selectedSlot = Number(key) - 1; renderInventory(); }
    if (!event.repeat && (code === "Backspace" || code === "Delete")) { event.preventDefault(); startBreaking(hoveredBlock || selectedBlock); }
    if (!event.repeat && (key === "q" || code === "KeyQ")) { event.preventDefault(); placeBlockNearSelection(); }
  }

  function keyUp(event) {
    const code = event.code;
    const key = event.key.toLowerCase();
    if (code === "KeyA" || key === "a" || code === "ArrowLeft") { keys.left = false; keys.sprintLeft = false; }
    if (code === "KeyD" || key === "d" || code === "ArrowRight") { keys.right = false; keys.sprintRight = false; }
    if (code === "ShiftLeft" || code === "ShiftRight") keys.sprint = false;
    if (key === "e" || code === "KeyE" || code === "Backspace" || code === "Delete") cancelBreaking();
  }

  function connectHoldButton(button, direction) {
    if (!button) return;
    const pointers = new Set();
    let lastPress = 0;
    button.addEventListener("pointerdown", event => {
      if (document.body.classList.contains("needs-landscape")) return;
      event.preventDefault();
      pointers.add(event.pointerId);
      const now = performance.now(); if (now - lastPress < 350) touch[direction === "left" ? "sprintLeft" : "sprintRight"] = true; lastPress = now;
      touch[direction] = true;
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    });
    const stop = event => { pointers.delete(event.pointerId); touch[direction] = pointers.size > 0; if (!pointers.size) touch[direction === "left" ? "sprintLeft" : "sprintRight"] = false; };
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
  }

  function screenToWorld(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left + camera.x, y: event.clientY - rect.top + camera.y };
  }

  function blockAtPoint(point) {
    const bx = Math.floor(point.x / BLOCK_SIZE) * BLOCK_SIZE;
    const by = Math.floor(point.y / BLOCK_SIZE) * BLOCK_SIZE;
    return world.getAt(bx, by);
  }

  function updateHoveredBlock(event) {
    pointerWorld = screenToWorld(event);
    const block = blockAtPoint(pointerWorld);
    hoveredBlock = block && isInReach(block) ? block : null;
    // Keep the current target in sync for the touch action buttons too.
    if (hoveredBlock && !breakState) selectedBlock = hoveredBlock;
    render();
  }

  function handleCanvasPointer(event) {
    if (document.body.classList.contains("needs-landscape") || anyPanelOpen() || !player.alive) return;
    pointerWorld = screenToWorld(event);
    const block = blockAtPoint(pointerWorld);

    // Desktop: left-click mines blocks or attacks a mob; right-click uses stations or places blocks.
    if (event.pointerType === "mouse") {
      event.preventDefault();
      if (event.button === 0) {
        const mobHere = mobs.entities.some(m => m.alive && pointerWorld.x >= m.x && pointerWorld.x <= m.x + m.width && pointerWorld.y >= m.y && pointerWorld.y <= m.y + m.height);
        if (mobHere) attackAtPointer();
        else if (block && isInReach(block)) { selectedBlock = block; startBreaking(block); }
        else setStatus("روی یک بلاک نزدیک نگه دار یا برای حمله روی موجود کلیک کن");
      } else if (event.button === 2) {
        const held = selectedStack();
        if (held && FOOD_VALUES[held.type]) eatSelectedFood();
        else if (!interactAtWorldPoint(pointerWorld)) placeAtWorldPoint(pointerWorld);
      }
      hoveredBlock = block && isInReach(block) ? block : null;
      render();
      return;
    }

    // Touch: tap selects a block or mob; action buttons perform the selected action.
    if (block && isInReach(block)) {
      selectedBlock = block;
      setStatus(block.type === "bedrock" ? "سنگ‌بستر قابل شکستن نیست" : `انتخاب شد: ${typeName(block.type)}`);
    } else {
      selectedBlock = null;
      const mobHere = mobs.entities.find(m => m.alive && pointerWorld.x >= m.x && pointerWorld.x <= m.x + m.width && pointerWorld.y >= m.y && pointerWorld.y <= m.y + m.height);
      setStatus(mobHere ? `موجود انتخاب شد: ${mobHere.kind}` : "بلاکی یا موجودی در این نقطه نیست");
    }
    hoveredBlock = block && isInReach(block) ? block : null;
    render();
  }

  function typeName(type) {
    const english = ITEM_NAMES[type] || String(type || "Unknown").replace(/_/g, " ");
    const persian = ({ grass: "چمن", dirt: "خاک", stone: "سنگ", wood: "چوب", leaves: "برگ", leaf: "برگ", bedrock: "سنگ‌بستر", coal: "زغال‌سنگ", iron: "سنگ‌آهن", gold: "طلا", diamond: "الماس", torch: "مشعل", crafting_table: "میزکار", furnace: "کوره", planks: "تخته چوب", stick: "چوب‌دستی", bone: "استخوان", iron_ingot: "شمش آهن", gold_ingot: "شمش طلا", meat: "گوشت خام", mutton: "گوشت گوسفند", cooked_beef: "گوشت پخته", cooked_mutton: "گوشت گوسفند پخته", wool: "پشم", apple: "سیب", zombie_meat: "گوشت زامبی" })[type];
    return persian ? `${english} / ${persian}` : english;
  }

  function slotMarkup(index, stack, selected = false) {
    const name = stack ? typeName(stack.type) : "Empty / خالی";
    const durability = stack && Number.isFinite(stack.durability) ? `<span class="slot-durability"><i style="width:${100 * Math.max(0, stack.durability) / Math.max(1, stack.maxDurability || 1)}%"></i></span>` : "";
    return `<span class="slot-number">${index + 1}</span>${stack ? `<span class="slot-icon ${stack.type}"></span>${stack.count > 1 ? `<span class="slot-count">${stack.count}</span>` : ""}${durability}` : ""}<span class="slot-tooltip">${name}${stack && Number.isFinite(stack.durability) ? ` (${stack.durability}/${stack.maxDurability})` : ""}</span>`;
  }

  function swapSlots(a, b) {
    if (a === b || a == null || b == null || a < 0 || b < 0 || a >= inventory.length || b >= inventory.length) return;
    const temp = inventory[a]; inventory[a] = inventory[b]; inventory[b] = temp;
    if (a < 9) selectedSlot = a;
    else if (b < 9) selectedSlot = b;
    renderInventory();
    setStatus(inventory[selectedSlot] ? `Selected: ${typeName(inventory[selectedSlot].type)}` : "Inventory slots swapped");
  }

  function attachSlotInteractions(slot, index) {
    slot.dataset.slotIndex = String(index);
    slot.draggable = false;
    slot.addEventListener("pointerdown", event => {
      if (event.button !== undefined && event.button !== 0) return;
      dragSourceIndex = index;
      dragStartPoint = { x: event.clientX, y: event.clientY };
      slot.classList.add("drag-source");
    });
    slot.addEventListener("click", event => {
      if (suppressSlotClick) { event.preventDefault(); event.stopPropagation(); return; }
      if (pendingTouchMoveIndex !== null && pendingTouchMoveIndex !== index) {
        const source = pendingTouchMoveIndex;
        pendingTouchMoveIndex = null;
        swapSlots(source, index);
        setStatus("Inventory items moved");
        return;
      }
      if (index >= 9 && inventory[index]) {
        // On touch screens, tap an item and then its destination to move it reliably.
        if (matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) {
          pendingTouchMoveIndex = index;
          setStatus(`Selected ${typeName(inventory[index].type)}. Tap a destination slot.`);
        } else {
          swapSlots(index, selectedSlot);
        }
      } else if (index < 9) {
        selectedSlot = index;
        renderInventory();
        setStatus(inventory[index] ? `Selected: ${typeName(inventory[index].type)} ×${inventory[index].count}` : "Empty hotbar slot");
      } else {
        pendingTouchMoveIndex = index;
        setStatus("Empty inventory slot selected. Tap another slot to move here.");
      }
    });
  }

  // Resolve drag destinations globally so pointer-up works even when the browser
  // reports the original slot as the event target. This supports mouse and touch.
  document.addEventListener("pointerup", event => {
    if (dragSourceIndex === null) return;
    const source = dragSourceIndex;
    const start = dragStartPoint;
    dragSourceIndex = null;
    dragStartPoint = null;
    document.querySelectorAll(".drag-source").forEach(el => el.classList.remove("drag-source"));
    const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".inventory-slot");
    const target = targetElement && targetElement.dataset.slotIndex !== undefined ? Number(targetElement.dataset.slotIndex) : null;
    const moved = start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7;
    if (moved && target !== null && target !== source) {
      event.preventDefault();
      suppressSlotClick = true;
      pendingTouchMoveIndex = null;
      swapSlots(source, target);
      setStatus("Inventory items moved");
      setTimeout(() => { suppressSlotClick = false; }, 80);
    }
  }, true);
  document.addEventListener("pointercancel", () => {
    dragSourceIndex = null;
    dragStartPoint = null;
    document.querySelectorAll(".drag-source").forEach(el => el.classList.remove("drag-source"));
  });

  function addItemPartial(type, amount = 1, durability = null) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    const tool = TOOL_INFO[type];
    if (tool) {
      while (remaining > 0) {
        const empty = inventory.findIndex(slot => !slot);
        if (empty < 0) break;
        inventory[empty] = { type, count: 1, durability: durability ?? tool.maxDurability, maxDurability: tool.maxDurability };
        remaining--;
      }
    } else {
      for (const stack of inventory) {
        if (stack && stack.type === type && stack.count < STACK_LIMIT) {
          const added = Math.min(STACK_LIMIT - stack.count, remaining);
          stack.count += added; remaining -= added;
          if (!remaining) break;
        }
      }
      for (let i = 0; i < inventory.length && remaining > 0; i++) {
        if (!inventory[i]) {
          const added = Math.min(STACK_LIMIT, remaining);
          inventory[i] = { type, count: added }; remaining -= added;
        }
      }
    }
    renderInventory();
    return Math.max(0, Math.floor(Number(amount) || 0)) - remaining;
  }

  function addItem(type, amount = 1, durability = null) {
    return addItemPartial(type, amount, durability) >= Math.max(0, Math.floor(Number(amount) || 0));
  }

  function itemCount(type) {
    return inventory.reduce((sum, stack) => sum + (stack && stack.type === type ? stack.count : 0), 0);
  }

  function consumeItems(type, amount) {
    let remaining = amount;
    for (let i = 0; i < inventory.length && remaining > 0; i++) {
      const stack = inventory[i];
      if (!stack || stack.type !== type) continue;
      const take = Math.min(stack.count, remaining);
      stack.count -= take; remaining -= take;
      if (stack.count <= 0) inventory[i] = null;
    }
    return remaining === 0;
  }

  function consumeSelectedItem() {
    const stack = inventory[selectedSlot];
    if (!stack || !PLACEABLE_TYPES.has(stack.type) || stack.count < 1) return false;
    stack.count--;
    if (stack.count <= 0) inventory[selectedSlot] = null;
    renderInventory();
    return true;
  }

  function selectedItemType() {
    const stack = inventory[selectedSlot];
    return stack && PLACEABLE_TYPES.has(stack.type) ? stack.type : null;
  }

  function renderInventory() {
    if (!hotbarElement) return;
    hotbarElement.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "inventory-slot" + (selectedSlot === i ? " selected" : "");
      slot.setAttribute("aria-label", `Slot ${i + 1}: ${inventory[i] ? `${typeName(inventory[i].type)}, ${inventory[i].count}` : "empty"}`);
      slot.title = inventory[i] ? `${typeName(inventory[i].type)} ×${inventory[i].count}` : "Empty slot";
      slot.innerHTML = slotMarkup(i, inventory[i], selectedSlot === i);
      attachSlotInteractions(slot, i);
      hotbarElement.appendChild(slot);
    }
    if (!inventoryElement) return;
    inventoryElement.hidden = !inventoryOpen;
    if (!inventoryOpen) return;
    inventoryElement.innerHTML = '<div class="inventory-heading"><div class="inventory-title">Inventory <span>Drag or tap an item, then its destination</span></div><button type="button" id="inventory-close">✕</button></div><div class="inventory-grid-scroll"><div class="inventory-grid"></div></div>';
    inventoryElement.querySelector("#inventory-close").addEventListener("click", () => { inventoryOpen = false; renderInventory(); });
    const grid = inventoryElement.querySelector(".inventory-grid");
    for (let i = 9; i < 36; i++) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "inventory-slot";
      slot.setAttribute("aria-label", `Inventory slot ${i + 1}: ${inventory[i] ? `${typeName(inventory[i].type)}, ${inventory[i].count}` : "empty"}`);
      slot.title = inventory[i] ? `${typeName(inventory[i].type)} ×${inventory[i].count}` : "Empty slot";
      slot.innerHTML = slotMarkup(i, inventory[i]);
      attachSlotInteractions(slot, i);
      grid.appendChild(slot);
    }
  }

  function spawnDrop(block) {
    const dropType = block.type === "leaves" || block.type === "leaf" ? "leaves" : block.type;
    drops.push({ type: dropType, count: 1, x: block.x + BLOCK_SIZE / 2 - 9, y: block.y + BLOCK_SIZE / 2 - 9,
      vx: (Math.random() - 0.5) * 55, vy: -100, age: 0 });
  }

  function updateDrops(dt) {
    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i];
      drop.age += dt;
      drop.vy += 420 * dt;
      drop.x += drop.vx * dt; drop.y += drop.vy * dt;
      const below = world.getAt(Math.floor((drop.x + 9) / BLOCK_SIZE) * BLOCK_SIZE,
        Math.floor((drop.y + 18) / BLOCK_SIZE) * BLOCK_SIZE);
      if (below && world.isSolid(below) && drop.vy > 0 && drop.y + 18 >= below.y && drop.y < below.y) {
        drop.y = below.y - 18; drop.vy = 0; drop.vx *= 0.6;
      }
      const dx = player.x + player.width / 2 - (drop.x + 9);
      const dy = player.y + player.height / 2 - (drop.y + 9);
      if (player.alive && Math.hypot(dx, dy) < 58) {
        const added = addItemPartial(drop.type, drop.count || 1, drop.durability ?? null);
        drop.count = Math.max(0, (drop.count || 1) - added);
        if (drop.count <= 0) {
          drops.splice(i, 1);
          setStatus(`${typeName(drop.type)} جمع شد و وارد Inventory شد`);
        } else if (added > 0) setStatus("Inventory جا ندارد؛ بخشی از آیتم جمع شد");
      }
    }
  }

  function drawDrops() {
    for (const drop of drops) {
      const x = Math.round(drop.x - camera.x), y = Math.round(drop.y - camera.y);
      if (x < -20 || x > gameShell.clientWidth + 20 || y < -20 || y > gameShell.clientHeight + 20) continue;
      const colors = COLORS[drop.type] || COLORS.dirt;
      ctx.save(); ctx.translate(x + 9, y + 9); ctx.rotate(Math.sin(drop.age * 5) * 0.12);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-8, 3, 17, 17);
      ctx.fillStyle = colors.side; ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = colors.top; ctx.fillRect(-6, -6, 12, 5);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.strokeRect(-8, -8, 16, 16); ctx.restore();
    }
  }

  function breakSelectedBlock(target = selectedBlock) {
    if (!player.alive || anyPanelOpen()) return false;
    if (!target || !world.blocks.includes(target)) { setStatus("اول یک بلاک را انتخاب کن"); return false; }
    if (target.type === "bedrock") { setStatus("سنگ‌بستر قابل شکستن نیست"); return false; }
    if (!isInReach(target)) { setStatus("بلاک خارج از دسترس است"); return false; }
    const underPlayer = target.x < player.x + player.width && target.x + BLOCK_SIZE > player.x && Math.abs(target.y + BLOCK_SIZE - (player.y + player.height)) <= 3;
    if (underPlayer) { setStatus("نمی‌توان بلاکی را که روی آن ایستاده‌ای بشکنی"); return false; }
    const name = typeName(target.type);
    const stack = selectedStack();
    const tool = selectedToolInfo();
    const effectiveTool = tool && tool.targets.includes(target.type) && stack && stack.durability > 0;
    // Original project drops the mined block; a matching tool only changes speed and durability.
    spawnDrop(target);
    if (effectiveTool) {
      stack.durability -= 1;
      if (stack.durability <= 0) { inventory[selectedSlot] = null; setStatus(`${typeName(stack.type)} شکست`); }
    }
    world.removeBlock(target);
    if (selectedBlock === target) selectedBlock = null;
    if (hoveredBlock === target) hoveredBlock = null;
    breakState = null;
    setStatus(`${name} شکسته شد`);
    render();
    return true;
  }

  function startBreaking(target = hoveredBlock || selectedBlock) {
    if (!player.alive || anyPanelOpen()) return;
    if (!target || !world.blocks.includes(target)) { setStatus("اول روی یک بلاک نزدیک برو یا آن را انتخاب کن"); return; }
    if (target.type === "bedrock") { setStatus("سنگ‌بستر قابل شکستن نیست"); return; }
    if (!isInReach(target)) { setStatus("بلاک خارج از دسترس است"); return; }
    const underPlayer = target.x < player.x + player.width && target.x + BLOCK_SIZE > player.x && Math.abs(target.y + BLOCK_SIZE - (player.y + player.height)) <= 3;
    if (underPlayer) { setStatus("نمی‌توان بلاکی را که روی آن ایستاده‌ای بشکنی"); return; }
    cancelBreaking(false);
    selectedBlock = target;
    const duration = breakDurationFor(target);
    if (!Number.isFinite(duration)) { setStatus("این بلاک قابل شکستن نیست"); return; }
    breakState = { target, startedAt: performance.now(), duration, timer: null };
    setStatus(`در حال شکستن ${typeName(target.type)}… دکمه را ${(duration / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 2 })} ثانیه نگه دار`);
    const state = breakState;
    state.timer = window.setTimeout(() => {
      if (breakState !== state) return;
      breakState = null;
      breakSelectedBlock(target);
    }, duration);
    render();
  }

  function cancelBreaking(showMessage = false) {
    if (!breakState) return;
    const duration = breakState.duration;
    window.clearTimeout(breakState.timer);
    breakState = null;
    if (showMessage) setStatus(`شکستن لغو شد؛ دکمه را ${(duration / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 2 })} ثانیه نگه دار`);
    render();
  }

  function connectBreakHold(button) {
    if (!button) return;
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      const target = hoveredBlock || selectedBlock;
      startBreaking(target);
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    });
    const stop = () => {
      if (breakState) {
        const elapsed = performance.now() - breakState.startedAt;
        if (elapsed < breakState.duration) cancelBreaking(true);
      }
    };
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
  }

  function placeBlockAtPointer(block, point) {
    if (!player.alive || anyPanelOpen()) return;
    if (!block || !world.blocks.includes(block)) { setStatus("اول روی یک بلاک کلیک کن"); return; }
    if (!isWithinPlaceReach(block)) { setStatus("برای ساختن باید نزدیک‌تر باشی"); return; }

    // Place on the face nearest to the cursor, like a simple Minecraft block interaction.
    const localX = point.x - block.x;
    const localY = point.y - block.y;
    const distances = [
      { side: "left", value: localX },
      { side: "right", value: BLOCK_SIZE - localX },
      { side: "top", value: localY },
      { side: "bottom", value: BLOCK_SIZE - localY }
    ];
    distances.sort((a, b) => a.value - b.value);
    const side = distances[0].side;
    let x = block.x, y = block.y;
    if (side === "left") x -= BLOCK_SIZE;
    else if (side === "right") x += BLOCK_SIZE;
    else if (side === "top") y -= BLOCK_SIZE;
    else y += BLOCK_SIZE;

    const type = selectedItemType();
    const placeAt = type === "torch" ? (world.getAt(x, y) ? false : { x, y }) : world.canPlace(x, y, playerRect());
    if (!placeAt) { setStatus("این محل پر است، به بلاک دیگری وصل نیست یا داخل بازیکن قرار می‌گیرد"); return; }
    if (!type) { setStatus("اول Hotbar را انتخاب کن؛ خانهٔ انتخاب‌شده بلاک ندارد"); return; }
    const newBlock = world.addBlock(placeAt.x, placeAt.y, type);
    if (newBlock) {
      consumeSelectedItem();
      selectedBlock = newBlock;
      hoveredBlock = newBlock;
      setStatus(`${typeName(type)} قرار داده شد`);
    }
    render();
  }

  function placeAtWorldPoint(point) {
    if (!player.alive || anyPanelOpen()) return;
    if (!point) { setStatus("روی محل موردنظر کلیک یا لمس کن"); return; }
    const gx = Math.floor(point.x / BLOCK_SIZE) * BLOCK_SIZE;
    const gy = Math.floor(point.y / BLOCK_SIZE) * BLOCK_SIZE;
    const occupied = world.getAt(gx, gy);

    // If the pointer is over a block, place on the nearest face. If it is over an empty
    // cell, place directly in that cell when it touches an existing block.
    if (occupied) {
      if (!isInReach(occupied)) { setStatus("این بلاک خارج از دسترس است"); return; }
      placeBlockAtPointer(occupied, point);
      return;
    }

    const neighbors = [[BLOCK_SIZE,0],[-BLOCK_SIZE,0],[0,BLOCK_SIZE],[0,-BLOCK_SIZE]]
      .map(([dx,dy]) => world.getAt(gx + dx, gy + dy))
      .filter(Boolean);
    if (!neighbors.some(isWithinPlaceReach)) { setStatus("برای قراردادن، کنار یک بلاک نزدیک را انتخاب کن"); return; }
    const type = selectedItemType();
    const placeAt = type === "torch" ? (world.getAt(gx, gy) ? false : { x: gx, y: gy }) : world.canPlace(gx, gy, playerRect());
    if (!placeAt) { setStatus("این محل پر است یا داخل بازیکن قرار می‌گیرد"); return; }
    if (!type) { setStatus("اول Hotbar را انتخاب کن؛ خانهٔ انتخاب‌شده بلاک ندارد"); return; }
    const newBlock = world.addBlock(placeAt.x, placeAt.y, type);
    if (newBlock) {
      consumeSelectedItem();
      selectedBlock = newBlock;
      hoveredBlock = newBlock;
      setStatus(`${typeName(type)} قرار داده شد`);
    }
    render();
  }

  function placeBlockNearSelection() {
    if (!player.alive || anyPanelOpen()) return;
    const target = hoveredBlock || selectedBlock;
    const point = pointerWorld || (target ? { x: target.x + BLOCK_SIZE / 2, y: target.y + BLOCK_SIZE / 2 } : null);
    if (!target || !point) { setStatus("اول یک بلاک را لمس یا انتخاب کن"); return; }
    placeAtWorldPoint(point);
  }

  function anyPanelOpen() {
    return inventoryOpen || (craftingPanel && !craftingPanel.hidden) || (furnacePanel && !furnacePanel.hidden) || (mainMenuPanel && !mainMenuPanel.hidden);
  }
  function closeAllPanels() {
    inventoryOpen = false;
    if (craftingPanel) craftingPanel.hidden = true;
    if (furnacePanel) furnacePanel.hidden = true;
    if (inventoryElement) inventoryElement.hidden = true;
    activeStationKey = null; activeStationType = null;
    renderInventory();
  }
  function renderHud() {
    if (vitalsElement) {
      const hearts = Array.from({ length: 10 }, (_, i) => `<span class="stat-heart ${player.health >= (i + 1) * 2 ? "full" : player.health > i * 2 ? "half" : "empty"}">♥</span>`).join("");
      const food = Array.from({ length: 10 }, (_, i) => `<span class="stat-food ${player.hunger >= (i + 1) * 2 ? "full" : player.hunger > i * 2 ? "half" : "empty"}">◆</span>`).join("");
      vitalsElement.innerHTML = `<div class="health-row" aria-label="Health ${player.health} of 20">${hearts}</div><div class="hunger-row" aria-label="Hunger ${player.hunger} of 20">${food}</div>`;
    }
    if (clockElement) clockElement.textContent = `${clock.text} · ${clock.phase === "night" ? "Night" : clock.phase === "sunrise" ? "Sunrise" : clock.phase === "sunset" ? "Sunset" : "Day"}`;
  }
  function damagePlayer(amount, source = "") {
    if (!player.alive || amount <= 0) return;
    player.health = Math.max(0, player.health - amount); player.damageTimer = .3;
    if (source) setStatus(`${source}: ${amount} damage`);
    if (player.health <= 0) onPlayerDeath();
    renderHud();
  }
  function updateSurvival(dt) {
    if (!player.alive) return;
    player.hungerTimer += dt;
    if (player.hungerTimer >= 30) { player.hunger = Math.max(0, player.hunger - 1); player.hungerTimer %= 30; }
    if (player.hunger >= 18 && player.health < player.maxHealth) {
      player.regenTimer += dt;
      if (player.regenTimer >= 4) { player.health = Math.min(player.maxHealth, player.health + 1); player.hunger = Math.max(0, player.hunger - 1); player.regenTimer = 0; }
    } else player.regenTimer = 0;
    if (player.hunger <= 0) { player.starvationTimer += dt; if (player.starvationTimer >= 2) { player.starvationTimer = 0; damagePlayer(1, "Starvation"); } }
    else player.starvationTimer = 0;
    player.damageTimer = Math.max(0, player.damageTimer - dt); renderHud();
  }
  function eatSelectedFood() {
    if (!player.alive || anyPanelOpen() || eatCooldown > 0) return false;
    const stack = selectedStack(); const value = stack && FOOD_VALUES[stack.type];
    if (!value) { setStatus("در خانهٔ انتخاب‌شده غذا نیست"); return false; }
    player.hunger = Math.min(player.maxHunger, player.hunger + value); player.health = Math.min(player.maxHealth, player.health + 2);
    stack.count--; if (stack.count <= 0) inventory[selectedSlot] = null; eatCooldown = .38;
    renderInventory(); renderHud(); setStatus(`${typeName(stack.type)} خورده شد`); return true;
  }
  function canFitItem(type, count = 1) {
    if (TOOL_INFO[type]) return inventory.filter(x => !x).length >= count;
    let remaining = count;
    for (const stack of inventory) if (stack && stack.type === type) remaining -= Math.max(0, STACK_LIMIT - stack.count);
    return remaining <= inventory.filter(x => !x).length * STACK_LIMIT;
  }
  function openCraftingMenu(fromTable = false) {
    if (!craftingPanel) return;
    inventoryOpen = false; if (inventoryElement) inventoryElement.hidden = true;
    if (furnacePanel) furnacePanel.hidden = true;
    if (!fromTable) { activeStationKey = null; activeStationType = null; }
    else activeStationType = "crafting_table";
    craftingPanel.hidden = false; activeCraftingRecipe = Math.min(activeCraftingRecipe, RECIPES.length - 1);
    renderCraftingPanel(); setStatus(fromTable ? "Crafting Table باز شد" : "Crafting باز شد — بدون میز فقط میزکار قابل ساخت است");
  }
  function openCraftingTable() { openCraftingMenu(true); }
  function hasNearbyCraftingTable() {
    if (activeStationType !== "crafting_table" || !activeStationKey) return false;
    const [x, y] = activeStationKey.split(",").map(Number);
    const block = Number.isFinite(x) && Number.isFinite(y) ? world.getAt(x, y) : null;
    return !!(block && block.type === "crafting_table" && isInReach(block));
  }
  function renderCraftingPanel() {
    if (!craftingPanel) return;
    const recipe = RECIPES[activeCraftingRecipe] || RECIPES[0];
    const recipeRows = RECIPES.map((r, i) => {
      const enough = Object.entries(r.ingredients).every(([type, n]) => itemCount(type) >= n);
      const uniqueOkay = !r.unique || itemCount(r.output) === 0;
      return `<button type="button" class="recipe-row ${i === activeCraftingRecipe ? "active" : ""}" data-recipe="${i}"><span>${r.name}</span><small>${Object.entries(r.ingredients).map(([type,n]) => `${ITEM_NAMES[type] || type} ×${n}`).join(" · ")}</small><b>${enough && uniqueOkay ? "✓" : "…"}</b></button>`;
    }).join("");
    const ingredients = Object.entries(recipe.ingredients).map(([type, n]) => `<span class="recipe-ingredient ${itemCount(type) >= n ? "ready" : "missing"}">${ITEM_NAMES[type] || type}<b>${itemCount(type)}/${n}</b></span>`).join("");
    const allowed = (!recipe.requiresTable || hasNearbyCraftingTable()) && Object.entries(recipe.ingredients).every(([type,n]) => itemCount(type) >= n) && (!recipe.unique || itemCount(recipe.output) === 0) && canFitItem(recipe.output, recipe.count);
    craftingPanel.innerHTML = `<div class="system-panel-head"><strong>CRAFTING</strong><button type="button" data-close="crafting">✕</button></div><div class="system-panel-body"><div class="recipe-list">${recipeRows}</div><div class="recipe-detail"><h3>${recipe.name}</h3><p>Required materials</p><div class="recipe-ingredients">${ingredients}</div><div class="recipe-output"><span class="slot-icon ${recipe.output}"></span><span>${ITEM_NAMES[recipe.output] || recipe.output} ×${recipe.count}</span></div><button type="button" id="craft-confirm" ${allowed ? "" : "disabled"}>CRAFT</button><small>${recipe.requiresTable ? "Requires a placed Crafting Table" : "Can be crafted anywhere"}</small></div></div>`;
    craftingPanel.querySelectorAll("[data-recipe]").forEach(button => button.addEventListener("click", () => { activeCraftingRecipe = Number(button.dataset.recipe); renderCraftingPanel(); }));
    craftingPanel.querySelector("[data-close]").addEventListener("click", closeAllPanels);
    craftingPanel.querySelector("#craft-confirm").addEventListener("click", craftSelectedRecipe);
  }
  function craftSelectedRecipe() {
    const recipe = RECIPES[activeCraftingRecipe]; if (!recipe) return;
    if (recipe.requiresTable && !hasNearbyCraftingTable()) { setStatus("برای این دستور باید نزدیک میزکار باشی"); return; }
    if (recipe.unique && itemCount(recipe.output) > 0) { setStatus("این ابزار را از قبل داری"); return; }
    if (!Object.entries(recipe.ingredients).every(([type,n]) => itemCount(type) >= n)) { setStatus("مواد اولیه کافی نیست"); return; }
    if (!canFitItem(recipe.output, recipe.count)) { setStatus("فضای Inventory کافی نیست"); return; }
    for (const [type, n] of Object.entries(recipe.ingredients)) consumeItems(type, n);
    addItem(recipe.output, recipe.count); renderInventory(); renderCraftingPanel(); setStatus(`${recipe.name} ساخته شد`);
  }
  function furnaceKey(block) { return `${block.x},${block.y}`; }
  function openFurnace(block) {
    if (!furnacePanel) return;
    inventoryOpen = false; if (inventoryElement) inventoryElement.hidden = true;
    if (craftingPanel) craftingPanel.hidden = true;
    activeStationKey = furnaceKey(block); activeStationType = "furnace"; if (!furnaces.has(activeStationKey)) furnaces.set(activeStationKey, furnaceState());
    furnacePanel.hidden = false; renderFurnacePanel(); setStatus("Furnace باز شد");
  }
  function renderFurnacePanel() {
    if (!furnacePanel || !activeStationKey) return;
    const state = furnaces.get(activeStationKey) || furnaceState();
    const slot = (name, item) => `<div class="furnace-slot"><strong>${name}</strong><span class="slot-icon ${item ? item.type : ""}"></span><b>${item ? `${ITEM_NAMES[item.type] || item.type} ×${item.count}` : "Empty"}</b></div>`;
    const fuelPct = Math.max(0, Math.min(100, state.burnTime / 8 * 100)); const cookPct = Math.max(0, Math.min(100, state.cookTime / 4 * 100));
    furnacePanel.innerHTML = `<div class="system-panel-head"><strong>FURNACE</strong><button type="button" data-close="furnace">✕</button></div><div class="furnace-content"><div class="furnace-slots">${slot("INPUT", state.input)}<div class="furnace-meter"><span style="height:${cookPct}%"></span></div>${slot("FUEL", state.fuel)}<div class="furnace-meter fuel"><span style="height:${fuelPct}%"></span></div>${slot("OUTPUT", state.output)}</div><div class="furnace-actions"><button id="furnace-put-input" type="button">Use selected item as input</button><button id="furnace-put-fuel" type="button">Use selected item as fuel</button><button id="furnace-take-output" type="button" ${state.output ? "" : "disabled"}>Collect output</button></div><p>1 Coal = 8 seconds fuel · 1 item = 4 seconds cooking</p></div>`;
    furnacePanel.querySelector("[data-close]").addEventListener("click", closeAllPanels);
    furnacePanel.querySelector("#furnace-put-input").addEventListener("click", () => {
      const stack = selectedStack(); if (!stack || !SMELT_RECIPES[stack.type]) { setStatus("برای ورودی، سنگ‌آهن، طلا یا گوشت خام انتخاب کن"); return; }
      if (state.input && state.input.type !== stack.type) { setStatus("ابتدا ورودی قبلی را خالی کن"); return; }
      state.input = state.input || { type: stack.type, count: 0 }; state.input.count += stack.count; inventory[selectedSlot] = null; renderInventory(); renderFurnacePanel();
    });
    furnacePanel.querySelector("#furnace-put-fuel").addEventListener("click", () => {
      const stack = selectedStack(); if (!stack || stack.type !== "coal") { setStatus("برای سوخت، زغال‌سنگ انتخاب کن"); return; }
      state.fuel = state.fuel || { type: "coal", count: 0 }; state.fuel.count += stack.count; inventory[selectedSlot] = null; renderInventory(); renderFurnacePanel();
    });
    furnacePanel.querySelector("#furnace-take-output").addEventListener("click", () => {
      if (!state.output) return; const added = addItemPartial(state.output.type, state.output.count);
      state.output.count -= added; if (state.output.count <= 0) state.output = null; renderFurnacePanel(); setStatus(added ? "محصول کوره جمع شد" : "Inventory جا ندارد");
    });
  }
  function interactAtWorldPoint(point = pointerWorld) {
    if (!player.alive || anyPanelOpen() || !point) return false;
    const x = Math.floor(point.x / BLOCK_SIZE) * BLOCK_SIZE, y = Math.floor(point.y / BLOCK_SIZE) * BLOCK_SIZE;
    const block = world.getAt(x, y); if (!block || !isInReach(block)) return false;
    if (block.type === "crafting_table") { activeStationKey = furnaceKey(block); openCraftingTable(); return true; }
    if (block.type === "furnace") { openFurnace(block); return true; }
    return false;
  }
  function attackAtPointer() {
    if (!pointerWorld || !player.alive || anyPanelOpen()) return false;
    const stack = selectedStack(), tool = selectedToolInfo(); const damage = tool && tool.kind === "sword" ? tool.damage : 5;
    const hit = mobs.hitAt(pointerWorld.x, pointerWorld.y, player, damage, onMobDeath);
    if (hit) {
      if (tool && tool.kind === "sword" && stack) { stack.durability--; if (stack.durability <= 0) inventory[selectedSlot] = null; renderInventory(); }
      setStatus("حمله انجام شد"); return true;
    }
    setStatus("موجودی در این نقطه نیست یا از دسترس دور است"); return false;
  }
  function onMobDeath(mob) {
    if (mob.kind === "sheep") { drops.push({ type: "mutton", count: 1, x: mob.x + 10, y: mob.y + 18, vx: 0, vy: -80, age: 0 }); drops.push({ type: "wool", count: 1, x: mob.x + 24, y: mob.y + 12, vx: 0, vy: -80, age: 0 }); }
    else if (mob.kind === "cow") drops.push({ type: "meat", count: 3, x: mob.x + 15, y: mob.y + 18, vx: 0, vy: -80, age: 0 });
    else if (mob.kind === "zombie") drops.push({ type: "zombie_meat", count: 1, x: mob.x + 12, y: mob.y + 18, vx: 0, vy: -80, age: 0 });
    else drops.push({ type: "bone", count: 1, x: mob.x + 12, y: mob.y + 18, vx: 0, vy: -80, age: 0 });
    setStatus(`${mob.kind} شکست خورد`);
  }
  function onPlayerDeath() {
    if (deathShown) return; deathShown = true; player.alive = false;
    for (const stack of inventory) if (stack && stack.count > 0) drops.push({ type: stack.type, count: stack.count, durability: stack.durability, maxDurability: stack.maxDurability, x: player.x + player.width / 2, y: player.y + player.height - 18, vx: (Math.random() - .5) * 80, vy: -120, age: 0 });
    inventory.fill(null); closeAllPanels(); if (deathPanel) deathPanel.hidden = false; releaseInputs(); setStatus("You died");
  }
  function findSafeSpawn(preferredX = 80) {
    const base = Math.round(preferredX / BLOCK_SIZE) * BLOCK_SIZE;
    for (let radius = 0; radius <= 24; radius++) {
      const candidates = radius === 0 ? [base] : [base + radius * BLOCK_SIZE, base - radius * BLOCK_SIZE];
      for (const x of candidates) {
        world.generateAround(x);
        const y = surfaceY(x) - player.height;
        const blocked = world.blocksInRect(x, y, x + player.width, y + player.height).some(b =>
          rectanglesOverlap(x, y, player.width, player.height, b.x, b.y, BLOCK_SIZE, BLOCK_SIZE));
        if (!blocked) return { x, y };
      }
    }
    return { x: base, y: surfaceY(base) - player.height };
  }
  function respawnPlayer() {
    const spawn = findSafeSpawn(80);
    player.x = spawn.x; player.y = spawn.y; player.vx = 0; player.vy = 0; player.onGround = false;
    player.health = 20; player.hunger = 20; player.hungerTimer = 0; player.starvationTimer = 0; player.regenTimer = 0; player.fallStartY = null; player.alive = true;
    deathShown = false; if (deathPanel) deathPanel.hidden = true; cameraInitialized = false; updateCamera(true); renderHud();
    setStatus("Respawned — your dropped items are still in the world");
  }
  function saveGame(showMessage = true) {
    const data = { version: 3, world: world.exportChanges(), player: { x: player.x, y: player.y, vy: player.vy, onGround: player.onGround, health: player.health, hunger: player.hunger, hungerTimer: player.hungerTimer, starvationTimer: player.starvationTimer, regenTimer: player.regenTimer, fallStartY: player.fallStartY, alive: player.alive }, inventory, selectedSlot, drops, clock: clock.minutes, mobs: mobs.save(), furnaces: [...furnaces.entries()] };
    try { localStorage.setItem("minecraft2d-web-save-v3", JSON.stringify(data)); if (showMessage) setStatus("بازی ذخیره شد"); return true; }
    catch (error) { console.warn("Save failed", error); if (showMessage) setStatus("ذخیره‌سازی در این مرورگر در دسترس نیست"); return false; }
  }
  function loadGame(showMessage = true) {
    try {
      const raw = localStorage.getItem("minecraft2d-web-save-v3"); if (!raw) { if (showMessage) setStatus("ذخیره‌ای پیدا نشد"); return false; }
      const data = JSON.parse(raw); if (!data || typeof data !== "object") throw new Error("Invalid save data");
      world.importChanges(data.world, Number(data.player?.x) || 0);
      const savedX = Number(data.player?.x), savedY = Number(data.player?.y), savedHealth = Number(data.player?.health), savedHunger = Number(data.player?.hunger);
      const savedFallStartY = data.player?.fallStartY;
      Object.assign(player, { x: Number.isFinite(savedX) ? savedX : 80, y: Number.isFinite(savedY) ? savedY : surfaceY(80) - player.height, vy: Number(data.player?.vy) || 0,
        onGround: !!data.player?.onGround, health: Number.isFinite(savedHealth) ? Math.max(0, Math.min(20, savedHealth)) : 20, hunger: Number.isFinite(savedHunger) ? Math.max(0, Math.min(20, savedHunger)) : 20,
        hungerTimer: Number(data.player?.hungerTimer) || 0, starvationTimer: Number(data.player?.starvationTimer) || 0, regenTimer: Number(data.player?.regenTimer) || 0, fallStartY: typeof savedFallStartY === "number" && Number.isFinite(savedFallStartY) ? savedFallStartY : null, alive: data.player?.alive !== false });
      if (Array.isArray(data.inventory)) for (let i = 0; i < 36; i++) { const item = data.inventory[i]; inventory[i] = item && typeof item.type === "string" && Number.isFinite(item.count) && item.count > 0 ? { ...item } : null; }
      selectedSlot = Math.max(0, Math.min(8, Number(data.selectedSlot) || 0));
      drops.length = 0; if (Array.isArray(data.drops)) for (const d of data.drops) if (d && typeof d.type === "string" && Number.isFinite(d.x) && Number.isFinite(d.y)) drops.push({ ...d, age: Number(d.age) || 0 });
      const savedClock = Number(data.clock); clock.minutes = ((Number.isFinite(savedClock) ? savedClock : 360) % 1440 + 1440) % 1440; mobs.load(data.mobs); furnaces.clear();
      activeStationKey = null; activeStationType = null; closeAllPanels();
      if (Array.isArray(data.furnaces)) for (const pair of data.furnaces) if (Array.isArray(pair) && pair.length === 2 && pair[1] && typeof pair[1] === "object") furnaces.set(String(pair[0]), { ...furnaceState(), ...pair[1] });
      deathShown = !player.alive; if (deathPanel) deathPanel.hidden = !deathShown; cameraInitialized = false; updateCamera(true); renderInventory(); renderHud();
      if (showMessage) setStatus("بازی بارگذاری شد"); return true;
    } catch (error) { console.warn("Load failed", error); if (showMessage) setStatus("فایل ذخیره خراب یا ناسازگار است"); return false; }
  }
  function applyDarkness(width, height) {
    const underground = player.y > surfaceY(player.x) + BLOCK_SIZE * 2;
    const darkness = Math.min(.76, Math.max((1 - clock.light) * .62, underground ? .62 : 0));
    if (darkness <= .02) return;
    ctx.save();
    ctx.fillStyle = `rgba(5, 10, 27, ${darkness})`;
    ctx.fillRect(0, 0, width, height);
    // Additive light pools keep the night/cave overlay opaque while illuminating torches.
    ctx.globalCompositeOperation = "screen";
    const lights = [];
    for (const b of world.blocks) if (b.type === "torch") lights.push({ x: b.x + BLOCK_SIZE / 2 - camera.x, y: b.y + BLOCK_SIZE / 2 - camera.y, r: 155, alpha: .72 });
    lights.push({ x: player.x + player.width / 2 - camera.x, y: player.y + player.height / 2 - camera.y, r: 72, alpha: .17 });
    for (const light of lights) {
      if (light.x < -light.r || light.x > width + light.r || light.y < -light.r || light.y > height + light.r) continue;
      const g = ctx.createRadialGradient(light.x, light.y, 5, light.x, light.y, light.r);
      g.addColorStop(0, `rgba(255, 190, 100, ${darkness * light.alpha})`);
      g.addColorStop(.45, `rgba(255, 145, 65, ${darkness * light.alpha * .38})`);
      g.addColorStop(1, "rgba(255, 145, 65, 0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(light.x, light.y, light.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function update(dt) {
    clock.update(dt);
    hudRefreshTimer += dt; if (hudRefreshTimer >= .2) { hudRefreshTimer = 0; renderHud(); }
    eatCooldown = Math.max(0, eatCooldown - dt);
    attackCooldown = Math.max(0, attackCooldown - dt);
    autoSaveTimer += dt;
    if (autoSaveTimer >= 25) { autoSaveTimer = 0; saveGame(false); }

    if (player.alive) {
      const direction = anyPanelOpen() ? 0 : (keys.left || touch.left ? -1 : 0) + (keys.right || touch.right ? 1 : 0);
      const sprinting = !anyPanelOpen() && (keys.sprint || (direction < 0 && (keys.sprintLeft || touch.sprintLeft)) || (direction > 0 && (keys.sprintRight || touch.sprintRight)));
      player.vx = direction * MOVE_SPEED * (sprinting ? 2 : 1);
      if (direction !== 0 && player.onGround) walkTime += dt * 10;

      // Horizontal movement and collision against solid blocks.
      player.x += player.vx * dt;
      let nearby = world.blocksInRect(player.x - BLOCK_SIZE, player.y - BLOCK_SIZE, player.x + player.width + BLOCK_SIZE, player.y + player.height + BLOCK_SIZE);
      for (const block of nearby) {
        if (!rectanglesOverlap(player.x, player.y, player.width, player.height, block.x, block.y, BLOCK_SIZE, BLOCK_SIZE)) continue;
        if (player.vx > 0) player.x = block.x - player.width;
        else if (player.vx < 0) player.x = block.x + BLOCK_SIZE;
      }

      // Track the start of a fall. The original game applies damage only after four blocks.
      const oldY = player.y;
      const oldBottom = oldY + player.height;
      if (player.vy > 0 && player.fallStartY === null) player.fallStartY = oldY;
      player.vy += GRAVITY * dt;
      const nextY = player.y + player.vy * dt;
      const nextBottom = nextY + player.height;
      player.y = nextY;
      player.onGround = false;
      nearby = world.blocksInRect(player.x - 1, Math.min(oldY, nextY) - 1, player.x + player.width + 1, Math.max(oldBottom, nextBottom) + 1);
      for (const block of nearby) {
        const horizontalOverlap = player.x < block.x + BLOCK_SIZE && player.x + player.width > block.x;
        if (!horizontalOverlap) continue;
        if (player.vy >= 0 && oldBottom <= block.y + 2 && nextBottom >= block.y) {
          player.y = block.y - player.height; player.vy = 0; player.onGround = true;
          if (player.fallStartY !== null) {
            const fallDistance = Math.max(0, player.y - player.fallStartY);
            if (fallDistance > FALL_DAMAGE_THRESHOLD) {
              const damage = Math.max(1, Math.floor((fallDistance - FALL_DAMAGE_THRESHOLD) / BLOCK_SIZE));
              damagePlayer(damage, "Fall damage");
            }
            player.fallStartY = null;
          }
        } else if (player.vy < 0 && oldY >= block.y + BLOCK_SIZE - 2 && nextY <= block.y + BLOCK_SIZE) {
          player.y = block.y + BLOCK_SIZE; player.vy = 0;
        }
      }
    } else { player.vx = 0; }

    updateDrops(dt);
    for (const [key, state] of furnaces) updateFurnace(state, dt);
    mobs.update(dt, player, world, BLOCK_SIZE, surfaceY, clock.night, amount => damagePlayer(amount, "Mob attack"), onMobDeath);
    updateSurvival(dt);
    keepPlayerInWorld();
    world.generateAround(player.x);
    updateCamera(false, dt);
    if (furnacePanel && !furnacePanel.hidden && Math.floor(clock.minutes * 2) !== Math.floor((clock.minutes - dt) * 2)) renderFurnacePanel();
  }

  function drawBlock(block, width, height) {
    const x = Math.round(block.x - camera.x);
    const y = Math.round(block.y - camera.y);
    if (x < -BLOCK_SIZE || x > width || y < -BLOCK_SIZE || y > height) return;
    const colors = COLORS[block.type] || COLORS.dirt;
    ctx.fillStyle = colors.side;
    ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
    ctx.fillStyle = colors.top;
    ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, 9);
    ctx.fillStyle = colors.detail;
    // Repeatable pixel-like specks instead of one single ground image.
    for (let i = 0; i < 5; i++) {
      const px = x + 5 + ((block.x / BLOCK_SIZE * 13 + i * 11) % 29 + 29) % 29;
      const py = y + 14 + ((block.y / BLOCK_SIZE * 7 + i * 9) % 21 + 21) % 21;
      ctx.fillRect(px, py, 3, 3);
    }
    ctx.strokeStyle = "rgba(0,0,0,.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, y + .5, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
    if (block.type === "bedrock") {
      ctx.strokeStyle = "#11151b";
      ctx.beginPath(); ctx.moveTo(x + 5, y + 7); ctx.lineTo(x + 33, y + 31); ctx.moveTo(x + 28, y + 4); ctx.lineTo(x + 8, y + 36); ctx.stroke();
    }
    if (["coal", "iron", "gold", "diamond"].includes(block.type)) {
      ctx.fillStyle = colors.detail;
      for (let i = 0; i < 5; i++) { const ox = 5 + ((i * 13 + block.x / BLOCK_SIZE * 3) % 27); const oy = 12 + ((i * 9 + block.y / BLOCK_SIZE * 5) % 24); ctx.fillRect(x + ox, y + oy, 6, 5); }
    }
    if (block.type === "crafting_table") {
      ctx.strokeStyle = "#4e2d1c"; ctx.lineWidth = 2; ctx.strokeRect(x + 5, y + 12, 30, 25); ctx.beginPath(); ctx.moveTo(x + 5, y + 21); ctx.lineTo(x + 35, y + 21); ctx.moveTo(x + 20, y + 12); ctx.lineTo(x + 20, y + 37); ctx.stroke();
    }
    if (block.type === "furnace") {
      ctx.fillStyle = "#25282d"; ctx.fillRect(x + 9, y + 13, 22, 21); ctx.fillStyle = "#ff9b39"; ctx.fillRect(x + 15, y + 24, 10, 8); ctx.fillStyle = "#f5d16a"; ctx.fillRect(x + 18, y + 21, 4, 9);
    }
    if (block.type === "torch") {
      ctx.fillStyle = "#754521"; ctx.fillRect(x + 18, y + 15, 5, 23); ctx.fillStyle = "#ffbe39"; ctx.fillRect(x + 16, y + 7, 9, 12); ctx.fillStyle = "#fff1a5"; ctx.fillRect(x + 19, y + 8, 3, 7);
    }
    if (hoveredBlock === block && selectedBlock !== block) {
      ctx.strokeStyle = "rgba(255,255,255,.95)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
      ctx.lineWidth = 1;
    }
    if (selectedBlock === block) {
      ctx.strokeStyle = "#fff36a";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
      ctx.lineWidth = 1;
    }
    if (breakState && breakState.target === block) {
      const progress = Math.min(1, (performance.now() - breakState.startedAt) / breakState.duration);
      ctx.strokeStyle = "rgba(25,25,25,.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 5); ctx.lineTo(x + 18, y + 18); ctx.lineTo(x + 12, y + 27);
      if (progress > .25) { ctx.moveTo(x + 18, y + 18); ctx.lineTo(x + 30, y + 10); }
      if (progress > .5) { ctx.moveTo(x + 18, y + 18); ctx.lineTo(x + 31, y + 31); }
      if (progress > .75) { ctx.moveTo(x + 12, y + 27); ctx.lineTo(x + 4, y + 35); }
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(x, y - 6, BLOCK_SIZE, 4);
      ctx.fillStyle = "#ffe66d"; ctx.fillRect(x, y - 6, BLOCK_SIZE * progress, 4);
    }
  }

  function render() {
    const width = gameShell.clientWidth;
    const height = gameShell.clientHeight;
    const light = clock.light;
    const topNight = [8, 15, 36], bottomNight = [31, 43, 67];
    const topDay = [105, 200, 250], bottomDay = [212, 242, 255];
    const mixColor = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
    const skyTop = mixColor(topNight, topDay, light), skyBottom = mixColor(bottomNight, bottomDay, light);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, rgb(skyTop)); gradient.addColorStop(1, rgb(skyBottom));
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);

    if (clock.night || clock.phase === "sunrise" || clock.phase === "sunset") {
      // Stable pseudo-random stars; no per-frame random flicker.
      if (clock.night) {
        ctx.fillStyle = "rgba(255,255,235,.78)";
        for (let i = 0; i < 42; i++) {
          const sx = (i * 97 + 31) % Math.max(1, width), sy = (i * 53 + 17) % Math.max(1, Math.floor(height * .58));
          ctx.fillRect(sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
        }
        ctx.fillStyle = "#f0edca"; ctx.beginPath(); ctx.arc(width - 82, 83, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgb(skyTop); ctx.beginPath(); ctx.arc(width - 73, 76, 20, 0, Math.PI * 2); ctx.fill();
      } else {
        const sunAlpha = Math.max(.18, light);
        ctx.globalAlpha = sunAlpha; ctx.fillStyle = "#fff1a8"; ctx.beginPath(); ctx.arc(width - 80, 90, 27, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
    } else {
      ctx.fillStyle = "#fff1a8"; ctx.beginPath(); ctx.arc(width - 80, 90, 27, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = .55 * light;
    ctx.fillStyle = "#fff";
    for (const cloud of [{x:width*.22,y:100},{x:width*.55,y:145},{x:width*.78,y:65}]) {
      ctx.beginPath(); ctx.ellipse(cloud.x, cloud.y, 34, 10, 0, 0, Math.PI*2); ctx.ellipse(cloud.x-16, cloud.y+2, 16, 9, 0, 0, Math.PI*2); ctx.ellipse(cloud.x+13, cloud.y-5, 20, 13, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const visibleBlocks = world.blocksInRect(
      camera.x - BLOCK_SIZE, camera.y - BLOCK_SIZE,
      camera.x + width + BLOCK_SIZE, camera.y + height + BLOCK_SIZE
    );
    for (const block of visibleBlocks) drawBlock(block, width, height);
    drawDrops();
    mobs.draw(ctx, camera, width, height);

    // Pixel-art player adapted directly from player_draw.py (32x72 proportions).
    const px = Math.round(player.x - camera.x), py = Math.round(player.y - camera.y);
    const moving = Math.abs(player.vx) > 1 && player.onGround;
    const swing = moving ? Math.sin(walkTime) * 4 : 0;
    const outline = "#181b22", skin = "#e0b891", skinDark = "#be916e";
    const hair = "#342218", hairLight = "#533523";
    const shirt = "#3773cd", shirtLight = "#5291e1", shirtDark = "#2852a0";
    const pants = "#233773", pantsLight = "#324891", shoes = "#1c1c20";
    const faceRight = player.vx >= 0;
    ctx.fillStyle = "rgba(45,45,45,.8)";
    ctx.beginPath(); ctx.ellipse(px + 16, py + 71, 15, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    // Legs and shoes use the same offsets and swing as the Pygame renderer.
    const leftLegY = py + 55 - Math.round(swing), rightLegY = py + 55 + Math.round(swing);
    ctx.fillStyle = outline;
    ctx.fillRect(px + 4, leftLegY - 1, 12, 16); ctx.fillRect(px + 16, rightLegY - 1, 12, 16);
    ctx.fillStyle = pants;
    ctx.fillRect(px + 5, leftLegY, 10, 14); ctx.fillRect(px + 17, rightLegY, 10, 14);
    ctx.fillStyle = pantsLight;
    ctx.fillRect(px + 7, leftLegY, 4, 10); ctx.fillRect(px + 19, rightLegY, 4, 10);
    ctx.fillStyle = outline;
    ctx.fillRect(px + 3, py + 66 - Math.round(swing), 13, 5);
    ctx.fillRect(px + 16, py + 66 + Math.round(swing), 13, 5);
    ctx.fillStyle = shoes;
    ctx.fillRect(px + 5, py + 66 - Math.round(swing), 10, 3);
    ctx.fillRect(px + 17, py + 66 + Math.round(swing), 10, 3);
    // Torso, belt, arms and hands.
    ctx.fillStyle = outline; ctx.fillRect(px + 5, py + 28, 22, 30);
    ctx.fillStyle = shirt; ctx.fillRect(px + 7, py + 30, 18, 26);
    ctx.fillStyle = shirtLight; ctx.fillRect(px + 9, py + 32, 4, 17);
    ctx.fillStyle = shirtDark; ctx.fillRect(px + 7, py + 50, 18, 6);
    ctx.fillStyle = "#1c2337"; ctx.fillRect(px + 7, py + 48, 18, 3);
    ctx.fillStyle = "#e1be50"; ctx.fillRect(px + 15, py + 49, 4, 4);
    const armSwing = swing * .8;
    ctx.fillStyle = outline;
    ctx.fillRect(px - 1, py + 29 + armSwing, 8, 26); ctx.fillRect(px + 25, py + 29 - armSwing, 8, 26);
    ctx.fillStyle = skin;
    ctx.fillRect(px, py + 30 + armSwing, 6, 24); ctx.fillRect(px + 26, py + 30 - armSwing, 6, 24);
    ctx.fillStyle = skinDark;
    ctx.fillRect(px, py + 47 + armSwing, 6, 7); ctx.fillRect(px + 26, py + 47 - armSwing, 6, 7);
    // Neck, head outline, skin, ears and hair.
    ctx.fillStyle = outline; ctx.fillRect(px + 11, py + 24, 10, 8);
    ctx.fillStyle = skin; ctx.fillRect(px + 12, py + 25, 8, 7);
    const hx = px + 2, hy = py + 2;
    ctx.fillStyle = outline; ctx.fillRect(hx - 1, hy - 1, 26, 27);
    ctx.fillStyle = skin; ctx.fillRect(hx, hy, 24, 25);
    ctx.fillStyle = skinDark; ctx.fillRect(hx - 3, hy + 12, 4, 7); ctx.fillRect(hx + 23, hy + 12, 4, 7);
    ctx.fillStyle = hair; ctx.fillRect(hx, hy, 24, 7); ctx.fillRect(hx, hy + 5, 6, 12); ctx.fillRect(hx + 18, hy + 5, 6, 9);
    ctx.fillStyle = hairLight; ctx.fillRect(hx + 4, hy + 2, 5, 3); ctx.fillRect(hx + 7, hy + 6, 4, 4);
    // Eyes follow facing direction, matching the original pixel-art face.
    const nearEye = hx + (faceRight ? 16 : 4), farEye = hx + (faceRight ? 20 : 1), eyeY = hy + 13;
    ctx.fillStyle = "#f8f8f5"; ctx.fillRect(nearEye - 1, eyeY - 1, 5, 5); ctx.fillRect(farEye - 1, eyeY, 4, 4);
    ctx.fillStyle = "#121212"; ctx.fillRect(nearEye + (faceRight ? 2 : 0), eyeY, 3, 3); ctx.fillRect(farEye + (faceRight ? 1 : 0), eyeY + 1, 2, 2);
    ctx.fillStyle = skinDark; ctx.fillRect(hx + (faceRight ? 21 : 0), hy + 17, 3, 3);
    ctx.fillStyle = "#693737"; ctx.fillRect(hx + 9, hy + 21, 7, 2);

    // Small crosshair at the last selected/tapped world position.
    if (pointerWorld) {
      const cx = pointerWorld.x - camera.x, cy = pointerWorld.y - camera.y;
      ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.stroke();
    }
    // Day/night and cave lighting are drawn above all world objects.
    applyDarkness(width, height);
    if (!player.alive) { ctx.fillStyle = "rgba(120,0,0,.18)"; ctx.fillRect(0, 0, width, height); }
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;
    if (!document.body.classList.contains("needs-landscape")) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("pointermove", event => {
    if (event.pointerType === "mouse") updateHoveredBlock(event);
  });
  canvas.addEventListener("pointerleave", event => {
    if (event.pointerType === "mouse") { hoveredBlock = null; render(); }
  });
  canvas.addEventListener("pointerdown", handleCanvasPointer);
  canvas.addEventListener("pointerup", event => {
    if (event.pointerType === "mouse" && event.button === 0 && breakState) {
      const elapsed = performance.now() - breakState.startedAt;
      if (elapsed < breakState.duration) cancelBreaking(true);
    }
  });
  canvas.addEventListener("pointercancel", () => cancelBreaking(true));
  window.addEventListener("pointerup", event => {
    if (event.pointerType === "mouse" && event.button === 0 && breakState) {
      const elapsed = performance.now() - breakState.startedAt;
      if (elapsed < breakState.duration) cancelBreaking(true);
    }
  });
  window.addEventListener("pointercancel", () => cancelBreaking(true));
  canvas.addEventListener("contextmenu", event => event.preventDefault());

  // Mouse wheel: scroll the inventory grid while the pointer is over the inventory;
  // otherwise cycle through the nine hotbar slots, just like a sandbox game.
  window.addEventListener("wheel", event => {
    const target = event.target;
    if (target && target.closest && target.closest("#inventory-panel")) {
      const scroller = inventoryElement && inventoryElement.querySelector(".inventory-grid-scroll");
      if (scroller) {
        event.preventDefault();
        scroller.scrollTop += event.deltaY;
      }
      return;
    }
    if (target && target.closest && target.closest("#game-canvas, #hotbar")) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? 1 : -1;
      selectedSlot = (selectedSlot + direction + 9) % 9;
      renderInventory();
      const stack = inventory[selectedSlot];
      setStatus(stack ? `Selected: ${typeName(stack.type)} ×${stack.count}` : `Hotbar slot ${selectedSlot + 1} is empty`);
    }
  }, { passive: false });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && anyPanelOpen()) { event.preventDefault(); closeAllPanels(); return; }
    keyDown(event);
  });
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", () => { releaseInputs(); saveGame(false); });
  window.addEventListener("beforeunload", () => saveGame(false));
  document.addEventListener("visibilitychange", () => { if (document.hidden) { releaseInputs(); saveGame(false); } });
  connectHoldButton(leftButton, "left");
  connectHoldButton(rightButton, "right");
  jumpButton.addEventListener("pointerdown", event => { event.preventDefault(); jump("touch"); });
  connectBreakHold(breakButton);
  connectBreakHold(touchBreakButton);
  if (craftingToggle) craftingToggle.addEventListener("click", () => { if (anyPanelOpen()) closeAllPanels(); else openCraftingMenu(false); });
  inventoryToggle.addEventListener("click", () => {
    if (craftingPanel && !craftingPanel.hidden || furnacePanel && !furnacePanel.hidden) closeAllPanels();
    else { inventoryOpen = !inventoryOpen; renderInventory(); }
  });
  placeButton.addEventListener("click", placeBlockNearSelection);
  touchPlaceButton.addEventListener("click", placeBlockNearSelection);
  if (touchAttackButton) touchAttackButton.addEventListener("click", attackAtPointer);
  if (touchEatButton) touchEatButton.addEventListener("pointerdown", event => { event.preventDefault(); eatSelectedFood(); });
  if (touchInteractButton) touchInteractButton.addEventListener("click", () => {
    if (!interactAtWorldPoint(pointerWorld)) setStatus("میزکار یا کوره‌ای را انتخاب کن و تعامل را بزن");
  });
  if (saveButton) saveButton.addEventListener("click", () => saveGame(true));
  if (loadButton) loadButton.addEventListener("click", () => loadGame(true));
  if (newGameButton) newGameButton.addEventListener("click", () => { if (window.confirm("Start a new world? The saved world on this device will be replaced.")) { localStorage.removeItem("minecraft2d-web-save-v3"); window.location.reload(); } });
  const respawnButton = document.getElementById("respawn-button");
  const deathExitButton = document.getElementById("death-exit-button");
  if (respawnButton) respawnButton.addEventListener("click", respawnPlayer);
  const menuContinueButton = document.getElementById("menu-continue-button");
  const menuLoadButton = document.getElementById("menu-load-button");
  const menuNewButton = document.getElementById("menu-new-button");
  if (deathExitButton) deathExitButton.addEventListener("click", () => {
    saveGame(false);
    if (deathPanel) deathPanel.hidden = true;
    if (mainMenuPanel) mainMenuPanel.hidden = false;
    releaseInputs();
  });
  if (menuContinueButton) menuContinueButton.addEventListener("click", () => {
    if (mainMenuPanel) mainMenuPanel.hidden = true;
    if (!player.alive && deathPanel) deathPanel.hidden = false;
  });
  if (menuLoadButton) menuLoadButton.addEventListener("click", () => {
    if (loadGame(true) && mainMenuPanel) mainMenuPanel.hidden = true;
  });
  if (menuNewButton) menuNewButton.addEventListener("click", () => {
    if (window.confirm("Start a new world? The saved world on this device will be replaced.")) {
      localStorage.removeItem("minecraft2d-web-save-v3");
      window.location.reload();
    }
  });
  tryLandscapeButton.addEventListener("click", requestLandscape);
  window.addEventListener("resize", () => { updateDeviceMode(); resizeCanvas(); });
  window.addEventListener("orientationchange", () => requestAnimationFrame(() => { updateDeviceMode(); resizeCanvas(); }));
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener("change", () => requestAnimationFrame(() => { updateDeviceMode(); resizeCanvas(); }));

  // Spawn directly above the generated surface, matching the original game's terrain start.
  player.y = surfaceY(player.x) - player.height;
  player.onGround = false;
  world.generateAround(player.x);
  renderInventory();
  const resumed = loadGame(false);
  updateDeviceMode();
  resizeCanvas();
  updateCamera(true);
  renderHud();
  worldReady = true;
  console.log("[INIT] Minecraft2D Web survival systems loaded", {
    blocks: world.blocks.length, chunks: world.loadedChunks.size, blockSize: BLOCK_SIZE
  });
  requestAnimationFrame(loop);
})();
