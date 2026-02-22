export interface GalaxyPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Arranges `count` items in a Fermat spiral for even space coverage.
 * @param count  Number of positions to compute
 * @param spread Overall radius of the spiral (default 80)
 */
export function computeGalaxyLayout(
  count: number,
  spread = 80
): GalaxyPosition[] {
  if (count === 0) return [];

  const positions: GalaxyPosition[] = [];
  const GOLDEN_ANGLE = 2.399963; // radians ≈ 137.5°

  for (let i = 0; i < count; i++) {
    const angle = i * GOLDEN_ANGLE;
    const r = spread * Math.sqrt(i / Math.max(count, 1));
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    // Small vertical drift for 3-D depth
    const y = Math.sin(i * 1.618) * r * 0.12;
    positions.push({ x, y, z });
  }

  return positions;
}
