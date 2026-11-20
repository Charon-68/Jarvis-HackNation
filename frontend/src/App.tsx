/**
 * Root: "/" renders the landing page, "/app" the console. Both are lazy
 * chunks, so the landing never downloads the voice SDK or session code,
 * and the console never downloads the landing's 3D scene.
 */
import { lazy, Suspense } from "react";
import { navigate, useRoute } from "./lib/route";

const Landing = lazy(() => import("./landing/Landing"));
const ConsoleApp = lazy(() => import("./console/ConsoleApp"));

const blank = <div style={{ height: "100svh", background: "#09090b" }} />;

export default function App() {
  const route = useRoute();
  const showConsole = route === "app";

  return (
    <Suspense fallback={blank}>
      {showConsole ? <ConsoleApp /> : <Landing onLaunch={() => navigate("app")} />}
    </Suspense>
  );
}
