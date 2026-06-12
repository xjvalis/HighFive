import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday, isPast } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';

const TIMES = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
});

export default function DateTimePicker({ value, onChange, label, minDate, maxDate, placeholder }) {
  const { lang } = useContext(LanguageContext);
  const locale = lang === 'cs' ? cs : enUS;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('date'); // 'date' | 'time'
  const [month, setMonth] = useState(value ? new Date(value) : new Date());
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedDate = value ? new Date(value) : null;

  const toLocalISO = (date) => {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleDayClick = (day) => {
    const base = selectedDate || new Date();
    const newDate = new Date(day);
    newDate.setHours(base.getHours() || 12, base.getMinutes() || 0, 0, 0);
    onChange(toLocalISO(newDate));
    setView('time');
  };

  const handleTimeClick = (time) => {
    const [h, m] = time.split(':').map(Number);
    const base = selectedDate || new Date();
    const newDate = new Date(base);
    newDate.setHours(h, m, 0, 0);
    onChange(toLocalISO(newDate));
    setOpen(false);
    setView('date');
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  const dayLabels = lang === 'cs'
    ? ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const selectedTime = selectedDate
    ? `${String(selectedDate.getHours()).padStart(2,'0')}:${String(selectedDate.getMinutes()).padStart(2,'0')}`
    : null;

  const displayValue = selectedDate
    ? `${format(selectedDate, 'd. M. yyyy', { locale })}  ·  ${String(selectedDate.getHours()).padStart(2,'0')}:${String(selectedDate.getMinutes()).padStart(2,'0')}`
    : '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setView('date'); }}
        className={cn(
          'w-full flex items-center gap-2 h-9 px-3 rounded-xl border border-input bg-transparent text-sm transition-colors text-left',
          'hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-ring',
          !displayValue && 'text-muted-foreground'
        )}
      >
        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="flex-1 truncate">{displayValue || placeholder || (lang === 'cs' ? 'Vybrat datum a čas' : 'Select date & time')}</span>
        {selectedDate && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(''); }}
            className="text-muted-foreground hover:text-foreground text-xs px-1"
          >✕</button>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-72">
          {view === 'date' ? (
            <div className="p-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold capitalize">
                  {format(month, 'LLLL yyyy', { locale })}
                </span>
                <button type="button" onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {dayLabels.map(d => (
                  <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {days.map(day => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, month);
                  const isDisabled = minDate && day < new Date(minDate);
                  const isTodayDay = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && handleDayClick(day)}
                      className={cn(
                        'h-8 w-full rounded-lg text-xs font-medium transition-all',
                        isSelected && 'bg-primary text-primary-foreground',
                        !isSelected && isTodayDay && 'bg-lavender text-violet-700 font-bold',
                        !isSelected && !isTodayDay && isCurrentMonth && 'hover:bg-secondary',
                        !isCurrentMonth && 'text-muted-foreground/40',
                        isDisabled && 'opacity-30 cursor-not-allowed',
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setView('time')}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {selectedTime || (lang === 'cs' ? 'Vybrat čas' : 'Select time')}
                </button>
              )}
            </div>
          ) : (
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setView('date')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                  {selectedDate ? format(selectedDate, 'd. M. yyyy', { locale }) : ''}
                </button>
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {lang === 'cs' ? 'Čas' : 'Time'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 max-h-52 overflow-y-auto no-scrollbar">
                {TIMES.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeClick(time)}
                    className={cn(
                      'py-2 rounded-lg text-xs font-medium transition-all',
                      selectedTime === time ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
