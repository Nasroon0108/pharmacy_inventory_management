// Date utility functions for Sri Lankan timezone (Asia/Colombo, UTC+5:30)

/**
 * Get current date/time in Sri Lankan timezone
 * @returns {Date} Date object representing current time in Sri Lankan timezone
 */
function getSriLankanDate() {
  // Create a date formatter to get the current time in Sri Lankan timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(new Date());
  const year = parseInt(parts.find(p => p.type === 'year').value);
  const month = parseInt(parts.find(p => p.type === 'month').value) - 1; // Month is 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day').value);
  const hour = parseInt(parts.find(p => p.type === 'hour').value);
  const minute = parseInt(parts.find(p => p.type === 'minute').value);
  const second = parseInt(parts.find(p => p.type === 'second').value);
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Convert a date string to a Date object, then get its representation in Sri Lankan timezone
 * @param {string|Date} date - Date string or Date object
 * @returns {Date} Date object adjusted to represent the same moment in Sri Lankan timezone
 */
function toSriLankanDate(date) {
  if (!date) return null;
  
  // Parse the date, treating SQLite format as UTC
  const d = parseDatabaseDate(date);
  if (!d || isNaN(d.getTime())) return null;
  
  // Get the date components in Sri Lankan timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find(p => p.type === 'year').value);
  const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
  const day = parseInt(parts.find(p => p.type === 'day').value);
  const hour = parseInt(parts.find(p => p.type === 'hour').value);
  const minute = parseInt(parts.find(p => p.type === 'minute').value);
  const second = parseInt(parts.find(p => p.type === 'second').value);
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Parse a date string from SQLite (format: "YYYY-MM-DD HH:MM:SS")
 * Treats it as UTC and converts to proper Date object
 * @param {string} dateString - Date string from database
 * @returns {Date} Date object
 */
function parseDatabaseDate(dateString) {
  if (!dateString) return null;
  
  // If it's already a Date object, return it
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // SQLite returns dates in format "YYYY-MM-DD HH:MM:SS" (without timezone)
  // We need to treat this as UTC and then convert to Sri Lankan time
  // Check if it's in SQLite format (YYYY-MM-DD HH:MM:SS)
  const sqliteFormat = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/;
  const match = dateString.match(sqliteFormat);
  
  if (match) {
    // Parse as UTC
    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // Month is 0-indexed
    const day = parseInt(match[3]);
    const hour = parseInt(match[4]);
    const minute = parseInt(match[5]);
    const second = parseInt(match[6]);
    
    // Create date as UTC
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
  
  // Try standard Date parsing (for ISO format or other formats)
  return new Date(dateString);
}

/**
 * Format date to Sri Lankan locale string with time
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string
 */
function formatSriLankanDateTime(date) {
  if (!date) return 'N/A';
  try {
    // Parse the date, treating SQLite format as UTC
    const d = parseDatabaseDate(date);
    if (!d || isNaN(d.getTime())) return 'N/A';
    
    // Format in Sri Lankan timezone
    return d.toLocaleString('en-US', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
}

/**
 * Format date to Sri Lankan locale string (date only)
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string
 */
function formatSriLankanDate(date) {
  if (!date) return 'N/A';
  try {
    // Parse the date, treating SQLite format as UTC
    const d = parseDatabaseDate(date);
    if (!d || isNaN(d.getTime())) return 'N/A';
    
    // Format in Sri Lankan timezone
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
}

/**
 * Get today's date in Sri Lankan timezone (with time set to 00:00:00)
 * @returns {Date} Today's date at midnight in Sri Lankan timezone
 */
function getSriLankanToday() {
  const today = getSriLankanDate();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Compare dates using Sri Lankan timezone
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {number} Negative if date1 < date2, positive if date1 > date2, 0 if equal
 */
function compareSriLankanDates(date1, date2) {
  const d1 = toSriLankanDate(date1);
  const d2 = toSriLankanDate(date2);
  if (!d1 || !d2) return 0;
  return d1.getTime() - d2.getTime();
}

