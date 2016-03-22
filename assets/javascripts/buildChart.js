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
  
  // Loop through dataset and check for cup patterns
  var newData = data.slice();
  newData[4] = newData[4].map(function(d) { return new Date(d[0], d[1]-1, d[2]); });
  var cups = [];
  var cupData = {
    maxHigh: newData[1][0],
    maxHighDate: newData[4][0],
    minLow: newData[2][0],
    minLowDate: newData[4][0],
    cupDepth: 0,
    breakoutDate: 0,
    partialCup: false
  };
  
  newData[4].forEach(function(date, index) {
    if (newData[1][index] <= cupData.maxHigh &&
        newData[2][index] >= cupData.minLow &&
        (cupData.maxHigh - cupData.minLow) / cupData.minLow > 0.30) {
      cupData.cupDepth = ( cupData.maxHigh - newData[2][index] ) / cupData.maxHigh > cupData.cupDepth ? ( cupData.maxHigh - newData[2][index] ) / cupData.maxHigh : cupData.cupDepth;
      if (date - cupData.maxHighDate > 39312000000) {
        cupData.minLow = newData[2][index];
        cupData.minLowDate = date;
        cupData.cupDepth = 0;
        cupData.maxHigh = newData[1][index];
        cupData.maxHighDate = date;
      } else if (index === newData[4].length - 1) {
        cupData.partialCup = true;
        cupData.breakoutDate = date;
        cups.push(Object.assign({}, cupData));
      }
    }
    
    if (newData[1][index] > cupData.maxHigh) {
      if ((cupData.maxHigh - cupData.minLow) / cupData.minLow < 0.30 ||
          cupData.cupDepth < 0.12 ||
          date - cupData.maxHighDate < 3628800000) {
        cupData.maxHigh = newData[1][index];
        cupData.maxHighDate = date;
        cupData.cupDepth = 0;
      } else {
        cupData.breakoutDate = date;
        cups.push(Object.assign({}, cupData));
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
        if (cupData.cupDepth > 0.33 || date - cupData.maxHighDate > 39312000000) {
          cupData.minLow = newData[2][index];
          cupData.minLowDate = date;
          cupData.cupDepth = 0;
          cupData.maxHigh = newData[1][index];
          cupData.maxHighDate = date;
        } else if (index === newData[4].length - 1) {
          cupData.partialCup = true;
          cupData.breakoutDate = date;
          cups.push(Object.assign({}, cupData));
        }
      }
    }
  });
  
  console.log('cups');
  cups.forEach(function(cup) {
    console.log(JSON.stringify(cup));
  });
  
  // Build annotations for cups
  stockFig.layout.shapes = [];
  
  cups.forEach(function(cup) {
    var dateAverage = ( cup.maxHighDate.getTime() + cup.breakoutDate.getTime() ) / 2;
    var apex = cup.partialCup === true ? ( cup.maxHigh - ( cup.cupDepth * cup.maxHigh ) ) * 0.80 : ( cup.maxHigh - ( cup.cupDepth * cup.maxHigh ) ) * 0.75;
    var maxHighAdjusted = cup.maxHigh * 0.9;
    var breakout = cup.partialCup === true ? apex / 0.80 : maxHighAdjusted;
  
    stockFig.layout.shapes.push({
      path: 'M ' + cup.maxHighDate.getTime() + ', ' + maxHighAdjusted + ' Q ' + dateAverage + ', ' + apex + ' ' + cup.breakoutDate.getTime() + ', ' + breakout,
      type: 'path',
      line: {
        color: 'rgb(93, 164, 214)'
      }
    });
    
    stockFig.layout.shapes.push({
      type: 'rect',
      x0: cup.maxHighDate.getTime(),
      y0: cup.maxHigh + 0.10,
      x1: cup.breakoutDate.getTime(),
      y1: cup.maxHigh + 0.10 + cup.maxHigh * 0.05,
      fillcolor: 'rgb(93, 164, 214)',
      opacity: 0.2,
      line: {
        width: 0
      }
    });
  });
  
  Plotly.newPlot('ohlcChart', stockFig.data, stockFig.layout);
  
  // Build volume chart
  var volumeData =[];
  
  // Build dataset
  volumeData = [{
    x: data[4].map(function(d) { return new Date(d[0], d[1]-1, d[2]); }),
    y: data[5],
    type: 'bar',
    marker: { color: data[0].map(function(open, index) {
      return data[3][index] >= data[0][index] ? 'rgb(93,170,136)' : 'rgb(255,121,113)';
    }) },
    showlegend: false,
    hoverinfo: 'y'
  }];
    
  // Handle volume chart layout
  var layout = {
    margin: {b: 20, t: 10},
    yaxis: {title: 'Volume'},
    bargap: 0.75
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
      document.getElementById('tickerTextbox').placeholder = 'Example: GOOGL';
      document.getElementById('tickerTextbox').style.color = '';
      var responseData = JSON.parse(httpRequest.responseText).dataset;
      var formattedData = formatData(chartType, responseData);
      buildChart(chartType, formattedData);
    } else if (httpRequest.readyState === 4 && httpRequest.status === 404){
      document.getElementById('tickerTextbox').placeholder = 'Unavailable Ticker';
      //document.getElementById('tickerTextbox').style.placeholder.color = 'rgb(255,0,0)';
      document.getElementById('tickerTextbox').value = '';
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
