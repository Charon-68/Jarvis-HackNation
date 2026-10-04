# Deployment Guide

To deploy your complete AI Apprentice hackathon project, follow these 3 straightforward steps:

### 1. Deploy the Backend (Person 3)
*   Host the FastAPI server on a platform like Render, Railway, or Fly.io.
*   Set environment variables: `ANTHROPIC_API_KEY` (and optional `ELEVENLABS_API_KEY`).
*   Copy the deployed public backend URL (e.g., `https://your-backend.onrender.com`).

### 2. Deploy the Frontend (Person 1)
*   Connect the Lovable / React GitHub repo to Vercel or Netlify.
*   Set the following environment variables in your Vercel project settings:
    ```env
    VITE_ELEVENLABS_APPRENTICE_AGENT_ID=<YOUR_APPRENTICE_AGENT_ID>
    VITE_ELEVENLABS_TRAINEE_AGENT_ID=<YOUR_TRAINEE_AGENT_ID>
    VITE_BACKEND_API_URL=https://your-backend.onrender.com
    ```

### 3. Run the Live Demo Rehearsal
*   Senior expert reviews complaints in the spreadsheet while the AI Apprentice listens and asks probing questions.
*   Run the teachback debrief to generate the Work Map timeline.
*   Switch to the Trainee tab to test the bilingual English/Hindi voice coach.
