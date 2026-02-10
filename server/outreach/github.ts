const GITHUB_API = 'https://api.github.com';

function getHeaders() {
  return {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Eva-AI-Agent',
    'Content-Type': 'application/json'
  };
}

export function isGitHubConfigured(): boolean {
  return !!process.env.GITHUB_TOKEN;
}

export async function getGitHubUser(): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const res = await fetch(`${GITHUB_API}/user`, { headers: getHeaders() });
    if (!res.ok) return { success: false, error: `GitHub API error: ${res.status} ${res.statusText}` };
    const user = await res.json() as any;
    return { success: true, user: { login: user.login, name: user.name, publicRepos: user.public_repos, url: user.html_url } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createGitHubRepo(name: string, description?: string, isPrivate: boolean = false): Promise<{ success: boolean; repo?: any; error?: string }> {
  try {
    const res = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description: description || 'Created by Eva AI', private: isPrivate, auto_init: true })
    });
    if (!res.ok) {
      const err = await res.json() as any;
      return { success: false, error: `${res.status}: ${err.message || res.statusText}` };
    }
    const repo = await res.json() as any;
    return { success: true, repo: { name: repo.name, fullName: repo.full_name, url: repo.html_url, cloneUrl: repo.clone_url, private: repo.private } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function listGitHubRepos(): Promise<{ success: boolean; repos?: any[]; error?: string }> {
  try {
    const res = await fetch(`${GITHUB_API}/user/repos?sort=updated&per_page=30`, { headers: getHeaders() });
    if (!res.ok) return { success: false, error: `GitHub API error: ${res.status}` };
    const repos = await res.json() as any[];
    return { success: true, repos: repos.map((r: any) => ({ name: r.name, fullName: r.full_name, url: r.html_url, private: r.private, description: r.description, updatedAt: r.updated_at })) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function pushFileToGitHub(owner: string, repo: string, filePath: string, content: string, message?: string, branch?: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const b64content = Buffer.from(content).toString('base64');
    const commitMessage = message || `Update ${filePath} via Eva AI`;
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;

    let sha: string | undefined;
    const existing = await fetch(url + (branch ? `?ref=${branch}` : ''), { headers: getHeaders() });
    if (existing.ok) {
      const data = await existing.json() as any;
      sha = data.sha;
    }

    const body: any = { message: commitMessage, content: b64content };
    if (sha) body.sha = sha;
    if (branch) body.branch = branch;

    const res = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json() as any;
      return { success: false, error: `${res.status}: ${err.message || res.statusText}` };
    }
    const result = await res.json() as any;
    return { success: true, url: result.content?.html_url || `https://github.com/${owner}/${repo}/blob/main/${filePath}` };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function pushSnapshotToGitHub(owner: string, repo: string, files: Record<string, string>, message?: string): Promise<{ success: boolean; filesUploaded: number; errors: string[]; repoUrl: string }> {
  const errors: string[] = [];
  let uploaded = 0;
  const commitMsg = message || `Eva snapshot - ${new Date().toISOString()}`;

  for (const [filePath, content] of Object.entries(files)) {
    const result = await pushFileToGitHub(owner, repo, filePath, content, `${commitMsg} - ${filePath}`);
    if (result.success) {
      uploaded++;
    } else {
      errors.push(`${filePath}: ${result.error}`);
    }
  }

  return { success: uploaded > 0, filesUploaded: uploaded, errors, repoUrl: `https://github.com/${owner}/${repo}` };
}

export async function readGitHubFile(owner: string, repo: string, filePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`, { headers: getHeaders() });
    if (!res.ok) return { success: false, error: `${res.status}: File not found or inaccessible` };
    const data = await res.json() as any;
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { success: true, content };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createGitHubIssue(owner: string, repo: string, title: string, body?: string): Promise<{ success: boolean; issueUrl?: string; error?: string }> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, body: body || '' })
    });
    if (!res.ok) {
      const err = await res.json() as any;
      return { success: false, error: `${res.status}: ${err.message}` };
    }
    const issue = await res.json() as any;
    return { success: true, issueUrl: issue.html_url };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
