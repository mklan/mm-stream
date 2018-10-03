# mm-stream
rest api for exploring and streaming of media files


## Usage

set `MM_FOLDER` to your base media folder and than run `npm start`

## Api

list content of a folder

`GET /list?path=<<RELATIVE_PATH_TO_BASE>>`


stream a media file

`GET /stream?path=<<RELATIVE_PATH_TO_BASE>>`
