import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageContext } from '@/lib/language';
import EventCard from './EventCard';

// Regression test for a real bug found via /code-review: the "Diskuze" link
// + join/leave button row was wrapped in a single `{!isFull && (...)}`, so a
// user already joined to an event that later filled up lost their only way
// to leave or reach the discussion from this card. Fixed to `(!isFull ||
// isJoined)` gating just the button, with the Diskuze link always shown.

const baseEvent = {
  id: 'e1', title: 'Test Event', category: 'Sport', date: new Date().toISOString(),
  max_capacity: 2, participants: ['a@x.com', 'b@x.com'], location: 'Praha',
};

function renderCard(props) {
  return render(
    <LanguageContext.Provider value={{ lang: 'cs', setLang: () => {} }}>
      <MemoryRouter>
        <EventCard event={baseEvent} onJoin={vi.fn()} onFavorite={vi.fn()} {...props} />
      </MemoryRouter>
    </LanguageContext.Provider>
  );
}

describe('EventCard', () => {
  it('shows the Diskuze link and a Go button when the event is not full', () => {
    renderCard({ event: { ...baseEvent, max_capacity: 5 }, isJoined: false });
    expect(screen.getByText('Diskuze')).toBeInTheDocument();
    expect(screen.getByText('Jdu')).toBeInTheDocument();
  });

  it('a joined user keeps the Diskuze link and their leave button even once the event is full', () => {
    renderCard({ isJoined: true }); // baseEvent is already at max_capacity
    expect(screen.getByText('Diskuze')).toBeInTheDocument();
    expect(screen.getByText('Jdeš')).toBeInTheDocument();
  });

  it('a non-joined viewer of a full event still sees Diskuze, but no join button', () => {
    renderCard({ isJoined: false }); // baseEvent is already at max_capacity
    expect(screen.getByText('Diskuze')).toBeInTheDocument();
    expect(screen.queryByText('Jdu')).not.toBeInTheDocument();
    expect(screen.queryByText('Jdeš')).not.toBeInTheDocument();
  });

  it('falls back to the "Other" category style for an unrecognized category rather than crashing', () => {
    renderCard({ event: { ...baseEvent, category: 'NopeNotACategory', max_capacity: 5 } });
    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });

  it('agrees "účastník" for 1, "účastníci" for 2-4, "účastníků" for 5+', () => {
    const { container: one } = renderCard({ event: { ...baseEvent, max_capacity: 5, participants: ['a@x.com'] } });
    expect(one.textContent).toContain('1 účastník ze 5');

    const { container: three } = renderCard({ event: { ...baseEvent, max_capacity: 5, participants: ['a@x.com', 'b@x.com', 'c@x.com'] } });
    expect(three.textContent).toContain('3 účastníci ze 5');

    const { container: seven } = renderCard({ event: { ...baseEvent, max_capacity: 10, participants: Array(7).fill('a@x.com') } });
    expect(seven.textContent).toContain('7 účastníků ze 10');
  });
});
