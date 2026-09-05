// Spoluvíc line icons, 16x16, stroke-width 1.2, inherits currentColor.
// Don't draw new icons in a different grid — match this one (16x16, stroke
// 1.2, no fills) if a missing icon needs adding. See design_handoff_spoluvic_web/icons/.
const PATHS = {
  home: `<path d="M2.5 7 8 2.5 13.5 7v6.5h-11V7Z"/>`,
  popular: `<path d="M2.5 11.5 6 7l3 2.5 4.5-5.5"/>`,
  star: `<path d="M8 3.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L8 11.7l-3.2 1.7.6-3.6L2.8 7.3l3.6-.5L8 3.5Z"/>`,
  calendar: `<rect x="2.5" y="3.5" width="11" height="10" rx="2"/><path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5"/>`,
  message: `<path d="M2.5 4.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H7l-3 2.3V11H2.5V4.5Z"/>`,
  search: `<circle cx="7" cy="7" r="4.6"/><path d="M10.4 10.4 14 14"/>`,
  pin: `<path d="M8 14s4.5-4.4 4.5-7.5A4.5 4.5 0 0 0 3.5 6.5C3.5 9.6 8 14 8 14Z"/><circle cx="8" cy="6.4" r="1.6"/>`,
  users: `<circle cx="6" cy="6" r="2.2"/><path d="M2 13c0-2.2 1.8-3.4 4-3.4s4 1.2 4 3.4"/><circle cx="11.4" cy="6.4" r="1.8"/>`,
  bell: `<path d="M4 7a4 4 0 0 1 8 0c0 3 1 4 1 4H3s1-1 1-4Z"/><path d="M6.6 13.4a1.6 1.6 0 0 0 2.8 0"/>`,
  filter: `<path d="M2 3.5h12M4 8h8M6.5 12.5h3"/>`,
  plus: `<path d="M8 3.5v9M3.5 8h9"/>`,
  clock: `<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.3l2.2 1.4"/>`,
};

export function SvIcon({ name, size = 14, ...rest }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}
         dangerouslySetInnerHTML={{ __html: PATHS[name] }} />
  );
}
