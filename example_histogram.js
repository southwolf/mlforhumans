var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

function set_doc_ids(docs) {
    for (var i=0; i<docs.length; i++) {
        docs[i].doc_id = i;
    }
}

function map_examples_to_bin(docs, n_bins) {
    for (var i=0; i<docs.length; i++) {
        var pred = docs[i].prediction;
        docs[i].pred_bin = Math.floor(pred*n_bins);
        if (docs[i].pred_bin >= n_bins) {
            docs[i].pred_bin -= 1;
        }
    }
}

function map_examples_to_pos(docs, n_bins, bin_width) {
    var correct_bin_index = [];
    var incorrect_bin_index = [];
    for (var i=0; i<n_bins; i++) {
        correct_bin_index[i] = 0;
        incorrect_bin_index[i] = 0;
    }


    for (var i=0; i<docs.length; i++) {
        var bin = docs[i].pred_bin;

        var correct = false;
        if (docs[i].prediction >= 0.5 && docs[i].true_class >= 0.5) {
            correct = true;
        } else if (docs[i].prediction < 0.5 && docs[i].true_class < 0.5) {
            correct = true;
        }

        // Set the relative x position of the data point
        var bin_x = 0.0;
        if (correct) {
            bin_x = (correct_bin_index[bin] % bin_width) * 1.0/(n_bins*bin_width+20) + bin/n_bins;
        } else {
            bin_x = (incorrect_bin_index[bin] % bin_width) * 1.0/(n_bins*bin_width+20) + bin/n_bins;
        }

        // Set the relative y position of the data point
        var bin_y = 0.0;
        if (correct) {
            bin_y = (Math.floor(correct_bin_index[bin] / bin_width) + 1) * (1.0/n_bins)/bin_width;
        } else {
            bin_y = -(Math.floor(incorrect_bin_index[bin] / bin_width) + 1)* (1.0/n_bins)/bin_width;
        }

        docs[i].bin_x = bin_x;
        docs[i].bin_y = bin_y;

        if (correct) {
            correct_bin_index[bin] += 1;
        } else {
            incorrect_bin_index[bin] += 1;
        }
    }
}

var xValue = function(d) { return d.bin_x;}, // data -> value
    xScale = d3.scale.linear().range([0, width]), // value -> display
    xMap = function(d) { return xScale(xValue(d));}, // data -> display
    xAxis = d3.svg.axis().scale(xScale).orient("bottom");

var yValue = function(d) { return d.bin_y;}, // data -> value
    yScale = d3.scale.linear().range([height, 0]), // value -> display
    yMap = function(d) { return yScale(yValue(d));}, // data -> display
    yAxis = d3.svg.axis().scale(yScale).orient("left");

// add the graph canvas to the body of the webpage
var svg_hist = d3.select("#histogram_div").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// add the hist_tooltip area to the webpage
var hist_tooltip = d3.select("body").append("div")
    .attr("class", "hist_tooltip")
    .style("opacity", 0);

var refLineFunction = d3.svg.line()
    .x(function (d) { return xMap(d); })
    .y(function (d) { return yMap(d); })
    .interpolate("linear");

var on_click_document = function(d) {
    if (typeof docs[d.doc_id].text[0].weight == 'undefined') {
        docs[d.doc_id].text = GenerateWeights(docs[d.doc_id].text);
    }
    ShowExample(docs[d.doc_id]);
}

// load data
d3.json("docs.json", function(error, data) {
    // Initialize the document IDs
    set_doc_ids(data.docs)

    // Figure out which examples go in which bins
    var n_bins = 10;
    var bin_width = 8;
    map_examples_to_bin(data.docs, n_bins);
    map_examples_to_pos(data.docs, n_bins, bin_width);

    // Then map them to an actual x/y position within [0, 1]

    // don't want dots overlapping axis, so add in buffer to data domain
    xScale.domain([d3.min(data.docs, xValue)-0.1, d3.max(data.docs, xValue)+0.1]);
    yScale.domain([d3.min(data.docs, yValue)-0.1, d3.max(data.docs, yValue)+0.1]);

    var square_size = 6;
    // draw dots
    svg_hist.selectAll(".hist_dot")
        .data(data.docs)
        .enter().append("rect")
        .attr("class", "hist_dot")
        .attr("width", square_size)
        .attr("height", square_size)
        .attr("x", xMap)
        .attr("y", yMap)
        .attr("fill-opacity", 1.0)
        .style("fill", function(d) { if (d.true_class >= 0.5) {return "rgb(0,150,0)"} else {return "rgb(255,0,0)"} })
        .on("mouseover", function(d) {
            console.log(d3.event.pageX + " " + d3.event.pageY);
            hist_tooltip.transition()
                .duration(200)
                .style("opacity", .9)
                .attr("fill", "rgb(255, 255, 255)");
            hist_tooltip.html("Document ID: " + d.doc_id + "<br />True class: " + d.true_class + "<br/>Prediction: " + d.prediction)
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            hist_tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function(d) {on_click_document(d)});

    // add a reference line
    var refLineData = [ {"bin_x": 0.485, "bin_y":-0.1}, {"bin_x":0.485, "bin_y":0.3}];
    var refLine = svg_hist.append("path")
        .attr("d", refLineFunction(refLineData))
        .attr("stroke", "black")
        .attr("stroke-width", 0.8)
        .attr("stroke-dasharray", "5,5")
        .attr("fill", "none");
});
