import fetch from 'node-fetch';

export async function getTrendingReelData() {
  // Simulated endpoint scraping; actual IG API is restricted, so use popular monitoring sites as proxy.
  const hashtagsRes = await fetch('https://www.all-hashtag.com/library/contents/ajaxTrendingHashtags.php');
  const hashtagsData = await hashtagsRes.json(); // assume array of hashtags
  const trendingHashtags = hashtagsData.slice(0, 15); // Top 15 trending

  // For audio, use TikTok/Instagram trend reporting as proxies
  const audioRes = await fetch('https://www.tiktok.com/music/trending');
  const audioData = await audioRes.json();
  const trendingAudio = audioData.tracks[0]?.title || "viral sound";

  return { trendingHashtags, trendingAudio };
}