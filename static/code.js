var train_docs, test_docs, current, size, test_accuracy, previous_text, feature_attributes;
var train_statistics, test_statistics;
var explain_sentence = false;
var class_names;
// class_colors_i is by index, class_colors is by name
var class_colors, class_colors_i;
var current_object;
var selected_features = new Set()
var matrix;
var current_docs;


if (typeof json_file === 'undefined') {
  json_file = "3ng"
}

d3.json(json_file,  function(error, json) {
  if (error) return console.warn(error);
  train_docs = json.train;
  test_docs = json.test;
  current_docs = test_docs;
  train_statistics = json.statistics.train;
  test_statistics = json.statistics.test;
  feature_attributes = json.feature_attributes;
  test_accuracy = json.statistics.test.accuracy;
  class_names = json.class_names;
  class_names = _.map(class_names, function(i) {
    text = i.replace(".","-");
    return  text.length > 17 ? text.slice(0,14) + "..." : text;
  });
  // TODO: this only works for at most 20 classes. I don't know if we should
  // worry about this though - if you have more than 20, color is not going to
  // work anyway
  if (class_names.length <= 10) {
    class_colors = d3.scale.category10().domain(class_names);
    class_colors_i = d3.scale.category10().domain(_.range(class_names.length));
  }
  else {
    class_colors = d3.scale.category20().domain(class_names);
    class_colors_i = d3.scale.category20().domain(_.range(class_names.length));
  }

  //class_colors = ["rgba(" + neg_color + ",1)", "rgba(" + pos_color + ",1)", "yellow"];
  //docs[0].text = GenerateWeights(docs[0].text);
  // var max = d3.max(_.map(_.values(weights), Math.abs));
  // var min = d3.min(_.map(_.values(weights), Math.abs));
  min = 0;
  max = 1;
  size = d3.scale.linear().domain([min, max]).range([15, 40]);
  SetupDatabin();
  FirstDrawPrediction();
  FirstDrawTooltip();
  FirstDrawDatabin();
  DrawLegend();

  // 17 is bar height, 5 is space
  train_height = (17 + 5) * class_names.length + 80 + 20;
  var train_svg = d3.select("#statistics_div").append("svg")
  train_svg.attr("width", "255px").attr("height", train_height);
  train_svg.style("float", "left").style("padding", "0 px 20 px 0 px 20px");
  var test_svg = d3.select("#statistics_div").append("svg")
  test_svg.attr("width", "255px").attr("height", train_height);
  test_svg.style("float", "left").style("padding", "0 px 20 px 0 px 20px");
  DrawStatistics("Train", train_svg, 17, 130, train_statistics)
  DrawStatistics("Test", test_svg, 17, 130, test_statistics)
  var cm_svg = d3.select("#statistics_div").append("svg")
  matrix = new Matrix(cm_svg, test_statistics.confusion_matrix);
  matrix.populateMatrix(test_statistics.confusion_matrix)

  current = 0;
  GetPredictionAndShowExample(current_docs[0].features, current_docs[0].true_class);
  //ShowExample(docs[0]);
})

function GetPredictionAndShowExample(example_text_split, true_class) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://localhost:8870/predict');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
      if (xhr.status === 200) {
          var prediction_object = JSON.parse(xhr.responseText);
          current_object = GenerateObject(example_text_split, true_class, prediction_object);
          ShowExample(current_object);
          ShowWeights(current_object);
      }
  };
//xhr.send();
xhr.send(JSON.stringify({
    features: example_text_split,
    sentence_explanation: explain_sentence
}));
}

// Takes in a word array and the object returned by the python server, outputs
// an object that is used by ShowExample
function GenerateObject(feature_array, true_class, prediction_object) {
  ret = Object();
  ret.features = _.map(feature_array, function(w) {
        if (_.has(prediction_object.feature_weights, w)) {
          return {"feature" : w, "weight": prediction_object.feature_weights[w]["weight"], 'class' : prediction_object.feature_weights[w]["class"]};
        }
        else {
          return {"feature" : w, "weight": 0, cl : 0};
        }
      }
  )
  ret.prediction = prediction_object.prediction;
  ret.predict_proba = prediction_object.predict_proba;
  ret.true_class = true_class;
  ret.sorted_weights = prediction_object.sorted_weights;
  return ret;
}

function change(current_text) {
  if (current_text === null) {
    current_text = d3.select("#textarea").node().value;
  }
  //example_text_split = current_text.replace("\n", " \n ").split(" ");
  example_text_split = current_text.replace(/\n/g, " \n ").match(/[^ ]+/g);
  GetPredictionAndShowExample(example_text_split, current_docs[current].true_class);
}
function change_to_selection() {
  text = document.getSelection().toString();
  if (text !== "") {
    change(text.replace(/\n/g, "\n "))
  }
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }
}

function change_explanation() {
  if (explain_sentence == false) {
    explain_sentence = true;
    d3.select("#explain_button").text("Change to word explanation")
  }
  else if (explain_sentence == true) {
    explain_sentence = false;
    d3.select("#explain_button").text("Change to sentence explanation")
  }
  change(null);
}

var explain_text_div = d3.select("#explain_text_div");
var explain_features_div = d3.select("#explain_features_div");
var height = "50%";


/* --------------------------*/
// Prediction bars
var svg = d3.select("#prediction_bar")
svg.attr("width", "235px").attr("height", 225);
svg.style("float", "left");
var bar_height = 17;
var bar_width = 130;
var bar_x_scale = d3.scale.linear().range([0, bar_width]);
var bar_space = 5;
var bar_x = 90;
var bar_yshift = bar_height + 45;
function BarY(i) {
  return (bar_height + bar_space) * i + bar_yshift;
}

var t_bar_yshift = 60;
var t_bar_height = 80;
var t_y = d3.scale.linear().range([t_bar_height,0 ])
var num_bars;
var max_bars = 7;

function FirstDrawPrediction() {
  num_bars = Math.min(class_names.length, max_bars);
  //bar_width = 30;
  d = 0
  var bar = svg.append("g")
  bar.classed("prediction", true);
  for (i = 0; i < num_bars; i++) {
    rect = bar.append("rect");
    rect.classed("pred_rect", true);
    rect.attr("x", bar_x)
        .attr("y", BarY(i))
        .attr("height", bar_height)
        .attr("width", 0);
    bar.append("rect").attr("x", bar_x)
        .attr("y", BarY(i))
        .attr("height", bar_height)
        .attr("width", bar_width - 1)
        .attr("fill-opacity", 0)
        .attr("stroke", "black");
    text = bar.append("text");
    text.classed("prob-text", true);
    text.attr("y", BarY(i) + bar_height - 3).attr("fill", "black").style("font", "14px tahoma, sans-serif");
    //bar.append("text").attr("x", bar_x - 30).attr("y", BarY(i)).style("font", "14px tahoma, sans-serif").attr("fill", "black").text(d);
    text = bar.append("text");
    text.classed("class-name", true)
    text.attr("x", bar_x - 10).attr("y", BarY(i) + bar_height - 3).attr("fill", "black").attr("text-anchor", "end").style("font", "14px tahoma, sans-serif");
  }

  var true_class = svg.append("g")
  true_class.classed("true_class", true);
  true_class.append("circle")
       .attr("cx", bar_x + bar_height / 2)
       .attr("cy",  25)
       .attr("r",  bar_height / 2);
   true_class.append("text").attr("x", bar_x + bar_height / 2 + 20).attr("y", 30).attr("fill", "black").style("font", "14px tahoma, sans-serif");
   bar.append("text").attr("x", bar_x - 10).attr("y", 30).attr("text-anchor", "end").attr("fill", "black").style("font", "14px tahoma, sans-serif").text("True Class:");
   bar.append("text").attr("x", bar_x - 10).attr("y", 50).attr("text-anchor", "end").attr("fill", "black").style("font", "14px tahoma, sans-serif").text("Prediction:");
}

// Takes in a vector of predict_proba. If there are more than max_bars classes,
// aggregate the least probable ones into 'other';
function MapClassesToNameProbsAndColors(predict_proba, n_bars) {
  if (class_names.length <= n_bars) {
    return [class_names, predict_proba];
  }
  class_dict = _.map(_.range(class_names.length), function (i) {return {'name': class_names[i], 'prob': predict_proba[i], 'i' : i};});
  sorted = _.sortBy(class_dict, function (d) {return -d.prob});
  other = new Set();
  _.forEach(_.range(n_bars - 1, sorted.length), function(d) {other.add(sorted[d].name);});
  other_prob = 0;
  ret_probs = [];
  ret_names = [];
  for (d = 0 ; d < sorted.length; d++) {
    if (other.has(sorted[d].name)) {
      other_prob += sorted[d].prob;
    }
    else {
      ret_probs.push(sorted[d].prob);
      ret_names.push(sorted[d].name);
    }
  };
  ret_names.push("other");
  ret_probs.push(other_prob);
  return [ret_names, ret_probs];
}
function UpdatePredictionBar(ex) {
// Takes in an object that has the following attributes:
// features -> a list of (feature,weight) pairs.
// prediction -> a single integer
// predict_proba -> list of floats, corresponding to the probability of each // class
  data = ex.predict_proba;
  mapped = MapClassesToNameProbsAndColors(ex.predict_proba, max_bars)
  names = mapped[0];
  data = mapped[1];
  var pred = svg.selectAll(".prediction")
  bars = pred.selectAll(".pred_rect").data(data);
  bars.transition().duration(1000)
      .attr("width", function(d) { return bar_x_scale(d)})
      .style("fill", function(d, i) {return class_colors(names[i]);});
  bar_text = pred.selectAll(".prob-text").data(data);
  bar_text.transition().duration(1000)
      .attr("x", function(d) { return bar_x + bar_x_scale(d) + 5;})
      .attr("fill", "black")
      .text(function(d) { return d.toFixed(2)});
  name_object = pred.selectAll(".class-name").data(names)
  name_object.transition().duration(1000)
      .text(function(d) {return d;});
  d = ex.true_class
  var true_class = svg.selectAll(".true_class")
  true_class.select("circle").transition().duration(500)
      .style("fill", class_colors_i(d));
  true_class.select("text").text(class_names[d]);
}



/* --------------------------*/
// Tooltip
var tooltip_bars;
var tooltip_xshift = 10;
var tooltip = d3.select(".hovercard")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("left", "10px")
    .style("pointer-events", "none")

function FirstDrawTooltip() {
  tooltip_bars = Math.min(class_names.length, 5);
  tooltip.style("height", 90 + bar_height * tooltip_bars);
  var bar = tooltip.append("g");
  for (i = 0; i < tooltip_bars; i++) {
    rect = bar.append("rect");
    rect.classed("pred_rect", true);
    rect.attr("x", bar_x + tooltip_xshift)
        .attr("y", BarY(i))
        .attr("height", bar_height)
        .attr("width", 0);
    bar.append("rect").attr("x", bar_x + tooltip_xshift)
        .attr("y", BarY(i))
        .attr("height", bar_height)
        .attr("width", bar_width - 1)
        .attr("fill-opacity", 0)
        .attr("stroke", "black");
    text = bar.append("text");
    text.classed("prob-text", true);
    text.attr("y", BarY(i) + bar_height - 3).attr("fill", "black").style("font", "14px tahoma, sans-serif");
    //bar.append("text").attr("x", bar_x - 30).attr("y", BarY(i)).style("font", "14px tahoma, sans-serif").attr("fill", "black").text(d);
    text = bar.append("text");
    text.classed("class-name", true)
    text.attr("x", bar_x - 10 + tooltip_xshift).attr("y", BarY(i) + bar_height - 3).attr("fill", "black").attr("text-anchor", "end").style("font", "14px tahoma, sans-serif");
  }
  // This is the word
  bar.append("text").attr("id", "focus_feature").attr("x", 10).attr("y",  20).attr("fill", "black").text("Word:");
  bar.append("text").attr("id", "frequency").attr("x", 10).attr("y",  35).attr("fill", "black").text("Frequency in train:");
  bar.append("text").attr("x", 10).attr("y",  50).attr("fill", "black").text("Conditional distribution (train):");
}

function ShowFeatureTooltip(d) {
  // Assumes d has d.feature
        var freq;
        var prob;
        if (typeof feature_attributes[d.feature] == 'undefined') {
          return;
        }
        freq = feature_attributes[d.feature]['train_freq'];
        data = feature_attributes[d.feature]['train_distribution'];
        tooltip.transition()
            .delay(1000)
            .duration(200)
            .style("opacity", .9);
        tooltip.style("left", (d3.event.pageX ) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        var word = tooltip.select("#focus_feature")
        word.text("Word: "+ d.feature);
        var word = tooltip.select("#frequency")
        word.text("Frequency in train: "+ freq.toFixed(2));
        mapped = MapClassesToNameProbsAndColors(data, tooltip_bars)
        names = mapped[0];
        data = mapped[1];
        bars = tooltip.selectAll(".pred_rect").data(data);
        bars.attr("width", function(d) { return bar_x_scale(d)})
            .style("fill", function(d, i) {return class_colors(names[i]);});
        bar_text = tooltip.selectAll(".prob-text").data(data);
        bar_text.attr("x", function(d) { return bar_x + bar_x_scale(d) + 5 + tooltip_xshift;})
            .attr("fill", "black")
            .text(function(d) { return d.toFixed(2)});
        name_object = tooltip.selectAll(".class-name").data(names)
        name_object.text(function(d) {return d;});
}
function HideFeatureTooltip(){
  tooltip.transition()
      .duration(300)
      .style("opacity", 0);
}




function ToggleFeatureBrush(w) {
  // OOV words are ignored
  if (typeof feature_attributes[w.feature] == 'undefined') {
    return;
  }
  if (selected_features.has(w.feature)) {
    selected_features.delete(w.feature);
  } 
  else {
    selected_features.add(w.feature);
  }
  sel_list = []
  selected_features.forEach(function(d) {sel_list.push(d);})
  FeatureBrushing(sel_list);
}
function ShowWeights(ex) {
  var data = ex.sorted_weights;
  var n_bars = data.length;
  var bar_height = 19;
  var total_height = (bar_height + 10) * n_bars;
  var xscale = d3.scale.linear()
          .domain([0,1])
          .range([0,270]);

  var yscale = d3.scale.linear()
          .domain([0, n_bars])
          .range([0,total_height]);

  // TODO make this axis appropriate (stop using axis), make it clickable
  var yAxis = d3.svg.axis();
      yAxis
        .orient('left')
        .scale(yscale)
        .tickSize(2)
        .tickFormat(function(d,i){ return i == 0 ? "" :  data[i - 1].feature })
        .tickValues(d3.range(0,n_bars + 1));
  var canvas;
  var chart;
  var y_xis;
  if (explain_features_div.select("svg").empty()) {
    canvas = explain_features_div.append("svg").attr({'width':'100%','height': (total_height + 10) + "px"});
    chart = canvas.append('g')
              .attr("transform", "translate(80,0)")
              .attr('id','bars');
    y_xis = canvas.append('g')
              .attr("transform", "translate(80, 0)")
              .attr('id','yaxis')
              .call(yAxis);
  }
  else {
  // This is a transition
    canvas = explain_features_div.select("svg");
    chart = canvas.select('#bars');
    canvas.select("#yaxis").transition().duration(1000).call(yAxis);
    //canvas.transition().delay(1000).each("end", function (){canvas.select("#yaxis").transition().duration(1000).call(yAxis)});
    //return;
    //y_xis = canvas.select("#yaxis").transition().delay(3000).call(yAxis);
  }
  bars = chart.selectAll('rect').data(data)
  bars.enter()
      .append('rect')
      .on("mouseover", ShowFeatureTooltip)
      .attr('height',bar_height)
      .attr({'x':0,'y':function(d,i){ return yscale(i)+bar_height; }})
      .attr('width', 0)
      .style('fill',function(d,i){ return class_colors_i(d.class); })
      .on("mouseout", HideFeatureTooltip)
      .on("click", ToggleFeatureBrush);
  bars.transition().duration(1000)
      .attr('width',function(d){ return xscale(d.weight); })
      .style('fill',function(d,i){ return class_colors_i(d.class); })
  bars.exit().transition().duration(1000).attr('width', 0).remove();
  // TODO: make hover work on this maybe
  var bartext = canvas.select("#bars").selectAll("text").data(data)
  bartext.enter()
         .append('text')
         .attr({'x':function(d) {return xscale(d.weight) + 5; },'y':function(d,i){ return yscale(i)+35; }})
  bartext.transition().duration(1000).
    text(function (d) {return d.weight.toFixed(2);})
    .attr({'x':function(d) {return xscale(d.weight) + 5; },'y':function(d,i){ return yscale(i)+35; }})
  bartext.exit().transition().remove();
  // Updating the textarea
  current_text = _.map(ex.features, function(x) {return x.feature;}).join(" ")
  d3.select("#textarea").node().value = current_text;
  UpdatePredictionBar(ex);

}
// Takes in an object that has the following attributes:
// features -> a list of (feature,weight) pairs.
// prediction -> a single integer
// predict_proba -> list of floats, corresponding to the probability of each // class
function ShowExample(ex) {
  var text = explain_text_div.selectAll("span").data(ex.features);
  text.enter().append("span");
  text.html(function (d,i) {return d.feature != "\n" ? d.feature + " " : "<br />"; })
      .style("color", function(d, i) {
        var w = 20;
        var color_thresh = 0.02;
        if (d.weight > color_thresh) {
          color = class_colors_i(d.class);
          return color;
        }
        else {
          return "rgba(0, 0, 0, 0.35)";
        }
      })
      .style("font-size", function(d,i) {return size(Math.abs(d.weight))+"px";})
      .style("text-decoration", function(d,i) { return selected_features.has(d.feature) ? "underline" : "none";})
      .on("mouseover", ShowFeatureTooltip)
      .on("mouseout", HideFeatureTooltip)
      .on("click", function(d) {ToggleFeatureBrush(d);ShowExample(ex);});

  // TODO:
  // do the remove first, then the add for smoothness
  //text.exit().transition().duration(1000).style("opacity", 0).remove();
  text.exit().remove();
  current_text = _.map(ex.features, function(x) {return x.feature;}).join(" ")
  d3.select("#textarea").node().value = current_text;
  UpdatePredictionBar(ex);
}
/* --------------------------*/
// Databin

// Function to move stuff to front. This is for the selected document.
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};


var databin_height;
var n_bins;
var square_size;
var bin_width;
var selected_document;
var databin_width;
var hist_margin, hist_width, hist_height;
var svg_hist, hist_tooltip;
var hist_data;
var dots;
var xValue, xScale, xMap, xAxis, yValue, yScale, yMap, yAxis;
var refLineFunction;
function SetupDatabin() {
  databin_height = parseInt(d3.select("body").style("height")) - parseInt(d3.select(".top_explain").style("height") + legend_height + 5 + 5);
  databin_height = databin_height;
  n_bins = 4;
  bin_width = 12;
  square_size = 6;
  selected_document = 0;
  databin_width = parseInt(d3.select("#databin_div").style("width"));
  hist_margin = {top: 0, right: 10, bottom: 0, left: 10};
  hist_width = databin_width - hist_margin.left - hist_margin.right;
  hist_height = databin_height - hist_margin.top - hist_margin.bottom;
  xValue = function(d) { return d.bin_x;}; // data -> value
  xScale = d3.scale.linear().range([0, hist_width]); // value -> display
  xMap = function(d) { return xScale(xValue(d));}; // data -> display
  xAxis = d3.svg.axis().scale(xScale).orient("bottom");

  yValue = function(d) { return d.bin_y;}; // data -> value
  yScale = d3.scale.linear().range([hist_height, 0]); // value -> display
  yMap = function(d) { return yScale(yValue(d));}; // data -> display
  yAxis = d3.svg.axis().scale(yScale).orient("left");
  refLineFunction = d3.svg.line()
    .x(function (d) { return xMap(d); })
    .y(function (d) { return yMap(d); })
    .interpolate("linear");
}


var on_click_document = function(d) {
    selected_document = d.doc_id;
    current = d.doc_id;
    GetPredictionAndShowExample(d.features, d.true_class);
}

function set_doc_ids(docs) {
    for (var i=0; i<docs.length; i++) {
        docs[i].doc_id = i;
    }
}

function map_examples_to_bin(docs, n_bins, focus_class) {
    for (var i=0; i<docs.length; i++) {
        var pred = docs[i].predict_proba[focus_class];
        docs[i].pred_bin = Math.floor(pred*n_bins);
        if (docs[i].pred_bin >= n_bins) {
            docs[i].pred_bin -= 1;
        }
    }
}
function map_examples_to_true_class_bin(docs, n_bins) {
    for (var i=0; i<docs.length; i++) {
        var pred = docs[i].true_class / class_names.length;
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
function change_dataset() {
  dataset = d3.select("#dataset-select").node().value
  console.log(dataset);
  if(dataset === "train") {
    current_docs = train_docs;
  }
  else {
    current_docs = test_docs;
  }
  AssignDots(svg_hist, current_docs);
  GetPredictionAndShowExample(current_docs[0].features, current_docs[0].true_class);
  ShowDatabinForClass(-1);
}
function change_mode() {
  mode = d3.select("#view-select").node().value
  if (mode === "explain") {
    d3.selectAll(".top_statistics").classed("visible", false).classed("hidden", true);
    d3.selectAll(".top_feedback").classed("visible", false).classed("hidden", true);
    d3.select("#explain_selections").classed("visible", true).classed("hidden", false);
    change_order(1);
  }
  else if (mode === "statistics") {
    d3.selectAll(".top_explain").classed("visible", false).classed("hidden", true);
    d3.selectAll(".top_feedback").classed("visible", false).classed("hidden", true);
    d3.selectAll(".top_statistics").classed("visible", true).classed("hidden", false);
    d3.select("#explain_selections").classed("visible", false).classed("hidden", true);
  }
  else if (mode === "feedback"){ 
    d3.selectAll(".top_explain").classed("visible", false).classed("hidden", true);
    d3.selectAll(".top_statistics").classed("visible", false).classed("hidden", true);
    d3.selectAll(".top_feedback").classed("visible", true).classed("hidden", false);
    d3.select("#explain_selections").classed("visible", false).classed("hidden", true);
  }
}

function AssignDots(svg_obj, docs) {
  dots = svg_obj.selectAll(".hist_dot")
      .data(docs)
  dots.enter().append("rect")
      .attr("class", "hist_dot")
      .attr("width", square_size)
      .attr("height", square_size)
  dots.exit().remove();
  dots.style("stroke", "black")
      .style("stroke-opacity", 1)
      .style("stroke-width", function(d) { return d.doc_id === selected_document ? 2.0 : 0})
      .style("fill", function(d) { return class_colors_i(d.true_class);})
      .style("opacity", 0.4)
      .attr("id", function(d, i) {return d.doc_id === selected_document ? "selected_document" : "";});

  focus_class = 0;
  // Figure out which examples go in which bins
  map_examples_to_bin(docs, n_bins, focus_class);
  // Then map them to an actual x/y position within [0, 1]
  map_examples_to_pos(docs, n_bins, bin_width);
  xScale.domain([d3.min(docs, xValue), d3.max(docs, xValue)]);
  // don't want dots overlapping axis, so add in buffer to data domain
  yScale.domain([d3.min(docs, yValue)-0.1, d3.max(docs, yValue)+0.1]);
  dots.on("mouseover", function(d) {
          var xPosition = parseFloat(d3.select(this).attr("x"));
          var yPosition = parseFloat(d3.select(this).attr("y"));

          // Change the style of the square
          d3.select(this)
              .attr("height", square_size + 10)
              .attr("width", square_size + 10)
              .attr("x", xPosition-square_size)
              .attr("y", yPosition-square_size)
              //.style("opacity", 1.0)

          hist_tooltip.transition()
              .duration(200)
              .style("opacity", .9)
              .attr("fill", "rgb(255, 255, 255)");

          var s = "Document ID: " + d.doc_id + "<br />True class: ";
          s += class_names[d.true_class];
          s += "<br/>Prediction: ";
          s += class_names[d.prediction];
          s += "<br /> P(" + class_names[focus_class] + ") = ";
          s += + d.predict_proba[focus_class].toFixed(2);
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
              //.style("opacity", function(d){return d.doc_id == selected_document ? 1.0 : 0.4});

          hist_tooltip.transition()
              .duration(500)
              .style("opacity", 0);
      })
      .on("click", function(d) {
          dots.style("stroke-width", 0);
          d3.select(this)
              .transition().delay(0.1)
              .style("stroke-width", 2)
              .style("stroke-alignment", "inner")
              .style("stroke-opacity", 1)
              .attr("id", "selected_document");
          d3.select(this).moveToFront();

          on_click_document(d);
      });
}
function FirstDrawDatabin() {
  // add the graph canvas to the body of the webpage
  svg_hist = d3.select("#databin_div").append("svg")
      .attr("width", hist_width + hist_margin.left + hist_margin.right)
      .attr("height", hist_height + hist_margin.top + hist_margin.bottom)
      .append("g")
      .attr("transform", "translate(" + hist_margin.left + "," + hist_margin.top + ")");
  
  // add the hist_tooltip area to the webpage
  hist_tooltip = d3.select("body").append("div")
      .attr("class", "hist_tooltip")
      .style("opacity", 0);
  // Initialize the document IDs
 set_doc_ids(current_docs);
 set_doc_ids(current_docs);

  // Draw title
  svg_hist.append("text")
      .attr("x", hist_width/2-200)
      .attr("y", 50)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Overall Model Performance. Held-out accuracy: " + test_accuracy)

  // Draw x-axis label
  svg_hist.append("text")
      .attr("x", hist_width/2-130)
      .attr("y", hist_height-25)
      .attr("id", "hist_xaxis")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("P(" + class_names[1] + " | example), given by the model")
  svg_hist.append("text")
      .attr("x", hist_width/2-130)
      .attr("y", hist_height-10)
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Examples above the horizontal axis are classified correctly.")
  svg_hist.append("text")
      .attr("x", hist_width/2)
      .attr("y", hist_height-45)
      .style("font-size", "14px")
      .text("0.5")
  svg_hist.append("text")
      .attr("x", 0)
      .attr("y", hist_height-45)
      .style("font-size", "14px")
      .text("0.0")
  svg_hist.append("text")
      .attr("x", hist_width - 20)
      .attr("y", hist_height-45)
      .style("font-size", "14px")
      .text("1.0")

 // add a reference line
 var refLine = svg_hist.append("path")
     .attr("id", "ymiddle")
     .attr("stroke", "black")
     .attr("stroke-width", 0.8)
     .attr("stroke-dasharray", "5,5")
     .attr("fill", "none");
 // add a zero line
 var refLine = svg_hist.append("path")
     .attr("id", "xaxis")
     .attr("stroke", "black")
     .attr("stroke-width", 0.8)
     .attr("fill", "none");
 AssignDots(svg_hist, current_docs);
 ShowDatabinForClass(focus_class);
}



function ShowDatabinForClass(focus_class) {
  // Figure out which examples go in which bins
  if (focus_class === -1) {
    n_bins = class_names.length;
    bin_width = 20;
    map_examples_to_true_class_bin(current_docs, n_bins);
    svg_hist.select("#hist_xaxis")
    .text("Documents grouped by true class.")
  }
  else {
    map_examples_to_bin(current_docs, n_bins, focus_class);
    svg_hist.select("#hist_xaxis")
    .text("P(" + class_names[focus_class] + " | example), given by the model")
  }
  // Then map them to an actual x/y position within [0, 1]
  map_examples_to_pos(current_docs, n_bins, bin_width);
  xScale.domain([d3.min(current_docs, xValue), d3.max(current_docs, xValue)]);
  // don't want dots overlapping axis, so add in buffer to data domain
  yScale.domain([d3.min(current_docs, yValue)-0.1, d3.max(current_docs, yValue)+0.1]);
  dots.transition().duration(1000)
      .attr("x", xMap)
      .attr("y", yMap)
  d3.select("#selected_document").moveToFront();
  // TODO: This is still weird, I think it's kinda wrong.
  //var refLineData = [ {"bin_x": 0.5, "bin_y":-0.03}, {"bin_x":0.5, "bin_y":0.3}];
  //svg_hist.select("#ymiddle")
  //   .attr("d", refLineFunction(refLineData))
  var refLineData = [ {"bin_x": 0, "bin_y":-0.005}, {"bin_x":0.988, "bin_y":-0.005}];
  svg_hist.select("#xaxis")
     .attr("d", refLineFunction(refLineData))
}
function BrushExamples(example_set) {
  dots.transition().style("opacity", function(d){
    return example_set.has(d.doc_id) ? 1 : 0.4;});
}
function FeatureBrushing(feature_list) {
  docs = [];
  d3.select("#feature_brush_div").html("Features being brushed: <br />" + feature_list.join("<br />"))
  if (feature_list.length > 1) {
    docs = _.intersection.apply(this, _.map(feature_list, function (d) {return feature_attributes[d].current_docs;}));
  } else {
    if (feature_list.length != 0) {
      docs = feature_attributes[feature_list[0]].current_docs;
    }
  }
  docs = new Set(_.map(docs, function(d) { return +d;}))
  BrushExamples(docs);
}

var legend_height;
function DrawLegend() {
  var n_classes = class_names.length;
  // draw legend
  var legend_x = 120;
  var legend_y = 0;
  var width = parseInt(d3.select("#legend_div").style("width"))
  var elements_per_line = Math.floor((width - legend_x - 15 - 120) / 140)
  var lines = Math.ceil(n_classes / elements_per_line)
  var svg_legend = d3.select("#legend_div").append("svg")
  legend_height = legend_y + 16 + 15;
  var svg_height = legend_y + 16 + 15 * lines;
  d3.select("#legend_div").style("height", legend_height);
  svg_legend.style("width","100%").style("height", svg_height);
  svg_legend.append("text")
    .attr("x", 15)
    .attr("y", 20)
    .style("font-size", "14px")
    .text("Group by class");
  svg_legend.append("rect")
    .attr("x", 10)
    .attr("y", 0)
    .attr("height", 30)
    .attr("width", legend_x - 25)
    .style("stroke", "#86a36e")
    .style("fill", "rgba(124,240,10,0)")
    .on("click", function() { ShowDatabinForClass(-1)});

  legend = svg_legend.selectAll(".legend_stuff").data(class_names).enter()
  legend.append("text")
    .attr("x", function(d, i) { return legend_x + 30 + (i % elements_per_line) *140;})
    .attr("y", function(d, i) { return legend_y + 20 + Math.floor(i / elements_per_line) * 15; })
    .style("font-size", "14px")
    .text(function(d) { return d;});
  legend.append("rect")
    .attr("x", function(d, i) { return legend_x + 15 + (i % elements_per_line) *140;})
    .attr("y", function(d, i) { return legend_y + 10 + Math.floor(i / elements_per_line) * 15; })
    .attr("width", 10)
    .attr("height", 10)
    .style("fill", function(d) {return class_colors(d);})
    .on("click", function(d) { ShowDatabinForClass(class_names.indexOf(d)); });
  svg_legend.append("rect")
      .attr("x", legend_x)
      .attr("y", legend_y)
      .attr("width", 15 + Math.min(n_classes, elements_per_line) * 140 + 10)
      .attr("height", 15 * lines + 15)
      .style("stroke", "#86a36e")
      .style("fill", "none");
}

/* --------------------------*/
// Global Statistics
function DrawStatistics(title, svg_object, b_height, b_width, data) {
  total = d3.sum(data.class_distribution)
  var s_bar_x_scale = d3.scale.linear().domain([0, total]).range([0, b_width]);
  var s_bar_space = 5;
  var s_bar_x = 110;
  var s_bar_yshift = 80;
  function SBarY(i) {
    return (b_height + s_bar_space) * i + s_bar_yshift;
  }
  num_bars = class_names.length;

  d = 0
  var bar = svg_object.append("g")
  bar.append("text").
    attr("x", s_bar_x - 40)
    .attr("y", 30)
    .attr("fill", "black")
    .style("font", "14px tahoma, sans-serif")
    .text(title + " accuracy:" + data.accuracy);
  bar.append("text").
    attr("x", s_bar_x - 40)
    .attr("y", 50)
    .attr("fill", "black")
    .style("font", "14px tahoma, sans-serif")
    .text("Number of documents: " + total);
  bar.append("text").
    attr("x", s_bar_x - 40)
    .attr("y", 70)
    .attr("fill", "black")
    .style("font", "14px tahoma, sans-serif")
    .text("Class Distribution:");
  for (i = 0; i < num_bars; i++) {
    d = data.class_distribution[i];
    rect = bar.append("rect");
    //rect.classed("pred_rect", true);
    rect.attr("x", s_bar_x)
        .attr("y", SBarY(i))
        .attr("height", b_height)
        .attr("width", s_bar_x_scale(d))
        .style("fill",class_colors_i(i));
    text = bar.append("text");
    text.attr("y", SBarY(i) + b_height - 3)
        .attr("fill", "black")
        .attr("x", s_bar_x + s_bar_x_scale(d) + 5)
        .text(d.toFixed(0))
        .style("font", "14px tahoma, sans-serif");
    text = bar.append("text");
    text.attr("x", s_bar_x - 10)
        .attr("y", SBarY(i) + b_height - 3)
        .attr("fill", "black")
        .attr("text-anchor", "end")
        .style("font", "14px tahoma, sans-serif")
        .text(class_names[i]);

    bar.append("rect").attr("x", s_bar_x)
        .attr("y", SBarY(i))
        .attr("height", b_height)
        .attr("width", b_width - 1)
        .attr("fill-opacity", 0)
        .attr("stroke", "black");
  }
}

/* Confusion Matrix */

var current_brush = [-1, -1];
function BrushOnMatrix(true_label, predicted_label) {
  console.log("Brush " + true_label + " " + predicted_label);
  docs = [];
  if (true_label !== current_brush[0] || predicted_label !== current_brush[1]) {
    docs = _.filter(current_docs, function (d) {return d.prediction === predicted_label && d.true_class === true_label; })
    current_brush = [true_label, predicted_label];
  }
  else {
    current_brush = [-1, -1];
  }
  docs = new Set(_.map(docs, function(d) {return d.doc_id;}));
  BrushExamples(docs);
}

var LABEL_FONT_SIZE = 13;
var MATRIX_LABEL_FONT_SIZE = 10;
var MATRIX_FONT_SIZE = 10;
var FONT_FAMILY = "Helvetica";
var MOUSEOVER = 'rgb(150, 150, 150)';
var FONT_COLOR = 'rgb(160, 160, 160)';
var FILL = 'rgb(255, 255, 255)';
var STROKE_SIZE = 1;
var BUTTON_Y = 10;
var BUTTON_SIZE = 15;
function Matrix(svg_object, confusion_matrix) {
  var defaultMouseover = MOUSEOVER;
  var defaultRegular = FILL;
  this.numClasses = class_names.length;
  this.width = 250;
  this.labelContainerSize = this.width / (this.numClasses * 3);
  this.axisLabelContainerSize = this.width / (this.numClasses * 3);
  this.strokeSize = STROKE_SIZE;
  var size = this.width / this.numClasses;
  this.footerContainerSize = this.width / 5;
  this.cellSize = size;
  this.id = "matrix";
  //this.mouseoverColor = defaultMouseover;
  //this.cellColor = defaultRegular;
  this.svgContainerSize = (this.cellSize * this.numClasses) + this.strokeSize * 2 + this.labelContainerSize + this.axisLabelContainerSize;
  this.svg = svg_object
        .attr("class", "confusion_matrix")
        .attr("width", this.svgContainerSize)
        .attr("height", this.svgContainerSize + this.footerContainerSize)
        .attr("id", this.id)
        .attr("value", "modelname");

  this.labelNames = class_names;
  this.cells = new Array();
  this.correspondingModel = "model";
  this.round2 = d3.format(".2f");
  this.bucketLists = [];
  appendAxisLabels(this);

  //  // append the positive, neutral, negative labels to the matrix
  appendLabels(this, class_names);

  var x = 0;
  var y = 0;
  var matrixPointer = this;
  var count = 0;
  this.ids = [];
  mouseover = false;
  for (var i = 0; i < class_names.length; i++) {
    var x = 0;
    var y = i * this.cellSize;
    for (var j = 0; j < class_names.length; j++) {
      var id = this.id + '-' + class_names[i] + '-' + class_names[j];
      var z = [i, j];
      this.ids.push(id);
      var g = this.svg.append("g")
            .attr("id", id)
            .attr("width", size)
            .attr("height", size)
            //.attr("style", "stroke-width:" + this.strokeSize + "px")
            .attr("class", "matrix-bucket")
            .datum([i,j])
            .on("click", function(d) {
              BrushOnMatrix(d[0], d[1]);
              //console.log(this.id);
              //func(this.id, matrixPointer); 
            })
            .style("fill", FILL);

      if (mouseover) {
        g.on("mouseover", function() {
            d3.select(this)
              .style('fill', defaultMouseover);
              //.style('stroke-width', this.strokeSize + "px");
          })
          .on("mouseout", function() {
            d3.select(this)
              .style('fill', defaultRegular);
              //.style('stroke-width', this.strokeSize + "px");
          })
      }

      var rect = g.append("rect")
            .attr("x", x + this.strokeSize + this.labelContainerSize + this.axisLabelContainerSize)
              .attr("y", y + this.strokeSize + this.labelContainerSize + this.axisLabelContainerSize)
              .attr("id", this.id + '-' + class_names[i] + '-' + class_names[j] + "-cell")
              .attr("class", "matrix-cell")
              .attr("width", size - this.strokeSize)
              .attr("height", size - this.strokeSize);              

      var textElement = g.append("text")
                .attr("id", this.id + '-' + class_names[i] + '-' + class_names[j] + "-text")
                .attr("class", "matrix-text")
                .attr("stroke-width", 0)
                .attr("font-family", FONT_FAMILY)
                .attr("font-size", MATRIX_FONT_SIZE + "pt");

      var pixelLength = textElement[0][0].getComputedTextLength();
      textElement.attr("y", this.cellSize / 2 + y)
          .attr("x", x + this.cellSize / 2 - pixelLength / 2)
          .style("fill", "rgb(97,97,97)");

      this.cells[count] = g;
      count++;
      x += this.cellSize;
    }
  }
  
}
function appendAxisLabels(matrix) {
  // predicted label
  var containerWidth = matrix.svgContainerSize;
  var containSize = matrix.labelContainerSize;
  matrix.svg.append("text")
    .text("Predicted Label")
    .attr("x", function () {
      var pixelLength = this.getComputedTextLength();
      return containSize * 2 + matrix.width / 2 - pixelLength / 2;
    })
        .attr("class", "axis_label")
    .attr("y", 20)
    .attr("id", matrix.id + '-' + 'horizontal-title')
    .style("fill", FONT_COLOR)
    .style("font-size", LABEL_FONT_SIZE);

  matrix.svg.append("text")
    .text("")
    .attr("x", function () {
      var pixelLength = this.getComputedTextLength();
      return containSize * 2 + matrix.width / 2 - pixelLength / 2;
    })
    .attr("y", function() {
      return matrix.width + containSize + matrix.footerContainerSize + matrix.axisLabelContainerSize;
    })
    .style("fill", FONT_COLOR)
    .attr("id", matrix.id + '-' + 'footnote')
    .style("font-size", LABEL_FONT_SIZE);

  matrix.svg.append("text")
    .text("Actual Label")
    .attr("x", function() {
      var pixelLength = this.getComputedTextLength();
      return - containSize *2 - matrix.width / 2 - pixelLength / 2;
    })
    .attr("y", 15)
    .attr("id", matrix.id + '-' + 'vertical-title')
        .attr("class", "axis_label")
    .style("fill", FONT_COLOR)
    .style("font-size", LABEL_FONT_SIZE)
    .attr("transform", "rotate(270)");
}

function appendLabels(matrix, labels) {
  // create labels
  var offset = 20;
  var size = matrix.cellSize;
  var axisLabelSize = matrix.axisLabelContainerSize;
  var labelContainerSize = matrix.labelContainerSize;
  for (var i = 0; i < labels.length; i++) {
    matrix.svg.append("text")
      .text(labels[i])
      .attr("x", function () {
        var pixelLength = this.getComputedTextLength();
        return labelContainerSize + axisLabelSize + (size / 2) + (size * i) - (pixelLength / 2) + 10; 
      })
      .attr("y", offset + axisLabelSize)
      .attr("id", matrix.id + '-' + labels[i] + '-predicted-label')
      .style("fill", FONT_COLOR)
      .style('font-size', MATRIX_LABEL_FONT_SIZE);

    // create labels
    matrix.svg.append("text")
      .text(labels[i])
      .attr("transform", "rotate(270)") 
      .attr("x", function() {
        var pixelLength = this.getComputedTextLength();
        return -labelContainerSize - axisLabelSize - (size / 2) - (size * i) - pixelLength / 2 + 5;
      })
      .attr("y", offset + axisLabelSize)
      .attr("id", matrix.id + '-' + labels[i] + "-actual-label")
      .style('font-size', MATRIX_LABEL_FONT_SIZE)
      .style("fill", FONT_COLOR);
  }

}
Matrix.prototype.getMatrixIds = function() {
  return this.ids;
}
Matrix.prototype.setTextForCell = function(text, id) {
  var newText = d3.select("#" + id + "-text").text(text);
  var cell = d3.select("#" + id + "-cell");

  var pixelLength = newText[0][0].getComputedTextLength();
  var currentX = parseInt(cell[0][0].attributes.x.value);
  var currentY = parseInt(cell[0][0].attributes.y.value);
  
  newText.attr("y", this.cellSize / 2  + currentY)
    .attr("x", currentX + this.cellSize / 2 - pixelLength / 2);
}

Matrix.prototype.setStrokeColor = function(r, g, b) {
  var rgb = "rgb(" + r + ", " + g + ", " + b + ")";

  var cells = this.cells;
  for (var i = 0; i < cells.length; i++) {
    cells[i].style("stroke", rgb);
  }
}

Matrix.prototype.setCellMouseoverColor = function(r, g, b, id) {
  var rgb = "rgb(" + r + ", " + g + ", " + b + ")";
  
  if (typeof(id) === 'undefined') {
    this.mouseoverColor = rgb;
    var cells = this.cells;
    for (var i = 0; i < cells.length; i++) {
      cells[i].on("mouseover", function() {
          d3.select(this)
            .style('fill', rgb)
      });
    }
  } else {
    d3.select("#" + id)
      .on("mouseover", function() {
          d3.select(this)
            .style('fill', rgb)
      });
  }
}

Matrix.prototype.setCellFillColor = function(color, id) {
  var rgb = color;
  
  if (typeof(id) === 'undefined') {
    this.cellColor = rgb;
    var cells = this.cells;
    for (var i = 0; i < cells.length; i++) {
      cells[i].style("fill", rgb)
      .on("mouseout", function() {
          d3.select(this)
            .style('fill', rgb)
      });
    }
  } else {
    if (d3.rgb(color).hsl().l < .58) {
                        //light text
      this.setFontColor(230, 230, 230, id);
    }
                else this.setFontColor(97,97,97,id);
    d3.select("#" + id)
      .style("fill",rgb)
      .on("mouseout", function() {
          d3.select(this)
            .style('fill', rgb)
      });
  }
}

Matrix.prototype.setContainerId = function(id) {
  d3.select(this)
    .attr("id", id);
}
Matrix.prototype.setFontFamily = function(family) {
  d3.selectAll("text").style("font-family", family);
}

Matrix.prototype.setFontColor = function(r, g, b, id) {
  var rgb = "rgb(" + r + ", " + g + ", " + b + ")";
  if (typeof(id) === 'undefined') {
    d3.selectAll("text").style("fill", rgb);
  } else {
    d3.select("#" + id + "-text")
      .style('fill', rgb);
  }
}

Matrix.prototype.setStrokeWidth = function(width) {
  this.strokeSize = width;
  this.svgContainerSize = (this.cellSize * 3) + this.strokeSize * 2;
  this.svg.attr("width", this.svgContainerSize)
      .attr("height", this.svgContainerSize);

  var x = 0;
  var y = 0;
  var strokeSize = this.strokeSize;
  for (var i = 0; i < this.cells.length; i++) {
    var cell = this.cells[i];
    cell.attr("style", "stroke-width:" + width + "px")
      .attr("x", x + strokeSize)
      .attr("y", y + strokeSize)
      .style("stroke-width", strokeSize + "px");

    x += this.cellSize;
      if ((i + 1) % 3 == 0) {
        x = 0;
        y += this.cellSize;
      }
  }
}

Matrix.prototype.setFootnote = function(text) {
  var containerSize, width;
  containerSize = this.labelContainerSize;
  width = this.width;
  d3.select("#" + this.id + '-footnote')
    .text(text)
                .attr("class", ".footnote")
    .attr("x", function() {
      var pixelLength = this.getComputedTextLength();
      return containerSize * 2 +  width / 2 - pixelLength / 2;
    });
}

Matrix.prototype.populateMatrix = function(data) {
    for (var i = 0; i < this.numClasses; i++) {
      var row = data[i]
      var rowsum = d3.sum(row);
      var colorGreen = d3.scale.linear().domain([0, rowsum]).range(["#E3FAEA", "#0B7A52"]);
      var colorRed = d3.scale.linear().domain([0, rowsum]).range(["#FAE3E3", "#7A0B0B"]);
      for (var j = 0; j < this.numClasses; j++) {
        var bucket = this.numClasses * i + j;
                      var color = (i == j) ? colorGreen : colorRed;
        this.setCellFillColor(color(row[j]), this.ids[bucket]); 
        this.setTextForCell(row[j], this.ids[bucket]); 
      }
    }
}

var top_divs_order = {"textarea" : 1, "text": 2, "prediction": 3, "feature_contribution": 3, "brushed_features" : 1};
top_divs = d3.selectAll(".top_explain").data(["textarea", "text", "prediction", "feature_contribution", "brushed_features"]);
var visible;
/* Changing order of explain predictions */
function change_order(changed_select) {
  // Hide everything
  d3.selectAll(".top_explain").filter(".visible").classed("visible", false).classed("hidden", true);
  sel1 = d3.select("#explain-1").node().value
  //sel2 = d3.select("#explain-2").node().value
  sel2 = "text";
  sel3 = d3.select("#explain-3").node().value
  //top_divs_order[sel3] = 3
  //top_divs_order[sel2] = 2
  //top_divs_order[sel1] = 1
  //var missing = []
  //if (sel2 === sel1) {
  //  missing.push(2);
  //}
  //if (sel3 === sel1 || sel3 === sel2) {
  //  missing.push(3);
  //}
  visible = new Set([sel1, sel2, sel3])
  //while (missing.length > 0) {
  //  n = missing.pop();
  //  d = d3.selectAll(".hidden").filter(function(d, i) { return !visible.has(d);}).data()[0];
  //  visible.add(d);
  //  top_divs_order[d] = n;
  //  d3.select("#explain-" + n).node().value = d;
  //}
  d3.selectAll(".top_explain").filter(function(d,i) {return visible.has(d);}).classed("hidden", false).classed("visible", true);
  top_divs.sort(function(a,b) { return top_divs_order[a] > top_divs_order[b];});
  //alert("OI" + changed_select);
}
