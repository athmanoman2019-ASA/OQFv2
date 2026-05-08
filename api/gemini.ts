
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";
import { OQF_DESCRIPTORS, OQF_COMPLIANCE_CRITERIA } from '../constants/oqfConstants';
import { EvaluationReport, EvaluationResponse } from "../types";

export const config = {
    runtime: "nodejs",
    api: {
        bodyParser: true,
    },
};

// Schemas for Gemini API JSON response
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
      description: "A single, distinct sentence that represents a fully rewritten learning outcome. It must incorporate all feedback to improve verb precision, measurability, and alignment with the OQF level. If the original is strong, this version should still offer enhanced clarity."
    }
  },
  required: ['original_learning_outcome', 'overall_assessment', 'structure_analysis', 'characteristic_analysis', 'suggestions_for_improvement', 'rewritten_learning_outcome']
};

const reportSchema = {
    type: Type.OBJECT,
    properties: {
      suggested_course_title: {
        type: Type.STRING,
        description: "A more descriptive, student-centric course title. If the original is good, return the original."
      },
      refined_objectives: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "A list of refined, well-structured course objectives based on the user's input."
      },
      learning_outcome_evaluation: {
        type: Type.ARRAY,
        items: responseSchema,
        description: "An array of evaluation objects, one for each learning outcome provided in the input."
      },
      final_summary: {
        type: Type.STRING,
        description: "A concluding summary of the entire evaluation, linking the objectives, learning outcome, and OQF level alignment."
      }
    },
    required: ['suggested_course_title', 'refined_objectives', 'learning_outcome_evaluation', 'final_summary']
};


const applicabilitySchema = {
  type: Type.OBJECT,
  properties: {
    isApplicable: { 
      type: Type.BOOLEAN, 
      description: "Whether the document content is generally applicable and complete enough for OQF evaluation." 
    },
    overallStatus: { 
      type: Type.STRING, 
      description: "A summary status reflecting the document's readiness (e.g., 'Ready for Evaluation', 'Minor Adjustments Needed', 'Incomplete Information')." 
    },
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
    suggestedAction: { type: Type.STRING, description: "A recommendation for the user (e.g., 'Proceed to evaluation', 'Add more details to objectives', etc.)." }
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
    learningOutcomes: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ['courseTitle', 'courseCode', 'courseObjectives', 'courseDescription', 'learningOutcomes']
};

/**
 * Validates the response from the Gemini API and extracts the text content.
 * Throws a detailed error if the response is invalid, blocked, or empty.
 * @param response - The response object from ai.models.generateContent.
 * @param functionName - The name of the calling function for logging purposes.
 * @returns The text content from the response.
 */
function validateAndGetText(response: any, functionName: string): string {
    if (
        !response ||
        !response.candidates ||
        response.candidates.length === 0 ||
        !response.candidates[0].content ||
        !response.candidates[0].content.parts ||
        response.candidates[0].content.parts.length === 0
    ) {
        if (response?.promptFeedback?.blockReason) {
            const message = `The request was blocked by the AI for safety reasons: ${response.promptFeedback.blockReason}.`;
            console.error(`${functionName}: ${message}`);
            throw new Error(message);
        }
        if (response?.candidates?.[0]?.finishReason && response.candidates[0].finishReason !== 'STOP') {
            const message = `The AI couldn't generate a response. Reason: ${response.candidates[0].finishReason}.`;
            console.error(`${functionName}: ${message}`);
            throw new Error(message);
        }
        console.error(`Gemini API returned an empty or invalid response structure for ${functionName}.`, JSON.stringify(response, null, 2));
        throw new Error("Invalid or empty response from AI service.");
    }
    
    const text = typeof response.text === 'function' ? response.text() : response.text;
    if (typeof text !== 'string') {
        console.error(`Gemini API response.text was not a string in ${functionName}.`);
        throw new Error("Invalid response format from AI service.");
    }
    return text;
}


const extractFromDocument = async (ai: GoogleGenAI, fileBase64: string, mimeType: string): Promise<any> => {
  const systemInstruction = `You are an expert in academic curriculum analysis and document parsing.`;
  
  const prompt = `
    Your task is to extract all relevant course information from the provided Course Description (CDP) or syllabus document. 
    
    Please extract and structure the following exactly as requested:
    1. Course Title: The formal name of the course.
    2. Course Code: The alphanumeric identifier (e.g., ITNS4200).
    3. Course Objectives: The main goals or aims of the course, listed as a detailed string or numbered list.
    4. Course Description / Syllabus Overview: A summary of what the course covers, which may be labeled as "Description", "General Overview", or "Syllabus".
    5. Learning Outcomes: The specific, measurable statements of what a student should know/do at the end of the course. These are often in a dedicated section.

    If any information is not clearly found, provide a best-effort summary extracted from relevant paragraphs or leave it as an empty string/empty array only if it's truly absent.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { 
            inlineData: {
              data: fileBase64,
              mimeType: mimeType
            }
          }
        ]
      }
    ],
    config: { 
      systemInstruction,
      responseMimeType: "application/json", 
      responseSchema: cdpDataSchema,
      temperature: 0.1
    }
  });

  const text = validateAndGetText(response, 'extractFromDocument');
  return JSON.parse(text.trim());
};


const checkOQFApplicability = async (ai: GoogleGenAI, courseData: any, level: string): Promise<any> => {
  const systemInstruction = `You are a Senior Academic Auditor at the Oman Authority for Academic Accreditation and Quality Assurance of Education (OAAAQA).`;
  
  const prompt = `
    Your task is to perform a preliminary check on the provided Course Description (CDP) data to determine if it meets the foundational requirements for alignment with the Oman Qualifications Framework (OQF) at Level ${level}.
    
    **OQF Compliance Criteria:**
    ${OQF_COMPLIANCE_CRITERIA}

    **Provided Course Data:**
    - Title: "${courseData.courseTitle}"
    - Code: "${courseData.courseCode}"
    - Objectives: "${courseData.courseObjectives}"
    - Description: "${courseData.courseDescription}"
    - Learning Outcomes: ${JSON.stringify(courseData.learningOutcomes)}

    **Instructions:**
    Evaluate the data against the compliance criteria. 
    - Check if there are clear outcomes vs aims.
    - Check for structural integrity (Verb + Object + Phrase).
    - Check for vague verbs.
    - Determine if the course information is sufficient to proceed with a full OQF evaluation.

    Return your audit in the specified JSON format.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { 
      systemInstruction,
      responseMimeType: "application/json", 
      responseSchema: applicabilitySchema,
      temperature: 0.2
    }
  });

  const text = validateAndGetText(response, 'checkOQFApplicability');
  return JSON.parse(text.trim());
};

// AI Logic Functions
const evaluateLearningOutcome = async (
    ai: GoogleGenAI,
    learningOutcomes: string[], 
    level: string, 
    courseDetails: { title: string; code: string; objectives: string; description: string; }
): Promise<EvaluationReport> => {
  const selectedDescriptors = OQF_DESCRIPTORS[level as keyof typeof OQF_DESCRIPTORS];
  if (!selectedDescriptors) throw new Error(`Invalid OQF Level selected: ${level}`);

  const systemInstruction = `You are an expert in academic quality assurance, specializing in the Oman Qualifications Framework (OQF) and Oman Authority for Academic Accreditation and Quality Assurance of Education (OAAAQ) standards.`;

  const prompt = `
    Your task is to generate a comprehensive evaluation and improvement report for a user-provided course, comparing their input ("As-Is") with your expert recommendations ("To-Be").

    **Course Details (As-Is):**
    - Title: "${courseDetails.title}"
    - Code: "${courseDetails.code}"
    - OQF Level: ${level}
    - Provided Course Objectives: "${courseDetails.objectives}"
    - Course Description (Optional Context): "${courseDetails.description}"
    - Learning Outcomes to Evaluate: ${JSON.stringify(learningOutcomes)}

    **OQF Level ${level} Descriptors Context:**
    ${selectedDescriptors}

    **Core Principles (from OQF & OAAAQ):**
    - **Clarity & Specificity:** Titles, objectives, and outcomes must be unambiguous and clear to students and stakeholders.
    - **Measurability:** Outcomes and objectives must be written using action verbs that allow for direct assessment. Avoid vague verbs like "understand" or "know."
    - **Alignment:** The title, objectives, and learning outcomes must be logically aligned with each other and with the specified OQF level descriptors.
    - **Structure:** A good learning outcome follows the structure: active verb + object + qualifying phrase.

    **Your Task:**
    Generate a full report in the specified JSON format. For each task, think about how to improve upon the user's input.
    1.  **Suggest a Refined Course Title:** Review the provided title. If it is generic or unclear, suggest a more descriptive, student-centric title that better reflects the course content. If the original title is already excellent, return the original title.
    2.  **Refine Course Objectives:** Rewrite the provided course objectives into a list of clear, measurable, and distinct statements that align with the course's scope and OQF Level ${level}. Ensure they follow SMART principles where applicable.
    3.  **Evaluate Learning Outcomes:** For EACH learning outcome provided in the 'Learning Outcomes to Evaluate' list, perform a detailed evaluation against OQF Level ${level} descriptors. Your response must contain an array of evaluation objects in the 'learning_outcome_evaluation' field, one for each outcome. Each evaluation object must include:
        - The original learning outcome text in the 'original_learning_outcome' field.
        - A structural analysis (verb, object, phrase).
        - A breakdown of its alignment with all relevant OQF characteristics (Knowledge, Skills, etc.), including granular feedback as required by the schema.
        - An overall assessment and detailed suggestions for improvement.
        - **Crucially, provide a single, fully rewritten learning outcome** for that specific original outcome. This rewrite must be a single, distinct sentence. It must directly address the core feedback provided, especially focusing on improving verb precision, measurability, and alignment with the OQF level's cognitive demands. Even if the original outcome is already strong, the rewritten version must still offer an enhancement to clarity or precision.

    **Specific Instructions for Granular Breakdowns:**
    - **Knowledge:** For EACH sub-category (factual, conceptual, etc.), provide specific feedback and an actionable suggestion. Your analysis of 'depth_and_breadth' is critical for OQF Level ${level}. You MUST explicitly analyze how the learning outcome demonstrates (or could be improved to demonstrate) 'significant knowledge' (breadth) and 'areas of specialisation' (depth) appropriate for this level. Your feedback should be granular and provide concrete examples. For instance, if evaluating a Level 6 outcome: "The outcome's use of 'analyze network protocols' addresses significant knowledge but lacks specialisation. To align with Level 6, it should be focused, such as 'critique enterprise-grade network security protocols to identify vulnerabilities'." Ensure the suggestion provides a tangible rewrite or clause to achieve the required level of detail.
    - **Skills:** Your analysis must be grounded in a vocational context. For 'cognitive_and_technical', you MUST critically analyze the action verb. This is the most critical part of the skills analysis. Explain its importance for measurability at OQF Level ${level}. If the verb is weak (e.g., 'understand', 'know', 'learn about'), state why it is inappropriate for assessment and suggest strong, vocational verb alternatives (e.g., 'critique', 'troubleshoot', 'formulate', 'devise') that match the cognitive demand of Level ${level}. Your feedback must include a rewritten example with a stronger verb if the original is weak. For 'problem_solving', assess the complexity of the problems. For 'response_formulation', you must critically evaluate whether the learning outcome targets 'well-defined' or 'abstract' problems. Your feedback should clearly state this distinction and, if the outcome only addresses well-defined problems, provide specific guidance on how to elevate it to include the formulation of responses to abstract challenges if required at OQF Level ${level}.
    - **Autonomy & Responsibility:** This characteristic is critical for vocational qualifications. For EACH sub-category, you MUST provide BOTH:
      1.  **feedback**: A direct, analytical assessment of how the learning outcome addresses the OQF descriptor.
      2.  **scenario**: A highly concrete, vocational scenario describing a realistic task a student would perform.
      For the 'independent_task_management' sub-category specifically, the scenario MUST describe a multi-step project or a complex task that requires the student to demonstrate:
        a) **Planning & Scoping:** Defining project goals and milestones.
        b) **Execution with Minimal Supervision:** Carrying out the core tasks independently.
        c) **Problem-Solving:** Identifying and resolving issues as they arise without constant guidance.
        d) **Completion & Review:** Delivering a final output and potentially self-evaluating the work.
      For example, for a networking course, a strong scenario would be: "A student demonstrates this by being tasked to design, configure, and troubleshoot a secure wireless network for a mock small office environment. This involves independently gathering requirements, creating a project plan with milestones, executing the configuration, documenting the entire process, and presenting a final report on network performance and security posture, all with minimal supervision." This is far superior to a vague statement like "A student manages a project." For other sub-categories, ensure the scenario is equally specific and illustrative of the OQF descriptor in a vocational context.
    - **All other breakdowns (Communication, Employability, Learning to Learn):** Ensure your analysis is specific, references the OQF descriptors, and is grounded in a practical, vocational context.

    4.  **Provide a Final Summary:** Write a concluding summary that synthesizes the analysis. It should connect the refined objectives with the learning outcome's evaluation, providing a holistic view of the course's alignment with OQF Level ${level}.

    **Output Format:**
    You MUST provide your response in a valid JSON format that adheres exactly to the provided schema. Do not include any text, markdown, or explanations outside of the JSON object.
  `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        systemInstruction,
        responseMimeType: "application/json", 
        responseSchema: reportSchema, 
        temperature: 0.2 
      }
    });
    const text = validateAndGetText(response, 'evaluateLearningOutcome');
    return JSON.parse(text.trim()) as EvaluationReport;
};

const reevaluateSingleOutcome = async (
  ai: GoogleGenAI,
  learningOutcome: string,
  level: string,
  courseDetails: { title: string; code: string; objectives: string; description: string; }
): Promise<EvaluationResponse> => {
  const selectedDescriptors = OQF_DESCRIPTORS[level as keyof typeof OQF_DESCRIPTORS];
  if (!selectedDescriptors) throw new Error(`Invalid OQF Level selected: ${level}`);

  const systemInstruction = `You are an expert in academic quality assurance, specializing in the Oman Qualifications Framework (OQF).`;

  const prompt = `
    Your task is to perform a detailed evaluation of a single learning outcome provided by the user.

    **Course Context:**
    - Title: "${courseDetails.title}"
    - Code: "${courseDetails.code}"
    - OQF Level: ${level}
    - Course Objectives: "${courseDetails.objectives}"
    - Course Description: "${courseDetails.description}"

    **Learning Outcome to Evaluate:**
    "${learningOutcome}"

    **Your Task:**
    Generate a detailed evaluation for the single learning outcome provided. The response must be a single JSON object that adheres exactly to the provided schema. The 'original_learning_outcome' field in your response should contain the learning outcome text provided above for evaluation.
    
    Your evaluation must include:
    1.  **Structural Analysis:** Analyze the verb, object, and phrase.
    2.  **OQF Characteristic Breakdown:** Provide a detailed analysis of its alignment with all relevant OQF Level ${level} characteristics (Knowledge, Skills, etc.), including granular feedback as required by the schema.
    3.  **Overall Assessment:** Give a summary and an overall alignment rating ('Strongly Aligns', 'Partially Aligns', 'Does Not Align').
    4.  **Suggestions for Improvement:** Provide a list of actionable suggestions.
    5.  **Rewritten Learning Outcome:** Provide a single, fully rewritten learning outcome. This rewrite must be a distinct sentence that addresses the core feedback, improving verb precision, measurability, and alignment. Even if the original is strong, the rewritten version must offer an enhancement.

    **Specific Instructions for Granular Breakdowns:**
    Follow the same detailed instructions for Knowledge, Skills, Autonomy, and other breakdowns as in the full report generation. Ensure scenarios are concrete and vocational. Critically analyze action verbs and the complexity of problem-solving (well-defined vs. abstract).

    **Output Format:**
    You MUST provide your response as a single, valid JSON object that adheres exactly to the provided schema. Do not include any text, markdown, or explanations outside of the JSON object.
  `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        systemInstruction,
        responseMimeType: "application/json", 
        responseSchema: responseSchema, 
        temperature: 0.2 
      }
    });
    const text = validateAndGetText(response, 'reevaluateSingleOutcome');
    return JSON.parse(text.trim()) as EvaluationResponse;
};

const generateExampleOutcome = async (ai: GoogleGenAI, level: string): Promise<string> => {
  const selectedDescriptors = OQF_DESCRIPTORS[level as keyof typeof OQF_DESCRIPTORS];
  if (!selectedDescriptors) throw new Error(`Invalid OQF Level selected: ${level}`);

  const systemInstruction = `You are an expert in academic quality assurance specializing in the Oman Qualifications Framework (OQF).`;
  
  const prompt = `
      Your task is to generate one new, high-quality learning outcome example that strongly aligns with OQF Level ${level} for a Vocational Qualification.

      **OQF Level ${level} Descriptors Context:**
      ${selectedDescriptors}

      **Learning Outcome Structure Rule:**
      The learning outcome MUST follow a clear, assessable structure: active verb + object + qualifying phrase. It must be specific, measurable, and appropriate for the level. It should also be a unique example, different from common ones.

      **Your Task:**
      Generate a single learning outcome. Do not provide any explanation, preamble, or formatting like quotes or markdown. Output only the learning outcome text itself.
  `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction, temperature: 0.8 }
    });
    const text = validateAndGetText(response, 'generateExampleOutcome');
    return text.trim();
};

const generateOutcomeFromContent = async (ai: GoogleGenAI, courseContent: string, level: string): Promise<string> => {
  const selectedDescriptors = OQF_DESCRIPTORS[level as keyof typeof OQF_DESCRIPTORS];
  if (!selectedDescriptors) throw new Error(`Invalid OQF Level selected: ${level}`);

  const systemInstruction = `You are an expert in academic quality assurance specializing in the Oman Qualifications Framework (OQF).`;

  const prompt = `
    Your task is to generate a single, high-quality learning outcome that strongly aligns with OQF Level ${level} for a Vocational Qualification. This learning outcome should accurately reflect the core capabilities a student will gain from the provided course content.

    **OQF Level ${level} Descriptors Context:**
    ${selectedDescriptors}

    **Provided Course Content (Units/Chapters):**
    ${courseContent}

    **Learning Outcome Structure Rule:**
    The learning outcome MUST follow a clear, assessable structure: active verb + object + qualifying phrase. It must be specific, measurable, and encapsulate the key skills from the course content at the appropriate cognitive level for OQF Level ${level}.

    **Your Task:**
    Based on the course content and OQF Level ${level} descriptors, generate one single, consolidated learning outcome. Do not provide any explanation, preamble, or formatting like quotes or markdown. Output only the learning outcome text itself.
  `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction, temperature: 0.5 }
    });
    const text = validateAndGetText(response, 'generateOutcomeFromContent');
    return text.trim();
};

const refineCourseTitle = async (ai: GoogleGenAI, currentTitle: string, courseObjectives: string, courseDescription: string): Promise<string> => {
  const systemInstruction = `You are an expert in academic curriculum design.`;
  
  const prompt = `
    Your task is to refine a course title to be more descriptive, engaging, and student-centric.
    
    **Current Course Information:**
    - Title: "${currentTitle}"
    - Objectives: "${courseObjectives}"
    - Description: "${courseDescription}"

    **Instructions:**
    Based on the provided information, rewrite the course title. The new title should:
    1.  Clearly communicate the core subject and level of the course.
    2.  Be engaging and appealing to prospective students.
    3.  Accurately reflect the course objectives and content.

    If the current title is already excellent, you can make minor improvements or return the original.

    **Output Format:**
    Return ONLY the refined course title text. Do not include any explanation, preamble, or formatting like quotes or markdown.
  `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction, temperature: 0.4 }
    });
    const text = validateAndGetText(response, 'refineCourseTitle');
    return text.trim();
};

const refineCourseObjectives = async (ai: GoogleGenAI, currentObjectives: string, courseTitle: string, level: string): Promise<string> => {
  const selectedDescriptors = OQF_DESCRIPTORS[level as keyof typeof OQF_DESCRIPTORS];
  if (!selectedDescriptors) throw new Error(`Invalid OQF Level selected: ${level}`);

  const systemInstruction = `You are an expert in academic curriculum design, specializing in the Oman Qualifications Framework (OQF).`;
  
  const prompt = `
    Your task is to refine a set of course objectives to be more specific, measurable, achievable, relevant, and time-bound (SMART), ensuring they align with OQF Level ${level}.

    **OQF Level ${level} Descriptors Context:**
    ${selectedDescriptors}

    **Current Course Information:**
    - Title: "${courseTitle}"
    - Current Objectives:
    "${currentObjectives}"

    **Instructions:**
    Rewrite the provided course objectives into a numbered or bulleted list of clear, distinct, and measurable statements. Each objective should:
    1.  Start with a strong, active verb that is assessable (e.g., 'Analyze', 'Critique', 'Design', not 'Understand' or 'Know').
    2.  Clearly state what the learner will be able to do upon completion.
    3.  Be aligned with the cognitive and practical demands of OQF Level ${level}.
    4.  Be realistic and achievable within the scope of a typical course.

    **Output Format:**
    Return ONLY the refined objectives as a list. Do not include any explanation, preamble, or formatting like quotes or markdown. Each objective should be on a new line, preferably starting with a number or bullet point.
  `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction, temperature: 0.3 }
    });
    const text = validateAndGetText(response, 'refineCourseObjectives');
    return text.trim();
};

// Main Handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not configured on the server.");
        return res.status(500).json({ error: "AI service is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { action, payload } = req.body;

    try {
        switch (action) {
            case 'evaluateLearningOutcome': {
                const { learningOutcomes, level, courseDetails } = payload;
                const result = await evaluateLearningOutcome(ai, learningOutcomes, level, courseDetails);
                return res.status(200).json(result);
            }
            case 'reevaluateSingleOutcome': {
                const { learningOutcome, level, courseDetails } = payload;
                const result = await reevaluateSingleOutcome(ai, learningOutcome, level, courseDetails);
                return res.status(200).json(result);
            }
            case 'generateExampleOutcome': {
                const { level } = payload;
                const result = await generateExampleOutcome(ai, level);
                return res.status(200).json({ result });
            }
            case 'generateOutcomeFromContent': {
                const { courseContent, level } = payload;
                const result = await generateOutcomeFromContent(ai, courseContent, level);
                return res.status(200).json({ result });
            }
            case 'refineCourseTitle': {
                const { currentTitle, courseObjectives, courseDescription } = payload;
                const result = await refineCourseTitle(ai, currentTitle, courseObjectives, courseDescription);
                return res.status(200).json({ result });
            }
            case 'refineCourseObjectives': {
                const { currentObjectives, courseTitle, level } = payload;
                const result = await refineCourseObjectives(ai, currentObjectives, courseTitle, level);
                return res.status(200).json({ result });
            }
            case 'extractFromDocument': {
                const { fileBase64, mimeType } = payload;
                const result = await extractFromDocument(ai, fileBase64, mimeType);
                return res.status(200).json(result);
            }
            case 'checkOQFApplicability': {
                const { courseData, level } = payload;
                const result = await checkOQFApplicability(ai, courseData, level);
                return res.status(200).json(result);
            }
            default:
                return res.status(400).json({ error: 'Invalid action specified.' });
        }
    } catch (error) {
        console.error(`Error processing action "${action}":`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown internal error occurred.";
        return res.status(500).json({ error: `The AI task failed: ${errorMessage}` });
    }
}
