export function isYearDivisibleBy(dateString, divisor) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false; // invalid date
  const year = date.getFullYear();
  return year % divisor === 0;
}
