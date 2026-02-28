import fs from 'fs';
import FormData from 'form-data';
// @ts-ignore
import fetch from 'node-fetch'; // Requires node-fetch since native fetch isn't fully reliable for FormData in older Node

// We won't strictly need node-fetch if Node 18+ native fetch supports FormData properly, 
// but using the built-in fetch with a manual FormData is cleaner if node > 18.
export async function parsePdfResults(filePath: string): Promise<{ results: any[], regulation: string }> {
  const fileStream = fs.createReadStream(filePath);
  const form = new FormData();
  form.append('file', fileStream);

  try {
    const response = await fetch('http://localhost:8000/parse', {
      method: 'POST',
      body: form
    });

    if (!response.ok) {
      throw new Error(`Parser service responded with status: ${response.status}`);
    }

    const data = await response.json();
    return {
      results: data.results || [],
      regulation: data.regulation || "Unknown"
    };
  } catch (error: any) {
    console.error("Error communicating with Python PDF parser:", error.message);
    return { results: [], regulation: "Unknown" };
  } finally {
    fileStream.destroy();
  }
}
