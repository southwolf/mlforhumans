import bottle
from bottle import route, run, hook, response, request, static_file
import collections

import sys
import os
import argparse
import numpy as np
import json
from sklearn.datasets import fetch_20newsgroups
from sklearn.metrics import accuracy_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn import linear_model
from sklearn import tree
from sklearn import svm
import time
import argparse

def RoundAndListifyVector(v):
  # If the vector is all zeros, put a uniform on it.
  temp = v.copy()
  if sum(v) == 0:
    temp = (v + 1) / v.shape[0]
  out = [round(x,2) for x in temp]
  out[-1] += round(1 - sum(out), 3)
  return out
def GetJsonExampleList(data, data_vectors, labels, classifier, tokenizer):
  out = []
  for i, doc in enumerate(data):
    temp = {}
    temp['features'] = ' \n '.join(map(lambda x: ' '.join(tokenizer(x)), doc.split('\n'))).split(' ')
    temp['true_class'] = int(labels[i])
    temp['predict_proba'] = RoundAndListifyVector(classifier.predict_proba(data_vectors[i])[0])
    temp['prediction'] = classifier.predict(data_vectors[i])[0]
    out.append(temp)
  return out

def GenerateJSONs(class_names, train_data, train_labels, test_data, test_labels, classifier, vectorizer, output_json):
  # class_names is a list
  # train_data and test_data are assumed to be lists of strings
  # train_labels and test_labels are lists of ints
  # classifier is assumed to be a trained classifier
  # We will fit the vectorizer to the training data
  train_vectors = vectorizer.fit_transform(train_data)
  test_vectors = vectorizer.transform(test_data)
  tokenizer = vectorizer.build_tokenizer()
  output = {}
  output['class_names'] = class_names
  output['train'] = GetJsonExampleList(train_data, train_vectors, train_labels, classifier, tokenizer)
  output['test'] = GetJsonExampleList(test_data, test_vectors, test_labels, classifier, tokenizer)
  output['feature_attributes'] = {}
  output['test_accuracy'] = round(accuracy_score(test_labels, classifier.predict(test_vectors)), 3)
  predictions = classifier.predict(test_vectors)
  train_count = np.bincount(train_vectors.nonzero()[1])
  test_count = np.bincount(test_vectors.nonzero()[1], minlength=len(train_count))
  for word, i in vectorizer.vocabulary_.iteritems():
    prob = float(train_count[i]) / train_labels.shape[0]
    test_freq = float(test_count[i]) / test_labels.shape[0]
    if prob > .01:
      output['feature_attributes'][word] = {}
      output['feature_attributes'][word]['train_freq'] = round(prob, 2)
      output['feature_attributes'][word]['test_freq'] = round(test_freq, 2)
      output['feature_attributes'][word]['train_distribution'] = np.bincount(train_labels[train_vectors.nonzero()[0][train_vectors.nonzero()[1] == i]], minlength=len(class_names)).astype('float')
      output['feature_attributes'][word]['train_distribution'] /= sum(output['feature_attributes'][word]['train_distribution'])
      output['feature_attributes'][word]['train_distribution'] = RoundAndListifyVector(output['feature_attributes'][word]['train_distribution'])
      output['feature_attributes'][word]['test_distribution'] = np.bincount(predictions[test_vectors.nonzero()[0][test_vectors.nonzero()[1] == i]], minlength=len(class_names)).astype('float')
      if test_count[i] > 0:
        output['feature_attributes'][word]['test_distribution'] /= sum(output['feature_attributes'][word]['test_distribution'])
      output['feature_attributes'][word]['test_distribution'] = RoundAndListifyVector(output['feature_attributes'][word]['test_distribution'])
  json.dump(output, open(output_json, 'w'))
  
def LoadTextDataset(path_train, path_test):
  # Loads datasets from http://web.ist.utl.pt/acardoso/datasets/
  current_class = 0
  class_index = {}
  class_names = []
  train_data = []
  train_labels = []
  test_data = []
  test_labels = []
  for line in open(path_train):
    class_, text = line.split('\t') 
    if class_ not in class_index:
      class_index[class_] = current_class
      class_names.append(class_)
      current_class += 1
    train_data.append(text)
    train_labels.append(class_index[class_])
  for line in open(path_test):
    class_, text = line.split('\t') 
    test_data.append(text)
    test_labels.append(class_index[class_])
  return train_data, np.array(train_labels), test_data, np.array(test_labels), class_names
    


def LoadDataset(dataset_name):
  if dataset_name.endswith('ng'):
    if dataset_name == '2ng':
      cats = ['alt.atheism', 'soc.religion.christian']
      class_names = ['Atheism', 'Christianity']
    if dataset_name == '3ng':
      cats = ['comp.os.ms-windows.misc', 'comp.sys.ibm.pc.hardware', 'comp.windows.x']
      class_names = ['windows.misc', 'ibm.hardware', 'windows.x']
    newsgroups_train = fetch_20newsgroups(subset='train',categories=cats)
    newsgroups_test = fetch_20newsgroups(subset='test',categories=cats)
    train_data = newsgroups_train.data
    train_labels = newsgroups_train.target
    test_data = newsgroups_test.data
    test_labels = newsgroups_test.target
    return train_data, train_labels, test_data, test_labels, class_names
  if dataset_name == 'r8':
    return LoadTextDataset('/Users/marcotcr/phd/datasets/reuters/r8-train-all-terms.txt',
                    '/Users/marcotcr/phd/datasets/reuters/r8-test-all-terms.txt')
  if dataset_name == 'r52':
    return LoadTextDataset('/Users/marcotcr/phd/datasets/reuters/r52-train-all-terms.txt',
                    '/Users/marcotcr/phd/datasets/reuters/r52-test-all-terms.txt')
  if dataset_name == 'webkb':
    return LoadTextDataset('/Users/marcotcr/phd/datasets/webkb/webkb-train-stemmed.txt',
                    '/Users/marcotcr/phd/datasets/webkb/webkb-test-stemmed.txt')

    
# Right now, this is abs(P(Y) - P(Y | NOT x)). We probably want to normalize
# this, since these become pretty insignificant as text gets longer.
def WordImportance(classifier, example, inverse_vocabulary):
  orig = classifier.predict_proba(example)[0]
  imp = {}
  for i in example.nonzero()[1]:
    val = example[0,i]
    example[0,i] = 0
    pred = classifier.predict_proba(example)[0]
    imp[inverse_vocabulary[i]] = {}
    imp[inverse_vocabulary[i]]['weight'] = np.max(abs(pred - orig))
    imp[inverse_vocabulary[i]]['class'] = np.argmin(pred - orig)
    example[0,i] = val
  return imp

def enable_cors(fn):
    def _enable_cors(*args, **kwargs):
        # set CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token'
        if bottle.request.method != 'OPTIONS':
            # actual request; reply with the actual response
            return fn(*args, **kwargs)
    return _enable_cors
def main():
  parser = argparse.ArgumentParser(description='Visualize some stuff')
  parser.add_argument('-json', type=str, help='generate json file')
  parser.add_argument('-dataset', '-d', type=str, help='2ng for Christianity vs Atheism, 3ng for Windows misc, IBM hardward and Windows X,', default='2ng')
  parser.add_argument('-classifier', '-c', type=str, help='logistic for logistic regression', default='logistic')
  args = parser.parse_args()
  train_data, train_labels, test_data, test_labels, class_names = LoadDataset(args.dataset)
  vectorizer = CountVectorizer(lowercase=False)
  if args.classifier == 'logistic':
    classifier = linear_model.LogisticRegression(fit_intercept=True)
  else:
    print 'ERROR: classifier must be logistic'
    quit()

  train_vectors = vectorizer.fit_transform(train_data)
  classifier.fit(train_vectors, train_labels)
  terms = np.array(list(vectorizer.vocabulary_.keys()))
  indices = np.array(list(vectorizer.vocabulary_.values()))
  inverse_vocabulary = terms[np.argsort(indices)]
  if args.json:
    GenerateJSONs(class_names, train_data, train_labels, test_data, test_labels, classifier, vectorizer, args.json)
  else:
    @route('/predict', method=['OPTIONS', 'POST', 'GET'])
    @enable_cors
    def predict_fun():
        print request.json
        ret = {}
        ex = ' '.join(request.json['features'])
        v = vectorizer.transform([ex])
        print 'Example:', ex
        print 'Pred:'
        print classifier.predict_proba(v)[0]
        ret['predict_proba'] = RoundAndListifyVector(classifier.predict_proba(v)[0])
        ret['prediction'] = classifier.predict(v)[0]
        ret['feature_weights'] = WordImportance(classifier, v, inverse_vocabulary)
        make_map = lambda x:{'feature':x[0], 'weight' : x[1]['weight'], 'class': x[1]['class']}
        ret['sorted_weights'] = map(make_map, sorted(ret['feature_weights'].iteritems(), key=lambda x:x[1]['weight'], reverse=True))
        return ret
    @route('/')
    def root_fun():
        return server_static('index.html')
    @route('/<filename>')
    def server_static(filename):
        return static_file(filename, root='./static/')
    run(host='localhost', port=8870, debug=True)
  


if __name__ == "__main__":
    main()
