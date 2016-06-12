var express = require('express'),
    router = express.Router();

router.use('/', require('./summoner'));

router.get('/', function(req, res) {
  res.render('home.jade');
});

module.exports = router;