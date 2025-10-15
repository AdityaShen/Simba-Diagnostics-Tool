#!/bin/bash

# Colors for output
green='\033[1;32m'
reset='\033[0m'

clear

echo -e "${green}Starting Simba...${reset}"
echo

echo " Installing dependencies with npm install..."
npm install
if [ $? -ne 0 ]; then
    echo " Error: npm install failed!"
    exit 1
else
    echo " Success: npm install completed!"
fi
echo

echo " Cleaning previous build artifacts..."
npm run clean
if [ $? -ne 0 ]; then
    echo " Warning: npm run clean failed, proceeding anyway..."
else
    echo " Success: Clean completed!"
fi
echo

echo " Building project with npm run build..."
npm run build
if [ $? -ne 0 ]; then
    echo " Error: npm run build failed!"
    exit 1
else
    echo " Success: npm run build completed!"
fi
echo

echo " Running npm start..."
npm start
if [ $? -ne 0 ]; then
    echo " Error: npm start failed!"
    exit 1
else
    echo " Success: npm start completed!"
fi
echo

echo " All commands executed successfully!"
echo " Simba is now running."
