export async function generatePdf(htmlContent: string): Promise<Blob> {
  try {
    const html2pdf = (await import("html2pdf.js")).default as never;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = htmlContent;
    wrapper.style.fontFamily = "'Cairo', 'Amiri', serif";
    wrapper.style.direction = "rtl";
    wrapper.style.padding = "20px";
    wrapper.style.fontSize = "14px";
    wrapper.style.lineHeight = "1.8";
    wrapper.style.color = "#000";
    wrapper.style.width = "210mm";
    wrapper.style.position = "fixed";
    wrapper.style.left = "-9999px";
    wrapper.style.top = "0";
    document.body.appendChild(wrapper);

    const opt = {
      margin: [10, 15, 10, 15] as [number, number, number, number],
      filename: "contract.pdf",
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait" as const,
      },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] as const },
    };

    const pdf = await (html2pdf as any)().set(opt).from(wrapper).outputPdf("blob");
    document.body.removeChild(wrapper);
    return pdf as Blob;
  } catch {
    throw new Error("PDF_GENERATION_FAILED");
  }
}
