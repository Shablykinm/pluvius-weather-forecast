const moment = require('moment-timezone');
const DateHelper = require('../helper/dateHelper'); 
/**
 * Класс для анализа погодных данных. Все методы статические.
 * Предоставляет функционал для определения текущей погоды, осадков и формирования читаемых строк.
 */
class WeatherAnalyzer {
    /**
     * Основной метод анализа данных. Собирает информацию о температуре и осадках.
     * @param {Object} rawData - Исходные данные с сервера
     * @returns {Object} Объект с:
     * - данными об осадках (isRaining, currentRain, nextRain)
     * - текущим периодом (currentPeriod)
     * - строкой с температурой (temp)
     */
    static analyze(rawData) {
        // Конвертируем все временные метки в московское время
        const convertTimes = (times) => times.map(t => 
            moment(t).tz('Europe/Moscow').toDate()
        );
    
        const processedData = {
            DefaultData: {
                ...rawData.DefaultData,
                times: convertTimes(rawData.DefaultData.times),
                temperatures: rawData.DefaultData.temperatures || [],
                feelsTemperatures: rawData.DefaultData.feelsTemperatures || []
            },
            Precipitation: {
                ...rawData.Precipitation,
                times: convertTimes(rawData.Precipitation.times),
                precipitations: rawData.Precipitation.precipitations || []
            }
        };
    
        const currentPeriod = this.findCurrentPeriod(processedData.DefaultData.times);
        
        return {
            ...this.analyzeRain(processedData.Precipitation),
            temp: this.analyzeTemperatures(processedData.DefaultData, currentPeriod).temp,
            currentPeriod,
            // Добавляем сырые данные об осадках для сравнения
            rawPrecipitations: processedData.Precipitation.precipitations
        };
    }

    /**
     * Определяет текущий временной интервал на основе текущего времени системы.
     * @param {Date[]} dateTimes - Массив временных меток
     * @returns {Object|null} Объект с:
     * - index (индекс текущего периода)
     * - start (начало периода)
     * - end (конец периода)
     * Или null, если данные отсутствуют
     */
    static findCurrentPeriod(dateTimes) {
        if (!dateTimes?.length) return null;
    
        // Сортируем метки времени на случай несортированных данных
        const sortedTimes = [...dateTimes].sort((a, b) => a - b);
        const now = DateHelper.getDateNow();
    
        // Определяем базовый интервал между прогнозами
        const baseInterval = this.calculateBaseInterval(sortedTimes);
    
        for (let i = 0; i < sortedTimes.length; i++) {
            const start = sortedTimes[i];
            const end = i < sortedTimes.length - 1 
                ? sortedTimes[i + 1] 
                : new Date(start.getTime() + baseInterval);
    
            if (now >= start && now < end) {
                return { 
                    index: i,
                    start: moment(start).tz('Europe/Moscow').toDate(),
                    end: moment(end).tz('Europe/Moscow').toDate()
                };
            }
        }
        
        // Если текущее время позже последней метки
        const lastTime = sortedTimes[sortedTimes.length - 1];
        return {
            index: sortedTimes.length - 1,
            start: lastTime,
            end: new Date(lastTime.getTime() + baseInterval)
        };
    }
    
    // Новый метод для расчета базового интервала
    static calculateBaseInterval(times) {
        if (times.length < 2) return 3 * 60 * 60 * 1000; // дефолт 3 часа
        
        const intervals = [];
        for (let i = 1; i < times.length; i++) {
            intervals.push(times[i] - times[i - 1]);
        }
        
        // Берем наиболее частый интервал
        const frequencyMap = intervals.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});
    
        return Number(Object.entries(frequencyMap)
            .sort((a, b) => b[1] - a[1])[0][0]);
    }

    /**
     * Анализ осадков. Определяет текущие и будущие дожди.
     * @param {number[]} precipitations - Массив значений осадков
     * @param {Date[]} dateTimes - Массив временных меток
     * @returns {Object} Объект с:
     * - isRaining (идет ли дождь сейчас)
     * - currentRain (форматированные данные текущего дождя)
     * - nextRain (форматированные данные следующего дождя)
     */
    static analyzeRain(precipitationData) {
        const { precipitations, times } = precipitationData;
        const now = DateHelper.getDateNow();
    
        let currentRain = null;
        const futureRains = [];
    
        for (let i = 0; i < precipitations.length; i++) {
            const start = times[i];
            const end = times[i + 1] || new Date(start.getTime() + this.calculateBaseInterval(times));
    
            if (precipitations[i] > 0) {
                if (now >= start && now < end) {
                    currentRain = { start, end, precipitation: precipitations[i] };
                } else if (start > now) {
                    futureRains.push({ start, end, precipitation: precipitations[i] });
                }
            }
        }
    
        return {
            isRaining: !!currentRain,
            currentRain: currentRain ? this.formatRainGroup(currentRain) : null,
            futureRains: futureRains.map(r => this.formatRainGroup(r))
        };
    }

    /**
     * Форматирование данных о дожде в читаемый вид.
     * @param {Object} group - Группа осадков
     * @returns {Object} Объект с:
     * - start (время начала)
     * - end (время окончания)
     * - precipitation (суммарные осадки)
     */
    static formatRainGroup(group) {
        return {
            start: this.formatTime(group.start),
            end: this.formatTime(group.end),
            precipitation: group.precipitation // убрали .reduce и .toFixed()
        };
    }

    /**
     * Форматирование даты в строку времени (ЧЧ:ММ)
     * @param {Date} date - Временная метка
     * @returns {string} Строка в формате 'ЧЧ:ММ'
     */
    static formatTime(date) {
        return moment(date).format('HH:mm');
    }

    /**
     * Анализ температурных данных. Формирует строку с текущим и следующим значением.
     * @param {Object} defaultData - Данные о температуре
     * @param {Object} currentPeriod - Текущий временной период
     * @returns {Object} Объект с температурной строкой вида:
     * '+20(+18) → +19(+17)°C'
     */
    static analyzeTemperatures(defaultData, currentPeriod) {
        const getValue = (arr, index) => 
            (arr && index < arr.length) ? arr[index] : 'N/A';
    
        const currentIndex = currentPeriod?.index ?? 0;
        const nextIndex = currentIndex + 1;
    
        const format = (val) => {
            if (val === 'N/A') return '?';
            return val > 0 ? `+${val}` : val;
        };
    
        const currentTemp = getValue(defaultData.temperatures, currentIndex);
        const nextTemp = getValue(defaultData.temperatures, nextIndex);
        const currentFeels = getValue(defaultData.feelsTemperatures, currentIndex);
        const nextFeels = getValue(defaultData.feelsTemperatures, nextIndex);
    
        return {
            temp: `${format(currentTemp)}(${format(currentFeels)}) → ${format(nextTemp)}(${format(nextFeels)})°C`
        };
    }

    
    /**
     * Определяет минимальную и максимальную температуру текущего дня по данным DefaultData.
     * @param {Object} defaultData - Данные с временными метками и температурами.
     * @returns {Object} Объект с min и max температурой.
     */
    static getDailyTemperatureExtremes(defaultData) {
        const now = DateHelper.getDateNow();
        const currentDayStart = now.clone().startOf('day').toDate();
        const currentDayEnd = now.clone().add(1, 'day').startOf('day').toDate();

        const indices = [];
        defaultData.times.forEach((date, index) => {
            if (date >= currentDayStart && date < currentDayEnd) {
                indices.push(index);
            }
        });

        const temps = indices
            .map(i => defaultData.temperatures[i])
            .filter(t => t != null);

        if (temps.length === 0) return { min: null, max: null };

        return {
            min: Math.min(...temps),
            max: Math.max(...temps)
        };
    }
}

module.exports = WeatherAnalyzer;