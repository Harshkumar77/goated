# Goated 🐐

Looking to _rewatch_ your favorite TV show or anime, but not sure where to start? 🤔

🐐 Goated 🐐 is the answer you've been looking for! Our CLI tool makes it easy to manage your all-time favorite shows and select a random episode to watch whenever the mood strikes.

With Goated, you can indulge in the pleasure of revisiting your favorite moments without the stress of choosing what to watch next. Try Goated today and rediscover your love for your _goated_ series! 📺 💖

## Features

Here are some of the features Goated offers:

- Select random episode from collection 🎲
- Mark episode as watched automaticaly ✅
- Mark the scenes and then play them

## Installation

VLC and ffmpeg is a required dependency

```sh
npm i gpq -g
goated init
```

## Usage

Here are some examples of how to use Goated:
Usage

Here are some examples of how to use Goated:

### Adding Episode

To add a single episode, run:

```sh
goated add /path/to/episode.mkv -s series_name
```

To add multiple episodes in batch, run:

```sh
goated add /path/to/a /path/to/b ... -s series_name
```

### To watch episodes

To open a selector in which you can choose by typing a keyword run :

```sh
goated from
```

To search and play the episode with best match

```sh
goated search keyword
```

To play a random episode, run:

```sh
goated play
```

To open a selector to search and play your marked scene:

```sh
goated scene
```

### Deleting

To open a selector in which you can delete a series by serarching it with keyword, run:

```sh
goated delete
```

To delete a specific item (series, episode, or scene) based on its name or ID:

```sh
goated delete {series_name or series_id or episode_path or episode_id or scene_name or scene_id}
```

### Add Scene

To add a scene

```sh
goated scene add --scene-name "Opening scene" --start 00:02:30 --end 00:05:00 <id or path to episode>
```

## That's it! Enjoy using Goated to randomly select your next favorite episode. 🎉
