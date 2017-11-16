var port = process.env.PORT || 3030;
var express = require('express'),
    app = express();
var request = require('request');
var parseString = require('xml2js').parseString;
var bodyParser = require('body-parser');
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
const ALPHA_VANTAGE_API_KEY = "5M9YGPO0TT8VGN1Z";

app.use('/', express.static(__dirname + '/'));

// Workaround for CORS issue, request the JSON from server and respond to browser client.
app.get('/lookup', function (req, res) {
    var queryText = "http://dev.markitondemand.com/MODApis/Api/v2/Lookup/json?input=";
    var url = queryText + req.query.input;
    request(url, function (error, response, body) {
        res.send(body);
    });
});

// To receive the quote for a selected stock
app.get('/quote', function (req, res) {
    var url = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=" +
        req.query.symbol + "&apikey=" + ALPHA_VANTAGE_API_KEY + "&outputsize=full";
    var stock = {
        table: {},    // Store data structure for table in this key
        chart: {},     // Store data structure for charts in this key 
        historicPrice: {},
        historicTimestamp: {}
    };
    request(url, function (error, response, body) {
        try {

            body = JSON.parse(body);
            if (!body || !(body["Meta Data"])) {
                console.log("Error: /quote body not found");
                return;
            }

            var metaData = body["Meta Data"];
            var lastTime = Object.keys(body["Time Series (Daily)"])[0];
            var timeSeriesData = body["Time Series (Daily)"][lastTime];

            console.log("Stock retreived for symbol " + metaData["2. Symbol"]);

            stock.table["Symbol"] = metaData["2. Symbol"];
            stock.table["LastPrice"] = parseFloat(timeSeriesData["4. close"], 10);
            stock.table["Change"] = (parseFloat(timeSeriesData["4. close"]) - parseFloat(timeSeriesData["1. open"])).toFixed(2);
            stock.table["Timestamp"] = (lastTime + " 16:00:00 EDT");
            stock.table["Open"] = parseFloat(timeSeriesData["1. open"]).toFixed(2);
            stock.table["Close"] = parseFloat(timeSeriesData["4. close"]).toFixed(2);
            stock.table["DaysRange"] = parseFloat(timeSeriesData["1. open"]).toFixed(2) + " - " + parseFloat(timeSeriesData["4. close"]).toFixed(2);;
            stock.table["Volume"] = parseFloat(timeSeriesData["5. volume"]);

            var allStockDates = Object.keys(body["Time Series (Daily)"]).slice(0, 120);
            var allHistoricDates = Object.keys(body["Time Series (Daily)"]);
            var historicPrice = [];
            var priceValues = [];
            var volumeValues = [];
            var min_price = allStockDates.length > 0 ? (body['Time Series (Daily)'][allStockDates[0]]['4. close']) : 0;
            var max_price = 0;
            var max_volume = 0;

            for (var i = 0; i < allHistoricDates.length; i++) {
                historicPrice.push(body['Time Series (Daily)'][allHistoricDates[i]]['4. close']);
            }


            for (var i = 0; i < allStockDates.length; i++) {
                priceValues.push(body['Time Series (Daily)'][allStockDates[i]]['4. close']);
                priceValues[i] = parseFloat(priceValues[i]);
                volumeValues.push(body['Time Series (Daily)'][allStockDates[i]]['5. volume']);
                volumeValues[i] = parseFloat(volumeValues[i]);
                if (max_price < priceValues[i])
                    max_price = priceValues[i];
                if (min_price > priceValues[i])
                    min_price = priceValues[i];
                if (max_volume < volumeValues[i])
                    max_volume = volumeValues[i];
            }
            stock.chart["allDates"] = allStockDates;
            stock.chart["priceValues"] = priceValues;
            stock.chart["volumeValues"] = volumeValues;
            stock.chart["min_price"] = min_price;
            stock.chart["max_price"] = max_price;
            stock.chart["max_volume"] = max_volume;

            stock.historicPrice = historicPrice;
            stock.historicTimestamp = allHistoricDates;

            res.send(stock);

        } catch (e) {
            console.log(e); // error in the above string (in this case, yes)!
        }
    });
});

//To get update for favourite stocks
app.get('/favouriteStocks', function (req, res) {
    var symbols = JSON.parse(req.query.symbols);
    var count = 0;
    var favouriteStocks = [];
    if (symbols.length === 0) return res.send([]);
    for (var i = 0; i < symbols.length; i++) {
        var url = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=" +
            symbols[i] + "&apikey=" + ALPHA_VANTAGE_API_KEY + "&outputsize=full";
        request(url, function (error, response, body) {
            try {
                body = JSON.parse(body);
                if (!body || !(body["Meta Data"])) {
                    console.log("Error: /quote body not found");
                    return;
                }
                var metaData = body["Meta Data"];
                var lastTime = Object.keys(body["Time Series (Daily)"])[0];
                var timeSeriesData = body["Time Series (Daily)"][lastTime];
                favouriteStocks.push({
                    "Symbol": metaData["2. Symbol"],
                    "LastPrice": parseFloat(timeSeriesData["4. close"]).toFixed(2),
                    "Change": (parseFloat(timeSeriesData["4. close"]) - parseFloat(timeSeriesData["1. open"])).toFixed(2),
                    "Volume": parseFloat(timeSeriesData["5. volume"])
                });
                if (++count === symbols.length) res.send(favouriteStocks);
            } catch (e) {
                console.log(e); // error in the above string (in this case, yes)!
            }
        });
    }
});

//To get News Feed
app.get('/news', function (req, res) {
    var url = 'https://seekingalpha.com/api/sa/combined/' + req.query.symbol + '.xml';
    request(url, function (error, response, body) {
        try {
            parseString(body, function (err, result) {
                var items = result.rss.channel[0].item;
                var feeds = [];
                for (var i = 0; i < 5; i++) {
                    feeds.push({
                        title: items[i].title[0],
                        author: items[i]['sa:author_name'][0],
                        date: items[i].pubDate[0]
                    });
                }
                res.send(feeds);
            });
        } catch (e) {
            console.log('No news data available ' + e); // error in the above string (in this case, yes)!
        }
    });
});

//To get data for other charts - highcharts & highstocks
app.get('/charts', function (req, res) {

    var url = "";

    if (req.query.function == 'STOCH') {

        url = "https://www.alphavantage.co/query?function=STOCH&symbol=" + req.query.symbol + "&interval=daily&slowkmatype=1&slowdmatype=1&apikey=7VDD3ZWMAFBQZD4B";

    } else if (req.query.function == 'BBANDS') {

        url = "https://www.alphavantage.co/query?function=BBANDS&symbol=" + req.query.symbol + "&interval=daily&time_period=5&series_type=close&nbdevup=3&nbdevdn=3&apikey=7VDD3ZWMAFBQZD4B";
    } else {
        url = "https://www.alphavantage.co/query?function=" + req.query.function + "&symbol=" + req.query.symbol + "&interval=daily&time_period=10&series_type=close&apikey=7VDD3ZWMAFBQZD4B";
    }


    var stock = {
        names: {},
        dates: {},    // Store data structure for table in this key
        values: {}     // Store data structure for charts in this key 
    };

    var stockForSTOCH = {
        names: {},
        dates: {},
        slowD: {},
        slowK: {}
    };

    var stockForBBANDS = {
        names: {},
        dates: {},
        middleBand: {},
        upperBand: {},
        lowerBand: {}
    }

    var stockForMACD = {
        names: {},
        dates: {},
        macdHist: {},
        macdSignal: {},
        macd: {}
    }

    request(url, function (error, response, body) {
        try {

            body = JSON.parse(body);
            if (!body || !(body["Meta Data"])) {
                console.log("Error: /chart body not found");
                return;
            }

            var indicator = body['Meta Data']['2: Indicator'];
            var techAnalysis = Object.keys(body)[1];
            var allDates = Object.keys(body[techAnalysis]);
            var technicalValues = []
            var functionChosen = [];

            var SlowD = [];
            var SlowK = [];

            var middleBand = [];
            var upperBand = [];
            var lowerBand = [];

            var macdHist = [];
            var macdSignal = [];
            var macd = [];



            for (var i = 0; i < allDates.length; i++) {

                functionChosen.push(Object.keys(body[techAnalysis][allDates[i]]));

                if (req.query.function === 'STOCH') {
                    SlowD.push(body[techAnalysis][allDates[i]][functionChosen[i][0]]);
                    SlowK.push(body[techAnalysis][allDates[i]][functionChosen[i][1]]);

                    stockForSTOCH.names = indicator;
                    stockForSTOCH.dates = allDates;
                    stockForSTOCH.slowD = SlowD;
                    stockForSTOCH.slowK = SlowK;


                } else if (req.query.function === 'BBANDS') {
                    middleBand.push(body[techAnalysis][allDates[i]][functionChosen[i][0]]);
                    upperBand.push(body[techAnalysis][allDates[i]][functionChosen[i][1]]);
                    lowerBand.push(body[techAnalysis][allDates[i]][functionChosen[i][2]]);

                    stockForBBANDS.names = indicator;
                    stockForBBANDS.dates = allDates;
                    stockForBBANDS.middleBand = middleBand;
                    stockForBBANDS.upperBand = upperBand;
                    stockForBBANDS.lowerBand = lowerBand;

                } else if (req.query.function === 'MACD') {

                    macdHist.push(body[techAnalysis][allDates[i]][functionChosen[i][0]]);
                    macdSignal.push(body[techAnalysis][allDates[i]][functionChosen[i][1]]);
                    macd.push(body[techAnalysis][allDates[i]][functionChosen[i][2]]);

                    stockForMACD.names = indicator;
                    stockForMACD.dates = allDates;
                    stockForMACD.macdHist = macdHist;
                    stockForMACD.macdSignal = macdSignal;
                    stockForMACD.macd = macd;

                } else {
                    technicalValues.push(body[techAnalysis][allDates[i]][functionChosen[i]]);
                    stock.names = indicator;
                    stock.dates = allDates;
                    stock.values = technicalValues;
                }

            }

            if (req.query.function === 'STOCH') {
                res.send(stockForSTOCH);
            } else if (req.query.function === 'BBANDS') {
                res.send(stockForBBANDS);
            } else if (req.query.function === 'MACD') {
                res.send(stockForMACD);
            } else {
                res.send(stock);
            }

        } catch (e) {
            console.log(e); // error in the above string (in this case, yes)!
        }
    });
});

app.post('/uploadChart', function (req, res) {
    var img = req.body.img;
    var base64Data = req.body.img.replace(/^data:image\/png;base64,/, "");
    require("fs").writeFile("chart.png", base64Data, 'base64', function (err) {
        console.log(err);
        res.send("chart.png");
    });
});

app.listen(port, function () {
    console.log('Server running at http://localhost:' + port + '/');
});
