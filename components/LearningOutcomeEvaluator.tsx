
import React, { useState, useRef, useEffect } from 'react';
import { isAISupported, evaluateLearningOutcome, generateExampleOutcome, generateOutcomeFromContent, refineCourseTitle, refineCourseObjectives, extractFromDocument, checkOQFApplicability } from '../services/geminiService';
import { type EvaluationReport, type ApplicabilityReport } from '../types';
import { EvaluationResult } from './EvaluationResult';
import { Loader } from './Loader';
import { IconSparkles, IconAlertTriangle, IconBot, IconPlus, IconTrash, IconChevronDown, IconChevronUp, IconInfo, IconUpload, IconFile, IconCheckCircle, IconXCircle, IconAlertCircle, IconClipboardList } from './Icon';
import { OQF_DESCRIPTORS } from '../constants/oqfConstants';

const initialExampleOutcomes = [
  "Critique network security protocols for a small enterprise environment to identify potential vulnerabilities and recommend mitigation strategies.",
  "Troubleshoot complex faults in an industrial automation control system to restore optimal operational efficiency.",
  "Formulate a health and safety compliance plan for a mid-sized manufacturing facility in accordance with national labor laws.",
  "Develop a comprehensive branding strategy for a new local tourism venture, justifying design choices with market research data."
];

interface CourseUnit {
  id: number;
  name: string;
  topics: string;
}

interface LearningOutcome {
    id: number;
    text: string;
}

export const LearningOutcomeEvaluator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [courseCode, setCourseCode] = useState<string>('');
  const [courseObjectives, setCourseObjectives] = useState<string>('');
  const [courseDescription, setCourseDescription] = useState<string>('');
  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([{ id: Date.now(), text: '' }]);
  const [courseUnits, setCourseUnits] = useState<CourseUnit[]>([{ id: Date.now(), name: '', topics: '' }]);
  const [level, setLevel] = useState<string>('6');
  const [showDescriptors, setShowDescriptors] = useState<boolean>(false);
  const [result, setResult] = useState<EvaluationReport | null>(null);
  const [applicabilityReport, setApplicabilityReport] = useState<ApplicabilityReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingFromContent, setIsGeneratingFromContent] = useState<boolean>(false);
  const [isRefiningTitle, setIsRefiningTitle] = useState<boolean>(false);
  const [isRefiningObjectives, setIsRefiningObjectives] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isCheckingApplicability, setIsCheckingApplicability] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionSuccess, setExtractionSuccess] = useState<boolean>(false);
  const [filledViaExtraction, setFilledViaExtraction] = useState<Set<string>>(new Set());
  const [exampleOutcomes, setExampleOutcomes] = useState<string[]>(initialExampleOutcomes);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const eClone = { target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(eClone);
    }
  };

  const handleFieldChange = (field: string, setter: (val: string) => void, val: string) => {
    setter(val);
    if (filledViaExtraction.has(field)) {
      const newSet = new Set(filledViaExtraction);
      newSet.delete(field);
      setFilledViaExtraction(newSet);
    }
  };

  const [aiSupported, setAiSupported] = useState<boolean | null>(null);
  const [checkingSupport, setCheckingSupport] = useState<boolean>(true);
  const [supportError, setSupportError] = useState<string | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = await isAISupported();
        setAiSupported(supported);
      } catch (err) {
        setSupportError(err instanceof Error ? err.message : 'An unknown error occurred while checking AI support.');
        setAiSupported(false);
      } finally {
        setCheckingSupport(false);
      }
    };
    checkSupport();
  }, []);

  const validateStep1 = () => {
    const missingFields = [];
    if (!courseTitle.trim()) missingFields.push('Course Title');
    if (!courseCode.trim()) missingFields.push('Course Code');
    if (!courseObjectives.trim()) missingFields.push('Course Objectives');

    const outcomeTexts = outcomes.map(o => o.text.trim());
    if (outcomeTexts.filter(Boolean).length === 0) {
        missingFields.push('at least one Learning Outcome');
    }
    
    if (missingFields.length > 0) {
      const fieldList = missingFields.length > 2 
        ? `${missingFields.slice(0, -1).join(', ')}, and ${missingFields.slice(-1)}`
        : missingFields.join(' and ');
      setError(`Please fill in all required fields: ${fieldList}.`);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
        if (validateStep1()) {
            setError(null);
            setCurrentStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else if (currentStep === 2) {
        if (!applicabilityReport) {
            setError("Please run the Compliance Audit before proceeding to evaluation.");
            return;
        }
        setError(null);
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateStep1()) return;

    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const validOutcomes = outcomes.map(o => o.text.trim()).filter(Boolean);
      const report = await evaluateLearningOutcome(
        validOutcomes, 
        level, 
        { 
          title: courseTitle, 
          code: courseCode, 
          objectives: courseObjectives, 
          description: courseDescription 
        }
      );
      setResult(report);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOutcome = () => {
    setOutcomes([...outcomes, { id: Date.now(), text: '' }]);
  };

  const handleRemoveOutcome = (id: number) => {
    setOutcomes(outcomes.filter(o => o.id !== id));
  };

  const handleOutcomeChange = (id: number, text: string) => {
    if (filledViaExtraction.has('outcomes')) {
      const newSet = new Set(filledViaExtraction);
      newSet.delete('outcomes');
      setFilledViaExtraction(newSet);
    }
    setOutcomes(outcomes.map(o => (o.id === id ? { ...o, text } : o)));
  };

  const handleAddUnit = () => {
    setCourseUnits([...courseUnits, { id: Date.now(), name: '', topics: '' }]);
  };

  const handleRemoveUnit = (id: number) => {
    setCourseUnits(courseUnits.filter(u => u.id !== id));
  };

  const handleUnitChange = (id: number, field: keyof Omit<CourseUnit, 'id'>, value: string) => {
    setCourseUnits(courseUnits.map(u => (u.id === id ? { ...u, [field]: value } : u)));
  };

  const handleGenerateExample = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const example = await generateExampleOutcome(level);
      setExampleOutcomes(prev => [example, ...prev].slice(0, 4));
      // Add the new example to the first empty outcome field
      const firstEmptyIndex = outcomes.findIndex(o => o.text.trim() === '');
      if (firstEmptyIndex !== -1) {
        const newOutcomes = [...outcomes];
        newOutcomes[firstEmptyIndex].text = example;
        setOutcomes(newOutcomes);
      } else {
        // Or add a new outcome field if all are filled
        setOutcomes([...outcomes, { id: Date.now(), text: example }]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromContent = async () => {
    if (courseUnits.every(u => !u.name.trim() && !u.topics.trim())) {
      setError("Please add at least one course unit name or some topics to generate an outcome.");
      return;
    }
    setError(null);
    setIsGeneratingFromContent(true);

    try {
      const content = courseUnits.map(u => `Unit: ${u.name}\nTopics: ${u.topics}`).join('\n\n');
      const generatedOutcome = await generateOutcomeFromContent(content, level);
       const firstEmptyIndex = outcomes.findIndex(o => o.text.trim() === '');
      if (firstEmptyIndex !== -1) {
        const newOutcomes = [...outcomes];
        newOutcomes[firstEmptyIndex].text = generatedOutcome;
        setOutcomes(newOutcomes);
      } else {
        setOutcomes([...outcomes, { id: Date.now(), text: generatedOutcome }]);
      }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
    } finally {
        setIsGeneratingFromContent(false);
    }
  };

  const handleRefineTitle = async () => {
    if (!courseTitle.trim()) {
      setError("Please enter a course title before refining.");
      return;
    }
    setError(null);
    setIsRefiningTitle(true);
    try {
        const refinedTitle = await refineCourseTitle(courseTitle, courseObjectives, courseDescription);
        setCourseTitle(refinedTitle);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
    } finally {
        setIsRefiningTitle(false);
    }
  };
  
  const handleRefineObjectives = async () => {
    if (!courseObjectives.trim()) {
      setError("Please write some course objectives to refine.");
      return;
    }
     if (!courseTitle.trim()) {
      // This case is handled by disabling the button, but as a fallback
      setError("Please provide a course title to give context for refining objectives.");
      return;
    }
    setError(null);
    setIsRefiningObjectives(true);
    try {
      const refinedObjectives = await refineCourseObjectives(courseObjectives, courseTitle, level);
      setCourseObjectives(refinedObjectives);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsRefiningObjectives(false);
    }
  };

  const handleCheckApplicability = async () => {
    const validOutcomes = outcomes.map(o => o.text.trim()).filter(Boolean);
    if (!courseTitle.trim() || !courseCode.trim() || !courseObjectives.trim() || validOutcomes.length === 0) {
        setError("Please fill in course information and at least one learning outcome before checking applicability.");
        return;
    }

    setIsCheckingApplicability(true);
    setError(null);
    try {
        const report = await checkOQFApplicability({
            courseTitle,
            courseCode,
            courseObjectives,
            courseDescription,
            learningOutcomes: validOutcomes
        }, level);
        setApplicabilityReport(report);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
    } finally {
        setIsCheckingApplicability(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type (PDF, Text, Doc, etc. based on Gemini support)
    // Gemini supports pdf, images, text, etc.
    const allowedMimeTypes = [
      'application/pdf', 
      'text/plain', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'image/jpeg', 
      'image/png'
    ];

    if (!allowedMimeTypes.includes(file.type)) {
        setError("Please upload a PDF, DOCX, Text file, or an Image of the document.");
        return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractionSuccess(false);

    try {
      const base64 = await fileToBase64(file);
      const extractedData = await extractFromDocument(base64, file.type);
      
      if (extractedData) {
        const filled = new Set<string>();
        if (extractedData.courseTitle) {
            setCourseTitle(extractedData.courseTitle);
            filled.add('title');
        }
        if (extractedData.courseCode) {
            setCourseCode(extractedData.courseCode);
            filled.add('code');
        }
        if (extractedData.courseObjectives) {
            setCourseObjectives(extractedData.courseObjectives);
            filled.add('objectives');
        }
        if (extractedData.courseDescription) {
            setCourseDescription(extractedData.courseDescription);
            filled.add('description');
        }
        
        if (extractedData.learningOutcomes && extractedData.learningOutcomes.length > 0) {
          setOutcomes(extractedData.learningOutcomes.map((text, index) => ({
            id: Date.now() + index,
            text
          })));
          filled.add('outcomes');
        }
        setFilledViaExtraction(filled);
        setExtractionSuccess(true);
        // Clear file input
        e.target.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during extraction.';
      setError(errorMessage);
    } finally {
      setIsExtracting(false);
    }
  };
  
  const StepIndicator = () => (
    <div className="max-w-4xl mx-auto mb-10">
      <div className="flex items-center justify-between relative">
        {[
          { num: 1, label: 'Course Information' },
          { num: 2, label: 'OQF Compliance Audit' },
          { num: 3, label: 'Evaluate & Get Report' }
        ].map((s, i, arr) => (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${currentStep >= s.num ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                {currentStep > s.num ? <IconCheckCircle className="h-6 w-6" /> : s.num}
              </div>
              <span className={`mt-2 text-xs font-semibold uppercase tracking-wider ${currentStep >= s.num ? 'text-green-700 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>{s.label}</span>
            </div>
            {i < arr.length - 1 && (
              <div className="flex-grow h-0.5 bg-slate-200 dark:bg-slate-700 mx-4 -mt-6">
                <div className={`h-full bg-green-600 transition-all duration-500`} style={{ width: currentStep > s.num ? '100%' : '0%' }}></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const AIBadge = ({ field }: { field: string }) => {
    if (!filledViaExtraction.has(field)) return null;
    return (
      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-green-500 text-white border border-green-600 shadow-sm animate-pulse">
        <IconBot className="h-2.5 w-2.5 mr-1" />
        AI EXTRACTED
      </span>
    );
  };

  if (checkingSupport) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader />
        <p className="mt-4 text-slate-500 dark:text-slate-400">Checking AI feature availability...</p>
      </div>
    );
  }

  if (!aiSupported) {
    return (
      <div className="max-w-2xl mx-auto text-center bg-amber-50 dark:bg-amber-900/30 p-8 rounded-lg border border-amber-200 dark:border-amber-500/50">
        <IconAlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="mt-4 text-2xl font-bold text-amber-800 dark:text-amber-200">AI Features Unavailable</h2>
        <p className="mt-2 text-amber-700 dark:text-amber-300">
            The AI-powered features could not be initialized. This usually means the server is not configured with the necessary API key.
        </p>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            If you are the application administrator, please ensure the <code>GEMINI_API_KEY</code> environment variable is set correctly on the server.
        </p>
        {supportError && <p className="mt-2 text-xs text-red-500 dark:text-red-400">Error details: {supportError}</p>}
      </div>
    );
  }

  if (result) {
    return (
        <EvaluationResult 
          report={result} 
          courseTitle={courseTitle}
          courseCode={courseCode}
          level={level}
          originalObjectives={courseObjectives}
          courseDescription={courseDescription}
          originalOutcomes={outcomes.map(o => o.text.trim()).filter(Boolean)}
          onReset={() => {
            setResult(null);
            setCurrentStep(1);
          }}
          onAdoptTitle={(newTitle) => {
            handleFieldChange('title', setCourseTitle, newTitle);
          }}
          onAdoptObjectives={(newObjs) => {
            handleFieldChange('objectives', setCourseObjectives, newObjs);
          }}
        />
    );
  }

  return (
    <div className="py-2">
      <StepIndicator />

      <div className="space-y-10 max-w-4xl mx-auto">
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            
            {/* AI Data Extraction Zone */}
            <div 
              onDragEnter={handleDrag} 
              onDragLeave={handleDrag} 
              onDragOver={handleDrag} 
              onDrop={handleDrop}
              className={`relative bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 p-8 rounded-2xl shadow-xl border-2 border-dashed transition-all duration-300 ${dragActive ? 'border-indigo-500 bg-indigo-100/50 scale-[1.01]' : extractionSuccess ? 'border-green-500/50 dark:border-green-700/50' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-transform hover:rotate-3 ${isExtracting ? 'animate-bounce bg-green-100 dark:bg-green-900/40 text-green-600' : extractionSuccess ? 'bg-green-600 text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-indigo-500 shadow-md'}`}>
                  {isExtracting ? <Loader /> : extractionSuccess ? <IconCheckCircle className="h-10 w-10" /> : <IconUpload className="h-10 w-10" />}
                </div>
                
                <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight">
                  {isExtracting ? 'Analyzing Document...' : extractionSuccess ? 'Extraction Complete!' : 'Smart Course Auditor'}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">
                  {isExtracting ? "Gemini AI is reading your syllabus to extract course metadata..." : extractionSuccess ? "We've populated the form with the extracted data. Please review below." : "Drop your Course Descriptor or syllabus (PDF, DOCX, IMG) here to automatically fill all course fields."}
                </p>

                <input
                    ref={fileInputRef}
                    type="file"
                    id="cdp-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt,image/*"
                    disabled={isExtracting}
                />
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExtracting}
                      className={`flex items-center px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all ${isExtracting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                      <IconUpload className="h-5 w-5 mr-2" />
                      {extractionSuccess ? 'Upload Different File' : 'Select Document'}
                  </button>
                  
                  {extractionSuccess && (
                    <button
                        type="button"
                        onClick={() => {
                          setCourseTitle('');
                          setCourseCode('');
                          setCourseObjectives('');
                          setCourseDescription('');
                          setOutcomes([{ id: Date.now(), text: '' }]);
                          setExtractionSuccess(false);
                          setFilledViaExtraction(new Set());
                        }}
                        className="flex items-center px-8 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                        <IconTrash className="h-5 w-5 mr-2 text-red-500" />
                        Clear All
                    </button>
                  )}
                </div>
              </div>
              
              {isExtracting && (
                <div className="absolute inset-x-0 -bottom-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-b-2xl overflow-hidden">
                  <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
                </div>
              )}
            </div>

            {/* 1. Course Information */}
            <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border transition-all ${extractionSuccess ? 'border-green-200 dark:border-green-800' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                    <IconFile className="h-6 w-6 mr-2 text-green-600" />
                    1. Course Main Information
                  </h2>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <label htmlFor="courseTitle" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Course Title <span className="text-red-500">*</span>
                    <AIBadge field="title" />
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      id="courseTitle"
                      value={courseTitle}
                      onChange={(e) => handleFieldChange('title', setCourseTitle, e.target.value)}
                      className="flex-grow w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-slate-700"
                      placeholder="e.g., Advanced Network Security"
                    />
                    <button
                      type="button"
                      onClick={handleRefineTitle}
                      disabled={isRefiningTitle || !courseTitle.trim()}
                      className="flex-shrink-0 flex items-center px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isRefiningTitle ? <Loader /> : <IconSparkles className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="courseCode" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Course Code <span className="text-red-500">*</span>
                      <AIBadge field="code" />
                    </label>
                    <input
                      type="text"
                      id="courseCode"
                      value={courseCode}
                      onChange={(e) => handleFieldChange('code', setCourseCode, e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-slate-700"
                      placeholder="e.g., ITNS4200"
                    />
                  </div>
                  <div>
                    <label htmlFor="level" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target OQF Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="level"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-slate-700"
                    >
                      {Object.keys(OQF_DESCRIPTORS).map(levelKey => (
                        <option key={levelKey} value={levelKey}>Level {levelKey}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Objectives & Description */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                <IconBot className="h-6 w-6 mr-2 text-green-600" />
                Course Objectives & Description
              </h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="courseObjectives" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Course Objectives <span className="text-red-500">*</span>
                    <AIBadge field="objectives" />
                  </label>
                  <div className="flex items-start space-x-2">
                    <textarea
                      id="courseObjectives"
                      value={courseObjectives}
                      onChange={(e) => handleFieldChange('objectives', setCourseObjectives, e.target.value)}
                      rows={5}
                      className="flex-grow w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-slate-700"
                      placeholder="Enter the main aims of the course..."
                    />
                    <button
                      type="button"
                      onClick={handleRefineObjectives}
                      disabled={isRefiningObjectives || !courseObjectives.trim() || !courseTitle.trim()}
                      className="flex-shrink-0 flex items-center px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isRefiningObjectives ? <Loader /> : <IconSparkles className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="courseDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description / Syllabus Overview (Optional)
                    <AIBadge field="description" />
                  </label>
                  <textarea
                    id="courseDescription"
                    value={courseDescription}
                    onChange={(e) => handleFieldChange('description', setCourseDescription, e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-slate-700"
                    placeholder="Provide additional context about the course syllabus..."
                  />
                </div>
              </div>
            </div>

            {/* 3. Learning Outcomes */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                <IconClipboardList className="h-6 w-6 mr-2 text-green-600" />
                Learning Outcomes
                <AIBadge field="outcomes" />
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Define the measurable outcomes. AI can help you generate these from your course topics below.
              </p>
              <div className="space-y-4">
                {outcomes.map((outcome, index) => (
                  <div key={outcome.id} className="flex items-start space-x-3">
                    <span className="pt-3 font-bold text-slate-400 w-6">0{index + 1}</span>
                    <textarea
                      value={outcome.text}
                      onChange={(e) => handleOutcomeChange(outcome.id, e.target.value)}
                      rows={2}
                      className="flex-grow w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 transition-all focus:shadow-md"
                      placeholder="e.g., Evaluate security frameworks to develop disaster recovery plans."
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOutcome(outcome.id)}
                      disabled={outcomes.length <= 1}
                      className="flex-shrink-0 p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 mt-1.5 transition-colors"
                    >
                      <IconTrash className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
                <div className="flex flex-wrap items-center mt-6 gap-3">
                  <button
                    type="button"
                    onClick={handleAddOutcome}
                    className="flex items-center px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg hover:border-green-500 hover:text-green-600 transition-all font-semibold"
                  >
                    <IconPlus className="h-4 w-4 mr-2" />
                    Add Field
                  </button>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                  <button
                    type="button"
                    onClick={handleGenerateExample}
                    disabled={isGenerating}
                    className="px-4 py-2 text-sm font-bold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center"
                  >
                      {isGenerating ? <Loader /> : <IconSparkles className="h-4 w-4 mr-2" />}
                      Get AI Example
                  </button>
                </div>

                {/* Example Outcomes List */}
                <div className="mt-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Recent AI Examples</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {exampleOutcomes.map((example, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const firstEmptyIndex = outcomes.findIndex(o => o.text.trim() === '');
                          if (firstEmptyIndex !== -1) {
                            const newOutcomes = [...outcomes];
                            newOutcomes[firstEmptyIndex].text = example;
                            setOutcomes(newOutcomes);
                          } else {
                            setOutcomes([...outcomes, { id: Date.now(), text: example }]);
                          }
                        }}
                        className="text-left p-3 text-xs bg-slate-50 dark:bg-slate-900/40 hover:bg-green-50 dark:hover:bg-green-900/20 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-800 transition-all hover:border-green-300 group"
                      >
                        <span className="block italic line-clamp-2">"{example}"</span>
                        <span className="mt-1 text-[8px] font-bold text-green-600 items-center hidden group-hover:flex">
                          <IconPlus className="h-2 w-2 mr-1" /> CLICK TO ADD
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              {/* Course Units / Topic Input for Generation */}
              <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Generate Outcomes from Content</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider font-semibold">List Course Units or Core Topics</p>
                <div className="grid grid-cols-1 gap-3 mb-4">
                  {courseUnits.map((unit) => (
                    <div key={unit.id} className="flex space-x-2">
                       <input
                          type="text"
                          value={unit.name}
                          onChange={(e) => handleUnitChange(unit.id, 'name', e.target.value)}
                          placeholder="Unit Title..."
                          className="w-1/3 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-green-500 dark:bg-slate-900"
                      />
                      <input
                          type="text"
                          value={unit.topics}
                          onChange={(e) => handleUnitChange(unit.id, 'topics', e.target.value)}
                          placeholder="Topics covered..."
                          className="flex-grow px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-green-500 dark:bg-slate-900"
                      />
                       <button type="button" onClick={() => handleRemoveUnit(unit.id)} disabled={courseUnits.length <= 1} className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-0">
                          <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-3">
                  <button type="button" onClick={handleAddUnit} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300">Add Entry</button>
                  <button
                    type="button"
                    onClick={handleGenerateFromContent}
                    disabled={isGeneratingFromContent}
                    className="flex items-center px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded uppercase tracking-tighter hover:bg-slate-800 dark:hover:bg-white transition-all disabled:opacity-50"
                  >
                    {isGeneratingFromContent ? <Loader /> : <IconBot className="h-3 w-3 mr-2" />}
                    Compose from Content
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* OQF Compliance Check Screen */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4">
                  <IconClipboardList className="h-10 w-10 text-indigo-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight">OQF Compliance Audit</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Before we proceed toward the final evaluation, our AI auditor will verify if your course structure and language align with foundational OQF requirements.
                </p>
              </div>

              {!applicabilityReport ? (
                <div className="flex flex-col items-center py-10 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-500 mb-6 uppercase tracking-widest">Ready for verification</p>
                  <button
                    type="button"
                    onClick={handleCheckApplicability}
                    disabled={isCheckingApplicability}
                    className="flex items-center px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-xl hover:bg-indigo-700 hover:shadow-indigo-500/25 transition-all text-lg"
                  >
                    {isCheckingApplicability ? <Loader /> : <IconClipboardList className="h-6 w-6 mr-3" />}
                    {isCheckingApplicability ? 'Auditing Documentation...' : 'Run Compliance Audit'}
                  </button>
                </div>
              ) : (
                <div className={`p-8 rounded-2xl border-2 transition-all animate-in zoom-in-95 duration-500 ${applicabilityReport.isApplicable ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'}`}>
                  <div className="flex items-center mb-6">
                    <div className={`p-2 rounded-lg mr-4 ${applicabilityReport.isApplicable ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-300'}`}>
                      {applicabilityReport.isApplicable ? (
                        <IconCheckCircle className="h-8 w-8" />
                      ) : (
                        <IconXCircle className="h-8 w-8" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{applicabilityReport.overallStatus}</h3>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest tracking-tighter">Audit Result</p>
                    </div>
                  </div>
                  
                  <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 py-2 italic text-slate-700 dark:text-slate-300 mb-8 text-lg">
                    "{applicabilityReport.generalFeedback}"
                  </blockquote>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {applicabilityReport.criteriaChecks.map((check, idx) => (
                      <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-start space-x-3 transition-transform hover:scale-[1.02]">
                        {check.satisfied ? (
                          <div className="mt-1 bg-green-500 rounded-full p-0.5"><IconCheckCircle className="h-4 w-4 text-white" /></div>
                        ) : (
                          <div className="mt-1 bg-red-500 rounded-full p-0.5"><IconXCircle className="h-4 w-4 text-white" /></div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">{check.criterion}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{check.feedback}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-900 text-white p-5 rounded-xl shadow-inner border-t-4 border-indigo-500 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Recommended Action</p>
                      <p className="text-base font-bold leading-tight">{applicabilityReport.suggestedAction}</p>
                    </div>
                    {!applicabilityReport.isApplicable && (
                      <button 
                        onClick={() => setCurrentStep(1)}
                        className="text-xs font-black bg-white/10 hover:bg-white/20 px-3 py-2 rounded transition-colors"
                      >
                        FIX ISSUES
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Final Submission Step */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <IconSparkles className="h-64 w-64" />
              </div>

              <div className="relative z-10 text-center max-w-2xl mx-auto">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter leading-none">Holistic Alignment<br/>Evaluation</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-10 text-lg">
                  You are now ready to generate the comprehensive evaluation report. This will analyze your outcomes against all characteristics of <strong>OQF Level {level}</strong>.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-10 text-left">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Course Title</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{courseTitle}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outcomes Count</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{outcomes.filter(o => !!o.text.trim()).length} Statements</p>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isLoading}
                    className={`w-full md:w-auto flex items-center justify-center px-12 py-5 bg-green-600 text-white text-2xl font-black rounded-2xl hover:bg-green-700 disabled:bg-green-400 disabled:cursor-wait transition-all shadow-2xl hover:shadow-green-500/25 transform hover:-translate-y-1 mb-6 ${isLoading ? 'animate-pulse' : ''}`}
                  >
                    {isLoading ? <Loader /> : <IconSparkles className="h-8 w-8 mr-4" />}
                    {isLoading ? 'Processing Evaluation...' : 'Generate Full Report'}
                  </button>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Powered by Gemini 3 Flash</p>
                </div>
              </div>
            </div>
            
            {/* Show short error if any */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center animate-in shake-50">
                <IconAlertTriangle className="h-5 w-5 mr-3" />
                <span className="font-bold">{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Global Navigation Footer */}
        <div className="max-w-4xl mx-auto flex items-center justify-between pb-20">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1 || isLoading}
            className={`flex items-center px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
          >
            <IconChevronDown className="h-5 w-5 mr-2 rotate-90" />
            Back
          </button>

          {currentStep < 3 && (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={isLoading || isExtracting || isCheckingApplicability}
              className="flex items-center px-10 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Continue
              <IconChevronDown className="h-5 w-5 ml-2 -rotate-90" />
            </button>
          )}
        </div>

        {/* Error Popup (If any outside step context) */}
        {error && currentStep === 1 && (
          <div className="fixed bottom-10 right-10 z-50 animate-in slide-in-from-right duration-500 max-w-sm">
            <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-start border-4 border-white dark:border-slate-800">
               <IconAlertTriangle className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5" />
               <div>
                  <p className="font-black text-sm uppercase tracking-tighter">Required Fields Missing</p>
                  <p className="text-xs opacity-90 leading-tight mt-1">{error}</p>
               </div>
               <button onClick={() => setError(null)} className="ml-4 hover:scale-110 transition-transform"><IconTrash className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
