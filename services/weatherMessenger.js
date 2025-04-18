const moment = require('moment-timezone');
const WeatherAnalyzer = require('./weatherAnalyzer'); // Импорт анализатора погоды
class WeatherMessenger {
    // Метод для создания сообщения о погоде
    static createMessage(data) {
        const { serviceName, rainData } = data;
        let message = `${serviceName} service: \n`;
    
        // Добавляем блок ожидаемого прогноза на сегодня
        const todayForecastEntries = this.getTodayForecastEntries(rainData.weatherData);
        if (todayForecastEntries.length > 0) {
            message += `⏳ Ожидаемый прогноз на сегодня:\n${todayForecastEntries.join('\n')}\n`;
        }
    
        // Добавляем информацию о дожде
        message += this.getRainMessagePart(rainData);
    
        // Добавляем температурный диапазон
        const extremes = WeatherAnalyzer.getDailyTemperatureExtremes(rainData.weatherData);
        if (extremes.min !== null && extremes.max !== null) {
            message += `🌡️ Температура сегодня от ${extremes.min} до ${extremes.max}`;
        } else {
            message += '🌡️ Температурные данные недоступны';
        }
    
        return message;
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

    static getRainMessagePart(rainData) {
        if (rainData.isRaining) {
            let msg = `🌧️ Сейчас идет дождь (${rainData.currentRain.precipitation} мм)\n`;
            if (rainData.futureRains.length > 0) {
                const futureIntervals = rainData.futureRains.map(r => `${r.start}-${r.end}`).join(',\n');
                msg += `⏳ После текущего ожидается:\n${futureIntervals}\n`;
            }
            return msg;
        }
        if (rainData.futureRains.length > 0) {
            const rainIntervals = rainData.futureRains.map(r => `${r.start}-${r.end}`).join(',\n');
            return `🌧️ Ожидается дождь:\n${rainIntervals}\n`;
        }
        return '☀️ Осадков не ожидается\n';
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