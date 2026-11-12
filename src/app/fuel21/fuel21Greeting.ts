/** Time-of-day salutation for dashboard headers (local time). */
export function timeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

export function firstNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function dashboardGreetingLine(fullName: string, now?: Date): string {
  return `${timeOfDayGreeting(now)}, ${firstNameFromFullName(fullName)}`;
}
