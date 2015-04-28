import sys
import os
import argparse
import numpy as np
import json
from sklearn.datasets import fetch_20newsgroups
from sklearn import metrics

 
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn import linear_model

def main():
  cats = ['alt.atheism', 'soc.religion.christian']
  newsgroups_train = fetch_20newsgroups(subset='train',categories=cats)
  newsgroups_test = fetch_20newsgroups(subset='test',categories=cats)
  vectorizer = CountVectorizer(lowercase=False)
  train_vectors = vectorizer.fit_transform(newsgroups_train.data)
  test_vectors = vectorizer.transform(newsgroups_test.data)
  terms = np.array(list(vectorizer.vocabulary_.keys()))
  data = newsgroups_train.data
  train_labels = newsgroups_train.target
  test_labels = newsgroups_test.target
  terms = np.array(list(vectorizer.vocabulary_.keys()))
  indices = np.array(list(vectorizer.vocabulary_.values()))
  inverse_vocabulary = terms[np.argsort(indices)]
  classifier = linear_model.LogisticRegression(fit_intercept=False)
  classifier.fit(train_vectors,train_labels)
  tokenizer = vectorizer.build_tokenizer()
  doc_file = open('docs.json',  'w')
  jsonz = {}
  jsonz['docs'] = []
  for i, doc in enumerate(newsgroups_test.data):
    temp = {}
    temp['text'] = ' \n '.join(map(lambda x: ' '.join(tokenizer(x)), doc.split('\n'))).split(' ')
    temp['true_class'] = int(test_labels[i])
    temp['prediction'] = round(classifier.predict_proba(test_vectors[i])[0][1], 2)
    jsonz['docs'].append(temp)
  #jsonz['docs'] = sorted(jsonz['docs'], key= lambda x:abs(x['true_class'] - x['prediction']), reverse=True)
  ww = {}
  for word, weight in zip(inverse_vocabulary, classifier.coef_[0]):
    ww[word] = weight
  jsonz['weights'] = ww
  jsonz['accuracy'] = round(metrics.accuracy_score(newsgroups_test.target, classifier.predict(test_vectors)), 3)
  json.dump(jsonz, doc_file)


if __name__ == "__main__":
    main()
