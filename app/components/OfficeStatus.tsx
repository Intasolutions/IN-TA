'use client';

import { useCallback, useSyncExternalStore } from 'react';
import Icon from './Icon';
import { useSite } from '../site/SiteContext';
import { clockOf as fmtClock, hoursShort, latitude, minutesOf, TIME_ZONE, type Site } from '../site/site';

// The office hours are set in the admin (Site settings)
type Hours = { days: number[]; open: number; close: number };

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const istParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

function officeStatus({ days, open, close }: Hours, now = new Date()) {
  const parts = istParts.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = WEEKDAY_INDEX[get('weekday')];
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));

  if (days.includes(day) && minutes >= open && minutes < close) {
    return `OPEN NOW · UNTIL ${fmtClock(close)} IST`;
  }
  if (days.includes(day) && minutes < open) {
    return `CLOSED · OPENS ${fmtClock(open)} IST`;
  }
  for (let i = 1; i <= 7; i++) {
    const next = (day + i) % 7;
    if (days.includes(next)) {
      return `CLOSED · OPENS ${i === 1 ? 'TOMORROW' : DAY_NAMES[next]} ${fmtClock(open)} IST`;
    }
  }
  return 'CLOSED';
}

// Re-check every 30s; the snapshot is a string, so React only re-renders when the status text changes
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
};
const getServerSnapshot = () => null; // time-dependent → computed on the client only

const hoursOf = (site: Site): Hours => ({ days: site.hours.days, open: minutesOf(site.hours.opens), close: minutesOf(site.hours.closes) });

/** Live office status text, e.g. "OPEN NOW · UNTIL 5 PM IST" (null until mounted) */
export function useOfficeStatus() {
  const site = useSite();
  const { days, open, close } = hoursOf(site);
  const daysKey = days.join();
  const getSnapshot = useCallback(() => officeStatus({ days: daysKey.split(',').map(Number), open, close }), [daysKey, open, close]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function OfficeStatus() {
  const site = useSite();
  const status = useOfficeStatus();
  const isOpen = status?.startsWith('OPEN') ?? false;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 font-mono text-[10px] text-brand-blue font-bold">
        <Icon name="location_on" className="text-[14px]" />
        <span>
          {site.address.district.toUpperCase()} OFFICE<span className="hidden sm:inline">{` // ${latitude(site)}`}</span>
        </span>
      </div>
      <div className="flex items-start gap-1.5 font-mono text-[10px] text-midnight/70">
        <span className="relative flex h-1.5 w-1.5 shrink-0 mt-1">
          {isOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75" />}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isOpen ? 'bg-brand-blue' : 'bg-midnight/30'}`} />
        </span>
        <span className={isOpen ? 'text-brand-blue font-semibold' : ''}>
          {status ?? hoursShort(site).toUpperCase()}
        </span>
      </div>
    </div>
  );
}
