// Application-wide switches. Change a value here, nothing else.

/** Show the demo-credentials box on the login page. Set false in production. */
export const SHOW_DEMO_CREDENTIALS = false;

/**
 * Customer History: true  -> staff see every record for a customer (all staff);
 *                   false -> staff only see history made from their own records.
 * Admin always sees everything.
 */
export const SHARE_HISTORY_ACROSS_STAFF = true;

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB per file

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

/** Minimum characters before Customer History starts searching. */
export const HISTORY_MIN_QUERY = 3;
