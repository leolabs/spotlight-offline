# Spotlight Offline

Spotlight offline lets you search for files on disconnected drives. It automatically
saves a list of all files and folders to a local database when you connect an external
hard drive or usb stick to your computer. You can then search this database using Alfred.

## Installing

Clone this repo, and run `yarn` to install all necessary dependencies.

## Development

To test the indexer, run `yarn start`. The indexer serves a simple REST api on port
19800 which you can use to search the cached index.

## Running the App

If you want to run Spotlight Offline as a standalone app, run `yarn build`. The result
is located in the dist directory.

## Alfred Workflow

Spotlight Offline comes with an Alfred workflow that you can use to quickly search
for files. You can download it [here](https://github.com/leolabs/spotlight-offline/raw/master/alfred/spotlight-offline.alfredworkflow).
