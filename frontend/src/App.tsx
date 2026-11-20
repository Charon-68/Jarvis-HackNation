/**
 * Root: "/" renders the landing page, "/app" the console. Both are lazy
 * chunks, so the landing never downloads the voice SDK or session code,
 * and the console never downloads the landing's 3D scene.
 */
import { lazy, Suspense } from "react";
import { flag, navigate, useRoute } from "./lib/route";

const Landing = lazy(() => import("./landing/Landing"));
const ConsoleApp = lazy(() => import("./console/ConsoleApp"));

const blank = <div style={{ height: "100svh", background: "#09090b" }} />;

export default function App() {
  const route = useRoute();
  const showConsole = route === "app" || flag("legacy") === "1";

  return (
    <Suspense fallback={blank}>
      {showConsole ? <ConsoleApp /> : <Landing onLaunch={() => navigate("app")} />}
    </Suspense>
  );
}
