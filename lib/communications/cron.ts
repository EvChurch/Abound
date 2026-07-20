import { APP_TIMEZONE, APP_TIMEZONE_LABEL } from "@/lib/app-timezone";

type CronDescriptionResult =
  | {
      description: string;
      isValid: true;
      value: string;
    }
  | {
      isValid: false;
      message: string;
      value: string;
    };

type CronPart = {
  exactValues: number[] | null;
  field: string;
};

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function describeCommunicationCron(
  rawValue: string,
  timezoneLabel = APP_TIMEZONE_LABEL,
): CronDescriptionResult {
  const value = rawValue.trim().replace(/\s+/g, " ");

  if (!value) {
    return {
      isValid: false,
      message: "Enter a five-part cron schedule.",
      value,
    };
  }

  const parts = value.split(" ");

  if (parts.length !== 5) {
    return {
      isValid: false,
      message: "Use five cron fields: minute hour day month weekday.",
      value,
    };
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = [
    validatePart(parts[0], "minute", 0, 59),
    validatePart(parts[1], "hour", 0, 23),
    validatePart(parts[2], "day of month", 1, 31),
    validatePart(parts[3], "month", 1, 12),
    validatePart(parts[4], "weekday", 0, 7),
  ];

  if (typeof minute === "string") {
    return { isValid: false, message: minute, value };
  }

  if (typeof hour === "string") {
    return { isValid: false, message: hour, value };
  }

  if (typeof dayOfMonth === "string") {
    return { isValid: false, message: dayOfMonth, value };
  }

  if (typeof month === "string") {
    return { isValid: false, message: month, value };
  }

  if (typeof dayOfWeek === "string") {
    return { isValid: false, message: dayOfWeek, value };
  }

  const time = exactTime(minute, hour);
  const exactDayOfMonth = exactValue(dayOfMonth);
  const exactMonth = exactValue(month);
  const exactWeekdays = exactWeekdayValues(dayOfWeek);

  if (time && isWildcard(dayOfMonth) && isWildcard(month) && exactWeekdays) {
    return {
      description: `Runs every ${joinNames(
        exactWeekdays.map((weekday) => WEEKDAYS[weekday]),
      )} at ${time} ${timezoneLabel}.`,
      isValid: true,
      value,
    };
  }

  if (
    time &&
    isWildcard(dayOfMonth) &&
    isWildcard(month) &&
    isWildcard(dayOfWeek)
  ) {
    return {
      description: `Runs daily at ${time} ${timezoneLabel}.`,
      isValid: true,
      value,
    };
  }

  if (time && exactDayOfMonth && isWildcard(month) && isWildcard(dayOfWeek)) {
    return {
      description: `Runs monthly on day ${exactDayOfMonth} at ${time} ${timezoneLabel}.`,
      isValid: true,
      value,
    };
  }

  if (time && exactDayOfMonth && exactMonth && isWildcard(dayOfWeek)) {
    return {
      description: `Runs every ${MONTHS[exactMonth - 1]} ${exactDayOfMonth} at ${time} ${timezoneLabel}.`,
      isValid: true,
      value,
    };
  }

  return {
    description: `Runs on cron schedule "${value}" in ${timezoneLabel}.`,
    isValid: true,
    value,
  };
}

export function nextCommunicationCronDate(
  rawValue: string,
  after: Date = new Date(),
  timezone = APP_TIMEZONE,
) {
  const value = rawValue.trim().replace(/\s+/g, " ");
  const parts = value.split(" ");

  if (parts.length !== 5) {
    throw new Error("Communication cron must use five fields.");
  }

  const schedule = {
    dayOfMonth: parseCronMatcher(parts[2], 1, 31, "day of month"),
    dayOfWeek: parseCronMatcher(parts[4], 0, 7, "weekday", normalizeWeekday),
    hour: parseCronMatcher(parts[1], 0, 23, "hour"),
    minute: parseCronMatcher(parts[0], 0, 59, "minute"),
    month: parseCronMatcher(parts[3], 1, 12, "month"),
  };
  const cursor = new Date(after.getTime());
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

  const maxMinutes = 366 * 24 * 60 * 5;

  for (let attempts = 0; attempts < maxMinutes; attempts += 1) {
    const local = localDateParts(cursor, timezone);

    if (
      schedule.minute(local.minute) &&
      schedule.hour(local.hour) &&
      schedule.dayOfMonth(local.day) &&
      schedule.month(local.month) &&
      schedule.dayOfWeek(local.weekday)
    ) {
      return cursor;
    }

    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }

  throw new Error("Communication cron did not produce a future run.");
}

function validatePart(
  value: string,
  field: string,
  min: number,
  max: number,
): CronPart | string {
  if (!value) {
    return `${capitalize(field)} is required.`;
  }

  const values = new Set<number>();
  const exactValues = new Set<number>();

  for (const segment of value.split(",")) {
    if (!segment) {
      return `Remove the empty ${field} value.`;
    }

    const [range, step] = segment.split("/");

    if (segment.split("/").length > 2) {
      return `Use only one step value in the ${field} field.`;
    }

    if (step !== undefined && !validInteger(step, 1, max || 1)) {
      return `The ${field} step must be a positive number.`;
    }

    if (range === "*") {
      return {
        exactValues: null,
        field,
      };
    }

    const bounds = range.split("-");

    if (bounds.length > 2) {
      return `The ${field} range is not valid.`;
    }

    if (bounds.length === 2) {
      const [start, end] = bounds.map(Number);

      if (!validNumber(start, min, max) || !validNumber(end, min, max)) {
        return `The ${field} range must be between ${min} and ${max}.`;
      }

      if (start > end) {
        return `The ${field} range must start before it ends.`;
      }

      for (let current = start; current <= end; current += Number(step ?? 1)) {
        values.add(current);
      }

      continue;
    }

    const exact = Number(range);

    if (!validNumber(exact, min, max)) {
      return `The ${field} value must be between ${min} and ${max}.`;
    }

    values.add(exact);

    if (step === undefined) {
      exactValues.add(exact);
    }
  }

  return {
    exactValues:
      values.size === exactValues.size
        ? [...exactValues].sort(sortNumbers)
        : null,
    field,
  };
}

function parseCronMatcher(
  value: string,
  min: number,
  max: number,
  field: string,
  normalize: (value: number) => number = (input) => input,
) {
  const valid = validatePart(value, field, min, max);

  if (typeof valid === "string") {
    throw new Error(valid);
  }

  if (value === "*") {
    return () => true;
  }

  const allowed = new Set<number>();

  for (const segment of value.split(",")) {
    const [range, stepValue] = segment.split("/");
    const step = stepValue ? Number(stepValue) : 1;

    if (range === "*") {
      for (let current = min; current <= max; current += step) {
        allowed.add(normalize(current));
      }
      continue;
    }

    const bounds = range.split("-").map(Number);
    const start = bounds[0]!;
    const end = bounds.length === 2 ? bounds[1]! : start;

    for (let current = start; current <= end; current += step) {
      allowed.add(normalize(current));
    }
  }

  return (candidate: number) => allowed.has(candidate);
}

function normalizeWeekday(value: number) {
  return value === 7 ? 0 : value;
}

function localDateParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "numeric",
    month: "numeric",
    timeZone: timezone,
    weekday: "short",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value;

  return {
    day: Number(part("day")),
    hour: Number(part("hour")),
    minute: Number(part("minute")),
    month: Number(part("month")),
    weekday: WEEKDAYS_SHORT.indexOf(part("weekday") ?? ""),
  };
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function exactTime(minute: CronPart, hour: CronPart) {
  const exactMinute = exactValue(minute);
  const exactHour = exactValue(hour);

  if (exactMinute === null || exactHour === null) {
    return null;
  }

  const suffix = exactHour >= 12 ? "PM" : "AM";
  const hour12 = exactHour % 12 || 12;

  return `${hour12}:${exactMinute.toString().padStart(2, "0")} ${suffix}`;
}

function exactValue(part: CronPart) {
  return part.exactValues?.length === 1 ? part.exactValues[0] : null;
}

function exactWeekdayValues(part: CronPart) {
  if (!part.exactValues?.length) {
    return null;
  }

  return part.exactValues.map((value) => (value === 7 ? 0 : value));
}

function isWildcard(part: CronPart) {
  return part.exactValues === null;
}

function validInteger(value: string, min: number, max: number) {
  return /^\d+$/.test(value) && validNumber(Number(value), min, max);
}

function validNumber(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function joinNames(names: string[]) {
  if (names.length === 1) {
    return names[0];
  }

  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sortNumbers(left: number, right: number) {
  return left - right;
}
