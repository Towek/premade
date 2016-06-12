var express = require('express'),
    router = express.Router(),
    request = require('request'),
    log = require('bunyan').createLogger({name: 'premade'});

router.get('/summoner/:region/:id', function(req, res) {
  var region = req.params.region,
      id = req.params.id;
  request('https://' + region + '.api.pvp.net/api/lol/' + region + '/v1.4/summoner/' + id + '?api_key=' 
  + process.env.KEY, function(e, r, b) {
    if(e) {
      log.error(e);
    } else {
      if(r.statusCode == 200) {
        b = JSON.parse(b);
        getMatchlist(id, region, function(e, matches) {
          res.json(matches.length);
        });
      } else {
        log.error(r.statusCode);
        res.json({success: false});
      }
    }

  });
});

function getMatchlist(id, region, cb) {
  request('https://' + region + '.api.pvp.net/api/lol/' + region + '/v2.2/matchlist/by-summoner/'
  + id + '?api_key=' + process.env.KEY, function(e, r, b) {
    if(e) {
      log.error(e);
    } else {
      if(r.statusCode == 200) {
        b = JSON.parse(b);
        var matches = b.matches;
        cb(null, matches);
      } else {
        log.error(r.statusCode);
      }
    }
  });
}

module.exports = router;