/**
 * Dates as the app's lists show them: "today", or the day in the
 * person's own format.
 */
const day = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export const formatDay = (time: number) => day.format(new Date(time));

/** "today" for today, otherwise the day, or "never" for no time at all. */
export const when = (time: number | null) => {
  if (time === null) return "never";

  return new Date(time).toDateString() === new Date().toDateString()
    ? "today"
    : formatDay(time);
};
