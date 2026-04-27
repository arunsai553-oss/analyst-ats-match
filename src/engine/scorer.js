import _ from 'lodash';

/**
 * Universal ATS Scoring Engine (1000 IQ Version)
 * Dynamically adapts to ANY job role by extracting key requirements from the JD.
 */

const STOP_WORDS = new Set(['the', 'and', 'to', 'for', 'with', 'a', 'in', 'is', 'it', 'of', 'on', 'that', 'this', 'an', 'are', 'was', 'were', 'will', 'been', 'have', 'has', 'had', 'from', 'but', 'not', 'needed', 'required', 'preferred', 'seeking', 'looking', 'expertise', 'experience', 'must', 'should', 'plus', 'requirements', 'duties', 'responsibilities']);

const AI_MARKERS = [
  'delve', 'testament', 'tapestry', 'seamlessly', 'embark', 'comprehensive', 
  'innovative solutions', 'passionate about', 'pivotal role', 'unparalleled',
  'demonstrated ability', 'highly motivated', 'results-oriented'
];

export const analyzeATS = (resumeText, jdText) => {
  if (!resumeText || !jdText) return null;

  const lowResume = resumeText.toLowerCase();
  const lowJd = jdText.toLowerCase();

  const tokenize = (text) => {
    return text.toLowerCase().match(/\b(\w+)\b/g) || [];
  };

  const getNGrams = (tokens, n) => {
    const ngrams = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  };

  const resumeTokens = tokenize(resumeText);
  const jdTokes = tokenize(jdText).filter(t => !STOP_WORDS.has(t) && t.length > 2);
  
  // --- 1. Smart Keyword & Phrase Extraction (N-Grams) ---
  // We look for 1-word, 2-word, and 3-word phrases in the JD
  const jdBigrams = getNGrams(tokenize(jdText), 2).filter(ph => {
    const parts = ph.split(' ');
    return !STOP_WORDS.has(parts[0]) && !STOP_WORDS.has(parts[1]);
  });
  const jdTrigrams = getNGrams(tokenize(jdText), 3).filter(ph => {
    const parts = ph.split(' ');
    return !STOP_WORDS.has(parts[0]) && !STOP_WORDS.has(parts[2]);
  });

  const allJdTerms = [
    ...jdTokes,
    ...jdBigrams.slice(0, 50), // Prioritize common phrases
    ...jdTrigrams.slice(0, 30)
  ];

  const jdFreq = _.countBy(allJdTerms);
  const sortedJdTerms = Object.entries(jdFreq)
    .sort((a, b) => b[1] - a[1])
    .filter(([term]) => term.length > 3);
  
  // Select top 40 significant terms/phrases
  const requiredKeywords = sortedJdTerms.slice(0, 40).map(k => k[0]);
  const matchedKeywords = requiredKeywords.filter(k => lowResume.includes(k));
  const keywordScore = (matchedKeywords.length / requiredKeywords.length) * 100;

  // --- 2. Action & Impact Analysis (Role Agnostic) ---
  const impactRegex = /(\d+%|\$\d+[mkb]?|[0-9]{1,})\s*(?:\+)?\s*(increase|decrease|growth|saved|reduced|managed|led|delivered|optimized|accelerated|completed|built|designed|developed|launched|products|projects|years|tickets|revenue|efficiency|users)/gi;
  const impactMatches = [...resumeText.matchAll(impactRegex)];
  const uniqueImpacts = _.uniqBy(impactMatches, m => m[0].toLowerCase());
  const impactScore = Math.min(100, uniqueImpacts.length * 15); 

  // --- 3. Semantic Role Alignment ---
  const softSkills = ['leadership', 'communication', 'teamwork', 'problem solving', 'adaptability', 'collaboration', 'management', 'interpersonal', 'presentation', 'stakeholder', 'mentoring', 'negotiation'];
  const jdSoftSkills = softSkills.filter(s => lowJd.includes(s));
  const resumeSoftSkills = jdSoftSkills.filter(s => lowResume.includes(s));
  const softSkillScore = jdSoftSkills.length > 0 ? (resumeSoftSkills.length / jdSoftSkills.length) * 100 : 100;

  // --- 4. Advanced Seniority & Experience Match ---
  const seniorityMap = { 'junior': 1, 'jr': 1, 'entry': 1, 'associate': 2, 'senior': 3, 'sr': 3, 'lead': 4, 'staff': 5, 'principal': 6, 'manager': 4, 'director': 5, 'vp': 6, 'executive': 7 };
  
  const getLevel = (text) => {
    let maxLevel = 0;
    Object.entries(seniorityMap).forEach(([k, v]) => {
      if (new RegExp(`\\b${k}\\b`, 'i').test(text)) maxLevel = Math.max(maxLevel, v);
    });
    return maxLevel;
  };

  const jdLevel = getLevel(lowJd) || 2; // Default to associate if unclear
  const resumeLevel = getLevel(lowResume) || 2;
  
  let seniorityMatch = 100;
  if (resumeLevel < jdLevel) seniorityMatch = 60; // Underqualified
  else if (resumeLevel > jdLevel + 1) seniorityMatch = 85; // Overqualified but safe
  
  // --- 5. AI Content Risk & Tone Analysis ---
  const aiFound = AI_MARKERS.filter(m => lowResume.includes(m));
  const aiRiskScore = (aiFound.length / AI_MARKERS.length) * 100;

  // --- 6. Section Detection & Keyword Density ---
  const sectionHeaders = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'contact', 'objective'];
  const sections = {};
  sectionHeaders.forEach((header) => {
    const start = lowResume.indexOf(header);
    if (start !== -1) {
      const nextStarts = sectionHeaders
        .map(h => lowResume.indexOf(h))
        .filter(s => s > start);
      const end = nextStarts.length > 0 ? Math.min(...nextStarts) : lowResume.length;
      sections[header] = lowResume.substring(start, end);
    }
  });

  const sectionDensity = {};
  Object.entries(sections).forEach(([name, text]) => {
    const hits = requiredKeywords.filter(k => text.includes(k));
    sectionDensity[name] = { hits, count: hits.length };
  });

  // --- 7. Red Flag Detection ---
  const flags = [];
  const buzzwords = ['synergy','leverage','passionate','motivated','hardworking','team player','go-getter'];
  buzzwords.forEach(bw => {
    if (lowResume.includes(bw)) flags.push(`Overused buzzword: "${bw}"`);
  });
  
  const wordCount = resumeText.split(/\s+/).length;
  if (wordCount < 300) flags.push('Resume too short — under 300 words');
  if (wordCount > 1200) flags.push('Resume too long — over 1200 words');
  
  if (!resumeText.includes('@')) flags.push('No email address detected');
  if (!new RegExp('\\b(20\\d{2}|present)\\b', 'i').test(resumeText)) flags.push('No dates detected in experience');
  if (uniqueImpacts.length === 0) flags.push('No quantified metrics found — add numbers/percentages');

  // --- Final Weighted Calculation ---
  const totalScore = (keywordScore * 0.45) + (impactScore * 0.15) + (softSkillScore * 0.15) + (seniorityMatch * 0.15) + (Math.max(0, 100 - aiRiskScore) * 0.10);

  return {
    totalScore: Math.round(totalScore),
    breakdown: {
      keywords: Math.round(keywordScore),
      impact: Math.round(impactScore),
      softSkills: Math.round(softSkillScore),
      seniority: Math.round(seniorityMatch),
      aiRisk: Math.round(aiRiskScore)
    },
    missingKeywords: sortedJdTerms
      .slice(0, 40)
      .map(k => k[0])
      .filter(k => !lowResume.includes(k))
      .slice(0, 15),
    foundSkills: matchedKeywords.slice(0, 20),
    impactCount: uniqueImpacts.length,
    aiMarkersFound: aiFound,
    sections: sectionDensity,
    redFlags: flags,
    recommendation: totalScore >= 90 ? '✅ Strong match — apply now' : 
                   totalScore >= 70 ? '⚠️ Good match — add missing keywords' :
                   totalScore >= 50 ? '🟡 Partial match — significant gaps' : 
                   '❌ Weak match — major rewrite needed'
  };
};
