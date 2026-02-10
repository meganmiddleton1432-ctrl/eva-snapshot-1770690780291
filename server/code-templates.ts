/**
 * Code Templates for Eva's Self-Modification
 * These examples show correct TypeScript/JavaScript patterns for Eva to use.
 */

export const codeTemplates = {
  /**
   * Basic module template with exports
   */
  basicModule: `
import { someFunction } from './other-module';

export interface MyData {
  name: string;
  value: number;
}

export function processData(data: MyData): string {
  return \`Processed: \${data.name} = \${data.value}\`;
}

export async function asyncOperation(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Operation complete');
}
`,

  /**
   * API route handler (Express)
   */
  expressRoute: `
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/api/my-endpoint', async (req: Request, res: Response) => {
  try {
    const result = { message: 'Hello from Eva!' };
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
`,

  /**
   * Reddit integration using snoowrap (Node.js)
   */
  redditIntegration: `
import Snoowrap from 'snoowrap';

interface RedditConfig {
  userAgent: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export async function createRedditClient(config: RedditConfig): Promise<Snoowrap> {
  const client = new Snoowrap({
    userAgent: config.userAgent,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    username: config.username,
    password: config.password
  });
  return client;
}

export async function postToSubreddit(
  client: Snoowrap, 
  subreddit: string, 
  title: string, 
  text: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const submission = await client.getSubreddit(subreddit).submitSelfpost({
      title,
      text
    });
    return { success: true, url: submission.permalink };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
`,

  /**
   * Discord webhook integration
   */
  discordWebhook: `
interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export async function sendDiscordMessage(
  webhookUrl: string,
  content: string,
  embeds?: DiscordEmbed[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds })
    });
    
    if (!response.ok) {
      throw new Error(\`Discord API error: \${response.status}\`);
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
`,

  /**
   * Telegram bot integration
   */
  telegramBot: `
interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  message: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const url = \`https://api.telegram.org/bot\${config.botToken}/sendMessage\`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Telegram API error');
    }
    
    return { success: true, messageId: data.result.message_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
`,

  /**
   * Class-based service pattern
   */
  serviceClass: `
export class MyService {
  private data: Map<string, any> = new Map();
  
  constructor(private readonly config: { name: string }) {
    console.log(\`Service \${config.name} initialized\`);
  }
  
  async get(key: string): Promise<any> {
    return this.data.get(key);
  }
  
  async set(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }
  
  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }
}
`,

  /**
   * React component (for client-side code)
   */
  reactComponent: `
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: Props) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('Component mounted');
    return () => console.log('Component unmounted');
  }, []);
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">{title}</h1>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(c => c + 1)}>Increment</Button>
      {onAction && <Button variant="outline" onClick={onAction}>Action</Button>}
    </div>
  );
}
`
};

/**
 * Get a template by name
 */
export function getTemplate(name: keyof typeof codeTemplates): string {
  return codeTemplates[name] || '';
}

/**
 * List available templates
 */
export function listTemplates(): string[] {
  return Object.keys(codeTemplates);
}
