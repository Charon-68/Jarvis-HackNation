import React from "react";
import ReactDOM from "react-dom/client";
import { ConversationProvider } from "@elevenlabs/react";
import Apprentice from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConversationProvider>
      <Apprentice />
    </ConversationProvider>
  </React.StrictMode>
);
