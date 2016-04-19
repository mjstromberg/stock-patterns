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
  buildOhlcChart: function(chartType, formattedData, patternSearchFunc, annotationFunc, cloneFunc) {
    var stockFig = PlotlyFinance.createOHLC(
      {
        open: formattedData[0],
        high: formattedData[1],
        low: formattedData[2],
        close: formattedData[3],
        dates: formattedData[4].map(function(d) { return new Date(d[0], d[1]-1, d[2]); })
      }
    );
  
    // Handle stock chart layout
    stockFig.layout.margin = {l: 60, r: 30, t: 50, b: 30};
    stockFig.layout.yaxis = {title: chartType === 'stock' ? 'Adjusted Stock Price ($)     ' : 'Price ($)     '};
    stockFig.layout.title = chartType === 'stock' ? formattedData[6].name.slice(0, formattedData[6].name.indexOf(')') + 1) + ' - Weekly' : 'S&P 500 - Daily';

    // Get stock patterns
    var patterns = patternSearchFunc(formattedData, cloneFunc);
    
    // Build annotations for patterns
    stockFig.layout.shapes = annotationFunc(patterns);
    
    // Build plot
    Plotly.newPlot('ohlc-chart', stockFig.data, stockFig.layout);
  },
  
  // Build the volume chart
  buildVolumeChart: function(formattedData) {
    // Build the volume chart object in array
    var volumeData = [{
      x: formattedData[4].map(function(d) { return new Date(d[0], d[1]-1, d[2]); }),
      y: formattedData[5],
      type: 'bar',
      marker: { color: formattedData[0].map(function(open, index) {
        return formattedData[3][index] >= formattedData[0][index] ? 'rgb(93,170,136)' : 'rgb(255,121,113)';
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
  findCups: function(formattedData, cloneFunc) {
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
      partialCup: false,
      chartLow: 0
    };
    
    // Cup finding algorithm
    newData[4].forEach(function(date, index) {
      if (cupData.chartLow === 0 || newData[2][index] < cupData.chartLow) {
        cupData.chartLow = newData[2][index];
      }
      
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
          cups.push(cloneFunc(cupData));
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
          cups.push(cloneFunc(cupData));
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
            cups.push(cloneFunc(cupData));
          }
        }
      }
    });
    
    return cups;
  },
  
  // Build annotations for patterns
  buildAnnotations: function(patterns) {
    var results = [];
    var chartMin = patterns[patterns.length - 1].chartLow;
    
    patterns.forEach(function(cup) {
      var dateAverage = ( cup.maxHighDate.getTime() + cup.breakoutDate.getTime() ) / 2;
      //var apex = cup.partialCup === true ? ( cup.maxHigh - ( cup.cupDepth * cup.maxHigh ) ) * 0.80 : ( cup.maxHigh - ( cup.cupDepth * cup.maxHigh ) ) * 0.75;
      var apex = cup.maxHigh - 2 * ( cup.cupDepth * cup.maxHigh );
      var maxHighAdjusted = cup.maxHigh * 0.9;
      var breakout = cup.partialCup === true ? Math.min(apex / 0.80, maxHighAdjusted) : maxHighAdjusted;

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
  },
  
  // Clone object's enumerable, non-nested properties/values since IE doesn't support Object.assing()
  clone: function(obj) {
    var clonedObj = {};
    
    for (var key in obj) {
      if({}.hasOwnProperty.call(obj,key)) {
        clonedObj[key] = obj[key];
      }
    }
    
    return clonedObj;
  }
};

/* ======================================================================== */
/* Http Request Function */
/* ======================================================================== */

var openHttpRequest = function (chartType, dataFuncs, chartFuncs) {
  var httpRequest = new XMLHttpRequest();
  
  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState === 4 && httpRequest.status === 200) {
      document.getElementById('ticker-textbox').placeholder = 'Example: GOOGL';
      var responseData = dataFuncs.parseData(httpRequest.responseText);
      var formattedData = dataFuncs.formatData(chartType, responseData);
      chartFuncs.buildOhlcChart(chartType, formattedData, chartFuncs.findCups, chartFuncs.buildAnnotations, chartFuncs.clone);
      chartFuncs.buildVolumeChart(formattedData);
    } else if (httpRequest.readyState === 4 && httpRequest.status === 404){
      document.getElementById('ticker-textbox').placeholder = 'Unavailable Ticker';
      document.getElementById('ticker-textbox').value = '';
    }
  };
  
  httpRequest.open('GET', dataFuncs.getUrl(chartType));
  httpRequest.send();
};

/* ======================================================================== */
/* Define Triggers */
/* ======================================================================== */

// Build initial indices
openHttpRequest('index', buildData, buildCharts);

// On click, make request to get data for stock named in textbox      
document.getElementById('ticker-submit-button').onclick = function() {
  openHttpRequest('stock', buildData, buildCharts);
};

// On keydown, make request to get data for stock named in textbox
document.getElementById('ticker-textbox').onkeydown = function(event) {
  if(event.keyCode === 13) {
    openHttpRequest('stock', buildData, buildCharts);
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
