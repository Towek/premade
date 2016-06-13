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
        console.time('matchlists');
        for(var i = 0, len = game.participants.length; i < len; i++) {
          var participant = game.participants[i];
          getMatchlist(participant, region, function(e, summoner) {
            if(e) {
              matchlists.push(e);
            } else {
              matchlists.push(summoner);
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
            console.timeEnd('matchlists');
            //res.json(matchlists);
            computeMatchlists(matchlists, function(e, matches1, matches2) {
              console.timeEnd('all');
              res.json({
                matches1: matches1,
                matches2: matches2
              });
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

function getMatchlist(participant, region, cb) {
  console.time('getMatchlist');
  request('https://' + region + '.api.pvp.net/api/lol/' + region + '/v2.2/matchlist/by-summoner/'
  + participant.summonerId + '?beginIndex=0&endIndex=200&api_key=' + process.env.KEY, function(e, r, b) {
    if(e) {
      log.error(e);
      console.timeEnd('getMatchlist');
      cb(e);
    } else {
      if(r.statusCode == 200) {
        b = JSON.parse(b);
        console.timeEnd('getMatchlist');
        cb(null, {
          participant: participant,
          matches: b.matches
        });
      } else if (r.statusCode == 429) {
        console.timeEnd('getMatchlist');
        setTimeout(getMatchlist(participant, region, cb), r.headers.retry_after * 1000);
      } else {
        log.error(r.statusCode);
        console.timeEnd('getMatchlist');
        cb(r.statusCode);
      }
    }
  });
}

function computeMatchlists(matchlists, cb) {
  console.time('computeMatchlists');
  var matchlists1 = [],
      matchlists2 = [],
      matches1 = {},
      matches2 = {};

  // assign summoners to teams (matchlists1 = summoners from teamId = 100 etc.)
  for(var i = 0, len = matchlists.length; i < len; i++) {
    if(!matchlists[i].participant) continue;
    if(matchlists[i].participant.teamId == 100) {
      matchlists1.push(matchlists[i]);
    } else {
      matchlists2.push(matchlists[i]);
    }
  }

  // write all matches played by summoners from team 100 and push summoners that were playing it
  for(var i = 0, leni = matchlists1.length; i < leni; i++) {
    var summoner = matchlists1[i];
    if(!summoner.matches) continue;
    for(var j = 0, lenj = summoner.matches.length; j < lenj; j++) {
      var match = summoner.matches[j];
        if(matches1[match.matchId]) {
          matches1[match.matchId].push(summoner.participant.summonerName);
        } else {
          matches1[match.matchId] = [summoner.participant.summonerName];
        }
    }
  }

  // write all matches played by summoners from team 200 and push summoners that were playing it
  for(var i = 0, leni = matchlists2.length; i < leni; i++) {
    var summoner = matchlists2[i];
    if(!summoner.matches) continue;
    for(var j = 0, lenj = summoner.matches.length; j < lenj; j++) {
      var match = summoner.matches[j];
        if(matches2[match.matchId]) {
          matches2[match.matchId].push(summoner.participant.summonerName);
        } else {
          matches2[match.matchId] = [summoner.participant.summonerName];
        }
    }
  }

  // delete matches that were played by only one summoner in team 100
  for(var key in matches1) {
    if(matches1[key].length < 2) {
      delete matches1[key];
    }
  }

  // same but for team 200
  for(var key in matches2) {
    if(matches2[key].length < 2) {
      delete matches2[key];
    }
  }

  var team1 = {},
      team2 = {};

  for(var i = 0, len = matchlists1.length; i < len; i++) {
    var summoner = matchlists1[i];
    team1[summoner.participant.summonerName] = {};
    for(var key in matches1) {
      if(matches1[key].indexOf(summoner.participant.summonerName) > -1) {                     
        for(var j = 0, lenj = matches1[key].length; j < lenj; j++) {
          if(team1[summoner.participant.summonerName][matches1[key][j]]) {
            team1[summoner.participant.summonerName][matches1[key][j]] += 1;
          } else {
            team1[summoner.participant.summonerName][matches1[key][j]] = 1;
          }
        }
      }
    }
    delete team1[summoner.participant.summonerName][summoner.participant.summonerName];
  }

  for(var i = 0, len = matchlists2.length; i < len; i++) {
    var summoner = matchlists2[i];
    team2[summoner.participant.summonerName] = {};
    for(var key in matches2) {
      if(matches2[key].indexOf(summoner.participant.summonerName) > -1) {  
        for(var j = 0, lenj = matches2[key].length; j < lenj; j++) {
          if(team2[summoner.participant.summonerName][matches2[key][j]]) {
            team2[summoner.participant.summonerName][matches2[key][j]] += 1;
          } else {
            team2[summoner.participant.summonerName][matches2[key][j]] = 1;
          }
        }
      }
    }
    delete team2[summoner.participant.summonerName][summoner.participant.summonerName];
  }

  console.timeEnd('computeMatchlists');
  cb(null, team1, team2);
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