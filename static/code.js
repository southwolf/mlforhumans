var train_docs, test_docs, current, size, test_accuracy, previous_text, feature_attributes;
var sort_order = "document_order";
var class_names;
// class_colors_i is by index, class_colors is by name
var class_colors, class_colors_i;
var current_object;

d3.json("3ng.json",  function(error, json) {
  if (error) return console.warn(error);
  train_docs = json.train;
  test_docs = json.test;
  feature_attributes = json.feature_attributes;
  test_accuracy = json.test_accuracy;
  class_names = json.class_names;
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
  FirstDraw();
  FirstDrawTooltip()
  current = 0;
  GetPredictionAndShowExample(test_docs[0].features, test_docs[0].true_class);
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
          if (sort_order == "document_order") {
            ShowExample(current_object);
          }
          else {
            ShowWeights(current_object);
          }
      }
  };
//xhr.send();
xhr.send(JSON.stringify({
    features: example_text_split,
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

function change(current_text, sort) {
  if (current_text === null) {
    current_text = d3.select("#textarea").node().value;
  }
  example_text_split = current_text.replace("\n", " \n ").split(" ");
  GetPredictionAndShowExample(example_text_split, test_docs[current].true_class);
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

function sort(){
  if (sort_order == "document_order") {
    CleanD3Div();
    ShowWeights(current_object);
    sort_order = "weight_order";
    d3.select("#sort_button").text("Show text")
  }
  else {
    CleanD3Div();
    ShowExample(current_object);
    sort_order = "document_order";
    d3.select("#sort_button").text("Show feature contributions")
  }
}

var div = d3.select("#d3");
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
var max_bars = 8;

function FirstDraw() {
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
function MapClassesToNameProbsAndColors(predict_proba) {
  if (class_names.length <= max_bars) {
    return [class_names, predict_proba];
  }
  class_dict = _.map(_.range(class_names.length), function (i) {return {'name': class_names[i], 'prob': predict_proba[i], 'i' : i};});
  sorted = _.sortBy(class_dict, function (d) {return -d.prob});
  other = new Set();
  _.forEach(_.range(max_bars - 1, sorted.length), function(d) {other.add(sorted[d].name);});
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
  mapped = MapClassesToNameProbsAndColors(ex.predict_proba)
  names = mapped[0];
  data = mapped[1];
  names = _.map(names, function(i) {
    return  i.length > 17 ? i.slice(0,14) + "..." : i;
  });
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
var tooltip = d3.select(".hovercard")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("left", "10px")
    .style("pointer-events", "none")

function FirstDrawTooltip() {
  //bar_width = 20;
  var bar = tooltip.append("g");
  bar.attr("id", "feature_freq");
  bar.append("rect")
      .attr("x", 30)
      .attr("y", t_bar_yshift)
      .attr("height", 0)
      .attr("width", 20)
  bar.append("rect")
      .attr("x", 30)
      .attr("y", t_bar_yshift)
      .attr("height", t_bar_height)
      .attr("width", 20)
      .attr("fill-opacity", 0)
      .attr("stroke", "black");
  // This is the text that we'll move around
  bar.append("text").attr("x", 30 + 20);
  // This is the word
  bar.append("text").attr("id", "focus_feature").attr("x", 10).attr("y",  20).attr("fill", "black").text("Word:");
  bar.append("text").attr("id", "frequency").attr("x", 10).attr("y",  35).attr("fill", "black").text("Frequency in train:");
  bar.append("text").attr("x", 10).attr("y",  50).attr("fill", "black").text("Conditional distribution:");
  bar2 = tooltip.append("g");
  bar2.attr("id", "feature_dist");
  bar2.append("rect")
      .attr("x", 130)
      .attr("y", t_bar_yshift)
      .attr("height", 0)
      .attr("width", 20)
  bar2.append("rect")
      .attr("x", 130)
      .attr("y", t_bar_yshift)
      .attr("height", t_bar_height)
      .attr("width", 20)
      .attr("fill-opacity", 0)
      .attr("stroke", "black");
  // This is the text that we'll move around
  bar2.append("text").attr("x", 130 + 20);
  //bar.append("text").attr("x", bar_x - 20).attr("y", 12).attr("fill", "black").text("Prediction");
}

function CleanD3Div() {
  div.selectAll("span").remove();
  div.selectAll("svg").remove();
}
function ShowWeights(ex) {
  var data = ex.sorted_weights;
  var n_bars = data.length;
  var bar_height = 19;
  var total_height = (bar_height + 10) * n_bars;
  var xscale = d3.scale.linear()
          .domain([0,1])
          .range([0,500]);

  var yscale = d3.scale.linear()
          .domain([0, n_bars])
          .range([0,total_height]);

  // TODO make this axis appropriate
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
  if (div.select("svg").empty()) {
    canvas = div.append("svg").attr({'width':'100%','height': (total_height + 10) + "px"});
    chart = canvas.append('g')
              .attr("transform", "translate(100,0)")
              .attr('id','bars');
    y_xis = canvas.append('g')
              .attr("transform", "translate(100, 0)")
              .attr('id','yaxis')
              .call(yAxis);
  }
  else {
  // This is a transition
    canvas = div.select("svg");
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
    text(function (d) {return d.weight.toFixed(3);})
    .attr({'x':function(d) {return xscale(d.weight) + 5; },'y':function(d,i){ return yscale(i)+35; }})
  bartext.exit().transition().remove();
  UpdatePredictionBar(ex);

}
function ShowFeatureTooltip(d) {
  // Assumes d has d.feature
        var freq;
        var prob;
        if (typeof feature_attributes[d.feature] == 'undefined') {
          freq = 0;
          prob = "0.5";
        }
        else {
          freq = feature_attributes[d.feature]['train_freq'];
          prob = feature_attributes[d.feature]['train_distribution'][1];
        }
        tooltip.transition()
            .delay(1000)
            .duration(200)
            .style("opacity", .9);
        tooltip.style("left", (d3.event.pageX ) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        var freq_bar = tooltip.select("#feature_freq")
        freq_bar.select("rect")
            .attr("y", t_y(freq) + t_bar_yshift)
            .attr("height", t_bar_height - t_y(freq))
            .attr("fill", "black");
        freq_bar.select("text")
            .attr("y",  t_y(freq) + t_bar_yshift)
            .attr("fill", "black")
            .text(freq > 0 ? freq : "< .01");
        var dist_bar = tooltip.select("#feature_dist")
        dist_bar.select("rect")
            .attr("y", t_y(prob) + t_bar_yshift)
            .attr("height", t_bar_height - t_y(prob))
            .attr("fill", prob > 0.5 ? pos_hex : neg_hex);
        dist_bar.select("text")
            .attr("y",  t_y(prob) + t_bar_yshift)
            .attr("fill", "black")
            .text(prob);
        var word = tooltip.select("#focus_feature")
        word.text(d.feature);
}
function HideFeatureTooltip(){
  tooltip.transition()
      .duration(500)
      .style("opacity", 0);
}

// Takes in an object that has the following attributes:
// features -> a list of (feature,weight) pairs.
// prediction -> a single integer
// predict_proba -> list of floats, corresponding to the probability of each // class
function ShowExample(ex) {
  var text = div.selectAll("span").data(ex.features);
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
      .on("mouseover", ShowFeatureTooltip)
      .on("mouseout", HideFeatureTooltip);

  // TODO:
  // do the remove first, then the add for smoothness
  //text.exit().transition().duration(1000).style("opacity", 0).remove();
  text.exit().remove();
  current_text = _.map(ex.features, function(x) {return x.feature;}).join(" ")
  d3.select("#textarea").node().value = current_text;
  UpdatePredictionBar(ex);
}

