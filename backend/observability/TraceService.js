// observability/TraceService.js
// Distributed tracing with span lifecycle and ring buffer storage.

const { v4: uuidv4 } = require('uuid');

class TraceService {
  constructor(maxSpans = 1000) {
    this.spans = [];
    this.activeSpans = new Map();
    this.maxSpans = maxSpans;
  }

  startSpan(name, parentId = null) {
    const span = {
      id: uuidv4(),
      name,
      parent_id: parentId,
      start_time: Date.now(),
      end_time: null,
      duration_ms: null,
      metadata: {},
      status: 'active',
    };
    this.activeSpans.set(span.id, span);
    return span;
  }

  endSpan(spanId, metadata = {}) {
    const span = this.activeSpans.get(spanId);
    if (!span) return null;
    span.end_time = Date.now();
    span.duration_ms = span.end_time - span.start_time;
    span.metadata = { ...span.metadata, ...metadata };
    span.status = 'completed';
    this.activeSpans.delete(spanId);
    this.spans.push(span);
    if (this.spans.length > this.maxSpans) this.spans.shift();
    return span;
  }

  getTrace(spanId) {
    const span = this.spans.find(s => s.id === spanId);
    if (!span) return null;
    const children = this.spans.filter(s => s.parent_id === spanId);
    return { span, children };
  }

  getActiveSpans() {
    return Array.from(this.activeSpans.values());
  }

  getAllSpans(limit = 100) {
    return this.spans.slice(-limit);
  }

  getRequestTimeline(requestId) {
    const related = this.spans.filter(s =>
      s.metadata.requestId === requestId ||
      s.metadata.traceId === requestId
    ).sort((a, b) => a.start_time - b.start_time);
    return related;
  }

  getMetrics() {
    const completed = this.spans.filter(s => s.status === 'completed');
    const durations = completed.map(s => s.duration_ms).filter(d => d !== null);
    return {
      total_spans: this.spans.length,
      active_spans: this.activeSpans.size,
      completed_spans: completed.length,
      avg_duration_ms: durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
    };
  }
}

const traceService = new TraceService();
module.exports = traceService;