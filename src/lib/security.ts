type SecurityEventLevel = "info" | "warn" | "error";

type SecurityEvent = {
  event: string;
  level?: SecurityEventLevel;
  path?: string;
  message?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

type RequiredEnvKey = "MAP_VIEW_SECRET";

export function getRequiredEnv(name: RequiredEnvKey): string | null {
  const value = process.env[name];
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function logSecurityEvent({
  event,
  level = "info",
  path,
  message,
  metadata,
}: SecurityEvent): void {
  const payload = {
    category: "security",
    event,
    level,
    path,
    message,
    ...metadata,
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}
