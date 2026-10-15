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

  if (!canvas || !ctx || !window.MinecraftWorld) throw new Error("Game setup failed. Check index.html and world.js.");

  const { World, BLOCK_SIZE, COLORS, rectanglesOverlap } = window.MinecraftWorld;
  const world = new World();
  const player = { x: 80, y: -120, width: 28, height: 52, vx: 0, vy: 0, onGround: false };
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
    player.x = Math.max(-BLOCK_SIZE * 20, Math.min(player.x, BLOCK_SIZE * 100));
    if (viewWidth <= 0) player.x = 80;
  }

  function updateCamera() {
    const w = gameShell.clientWidth;
    const h = gameShell.clientHeight;
    camera.x = player.x + player.width / 2 - w * 0.45;
    // Ground is stored at world Y=0; offset the camera so it appears near the bottom of the screen.
    camera.y = -Math.floor(h * 0.72);
    camera.x = Math.max(-BLOCK_SIZE * 20, Math.min(camera.x, BLOCK_SIZE * 100 - w));
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
    if (!event.repeat && (key === "e" || code === "KeyE" || code === "Backspace" || code === "Delete")) { event.preventDefault(); startBreaking(hoveredBlock || selectedBlock); }
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
    return ({ grass: "چمن", dirt: "خاک", stone: "سنگ", wood: "چوب", leaves: "برگ", bedrock: "سنگ‌بستر" })[type] || type;
  }

  function breakSelectedBlock(target = selectedBlock) {
    if (!target || !world.blocks.includes(target)) { setStatus("اول یک بلاک را انتخاب کن"); return false; }
    if (target.type === "bedrock") { setStatus("سنگ‌بستر قابل شکستن نیست"); return false; }
    if (!isInReach(target)) { setStatus("بلاک خارج از دسترس است"); return false; }
    const name = typeName(target.type);
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
    const type = blockTypeSelect.value;
    const newBlock = world.addBlock(placeAt.x, placeAt.y, type);
    if (newBlock) {
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
    const type = blockTypeSelect.value;
    const newBlock = world.addBlock(placeAt.x, placeAt.y, type);
    if (newBlock) {
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

    // Pixel-art player with hair, eyes, nose, smile, shirt seams and shoes.
    const px = Math.round(player.x - camera.x), py = Math.round(player.y - camera.y);
    // Soft shadow
    ctx.fillStyle = "rgba(20,35,25,.22)";
    ctx.beginPath(); ctx.ellipse(px + player.width / 2, py + player.height + 2, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Legs and shoes
    ctx.fillStyle = "#29384f";
    ctx.fillRect(px + 4, py + 35, 9, 13); ctx.fillRect(px + player.width - 13, py + 35, 9, 13);
    ctx.fillStyle = "#202631";
    ctx.fillRect(px + 2, py + 47, 12, 5); ctx.fillRect(px + player.width - 14, py + 47, 12, 5);
    // Shirt and sleeves
    ctx.fillStyle = "#2874c7"; ctx.fillRect(px + 3, py + 20, player.width - 6, 17);
    ctx.fillStyle = "#174d91"; ctx.fillRect(px + 1, py + 22, 5, 12); ctx.fillRect(px + player.width - 6, py + 22, 5, 12);
    ctx.fillStyle = "#77c5ff"; ctx.fillRect(px + 7, py + 22, 3, 12); ctx.fillRect(px + player.width - 10, py + 22, 3, 12);
    // Neck and face
    ctx.fillStyle = "#dca47f"; ctx.fillRect(px + 10, py + 17, 8, 6);
    ctx.fillStyle = "#f1c39e"; ctx.fillRect(px + 4, py + 5, player.width - 8, 16);
    // Hair fringe and side hair
    ctx.fillStyle = "#4b2e20";
    ctx.fillRect(px + 3, py + 2, player.width - 6, 6);
    ctx.fillRect(px + 3, py + 6, 4, 8); ctx.fillRect(px + player.width - 7, py + 6, 4, 8);
    ctx.fillStyle = "#68402a"; ctx.fillRect(px + 9, py + 3, 8, 3);
    // Eyes with tiny highlights, nose and a small smile
    ctx.fillStyle = "#ffffff"; ctx.fillRect(px + 7, py + 9, 5, 5); ctx.fillRect(px + player.width - 12, py + 9, 5, 5);
    ctx.fillStyle = "#263447"; ctx.fillRect(px + 9, py + 10, 2, 4); ctx.fillRect(px + player.width - 10, py + 10, 2, 4);
    ctx.fillStyle = "#c58b69"; ctx.fillRect(px + player.width / 2 - 1, py + 13, 3, 3);
    ctx.fillStyle = "#8d4d43"; ctx.fillRect(px + 10, py + 17, 8, 2);

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
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", releaseInputs);
  document.addEventListener("visibilitychange", () => { if (document.hidden) releaseInputs(); });
  connectHoldButton(leftButton, "left");
  connectHoldButton(rightButton, "right");
  jumpButton.addEventListener("pointerdown", event => { event.preventDefault(); jump("touch"); });
  connectBreakHold(breakButton);
  connectBreakHold(touchBreakButton);
  placeButton.addEventListener("click", placeBlockNearSelection);
  touchPlaceButton.addEventListener("click", placeBlockNearSelection);
  tryLandscapeButton.addEventListener("click", requestLandscape);
  window.addEventListener("resize", () => { updateDeviceMode(); resizeCanvas(); });
  window.addEventListener("orientationchange", () => requestAnimationFrame(() => { updateDeviceMode(); resizeCanvas(); }));
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener("change", () => requestAnimationFrame(() => { updateDeviceMode(); resizeCanvas(); }));

  // Start on the top of the individual grass blocks.
  player.y = -player.height;
  player.onGround = false;
  updateDeviceMode();
  resizeCanvas();
  worldReady = true;
  console.log("[INIT] Block-based Minecraft Web loaded", { blocks: world.blocks.length, blockSize: BLOCK_SIZE });
  requestAnimationFrame(loop);
})();
