export interface PlayerInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action1: boolean; // Primary (Jump / Boost / Fire / Select)
  action2: boolean; // Secondary (Brake / Special / Back)
  pause: boolean;
  rawX: number; // -1 to 1 analog
  rawY: number; // -1 to 1 analog
}

class InputManager {
  private keysPressed: Set<string> = new Set();
  private touchInputs: { [playerId: number]: Partial<PlayerInputState> } = {};
  private pointerPos = { x: 0, y: 0, down: false };
  private gamepads: (Gamepad | null)[] = [];
  private listenersAttached = false;

  constructor() {
    this.attachListeners();
  }

  private attachListeners() {
    if (typeof window === 'undefined' || this.listenersAttached) return;
    this.listenersAttached = true;

    window.addEventListener('keydown', (e) => {
      this.keysPressed.add(e.code);
      // Prevent browser scroll on arrow/space keys during gaming
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        if ((e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.code);
    });

    window.addEventListener('pointermove', (e) => {
      this.pointerPos.x = e.clientX;
      this.pointerPos.y = e.clientY;
    });

    window.addEventListener('pointerdown', () => {
      this.pointerPos.down = true;
    });

    window.addEventListener('pointerup', () => {
      this.pointerPos.down = false;
    });

    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
    });
  }

  public updateGamepads() {
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      this.gamepads = Array.from(navigator.getGamepads());
    }
  }

  public setTouchInput(playerIndex: number, input: Partial<PlayerInputState>) {
    this.touchInputs[playerIndex] = {
      ...(this.touchInputs[playerIndex] || {}),
      ...input
    };
  }

  public resetTouchInput(playerIndex: number) {
    this.touchInputs[playerIndex] = {};
  }

  public getConnectedGamepadCount(): number {
    this.updateGamepads();
    return this.gamepads.filter((gp) => gp !== null).length;
  }

  public getPlayerInput(playerIndex = 0): PlayerInputState {
    this.updateGamepads();

    const state: PlayerInputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      action1: false,
      action2: false,
      pause: false,
      rawX: 0,
      rawY: 0
    };

    // 1. Keyboard bindings
    if (playerIndex === 0) {
      // Player 1: WASD or Arrow Keys, Space/E for action1, Shift/Q for action2
      if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) state.up = true;
      if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) state.down = true;
      if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) state.left = true;
      if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) state.right = true;
      if (this.keysPressed.has('Space') || this.keysPressed.has('KeyE') || this.keysPressed.has('KeyZ')) state.action1 = true;
      if (this.keysPressed.has('ShiftLeft') || this.keysPressed.has('KeyQ') || this.keysPressed.has('KeyX')) state.action2 = true;
      if (this.keysPressed.has('Escape')) state.pause = true;
    } else if (playerIndex === 1) {
      // Player 2: Arrow Keys, Enter/Numpad0
      if (this.keysPressed.has('ArrowUp')) state.up = true;
      if (this.keysPressed.has('ArrowDown')) state.down = true;
      if (this.keysPressed.has('ArrowLeft')) state.left = true;
      if (this.keysPressed.has('ArrowRight')) state.right = true;
      if (this.keysPressed.has('Enter') || this.keysPressed.has('ControlRight') || this.keysPressed.has('Slash')) state.action1 = true;
      if (this.keysPressed.has('ShiftRight') || this.keysPressed.has('Period')) state.action2 = true;
    } else if (playerIndex === 2) {
      // Player 3: IJKL, U/O
      if (this.keysPressed.has('KeyI')) state.up = true;
      if (this.keysPressed.has('KeyK')) state.down = true;
      if (this.keysPressed.has('KeyJ')) state.left = true;
      if (this.keysPressed.has('KeyL')) state.right = true;
      if (this.keysPressed.has('KeyU')) state.action1 = true;
      if (this.keysPressed.has('KeyO')) state.action2 = true;
    } else if (playerIndex === 3) {
      // Player 4: Numpad 8456 or TFGH
      if (this.keysPressed.has('Numpad8') || this.keysPressed.has('KeyT')) state.up = true;
      if (this.keysPressed.has('Numpad5') || this.keysPressed.has('Numpad2') || this.keysPressed.has('KeyG')) state.down = true;
      if (this.keysPressed.has('Numpad4') || this.keysPressed.has('KeyF')) state.left = true;
      if (this.keysPressed.has('Numpad6') || this.keysPressed.has('KeyH')) state.right = true;
      if (this.keysPressed.has('Numpad0') || this.keysPressed.has('KeyR')) state.action1 = true;
      if (this.keysPressed.has('NumpadDecimal') || this.keysPressed.has('KeyY')) state.action2 = true;
    }

    // 2. Gamepad API
    const gp = this.gamepads[playerIndex];
    if (gp && gp.connected) {
      // D-Pad or Left Stick
      const deadzone = 0.25;
      const stickX = gp.axes[0] || 0;
      const stickY = gp.axes[1] || 0;

      if (stickX < -deadzone || gp.buttons[14]?.pressed) state.left = true;
      if (stickX > deadzone || gp.buttons[15]?.pressed) state.right = true;
      if (stickY < -deadzone || gp.buttons[12]?.pressed) state.up = true;
      if (stickY > deadzone || gp.buttons[13]?.pressed) state.down = true;

      // Buttons (A: button 0, B: button 1, X: button 2, Start: button 9)
      if (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed) state.action1 = true;
      if (gp.buttons[1]?.pressed || gp.buttons[3]?.pressed) state.action2 = true;
      if (gp.buttons[9]?.pressed) state.pause = true;

      state.rawX = Math.abs(stickX) > deadzone ? stickX : 0;
      state.rawY = Math.abs(stickY) > deadzone ? stickY : 0;
    }

    // 3. Touch overrides (for player 0 primarily)
    const touch = this.touchInputs[playerIndex];
    if (touch) {
      if (touch.up) state.up = true;
      if (touch.down) state.down = true;
      if (touch.left) state.left = true;
      if (touch.right) state.right = true;
      if (touch.action1) state.action1 = true;
      if (touch.action2) state.action2 = true;
      if (touch.pause) state.pause = true;
    }

    // Calculate normalized rawX and rawY if not provided by analog stick
    if (state.rawX === 0) {
      if (state.left) state.rawX = -1;
      if (state.right) state.rawX = 1;
    }
    if (state.rawY === 0) {
      if (state.up) state.rawY = -1;
      if (state.down) state.rawY = 1;
    }

    return state;
  }

  public getPointer() {
    return { ...this.pointerPos };
  }

  public resetAll() {
    this.keysPressed.clear();
    this.touchInputs = {};
  }
}

export const input = new InputManager();
