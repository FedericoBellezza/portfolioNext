import "server-only";

/** Text of a PDF (empty for a scan). Used by the receipt check and the chat attachments. */
export async function pdfText(data: ArrayBuffer | Uint8Array): Promise<string> {
  // The worker must be loaded before pdf-parse (serverless), as in the assistant.
  await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: data instanceof Uint8Array ? data : new Uint8Array(data) });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}
