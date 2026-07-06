// Indian Standard Time (IST) is UTC + 5:30
export function getISTDate(date: Date = new Date()): Date {
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(utcTime + istOffset);
}

export function formatDateIST(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface DeliveryWindowOption {
  id: 'MORNING_11AM' | 'AFTERNOON_4PM';
  label: string;
  targetDate: string; // YYYY-MM-DD
  isToday: boolean;
  isAvailable: boolean;
}

export function getAvailableWindows(): {
  MORNING_11AM: DeliveryWindowOption;
  AFTERNOON_4PM: DeliveryWindowOption;
} {
  const nowIST = getISTDate();
  const currentHour = nowIST.getUTCHours();
  const currentMinute = nowIST.getUTCMinutes();
  const timeInMinutes = currentHour * 60 + currentMinute;

  // Cutoffs (IST):
  // Morning 11:00 AM closes at 10:00 AM (600 mins)
  // Afternoon 4:00 PM closes at 3:00 PM (900 mins)
  const morningCutoff = 10 * 60;
  const afternoonCutoff = 15 * 60 + 30; // 3:30 PM cutoff

  const todayStr = formatDateIST(nowIST);
  const tomorrow = new Date(nowIST.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = formatDateIST(tomorrow);

  const morningIsToday = timeInMinutes < morningCutoff;
  const afternoonIsToday = timeInMinutes < afternoonCutoff;

  return {
    MORNING_11AM: {
      id: 'MORNING_11AM',
      label: morningIsToday ? 'Today 11:00 AM' : 'Tomorrow 11:00 AM',
      targetDate: morningIsToday ? todayStr : tomorrowStr,
      isToday: morningIsToday,
      isAvailable: true, // Both windows can be ordered (just shifts to tomorrow if past cutoff)
    },
    AFTERNOON_4PM: {
      id: 'AFTERNOON_4PM',
      label: afternoonIsToday ? 'Today 4:00 PM' : 'Tomorrow 4:00 PM',
      targetDate: afternoonIsToday ? todayStr : tomorrowStr,
      isToday: afternoonIsToday,
      isAvailable: true,
    },
  };
}

export function isWindowOpen(targetDateStr: string, window: 'MORNING_11AM' | 'AFTERNOON_4PM'): boolean {
  const nowIST = getISTDate();
  const todayStr = formatDateIST(nowIST);
  const tomorrow = new Date(nowIST.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = formatDateIST(tomorrow);

  const currentHour = nowIST.getUTCHours();
  const currentMinute = nowIST.getUTCMinutes();
  const timeInMinutes = currentHour * 60 + currentMinute;

  if (targetDateStr === todayStr) {
    if (window === 'MORNING_11AM') {
      return timeInMinutes < 10 * 60; // 10:00 AM cutoff
    } else {
      return timeInMinutes < (15 * 60 + 30); // 3:30 PM cutoff
    }
  } else if (targetDateStr === tomorrowStr) {
    // Ordering for tomorrow is always allowed
    return true;
  }

  // Any other date (past or far future) is closed/invalid in this phase
  return false;
}

/**
 * Returns the UTC date interval for orders delivered on a specific calendar day in IST.
 * This is used by the admin page to group orders being delivered *today*.
 */
export function getDeliveryIntervals(istDate: Date = getISTDate()): {
  morningStart: Date;
  morningEnd: Date;
  afternoonStart: Date;
  afternoonEnd: Date;
} {
  // Let's compute date components in IST
  const yyyy = istDate.getUTCFullYear();
  const mm = istDate.getUTCMonth(); // 0-indexed
  const dd = istDate.getUTCDate();

  // Morning window for date D (IST):
  // Placed between (D-1) 10:00 AM IST and D 10:00 AM IST
  const morningStartIST = new Date(Date.UTC(yyyy, mm, dd - 1, 10, 0, 0));
  const morningEndIST = new Date(Date.UTC(yyyy, mm, dd, 10, 0, 0));

  // Afternoon window for date D (IST):
  // Placed between (D-1) 3:00 PM IST and D 3:00 PM IST
  const afternoonStartIST = new Date(Date.UTC(yyyy, mm, dd - 1, 15, 30, 0));
  const afternoonEndIST = new Date(Date.UTC(yyyy, mm, dd, 15, 30, 0));

  // Subtract 5.5 hours to convert IST representation back to correct UTC
  const istOffsetMs = 5.5 * 60 * 60 * 1000;

  return {
    morningStart: new Date(morningStartIST.getTime() - istOffsetMs),
    morningEnd: new Date(morningEndIST.getTime() - istOffsetMs),
    afternoonStart: new Date(afternoonStartIST.getTime() - istOffsetMs),
    afternoonEnd: new Date(afternoonEndIST.getTime() - istOffsetMs),
  };
}
