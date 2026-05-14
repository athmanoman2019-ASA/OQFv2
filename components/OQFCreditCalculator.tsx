
import React, { useState, useRef, useEffect } from 'react';
import { calculateOQFCredits } from '../services/geminiService';
import { prepareFileForAI } from '../lib/fileUtils';
import { type OQFCreditReport } from '../types';
import { Loader } from './Loader';
import { WaitingBar } from './WaitingBar';
import { IconUpload, IconCheckCircle, IconXCircle, IconFile, IconInfo, IconClipboardList, IconSparkles, IconAlertCircle, IconFileText, IconTrash } from './Icon';

export const OQFCreditCalculator: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [report, setReport] = useState<OQFCreditReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const isAnyBusy = isLoading || isExporting;

    // Persistence: Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('oqf_calculator_state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state.report) setReport(state.report);
            } catch (e) {
                console.error('Failed to load saved state:', e);
            }
        }
    }, []);

    // Persistence: Save to localStorage on change
    useEffect(() => {
        const state = { report, error };
        localStorage.setItem('oqf_calculator_state', JSON.stringify(state));
    }, [report, error]);

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset and start a new credit calculation?")) {
            setReport(null);
            setError(null);
            localStorage.removeItem('oqf_calculator_state');
        }
    };

    const handleUpdatePartD = (updates: { summary?: any[], defaults?: any }) => {
        if (!report) return;

        let newDefaults = updates.defaults || report.partD.defaults;
        let newSummary = updates.summary || report.partD.summary;

        // Auto-recalculate defaults if semesterLength changed
        if (updates.defaults && updates.defaults.semesterLength !== report.partD.defaults.semesterLength) {
            const oldLen = report.partD.defaults.semesterLength;
            const newLen = updates.defaults.semesterLength;
            const oldFreq = report.partD.defaults.frequency;

            // Typical frequency logic: Semester - 1 for teaching weeks (Standard UTAS Bylaw)
            const suggestedFreq = Math.max(1, newLen - 1);
            
            // Check if current frequency was following the "Typical" rule (oldLen - 1)
            // Or if it was just following the length itself
            // If it was, we auto-update it to the new suggested value (Semester - 1)
            if (oldFreq === Math.max(1, oldLen - 1) || oldFreq === oldLen) {
                newDefaults = { ...newDefaults, frequency: suggestedFreq };

                // Also auto-sync rows that were using the old default frequency (Auto-propagation)
                newSummary = newSummary.map(row => 
                    row.frequency === oldFreq ? { ...row, frequency: suggestedFreq } : row
                );
            }
        }

        // Recalculate row totals
        const processedSummary = newSummary.map(row => ({
            ...row,
            totalHours: Number(row.hoursPerWeek) * Number(row.frequency)
        }));

        // Recalculate overall totals
        const totalNlh = processedSummary.reduce((sum, row) => sum + row.totalHours, 0);
        const creditHoursCalculated = totalNlh / 10;
        const oqfCreditValue = Math.round(creditHoursCalculated);

        setReport({
            ...report,
            partD: {
                ...report.partD,
                defaults: newDefaults,
                summary: processedSummary,
                calculation: {
                    totalNlh,
                    creditHoursCalculated,
                    oqfCreditValue
                }
            }
        });
    };

    const handleAutoSyncFrequencies = () => {
        if (!report) return;
        const updatedSummary = report.partD.summary.map(row => ({
            ...row,
            frequency: report.partD.defaults.frequency
        }));
        handleUpdatePartD({ summary: updatedSummary });
    };

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
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileUpload = async (file: File) => {
        const allowedMimeTypes = [
            'application/pdf', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png'
        ];

        if (!allowedMimeTypes.includes(file.type)) {
            setError("Please upload a PDF, DOCX, Text file, or an Image of the CDP.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setReport(null);

        try {
            const { data, mimeType } = await prepareFileForAI(file);
            const reportData = await calculateOQFCredits(data, mimeType);
            setReport(reportData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred during processing.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportHtml = () => {
        if (!reportRef.current || !report) return;
        setIsExporting(true);

        setTimeout(() => {
            if (reportRef.current) {
                const reportClone = reportRef.current.cloneNode(true) as HTMLElement;
                
                // Remove interactive elements
                const exportButtons = reportClone.querySelectorAll('.export-ignore');
                exportButtons.forEach(el => el.remove());

                const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OQF Compliance Report - ${report.courseInfo.code}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: white; color: #1e293b; padding: 2rem; }
        .report-header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 1.5rem; margin-bottom: 2rem; }
        @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
            .break-inside-avoid { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="report-header">
        <h1 style="font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem;">OQF Compliance & Credit Report</h1>
        <p style="font-size: 1.25rem; font-weight: 600; color: #64748b;">${report.courseInfo.code}: ${report.courseInfo.title}</p>
    </div>
    <div class="report-content">
        ${reportClone.innerHTML}
    </div>
    <footer style="margin-top: 3rem; text-align: center; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
        Generated by OQF AI Expert System - ${new Date().toLocaleDateString()}
    </footer>
</body>
</html>`;

                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `OQF-Compliance-Report-${report.courseInfo.code || 'Untitled'}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            setIsExporting(false);
        }, 300);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <WaitingBar />
                <Loader />
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Analyzing CDP & Calculating Credits</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gemini AI is performing SMART analysis and NLH distribution...</p>
                </div>
            </div>
        );
    }

    if (report) {
        return (
            <div ref={reportRef} className="space-y-8 animate-in fade-in duration-500 pb-12 bg-white dark:bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl relative">
                {isAnyBusy && <WaitingBar />}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">OQF Compliance Report</h2>
                    <div className="flex items-center space-x-3 export-ignore">
                        <button 
                            onClick={handleReset}
                            className="flex items-center px-4 py-2 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all text-sm mr-2"
                        >
                            <IconTrash className="h-4 w-4 mr-2" />
                            Reset All
                        </button>
                        <button 
                             onClick={handleExportHtml}
                             disabled={isExporting}
                             className="flex items-center px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all shadow-sm"
                        >
                             {isExporting ? <><Loader /> Exporting...</> : <><IconFileText className="h-4 w-4 mr-2" /> Export HTML</>}
                        </button>
                     </div>
                 </div>

                {/* Course Info */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center">
                            <IconFile className="h-5 w-5 mr-2" />
                            Course Information
                        </h3>
                        {report.courseInfo.checks.allLosAssessed && (
                            <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">
                                Fully Compliant
                            </span>
                        )}
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Course Title</p>
                                <p className="text-xl font-black text-slate-800 dark:text-slate-100">{report.courseInfo.title}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Course Code</p>
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{report.courseInfo.code}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prerequisite(s)</p>
                                <p className="text-slate-600 dark:text-slate-400">{report.courseInfo.prerequisites || 'None'}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Compliance Checklist</p>
                             <div className="space-y-2">
                                {Object.entries(report.courseInfo.checks).map(([key, value]) => (
                                    <div key={key} className="flex items-center text-sm font-medium">
                                        {value ? <IconCheckCircle className="h-4 w-4 text-green-500 mr-2" /> : <IconXCircle className="h-4 w-4 text-red-500 mr-2" />}
                                        <span className={value ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}?
                                        </span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>

                {/* PART A */}
                <div className="space-y-4">
                    <div className="flex items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold mr-3">A</span>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Review Course Learning Outcomes</h3>
                    </div>
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-4 py-3">CLO</th>
                                    <th className="px-4 py-3 text-center">S</th>
                                    <th className="px-4 py-3 text-center">M</th>
                                    <th className="px-4 py-3 text-center">A</th>
                                    <th className="px-4 py-3 text-center">R</th>
                                    <th className="px-4 py-3 text-center">T</th>
                                    <th className="px-4 py-3">Decision</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {report.partA.smartAnalysis.map((item, i) => (
                                    <tr key={i} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">CLO {i+1}</td>
                                        <td className="px-4 py-3 text-center">{item.s ? 'True' : 'False'}</td>
                                        <td className="px-4 py-3 text-center">{item.m ? 'True' : 'False'}</td>
                                        <td className="px-4 py-3 text-center">{item.a ? 'True' : 'False'}</td>
                                        <td className="px-4 py-3 text-center">{item.r ? 'True' : 'False'}</td>
                                        <td className="px-4 py-3 text-center">{item.t ? 'True' : 'False'}</td>
                                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black uppercase">{item.decision}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mt-6">
                        <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
                             <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-4 py-3">Learning Taxonomy</th>
                                    <th className="px-4 py-3">Characteristic</th>
                                    <th className="px-4 py-3">Cognitive</th>
                                    <th className="px-4 py-3">Affective</th>
                                    <th className="px-4 py-3">Psychomotor</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {report.partA.taxonomies.map((item, i) => (
                                    <tr key={i} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">CLO {i+1}</td>
                                        <td className="px-4 py-3">{item.characteristic}</td>
                                        <td className="px-4 py-3">{item.cognitiveDomain}</td>
                                        <td className="px-4 py-3">{item.affectiveDomain}</td>
                                        <td className="px-4 py-3">{item.psychomotorDomain}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PART B */}
                <div className="space-y-4">
                    <div className="flex items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold mr-3">B</span>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Assessment Criteria & Methods</h3>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl flex items-center text-indigo-700 dark:text-indigo-400 mb-4 border border-indigo-100 dark:border-indigo-900/50">
                        <IconInfo className="h-5 w-5 mr-3 flex-shrink-0" />
                        <div className="text-sm">
                            <span className="font-bold">Verification:</span> {report.partB.verification.allLoHasCriteria ? 'TRUE' : 'FALSE'} - LOs have criteria. {report.partB.verification.allCriteriaLinkToLo ? 'TRUE' : 'FALSE'} - Criteria link to LOs. {report.partB.verification.assessmentMethodTestsIt ? 'TRUE' : 'FALSE'} - Methods test criteria.
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {report.partB.mapping.map((item, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-black text-slate-800 dark:text-slate-100">CLO {i+1}</p>
                                    <div className="flex gap-1">
                                        {item.methods.map((m, mi) => (
                                            <span key={mi} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600">{m}</span>
                                        ))}
                                    </div>
                                </div>
                                <ul className="space-y-2">
                                    {item.criteria.map((c, ci) => (
                                        <li key={ci} className="text-xs text-slate-600 dark:text-slate-400 flex items-start">
                                            <span className="text-indigo-500 font-bold mr-2">AC{i+1}.{ci+1}</span>
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PART C */}
                <div className="space-y-4">
                    <div className="flex items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold mr-3">C</span>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">OQF Level Mapping</h3>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
                             <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-4 py-3">OQF Characteristic</th>
                                    <th className="px-4 py-3">Best-Fit Level</th>
                                    <th className="px-4 py-3">Ranked</th>
                                    <th className="px-4 py-3">Rationale</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {report.partC.mappings.map((item, i) => (
                                    <tr key={i} className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{item.characteristic}</td>
                                        <td className="px-4 py-3 text-center font-black text-indigo-600">Level {item.bestFitLevel}</td>
                                        <td className="px-4 py-3 text-center">{item.rankedOrder}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic">"{item.rationale}"</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-green-50 dark:bg-green-900/20 font-black text-green-700 dark:text-green-400">
                                    <td className="px-4 py-4" colSpan={2}>Overall Proposed OQF Level</td>
                                    <td className="px-4 py-4 text-center text-xl" colSpan={2}>LEVEL {report.partC.overallLevel}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* PART D */}
                <div className="space-y-4">
                    <div className="flex items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold mr-3">D</span>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Calculating Course Credit Value (NLH)</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-4 py-3">NLH Learning Activity Matrix</th>
                                        {report.partA.clos.map((_, i) => (
                                            <th key={i} className="px-2 py-3 text-center">L0{i+1}</th>
                                        ))}
                                        <th className="px-4 py-3 text-right">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {report.partD.nlhMatrix.map((row, ri) => (
                                        <tr key={ri} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{row.activity}</td>
                                            {row.clos.map((val, ci) => (
                                                <td key={ci} className="px-2 py-3 text-center text-slate-500">{val}</td>
                                            ))}
                                            <td className="px-4 py-3 text-right font-black text-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10">{row.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-900 text-white font-black">
                                        <td className="px-4 py-3 uppercase tracking-tighter" colSpan={report.partA.clos.length + 1}>Total Notional Learning Hours</td>
                                        <td className="px-4 py-3 text-right text-lg">{report.partD.calculation.totalNlh}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Final OQF Credit Value</p>
                                <div className="text-6xl font-black text-green-600 mb-2">{report.partD.calculation.oqfCreditValue}</div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Credits</p>
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-left space-y-2">
                                     <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-400">Total NLH</span>
                                        <span className="text-slate-700 dark:text-slate-300">{report.partD.calculation.totalNlh}</span>
                                     </div>
                                     <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-400">Calculated Credits</span>
                                        <span className="text-slate-700 dark:text-slate-300">{report.partD.calculation.creditHoursCalculated.toFixed(2)}</span>
                                     </div>
                                </div>
                            </div>

                            <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl text-white">
                                <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <IconSparkles className="h-4 w-4 mr-2" />
                                        UTAS Bylaws Baseline
                                    </div>
                                    <button 
                                        onClick={handleAutoSyncFrequencies}
                                        className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-[9px] transition-colors"
                                    >
                                        Auto-Sync Frequencies
                                    </button>
                                </h4>
                                <div className="space-y-4 text-sm font-medium">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="opacity-80">Semester Length</span>
                                            <span className="text-[10px] opacity-50 italic">Total weeks in semester</span>
                                        </div>
                                        <input 
                                            type="number"
                                            value={report.partD.defaults.semesterLength}
                                            onChange={(e) => handleUpdatePartD({ defaults: { ...report.partD.defaults, semesterLength: Number(e.target.value) } })}
                                            className="w-16 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-right font-bold focus:outline-none focus:bg-white/20"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center group/field">
                                        <div className="flex flex-col">
                                            <span className="opacity-80">Typical Teaching Weeks</span>
                                            <div className="flex items-center">
                                                <span className="text-[10px] opacity-50 italic">Default freq for activities</span>
                                                {report.partD.defaults.frequency === Math.max(1, report.partD.defaults.semesterLength - 1) && (
                                                    <span className="ml-2 text-[8px] bg-white/20 px-1 rounded font-black tracking-widest animate-pulse">AUTO: S-1</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {report.partD.defaults.frequency !== Math.max(1, report.partD.defaults.semesterLength - 1) && (
                                                <button 
                                                    onClick={() => handleUpdatePartD({ defaults: { ...report.partD.defaults, frequency: Math.max(1, report.partD.defaults.semesterLength - 1) } })}
                                                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                                    title="Calculate from Semester Length"
                                                >
                                                    <IconSparkles className="h-3 w-3" />
                                                </button>
                                            )}
                                            <input 
                                                type="number"
                                                value={report.partD.defaults.frequency}
                                                onChange={(e) => handleUpdatePartD({ defaults: { ...report.partD.defaults, frequency: Number(e.target.value) } })}
                                                className="w-16 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-right font-bold focus:outline-none focus:bg-white/20 transition-all focus:ring-1 focus:ring-white/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs opacity-60">
                                        <span>NLH/Credit/Week</span>
                                        <span>{report.partD.defaults.nlhPerCreditPerWeek} hrs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mt-6">
                         <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
                             <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-4 py-3">Summary Learning Activity</th>
                                    <th className="px-4 py-3 text-center">Hrs/Week</th>
                                    <th className="px-4 py-3 text-center">Freq (Weeks)</th>
                                    <th className="px-4 py-3 text-right">Total Hrs/Semester</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {report.partD.summary.map((row, i) => (
                                    <tr key={i} className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/10">
                                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{row.activity}</td>
                                        <td className="px-4 py-3 text-center">
                                            <input 
                                                type="number"
                                                value={row.hoursPerWeek}
                                                step="0.5"
                                                onChange={(e) => {
                                                    const newSummary = [...report.partD.summary];
                                                    newSummary[i] = { ...newSummary[i], hoursPerWeek: Number(e.target.value) };
                                                    handleUpdatePartD({ summary: newSummary });
                                                }}
                                                className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-center font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="relative inline-block">
                                                <input 
                                                    type="number"
                                                    value={row.frequency}
                                                    onChange={(e) => {
                                                        const newSummary = [...report.partD.summary];
                                                        newSummary[i] = { ...newSummary[i], frequency: Number(e.target.value) };
                                                        handleUpdatePartD({ summary: newSummary });
                                                    }}
                                                    className={`w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-center font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none ${row.frequency === report.partD.defaults.frequency ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100'}`}
                                                />
                                                {row.frequency === report.partD.defaults.frequency && (
                                                    <div className="absolute -top-2 -right-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-[7px] font-black px-1 rounded shadow-sm border border-indigo-200 dark:border-indigo-800 pointer-events-none">
                                                        AUTO
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">{row.totalHours.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 py-10 relative">
            {isAnyBusy && <WaitingBar />}
            <div className="text-center space-y-4">
                <div className="flex flex-col items-center space-y-2">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-200 dark:border-green-800">
                        <IconSparkles className="h-3 w-3 mr-2" />
                        OQF Compliance Expert
                    </div>
                    {error && (
                        <button 
                            onClick={handleReset}
                            className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 flex items-center transition-all"
                        >
                            <IconTrash className="h-3 w-3 mr-1" />
                            Reset All Data
                        </button>
                    )}
                </div>
                <h2 className="text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                    OQF Credit & NLH <br/> Calculation Workbook
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg max-w-xl mx-auto">
                    Upload your Course Delivery Plan (CDP) to automatically generate Part A, B, C, and D of the OQF Course Listing Form based on UTAS Bylaws.
                </p>
            </div>

            <div 
                onDragEnter={handleDrag} 
                onDragLeave={handleDrag} 
                onDragOver={handleDrag} 
                onDrop={handleDrop}
                className={`relative bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 p-12 rounded-3xl shadow-2xl border-2 border-dashed transition-all duration-300 group ${dragActive ? 'border-indigo-500 bg-indigo-100/50 scale-[1.01]' : 'border-slate-200 dark:border-slate-700'}`}
            >
                <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                    <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-700 text-indigo-500 shadow-xl flex items-center justify-center mb-8 transform group-hover:rotate-6 transition-transform">
                        <IconUpload className="h-10 w-10" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-4">Upload Course Delivery Plan</h3>
                    <p className="text-slate-600 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                        Drag and drop your CDP file here (PDF, Word, or Image). <br/>
                        Gemini AI will handle the taxnomies, level mapping, and credit calculations.
                    </p>

                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        accept=".pdf,.docx,.txt,image/*"
                    />
                    
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/40 transition-all active:scale-95"
                    >
                        Select Document
                    </button>
                    
                    <div className="mt-8 flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center"><IconCheckCircle className="h-3 w-3 mr-1 text-green-500" /> SMART Analysis</span>
                        <span className="flex items-center"><IconCheckCircle className="h-3 w-3 mr-1 text-green-500" /> Level Mapping</span>
                        <span className="flex items-center"><IconCheckCircle className="h-3 w-3 mr-1 text-green-500" /> NLH Calculation</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-900/50 flex items-start text-red-700 dark:text-red-400">
                    <IconAlertCircle className="h-6 w-6 mr-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-black uppercase text-xs tracking-widest mb-1">Calculation Error</p>
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
};
