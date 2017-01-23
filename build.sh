#!/bin/bash

echo "---  Removing existing migration image"
docker rmi migration > /dev/null 2>&1

echo "---  Build migration image"
docker build -t migration .
