"use client";

import { colors, fonts } from "@/lib/theme";

export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      data-no-print="true"
      style={{
        position: "fixed",
        bottom: 22,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 70,
        background: "#1c2024",
        color: "#fff",
        borderRadius: 5,
        padding: "10px 16px",
        fontSize: 12.5,
        fontFamily: fonts.sans,
        boxShadow: colors.toastShadow
      }}
    >
      {message}
    </div>
  );
}
