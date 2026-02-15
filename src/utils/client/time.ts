export function formatCountdown(exp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = exp - now;

  if (timeLeft <= 0) {
    return "00:00:00";
  }

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}