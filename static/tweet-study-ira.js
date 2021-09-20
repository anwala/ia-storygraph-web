// http://blog.thomsonreuters.com/index.php/mobile-patent-suits-graphic-of-the-day/
//credit for edge labels: http://bl.ocks.org/jhb/5955887
//credit for main vis: http://bl.ocks.org/mbostock/2706022

var globalConfig = {};
var globalData = {};

function genericLineChartVarGlyph(data, params)
{
    if( params == undefined )
    {
        params = {};
    }

    if( params.chartTitle == undefined )
    {
        params.chartTitle = 'chart title';
    }

    if( params.xAxisLabel == undefined )
    {
        params.xAxisLabel = 'x axis label';
    }

    if( params.yAxisLabel == undefined )
    {
        params.yAxisLabel = 'y axis label';
    }

    if (params.customWidth == undefined)
    {
        params.customWidth = 1200;
    }

    if (params.customHeight == undefined)
    {
        params.customHeight = 550;
    }

    if (params.customLeftMargin == undefined)
    {
        params.customLeftMargin = 50;
    }

    if( params.chartAnchor == undefined )
    {
        params.chartAnchor = 'body';
    }

    d3.select(params.chartAnchor).selectAll('*').remove();

    var margin = {
            top: 40,
            right: 20,
            bottom: 60,
            left: params.customLeftMargin
        },
    width = params.customWidth - margin.left - margin.right,
    height = params.customHeight - margin.top - margin.bottom;
    var lineWidth = 2;

    if( params.lineWidth )
    {
        lineWidth = params.lineWidth;
    }
    

    // Parse the date / time
    //var parseDate = d3.time.format("%d-%b-%y").parse;

    // Set the ranges
    //var x = d3.time.scale().range([0, width]);
    var x;
    if( params.xScaleRange == undefined )
    {
        x = d3.scale.linear().range([0, width]);
    }
    else if( params.xScaleRange == 'time' )
    {
        x = d3.time.scale().range([0, width]);
    }
    else
    {
        x = params.xScaleRange;
    }

    var y = d3.scale.linear().range([height, 0]);

    // Define the axes
    var xAxis = d3.svg.axis().scale(x)
        .orient("bottom").ticks(5);

    var yAxis = d3.svg.axis().scale(y)
        .orient("left").ticks(5);

    // Define the line
    var valueline = d3.svg.line()
        .x(function(d) { return x(d.xPos); })
        .y(function(d) { return y(d.yPos); });

    var tip = d3.tip().attr('class', 'd3-tip').offset([-10, 0]).html(function(d)
    {
        if (d.tooltip)
        {
            return "<span style='color:white'>" + d.tooltip + "</span>";
        }
        return "<strong>Frequency:</strong> <span style='color:white'>" + d.yPos + "</span>";
    });
        
    // Adds the svg canvas
    var svg = d3.select(params.chartAnchor)
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", 
                  "translate(" + margin.left + "," + margin.top + ")");

    svg.call(tip);

    for(var i=0; i<data.length; i++)
    {
        // Scale the range of the data
        x.domain(d3.extent(data[i], function(d) { return d.xPos; }));
        if( params.yDomain )
        {
            y.domain( params.yDomain );
        }
        else
        {
            y.domain([0, d3.max(data[i], function(d) { return d.yPos; })]);
        }

        // Add the valueline path.
        /*svg.append("path")
            .attr("class", "line")
            .attr("d", valueline(data[i]));*/
           

        svg.selectAll('line')
            .data( data[i] )
            .enter().append('path')
            .attr('style', function(d)
            {
                if( d.color )
                {
                    return 'stroke: ' + d.color;
                }   
                else
                {
                    return 'stroke: black';
                }
            })
            .style('stroke-width', lineWidth)
            .attr("d", valueline(data[i]));

        if( params.skipDot == undefined )
        {
            // Add dot
            svg.selectAll("dot")
                .data(data[i])
              .enter().append("path")
                .attr("d", 
                    d3.svg.symbol()
                    .type(function(d)
                    {
                        //shape options: "circle", "cross", "diamond", "square", "triangle-down", "triangle-up"
                        if( d.shape )
                        {
                            return d.shape;
                        }   
                        else
                        {
                            return 'circle';
                        }
                    })
                    .size(function(d){
                        if( d.size )
                        {
                            return d.size;
                        }
                        else
                        {
                            return 30;
                        }   
                    })
                )
                .style("stroke", function(d)
                {
                    if( d.stroke )
                    {
                        return d.stroke;
                    }
                    else if( d.color )
                    {
                        return d.color;
                    }
                    else
                    {
                        return 'black';
                    }
                })
                .style("fill",  function(d)
                {
                    if( d.color )
                    {
                        return d.color;
                    }
                    else
                    {
                        return 'black';
                    }
                })
                .attr("opacity", 0.7)
                .attr("transform", function(d) { return "translate(" + x(d.xPos) + "," + y(d.yPos) + ")"; })
                .on('mouseover', tip.show).on('mouseout', tip.hide);
        }
        
        // draw legend
        if( params.legend )
        {
            
            var lengendXpos = width;
            var lengendYpos = 10;

            if( params.legend.xPos )
            {
                lengendXpos = params.legend.xPos;
            }

            if( params.legend.yPos )
            {
                lengendYpos = params.legend.yPos;
            }

            var legend = svg.selectAll(".legend")
              .data(params.legend)
            .enter().append("g")
             .attr("class", "legend")
             .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

             // draw legend colored rectangles
              legend.append("path")
              .attr("d", 
                    d3.svg.symbol().type(function(d)
                    {
                        return d.shape;
                    })
                    .size(100)
              )
              .attr("transform", function(d) { return "translate(" + lengendXpos + "," + lengendYpos + ")"; })
              .style("stroke", function(d)
              {
                if( d.stroke )
                {
                    return d.stroke;
                }
                else if(d.color)
                {
                    return d.color;
                }
                else
                {
                    return 'black';
                }
              })
              .style("fill", function(d)
              {
                return d.color;
              });

                // draw legend text
              legend.append("text")
                  .attr("x", lengendXpos - 24)
                  .attr("y", lengendYpos)
                  .attr("dy", ".35em")
                  .style("text-anchor", "end")
                  .text(function(d)
                  {
                    return d.class;
                  });
        }
    }
    

    // Add the X Axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // Add the Y Axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // Add the X Axis label
    svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis).append("text").attr("class", "label")
    .attr("x", width / 2).attr("y", 50)
    .style("text-anchor", "end")
    .text(params.xAxisLabel);
    
    //Add title
    svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis).append("text")
    .attr("class", "label")
    .attr("x", width)
    .attr("y", -(height + 20))
    .style("text-anchor", "end")
    .html(params.chartTitle);

    // Add the Y Axis label
    svg.append("g").attr("class", "y axis").call(yAxis).append("text").attr("class", "label").attr("transform", "rotate(-90)").attr("y", 6).attr("dy", ".71em").style("text-anchor", "end").text(params.yAxisLabel);
}

function main()
{
    document.getElementById('uploadFile').addEventListener('change', uploadGraphClick, false);
}








function genericTimeStackedHist(dataset, params)
{

    if( params == undefined )
    {
        params = {};
    }

    if( params.chartTitle == undefined )
    {
        params.chartTitle = 'chart title';
    }

    if( params.xAxisLabel == undefined )
    {
        params.xAxisLabel = 'x axis label';
    }

    if( params.yAxisLabel == undefined )
    {
        params.yAxisLabel = 'y axis label';
    }

    if (params.customWidth == undefined)
    {
        params.customWidth = 1200;
    }

    if (params.customHeight == undefined)
    {
        params.customHeight = 550;
    }

    if (params.customLeftMargin == undefined)
    {
        params.customLeftMargin = 50;
    }

    if( params.chartAnchor == undefined )
    {
        params.chartAnchor = 'body';
    }
    d3.select(params.chartAnchor).selectAll('*').remove();

    var datasetHeading = ["xPos", "yPos"];

    var margin = {
            top: 40,
            right: 20,
            bottom: 60,
            left: params.customLeftMargin
        },
    width = params.customWidth - margin.left - margin.right,
    height = params.customHeight - margin.top - margin.bottom;
    var lineWidth = 2;

    if( params.lineWidth )
    {
        lineWidth = params.lineWidth;
    }

    // add the tooltip area to the webpage
    var tip = d3.tip().attr('class', 'd3-tip').offset([-10, 0]).html(function(d)
    {
        if (d.tooltip)
        {
            return "<span style='color:white'>" + d.tooltip + "</span>";
        }
        return "<strong>Frequency:</strong> <span style='color:white'>" + d.y + "</span>";
    });

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width]);
    var y = d3.scale.linear()
        .rangeRound([height, 0]);
    var z = d3.scale.category10();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    
    if( params.dateFormatStr )
    {
        xAxis.tickFormat(d3.time.format(params.dateFormatStr));
    }

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var svg = d3.select(params.chartAnchor).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.call(tip);

    var layers = d3.layout.stack()(datasetHeading.map(function(c)
    {
        return dataset.map(function(d)
        {
            return {
                x: d.date,
                y: d[c]
            };
        });
    }));

    x.domain(layers[0].map(function(d)
    {
        return d.x;
    }));
    y.domain([0, d3.max(layers[layers.length - 1], function(d)
    {
        return d.y0 + d.y;
    })]).nice();

    var layer = svg.selectAll(".layer")
        .data(layers)
        .enter().append("g")
        .attr("class", "layer")
        .style("fill", function(d, i)
        {
            return z(i);
        });

    layer.selectAll("rect")
        .data(function(d)
        {
            return d;
        })
        .enter().append("rect")
        .attr("x", function(d)
        {
            return x(d.x);
        })
        .attr("y", function(d)
        {
            return y(d.y + d.y0);
        })
        .attr("height", function(d)
        {
            return y(d.y0) - y(d.y + d.y0);
        })
        .attr("width", x.rangeBand() - 1)
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide);

    // Add the X Axis label
    svg.append("text")
        .attr("class", "label")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .style("text-anchor", "end")
        .attr("x", width / 2)
        .attr("y", 60)
        .text(params.xAxisLabel);

    // Add the X Axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")
        .attr("y", 0)
        .attr("x", 9)
        .attr("dy", ".35em")
        .attr("transform", "rotate(45)")
        .style("text-anchor", "start");

    //Add title
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .append("text")
        .attr("class", "label")
        .attr("x", width / 2)
        .attr("y", -(height + 10))
        .style("text-anchor", "end")
        .text(params.chartTitle);

    // Add the Y Axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(params.yAxisLabel);
}

function drawCreatedDist_old(data)
{
    var parseDate = d3.time.format('%Y-%m-%d').parse;

    var params = {};
    params.legend = [
        {class: 'General', shape: 'circle', color: 'blue'},
        {class: 'News Vertical', shape: 'square', color: 'orange'}
    ];

    params.colType = {
        G: {active: false, color: params.legend[0].color, class: params.legend[0].class, shape: params.legend[0].shape}, 
        NV: {active: false, color: params.legend[1].color, class: params.legend[1].class, shape: params.legend[1].shape}
    };

    var report = [];
    report.push([]);
    for(var date in data)
    {
        report[0].push( {xPos: parseDate(data[date]['created-at']), yPos: 2, color: 'blue', shape: 'circle'} );
    }

    console.log(report);

    params.chartTitle = 'Replaced story rate chart for query: ';
    params.xAxisLabel = ' day interval(s)';
    params.yAxisLabel = 'Replaced story rate';
    params.chartAnchor = '#chart1';
    params.xScaleRange = 'time';
    //params.yDomain = [0, 10];

    genericLineChartVarGlyph( report, params );
}

function drawCreatedDist(data)
{
    var dateFormatStr = '%Y-%m';
    var parseDate = d3.time.format(dateFormatStr).parse;

    var datesDict = {};
    var params = {};
    var report = [];

    for(var date in data)
    {
        var yyyyMMdd = data[date]['created-at'];
        var yyyyMM = yyyyMMdd.substr(0, 7);

        if( datesDict[yyyyMM] == undefined )
        {
            datesDict[yyyyMM] = {total: 1};
        }
        else
        {
            datesDict[yyyyMM].total += 1;
        }
    }
    
    var sortedDates = Object.keys(datesDict);
    sortedDates = sortedDates.sort();
    for(var i = 0; i<sortedDates.length; i++)
    {
        var yyyyMM = sortedDates[i];

        report.push({
            xPos: datesDict[yyyyMM].total,
            yPos: 0,
            date: parseDate(yyyyMM)
        });
        
    }
    
    params.dateFormatStr = dateFormatStr;
    params.chartAnchor = '#chart1';
    params.chartTitle = '';
    params.xAxisLabel = 'YYYY-MM';
    params.yAxisLabel = 'No. accounts created';
    genericTimeStackedHist(report, params);

    /*
        //'%Y-%m-%d'
        var data = globalData['accnt-created-at-payload'];
        var parseDate = d3.time.format('%Y-%m-%d').parse;

        var params = {};
        params.legend = [
            {class: 'General', shape: 'circle', color: 'blue'},
            {class: 'News Vertical', shape: 'square', color: 'orange'}
        ];

        params.colType = {
            G: {active: false, color: params.legend[0].color, class: params.legend[0].class, shape: params.legend[0].shape}, 
            NV: {active: false, color: params.legend[1].color, class: params.legend[1].class, shape: params.legend[1].shape}
        };

        var report = [];
        report.push([]);
        for(var date in data)
        {
            report[0].push( {xPos: parseDate(data[date]['created-at']), yPos: 2, color: 'blue', shape: 'circle'} );
        }

        console.log(report);

        params.chartTitle = 'Replaced story rate chart for query: ';
        params.xAxisLabel = ' day interval(s)';
        params.yAxisLabel = 'Replaced story rate';
        params.chartAnchor = '#chart1';
        params.xScaleRange = 'time';
        //params.yDomain = [0, 10];

        genericLineChartVarGlyph( report, params );
    */
}

function drawTweetDist(data)
{
    console.log('drawTweetDist():');

    if( data.length == 0 )
    {
        return;
    }
    
    var datesDict = {};
    for(var i = 0; i<data.length; i++)
    {
        var yyyyMM = data[i]['tweet-created-at'].substr(0, 7);
    
        if( datesDict[yyyyMM] )
        {
            datesDict[yyyyMM].count += 1;
        }
        else
        {
            datesDict[yyyyMM] = {count: 1};
        }
    }

    var plotData = [[]];
    var sortedDates = Object.keys(datesDict).sort();
    parseDate = d3.time.format('%Y-%m').parse;

    for(var i = 0; i< sortedDates.length; i++)
    {
        var tmp = {};
        tmp.xPos = parseDate( sortedDates[i] );
        /*tmp.color = 'blue';
        tmp.class = 'none';
        tmp.shape = 'square';*/
        tmp.yPos = datesDict[ sortedDates[i] ].count;
        tmp.tooltip = 'month: ' + sortedDates[i] + ', tweet count: ' + tmp.yPos;

        plotData[0].push(tmp);
    }

    var params = {};
    params.chartTitle = '';
    params.xAxisLabel = 'Time';
    params.yAxisLabel = 'Count of tweets';
    params.chartAnchor = '#chart2';
    params.xScaleRange = 'time';
    
    /*
    color
    temp.class = params.class;
    temp.shape = params.shape;  
    */
    genericLineChartVarGlyph( plotData, params );
}

function drawNgramSummary(data, key, id)
{   
    data = data[key]['top-k-overlap-n-gram-summary']['data-non-split'];

    var container = document.getElementById(id);
    var ol = document.createElement('ol');

    for(var i=0; i<data.length; i++)
    {
        var li = document.createElement('li');
        var txt = '"' + data[i][0] + '": ' + (data[i][2] * 100).toFixed(2) + '% (' + data[i][1] + ')';
        li.appendChild( document.createTextNode(txt) )
        ol.appendChild(li);
        console.log();
    }

    container.appendChild(ol);
}

function fixBrokenImgs()
{
    var imgs = document.getElementsByTagName('img');
    for(var i = 0; i<imgs.length; i++)
    {
        if( imgs[i].naturalHeight == 0 )
        {
            //imgs[i].src = 'https://memgator.cs.odu.edu/timegate/' + imgs[i].src;
        }
    }
}

function getUserTmplt(parentDiv, usr, pos)
{
    console.log('\ngetUserTmplt():');
    console.log( usr );    

    usr['Accnt'] = pos+1 + ', ' + usr['name'] +  ' (@' + usr['screen-name'] + ')';

    var keys = [
        'Accnt',
        'location',
        'created', 
        'followers-count', 
        'following-count', 
        'like-count', 
        'total-tweet-count', 
        'tweets-in-archive', 
        'timeline-in-archive',
        'description'
    ];
    var div = document.createElement('div');
    div.style = 'padding: 10px 0px 0px 10px; width:80%; height: 30%;';

    var ul = document.createElement('ul');
    for(var i=0; i<keys.length; i++)
    {
        var li = document.createElement('li');
        var txt = '<strong>' + keys[i] + '</strong>' + ': ' + usr[keys[i]];
        li.innerHTML = txt;
        ul.appendChild(li);
    }
        
    var img = document.createElement('img');
    img.src = usr['profile-image-url'];
    img.alt = 'Profile image: ' + usr['name'] + ' (@' + usr['screen-name'] + ')';
    img.className = 'avatar';

    div.appendChild(img);
    div.appendChild(ul);
    parentDiv.appendChild(div);
}

function printUsers(usrLst) 
{
    var parentDiv = document.getElementById('chart5');
    for(var i = 0; i<usrLst.length; i++)
    {
        getUserTmplt( parentDiv, usrLst[i], i );
        if( i== 9 )
            break;
    }

    setTimeout(function(){ fixBrokenImgs(); }, 3000);
}

function compare(a, b)
{
    if (a['tweets-in-archive'] > b['tweets-in-archive'])
        return -1;
    if (a['tweets-in-archive'] < b['tweets-in-archive'])
        return 1;
    
    return 0;
}

function drawTopUsers(data)
{  
    for(var sreenName in data)
    {
        data[sreenName]['screen-name'] = sreenName;
        data[sreenName]['tweets-in-archive'] = 0;
        data[sreenName]['timeline-in-archive'] = 0;

        if( data[sreenName]['archive-statuses'].mementos )
        {
            if( data[sreenName]['archive-statuses'].mementos.list )
            {
                data[sreenName]['tweets-in-archive'] = data[sreenName]['archive-statuses'].mementos.list.length;
            }
        }

        if( data[sreenName]['archive-timeline'].mementos )
        {
            if( data[sreenName]['archive-timeline'].mementos.list )
            {
                data[sreenName]['timeline-in-archive'] = data[sreenName]['archive-timeline'].mementos.list.length;    
            }
        }

    }

    data = Object.values(data)
    console.log( '\ndrawTopUsers():');
    
    data.sort(compare);

    printUsers( data );
    

}

function uploadGraphClick(evt)
{
    //credit to: http://www.html5rocks.com/en/tutorials/file/dndfiles/
    var files = evt.target.files;

    if( files.length == 0 )
    {
        return;
    }

    f = files[0];
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile)
    {
        return function(data)
        {
            var graph = JSON.parse(data.target.result);
            globalData = graph;
            
            
            if( globalData['accnt-created-at-payload'] )
            {
                //drawCreated_old( globalData['accnt-created-at-payload'] );
                drawCreatedDist( globalData['accnt-created-at-payload'] );
                drawTweetDist( globalData['tweet-created-at-payload'] );
            }

            if( globalData['ngram-summary'] )
            {
                drawNgramSummary(globalData['ngram-summary'], 'text', 'chart3');
                drawNgramSummary(globalData['ngram-summary'], 'description', 'chart4');
            }

            if( globalData['user-stats'] )
            {
                drawTopUsers( globalData['user-stats'] );
            }
        };
    })(f);

    reader.readAsText(f);
}