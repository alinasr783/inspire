import type jsPDF from "jspdf";

const PAGE_BREAK_TOKEN = "__PAGE_BREAK_TOKEN__";

export async function generatePdf(htmlContent: string): Promise<Blob> {
  const [html2canvasModule, jsPDFModule] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const html2canvas = html2canvasModule.default;
  const JsPDF = jsPDFModule.default as typeof jsPDF;

  // Replace page break divs with a token, then split
  const cleanHtml = htmlContent.replace(
    /<div\s[^>]*page-break-after[^>]*>[\s\S]*?<\/div>/gi,
    PAGE_BREAK_TOKEN
  );
  const pages = cleanHtml.split(PAGE_BREAK_TOKEN).filter((p) => p.trim());

  const pdf = new JsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const pageHeight = 297;

  for (let i = 0; i < pages.length; i++) {
    const container = document.createElement("div");
    container.innerHTML = pages[i];
    container.style.direction = "rtl";
    container.style.fontFamily = "'Cairo', 'Amiri', serif";
    container.style.fontSize = "14px";
    container.style.lineHeight = "2";
    container.style.color = "#000";
    container.style.padding = "30px";
    container.style.width = "210mm";
    container.style.background = "#fff";
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

    // If content overflows one page, add continuation pages
    let heightLeft = imgHeight - pageHeight;
    let position = -pageHeight;
    while (heightLeft > 0) {
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      position -= pageHeight;
      heightLeft -= pageHeight;
    }
  }

  const blob = pdf.output("blob");
  return blob as Blob;
}
