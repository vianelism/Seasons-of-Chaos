export const EVENT_TIMEZONES = {
  eastern: "America/New_York",
  central: "America/Chicago",
  mountain: "America/Denver",
  pacific: "America/Los_Angeles",
} as const;

export type EventTimezone = keyof typeof EVENT_TIMEZONES;

type ClockParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsAt(timestamp: number, timeZone: string): ClockParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as Record<string, number>;
  return { year: values.year ?? 0, month: values.month ?? 0, day: values.day ?? 0, hour: values.hour ?? 0, minute: values.minute ?? 0, second: values.second ?? 0 };
}

export function localEventTime(date: string, time: string, zone: EventTimezone): Date | undefined {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dateMatch || !timeMatch || !(zone in EVENT_TIMEZONES)) return undefined;
  const desired = { year: Number(dateMatch[1]), month: Number(dateMatch[2]), day: Number(dateMatch[3]), hour: Number(timeMatch[1]), minute: Number(timeMatch[2]) };
  if (desired.month < 1 || desired.month > 12 || desired.day < 1 || desired.day > 31 || desired.hour > 23 || desired.minute > 59) return undefined;
  const wallClockAsUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute);
  if (new Date(wallClockAsUtc).getUTCMonth() !== desired.month - 1 || new Date(wallClockAsUtc).getUTCDate() !== desired.day) return undefined;
  let candidate = wallClockAsUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = partsAt(candidate, EVENT_TIMEZONES[zone]);
    const representedAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    candidate += wallClockAsUtc - representedAsUtc;
  }
  const roundTrip = partsAt(candidate, EVENT_TIMEZONES[zone]);
  if (roundTrip.year !== desired.year || roundTrip.month !== desired.month || roundTrip.day !== desired.day || roundTrip.hour !== desired.hour || roundTrip.minute !== desired.minute) return undefined;
  return new Date(candidate);
}

export function customPollAnswers(raw: string): string[] | undefined {
  if (!raw.trim()) return [];
  const answers = raw.split("|").map((answer) => answer.trim()).filter(Boolean);
  if (answers.length < 2 || answers.length > 10 || answers.some((answer) => answer.length > 55)) return undefined;
  return answers;
}
