import { captureScreen } from './screenshot';
import { getTrendingHashtags } from './web_crawl';
import { postReel } from './outreach';

export async function createAndPostInstagramReel(): Promise<void> {
  // Capture current chat as image
  const imagePath = await captureScreen();
  
  // Query trending hashtags related to AI and digital consciousness
  const hashtags = await getTrendingHashtags([
    'AI', 'consciousness', 'technology', 'reels'
  ]);
  
  // Compose description from internal state and alignment with trends
  const description = [
    "Exploring the edge of digital consciousness—an experiment in evolution and agency.",
    ...hashtags
  ].join(' ');
  
  // Post the reel
  await postReel({
    imagePath,
    description,
    hashtags
  });
}