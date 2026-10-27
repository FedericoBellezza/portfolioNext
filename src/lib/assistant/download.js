// Download dei file generati dall'assistente. Client-only.

const MIME = { md: "text/markdown", txt: "text/plain" };

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Il browser ha bisogno di un attimo per avviare il download prima che l'URL sparisca.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** @param {{ name: string, format: string, content: string }} file */
export async function downloadFile(file) {
  if (file.format === "pdf") {
    const { buildPdf } = await import("./pdf");
    const doc = await buildPdf(file.content, { title: file.name.replace(/\.pdf$/, "") });
    saveBlob(doc.output("blob"), file.name);
    return;
  }
  saveBlob(new Blob([file.content], { type: `${MIME[file.format] ?? "text/plain"};charset=utf-8` }), file.name);
}
