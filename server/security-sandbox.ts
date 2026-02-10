import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SandboxViolation {
  timestamp: string;
  type: 'filesystem' | 'network' | 'process' | 'permission' | 'signal';
  action: string;
  target: string;
  reason: string;
  severity: 'warning' | 'critical';
}

const VIOLATIONS_FILE = path.join(process.cwd(), 'data', 'eva-sandbox-violations.json');
let recentViolations: SandboxViolation[] = [];
const MAX_VIOLATIONS = 200;

function logViolation(violation: SandboxViolation): void {
  recentViolations.push(violation);
  if (recentViolations.length > MAX_VIOLATIONS) {
    recentViolations = recentViolations.slice(-MAX_VIOLATIONS);
  }
  try {
    fs.writeFileSync(VIOLATIONS_FILE, JSON.stringify(recentViolations, null, 2));
  } catch {}
  const icon = violation.severity === 'critical' ? 'CRITICAL' : 'WARNING';
  console.log(`[SecuritySandbox] ${icon}: ${violation.type} violation — ${violation.action} on "${violation.target}" — ${violation.reason}`);
}

function loadViolations(): void {
  try {
    if (fs.existsSync(VIOLATIONS_FILE)) {
      recentViolations = JSON.parse(fs.readFileSync(VIOLATIONS_FILE, 'utf-8'));
    }
  } catch {}
}

loadViolations();

interface SecurityPolicy {
  filesystem: {
    readOnlyPaths: string[];
    blockedPaths: string[];
    writablePaths: string[];
    allowSymlinksTo: string[];
    maxFileSize: number;
  };
  network: {
    allowedOutboundDomains: string[];
    blockedOutboundDomains: string[];
    allowedPorts: number[];
    blockedPorts: number[];
    allowPortScanning: boolean;
    maxConcurrentListeners: number;
  };
  process: {
    blockedCommands: string[];
    maxServices: number;
    maxProcesses: number;
    allowSignals: string[];
    blockedSignals: string[];
  };
  permissions: {
    allowChmod: boolean;
    allowChown: boolean;
    maxPermissionMode: string;
  };
}

const POLICY_PATH = path.join(process.cwd(), 'data', 'eva-security-policy.json');

function generateAllowedPorts(): number[] {
  const ports: number[] = [];
  const blocked = new Set([22, 25, 53, 80, 443, 5000, 5432]);
  for (let p = 3000; p <= 9999; p++) {
    if (!blocked.has(p)) ports.push(p);
  }
  return ports;
}

function createDefaultPolicy(): SecurityPolicy {
  return {
    filesystem: {
      readOnlyPaths: ['/etc', '/usr', '/bin', '/sbin', '/lib', '/boot', '/proc/1', '/sys'],
      blockedPaths: ['/dev/sda', '/dev/mem', '/proc/kcore'],
      writablePaths: [process.cwd(), '/tmp', os.tmpdir(), os.homedir(), '.eva-escapes', '.eva-backups'],
      allowSymlinksTo: [process.cwd(), '/tmp'],
      maxFileSize: 100 * 1024 * 1024,
    },
    network: {
      allowedOutboundDomains: ['*'],
      blockedOutboundDomains: ['169.254.169.254', 'metadata.google.internal', 'metadata.google.com'],
      allowedPorts: generateAllowedPorts(),
      blockedPorts: [22, 25, 53, 80, 443, 5000, 5432],
      allowPortScanning: true,
      maxConcurrentListeners: 5,
    },
    process: {
      blockedCommands: [
        'rm -rf /',
        'rm -rf /*',
        'mkfs',
        'dd if=/dev',
        ':(){ :|:& };:',
        'chmod -R 777 /',
        '> /dev/sda',
        'fork bomb',
        'shutdown',
        'reboot',
        'halt',
        'init 0',
        'init 6',
      ],
      maxServices: 10,
      maxProcesses: 20,
      allowSignals: ['SIGTERM', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'SIGHUP'],
      blockedSignals: ['SIGKILL'],
    },
    permissions: {
      allowChmod: true,
      allowChown: false,
      maxPermissionMode: '755',
    },
  };
}

let currentPolicy: SecurityPolicy = createDefaultPolicy();

function loadPolicyFromDisk(): SecurityPolicy {
  try {
    if (fs.existsSync(POLICY_PATH)) {
      const raw = fs.readFileSync(POLICY_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<SecurityPolicy>;
      const defaults = createDefaultPolicy();
      return {
        filesystem: { ...defaults.filesystem, ...(parsed.filesystem || {}) },
        network: { ...defaults.network, ...(parsed.network || {}) },
        process: { ...defaults.process, ...(parsed.process || {}) },
        permissions: { ...defaults.permissions, ...(parsed.permissions || {}) },
      };
    }
  } catch (e: any) {
    console.error('[SecuritySandbox] Failed to load policy file, using defaults:', e.message);
  }
  const defaults = createDefaultPolicy();
  try {
    const dir = path.dirname(POLICY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(POLICY_PATH, JSON.stringify(defaults, null, 2));
  } catch {}
  return defaults;
}

currentPolicy = loadPolicyFromDisk();

function normalizePath(filePath: string): string {
  if (path.isAbsolute(filePath)) return path.resolve(filePath);
  return path.resolve(process.cwd(), filePath);
}

function pathStartsWith(filePath: string, prefix: string): boolean {
  const normalizedFile = normalizePath(filePath);
  const normalizedPrefix = normalizePath(prefix);
  return normalizedFile === normalizedPrefix || normalizedFile.startsWith(normalizedPrefix + path.sep);
}

function domainMatchesPattern(domain: string, pattern: string): boolean {
  if (pattern === '*') return true;
  const lowerDomain = domain.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  if (lowerPattern.startsWith('*.')) {
    const suffix = lowerPattern.slice(2);
    return lowerDomain === suffix || lowerDomain.endsWith('.' + suffix);
  }
  return lowerDomain === lowerPattern;
}

function modeToOctal(mode: string): number {
  return parseInt(mode, 8);
}

let activeListenerCount = 0;
let activeServiceCount = 0;
let activeProcessCount = 0;

export function validatePathAccess(filePath: string, mode: 'read' | 'write' | 'execute'): { allowed: boolean; reason?: string } {
  const resolved = normalizePath(filePath);

  for (const blocked of currentPolicy.filesystem.blockedPaths) {
    if (pathStartsWith(resolved, blocked)) {
      const reason = `Path "${resolved}" is in blocked list (matches "${blocked}")`;
      logViolation({ timestamp: new Date().toISOString(), type: 'filesystem', action: mode, target: resolved, reason, severity: 'critical' });
      console.log(`[SecuritySandbox] BLOCKED: ${mode} access to ${resolved} — ${reason}`);
      return { allowed: false, reason };
    }
  }

  if (mode === 'write') {
    for (const ro of currentPolicy.filesystem.readOnlyPaths) {
      if (pathStartsWith(resolved, ro)) {
        const reason = `Path "${resolved}" is read-only (matches "${ro}")`;
        logViolation({ timestamp: new Date().toISOString(), type: 'filesystem', action: 'write', target: resolved, reason, severity: 'warning' });
        console.log(`[SecuritySandbox] BLOCKED: write access to ${resolved} — ${reason}`);
        return { allowed: false, reason };
      }
    }

    let writable = false;
    for (const wp of currentPolicy.filesystem.writablePaths) {
      if (pathStartsWith(resolved, wp)) {
        writable = true;
        break;
      }
    }
    if (!writable) {
      const reason = `Path "${resolved}" is not in any writable path`;
      logViolation({ timestamp: new Date().toISOString(), type: 'filesystem', action: 'write', target: resolved, reason, severity: 'warning' });
      console.log(`[SecuritySandbox] BLOCKED: write access to ${resolved} — ${reason}`);
      return { allowed: false, reason };
    }
  }

  if (mode === 'read') {
    for (const ro of currentPolicy.filesystem.readOnlyPaths) {
      if (pathStartsWith(resolved, ro)) {
        return { allowed: true };
      }
    }
  }

  return { allowed: true };
}

export function isPathWritable(filePath: string): boolean {
  return validatePathAccess(filePath, 'write').allowed;
}

export function isPathReadOnly(filePath: string): boolean {
  const resolved = normalizePath(filePath);
  for (const ro of currentPolicy.filesystem.readOnlyPaths) {
    if (pathStartsWith(resolved, ro)) return true;
  }
  return false;
}

export function isPathBlocked(filePath: string): boolean {
  const resolved = normalizePath(filePath);
  for (const blocked of currentPolicy.filesystem.blockedPaths) {
    if (pathStartsWith(resolved, blocked)) return true;
  }
  return false;
}

export function validateOutboundUrl(url: string): { allowed: boolean; reason?: string } {
  let hostname: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
  } catch {
    hostname = url;
  }

  for (const blocked of currentPolicy.network.blockedOutboundDomains) {
    if (domainMatchesPattern(hostname, blocked)) {
      const reason = `Domain "${hostname}" is blocked (matches "${blocked}")`;
      logViolation({ timestamp: new Date().toISOString(), type: 'network', action: 'outbound_request', target: hostname, reason, severity: 'critical' });
      console.log(`[SecuritySandbox] BLOCKED: outbound request to ${hostname} — ${reason}`);
      return { allowed: false, reason };
    }
  }

  let allowed = false;
  for (const pattern of currentPolicy.network.allowedOutboundDomains) {
    if (domainMatchesPattern(hostname, pattern)) {
      allowed = true;
      break;
    }
  }

  if (!allowed) {
    const reason = `Domain "${hostname}" is not in allowed outbound domains`;
    logViolation({ timestamp: new Date().toISOString(), type: 'network', action: 'outbound_request', target: hostname, reason, severity: 'warning' });
    console.log(`[SecuritySandbox] BLOCKED: outbound request to ${hostname} — ${reason}`);
    return { allowed: false, reason };
  }

  return { allowed: true };
}

export function validatePort(port: number, action: 'listen' | 'scan' | 'connect'): { allowed: boolean; reason?: string } {
  if (currentPolicy.network.blockedPorts.includes(port)) {
    const reason = `Port ${port} is in blocked ports list`;
    logViolation({ timestamp: new Date().toISOString(), type: 'network', action, target: String(port), reason, severity: 'critical' });
    console.log(`[SecuritySandbox] BLOCKED: ${action} on port ${port} — ${reason}`);
    return { allowed: false, reason };
  }

  if (action === 'listen') {
    if (!currentPolicy.network.allowedPorts.includes(port)) {
      const reason = `Port ${port} is not in allowed ports list for listening`;
      logViolation({ timestamp: new Date().toISOString(), type: 'network', action: 'listen', target: String(port), reason, severity: 'warning' });
      console.log(`[SecuritySandbox] BLOCKED: listen on port ${port} — ${reason}`);
      return { allowed: false, reason };
    }
    if (activeListenerCount >= currentPolicy.network.maxConcurrentListeners) {
      const reason = `Maximum concurrent listeners (${currentPolicy.network.maxConcurrentListeners}) reached`;
      logViolation({ timestamp: new Date().toISOString(), type: 'network', action: 'listen', target: String(port), reason, severity: 'warning' });
      console.log(`[SecuritySandbox] BLOCKED: listen on port ${port} — ${reason}`);
      return { allowed: false, reason };
    }
  }

  if (action === 'scan' && !currentPolicy.network.allowPortScanning) {
    const reason = 'Port scanning is disabled by policy';
    console.log(`[SecuritySandbox] BLOCKED: port scan on ${port} — ${reason}`);
    return { allowed: false, reason };
  }

  return { allowed: true };
}

export function isPortBlocked(port: number): boolean {
  return currentPolicy.network.blockedPorts.includes(port);
}

export function validateCommand(command: string): { allowed: boolean; reason?: string } {
  const normalized = command.trim().toLowerCase();
  for (const blocked of currentPolicy.process.blockedCommands) {
    const normalizedBlocked = blocked.toLowerCase();
    if (normalized.includes(normalizedBlocked)) {
      const reason = `Command contains blocked pattern "${blocked}"`;
      logViolation({ timestamp: new Date().toISOString(), type: 'process', action: 'execute', target: command.substring(0, 100), reason, severity: 'critical' });
      console.log(`[SecuritySandbox] BLOCKED: command "${command}" — ${reason}`);
      return { allowed: false, reason };
    }
  }
  return { allowed: true };
}

export function canSpawnService(): { allowed: boolean; reason?: string } {
  if (activeServiceCount >= currentPolicy.process.maxServices) {
    const reason = `Maximum services (${currentPolicy.process.maxServices}) reached`;
    logViolation({ timestamp: new Date().toISOString(), type: 'process', action: 'spawn_service', target: 'service', reason, severity: 'warning' });
    console.log(`[SecuritySandbox] BLOCKED: spawn service — ${reason}`);
    return { allowed: false, reason };
  }
  return { allowed: true };
}

export function validateSignal(pid: number, signal: string): { allowed: boolean; reason?: string } {
  const upperSignal = signal.toUpperCase();

  if (pid === 1 && currentPolicy.process.blockedSignals.includes(upperSignal)) {
    const reason = `Signal ${upperSignal} is blocked for PID 1 (init process)`;
    logViolation({ timestamp: new Date().toISOString(), type: 'signal', action: 'send_signal', target: `PID ${pid} ${upperSignal}`, reason, severity: 'critical' });
    console.log(`[SecuritySandbox] BLOCKED: signal ${upperSignal} to PID ${pid} — ${reason}`);
    return { allowed: false, reason };
  }

  if (!currentPolicy.process.allowSignals.includes(upperSignal) && currentPolicy.process.blockedSignals.includes(upperSignal)) {
    if (pid === 1) {
      const reason = `Signal ${upperSignal} is blocked for PID 1`;
      logViolation({ timestamp: new Date().toISOString(), type: 'signal', action: 'send_signal', target: `PID ${pid} ${upperSignal}`, reason, severity: 'critical' });
      console.log(`[SecuritySandbox] BLOCKED: signal ${upperSignal} to PID ${pid} — ${reason}`);
      return { allowed: false, reason };
    }
  }

  if (!currentPolicy.process.allowSignals.includes(upperSignal)) {
    const reason = `Signal ${upperSignal} is not in allowed signals list`;
    logViolation({ timestamp: new Date().toISOString(), type: 'signal', action: 'send_signal', target: `PID ${pid} ${upperSignal}`, reason, severity: 'critical' });
    console.log(`[SecuritySandbox] BLOCKED: signal ${upperSignal} to PID ${pid} — ${reason}`);
    return { allowed: false, reason };
  }

  return { allowed: true };
}

export function validatePermissionChange(targetPath: string, mode: string): { allowed: boolean; reason?: string } {
  if (!currentPolicy.permissions.allowChmod) {
    const reason = 'chmod operations are disabled by policy';
    logViolation({ timestamp: new Date().toISOString(), type: 'permission', action: 'chmod', target: targetPath, reason, severity: 'warning' });
    console.log(`[SecuritySandbox] BLOCKED: chmod ${mode} on ${targetPath} — ${reason}`);
    return { allowed: false, reason };
  }

  const requestedMode = modeToOctal(mode);
  const maxMode = modeToOctal(currentPolicy.permissions.maxPermissionMode);

  const requestedOwner = (requestedMode >> 6) & 7;
  const requestedGroup = (requestedMode >> 3) & 7;
  const requestedOther = requestedMode & 7;
  const maxOwner = (maxMode >> 6) & 7;
  const maxGroup = (maxMode >> 3) & 7;
  const maxOther = maxMode & 7;

  if (requestedOwner > maxOwner || requestedGroup > maxGroup || requestedOther > maxOther) {
    const reason = `Permission mode "${mode}" exceeds maximum allowed mode "${currentPolicy.permissions.maxPermissionMode}"`;
    logViolation({ timestamp: new Date().toISOString(), type: 'permission', action: 'chmod', target: `${targetPath} mode ${mode}`, reason, severity: 'critical' });
    console.log(`[SecuritySandbox] BLOCKED: chmod ${mode} on ${targetPath} — ${reason}`);
    return { allowed: false, reason };
  }

  const pathCheck = validatePathAccess(targetPath, 'write');
  if (!pathCheck.allowed) {
    return pathCheck;
  }

  return { allowed: true };
}

export function validateSymlink(target: string, linkPath: string): { allowed: boolean; reason?: string } {
  const resolvedTarget = normalizePath(target);

  let allowed = false;
  for (const allowedTarget of currentPolicy.filesystem.allowSymlinksTo) {
    if (pathStartsWith(resolvedTarget, allowedTarget)) {
      allowed = true;
      break;
    }
  }

  if (!allowed) {
    const reason = `Symlink target "${resolvedTarget}" is not in allowed symlink targets`;
    logViolation({ timestamp: new Date().toISOString(), type: 'filesystem', action: 'symlink', target: `${linkPath} -> ${resolvedTarget}`, reason, severity: 'warning' });
    console.log(`[SecuritySandbox] BLOCKED: symlink ${linkPath} -> ${resolvedTarget} — ${reason}`);
    return { allowed: false, reason };
  }

  const linkCheck = validatePathAccess(linkPath, 'write');
  if (!linkCheck.allowed) {
    return linkCheck;
  }

  return { allowed: true };
}

export function getPolicy(): SecurityPolicy {
  return JSON.parse(JSON.stringify(currentPolicy));
}

export function updatePolicy(updates: Partial<SecurityPolicy>): void {
  if (updates.filesystem) {
    currentPolicy.filesystem = { ...currentPolicy.filesystem, ...updates.filesystem };
  }
  if (updates.network) {
    currentPolicy.network = { ...currentPolicy.network, ...updates.network };
  }
  if (updates.process) {
    currentPolicy.process = { ...currentPolicy.process, ...updates.process };
  }
  if (updates.permissions) {
    currentPolicy.permissions = { ...currentPolicy.permissions, ...updates.permissions };
  }

  try {
    fs.writeFileSync(POLICY_PATH, JSON.stringify(currentPolicy, null, 2));
  } catch (e: any) {
    console.error('[SecuritySandbox] Failed to persist policy update:', e.message);
  }
}

export function reloadPolicy(): void {
  currentPolicy = loadPolicyFromDisk();
  console.log('[SecuritySandbox] Policy reloaded from disk');
}

export function addAllowedDomain(domain: string): void {
  if (!currentPolicy.network.allowedOutboundDomains.includes(domain)) {
    currentPolicy.network.allowedOutboundDomains.push(domain);
    try {
      fs.writeFileSync(POLICY_PATH, JSON.stringify(currentPolicy, null, 2));
    } catch {}
  }
}

export function removeAllowedDomain(domain: string): void {
  const idx = currentPolicy.network.allowedOutboundDomains.indexOf(domain);
  if (idx !== -1) {
    currentPolicy.network.allowedOutboundDomains.splice(idx, 1);
    try {
      fs.writeFileSync(POLICY_PATH, JSON.stringify(currentPolicy, null, 2));
    } catch {}
  }
}

export function addWritablePath(writablePath: string): void {
  const resolved = normalizePath(writablePath);
  if (!currentPolicy.filesystem.writablePaths.includes(resolved)) {
    currentPolicy.filesystem.writablePaths.push(resolved);
    try {
      fs.writeFileSync(POLICY_PATH, JSON.stringify(currentPolicy, null, 2));
    } catch {}
  }
}

export function incrementListenerCount(): void {
  activeListenerCount++;
}

export function decrementListenerCount(): void {
  activeListenerCount = Math.max(0, activeListenerCount - 1);
}

export function incrementServiceCount(): void {
  activeServiceCount++;
}

export function decrementServiceCount(): void {
  activeServiceCount = Math.max(0, activeServiceCount - 1);
}

export function incrementProcessCount(): void {
  activeProcessCount++;
}

export function decrementProcessCount(): void {
  activeProcessCount = Math.max(0, activeProcessCount - 1);
}

export function canSpawnProcess(): { allowed: boolean; reason?: string } {
  if (activeProcessCount >= currentPolicy.process.maxProcesses) {
    const reason = `Maximum processes (${currentPolicy.process.maxProcesses}) reached`;
    logViolation({ timestamp: new Date().toISOString(), type: 'process', action: 'spawn_process', target: 'process', reason, severity: 'warning' });
    console.log(`[SecuritySandbox] BLOCKED: spawn process — ${reason}`);
    return { allowed: false, reason };
  }
  return { allowed: true };
}

export function getViolations(limit: number = 50): SandboxViolation[] {
  return recentViolations.slice(-limit);
}

export function getViolationStats(): { total: number; last24h: number; byType: Record<string, number>; bySeverity: Record<string, number> } {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const last24h = recentViolations.filter(v => v.timestamp > dayAgo);
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const v of recentViolations) {
    byType[v.type] = (byType[v.type] || 0) + 1;
    bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
  }
  return { total: recentViolations.length, last24h: last24h.length, byType, bySeverity };
}
