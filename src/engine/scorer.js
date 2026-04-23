import _ from 'lodash';

/**
 * Enterprise ATS Scoring Engine (1000 IQ Version)
 * Performs heuristic analysis on Resume vs Job Description.
 */

const STOP_WORDS = new Set(['the', 'and', 'to', 'for', 'with', 'a', 'in', 'is', 'it', 'of', 'on', 'that', 'this', 'an']);

const TECHNICAL_KEYWORDS = [
  'sql', 'python', 'r', 'tableau', 'power bi', 'excel', 'vba', 'google analytics', 
  'ab testing', 'machine learning', 'regression', 'clustering', 'aws', 'azure', 
  'snowflake', 'databricks', 'etl', 'data warehousing', 'looker', 'sas', 'spss',
  'modeling', 'forecasting', 'visualization', 'bi', 'dashboards', 'kpi'
];

const AI_MARKERS = [
  'delve', 'testament', 'tapestry', 'seamlessly', 'embark', 'comprehensive', 
  'innovative solutions', 'passionate about', 'pivotal role', 'unparalleled'
];

export const analyzeATS = (resumeText, jdText) => {
  if (!resumeText || !jdText) return null;

  const tokenize = (text) => {
    return text.toLowerCase().match(/\b(\w+)\b/g) || [];
  };

  const resumeTokens = tokenize(resumeText);
  const jdTokes = tokenize(jdText);
  const jdFreq = _.countBy(jdTokes.filter(t => !STOP_WORDS.has(t)));
  const sortedJdKeywords = Object.entries(jdFreq).sort((a, b) => b[1] - a[1]);

  // 1. Keyword Match Score (40%)
  const topKeywords = sortedJdKeywords.slice(0, 30).map(k => k[0]);
  const matchedKeywords = topKeywords.filter(k => resumeTokens.includes(k));
  const keywordScore = (matchedKeywords.length / topKeywords.length) * 100;

  // 2. Hard Skills Specific Match (30%)
  const requiredSkills = TECHNICAL_KEYWORDS.filter(k => jdText.toLowerCase().includes(k));
  const foundSkills = requiredSkills.filter(k => resumeText.toLowerCase().includes(k));
  const skillsScore = requiredSkills.length > 0 ? (foundSkills.length / requiredSkills.length) * 100 : 100;

  // 3. Measurable Impact (20%)
  // Detect percentages, dollar signs, and large numbers followed by action verbs
  const impactRegex = /(\d+%|\$\d+|[0-9]{2,})\s+(increase|decrease|growth|saved|reduced|managed|led|delivered)/gi;
  const impactMatches = resumeText.match(impactRegex) || [];
  const impactScore = Math.min(100, impactMatches.length * 20); // 5+ metrics = 100%

  // 4. AI Writing Risk (10% - negative impact)
  const aiFound = AI_MARKERS.filter(m => resumeText.toLowerCase().includes(m));
  const aiRiskScore = (aiFound.length / AI_MARKERS.length) * 100;

  const totalScore = (keywordScore * 0.4) + (skillsScore * 0.3) + (impactScore * 0.2) + (Math.max(0, 100 - aiRiskScore) * 0.1);

  return {
    totalScore: Math.round(totalScore),
    breakdown: {
      keywords: Math.round(keywordScore),
      skills: Math.round(skillsScore),
      impact: Math.round(impactScore),
      aiRisk: Math.round(aiRiskScore)
    },
    missingKeywords: topKeywords.filter(k => !resumeTokens.includes(k)).slice(0, 10),
    foundSkills,
    missingSkills: requiredSkills.filter(k => !foundSkills.includes(k)),
    impactCount: impactMatches.length,
    aiMarkersFound: aiFound
  };
};
