

export interface StructureAnalysis {
  verb: string;
  object: string;
  phrase: string;
  feedback: string;
  is_valid: boolean;
}

export interface KnowledgeBreakdown {
  factual: { feedback: string; suggestion: string; };
  conceptual: { feedback: string; suggestion: string; };
  theoretical: { feedback: string; suggestion: string; };
  depth_and_breadth: { feedback: string; suggestion: string; };
  legal_and_regulatory: { feedback: string; suggestion: string; };
}

export interface SkillsBreakdown {
  cognitive_and_technical: string;
  problem_solving: string;
  response_formulation: string;
}

export interface AutonomyDetail {
  feedback: string;
  scenario: string;
}

export interface AutonomyBreakdown {
  independent_task_management: AutonomyDetail;
  team_leadership_and_collaboration: AutonomyDetail;
  professional_role_and_accountability: AutonomyDetail;
}

export interface CommunicationBreakdown {
  communication_clarity: string;
  numeracy_and_problem_solving: string;
  ict_application: string;
}

export interface EmployabilityBreakdown {
  time_management_and_development: string;
  professional_ethics_and_values: string;
  entrepreneurial_and_creative_skills: string;
}

export interface LearningToLearnBreakdown {
  needs_identification: string;
  response_initiation: string;
}

export interface CharacteristicAnalysis {
  characteristic: string;
  alignment: 'Good' | 'Fair' | 'Poor' | 'N/A';
  feedback: string;
  suggestion: string;
  knowledge_breakdown?: KnowledgeBreakdown;
  skills_breakdown?: SkillsBreakdown;
  autonomy_breakdown?: AutonomyBreakdown;
  communication_breakdown?: CommunicationBreakdown;
  employability_breakdown?: EmployabilityBreakdown;
  learning_to_learn_breakdown?: LearningToLearnBreakdown;
}

export interface EvaluationResponse {
  original_learning_outcome: string;
  overall_assessment: {
    alignment: 'Strongly Aligns' | 'Partially Aligns' | 'Does Not Align';
    summary: string;
  };
  structure_analysis: StructureAnalysis;
  characteristic_analysis: CharacteristicAnalysis[];
  suggestions_for_improvement: string[];
  rewritten_learning_outcome: string;
}

export interface EvaluationReport {
  suggested_course_title: string;
  refined_objectives: string[];
  learning_outcome_evaluation: EvaluationResponse[];
  final_summary: string;
}

export interface ApplicabilityReport {
  isApplicable: boolean;
  overallStatus: string;
  criteriaChecks: {
    criterion: string;
    satisfied: boolean;
    feedback: string;
  }[];
  generalFeedback: string;
  suggestedAction: string;
}
