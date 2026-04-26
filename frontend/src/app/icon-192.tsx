import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 140,
        background: "#0c54e7",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        borderRadius: 40,
      }}
    >
      L
    </div>,
    {
      ...size,
    },
  );
}
