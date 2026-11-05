import "server-only";

/** Text layer of a PDF (empty for a scan). */
export async function pdfText(data: ArrayBuffer): Promise<string> {
  // The worker must be loaded before pdf-parse (serverless), as in the assistant.
  await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(data) });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}
