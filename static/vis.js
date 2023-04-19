var h = 0.8 * window.innerHeight;
var widthPercent = 0.95;

var focus_node = null,
highlight_node = null;

var text_center = false;
var nodeFillFlag = false;

var min_score = 0;
var max_score = 1;

var highlight_color = "red";
var highlight_trans = 0.1;

var default_node_color = "darkblue";
var default_link_color = "black";

var nominal_base_node_size = 10;//***affected without thumbnail
var nominal_text_size = 12;
var max_text_size = 24;
var nominal_stroke = 1.5;
var max_stroke = 4.5;
var max_base_node_size = 36;

var globalConfig = {};
var globalGraph = {};
var globalURIParamsDict = {};
var globalNodeKey = 'title';
var globalMaxTitleLength = 60;
var globalZoomed;
var globalScale = 0.48;
var globalTranslate = [0, 0];

var globalEdgelabels;
var globalEdgepaths;
var globalNodeTypes = {};
var globalStoryGraphFilename = '';


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

    var refreshSecs = 300;
    globalConfig['link-opacity'] = 0.4;
    globalConfig['stopwatch-paused-at'] = {'refresh-seconds': refreshSecs, 'max-refresh-seconds': refreshSecs};
    //settings - end

    var URIParamsDict = processURI();

    if( URIParamsDict.cursor && URIParamsDict.hist && URIParamsDict.t )
    {
        console.log('\tURI REQUEST');
        setGlobalURIParamsDict(URIParamsDict);
        processRequest(undefined, globalURIParamsDict, 0);
    }
    else
    {
        console.log('\tNOT URI REQUEST');
        processRequest(undefined, undefined, 0);
    }

    refreshTimer(
        globalConfig['stopwatch-paused-at']['max-refresh-seconds'], 
        globalConfig['stopwatch-paused-at']['max-refresh-seconds']
    );
}

function setGlobalURIParamsDict(graphDetails)
{
    console.log('\nsetGlobalURIParamsDict()');
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

    if( globalURIParamsDict['cur-path'] )
    {
        let dateFrags = globalURIParamsDict['cur-path'].split('/');
        if( dateFrags.length == 3 )
        {
            globalURIParamsDict['yyyy'] = dateFrags[0];
            globalURIParamsDict['mm'] = dateFrags[1];
            globalURIParamsDict['dd'] = dateFrags[2];
        }
    }

    globalURIParamsDict.endpoint = getEndpointFromURI();
    initURI();
    console.log('\tglobalURIParamsDict:', globalURIParamsDict);
}

function processRequest(nowDate, uriReq, iter)
{   
    let endPoint = getEndpointFromURI();
    console.log('\nprocessRequest():', endPoint);

    if( endPoint != '/usa/' )
    {
        alert('\tUnknown endPoint: ' + endPoint);
        return;
    }
    
    nowDate = nowDate == undefined ? new Date() : nowDate;
    let yyyy; let mm; let dd;

    if( uriReq )
    {
        yyyy = uriReq.yyyy; mm = uriReq.mm; dd = uriReq.dd;
    }
    else
    {
        yyyy = nowDate.getUTCFullYear();
        mm = nowDate.getUTCMonth() + 1 + ''; mm = mm.length == 1 ? '0' + mm : mm;
        dd = nowDate.getUTCDate() + ''; dd = dd.length == 1 ? '0' + dd : dd;
    }
    
    let maxTrials = 100;
    let graphDetails = {'cur-path': yyyy + '/' + mm + '/' + dd, 'cursor': -1, 'hist': 1440};
    let usaGraph = getDownloadURIForEndPoint(endPoint, yyyy, mm, dd);
    let usaByteOffset = getDownloadURIForEndPoint(endPoint, yyyy, mm, dd, 'menu');
    
    document.getElementById('graphEndpoint').innerHTML = '...please wait, searching: ' + yyyy + '/' + mm + '/' + dd;
    console.log('\tusaGraph: ', usaGraph);
    console.log('\tusaByteOffset:', usaByteOffset);
    console.log('\tmaxTrials:', iter, 'of', maxTrials);


    fetch(usaByteOffset, {
        headers: {
            'Cache-Control': 'no-store'
        }
    })
    .then(function(response) 
    {
        if( iter == maxTrials )
        {
            document.getElementById('graphEndpoint').innerHTML = 'GRAPH NOT FOUND';
            return;
        }

        if(response.status !== 200 && uriReq == undefined) 
        {
            console.log('\tGraph not found');
            nowDate.setDate( nowDate.getDate() - 1 );
            processRequest( nowDate, undefined, iter+1 );
            return;
        }

        response.text().then(function (byteOffsets) 
        {
            byteOffsets = byteOffsets.split('\n');
            if( byteOffsets.length == 0 )
            {
                return;
            }

            if( byteOffsets[byteOffsets.length-1].trim() == '' )
            {
                byteOffsets.pop();
            }

            waitUntiFirstGraphLoaded(nowDate, usaGraph, byteOffsets, uriReq, graphDetails);
        });

    })
    .catch(function(err) 
    {
        console.log('\tFetch Error (for bytes offset) :-S', err);
        if( iter <= maxTrials )
        {
            nowDate.setDate( nowDate.getDate() - 1 );
            processRequest( nowDate, undefined, iter+1 );
        }
        else
        {
            document.getElementById('graphEndpoint').innerHTML = 'GRAPH NOT FOUND';
            return;
        }
    });
}

function waitUntiFirstGraphLoaded(nowDate, locGraph, byteOffsets, uriReq, graphDetails)
{
    console.log('\nwaitUntiFirstGraphLoaded()');

    graphDetails.cursor = byteOffsets.length - 1;
    graphDetails.hist = byteOffsets.length;

    if( uriReq )
    {
        graphDetails.cursor = uriReq.cursor == undefined ? graphDetails.cursor : uriReq.cursor;
        graphDetails.cursor = uriReq.cursor < 0 ? 0 : uriReq.cursor;
        graphDetails.cursor = uriReq.cursor > byteOffsets.length - 1 ? byteOffsets.length - 1 : uriReq.cursor;
    }
    console.log('\tcursor:', graphDetails.cursor);
    
    setGlobalURIParamsDict(graphDetails);
    populateDropdownMenu( byteOffsets, graphDetails.cursor );
    let byteOff = byteOffsets[graphDetails.cursor];
    byteOff = 'bytes=' + byteOff[1] + '-' + byteOff[2];


    fetch(locGraph, {
        headers: {
            Range: byteOff
        }
    })
    .then(function(response) 
    {
        if( response.status !== 206 )
        {
            console.log('\tGraph not found');
            return;
        }

        response.arrayBuffer().then(function(data){
            let graph = parseSGPayload(data);
            //watch-0
            main( graph );
        });

    })
    .catch(function(err) 
    {
        console.log('\tFetch Error (for graphs json) :-S', err);
        nowDate.setDate( nowDate.getDate() - 1 );
        processRequest( nowDate, undefined, 0 );
    });
}

function parseSGPayload(payload)
{
    console.log('\nparseSGPayload():');    
    console.log('\tLoading bytes file');

    let bytes = new Uint8Array(payload, 0, payload.byteLength);
    
    console.log('\tUncompressing bytes file');
    let gunzip = new Zlib.Gunzip( bytes ); 
    let plain = gunzip.decompress();
    let graph = '';
    
    
    console.log('\tDone uncompressing file');
    for (let i = 0; i < plain.length; i++) 
    {  
        graph += String.fromCharCode( plain[i] );
    }

    try 
    {
        return JSON.parse(graph);
    } 
    catch(e) {console.log('Graph parse error:', e);}

    return {};
}

function main(graph)
{
    console.log('\nmain():');
    document.getElementById('graphEndpoint').innerHTML = '...loading, please wait';
    document.getElementById('uploadGraph').addEventListener('change', uploadGraphClick, false);

    var endpoint = getEndpointFromURI();
    var visContainer = document.getElementById('visContainer');
    visContainer.setAttribute('style', 'width: ' + widthPercent*100 + '%; height: 100%');

    var addDetsToTitle = function(node, conComp)
    {
        if( node.title == undefined )
        {
            return '';
        }

        var avgDeg = -1;
        var annotation = node.title;

        for(var i = 0; i<conComp.length; i++)
        {
            if( conComp[i].nodes.indexOf(node.index) != -1 )
            {
                avgDeg = conComp[i]['avg-degree'].toFixed(2);
                break;
            }
        }

        annotation = '<br>Avg. degree: ' + avgDeg;        
        return annotation;
    };

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d, conComp)
        {
            if( d.title )
            {
                return '<strong>' + d.title + addDetsToTitle(d, conComp) + '</strong>';
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
    
    globalTranslate[0] = window.innerWidth/15.5;//3.5
    globalTranslate[1] = h / 4;
    
    svg.style("cursor", "move");
    var g = svg.append("g");
    svg.call(tip);

    var drawGraph = function (graph) 
    {
        formatGraph(graph);
        globalGraph = JSON.parse(JSON.stringify(graph));//create a non-ref copy
        

        if( globalGraph == null )
        {
            setTimestamp('timestamp', '');
            return;
        }

        if( Object.keys(globalGraph).length == 0 )
        {
            setTimestamp('timestamp', '');
            return;
        }

        addPageDetailsForEndpoint(endpoint);
        setTimestamp('timestamp', graph['timestamp']);
        document.getElementById('showLabelsChkbox').addEventListener('change', genericToggle, false);
        document.getElementById('showEdgeLabelsChkbox').addEventListener('change', genericToggle, false);
        document.getElementById('refreshGraph').addEventListener('change', refreshGraphToggle, false);
        document.getElementById('thumbNailsChkbox').addEventListener('change', advanceButton, false);
        document.getElementById('annotateChkbox').addEventListener('change', advanceButton, false);

        var getNodeSize = function(d)
        {
            if( d.custom )
            {
                if(d.custom.important && document.getElementById('annotateChkbox').checked == true )
                {
                    return '50px';
                }
            }

            return '20px';
        };

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
        if( document.getElementById('thumbNailsChkbox').checked === true )
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
                .attr("width", function(d)
                {
                    return getNodeSize(d);
                })
                .attr("height", function(d)
                {
                    return getNodeSize(d);
                })
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
                .attr("width", function(d)
                {
                    return getNodeSize(d);
                })
                .attr("height", function(d)
                {
                    return getNodeSize(d);
                });

            
            node = g.selectAll(".node")
            .data(graph.nodes)
            .enter().append('rect')
            .attr("rx", '10px')
            .attr("ry", '10px')
            .attr("x", "-12px")
            .attr("y", "-12px")
            .attr("width", function(d)
            {
                return getNodeSize(d);
            })
            .attr("height", function(d)
            {
                return getNodeSize(d);
            })
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
        var strokeOrFill = "stroke";
        var strokeOrFillColor = 'white';

        if (nodeFillFlag == true)
        {
            tocolor = "stroke";
            strokeOrFill = "fill";
        }

        
        var circle = node.append("path")
            .attr("d", d3.svg.symbol()
                .size(function(d)
                {
                    return 0;//Math.PI * Math.pow(size(d.size) || nominal_base_node_size, 2);
                })
                .type(function(d)
                {
                    return d.type;
                }))
            .style(tocolor, function(d)
            {
                if( d.color )
                {
                    return d.color;
                }
                else
                {
                    return default_node_color;
                }
            })
            .style("stroke-width", nominal_stroke)
            .style(strokeOrFill, strokeOrFillColor);

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
                if( d.custom )
                {
                    if( d.custom.important )
                    {
                        return 50;
                    }
                }
                
                return (size(d.size) || nominal_base_node_size);
            })
            .text(function(d)
            {
                return formatNodeText( d[globalNodeKey], globalMaxTitleLength );
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
                    var v = Math.PI * Math.pow(size(d.size) * base_radius / nominal_base_node_size || base_radius, 2);
                    if( d.custom )
                    {
                        if( d.custom.important )
                        {
                            v = v * 4;
                        }
                    }       
                    return v;
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
                        if( d.custom )
                        {
                            if( d.custom.important )
                            {
                                return 50;
                            }
                        }
                        
                        return (size(d.size) * base_radius / nominal_base_node_size || base_radius);
                    });
            }

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

        node.on("mouseover", function(d)
        {
            mouseover_event_handler(d);
            tip.show(d, graph['connected-comps']);
            toggleRightPanel(d);
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
            if( document.getElementById('stickyNodesChkbox').checked === false )
            {
                d3.select('#visContainer').classed("fixed", d.fixed = false); 
            }
        });
        

        force.on("tick", tick);
        globalZoomed();
        genericAfterGraphDrawn( globalGraph );

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

            
            /*
            //responsible for setting left/center/right graphTypes
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
            */
            
            var inputList = [
                { 
                    name: ' events ', 
                    id: 'staticShowEvents',
                    color: 'green',
                    evnt: genericToggle
                },
                { 
                    name: ' clusters ', 
                    id: 'staticShowClusters',
                    color: 'red',
                    evnt: genericToggle
                },
                { 
                    name: ' isolate stories ', 
                    id: 'staticShowIsolatedNodes',
                    color: 'black',
                    evnt: genericToggle
                },
                { 
                    name: ' right panel ', 
                    id: 'staticShowRightPanel',
                    color: 'black',
                    evnt: toggleRightPanel
                }
            ];

            for(var i=0; i<inputList.length; i++)
            {
                var input = document.createElement('input');
                input.type = 'checkbox';
                input.setAttribute('checked', 'true');
                input.id = inputList[i].id;
                input.addEventListener('change', inputList[i].evnt, false);

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
                    circle.style(strokeOrFill, strokeOrFillColor);
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
                circle.style(strokeOrFill, function(o)
                {
                    return isConnected(d, o) ? highlight_color : strokeOrFillColor;
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

            //mark special nodes - start
            if( document.getElementById('annotateChkbox').checked == true )
            {
                text.style("display", function(d)
                {
                    if( d.custom )
                    {
                        if( d.custom.important )
                        {
                            this.style.fontSize = '80px';
                            this.style.stroke = 'black';
                            this.style.strokeWidth = '3px';
                            this.innerHTML = formatNodeText('clq ' + d.custom['clique-rank'] + ' (' + d.custom['clique-size'] + '): ' + d.title, globalMaxTitleLength);
                        
                            return 'inline';
                        }
                    }
                    
                    return this.style.display;
                });
            }
            //mark special nodes - end



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
        //tracking - end
    };

    
    drawGraph(graph);
}




function getCurPath()
{
    if( globalURIParamsDict.endpoint == '/generic/' )
    {
        if( globalURIParamsDict.ap )
        {
            return globalURIParamsDict.ap.replace(/-/g, '/');
        }
    }
    
    return globalURIParamsDict['cur-path'];
}

function advanceButton(prevOrNext)
{
    //watch-2 - done
    console.log('advanceButton():');
    document.getElementById('refreshGraph').checked = false;
    
    if( prevOrNext == 'prev' )
    {
        globalURIParamsDict.cursor--;
        globalURIParamsDict.cursor = globalURIParamsDict.cursor < 0 ? globalURIParamsDict.hist - 1 : globalURIParamsDict.cursor;
    }
    else if( prevOrNext == 'next' )
    {
        globalURIParamsDict.cursor++;
        globalURIParamsDict.cursor = globalURIParamsDict.cursor >= globalURIParamsDict.hist ? globalURIParamsDict.cursor = 0 : globalURIParamsDict.cursor;
    }

    console.log('\tglobalURIParamsDict:', globalURIParamsDict);
    let locGraph = getDownloadURIForEndPoint(globalURIParamsDict.endpoint, globalURIParamsDict.yyyy, globalURIParamsDict.mm, globalURIParamsDict.dd);
    let graphSet = document.getElementById('graphSet');

    if( globalURIParamsDict.cursor >= graphSet.length )
        return;

    let byteOff = graphSet[ globalURIParamsDict.cursor ].value.split(', ');
    if( byteOff.length != 2 || locGraph == '' )
        return;
    byteOff = 'bytes=' + byteOff[1];
    
    
    fetch(locGraph, {
        headers: {
            Range: byteOff
        }
    })
    .then(function(response) 
    {
        if( response.status !== 206 )
        {
            console.log('\tGraph not found');
            return;
        }
        
        response.arrayBuffer().then(function(data){
            
            let graph = parseSGPayload(data);
            updateAddressCursor( globalURIParamsDict.cursor );
            graphSet.selectedIndex = globalURIParamsDict.cursor;
            main( graph );
        });

    })
    .catch(function(err) 
    {
        console.log('\tFetch Error :-S', err);
    });
    
}

function downloadGraphClick()
{
    console.log('\ndownloadGraphClick():');
    globalGraph['self'] = location.href;
    globalGraph['graph-pointer'] = {cursor: globalURIParamsDict.cursor, hist: globalURIParamsDict.hist, 'cur-path': getCurPath()};
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

function homeButtonClick()
{
    window.location.href = window.location.href.split('#')[0];
}

function graphDateLocalChange(cursor)
{
    cursor = isNaN(cursor) ? 0 : cursor; 
    let curDate = document.getElementById('graphDateLocal');
    if( curDate.value.length === 0 )
    {
        return;
    }

    let dateFrags = curDate.value.split('-');
    if( dateFrags.length != 3 && globalURIParamsDict.endpoint == undefined )
    {
        return;
    }

    let yyyy = dateFrags[0]; let mm = dateFrags[1]; let dd = dateFrags[2];
    let reqURI = getReqURIForEndPoint(globalURIParamsDict.endpoint, cursor, 0, yyyy, mm, dd);
    
    location.replace(reqURI);
    window.location.reload(false);
}

function graphSetChange()
{
    document.getElementById('refreshGraph').checked = false;
    let newCursorBytesOffset = this.value.split(', ');

    if( newCursorBytesOffset.length != 2 )
        return;
    
    let newCursor = +newCursorBytesOffset[0];
    let byteOff = 'bytes=' + newCursorBytesOffset[1];
    let locGraph = getDownloadURIForEndPoint(globalURIParamsDict.endpoint, globalURIParamsDict.yyyy, globalURIParamsDict.mm, globalURIParamsDict.dd);
    
    if( locGraph == '' )
        return
    
    fetch(locGraph, {
        headers: {
            Range: byteOff
        }
    })
    .then(function(response) 
    {
        if( response.status !== 206 )
        {
            console.log('\tGraph not found');
            return;
        }

        response.arrayBuffer().then(function(data){
            let graph = parseSGPayload(data);
            //watch-3
            globalURIParamsDict.cursor = newCursor;  
            updateAddressCursor( globalURIParamsDict.cursor );
            main( graph );
        });

    })
    .catch(function(err) 
    {
        console.log('\tFetch Error :-S', err);
    });
    
}

function populateDropdownMenu(menu, selectedIndex)
{
    //watch-5-done
    console.log('\npopulateDropdownMenu()');
    
    let graphSet = document.getElementById('graphSet');
    graphSet.innerHTML = '';
    graphSet.onchange = graphSetChange;

    for(let i = 0; i<menu.length; i++)
    {
        menu[i] = menu[i].split(', ');
        
        let option = document.createElement('option');
        option.value = i + ', ' + menu[i][1] + '-' + menu[i][2];
        option.text =  'T' + i + ' - ';

        let localTime = menu[i][0].trim();
        if( localTime.length != 0 )
        {
            localTime = specialDateFormat(localTime);

            option.text += ' ' + 
            localTime.twelveHour + ':' + localTime.minutes + ' ' + localTime.AMPM + ' (' + 
            localTime.weekdayName + ', ' + localTime.weekday + ' ' + localTime.monthName + ' ' + localTime.year + ')';
        }

        graphSet.appendChild(option);
    }

    if( selectedIndex < menu.length )
    {
        graphSet.selectedIndex = selectedIndex;
    }
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

    document.getElementById('graphEndpoint').innerHTML = '...loading, please wait';

    f = files[0];
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile)
    {
        return function(data)
        {   
            var graph = {};
            try 
            {
                graph = JSON.parse(data.target.result);
            }
            catch(e) 
            {
                document.getElementById('graphEndpoint').innerHTML = 'Graph load error.';
                return;
            }
            
            document.getElementById('refreshGraph').checked = false;
            var gEndPoint = getEndpointFromURI( graph.self );
            var curEndPoint = getEndpointFromURI();

            if( gEndPoint != curEndPoint )
            {
                alert('Endpoint mismatch: Will redirect to correct endpoint for you to re-upload graph.');
                window.location.href = window.location.href.split('#')[0].replace(curEndPoint, gEndPoint);
            }
            else
            {
                setGlobalURIParamsDict( graph['graph-pointer'] );
                main(graph);
            }
        };
    })(f);

    reader.readAsText(f);
}

function showGraphDetail()
{
    if( globalGraph.custom )
    {
        if( globalGraph.custom.description )
        {
            alert(globalGraph.custom.description);
        }
    }
}



function initURI()
{
    var apFlag = '';
    if( globalURIParamsDict.endpoint == '/generic/' )
    {
        if( globalURIParamsDict.ap )
        {
            apFlag = '&ap=' + globalURIParamsDict.ap;
        }
        else
        {
            apFlag = '&ap=' + globalURIParamsDict['cur-path'].replace(/\//g, '-');
        }
    }
    
    window.location.href = window.location.href.split('#')[0] + '#cursor=' + globalURIParamsDict.cursor + '&hist=' + globalURIParamsDict.hist + apFlag;
}

function updateAddressCursor(graphIndexer)
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

function addPageDetailsForEndpoint(graphName)
{
    if( globalGraph.custom )
    {
        if( globalGraph.custom.name )
        {
            graphName = globalGraph.custom.name;
        }
    }

    if( graphName.length > 30 )
    {
        graphName = graphName.substr(0, 30) + '...';
    }

    graphName = graphName.replace(/-/g, ' ');
    graphName = graphName.replace(/\//g, '');

    document.getElementById('graphEndpoint').innerHTML = graphName;
    document.getElementsByTagName('title')[0].innerHTML.split(': ')[0] + ': ' + graphName;
}

function getEndpointFromURI(optionalURI)
{
    var splitFlag = '/graphs/';
    if( optionalURI == undefined )
    {
        optionalURI = window.location.href;
    }

    if( optionalURI.indexOf('/graphs/dev/') !== -1 )
    {
        splitFlag += 'dev/';
    }

    var endPoint = optionalURI.split(splitFlag)[1].trim();
    endPoint = endPoint.split('/')[0].trim();
    
    //addPageDetailsForEndpoint(endPoint);

    console.log('\ngetEndpointFromURI():', endPoint);

    return '/' + endPoint + '/';
}

function getDownloadURIForEndPoint(endpoint, yyyy, mm, dd, type)
{
    /*
        Old:
        https://web.archive.org/storygraph/download/storygraph-data-usa-2022-07/21/byte-offsets-2022-07-21.txt
        https://web.archive.org/storygraph/download/storygraph-data-usa-2022-07/21/graphs-2022-07-21.jsonl.gz

        New:
        https://archive.org/download/storygraph-data-usa-2022-07/21/byte-offsets-2022-07-21.txt
        https://archive.org/download/storygraph-data-usa-2022-07/21/graphs-2022-07-21.jsonl.gz
    */
    type = type == undefined ? 'graph' : 'menu';
    if( endpoint == '/usa/' )
    {
        //Old: let prefix = '/storygraph/download/storygraph-data-usa-' + yyyy + '-' + mm + '/' + dd;
        //New:
        let prefix = 'https://archive.org/download/storygraph-data-usa-' + yyyy + '-' + mm + '/' + dd;
        if( type == 'graph' )
        {
            return prefix + '/graphs-' + yyyy + '-' + mm + '-' + dd + '.jsonl.gz';
        }
        else if( type == 'menu' )
        {
            return prefix + '/byte-offsets-' + yyyy + '-' + mm + '-' + dd + '.txt';
        }
    }
    
    return '';
}

function getReqURIForEndPoint(endpoint, cursor, hist, yyyy, mm, dd)
{
    if( endpoint == '/usa/' )
    {
        return '/storygraph/graphs/usa/#cursor=' + cursor + '&hist=' + hist + '&t=' + yyyy + '-' + mm + '-' + dd + 'T00:00:00';
    }
    
    return '';
}

function formatGraph(graph)
{
    if( graph.links )
    {
        for(var i = 0; i<graph.links.length; i++)
        {
            if( graph.links[i].label )
            {
                continue;
            }
            
            if( graph.links[i].rank && graph.links[i].sim )
            {
                graph.links[i].label = graph.links[i].rank + ' (' + graph.links[i].sim + ')';
                graph.links[i]['label-description'] = 'rank (sim)';
            }
            
        }
    }

    return graph;
}



function getCCPosForNode(conComps, nodeIndx)
{
    for(let i=0; i<conComps.length; i++)
    {
        if( conComps[i].nodes.indexOf(nodeIndx) != -1 )
        {
            return i;
        }
    }
    return -1;
}

function toggleRightPanel(node)
{
    //console.log('\ntoggleRightPanel():');

    let sortNodesBySim = function(links, nodeIndices)
    {
        let nodeScores = {};
        let sortedNodesIndx = [];
        for(let i=0; i<links.length; i++)
        {   
            let src = links[i].source;
            let tgt = links[i].target;
            
            if( nodeScores[src] == undefined )
            {
                nodeScores[src] = {score: 0, nodeIdx: src};
            }

            if( nodeScores[tgt] == undefined )
            {
                nodeScores[tgt] = {score: 0, nodeIdx: tgt};
            }   

            nodeScores[src].score += links[i].sim;
            nodeScores[tgt].score += links[i].sim;
        }

        for(let i=0; i<nodeIndices.length; i++)
        {
            let nodeIdx = nodeIndices[i];
            if( nodeScores[nodeIdx] )
            {
                nodeIndices[i] = nodeScores[nodeIdx];
            }
            else
            {
                nodeIndices[i] = {score: 0, nodeIdx: nodeIdx};
            }
        }

        return nodeIndices.sort(function(first, second) {return second.score - first.score;});
    };

    let getFirstEventCC = function(ccComps)
    {
        if( ccComps.length == 0 )
        {
            return -1;
        }

        let maxDets = {pos: 0, avgDeg: 0};
        let maxDetsBackup = {pos: 0, avgDeg: 0};
        
        for(let i=0; i<ccComps.length; i++)
        {
            if( ccComps[i]['avg-degree'] > maxDetsBackup.avgDeg )
            {
                maxDetsBackup.pos = i;
                maxDetsBackup.avgDeg = ccComps[i]['avg-degree'];
            }

            if( ccComps[i]['avg-degree'] > maxDets.avgDeg && ccComps[i]['node-details']['connected-comp-type'] == 'event' )
            {
               maxDets.pos = i;
               maxDets.avgDeg = ccComps[i]['avg-degree'];
            }
        }

        if( maxDets.avgDeg == 0 )
        {
            //here means no event found, so just take largest cc
            maxDets.pos = maxDetsBackup.pos;
        }

        //account for possibility of no event, then get largest avgDeg
        return maxDets.pos;
    };


    let ccPos = -1;
    if( node == undefined )
    {
        //here means function is called without mouse hover on story node, so pick first cc
        ccPos = getFirstEventCC( globalGraph['connected-comps'] );
    }
    else if( node.index == undefined )  
    {
        //here also means function is called without mouse hover on story node, so pick first cc
        ccPos = getFirstEventCC( globalGraph['connected-comps'] );
    }
    else
    {
        //here means node is defined, so check if node is part of cc, return -1 otherwise
        ccPos = getCCPosForNode(globalGraph['connected-comps'], node.index);
    }

    
    let masterPanel = document.getElementsByClassName('flex-container');
    if( masterPanel.length == 0 )
    {
        //console.log("\tmasterPanel.length = 0, returning");
        return;
    }


    masterPanel = masterPanel[0];
    let rightPanel = masterPanel.getElementsByClassName('flex-second-child');
    
    //remove existing flex
    
    if( document.getElementById('staticShowRightPanel').checked == false )
    {
        //here means user has switched off right panel
        for(let i=0; i<rightPanel.length; i++)
        {
            masterPanel.removeChild( rightPanel[i] );    
        }
        //console.log("\tcheckedState = false, returning");
        return;
    }
    

    if( ccPos == -1 )
    {
        //here means cc was not found, most likely hover over isolated node
        //console.log("\tccPos = -1, returning");
        return;
    }

    rightPanel = masterPanel.getElementsByClassName('flex-second-child');
    for(let i=0; i<rightPanel.length; i++)
    {
        /*if( rightPanel[i].getAttribute('ccIndx') == ccPos )
        {
            //here means table already exists so don't remove and redraw
            //console.log('ccIndx MATCH, returning');
            return;
        }*/

        masterPanel.removeChild( rightPanel[i] );    
    }

    let secPanel = document.createElement('div');
    secPanel.className = 'flex-second-child';

    let tableDiv = document.createElement('div');
    tableDiv.id = 'visDetailsTable';
    secPanel.setAttribute('ccIndx', ccPos);
    
    secPanel.appendChild(tableDiv);
    masterPanel.appendChild(secPanel);


    //from here, draw graph details    
    let tdArray = [];
    let nodeIndices = JSON.parse(JSON.stringify(globalGraph['connected-comps'][ccPos].nodes));    
    nodeIndices = sortNodesBySim(globalGraph.links, nodeIndices);
    for(let i=0; i<12; i++)
    {
        if( i >= nodeIndices.length )
        {
            break;
        }
        let n = nodeIndices[i].nodeIdx;
        n = globalGraph.nodes[n];

        tdArray.push([]);
        let td;


        td = document.createElement('td');
        let img = document.createElement('img');
        
        if( n.favicon === undefined )
        {
            img.src = getFaviconFromLink(n.link);
        }
        else
        {
            if( n.favicon.length !== 0 )
            {
                img.src = n.favicon;
            }
            else
            {
                img.src = getFaviconFromLink(n.link);
            }
        }

        img.width = 16;
        img.height = 16;
        td.appendChild( img );
        tdArray[tdArray.length-1].push(td);   


        td = document.createElement('td');
        let aTag = document.createElement('a');
        aTag.href = n.link;
        aTag.text = n.title;
        aTag.title = n.title;
        aTag.target = '_blank';

        td.appendChild( aTag );
        tdArray[tdArray.length-1].push(td);
    }
    
    let title = 'Connected Component Rank: ' + (ccPos + 1) + ' of ' + globalGraph['connected-comps'].length + ', Average Degree: ' + globalGraph['connected-comps'][ccPos]['avg-degree'].toFixed(2);
    dynamicTable(
        ['', title],
        tdArray,
        '',
        'visDetailsTable'
    );
}

function genericAfterGraphDrawn(graph)
{
    console.log('\ngenericAfterGraphDrawn(): to be used for services needed after rendering graph.');
    toggleRightPanel();
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
                //graphDateLocalChange(1000);
                homeButtonClick();
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
        text = text.substr(0, titleLength) + '...';    
    }

    return text;
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

function dynamicTable(headerArray, tdArray, inCaptionText, containerID, extraParams)
{
    if (containerID != undefined )
    {
        //d3.select('#' + containerID).select('table').remove();
        var container = document.getElementById(containerID);
        if( container == undefined )
        {
            console.log('\ndynamicTable() container is null, returning');
            return;
        }

        var gridtable = container.getElementsByClassName('gridtable')[0];
        if( gridtable != undefined )
        {
            container.removeChild(gridtable);
        }
    }

    if( extraParams == undefined )
    {
        extraParams = {};
    }


    var table = document.createElement('table');
    table.className += "gridtable";

    if( extraParams.style )
    {
        table.style = extraParams.style;
    }

    var tr = document.createElement('tr');
    for (var i = 0; i < headerArray.length; i++)
    {
        var headingText = document.createTextNode(headerArray[i]);
        var header = document.createElement('th');

        header.appendChild(headingText);
        tr.appendChild(header);
    }
    table.appendChild(tr);

    var caption = document.createElement('caption');
    caption.id = 'tableCaption';
    caption.innerHTML = inCaptionText;

    var tableBody = document.createElement('tbody');
    table.appendChild(tableBody);
    table.appendChild(caption);

    for (var i = 0; i < tdArray.length; i++)
    {
        var tr = document.createElement('tr');
        tableBody.appendChild(tr);
        for (var j = 0; j < tdArray[i].length; j++)
        {
            tr.appendChild(tdArray[i][j]);
        }
    }

    if (containerID != undefined)
    {
        var container = document.getElementById(containerID);
        container.appendChild(table);
    }
    else
    {
        document.body.appendChild(table);
    }
}
/*
Trash remove:
http://dougbtv.com/2014/04/16/decompressing-gzipped-with-javascript/
*/