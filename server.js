import routing from './routes';

const express = require('express');

const PORT = process.env.PORT || 5000;

const app = express();

app.use(express.json());

routing(app);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
