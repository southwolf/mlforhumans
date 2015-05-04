a3-marcotcr-shrainik-bdol
===============

## Team Members

1. Marco Tulio Ribeiro marcotcr@cs.washington.edu
2. Shrainik Jain shrainik@cs.washington.edu
3. Brian Dolhansky bdol@cs.washington.edu

## Understanding Machine Learning for NLP

Many people use machine learning algorithms blindly, just looking at summary statistics (i.e. accuracy). We have produced an interactive visualization that lets users better understand what their algorithms are actually doing. As a test case, we chose a subset of [20 newsgroups](http://qwone.com/~jason/20Newsgroups/), a standard dataset where the task is to learn to distinguish between different newsgroups. Our task here is distinguishing between the Christianity and Atheistm newsgroups. As an algorithm, we used a standard L2 regularized logistic regression, a baseline for many papers, such as [this recent one](http://www.cs.cmu.edu/~dyogatam/papers/yogatama+smith.icml2014.pdf). The data we're visualizing is a combination of the raw dataset and the machine learning model learned from it.

Our visualization lets users:
* Quickly see what words the model thinks are most important for each class.
* Interactively edit a document, and see how the prediction changes. This interaction can be done by:
    - Editing the document in the text box.
    - Selecting a part of the document from the displayed text.
* Zoom in particular words (by hovering), to better understand why the model is learning what it is learning by the way of summary statistics.
* See all of the cross validation examples ordered by algorithm prediction.
    - Interactively choose an example and look at the model details.

Some quick exploration quickly tells a story that many top researchers in the field seem to have missed (probably due to just looking at summary statistics). Even though the accuracy for this particular dataset is very high, the algorithm is learning to distinguish between features that are artifacts of how the data was collected. A lot of weight is put on user names and email addresses who usually post to only one newsgroup. One particular example is the word 'rutgers' in the email address, which appears in 22% of the documents in the data - **always** in documents about Christianity. Removing these words quickly makes sure-fire predictions wrong. We note that just looking at the raw dataset does not immediately produce such insights (who would think to look at the class distribution for a word like 'rutgers' in this task?) - they come from seeing how the machine learning algorithm is making predictions.

### Encoding choices: **TODO**
* Size of words represent the magnitude of its weight.
* Color and opacity of words represent the what class it belongs to. 
    - To avoid clutter, and make the most important words stand out, the words with weight below a certain threshold were given a neutral color.

## Running Instructions

Access our visualization at [this link](https://cse512-15s.github.io/a3-marcotcr-shrainik-bdol/) or download this repository and run `python -m SimpleHTTPServer 9000` and access this from http://localhost:9000/.


## Story Board **TODO**

Put either your storyboard content or a [link to your storyboard pdf file](storyboard.pdf?raw=true) here. Just like A2, you can use any software to create a *reasonable* pdf storyboard.


### Changes between Storyboard and the Final Implementation

A paragraph explaining changes between the storyboard and the final implementation.


## Development Process **TODO**

Include:
- Breakdown of how the work was split among the group members. 
- A commentary on the development process, including answers to the following questions: 
  - Roughly how much time did you spend developing your application?
  - What aspects took the most time?
