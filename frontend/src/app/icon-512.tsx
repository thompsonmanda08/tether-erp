import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 512,
  height: 512,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 380,
        background: "#0c54e7",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        borderRadius: 100,
      }}
    >
      L
    </div>,
    {
      ...size,
    },
  );
}
