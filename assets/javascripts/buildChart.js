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
  
  // Handle stock chart layout
  stockFig.layout.title = chartType === 'stock' ? data[6].name.slice(0, data[6].name.indexOf(')') + 1) + ' - Weekly' : 'S&P 500 - Daily';
  stockFig.layout.xaxis.title = 'Dates';
  stockFig.layout.annotations = [{
    text: chartType === 'stock' ? 'Adjusted Stock Price ($)     ' : 'Price ($)     ',
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
  
    // cupObject
      // cupDepth = 0
      // maxHigh = 
      // maxHighDate =
      // minLow =
      // minLowDate = 
      // cup = [];
    
    // If new high
      // If in prior
        // maxHigh = high
        // maxHighDate = date
      // If in cup (prior uptrend, correct length, correct depth)
        // cup.push(data about cup)
        // minLow = maxHigh
        // minLowDate = maxHighDate
        // maxHigh = high
        // maxHighDate = date
    // If new low
      // If in prior
        // minLow = low
        // minLowDate = date
      // If in cup
        // cupDepth = maxHigh - low > cupDepth ? maxHigh - low : cupDepth
        // If (too long, too deep)
          // minLow = min
          // minLowDate = date
          // cupDepth = 0
          // maxHigh = high
          // maxHighDate = date
    // If neither new high or new low do nothing
  
    // If last date and no cups, push partial cup data
  
  var newData = data.slice();
  newData[4] = newData[4].map(function(d) { return new Date(d[0], d[1]-1, d[2]); });
  var cups = [];
  var cupData = {
    maxHigh: newData[1][0],
    maxHighDate: newData[4][0],
    minLow: newData[2][0],
    minLowDate: newData[4][0],
    cupDepth: 0,
    partialCup: false
  };
  
  newData[4].forEach(function(date, index) {
    if (newData[1][index] > cupData.maxHigh) {
      if ((cupData.maxHigh - cupData.minLow) / cupData.minLow < 0.30 ||
          cupData.cupDepth < 0.12 ||
          cupData.maxHighDate - date < 3628800000) {
        cupData.maxHigh = newData[1][index];
        cupData.maxHighDate = date;
        cupData.cupDepth = 0;
      } else {
        cups.push(cupData);
        cupData.minLow = cupData.maxHigh;
        cupData.minLowDate = cupData.maxHighDate;
        cupData.maxHigh = newData[4][index];
        cupData.maxHighDate = date;
      }
    }
    
    if (newData[2][index] < cupData.minLow) {
      if ((cupData.maxHigh - cupData.minLow) / cupData.minLow < 0.30) {
        cupData.minLow = newData[2][index];
        cupData.minLowDate = date;
        cupData.maxHigh = newData[1][index];
        cupData.maxHighDate = date;
      } else {
        cupData.cupDepth = cupData.maxHigh - newData[2][index] > cupData.cupDepth ? cupData.maxHigh - newData[2][index] : cupData.cupDepth;
        if (cupData.cupDepth > 0.33 || cupData.maxHighDate - date > 39312000000) {
          cupData.minLow = newData[2][index];
          cupData.minLowDate = date;
          cupData.cupDepth = 0;
          cupData.maxHigh = newData[1][index];
          cupData.maxHighDate = date;
        } else if (index === newData[4].length - 1) {
          cupData.partialCup = true;
          cups.push(cupData);
        }
      }
    }
    
    if (newData[1][index] <= cupData.maxHigh &&
        newData[2][index] >= cupData.minLow &&
        (cupData.maxHigh - cupData.minLow) / cupData.minLow > 0.30) {
      cupData.cupDepth = cupData.maxHigh - newData[2][index] > cupData.cupDepth ? cupData.maxHigh - newData[2][index] : cupData.cupDepth;
      if (cupData.cupDepth > 0.33 || cupData.maxHighDate - date > 39312000000) {
        cupData.minLow = newData[2][index];
        cupData.minLowDate = date;
        cupData.cupDepth = 0;
        cupData.maxHigh = newData[1][index];
        cupData.maxHighDate = date;
      } else if (index === newData[4].length - 1) {
        cupData.partialCup = true;
        cups.push(cupData);
      }
    }
    
    console.log(JSON.stringify(cupData));
  });
  
  
  // BUILD CUP LOGIC HERE
  // Set up cupData object
  /*
  var cupData = {
    priorUptrend: false,
    minLow: data[2][0],
    minLowDate: new Date(data[4][0][0], data[4][0][1]-1, data[4][0][2]),
    maxHigh: data[1][0],
    maxHighDate: new Date(data[4][0][0], data[4][0][1]-1, data[4][0][2]),
    numWeeksBelowHigh: 0,
    perBelowHigh: 0,
    deepEnoughBase: false,
    cup: []
  };

  // Loop through each data point 
  data[1].forEach(function(high, index) {    
    if (high > cupData.maxHigh) {
      cupData.maxHigh = high;
      cupData.maxHighDate = new Date(data[4][index][0], data[4][index][1]-1, data[4][index][2]);
      
      if (cupData.deepEnoughBase && 
          cupData.numWeeksBelowHigh > 7 && 
          cupData.numWeeksBelowHigh < 66 &&
          cupData.priorUptrend) {
        cupData.cup.push({
          minLow: cupData.minLow,
          minLowDate: cupData.minLowDate,
          maxHigh: cupData.maxHigh,
          maxHighDate: cupData.maxHighDate,
          numWeeksBelowHigh: cupData.numWeeksBelowHigh,
          perBelowHigh: cupData.perBelowHigh
        });
        alert(JSON.stringify(cupData.cup));
        cupData.minLow = cupData.maxHigh;
      }
      
      cupData.numWeeksBelowHigh = 0;
      cupData.perBelowHigh = 0;
      cupData.deepEnoughBase = false;
      
    //  
    } else {
      cupData.numWeeksBelowHigh++;
      cupData.perBelowHigh = (cupData.maxHigh - data[2][index]) / cupData.maxHigh;

      if (data[2][index] < cupData.minLow) {
        cupData.minLow = data[2][index];
        cupData.minLowDate = new Date(data[4][index][0], data[4][index][1]-1, data[4][index][2]);
      }
      
      if (cupData.perBelowHigh > 0.12) {
        cupData.deepEnoughBase = true;
      }
      
      // Check for too deep of a cup??
    }
        
    if (!cupData.deepEnoughBase) {
      cupData.priorUptrend = (cupData.maxHigh - cupData.minLow) / cupData.minLow > 0.3;
    }

  });
  */
  console.log(cups);
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
  
  // Handle volume chart layout
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
