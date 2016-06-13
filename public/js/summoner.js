$(document).ready(function() {
  $.ajax({
    type: 'GET',
    dataType: 'json',
    url: '/api/summoner/' + region + '/' + id,
    success: function(r) {
      console.log(r);
      var team1 = []
          team2 = [];
      for(var i = 0, len = r.participants.length; i < len; i++) {
        if(r.participants[i].teamId == 100) {
          team1.push(r.participants[i]);
        } else {
          team2.push(r.participants[i]);
        }
      }
    }
  });
});