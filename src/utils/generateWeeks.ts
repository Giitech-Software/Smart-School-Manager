export function generateWeeksFromTerm(
  termId: string,
  startDate: string,
  endDate: string
) {
  const weeks = [];

  let currentStart = new Date(startDate);
  const termEnd = new Date(endDate);
  let weekNumber = 1;

  while (currentStart <= termEnd) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 6);

    if (currentEnd > termEnd) {
      currentEnd.setTime(termEnd.getTime());
    }

    weeks.push({
      termId,
      weekNumber,
      startDate: currentStart.toISOString().slice(0, 10),
      endDate: currentEnd.toISOString().slice(0, 10),
      createdAt: new Date(),
    });

    currentStart.setDate(currentStart.getDate() + 7);
    weekNumber++;
  }

  return weeks;
}
