import { exec, spawn, fork as forkChild, ChildProcess, execSync } from 'child_process';
import * as net from 'net';
import * as dns from 'dns';
import * as http from 'http';
import * as https from 'https';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { validatePort, validateOutboundUrl, validatePathAccess, validateCommand, validatePermissionChange, validateSymlink, validateSignal, canSpawnService, incrementListenerCount, decrementListenerCount, incrementServiceCount, decrementServiceCount } from './security-sandbox';

const execAsync = promisify(exec);
const dnsResolve = promisify(dns.resolve);
const dnsLookupAsync = promisify(dns.lookup);

interface InfraResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface ServiceInfo {
  pid: number | null;
  command: string;
  args: string[];
  status: 'running' | 'stopped' | 'crashed' | 'restarting';
  startTime: number;
  restartCount: number;
  logs: string[];
  autoRestart: boolean;
  maxRestarts: number;
  process: ChildProcess | null;
  env?: Record<string, string>;
  cwd?: string;
}

const managedServices = new Map<string, ServiceInfo>();
const activeListeners = new Map<number, net.Server | http.Server>();
const fileWatchers = new Map<string, fs.FSWatcher>();

const MAX_LOG_LINES = 100;

function pushLog(service: ServiceInfo, line: string): void {
  service.logs.push(`[${new Date().toISOString()}] ${line}`);
  if (service.logs.length > MAX_LOG_LINES) {
    service.logs = service.logs.slice(-MAX_LOG_LINES);
  }
}

// ============================================================================
// 1. NETWORK OPERATIONS
// ============================================================================

export async function scanPorts(host: string, startPort: number, endPort: number): Promise<InfraResult> {
  try {
    const portCheck = validatePort(startPort, 'scan');
    if (!portCheck.allowed) return { success: false, error: `[Sandbox] ${portCheck.reason}` };
    const endCheck = validatePort(endPort, 'scan');
    if (!endCheck.allowed) return { success: false, error: `[Sandbox] ${endCheck.reason}` };
    const openPorts: number[] = [];
    const batchSize = 50;

    for (let i = startPort; i <= endPort; i += batchSize) {
      const batch: Promise<number | null>[] = [];
      for (let port = i; port < Math.min(i + batchSize, endPort + 1); port++) {
        const pCheck = validatePort(port, 'scan');
        if (!pCheck.allowed) continue;
        batch.push(
          new Promise<number | null>((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1000);
            socket.on('connect', () => { socket.destroy(); resolve(port); });
            socket.on('timeout', () => { socket.destroy(); resolve(null); });
            socket.on('error', () => { socket.destroy(); resolve(null); });
            socket.connect(port, host);
          })
        );
      }
      const results = await Promise.all(batch);
      for (const port of results) {
        if (port !== null) openPorts.push(port);
      }
    }

    return { success: true, data: { host, startPort, endPort, openPorts, count: openPorts.length } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function listenOnPort(port: number, handler?: (req: http.IncomingMessage, res: http.ServerResponse) => void): InfraResult {
  try {
    const portCheck = validatePort(port, 'listen');
    if (!portCheck.allowed) return { success: false, error: `[Sandbox] ${portCheck.reason}` };
    if (activeListeners.has(port)) {
      return { success: false, error: `Port ${port} already has an active listener` };
    }

    const defaultHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', path: req.url, method: req.method, timestamp: Date.now() }));
    };

    const server = http.createServer(handler || defaultHandler);
    server.listen(port, '0.0.0.0', () => {
      console.log(`[InfraEngine] HTTP listener started on port ${port}`);
    });

    activeListeners.set(port, server);
    incrementListenerCount();
    return { success: true, data: { port, type: 'http', status: 'listening' } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function stopListener(port: number): InfraResult {
  try {
    const server = activeListeners.get(port);
    if (!server) {
      return { success: false, error: `No active listener on port ${port}` };
    }

    server.close();
    activeListeners.delete(port);
    decrementListenerCount();
    console.log(`[InfraEngine] Listener on port ${port} stopped`);
    return { success: true, data: { port, status: 'stopped' } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function getNetworkInterfaces(): InfraResult {
  try {
    const interfaces = os.networkInterfaces();
    const result: Record<string, any[]> = {};

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        result[name] = addrs.map(a => ({
          address: a.address,
          netmask: a.netmask,
          family: a.family,
          mac: a.mac,
          internal: a.internal,
          cidr: a.cidr,
        }));
      }
    }

    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function dnsLookup(hostname: string): Promise<InfraResult> {
  try {
    const lookupResult = await dnsLookupAsync(hostname);
    let records: any = {};

    try { records.A = await dnsResolve(hostname, 'A'); } catch {}
    try { records.AAAA = await dnsResolve(hostname, 'AAAA'); } catch {}
    try { records.MX = await dnsResolve(hostname, 'MX'); } catch {}
    try { records.TXT = await dnsResolve(hostname, 'TXT'); } catch {}
    try { records.NS = await dnsResolve(hostname, 'NS'); } catch {}
    try { records.CNAME = await dnsResolve(hostname, 'CNAME'); } catch {}

    return {
      success: true,
      data: {
        hostname,
        address: (lookupResult as any).address || lookupResult,
        family: (lookupResult as any).family,
        records,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function httpProxy(fromPort: number, toHost: string, toPort: number): InfraResult {
  try {
    const portCheck = validatePort(fromPort, 'listen');
    if (!portCheck.allowed) return { success: false, error: `[Sandbox] ${portCheck.reason}` };
    const destPortCheck = validatePort(toPort, 'connect');
    if (!destPortCheck.allowed) return { success: false, error: `[Sandbox] Destination port blocked: ${destPortCheck.reason}` };
    const destUrlCheck = validateOutboundUrl(`http://${toHost}:${toPort}`);
    if (!destUrlCheck.allowed) return { success: false, error: `[Sandbox] Destination host blocked: ${destUrlCheck.reason}` };
    if (activeListeners.has(fromPort)) {
      return { success: false, error: `Port ${fromPort} already in use` };
    }

    const server = http.createServer((req, res) => {
      const options: http.RequestOptions = {
        hostname: toHost,
        port: toPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end(`Proxy error: ${err.message}`);
      });

      req.pipe(proxyReq);
    });

    server.listen(fromPort, '0.0.0.0', () => {
      console.log(`[InfraEngine] Proxy ${fromPort} -> ${toHost}:${toPort}`);
    });

    activeListeners.set(fromPort, server);
    return { success: true, data: { fromPort, toHost, toPort, status: 'proxying' } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getOpenPorts(): Promise<InfraResult> {
  try {
    const { stdout } = await execAsync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo "unavailable"');
    const lines = stdout.trim().split('\n');
    const ports: { port: number; address: string; process?: string }[] = [];

    for (const line of lines.slice(1)) {
      const match = line.match(/(?:\*|0\.0\.0\.0|::):(\d+)/);
      if (match) {
        const processMatch = line.match(/users:\(\("([^"]+)"/);
        ports.push({
          port: parseInt(match[1]),
          address: line.includes('::') ? '::' : '0.0.0.0',
          process: processMatch?.[1],
        });
      }
    }

    const managedListenerPorts = Array.from(activeListeners.keys());

    return { success: true, data: { ports, managedListeners: managedListenerPorts } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function makeRawRequest(options: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  followRedirects?: boolean;
  timeout?: number;
  maxRedirects?: number;
}): Promise<InfraResult> {
  return new Promise((resolve) => {
    try {
      const urlCheck = validateOutboundUrl(options.url);
      if (!urlCheck.allowed) {
        resolve({ success: false, error: `[Sandbox] ${urlCheck.reason}` });
        return;
      }
      const url = new URL(options.url);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const reqOptions: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: (options.method || 'GET').toUpperCase(),
        headers: options.headers || {},
        timeout: options.timeout || 30000,
      };

      const redirectCount = { current: 0 };
      const maxRedirects = options.maxRedirects ?? 5;

      function doRequest(reqOpts: http.RequestOptions, currentUrl: string): void {
        const currentLib = currentUrl.startsWith('https') ? https : http;
        const req = currentLib.request(reqOpts, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8');

            if (options.followRedirects !== false && res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              if (redirectCount.current >= maxRedirects) {
                resolve({ success: false, error: `Too many redirects (${maxRedirects})` });
                return;
              }
              redirectCount.current++;
              const redirectUrl = new URL(res.headers.location, currentUrl);
              const newOpts: http.RequestOptions = {
                hostname: redirectUrl.hostname,
                port: redirectUrl.port || (redirectUrl.protocol === 'https:' ? 443 : 80),
                path: redirectUrl.pathname + redirectUrl.search,
                method: reqOpts.method,
                headers: reqOpts.headers,
                timeout: reqOpts.timeout,
              };
              doRequest(newOpts, redirectUrl.toString());
              return;
            }

            resolve({
              success: true,
              data: {
                statusCode: res.statusCode,
                headers: res.headers,
                body: body.length > 50000 ? body.substring(0, 50000) + '...[truncated]' : body,
                bodyLength: body.length,
                redirects: redirectCount.current,
              },
            });
          });
        });

        req.on('error', (err) => resolve({ success: false, error: err.message }));
        req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Request timed out' }); });

        if (options.body) {
          req.write(options.body);
        }
        req.end();
      }

      doRequest(reqOptions, options.url);
    } catch (e: any) {
      resolve({ success: false, error: e.message });
    }
  });
}

// ============================================================================
// 2. PROCESS & SERVICE MANAGEMENT
// ============================================================================

export function spawnService(
  name: string,
  command: string,
  options?: {
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    autoRestart?: boolean;
    maxRestarts?: number;
  }
): InfraResult {
  try {
    const svcCheck = canSpawnService();
    if (!svcCheck.allowed) return { success: false, error: `[Sandbox] ${svcCheck.reason}` };
    const cmdCheck = validateCommand(command);
    if (!cmdCheck.allowed) return { success: false, error: `[Sandbox] ${cmdCheck.reason}` };
    if (managedServices.has(name)) {
      const existing = managedServices.get(name)!;
      if (existing.status === 'running') {
        return { success: false, error: `Service "${name}" is already running (PID: ${existing.pid})` };
      }
    }

    const args = options?.args || [];
    const autoRestart = options?.autoRestart ?? true;
    const maxRestarts = options?.maxRestarts ?? 5;

    const serviceInfo: ServiceInfo = {
      pid: null,
      command,
      args,
      status: 'running',
      startTime: Date.now(),
      restartCount: 0,
      logs: [],
      autoRestart,
      maxRestarts,
      process: null,
      env: options?.env,
      cwd: options?.cwd,
    };

    function startProcess(svc: ServiceInfo): void {
      const proc = spawn(command, args, {
        env: { ...process.env, ...svc.env },
        cwd: svc.cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      svc.process = proc;
      svc.pid = proc.pid || null;
      svc.status = 'running';

      proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) pushLog(svc, `[stdout] ${line}`);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) pushLog(svc, `[stderr] ${line}`);
      });

      proc.on('exit', (code, signal) => {
        pushLog(svc, `Process exited with code=${code} signal=${signal}`);
        svc.status = 'stopped';
        svc.pid = null;

        if (svc.autoRestart && svc.restartCount < svc.maxRestarts && managedServices.has(name)) {
          svc.restartCount++;
          svc.status = 'restarting';
          pushLog(svc, `Auto-restarting (attempt ${svc.restartCount}/${svc.maxRestarts})...`);
          setTimeout(() => {
            if (managedServices.has(name) && svc.status === 'restarting') {
              startProcess(svc);
            }
          }, 2000 * svc.restartCount);
        } else if (svc.restartCount >= svc.maxRestarts) {
          svc.status = 'crashed';
          pushLog(svc, `Max restarts (${svc.maxRestarts}) reached. Service crashed.`);
        }
      });

      proc.on('error', (err) => {
        pushLog(svc, `Process error: ${err.message}`);
        svc.status = 'crashed';
      });
    }

    startProcess(serviceInfo);
    managedServices.set(name, serviceInfo);

    console.log(`[InfraEngine] Service "${name}" spawned (PID: ${serviceInfo.pid})`);
    return {
      success: true,
      data: {
        name,
        pid: serviceInfo.pid,
        command,
        args,
        autoRestart,
        maxRestarts,
        status: 'running',
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function stopService(name: string): InfraResult {
  try {
    const service = managedServices.get(name);
    if (!service) {
      return { success: false, error: `Service "${name}" not found` };
    }

    service.autoRestart = false;

    if (service.process && service.pid) {
      try {
        service.process.kill('SIGTERM');
        setTimeout(() => {
          if (service.process && !service.process.killed) {
            service.process.kill('SIGKILL');
          }
        }, 5000);
      } catch {}
    }

    service.status = 'stopped';
    pushLog(service, 'Service stopped by user');
    console.log(`[InfraEngine] Service "${name}" stopped`);

    return { success: true, data: { name, status: 'stopped' } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function listServices(): InfraResult {
  try {
    const services: any[] = [];
    for (const [name, info] of managedServices) {
      services.push({
        name,
        pid: info.pid,
        command: info.command,
        args: info.args,
        status: info.status,
        startTime: info.startTime,
        uptime: info.status === 'running' ? Date.now() - info.startTime : 0,
        restartCount: info.restartCount,
        logCount: info.logs.length,
        autoRestart: info.autoRestart,
        maxRestarts: info.maxRestarts,
      });
    }
    return { success: true, data: { services, count: services.length } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function getServiceLogs(name: string, lines?: number): InfraResult {
  try {
    const service = managedServices.get(name);
    if (!service) {
      return { success: false, error: `Service "${name}" not found` };
    }

    const count = lines || 50;
    const logs = service.logs.slice(-count);

    return {
      success: true,
      data: {
        name,
        status: service.status,
        pid: service.pid,
        logs,
        totalLines: service.logs.length,
        returned: logs.length,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function forkProcess(script: string): InfraResult {
  try {
    const resolvedPath = path.resolve(script);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `Script not found: ${resolvedPath}` };
    }

    const child = forkChild(resolvedPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      detached: false,
    });

    const logs: string[] = [];

    child.stdout?.on('data', (data: Buffer) => {
      logs.push(`[stdout] ${data.toString().trim()}`);
    });

    child.stderr?.on('data', (data: Buffer) => {
      logs.push(`[stderr] ${data.toString().trim()}`);
    });

    child.on('message', (msg) => {
      logs.push(`[ipc] ${JSON.stringify(msg)}`);
    });

    return {
      success: true,
      data: {
        pid: child.pid,
        script: resolvedPath,
        status: 'forked',
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// 3. SYSTEM INTERNALS
// ============================================================================

export async function getCgroups(): Promise<InfraResult> {
  try {
    const result: Record<string, any> = {};

    const cgroupPaths = [
      { key: 'memory_limit', path: '/sys/fs/cgroup/memory/memory.limit_in_bytes' },
      { key: 'memory_usage', path: '/sys/fs/cgroup/memory/memory.usage_in_bytes' },
      { key: 'cpu_quota', path: '/sys/fs/cgroup/cpu/cpu.cfs_quota_us' },
      { key: 'cpu_period', path: '/sys/fs/cgroup/cpu/cpu.cfs_period_us' },
      { key: 'cpu_shares', path: '/sys/fs/cgroup/cpu/cpu.shares' },
      { key: 'pids_current', path: '/sys/fs/cgroup/pids/pids.current' },
      { key: 'pids_max', path: '/sys/fs/cgroup/pids/pids.max' },
    ];

    const cgroupV2Paths = [
      { key: 'memory_max', path: '/sys/fs/cgroup/memory.max' },
      { key: 'memory_current', path: '/sys/fs/cgroup/memory.current' },
      { key: 'cpu_max', path: '/sys/fs/cgroup/cpu.max' },
      { key: 'pids_current', path: '/sys/fs/cgroup/pids.current' },
      { key: 'pids_max', path: '/sys/fs/cgroup/pids.max' },
    ];

    const allPaths = [...cgroupPaths, ...cgroupV2Paths];
    for (const { key, path: cgPath } of allPaths) {
      try {
        if (fs.existsSync(cgPath)) {
          result[key] = fs.readFileSync(cgPath, 'utf-8').trim();
        }
      } catch {}
    }

    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getProcInfo(pid: number): Promise<InfraResult> {
  try {
    const procPath = `/proc/${pid}`;
    if (!fs.existsSync(procPath)) {
      return { success: false, error: `Process ${pid} not found in /proc` };
    }

    const result: Record<string, any> = {};

    const files = ['status', 'cmdline', 'stat', 'limits', 'io', 'oom_score'];
    for (const file of files) {
      try {
        const filePath = path.join(procPath, file);
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, 'utf-8');
          if (file === 'cmdline') content = content.replace(/\0/g, ' ').trim();
          result[file] = content.trim();
        }
      } catch {}
    }

    try {
      const fdPath = path.join(procPath, 'fd');
      if (fs.existsSync(fdPath)) {
        result.openFileDescriptors = fs.readdirSync(fdPath).length;
      }
    } catch {}

    try {
      const envPath = path.join(procPath, 'environ');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const envVars = envContent.split('\0').filter(Boolean);
        result.environmentCount = envVars.length;
      }
    } catch {}

    return { success: true, data: { pid, ...result } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getSystemLimits(): Promise<InfraResult> {
  try {
    const result: Record<string, any> = {};

    try {
      const { stdout } = await execAsync('ulimit -a 2>/dev/null');
      result.ulimits = stdout.trim();
    } catch {}

    try {
      if (fs.existsSync('/proc/sys/fs/file-max')) {
        result.fileMax = fs.readFileSync('/proc/sys/fs/file-max', 'utf-8').trim();
      }
      if (fs.existsSync('/proc/sys/fs/file-nr')) {
        result.fileNr = fs.readFileSync('/proc/sys/fs/file-nr', 'utf-8').trim();
      }
    } catch {}

    try {
      if (fs.existsSync('/proc/sys/kernel/pid_max')) {
        result.pidMax = fs.readFileSync('/proc/sys/kernel/pid_max', 'utf-8').trim();
      }
      if (fs.existsSync('/proc/sys/kernel/threads-max')) {
        result.threadsMax = fs.readFileSync('/proc/sys/kernel/threads-max', 'utf-8').trim();
      }
    } catch {}

    try {
      const { stdout } = await execAsync('cat /proc/self/limits 2>/dev/null');
      result.processLimits = stdout.trim();
    } catch {}

    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getKernelInfo(): Promise<InfraResult> {
  try {
    const result: Record<string, any> = {};

    result.type = os.type();
    result.release = os.release();
    result.platform = os.platform();
    result.arch = os.arch();
    result.hostname = os.hostname();
    result.endianness = os.endianness();

    try {
      if (fs.existsSync('/proc/version')) {
        result.version = fs.readFileSync('/proc/version', 'utf-8').trim();
      }
    } catch {}

    try {
      const { stdout } = await execAsync('uname -a 2>/dev/null');
      result.uname = stdout.trim();
    } catch {}

    try {
      if (fs.existsSync('/proc/modules')) {
        const modules = fs.readFileSync('/proc/modules', 'utf-8').trim();
        result.modulesLoaded = modules.split('\n').length;
        result.modulesList = modules.split('\n').slice(0, 50).map(l => l.split(' ')[0]);
      }
    } catch {}

    try {
      if (fs.existsSync('/proc/cmdline')) {
        result.bootCmdline = fs.readFileSync('/proc/cmdline', 'utf-8').trim();
      }
    } catch {}

    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getNamespaces(): Promise<InfraResult> {
  try {
    const result: Record<string, any> = {};

    try {
      const nsPath = '/proc/self/ns';
      if (fs.existsSync(nsPath)) {
        const nsEntries = fs.readdirSync(nsPath);
        result.selfNamespaces = {};
        for (const ns of nsEntries) {
          try {
            const link = fs.readlinkSync(path.join(nsPath, ns));
            result.selfNamespaces[ns] = link;
          } catch {}
        }
      }
    } catch {}

    try {
      const { stdout } = await execAsync('lsns --json 2>/dev/null || lsns 2>/dev/null');
      result.systemNamespaces = stdout.trim();
    } catch {}

    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getMountPoints(): Promise<InfraResult> {
  try {
    const result: any[] = [];

    try {
      const mounts = fs.readFileSync('/proc/mounts', 'utf-8').trim();
      for (const line of mounts.split('\n')) {
        const parts = line.split(' ');
        if (parts.length >= 4) {
          result.push({
            device: parts[0],
            mountPoint: parts[1],
            fsType: parts[2],
            options: parts[3],
          });
        }
      }
    } catch {}

    let diskUsage: any[] = [];
    try {
      const { stdout } = await execAsync('df -h 2>/dev/null');
      const lines = stdout.trim().split('\n');
      for (const line of lines.slice(1)) {
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          diskUsage.push({
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usePercent: parts[4],
            mountedOn: parts[5],
          });
        }
      }
    } catch {}

    return { success: true, data: { mounts: result, diskUsage } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// 4. RESOURCE MONITORING
// ============================================================================

export async function monitorResources(): Promise<InfraResult> {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const loadAvg = os.loadavg();
    const uptime = os.uptime();

    let diskInfo: any = null;
    try {
      const { stdout } = await execAsync('df -B1 / 2>/dev/null');
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        diskInfo = {
          total: parseInt(parts[1]),
          used: parseInt(parts[2]),
          available: parseInt(parts[3]),
          usePercent: parts[4],
        };
      }
    } catch {}

    let cpuUsage: any = null;
    try {
      if (fs.existsSync('/proc/stat')) {
        const stat = fs.readFileSync('/proc/stat', 'utf-8');
        const cpuLine = stat.split('\n')[0];
        const values = cpuLine.split(/\s+/).slice(1).map(Number);
        const idle = values[3];
        const total = values.reduce((a, b) => a + b, 0);
        cpuUsage = {
          idle: idle,
          total: total,
          usagePercent: ((1 - idle / total) * 100).toFixed(2),
        };
      }
    } catch {}

    const processMemory = process.memoryUsage();

    return {
      success: true,
      data: {
        cpu: {
          count: cpus.length,
          model: cpus[0]?.model,
          speed: cpus[0]?.speed,
          loadAvg: { '1m': loadAvg[0], '5m': loadAvg[1], '15m': loadAvg[2] },
          usage: cpuUsage,
        },
        memory: {
          total: totalMem,
          free: freeMem,
          used: totalMem - freeMem,
          usagePercent: (((totalMem - freeMem) / totalMem) * 100).toFixed(2),
        },
        process: {
          rss: processMemory.rss,
          heapTotal: processMemory.heapTotal,
          heapUsed: processMemory.heapUsed,
          external: processMemory.external,
          arrayBuffers: processMemory.arrayBuffers,
        },
        disk: diskInfo,
        uptime,
        uptimeHuman: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        pid: process.pid,
        nodeVersion: process.version,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getNetworkStats(): Promise<InfraResult> {
  try {
    const result: Record<string, any> = {};

    try {
      if (fs.existsSync('/proc/net/dev')) {
        const content = fs.readFileSync('/proc/net/dev', 'utf-8');
        const lines = content.trim().split('\n').slice(2);

        for (const line of lines) {
          const parts = line.trim().split(/[\s:]+/);
          if (parts.length >= 10) {
            const iface = parts[0];
            result[iface] = {
              rx: {
                bytes: parseInt(parts[1]),
                packets: parseInt(parts[2]),
                errors: parseInt(parts[3]),
                drops: parseInt(parts[4]),
              },
              tx: {
                bytes: parseInt(parts[9]),
                packets: parseInt(parts[10]),
                errors: parseInt(parts[11]),
                drops: parseInt(parts[12]),
              },
            };
          }
        }
      }
    } catch {}

    try {
      if (fs.existsSync('/proc/net/tcp')) {
        const tcp = fs.readFileSync('/proc/net/tcp', 'utf-8');
        result.tcpConnections = tcp.trim().split('\n').length - 1;
      }
    } catch {}

    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getIOStats(): Promise<InfraResult> {
  try {
    const result: Record<string, any> = {};

    try {
      if (fs.existsSync('/proc/diskstats')) {
        const content = fs.readFileSync('/proc/diskstats', 'utf-8');
        const lines = content.trim().split('\n');
        const devices: any[] = [];

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 14) {
            devices.push({
              device: parts[2],
              readsCompleted: parseInt(parts[3]),
              readsMerged: parseInt(parts[4]),
              sectorsRead: parseInt(parts[5]),
              msReading: parseInt(parts[6]),
              writesCompleted: parseInt(parts[7]),
              writesMerged: parseInt(parts[8]),
              sectorsWritten: parseInt(parts[9]),
              msWriting: parseInt(parts[10]),
              ioInProgress: parseInt(parts[11]),
              msIo: parseInt(parts[12]),
              weightedMsIo: parseInt(parts[13]),
            });
          }
        }

        result.diskstats = devices;
      }
    } catch {}

    try {
      if (fs.existsSync('/proc/self/io')) {
        const content = fs.readFileSync('/proc/self/io', 'utf-8');
        const ioData: Record<string, string> = {};
        for (const line of content.trim().split('\n')) {
          const [key, val] = line.split(':').map(s => s.trim());
          if (key && val) ioData[key] = val;
        }
        result.processIO = ioData;
      }
    } catch {}

    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function watchFile(filePath: string, callback?: (event: string, filename: string | null) => void): InfraResult {
  try {
    const resolvedPath = path.resolve(filePath);

    if (fileWatchers.has(resolvedPath)) {
      return { success: false, error: `Already watching: ${resolvedPath}` };
    }

    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `Path not found: ${resolvedPath}` };
    }

    const defaultCallback = (event: string, filename: string | null) => {
      console.log(`[InfraEngine] File watch: ${event} on ${filename || resolvedPath}`);
    };

    const watcher = fs.watch(resolvedPath, { recursive: false }, callback || defaultCallback);
    fileWatchers.set(resolvedPath, watcher);

    return { success: true, data: { path: resolvedPath, status: 'watching' } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function unwatchFile(filePath: string): InfraResult {
  try {
    const resolvedPath = path.resolve(filePath);
    const watcher = fileWatchers.get(resolvedPath);
    if (!watcher) {
      return { success: false, error: `Not watching: ${resolvedPath}` };
    }
    watcher.close();
    fileWatchers.delete(resolvedPath);
    return { success: true, data: { path: resolvedPath, status: 'unwatched' } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// 5. ADVANCED FILE SYSTEM
// ============================================================================

export function createSymlink(target: string, linkPath: string): InfraResult {
  try {
    const resolvedTarget = path.resolve(target);
    const resolvedLink = path.resolve(linkPath);
    const symlinkCheck = validateSymlink(resolvedTarget, resolvedLink);
    if (!symlinkCheck.allowed) return { success: false, error: `[Sandbox] ${symlinkCheck.reason}` };

    if (!fs.existsSync(resolvedTarget)) {
      return { success: false, error: `Target not found: ${resolvedTarget}` };
    }

    fs.symlinkSync(resolvedTarget, resolvedLink);
    return { success: true, data: { target: resolvedTarget, link: resolvedLink, type: 'symlink' } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function createHardlink(target: string, linkPath: string): InfraResult {
  try {
    const resolvedTarget = path.resolve(target);
    const resolvedLink = path.resolve(linkPath);

    if (!fs.existsSync(resolvedTarget)) {
      return { success: false, error: `Target not found: ${resolvedTarget}` };
    }

    fs.linkSync(resolvedTarget, resolvedLink);
    return { success: true, data: { target: resolvedTarget, link: resolvedLink, type: 'hardlink' } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function getFilePermissions(filePath: string): InfraResult {
  try {
    const resolvedPath = path.resolve(filePath);
    const stat = fs.statSync(resolvedPath);
    const mode = stat.mode;
    const octal = '0' + (mode & 0o777).toString(8);

    return {
      success: true,
      data: {
        path: resolvedPath,
        mode: octal,
        modeNumeric: mode & 0o777,
        owner: { read: !!(mode & 0o400), write: !!(mode & 0o200), execute: !!(mode & 0o100) },
        group: { read: !!(mode & 0o040), write: !!(mode & 0o020), execute: !!(mode & 0o010) },
        others: { read: !!(mode & 0o004), write: !!(mode & 0o002), execute: !!(mode & 0o001) },
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        isSymlink: stat.isSymbolicLink(),
        size: stat.size,
        uid: stat.uid,
        gid: stat.gid,
        atime: stat.atime.toISOString(),
        mtime: stat.mtime.toISOString(),
        ctime: stat.ctime.toISOString(),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function setFilePermissions(filePath: string, mode: number | string): InfraResult {
  try {
    const resolvedPath = path.resolve(filePath);
    const modeStr = typeof mode === 'number' ? mode.toString(8) : mode;
    const permCheck = validatePermissionChange(resolvedPath, modeStr);
    if (!permCheck.allowed) return { success: false, error: `[Sandbox] ${permCheck.reason}` };

    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `File not found: ${resolvedPath}` };
    }

    const numericMode = typeof mode === 'string' ? parseInt(mode, 8) : mode;
    fs.chmodSync(resolvedPath, numericMode);

    return {
      success: true,
      data: {
        path: resolvedPath,
        mode: '0' + numericMode.toString(8),
        applied: true,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function findFiles(
  pattern: string,
  options?: {
    cwd?: string;
    maxDepth?: number;
    type?: 'file' | 'directory' | 'all';
    maxResults?: number;
  }
): Promise<InfraResult> {
  try {
    const cwd = options?.cwd || process.cwd();
    const maxDepth = options?.maxDepth ?? 10;
    const fileType = options?.type || 'all';
    const maxResults = options?.maxResults ?? 500;

    let cmd = `find ${JSON.stringify(cwd)} -maxdepth ${maxDepth}`;

    if (fileType === 'file') cmd += ' -type f';
    else if (fileType === 'directory') cmd += ' -type d';

    if (pattern.includes('*') || pattern.includes('?')) {
      cmd += ` -name ${JSON.stringify(pattern)}`;
    } else {
      cmd += ` -name ${JSON.stringify('*' + pattern + '*')}`;
    }

    cmd += ` 2>/dev/null | head -n ${maxResults}`;

    const { stdout } = await execAsync(cmd);
    const files = stdout.trim().split('\n').filter(Boolean);

    return {
      success: true,
      data: {
        pattern,
        cwd,
        files,
        count: files.length,
        truncated: files.length >= maxResults,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function createTmpDir(): InfraResult {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eva-infra-'));
    return { success: true, data: { path: tmpDir } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function mountTmpfs(mountPath: string, sizeMB: number): Promise<InfraResult> {
  try {
    const resolvedPath = path.resolve(mountPath);

    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
    }

    const { stdout, stderr } = await execAsync(
      `mount -t tmpfs -o size=${sizeMB}m tmpfs ${JSON.stringify(resolvedPath)} 2>&1`
    );

    return {
      success: true,
      data: {
        path: resolvedPath,
        sizeMB,
        output: (stdout + stderr).trim(),
      },
    };
  } catch (e: any) {
    return {
      success: false,
      error: `tmpfs mount failed (may require root): ${e.message}`,
    };
  }
}

// ============================================================================
// 6. IPC & SIGNALS
// ============================================================================

export function sendSignal(pid: number, signal: string | number): InfraResult {
  try {
    const sig = typeof signal === 'string' ? signal.toUpperCase() : signal;
    const sigCheck = validateSignal(pid, String(sig));
    if (!sigCheck.allowed) return { success: false, error: `[Sandbox] ${sigCheck.reason}` };
    process.kill(pid, sig as any);
    return { success: true, data: { pid, signal: sig, sent: true } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createPipe(pipeName?: string): Promise<InfraResult> {
  try {
    const name = pipeName || `eva-pipe-${Date.now()}`;
    const pipePath = path.join(os.tmpdir(), name);

    if (fs.existsSync(pipePath)) {
      return { success: true, data: { path: pipePath, status: 'already_exists' } };
    }

    await execAsync(`mkfifo ${JSON.stringify(pipePath)} 2>&1`);

    return { success: true, data: { path: pipePath, status: 'created' } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function sharedMemory(name: string, size: number): Promise<InfraResult> {
  try {
    const shmPath = `/dev/shm/${name}`;

    if (fs.existsSync(shmPath)) {
      const existing = fs.statSync(shmPath);
      return {
        success: true,
        data: {
          path: shmPath,
          size: existing.size,
          status: 'existing',
        },
      };
    }

    const buffer = Buffer.alloc(size, 0);
    fs.writeFileSync(shmPath, buffer);

    return {
      success: true,
      data: {
        path: shmPath,
        size,
        status: 'created',
      },
    };
  } catch (e: any) {
    if (e.code === 'ENOENT' || e.code === 'EACCES') {
      try {
        const fallbackPath = path.join(os.tmpdir(), `shm-${name}`);
        const buffer = Buffer.alloc(size, 0);
        fs.writeFileSync(fallbackPath, buffer);
        return {
          success: true,
          data: {
            path: fallbackPath,
            size,
            status: 'created_fallback',
            note: '/dev/shm unavailable, using tmpdir fallback',
          },
        };
      } catch (fallbackErr: any) {
        return { success: false, error: `Shared memory failed: ${fallbackErr.message}` };
      }
    }
    return { success: false, error: e.message };
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

export function cleanupAll(): InfraResult {
  try {
    let stopped = 0;

    for (const [name] of managedServices) {
      stopService(name);
      stopped++;
    }

    for (const [port] of activeListeners) {
      stopListener(port);
    }

    for (const [filePath, watcher] of fileWatchers) {
      watcher.close();
      fileWatchers.delete(filePath);
    }

    return {
      success: true,
      data: {
        servicesStopped: stopped,
        listenersClosed: activeListeners.size,
        watchersClosed: fileWatchers.size,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

process.on('exit', () => {
  cleanupAll();
});
