import { createApp } from './app';

const PORT = process.env.PORT ?? 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`ExpenseFlow API running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
