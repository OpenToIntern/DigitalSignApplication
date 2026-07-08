import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Status route
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    message: 'Digital Sign Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Mock document API route placeholder
app.get('/api/documents', (req: Request, res: Response) => {
  res.json({
    message: 'Endpoint ready for database integration',
    documents: []
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
