#!/bin/bash
set -e
cp -R "$PWD/resources/python/mac/" "$PWD/python/"
cp -R "$PWD/resources/adb/mac/" "$PWD/adb/"
"$PWD/python/python3" -m ensurepip || true
"$PWD/python/python3" -m pip install -r "$PWD/python/requirements.txt" || true
