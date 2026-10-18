'use client';

import { useSyncExternalStore } from 'react';
import Icon from './Icon';

// Office hours: Monday–Saturday, 9:00 AM – 5:00 PM IST
export const OFFICE_HOURS = {
  days: [1, 2, 3, 4, 5, 6], // 0 = Sunday
  open: 9 * 60, // minutes after midnight
  close: 17 * 60,
  timeZone: 'Asia/Kolkata',
};

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const fmtClock = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};

const istParts = new Intl.DateTimeFormat('en-US', {
  timeZone: OFFICE_HOURS.timeZone,
  weekday: 'short',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

function officeStatus(now = new Date()) {
  const parts = istParts.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = WEEKDAY_INDEX[get('weekday')];
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  const { days, open, close } = OFFICE_HOURS;

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
const getSnapshot = () => officeStatus();
const getServerSnapshot = () => null; // time-dependent → computed on the client only

export default function OfficeStatus() {
  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isOpen = status?.startsWith('OPEN') ?? false;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 font-mono text-[10px] text-brand-blue font-bold">
        <Icon name="location_on" className="text-[14px]" />
        <span>
          WAYANAD OFFICE<span className="hidden sm:inline">{' // 11.8021° N'}</span>
        </span>
      </div>
      <div className="flex items-start gap-1.5 font-mono text-[10px] text-midnight/70">
        <span className="relative flex h-1.5 w-1.5 shrink-0 mt-1">
          {isOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75" />}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isOpen ? 'bg-brand-blue' : 'bg-midnight/30'}`} />
        </span>
        <span className={isOpen ? 'text-brand-blue font-semibold' : ''}>
          {status ?? 'MON–SAT · 9 AM–5 PM IST'}
        </span>
      </div>
    </div>
  );
}
