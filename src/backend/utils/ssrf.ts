import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const isPrivateIP = (ip: string): boolean => {
  // IPv6 loopback and private ranges (ULA, etc.)
  if (ip === '::1' || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }
  
  // Check for IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // Handle localhost for IPv4
  if (ip === '127.0.0.1') {
    return true;
  }

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
     return false; // Not a valid IPv4 address string
  }

  const [p1, p2] = parts;
  if (p1 === undefined || p2 === undefined) {
    return false; // Should not happen due to length check
  }

  return (
    p1 === 10 || // 10.0.0.0/8
    (p1 === 172 && p2 >= 16 && p2 <= 31) || // 172.16.0.0/12
    (p1 === 192 && p2 === 168) || // 192.168.0.0/16
    p1 === 127 || // 127.0.0.0/8
    (p1 === 169 && p2 === 254) // 169.254.0.0/16 (APIPA)
  );
};

type SafetyResult = { safe: true } | { safe: false, message: string, status: number };

export const checkUrlSafety = async (url: string): Promise<SafetyResult> => {
    try {
        const urlObj = new URL(url);

        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return { safe: false, message: 'URL must use http or https protocol.', status: 400 };
        }
        
        const hostname = urlObj.hostname;
        const isHostnameAnIp = isIP(hostname) !== 0;

        if (isHostnameAnIp) {
            if (isPrivateIP(hostname)) {
                return { safe: false, message: 'Fetching specs from private or local network addresses is forbidden.', status: 403 };
            }
        } else {
            try {
                const addresses = await lookup(hostname, { all: true });
                if (addresses.some(addr => isPrivateIP(addr.address))) {
                    return { safe: false, message: 'Fetching specs from private or local network addresses is forbidden.', status: 403 };
                }
            } catch (dnsError) {
                return { safe: false, message: `Could not resolve hostname: ${hostname}`, status: 400 };
            }
        }

        return { safe: true };

    } catch (e) {
        if (e instanceof TypeError) {
            return { safe: false, message: `Invalid URL provided: ${url}`, status: 400 };
        }
        const message = e instanceof Error ? e.message : String(e);
        return { safe: false, message: `An unexpected error occurred while validating URL: ${message}`, status: 500 };
    }
};