var httpRequest;
  
// On click, make request to get data for stock named in textbox      
document.getElementById("tickerSubmitButton").onclick = function() {
  var stockName = document.getElementById("ajaxTextbox").value.toString().toUpperCase();
  var stockURL = 'https://www.quandl.com/api/v3/datasets/WIKI/' + stockName + '.json?api_key=fyWKH12nMF4VuWFaXARN&limit=100';
          
  if (stockName) {
     makeRequest(stockURL);
  }
}
  
// Define the http request function that gets data from argument url
function makeRequest(url) {
  httpRequest = new XMLHttpRequest();
          
  if (!httpRequest) {
    alert('Unable to create an XMLHTTP instance.');
    return false;
  }
          
  httpRequest.onreadystatechange = buildChart;
  httpRequest.open('GET', url);
  httpRequest.send();
}
  
// Get data and use it to populate chart
function buildChart() {
  try {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        console.log(JSON.parse(httpRequest.responseText));
        var response = JSON.parse(httpRequest.responseText).dataset.data;

        // Reformat Data
        var reformatData = response.reduce(function(result, dayArrayData) {
          result[4].push([ dayArrayData[0].slice(0, 4), dayArrayData[0].slice(5, 7), dayArrayData[0].slice(8) ]);
          result[0].push(dayArrayData[1]);
          result[1].push(dayArrayData[2]);
          result[2].push(dayArrayData[3]);
          result[3].push(dayArrayData[4]);
          return result;
        }, [ [], [], [], [], [] ]);
                
        // Create Plotly OHLC Chart
        var fig = PlotlyFinance.createOHLC(
          {
            open: reformatData[0],
            high: reformatData[1],
            low: reformatData[2],
            close: reformatData[3],
            dates: reformatData[4].map(function(d) { return new Date(d[0], d[1]-1, d[2]); })
          }
        );
        Plotly.newPlot('ohlcChart', fig.data, fig.layout);
                
      } else {
        alert('There was a problem with the request.');
      }
    }
  }
  catch( e ) {
    alert('Caught Exception: ' + e.description);
  }
}
