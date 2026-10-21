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

  if (!canvas || !ctx || !window.MinecraftWorld) throw new Error("Game setup failed. Check index.html and world.js.");

  const { World, BLOCK_SIZE, COLORS, rectanglesOverlap } = window.MinecraftWorld;
  const world = new World();
  const player = { x: 80, y: -120, width: 32, height: 72, vx: 0, vy: 0, onGround: false };
  const camera = { x: 0, y: 0 };
  const keys = { left: false, right: false };
  const touch = { left: false, right: false };
  let selectedBlock = null;
  let hoveredBlock = null;
  let pointerWorld = null;
  let lastTime = 0;
  let worldReady = false;
  let dpr = 1;
  let breakState = null;
  const drops = [];
  const inventory = Array(36).fill(null);
  let selectedSlot = 0;
  let inventoryOpen = false;
  let walkTime = 0;
  let dragSourceIndex = null;
  let dragStartPoint = null;
  let pendingTouchMoveIndex = null;
  let suppressSlotClick = false;
  const STACK_LIMIT = 64;
  const PLACEABLE_TYPES = new Set(["grass", "dirt", "stone", "wood", "leaves"]);
  const BREAK_DURATION_MS = 1500;

  const MOVE_SPEED = 260;
  const GRAVITY = 1500;
  const JUMP_SPEED = 560;
  const MAX_INTERACT_DISTANCE = BLOCK_SIZE * 5;

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

  function resizeCanvas() {
    const rect = gameShell.getBoundingClientRect();
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    keepPlayerInWorld();
    updateCamera();
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
    keys.left = keys.right = touch.left = touch.right = false;
    cancelBreaking();
  }

  function keepPlayerInWorld() {
    const viewWidth = gameShell.clientWidth;
    // Keep the player in the visible camera area, while the camera can follow along the world.
    if (!Number.isFinite(player.x)) player.x = 80;
    player.x = Math.max(-BLOCK_SIZE * 100, Math.min(player.x, BLOCK_SIZE * 300));
    if (viewWidth <= 0) player.x = 80;
  }

  function updateCamera() {
    const w = gameShell.clientWidth;
    const h = gameShell.clientHeight;
    camera.x = player.x + player.width / 2 - w * 0.45;
    // Ground is stored at world Y=0; offset the camera so it appears near the bottom of the screen.
    camera.y = -Math.floor(h * 0.72);
    camera.x = Math.max(-BLOCK_SIZE * 100, Math.min(camera.x, BLOCK_SIZE * 300 - w));
  }

  function jump(source) {
    if (document.body.classList.contains("needs-landscape")) return;
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
    if (code === "KeyA" || key === "a" || code === "ArrowLeft") { keys.left = true; event.preventDefault(); }
    if (code === "KeyD" || key === "d" || code === "ArrowRight") { keys.right = true; event.preventDefault(); }
    if (code === "Space" || code === "ArrowUp" || key === "w") { event.preventDefault(); if (!event.repeat) jump("keyboard"); }
    if (!event.repeat && (key === "e" || code === "KeyE")) { event.preventDefault(); inventoryOpen = !inventoryOpen; renderInventory(); return; }
    if (!event.repeat && /^[1-9]$/.test(key)) { selectedSlot = Number(key) - 1; renderInventory(); }
    if (!event.repeat && (code === "Backspace" || code === "Delete")) { event.preventDefault(); startBreaking(hoveredBlock || selectedBlock); }
    if (!event.repeat && (key === "q" || code === "KeyQ")) { event.preventDefault(); placeBlockNearSelection(); }
  }

  function keyUp(event) {
    const code = event.code;
    const key = event.key.toLowerCase();
    if (code === "KeyA" || key === "a" || code === "ArrowLeft") keys.left = false;
    if (code === "KeyD" || key === "d" || code === "ArrowRight") keys.right = false;
    if (key === "e" || code === "KeyE" || code === "Backspace" || code === "Delete") cancelBreaking();
  }

  function connectHoldButton(button, direction) {
    if (!button) return;
    const pointers = new Set();
    button.addEventListener("pointerdown", event => {
      if (document.body.classList.contains("needs-landscape")) return;
      event.preventDefault();
      pointers.add(event.pointerId);
      touch[direction] = true;
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    });
    const stop = event => { pointers.delete(event.pointerId); touch[direction] = pointers.size > 0; };
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
    if (document.body.classList.contains("needs-landscape")) return;
    pointerWorld = screenToWorld(event);
    const block = blockAtPoint(pointerWorld);

    // Mouse: hold left button for 3 seconds to break; right-click places in one action.
    if (event.pointerType === "mouse") {
      event.preventDefault();
      if (event.button === 0) {
        if (block && isInReach(block)) {
          selectedBlock = block;
          startBreaking(block);
        } else {
          setStatus("برای شکستن، روی بلاک نزدیک کلیک چپ را ۱٫۵ ثانیه نگه دار");
        }
      } else if (event.button === 2) {
        placeAtWorldPoint(pointerWorld);
      }
      hoveredBlock = block && isInReach(block) ? block : null;
      render();
      return;
    }

    // Touch: tap selects a target; the bottom action buttons break/place it.
    if (block && isInReach(block)) {
      selectedBlock = block;
      setStatus(block.type === "bedrock" ? "سنگ‌بستر قابل شکستن نیست" : `انتخاب شد: ${typeName(block.type)}`);
    } else {
      selectedBlock = null;
      setStatus("بلاکی در این نقطه نیست یا از دسترس دور است");
    }
    hoveredBlock = block && isInReach(block) ? block : null;
    render();
  }

  function typeName(type) {
    return ({
      grass: "Grass Block / بلاک چمن", dirt: "Dirt / خاک", stone: "Stone / سنگ",
      wood: "Wood / چوب", leaves: "Leaves / برگ", bedrock: "Bedrock / سنگ‌بستر"
    })[type] || String(type || "Unknown").replaceAll("_", " ");
  }

  function slotMarkup(index, stack, selected = false) {
    const name = stack ? typeName(stack.type) : "Empty / خالی";
    return `<span class="slot-number">${index + 1}</span>${stack ? `<span class="slot-icon ${stack.type}"></span><span class="slot-count">${stack.count}</span>` : ""}<span class="slot-tooltip">${name}</span>`;
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

  function addItem(type, amount = 1) {
    let remaining = amount;
    for (const stack of inventory) {
      if (stack && stack.type === type && stack.count < STACK_LIMIT) {
        const added = Math.min(STACK_LIMIT - stack.count, remaining);
        stack.count += added; remaining -= added;
        if (!remaining) { renderInventory(); return true; }
      }
    }
    for (let i = 0; i < inventory.length; i++) {
      if (!inventory[i]) {
        const added = Math.min(STACK_LIMIT, remaining);
        inventory[i] = { type, count: added }; remaining -= added;
        if (!remaining) { renderInventory(); return true; }
      }
    }
    renderInventory();
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
    drops.push({ type: block.type, x: block.x + BLOCK_SIZE / 2 - 9, y: block.y + BLOCK_SIZE / 2 - 9,
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
      if (below && drop.vy > 0 && drop.y + 18 >= below.y && drop.y < below.y) {
        drop.y = below.y - 18; drop.vy = 0; drop.vx *= 0.6;
      }
      const dx = player.x + player.width / 2 - (drop.x + 9);
      const dy = player.y + player.height / 2 - (drop.y + 9);
      if (Math.hypot(dx, dy) < 58) {
        if (addItem(drop.type, 1)) {
          drops.splice(i, 1);
          setStatus(`${typeName(drop.type)} جمع شد و وارد Inventory شد`);
        }
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
    if (!target || !world.blocks.includes(target)) { setStatus("اول یک بلاک را انتخاب کن"); return false; }
    if (target.type === "bedrock") { setStatus("سنگ‌بستر قابل شکستن نیست"); return false; }
    if (!isInReach(target)) { setStatus("بلاک خارج از دسترس است"); return false; }
    const name = typeName(target.type);
    spawnDrop(target);
    world.removeBlock(target);
    if (selectedBlock === target) selectedBlock = null;
    if (hoveredBlock === target) hoveredBlock = null;
    breakState = null;
    setStatus(`${name} شکسته شد`);
    render();
    return true;
  }

  function startBreaking(target = hoveredBlock || selectedBlock) {
    if (!target || !world.blocks.includes(target)) { setStatus("اول روی یک بلاک نزدیک برو یا آن را انتخاب کن"); return; }
    if (target.type === "bedrock") { setStatus("سنگ‌بستر قابل شکستن نیست"); return; }
    if (!isInReach(target)) { setStatus("بلاک خارج از دسترس است"); return; }
    cancelBreaking(false);
    selectedBlock = target;
    breakState = { target, startedAt: performance.now(), timer: null };
    setStatus("در حال شکستن… ۱٫۵ ثانیه نگه دار");
    const state = breakState;
    state.timer = window.setTimeout(() => {
      if (breakState !== state) return;
      breakState = null;
      breakSelectedBlock(target);
    }, BREAK_DURATION_MS);
    render();
  }

  function cancelBreaking(showMessage = false) {
    if (!breakState) return;
    window.clearTimeout(breakState.timer);
    breakState = null;
    if (showMessage) setStatus("شکستن لغو شد؛ دکمه را ۱٫۵ ثانیه نگه دار");
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
        if (elapsed < BREAK_DURATION_MS) cancelBreaking(true);
      }
    };
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
  }

  function placeBlockAtPointer(block, point) {
    if (!block || !world.blocks.includes(block)) { setStatus("اول روی یک بلاک کلیک کن"); return; }
    if (!isInReach(block)) { setStatus("بلاک خارج از دسترس است"); return; }

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

    const placeAt = world.canPlace(x, y, playerRect());
    if (!placeAt) { setStatus("این محل پر است، به بلاک دیگری وصل نیست یا داخل بازیکن قرار می‌گیرد"); return; }
    const type = selectedItemType();
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
    if (!neighbors.some(isInReach)) { setStatus("برای قراردادن، کنار یک بلاک نزدیک را انتخاب کن"); return; }
    const placeAt = world.canPlace(gx, gy, playerRect());
    if (!placeAt) { setStatus("این محل پر است یا داخل بازیکن قرار می‌گیرد"); return; }
    const type = selectedItemType();
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
    const target = hoveredBlock || selectedBlock;
    const point = pointerWorld || (target ? { x: target.x + BLOCK_SIZE / 2, y: target.y + BLOCK_SIZE / 2 } : null);
    if (!target || !point) { setStatus("اول یک بلاک را لمس یا انتخاب کن"); return; }
    placeAtWorldPoint(point);
  }

  function update(dt) {
    const direction = (keys.left || touch.left ? -1 : 0) + (keys.right || touch.right ? 1 : 0);
    player.vx = direction * MOVE_SPEED;
    if (direction !== 0 && player.onGround) walkTime += dt * 10;

    // Horizontal movement and collision against individual blocks.
    player.x += player.vx * dt;
    let nearby = world.blocksInRect(player.x - BLOCK_SIZE, player.y - BLOCK_SIZE, player.x + player.width + BLOCK_SIZE, player.y + player.height + BLOCK_SIZE);
    for (const block of nearby) {
      if (!rectanglesOverlap(player.x, player.y, player.width, player.height, block.x, block.y, BLOCK_SIZE, BLOCK_SIZE)) continue;
      if (player.vx > 0) player.x = block.x - player.width;
      else if (player.vx < 0) player.x = block.x + BLOCK_SIZE;
    }

    // Swept vertical collision: catches the top/bottom face even after a long fall.
    const oldY = player.y;
    const oldBottom = oldY + player.height;
    player.vy += GRAVITY * dt;
    const nextY = player.y + player.vy * dt;
    const nextBottom = nextY + player.height;
    player.y = nextY;
    player.onGround = false;
    nearby = world.blocksInRect(
      player.x - 1,
      Math.min(oldY, nextY) - 1,
      player.x + player.width + 1,
      Math.max(oldBottom, nextBottom) + 1
    );
    for (const block of nearby) {
      const horizontalOverlap = player.x < block.x + BLOCK_SIZE &&
        player.x + player.width > block.x;
      if (!horizontalOverlap) continue;

      // Falling through a block's top face.
      if (player.vy >= 0 && oldBottom <= block.y + 2 && nextBottom >= block.y) {
        player.y = block.y - player.height;
        player.vy = 0;
        player.onGround = true;
      // Jumping into the underside of a block.
      } else if (player.vy < 0 && oldY >= block.y + BLOCK_SIZE - 2 && nextY <= block.y + BLOCK_SIZE) {
        player.y = block.y + BLOCK_SIZE;
        player.vy = 0;
      }
    }

    updateDrops(dt);
    keepPlayerInWorld();
    updateCamera();
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
      const progress = Math.min(1, (performance.now() - breakState.startedAt) / BREAK_DURATION_MS);
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
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#69c8fa");
    gradient.addColorStop(1, "#d4f2ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Sun and simple distant clouds.
    ctx.fillStyle = "#fff1a8"; ctx.beginPath(); ctx.arc(width - 80, 90, 27, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (const cloud of [{x:width*.22,y:100},{x:width*.55,y:145},{x:width*.78,y:65}]) {
      ctx.beginPath(); ctx.ellipse(cloud.x, cloud.y, 34, 10, 0, 0, Math.PI*2); ctx.ellipse(cloud.x-16, cloud.y+2, 16, 9, 0, 0, Math.PI*2); ctx.ellipse(cloud.x+13, cloud.y-5, 20, 13, 0, 0, Math.PI*2); ctx.fill();
    }

    for (const block of world.blocks) drawBlock(block, width, height);
    drawDrops();

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
      if (elapsed < BREAK_DURATION_MS) cancelBreaking(true);
    }
  });
  canvas.addEventListener("pointercancel", () => cancelBreaking(true));
  window.addEventListener("pointerup", event => {
    if (event.pointerType === "mouse" && event.button === 0 && breakState) {
      const elapsed = performance.now() - breakState.startedAt;
      if (elapsed < BREAK_DURATION_MS) cancelBreaking(true);
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
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", releaseInputs);
  document.addEventListener("visibilitychange", () => { if (document.hidden) releaseInputs(); });
  connectHoldButton(leftButton, "left");
  connectHoldButton(rightButton, "right");
  jumpButton.addEventListener("pointerdown", event => { event.preventDefault(); jump("touch"); });
  connectBreakHold(breakButton);
  connectBreakHold(touchBreakButton);
  inventoryToggle.addEventListener("click", () => { inventoryOpen = !inventoryOpen; renderInventory(); });
  placeButton.addEventListener("click", placeBlockNearSelection);
  touchPlaceButton.addEventListener("click", placeBlockNearSelection);
  tryLandscapeButton.addEventListener("click", requestLandscape);
  window.addEventListener("resize", () => { updateDeviceMode(); resizeCanvas(); });
  window.addEventListener("orientationchange", () => requestAnimationFrame(() => { updateDeviceMode(); resizeCanvas(); }));
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener("change", () => requestAnimationFrame(() => { updateDeviceMode(); resizeCanvas(); }));

  // Start on the top of the individual grass blocks.
  player.y = -player.height;
  player.onGround = false;
  renderInventory();
  updateDeviceMode();
  resizeCanvas();
  worldReady = true;
  console.log("[INIT] Block-based Minecraft Web loaded", { blocks: world.blocks.length, blockSize: BLOCK_SIZE });
  requestAnimationFrame(loop);
})();
