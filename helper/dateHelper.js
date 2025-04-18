const moment = require('moment-timezone');

class DateHelper {
    constructor() {
        process.env.TZ = 'Europe/Moscow';
        this.timeZone = 'Europe/Moscow';
    }

    getDateNow() {
        return moment().tz(this.timeZone); // Измените это для получения объекта Moment
    }

    convertToTimeZone(date) {
        let mDate;
        try {
            mDate = moment(date);
            if (!mDate.isValid()) {
                console.error("Invalid date provided.");
                return null;
            }
            return mDate.tz(this.timeZone).format('YYYY-MM-DD HH:mm:ss');
        } catch (error) {
            console.error("Error converting date:", error);
            return null;
        }
    }

    setTimeZone(timeZone) {
        this.timeZone = timeZone;
    }
}

module.exports = new DateHelper();
