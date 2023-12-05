import express from 'express';
import initializeRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 5000;

// express.json() middleware
app.use(express.json({ limit: '200mb' }));

// Initialize routes
initializeRoutes(app);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
