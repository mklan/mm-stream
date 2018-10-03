# mm-stream
rest api for exploring and streaming of media files (tested with flac, mp3)

## Usage

```bash
  export MM_FOLDER=/path/to/media_folder
  export MM_HOST=example.duckdns.org
```

`npm run start`

## Api

list content of a folder

`GET /list?path=<<RELATIVE_PATH_TO_BASE>>`


stream a media file

`GET /stream?path=<<RELATIVE_PATH_TO_BASE>>`
