var express = require('express'),
    router = express.Router(),
    request = require('request'),
    log = require('bunyan').createLogger({name: 'premade'});

router.get('/summoner/:region/:id', function(req, res) {
  var region = req.params.region,
      id = Number(req.params.id);
  request('https://' + region + '.api.pvp.net/api/lol/' + region + '/v1.4/summoner/' + id + '?api_key=' 
  + process.env.KEY, function(e, r, b) {
    if(e) {
      log.error(e);
    } else {
      if(r.statusCode == 200) {
        b = JSON.parse(b);
        getMatchlist(id, region, function(e, matches) {
          var matchIds = [];
          for(var i = 0; i < 500; i++ ) {
            matchIds.push(matches[i].matchId);
          }
          getMatch(matchIds, region, id, {
            ids: {},
            games: 0
          }, function(e, data) {
            res.json(data);
          });
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

function getMatch(matchIds, region, id, data, cb) {
  request('https://' + region + '.api.pvp.net/api/lol/' + region + '/v2.2/match/'
  + matchIds[0] + '?api_key=' + process.env.KEY, function(e, r, b) {
    if (e) {
      log.error(e);
    } else {
      if(r.statusCode == 200) {
        var match = JSON.parse(b),
            checkedParticipantId,
            checkedParticipantTeam;
        // find checked participant's id
        for(var i = 0, len = match.participantIdentities.length; i < len; i++) {
          if(match.participantIdentities[i].player.summonerId == id) {
            checkedParticipantId = match.participantIdentities[i].participantId;
          }
        }
        // find checked participant's team
        for(var i = 0, len = match.participants.length; i < len; i++) {
          if(match.participants[i].participantId == checkedParticipantId) {
            checkedParticipantTeam = match.participants[i].teamId;
          }
        }
        // collect all participants with all needed data to array
        for(var i = 0, len = match.participantIdentities.length; i < len; i++) {
          for(var j = 0, len = match.participants.length; j < len; j++) {
            if(match.participantIdentities[i].participantId == match.participants[j].participantId
            && match.participants[j].teamId == checkedParticipantTeam
            && match.participantIdentities[i].participantId != checkedParticipantId) {
              if(data.ids[match.participantIdentities[i].player.summonerId]) {
                data.ids[match.participantIdentities[i].player.summonerId]++;
              } else {
                data.ids[match.participantIdentities[i].player.summonerId] = 1;
              }
            }
          }
        }
        data.games++;
        
        matchIds.shift();
        if(matchIds.length) {
          getMatch(matchIds, region, id, data, cb);
        } else {
          cb(null, data);
        }
      } else {
        log.error(r.statusCode);
        cb(r.statusCode, data);
      }
    }
  });
}

module.exports = router;