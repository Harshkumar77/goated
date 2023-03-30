import chalk from "chalk"
import { search } from "fast-fuzzy"
import path from "path"
import { prisma, program } from "./index.js"
import {
  error,
  getFilePath,
  historySelector,
  ok,
  playPath,
  randomElementFromArray,
  sceneSelector,
  seriesSelector,
  timeStringToSeconds,
  videoLength,
} from "./utils.js"

export const play = async () => {
  const unwatchedEpisodes = await prisma.episode.findMany({
    where: {
      watched: false,
    },
  })
  if (unwatchedEpisodes.length === 0 && (await prisma.episode.count()) === 0)
    error("Add some episodes you lazy")

  if (unwatchedEpisodes.length === 0) {
    await prisma.episode.updateMany({
      data: {
        watched: false,
      },
    })
    return await play()
  }
  const episode = randomElementFromArray(unwatchedEpisodes)
  await playPath(episode.path)
  if (program.opts().info) console.log(episode)
  process.exit(0)
}

export const add = async (file) => {
  const { series } = program.opts()
  if (!file) error("No file provided")
  if (!series) error("No series provided")
  const path = getFilePath(file)
  await prisma.episode.create({
    data: {
      path: path,
      length: await videoLength(file),
      series: {
        connectOrCreate: {
          where: {
            name: series,
          },
          create: {
            name: series,
          },
        },
      },
    },
  })
  ok("Episode added")
}

export const addBatch = async (files) => {
  const { series } = program.opts()
  if (!series) return error("No series provided")
  const paths = files.map(getFilePath)
  const existingSeries = await prisma.series.findUnique({
    where: {
      name: series,
    },
  })

  if (!existingSeries) {
    await prisma.series.create({
      data: {
        name: series,
      },
      select: { id: true },
    })
    ok(`New series - ${series} added`)
  }
  await prisma.series.update({
    where: {
      name: series,
    },
    data: {
      Episode: {
        create: await Promise.all(
          paths.map(async (path) => {
            return {
              path,
              length: await videoLength(path),
            }
          })
        ),
      },
    },
  })
  ok(`${paths.length} episodes added`)
}

export const from = async () => {
  const allSeries = await prisma.series.findMany({
    select: {
      name: true,
      id: true,
    },
  })
  const allSeriesOnlyNames = allSeries.map(({ name }) => name)

  if (allSeriesOnlyNames.length === 0) {
    error("Add some episodes you lazy")
  }
  const { series } = await seriesSelector()
  const episodes = (
    await prisma.series.findUniqueOrThrow({
      where: {
        name: series,
      },
      include: {
        Episode: true,
      },
    })
  ).Episode
  const unwatchedEpisodes = episodes.filter((_) => !_.watched)
  if (unwatchedEpisodes.length === 0 && episodes.length !== 0) {
    await prisma.episode.updateMany({
      where: {
        series: {
          name: series,
        },
      },
      data: {
        watched: false,
      },
    })
    return await from()
  }
  if (episodes.length === 0) {
    error("Add some episodes you lazy")
  }
  const episode = randomElementFromArray(unwatchedEpisodes)
  await playPath(episode.path)
  if (program.opts().info) console.log(episode)
  process.exit(0)
}

export const deleteFromDB = async (id_or_name_or_path) => {
  if (!id_or_name_or_path) {
    const allSeries = (
      await prisma.series.findMany({
        select: {
          name: true,
        },
      })
    ).map(({ name }) => name)
    if (allSeries.length === 0) {
      error("Add some episodes you lazy")
    }
    const { series } = await seriesSelector()
    await prisma.series.delete({
      where: {
        name: series,
      },
    })
    ok(`${series} deleted from list`)
    process.exit(0)
  }
  const series = await prisma.series.findFirst({
    where: { OR: [{ id: id_or_name_or_path }, { name: id_or_name_or_path }] },
  })
  if (series) {
    await prisma.series.delete({ where: { id: series.id } })
    ok(`${series.name} deleted`)
    process.exit(0)
  }
  const episode = await prisma.episode.findFirst({
    where: {
      OR: [
        { id: id_or_name_or_path },
        { path: getFilePath(id_or_name_or_path) },
      ],
    },
  })
  if (episode) {
    await prisma.episode.delete({ where: { id: episode.id } })
    ok(`${path.basename(episode.path)} deleted`)
    process.exit(0)
  }
  const scene = await prisma.scenes.findFirst({
    where: { OR: [{ id: id_or_name_or_path }, { name: id_or_name_or_path }] },
  })
  if (scene) {
    await prisma.scenes.delete({ where: { id: id_or_name_or_path } })
    ok(`${path.basename(episode.path)} deleted`)
    process.exit(0)
  }
  error(
    `No series, episode or scene found with id or name = ${id_or_name_or_path}`
  )
}

export const progress = async () => {
  const watched = await prisma.episode.count({
    where: {
      watched: true,
    },
  })
  const total = await prisma.episode.count()
  console.log(chalk.magentaBright(`${watched}/${total}`))
  console.log(chalk.cyanBright(`${Math.floor((watched * 100) / total)} %`))
  process.exit(0)
}

export const searchKeyword = async (keyword) => {
  const allSeries = await prisma.series.findMany({
    select: {
      name: true,
      id: true,
    },
  })
  const searchResults = search(keyword, allSeries, {
    keySelector: (_) => _.name,
    returnMatchData: true,
  })
  if (searchResults.length === 0) error("No series found")
  const series = await prisma.series.findUniqueOrThrow({
    where: {
      id: searchResults[0].item.id,
    },
    include: {
      Episode: true,
    },
  })
  let episodes = series.Episode
  let unwatchedEpisodes = episodes.filter((_) => !_.watched)
  if (unwatchedEpisodes.length === 0 && episodes.length !== 0) {
    await prisma.episode.updateMany({
      where: {
        series: {
          name: series,
        },
      },
      data: {
        watched: false,
      },
    })
    episodes = (
      await prisma.series.findUniqueOrThrow({
        where: {
          name: series,
        },
        include: {
          Episode: true,
        },
      })
    ).Episode
    unwatchedEpisodes = episodes.filter((_) => !_.watched)
  }
  if (episodes.length === 0) {
    error("Add some episodes you lazy")
  }
  const episode = randomElementFromArray(unwatchedEpisodes)
  await playPath(episode.path)
  if (program.opts().info) console.log(episode)
  process.exit(0)
}

export const history = async () => {
  const { path } = await historySelector()
  await playPath(path, "--qt-continue 2")
}

export const addScene = async (id_or_path) => {
  if (!id_or_path) error("provide id or episode file")
  const episode = await prisma.episode.findFirst({
    where: { OR: [{ id: id_or_path }, { path: getFilePath(id_or_path) }] },
  })
  if (!episode) error(`File is not is database or incorrect id`)
  const { start, end, sceneName } = program.opts()
  if (!start) error("--start not provided")
  if (!end) error("--end not provided")
  if (!sceneName) error("--scene-name not provided")
  const newScene = await prisma.scenes.create({
    data: {
      episode: {
        connect: {
          id: episode.id,
        },
      },
      series: {
        connect: {
          id: episode.seriesId,
        },
      },
      startTime: timeStringToSeconds(start),
      endTime: timeStringToSeconds(end),
      name: sceneName,
    },
  })
  ok(`New Scene added - ${newScene.name}`)
  // console.log(episode, start, end, sceneName)
}

export const playScene = async () => {
  const { scene } = await sceneSelector()
  await playPath(
    scene.episode.path,
    ` --start-time ${scene.startTime} --stop-time ${scene.endTime} --play-and-exit --no-video-title --noqt-name-in-title`,
    "scene",
    scene.id
  )
}
