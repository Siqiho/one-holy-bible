export function normalizePublicHostname(hostname: string): string {
  return hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "")
    .toLowerCase();
}

function ipv4Octets(hostname: string): number[] | undefined {
  const parts = hostname.split(".");
  if (parts.length !== 4) return undefined;
  const octets = parts.map(Number);
  return octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? octets
    : undefined;
}

export function isPublicLoopbackHost(hostname: string): boolean {
  const host = normalizePublicHostname(hostname);
  if (host === "localhost" || host === "::1") return true;
  const octets = ipv4Octets(host);
  return octets?.[0] === 127;
}

export function isPrivateOrLocalPublicHost(hostname: string): boolean {
  const host = normalizePublicHostname(hostname);
  if (isPublicLoopbackHost(host) || host.endsWith(".local")) return true;
  const octets = ipv4Octets(host);
  if (octets) {
    const [first, second] = octets;
    return first === 0
      || first === 10
      || (first === 100 && second >= 64 && second <= 127)
      || first === 127
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168);
  }
  return host.includes(":");
}
