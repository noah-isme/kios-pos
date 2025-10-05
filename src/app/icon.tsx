import { ImageResponse } from "next/server";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
          color: "#f9fafb",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        POS
      </div>
    ),
    {
      ...size,
    }
  );
}
