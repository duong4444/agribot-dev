export class DateUtils {
  static getVietnamTime(): Date {
    // Create a date object with the current time
    const now = new Date();
    
    // Convert to Vietnam time string
    const vietnamTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    // Create a new Date object from the Vietnam time string
    // This effectively "shifts" the time to match Vietnam wall time
    return new Date(vietnamTimeString);
  }

  static toVietnamTime(date: Date): Date {
    const vietnamTimeString = date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    return new Date(vietnamTimeString);
  }
}
