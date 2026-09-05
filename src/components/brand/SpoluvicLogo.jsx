// Spoluvíc mark — two 8-bit circles that overlap; the intersection is a
// third, fixed color (never a blend mode — see design_handoff_spoluvic_web/logo/LOGO.md).
// Do not redraw, round, smooth, gradient, rotate, or mirror this. It's a
// fixed pixel grid; only import/use it as-is.

const PALETTE = {
  // [left circle, intersection, right circle]
  lime: ["#A4D229", "#5A3FB0", "#7C5CE0"],
  orange: ["#FFB033", "#5A3FB0", "#7C5CE0"],
  "mono-ink": ["#26222B", "#FFFFFF", "#26222B"],
  "mono-cream": ["#FFE9D6", "#26222B", "#FFE9D6"],
};

// 8x8 pixel circle: [xOffset, width] per row, in grid blocks.
const ROWS = [[2, 4], [1, 6], [0, 8], [0, 8], [0, 8], [0, 8], [1, 6], [2, 4]];
const B = 8; // one pixel block in viewBox units

export function SpoluvicMark({ variant = "orange", height = 32, knockout, ...rest }) {
  const [left, overDefault, right] = PALETTE[variant];
  const over = variant.startsWith("mono") ? knockout ?? overDefault : overDefault;
  return (
    <svg viewBox={`0 0 ${12 * B} ${8 * B}`} height={height} shapeRendering="crispEdges"
         role="img" aria-label="Spoluvíc" {...rest}>
      {ROWS.flatMap(([o, w], i) => {
        const y = i * B;
        const seg = (x, width, fill, key) => (
          <rect key={key} x={x * B} y={y} width={width * B} height={B} fill={fill} />
        );
        return [
          seg(o, 4, left, `l${i}`),
          w > 4 ? seg(o + 4, w - 4, over, `m${i}`) : null,
          seg(o + w, 4, right, `r${i}`),
        ].filter(Boolean);
      })}
    </svg>
  );
}

// Mark + wordmark. Requires the Outfit webfont (600) to be loaded.
export function SpoluvicLockup({ variant = "orange", height = 32, color = "#26222B", knockout }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: height * 0.34 }}>
      <SpoluvicMark variant={variant} height={height} knockout={knockout} />
      <span style={{
        font: `600 ${height * 1.15}px Outfit, system-ui, sans-serif`,
        letterSpacing: "-0.025em", color, lineHeight: 1,
      }}>Spoluvíc</span>
    </span>
  );
}
