var express = require('express'),
    router = express.Router(),
    request = require('request'),
    log = require('bunyan').createLogger({name: 'premade'});

router.post('/', function(req, res) {
  if(!req.body.key || !req.body.region) {
    res.redirect('/');
  }
  var key = req.body.key.toLowerCase().replace(' ', ''),
      region = req.body.region.toLowerCase();

  request('https://' + region + '.api.pvp.net/api/lol/' + region
  + '/v1.4/summoner/by-name/' + key + '?api_key=' + process.env.KEY, function(e, r, b) {
    if(e) {
      log.error(e);
    } else {
      if(r.statusCode == 200) {
        b = JSON.parse(b)[key];
        res.redirect('/summoner/' + region + '/' + b.id);
      } else {
        log.error(r.statusCode);
        res.redirect('/');
      }
    }
  });
});

router.get('/api/summoner/:region/:id', function(req, res) {
  console.time('all');
  var region = req.params.region,
      id = Number(req.params.id);
  request('https://' + region + '.api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/'
  + toPlatform(region) + '/' + id + '?api_key=' + process.env.KEY, function(e, r, b) {
    if(e) {
      log.error(e);
      res.json({success: false});
    } else {
      if(r.statusCode == 200) {
        var game = JSON.parse(b),
            matchlists = [];
        for(var i = 0, len = game.participants.length; i < len; i++) {
          getMatchlist(game.participants[i].summonerId, region, function(e, matches) {
            if(e) {
              matchlists.push(game.participants[i].summonerId);
            } else {
              matchlists.push(matches);
            }
          });
        }
        var oldLength = 0, matchlistsCheck = setInterval(function() {
          var matchlistsLen = matchlists.length;
          if(matchlistsLen > oldLength) {
            oldLength = matchlistsLen;
            log.info(matchlistsLen + " matchlists so far.");
          }
          if(matchlistsLen == game.participants.length) {
            clearInterval(matchlistsCheck);
            console.timeEnd('all');
            res.json({
              participants: game.participants,
              matchlists: matchlists
            });
          }
        }, 100);
      } else {
        log.error(r.statusCode);
        res.status(r.statusCode);
        res.json({success: false});
      }
    }
  });
});

function getMatchlist(id, region, cb) {
  request('https://' + region + '.api.pvp.net/api/lol/' + region + '/v2.2/matchlist/by-summoner/'
  + id + '?beginIndex=0&endIndex=100&api_key=' + process.env.KEY, function(e, r, b) {
    if(e) {
      log.error(e);
    } else {
      if(r.statusCode == 200) {
        b = JSON.parse(b);
        cb(null, b.matches);
      } else if (r.statusCode == 429) {;
        setTimeout(getMatchlist(id, region, cb), r.headers.retry_after * 1000);
      } else {
        log.error(r.statusCode);
        cb(r.statusCode);
      }
    }
  });
}

function toPlatform(region) {
  return {
    eune: 'EUN1',
    euw: 'EUW1',
    br: 'BR1',
    jp: 'JP1',
    kr: 'KR',
    lan: 'LA1',
    las: 'LA2',
    na: 'NA1',
    oce: 'OC1',
    ru: 'RU',
    tr: 'TR1'
  }[region];
};

module.exports = router;