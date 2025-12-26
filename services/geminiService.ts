
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Use standard model names as per guidelines
const FLASH_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Implements exponential backoff for API calls to ensure reliability.
 */
async function fetchWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const wait = Math.pow(2, i) * 1000;
      await delay(wait);
    }
  }
  throw lastError;
}

/**
 * Polishes observation notes using AI.
 */
export const polishNote = async (note: string): Promise<string> => {
  // Always initialize a new instance before making an API call to ensure latest config/key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    你是一位資深的「教育教學顧問」。
    請將以下老師隨手記錄的口語觀課筆記，改寫為符合教育學專業術語、結構清晰且專業的文字。
    保持客觀中立，但讓表達更具專業度。
    
    原始筆記：
    "${note}"
    
    請直接回傳改寫後的內容，不需多餘的開場白。
  `;

  // Use flash model for simple text task (proofreading/polishing)
  const response: GenerateContentResponse = await fetchWithRetry(() => ai.models.generateContent({
    model: FLASH_MODEL,
    contents: prompt,
    config: { temperature: 0.7 }
  }));

  // Access .text property directly as per guidelines
  return response.text?.trim() || note;
};

/**
 * Generates a comprehensive observation report based on session data.
 */
export const generateReport = async (sessionData: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    你是一位教育專家。請根據以下觀課紀錄 JSON 數據生成一份專業的 Markdown 觀課分析報告。
    
    數據如下：
    ${JSON.stringify(sessionData, null, 2)}
    
    報告必須包含以下結構：
    1. 整體教學風格分析 (分析模式分布與時間配比)
    2. 師生互動與班級經營 (分析行為計數與提問品質)
    3. 關鍵時刻與專注度趨勢 (分析專注度變化與對應的教學事件)
    4. 專業建議與亮點 (Strengths & Growths)
    
    語言要求：繁體中文。
    風格要求：精確、專業、具建設性。
  `;

  // Use pro model for complex reasoning and report generation
  const response: GenerateContentResponse = await fetchWithRetry(() => ai.models.generateContent({
    model: PRO_MODEL,
    contents: prompt,
    config: { temperature: 0.5 }
  }));

  return response.text || "無法生成報告。";
};
