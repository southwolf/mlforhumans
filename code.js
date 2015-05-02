var weights;
var docs;
var size;
var accuracy;
var previous_text;
var word_statistics;
var sort_order = "document_order";

d3.json("docs.json",  function(error, json) {
  if (error) return console.warn(error);
  docs = json.docs;
  weights = json.weights;
  accuracy = json.accuracy;
  word_statistics = json.feature_statistics;
  docs[0].text = GenerateWeights(docs[0].text);
  var max = d3.max(_.map(_.values(weights), Math.abs));
  var min = d3.min(_.map(_.values(weights), Math.abs));
  size = d3.scale.linear().domain([min, max]).range([15, 30]);
  FirstDraw();
  FirstDrawTooltip()
  ShowExample(docs[0]);
})

function GenerateWeights(word_array) {
  return _.map(word_array, function(w) {
        return {"word" : w, "weight": _.has(weights, w) ? weights[w] : 0};
      }
  )
}

current = 0;
function run() {
  previous_text = null;
  if (current === docs.length - 1) {
    current = 0;
  }
  else {
    current += 1;
  }
  if (typeof docs[current].text[0].weight == 'undefined') {
    docs[current].text = GenerateWeights(docs[current].text);
  }
  ShowExample(docs[current]);
}
function Predict(ex) {
  // Assumes I'm getting a well-formed document, with word-weights
  var z = 0;
  _.forEach(ex.text, function(w) { z += w.weight; });
  z = Math.exp(z);
  result = z / (1 + z);
  return +result.toFixed(2);
}
function change(current_text, sort) {
  if (current_text === null) {
    current_text = d3.select("#textarea").node().value;
  }
  var ex = Object();
  ex.text = _.map(current_text.split(" "), function(w) { return {"word" : w, "weight": _.has(weights, w) ? weights[w] : 0};});
  if(sort !== undefined){
    if(sort === true){
      previous_text = current_text;
      ex.text = _.sortBy(ex.text, function(w) {return Math.abs(w["weight"])}).reverse();
      ex.text = _.remove(ex.text, function(w) {
        if (w["word"] === "\n" || w["word"] === "\t" || w["word"] === " ")
          return false;
        else
          return true;
      });
    }
  }
  ex.true_class = docs[current].true_class;
  ex.prediction = Predict(ex);
  ShowExample(ex);
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
    change(null, true);
    sort_order = "weight_order";
    d3.select("#sort_button").text("Revert to original word order")
  }
  else {
    revert_sort();
    sort_order = "document_order";
    d3.select("#sort_button").text("Sort based on weights")
  }
}

function revert_sort(){
  if(previous_text !== undefined || previous_text === null)
    change(previous_text,false);
  else
    change(null, false);
}

var div = d3.select("#d3");
var height = "50%";
var svg = d3.select("#prediction_bar")
svg.attr("width", "80px").attr("height", 225);
svg.style("float", "left");
var bar_height = 130;
var y = d3.scale.linear().range([bar_height, 0]);
var bar_x = 20;

var t_bar_yshift = 60;
var t_bar_height = 80;
var t_y = d3.scale.linear().range([t_bar_height,0 ])

var tooltip = d3.select(".hovercard")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("left", "10px")
    .style("pointer-events", "none")

function FirstDrawTooltip() {
  bar_width = 20;
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
  bar.append("text").attr("x", 10).attr("y",  50).attr("fill", "black").text("Frequency");
  bar.append("text").attr("x", 110).attr("y",  50).attr("fill", "black").text("Distribution");
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

function FirstDraw() {
  bar_width = 30;
  bar_yshift = 25;
  d = 0
  var bar = svg.append("g")
  bar.classed("prediction", true);
  bar.append("rect")
      .attr("x", bar_x)
      .attr("y", y(d) + bar_yshift)
      .attr("height", bar_height - y(d))
      .attr("width", bar_width - 1)
      .attr("fill", d >= .5 ? pos_hex : neg_hex);
  bar.append("rect")
      .attr("x", bar_x)
      .attr("y", y(1) + bar_yshift)
      .attr("height", bar_height - y(1))
      .attr("width", bar_width - 1)
      .attr("fill-opacity", 0)
      .attr("stroke", "black");
  bar.append("text").attr("x", bar_x + bar_width).attr("y",  y(d) + bar_yshift).style("font", "14px tahoma, sans-serif").attr("fill", "black").text(d);
  bar.append("text").attr("x", bar_x - 20).attr("y", 12).attr("fill", "black").style("font", "14px tahoma, sans-serif").text("Prediction");

  d = 0
  var true_class = svg.append("g")
  true_class.classed("true_class", true);
  true_class.append("circle")
      .attr("cx", bar_x + bar_width / 2)
      .attr("cy",  y(0) + 3 * bar_yshift)
      .attr("r",  bar_width /2)
      .attr("fill", d >= .5 ? pos_hex : neg_hex);
  bar.append("text").attr("x", bar_x - 20).attr("y", y(0) + 2 * bar_yshift).attr("fill", "black").style("font", "14px tahoma, sans-serif").text("True Class");
  //bar.append("text").attr("x", bar_x - 20).attr("y", bar_height + bar_yshift + 50).style("font", "14px tahoma, sans-serif").attr("fill", "black").text("Classifier Accuracy: " + accuracy );
}
function ShowExample(ex) {
  var text = div.selectAll("span").data(ex["text"]);
  text.enter().append("span");
  text.html(function (d,i) {return d.word != "\n" ? d.word + " " : "<br />"; })
      .style("color", function(d, i) {
        var w = 5;
        var color_thresh = 0.1;
        if (d.weight < -color_thresh) {
          return "rgba(" + neg_color +", " + (-w*d.weight+0.2) +")";
        }
        else if (d.weight > color_thresh) {
          return "rgba(" + pos_color + ", " + (w*d.weight+0.2) +")";
        } else {
          return "rgba(0, 0, 0, 0.35)";
        }
      })
      .style("font-size", function(d,i) {return size(Math.abs(d.weight))+"px";})
      .on("mouseover", function(d) {
        var freq;
        var prob;
        if (typeof word_statistics[d.word] == 'undefined') {
          freq = 0;
          prob = "0.5";
        }
        else {
          freq = word_statistics[d.word]['freq'];
          prob = word_statistics[d.word]['distribution'];
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
        word.text(d.word);

      })
      .on("mouseout", function(d) {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
      });

  // do the remove first, then the add
  text.exit().transition().duration(1000).style("opacity", 0).remove();
  //text.exit().remove();
  bar_width = 30;
  bar_yshift = 25;
  d = ex.prediction
  var pred = svg.selectAll(".prediction")
  pred.select("rect").transition().duration(1000)
      .attr("x", bar_x)
      .attr("y", y(d) + bar_yshift)
      .attr("height", bar_height - y(d))
      .attr("width", bar_width - 1)
      .attr("fill", d >= .5 ? pos_hex : neg_hex);
  pred.select("text").transition().duration(1000)
      .attr("x", bar_x + bar_width).attr("y",  y(d) + bar_yshift)
      .attr("fill", "black")
      .text(d);
  true_class_x = bar_x + 150;
  d = ex.true_class
  var true_class = svg.selectAll(".true_class")
  true_class.select("circle").transition().duration(1000)
      .attr("fill", d >= .5 ? pos_hex : neg_hex);
  current_text = _.map(ex.text, function(x) {return x.word;}).join(" ")
  d3.select("#textarea").node().value = current_text;
}
//docs[0].text = GenerateWeights(docs[0].text)
//ShowExample(docs[0])

