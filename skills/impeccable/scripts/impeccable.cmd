@echo off
rem Modified by FleetHarness: offline launcher; no installer or user caches.
node "%~dp0fleet-launcher.mjs" %*
exit /b %errorlevel%
