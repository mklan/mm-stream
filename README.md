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

`yarn start`

## Docker Usage

### Using Docker Compose (recommended)

1. Set environment variables (or create a `.env` file):

```bash
export MM_PORT=3000
export MM_FOLDER=/path/to/media_folder
export MM_HOST=example.duckdns.org:3000
```

2. Run the container:

```bash
docker compose up -d
```

### Using Docker directly

```bash
docker build -t mm-stream .
docker run -d \
  -p 3000:3000 \
  -e MM_PORT=3000 \
  -e MM_FOLDER=/media \
  -e MM_HOST=example.duckdns.org:3000 \
  -v /path/to/media_folder:/media:ro \
  mm-stream
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MM_PORT` | Port the service listens on | `3000` |
| `MM_FOLDER` | Path to media folder (host path for docker-compose, `/media` inside container) | `./media` |
| `MM_HOST` | External host address for generating links | `localhost:3000` |

## Api

list content of a folder

`GET /list?path=<<RELATIVE_PATH_TO_BASE>>`

stream a media file

`GET /stream?path=<<RELATIVE_PATH_TO_BASE>>`
