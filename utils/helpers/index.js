export function formatTime(counter) {
  if (counter < 60) {
    return counter + 's';
  } else if (counter < 3600) {
    // Less than an hour
    return Math.floor(counter / 60) + 'm';
  } else if (counter < 86400) {
    // Less than a day
    return Math.floor(counter / 3600) + 'h';
  } else if (counter < 604800) {
    // Less than a week
    return Math.floor(counter / 86400) + 'd';
  } else if (counter < 2629743) {
    // Less than a month
    return Math.floor(counter / 604800) + 'w';
  } else if (counter < 31556926) {
    // Less than a year
    return Math.floor(counter / 2629743) + 'mo';
  } else {
    // A year or more
    return Math.floor(counter / 31556926) + 'y';
  }
}
