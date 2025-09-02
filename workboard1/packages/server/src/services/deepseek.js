import config from '../config/env.js';
import logger from '../config/logger.js';

class DeepSeekService {
  constructor() {
    this.baseUrl = config.deepseek.baseUrl;
    this.model = config.deepseek.model;
    this.apiKey = config.deepseek.apiKey;
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      logger.warn('DeepSeek API key not configured, returning mock response');
      return this.getMockResponse();
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('DeepSeek service error:', error);
      // Return mock response as fallback
      return this.getMockResponse();
    }
  }

  getMockResponse() {
    return JSON.stringify({
      decision: 'APPROVED',
      rationale: 'Leave request appears reasonable with adequate notice and no immediate conflicts detected.',
      conflicts: [],
      actions: ['Approve leave request', 'Update leave balance'],
      notify: ['Direct manager', 'HR department'],
      questions: []
    });
  }
}

export default new DeepSeekService();