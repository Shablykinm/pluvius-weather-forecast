const puppeteer = require('puppeteer'); // Импортируем библиотеку Puppeteer для работы с браузером
const cheerio = require('cheerio'); // Импортируем Cheerio для парсинга HTML-кода
const WeatherMessenger = require('./weatherMessenger'); // Импорт мессенджера погоды
const DateHelper = require('../helper/dateHelper');

class BaseService {
    constructor(config) {
        this.config = config;
        this.headers = {
            'User-Agent': this.generateRandomUserAgent()
        };
        this.browser = null; // Добавляем переменную для хранения браузера
    }
    generateRandomUserAgent() {
        const versions = ['98.0.4758.102', '99.0.4844.51', '100.0.4896.127'];
        return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${versions[Math.floor(Math.random() * (versions.length - 1))]
            } Safari/537.36`;
    }
    async initBrowser() {
        const isDocker = process.env.IS_DOCKER === 'true';
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                executablePath: isDocker
                    ? process.env.PUPPETEER_EXECUTABLE_PATH
                    : puppeteer.executablePath(),
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--single-process',
                    '--disable-gpu'
                ]
            });
        }
    }

    async loadPage(url) {
        await this.initBrowser(); // Инициализируем браузер при первом вызове
        await new Promise(resolve =>
            setTimeout(resolve, 1000 + Math.random() * 2000)
        );
        const page = await this.browser.newPage();
        try {
            await page.setExtraHTTPHeaders(this.headers);

            // await page.setCacheEnabled(false);
            // await page.setJavaScriptEnabled(true);
            // // Очистка памяти и кеша перед навигацией
            // await page.evaluateOnNewDocument(() => {
            //     Object.defineProperty(navigator, 'webdriver', { get: () => false });
            // });
            const response = await page.goto(url, {
                timeout: 30000
            });

            if (!response.ok()) {
                throw new Error(`HTTP ${response.status()} - ${url}`);
            }
            const content = await page.content();
            return cheerio.load(content);
        } finally {
            await page.close(); // Закрываем только страницу, а не браузер

            //Если начинаются проблемы с недопарсингом яндекса - закрывать каждый раз браузер это единственное решение
            await this.browser.close();
            this.browser = null;

        }
    }

    async destroy() {
        if (this.browser) {
            await this.browser.close();
        }
    }
    // Метод для форматирования результата
    formatResult(rawData, analysis) {
        const now = DateHelper.getDateNow();
        return {
            ...analysis, // Объединяем анализ с остальными данными
            status: rawData.DefaultData.weatherStates[analysis.currentPeriod?.index], // Устанавливаем статус погоды
            weatherData: {
                times: rawData.DefaultData.times, // Время погоды
                temperatures: rawData.DefaultData.temperatures, // Температуры
                feelsTemperatures: rawData.DefaultData.feelsTemperatures, // Ощущаемые температуры
                precipitations: rawData.Precipitation.precipitations // Данные об осадках
            },
            timestamp: now
        };
    }

    // Метод для валидации парсенных данных
    validateData(data) {
        const defaultData = data.DefaultData; // Извлекаем данные по умолчанию
        const precipitation = data.Precipitation; // Извлекаем данные об осадках

        // Функция для валидации массивов
        const validateArray = (arr, name) => {
            if (!arr || !arr.length) throw new Error(`Invalid ${name} array`); // Выбрасываем ошибку при пустом массиве
        };

        // Валидируем необходимые массивы
        validateArray(defaultData.times, 'times');
        validateArray(defaultData.weatherStates, 'weatherStates');
        validateArray(defaultData.temperatures, 'temperatures');
        validateArray(precipitation.precipitations, 'precipitations');
    }

    // Метод для генерации сообщения о погоде
    generateMessage(serviceName, newState, prevState) {

        return WeatherMessenger.createMessage({
            serviceName: serviceName,
            rainData: newState
        });
    }
}

// Экспортируем класс для использования в других модулях
module.exports = BaseService;
