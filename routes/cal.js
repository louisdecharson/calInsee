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

var concat = require('concat-stream'),
    request = require('request'),
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    ical = require('ical-generator'),
    moment = require('moment-timezone'),
    forms = require('forms'),
    Nightmare = require('nightmare'),
    http = require('http');


// CALENDRIER
// ==========


function getMonth(mois) {
    if (mois == "janvier") {
        return "01";
    } else if (mois == "février") {
        return "02";
    } else if (mois == "mars") {
        return "03";
    } else if (mois == "avril") {
        return "04";
    } else if (mois == "mai") {
        return "05";
    } else if (mois == "juin") {
        return "06";
    } else if (mois == "juillet") {
        return "07";
    } else if (mois == "août") {
        return "08";
    } else if (mois == "septembre") {
        return "09";
    } else if (mois == "octobre") {
        return "10";
    } else if (mois == "novembre") {
        return "11";
    } else if (mois == "décembre") {
        return "12";
    } else {
        return "00";
    }
};

function getHour(heure) {
    var v = heure.split("h");
    var ret = "";
    if (v[0].length < 2) {
        v[0] = "0"+v[0];
        ret = v[0]+":"+v[1]+":00";
        return ret;
    } else {
        ret = v[0]+":"+v[1]+":00";
        return ret;
    }
};

function getDay(jour){
    var ret = "";
    if (jour.length < 2) {
        ret = "0"+jour;
        return ret;
    } else {
        ret = jour;
        return ret;
    }
}


// Construit le calendrier à partir de la liste des évenements
function buildCal(vecEv,alarms) {
    var cal = ical({
        domain: 'calinsee.herokuapp.com',
        name: 'Calendrier des publications Insee'
    });
    vecEv.forEach(function(it,ind){
        var myDate = it[1][2] + "-" + it[1][1] + "-" + it[1][0]+ "T" + getHour(it[1][3]);
        // var startDate = new Date(moment.tz(myDate,"Europe/Paris").format());
        var startDate = new Date(myDate);
        var endDate = new Date(startDate.getTime()+3600000);
        var event = cal.createEvent({
            start: startDate,
            end: endDate,
            summary: it[0],
            description: '',
            organizer: 'Insee <contact@insee.fr>'
        });
        if (Array.isArray(alarms)) {
            alarms.forEach(function(item,index){
                event.createAlarm({type: 'display', trigger: item*60});
            });
        } else if (typeof alarms != 'undefined') {
            event.createAlarm({type: 'display', trigger: alarms*60});
        }
    });
    return cal.toString();
};


// Créer la liste des évenements en fonction des publications sélectionnées
exports.getCals = function(req,res) {
    var nightmare = Nightmare();
    var alarms = req.query.alarm;
    var cals = req.params.cals.split('+');

    var url = 'https://www.insee.fr/fr/information/1405540';

    if (cals.length == 1 && cals[0] == "all") {
        url = url + '&taille=100&debut=0';
    } else {
        cals = cals.join('+');
        url = url + '?conjoncture=' + cals + '&taille=100&debut=0';
    }
    nightmare
    .goto(url)
    .wait('.echo-texte')
    .evaluate(function () {
        // return HTML for Cheerio
        return document.body.innerHTML; 
    })
    .end()
    .then(function(body) {
        var $ =  cheerio.load(body);
        var vecEv = [];
        $('div[class="echo-texte"]').each(function(i,e){
            var ev = $(this).children().first().text();
            var vectDate0 = $(this).children().eq(1).children().eq(1).text().split(" ");
            var vectDate = vectDate0[0].split("/").concat(vectDate0[2]);
            console.log(vectDate);
            vecEv.push([ev,vectDate]);
        });
        res.setHeader("Content-Type", 'text/calendar');
        res.send(buildCal(vecEv,alarms));
    })
    .catch(function(error){
        res.send(error);
    });
};


// FUNCTIONS JQUERY DANS LE HTML
// =============================
// function getUrl() {
//     var elementsCal = document.getElementsByName('cal');
//     var cals = [];
//     for(var i=0; i<elementsCal.length; i++) {
//         if (elementsCal[i].checked) {
//             cals.push(elementsCal[i].value);
//         }
//     }
//     cals = cals.join('+');
//     var alarms = [];
//     var elementsAlarm = document.getElementsByName('cal');
//     for(var i=0; i<elementsAlarm.length; i++) {
//         if (elementsAlarm[i].checked) {
//             alarms.push(elementsAlarm[i].value);
//         }
//     }
//     alarms = alarms.join('&alarm=');
//     var route = 'webcal://calinsee.herokuapp.com/cal' + cals ;
//     if (alarms.length > 0) {
//         route = route + '?alarm=' + alarms ;
//     }
//     document.getElementById('myUrl').innerHTML = route;
// }


// $(document).ready(function() {
//     $('.myCheckbox').click(function() {
//         var myElem = $(this).parents('a');
//         if (myElem.hasClass('aactive')) {
//             myElem.removeClass('aactive');
//         } else {
//             myElem.addClass('aactive');
//         }
//     });
// });
// =============================

// Construit la page Web formulaire
function buildForm(vecEv) {

    var header = '<title>Calendrier de l\'Insee</title>';
    var bootstrap4 = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.3/css/bootstrap.min.css" integrity="sha384-MIwDKRSSImVFAZCVLtU0LMDdON6KVCrZHyVQQj6e8wIEJkW4tvwqXrbMIya1vriY" crossorigin="anonymous"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.3/js/bootstrap.min.js" integrity="sha384-ux8v3A6CPtOTqOzMKiuo3d/DomGaaClxFYdCu2HPMBEkf6x2xiDyJ7gkXU0MWwaD" crossorigin="anonymous"></script>';
    var css = '<style>body {padding-left: 20px; padding-top:10px; padding-right:20px;} .scrollable-form {height: 300px !important; overflow:auto;}#myUrl {background-color: #e0e0eb; border: 1px solid transparent; border-radius: 4px; padding: 6px 12px; vertical-align: middle; display:inline-block;} .aactive { z-index: 2; color: #ffffff !important; text-decoration: none; background-color: #0275d8; border-color: #0275d8;}</style>';
    var script = "<script>function getUrl() { var elementsCal = document.getElementsByName('cal'); var cals = []; for(var i=0; i<elementsCal.length; i++) { if (elementsCal[i].checked) { cals.push(elementsCal[i].value); } } cals = cals.join('+'); var alarms = []; var elementsAlarm = document.getElementsByName('alarm'); for(var i=0; i<elementsAlarm.length; i++) { if (elementsAlarm[i].checked) { alarms.push(elementsAlarm[i].value); } } alarms = alarms.join('&alarm='); var route = 'webcal://calinsee.herokuapp.com/cal/' + cals ; if (alarms.length > 0) { route = route + '?alarm=' + alarms ; } document.getElementById('myUrl').innerHTML = route; }; $(document).ready(function() { $('.myCheckbox').click(function() { var myElem = $(this).parents('a'); if (myElem.hasClass('aactive')) { myElem.removeClass('aactive'); } else { myElem.addClass('aactive'); } }); });</script>";
    
    var githubRibbon = '<a href="https://github.com/louisdecharson/eviewsSDMX"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_red_aa0000.png"></a>';
    var footer = '</br><hr></hr><font size="2"><p>Credits : <a href="https://github.com/louisdecharson/">https://github.com/louisdecharson/</a></p></font>';
    var jQuery = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>';

    
    var body = '<div class="jumbotron"><h1 class = "display-3">Les dates des publications de l\'Insee dans votre calendrier</h1>';
    body += '<p class="lead">Cette page web vous permet de sélectionner les publications de l\'Insee qui vous intéressent pour créer une alerte dans votre calendrier de leur date de sortie</p></div><hr class="m-y-2">';
    body += '<h4>Comment faire ?</h4>';
    body += '<ul><li>(i) Sélectionnez les publications pour lesquels vous souhaitez créer un événement</li>';
    body += '<li>(ii) Ajoutez une alerte (facultatif) </li>';
    body += '<li>(iii) Créer le calendrier correspondant ou générez une URL vers ce calendrier </li></ul><br>';
    body += '<h4>Sélectionnez les publications : </h4>';
    var form = '<form action="createCal" method="POST"><div class="form-group">';

    vecEv.forEach(function(it,ind) {
        if (ind==0){
            form += '<label class="c-input c-checkbox"><input type="checkbox" name="cal" value="all"><span class="c-indicator"></span><strong> Toutes les publications</strong></label><br><i>ou</i><br><div class="scrollable-form"><div class="list-group">';
        } else {
            form += '<a class="list-group-item anchor" style="height: 30px; padding: 5px 15px;"><label class="c-input c-radio"><input class="myCheckbox" type="checkbox" name="cal" value="'+ it[0] + '"><span class="c-indicator"></span> '+ it[1]  +'</label></a>';
        };
    });
    form += '</div></div>';
    form += '<br><strong>Ajoutez une alarme</strong><br><input type="checkbox" name="alarm" value="15"> 15mn avant<br>';
    form += '<input type="checkbox" name="alarm" value="60"> 1 heure avant<br>';
    form += '<input type="checkbox" name="alarm" value="1440"> 1 jour avant<br>';
    form += '<input type="checkbox" name="alarm" value="2880"> 2 jours avant<br>';
    form += '<br><input type="submit" class="btn btn-primary" name="createCal" value="Créer calendrier">';
    form += ' <input type="button" class="btn btn-success" onclick="getUrl()" value="Obtenir l\'url"></div>';
    form += '<p id="myUrl" class="form-text"></p>';
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + jQuery + header + bootstrap4 + css + script + '</header><body>' + githubRibbon + body + form + footer + '</body>' + '</html>';
    return myHtml;
    
};

// Va chercher la liste des publications
exports.getFormCal = function(req,res) {
    var nightmare = Nightmare();
    nightmare
        .goto('https://www.insee.fr/fr/information/1405540')
        .wait('.echo-texte')
        .evaluate(function () {
            // return HTML for Cheerio
            return document.body.innerHTML; 
        })
        .end()
        .then(function(body) {
            var $ =  cheerio.load(body);
            var vecEv = [];
            $('li[class="branche"]').each(function(i,element) {
                var id = $(this).attr('data-id');
                var nom = $(this).children().children().children().eq(1).children().eq(0).text();
                vecEv.push([id,nom]);
            });
            res.send(buildForm(vecEv));
        })
        .catch(function(error){
            res.send(error);
        });
};

exports.sendCal = function(req,res) {
    var cals = req.body.cal;
    var alarms = req.body.alarm;
    var route = '';
    if (Array.isArray(cals) && cals.length > 1) {
        cals = cals.join("+");
    };
    if (Array.isArray(alarms) && alarms.length > 1) {
        alarms = alarms.join("&alarm=");
    };
    if (typeof alarms != 'undefined') {
        route = "/cal/" + cals + '?alarm=' + alarms;
    } else {
        route = "/cal/" + cals;
    }
    res.redirect(route);
};

// Germany Calendar
const de_ipi = 'https://www.destatis.de/EN/PressServices/Press/preview/Events/ProductionIndex.html';
const de_mno = 'https://www.destatis.de/EN/PressServices/Press/preview/Events/ManufacturingNewOrders.html';
const de_pmi = 'https://www.markiteconomics.com/public/page.mvc/diaryofreleasedates';
const de_gdp = 'https://www.destatis.de/EN/PressServices/Press/preview/Events/GDP.html';


function getDestatis(url,v,cb) {
    request(url,function(e,r,h){
        if (!e & r.statusCode == 200) {
            var $ = cheerio.load(h);
            $('tbody').children('tr.termin').each(function(i,e){
                var time = new Date($(this).children('td.voetermin').text() + ' 09:00'),
                    refPeriod = $(this).children('td.ref_period').text(),
                    title = $(this).children('td.title').text(),
                    comment = '';
                switch(title.trim().substring(0,2)) {
                case 'Pr':
                    switch(refPeriod.trim().substring(0,3).toLowerCase()){
                    case 'jan':
                        comment = 'GDP Q1 - 3rd estimation';
                        break;
                    case 'feb':
                        comment = 'GDP Q1 - 4th estimation';
                        break;
                    case 'apr':
                        comment = 'GDP Q2 - 3rd estimation';
                        break;
                    case 'may':
                        comment = 'GDP Q2 - 4th estimation';
                        break;
                    case 'july':
                        comment = 'GDP Q3 - 3rd estimation';
                        break;
                    case 'aug':
                        comment = 'GDP Q3 - 4th estimation';
                        break;
                    case 'oct':
                        comment = 'GDP Q4 - 3rd estimation';
                        break;
                    case 'nov':
                        comment = 'GDP Q4 - 4th estimation';
                        break;
                    default:
                        comment = '';
                        break;
                    }
                    break;
                case 'In':
                    switch(refPeriod.trim().substring(0,3).toLowerCase()){
                    case 'dec':
                        comment = 'GDP Q1 - 2nd estimation';
                        break;
                    case 'mar':
                        comment = 'GDP Q2 - 2nd estimation';
                        break;
                    case 'jun':
                        comment = 'GDP Q3 - 2nd estimation';
                        break;
                    case 'sep':
                        comment = 'GDP Q4 - 2nd estimation';
                        break;
                    default:
                        comment = '';
                    }
                    break;
                case 'Gr':
                    comment = 'GDP - ' + $(this).children('td.add_info').text();
                    break;
                default:
                    comment = title.substring(0,3);
                    break;
                }
                v.push([title,refPeriod,time,comment]);
            });
            cb(v);
        } 
    });
}


function getQuarter(date) {
    var monthIndex = date.getMonth();
    switch (true){
    case  monthIndex < 4:
        return '1';
        break;
    case monthIndex > 3 && monthIndex < 7:
        return '2';
        break;
    case monthIndex > 6 && monthIndex < 10:
        return '3';
        break;
    case monthIndex > 9 && monthIndex < 13:
        return '4';
        break;
    default:
        return '';
    }
}

function getRefPeriodPMI(date) {
    var monthNames = [
        "January", "February", "March",
        "April", "May", "June", "July",
        "August", "September", "October",
        "November", "December"
    ];
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return monthNames[monthIndex] + ' ' + year;
}

function getPMI(url,v,cb) {
    request(url,function(e,r,h) {
        if (!e & r.statusCode === 200) {
            var $ = cheerio.load(h);
            $('.releaseDateList').children('.listItem').each(function(i,e){
                var title = $(this).children('.releaseTitle').text().trim();
                if (title.indexOf('Germany Manufacturing PMI') > -1){
                    var date = $(this).prevAll('.listHeading').eq(0).text().trim() + ' ' + $(this).prevAll('.listSubHeading').eq(0).text().trim()+ ' ' + $(this).children('.calendarDate').text().substring(0,5),
                        time = new Date(date),
                        refPeriod = getRefPeriodPMI(time);
                    if (time.getMonth() === 1 || time.getMonth() === 4 || time.getMonth() === 7 || time.getMonth() == 10) {
                        var comment = 'GDP Q' + getQuarter(time) +' - 1st estimation';
                    } else {
                        var comment = '';
                    }
                    v.push([title,refPeriod,time,comment]);
                }
            });
            cb(v);
        } else {
            cb(v);
            console.log('Error in getPMI');
        }
    });
}


function formatDate(date) {
  var monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
  ];

  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();

  return day + ' ' + monthNames[monthIndex] + ' ' + year;
}

var bootstrap4 = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.3/css/bootstrap.min.css" integrity="sha384-MIwDKRSSImVFAZCVLtU0LMDdON6KVCrZHyVQQj6e8wIEJkW4tvwqXrbMIya1vriY" crossorigin="anonymous"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.3/js/bootstrap.min.js" integrity="sha384-ux8v3A6CPtOTqOzMKiuo3d/DomGaaClxFYdCu2HPMBEkf6x2xiDyJ7gkXU0MWwaD" crossorigin="anonymous"></script>';
var css = '<style display:none>body {padding-left: 10px; padding-right: 10px; } </style>';
var script = "<script>function getUrl() { var elementsCal = document.getElementsByName('cal'); var cals = []; for(var i=0; i<elementsCal.length; i++) { if (elementsCal[i].checked) { cals.push(elementsCal[i].value); } } cals = cals.join('+'); var alarms = []; var elementsAlarm = document.getElementsByName('alarm'); for(var i=0; i<elementsAlarm.length; i++) { if (elementsAlarm[i].checked) { alarms.push(elementsAlarm[i].value); } } alarms = alarms.join('&alarm='); var route = 'webcal://calinsee.herokuapp.com/cal/' + cals ; if (alarms.length > 0) { route = route + '?alarm=' + alarms ; } document.getElementById('myUrl').innerHTML = route; }; $(document).ready(function() { $('.myCheckbox').click(function() { var myElem = $(this).parents('a'); if (myElem.hasClass('aactive')) { myElem.removeClass('aactive'); } else { myElem.addClass('aactive'); } }); });</script>";
var githubRibbon = '<a href="https://github.com/louisdecharson/eviewsSDMX"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_red_aa0000.png"></a>';
var footer = '</br><hr></hr><font size="2"><p>Credits : <a href="https://github.com/louisdecharson/">https://github.com/louisdecharson/</a></p></font>';
var jQuery = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>';

function buildHTML(v) {
    var header = '<title>Calendar - GDP Germany</title>',
        theader = '<th>Date</th><th>Name</th><th>Comment</th>',
        tbody = '',
        body = '<br/><h1>Calendar of publications of German economic indicators</h1><br/>',
        button = '<button type="button" class="btn btn-primary" onclick="location.href=\'webcal://calinsee.herokuapp.com/de/cal?alarm=1440\';">Subscribe to calendar</button><br/><br/>';
    v.forEach(function(item,index){
        if (item[2].getTime() > Date.now()-86400000) {
            tbody += '<tr>';
            tbody += '<td class="date">' + formatDate(item[2]) + '</td>';
            tbody += '<td class="title">'+ item[0] + ' - ' + item[1] + '</td>';
            tbody += '<td class="comment">' + item[3] + '</td>';
            tbody += '</tr>';
        }
    });
    var myHtml = '<!DOCTYPE html>' + '<html><head>' + jQuery + header + bootstrap4 + css + '</head><body>' + body + button + '<table class="table table-condensed table-hover">' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody class="list">' + tbody + '</tbody>'  +'</table></div>' + jQuery +'</body></html>';
    return myHtml;
}


function sortbyTime(a,b) {
    if (a[2].getTime() === b[2].getTime()) {
        return 0;
    }
    else {
        return (a[2].getTime() < b[2].getTime()) ? -1 : 1;
    }
}


// Construit le calendrier à partir de la liste des évenements
function buildCalDe(v,alarms) {
    var cal = ical({
        domain: 'calinsee.herokuapp.com',
        name: 'Calendar of German economic indicators'
    });
    v.forEach(function(it,ind){
        var startDate = it[2];
        var endDate = new Date(it[2].getTime()+3600000);
        var title = 'Germany - ' + it[0].trim() + '(' + it[3].trim() + ')';
        var event = cal.createEvent({
            start: startDate,
            end: endDate,
            summary: it[0],
            description: it[3],
            organizer: 'LdC <louis.decharsonville@banque-france.fr>'
        });
        if (Array.isArray(alarms)) {
            alarms.forEach(function(item,index){
                event.createAlarm({type: 'display', trigger: item*60});
            });
        } else if (typeof alarms != 'undefined') {
            event.createAlarm({type: 'display', trigger: alarms*60});
        }
    });
    return cal.toString();
};

function feedCalDe(cb) {
    var vecEv = [];
    getDestatis(de_ipi,vecEv,function(vecEv) {
        getDestatis(de_mno,vecEv,function(vecEv) {
            getDestatis(de_gdp,vecEv,function(vecEv) {
                getPMI(de_pmi,vecEv,function(vecEv) {
                    cb(vecEv.sort(sortbyTime));
                });
            });
        });       
    });
}

exports.getPageDE = function(req,res) {
    feedCalDe(function(v){
    res.send(buildHTML(v));
    });
};
    
exports.getCalDE = function(req,res) {
    var alarms = req.query.alarm;
    feedCalDe(function(v) {
        res.setHeader("Content-Type", 'text/calendar');
        res.send(buildCalDe(v,alarms));
    });
};



