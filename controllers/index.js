var express = require('express'),
    router = express.Router(),
    request = require('request');

router.use('/', require('./apiSummoner'));

router.get('/', function(req, res) {
  res.render('home.jade');
});

router.get('/summoner/:region/:id', function(req, res) {
  var region = req.params.region,
      id = req.params.id;
  
  res.render('summoner', {region: region, id: id});
});

module.exports = router;