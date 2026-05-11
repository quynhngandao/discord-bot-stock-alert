// NYSE holidays — update annually. Dates are in ET (America/New_York).
const NYSE_HOLIDAYS_2026 = [
  "2026-01-01", // New Year's Day
  "2026-01-19", // MLK Day
  "2026-02-16", // Presidents Day
  "2026-04-03", // Good Friday
  "2026-05-25", // Memorial Day
  "2026-06-19", // Juneteenth
  "2026-07-03", // Independence Day (observed)
  "2026-09-07", // Labor Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas
];

const NYSE_HOLIDAYS_2027 = [
  "2027-01-01", // New Year's Day
  "2027-01-18", // MLK Day
  "2027-02-15", // Presidents Day
  "2027-03-26", // Good Friday
  "2027-05-31", // Memorial Day
  "2027-06-18", // Juneteenth (observed)
  "2027-07-05", // Independence Day (observed)
  "2027-09-06", // Labor Day
  "2027-11-25", // Thanksgiving
  "2027-12-24", // Christmas (observed)
];

const ALL_HOLIDAYS = new Set([...NYSE_HOLIDAYS_2026, ...NYSE_HOLIDAYS_2027]);

function todayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function isMarketHoliday(): boolean {
  return ALL_HOLIDAYS.has(todayET());
}

export function isWeekend(): boolean {
  const day = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  });
  return day === "Sat" || day === "Sun";
}

export function isMarketClosed(): boolean {
  return isWeekend() || isMarketHoliday();
}

export function isMarketOpen(): boolean {
  if (isMarketClosed()) return false;
  // Market hours: 9:30 AM – 4:00 PM ET
  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const minutes = etTime.getHours() * 60 + etTime.getMinutes();
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}
