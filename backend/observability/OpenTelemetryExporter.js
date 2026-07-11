// observability/OpenTelemetryExporter.js
// Exports spans via OpenTelemetry Protocol (OTLP) to configured collector.

const http = require('http');
const TraceService = require('./TraceService');

class OpenTelemetryExporter {
  constructor(endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces') {
    this.endpoint = endpoint;
    this.batchSize = 64;
    this.exportIntervalMs = 5000;
    this.buffer = [];
    this._interval = null;
  }

  start() {
    this._interval = setInterval(() => this.flush(), this.exportIntervalMs);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    this.flush();
  }

  async exportSpan(span) {
    this.buffer.push(span);
    if (this.buffer.length >= this.batchSize) await this.flush();
  }

  async flush() {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.batchSize);
    const otlpPayload = this._convertToOTLP(batch);
    try { await this._send(otlpPayload); }
    catch (e) { /* silently fail, retry on next interval */ }
  }

  _convertToOTLP(spans) {
    return {
      resourceSpans: [{
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'selidiki-api' } }] },
        scopeSpans: [{
          scope: { name: 'selidiki-observability' },
          spans: spans.map(s => ({
            traceId: s.metadata?.traceId || s.id.replace(/-/g, '').slice(0, 32),
            spanId: s.id.replace(/-/g, '').slice(0, 16),
            parentSpanId: s.parent_id ? s.parent_id.replace(/-/g, '').slice(0, 16) : undefined,
            name: s.name,
            kind: 1,
            startTimeUnixNano: s.start_time * 1000000,
            endTimeUnixNano: (s.end_time || Date.now()) * 1000000,
            status: s.status === 'completed' ? { code: 1 } : { code: 2 },
            attributes: Object.entries(s.metadata).map(([k, v]) => ({
              key: k, value: { stringValue: String(v) },
            })),
          })),
        }],
      }],
    };
  }

  async _send(payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const url = new URL(this.endpoint);
      const req = http.request({
        hostname: url.hostname, port: url.port, path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      }, res => { res.on('data', () => {}); resolve(res.statusCode); });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

module.exports = OpenTelemetryExporter;