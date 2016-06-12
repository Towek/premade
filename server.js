
var mongoose = require('mongoose'),
    express = require('express'),
    app = express(),
    router = express.Router(),
    http = require('http').Server(app),
    bodyParser = require('body-parser'),
    bunyan = require('bunyan'),
    log = bunyan.createLogger({
      name: 'premade'
    });
    
// Express config
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

port = process.env.PORT || 3000

// Database
var mongouri = process.env.MONGOURI || 'mongodb://localhost/premade';
mongoose.connect(mongouri);
db = mongoose.connection;
db.on('error', function(e) {
  log.error(e);
});
db.once('open', function() {
  log.info('Database connected.');
});

//Models


//Routes
app.use(require('./controllers'));

http.listen(port, function() {
  log.info('Listening on port ' + port + '...');
});