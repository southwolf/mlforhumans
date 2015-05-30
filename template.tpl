<html>

<head>
    <script type="text/javascript" src="d3.min.js"></script>
    <script type="text/javascript" src="lodash.js"></script>
    <script type="text/javascript">
      var json_file = "{{json_file}}";
    </script>
    <link rel="stylesheet" type="text/css" href="style.css">
</head>

<body>
<script type="text/javascript" src="colors.js"></script>

<!--Info button-->
<!--
<div id="info_button">
    <button class="blue_button" onclick="show_info()">info</button>
</div>
<div id="weights_button_div", style="margin-top:10px">
    <button class="green_button" id ="sort_button" onclick="sort();">Show feature contributions</button>
    <button class="green_button" id ="explain_button" onclick="change_explanation();">Change to sentence explanation</button>
</div> -->
<!--Info button contents-->
<div id="light" class="white_content">
    Cross validation predictions for 20 newsgroups dataset. Positive (blue) class is Christianity, negative class is
    Atheism.
    <br/>
    <br/>
    We are using bag of words (case sensitive), and logistic regression. The size of
    a word is proportional to its weight coefficient in logistic regression.
    Hovering the mouse over a word gives summary statistics for that word in the
    training data (frequency and class distribution).
    <br/>
    <br/>
    The "bi-histogram" at the bottom shows the overall performance of the model. Correctly-classified examples are shown
    above the solid horizontal line, while incorrect examples are shown below. The histogram is interactive - you can
    click on a document in it to load it into the text editor.
    <br/>
    <br/>

    <a href = "javascript:void(0)" onclick = "hide_info()">Close</a></div>
<div id="fade" class="black_overlay"></div>
<!---->

<select id="view-select" onChange="change_mode();">
<option value="explain">Explain prediction</option>
<option value="statistics">Global statistics</option>
<option value="feedback">Feedback</option>
</select>
<select id="dataset-select" onChange="change_dataset();">
<option value="test">Validation</option>
<option value="train">Train</option>
</select>
<div id="explain_selections"> 
<select id="explain-1" onChange="change_order(1);">
  <option value="textarea">Edit text</option>
  <!--<option value="text">View text</option>
  <option value="prediction">Prediction probabilities</option>
  <option value="feature_contribution">Feature contributions</option> -->
  <option value="brushed_features">Selected features</option>
</select>
<!-- <select id="explain-2" onChange="change_order(2);">
  <option value="text" selected>View text</option>
  <option value="textarea">Edit text</option>
  <option value="prediction">Prediction probabilities</option>
  <option value="feature_contribution">Feature contributions</option>
  <option value="brushed_features">Selected features</option>
</select> -->
<select id="explain-3" onChange="change_order(3);">
  <!--<option value="textarea">Edit text</option>
  <option value="text">View text</option> -->
  <option value="prediction" selected>Prediction probabilities</option>
  <option value="feature_contribution">Feature contributions</option>
  <!--<option value="brushed_features">Selected features</option> -->
</select>

</div>
<svg class="hovercard"></svg>
    <br />
    <div id="textarea_div" class="top_explain visible">
        <textarea id="textarea" class="textarea_stuff">
        </textarea>
        <button class="textarea_stuff green_button" title="Change example based on textarea." onclick="change(null);">--></button>
    </div>
    <div id="explain_text_div" class="top_explain top_mid visible"> </div>
    <div id="prediction_bar_div" class="top_explain top_right visible">
      <svg id="prediction_bar"></svg>
    </div>
    <div id="explain_features_div" class="top_explain hidden"> </div>
    <div id="feature_brush_div" class="top_explain hidden"> </div>
	  <div id="statistics_div" class="hidden top_statistics"> </div>
	  <div id="confusion_matrix_div" class="hidden top_statistics"> </div>

<script src="info_box.js"></script>


<div id="legend_div" class="bottom_part"></div>
<div id="databin_div" class="bottom_part"></div>
<!-- The main markup -->

<script src="code.js"></script>
</body>
</html>
