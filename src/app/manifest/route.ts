import { getCrmLogoUrl } from "@/lib/crm-actions";

export async function GET() {
  const logoUrl = await getCrmLogoUrl();

  const manifest = {
    name: "Inspire CRM",
    short_name: "Inspire",
    description: "CRM for Inspire Real Estate",
    start_url: "/ar",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#06c167",
    orientation: "portrait-primary",
    icons: logoUrl
      ? [
          { src: logoUrl, sizes: "192x192", type: "image/png" },
          { src: logoUrl, sizes: "512x512", type: "image/png" },
        ]
      : [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
  };

  return Response.json(manifest);
}
