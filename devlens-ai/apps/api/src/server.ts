import 'dotenv/config';
import app from './app';
import './jobs/workers/indexing.worker'; 
import './jobs/workers/pr_review.worker'; 

const PORT = process.env.PORT || 3001;

const geminiConfigured = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
console.log(`[Startup] Gemini configuration: ${geminiConfigured ? 'loaded' : 'missing'}`);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Background workers initialized');
});
