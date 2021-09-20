var h = 0.8 * window.innerHeight;
var widthPercent = 0.95;

var focus_node = null,
highlight_node = null;

var text_center = false;
var outline = false;

var min_score = 0;
var max_score = 1;

var highlight_color = "red";
var highlight_trans = 0.1;

var default_node_color = "#70B8FF";
var default_link_color = "black";

var nominal_base_node_size = 8;
var nominal_text_size = 12;
var max_text_size = 24;
var nominal_stroke = 1.5;
var max_stroke = 4.5;
var max_base_node_size = 36;

var globalConfig = {};
var globalGraph = {};
var globalURIParamsDict = {};
var globalThumbnailFlag = true;
var globalNodeKey = 'title';
var globalMaxTitleLength = 60;
var globalZoomed;
var globalScale = 1;
var globalTranslate = [0, 0];

var globalEdgelabels;
var globalEdgepaths;
var globalNodeTypes = {};

function advanceButton(prevOrNext)
{
    console.log('advanceButton():');
    document.getElementById('refreshGraph').checked = false;
    
    if( prevOrNext == 'prev' )
    {
        globalURIParamsDict.cursor--;
        if( globalURIParamsDict.cursor < 0 )
        {
            globalURIParamsDict.cursor = globalURIParamsDict.hist - 1;
        }
    }
    else
    {
        globalURIParamsDict.cursor++;
        if( globalURIParamsDict.cursor >= globalURIParamsDict.hist )
        {
            globalURIParamsDict.cursor = 0;
        }
    }

    console.log('\tglobalURIParamsDict:', globalURIParamsDict);

    setURI(globalURIParamsDict.cursor);
    main( globalURIParamsDict['cur-path'] + '/graph' + globalURIParamsDict.cursor + '.json' );
}

function downloadGraphClick()
{
    console.log('\ndownloadGraphClick():');
    globalGraph['self'] = location.href;
    globalGraph['graph-pointer'] = {cursor: globalURIParamsDict.cursor, hist: globalURIParamsDict.hist, 'cur-path': globalURIParamsDict['cur-path']};
    var typeDict = {json: 'application/json', txt: 'text/plain'};
    var blob = new Blob([JSON.stringify(globalGraph, null, 2)],
    {
        type: typeDict['json']
    });
    
    var url = window.URL.createObjectURL(blob);
    var outfilename = 'graph-' + globalGraph['timestamp'].split('.')[0].replace(/:/g, '-') + 'Z';

    var aTag = document.createElement('a');
    aTag.download = outfilename;
    aTag.href = url;
    aTag.style.display = 'none';
    aTag.click();
}

function graphTimeChange_obsolete()
{
    var graphTime = document.getElementById('graphTime').value;
    if( graphTime.length === 0 )
    {
        return;
    }


    var graphDate = globalGraph['timestamp'].split('T')[0];
    var curPath = graphDate.replace(/-/g, '/'); 
    var t0 = globalGraph['timestamp'];

    var t1 = graphTime;
    if( t1.length == 5 )//HH:MM
    {
        t1 = t1 + ':00';
    }
    t1 = graphDate + 'T' + t1 + 'Z';

    t0 = new Date(t0);
    t1 = new Date(t1);
    
    var diffMinutes = t1 - t0;
    diffMinutes = Math.round((diffMinutes/1000)/60);
    
    var pagination = 0;
    if( globalURIParamsDict.interval )
    {
        pagination = diffMinutes / globalURIParamsDict.interval;
    }
    else
    {
        pagination = diffMinutes / 10;
    }
    pagination = Math.round(+globalURIParamsDict.cursor + pagination);

    if( pagination >= globalURIParamsDict.hist )
    {
        pagination = globalURIParamsDict.hist - 1;
    }
    else if( pagination < 0 )
    {
        pagination = 0;
    }

    console.log('\tpagination:', pagination);
    console.log('\tcurPath:', curPath);

    globalURIParamsDict.cursor = pagination;
    globalURIParamsDict['cur-path'] = curPath;

    setURI(globalURIParamsDict.cursor);
    main( curPath + '/graph' + globalURIParamsDict.cursor + '.json' );
}

function homeButtonClick()
{
    window.location.href = window.location.href.split('#')[0];
}

function graphDateLocalChange()
{
    if( this.value.length === 0 )
    {
        return;
    }

    document.getElementById('refreshGraph').checked = false;

    var curPath = this.value.replace(/-/g, '/'); 
    globalURIParamsDict.cursor = 0;
    globalURIParamsDict['cur-path'] = curPath;

    setURI(globalURIParamsDict.cursor);
    main( curPath + '/graph' + globalURIParamsDict.cursor + '.json' );
}

function graphDatetimeLocalChange_obsolete()
{
    console.log('graphDatetimeLocalChange():', this.value);

    if( this.value.length === 0 )
    {
        return;
    }
    var datetime = new Date(this.value);

    var yyyy = datetime.getUTCFullYear();
    var mm = datetime.getUTCMonth() + 1 + '';
    if( mm.length === 1 )
    {
        mm = '0' + mm;
    }
    var dd = datetime.getUTCDate() + '';
    if( dd.length === 1 )
    {
        dd = '0' + dd;
    }

    var hours = datetime.getUTCHours() + '';
    if( hours.length === 1 )
    {
        hours = '0' + hours;
    }
    var minutes = datetime.getUTCMinutes() + '';
    if( minutes.length === 1 )
    {
        minutes = '0' + minutes;
    }
    var seconds = datetime.getUTCSeconds() + '';
    if( seconds.length === 1 )
    {
        seconds = '0' + seconds;
    }

    document.getElementById('graphDate').value = yyyy + '-' + mm + '-' + dd;
    document.getElementById('graphTime').value = hours + ':' + minutes + ':' + seconds;
    graphTimeChange();
}

function graphSetChange()
{
    document.getElementById('refreshGraph').checked = false;

    var newCursor = +this.value.split('.')[0].replace('graph', '');
    globalURIParamsDict.cursor = newCursor;

    setURI( globalURIParamsDict.cursor );
    main( globalURIParamsDict['cur-path'] + '/' + this.value );
}

function populateGraphSet(endPoint)
{
    console.log('\npopulateGraphSet()');

    d3.json('/static/graphs' + endPoint + globalURIParamsDict['cur-path'] + '/' + 'menu.json', function(error, menu)
    {
        if( error )
        {
            console.log('Error:', error);
            return;
        }

        var sortedGraphNames = Object.keys(menu);
        var graphSet = document.getElementById('graphSet');
        graphSet.innerHTML = '';
        graphSet.onchange = graphSetChange;

        sortedGraphNames.sort(
            function(a, b)
            {
                //a example a = 'graph0.json'
                return (+a.split('.')[0].replace('graph', '')) - (+b.split('.')[0].replace('graph', ''));
            });

        for(var i = 0; i<sortedGraphNames.length; i++)
        {
            var option = document.createElement('option');
            option.value = sortedGraphNames[i];

            var localTime = menu[sortedGraphNames[i]].timestamp;
            localTime = specialDateFormat(localTime);

            option.text =  'T' + i + ' - ' + 
            localTime.twelveHour + ':' + localTime.minutes + ' ' + localTime.AMPM + ' (' + 
            localTime.weekdayName + ', ' + localTime.weekday + ' ' + localTime.monthName + ' ' + localTime.year + ')';

            graphSet.appendChild(option);
        }

        graphSet.selectedIndex = globalURIParamsDict.cursor;
    });
}

function uploadGraphClick(evt)
{
    console.log('\nuploadGraphClick():');
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
            //verify update of uri based on upload, perform simple check before upload
            //if( graph['graph-pointer'].hist && graph['graph-pointer'].cursor )
            //{
                console.log('\tUPLOAD Request');
                document.getElementById('refreshGraph').checked = false;
                setGraphState( graph['graph-pointer'] );    
                main('', graph.timestamp, graph);
            //}
            //else
            //{
            //    console.log('\tBAD UPLOAD Request:', graph);
            //}
        };
    })(f);

    reader.readAsText(f);
}

function enableOrDisableNextButton_obsolete()
{
    if( globalURIParamsDict.cursor == globalURIParamsDict.graphIndexer )
    {
        document.getElementById('nextButton').disabled = true;
    }
    else
    {
        document.getElementById('nextButton').disabled = false;
    }
}

function setGraphState(graphDetails)
{
    console.log('\nsetGraphState()');
    for(var keyValue in graphDetails)
    {
        globalURIParamsDict[keyValue] = graphDetails[keyValue];
    }

    if( globalURIParamsDict.cursor === undefined )
    {
        globalURIParamsDict.cursor = 0;
    }
    else
    {
        if( globalURIParamsDict.cursor < 0 )
        {
            globalURIParamsDict.cursor = 0;
        }
    }

    if( globalURIParamsDict.t )
    {
        globalURIParamsDict['cur-path'] = globalURIParamsDict.t.split('T')[0];
        globalURIParamsDict['cur-path'] = globalURIParamsDict['cur-path'].replace(/-/g, '/');
    }

    initURI();
    console.log('\tglobalURIParamsDict:', globalURIParamsDict);
}

function initURI()
{
    window.location.href = window.location.href.split('#')[0] + '#cursor=' + globalURIParamsDict.cursor + '&hist=' + globalURIParamsDict.hist;
}

function setURI(graphIndexer)
{
    console.log('graphIndexer:', graphIndexer);
    
    var curIndex = window.location.href.indexOf('cursor=');
    if( curIndex !== -1 )
    {
        var ampIndex = window.location.href.indexOf('&', curIndex + 4);
        if( ampIndex !== -1 )
        {
            var strToReplace = window.location.href.substring(curIndex, ampIndex);
            location.replace(window.location.href.replace(strToReplace, 'cursor='+graphIndexer));
        }
    }
}

function processURI()
{
    //window.location.href = decodeURIComponent(window.location.href);

    var link = document.createElement('a');
    link.href = window.location.href;
    var params = link.hash.substr(1, link.hash.length-1).split('&');
    var URIParamsDict = {};

    for(var keyValue in params)
    {
        keyValue = params[keyValue];
        keyValue = keyValue.split('=');
        URIParamsDict[keyValue[0]] = keyValue[1];
    }

    return URIParamsDict;
}

function addPageDetailsForEndpoint(endPoint)
{
    endPoint = endPoint.replace(/-/g, ' ').toUpperCase();
    document.getElementById('graphEndpoint').innerHTML = endPoint
    document.getElementsByTagName('title')[0].innerHTML = 
    document.getElementsByTagName('title')[0].innerHTML.split(': ')[0] + ': ' + endPoint;
}

function getEndpointFromURI()
{
    var splitFlag = '/graphs/';
    if( window.location.href.indexOf('/graphs/dev/') !== -1 )
    {
        splitFlag += 'dev/';
    }

    var endPoint = window.location.href.split(splitFlag)[1].trim();
    endPoint = endPoint.split('/')[0].trim();
    
    addPageDetailsForEndpoint(endPoint);

    console.log('\ngetEndpointFromURI():', endPoint);

    return '/' + endPoint + '/';
}

function processNonURIRequest()
{
    var endPoint = getEndpointFromURI();   
    d3.json('/graphs/pointers' + endPoint, function(error, graphDetails)
    {
        if( error )
        {
            console(error);
        }
        setGraphState(graphDetails);
        
        storyGraphFilename = globalURIParamsDict['cur-path'] + '/graph' + globalURIParamsDict.cursor + '.json';
        main(storyGraphFilename);
    });
}

function preMain()
{   
    console.log('\npreMain():');

    //settings - start
    document.getElementById('zoomInButton').onclick = function()
    {
        globalScale += 0.1;
        if( globalScale > 7 )
        {
            globalScale = 7;
        }

        globalZoomed();
    };

    document.getElementById('zoomOutButton').onclick = function()
    {
        globalScale -= 0.1;
        if( globalScale < 0.1 )
        {
            globalScale = 0.1;
        }

        globalZoomed();
    };

    document.getElementById('prevButton').onclick = function()
    {
        advanceButton('prev');
    };

    document.getElementById('nextButton').onclick = function()
    {
        advanceButton('next');
    };

    document.getElementById('downloadGraph').onclick = downloadGraphClick;
    document.getElementById('homeButton').onclick = homeButtonClick;
    document.getElementById('graphDateLocal').addEventListener('change', graphDateLocalChange, false);

    globalConfig['link-opacity'] = 0.4;
    globalConfig['stopwatch-paused-at'] = {'refresh-seconds': 120, 'max-refresh-seconds': 120};
    resetTrackingDetails();
    //settings - end

    var URIParamsDict = processURI();

    if( URIParamsDict.cursor && URIParamsDict.hist && URIParamsDict.t )
    {
        console.log('\tURI REQUEST');
        setGraphState(URIParamsDict);

        storyGraphFilename = globalURIParamsDict['cur-path'] + '/graph' + globalURIParamsDict.cursor + '.json';
        main(storyGraphFilename, URIParamsDict.t);
    }
    else
    {
        console.log('\tNOT URI REQUEST');
        processNonURIRequest();
    }

    refreshTimer(
            globalConfig['stopwatch-paused-at']['max-refresh-seconds'], 
            globalConfig['stopwatch-paused-at']['max-refresh-seconds']
        );
}

function main(storyGraphFilename, timestamp, optionalGraph)
{
    console.log('\nmain():');
    console.log('\tstoryGraphFilename:', storyGraphFilename);

    setTimeout(function()
    {
        //graphset is a variable, so should be updated constantly
        populateGraphSet( getEndpointFromURI() );
    }, 10);
    
    
    var visContainer = document.getElementById('visContainer');
    document.getElementById('uploadGraph').addEventListener('change', uploadGraphClick, false);

    visContainer.setAttribute('style', 'width: ' + widthPercent*100 + '%; height: 100%');

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) 
        {
            if( d.title )
            {
                return '<strong>' + d.title + '</strong>';
            }
            else if( d.label )
            {
                return '<strong>' + d.label + '</strong>';
            }
            else
            {
                return '';
            }
        }); 

    var zoom = d3.behavior.zoom()
                .scaleExtent([0.1, 7]);//min_zoom = 0.1; max_zoom = 7;, consult zoomInButton() and zoomOutButton() iff constants change

    var color = d3.scale.linear()
        .domain([min_score, (min_score + max_score) / 2, max_score])
        .range(["lime", "yellow", "red"]);

    var size = d3.scale.pow().exponent(1)
        .domain([1, 100])
        .range([8, 24]);

    var force = d3.layout.force()
        .linkDistance(200)
        .charge(-1000)
        .gravity(0.2)
        .size([(widthPercent - 0.15) * window.innerWidth, h]);

    var drag = force.drag()
        .on("dragstart", dragstart);

    d3.select("#visContainer svg").remove();
    var svg = d3.select("#visContainer").append("svg")
        .attr('width', '100%')
        .attr('height', h);
    
    svg.style("cursor", "move");
    var g = svg.append("g");
    svg.call(tip);

    var drawGraph = function (graph) 
    {
        globalGraph = JSON.parse(JSON.stringify(graph));
        setTimestamp('timestamp', graph['timestamp']);

        document.getElementById('showLabelsChkbox').addEventListener('change', genericToggle, false);
        document.getElementById('showEdgeLabelsChkbox').addEventListener('change', genericToggle, false);
        document.getElementById('trackSubGraphChkbox').addEventListener('change', trackingChkboxClick, false);
        document.getElementById('refreshGraph').addEventListener('change', refreshGraphToggle, false);


        var linkedByIndex = {};
        graph.links.forEach(function(d)
        {
            linkedByIndex[d.source + "," + d.target] = true;
        });

        force
            .nodes(graph.nodes)
            .links(graph.links)
            .start();

        var link = g.selectAll(".link")
            .data(graph.links)
            .enter().append("line")
            .attr("class", "link")
            .attr('id', function(d,i){return 'edge'+i;})
            .style("stroke-width", nominal_stroke)
            .style("stroke-opacity", globalConfig['link-opacity'])
            .style("stroke", function(d)
            {
                return default_link_color;               
            });

        if( document.getElementById('showEdgeLabelsChkbox').checked === true )
        {
            addEdgeLabels();
        }

        var node;
        if( globalThumbnailFlag === true )
        {
            var defs = svg.append('defs');
            var allpatterns = defs.selectAll("pattern")
                .data(graph.nodes)
                .enter()
                .append('pattern')
                .attr('id', function(d)
                {
                    return d.id;
                })
                .attr("width", "20px")
                .attr("height", "20px")
                .append("image")
                .attr('xlink:href', function(d)
                {
                    if( d.favicon !== undefined )
                    {
                        if( d.favicon.length !== 0 )
                        {
                            return d.favicon;
                        }
                    }

                    return getFaviconFromLink(d.link);
                })
                .attr("width", "20px")
                .attr("height", "20px");

            
            node = g.selectAll(".node")
            .data(graph.nodes)
            .enter().append('rect')
            .attr("rx", '10px')
            .attr("ry", '10px')
            .attr("x", "-12px")
            .attr("y", "-12px")
            .attr("width", "20px")
            .attr("height", "20px")
            .attr("class", "node")
            .attr('fill', function(d)
            {
                return 'url(#' + d.id +')';
            })
            .attr('id', function(d)
            {
                return 'fav-' + d.id;
            })
            .call(force.drag);
        }
        else
        {            
            node = g.selectAll(".node")
            .data(graph.nodes)
            .enter().append("g")
            .attr("class", "node")
            .call(force.drag);         
        }
        
        
        /*
        node.on("dblclick", function(d)
        {
            d3.event.stopPropagation();
            var dcx = (window.innerWidth / 2 - d.x * zoom.scale());
            var dcy = (window.innerHeight / 2 - d.y * zoom.scale());
            zoom.translate([dcx, dcy]);
            g.attr("transform", "translate(" + dcx + "," + dcy + ")scale(" + zoom.scale() + ")");
        });
        */       


        var tocolor = "fill";
        var towhite = "stroke";

        if (outline)
        {
            tocolor = "stroke";
            towhite = "fill";
        }

        var circle = node.append("path")
            .attr("d", d3.svg.symbol()
                .size(function(d)
                {
                    return Math.PI * Math.pow(size(d.size) || nominal_base_node_size, 2);
                })
                .type(function(d)
                {
                    return d.type;
                }))
            .style(tocolor, function(d)
            {
                return default_node_color;
            })
            .style("stroke-width", nominal_stroke)
            .style(towhite, "white");

        var text = g.selectAll(".text")
            .data(graph.nodes)
            .enter()
            .append("svg:a").attr('xlink:href', function(d)
            {
                return d.link;
            })
            .attr('target', '_blank')
            .append("text")
            .attr("dy", ".35em")
            .style("font-size", nominal_text_size + "px")
            .style('fill', function(d)
            {   
                var nodeType = d['node-details'].type;
                var fill = 'black';
                
                if( nodeType !== undefined )
                {
                    if( nodeType.length !== 0 )
                    {
                        globalNodeTypes[ nodeType ] = { color: d['node-details'].color, checked: true };    
                    }
                }

                if( d['node-details'].color !== undefined )
                {
                    fill = d['node-details'].color;
                }
               
                return fill;
            })
            .on('mouseover', function(d)
            {
                d3.select(this).style('text-decoration', 'underline');
            })
            .on('mouseout', function(d)
            {
                d3.select(this).style('text-decoration', '');
            });

        if ( text_center )
        {
            text.text(function(d)
            {
                return formatNodeText(d[globalNodeKey], globalMaxTitleLength);
            })
            .style("text-anchor", "middle");
        }
        else
        {
            text.attr("dx", function(d)
            {
                return (size(d.size) || nominal_base_node_size);
            })
            .text(function(d)
            {
                return '\u2002' + formatNodeText( d.id + ': ' + d[globalNodeKey], globalMaxTitleLength );
            });
        }

        globalZoomed = function()
        {
            var stroke = nominal_stroke;
            if( nominal_stroke * zoom.scale() > max_stroke )
            {
                stroke = max_stroke / zoom.scale();
            }

            link.style("stroke-width", stroke);
            circle.style("stroke-width", stroke);
            var base_radius = nominal_base_node_size;

            if( nominal_base_node_size * zoom.scale() > max_base_node_size )
            {
                base_radius = max_base_node_size / zoom.scale();
            }

            circle.attr("d", d3.svg.symbol()
                .size(function(d)
                {
                    return Math.PI * Math.pow(size(d.size) * base_radius / nominal_base_node_size || base_radius, 2);
                })
                .type(function(d)
                {
                    return d.type;
                }));

            if( !text_center )
            {
                text.attr("dx", 
                    function(d)
                    {
                        return (size(d.size) * base_radius / nominal_base_node_size || base_radius);
                    });
            }

            var text_size = nominal_text_size;
            if( nominal_text_size * zoom.scale() > max_text_size )
            {
                text_size = max_text_size / zoom.scale();
            }
            text.style("font-size", text_size + "px");

            if( d3.event === null )
            {
                g.attr("transform", "translate(" + globalTranslate + ")scale(" + globalScale + ")");
                
                zoom.scale(globalScale);
                zoom.translate(globalTranslate);
            }   
            else
            {
                document.getElementById('refreshGraph').checked = false;
                g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                globalTranslate = d3.event.translate;
                globalScale = d3.event.scale;
            }
        };


        setGraphFilter(globalNodeTypes);
        zoom.on("zoom", globalZoomed);
        svg.call(zoom);
        genericToggle(true);
        trackSubgraph();

        node.on("mouseover", function(d)
            {
                mouseover_event_handler(d);
                tip.show(d);
            })
            .on("mousedown", function(d)
            {
                mouseover_event_handler(d);
            }).on("mouseout", function(d)
            {
                tip.hide();
                link.style("stroke-opacity", globalConfig['link-opacity']);
                if (focus_node !== null)
                {
                    focus_node = null;
                    if (highlight_trans < 1)
                    {
                        circle.style("opacity", 1);
                        text.style("opacity", 1);
                        link.style("opacity", 1);
                    }
                }

                exit_highlight();
            });

        node.on("click", function(d)
        {
            if( document.getElementById('trackSubGraphChkbox').checked === true )
            {
                setTrackingDetails(d);
            }

            if( document.getElementById('stickyNodesChkbox').checked === false )
            {
                d3.select('#visContainer').classed("fixed", d.fixed = false); 
            }
        });
        

        force.on("tick", tick);
        globalZoomed();

        function addEdgeLabels()
        {
            g.selectAll('.edgepath').remove();
            g.selectAll('.edgelabel').remove();

            globalEdgepaths = g.selectAll(".edgepath")
                .data(graph.links)
                .enter()
                .append('path')
                .attr({'d': function(d) {return 'M '+d.source.x+ ' '+d.source.y+' L '+ d.target.x +' '+d.target.y},
                       'class':'edgepath',
                       'fill-opacity':0,
                       'stroke-opacity':0,
                       'fill':'blue',
                       'stroke':'red',
                       'id':function(d,i) {return 'edgepath'+i}});

            globalEdgelabels = g.selectAll(".edgelabel")
                    .data(graph.links)
                    .enter()
                    .append('text')
                    .attr({'class':'edgelabel',
                           'id':function(d,i){return 'edgelabel'+i},
                           'dx':80,
                           'dy':0,
                           'font-size': 12,
                           'fill':'black'})
                     .on('mouseover', function(d)
                     {
                        if( d.rank && d.distance )
                        {
                            tip.show( {label: 'rank: ' + d.rank + ', distance: ' + d.distance} );    
                        }
                     })
                     .on('mouseout', tip.hide);
                        
            globalEdgelabels.append('textPath')
                    .attr('xlink:href',function(d,i) {return '#edgepath'+i})
                    .style("cursor", "pointer")
                    .text(
                        function(d)
                        {
                            if( d.label )
                            {
                                return d.label;
                            }
                            else
                            {
                                return '';
                            }
                        });
        }

        function setGraphFilter(graphTypes)
        {
            var filterContainer =  document.getElementsByClassName('filterContainer')[0];
            
            //patch to stop clearing container graph type has not changed - start
            /*if( JSON.stringify(globalConfig['prev-node-types']) === JSON.stringify(Object.keys(graphTypes)) )
            {
                console.log('\tsetGraphFilter(): No change in graph type, so returning');
                return;
            }*/
            //patch to stop clearing container graph type has not changed - end

            filterContainer.innerHTML = '';
            var shouldColorFlag = true;

            for(var graphType in graphTypes)
            {
                var input = document.createElement('input');
                input.type = 'checkbox';
                input.setAttribute('checked', 'true');
                input.id = 'show' + graphType;
                input.value = graphType;
                //temporarily disabled until authoritative solution
                input.disabled = true;
                input.addEventListener('change', genericToggle, false);
                
                var inputSpan = document.createElement('span');
                inputSpan.innerHTML = ' ' + graphType.trim() + ' ';
                inputSpan.style.color = graphTypes[graphType].color;

                filterContainer.appendChild(input);
                filterContainer.appendChild(inputSpan);
                shouldColorFlag = false;
            }
            
            var inputList = [
                { 
                    name: ' events ', 
                    id: 'staticShowEvents',
                    color: 'green'
                },
                { 
                    name: ' clusters ', 
                    id: 'staticShowClusters',
                    color: 'red'
                },
                { 
                    name: ' isolate stories ', 
                    id: 'staticShowIsolatedNodes',
                    color: 'black'
                }
            ];

            for(var i=0; i<inputList.length; i++)
            {
                var input = document.createElement('input');
                input.type = 'checkbox';
                input.setAttribute('checked', 'true');
                input.id = inputList[i].id;
                input.addEventListener('change', genericToggle, false);

                var inputSpan = document.createElement('span');
                inputSpan.innerHTML = inputList[i].name;
                
                if( shouldColorFlag === true )
                {
                    inputSpan.style.color = inputList[i].color;
                }

                filterContainer.append(input);
                filterContainer.append(inputSpan);
            }
        }

        function removeEdgeLabels()
        {
            g.selectAll('.edgepath').remove();
            g.selectAll('.edgelabel').remove();
        }

        function tick()
        {
            node.attr("transform", function(d)
            {
                return "translate(" + d.x + "," + d.y + ")";
            });
            text.attr("transform", function(d)
            {
                return "translate(" + d.x + "," + d.y + ")";
            });

            link.attr("x1", function(d)
                {
                    return d.source.x;
                })
                .attr("y1", function(d)
                {
                    return d.source.y;
                })
                .attr("x2", function(d)
                {
                    return d.target.x;
                })
                .attr("y2", function(d)
                {
                    return d.target.y;
                });

            node.attr("cx", function(d)
                {
                    return d.x;
                })
                .attr("cy", function(d)
                {
                    return d.y;
                });

            
            if( globalEdgepaths !== undefined )
            {
                globalEdgepaths.attr('d', 
                    function(d)
                    { 
                        var path ='M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
                        return path;
                    });
            }

            if( globalEdgelabels !== undefined )
            {
                globalEdgelabels.attr('transform',function(d,i)
                {
                    if ( d.target.x < d.source.x )
                    {
                        bbox = this.getBBox();
                        rx = bbox.x + bbox.width/2;
                        ry = bbox.y + bbox.height/2;
                        return 'rotate(180 '+rx+' '+ry+')';
                    }
                    else 
                    {
                        return 'rotate(0)';
                    }
                });
            }
        }

        function mouseover_event_handler(d)
        {
            link.style("stroke-opacity", 1.0);
            d3.event.stopPropagation();
                focus_node = d;
                set_focus(d);
                if (highlight_node === null) 
                {
                    set_highlight(d);    
                }
        }

        function exit_highlight()
        {
            highlight_node = null;
            if (focus_node === null)
            {
                svg.style("cursor", "move");
                if (highlight_color != "white")
                {
                    circle.style(towhite, "white");
                    text.style("font-weight", "normal");
                    link.style("stroke", function(o)
                    {
                        return default_link_color;
                    });

                    if( globalEdgelabels !== undefined )
                    {
                        globalEdgelabels.style('fill', function(o)
                        {
                            return 'black';
                        });
                    }
                }

            }
        }

        function set_focus(d)
        {
            if (highlight_trans < 1)
            {
                circle.style("opacity", function(o)
                {
                    return isConnected(d, o) ? 1 : highlight_trans;
                });

                text.style("opacity", function(o)
                {
                    return isConnected(d, o) ? 1 : highlight_trans;
                });

                link.style("opacity", function(o)
                {
                    return o.source.index == d.index || o.target.index == d.index ? 1 : highlight_trans;
                });
            }
        }

        function set_highlight(d)
        {
            svg.style("cursor", "pointer");
            
            if (focus_node !== null) 
            {
                d = focus_node;
            }
            
            highlight_node = d;

            if (highlight_color != "white")
            {
                circle.style(towhite, function(o)
                {
                    return isConnected(d, o) ? highlight_color : "white";
                });
                
                text.style("font-weight", function(o)
                {
                    return isConnected(d, o) ? "bold" : "normal";
                });
                
                link.style("stroke", function(o)
                {
                    if( o.source.index == d.index || o.target.index == d.index )
                    {
                        return highlight_color;
                    }
                    else
                    {
                        return default_link_color;
                    }
                });

                
                if( globalEdgelabels !== undefined )
                {
                    globalEdgelabels.style('fill', function(o)
                    {
                        if( o.source.index == d.index || o.target.index == d.index )
                        {
                            return highlight_color;
                        }
                        else
                        {
                            return 'white';
                        }
                    });
                }
            }
        }

        function isConnected(a, b)
        {
            return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
        }

        function hasConnections(a)
        {
            for (var property in linkedByIndex)
            {
                s = property.split(",");
                if ((s[0] == a.index || s[1] == a.index) && linkedByIndex[property]) return true;
            }
            return false;
        }

        function refreshGraphToggle()
        {
            if( document.getElementById('refreshGraph').checked === true )
            {
                //location.href = location.protocol + '//' + location.host + location.pathname;
                
                refreshTimer(
                    globalConfig['stopwatch-paused-at']['refresh-seconds'],
                    globalConfig['stopwatch-paused-at']['max-refresh-seconds']
                );
            }
        }

        function genericToggle(initFlag)
        {
            var disableTripleFlag = false;
            var mutualExclusiveIDs = ['staticShowIsolatedNodes', 'staticShowEvents', 'staticShowClusters'];

            var isoNodeCheckbox = document.getElementById('staticShowIsolatedNodes');
            var eventChkBox = document.getElementById('staticShowEvents');
            var showClustChkBox = document.getElementById('staticShowClusters');

            if( initFlag !== true && mutualExclusiveIDs.indexOf(this.id) === -1 )
            {
                //here means an id that is not in the mutualExclusiveIDs
                
                //temporarily disabled until authoritative solution
                //disableTripleFlag = true;
            }

            var clustEventDisplayFlags = {'event': eventChkBox.checked, 'cluster': showClustChkBox.checked};
            var labelFlag = document.getElementById('showLabelsChkbox').checked;

            var oneTypeChecked = false;
            var filterContainer =  document.getElementsByClassName('filterContainer')[0].getElementsByTagName('input');
            if( filterContainer.length > 1 && Object.keys(globalNodeTypes).length !== 0 )
            {
                for(var i=0; i<filterContainer.length; i++)
                {
                    if( filterContainer[i].id.indexOf('static') !== 0 )
                    {
                        var nodeType = filterContainer[i].value;
                        globalNodeTypes[ nodeType ].checked = filterContainer[i].checked;

                        if( globalNodeTypes[ nodeType ].checked === true )
                        {
                            oneTypeChecked  = true;
                        }
                    }
                }
            }
            
            var edgeLabelFlag = document.getElementById('showEdgeLabelsChkbox').checked;
            var atLeastOneEdgeVisibleFlag = false;

            node.style("display", function(d)
            {
                var nodeType = d['node-details'].type;
                var nodeConCompType = d['node-details']['connected-comp-type'];
                var displayVal = 'none';

                if( disableTripleFlag === true )
                {
                    if( oneTypeChecked === true )
                    {
                        isoNodeCheckbox.checked = true;
                        eventChkBox.checked = true;
                        showClustChkBox.checked = true;

                        isoNodeCheckbox.disabled = true;
                        eventChkBox.disabled = true;
                        showClustChkBox.disabled = true;
                    }
                    else
                    {
                        for(var i=0; i<filterContainer.length; i++)
                        {
                            if( filterContainer[i].id.indexOf('static') !== 0 )
                            {
                                filterContainer[i].checked = true;
                                filterContainer[i].disabled = true;
                            }
                        }

                        isoNodeCheckbox.disabled = false;
                        eventChkBox.disabled = false;
                        showClustChkBox.disabled = false;
                        genericToggle(true);
                    }

                    d.nodeVisibility = false;
                    displayVal = 'none';

                    if( Object.keys(globalNodeTypes).length !== 0 )
                    {
                        if( globalNodeTypes[ nodeType ].checked === true )
                        {
                            //visible display condition for isolated node
                            d.nodeVisibility = true;
                            displayVal = 'inline';
                        }
                    }
                }
                else
                {
                    if( nodeConCompType === '' && isoNodeCheckbox.checked === true )
                    {
                        //visible display condition for isolated node
                        d.nodeVisibility = true;
                        return 'inline';
                    }
                    else if( clustEventDisplayFlags[nodeConCompType] === true )
                    {
                        d.nodeVisibility = true;
                        return 'inline';
                    }
                    else
                    {
                        d.nodeVisibility = false;
                        displayVal = 'none';
                    }


                    if( isoNodeCheckbox.checked === false && eventChkBox.checked === false &&  showClustChkBox.checked === false )
                    {
                        /*
                            //temporarily disabled until authoritative solution
                            for(var i=0; i<filterContainer.length; i++)
                            {
                                if( filterContainer[i].id.indexOf('static') !== 0 )
                                {
                                    filterContainer[i].disabled = false;
                                }
                            }
                            genericToggle();
                        */
                    }
                }
                    
                return displayVal;
                
            });

            link.style("display", function(d)
            {
                var flag = d.source.nodeVisibility && d.target.nodeVisibility;
                linkedByIndex[d.source.index + "," + d.target.index] = flag;

                if(flag === true)
                {
                    atLeastOneEdgeVisibleFlag = true;
                }

                return flag ? 'inline' : 'none';
            });

            if( document.getElementById('showLabelsChkbox').checked === true )
            {
                //active: node labels only if the node labels are visible
                text.style("display", function(d)
                {
                    if( d.nodeVisibility == true )
                    {
                        return 'inline';
                    }
                    else
                    {
                        return 'none';
                    }
                });
            }
            else
            {
                //inactive: node labels unconditionally
                text.style("display", 'none');
            }

            if( edgeLabelFlag === true && atLeastOneEdgeVisibleFlag )
            {
                addEdgeLabels();
            }
            else
            {
                removeEdgeLabels();
            }
        }

        //tracking - start
        function getNodeDetail(index, indexer)
        {
            if( index < 0 || index >= globalGraph.nodes.length )
            {
                return {};
            }

            if( indexer === undefined )
            {
                return globalGraph.nodes[index];
            }
            else
            {
                return globalGraph.nodes[index][indexer];
            }
        }

        function getNodeDetails(nodes)
        {
            var nodeDetails = [];

            for(var i = 0; i<nodes.length; i++)
            {
                nodeDetails.push( getNodeDetail(nodes[i]) );
            }

            return nodeDetails;
        }

        function getEntitiesForNodes(nodes)
        {
            var entities = [];
            
            for(var i = 0; i<nodes.length; i++)
            {
                var singleEntitySet = getNodeDetail(nodes[i], 'entities');
                entities = entities.concat(singleEntitySet);
            }

            return entities;
        }

        function trackingChkboxClick()
        {
            if( document.getElementById('trackSubGraphChkbox').checked === false )
            {
                //reset tracking state
                subgraphHighlight(globalConfig.tracking.nodes, '');
                resetTrackingDetails();
            }
        }

        function subgraphHighlight(nodes, color)
        {           
            for(var i=0; i<nodes.length; i++)
            {
                var node = nodes[i];
                var rect = document.getElementById('fav-' + node.id);
                
                if( rect !== null )
                {
                    rect.style.stroke = color;
                    rect.style.strokeWidth = 20;
                    rect.style.strokeOpacity = 0.3;
                }               
            }
        }

        function trackSubgraph()
        {
            if( document.getElementById('trackSubGraphChkbox').checked === false || globalConfig.tracking.nodes.length === 0 )
            {
                return;
            }

            console.log('\ntrackSubgraph():');
            console.log( globalConfig.tracking.nodes );
            
            console.log('vs');
            console.log('NULL');

            for(var i = 0; i<globalGraph['connected-comps'].length; i++)
            {
                var query = {
                    'A': globalConfig.tracking.entities, 
                    'B': getEntitiesForNodes(globalGraph['connected-comps'][i].nodes)//these are candidates for comparing
                };

                httpPost(
                    query , 
                    '/graphs/ops/sim/', 
                    trackResultIn, 
                    getNodeDetails(globalGraph['connected-comps'][i].nodes)
                );
            }
        }

        function trackResultIn(result, source)
        {
            if( result.dist <= 0.7 )
            {
                console.log('\nMATCH:', result.dist);
                subgraphHighlight(source, 'green');
            }
        }

        function setTrackingDetails(member)
        {

            if( globalConfig.tracking.nodes.length !== 0 )
            {
                //since tracking state exists don't replace
                return;
            }

            var trackingType = member['node-details']['connected-comp-type'];
            if( trackingType === 'event' || trackingType === 'cluster' )
            {
                document.getElementById('refreshGraph').checked = false;
                document.getElementById('showLabelsChkbox').checked = false;
                genericToggle();
                   
                //get other members
                for(var i = 0; i<globalGraph['connected-comps'].length; i++)
                {
                    if( globalGraph['connected-comps'][i].nodes.indexOf(member.index) !== -1 )
                    {
                        globalConfig.tracking['nodes-index'] = i;
                        globalConfig.tracking.entities = getEntitiesForNodes( globalGraph['connected-comps'][i].nodes );

                        //found members of subgraph
                        for (var j=0; j<globalGraph['connected-comps'][i].nodes.length; j++)
                        {
                            var node = globalGraph['connected-comps'][i].nodes[j];
                            globalConfig.tracking.nodes.push( 
                                getNodeDetail(node)
                            );
                        }

                        subgraphHighlight(globalConfig.tracking.nodes, 'green');
                        //stop search since node membership is exclusive (one node cannot belong to multiple connected comps)
                        break;
                    }
                }
            }

            
        }

        //tracking - end
    };

    if( optionalGraph === undefined )
    {
        var endPoint = getEndpointFromURI();
        d3.json('/static/graphs' + endPoint + storyGraphFilename, function(error, graph)
        {
            if( error )
            {
                setTimestamp('timestamp', '');
                return;
            }

            if( timestamp !== undefined )
            {
                //timestamp is from uri request, check if this is the correct graph based on timestamp, cursor is essential but not sufficient
                var graphTime = graph['timestamp'].split('.')[0];
                console.log('\tcompare time:');
                console.log('\t\t', timestamp, ' vs ', graphTime);
                if( timestamp !== graphTime )
                {
                    console.log('\t\ttimestamp mismatch');
                    return;
                }
            }

            drawGraph(graph);
        });
    }
    else
    {
        drawGraph(optionalGraph);
    }    
}

function httpPost(jsonData, postURI, callback, callbackData)
{
    var xhr = new XMLHttpRequest();
    xhr.open('POST', postURI);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () 
    {
        if (xhr.readyState == 4 && xhr.status == 200) 
        {
            callback(
                JSON.parse(xhr.responseText), 
                callbackData
            );
        }
    }

    xhr.onerror = function()
    {
        console.log('httpPost(): Network error.');
        callback({}, {});
    };

    xhr.send( JSON.stringify(jsonData) );
}

function refreshTimer(refreshSeconds, maxRefreshSeconds)
{
    setTimeout(
    function()
    {
        var refreshSpan = document.getElementById('refreshTimer');

        if( document.getElementById('refreshGraph').checked === true )
        {
            refreshSpan.style.setProperty('background-color', 'inherit');
            refreshSpan.style.setProperty('text-decoration', 'none');
            refreshSpan.innerHTML = 'Update: ' + refreshSeconds + ' seconds';

            
            //set page title - start
            /*
                var pageTitle = document.getElementsByTagName('title')[0];
                var pageTitleText = pageTitle.innerHTML.split(':');
                if( pageTitleText.length === 1 )
                {
                    pageTitle.innerHTML = refreshSeconds + ': ' + pageTitleText[0];
                }
                else if( pageTitleText.length > 1 )
                {
                    pageTitle.innerHTML = refreshSeconds + ': ' + pageTitleText[1];
                }
            */
            //set page title - end

        
            refreshSeconds--;
            globalConfig['stopwatch-paused-at']['refresh-seconds'] = refreshSeconds;

            if( refreshSeconds < 0 )
            {
                processNonURIRequest();
                refreshTimer(maxRefreshSeconds, maxRefreshSeconds);
            }
            else
            {
                refreshTimer(refreshSeconds, maxRefreshSeconds);
            }
        }
        else
        {
            refreshSpan.style.setProperty('background-color', 'red');
            refreshSpan.style.setProperty('text-decoration', 'line-through');
        }
        
    }, 1000);
}

function dblclick_obsolete(d) 
{
    d3.select('#visContainer').classed("fixed", d.fixed = false);
}

function dragstart(d) 
{
    d3.select('#visContainer').classed("fixed", d.fixed = true);   
}

function formatNodeText(text, titleLength)
{
    text = text.trim();
    if( titleLength < text.length )
    {
        return text.substr(0, titleLength) + '...';    
    }
    else
    {
        return text;
    } 
}

function getFaviconFromLink(link)
{
    var aTag = document.createElement('a');
    aTag.href = link;
    return aTag.protocol + '//' + aTag.hostname + '/favicon.ico';
}   

function vis_by_type(type)
{
    switch (type)
    {
        case "circle":
            return keyc;
        case "square":
            return keys;
        case "triangle-up":
            return keyt;
        case "diamond":
            return keyr;
        case "cross":
            return keyx;
        case "triangle-down":
            return keyd;
        default:
            return true;
    }
}

function vis_by_node_score(score)
{
    if (isNumber(score))
    {
        if (score >= 0.666) return keyh;
        else if (score >= 0.333) return keym;
        else if (score >= 0) return keyl;
    }
    return true;
}

function vis_by_link_score(score)
{
    if (isNumber(score))
    {
        if (score >= 0.666) return key3;
        else if (score >= 0.333) return key2;
        else if (score >= 0) return key1;
    }
    return true;
}

function isNumber(n)
{
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function specialDateFormat(iso8601DateStr)
{
    var weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var datetime = new Date(iso8601DateStr);
    var timezone = datetime + '';
    timezone = timezone.split(' (')[1].split(')')[0];

    var hours = datetime.getHours();
    var suffix = (hours >= 12)? 'PM' : 'AM';
    hours = ((hours + 11) % 12 + 1);

    var minutes = datetime.getMinutes() + '';
    if( minutes.length === 1 )
    {
        minutes = '0' + minutes;
    }

    var yyyy = datetime.getFullYear();
    var mm = datetime.getMonth() + 1 + '';
    var dd = datetime.getDate() + '';
    var HH = datetime.getHours() + '';
    
    if( mm.length === 1 )
    {
        mm = '0' + mm;
    }
    if( dd.length === 1 )
    {
        dd = '0' + dd;
    }
    if( HH.length === 1 )
    {
        HH = '0' + HH;
    }

    return {
        year: datetime.getFullYear(),
        monthName: monthNames[datetime.getMonth()],
        
        weekdayName: weekday[datetime.getDay()],
        weekday: datetime.getDate(),

        twelveHour: hours,
        minutes: minutes,
        AMPM: suffix,

        timezone: timezone,

        monthMM: mm,
        dayDD: dd,
        timeHH: HH
    };
}

function setTimestamp(id, timestamp)
{
    console.log('\nsetTimestamp():');
    console.log('\ttimestamp:', timestamp);
    var tag = document.getElementById(id);
    if( tag !== undefined && timestamp.length !== 0 )
    {
        var timePayload = specialDateFormat(timestamp);
        tag.innerHTML = moment(timestamp).fromNow() + ' (' + timePayload.timezone + ')';
        var curURI = window.location.href;
        var tIndex = curURI.indexOf('&t=');
        var curTime = '&t=' + timestamp.split('.')[0];
        if( tIndex == -1 )
        {   
            location.replace(curURI + curTime);
        }
        else
        {
            var prevTime = curURI.substr(tIndex, timestamp.length);
            location.replace( curURI.replace(prevTime, curTime) );
        }
        
        var dateTimeValue = timestamp.split('.')[0].split('T');
        document.getElementById('graphDateLocal').value = dateTimeValue[0];//timePayload.t1.date;
    }
    else
    {
        tag.innerHTML = 'GRAPH NOT FOUND';
        document.getElementById('refreshGraph').checked = true;
    }
}

function resetTrackingDetails()
{
    globalConfig.tracking = {};
    globalConfig.tracking.nodes = [];
    globalConfig.tracking['nodes-index'] = -1;
    globalConfig.tracking.entities = {};
}