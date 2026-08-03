import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <div
          style={{
            width: "60%",
            height: "60%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#06c167",
            borderRadius: "25%",
          }}
        >
          <span
            style={{
              fontSize: 70,
              fontWeight: 800,
              color: "#000000",
              fontFamily: "sans-serif",
            }}
          >
            IN
          </span>
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
