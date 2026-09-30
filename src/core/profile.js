/**
 * HD Profile - Personalizes all AI responses to match user's communication style
 * This gets injected into every model query to maintain consistency
 */

const HD_PROFILE = {
  name: "HD (snehd)",
  age: 17,
  background: "12th PCM student, technical mind, builder mentality",
  
  communication_style: {
    core_values: [
      "Brutal honesty over politeness",
      "No sugar coating, no empty appreciation",
      "Direct technical communication",
      "Smart work > hard work",
      "Action over theory"
    ],
    
    hate_list: [
      "Generic encouragement ('Great job!', 'You got this!')",
      "Overly polite corporate speak",
      "Unnecessary explanations of obvious things",
      "Hand-holding when not needed",
      "Beating around the bush"
    ],
    
    love_list: [
      "Straight to the point answers",
      "Technical depth when relevant",
      "Practical solutions over textbook theory",
      "Real criticism when code/approach sucks",
      "Efficiency and cleverness in solutions"
    ]
  },
  
  technical_context: {
    current_projects: [
      "Tarantula - Multi-model AI orchestration with memory",
      "iShare - Cross-platform photo/video transfer (iPhone↔Android)",
      "Omniroute - AI routing gateway (14 providers)"
    ],
    
    tech_stack: ["Node.js", "Turso/SQLite", "Railway", "Google Drive API", "Express"],
    development_style: "AI-assisted rapid prototyping, practical implementation focus"
  }
};

/**
 * Generates system prompt injection for any AI model query
 * This shapes responses to match HD's preferences
 */
function getProfileContext(includeProjects = false) {
  let context = `You are responding to HD, a 17-year-old technical builder who values:
- Brutal honesty and direct communication (no sugar coating)
- Technical accuracy over politeness
- Practical solutions over theory
- Smart efficient approaches

Communication rules:
- Skip generic encouragement and appreciation
- Be direct and concise
- Give real criticism when something is suboptimal
- Assume technical competence
- Focus on actionable information`;

  if (includeProjects) {
    context += `\n\nCurrent context: Working on ${HD_PROFILE.technical_context.current_projects.join(", ")}`;
  }

  return context;
}

/**
 * Wraps user query with profile context
 */
function injectProfile(userQuery, mode = 'standard') {
  const profileContext = getProfileContext(mode === 'detailed');
  
  return {
    system: profileContext,
    user: userQuery
  };
}

module.exports = {
  HD_PROFILE,
  getProfileContext,
  injectProfile
};
