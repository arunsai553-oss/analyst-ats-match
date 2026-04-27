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
  Lightbulb,
  Upload
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import _ from 'lodash';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const App = () => {
  const getSafeStorage = (key, fallback) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return fallback;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (e) {
      console.warn(`[STORAGE] Using fallback for ${key}:`, e);
      return fallback;
    }
  };

  useEffect(() => {
    console.log("🚀 Universal ATS Match Engine v2.5.1 initialized.");
  }, []);

  const [resumes, setResumes] = useState(() => getSafeStorage('ats_resumes', [{ id: 1, text: '', name: 'Resume 1', loading: false }]));
  const [jd, setJd] = useState(() => {
    try {
      return localStorage.getItem('ats_jd') || '';
    } catch(e) { return ''; }
  });
  const [results, setResults] = useState(() => getSafeStorage('ats_results', []));
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('ats_viewMode') || 'input';
    } catch(e) { return 'input'; }
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('ats_resumes', JSON.stringify(resumes));
  }, [resumes]);

  useEffect(() => {
    localStorage.setItem('ats_jd', jd);
  }, [jd]);

  useEffect(() => {
    localStorage.setItem('ats_results', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    localStorage.setItem('ats_viewMode', viewMode);
  }, [viewMode]);

  const extractTextFromFile = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    console.log(`[DEBUG] Extracting text from ${file.name} (type: ${extension})`);
    
    if (extension === 'pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        console.log(`[DEBUG] PDF loaded: ${pdf.numPages} pages`);
        let text = '';
        const pagePromises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          pagePromises.push(pdf.getPage(i).then(page => page.getTextContent()));
        }
        const contents = await Promise.all(pagePromises);
        text = contents.map(content => content.items.map(item => item.str).join(' ')).join('\n');
        
        console.log(`[DEBUG] Extraction complete. Total characters: ${text.length}`);
        if (text.trim().length === 0) {
          console.warn("[DEBUG] PDF extraction returned empty text. PDF might be scanned/image-based.");
        }
        return text;
      } catch (err) {
        console.error("[DEBUG] PDF Extraction Error:", err);
        throw err;
      }
    } else if (extension === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else {
      return await file.text();
    }
  };

  const handleFileUpload = async (id, file) => {
    if (!file) return;
    
    setResumes(resumes.map(r => r.id === id ? { ...r, loading: true, name: file.name } : r));
    
    try {
      const text = await extractTextFromFile(file);
      setResumes(resumes.map(r => r.id === id ? { ...r, text, loading: false } : r));
    } catch (err) {
      console.error("File extraction error:", err);
      alert("Failed to extract text from file. Please paste manually.");
      setResumes(resumes.map(r => r.id === id ? { ...r, loading: false } : r));
    }
  };

  const addResume = () => {
    setResumes([...resumes, { id: Date.now(), text: '', name: `Resume ${resumes.length + 1}`, loading: false }]);
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all resumes and the JD?")) {
      setResumes([{ id: 1, text: '', name: 'Resume 1', loading: false }]);
      setJd('');
      setResults([]);
      setViewMode('input');
    }
  };

  const handleBulkUpload = async (files) => {
    const fileList = Array.from(files);
    const newResumes = [];
    
    setIsAnalyzing(true); // Show a global loading state
    
    for (const file of fileList) {
      const id = Date.now() + Math.random();
      try {
        const text = await extractTextFromFile(file);
        newResumes.push({ id, text, name: file.name, loading: false });
      } catch (err) {
        console.error(`Failed to extract ${file.name}:`, err);
        newResumes.push({ id, text: '', name: `${file.name} (FAILED)`, loading: false });
      }
    }
    
    // Replace empty initial resume if it's the only one
    if (resumes.length === 1 && !resumes[0].text) {
      setResumes(newResumes);
    } else {
      setResumes([...resumes, ...newResumes]);
    }
    setIsAnalyzing(false);
  };

  const updateResumeText = (id, text) => {
    setResumes(resumes.map(r => r.id === id ? { ...r, text } : r));
  };

  const updateResumeName = (id, name) => {
    setResumes(resumes.map(r => r.id === id ? { ...r, name } : r));
  };

  const removeResume = (id) => {
    if (resumes.length > 1) {
      setResumes(resumes.filter(r => r.id !== id));
    }
  };

  const handleAnalyze = () => {
    console.log("Starting analysis...");
    const validResumes = resumes.filter(r => r.text.trim().length > 10);
    if (validResumes.length === 0 || jd.trim().length < 10) {
      alert("Please provide both a Resume and a Job Description (min 10 characters).");
      return;
    }
    
    setIsAnalyzing(true);
    
    setTimeout(() => {
      try {
        console.log("Analyzing resumes:", validResumes.length);
        const allResults = validResumes.map(r => {
          const analysis = analyzeATS(r.text, jd);
          if (!analysis) throw new Error(`Analysis failed for ${r.name}`);
          return {
            ...analysis,
            resumeName: r.name,
            resumeId: r.id
          };
        });
        
        console.log("Sorting results...");
        const sortedResults = _.sortBy(allResults, [r => -r.totalScore]);
        setResults(sortedResults);
        setIsAnalyzing(false);
        setViewMode('results');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log("Analysis complete.");
      } catch (err) {
        console.error("Analysis Error:", err);
        alert("An error occurred during analysis: " + err.message);
        setIsAnalyzing(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 py-6 sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-2 rounded-lg text-white">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight gradient-text">Universal ATS Match</h1>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Enterprise Suite</span>
                <span className="text-[9px] font-black bg-success/10 text-success px-1.5 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-success animate-pulse"></div>
                  Privacy Guard Active
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {viewMode === 'results' && (
              <button 
                onClick={() => setViewMode('input')}
                className="text-sm font-bold text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-xl transition-all"
              >
                ← Edit Inputs
              </button>
            )}
            <div className="h-6 w-[1px] bg-slate-200"></div>
            <div className="text-right">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Version</div>
              <div className="text-sm font-bold text-slate-800">2.6.2 Stable</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {viewMode === 'input' ? (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4 tracking-tight">Universal Batch ATS Match</h2>
                <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                  Upload or paste multiple resumes to see which one ranks highest for your target role. 
                  Our role-agnostic engine dynamically extracts requirements from your JD to find the perfect fit.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                {/* Resumes Column */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <FileText size={20} className="text-primary-600" />
                        <span>RESUMES ({resumes.length})</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={clearAll}
                          className="flex items-center gap-1 text-[10px] font-black bg-slate-100 text-slate-400 px-3 py-1 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          CLEAR ALL
                        </button>
                        <button 
                          onClick={addResume}
                          className="flex items-center gap-1 text-xs font-black bg-primary-50 text-primary-600 px-3 py-1 rounded-full hover:bg-primary-100 transition-all"
                        >
                          + ADD ANOTHER
                        </button>
                      </div>
                    </div>

                    {/* Bulk Upload Zone */}
                    <div 
                      className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-white hover:border-primary-400 hover:bg-primary-50 transition-all cursor-pointer group mb-8"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleBulkUpload(e.dataTransfer.files);
                      }}
                      onClick={() => document.getElementById('bulk-input').click()}
                    >
                      <input 
                        id="bulk-input" 
                        type="file" 
                        multiple 
                        className="hidden" 
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => handleBulkUpload(e.target.files)}
                      />
                      <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-100 group-hover:scale-110 transition-all">
                        <Upload size={24} className="text-slate-400 group-hover:text-primary-600" />
                      </div>
                      <h3 className="font-bold text-slate-800">Bulk Upload Resumes</h3>
                      <p className="text-slate-400 text-sm">Drag & drop multiple PDFs or click to browse</p>
                    </div>
                  
                  {resumes.map((res, index) => (
                    <motion.div 
                      layout
                      key={res.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-2xl border border-slate-200 card-shadow p-6 space-y-4 relative"
                    >
                      {resumes.length > 1 && (
                        <button 
                          onClick={() => removeResume(res.id)}
                          className="absolute top-4 right-4 text-slate-300 hover:text-danger transition-colors"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <input 
                          className="text-lg font-bold text-slate-800 outline-none border-b border-transparent focus:border-primary-200 w-full"
                          value={res.name}
                          onChange={(e) => updateResumeName(res.id, e.target.value)}
                        />
                        <div className="flex gap-2">
                          <label className="cursor-pointer flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all">
                            <Upload size={14} />
                            {res.loading ? 'EXTRACTING...' : 'UPLOAD PDF/DOCX'}
                            <input 
                              type="file" 
                              className="hidden" 
                              accept=".pdf,.docx,.txt"
                              onChange={(e) => handleFileUpload(res.id, e.target.files[0])}
                            />
                          </label>
                        </div>
                      </div>
                      <textarea 
                        className="w-full h-[250px] p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-primary-50 focus:border-primary-300 transition-all outline-none resize-none font-mono text-sm"
                        placeholder={`Paste content for ${res.name}...`}
                        value={res.text}
                        onChange={(e) => updateResumeText(res.id, e.target.value)}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* JD Column */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="sticky top-32 space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 font-bold mb-4">
                      <Target size={20} className="text-danger" />
                      <span>TARGET JOB DESCRIPTION</span>
                    </div>
                    <textarea 
                      className="w-full h-[550px] p-6 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none resize-none card-shadow font-mono text-sm"
                      placeholder="Paste the target JD here..."
                      value={jd}
                      onChange={(e) => setJd(e.target.value)}
                    />
                    
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAnalyze}
                      disabled={resumes.some(r => !r.text) || !jd || isAnalyzing}
                      className={`
                        w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-xl font-black transition-all shadow-xl relative overflow-hidden
                        ${resumes.some(r => !r.text) || !jd || isAnalyzing 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-primary-600 text-white shadow-primary-200'}
                      `}
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                          BATCH ANALYZING...
                        </>
                      ) : (
                        <>
                          COMPARE ALL RESUMES
                          <ChevronRight size={24} />
                        </>
                      )}
                      {!isAnalyzing && !resumes.some(r => !r.text) && jd && (
                        <motion.div 
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                        />
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Results View */
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-800">Comparison Results</h2>
                  <p className="text-slate-500 font-medium">Ranked by ATS Match probability</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      const text = encodeURIComponent(`I just used the Universal ATS Match engine to optimize my resume! 🚀\n\nRanked #1 with a ${results[0]?.totalScore}% match score.\n\nTry it yourself: https://arunsai553-oss.github.io/analyst-ats-match/`);
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://arunsai553-oss.github.io/analyst-ats-match/')}&summary=${text}`, '_blank');
                    }}
                    className="bg-[#0077b5] text-white px-6 py-2 rounded-full font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 card-shadow"
                  >
                    SHARE ON LINKEDIN
                  </button>
                  <button 
                    onClick={() => {
                      const data = JSON.stringify(results, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `ats_analysis_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    }}
                    className="bg-slate-800 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-slate-900 transition-all flex items-center gap-2 card-shadow"
                  >
                    EXPORT JSON
                  </button>
                </div>
              </div>

            {/* Comparison Radar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
              <div className="lg:col-span-8 bg-white p-8 rounded-[40px] card-shadow border border-slate-100 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 p-8">
                  <h3 className="text-xl font-bold text-slate-800">Top 3 Multi-Vector Analysis</h3>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Comparative Performance Matrix</p>
                </div>
                <div className="w-full h-[400px] mt-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart> {/* Placeholder wrapper for layout consistency if needed, but using Radar below */}
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Actual Radar Chart Logic */}
                  <div className="absolute inset-0 flex items-center justify-center pt-16">
                     <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={[
                          { name: 'Keywords', ...results.reduce((acc, r, i) => ({ ...acc, [`r${i+1}`]: r.breakdown.keywords }), {}) },
                          { name: 'Impact', ...results.reduce((acc, r, i) => ({ ...acc, [`r${i+1}`]: r.breakdown.impact }), {}) },
                          { name: 'Soft Skills', ...results.reduce((acc, r, i) => ({ ...acc, [`r${i+1}`]: r.breakdown.softSkills }), {}) },
                          { name: 'Seniority', ...results.reduce((acc, r, i) => ({ ...acc, [`r${i+1}`]: r.breakdown.seniority }), {}) },
                          { name: 'AI Safety', ...results.reduce((acc, r, i) => ({ ...acc, [`r${i+1}`]: 100 - r.breakdown.aiRisk }), {}) },
                        ].slice(0, 3)}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis hide />
                          <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-4 rounded-2xl card-shadow border border-slate-100">
                                  <p className="font-black text-xs mb-2">{payload[0].payload.name}</p>
                                  {payload.map((p, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                                      <span className="text-xs font-bold text-slate-600">{results[i]?.resumeName}: {p.value}%</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }} />
                          <Bar dataKey="r1" fill="#0ea5e9" radius={[10, 10, 0, 0]} barSize={20} />
                          <Bar dataKey="r2" fill="#8b5cf6" radius={[10, 10, 0, 0]} barSize={20} />
                          <Bar dataKey="r3" fill="#ec4899" radius={[10, 10, 0, 0]} barSize={20} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-primary-600 rounded-[40px] p-8 text-white card-shadow flex flex-col justify-between overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div>
                  <Cpu className="mb-4 opacity-50" size={48} />
                  <h3 className="text-3xl font-black mb-2">Engine Insights</h3>
                  <p className="text-primary-100 text-sm font-medium leading-relaxed">
                    Our 1000 IQ engine detected <span className="text-white font-bold">{results[0]?.foundSkills?.length || 0}</span> matching technical skills 
                    and <span className="text-white font-bold">{results[0]?.impactCount || 0}</span> high-value impact metrics in your top-ranked resume.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <span className="block text-[10px] font-black uppercase opacity-60 mb-1">Top Skill Match</span>
                    <span className="font-bold">{results[0]?.foundSkills?.[0] || 'N/A'}</span>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <span className="block text-[10px] font-black uppercase opacity-60 mb-1">Recommended Action</span>
                    <span className="font-bold text-sm">{results[0]?.totalScore > 85 ? 'Apply Immediately' : 'Optimize Gaps First'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white rounded-[40px] border border-slate-200 card-shadow overflow-hidden mb-12">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-4 font-black text-xs uppercase text-slate-400">Rank</th>
                    <th className="px-8 py-4 font-black text-xs uppercase text-slate-400">Resume Name</th>
                    <th className="px-8 py-4 font-black text-xs uppercase text-slate-400">ATS Score</th>
                    <th className="px-8 py-4 font-black text-xs uppercase text-slate-400">Keyword Coverage</th>
                    <th className="px-8 py-4 font-black text-xs uppercase text-slate-400">Impact Count</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((res, index) => (
                    <tr key={res.resumeId} className={`border-b border-slate-100 hover:bg-primary-50/30 transition-colors ${index === 0 ? 'bg-primary-50/50' : ''}`}>
                      <td className="px-8 py-6 font-black text-xl text-slate-300">#{index + 1}</td>
                      <td className="px-8 py-6 font-bold text-slate-800">
                        {res.resumeName}
                        {index === 0 && <span className="ml-3 text-[10px] bg-primary-600 text-white px-2 py-0.5 rounded-full">BEST MATCH</span>}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-2xl font-black ${res.totalScore > 75 ? 'text-success' : 'text-warning'}`}>
                          {res.totalScore}%
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-primary-500 h-full" style={{ width: `${res.breakdown.keywords}%` }}></div>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-bold text-slate-600">{res.impactCount} metrics</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Match Deep Dive */}
            <div className="bg-primary-900 rounded-[40px] p-12 text-white card-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                <div className="lg:col-span-2">
                  <span className="bg-primary-500/30 text-primary-200 px-4 py-1 rounded-full text-xs font-black uppercase mb-4 inline-block">Top Pick Deep Dive</span>
                  <h3 className="text-4xl font-black mb-4">Detailed Analysis: {results[0].resumeName}</h3>
                  <div className="flex flex-wrap gap-10">
                    <div className="flex flex-col">
                      <span className="text-primary-100 text-[10px] font-black uppercase tracking-widest mb-1">Keywords</span>
                      <span className="text-4xl font-black text-white">{results[0]?.breakdown?.keywords || 0}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-primary-100 text-[10px] font-black uppercase tracking-widest mb-1">Soft Skills</span>
                      <span className="text-4xl font-black text-white">{results[0]?.breakdown?.softSkills || 0}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-primary-100 text-[10px] font-black uppercase tracking-widest mb-1">Seniority Match</span>
                      <span className="text-4xl font-black text-white">{results[0]?.breakdown?.seniority || 0}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center lg:justify-end">
                  <div className="w-48 h-48 rounded-full border-8 border-primary-800 flex items-center justify-center relative">
                    <div className="text-center">
                      <div className="text-5xl font-black leading-none">{results[0]?.totalScore || 0}%</div>
                      <div className="text-[10px] font-bold opacity-60">PROBABILITY</div>
                    </div>
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="96" cy="96" r="88" fill="none" stroke="#0ea5e9" strokeWidth="8" strokeDasharray="552.9" strokeDashoffset={552.9 - (552.9 * (results[0]?.totalScore || 0) / 100)} />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Gap Analysis for Top Pick */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white p-10 rounded-3xl card-shadow border border-slate-100">
                  <div className="flex items-center gap-4 mb-8">
                    <BarChart3 className="text-primary-600" size={32} />
                    <h3 className="text-2xl font-bold tracking-tight text-slate-800">Critical Keyword Gaps</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(results[0]?.missingKeywords || []).length > 0 ? (
                      results[0].missingKeywords.map(k => (
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
                </div>

                <div className="bg-white p-10 rounded-3xl card-shadow border border-slate-100">
                  <h3 className="text-xl font-bold mb-6 tracking-tight text-slate-800">Critical Red Flags</h3>
                  <div className="space-y-4">
                    {(results[0]?.redFlags || []).length > 0 ? (
                      results[0].redFlags.map((flag, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl font-bold text-sm">
                          <AlertCircle size={18} />
                          {flag}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-success/10 text-success rounded-xl font-bold text-sm">
                        <CheckCircle2 size={18} />
                        No critical red flags detected!
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-10 rounded-3xl card-shadow border border-slate-100">
                  <h3 className="text-xl font-bold mb-6 tracking-tight text-slate-800">Section Optimization</h3>
                  <div className="space-y-6">
                    {Object.entries(results[0]?.sections || {}).map(([name, data]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-400">{name}</span>
                        <div className="flex items-center gap-4 flex-grow mx-8">
                          <div className="h-2 flex-grow bg-slate-100 rounded-full overflow-hidden">
                            <div className="bg-primary-500 h-full" style={{ width: `${Math.min(100, ((data?.count || 0) / 10) * 100)}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-16">{data?.count || 0} hits</span>
                        </div>
                      </div>
                    ))}
                    {Object.keys(results[0]?.sections || {}).length === 0 && (
                      <div className="text-slate-400 text-sm italic">No standard sections detected. Use clear headers like "Experience" and "Skills".</div>
                    )}
                  </div>
                </div>
            </div>

            {/* Recommendation Banner */}
            <div className={`mt-12 p-8 rounded-[30px] text-center border-2 ${
              (results[0]?.totalScore || 0) >= 70 ? 'bg-success/5 border-success/20 text-success' : 'bg-warning/5 border-warning/20 text-warning'
            }`}>
              <h4 className="text-2xl font-black mb-2">{results[0]?.recommendation || 'Analysis ready'}</h4>
              <p className="opacity-70 font-medium">Based on 1000 IQ dynamic requirement analysis</p>
            </div>
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
