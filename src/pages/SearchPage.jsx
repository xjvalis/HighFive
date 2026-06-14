import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCategoryStyle } from '@/lib/categories';
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
    <div className="fixed inset-0 z-50 bg-card flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Search input bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            placeholder={lang === 'cs' ? 'Hledej události, místa, kategorie...' : 'Search events, places, categories...'}
            className="w-full h-10 pl-9 pr-8 bg-secondary/60 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="w-4 h-4"/>
            </button>
          )}
        </div>
        <button onClick={onClose} className="text-sm font-medium text-primary px-1 flex-shrink-0">
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
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {lang === 'cs' ? 'Nedávné' : 'Recent'}
                  </p>
                  <button onClick={handleClearRecent} className="text-xs text-muted-foreground hover:text-foreground">
                    {lang === 'cs' ? 'Smazat' : 'Clear'}
                  </button>
                </div>
                {recent.map((q, i) => (
                  <button key={i} onClick={() => handleRecentClick(q)}
                    className="flex items-center gap-3 w-full py-2.5 text-left hover:bg-secondary/50 rounded-xl px-2 transition-colors">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
                    <span className="text-sm">{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
          </div>
        )}

        {/* Results */}
        {!loading && query && results.length > 0 && (
          <div className="p-2">
            {results.map(event => {
              const cat = getCategoryStyle(event.category);
              return (
                <button key={event.id} onClick={() => handleSelect(event)}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-2xl text-left hover:bg-secondary/60 transition-colors">
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium flex-shrink-0", cat.color)}>
                    {cat.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {event.location} · {event.date ? format(new Date(event.date), 'EEE d MMM · HH:mm') : ''}
                      {event.participants?.length > 0 && ` · ${event.participants.length} 👥`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* No results */}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-semibold text-sm">{lang === 'cs' ? 'Nic nenalezeno' : 'No results'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {lang === 'cs' ? `Zkus jiný výraz pro "${query}"` : `Try a different search for "${query}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
