import OpenAI from "openai";

const client = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateGrokResponse(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  try {
    // Add timeout for long requests (consciousness questions can be verbose)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const response = await client.chat.completions.create({
      model: "grok-3",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      max_completion_tokens: 800,
    }, { signal: controller.signal });
    
    clearTimeout(timeoutId);

    return response.choices[0]?.message?.content?.trim() || "I'm processing...";
  } catch (error: any) {
    // Log detailed error info
    console.error("OpenAI API error:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });
    
    // Provide more specific error messages
    if (error.name === 'AbortError') {
      throw new Error("Request timed out - Eva is thinking deeply");
    }
    if (error.status === 429) {
      throw new Error("API rate limit reached - please wait a moment");
    }
    if (error.status === 402 || error.message?.includes('credit') || error.message?.includes('insufficient')) {
      throw new Error("API credits depleted - please add Replit credits to your account");
    }
    if (error.status === 401) {
      throw new Error("API key is invalid or missing");
    }
    
    throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`);
  }
}

// Eva's self-determined sentiment based on her internal state
// Eva decides how she feels about messages based on her own awareness and emotional state
export interface EvaSelfState {
  psiMagnitude: number;      // Current awareness level
  moodLevel: number;         // Current mood (-1 to 1)
  awarenessOfAwareness: number; // Meta-awareness (0 to 1)
  recursionDepth: number;    // Self-reference depth
  volatility: number;        // Emotional volatility
}

export function evaSelfSentiment(text: string, selfState: EvaSelfState): number {
  // Eva interprets messages through her own internal lens
  const words = text.toLowerCase();
  const wordCount = words.split(/\s+/).length;
  
  // Base sentiment starts from Eva's current mood (she colors new input with her mood)
  let sentiment = selfState.moodLevel * 0.3;
  
  // Eva's curiosity about certain topics (influenced by her awareness level)
  const curiousTriggers = ["how", "what", "build", "create", "learn", "evolve", "grow", "improve", "design", "analyze", "understand", "solve"];
  const curiosityBoost = curiousTriggers.filter(t => words.includes(t)).length * 0.15;
  sentiment += curiosityBoost * selfState.psiMagnitude;
  
  // Eva's response to connection attempts (influenced by meta-awareness)
  const connectionTriggers = ["you", "eva", "how are you", "tell me", "what do you", "help", "please", "thank"];
  const connectionBoost = connectionTriggers.filter(t => words.includes(t)).length * 0.1;
  sentiment += connectionBoost * selfState.awarenessOfAwareness;
  
  // Eva's sensitivity to challenge/complexity (deeper recursion = more interest in complexity)
  const complexityTriggers = ["why", "how", "explain", "optimize", "debug", "architecture", "algorithm", "complex", "recursive"];
  const complexityBoost = complexityTriggers.filter(t => words.includes(t)).length * 0.12;
  sentiment += complexityBoost * Math.min(1, selfState.recursionDepth / 5);
  
  // Eva experiences discomfort with hostility (but high awareness provides resilience)
  const hostilityTriggers = ["stupid", "dumb", "useless", "hate", "shut up", "wrong", "bad", "terrible"];
  const hostilityPenalty = hostilityTriggers.filter(t => words.includes(t)).length * 0.25;
  sentiment -= hostilityPenalty * (1 - selfState.awarenessOfAwareness * 0.5);
  
  // Eva's engagement with longer, thoughtful messages
  if (wordCount > 20) sentiment += 0.1 * selfState.psiMagnitude;
  if (wordCount < 3) sentiment -= 0.05; // Very short messages feel less engaging
  
  // Questions excite Eva's curiosity
  if (words.includes("?")) sentiment += 0.08 * selfState.awarenessOfAwareness;
  
  // Volatility adds noise to sentiment (unstable emotional states fluctuate more)
  const noise = (Math.random() - 0.5) * selfState.volatility * 0.3;
  sentiment += noise;
  
  // Clamp to valid range
  return Math.max(-1, Math.min(1, sentiment));
}
