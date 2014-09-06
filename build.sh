#!/bin/sh

mkdir -p dist

# Minify Javascript
uglifyjs erisk.js -m toplevel -c -o dist/erisk.js || exit 1
# Minify HTML
html-minifier --minify-css --collapse-whitespace index.html -o dist/index.html

# Zip the whole thing
ZIP_FILE=erisk.zip 
ZIPPED_FILES="index.html erisk.js"

cd dist
rm -f $ZIP_FILE
zip -q9 $ZIP_FILE $ZIPPED_FILES || exit 1
cd ..

# Report
FINAL_SIZE=$( wc -c "dist/$ZIP_FILE" | awk '{print $1}')
echo "Final size: $FINAL_SIZE bytes"
