var train_docs, test_docs, current, size, test_accuracy, previous_text, feature_attributes;
var train_statistics, test_statistics;
var explain_sentence = false;
var class_names;
// class_colors_i is by index, class_colors is by name
var class_colors, class_colors_i;
var current_object;
var max_docs;
var selected_features = new Set()
var matrix;
var top_part_height;
var top_divs_width;
var is_loading = true;
var current_focus_class = 0;
var current_docs;
var confusion_matrix;
var current_train = false;
var current_feature_brush = [];
var current_regex = {};
var saved_regex = []

function LoadJson() {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://localhost:8870/get_json');
  xhr.setRequestHeader('Content-Type', 'application/json');
  StartLoading(0);
  xhr.onload = function() {
      if (xhr.status === 200) {
        var json = JSON.parse(xhr.responseText);
        train_docs = json.train;
        test_docs = json.test;
        max_docs = Math.max(train_docs.length, test_docs.length)
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
        top_part_height = parseInt(d3.select("#explain_text_div").style("height"));
        top_divs_width = parseInt(d3.select("#explain_text_div").style("width"));
        DrawLegend();
        SetupDatabin();
        FirstDrawPrediction();
        FirstDrawTooltip();
        ReSetupDatabin();

        SetupStatistics();
        //DrawStatistics("Train", train_svg, 17, 130, train_statistics)
        DrawStatistics("Validation", test_statistics, test_statistics.confusion_matrix)

        current = 0;
        GetPredictionAndShowExample(current_docs[selected_document].features, current_docs[selected_document].true_class);
        ShowFeedbackExample(current_docs[0]);
        //d3.select("#view-select").node().value = "explain";
        //change_mode();

        ChangeVisibility(d3.selectAll(".top_statistics"), false);
        ChangeVisibility(d3.selectAll(".top_feedback"), false);
        ChangeVisibility(d3.select("#explain_selections"), true);
        change_order(1);
        GetPredictionAndShowExample(current_docs[selected_document].features, current_docs[selected_document].true_class);
        StopLoading();
      }
  };
xhr.send();
}

LoadJson()
function NotInTrain(feature) {
  return typeof feature_attributes[feature] == 'undefined';
}
function FeatureColor(feature) {
  if (NotInTrain(feature)) {
    return "rgba(0, 0, 0, 0.35)";
  }
  else {
    return "rgba(0, 0, 0, 0.85)";
  }
}

function StartLoading(ms) {
  is_loading = true;
  setTimeout(function() {
    if (is_loading) {
      ChangeVisibility(d3.select("#loading"), true);
    }
  }, ms);
}
function StopLoading() {
  is_loading = false;
  ChangeVisibility(d3.select("#loading"), false)
}
function ChangeVisibility(selection, visible) {
  // visible is true or false
  selection.classed("hidden", !visible).classed("visible", visible);
}

function GetPredictionAndShowExample(example_text_split, true_class) {
  StartLoading(800);
  var xhr = new XMLHttpRequest();
  //ChangeVisibility(d3.select("#loading"), true);
  xhr.open('POST', 'http://localhost:8870/predict');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
      if (xhr.status === 200) {
          var prediction_object = JSON.parse(xhr.responseText);
          current_object = GenerateObject(example_text_split, true_class, prediction_object);
          ShowExample(current_object);
          ShowWeights(current_object);
          StopLoading();
          //ChangeVisibility(d3.select("#loading"), false);
      }
  };
//xhr.send();
xhr.send(JSON.stringify({
    features: example_text_split,
    sentence_explanation: explain_sentence
}));
}

function apply_regex() {
  regex = d3.select("#feedback_from").node().value;
  if (regex !== '') {
    GetRegexResults(regex);
  }
}
function update_saved_regex() {
  d3.select("#feedback_active_div").selectAll(".active_regexes").remove();
  saved = d3.select("#feedback_active_div").selectAll(".active_regexes").data(saved_regex)
  zs = saved.enter().append("span")
  zs.classed("active_regexes", true);
  ps = zs.append("span");
  ps.classed('active_text', true)
    .html(function(d,i) { return '&nbsp;&nbsp;' +  d + '&nbsp;&nbsp;'})
    .on("click", function(d, i) {
      temp = d.split('/');
      d3.select("#feedback_from").node().value = temp[1] ;
      d3.select("#feedback_to").node().value = temp[2] ;
      });

  xs = zs
       .append("span")
       .html("&#10799;<br />")
       .on("click", function(d,i) {
        saved_regex.splice(i, 1);
        update_saved_regex();
        });
        //d3.selectAll(".active_text").filter(function(d,a) { return a === i;}).remove();
        //this.remove()});
  xs.style("color", "red");
  saved.exit().remove();
}
function save_regex() {
  regex_from = d3.select("#feedback_from").node().value;
  regex_to = d3.select("#feedback_to").node().value;
  saved_regex.push('s/' + regex_from + '/'+ regex_to + '/g')
  //d3.select("#feedback_active_div").html("Saved regexes :<br />" + saved_regex.join("   &#10799;<br />"))
  update_saved_regex()
}
// Retorna o resultado da regex:
// dois mapas:
// train[documento] = [(start, end), (start,end)...]
// test[document] = ...
// no final chama ShowFeedbackExample
function GetRegexResults(regex) {
  StartLoading(500);
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://localhost:8870/regex');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
      if (xhr.status === 200) {
          current_regex = JSON.parse(xhr.responseText);
          BrushRegex();
          ShowFeedbackExample(current_docs[selected_document]);
          console.log("Got regex results");
          StopLoading();
      }
  };
//xhr.send();
xhr.send(JSON.stringify({
    regex: regex
}));
}

function RunRegex() {
  StartLoading(200);
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://localhost:8870/run_regex');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
      if (xhr.status === 200) {
          json = JSON.parse(xhr.responseText);
          BrushRegex();
          ShowFeedbackExample(current_docs[selected_document]);
          train_docs = json.train;
          test_docs = json.test;
          current_docs = test_docs;
          train_statistics = json.statistics.train;
          test_statistics = json.statistics.test;
          feature_attributes = json.feature_attributes;
          test_accuracy = json.statistics.test.accuracy;
          DrawStatistics("Validation", test_statistics, test_statistics.confusion_matrix)
          d3.select("#dataset-select").node().value = 'test'
          current_train = false;
          current_feature_brush = [];
          current_regex = {};
          // saved_regex = []
          // update_saved_regex()
          FeatureBrushing(current_feature_brush, true)
          current = 0;
          set_doc_ids(train_docs);
          set_doc_ids(test_docs);
          // TODO: tirar os numeros, e nao ta assigning doc_id de nada.
          AssignDots(svg_hist, current_docs);
          GetPredictionAndShowExample(current_docs[selected_document].features, current_docs[selected_document].true_class);
          ShowFeedbackExample(current_docs[selected_document]);
          ShowDatabinForClass(-1);
          StopLoading();
      }
  };
//xhr.send();
xhr.send(JSON.stringify({
    regex: saved_regex
}));
}


function BrushRegex(instant) {
  reg = current_train ? current_regex.train : current_regex.test;
  exs = new Set(_.map(_.keys(reg), Number));
  if (instant) {
    InstantBrushExamples(exs);
  }
  else {
    BrushExamples(exs);
  }
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
    current_text = d3.select("#textarea_explain").node().value;
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
  var top_text = tooltip.append("g");
  var bar = tooltip.append("g").classed("tooltip_bottom", true);
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
  top_text.append("text").attr("id", "focus_feature").attr("x", 10).attr("y",  20).attr("fill", "black").text("Word:");
  top_text.append("text").attr("id", "frequency").attr("x", 10).attr("y",  35).attr("fill", "black").text("Frequency in train:");
  bar.append("text").attr("x", 10).attr("y",  50).attr("fill", "black").text("Conditional distribution (train):");
}

function ShowFeatureTooltip(d) {
  // Assumes d has d.feature
        var freq;
        var prob;
        var undef = false;
        if (typeof feature_attributes[d.feature] == 'undefined') {
          undef = true;
          ChangeVisibility(tooltip.select(".tooltip_bottom"), false)
        }
        else {
          ChangeVisibility(tooltip.select(".tooltip_bottom"), true)

          freq = feature_attributes[d.feature]['train_freq'];
          data = feature_attributes[d.feature]['train_distribution'];
        }
        tooltip.transition()
            .delay(1000)
            .duration(200)
            .style("opacity", .9);
        tooltip.style("left", (d3.event.pageX ) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        var word = tooltip.select("#focus_feature")
        word.text("Word: "+ d.feature);
        var word = tooltip.select("#frequency")
        bars = tooltip.selectAll(".pred_rect")
        bar_text = tooltip.selectAll(".prob-text")
        name_object = tooltip.selectAll(".class-name")
        if (undef) {
          word.text("< 1% in train or not a feature");
          bars.attr("width", 0)
          bar_text.attr("x", function(d) { return bar_x +  5 + tooltip_xshift;})
              .attr("fill", "black")
              .text("0");
          name_object.data(class_names.slice(0, tooltip_bars));
        }
        else {
          word.text("Frequency in train: "+ freq.toFixed(2));
          mapped = MapClassesToNameProbsAndColors(data, tooltip_bars)
          names = mapped[0];
          data = mapped[1];
          bars.data(data);
          bars.attr("width", function(d) { return bar_x_scale(d)})
              .style("fill", function(d, i) {return class_colors(names[i]);});
          bar_text.data(data);
          bar_text.attr("x", function(d) { return bar_x + bar_x_scale(d) + 5 + tooltip_xshift;})
              .attr("fill", "black")
              .text(function(d) { return d.toFixed(2)});
          name_object.data(names)
       }
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
  FeatureBrushing(sel_list, false);
}
function ToggleFeatureBrushAndRedraw(ex, word) {
  ToggleFeatureBrush(word);
  ShowExample(ex);
  explain_text_div.selectAll("span")
      .style("text-decoration", function(d,i) { return selected_features.has(d.feature) ? "underline" : "none";})
  explain_features_div.select("svg")
    .selectAll(".labels")
    .style("text-decoration", function(d) { return selected_features.has(d.feature) ? "underline" : "none";});
  
}

function ShowWeights(ex) {
  var data = ex.sorted_weights;
  var n_bars = data.length;
  var bar_height = 19;
  var total_height = (bar_height + 10) * n_bars;
  var x_offset = 80;
  var right_x_offset = 40;
  var xscale = d3.scale.linear()
          .domain([0,1])
          .range([0,top_divs_width-x_offset - right_x_offset]);

  var yscale = d3.scale.linear()
          .domain([0, n_bars])
          .range([0,total_height]);

  // TODO make this axis appropriate (stop using axis), make it clickable
  // var yAxis = d3.svg.axis();
  //     yAxis
  //       .orient('left')
  //       .scale(yscale)
  //       .tickSize(2)
  //       .tickFormat(function(d,i){ return i == 0 ? "" :  data[i - 1].feature })
  //       .tickValues(d3.range(0,n_bars + 1));
  var canvas;
  var chart;
  var y_xis;
  var line;
  if (explain_features_div.select("svg").empty()) {
    canvas = explain_features_div.append("svg").attr({'width':'100%','height': (total_height + 10) + "px"});
    chart = canvas.append('g')
              .attr("transform", "translate(" + x_offset+ ",0)")
              .attr('id','bars');
    line = canvas.append("line").attr("x1", x_offset).attr("x2", x_offset).attr("y1", bar_height).style("stroke-width",2).style("stroke", "black");
    // y_xis = canvas.append('g')
    //           .attr("transform", "translate(80, 0)")
    //           .attr('id','yaxis')
    //           .call(yAxis);
  }
  else {
  // This is a transition
    canvas = explain_features_div.select("svg").attr('height', total_height + 10);
    chart = canvas.select('#bars');
    line = canvas.select("line");
    // canvas.select("#yaxis").transition().duration(1000).call(yAxis);
    //canvas.transition().delay(1000).each("end", function (){canvas.select("#yaxis").transition().duration(1000).call(yAxis)});
    //return;
    //y_xis = canvas.select("#yaxis").transition().delay(3000).call(yAxis);
  }
  line.transition().duration(1000).attr("y2", Math.max(bar_height, total_height - 10 + bar_height));
  //line.transition().
  labels = canvas.selectAll(".labels").data(data)
  labels.enter().append('text')
  labels.attr('x', x_offset - 2)
        .attr('y', function(d, i) { return yscale(i) + bar_height + 14})
        .attr('text-anchor', 'end')
        .style("fill", function(d) {return FeatureColor(d.feature);})
        .classed("labels", true)
        .on("mouseover", ShowFeatureTooltip)
        .on("mouseout", HideFeatureTooltip)
        .on("click", function(d) {ToggleFeatureBrushAndRedraw(ex, d)})
        .text(function(d) {return d.feature;});
  labels.exit().remove();
  bars = chart.selectAll('rect').data(data)
  bars.enter().append('rect')
  bars.on("mouseover", ShowFeatureTooltip)
      .attr('height',bar_height)
      .attr({'x':0,'y':function(d,i){ return yscale(i)+bar_height; }})
      .attr('width', 0)
      .style('fill',function(d,i){ return class_colors_i(d.class); })
      .on("mouseout", HideFeatureTooltip)
      .on("click", function(d) {ToggleFeatureBrushAndRedraw(ex, d)});
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
  d3.select("#textarea_explain").node().value = current_text;

}
function ShowFeedbackExample(ex) {
  from_regex = d3.select("#feedback_from").node().value;
  text = ex.features.join(" ");
  text = text.replace(/ \n /g, "\n")
  id = ex.doc_id;
  to_insert_before = '<span class="regex_apply">'
  to_insert_after = '</span>'
  len_insertion = to_insert_before.length + to_insert_after.length
  regex = current_train ? current_regex['train'] : current_regex['test'];
  if (_.has(regex, id)) {
    for (i = 0; i < regex[id].length; ++i) {
      start = regex[id][i][0] + i * len_insertion;
      end = regex[id][i][1] + i * len_insertion;
      text = text.slice(0,start) + to_insert_before + text.slice(start, end) + to_insert_after + text.slice(end);
    }
  }
  text = text.replace(/\n/g, "<br />")
  d3.select("#feedback_text_div").html(text);
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
          return FeatureColor(d.feature);
        }
      })
      .style("font-size", function(d,i) {return size(Math.abs(d.weight))+"px";})
      .style("text-decoration", function(d,i) { return selected_features.has(d.feature) ? "underline" : "none";})
      .on("mouseover", ShowFeatureTooltip)
      .on("mouseout", HideFeatureTooltip)
      .on("click", function(d) {ToggleFeatureBrushAndRedraw(ex, d)});

  // TODO:
  // do the remove first, then the add for smoothness
  //text.exit().transition().duration(1000).style("opacity", 0).remove();
  text.exit().remove();
  current_text = _.map(ex.features, function(x) {return x.feature;}).join(" ")
  d3.select("#textarea_explain").node().value = current_text;
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
var databin_n_bins;
var square_size;
var initial_square_size = 6;
var real_square_size;
var bin_width;
var selected_document;
var databin_width;
var hist_margin, hist_width, hist_height;
var svg_hist, hist_tooltip;
var hist_data;
var dots;
var xValue, databin_x_scale, xMap, xAxis, yValue, yScale, yMap, yAxis;
var refLineFunction;
var databin_y_divisor;
var max_neg_bin;
var max_pos_bin;
var space_below;
var space_above;
var bin_width_per_nbins = Object();
var max_top_per_nbins = Object();
var max_bottom_per_nbins = Object();
var max_top_with_40;
var max_bottom_with_40;
var bin_width_sort_by_class;
function DatabinMaxMinAndDivisor() {

 max_neg_bin = Math.ceil(Math.max((1 - train_statistics.accuracy) * train_docs.length, (1 - test_statistics.accuracy) * test_docs.length));
 //var max_pos_bin = Math.ceil(Math.max(train_statistics.accuracy * train_docs.length, test_statistics.accuracy * test_docs.length));
 //var max_in_a_bin = max_neg_bin + max_pos_bin;
 var squares_in_height = Math.floor(hist_height / real_square_size);
 // - 2 accounts for incomplete lines
 //var bin_square_width = Math.ceil(max_in_a_bin/ (squares_in_height - 2));
 var space_between_bins = 2;
 var bin_square_width = Math.min(Math.floor((hist_width / class_names.length) / real_square_size) - space_between_bins, 40);
 console.log(bin_square_width);
 //bin_width = 20;
 bin_width_sort_by_class = bin_square_width;
 rows_below = Math.max(7, Math.ceil(max_neg_bin / bin_square_width))
 console.log("Below" + rows_below);
 databin_y_divisor = hist_height - rows_below * real_square_size;
 space_below = rows_below * real_square_size;
 space_above = hist_height - space_below - 1;
 for (var i = 1; i <= 12; i++) {
   bin_width_per_nbins[i] = Math.floor((hist_width / i) / real_square_size) - space_between_bins
   max_bottom_per_nbins[i] = (space_below / real_square_size) * bin_width_per_nbins[i];
   max_top_per_nbins[i] = (space_above / real_square_size - 1) * bin_width_per_nbins[i];
 }
 max_top_with_40 = (space_above / real_square_size) * 40;
 max_bottom_with_40 = (space_below / real_square_size) * 40;

 // TODO: think about this a little better
 databin_n_bins = Math.floor(hist_width / ((bin_square_width + space_between_bins) * real_square_size))
 databin_n_bins = databin_n_bins - databin_n_bins % 2;
 if (svg_hist.select("#xaxis").empty()) {
   svg_hist.append("line").attr("id", "xaxis")
 }
 var refLine = svg_hist.select("#xaxis")
     .attr("stroke", "black")
     .attr("stroke-width", 1)
     .attr("x1", 0)
     .attr("x2", hist_width)
     .attr("y1", databin_y_divisor - 0.5)
     .attr("y2", databin_y_divisor - 0.5);

}

function SetupDatabin() {
  top_options_height = parseInt(d3.select("#top_part_options_div").style("height"))
  div_height = parseInt(d3.select("body").style("height")) - (top_part_height + legend_height + 5 + 5 + top_options_height);
  div_width = parseInt(d3.select("#databin_div").style("width"));
  n_bins = 4;
  bin_width = 12;
  square_size = 6;
  real_square_size = square_size + 1;
  selected_document = 0;
  hist_margin = {top: 0, right: 10, bottom: 20, left: 10};
  hist_width = div_width - hist_margin.left - hist_margin.right;
  hist_height = div_height - hist_margin.top - hist_margin.bottom;
  databin_x_scale = d3.scale.linear().range([0, hist_width]); // value -> display
  svg_hist = d3.select("#databin_div").append("svg")
      .attr("width", div_width)
      .attr("height", div_height)
      .append("g")
      .attr("transform", "translate(" + hist_margin.left + "," + hist_margin.top + ")");
  // add the hist_tooltip area to the webpage
  hist_tooltip = d3.select("body").append("div")
      .attr("class", "hist_tooltip")
      .style("opacity", 0);
  // Draw x-axis label
  svg_hist.append("text")
      .text("P(" + class_names[1] + " | example), given by the model")
      .attr("x", function (d) {return hist_width / 2 - this.getComputedTextLength() / 2;})
      .attr("y", div_height -25)
      .attr("id", "hist_xaxis")
      .style("font-size", "14px")
      .style("font-weight", "bold")
  svg_hist.append("text")
      .text("Examples above the horizontal axis are classified correctly.")
      .attr("x", function (d) {return hist_width / 2 - this.getComputedTextLength() / 2;})
      .attr("y", div_height-10)
      .style("font-size", "14px")
      .style("font-weight", "bold")
  svg_hist.append("text")
      .text("0.5")
      .attr("id", "databin-mid")
      .attr("x", function (d) {return hist_width / 2 - this.getComputedTextLength() / 2;})
      .attr("y", div_height-40)
      .style("font-size", "14px")
      .style("opacity", 0.8)
  //svg_hist.append("text")
  //    .attr("x", 0)
  //    .attr("y", hist_height-45)
  //    .style("font-size", "14px")
  //    .text("0.0")
  //svg_hist.append("text")
  //    .text("1.0")
  //    .attr("x", function (d) {return hist_width - this.getComputedTextLength() / 2;})
  //    .attr("y", hist_height-45)
  //    .style("font-size", "14px")
 // add a reference line
 // var refLine = svg_hist.append("path")
 //     .attr("id", "ymiddle")
 //     .attr("stroke", "black")
 //     .attr("stroke-width", 0.8)
 //     .attr("stroke-dasharray", "5,5")
 //     .attr("fill", "none");
 // add a zero line
}


var on_click_document = function(d) {
    selected_document = d.doc_id;
    current = d.doc_id;
    GetPredictionAndShowExample(d.features, d.true_class);
    ShowFeedbackExample(current_docs[selected_document]);
}

function set_doc_ids(docs) {
    for (var i=0; i<docs.length; i++) {
        docs[i].doc_id = i;
    }
}
function binaryIndexOf(searchElement) {
    'use strict';
 
    var minIndex = 0;
    var maxIndex = this.length - 1;
    var currentIndex;
    var currentElement;
    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = this[currentIndex];
 
        if (currentElement < searchElement) {
            minIndex = currentIndex + 1;
        }
        else if (currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }
    return currentIndex;
}

function map_examples_to_bin(docs, focus_class) {
  var n_bins;
  var sorted_correct, sorted_wrong;
  if (focus_class === -1) {
    databin_n_bins = class_names.length;
    n_bins = databin_n_bins;
    bin_width = bin_width_sort_by_class;
    sorted_correct = _.map(_.filter(docs, function(d) {return d.true_class === d.prediction;}), function(d) { return d.true_class / n_bins;}).sort();
    sorted_wrong = _.map(_.filter(docs, function(d) {return d.true_class !== d.prediction;}), function(d) { return d.true_class / n_bins;}).sort();
  }
  else {
    n_bins = 12;
    sorted_correct = _.map(_.filter(docs, function(d) {return d.true_class === d.prediction;}), function(d) { return d.predict_proba[focus_class];}).sort();
    sorted_wrong = _.map(_.filter(docs, function(d) {return d.true_class !== d.prediction;}), function(d) { return d.predict_proba[focus_class];}).sort();
  }
  if (square_size < initial_square_size) {
    square_size = initial_square_size;
    real_square_size = square_size + 1;
    dots.attr("width", square_size).attr("height", square_size);
    DatabinMaxMinAndDivisor();

  }
  reduce_nbins = true;
  bin_size_40 = true;
  while (reduce_nbins) {
    reduce_nbins = false;
    previous_correct_index = 0;
    previous_wrong_index = 0;
    console.log("Bin size " + n_bins);
    for (var i = 1; i <= n_bins; ++i) {
      correct_in_bin = binaryIndexOf.call(sorted_correct, i / n_bins - 0.000000000001) - previous_correct_index + 1;
      wrong_in_bin = binaryIndexOf.call(sorted_wrong, i / n_bins - 0.000000000001) - previous_wrong_index + 1;
      previous_correct_index += correct_in_bin - 1
      previous_wrong_index += wrong_in_bin - 1
      if (correct_in_bin > max_top_per_nbins[n_bins] || wrong_in_bin > max_bottom_per_nbins[n_bins]) {
        bin_size_40 = true;
        reduce_nbins = true;
        n_bins -= 2;
        if (n_bins === 0 || focus_class === -1) {
          square_size -= 1;
          real_square_size = square_size + 1;
          dots.attr("width", square_size).attr("height", square_size);
          n_bins = focus_class === -1 ? class_names.length : 12;
          DatabinMaxMinAndDivisor();
        }
        break;
      }
      if (correct_in_bin > max_top_with_40|| wrong_in_bin > max_bottom_with_40) {
        bin_size_40 = false;
      }
    }
  }
  bin_width = bin_size_40 ? Math.min(40, bin_width_per_nbins[n_bins]) : bin_width_per_nbins[n_bins];
  databin_n_bins = n_bins;
  var correct_bin_index = [];
  var incorrect_bin_index = [];
  for (var i=0; i<n_bins; i++) {
      correct_bin_index[i] = 0;
      incorrect_bin_index[i] = 0;
  }
  for (var i=0; i<docs.length; i++) {
    var pred = focus_class === -1 ? docs[i].true_class / n_bins : docs[i].predict_proba[focus_class];
    docs[i].pred_bin = Math.floor(pred* n_bins);
    if (docs[i].pred_bin >= n_bins) {
        docs[i].pred_bin -= 1;
    }
    var bin = docs[i].pred_bin;
    var correct = docs[i].prediction === docs[i].true_class;
    if (correct) {
      docs[i].bin_x = correct_bin_index[bin] % bin_width;
      docs[i].bin_y = Math.floor(correct_bin_index[bin] / bin_width);
      correct_bin_index[bin] += 1;
      docs[i].mistake = false;
    }
    else {
      docs[i].mistake = true;
      docs[i].bin_x = incorrect_bin_index[bin] % bin_width;
      docs[i].bin_y = Math.floor(incorrect_bin_index[bin] / bin_width) + 1;
      incorrect_bin_index[bin] += 1;
    }
  }
}


function swap_dataset() {
  if(current_train === false) {
    current_train = true;
    current_docs = train_docs;
    DrawStatistics("Train", train_statistics, train_statistics.confusion_matrix)
  }
  else {
    current_train = false;
    current_docs = test_docs;
    DrawStatistics("Validation", test_statistics, test_statistics.confusion_matrix)
  }
  AssignDots(svg_hist, current_docs);
  GetPredictionAndShowExample(current_docs[0].features, current_docs[0].true_class);
  ShowFeedbackExample(current_docs[selected_document]);
  ShowDatabinForClass(-1);
  if (tab_mode === 'explain') {
    FeatureBrushing(current_feature_brush, true);
  }
  else if (tab_mode === 'feedback') {
    BrushRegex(true);
  }
}

var tab_mode = "explain";
function tab_change_explain() {
  tab_mode = "explain";

  ChangeVisibility(d3.selectAll(".top_statistics"), false);
  ChangeVisibility(d3.selectAll(".top_feedback"), false);
  ChangeVisibility(d3.select("#explain_selections"), true);
  change_order(1);
  GetPredictionAndShowExample(current_docs[selected_document].features, current_docs[selected_document].true_class);
}

function tab_change_statistics() {
  tab_mode = "statistics";

  ChangeVisibility(d3.selectAll(".top_explain"), false);
  ChangeVisibility(d3.selectAll(".top_feedback"), false);
  ChangeVisibility(d3.selectAll(".top_statistics"), true);
  ChangeVisibility(d3.select("#explain_selections"), false);
}

function tab_change_feedback() {
  tab_mode = "feedback";

  ChangeVisibility(d3.selectAll(".top_explain"), false);
  ChangeVisibility(d3.selectAll(".top_statistics"), false);
  ChangeVisibility(d3.selectAll(".top_feedback"), true);
  ChangeVisibility(d3.select("#explain_selections"), false);
  ShowFeedbackExample(current_docs[selected_document]);
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

  // focus_class = current_focus_class;
  // n_bins = focus_class === -1 ? class_names.length : databin_n_bins;
  // // Figure out which examples go in which bins
  // map_examples_to_bin(docs, focus_class);
}
function ReSetupDatabin() {
  
  // Initialize the document IDs
 set_doc_ids(train_docs);
 set_doc_ids(test_docs);
 DatabinMaxMinAndDivisor();
  // Draw title
  //svg_hist.append("text")
  //    .attr("x", hist_width/2-200)
  //    .attr("y", 50)
  //    .style("font-size", "16px")
  //    .style("font-weight", "bold")
  //    .text("Overall Model Performance. Held-out accuracy: " + test_accuracy)


 AssignDots(svg_hist, current_docs);
 ShowDatabinForClass(current_focus_class);
}



function ShowDatabinForClass(focus_class) {
  // Figure out which examples go in which bins
  if (focus_class === -1) {
    svg_hist.select("#hist_xaxis")
    .text("Documents grouped by true class.")
    svg_hist.select("#databin-mid").style("opacity", 0);
    n_bins = class_names.length;
  }
  else {
    svg_hist.select("#hist_xaxis")
    .text("P(" + class_names[focus_class] + " | example), given by the model")
    svg_hist.select("#databin-mid").style("opacity", 0.8);
    n_bins = databin_n_bins;
  }
  map_examples_to_bin(current_docs, focus_class);
  n_bins = databin_n_bins;
  // Then map them to an actual x/y position within [0, 1]
  databin_x_scale.domain([0, n_bins]);
  var baseline = databin_y_divisor;
  console.log("REAL " + real_square_size);
  dots.transition().duration(1000)
       .attr("x", function(d) {
         return databin_x_scale(d.pred_bin) + (real_square_size) * d.bin_x;
       })
       .attr("y", function(d) {
         mult = d.mistake ? 1 : -1;
         return baseline + mult * (d.bin_y * real_square_size + 1) - real_square_size;
       })

  svg_hist.select("#xaxis").transition().duration(1000).attr("x2", databin_x_scale(n_bins-1) + bin_width * real_square_size);
  d3.select("#selected_document").moveToFront();

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
          if (focus_class !== -1) {
            s += "<br /> P(" + class_names[focus_class] + ") = ";
            s += + d.predict_proba[focus_class].toFixed(2);
          }
          hist_tooltip.html(s)
              //"Document ID: " + d.doc_id + "<br />True class: " + d.true_class + "<br/>Prediction: " + d.prediction)
              .style("left", d3.event.pageX + 205 < d3.select("body").node().getBoundingClientRect().width ? (d3.event.pageX + 5) + "px" : d3.event.pageX - 205)
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


  // TODO: This is still weird, I think it's kinda wrong.
  //var refLineData = [ {"bin_x": 0.5, "bin_y":-0.03}, {"bin_x":0.5, "bin_y":0.3}];
  //svg_hist.select("#ymiddle")
  //   .attr("d", refLineFunction(refLineData))
  // var refLineData = [ {"bin_x": 0, "bin_y":-0.005}, {"bin_x":0.988, "bin_y":-0.005}];
  // svg_hist.select("#xaxis")
  //    .attr("d", refLineFunction(refLineData))
}
function BrushExamples(example_set) {
  dots.transition().style("opacity", function(d){
    return example_set.has(d.doc_id) ? 1 : 0.4;});
}
function InstantBrushExamples(example_set) {
  dots.style("opacity", function(d){
    return example_set.has(d.doc_id) ? 1 : 0.4;});
}

function update_brushed_features(feature_list) {
  d3.select("#feature_brush_div").selectAll(".active_features").remove();
  saved = d3.select("#feature_brush_div").selectAll(".active_features").data(feature_list)
  zs = saved.enter().append("span")
  zs.classed("active_features", true);
  ps = zs.append("span");
  ps.classed('active_text', true)
    .html(function(d,i) { return '&nbsp;&nbsp;' +  d + '&nbsp;&nbsp;'})
  xs = zs
       .append("span")
       .html("&#10799;<br />")
       .on("click", function(d,i) {
          var feature = Object()
          feature.feature = current_feature_brush.splice(i, 1)[0];
          ToggleFeatureBrushAndRedraw(current_object, feature);
        });
  xs.style("color", "red");
  saved.exit().remove();
}

function FeatureBrushing(feature_list, instant) {
  current_feature_brush = feature_list;
  docs = [];
  //d3.select("#feature_brush_div").html("Features being brushed: <br />" + feature_list.join("<br />"))
  update_brushed_features(feature_list);
  if (feature_list.length > 1) {
    docs = _.intersection.apply(this, _.map(feature_list, function (d) {return current_train ? feature_attributes[d].train_docs : feature_attributes[d].test_docs;}));
  } else {
    if (feature_list.length != 0) {
      docs = current_train ? feature_attributes[feature_list[0]].train_docs : feature_attributes[feature_list[0]].test_docs;
    }
  }
  docs = new Set(_.map(docs, function(d) { return +d;}))
  if (instant) {
    InstantBrushExamples(docs);
  }
  else {
    BrushExamples(docs);
  }
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

var s_bar_space, s_bar_x, s_bar_yshift, b_height, b_width;
function SetupStatistics() {
  b_height = 17;
  b_width = 130;
  // 17 is bar height, 5 is space
  train_height = (b_height + 5) * class_names.length + 80 + 20;
  var stats_svg = d3.select("#statistics_div").append("svg")
  stats_svg.attr("width", "255px").attr("height", train_height);
  stats_svg.style("float", "left").style("padding", "0 px 20 px 0 px 20px");
  stats_svg.attr("id", "stats_svg")

  s_bar_space = 5;
  s_bar_x = 110;
  s_bar_yshift = 80;

  d = 0
  var bar = stats_svg.append("g")
  bar.append("text")
    .attr("x", s_bar_x - 40)
    .attr("id", "statistics_title")
    .attr("y", 30)
    .attr("fill", "black")
    .style("font", "14px tahoma, sans-serif")
  bar.append("text").
    attr("x", s_bar_x - 40)
    .attr("y", 50)
    .attr("fill", "black")
    .style("font", "14px tahoma, sans-serif")
    .attr("id", "statistics_total");
  bar.append("text").
    attr("x", s_bar_x - 40)
    .attr("y", 70)
    .attr("fill", "black")
    .style("font", "14px tahoma, sans-serif")
    .text("Class Distribution:");
  function SBarY(i) {
    return (b_height + s_bar_space) * i + s_bar_yshift;
  }
  num_bars = class_names.length;
  for (i = 0; i < num_bars; i++) {
    rect = bar.append("rect");
    //rect.classed("pred_rect", true);
    rect.attr("x", s_bar_x)
        .attr("y", SBarY(i))
        .attr("height", b_height)
        .style("fill",class_colors_i(i))
        .classed("statistics_rects", true);
    text = bar.append("text");
    text.attr("y", SBarY(i) + b_height - 3)
        .attr("fill", "black")
        .style("font", "14px tahoma, sans-serif")
        .classed("statistics_texts", true);
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
  var cm_svg = d3.select("#statistics_div").append("svg")
  confusion_matrix = new Matrix(cm_svg, top_part_height);
}
function DrawStatistics(title, data, c_matrix) {
  visible = d3.selectAll(".top_statistics").classed("visible")
  ChangeVisibility(d3.selectAll(".top_statistics"), true);
  total = d3.sum(data.class_distribution)
  var s_bar_x_scale = d3.scale.linear().domain([0, total]).range([0, b_width]);

  d3.select("#statistics_title")
    .text(title + " accuracy:" + data.accuracy);
  d3.select("#statistics_total")
    .text("Number of documents: " + total);

  rect = d3.selectAll(".statistics_rects").data(data.class_distribution)
  rect.attr("width", function(d) {return s_bar_x_scale(d);});
  text = d3.selectAll(".statistics_texts").data(data.class_distribution)
  text.attr("x", function(d) { return s_bar_x + s_bar_x_scale(d) + 5; })
       .text(function(d) { return d.toFixed(0); })

  confusion_matrix.populateMatrix(c_matrix)
  ChangeVisibility(d3.selectAll(".top_statistics"), visible);
}

/* Confusion Matrix */

var current_brush = [-1, -1];
function BrushOnMatrix(true_label, predicted_label) {
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
function Matrix(svg_object, height) {
  var defaultMouseover = MOUSEOVER;
  var defaultRegular = FILL;
  this.numClasses = class_names.length;
  //this.width = 350;
  this.strokeSize = STROKE_SIZE;
  this.tickSize = 10;
  this.width = (height - this.strokeSize * 2) / (1.2 + 2/(3 * this.numClasses));
  temp = svg_object.append("text").classed("matrix-text", true).text(max_docs)
  min_class_width = temp.node().getComputedTextLength() + 5;
  temp.classed("axis_label", true).classed("matrix-text", false).text("Actual label");
  this.axisLabelContainerSize = temp.node().getBBox().height
  this.labelContainerSize = this.tickSize;
  this.width = Math.max(min_class_width * this.numClasses, this.width);
  temp.remove();
  var size = this.width / this.numClasses;
  this.footerContainerSize = this.width / 5;
  this.cellSize = size;
  this.id = "matrix";
  //this.mouseoverColor = defaultMouseover;
  //this.cellColor = defaultRegular;
  this.svgContainerSize = (this.cellSize * this.numClasses) + this.strokeSize * 2 + this.labelContainerSize + this.axisLabelContainerSize;
  console.log("Height: " + height + " new: " + (this.svgContainerSize + this.footerContainerSize));
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
  var axisLabelSize = matrix.axisLabelContainerSize;
  var labelContainerSize = matrix.labelContainerSize;
  matrix.svg.append("text")
    .text("Predicted Label")
    .attr("x", function () {
      var pixelLength = this.getComputedTextLength()
      // +10 is for the yshift 10.
      return axisLabelSize + labelContainerSize + matrix.width / 2 - pixelLength / 2 + 10;
    })
    .attr("class", "axis_label")
    .attr("y", 10)
    .attr("id", matrix.id + '-' + 'horizontal-title')
    .style("fill", FONT_COLOR)
    .style("font-size", LABEL_FONT_SIZE);

  matrix.svg.append("text")
    .text("Actual Label")
    .attr("x", function() {
      var pixelLength = this.getComputedTextLength();
      return - axisLabelSize - labelContainerSize - matrix.width / 2 - pixelLength / 2 + 10;
    })
    .attr("y", 10)
    .attr("id", matrix.id + '-' + 'vertical-title')
        .attr("class", "axis_label")
    .style("fill", FONT_COLOR)
    .style("font-size", LABEL_FONT_SIZE)
    .attr("transform", "rotate(270)");
}

function appendLabels(matrix, labels) {
  // create labels
  var offset = 0;
  var size = matrix.cellSize;
  var axisLabelSize = matrix.axisLabelContainerSize;
  var labelContainerSize = matrix.labelContainerSize;
  var tickSize = matrix.tickSize;
  for (var i = 0; i < labels.length; i++) {
    matrix.svg.append("rect")
      .attr("x", function () {
        return labelContainerSize + axisLabelSize + (size / 2) + (size * i) - tickSize / 2; 
      })
      .attr("y", offset + axisLabelSize)
      .attr("width", tickSize)
      .attr("height", tickSize)
      .attr("id", matrix.id + '-' + labels[i] + '-predicted-label')
      .style("fill", class_colors_i(i))

    // create labels
    matrix.svg.append("rect")
      .attr("transform", "rotate(270)") 
      .attr("x", function() {
        return -labelContainerSize - axisLabelSize - (size / 2) - (size * i) - tickSize / 2;
      })
      .attr("y", offset + axisLabelSize)
      .attr("id", matrix.id + '-' + labels[i] + "-actual-label")
      .attr("width", tickSize)
      .attr("height", tickSize)
      .style("fill", class_colors_i(i));
  }

}
Matrix.prototype.getMatrixIds = function() {
  return this.ids;
}
Matrix.prototype.setTextForCell = function(text, id) {
  var newText = d3.select("#" + id + "-text").text(text);
  var cell = d3.select("#" + id + "-cell");

  var pixelHeight = newText.node().getBBox().height;
  var pixelLength = newText.node().getBBox().width;

  var currentX = parseInt(cell[0][0].attributes.x.value);
  var currentY = parseInt(cell[0][0].attributes.y.value);
  
  newText.attr("y", this.cellSize / 2  + currentY + pixelHeight / 4)
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
  console.log("CHANGE ORDEr");
  // Hide everything
  ChangeVisibility(d3.selectAll(".top_explain").filter(".visible"), false)

  editfeature_switch = document.getElementById("myeditfeatures_onoffswitch");
  if (editfeature_switch.checked) {
    sel1 = "textarea";
  } else {
    sel1 = "brushed_features";
  }

  //sel1 = d3.select("#explain-1").node().value
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
  ChangeVisibility(d3.selectAll(".top_explain").filter(function(d,i) {return visible.has(d);}), true);
  top_divs.sort(function(a,b) { return top_divs_order[a] > top_divs_order[b];});
  //alert("OI" + changed_select);
}

function switch_change_order(element) {

}
