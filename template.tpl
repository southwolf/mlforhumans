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
<div id="info_button">
    <button class="blue_button" onclick="show_info()">info</button>
</div>
<div id="weights_button_div", style="margin-top:10px">
    <!-- <button class="green_button" onclick="run();">Look at another example</button> -->
    <button class="green_button" id ="sort_button" onclick="sort();">Sort words based on weights</button>
</div>
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

<svg class="hovercard"></svg>


    <br />
<div id="side_by_side_text">
    <div id="textarea_div">
        <textarea id="textarea">
        </textarea>
    </div>
    <div id="text_buttons_div">
        <button class="green_button" title="Change example based on textarea." onclick="change(null);">--></button>
        <br/>
        <button class="green_button" title="Make textarea contain selected text." onclick="change_to_selection();"><--</button>
    </div>
    <div id="d3">
    </div>
    <svg id="prediction_bar"></svg>
</div>

<script src="info_box.js"></script>

<!--Tabular layout-->
<span id="tab-1" class="tab_span"></span>
<span id="tab-2" class="tab_span"></span>
<span id="tab-3" class="tab_span"></span>

<!-- The main markup -->
<div id="tab">
	<ul>
		<li><a href="#tab-1">Dataset</a></li>
		<li><a href="#tab-2">Example</a></li>
		<li><a href="#tab-3">Feature</a></li>
	</ul>
	<div class="tab-content-1">
        <div id="histogram_div"></div>
    </div>
	<div class="tab-content-2">
        <div id="sorted_weights_div"><svg id="sorted_weights"/></div>
    </div>
	<div class="tab-content-3"><div id="feature_brush"></div></div>
</div>

<script src="code.js"></script>
</body>
</html>
