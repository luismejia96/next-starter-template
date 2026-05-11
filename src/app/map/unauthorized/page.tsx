/**
 * /map/unauthorized – shown by middleware when the MAP_VIEW_SECRET
 * header/cookie is missing or invalid.
 */
export default function MapUnauthorized() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <h1 style={{ fontSize: "48px", margin: "0 0 16px" }}>🔒</h1>
      <h2 style={{ fontSize: "24px", margin: "0 0 12px" }}>Unauthorized</h2>
      <p style={{ color: "#94a3b8", maxWidth: "420px" }}>
        Access to the map requires a valid{" "}
        <code
          style={{
            background: "#1e293b",
            padding: "2px 6px",
            borderRadius: "4px",
          }}
        >
          X-MAP-SECRET
        </code>{" "}
        header or{" "}
        <code
          style={{
            background: "#1e293b",
            padding: "2px 6px",
            borderRadius: "4px",
          }}
        >
          map_secret
        </code>{" "}
        cookie. See the README for setup instructions.
      </p>
    </div>
  );
}
