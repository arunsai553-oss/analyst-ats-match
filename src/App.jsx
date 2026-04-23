import React, { useState, useEffect } from 'react';
import { analyzeATS } from './engine/scorer';
import { 
  ShieldCheck, 
  Target, 
  Cpu, 
  FileText, 
  AlertCircle, 
  ChevronRight, 
  BarChart3,
  CheckCircle2,
  XCircle,
  Lightbulb
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!resume || !jd) return;
    setIsAnalyzing(true);
    
    // Simulate engine latency for "premium" feel
    setTimeout(() => {
      const data = analyzeATS(resume, jd);
      setResults(data);
      setIsAnalyzing(false);
      window.scrollTo({ top: 600, behavior: 'smooth' });
    }, 1500);
  };

  const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-6 sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-2 rounded-lg text-white">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight gradient-text">Analyst ATS Match</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500">v1.2 Global Sync Engine</span>
            <div className="h-6 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-1 text-success font-semibold text-sm">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              Engine Online
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Intro */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Instant ATS Gap Analysis</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Stop guessing. Our 1000 IQ heuristic engine simulates corporate Applicant Tracking Systems 
            to find keyword gaps, impact metrics, and AI writing risks in seconds.
          </p>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-700 font-bold mb-2">
              <FileText size={20} className="text-primary-600" />
              <span>PASTE RESUME</span>
            </div>
            <textarea 
              className="w-full h-[400px] p-6 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none resize-none card-shadow font-mono text-sm"
              placeholder="Paste your resume content here..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-700 font-bold mb-2">
              <Target size={20} className="text-danger" />
              <span>PASTE JOB DESCRIPTION</span>
            </div>
            <textarea 
              className="w-full h-[400px] p-6 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none resize-none card-shadow font-mono text-sm"
              placeholder="Paste the target JD here..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center mb-24">
          <button 
            onClick={handleAnalyze}
            disabled={!resume || !jd || isAnalyzing}
            className={`
              flex items-center gap-3 px-12 py-5 rounded-full text-xl font-black transition-all
              ${!resume || !jd || isAnalyzing 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-primary-600 text-white hover:bg-primary-700 hover:scale-105 active:scale-95 shadow-xl shadow-primary-200'}
            `}
          >
            {isAnalyzing ? (
              <>
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ANALYZING PATTERNS...
              </>
            ) : (
              <>
                RUN ATS MATCH ENGINE
                <ChevronRight size={24} />
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <AnimatePresence>
          {results && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12 pb-24"
            >
              <div className="h-[1px] bg-slate-200 w-full mb-12"></div>

              {/* Score Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-3xl card-shadow border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <BarChart3 size={100} />
                  </div>
                  <span className="text-slate-500 font-bold text-sm mb-2 uppercase tracking-widest">Overall Match</span>
                  <span className={`text-7xl font-black ${results.totalScore > 70 ? 'text-success' : 'text-warning'}`}>
                    {results.totalScore}%
                  </span>
                  <div className="mt-4 text-xs font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-600">
                    {results.totalScore > 75 ? 'ATS READY' : 'REFINEMENT NEEDED'}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl card-shadow border border-slate-100">
                  <h4 className="font-bold text-slate-400 text-xs uppercase mb-6 tracking-widest">Match Breakdown</h4>
                  <div className="space-y-4">
                    {[
                      { label: 'Keywords', val: results.breakdown.keywords, color: 'bg-primary-500' },
                      { label: 'Hard Skills', val: results.breakdown.skills, color: 'bg-success' },
                      { label: 'Impact', val: results.breakdown.impact, color: 'bg-warning' },
                      { label: 'AI Risk', val: 100 - results.breakdown.aiRisk, color: 'bg-danger' }
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>{item.label}</span>
                          <span>{item.val}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.val}%` }}
                            className={`${item.color} h-full rounded-full`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl card-shadow border border-slate-100 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                      <Target size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">Impact Metrics</h4>
                      <p className="text-xs text-slate-500">Measurable achievement score</p>
                    </div>
                  </div>
                  <div className="text-4xl font-black text-slate-800 mb-2">
                    {results.impactCount}
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Detected {results.impactCount} quantifiable results. Modern ATS looks for %, $, and scale metrics.
                  </p>
                </div>

                <div className="bg-white p-8 rounded-3xl card-shadow border border-slate-100 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-100 p-2 rounded-lg text-red-600">
                      <Cpu size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">AI Risk Score</h4>
                      <p className="text-xs text-slate-500">Heuristic word pattern check</p>
                    </div>
                  </div>
                  <div className={`text-4xl font-black mb-2 ${results.breakdown.aiRisk > 20 ? 'text-danger' : 'text-success'}`}>
                    {results.breakdown.aiRisk}%
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {results.breakdown.aiRisk > 30 
                      ? 'High risk of AI detection. Remove markers like "delve" or "testament".' 
                      : 'Phrasing appears human-centric and authentic.'}
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Missing Keywords */}
                <div className="lg:col-span-2 bg-white p-10 rounded-3xl card-shadow border border-slate-100">
                  <div className="flex items-center gap-4 mb-8">
                    <BarChart3 className="text-primary-600" size={32} />
                    <h3 className="text-2xl font-bold tracking-tight">Critical Keyword Gaps</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {results.missingKeywords.length > 0 ? (
                      results.missingKeywords.map(k => (
                        <div key={k} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 text-red-700 rounded-xl font-bold text-sm">
                          <AlertCircle size={14} />
                          {k}
                        </div>
                      ))
                    ) : (
                      <div className="text-success font-bold flex items-center gap-2">
                        <CheckCircle2 size={20} />
                        All high-frequency JD keywords covered!
                      </div>
                    )}
                  </div>
                  <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-primary-700 font-bold mb-2">
                      <Lightbulb size={18} />
                      <span>Analyst Pro Tip</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      ATS algorithms weigh frequency of these terms highly. Integrate 2-3 of these missing words 
                      naturally into your "Skills" or "Experience" bullet points to instantly boost your score.
                    </p>
                  </div>
                </div>

                {/* Hard Skills Matrix */}
                <div className="bg-white p-10 rounded-3xl card-shadow border border-slate-100">
                  <h3 className="text-xl font-bold mb-6 tracking-tight">Technical Matrix</h3>
                  <div className="space-y-6">
                    <div>
                      <span className="text-xs font-bold text-success uppercase tracking-widest block mb-3">Found Skills</span>
                      <div className="flex flex-wrap gap-2">
                        {results.foundSkills.map(s => (
                          <span key={s} className="px-3 py-1 bg-success/10 text-success rounded-lg font-bold text-xs uppercase">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-danger uppercase tracking-widest block mb-3">Missing Skills</span>
                      <div className="flex flex-wrap gap-2">
                        {results.missingSkills.map(s => (
                          <span key={s} className="px-3 py-1 bg-danger/10 text-danger rounded-lg font-bold text-xs uppercase">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Marker Alert */}
              {results.aiMarkersFound.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-8 rounded-3xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-red-600 text-white p-2 rounded-xl">
                      <AlertCircle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-red-900">AI Detection Alert</h3>
                  </div>
                  <p className="text-red-700 font-medium mb-4">
                    The following phrases are heavily associated with LLM-generated resumes and may be flagged by recruiter filters:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {results.aiMarkersFound.map(m => (
                      <span key={m} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl font-mono text-sm font-bold italic">"{m}"</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-slate-500 text-sm font-medium">
            © 2026 Analyst Command Center — Advanced Job Hunter Suite
          </div>
          <div className="flex items-center gap-8 text-slate-400 font-bold text-sm">
            <a href="#" className="hover:text-primary-600 transition-colors">Documentation</a>
            <a href="#" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary-600 transition-colors">Enterprise API</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
