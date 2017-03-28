// Copyright (C) 2017 Louis de Charsonville
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3 as
// published by the Free Software Foundation.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.


// EXTERNAL MODULES
var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser');

// PARAMS 
var cal = require('./routes/cal');
var app = express();
var port = process.env.PORT || 8080;


app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use('/',express.static(__dirname + '/public/'));

// Calendar
// --------
app.get('/cal/:cals', cal.getCals);
app.get('/cal',cal.getFormCal);
app.post('/createCal',cal.sendCal);
app.post('/cal/createCal',cal.sendCal);

app.get('/status',function(req,res){
    res.set('Content-Type','text/plain');
    res.send('OK');
});

// 404
app.get('*', function(req, res){
    res.status(404).send("ERROR 404 - NO ROUTES");
});

app.listen(port, function() {
    console.log('Our app is running on port '+ port);
});

// Very dangerous
process.on('uncaughtException', (err) => {
     console.log(`Caught exception: ${err}`);
});
