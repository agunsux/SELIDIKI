// notification/NotificationService.js
/**
 * NotificationService — ARGUS v1.3
 *
 * Multi-channel notification platform supporting email, push, webhook, WhatsApp.
 */

class NotificationService {
  constructor() {
    this._providers = {};
    this._templates = new Map();
  }

  registerProvider(name, provider) {
    this._providers[name] = provider;
  }

  registerTemplate(name, templateFn) {
    this._templates.set(name, templateFn);
  }

  async send(params) {
    const { channel, to, template, data, priority = 'normal' } = params;
    const provider = this._providers[channel];
    if (!provider) throw new Error(`No provider for channel: ${channel}`);

    const templateFn = this._templates.get(template);
    const content = templateFn ? templateFn(data) : data;

    return provider.send({ to, content, priority });
  }

  async sendBroadcast(params) {
    const { channels, to, template, data } = params;
    const results = {};
    for (const channel of channels) {
      results[channel] = await this.send({ channel, to, template, data });
    }
    return results;
  }
}

// Simple email provider stub
class EmailProvider {
  async send({ to, content, priority }) {
    if (!process.env.SMTP_HOST) return { status: 'not_configured', channel: 'email' };
    // In production, integrate with nodemailer or SendGrid
    console.log(`[EMAIL][${priority}] To: ${to} Subject: ${content.subject}`);
    return { status: 'queued', channel: 'email', to, messageId: `email_${Date.now()}` };
  }
}

class WebhookProvider {
  constructor() { this._webhooks = new Map(); }

  register(url, secret) { this._webhooks.set(url, secret); }

  async send({ to, content, priority }) {
    try {
      const resp = await fetch(to, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: content.event, data: content.data, timestamp: new Date().toISOString() }),
      });
      return { status: resp.ok ? 'sent' : 'failed', channel: 'webhook', statusCode: resp.status };
    } catch { return { status: 'failed', channel: 'webhook', error: 'unreachable' }; }
  }
}

class WhatsAppProvider {
  async send({ to, content, priority }) {
    if (!process.env.TWILIO_ACCOUNT_SID) return { status: 'not_configured', channel: 'whatsapp' };
    console.log(`[WA][${priority}] To: ${to} Body: ${content.body?.substring(0, 50)}`);
    return { status: 'queued', channel: 'whatsapp', to };
  }
}

// Template engine
class TemplateEngine {
  static render(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || `{{${key}}}`);
  }

  static reportAlert(data) {
    return { subject: 'New Fraud Report', body: `Entity ${data.entityHash} reported as ${data.category}` };
  }

  static caseUpdate(data) {
    return { subject: `Case ${data.caseNo} Updated`, body: `Case status changed to ${data.status}` };
  }

  static verificationComplete(data) {
    return { subject: 'Verification Complete', body: `Your identity has been verified as ${data.level}` };
  }
}

module.exports = { NotificationService, EmailProvider, WebhookProvider, WhatsAppProvider, TemplateEngine };