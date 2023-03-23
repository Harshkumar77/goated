import chalk from "chalk"
import { exec } from "child_process"
import { search } from "fast-fuzzy"
import path from "path"
import { argv } from "process"
import { prisma, program } from "./index.js"
import {
  error,
  ok,
  playPath,
  randomElementFromArray,
  seriesSelector,
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

export const add = async () => {
  const { file, series } = program.opts()
  if (!file) error("No file provided")
  if (!series) error("No series provided")
  await prisma.episode.create({
    data: {
      path: file,
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
  ok("Episode added to existing series")
}

export const addBatch = async () => {
  const { batchFiles, series } = program.opts()
  if (!batchFiles) return error("No file provided")
  if (!series) return error("No series provided")
  const filesArray = batchFiles.split("\n")
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
        create: filesArray.map((path) => {
          return {
            path,
          }
        }),
      },
    },
  })
  ok(`${filesArray.length} episodes added`)
}

export const from = async () => {
  const allSeries = await prisma.series.findMany({
    select: {
      name: true,
      id: true,
    },
  })
  if (argv.length >= 4) {
    const searchResults = search(argv[3], allSeries, {
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

export const deleteVideo = async () => {
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

export const studio = async () => {
  ok("Opening studio in browser........ [might take some time]")
  exec("npx prisma studio --port 7777", {
    cwd: path.dirname(import.meta.url).split("file://")[1],
    shell: "bash",
    stdio: "ignore",
  })
}
