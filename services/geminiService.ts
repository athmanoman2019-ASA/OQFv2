import { GoogleGenAI, Type } from "@google/genai";
import { type EvaluationReport, type EvaluationResponse, type ApplicabilityReport } from "../types";
import { OQF_DESCRIPTORS, OQF_COMPLIANCE_CRITERIA } from '../constants/oqfConstants';

// Initialize Gemini directly in the frontend. 
// AI Studio will inject the GEMINI_API_KEY into the process.env in the browser.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelName = "gemini-3-flash-preview";

// Helper schemas matching server.ts
const autonomyDetailSchema = {
  type: Type.OBJECT,
  properties: {
    feedback: { type: Type.STRING, description: "General analysis of how the learning outcome addresses this sub-category." },
    scenario: { type: Type.STRING, description: "A concrete, illustrative scenario of a task a student would perform to demonstrate this competency." }
  },
  required: ['feedback', 'scenario']
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    original_learning_outcome: {
        type: Type.STRING,
        description: "The original learning outcome text that this evaluation corresponds to."
    },
    overall_assessment: {
      type: Type.OBJECT,
      properties: {
        alignment: { type: Type.STRING, enum: ['Strongly Aligns', 'Partially Aligns', 'Does Not Align'] },
        summary: { type: Type.STRING }
      },
      required: ['alignment', 'summary']
    },
    structure_analysis: {
      type: Type.OBJECT,
      properties: {
        verb: { type: Type.STRING },
        object: { type: Type.STRING },
        phrase: { type: Type.STRING },
        feedback: { type: Type.STRING },
        is_valid: { type: Type.BOOLEAN }
      },
      required: ['verb', 'object', 'phrase', 'feedback', 'is_valid']
    },
    characteristic_analysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          characteristic: { type: Type.STRING },
          alignment: { type: Type.STRING, enum: ['Good', 'Fair', 'Poor', 'N/A'] },
          feedback: { type: Type.STRING, description: "A summary of the feedback for the characteristic." },
          suggestion: { type: Type.STRING },
          knowledge_breakdown: {
            type: Type.OBJECT,
            description: "Detailed breakdown for the 'Knowledge' characteristic. This field should ONLY be present for the 'Knowledge' characteristic, otherwise it must be omitted.",
            properties: {
              factual: {
                type: Type.OBJECT, properties: {
                  feedback: { type: Type.STRING, description: "Specific analysis of factual knowledge ('important bodies of information')." },
                  suggestion: { type: Type.STRING, description: "A concrete, actionable suggestion to improve. State 'None' if it's already excellent." }
                }, required: ['feedback', 'suggestion']
              },
              conceptual: {
                type: Type.OBJECT, properties: {
                  feedback: { type: Type.STRING, description: "Specific analysis of conceptual knowledge and 'conceptualisation'." },
                  suggestion: { type: Type.STRING, description: "A concrete, actionable suggestion to improve. State 'None' if it's already excellent." }
                }, required: ['feedback', 'suggestion']
              },
              theoretical: {
                type: Type.OBJECT, properties: {
                  feedback: { type: Type.STRING, description: "Specific analysis of theoretical knowledge and 'underpinning principles'." },
                  suggestion: { type: Type.STRING, description: "A concrete, actionable suggestion to improve. State 'None' if it's already excellent or not applicable." }
                }, required: ['feedback', 'suggestion']
              },
              depth_and_breadth: {
                type: Type.OBJECT, properties: {
                  feedback: { type: Type.STRING, description: "Assessment of the depth and breadth ('significant knowledge', 'specialisation')." },
                  suggestion: { type: Type.STRING, description: "A concrete, actionable suggestion to improve. State 'None' if it's already excellent." }
                }, required: ['feedback', 'suggestion']
              },
              legal_and_regulatory: {
                type: Type.OBJECT, properties: {
                  feedback: { type: Type.STRING, description: "Evaluation of knowledge of 'essential legal and regulatory frameworks'." },
                  suggestion: { type: Type.STRING, description: "A concrete, actionable suggestion to improve. State 'None' if it's already excellent or not applicable." }
                }, required: ['feedback', 'suggestion']
              }
            },
            required: ['factual', 'conceptual', 'theoretical', 'depth_and_breadth', 'legal_and_regulatory']
          },
          skills_breakdown: {
            type: Type.OBJECT,
            description: "Detailed breakdown for the 'Skills' characteristic. This field should ONLY be present for the 'Skills' characteristic, otherwise it must be omitted.",
            properties: {
              cognitive_and_technical: { type: Type.STRING, description: "Analysis of the range and complexity of cognitive and technical skills." },
              problem_solving: { type: Type.STRING, description: "Analysis of problem-solving abilities, including methodology and tool application." },
              response_formulation: { type: Type.STRING, description: "Analysis of the ability to formulate responses to well-defined and abstract problems." }
            },
            required: ['cognitive_and_technical', 'problem_solving', 'response_formulation']
          },
          autonomy_breakdown: {
            type: Type.OBJECT,
            description: "Detailed breakdown for the 'Autonomy and Responsibility' characteristic. This field should ONLY be present for this characteristic, otherwise it must be omitted.",
            properties: {
                independent_task_management: autonomyDetailSchema,
                team_leadership_and_collaboration: autonomyDetailSchema,
                professional_role_and_accountability: autonomyDetailSchema
            },
            required: ['independent_task_management', 'team_leadership_and_collaboration', 'professional_role_and_accountability']
          },
          communication_breakdown: {
            type: Type.OBJECT,
            description: "Detailed breakdown for the 'Communication, Numeracy, and ICT Skills' characteristic. This field should ONLY be present for this characteristic, otherwise it must be omitted.",
            properties: {
              communication_clarity: { type: Type.STRING, description: "Analysis of reporting information to diverse audiences." },
              numeracy_and_problem_solving: { type: Type.STRING, description: "Analysis of using numeracy skills to solve complex problems." },
              ict_application: { type: Type.STRING, description: "Analysis of using and analysing information with ICT." }
            },
            required: ['communication_clarity', 'numeracy_and_problem_solving', 'ict_application']
          },
          employability_breakdown: {
            type: Type.OBJECT,
            description: "Detailed breakdown for the 'Employability and Values' characteristic. This field should ONLY be present for this characteristic, otherwise it must be omitted.",
            properties: {
              time_management_and_development: { type: Type.STRING, description: "Analysis of time management for personal and professional development." },
              professional_ethics_and_values: { type: Type.STRING, description: "Analysis of understanding and applying professional values and ethics." },
              entrepreneurial_and_creative_skills: { type: Type.STRING, description: "Analysis of the use of entrepreneurial or creative skills." }
            },
            required: ['time_management_and_development', 'professional_ethics_and_values', 'entrepreneurial_and_creative_skills']
          },
          learning_to_learn_breakdown: {
            type: Type.OBJECT,
            description: "Detailed breakdown for the 'Learning to Learn' characteristic. This field should ONLY be present for this characteristic, otherwise it must be omitted.",
            properties: {
              needs_identification: { type: Type.STRING, description: "Analysis of how the outcome encourages learners to identify their own learning needs." },
              response_initiation: { type: Type.STRING, description: "Analysis of how the outcome requires learners to initiate responses or plans to address their learning needs." }
            },
            required: ['needs_identification', 'response_initiation']
          }
        },
        required: ['characteristic', 'alignment', 'feedback', 'suggestion']
      }
    },
    suggestions_for_improvement: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    rewritten_learning_outcome: {
      type: Type.STRING,
      description: "A single, distinct sentence that represents a fully rewritten learning outcome."
    }
  },
  required: ['original_learning_outcome', 'overall_assessment', 'structure_analysis', 'characteristic_analysis', 'suggestions_for_improvement', 'rewritten_learning_outcome']
};

const reportSchema = {
    type: Type.OBJECT,
    properties: {
      suggested_course_title: { type: Type.STRING },
      refined_objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
      learning_outcome_evaluation: { type: Type.ARRAY, items: responseSchema },
      final_summary: { type: Type.STRING }
    },
    required: ['suggested_course_title', 'refined_objectives', 'learning_outcome_evaluation', 'final_summary']
};

const applicabilitySchema = {
  type: Type.OBJECT,
  properties: {
    isApplicable: { type: Type.BOOLEAN },
    overallStatus: { type: Type.STRING },
    criteriaChecks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterion: { type: Type.STRING },
          satisfied: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING }
        },
        required: ['criterion', 'satisfied', 'feedback']
      }
    },
    generalFeedback: { type: Type.STRING },
    suggestedAction: { type: Type.STRING }
  },
  required: ['isApplicable', 'overallStatus', 'criteriaChecks', 'generalFeedback', 'suggestedAction']
};

const cdpDataSchema = {
  type: Type.OBJECT,
  properties: {
    courseTitle: { type: Type.STRING },
    courseCode: { type: Type.STRING },
    courseObjectives: { type: Type.STRING },
    courseDescription: { type: Type.STRING },
    learningOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ['courseTitle', 'courseCode', 'courseObjectives', 'courseDescription', 'learningOutcomes']
};


/**
 * Checks if the AI features are supported.
 */
export const isAISupported = async (): Promise<boolean> => {
  return !!process.env.GEMINI_API_KEY;
};

export const evaluateLearningOutcome = async (
    learningOutcomes: string[], 
    level: string, 
    courseDetails: { title: string; code: string; objectives: string; description: string; }
): Promise<EvaluationReport> => {
    const selectedDescriptors = OQF_DESCRIPTORS[level as keyof typeof OQF_DESCRIPTORS];
    const prompt = `
        Evaluate these learning outcomes for OQF Level ${level}:
        ${JSON.stringify(learningOutcomes)}
        
        Context:
        Level Descriptors: ${selectedDescriptors}
        Course: ${courseDetails.title}
        Objectives: ${courseDetails.objectives}
        
        Provide a full report including structural analysis and OQF characteristic breakdowns as per the responseSchema.
    `;
    const result = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: reportSchema,
        }
    });
    return JSON.parse(result.text);
};

export const reevaluateSingleOutcome = async (
    learningOutcome: string,
    level: string,
    courseDetails: { title: string; code: string; objectives: string; description: string; }
): Promise<EvaluationResponse> => {
    const selectedDescriptors = OQF_DESCRIPTORS[level as keyof typeof OQF_DESCRIPTORS];
    const prompt = `
        Evaluate this single learning outcome for OQF Level ${level}:
        "${learningOutcome}"
        
        Context:
        Level Descriptors: ${selectedDescriptors}
        Course: ${courseDetails.title}
        
        Provide a detailed evaluation as per responseSchema.
    `;
    const result = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });
    return JSON.parse(result.text);
};

export const generateExampleOutcome = async (level: string): Promise<string> => {
    const prompt = `Generate a high-quality example learning outcome for OQF Level ${level}. Output ONLY the text.`;
    const resp = await ai.models.generateContent({ model: modelName, contents: prompt });
    return resp.text.trim();
};

export const generateOutcomeFromContent = async (courseContent: string, level: string): Promise<string> => {
    const prompt = `Generate a learning outcome for OQF Level ${level} based on this content: ${courseContent}. Output ONLY the text.`;
    const resp = await ai.models.generateContent({ model: modelName, contents: prompt });
    return resp.text.trim();
};

export const refineCourseTitle = async (
    currentTitle: string,
    courseObjectives: string,
    courseDescription: string
): Promise<string> => {
    const prompt = `Refine this course title: "${currentTitle}" based on objectives: ${courseObjectives} and description: ${courseDescription}. Output ONLY the title.`;
    const resp = await ai.models.generateContent({ model: modelName, contents: prompt });
    return resp.text.trim();
};

export const refineCourseObjectives = async (
    currentObjectives: string,
    courseTitle: string,
    level: string
): Promise<string> => {
    const prompt = `Refine these objectives for "${courseTitle}" at OQF Level ${level}: ${currentObjectives}. Output ONLY the refined list.`;
    const resp = await ai.models.generateContent({ model: modelName, contents: prompt });
    return resp.text.trim();
};

export const extractFromDocument = async (
    fileBase64: string,
    mimeType: string
): Promise<{
    courseTitle: string;
    courseCode: string;
    courseObjectives: string;
    courseDescription: string;
    learningOutcomes: string[];
}> => {
    const prompt = `
        Carefully extract the course details from the provided document.
        Identify:
        - Course Title
        - Course Code
        - Course Objectives (Aims of the course)
        - Course Description (Brief overview or syllabus summary)
        - Learning Outcomes (List of specific, measurable outcomes)
    `;
    const result = await ai.models.generateContent({
        model: modelName,
        contents: [
            {
                role: 'user',
                parts: [
                    { text: prompt },
                    { inlineData: { data: fileBase64, mimeType } }
                ]
            }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: cdpDataSchema,
        }
    });
    return JSON.parse(result.text);
};

export const checkOQFApplicability = async (
    courseData: {
        courseTitle: string;
        courseCode: string;
        courseObjectives: string;
        courseDescription: string;
        learningOutcomes: string[];
    },
    level: string
): Promise<ApplicabilityReport> => {
    const prompt = `
        Audit this course data for OQF Level ${level} applicability:
        ${JSON.stringify(courseData)}
        
        Criteria: ${OQF_COMPLIANCE_CRITERIA}
    `;
    const result = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: applicabilitySchema,
        }
    });
    return JSON.parse(result.text);
};
