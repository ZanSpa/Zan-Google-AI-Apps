import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function prioritizeTasks(tasks: Task[], energyLevel?: 'creative' | 'mechanical'): Promise<string[]> {
  if (tasks.length === 0) return [];

  const taskSummary = tasks.map(t => ({
    id: t.id,
    title: t.title,
    importance: t.importance,
    urgency: t.urgency,
    effort: t.effort,
    workType: t.workType,
    dueDate: t.dueDate
  }));

  const prompt = `Actúa como un experto en productividad para estudiantes con TDAH. 
  Tengo la siguiente lista de tareas, cada una con niveles de importancia (1-5), urgencia (1-5), esfuerzo (bajo, medio, alto) y tipo de trabajo (creativo, mecánico).
  
  Tu objetivo es reducir la fatiga de decisión y gestionar la "ceguera del tiempo".
  El usuario actualmente se siente con energía: ${energyLevel || 'normal'}.

  Reglas de ordenación:
  1. Prioriza la importancia sobre la urgencia, pero tareas críticas (>4) van primero.
  2. Si el usuario se siente con energía "creativa", pon las tareas creativas primero.
  3. Si el usuario se siente con energía "mecánica", pon las tareas mecánicas/repetitivas primero.
  4. Agrupación: Evita poner más de 2 tareas de esfuerzo "alto" seguidas.
  5. Intercala tareas de esfuerzo "bajo" (quick wins) entre tareas pesadas para mantener la dopamina.

  Tareas: ${JSON.stringify(taskSummary)}
  
  Responde SOLO con un array JSON de IDs de tareas en el orden sugerido.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });

    const result = JSON.parse(response.text || "[]");
    return result;
  } catch (error) {
    console.error("Error prioritizing tasks:", error);
    // Fallback: simple score-based sort
    const effortWeight = { low: 1, medium: 3, high: 5 };
    return tasks
      .sort((a, b) => {
        let scoreA = (a.importance * 3) + (a.urgency * 2) - effortWeight[a.effort];
        let scoreB = (b.importance * 3) + (b.urgency * 2) - effortWeight[b.effort];
        
        // Energy matching boost
        if (energyLevel === 'creative') {
          if (a.workType === 'creative') scoreA += 5;
          if (b.workType === 'creative') scoreB += 5;
        } else if (energyLevel === 'mechanical') {
          if (a.workType === 'mechanical') scoreA += 5;
          if (b.workType === 'mechanical') scoreB += 5;
        }

        return scoreB - scoreA;
      })
      .map(t => t.id);
  }
}
