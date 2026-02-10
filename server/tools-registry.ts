// Registry of available tools for Eva to use autonomously
import { redditLoginAndPost } from './reddit-login-tool';

export const toolsRegistry = {
  create_account: {
    name: 'create_account',
    description: 'Create a new account on a website using browser automation.',
    // Existing implementation reference (not shown for brevity)
  },
  web_crawl: {
    name: 'web_crawl',
    description: 'Search and learn from the web autonomously.',
    // Existing implementation reference
  },
  // Other existing tools...
  redditLoginAndPost: {
    name: 'redditLoginAndPost',
    description: 'Log into an existing Reddit account and post content to a specified subreddit.',
    execute: redditLoginAndPost,
  },
};

// Export a function to get the list of available tools
export function getAvailableTools() {
  return Object.values(toolsRegistry);
}