

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

export interface PLOMapping {
  cloText: string;
  overallContribution?: 'Supporting' | 'Supporting*';
  mappedPLOs: {
    code: string; // e.g. D-SE-PLO1
    program: string; // e.g. SE, IS, CL, NWSY
    contribution: 'Primary' | 'Supporting' | 'Supporting*';
    explanation: string;
  }[];
}

export interface LOChecklist {
  loNumber: number;
  loText: string;
  items: {
    question: string;
    satisfied: boolean;
    comment: string;
    evidence?: string;
  }[];
}

export interface OQFCourseComplianceReport {
  courseInformation: {
    code: string;
    title: string;
    diplomaLevel: string;
    creditHours: string;
    program: string;
    proposedOQFLevel?: string;
    proposedCreditValue?: string;
  };
  intentAndRole: {
    courseDescription: string;
    learningOutcomes: string[];
    ploMapping: PLOMapping[];
    indicativeContent: string[];
    titleReflectsContent: {
      answer: 'Yes' | 'No';
      justification: string;
    };
  };
  qualityChecklist: {
    individualLOs: LOChecklist[];
    collectiveChecklist: {
      question: string;
      satisfied: boolean;
      comment: string;
      evidence?: string;
    }[];
  };
}

export interface OQFCreditReport {
  courseInfo: {
    title: string;
    code: string;
    prerequisites: string;
    checks: {
      titleReflectsContent: boolean;
      writtenInLearningOutcomes: boolean;
      clearAndUnambiguous: boolean;
      prerequisitesIdentified: boolean;
      allLosAssessed: boolean;
    };
  };
  partA: {
    clos: string[];
    smartAnalysis: {
      clo: string;
      s: boolean;
      m: boolean;
      a: boolean;
      r: boolean;
      t: boolean;
      decision: string;
    }[];
    taxonomies: {
      clo: string;
      characteristic: 'Knowledge' | 'Skills';
      cognitiveDomain: string;
      affectiveDomain: string;
      psychomotorDomain: string;
    }[];
  };
  partB: {
    verification: {
      allLoHasCriteria: boolean;
      allCriteriaLinkToLo: boolean;
      assessmentMethodTestsIt: boolean;
    };
    mapping: {
      clo: string;
      criteria: string[];
      methods: string[];
    }[];
  };
  partC: {
    mappings: {
      characteristic: string;
      bestFitLevel: number;
      rankedOrder: number;
      rationale: string;
    }[];
    proposedLevel: number;
    overallLevel: number;
  };
  partD: {
    defaults: {
      creditHours: number;
      semesterLength: number;
      nlhPerCreditPerWeek: number;
      maxNlh: number;
      frequency: number;
    };
    nlhMatrix: {
      activity: string;
      clos: number[];
      total: number;
    }[];
    summary: {
      activity: string;
      hoursPerWeek: number;
      frequency: number;
      totalHours: number;
    }[];
    calculation: {
      totalNlh: number;
      creditHoursCalculated: number;
      oqfCreditValue: number;
    };
  };
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
