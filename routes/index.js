import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

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

  router.post('/users', (request, response) => {
    UsersController.postNew(request, response);
  });
}

export default routing;
