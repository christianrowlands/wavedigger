/**
 * Spiral pattern generator for tile searching
 * Based on apple-corelocation-experiments implementation
 */

export class Spiral {
  private x: number = 0;
  private y: number = 0;
  private dx: number = 0;
  private dy: number = -1;
  private offsetX: number;
  private offsetY: number;

  constructor(offsetX: number, offsetY: number) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  /**
   * Get the next coordinates in the spiral pattern
   * @returns [x, y] coordinates offset by the initial position
   */
  next(): [number, number] {
    const currentX = this.x;
    const currentY = this.y;
    
    // Spiral algorithm: when we hit a corner, turn right
    if ((this.x === this.y) || 
        (this.x < 0 && this.x === -this.y) || 
        (this.x > 0 && this.x === 1 - this.y)) {
      // Turn right: swap dx/dy and negate the new dx
      const temp = this.dx;
      this.dx = -this.dy;
      this.dy = temp;
    }
    
    // Move to next position
    this.x += this.dx;
    this.y += this.dy;
    
    return [currentX + this.offsetX, currentY + this.offsetY];
  }

  /**
   * Reset the spiral to start position
   */
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = -1;
  }
}