@echo off

if not exist dist mkdir dist
call html-minifier --minify-css --collapse-whitespace index.html -o dist/index.html
call uglifyjs erisk.js -m toplevel -c -o dist/erisk.js

if exist dist\erisk.zip del dist\erisk.zip
zip -Xjq9 dist\erisk.zip dist\index.html dist\erisk.js

CALL :FileSize dist/erisk.zip FileSize
echo Final size: %FileSize% bytes

goto :EOF


:FileSize
SET %~2=%~z1
