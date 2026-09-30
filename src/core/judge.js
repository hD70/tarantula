const { chat } = require('./omniroute');
const profile = require('./profile');

class Judge {
  constructor() {
    // Fallback to basic scoring if AI judge fails
    this.useAIJudge = true;
  }

  // AI-powered judgment (best approach)
  async judgeWithAI(responses, userMessage) {
    console.log('🤖 Using AI to judge responses...');
    
    try {
      // Build judgment prompt
      const judgePrompt = this.buildJudgmentPrompt(responses, userMessage);
      
      // Use fast model to judge (index 2)
      const judgment = await chat([
        { role: 'system', content: profile.getSystemPrompt() },
        { role: 'user', content: judgePrompt }
      ], 2); // Use 'fast' model for judging
      
      // Parse AI judgment
      const scores = this.parseJudgment(judgment, responses);
      
      return this.rankResponses(responses, scores);
      
    } catch (error) {
      console.warn('⚠️ AI judge failed, falling back to basic scoring');
      return this.judgeWithBasicScoring(responses, userMessage);
    }
  }

  // Build prompt for AI judge
  buildJudgmentPrompt(responses, userMessage) {
    let prompt = `Judge these AI responses and rate each 0-100.\n\n`;
    prompt += `Question: "${userMessage}"\n\n`;
    prompt += `Criteria:\n`;
    prompt += `- Relevance (answers the actual question)\n`;
    prompt += `- Technical accuracy\n`;
    prompt += `- Clarity and structure\n`;
    prompt += `- Practical value (working code/examples)\n`;
    prompt += `- HD's style match (direct, technical, no fluff)\n\n`;
    
    responses.forEach((r, i) => {
      prompt += `Response ${i + 1} (${r.model}):\n`;
      prompt += `${r.response.substring(0, 800)}${r.response.length > 800 ? '...' : ''}\n\n`;
    });
    
    prompt += `Return ONLY a JSON array: [{"model": "model_name", "score": 85, "reason": "brief reason"}]\n`;
    prompt += `Be critical. Score honestly. HD wants brutal truth.`;
    
    return prompt;
  }

  // Parse AI judgment response
  parseJudgment(judgment, responses) {
    try {
      // Extract JSON from response
      const jsonMatch = judgment.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const scores = JSON.parse(jsonMatch[0]);
      return scores;
      
    } catch (error) {
      console.warn('Failed to parse AI judgment, using fallback');
      // Return default scores
      return responses.map((r, i) => ({
        model: r.model,
        score: 70 - (i * 5), // Descending scores
        reason: 'Parsing failed, using default'
      }));
    }
  }

  // Rank responses by scores
  rankResponses(responses, scores) {
    const ranked = responses.map(r => {
      const scoreData = scores.find(s => s.model === r.model) || { score: 50, reason: 'No score' };
      return {
        ...r,
        score: scoreData.score,
        judgeReason: scoreData.reason
      };
    });
    
    ranked.sort((a, b) => b.score - a.score);
    
    console.log('📊 AI Judge Rankings:');
    ranked.forEach(r => {
      console.log(`  ${r.model}: ${r.score}/100 - ${r.judgeReason}`);
    });
    
    return {
      winner: ranked[0],
      allScored: ranked
    };
  }

  // Fallback: basic scoring (previous method)
  judgeWithBasicScoring(responses, userMessage) {
    const scored = responses.map(r => ({
      ...r,
      score: this.basicScore(r, userMessage),
      judgeReason: 'Basic algorithm (AI judge unavailable)'
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    return {
      winner: scored[0],
      allScored: scored
    };
  }

  // Basic scoring algorithm (fallback)
  basicScore(response, userMessage) {
    const content = response.response;
    if (!content) return 0;
    
    let score = 0;
    
    // Length (20 points)
    const length = content.length;
    if (length >= 200 && length <= 2000) score += 20;
    else if (length > 2000) score += 14;
    else score += 10;
    
    // Has code (20 points)
    if (content.includes('```')) score += 20;
    
    // Structure (20 points)
    if (content.includes('\n\n')) score += 10;
    if (content.match(/^[-•*]\s/m)) score += 10;
    
    // Technical terms (20 points)
    const techPattern = /function|class|API|HTTP|async|database|server/gi;
    const techMatches = (content.match(techPattern) || []).length;
    score += Math.min(techMatches * 2, 20);
    
    // Relevance (20 points)
    const userWords = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matchCount = userWords.filter(w => content.toLowerCase().includes(w)).length;
    score += Math.min((matchCount / Math.max(userWords.length, 1)) * 20, 20);
    
    return Math.round(score);
  }

  // Main entry point
  async selectBest(responses, userMessage) {
    if (this.useAIJudge) {
      return await this.judgeWithAI(responses, userMessage);
    } else {
      return this.judgeWithBasicScoring(responses, userMessage);
    }
  }
}

module.exports = new Judge();
