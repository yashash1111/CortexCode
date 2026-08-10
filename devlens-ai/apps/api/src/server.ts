import app from './app';
import dotenv from 'dotenv';
import './jobs/workers/indexing.worker'; 
import './jobs/workers/pr_review.worker'; 

dotenv.config();

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Background workers initialized');
});
