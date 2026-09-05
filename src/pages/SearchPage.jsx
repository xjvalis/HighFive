import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCategoryStyle } from '@/lib/categories';
import { format } from 'date-fns';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { SvIcon } from '@/components/icons/SvIcon';
import EmptyState from '@/components/ui/EmptyState';
import { svSectionLabel, svMeta } from '@/lib/svStyles';

const RECENT_KEY = 'hf_recent_searches';

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecent(query) {
  const prev = getRecent().filter(q => q !== query);
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, 5)));
}
function clearRecent() {
  localStorage.removeItem(RECENT_KEY);
}

export default function SearchPage({ onClose }) {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState(getRecent());
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    // Focus input when opened
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase.from('events')
      .select('id, title, category, location, date, participants')
      .eq('is_approved', true)
      .gt('date', new Date().toISOString())
      .or(`title.ilike.%${q}%,location.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
      .order('date', { ascending: true })
      .limit(20);
    setResults(data || []);
    setLoading(false);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  };

  const handleSelect = (event) => {
    saveRecent(event.title);
    setRecent(getRecent());
    onClose();
    navigate(`/event/${event.id}`);
  };

  const handleRecentClick = (q) => {
    setQuery(q);
    search(q);
  };

  const handleClearRecent = () => {
    clearRecent();
    setRecent([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', background: 'var(--sv-bg)', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      {/* Search input bar */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--sv-hairline)' }}>
        <div className="flex-1 relative">
          <SvIcon name="search" size={13} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--sv-placeholder)', pointerEvents: 'none' }}/>
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            placeholder={lang === 'cs' ? 'Hledej události, místa, kategorie...' : 'Search events, places, categories...'}
            className="w-full outline-none"
            style={{ height: 38, paddingLeft: 34, paddingRight: 32, background: 'var(--sv-surface-muted)', borderRadius: 'var(--sv-r-pill)', font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--sv-placeholder)' }}>
              <X className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
        <button onClick={onClose} className="flex-shrink-0" style={{ font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-link)' }}>
          {lang === 'cs' ? 'Zrušit' : 'Cancel'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* No query — show recent */}
        {!query && (
          <div className="p-4">
            {recent.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p style={svSectionLabel}>{lang === 'cs' ? 'Nedávné' : 'Recent'}</p>
                  <button onClick={handleClearRecent} style={{ font: "300 11px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
                    {lang === 'cs' ? 'Smazat' : 'Clear'}
                  </button>
                </div>
                {recent.map((q, i) => (
                  <button key={i} onClick={() => handleRecentClick(q)}
                    className="flex items-center gap-3 w-full text-left transition-colors" style={{ padding: '10px 8px', borderRadius: 10 }}>
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--sv-meta)' }}/>
                    <span style={{ font: "400 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)' }}>{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--sv-hairline)', borderTopColor: 'var(--sv-brand-purple)' }}/>
          </div>
        )}

        {/* Results */}
        {!loading && query && results.length > 0 && (
          <div className="p-2">
            {results.map(event => {
              const cat = getCategoryStyle(event.category);
              return (
                <button key={event.id} onClick={() => handleSelect(event)}
                  className="flex items-center gap-3 w-full text-left transition-colors" style={{ padding: '10px 12px', borderRadius: 14 }}>
                  <span className="flex-shrink-0" style={{ background: cat.bg, color: cat.ink, borderRadius: 'var(--sv-r-pill)', padding: '5px 9px', fontFamily: 'var(--sv-font-emoji)', fontSize: 12 }}>
                    {cat.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{event.title}</p>
                    <p className="truncate" style={{ ...svMeta, marginTop: 1 }}>
                      {event.location} · {event.date ? format(new Date(event.date), 'EEE d MMM · HH:mm') : ''}
                      {event.participants?.length > 0 && ` · ${event.participants.length}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* No results */}
        {!loading && query.length >= 2 && results.length === 0 && (
          <EmptyState
            title={lang === 'cs' ? 'Nic nenalezeno' : 'No results'}
            note={lang === 'cs' ? `Zkus jiný výraz pro "${query}"` : `Try a different search for "${query}"`}
          />
        )}
      </div>
    </div>
  );
}
