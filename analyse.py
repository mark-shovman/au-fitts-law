# -*- coding: utf-8 -*-
"""
Created on Sun Jul 12 19:21:08 2020

@author: qwert
"""
import pandas as pd

df = pd.read_csv(r'C:\Users\qwert\Downloads\2020.07.12 16.18.38UTC path_data.csv')
df.plot.scatter(x='x', y='y', c='trial_id',  colormap='viridis', s=2)
