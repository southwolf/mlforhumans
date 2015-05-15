var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = 1100 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;
var selected_document = 0;

function set_doc_ids(docs) {
    for (var i=0; i<docs.length; i++) {
        docs[i].doc_id = i;
    }
}

function map_examples_to_bin(docs, n_bins) {
    for (var i=0; i<docs.length; i++) {
        var pred = docs[i].predict_proba[1];
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
        if (docs[i].prediction === docs[i].true_class) {
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
    selected_document = d.doc_id;
    current = d.doc_id;
    //sort_order = "document_order";
    //d3.select("#sort_button").text("Sort words based on weights")
    GetPredictionAndShowExample(d.features, d.true_class);
}

// load data
d3.json("3ng.json", function(error, data) {
    // Initialize the document IDs
    set_doc_ids(data.test)
    test_accuracy = data.test_accuracy;

    var class_names = data.class_names;
    // Figure out which examples go in which bins
    var n_bins = 14;
    var bin_width = 8;
    map_examples_to_bin(data.test, n_bins);
    map_examples_to_pos(data.test, n_bins, bin_width);

    // Then map them to an actual x/y position within [0, 1]

    xScale.domain([d3.min(data.test, xValue), d3.max(data.test, xValue)]);
    // don't want dots overlapping axis, so add in buffer to data domain
    yScale.domain([d3.min(data.test, yValue)-0.1, d3.max(data.test, yValue)+0.1]);

    var square_size = 6;
    // draw dots
    svg_hist.selectAll(".hist_dot")
        .data(data.test)
        .enter().append("rect")
        .attr("class", "hist_dot")
        .attr("width", square_size)
        .attr("height", square_size)
        .attr("x", xMap)
        .attr("y", yMap)
        .style("fill", function(d) { return d.true_class === 1 ? "rgb("+pos_color+")" : "rgb("+neg_color+")" })
        .style("opacity", function(d) { return d.doc_id === selected_document ? 1.0 : 0.4})
        .on("mouseover", function(d) {
            var xPosition = parseFloat(d3.select(this).attr("x"));
            var yPosition = parseFloat(d3.select(this).attr("y"));

            // Change the style of the square
            d3.select(this)
                .attr("height", square_size + 10)
                .attr("width", square_size + 10)
                .attr("x", xPosition-square_size)
                .attr("y", yPosition-square_size)
                .style("opacity", 1.0)

            hist_tooltip.transition()
                .duration(200)
                .style("opacity", .9)
                .attr("fill", "rgb(255, 255, 255)");

            var s = "Document ID: " + d.doc_id + "<br />True class: ";
            s += class_names[d.true_class];
            s += "<br/>Prediction: ";
            s += class_names[d.prediction];
            s += "<br /> P(" + class_names[1] + ") = ";
            s += + d.predict_proba[1];
            hist_tooltip.html(s)
                //"Document ID: " + d.doc_id + "<br />True class: " + d.true_class + "<br/>Prediction: " + d.prediction)
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 70) + "px");
        })
        .on("mouseout", function(d) {
            var xPosition = parseFloat(d3.select(this).attr("x"));
            var yPosition = parseFloat(d3.select(this).attr("y"));

            d3.select(this)
                .attr("height", square_size)
                .attr("width", square_size)
                .attr("dx", 0.1)
                .attr("x", xPosition+square_size)
                .attr("y", yPosition+square_size)
                .style("opacity", function(d){return d.doc_id == selected_document ? 1.0 : 0.4});

            hist_tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function(d) {
            d3.selectAll(".hist_dot")
                .style("opacity", 0.4);

            d3.select(this)
                .style("opacity", 1.0);

            on_click_document(d);
        });

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
        .attr("x", width/2-200)
        .attr("y", 50)
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Overall Model Performance. Held-out accuracy: " + test_accuracy)
        // TODO: Change this hardcode

    // Draw x-axis label
    svg_hist.append("text")
        .attr("x", width/2-130)
        .attr("y", height-25)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("P(" + class_names[1] + ") | example), given by the model")
    svg_hist.append("text")
        .attr("x", width/2-130)
        .attr("y", height-10)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Examples above the horizontal axis are classified correctly.")
    svg_hist.append("text")
        .attr("x", width/2-15)
        .attr("y", height-45)
        .style("font-size", "14px")
        .text("0.5")
    svg_hist.append("text")
        .attr("x", 0)
        .attr("y", height-45)
        .style("font-size", "14px")
        .text("0.0")
    svg_hist.append("text")
        .attr("x", width - 20)
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
        .text("True class: " + class_names[1]);
    svg_hist.append("text")
        .attr("x", legend_x + 25)
        .attr("y", legend_y + 20)
        .attr("dy", "14px")
        .style("font-size", "14px")
        .text("True class: " + class_names[0]);
    svg_hist.append("rect")
        .attr("x", legend_x + 10)
        .attr("y", legend_y + 10)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", "rgb(" + pos_color + ")");
    svg_hist.append("rect")
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
