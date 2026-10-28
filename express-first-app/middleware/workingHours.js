/**
 * Custom middleware that restricts access to the web application
 * to working hours only: Monday to Friday, from 9:00 to 17:00.
 *
 * Outside those hours, every request is answered with the
 * "closed" page explaining when the app is available.
 */

const OPEN_DAY_START = 1; // Monday (0 = Sunday)
const OPEN_DAY_END = 5;   // Friday
const OPEN_HOUR_START = 9;  // 09:00 inclusive
const OPEN_HOUR_END = 17;   // 17:00 exclusive

function isWithinWorkingHours(date = new Date()) {
  const day = date.getDay();
  const hour = date.getHours();
  const isWorkingDay = day >= OPEN_DAY_START && day <= OPEN_DAY_END;
  const isWorkingHour = hour >= OPEN_HOUR_START && hour < OPEN_HOUR_END;
  return isWorkingDay && isWorkingHour;
}

function workingHours(req, res, next) {
  // Dev convenience: FORCE_OPEN=1 bypasses the working-hours check
  if (process.env.FORCE_OPEN === "1" || isWithinWorkingHours()) {
    return next();
  }
  return res.status(503).sendFile("closed.html", { root: "public/pages" });
}

module.exports = workingHours;
module.exports.isWithinWorkingHours = isWithinWorkingHours;
