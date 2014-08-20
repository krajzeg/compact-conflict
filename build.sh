#!/bin/sh

uglifyjs erisk.js -m toplevel -c -o dist/erisk-min.js || exit 1

ZIP_FILE=dist/erisk.zip 
ZIPPED_FILES="index.html dist/erisk-min.js"
zip -q9 $ZIP_FILE $ZIPPED_FILES || exit 1

FINAL_SIZE=$( wc -c "$ZIP_FILE" | awk '{print $1}')
echo "Final size: $FINAL_SIZE bytes"
