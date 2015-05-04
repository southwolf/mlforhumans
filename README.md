a3-marcotcr-shrainik-bdol
===============

## Team Members

1. Marco Tulio Ribeiro marcotcr@cs.washington.edu
2. Shrainik Jain shrainik@cs.washington.edu
3. Brian Dolhansky bdol@cs.washington.edu

## Understanding Machine Learning for NLP

Many people use machine learning algorithms blindly, just looking at summary statistics (i.e. accuracy). We have produced an interactive visualization that lets users better understand what their algorithms are actually doing. As a test case, we chose a subset of [20 newsgroups](http://qwone.com/~jason/20Newsgroups/), a standard dataset where the task is to learn to distinguish between different newsgroups. Our task here is distinguishing between the Christianity and Atheistm newsgroups. As an algorithm, we used a standard L2 regularized logistic regression, a baseline for many papers, such as [this recent one](http://www.cs.cmu.edu/~dyogatam/papers/yogatama+smith.icml2014.pdf). The data we're visualizing is a combination of the raw dataset and the machine learning model learned from it.

Our visualization lets users:
* Quickly see what words the model thinks are most important for each class (in this case, the 'importance' is measured by the logistic regression weights).
* Interactively edit a document, and see how the prediction changes. This interaction can be done by:
    - Editing the document in the text box, and clicking on the arrow pointing right.
    - Selecting a part of the document from the displayed text, and clicking on the arrow pointing left.
* Zoom in particular words (by hovering), to better understand why the model is learning what it is learning by  way of summary statistics in the training data. We show the frequency of the word, and the class distribution in the training data.
* See all of the cross validation examples ordered by algorithm prediction. Hovering over an example gives more information.
    - Interactively choose an example and visualize it.

Some quick exploration quickly tells a story that many top researchers in the field seem to have missed (probably due to just looking at summary statistics). Even though the accuracy for this particular dataset is very high, the algorithm is learning to distinguish between features that are artifacts of how the data was collected. A lot of weight is put on user names and email addresses who usually post to only one newsgroup. One particular example is the word 'rutgers' in the email address, which appears in 22% of the documents in the data - **always** in documents about Christianity. Removing these words quickly makes sure-fire predictions wrong. We note that just looking at the raw dataset does not immediately produce such insights (who would think to look at the class distribution for a word like 'rutgers' in this task?) - they come from seeing how the machine learning algorithm is making predictions. A few minutes with the visualization lets us see that this classifier will probably not generalize to data outside of this particular dataset.

### Some rationale for encoding choices:
** Text on the right:**
* Size of words represent the magnitude of its weight. At some point we changed this to opacity, but we changed it back. Size is just easier for people to quickly glance what the most important words are. We left opacity as a double encoding, but it is barely perceptible. Since weight is quantitative, we think size is a good choice (position was already taken by the text itself).
* Color: represents what class the word 'belongs to' - i.e. is the weight positive or negative for the 'Christianity' class. To avoid clutter, and make the most important words stand out, the words with weight below a certain threshold were given a neutral color. Since this is a nominal attribute, color works well.

** Prediction bar on the right: **
* We used a triple encoding for the prediction: bar position (animated as we change the text), text (value) and color for pointing out when the class changes. Color in this case is redundant, since one can figure out the class by checking if the value is higher or lower than 0.5. Bar position helps us track the changes interactively, color takes out the mental effort of having to think which class it is (especially with the true class on the bottom), and value lets us have precision if it is needed.
 
** Dataset visualization on the bottom:**
* Each square is a training example. The prediction of the model is encoded by horizontal position (binned into 14 separate bins), and the true class by color. Note that this is somewhat redundant with the prediction bar on the right - but the prediction right on the bar is much better for the task of visualizing one example (and tracking it's changes), while this provides us an overview of the whole data.
* We encode whether or not an example is classified correctly by vertical position (up is correctly classified, down is incorrectly). Combined with the encoding above, this give us powerful insights over the performance of a particular classifier: we can visually perceive the proportion of misclassified examples by comparing what is above and below the horizontal line, we can quickly pick out examples where the model is most mistaken about (bottom right and left corners), or examples in the decision boundary (close to the vertical line), which are both useful for understanding the model.
* The distinction between the example being visualized in the top and the rest is encoded by opacity (low values for the rest of the dataset).


## Running Instructions

Access our visualization at [this link](https://cse512-15s.github.io/a3-marcotcr-shrainik-bdol/) or download this repository and run `python -m SimpleHTTPServer 9000` and access this from http://localhost:9000/.


## Story Board **TODO**

[Here it is.](storyboards.pdf?raw=true).


### Changes between Storyboard and the Final Implementation

The changes are documented in the storyboards themselves (as there are various, from different times during the project). Our initial idea was to just have a text box where the user would be able to edit text, and visualize how the prediction changed. We added the 'Data' part, copying [this paper](http://research.microsoft.com/en-us/um/people/samershi/papers/amershi.CHI2015.ModelTracker.pdf) as an extra, 'if we have time'. 

* At some point we noticed that one interaction we always wanted to do was select some text on the right and have it reflected on the text box (this is reflected in the second storyboard). 
* The 'Data' part also changed significantly here: we now introduced the horizontal line, so that the misclassified documents become clearer. One thing that also bugged us about the first version was that the user would just flip through examples randomly. In this storyboard, the user is able to click on the example they want to visualize.
* Sometimes we just wanted a quick glance at what the most 'important' words were for a document. That's where the 'Sort' button came in. Of course, the user may want to sort back to the original document order (which has semantic meaning), so we added that as well.
* A big change that came in later was the ability to hover over words and get summary statistics from the training data. Initially, we thought that we would potentially click on words and go to another window or something (this was another feature that we listed as 'if we have time'). This solution turned out to be much better, as there is low-cost and no loss of context for the user. Having these hover cards increased the understanding we got from the data a lot.
* Initially (as seen in all storyboards), we colored every word on the right (since every word is either positive or negative). We added a threshold, so that only the most salient words get a color, and thus are distinguished from the rest.
* We did various design changes. such as: 
    * Changing the colors, since red-green may not be the most colorblind-friendly choice.
    * Setting  the opacity of every document in 'Data' to low except the document being visualized, so that it stands out.
    * Moving everything around multiple times.

## Development Process

###Breakdown

We did not necessarily have parts of the visualization we were individually responsible for. However, here is a rough breakdown:
* Marco: Coming up with the data, text box / text presentation on the right, hovercard for word summary statistics, prediction bar and true class on the right
* Brian: Example display on the bottom (the 'Data' part of the storyboard), page layout and design
* Shrainik: Sorting based on weights, attempted to make the text transitions smoother (didn't make it into the visualization).

We did not measure how much time we spent developing this application. A good amount of time was spent at first learning how to use javascript and d3, and trying things out. Another good amount of time was spent at the end, learning how to use CSS and trying to put things where we wanted them.
