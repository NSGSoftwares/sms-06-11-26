const pad = (n: number): string => String(n).padStart(2, "0");

/**
 * Current local time in HH:MM:SS format.
 */
export const getCurrentTime = (): string =>
  new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

/**
 * Live timer display.
 *
 * Examples:
 * 5s      -> 00:00:05
 * 65s     -> 00:01:05
 * 3665s   -> 01:01:05
 */
export const formatTimer = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Full human-readable duration.
 *
 * Examples:
 * 19s    -> "19 seconds"
 * 51s    -> "51 seconds"
 * 61s    -> "1 minute 1 second"
 * 125s   -> "2 minutes 5 seconds"
 * 3665s  -> "1 hr 1 minute 5 seconds"
 */
export const formatDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));

  if (safe === 0) {
    return "0 seconds";
  }

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(
      `${hours} ${hours === 1 ? "hr" : "hrs"}`,
    );
  }

  if (minutes > 0) {
    parts.push(
      `${minutes} ${minutes === 1 ? "minute" : "minutes"}`,
    );
  }

  if (seconds > 0) {
    parts.push(
      `${seconds} ${seconds === 1 ? "second" : "seconds"}`,
    );
  }

  return parts.join(" ");
};

/**
 * Record duration display.
 *
 * This is the preferred formatter for Day Books and records
 * because it preserves the actual elapsed time.
 *
 * Examples:
 * 0s    -> "0 sec"
 * 19s   -> "19 sec"
 * 51s   -> "51 sec"
 * 60s   -> "1 min"
 * 61s   -> "1 min 1 sec"
 * 90s   -> "1 min 30 sec"
 * 125s  -> "2 min 5 sec"
 * 3600s -> "60 min"
 */
export const formatRecordDuration = (
  totalSeconds: number,
): string => {
  const safe = Math.max(
    0,
    Math.floor(Number(totalSeconds) || 0),
  );

  if (safe === 0) {
    return "0 sec";
  }

  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  if (minutes === 0) {
    return `${seconds} sec`;
  }

  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${seconds} sec`;
};

/**
 * Compact duration for dashboard/stat cards.
 *
 * Examples:
 * 19s    -> "19s"
 * 91s    -> "1m 31s"
 * 3665s  -> "1h 1m"
 * 0s     -> "—"
 */
export const formatCompactDuration = (
  totalSeconds: number,
): string => {
  const safe = Math.max(
    0,
    Math.round(Number(totalSeconds) || 0),
  );

  if (safe === 0) {
    return "—";
  }

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

/**
 * Display date: dd/mm/yyyy.
 */
export const formatDate = (
  date: Date = new Date(),
): string =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

/**
 * ISO date in the user's local timezone.
 *
 * Example:
 * 2026-10-10
 */
export const toISODate = (
  date: Date = new Date(),
): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Parse yyyy-mm-dd as a local date.
 *
 * Avoids the UTC behavior of new Date("yyyy-mm-dd").
 */
export const parseISODate = (iso: string): Date => {
  const [year, month, day] = iso.split("-").map(Number);

  return new Date(
    year,
    (month || 1) - 1,
    day || 1,
  );
};

/**
 * Today's local date in yyyy-mm-dd format.
 */
export const todayISO = (): string => toISODate(new Date());

/**
 * Add or subtract whole days from an ISO date.
 */
export const shiftISODate = (
  iso: string,
  days: number,
): string => {
  const date = parseISODate(iso);

  date.setDate(date.getDate() + days);

  return toISODate(date);
};

/**
 * Returns the last `count` days ending at `endISO`.
 *
 * Oldest date comes first.
 */
export const lastDays = (
  count: number,
  endISO: string = todayISO(),
): string[] =>
  Array.from(
    { length: Math.max(0, count) },
    (_, index) =>
      shiftISODate(
        endISO,
        index - (count - 1),
      ),
  );

/**
 * Compact date label.
 *
 * Example:
 * 2026-10-09 -> "09 Oct"
 */
export const formatShortDate = (
  iso: string,
): string =>
  parseISODate(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

/**
 * First day of the month containing the given ISO date.
 */
export const startOfMonthISO = (
  iso: string = todayISO(),
): string => {
  const date = parseISODate(iso);

  return toISODate(
    new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    ),
  );
};

/**
 * Format a full ISO timestamp.
 *
 * Example:
 * 2026-10-10T10:47:24.000Z
 * -> "10 Oct 2026, 16:17"
 */
export const formatDateTime = (
  isoTimestamp: string,
): string => {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};