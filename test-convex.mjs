import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "http://127.0.0.1:3210");

async function test() {
  console.log("Creating session...");
  const sessionId = await client.mutation(api.stage.createSession);
  console.log("Session ID:", sessionId);

  console.log("\nWriting file...");
  await client.mutation(api.stage.writeFile, {
    sessionId,
    path: "/app/App.tsx",
    content: `export default function App() {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>Hello from Convex! 🎉</h1>
      <p>This component was stored in Convex and rendered via react-runner.</p>
    </div>
  );
}`
  });
  console.log("File written.");

  console.log("\nTriggering render...");
  const result = await client.mutation(api.stage.triggerRender, { sessionId });
  console.log("Render triggered:", result);

  console.log("\nReading render state...");
  const state = await client.query(api.stage.getRenderState, { sessionId });
  console.log("Render state:", state);

  console.log("\n✅ Success! Open http://localhost:3000/s/" + sessionId);
}

test().catch(console.error);
