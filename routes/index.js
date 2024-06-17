import AppController from '../controllers/AppController';

const express = require('express');

function routing(app) {
  const router = express.Router();
  app.use('/', router);

  router.get('/status', (request, response) => {
    AppController.getStatus(request, response);
  });

  router.get('/stats', (request, response) => {
    AppController.getStats(request, response);
  });
}

export default routing;
