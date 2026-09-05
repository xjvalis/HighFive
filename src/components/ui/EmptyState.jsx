// 8-bit ring — the only pixel element in the UI besides the logo.
const RING = [[2, 4], [1, 6], [0, 8], [0, 8], [0, 8], [0, 8], [1, 6], [2, 4]];

export function PixelCircle({ size = 40, color = "#FFB84D" }) {
  const B = 8;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} shapeRendering="crispEdges" fill={color} aria-hidden style={{ display: "block", margin: "0 auto" }}>
      {RING.map(([o, w], i) => {
        const edge = i === 0 || i === RING.length - 1;
        return edge
          ? <rect key={i} x={o * B} y={i * B} width={w * B} height={B} />
          : <g key={i}>
              <rect x={o * B} y={i * B} width={B} height={B} />
              <rect x={(o + w - 1) * B} y={i * B} width={B} height={B} />
            </g>;
      })}
    </svg>
  );
}

// Empty state: circle, one title, one sentence. No illustrations, no emoji,
// no big CTA. Nonchalant tone — nothing has to happen.
export default function EmptyState({ title, note }) {
  return (
    <div style={{ padding: "22px 0 6px", textAlign: "center" }}>
      <PixelCircle />
      <div style={{ marginTop: 14, font: "500 13.5px 'Outfit', system-ui, sans-serif", color: "#4C4652" }}>{title}</div>
      {note && <div style={{ marginTop: 4, font: "300 12px 'Outfit', system-ui, sans-serif", color: "#8C8790" }}>{note}</div>}
    </div>
  );
}
