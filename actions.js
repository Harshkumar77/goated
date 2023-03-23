import { prisma, program } from "./index.js"
import { execSync } from "child_process"
import inquirer from "inquirer"
import { argv } from "process"
import { search } from "fast-fuzzy"
import { randomInt } from "crypto"

export const play = async () => {
  let unwatchedEpisodes = await prisma.episode.findMany({
    where: {
      watched: false,
    },
  })
  if (
    unwatchedEpisodes.length === 0 &&
    (await prisma.episode.findMany()).length === 0
  ) {
    console.error(chalk.red("Add some episodes you lazy"))
    process.exit(1)
  }
  if (unwatchedEpisodes.length === 0) {
    await prisma.episode.updateMany({
      data: {
        watched: false,
      },
    })
    unwatchedEpisodes = await prisma.episode.findMany({
      where: {
        watched: false,
      },
    })
  }
  const randomEpisodeIndex = Math.floor(
    Math.random() * unwatchedEpisodes.length
  )
  const randomEpisode = unwatchedEpisodes[randomEpisodeIndex]
  execSync(`xdg-open "${randomEpisode.path}"`)
  await prisma.episode.update({
    where: {
      id: randomEpisode.id,
    },
    data: {
      watched: true,
    },
  })
  if (program.opts().info) console.log(randomEpisode)
  process.exit(0)
}

export const add = async () => {
  const { file, series } = program.opts()
  if (!file) return console.error(chalk.red("No file provided"))
  if (!series) return console.error(chalk.red("No series provided"))
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
  console.log("Episode added to existing series")
}

export const addBatch = async () => {
  const { batchFiles, series } = program.opts()
  if (!batchFiles) return console.error(chalk.red("No file provided"))
  if (!series) return console.error(chalk.red("No series provided"))
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
    console.log(chalk.green.bold(`New series - ${series} added`))
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
  console.log(chalk.green.bold(`${filesArray.length} episodes added`))
}

export const from = async () => {
  const allSeries = await prisma.series.findMany({
    select: {
      name: true,
      id: true,
    },
  })
  if (argv.length === 4) {
    const searchResults = search(argv[3], allSeries, {
      keySelector: (_) => _.name,
      returnMatchData: true,
    })
    if (searchResults.length === 0) {
      console.error(chalk.red("No series found"))
      process.exit(1)
    }
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
      console.error(chalk.red("Add some episodes you lazy"))
      process.exit(1)
    }
    const randomEpisodeIndex = randomInt(0, unwatchedEpisodes.length)
    const randomEpisodePath = unwatchedEpisodes[randomEpisodeIndex].path
    execSync(`xdg-open "${randomEpisodePath}"`)
    if (program.opts().info) console.log(unwatchedEpisodes[randomEpisodeIndex])
    process.exit(0)
  }
  const allSeriesOnlyNames = allSeries.map(({ name }) => name)

  if (allSeriesOnlyNames.length === 0) {
    console.error(chalk.red("Add some episodes you lazy"))
    process.exit(1)
  }
  const { series } = await inquirer.prompt({
    type: "autocomplete",
    suggestOnly: false,
    message: "What you want to watch",
    emptyText: "Nothing found!",
    name: "series",
    source: (_, input = "") => {
      const results = search(input, allSeriesOnlyNames, {
        returnMatchData: true,
        keySelector: (_) => _,
        ignoreCase: true,
      }).map((_) => _.item)
      return results.length ? results : allSeriesOnlyNames
    },

    pageSize: 10,
  })
  let episodes = (
    await prisma.series.findUniqueOrThrow({
      where: {
        name: series,
      },
      include: {
        Episode: true,
      },
    })
  ).Episode
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
    console.error(chalk.red("Add some episodes you lazy"))
    process.exit(1)
  }
  const randomEpisodeIndex = Math.floor(
    unwatchedEpisodes.length * Math.random()
  )
  const randomEpisodePath = unwatchedEpisodes[randomEpisodeIndex].path
  execSync(`xdg-open "${randomEpisodePath}"`)
  if (program.opts().info) console.log(unwatchedEpisodes[randomEpisodeIndex])
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
    console.error(chalk.red("Add some episodes you lazy"))
    process.exit(1)
  }
  const { series } = await inquirer.prompt({
    type: "autocomplete",
    suggestOnly: false,
    message: "What you want to watch",
    emptyText: "Nothing found!",
    name: "series",
    source: (_, input = "") => {
      const results = search(input, allSeries, {
        returnMatchData: true,
        keySelector: (_) => _,
        ignoreCase: true,
      }).map((_) => _.item)
      return results.length ? results : allSeries
    },
    pageSize: 10,
  })
  await prisma.series.delete({
    where: {
      name: series,
    },
  })
  console.log(chalk.green.bold(`${series} deleted from list`))
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
  console.log(chalk.cyanBright(`${(watched * 100) / total} %`))
}
