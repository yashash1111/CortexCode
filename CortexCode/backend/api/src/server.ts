import 'dotenv/config';
import app from './app';
import './jobs/workers/indexing.worker';
import './jobs/workers/pr_review.worker';
import './jobs/workers/doc_ingestion.worker';
import { validateAIConfigAtStartup } from './modules/ai/services/aiConfig';

const PORT = process.env.PORT || 3001;

validateAIConfigAtStartup();

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Background workers initialized');
});
