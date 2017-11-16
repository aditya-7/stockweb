var myApp = angular.module('myApp', ["autoCompleteModule", "ui.bootstrap", "ngAnimate"]);

myApp.controller("searchSymbolController", function ($scope, $http) {

    var errorInResponse = "/Invalid API call./";
    $scope.getQuoteDisabled = true;
    $scope.containsFavList = true;
    $scope.right_chevron = true;

    $scope.selectedStock = {};
    $scope.favouriteStocks = [];
    $scope.isFavourite = false;
    $scope.showSearchDiv = true;
    $scope.containerTwo = false;


    // For the favourites sorting drop-down menus
    $scope.datapoints = ["Default", "Symbol", "Stock Price", "Change", "Volume"];
    $scope.selecteddatapoint = "Default";
    $scope.orders = ["Ascending", "Descending"];
    $scope.selectedorder = "Ascending";

    // For automatic refresh
    var automaticRefreshTime = 10 * 1000;    //5 seconds

    // For the auto-complete feature
    var vm = this;
    vm.inputSymbol = null;
    vm.autoCompleteOptions = {
        minimumChars: 1,
        data: function (term) {
            if (term == "") $scope.getQuoteDisabled = true;
            else $scope.getQuoteDisabled = false;
            return $http.get('/lookup?input=' + term)
                .then(function (response) {
                    term = term.toUpperCase();
                    var results = response.data;
                    var suggestions = [];
                    for (var i = 0; i < results.length; i++) {
                        console.log(results[i]);
                        suggestions.push(
                            results[i].Symbol + " - " +
                            results[i].Name + " (" +
                            results[i].Exchange + ")"
                        );
                    }
                    return suggestions;
                });
        }
    };

    $scope.currentStockDataReceived = false;
    $scope.currentStockProgressvalue = 0;
    var inputSymbol;
    var currentStockProgressInterval;
    $scope.getQuote = function () {
        $scope.right_chevron = false;
        $scope.showSearchDiv = false;
        $scope.currentStockProgressvalue += 5;
        currentStockProgressInterval = setInterval(function () {
            $scope.currentStockProgressvalue += 10;
        }, 250);
        inputSymbol = vm.inputSymbol.split(" - ")[0];
        console.log("inputSymbol", inputSymbol);
        $scope.isEnabled = false;
        $scope.selectedStock = null;
        $scope.containsFavList = false;
        var favourites = JSON.parse(localStorage.getItem("favourites") || "[]");
        const index = favourites.indexOf(inputSymbol);
        $scope.isFavourite = (index > -1) ? true : false;
        $http.get("/quote?symbol=" + inputSymbol)
            .then(function (response) {
                $scope.currentStockProgressvalue = 100;
                setTimeout(function () {
                    $scope.currentStockDataReceived = true;
                    $scope.selectedStock = response.data.table;
                    $scope.isEnabled = true;
                    console.log(response.data.chart);
                    $scope.priceSelected(response.data.chart);  //Render price chart
                    var favourites = JSON.parse(localStorage.getItem("favourites")) || [];
                    const index = favourites.indexOf($scope.selectedStock.Symbol);
                    if (index > -1) {
                        // Update the stock parameters again
                        $scope.deleteFavourite();
                        $scope.addToFavourites();
                    }
                    $scope.currentStockProgressvalue = 0;
                    clearInterval(currentStockProgressInterval);
                    $scope.$apply();
                }, 250);
            });
    };

    $scope.showSearch = function () {
        $scope.showSearchDiv = false;
    }

    $scope.hideSearch = function () {
        $scope.showSearchDiv = true;
        $scope.containsFavList = true;
        $scope.updateFavouriteStocks();
    }

    $scope.clear = function () {
        vm.inputSymbol = "";
        $scope.getQuoteDisabled = true;
    };

    // On load of page, update the favourites table
    $scope.updateFavouriteStocks = function () {
        console.log("Update favourites");
        if (!$scope.favouriteStocks) $scope.favouriteStocks = [];
        var favouriteStocks = (localStorage.getItem("favourites") || "[]")
        $http.get("/favouriteStocks?symbols=" + favouriteStocks)
            .then(function (response) {
                $scope.favouriteStocks = response.data;
                $scope.sortFavourites();
            });
    }
    $scope.updateFavouriteStocks();

    // For deleting a favourite stock
    $scope.deleteFavourite = function (stock) {
        console.log("deleting this stock", stock);
        stock = (stock || $scope.selectedStock.Symbol);
        var favourites = JSON.parse(localStorage.getItem("favourites")) || [];
        favourites = _.without(favourites, _.findWhere(favourites, stock));
        localStorage.setItem("favourites", JSON.stringify(favourites));
        $scope.isFavourite = false;
        // $scope.updateFavouriteStocks();
        var allStocks = [];
        for (var i = 0; i < $scope.favouriteStocks.length; i++) {
            if ($scope.favouriteStocks[i].Symbol !== stock) {
                allStocks.push($scope.favouriteStocks[i]);
            }
        }
        $scope.favouriteStocks = allStocks;
    };

    // To add a stock to favourites (Store in local storage)
    $scope.addToFavourites = function () {
        var favourites = JSON.parse(localStorage.getItem("favourites")) || [];
        const index = favourites.indexOf($scope.selectedStock.Symbol);
        if (index === -1) {
            favourites.push($scope.selectedStock.Symbol);
            localStorage.setItem("favourites", JSON.stringify(favourites));
        }
        $scope.isFavourite = true;
    };

    $scope.sortFavourites = function () {
        var selecteddatapoint = (($scope.selecteddatapoint === "Stock Price") ? "LastPrice" : $scope.selecteddatapoint);
        if ($scope.selectedorder === "Ascending") {
            $scope.favouriteStocks = _.sortBy($scope.favouriteStocks, selecteddatapoint);
        } else {
            $scope.favouriteStocks = _.sortBy($scope.favouriteStocks, selecteddatapoint).reverse();
        }
    };

    var toggleCount = 0;
    var autoRefresh = null;
    $('#toggle-event').change(function () {
        toggleCount = ((toggleCount + 1) % 2);
        if (toggleCount == 1) {
            autoRefresh = setInterval(function () {
                $scope.updateFavouriteStocks();
            }, automaticRefreshTime);
        } else {
            clearInterval(autoRefresh);
        }
    });

    //Facebook API
    window.fbAsyncInit = function () {
        FB.init({
            appId: 746791802174342,
            status: true,
            xfbml: true,
            version: 'v2.11'
        });
    };

    (function (d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) { return; }
        js = d.createElement(s); js.id = id;
        js.src = "http://connect.facebook.net/en_US/all.js";
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));

    // To share stock details on Facebook    
    $scope.shareOnFacebook = function () {
        var svg =  chart.getSVG();
        FB.ui({
            method: 'feed',
            name: 'Highcharts',
            link: 'https://developers.facebook.com/docs/dialogs/',
            picture: 'www.google.com',
            caption: 'Reference Documentation',
            description: 'Dialogs provide a simple, consistent interface for applications to interface with users.'
        }, (response) => {
            if (response && !response.error_message) {
                //succeed
                alert('Posting completed.');
            } else {
                //fail
                alert('Error while posting.');
            }
        });

    };

    $scope.getChangePercent = function (x) {
        if ($scope.selectedStock) {
            var change = x.Change;
            var changePercent = ((change / x.LastPrice) * 100.00).toFixed(2);
            return change + " ( " + changePercent + "% )";
        }
    };

    var chart;
    //Tab Selection for Price Highcharts
    $scope.priceSelected = function (chartDataPrice) {
        if (!chartDataPrice) return;
        var price_data = chartDataPrice.priceValues;
        var max_price = chartDataPrice.max_price;
        var min_price = chartDataPrice.min_price;
        var volume_data = chartDataPrice.volumeValues;
        var max_volume = chartDataPrice.max_volume;
        var allDates = chartDataPrice.allDates;

        var formattedDates = [];

        for (var i = 0; i < allDates.length; i++) {

            formattedDates.push(allDates[i].replace(/-/g, '\/').substring(5, allDates[i].length));

        }

        chart = Highcharts.chart('priceGraph', {
            chart: {
                zoomType: 'x',
                borderColor: 'gray',
                borderWidth: 1,
                width: 575,
                marginRight: 10
            },
            title: {
                text: 'Stock Price' + ' ' + '(' + new Date(Date.now()).toLocaleString().slice(0, 9) + ')'
            },

            subtitle: {
                text: 'Source: <a href="https://www.alphavantage.co/"> Alpha Vantage</a>',
                style: {
                    color: "#0000ff"
                }
            },

            xAxis: [{
                categories: formattedDates,
                crosshair: true,
                tickInterval: 7,
                labels: {
                    rotation: -45
                },
            }],
            yAxis: [{ // Primary yAxis
                min: min_price,
                max: max_price,
                labels: {
                    format: '{value}$',
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                },
                title: {
                    text: 'Stock Price',
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                }
            }, { // Secondary yAxis
                max: max_volume * 5,
                title: {
                    text: 'Volume',
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                },
                labels: {
                    pointFormat: "Value: {point.y:,.0f}",
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                },
                opposite: true
            }],
            plotOptions: {
                series: {
                    marker: {
                        enabled: false
                    }
                }
            },
            series: [{
                name: inputSymbol + ' Price',
                type: 'area',
                color: '#0000FF',
                fillOpacity: 0.3,
                data: price_data,
                tooltip: {
                    valueSuffix: '$'
                }
            },
            {
                name: inputSymbol + ' Volume',
                type: 'column',
                yAxis: 1,
                color: '#FF0000',
                data: volume_data,

            }]
        });
    };

    $scope.newsTabClicked = function () {
        $http.get("/news?symbol=" + inputSymbol)
            .then(function (response) {
                console.log('News Feed ', response.data);
                $scope.newsfeeds = response.data;
            });
    };

    var graphType = 'graphAreaSMA';

    $scope.functionSelected = function (title) {

        $http.get('/charts?', { params: { "function": title, "symbol": inputSymbol } })
            .then(function (response) {

                if (title === 'SMA') {
                    graphType = 'graphAreaSMA';
                } else if (title === 'EMA') {
                    graphType = 'graphAreaEMA';
                } else if (title === 'STOCH') {
                    graphType = 'graphAreaSTOCH';
                } else if (title === 'RSI') {
                    graphType = 'graphAreaRSI';
                } else if (title === 'ADX') {
                    graphType = 'graphAreaADX';
                } else if (title === 'CCI') {
                    graphType = 'graphAreCCI';
                } else if (title === 'BBANDS') {
                    graphType = 'graphAreaBBANDS';
                } else if (title === 'MACD') {
                    graphType = 'graphAreaMACD';
                }

                var data = response.data;
                var values = data.values;
                var dates = data.dates;

                var formattedDates = [];

                for (var i = 0; i < dates.length; i++) {

                    formattedDates.push(dates[i].replace(/-/g, '\/').substring(5, dates[i].length));

                }

                console.log('dates ', formattedDates);


                var slowD = [];
                var slowK = [];

                var lowerBands = [];
                var middleBands = [];
                var upperBands = [];

                var macdHist = [];
                var macdSignal = [];
                var macd = [];

                if (title === 'STOCH') {
                    slowD = data.slowD;
                    slowK = data.slowK;

                    for (var i = 0; i < slowD.length; i++) {
                        slowD[i] = parseFloat(slowD[i], 10);
                        slowK[i] = parseFloat(slowK[i], 10);
                    }
                } else if (title === 'BBANDS') {

                    lowerBands = data.lowerBand;
                    middleBands = data.middleBand;
                    upperBands = data.upperBand;

                    for (var i = 0; i < lowerBands.length; i++) {
                        lowerBands[i] = parseFloat(lowerBands[i], 10);
                        middleBands[i] = parseFloat(middleBands[i], 10);
                        upperBands[i] = parseFloat(upperBands[i], 10);
                    }

                } else if (title === 'MACD') {

                    macdHist = data.macdHist;
                    macdSignal = data.macdSignal;
                    macd = data.macd;

                    for (var i = 0; i < macd.length; i++) {
                        macdHist[i] = parseFloat(macdHist[i], 10);
                        macdSignal[i] = parseFloat(macdSignal[i], 10);
                        macd[i] = parseFloat(macd[i], 10);
                    }


                } else {

                    for (var i = 0; i < values.length; i++) {
                        values[i] = parseFloat(values[i], 10);
                    }
                }



                //Chart area:

                if (title === 'STOCH') {

                    Highcharts.chart(graphType, {

                        chart: {
                            zoomType: 'x',
                            borderColor: 'gray',
                            borderWidth: 1,
                            type: 'line',
                        },

                        title: {
                            text: data.names
                        },

                        subtitle: {
                            text: 'Source: <a href="https://www.alphavantage.co/"> Alpha Vantage</a>',
                            style: {
                                color: "#0000ff"
                            }
                        },

                        colors: ['red', 'green'],

                        xAxis: [{
                            categories: formattedDates.slice(0, 120),
                            crosshair: true,
                            tickInterval: 7,
                            labels: {
                                rotation: -45
                            }
                        }],

                        yAxis: {
                            title: {
                                text: data.names

                            }
                        },
                        plotOptions: {
                            series: {
                                label: {
                                    connectorAllowed: false
                                }
                            }
                        },

                        tooltip: {
                            pointFormat: "Value: {point.y:.2f}"
                        },

                        series: [{
                            type: 'line',
                            name: inputSymbol + ' SlowD',
                            data: slowD.slice(0, 120)
                        }, {
                            type: 'line',
                            name: inputSymbol + ' SlowK',
                            data: slowK.slice(0, 120)
                        }],

                        responsive: {
                            rules: [{
                                condition: {
                                    maxWidth: 500
                                },
                                chartOptions: {
                                    legend: {
                                        layout: 'horizontal',
                                        align: 'center',
                                        verticalAlign: 'bottom'
                                    }
                                }
                            }]
                        }

                    });

                } else if (title === 'BBANDS') {

                    Highcharts.chart(graphType, {

                        chart: {
                            zoomType: 'x',
                            borderColor: 'gray',
                            borderWidth: 1,
                            type: 'line',
                        },

                        title: {
                            text: data.names
                        },

                        subtitle: {
                            text: 'Source: <a href="https://www.alphavantage.co/"> Alpha Vantage</a>',
                            style: {
                                color: "#0000ff"
                            }
                        },

                        colors: ['black', '#7EC0EE', '#cc0000'],

                        xAxis: [{
                            categories: formattedDates.slice(0, 120).reverse(),
                            crosshair: true,
                            tickInterval: 7,
                            labels: {
                                rotation: -45
                            }
                        }],

                        yAxis: {
                            title: {
                                text: data.names

                            }
                        },

                        plotOptions: {
                            series: {
                                marker: {
                                    enabled: false
                                }
                            }
                        },
                        tooltip: {
                            pointFormat: "Value: {point.y:.2f}"
                        },
                        series: [{
                            type: 'line',
                            name: inputSymbol + ' Real Lower Bands',
                            data: lowerBands.slice(0, 120).reverse()
                        }, {
                            type: 'line',
                            name: inputSymbol + ' Real Upper Bands',
                            data: upperBands.slice(0, 120).reverse()
                        }, {
                            type: 'line',
                            name: inputSymbol + ' Real Middle Bands',
                            data: middleBands.slice(0, 120).reverse()
                        }],

                        responsive: {
                            rules: [{
                                condition: {
                                    maxWidth: 500
                                },
                                chartOptions: {
                                    legend: {
                                        layout: 'horizontal',
                                        align: 'center',
                                        verticalAlign: 'bottom'
                                    }
                                }
                            }]
                        }

                    });

                } else if (title === 'MACD') {

                    Highcharts.chart(graphType, {

                        chart: {
                            zoomType: 'x',
                            borderColor: 'gray',
                            borderWidth: 1,
                            type: 'line',
                        },

                        title: {
                            text: data.names
                        },

                        subtitle: {
                            text: 'Source: <a href="https://www.alphavantage.co/"> Alpha Vantage</a>',
                            style: {
                                color: "#0000ff"
                            }
                        },

                        colors: ['black', '#7EC0EE', '#cc0000'],

                        xAxis: [{
                            categories: formattedDates.slice(0, 120).reverse(),
                            crosshair: true,
                            tickInterval: 7,
                            labels: {
                                rotation: -45
                            }
                        }],

                        yAxis: {
                            title: {
                                text: data.names

                            }
                        },
                        plotOptions: {
                            series: {
                                marker: {
                                    enabled: false
                                }
                            }
                        },
                        tooltip: {
                            pointFormat: "Value: {point.y:.2f}"
                        },
                        series: [{
                            type: 'line',
                            name: inputSymbol + ' MACD Hist',
                            data: macdHist.slice(0, 120).reverse()
                        }, {
                            type: 'line',
                            name: inputSymbol + ' MACD Signal',
                            data: macdSignal.slice(0, 120).reverse()
                        }, {
                            type: 'line',
                            name: inputSymbol + ' MACD',
                            data: macd.slice(0, 120).reverse()
                        }],

                        responsive: {
                            rules: [{
                                condition: {
                                    maxWidth: 500
                                },
                                chartOptions: {
                                    legend: {
                                        layout: 'horizontal',
                                        align: 'center',
                                        verticalAlign: 'bottom'
                                    }
                                }
                            }]
                        }

                    });

                }
                else {

                    Highcharts.chart(graphType, {

                        chart: {
                            zoomType: 'x',
                            borderColor: 'gray',
                            borderWidth: 1,
                            type: 'line',
                        },

                        title: {
                            text: response.data.names
                        },

                        subtitle: {
                            text: 'Source: <a href="https://www.alphavantage.co/"> Alpha Vantage</a>',
                            style: {
                                color: "#0000ff"
                            }
                        },

                        colors: ['red'],

                        xAxis: [{
                            categories: formattedDates.slice(0, 120).reverse(),
                            crosshair: true,
                            tickInterval: 7,
                            labels: {
                                rotation: -45
                            }
                        }],

                        yAxis: {
                            title: {
                                text: response.data.names

                            }
                        },

                        plotOptions: {
                            series: {
                                label: {
                                    connectorAllowed: false
                                }
                            }
                        },

                        tooltip: {
                            pointFormat: "Value: {point.y:.2f}"
                        },

                        series: [{
                            type: 'line',
                            name: inputSymbol,
                            data: values.slice(0, 120).reverse()
                        }],

                        responsive: {
                            rules: [{
                                condition: {
                                    maxWidth: 500
                                },
                                chartOptions: {
                                    legend: {
                                        layout: 'horizontal',
                                        align: 'center',
                                        verticalAlign: 'bottom'
                                    }
                                }
                            }]
                        }

                    });

                }




            });
    }

    $scope.historicCharts = function () {
        $http.get("/quote?symbol=" + inputSymbol)
            .then(function (response) {

                var responseReceived = response.data.historicPrice;
                var historicTimestamp = response.data.historicTimestamp;
                var timestamp = [];
                var data = [];

                var historicPrices = [];
                for (var i = 0; i < responseReceived.length; i++) {
                    historicPrices[i] = parseFloat(responseReceived[i], 10);
                    historicTimestamp[i] = historicTimestamp[i].split("-");
                    timestamp.push(historicTimestamp[i][1] + "/" + historicTimestamp[i][2] + "/" + historicTimestamp[i][0]);
                    timestamp[i] = new Date(timestamp[i]).getTime();

                    data.push([timestamp[i], historicPrices[i]]);
                }

                console.log(data);



                Highcharts.stockChart('historicChartsDiv', {

                    chart: {
                        type: 'area',
                    },

                    rangeSelector: {
                        selected: 1
                    },

                    title: {
                        text: inputSymbol + ' Stock Price'
                    },

                    series: [{
                        name: inputSymbol,
                        data: data.reverse(),
                        tooltip: {
                            valueDecimals: 2
                        }
                    }]
                });

            });

    }
});
