# mm-stream

rest api for exploring and streaming of media files (tested with flac, mp3)

![Usage as animated Gif](https://github.com/mklan/mm-stream/blob/master/demo/usage.gif)

## Usage

```bash
  export MM_PORT=3000
  export MM_FOLDER=/path/to/media_folder
  #the host to access the service externally (to create correct links for jumping trough folders)
  export MM_HOST=example.duckdns.org:3000
```

or create an `.env` file inside the project root

`npm run run`

## Api

list content of a folder

`GET /list?path=<<RELATIVE_PATH_TO_BASE>>`

stream a media file

`GET /stream?path=<<RELATIVE_PATH_TO_BASE>>`
