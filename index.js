const StateManager = require('./lib/stateManager'); // Менеджер состояния для отслеживания изменений
const TelegramService = require('./lib/telegramBot'); // Сервис для работы с Telegram API
const config = require('./config/production'); // Конфигурация приложения
const moment = require('moment-timezone');
/**
 * Проверяет состояние сервиса и отправляет уведомление при изменениях
 * @param {Object} serviceInstance - Экземпляр сервиса (например, GismeteoService)
 * @param {string} serviceName - Название сервиса из конфига (например, 'gismeteo')
 */
async function checkService(serviceInstance, serviceName) {
    try {
        const newState = await serviceInstance.checkWeather();
        if (!newState) return;

        const { changed, dayChanged, prevState, newState: cleanState } = 
            StateManager.setState(serviceName, newState);
        
        if (changed) {
            // Если сменился день - генерируем сообщение как при первом запуске
            const effectivePrevState = dayChanged ? null : prevState;
            
            const message = serviceInstance.generateMessage(
                serviceName,
                cleanState,
                effectivePrevState
            );
            
            TelegramService.sendMessage(serviceName, message);
            
            // Логируем смену дня
            if (dayChanged) {
                console.log(`[${serviceName}] Смена дня: ${moment()
                    .tz('Europe/Moscow')
                    .format('YYYY-MM-DD')}`);
            }
        }
    } catch (error) {
        console.error(`[${serviceName}] Error:`, error.message);
    }
}

/**
 * Форматирует сообщение для Telegram на основе изменений состояния
 * @param {Object|null} prevState - Предыдущее состояние
 * @param {Object} newState - Новое состояние
 * @returns {string} Отформатированное сообщение
 */

/**
 * Основная функция приложения
 * - Инициализирует сервисы из конфига
 * - Запускает периодические проверки
 */
async function main() {
    try {
        const serviceConfigs = config.telegram.default.services;
        const services = [];

        // Инициализация сервисов из конфигурации
        for (const [name, cfg] of Object.entries(serviceConfigs)) {
            if (cfg.status) {
                const ServiceClass = require(`./services/${name}/service`);
                services.push({
                    instance: new ServiceClass(cfg),
                    name
                });
            }
        }

        // Первоначальная проверка состояния для всех сервисов
        await Promise.all(services.map(s => checkService(s.instance, s.name)));

        // Функция для определения интервала проверки
        const getCheckInterval = () => {
            let minInterval = 60 * 60 * 1000; // По умолчанию 1 час
             
            services.forEach(service => {
                const state = StateManager.getState(service.name);
                if (!state) return;
        
                if (state.isRaining) {
                    minInterval = Math.min(minInterval, 10 * 60 * 1000);
                    console.log(`Обнаружен текущий дождь в ${service.name} -> 10 мин.`);
                } else if (state.futureRains?.length > 0) {
                    minInterval = Math.min(minInterval, 30 * 60 * 1000);
                    console.log(`Ожидаются осадки в ${service.name} -> 30 мин.`);
                } else {
                    minInterval = Math.min(minInterval, 60 * 60 * 1000);
                    console.log(`Нет осадков в ${service.name} -> 60 мин.`);
                }
            });
        
            return minInterval;
        };

        // Рекурсивная функция для проверки с динамическим интервалом
        const scheduleCheck = async () => {
            try {
                await Promise.all(services.map(s => checkService(s.instance, s.name)));
            } catch (error) {
                console.error('Error during scheduled check:', error);
            }
            
            // Планируем следующую проверку
            setTimeout(scheduleCheck, getCheckInterval());
        };

        // Первый запуск периодической проверки
        setTimeout(scheduleCheck, getCheckInterval());

        // Правильное завершение работы
        process.on('SIGINT', async () => {
            await Promise.all(services.map(s => s.instance.destroy()));
            process.exit();
        });
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}
// Запуск приложения
main();