var data = [ 
  {"id" : "1",
  "text":[
  {"word": "this", "importance" : 12},
  {"word": "is", "importance" : 8},
  {"word": "very", "importance" : 20},
  {"word": "important", "importance" : 20},
  {"word": ",", "importance" : 20},
  {"word": "or", "importance" : 2},
  {"word": "is", "importance" : 2},
  {"word": "it", "importance" : 2},
  {"word": "?", "importance" : 2},
  {"word": "\n", "importance" : 2},
  {"word": "new", "importance" : -10}],
  "true_class" : "1",
  "prediction": "0.6"},
  {"id" : "2",
  "text":[
  {"word": "this", "importance" : 12},
  {"word": "new", "importance" : -10},
  {"word": "word", "importance" : 5}],
  "true_class" : "1",
  "prediction": "0.2"}];

current = 0;
function run() {
  if (current === 0) {
    current = 1;
  }
  else {
    current = 0;
  }
  ShowExample(data[current]);
  current_text = _.map(data[current]["text"], function(x) {return x.word;}).join(" ")
  d3.select("#text").node().value = current_text;
}

var div = d3.select("#d3");
var height = "50%";
div.style("width", "50%");
div.style("height", height);
div.style("float", "left");
var svg = d3.select("svg")
svg.attr("width", "50%").attr("height", height);
svg.style("float", "left");
ex = data[0]["text"];
var max = d3.max(ex, function(d) {return Math.abs(d.importance);});
var min = d3.min(ex, function(d) {return Math.abs(d.importance);});
var size = d3.scale.linear() .domain([min, max]).range([15, 50])
var bar_height = 130;
var y = d3.scale.linear().range([bar_height, 0]);
var bar_x = 50;
function FirstDraw() {
  bar_width = 30;
  bar_yshift = 20;
  d = 0
  var bar = svg.append("g")
  bar.classed("prediction", true);
  bar.append("rect")
    .attr("x", bar_x)
    .attr("y", y(d) + bar_yshift)
    .attr("height", bar_height - y(d))
    .attr("width", bar_width - 1)
    .attr("fill", d >= .5 ? "green" : "red");
  bar.append("rect")
    .attr("x", bar_x)
    .attr("y", y(1) + bar_yshift)
    .attr("height", bar_height - y(1))
    .attr("width", bar_width - 1)
    .attr("fill-opacity", 0)
    .attr("stroke", "black");
  bar.append("text").attr("x", bar_x + bar_width).attr("y",  y(d) + bar_yshift).attr("fill", "black").text(d);
  bar.append("text").attr("x", bar_x - 20).attr("y", 12).attr("fill", "black").text("Prediction");

  true_class_x = bar_x + 150;
  d = 0
  var true_class = svg.append("g")
  true_class.classed("true_class", true);
  true_class.append("circle")
    .attr("cx", true_class_x + 5)
    .attr("cy",  80)
    .attr("r",  40)
    .attr("fill", d >= .5 ? "green" : "red");
  bar.append("text").attr("x", true_class_x - 30).attr("y", 12).attr("fill", "black").text("True Class");
}
FirstDraw()
function ShowExample(ex) {
  var text = div.selectAll("span").data(ex["text"]);
  text.enter().append("span")
  text.text(function (d,i) {return d.word + " "; })
      .style("color", function(d,i) {return d.importance < 0 ? "red" : "green";})
      .style("font-size", function(d,i) {return size(Math.abs(d.importance))+"px";})
      .on('click', function() {d3.select(this).transition().duration(1000).style("color", "blue");});
  text.exit().remove();
  bar_width = 30;
  bar_yshift = 20;
  d = ex.prediction
  var pred = svg.selectAll(".prediction")
  pred.select("rect").transition().duration(1000)
    .attr("x", bar_x)
    .attr("y", y(d) + bar_yshift)
    .attr("height", bar_height - y(d))
    .attr("width", bar_width - 1)
    .attr("fill", d >= .5 ? "green" : "red");
  pred.select("text").transition().duration(1000)
    .attr("x", bar_x + bar_width).attr("y",  y(d) + bar_yshift)
    .attr("fill", "black")
    .text(d);
  true_class_x = bar_x + 150;
  d = ex.true_class
  var true_class = svg.selectAll(".true_class")
  true_class.select("circle").transition().duration(1000)
    .attr("cx", true_class_x + 5)
    .attr("cy",  80)
    .attr("r",  40)
    .attr("fill", d >= .5 ? "green" : "red");
}
ShowExample(data[0])

