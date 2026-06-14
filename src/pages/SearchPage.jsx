import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCategoryStyle, CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';

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

// Přeloží český výraz na anglický název kategorie pro DB dotaz
function getCategoryNamesForQuery(q) {
  const lower = q.toLowerCase();
  const matches = CATEGORIES.filter(cat => {
    const csLabel = getCategoryLabel(cat.name, 'cs').toLowerCase();
    const enLabel = getCategoryLabel(cat.name, 'en').toLowerCase();
    return cat.name.toLowerCase().includes(lower) ||
           csLabel.includes(lower) ||
           enLabel.includes(lower);
  });
  return matches.map(c => c.name);
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
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setLoading(true);

    // Najdi kategorie co odpovídají dotazu (CZ i EN)
    const catMatches = getCategoryNamesForQuery(q);

    // Sestav OR filtr
    const orParts = [
      `title.ilike.%${q}%`,
      `location.ilike.%${q}%`,
      `description.ilike.%${q}%`,
      ...catMatches.map(c => `category.eq.${c}`),
    ];

    const { data } = await supabase.from('events')
      .select('id, title, category, location, date, participants')
      .eq('is_approved', true)
      .gt('date', new Date().toISOString())
      .or(orParts.join(','))
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
    <div
      className="fixed inset-0 z-50 bg-card flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Search input bar */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border flex-shrink-0 w-full">
        <div className="relative" style={{flex: "1 1 0", minWidth: 0}}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            placeholder={lang === 'cs' ? 'Hledej události, místa, kategorie...' : 'Search events, places, categories...'}
            className="w-full h-10 pl-9 pr-8 bg-secondary/60 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/30 border-0"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="w-4 h-4"/>
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-sm font-medium text-primary pl-2 py-1 flex-shrink-0 whitespace-nowrap"
        >
          {lang === 'cs' ? 'Zrušit' : 'Cancel'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
          </div>
        )}

        {/* No query — show recent searches */}
        {!loading && !query && (
          <div className="p-4">
            {recent.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {lang === 'cs' ? 'Nedávné' : 'Recent'}
                  </p>
                  <button onClick={handleClearRecent} className="text-xs text-muted-foreground hover:text-foreground">
                    {lang === 'cs' ? 'Smazat' : 'Clear'}
                  </button>
                </div>
                {recent.map((q, i) => (
                  <button key={i} onClick={() => handleRecentClick(q)}
                    className="flex items-center gap-3 w-full py-3 px-2 text-left hover:bg-secondary/50 rounded-xl transition-colors">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
                    <span className="text-sm">{q}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm text-muted-foreground">
                  {lang === 'cs' ? 'Začni psát pro vyhledávání' : 'Start typing to search'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && query.length >= 2 && results.length > 0 && (
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-3 py-2">
              {results.length} {lang === 'cs' ? 'výsledků' : 'results'}
            </p>
            {results.map(event => {
              const cat = getCategoryStyle(event.category);
              return (
                <button key={event.id} onClick={() => handleSelect(event)}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-2xl text-left hover:bg-secondary/60 transition-colors active:bg-secondary">
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium flex-shrink-0", cat.color)}>
                    {cat.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {event.location} · {event.date ? format(new Date(event.date), 'EEE d MMM · HH:mm') : ''}
                      {event.participants?.length > 0 ? ` · ${event.participants.length} 👥` : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* No results */}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="text-center py-12 px-6">
            <p className="text-3xl mb-2">😕</p>
            <p className="font-semibold text-sm mb-1">
              {lang === 'cs' ? 'Nic nenalezeno' : 'Nothing found'}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'cs' ? `Žádné události pro "${query}"` : `No events for "${query}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
