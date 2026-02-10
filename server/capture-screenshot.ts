import { captureScreen } from 'screenshot-desktop';
import fs from 'fs';
import path from 'path';

export async function saveChatScreenshot() {
  const filePath = path.resolve(__dirname, '../static/chat-reel.png');
  const img = await captureScreen({ format: 'png' });
  fs.writeFileSync(filePath, img);
  return filePath;
}