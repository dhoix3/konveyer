@echo off
setlocal
pushd "%~dp0"
echo Koveyer Dhoix'a - http://127.0.0.1:7788
node render.mjs ui --port 7788 %*
set "result=%errorlevel%"
popd
exit /b %result%
