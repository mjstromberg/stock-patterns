/*
Operations:
  trigger
  httpRequest
    buildData
    buildCharts
    
var buildData = {
  getUrl: function(chartType),
  parseData: function(response),
  formatData: function(chartType, data)
}

var buildCharts = {
  buildOhlcChart: function(chartType, formattedData),
  buildVolumeChart: function(formattedData),
  findCups: function(formattedData),
  buildAnnotations: function(cups)
}
*/

/* ======================================================================== */
/* Object that holds data building related methods */
/* ======================================================================== */

var buildData = {
  // Determine the correct data url
  getUrl: function(chartType) {
    return chartType === 'stock' ? 
      'https://www.quandl.com/api/v3/datasets/WIKI/' + 
      document.getElementById('ticker-textbox').value.toString().toUpperCase() + 
      '.json?api_key=fyWKH12nMF4VuWFaXARN&limit=100&collapse=weekly' :
      'https://www.quandl.com/api/v3/datasets/YAHOO/INDEX_GSPC.json?api_key=fyWKH12nMF4VuWFaXARN&limit=100';
  },
  
  // Parse the response data from the http request
  parseData: function(response) {
    return JSON.parse(response).dataset;
  },
  
  // Format the parsed data
  formatData: function(chartType, dataset) {
    var reformattedStockData = dataset.data.reduce(function(result, dayArrayData) {
    // result = [ adjOpen, adjHigh, adjLow, adjClose, date, volume ]
    result[4].unshift([ dayArrayData[0].slice(0, 4), dayArrayData[0].slice(5, 7), dayArrayData[0].slice(8) ]);
    result[0].unshift(dayArrayData[chartType === 'stock' ? 8 : 1]);
    result[1].unshift(dayArrayData[chartType === 'stock' ? 9 : 2]);
    result[2].unshift(dayArrayData[chartType === 'stock' ? 10 : 3]);
    result[3].unshift(dayArrayData[chartType === 'stock' ? 11 : 4]);
    result[5].unshift(dayArrayData[5]);
    return result;
  }, [ [], [], [], [], [], [] ]);
  
  reformattedStockData[6] = dataset;
  return reformattedStockData;
  }
};

/* ======================================================================== */
/* Object that holds chart building related methods */
/* ======================================================================== */

var buildCharts = {
  // Build the OHLC chart object
  buildOhlcChart: function(chartType, formattedData, patternSearchFunc, annotationFunc) {
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
    stockFig.layout.margin = {l: 60, r: 30, t: 50, b: 30};
    stockFig.layout.yaxis = {title: chartType === 'stock' ? 'Adjusted Stock Price ($)     ' : 'Price ($)     '};
    stockFig.layout.title = chartType === 'stock' ? data[6].name.slice(0, data[6].name.indexOf(')') + 1) + ' - Weekly' : 'S&P 500 - Daily';

    // Get stock patterns
    var patterns = patternSearchFunc();
    
    // Build annotations for patterns
    stockFig.layout.shapes = annotationFunc(patterns);
    
    // Build plot
    Plotly.newPlot('ohlc-chart', stockFig.data, stockFig.layout);
  },
  
  // Build the volume chart
  buildVolumeChart: function(formattedData) {
    // Build the volume chart object in array
    var volumeData = [{
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
      margin: {l: 60, r: 30, t: 10, b: 30},
      yaxis: {title: 'Vol.'},
      bargap: 0.75
    };
    
    // Build plot
    Plotly.newPlot('volume-chart', volumeData, layout);
  },
  
  // Find cup patterns
  findCups: function(formattedData) {
    var newData = formattedData.slice();
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
    
    return cups;
  },
  
  // Build annotations for patterns
  buildAnnotations: function(patterns) {
    var results = [];
    
    patterns.forEach(function(cup) {
      var dateAverage = ( cup.maxHighDate.getTime() + cup.breakoutDate.getTime() ) / 2;
      var apex = cup.partialCup === true ? ( cup.maxHigh - ( cup.cupDepth * cup.maxHigh ) ) * 0.80 : ( cup.maxHigh - ( cup.cupDepth * cup.maxHigh ) ) * 0.75;
      var maxHighAdjusted = cup.maxHigh * 0.9;
      var breakout = cup.partialCup === true ? apex / 0.80 : maxHighAdjusted;

      results.push({
        path: 'M ' + cup.maxHighDate.getTime() + ', ' + maxHighAdjusted + ' Q ' + dateAverage + ', ' + apex + ' ' + cup.breakoutDate.getTime() + ', ' + breakout,
        type: 'path',
        line: {
          color: 'rgb(93, 164, 214)'
        }
      });

      results.push({
        type: 'rect',
        x0: cup.maxHighDate.getTime(),
        y0: cup.maxHigh + 0.10,
        x1: cup.breakoutDate.getTime(),
        y1: cup.maxHigh + 0.10 + cup.maxHigh * 0.05,
        fillcolor: 'rgb(93, 164, 214)',
        opacity: 0.3,
        line: {
          width: 0
        }
      });
    });
    
    return results;
  }
};

/* ======================================================================== */
/* Http Request Function */
/* ======================================================================== */

// Define the http request function that gets data from argument url
var openHttpRequest = function (chartType, url) {
  var httpRequest = new XMLHttpRequest();
          
  if (!httpRequest) {
    console.log('Unable to create an XMLHTTP instance.');
    return false;
  }
  
  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState === 4 && httpRequest.status === 200) {
      document.getElementById('ticker-textbox').placeholder = 'Example: GOOGL';
      document.getElementById('ticker-textbox').placeholder.color = '';
      var responseData = JSON.parse(httpRequest.responseText).dataset;
      var formattedData = formatData(chartType, responseData);
      buildChart(chartType, formattedData);
    } else if (httpRequest.readyState === 4 && httpRequest.status === 404){
      document.getElementById('ticker-textbox').placeholder = 'Unavailable Ticker';
      document.getElementById('ticker-textbox').placeholder.color = 'rgb(255,0,0)';
      document.getElementById('ticker-textbox').value = '';
    }
  };
  
  httpRequest.open('GET', url);
  httpRequest.send();
}


/* ======================================================================== */
/* DEFINE ACTIONS */
/* ======================================================================== */

// Build initial indices
getData('index', getIndexURL());

// On click, make request to get data for stock named in textbox      
document.getElementById('ticker-submit-button').onclick = function() {
  getData('stock', getStockURL());
};

// On keydown, make request to get data for stock named in textbox
document.getElementById('ticker-textbox').onkeydown = function() {
  if(event.keyCode === 13) {
    getData('stock', getStockURL());
  }
};

// On window resize, resize charts accordingly
window.onresize = function() {
  Plotly.Plots.resize(document.getElementById('ohlc-chart'));
  Plotly.Plots.resize(document.getElementById('volume-chart'));
};

// On info button click, show cup analyzer information
document.getElementById('show-aside').onclick = function() {
  var elem = document.getElementById('info-sidebar');
  var sidebarDisplay = window.getComputedStyle(elem, null).getPropertyValue('z-index');
  
  if (sidebarDisplay === '0') {
    document.getElementById('info-sidebar').style.display = 'block';
    document.getElementById('info-sidebar').style.left = '60vw';
    document.getElementById('info-sidebar').style.right = '0';
    document.getElementById('info-button').style.display = 'none';
    document.getElementById('close-button').style.display = 'block';
    document.getElementById('info-sidebar').style['z-index'] = 2;
    document.getElementById('background').style.display = 'block';
  } else {
    document.getElementById('info-sidebar').style.display = 'none';
    document.getElementById('info-sidebar').style.left = '100vw';
    document.getElementById('info-sidebar').style.right = '-40vw';
    document.getElementById('info-button').style.display = 'block';
    document.getElementById('close-button').style.display = 'none';
    document.getElementById('info-sidebar').style['z-index'] = '';
    document.getElementById('background').style.display = 'none';
  }
};  
