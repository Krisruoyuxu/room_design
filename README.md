<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1qzLcK53o7QUki8DKStvPPUb6he4HIT4C

## Run Locally

**Prerequisites:** Node.js 18+

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Gemini API Key:**
   - Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Update `.env.local`:
   ```dotenv
   GEMINI_API_KEY=your-api-key-here
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000/`

4. **Build for production:**
   ```bash
   npm run build
   ```

For detailed setup instructions, see [SETUP_LOCAL.md](./SETUP_LOCAL.md)
