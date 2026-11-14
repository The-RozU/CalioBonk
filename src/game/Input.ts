export class Input {
  private pressed = new Set<string>();
  private justPressed = new Set<string>();
  private readonly canvas: HTMLCanvasElement;
  public yaw = 0.58;
  public pitch = 0.35;
  public active = false;
  public onLockChange: (active: boolean) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', (event) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (!this.pressed.has(event.code)) this.justPressed.add(event.code);
      this.pressed.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.pressed.delete(event.code));
    window.addEventListener('blur', () => this.clearKeys());
    document.addEventListener('mousemove', (event) => {
      if (!this.active) return;
      this.yaw -= event.movementX * 0.00225;
      this.pitch = Math.max(-0.16, Math.min(0.95, this.pitch + event.movementY * 0.0021));
    });
    document.addEventListener('pointerlockchange', () => {
      this.active = document.pointerLockElement === this.canvas;
      if (!this.active) this.clearKeys();
      this.onLockChange(this.active);
    });
  }

  private clearKeys(): void {
    this.pressed.clear();
    this.justPressed.clear();
  }
  down(code: string): boolean { return this.pressed.has(code); }
  // Key presses are consumed once, so holding Shift cannot repeat a dash.
  consumePress(code: string): boolean {
    const wasPressed = this.justPressed.has(code);
    this.justPressed.delete(code);
    return wasPressed;
  }
  async lock(): Promise<void> { await this.canvas.requestPointerLock(); }
  getAxes(): {forward: number; right: number} {
    let forward = (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0) - (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0);
    let right = (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0) - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0);
    const length = Math.hypot(forward, right);
    if (length > 1) { forward /= length; right /= length; }
    return {forward, right};
  }
}
