const { Telegraf } = require('telegraf');
const config = require('../config/production');

class TelegramService {
  constructor() {
    // Проверяем наличие необходимых конфигов
    if (!config.telegram?.default?.services) {
      throw new Error('Telegram config not found!');
    }

    this.bot = new Telegraf(config.telegram.default.token);
    this.services = {};

    // Преобразуем структуру конфига
    for (const [serviceName, settings] of Object.entries(config.telegram.default.services)) {
      this.services[serviceName] = {
        chatId: settings.chatId,
        threadId: settings.threadId,
        url: settings.url,
        status: settings.status
      };
    }

    this.bot.launch();
  }

  async sendMessage(serviceName, message) {
    const target = this.services[serviceName];
    
    if (!target || !target.status) {
      console.log(`Service ${serviceName} disabled or not found`);
      return;
    }

    try {
      await this.bot.telegram.sendMessage(
        target.chatId,
        message,
        {
          message_thread_id: target.threadId,
          parse_mode: 'HTML'
        }
      );
      console.log(`Message sent to ${serviceName} topic`);
    } catch (error) {
      console.error(`[Telegram] Error for ${serviceName}:`, error.message);
    }
  }
}

module.exports = new TelegramService();