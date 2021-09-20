// http://blog.thomsonreuters.com/index.php/mobile-patent-suits-graphic-of-the-day/
//credit for edge labels: http://bl.ocks.org/jhb/5955887
//credit for main vis: http://bl.ocks.org/mbostock/2706022

var globalConfig = {linkColor: 'black', linkOpacity: 0.4, sources: {}, sourcesIndex: 0 };
var globalLinks;
var globalNodes;
var globalData = {};

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .direction('s')
    .offset( [10, 0] )
    .html(function(d) 
    {
        var toWrite = '<strong>' + d.name + ':</strong><br><br>';
        toWrite += '<img src="' + d.profile_image_url_https +  '" alt="' + d.name + ' profile image"><br>';
        toWrite += "<strong>Tweet count:</strong> <span style='color:orange'>" + d.statuses.length+ "</span><br><br>";
        toWrite += "<strong>Source(s):</strong> <span style='color:orange'>" + d.sources + "</span><br><br>";

        return toWrite;
    });


var globalColors = 
    [
        {color: 'rgb(255, 0, 0)', active: false},       //red
        {color: 'rgb(255, 255, 0)', active: false},     //yellow
        {color: 'rgb(0, 255, 255)', active: false},     //cyan
        {color: 'rgb(255, 0, 255)', active: false},     //fuchsia
        {color: 'rgb(0, 255, 0)', active: false},       //lime
        {color: 'rgb(255, 165, 0)', active: false},     //orange
        {color: 'rgb(0, 128, 128)', active: false},     //teal
        {color: 'rgb(144, 238, 144)', active: false},   //lightgreen
        {color: 'rgb(65, 105, 225)', active: false},    //royalblue
        {color: 'rgb(165, 42, 42)', active: false},     //brown
        {color: 'rgb(128, 128, 0)', active: false},     //olive
        {color: 'rgb(255, 192, 203)', active: false},   //pink
        {color: 'rgb(230, 230, 250)', active: false},   //lavender
        {color: 'rgb(255, 69, 0)', active: false},      //orangered
        {color: 'rgb(135, 206, 250)', active: false},   //lightskyblue
        {color: 'rgb(255, 248, 220)', active: false},   //cornsilk
        {color: 'rgb(210, 180, 140)', active: false},   //tan
        {color: 'rgb(169, 169, 169)', active: false},   //darkgray
        {color: 'rgb(192, 192, 192)', active: false},   //silver
        {color: 'rgb(128, 0, 0)', active: false}        //maroon
    ];

function main()
{
    document.getElementById('uploadGraph').addEventListener('change', uploadGraphClick, false);
    document.getElementById('showUserLabels').addEventListener('change', genericToggle, false);
    document.getElementById('showSourceLabels').addEventListener('change', genericToggle, false);
}

function genericToggle()
{
    update( JSON.parse(globalData.target.result) );
}

function uploadGraphClick(evt)
{
    //credit to: http://www.html5rocks.com/en/tutorials/file/dndfiles/
    console.log('\nuploadGraphClick():');
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
            globalData = data;
            var graph = JSON.parse(data.target.result);
            update(graph);
        };
    })(f);

    reader.readAsText(f);
}

function formatSource(source)
{
    var aTag = document.createElement('a');
    aTag.href = source;
    return aTag.hostname + aTag.pathname;
}

function update(graph)
{
    console.log('\nupdate():');

    document.getElementById('charts').innerHTML = '';
    document.getElementById('canonicalURL').innerHTML = 'Activity for users who shared: <a href="' + graph['canonical-url'] + '" target="_blank">' + graph['canonical-url'] + '</a>';
    links = graph.links;
    nodes = graph.nodes;

    var width = 0.95 * window.innerWidth;
    var height = 0.8 * window.innerHeight;


    /*
    var linearScale = d3.scale.linear()
    .domain([10, 100])
    .range([1, 100]);
    */

    /*
    var sqrtScale = d3.scale.sqrt()
        .domain([10, 100])
        .range([2, 100]);
    */

    var force = d3.layout.force()
        .linkDistance(
            function(d)
            {
                var size = d.source.size;
                if( d.target.size > size )
                {
                    size = d.target.size;
                }

                if( size === 1 )
                {
                    size = 100;

                }
                else if( size > 100 && size < 500 )
                {
                   size = 200;
                }
                else
                {
                    size = 300;
                }

                return size;
            })
        .charge(-1000)
        .gravity(0.2)
        .size([width, height])
        .on("tick", tick);

    var svg = d3.select("#charts").append("svg")
        .attr("width", '100%')
        .attr("height", height);

    svg.call(tip);

    svg.append('defs').append('marker')
            .attr({'id':'arrowhead',
            'viewBox':'-0 -5 10 10',
            'refX': 25,//position of arrow on line
            'refY': 0,
            //'markerUnits':'strokeWidth',
            'orient':'auto',
            'markerWidth': 8,//size of arrowhead
            'markerHeight': 8,//size of arrowhead
            'xoverflow':'visible'})
            .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5');
                

    globalLinks = svg.selectAll(".link");
    globalNodes = svg.selectAll(".node");

    // Decorate links
    links.forEach(function(link)
    {        
        link.source = nodes[link.source];
        link.target = nodes[link.target];
    });

    // Restart the force layout.
    force
        .nodes(d3.values(nodes))
        .links(links)
        .start();

    var drag = force.drag()
        .on("dragstart", dragstart);

    // Update nodes.
    globalNodes = globalNodes.data(force.nodes());
    globalNodes.exit().remove();


    for(var node in nodes)
    {   
        var source = formatSource(nodes[node].sources[0]);
        if( globalConfig.sources[source] === undefined )
        {
            if( globalConfig.sourcesIndex < globalColors.length )
            {
                globalConfig.sources[source] = globalColors[globalConfig.sourcesIndex].color;    
                globalConfig.sourcesIndex++;
            }            
        }

        //sources
        //console.log(d.sources[0]);
        //linearScale/sqrtScale
        //var scaled = Math.round( Math.abs(sqrtScale(nodes[node].size)) );

        var scaled = Math.round(Math.sqrt(nodes[node].size *4/Math.PI));
        //console.log( nodes[node].screen_name, nodes[node].size, scaled );

        nodes[node].size = scaled + 10;
    }

    
    var nodeEnter = globalNodes.enter().append("g")
        .attr("class", "node")
        .on("mouseover", function(d)
        {
            tip.show(d);
        })
        .on("mouseout", function(d)
        {
            tip.hide();
        })
        .on("dblclick", function(d)
        {
            var link = 'https://twitter.com/' + d.screen_name;
            window.open(link, '_blank');
        })
        .call(force.drag);
    
    nodeEnter.append("circle")
    .attr("r", function(d)
    {
        return d.size;
    });

    
    nodeEnter.append("text")
        .attr("x", 12)
        .attr("dy", ".35em")
        .text(function(d)
        {
            var label = '';
            if( document.getElementById('showUserLabels').checked === true )
            {
                label = d.name;
            }

            if( document.getElementById('showSourceLabels').checked === true )
            {
                var commaFlag = '';
                if( label.length !== 0 )
                {
                    commaFlag = ', ';
                }

                label = label + commaFlag + formatSource(d.sources[0]);
            }

            if( label.length !== 0 )
            {
                if( d.statuses.length > 1000 )
                {
                   label += ' (' + d.statuses.length + ' tweets)';
                }
            }

            return label;
        });
    

    globalNodes.select("circle")
        .style("fill", function(d)
        {
            var source = formatSource(d.sources[0]);
            if( globalConfig.sources[source] !== undefined )
            {
                return globalConfig.sources[source];
            }
            
            return '#00C669';
        });


    // Update links.
    globalLinks = globalLinks.data(force.links());
    globalLinks.exit().remove();
    globalLinks.enter().append("line")
        .attr("class", "link")
        //.attr("id",function(d,i) {return 'edge'+i})
        .attr('marker-end','url(#arrowhead)')
        .style("stroke-opacity", globalConfig.linkOpacity)
        .style("stroke", globalConfig.linkColor);
}   

function tick()
{
    globalLinks
        .attr("x1", function(d)
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

    globalNodes
        .attr("transform", function(d)
        {
            return "translate(" + d.x + "," + d.y + ")";
        });
}

function dragstart(d) 
{
    d3.select('#charts').classed("fixed", d.fixed = true);   
}

function mouseover()
{
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 16);
}

function mouseout()
{
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 8);
}