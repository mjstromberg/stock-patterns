/* ======================================================================== */
/* DEFINE FUNCTIONS */
/* ======================================================================== */

var httpRequest;

// Define function to get ticker symbol and make http reqest
var getStockURL = function() {
  var stockName = document.getElementById('tickerTextbox').value.toString().toUpperCase();
  var stockURL = 'https://www.quandl.com/api/v3/datasets/WIKI/' + stockName + '.json?api_key=fyWKH12nMF4VuWFaXARN&limit=100';

  return stockURL;
};


// Define function to format received data
var formatData = function(chartType, dataset) {
  var reformatStockData = dataset.data.reduce(function(result, dayArrayData) {
    // result = [ adjOpen, adjHigh, adjLow, adjClose, date]
    result[4].unshift([ dayArrayData[0].slice(0, 4), dayArrayData[0].slice(5, 7), dayArrayData[0].slice(8) ]);
    result[0].unshift(dayArrayData[chartType === 'stock' ? 8 : 1]);
    result[1].unshift(dayArrayData[chartType === 'stock' ? 9 : 2]);
    result[2].unshift(dayArrayData[chartType === 'stock' ? 10 : 3]);
    result[3].unshift(dayArrayData[chartType === 'stock' ? 11 : 4]);
    return result;
  }, [ [], [], [], [], [] ]);
  
  reformatStockData[5] = dataset;
  return reformatStockData;
};


// Get data and use it to populate chart
var buildChart = function (chartType, data) {
  var fig = PlotlyFinance.createOHLC(
    {
      open: data[0],
      high: data[1],
      low: data[2],
      close: data[3],
      dates: data[4].map(function(d) { return new Date(d[0], d[1]-1, d[2]); })
    }
  );

  fig.layout.title = chartType === 'stock' ? data[5].name.slice(0, data[5].name.indexOf(')') + 1) : 'S&P 500';
  fig.layout.xaxis.title = 'Dates';
  fig.layout.annotations = [{
    text: chartType === 'stock' ? 'Adjusted Stock Price ($)' : 'Price ($)',
    x: '-0.075',
    y: 0.5,
    xref: 'paper',
    yref: 'paper',
    font: {
      size: 14
    },
    showarrow: false,
    xanchor: 'right',
    textangle: 270
  }];
  
  Plotly.newPlot('ohlcChart', fig.data, fig.layout);                 
}


// Define the http request function that gets data from argument url
var getData = function (chartType, url) {
  httpRequest = new XMLHttpRequest();
          
  if (!httpRequest) {
    console.log('Unable to create an XMLHTTP instance.');
    return false;
  }
  
  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState === 4 && httpRequest.status === 200) {
      var responseData = JSON.parse(httpRequest.responseText).dataset;
      var formattedData = formatData(chartType, responseData);
      buildChart(chartType, formattedData);
      
    }
  };
  
  httpRequest.open('GET', url);
  httpRequest.send();
}


// Define function to execute everything
var magic = function(chartType) {
  var stock;
  var data;
  if (chartType === 'stock') {
    stock = getStockURL();
    data = getData(chartType, stock);
  } else {
    data = getData(chartType, 'https://www.quandl.com/api/v3/datasets/YAHOO/INDEX_GSPC.json?api_key=fyWKH12nMF4VuWFaXARN&limit=100');
  }
};

/* ======================================================================== */
/* DEFINE ACTIONS */
/* ======================================================================== */

// Build initial indices
magic('index');

// On click, make request to get data for stock named in textbox      
document.getElementById('tickerSubmitButton').onclick = function() {
  magic('stock');
};

// On keydown, make request to get data for stock named in textbox
document.getElementById('tickerTextbox').onkeydown = function() {
  if(event.keyCode === 13) {
    magic('stock');
  }
};
