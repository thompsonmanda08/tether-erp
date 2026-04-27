import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Tether-ERP - Enterprise Procurement Management System";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Image generation
export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #0c54e7 0%, #0a3fb8 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "80px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: "bold",
            lineHeight: 1.2,
            marginBottom: "30px",
            textAlign: "center",
          }}
        >
          Tether-ERP
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: "normal",
            opacity: 0.95,
            textAlign: "center",
            maxWidth: "900px",
          }}
        >
          Enterprise Procurement Management
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: "normal",
            opacity: 0.85,
            marginTop: "30px",
            textAlign: "center",
          }}
        >
          Streamline procurement, workflows & collaboration
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
