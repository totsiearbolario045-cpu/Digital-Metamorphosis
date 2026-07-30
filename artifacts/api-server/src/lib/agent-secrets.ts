/**
 * Server-only access to secrets used by agent runtime capabilities.
 *
 * Keep this module out of frontend packages and never return these values from
 * an HTTP response or include them in logs. Replit injects the values into
 * process.env at runtime.
 */
const AGENT_SECRET_KEYS = {
  pythonBackend: "python_backend",
  pythonBackendFallback: "python_backend_",
  pythonBackendInversed: "python_backend_inversed",
  lambdaTelemetry: "LAMBDA_TELEMETRY",
  devopsCompliance: "devops_compliance",
  controlPlaneWorkers: "digital_metamorphosis_workers",
} as const;

export type AgentSecretName = keyof typeof AGENT_SECRET_KEYS;

/**
 * Read one approved agent secret from the server runtime.
 *
 * This is intentionally allowlisted so agent code cannot accidentally read
 * unrelated environment variables such as database or session credentials.
 */
export function getAgentSecret(name: AgentSecretName): string | undefined {
  const value = process.env[AGENT_SECRET_KEYS[name]];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function requireAgentSecret(name: AgentSecretName): string {
  const value = getAgentSecret(name);
  if (!value) {
    throw new Error(`Agent capability "${name}" is not configured.`);
  }

  return value;
}

export function getAgentRuntimeStatus() {
  const capabilities = [
    {
      id: "python-backend",
      configured: Boolean(getAgentSecret("pythonBackend")),
    },
    {
      id: "python-backend-fallback",
      configured: Boolean(getAgentSecret("pythonBackendFallback")),
    },
    {
      id: "python-backend-inversed",
      configured: Boolean(getAgentSecret("pythonBackendInversed")),
    },
    {
      id: "telemetry",
      configured: Boolean(getAgentSecret("lambdaTelemetry")),
    },
    {
      id: "compliance",
      configured: Boolean(getAgentSecret("devopsCompliance")),
    },
    {
      id: "control-plane-workers",
      configured: Boolean(getAgentSecret("controlPlaneWorkers")),
    },
  ];

  return {
    status: capabilities[0].configured ? "ready" : "degraded",
    capabilities,
  } as const;
}