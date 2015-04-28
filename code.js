var weights;
var docs;
var size;
var accuracy;
d3.json("docs.json",  function(error, json) {
  if (error) return console.warn(error);
  docs = json.docs;
  weights = json.weights;
  accuracy = json.accuracy;
  docs[0].text = GenerateWeights(docs[0].text);
  var max = d3.max(_.map(_.values(weights), Math.abs));
  var min = d3.min(_.map(_.values(weights), Math.abs));
  size = d3.scale.linear().domain([min, max]).range([15, 50]);

  FirstDraw();
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
function change(current_text) {
  if (current_text === null) {
    current_text = d3.select("#text").node().value;
  }
  var ex = Object();
  ex.text = _.map(current_text.split(" "), function(w) { return {"word" : w, "weight": _.has(weights, w) ? weights[w] : 0};});
  ex.true_class = docs[current].true_class;
  ex.prediction = Predict(ex);
  ShowExample(ex);
}


var div = d3.select("#d3");
var height = "50%";
div.style("width", "50%");
div.style("height", height);
div.style("float", "left");
div.style("overflow", "scroll");

div.on('mouseup', function() {
  text = document.getSelection().toString();
  if (text !== "") {
    change(text.replace(/\n/g, "\n "))
  }
  if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }
  });
var svg = d3.select("svg")
svg.attr("width", "50%").attr("height", height);
svg.style("float", "left");
var bar_height = 130;
var y = d3.scale.linear().range([bar_height, 0]);
var bar_x = 50;
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
  bar.append("text").attr("x", bar_x - 20).attr("y", bar_height + bar_yshift + 50).attr("fill", "black").text("Classifier Accuracy: " + accuracy );
}
//FirstDraw()
function ShowExample(ex) {
  var text = div.selectAll("span").data(ex["text"]);
  text.enter().append("span")
  text.html(function (d,i) {return d.word != "\n" ? d.word + " " : "<br />"; })
      .style("color", function(d,i) {return d.weight < 0 ? "red" : "green";})
      .style("font-size", function(d,i) {return size(Math.abs(d.weight))+"px";})
      .on('click', function() {d3.select(this).transition().duration(1000).style("color", "blue");});
  text.exit().remove();
  bar_width = 30;
  bar_yshift = 25;
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
  current_text = _.map(ex.text, function(x) {return x.word;}).join(" ")
  d3.select("#text").node().value = current_text;
}
//docs[0].text = GenerateWeights(docs[0].text)
//ShowExample(docs[0])

