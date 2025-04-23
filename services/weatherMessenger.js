const moment = require('moment-timezone');
const WeatherAnalyzer = require('./weatherAnalyzer'); // Импорт анализатора погоды
class WeatherMessenger {
    // Метод для создания сообщения о погоде
    static createMessage(data) {
        const { serviceName, rainData } = data;
        let message = `${serviceName} service: \n`;
    
        // Прогноз температуры по дням
        const forecastByDate = this.getForecastByDate(rainData.weatherData);
        const tempExtremes = WeatherAnalyzer.getDailyTemperatureExtremes(rainData.weatherData);
        
        if (Object.keys(forecastByDate).length > 0) {
            message += "⏳ Ожидаемый прогноз:\n";
            Object.entries(forecastByDate).forEach(([dateKey, { date, entries }]) => {
                const extremes = tempExtremes[dateKey] || { min: '?', max: '?' };
                message += `${date} (от ${extremes.min} до ${extremes.max})\n`;
                entries.forEach(({ time, temp }) => {
                    const formattedTime = moment(time).tz('Europe/Moscow').format('HH:mm');
                    const tempStr = temp > 0 ? `+${temp}` : temp;
                    message += `${formattedTime} : ${tempStr}\n`;
                });
            });
        }
    
        // Осадки
        message += this.getRainMessagePart(rainData);
    
        return message;
    }
    static getForecastByDate(weatherData) {
        const now = moment().tz('Europe/Moscow');
        const allowedHours = new Set([9, 12, 15, 18, 21]);
        
        const forecasts = weatherData.times
            .map((time, index) => ({
                time: moment(time).tz('Europe/Moscow'),
                temp: weatherData.temperatures[index]
            }))
            .filter(({ time, temp }) => 
                time.isAfter(now) && 
                allowedHours.has(time.hour()) && 
                temp != null
            )
            .sort((a, b) => a.time - b.time);
    
        const grouped = {};
        forecasts.forEach(({ time, temp }) => {
            const dateKey = time.format('YYYY-MM-DD');
            if (!grouped[dateKey]) {
                grouped[dateKey] = {
                    date: time.format('DD.MM.YYYY'),
                    entries: []
                };
            }
            grouped[dateKey].entries.push({ time: time.toDate(), temp });
        });
    
        return grouped;
    }
    static getTodayForecastEntries(weatherData) {
        const now = new Date();
        const allowedHours = new Set([0, 3, 6, 9, 12, 15, 18, 21]);
        
        // Фильтруем и сортируем данные
        const filtered = weatherData.times
            .map((time, index) => ({
                time: new Date(time),
                temp: weatherData.temperatures[index]
            }))
            .filter(({time, temp}) => {
                // Проверяем что время:
                // 1. Еще не наступило
                // 2. Часы совпадают с разрешенными
                // 3. В пределах текущего дня
                return time > now &&
                    allowedHours.has(time.getHours()) &&
                    time.getDate() === now.getDate();
            })
            .sort((a, b) => a.time - b.time); // Сортируем по времени
    
        // Форматируем результат
        return filtered.map(({time, temp}) => {
            const formattedTime = moment(time)
                .tz('Europe/Moscow')
                .format('HH:mm');
            const tempStr = temp > 0 ? `+${temp}` : temp;
            return `${formattedTime} : ${tempStr}`;
        });
    }
    // Новый метод для обработки строки температуры
    static processTempString(tempStr) {
        return tempStr.replace(/([+-]?\d+)\(([+-]?\d+)\)/g, (match, main, feelsLike) => {
            return main === feelsLike ? main : match;
        });
    }

    // Остальные методы остаются без изменений
    static cleanWeatherStatus(status) {
        return status
            .replace(/,?\s?небольшой\s?/gi, '')
            .replace(/\s{2,}/g, ' ');
    }
    static splitIntervalByDays(start, end) {
        const intervals = [];
        let currentStart = moment(start).tz('Europe/Moscow');
        const currentEnd = moment(end).tz('Europe/Moscow');
    
        while (currentStart.isBefore(currentEnd)) {
            const endOfDay = currentStart.clone().endOf('day');
            const intervalEnd = moment.min(endOfDay, currentEnd);
    
            intervals.push({
                start: currentStart.toDate(),
                end: intervalEnd.toDate()
            });
    
            currentStart = intervalEnd.clone().add(1, 'second');
        }
    
        return intervals;
    }
    static getRainMessagePart(rainData) {
        const rains = [];
    if (rainData.isRaining) rains.push(rainData.currentRain);
    rains.push(...(rainData.futureRains || []));

    const grouped = {};
    rains.forEach(rain => {
        const intervals = this.splitIntervalByDays(rain.start, rain.end);
        intervals.forEach(interval => {
            const startMoment = moment(interval.start).tz('Europe/Moscow');
            const endMoment = moment(interval.end).tz('Europe/Moscow');
            
            const dateKey = startMoment.format('DD.MM.YYYY');
            const startTime = startMoment.format('HH:mm');
            const endTime = endMoment.format('HH:mm');

            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(`${startTime}-${endTime} (${rain.type})`);
        });
    });
    
        if (Object.keys(grouped).length === 0) return '☀️ Осадков не ожидается\n';
    
        let msg = '🌧️ Ожидаются осадки:\n';
        Object.entries(grouped).forEach(([date, intervals]) => {
            msg += `${date}:\n${intervals.join(',\n')}\n`;
        });
    
        return msg;
    }

    static getCurrentPeriodMessagePart(currentPeriod) {
        return currentPeriod
            ? `(${this.formatTime(currentPeriod.start)}-${this.formatTime(currentPeriod.end)})`
            : '';
    }

    static formatTime(date) {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).slice(0, 5);
    }
}

module.exports = WeatherMessenger;