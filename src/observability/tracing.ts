import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';

export async function startTracing() {
  const enabled = process.env.OTEL_ENABLED === 'true';
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  if (!enabled) {
    return async () => undefined;
  }

  if (nodeEnv === 'production' && !process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    throw new Error('OTEL_EXPORTER_OTLP_ENDPOINT is required when OTEL_ENABLED=true in production');
  }

  const exporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      })
    : new ConsoleSpanExporter();

  const sdk = new NodeSDK({
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  await sdk.start();

  return async () => {
    await sdk.shutdown();
  };
}
