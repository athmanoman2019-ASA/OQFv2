import mammoth from 'mammoth';

export interface FileData {
  data: string;
  mimeType: string;
}

export const fileToBase64 = (file: File): Promise<string> => {
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

export const prepareFileForAI = async (file: File): Promise<FileData> => {
  const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 file.name.endsWith('.docx');
  
  if (isDocx) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { data: result.value, mimeType: 'text/plain' };
    } catch (err) {
      console.error("Error extracting text from DOCX:", err);
      // Fallback to base64 if mammoth fails
      const data = await fileToBase64(file);
      return { data, mimeType: file.type };
    }
  }

  const data = await fileToBase64(file);
  return { data, mimeType: file.type };
};
