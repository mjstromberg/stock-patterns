/* ======================================================================== */
/* DEFINE FUNCTIONS */
/* ======================================================================== */

// Define function to get ticker symbol and make http reqest
var getStockURL = function() {
  var stockName = document.getElementById('tickerTextbox').value.toString().toUpperCase();
  var stockURL = 'https://www.quandl.com/api/v3/datasets/WIKI/' + stockName + '.json?api_key=fyWKH12nMF4VuWFaXARN&limit=100&collapse=weekly';

  return stockURL;
};


// Define function to format received data
var formatData = function(chartType, dataset) {
  var reformatStockData = dataset.data.reduce(function(result, dayArrayData) {
    // result = [ adjOpen, adjHigh, adjLow, adjClose, date, volume]
    result[4].unshift([ dayArrayData[0].slice(0, 4), dayArrayData[0].slice(5, 7), dayArrayData[0].slice(8) ]);
    result[0].unshift(dayArrayData[chartType === 'stock' ? 8 : 1]);
    result[1].unshift(dayArrayData[chartType === 'stock' ? 9 : 2]);
    result[2].unshift(dayArrayData[chartType === 'stock' ? 10 : 3]);
    result[3].unshift(dayArrayData[chartType === 'stock' ? 11 : 4]);
    result[5].unshift(dayArrayData[5]);
    return result;
  }, [ [], [], [], [], [], [] ]);
  
  reformatStockData[6] = dataset;
  return reformatStockData;
};


// Get data and use it to populate chart
var buildChart = function (chartType, data) {
  console.log(data);
  // Build stock chart
  var stockFig = PlotlyFinance.createOHLC(
    {
      open: data[0],
      high: data[1],
      low: data[2],
      close: data[3],
      dates: data[4].map(function(d) { return new Date(d[0], d[1]-1, d[2]); })
    }
  );
  
  // Handle layout
  stockFig.layout.title = chartType === 'stock' ? data[6].name.slice(0, data[6].name.indexOf(')') + 1) : 'S&P 500';
  stockFig.layout.xaxis.title = 'Dates';
  stockFig.layout.annotations = [{
    text: chartType === 'stock' ? 'Adjusted Stock Price ($)' : 'Price ($)',
    x: '-0.055',
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
  
  Plotly.newPlot('ohlcChart', stockFig.data, stockFig.layout);
  
  // Build volume chart
  var volumeData =[];
  
  // Build dataset for up weeks
  volumeData[0] = {
    x: data[4].map(function(d) { return new Date(d[0], d[1]-1, d[2]); }),
    y: data[5].map(function(vol, index) {
      return data[3][index] >= data[0][index] ? data[5][index] : 0;
    }),
    type: 'bar',
    marker: { color: 'rgb(93,170,136)' },
    showlegend: false
  };
  
  // Build dataset for down weeks
  volumeData[1] = {
    x: data[4].map(function(d) { return new Date(d[0], d[1]-1, d[2]); }),
    y: data[5].map(function(vol, index) {
      return data[3][index] < data[0][index] ? data[5][index] : 0;
    }),
    type: 'bar',
    marker: { color: 'rgb(255,121,113)' },
    showlegend: false
  };
  
  // Handle layout
  var layout = {
    margin: {b: 20, t: 10},
    yaxis: {title: 'Volume'}
  };
   
  Plotly.newPlot('volumeChart', volumeData, layout);
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
