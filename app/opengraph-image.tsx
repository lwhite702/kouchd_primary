import { ImageResponse } from "next/og";

export const alt = "Kouchd — shared stays, made clear";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f0e8",
        color: "#17251f",
        fontFamily: "Arial, sans-serif",
      }}>
        <div style={{
          width: 1080,
          height: 510,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "58px 72px",
          borderRadius: 34,
          border: "2px solid #ded8ce",
          background: "#fffdf8",
          boxSizing: "border-box",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 12, background: "#dff25e", display: "flex" }} />
            <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-2px", color: "#184f3a" }}>kouchd</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 4, color: "#59675f" }}>A SHARED STAY, MADE CLEAR</div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 60, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-2px", color: "#184f3a" }}><span>Your space. Your people.</span><span>Everyone on the same page.</span></div>
            <div style={{ fontSize: 25, color: "#59675f" }}>Stay agreements, house details, contribution records, and chores.</div>
          </div>
          <div style={{ width: 96, height: 8, borderRadius: 8, background: "#dff25e" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
