// Shared inline-style tokens for the Spoluvíc pastel design system, used
// across pages so headings/cards/fields/labels stay consistent without
// each page re-deriving the same values. See design_handoff_spoluvic_web/README.md.

export const svPageTitle = { font: "500 19px 'Outfit', sans-serif", letterSpacing: '-0.03em', color: 'var(--sv-ink)' };
export const svSubtitle = { font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' };
export const svMeta = { font: "300 12px 'Outfit', sans-serif", color: 'var(--sv-meta)' };
export const svSectionLabel = { font: "500 10px 'IBM Plex Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--sv-meta)' };

export const svCard = { background: 'var(--sv-surface)', border: '1px solid var(--sv-hairline)', borderRadius: 'var(--sv-r-card)' };

export const svField = {
  width: '100%', background: 'var(--sv-surface)', border: '1px solid var(--sv-hairline)',
  borderRadius: 10, boxShadow: 'none', font: "300 13px 'Outfit', sans-serif", color: 'var(--sv-ink)',
};
export const svLabel = { display: 'block', marginBottom: 6, font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)' };

export const svActionPill = { background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', borderRadius: 'var(--sv-r-pill)' };
export const svQuietPill = { background: 'var(--sv-action-bg-quiet)', color: 'var(--sv-action-ink-quiet)', borderRadius: 'var(--sv-r-pill)' };
