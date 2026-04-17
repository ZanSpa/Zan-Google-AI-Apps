import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function prioritizeTasks(tasks: Task[]): Promise<string[]> {
  if (tasks.length === 0) return [];

  const taskSummary = tasks.map(t => ({
    id: t.id,
    title: t.title,
    importance: t.importance,
    urgency: t.urgency,
    effort: t.effort,
    dueDate: t.dueDate
  }));

  const prompt = `Actúa como un experto en productividad. Tengo la siguiente lista de tareas, cada una con niveles de importancia (1-5), urgencia (1-5) y esfuerzo (bajo, medio, alto).
  
  Definiciones de esfuerzo:
  - bajo: < 1 hora
  - medio: 1-3 horas
  - alto: > 3 horas

  Por favor, ordena estas tareas de la más prioritaria a la menos prioritaria siguiendo estas reglas:
  1. La importancia es el factor dominante.
  2. La urgencia es el segundo factor crítico.
  3. Estrategia de Esfuerzo:
     - Crea una mezcla de niveles de esfuerzo a lo largo del día para mantener el ritmo ("Quick wins" mezclados con trabajo profundo).
     - Si hay muchas tareas, prioriza algunas de esfuerzo "bajo" al principio para ganar inercia.
     - No satures el inicio del día con solo tareas de esfuerzo "alto".
  4. Fechas de entrega próximas aumentan drásticamente la prioridad.

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
        const scoreA = (a.importance * 3) + (a.urgency * 2) - effortWeight[a.effort];
        const scoreB = (b.importance * 3) + (b.urgency * 2) - effortWeight[b.effort];
        return scoreB - scoreA;
      })
      .map(t => t.id);
  }
}
