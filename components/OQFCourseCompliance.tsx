
import React, { useState, useRef, useEffect } from 'react';
import { generateOQFCourseCompliance } from '../services/geminiService';
import { prepareFileForAI } from '../lib/fileUtils';
import { type OQFCourseComplianceReport } from '../types';
import { Loader } from './Loader';
import { WaitingBar } from './WaitingBar';
import { 
    IconUpload, 
    IconCheckCircle, 
    IconXCircle, 
    IconFile, 
    IconInfo, 
    IconAlertCircle, 
    IconFileText,
    IconClipboardList,
    IconSparkles,
    IconClipboard,
    IconTrash
} from './Icon';

export const OQFCourseCompliance: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [report, setReport] = useState<OQFCourseComplianceReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [courseCode, setCourseCode] = useState('');
    
    const [files, setFiles] = useState<{
        syllabus: File | null;
        plo: File | null;
        template: File | null;
    }>({
        syllabus: null,
        plo: null,
        template: null
    });

    const [savedFilenames, setSavedFilenames] = useState<{
        syllabus?: string;
        plo?: string;
        template?: string;
    }>({});

    const [manualIndividualLOEdits, setManualIndividualLOEdits] = useState<Record<number, any[]>>({});
    const [manualCollectiveEdits, setManualCollectiveEdits] = useState<any[] | null>(null);

    const reportRef = useRef<HTMLDivElement>(null);

    // Persistence: Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('oqf_compliance_state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state.report) setReport(state.report);
                if (state.courseCode) setCourseCode(state.courseCode);
                if (state.filenames) setSavedFilenames(state.filenames);
                if (state.individualLOEdits) setManualIndividualLOEdits(state.individualLOEdits);
                if (state.collectiveEdits) setManualCollectiveEdits(state.collectiveEdits);
            } catch (e) {
                console.error('Failed to load saved state:', e);
            }
        }
    }, []);

    // Persistence: Save to localStorage on change
    useEffect(() => {
        const filenames = {
            syllabus: files.syllabus?.name || savedFilenames.syllabus,
            plo: files.plo?.name || savedFilenames.plo,
            template: files.template?.name || savedFilenames.template,
        };
        const state = { 
            report, 
            courseCode, 
            filenames, 
            individualLOEdits: manualIndividualLOEdits, 
            collectiveEdits: manualCollectiveEdits 
        };
        localStorage.setItem('oqf_compliance_state', JSON.stringify(state));
    }, [report, courseCode, files, savedFilenames, manualIndividualLOEdits, manualCollectiveEdits]);

    const handleFileUpload = (type: 'syllabus' | 'plo' | 'template', file: File) => {
        setFiles(prev => ({ ...prev, [type]: file }));
        setSavedFilenames(prev => ({ ...prev, [type]: file.name }));
    };

    const [manualPLOEdits, setManualPLOEdits] = useState<Record<number, any[]>>({});
    const [editingLOIndex, setEditingLOIndex] = useState<number | null>(null);

    const availablePLOs = React.useMemo(() => {
        if (!report) return [];
        const pool = new Map();
        report.intentAndRole.ploMapping.forEach(map => {
            map.mappedPLOs.forEach(plo => {
                if (!pool.has(plo.code)) {
                    pool.set(plo.code, plo);
                }
            });
        });
        return Array.from(pool.values());
    }, [report]);

    const refinedPloMapping = React.useMemo(() => {
        if (!report) return [];
        const programs = ['SE', 'IS', 'CL', 'NWSY'];
        
        return report.intentAndRole.ploMapping.map((map, i) => {
            // Use manual edits if they exist for this LO index
            const basePLOs = manualPLOEdits[i] !== undefined ? manualPLOEdits[i] : map.mappedPLOs;
            
            // Only apply completion logic if the LO is mapped to at least one PLO
            if (basePLOs.length === 0) return map;

            const updatedPLOs = [...basePLOs];
            const mappedPrograms = new Set(updatedPLOs.map(p => p.program?.toUpperCase()));
            const missingPrograms = programs.filter(p => !mappedPrograms.has(p));

            // Add missing programs as 'Supporting'
            missingPrograms.forEach(prog => {
                updatedPLOs.push({
                    code: `D-${prog}-PLO`,
                    program: prog,
                    contribution: 'Supporting',
                    explanation: 'Contributes to developing foundational skills relevant to the program.'
                });
            });

            // Calculate overall contribution: 'Supporting*' if > 50% are 'Supporting*', else 'Supporting'
            const supportingStarCount = updatedPLOs.filter(p => p.contribution === 'Supporting*').length;
            const overallContribution = supportingStarCount > (updatedPLOs.length / 2) ? 'Supporting*' : 'Supporting';

            return {
                ...map,
                overallContribution: overallContribution as 'Supporting' | 'Supporting*',
                mappedPLOs: updatedPLOs
            };
        });
    }, [report, manualPLOEdits]);

    const finalIndividualLOs = React.useMemo(() => {
        if (!report) return [];
        return report.qualityChecklist.individualLOs.map((lo, i) => ({
            ...lo,
            items: manualIndividualLOEdits[i] || lo.items
        }));
    }, [report, manualIndividualLOEdits]);

    const finalCollectiveChecklist = React.useMemo(() => {
        if (!report) return [];
        return manualCollectiveEdits || report.qualityChecklist.collectiveChecklist;
    }, [report, manualCollectiveEdits]);

    const updateIndividualChecklist = (loIndex: number, itemIndex: number, updates: Partial<any>) => {
        const currentLoItems = [...(manualIndividualLOEdits[loIndex] || report?.qualityChecklist.individualLOs[loIndex].items || [])];
        currentLoItems[itemIndex] = { ...currentLoItems[itemIndex], ...updates };
        setManualIndividualLOEdits(prev => ({ ...prev, [loIndex]: currentLoItems }));
    };

    const updateCollectiveChecklist = (itemIndex: number, updates: Partial<any>) => {
        const currentItems = [...(manualCollectiveEdits || report?.qualityChecklist.collectiveChecklist || [])];
        currentItems[itemIndex] = { ...currentItems[itemIndex], ...updates };
        setManualCollectiveEdits(currentItems);
    };

    const handleAnalyze = async () => {
        if (!files.syllabus || !files.plo || !courseCode) {
            setError("Please provide Course Code, Syllabus, and PLO consolidated file.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const syllabusData = await prepareFileForAI(files.syllabus);
            const ploData = await prepareFileForAI(files.plo);
            
            const payload = [syllabusData, ploData];
            if (files.template) {
                const templateData = await prepareFileForAI(files.template);
                payload.push(templateData);
            }

            const result = await generateOQFCourseCompliance(payload);
            setReport(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred during analysis.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyText = () => {
        if (!report) return;
        
        let text = `OQF COURSE COMPLIANCE DOCUMENT - ${report.courseInformation.code}\n`;
        text += `==================================================\n\n`;
        
        text += `## 1. Course Information\n`;
        text += `- Code and Title: ${report.courseInformation.code} – ${report.courseInformation.title}\n`;
        text += `- Diploma Level (1 or 2): ${report.courseInformation.diplomaLevel || ''}\n`;
        text += `- Credit Hours: ${report.courseInformation.creditHours || ''}\n`;
        text += `- Program: ${report.courseInformation.program || ''}\n`;
        text += `- Proposed OQF Level: ${report.courseInformation.proposedOQFLevel || ''}\n`;
        text += `- Proposed Credit Value: ${report.courseInformation.proposedCreditValue || ''}\n`;
        text += `- SCT Lead: \n`;
        text += `- SCT Reviewer: \n`;
        text += `- Last Modified: \n\n`;
        
        text += `## 2. Course Intent and Role in Program\n`;
        text += `### Course Description\n${report.intentAndRole.courseDescription}\n\n`;
        
        text += `### Learning Outcomes\n`;
        report.intentAndRole.learningOutcomes.forEach((lo, i) => {
            text += `LO${i+1}. ${lo}\n`;
        });
        text += `\n`;
        
        text += `### Contribution to Program Learning Outcomes\n`;
        text += `| LO | Overall | PLO Code | Contribution | Explanation |\n`;
        text += `|----|---------|----------|--------------|-------------|\n`;
        refinedPloMapping.forEach((map, index) => {
            map.mappedPLOs.forEach((plo, pi) => {
                const loCell = pi === 0 ? `LO${index+1}` : '';
                const overallCell = pi === 0 ? (map.overallContribution || 'Supporting') : '';
                text += `| ${loCell} | ${overallCell} | ${plo.code} | ${plo.contribution} | ${plo.explanation} |\n`;
            });
        });
        text += `\n`;
        
        text += `### Indicative Content\n`;
        report.intentAndRole.indicativeContent.forEach((item, i) => {
            text += `${i+1}. ${item}\n`;
        });
        text += `\n`;
        
        text += `- Does the content reflect its title? ${report.intentAndRole.titleReflectsContent.answer}\n`;
        text += `- Justification: ${report.intentAndRole.titleReflectsContent.justification}\n\n`;
        
        text += `## 3. Learning Outcomes Quality Checklist\n`;
        finalIndividualLOs.forEach(lo => {
            text += `\nLO#${lo.loNumber}: ${lo.loText}\n`;
            text += `| Checklist Item | Compliant (Y/N) | Evidence / Comment |\n`;
            text += `|----------------|-----------------|--------------------|\n`;
            lo.items.forEach(item => {
                const combined = `Evidence: ${item.evidence || 'N/A'}<br/>Comment: ${item.comment}`;
                text += `| ${item.question} | ${item.satisfied ? 'Y' : 'N'} | ${combined} |\n`;
            });
        });
        text += `\n`;
        
        text += `### Collective Checklist\n`;
        text += `| Checklist Item | Compliant (Y/N) | Evidence / Comment |\n`;
        text += `|----------------|-----------------|--------------------|\n`;
        finalCollectiveChecklist.forEach(item => {
            const combined = `Evidence: ${item.evidence || 'N/A'}<br/>Comment: ${item.comment}`;
            text += `| ${item.question} | ${item.satisfied ? 'Y' : 'N'} | ${combined} |\n`;
        });

        navigator.clipboard.writeText(text);
        alert("Report copied to clipboard as structured text ready for entry!");
    };

    const handleExportHtml = () => {
        if (!reportRef.current || !report) return;
        setIsExporting(true);

        setTimeout(() => {
            if (reportRef.current) {
                const reportClone = reportRef.current.cloneNode(true) as HTMLElement;
                const exportButtons = reportClone.querySelectorAll('.export-ignore');
                exportButtons.forEach(el => el.remove());

                const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OQF Compliance Report - ${report.courseInformation.code}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem; }
        .report-page { max-width: 1000px; margin: 0 auto; background: white; padding: 3rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        h1, h2, h3 { color: #0f172a; }
        .table-container { border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; margin: 1.5rem 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; padding: 0.75rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
        td { padding: 0.75rem; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; }
        .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .badge-supporting-star { background: #dcfce7; color: #166534; }
        .badge-supporting { background: #eff6ff; color: #1e40af; }
        @media print {
            body { padding: 0; background: white; }
            .report-page { box-shadow: none; border: none; max-width: 100%; border-radius: 0; padding: 0; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="report-page">
        <header style="border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 2rem;">
            <h1 style="font-size: 1.875rem; font-weight: 900; letter-spacing: -0.025em;">OQF Course Compliance Audit</h1>
            <p style="color: #64748b; font-weight: 600;">Course: ${report.courseInformation.code} - ${report.courseInformation.title}</p>
        </header>
        ${reportClone.innerHTML}
        <footer style="margin-top: 3rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; text-align: center; color: #94a3b8; font-size: 0.75rem;">
            Generated by OQF AI Expert System - ${new Date().toLocaleDateString()}
        </footer>
    </div>
</body>
</html>`;

                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `OQF-Compliance-${report.courseInformation.code || 'Report'}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            setIsExporting(false);
        }, 300);
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset and start a new course audit?")) {
            setReport(null);
            setCourseCode('');
            setFiles({
                syllabus: null,
                plo: null,
                template: null
            });
            setSavedFilenames({});
            setManualIndividualLOEdits({});
            setManualCollectiveEdits(null);
            setManualPLOEdits({});
            setError(null);
            localStorage.removeItem('oqf_compliance_state');
        }
    };

    const isAnyActionLoading = isLoading || isExporting;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <WaitingBar />
                <Loader />
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Analyzing OQF Compliance</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gemini AI is mapping PLOs and performing quality audits...</p>
                </div>
            </div>
        );
    }

    if (report) {
        return (
            <div className="max-w-5xl mx-auto pb-20 relative">
                {isAnyActionLoading && <WaitingBar />}
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">OQF Compliance Report</h2>
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={handleReset}
                            className="flex items-center px-4 py-2 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all text-sm mr-2"
                        >
                            <IconTrash className="h-4 w-4 mr-2" />
                            Reset All
                        </button>
                        <button 
                            onClick={handleCopyText}
                            className="flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                        >
                            <IconClipboard className="h-4 w-4 mr-2" /> 
                            Copy Text
                        </button>
                        <button 
                            onClick={handleExportHtml}
                            disabled={isExporting}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                        >
                            {isExporting ? <><Loader /> Exporting...</> : <><IconFileText className="h-4 w-4 mr-2" /> Export HTML</>}
                        </button>
                    </div>
                </div>

                <div ref={reportRef} className="space-y-12">
                    {/* Course Information Section */}
                    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center">
                                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">1</span>
                                Course Information
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-slate-100 dark:divide-slate-700">
                            {[
                                { label: 'Code and Title', value: `${report.courseInformation.code} – ${report.courseInformation.title}`, colSpan: 'md:col-span-2 lg:col-span-3' },
                                { label: 'Diploma Level (1 or 2)', value: report.courseInformation.diplomaLevel },
                                { label: 'Credit Hours', value: report.courseInformation.creditHours },
                                { label: 'Program', value: report.courseInformation.program },
                                { label: 'Proposed OQF Level', value: report.courseInformation.proposedOQFLevel || '' },
                                { label: 'Proposed Credit Value', value: report.courseInformation.proposedCreditValue || '' },
                                { label: 'SCT Lead', value: '' },
                                { label: 'SCT Reviewer', value: '' },
                                { label: 'Last Modified', value: '' },
                            ].map((item, i) => (
                                <div key={i} className={`p-4 ${item.colSpan || ''}`}>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.value || '-'}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Course Intent and Role section */}
                    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center">
                                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">2</span>
                                Course Intent and Role in Program
                            </h3>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-4">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-r border-slate-100 dark:border-slate-700">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Course Description</h4>
                                </div>
                                <div className="p-6 md:col-span-3 italic text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                    {report.intentAndRole.courseDescription}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-r border-slate-100 dark:border-slate-700">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Learning Outcomes</h4>
                                </div>
                                <div className="p-6 md:col-span-3">
                                    <ul className="space-y-3">
                                        {report.intentAndRole.learningOutcomes.map((lo, i) => (
                                            <li key={i} className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                <span className="text-indigo-600 mr-2">LO{i + 1}.</span> {lo}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-r border-slate-100 dark:border-slate-700">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Contribution to Program Learning Outcomes</h4>
                                </div>
                                <div className="p-6 md:col-span-3 space-y-8">
                                    {/* Compliance Summary Dashboard */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                        {(() => {
                                            const totalLOs = refinedPloMapping.length;
                                            const fullyCompliant = refinedPloMapping.filter(map => {
                                                const mappedProgs = new Set(map.mappedPLOs.map(p => p.program?.toUpperCase()));
                                                return ['SE', 'IS', 'CL', 'NWSY'].every(prog => mappedProgs.has(prog));
                                            }).length;
                                            const complianceRate = totalLOs > 0 ? Math.round((fullyCompliant / totalLOs) * 100) : 0;
                                            
                                            return (
                                                <>
                                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Compliance Rate</p>
                                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{complianceRate}%</p>
                                                        </div>
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${complianceRate === 100 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {complianceRate === 100 ? <IconCheckCircle className="h-6 w-6" /> : <IconAlertCircle className="h-6 w-6" />}
                                                        </div>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Status</p>
                                                        <p className={`text-sm font-bold ${complianceRate === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                                            {complianceRate === 100 ? 'Fully OQF Compliant' : `${totalLOs - fullyCompliant} LOs require attention`}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Mapped Specializations</p>
                                                        <div className="flex gap-1 mt-1">
                                                            {['SE', 'IS', 'CL', 'NWSY'].map(prog => {
                                                                const isFound = refinedPloMapping.some(m => m.mappedPLOs.some(p => p.program?.toUpperCase() === prog));
                                                                return (
                                                                    <span key={prog} className={`px-2 py-1 rounded text-[8px] font-black ${isFound ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                                        {prog}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {refinedPloMapping.map((map, i) => {
                                        const programs = ['SE', 'IS', 'CL', 'NWSY'];
                                        const mappedPrograms = new Set(map.mappedPLOs.map(p => p.program?.toUpperCase()));
                                        const missingPrograms = programs.filter(p => !mappedPrograms.has(p));
                                        const isFullyMapped = missingPrograms.length === 0;
                                        const hasNoMapping = map.mappedPLOs.length === 0;

                                        return (
                                            <div key={i} className="space-y-4">
                                                <div className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                                    hasNoMapping 
                                                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
                                                        : !isFullyMapped 
                                                            ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                                                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                                }`}>
                                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex-grow">
                                                        <span className="text-indigo-600">LO{i + 1}.</span> {map.cloText}
                                                    </p>
                                                    
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        {map.overallContribution && (
                                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${map.overallContribution === 'Supporting*' ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' : 'bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200'}`}>
                                                                Overall: {map.overallContribution}
                                                            </span>
                                                        )}
                                                        <button 
                                                            onClick={() => setEditingLOIndex(editingLOIndex === i ? null : i)}
                                                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-black uppercase text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                                        >
                                                            {editingLOIndex === i ? 'Close Editor' : 'Edit Mapping'}
                                                        </button>

                                                        {hasNoMapping ? (
                                                            <span className="flex items-center px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase rounded shadow-lg animate-pulse">
                                                                <IconAlertCircle className="h-3 w-3 mr-1" /> Invalid: No Mappings
                                                            </span>
                                                        ) : !isFullyMapped ? (
                                                            <div className="flex flex-wrap gap-2 items-center">
                                                                <span className="flex items-center px-3 py-1 bg-amber-500 text-white text-[10px] font-black uppercase rounded shadow-sm">
                                                                    <IconAlertCircle className="h-3 w-3 mr-1" /> Partial: Missing Progs
                                                                </span>
                                                                <div className="flex gap-1">
                                                                    {programs.map(prog => {
                                                                        const isMapped = mappedPrograms.has(prog);
                                                                        return (
                                                                            <span key={prog} className={`w-7 h-7 flex items-center justify-center rounded-lg text-[9px] font-black transition-all ${isMapped ? 'bg-green-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-slate-700'}`}>
                                                                                {prog}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="flex items-center px-3 py-1 bg-green-600 text-white text-[10px] font-black uppercase rounded shadow-sm">
                                                                <IconCheckCircle className="h-3 w-3 mr-1" /> Valid & Compliant
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {editingLOIndex === i && (
                                                    <div className="p-6 bg-indigo-50/30 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-900/50 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex items-center justify-between">
                                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center">
                                                                <IconSparkles className="h-3 w-3 mr-2" /> Program Outcome Selection
                                                            </h5>
                                                            <p className="text-[10px] text-slate-400 font-bold italic">Select PLOs relevant to this learning outcome.</p>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                            {availablePLOs.map((plo) => {
                                                                const currentMapping = manualPLOEdits[i] !== undefined ? manualPLOEdits[i] : (report?.intentAndRole.ploMapping[i]?.mappedPLOs || []);
                                                                const isSelected = currentMapping.some((p: any) => p.code === plo.code);
                                                                
                                                                return (
                                                                    <button
                                                                        key={plo.code}
                                                                        onClick={() => {
                                                                            const newMapping = isSelected 
                                                                                ? currentMapping.filter((p: any) => p.code !== plo.code)
                                                                                : [...currentMapping, { ...plo }];
                                                                            setManualPLOEdits(prev => ({ ...prev, [i]: newMapping }));
                                                                        }}
                                                                        className={`p-3 rounded-xl border text-left transition-all ${
                                                                            isSelected 
                                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105 z-10' 
                                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className={`text-[10px] font-black ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{plo.program}</span>
                                                                            {isSelected && <IconCheckCircle className="h-3 w-3" />}
                                                                        </div>
                                                                        <div className="text-[11px] font-bold truncate">{plo.code}</div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        
                                                        <div className="pt-2 flex justify-end">
                                                            <button 
                                                                onClick={() => {
                                                                    const loText = report?.intentAndRole.learningOutcomes[i];
                                                                    const manualEntry = prompt("Enter a custom PLO code (e.g. D-SE-PLO1):");
                                                                    if (manualEntry) {
                                                                        const program = manualEntry.split('-')[1] || 'GENERAL';
                                                                        const currentMapping = manualPLOEdits[i] !== undefined ? manualPLOEdits[i] : (report?.intentAndRole.ploMapping[i]?.mappedPLOs || []);
                                                                        setManualPLOEdits(prev => ({ 
                                                                            ...prev, 
                                                                            [i]: [...currentMapping, { 
                                                                                code: manualEntry, 
                                                                                program, 
                                                                                contribution: 'Supporting', 
                                                                                explanation: 'Manually added mapping.' 
                                                                            }]
                                                                        }));
                                                                    }
                                                                }}
                                                                className="text-[9px] font-black uppercase text-indigo-500 hover:underline"
                                                            >
                                                                + Add custom PLO code
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-lg">
                                                    <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-slate-700">
                                                            <th className="px-3 py-2 w-24">PLO Code</th>
                                                            <th className="px-3 py-2 w-24">Contribution</th>
                                                            <th className="px-3 py-2">Explanation</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-[11px]">
                                                        {map.mappedPLOs.map((plo, pi) => (
                                                            <tr key={pi} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/10">
                                                                <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{plo.code}</td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                                        plo.contribution === 'Primary' 
                                                                            ? 'bg-amber-100 text-amber-700' 
                                                                            : plo.contribution === 'Supporting*' 
                                                                                ? 'bg-green-100 text-green-700 shadow-sm' 
                                                                                : 'bg-indigo-100 text-indigo-700'
                                                                    }`}>
                                                                        {plo.contribution}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-500 italic leading-relaxed">{plo.explanation}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-r border-slate-100 dark:border-slate-700">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Indicative Content</h4>
                                </div>
                                <div className="p-6 md:col-span-3">
                                    <ul className="space-y-2">
                                        {report.intentAndRole.indicativeContent.map((content, i) => (
                                            <li key={i} className="text-sm text-slate-700 dark:text-slate-300 italic flex items-start">
                                                <span className="mr-2 text-indigo-500">•</span>
                                                {content}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-r border-slate-100 dark:border-slate-700">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-tight">Does the content reflect its title?</h4>
                                </div>
                                <div className="p-6 md:col-span-3 flex items-center">
                                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-black rounded mr-4">{report.intentAndRole.titleReflectsContent.answer}</span>
                                    <p className="text-xs text-slate-500 italic">{report.intentAndRole.titleReflectsContent.justification}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Learning Outcomes Quality Checklist Section */}
                    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center">
                                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">3</span>
                                Learning Outcomes Quality Checklist
                            </h3>
                        </div>

                        <div className="p-8 space-y-12">
                            {finalIndividualLOs.map((lo, i) => (
                                <div key={i} className="space-y-4">
                                    <div className="flex items-center text-sm font-black text-slate-900 dark:text-white border-b-2 border-indigo-500 pb-2">
                                        LO#{lo.loNumber}: {lo.loText}
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                         <table className="w-full text-left border-collapse table-fixed">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                    <th className="px-4 py-3 w-1/3">Checklist Item</th>
                                                    <th className="px-4 py-3 text-center w-36 font-bold text-slate-500 bg-slate-100/30">Compliant (Y/N)</th>
                                                    <th className="px-4 py-3">Evidence / Comment</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
                                                {lo.items.map((item, ii) => (
                                                    <tr key={ii} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-bold leading-tight align-top">{item.question}</td>
                                                        <td className="px-4 py-3 text-center align-top">
                                                            <button 
                                                                onClick={() => updateIndividualChecklist(i, ii, { satisfied: !item.satisfied })}
                                                                className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${item.satisfied ? 'bg-green-100 text-green-700 ring-2 ring-green-500/20' : 'bg-red-100 text-red-700 ring-2 ring-red-500/20'}`}
                                                            >
                                                                {item.satisfied ? 'Y' : 'N'}
                                                            </button>
                                                        </td>
                                                        <td className={`px-4 py-3 space-y-3 align-top transition-all ${!item.satisfied ? 'bg-red-50/25 dark:bg-red-950/5 border-l-4 border-l-red-500' : ''}`}>
                                                            {!item.satisfied && (
                                                                <div className="flex items-center text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">
                                                                    <span className="mr-1">⚠️</span> Non-Compliance Justification Required
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Evidence:</div>
                                                                <textarea 
                                                                    value={item.evidence || ''}
                                                                    onChange={(e) => updateIndividualChecklist(i, ii, { evidence: e.target.value })}
                                                                    placeholder="Enter evidence..."
                                                                    className={`w-full bg-slate-50 dark:bg-slate-900/50 border rounded-lg p-2 text-[11px] font-medium outline-none resize-none min-h-[50px] transition-all ${!item.satisfied ? 'border-red-300 dark:border-red-800/60 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20'}`}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Comment / Feedback:</div>
                                                                <textarea 
                                                                    value={item.comment}
                                                                    onChange={(e) => updateIndividualChecklist(i, ii, { comment: e.target.value })}
                                                                    placeholder="Enter comments..."
                                                                    className={`w-full bg-slate-50 dark:bg-slate-900/50 border rounded-lg p-2 text-[11px] font-medium outline-none resize-none min-h-[50px] transition-all ${!item.satisfied ? 'border-red-300 dark:border-red-800/60 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20'}`}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                         </table>
                                    </div>
                                </div>
                            ))}

                            <div className="space-y-4">
                                <div className="text-sm font-black text-slate-900 dark:text-white border-b-2 border-emerald-500 pb-2">
                                    Collective Checklist
                                </div>
                                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <table className="w-full text-left border-collapse table-fixed">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                <th className="px-4 py-3 w-1/3">Checklist Item</th>
                                                <th className="px-4 py-3 text-center w-36 font-bold text-slate-500 bg-slate-100/30">Compliant (Y/N)</th>
                                                <th className="px-4 py-3">Evidence / Comment</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
                                            {finalCollectiveChecklist.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-bold leading-tight align-top">{item.question}</td>
                                                    <td className="px-4 py-3 text-center align-top">
                                                        <button 
                                                            onClick={() => updateCollectiveChecklist(i, { satisfied: !item.satisfied })}
                                                            className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${item.satisfied ? 'bg-green-100 text-green-700 ring-2 ring-green-500/20' : 'bg-red-100 text-red-700 ring-2 ring-red-500/20'}`}
                                                        >
                                                            {item.satisfied ? 'Y' : 'N'}
                                                        </button>
                                                    </td>
                                                    <td className={`px-4 py-3 space-y-3 align-top transition-all ${!item.satisfied ? 'bg-red-50/25 dark:bg-red-950/5 border-l-4 border-l-red-500' : ''}`}>
                                                        {!item.satisfied && (
                                                            <div className="flex items-center text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">
                                                                <span className="mr-1">⚠️</span> Non-Compliance Justification Required
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Evidence:</div>
                                                            <textarea 
                                                                value={item.evidence || ''}
                                                                onChange={(e) => updateCollectiveChecklist(i, { evidence: e.target.value })}
                                                                placeholder="Enter evidence..."
                                                                className={`w-full bg-slate-50 dark:bg-slate-900/50 border rounded-lg p-2 text-[11px] font-medium outline-none resize-none min-h-[50px] transition-all ${!item.satisfied ? 'border-red-300 dark:border-red-800/60 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20'}`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Comment / Feedback:</div>
                                                            <textarea 
                                                                value={item.comment}
                                                                onChange={(e) => updateCollectiveChecklist(i, { comment: e.target.value })}
                                                                placeholder="Enter comments..."
                                                                className={`w-full bg-slate-50 dark:bg-slate-900/50 border rounded-lg p-2 text-[11px] font-medium outline-none resize-none min-h-[50px] transition-all ${!item.satisfied ? 'border-red-300 dark:border-red-800/60 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20'}`}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 relative">
            {isAnyActionLoading && <WaitingBar />}
            <div className="text-center space-y-4 mb-12">
                <div className="flex items-center justify-center space-x-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800">
                        <IconSparkles className="h-3 w-3 mr-2" />
                        Bylaws Compliance Agent
                    </div>
                    {(courseCode || files.syllabus || files.plo) && (
                        <button 
                            onClick={handleReset}
                            className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center"
                        >
                            <IconTrash className="h-3.5 w-3.5 mr-1" />
                            Reset
                        </button>
                    )}
                </div>
                <h2 className="text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                    OQF Course Compliance <br/> & PLO Mapping
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg max-w-xl mx-auto">
                    Transform your course CDP = Course Delivery Plan into a fully compliant OQF document. Our AI agent maps CLOs to Program Outcomes and performs a strict quality audit.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 space-y-8">
                <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Course Identification</label>
                    <input 
                        type="text" 
                        placeholder="e.g. CSIS2202 Diploma Course Project"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all italic text-lg"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FileUploadCard 
                        label="Course Syllabus / Handbook"
                        description="PDF or Word document containing outcomes and content."
                        file={files.syllabus}
                        savedFilename={savedFilenames.syllabus}
                        onUpload={(f) => handleFileUpload('syllabus', f)}
                        color="indigo"
                    />
                    <FileUploadCard 
                        label="PLO Consolidated File"
                        description="Word document with PLOs for SE, IS, CL, NWSY."
                        file={files.plo}
                        savedFilename={savedFilenames.plo}
                        onUpload={(f) => handleFileUpload('plo', f)}
                        color="emerald"
                    />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <FileUploadCard 
                        label="Blank Course Template (Optional)"
                        description="Upload your standard template Word file for structural reference."
                        file={files.template}
                        savedFilename={savedFilenames.template}
                        onUpload={(f) => handleFileUpload('template', f)}
                        color="amber"
                    />
                </div>

                <div className="pt-6">
                    <button 
                        onClick={handleAnalyze}
                        disabled={isLoading || !files.syllabus || !files.plo || !courseCode}
                        className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-center space-x-2 ${
                            (files.syllabus && files.plo && courseCode) 
                            ? 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-700 hover:shadow-indigo-600/50' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {isLoading ? <><Loader /> <span>Analyzing Files...</span></> : <><span>Generate Compliance Report</span> <IconSparkles className="h-6 w-6 ml-2" /></>}
                    </button>
                    {!courseCode || !files.syllabus || !files.plo ? (
                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
                            Please provide Course Code, Syllabus, and PLO file to proceed
                        </p>
                    ) : null}
                </div>
            </div>

            {error && (
                <div className="mt-8 bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-900/50 flex items-start text-red-700 dark:text-red-400">
                    <IconAlertCircle className="h-6 w-6 mr-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-black uppercase text-xs tracking-widest mb-1">Analysis Error</p>
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

interface FileUploadCardProps {
    label: string;
    description: string;
    file: File | null;
    savedFilename?: string;
    onUpload: (file: File) => void;
    color: 'indigo' | 'emerald' | 'amber';
}

const FileUploadCard: React.FC<FileUploadCardProps> = ({ label, description, file, savedFilename, onUpload, color }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const hasAnyFile = !!file || !!savedFilename;

    return (
        <div 
            onClick={() => inputRef.current?.click()}
            className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group ${
                file ? 'bg-green-50 border-green-200 border-solid' : savedFilename ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
            }`}
        >
            <input 
                ref={inputRef}
                type="file" 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                accept=".pdf,.docx,.doc,.txt"
            />
            
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-6 ${
                file ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : savedFilename ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700'
            }`}>
                {file ? <IconCheckCircle className="h-8 w-8" /> : savedFilename ? <IconCheckCircle className="h-8 w-8 opacity-60" /> : <IconUpload className="h-8 w-8" />}
            </div>
            
            <h4 className={`text-sm font-black uppercase tracking-tight mb-2 ${file ? 'text-green-700' : savedFilename ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100'}`}>
                {file ? file.name : savedFilename ? `${savedFilename} (Re-upload required)` : label}
            </h4>
            <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase tracking-widest">{description}</p>
            
            {file && (
                <div className="mt-3 flex items-center text-[10px] font-black text-green-600 uppercase tracking-widest">
                    <IconFile className="h-3 w-3 mr-1" />
                    {(file.size / 1024).toFixed(1)} KB
                </div>
            )}
            
            {!file && savedFilename && (
                 <div className="mt-3 flex items-center text-[9px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">
                    <IconAlertCircle className="h-3 w-3 mr-1" />
                    Requires re-upload for new analysis
                 </div>
            )}
        </div>
    );
};
