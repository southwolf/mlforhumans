var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = 1350 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

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
    var n_bins = 14;
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
        .style("fill", function(d) { if (d.true_class >= 0.5) {return "rgba("+pos_color+", 1.0)"} else {return "rgba("+neg_color+", 1.0)"} })
        .on("mouseover", function(d) {
            hist_tooltip.transition()
                .duration(200)
                .style("opacity", .9)
                .attr("fill", "rgb(255, 255, 255)");

            var s = "Document ID: " + d.doc_id + "<br />True class: ";
            s += d.true_class > 0.5 ? "Christianity" : "Athiesm";
            s += "<br/>Prediction: ";
            s += d.prediction > 0.5 ? "Christianity" : "Athiesm";
            hist_tooltip.html(s)
                //"Document ID: " + d.doc_id + "<br />True class: " + d.true_class + "<br/>Prediction: " + d.prediction)
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 70) + "px");
        })
        .on("mouseout", function(d) {
            hist_tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function(d) {on_click_document(d)});

    // add a reference line
    var refLineData = [ {"bin_x": 0.485, "bin_y":-0.03}, {"bin_x":0.485, "bin_y":0.3}];
    var refLine = svg_hist.append("path")
        .attr("d", refLineFunction(refLineData))
        .attr("stroke", "black")
        .attr("stroke-width", 0.8)
        .attr("stroke-dasharray", "5,5")
        .attr("fill", "none");
    // add a zero line
    var refLineData = [ {"bin_x": 0, "bin_y":-0.005}, {"bin_x":0.988, "bin_y":-0.005}];
    var refLine = svg_hist.append("path")
        .attr("d", refLineFunction(refLineData))
        .attr("stroke", "black")
        .attr("stroke-width", 0.8)
        .attr("fill", "none");

    // Draw title
    svg_hist.append("text")
        .attr("x", width/2-100)
        .attr("y", 50)
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Overall Model Performance")

    // Draw x-axis label
    svg_hist.append("text")
        .attr("x", width/2-52)
        .attr("y", height-25)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Model prediction")
    svg_hist.append("text")
        .attr("x", width/2-15)
        .attr("y", height-45)
        .style("font-size", "14px")
        .text("0.5")
    svg_hist.append("text")
        .attr("x", 112)
        .attr("y", height-45)
        .style("font-size", "14px")
        .text("0.0")
    svg_hist.append("text")
        .attr("x", width-122)
        .attr("y", height-45)
        .style("font-size", "14px")
        .text("1.0")

    // draw legend
    var legend_x = 110;
    var legend_y = 40;
    svg_hist.append("text")
        .attr("x", legend_x + 25)
        .attr("y", legend_y + 20)
        .style("font-size", "14px")
        .text("True class: Christianity");
    svg_hist.append("text")
        .attr("x", legend_x + 25)
        .attr("y", legend_y + 20)
        .attr("dy", "14px")
        .style("font-size", "14px")
        .text("True class: Athiesm");
    svg_hist.append("rect")
        .attr("class", "hist_dot")
        .attr("x", legend_x + 10)
        .attr("y", legend_y + 10)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", "rgb(" + pos_color + ")");
    svg_hist.append("rect")
        .attr("class", "hist_dot")
        .attr("x", legend_x + 10)
        .attr("y", legend_y + 25)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", "rgb(" + neg_color + ")");
    svg_hist.append("rect")
        .attr("x", legend_x)
        .attr("y", legend_y)
        .attr("width", 170)
        .attr("height", 45)
        .style("stroke", "#86a36e")
        .style("fill", "none");
});
