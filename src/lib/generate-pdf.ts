import type jsPDF from "jspdf";

const PAGE_BREAK_TOKEN = "__PAGE_BREAK_TOKEN__";
const A4_WIDTH_PX = 794;  // 210mm at 96dpi
const A4_HEIGHT_PX = 1123; // 297mm at 96dpi

async function loadFonts() {
  if (!document.fonts) return;
  const fonts = ["Cairo", "Amiri", "Reem Kufi", "Aref Ruqaa"];
  await Promise.all(fonts.map((f) => document.fonts.load(`14px "${f}"`)));
}

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

  await loadFonts();

  const pdf = new JsPDF("p", "mm", "a4");
  const pageW_mm = 210;
  const pageH_mm = 297;

  for (let i = 0; i < pages.length; i++) {
    const container = document.createElement("div");
    container.innerHTML = pages[i];
    container.setAttribute("dir", "rtl");
    container.style.cssText = `
      direction: rtl;
      font-family: 'Cairo', 'Amiri', serif;
      font-size: 14px;
      line-height: 2;
      color: #000;
      background: #fff;
      padding: 25mm 20mm;
      width: ${A4_WIDTH_PX}px;
      box-sizing: border-box;
      position: fixed;
      left: -9999px;
      top: 0;
    `;
    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: A4_WIDTH_PX,
      windowHeight: container.scrollHeight,
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    if (i > 0) pdf.addPage();

    const canvasRatio = canvas.height / canvas.width;
    const imgW_mm = pageW_mm;
    const imgH_mm = imgW_mm * canvasRatio;

    pdf.addImage(imgData, "JPEG", 0, 0, imgW_mm, imgH_mm);

    // If page content is taller than A4, add continuation pages
    let remainingH = imgH_mm - pageH_mm;
    let yOffset = -pageH_mm;
    while (remainingH > 0) {
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, yOffset, imgW_mm, imgH_mm);
      yOffset -= pageH_mm;
      remainingH -= pageH_mm;
    }
  }

  const blob = pdf.output("blob");
  return blob as Blob;
}
