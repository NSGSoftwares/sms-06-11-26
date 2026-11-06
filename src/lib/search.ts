/** Text typed into a "Serial / Mobile" search box. */
export const matchesSerialOrMobile = (
  record: { serialNo: string; mobileNo: string },
  query: string
): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const digits = q.replace(/\D/g, "");

  return (
    record.serialNo.toLowerCase().includes(q) ||
    record.mobileNo.includes(q) ||
    (digits.length > 0 && record.mobileNo.includes(digits))
  );
};
