
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { type EvaluationReport, type CharacteristicAnalysis, type KnowledgeBreakdown, type SkillsBreakdown, type AutonomyBreakdown, type CommunicationBreakdown, type EmployabilityBreakdown, type LearningToLearnBreakdown, type EvaluationResponse, type AutonomyDetail } from '../types';
import { IconCheckCircle, IconXCircle, IconAlertCircle, IconInfo, IconKnowledge, IconSkills, IconCommunication, IconAutonomy, IconEmployability, IconLearning, IconStructure, IconSuggestion, IconClipboardList, IconFileText, IconBook, IconDownload, IconSave, IconChevronDown, IconChevronUp, IconSparkles, IconStar } from './Icon';
import { Loader } from './Loader';
import { reevaluateSingleOutcome } from '../services/geminiService';

interface EvaluationResultProps {
  report: EvaluationReport;
  courseTitle: string;
  courseCode: string;
  level: string;
  originalObjectives: string;
  courseDescription: string;
  originalOutcomes: string[];
  onReset: () => void;
  onAdoptTitle?: (newTitle: string) => void;
  onAdoptObjectives?: (newObjectives: string) => void;
}

const getAlignmentIcon = (alignment: CharacteristicAnalysis['alignment'] | EvaluationResponse['overall_assessment']['alignment']) => {
  switch (alignment) {
    case 'Good':
    case 'Strongly Aligns':
      return <IconCheckCircle className="h-6 w-6 text-green-500" />;
    case 'Fair':
    case 'Partially Aligns':
      return <IconAlertCircle className="h-6 w-6 text-amber-500" />;
    case 'Poor':
    case 'Does Not Align':
      return <IconXCircle className="h-6 w-6 text-red-500" />;
    default:
      return <IconInfo className="h-6 w-6 text-slate-500" />;
  }
};

const getAlignmentColor = (alignment: CharacteristicAnalysis['alignment'] | EvaluationResponse['overall_assessment']['alignment']) => {
    switch (alignment) {
        case 'Good':
        case 'Strongly Aligns':
            return 'border-green-500/50';
        case 'Fair':
        case 'Partially Aligns':
            return 'border-amber-500/50';
        case 'Poor':
        case 'Does Not Align':
            return 'border-red-500/50';
        default:
            return 'border-slate-400/50';
    }
};

const getAlignmentBgColor = (alignment: CharacteristicAnalysis['alignment']) => {
  switch (alignment) {
    case 'Good':
      return 'bg-green-50 dark:bg-green-900/30';
    case 'Fair':
      return 'bg-amber-50 dark:bg-amber-900/30';
    case 'Poor':
      return 'bg-red-50 dark:bg-red-900/30';
    default:
      return 'bg-white dark:bg-slate-800';
  }
};

const getCharacteristicIcon = (characteristic: string) => {
    const className = "h-7 w-7 text-green-600 dark:text-green-500";
    switch (characteristic) {
        case 'Knowledge': return <IconKnowledge className={className} />;
        case 'Skills': return <IconSkills className={className} />;
        case 'Communication, Numeracy, and ICT Skills': return <IconCommunication className={className} />;
        case 'Autonomy and Responsibility': return <IconAutonomy className={className} />;
        case 'Employability and Values': return <IconEmployability className={className} />;
        case 'Learning to Learn': return <IconLearning className={className} />;
        default: return <IconInfo className={className} />;
    }
};

const KnowledgeBreakdownItem: React.FC<{ title: string; feedback: string; suggestion: string; focusNote?: React.ReactNode }> = ({ title, feedback, suggestion, focusNote }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 break-inside-avoid">
        <strong className="block text-slate-700 dark:text-slate-300 mb-1">{title}</strong>
        <p className="text-slate-600 dark:text-slate-400">{feedback}</p>
        {focusNote && (
           <div className="mt-2 p-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {focusNote}
          </div>
        )}
        {suggestion && suggestion.toLowerCase() !== 'none' && (
            <p className="text-sm text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-900/30 p-2 rounded-md mt-2">
                <strong className="font-semibold">Suggestion:</strong> {suggestion}
            </p>
        )}
    </div>
);

const KnowledgeBreakdownDisplay: React.FC<{ breakdown: KnowledgeBreakdown; level: string }> = ({ breakdown, level }) => {
  const depthAndBreadthFocus = level === '6' ? (
    <>
      <strong className="font-semibold text-slate-700 dark:text-slate-300">OQF Level 6 Focus: Significant Knowledge & Specialisation</strong>
      <p className="text-xs mt-1">
        Level 6 demands a balance between broad understanding and deep, specialized expertise. An effective outcome must prompt learners to demonstrate both.
      </p>
      <div className="mt-2 space-y-2">
        <div>
          <h6 className="font-semibold text-slate-600 dark:text-slate-400">1. Significant Knowledge (Breadth)</h6>
          <p className="text-xs text-slate-500 dark:text-slate-500">This refers to a comprehensive understanding of the main principles, concepts, and information bodies that define the field of study.</p>
        </div>
        <div>
          <h6 className="font-semibold text-slate-600 dark:text-slate-400">2. Areas of Specialisation (Depth)</h6>
          <p className="text-xs text-slate-500 dark:text-slate-500">This requires learners to engage with specific, advanced, or niche topics within the broader field, demonstrating a higher level of conceptual and practical application.</p>
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/50">
        <h6 className="font-semibold text-slate-600 dark:text-slate-400">Actionable Example:</h6>
        <ul className="text-xs list-disc list-inside space-y-1 mt-1">
          <li>
            <strong className="text-amber-600 dark:text-amber-400">General (Lacks Depth):</strong> "Analyze network security principles."
          </li>
          <li>
            <strong className="text-green-600 dark:text-green-400">Specific (Shows Specialisation):</strong> "Critically evaluate enterprise-grade firewall configurations to identify and mitigate advanced persistent threats."
          </li>
        </ul>
      </div>
    </>
  ) : null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 text-sm">
      <h5 className="font-semibold text-slate-700 dark:text-slate-300">Knowledge Breakdown:</h5>
      <div className="space-y-3">
        <KnowledgeBreakdownItem title="Factual" feedback={breakdown.factual.feedback} suggestion={breakdown.factual.suggestion} />
        <KnowledgeBreakdownItem title="Conceptual" feedback={breakdown.conceptual.feedback} suggestion={breakdown.conceptual.suggestion} />
        <KnowledgeBreakdownItem title="Theoretical" feedback={breakdown.theoretical.feedback} suggestion={breakdown.theoretical.suggestion} />
        <KnowledgeBreakdownItem 
          title="Depth & Breadth" 
          feedback={breakdown.depth_and_breadth.feedback} 
          suggestion={breakdown.depth_and_breadth.suggestion} 
          focusNote={depthAndBreadthFocus} 
        />
        <KnowledgeBreakdownItem title="Legal & Regulatory" feedback={breakdown.legal_and_regulatory.feedback} suggestion={breakdown.legal_and_regulatory.suggestion} />
      </div>
    </div>
  );
};


const BreakdownItem: React.FC<{ title: string; content: string; descriptor: string; focusNote?: React.ReactNode }> = ({ title, content, descriptor, focusNote }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 break-inside-avoid">
        <strong className="block text-slate-700 dark:text-slate-300 mb-1">{title}</strong>
        <p className="text-slate-600 dark:text-slate-400">{content}</p>
        <p className="mt-2 italic text-slate-500 dark:text-slate-500 text-xs">
          OQF Descriptor: "{descriptor}"
        </p>
        {focusNote && (
           <div className="mt-2 p-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {focusNote}
          </div>
        )}
    </div>
);

const SkillsBreakdownDisplay: React.FC<{ breakdown: SkillsBreakdown; level: string }> = ({ breakdown, level }) => (
  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 text-sm">
    <h5 className="font-semibold text-slate-700 dark:text-slate-300">Skills Breakdown:</h5>
    <div className="space-y-3">
        <BreakdownItem 
            title="Cognitive & Technical Skills"
            content={breakdown.cognitive_and_technical}
            descriptor="Use a significant range of cognitive and technical skills."
            focusNote={level === '6' ? (
              <>
                <strong className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">OQF Level 6 Focus: Action Verbs are Critical</strong>
                <p className="mb-2 text-slate-600 dark:text-slate-400 text-xs">The choice of action verb determines if an outcome is measurable and at the correct cognitive level. Vague verbs lead to ambiguity in assessment.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded">
                        <p className="font-bold text-green-800 dark:text-green-300">Strong Verbs (Use):</p>
                        <ul className="list-disc list-inside text-green-700 dark:text-green-400">
                            <li>Analyze</li>
                            <li>Synthesize</li>
                            <li>Critically Evaluate</li>
                            <li>Design</li>
                            <li>Formulate</li>
                        </ul>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded">
                        <p className="font-bold text-red-800 dark:text-red-300">Weak Verbs (Avoid):</p>
                        <ul className="list-disc list-inside text-red-700 dark:text-red-400">
                            <li>Understand</li>
                            <li>Know</li>
                            <li>Learn about</li>
                            <li>Appreciate</li>
                            <li>Be aware of</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                    <h6 className="font-semibold text-slate-600 dark:text-slate-400 text-xs">Actionable Example:</h6>
                    <ul className="text-xs list-disc list-inside space-y-1 mt-1">
                        <li>
                            <strong className="text-red-600 dark:text-red-400">Weak Verb:</strong> "Understand the principles of network security."
                        </li>
                        <li>
                            <strong className="text-green-600 dark:text-green-400">Strong Verb:</strong> "Critique enterprise-grade network security protocols to identify vulnerabilities."
                        </li>
                    </ul>
                </div>
              </>
            ) : null}
        />
        <BreakdownItem 
            title="Problem Solving"
            content={breakdown.problem_solving}
            descriptor="Identify and apply main methodologies and appropriate tools to develop solutions for complex problems."
        />
        <BreakdownItem 
            title="Response Formulation"
            content={breakdown.response_formulation}
            descriptor="Formulate responses to well-defined and abstract problems."
            focusNote={level === '6' ? (
              <>
                 <strong className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">OQF Level 6 Focus: From Solving to Defining Problems</strong>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                    Level 6 elevates problem-solving from executing pre-defined tasks to tackling ambiguous, 'abstract' challenges where the learner must first define the problem's scope, constraints, and success criteria before developing a solution.
                </p>
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                    <h6 className="font-semibold text-slate-600 dark:text-slate-400 text-xs mb-1">Strategies for Assessing Abstract Problem Formulation:</h6>
                    <ul className="text-xs list-disc list-inside space-y-1 text-slate-500 dark:text-slate-500">
                        <li><strong>Use verbs of creation & strategy:</strong> Employ verbs like 'devise', 'propose', 'formulate a policy for', 'develop a framework to address...', or 'create a strategic response to...'.</li>
                        <li><strong>Provide open-ended scenarios:</strong> Present complex situations with incomplete information, requiring students to identify key issues and formulate a plan.</li>
                        <li><strong>Require justification of the approach:</strong> The assessment should focus not just on the solution, but on the student's rationale for defining the problem and choosing their methodology.</li>
                    </ul>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                    <h6 className="font-semibold text-slate-600 dark:text-slate-400 text-xs">Actionable Example:</h6>
                    <ul className="text-xs list-disc list-inside space-y-1 mt-1">
                        <li>
                            <strong className="text-amber-600 dark:text-amber-400">Well-Defined Problem:</strong> "Troubleshoot a given network configuration to resolve connectivity issues."
                        </li>
                        <li>
                            <strong className="text-green-600 dark:text-green-400">Abstract Problem:</strong> "Devise a scalable network infrastructure plan for a new company branch, considering budget constraints, future growth, and undefined security threats."
                        </li>
                    </ul>
                </div>
              </>
            ) : null}
        />
    </div>
  </div>
);

const AutonomyBreakdownItem: React.FC<{ title: string; detail: AutonomyDetail; descriptor: string; }> = ({ title, detail, descriptor }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3 break-inside-avoid">
        <div>
            <strong className="block text-slate-700 dark:text-slate-300">{title}</strong>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{detail.feedback}</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-md border border-green-200 dark:border-green-700">
            <p className="text-xs font-semibold uppercase text-green-700 dark:text-green-300 tracking-wider mb-1">Illustrative Task</p>
            <p className="text-sm text-green-800 dark:text-green-300">
                {detail.scenario}
            </p>
        </div>

        <p className="pt-2 border-t border-slate-200 dark:border-slate-700/50 italic text-slate-500 dark:text-slate-500 text-xs">
          OQF Descriptor: "{descriptor}"
        </p>
    </div>
);

const AutonomyBreakdownDisplay: React.FC<{ breakdown: AutonomyBreakdown }> = ({ breakdown }) => (
  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 text-sm">
    <h5 className="font-semibold text-slate-700 dark:text-slate-300">Autonomy & Responsibility Breakdown:</h5>
    <div className="space-y-3">
        <AutonomyBreakdownItem
            title="Independent Task Management"
            detail={breakdown.independent_task_management}
            descriptor="Undertake and manage tasks independently."
        />
        <AutonomyBreakdownItem
            title="Team Leadership & Collaboration"
            detail={breakdown.team_leadership_and_collaboration}
            descriptor="Work individually or collaborate within teams to take the lead in completing tasks."
        />
        <AutonomyBreakdownItem
            title="Professional Role & Accountability"
            detail={breakdown.professional_role_and_accountability}
            descriptor="Fulfil professional role tasks, adhering to professional regulations or standards and assume some accountability for the management of tasks and their output."
        />
    </div>
  </div>
);

const CommunicationBreakdownDisplay: React.FC<{ breakdown: CommunicationBreakdown }> = ({ breakdown }) => (
  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 text-sm">
    <h5 className="font-semibold text-slate-700 dark:text-slate-300">Communication, Numeracy, & ICT Breakdown:</h5>
    <ul className="list-disc list-inside pl-2 space-y-1 text-slate-600 dark:text-slate-400">
      <li><strong className="text-slate-700 dark:text-slate-300">Communication Clarity:</strong> {breakdown.communication_clarity}</li>
      <li><strong className="text-slate-700 dark:text-slate-300">Numeracy & Problem Solving:</strong> {breakdown.numeracy_and_problem_solving}</li>
      <li><strong className="text-slate-700 dark:text-slate-300">ICT Application:</strong> {breakdown.ict_application}</li>
    </ul>
  </div>
);

const EmployabilityBreakdownDisplay: React.FC<{ breakdown: EmployabilityBreakdown; level: string }> = ({ breakdown, level }) => {
  const timeManagementFocus = level === '6' ? (
    <>
      <strong className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">OQF Level 6 Focus: Strategic Development</strong>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        This goes beyond personal time management. At Level 6, it involves the strategic planning of professional growth for oneself and others, integrating learning and development into project timelines and team management.
      </p>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
          <h6 className="font-semibold text-slate-600 dark:text-slate-400 text-xs">Actionable Example:</h6>
          <p className="text-xs mt-1 text-green-600 dark:text-green-400">
              "Develop a six-month professional development plan for a junior team member to enhance their project-specific skills, including milestones and resource allocation."
          </p>
      </div>
    </>
  ) : null;

  const ethicsFocus = level === '6' ? (
    <>
      <strong className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">OQF Level 6 Focus: From Adherence to Advocacy</strong>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        The key phrase is "introduce these values to others." This requires learners to not only apply ethical standards but to also articulate, justify, and champion them, demonstrating leadership in professional conduct.
      </p>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
          <h6 className="font-semibold text-slate-600 dark:text-slate-400 text-xs">Actionable Example:</h6>
          <p className="text-xs mt-1 text-green-600 dark:text-green-400">
              "Formulate an ethical code of conduct for a new project team, justifying each principle with reference to industry standards and potential workplace dilemmas."
          </p>
      </div>
    </>
  ) : null;

  const entrepreneurialFocus = level === '6' ? (
    <>
      <strong className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">OQF Level 6 Focus: Substantial Application of Skills</strong>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        "Substantial" implies moving from ideation to application. This involves identifying opportunities, assessing risks, and developing innovative ideas into viable proposals or projects within a vocational context.
      </p>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
          <h6 className="font-semibold text-slate-600 dark:text-slate-400 text-xs">Actionable Example:</h6>
          <p className="text-xs mt-1 text-green-600 dark:text-green-400">
              "Devise an innovative workflow improvement for a common workplace process, presenting it as a business case that includes a cost-benefit analysis and implementation strategy."
          </p>
      </div>
    </>
  ) : null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 text-sm">
      <h5 className="font-semibold text-slate-700 dark:text-slate-300">Employability & Values Breakdown:</h5>
      <div className="space-y-3">
        <BreakdownItem 
          title="Time Management & Development"
          content={breakdown.time_management_and_development}
          descriptor="Manage time appropriately to allow for personal development and/or the development of others."
          focusNote={timeManagementFocus}
        />
        <BreakdownItem 
          title="Professional Ethics & Values"
          content={breakdown.professional_ethics_and_values}
          descriptor="Use their significant understanding of the values and ethics associated with their study, occupation or profession and introduce these values to others."
          focusNote={ethicsFocus}
        />
        <BreakdownItem 
          title="Entrepreneurial & Creative Skills"
          content={breakdown.entrepreneurial_and_creative_skills}
          descriptor="Use substantial entrepreneurial and/or creative skills."
          focusNote={entrepreneurialFocus}
        />
      </div>
    </div>
  );
};


const LearningToLearnBreakdownDisplay: React.FC<{ breakdown: LearningToLearnBreakdown }> = ({ breakdown }) => (
  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 text-sm">
    <h5 className="font-semibold text-slate-700 dark:text-slate-300">Learning to Learn Breakdown:</h5>
    <div className="space-y-3">
        <BreakdownItem 
            title="Needs Identification"
            content={breakdown.needs_identification}
            descriptor="Identify their own learning needs."
        />
        <BreakdownItem 
            title="Response Initiation"
            content={breakdown.response_initiation}
            descriptor="Initiate the required response to meet their own learning needs."
        />
    </div>
  </div>
);

const CharacteristicCard: React.FC<{ analysis: CharacteristicAnalysis; isExpanded: boolean; onToggle: () => void; level: string; }> = ({ analysis, isExpanded, onToggle, level }) => {
    return (
        <div className={`rounded-lg border-l-4 ${getAlignmentColor(analysis.alignment)} ${getAlignmentBgColor(analysis.alignment)} shadow-sm break-inside-avoid print:break-inside-avoid characteristic-card`}>
            <button
              onClick={onToggle}
              className="w-full flex items-center justify-between p-4 text-left"
              aria-expanded={isExpanded}
            >
                <div className="flex items-center">
                    {getCharacteristicIcon(analysis.characteristic)}
                    <h4 className="ml-3 font-semibold text-md text-slate-800 dark:text-slate-200">{analysis.characteristic}</h4>
                </div>
                <div className="flex items-center space-x-2">
                    {getAlignmentIcon(analysis.alignment)}
                    {isExpanded ? <IconChevronUp className="h-5 w-5 text-slate-500" /> : <IconChevronDown className="h-5 w-5 text-slate-500" />}
                </div>
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2"><strong className="text-slate-700 dark:text-slate-300">Feedback:</strong> {analysis.feedback}</p>
                {analysis.characteristic === 'Knowledge' && analysis.knowledge_breakdown && (
                  <KnowledgeBreakdownDisplay breakdown={analysis.knowledge_breakdown} level={level} />
                )}
                {analysis.characteristic === 'Skills' && analysis.skills_breakdown && (
                  <SkillsBreakdownDisplay breakdown={analysis.skills_breakdown} level={level} />
                )}
                {analysis.characteristic === 'Autonomy and Responsibility' && analysis.autonomy_breakdown && (
                  <AutonomyBreakdownDisplay breakdown={analysis.autonomy_breakdown} />
                )}
                {analysis.characteristic === 'Communication, Numeracy, and ICT Skills' && analysis.communication_breakdown && (
                  <CommunicationBreakdownDisplay breakdown={analysis.communication_breakdown} />
                )}
                {analysis.characteristic === 'Employability and Values' && analysis.employability_breakdown && (
                  <EmployabilityBreakdownDisplay breakdown={analysis.employability_breakdown} level={level} />
                )}
                {analysis.characteristic === 'Learning to Learn' && analysis.learning_to_learn_breakdown && (
                  <LearningToLearnBreakdownDisplay breakdown={analysis.learning_to_learn_breakdown} />
                )}
                {analysis.suggestion && <p className="text-sm text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-900/30 p-2 rounded-md mt-3"><strong className="font-semibold">Suggestion:</strong> {analysis.suggestion}</p>}
              </div>
            )}
        </div>
    );
};


const LearningOutcomeEvaluationDisplay: React.FC<{ evaluation: EvaluationResponse; outcomeIndex: number; expandedCards: Record<string, boolean>; onToggleCard: (key: string) => void; level: string; }> = ({ evaluation, outcomeIndex, expandedCards, onToggleCard, level }) => {
  const { overall_assessment, structure_analysis, characteristic_analysis, suggestions_for_improvement } = evaluation;
  return (
    <div className="space-y-6">
       <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl border-t-4 shadow-lg ${getAlignmentColor(overall_assessment.alignment)} break-inside-avoid evaluation-card`}>
        <div className="flex items-center mb-3">
          {getAlignmentIcon(overall_assessment.alignment)}
          <h3 className="ml-3 text-xl font-bold text-slate-800 dark:text-slate-100">Overall OQF Alignment: {overall_assessment.alignment}</h3>
        </div>
        <div className="text-slate-600 dark:text-slate-300 markdown-body prose prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown>{overall_assessment.summary}</ReactMarkdown>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 break-inside-avoid structure-card">
          <div className="flex items-center mb-3">
            <IconStructure className="h-6 w-6 text-green-600" />
            <h3 className="ml-3 text-xl font-bold text-slate-800 dark:text-slate-100">Structure Analysis</h3>
             <span className="ml-auto">{structure_analysis.is_valid ? <IconCheckCircle className="h-6 w-6 text-green-500" /> : <IconXCircle className="h-6 w-6 text-red-500" />}</span>
          </div>
          <div className="text-sm space-y-2 text-slate-600 dark:text-slate-300">
            <p><strong className="font-semibold text-slate-700 dark:text-slate-200">Verb:</strong> <span className="font-mono bg-slate-100 dark:bg-slate-700 p-1 rounded text-sm">{structure_analysis.verb}</span></p>
            <p><strong className="font-semibold text-slate-700 dark:text-slate-200">Object:</strong> <span className="font-mono bg-slate-100 dark:bg-slate-700 p-1 rounded text-sm">{structure_analysis.object}</span></p>
            <p><strong className="font-semibold text-slate-700 dark:text-slate-200">Phrase:</strong> <span className="font-mono bg-slate-100 dark:bg-slate-700 p-1 rounded text-sm">{structure_analysis.phrase}</span></p>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{structure_analysis.feedback}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 break-inside-avoid suggestion-card">
          <div className="flex items-center mb-3">
            <IconSuggestion className="h-6 w-6 text-green-600" />
            <h3 className="ml-3 text-xl font-bold text-slate-800 dark:text-slate-100">Improvement Suggestions</h3>
          </div>
          <ul className="space-y-2 list-disc list-inside text-slate-600 dark:text-slate-300 text-sm">
            {suggestions_for_improvement.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div>
        <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">Detailed OQF Characteristics Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characteristic_analysis.map((analysis) => {
            const key = `${outcomeIndex}-${analysis.characteristic}`;
            return (
                <CharacteristicCard 
                    key={key} 
                    analysis={analysis} 
                    isExpanded={!!expandedCards[key]}
                    onToggle={() => onToggleCard(key)}
                    level={level}
                />
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ComparisonCardProps {
  title: string;
  icon: React.ReactElement;
  asIs: React.ReactNode;
  toBe: React.ReactNode;
  justification: string;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({ title, icon, asIs, toBe, justification }) => (
  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 break-inside-avoid print:break-inside-avoid comparison-card">
    <div className="flex items-center mb-4">
      {icon}
      <h4 className="ml-3 text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h4>
    </div>
    <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
      <div>
        <h5 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">As-Is (Coordinator's Input)</h5>
        <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700 min-h-[6rem]">
          {asIs}
        </div>
      </div>
      <div>
        <h5 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">To-Be (AI Recommendation)</h5>
        <div className="text-sm text-slate-700 dark:text-slate-200 bg-green-50 dark:bg-green-900/30 p-3 rounded-md border border-green-200 dark:border-green-700 min-h-[6rem]">
          {toBe}
        </div>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        <strong className="text-slate-700 dark:text-slate-300">Justification:</strong> {justification}
      </p>
    </div>
  </div>
);

const AlignmentBadge: React.FC<{ alignment: CharacteristicAnalysis['alignment'] }> = ({ alignment }) => {
  const baseClasses = 'px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block';
  let colorClasses = '';

  switch (alignment) {
    case 'Good':
      colorClasses = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      break;
    case 'Fair':
      colorClasses = 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      break;
    case 'Poor':
      colorClasses = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      break;
    default:
      colorClasses = 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
      break;
  }

  return <span className={`${baseClasses} ${colorClasses}`}>{alignment}</span>;
};

const StarRating = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-24">{label}</span>
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`${star <= value ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'} hover:text-amber-500 focus:outline-none transition-colors p-1`}
        >
            <IconStar className="h-6 w-6" filled={star <= value} />
        </button>
      ))}
    </div>
  </div>
);


export const EvaluationResult: React.FC<EvaluationResultProps> = ({ 
  report, 
  courseTitle, 
  courseCode, 
  level, 
  originalObjectives, 
  courseDescription,
  originalOutcomes,
  onReset,
  onAdoptTitle,
  onAdoptObjectives
}) => {
  const { suggested_course_title, refined_objectives, final_summary } = report;
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingJson, setIsSavingJson] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(false);

  const [evaluations, setEvaluations] = useState<EvaluationResponse[]>([]);
  const [isReevaluating, setIsReevaluating] = useState<Record<number, boolean>>({});
  const [reevaluationError, setReevaluationError] = useState<Record<number, string | null>>({});

  const [feedback, setFeedback] = useState({ usefulness: 0, accuracy: 0, comment: '' });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    setEvaluations(report.learning_outcome_evaluation);
  }, [report]);

  const handleAsIsOutcomeChange = (index: number, newText: string) => {
    const newEvaluations = [...evaluations];
    newEvaluations[index] = {
      ...newEvaluations[index],
      original_learning_outcome: newText
    };
    setEvaluations(newEvaluations);
  };

  const handleReevaluate = async (index: number) => {
    setIsReevaluating(prev => ({ ...prev, [index]: true }));
    setReevaluationError(prev => ({ ...prev, [index]: null }));

    const outcomeToReevaluate = evaluations[index].original_learning_outcome;

    try {
      const response = await reevaluateSingleOutcome(outcomeToReevaluate, level, {
        title: courseTitle,
        code: courseCode,
        objectives: originalObjectives,
        description: courseDescription || ''
      });
      const newEvaluations = [...evaluations];
      newEvaluations[index] = response;
      setEvaluations(newEvaluations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setReevaluationError(prev => ({ ...prev, [index]: errorMessage }));
    } finally {
      setIsReevaluating(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleToggleCard = (key: string) => {
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAll = () => {
    const nextState = !allExpanded;
    const newExpandedCards: Record<string, boolean> = {};
    
    if (nextState) {
      evaluations.forEach((evaluation, outcomeIndex) => {
        evaluation.characteristic_analysis.forEach((analysis) => {
          const key = `${outcomeIndex}-${analysis.characteristic}`;
          newExpandedCards[key] = true;
        });
      });
    }
    
    setExpandedCards(newExpandedCards);
    setAllExpanded(nextState);
  };

  const handleFeedbackSubmit = () => {
      // Simulate API submission
      console.log('Feedback submitted:', feedback);
      // Here you would typically send data to your backend
      setFeedbackSubmitted(true);
  };

  const handleSaveJson = () => {
    setIsSavingJson(true);
    try {
      const fullReportData = {
        courseDetails: {
          title: courseTitle,
          code: courseCode,
          level: level,
          originalObjectives: originalObjectives,
          originalOutcomes: originalOutcomes
        },
        evaluationReport: { ...report, learning_outcome_evaluation: evaluations }
      };

      const jsonString = JSON.stringify(fullReportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `OQF-Report-Data-${courseCode || 'Untitled'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to save JSON report:", error);
      alert("Sorry, there was an error saving the report data.");
    } finally {
      setIsSavingJson(false);
    }
  };

  const handleExportHtml = () => {
    setIsExporting(true);
    
    // Expand all before cloning to capture full content
    if (!allExpanded) {
        handleToggleAll();
    }

    // Small delay to allow state update to render
    setTimeout(() => {
        if (reportRef.current) {
            const reportClone = reportRef.current.cloneNode(true) as HTMLElement;
            
            // Cleanup: remove actions, buttons, and no-print elements
            const noPrintElements = reportClone.querySelectorAll('.no-print, #report-actions, button');
            noPrintElements.forEach(el => el.remove());

            // Remove internal styles that hide the body (specific to the app view)
            const styleTags = reportClone.querySelectorAll('style');
            styleTags.forEach(style => style.remove());

            // Convert interactive textareas to static text blocks for printing
            const originalTextareas = reportRef.current?.querySelectorAll('textarea') || [];
            const clonedTextareas = reportClone.querySelectorAll('textarea');
            originalTextareas.forEach((ta, i) => {
                if (clonedTextareas[i]) {
                     const p = document.createElement('div');
                     p.className = "text-content-replacement";
                     // Preserve whitespace
                     p.textContent = ta.value; 
                     clonedTextareas[i].replaceWith(p);
                }
            });

            // Embed print-optimized CSS directly into the HTML file
            const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Evaluation Report - ${courseCode}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body { 
            background-color: white; 
            color: #1e293b; 
            font-family: 'Inter', sans-serif;
            line-height: 1.5;
            padding: 2rem;
        }

        .report-container { 
            max-width: 1000px; 
            margin: 0 auto; 
            padding: 1rem;
            background-color: white;
        }

        /* Print Optimization */
        @media print {
            body { 
                padding: 0;
                margin: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            .report-container {
                padding: 0;
                max-width: none;
                box-shadow: none;
                border: none;
                margin: 0;
            }

            .break-inside-avoid {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }

            button, .no-print { 
                display: none !important; 
            }
        }

        .text-content-replacement {
            display: block;
            white-space: pre-wrap;
            border: 1px solid #e2e8f0;
            padding: 1rem;
            border-radius: 0.5rem;
            background-color: #f8fafc;
            margin-top: 0.5rem;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <h1 style="font-size: 2.25rem; font-weight: 900; margin-bottom: 2rem; border-bottom: 4px solid #10b981; padding-bottom: 1rem;">Course Evaluation Report</h1>
        ${reportClone.innerHTML}
    </div>
    <footer style="margin-top: 4rem; text-align: center; color: #94a3b8; font-size: 0.875rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
        Generated by OQF AI Auditor - ${new Date().toLocaleDateString()}
    </footer>
</body>
</html>`;

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `OQF-Evaluation-${courseCode || 'Report'}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        setIsExporting(false);
    }, 300);
  };


  return (
    <div ref={reportRef} id="evaluation-report" className="space-y-10 animate-fade-in bg-slate-50 dark:bg-slate-950 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 relative">
      <style>{`
        @media print {
            body * {
                visibility: hidden;
            }
            #evaluation-report, #evaluation-report * {
                visibility: visible;
            }
            #evaluation-report {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
                background-color: white !important;
                color: black !important;
                border: none;
                box-shadow: none;
            }
            #report-actions, button, .no-print {
                display: none !important;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .break-inside-avoid {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
      `}</style>
      
      <header className="relative text-center border-b border-slate-200 dark:border-slate-700 pb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">Evaluation & Comparison Report</h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 mt-1">{courseCode}: {courseTitle}</p>
        <p className="text-md text-slate-500 dark:text-slate-400">OQF Level {level}</p>
        <div id="report-actions" className="absolute top-0 right-0 flex items-center space-x-2">
            <button id="save-json-button" onClick={handleSaveJson} disabled={isSavingJson || isExporting} className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">
              {isSavingJson ? <><Loader /> Saving...</> : <><IconSave className="h-4 w-4 mr-2" /> Save Data</>}
            </button>
            <button id="export-html-button" onClick={handleExportHtml} disabled={isExporting || isSavingJson} className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">
              {isExporting ? <><Loader /> Exporting...</> : <><IconFileText className="h-4 w-4 mr-2" /> Export HTML</>}
            </button>
        </div>
      </header>
      
      <section className="section-container">
        <h3 className="text-2xl font-bold text-center mb-6 text-slate-800 dark:text-slate-100">Comparison Summary</h3>
        <div className="space-y-6">
          <ComparisonCard 
            title="Course Title"
            icon={<IconBook className="h-6 w-6 text-green-600" />}
            asIs={<p>{courseTitle}</p>}
            toBe={
            <div className="space-y-4">
              <p>{suggested_course_title}</p>
              {onAdoptTitle && (
                <button 
                  onClick={() => onAdoptTitle(suggested_course_title)}
                  className="flex items-center px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors"
                >
                  <IconCheckCircle className="h-3 w-3 mr-1.5" />
                  ADOPT SUGGESTION
                </button>
              )}
            </div>
          }
            justification="The suggested title is more descriptive and aligns better with the course content, a key principle emphasized by OAAAQ for clarity in course catalogs."
          />
          <ComparisonCard 
            title="Course Objectives"
            icon={<IconClipboardList className="h-6 w-6 text-green-600" />}
            asIs={<pre className="whitespace-pre-wrap font-sans">{originalObjectives}</pre>}
            toBe={
              <div className="space-y-4">
                <ul className="space-y-2 list-disc list-inside">
                  {refined_objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                </ul>
                {onAdoptObjectives && (
                  <button 
                    onClick={() => onAdoptObjectives(refined_objectives.join('\n'))}
                    className="flex items-center px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors"
                  >
                    <IconCheckCircle className="h-3 w-3 mr-1.5" />
                    ADOPT SUGGESTIONS
                  </button>
                )}
              </div>
            }
            justification="Refined objectives are structured to be specific, measurable, achievable, relevant, and time-bound (SMART), following OQF and OAAAQ guidelines for effective curriculum design."
          />
          {evaluations.map((evaluation, index) => (
            <ComparisonCard 
              key={index}
              title={`Learning Outcome ${index + 1}`}
              icon={<IconLearning className="h-6 w-6 text-green-600" />}
              asIs={
                <div className="space-y-2">
                    <textarea
                        className="w-full h-24 p-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
                        value={evaluation.original_learning_outcome}
                        onChange={(e) => handleAsIsOutcomeChange(index, e.target.value)}
                        disabled={isExporting || isSavingJson || isReevaluating[index]}
                    />
                     <button
                        onClick={() => handleReevaluate(index)}
                        disabled={isExporting || isSavingJson || isReevaluating[index]}
                        className="flex items-center justify-center w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                        {isReevaluating[index] ? <><Loader /> Re-evaluating...</> : <><IconSparkles className="h-5 w-5 mr-2" /> Re-evaluate with AI</>}
                    </button>
                    {reevaluationError[index] && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{reevaluationError[index]}</p>
                    )}
                </div>
              }
          toBe={
            <div className="space-y-4">
              <p>{evaluation.rewritten_learning_outcome}</p>
              <button 
                onClick={() => {
                  const newOutcomes = [...originalOutcomes];
                  newOutcomes[index] = evaluation.rewritten_learning_outcome;
                  // This is just a UI hint for now as adoption needs prop wiring back to parent
                }}
                className="flex items-center px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors"
                title="Note: Adoption of outcomes is handled in Step 1"
              >
                <IconCheckCircle className="h-3 w-3 mr-1.5" />
                ADOPT REWRITE
              </button>
            </div>
          }
              justification="The rewritten outcome uses a precise action verb and a clear qualifying phrase, ensuring it is directly assessable and aligned with OQF level descriptors."
            />
          ))}
        </div>
      </section>

      <section className="section-container">
        <div className="flex justify-between items-center mb-6 text-slate-800 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-8">
            <h3 className="text-2xl font-bold">In-Depth Learning Outcome Analysis</h3>
            <button onClick={handleToggleAll} className="flex-shrink-0 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
        </div>
        <div className="space-y-12">
            {evaluations.map((evaluation, index) => (
              <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 bg-white dark:bg-slate-900/50 shadow-md">
                   <h4 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">
                      Analysis for Learning Outcome {index + 1}
                  </h4>
                  <p className="italic text-slate-600 dark:text-slate-400 mb-4 bg-slate-100 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                      "{evaluation.original_learning_outcome}"
                  </p>
                  <LearningOutcomeEvaluationDisplay 
                    evaluation={evaluation} 
                    outcomeIndex={index}
                    expandedCards={expandedCards}
                    onToggleCard={handleToggleCard}
                    level={level}
                  />
              </div>
            ))}
        </div>
      </section>

      <section className="section-container">
        <h3 className="text-2xl font-bold text-center mb-6 text-slate-800 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-8">OQF Level {level} Characteristic Alignment Summary</h3>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-x-auto summary-box">
            <table className="w-full text-sm">
                <thead className="text-left text-slate-500 dark:text-slate-400">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="font-semibold p-3 w-1/4">Characteristic</th>
                        <th className="font-semibold p-3 w-1/6">Alignment</th>
                        <th className="font-semibold p-3">Feedback Summary</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {evaluations.flatMap(e => e.characteristic_analysis).map((analysis, index) => (
                        <tr key={`${analysis.characteristic}-${index}`}>
                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{analysis.characteristic}</td>
                            <td className="p-3"><AlignmentBadge alignment={analysis.alignment} /></td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{analysis.feedback}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </section>

       <section className="border-t border-slate-200 dark:border-slate-700 pt-8 section-container summary-box">
         <div className="flex items-center mb-4">
            <IconFileText className="h-7 w-7 text-green-600" />
            <h3 className="ml-3 text-xl font-bold text-slate-800 dark:text-slate-100">Final Summary</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm markdown-body prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{final_summary}</ReactMarkdown>
          </div>
      </section>

      {/* Feedback Form - No Print */}
      <section className="section-container no-print mt-10 border-t border-slate-200 dark:border-slate-700 pt-8">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                  <IconSparkles className="h-5 w-5 mr-2 text-amber-500" />
                  Rate this AI Evaluation
              </h3>
              {!feedbackSubmitted ? (
                  <div className="space-y-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                          Your feedback helps improve the accuracy and relevance of our AI model.
                      </p>
                      
                      <div className="flex flex-col md:flex-row md:space-x-8 space-y-4 md:space-y-0">
                          <StarRating 
                              label="Usefulness" 
                              value={feedback.usefulness} 
                              onChange={(v) => setFeedback({ ...feedback, usefulness: v })} 
                          />
                          <StarRating 
                              label="Accuracy" 
                              value={feedback.accuracy} 
                              onChange={(v) => setFeedback({ ...feedback, accuracy: v })} 
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Specific Feedback or Suggestions (Optional)
                          </label>
                          <textarea
                              value={feedback.comment}
                              onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 text-sm"
                              placeholder="What did the AI get right? What could be improved?"
                          />
                      </div>

                      <div className="flex justify-end">
                          <button
                              onClick={handleFeedbackSubmit}
                              disabled={feedback.usefulness === 0 && feedback.accuracy === 0}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                          >
                              Submit Feedback
                          </button>
                      </div>
                  </div>
              ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-center justify-center text-center">
                      <div>
                          <IconCheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <h4 className="text-lg font-semibold text-green-800 dark:text-green-300">Thank you for your feedback!</h4>
                          <p className="text-sm text-green-700 dark:text-green-400 mt-1">We appreciate your input in helping us improve the platform.</p>
                      </div>
                  </div>
              )}
          </div>
      </section>
    </div>
  );
};
